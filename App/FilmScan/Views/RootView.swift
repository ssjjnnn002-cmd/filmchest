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
            if phase == .background { AutoBackup.runIfDue(context) }
            if phase == .active, router.importRequest == nil, router.incoming == nil, router.incomingPhotos == nil {
                router.receiveFiles(Store.takeAllFromInbox())
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
            let zips = urls.filter { $0.pathExtension.lowercased() == "zip" }
            guard !zips.isEmpty else { return false }
            router.receiveZips(zips)
            return true
        }
    }
}
