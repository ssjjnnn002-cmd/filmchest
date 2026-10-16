import SwiftUI
import SceneKit
import JavaScriptCore

/// 사진이 없을 때 보여주는 기본 모형.
/// 모양은 웹앱과 같은 코드(Resources/camera3d.js — web/src/core/model3d.ts를 묶은 것)로 만들고,
/// 여기서는 재질과 조명만 입힌다. 기종별 모양을 고치려면 웹 쪽을 고친 뒤 `npm run build:ios3d`.
enum DummyCameraModel {
    struct Part {
        let role: String
        let geometry: SCNGeometry
    }

    struct Shape {
        let parts: [Part]
        let bottom: Double
    }

    // MARK: 모양 (JavaScriptCore)

    private static let lock = NSLock()
    nonisolated(unsafe) private static var context: JSContext?
    nonisolated(unsafe) private static var cache: [String: Shape] = [:]

    /// 같은 기종은 한 번만 만든다. 처음엔 수십~수백 ms 걸리므로 가능하면 메인 스레드 밖에서 부른다.
    static func shape(brand: String, model: String, style: CameraBodyStyle) -> Shape? {
        let key = "\(brand)|\(model)|\(style.rawValue)".lowercased()
        lock.lock()
        defer { lock.unlock() }
        if let hit = cache[key] { return hit }
        if context == nil {
            guard let url = Bundle.main.url(forResource: "camera3d", withExtension: "js"),
                  let source = try? String(contentsOf: url, encoding: .utf8),
                  let ctx = JSContext() else { return nil }
            ctx.exceptionHandler = { _, error in print("camera3d.js:", error?.toString() ?? "") }
            ctx.evaluateScript(source)
            context = ctx
        }
        guard let ctx = context,
              let result = ctx.objectForKeyedSubscript("Camera3D")?.objectForKeyedSubscript("build")?
                .call(withArguments: [brand, model, style.rawValue]),
              result.isObject,
              let parts = result.objectForKeyedSubscript("parts"), parts.isArray else { return nil }
        let count = Int(parts.objectForKeyedSubscript("length").toInt32())
        var out: [Part] = []
        for i in 0..<count {
            guard let p = parts.atIndex(i),
                  let role = p.objectForKeyedSubscript("role")?.toString(),
                  let pos = floats(p.objectForKeyedSubscript("position")),
                  let nor = floats(p.objectForKeyedSubscript("normal")),
                  var uv = floats(p.objectForKeyedSubscript("uv")) else { continue }
            flipV(&uv)
            out.append(Part(role: role, geometry: geometry(position: pos, normal: nor, uv: uv)))
        }
        let shape = Shape(parts: out, bottom: result.objectForKeyedSubscript("bottom")?.toDouble() ?? 4)
        cache[key] = shape
        return shape
    }

    /// Float32Array → Data
    private static func floats(_ value: JSValue?) -> Data? {
        guard let value else { return nil }
        let ctx = value.context.jsGlobalContextRef
        var exception: JSValueRef?
        guard let obj = JSValueToObject(ctx, value.jsValueRef, &exception) else { return nil }
        let length = JSObjectGetTypedArrayByteLength(ctx, obj, &exception)
        guard length > 0, let ptr = JSObjectGetTypedArrayBytesPtr(ctx, obj, &exception) else { return nil }
        return Data(bytes: ptr, count: length)
    }

    /// three.js는 텍스처 v가 아래에서 위, SceneKit은 위에서 아래
    private static func flipV(_ data: inout Data) {
        data.withUnsafeMutableBytes { raw in
            let f = raw.bindMemory(to: Float.self)
            var i = 1
            while i < f.count { f[i] = 1 - f[i]; i += 2 }
        }
    }

