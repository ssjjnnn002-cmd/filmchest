import Foundation
import SwiftData
import AuthenticationServices
import CryptoKit
import Photos
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

    /// 그 id의 파일·폴더가 드라이브에 아직 있는지 (휴지통에 있으면 없음). 인터넷이 안 되면 오류
    static func exists(_ id: String) async throws -> Bool {
        var req = URLRequest(url: URL(string: "\(api)/\(id)?fields=id,trashed")!)
        req.setValue("Bearer \(try await GoogleAuth.token())", forHTTPHeaderField: "Authorization")
        let (data, res) = try await URLSession.shared.data(for: req)
        let status = (res as? HTTPURLResponse)?.statusCode ?? 0
        if status == 404 { return false }
        guard (200..<300).contains(status) else { throw DriveError.message("드라이브 요청 실패 (\(status))") }
        return ((try? JSONSerialization.jsonObject(with: data) as? [String: Any])?["trashed"] as? Bool) != true
    }

    /// 폴더 안 항목 전부 (id, 이름, 종류)
    static func children(_ parent: String) async throws -> [(id: String, name: String, mime: String, size: Int)] {
        let query = "'\(parent)' in parents and trashed = false".addingPercentEncoding(withAllowedCharacters: .alphanumerics)!
        var out: [(id: String, name: String, mime: String, size: Int)] = []
        var page: String?
        repeat {
            let token = page.map { "&pageToken=\($0)" } ?? ""
            let data = try await call("\(api)?q=\(query)&fields=nextPageToken,files(id,name,mimeType,size)&pageSize=1000\(token)")
            let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
            for f in (json?["files"] as? [[String: Any]]) ?? [] {
                if let id = f["id"] as? String {
                    out.append((id, f["name"] as? String ?? "", f["mimeType"] as? String ?? "", Int(f["size"] as? String ?? "") ?? 0))
                }
            }
            page = json?["nextPageToken"] as? String
        } while page != nil
        return out
    }

    /// 폴더 찾기, 없으면 만들기
    static func folder(_ name: String, parent: String) async throws -> String {
        if let id = try await find(name, parent: parent, folder: true) { return id }
        let d = try await call(api, method: "POST", json: ["name": name, "mimeType": folderMime, "parents": [parent]])
        guard let id = (try JSONSerialization.jsonObject(with: d) as? [String: Any])?["id"] as? String else {
            throw DriveError.message("드라이브에 폴더를 만들지 못했어요")
        }
        return id
    }

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
        // 휴지통 줄도 함께 보낸다 (다른 기기에서도 휴지통에 들어가게). 고친 시각도 함께
        let cameras: [[String: Any]] = all(CameraItem.self).map { c in
            if c.deletedAt == nil, let p = c.photo { photos[id(c.id)] = p.base64EncodedString() }
            return clean([
                "id": id(c.id), "brand": c.brand, "model": c.model, "nickname": c.nickname, "format": c.formatRaw,
                "mount": c.mount, "fixedLens": c.fixedLensName, "style": c.bodyStyleRaw, "styleManual": c.bodyStyleManual,
                "color": c.modelColorHex, "hasPhoto": c.photo != nil, "photoScale": c.photoScale, "photoOffsetX": c.photoOffsetX,
                "photoOffsetY": c.photoOffsetY, "tags": c.tags, "accessoryIds": c.accessoryIDs.map(id), "battery": c.batteryType,
                "batteryAt": ms(c.batteryReplacedAt), "prewind": c.prewind, "purchasedAt": ms(c.purchasedAt), "price": c.price,
                "seller": c.seller, "createdAt": ms(c.createdAt), "sortOrder": c.sortOrder, "lensesChosen": c.lensesChosen,
                "lensIds": c.linkedLensIDs.map(id), "deletedAt": ms(c.deletedAt), "updatedAt": ms(c.updatedAt),
            ])
        }
        let lenses: [[String: Any]] = all(LensItem.self).map { l in
            if let p = l.photo { photos[id(l.id)] = p.base64EncodedString() }
            return clean([
                "id": id(l.id), "brand": l.brand, "model": l.model, "mount": l.mount, "zoom": l.zoomLens, "focalMin": l.focalMin,
                "focalMax": l.focalMax, "apertureOpen": l.apertureOpen, "apertureClose": l.apertureClose, "hasPhoto": l.photo != nil,
                "purchasedAt": ms(l.purchasedAt), "price": l.price, "seller": l.seller, "tags": l.tags, "createdAt": ms(l.createdAt), "updatedAt": ms(l.updatedAt),
            ])
        }
        let filters: [[String: Any]] = all(FilterItem.self).map { f in
            if let p = f.photo { photos[id(f.id)] = p.base64EncodedString() }
            return clean([
                "id": id(f.id), "kind": f.kind.nilIfBlank, "name": f.name, "diameter": f.diameter.nilIfBlank, "glass": f.glass, "hasPhoto": f.photo != nil,
                "purchasedAt": ms(f.purchasedAt), "price": f.price, "seller": f.seller, "tags": f.tags, "createdAt": ms(f.createdAt), "updatedAt": ms(f.updatedAt),
            ])
        }
        let lots: [[String: Any]] = all(FilmLotItem.self).map { x in clean([
            "id": id(x.id), "filmId": x.filmStockID, "format": x.formatRaw, "count": x.count, "lowAt": x.lowAt, "storage": x.storageRaw,
            "expiresAt": ms(x.expiresAt), "purchasedAt": ms(x.purchasedAt), "price": x.price, "seller": x.seller, "createdAt": ms(x.createdAt), "updatedAt": ms(x.updatedAt),
        ]) }
        let films: [[String: Any]] = all(CustomFilmItem.self).map { x in clean([
            "id": x.id, "name": x.name, "iso": x.iso, "color": x.colorHex, "bw": x.isBlackAndWhite, "createdAt": ms(x.createdAt), "updatedAt": ms(x.updatedAt),
        ]) }
        let rolls: [[String: Any]] = all(RollItem.self).map { r in clean([
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
            "frameCount": r.frameCount, "note": r.note, "title": r.customTitle, "noteInList": r.noteInList ? true : nil, "tags": r.tags, "favorite": r.isFavorite, "isArchive": r.isArchive,
            "coverIndex": r.coverFrameIndex, "scanW": r.scanPixelWidth, "scanH": r.scanPixelHeight, "scanFormat": r.scanFormat,
            "scanBytes": r.scanBytes, "deletedAt": ms(r.deletedAt), "updatedAt": ms(r.updatedAt),
        ]) }
        let projects: [[String: Any]] = all(ProjectItem.self).map { p in clean([
            "id": id(p.id), "name": p.name, "memo": p.memo, "color": p.colorIndex, "archived": p.isArchived,
            "createdAt": ms(p.createdAt), "rollIds": p.rollIDs.map(id), "updatedAt": ms(p.updatedAt),
        ]) }
        let file: [String: Any] = [
            "kind": "filmchest-backup-web", "version": 2, "savedAt": ISO8601DateFormatter().string(from: Date()), "from": "ios",
            "data": ["cameras": cameras, "lenses": lenses, "filters": filters, "filmLots": lots, "customFilms": films, "rolls": rolls, "projects": projects],
            "photos": photos, "deleted": SyncStamp.pruned(SyncStamp.tombs),
        ]
        return try JSONSerialization.data(withJSONObject: file, options: [.sortedKeys])
    }

    /// 받은 기록을 합친다 (웹·갤럭시 core/syncMerge와 같은 규칙): 더 최근에 고친 줄만 덮고, 없는 것은 만든다.
    /// sync(드라이브 맞추기)면 다른 기기의 지움 표시도 따라 지운다. 스캔 사진은 건드리지 않는다.
    @MainActor
    static func merge(_ data: Data, into context: ModelContext, sync: Bool = false) throws -> (cameras: Int, rolls: Int) {
        guard let file = try JSONSerialization.jsonObject(with: data) as? [String: Any],
              file["kind"] as? String == "filmchest-backup-web",
              let d = file["data"] as? [String: Any] else { throw DriveError.message("백업 파일 형식이 달라요") }
        let photos = file["photos"] as? [String: String] ?? [:]
        func rows(_ k: String) -> [[String: Any]] { d[k] as? [[String: Any]] ?? [] }
        func all<T: PersistentModel>(_ t: T.Type) -> [T] { (try? context.fetch(FetchDescriptor<T>())) ?? [] }
        func str(_ r: [String: Any], _ k: String) -> String? { r[k] as? String }
        func int(_ r: [String: Any], _ k: String) -> Int? { (r[k] as? NSNumber)?.intValue }
        func photo(_ key: String) -> Data? { photos[key].flatMap { Data(base64Encoded: $0) } }
        SyncStamp.applyingRemote += 1
        defer { SyncStamp.applyingRemote -= 1 }
        var remoteTombs: SyncStamp.Tombs = [:]
        for (table, ids) in file["deleted"] as? [String: [String: Any]] ?? [:] {
            for (rid, at) in ids { remoteTombs[table, default: [:]][rid] = (at as? NSNumber)?.doubleValue ?? 0 }
        }
        let tombs = sync ? SyncStamp.merged(SyncStamp.tombs, remoteTombs) : [:]
        func rt(_ r: [String: Any]) -> Double { (r["updatedAt"] as? NSNumber)?.doubleValue ?? 0 }
        func updatedOf(_ m: (any PersistentModel)?) -> Date? {
            switch m {
            case let x as CameraItem: x.updatedAt
            case let x as LensItem: x.updatedAt
            case let x as FilterItem: x.updatedAt
            case let x as FilmLotItem: x.updatedAt
            case let x as CustomFilmItem: x.updatedAt
            case let x as RollItem: x.updatedAt
            case let x as ProjectItem: x.updatedAt
            default: nil
            }
        }
        /// 이 줄을 받아 쓸지: 지움 표시에 걸리지 않고, 이 기기 줄보다 최근이거나 같을 때
        func take(_ table: String, _ rid: String, _ r: [String: Any], _ local: (any PersistentModel)?) -> Bool {
            if SyncStamp.kills(tombs, table, rid, updatedAt: rt(r)) { return false }
            guard let local else { return true }
            return SyncStamp.remoteWins(local: updatedOf(local).map(SyncStamp.ms) ?? 0, remote: rt(r))
        }

        let cams = all(CameraItem.self)
        for r in rows("cameras") {
            guard let uid = uuid(r["id"]), take("cameras", uid.uuidString, r, cams.first { $0.id == uid }) else { continue }
            let c = cams.first { $0.id == uid } ?? { let x = CameraItem(brand: "", model: ""); x.id = uid; context.insert(x); return x }()
            c.updatedAt = date(r["updatedAt"])
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
            c.deletedAt = date(r["deletedAt"])
        }
        let lenses = all(LensItem.self)
        for r in rows("lenses") {
            guard let uid = uuid(r["id"]), take("lenses", uid.uuidString, r, lenses.first { $0.id == uid }) else { continue }
            let l = lenses.first { $0.id == uid } ?? { let x = LensItem(brand: "", model: "", mount: ""); x.id = uid; context.insert(x); return x }()
            l.updatedAt = date(r["updatedAt"])
            l.brand = str(r, "brand") ?? ""; l.model = str(r, "model") ?? ""; l.mount = str(r, "mount") ?? ""
            l.zoomLens = r["zoom"] as? Bool ?? false; l.focalMin = int(r, "focalMin") ?? 0; l.focalMax = int(r, "focalMax") ?? 0
            l.apertureOpen = str(r, "apertureOpen") ?? ""; l.apertureClose = str(r, "apertureClose") ?? ""
            if let p = photo(r["id"] as? String ?? "") { l.photo = p }
            l.purchasedAt = date(r["purchasedAt"]); l.price = str(r, "price"); l.seller = str(r, "seller")
            l.tags = r["tags"] as? [String] ?? []; l.createdAt = date(r["createdAt"]) ?? l.createdAt
        }
        let filters = all(FilterItem.self)
        for r in rows("filters") {
            guard let uid = uuid(r["id"]), take("filters", uid.uuidString, r, filters.first { $0.id == uid }) else { continue }
            let f = filters.first { $0.id == uid } ?? { let x = FilterItem(name: ""); x.id = uid; context.insert(x); return x }()
            f.updatedAt = date(r["updatedAt"])
            f.kind = str(r, "kind") ?? ""; f.name = str(r, "name") ?? ""; f.diameter = str(r, "diameter") ?? ""; f.glass = str(r, "glass")
            if let p = photo(r["id"] as? String ?? "") { f.photo = p }
            f.purchasedAt = date(r["purchasedAt"]); f.price = str(r, "price"); f.seller = str(r, "seller")
            f.tags = r["tags"] as? [String] ?? []; f.createdAt = date(r["createdAt"]) ?? f.createdAt
        }
        let lots = all(FilmLotItem.self)
        for r in rows("filmLots") {
            guard let uid = uuid(r["id"]), take("filmLots", uid.uuidString, r, lots.first { $0.id == uid }) else { continue }
            let x = lots.first { $0.id == uid } ?? { let n = FilmLotItem(filmStockID: ""); n.id = uid; context.insert(n); return n }()
            x.updatedAt = date(r["updatedAt"])
            x.filmStockID = str(r, "filmId") ?? ""; x.formatRaw = str(r, "format") ?? x.formatRaw; x.count = int(r, "count") ?? 0
            x.lowAt = int(r, "lowAt") ?? 1; x.storageRaw = str(r, "storage") ?? x.storageRaw; x.expiresAt = date(r["expiresAt"])
            x.purchasedAt = date(r["purchasedAt"]); x.price = str(r, "price"); x.seller = str(r, "seller")
            x.createdAt = date(r["createdAt"]) ?? x.createdAt
        }
        let films = all(CustomFilmItem.self)
        for r in rows("customFilms") {
            guard let fid = str(r, "id"), take("customFilms", fid, r, films.first { $0.id == fid }) else { continue }
            let x = films.first { $0.id == fid } ?? { let n = CustomFilmItem(name: "", iso: 400, colorHex: "#FDB913", isBlackAndWhite: false); n.id = fid; context.insert(n); return n }()
            x.updatedAt = date(r["updatedAt"])
            x.name = str(r, "name") ?? ""; x.iso = int(r, "iso") ?? 400; x.colorHex = str(r, "color") ?? x.colorHex
            x.isBlackAndWhite = r["bw"] as? Bool ?? false; x.createdAt = date(r["createdAt"]) ?? x.createdAt
        }
        let camsNow = all(CameraItem.self), lensesNow = all(LensItem.self), rolls = all(RollItem.self)
        for r in rows("rolls") {
            guard let uid = uuid(r["id"]), take("rolls", uid.uuidString, r, rolls.first { $0.id == uid }) else { continue }
            let cam = uuid(r["cameraId"]).flatMap { cid in camsNow.first { $0.id == cid } }
            let lens = uuid(r["lensId"]).flatMap { lid in lensesNow.first { $0.id == lid } }
            let x = rolls.first { $0.id == uid } ?? { let n = RollItem(camera: cam, lens: lens, filmStockID: ""); n.id = uid; context.insert(n); return n }()
            x.camera = cam; x.lens = lens
            x.updatedAt = date(r["updatedAt"])
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
            x.importedAt = date(r["importedAt"]); x.frameCount = int(r, "frameCount") ?? x.frameCount; x.note = str(r, "note"); x.customTitle = str(r, "title"); x.noteInList = r["noteInList"] as? Bool ?? false
            x.tags = r["tags"] as? [String] ?? []; x.isFavorite = r["favorite"] as? Bool ?? false; x.isArchive = r["isArchive"] as? Bool ?? false
            x.coverFrameIndex = int(r, "coverIndex"); x.scanPixelWidth = int(r, "scanW") ?? x.scanPixelWidth
            x.scanPixelHeight = int(r, "scanH") ?? x.scanPixelHeight; x.scanFormat = str(r, "scanFormat") ?? x.scanFormat
            if let b = (r["scanBytes"] as? NSNumber)?.int64Value { x.scanBytes = b }
            x.deletedAt = date(r["deletedAt"])
        }
        let projects = all(ProjectItem.self)
        for r in rows("projects") {
            guard let uid = uuid(r["id"]), take("projects", uid.uuidString, r, projects.first { $0.id == uid }) else { continue }
            let p = projects.first { $0.id == uid } ?? { let n = ProjectItem(name: ""); n.id = uid; context.insert(n); return n }()
            p.updatedAt = date(r["updatedAt"])
            p.name = str(r, "name") ?? ""; p.memo = str(r, "memo"); p.colorIndex = int(r, "color") ?? 0
            p.isArchived = r["archived"] as? Bool ?? false; p.createdAt = date(r["createdAt"]) ?? p.createdAt
            p.rollIDs = (r["rollIds"] as? [String] ?? []).compactMap(uuid)
        }
        if sync {
            // 다른 기기에서 지운 것: 지운 뒤로 이 기기에서 고치지 않았으면 여기서도 지운다
            func sweep<T: PersistentModel>(_ t: T.Type) {
                for m in all(t) {
                    guard let k = SyncStamp.key(m) else { continue }
                    if SyncStamp.kills(tombs, k.table, k.id, updatedAt: updatedOf(m).map(SyncStamp.ms) ?? 0) { context.delete(m) }
                }
            }
            sweep(RollItem.self); sweep(CameraItem.self); sweep(LensItem.self); sweep(FilterItem.self)
            sweep(FilmLotItem.self); sweep(CustomFilmItem.self); sweep(ProjectItem.self)
            SyncStamp.tombs = SyncStamp.pruned(tombs)
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
        // 다른 기기에서 고친 것을 먼저 받아 합친다 (안 받고 올리면 그 기기의 수정을 덮어쓴다)
        _ = try? await pull(context)
        let data = try WebFormat.export(from: context)
        let key = contentKey(data)
        if !force, key == UserDefaults.standard.string(forKey: pushedKey) {
            UserDefaults.standard.set(Date(), forKey: "filmscan.driveLast")   // 확인했고 같음
            return
        }
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
        let counts = try WebFormat.merge(data, into: context, sync: true)
        UserDefaults.standard.set(saved, forKey: pulledKey)
        UserDefaults.standard.set(contentKey(try WebFormat.export(from: context)), forKey: pushedKey)
        return counts
    }

    static func forget() {
        for k in [fileKey, pushedKey, pulledKey, "filmscan.driveLast", "filmscan.driveRoot"] { UserDefaults.standard.removeObject(forKey: k) }
    }

    // ───── 로그아웃: 기록은 기기에 남기고 시작 화면만 (웹·갤럭시와 같음)

    static let keptKey = "filmscan.keptAccount"
    /// 로그아웃한 뒤에도 이 기기에 남겨 둔 기록의 계정 (같은 계정으로 다시 들어오면 그대로 이어진다)
    static var keptAccount: String? { UserDefaults.standard.string(forKey: keptKey) }
    static let signedOut = Notification.Name("filmscan.signedOut")

    /// 로그아웃: 기록만 짧게 올리고(못 올려도 기기에 남아 있으니 괜찮다) 연결을 끊는다.
    /// 드라이브 파일·올린 사진 표시는 남겨서, 같은 계정으로 다시 들어오면 바뀐 것만 맞춘다
    @MainActor
    static func signOutKeep(_ context: ModelContext) async {
        let upload = Task { @MainActor in try? await push(context, force: true) }
        let timeout = Task { try? await Task.sleep(for: .seconds(8)); upload.cancel() }
        _ = await upload.value
        timeout.cancel()
        UserDefaults.standard.set(GoogleAuth.account ?? "이전 계정", forKey: keptKey)
        GoogleAuth.signOut()
        NotificationCenter.default.post(name: signedOut, object: nil)
    }

    /// 다른 계정으로 바꿀 때: 남은 기록만 지운다 (방금 로그인한 계정은 그대로)
    @MainActor
    static func wipeForNewAccount(_ context: ModelContext) throws {
        try wipeData(context)
        UserDefaults.standard.removeObject(forKey: keptKey)
    }

    /// 이 기기의 기록을 모두 지운다 (모든 기록 지우기, 남은 기록 지우고 로그인 없이 쓰기). 웹·갤럭시 wipeLocal과 같음.
    /// 먼저 연결을 끊는다: 지운 빈 기록이 드라이브·파일 앱 폴더 백업을 덮어쓰지 않게. 사진 앱의 사진은 그대로
    @MainActor
    static func wipeDevice(_ context: ModelContext) throws {
        GoogleAuth.signOut()
        UserDefaults.standard.removeObject(forKey: keptKey)
        try wipeData(context)
    }

    @MainActor
    private static func wipeData(_ context: ModelContext) throws {
        SyncStamp.applyingRemote += 1
        defer { SyncStamp.applyingRemote -= 1; SyncStamp.tombs = [:] }
        DrivePhotos.forget()
        forget()
        AutoBackup.clearFolder()
        try context.delete(model: FrameItem.self)
        try context.delete(model: RollItem.self)
        try context.delete(model: ProjectItem.self)
        try context.delete(model: LensItem.self)
        try context.delete(model: FilterItem.self)
        try context.delete(model: FilmLotItem.self)
        try context.delete(model: CustomFilmItem.self)
        try context.delete(model: CameraItem.self)
        try context.save()
    }

    /// 앱이 앞으로 올 때 / 뒤로 갈 때 (연결돼 있을 때만, 실패는 조용히)
    @MainActor
    static func onActive(_ context: ModelContext) {
        guard GoogleAuth.isConnected else { return }
        Task {
            _ = try? await pull(context)
            await DrivePhotos.pull(context)
        }
    }

    @MainActor
    static func onBackground(_ context: ModelContext) {
        guard GoogleAuth.isConnected else { return }
        Task { try? await push(context) }
    }
}

