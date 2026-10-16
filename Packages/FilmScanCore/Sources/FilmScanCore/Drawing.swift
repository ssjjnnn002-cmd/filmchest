import Foundation
import CoreGraphics
import CoreText
import ImageIO
import UniformTypeIdentifiers

// iOS/macOS 공통으로 쓰는 CoreGraphics 그리기 도구

extension CGColor {
    /// "#RRGGBB" 또는 "#RRGGBBAA"
    static func hex(_ hex: String, alpha: CGFloat = 1) -> CGColor {
        var s = hex.trimmingCharacters(in: .whitespaces)
        if s.hasPrefix("#") { s.removeFirst() }
        let v = UInt64(s, radix: 16) ?? 0
        let hasAlpha = s.count == 8
        let r = CGFloat((v >> (hasAlpha ? 24 : 16)) & 0xFF) / 255
        let g = CGFloat((v >> (hasAlpha ? 16 : 8)) & 0xFF) / 255
        let b = CGFloat((v >> (hasAlpha ? 8 : 0)) & 0xFF) / 255
        let a = hasAlpha ? CGFloat(v & 0xFF) / 255 : alpha
        return CGColor(srgbRed: r, green: g, blue: b, alpha: a)
    }

    static func gray(_ w: CGFloat, _ a: CGFloat = 1) -> CGColor { CGColor(srgbRed: w, green: w, blue: w, alpha: a) }
}

enum Canvas {
    static func make(width: Int, height: Int) -> CGContext? {
        CGContext(data: nil, width: width, height: height, bitsPerComponent: 8, bytesPerRow: 0,
                  space: CGColorSpace(name: CGColorSpace.sRGB)!,
                  bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)
    }

    /// 텍스트 한 줄 그리기. 한글은 CoreText가 시스템 글꼴로 자동 대체한다.
    @discardableResult
    static func text(_ ctx: CGContext, _ string: String, at point: CGPoint, font: String, size: CGFloat,
                     color: CGColor, kern: CGFloat = 0, angle: CGFloat = 0, centered: Bool = false) -> CGSize {
        let ctFont = CTFontCreateWithName(font as CFString, size, nil)
        let attrs: [NSAttributedString.Key: Any] = [
            NSAttributedString.Key(kCTFontAttributeName as String): ctFont,
            NSAttributedString.Key(kCTForegroundColorAttributeName as String): color,
            NSAttributedString.Key(kCTKernAttributeName as String): kern,
        ]
        let line = CTLineCreateWithAttributedString(NSAttributedString(string: string, attributes: attrs))
        let bounds = CTLineGetBoundsWithOptions(line, .useOpticalBounds)
        ctx.saveGState()
        ctx.translateBy(x: point.x, y: point.y)
        ctx.rotate(by: angle)
        ctx.textPosition = CGPoint(x: centered ? -bounds.midX : 0, y: centered ? -bounds.midY : 0)
        CTLineDraw(line, ctx)
        ctx.restoreGState()
        return bounds.size
    }

    static func textWidth(_ string: String, font: String, size: CGFloat, kern: CGFloat = 0) -> CGFloat {
        let ctFont = CTFontCreateWithName(font as CFString, size, nil)
        let attrs: [NSAttributedString.Key: Any] = [
            NSAttributedString.Key(kCTFontAttributeName as String): ctFont,
            NSAttributedString.Key(kCTKernAttributeName as String): kern,
        ]
        let line = CTLineCreateWithAttributedString(NSAttributedString(string: string, attributes: attrs))
        return CTLineGetBoundsWithOptions(line, .useOpticalBounds).width
    }

    static func linearGradient(_ ctx: CGContext, in rect: CGRect, stops: [(CGFloat, CGColor)], horizontal: Bool = true) {
        guard let g = CGGradient(colorsSpace: CGColorSpace(name: CGColorSpace.sRGB),
                                 colors: stops.map(\.1) as CFArray, locations: stops.map(\.0)) else { return }
        ctx.saveGState()
        ctx.clip(to: rect)
        let start = horizontal ? CGPoint(x: rect.minX, y: rect.midY) : CGPoint(x: rect.midX, y: rect.minY)
        let end = horizontal ? CGPoint(x: rect.maxX, y: rect.midY) : CGPoint(x: rect.midX, y: rect.maxY)
        ctx.drawLinearGradient(g, start: start, end: end, options: [])
        ctx.restoreGState()
    }

    /// 이미지를 축소해서 읽는다 (EXIF 회전 반영).
    static func thumbnail(_ url: URL, maxPixel: Int) -> CGImage? {
        guard let src = CGImageSourceCreateWithURL(url as CFURL, nil) else { return nil }
        let opts: [CFString: Any] = [
            kCGImageSourceCreateThumbnailFromImageAlways: true,
            kCGImageSourceCreateThumbnailWithTransform: true,
            kCGImageSourceThumbnailMaxPixelSize: maxPixel,
        ]
        return CGImageSourceCreateThumbnailAtIndex(src, 0, opts as CFDictionary)
    }
}

public enum ImageEncoder {
    public static func data(_ image: CGImage, type: UTType = .jpeg, quality: Double = 0.92) -> Data? {
        let data = NSMutableData()
        guard let dest = CGImageDestinationCreateWithData(data, type.identifier as CFString, 1, nil) else { return nil }
        CGImageDestinationAddImage(dest, image, [kCGImageDestinationLossyCompressionQuality: quality] as CFDictionary)
        return CGImageDestinationFinalize(dest) ? data as Data : nil
    }
}

public enum ImageThumbnail {
    /// 큰 스캔 파일을 메모리에 다 올리지 않고 축소본만 읽는다 (EXIF 회전 반영).
    public static func make(url: URL, maxPixel: Int) -> CGImage? { Canvas.thumbnail(url, maxPixel: maxPixel) }

    public static func make(data: Data, maxPixel: Int) -> CGImage? {
        guard let src = CGImageSourceCreateWithData(data as CFData, nil) else { return nil }
        let opts: [CFString: Any] = [
            kCGImageSourceCreateThumbnailFromImageAlways: true,
            kCGImageSourceCreateThumbnailWithTransform: true,
            kCGImageSourceThumbnailMaxPixelSize: maxPixel,
        ]
        return CGImageSourceCreateThumbnailAtIndex(src, 0, opts as CFDictionary)
    }
}
