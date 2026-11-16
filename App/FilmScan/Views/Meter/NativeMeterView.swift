#if os(iOS)
import SwiftUI
import FilmScanCore

/// 노출계 화면 (네이티브). 배치는 웹 시안과 같다:
/// 헤더 · 5:4 파인더(사진 칸 90%, 칸 밖 검정, 아래 띠에 초록 LED) · 노출 보정 링 · 상태 · 조리개·셔터 링 · (노출계만: 줌 링) · 셔터 줄 · 필름
struct NativeMeterView: View {
    @StateObject private var m: MeterModel
    @StateObject private var camera = MeterCamera()
    /// 기록이 바뀔 때마다 (찍기·고치기)
    var onSave: ([MeterShot], Bool) -> Void = { _, _ in }
    var onClose: () -> Void
    var onEnd: () -> Void = {}

    @State private var askExit = false
    @State private var confirmEnd = false
    @State private var toast: String?
    @State private var sheet: SheetKind?
    @State private var previewOff = 0.0
    @State private var solved = MeterModel.Solved(n: 8, t: 1.0 / 125, diff: 0)
    // 셔터 줄·필름 띠 (웹 시안과 같은 움직임: 셔터가 닫힌 뒤 레버가 돌고, 노브가 돌고, 필름이 한 칸 감긴다)
    @State private var leverOut = false
    @State private var shutterDown = false
    @State private var busy = false
    @State private var rewindAngle = 0.0
    /// 감기 전까지는 찍기 전 칸을 보여 준다
    @State private var shownNext: Int?
    @State private var editing: EditTarget?
    /// 새 롤: 카메라·필름을 보여 주고, 감기 방식을 모르면 묻고 시작
    @State private var startOpen = false
    @State private var startPrewind: Bool?
    struct EditTarget: Identifiable { var pos: Int; var id: Int { pos } }
    @Environment(\.verticalSizeClass) private var vSize
    private let tick = Timer.publish(every: 1.0 / 12, on: .main, in: .common).autoconnect()

    enum SheetKind: String, Identifiable { case filter, iso, lens; var id: String { rawValue } }
    /// 화각 직접 정하기 시트에서 고르는 중인 값 (완료를 눌러야 바뀐다)
    @State private var lensDraft = (zoom: true, min: 24, max: 105)

    /// 같은 노출계 화면의 상태를 이어 쓰는 이름 (롤 id, 노출계만은 "meter-only"). 닫을 때 지운다
    private let session: String?

    init(gear: MeterGear, shots: [MeterShot] = [], rollPrewind: Bool? = nil, session: String? = nil,
         onSave: @escaping ([MeterShot], Bool) -> Void = { _, _ in }, onClose: @escaping () -> Void, onEnd: @escaping () -> Void = {}) {
        self.session = session
        _m = StateObject(wrappedValue: {
            if let session, let kept = MeterModel.live[session] { return kept }
            let made = MeterModel(gear: gear, shots: shots, rollPrewind: rollPrewind)
            if let session { MeterModel.live[session] = made }
            return made
        }())
        let pw = rollPrewind ?? gear.prewind ?? false
        _rewindAngle = State(initialValue: Double(shots.count) * (pw ? 150 : -150))
        _startOpen = State(initialValue: !gear.meterOnly && shots.isEmpty && rollPrewind == nil)
        _startPrewind = State(initialValue: gear.prewind)
        self.onSave = onSave; self.onClose = onClose; self.onEnd = onEnd
    }

