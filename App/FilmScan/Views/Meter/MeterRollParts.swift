#if os(iOS)
import SwiftUI
import AVFoundation
import FilmScanCore

// 노출계 아래쪽 (상세 기록): 되감기 노브 · 카운터 · 셔터+레버 · 필름 띠 · 필름통.
// 모양·크기·움직임은 웹 시안 prototypes/meter/index.html의 .controls(360×162 좌표) · .stripwrap 그대로.

// MARK: 셔터 줄

struct MeterControls: View {
    var counter: String
    var sub: String
    var flash: Bool
    /// 감는 중 (레버가 -105°까지 돌았다 돌아온다)
    var leverOut: Bool
    /// 되감기 노브 각도 (컷마다 -150°, 프리와인딩은 +150°)
    var rewindAngle: Double
    var shutterDown: Bool
    var onFlash: () -> Void
    var onShutter: () -> Void

    /// 카운터와 노브·셔터 사이 거리 (웹 --spread)
    private let spread: CGFloat = 30

    var body: some View {
        GeometryReader { geo in
            let s = geo.size.width / 360
            ZStack(alignment: .topLeading) {
                rewind
                    .rotationEffect(.degrees(rewindAngle), anchor: UnitPoint(x: 70 / 360, y: 52 / 162))
                    .animation(.timingCurve(0.35, 0, 0.25, 1, duration: 0.6), value: rewindAngle)
                    .offset(x: -spread)
                counterBox
                ZStack(alignment: .topLeading) {
                    lever
                        .rotationEffect(.degrees(leverOut ? -105 : -14), anchor: UnitPoint(x: 290 / 360, y: 52 / 162))
                        .animation(leverOut ? .timingCurve(0.4, 0.1, 0.3, 1, duration: 0.34) : .timingCurve(0.35, 0, 0.25, 1, duration: 0.34), value: leverOut)
                    shutter
                }
                .offset(x: spread)
            }
            .frame(width: 360, height: 162, alignment: .topLeading)
            .scaleEffect(s, anchor: .topLeading)
        }
        .aspectRatio(360 / 162, contentMode: .fit)
    }

    // 되감기 노브 (손잡이 접힌 상태)
    private var rewind: some View {
        Canvas { c, _ in
            func circle(_ r: CGFloat) -> Path { Path(ellipseIn: CGRect(x: 70 - r, y: 52 - r, width: r * 2, height: r * 2)) }
            c.fill(circle(30), with: .radialGradient(Gradient(stops: [.init(color: Color(meterHex: "#fafafa"), location: 0), .init(color: Color(meterHex: "#a5a5a8"), location: 0.6), .init(color: Color(meterHex: "#5d5d60"), location: 1)]),
                                                    center: CGPoint(x: 40 + 60 * 0.38, y: 22 + 60 * 0.35), startRadius: 0, endRadius: 48))
            c.fill(circle(25), with: .color(Color(meterHex: "#1d1d1f")))
            c.stroke(circle(22), with: .color(Color(meterHex: "#2c2c30")), style: StrokeStyle(lineWidth: 1, dash: [2, 2.5]))
            let bar = Path(roundedRect: CGRect(x: 52, y: 47, width: 36, height: 10), cornerRadius: 5)
            c.fill(bar, with: .color(Color(meterHex: "#2f2f33")))
            c.stroke(bar, with: .color(Color(meterHex: "#444444")), lineWidth: 0.8)
            c.fill(Path(ellipseIn: CGRect(x: 79.5, y: 47.5, width: 9, height: 9)), with: .color(Color(meterHex: "#4a4a4e")))
            c.fill(circle(3), with: .color(Color(meterHex: "#555555")))
        }
        .frame(width: 360, height: 162)
        .allowsHitTesting(false)
    }

