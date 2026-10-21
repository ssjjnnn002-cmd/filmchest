import Foundation
import SwiftData
import AuthenticationServices
import CryptoKit
import Security
import FilmScanCore

// 구글 계정으로 드라이브 '필름함' 폴더에 기록을 올리고, 웹·갤럭시와 같은 파일(필름함 백업.json)을 함께 쓴다.
// 사진은 올리지 않는다 (사진 앱에 있다). 앱을 열 때 드라이브 쪽이 더 새로우면 합치고, 나갈 때 바뀐 게 있으면 올린다.

// MARK: - 로그인 (구글 iOS 클라이언트, PKCE)

enum GoogleAuth {
    static let clientID = "940262391554-5b6bclp0sv9btomf9nl3asu9bp9rc3tn.apps.googleusercontent.com"
    static let scheme = "com.googleusercontent.apps.940262391554-5b6bclp0sv9btomf9nl3asu9bp9rc3tn"
    static var redirect: String { "\(scheme):/oauthredirect" }
    static let scope = "https://www.googleapis.com/auth/drive.file email"

    private static var access: (token: String, until: Date)?

    static var isConnected: Bool { Keychain.get("googleRefresh") != nil }
    static var account: String? { UserDefaults.standard.string(forKey: "filmscan.googleAccount") }

    /// 처음 연결: 구글 로그인 창 (버튼에서)
    @MainActor
    static func signIn() async throws {
        let verifier = randomString(64)
        let challenge = Data(SHA256.hash(data: Data(verifier.utf8))).base64URL
        var c = URLComponents(string: "https://accounts.google.com/o/oauth2/v2/auth")!
        c.queryItems = [
            .init(name: "client_id", value: clientID), .init(name: "redirect_uri", value: redirect),
            .init(name: "response_type", value: "code"), .init(name: "scope", value: scope),
            .init(name: "code_challenge", value: challenge), .init(name: "code_challenge_method", value: "S256"),
            .init(name: "access_type", value: "offline"), .init(name: "prompt", value: "consent"),
        ]
        let callback: URL = try await withCheckedThrowingContinuation { cont in
            let session = ASWebAuthenticationSession(url: c.url!, callbackURLScheme: scheme) { url, error in
                if let url { cont.resume(returning: url) } else { cont.resume(throwing: error ?? URLError(.cancelled)) }
            }
            session.presentationContextProvider = Anchor.shared
            session.prefersEphemeralWebBrowserSession = false
            session.start()
        }
        guard let code = URLComponents(url: callback, resolvingAgainstBaseURL: false)?.queryItems?.first(where: { $0.name == "code" })?.value
        else { throw DriveError.message("구글 로그인을 마치지 않았어요") }
        let json = try await tokenRequest(["code": code, "code_verifier": verifier, "grant_type": "authorization_code", "redirect_uri": redirect])
        guard let refresh = json["refresh_token"] as? String else { throw DriveError.message("구글 연결 정보를 받지 못했어요") }
        Keychain.set("googleRefresh", refresh)
        remember(json)
        if let idToken = json["id_token"] as? String, let email = emailFrom(idToken) {
            UserDefaults.standard.set(email, forKey: "filmscan.googleAccount")
        }
    }

    static func signOut() {
        Keychain.delete("googleRefresh")
        access = nil
        UserDefaults.standard.removeObject(forKey: "filmscan.googleAccount")
    }

    /// 쓸 수 있는 토큰 (필요하면 조용히 새로 받는다)
    static func token() async throws -> String {
        if let access, access.until > Date().addingTimeInterval(60) { return access.token }
        guard let refresh = Keychain.get("googleRefresh") else { throw DriveError.message("구글 드라이브가 연결되지 않았어요") }
        let json = try await tokenRequest(["refresh_token": refresh, "grant_type": "refresh_token"])
        return remember(json)
    }

    @discardableResult
    private static func remember(_ json: [String: Any]) -> String {
        let t = json["access_token"] as? String ?? ""
        access = (t, Date().addingTimeInterval(Double(json["expires_in"] as? Int ?? 3600)))
        return t
    }

