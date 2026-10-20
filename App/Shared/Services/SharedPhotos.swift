import Foundation
import Photos
import ImageIO

/// 사진 앱에서 공유한 사진 한 장의 표지: 파일을 넘기지 않고 이것만 앱에 알려 사진 앱에서 찾아 연결한다.
/// (무료 Apple ID 설치는 확장과 앱이 파일을 나눌 수 없어서)
struct SharedPhotoRef: Codable, Hashable {
    /// 원래 파일 이름 (IMG_1234.HEIC, 000190010001.jpg …)
    var n: String
    /// 찍은 시각 (EXIF, 1970 기준 초)
    var t: Double?
    var w: Int?
    var h: Int?

    /// 확장: 복사해 받은 파일에서 표지를 만든다
    init(file: URL, name: String) {
        n = name
        guard let src = CGImageSourceCreateWithURL(file as CFURL, nil),
              let p = CGImageSourceCopyPropertiesAtIndex(src, 0, nil) as? [CFString: Any] else { return }
        w = p[kCGImagePropertyPixelWidth] as? Int
        h = p[kCGImagePropertyPixelHeight] as? Int
        if let exif = p[kCGImagePropertyExifDictionary] as? [CFString: Any],
           let s = exif[kCGImagePropertyExifDateTimeOriginal] as? String {
            let f = DateFormatter()
            f.locale = Locale(identifier: "en_US_POSIX")
            f.dateFormat = "yyyy:MM:dd HH:mm:ss"
            t = f.date(from: s)?.timeIntervalSince1970
        }
    }

    static func url(_ refs: [SharedPhotoRef]) -> URL? {
        guard let data = try? JSONEncoder().encode(refs) else { return nil }
        let b64 = data.base64EncodedString().replacingOccurrences(of: "+", with: "-").replacingOccurrences(of: "/", with: "_")
        return URL(string: "filmchest://photos?d=\(b64)")
    }

    static func decode(_ url: URL) -> [SharedPhotoRef] {
        guard let d = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems?.first(where: { $0.name == "d" })?.value else { return [] }
        var b64 = d.replacingOccurrences(of: "-", with: "+").replacingOccurrences(of: "_", with: "/")
        while b64.count % 4 != 0 { b64 += "=" }
        guard let data = Data(base64Encoded: b64) else { return [] }
        return (try? JSONDecoder().decode([SharedPhotoRef].self, from: data)) ?? []
    }
}

extension PhotoLibrary {
    /// 표지로 사진 앱의 사진을 찾는다 (이름 → 크기·시각으로 확인). 못 찾으면 nil.
    static func findAssets(_ refs: [SharedPhotoRef]) async -> [String?] {
        guard (try? await requestAccess()) != nil else { return refs.map { _ in nil } }
        return await Task.detached { () -> [String?] in
            let options = PHFetchOptions()
            options.predicate = NSPredicate(format: "mediaType == %d", PHAssetMediaType.image.rawValue)
            let dates = refs.compactMap(\.t)
            if dates.count == refs.count, let lo = dates.min(), let hi = dates.max() {
                // 시각을 알면 그 앞뒤 하루만 본다 (사진이 많아도 빠르게)
                options.predicate = NSPredicate(format: "mediaType == %d AND creationDate >= %@ AND creationDate <= %@",
                                                PHAssetMediaType.image.rawValue,
                                                Date(timeIntervalSince1970: lo - 86_400) as NSDate,
                                                Date(timeIntervalSince1970: hi + 86_400) as NSDate)
            } else {
                options.sortDescriptors = [NSSortDescriptor(key: "creationDate", ascending: false)]
                options.fetchLimit = 4000
            }
            let assets = PHAsset.fetchAssets(with: options)
            let base = { (s: String) in ((s as NSString).deletingPathExtension).lowercased() }
            var byName: [String: [PHAsset]] = [:]
            assets.enumerateObjects { a, _, _ in
                if let name = PHAssetResource.assetResources(for: a).first?.originalFilename {
                    byName[base(name), default: []].append(a)
                }
            }
            var used = Set<String>()
            return refs.map { ref -> String? in
                var candidates = (byName[base(ref.n)] ?? []).filter { !used.contains($0.localIdentifier) }
                if candidates.count > 1, let w = ref.w, let h = ref.h {
                    let sized = candidates.filter { ($0.pixelWidth == w && $0.pixelHeight == h) || ($0.pixelWidth == h && $0.pixelHeight == w) }
                    if !sized.isEmpty { candidates = sized }
                }
                if candidates.count > 1, let t = ref.t {
                    candidates.sort { abs(($0.creationDate?.timeIntervalSince1970 ?? 0) - t) < abs(($1.creationDate?.timeIntervalSince1970 ?? 0) - t) }
                }
                guard let hit = candidates.first else { return nil }
                used.insert(hit.localIdentifier)
                return hit.localIdentifier
            }
        }.value
    }
}

/// 압축을 푼 스캔 폴더: 안쪽 폴더까지 사진 파일을 이름순으로
enum ScanFolder {
    static let imageExtensions: Set<String> = ["jpg", "jpeg", "png", "heic", "heif", "tif", "tiff", "dng"]

    static func isFolder(_ url: URL) -> Bool {
        var isDir: ObjCBool = false
        return FileManager.default.fileExists(atPath: url.path, isDirectory: &isDir) && isDir.boolValue
    }

    static func images(in dir: URL) -> [URL] {
        let ok = dir.startAccessingSecurityScopedResource()
        defer { if ok { dir.stopAccessingSecurityScopedResource() } }
        guard let e = FileManager.default.enumerator(at: dir, includingPropertiesForKeys: nil, options: [.skipsHiddenFiles]) else { return [] }
        var out: [URL] = []
        for case let url as URL in e where imageExtensions.contains(url.pathExtension.lowercased())
            && !url.path.contains("__MACOSX") {
            out.append(url)
        }
        return out.sorted { $0.path.localizedStandardCompare($1.path) == .orderedAscending }
    }
}
