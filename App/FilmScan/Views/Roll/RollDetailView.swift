import SwiftUI
import SwiftData
import FilmScanCore

struct RollDetailView: View {
    @Bindable var roll: RollItem
    @Environment(Router.self) private var router
    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss
    @Environment(\.openURL) private var openURL

    @State private var editingDay: ShootingDay?
    @State private var editingTitle = false
    @State private var titleDraft = ""
    @State private var addingDay = false
    @State private var editingPlace: LocationSegment?
    @State private var addingPlace = false
    @State private var lensEdit: LensEditTarget?
    @Query private var allLenses: [LensItem]

    enum LensEditTarget: Identifiable {
        case first, new, change(LensChange)
        var id: String {
            switch self {
            case .first: "first"
            case .new: "new"
            case .change(let c): c.id.uuidString
            }
        }
    }

    private func lensName(_ id: UUID) -> String { allLenses.first { $0.id == id }?.displayName ?? "렌즈 모름" }
    @State private var showDropOff = false
    /// 사진 앱 정보 맞추기 결과 (잠깐 보여 준다)
    @State private var photoNote: String?
    @State private var photoTask: Task<Void, Never>?
    @State private var showContactSheet = false
    @State private var showFramePrint = false
    @State private var shotEdit: Int?
    @State private var viewing: ViewerTarget?
    @State private var confirmDelete = false
    @State private var detailTab: DetailTab

    init(roll: RollItem) {
        self.roll = roll
        _detailTab = State(initialValue: .log)
    }

    private enum DetailTab: String, CaseIterable {
        case log = "기록"
        case meter = "노출"
    }
    /// 목록 가장자리 여백 (필름을 화면 끝까지 늘이려고 잰다)
    @State private var stripInset: CGFloat = 16

    struct ViewerTarget: Identifiable {
        let index: Int
        var id: Int { index }
    }

