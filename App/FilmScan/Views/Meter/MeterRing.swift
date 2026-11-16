#if os(iOS)
import SwiftUI

/// 렌즈 링: 원통에 새긴 숫자가 돌아가는 모양 (라이카·후지 수동 렌즈처럼 금속 널링 띠 + 검은 경통 + 주황 기준선).
/// 손가락으로 돌리면 칸마다 '톡' 진동, 놓으면 가까운 칸에 멈춘다. 자동 쪽 링은 카메라가 돌린다.
struct MeterRing: View {
    let labels: [String]
    @Binding var index: Int
    var auto = false
    var short = false
    /// 칸 사이 각도 (라디안)
    var step = 0.36
    /// 정노출 쪽 빛 세모: -1 왼쪽, 1 오른쪽, 0 없음
    var hint = 0
    var onLocked: (() -> Void)?

    @StateObject private var eng = RingEngine()

    var body: some View {
        GeometryReader { geo in
            TimelineView(.animation) { tl in
                Canvas { g, size in
                    eng.tick(target: Double(index), auto: auto)
                    draw(&g, size, time: tl.date.timeIntervalSinceReferenceDate)
                }
            }
            .contentShape(Rectangle())
            .gesture(drag(width: geo.size.width))
        }
        .frame(height: short ? 44 : 50)
        .clipShape(RoundedRectangle(cornerRadius: 9, style: .continuous))
    }

    private func drag(width: CGFloat) -> some Gesture {
        DragGesture(minimumDistance: 0)
            .onChanged { v in
                if auto { if !eng.lockedToldOnce { eng.lockedToldOnce = true; onLocked?() }; return }
                if !eng.dragging { eng.dragging = true; eng.start = eng.pos }
                let r = width / 2
                eng.pos = min(max(eng.start - v.translation.width / (r * step), -0.4), Double(labels.count) - 0.6)
                let i = min(max(Int(eng.pos.rounded()), 0), labels.count - 1)
                if i != index { index = i; eng.tickHaptic() }
            }
            .onEnded { v in
                eng.lockedToldOnce = false
                guard !auto else { return }
                eng.dragging = false
                let r = width / 2
                let target: Double
                if abs(v.translation.width) < 5 {
                    // 누른 자리의 숫자로 (원통에서 보이는 위치 → 각도)
                    let sx = min(max((v.location.x - r) / (r * 0.96), -0.99), 0.99)
                    target = eng.pos + asin(sx) / step
                } else {
                    target = eng.start - v.predictedEndTranslation.width / (r * step)
                }
                let i = min(max(Int(target.rounded()), 0), labels.count - 1)
                if i != index { index = i; eng.tickHaptic() }
            }
    }

