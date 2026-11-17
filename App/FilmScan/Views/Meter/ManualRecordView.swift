#if os(iOS)
import SwiftUI
import SwiftData
import FilmScanCore

/// 상세 기록 (노출계 없이): 카메라 윗면 다이얼로 셔터·조리개(맨 끝 ⚡ 플래시)·노출 보정을 맞추고,
/// 셔터를 누르면 레버가 감기며 그 칸에 장소·시간과 함께 남는다. 다이얼 값은 이 카메라·렌즈가 지원하는 것만.
/// 기록은 노출계와 같은 MeterShot으로 롤에 저장한다 (롤 화면·스캔 가져오기에서 그대로 쓰임)
struct ManualRecordView: View {
    @StateObject private var m: MeterModel
    var onSave: ([MeterShot], Bool) -> Void
    var onClose: () -> Void

    @State private var dial: DialState
    /// 다음에 기록할 칸 (셔터를 누르면 다음 칸으로)
    @State private var frame: Int
    // 장소: 기본은 현재 위치
    @State private var placeName = ""
    @State private var point: GeoPoint?
    @State private var location = LocationProvider()
    @State private var placeSheet = false
    // 시간: 기본은 기록하는 순간
    @State private var useNow = true
    @State private var time = Date()
    @State private var timeSheet = false
    // 셔터 줄 (노출계와 같은 움직임)
    @State private var leverOut = false
    @State private var shutterDown = false
    @State private var busy = false
    @State private var rewindAngle: Double
    @State private var sheet: Sheet?
    @State private var editing: EditTarget?
    @State private var toast: String?
    struct EditTarget: Identifiable { var pos: Int; var id: Int { pos } }
    enum Sheet: String, Identifiable { case filter, lens; var id: String { rawValue } }

    init(gear: MeterGear, shots: [MeterShot], rollPrewind: Bool?, iso: Double?, onSave: @escaping ([MeterShot], Bool) -> Void, onClose: @escaping () -> Void) {
        var g = gear
        if let iso { g.iso = iso }
        let model = MeterModel(gear: g, shots: shots, rollPrewind: rollPrewind ?? false)
        _m = StateObject(wrappedValue: model)
        self.onSave = onSave; self.onClose = onClose
        // 자동 카메라는 A, 아니면 1/125 · f/8
        let auto = gear.shutterAuto
        _dial = State(initialValue: DialState(shutters: auto ? [] : model.shutters, apertures: model.apertures,
                                              s: auto ? 0 : 1 + MeterMath.nearest(model.shutters, 1.0 / 125),
                                              a: gear.modes == ["P"] ? 0 : 1 + MeterMath.nearest(model.apertures, 8), c: 6))
        _frame = State(initialValue: (shots.map(\.pos).max() ?? 0) + 1)
        _rewindAngle = State(initialValue: Double(shots.count) * -150)
    }

    var body: some View {
        VStack(spacing: 12) {
            header
            RecordDials(dial: $dial)
            HStack(alignment: .center, spacing: 10) {
                CompDial(index: $dial.c).frame(width: 118)
                placeTimeCard
            }
            Spacer(minLength: 0)
            rollPart
        }
        .padding(.horizontal, 16)
        .padding(.top, 6)
        .background(Color.black.ignoresSafeArea())
        .ignoresSafeArea(.container, edges: .bottom)
        .preferredColorScheme(.dark)
        .foregroundStyle(.white)
        .overlay(alignment: .bottom) { toastView.padding(.bottom, 250) }
        .task { await locateIfNeeded() }
        .sheet(isPresented: $placeSheet) { placeSheetView(name: $placeName, point: $point) { placeSheet = false } }
        .sheet(isPresented: $timeSheet) {
            timeSheetView(time: $time, onNow: { useNow = true; timeSheet = false }, onDone: { useNow = false; timeSheet = false })
        }
        .sheet(item: $sheet) { kind in
            NavigationStack {
                ScrollView {
                    if kind == .filter {
                        FilterChips(selected: $m.filters).padding(16)
                    } else {
                        lensList
                    }
                }
                .navigationTitle(kind == .filter ? "필터" : "렌즈 교체").navigationBarTitleDisplayMode(.inline)
                .toolbar { ToolbarItem(placement: .confirmationAction) { Button("완료") { sheet = nil } } }
            }
            .presentationDetents([.medium]).preferredColorScheme(.dark)
        }
        .sheet(item: $editing) { t in
            if let shot = m.shots.first(where: { $0.pos == t.pos }) {
                ShotDialEditor(shot: shot, shutters: dial.shutters, apertures: dial.apertures) { edited in
                    m.update(edited); onSave(m.shots, m.prewind); show("\(t.pos)번을 고쳤어요")
                } onDelete: {
                    m.shots.removeAll { $0.pos == t.pos }; onSave(m.shots, m.prewind); show("\(t.pos)번 기록을 지웠어요")
                }
            }
        }
    }

