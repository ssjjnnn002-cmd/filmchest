import Foundation
import SwiftData
import FilmScanCore

// SwiftData 저장 모델. 나중에 iCloud(CloudKit) 동기화를 켤 수 있도록
// 모든 속성에 기본값을 두고, 관계는 옵셔널로, 고유 제약은 쓰지 않는다.

@Model
final class CameraItem {
    var id: UUID = UUID()
    var brand: String = ""
    var model: String = ""
    var nickname: String?
    var formatRaw: String = FilmFormat.f135.rawValue
    var mount: String?
    var fixedLensName: String?
    @Attribute(.externalStorage) var photo: Data?   // 누끼 딴 PNG (사진 한 장)
    /// 사진 썸네일 크기 (1 = 기본)
    var photoScale: Double = 1
    @Attribute(.externalStorage) var spinData: Data? // 360° 회전 사진 (PNG 배열)
    var bodyStyleRaw: String = CameraBodyStyle.slr.rawValue
    var bodyStyleManual: Bool = false             // 사용자가 형태를 직접 바꿨는지
    var modelColorHex: String = CameraBodyStyle.defaultColorHex  // 기본 모형 색
    var batteryType: String?                      // 예: "SR44 ×2"
    var batteryReplacedAt: Date?                  // 마지막 교체일
    /// 필름을 먼저 끝까지 감아 두고 거꾸로 세는 카메라 (모르면 nil, 노출계에서 처음 한 번 묻는다)
    var prewind: Bool?
    var createdAt: Date = Date()
    var sortOrder: Int = 0
    /// 있으면 휴지통. 24시간이 지나면 장비 목록에서만 지운다.
    var deletedAt: Date?
    var purchasedAt: Date?
    var price: String?
    var seller: String?
    /// 한 번이라도 렌즈를 불러오거나 빼면 true. 그 전엔 같은 마운트 렌즈를 모두 보여 준다.
    var lensesChosen: Bool = false
    /// 이 카메라에 불러온 렌즈. 렌즈 탭의 등록은 그대로 두고 id만 붙인다.
    var linkedLensIDs: [UUID] = []

    @Relationship(deleteRule: .nullify, inverse: \RollItem.camera)
    var rolls: [RollItem]? = []

    init(brand: String, model: String, format: FilmFormat = .f135, mount: String? = nil, fixedLensName: String? = nil) {
        self.brand = brand
        self.model = model
        self.formatRaw = format.rawValue
        self.mount = mount
        self.fixedLensName = fixedLensName
    }

    var format: FilmFormat {
        get { FilmFormat(rawValue: formatRaw) ?? .f135 }
        set { formatRaw = newValue.rawValue }
    }

    var displayName: String { "\(brand) \(model)" }
    var isInterchangeable: Bool { !(mount ?? "").isEmpty }

    /// 장비 목록에서 빼 둔다. 롤에 카메라 이름과 규격을 남기고, 연결은 유지한다.
    func moveToTrash() {
        for roll in rolls ?? [] { roll.rememberCamera() }
        deletedAt = Date()
    }

    /// 지금 장착된 롤
    var loadedRoll: RollItem? { (rolls ?? []).first { $0.status == .loaded && $0.deletedAt == nil } }

    var sortedRolls: [RollItem] { (rolls ?? []).filter { $0.deletedAt == nil }.sorted { $0.loadedAt > $1.loadedAt } }

    var core: Camera {
        Camera(id: id, brand: brand, model: model, nickname: nickname, format: format,
               mount: mount?.nilIfBlank, fixedLensName: fixedLensName?.nilIfBlank)
    }
}

@Model
final class LensItem {
    var id: UUID = UUID()
    var brand: String = ""
    var model: String = ""
    var mount: String = ""
    @Attribute(.externalStorage) var photo: Data?
    var createdAt: Date = Date()
    var purchasedAt: Date?
    var price: String?
    var seller: String?
    /// 줌렌즈면 true. 화각이 비어 있으면 이름에서 짐작한다.
    var zoomLens: Bool = false
    /// 가장 짧은 화각(mm). 단렌즈는 이 값.
    var focalMin: Int = 0
    /// 가장 긴 화각(mm). 단렌즈면 0이거나 focalMin과 같다.
    var focalMax: Int = 0
    /// 최대개방 f값. 예: "1.4", 가변 줌이면 "3.5–5.6"
    var apertureOpen: String = ""
    /// 최소개방 f값. 예: "16"
    var apertureClose: String = ""