    private func draw(_ g: inout GraphicsContext, _ size: CGSize, time: Double) {
        let w = size.width, h = size.height, c = w / 2, r = c * 0.96
        let band: CGFloat = short ? 12 : 15
        // 바탕
        g.fill(Path(CGRect(origin: .zero, size: size)), with: .color(Color(red: 10 / 255, green: 10 / 255, blue: 11 / 255)))
        // 널링 띠
        g.fill(Path(CGRect(x: 0, y: 0, width: w, height: band)),
               with: .linearGradient(Gradient(colors: [Color(white: 0.29), Color(white: 0.15), Color(white: 0.07)]), startPoint: .zero, endPoint: CGPoint(x: 0, y: band)))
        let rs = step / 5
        for i in 0..<160 {
            var th = (Double(i) * rs - eng.pos * step).truncatingRemainder(dividingBy: .pi * 2)
            th = (th + .pi * 3).truncatingRemainder(dividingBy: .pi * 2) - .pi
            guard abs(th) < 1.52 else { continue }
            let x = c + r * sin(th), k = cos(th)
            g.fill(Path(CGRect(x: x - 0.8 * k, y: 1, width: 1.6 * k, height: band - 2)),
                   with: .linearGradient(Gradient(colors: [Color(white: 0.9), Color(white: 0.55), Color(white: 0.21)]), startPoint: CGPoint(x: x, y: 0), endPoint: CGPoint(x: x, y: band)))
        }
        g.fill(Path(CGRect(x: 0, y: band - 0.5, width: w, height: 0.5)), with: .color(.white.opacity(0.12)))
        // 경통 (숫자 칸)
        g.fill(Path(CGRect(x: 0, y: band, width: w, height: h - band)),
               with: .linearGradient(Gradient(stops: [.init(color: Color(white: 0.094), location: 0), .init(color: Color(white: 0.137), location: 0.3),
                                                      .init(color: Color(white: 0.075), location: 0.7), .init(color: Color(white: 0.035), location: 1)]),
                                     startPoint: CGPoint(x: 0, y: band), endPoint: CGPoint(x: 0, y: h)))
        // 숫자
        let mid = band + (h - band) / 2
        let idx = min(max(Int(eng.pos.rounded()), 0), labels.count - 1)
        for (i, label) in labels.enumerated() {
            let th = (Double(i) - eng.pos) * step
            guard abs(th) <= 1.5 else { continue }
            let k = cos(th)
            let color: Color = auto ? Color(white: 0.49) : (i == idx ? .white : Color(white: 0.945))
            let text = g.resolve(Text(label).font(.custom("Futura-Medium", size: 15.5)).foregroundColor(color))
            var layer = g
            layer.opacity = k * k
            layer.translateBy(x: c + r * sin(th), y: mid)
            layer.scaleBy(x: k, y: 1)
            layer.draw(text, at: .zero, anchor: .center)
        }
        // 기준선
        g.fill(Path(roundedRect: CGRect(x: c - 1, y: band, width: 2, height: 7), cornerRadius: 1), with: .color(auto ? Color(white: 0.43) : .meterOrange))
        // 원통 그늘 (양끝 어둡게)
        g.fill(Path(CGRect(origin: .zero, size: size)),
               with: .linearGradient(Gradient(stops: [.init(color: .black.opacity(0.9), location: 0), .init(color: .black.opacity(0.45), location: 0.18),
                                                      .init(color: .black.opacity(0.08), location: 0.38), .init(color: .white.opacity(0.04), location: 0.5),
                                                      .init(color: .black.opacity(0.08), location: 0.62), .init(color: .black.opacity(0.45), location: 0.82),
                                                      .init(color: .black.opacity(0.9), location: 1)]),
                                     startPoint: .zero, endPoint: CGPoint(x: w, y: 0)))
        // 정노출 쪽 빛 세모 (깜빡임)
        if hint != 0 {
            let a = 0.65 + 0.35 * sin(time * .pi * 2)
            let x: CGFloat = hint < 0 ? 8 : w - 8
            var p = Path()
            if hint < 0 { p.move(to: CGPoint(x: x, y: mid)); p.addLine(to: CGPoint(x: x + 10, y: mid - 7)); p.addLine(to: CGPoint(x: x + 10, y: mid + 7)) }
            else { p.move(to: CGPoint(x: x, y: mid)); p.addLine(to: CGPoint(x: x - 10, y: mid - 7)); p.addLine(to: CGPoint(x: x - 10, y: mid + 7)) }
            p.closeSubpath()
            var glow = g
            glow.addFilter(.shadow(color: Color(red: 1, green: 0.75, blue: 0.3).opacity(0.95 * a), radius: 5))
            glow.fill(p, with: .color(Color(red: 1, green: 0.82, blue: 0.48).opacity(a)))
        }
    }
}

/// 링이 돌아가는 상태 (그리기 때마다 목표로 부드럽게 따라간다)
final class RingEngine: ObservableObject {
    var pos: Double = .nan
    var start: Double = 0
    var dragging = false
    var lockedToldOnce = false
    private let haptic = UISelectionFeedbackGenerator()

    func tick(target: Double, auto: Bool) {
        if pos.isNaN { pos = target; return }
        if !dragging { pos += (target - pos) * (auto ? 0.12 : 0.22) }
    }

    func tickHaptic() { haptic.selectionChanged() }
}
#endif
