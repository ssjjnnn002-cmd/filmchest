import Foundation
import SwiftUI
import ImageIO
import Photos
import SwiftData
import CryptoKit
import UniformTypeIdentifiers
import FilmScanCore

enum Trash {
    static func purge(in context: ModelContext) {
        let cutoff = Date().addingTimeInterval(-24 * 60 * 60)
        let rolls = (try? context.fetch(FetchDescriptor<RollItem>())) ?? []
        for roll in rolls {
            roll.rememberCamera()
            if let deleted = roll.deletedAt, deleted < cutoff { context.delete(roll) }
        }
        let cameras = (try? context.fetch(FetchDescriptor<CameraItem>())) ?? []
        for camera in cameras {
            guard let deleted = camera.deletedAt, deleted < cutoff else { continue }
            for roll in camera.rolls ?? [] { roll.rememberCamera() }
            context.delete(camera)
        }
    }
}

struct GearDocument: FileDocument {
    static var readableContentTypes: [UTType] { [.json] }
    var data: Data

    init(data: Data) { self.data = data }

    init(configuration: ReadConfiguration) throws {
        data = configuration.file.regularFileContents ?? Data()
    }

    func fileWrapper(configuration: WriteConfiguration) throws -> FileWrapper {
        FileWrapper(regularFileWithContents: data)
    }
}

private struct GearFile: Codable {
    var kind: String
    var version: Int
    var cameras: [GearCamera]
    var lenses: [GearLens]
}

private struct GearCamera: Codable {
    var id: UUID
    var brand: String
    var model: String
    var nickname: String?
    var formatRaw: String
    var mount: String?
    var fixedLensName: String?
    var photo: String?
    var spinData: String?
    var bodyStyleRaw: String
    var bodyStyleManual: Bool
    var modelColorHex: String
    var batteryType: String?
    var batteryReplacedAt: Date?
    var createdAt: Date
    var sortOrder: Int
}

private struct GearLens: Codable {
    var id: UUID
    var brand: String
    var model: String
    var mount: String
    var photo: String?
    var createdAt: Date
}

enum GearBackup {
    static func data(cameras: [CameraItem], lenses: [LensItem]) throws -> Data {
        let file = GearFile(
            kind: "filmchest-gear",
            version: 1,
            cameras: cameras.map {
                GearCamera(id: $0.id, brand: $0.brand, model: $0.model, nickname: $0.nickname,
                           formatRaw: $0.formatRaw, mount: $0.mount, fixedLensName: $0.fixedLensName,
                           photo: $0.photo?.base64EncodedString(), spinData: $0.spinData?.base64EncodedString(),
                           bodyStyleRaw: $0.bodyStyleRaw, bodyStyleManual: $0.bodyStyleManual,
                           modelColorHex: $0.modelColorHex, batteryType: $0.batteryType,
                           batteryReplacedAt: $0.batteryReplacedAt, createdAt: $0.createdAt, sortOrder: $0.sortOrder)
            },
            lenses: lenses.map {
                GearLens(id: $0.id, brand: $0.brand, model: $0.model, mount: $0.mount,
                         photo: $0.photo?.base64EncodedString(), createdAt: $0.createdAt)
            }
        )
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        return try encoder.encode(file)
    }

    @MainActor
    static func merge(_ data: Data, into context: ModelContext) throws -> (cameras: Int, lenses: Int) {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        let file = try decoder.decode(GearFile.self, from: data)
        guard file.kind == "filmchest-gear" else { throw CocoaError(.fileReadCorruptFile) }
        let cameras = (try? context.fetch(FetchDescriptor<CameraItem>())) ?? []
        let lenses = (try? context.fetch(FetchDescriptor<LensItem>())) ?? []
        for item in file.cameras {
            let camera = cameras.first { $0.id == item.id } ?? {
                let created = CameraItem(brand: item.brand, model: item.model)
                created.id = item.id
                context.insert(created)
                return created
            }()
            camera.brand = item.brand
            camera.model = item.model
            camera.nickname = item.nickname
            camera.formatRaw = item.formatRaw
            camera.mount = item.mount
            camera.fixedLensName = item.fixedLensName
            if let photo = item.photo { camera.photo = Data(base64Encoded: photo) }
            if let spin = item.spinData { camera.spinData = Data(base64Encoded: spin) }
            camera.bodyStyleRaw = item.bodyStyleRaw
            camera.bodyStyleManual = item.bodyStyleManual
            camera.modelColorHex = item.modelColorHex
            camera.batteryType = item.batteryType
            camera.batteryReplacedAt = item.batteryReplacedAt
            camera.createdAt = item.createdAt
            camera.sortOrder = item.sortOrder
        }
        for item in file.lenses {
            let lens = lenses.first { $0.id == item.id } ?? {
                let created = LensItem(brand: item.brand, model: item.model, mount: item.mount)
                created.id = item.id
                context.insert(created)
                return created
            }()
            lens.brand = item.brand
            lens.model = item.model
            lens.mount = item.mount
            if let photo = item.photo { lens.photo = Data(base64Encoded: photo) }
            lens.createdAt = item.createdAt
        }
        try context.save()
        return (file.cameras.count, file.lenses.count)
    }
}

