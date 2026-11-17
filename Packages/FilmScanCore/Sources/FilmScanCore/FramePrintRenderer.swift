import Foundation
import CoreGraphics

/// 프레임 아래 글씨. 웹 frameCaption.ts와 같은 규칙.
public enum FrameCaptionFormat {
    /// 셔터 표시. 0보다 작으면 B(벌브)
    public static func shutter(_ seconds: Double) -> String {
        if seconds < 0 { return "B" }
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

/// 하단 한 줄 표기. A 왼쪽, B 가운데.
public enum FrameCaptionStyle: String, CaseIterable, Sendable, Identifiable {
    case A, B
    public var id: String { rawValue }
    public var title: String { self == .A ? "타입 A" : "타입 B" }
    public var hint: String { self == .A ? "하단 · 왼쪽 · 한 줄" : "하단 · 가운데 · 한 줄" }
}

public struct FramePrintCaption: Sendable {
    public var dark: Bool
    public var style: FrameCaptionStyle
    public var camera: String?
    public var lens: String?
    public var film: String?
    public var filter: String?
    public var date: String?
    public var photographer: String?
    public var exposure: String?

    public init(dark: Bool, style: FrameCaptionStyle = .A, camera: String? = nil, lens: String? = nil, film: String? = nil, filter: String? = nil,
                date: String? = nil, photographer: String? = nil, exposure: String? = nil) {
        self.dark = dark
        self.style = style
        self.camera = camera
        self.lens = lens
        self.film = film
        self.filter = filter
        self.date = date
        self.photographer = photographer
        self.exposure = exposure
    }

    public var line: String {
        [camera, lens, film, filter, date, photographer, exposure]
            .compactMap { $0?.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }
            .joined(separator: "  ·  ")
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
        let lineText = caption.line
        let line = min(W, H) * 0.018
        let gap = pad * 0.35
        let footer = lineText.isEmpty ? pad * 0.85 : pad * 0.45 + line + gap
        guard let ctx = Canvas.make(width: Int(W), height: Int(H)) else { return nil }

        let paper: CGColor = caption.dark ? .hex("#111111") : .hex("#F7F6F2")
        let ink: CGColor = caption.dark ? .hex("#E8E4DC") : .hex("#3A3632")
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
        let imageY = box.midY - dh / 2
        ctx.draw(image, in: CGRect(x: box.midX - dw / 2, y: imageY, width: dw, height: dh))

        guard !lineText.isEmpty else { return ctx.makeImage() }

        let maxW = W - pad * 2
        var size = line
        let fontName = "AppleSDGothicNeo-Thin"
        while size > line * 0.72 && Canvas.textWidth(lineText, font: fontName, size: size) > maxW {
            size -= line * 0.02
        }
        // CoreGraphics y는 아래가 0. 글자 baseline을 하단 여백 쪽에.
        let y = pad * 0.55
        if caption.style == .B {
            let width = Canvas.textWidth(lineText, font: fontName, size: size)
            Canvas.text(ctx, lineText, at: CGPoint(x: (W - width) / 2, y: y), font: fontName, size: size, color: ink)
        } else {
            Canvas.text(ctx, lineText, at: CGPoint(x: pad, y: y), font: fontName, size: size, color: ink)
        }
        return ctx.makeImage()
    }
}
