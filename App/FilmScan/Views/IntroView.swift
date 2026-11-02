import SwiftUI

/// 켤 때 한 번. 앱 아이콘의 필름통이 선으로 그려지고 필름이 나온 뒤 앱으로 넘어간다 (웹·갤럭시와 같게).
struct IntroView: View {
    var onFinished: () -> Void
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var can: CGFloat = 0
    @State private var cap: CGFloat = 0
    @State private var leader: CGFloat = 0
    @State private var holes = [false, false, false, false]
    @State private var opacity: Double = 1
    @State private var finished = false

    private static let orange = Color(red: 0.941, green: 0.439, blue: 0.118)   // #F0701E, 아이콘과 같은 색

    var body: some View {
        ZStack {
            Color(red: 0.078, green: 0.078, blue: 0.078).ignoresSafeArea()   // #141414
            mark.frame(width: 168, height: 163)
        }
        .opacity(opacity)
        .contentShape(Rectangle())
        .onTapGesture { finish() }
        .accessibilityLabel("필름함")
        .task {
            if reduceMotion {
                can = 1; cap = 1; leader = 1; holes = [true, true, true, true]
                try? await Task.sleep(for: .milliseconds(700))
                finish()
                return
            }
            withAnimation(.timingCurve(0.65, 0, 0.35, 1, duration: 0.75).delay(0.1)) { can = 1 }
            withAnimation(.timingCurve(0.65, 0, 0.35, 1, duration: 0.4).delay(0.55)) { cap = 1 }
            withAnimation(.timingCurve(0.45, 0.05, 0.2, 1, duration: 0.6).delay(0.75)) { leader = 1 }
            for i in holes.indices {
                withAnimation(.spring(response: 0.28, dampingFraction: 0.55).delay(1.05 + Double(i) * 0.09)) { holes[i] = true }
            }
            try? await Task.sleep(for: .milliseconds(2200))
            finish()
        }
    }

    /// 아이콘(docs/icon/filmchest-icon.svg)과 같은 선
    private var mark: some View {
        GeometryReader { geo in
            let k = geo.size.width / IconGlyph.box.width
            let line = StrokeStyle(lineWidth: 33 * k, lineCap: .round, lineJoin: .round)
            ZStack {
                IconGlyph(part: .can).trim(from: 0, to: can).stroke(Self.orange, style: line)
                IconGlyph(part: .cap).trim(from: 0, to: cap).stroke(Self.orange, style: line)
                IconGlyph(part: .leader).trim(from: 0, to: leader).stroke(Self.orange, style: line)
                ForEach(IconGlyph.holes.indices, id: \.self) { i in
                    let p = IconGlyph.holes[i]
                    RoundedRectangle(cornerRadius: 7 * k)
                        .fill(Self.orange)
                        .frame(width: 30 * k, height: 30 * k)
                        .scaleEffect(holes[i] ? 1 : 0.3)
                        .opacity(holes[i] ? 1 : 0)
                        .position(x: (p.x + 15 - IconGlyph.box.minX) * k, y: (p.y + 15 - IconGlyph.box.minY) * k)
                }
            }
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

/// 앱 아이콘의 필름통 선 (1024 좌표). 화면 크기에 맞춰 줄인다.
private struct IconGlyph: Shape {
    enum Part { case can, cap, leader }
    var part: Part
    static let box = CGRect(x: 262, y: 262, width: 500, height: 484)
    static let holes = [CGPoint(x: 563, y: 463), CGPoint(x: 613, y: 463), CGPoint(x: 663, y: 463), CGPoint(x: 563, y: 577)]

    func path(in rect: CGRect) -> Path {
        var p = Path()
        switch part {
        case .can:
            p.addRoundedRect(in: CGRect(x: 292, y: 356, width: 232, height: 360), cornerSize: CGSize(width: 40, height: 40))
        case .cap:
            p.move(to: CGPoint(x: 364, y: 356))
            p.addLine(to: CGPoint(x: 364, y: 316))
            p.addQuadCurve(to: CGPoint(x: 388, y: 292), control: CGPoint(x: 364, y: 292))
            p.addLine(to: CGPoint(x: 428, y: 292))
            p.addQuadCurve(to: CGPoint(x: 452, y: 316), control: CGPoint(x: 452, y: 292))
            p.addLine(to: CGPoint(x: 452, y: 356))
        case .leader:
            p.move(to: CGPoint(x: 524, y: 420))
            p.addLine(to: CGPoint(x: 708, y: 420))
            p.addQuadCurve(to: CGPoint(x: 732, y: 444), control: CGPoint(x: 732, y: 420))
            p.addLine(to: CGPoint(x: 732, y: 548))
            p.addQuadCurve(to: CGPoint(x: 708, y: 572), control: CGPoint(x: 732, y: 572))
            p.addLine(to: CGPoint(x: 676, y: 572))
            p.addQuadCurve(to: CGPoint(x: 652, y: 596), control: CGPoint(x: 652, y: 572))
            p.addLine(to: CGPoint(x: 652, y: 628))
            p.addQuadCurve(to: CGPoint(x: 628, y: 652), control: CGPoint(x: 652, y: 652))
            p.addLine(to: CGPoint(x: 524, y: 652))
        }
        let k = rect.width / Self.box.width
        return p.applying(CGAffineTransform(translationX: -Self.box.minX, y: -Self.box.minY).concatenating(CGAffineTransform(scaleX: k, y: k)))
    }
}
