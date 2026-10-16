import SwiftUI
import SwiftData
import UniformTypeIdentifiers
import FilmScanCore

/// 촬영 중: 카메라별로 장착된 필름
struct ShootingView: View {
    @Environment(Router.self) private var router
    @Query(filter: #Predicate<RollItem> { $0.statusRaw == "loaded" }, sort: \RollItem.loadedAt, order: .reverse)
    private var rolls: [RollItem]

    private var visible: [RollItem] { rolls.filter { $0.deletedAt == nil } }

    var body: some View {
        List {
            if visible.isEmpty {
                ContentUnavailableView {
                    Label("장착된 필름이 없어요", systemImage: "film")
                } actions: {
                    Button("필름 장착하기") { router.loadFilm() }.buttonStyle(.borderedProminent)
                }
                .listRowBackground(Color.clear)
            }
            ForEach(visible) { roll in
                Section {
                    NavigationLink(value: roll) { LoadedRollCard(roll: roll) }
                    RollQuickActions(roll: roll)
                }
            }
        }
        .scrollContentBackground(.hidden)
        .background(Theme.paper)
        .navigationTitle("촬영 중")
        .navigationDestination(for: RollItem.self) { RollDetailView(roll: $0) }
        .toolbar {
            ToolbarItem { Button("필름 장착하기", systemImage: "plus") { router.loadFilm() } }
        }
    }
}

struct LoadedRollCard: View {
    let roll: RollItem
    @Environment(Router.self) private var router

    var body: some View {
        HStack(spacing: 14) {
            Group {
                if let camera = roll.camera { CameraCoverView(camera: camera) } else { Color.clear }
            }
                .frame(width: 88, height: 64)
                .overlay(alignment: .bottomTrailing) {
                    FilmCanisterView(stock: roll.film, format: roll.format)
                        .frame(width: 40, height: 40)
                        .offset(x: 10, y: 8)
                }
            VStack(alignment: .leading, spacing: 4) {
                Text(roll.cameraName).font(.headline)
                Text(roll.filmName + (roll.shotISO.map { " @ \($0)" } ?? "")).font(.subheadline).foregroundStyle(Theme.safelight)
                Text("\(Fmt.day.string(from: roll.loadedAt)) 장착 · 촬영일 \(roll.shootingDays.count)일")
                    .font(.caption).foregroundStyle(.secondary)
                if router.locatingRollIDs.contains(roll.id) {
                    HStack(spacing: 6) {
                        ProgressView().controlSize(.mini)
                        Text("현재 위치 기록 중…").font(.caption).foregroundStyle(.secondary)
                    }
                } else if let place = roll.sortedLocations.map(\.name).filter({ !$0.isEmpty }).joined(separator: " → ").nilIfBlank {
                    let weather = roll.sortedLocations.last?.weather.map { " · \($0.summary)" } ?? ""
                    Text(place + weather).font(.caption).foregroundStyle(.secondary).lineLimit(1)
                }
            }
        }
        .padding(.vertical, 4)
    }
}

struct RollQuickActions: View {
    let roll: RollItem
    @State private var showPlace = false
    @State private var showDropOff = false
    @State private var showMeter = false
    /// 노출계에서 촬영을 끝냈으면, 노출계가 완전히 닫힌 뒤 현상 맡기기를 연다
    @State private var dropOffAfterMeter = false

