import Foundation
import CoreGraphics

/// 현상소에서 받는 밀착 인화처럼 필름 스트립을 종이 위에 늘어놓은 이미지 한 장을 만든다.
public enum ContactSheetRenderer {
    public struct Options: Sendable {
        public var pixelWidth: Int = 4200
        /// 세로 사진을 실제 필름처럼 가로 프레임 안에 돌려 넣는다.
        public var rotatePortraitFrames: Bool = true
        public var header: String? = nil   // 촬영 정보 한 줄
        public var title: String? = nil    // 밀착 인화지 제목 (크게)

        public init(pixelWidth: Int = 4200, rotatePortraitFrames: Bool = true, header: String? = nil, title: String? = nil) {
            self.pixelWidth = pixelWidth; self.rotatePortraitFrames = rotatePortraitFrames; self.header = header
            self.title = title
        }
    }

    public static func render(frames: [URL], format: FilmFormat, film: FilmStock?, options: Options = Options()) -> CGImage? {
        render(frameCount: frames.count, format: format, film: film, options: options) { i, maxPixel in
            Canvas.thumbnail(frames[i], maxPixel: maxPixel)
        }
    }

    /// - Parameter image: (0부터 시작하는 컷 순번, 필요한 최대 픽셀) → 이미지
    public static func render(frameCount: Int, format: FilmFormat, film: FilmStock?, options: Options = Options(),
                              image: (Int, Int) -> CGImage?) -> CGImage? {
        let perStrip = format.framesPerStrip
        let stripCount = max(1, Int((Double(frameCount) / Double(perStrip)).rounded(.up)))

        // 치수 (필름 규격 비율 기준)
        let W = CGFloat(options.pixelWidth)
        let margin = W * 0.045
        let stripGap = W * 0.018
        let usable = W - margin * 2
        let frameGapRatio: CGFloat = format.is120 ? 0.09 : 0.055     // 프레임 간격 / 프레임 폭
        let frameW = usable / (CGFloat(perStrip) + CGFloat(perStrip) * frameGapRatio)
        let frameGap = frameW * frameGapRatio
        let frameH = frameW / CGFloat(format.frameAspect)
        // 135: 필름 폭 35mm 중 이미지 24mm → 위아래 여백 5.5mm. 120: 61mm 중 56mm.
        let rebate = format.is120 ? frameH * (2.5 / 56) : frameH * (5.5 / 24)
        let stripH = frameH + rebate * 2
        let titleH = options.title == nil ? 0 : W * 0.045
        let headerH = titleH + (options.header == nil ? 0 : W * 0.035)
        let H = margin * 2 + headerH + CGFloat(stripCount) * stripH + CGFloat(stripCount - 1) * stripGap

        guard let ctx = Canvas.make(width: Int(W), height: Int(H.rounded(.up))) else { return nil }
        // 좌표계를 위→아래로
        ctx.translateBy(x: 0, y: H.rounded(.up))
        ctx.scaleBy(x: 1, y: -1)

        // 인화지
        ctx.setFillColor(.hex("#F2F0EA"))
        ctx.fill(CGRect(x: 0, y: 0, width: W, height: H))

        if let title = options.title {
            drawFlipped(ctx) { y in
                Canvas.text(ctx, title, at: CGPoint(x: margin, y: y(margin + titleH * 0.55)),
                            font: "HelveticaNeue-Bold", size: W * 0.022, color: .hex("#26221E"))
            }
        }
        if let header = options.header {
            drawFlipped(ctx) { y in
                Canvas.text(ctx, header, at: CGPoint(x: margin, y: y(margin + titleH + (headerH - titleH) * 0.45)),
                            font: "HelveticaNeue-Medium", size: W * 0.012, color: .hex("#3A3631"))
            }
        }

        let filmBase = CGColor.hex("#1C1A18")   // 필름 가장자리(인화되면 짙은 회흑색)
        let holeColor = CGColor.hex("#060606")  // 퍼포레이션 구멍(빛이 그대로 통과 → 가장 검다)
        let edgeInk = CGColor.hex("#D9CFB8")    // 가장자리 인쇄 글자
        let pixelLimit = Int(max(frameW, frameH) * 1.2)

        for s in 0..<stripCount {
            let y0 = margin + headerH + CGFloat(s) * (stripH + stripGap)
            // 마지막 스트립은 찍은 컷까지만 잘라서 놓는다
            let framesInStrip = max(1, min(perStrip, frameCount - s * perStrip))
            let stripRect = CGRect(x: margin - frameGap / 2, y: y0,
                                   width: CGFloat(framesInStrip) * (frameW + frameGap), height: stripH)
            ctx.setFillColor(filmBase)
            ctx.fill(stripRect)

            if !format.is120 {
                drawPerforations(ctx, strip: stripRect, frameW: frameW, color: holeColor)
            }

            for i in 0..<framesInStrip {
                let n = s * perStrip + i
                let x = margin + CGFloat(i) * (frameW + frameGap)
                let cell = CGRect(x: x, y: y0 + rebate, width: frameW, height: frameH)

                if n < frameCount, let image = image(n, pixelLimit) {
                    drawFrame(ctx, image: image, in: cell, rotatePortrait: options.rotatePortraitFrames)
                } else {
                    // 노광되지 않은 컷은 인화하면 검게 나온다
                    ctx.setFillColor(.hex("#0B0B0B"))
                    ctx.fill(cell)
                }

                // 가장자리 인쇄: 컷 번호와 필름 이름
                let numberSize = rebate * (format.is120 ? 0.75 : 0.26)
                // 135는 퍼포레이션 줄과 이미지 사이 좁은 띠에 인쇄된다
                let edgeY = format.is120 ? y0 + rebate * 0.5 : y0 + stripH - rebate * 0.79
                drawFlipped(ctx) { flip in
                    Canvas.text(ctx, "\(n + 1)", at: CGPoint(x: x + frameW * 0.08, y: flip(edgeY)),
                                font: "Menlo-Bold", size: numberSize, color: edgeInk, centered: true)
                    Canvas.text(ctx, "\(n + 1)A", at: CGPoint(x: x + frameW * 0.62, y: flip(edgeY)),
                                font: "Menlo-Bold", size: numberSize, color: edgeInk, centered: true)
                    if let film, i % 2 == 0 {
                        let topY = format.is120 ? y0 + stripH - rebate * 0.5 : y0 + rebate * 0.79
                        Canvas.text(ctx, film.edgeMarking, at: CGPoint(x: x + frameW * 0.5, y: flip(topY)),
                                    font: "Menlo-Bold", size: numberSize * 0.9, color: edgeInk, kern: numberSize * 0.15,
                                    centered: true)
                    }
                }
            }
        }
        return ctx.makeImage()
    }