    private var counterBox: some View {
        ZStack(alignment: .topLeading) {
            RoundedRectangle(cornerRadius: 15).fill(Color(meterHex: "#151517"))
                .overlay(RoundedRectangle(cornerRadius: 15).stroke(Color(meterHex: "#2c2c30"), lineWidth: 1))
                .frame(width: 140, height: 66).offset(x: 110, y: 19)
            // 플래시: 실제 필름 카운터 창처럼 왼쪽 위 번개 표시. 누르면 켜고 끔
            Button(action: onFlash) {
                ZStack {
                    RoundedRectangle(cornerRadius: 11).fill(flash ? Color(meterHex: "#ffd23f") : Color(meterHex: "#232326"))
                    Canvas { c, _ in
                        var p = Path()
                        p.move(to: CGPoint(x: 23.6, y: 8)); p.addLine(to: CGPoint(x: 15, y: 19.6)); p.addLine(to: CGPoint(x: 20.8, y: 19.6))
                        p.addLine(to: CGPoint(x: 19.1, y: 29)); p.addLine(to: CGPoint(x: 28.1, y: 16.7)); p.addLine(to: CGPoint(x: 22.1, y: 16.7)); p.closeSubpath()
                        c.fill(p, with: .color(flash ? Color(meterHex: "#1a1300") : Color(meterHex: "#8d8a85")))
                    }
                    Text(flash ? "켬" : "끔").font(.system(size: 10, weight: .bold))
                        .foregroundStyle(flash ? Color(meterHex: "#1a1300") : Color(meterHex: "#8d8a85"))
                        .position(x: 21, y: 42)
                }
                .frame(width: 42, height: 58)
            }
            .buttonStyle(.plain)
            .offset(x: 114, y: 23)
            Text(counter).font(.system(size: 32, weight: .bold)).monospacedDigit().foregroundStyle(.white)
                .frame(width: 100).position(x: 203, y: 53)
            Text(sub).font(.system(size: 10.5, weight: .medium)).foregroundStyle(Color(red: 235 / 255, green: 235 / 255, blue: 245 / 255).opacity(0.55))
                .frame(width: 160).position(x: 180, y: 93)
        }
        .frame(width: 360, height: 162, alignment: .topLeading)
    }

    // 와인딩 레버: 아그파 옵티마 센서처럼 셔터를 감싼 검은 판이 왼쪽 아래로 이어져 홈 파인 손잡이로 끝난다
    private var lever: some View {
        Canvas { c, _ in
            var p = Path()
            p.move(to: CGPoint(x: 290, y: 18))
            // A 34 34 0 1 1 278.4 84 : 셔터를 감싸는 큰 호
            p.addArc(center: CGPoint(x: 290, y: 52), radius: 34, startAngle: .degrees(-90), endAngle: .degrees(109.9), clockwise: false)
            p.addCurve(to: CGPoint(x: 236, y: 98), control1: CGPoint(x: 266, y: 92), control2: CGPoint(x: 250, y: 98))
            p.addLine(to: CGPoint(x: 202, y: 98))
            p.addArc(center: CGPoint(x: 202, y: 88), radius: 10, startAngle: .degrees(90), endAngle: .degrees(270), clockwise: false)
            p.addLine(to: CGPoint(x: 230, y: 78))
            p.addCurve(to: CGPoint(x: 258.5, y: 64.7), control1: CGPoint(x: 244, y: 78), control2: CGPoint(x: 254, y: 70))
            p.addArc(center: CGPoint(x: 290, y: 52), radius: 34, startAngle: .degrees(158.0), endAngle: .degrees(270), clockwise: false)
            p.closeSubpath()
            c.fill(p, with: .linearGradient(Gradient(stops: [.init(color: Color(meterHex: "#2a2a2d"), location: 0), .init(color: Color(meterHex: "#18181a"), location: 0.6), .init(color: Color(meterHex: "#0f0f10"), location: 1)]),
                                            startPoint: CGPoint(x: 0, y: 18), endPoint: CGPoint(x: 0, y: 98)))
            c.stroke(p, with: .color(Color(meterHex: "#3d3d42")), lineWidth: 0.8)
            var hi = Path(); hi.addArc(center: CGPoint(x: 290, y: 52), radius: 33.4, startAngle: .degrees(-90), endAngle: .degrees(-14), clockwise: false)
            c.stroke(hi, with: .color(.white.opacity(0.14)), style: StrokeStyle(lineWidth: 1.2, lineCap: .round))
            for (y, a, b) in [(82.5, 197.0, 226.0), (86.5, 195.0, 228.0), (90.5, 195.0, 228.0), (94.5, 197.0, 226.0)] {
                var g = Path(); g.move(to: CGPoint(x: a, y: y)); g.addLine(to: CGPoint(x: b, y: y))
                c.stroke(g, with: .color(Color(meterHex: "#47474d")), style: StrokeStyle(lineWidth: 1.5, lineCap: .round))
            }
        }
        .frame(width: 360, height: 162)
        .allowsHitTesting(false)
    }