// MARK: - 스캔 사진도 드라이브로 (웹·갤럭시와 같은 자리: 필름함/날짜 롤 이름/01.jpg)

enum DrivePhotos {
    private static let sentKey = "filmscan.driveFrames"        // "롤id-컷": "파일id|사진 앱 수정 시각"
    private static let folderKey = "filmscan.driveRollFolders"  // 롤id: 폴더id
    private static let pulledKey = "filmscan.drivePulledPhotos" // 이미 받은 드라이브 파일 id
    private static let countKey = "filmscan.drivePhotoCount"    // [드라이브에 있는 장 수, 전체]
    private static let missingKey = "filmscan.drivePhotoMissing" // 못 올린 이유별 장 수
    private static let failedKey = "filmscan.driveUploadFailed"  // [실패 장 수, 마지막 응답 코드]
    @MainActor private static var running = false
    @MainActor private static var pulling = false
    /// 마지막 확인에서 iOS에 맡긴(올라가는 중인) 장 수
    @MainActor static var lastQueued = 0

    /// 드라이브에 없는 사진이 왜 빠졌는지 (화면에 보여 줄 줄들)
    @MainActor
    static var missingReasons: [String] {
        var out: [String] = []
        let m = UserDefaults.standard.dictionary(forKey: missingKey) ?? [:]
        if let n = m["gone"] as? Int, n > 0 {
            let rolls = (m["rolls"] as? [String] ?? []).joined(separator: ", ")
            out.append("사진 앱에서 지워진 사진 \(n)장" + (rolls.isEmpty ? "" : " (\(rolls))"))
        }
        if let n = m["unreadable"] as? Int, n > 0 { out.append("사진 앱에서 꺼내지 못한 사진 \(n)장 (iCloud에서 받지 못함)") }
        if let f = UserDefaults.standard.array(forKey: failedKey) as? [Int], f.count == 2, f[0] > 0 {
            out.append("올리기 실패 \(f[0])장" + (f[1] > 0 ? " (응답 \(f[1]))" : " (인터넷 끊김)"))
        }
        return out
    }

