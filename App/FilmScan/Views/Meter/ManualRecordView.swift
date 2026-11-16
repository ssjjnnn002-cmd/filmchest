#if os(iOS)
import SwiftUI
import SwiftData
import FilmScanCore

/// 상세 기록 (노출계 없이): 카메라 윗면 다이얼처럼 셔터·조리개를 돌려 고르고, 칸 번호·장소·시간과 함께 컷마다 남긴다.
/// 기록은 노출계와 같은 MeterShot으로 롤에 저장한다 (롤 화면·스캔 가져오기에서 그대로 쓰임)
struct ManualRecordView: View {
    @StateObject private var m: MeterModel
    var onSave: ([MeterShot], Bool) -> Void
    var onClose: () -> Void

    /// 다이얼: 0번은 A (자동 · 값 없이 기록)
    @State private var sIndex: Int
    @State private var aIndex: Int
    /// 다음에 기록할 칸
    @State private var frame: Int
    /// 기록하면 다음 칸으로 (기본 켬)
    @AppStorage("manualRecord.autoCount") private var autoCount = true
    // 장소: 기본은 현재 위치
    @State private var placeName = ""
    @State private var point: GeoPoint?
    @State private var location = LocationProvider()
    @State private var placeSheet = false
    // 시간: 기본은 기록하는 순간
    @State private var useNow = true
    @State private var time = Date()
    @State private var timeSheet = false
    @State private var editing: EditTarget?
    @State private var toast: String?
    struct EditTarget: Identifiable { var pos: Int; var id: Int { pos } }

    init(gear: MeterGear, shots: [MeterShot], rollPrewind: Bool?, onSave: @escaping ([MeterShot], Bool) -> Void, onClose: @escaping () -> Void) {
        let model = MeterModel(gear: gear, shots: shots, rollPrewind: rollPrewind ?? false)
        _m = StateObject(wrappedValue: model)
        self.onSave = onSave; self.onClose = onClose
        // 자동 카메라(P만 있는 똑딱이)는 둘 다 A, 아니면 1/125 · f/8
        let auto = gear.modes == ["P"]
        _sIndex = State(initialValue: auto ? 0 : 1 + MeterMath.nearest(model.shutters, 1.0 / 125))
        _aIndex = State(initialValue: auto ? 0 : 1 + MeterMath.nearest(model.apertures, 8))
        _frame = State(initialValue: (shots.map(\.pos).max() ?? 0) + 1)
    }

    private var shutterLabels: [String] { ["A"] + m.shutters.map(MeterMath.lcdS) }
    private var apertureLabels: [String] { ["A"] + m.apertures.map(MeterMath.trim) }
    private var shutter: Double? { sIndex == 0 ? nil : m.shutters[sIndex - 1] }
    private var aperture: Double? { aIndex == 0 ? nil : m.apertures[aIndex - 1] }
    private var exists: Bool { m.shots.contains { $0.pos == frame } }