    private static func tokenRequest(_ fields: [String: String]) async throws -> [String: Any] {
        var req = URLRequest(url: URL(string: "https://oauth2.googleapis.com/token")!)
        req.httpMethod = "POST"
        req.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
        var all = fields
        all["client_id"] = clientID
        req.httpBody = all.map { "\($0.key)=\($0.value.addingPercentEncoding(withAllowedCharacters: .alphanumerics) ?? "")" }
            .joined(separator: "&").data(using: .utf8)
        let (data, res) = try await URLSession.shared.data(for: req)
        let json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] ?? [:]
        if (res as? HTTPURLResponse)?.statusCode != 200 {
            if json["error"] as? String == "invalid_grant" { signOut() }
            throw DriveError.message("구글 연결이 끊겼어요. 다시 연결해 주세요.")
        }
        return json
    }

    private static func emailFrom(_ jwt: String) -> String? {
        let parts = jwt.split(separator: ".")
        guard parts.count > 1 else { return nil }
        var b64 = String(parts[1]).replacingOccurrences(of: "-", with: "+").replacingOccurrences(of: "_", with: "/")
        while b64.count % 4 != 0 { b64 += "=" }
        guard let data = Data(base64Encoded: b64),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return nil }
        return json["email"] as? String
    }

    private static func randomString(_ n: Int) -> String {
        let chars = Array("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~")
        return String((0..<n).map { _ in chars.randomElement()! })
    }
}

private final class Anchor: NSObject, ASWebAuthenticationPresentationContextProviding {
    static let shared = Anchor()
    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        #if os(iOS)
        UIApplication.shared.connectedScenes.compactMap { ($0 as? UIWindowScene)?.keyWindow }.first ?? ASPresentationAnchor()
        #else
        NSApplication.shared.keyWindow ?? ASPresentationAnchor()
        #endif
    }
}

enum DriveError: LocalizedError {
    case message(String)
    var errorDescription: String? { if case .message(let m) = self { return m }; return nil }
}

private extension Data {
    var base64URL: String {
        base64EncodedString().replacingOccurrences(of: "+", with: "-").replacingOccurrences(of: "/", with: "_").replacingOccurrences(of: "=", with: "")
    }
}

enum Keychain {
    static func set(_ key: String, _ value: String) {
        delete(key)
        SecItemAdd([kSecClass: kSecClassGenericPassword, kSecAttrAccount: key, kSecValueData: Data(value.utf8),
                    kSecAttrAccessible: kSecAttrAccessibleAfterFirstUnlock] as CFDictionary, nil)
    }
    static func get(_ key: String) -> String? {
        var out: AnyObject?
        let q = [kSecClass: kSecClassGenericPassword, kSecAttrAccount: key, kSecReturnData: true] as CFDictionary
        guard SecItemCopyMatching(q, &out) == errSecSuccess, let data = out as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }
    static func delete(_ key: String) {
        SecItemDelete([kSecClass: kSecClassGenericPassword, kSecAttrAccount: key] as CFDictionary)
    }
}

// MARK: - 드라이브 폴더·파일 (웹 core/driveApi.ts와 같다)

enum DriveClient {
    static let folderMime = "application/vnd.google-apps.folder"
    static let rootName = "필름함"
    private static let api = "https://www.googleapis.com/drive/v3/files"

    private static func call(_ url: String, method: String = "GET", json: [String: Any]? = nil, body: Data? = nil, type: String? = nil) async throws -> Data {
        var req = URLRequest(url: URL(string: url)!)
        req.httpMethod = method
        req.setValue("Bearer \(try await GoogleAuth.token())", forHTTPHeaderField: "Authorization")
        if let json {
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
            req.httpBody = try JSONSerialization.data(withJSONObject: json)
        } else if let body {
            req.setValue(type ?? "application/octet-stream", forHTTPHeaderField: "Content-Type")
            req.httpBody = body
        }
        let (data, res) = try await URLSession.shared.data(for: req)
        let status = (res as? HTTPURLResponse)?.statusCode ?? 0
        guard (200..<300).contains(status) else { throw DriveError.message("드라이브 요청 실패 (\(status))") }
        return data
    }