    // MARK: 위 (노출계와 같은 ISO · 필터 · 렌즈)

    private var header: some View {
        HStack(spacing: 6) {
            Button { onSave(m.shots, m.prewind); onClose() } label: {
                Image(systemName: "chevron.left").font(.system(size: 17, weight: .semibold)).frame(width: 36, height: 36)
                    .background(Color.meterPanel, in: Circle())
            }
            VStack(alignment: .leading, spacing: 1) {
                Text(m.gear.cameraName).font(.system(size: 17, weight: .bold)).lineLimit(1)
                if let film = m.gear.film {
                    Text("\(film.displayName) · \(m.gear.frames)컷").font(.system(size: 12)).foregroundStyle(Color.meterSub).lineLimit(1)
                }
            }
            Spacer(minLength: 4)
            ViewThatFits(in: .horizontal) {
                pills
                ScrollView(.horizontal, showsIndicators: false) { pills }
            }
            .layoutPriority(1)
        }
    }

    private var pills: some View {
        HStack(spacing: 6) {
            pill { show("장착한 필름 감도예요") } label: {
                HStack(spacing: 4) { Text("ISO").foregroundStyle(Color.meterSub); Text(MeterMath.trim(m.iso)).bold() }
            }
            pill(active: !m.filters.isEmpty, activeColor: Color(red: 0.62, green: 0.79, blue: 1)) { sheet = .filter } label: {
                HStack(spacing: 4) {
                    Image(systemName: "circle.grid.cross").font(.system(size: 14))
                    if !m.filters.isEmpty { Text(m.filters.count > 1 ? "\(m.filters[0])+\(m.filters.count - 1)" : m.filters[0]) }
                }
            }
            pill {
                if m.lens.fixed { show("렌즈 고정형 카메라라 렌즈를 바꿀 수 없어요") }
                else if m.gear.lenses.count < 2 { show("장비 탭에 같은 마운트 렌즈를 등록하면 바꿔 낄 수 있어요") }
                else { sheet = .lens }
            } label: {
                HStack(spacing: 3) {
                    Text(m.lens.rangeText).monospacedDigit()
                    if !m.lens.fixed { Image(systemName: "chevron.right").font(.system(size: 9, weight: .bold)).opacity(0.6) }
                }
            }
        }
        .fixedSize()
    }

    private func pill(active: Bool = false, activeColor: Color = .meterOrange, action: @escaping () -> Void, @ViewBuilder label: () -> some View) -> some View {
        Button(action: action) {
            label().font(.system(size: 14, weight: .bold)).lineLimit(1).fixedSize().padding(.horizontal, 12).frame(height: 36)
                .background(active ? activeColor : Color.meterPanel, in: Capsule())
                .overlay(Capsule().stroke(Color.meterLine, lineWidth: active ? 0 : 1))
                .foregroundStyle(active ? .black : .white)
        }
    }

    private var lensList: some View {
        VStack(spacing: 8) {
            ForEach(m.gear.lenses) { l in
                Button {
                    m.setLens(l)
                    dial.apertures = m.apertures
                    dial.a = min(dial.a, dial.apertures.count + 1)
                    sheet = nil; show("\(l.name)로 바꿨어요 · 다음 컷부터 기록돼요")
                } label: {
                    HStack {
                        VStack(alignment: .leading) { Text(l.name).bold(); Text(l.rangeText + " f/\(MeterMath.trim(l.open))").font(.caption).foregroundStyle(Color.meterSub) }
                        Spacer()
                        if l.id == m.lens.id { Text("끼움").font(.caption.bold()).foregroundStyle(Color.meterOrange) }
                    }
                    .padding(12).background(Color(white: 0.16), in: RoundedRectangle(cornerRadius: 12))
                }
                .foregroundStyle(.white)
            }
        }
        .padding(16)
    }