    var body: some View {
        VStack(spacing: 14) {
            header
            HStack(alignment: .top, spacing: 12) {
                TopDial(title: "셔터", labels: shutterLabels, index: $sIndex,
                        big: shutter.map(MeterMath.fmtS) ?? "자동")
                TopDial(title: "조리개", labels: apertureLabels, index: $aIndex,
                        big: aperture.map(MeterMath.fmtA) ?? "자동")
            }
            .padding(.top, 4)
            HStack(spacing: 8) {
                compStepper
                Spacer(minLength: 0)
                chip(m.flash ? "플래시 켬" : "플래시", icon: "bolt.fill", on: m.flash) { m.flash.toggle() }
            }
            infoCard
            recordButton
            Spacer(minLength: 0)
            MeterFilmStrip(shots: m.shots, frames: m.gear.frames, prewind: false, ended: false, nextPos: frame,
                           showFocal: m.showFocal, effISO: m.effISO, film: m.gear.film) { p in
                if m.shots.contains(where: { $0.pos == p }) { editing = EditTarget(pos: p) } else { frame = p }
            }
            .padding(.horizontal, -16)
        }
        .padding(.horizontal, 16)
        .padding(.top, 6)
        .background(Color.black.ignoresSafeArea())
        .ignoresSafeArea(.container, edges: .bottom)
        .preferredColorScheme(.dark)
        .foregroundStyle(.white)
        .overlay(alignment: .bottom) { toastView.padding(.bottom, 150) }
        .task { await locateIfNeeded() }
        .sheet(isPresented: $placeSheet) {
            NavigationStack {
                Form { PlacePickerSection(name: $placeName, point: $point) }
                    .navigationTitle("장소").navigationBarTitleDisplayMode(.inline)
                    .toolbar { ToolbarItem(placement: .confirmationAction) { Button("완료") { placeSheet = false } } }
            }
            .presentationDetents([.medium, .large])
        }
        .sheet(isPresented: $timeSheet) {
            NavigationStack {
                Form {
                    DatePicker("촬영 시간", selection: $time).datePickerStyle(.graphical)
                    Button("지금으로") { useNow = true; timeSheet = false }
                }
                .navigationTitle("촬영 시간").navigationBarTitleDisplayMode(.inline)
                .toolbar { ToolbarItem(placement: .confirmationAction) { Button("완료") { useNow = false; timeSheet = false } } }
            }
            .presentationDetents([.large])
        }
        .sheet(item: $editing) { t in
            if let shot = m.shots.first(where: { $0.pos == t.pos }) {
                MeterShotEditor(shot: shot, m: m, title: "\(t.pos)번 컷 고치기", showPlaceTime: true) { edited in
                    m.update(edited); onSave(m.shots, m.prewind); show("고쳤어요")
                } onDelete: {
                    m.shots.removeAll { $0.pos == t.pos }; onSave(m.shots, m.prewind); show("\(t.pos)번 기록을 지웠어요")
                }
                .presentationDetents([.large]).preferredColorScheme(.dark)
            }
        }
    }

    // MARK: 위

    private var header: some View {
        HStack(spacing: 8) {
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
            Text("\(m.shots.count)컷 기록").font(.system(size: 13, weight: .semibold)).foregroundStyle(Color.meterSub)
                .lineLimit(1).fixedSize()
        }
    }

    private var compStepper: some View {
        HStack(spacing: 0) {
            Button { if m.cIndex > 0 { m.cIndex -= 1; tick() } } label: { Image(systemName: "minus").frame(width: 34, height: 36) }
            VStack(spacing: 0) {
                Text("노출 보정").font(.system(size: 9, weight: .semibold)).foregroundStyle(Color.meterSub)
                Text(m.comp == 0 ? "±0" : MeterMath.fmtC(m.comp)).font(.system(size: 15, weight: .bold)).monospacedDigit()
                    .foregroundStyle(m.comp == 0 ? .white : Color.meterOrange)
            }
            .frame(width: 64).lineLimit(1)
            Button { if m.cIndex < MeterMath.comps.count - 1 { m.cIndex += 1; tick() } } label: { Image(systemName: "plus").frame(width: 34, height: 36) }
        }
        .font(.system(size: 14, weight: .bold))
        .background(Color.meterPanel, in: Capsule())
        .overlay(Capsule().stroke(Color.meterLine))
    }

    private func chip(_ t: String, icon: String, on: Bool, action: @escaping () -> Void) -> some View {
        Button { action(); tick() } label: {
            Label(t, systemImage: icon).font(.system(size: 14, weight: .semibold)).lineLimit(1).fixedSize()
                .padding(.horizontal, 14).frame(height: 36)
                .background(on ? Color(red: 1, green: 0.82, blue: 0.25) : Color.meterPanel, in: Capsule())
                .overlay(Capsule().stroke(on ? .clear : Color.meterLine))
                .foregroundStyle(on ? .black : .white)
        }
    }

    // MARK: 칸 · 장소 · 시간