    private static func q(_ s: String) -> String { s.replacingOccurrences(of: "\\", with: "\\\\").replacingOccurrences(of: "'", with: "\\'") }

    static func find(_ name: String, parent: String?, folder: Bool) async throws -> String? {
        var parts = ["name = '\(q(name))'", "trashed = false", folder ? "mimeType = '\(folderMime)'" : "mimeType != '\(folderMime)'"]
        if let parent { parts.append("'\(parent)' in parents") }
        let query = parts.joined(separator: " and ").addingPercentEncoding(withAllowedCharacters: .alphanumerics)!
        let data = try await call("\(api)?q=\(query)&fields=files(id,modifiedTime)&pageSize=1")
        let files = ((try JSONSerialization.jsonObject(with: data) as? [String: Any])?["files"] as? [[String: Any]]) ?? []
        return files.first?["id"] as? String
    }

    static func rootFolder() async throws -> String {
        var id = try await find(rootName, parent: nil, folder: true)
        if id == nil {
            let d = try await call(api, method: "POST", json: ["name": rootName, "mimeType": folderMime])
            id = (try JSONSerialization.jsonObject(with: d) as? [String: Any])?["id"] as? String
        }
        guard let id else { throw DriveError.message("드라이브에 폴더를 만들지 못했어요") }
        UserDefaults.standard.set(id, forKey: "filmscan.driveRoot")
        return id
    }

    static func createFile(_ name: String, parent: String, mime: String) async throws -> String {
        let d = try await call(api, method: "POST", json: ["name": name, "mimeType": mime, "parents": [parent]])
        return (try JSONSerialization.jsonObject(with: d) as? [String: Any])?["id"] as? String ?? ""
    }

    static func upload(_ id: String, _ data: Data, mime: String) async throws {
        _ = try await call("https://www.googleapis.com/upload/drive/v3/files/\(id)?uploadType=media", method: "PATCH", body: data, type: mime)
    }

    static func download(_ id: String) async throws -> Data { try await call("\(api)/\(id)?alt=media") }

    static var folderURL: URL {
        let id = UserDefaults.standard.string(forKey: "filmscan.driveRoot") ?? ""
        return URL(string: id.isEmpty ? "https://drive.google.com/drive/my-drive" : "https://drive.google.com/drive/folders/\(id)")!
    }
}

// MARK: - 웹·갤럭시와 같은 기록 파일 형식 (kind: filmchest-backup-web)

enum WebFormat {
    private static func ms(_ d: Date?) -> Any { d.map { ($0.timeIntervalSince1970 * 1000).rounded() } ?? NSNull() }
    private static func date(_ v: Any?) -> Date? { (v as? Double).map { Date(timeIntervalSince1970: $0 / 1000) } }
    private static func id(_ u: UUID) -> String { u.uuidString.lowercased() }
    /// 웹 id → UUID (UUID 모양이 아니면 같은 글자에서 늘 같은 UUID를 만든다)
    static func uuid(_ v: Any?) -> UUID? {
        guard let s = v as? String, !s.isEmpty else { return nil }
        if let u = UUID(uuidString: s) { return u }
        let d = Array(SHA256.hash(data: Data(s.utf8)))
        return UUID(uuid: (d[0], d[1], d[2], d[3], d[4], d[5], d[6], d[7], d[8], d[9], d[10], d[11], d[12], d[13], d[14], d[15]))
    }
    private static func clean(_ dict: [String: Any?]) -> [String: Any] {
        dict.compactMapValues { v in
            guard let v else { return nil }
            if v is NSNull { return nil }
            return v
        }
    }
    private static func encodable<T: Encodable>(_ v: T) -> Any? {
        guard let d = try? JSONEncoder().encode(v) else { return nil }
        return try? JSONSerialization.jsonObject(with: d)
    }
    private static func decodable<T: Decodable>(_ type: T.Type, _ v: Any?) -> T? {
        guard let v, let d = try? JSONSerialization.data(withJSONObject: v) else { return nil }
        return try? JSONDecoder().decode(type, from: d)
    }