    // MARK: 장소 · 시간

    private var placeTimeCard: some View {
        PlaceTimeCard(place: location.isLocating && placeName.isEmpty ? "현재 위치 찾는 중…" : (placeName.isEmpty ? "없음" : placeName),
                      time: useNow ? "기록하는 순간" : time.formatted(date: .abbreviated, time: .shortened),
                      onPlace: { placeSheet = true },
                      onTime: { if useNow { time = Date() }; timeSheet = true })
    }

    // MARK: 셔터 줄 · 필름 (노출계와 같음)

    private var rollPart: some View {
        let w: CGFloat = 318
        return VStack(spacing: 0) {
            MeterControls(counter: "\(frame)", sub: "", flash: dial.flash, leverOut: leverOut, rewindAngle: rewindAngle, shutterDown: shutterDown,
                          onFlash: { dial.toggleFlash(); UIImpactFeedbackGenerator(style: .heavy).impactOccurred() },
                          onShutter: fire)
                .frame(width: w)
                .padding(.bottom, -w * 58 / 360)
                .zIndex(1)
            MeterFilmStrip(shots: m.shots, frames: m.gear.frames, prewind: false, ended: false, nextPos: frame,
                           showFocal: m.showFocal, effISO: m.effISO, film: m.gear.film) { p in
                if m.shots.contains(where: { $0.pos == p }) { editing = EditTarget(pos: p) } else { frame = p }
            }
            .padding(.horizontal, -16)
            .padding(.top, 8)
        }
    }

    /// 셔터: 지금 다이얼 값으로 이 칸을 기록하고, 셔터가 닫힌 뒤 레버가 감기며 다음 칸으로
    private func fire() {
        guard !busy else { return }
        let t = dial.shutter ?? 1.0 / 125
        MeterSound.shared.shutter(t)
        UIImpactFeedbackGenerator(style: .rigid).impactOccurred()
        shutterDown = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.14) { shutterDown = false }

        let at = useNow ? Date() : time
        var shot = MeterShot(pos: frame, order: m.shots.count + 1, mode: dial.mode, aperture: dial.aperture, shutter: dial.shutter,
                             comp: dial.comp, flash: dial.flash, ev: 0, focal: m.lens.isZoom ? nil : m.lens.min,
                             at: ISO8601DateFormatter().string(from: at), filters: m.filters.isEmpty ? nil : m.filters)
        shot.place = placeName.isEmpty ? nil : placeName
        shot.lat = point?.latitude; shot.lon = point?.longitude
        let old = m.shots.first { $0.pos == frame }
        if let old { shot.order = old.order; shot.memo = old.memo; shot.tags = old.tags }
        m.shots.removeAll { $0.pos == frame }
        m.shots.append(shot)
        m.shots.sort { $0.pos < $1.pos }
        onSave(m.shots, m.prewind)
        if old != nil { show("\(frame)번을 새로 기록했어요") }
        if !useNow { time = time.addingTimeInterval(60) }

        busy = true
        let next = frame + 1
        Task { @MainActor in
            try? await Task.sleep(for: .milliseconds(Int(max(150, min(t, 8) * 1000 + 140))))
            leverOut = true
            MeterSound.shared.ratchet()
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
            rewindAngle -= 150
            frame = next
            try? await Task.sleep(for: .milliseconds(360))
            leverOut = false
            try? await Task.sleep(for: .milliseconds(320))
            busy = false
        }
    }

    private func locateIfNeeded() async {
        guard point == nil else { return }
        // 앞 컷과 같은 곳일 때가 많아서, 먼저 마지막 기록 장소를 쓰고 현재 위치로 바꾼다
        if let last = m.shots.max(by: { $0.order < $1.order }), let name = last.place {
            placeName = name
            if let lat = last.lat, let lon = last.lon { point = GeoPoint(latitude: lat, longitude: lon) }
        }
        if let place = await location.currentPlace() { placeName = place.name; point = place.point }
    }

    private func show(_ text: String) {
        withAnimation(.easeOut(duration: 0.2)) { toast = text }
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) { if toast == text { withAnimation { toast = nil } } }
    }

    @ViewBuilder private var toastView: some View {
        if let toast {
            Text(toast).font(.system(size: 14, weight: .semibold)).multilineTextAlignment(.center)
                .padding(.horizontal, 16).padding(.vertical, 10)
                .background(.ultraThinMaterial, in: Capsule())
                .transition(.opacity)
        }
    }
}