    var body: some View {
        List {
            // 맨 위 큰 제목 바로 아래: 제목 편집 (비우면 필름 이름)
            Section {
                Button {
                    titleDraft = roll.customTitle ?? ""
                    editingTitle = true
                } label: {
                    Label("제목 편집", systemImage: "pencil")
                        .font(.footnote.weight(.semibold)).foregroundStyle(.secondary)
                        .padding(.horizontal, 10).padding(.vertical, 5)
                        .background(Color(.tertiarySystemFill), in: Capsule())
                }
                .buttonStyle(.plain)
                .listRowBackground(Color.clear)
                .listRowInsets(EdgeInsets(top: 0, leading: 16, bottom: 0, trailing: 16))
            }
            .listSectionSpacing(4)
            header

            // 다음에 할 일을 맨 위에 크게: 현상소 고르기 / 스캔 불러오기
            if roll.status == .finished || roll.status == .atLab {
                Section {
                    Button {
                        if roll.status == .atLab { router.pickZip(for: roll) } else { showDropOff = true }
                    } label: {
                        Label(roll.status == .atLab ? "스캔 불러오기" : "현상소 고르기",
                              systemImage: roll.status == .atLab ? "square.and.arrow.down" : "shippingbox")
                            .font(.headline)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 8)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(Theme.safelight)
                    .listRowBackground(Color.clear)
                    .listRowInsets(EdgeInsets())
                } footer: {
                    Text(roll.status == .atLab ? "현상소에서 받은 zip이나 사진을 골라요." : "고르면 스캔 대기로 넘어가요.")
                }
            }

            TagField(tags: Binding(get: { roll.tags }, set: { roll.tags = $0 }))
                .disabled(showDropOff)

            if Features.meter {
            Section {
                Picker("보기", selection: $detailTab) {
                    ForEach(DetailTab.allCases, id: \.self) { Text($0.rawValue).tag($0) }
                }
                .pickerStyle(.segmented)
                .listRowBackground(Color.clear)
                .listRowInsets(EdgeInsets(top: 4, leading: 0, bottom: 4, trailing: 0))
            }
            }

            if Features.meter && detailTab == .meter {
                meterSummary
                meterShots
            } else if roll.status == .imported, !(roll.frames ?? []).isEmpty {
                Section {
                    VStack(spacing: 10) {
                        Button { showContactSheet = true } label: {
                            Label("밀착 인화지로 보기", systemImage: "square.grid.3x3").frame(maxWidth: .infinity)
                        }
                        .tint(Theme.safelight)
                        Button { showFramePrint = true } label: {
                            Label("프레임 만들기", systemImage: "rectangle.inset.filled").frame(maxWidth: .infinity)
                        }
                        .tint(Theme.safelight)
                        Button { openPhotos() } label: {
                            Label("사진 앱에서 보기", systemImage: "photo.on.rectangle").frame(maxWidth: .infinity)
                        }
                        .tint(.secondary)
                    }
                    .buttonStyle(.bordered)
                    .tint(Theme.safelight)
                    .listRowBackground(Color.clear)
                    .listRowSeparator(.hidden)
                    .listRowInsets(EdgeInsets(top: 4, leading: 0, bottom: 4, trailing: 0))
                } header: {
                    // 상자 없이 화면 끝에서 끝까지 이어지는 필름 (섹션 머리는 모서리가 잘리지 않는다)
                    FilmStripView(roll: roll) { frame in
                        viewing = ViewerTarget(index: roll.sortedFrames.firstIndex(where: { $0.index == frame.index }) ?? 0)
                    }
                    .padding(.horizontal, -stripInset)
                    .onGeometryChange(for: CGFloat.self) { $0.frame(in: .global).minX } action: { stripInset = max(0, $0) }
                    .textCase(nil)
                    .padding(.bottom, 6)
                }
            }

            if !Features.meter || detailTab == .log {
            Section {
                ForEach(roll.sortedDays) { day in
                    Button { editingDay = day } label: {
                        LabeledContent(Fmt.dayTime.string(from: day.startedAt),
                                       value: day.startFrame.map { "\($0)번부터" } ?? "컷 미확인")
                    }
                    .buttonStyle(.plain)
                    .contextMenu {
                        Button("수정", systemImage: "pencil") { editingDay = day }
                        Button("삭제", systemImage: "trash", role: .destructive) { deleteDay(day) }
                    }
                    .swipeActions {
                        Button("삭제", systemImage: "trash", role: .destructive) { deleteDay(day) }
                    }
                }
                Button("촬영일 추가", systemImage: "plus") { addingDay = true }
            } header: {
                Text("촬영일")
            } footer: {
                if !roll.shootingDays.isEmpty { Text("눌러서 수정하거나 삭제할 수 있어요.") }
            }

            if let camera = roll.camera, camera.isInterchangeable {
                Section {
                    Button { lensEdit = .first } label: {
                        LabeledContent(roll.lens?.displayName ?? "렌즈 고르기", value: "1번부터")
                    }
                    .buttonStyle(.plain)
                    ForEach(roll.lensChanges.sorted { $0.startFrame < $1.startFrame }) { change in
                        Button { lensEdit = .change(change) } label: {
                            LabeledContent(lensName(change.lensID), value: "\(change.startFrame)번부터")
                        }
                        .buttonStyle(.plain)
                        .swipeActions {
                            Button("삭제", systemImage: "trash", role: .destructive) {
                                roll.lensChanges.removeAll { $0.id == change.id }
                            }
                        }
                    }
                    Button("렌즈 바꿔 낌", systemImage: "plus") { lensEdit = .new }
                } header: {
                    Text("렌즈")
                } footer: {
                    Text("중간에 렌즈를 바꿨다면 몇 번 컷부터인지 남겨 두세요. 사진마다 그때 렌즈가 기록돼요.")
                }
            }

            Section {
                ForEach(placeRanges, id: \.segment.id) { item in
                    Button { editingPlace = item.segment } label: { placeRow(item.segment, range: item.range) }
                        .buttonStyle(.plain)
                        .contextMenu {
                            Button("수정", systemImage: "pencil") { editingPlace = item.segment }
                            Button("삭제", systemImage: "trash", role: .destructive) { deletePlace(item.segment) }
                        }
                        .swipeActions {
                            Button("삭제", systemImage: "trash", role: .destructive) { deletePlace(item.segment) }
                        }
                }
                Button("장소 추가", systemImage: "plus") { addingPlace = true }
            } header: {
                Text("장소")
            } footer: {
                if roll.locations.contains(where: { $0.point == nil }) {
                    Text("주황색 장소는 좌표가 없어 사진에 위치가 기록되지 않아요. 눌러서 장소를 검색해 주세요.")
                }
            }

            if showsScanSection {
            Section("현상 · 스캔") {
                if let lab = roll.labName?.nilIfBlank { LabeledContent("현상소", value: lab) }
                if let d = roll.droppedOffAt { LabeledContent("맡긴 날", value: Fmt.day.string(from: d)) }
                if let s = roll.scannerName { LabeledContent("스캐너", value: s) }
                if let r = Resolution.text(width: roll.scanPixelWidth, height: roll.scanPixelHeight) {
                    LabeledContent("해상도", value: r)
                }
                if let n = roll.frameCount {
                    LabeledContent("스캔", value: [String("\(n)장"), roll.scanFormat, Resolution.bytes(roll.scanBytes)]
                        .compactMap { $0 }.joined(separator: " · "))
                }
                if let d = roll.importedAt { LabeledContent("불러온 날", value: Fmt.day.string(from: d)) }
            }
            }

            Section {
                statusActions
            }

            RollProjectsSection(roll: roll)


            Section {
                TextField("메모", text: Binding(get: { roll.note ?? "" }, set: { roll.note = $0.nilIfBlank }), axis: .vertical)
                    .disabled(showDropOff)
            } header: {
                HStack {
                    Text("메모")
                    Spacer()
                    Toggle("목록에서 표시하기", isOn: Binding(get: { roll.noteInList }, set: { roll.noteInList = $0 }))
                        .font(.footnote).textCase(nil).fixedSize().tint(Theme.safelight)
                }
            }
            }
        }
        .scrollContentBackground(.hidden)
        // 촬영일·장소를 바꾸면 사진 앱에 저장한 사진의 날짜·위치도 따라 바꾼다
        .onChange(of: photoInfoKey) { _, _ in refreshPhotoInfo(manual: false) }
        .overlay(alignment: .bottom) {
            if let photoNote {
                Text(photoNote)
                    .font(.footnote.weight(.semibold))
                    .padding(.horizontal, 16).padding(.vertical, 10)
                    .background(.regularMaterial, in: Capsule())
                    .padding(.bottom, 24)
                    .transition(.opacity)
            }
        }
        .background(Theme.paper)
        .navigationTitle(roll.displayTitle)
        .alert("롤 제목", isPresented: $editingTitle) {
            TextField(roll.filmName, text: $titleDraft)
            Button("취소", role: .cancel) {}
            Button("저장") { roll.customTitle = titleDraft.trimmingCharacters(in: .whitespacesAndNewlines).nilIfBlank }
        } message: {
            Text("비워 두면 필름 이름으로 보여요.")
        }
        .toolbar {
            ToolbarItem {
                Button {
                    roll.isFavorite.toggle()
                } label: {
                    Image(systemName: roll.isFavorite ? "star.fill" : "star")
                        .foregroundStyle(roll.isFavorite ? .yellow : .primary)
                }
                .accessibilityLabel(roll.isFavorite ? "즐겨찾기 해제" : "즐겨찾기")
            }
            ToolbarItem {
                Menu("더 보기", systemImage: "ellipsis.circle") {
                    Button("롤 삭제", systemImage: "trash", role: .destructive) { confirmDelete = true }
                }
            }
        }
        .sheet(isPresented: $addingDay) { DayEditView(roll: roll, day: nil) }
        .sheet(item: $editingDay) { DayEditView(roll: roll, day: $0) }
        .sheet(isPresented: $addingPlace) { PlaceEditView(roll: roll, segment: nil) }
        .sheet(item: $lensEdit) { target in
            switch target {
            case .first: LensChangeEditView(roll: roll, change: nil, isFirst: true)
            case .new: LensChangeEditView(roll: roll, change: nil, isFirst: false)
            case .change(let c): LensChangeEditView(roll: roll, change: c, isFirst: false)
            }
        }
        .sheet(item: $editingPlace) { PlaceEditView(roll: roll, segment: $0) }
        .sheet(isPresented: $showDropOff, onDismiss: endShootingIfNeeded) { LabDropOffView(roll: roll) }
        .sheet(isPresented: Binding(get: { shotEdit != nil }, set: { if !$0 { shotEdit = nil } })) {
            if let shotEdit { FrameShotEditView(roll: roll, pos: shotEdit) }
        }
        #if os(iOS)
        .fullScreenCover(item: $viewing) { FrameViewer(roll: roll, index: $0.index) }
        .fullScreenCover(isPresented: $showContactSheet) { ContactSheetView(roll: roll) }
        .fullScreenCover(isPresented: $showFramePrint) { FramePrintView(roll: roll) }
        #else
        .sheet(item: $viewing) { FrameViewer(roll: roll, index: $0.index) }
        .sheet(isPresented: $showContactSheet) { ContactSheetView(roll: roll) }
        .sheet(isPresented: $showFramePrint) { FramePrintView(roll: roll) }
        #endif
        .confirmationDialog("이 롤 기록을 삭제할까요? 24시간 안에는 설정에서 되돌릴 수 있어요. 사진 앱에 저장된 사진은 그대로 남아요.",
                            isPresented: $confirmDelete, titleVisibility: .visible) {
            Button("삭제", role: .destructive) {
                roll.deletedAt = Date()
                dismiss()
            }
        }
    }