    var body: some View {
        GeometryReader { geo in
            let landscape = geo.size.width > geo.size.height && geo.size.width > 560
            Group {
                if landscape {
                    // 가로: 왼쪽 파인더, 오른쪽 링·셔터 (넘치면 오른쪽만 스크롤)
                    VStack(spacing: 8) {
                        header
                        HStack(alignment: .top, spacing: 20) {
                            finder.frame(maxHeight: .infinity)
                            ScrollView { controlsColumn.padding(.bottom, 12) }
                                .frame(width: min(400, geo.size.width * 0.42))
                        }
                    }
                } else {
                    VStack(spacing: 9) {
                        header
                        if m.gear.meterOnly { Spacer(minLength: 0) }
                        finder.layoutPriority(1)
                        if m.gear.meterOnly { Spacer(minLength: 0) }
                        controlsColumn
                        if m.gear.meterOnly { Spacer().frame(height: 44) }
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 6)
        }
        .background(Color.black.ignoresSafeArea())
        .preferredColorScheme(.dark)
        .overlay(alignment: .bottom) { toastView }
        .onAppear { camera.start(); camera.setZoom(m.focal / 40) }
        .onDisappear { camera.stop() }
        .onReceive(tick) { _ in step() }
        .onChange(of: m.focal) { _, f in camera.setZoom(f / 40) }
        .onChange(of: m.metering) { _, _ in pointCamera() }
        .overlay { if askExit { exitCard } }
        // 촬영 끝내기는 한 번 더 묻는다 (끝내면 되돌릴 수 없음)
        .alert("촬영을 끝낼까요?", isPresented: $confirmEnd) {
            Button("취소", role: .cancel) {}
            Button("끝내기", role: .destructive) { askExit = false; m.ended = true; onSave(m.shots, m.prewind); forget(); onEnd() }
        } message: {
            Text("\(m.shotCount)컷 찍었어요. 끝내면 이 롤에는 더 기록할 수 없고, 현상 맡기기로 넘어가요.")
        }
        .sheet(item: $sheet) { kind in sheetView(kind).presentationDetents([.medium]).preferredColorScheme(.dark) }
        .sheet(item: $editing) { t in
            if let shot = m.shots.first(where: { $0.pos == t.pos }) {
                MeterShotEditor(shot: shot, m: m, title: "\(MeterFilmStrip.label(t.pos, prewind: m.prewind))번 컷 고치기") { edited in
                    m.update(edited); onSave(m.shots, m.prewind); show("고쳤어요")
                }
                .presentationDetents([.large]).preferredColorScheme(.dark)
            }
        }
        .overlay { if startOpen { startCard } }
    }

    /// 닫을 때 이어 쓰던 상태를 버린다 (다음에 열면 새로)
    private func forget() { if let session { MeterModel.live[session] = nil } }

    // MARK: 루프 (측광 → 계산 → 자동 링)

    private func step() {
        if !m.held, let ev = camera.meteredEV { m.meterEV += (ev - m.meterEV) * 0.35 }
        let s = m.solve()
        solved = s
        m.followAutoRings(s)
        // 노출 미리보기: 화면이 찍힌 밝기와 고른 값으로 찍힐 밝기의 차이
        if let frame = camera.frameEV {
            let set = log2(s.n * s.n / s.t) - log2(m.iso / 100) + MeterMath.filterStops(m.filters)
            previewOff += (min(max(frame - set, -5), 5) - previewOff) * 0.25
        }
    }

    private func pointCamera() {
        // 사진 칸(파인더 가운데 90%×75%) 안 좌표 → 파인더 전체 좌표
        let p = m.metering == "spot" ? m.spot : CGPoint(x: 0.5, y: 0.5)
        camera.setPoint(CGPoint(x: 0.05 + 0.9 * p.x, y: 0.125 + 0.75 * p.y))
    }

    // MARK: 헤더

    private var header: some View {
        HStack(spacing: 6) {
            Button { if m.gear.meterOnly || m.shots.isEmpty || m.ended { onSave(m.shots, m.prewind); forget(); onClose() } else { askExit = true } } label: {
                Image(systemName: "chevron.left").font(.system(size: 17, weight: .semibold)).frame(width: 36, height: 36)
                    .background(Color.meterPanel, in: Circle())
            }
            VStack(alignment: .leading, spacing: 1) {
                Text(m.gear.meterOnly ? "노출계" : m.gear.cameraName).font(.system(size: 17, weight: .bold)).lineLimit(1)
                if let film = m.gear.film {
                    Text("\(film.displayName) · \(m.gear.frames)컷").font(.system(size: 12)).foregroundStyle(Color.meterSub).lineLimit(1)
                }
            }
            .layoutPriority(1)
            Spacer(minLength: 4)
            // 오른쪽 버튼들은 늘 한 줄. 자리가 모자라면 줄바꿈 대신 옆으로 밀어 본다
            ViewThatFits(in: .horizontal) {
                headerPills
                ScrollView(.horizontal, showsIndicators: false) { headerPills }
            }
        }
        .foregroundStyle(.white)
    }

    private var headerPills: some View {
        HStack(spacing: 6) {
            if m.gear.meterOnly {
                pill { sheet = .iso } label: { HStack(spacing: 4) { Text("ISO").foregroundStyle(Color.meterSub); Text(MeterMath.trim(m.iso)).bold() } }
            }
            pill(active: !m.filters.isEmpty, activeColor: Color(red: 0.62, green: 0.79, blue: 1)) { sheet = .filter } label: {
                HStack(spacing: 4) {
                    Image(systemName: "circle.grid.cross").font(.system(size: 14))
                    if !m.filters.isEmpty { Text(m.filters.count > 1 ? "\(m.filters[0])+\(m.filters.count - 1)" : m.filters[0]) }
                }
            }
            pill {
                guard !m.lens.fixed else { show("렌즈 고정형 카메라라 화각을 바꿀 수 없어요"); return }
                lensDraft = (m.lens.isZoom, m.lens.min, m.lens.isZoom ? m.lens.max : MeterLens.nextMM(m.lens.min, 2.5))
                sheet = .lens
            } label: {
                HStack(spacing: 3) {
                    Text(m.lens.isZoom ? m.lens.rangeText : "\(Int(m.focal))mm").monospacedDigit()
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

    // MARK: 파인더

    private var finder: some View {
        GeometryReader { geo in
            let w = min(geo.size.width, geo.size.height * 1.25), h = w * 0.8
            let frame = CGRect(x: w * 0.05, y: h * 0.125, width: w * 0.9, height: h * 0.75)
            ZStack(alignment: .topLeading) {
                MeterPreview(camera: camera)
                    .overlay(previewTint)
                // 사진 칸 밖은 검정, 경계는 살짝 흐리게
                Rectangle().fill(.black)
                    .mask {
                        Rectangle().overlay(RoundedRectangle(cornerRadius: 2).frame(width: frame.width, height: frame.height)
                            .position(x: frame.midX, y: frame.midY).blur(radius: 4).blendMode(.destinationOut))
                            .compositingGroup()
                    }
                    .allowsHitTesting(false)
                if let fail = camera.failed {
                    Text(fail).font(.system(size: 13)).multilineTextAlignment(.center).padding(12)
                        .background(.black.opacity(0.6), in: RoundedRectangle(cornerRadius: 14)).padding(40)
                        .frame(width: w, height: h)
                }
                if m.metering == "spot" {
                    cross.position(x: frame.minX + frame.width * m.spot.x, y: frame.minY + frame.height * m.spot.y)
                } else if m.metering == "center" {
                    Circle().stroke(Color(red: 1, green: 0.93, blue: 0.75).opacity(0.75), lineWidth: 1)
                        .frame(width: frame.height * 0.45, height: frame.height * 0.45).position(x: frame.midX, y: frame.midY)
                }
                led.frame(width: w * 0.74, height: h * 0.09).position(x: w / 2, y: h - h * 0.08)
            }
            .frame(width: w, height: h)
            .clipShape(RoundedRectangle(cornerRadius: 10))
            .contentShape(Rectangle())
            .gesture(DragGesture(minimumDistance: 0).onChanged { v in
                guard m.metering == "spot" else { return }
                m.spot = CGPoint(x: min(max((v.location.x - frame.minX) / frame.width, 0.04), 0.96),
                                 y: min(max((v.location.y - frame.minY) / frame.height, 0.05), 0.95))
                if m.held { m.held = false }
            }.onEnded { _ in pointCamera() })
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .aspectRatio(1.25, contentMode: .fit)
    }

    /// 고른 조리개·셔터로 찍히면 이 밝기 (화면을 밝게·어둡게)
    @ViewBuilder private var previewTint: some View {
        if previewOff < -0.04 {
            Color.black.opacity(min(0.92, 1 - pow(2, previewOff / 2.2)))
        } else if previewOff > 0.04 {
            Color.white.opacity(min(0.85, (pow(2, previewOff / 2.2) - 1) * 0.45)).blendMode(.screen)
        }
    }

    private var cross: some View {
        ZStack {
            Rectangle().frame(width: 1.5, height: 22)
            Rectangle().frame(width: 22, height: 1.5)
        }
        .foregroundStyle(Color(red: 1, green: 0.93, blue: 0.75).opacity(0.95))
        .shadow(color: .black.opacity(0.5), radius: 1.5)
    }

    private var led: some View {
        let t = m.mode == "S" || m.mode == "M" ? m.shutter : m.shutters[MeterMath.nearest(m.shutters, solved.t)]
        let n = m.mode == "A" || m.mode == "M" ? m.aperture : m.apertures[MeterMath.nearest(m.apertures, solved.n)]
        let k = Int((min(max(solved.diff, -2), 2) * 3).rounded()), out = abs(solved.diff) > 2.1
        let green = Color.meterLED
        return HStack(spacing: 8) {
            Text(MeterMath.lcdS(t)).frame(width: 46, alignment: .leading)
            HStack(spacing: 2) {
                ForEach(-6...6, id: \.self) { i in
                    RoundedRectangle(cornerRadius: 1).frame(width: 3.5, height: i == 0 ? 15 : 11)
                        .opacity(i == k ? 1 : (i == 0 ? 0.45 : 0.22))
                }
            }
            .foregroundStyle(out ? Color(red: 1, green: 0.35, blue: 0.29) : green)
            Spacer(minLength: 0)
            Text("F\(MeterMath.trim(n))").frame(width: 42, alignment: .leading)
            Text("EV \(String(format: "%.1f", m.meterEV))").frame(width: 72, alignment: .trailing)
                .foregroundStyle(m.held ? Color(red: 1, green: 0.76, blue: 0.29) : green)
        }
        .font(.system(size: 15, weight: .bold, design: .monospaced))
        .foregroundStyle(green)
        .shadow(color: Color(red: 0.35, green: 1, blue: 0.47).opacity(0.8), radius: 3)
        .allowsHitTesting(false)
    }

    // MARK: 링·상태·셔터 줄

    private var controlsColumn: some View {
        VStack(spacing: 6) {
            ringRow(title: "노출 보정", tag: m.comp != 0 ? MeterMath.fmtC(m.comp) : nil, on: m.comp != 0, plain: m.comp == 0, action: {
                if m.comp != 0 { m.cIndex = 6; show("보정을 껐어요") }
            }) {
                MeterRing(labels: MeterMath.comps.map(MeterMath.fmtC), index: $m.cIndex, short: true, step: 0.3)
            }
            .padding(.top, 4)
            info
            ringRow(title: "조리개", tag: tagA, on: m.aperturePriority, action: { if let e = m.toggle("a") { show(e) } }) {
                MeterRing(labels: m.apertures.map(MeterMath.fmtA), index: $m.aIndex, auto: m.apertureAuto, step: 0.36,
                          hint: (m.mode == "A" || m.mode == "M") && abs(solved.diff) >= 0.34 ? (solved.diff > 0 ? 1 : -1) : 0,
                          onLocked: { show(m.mode == "P" && m.pLock != nil ? "P 모드는 링을 f/\(MeterMath.trim(m.pLock!))에 두고, 조리개·셔터는 카메라가 정해요" : "이 링은 카메라가 맞춰요") })
            }
            ringRow(title: "셔터", tag: tagS, on: m.shutterPriority, action: { if let e = m.toggle("s") { show(e) } }) {
                MeterRing(labels: m.shutters.map(MeterMath.fmtS), index: $m.sIndex, auto: m.shutterAuto, step: 0.44,
                          hint: (m.mode == "S" || m.mode == "M") && abs(solved.diff) >= 0.34 ? (solved.diff > 0 ? -1 : 1) : 0,
                          onLocked: { show("이 링은 카메라가 맞춰요") })
            }
            if m.gear.meterOnly && m.lens.isZoom { zoomRing }
            if !m.gear.meterOnly { rollPart.padding(.top, 10) }
        }
    }

    private var tagA: String {
        switch m.mode {
        case "P": if let p = m.pLock { return "f/\(MeterMath.trim(p))에 둠" } else { return "자동" }
        case "A": return "우선"
        case "S": return "자동"
        default: return "수동"
        }
    }
    private var tagS: String { m.mode == "S" ? "우선" : m.mode == "M" ? "수동" : "자동" }

    private func ringRow(title: String, tag: String?, on: Bool, plain: Bool = false, action: @escaping () -> Void, @ViewBuilder ring: () -> some View) -> some View {
        HStack(spacing: 6) {
            Button(action: action) {
                VStack(spacing: 2) {
                    Text(title).font(.system(size: 13, weight: .bold)).foregroundStyle(on ? Color.meterOrange : .white)
                    if let tag { Text(tag).font(.system(size: 10, weight: .bold)).foregroundStyle(on ? Color.meterOrange.opacity(0.85) : Color.meterSub) }
                }
                .frame(width: 66).frame(maxHeight: .infinity)
                .background(plain ? Color.clear : (on ? Color.meterOrange.opacity(0.16) : Color.meterPanel), in: RoundedRectangle(cornerRadius: 10))
                .overlay(RoundedRectangle(cornerRadius: 10).stroke(plain ? .clear : (on ? Color.meterOrange : Color.meterLine), lineWidth: 1))
            }
            ring()
        }
        .fixedSize(horizontal: false, vertical: true)
    }

    private var zoomRing: some View {
        let marks = zoomMarks
        return HStack(spacing: 6) {
            Text("줌").font(.system(size: 13, weight: .bold)).frame(width: 66)
            MeterRing(labels: marks.map { "\($0)" }, index: Binding(get: { MeterMath.nearest(marks.map(Double.init), m.focal) },
                                                                    set: { m.focal = Double(marks[$0]) }), step: 0.42)
        }
    }

    private var zoomMarks: [Int] {
        let list = [16, 18, 20, 21, 24, 28, 35, 38, 40, 45, 50, 55, 58, 70, 80, 85, 90, 100, 105, 135, 150, 180, 200, 250, 300]
        return Array(Set([m.lens.min, m.lens.max] + list.filter { $0 > m.lens.min && $0 < m.lens.max })).sorted()
    }

    private var info: some View {
        HStack {
            VStack(alignment: .leading, spacing: 1) {
                let a = abs(solved.diff)
                Text(a < 0.34 ? "적정" : solved.diff > 0 ? "+\(String(format: "%.1f", a)) 오버" : "−\(String(format: "%.1f", a)) 언더")
                    .font(.system(size: 20, weight: .heavy))
                    .foregroundStyle(a < 0.34 ? Color.meterOK : solved.diff > 0 ? Color.meterOver : Color.meterUnder)
                Text("ISO \(MeterMath.trim(m.iso))" + (m.comp != 0 ? " → \(MeterMath.trim(m.effectiveISO))" : "") + (m.filters.isEmpty ? "" : " · " + m.filters.joined(separator: "+")))
                    .font(.system(size: 12)).foregroundStyle(Color.meterSub).monospacedDigit()
            }
            Spacer()
            capsuleButton(m.metering == "spot" ? "스팟" : m.metering == "center" ? "중앙" : "평균") { m.cycleMetering(); show("\(m.metering == "spot" ? "스팟" : m.metering == "center" ? "중앙" : "평균") 측광") }
            capsuleButton(m.held ? "고정됨" : "고정", icon: "lock.fill", on: m.held) {
                m.held.toggle(); show(m.held ? "측광값을 고정했어요 · 구도를 바꿔도 값이 그대로예요" : "고정을 풀었어요")
            }
        }
    }

    private func capsuleButton(_ title: String, icon: String? = nil, on: Bool = false, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 4) {
                if let icon { Image(systemName: icon).font(.system(size: 11)) }
                Text(title)
            }
            .font(.system(size: 13, weight: .semibold)).padding(.horizontal, 13).frame(height: 36)
            .background(on ? Color.meterOrange : Color.meterPanel, in: Capsule())
            .overlay(Capsule().stroke(on ? .clear : Color.meterLine, lineWidth: 1))
            .foregroundStyle(on ? .black : .white)
        }
    }

    /// 되감기 노브 · 카운터(왼쪽 플래시 칸) · 셔터+레버 · 아래 필름 띠 (레버가 필름 위로 지나간다)
    private var rollPart: some View {
        let w: CGFloat = 318
        return VStack(spacing: 0) {
            MeterControls(counter: counterText, sub: "", flash: m.flash, leverOut: leverOut, rewindAngle: rewindAngle, shutterDown: shutterDown,
                          onFlash: { m.flash.toggle(); show(m.flash ? "플래시 켬 · 끌 때까지 찍는 컷에 기록돼요" : "플래시 끔") },
                          onShutter: fire)
                .frame(width: w)
                .padding(.bottom, -w * 58 / 360)
                .zIndex(1)
            MeterFilmStrip(shots: m.shots, frames: m.gear.frames, prewind: m.prewind, ended: m.ended, nextPos: shownNext ?? m.nextPos,
                           showFocal: m.showFocal, effISO: m.effISO, film: m.gear.film) { p in
                if m.shots.contains(where: { $0.pos == p }) { editing = EditTarget(pos: p) } else { show("아직 안 찍은 칸이에요") }
            }
            .padding(.horizontal, -16)
            .padding(.top, 8)
        }
    }

    private var counterText: String {
        let pos = shownNext ?? m.nextPos
        return MeterFilmStrip.label(pos, prewind: m.prewind).isEmpty ? "1" : MeterFilmStrip.label(pos, prewind: m.prewind)
    }

    private func fire() {
        guard !busy, !startOpen else { return }
        guard !m.ended else { show("촬영을 끝낸 롤이에요"); return }
        // 이번 컷의 셔터 속도 (자동이면 노출계가 고른 값)
        let t = m.mode == "S" || m.mode == "M" ? m.shutter : solved.t
        MeterSound.shared.shutter(t)
        UIImpactFeedbackGenerator(style: .rigid).impactOccurred()
        shutterDown = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.14) { shutterDown = false }
        shownNext = m.nextPos
        _ = m.fire()
        onSave(m.shots, m.prewind)
        busy = true
        Task { @MainActor in
            // 셔터가 닫힌 뒤에 감는다
            try? await Task.sleep(for: .milliseconds(Int(max(150, min(t, 8) * 1000 + 140))))
            leverOut = true
            MeterSound.shared.ratchet()
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
            // 감을 때 되감기 노브는 시계 반대 방향 (프리와인딩은 필름이 통으로 들어가니 반대)
            rewindAngle = Double(m.shotCount) * (m.prewind ? 150 : -150)
            shownNext = nil
            try? await Task.sleep(for: .milliseconds(360))
            leverOut = false
            try? await Task.sleep(for: .milliseconds(320))
            busy = false
            if m.shotCount == m.gear.frames { show("\(m.gear.frames)컷 다 찍었어요 · 필름이 남았으면 더 찍어도 돼요") }
        }
    }

    /// 나가기: 아직 촬영 중(그대로 두고 나감)은 크게, 촬영 끝내기는 따로 떨어진 테두리 버튼 + 한 번 더 확인
    private var exitCard: some View {
        ZStack {
            Color.black.opacity(0.6).ignoresSafeArea().onTapGesture { askExit = false }
            VStack(spacing: 12) {
                Text("촬영을 끝냈나요?").font(.system(size: 18, weight: .bold))
                Text("아직 찍는 중이면 지금 상태 그대로 두고 돌아가요.\n찍은 컷은 그대로 남아 있어요.")
                    .font(.system(size: 13)).foregroundStyle(Color.meterSub).multilineTextAlignment(.center)
                Button { askExit = false; onSave(m.shots, m.prewind); forget(); onClose() } label: {
                    Text("아직 촬영 중").font(.system(size: 17, weight: .bold)).frame(maxWidth: .infinity).frame(height: 52)
                        .background(.white, in: RoundedRectangle(cornerRadius: 14)).foregroundStyle(.black)
                }
                .padding(.top, 6)
                Button { confirmEnd = true } label: {
                    Text("촬영 끝내기").font(.system(size: 15, weight: .semibold)).frame(maxWidth: .infinity).frame(height: 44)
                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.meterOrange, lineWidth: 1.5)).foregroundStyle(Color.meterOrange)
                }
                .padding(.top, 10)
                Button("취소") { askExit = false }.font(.system(size: 15)).foregroundStyle(Color.meterSub).padding(.top, 2)
            }
            .padding(20)
            .background(Color(white: 0.08), in: RoundedRectangle(cornerRadius: 22))
            .overlay(RoundedRectangle(cornerRadius: 22).stroke(Color.meterLine))
            .padding(.horizontal, 28)
            .foregroundStyle(.white)
        }
    }

    /// 새 롤 시작 카드 (웹 시안 startSheet): 카메라 · 렌즈 · 필름, 감기 방식을 모르면 한 번만 묻는다
    private var startCard: some View {
        ZStack {
            Color.black.opacity(0.6).ignoresSafeArea()
            VStack(alignment: .leading, spacing: 14) {
                VStack(alignment: .leading, spacing: 10) {
                    startRow("카메라", m.gear.cameraName)
                    startRow("렌즈", m.lens.fixed || m.gear.lenses.isEmpty ? m.lens.name : m.lens.name)
                    if let film = m.gear.film {
                        HStack(spacing: 10) {
                            RoundedRectangle(cornerRadius: 3).fill(Color(meterHex: film.style.body)).frame(width: 18, height: 28)
                            VStack(alignment: .leading, spacing: 2) {
                                Text(film.displayName).font(.system(size: 15, weight: .bold))
                                Text("ISO \(MeterMath.trim(m.iso)) · \(m.gear.frames)컷").font(.system(size: 12)).foregroundStyle(Color.meterSub)
                            }
                        }
                    }
                }
                .padding(14).frame(maxWidth: .infinity, alignment: .leading)
                .background(Color(white: 0.12), in: RoundedRectangle(cornerRadius: 14))
                if m.gear.prewind == nil {
                    VStack(spacing: 8) {
                        Text("프리와인딩 지원 기종인가요?").font(.system(size: 17, weight: .bold))
                        Text("카운트가 \(m.gear.frames)부터 거꾸로 줄어드는 카메라").font(.system(size: 13)).foregroundStyle(Color.meterSub)
                        HStack(spacing: 8) {
                            ynButton("아니오", on: startPrewind == false) { startPrewind = false }
                            ynButton("예", on: startPrewind == true) { startPrewind = true }
                        }
                    }
                    .frame(maxWidth: .infinity)
                } else {
                    Text(m.gear.prewind == true ? "카운트 \(m.gear.frames) → 1 · 프리와인딩" : "카운트 1 → \(m.gear.frames)")
                        .font(.system(size: 13)).foregroundStyle(Color.meterSub).frame(maxWidth: .infinity)
                }
                Button {
                    guard let pw = startPrewind ?? m.gear.prewind else { return }
                    m.prewind = pw
                    rewindAngle = 0
                    onSave(m.shots, pw)
                    startOpen = false
                } label: {
                    Text("시작").font(.system(size: 17, weight: .bold)).frame(maxWidth: .infinity).frame(height: 50)
                        .background((startPrewind ?? m.gear.prewind) == nil ? Color(white: 0.2) : Color.meterOrange, in: RoundedRectangle(cornerRadius: 14))
                        .foregroundStyle((startPrewind ?? m.gear.prewind) == nil ? Color.meterSub : .black)
                }
                .disabled((startPrewind ?? m.gear.prewind) == nil)
            }
            .padding(18)
            .background(Color(white: 0.08), in: RoundedRectangle(cornerRadius: 22))
            .overlay(RoundedRectangle(cornerRadius: 22).stroke(Color.meterLine))
            .padding(.horizontal, 24)
            .foregroundStyle(.white)
        }
    }

    private func startRow(_ k: String, _ v: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(k).font(.system(size: 11, weight: .semibold)).foregroundStyle(Color.meterSub)
            Text(v).font(.system(size: 15, weight: .bold)).lineLimit(1)
        }
    }

    private func ynButton(_ t: String, on: Bool, action: @escaping () -> Void) -> some View {
        Button(action: { action(); UIImpactFeedbackGenerator(style: .light).impactOccurred() }) {
            Text(t).font(.system(size: 15, weight: .bold)).frame(maxWidth: .infinity).frame(height: 44)
                .background(on ? Color.meterOrange : Color(white: 0.16), in: RoundedRectangle(cornerRadius: 12))
                .foregroundStyle(on ? .black : .white)
        }
    }

    // MARK: 시트·알림

    @ViewBuilder private func sheetView(_ kind: SheetKind) -> some View {
        NavigationStack {
            ScrollView {
                switch kind {
                case .filter:
                    chips(["없음"] + MeterMath.filters.map(\.id), isOn: { $0 == "없음" ? m.filters.isEmpty : m.filters.contains($0) }) { id in
                        if id == "없음" { m.filters = [] } else if m.filters.contains(id) { m.filters.removeAll { $0 == id } } else { m.filters.append(id) }
                    }
                case .iso:
                    chips([25, 50, 64, 100, 125, 160, 200, 400, 800, 1600, 3200, 6400].map { "\($0)" }, isOn: { Double($0) == m.iso }) { v in
                        m.setISO(Double(v) ?? 400); sheet = nil
                    }
                case .lens where m.gear.lenses.isEmpty:
                    customLens
                case .lens:
                    VStack(spacing: 8) {
                        ForEach(m.gear.lenses) { l in
                            Button { m.setLens(l); sheet = nil; show("\(l.name)로 바꿨어요 · 다음 컷부터 기록돼요") } label: {
                                HStack {
                                    VStack(alignment: .leading) { Text(l.name).bold(); Text(l.rangeText + " f/\(MeterMath.trim(l.open))").font(.caption).foregroundStyle(Color.meterSub) }
                                    Spacer()
                                    if l.id == m.lens.id { Text("끼움").font(.caption.bold()).foregroundStyle(Color.meterOrange) }
                                }
                                .padding(12).background(Color(white: 0.16), in: RoundedRectangle(cornerRadius: 12))
                                .overlay(RoundedRectangle(cornerRadius: 12).stroke(l.id == m.lens.id ? Color.meterOrange : .clear, lineWidth: 1.5))
                            }
                            .foregroundStyle(.white)
                        }
                    }
                    .padding(16)
                }
            }
            .navigationTitle(kind == .filter ? "필터" : kind == .iso ? "감도" : m.gear.lenses.isEmpty ? "렌즈" : "렌즈 교체")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("완료") {
                        if kind == .lens && m.gear.lenses.isEmpty {
                            m.setCustomLens(min: lensDraft.min, max: lensDraft.zoom ? lensDraft.max : lensDraft.min)
                            show(m.lens.isZoom ? "\(m.lens.min)–\(m.lens.max)mm 줌" : "\(m.lens.min)mm 단렌즈")
                        }
                        sheet = nil
                    }
                }
            }
        }
    }

    /// 화각 직접 정하기 (웹 시안 lensSheet와 같음): 종류 · 초점 거리(가장 넓게) · 가장 길게
    private var customLens: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("줌렌즈는 컷마다 화각이 기록돼요").font(.footnote).foregroundStyle(Color.meterSub)
                .frame(maxWidth: .infinity).padding(.bottom, 6)
            label("종류")
            Picker("종류", selection: Binding(get: { lensDraft.zoom }, set: { z in
                lensDraft.zoom = z
                if lensDraft.max <= lensDraft.min { lensDraft.max = MeterLens.nextMM(lensDraft.min, 2.5) }
            })) {
                Text("단렌즈").tag(false); Text("줌렌즈").tag(true)
            }
            .pickerStyle(.segmented).padding(.horizontal, 16)
            label(lensDraft.zoom ? "가장 넓게" : "초점 거리")
            let mins = Array(Set((lensDraft.zoom ? MeterLens.mmList.dropLast() : MeterLens.mmList[...]) + [lensDraft.min])).sorted()
            FlowChips(items: mins.map { "\($0)mm" }, isOn: { $0 == "\(lensDraft.min)mm" }) { s in
                let v = Int(s.dropLast(2)) ?? lensDraft.min
                lensDraft.min = v
                if lensDraft.max <= v { lensDraft.max = MeterLens.nextMM(v, 2.5) }
            }
            .padding(.horizontal, 16)
            if lensDraft.zoom {
                label("가장 길게")
                let maxes = Array(Set(MeterLens.mmList + [lensDraft.max])).filter { $0 > lensDraft.min }.sorted()
                FlowChips(items: maxes.map { "\($0)mm" }, isOn: { $0 == "\(lensDraft.max)mm" }) { s in
                    lensDraft.max = Int(s.dropLast(2)) ?? lensDraft.max
                }
                .padding(.horizontal, 16)
            }
        }
        .padding(.vertical, 16)
    }

    private func label(_ t: String) -> some View {
        Text(t).font(.footnote.weight(.semibold)).foregroundStyle(Color.meterSub).padding(.horizontal, 16).padding(.top, 8)
    }

    private func chips(_ items: [String], isOn: @escaping (String) -> Bool, tap: @escaping (String) -> Void) -> some View {
        FlowChips(items: items, isOn: isOn, tap: tap).padding(16)
    }

    private func show(_ text: String) {
        withAnimation(.easeOut(duration: 0.2)) { toast = text }
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.2) { if toast == text { withAnimation { toast = nil } } }
    }

    @ViewBuilder private var toastView: some View {
        if let toast {
            Text(toast).font(.system(size: 13)).multilineTextAlignment(.center).padding(.horizontal, 14).padding(.vertical, 10)
                .background(Color(red: 40 / 255, green: 40 / 255, blue: 44 / 255).opacity(0.96), in: RoundedRectangle(cornerRadius: 12))
                .padding(.horizontal, 16).padding(.bottom, 92)
                .transition(.move(edge: .bottom).combined(with: .opacity))
        }
    }
}

