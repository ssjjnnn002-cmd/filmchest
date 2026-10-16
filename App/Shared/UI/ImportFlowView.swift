import SwiftUI
import SwiftData
import FilmScanCore

/// 스캔 불러오기: zip 분석 → 롤 선택 → 확인 → 사진 앱에 저장.
/// 앱과 공유 확장이 같이 쓴다.
struct ImportFlowView: View {
    let zipURL: URL
    var preselectedRoll: RollItem?
    var onFinish: (_ savedRoll: RollItem?) -> Void

    @Environment(\.modelContext) private var context
    @Query(sort: \RollItem.loadedAt, order: .reverse) private var allRolls: [RollItem]

    @State private var preview: ScanPreview?
    @State private var setIndex = 0
    @State private var roll: RollItem?
    @State private var thumbs: [CGImage] = []
    @State private var progress = (done: 0, total: 0)
    @State private var saving = false
    @State private var savedCount: Int?
    @State private var errorMessage: String?
    @State private var showQuickRoll = false
    /// 노출계 칸 번호를 스캔 번호에서 몇 칸 밀지. +1이면 1번 기록이 2번 사진
    @State private var meterOffset = 0

    private var candidates: [RollItem] {
        let order: [RollStatus: Int] = [.atLab: 0, .finished: 1, .loaded: 2]
        return allRolls.filter { $0.deletedAt == nil && $0.status != .imported }
            .sorted { (order[$0.status] ?? 9, $1.loadedAt) < (order[$1.status] ?? 9, $0.loadedAt) }
    }

    private var sets: [ScanSet] {
        guard let preview else { return [] }
        return [preview.result.primary] + preview.result.alternatives
    }