    /// 촬영일 추가는 롤 화면에서. 장소가 이미 있으면 촬영 끝내기만.
    /// 촬영 끝내기는 현상 맡기기 창으로 이어진다. 닫으면 촬영 완료로 남긴다.
    var body: some View {
        HStack(spacing: 8) {
            if roll.locations.isEmpty {
                Button("장소 추가", systemImage: "mappin.and.ellipse") { showPlace = true }
                    .buttonStyle(.bordered)
                    .labelStyle(.titleAndIcon)
                    .lineLimit(1)
                    .fixedSize(horizontal: true, vertical: false)
            }
            #if os(iOS)
            Button {
                showDropOff = true
            } label: {
                Text("촬영 끝내기").frame(maxWidth: .infinity)
            }
            .buttonStyle(.bordered)
            Button {
                showMeter = true
            } label: {
                Text("노출계").frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .tint(Theme.safelight)
            #else
            Button {
                showDropOff = true
            } label: {
                Text("촬영 끝내기").frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .tint(Theme.safelight)
            #endif
        }
        .font(.subheadline.weight(.semibold))
        .listRowInsets(EdgeInsets(top: 4, leading: 16, bottom: 12, trailing: 16))
        .sheet(isPresented: $showPlace) { PlaceEditView(roll: roll, segment: nil).filmKeyboard() }
        .sheet(isPresented: $showDropOff, onDismiss: endShootingIfNeeded) { LabDropOffView(roll: roll) }
        #if os(iOS)
        // 노출계에서 촬영을 끝내면 닫히고 나서 현상 맡기기로 이어진다
        .fullScreenCover(isPresented: $showMeter, onDismiss: {
            if dropOffAfterMeter { dropOffAfterMeter = false; showDropOff = true }
        }) {
            MeterView(roll: roll) {
                dropOffAfterMeter = true
                showMeter = false
            }
        }
        #endif
    }

    private func endShootingIfNeeded() {
        if roll.status == .loaded {
            roll.status = .finished
            roll.finishedAt = Date()
        }
    }
}

/// 현상 스캔: 촬영 완료 / 현상 맡긴 롤
struct PendingView: View {
    @Environment(Router.self) private var router
    @Query(filter: #Predicate<RollItem> { $0.statusRaw == "finished" || $0.statusRaw == "atLab" },
           sort: \RollItem.loadedAt, order: .reverse)
    private var rolls: [RollItem]
    @State private var dropOff: RollItem?
    @State private var showArchive = false
    @State private var showChoice = false
    @State private var showMultiZip = false
    @State private var queue: [ImportQueueStore.Job] = ImportQueueStore.load()
    @State private var presented: ImportQueueStore.Job?
    /// 지금 창이 닫힌 뒤에 열 파일. 닫히는 중에 바로 열면 창이 도로 꺼진다.
    @State private var followUp: ImportQueueStore.Job?
    @State private var confirmClearQueue = false

    var body: some View {
        List {
            if !queue.isEmpty {
                Section {
                    ForEach(queue) { job in
                        Button {
                            presented = job
                        } label: {
                            HStack {
                                Image(systemName: "doc.zipper")
                                Text(job.name).lineLimit(1)
                                Spacer()
                                if presented?.id == job.id {
                                    Text("지금").font(.caption.weight(.semibold)).foregroundStyle(Theme.safelight)
                                }
                                Button { removeJob(job) } label: {
                                    Image(systemName: "trash")
                                        .font(.subheadline)
                                        .foregroundStyle(.red)
                                        .frame(width: 34, height: 34)
                                        .background(Color.red.opacity(0.12), in: Circle())
                                }
                                .buttonStyle(.borderless)
                                .accessibilityLabel("\(job.name) 대기열에서 삭제")
                            }
                        }
                        .swipeActions {
                            Button("삭제", role: .destructive) { removeJob(job) }
                        }
                    }
                } header: {
                    HStack {
                        Text("가져오기 대기열 · \(queue.count)")
                        Spacer()
                        Button("모두 비우기", role: .destructive) { confirmClearQueue = true }
                            .font(.footnote.weight(.semibold))
                            .textCase(nil)
                    }
                } footer: {
                    Text("닫아도 여기 남아요. 줄을 누르면 이어서 입력해요.")
                }
            }

            Section {
                Button("zip 파일 열기", systemImage: "doc.zipper") { router.pickZip() }
            } footer: {
                #if os(iOS)
                Text("카톡이나 파일 앱에서 zip을 공유 → '필름함에 저장'을 눌러도 돼요.")
                #else
                Text("zip 파일을 창으로 끌어다 놓아도 돼요.")
                #endif
            }

            let atLab = rolls.filter { $0.deletedAt == nil && $0.status == .atLab }
            let finished = rolls.filter { $0.deletedAt == nil && $0.status == .finished }

            Section("현상 맡김 · \(atLab.count)") {
                ForEach(atLab) { roll in
                    NavigationLink(value: roll) { RollRow(roll: roll) }
                        .swipeActions { Button("불러오기") { router.pickZip(for: roll) }.tint(Theme.safelight) }
                }
            }
            Section("촬영 완료 · \(finished.count)") {
                ForEach(finished) { roll in
                    NavigationLink(value: roll) { RollRow(roll: roll) }
                        .swipeActions { Button("현상 맡기기") { dropOff = roll }.tint(.blue) }
                }
            }
        }
        .scrollContentBackground(.hidden)
        .background(Theme.paper)
        .navigationTitle("현상 스캔")
        .confirmationDialog("대기열의 zip \(queue.count)개를 모두 지울까요?", isPresented: $confirmClearQueue, titleVisibility: .visible) {
            Button("모두 지우기", role: .destructive) {
                for job in queue { ImportQueueStore.remove(job) }
                queue = ImportQueueStore.load()
                presented = nil
            }
        }
        .navigationDestination(for: RollItem.self) { RollDetailView(roll: $0) }
        .sheet(item: $dropOff) { LabDropOffView(roll: $0) }
        .sheet(isPresented: $showArchive) { ArchiveImportView() }
        .sheet(item: $presented, onDismiss: openFollowUp) { job in
            ArchiveImportView(presetFileURL: ImportQueueStore.fileURL(job), sourceName: job.displayName, stepTitle: "\(job.index) / \(job.total)") {
                handOff(job)
            }
        }
        .sheet(isPresented: $showChoice) {
            ImportChoiceSheet(
                onOne: {
                    showChoice = false
                    Task { @MainActor in
                        try? await Task.sleep(for: .milliseconds(450))
                        showArchive = true
                    }
                },
                onMany: {
                    showChoice = false
                    Task { @MainActor in
                        try? await Task.sleep(for: .milliseconds(450))
                        showMultiZip = true
                    }
                }
            )
        }
        .fileImporter(isPresented: $showMultiZip, allowedContentTypes: [.zip], allowsMultipleSelection: true) { result in
            if case .success(let urls) = result { enqueue(urls) }
        }
        .toolbar {
            ToolbarItem {
                Button("기존 롤 가져오기", systemImage: "plus") { showChoice = true }
            }
        }
    }

    private func enqueue(_ urls: [URL]) {
        let jobs = ImportQueueStore.add(urls)
        guard !jobs.isEmpty else { return }
        let wasEmpty = queue.isEmpty
        queue = ImportQueueStore.load()
        guard wasEmpty, let first = jobs.first else { return }
        Task { @MainActor in
            try? await Task.sleep(for: .milliseconds(600))
            if presented == nil { presented = first }
        }
    }

    private func handOff(_ job: ImportQueueStore.Job) {
        let index = queue.firstIndex { $0.id == job.id } ?? 0
        ImportQueueStore.remove(job)
        queue = ImportQueueStore.load()
        followUp = queue.indices.contains(index) ? queue[index] : nil
        presented = nil
    }

    private func openFollowUp() {
        guard let next = followUp else { return }
        followUp = nil
        Task { @MainActor in
            try? await Task.sleep(for: .milliseconds(400))
            if presented == nil { presented = next }
        }
    }

    private func removeJob(_ job: ImportQueueStore.Job) {
        ImportQueueStore.remove(job)
        queue = ImportQueueStore.load()
        if followUp?.id == job.id { followUp = nil }
        if presented?.id == job.id { presented = nil }
    }
}

/// 롤 보관함: 전체 기록 + 필터
struct RollsView: View {
    @Environment(\.modelContext) private var context
    @Query(sort: \RollItem.loadedAt, order: .reverse) private var rolls: [RollItem]
    @State private var search = ""
    @State private var favoritesOnly = false
    @State private var filmID: String?
    @State private var cameraID: UUID?
    @AppStorage("rollGrouping") private var grouping: RollGrouping = .month
    @State private var status: RollStatus?
    @State private var deleting: RollItem?
    @State private var filing: RollItem?
    @AppStorage("rollsLayout") private var layout: LayoutMode = .list

    private var filtered: [RollItem] {
        rolls.filter { r in
            if r.deletedAt != nil { return false }
            if favoritesOnly && !r.isFavorite { return false }
            if let filmID, r.filmStockID != filmID { return false }
            if let cameraID, r.camera?.id != cameraID { return false }
            if let status, r.status != status { return false }
            if !search.isEmpty {
                let text = [r.filmName, r.cameraName, r.labName ?? "", r.note ?? "",
                            r.locations.map { "\($0.name) \($0.memo ?? "")" }.joined(separator: " ")]
                if !text.contains(where: { $0.localizedCaseInsensitiveContains(search) }) { return false }
            }
            return true
        }
    }

    private var isFiltering: Bool {
        favoritesOnly || filmID != nil || cameraID != nil || status != nil
    }

    /// 보기 단위(월/분기/반기/년)로 묶기. 최근 기간이 위로.
    private var groups: [(key: Int, title: String, rolls: [RollItem])] {
        // 촬영일을 모르는 롤은 맨 아래 '날짜 알 수 없음'으로 (키 0)
        Dictionary(grouping: filtered) { $0.dateUnknown ? 0 : grouping.key(for: $0.sortedDays.first?.startedAt ?? $0.loadedAt) }
            .map { ($0.key, $0.key == 0 ? "날짜 알 수 없음" : grouping.title(for: $0.key),
                    $0.value.sorted { ($0.sortedDays.first?.startedAt ?? $0.loadedAt) > ($1.sortedDays.first?.startedAt ?? $1.loadedAt) }) }
            .sorted { $0.key > $1.key }
    }

    // 필터 선택지 (기록에 있는 것만)
    private var films: [(id: String, name: String)] {
        Dictionary(grouping: rolls, by: \.filmStockID).compactMap { id, list in list.first.map { (id, $0.filmName) } }
            .sorted { $0.name < $1.name }
    }
    private var cameras: [(id: UUID, name: String)] {
        Dictionary(grouping: rolls.compactMap(\.camera), by: \.id).compactMap { id, list in list.first.map { (id, $0.displayName) } }
            .sorted { $0.name < $1.name }
    }

    var body: some View {
        content
            .toolbar {
                ToolbarItem {
                    Button(layout.toggled.displayName, systemImage: layout.toggled.symbol) {
                        withAnimation { layout = layout.toggled }
                    }
                }
            }
            .searchable(text: $search, prompt: "필름, 카메라, 장소, 현상소, 메모")
            .background(Theme.paper)
            .navigationTitle("롤 보관함")
            .navigationDestination(for: RollItem.self) { RollDetailView(roll: $0) }
            .navigationDestination(for: ProjectRoute.self) { ProjectRouteView(route: $0) }
            .sheet(item: $filing) { RollProjectsPicker(roll: $0) }
            .confirmationDialog("이 롤 기록을 삭제할까요? 24시간 안에는 설정에서 되돌릴 수 있어요. 사진 앱에 저장된 사진은 그대로 남아요.",
                                isPresented: Binding(get: { deleting != nil }, set: { if !$0 { deleting = nil } }),
                                titleVisibility: .visible) {
                Button("삭제", role: .destructive) {
                    deleting?.deletedAt = Date()
                    deleting = nil
                }
            }
    }

    @ViewBuilder
    private var content: some View {
        if layout == .grid {
            // 그리드: List의 화살표 없이 카드만
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    controls
                    emptyState
                    ForEach(groups, id: \.key) { group in
                        VStack(alignment: .leading, spacing: 8) {
                            Text("\(group.title) · \(group.rolls.count)롤")
                                .font(.subheadline.weight(.semibold)).foregroundStyle(.secondary)
                                .padding(.horizontal, 20)
                            LazyVGrid(columns: [GridItem(.adaptive(minimum: 150, maximum: 240), spacing: 10)], spacing: 10) {
                                ForEach(group.rolls) { roll in
                                    NavigationLink(value: roll) { RollGridCard(roll: roll) }
                                        .buttonStyle(.plain)
                                        .contextMenu { rollMenu(roll) }
                                }
                            }
                            .padding(.horizontal, 16)
                        }
                    }
                }
                .padding(.vertical, 8)
            }
        } else {
            List {
                Section { controls }
                    .listRowInsets(EdgeInsets())
                    .listRowBackground(Color.clear)
                emptyState.listRowBackground(Color.clear)
                ForEach(groups, id: \.key) { group in
                    Section("\(group.title) · \(group.rolls.count)롤") {
                        ForEach(group.rolls) { roll in
                            NavigationLink(value: roll) { RollRow(roll: roll) }
                                .swipeActions(edge: .leading) {
                                    Button {
                                        roll.isFavorite.toggle()
                                    } label: {
                                        Label(roll.isFavorite ? "해제" : "즐겨찾기", systemImage: roll.isFavorite ? "star.slash" : "star.fill")
                                    }
                                    .tint(.yellow)
                                }
                                .swipeActions(edge: .trailing) {
                                    Button("삭제", systemImage: "trash", role: .destructive) { deleting = roll }
                                }
                                .contextMenu { rollMenu(roll) }
                        }
                    }
                }
            }
            .scrollContentBackground(.hidden)
        }
    }

