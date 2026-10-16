import Foundation

// 앱 전체에서 쓰는 기본 데이터 구조.
// 앱 타깃에서는 이 구조를 SwiftData 모델로 감싸 저장하고, 코어 로직은 이 값 타입만 다룬다.

public enum FilmFormat: String, Codable, CaseIterable, Sendable {
    case f135 = "135"
    case halfFrame = "135-half"
    case f120_645 = "120-645"
    case f120_66 = "120-66"
    case f120_67 = "120-67"
    case f120_69 = "120-69"

    public var displayName: String {
        switch self {
        case .f135: "35mm"
        case .halfFrame: "35mm 하프"
        case .f120_645: "120 6×4.5"
        case .f120_66: "120 6×6"
        case .f120_67: "120 6×7"
        case .f120_69: "120 6×9"
        }
    }

    /// 프레임 가로:세로 비율 (필름이 가로로 놓인 기준)
    public var frameAspect: Double {
        switch self {
        case .f135: 36.0 / 24.0
        case .halfFrame: 18.0 / 24.0
        case .f120_645: 41.5 / 56.0
        case .f120_66: 1.0
        case .f120_67: 70.0 / 56.0
        case .f120_69: 84.0 / 56.0
        }
    }

    /// 밀착 인화에서 한 줄(스트립)에 들어가는 컷 수
    public var framesPerStrip: Int {
        switch self {
        case .f135: 6
        case .halfFrame: 12
        case .f120_645: 4
        case .f120_66: 3
        case .f120_67: 3
        case .f120_69: 2
        }
    }

    public var nominalFrameCount: Int {
        switch self {
        case .f135: 36
        case .halfFrame: 72
        case .f120_645: 15
        case .f120_66: 12
        case .f120_67: 10
        case .f120_69: 8
        }
    }

    public var is120: Bool { rawValue.hasPrefix("120") }
}

public struct Camera: Identifiable, Codable, Hashable, Sendable {
    public var id: UUID
    public var brand: String
    public var model: String
    public var nickname: String?
    public var format: FilmFormat
    public var mount: String?          // 렌즈 교환식이면 마운트 이름 (예: "Nikon F")
    public var fixedLensName: String?  // 렌즈 일체형이면 렌즈 이름 (예: "Zeiss Sonnar 38mm f/2.8")

    public init(id: UUID = UUID(), brand: String, model: String, nickname: String? = nil,
                format: FilmFormat = .f135, mount: String? = nil, fixedLensName: String? = nil) {
        self.id = id; self.brand = brand; self.model = model; self.nickname = nickname
        self.format = format; self.mount = mount; self.fixedLensName = fixedLensName
    }

    public var isInterchangeable: Bool { mount != nil }
    public var displayName: String { "\(brand) \(model)" }
}

public struct Lens: Identifiable, Codable, Hashable, Sendable {
    public var id: UUID
    public var brand: String
    public var model: String
    public var mount: String

    public init(id: UUID = UUID(), brand: String, model: String, mount: String) {
        self.id = id; self.brand = brand; self.model = model; self.mount = mount
    }

    public var displayName: String { "\(brand) \(model)" }
}

public enum RollStatus: String, Codable, CaseIterable, Sendable {
    case loaded       // 장착 중 (촬영 중)
    case finished     // 촬영 완료, 아직 안 맡김
    case atLab        // 현상 맡김 (스캔 대기)
    case imported     // 스캔 불러오기 완료

    public var displayName: String {
        switch self {
        case .loaded: "장착 중"
        case .finished: "촬영 완료"
        case .atLab: "스캔 대기"
        case .imported: "완료"
        }
    }
}

public struct GeoPoint: Codable, Hashable, Sendable {
    public var latitude: Double
    public var longitude: Double
    public var altitude: Double?

    public init(latitude: Double, longitude: Double, altitude: Double? = nil) {
        self.latitude = latitude; self.longitude = longitude; self.altitude = altitude
    }
}