    var body: some View {
        NavigationStack {
            Group {
                if let errorMessage {
                    ContentUnavailableView("불러오지 못했어요", systemImage: "exclamationmark.triangle",
                                           description: Text(errorMessage))
                } else if let savedCount, let roll {
                    doneView(count: savedCount, roll: roll)
                } else if preview == nil {
                    ProgressView("스캔 파일 확인 중…")
                } else if let roll {
                    confirmView(roll)
                } else {
                    rollPicker
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(Theme.paper)
            .navigationTitle("스캔 불러오기")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar {
                if savedCount == nil {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("취소") { cancel() }.disabled(saving)
                    }
                }
            }
        }
        .task { await analyze() }
        .sheet(isPresented: $showQuickRoll) {
            QuickRollForm { newRoll in roll = newRoll; meterOffset = 0 }
        }
    }

    // MARK: 롤 선택

    private var rollPicker: some View {
        List {
            if let preview {
                Section {
                    summaryRow(preview)
                }
            }
            rollSection("스캔 대기", candidates.filter { $0.status == .atLab })
            rollSection("촬영 완료", candidates.filter { $0.status == .finished })
            rollSection("촬영 중", candidates.filter { $0.status == .loaded })
            Section {
                Button("새 롤로 저장", systemImage: "plus") { showQuickRoll = true }
            } footer: {
                if candidates.isEmpty { Text("기록해 둔 롤이 없어요. 필름과 카메라만 고르면 돼요.") }
            }
        }
        #if os(iOS)
        .listStyle(.insetGrouped)
        #endif
        .scrollContentBackground(.hidden)
    }

    @ViewBuilder
    private func rollSection(_ title: String, _ rolls: [RollItem]) -> some View {
        if !rolls.isEmpty {
            Section(title) {
                ForEach(rolls) { r in
                    Button { roll = r; meterOffset = r.meterOffset } label: { RollRow(roll: r) }
                        .buttonStyle(.plain)
                }
            }
        }
    }

    private func summaryRow(_ preview: ScanPreview) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            if !thumbs.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 4) {
                        ForEach(thumbs.indices, id: \.self) { i in
                            Image(cgImage: thumbs[i]).resizable().scaledToFill()
                                .frame(width: 66, height: 44).clipped()
                        }
                    }
                    .padding(6)
                    .background(Theme.filmBase)
                }
            }
            HStack {
                Label("\(preview.frameCount)장", systemImage: "photo.stack")
                Spacer()
                if let s = preview.scanner { Label(s.name, systemImage: "scanner").lineLimit(1) }
            }
            .font(.subheadline)
            .foregroundStyle(.secondary)
        }
    }

    // MARK: 확인

    private func confirmView(_ roll: RollItem) -> some View {
        let frames = sets.isEmpty ? 0 : sets[setIndex].frames.count
        let timeline = FrameTimeline.build(roll: roll.coreRoll(), frameCount: frames)
        return List {
            Section {
                HStack(spacing: 14) {
                    FilmCanisterView(stock: roll.film, format: roll.format).frame(width: 72, height: 72)
                    VStack(alignment: .leading, spacing: 4) {
                        Text(roll.filmName).font(.headline)
                        Text([roll.cameraLabel, roll.lens?.model].compactMap { $0 }.joined(separator: " + "))
                            .font(.subheadline).foregroundStyle(.secondary)
                        if let lab = roll.labName { Text(lab).font(.caption).foregroundStyle(.secondary) }
                    }
                }
                if preselectedRoll == nil {
                    Button("다른 롤 선택") { self.roll = nil }.font(.footnote)
                }
            }

            if sets.count > 1 {
                Section("저장할 파일") {
                    Picker("파일 묶음", selection: $setIndex) {
                        ForEach(sets.indices, id: \.self) { i in
                            Text("\(sets[i].label) · \(sets[i].frames.count)장 · \(sets[i].totalBytes / 1_000_000)MB").tag(i)
                        }
                    }
                    .pickerStyle(.inline)
                    .labelsHidden()
                }
            }

            exposureSection(roll, frames: frames)

            Section("촬영일") {
                ForEach(ranges(timeline, key: { Fmt.day.string(from: $0.date) }), id: \.label) { r in
                    LabeledContent(r.label, value: r.frames)
                }
            }
            if !roll.locations.isEmpty {
                Section("장소") {
                    ForEach(ranges(timeline, key: { $0.location?.name ?? "기록 없음" }), id: \.label) { r in
                        LabeledContent(r.label, value: r.frames)
                    }
                }
            }
            if let noPoint = roll.locations.first(where: { $0.point == nil }) {
                Section {
                    Label("'\(noPoint.name.isEmpty ? "장소" : noPoint.name)'는 좌표가 없어 사진에 위치가 기록되지 않아요. 롤 화면에서 장소를 검색해 지정할 수 있어요.",
                          systemImage: "mappin.slash")
                        .font(.footnote).foregroundStyle(.orange)
                }
            }
            if let outOfRange = roll.locations.first(where: { $0.startFrame > frames }) {
                Section {
                    Label("'\(outOfRange.name)'는 \(outOfRange.startFrame)번부터로 기록했는데 스캔은 \(frames)장이에요.",
                          systemImage: "exclamationmark.triangle")
                        .font(.footnote).foregroundStyle(.orange)
                }
            }

            Section {
                if saving {
                    VStack(alignment: .leading, spacing: 8) {
                        ProgressView(value: Double(progress.done), total: Double(max(progress.total, 1)))
                        Text("\(progress.done) / \(progress.total) 저장 중").font(.footnote).foregroundStyle(.secondary)
                    }
                } else {
                    Button { Task { await save(roll) } } label: {
                        Text("사진 앱에 \(frames)장 저장").frame(maxWidth: .infinity).bold()
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(Theme.safelight)
                    .listRowBackground(Color.clear)
                    .listRowInsets(EdgeInsets())
                }
            } footer: {
                Text("\(roll.saveDestinationText)에 촬영 순서대로 저장돼요.")
            }
        }
        #if os(iOS)
        .listStyle(.insetGrouped)
        #endif
        .scrollContentBackground(.hidden)
    }

    @ViewBuilder
    private func exposureSection(_ roll: RollItem, frames: Int) -> some View {
        let matched = roll.meterShots
            .filter { let n = $0.pos + meterOffset; return n >= 1 && n <= frames }
            .sorted { $0.pos < $1.pos }
        let recorded = roll.meterShots.count
        return Group {
            if recorded > 0 {
                Section {
                    Stepper(value: $meterOffset, in: -6...6) {
                        Text("번호 맞추기").badge(meterOffset > 0 ? "+\(meterOffset)" : "\(meterOffset)")
                    }
                    ForEach(matched, id: \.pos) { shot in
                        LabeledContent {
                            Text(shot.exposureLine).foregroundStyle(.secondary)
                        } label: {
                            VStack(alignment: .leading, spacing: 2) {
                                Text("\(shot.pos + meterOffset)번 사진")
                                Text("노출계 \(MeterShot.frameTitle(shot.pos, prewind: roll.meterPrewind == true))")
                                    .font(.caption).foregroundStyle(.secondary)
                            }
                        }
                    }
                } header: {
                    Text("노출")
                } footer: {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(alignText(meterOffset) + " 현상소 번호가 다르면 한 칸씩 옮기세요. 기록 없는 칸은 비워요.")
                        if recorded > matched.count {
                            Text("기록 \(recorded)장 중 \(recorded - matched.count)장은 이 맞춤에서는 사진 밖에 있어요.")
                        }
                    }
                }
            }
        }
    }

    private func alignText(_ offset: Int) -> String {
        if offset == 0 { return "1번 기록이 1번 사진에 붙어요." }
        if offset > 0 { return "1번 기록이 \(1 + offset)번 사진에 붙어요." }
        return "\(1 - offset)번 기록이 1번 사진에 붙어요."
    }

    private func doneView(count: Int, roll: RollItem) -> some View {
        VStack(spacing: 18) {
            FilmCanisterView(stock: roll.film, format: roll.format).frame(width: 120, height: 120)
            Text("\(count)장 저장 완료").font(.title2.bold())
            Text("사진 앱 › \(roll.saveDestinationText)")
                .font(.subheadline).foregroundStyle(.secondary).multilineTextAlignment(.center)
            Button("완료") { onFinish(roll) }
                .buttonStyle(.borderedProminent).tint(Theme.safelight)
        }
        .padding()
    }

    // MARK: 동작

    private func analyze() async {
        if roll == nil {
            roll = preselectedRoll
            if let preselectedRoll { meterOffset = preselectedRoll.meterOffset }
        }
        do {
            let p = try await RollImporter.analyze(zipURL: zipURL)
            preview = p
            // 고를 롤이 없으면 바로 새 롤 만들기
            if roll == nil, !candidates.contains(where: { $0.status == .atLab || $0.status == .finished }) {
                showQuickRoll = true
            }
            let urls = p.result.primary.frames.prefix(12).map(\.fileURL)
            thumbs = await Task.detached { urls.compactMap { ImageThumbnail.make(url: $0, maxPixel: 160) } }.value
        } catch ScanImportError.noImages {
            errorMessage = "zip 안에 사진 파일이 없어요."
        } catch {
            errorMessage = "zip 파일을 열 수 없어요. (\(error.localizedDescription))"
        }
    }

    private func save(_ roll: RollItem) async {
        guard let preview else { return }
        roll.meterOffset = meterOffset
        let snapshot = roll.snapshot()
        saving = true
        let set = sets[setIndex]
        progress = (0, set.frames.count)
        do {
            let outcome = try await RollImporter.save(preview: preview, using: set, snapshot: snapshot, meterOffset: meterOffset) { done, total in
                Task { @MainActor in progress = (done, total) }
            }
            roll.apply(outcome)
            try context.save()
            Store.markExternalChange()
            savedCount = outcome.frames.count
            onFinish(roll)
        } catch {
            errorMessage = error.localizedDescription
        }
        saving = false
    }

    private func cancel() {
        if let preview { RollImporter.discard(preview) }
        onFinish(nil)
    }

    private struct FrameRange { let label: String; let frames: String }

    /// 연속된 컷을 같은 값끼리 묶는다. 예: ("2026.09.27", "1–20번")
    private func ranges(_ timeline: [FrameInfo], key: (FrameInfo) -> String) -> [FrameRange] {
        var result: [(key: String, start: Int, end: Int)] = []
        for info in timeline {
            let k = key(info)
            if let last = result.last, last.key == k {
                result[result.count - 1].end = info.frame
            } else {
                result.append((k, info.frame, info.frame))
            }
        }
        // 같은 이름이 떨어져서 다시 나오면 라벨을 구분
        var seen: [String: Int] = [:]
        return result.map { r in
            seen[r.key, default: 0] += 1
            let label = seen[r.key]! > 1 ? "\(r.key) (\(seen[r.key]!))" : r.key
            return FrameRange(label: label, frames: r.start == r.end ? "\(r.start)번" : "\(r.start)–\(r.end)번")
        }
    }
}