    @Relationship(deleteRule: .nullify, inverse: \RollItem.lens)
    var rolls: [RollItem]? = []

    init(brand: String, model: String, mount: String) {
        self.brand = brand
        self.model = model
        self.mount = mount
    }

    var displayName: String { "\(brand) \(model)" }
    var core: Lens { Lens(id: id, brand: brand, model: model, mount: mount) }

    /// 저장값 우선, 비어 있으면 렌즈 이름에서 읽는다.
    var optics: LensOptics {
        let parsed = LensOptics.parse(model)
        var value = parsed
        if focalMin > 0 {
            value.focalMin = focalMin
            value.focalMax = focalMax > 0 ? focalMax : focalMin
        }
        if zoomLens || value.focalMax > value.focalMin { value.zoom = true }
        if let open = apertureOpen.nilIfBlank { value.open = open }
        if let close = apertureClose.nilIfBlank { value.close = close }
        return value
    }

    /// 카드에 쓰는 한 줄. 예: "단렌즈 · 50mm · 최대 f/1.4 최소 f/16"
    var specLine: String {
        let value = optics
        let zoom = value.zoom
        let known = value.focalMin > 0 || zoomLens || value.open.nilIfBlank != nil || value.close.nilIfBlank != nil
        guard known else { return "" }
        var parts: [String] = []
        if value.focalMin > 0 || zoom { parts.append(zoom ? "줌렌즈" : "단렌즈") }
        if value.focalMin > 0 {
            if zoom && value.focalMax > value.focalMin {
                parts.append("\(value.focalMin)–\(value.focalMax)mm")
            } else {
                parts.append("\(value.focalMin)mm")
            }
        }
        var stops: [String] = []
        if let open = value.open.nilIfBlank { stops.append("최대 f/\(open)") }
        if let close = value.close.nilIfBlank { stops.append("최소 f/\(close)") }
        if !stops.isEmpty { parts.append(stops.joined(separator: " ")) }
        return parts.joined(separator: " · ")
    }
}

/// 렌즈 이름에서 화각과 최대개방을 읽는다. "50mm f/1.4", "24-70mm f/2.8", "24-105mm f/3.5-5.6"
struct LensOptics {
    var zoom = false
    var focalMin = 0
    var focalMax = 0
    var open = ""
    var close = ""

