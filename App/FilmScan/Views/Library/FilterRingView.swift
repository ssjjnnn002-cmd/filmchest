import SwiftUI

/// 렌즈 필터 그림의 유리: 필터 종류(UV·ND·CPL…). 기본은 UV (웹 core/filterLook.ts와 같은 표)
struct GlassLook {
    enum Kind: String, CaseIterable { case clear, nd, polar, blackMist, whiteMist, gnd, star, yellow, orange, red, green, blue }
    var kind: Kind
    var color: Color
    var alpha: Double
    var haze: Double

    struct Preset { let kind: Kind; let name: String; let hex: String; let alpha: Double; let haze: Double }
    static let presets: [Preset] = [
        .init(kind: .clear, name: "UV", hex: "#c9d6e6", alpha: 0.16, haze: 0),
        .init(kind: .nd, name: "ND", hex: "#1d1d20", alpha: 0.82, haze: 0),
        .init(kind: .polar, name: "CPL", hex: "#4a4d55", alpha: 0.7, haze: 0),
        .init(kind: .blackMist, name: "블랙 미스트", hex: "#2a2a2e", alpha: 0.62, haze: 0.28),
        .init(kind: .whiteMist, name: "화이트 미스트", hex: "#e9ebef", alpha: 0.42, haze: 0.45),
        .init(kind: .gnd, name: "GND", hex: "#1d1d20", alpha: 0.8, haze: 0),
        .init(kind: .star, name: "스타", hex: "#c9d6e6", alpha: 0.16, haze: 0),
        .init(kind: .yellow, name: "Y2", hex: "#f0be2c", alpha: 0.78, haze: 0),
        .init(kind: .orange, name: "O2", hex: "#ee7a22", alpha: 0.8, haze: 0),
        .init(kind: .red, name: "R1", hex: "#cf2f2a", alpha: 0.82, haze: 0),
        .init(kind: .green, name: "X1", hex: "#4f9a3c", alpha: 0.78, haze: 0),
        .init(kind: .blue, name: "80A", hex: "#3a6fc6", alpha: 0.78, haze: 0),
    ]

    /// glass: 고른 값 (프리셋 이름 또는 #rrggbb). 고르지 않았으면 UV
    init(glass: String?) {
        if let glass, let p = Self.presets.first(where: { $0.kind.rawValue == glass }) {
            self.init(p)
        } else if let glass, glass.hasPrefix("#"), let c = Color(filterHex: glass) {
            self.init(Self.presets[0])
            color = c; alpha = 0.72
        } else {
            self.init(Self.presets[0])
        }
    }

    private init(_ p: Preset) {
        kind = p.kind; color = Color(filterHex: p.hex) ?? .gray; alpha = p.alpha; haze = p.haze
    }
}

extension Color {
    init?(filterHex hex: String) {
        let s = hex.trimmingCharacters(in: CharacterSet(charactersIn: "#"))
        guard s.count == 6, let v = UInt32(s, radix: 16) else { return nil }
        self.init(red: Double((v >> 16) & 0xff) / 255, green: Double((v >> 8) & 0xff) / 255, blue: Double(v & 0xff) / 255)
    }
}

/// 렌즈 필터 그림 (제품 사진처럼 살짝 돌아간 모습): 얇은 검은 링 + 큰 색 유리 + 그림자. 필터는 사진 대신 늘 이 그림 (웹 FilterRing과 같음)
struct FilterRingView: View {
    var glass: String?