    @MainActor
    static func uploadFailed(_ status: Int) {
        let f = UserDefaults.standard.array(forKey: failedKey) as? [Int] ?? [0, 0]
        UserDefaults.standard.set([(f.first ?? 0) + 1, status], forKey: failedKey)
    }

    /// iOS가 사진 하나를 다 올렸을 때
    @MainActor
    static func uploaded(_ key: String, _ value: String) {
        remember(key, value)
        if let c = counts, c.onDrive < c.total { UserDefaults.standard.set([c.onDrive + 1, c.total], forKey: countKey) }
    }

    /// 올린 컷 기억하기 (백그라운드 업로드가 끝날 때도 부른다: 늘 지금 값을 읽고 그 한 칸만 바꾼다)
    @MainActor
    static func remember(_ key: String, _ value: String?) {
        var sent = UserDefaults.standard.dictionary(forKey: sentKey) as? [String: String] ?? [:]
        sent[key] = value
        UserDefaults.standard.set(sent, forKey: sentKey)
    }

    /// 다른 기기(웹·갤럭시)가 드라이브에 올린 스캔 사진을 받아 사진 앱에 저장하고 롤에 붙인다.
    /// 이 기기가 올린 폴더와 이미 받은 파일은 건너뛰고, 사진이 비어 있는 롤이 있을 때만 찾아본다.
    @MainActor
    static func pull(_ context: ModelContext) async {
        guard GoogleAuth.isConnected, !pulling else { return }
        pulling = true
        defer { pulling = false }
        let rolls = ((try? context.fetch(FetchDescriptor<RollItem>())) ?? []).filter { $0.deletedAt == nil && $0.status == .imported }
        guard rolls.contains(where: { ($0.frames ?? []).isEmpty }),
              (try? await PhotoLibrary.requestAccess()) != nil,
              let root = try? await DriveClient.rootFolder(),
              let folders = try? await DriveClient.children(root) else { return }
        let mine = Set((UserDefaults.standard.dictionary(forKey: folderKey) as? [String: String] ?? [:]).values)
        var got = Set(UserDefaults.standard.stringArray(forKey: pulledKey) ?? [])
        for folder in folders where folder.mime == DriveClient.folderMime && !mine.contains(folder.id) {
            guard let files = try? await DriveClient.children(folder.id) else { continue }
            for file in files where file.mime.hasPrefix("image/") && !got.contains(file.id) {
                guard let data = try? await DriveClient.download(file.id) else { continue }
                defer { got.insert(file.id); UserDefaults.standard.set(Array(got), forKey: pulledKey) }
                // 이미 그 컷이 있는 롤이면 사진 앱에 또 저장하지 않는다
                let roll = PhotoRestore.mark(in: data).flatMap { m in rolls.first { $0.id == m.0 }.map { ($0, m.1) } }
                if let (roll, index) = roll, (roll.frames ?? []).contains(where: { $0.index == index }) { continue }
                var album: PHAssetCollection?
                if let (roll, _) = roll { album = try? await RollImporter.targetAlbum(for: roll.snapshot()) }
                let url = FileManager.default.temporaryDirectory.appendingPathComponent("drive-\(file.id)-\(file.name)")
                guard (try? data.write(to: url)) != nil else { continue }
                defer { try? FileManager.default.removeItem(at: url) }
                guard let assetID = try? await PhotoLibrary.add(fileURL: url, originalName: file.name, date: nil, location: nil, to: album) else { continue }
                if let roll = roll?.0, roll.albumIdentifier == nil, let album { roll.albumIdentifier = album.localIdentifier }
                _ = PhotoRestore.restore(data: data, assetID: assetID, context: context)
            }
        }
    }