    static func parse(_ name: String) -> LensOptics {
        var value = LensOptics()
        let text = name.replacingOccurrences(of: "–", with: "-")
            .replacingOccurrences(of: "—", with: "-")
            .replacingOccurrences(of: "~", with: "-")
        if let parts = capture(#"(\d+)\s*-\s*(\d+)\s*mm"#, in: text),
           let short = Int(parts[1]), let long = Int(parts[2]) {
            value.focalMin = min(short, long)
            value.focalMax = max(short, long)
            value.zoom = value.focalMax > value.focalMin
        } else if let parts = capture(#"(\d+)\s*mm"#, in: text), let one = Int(parts[1]) {
            value.focalMin = one
            value.focalMax = one
        }
        if let parts = capture(#"[fF]\s*/?\s*(\d+(?:\.\d+)?)(?:\s*-\s*(\d+(?:\.\d+)?))?"#, in: text), parts.count >= 2 {
            let first = parts[1]
            let second = parts.count >= 3 ? parts[2] : ""
            if let wide = Double(first), let stopped = Double(second), stopped >= 11, stopped > wide {
                value.open = first
                value.close = second
            } else if !second.isEmpty {
                value.open = "\(first)–\(second)"
            } else {
                value.open = first
            }
        }
        if text.localizedCaseInsensitiveContains("zoom") { value.zoom = true }
        return value
    }

    private static func capture(_ pattern: String, in text: String) -> [String]? {
        guard let expression = try? NSRegularExpression(pattern: pattern, options: [.caseInsensitive]) else { return nil }
        let range = NSRange(text.startIndex..., in: text)
        guard let match = expression.firstMatch(in: text, range: range) else { return nil }
        return (0..<match.numberOfRanges).map { index in
            guard let found = Range(match.range(at: index), in: text) else { return "" }
            return String(text[found])
        }
    }
}

@Model
final class RollItem {
    var id: UUID = UUID()
    var camera: CameraItem?
    var lens: LensItem?
    var filmStockID: String = ""
    var shotISO: Int?
    var statusRaw: String = RollStatus.loaded.rawValue
    var loadedAt: Date = Date()
    var finishedAt: Date?
    var shootingDays: [ShootingDay] = []
    var locations: [LocationSegment] = []
    /// 롤 중간에 바꿔 낀 렌즈 (startFrame번 컷부터). 처음 렌즈는 lens
    var lensChanges: [LensChange] = []
    /// 노출계로 남긴 컷별 기록 (필름 칸 번호 기준)
    var meterShots: [MeterShot] = []
    /// 노출계에서 이 롤을 거꾸로 세며 찍었는지
    var meterPrewind: Bool?
    /// 스캔에 붙일 때 노출 기록을 몇 칸 밀었는지. +1이면 1번 기록이 2번 사진
    var meterOffset: Int = 0
    var labName: String?
    var droppedOffAt: Date?
    var scannerName: String?
    var importedAt: Date?
    var frameCount: Int?
    var note: String?
    var albumIdentifier: String?
    var isFavorite: Bool = false
    /// 보관함 썸네일로 쓸 컷 번호 (없으면 첫 장)
    var coverFrameIndex: Int?
    // 스캔 해상도 (대표값)
    var scanPixelWidth: Int?
    var scanPixelHeight: Int?
    var scanFormat: String?
    var scanBytes: Int64?
    /// 예전에 찍어 둔 롤을 나중에 넣은 것 (모르는 정보가 있을 수 있다)
    var isArchive: Bool = false
    /// 카메라를 지워도 롤에 남는 기록
    var recordedCameraBrand: String = ""
    var recordedCameraModel: String = ""
    var recordedCameraFormatRaw: String = ""
    var recordedFixedLensName: String = ""
    /// 있으면 휴지통. 24시간이 지나면 지운다.
    var deletedAt: Date?

    @Relationship(deleteRule: .cascade, inverse: \FrameItem.roll)
    var frames: [FrameItem]? = []

    init(camera: CameraItem?, lens: LensItem?, filmStockID: String, shotISO: Int? = nil) {
        self.camera = camera
        self.lens = lens
        self.filmStockID = filmStockID
        self.shotISO = shotISO
        rememberCamera()
    }

    /// 지금 연결된 카메라의 이름과 규격을 롤에 적는다.
    func rememberCamera() {
        guard let camera else { return }
        recordedCameraBrand = camera.brand
        recordedCameraModel = camera.model
        recordedCameraFormatRaw = camera.formatRaw
        recordedFixedLensName = camera.fixedLensName ?? ""
    }

    var status: RollStatus {
        get { RollStatus(rawValue: statusRaw) ?? .loaded }
        set { statusRaw = newValue.rawValue }
    }

    var film: FilmStock? { FilmStockCatalog.stock(id: filmStockID) }
    var filmName: String { film?.displayName ?? (filmStockID.isEmpty ? "필름 알 수 없음" : filmStockID) }
    var recordedCameraName: String {
        [recordedCameraBrand, recordedCameraModel].filter { !$0.isEmpty }.joined(separator: " ")
    }
    /// 카메라 본체가 없어도 롤에 남은 이름
    var cameraLabel: String? {
        if let camera { return camera.displayName }
        return recordedCameraName.isEmpty ? nil : recordedCameraName
    }
    var cameraName: String { cameraLabel ?? "카메라 알 수 없음" }
    var fixedLensLabel: String? {
        if let name = camera?.fixedLensName?.nilIfBlank { return name }
        return recordedFixedLensName.isEmpty ? nil : recordedFixedLensName
    }
    /// 촬영일을 모르는 기존 롤
    var dateUnknown: Bool { isArchive && shootingDays.isEmpty }
    var format: FilmFormat {
        if let camera { return camera.format }
        return FilmFormat(rawValue: recordedCameraFormatRaw) ?? .f135
    }
    var sortedFrames: [FrameItem] { (frames ?? []).sorted { $0.index < $1.index } }

    /// 보관함 썸네일 컷: 정해 둔 컷, 없으면 첫 장
    var coverFrame: FrameItem? {
        let frames = sortedFrames
        return frames.first { $0.index == coverFrameIndex } ?? frames.first
    }
    var sortedDays: [ShootingDay] { shootingDays.sorted { $0.startedAt < $1.startedAt } }
    var sortedLocations: [LocationSegment] { locations.sorted { $0.startFrame < $1.startFrame } }

