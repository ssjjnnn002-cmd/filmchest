import Foundation
import Photos
import ImageIO
import CoreLocation
import FilmScanCore

enum PhotoLibraryError: LocalizedError {
    case denied
    case failed(String)

    var errorDescription: String? {
        switch self {
        case .denied: "사진 보관함 접근이 허용되지 않았어요. 설정에서 '모든 사진' 접근을 허용해 주세요."
        case .failed(let message): message
        }
    }
}

/// 사진 앱의 "필름" 폴더 안에 롤별 앨범을 만들고, 컷을 순서대로 저장한다.
enum PhotoLibrary {
    static let folderTitle = "필름함"

    static func requestAccess() async throws {
        let status = await PHPhotoLibrary.requestAuthorization(for: .readWrite)
        // 앨범을 만들려면 '모든 사진' 접근이 필요하다 (추가 전용 권한으로는 앨범 생성 불가)
        guard status == .authorized || status == .limited else { throw PhotoLibraryError.denied }
    }

    /// "필름함" 폴더 안에 앨범을 찾거나 만든다. 같은 이름 앨범이 있으면 재사용.
    /// fresh: 롤마다 앨범일 때. 같은 이름이 있어도 새로 만들고 "(2)"처럼 번호를 붙인다
    /// (같은 날·같은 카메라·같은 필름 롤이 한 앨범에 섞이지 않게)
    static func album(titled title: String, fresh: Bool = false) async throws -> PHAssetCollection {
        let folder = try await folder()
        let albums = PHAssetCollection.fetchCollections(in: folder, options: nil)
        var titles = Set<String>()
        var found: PHAssetCollection?
        albums.enumerateObjects { c, _, _ in
            guard let a = c as? PHAssetCollection, let t = a.localizedTitle else { return }
            titles.insert(t)
            if t == title, found == nil { found = a }
        }
        if let found, !fresh { return found }
        var title = title
        if fresh, titles.contains(title) {
            var n = 2
            while titles.contains("\(title) (\(n))") { n += 1 }
            title = "\(title) (\(n))"
        }
        return try await createAlbum(title, in: folder)
    }

    private static func createAlbum(_ title: String, in folder: PHCollectionList) async throws -> PHAssetCollection {
        var id = ""
        try await PHPhotoLibrary.shared().performChanges {
            let req = PHAssetCollectionChangeRequest.creationRequestForAssetCollection(withTitle: title)
            id = req.placeholderForCreatedAssetCollection.localIdentifier
            PHCollectionListChangeRequest(for: folder)?.addChildCollections([req.placeholderForCreatedAssetCollection] as NSArray)
        }
        guard let album = PHAssetCollection.fetchAssetCollections(withLocalIdentifiers: [id], options: nil).firstObject else {
            throw PhotoLibraryError.failed("앨범을 만들지 못했어요.")
        }
        return album
    }

    private static func folder() async throws -> PHCollectionList {
        let lists = PHCollectionList.fetchTopLevelUserCollections(with: nil)
        var found: PHCollectionList?
        lists.enumerateObjects { c, _, stop in
            if let l = c as? PHCollectionList, l.localizedTitle == folderTitle { found = l; stop.pointee = true }
        }
        if let found { return found }

        var id = ""
        try await PHPhotoLibrary.shared().performChanges {
            id = PHCollectionListChangeRequest.creationRequestForCollectionList(withTitle: folderTitle)
                .placeholderForCreatedCollectionList.localIdentifier
        }
        guard let list = PHCollectionList.fetchCollectionLists(withLocalIdentifiers: [id], options: nil).firstObject else {
            throw PhotoLibraryError.failed("'\(folderTitle)' 폴더를 만들지 못했어요.")
        }
        return list
    }

    /// 파일 하나를 사진 앱에 추가하고 앨범에 넣는다. 반환값은 에셋 ID.
    /// - date: nil이면 파일의 EXIF 날짜를 그대로 쓴다
    /// - album: nil이면 앨범 없이 보관함에만 저장
    static func add(fileURL: URL, originalName: String, date: Date?, location: CLLocation?,
                    to album: PHAssetCollection?) async throws -> String {
        var id = ""
        try await PHPhotoLibrary.shared().performChanges {
            let req = PHAssetCreationRequest.forAsset()
            let options = PHAssetResourceCreationOptions()
            options.originalFilename = originalName
            req.addResource(with: .photo, fileURL: fileURL, options: options)
            if let date { req.creationDate = date }
            if let location { req.location = location }
            if let placeholder = req.placeholderForCreatedAsset {
                id = placeholder.localIdentifier
                if let album {
                    PHAssetCollectionChangeRequest(for: album)?.addAssets([placeholder] as NSArray)
                }
            }
        }
        return id
    }

