import Foundation
import Compression

public enum ZipError: Error, Equatable {
    case notAZip
    case corrupted(String)
    case unsupportedCompression(UInt16)
    case encrypted
    case crcMismatch(String)
}

/// 최소한의 zip 리더 (stored / deflate, ZIP64 지원).
/// 파일 전체를 메모리에 올리지 않고 스트리밍으로 풀어서 공유 확장의 메모리 제한에서도 동작한다.
public struct ZipArchive {
    public struct Entry: Sendable {
        public let path: String
        public let method: UInt16
        public let flags: UInt16
        public let crc32: UInt32
        public let compressedSize: UInt64
        public let uncompressedSize: UInt64
        public let localHeaderOffset: UInt64

        public var isDirectory: Bool { path.hasSuffix("/") }
    }

    public let url: URL
    public let entries: [Entry]

    public init(url: URL) throws {
        self.url = url
        let handle = try FileHandle(forReadingFrom: url)
        defer { try? handle.close() }
        self.entries = try Self.readCentralDirectory(handle)
    }

    // MARK: 중앙 디렉터리

    private static func readCentralDirectory(_ handle: FileHandle) throws -> [Entry] {
        let fileSize = try handle.seekToEnd()
        guard fileSize >= 22 else { throw ZipError.notAZip }

        // End of Central Directory는 파일 끝에서 최대 64KB(주석) + 22바이트 안에 있다.
        let tailLength = min(fileSize, 65_557)
        try handle.seek(toOffset: fileSize - tailLength)
        let tail = try handle.read(upToCount: Int(tailLength)) ?? Data()
        guard let eocd = lastIndex(of: 0x0605_4b50, in: tail) else { throw ZipError.notAZip }

        var entryCount = UInt64(tail.le16(eocd + 10))
        var cdSize = UInt64(tail.le32(eocd + 12))
        var cdOffset = UInt64(tail.le32(eocd + 16))

        // ZIP64: 값이 0xFFFF/0xFFFFFFFF이면 ZIP64 EOCD에서 읽는다.
        if entryCount == 0xFFFF || cdSize == 0xFFFF_FFFF || cdOffset == 0xFFFF_FFFF {
            guard eocd >= 20, tail.le32(eocd - 20) == 0x0706_4b50 else { throw ZipError.corrupted("zip64 locator") }
            let z64Offset = tail.le64(eocd - 20 + 8)
            try handle.seek(toOffset: z64Offset)
            let z64 = try handle.read(upToCount: 56) ?? Data()
            guard z64.count == 56, z64.le32(0) == 0x0606_4b50 else { throw ZipError.corrupted("zip64 eocd") }
            entryCount = z64.le64(32)
            cdSize = z64.le64(40)
            cdOffset = z64.le64(48)
        }

        try handle.seek(toOffset: cdOffset)
        let cd = try handle.read(upToCount: Int(cdSize)) ?? Data()
        guard UInt64(cd.count) == cdSize else { throw ZipError.corrupted("central directory") }

        var entries: [Entry] = []
        entries.reserveCapacity(Int(entryCount))
        var p = 0
        while p + 46 <= cd.count, cd.le32(p) == 0x0201_4b50 {
            let flags = cd.le16(p + 8)
            let method = cd.le16(p + 10)
            let crc = cd.le32(p + 16)
            var compressed = UInt64(cd.le32(p + 20))
            var uncompressed = UInt64(cd.le32(p + 24))
            let nameLen = Int(cd.le16(p + 28))
            let extraLen = Int(cd.le16(p + 30))
            let commentLen = Int(cd.le16(p + 32))
            var localOffset = UInt64(cd.le32(p + 42))
            let nameStart = p + 46
            guard nameStart + nameLen + extraLen <= cd.count else { throw ZipError.corrupted("entry") }

            let nameData = cd.subdata(in: nameStart..<nameStart + nameLen)
            var unicodePath: String?

            // 확장 필드: ZIP64 크기/오프셋, Info-ZIP 유니코드 경로(0x7075)
            var e = nameStart + nameLen
            let extraEnd = e + extraLen
            while e + 4 <= extraEnd {
                let tag = cd.le16(e)
                let size = Int(cd.le16(e + 2))
                var q = e + 4
                if tag == 0x0001 {
                    if uncompressed == 0xFFFF_FFFF, q + 8 <= e + 4 + size { uncompressed = cd.le64(q); q += 8 }
                    if compressed == 0xFFFF_FFFF, q + 8 <= e + 4 + size { compressed = cd.le64(q); q += 8 }
                    if localOffset == 0xFFFF_FFFF, q + 8 <= e + 4 + size { localOffset = cd.le64(q); q += 8 }
                } else if tag == 0x7075, size > 5 {
                    unicodePath = String(data: cd.subdata(in: (e + 9)..<(e + 4 + size)), encoding: .utf8)
                }
                e += 4 + size
            }

            let path = unicodePath ?? decodeFileName(nameData, utf8Flag: flags & 0x0800 != 0)
            entries.append(Entry(path: path, method: method, flags: flags, crc32: crc,
                                 compressedSize: compressed, uncompressedSize: uncompressed,
                                 localHeaderOffset: localOffset))
            p = nameStart + nameLen + extraLen + commentLen
        }
        return entries
    }