// MARK: 다이얼 상태 (메인 화면과 컷 고치기가 같이 쓴다)

/// 셔터 [A, 값…] · 조리개 [A, 값…, ⚡] · 노출 보정 (−2 … +2)
struct DialState {
    var shutters: [Double]
    var apertures: [Double]
    var s: Int
    var a: Int
    var c: Int
    /// ⚡에서 빠져나올 때 돌아갈 조리개 자리
    var lastAperture: Int = 0

    var shutterLabels: [String] { ["A"] + shutters.map(MeterMath.lcdS) }
    var apertureLabels: [String] { ["A"] + apertures.map(MeterMath.trim) + ["⚡"] }
    var flashIndex: Int { apertures.count + 1 }
    var flash: Bool { a == flashIndex }
    var shutter: Double? { s == 0 || s > shutters.count ? nil : shutters[s - 1] }
    var aperture: Double? { a == 0 || flash || a > apertures.count ? nil : apertures[a - 1] }
    var comp: Double { MeterMath.comps[c] }
    var mode: String { aperture != nil && shutter != nil ? "M" : aperture != nil ? "A" : shutter != nil ? "S" : "P" }

    mutating func toggleFlash() {
        if flash { a = lastAperture } else { lastAperture = a; a = flashIndex }
    }

    init(shutters: [Double], apertures: [Double], s: Int, a: Int, c: Int) {
        self.shutters = shutters; self.apertures = apertures; self.s = s; self.a = a; self.c = c
    }

    /// 기록된 컷 값으로 다이얼을 맞춘다 (컷 고치기)
    init(shot: MeterShot, shutters: [Double], apertures: [Double]) {
        self.shutters = shutters; self.apertures = apertures
        s = shutters.isEmpty ? 0 : shot.shutter.map { 1 + MeterMath.nearest(shutters, $0) } ?? 0
        let ap = shot.aperture.map { 1 + MeterMath.nearest(apertures, $0) } ?? 0
        a = shot.flash ? apertures.count + 1 : ap
        c = MeterMath.comps.indices.min { abs(MeterMath.comps[$0] - shot.comp) < abs(MeterMath.comps[$1] - shot.comp) } ?? 6
        lastAperture = ap
    }
}

/// 셔터 · 조리개(⚡) 다이얼
struct RecordDials: View {
    @Binding var dial: DialState

    var body: some View {
        HStack(alignment: .top, spacing: 8) {
            TopDial(title: "셔터", labels: dial.shutterLabels, index: $dial.s, size: 150,
                    big: dial.shutter.map(MeterMath.fmtS) ?? (dial.shutters.isEmpty ? "자동 셔터" : "자동"),
                    accent: [0], snaps: [0])
            TopDial(title: "조리개", labels: dial.apertureLabels, index: $dial.a, size: 150,
                    big: dial.flash ? "플래시" : dial.aperture.map(MeterMath.fmtA) ?? "자동",
                    accent: [0, dial.flashIndex], snaps: [0, dial.flashIndex])
        }
    }
}

/// 장소 · 시간 줄 (메인·컷 고치기 같은 배치)
struct PlaceTimeCard: View {
    var place: String
    var time: String
    var onPlace: () -> Void
    var onTime: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            line("장소", place, action: onPlace)
            Divider().overlay(Color.meterLine)
            line("시간", time, action: onTime)
        }
        .font(.system(size: 15))
        .padding(.horizontal, 14)
        .background(Color.meterPanel, in: RoundedRectangle(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color.meterLine))
    }

    private func line(_ k: String, _ v: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack {
                Text(k).foregroundStyle(Color.meterSub)
                Spacer(minLength: 6)
                Text(v).lineLimit(1).truncationMode(.middle)
                Image(systemName: "chevron.right").font(.system(size: 12, weight: .semibold)).foregroundStyle(Color.meterSub)
            }
            .frame(height: 44).contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}