    /// 보기 단위 + 필터
    private var controls: some View {
        VStack(spacing: 10) {
            ProjectStrip(rolls: rolls)
            Picker("보기 단위", selection: $grouping) {
                ForEach(RollGrouping.allCases) { Text($0.displayName).tag($0) }
            }
            .pickerStyle(.segmented)
            .padding(.horizontal, 16)
            filterBar
        }
        .padding(.vertical, 4)
    }

    @ViewBuilder
    private var emptyState: some View {
        if rolls.allSatisfy({ $0.deletedAt != nil }) {
            ContentUnavailableView("아직 롤이 없어요", systemImage: "square.stack")
        } else if filtered.isEmpty {
            ContentUnavailableView {
                Label("조건에 맞는 롤이 없어요", systemImage: "line.3.horizontal.decrease.circle")
            } actions: {
                Button("필터 초기화") { resetFilters() }
            }
        }
    }

    @ViewBuilder
    private func rollMenu(_ roll: RollItem) -> some View {
        Button(roll.isFavorite ? "즐겨찾기 해제" : "즐겨찾기", systemImage: "star") { roll.isFavorite.toggle() }
        Button("프로젝트에 담기", systemImage: "folder.badge.plus") { filing = roll }
        Button("삭제", systemImage: "trash", role: .destructive) { deleting = roll }
    }

