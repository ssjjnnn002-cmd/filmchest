import Foundation
import CoreGraphics

/// 필름 선택 화면용 일러스트. 35mm는 필름 통 + 리더, 120은 스풀에 감긴 롤.
/// 배경은 투명이라 앱의 선반/목록 위에 그대로 올릴 수 있다.
public enum FilmCanisterRenderer {
    public static func render(_ stock: FilmStock, format: FilmFormat = .f135, size: Int = 800) -> CGImage? {
        guard let ctx = Canvas.make(width: size, height: size) else { return nil }
        let S = CGFloat(size)
        if format.is120 {
            drawRoll120(ctx, stock, S)
        } else {
            draw135(ctx, stock, S)
        }
        return ctx.makeImage()
    }

    // MARK: 좌표 도우미 (위→아래 숫자로 쓰고 CoreGraphics 좌표로 변환)

    private struct Space {
        let S: CGFloat
        func rect(_ x: CGFloat, _ y: CGFloat, _ w: CGFloat, _ h: CGFloat) -> CGRect {
            CGRect(x: x * S, y: S - (y + h) * S, width: w * S, height: h * S)
        }
        func point(_ x: CGFloat, _ y: CGFloat) -> CGPoint { CGPoint(x: x * S, y: S - y * S) }
    }

    // MARK: 35mm

    private static func draw135(_ ctx: CGContext, _ stock: FilmStock, _ S: CGFloat) {
        let sp = Space(S: S)
        let st = stock.style
        let bodyX: CGFloat = 0.12, bodyW: CGFloat = 0.40
        let bodyTop: CGFloat = 0.17, bodyBottom: CGFloat = 0.85

        // 바닥 그림자
        ctx.saveGState()
        ctx.setFillColor(.gray(0, 0.18))
        ctx.setShadow(offset: .zero, blur: S * 0.03, color: .gray(0, 0.35))
        ctx.fillEllipse(in: sp.rect(bodyX - 0.01, 0.89, bodyW + 0.44, 0.04))
        ctx.restoreGState()

        // 필름 리더
        drawLeader(ctx, sp, stock: stock, fromX: bodyX + bodyW - 0.01, top: 0.215, bottom: 0.805)

        // 빛 차단 벨벳
        ctx.setFillColor(.hex("#141210"))
        ctx.fill(sp.rect(bodyX + bodyW - 0.015, bodyTop + 0.02, 0.03, bodyBottom - bodyTop - 0.04))

        // 몸통 + 라벨
        let body = sp.rect(bodyX, bodyTop, bodyW, bodyBottom - bodyTop)
        ctx.setFillColor(.hex(st.body))
        ctx.fill(body)
        let band = sp.rect(bodyX, 0.45, bodyW, 0.14)
        ctx.setFillColor(.hex(st.band))
        ctx.fill(band)

        // DX 코드 (은색/검정 칸)
        let dxTop: CGFloat = 0.70
        let cell: CGFloat = bodyW / 12
        for i in 0..<12 {
            for row in 0..<2 {
                let on = ((stock.iso >> (i % 8)) ^ (row * 0b1010_0110 >> i)) & 1 == 0 || i == 0
                ctx.setFillColor(on ? .hex("#C9CCCF") : .hex("#1A1A1A"))
                ctx.fill(sp.rect(bodyX + CGFloat(i) * cell, dxTop + CGFloat(row) * cell * 0.9, cell, cell * 0.9))
            }
        }

        // 글자
        let center = bodyX + bodyW / 2
        Canvas.text(ctx, stock.brand.uppercased(), at: sp.point(center, 0.235),
                    font: "HelveticaNeue-Bold", size: fit(stock.brand.uppercased(), "HelveticaNeue-Bold", width: bodyW * 0.8 * S, max: 0.05 * S),
                    color: .hex(st.text), kern: S * 0.004, centered: true)
        let name = nameWithoutISO(stock)
        let nameSize = fit(name, "HelveticaNeue-CondensedBlack", width: bodyW * 0.86 * S, max: 0.085 * S)
        Canvas.text(ctx, name, at: sp.point(center, 0.35), font: "HelveticaNeue-CondensedBlack",
                    size: nameSize, color: .hex(st.text), centered: true)
        Canvas.text(ctx, "\(stock.iso)", at: sp.point(center, 0.52), font: "HelveticaNeue-CondensedBlack",
                    size: fit("\(stock.iso)", "HelveticaNeue-CondensedBlack", width: bodyW * 0.7 * S, max: 0.11 * S),
                    color: .hex(st.bandText), centered: true)
        Canvas.text(ctx, "\(stock.process.rawValue) · 135-36", at: sp.point(center, 0.65), font: "HelveticaNeue-Medium",
                    size: 0.026 * S, color: .hex(st.text, alpha: 0.8), kern: S * 0.002, centered: true)

        // 원통 음영
        Canvas.linearGradient(ctx, in: body, stops: [
            (0.00, .gray(0, 0.42)), (0.10, .gray(0, 0.12)), (0.30, .gray(1, 0.22)),
            (0.45, .gray(1, 0.0)), (0.80, .gray(0, 0.18)), (1.00, .gray(0, 0.50)),
        ])

        // 위아래 뚜껑 + 스풀 꼭지
        drawCap(ctx, sp.rect(bodyX - 0.012, bodyTop - 0.06, bodyW + 0.024, 0.065), color: st.cap)
        drawCap(ctx, sp.rect(bodyX - 0.012, bodyBottom - 0.005, bodyW + 0.024, 0.06), color: st.cap)
        let nub = sp.rect(center - 0.07, bodyTop - 0.115, 0.14, 0.06)
        ctx.setFillColor(.hex("#1E1E1E"))
        ctx.fill(nub)
        Canvas.linearGradient(ctx, in: nub, stops: [(0, .gray(0, 0.5)), (0.35, .gray(1, 0.18)), (1, .gray(0, 0.55))])
    }