/// 노출 보정 작은 다이얼 (가운데 0)
struct CompDial: View {
    @Binding var index: Int
    var body: some View {
        TopDial(title: "노출 보정", labels: MeterMath.comps.map { $0 == 0 ? "0" : $0 == $0.rounded() ? MeterMath.fmtC($0) : "·" }, index: $index, size: 104,
                big: MeterMath.comps[index] == 0 ? "±0" : MeterMath.fmtC(MeterMath.comps[index]), accent: [6], snaps: [6], bigSize: 20)
    }
}

/// 카메라 윗면에서 본 다이얼: 값이 방사형(불꽃처럼 바깥쪽으로)으로 적혀 겹치지 않고, 오른쪽 표시에 맞춘 값이 고른 값.
/// 위아래(또는 좌우)로 끌어서 돌린다. 칸마다 가볍게, A·⚡·0 자리에서는 '딱' 하고 걸린다
struct TopDial: View {
    let title: String
    let labels: [String]
    @Binding var index: Int
    var size: CGFloat = 150
    let big: String
    /// 주황으로 적을 칸 (A, ⚡, 0)
    var accent: Set<Int> = []
    /// 걸리는 느낌을 세게 줄 칸
    var snaps: Set<Int> = []
    var bigSize: CGFloat = 26
    @State private var start: Int?

    /// 칸 사이 각도: 글자 높이만큼은 벌리고, 많지 않으면 넉넉히
    private var step: Double {
        // 점(·)으로만 적는 칸이 있으면 촘촘해도 겹치지 않는다
        if labels.contains("·") { return 20 }
        let r = Double(size / 2 - 24)
        let minStep = 15.5 / r * 180 / .pi
        return max(minStep, min(30, 300 / Double(max(labels.count - 1, 1))))
    }

    var body: some View {
        VStack(spacing: 4) {
            ZStack {
                knob
                ZStack {
                    ForEach(labels.indices, id: \.self) { i in
                        let rel = Double(i - index) * step
                        let flip = cos(rel * .pi / 180) < 0
                        Text(labels[i])
                            .font(.system(size: labels[i] == "·" ? 16 : size < 120 ? 11 : (labels[i].count > 3 ? 11 : 13), weight: i == index ? .heavy : .semibold))
                            .monospacedDigit().lineLimit(1).fixedSize()
                            .foregroundStyle(accent.contains(i) ? Color.meterOrange : .white)
                            .opacity(i == index ? 1 : 0.62)
                            .rotationEffect(.degrees(flip ? 180 : 0))
                            .offset(x: size / 2 - 24)
                            .rotationEffect(.degrees(Double(i) * step))
                    }
                }
                .rotationEffect(.degrees(-Double(index) * step))
                .animation(.spring(duration: 0.28, bounce: 0.15), value: index)
                Circle().fill(LinearGradient(colors: [Color(white: 0.42), Color(white: 0.16)], startPoint: .topLeading, endPoint: .bottomTrailing))
                    .frame(width: size * 0.2, height: size * 0.2)
            }
            .frame(width: size, height: size)
            .overlay(alignment: .trailing) {
                // 맞춤 표시 (오른쪽, 고정)
                Image(systemName: "arrowtriangle.left.fill").font(.system(size: 11)).foregroundStyle(Color.meterOrange).offset(x: 12)
            }
            .contentShape(Circle())
            .gesture(DragGesture(minimumDistance: 2).onChanged { v in
                if start == nil { start = index }
                let d = Int(((-v.translation.height - v.translation.width) / 20).rounded())
                let next = min(max((start ?? index) + d, 0), labels.count - 1)
                if next != index {
                    index = next
                    if snaps.contains(next) { UIImpactFeedbackGenerator(style: .heavy).impactOccurred() }
                    else { UISelectionFeedbackGenerator().selectionChanged() }
                }
            }.onEnded { _ in start = nil })
            Text(big).font(.system(size: bigSize, weight: .semibold, design: .rounded)).monospacedDigit()
                .foregroundStyle(index == 0 && accent.contains(0) ? Color.meterSub : .white)
                .lineLimit(1).minimumScaleFactor(0.6)
            Text(title).font(.system(size: 12, weight: .semibold)).foregroundStyle(Color.meterSub)
        }
        .frame(maxWidth: .infinity)
    }