    private var filterBar: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                Button { favoritesOnly.toggle() } label: {
                    Label("즐겨찾기", systemImage: favoritesOnly ? "star.fill" : "star")
                }
                .buttonStyle(FilterChipStyle(active: favoritesOnly))

                Menu {
                    Button("전체") { filmID = nil }
                    ForEach(films, id: \.id) { f in Button(f.name) { filmID = f.id } }
                } label: {
                    chipLabel(films.first { $0.id == filmID }?.name ?? "필름", active: filmID != nil)
                }
                .buttonStyle(FilterChipStyle(active: filmID != nil))

                Menu {
                    Button("전체") { cameraID = nil }
                    ForEach(cameras, id: \.id) { c in Button(c.name) { cameraID = c.id } }
                } label: {
                    chipLabel(cameras.first { $0.id == cameraID }?.name ?? "카메라", active: cameraID != nil)
                }
                .buttonStyle(FilterChipStyle(active: cameraID != nil))

                Menu {
                    Button("전체") { status = nil }
                    ForEach(RollStatus.allCases, id: \.self) { s in Button(s.displayName) { status = s } }
                } label: {
                    chipLabel(status?.displayName ?? "진행 상태", active: status != nil)
                }
                .buttonStyle(FilterChipStyle(active: status != nil))

