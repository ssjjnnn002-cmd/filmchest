#if os(iOS)
import SwiftUI
import UIKit

/// 배경 다듬기: 지운 곳(흐리게 보임)을 되살리거나 더 지운다. 웹 pages/CutoutEditor.tsx와 같은 화면.
struct CutoutEditorView: View {
    let source: CutoutSource
    let onDone: (CutoutSource?) -> Void
    @StateObject private var canvas = CutoutCanvasModel()
    @State private var erase = true
    @State private var brush: Double = 36

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                CutoutCanvas(model: canvas, source: source, erase: erase, brush: brush)
                    .clipped()
                VStack(spacing: 14) {
                    Picker("붓", selection: $erase) {
                        Text("지우기").tag(true)
                        Text("되살리기").tag(false)
                    }
                    .pickerStyle(.segmented)
                    HStack(spacing: 12) {
                        Text("붓 크기").font(.subheadline)
                        Slider(value: $brush, in: 10...90)
                        Circle().fill(Color.primary.opacity(0.25)).frame(width: brush / 3 + 6, height: brush / 3 + 6).frame(width: 36)
                    }
                    HStack {
                        Button("되돌리기", systemImage: "arrow.uturn.backward") { canvas.undo() }
                            .disabled(!canvas.canUndo)
                        Spacer()
                        Button("처음대로", systemImage: "arrow.counterclockwise") { canvas.reset() }
                            .disabled(!canvas.changed)
                    }
                    .font(.subheadline.weight(.medium))
                    Text("한 손가락으로 칠하고, 두 손가락으로 키우거나 옮겨요. 흐린 곳이 지워진 곳이에요.")
                        .font(.caption).foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
                .padding(.horizontal, 20)
                .padding(.vertical, 14)
                .background(.bar)
            }
            .navigationTitle("배경 다듬기")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("취소") { onDone(nil) } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("완료") { onDone(canvas.result(source)) }.fontWeight(.semibold)
                }
            }
        }
    }
}

@MainActor
final class CutoutCanvasModel: ObservableObject {
    @Published var canUndo = false
    @Published var changed = false
    weak var view: CutoutCanvasUIView?
    func undo() { view?.undo() }
    func reset() { view?.reset() }
    func result(_ source: CutoutSource) -> CutoutSource {
        var out = source
        if let m = view?.maskBytes() { out.mask = m }
        return out
    }
}

private struct CutoutCanvas: UIViewRepresentable {
    let model: CutoutCanvasModel
    let source: CutoutSource
    let erase: Bool
    let brush: Double

    func makeUIView(context: Context) -> CutoutCanvasUIView {
        let v = CutoutCanvasUIView(source: source)
        v.onChange = { [weak model] undo, changed in model?.canUndo = undo; model?.changed = changed }
        model.view = v
        return v
    }

    func updateUIView(_ v: CutoutCanvasUIView, context: Context) {
        v.erase = erase
        v.brushPoints = brush
    }
}

/// 그리는 판: 한 손가락 = 붓, 두 손가락 = 확대·이동
final class CutoutCanvasUIView: UIView, UIGestureRecognizerDelegate {
    var erase = true
    var brushPoints: Double = 36
    var onChange: ((Bool, Bool) -> Void)?

    private let image: CGImage
    private let initial: [UInt8]
    private let maskCtx: CGContext
    private let w: Int, h: Int
    private let checker = CALayer()
    private let photo = CALayer()
    private let ring = CAShapeLayer()
    private var undoStack: [Data] = []
    private var zoom: CGFloat = 1
    private var pan = CGPoint.zero
    private var last: CGPoint?
    private var painting = true
    private var pinchStart: (zoom: CGFloat, pan: CGPoint, center: CGPoint)?

