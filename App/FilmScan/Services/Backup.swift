import Foundation
import SwiftUI
import ImageIO
import Photos
import SwiftData
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
        var frame: Int
        var assetID: String?
        var thumbnail: Data?
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
        guard let parsed = mark(in: data) else { return (0, 0) }
        let thumb = ImageThumbnail.make(data: data, maxPixel: 1200).flatMap { ImageEncoder.data($0, quality: 0.85) }
        return apply([Hit(rollID: parsed.0, frame: parsed.1, assetID: assetID, thumbnail: thumb)], context: context)
    }

    @MainActor
    private static func apply(_ hits: [Hit], context: ModelContext) -> (rolls: Int, frames: Int) {
        var rolls = (try? context.fetch(FetchDescriptor<RollItem>())) ?? []
        var newRolls = 0
        var newFrames = 0
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
            if (roll.frames ?? []).contains(where: { $0.index == hit.frame }) { continue }
            let frame = FrameItem(index: hit.frame, assetIdentifier: hit.assetID, thumbnail: hit.thumbnail,
                                  takenAt: nil, locationName: nil)
            frame.roll = roll
            context.insert(frame)
            roll.frameCount = max(roll.frameCount ?? 0, hit.frame)
            if roll.status != .imported { roll.status = .imported }
            newFrames += 1
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
        guard let data, let parsed = mark(in: data) else { return nil }
        let thumb = ImageThumbnail.make(data: data, maxPixel: 1200).flatMap { ImageEncoder.data($0, quality: 0.85) }
        return Hit(rollID: parsed.0, frame: parsed.1, assetID: asset.localIdentifier, thumbnail: thumb)
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