/// 눌렀을 때 살짝 줄어드는 단추
private struct PressScale: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label.scaleEffect(configuration.isPressed ? 0.9 : 1).animation(.easeOut(duration: 0.09), value: configuration.isPressed)
    }
}

/// 줄바꿈되는 칩 묶음
private struct FlowChips: View {
    let items: [String]
    let isOn: (String) -> Bool
    let tap: (String) -> Void
    /// 화면이 초당 여러 번 다시 그려지는 동안 한 번 누른 게 두 번 들어가 켜졌다 꺼지는 것 막기
    @State private var last: (item: String, at: Date)?
    var body: some View {
        LazyVGrid(columns: [GridItem(.adaptive(minimum: 72), spacing: 8)], spacing: 8) {
            ForEach(items, id: \.self) { item in
                Button {
                    if let last, last.item == item, Date().timeIntervalSince(last.at) < 0.4 { return }
                    last = (item, Date())
                    tap(item)
                } label: {
                    Text(item).font(.system(size: 14, weight: .semibold)).frame(maxWidth: .infinity).frame(height: 38)
                        .background(isOn(item) ? Color.meterOrange : Color(white: 0.17), in: RoundedRectangle(cornerRadius: 10))
                        .foregroundStyle(isOn(item) ? .black : .white)
                }
            }
        }
    }
}
#endif
