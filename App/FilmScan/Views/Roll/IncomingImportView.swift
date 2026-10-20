import SwiftUI
import SwiftData
import FilmScanCore

/// 파일 앱 '다음으로 열기'·공유·zip 열기로 받은 파일: 어디로 넣을지 고른 뒤 이어서 진행한다.
/// 스캔 대기 중인 롤에 넣기 → 한 개면 기존 가져오기 화면, 여러 개면 롤을 한 번에 짝지어 모두 가져오기.
/// 기존 롤로 가져오기 → 한 개면 바로 입력, 여러 개면 대기열에 넣고 차례로.
struct IncomingImportView: View {
    let zips: [URL]
    var onClose: (_ saved: RollItem?) -> Void

    @Environment(Router.self) private var router
    @Query(filter: #Predicate<RollItem> { $0.statusRaw == "finished" || $0.statusRaw == "atLab" })
    private var pendingRolls: [RollItem]
    @State private var step: Step = .choose
    @State private var samples: [URL: [CGImage]] = [:]

    private enum Step { case choose, pending, archive, multi }

    private var waiting: [RollItem] { pendingRolls.filter { $0.deletedAt == nil } }

    var body: some View {
        switch step {
        case .choose: chooser
        case .pending:
            ImportFlowView(zipURL: zips[0], preselectedRoll: nil) { saved in onClose(saved) }
        case .archive:
            ArchiveImportView(presetFileURL: zips[0], sourceName: zips[0].lastPathComponent) { onClose(nil) }
        case .multi:
            MultiRollImportView(zips: zips, samples: samples) { onClose(nil) }
        }
    }

    private var chooser: some View {
        NavigationStack {
            List {
                Section {
                    ForEach(zips, id: \.self) { zip in
                        ZipPreviewRow(name: zip.lastPathComponent, images: samples[zip])
                    }
                } header: {
                    Text(zips.count > 1 ? "가져올 파일 · \(zips.count)개" : "가져올 파일")
                }

                Section {
                    Button { step = zips.count > 1 ? .multi : .pending } label: {
                        choiceRow("스캔 대기 중인 롤에 넣기",
                                  waiting.isEmpty ? "현상 맡긴 롤이 없으면 새 롤로 만들 수 있어요"
                                  : zips.count > 1 ? "파일마다 롤을 골라 한 번에 가져와요" : "현상 맡긴 롤 중에서 골라요")
                    }
                    Button {
                        if zips.count > 1 {
                            router.enqueueArchive(zips)
                            onClose(nil)
                        } else {
                            step = .archive
                        }
                    } label: {
                        choiceRow("기존 롤로 가져오기",
                                  zips.count > 1 ? "대기열에 넣고 차례로 입력해요" : "예전에 찍은 롤을 롤 보관함에 넣어요")
                    }
                }
            }
            .scrollContentBackground(.hidden)
            .background(Theme.paper)
            .navigationTitle("스캔 가져오기")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("닫기") { onClose(nil) } }
            }
            .task { await loadSamples() }
        }
    }

    private func choiceRow(_ title: String, _ detail: String) -> some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(title).font(.body.weight(.semibold)).foregroundStyle(.primary)
            Text(detail).font(.subheadline).foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .contentShape(Rectangle())
    }

    private func loadSamples() async {
        for zip in zips where samples[zip] == nil {
            let images = await Task.detached { () -> [CGImage] in
                guard let peek = try? ScanImporter.peek(zipURL: zip, maxFrames: 6) else { return [] }
                return peek.samples.compactMap { ImageThumbnail.make(url: $0, maxPixel: 200) }
            }.value
            samples[zip] = images
        }
    }
}

/// zip 이름 + 안에 든 사진 몇 장
struct ZipPreviewRow: View {
    let name: String
    let images: [CGImage]?

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Label(name, systemImage: "doc.zipper").lineLimit(1)
            if let images {
                if images.isEmpty {
                    Text("미리 볼 사진이 없어요").font(.caption).foregroundStyle(.secondary)
                } else {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 4) {
                            ForEach(images.indices, id: \.self) { i in
                                Image(decorative: images[i], scale: 1).resizable().scaledToFill()
                                    .frame(width: 66, height: 46).clipped()
                            }
                        }
                        .padding(6)
                    }
                    .background(Theme.filmBase, in: RoundedRectangle(cornerRadius: 10))
                }
            } else {
                ProgressView().controlSize(.small)
            }
        }
        .padding(.vertical, 4)
    }
}