    @MainActor
    static func export(from context: ModelContext) throws -> Data {
        func all<T: PersistentModel>(_ t: T.Type) -> [T] { (try? context.fetch(FetchDescriptor<T>())) ?? [] }
        var photos: [String: String] = [:]
        let cameras: [[String: Any]] = all(CameraItem.self).filter { $0.deletedAt == nil }.map { c in
            if let p = c.photo { photos[id(c.id)] = p.base64EncodedString() }
            return clean([
                "id": id(c.id), "brand": c.brand, "model": c.model, "nickname": c.nickname, "format": c.formatRaw,
                "mount": c.mount, "fixedLens": c.fixedLensName, "style": c.bodyStyleRaw, "styleManual": c.bodyStyleManual,
                "color": c.modelColorHex, "hasPhoto": c.photo != nil, "photoScale": c.photoScale, "photoOffsetX": c.photoOffsetX,
                "photoOffsetY": c.photoOffsetY, "tags": c.tags, "accessoryIds": c.accessoryIDs.map(id), "battery": c.batteryType,
                "batteryAt": ms(c.batteryReplacedAt), "prewind": c.prewind, "purchasedAt": ms(c.purchasedAt), "price": c.price,
                "seller": c.seller, "createdAt": ms(c.createdAt), "sortOrder": c.sortOrder, "lensesChosen": c.lensesChosen,
                "lensIds": c.linkedLensIDs.map(id),
            ])
        }
        let lenses: [[String: Any]] = all(LensItem.self).map { l in
            if let p = l.photo { photos[id(l.id)] = p.base64EncodedString() }
            return clean([
                "id": id(l.id), "brand": l.brand, "model": l.model, "mount": l.mount, "zoom": l.zoomLens, "focalMin": l.focalMin,
                "focalMax": l.focalMax, "apertureOpen": l.apertureOpen, "apertureClose": l.apertureClose, "hasPhoto": l.photo != nil,
                "purchasedAt": ms(l.purchasedAt), "price": l.price, "seller": l.seller, "tags": l.tags, "createdAt": ms(l.createdAt),
            ])
        }
        let filters: [[String: Any]] = all(FilterItem.self).map { f in
            if let p = f.photo { photos[id(f.id)] = p.base64EncodedString() }
            return clean([
                "id": id(f.id), "kind": f.kind.nilIfBlank, "name": f.name, "diameter": f.diameter.nilIfBlank, "hasPhoto": f.photo != nil,
                "purchasedAt": ms(f.purchasedAt), "price": f.price, "seller": f.seller, "tags": f.tags, "createdAt": ms(f.createdAt),
            ])
        }
        let lots: [[String: Any]] = all(FilmLotItem.self).map { x in clean([
            "id": id(x.id), "filmId": x.filmStockID, "format": x.formatRaw, "count": x.count, "lowAt": x.lowAt, "storage": x.storageRaw,
            "expiresAt": ms(x.expiresAt), "purchasedAt": ms(x.purchasedAt), "price": x.price, "seller": x.seller, "createdAt": ms(x.createdAt),
        ]) }
        let films: [[String: Any]] = all(CustomFilmItem.self).map { x in clean([
            "id": x.id, "name": x.name, "iso": x.iso, "color": x.colorHex, "bw": x.isBlackAndWhite, "createdAt": ms(x.createdAt),
        ]) }
        let rolls: [[String: Any]] = all(RollItem.self).filter { $0.deletedAt == nil }.map { r in clean([
            "id": id(r.id), "cameraId": r.camera.map { id($0.id) }, "cameraBrand": r.recordedCameraBrand.nilIfBlank,
            "cameraModel": r.recordedCameraModel.nilIfBlank, "cameraFormat": r.recordedCameraFormatRaw.nilIfBlank,
            "cameraFixedLens": r.recordedFixedLensName.nilIfBlank, "lensId": r.lens.map { id($0.id) },
            "lensChanges": r.lensChanges.map { ["id": id($0.id), "startFrame": $0.startFrame, "lensId": id($0.lensID)] },
            "meterShots": encodable(r.meterShots), "meterPrewind": r.meterPrewind, "meterOffset": r.meterOffset,
            "filmId": r.filmStockID, "shotISO": r.shotISO, "status": r.statusRaw, "loadedAt": ms(r.loadedAt), "finishedAt": ms(r.finishedAt),
            "days": r.shootingDays.map { clean(["id": id($0.id), "startedAt": ms($0.startedAt), "startFrame": $0.startFrame]) },
            "locations": r.locations.map { l in clean(["id": id(l.id), "startFrame": l.startFrame, "name": l.name,
                                                       "point": l.point.flatMap(encodable), "memo": l.memo, "weather": l.weather.flatMap(encodable)]) },
            "lab": r.labName, "droppedAt": ms(r.droppedOffAt), "scanner": r.scannerName, "importedAt": ms(r.importedAt),
            "frameCount": r.frameCount, "note": r.note, "tags": r.tags, "favorite": r.isFavorite, "isArchive": r.isArchive,
            "coverIndex": r.coverFrameIndex, "scanW": r.scanPixelWidth, "scanH": r.scanPixelHeight, "scanFormat": r.scanFormat,
            "scanBytes": r.scanBytes,
        ]) }
        let projects: [[String: Any]] = all(ProjectItem.self).map { p in clean([
            "id": id(p.id), "name": p.name, "memo": p.memo, "color": p.colorIndex, "archived": p.isArchived,
            "createdAt": ms(p.createdAt), "rollIds": p.rollIDs.map(id),
        ]) }
        let file: [String: Any] = [
            "kind": "filmchest-backup-web", "version": 1, "savedAt": ISO8601DateFormatter().string(from: Date()), "from": "ios",
            "data": ["cameras": cameras, "lenses": lenses, "filters": filters, "filmLots": lots, "customFilms": films, "rolls": rolls, "projects": projects],
            "photos": photos,
        ]
        return try JSONSerialization.data(withJSONObject: file, options: [.sortedKeys])
    }