struct RollRow: View {
    let roll: RollItem

    var body: some View {
        HStack(spacing: 12) {
            FilmCanisterView(stock: roll.film, format: roll.format).frame(width: 48, height: 48)
            VStack(alignment: .leading, spacing: 3) {
                HStack(spacing: 6) {
                    Text(roll.filmName).font(.subheadline.weight(.semibold))
                    StatusBadge(status: roll.status)
                    if roll.isFavorite {
                        Image(systemName: "star.fill").font(.caption).foregroundStyle(.yellow)
                    }
                }
                Text([roll.cameraLabel, roll.dateRangeText].compactMap { $0 }.joined(separator: " · "))
                    .font(.caption).foregroundStyle(.secondary)
                if let place = roll.sortedLocations.map(\.name).joined(separator: ", ").nilIfBlank {
                    Text(place).font(.caption).foregroundStyle(.secondary).lineLimit(1)
                }
            }
            Spacer(minLength: 0)
        }
        .contentShape(Rectangle())
    }
}

/// 미리 기록하지 않은 롤을 즉석에서 만든다
struct QuickRollForm: View {
    var onCreate: (RollItem) -> Void

    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss
    @Query(sort: \CameraItem.sortOrder) private var cameras: [CameraItem]

    @State private var cameraID: UUID?
    @State private var newBrand = ""
    @State private var newModel = ""
    @State private var filmID = FilmStockCatalog.all[0].id
    @State private var date = Date()
    @State private var place = ""
    @State private var lab = ""