    private var meterSummary: some View {
        let shots = roll.meterShots
        let capacity = roll.format.framesPerRoll
        let percent = capacity > 0 ? Int((Double(shots.count) / Double(capacity) * 100).rounded()) : 0
        let prewind = roll.meterPrewind == true
        return Section {
            VStack(alignment: .leading, spacing: 8) {
                HStack(alignment: .firstTextBaseline) {
                    Text("\(percent)%").font(.largeTitle.bold().monospacedDigit())
                    Spacer()
                    Text("\(shots.count) / \(capacity)컷").foregroundStyle(.secondary)
                }
                ProgressView(value: Double(min(shots.count, capacity)), total: Double(max(capacity, 1)))
                    .tint(Theme.safelight)
                if shots.count > capacity {
                    Text("\(capacity)컷을 넘겨 \(shots.count - capacity)장 더 찍었어요.")
                        .font(.caption).foregroundStyle(.secondary)
                }
            }
        } footer: {
            Text((prewind ? "역순으로 기록 중이에요. " : "") + "스캔을 불러오면 1번 칸의 기록이 첫 장에, 같은 번호끼리 붙어요.")
        }
    }

    private var meterShots: some View {
        let shots = roll.meterShots.sorted { ($0.order, $0.pos) < ($1.order, $1.pos) }
        let prewind = roll.meterPrewind == true
        return Section("찍은 순서") {
            if shots.isEmpty {
                Text("아직 기록한 컷이 없어요. 노출계에서 찍으면 여기에 쌓여요.")
                    .foregroundStyle(.secondary)
            }
            ForEach(shots, id: \.pos) { shot in
                Button { shotEdit = shot.pos } label: {
                    HStack(alignment: .firstTextBaseline, spacing: 12) {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("\(shot.order)번째")
                            Text(shot.sequenceMeta(prewind: prewind)).font(.caption).foregroundStyle(.secondary)
                        }
                        Spacer(minLength: 8)
                        Text(shot.exposureLine).foregroundStyle(.secondary).multilineTextAlignment(.trailing)
                    }
                }
                .buttonStyle(.plain)
            }
        }
    }

    private var header: some View {
        Section {
            HStack(spacing: 16) {
                FilmCanisterView(stock: roll.film, format: roll.format).frame(width: 96, height: 96)
                VStack(alignment: .leading, spacing: 5) {
                    StatusBadge(status: roll.status)
                    Text(roll.filmName + (roll.shotISO.map { " @ ISO \($0)" } ?? "")).font(.title3.bold())
                    Text(roll.cameraName).font(.subheadline)
                    if let lens = roll.lens?.displayName ?? roll.fixedLensLabel {
                        Text(lens).font(.caption).foregroundStyle(.secondary)
                    }
                    Text(roll.dateRangeText).font(.caption).foregroundStyle(.secondary)
                }
            }
            .listRowBackground(Color.clear)
        }
    }

    private func placeRow(_ seg: LocationSegment, range: String) -> some View {
        HStack(alignment: .top) {
            Image(systemName: seg.point == nil ? "mappin.slash" : "mappin.circle.fill")
                .foregroundStyle(seg.point == nil ? .orange : Theme.safelight)
            VStack(alignment: .leading, spacing: 2) {
                Text(seg.name.isEmpty ? "장소 없음" : seg.name)
                if let memo = seg.memo { Text(memo).font(.caption).foregroundStyle(.secondary) }
                if let w = seg.weather { Text(w.summary).font(.caption).foregroundStyle(.secondary) }
                if seg.point == nil { Text("좌표 없음").font(.caption2).foregroundStyle(.orange) }
            }
            Spacer()
            Text(range).foregroundStyle(.secondary)
        }
        .contentShape(Rectangle())
    }

    @ViewBuilder
    private var statusActions: some View {
        switch roll.status {
        case .loaded:
            Button("촬영 끝내기") { showDropOff = true }
        case .finished:
            Button("현상소 고르기", systemImage: "shippingbox") { showDropOff = true }
            Button("다시 촬영 중으로", systemImage: "arrow.uturn.backward") { roll.status = .loaded }
        case .atLab:
            Button("스캔 불러오기", systemImage: "doc.zipper") { router.pickZip(for: roll) }
        case .imported:
            Button("다시 불러오기", systemImage: "arrow.clockwise") { router.pickZip(for: roll) }
            if (roll.frames ?? []).contains(where: { $0.assetIdentifier != nil }) {
                Button("사진 앱 날짜·위치 다시 맞추기", systemImage: "arrow.triangle.2.circlepath") { refreshPhotoInfo(manual: true) }
            }
        }
    }

    /// 사진 날짜·위치를 정하는 기록만 모은 값 (날씨처럼 사진과 상관없는 변경에는 움직이지 않게)
    private var photoInfoKey: String {
        let days = roll.shootingDays.map { "\($0.startedAt.timeIntervalSince1970)/\($0.startFrame ?? 0)/\($0.timeZoneID)" }
        let places = roll.locations.map { "\($0.startFrame)/\($0.name)/\($0.point?.latitude ?? 0),\($0.point?.longitude ?? 0)" }
        return (days + ["|"] + places).joined(separator: ";")
    }

    private func refreshPhotoInfo(manual: Bool) {
        guard roll.status == .imported, (roll.frames ?? []).contains(where: { $0.assetIdentifier != nil }) else { return }
        photoTask?.cancel()
        photoTask = Task {
            // 여러 칸을 연달아 고칠 때는 다 고친 뒤 한 번만
            if !manual { try? await Task.sleep(for: .seconds(1.5)) }
            guard !Task.isCancelled else { return }
            let n = await RollImporter.refreshPhotoInfo(for: roll)
            withAnimation { photoNote = n > 0 ? "사진 앱 날짜·위치도 바꿨어요 (\(n)장)" : "사진 앱에서 사진을 찾지 못했어요" }
            try? await Task.sleep(for: .seconds(2.5))
            withAnimation { photoNote = nil }
        }
    }

    private var showsScanSection: Bool {
        roll.labName?.nilIfBlank != nil
            || roll.droppedOffAt != nil
            || roll.scannerName?.nilIfBlank != nil
            || Resolution.text(width: roll.scanPixelWidth, height: roll.scanPixelHeight) != nil
            || roll.frameCount != nil
            || roll.importedAt != nil
    }

    /// 현상 맡기기를 저장하지 않고 닫으면 촬영만 끝난 상태로 남긴다.
    private func endShootingIfNeeded() {
        if roll.status == .loaded {
            roll.status = .finished
            roll.finishedAt = Date()
        }
    }

    private func deleteDay(_ day: ShootingDay) {
        roll.shootingDays.removeAll { $0.id == day.id }
    }

    private func deletePlace(_ seg: LocationSegment) {
        roll.locations.removeAll { $0.id == seg.id }
    }

    /// "1–12번" 같은 구간 표시
    private var placeRanges: [(segment: LocationSegment, range: String)] {
        let list = roll.sortedLocations
        let total = roll.frameCount
        return list.enumerated().map { i, seg in
            let end = i + 1 < list.count ? list[i + 1].startFrame - 1 : total
            if let end, end > seg.startFrame { return (seg, "\(seg.startFrame)–\(end)번") }
            if let end, end == seg.startFrame { return (seg, "\(seg.startFrame)번") }
            return (seg, "\(seg.startFrame)번부터")
        }
    }

    private func openPhotos() {
        #if os(iOS)
        openURL(URL(string: "photos-redirect://")!)
        #else
        NSWorkspace.shared.open(URL(fileURLWithPath: "/System/Applications/Photos.app"))
        #endif
    }
}