    private var knob: some View {
        Canvas { c, sz in
            let r = min(sz.width, sz.height) / 2, center = CGPoint(x: sz.width / 2, y: sz.height / 2)
            c.fill(Path(ellipseIn: CGRect(x: center.x - r, y: center.y - r, width: r * 2, height: r * 2)),
                   with: .radialGradient(Gradient(colors: [Color(white: 0.24), Color(white: 0.1)]), center: center, startRadius: 0, endRadius: r))
            for i in 0..<120 {
                let a = Double(i) / 120 * 2 * .pi
                var p = Path()
                p.move(to: CGPoint(x: center.x + cos(a) * (r - 7), y: center.y + sin(a) * (r - 7)))
                p.addLine(to: CGPoint(x: center.x + cos(a) * r, y: center.y + sin(a) * r))
                c.stroke(p, with: .color(Color(white: i % 2 == 0 ? 0.45 : 0.18)), lineWidth: 1.4)
            }
            c.stroke(Path(ellipseIn: CGRect(x: center.x - r + 8, y: center.y - r + 8, width: (r - 8) * 2, height: (r - 8) * 2)),
                     with: .color(Color(white: 0.3)), lineWidth: 1)
        }
    }
}

/// 필터 칩 (여러 개 고를 수 있음, '없음'은 전부 해제)
struct FilterChips: View {
    @Binding var selected: [String]
    var body: some View {
        LazyVGrid(columns: [GridItem(.adaptive(minimum: 80), spacing: 8)], spacing: 8) {
            ForEach(["없음"] + MeterMath.filters.map(\.id), id: \.self) { id in
                let on = id == "없음" ? selected.isEmpty : selected.contains(id)
                Button {
                    if id == "없음" { selected = [] } else if selected.contains(id) { selected.removeAll { $0 == id } } else { selected.append(id) }
                } label: {
                    Text(id).font(.system(size: 14, weight: .semibold)).lineLimit(1).frame(maxWidth: .infinity).frame(height: 38)
                        .background(on ? Color.meterOrange : Color(white: 0.17), in: RoundedRectangle(cornerRadius: 10))
                        .foregroundStyle(on ? .black : .white)
                }
            }
        }
    }
}

func placeSheetView(name: Binding<String>, point: Binding<GeoPoint?>, onDone: @escaping () -> Void) -> some View {
    NavigationStack {
        Form { PlacePickerSection(name: name, point: point) }
            .navigationTitle("장소").navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("완료", action: onDone) } }
    }
    .presentationDetents([.medium, .large])
}

func timeSheetView(time: Binding<Date>, onNow: @escaping () -> Void, onDone: @escaping () -> Void) -> some View {
    NavigationStack {
        Form {
            DatePicker("촬영 시간", selection: time).datePickerStyle(.graphical)
            Button("지금으로", action: onNow)
        }
        .navigationTitle("촬영 시간").navigationBarTitleDisplayMode(.inline)
        .toolbar { ToolbarItem(placement: .confirmationAction) { Button("완료", action: onDone) } }
    }
    .presentationDetents([.large])
}

// MARK: 컷 고치기 (메인과 같은 다이얼 배치, 그 컷 값으로 맞춰서 연다)

struct ShotDialEditor: View {
    let shot: MeterShot
    var onSave: (MeterShot) -> Void
    var onDelete: () -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var dial: DialState
    @State private var filters: [String]
    @State private var placeName: String
    @State private var point: GeoPoint?
    @State private var time: Date
    @State private var memo: String
    @State private var placeSheet = false
    @State private var timeSheet = false
    @State private var filterSheet = false
    @State private var askDelete = false