    private static func drawFrame(_ ctx: CGContext, image: CGImage, in cell: CGRect, rotatePortrait: Bool) {
        let isPortrait = image.height > image.width
        let cellIsLandscape = cell.width >= cell.height
        let rotate = rotatePortrait && isPortrait == cellIsLandscape && cell.width != cell.height

        ctx.saveGState()
        ctx.clip(to: cell)
        ctx.translateBy(x: cell.midX, y: cell.midY)
        ctx.scaleBy(x: 1, y: -1)  // 이미지 좌표계 원복
        if rotate { ctx.rotate(by: .pi / 2) }

        let target = rotate ? CGSize(width: cell.height, height: cell.width) : cell.size
        let iw = CGFloat(image.width), ih = CGFloat(image.height)
        let scale = max(target.width / iw, target.height / ih)   // 꽉 채우기
        let size = CGSize(width: iw * scale, height: ih * scale)
        ctx.draw(image, in: CGRect(x: -size.width / 2, y: -size.height / 2, width: size.width, height: size.height))
        ctx.restoreGState()
    }

    /// 35mm 퍼포레이션: 컷당 8개, 위아래 한 줄씩
    private static func drawPerforations(_ ctx: CGContext, strip: CGRect, frameW: CGFloat, color: CGColor) {
        let mm = frameW / 36                   // 프레임 폭 36mm 기준 1mm
        let pitch = 4.75 * mm
        let holeW = 1.98 * mm
        let holeH = 2.79 * mm * 0.72
        let fromEdge = 2.0 * mm * 0.62
        ctx.setFillColor(color)
        var x = strip.minX + pitch * 0.35
        while x + holeW < strip.maxX {
            for y in [strip.minY + fromEdge, strip.maxY - fromEdge - holeH] {
                let r = CGRect(x: x, y: y, width: holeW, height: holeH)
                ctx.addPath(CGPath(roundedRect: r, cornerWidth: holeW * 0.22, cornerHeight: holeW * 0.22, transform: nil))
            }
            x += pitch
        }
        ctx.fillPath()
    }

    /// 뒤집힌 좌표계에서 글자를 바로 쓰기 위한 도우미
    private static func drawFlipped(_ ctx: CGContext, _ body: (_ flip: (CGFloat) -> CGFloat) -> Void) {
        let height = CGFloat(ctx.height)
        ctx.saveGState()
        ctx.scaleBy(x: 1, y: -1)
        ctx.translateBy(x: 0, y: -height)
        body { height - $0 }
        ctx.restoreGState()
    }
}