    private var shutter: some View {
        Button(action: onShutter) {
            ZStack {
                Circle().fill(RadialGradient(stops: [.init(color: Color(meterHex: "#fafafa"), location: 0), .init(color: Color(meterHex: "#a5a5a8"), location: 0.6), .init(color: Color(meterHex: "#5d5d60"), location: 1)],
                                             center: UnitPoint(x: 0.38, y: 0.35), startRadius: 0, endRadius: 42))
                    .frame(width: 53, height: 53)
                Circle().fill(Color(meterHex: "#2a2a2c")).frame(width: 46.4, height: 46.4)
                Circle().fill(RadialGradient(stops: [.init(color: Color(meterHex: "#ff7a35"), location: 0), .init(color: Color(meterHex: "#f2621f"), location: 0.7), .init(color: Color(meterHex: "#d9531a"), location: 1)],
                                             center: UnitPoint(x: 0.45, y: 0.4), startRadius: 0, endRadius: 31))
                    .frame(width: 44.8, height: 44.8)
                    .scaleEffect(shutterDown ? 0.88 : 1).brightness(shutterDown ? -0.2 : 0)
                    .animation(.easeOut(duration: 0.09), value: shutterDown)
            }
            .frame(width: 68, height: 68).contentShape(Circle())
        }
        .buttonStyle(.plain)
        .position(x: 290, y: 52)
    }
}

// MARK: 필름 띠

struct MeterFilmStrip: View {
    var shots: [MeterShot]
    var frames: Int
    var prewind: Bool
    var ended: Bool
    var nextPos: Int
    var showFocal: (MeterShot) -> Bool
    var effISO: (Double) -> Double
    var film: FilmStock?
    /// 왼쪽 아래 필름통을 누르면 (필름 정보·컷 기록 목록)
    var onCanister: (() -> Void)? = nil
    var onTap: (Int) -> Void

    private static let print = Color(meterHex: "#f3a256")
    private static let base = Color(meterHex: "#2a1a0f")

    private var byPos: [Int: MeterShot] { Dictionary(shots.map { ($0.pos, $0) }, uniquingKeysWith: { a, _ in a }) }
    private var range: (lo: Int, hi: Int) {
        let ps = shots.map(\.pos) + [nextPos]
        return (min(1, ps.min() ?? 1), max(prewind ? frames : frames + 2, ps.max() ?? 1))
    }

    static func label(_ p: Int, prewind: Bool) -> String {
        if prewind && p == 0 { return "" }
        return p >= 1 ? "\(p)" : p == 0 ? "0" : p == -1 ? "00" : "E\(-p - 1)"
    }

