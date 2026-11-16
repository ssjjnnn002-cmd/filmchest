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
    @State private var toast: String?
    @State private var sheet: SheetKind?
    @State private var previewOff = 0.0
    @State private var solved = MeterModel.Solved(n: 8, t: 1.0 / 125, diff: 0)
    @Environment(\.verticalSizeClass) private var vSize
    private let tick = Timer.publish(every: 1.0 / 12, on: .main, in: .common).autoconnect()

    enum SheetKind: String, Identifiable { case filter, iso, lens; var id: String { rawValue } }

    init(gear: MeterGear, shots: [MeterShot] = [], rollPrewind: Bool? = nil,
         onSave: @escaping ([MeterShot], Bool) -> Void = { _, _ in }, onClose: @escaping () -> Void, onEnd: @escaping () -> Void = {}) {
        _m = StateObject(wrappedValue: MeterModel(gear: gear, shots: shots, rollPrewind: rollPrewind))
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
        .confirmationDialog("촬영을 끝냈나요?", isPresented: $askExit, titleVisibility: .visible) {
            Button("아직 촬영 중") { onSave(m.shots, m.prewind); onClose() }
            Button("촬영 끝내기") { m.ended = true; onSave(m.shots, m.prewind); onEnd() }
            Button("취소", role: .cancel) {}
        } message: {
            Text("아직 찍는 중이면 지금 상태 그대로 두고 돌아가요. 찍은 컷은 그대로 남아 있어요.")
        }
        .sheet(item: $sheet) { kind in sheetView(kind).presentationDetents([.medium]).preferredColorScheme(.dark) }
    }

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
            Button { if m.gear.meterOnly || m.shots.isEmpty || m.ended { onSave(m.shots, m.prewind); onClose() } else { askExit = true } } label: {
                Image(systemName: "chevron.left").font(.system(size: 17, weight: .semibold)).frame(width: 36, height: 36)
                    .background(Color.meterPanel, in: Circle())
            }
            VStack(alignment: .leading, spacing: 1) {
                Text(m.gear.meterOnly ? "노출계" : m.gear.cameraName).font(.system(size: 17, weight: .bold)).lineLimit(1)
                if let film = m.gear.film {
                    Text("\(film.displayName) · \(m.gear.frames)컷").font(.system(size: 12)).foregroundStyle(Color.meterSub).lineLimit(1)
                }
            }
            Spacer(minLength: 4)
            if m.gear.meterOnly {
                pill { sheet = .iso } label: { HStack(spacing: 4) { Text("ISO").foregroundStyle(Color.meterSub); Text(MeterMath.trim(m.iso)).bold() } }
            }
            pill(active: !m.filters.isEmpty, activeColor: Color(red: 0.62, green: 0.79, blue: 1)) { sheet = .filter } label: {
                HStack(spacing: 4) {
                    Image(systemName: "circle.grid.cross").font(.system(size: 14))
                    if !m.filters.isEmpty { Text(m.filters.count > 1 ? "\(m.filters[0])+\(m.filters.count - 1)" : m.filters[0]) }
                }
            }
            pill { if !m.lens.fixed { sheet = .lens } } label: {
                HStack(spacing: 3) {
                    Text(m.lens.isZoom ? m.lens.rangeText : "\(Int(m.focal))mm").monospacedDigit()
                    if !m.lens.fixed { Image(systemName: "chevron.right").font(.system(size: 9, weight: .bold)).opacity(0.6) }
                }
            }
        }
        .foregroundStyle(.white)
    }

    private func pill(active: Bool = false, activeColor: Color = .meterOrange, action: @escaping () -> Void, @ViewBuilder label: () -> some View) -> some View {
        Button(action: action) {
            label().font(.system(size: 14, weight: .bold)).padding(.horizontal, 12).frame(height: 36)
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
            if !m.gear.meterOnly { shutterRow.padding(.top, 10) }
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

    /// 되감기 노브 · 카운터(왼쪽 플래시 칸) · 셔터 — 2단계에서 레버·필름·소리를 붙인다
    private var shutterRow: some View {
        HStack(spacing: 0) {
            Circle().strokeBorder(LinearGradient(colors: [Color(white: 0.98), Color(white: 0.55), Color(white: 0.36)], startPoint: .topLeading, endPoint: .bottomTrailing), lineWidth: 5)
                .background(Circle().fill(Color(white: 0.11)))
                .frame(width: 54, height: 54)
            Spacer()
            HStack(spacing: 0) {
                Button { m.flash.toggle(); show(m.flash ? "플래시 켬 · 끌 때까지 찍는 컷에 기록돼요" : "플래시 끔") } label: {
                    VStack(spacing: 4) {
                        Image(systemName: "bolt.fill").font(.system(size: 18))
                        Text(m.flash ? "켬" : "끔").font(.system(size: 10, weight: .bold))
                    }
                    .frame(width: 42, height: 58)
                    .background(m.flash ? Color(red: 1, green: 0.82, blue: 0.25) : Color(white: 0.14), in: RoundedRectangle(cornerRadius: 11))
                    .foregroundStyle(m.flash ? Color.black : Color.meterSub)
                }
                Text(counterText).font(.system(size: 32, weight: .bold)).monospacedDigit().frame(maxWidth: .infinity)
            }
            .padding(4).frame(width: 140, height: 66)
            .background(Color(white: 0.085), in: RoundedRectangle(cornerRadius: 15))
            .overlay(RoundedRectangle(cornerRadius: 15).stroke(Color(white: 0.17)))
            Spacer()
            Button(action: fire) {
                Circle().fill(RadialGradient(colors: [Color(red: 1, green: 0.48, blue: 0.21), Color(red: 0.95, green: 0.38, blue: 0.12), Color(red: 0.85, green: 0.33, blue: 0.1)], center: .init(x: 0.45, y: 0.4), startRadius: 0, endRadius: 30))
                    .frame(width: 46, height: 46)
                    .padding(4).background(Circle().fill(Color(white: 0.16)))
                    .padding(3).background(Circle().fill(LinearGradient(colors: [Color(white: 0.98), Color(white: 0.6), Color(white: 0.36)], startPoint: .topLeading, endPoint: .bottomTrailing)))
            }
            .buttonStyle(PressScale())
        }
        .padding(.horizontal, 6)
    }

    private var counterText: String {
        let pos = m.nextPos
        return m.prewind && pos == 0 ? "1" : (pos >= 1 ? "\(pos)" : pos == 0 ? "0" : "00")
    }

    private func fire() {
        guard !m.ended else { show("촬영을 끝낸 롤이에요"); return }
        UIImpactFeedbackGenerator(style: .rigid).impactOccurred()
        _ = m.fire()
        onSave(m.shots, m.prewind)
        if m.shotCount == m.gear.frames { show("\(m.gear.frames)컷 다 찍었어요 · 필름이 남았으면 더 찍어도 돼요") }
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
                case .lens:
                    VStack(spacing: 8) {
                        ForEach(m.gear.lenses.isEmpty ? [m.lens] : m.gear.lenses) { l in
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
            .navigationTitle(kind == .filter ? "필터" : kind == .iso ? "감도" : "렌즈 교체")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("완료") { sheet = nil } } }
        }
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
    var body: some View {
        LazyVGrid(columns: [GridItem(.adaptive(minimum: 72), spacing: 8)], spacing: 8) {
            ForEach(items, id: \.self) { item in
                Button { tap(item) } label: {
                    Text(item).font(.system(size: 14, weight: .semibold)).frame(maxWidth: .infinity).frame(height: 38)
                        .background(isOn(item) ? Color.meterOrange : Color(white: 0.17), in: RoundedRectangle(cornerRadius: 10))
                        .foregroundStyle(isOn(item) ? .black : .white)
                }
            }
        }
    }
}
#endif
