import Foundation

/// 압축을 푼 스캔 이미지 한 장
public struct ScanFrame: Sendable, Hashable {
    public let index: Int            // 촬영 순서 (1부터)
    public let originalName: String  // zip 안의 원래 경로
    public let fileURL: URL
    public let byteSize: UInt64
}

/// 같은 롤이 여러 버전(예: JPG 고해상도/저해상도, TIFF)으로 들어 있을 때의 묶음
public struct ScanSet: Sendable {
    public let label: String         // 예: "Large/ · JPG"
    public let frames: [ScanFrame]
    public var totalBytes: UInt64 { frames.reduce(0) { $0 + $1.byteSize } }
}

public struct ScanImportResult: Sendable {
    /// 가장 큰(=고해상도) 묶음. 기본으로 이 묶음을 저장한다.
    public let primary: ScanSet
    /// 다른 해상도/포맷 묶음. UI에서 선택할 수 있게 노출.
    public let alternatives: [ScanSet]
    public let workingDirectory: URL
}

public enum ScanImportError: Error {
    case noImages
}

public enum ScanImporter {
    static let imageExtensions: Set<String> = ["jpg", "jpeg", "tif", "tiff", "png", "heic", "heif", "dng"]

    /// zip을 풀어 이미지들을 촬영 순서대로 정렬해 돌려준다.
    /// - Parameter workingDirectory: 비어 있는 작업 폴더. 없으면 임시 폴더를 만든다.
    public static func importZip(at zipURL: URL, workingDirectory: URL? = nil) throws -> ScanImportResult {
        let archive = try ZipArchive(url: zipURL)
        let fm = FileManager.default
        let workDir = workingDirectory ?? fm.temporaryDirectory
            .appendingPathComponent("filmscan-\(UUID().uuidString)", isDirectory: true)
        try fm.createDirectory(at: workDir, withIntermediateDirectories: true)

        let imageEntries = archive.entries.filter { isScanImage(path: $0.path) && !$0.isDirectory }
        guard !imageEntries.isEmpty else { throw ScanImportError.noImages }

        // zip 안의 경로는 믿지 않는다: 일련번호로 된 평평한 파일명으로 푼다 (경로 조작 방지).
        var extracted: [(entry: ZipArchive.Entry, url: URL)] = []
        for (i, entry) in imageEntries.enumerated() {
            let ext = (entry.path as NSString).pathExtension.lowercased()
            let dest = workDir.appendingPathComponent(String(format: "%05d.%@", i, ext))
            try archive.extract(entry, to: dest)
            extracted.append((entry, dest))
        }

        // 폴더 + 포맷별로 묶기
        let groups = Dictionary(grouping: extracted) { item -> String in
            let folder = (item.entry.path as NSString).deletingLastPathComponent
            return "\(folder)|\(formatFamily(item.entry.path))"
        }

        var sets: [ScanSet] = groups.map { key, items in
            let sorted = items.sorted { naturalLess($0.entry.path, $1.entry.path) }
            let frames = sorted.enumerated().map { i, item in
                ScanFrame(index: i + 1, originalName: item.entry.path, fileURL: item.url,
                          byteSize: item.entry.uncompressedSize)
            }
            let parts = key.split(separator: "|", omittingEmptySubsequences: false)
            let folder = parts[0].isEmpty ? "" : "\(parts[0])/ · "
            return ScanSet(label: "\(folder)\(parts[1])", frames: frames)
        }
        sets.sort { $0.totalBytes > $1.totalBytes }

        return ScanImportResult(primary: sets[0], alternatives: Array(sets.dropFirst()), workingDirectory: workDir)
    }

    static func isScanImage(path: String) -> Bool {
        let components = path.split(separator: "/")
        if components.contains(where: { $0 == "__MACOSX" || $0.hasPrefix(".") }) { return false }
        let ext = (path as NSString).pathExtension.lowercased()
        return imageExtensions.contains(ext)
    }