    init(shot: MeterShot, shutters: [Double], apertures: [Double], onSave: @escaping (MeterShot) -> Void, onDelete: @escaping () -> Void) {
        self.shot = shot; self.onSave = onSave; self.onDelete = onDelete
        _dial = State(initialValue: DialState(shot: shot, shutters: shutters, apertures: apertures))
        _filters = State(initialValue: shot.filters ?? [])
        _placeName = State(initialValue: shot.place ?? "")
        _point = State(initialValue: shot.lat.flatMap { la in shot.lon.map { GeoPoint(latitude: la, longitude: $0) } })
        _time = State(initialValue: shot.at.flatMap { ISO8601DateFormatter().date(from: $0) } ?? Date())
        _memo = State(initialValue: shot.memo ?? "")
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 12) {
                    RecordDials(dial: $dial)
                    HStack(alignment: .center, spacing: 10) {
                        CompDial(index: $dial.c).frame(width: 118)
                        PlaceTimeCard(place: placeName.isEmpty ? "없음" : placeName,
                                      time: time.formatted(date: .abbreviated, time: .shortened),
                                      onPlace: { placeSheet = true }, onTime: { timeSheet = true })
                    }
                    Button { filterSheet = true } label: {
                        HStack {
                            Text("필터").foregroundStyle(Color.meterSub)
                            Spacer()
                            Text(filters.isEmpty ? "없음" : filters.joined(separator: "+")).lineLimit(1)
                            Image(systemName: "chevron.right").font(.system(size: 12, weight: .semibold)).foregroundStyle(Color.meterSub)
                        }
                        .font(.system(size: 15)).padding(.horizontal, 14).frame(height: 44)
                        .background(Color.meterPanel, in: RoundedRectangle(cornerRadius: 16))
                        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color.meterLine))
                    }
                    .buttonStyle(.plain)
                    TextField("메모", text: $memo, axis: .vertical)
                        .padding(14).background(Color.meterPanel, in: RoundedRectangle(cornerRadius: 16))
                        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color.meterLine))
                    Button("이 칸 기록 지우기", role: .destructive) { askDelete = true }.padding(.top, 10)
                }
                .padding(16)
            }
            .background(Color.black)
            .navigationTitle("\(shot.pos)번 컷").navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("취소") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) { Button("저장") { save() }.bold() }
            }
            .sheet(isPresented: $placeSheet) { placeSheetView(name: $placeName, point: $point) { placeSheet = false } }
            .sheet(isPresented: $timeSheet) { timeSheetView(time: $time, onNow: { time = Date(); timeSheet = false }, onDone: { timeSheet = false }) }
            .sheet(isPresented: $filterSheet) {
                NavigationStack {
                    ScrollView { FilterChips(selected: $filters).padding(16) }
                        .navigationTitle("필터").navigationBarTitleDisplayMode(.inline)
                        .toolbar { ToolbarItem(placement: .confirmationAction) { Button("완료") { filterSheet = false } } }
                }
                .presentationDetents([.medium])
            }
            .confirmationDialog("이 칸 기록을 지울까요?", isPresented: $askDelete, titleVisibility: .visible) {
                Button("지우기", role: .destructive) { onDelete(); dismiss() }
            }
        }
        .preferredColorScheme(.dark)
    }

    private func save() {
        var s = shot
        s.mode = dial.mode; s.aperture = dial.aperture; s.shutter = dial.shutter; s.flash = dial.flash; s.comp = dial.comp
        s.filters = filters.isEmpty ? nil : filters
        s.place = placeName.isEmpty ? nil : placeName
        s.lat = point?.latitude; s.lon = point?.longitude
        s.at = ISO8601DateFormatter().string(from: time)
        s.memo = memo.isEmpty ? nil : memo
        onSave(s)
        dismiss()
    }
}

/// 촬영 중 화면에서 여는 상세 기록. 기록은 롤에 바로 저장한다
struct RollManualRecordView: View {
    let roll: RollItem
    @Environment(\.dismiss) private var dismiss
    @Query private var lenses: [LensItem]

    var body: some View {
        ManualRecordView(gear: .from(roll: roll, lenses: lenses), shots: roll.meterShots, rollPrewind: roll.meterPrewind,
                         iso: roll.shotISO.map(Double.init) ?? roll.film.map { Double($0.iso) },
                         onSave: { shots, prewind in roll.meterShots = shots; roll.meterPrewind = roll.meterPrewind ?? prewind },
                         onClose: { dismiss() })
    }
}
#endif