    var body: some View {
        GeometryReader { geo in
            let shotMap = byPos
            ScrollViewReader { proxy in
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 0) {
                        // 필름통까지 이어지는 필름 (칸·번호 없이). 맨 끝에서 마지막 컷이 딱 가운데에 오는 길이
                        Perforated(width: max(60, geo.size.width / 2 - 52))
                        ForEach(Array(stride(from: range.hi, through: range.lo, by: -1)), id: \.self) { p in
                            Button { onTap(p) } label: { cell(p, shotMap[p]) }
                                .buttonStyle(.plain).id(p)
                        }
                        // 필름 앞쪽 (잘린 혀 모양) — 1번 칸이 가운데일 때 오른쪽에 보인다
                        Tongue()
                        Color.clear.frame(width: max(0, geo.size.width / 2 - 52 - 232))
                    }
                    .frame(height: 112)
                }
                .scrollTargetBehavior(.viewAligned(limitBehavior: .never))
                .colorMultiply(Color(white: 0.84))
                .onAppear { proxy.scrollTo(nextPos, anchor: .center) }
                .onChange(of: nextPos) { _, p in withAnimation(.timingCurve(0.35, 0, 0.25, 1, duration: 0.36)) { proxy.scrollTo(p, anchor: .center) } }
            }
        }
        .frame(height: 112)
        .overlay(alignment: .topLeading) {
            MeterCanister(film: film, frames: frames)
                .frame(width: 80, height: 132)
                .colorMultiply(Color(white: 0.8))
                .shadow(color: .black.opacity(0.55), radius: 3, x: 4)
                .offset(x: -18, y: -10)
                .contentShape(Rectangle())
                .onTapGesture { onCanister?() }
                .allowsHitTesting(onCanister != nil)
                .accessibilityLabel("필름 정보와 컷 기록")
        }
    }

    private func cell(_ p: Int, _ f: MeterShot?) -> some View {
        let isNext = !ended && p == nextPos && f == nil
        let label = Self.label(p, prewind: prewind)
        return ZStack(alignment: .topLeading) {
            Perforated(width: 104)
            if !label.isEmpty {
                Text("▸\(label)  \(label)A").font(.system(size: 9, weight: .bold, design: .monospaced))
                    .foregroundStyle(Self.print.opacity(0.85)).offset(x: 8, y: 13)
            }
            ZStack {
                RoundedRectangle(cornerRadius: 4).fill(f != nil ? Color(meterHex: "#3a2414") : Color(meterHex: "#1a100a"))
                if isNext {
                    RoundedRectangle(cornerRadius: 4).strokeBorder(.white.opacity(0.55), style: StrokeStyle(lineWidth: 1.5, dash: [4, 3]))
                    Text("다음").font(.system(size: 11, weight: .bold)).foregroundStyle(.white.opacity(0.55))
                }
                if let f { frameText(f) }
            }
            .frame(width: 92, height: 60).offset(x: 6, y: 26)
            if f?.flash == true {
                Image(systemName: "bolt.fill").font(.system(size: 9)).foregroundStyle(Color(meterHex: "#ffd23f")).offset(x: 104 - 4 - 11, y: 3)
            }
            if f?.edited == true {
                Text("✎").font(.system(size: 9)).foregroundStyle(Self.print.opacity(0.8)).offset(x: 104 - 9 - 9, y: 11)
            }
        }
        .frame(width: 104, height: 112, alignment: .topLeading)
        .contentShape(Rectangle())
    }

    @ViewBuilder private func frameText(_ f: MeterShot) -> some View {
        let ink = Color(meterHex: "#f6e6d4")
        VStack(spacing: 2) {
            if let a = f.aperture { Text(MeterMath.fmtA(a)).font(.system(size: 17, weight: .heavy)).monospacedDigit().foregroundStyle(ink) }
            if let t = f.shutter {
                if f.aperture != nil { Text(MeterMath.fmtS(t)).font(.system(size: 13, weight: .bold)).monospacedDigit().foregroundStyle(ink.opacity(0.85)) }
                else { Text(MeterMath.fmtS(t)).font(.system(size: 17, weight: .heavy)).monospacedDigit().foregroundStyle(ink) }
            }
            if f.aperture == nil && f.shutter == nil { Text("AUTO").font(.system(size: 13, weight: .heavy)).tracking(1).foregroundStyle(ink.opacity(0.5)) }
            let extra = [showFocal(f) ? "\(f.focal ?? 0)mm" : "", f.comp != 0 ? "\(MeterMath.fmtC(f.comp)) · ISO \(MeterMath.trim(effISO(f.comp)))" : ""] + (f.filters ?? [])
            let line = extra.filter { !$0.isEmpty }.joined(separator: " · ")
            if !line.isEmpty { Text(line).font(.system(size: 11, weight: .heavy)).foregroundStyle(Self.print).lineLimit(2).multilineTextAlignment(.center).minimumScaleFactor(0.7) }
        }
        .padding(.horizontal, 3)
    }
}

/// 위아래 구멍이 난 필름 바탕 (구멍: 6–13px, 17.33px마다)
private struct Perforated: View {
    var width: CGFloat
    var body: some View {
        Canvas { c, size in
            c.fill(Path(CGRect(origin: .zero, size: size)), with: .color(Color(meterHex: "#2a1a0f")))
            var x: CGFloat = 6
            while x < size.width {
                for y in [4.0, size.height - 12] {
                    c.fill(Path(CGRect(x: x, y: y, width: 7, height: 8)), with: .color(.black))
                }
                x += 17.33
            }
        }
        .frame(width: width, height: 112)
    }
}