    private var infoCard: some View {
        VStack(spacing: 0) {
            HStack {
                Text("칸").foregroundStyle(Color.meterSub)
                Spacer()
                Button { if frame > 1 { frame -= 1; tick() } } label: { Image(systemName: "minus.circle.fill").font(.system(size: 24)) }
                    .foregroundStyle(Color(white: 0.35))
                Text("\(frame)").font(.system(size: 22, weight: .bold)).monospacedDigit().frame(minWidth: 44)
                Button { frame += 1; tick() } label: { Image(systemName: "plus.circle.fill").font(.system(size: 24)) }
                    .foregroundStyle(Color(white: 0.35))
            }
            .frame(height: 46)
            Divider().overlay(Color.meterLine)
            Toggle("기록하면 다음 칸으로", isOn: $autoCount).tint(Color.meterOrange).frame(height: 44)
            Divider().overlay(Color.meterLine)
            row("장소", value: location.isLocating && placeName.isEmpty ? "현재 위치 찾는 중…" : (placeName.isEmpty ? "없음" : placeName)) { placeSheet = true }
            Divider().overlay(Color.meterLine)
            row("시간", value: useNow ? "기록하는 순간" : time.formatted(date: .abbreviated, time: .shortened)) {
                if useNow { time = Date() }
                timeSheet = true
            }
        }
        .font(.system(size: 15))
        .padding(.horizontal, 14)
        .background(Color.meterPanel, in: RoundedRectangle(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color.meterLine))
    }

    private func row(_ k: String, value: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack {
                Text(k).foregroundStyle(Color.meterSub)
                Spacer()
                Text(value).lineLimit(1).truncationMode(.middle)
                Image(systemName: "chevron.right").font(.system(size: 12, weight: .semibold)).foregroundStyle(Color.meterSub)
            }
            .frame(height: 44).contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    private var recordButton: some View {
        Button(action: record) {
            Text(exists ? "\(frame)번 다시 기록" : "\(frame)번 기록").font(.system(size: 18, weight: .bold))
                .frame(maxWidth: .infinity).frame(height: 54)
                .background(Color.meterOrange, in: RoundedRectangle(cornerRadius: 16))
                .foregroundStyle(.black)
        }
        .buttonStyle(PressDown())
    }

    // MARK: 기록

    private func record() {
        let mode = aperture != nil && shutter != nil ? "M" : aperture != nil ? "A" : shutter != nil ? "S" : "P"
        let at = useNow ? Date() : time
        var shot = MeterShot(pos: frame, order: m.shots.count + 1, mode: mode, aperture: aperture, shutter: shutter,
                             comp: m.comp, flash: m.flash, ev: 0, focal: m.lens.isZoom ? nil : m.lens.min,
                             at: ISO8601DateFormatter().string(from: at), filters: nil)
        shot.place = placeName.isEmpty ? nil : placeName
        shot.lat = point?.latitude; shot.lon = point?.longitude
        let replaced = exists
        if let old = m.shots.first(where: { $0.pos == frame }) { shot.order = old.order; shot.memo = old.memo; shot.tags = old.tags }
        m.shots.removeAll { $0.pos == frame }
        m.shots.append(shot)
        m.shots.sort { $0.pos < $1.pos }
        onSave(m.shots, m.prewind)
        UIImpactFeedbackGenerator(style: .rigid).impactOccurred()
        show(replaced ? "\(frame)번을 새로 기록했어요" : "\(frame)번 기록")
        if autoCount { frame += 1 }
        if !useNow { time = time.addingTimeInterval(60) }
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

    private func tick() { UISelectionFeedbackGenerator().selectionChanged() }

    private func show(_ text: String) {
        withAnimation(.easeOut(duration: 0.2)) { toast = text }
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.8) { if toast == text { withAnimation { toast = nil } } }
    }

    @ViewBuilder private var toastView: some View {
        if let toast {
            Text(toast).font(.system(size: 14, weight: .semibold)).padding(.horizontal, 16).padding(.vertical, 10)
                .background(.ultraThinMaterial, in: Capsule())
                .transition(.opacity)
        }
    }
}

private struct PressDown: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label.scaleEffect(configuration.isPressed ? 0.97 : 1).opacity(configuration.isPressed ? 0.85 : 1)
    }
}

