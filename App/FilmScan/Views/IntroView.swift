import SwiftUI

/// 켤 때 한 번. 통에서 필름이 나오고 제목만 보인 뒤 앱으로 넘어간다.
struct IntroView: View {
    var onFinished: () -> Void
    @Environment(\.colorScheme) private var scheme
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var pull: CGFloat = 0
    @State private var risen = false
    @State private var opacity: Double = 1
    @State private var finished = false

    var body: some View {
        ZStack {
            background.ignoresSafeArea()
            VStack(spacing: 30) {
                mark
                Text("필름함")
                    .font(.system(size: 38, weight: .heavy))
                    .tracking(-0.6)
                    .foregroundStyle(scheme == .dark ? Color(red: 0.95, green: 0.93, blue: 0.91) : Color(red: 0.10, green: 0.09, blue: 0.09))
                    .shadow(color: scheme == .dark ? Theme.safelight.opacity(0.25) : .clear, radius: 16)
                    .opacity(risen ? 1 : 0)
                    .offset(y: risen ? 0 : 14)
            }
            .offset(y: -24)
        }
        .opacity(opacity)
        .contentShape(Rectangle())
        .onTapGesture { finish() }
        .accessibilityLabel("필름함")
        .task {
            if reduceMotion {
                pull = 104
                risen = true
                try? await Task.sleep(for: .milliseconds(700))
                finish()
                return
            }
            withAnimation(.timingCurve(0.2, 0.8, 0.2, 1, duration: 0.9)) { risen = true }
            withAnimation(.timingCurve(0.45, 0.05, 0.2, 1, duration: 1.7).delay(0.45)) { pull = 104 }
            try? await Task.sleep(for: .milliseconds(2200))
            finish()
        }
    }

    private var mark: some View {
        ZStack(alignment: .topLeading) {
            IntroLeader()
                .frame(width: 156, height: 79, alignment: .leading)
                .frame(width: pull, height: 79, alignment: .leading)
                .clipped()
                .offset(x: 190, y: 53)
            IntroCanister()
                .frame(width: 110, height: 180)
                .shadow(color: .black.opacity(0.22), radius: 9, y: 10)
                .offset(x: 95)
                .opacity(risen ? 1 : 0)
                .scaleEffect(risen ? 1 : 0.96, anchor: .center)
                .offset(y: risen ? 0 : 14)
        }
        // 통의 왼쪽 기준으로 배치한다. 기본 정렬(가운데)에 오프셋을 더하면 화면 오른쪽으로 밀린다.
        .frame(width: 300, height: 180, alignment: .topLeading)
    }

    @ViewBuilder private var background: some View {
        if scheme == .dark {
            Color(red: 0.047, green: 0.043, blue: 0.039)
            RadialGradient(colors: [Theme.safelight.opacity(0.30), Theme.safelight.opacity(0.08), .clear],
                           center: UnitPoint(x: 0.5, y: 0.32), startRadius: 10, endRadius: 340)
                .ignoresSafeArea()
        } else {
            RadialGradient(
                colors: [Color(red: 0.984, green: 0.976, blue: 0.957), Color(red: 0.949, green: 0.937, blue: 0.910), Color(red: 0.914, green: 0.894, blue: 0.855)],
                center: UnitPoint(x: 0.5, y: 0.38), startRadius: 40, endRadius: 520)
        }
    }

    private func finish() {
        guard !finished else { return }
        finished = true
        withAnimation(.easeIn(duration: 0.4)) { opacity = 0 }
        Task {
            try? await Task.sleep(for: .milliseconds(400))
            onFinished()
        }
    }
}