    private static func drawLeader(_ ctx: CGContext, _ sp: Space, stock: FilmStock, fromX: CGFloat, top: CGFloat, bottom: CGFloat) {
        let baseColor: CGColor = switch stock.process {
        case .c41: .hex("#8A4A1E")
        case .ecn2: .hex("#5E3218")
        case .e6: .hex("#2C2A2B")
        case .bw: .hex("#3C3C40")
        }
        let fullEnd: CGFloat = 0.70
        let tongueEnd: CGFloat = 0.93
        let mid = (top + bottom) / 2

        // 리더 모양: 전체 폭 구간 + 아래쪽 절반 혀 모양
        let path = CGMutablePath()
        path.move(to: sp.point(fromX, top))
        path.addLine(to: sp.point(fullEnd, top))
        path.addCurve(to: sp.point(fullEnd + 0.06, mid),
                      control1: sp.point(fullEnd + 0.04, top), control2: sp.point(fullEnd + 0.02, mid))
        path.addLine(to: sp.point(tongueEnd - 0.03, mid))
        path.addQuadCurve(to: sp.point(tongueEnd, mid + 0.04), control: sp.point(tongueEnd, mid))
        path.addLine(to: sp.point(tongueEnd, bottom))
        path.addLine(to: sp.point(fromX, bottom))
        path.closeSubpath()

        ctx.saveGState()
        ctx.addPath(path)
        ctx.setFillColor(baseColor)
        ctx.fillPath()

        // 퍼포레이션
        ctx.addPath(path)
        ctx.clip()
        let pitch: CGFloat = 0.034
        let holeW: CGFloat = 0.016, holeH: CGFloat = 0.022
        ctx.setBlendMode(.clear)
        var x = fromX + 0.02
        while x < tongueEnd {
            for y in [top + 0.018, bottom - 0.018 - holeH] {
                ctx.addPath(CGPath(roundedRect: sp.rect(x, y, holeW, holeH), cornerWidth: 0.003 * sp.S,
                                   cornerHeight: 0.003 * sp.S, transform: nil))
            }
            x += pitch
        }
        ctx.fillPath()
        ctx.setBlendMode(.normal)

        // 광택
        let bounds = sp.rect(fromX, top, tongueEnd - fromX, bottom - top)
        Canvas.linearGradient(ctx, in: bounds, stops: [
            (0, .gray(1, 0.0)), (0.35, .gray(1, 0.16)), (0.5, .gray(1, 0.0)), (1, .gray(0, 0.2)),
        ], horizontal: false)
        ctx.restoreGState()
    }

    private static func drawCap(_ ctx: CGContext, _ rect: CGRect, color: String) {
        let path = CGPath(roundedRect: rect, cornerWidth: rect.height * 0.25, cornerHeight: rect.height * 0.25, transform: nil)
        ctx.saveGState()
        ctx.addPath(path)
        ctx.setFillColor(.hex(color))
        ctx.fillPath()
        Canvas.linearGradient(ctx, in: rect, stops: [
            (0, .gray(0, 0.45)), (0.25, .gray(1, 0.35)), (0.4, .gray(1, 0.08)), (0.85, .gray(0, 0.2)), (1, .gray(0, 0.55)),
        ])
        ctx.restoreGState()
    }