    /// 이미 사진 앱에 있는 사진: 복사하지 않고 날짜/위치만 고치고 앨범에 넣는다
    static func update(assetID: String, date: Date?, location: CLLocation?,
                       addTo album: PHAssetCollection?) async throws -> PHAsset? {
        guard let asset = PHAsset.fetchAssets(withLocalIdentifiers: [assetID], options: nil).firstObject else { return nil }
        if date != nil || location != nil || album != nil {
            try await PHPhotoLibrary.shared().performChanges {
                if date != nil || location != nil {
                    let req = PHAssetChangeRequest(for: asset)
                    if let date { req.creationDate = date }
                    if let location { req.location = location }
                }
                if let album {
                    PHAssetCollectionChangeRequest(for: album)?.addAssets([asset] as NSArray)
                }
            }
        }
        return PHAsset.fetchAssets(withLocalIdentifiers: [assetID], options: nil).firstObject
    }

    /// 밀착 인화 같은 생성 이미지를 저장
    static func add(imageData: Data, to album: PHAssetCollection?) async throws {
        try await PHPhotoLibrary.shared().performChanges {
            let req = PHAssetCreationRequest.forAsset()
            req.addResource(with: .photo, data: imageData, options: nil)
            if let album, let placeholder = req.placeholderForCreatedAsset {
                PHAssetCollectionChangeRequest(for: album)?.addAssets([placeholder] as NSArray)
            }
        }
    }

    /// 사진 앱에 저장된 사진 파일 그대로 (돌린 것까지 반영된 지금 모습). 드라이브에 올릴 때
    static func fileData(assetID: String) async -> (data: Data, modified: Date?)? {
        guard let asset = PHAsset.fetchAssets(withLocalIdentifiers: [assetID], options: nil).firstObject else { return nil }
        let options = PHImageRequestOptions()
        options.isNetworkAccessAllowed = true
        options.deliveryMode = .highQualityFormat
        options.version = .current
        let data: Data? = await withCheckedContinuation { c in
            PHImageManager.default().requestImageDataAndOrientation(for: asset, options: options) { data, _, _, _ in
                c.resume(returning: data)
            }
        }
        return data.map { ($0, asset.modificationDate) }
    }

    /// 사진 앱에 저장된 원본에서 큰 이미지를 읽는다 (확대해서 볼 때)
    static func image(assetID: String, maxPixel: Int) async -> CGImage? {
        guard let asset = PHAsset.fetchAssets(withLocalIdentifiers: [assetID], options: nil).firstObject else { return nil }
        let options = PHImageRequestOptions()
        options.isNetworkAccessAllowed = true
        options.deliveryMode = .highQualityFormat
        let data: Data? = await withCheckedContinuation { c in
            PHImageManager.default().requestImageDataAndOrientation(for: asset, options: options) { data, _, _, _ in
                c.resume(returning: data)
            }
        }
        guard let data else { return nil }
        return await Task.detached { ImageThumbnail.make(data: data, maxPixel: maxPixel) }.value
    }