    /// 파일명 인코딩: UTF-8 플래그 → UTF-8 → CP949(국내 Windows 압축) → CP437 순서로 시도
    static func decodeFileName(_ data: Data, utf8Flag: Bool) -> String {
        if utf8Flag, let s = String(data: data, encoding: .utf8) { return s }
        if let s = String(data: data, encoding: .utf8) { return s }
        let cp949 = String.Encoding(rawValue: CFStringConvertEncodingToNSStringEncoding(
            CFStringEncoding(CFStringEncodings.dosKorean.rawValue)))
        if let s = String(data: data, encoding: cp949) { return s }
        let cp437 = String.Encoding(rawValue: CFStringConvertEncodingToNSStringEncoding(
            CFStringEncoding(CFStringEncodings.dosLatinUS.rawValue)))
        return String(data: data, encoding: cp437) ?? String(decoding: data, as: UTF8.self)
    }

    private static func lastIndex(of signature: UInt32, in data: Data) -> Int? {
        guard data.count >= 22 else { return nil }
        var i = data.count - 22
        while i >= 0 {
            if data.le32(i) == signature { return i }
            i -= 1
        }
        return nil
    }

    // MARK: 압축 풀기

    /// 항목 하나를 destination 파일로 푼다.
    public func extract(_ entry: Entry, to destination: URL) throws {
        if entry.flags & 0x0001 != 0 { throw ZipError.encrypted }
        guard entry.method == 0 || entry.method == 8 else { throw ZipError.unsupportedCompression(entry.method) }

        let input = try FileHandle(forReadingFrom: url)
        defer { try? input.close() }
        try input.seek(toOffset: entry.localHeaderOffset)
        guard let local = try input.read(upToCount: 30), local.count == 30, local.le32(0) == 0x0403_4b50 else {
            throw ZipError.corrupted("local header: \(entry.path)")
        }
        let dataOffset = entry.localHeaderOffset + 30 + UInt64(local.le16(26)) + UInt64(local.le16(28))
        try input.seek(toOffset: dataOffset)

        FileManager.default.createFile(atPath: destination.path, contents: nil)
        let output = try FileHandle(forWritingTo: destination)
        defer { try? output.close() }

        var crc = CRC32()
        let chunkSize = 1 << 20
        var remaining = entry.compressedSize

        if entry.method == 0 {
            while remaining > 0 {
                let chunk = try input.read(upToCount: Int(min(UInt64(chunkSize), remaining))) ?? Data()
                guard !chunk.isEmpty else { throw ZipError.corrupted("truncated: \(entry.path)") }
                crc.update(chunk)
                try output.write(contentsOf: chunk)
                remaining -= UInt64(chunk.count)
            }
        } else {
            // Compression의 .zlib은 raw deflate(zip과 동일)다.
            var writeError: Error?
            let filter = try OutputFilter(.decompress, using: .zlib) { data in
                guard let data else { return }
                crc.update(data)
                do { try output.write(contentsOf: data) } catch { writeError = error }
            }
            while remaining > 0 {
                let chunk = try input.read(upToCount: Int(min(UInt64(chunkSize), remaining))) ?? Data()
                guard !chunk.isEmpty else { throw ZipError.corrupted("truncated: \(entry.path)") }
                try filter.write(chunk)
                remaining -= UInt64(chunk.count)
            }
            try filter.finalize()
            if let writeError { throw writeError }
        }

        guard crc.value == entry.crc32 else { throw ZipError.crcMismatch(entry.path) }
    }
}

// MARK: - 유틸

struct CRC32 {
    private static let table: [UInt32] = (0..<256).map { i -> UInt32 in
        var c = UInt32(i)
        for _ in 0..<8 { c = (c & 1) != 0 ? 0xEDB8_8320 ^ (c >> 1) : c >> 1 }
        return c
    }
    private var crc: UInt32 = 0xFFFF_FFFF

    mutating func update(_ data: Data) {
        var c = crc
        data.withUnsafeBytes { (buf: UnsafeRawBufferPointer) in
            for byte in buf { c = Self.table[Int((c ^ UInt32(byte)) & 0xFF)] ^ (c >> 8) }
        }
        crc = c
    }

    var value: UInt32 { crc ^ 0xFFFF_FFFF }
}

extension Data {
    func le16(_ i: Int) -> UInt16 {
        let s = startIndex + i
        return UInt16(self[s]) | UInt16(self[s + 1]) << 8
    }
    func le32(_ i: Int) -> UInt32 {
        let s = startIndex + i
        return UInt32(self[s]) | UInt32(self[s + 1]) << 8 | UInt32(self[s + 2]) << 16 | UInt32(self[s + 3]) << 24
    }
    func le64(_ i: Int) -> UInt64 { UInt64(le32(i)) | UInt64(le32(i + 4)) << 32 }
}