    private static func geometry(position: Data, normal: Data, uv: Data) -> SCNGeometry {
        let n = position.count / 12
        let sources = [
            SCNGeometrySource(data: position, semantic: .vertex, vectorCount: n, usesFloatComponents: true,
                              componentsPerVector: 3, bytesPerComponent: 4, dataOffset: 0, dataStride: 12),
            SCNGeometrySource(data: normal, semantic: .normal, vectorCount: n, usesFloatComponents: true,
                              componentsPerVector: 3, bytesPerComponent: 4, dataOffset: 0, dataStride: 12),
            SCNGeometrySource(data: uv, semantic: .texcoord, vectorCount: n, usesFloatComponents: true,
                              componentsPerVector: 2, bytesPerComponent: 4, dataOffset: 0, dataStride: 8),
        ]
        var indices = [UInt32](repeating: 0, count: n)
        for i in 0..<n { indices[i] = UInt32(i) }
        let element = SCNGeometryElement(data: indices.withUnsafeBytes { Data($0) }, primitiveType: .triangles,
                                         primitiveCount: n / 3, bytesPerIndex: 4)
        return SCNGeometry(sources: sources, elements: [element])
    }

    // MARK: 장면

    /// 모형 노드 (재질 포함)
    static func modelNode(_ shape: Shape, colorHex: String) -> SCNNode {
        let kit = Materials(base: PlatformColor(hex: colorHex))
        let node = SCNNode()
        for part in shape.parts {
            let g = part.geometry.copy() as! SCNGeometry
            g.materials = [kit.material(for: part.role)]
            node.addChildNode(SCNNode(geometry: g))
        }
        node.eulerAngles = SCNVector3(0, -0.42, 0)
        node.name = "model"
        return node
    }

    static func makeScene(_ shape: Shape, colorHex: String = CameraBodyStyle.defaultColorHex) -> SCNScene {
        let scene = SCNScene()
        let model = modelNode(shape, colorHex: colorHex)
        scene.rootNode.addChildNode(model)

        scene.lightingEnvironment.contents = StudioEnvironment.image
        scene.lightingEnvironment.intensity = 1.6

        // 바닥 그림자
        let floor = SCNFloor()
        floor.reflectivity = 0
        let floorMat = SCNMaterial()
        floorMat.lightingModel = .shadowOnly
        floor.materials = [floorMat]
        let floorNode = SCNNode(geometry: floor)
        floorNode.position = v(0, -shape.bottom - 0.02, 0)
        scene.rootNode.addChildNode(floorNode)

        func light(_ type: SCNLight.LightType, _ intensity: CGFloat, from p: SCNVector3? = nil, shadow: Bool = false) {
            let node = SCNNode()
            let l = SCNLight()
            l.type = type
            l.intensity = intensity
            if shadow {
                l.castsShadow = true
                l.shadowMode = .deferred
                l.shadowRadius = 12
                l.shadowSampleCount = 16
                l.shadowColor = PlatformColor(white: 0, alpha: 0.35)
            }
            node.light = l
            if let p {
                node.position = p
                node.look(at: SCNVector3Zero)
            }
            scene.rootNode.addChildNode(node)
        }
        light(.directional, 900, from: v(-10, 18, 14), shadow: true) // 주광
        light(.directional, 260, from: v(14, 4, 10))                 // 보조광
        light(.directional, 600, from: v(8, 12, -16))                // 윤곽광
        light(.ambient, 90)

        // 정면에서 살짝 위. 기종끼리 거리 비율은 유지하고, 카드에서는 더 크게 보이게 카메라를 당긴다.
        let (lo, hi) = model.boundingBox
        let rotated = model.convertVolume((lo, hi))
        let size = SCNVector3(rotated.1.x - rotated.0.x, rotated.1.y - rotated.0.y, rotated.1.z - rotated.0.z)
        let center = v(Double(rotated.0.x + rotated.1.x) / 2, Double(rotated.0.y + rotated.1.y) / 2,
                       Double(rotated.0.z + rotated.1.z) / 2)
        let span = Double(max(size.x, size.y * 1.33, size.z))
        let dist = max(span, referenceSpan()) * 1.7
        let camera = SCNNode()
        camera.camera = SCNCamera()
        camera.camera!.fieldOfView = 21
        camera.camera!.zFar = 1000
        camera.camera!.wantsHDR = true
        // 자동 노출을 끈다: 켜 두면 어두운 몸체를 점점 밝게 보정해서 검정이 흰색 쪽으로 바뀌어 보인다
        camera.camera!.wantsExposureAdaptation = false
        camera.name = "camera"
        camera.position = v(Double(center.x), Double(center.y) + dist * 0.32, Double(center.z) + dist)
        let target = v(Double(center.x), Double(center.y) - Double(size.y) * 0.04, Double(center.z))
        camera.look(at: target)
        scene.rootNode.addChildNode(camera)
        scene.rootNode.setValue(NSValue(scnVector3: target), forKey: "target")
        return scene
    }