    /// 같은 id는 파일 내용으로 덮고, 없는 것은 만든다. 지금 있는 것은 지우지 않는다. 스캔 사진은 건드리지 않는다.
    @MainActor
    static func merge(_ data: Data, into context: ModelContext) throws -> (cameras: Int, rolls: Int) {
        guard let file = try JSONSerialization.jsonObject(with: data) as? [String: Any],
              file["kind"] as? String == "filmchest-backup-web",
              let d = file["data"] as? [String: Any] else { throw DriveError.message("백업 파일 형식이 달라요") }
        let photos = file["photos"] as? [String: String] ?? [:]
        func rows(_ k: String) -> [[String: Any]] { d[k] as? [[String: Any]] ?? [] }
        func all<T: PersistentModel>(_ t: T.Type) -> [T] { (try? context.fetch(FetchDescriptor<T>())) ?? [] }
        func str(_ r: [String: Any], _ k: String) -> String? { r[k] as? String }
        func int(_ r: [String: Any], _ k: String) -> Int? { (r[k] as? NSNumber)?.intValue }
        func photo(_ key: String) -> Data? { photos[key].flatMap { Data(base64Encoded: $0) } }

        let cams = all(CameraItem.self)
        for r in rows("cameras") {
            guard let uid = uuid(r["id"]) else { continue }
            let c = cams.first { $0.id == uid } ?? { let x = CameraItem(brand: "", model: ""); x.id = uid; context.insert(x); return x }()
            c.brand = str(r, "brand") ?? ""; c.model = str(r, "model") ?? ""; c.nickname = str(r, "nickname")
            c.formatRaw = str(r, "format") ?? c.formatRaw; c.mount = str(r, "mount"); c.fixedLensName = str(r, "fixedLens")
            c.bodyStyleRaw = str(r, "style") ?? c.bodyStyleRaw; c.bodyStyleManual = r["styleManual"] as? Bool ?? false
            c.modelColorHex = str(r, "color") ?? c.modelColorHex
            if let p = photo(r["id"] as? String ?? "") { c.photo = p }
            c.photoScale = r["photoScale"] as? Double ?? 1; c.photoOffsetX = r["photoOffsetX"] as? Double ?? 0; c.photoOffsetY = r["photoOffsetY"] as? Double ?? 0
            c.tags = r["tags"] as? [String] ?? []; c.accessoryIDs = (r["accessoryIds"] as? [String] ?? []).compactMap(uuid)
            c.batteryType = str(r, "battery"); c.batteryReplacedAt = date(r["batteryAt"]); c.prewind = r["prewind"] as? Bool
            c.purchasedAt = date(r["purchasedAt"]); c.price = str(r, "price"); c.seller = str(r, "seller")
            c.createdAt = date(r["createdAt"]) ?? c.createdAt; c.sortOrder = int(r, "sortOrder") ?? c.sortOrder
            c.lensesChosen = r["lensesChosen"] as? Bool ?? false; c.linkedLensIDs = (r["lensIds"] as? [String] ?? []).compactMap(uuid)
            c.deletedAt = nil
        }
        let lenses = all(LensItem.self)
        for r in rows("lenses") {
            guard let uid = uuid(r["id"]) else { continue }
            let l = lenses.first { $0.id == uid } ?? { let x = LensItem(brand: "", model: "", mount: ""); x.id = uid; context.insert(x); return x }()
            l.brand = str(r, "brand") ?? ""; l.model = str(r, "model") ?? ""; l.mount = str(r, "mount") ?? ""
            l.zoomLens = r["zoom"] as? Bool ?? false; l.focalMin = int(r, "focalMin") ?? 0; l.focalMax = int(r, "focalMax") ?? 0
            l.apertureOpen = str(r, "apertureOpen") ?? ""; l.apertureClose = str(r, "apertureClose") ?? ""
            if let p = photo(r["id"] as? String ?? "") { l.photo = p }
            l.purchasedAt = date(r["purchasedAt"]); l.price = str(r, "price"); l.seller = str(r, "seller")
            l.tags = r["tags"] as? [String] ?? []; l.createdAt = date(r["createdAt"]) ?? l.createdAt
        }
        let filters = all(FilterItem.self)
        for r in rows("filters") {
            guard let uid = uuid(r["id"]) else { continue }
            let f = filters.first { $0.id == uid } ?? { let x = FilterItem(name: ""); x.id = uid; context.insert(x); return x }()
            f.kind = str(r, "kind") ?? ""; f.name = str(r, "name") ?? ""; f.diameter = str(r, "diameter") ?? ""
            if let p = photo(r["id"] as? String ?? "") { f.photo = p }
            f.purchasedAt = date(r["purchasedAt"]); f.price = str(r, "price"); f.seller = str(r, "seller")
            f.tags = r["tags"] as? [String] ?? []; f.createdAt = date(r["createdAt"]) ?? f.createdAt
        }
        let lots = all(FilmLotItem.self)
        for r in rows("filmLots") {
            guard let uid = uuid(r["id"]) else { continue }
            let x = lots.first { $0.id == uid } ?? { let n = FilmLotItem(filmStockID: ""); n.id = uid; context.insert(n); return n }()
            x.filmStockID = str(r, "filmId") ?? ""; x.formatRaw = str(r, "format") ?? x.formatRaw; x.count = int(r, "count") ?? 0
            x.lowAt = int(r, "lowAt") ?? 1; x.storageRaw = str(r, "storage") ?? x.storageRaw; x.expiresAt = date(r["expiresAt"])
            x.purchasedAt = date(r["purchasedAt"]); x.price = str(r, "price"); x.seller = str(r, "seller")
            x.createdAt = date(r["createdAt"]) ?? x.createdAt
        }
        let films = all(CustomFilmItem.self)
        for r in rows("customFilms") {
            guard let fid = str(r, "id") else { continue }
            let x = films.first { $0.id == fid } ?? { let n = CustomFilmItem(name: "", iso: 400, colorHex: "#FDB913", isBlackAndWhite: false); n.id = fid; context.insert(n); return n }()
            x.name = str(r, "name") ?? ""; x.iso = int(r, "iso") ?? 400; x.colorHex = str(r, "color") ?? x.colorHex
            x.isBlackAndWhite = r["bw"] as? Bool ?? false; x.createdAt = date(r["createdAt"]) ?? x.createdAt
        }
        let camsNow = all(CameraItem.self), lensesNow = all(LensItem.self), rolls = all(RollItem.self)
        for r in rows("rolls") {
            guard let uid = uuid(r["id"]) else { continue }
            let cam = uuid(r["cameraId"]).flatMap { cid in camsNow.first { $0.id == cid } }
            let lens = uuid(r["lensId"]).flatMap { lid in lensesNow.first { $0.id == lid } }
            let x = rolls.first { $0.id == uid } ?? { let n = RollItem(camera: cam, lens: lens, filmStockID: ""); n.id = uid; context.insert(n); return n }()
            x.camera = cam; x.lens = lens
            x.recordedCameraBrand = str(r, "cameraBrand") ?? x.recordedCameraBrand
            x.recordedCameraModel = str(r, "cameraModel") ?? x.recordedCameraModel
            x.recordedCameraFormatRaw = str(r, "cameraFormat") ?? x.recordedCameraFormatRaw
            x.recordedFixedLensName = str(r, "cameraFixedLens") ?? x.recordedFixedLensName
            x.lensChanges = (r["lensChanges"] as? [[String: Any]] ?? []).compactMap { c in
                guard let lid = uuid(c["lensId"]), let start = (c["startFrame"] as? NSNumber)?.intValue else { return nil }
                return LensChange(id: uuid(c["id"]) ?? UUID(), startFrame: start, lensID: lid)
            }
            x.meterShots = decodable([MeterShot].self, r["meterShots"]) ?? x.meterShots
            x.meterPrewind = r["meterPrewind"] as? Bool; x.meterOffset = int(r, "meterOffset") ?? 0
            x.filmStockID = str(r, "filmId") ?? ""; x.shotISO = int(r, "shotISO"); x.statusRaw = str(r, "status") ?? x.statusRaw
            x.loadedAt = date(r["loadedAt"]) ?? x.loadedAt; x.finishedAt = date(r["finishedAt"])
            x.shootingDays = (r["days"] as? [[String: Any]] ?? []).compactMap { s in
                guard let at = date(s["startedAt"]) else { return nil }
                return ShootingDay(id: uuid(s["id"]) ?? UUID(), startedAt: at, startFrame: (s["startFrame"] as? NSNumber)?.intValue)
            }
            x.locations = (r["locations"] as? [[String: Any]] ?? []).compactMap { l in
                guard let name = l["name"] as? String, let start = (l["startFrame"] as? NSNumber)?.intValue else { return nil }
                return LocationSegment(id: uuid(l["id"]) ?? UUID(), startFrame: start, name: name,
                                       point: decodable(GeoPoint.self, l["point"]), memo: l["memo"] as? String,
                                       weather: decodable(WeatherNote.self, l["weather"]))
            }
            x.labName = str(r, "lab"); x.droppedOffAt = date(r["droppedAt"]); x.scannerName = str(r, "scanner")
            x.importedAt = date(r["importedAt"]); x.frameCount = int(r, "frameCount") ?? x.frameCount; x.note = str(r, "note")
            x.tags = r["tags"] as? [String] ?? []; x.isFavorite = r["favorite"] as? Bool ?? false; x.isArchive = r["isArchive"] as? Bool ?? false
            x.coverFrameIndex = int(r, "coverIndex"); x.scanPixelWidth = int(r, "scanW") ?? x.scanPixelWidth
            x.scanPixelHeight = int(r, "scanH") ?? x.scanPixelHeight; x.scanFormat = str(r, "scanFormat") ?? x.scanFormat
            if let b = (r["scanBytes"] as? NSNumber)?.int64Value { x.scanBytes = b }
            x.deletedAt = nil
        }
        let projects = all(ProjectItem.self)
        for r in rows("projects") {
            guard let uid = uuid(r["id"]) else { continue }
            let p = projects.first { $0.id == uid } ?? { let n = ProjectItem(name: ""); n.id = uid; context.insert(n); return n }()
            p.name = str(r, "name") ?? ""; p.memo = str(r, "memo"); p.colorIndex = int(r, "color") ?? 0
            p.isArchived = r["archived"] as? Bool ?? false; p.createdAt = date(r["createdAt"]) ?? p.createdAt
            p.rollIDs = (r["rollIds"] as? [String] ?? []).compactMap(uuid)
        }
        try context.save()
        return (rows("cameras").count, rows("rolls").count)
    }
}