    /// 사진 앱 사진을 원본에서 시계 방향 90°×turns로 돌려 둔다 (여러 장을 한 번에: 허락 창이 한 번만 뜬다).
    /// metadata가 있으면 사진 속 촬영 정보(카메라·렌즈·날짜 등)도 그 값으로 다시 쓴다 (롤 카메라를 바꿨을 때).
    /// 0이고 metadata도 없으면 원본으로 되돌린다. 반영한 사진의 id 목록을 돌려준다.
    static func setRotation(_ items: [(assetID: String, turns: Int, metadata: FrameMetadata?)]) async -> [String] {
        let ids = items.map(\.assetID)
        let assets = PHAsset.fetchAssets(withLocalIdentifiers: ids, options: nil)
        var byID: [String: PHAsset] = [:]
        assets.enumerateObjects { a, _, _ in byID[a.localIdentifier] = a }
        var outputs: [(PHAsset, PHContentEditingOutput?)] = []
        for item in items {
            guard let asset = byID[item.assetID] else { continue }
            let t = ((item.turns % 4) + 4) % 4
            if t == 0 && item.metadata == nil { outputs.append((asset, nil)); continue }
            let options = PHContentEditingInputRequestOptions()
            options.isNetworkAccessAllowed = true
            // 우리 회전 기록이면 원본을 받아 다시 돌린다 (돌린 위에 또 돌리지 않게)
            options.canHandleAdjustmentData = { $0.formatIdentifier == rotateFormat }
            let input: PHContentEditingInput? = await withCheckedContinuation { c in
                asset.requestContentEditingInput(with: options) { input, _ in c.resume(returning: input) }
            }
            guard let input, let url = input.fullSizeImageURL,
                  let src = CGImageSourceCreateWithURL(url as CFURL, nil),
                  let image = CGImageSourceCreateImageAtIndex(src, 0, nil) else { continue }
            let props = CGImageSourceCopyPropertiesAtIndex(src, 0, nil) as? [CFString: Any] ?? [:]
            let oriented = image.applyingOrientation(Int(input.fullSizeImageOrientation))
            let output = PHContentEditingOutput(contentEditingInput: input)
            output.adjustmentData = PHAdjustmentData(formatIdentifier: rotateFormat, formatVersion: "1", data: Data("\(t)".utf8))
            // 돌린 사진을 먼저 임시 파일로, 촬영 정보를 다시 써야 하면 그 위에 써서 결과로 낸다
            let tmp = FileManager.default.temporaryDirectory.appendingPathComponent("edit-\(UUID().uuidString).jpg")
            defer { try? FileManager.default.removeItem(at: tmp) }
            let target = item.metadata == nil ? output.renderedContentURL : tmp
            guard let dest = CGImageDestinationCreateWithURL(target as CFURL, "public.jpeg" as CFString, 1, nil) else { continue }
            var meta = props
            meta[kCGImagePropertyOrientation] = 1
            meta[kCGImageDestinationLossyCompressionQuality] = 0.95
            CGImageDestinationAddImage(dest, oriented.rotated(quarterTurns: t), meta as CFDictionary)
            guard CGImageDestinationFinalize(dest) else { continue }
            if let m = item.metadata {
                guard (try? MetadataWriter.write(source: tmp, destination: output.renderedContentURL, metadata: m)) != nil else { continue }
            }
            outputs.append((asset, output))
        }
        guard !outputs.isEmpty else { return [] }
        do {
            try await PHPhotoLibrary.shared().performChanges {
                for (asset, output) in outputs {
                    let req = PHAssetChangeRequest(for: asset)
                    if let output { req.contentEditingOutput = output } else { req.revertAssetContentToOriginal() }
                }
            }
            return outputs.map { $0.0.localIdentifier }
        } catch {
            return []
        }
    }
    private static let rotateFormat = "kr.filmchest.rotate"