private final class ResumeBox: @unchecked Sendable {
    private let lock = NSLock()
    private var done = false
    func resume(_ continuation: CheckedContinuation<Data?, Never>, _ data: Data?) {
        lock.lock()
        defer { lock.unlock() }
        if done { return }
        done = true
        continuation.resume(returning: data)
    }
}

enum PhotoRestore {
    struct Hit {
        var rollID: UUID
        var frame: Int?
        var assetID: String?
        var thumbnail: Data?
        /// 사진에 적힌 정보 (필름·카메라·날짜·장소·현상소·스캐너·해상도·용량)
        var guess: Guess?
    }
    struct Guess {
        var film: String?
        var make: String?
        var model: String?
        var date: Date?
        var frameCount: Int?
        var place: String?
        var point: GeoPoint?
        var memo: String?
        var lab: String?
        var scanner: String?
        var width: Int?
        var height: Int?
        var bytes: Int64 = 0
        var format: String?
    }

    @MainActor
    static func restoreAppAlbums(context: ModelContext) async throws -> (rolls: Int, frames: Int) {
        try await PhotoLibrary.requestAccess()
        var hits: [Hit] = []
        for asset in assetsInFilmchest() {
            if let hit = await hit(for: asset) { hits.append(hit) }
        }
        return apply(hits, context: context)
    }

    @MainActor
    static func restore(data: Data, assetID: String?, context: ModelContext) -> (rolls: Int, frames: Int) {
        guard let found = hitInfo(data) else { return (0, 0) }
        let thumb = ImageThumbnail.make(data: data, maxPixel: 1200).flatMap { ImageEncoder.data($0, quality: 0.85) }
        return apply([Hit(rollID: found.0, frame: found.1, assetID: assetID, thumbnail: thumb, guess: found.2)], context: context)
    }

    @MainActor
    private static func apply(_ hits: [Hit], context: ModelContext) -> (rolls: Int, frames: Int) {
        var rolls = (try? context.fetch(FetchDescriptor<RollItem>())) ?? []
        var newRolls = 0
        var newFrames = 0
        var places: [UUID: [(Int, String, GeoPoint?, String?)]] = [:]
        for hit in hits {
            let roll: RollItem
            if let found = rolls.first(where: { $0.id == hit.rollID }) {
                if found.deletedAt != nil { found.deletedAt = nil }
                roll = found
            } else {
                let created = RollItem(camera: nil, lens: nil, filmStockID: "")
                created.id = hit.rollID
                created.isArchive = true
                created.status = .imported
                created.importedAt = Date()
                context.insert(created)
                rolls.append(created)
                newRolls += 1
                roll = created
            }
            let index = hit.frame ?? ((roll.frames ?? []).map(\.index).max() ?? 0) + 1
            if (roll.frames ?? []).contains(where: { $0.index == index }) { continue }
            let g = hit.guess
            fill(roll, with: g)
            if let place = g?.place { places[roll.id, default: []].append((index, place, g?.point, g?.memo)) }
            let frame = FrameItem(index: index, assetIdentifier: hit.assetID, thumbnail: hit.thumbnail,
                                  takenAt: g?.date, locationName: g?.place)
            frame.pixelWidth = g?.width
            frame.pixelHeight = g?.height
            if let b = g?.bytes, b > 0 { frame.byteSize = b; roll.scanBytes = (roll.scanBytes ?? 0) + b }
            frame.roll = roll
            context.insert(frame)
            roll.frameCount = max(roll.frameCount ?? 0, index)
            if roll.status != .imported { roll.status = .imported }
            newFrames += 1
        }
        // 장소: 컷 순서대로 같은 장소끼리 한 구간 (이미 장소 기록이 있는 롤은 그대로)
        for (id, list) in places {
            guard let roll = rolls.first(where: { $0.id == id }), roll.locations.isEmpty else { continue }
            var segments: [LocationSegment] = []
            for (frame, name, point, memo) in list.sorted(by: { $0.0 < $1.0 }) where segments.last?.name != name {
                segments.append(LocationSegment(startFrame: frame, name: name, point: point, memo: memo))
            }
            roll.locations = segments
        }
        try? context.save()
        return (newRolls, newFrames)
    }