private struct IntroCanister: View {
    var body: some View {
        Canvas { ctx, size in
            let sx = size.width / 92, sy = size.height / 150
            func box(_ x: CGFloat, _ y: CGFloat, _ w: CGFloat, _ h: CGFloat, _ r: CGFloat = 0) -> Path {
                Path(roundedRect: CGRect(x: x * sx, y: y * sy, width: w * sx, height: h * sy), cornerRadius: r * min(sx, sy))
            }
            let metal = Gradient(stops: [
                .init(color: Color(white: 0.11), location: 0),
                .init(color: Color(white: 0.35), location: 0.35),
                .init(color: Color(white: 0.16), location: 0.6),
                .init(color: Color(white: 0.07), location: 1),
            ])
            let label = Gradient(stops: [
                .init(color: Color(red: 0.85, green: 0.84, blue: 0.81), location: 0),
                .init(color: Color(red: 0.98, green: 0.98, blue: 0.97), location: 0.4),
                .init(color: Color(red: 0.81, green: 0.80, blue: 0.76), location: 1),
            ])
            let band = Gradient(stops: [
                .init(color: Color(red: 0.72, green: 0.25, blue: 0.12), location: 0),
                .init(color: Color(red: 0.89, green: 0.35, blue: 0.20), location: 0.4),
                .init(color: Color(red: 0.66, green: 0.23, blue: 0.11), location: 1),
            ])
            func fillX(_ path: Path, _ g: Gradient) {
                ctx.fill(path, with: .linearGradient(g, startPoint: .zero, endPoint: CGPoint(x: size.width, y: 0)))
            }
            fillX(box(30, 0, 32, 10, 3), metal)
            fillX(box(4, 8, 84, 14, 5), metal)
            fillX(box(6, 20, 80, 108), label)
            let ink = Color(red: 0.16, green: 0.15, blue: 0.13)
            draw(ctx, "FILMCHEST", size: 10 * sy, weight: .heavy, color: ink, x: 46 * sx, y: 38 * sy, tracking: 1.2)
            draw(ctx, "필름함", size: 15 * sy, weight: .heavy, color: ink, x: 46 * sx, y: 52 * sy)
            fillX(box(6, 68, 80, 24), band)
            draw(ctx, "36", size: 17 * sy, weight: .black, color: .white, x: 46 * sx, y: 74 * sy)
            draw(ctx, "C-41 · 135-36", size: 6.5 * sy, weight: .regular, color: Color(red: 0.42, green: 0.38, blue: 0.36), x: 46 * sx, y: 100 * sy, tracking: 0.6)
            for bar in [(14, 112, 8), (26, 114, 5), (36, 112, 9), (50, 114, 6), (60, 112, 4), (68, 114, 8)] as [(CGFloat, CGFloat, CGFloat)] {
                ctx.fill(box(bar.0, bar.1, bar.2, 4), with: .color(ink))
            }
            fillX(box(4, 126, 84, 14, 5), metal)
        }
    }

    private func draw(_ ctx: GraphicsContext, _ string: String, size: CGFloat, weight: Font.Weight, color: Color, x: CGFloat, y: CGFloat, tracking: CGFloat = 0) {
        ctx.draw(Text(string).font(.system(size: size, weight: weight)).tracking(tracking).foregroundStyle(color),
                 at: CGPoint(x: x, y: y), anchor: .top)
    }
}

private struct IntroLeader: View {
    var body: some View {
        Canvas { ctx, size in
            let sx = size.width / 130, sy = size.height / 66
            var path = Path()
            path.move(to: .zero)
            path.addLine(to: CGPoint(x: 104 * sx, y: 0))
            path.addQuadCurve(to: CGPoint(x: 122 * sx, y: 12 * sy), control: CGPoint(x: 116 * sx, y: 0))
            path.addLine(to: CGPoint(x: 130 * sx, y: 26 * sy))
            path.addLine(to: CGPoint(x: 130 * sx, y: 66 * sy))
            path.addLine(to: CGPoint(x: 0, y: 66 * sy))
            path.closeSubpath()
            let film = Gradient(colors: [
                Color(red: 0.77, green: 0.46, blue: 0.22),
                Color(red: 0.66, green: 0.35, blue: 0.15),
                Color(red: 0.55, green: 0.28, blue: 0.10),
            ])
            ctx.fill(path, with: .linearGradient(film, startPoint: .zero, endPoint: CGPoint(x: 0, y: size.height)))
            let hole = Color(red: 0.23, green: 0.11, blue: 0.04).opacity(0.75)
            for x in stride(from: 8, through: 88, by: 16) {
                ctx.fill(Path(roundedRect: CGRect(x: CGFloat(x) * sx, y: 5 * sy, width: 7 * sx, height: 6 * sy), cornerRadius: 1.5), with: .color(hole))
            }
            for x in stride(from: 8, through: 120, by: 16) {
                ctx.fill(Path(roundedRect: CGRect(x: CGFloat(x) * sx, y: 55 * sy, width: 7 * sx, height: 6 * sy), cornerRadius: 1.5), with: .color(hole))
            }
        }
    }
}
