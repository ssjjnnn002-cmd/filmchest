import SwiftUI
import SwiftData
import FilmScanCore

/// 편집 화면이 쓰는 롤의 컷 수와 지금 컷별 촬영 정보
@MainActor
private struct RollFrames {
    let count: Int
    let timeline: [FrameInfo]

    init(_ roll: RollItem) {
        let scanned = (roll.frames ?? []).map(\.index).max() ?? 0
        count = max(1, roll.frameCount ?? (scanned > 0 ? scanned : roll.format.nominalFrameCount))
        timeline = FrameTimeline.build(roll: roll.coreRoll(), frameCount: count)
    }
    func date(_ n: Int) -> Date? { n >= 1 && n <= timeline.count ? timeline[n - 1].date : nil }
}

/// 필름 띠에서 범위 고르기: 처음 누른 컷부터 다음에 누른 컷까지
struct FrameRangeStrip: View {
    let roll: RollItem
    let count: Int
    @Binding var range: ClosedRange<Int>
    /// 컷 아래 작은 글씨 (지금 기록된 날짜·장소)
    var caption: (Int) -> String? = { _ in nil }

    @State private var anchor: Int?
    @State private var thumbs: [Int: CGImage] = [:]

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            ScrollViewReader { proxy in
                ScrollView(.horizontal, showsIndicators: false) {
                    LazyHStack(spacing: 4) {
                        ForEach(1...count, id: \.self) { n in cell(n).id(n) }
                    }
                    .padding(6)
                }
                .background(Theme.filmBase, in: RoundedRectangle(cornerRadius: 10))
                .onAppear { proxy.scrollTo(range.lowerBound, anchor: .leading) }
            }
            HStack {
                Text(anchor == nil
                     ? (range.count == 1 ? "\(range.lowerBound)번" : "\(range.lowerBound)번 – \(range.upperBound)번")
                     : "\(range.lowerBound)번부터 · 끝 컷을 눌러요")
                    .font(.subheadline.weight(.semibold)).monospacedDigit()
                Spacer()
                Button("전체") { range = 1...count; anchor = nil }.font(.subheadline)
            }
        }
        .task(id: roll.frames?.count ?? 0) { await loadThumbs() }
    }

    private func cell(_ n: Int) -> some View {
        let on = range.contains(n)
        return Button {
            if let a = anchor {
                range = min(a, n)...max(a, n)
                anchor = nil
            } else {
                range = n...n
                anchor = n
            }
        } label: {
            VStack(spacing: 3) {
                ZStack {
                    Color.black.opacity(0.35)
                    if let img = thumbs[n] {
                        Image(decorative: img, scale: 1).resizable().scaledToFill()
                    } else {
                        Text("\(n)").font(.headline.monospacedDigit()).foregroundStyle(on ? Theme.safelight : .white.opacity(0.8))
                    }
                }
                .frame(width: 64, height: 44).clipped()
                .clipShape(RoundedRectangle(cornerRadius: 5))
                .overlay(RoundedRectangle(cornerRadius: 5).stroke(on ? Theme.safelight : .clear, lineWidth: 3))
                .opacity(on ? 1 : 0.55)
                // 사진이 있을 때만 번호를 아래에 (없으면 칸 안에 번호가 있다)
                if thumbs[n] != nil {
                    Text("\(n)").font(.caption2.weight(on ? .bold : .regular).monospacedDigit())
                        .foregroundStyle(on ? Theme.safelight : .white.opacity(0.7))
                }
                Text(caption(n) ?? " ").font(.system(size: 9)).foregroundStyle(.white.opacity(0.6)).lineLimit(1)
                    .frame(width: 64)
            }
        }
        .buttonStyle(.plain)
    }

    private func loadThumbs() async {
        let items = (roll.frames ?? []).compactMap { f in f.thumbnail.map { (f.index, $0, f.turns) } }
        for (n, data, turns) in items where thumbs[n] == nil {
            thumbs[n] = await Task.detached { ImageThumbnail.make(data: data, maxPixel: 160)?.rotated(quarterTurns: turns) }.value
        }
    }
}