    private static func assetsInFilmchest() -> [PHAsset] {
        let lists = PHCollectionList.fetchTopLevelUserCollections(with: nil)
        var folder: PHCollectionList?
        lists.enumerateObjects { item, _, stop in
            if let list = item as? PHCollectionList, list.localizedTitle == PhotoLibrary.folderTitle {
                folder = list
                stop.pointee = true
            }
        }
        guard let folder else { return [] }
        let albums = PHAssetCollection.fetchCollections(in: folder, options: nil)
        var assets: [PHAsset] = []
        var seen = Set<String>()
        albums.enumerateObjects { collection, _, _ in
            guard let album = collection as? PHAssetCollection else { return }
            PHAsset.fetchAssets(in: album, options: nil).enumerateObjects { asset, _, _ in
                if seen.insert(asset.localIdentifier).inserted { assets.append(asset) }
            }
        }
        return assets
    }

    private static func hit(for asset: PHAsset) async -> Hit? {
        let data: Data? = await withCheckedContinuation { continuation in
            let options = PHImageRequestOptions()
            options.isNetworkAccessAllowed = true
            options.deliveryMode = .highQualityFormat
            options.version = .original   // 회전 등 편집본이 아니라 표식이 남은 원본
            options.isSynchronous = false
            let box = ResumeBox()
            PHImageManager.default().requestImageDataAndOrientation(for: asset, options: options) { data, _, _, info in
                let degraded = (info?[PHImageResultIsDegradedKey] as? Bool) ?? false
                if degraded { return }
                box.resume(continuation, data)
            }
        }
        guard let data, let found = hitInfo(data) else { return nil }
        let thumb = ImageThumbnail.make(data: data, maxPixel: 1200).flatMap { ImageEncoder.data($0, quality: 0.85) }
        return Hit(rollID: found.0, frame: found.1, assetID: asset.localIdentifier, thumbnail: thumb, guess: found.2)
    }

    /// 비어 있는 롤 정보만 사진에 적힌 정보로 채운다
    private static func fill(_ roll: RollItem, with g: Guess?) {
        guard let g else { return }
        if roll.filmStockID.isEmpty, let film = g.film {
            roll.filmStockID = FilmStockCatalog.allIncludingCustom.first { $0.displayName == film }?.id ?? ""
        }
        if roll.camera == nil && roll.recordedCameraModel.isEmpty {
            roll.recordedCameraBrand = g.make ?? ""
            roll.recordedCameraModel = g.model ?? ""
        }
        if roll.shootingDays.isEmpty, let date = g.date {
            roll.loadedAt = date
            roll.shootingDays = [ShootingDay(startedAt: date, startFrame: 1)]
        } else if let date = g.date, let first = roll.sortedDays.first, date < first.startedAt, roll.isArchive {
            roll.shootingDays[0].startedAt = date
        }
        if roll.labName == nil { roll.labName = g.lab }
        if roll.scannerName == nil { roll.scannerName = g.scanner }
        if roll.droppedOffAt == nil { roll.droppedOffAt = roll.sortedDays.first?.startedAt ?? g.date }
        if roll.importedAt == nil { roll.importedAt = Date() }
        if roll.scanFormat == nil { roll.scanFormat = g.format }
        if let w = g.width, w > (roll.scanPixelWidth ?? 0) { roll.scanPixelWidth = w; roll.scanPixelHeight = g.height }
        if let n = g.frameCount, n > (roll.frameCount ?? 0) { roll.frameCount = n }
    }