    /// 카탈로그에서 큰 기종 몇 개의 바깥 크기. 한 번만 재고 모든 모형이 이 거리를 같이 쓴다.
    private static var cachedReferenceSpan: Double?
    private static func referenceSpan() -> Double {
        if let cachedReferenceSpan { return cachedReferenceSpan }
        let probes: [(String, String, CameraBodyStyle)] = [
            ("Mamiya", "RB67", .mediumFormat),
            ("Pentax", "67", .mediumFormat),
            ("Hasselblad", "500C/M", .mediumFormat),
            ("Nikon", "F5", .slr),
        ]
        var best = 1.0
        for (brand, model, style) in probes {
            guard let shape = shape(brand: brand, model: model, style: style) else { continue }
            let node = modelNode(shape, colorHex: "#888888")
            let (lo, hi) = node.boundingBox
            let rotated = node.convertVolume((lo, hi))
            let size = SCNVector3(rotated.1.x - rotated.0.x, rotated.1.y - rotated.0.y, rotated.1.z - rotated.0.z)
            best = max(best, Double(max(size.x, size.y * 1.33, size.z)))
        }
        cachedReferenceSpan = best
        return best
    }

    static func target(of scene: SCNScene) -> SCNVector3 {
        (scene.rootNode.value(forKey: "target") as? NSValue)?.scnVector3Value ?? SCNVector3Zero
    }
}

func v(_ x: Double, _ y: Double, _ z: Double) -> SCNVector3 { SCNVector3(Float(x), Float(y), Float(z)) }

private extension SCNNode {
    /// 회전을 반영한 바깥 상자 (부모 좌표)
    func convertVolume(_ box: (SCNVector3, SCNVector3)) -> (SCNVector3, SCNVector3) {
        let (a, b) = box
        var lo = SCNVector3(Float.greatestFiniteMagnitude, .greatestFiniteMagnitude, .greatestFiniteMagnitude)
        var hi = SCNVector3(-Float.greatestFiniteMagnitude, -.greatestFiniteMagnitude, -.greatestFiniteMagnitude)
        for x in [a.x, b.x] { for y in [a.y, b.y] { for z in [a.z, b.z] {
            let p = convertPosition(SCNVector3(x, y, z), to: parent)
            lo = SCNVector3(min(lo.x, p.x), min(lo.y, p.y), min(lo.z, p.z))
            hi = SCNVector3(max(hi.x, p.x), max(hi.y, p.y), max(hi.z, p.z))
        } } }
        return (lo, hi)
    }
}

#if os(macOS)
private extension SCNVector3 {
    init(_ x: Float, _ y: Float, _ z: Float) { self.init(x: CGFloat(x), y: CGFloat(y), z: CGFloat(z)) }
}
#endif

// MARK: - 재질 (웹 model3d.ts의 makeKit과 같은 값)

private struct Materials {
    let base: PlatformColor
    let isDark: Bool

    init(base: PlatformColor) {
        self.base = base
        isDark = base.perceivedBrightness < 0.35
    }

    private func pbr(_ color: Any, rough: Double, metal: Double, clearcoat: Double = 0, clearcoatRough: Double = 0.3) -> SCNMaterial {
        let m = SCNMaterial()
        m.lightingModel = .physicallyBased
        m.diffuse.contents = color
        m.roughness.contents = rough
        m.metalness.contents = metal
        if clearcoat > 0 {
            m.clearCoat.contents = clearcoat
            m.clearCoatRoughness.contents = clearcoatRough
        }
        return m
    }