    public static func formatFamily(_ path: String) -> String {
        switch (path as NSString).pathExtension.lowercased() {
        case "jpg", "jpeg": "JPG"
        case "tif", "tiff": "TIFF"
        case "heic", "heif": "HEIC"
        case let other: other.uppercased()
        }
    }

    /// 숫자를 숫자로 비교하는 정렬 ("2.jpg" < "10.jpg")
    static func naturalLess(_ a: String, _ b: String) -> Bool {
        a.compare(b, options: [.numeric, .caseInsensitive], range: nil, locale: Locale(identifier: "en_US_POSIX")) == .orderedAscending
    }
}

// zip이 아닌 낱장 파일(사진 앱, 파일 앱)로 가져올 때 앱에서 직접 만든다
public extension ScanFrame {
    init(index: Int, originalName: String, fileURL: URL, size: UInt64) {
        self.init(index: index, originalName: originalName, fileURL: fileURL, byteSize: size)
    }
}

public extension ScanSet {
    init(label: String, frameList: [ScanFrame]) {
        self.init(label: label, frames: frameList)
    }
}

public extension ScanImportResult {
    init(set: ScanSet, workingDirectory: URL) {
        self.init(primary: set, alternatives: [], workingDirectory: workingDirectory)
    }
}

public extension ScanImporter {
    /// 낱장 이미지들을 작업 폴더로 복사하고 파일명 순으로 정렬한다
    static func importFiles(_ urls: [URL], workingDirectory: URL? = nil) throws -> ScanImportResult {
        let fm = FileManager.default
        let workDir = workingDirectory ?? fm.temporaryDirectory
            .appendingPathComponent("filmscan-\(UUID().uuidString)", isDirectory: true)
        try fm.createDirectory(at: workDir, withIntermediateDirectories: true)
        let images = urls.filter { isScanImage(path: $0.lastPathComponent) }
            .sorted { naturalLess($0.lastPathComponent, $1.lastPathComponent) }
        guard !images.isEmpty else { throw ScanImportError.noImages }
        var frames: [ScanFrame] = []
        for (i, url) in images.enumerated() {
            let dest = workDir.appendingPathComponent(String(format: "%05d.%@", i, url.pathExtension.lowercased()))
            try fm.copyItem(at: url, to: dest)
            let size = (try? fm.attributesOfItem(atPath: dest.path)[.size] as? UInt64) ?? 0
            frames.append(ScanFrame(index: i + 1, originalName: url.lastPathComponent, fileURL: dest, size: size))
        }
        return ScanImportResult(set: ScanSet(label: "사진 \(frames.count)장", frameList: frames), workingDirectory: workDir)
    }

    /// 가져오기 전에 보여줄 몇 장. 가능하면 JPG 묶음에서 고른다.
    public static func peek(zipURL: URL, maxFrames: Int = 8) throws -> (paths: [String], samples: [URL]) {
        let archive = try ZipArchive(url: zipURL)
        let images = archive.entries.filter { isScanImage(path: $0.path) && !$0.isDirectory }
        let groups = Dictionary(grouping: images) { entry -> String in
            let folder = (entry.path as NSString).deletingLastPathComponent
            return "\(folder)|\(formatFamily(entry.path))"
        }
        let jpg = groups.filter { $0.key.hasSuffix("|JPG") }.max { $0.value.count < $1.value.count }
        let chosen = (jpg?.value ?? groups.max { $0.value.count < $1.value.count }?.value ?? [])
            .sorted { naturalLess($0.path, $1.path) }
        let dir = FileManager.default.temporaryDirectory.appendingPathComponent("peek-\(UUID().uuidString)", isDirectory: true)
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        var samples: [URL] = []
        for (i, entry) in chosen.prefix(maxFrames).enumerated() {
            let ext = (entry.path as NSString).pathExtension
            let dest = dir.appendingPathComponent(String(format: "%02d.%@", i, ext))
            try archive.extract(entry, to: dest)
            samples.append(dest)
        }
        return (images.map(\.path), samples)
    }
}
