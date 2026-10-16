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