    /// 예: "2026.09.27 – 10.03"
    var dateRangeText: String {
        let days = sortedDays.map(\.startedAt)
        if dateUnknown { return "날짜 알 수 없음" }
        guard let first = days.first else { return Fmt.day.string(from: loadedAt) }
        guard let last = days.last, !Calendar.current.isDate(first, inSameDayAs: last) else { return Fmt.day.string(from: first) }
        let sameYear = Calendar.current.component(.year, from: first) == Calendar.current.component(.year, from: last)
        return "\(Fmt.day.string(from: first)) – \((sameYear ? Fmt.monthDay : Fmt.day).string(from: last))"
    }

    /// 사진 앱 앨범 이름. 예: "2026.10.05 HP5 Plus · X-700"
    var albumTitle: String {
        let date = dateUnknown ? "날짜 미상" : Fmt.day.string(from: sortedDays.first?.startedAt ?? loadedAt)
        let film = self.film.map { FilmCanisterLabel.shortName($0) } ?? "필름 미상"
        let modelName = camera.map(\.model).flatMap { $0.isEmpty ? nil : $0 }
            ?? (recordedCameraModel.isEmpty ? nil : recordedCameraModel)
            ?? "카메라 미상"
        return "\(date) \(film) · \(modelName)"
    }

    func coreRoll() -> Roll {
        Roll(id: id, cameraID: camera?.id ?? UUID(), lensID: lens?.id, filmStockID: filmStockID, shotISO: shotISO,
             status: status, loadedAt: loadedAt, shootingDays: shootingDays, locations: locations,
             labName: labName, droppedOffAt: droppedOffAt, scannerName: scannerName, importedAt: importedAt,
             frameCount: frameCount, note: note)
    }
}

@Model
final class FrameItem {
    var index: Int = 0
    var assetIdentifier: String?
    @Attribute(.externalStorage) var thumbnail: Data?   // 긴 변 1200px JPEG
    var takenAt: Date?
    var locationName: String?
    var isFavorite: Bool = false
    var pixelWidth: Int?
    var pixelHeight: Int?
    var byteSize: Int64?
    var roll: RollItem?

    init(index: Int, assetIdentifier: String?, thumbnail: Data?, takenAt: Date?, locationName: String?) {
        self.index = index
        self.assetIdentifier = assetIdentifier
        self.thumbnail = thumbnail
        self.takenAt = takenAt
        self.locationName = locationName
    }
}

enum FilmCanisterLabel {
    /// "Ilford HP5 Plus" → "HP5 Plus", "Kodak Portra 400" → "Portra 400"
    static func shortName(_ stock: FilmStock) -> String { stock.name }
}

enum Fmt {
    static let day: DateFormatter = make("yyyy.MM.dd")
    static let monthDay: DateFormatter = make("MM.dd")
    static let dayTime: DateFormatter = make("yyyy.MM.dd HH:mm")
    static let time: DateFormatter = make("HH:mm")