                if isFiltering {
                    Button("초기화", systemImage: "xmark") { resetFilters() }
                        .buttonStyle(FilterChipStyle(active: false))
                }
            }
            .padding(.horizontal, 16)
        }
    }

    private func chipLabel(_ text: String, active: Bool) -> some View {
        HStack(spacing: 4) {
            Text(text).lineLimit(1)
            Image(systemName: "chevron.down").font(.caption2.weight(.bold))
        }
    }

    private func resetFilters() {
        favoritesOnly = false
        filmID = nil
        cameraID = nil
        status = nil
    }
}

struct FilterChipStyle: ButtonStyle {
    let active: Bool

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.subheadline.weight(.medium))
            .padding(.horizontal, 12)
            .padding(.vertical, 7)
            .background(Capsule().fill(active ? Theme.safelight : Theme.card))
            .overlay(Capsule().strokeBorder(active ? .clear : .secondary.opacity(0.25)))
            .foregroundStyle(active ? .white : .primary)
            .opacity(configuration.isPressed ? 0.7 : 1)
    }
}

/// 롤 보관함 보기 단위
enum RollGrouping: String, CaseIterable, Identifiable {
    case month, quarter, half, year

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .month: "월"
        case .quarter: "분기"
        case .half: "반기"
        case .year: "년"
        }
    }

    /// 정렬 가능한 기간 키 (예: 2026년 3분기 → 2026*100 + 3)
    func key(for date: Date) -> Int {
        let c = Calendar.current.dateComponents([.year, .month], from: date)
        let y = c.year ?? 0, m = c.month ?? 1
        switch self {
        case .month: return y * 100 + m
        case .quarter: return y * 100 + (m - 1) / 3 + 1
        case .half: return y * 100 + (m <= 6 ? 1 : 2)
        case .year: return y * 100
        }
    }

    func title(for key: Int) -> String {
        let y = key / 100, n = key % 100
        switch self {
        case .month: return "\(y)년 \(n)월"
        case .quarter: return "\(y)년 \(n)분기"
        case .half: return "\(y)년 \(n == 1 ? "상반기" : "하반기")"
        case .year: return "\(y)년"
        }
    }
}

