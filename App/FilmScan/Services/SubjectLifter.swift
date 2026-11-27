import Foundation
import Vision
import CoreImage
import FilmScanCore

/// 사진에서 피사체(카메라)만 남기고 배경을 지운다. 기기 안에서 처리된다.
enum SubjectLifter {
    /// 가장자리가 이미 투명한 PNG면 빈 여백만 잘라 돌려준다 (배경을 다시 지우지 않는다). 아니면 nil
    static func alreadyTransparent(_ data: Data) async -> Data? {
        await Task.detached(priority: .userInitiated) {
            guard let image = ImageThumbnail.make(data: data, maxPixel: 2000),
                  image.alphaInfo != .none, image.alphaInfo != .noneSkipLast, image.alphaInfo != .noneSkipFirst else { return nil }
            let w = image.width, h = image.height
            guard let ctx = CGContext(data: nil, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w * 4,
                                      space: CGColorSpace(name: CGColorSpace.sRGB)!,
                                      bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue),
                  let raw = ctx.data else { return nil }
            ctx.draw(image, in: CGRect(x: 0, y: 0, width: w, height: h))
            let px = raw.bindMemory(to: UInt8.self, capacity: w * h * 4)
            var clearEdge = 0, edge = 0
            var minX = w, minY = h, maxX = -1, maxY = -1
            for y in 0..<h {
                for x in 0..<w {
                    let a = px[(y * w + x) * 4 + 3]
                    if x == 0 || y == 0 || x == w - 1 || y == h - 1 { edge += 1; if a < 200 { clearEdge += 1 } }
                    if a > 16 { minX = min(minX, x); maxX = max(maxX, x); minY = min(minY, y); maxY = max(maxY, y) }
                }
            }
            guard edge > 0, clearEdge * 10 > edge * 3, maxX >= minX else { return nil }
            let pad = max(maxX - minX, maxY - minY) * 3 / 100
            let rect = CGRect(x: max(0, minX - pad), y: max(0, minY - pad),
                              width: min(w, maxX + pad + 1) - max(0, minX - pad), height: min(h, maxY + pad + 1) - max(0, minY - pad))
            guard let cropped = ctx.makeImage()?.cropping(to: rect) else { return nil }
            return ImageEncoder.data(cropped, type: .png)
        }.value
    }

    /// 성공하면 투명 배경 PNG, 피사체를 못 찾으면 nil
    /// - keepFraming: true면 원래 구도를 유지한다 (360° 사진끼리 크기/위치가 같아야 해서)
    static func lift(_ data: Data, keepFraming: Bool = false) async -> Data? {
        await Task.detached(priority: .userInitiated) {
            // 큰 사진은 줄여서 처리 (선반 표시용으로 충분)
            guard let image = ImageThumbnail.make(data: data, maxPixel: 2000) else { return nil }
            let request = VNGenerateForegroundInstanceMaskRequest()
            let handler = VNImageRequestHandler(cgImage: image, options: [:])
            do {
                try handler.perform([request])
                guard let result = request.results?.first else { return nil }
                let buffer = try result.generateMaskedImage(ofInstances: result.allInstances, from: handler,
                                                            croppedToInstancesExtent: !keepFraming)
                let ci = CIImage(cvPixelBuffer: buffer)
                let context = CIContext()
                guard let cg = context.createCGImage(ci, from: ci.extent) else { return nil }
                return ImageEncoder.data(cg, type: .png)
            } catch {
                return nil
            }
        }.value
    }
}

/// 배경 지우기 결과를 다시 고칠 수 있게 남겨 두는 것: 원래 사진 + 남길 곳(흰색)·지울 곳(검은색) 가림막.
/// 웹 core/bgRemove.ts의 Cutout과 같다.
struct CutoutSource: Identifiable {
    let id = UUID()
    let image: CGImage
    var mask: [UInt8]
    /// 배경 지우기를 처음 했을 때의 가림막 ('처음대로')
    let initial: [UInt8]
    var width: Int { image.width }
    var height: Int { image.height }
}

extension SubjectLifter {
    /// 다듬기에 쓰는 크기 (선반 표시용으로 충분)
    static let cutoutSide = 1600

