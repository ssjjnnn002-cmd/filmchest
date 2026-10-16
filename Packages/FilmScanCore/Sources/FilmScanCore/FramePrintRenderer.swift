import Foundation
import CoreGraphics

/// 프레임 아래 글씨. 웹 frameCaption.ts와 같은 규칙.
public enum FrameCaptionFormat {
    public static func shutter(_ seconds: Double) -> String {
        guard seconds.isFinite, seconds > 0 else { return "" }
        if seconds >= 1 {
            let whole = seconds.rounded()
            if abs(seconds - whole) < 0.05 { return "\(Int(whole))\"" }
            return "\( (seconds * 10).rounded() / 10 )\""
        }
        return "1/\(max(1, Int((1 / seconds).rounded())))"
    }

    public static func aperture(_ n: Double) -> String {
        guard n.isFinite, n > 0 else { return "" }
        let rounded = (n * 10).rounded() / 10
        if rounded == rounded.rounded() { return "f/\(Int(rounded))" }
        return "f/\(rounded)"
    }

    /// 노출계 기록이 있는 컷만.
    public static func exposure(aperture: Double?, shutter: Double?, iso: Int?) -> String? {
        guard aperture != nil || shutter != nil else { return nil }
        var parts: [String] = []
        if let aperture { parts.append(Self.aperture(aperture)) }
        if let shutter { parts.append(Self.shutter(shutter)) }
        if let iso { parts.append("ISO \(iso)") }
        return parts.joined(separator: "   ")
    }
}

/// 프레임 전체(여백 포함)의 가로:세로. 정방형이 기본.
public enum FrameAspect: String, CaseIterable, Sendable, Identifiable {
    case square, fourFive, threeFour, twoThree, nineSixteen
    case fiveFour, fourThree, threeTwo, sixteenNine

    public var id: String { rawValue }

    public var title: String {
        switch self {
        case .square: "1:1"
        case .fourFive: "4:5"
        case .threeFour: "3:4"
        case .twoThree: "2:3"
        case .nineSixteen: "9:16"
        case .fiveFour: "5:4"
        case .fourThree: "4:3"
        case .threeTwo: "3:2"
        case .sixteenNine: "16:9"
        }
    }

    /// 가로 / 세로
    public var ratio: CGFloat {
        switch self {
        case .square: 1
        case .fourFive: 4.0 / 5
        case .threeFour: 3.0 / 4
        case .twoThree: 2.0 / 3
        case .nineSixteen: 9.0 / 16
        case .fiveFour: 5.0 / 4
        case .fourThree: 4.0 / 3
        case .threeTwo: 3.0 / 2
        case .sixteenNine: 16.0 / 9
        }
    }
}

public struct FramePrintCaption: Sendable {
    public var dark: Bool
    public var camera: String?
    public var lens: String?
    public var film: String?
    public var filter: String?
    public var date: String?
    public var photographer: String?
    public var exposure: String?

    public init(dark: Bool, camera: String? = nil, lens: String? = nil, film: String? = nil, filter: String? = nil,
                date: String? = nil, photographer: String? = nil, exposure: String? = nil) {
        self.dark = dark
        self.camera = camera
        self.lens = lens
        self.film = film
        self.filter = filter
        self.date = date
        self.photographer = photographer
        self.exposure = exposure
    }
}

/// 사진 한 장을 여백 프레임으로 그린다. 회사 로고는 넣지 않는다.
public enum FramePrintRenderer {
    public static func render(image: CGImage, caption: FramePrintCaption, ratio: CGFloat = 1, pixelWidth: Int = 2400) -> CGImage? {
        let longSide = CGFloat(max(pixelWidth, 64))
        let aspect = max(ratio, 0.2)
        let W: CGFloat
        let H: CGFloat
        if aspect >= 1 {
            W = longSide
            H = (longSide / aspect).rounded(.up)
        } else {
            H = longSide
            W = (longSide * aspect).rounded(.up)
        }
        let pad = min(W, H) * 0.055
        let left = [caption.camera, caption.lens, caption.film, caption.filter].compactMap { $0 }
        let right = [caption.date, caption.photographer, caption.exposure].compactMap { $0 }
        let rows = max(left.count, right.count)
        let line = min(W, H) * 0.032
        let footer = rows == 0 ? pad * 0.85 : pad * 0.42 + CGFloat(rows) * line + pad * 0.38
        guard let ctx = Canvas.make(width: Int(W), height: Int(H)) else { return nil }

        let paper: CGColor = caption.dark ? .hex("#111111") : .hex("#F7F6F2")
        let ink: CGColor = caption.dark ? .hex("#F4F1EA") : .hex("#1A1816")
        ctx.setFillColor(paper)
        ctx.fill(CGRect(x: 0, y: 0, width: W, height: H))

        let box = CGRect(x: pad, y: footer, width: W - pad * 2, height: max(1, H - pad - footer))
        let ia = CGFloat(image.width) / CGFloat(max(image.height, 1))
        var dw = box.width
        var dh = dw / ia
        if dh > box.height {
            dh = box.height
            dw = dh * ia
        }
        ctx.draw(image, in: CGRect(x: box.midX - dw / 2, y: box.midY - dh / 2, width: dw, height: dh))

        let top = footer - pad * 0.28 - line * 0.15
        for (i, text) in left.enumerated() {
            let lead = i == 0 && text == caption.camera
            Canvas.text(ctx, text, at: CGPoint(x: pad, y: top - CGFloat(i) * line),
                        font: lead ? "AppleSDGothicNeo-SemiBold" : "AppleSDGothicNeo-Regular",
                        size: lead ? line * 0.92 : line * 0.78, color: ink)
        }
        for (i, text) in right.enumerated() {
            let size = line * 0.78
            let width = Canvas.textWidth(text, font: "AppleSDGothicNeo-Regular", size: size)
            Canvas.text(ctx, text, at: CGPoint(x: W - pad - width, y: top - CGFloat(i) * line),
                        font: "AppleSDGothicNeo-Regular", size: size, color: ink)
        }
        return ctx.makeImage()
    }
}
