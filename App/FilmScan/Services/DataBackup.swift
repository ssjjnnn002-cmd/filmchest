import Foundation
import SwiftData
import FilmScanCore
import CryptoKit

/// 사진(스캔)을 뺀 기록 전체를 JSON 한 파일로 저장·복원한다.
/// 자동 백업은 사용자가 고른 폴더(구글 드라이브·iCloud·OneDrive 등 파일 앱 위치)에 같은 이름으로 덮어쓴다.
enum DataBackup {
    static let kind = "filmchest-backup"
    static let fileName = "필름함 백업.json"

    struct File: Codable {
        var kind = DataBackup.kind
        var version = 1
        var savedAt = Date()
        var cameras: [Cam] = []
        var lenses: [Lens] = []
        var filters: [Filter] = []
        var lots: [Lot] = []
        var films: [Film] = []
        var rolls: [Roll] = []
        var projects: [Project] = []
    }
    struct Cam: Codable {
        var id: UUID; var brand, model: String; var nickname: String?; var formatRaw: String
        var mount, fixedLensName: String?; var photo: Data?; var photoScale, photoOffsetX, photoOffsetY: Double
        var tags: [String]; var accessories: [GearAccessory]; var bodyStyleRaw: String; var bodyStyleManual: Bool
        var batteryType: String?; var batteryReplacedAt: Date?; var prewind: Bool?; var createdAt: Date; var sortOrder: Int
        var purchasedAt: Date?; var price, seller: String?; var lensesChosen: Bool; var linkedLensIDs: [UUID]
        var accessoryIDs: [UUID]?
    }
    struct Lens: Codable {
        var id: UUID; var brand, model, mount: String; var photo: Data?; var createdAt: Date
        var purchasedAt: Date?; var price, seller: String?; var tags: [String]
        var zoomLens: Bool; var focalMin, focalMax: Int; var apertureOpen, apertureClose: String
    }
    struct Filter: Codable {
        var id: UUID; var name, diameter: String; var photo: Data?; var purchasedAt: Date?
        var price, seller: String?; var tags: [String]; var createdAt: Date
        var kind: String?
    }
    struct Lot: Codable {
        var id: UUID; var filmStockID, customName, formatRaw: String; var count, lowAt: Int; var storageRaw: String
        var expiresAt, purchasedAt: Date?; var price, seller: String?; var createdAt: Date
    }
    struct Film: Codable {
        var id, name: String; var iso: Int; var colorHex: String; var isBlackAndWhite: Bool; var createdAt: Date
    }
    struct Roll: Codable {
        var id: UUID; var cameraID, lensID: UUID?; var filmStockID: String; var shotISO: Int?; var statusRaw: String
        var loadedAt: Date; var finishedAt: Date?; var shootingDays: [ShootingDay]; var locations: [LocationSegment]
        var lensChanges: [LensChange]; var meterShots: [MeterShot]; var meterPrewind: Bool?; var meterOffset: Int
        var labName: String?; var droppedOffAt: Date?; var scannerName: String?; var frameCount: Int?; var note: String?
        var isFavorite: Bool; var tags: [String]; var isArchive: Bool
        var recordedCameraBrand, recordedCameraModel, recordedCameraFormatRaw, recordedFixedLensName: String
    }
    struct Project: Codable {
        var id: UUID; var name: String; var memo: String?; var colorIndex: Int; var isArchived: Bool; var createdAt: Date; var rollIDs: [UUID]
    }

