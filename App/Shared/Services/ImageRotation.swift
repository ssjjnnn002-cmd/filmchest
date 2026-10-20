import CoreGraphics

extension CGImage {
    /// 시계 방향으로 90°×turns 돌린 이미지 (turns는 음수도 된다)
    func rotated(quarterTurns turns: Int) -> CGImage {
        let t = ((turns % 4) + 4) % 4
        guard t != 0 else { return self }
        let w = t % 2 == 0 ? width : height
        let h = t % 2 == 0 ? height : width
        guard let ctx = CGContext(data: nil, width: w, height: h, bitsPerComponent: 8, bytesPerRow: 0,
                                  space: colorSpace ?? CGColorSpace(name: CGColorSpace.sRGB)!,
                                  bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { return self }
        ctx.interpolationQuality = .high
        // 좌표 원점이 왼쪽 아래: 시계 방향 회전 = -90°×t
        ctx.translateBy(x: CGFloat(w) / 2, y: CGFloat(h) / 2)
        ctx.rotate(by: -CGFloat(t) * .pi / 2)
        ctx.draw(self, in: CGRect(x: -CGFloat(width) / 2, y: -CGFloat(height) / 2, width: CGFloat(width), height: CGFloat(height)))
        return ctx.makeImage() ?? self
    }
}

extension CGImage {
    /// EXIF 방향값(1…8)을 픽셀에 반영한다. 돌리기만 하는 값(1,3,6,8) 외에는 그대로 둔다.
    func applyingOrientation(_ exif: Int) -> CGImage {
        switch exif {
        case 3: return rotated(quarterTurns: 2)
        case 6: return rotated(quarterTurns: 1)
        case 8: return rotated(quarterTurns: 3)
        default: return self
        }
    }
}
