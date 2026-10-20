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

    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss
    @Query(sort: \CameraItem.sortOrder) private var cameras: [CameraItem]

    init(presetFileURL: URL? = nil, presetFiles: [URL] = [], sourceName: String? = nil, stepTitle: String? = nil,
         onFinished: (() -> Void)? = nil, onSaved: ((RollItem) -> Void)? = nil) {
        self.presetFileURL = presetFileURL
        self.presetFiles = presetFiles
        self.sourceName = sourceName
        self.stepTitle = stepTitle
        self.onFinished = onFinished
        self.onSaved = onSaved
        _fileURLs = State(initialValue: presetFileURL.map { [$0] } ?? presetFiles)
    }

    // 사진
    @State private var photoItems: [PhotosPickerItem] = []
    @State private var fileURLs: [URL]
    @State private var showFiles = false
    @State private var thumbs: [CGImage] = []
    @State private var didGuessFilm = false

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

    private var count: Int { photoItems.isEmpty ? fileURLs.count : photoItems.count }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    if presetFileURL != nil {
                        Label(sourceName ?? presetFileURL?.lastPathComponent ?? "zip", systemImage: "doc.zipper")
                    } else if !presetFiles.isEmpty {
                        Label("공유한 사진 \(presetFiles.count)장", systemImage: "photo.on.rectangle")
                    } else {
                        PhotosPicker(selection: $photoItems, selectionBehavior: .ordered, matching: .images,
                                     photoLibrary: .shared()) {
                            Label("사진 앱에서 고르기", systemImage: "photo.on.rectangle")
                        }
                        Button("파일에서 가져오기", systemImage: "folder") { showFiles = true }
                    }
                    if count > 0 {
                        selectionSummary
                    }
                } header: {
                    Text("사진")
                } footer: {
                    Text(presetFileURL != nil
                         ? "사진을 보고 카메라와 필름을 채워 주세요. 폴더 이름에 필름이 있으면 미리 넣어 둬요. 닫아도 대기열에 남아요."
                         : (photoItems.isEmpty
                            ? "사진 파일, 폴더, zip 모두 돼요. 파일명 순서대로 컷 번호가 붙어요."
                            : "고른 순서대로 컷 번호가 붙어요. 사진 앱의 사진은 복사하지 않고 그대로 롤에 묶어요."))
                }

                Section("카메라") {
                    Picker("카메라", selection: $cameraID) {
                        Text("알 수 없음").tag(UUID?.none)
                        ForEach(cameras.filter { $0.deletedAt == nil }) { Text($0.displayName).tag(Optional($0.id)) }
                    }
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
            .fileImporter(isPresented: $showFiles, allowedContentTypes: [.image, .zip, .folder],
                          allowsMultipleSelection: true) { result in
                if case .success(let urls) = result {
                    photoItems = []
                    fileURLs = urls
                }
            }
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
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 4) {
                        ForEach(thumbs.indices, id: \.self) { i in
                            Image(cgImage: thumbs[i]).resizable().scaledToFill()
                                .frame(width: 60, height: 40).clipped()
                        }
                    }
                    .padding(5)
                    .background(Theme.filmBase)
                }
            }
            Text(photoItems.isEmpty ? "파일 \(fileURLs.count)개" : "사진 \(photoItems.count)장")
                .font(.subheadline).foregroundStyle(.secondary)
        }
    }

    // MARK: 동작

    private func loadThumbs() async {
        thumbs = []
        if !photoItems.isEmpty {
            var list: [CGImage] = []
            for item in photoItems.prefix(10) {
                if let id = item.itemIdentifier, let img = await PhotoLibrary.image(assetID: id, maxPixel: 160) {
                    list.append(img)
                }
            }
            thumbs = list
        } else if let zip = fileURLs.first(where: { $0.pathExtension.lowercased() == "zip" }) {
            let url = zip
            let preview = await Task.detached { () -> (images: [CGImage], filmID: String?) in
                let ok = url.startAccessingSecurityScopedResource()
                defer { if ok { url.stopAccessingSecurityScopedResource() } }
                guard let peek = try? ScanImporter.peek(zipURL: url) else { return ([], nil) }
                let images = peek.samples.compactMap { ImageThumbnail.make(url: $0, maxPixel: 240) }
                let folders = peek.paths.map { ($0 as NSString).deletingLastPathComponent }.filter { !$0.isEmpty }
                let fromFolders = FilmStockCatalog.match(in: folders.joined(separator: "\n"))?.id
                return (images, fromFolders)
            }.value
            thumbs = preview.images
            let fromTitle = FilmStockCatalog.match(in: sourceName ?? "")?.id
            if !didGuessFilm, filmID.isEmpty, let id = fromTitle ?? preview.filmID {
                filmID = id
                didGuessFilm = true
            }
        } else if !fileURLs.isEmpty {
            let urls = fileURLs
            let images: Set<String> = ["jpg", "jpeg", "png", "heic", "heif", "tif", "tiff", "dng"]
            thumbs = await Task.detached {
                urls.prefix(10).compactMap { url -> CGImage? in
                    guard images.contains(url.pathExtension.lowercased()) else { return nil }
                    let ok = url.startAccessingSecurityScopedResource()
                    defer { if ok { url.stopAccessingSecurityScopedResource() } }
                    return ImageThumbnail.make(url: url, maxPixel: 160)
                }
            }.value
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
            if !photoItems.isEmpty && ids.count == photoItems.count {
                progress = (0, ids.count)
                outcome = try await RollImporter.link(assetIDs: ids, snapshot: snapshot, progress: onProgress)
            } else {
                let urls = try await collectFiles()
                let preview = try await RollImporter.analyze(files: urls)
                progress = (0, preview.frameCount)
                outcome = try await RollImporter.save(preview: preview, snapshot: snapshot, progress: onProgress)
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
            let sources: [URL] = isDir.boolValue
                ? ((try? FileManager.default.contentsOfDirectory(at: url, includingPropertiesForKeys: nil)) ?? [])
                : [url]
            for src in sources where !src.lastPathComponent.hasPrefix(".") {
                let dest = dir.appendingPathComponent(src.lastPathComponent)
                try? FileManager.default.copyItem(at: src, to: dest)
                result.append(dest)
            }
        }
        return result
    }
}