    /// 아직 안 올렸거나, 돌리거나 날짜·위치가 바뀐 사진만 올린다. 실패하면 다음 번에 다시.
    /// progress가 있으면(직접 누른 경우) 자동으로 도는 중이어도 끝날 때까지 기다렸다가 다시 확인한다. 실패하면 이유를 돌려준다
    @MainActor
    @discardableResult
    static func sync(_ context: ModelContext, progress: ((Int, Int, String) -> Void)? = nil) async -> String? {
        guard GoogleAuth.isConnected else { return "구글 드라이브에 연결돼 있지 않아요." }
        if running {
            guard progress != nil else { return nil }
            while running { try? await Task.sleep(for: .milliseconds(300)) }
        }
        running = true
        defer { running = false }
        let sent = UserDefaults.standard.dictionary(forKey: sentKey) as? [String: String] ?? [:]
        var folders = UserDefaults.standard.dictionary(forKey: folderKey) as? [String: String] ?? [:]
        let rolls = ((try? context.fetch(FetchDescriptor<RollItem>())) ?? []).filter { $0.deletedAt == nil && $0.status == .imported }
        let all = rolls.reduce(0) { $0 + ($1.frames ?? []).filter { $0.assetIdentifier != nil }.count }
        guard all > 0 else { return "올릴 스캔 사진이 없어요." }
        guard let root = try? await DriveClient.rootFolder() else { return "드라이브에 연결하지 못했어요. 인터넷 연결을 확인해 주세요." }
        let day = DateFormatter()
        day.dateFormat = "yyyy-MM-dd"
        var onDrive = 0, total = 0, done = 0, queued = 0, gone = 0, unreadable = 0
        var goneRolls: Set<String> = []
        UserDefaults.standard.removeObject(forKey: failedKey)
        let pending = await DriveUploader.shared.pendingKeys()
        progress?(0, all, "드라이브 확인 중")
        for roll in rolls {
            let frames = (roll.frames ?? []).filter { $0.assetIdentifier != nil }.sorted { $0.index < $1.index }
            guard !frames.isEmpty else { continue }
            total += frames.count
            let start = roll.shootingDays.map(\.startedAt).min() ?? roll.loadedAt
            let folderName = String("\(day.string(from: start)) \(roll.albumTitle)".replacingOccurrences(of: "/", with: "-").prefix(120))
            // 드라이브에서 폴더나 사진을 지웠을 수 있어 매번 실제로 있는지 본다 (지워졌으면 다시 올린다).
            // 기억해 둔 폴더는 id로 확인해서, 롤 이름이 바뀌어도 같은 폴더를 쓴다
            var folder = folders[roll.id.uuidString]
            var files: [String: String] = [:]   // 파일 이름: id (내용이 있는 것)
            var empties: [String: String] = [:]
            progress?(done, all, "\(roll.albumTitle) 폴더 확인 중")
            do {
                if let f = folder, try await !DriveClient.exists(f) { folder = nil }
                if folder == nil { folder = try await DriveClient.find(folderName, parent: root, folder: true) }
                if let f = folder {
                    for c in try await DriveClient.children(f) where c.mime != DriveClient.folderMime && c.size > 0 { files[c.name] = c.id }
                    // 만들기만 하고 아직 안 채운 빈 파일: 다시 만들지 않고 그 파일에 올린다
                    for c in try await DriveClient.children(f) where c.mime != DriveClient.folderMime && c.size == 0 { empties[c.name] = c.id }
                }
            } catch {
                return "드라이브 폴더를 확인하지 못했어요. 잠시 뒤 다시 눌러 주세요."
            }
            for frame in frames {
                defer { done += 1; progress?(done, all, "") }
                guard let assetID = frame.assetIdentifier else { continue }
                let key = "\(roll.id.uuidString.lowercased())-\(frame.index)"
                if pending.contains(key) { queued += 1; continue }   // 이미 iOS가 올리는 중
                let name = String(format: "%02d.jpg", frame.index)
                guard let asset = PHAsset.fetchAssets(withLocalIdentifiers: [assetID], options: nil).firstObject else {
                    gone += 1; goneRolls.insert(roll.albumTitle); continue
                }
                let modified = asset.modificationDate
                let stamp = String(Int(modified?.timeIntervalSince1970 ?? 0))
                let prev = sent[key]?.components(separatedBy: "|")
                if let onFile = files[name] {
                    // 드라이브에 이미 있는 사진은 다시 올리지 않는다. 올린 뒤 사진 앱에서 돌리거나 정보를 고친 것만 다시 올린다
                    // (기억이 없거나 다른 기기가 올린 같은 컷이면 그 파일을 내 것으로 기억만 한다)
                    if prev?.first != onFile || prev?.last == stamp {
                        remember(key, "\(onFile)|\(stamp)")
                        onDrive += 1
                        continue
                    }
                }
                progress?(done, all, "\(frame.index)번 컷 사진 꺼내는 중")
                guard let file = await PhotoLibrary.fileData(assetID: assetID) else { unreadable += 1; continue }
                // 사진 앱의 날짜·위치를 고쳐도 파일 속 정보는 그대로라, 올릴 때 지금 기록으로 다시 쓴다
                let data = RollImporter.withCurrentInfo(file.data, frame: frame, roll: roll) ?? file.data
                do {
                    if folder == nil {
                        folder = try await DriveClient.folder(folderName, parent: root)
                    }
                    guard let folder else { continue }
                    folders[roll.id.uuidString] = folder
                    UserDefaults.standard.set(folders, forKey: folderKey)
                    var id = files[name] ?? empties[name]
                    if id == nil { id = try await DriveClient.createFile(name, parent: folder, mime: "image/jpeg") }
                    guard let id, !id.isEmpty else { continue }
                    progress?(done, all, "\(roll.albumTitle) \(frame.index)번 컷 보낼 준비")
                    // 보내기는 iOS가 한다: 앱을 닫아도 계속 올라간다
                    try await DriveUploader.shared.enqueue(data, fileID: id, key: key, stamp: stamp)
                    queued += 1
                } catch {
                    return "사진을 보낼 준비를 하다 멈췄어요 (\(done) / \(all)장 확인). 잠시 뒤 다시 눌러 주세요."
                }
            }
        }
        UserDefaults.standard.set([onDrive, total], forKey: countKey)
        UserDefaults.standard.set(["gone": gone, "unreadable": unreadable, "rolls": Array(goneRolls.sorted().prefix(3))] as [String: Any], forKey: missingKey)
        lastQueued = queued
        return nil
    }

    /// 마지막으로 확인했을 때 드라이브에 있는 사진 / 아이폰의 사진
    static var counts: (onDrive: Int, total: Int)? {
        guard let a = UserDefaults.standard.array(forKey: countKey) as? [Int], a.count == 2 else { return nil }
        return (a[0], a[1])
    }

    static func forget() {
        UserDefaults.standard.removeObject(forKey: sentKey)
        UserDefaults.standard.removeObject(forKey: folderKey)
        UserDefaults.standard.removeObject(forKey: pulledKey)
        UserDefaults.standard.removeObject(forKey: countKey)
        UserDefaults.standard.removeObject(forKey: missingKey)
        UserDefaults.standard.removeObject(forKey: failedKey)
    }
}