    @MainActor
    static func data(from context: ModelContext) throws -> Data {
        func all<T: PersistentModel>(_ t: T.Type) -> [T] { (try? context.fetch(FetchDescriptor<T>())) ?? [] }
        var f = File()
        f.cameras = all(CameraItem.self).filter { $0.deletedAt == nil }.map {
            Cam(id: $0.id, brand: $0.brand, model: $0.model, nickname: $0.nickname, formatRaw: $0.formatRaw, mount: $0.mount,
                fixedLensName: $0.fixedLensName, photo: $0.photo, photoScale: $0.photoScale, photoOffsetX: $0.photoOffsetX,
                photoOffsetY: $0.photoOffsetY, tags: $0.tags, accessories: $0.accessories, bodyStyleRaw: $0.bodyStyleRaw,
                bodyStyleManual: $0.bodyStyleManual, batteryType: $0.batteryType, batteryReplacedAt: $0.batteryReplacedAt,
                prewind: $0.prewind, createdAt: $0.createdAt, sortOrder: $0.sortOrder, purchasedAt: $0.purchasedAt,
                price: $0.price, seller: $0.seller, lensesChosen: $0.lensesChosen, linkedLensIDs: $0.linkedLensIDs, accessoryIDs: $0.accessoryIDs)
        }
        f.lenses = all(LensItem.self).map {
            Lens(id: $0.id, brand: $0.brand, model: $0.model, mount: $0.mount, photo: $0.photo, createdAt: $0.createdAt,
                 purchasedAt: $0.purchasedAt, price: $0.price, seller: $0.seller, tags: $0.tags, zoomLens: $0.zoomLens,
                 focalMin: $0.focalMin, focalMax: $0.focalMax, apertureOpen: $0.apertureOpen, apertureClose: $0.apertureClose)
        }
        f.filters = all(FilterItem.self).map {
            Filter(id: $0.id, name: $0.name, diameter: $0.diameter, photo: $0.photo, purchasedAt: $0.purchasedAt,
                   price: $0.price, seller: $0.seller, tags: $0.tags, createdAt: $0.createdAt, kind: $0.kind)
        }
        f.lots = all(FilmLotItem.self).map {
            Lot(id: $0.id, filmStockID: $0.filmStockID, customName: $0.customName, formatRaw: $0.formatRaw, count: $0.count,
                lowAt: $0.lowAt, storageRaw: $0.storageRaw, expiresAt: $0.expiresAt, purchasedAt: $0.purchasedAt,
                price: $0.price, seller: $0.seller, createdAt: $0.createdAt)
        }
        f.films = all(CustomFilmItem.self).map {
            Film(id: $0.id, name: $0.name, iso: $0.iso, colorHex: $0.colorHex, isBlackAndWhite: $0.isBlackAndWhite, createdAt: $0.createdAt)
        }
        f.rolls = all(RollItem.self).filter { $0.deletedAt == nil }.map {
            Roll(id: $0.id, cameraID: $0.camera?.id, lensID: $0.lens?.id, filmStockID: $0.filmStockID, shotISO: $0.shotISO,
                 statusRaw: $0.statusRaw, loadedAt: $0.loadedAt, finishedAt: $0.finishedAt, shootingDays: $0.shootingDays,
                 locations: $0.locations, lensChanges: $0.lensChanges, meterShots: $0.meterShots, meterPrewind: $0.meterPrewind,
                 meterOffset: $0.meterOffset, labName: $0.labName, droppedOffAt: $0.droppedOffAt, scannerName: $0.scannerName,
                 frameCount: $0.frameCount, note: $0.note, isFavorite: $0.isFavorite, tags: $0.tags, isArchive: $0.isArchive,
                 recordedCameraBrand: $0.recordedCameraBrand, recordedCameraModel: $0.recordedCameraModel,
                 recordedCameraFormatRaw: $0.recordedCameraFormatRaw, recordedFixedLensName: $0.recordedFixedLensName)
        }
        f.projects = all(ProjectItem.self).map {
            Project(id: $0.id, name: $0.name, memo: $0.memo, colorIndex: $0.colorIndex, isArchived: $0.isArchived,
                    createdAt: $0.createdAt, rollIDs: $0.rollIDs)
        }
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        return try encoder.encode(f)
    }