/// 필름 끝 (감는 쪽 혀 모양 리더)
private struct Tongue: View {
    var body: some View {
        Canvas { c, _ in
            var p = Path()
            p.move(to: .zero); p.addLine(to: CGPoint(x: 206, y: 0))
            p.addQuadCurve(to: CGPoint(x: 227, y: 18), control: CGPoint(x: 226, y: 0))
            p.addLine(to: CGPoint(x: 227, y: 42))
            p.addQuadCurve(to: CGPoint(x: 207, y: 60), control: CGPoint(x: 227, y: 60))
            p.addLine(to: CGPoint(x: 122, y: 60))
            p.addCurve(to: CGPoint(x: 60, y: 84), control1: CGPoint(x: 94, y: 60), control2: CGPoint(x: 76, y: 67))
            p.addCurve(to: CGPoint(x: 0, y: 112), control1: CGPoint(x: 46, y: 100), control2: CGPoint(x: 28, y: 112))
            p.closeSubpath()
            c.fill(p, with: .color(Color(meterHex: "#2a1a0f")))
            var x: CGFloat = 6
            while x < 200 { c.fill(Path(roundedRect: CGRect(x: x, y: 4, width: 7, height: 8), cornerRadius: 1.5), with: .color(Color(meterHex: "#0b0b0c"))); x += 17.33 }
            c.fill(Path(roundedRect: CGRect(x: 6, y: 100, width: 7, height: 8), cornerRadius: 1.5), with: .color(Color(meterHex: "#0b0b0c")))
        }
        .frame(width: 232, height: 112)
    }
}

/// 필름 상자의 큰 두 색 [바탕, 띠] (scripts/render-film-boxes.mjs가 만든 filmbox-colors.json)
enum FilmBoxColors {
    private static let table: [String: [String]] = {
        guard let url = Bundle.main.url(forResource: "filmbox-colors", withExtension: "json"),
              let data = try? Data(contentsOf: url),
              let t = try? JSONDecoder().decode([String: [String]].self, from: data) else { return [:] }
        return t
    }()
    static func of(_ id: String) -> (String, String)? {
        guard let c = table[id], c.count >= 2 else { return nil }
        return (c[0], c[1])
    }
}

/// 화면 왼쪽 끝에 걸친 135 필름통: 상자와 같은 두 색 라벨 · 검은 칸에 큰 '400 36exp.' · 빛 막는 천 · 위아래 검은 마개
struct MeterCanister: View {
    var film: FilmStock?
    var frames: Int