    private static func make(_ format: String) -> DateFormatter {
        let f = DateFormatter()
        f.locale = Locale(identifier: "ko_KR")
        f.dateFormat = format
        return f
    }
}

extension String {
    var nilIfBlank: String? {
        let t = trimmingCharacters(in: .whitespacesAndNewlines)
        return t.isEmpty ? nil : t
    }
}

/// 사진이 없을 때 보여줄 기본 모형의 형태
enum CameraBodyStyle: String, CaseIterable, Identifiable {
    case slr, compact, rangefinder, mediumFormat

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .slr: "SLR"
        case .compact: "P&S"
        case .rangefinder: "RF"
        case .mediumFormat: "중형"
        }
    }

    static let defaultColorHex = "#1C1C1E"

    /// 모델명으로 형태를 정한다. 모르는 모델이면 포맷/렌즈 교환식으로 짐작.
    static func infer(brand: String, model: String, format: FilmFormat, interchangeable: Bool) -> CameraBodyStyle {
        if let known = CameraCatalog.match(brand: brand, model: model) { return known.style }
        let name = " \(brand) \(model) ".lowercased()
        func has(_ keys: [String]) -> Bool { keys.contains { name.contains($0) } }

        if format.is120 || has(mediumKeys) { return .mediumFormat }
        if has(compactKeys) { return .compact }
        if has(rangefinderKeys) { return .rangefinder }
        if has(slrKeys) { return .slr }
        return interchangeable ? .slr : .compact
    }

    private static let mediumKeys = ["hasselblad", "mamiya", "bronica", "rollei flex", "rolleiflex", "rolleicord",
        "pentax 67", "pentax 6x7", "pentax 645", "fuji gw", "fujifilm gw", "ga645", "gs645", "gf670", "plaubel",
        "yashica mat", "yashica-mat", "yashica 124", "kiev 88", "holga", "diana", "seagull", "lubitel", "makina"]
    private static let compactKeys = ["mju", "μ", "stylus", " xa", "trip 35", " pen ", "pen-ee", "pen ee", "pen f",
        "t2", "t3", "contax t", "gr1", "gr10", "gr21", "big mini", "28ti", "35ti", "l35", "t4", "t5", "espio",
        "klasse", "natura", "tiara", "autoboy", "sure shot", "af35", "tc-1", "rollei 35", "lc-a", "lomo", "minilux",
        "leica cm", "hexar af", "minox", "afs", "zoom", "point", "prima", "kodak ektar h35", "half"]
    private static let rangefinderKeys = ["leica m", " m2", " m3", " m4", " m5", " m6", " m7", " mp ", "m-a", "canonet",
        "35 rc", "35rc", "35 sp", "35 dc", "electro 35", "minolta cle", "hi-matic", "himatic", "hexar rf", "bessa",
        "contax g", "zeiss ikon", "fed", "zorki", "kiev", "canon p", "canon 7", "yashica gsn", "konica c35",
        "olympus 35", "rangefinder"]
    private static let slrKeys = ["nikon f", " fm", " fe", " fa", " f2", " f3", " f4", " f5", " f6", "nikkormat",
        "ae-1", "a-1", "f-1", " ftb", "eos", "x-700", "x-370", "x-300", "srt", " xd", "xg", "k1000", " mx", " me ",
        " lx", "spotmatic", " om-", " om1", " om2", "fx-3", "fx-103", "rts", "aria", "contax 1", "praktica", "zenit", "slr"]

    /// 이전 버전 호환 (포맷/렌즈 교환식만으로 짐작)
    static func guess(format: FilmFormat, interchangeable: Bool) -> CameraBodyStyle {
        infer(brand: "", model: "", format: format, interchangeable: interchangeable)
    }
}

extension CameraItem {
    var bodyStyle: CameraBodyStyle {
        get { CameraBodyStyle(rawValue: bodyStyleRaw) ?? .slr }
        set { bodyStyleRaw = newValue.rawValue }
    }

    /// 360° 사진 (정면부터 한 바퀴 순서)
    var spinFrames: [Data] {
        get { spinData.flatMap { try? PropertyListDecoder().decode([Data].self, from: $0) } ?? [] }
        set { spinData = newValue.isEmpty ? nil : try? PropertyListEncoder().encode(newValue) }
    }

    /// 선반/목록에 쓸 대표 이미지 (360°의 정면 → 사진 한 장)
    var coverImageData: Data? { spinFrames.first ?? photo }
}

enum Resolution {
    /// 예: "3130 × 2075 · 6.5MP"
    static func text(width: Int?, height: Int?) -> String? {
        guard let w = width, let h = height, w > 0, h > 0 else { return nil }
        let mp = Double(w * h) / 1_000_000
        return "\(w) × \(h) · \(String(format: "%.1f", mp))MP"
    }

    static func bytes(_ b: Int64?) -> String? {
        guard let b, b > 0 else { return nil }
        return ByteCountFormatter.string(fromByteCount: b, countStyle: .file)
    }
}

extension CameraItem {
    /// 배터리가 필요 없는 기계식 카메라
    var batteryNotNeeded: Bool { (batteryType ?? "").hasPrefix("필요 없음") }

    /// 마지막 교체 후 1년이 지나면 교체를 권한다
    var batteryDue: Bool {
        guard !batteryNotNeeded, let date = batteryReplacedAt else { return false }
        return Date().timeIntervalSince(date) > 365 * 24 * 3600
    }