    /// 같은 id는 백업 내용으로 덮고, 없는 것은 만든다. 지금 있는 것은 지우지 않는다.
    @MainActor
    static func restore(_ data: Data, into context: ModelContext) throws -> (cameras: Int, rolls: Int) {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        guard let f = try? decoder.decode(File.self, from: data), f.kind == kind else {
            let gear = try GearBackup.merge(data, into: context)   // 예전 장비 파일
            return (gear.cameras, 0)
        }
        func all<T: PersistentModel>(_ t: T.Type) -> [T] { (try? context.fetch(FetchDescriptor<T>())) ?? [] }
        func find<T: PersistentModel>(_ list: [T], _ make: () -> T, _ match: (T) -> Bool) -> T {
            if let hit = list.first(where: match) { return hit }
            let made = make(); context.insert(made); return made
        }
        let cams = all(CameraItem.self), lenses = all(LensItem.self)
        for c in f.cameras {
            let t = find(cams, { let x = CameraItem(brand: c.brand, model: c.model); x.id = c.id; return x }) { $0.id == c.id }
            t.brand = c.brand; t.model = c.model; t.nickname = c.nickname; t.formatRaw = c.formatRaw; t.mount = c.mount
            t.fixedLensName = c.fixedLensName; if let p = c.photo { t.photo = p }; t.photoScale = c.photoScale
            t.photoOffsetX = c.photoOffsetX; t.photoOffsetY = c.photoOffsetY; t.tags = c.tags; t.accessories = c.accessories
            t.bodyStyleRaw = c.bodyStyleRaw; t.bodyStyleManual = c.bodyStyleManual; t.batteryType = c.batteryType
            t.batteryReplacedAt = c.batteryReplacedAt; t.prewind = c.prewind; t.createdAt = c.createdAt; t.sortOrder = c.sortOrder
            t.purchasedAt = c.purchasedAt; t.price = c.price; t.seller = c.seller; t.lensesChosen = c.lensesChosen
            t.linkedLensIDs = c.linkedLensIDs; t.deletedAt = nil
            if let ids = c.accessoryIDs { t.accessoryIDs = ids }
        }
        for l in f.lenses {
            let t = find(lenses, { let x = LensItem(brand: l.brand, model: l.model, mount: l.mount); x.id = l.id; return x }) { $0.id == l.id }
            t.brand = l.brand; t.model = l.model; t.mount = l.mount; if let p = l.photo { t.photo = p }; t.createdAt = l.createdAt
            t.purchasedAt = l.purchasedAt; t.price = l.price; t.seller = l.seller; t.tags = l.tags; t.zoomLens = l.zoomLens
            t.focalMin = l.focalMin; t.focalMax = l.focalMax; t.apertureOpen = l.apertureOpen; t.apertureClose = l.apertureClose
        }
        let filters = all(FilterItem.self)
        for x in f.filters {
            let t = find(filters, { let n = FilterItem(name: x.name); n.id = x.id; return n }) { $0.id == x.id }
            t.name = x.name; t.diameter = x.diameter; if let p = x.photo { t.photo = p }; t.purchasedAt = x.purchasedAt
            t.price = x.price; t.seller = x.seller; t.tags = x.tags; t.createdAt = x.createdAt
            if let k = x.kind { t.kind = k }
        }
        let lots = all(FilmLotItem.self)
        for x in f.lots {
            let t = find(lots, { let n = FilmLotItem(filmStockID: x.filmStockID); n.id = x.id; return n }) { $0.id == x.id }
            t.filmStockID = x.filmStockID; t.customName = x.customName; t.formatRaw = x.formatRaw; t.count = x.count
            t.lowAt = x.lowAt; t.storageRaw = x.storageRaw; t.expiresAt = x.expiresAt; t.purchasedAt = x.purchasedAt
            t.price = x.price; t.seller = x.seller; t.createdAt = x.createdAt
        }
        let films = all(CustomFilmItem.self)
        for x in f.films {
            let t = find(films, { let n = CustomFilmItem(name: x.name, iso: x.iso, colorHex: x.colorHex, isBlackAndWhite: x.isBlackAndWhite); n.id = x.id; return n }) { $0.id == x.id }
            t.name = x.name; t.iso = x.iso; t.colorHex = x.colorHex; t.isBlackAndWhite = x.isBlackAndWhite; t.createdAt = x.createdAt
        }
        let camsNow = all(CameraItem.self), lensesNow = all(LensItem.self), rolls = all(RollItem.self)
        for r in f.rolls {
            let cam = camsNow.first { $0.id == r.cameraID }, lens = lensesNow.first { $0.id == r.lensID }
            let t = find(rolls, { let n = RollItem(camera: cam, lens: lens, filmStockID: r.filmStockID); n.id = r.id; return n }) { $0.id == r.id }
            t.camera = cam; t.lens = lens; t.filmStockID = r.filmStockID; t.shotISO = r.shotISO; t.statusRaw = r.statusRaw
            t.loadedAt = r.loadedAt; t.finishedAt = r.finishedAt; t.shootingDays = r.shootingDays; t.locations = r.locations
            t.lensChanges = r.lensChanges; t.meterShots = r.meterShots; t.meterPrewind = r.meterPrewind; t.meterOffset = r.meterOffset
            t.labName = r.labName; t.droppedOffAt = r.droppedOffAt; t.scannerName = r.scannerName
            if t.frameCount == nil { t.frameCount = r.frameCount }
            t.note = r.note; t.isFavorite = r.isFavorite; t.tags = r.tags; t.isArchive = r.isArchive
            t.recordedCameraBrand = r.recordedCameraBrand; t.recordedCameraModel = r.recordedCameraModel
            t.recordedCameraFormatRaw = r.recordedCameraFormatRaw; t.recordedFixedLensName = r.recordedFixedLensName
            t.deletedAt = nil
        }
        let projects = all(ProjectItem.self)
        for x in f.projects {
            let t = find(projects, { let n = ProjectItem(name: x.name); n.id = x.id; return n }) { $0.id == x.id }
            t.name = x.name; t.memo = x.memo; t.colorIndex = x.colorIndex; t.isArchived = x.isArchived
            t.createdAt = x.createdAt; t.rollIDs = x.rollIDs
        }
        try context.save()
        return (f.cameras.count, f.rolls.count)
    }
}