/// 촬영일 추가: 그날 처음 찍은 시각과 (알면) 시작 컷 번호
public struct ShootingDay: Identifiable, Codable, Hashable, Sendable {
    public var id: UUID
    public var startedAt: Date
    public var timeZoneID: String
    public var startFrame: Int?   // 1부터 시작. 모르면 nil → 균등 분배

    public init(id: UUID = UUID(), startedAt: Date, timeZone: TimeZone = .current, startFrame: Int? = nil) {
        self.id = id; self.startedAt = startedAt; self.timeZoneID = timeZone.identifier; self.startFrame = startFrame
    }

    public var timeZone: TimeZone { TimeZone(identifier: timeZoneID) ?? .current }
}

/// 장소 추가: 이 컷부터 다음 장소 전까지 같은 장소
public struct LocationSegment: Identifiable, Codable, Hashable, Sendable {
    public var id: UUID
    public var startFrame: Int
    public var name: String
    public var point: GeoPoint?   // 있어야 사진에 위치(GPS)가 기록된다
    public var memo: String?      // 자유 메모 (캡션에 함께 표시)
    public var weather: WeatherNote?  // 현재 위치로 기록할 때 그 자리의 날씨

    public init(id: UUID = UUID(), startFrame: Int, name: String, point: GeoPoint? = nil, memo: String? = nil, weather: WeatherNote? = nil) {
        self.id = id; self.startFrame = startFrame; self.name = name; self.point = point; self.memo = memo; self.weather = weather
    }
}

/// 기록할 때의 날씨 (WMO 날씨 코드 + 기온)
public struct WeatherNote: Codable, Hashable, Sendable {
    public var code: Int
    public var temperature: Double

    public init(code: Int, temperature: Double) {
        self.code = code; self.temperature = temperature
    }

    /// 예: "맑음"
    public var text: String {
        switch code {
        case 0: "맑음"
        case 1, 2: "구름 조금"
        case 3: "흐림"
        case 45, 48: "안개"
        case 51...57: "이슬비"
        case 61...67: "비"
        case 71...77: "눈"
        case 80...82: "소나기"
        case 85, 86: "눈발"
        case 95...99: "뇌우"
        default: "날씨"
        }
    }

    /// 예: "맑음 18°"
    public var summary: String { "\(text) \(Int(temperature.rounded()))°" }
}

public struct Roll: Identifiable, Codable, Hashable, Sendable {
    public var id: UUID
    public var cameraID: UUID
    public var lensID: UUID?
    public var filmStockID: String
    public var shotISO: Int?          // 증감 촬영 시 실제 ISO
    public var status: RollStatus
    public var loadedAt: Date
    public var shootingDays: [ShootingDay]
    public var locations: [LocationSegment]
    public var labName: String?
    public var droppedOffAt: Date?
    public var scannerName: String?
    public var importedAt: Date?
    public var frameCount: Int?
    public var note: String?

    public init(id: UUID = UUID(), cameraID: UUID, lensID: UUID? = nil, filmStockID: String,
                shotISO: Int? = nil, status: RollStatus = .loaded, loadedAt: Date = Date(),
                shootingDays: [ShootingDay] = [], locations: [LocationSegment] = [],
                labName: String? = nil, droppedOffAt: Date? = nil, scannerName: String? = nil,
                importedAt: Date? = nil, frameCount: Int? = nil, note: String? = nil) {
        self.id = id; self.cameraID = cameraID; self.lensID = lensID; self.filmStockID = filmStockID
        self.shotISO = shotISO; self.status = status; self.loadedAt = loadedAt
        self.shootingDays = shootingDays; self.locations = locations; self.labName = labName
        self.droppedOffAt = droppedOffAt; self.scannerName = scannerName; self.importedAt = importedAt
        self.frameCount = frameCount; self.note = note
    }
}
