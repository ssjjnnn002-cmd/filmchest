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

    /// "필름" 폴더 안에 앨범을 찾거나 만든다. 같은 이름 앨범이 있으면 재사용.
    static func album(titled title: String) async throws -> PHAssetCollection {
        let folder = try await folder()
        let albums = PHAssetCollection.fetchCollections(in: folder, options: nil)
        var found: PHAssetCollection?
        albums.enumerateObjects { c, _, stop in
            if let a = c as? PHAssetCollection, a.localizedTitle == title { found = a; stop.pointee = true }
        }
        if let found { return found }

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
    /// 0이면 원본으로 되돌린다. 반영한 사진의 id 목록을 돌려준다.
    static func setRotation(_ items: [(assetID: String, turns: Int)]) async -> [String] {
        let ids = items.map(\.assetID)
        let assets = PHAsset.fetchAssets(withLocalIdentifiers: ids, options: nil)
        var byID: [String: PHAsset] = [:]
        assets.enumerateObjects { a, _, _ in byID[a.localIdentifier] = a }
        var outputs: [(PHAsset, PHContentEditingOutput?)] = []
        for item in items {
            guard let asset = byID[item.assetID] else { continue }
            let t = ((item.turns % 4) + 4) % 4
            if t == 0 { outputs.append((asset, nil)); continue }
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
            guard let dest = CGImageDestinationCreateWithURL(output.renderedContentURL as CFURL, "public.jpeg" as CFString, 1, nil) else { continue }
            var meta = props
            meta[kCGImagePropertyOrientation] = 1
            meta[kCGImageDestinationLossyCompressionQuality] = 0.95
            CGImageDestinationAddImage(dest, oriented.rotated(quarterTurns: t), meta as CFDictionary)
            guard CGImageDestinationFinalize(dest) else { continue }
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