/// 고른 폴더에 정해진 주기로 백업 파일을 덮어쓴다 (앱이 뒤로 갈 때 확인)
enum AutoBackup {
    private static let bookmarkKey = "filmscan.backupFolder"
    private static let lastKey = "filmscan.backupLast"
    static let intervalKey = "filmscan.backupDays"   // 0이면 끔

    static var folderName: String? {
        guard let url = folder() else { return nil }
        return url.lastPathComponent
    }
    static var lastBackup: Date? { UserDefaults.standard.object(forKey: lastKey) as? Date }

    static func setFolder(_ url: URL) {
        let ok = url.startAccessingSecurityScopedResource()
        defer { if ok { url.stopAccessingSecurityScopedResource() } }
        if let data = try? url.bookmarkData(options: [], includingResourceValuesForKeys: nil, relativeTo: nil) {
            UserDefaults.standard.set(data, forKey: bookmarkKey)
        }
    }
    /// 파일 앱에서 백업 폴더를 연다
    static var folderOpenURL: URL? {
        guard let url = folder() else { return nil }
        return URL(string: "shareddocuments://" + url.path.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed)!)
    }

    static func clearFolder() {
        UserDefaults.standard.removeObject(forKey: bookmarkKey)
        UserDefaults.standard.removeObject(forKey: cloudKey)
        UserDefaults.standard.removeObject(forKey: checkKey)
    }

    private static let cloudKey = "filmscan.backupCloud"
    private static let checkKey = "filmscan.backupChecked"
    /// 사용자가 고른 클라우드 이름 (폴더 경로로 알 수 있으면 그것을 쓴다)
    static var cloudName: String? {
        get {
            guard let url = folder() else { return nil }
            return detectCloud(url) ?? UserDefaults.standard.string(forKey: cloudKey)
        }
        set { UserDefaults.standard.set(newValue, forKey: cloudKey) }
    }
    static var lastCheck: Date? { UserDefaults.standard.object(forKey: checkKey) as? Date }
    /// 이 iPhone 안 폴더라 클라우드로 올라가지 않는지
    static var isLocalOnly: Bool {
        guard let path = folder()?.path else { return false }
        return path.contains("/Containers/Shared/AppGroup/") && detectCloud(folder()!) == nil && cloudName == nil
    }

    static func detectCloud(_ url: URL) -> String? {
        let p = url.path
        if p.contains("com~apple~CloudDocs") || p.contains("Mobile Documents") { return "iCloud Drive" }
        if p.localizedCaseInsensitiveContains("GoogleDrive") || p.contains("com.google.Drive") { return "구글 드라이브" }
        if p.localizedCaseInsensitiveContains("OneDrive") { return "OneDrive" }
        if p.localizedCaseInsensitiveContains("Dropbox") { return "Dropbox" }
        return nil
    }

    /// 연결한 클라우드 폴더의 백업 파일로 기록을 되살린다 (지금 있는 것은 지우지 않고 합친다)
    @MainActor
    static func restoreFromFolder(_ context: ModelContext) throws -> (cameras: Int, rolls: Int) {
        guard let dir = folder() else { throw CocoaError(.fileNoSuchFile) }
        let ok = dir.startAccessingSecurityScopedResource()
        defer { if ok { dir.stopAccessingSecurityScopedResource() } }
        let target = dir.appendingPathComponent(DataBackup.fileName)
        var data: Data?
        var failure: Error?
        NSFileCoordinator().coordinate(readingItemAt: target, options: [], error: nil) { url in
            do { data = try Data(contentsOf: url) } catch { failure = error }
        }
        if let failure { throw failure }
        return try DataBackup.restore(data ?? Data(), into: context)
    }

    /// 연결 확인: 폴더에 작은 파일을 쓰고 다시 읽은 뒤 지운다
    static func verify() -> String? {
        guard let dir = folder() else { return "폴더가 연결되지 않았어요." }
        let ok = dir.startAccessingSecurityScopedResource()
        defer { if ok { dir.stopAccessingSecurityScopedResource() } }
        let test = dir.appendingPathComponent(".필름함 연결 확인.txt")
        let stamp = Date().formatted(.iso8601)
        var failure: String?
        NSFileCoordinator().coordinate(writingItemAt: test, options: .forReplacing, error: nil) { url in
            do {
                try Data(stamp.utf8).write(to: url, options: .atomic)
                let back = try String(contentsOf: url, encoding: .utf8)
                if back != stamp { failure = "저장한 내용을 다시 읽지 못했어요." }
                try? FileManager.default.removeItem(at: url)
            } catch {
                failure = "이 폴더에 저장할 수 없어요. 폴더를 다시 골라 주세요."
            }
        }
        if failure == nil { UserDefaults.standard.set(Date(), forKey: checkKey) }
        return failure
    }

    private static func folder() -> URL? {
        guard let data = UserDefaults.standard.data(forKey: bookmarkKey) else { return nil }
        var stale = false
        guard let url = try? URL(resolvingBookmarkData: data, options: [], relativeTo: nil, bookmarkDataIsStale: &stale) else { return nil }
        if stale { setFolder(url) }
        return url
    }

    @MainActor
    static func runIfDue(_ context: ModelContext) {
        let days = UserDefaults.standard.object(forKey: intervalKey) as? Int ?? 1
        guard days > 0 else { return }
        if let last = lastBackup, Date().timeIntervalSince(last) < Double(days) * 86_400 - 3_600 { return }
        _ = try? run(context)
    }

    /// 지금 백업. 폴더가 없으면 nil
    /// force가 아니면 지난번과 내용이 같을 때 올리지 않는다 (같은 파일에 덮어쓰기)
    @MainActor @discardableResult
    static func run(_ context: ModelContext, force: Bool = false) throws -> URL? {
        guard let dir = folder() else { return nil }
        let data = try DataBackup.data(from: context)
        let body = String(decoding: data, as: UTF8.self).replacingOccurrences(of: #""savedAt":"[^"]*",?"#, with: "", options: .regularExpression)
        let key = SHA256.hash(data: Data(body.utf8)).map { String(format: "%02x", $0) }.joined()
        if !force, key == UserDefaults.standard.string(forKey: "filmscan.backupKey") {
            UserDefaults.standard.set(Date(), forKey: lastKey)
            return dir.appendingPathComponent(DataBackup.fileName)
        }
        let ok = dir.startAccessingSecurityScopedResource()
        defer { if ok { dir.stopAccessingSecurityScopedResource() } }
        let target = dir.appendingPathComponent(DataBackup.fileName)
        var failure: Error?
        NSFileCoordinator().coordinate(writingItemAt: target, options: .forReplacing, error: nil) { url in
            do { try data.write(to: url, options: .atomic) } catch { failure = error }
        }
        if let failure { throw failure }
        UserDefaults.standard.set(key, forKey: "filmscan.backupKey")
        UserDefaults.standard.set(Date(), forKey: lastKey)
        return target
    }
}