    private func gray(_ hex: UInt32) -> PlatformColor { PlatformColor(hex: String(format: "%06X", hex)) }

    func material(for role: String) -> SCNMaterial {
        if role.hasPrefix("scale:") {
            let labels = role.dropFirst(6).split(separator: ",").map(String.init)
            return pbr(ScaleTexture.image(labels) as Any, rough: 0.45, metal: 0.2, clearcoat: 0.4)
        }
        if role.hasPrefix("dial:") {
            let labels = role.dropFirst(5).split(separator: ",", omittingEmptySubsequences: false).map(String.init)
            let m = SCNMaterial()
            m.lightingModel = .constant
            m.diffuse.contents = DialTexture.image(labels, light: isDark)
            m.blendMode = .alpha
            m.writesToDepthBuffer = false
            return m
        }
        switch role {
        case "leather":
            let m = pbr(LeatherTexture.image(base: base.adjusted(by: isDark ? 0.03 : -0.1)) as Any, rough: 0.88, metal: 0)
            m.diffuse.wrapS = .repeat
            m.diffuse.wrapT = .repeat
            m.diffuse.contentsTransform = SCNMatrix4MakeScale(0.9, 0.9, 1)
            return m
        case "plate":
            return pbr(base.adjusted(by: isDark ? 0.08 : 0.02), rough: isDark ? 0.36 : 0.3, metal: isDark ? 0.35 : 0.8,
                       clearcoat: isDark ? 0.6 : 0.2)
        case "accent": return pbr(base.adjusted(by: isDark ? 0.12 : 0.06), rough: 0.28, metal: isDark ? 0.5 : 0.9, clearcoat: 0.4)
        case "plastic": return pbr(base, rough: 0.5, metal: 0.05, clearcoat: 0.25, clearcoatRough: 0.5)
        case "lensBlack": return pbr(gray(0x111112), rough: 0.4, metal: 0.3, clearcoat: 0.5, clearcoatRough: 0.35)
        case "lensSatin": return pbr(gray(0x1A1A1C), rough: 0.55, metal: 0.2)
        case "rubber": return pbr(gray(0x0D0D0E), rough: 0.9, metal: 0)
        case "window": return pbr(gray(0x0E1014), rough: 0.05, metal: 0.2, clearcoat: 1, clearcoatRough: 0.02)
        case "frosted": return pbr(gray(0xDCDCDC), rough: 0.45, metal: 0.05)
        case "red": return pbr(PlatformColor(hex: "C8102E"), rough: 0.35, metal: 0.1, clearcoat: 0.8)
        case "recess": return pbr(gray(0x050505), rough: 0.8, metal: 0)
        case "frontring": return pbr(FrontRingTexture.image as Any, rough: 0.5, metal: 0.2)
        case "glass":
            let m = SCNMaterial()
            m.lightingModel = .constant
            m.diffuse.contents = LensGlassTexture.image
            return m
        default: return pbr(base, rough: 0.4, metal: 0.3)
        }
    }
}

// MARK: - 색 / 텍스처

#if os(iOS)
typealias PlatformColor = UIColor
#else
typealias PlatformColor = NSColor
#endif

extension PlatformColor {
    convenience init(hex: String) {
        var s = hex.trimmingCharacters(in: .whitespaces)
        if s.hasPrefix("#") { s.removeFirst() }
        let value = UInt64(s, radix: 16) ?? 0x1C1C1E
        self.init(red: CGFloat((value >> 16) & 0xFF) / 255, green: CGFloat((value >> 8) & 0xFF) / 255,
                  blue: CGFloat(value & 0xFF) / 255, alpha: 1)
    }