    /// 표식이 있으면 그 롤, 없으면 이 앱이 적은 사진 정보(설명의 "필름 · 3/36", 카메라, 찍은 날)로 짐작한 롤
    private static func hitInfo(_ data: Data) -> (UUID, Int?, Guess?)? {
        let marked = mark(in: data)
        guard let source = CGImageSourceCreateWithData(data as CFData, nil),
              let props = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any] else {
            return marked.map { ($0.0, $0.1, nil) }
        }
        let iptc = props[kCGImagePropertyIPTCDictionary] as? [CFString: Any]
        let tiff = props[kCGImagePropertyTIFFDictionary] as? [CFString: Any]
        let exif = props[kCGImagePropertyExifDictionary] as? [CFString: Any]
        let caption = (iptc?[kCGImagePropertyIPTCCaptionAbstract] as? String) ?? (tiff?[kCGImagePropertyTIFFImageDescription] as? String) ?? ""
        let parts = caption.components(separatedBy: " · ").map { $0.trimmingCharacters(in: .whitespaces) }
        let at = parts.firstIndex { $0.wholeMatch(of: /\d+\/\d+/) != nil }
        let film = (at ?? 0) > 0 ? parts[0] : nil
        guard marked != nil || film != nil || at != nil else { return nil }   // 이 앱이 내보낸 사진으로 볼 근거가 없음
        let nums = at.map { parts[$0].split(separator: "/").compactMap { Int($0) } } ?? []
        let make = tiff?[kCGImagePropertyTIFFMake] as? String
        let model = tiff?[kCGImagePropertyTIFFModel] as? String
        let raw = (exif?[kCGImagePropertyExifDateTimeOriginal] as? String) ?? ""
        let f = DateFormatter()
        f.dateFormat = "yyyy:MM:dd HH:mm:ss"
        let date = f.date(from: raw)
        let day = String(raw.prefix(10))
        // 설명 뒤쪽: 장소 · 메모 · 현상소 · 스캐너 (빈 것은 빠짐). 현상소는 키워드에도 있고 메모는 없다
        let keywords = Set((iptc?[kCGImagePropertyIPTCKeywords] as? [String]) ?? [])
        let scanner = (tiff?[kCGImagePropertyTIFFSoftware] as? String)?.nilIfBlank
        var point: GeoPoint?
        if let gps = props[kCGImagePropertyGPSDictionary] as? [CFString: Any],
           let lat = gps[kCGImagePropertyGPSLatitude] as? Double, let lon = gps[kCGImagePropertyGPSLongitude] as? Double {
            point = GeoPoint(latitude: (gps[kCGImagePropertyGPSLatitudeRef] as? String) == "S" ? -lat : lat,
                             longitude: (gps[kCGImagePropertyGPSLongitudeRef] as? String) == "W" ? -lon : lon)
        }
        var place = (iptc?[kCGImagePropertyIPTCObjectName] as? String)?.nilIfBlank
        var rest = Array(parts.dropFirst((at ?? -1) + 1)).filter { !$0.isEmpty && $0 != scanner }
        // 장소 이름이 따로 없으면: 좌표가 있거나 키워드 항목이 둘 이상일 때만 첫 항목을 장소로 본다 (하나뿐이면 현상소일 수 있다)
        if place == nil, let first = rest.first, keywords.contains(first),
           point != nil || rest.filter({ keywords.contains($0) }).count >= 2 { place = first }
        if let place { rest.removeAll { $0 == place } }
        let lab = rest.last { keywords.contains($0) }
        let memo = rest.first { !keywords.contains($0) }
        let type = CGImageSourceGetType(source) as String?
        let info = Guess(film: film, make: make, model: model, date: date, frameCount: nums.count > 1 ? nums[1] : nil,
                         place: place, point: point, memo: memo, lab: lab, scanner: scanner,
                         width: props[kCGImagePropertyPixelWidth] as? Int, height: props[kCGImagePropertyPixelHeight] as? Int,
                         bytes: Int64(data.count), format: type.flatMap { UTType($0)?.preferredFilenameExtension?.uppercased() })
        if let marked { return (marked.0, marked.1, info) }
        let key = [make ?? "", model ?? "", film ?? "", day].joined(separator: "|")
        let digest = Array(SHA256.hash(data: Data(key.utf8)))
        let id = UUID(uuid: (digest[0], digest[1], digest[2], digest[3], digest[4], digest[5], digest[6], digest[7],
                             digest[8], digest[9], digest[10], digest[11], digest[12], digest[13], digest[14], digest[15]))
        return (id, nums.first, info)
    }

    /// 이 앱(아이폰·웹·갤럭시)이 남긴 롤 표식 "filmchest:<id>:<번호>".
    /// IPTC·EXIF·XMP·윈도우 태그(UTF-16) 어디에 있든 파일 앞부분에서 찾는다.
    static func mark(in data: Data) -> (UUID, Int)? {
        let head = data.prefix(512 * 1024)
        let ascii = String(decoding: head.map { $0 == 0 ? 0x20 : $0 }, as: UTF8.self)
        let squeezed = String(decoding: head.filter { $0 != 0 }, as: UTF8.self)
        let pattern = /filmchest:([0-9a-fA-F-]{36}):(\d+)/
        for text in [ascii, squeezed] {
            if let m = text.firstMatch(of: pattern), let id = UUID(uuidString: String(m.1)), let frame = Int(m.2) {
                return (id, frame)
            }
        }
        return nil
    }
}