    /// 예: "3개월 전 교체"
    var batteryAgeText: String? {
        guard let date = batteryReplacedAt else { return nil }
        let f = RelativeDateTimeFormatter()
        f.locale = Locale(identifier: "ko_KR")
        f.unitsStyle = .full
        return "\(f.localizedString(for: date, relativeTo: Date())) 교체"
    }
}


/// 롤 중간에 렌즈를 바꿔 낀 기록
struct LensChange: Codable, Hashable, Identifiable, Sendable {
    var id: UUID = UUID()
    var startFrame: Int
    var lensID: UUID
}

extension RollItem {
    /// n번 컷을 찍을 때 끼워 둔 렌즈 id
    func lensID(at frame: Int) -> UUID? {
        lensChanges.sorted { $0.startFrame > $1.startFrame }.first { $0.startFrame <= frame }?.lensID ?? lens?.id
    }

    /// 마지막으로 끼운 렌즈 id (다음 롤 기본값)
    var lastLensID: UUID? { lensChanges.max { $0.startFrame < $1.startFrame }?.lensID ?? lens?.id }
}


/// 노출계로 남긴 한 컷. pos는 필름 칸 번호, order는 찍은 순서
struct MeterShot: Codable, Hashable, Sendable {
    var pos: Int
    var order: Int
    /// P 자동 · A 조리개 우선 · S 셔터 우선 · M 수동
    var mode: String
    var aperture: Double?
    /// 초 단위 (1/125 → 0.008)
    var shutter: Double?
    /// 노출 보정 (스톱)
    var comp: Double = 0
    var flash: Bool = false
    /// 측정값 (ISO 100 기준 EV)
    var ev: Double = 0
    var focal: Int?
    var at: String?
    var edited: Bool = false
    /// 끼운 필터 (예: "ND8", "노랑")
    var filters: [String]?
    /// 메모 템플릿 태그 (예: "인물", "야간")
    var tags: [String]?
    var memo: String?
}

extension MeterShot {
    var exposureLine: String {
        var parts: [String] = []
        if let aperture, aperture > 0 { parts.append(FrameCaptionFormat.aperture(aperture)) }
        if let shutter, shutter > 0 { parts.append(FrameCaptionFormat.shutter(shutter)) }
        if parts.isEmpty { parts.append("자동") }
        if comp != 0 { parts.append(Self.formatComp(comp)) }
        if flash { parts.append("플래시") }
        return parts.joined(separator: " · ")
    }

    var detailLine: String {
        var parts = [Self.modeName(mode), "\(order)번째"]
        if let focal { parts.append("\(focal)mm") }
        if let filters, !filters.isEmpty { parts.append(filters.joined(separator: ", ")) }
        if let tags, !tags.isEmpty { parts.append(tags.joined(separator: ", ")) }
        if let memo, !memo.isEmpty { parts.append(memo) }
        return parts.joined(separator: " · ")
    }

    /// 순번 옆 부가 정보. 몇 번째인지는 목록 제목으로 쓰므로 빼 둔다.
    func sequenceMeta(prewind: Bool) -> String {
        var parts = ["\(Self.frameTitle(pos, prewind: prewind)) 칸", Self.modeName(mode)]
        if let focal { parts.append("\(focal)mm") }
        if let filters, !filters.isEmpty { parts.append(filters.joined(separator: ", ")) }
        if let tags, !tags.isEmpty { parts.append(tags.joined(separator: ", ")) }
        if let memo, !memo.isEmpty { parts.append(memo) }
        return parts.joined(separator: " · ")
    }

    var exposureNote: ExposureNote {
        ExposureNote(aperture: aperture, shutter: shutter, compensation: comp, flash: flash, program: Self.exposureProgram(mode))
    }

    static func frameTitle(_ pos: Int, prewind: Bool) -> String {
        let label: String
        if prewind && pos == 0 { label = "" }
        else if pos >= 1 { label = String(pos) }
        else if pos == 0 { label = "0" }
        else if pos == -1 { label = "00" }
        else { label = "E\(-pos - 1)" }
        return label.isEmpty ? "추가" : "\(label)번"
    }

    static func modeName(_ mode: String) -> String {
        switch mode {
        case "A": "조리개 우선"
        case "S": "셔터 우선"
        case "M": "수동"
        default: "자동"
        }
    }

    /// EXIF ExposureProgram
    static func exposureProgram(_ mode: String) -> Int {
        switch mode {
        case "M": 1
        case "P": 2
        case "A": 3
        case "S": 4
        default: 0
        }
    }

