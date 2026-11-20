import SwiftUI
import SwiftData
import FilmScanCore

struct RollDetailView: View {
    /// 컷 기록: 촬영 중이거나 상세 기록을 남긴 롤
    private var showShots: Bool { roll.status == .loaded || !roll.meterShots.isEmpty }
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
    /// 현상소 창을 열 때 아직 촬영 중이었는지. 저장해서 맡긴 경우에만 현상 스캔으로 넘어간다.
    @State private var dropOffWasLoaded = false
    /// 사진 앱 정보 맞추기 결과 (잠깐 보여 준다)
    @State private var photoNote: String?
    @State private var photoTask: Task<Void, Never>?
    @State private var showContactSheet = false
    @State private var showFramePrint = false
    @State private var shotEdit: Int?
    @State private var viewing: ViewerTarget?
    @State private var confirmDelete = false
    @State private var recording = false
    @State private var pickingCamera = false
    @State private var editingLab = false
    @State private var confirmReverse = false
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

            // 다음에 할 일을 맨 위에 크게: 상세 기록 / 현상소 고르기 / 스캔 불러오기
            if roll.status == .loaded {
                Section {
                    Button { recording = true } label: {
                        // 아이콘 없이 글자만 가운데 (웹·갤럭시 버튼과 같음)
                        Text("상세 기록").font(.headline)
                            .frame(maxWidth: .infinity, alignment: .center).padding(.vertical, 8)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(Theme.safelight)
                    .listRowBackground(Color.clear)
                    .listRowInsets(EdgeInsets())
                }
            }
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


            if roll.status == .imported, !(roll.frames ?? []).isEmpty {
                Section {
                    VStack(spacing: 10) {
                        Button { showContactSheet = true } label: {
                            Label("밀착 인화지로 보기", systemImage: "square.grid.3x3").frame(maxWidth: .infinity)
                        }
                        .tint(Theme.safelight)
                        if Features.framePrint {
                            Button { showFramePrint = true } label: {
                                Label("프레임 만들기", systemImage: "rectangle.inset.filled").frame(maxWidth: .infinity)
                            }
                            .tint(Theme.safelight)
                        }
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

            if showShots { shotsSection }

            // 상세 기록이 있으면 컷마다 시간·장소가 있어 촬영일·장소 칸은 따로 두지 않는다
            if roll.meterShots.isEmpty {
            Section {
                ForEach(roll.daysInFrameOrder) { day in
                    Button { editingDay = day } label: {
                        LabeledContent(Fmt.dayTime.string(from: day.startedAt),
                                       value: dayRange(day))
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

            if roll.meterShots.isEmpty {
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
                if roll.locations.contains(where: { $0.point == nil && !$0.name.isEmpty }) {
                    Text("주황색 장소는 좌표가 없어 사진에 위치가 기록되지 않아요. 눌러서 장소를 검색해 주세요.")
                }
            }
            }

            if showsScanSection {
            Section("현상 · 스캔") {
                Button { editingLab = true } label: {
                    LabeledContent("현상소") {
                        HStack(spacing: 6) {
                            Text(roll.labName?.nilIfBlank ?? "없음")
                            Image(systemName: "chevron.right").font(.caption.weight(.semibold)).foregroundStyle(.tertiary)
                        }
                    }
                }
                .tint(.primary)
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

            // 정리: 태그 · 프로젝트 · 메모
            TagField(tags: Binding(get: { roll.tags }, set: { roll.tags = $0 }))
                .disabled(showDropOff)

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

            if roll.status != .atLab {
                Section { statusActions }
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
                    Button("카메라 바꾸기", systemImage: "camera") { pickingCamera = true }
                    Button("현상소 수정", systemImage: "building.2") { editingLab = true }
                    if (roll.frames ?? []).count > 1 {
                        Button("컷 순서 뒤집기", systemImage: "arrow.up.arrow.down") { confirmReverse = true }
                    }
                    Button("롤 삭제", systemImage: "trash", role: .destructive) { confirmDelete = true }
                }
            }
        }
        .sheet(isPresented: $pickingCamera) {
            RollCameraPicker(roll: roll) { changed in
                // 사진 앱에 저장한 사진도 새 카메라 정보로 다시 쓴다
                guard changed else { return }
                rewritePhotos()
            }
        }
        .sheet(isPresented: $editingLab) {
            LabEditView(roll: roll) { changed in if changed { rewritePhotos() } }
        }
        .confirmationDialog("컷 순서를 거꾸로 바꿀까요? 마지막 컷이 1번이 돼요. 사진 앱 사진도 새 순서로 다시 넣어요.",
                            isPresented: $confirmReverse, titleVisibility: .visible) {
            Button("뒤집기") {
                photoTask?.cancel()
                photoTask = Task {
                    let hasPhotos = (roll.frames ?? []).contains { $0.assetIdentifier != nil }
                    let r = await RollImporter.reverseOrder(of: roll)
                    withAnimation { photoNote = !hasPhotos ? "컷 순서를 뒤집었어요" : photoResultText(r) }
                    try? await Task.sleep(for: .seconds(2.5))
                    withAnimation { photoNote = nil }
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
        .onChange(of: showDropOff) { _, open in
            if open { dropOffWasLoaded = roll.status == .loaded }
        }
        #if os(iOS)
        .fullScreenCover(isPresented: $recording) { RollManualRecordView(roll: roll) }
        #endif
        .sheet(isPresented: Binding(get: { shotEdit != nil }, set: { if !$0 { shotEdit = nil } })) {
            if let shotEdit {
                #if os(iOS)
                RollShotDialEditor(roll: roll, pos: shotEdit)
                #else
                FrameShotEditView(roll: roll, pos: shotEdit)
                #endif
            }
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
        .confirmationDialog("이 롤 기록을 삭제할까요? 24시간 안에는 설정에서 되돌릴 수 있어요. '기록만 삭제'는 사진 앱 사진을 남겨요.",
                            isPresented: $confirmDelete, titleVisibility: .visible) {
            Button(roll.photoAssetIDs.isEmpty ? "삭제" : "기록만 삭제", role: .destructive) {
                roll.deletedAt = Date()
                leaveAfterDelete()
            }
            if !roll.photoAssetIDs.isEmpty {
                Button("사진 앱 사진까지 삭제", role: .destructive) {
                    Task { if await roll.deleteWithPhotos() { leaveAfterDelete() } }
                }
            }
        }
    }

    /// 확인 창이 닫힌 뒤 그 탭 첫 목록으로 (롤 보관함 안쪽에서 열었어도 맨 앞으로)
    private func leaveAfterDelete() {
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
            router.rollsPath = NavigationPath()
            dismiss()
        }
    }

    /// 컷 번호 순서 (역순 감기여도 1번부터)
    private func byNumber(_ list: [MeterShot]) -> [MeterShot] {
        let prewind = roll.meterPrewind == true
        func n(_ s: MeterShot) -> Int { Int(MeterShot.frameTitle(s.pos, prewind: prewind).filter(\.isNumber)) ?? s.pos }
        // 큰 번호(최근)부터: 36, 35, 34 … (웹·갤럭시와 같음)
        return list.sorted { n($0) > n($1) }
    }

    /// 롤 화면의 컷 기록: 촬영 중이면 최근 5컷(넘으면 전체 보기), 다 찍은 롤은 1번부터 전부
    private var shotsSection: some View {
        let shots = byNumber(roll.meterShots)
        let recent = roll.status == .loaded && shots.count > 6 ? byNumber(Array(roll.meterShots.sorted { $0.order > $1.order }.prefix(5))) : shots
        return Section {
            if shots.isEmpty {
                Text("상세 기록에서 찍으면 여기에 쌓여요.").foregroundStyle(.secondary)
            }
            ForEach(recent, id: \.pos) { shot in shotRow(shot) }
            if shots.count > recent.count {
                NavigationLink("전체 \(shots.count)컷 보기") { RollShotsView(roll: roll) }
            }
        } header: {
            HStack {
                Text("컷 기록")
                Spacer()
                if !shots.isEmpty { Text("\(shots.count) / \(roll.format.framesPerRoll)컷").textCase(nil) }
            }
        }
    }

    private func shotRow(_ shot: MeterShot) -> some View {
        Button { shotEdit = shot.pos } label: {
            HStack(alignment: .firstTextBaseline, spacing: 12) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(MeterShot.frameTitle(shot.pos, prewind: roll.meterPrewind == true))
                    Text(shot.rowMeta).font(.caption).foregroundStyle(.secondary)
                }
                Spacer(minLength: 8)
                Text(shot.exposureLine).foregroundStyle(.secondary).multilineTextAlignment(.trailing)
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
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
            // 이름만 있고 좌표가 없으면 주황(검색해 달라는 뜻), 장소 미상은 회색
            let unknown = seg.name.isEmpty && seg.point == nil
            Image(systemName: unknown ? "questionmark.circle" : seg.point == nil ? "mappin.slash" : "mappin.circle.fill")
                .foregroundStyle(unknown ? .secondary : seg.point == nil ? Color.orange : Theme.safelight)
            VStack(alignment: .leading, spacing: 2) {
                Text(seg.name.isEmpty ? "장소 미상" : seg.name)
                if let memo = seg.memo { Text(memo).font(.caption).foregroundStyle(.secondary) }
                if let w = seg.weather { Text(w.summary).font(.caption).foregroundStyle(.secondary) }
                if seg.point == nil, !unknown { Text("좌표 없음").font(.caption2).foregroundStyle(.orange) }
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
            Button("다시 촬영 중으로", systemImage: "arrow.uturn.backward") { roll.status = .loaded }
        case .atLab:
            EmptyView()
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
        // 상세 기록 컷의 시간·장소·렌즈·ISO를 고쳐도 사진 정보를 다시 쓴다
        let shots = roll.meterShots.map { "\($0.pos)/\($0.at ?? "")/\($0.place ?? "")/\($0.lat ?? 0),\($0.lon ?? 0)/\($0.lensId ?? "")/\($0.iso ?? 0)" }
        return (days + ["|"] + places + ["|"] + shots).joined(separator: ";")
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

    /// 롤 정보(카메라·현상소)를 바꾼 뒤 사진 앱 사진도 새 정보로 다시 넣는다
    private func rewritePhotos() {
        guard (roll.frames ?? []).contains(where: { $0.assetIdentifier != nil }) else { return }
        photoTask?.cancel()
        photoTask = Task {
            let r = await RollImporter.rewritePhotos(for: roll)
            withAnimation { photoNote = photoResultText(r) }
            try? await Task.sleep(for: .seconds(2.5))
            withAnimation { photoNote = nil }
        }
    }

    private func photoResultText(_ r: (count: Int, removedOld: Bool)) -> String {
        r.count == 0 ? "사진 앱 사진은 바꾸지 못했어요"
            : r.removedOld ? "사진 앱 사진도 바꿨어요 (\(r.count)장)" : "새 정보로 \(r.count)장 넣었어요 · 예전 사진은 남아 있어요"
    }

    private var showsScanSection: Bool {
        roll.status == .atLab || roll.status == .imported
            || roll.labName?.nilIfBlank != nil
            || roll.droppedOffAt != nil
            || roll.scannerName?.nilIfBlank != nil
            || Resolution.text(width: roll.scanPixelWidth, height: roll.scanPixelHeight) != nil
            || roll.frameCount != nil
            || roll.importedAt != nil
    }

    /// 현상 맡기기를 저장하지 않고 닫으면 아무것도 바꾸지 않는다 (촬영 중이던 롤은 그대로).
    /// 촬영 중이던 롤을 맡겼으면 현상 스캔으로 넘어간다.
    private func endShootingIfNeeded() {
        if dropOffWasLoaded, roll.status == .atLab {
            router.tab = .pending
            dismiss()
        }
        dropOffWasLoaded = false
    }

    private func deleteDay(_ day: ShootingDay) {
        roll.shootingDays.removeAll { $0.id == day.id }
    }

    private func deletePlace(_ seg: LocationSegment) {
        roll.locations.removeAll { $0.id == seg.id }
    }

    /// 촬영일이 덮는 컷 "1–18번" (시작 컷을 모르는 날은 고르게 나눈 값이라 "약")
    private func dayRange(_ day: ShootingDay) -> String {
        let total = roll.frameCount ?? (roll.frames ?? []).map(\.index).max() ?? roll.format.nominalFrameCount
        let resolved = RangeEdit.resolvedDays(roll.shootingDays, frameCount: total)
        guard let i = resolved.firstIndex(where: { $0.id == day.id }), let start = resolved[i].startFrame else { return "" }
        let r = RangeEdit.span(start: start, nextStart: i + 1 < resolved.count ? resolved[i + 1].startFrame : nil, frameCount: total)
        let text = r.count == 1 ? "\(r.lowerBound)번" : "\(r.lowerBound)–\(r.upperBound)번"
        return day.startFrame == nil && i > 0 ? "약 \(text)" : text
    }

    /// "1–12번" 같은 구간 표시
    private var placeRanges: [(segment: LocationSegment, range: String)] {
        let list = roll.sortedLocations
        let total: Int? = roll.frameCount ?? (roll.frames ?? []).map(\.index).max() ?? roll.format.nominalFrameCount
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

/// 컷 기록 전체 (찍은 순서). 누르면 그 컷 고치기
struct RollShotsView: View {
    @Bindable var roll: RollItem
    @State private var shotEdit: Int?

    var body: some View {
        List {
            meterSummary
            meterShots
        }
        .scrollContentBackground(.hidden)
        .background(Theme.paper)
        .navigationTitle("컷 기록")
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        #endif
        .sheet(isPresented: Binding(get: { shotEdit != nil }, set: { if !$0 { shotEdit = nil } })) {
            if let shotEdit {
                #if os(iOS)
                RollShotDialEditor(roll: roll, pos: shotEdit)
                #else
                FrameShotEditView(roll: roll, pos: shotEdit)
                #endif
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
        // 마지막에 찍은 컷부터 (웹·갤럭시와 같음)
        let shots = roll.meterShots.sorted { ($0.order, $0.pos) > ($1.order, $1.pos) }
        let prewind = roll.meterPrewind == true
        return Section("찍은 순서 · 최근부터") {
            if shots.isEmpty {
                Text("아직 기록한 컷이 없어요. 상세 기록에서 찍으면 여기에 쌓여요.")
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
}

/// 롤 카메라 바꾸기: 내 장비 카메라 중에서. 촬영 중인 롤은 다른 필름이 든 카메라로는 못 옮긴다.
/// 마운트가 다르거나 렌즈 고정형으로 바꾸면 롤 렌즈 기록은 비운다
struct RollCameraPicker: View {
    @Bindable var roll: RollItem
    var onDone: (Bool) -> Void
    @Environment(\.dismiss) private var dismiss
    @Query(sort: \CameraItem.sortOrder) private var cameras: [CameraItem]

    var body: some View {
        NavigationStack {
            List {
                Section {
                    ForEach(cameras.filter { $0.deletedAt == nil }) { c in
                        let busy = roll.status == .loaded && c.id != roll.camera?.id && c.loadedRoll != nil
                        Button { pick(c) } label: {
                            HStack(spacing: 12) {
                                CameraCoverView(camera: c).frame(width: 56, height: 40)
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(c.displayName)
                                    if busy { Text("다른 필름이 들어 있어요").font(.caption).foregroundStyle(.secondary) }
                                }
                                Spacer()
                                if c.id == roll.camera?.id { Image(systemName: "checkmark").foregroundStyle(Theme.safelight) }
                            }
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                        .disabled(busy)
                        .opacity(busy ? 0.45 : 1)
                    }
                } footer: {
                    Text("사진 앱에 저장한 사진의 카메라 정보도 함께 바꿔요.")
                }
            }
            .navigationTitle("카메라 바꾸기")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("취소") { dismiss() } } }
        }
    }

    private func pick(_ c: CameraItem) {
        let changed = c.id != roll.camera?.id
        if changed {
            if c.fixedLensName != nil || (roll.lens.map { $0.mount.caseInsensitiveCompare(c.mount ?? "") != .orderedSame } ?? false) {
                roll.lens = nil
                roll.lensChanges = []
            }
            roll.camera = c
            roll.rememberCamera()
        }
        dismiss()
        onDone(changed)
    }
}


/// 현상소만 고친다
private struct LabEditView: View {
    @Bindable var roll: RollItem
    var onSave: (_ changed: Bool) -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var lab = ""

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    LabField(lab: $lab)
                } footer: {
                    if (roll.frames ?? []).contains(where: { $0.assetIdentifier != nil }) {
                        Text("사진 앱 사진의 현상소 정보도 바꿔요.")
                    }
                }
            }
            .formStyle(.grouped)
            .filmKeyboard()
            .navigationTitle("현상소")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("취소") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("저장") {
                        let new = lab.trimmingCharacters(in: .whitespacesAndNewlines).nilIfBlank
                        let changed = new != roll.labName?.nilIfBlank
                        LabMemory.remember(lab)
                        roll.labName = new
                        dismiss()
                        onSave(changed)
                    }
                }
            }
            .onAppear { lab = roll.labName ?? "" }
        }
        .presentationDetents([.medium, .large])
    }
}