    var body: some View {
        // 라벨은 상자처럼 위 바탕색 · 아래 띠색 (상자 그림이 없는 필름은 필름 색)
        let pair = film.flatMap { FilmBoxColors.of($0.id) } ?? film.map { ($0.style.body, $0.style.band) } ?? ("#f0b43a", "#f0b43a")
        let body = Color(meterHex: pair.0)
        let band = Color(meterHex: pair.1)
        let num = meterLuminance(pair.0) < 0.25 ? (meterLuminance(pair.1) < 0.25 ? Color(meterHex: "#f0b43a") : band) : body
        GeometryReader { geo in
            let s = geo.size.width / 80
            ZStack(alignment: .topLeading) {
                Canvas { c, _ in
                    c.fill(Path(CGRect(x: 2, y: 9, width: 64, height: 114)), with: .color(Color(meterHex: "#0b0b0c")))
                    c.fill(Path(CGRect(x: 2, y: 11, width: 33, height: 110)), with: .color(body))
                    c.fill(Path(CGRect(x: 2, y: 66, width: 33, height: 55)), with: .color(band))
                    // 빛 막는 천 (구겨진 가장자리)
                    var felt = Path()
                    felt.move(to: CGPoint(x: 63, y: 8))
                    felt.addCurve(to: CGPoint(x: 71.5, y: 12), control1: CGPoint(x: 67, y: 7.5), control2: CGPoint(x: 70, y: 9))
                    felt.addCurve(to: CGPoint(x: 71.8, y: 22), control1: CGPoint(x: 70.5, y: 15), control2: CGPoint(x: 72.5, y: 18))
                    felt.addLine(to: CGPoint(x: 72.2, y: 110))
                    felt.addCurve(to: CGPoint(x: 71.8, y: 121), control1: CGPoint(x: 73, y: 114), control2: CGPoint(x: 71, y: 117))
                    felt.addCurve(to: CGPoint(x: 63, y: 124), control1: CGPoint(x: 70, y: 124.5), control2: CGPoint(x: 67, y: 124.8))
                    felt.closeSubpath()
                    c.fill(felt, with: .color(Color(meterHex: "#232221")))
                    c.stroke(felt, with: .color(Color(meterHex: "#55524e")), lineWidth: 0.6)
                }
            }
            .overlay(alignment: .topLeading) {
                // 숫자: 아래 ISO, 위 컷 수 (세로로 돌려 검은 칸에, SVG translate(62 117) rotate(-90)과 같게)
                Canvas { c, _ in
                    var a = c
                    a.translateBy(x: 62, y: 117); a.rotate(by: .degrees(-90))
                    a.draw(Text("\(film?.iso ?? 400)").font(.system(size: 22, weight: .bold)).tracking(-0.6).foregroundColor(num), at: CGPoint(x: 0, y: 4), anchor: .bottomLeading)
                    var b = c
                    b.translateBy(x: 62, y: 71); b.rotate(by: .degrees(-90))
                    b.draw(Text("\(frames)").font(.system(size: 22, weight: .bold)).tracking(-0.6).foregroundColor(num)
                           + Text("exp.").font(.system(size: 11, weight: .bold)).foregroundColor(num), at: CGPoint(x: 0, y: 4), anchor: .bottomLeading)
                }
                .frame(width: 80, height: 132)
            }
            .frame(width: 80, height: 132, alignment: .topLeading)
            .overlay {
                Canvas { c, _ in
                    c.fill(Path(CGRect(x: 2, y: 9, width: 70, height: 114)), with: .linearGradient(
                        Gradient(stops: [.init(color: .black.opacity(0.5), location: 0), .init(color: .white.opacity(0), location: 0.5), .init(color: .white.opacity(0.08), location: 0.72), .init(color: .black.opacity(0.2), location: 0.86)]),
                        startPoint: CGPoint(x: 2, y: 0), endPoint: CGPoint(x: 72, y: 0)))
                    let cap = Gradient(stops: [.init(color: Color(meterHex: "#050505"), location: 0), .init(color: Color(meterHex: "#262628"), location: 0.55), .init(color: Color(meterHex: "#3a3a3d"), location: 0.78), .init(color: Color(meterHex: "#0b0b0c"), location: 1)])
                    c.fill(Path(roundedRect: CGRect(x: 0, y: 3, width: 66, height: 9), cornerRadius: 3.5), with: .linearGradient(cap, startPoint: CGPoint(x: 0, y: 0), endPoint: CGPoint(x: 66, y: 0)))
                    c.fill(Path(roundedRect: CGRect(x: 0, y: 120, width: 66, height: 9), cornerRadius: 3.5), with: .linearGradient(cap, startPoint: CGPoint(x: 0, y: 0), endPoint: CGPoint(x: 66, y: 0)))
                    c.fill(Path(CGRect(x: 16, y: 128, width: 16, height: 4)), with: .color(Color(meterHex: "#0a0a0a")))
                    c.fill(Path(CGRect(x: 0, y: 0, width: 80, height: 132)), with: .linearGradient(
                        Gradient(stops: [.init(color: .black.opacity(0.7), location: 0.22), .init(color: .black.opacity(0), location: 0.62)]),
                        startPoint: CGPoint(x: 0, y: 0), endPoint: CGPoint(x: 80, y: 0)))
                }
                .frame(width: 80, height: 132)
            }
            .scaleEffect(s, anchor: .topLeading)
        }
    }
}

// MARK: 컷 고치기

