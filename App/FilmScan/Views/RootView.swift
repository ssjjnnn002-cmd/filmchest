import Combine
import SwiftUI
import SwiftData
import UniformTypeIdentifiers

struct RootView: View {
    @Environment(Router.self) private var router
    @Environment(\.modelContext) private var context
    @Query private var rolls: [RollItem]
    @Environment(\.scenePhase) private var scenePhase
    @State private var showIntro = true
    @State private var showWelcome = false
    @AppStorage("filmscan.welcomeSeen") private var welcomeSeen = false
    /// 기록이 바뀌면 잠깐 기다렸다가 드라이브·폴더에 올린다 (연달아 고칠 땐 한 번만)
    @State private var syncTask: Task<Void, Never>?
    /// 앱을 보고 있는 동안 다른 기기(웹·갤럭시)에서 고친 기록을 가끔 받아 온다
    @State private var pullTimer = Timer.publish(every: 60, on: .main, in: .common).autoconnect()

    private var loadedCount: Int { rolls.filter { $0.deletedAt == nil && $0.status == .loaded }.count }
    private var pendingCount: Int { rolls.filter { $0.deletedAt == nil && ($0.status == .finished || $0.status == .atLab) }.count }

    /// 바뀐 기록을 올린다: 파일 앱 폴더, 구글 드라이브 기록, 스캔 사진 (바뀐 게 없으면 건너뛴다)
    private func syncNow(delay: Double) {
        syncTask?.cancel()
        syncTask = Task {
            if delay > 0 { try? await Task.sleep(for: .seconds(delay)) }
            guard !Task.isCancelled else { return }
            _ = try? AutoBackup.run(context)
            guard GoogleAuth.isConnected else { return }
            try? await DriveSync.push(context)
            await DrivePhotos.sync(context)
        }
    }

    var body: some View {
        @Bindable var router = router
        TabView(selection: $router.tab) {
            Tab("내 장비", systemImage: "camera", value: AppTab.library) {
                NavigationStack { LibraryView() }
            }
            Tab("촬영 중", systemImage: "film", value: AppTab.shooting) {
                NavigationStack { ShootingView() }
            }
            .badge(loadedCount)
            Tab("현상 스캔", systemImage: "tray.and.arrow.down", value: AppTab.pending) {
                NavigationStack { PendingView() }
            }
            .badge(pendingCount)
            Tab("롤 보관함", systemImage: "square.stack", value: AppTab.rolls) {
                NavigationStack(path: $router.rollsPath) { RollsView() }
            }
        }
        .tabViewStyle(.sidebarAdaptable)
        .syncCustomFilms()
        .tint(Theme.safelight)
        .sheet(isPresented: $router.showLoadFilm) {
            LoadFilmView(initialCamera: router.loadFilmCamera)
        }
        .sheet(item: $router.importRequest) { request in
            ImportFlowView(zipURL: request.zipURL, preselectedRoll: request.roll) { saved in
                router.importRequest = nil
                guard let saved else { return }
                Task { @MainActor in
                    try? await Task.sleep(for: .milliseconds(350))
                    router.showRoll(saved)
                }
            }
            #if os(macOS)
            .frame(minWidth: 520, minHeight: 620)
            #endif
        }
        .sheet(item: $router.incoming) { incoming in
            IncomingImportView(zips: incoming.urls) { saved in
                router.incoming = nil
                guard let saved else { return }
                Task { @MainActor in
                    try? await Task.sleep(for: .milliseconds(350))
                    router.showRoll(saved)
                }
            }
        }
        .sheet(item: $router.incomingPhotos) { incoming in
            PhotoImportFlow(photos: incoming.photos, missing: incoming.missing) { router.incomingPhotos = nil }
        }
        .alert("사진을 찾지 못했어요", isPresented: $router.photoMissingAlert) {
            Button("확인", role: .cancel) {}
        } message: {
            Text("사진 앱에서 같은 사진을 찾지 못했어요. 필름함 › 현상 스캔 › + › 기존 롤 가져오기 › 사진 앱에서 고르기로 가져와 주세요.")
        }
        .fileImporter(isPresented: $router.showZipPicker, allowedContentTypes: [.zip, .folder], allowsMultipleSelection: true) { result in
            guard case .success(let urls) = result, !urls.isEmpty else { return }
            // 롤 화면에서 고른 경우는 그 롤로 바로, 아니면 어디로 넣을지 묻는다
            if let roll = router.zipTargetRoll, let url = urls.first { router.openZip(url, roll: roll) }
            else { router.receiveZips(urls) }
        }
        .task {
            Trash.purge(in: context)
            if Subscriptions.subscriptionEnabled { await Subscriptions.shared.listen() }
        }
        #if DEBUG
        .task { DebugSeed.run(context: context, router: router) }
        #endif
        // 가져오기 확장(filmchest://import) 또는 공유 시트의 '필름함' 앱으로 받은 파일
        .onOpenURL { url in
            if url.isFileURL {
                router.receiveZips([url])
            } else if url.scheme == "filmchest", url.host == "folders" {
                router.receiveFolderLinks(url)
            } else if url.scheme == "filmchest", url.host == "photos" {
                let refs = SharedPhotoRef.decode(url)
                let files = Store.takeAllFromInbox()
                Task { await router.receiveSharedPhotos(refs, files: files) }
            } else if url.scheme == "filmchest" {
                router.receiveFiles(Store.takeAllFromInbox())
            }
        }
        // 확장이 앱을 열지 못했을 때를 대비해, 앱이 앞으로 올 때 대기함을 확인한다
        .onChange(of: scenePhase) { _, phase in
            if phase == .background { syncNow(delay: 0) }
            // 열 때: 다른 기기 기록을 받고, 아직 안 올린 기록·사진을 올린다
            if phase == .active { DriveSync.onActive(context); syncNow(delay: 3) }
            if phase == .active, router.importRequest == nil, router.incoming == nil, router.incomingPhotos == nil {
                router.receiveFiles(Store.takeAllFromInbox())
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: ModelContext.didSave)) { _ in syncNow(delay: 4) }
        .sheet(isPresented: $showWelcome) { WelcomeView() }
        // 로그아웃하면 시작 화면으로 (기록은 기기에 남아 있다)
        .onReceive(NotificationCenter.default.publisher(for: DriveSync.signedOut)) { _ in showWelcome = true }
        .onReceive(pullTimer) { _ in if scenePhase == .active { DriveSync.onActive(context) } }
        .overlay {
            if showIntro {
                IntroView {
                    showIntro = false
                    // 처음 켤 때 한 번: 구글로 시작하기 (이미 연결했으면 묻지 않는다)
                    if !GoogleAuth.isConnected && (!welcomeSeen || DriveSync.keptAccount != nil) { showWelcome = true }
                }
                    .transition(.opacity)
            }
        }
        // Mac/iPad: zip을 창으로 끌어다 놓기
        .dropDestination(for: URL.self) { urls, _ in
            let zips = urls.filter { $0.pathExtension.lowercased() == "zip" }
            guard !zips.isEmpty else { return false }
            router.receiveZips(zips)
            return true
        }
    }
}