    var body: some View {
        let look = GlassLook(glass: glass)
        Canvas { ctx, size in
            let u = min(size.width, size.height) / 100
            // 두께·그림자가 오른쪽으로 나오므로 전체를 조금 왼쪽으로 옮겨 가운데로 (웹과 같음)
            let ox = (size.width - 100 * u) / 2 - 1.6 * u, oy = (size.height - 100 * u) / 2
            func pt(_ x: CGFloat, _ y: CGFloat) -> CGPoint { CGPoint(x: ox + x * u, y: oy + y * u) }
            func ellipse(_ cx: CGFloat, _ cy: CGFloat, _ rx: CGFloat, _ ry: CGFloat) -> Path {
                Path(ellipseIn: CGRect(x: ox + (cx - rx) * u, y: oy + (cy - ry) * u, width: rx * 2 * u, height: ry * 2 * u))
            }
            let all = Path(CGRect(x: ox, y: oy, width: 100 * u, height: 100 * u))
            // 그림자
            ctx.fill(ellipse(53, 94, 27, 3.6), with: .radialGradient(Gradient(colors: [.black.opacity(0.22), .black.opacity(0)]), center: pt(53, 94), startRadius: 0, endRadius: 27 * u))
            // 테 두께 + 앞면 링 + 톱니
            ctx.fill(ellipse(53.2, 48, 34.4, 45.2), with: .color(Color(filterHex: "#070708")!))
            ctx.fill(ellipse(50, 48, 34.4, 45.2), with: .color(Color(filterHex: "#141416")!))
            ctx.stroke(ellipse(50, 48, 33.7, 44.5), with: .color(Color(filterHex: "#3a3a3e")!), style: StrokeStyle(lineWidth: 1 * u, dash: [0.5 * u, 0.55 * u]))
            ctx.stroke(ellipse(50, 48, 31.2, 42.3), with: .color(.black.opacity(0.7)), lineWidth: 1.2 * u)
            // 유리
            ctx.drawLayer { g in
                g.clip(to: ellipse(50, 48, 30, 41))
                g.fill(all, with: .color(look.alpha < 0.3 ? Color(filterHex: "#dfe4ea")! : Color(filterHex: "#101114")!))
                if look.kind == .gnd {
                    g.fill(all, with: .linearGradient(Gradient(stops: [
                        .init(color: look.color.opacity(look.alpha), location: 0), .init(color: look.color.opacity(look.alpha * 0.85), location: 0.45),
                        .init(color: Color(filterHex: "#c9d6e6")!.opacity(0.2), location: 0.62), .init(color: Color(filterHex: "#c9d6e6")!.opacity(0.2), location: 1)]),
                        startPoint: pt(50, 7), endPoint: pt(50, 89)))
                } else {
                    g.fill(all, with: .color(look.color.opacity(look.alpha)))
                }
                if look.haze > 0 {
                    g.fill(all, with: .radialGradient(Gradient(colors: [.white.opacity(look.haze), .white.opacity(look.haze * 0.4)]), center: pt(50, 53), startRadius: 0, endRadius: 45 * u))
                }
                if look.kind == .clear {
                    var a = Path(); a.move(to: pt(24, 70)); a.addQuadCurve(to: pt(76, 62), control: pt(48, 86))
                    g.stroke(a, with: .color(Color(filterHex: "#9b7cf0")!.opacity(0.28)), lineWidth: 2.4 * u)
                }
                if look.kind == .star {
                    var lines = Path()
                    for d in stride(from: 0.0, to: 180, by: 45) {
                        let r = d * .pi / 180
                        lines.move(to: pt(50 + sin(r) * 42, 48 - cos(r) * 42)); lines.addLine(to: pt(50 - sin(r) * 42, 48 + cos(r) * 42))
                    }
                    g.stroke(lines, with: .color(.white.opacity(0.4)), lineWidth: 0.5 * u)
                }
                g.fill(all, with: .linearGradient(Gradient(stops: [.init(color: .white.opacity(0.16), location: 0), .init(color: .white.opacity(0), location: 0.55), .init(color: .black.opacity(0.2), location: 1)]),
                                                  startPoint: pt(20, 7), endPoint: pt(80, 89)))
                g.stroke(ellipse(50, 48, 30, 41), with: .color(.black.opacity(0.28)), lineWidth: 2 * u)
            }
            if look.kind == .polar {
                ctx.fill(Path(roundedRect: CGRect(origin: pt(49.3, 3.6), size: CGSize(width: 1.4 * u, height: 3.6 * u)), cornerRadius: 0.7 * u), with: .color(.white.opacity(0.75)))
            }
        }
        .aspectRatio(1, contentMode: .fit)
        .accessibilityLabel("필터 그림")
    }
}

/// 필터 모양 고르기: UV · ND · CPL … · 직접(색 고르기). 고르지 않으면 UV (웹·갤럭시와 같음)
struct GlassPicker: View {
    @Binding var glass: String?
    @State private var custom: Color = Color(filterHex: "#8a5cd6")!

    var body: some View {
        Section("필터 모양") {
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 4), count: 4), spacing: 6) {
                ForEach(GlassLook.presets.filter { $0.kind != .star }, id: \.kind) { p in
                    let value: String? = p.kind == .clear ? nil : p.kind.rawValue
                    cell(p.name, ring: FilterRingView(glass: value), on: (glass ?? "clear") == p.kind.rawValue) { glass = value }
                }
                let customOn = glass?.hasPrefix("#") == true
                cell("직접", ring: FilterRingView(glass: custom.hexString), on: customOn) { glass = custom.hexString }
            }
            .padding(.vertical, 4)
            // 직접 고르는 색: 누르면 색 고르기 창이 열린다
            ColorPicker("직접 고른 색", selection: $custom, supportsOpacity: false)
            .onChange(of: custom) { _, c in glass = c.hexString }
            .onAppear { if let glass, glass.hasPrefix("#"), let c = Color(filterHex: glass) { custom = c } }
        }
    }

    private func cell(_ label: String, ring: FilterRingView, on: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            VStack(spacing: 4) {
                ring.frame(width: 44, height: 44)
                Text(label).font(.caption2).foregroundStyle(on ? .primary : .secondary).lineLimit(1)
            }
            .padding(.vertical, 6).frame(maxWidth: .infinity)
            .background(on ? Color(.tertiarySystemFill) : .clear, in: RoundedRectangle(cornerRadius: 12))
            .overlay { if on { RoundedRectangle(cornerRadius: 12).stroke(Theme.safelight, lineWidth: 2) } }
        }
        .buttonStyle(.plain)
    }
}