    private static func rgba(_ image: CGImage) -> (CGContext, UnsafeMutablePointer<UInt8>)? {
        let w = image.width, h = image.height
        guard let ctx = CGContext(data: nil, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w * 4,
                                  space: CGColorSpace(name: CGColorSpace.sRGB)!, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue),
              let raw = ctx.data else { return nil }
        ctx.draw(image, in: CGRect(x: 0, y: 0, width: w, height: h))
        return (ctx, raw.bindMemory(to: UInt8.self, capacity: w * h * 4))
    }

    /// 기기 안의 피사체 인식으로 가림막을 만든다. 피사체를 못 찾으면 nil
    static func cutout(_ data: Data) async -> CutoutSource? {
        await Task.detached(priority: .userInitiated) {
            guard let image = ImageThumbnail.make(data: data, maxPixel: cutoutSide) else { return nil }
            let request = VNGenerateForegroundInstanceMaskRequest()
            let handler = VNImageRequestHandler(cgImage: image, options: [:])
            guard (try? handler.perform([request])) != nil, let result = request.results?.first,
                  let buffer = try? result.generateScaledMaskForImage(forInstances: result.allInstances, from: handler) else { return nil }
            let w = image.width, h = image.height
            guard CVPixelBufferGetWidth(buffer) == w, CVPixelBufferGetHeight(buffer) == h else { return nil }
            CVPixelBufferLockBaseAddress(buffer, .readOnly)
            defer { CVPixelBufferUnlockBaseAddress(buffer, .readOnly) }
            guard let base = CVPixelBufferGetBaseAddress(buffer) else { return nil }
            let stride = CVPixelBufferGetBytesPerRow(buffer)
            var mask = [UInt8](repeating: 0, count: w * h)
            for y in 0..<h {
                let row = (base + y * stride).assumingMemoryBound(to: Float32.self)
                for x in 0..<w { mask[y * w + x] = UInt8(max(0, min(255, row[x] * 255))) }
            }
            return CutoutSource(image: image, mask: mask, initial: mask)
        }.value
    }

    /// 이미 있는 사진으로 다듬기를 시작한다 (투명한 곳은 지운 곳으로)
    static func source(from data: Data) async -> CutoutSource? {
        await Task.detached(priority: .userInitiated) {
            guard let image = ImageThumbnail.make(data: data, maxPixel: cutoutSide), let (ctx, px) = rgba(image) else { return nil }
            let n = image.width * image.height
            var mask = [UInt8](repeating: 255, count: n)
            // 픽셀을 다 읽을 때까지 그림판을 놓지 않는다
            withExtendedLifetime(ctx) { for i in 0..<n { mask[i] = px[i * 4 + 3] } }
            return CutoutSource(image: image, mask: mask, initial: mask)
        }.value
    }

    /// 가림막을 씌우고 빈 여백을 잘라 투명 PNG로
    static func compose(_ cut: CutoutSource) async -> Data? {
        await Task.detached(priority: .userInitiated) {
            guard let (ctx, px) = rgba(cut.image) else { return nil }
            let w = cut.width, h = cut.height
            var minX = w, minY = h, maxX = -1, maxY = -1
            for y in 0..<h {
                for x in 0..<w {
                    let i = y * w + x, m = UInt16(cut.mask[i])
                    if m < 255 { for c in 0..<4 { px[i * 4 + c] = UInt8(UInt16(px[i * 4 + c]) * m / 255) } }
                    if px[i * 4 + 3] > 16 { minX = min(minX, x); maxX = max(maxX, x); minY = min(minY, y); maxY = max(maxY, y) }
                }
            }
            guard maxX >= minX else { withExtendedLifetime(ctx) {}; return nil }
            let pad = max(maxX - minX, maxY - minY) * 3 / 100
            let x0 = max(0, minX - pad), y0 = max(0, minY - pad)
            let rect = CGRect(x: x0, y: y0, width: min(w, maxX + pad + 1) - x0, height: min(h, maxY + pad + 1) - y0)
            guard let cropped = ctx.makeImage()?.cropping(to: rect) else { return nil }
            return ImageEncoder.data(cropped, type: .png)
        }.value
    }
}