// MARK: - 자동 맞추기

enum DriveSync {
    static let fileName = DataBackup.fileName
    private static let fileKey = "filmscan.driveFileId"
    private static let pushedKey = "filmscan.drivePushedKey"
    private static let pulledKey = "filmscan.drivePulledAt"
    static var lastSync: Date? { UserDefaults.standard.object(forKey: "filmscan.driveLast") as? Date }

    private static func fileID(create: Bool) async throws -> String? {
        if let id = UserDefaults.standard.string(forKey: fileKey) { return id }
        let root = try await DriveClient.rootFolder()
        var id = try await DriveClient.find(fileName, parent: root, folder: false)
        if id == nil, create { id = try await DriveClient.createFile(fileName, parent: root, mime: "application/json") }
        if let id { UserDefaults.standard.set(id, forKey: fileKey) }
        return id
    }

    private static func contentKey(_ data: Data) -> String {
        let text = String(decoding: data, as: UTF8.self).replacingOccurrences(of: #""savedAt":"[^"]*",?"#, with: "", options: .regularExpression)
        return SHA256.hash(data: Data(text.utf8)).map { String(format: "%02x", $0) }.joined()
    }

    /// 올리기: force가 아니면 지난번과 같을 때 건너뛴다
    @MainActor
    static func push(_ context: ModelContext, force: Bool = false) async throws {
        let data = try WebFormat.export(from: context)
        let key = contentKey(data)
        if !force, key == UserDefaults.standard.string(forKey: pushedKey) { return }
        guard var id = try await fileID(create: true) else { return }
        do {
            try await DriveClient.upload(id, data, mime: "application/json")
        } catch {
            // 드라이브에서 지운 경우 새로 만든다
            UserDefaults.standard.removeObject(forKey: fileKey)
            guard let fresh = try await fileID(create: true) else { throw error }
            id = fresh
            try await DriveClient.upload(id, data, mime: "application/json")
        }
        UserDefaults.standard.set(key, forKey: pushedKey)
        UserDefaults.standard.set(Date(), forKey: "filmscan.driveLast")
        UserDefaults.standard.set(Date(), forKey: pulledKey)   // 방금 올린 것은 다시 받지 않는다
    }

    /// 받아서 합치기: 드라이브 파일이 마지막으로 맞춘 뒤 바뀌었으면 (다른 기기에서 고쳤으면)
    @MainActor
    @discardableResult
    static func pull(_ context: ModelContext, force: Bool = false) async throws -> (cameras: Int, rolls: Int)? {
        guard let id = try await fileID(create: false) else { return nil }
        let data = try await DriveClient.download(id)
        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return nil }
        let saved = (json["savedAt"] as? String).flatMap { ISO8601DateFormatter().date(from: $0) } ?? .distantPast
        let pulled = UserDefaults.standard.object(forKey: pulledKey) as? Date ?? .distantPast
        if !force, saved <= pulled { return nil }
        let counts = try WebFormat.merge(data, into: context)
        UserDefaults.standard.set(saved, forKey: pulledKey)
        UserDefaults.standard.set(contentKey(try WebFormat.export(from: context)), forKey: pushedKey)
        return counts
    }

    /// 앱이 앞으로 올 때 / 뒤로 갈 때 (연결돼 있을 때만, 실패는 조용히)
    @MainActor
    static func onActive(_ context: ModelContext) {
        guard GoogleAuth.isConnected else { return }
        Task { _ = try? await pull(context) }
    }

    @MainActor
    static func onBackground(_ context: ModelContext) {
        guard GoogleAuth.isConnected else { return }
        Task { try? await push(context) }
    }
}