/// 필름 칸을 누르면 여는 컷 고치기 (웹 시안 sheet와 같은 항목: 모드 · 조리개 · 셔터 · 화각 · 플래시 · 보정 · 필터 · 메모)
struct MeterShotEditor: View {
    @State var shot: MeterShot
    @ObservedObject var m: MeterModel
    var title: String
    /// 상세 기록(노출계 없이)에서 열면 장소·촬영 시간도 고친다
    var showPlaceTime = false
    var onSave: (MeterShot) -> Void
    var onDelete: (() -> Void)? = nil
    @Environment(\.dismiss) private var dismiss
    @State private var placeSheet = false
    @State private var askDelete = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 4) {
                    Text(shot.ev == 0 ? "\(shot.order)번째로 기록" : "\(shot.order)번째로 찍음 · 측정 EV \(String(format: "%.1f", shot.ev))").font(.footnote).foregroundStyle(Color.meterSub)
                        .frame(maxWidth: .infinity).padding(.bottom, 8)
                    if showPlaceTime {
                        group("촬영 시간") {
                            DatePicker("촬영 시간", selection: Binding(
                                get: { shot.at.flatMap { ISO8601DateFormatter().date(from: $0) } ?? Date() },
                                set: { shot.at = ISO8601DateFormatter().string(from: $0) }))
                                .labelsHidden()
                        }
                        group("장소") {
                            Button { placeSheet = true } label: {
                                HStack {
                                    Image(systemName: "mappin.and.ellipse")
                                    Text(shot.place ?? "없음").lineLimit(1)
                                    Spacer()
                                    Image(systemName: "chevron.right").font(.system(size: 12, weight: .semibold)).foregroundStyle(Color.meterSub)
                                }
                                .padding(12).background(Color(white: 0.16), in: RoundedRectangle(cornerRadius: 10))
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    group("모드") {
                        Picker("모드", selection: Binding(get: { shot.mode }, set: { md in
                            shot.mode = md
                            if (md == "A" || md == "M") && shot.aperture == nil { shot.aperture = m.aperture }
                            if (md == "S" || md == "M") && shot.shutter == nil { shot.shutter = m.shutter }
                            if md == "P" || md == "S" { shot.aperture = nil }
                            if md == "P" || md == "A" { shot.shutter = nil }
                        })) {
                            ForEach(["P", "A", "S", "M"], id: \.self) { Text(MeterShot.modeName($0)).tag($0) }
                        }
                        .pickerStyle(.segmented)
                    }
                    if shot.mode == "A" || shot.mode == "M" {
                        group("조리개") { chips(m.apertures.map(MeterMath.fmtA), on: shot.aperture.map(MeterMath.fmtA)) { i in shot.aperture = m.apertures[i] } }
                    }
                    if shot.mode == "S" || shot.mode == "M" {
                        group("셔터") { chips(m.shutters.map(MeterMath.fmtS), on: shot.shutter.map(MeterMath.fmtS)) { i in shot.shutter = m.shutters[i] } }
                    }
                    let focals = focalChoices
                    if focals.count > 1 {
                        group("화각") { chips(focals.map { "\($0)mm" }, on: shot.focal.map { "\($0)mm" }) { i in shot.focal = focals[i] } }
                    }
                    group("플래시") {
                        Picker("플래시", selection: $shot.flash) { Text("끔").tag(false); Text("켬").tag(true) }.pickerStyle(.segmented)
                    }
                    group("노출 보정") {
                        chips(MeterMath.comps.map { $0 == 0 ? "0" : "\(MeterMath.fmtC($0)) (ISO \(MeterMath.trim(m.effISO($0))))" },
                              on: shot.comp == 0 ? "0" : "\(MeterMath.fmtC(shot.comp)) (ISO \(MeterMath.trim(m.effISO(shot.comp))))", min: 104) { i in shot.comp = MeterMath.comps[i] }
                    }
                    group("필터") {
                        let list = shot.filters ?? []
                        chips(["없음"] + MeterMath.filters.map(\.id), isOn: { $0 == "없음" ? list.isEmpty : list.contains($0) }) { id in
                            if id == "없음" { shot.filters = nil }
                            else if list.contains(id) { let next = list.filter { $0 != id }; shot.filters = next.isEmpty ? nil : next }
                            else { shot.filters = list + [id] }
                        }
                    }
                    group("메모") {
                        TextField("메모", text: Binding(get: { shot.memo ?? "" }, set: { shot.memo = $0.isEmpty ? nil : $0 }), axis: .vertical)
                            .padding(12).background(Color(white: 0.16), in: RoundedRectangle(cornerRadius: 10))
                    }
                    if onDelete != nil {
                        Button("이 칸 기록 지우기", role: .destructive) { askDelete = true }
                            .frame(maxWidth: .infinity).padding(.top, 18)
                    }
                }
                .padding(16)
            }
            .navigationTitle(title)
            .navigationBarTitleDisplayMode(.inline)
            .sheet(isPresented: $placeSheet) {
                NavigationStack {
                    Form {
                        PlacePickerSection(name: Binding(get: { shot.place ?? "" }, set: { shot.place = $0.isEmpty ? nil : $0 }),
                                           point: Binding(get: { shot.lat.flatMap { la in shot.lon.map { GeoPoint(latitude: la, longitude: $0) } } },
                                                          set: { shot.lat = $0?.latitude; shot.lon = $0?.longitude }))
                    }
                    .navigationTitle("장소").navigationBarTitleDisplayMode(.inline)
                    .toolbar { ToolbarItem(placement: .confirmationAction) { Button("완료") { placeSheet = false } } }
                }
            }
            .confirmationDialog("이 칸 기록을 지울까요?", isPresented: $askDelete, titleVisibility: .visible) {
                Button("지우기", role: .destructive) { onDelete?(); dismiss() }
            }
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("취소") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) { Button("저장") { onSave(shot); dismiss() }.bold() }
            }
        }
    }

    /// 줌렌즈면 그 범위의 화각들, 단렌즈인데 다른 화각으로 찍힌 컷이면 그 둘
    private var focalChoices: [Int] {
        var list = m.lens.isZoom ? MeterLens.mmList.filter { $0 >= m.lens.min && $0 <= m.lens.max } : [m.lens.min]
        if m.lens.isZoom { list = Array(Set(list + [m.lens.min, m.lens.max])) }
        if let f = shot.focal, !list.contains(f) { list.append(f) }
        return list.sorted()
    }

    private func group(_ t: String, @ViewBuilder _ content: () -> some View) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(t).font(.footnote.weight(.semibold)).foregroundStyle(Color.meterSub)
            content()
        }
        .padding(.top, 10)
    }

    private func chips(_ items: [String], on: String?, min: CGFloat = 72, tap: @escaping (Int) -> Void) -> some View {
        chips(items, isOn: { $0 == on }, min: min) { item in if let i = items.firstIndex(of: item) { tap(i) } }
    }

    private func chips(_ items: [String], isOn: @escaping (String) -> Bool, min: CGFloat = 72, tap: @escaping (String) -> Void) -> some View {
        LazyVGrid(columns: [GridItem(.adaptive(minimum: min), spacing: 8)], spacing: 8) {
            ForEach(items, id: \.self) { item in
                Button { tap(item) } label: {
                    Text(item).font(.system(size: 13, weight: .semibold)).lineLimit(1).minimumScaleFactor(0.7)
                        .frame(maxWidth: .infinity).frame(height: 36)
                        .background(isOn(item) ? Color.meterOrange : Color(white: 0.17), in: RoundedRectangle(cornerRadius: 10))
                        .foregroundStyle(isOn(item) ? .black : .white)
                }
            }
        }
    }
}