    // MARK: 120

    private static func drawRoll120(_ ctx: CGContext, _ stock: FilmStock, _ S: CGFloat) {
        let sp = Space(S: S)
        let st = stock.style
        let x: CGFloat = 0.27, w: CGFloat = 0.46
        let top: CGFloat = 0.17, bottom: CGFloat = 0.83

        ctx.saveGState()
        ctx.setFillColor(.gray(0, 0.18))
        ctx.setShadow(offset: .zero, blur: S * 0.03, color: .gray(0, 0.35))
        ctx.fillEllipse(in: sp.rect(x - 0.05, 0.86, w + 0.1, 0.05))
        ctx.restoreGState()

        // 스풀 테두리 (위아래 플랜지)
        for y in [top - 0.045, bottom - 0.005] {
            let flange = sp.rect(x - 0.035, y, w + 0.07, 0.05)
            ctx.setFillColor(.hex("#151515"))
            ctx.fill(flange)
            Canvas.linearGradient(ctx, in: flange, stops: [(0, .gray(0, 0.4)), (0.3, .gray(1, 0.2)), (1, .gray(0, 0.5))])
        }

        // 백킹 페이퍼
        let body = sp.rect(x, top, w, bottom - top)
        ctx.setFillColor(.hex(st.body))
        ctx.fill(body)
        // 봉인 테이프
        let band = sp.rect(x, 0.46, w, 0.12)
        ctx.setFillColor(.hex(st.band))
        ctx.fill(band)

        let center = x + w / 2
        Canvas.text(ctx, stock.brand.uppercased(), at: sp.point(center, 0.24), font: "HelveticaNeue-Bold",
                    size: fit(stock.brand.uppercased(), "HelveticaNeue-Bold", width: w * 0.7 * S, max: 0.05 * S),
                    color: .hex(st.text), kern: S * 0.004, centered: true)
        let name = nameWithoutISO(stock)
        Canvas.text(ctx, name, at: sp.point(center, 0.35), font: "HelveticaNeue-CondensedBlack",
                    size: fit(name, "HelveticaNeue-CondensedBlack", width: w * 0.86 * S, max: 0.09 * S),
                    color: .hex(st.text), centered: true)
        Canvas.text(ctx, "\(stock.iso)", at: sp.point(center, 0.52), font: "HelveticaNeue-CondensedBlack",
                    size: 0.09 * S, color: .hex(st.bandText), centered: true)
        Canvas.text(ctx, "\(stock.process.rawValue) · 120", at: sp.point(center, 0.70), font: "HelveticaNeue-Medium",
                    size: 0.028 * S, color: .hex(st.text, alpha: 0.8), kern: S * 0.002, centered: true)

        // 종이 끝자락
        ctx.setFillColor(.hex(st.body))
        let tail = CGMutablePath()
        tail.move(to: sp.point(x + w, top + 0.02))
        tail.addLine(to: sp.point(x + w + 0.05, top + 0.05))
        tail.addLine(to: sp.point(x + w + 0.05, bottom - 0.05))
        tail.addLine(to: sp.point(x + w, bottom - 0.02))
        tail.closeSubpath()
        ctx.addPath(tail)
        ctx.fillPath()

        Canvas.linearGradient(ctx, in: body, stops: [
            (0.00, .gray(0, 0.40)), (0.12, .gray(0, 0.10)), (0.32, .gray(1, 0.22)),
            (0.48, .gray(1, 0.0)), (0.82, .gray(0, 0.18)), (1.00, .gray(0, 0.48)),
        ])
    }

    // MARK: 글자 도우미

    static func nameWithoutISO(_ stock: FilmStock) -> String {
        let suffix = " \(stock.iso)"
        let name = stock.name.hasSuffix(suffix) ? String(stock.name.dropLast(suffix.count)) : stock.name
        return name.isEmpty ? stock.name : name.uppercased()
    }

    private static func fit(_ text: String, _ font: String, width: CGFloat, max: CGFloat) -> CGFloat {
        let w = Canvas.textWidth(text, font: font, size: max)
        return w > width ? max * width / w : max
    }
}