    static func formatComp(_ stops: Double) -> String {
        let k = Int((stops * 3).rounded())
        if k == 0 { return "0" }
        let w = abs(k) / 3
        let r = abs(k) % 3
        let frac = r == 1 ? "⅓" : r == 2 ? "⅔" : ""
        return (k > 0 ? "+" : "−") + (w == 0 ? "" : String(w)) + frac
    }
}

extension FilmFormat {
    /// 한 롤 컷 수
    var framesPerRoll: Int {
        switch self {
        case .f135: 36
        case .halfFrame: 72
        case .f120_645: 15
        case .f120_66: 12
        case .f120_67: 10
        case .f120_69: 8
        }
    }
}

/// 롤 보관함 프로젝트(폴더). 한 롤을 여러 프로젝트에 넣을 수 있어서 롤 id 목록으로 묶는다.
@Model
final class ProjectItem {
    var id: UUID = UUID()
    var name: String = ""
    var memo: String?
    /// ProjectPalette 순서 (0–15)
    var colorIndex: Int = 0
    /// 보관됨: 보관된 프로젝트 화면에서만 보인다
    var isArchived: Bool = false
    var createdAt: Date = Date()
    var rollIDs: [UUID] = []

    init(name: String, memo: String? = nil, colorIndex: Int = 0) {
        self.name = name
        self.memo = memo
        self.colorIndex = colorIndex
    }

    func contains(_ roll: RollItem) -> Bool { rollIDs.contains(roll.id) }

    func toggle(_ roll: RollItem) {
        if let i = rollIDs.firstIndex(of: roll.id) { rollIDs.remove(at: i) } else { rollIDs.append(roll.id) }
    }
}

enum FilmStorage: String, CaseIterable, Identifiable {
    case fridge, freezer, drawer, room
    var id: String { rawValue }
    var displayName: String {
        switch self {
        case .fridge: "냉장고"
        case .freezer: "냉동고"
        case .drawer: "서랍"
        case .room: "상온"
        }
    }
}

@Model
final class FilterItem {
    var id: UUID = UUID()
    var name: String = ""
    /// 필터 직경(mm). 40.5처럼 소수도 있다.
    var diameter: String = ""
    @Attribute(.externalStorage) var photo: Data?
    var purchasedAt: Date?
    var price: String?
    var seller: String?
    var createdAt: Date = Date()

    init(name: String) {
        self.name = name
    }

    var diameterText: String {
        guard let mm = diameter.nilIfBlank else { return "" }
        return "직경 \(mm)mm"
    }
}

@Model
final class FilmLotItem {
    var id: UUID = UUID()
    var filmStockID: String = ""
    var customName: String = ""
    var formatRaw: String = FilmFormat.f135.rawValue
    var count: Int = 1
    var lowAt: Int = 1
    var storageRaw: String = FilmStorage.room.rawValue
    var expiresAt: Date?
    var purchasedAt: Date?
    var price: String?
    var seller: String?
    var createdAt: Date = Date()

    init(filmStockID: String, format: FilmFormat = .f135) {
        self.filmStockID = filmStockID
        self.formatRaw = format.rawValue
    }

    var format: FilmFormat {
        get { FilmFormat(rawValue: formatRaw) ?? .f135 }
        set { formatRaw = newValue.rawValue }
    }
    var storage: FilmStorage {
        get { FilmStorage(rawValue: storageRaw) ?? .room }
        set { storageRaw = newValue.rawValue }
    }
    var title: String {
        if let stock = FilmStockCatalog.stock(id: filmStockID) { return stock.displayName }
        return customName.isEmpty ? "필름" : customName
    }
    var expired: Bool { expiresAt.map { $0 < Date() } ?? false }
    var low: Bool { count <= lowAt }
}

/// 프로젝트 폴더 색 16가지 (웹·갤럭시와 같은 순서)
enum ProjectPalette {
    static let hex = ["#E0552E", "#F08C2E", "#F2C230", "#B8C93A", "#5DB55B", "#2FA58F", "#2EA3C9", "#3F7FE0",
                      "#5B5FD6", "#8C55D6", "#C24FB5", "#E05A8A", "#A0705A", "#7A7F87", "#3A3A3E", "#C9B79C"]
}