// MARK: 소리

/// 셔터(앞막·뒷막 두 번, 사이는 실제 셔터 속도) · 감는 소리 (웹 시안과 같은 잡음 소리)
@MainActor
final class MeterSound {
    static let shared = MeterSound()
    private let engine = AVAudioEngine()
    private let player = AVAudioPlayerNode()
    private let rate = 44100.0
    private lazy var format = AVAudioFormat(standardFormatWithSampleRate: rate, channels: 1)!

    private init() {
        engine.attach(player)
        engine.connect(player, to: engine.mainMixerNode, format: format)
        try? AVAudioSession.sharedInstance().setCategory(.ambient, options: [.mixWithOthers])
    }

    private func ensure() {
        if !engine.isRunning { try? engine.start() }
        if !player.isPlaying { player.play() }
    }

    /// 감쇠하는 잡음을 대역 통과로 거른 '딸깍'들을 한 버퍼에 섞는다 (at·dur 초, freq Hz)
    private func play(_ clicks: [(at: Double, dur: Double, freq: Double, gain: Double)]) {
        let total = (clicks.map { $0.at + $0.dur }.max() ?? 0) + 0.02
        let n = AVAudioFrameCount(total * rate)
        guard n > 0, let buf = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: n), let d = buf.floatChannelData?[0] else { return }
        buf.frameLength = n
        for i in 0..<Int(n) { d[i] = 0 }
        for k in clicks {
            let start = Int(k.at * rate), len = Int(k.dur * rate)
            // 대역 통과 (Q 1.4) 바이쿼드
            let w = 2 * Double.pi * k.freq / rate, alpha = sin(w) / (2 * 1.4)
            let b0 = alpha, b2 = -alpha, a0 = 1 + alpha, a1 = -2 * cos(w), a2 = 1 - alpha
            var x1 = 0.0, x2 = 0.0, y1 = 0.0, y2 = 0.0
            for i in 0..<len where start + i < Int(n) {
                let x = Double.random(in: -1...1) * pow(1 - Double(i) / Double(len), 3)
                let y = (b0 * x + b2 * x2 - a1 * y1 - a2 * y2) / a0
                x2 = x1; x1 = x; y2 = y1; y1 = y
                d[start + i] += Float(y * k.gain)
            }
        }
        ensure()
        player.scheduleBuffer(buf, completionHandler: nil)
    }

    func shutter(_ t: Double) {
        let gap = min(max(t, 0.012), 8)
        play([(0.01, 0.028, 2600, 1.6), (0.012, 0.05, 900, 0.7), (0.01 + gap, 0.03, 2100, 1.5), (0.012 + gap, 0.06, 700, 0.8)])
    }

    func ratchet() {
        play((0..<7).map { (Double($0) * 0.045, 0.012, 5200, 0.35) })
    }
}
#endif