    /// 사진 앱 사진의 원본 파일 (돌리기 편집 전). 임시 폴더에 복사해서 돌려준다 (쓴 뒤 지울 것)
    static func originalFile(assetID: String) async -> (url: URL, name: String, favorite: Bool)? {
        guard let asset = PHAsset.fetchAssets(withLocalIdentifiers: [assetID], options: nil).firstObject else { return nil }
        let options = PHContentEditingInputRequestOptions()
        options.isNetworkAccessAllowed = true
        options.canHandleAdjustmentData = { $0.formatIdentifier == rotateFormat }
        let input: PHContentEditingInput? = await withCheckedContinuation { c in
            asset.requestContentEditingInput(with: options) { input, _ in c.resume(returning: input) }
        }
        guard let src = input?.fullSizeImageURL else { return nil }
        let name = PHAssetResource.assetResources(for: asset).first { $0.type == .photo }?.originalFilename ?? src.lastPathComponent
        let dir = FileManager.default.temporaryDirectory.appendingPathComponent("orig-\(UUID().uuidString)", isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        let out = dir.appendingPathComponent(src.lastPathComponent)
        guard (try? FileManager.default.copyItem(at: src, to: out)) != nil else { return nil }
        return (out, name, asset.isFavorite)
    }

    /// 사진들을 지운다 (사진 앱이 한 번 묻는다). 지웠으면 true
    static func delete(assetIDs: [String]) async -> Bool {
        let assets = PHAsset.fetchAssets(withLocalIdentifiers: assetIDs, options: nil)
        guard assets.count > 0 else { return true }
        do {
            try await PHPhotoLibrary.shared().performChanges { PHAssetChangeRequest.deleteAssets(assets) }
            return true
        } catch { return false }
    }

    /// 롤을 지울 때 사진 앱 사진도 지운다 (사진 앱이 한 번 묻는다. 지운 사진은 사진 앱 '최근 삭제된 항목'에 30일 남는다).
    /// 그 롤 사진만 들어 있던 앨범이면 앨범도 함께 지운다. 지웠으면 true
    static func deleteRollPhotos(assetIDs: [String], albumID: String?) async -> Bool {
        guard (try? await requestAccess()) != nil else { return false }
        let assets = PHAsset.fetchAssets(withLocalIdentifiers: assetIDs, options: nil)
        let ids = Set(assetIDs)
        var emptyAlbum: PHAssetCollection?
        if let album = existingAlbum(id: albumID) {
            var others = false
            PHAsset.fetchAssets(in: album, options: nil).enumerateObjects { a, _, stop in
                if !ids.contains(a.localIdentifier) { others = true; stop.pointee = true }
            }
            if !others { emptyAlbum = album }
        }
        guard assets.count > 0 || emptyAlbum != nil else { return true }
        do {
            try await PHPhotoLibrary.shared().performChanges {
                if assets.count > 0 { PHAssetChangeRequest.deleteAssets(assets) }
                if let emptyAlbum { PHAssetCollectionChangeRequest.deleteAssetCollections([emptyAlbum] as NSArray) }
            }
            return true
        } catch { return false }
    }

    struct RollAlbum: Sendable {
        let rollID: UUID
        let albumID: String
        let title: String
        let assetIDs: [String]
    }

    /// 예전 버전: 롤마다 앨범인데 이름(날짜·필름·카메라)이 같으면 한 앨범에 섞였다.
    /// 같은 앨범을 쓰는 롤이 여럿이고 앨범 이름이 그 롤 이름이면, 첫 롤만 남기고 나머지는 새 앨범 "(2)"로 옮긴다.
    /// 허락 창은 띄우지 않는다 (이미 허락했을 때만). 돌려준 값: 롤 id → 새 앨범 id
    static func splitMergedAlbums(_ rolls: [RollAlbum]) async -> [UUID: String] {
        guard PHPhotoLibrary.authorizationStatus(for: .readWrite) == .authorized else { return [:] }
        var moved: [UUID: String] = [:]
        for group in Dictionary(grouping: rolls, by: \.albumID).values where group.count > 1 {
            guard let album = existingAlbum(id: group[0].albumID),
                  group.allSatisfy({ $0.title == album.localizedTitle }) else { continue }
            for roll in group.dropFirst() where !roll.assetIDs.isEmpty {
                guard let fresh = try? await self.album(titled: roll.title, fresh: true) else { continue }
                let assets = PHAsset.fetchAssets(withLocalIdentifiers: roll.assetIDs, options: nil)
                do {
                    try await PHPhotoLibrary.shared().performChanges {
                        PHAssetCollectionChangeRequest(for: fresh)?.addAssets(assets)
                        PHAssetCollectionChangeRequest(for: album)?.removeAssets(assets)
                    }
                    moved[roll.rollID] = fresh.localIdentifier
                } catch { continue }
            }
        }
        return moved
    }

    /// 사진 앱의 하트(즐겨찾기)와 맞춘다
    static func setFavorite(assetID: String, _ value: Bool) async {
        guard let asset = PHAsset.fetchAssets(withLocalIdentifiers: [assetID], options: nil).firstObject else { return }
        try? await PHPhotoLibrary.shared().performChanges {
            PHAssetChangeRequest(for: asset).isFavorite = value
        }
    }

    static func existingAlbum(id: String?) -> PHAssetCollection? {
        guard let id else { return nil }
        return PHAssetCollection.fetchAssetCollections(withLocalIdentifiers: [id], options: nil).firstObject
    }
}

extension RollItem {
    /// 사진 앱에 저장된 이 롤 사진
    var photoAssetIDs: [String] { (frames ?? []).compactMap(\.assetIdentifier) }

    /// 롤 기록을 휴지통으로 보내면서 사진 앱 사진(과 이 롤만의 앨범)도 지운다. 사진 앱에서 거절하면 기록도 그대로
    @MainActor
    func deleteWithPhotos() async -> Bool {
        guard await PhotoLibrary.deleteRollPhotos(assetIDs: photoAssetIDs, albumID: albumIdentifier) else { return false }
        deletedAt = Date()
        return true
    }
}