    /// sRGB 0~1. 컬러피커는 Display P3 등 넓은 색공간 색을 주므로 sRGB로 변환해서 읽는다.
    var rgb: (r: CGFloat, g: CGFloat, b: CGFloat) {
        let srgb = CGColorSpace(name: CGColorSpace.sRGB)!
        if let c = cgColor.converted(to: srgb, intent: .defaultIntent, options: nil),
           let comps = c.components, comps.count >= 3 {
            func clamp(_ x: CGFloat) -> CGFloat { min(max(x, 0), 1) }
            return (clamp(comps[0]), clamp(comps[1]), clamp(comps[2]))
        }
        if let comps = cgColor.components, comps.count == 2 {   // 회색조
            return (comps[0], comps[0], comps[0])
        }
        return (0, 0, 0)
    }

    var perceivedBrightness: Double {
        let c = rgb
        return Double(0.299 * c.r + 0.587 * c.g + 0.114 * c.b)
    }

    /// 밝기를 더하거나 뺀 색
    func adjusted(by amount: CGFloat) -> PlatformColor {
        let c = rgb
        func clamp(_ x: CGFloat) -> CGFloat { min(max(x + amount, 0), 1) }
        return PlatformColor(red: clamp(c.r), green: clamp(c.g), blue: clamp(c.b), alpha: 1)
    }
}