    var body: some View {
        NavigationStack {
            Form {
                Section("카메라") {
                    if cameras.contains(where: { $0.deletedAt == nil }) {
                        Picker("카메라", selection: $cameraID) {
                            Text("새 카메라").tag(UUID?.none)
                            ForEach(cameras.filter { $0.deletedAt == nil }) { Text($0.displayName).tag(Optional($0.id)) }
                        }
                    }
                    if cameraID == nil {
                        TextField("제조사", text: $newBrand)
                        TextField("모델", text: $newModel)
                    }
                }
                Section("필름") {
                    Picker("필름", selection: $filmID) {
                        ForEach(FilmStockCatalog.allIncludingCustom) { Text($0.displayName).tag($0.id) }
                    }
                }
                Section("촬영") {
                    DatePicker("촬영일", selection: $date)
                    TextField("장소 (선택)", text: $place)
                    LabField(lab: $lab)
                }
            }
            .formStyle(.grouped)
            .filmKeyboard()
            .rollPaywall()
            .navigationTitle("새 롤")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("취소") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("다음") { Task { await create() } }
                        .disabled(cameraID == nil && (newBrand.nilIfBlank == nil || newModel.nilIfBlank == nil))
                }
            }
            .task { await Subscriptions.shared.refreshEntitlement() }
        }
    }

    private func create() async {
        await Subscriptions.shared.refreshEntitlement()
        guard Subscriptions.shared.allowNewRoll(in: context) else { return }
        let camera: CameraItem
        if let id = cameraID, let found = cameras.first(where: { $0.id == id }) {
            camera = found
        } else {
            camera = CameraItem(brand: newBrand.nilIfBlank ?? "", model: newModel.nilIfBlank ?? "")
            context.insert(camera)
        }
        let roll = RollItem(camera: camera, lens: nil, filmStockID: filmID)
        context.insert(roll)
        Subscriptions.shared.noteRollCreated(in: context)
        roll.loadedAt = date
        roll.shootingDays = [ShootingDay(startedAt: date)]
        if let place = place.nilIfBlank { roll.locations = [LocationSegment(startFrame: 1, name: place)] }
        LabMemory.remember(lab)
        roll.labName = lab.nilIfBlank
        roll.status = .atLab
        onCreate(roll)
        dismiss()
    }
}