    init(source: CutoutSource) {
        image = source.image
        initial = source.initial
        w = source.width; h = source.height
        maskCtx = CGContext(data: nil, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w,
                            space: CGColorSpaceCreateDeviceGray(), bitmapInfo: CGImageAlphaInfo.none.rawValue)!
        super.init(frame: .zero)
        load(source.mask)
        backgroundColor = .secondarySystemBackground
        checker.backgroundColor = UIColor(patternImage: Self.checkerTile()).cgColor
        photo.magnificationFilter = .linear
        layer.addSublayer(checker)
        layer.addSublayer(photo)
        ring.fillColor = UIColor.white.withAlphaComponent(0.15).cgColor
        ring.strokeColor = UIColor.white.cgColor
        ring.lineWidth = 1.5
        ring.shadowOpacity = 0.6; ring.shadowRadius = 1; ring.shadowOffset = .zero
        ring.isHidden = true
        layer.addSublayer(ring)

        let paint = UIPanGestureRecognizer(target: self, action: #selector(onPaint(_:)))
        paint.maximumNumberOfTouches = 1
        paint.delegate = self
        let pinch = UIPinchGestureRecognizer(target: self, action: #selector(onPinch(_:)))
        pinch.delegate = self
        addGestureRecognizer(paint)
        addGestureRecognizer(pinch)
        // 한 번 톡 찍어도 칠해지게
        let tap = UITapGestureRecognizer(target: self, action: #selector(onTap(_:)))
        addGestureRecognizer(tap)
        render()
    }

    required init?(coder: NSCoder) { fatalError() }

    // 두 손가락이 닿으면 칠하던 것을 무르고 확대로 넘어간다
    func gestureRecognizer(_ g: UIGestureRecognizer, shouldRecognizeSimultaneouslyWith other: UIGestureRecognizer) -> Bool { true }

    private static func checkerTile() -> UIImage {
        UIGraphicsImageRenderer(size: CGSize(width: 16, height: 16)).image { c in
            UIColor(white: 0.93, alpha: 1).setFill(); c.fill(CGRect(x: 0, y: 0, width: 16, height: 16))
            UIColor(white: 0.82, alpha: 1).setFill()
            c.fill(CGRect(x: 0, y: 0, width: 8, height: 8)); c.fill(CGRect(x: 8, y: 8, width: 8, height: 8))
        }
    }

    // MARK: 가림막

    private func load(_ bytes: [UInt8]) {
        let p = maskCtx.data!.bindMemory(to: UInt8.self, capacity: w * h)
        bytes.withUnsafeBufferPointer { p.update(from: $0.baseAddress!, count: w * h) }
    }

    func maskBytes() -> [UInt8] {
        let p = maskCtx.data!.bindMemory(to: UInt8.self, capacity: w * h)
        return Array(UnsafeBufferPointer(start: p, count: w * h))
    }

    private func snapshot() -> Data { Data(maskBytes()) }

    func undo() {
        guard let prev = undoStack.popLast() else { return }
        load([UInt8](prev))
        render()
        report()
    }

    func reset() {
        undoStack.append(snapshot())
        load(initial)
        render()
        report()
    }

    private func report() { onChange?(!undoStack.isEmpty, maskBytes() != initial) }

    // MARK: 그리기

    /// 화면에 보이는 사진 자리
    private var imageRect: CGRect {
        let fit = min(bounds.width / CGFloat(w), bounds.height / CGFloat(h)) * 0.92
        let s = fit * zoom
        let size = CGSize(width: CGFloat(w) * s, height: CGFloat(h) * s)
        return CGRect(x: bounds.midX - size.width / 2 + pan.x, y: bounds.midY - size.height / 2 + pan.y, width: size.width, height: size.height)
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        place()
    }

    private func place() {
        CATransaction.begin(); CATransaction.setDisableActions(true)
        checker.frame = imageRect
        photo.frame = imageRect
        CATransaction.commit()
    }

    /// 남길 곳은 그대로, 지운 곳은 흐리게
    private func render() {
        guard let mask = maskCtx.makeImage(),
              let ctx = CGContext(data: nil, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w * 4,
                                  space: CGColorSpace(name: CGColorSpace.sRGB)!, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { return }
        let r = CGRect(x: 0, y: 0, width: w, height: h)
        ctx.setAlpha(0.28)
        ctx.draw(image, in: r)
        ctx.setAlpha(1)
        ctx.saveGState()
        ctx.clip(to: r, mask: mask)
        ctx.draw(image, in: r)
        ctx.restoreGState()
        CATransaction.begin(); CATransaction.setDisableActions(true)
        photo.contents = ctx.makeImage()
        CATransaction.commit()
    }

    /// 화면 좌표 → 가림막 좌표 (가림막은 아래가 0)
    private func toMask(_ p: CGPoint) -> CGPoint {
        let r = imageRect
        let x = (p.x - r.minX) / r.width * CGFloat(w)
        let y = (p.y - r.minY) / r.height * CGFloat(h)
        return CGPoint(x: x, y: CGFloat(h) - y)
    }

    private var brushPixels: CGFloat { CGFloat(brushPoints) / (imageRect.width / CGFloat(w)) }

    private func stroke(from a: CGPoint, to b: CGPoint) {
        let width = brushPixels
        maskCtx.setLineCap(.round)
        maskCtx.setLineJoin(.round)
        maskCtx.setLineWidth(width)
        let color = CGColor(gray: erase ? 0 : 1, alpha: 1)
        maskCtx.setStrokeColor(color)
        // 가장자리를 살짝 부드럽게
        maskCtx.setShadow(offset: .zero, blur: width * 0.18, color: color)
        maskCtx.move(to: toMask(a))
        maskCtx.addLine(to: toMask(b))
        maskCtx.strokePath()
        render()
    }

    private func showRing(at p: CGPoint) {
        let d = CGFloat(brushPoints)
        CATransaction.begin(); CATransaction.setDisableActions(true)
        ring.path = UIBezierPath(ovalIn: CGRect(x: p.x - d / 2, y: p.y - d / 2, width: d, height: d)).cgPath
        ring.isHidden = false
        CATransaction.commit()
    }

    @objc private func onTap(_ g: UITapGestureRecognizer) {
        let p = g.location(in: self)
        undoStack.append(snapshot())
        stroke(from: p, to: CGPoint(x: p.x + 0.1, y: p.y))
        report()
    }

    @objc private func onPaint(_ g: UIPanGestureRecognizer) {
        let p = g.location(in: self)
        if g.state == .began { painting = pinchStart == nil }
        guard painting else { if g.state != .changed { painting = true }; return }
        switch g.state {
        case .began:
            undoStack.append(snapshot())
            if undoStack.count > 30 { undoStack.removeFirst() }
            last = p
            stroke(from: p, to: CGPoint(x: p.x + 0.1, y: p.y))
            showRing(at: p)
        case .changed:
            if let l = last { stroke(from: l, to: p) }
            last = p
            showRing(at: p)
        default:
            last = nil
            ring.isHidden = true
            report()
        }
    }

    @objc private func onPinch(_ g: UIPinchGestureRecognizer) {
        let c = g.location(in: self)
        switch g.state {
        case .began:
            pinchStart = (zoom, pan, c)
            if last != nil, let prev = undoStack.popLast() {
                last = nil
                load([UInt8](prev))
                render()
            }
            painting = false
            ring.isHidden = true
        case .changed:
            guard let s = pinchStart else { return }
            let z = min(max(s.zoom * g.scale, 1), 8)
            // 손가락 가운데를 기준으로 확대하고, 두 손가락을 옮긴 만큼 이동
            let k = z / s.zoom
            let anchor = CGPoint(x: s.center.x - bounds.midX - s.pan.x, y: s.center.y - bounds.midY - s.pan.y)
            zoom = z
            pan = CGPoint(x: s.pan.x + anchor.x * (1 - k) + (c.x - s.center.x), y: s.pan.y + anchor.y * (1 - k) + (c.y - s.center.y))
            if zoom == 1 { pan = .zero }
            place()
        default:
            pinchStart = nil
            report()
        }
    }
}
#endif
