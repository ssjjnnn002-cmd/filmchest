import SwiftUI
import SwiftData
import PhotosUI
import UniformTypeIdentifiers
import FilmScanCore

/// 기존 롤 가져오기: 예전에 찍어서 스캔본을 받아 둔 롤을 롤 보관함에 넣는다.
/// 사진 앱에서 고르기 / 파일(사진, 폴더, zip) 모두 받고, 모르는 정보는 '알 수 없음'으로 둔다.
struct ArchiveImportView: View {
    var presetFileURL: URL?
    /// 대기열에 보이던 원래 파일·폴더 이름. 복사본 경로는 UUID라 필름 이름 추정에 쓰면 안 된다.
    var sourceName: String?
    var stepTitle: String?
    var onFinished: (() -> Void)?
    /// 다 넣은 뒤 그 롤을 보여 줄 때 (앱에서만)
    var onSaved: ((RollItem) -> Void)?
    /// 공유로 받은 사진 묶음 (사진 앱에서 여러 장 공유)
    var presetFiles: [URL] = []
    /// 사진 앱에서 공유한 사진 (찾아서 연결, 복사하지 않는다)
    var presetAssetIDs: [String] = []

    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss
    @Query(sort: \CameraItem.sortOrder) private var cameras: [CameraItem]

    init(presetFileURL: URL? = nil, presetFiles: [URL] = [], presetAssetIDs: [String] = [], sourceName: String? = nil, stepTitle: String? = nil,
         onFinished: (() -> Void)? = nil, onSaved: ((RollItem) -> Void)? = nil) {
        self.presetFileURL = presetFileURL
        self.presetFiles = presetFiles
        self.presetAssetIDs = presetAssetIDs
        self.sourceName = sourceName
        self.stepTitle = stepTitle
        self.onFinished = onFinished
        self.onSaved = onSaved
        // 압축을 푼 폴더면 안의 사진들로
        if let folder = presetFileURL, ScanFolder.isFolder(folder) {
            _fileURLs = State(initialValue: ScanFolder.images(in: folder))
        } else {
            _fileURLs = State(initialValue: presetFileURL.map { [$0] } ?? presetFiles)
        }
    }

    // 사진
    @State private var photoItems: [PhotosPickerItem] = []
    @State private var fileURLs: [URL]
    @State private var showFiles = false
    /// 파일 고르기 창: 폴더만 고르는 때 (웹의 '폴더 통째로 고르기'와 같음)
    @State private var pickingFolder = false
    @State private var thumbs: [CGImage] = []
    /// 미리보기 칸마다 원본 (눌러서 크게 볼 때)
    @State private var sources: [PreviewSource] = []
    @State private var viewing: Int?
    @State private var didGuessFilm = false
    @State private var didGuessDate = false
    /// 거꾸로 가져오기. nil이면 고른 카메라 설정(프리와인딩)을 따른다
    @State private var reversedChoice: Bool?
    private var reversed: Bool { reversedChoice ?? (cameras.first { $0.id == cameraID }?.prewind == true) }

    // 롤 정보 (nil/빈 값 = 알 수 없음)
    @State private var cameraID: UUID?
    @State private var filmID = ""
    @State private var dateKnown = false
    @State private var date = Date()
    @State private var placeName = ""
    @State private var point: GeoPoint?
    @State private var lab = ""
    @State private var memo = ""

    @State private var saving = false
    @State private var progress = (done: 0, total: 0)
    @State private var errorMessage: String?