/// 카메라 윗면에서 본 다이얼: 돌리는 손잡이(널링) 위에 값이 둥글게 적혀 있고, 위쪽 표시에 맞춘 값이 고른 값.
/// 좌우(또는 위아래)로 끌어서 돌린다. 칸마다 가볍게 진동
struct TopDial: View {
    let title: String
    let labels: [String]
    @Binding var index: Int
    /// 아래에 크게 보여 줄 값 (예: 1/125, f/8)
    let big: String
    @State private var start: Int?

    /// 칸 사이 각도. 값이 많으면 뒤쪽이 겹치므로 맞춤 표시 근처만 보인다
    private let step = 32.0

    var body: some View {
        VStack(spacing: 6) {
            ZStack {
                // 손잡이 테두리 (널링)
                Canvas { c, size in
                    let r = min(size.width, size.height) / 2, center = CGPoint(x: size.width / 2, y: size.height / 2)
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
                // 값 (다이얼과 함께 돈다)
                ZStack {
                    ForEach(labels.indices, id: \.self) { i in
                        Text(labels[i])
                            .font(.system(size: labels[i].count > 3 ? 12 : 14, weight: i == index ? .bold : .semibold))
                            .monospacedDigit().lineLimit(1).fixedSize()
                            .foregroundStyle(i == 0 ? Color.meterOrange : .white)
                            .opacity(abs(i - index) <= 2 ? 1 : abs(i - index) <= 4 ? 0.35 : 0)
                            .offset(y: -52)
                            .rotationEffect(.degrees(Double(i) * step))
                    }
                }
                .rotationEffect(.degrees(-Double(index) * step))
                .animation(.spring(duration: 0.28, bounce: 0.15), value: index)
                // 가운데 축
                Circle().fill(LinearGradient(colors: [Color(white: 0.42), Color(white: 0.16)], startPoint: .topLeading, endPoint: .bottomTrailing))
                    .frame(width: 34, height: 34)
            }
            .frame(width: 150, height: 150)
            .overlay(alignment: .top) {
                // 맞춤 표시 (고정)
                Image(systemName: "arrowtriangle.down.fill").font(.system(size: 11)).foregroundStyle(Color.meterOrange).offset(y: -12)
            }
            .contentShape(Circle())
            .gesture(DragGesture(minimumDistance: 2).onChanged { v in
                if start == nil { start = index }
                let d = Int(((v.translation.width - v.translation.height) / 22).rounded())
                let next = min(max((start ?? index) - d, 0), labels.count - 1)
                if next != index { index = next; UISelectionFeedbackGenerator().selectionChanged() }
            }.onEnded { _ in start = nil })
            Text(big).font(.system(size: 26, weight: .semibold, design: .rounded)).monospacedDigit()
                .foregroundStyle(index == 0 ? Color.meterSub : .white)
                .lineLimit(1).minimumScaleFactor(0.6)
            Text(title).font(.system(size: 12, weight: .semibold)).foregroundStyle(Color.meterSub)
        }
        .frame(maxWidth: .infinity)
    }
}

/// 촬영 중 화면에서 여는 상세 기록. 기록은 롤에 바로 저장한다
struct RollManualRecordView: View {
    let roll: RollItem
    @Environment(\.dismiss) private var dismiss
    @Query private var lenses: [LensItem]

    var body: some View {
        ManualRecordView(gear: .from(roll: roll, lenses: lenses), shots: roll.meterShots, rollPrewind: roll.meterPrewind,
                         onSave: { shots, prewind in roll.meterShots = shots; roll.meterPrewind = roll.meterPrewind ?? prewind },
                         onClose: { dismiss() })
    }
}
#endif
