import SwiftUI
import SwiftData
import UniformTypeIdentifiers

struct RootView: View {
    @Environment(Router.self) private var router
    @Environment(\.modelContext) private var context
    @Query private var rolls: [RollItem]
    @Environment(\.scenePhase) private var scenePhase
    @State private var showIntro = true

    private var loadedCount: Int { rolls.filter { $0.deletedAt == nil && $0.status == .loaded }.count }
    private var pendingCount: Int { rolls.filter { $0.deletedAt == nil && ($0.status == .finished || $0.status == .atLab) }.count }

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
        .fileImporter(isPresented: $router.showZipPicker, allowedContentTypes: [.zip]) { result in
            if case .success(let url) = result { router.openZip(url, roll: router.zipTargetRoll) }
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
                router.openZip(url)
            } else if url.scheme == "filmchest", let zip = Store.takeFromInbox() {
                router.openZip(zip)
            }
        }
        // 확장이 앱을 열지 못했을 때를 대비해, 앱이 앞으로 올 때 대기함을 확인한다
        .onChange(of: scenePhase) { _, phase in
            if phase == .active, router.importRequest == nil, let zip = Store.takeFromInbox() {
                router.openZip(zip)
            }
        }
        .overlay {
            if showIntro {
                IntroView { showIntro = false }
                    .transition(.opacity)
            }
        }
        // Mac/iPad: zip을 창으로 끌어다 놓기
        .dropDestination(for: URL.self) { urls, _ in
            guard let zip = urls.first(where: { $0.pathExtension.lowercased() == "zip" }) else { return false }
            router.openZip(zip)
            return true
        }
    }
}
