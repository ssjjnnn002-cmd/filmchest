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
    /// 필름통을 누르면 필름 정보·컷 기록 목록
    @State private var rollSheet = false
    struct EditTarget: Identifiable { var pos: Int; var id: Int { pos } }
    enum Sheet: String, Identifiable { case filter, lens, iso; var id: String { rawValue } }
    /// 장착한 필름 감도 (카메라 ISO를 이와 다르게 맞추면 오버·언더로 기록)
    private var box: Double { m.gear.film.map { Double($0.iso) } ?? m.iso }

    init(gear: MeterGear, shots: [MeterShot], rollPrewind: Bool?, iso: Double?, onSave: @escaping ([MeterShot], Bool) -> Void, onClose: @escaping () -> Void) {
        var g = gear
        if let iso { g.iso = iso }
        let model = MeterModel(gear: g, shots: shots, rollPrewind: rollPrewind ?? false)
        _m = StateObject(wrappedValue: model)
        self.onSave = onSave; self.onClose = onClose
        var first = Self.baseDial(gear, model: model)
        // 이어서: 마지막에 찍은 컷의 렌즈·필터·다이얼 값에서 다시 시작
        if let last = shots.max(by: { $0.order < $1.order }) {
            if let id = last.lensId, let l = gear.lenses.first(where: { $0.id == id }) { model.setLens(l) }
            model.filters = last.filters ?? []
            if let iso = last.iso { model.iso = iso }
            first = DialState(shot: last, like: first, apertures: model.apertures)
        }
        _dial = State(initialValue: first)
        _frame = State(initialValue: (shots.map(\.pos).max() ?? 0) + 1)
        _rewindAngle = State(initialValue: Double(shots.count) * -150)
    }

    /// 다이얼 자리: 이 카메라가 지원하는 것만 (P 모드·셔터 범위·B·노출 보정). 수동 카메라는 1/125 · f/8에서 시작
    static func baseDial(_ gear: MeterGear, model: MeterModel) -> DialState {
        let manual = !gear.shutterAuto
        let fullAuto = gear.shutterAuto && gear.program
        let stops = DialState.stops(speeds: model.shutters, manual: manual, program: gear.program)
        let start = manual ? (stops.indices.filter { stops[$0] > 0 }.min { abs(log2(stops[$0] * 125)) < abs(log2(stops[$1] * 125)) } ?? 0) : 0
        // 노출 보정: 이 카메라에 있는 값만 (XA는 역광 +1.5 하나, 기계식은 없음)
        let comps = gear.comps.map { $0.isEmpty ? [0] : $0 } ?? (fullAuto ? [0] : MeterMath.comps)
        return DialState(shutterStops: stops, apertures: model.apertures, s: start,
                         a: fullAuto ? 0 : 1 + MeterMath.nearest(model.apertures, 8), c: comps.firstIndex(of: 0) ?? 0, fullAuto: fullAuto, comps: comps)
    }

    var body: some View {
        VStack(spacing: 12) {
            header
            Spacer(minLength: 6)
            RecordDials(dial: $dial, iso: m.iso, onLocked: show)
            placeTimeCard.padding(.top, 6)
            Spacer(minLength: 6)
            rollPart.padding(.bottom, 70)
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
                    } else if kind == .iso {
                        IsoChips(selected: $m.iso, box: box).padding(16)
                    } else {
                        lensList
                    }
                }
                .navigationTitle(kind == .filter ? "필터" : kind == .iso ? "카메라 ISO" : "렌즈 교체").navigationBarTitleDisplayMode(.inline)
                .toolbar { ToolbarItem(placement: .confirmationAction) { Button("완료") { sheet = nil } } }
            }
            .presentationDetents([.medium]).preferredColorScheme(.dark)
        }
        .sheet(isPresented: $rollSheet) {
            RollShotsSheet(m: m, box: box) { pos in
                rollSheet = false
                // 목록을 닫은 뒤 그 컷 고치기
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.45) { editing = EditTarget(pos: pos) }
            }
            .presentationDetents([.medium, .large]).preferredColorScheme(.dark)
        }
        .sheet(item: $editing) { t in
            if let shot = m.shots.first(where: { $0.pos == t.pos }) {
                ShotDialEditor(shot: shot, like: dial, lenses: m.gear.lenses.isEmpty ? [m.lens] : m.gear.lenses, current: m.lens, iso: m.iso, box: box) { edited in
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
            // 카메라 ISO: 필름 감도와 다르게 맞추면 파랗게 + 오버·언더 스톱
            pill(active: m.iso != box, activeColor: Color(red: 0.62, green: 0.79, blue: 1)) { sheet = .iso } label: {
                HStack(spacing: 4) {
                    Text("ISO").foregroundStyle(m.iso != box ? Color.black.opacity(0.6) : Color.meterSub)
                    Text(MeterMath.trim(m.iso)).bold()
                    if m.iso != box { Text(MeterMath.fmtC(log2(box / m.iso))).font(.system(size: 13, weight: .heavy)) }
                }
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
                .padding(.bottom, -w * 58 / 360 + 30)
                .zIndex(1)
            MeterFilmStrip(shots: m.shots, frames: m.gear.frames, prewind: false, ended: false, nextPos: frame,
                           showFocal: m.showFocal, effISO: m.effISO, film: m.gear.film, onCanister: { rollSheet = true }) { p in
                if m.shots.contains(where: { $0.pos == p }) { editing = EditTarget(pos: p) } else { frame = p }
            }
            .padding(.horizontal, -16)
            .padding(.top, 8)
        }
    }

    /// 셔터: 지금 다이얼 값으로 이 칸을 기록하고, 셔터가 닫힌 뒤 레버가 감기며 다음 칸으로
    private func fire() {
        guard !busy else { return }
        // 소리·감기 대기 시간 (B는 1초로)
        let t = (dial.shutter ?? 1.0 / 125) < 0 ? 1 : (dial.shutter ?? 1.0 / 125)
        // (B는 1초, P·A는 1/125로 소리를 낸다)
        MeterSound.shared.shutter(t)
        UIImpactFeedbackGenerator(style: .rigid).impactOccurred()
        shutterDown = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.14) { shutterDown = false }

        let at = useNow ? Date() : time
        var shot = MeterShot(pos: frame, order: m.shots.count + 1, mode: dial.mode, aperture: dial.aperture, shutter: dial.shutter,
                             comp: dial.comp, flash: dial.flash, ev: 0, focal: m.lens.isZoom ? nil : m.lens.min,
                             at: ISO8601DateFormatter().string(from: at), filters: m.filters.isEmpty ? nil : m.filters)
        shot.lensId = m.lens.id
        shot.iso = m.iso != box ? m.iso : nil
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

/// 셔터 [P?, A, 값…, B] · 조리개 [A, 값…, ⚡] · 노출 보정 (−2 … +2)
/// 셔터 자리 값: P = -2, A = 0, B = -1, 그 밖은 초
struct DialState {
    static let P = -2.0, A = 0.0
    var shutterStops: [Double]
    var apertures: [Double]
    var s: Int
    var a: Int
    var c: Int
    /// 완전 자동 카메라 (셔터·조리개·보정을 직접 못 정함): 조리개 다이얼은 자동/⚡만
    var fullAuto = false
    /// ⚡에서 빠져나올 때 돌아갈 조리개 자리
    var lastAperture: Int = 0

    /// 이 카메라의 셔터 자리: P 모드가 있으면 맨 앞 P, 셔터를 고를 수 있으면 A · 값 · B, 조리개 우선 자동은 A만, 완전 자동은 P만
    static func stops(speeds: [Double], manual: Bool, program: Bool) -> [Double] {
        if !manual { return program ? [P] : [A] }
        return (program ? [P] : []) + [A] + speeds + [MeterMath.bulb]
    }

    var shutterLabels: [String] { shutterStops.map { $0 == Self.P ? "P" : $0 == Self.A ? "A" : MeterMath.lcdS($0) } }
    var shutterAccent: Set<Int> { Set(shutterStops.indices.filter { shutterStops[$0] <= 0 }) }
    var program: Bool { shutterStops.indices.contains(s) && shutterStops[s] == Self.P }
    /// 조작해도 의미 없는 다이얼은 흐리게 막는다
    var shutterEnabled: Bool { shutterStops.count > 1 }
    var apertureEnabled: Bool { !program }
    /// 이 카메라에서 고를 수 있는 노출 보정 값
    var comps: [Double] = MeterMath.comps
    var compEnabled: Bool { comps.count > 1 }

    var apertureLabels: [String] { fullAuto ? ["A", "⚡"] : ["A"] + apertures.map(MeterMath.trim) + ["⚡"] }
    var flashIndex: Int { fullAuto ? 1 : apertures.count + 1 }
    var flash: Bool { a == flashIndex }
    var shutter: Double? {
        guard shutterStops.indices.contains(s) else { return nil }
        let v = shutterStops[s]
        return v == Self.P || v == Self.A ? nil : v
    }
    var aperture: Double? { program || fullAuto || a == 0 || flash || a > apertures.count ? nil : apertures[a - 1] }
    var comp: Double { compEnabled && comps.indices.contains(c) ? comps[c] : 0 }
    var mode: String { program ? "P" : aperture != nil && shutter != nil ? "M" : aperture != nil ? "A" : shutter != nil ? "S" : "P" }

    mutating func toggleFlash() {
        if flash { a = lastAperture } else { lastAperture = a; a = flashIndex }
    }

    init(shutterStops: [Double], apertures: [Double], s: Int, a: Int, c: Int, fullAuto: Bool, comps: [Double] = MeterMath.comps) {
        self.shutterStops = shutterStops; self.apertures = apertures; self.s = s; self.a = a; self.c = c; self.fullAuto = fullAuto; self.comps = comps
    }

    /// 기록된 컷 값으로 다이얼을 맞춘다 (컷 고치기). 카메라 자리(셔터·자동 여부)는 like에서, 조리개는 그 컷 렌즈에서
    init(shot: MeterShot, like t: DialState, apertures: [Double]) {
        shutterStops = t.shutterStops; self.apertures = apertures; fullAuto = t.fullAuto; comps = t.comps
        let stops = t.shutterStops
        let speeds = stops.indices.filter { stops[$0] > 0 }
        if let v = shot.shutter, v < 0, let b = stops.firstIndex(of: MeterMath.bulb) { s = b }
        else if let v = shot.shutter, v > 0, !speeds.isEmpty { s = speeds[MeterMath.nearest(speeds.map { stops[$0] }, v)] }
        else if shot.mode == "P", let p = stops.firstIndex(of: Self.P) { s = p }
        else { s = stops.firstIndex(of: Self.A) ?? 0 }
        let ap = fullAuto ? 0 : shot.aperture.map { 1 + MeterMath.nearest(apertures, $0) } ?? 0
        a = shot.flash ? (fullAuto ? 1 : apertures.count + 1) : ap
        let cs = t.comps
        c = cs.indices.min { abs(cs[$0] - shot.comp) < abs(cs[$1] - shot.comp) } ?? 0
        lastAperture = ap
    }
}

/// 셔터 · (가운데 작게) 노출 보정 · 조리개(⚡) 다이얼. 그 카메라에서 의미 없는 다이얼은 흐리게 막는다
struct RecordDials: View {
    @Binding var dial: DialState
    /// 필름 감도 (보정하면 실제로 맞춘 감도를 보여 준다)
    var iso: Double = 400
    /// 막힌 다이얼을 눌렀을 때 알림
    var onLocked: (String) -> Void = { _ in }

    var body: some View {
        // 카메라 윗면처럼: 셔터 · 노출 보정 · 조리개
        HStack(alignment: .top, spacing: 4) {
            TopDial(title: "셔터", labels: dial.shutterLabels, index: $dial.s, size: 132,
                    big: dial.program ? "P 자동" : dial.shutter.map(MeterMath.fmtS) ?? "자동",
                    accent: dial.shutterAccent, snaps: dial.shutterAccent, bigSize: 24,
                    disabled: !dial.shutterEnabled,
                    onDisabledTap: { onLocked(dial.fullAuto ? "이 카메라는 셔터·조리개를 자동으로 정해요" : "이 카메라는 셔터를 자동으로 정해요") })
                .padding(.top, 56)
            // 노출 보정은 자주 안 쓰니 위쪽에 작게
            CompDial(index: $dial.c, comps: dial.comps, iso: iso, disabled: !dial.compEnabled) { onLocked("이 카메라는 노출 보정이 없어요") }
            TopDial(title: "조리개", labels: dial.apertureLabels, index: $dial.a, size: 132,
                    big: dial.flash ? "플래시" : dial.program ? "P 자동" : dial.aperture.map(MeterMath.fmtA) ?? "자동",
                    accent: [0, dial.flashIndex], snaps: [0, dial.flashIndex], bigSize: 24,
                    disabled: !dial.apertureEnabled,
                    onDisabledTap: { onLocked("P 모드에서는 조리개도 카메라가 정해요") })
                .padding(.top, 56)
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
    var comps: [Double] = MeterMath.comps
    var iso: Double = 400
    var disabled = false
    var onLocked: () -> Void = {}
    /// 보정하면: 실제로 맞춘 감도와 밝게/어둡게 (보정은 감도를 바꿔 다는 것과 같다)
    private var note: String? {
        guard !disabled, comps.indices.contains(index), comps[index] != 0 else { return nil }
        // 다이얼 숫자 그대로 몇 스톱 더 밝게/더 어둡게 (보정은 셔터·조리개를 옮기는 것, 필름 감도는 그대로)
        let c = comps[index]
        return "\(MeterMath.fmtC(abs(c)).replacingOccurrences(of: "+", with: ""))스톱\n\(c > 0 ? "더 밝게" : "더 어둡게")"
    }
    var body: some View {
        let zero = comps.firstIndex(of: 0) ?? 0
        // ⅓ 칸은 점, 정수·반 스톱(역광 +1.5)은 숫자
        return TopDial(title: note ?? "노출 보정", labels: comps.map { $0 == 0 ? "0" : ($0 * 2) == ($0 * 2).rounded() ? MeterMath.fmtC($0) : "·" }, index: $index, size: 88,
                big: disabled || !comps.indices.contains(index) || comps[index] == 0 ? "±0" : MeterMath.fmtC(comps[index]), accent: [zero], snaps: [zero], bigSize: 18, titleColor: note == nil ? .meterSub : Color(white: 0.86),
                disabled: disabled, onDisabledTap: onLocked)
            .frame(width: 96)
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
    var titleColor: Color = .meterSub
    /// 이 카메라에서 의미 없는 다이얼: 흐리게, 돌아가지 않음
    var disabled = false
    var onDisabledTap: (() -> Void)? = nil
    @State private var start: Int?
    /// 원을 그리며 돌린 각도 (반 바퀴를 넘어가도 같은 방향으로 이어진다)
    @State private var lastAngle: Double?
    @State private var turned = 0.0

    /// 칸 사이 각도: 글자 높이만큼은 벌리고, 많지 않으면 넉넉히
    private var step: Double {
        // 점(·)으로만 적는 칸이 있으면 촘촘해도 겹치지 않는다
        if labels.contains("·") { return 20 }
        let r = Double(size / 2 - (size < 100 ? 20 : 24))
        let minStep = 15.5 / r * 180 / .pi
        return max(minStep, min(30, 300 / Double(max(labels.count - 1, 1))))
    }

    var body: some View {
        VStack(spacing: 4) {
            ZStack {
                knob
                ZStack {
                    ForEach(labels.indices, id: \.self) { i in
                        Text(labels[i])
                            .font(.system(size: labels[i] == "·" ? 16 : size < 120 ? 11 : (labels[i].count > 3 ? 11 : 13), weight: i == index ? .heavy : .semibold))
                            .monospacedDigit().lineLimit(1).fixedSize()
                            .foregroundStyle(accent.contains(i) ? Color.meterOrange : .white)
                            .opacity(i == index ? 1 : 0.62)
                            .offset(x: size / 2 - (size < 100 ? 20 : 24))
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
            .opacity(disabled ? 0.32 : 1)
            .contentShape(Circle())
            .onTapGesture { if disabled { onDisabledTap?() } }
            .gesture(DragGesture(minimumDistance: 2).onChanged { v in
                guard !disabled else { return }
                // 손가락을 다이얼 가운데 기준 각도로 따라간다: 시계 방향으로 끌면 다이얼도 시계 방향
                let c = size / 2
                let dx = v.location.x - c, dy = v.location.y - c
                guard dx * dx + dy * dy > 64 else { return }
                let angle = atan2(dy, dx) * 180 / .pi
                if start == nil {
                    start = index; turned = 0
                    lastAngle = atan2(v.startLocation.y - c, v.startLocation.x - c) * 180 / .pi
                }
                var d = angle - (lastAngle ?? angle)
                if d > 180 { d -= 360 } else if d < -180 { d += 360 }
                turned += d; lastAngle = angle
                let next = min(max((start ?? index) - Int((turned / step).rounded()), 0), labels.count - 1)
                if next != index {
                    index = next
                    if snaps.contains(next) { UIImpactFeedbackGenerator(style: .heavy).impactOccurred() }
                    else { UISelectionFeedbackGenerator().selectionChanged() }
                }
            }.onEnded { _ in start = nil; lastAngle = nil })
            Text(big).font(.system(size: bigSize, weight: .semibold, design: .rounded)).monospacedDigit()
                .foregroundStyle(disabled || (index == 0 && accent.contains(0)) ? Color.meterSub : .white)
                .lineLimit(1).minimumScaleFactor(0.6)
            Text(title).font(.system(size: 12, weight: .semibold)).foregroundStyle(titleColor).lineLimit(2).multilineTextAlignment(.center).fixedSize()
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
/// 카메라 ISO 고르기: 필름 감도보다 낮게 맞추면 오버(더 밝게), 높게 맞추면 언더(더 어둡게)
struct IsoChips: View {
    @Binding var selected: Double
    var box: Double
    /// 필름 감도 기준 스톱 ("+1 오버", "−⅔ 언더")
    static func stops(_ iso: Double, box: Double) -> String {
        let s = log2(box / iso)
        return MeterMath.fmtC(s) + (s > 0 ? " 오버" : " 언더")
    }
    private var list: [Double] { MeterMath.isoList.filter { $0 >= box / 8 && $0 <= box * 8 } }
    var body: some View {
        // 카메라 윗면 ISO 다이얼처럼 돌려서 고른다. 필름 감도 자리에서 '딱' 걸린다
        let values = list
        let boxIndex = values.firstIndex(of: box) ?? MeterMath.nearest(values, box)
        VStack(spacing: 14) {
            TopDial(title: selected == box ? "필름 그대로" : Self.stops(selected, box: box),
                    labels: values.map(MeterMath.trim),
                    index: Binding(get: { values.firstIndex(of: selected) ?? MeterMath.nearest(values, selected) }, set: { selected = values[$0] }),
                    size: 220, big: "ISO \(MeterMath.trim(selected))", accent: [boxIndex], snaps: [boxIndex], bigSize: 28,
                    titleColor: selected == box ? .meterSub : Color(white: 0.86))
            Text("필름 감도(ISO \(MeterMath.trim(box)))보다 낮게 맞추면 더 밝게(오버), 높게 맞추면 더 어둡게(언더) 찍혀요.")
                .font(.footnote).foregroundStyle(Color.meterSub).multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
    }
}

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
    @State private var lensSheet = false
    @State private var askDelete = false
    @State private var toast: String?
    let lenses: [MeterLens]
    @State private var lens: MeterLens
    @State private var iso: Double = 400
    @State private var isoSheet = false
    var box: Double = 400

    init(shot: MeterShot, like: DialState, lenses: [MeterLens], current: MeterLens, iso: Double, box: Double, onSave: @escaping (MeterShot) -> Void, onDelete: @escaping () -> Void) {
        self.shot = shot; self.onSave = onSave; self.onDelete = onDelete; self.lenses = lenses; self.box = box
        _iso = State(initialValue: shot.iso ?? box)
        // 그 컷에 끼웠던 렌즈 (모르면 지금 렌즈)
        let l = lenses.first { $0.id == shot.lensId } ?? current
        _lens = State(initialValue: l)
        _dial = State(initialValue: DialState(shot: shot, like: like, apertures: MeterMath.apertures(open: l.open, close: l.close)))
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
                    RecordDials(dial: $dial, iso: iso, onLocked: { toast = $0 }).padding(.top, 8)
                    if let toast { Text(toast).font(.footnote).foregroundStyle(Color.meterSub) }
                    PlaceTimeCard(place: placeName.isEmpty ? "없음" : placeName,
                                  time: time.formatted(date: .abbreviated, time: .shortened),
                                  onPlace: { placeSheet = true }, onTime: { timeSheet = true })
                        .padding(.top, 6)
                    Button {
                        if lens.fixed || lenses.count < 2 { return }
                        lensSheet = true
                    } label: {
                        HStack {
                            Text("렌즈").foregroundStyle(Color.meterSub)
                            Spacer()
                            Text(lens.name).lineLimit(1).truncationMode(.middle)
                            if !lens.fixed && lenses.count > 1 {
                                Image(systemName: "chevron.right").font(.system(size: 12, weight: .semibold)).foregroundStyle(Color.meterSub)
                            }
                        }
                        .font(.system(size: 15)).padding(.horizontal, 14).frame(height: 44)
                        .background(Color.meterPanel, in: RoundedRectangle(cornerRadius: 16))
                        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color.meterLine))
                    }
                    .buttonStyle(.plain)
                    Button { isoSheet = true } label: {
                        HStack {
                            Text("카메라 ISO").foregroundStyle(Color.meterSub)
                            Spacer()
                            Text(iso == box ? "\(MeterMath.trim(iso)) (필름 그대로)" : "\(MeterMath.trim(iso)) · \(IsoChips.stops(iso, box: box))")
                            Image(systemName: "chevron.right").font(.system(size: 12, weight: .semibold)).foregroundStyle(Color.meterSub)
                        }
                        .font(.system(size: 15)).padding(.horizontal, 14).frame(height: 44)
                        .background(Color.meterPanel, in: RoundedRectangle(cornerRadius: 16))
                        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color.meterLine))
                    }
                    .buttonStyle(.plain)
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
            .sheet(isPresented: $isoSheet) {
                NavigationStack {
                    ScrollView { IsoChips(selected: $iso, box: box).padding(16) }
                        .navigationTitle("카메라 ISO").navigationBarTitleDisplayMode(.inline)
                        .toolbar { ToolbarItem(placement: .confirmationAction) { Button("완료") { isoSheet = false } } }
                }
                .presentationDetents([.medium])
            }
            .sheet(isPresented: $filterSheet) {
                NavigationStack {
                    ScrollView { FilterChips(selected: $filters).padding(16) }
                        .navigationTitle("필터").navigationBarTitleDisplayMode(.inline)
                        .toolbar { ToolbarItem(placement: .confirmationAction) { Button("완료") { filterSheet = false } } }
                }
                .presentationDetents([.medium])
            }
            .sheet(isPresented: $lensSheet) {
                NavigationStack {
                    ScrollView {
                        VStack(spacing: 8) {
                            ForEach(lenses) { l in
                                Button {
                                    // 렌즈를 바꾸면 그 렌즈 조리개로 (값은 가장 가까운 곳)
                                    let keep = dial.aperture
                                    lens = l
                                    dial.apertures = MeterMath.apertures(open: l.open, close: l.close)
                                    if !dial.flash { dial.a = keep.map { 1 + MeterMath.nearest(dial.apertures, $0) } ?? 0 }
                                    else { dial.a = dial.apertures.count + 1 }
                                    lensSheet = false
                                } label: {
                                    HStack {
                                        VStack(alignment: .leading) { Text(l.name).bold(); Text(l.rangeText + " f/\(MeterMath.trim(l.open))").font(.caption).foregroundStyle(Color.meterSub) }
                                        Spacer()
                                        if l.id == lens.id { Text("끼움").font(.caption.bold()).foregroundStyle(Color.meterOrange) }
                                    }
                                    .padding(12).background(Color(white: 0.16), in: RoundedRectangle(cornerRadius: 12))
                                }
                                .foregroundStyle(.white)
                            }
                        }
                        .padding(16)
                    }
                    .navigationTitle("렌즈").navigationBarTitleDisplayMode(.inline)
                    .toolbar { ToolbarItem(placement: .confirmationAction) { Button("완료") { lensSheet = false } } }
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
        if s.lensId != lens.id { s.lensId = lens.id; s.focal = lens.isZoom ? nil : lens.min }
        s.filters = filters.isEmpty ? nil : filters
        s.place = placeName.isEmpty ? nil : placeName
        s.lat = point?.latitude; s.lon = point?.longitude
        s.at = ISO8601DateFormatter().string(from: time)
        s.memo = memo.isEmpty ? nil : memo
        s.iso = iso != box ? iso : nil
        onSave(s)
        dismiss()
    }
}

/// 롤 화면 컷 기록에서 여는 컷 고치기 (상세 기록과 같은 다이얼 화면, 웹·갤럭시 RollShotEdit과 같음)
struct RollShotDialEditor: View {
    let roll: RollItem
    let pos: Int
    @Query private var lenses: [LensItem]

    var body: some View {
        var gear = MeterGear.from(roll: roll, lenses: lenses)
        let box = roll.film.map { Double($0.iso) } ?? 400
        if let iso = roll.shotISO { gear.iso = Double(iso) }
        let model = MeterModel(gear: gear, shots: roll.meterShots, rollPrewind: roll.meterPrewind ?? false)
        return Group {
            if let shot = roll.meterShots.first(where: { $0.pos == pos }) {
                ShotDialEditor(shot: shot, like: ManualRecordView.baseDial(gear, model: model),
                               lenses: gear.lenses.isEmpty ? [model.lens] : gear.lenses, current: model.lens, iso: model.iso, box: box) { edited in
                    var e = edited
                    e.edited = true
                    roll.meterShots = roll.meterShots.map { $0.pos == pos ? e : $0 }
                } onDelete: {
                    roll.meterShots.removeAll { $0.pos == pos }
                }
            }
        }
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

/// 상세 기록에서 필름통을 누르면: 필름 정보 + 지금까지 기록한 컷 전부 (번호순). 컷을 누르면 고치기
private struct RollShotsSheet: View {
    @ObservedObject var m: MeterModel
    var box: Double
    var onPick: (Int) -> Void
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            List {
                Section {
                    HStack(spacing: 14) {
                        FilmCanisterView(stock: m.gear.film, format: .f135, fill: true)
                            .frame(width: 96, height: 60)
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                        VStack(alignment: .leading, spacing: 2) {
                            if let brand = m.gear.film?.brand.nilIfBlank {
                                Text(brand).font(.caption.weight(.medium)).foregroundStyle(.secondary)
                            }
                            Text(m.gear.film.map { $0.brand.isEmpty ? $0.displayName : $0.name } ?? "필름").font(.headline)
                            Text("ISO \(MeterMath.trim(box)) · \(m.gear.cameraName)").font(.caption).foregroundStyle(.secondary)
                            Text(m.lens.name).font(.caption).foregroundStyle(.secondary)
                        }
                    }
                    .listRowBackground(Color.clear)
                }
                Section {
                    let shots = m.shots.sorted { $0.pos < $1.pos }
                    if shots.isEmpty {
                        Text("아직 기록한 컷이 없어요.").foregroundStyle(.secondary)
                    }
                    ForEach(shots, id: \.pos) { shot in
                        Button { onPick(shot.pos) } label: {
                            HStack(alignment: .firstTextBaseline, spacing: 12) {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(MeterShot.frameTitle(shot.pos, prewind: m.prewind))
                                    if !shot.rowMeta.isEmpty { Text(shot.rowMeta).font(.caption).foregroundStyle(.secondary) }
                                }
                                Spacer(minLength: 8)
                                Text(shot.exposureLine).foregroundStyle(.secondary).multilineTextAlignment(.trailing)
                            }
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                    }
                } header: {
                    Text("컷 기록 · \(m.shots.count) / \(m.gear.frames)컷")
                }
            }
            .navigationTitle("필름 · 컷 기록").navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("완료") { dismiss() } } }
        }
    }
}
#endif
