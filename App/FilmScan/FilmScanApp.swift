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
    /// 바깥(파일 앱·공유·zip 열기)에서 받은 zip들. 어디로 넣을지 고르는 창을 띄운다
    var incoming: IncomingZips?
    /// 기존 롤 대기열에 새로 넣었음 (현상 스캔 화면이 다시 읽고 첫 파일을 연다)
    var queueAdded: UUID?
    /// 사진 앱에서 공유받은 사진들: 롤마다 나눠 기존 롤 가져오기로
    var incomingPhotos: IncomingPhotos?
    /// 위치를 찾는 중인 롤 (카드에 진행 표시)
    var locatingRollIDs: Set<UUID> = []
    var rollsPath = NavigationPath()

    struct IncomingPhotos: Identifiable {
        let id = UUID()
        let photos: [SplitPhoto]
        /// 사진 앱에서 찾지 못한 장 수
        var missing = 0
    }

    struct IncomingZips: Identifiable {
        let id = UUID()
        let urls: [URL]
    }

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

    /// 바깥에서 받은 zip들을 앱 임시 폴더로 복사하고, 어디로 넣을지 묻는다
    func receiveZips(_ urls: [URL]) {
        let copies = urls.compactMap { url -> URL? in
            let accessing = url.startAccessingSecurityScopedResource()
            defer { if accessing { url.stopAccessingSecurityScopedResource() } }
            let copy = FileManager.default.temporaryDirectory
                .appendingPathComponent(UUID().uuidString, isDirectory: true)
                .appendingPathComponent(url.lastPathComponent)
            do {
                try FileManager.default.createDirectory(at: copy.deletingLastPathComponent(), withIntermediateDirectories: true)
                try FileManager.default.copyItem(at: url, to: copy)
                return copy
            } catch { return nil }
        }
        guard !copies.isEmpty else { return }
        incoming = IncomingZips(urls: copies)
    }

    /// 받은 파일을 zip과 사진으로 나눠 알맞은 창을 띄운다
    func receiveFiles(_ urls: [URL]) {
        // zip과 풀린 폴더는 어디로 넣을지 묻고, 낱장 사진은 롤마다 나누기로
        let sources = urls.filter { $0.pathExtension.lowercased() == "zip" || $0.hasDirectoryPath || Self.isDirectory($0) }
        let photos = urls.filter { !sources.contains($0) }
        if !sources.isEmpty { incoming = IncomingZips(urls: sources) }
        else if !photos.isEmpty { incomingPhotos = IncomingPhotos(photos: photos.map { SplitPhoto(url: $0) }) }
    }

    static func isDirectory(_ url: URL) -> Bool {
        var isDir: ObjCBool = false
        return FileManager.default.fileExists(atPath: url.path, isDirectory: &isDir) && isDir.boolValue
    }

    /// 파일 앱에서 공유한 zip·폴더: 확장이 넘긴 북마크로 원래 위치를 열어 앱으로 복사한다
    func receiveFolderLinks(_ url: URL) {
        guard let d = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems?.first(where: { $0.name == "d" })?.value else { return }
        var b64 = d.replacingOccurrences(of: "-", with: "+").replacingOccurrences(of: "_", with: "/")
        while b64.count % 4 != 0 { b64 += "=" }
        guard let json = Data(base64Encoded: b64), let marks = try? JSONDecoder().decode([String].self, from: json) else { return }
        var folders: [URL] = []
        for m in marks {
            var stale = false
            guard let data = Data(base64Encoded: m),
                  let src = try? URL(resolvingBookmarkData: data, bookmarkDataIsStale: &stale) else { continue }
            folders.append(src)
        }
        receiveZips(folders)
    }

    /// 사진 앱에서 공유한 사진: 표지로 사진 앱에서 찾아 연결한다. 못 찾은 장은 함께 넘어온 파일이 있으면 그걸 쓴다.
    func receiveSharedPhotos(_ refs: [SharedPhotoRef], files: [URL]) async {
        guard !refs.isEmpty else { return }
        let ids = await PhotoLibrary.findAssets(refs)
        var photos: [SplitPhoto] = []
        var missing = 0
        for (ref, id) in zip(refs, ids) {
            if let id { photos.append(SplitPhoto(assetID: id)); continue }
            let base = (ref.n as NSString).deletingPathExtension.lowercased()
            if let file = files.first(where: { $0.lastPathComponent.lowercased().contains(base) }) {
                photos.append(SplitPhoto(url: file))
            } else {
                missing += 1
            }
        }
        guard !photos.isEmpty else { missing = refs.count; incomingPhotos = nil; photoMissingAlert = true; return }
        incomingPhotos = IncomingPhotos(photos: photos, missing: missing)
    }
    /// 공유한 사진을 사진 앱에서 하나도 찾지 못함
    var photoMissingAlert = false

    /// 여러 zip을 기존 롤 대기열에 넣고 현상 스캔으로 간다
    func enqueueArchive(_ urls: [URL]) {
        guard !ImportQueueStore.add(urls).isEmpty else { return }
        tab = .pending
        queueAdded = UUID()
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