/// 촬영일 추가/수정: 필름 띠에서 컷 범위를 고르고 그 컷들의 날짜를 정한다
struct DayEditView: View {
    let roll: RollItem
    let day: ShootingDay?

    @Environment(\.dismiss) private var dismiss
    @State private var range = 1...1
    @State private var date = Date()
    /// 날짜를 직접 바꿨는지 (안 바꿨으면 고른 첫 컷의 지금 날짜를 따라간다)
    @State private var dateTouched = false
    @State private var confirmDelete = false
    @State private var ready = false

    var body: some View {
        let frames = RollFrames(roll)
        NavigationStack {
            Form {
                Section {
                    FrameRangeStrip(roll: roll, count: frames.count, range: $range) { n in
                        frames.date(n).map { Fmt.monthDay.string(from: $0) }
                    }
                    .listRowInsets(EdgeInsets(top: 10, leading: 10, bottom: 10, trailing: 10))
                } header: {
                    Text("컷")
                } footer: {
                    Text("처음 누른 컷부터 다음에 누른 컷까지 이 날짜로 바꿔요. 컷 아래는 지금 기록된 날짜예요.")
                }
                Section {
                    DatePicker("날짜·시각", selection: Binding(get: { date }, set: { date = $0; dateTouched = true }))
                }
                if day != nil {
                    Section {
                        Button("촬영일 삭제", systemImage: "trash", role: .destructive) { confirmDelete = true }
                    }
                }
            }
            .filmForm()
            .navigationTitle(day == nil ? "촬영일 추가" : "촬영일 수정")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("취소") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) { Button("저장") { save(frames) } }
            }
            .confirmationDialog("이 촬영일을 삭제할까요?", isPresented: $confirmDelete, titleVisibility: .visible) {
                Button("삭제", role: .destructive) {
                    roll.shootingDays.removeAll { $0.id == day?.id }
                    dismiss()
                }
            }
            .onAppear { if !ready { prepare(frames); ready = true } }
            .onChange(of: range.lowerBound) { _, n in
                if !dateTouched, day == nil, let d = frames.date(n) { date = d }
            }
        }
        #if os(macOS)
        .frame(minWidth: 460, minHeight: 560)
        #endif
    }

    private func prepare(_ frames: RollFrames) {
        let resolved = RangeEdit.resolvedDays(roll.shootingDays, frameCount: frames.count)
        if let day, let i = resolved.firstIndex(where: { $0.id == day.id }) {
            let start = resolved[i].startFrame ?? 1
            range = RangeEdit.span(start: start, nextStart: i + 1 < resolved.count ? resolved[i + 1].startFrame : nil, frameCount: frames.count)
            date = day.startedAt
            return
        }
        // 새 촬영일: 마지막 촬영일 다음 컷부터 끝까지, 날짜는 그 컷에 지금 기록된 날짜
        let start = resolved.isEmpty ? 1 : min(frames.count, (resolved.last?.startFrame ?? 1) + 1)
        range = start...frames.count
        date = frames.date(start) ?? roll.loadedAt
    }

    private func save(_ frames: RollFrames) {
        roll.shootingDays = RangeEdit.setDays(roll.shootingDays, from: range.lowerBound, to: range.upperBound, date: date,
                                              frameCount: frames.count, removing: day?.id, at: { frames.date($0) })
        dismiss()
    }
}

/// 장소 추가/수정: 필름 띠에서 컷 범위를 고르고 그 컷들의 장소를 정한다 (장소 미상도)
struct PlaceEditView: View {
    let roll: RollItem
    let segment: LocationSegment?

    @Environment(\.dismiss) private var dismiss
    @State private var range = 1...1
    @State private var unknown = false
    @State private var name = ""
    @State private var point: GeoPoint?
    @State private var weather: WeatherNote?
    @State private var memo = ""
    @State private var confirmDelete = false
    @State private var ready = false