/// 여러 zip을 스캔 대기 중인 롤과 한 번에 짝지어 가져온다 (대기열 없이)
struct MultiRollImportView: View {
    let zips: [URL]
    let samples: [URL: [CGImage]]
    var onClose: () -> Void

    @Environment(\.modelContext) private var context
    @Query(filter: #Predicate<RollItem> { $0.statusRaw == "finished" || $0.statusRaw == "atLab" },
           sort: \RollItem.loadedAt, order: .reverse)
    private var pendingRolls: [RollItem]
    @State private var pick: [URL: UUID] = [:]
    @State private var saving = false
    @State private var progress = (roll: 0, done: 0, total: 0)
    @State private var savedCount: Int?
    @State private var errorMessage: String?

    private var rolls: [RollItem] {
        let list = pendingRolls.filter { $0.deletedAt == nil }
        return list.filter { $0.status == .atLab } + list.filter { $0.status == .finished }
    }
    private var chosen: [(URL, RollItem)] {
        zips.compactMap { zip in pick[zip].flatMap { id in rolls.first { $0.id == id } }.map { (zip, $0) } }
    }

    var body: some View {
        NavigationStack {
            List {
                if let savedCount {
                    Section {
                        Label("\(savedCount)롤을 가져왔어요", systemImage: "checkmark.circle.fill")
                            .foregroundStyle(Theme.safelight)
                    }
                }
                ForEach(zips, id: \.self) { zip in
                    Section {
                        ZipPreviewRow(name: zip.lastPathComponent, images: samples[zip])
                        Picker("롤", selection: binding(for: zip)) {
                            Text("고르지 않음").tag(UUID?.none)
                            ForEach(rolls.filter { r in pick[zip] == r.id || !pick.values.contains(r.id) }) { r in
                                Text("\(r.filmName) · \(r.cameraLabel)").tag(Optional(r.id))
                            }
                        }
                        .disabled(saving || savedCount != nil)
                    }
                }
                if rolls.isEmpty {
                    Section {
                        Text("스캔 대기 중인 롤이 없어요. 하나씩 가져오면 새 롤로 만들 수 있어요.")
                            .font(.footnote).foregroundStyle(.secondary)
                    }
                }
                if saving {
                    Section {
                        VStack(alignment: .leading, spacing: 8) {
                            ProgressView(value: Double(progress.done), total: Double(max(progress.total, 1)))
                            Text("\(progress.roll) / \(chosen.count)롤 · \(progress.done) / \(progress.total)장 저장 중")
                                .font(.footnote).foregroundStyle(.secondary)
                        }
                    }
                }
                if let errorMessage {
                    Section { Text(errorMessage).font(.footnote).foregroundStyle(.orange) }
                }
            }
            .scrollContentBackground(.hidden)
            .background(Theme.paper)
            .navigationTitle("여러 롤 가져오기")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(savedCount == nil ? "닫기" : "완료") { onClose() }.disabled(saving)
                }
                if savedCount == nil {
                    ToolbarItem(placement: .confirmationAction) {
                        Button("가져오기") { Task { await saveAll() } }
                            .disabled(saving || chosen.isEmpty)
                    }
                }
            }
            .interactiveDismissDisabled(saving)
            .onAppear(perform: autoPick)
        }
    }

    private func binding(for zip: URL) -> Binding<UUID?> {
        Binding(get: { pick[zip] }, set: { pick[zip] = $0 })
    }

    /// 처음엔 현상 맡긴 롤부터 차례로 짝지어 둔다. 바꿀 수 있다.
    private func autoPick() {
        guard pick.isEmpty else { return }
        for (file, r) in zip(zips, rolls) { pick[file] = r.id }
    }

    private func saveAll() async {
        saving = true
        errorMessage = nil
        var count = 0
        for (i, (zip, roll)) in chosen.enumerated() {
            progress = (i + 1, 0, 0)
            do {
                let preview = try await RollImporter.analyze(zipURL: zip)
                progress.total = preview.frameCount
                let outcome = try await RollImporter.save(preview: preview, snapshot: roll.snapshot()) { done, total in
                    Task { @MainActor in progress.done = done; progress.total = total }
                }
                roll.apply(outcome)
                try context.save()
                Store.markExternalChange()
                count += 1
            } catch {
                errorMessage = "\(zip.lastPathComponent): \(error.localizedDescription)"
                break
            }
        }
        saving = false
        savedCount = count
    }
}