    private var count: Int { !presetAssetIDs.isEmpty ? presetAssetIDs.count : photoItems.isEmpty ? fileURLs.count : photoItems.count }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    if presetFileURL != nil {
                        Label(sourceName ?? presetFileURL?.lastPathComponent ?? "zip", systemImage: "doc.zipper")
                    } else if !presetFiles.isEmpty || !presetAssetIDs.isEmpty {
                        Label("공유한 사진 \(presetFiles.count + presetAssetIDs.count)장", systemImage: "photo.on.rectangle")
                    } else {
                        PhotosPicker(selection: $photoItems, selectionBehavior: .ordered, matching: .images,
                                     photoLibrary: .shared()) {
                            Label("사진 앱에서 고르기", systemImage: "photo.on.rectangle")
                        }
                        Button("사진 또는 zip 고르기", systemImage: "doc") { pickingFolder = false; showFiles = true }
                        Button("폴더 통째로 고르기", systemImage: "folder") { pickingFolder = true; showFiles = true }
                    }
                    if presetFileURL == nil, photoItems.isEmpty, let name = pickedName {
                        Label(name, systemImage: fileURLs.count == 1 && fileURLs[0].pathExtension.lowercased() == "zip" ? "doc.zipper"
                              : fileURLs.count == 1 && ScanFolder.isScopedFolder(fileURLs[0]) ? "folder" : "doc")
                            .lineLimit(1).truncationMode(.middle)
                    }
                    if count > 0 {
                        selectionSummary
                    }
                } header: {
                    Text("사진")
                } footer: {
                    Text(!presetAssetIDs.isEmpty || !presetFiles.isEmpty
                         ? "사진을 보고 카메라와 필름을 채워 주세요. 고른 순서대로 컷 번호가 붙어요."
                         : presetFileURL != nil
                         ? "사진을 보고 카메라와 필름을 채워 주세요. 이름에 날짜나 필름이 있으면 미리 넣어 둬요. 닫아도 대기열에 남아요."
                         : (photoItems.isEmpty
                            ? "사진 파일, 폴더, zip 모두 돼요. 파일명 순서대로 컷 번호가 붙어요. 이름에 날짜나 필름이 있으면 미리 넣어 둬요."
                            : "고른 순서대로 컷 번호가 붙어요. 사진 앱의 사진은 복사하지 않고 그대로 롤에 묶어요."))
                }

                Section {
                    Picker("카메라", selection: $cameraID) {
                        Text("알 수 없음").tag(UUID?.none)
                        ForEach(cameras.filter { $0.deletedAt == nil }) { Text($0.displayName).tag(Optional($0.id)) }
                    }
                    Toggle("거꾸로 가져오기", isOn: Binding(get: { reversed }, set: { reversedChoice = $0 }))
                } header: {
                    Text("카메라")
                } footer: {
                    Text(reversed ? "마지막 사진이 1번 컷이 돼요. 프리와인딩 카메라로 찍은 롤이에요." : "프리와인딩 카메라로 찍었으면 켜 주세요.")
                }

                Section("필름") {
                    Picker("필름", selection: $filmID) {
                        Text("알 수 없음").tag("")
                        ForEach(FilmStockCatalog.allIncludingCustom) { Text($0.displayName).tag($0.id) }
                    }
                }

                Section {
                    Toggle("촬영일 알아요", isOn: $dateKnown)
                    if dateKnown {
                        DatePicker("촬영일", selection: $date, displayedComponents: .date)
                    }
                } header: {
                    Text("촬영일")
                } footer: {
                    if !dateKnown { Text("알 수 없음으로 두면 사진에 원래 들어 있던 날짜를 그대로 둬요.") }
                }

                PlacePickerSection(name: $placeName, point: $point)

                Section("현상소") {
                    LabField(lab: $lab)
                }

                Section("메모") {
                    TextField("메모", text: $memo, axis: .vertical)
                }

                if let errorMessage {
                    Section { Text(errorMessage).foregroundStyle(.red).font(.footnote) }
                }
            }
            .formStyle(.grouped)
            .filmKeyboard()
            .rollPaywall()
            .navigationTitle(stepTitle.map { "기존 롤 \($0)" } ?? "기존 롤 가져오기")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(presetFileURL == nil ? "취소" : "나중에") { dismiss() }.disabled(saving)
                }
                ToolbarItem(placement: .confirmationAction) {
                    if saving {
                        HStack(spacing: 6) {
                            ProgressView().controlSize(.small)
                            Text("\(progress.done)/\(progress.total)").font(.caption.monospacedDigit())
                        }
                    } else {
                        Button("가져오기") { Task { await save() } }.disabled(count == 0)
                    }
                }
            }
            .fileImporter(isPresented: $showFiles, allowedContentTypes: pickingFolder ? [.folder] : [.image, .zip],
                          allowsMultipleSelection: !pickingFolder) { result in
                if case .success(let urls) = result {
                    photoItems = []
                    fileURLs = urls
                }
            }
            .onChange(of: cameraID) { _, _ in reversedChoice = nil }
            .onChange(of: photoItems) { _, items in
                if !items.isEmpty { fileURLs = [] }
            }
            .task(id: "\(photoItems.count)|\(fileURLs.count)") { await loadThumbs() }
            .interactiveDismissDisabled(saving)
        }
        #if os(macOS)
        .frame(minWidth: 520, minHeight: 720)
        #endif
    }

    private var selectionSummary: some View {
        VStack(alignment: .leading, spacing: 8) {
            if !thumbs.isEmpty {
                // 전부 보여 주고, 눌러서 한 장씩 크게 본다
                LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 4), count: 3), spacing: 4) {
                    ForEach(thumbs.indices, id: \.self) { i in
                        Button { viewing = i } label: {
                            Color.clear
                                .aspectRatio(3 / 2, contentMode: .fit)
                                .overlay { Image(cgImage: thumbs[i]).resizable().scaledToFill() }
                                .clipped()
                                .overlay(alignment: .bottomLeading) {
                                    Text("\(i + 1)").font(.caption2.weight(.semibold)).foregroundStyle(.white)
                                        .padding(.horizontal, 5).padding(.vertical, 2)
                                        .background(.black.opacity(0.45), in: Capsule()).padding(4)
                                }
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(5)
                .background(Theme.filmBase, in: RoundedRectangle(cornerRadius: 10))
            }
            Text(!presetAssetIDs.isEmpty ? "사진 \(presetAssetIDs.count)장" : photoItems.isEmpty ? (thumbs.isEmpty ? "파일 \(fileURLs.count)개" : "사진 \(thumbs.count)장") : "사진 \(photoItems.count)장")
                .font(.subheadline).foregroundStyle(.secondary)
        }
        #if os(iOS)
        .fullScreenCover(isPresented: Binding(get: { viewing != nil }, set: { if !$0 { viewing = nil } })) {
            PreviewPager(sources: sources, start: viewing ?? 0) { viewing = nil }
        }
        #else
        .sheet(isPresented: Binding(get: { viewing != nil }, set: { if !$0 { viewing = nil } })) {
            PreviewPager(sources: sources, start: viewing ?? 0) { viewing = nil }.frame(minWidth: 640, minHeight: 520)
        }
        #endif
    }

    // MARK: 동작

    /// 고른 파일·zip·폴더 이름. 여러 개면 "첫 이름 외 n개"
    private var pickedName: String? {
        if let sourceName { return sourceName }
        guard let first = fileURLs.first?.lastPathComponent else { return nil }
        return fileURLs.count == 1 ? first : "\(first) 외 \(fileURLs.count - 1)개"
    }

    /// 이름에 날짜·필름이 있으면 비어 있는 칸에 미리 넣는다 (고친 값은 덮지 않는다)
    private func applyNameHints() {
        // 대기열 파일은 복사본 경로가 UUID라 원래 이름(sourceName)만 본다
        let names = [sourceName].compactMap { $0 } + (presetFileURL == nil ? fileURLs.map(\.lastPathComponent) : [])
        let hints = NameHints.guess(names)
        if !didGuessFilm, filmID.isEmpty, let id = hints.filmID {
            filmID = id
            didGuessFilm = true
        }
        if !didGuessDate, !dateKnown, let d = hints.date?.noonDate {
            date = d
            dateKnown = true
            didGuessDate = true
        }
    }

    private func loadThumbs() async {
        thumbs = []
        sources = []
        applyNameHints()
        if !presetAssetIDs.isEmpty {
            await loadAssets(presetAssetIDs)
        } else if !photoItems.isEmpty {
            await loadAssets(photoItems.compactMap(\.itemIdentifier))
        } else if let zip = fileURLs.first(where: { $0.pathExtension.lowercased() == "zip" }) {
            let url = zip
            let peek = await Task.detached { () -> (samples: [URL], filmID: String?) in
                let ok = url.startAccessingSecurityScopedResource()
                defer { if ok { url.stopAccessingSecurityScopedResource() } }
                // 미리보기도 전부 (눌러서 크게 볼 수 있게 풀어 둔 파일을 쓴다)
                guard let peek = try? ScanImporter.peek(zipURL: url, maxFrames: .max) else { return ([], nil) }
                let folders = peek.paths.map { ($0 as NSString).deletingLastPathComponent }.filter { !$0.isEmpty }
                return (peek.samples, FilmStockCatalog.match(in: folders.joined(separator: "\n"))?.id)
            }.value
            if !didGuessFilm, filmID.isEmpty, let id = peek.filmID {
                filmID = id
                didGuessFilm = true
            }
            await loadFiles(peek.samples, scoped: false)
        } else if let folder = fileURLs.first(where: { ScanFolder.isScopedFolder($0) }) {
            // 폴더: 고른 폴더 권한을 이 화면 동안 열어 두고 안의 사진을 미리 본다 (zip이 있으면 저장할 때 펼친다)
            _ = folder.startAccessingSecurityScopedResource()
            await loadFiles(ScanFolder.images(in: folder), scoped: false)
        } else if !fileURLs.isEmpty {
            let images: Set<String> = ["jpg", "jpeg", "png", "heic", "heif", "tif", "tiff", "dng"]
            await loadFiles(fileURLs.filter { images.contains($0.pathExtension.lowercased()) }, scoped: true)
        }
    }

    /// 몇 장씩 차례로 채운다 (36장이어도 앞쪽부터 바로 보인다)
    private func loadFiles(_ urls: [URL], scoped: Bool) async {
        for url in urls {
            let img = await Task.detached { () -> CGImage? in
                let ok = scoped && url.startAccessingSecurityScopedResource()
                defer { if ok { url.stopAccessingSecurityScopedResource() } }
                return ImageThumbnail.make(url: url, maxPixel: 360)
            }.value
            guard !Task.isCancelled else { return }
            if let img { thumbs.append(img); sources.append(.file(url, scoped: scoped)) }
        }
    }

    private func loadAssets(_ ids: [String]) async {
        for id in ids {
            guard !Task.isCancelled else { return }
            if let img = await PhotoLibrary.image(assetID: id, maxPixel: 360) { thumbs.append(img); sources.append(.asset(id)) }
        }
    }

    private func makeRoll() -> RollItem {
        let camera = cameras.first { $0.id == cameraID }
        let roll = RollItem(camera: camera, lens: nil, filmStockID: filmID)
        roll.isArchive = true
        roll.status = .atLab
        if dateKnown {
            roll.loadedAt = date
            roll.shootingDays = [ShootingDay(startedAt: date, startFrame: 1)]
        }
        if !placeName.isEmpty || point != nil {
            roll.locations = [LocationSegment(startFrame: 1, name: placeName, point: point)]
        }
        LabMemory.remember(lab)
        roll.labName = lab.nilIfBlank
        roll.note = memo.nilIfBlank
        return roll
    }

    private func save() async {
        await Subscriptions.shared.refreshEntitlement()
        guard Subscriptions.shared.allowNewRoll(in: context) else { return }
        saving = true
        errorMessage = nil
        defer { saving = false }
        let roll = makeRoll()
        context.insert(roll)
        let snapshot = roll.snapshot()
        let onProgress: @Sendable (Int, Int) -> Void = { done, total in
            Task { @MainActor in progress = (done, total) }
        }
        do {
            let outcome: ImportOutcome
            let ids = photoItems.compactMap(\.itemIdentifier)
            if !presetAssetIDs.isEmpty {
                progress = (0, presetAssetIDs.count)
                outcome = try await RollImporter.link(assetIDs: reversed ? presetAssetIDs.reversed() : presetAssetIDs, snapshot: snapshot, progress: onProgress)
            } else if !photoItems.isEmpty && ids.count == photoItems.count {
                progress = (0, ids.count)
                outcome = try await RollImporter.link(assetIDs: reversed ? ids.reversed() : ids, snapshot: snapshot, progress: onProgress)
            } else {
                let urls = try await collectFiles()
                let preview = try await RollImporter.analyze(files: urls)
                progress = (0, preview.frameCount)
                outcome = try await RollImporter.save(preview: preview, snapshot: snapshot, reversed: reversed, progress: onProgress)
            }
            roll.apply(outcome)
            try context.save()
            Subscriptions.shared.noteRollCreated(in: context)
            let saved = roll
            if let onFinished {
                onFinished()
            } else {
                dismiss()
                if let onSaved {
                    Task { @MainActor in
                        try? await Task.sleep(for: .milliseconds(350))
                        onSaved(saved)
                    }
                }
            }
        } catch {
            context.delete(roll)
            errorMessage = "가져오지 못했어요. (\(error.localizedDescription))"
        }
    }

    /// 파일/폴더/사진 앱 데이터를 임시 폴더의 파일 목록으로 모은다
    private func collectFiles() async throws -> [URL] {
        let dir = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString, isDirectory: true)
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        var result: [URL] = []

        // 사진 앱에서 골랐지만 ID를 못 받은 경우: 데이터를 파일로
        for (i, item) in photoItems.enumerated() {
            if let data = try? await item.loadTransferable(type: Data.self) {
                let url = dir.appendingPathComponent(String(format: "%03d.jpg", i + 1))
                try data.write(to: url)
                result.append(url)
            }
        }

        // 파일 앱: 폴더는 안의 사진/zip을 펼친다
        for url in fileURLs {
            let ok = url.startAccessingSecurityScopedResource()
            defer { if ok { url.stopAccessingSecurityScopedResource() } }
            var isDir: ObjCBool = false
            FileManager.default.fileExists(atPath: url.path, isDirectory: &isDir)
            // 폴더: 안쪽 폴더까지 사진을 찾고, 사진이 없으면 그 폴더의 파일(zip 등)을 그대로
            let inside = isDir.boolValue ? ScanFolder.images(in: url) : []
            let sources: [URL] = !isDir.boolValue ? [url]
                : !inside.isEmpty ? inside
                : ((try? FileManager.default.contentsOfDirectory(at: url, includingPropertiesForKeys: nil)) ?? [])
            for src in sources where !src.lastPathComponent.hasPrefix(".") {
                let dest = dir.appendingPathComponent(src.lastPathComponent)
                try? FileManager.default.copyItem(at: src, to: dest)
                result.append(dest)
            }
        }
        return result
    }
}