/// 롤 그리드 카드: 첫 컷(없으면 필름 통) + 필름 + 날짜
struct RollGridCard: View {
    let roll: RollItem
    @State private var cover: CGImage?

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            ZStack {
                Theme.filmBase
                if let cover {
                    Image(cgImage: cover).resizable().scaledToFill()
                } else {
                    FilmCanisterView(stock: roll.film, format: roll.format).padding(14)
                }
            }
            .frame(height: 104)
            .frame(maxWidth: .infinity)
            .clipped()
            .clipShape(RoundedRectangle(cornerRadius: 10))
            .overlay(alignment: .topTrailing) {
                if roll.isFavorite {
                    Image(systemName: "star.fill").font(.caption).foregroundStyle(.yellow).padding(6).shadow(radius: 2)
                }
            }
            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 4) {
                    Text(roll.filmName).font(.subheadline.weight(.semibold)).lineLimit(1)
                    Spacer(minLength: 0)
                    StatusBadge(status: roll.status)
                }
                Text(roll.cameraName).font(.caption).foregroundStyle(.secondary).lineLimit(1)
                Text(roll.dateRangeText).font(.caption2).foregroundStyle(.secondary)
            }
        }
        .padding(10)
        .background(Theme.card, in: RoundedRectangle(cornerRadius: 14))
        .task(id: "\(roll.frames?.count ?? 0)|\(roll.coverFrameIndex ?? 0)") {
            guard let data = roll.coverFrame?.thumbnail else { cover = nil; return }
            cover = await Task.detached { ImageThumbnail.make(data: data, maxPixel: 500) }.value
        }
    }
}

/// 기존 롤 가져오기. 툴바에서 뜨는 화살표 메뉴 대신, 웹처럼 아래에서 올라온다.
private struct ImportChoiceSheet: View {
    var onOne: () -> Void
    var onMany: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            Text("기존 롤 가져오기")
                .font(.headline)
                .frame(maxWidth: .infinity)
                .padding(.top, 18)
                .padding(.bottom, 8)
            Button(action: onOne) {
                choiceRow("한 롤", "사진이나 zip 하나를 바로 입력해요")
            }
            .buttonStyle(.plain)
            Divider().padding(.leading, 20)
            Button(action: onMany) {
                choiceRow("여러 롤", "zip을 여러 개 고르면 대기열에서 차례로 입력해요")
            }
            .buttonStyle(.plain)
            Spacer(minLength: 0)
        }
        .background(Theme.paper)
        .presentationDetents([.height(260)])
        .presentationDragIndicator(.visible)
        .presentationBackground(Theme.paper)
    }

    private func choiceRow(_ title: String, _ detail: String) -> some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(title).font(.body.weight(.semibold)).foregroundStyle(.primary)
            Text(detail).font(.subheadline).foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 20)
        .padding(.vertical, 16)
        .contentShape(Rectangle())
    }
}