private func bitmap(_ w: Int, _ h: Int, _ draw: (CGContext) -> Void) -> CGImage? {
    guard let ctx = CGContext(data: nil, width: w, height: h, bitsPerComponent: 8, bytesPerRow: 0,
                              space: CGColorSpace(name: CGColorSpace.sRGB)!,
                              bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { return nil }
    draw(ctx)
    return ctx.makeImage()
}

/// 글자 한 줄을 (x, y) 가운데에 그린다. CG 좌표(아래가 0).
private func drawText(_ text: String, in ctx: CGContext, at p: CGPoint, size: CGFloat, color: CGColor) {
    let font = CTFontCreateWithName("Helvetica-Bold" as CFString, size, nil)
    let attr = NSAttributedString(string: text, attributes: [
        NSAttributedString.Key(kCTFontAttributeName as String): font,
        NSAttributedString.Key(kCTForegroundColorAttributeName as String): color,
    ])
    let line = CTLineCreateWithAttributedString(attr)
    let bounds = CTLineGetBoundsWithOptions(line, .useGlyphPathBounds)
    ctx.textPosition = CGPoint(x: p.x - bounds.width / 2 - bounds.minX, y: p.y - bounds.height / 2 - bounds.minY)
    CTLineDraw(line, ctx)
}

/// 가죽 결: 작은 점을 흩뿌린 반복 텍스처 (색 포함)
private enum LeatherTexture {
    static func image(base: PlatformColor) -> CGImage? {
        let size = 256
        let c = base.rgb
        return bitmap(size, size) { ctx in
            ctx.setFillColor(CGColor(srgbRed: c.r, green: c.g, blue: c.b, alpha: 1))
            ctx.fill(CGRect(x: 0, y: 0, width: size, height: size))
            var seed: UInt64 = 0x9E37_79B9
            func rand() -> Double {
                seed = seed &* 6364136223846793005 &+ 1442695040888963407
                return Double(seed >> 33) / Double(1 << 31)
            }
            for _ in 0..<5200 {
                let x = rand() * Double(size), y = rand() * Double(size), r = 1.2 + rand() * 2.8
                let shade = (rand() - 0.5) * 0.1
                ctx.setFillColor(CGColor(srgbRed: min(max(c.r + shade, 0), 1), green: min(max(c.g + shade, 0), 1),
                                         blue: min(max(c.b + shade, 0), 1), alpha: 1))
                ctx.fillEllipse(in: CGRect(x: x, y: y, width: r, height: r))
            }
        }
    }
}

/// 렌즈 유리: 코팅 반사가 살짝 보이는 검은 유리
private enum LensGlassTexture {
    static let image: CGImage? = bitmap(256, 256) { ctx in
        let s: CGFloat = 256
        let space = CGColorSpace(name: CGColorSpace.sRGB)
        let c = CGPoint(x: s / 2, y: s / 2)
        let base = CGGradient(colorsSpace: space, colors: [CGColor(srgbRed: 0.10, green: 0.10, blue: 0.125, alpha: 1),
                                                           CGColor(srgbRed: 0.047, green: 0.047, blue: 0.063, alpha: 1),
                                                           CGColor(srgbRed: 0.02, green: 0.02, blue: 0.027, alpha: 1)] as CFArray,
                              locations: [0, 0.7, 1])!
        ctx.drawRadialGradient(base, startCenter: c, startRadius: 0, endCenter: c, endRadius: s / 2, options: [])
        func ring(_ r: CGFloat, _ rgba: (CGFloat, CGFloat, CGFloat, CGFloat), _ width: CGFloat) {
            ctx.setStrokeColor(CGColor(srgbRed: rgba.0 / 255, green: rgba.1 / 255, blue: rgba.2 / 255, alpha: rgba.3))
            ctx.setLineWidth(width)
            ctx.strokeEllipse(in: CGRect(x: c.x - r, y: c.y - r, width: r * 2, height: r * 2))
        }
        // 무채색: 렌즈에 색이 들어가지 않게 회색 반사 고리만
        ring(96, (120, 120, 124, 0.22), 8)
        ring(60, (110, 110, 114, 0.18), 5)
        func hl(_ x: CGFloat, _ y: CGFloat, _ r: CGFloat, _ a: CGFloat) {
            let g = CGGradient(colorsSpace: space, colors: [CGColor(gray: 1, alpha: a), CGColor(gray: 1, alpha: 0)] as CFArray,
                               locations: [0, 1])!
            let p = CGPoint(x: x, y: s - y)
            ctx.drawRadialGradient(g, startCenter: p, startRadius: 0, endCenter: p, endRadius: r, options: [])
        }
        hl(s * 0.36, s * 0.33, 36, 0.95)
        hl(s * 0.6, s * 0.62, 12, 0.6)
        hl(s * 0.45, s * 0.42, 80, 0.2)
    }
}

/// 렌즈 경통 눈금 띠
private enum ScaleTexture {
    nonisolated(unsafe) private static var cache: [String: CGImage] = [:]
    private static let lock = NSLock()

    static func image(_ labels: [String]) -> CGImage? {
        let key = labels.joined(separator: ",")
        lock.lock()
        defer { lock.unlock() }
        if let hit = cache[key] { return hit }
        let img = bitmap(1024, 64) { ctx in
            ctx.setFillColor(CGColor(srgbRed: 0.067, green: 0.067, blue: 0.075, alpha: 1))
            ctx.fill(CGRect(x: 0, y: 0, width: 1024, height: 64))
            // 원통 바깥에서 읽히도록 좌우를 뒤집어 그린다 (웹과 같음)
            ctx.translateBy(x: 1024, y: 0)
            ctx.scaleBy(x: -1, y: 1)
            let span: CGFloat = 380
            for (i, l) in labels.enumerated() {
                let x = 512 - span / 2 + span * CGFloat(i) / CGFloat(max(1, labels.count - 1))
                drawText(l, in: ctx, at: CGPoint(x: 1024 - x, y: 32), size: 30, color: CGColor(gray: 0.95, alpha: 1))
            }
        }
        cache[key] = img
        return img
    }
}

/// 다이얼 윗면 숫자 (투명 배경)
private enum DialTexture {
    static func image(_ labels: [String], light: Bool) -> CGImage? {
        bitmap(256, 256) { ctx in
            let ink = CGColor(gray: light ? 0.91 : 0.1, alpha: 1)
            for (i, l) in labels.enumerated() {
                let a = CGFloat(i) / CGFloat(labels.count) * .pi * 2
                ctx.saveGState()
                ctx.translateBy(x: 128 + sin(a) * 92, y: 128 + cos(a) * 92)
                ctx.rotate(by: -a)
                drawText(l, in: ctx, at: .zero, size: 22, color: ink)
                ctx.restoreGState()
            }
            ctx.setStrokeColor(ink)
            ctx.setLineWidth(3)
            ctx.strokeEllipse(in: CGRect(x: 68, y: 68, width: 120, height: 120))
        }
    }
}

/// 렌즈 앞 테두리 글씨
private enum FrontRingTexture {
    static let image: CGImage? = bitmap(512, 512) { ctx in
        ctx.setFillColor(CGColor(srgbRed: 0.07, green: 0.07, blue: 0.08, alpha: 1))
        ctx.fillEllipse(in: CGRect(x: 0, y: 0, width: 512, height: 512))
        let text = Array("LENS  1:1.8  f=50mm  ⌀52  ·  MULTI COATED  ·  ")
        let r: CGFloat = 222
        for (i, ch) in text.enumerated() {
            // 웹 캔버스(위가 0)와 같은 배치가 되도록 각도 부호를 뒤집는다
            let a = -(-CGFloat.pi * 0.95 + CGFloat(i) / CGFloat(text.count) * .pi * 1.9)
            ctx.saveGState()
            ctx.translateBy(x: 256 + cos(a) * r, y: 256 + sin(a) * r)
            ctx.rotate(by: a - .pi / 2)
            drawText(String(ch), in: ctx, at: .zero, size: 26, color: CGColor(gray: 0.9, alpha: 1))
            ctx.restoreGState()
        }
    }
}

/// 위쪽이 밝은 스튜디오 조명 환경 (구형 환경맵)
private enum StudioEnvironment {
    static let image: CGImage? = bitmap(512, 256) { ctx in
        let gradient = CGGradient(colorsSpace: CGColorSpace(name: CGColorSpace.sRGB),
                                  colors: [CGColor(gray: 0.12, alpha: 1), CGColor(gray: 0.45, alpha: 1),
                                           CGColor(gray: 0.85, alpha: 1)] as CFArray,
                                  locations: [0, 0.5, 1])!
        ctx.drawLinearGradient(gradient, start: CGPoint(x: 0, y: 0), end: CGPoint(x: 0, y: 256), options: [])
        ctx.setFillColor(CGColor(gray: 1, alpha: 1))
        ctx.fill(CGRect(x: 90, y: 170, width: 110, height: 60))
        ctx.setFillColor(CGColor(gray: 0.9, alpha: 1))
        ctx.fill(CGRect(x: 330, y: 150, width: 70, height: 50))
    }
}

// MARK: - 목록용 정지 이미지

/// 어떤 카메라의 기본 모형인지 (모양을 찾는 열쇠)
struct DummyModelID: Hashable {
    var brand: String
    var model: String
    var style: CameraBodyStyle

    var key: String { "\(brand)|\(model)|\(style.rawValue)" }
}

enum DummySnapshot {
    private static let cache = NSCache<NSString, CGImage>()

    static func image(_ id: DummyModelID, colorHex: String) async -> CGImage? {
        let key = "\(id.key)|\(colorHex.uppercased())" as NSString
        if let hit = cache.object(forKey: key) { return hit }
        guard let shape = await Task.detached(priority: .userInitiated, operation: {
            DummyCameraModel.shape(brand: id.brand, model: id.model, style: id.style)
        }).value else { return nil }
        let image = await MainActor.run { render(shape, colorHex: colorHex) }
        if let image { cache.setObject(image, forKey: key) }
        return image
    }

    @MainActor
    private static func render(_ shape: DummyCameraModel.Shape, colorHex: String) -> CGImage? {
        let scene = DummyCameraModel.makeScene(shape, colorHex: colorHex)
        let renderer = SCNRenderer(device: MTLCreateSystemDefaultDevice(), options: nil)
        renderer.scene = scene
        renderer.pointOfView = scene.rootNode.childNode(withName: "camera", recursively: false)
        renderer.autoenablesDefaultLighting = false
        scene.background.contents = PlatformColor.clear
        let image = renderer.snapshot(atTime: 0, with: CGSize(width: 800, height: 600), antialiasingMode: .multisampling4X)
        #if os(iOS)
        return image.cgImage
        #else
        return image.cgImage(forProposedRect: nil, context: nil, hints: nil)
        #endif
    }
}

/// 목록용: 기본 모형을 정지 이미지로
struct DummyCameraImage: View {
    let id: DummyModelID
    var colorHex: String = CameraBodyStyle.defaultColorHex
    @State private var image: CGImage?

    var body: some View {
        Group {
            if let image {
                Image(cgImage: image).resizable().scaledToFit()
            } else {
                ProgressView().controlSize(.small)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .task(id: "\(id.key)|\(colorHex)") { image = await DummySnapshot.image(id, colorHex: colorHex) }
    }
}

// MARK: - 돌려 보기

/// 상세 화면용: 손가락으로 돌려 볼 수 있는 3D 모형 (턴테이블 방식)
struct DummyCamera3DView: View {
    let id: DummyModelID
    var colorHex: String = CameraBodyStyle.defaultColorHex
    @State private var shape: DummyCameraModel.Shape?
    @State private var loadedKey = ""

    var body: some View {
        ZStack {
            // 뷰는 그대로 두고 장면만 바꾼다 (색을 고르는 동안 뷰를 새로 만들면 깜빡인다)
            if let shape { SceneHost(shape: shape, shapeKey: loadedKey, colorHex: colorHex) }
            if loadedKey != id.key { ProgressView() }
        }
        .task(id: id.key) {
            let id = id
            let s = await Task.detached(priority: .userInitiated) {
                DummyCameraModel.shape(brand: id.brand, model: id.model, style: id.style)
            }.value
            shape = s
            loadedKey = id.key
        }
    }
}

final class SceneHostCoordinator {
    var key = ""
}

#if os(iOS)
private struct SceneHost: UIViewRepresentable {
    let shape: DummyCameraModel.Shape
    let shapeKey: String
    let colorHex: String

    func makeCoordinator() -> SceneHostCoordinator { SceneHostCoordinator() }

    func makeUIView(context: Context) -> SCNView {
        let view = SCNView()
        configure(view)
        apply(to: view, context.coordinator)
        return view
    }

    func updateUIView(_ view: SCNView, context: Context) { apply(to: view, context.coordinator) }
}
#else
private struct SceneHost: NSViewRepresentable {
    let shape: DummyCameraModel.Shape
    let shapeKey: String
    let colorHex: String

    func makeCoordinator() -> SceneHostCoordinator { SceneHostCoordinator() }

    func makeNSView(context: Context) -> SCNView {
        let view = SCNView()
        configure(view)
        apply(to: view, context.coordinator)
        return view
    }

    func updateNSView(_ view: SCNView, context: Context) { apply(to: view, context.coordinator) }
}
#endif

private extension SceneHost {
    func configure(_ view: SCNView) {
        view.backgroundColor = .clear
        view.antialiasingMode = .multisampling4X
        view.allowsCameraControl = true
        view.defaultCameraController.interactionMode = .orbitTurntable
        view.defaultCameraController.inertiaEnabled = true
        view.defaultCameraController.maximumVerticalAngle = 40
        view.defaultCameraController.minimumVerticalAngle = -5
    }

    /// 모양이 바뀌면 장면을 새로, 색만 바뀌면 모델만 갈아 끼우고 돌려 본 각도는 유지
    func apply(to view: SCNView, _ coordinator: SceneHostCoordinator) {
        let key = "\(shapeKey)|\(colorHex.uppercased())"
        guard coordinator.key != key else { return }
        let sameShape = coordinator.key.hasPrefix("\(shapeKey)|")
        coordinator.key = key
        if sameShape, let scene = view.scene,
           let old = scene.rootNode.childNode(withName: "model", recursively: false) {
            let new = DummyCameraModel.modelNode(shape, colorHex: colorHex)
            new.transform = old.transform
            scene.rootNode.replaceChildNode(old, with: new)
        } else {
            let fresh = DummyCameraModel.makeScene(shape, colorHex: colorHex)
            view.defaultCameraController.target = DummyCameraModel.target(of: fresh)
            view.scene = fresh
            view.pointOfView = fresh.rootNode.childNode(withName: "camera", recursively: false)
        }
    }
}
