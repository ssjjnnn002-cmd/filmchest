import SwiftUI

/// 잠시 꺼 둔 기능. 노출계는 측광이 더 정확해지면 다시 켠다 (코드와 기록은 그대로 둔다).
enum Features {
    static let meter = false
    /// 스캔 가져올 때 노출계 기록을 앞뒤로 몇 칸 미루는 '번호 맞추기'
    static let frameShift = false
}

/// 앱 설정. 공유 확장도 같은 값을 보도록 App Group 저장소를 쓴다.
enum AppSettings {
    static let defaults: UserDefaults = UserDefaults(suiteName: Store.appGroupID) ?? .standard

    enum Key {
        static let appearance = "appearance"
        static let albumMode = "albumMode"
        static let photographer = "photographer"
        static let meterOffset = "meterOffset"
        static let meterProfiles = "meterProfiles"
    }

    /// 아이폰 노출계 기본 보정. 안드로이드는 +0.1
    static let meterDefault: Double = -0.2

    static var meterOffset: Double {
        get {
            guard defaults.object(forKey: Key.meterOffset) != nil else { return meterDefault }
            return defaults.double(forKey: Key.meterOffset)
        }
        set { defaults.set(newValue, forKey: Key.meterOffset) }
    }

    static var meterProfiles: [MeterProfile] {
        get {
            guard let data = defaults.data(forKey: Key.meterProfiles),
                  let list = try? JSONDecoder().decode([MeterProfile].self, from: data) else { return [] }
            return list
        }
        set {
            defaults.set(try? JSONEncoder().encode(newValue), forKey: Key.meterProfiles)
        }
    }

    static var albumMode: AlbumMode {
        AlbumMode(rawValue: defaults.string(forKey: Key.albumMode) ?? "") ?? .perRoll
    }
}

struct MeterProfile: Codable, Identifiable, Hashable {
    var id: String
    var name: String
    var value: Double
}

/// 화면 테마
enum AppearanceMode: String, CaseIterable, Identifiable {
    case system, light, dark

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .system: "기기 설정"
        case .light: "라이트"
        case .dark: "다크"
        }
    }

    var colorScheme: ColorScheme? {
        switch self {
        case .system: nil
        case .light: .light
        case .dark: .dark
        }
    }
}

/// 사진 앱에 저장하는 방식
enum AlbumMode: String, CaseIterable, Identifiable {
    case perRoll, perCamera, single, none

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .perRoll: "롤마다 새 앨범"
        case .perCamera: "카메라별 앨범"
        case .single: "한 앨범에 모두"
        case .none: "앨범 없이 저장"
        }
    }

    var detail: String {
        switch self {
        case .perRoll: "'필름함' 폴더 안에 롤마다 앨범을 만들어요. 예) 2026.09.28 HP5 Plus · X-700"
        case .perCamera: "'필름함' 폴더 안에 카메라마다 앨범을 만들고 계속 모아요."
        case .single: "'필름함' 폴더의 '모든 롤' 앨범 하나에 계속 모아요."
        case .none: "앨범에 넣지 않고 사진 보관함에만 저장해요."
        }
    }

    static let singleAlbumTitle = "모든 롤"
}

/// 내 장비 / 롤 보관함 보기 방식
enum LayoutMode: String, CaseIterable, Identifiable {
    case grid, list

    var id: String { rawValue }
    var symbol: String { self == .grid ? "square.grid.2x2" : "list.bullet" }
    var toggled: LayoutMode { self == .grid ? .list : .grid }
    var displayName: String { self == .grid ? "그리드로 보기" : "목록으로 보기" }
}

extension RollItem {
    /// 저장 방식에 따른 저장 위치 안내. 예: "'필름함' 폴더 › 'Minolta X-700' 앨범"
    var saveDestinationText: String {
        let folder = "'\(PhotoLibrary.folderTitle)' 폴더"
        switch AppSettings.albumMode {
        case .perRoll: return "\(folder) › '\(albumTitle)' 앨범"
        case .perCamera: return "\(folder) › '\(cameraName)' 앨범"
        case .single: return "\(folder) › '\(AlbumMode.singleAlbumTitle)' 앨범"
        case .none: return "사진 보관함 (앨범 없음)"
        }
    }
}