/// 미리보기 한 칸의 원본
enum PreviewSource {
    case file(URL, scoped: Bool)
    case asset(String)

    func load(maxPixel: Int) async -> CGImage? {
        switch self {
        case .file(let url, let scoped):
            return await Task.detached {
                let ok = scoped && url.startAccessingSecurityScopedResource()
                defer { if ok { url.stopAccessingSecurityScopedResource() } }
                return ImageThumbnail.make(url: url, maxPixel: maxPixel)
            }.value
        case .asset(let id):
            return await PhotoLibrary.image(assetID: id, maxPixel: maxPixel)
        }
    }
}

/// 미리보기를 눌렀을 때: 한 장씩 크게, 옆으로 넘겨 본다
struct PreviewPager: View {
    let sources: [PreviewSource]
    let start: Int
    var onClose: () -> Void
    @State private var page = 0

    var body: some View {
        ZStack(alignment: .top) {
            Color.black.ignoresSafeArea()
            TabView(selection: $page) {
                ForEach(sources.indices, id: \.self) { i in
                    PreviewPage(source: sources[i]).tag(i)
                }
            }
            #if os(iOS)
            .tabViewStyle(.page(indexDisplayMode: .never))
            #endif
            HStack {
                Text("\(page + 1) / \(sources.count)").font(.subheadline.weight(.semibold)).foregroundStyle(.white).monospacedDigit()
                Spacer()
                Button("닫기", action: onClose).buttonStyle(.borderedProminent).tint(.white.opacity(0.2))
            }
            .padding()
        }
        .onAppear { page = start }
    }
}

private struct PreviewPage: View {
    let source: PreviewSource
    @State private var image: CGImage?

    var body: some View {
        Group {
            if let image { Image(cgImage: image).resizable().scaledToFit() } else { ProgressView().tint(.white) }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .task { image = await source.load(maxPixel: 2400) }
    }
}
