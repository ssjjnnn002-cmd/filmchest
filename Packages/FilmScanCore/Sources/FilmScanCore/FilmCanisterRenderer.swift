import Foundation
import CoreGraphics

/// 필름 선택 화면용 일러스트. 35mm는 필름 통 + 리더, 120은 스풀에 감긴 롤.
/// 배경은 투명이라 앱의 선반/목록 위에 그대로 올릴 수 있다.
public enum FilmCanisterRenderer {
    public static func render(_ stock: FilmStock, format: FilmFormat = .f135, size: Int = 800) -> CGImage? {
        guard let ctx = Canvas.make(width: size, height: size) else { return nil }
        let S = CGFloat(size)
        switch format.pack {
        case .roll: drawRoll120(ctx, stock, S)
        case .cartridge: drawCartridge110(ctx, stock, S)
        case .sheet: drawSheetBox(ctx, stock, S, size: format == .sheet45 ? "4×5" : "8×10")
        case .instant: drawInstantPack(ctx, stock, S, format: format)
        case .canister: draw135(ctx, stock, S)
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
        case .bw, .instant: .hex("#3C3C40")
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

    // MARK: 110 · 시트 · 인스턴트 (웹 canister.ts와 같은 모양)

    private static func shadow(_ ctx: CGContext, _ sp: Space, _ S: CGFloat, x: CGFloat, y: CGFloat, w: CGFloat) {
        ctx.saveGState()
        ctx.setFillColor(.gray(0, 0.18))
        ctx.setShadow(offset: .zero, blur: S * 0.03, color: .gray(0, 0.35))
        ctx.fillEllipse(in: sp.rect(x, y, w, 0.05))
        ctx.restoreGState()
    }

    private static func label(_ ctx: CGContext, _ sp: Space, _ stock: FilmStock, _ S: CGFloat, cx: CGFloat, width: CGFloat,
                              brandY: CGFloat, nameY: CGFloat, isoY: CGFloat, nameMax: CGFloat, isoMax: CGFloat) {
        let st = stock.style
        let brand = stock.brand.uppercased()
        Canvas.text(ctx, brand, at: sp.point(cx, brandY), font: "HelveticaNeue-Bold",
                    size: fit(brand, "HelveticaNeue-Bold", width: width * 0.8 * S, max: 0.045 * S), color: .hex(st.text), centered: true)
        let name = nameWithoutISO(stock)
        Canvas.text(ctx, name, at: sp.point(cx, nameY), font: "HelveticaNeue-CondensedBlack",
                    size: fit(name, "HelveticaNeue-CondensedBlack", width: width * 0.86 * S, max: nameMax * S), color: .hex(st.text), centered: true)
        Canvas.text(ctx, "\(stock.iso)", at: sp.point(cx, isoY), font: "HelveticaNeue-CondensedBlack",
                    size: fit("\(stock.iso)", "HelveticaNeue-CondensedBlack", width: width * 0.6 * S, max: isoMax * S), color: .hex(st.bandText), centered: true)
    }

    /// 110: 두 칸짜리 납작한 플라스틱 카트리지 (왼쪽에 라벨, 가운데 필름 창)
    private static func drawCartridge110(_ ctx: CGContext, _ stock: FilmStock, _ S: CGFloat) {
        let sp = Space(S: S)
        let st = stock.style
        shadow(ctx, sp, S, x: 0.08, y: 0.735, w: 0.84)
        let plastic = CGColor.hex("#232325")
        for (x, w) in [(0.08, 0.38), (0.64, 0.28)] as [(CGFloat, CGFloat)] {
            ctx.addPath(CGPath(roundedRect: sp.rect(x, 0.3, w, 0.42), cornerWidth: S * 0.035, cornerHeight: S * 0.035, transform: nil))
            ctx.setFillColor(plastic); ctx.fillPath()
        }
        ctx.setFillColor(plastic); ctx.fill(sp.rect(0.44, 0.4, 0.22, 0.2))
        ctx.setFillColor(stock.process == .bw ? .hex("#3C3C40") : .hex("#8A4A1E")); ctx.fill(sp.rect(0.47, 0.43, 0.16, 0.14))
        let lx: CGFloat = 0.11, ly: CGFloat = 0.33, lw: CGFloat = 0.32, lh: CGFloat = 0.36
        ctx.addPath(CGPath(roundedRect: sp.rect(lx, ly, lw, lh), cornerWidth: S * 0.02, cornerHeight: S * 0.02, transform: nil))
        ctx.setFillColor(.hex(st.body)); ctx.fillPath()
        ctx.setFillColor(.hex(st.band)); ctx.fill(sp.rect(lx, ly + lh * 0.52, lw, lh * 0.24))
        label(ctx, sp, stock, S, cx: lx + lw / 2, width: lw, brandY: ly + lh * 0.13, nameY: ly + lh * 0.34, isoY: ly + lh * 0.64, nameMax: 0.06, isoMax: 0.07)
        Canvas.text(ctx, "110", at: sp.point(lx + lw / 2, ly + lh * 0.88), font: "HelveticaNeue-Bold", size: 0.026 * S, color: .hex(st.text), centered: true)
        ctx.setFillColor(.gray(0, 0.35))
        ctx.fill(sp.rect(0.7, 0.36, 0.16, 0.03)); ctx.fill(sp.rect(0.7, 0.61, 0.16, 0.03))
    }

    /// 시트 필름: 납작한 상자 (윗면·옆면이 보이게), 앞면에 띠와 크기
    private static func drawSheetBox(_ ctx: CGContext, _ stock: FilmStock, _ S: CGFloat, size: String) {
        let sp = Space(S: S)
        let st = stock.style
        shadow(ctx, sp, S, x: 0.06, y: 0.775, w: 0.88)
        let x: CGFloat = 0.08, y: CGFloat = 0.36, w: CGFloat = 0.79, h: CGFloat = 0.42, d: CGFloat = 0.12
        func poly(_ pts: [(CGFloat, CGFloat)], _ color: CGColor, _ over: CGColor) {
            let p = CGMutablePath(); p.move(to: sp.point(pts[0].0, pts[0].1)); for q in pts.dropFirst() { p.addLine(to: sp.point(q.0, q.1)) }; p.closeSubpath()
            ctx.addPath(p); ctx.setFillColor(color); ctx.fillPath()
            ctx.addPath(p); ctx.setFillColor(over); ctx.fillPath()
        }
        poly([(x, y), (x + d * 0.6, y - d), (x + w + d * 0.6, y - d), (x + w, y)], .hex(st.body), .gray(1, 0.25))
        poly([(x + w, y), (x + w + d * 0.6, y - d), (x + w + d * 0.6, y + h - d), (x + w, y + h)], .hex(st.body), .gray(0, 0.3))
        let front = sp.rect(x, y, w, h)
        ctx.setFillColor(.hex(st.body)); ctx.fill(front)
        ctx.setFillColor(.hex(st.band)); ctx.fill(sp.rect(x, y + h * 0.56, w, h * 0.22))
        label(ctx, sp, stock, S, cx: x + w / 2, width: w * 0.8, brandY: y + h * 0.16, nameY: y + h * 0.38, isoY: y + h * 0.67, nameMax: 0.085, isoMax: 0.07)
        Canvas.text(ctx, "\(size) · SHEET FILM", at: sp.point(x + w / 2, y + h * 0.9), font: "HelveticaNeue-Bold", size: 0.032 * S, color: .hex(st.text), centered: true)
    }

    /// 인스턴트 필름: 팩 상자 + 앞에 비스듬히 놓인 사진 한 장 (인스탁스·폴라로이드 비율)
    private static func drawInstantPack(_ ctx: CGContext, _ stock: FilmStock, _ S: CGFloat, format: FilmFormat) {
        let sp = Space(S: S)
        let st = stock.style
        shadow(ctx, sp, S, x: 0.1, y: 0.835, w: 0.8)
        let bx: CGFloat = 0.1, by: CGFloat = 0.14, bw: CGFloat = 0.6, bh: CGFloat = 0.66
        ctx.addPath(CGPath(roundedRect: sp.rect(bx, by, bw, bh), cornerWidth: S * 0.03, cornerHeight: S * 0.03, transform: nil))
        ctx.setFillColor(.hex(st.body)); ctx.fillPath()
        ctx.setFillColor(.hex(st.band)); ctx.fill(sp.rect(bx, by + bh * 0.5, bw, bh * 0.16))
        label(ctx, sp, stock, S, cx: bx + bw / 2, width: bw, brandY: by + bh * 0.12, nameY: by + bh * 0.3, isoY: by + bh * 0.58, nameMax: 0.075, isoMax: 0.06)
        Canvas.text(ctx, "INSTANT FILM", at: sp.point(bx + bw / 2, by + bh * 0.76), font: "HelveticaNeue-Bold", size: 0.03 * S, color: .hex(st.text), centered: true)
        // 사진 한 장
        let (pw, ph): (CGFloat, CGFloat) = format == .instaxMini ? (0.3, 0.46) : format == .instaxWide ? (0.46, 0.34) : (0.36, 0.42)
        ctx.saveGState()
        ctx.translateBy(x: 0.68 * S, y: S - 0.6 * S)
        ctx.rotate(by: -0.12)
        ctx.setShadow(offset: CGSize(width: 0, height: -S * 0.008), blur: S * 0.02, color: .gray(0, 0.3))
        ctx.setFillColor(.hex("#FBFAF7"))
        ctx.fill(CGRect(x: -pw / 2 * S, y: -ph / 2 * S, width: pw * S, height: ph * S))
        ctx.setShadow(offset: .zero, blur: 0, color: nil)
        let m = pw * 0.08, bottom = format == .instaxWide ? ph * 0.2 : ph * 0.24
        let pic = CGRect(x: (-pw / 2 + m) * S, y: (-ph / 2 + bottom) * S, width: (pw - m * 2) * S, height: (ph - m - bottom) * S)
        let mono = st.body == "#1B1B1B"
        Canvas.linearGradient(ctx, in: pic, stops: [(0, .hex(mono ? "#2A2A2A" : "#7A5A3A")), (0.4, .hex(mono ? "#4A4A4A" : "#E8C27A")), (1, .hex(mono ? "#9A9A9A" : "#7FB2D9"))], horizontal: false)
        ctx.restoreGState()
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
