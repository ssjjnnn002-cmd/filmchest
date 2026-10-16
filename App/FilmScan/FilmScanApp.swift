import SwiftUI
import SwiftData
import FilmScanCore

@main
struct FilmScanApp: App {
    @State private var container = Store.makeContainer()

    init() { CanisterCache.prewarm() }

    @State private var router = Router()
    @Environment(\.scenePhase) private var scenePhase

    var body: some Scene {
        WindowGroup {
            RootView()
                .preferredColorScheme(appearanceScheme)
                .environment(router)
                .modelContainer(container)
                .onChange(of: scenePhase) { _, phase in
                    // 공유 확장에서 저장한 내용이 있으면 저장소를 다시 연다
                    if phase == .active, Store.consumeExternalChange() {
                        container = Store.makeContainer()
                    }
                }
        }
        #if os(macOS)
        .defaultSize(width: 1180, height: 780)
        .commands {
            CommandGroup(after: .newItem) {
                Button("필름 장착하기…") { router.loadFilm() }.keyboardShortcut("l")
                Button("스캔 불러오기…") { router.pickZip() }.keyboardShortcut("o")
            }
        }
        #endif

        #if os(macOS)
        Settings {
            SettingsView(showsDoneButton: false)
                .preferredColorScheme(appearanceScheme)
                .modelContainer(container)
        }
        #endif
    }

    @AppStorage(AppSettings.Key.appearance, store: AppSettings.defaults) private var appearance: AppearanceMode = .system
    private var appearanceScheme: ColorScheme? { appearance.colorScheme }
}

/// 화면 어디서나 여는 시트들
@Observable
final class Router {
    var tab: AppTab = .library
    var loadFilmCamera: CameraItem?
    var showLoadFilm = false
    var showZipPicker = false
    var zipTargetRoll: RollItem?
    var importRequest: ImportRequest?
    /// 위치를 찾는 중인 롤 (카드에 진행 표시)
    var locatingRollIDs: Set<UUID> = []
    var rollsPath = NavigationPath()

    struct ImportRequest: Identifiable {
        let id = UUID()
        let zipURL: URL
        let roll: RollItem?
    }

    func loadFilm(camera: CameraItem? = nil) {
        loadFilmCamera = camera
        showLoadFilm = true
    }

    func fillCurrentPlace(for roll: RollItem) {
        let id = roll.id
        locatingRollIDs.insert(id)
        Task {
            let place = await LocationProvider().currentPlace()
            locatingRollIDs.remove(id)
            guard let place, roll.locations.isEmpty else { return }
            roll.locations = [LocationSegment(startFrame: 1, name: place.name, point: place.point, weather: place.weather)]
        }
    }

    func showRoll(_ roll: RollItem) {
        tab = .rolls
        var path = NavigationPath()
        path.append(roll)
        rollsPath = path
    }

    func pickZip(for roll: RollItem? = nil) {
        zipTargetRoll = roll
        showZipPicker = true
    }

    /// 파일 선택기/드래그로 받은 zip을 앱 임시 폴더로 복사해 가져오기를 시작한다
    func openZip(_ url: URL, roll: RollItem? = nil) {
        let accessing = url.startAccessingSecurityScopedResource()
        defer { if accessing { url.stopAccessingSecurityScopedResource() } }
        let copy = FileManager.default.temporaryDirectory
            .appendingPathComponent(UUID().uuidString, isDirectory: true)
            .appendingPathComponent(url.lastPathComponent)
        do {
            try FileManager.default.createDirectory(at: copy.deletingLastPathComponent(), withIntermediateDirectories: true)
            try FileManager.default.copyItem(at: url, to: copy)
            importRequest = ImportRequest(zipURL: copy, roll: roll)
        } catch {
            importRequest = nil
        }
    }
}

enum AppTab: Hashable {
    case library, shooting, pending, rolls
}