    var body: some View {
        let frames = RollFrames(roll)
        NavigationStack {
            Form {
                Section {
                    FrameRangeStrip(roll: roll, count: frames.count, range: $range) { n in
                        frames.timeline.indices.contains(n - 1) ? frames.timeline[n - 1].location.map { $0.name.isEmpty ? "미상" : $0.name } : nil
                    }
                    .listRowInsets(EdgeInsets(top: 10, leading: 10, bottom: 10, trailing: 10))
                } header: {
                    Text("컷")
                } footer: {
                    Text("처음 누른 컷부터 다음에 누른 컷까지 이 장소로 바꿔요. 컷 아래는 지금 기록된 장소예요.")
                }
                Section {
                    Toggle("장소 미상", isOn: $unknown)
                }
                if !unknown {
                    PlacePickerSection(name: $name, point: $point, weather: $weather)
                }
                Section("메모") {
                    TextField("메모", text: $memo, axis: .vertical)
                }
                if segment != nil {
                    Section {
                        Button("장소 삭제", systemImage: "trash", role: .destructive) { confirmDelete = true }
                    }
                }
            }
            .filmForm()
            .filmKeyboard()
            .navigationTitle(segment == nil ? "장소 추가" : "장소 수정")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("취소") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("저장") { save(frames) }
                        .disabled(!unknown && name.nilIfBlank == nil && point == nil && memo.nilIfBlank == nil)
                }
            }
            .confirmationDialog("이 장소를 삭제할까요?", isPresented: $confirmDelete, titleVisibility: .visible) {
                Button("삭제", role: .destructive) {
                    roll.locations.removeAll { $0.id == segment?.id }
                    dismiss()
                }
            }
            .onAppear { if !ready { prepare(frames); ready = true } }
        }
        #if os(macOS)
        .frame(minWidth: 460, minHeight: 560)
        #endif
    }

    private func prepare(_ frames: RollFrames) {
        let list = roll.sortedLocations
        if let segment, let i = list.firstIndex(where: { $0.id == segment.id }) {
            range = RangeEdit.span(start: segment.startFrame, nextStart: i + 1 < list.count ? list[i + 1].startFrame : nil, frameCount: frames.count)
            name = segment.name
            point = segment.point
            weather = segment.weather
            memo = segment.memo ?? ""
            unknown = segment.name.isEmpty && segment.point == nil
            return
        }
        let start = list.isEmpty ? 1 : min(frames.count, (list.last?.startFrame ?? 0) + 1)
        range = start...frames.count
    }

    private func save(_ frames: RollFrames) {
        let place = LocationSegment(id: segment?.id ?? UUID(), startFrame: range.lowerBound,
                                    name: unknown ? "" : name.trimmingCharacters(in: .whitespaces),
                                    point: unknown ? nil : point, memo: memo.nilIfBlank,
                                    weather: unknown || point == nil ? nil : weather)
        roll.locations = RangeEdit.setPlace(roll.locations, from: range.lowerBound, to: range.upperBound, place: place,
                                            frameCount: frames.count, removing: segment?.id)
        dismiss()
    }
}


/// 현상소 고르기
struct LabDropOffView: View {
    let roll: RollItem

    @Environment(\.dismiss) private var dismiss
    @State private var lab: String
    @State private var date: Date
    @State private var showNearby = false

    init(roll: RollItem) {
        self.roll = roll
        _lab = State(initialValue: roll.labName ?? "")
        _date = State(initialValue: roll.droppedOffAt ?? Date())
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("현상소") {
                    LabField(lab: $lab)
                    Button("가까운 현상소 찾기", systemImage: "map") { showNearby = true }
                }
                Section {
                    DatePicker("맡긴 날", selection: $date, displayedComponents: .date)
                }
            }
            .filmForm()
            .filmKeyboard()
            .navigationTitle("현상소 고르기")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("취소") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("저장") {
                        LabMemory.remember(lab)
                        roll.labName = lab.nilIfBlank
                        roll.droppedOffAt = date
                        if roll.status == .loaded || roll.status == .finished { roll.status = .atLab }
                        if roll.finishedAt == nil { roll.finishedAt = date }
                        dismiss()
                    }
                }
            }
            .sheet(isPresented: $showNearby) { NearbyLabsView { lab = $0 } }
        }
        #if os(macOS)
        .frame(minWidth: 420, minHeight: 300)
        #endif
    }
}

