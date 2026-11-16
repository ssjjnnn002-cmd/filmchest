#if os(iOS)
import SwiftUI
import AVFoundation

/// 노출계 카메라: 화면을 보여 주고, 아이폰 카메라가 실제로 고른 셔터·감도·조리개로 장면 밝기(EV)를 잰다.
/// 트리플·듀얼 카메라의 가상 기기를 써서 배율 1 미만(초광각)까지 부드럽게 확대·축소한다.
final class MeterCamera: NSObject, ObservableObject, @unchecked Sendable {
    /// 화면이 실제로 찍힌 밝기 (ISO 100 기준 EV) — 노출 미리보기 기준
    @Published private(set) var frameEV: Double?
    /// 측광 지점이 본 밝기 (ISO 100 기준 EV)
    @Published private(set) var meteredEV: Double?
    @Published private(set) var failed: String?
    /// 광각(1배)을 1로 본 배율 범위
    @Published private(set) var zoomRange: ClosedRange<Double> = 1...1

    let previewLayer = AVCaptureVideoPreviewLayer()
    private let session = AVCaptureSession()
    private let queue = DispatchQueue(label: "filmchest.meter.native")
    private var device: AVCaptureDevice?
    private var base: CGFloat = 1
    private var timer: Timer?
    private var started = false

    override init() {
        super.init()
        previewLayer.session = session
        previewLayer.videoGravity = .resizeAspectFill
    }

    func start() {
        guard !started else { return }
        started = true
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized: configure()
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .video) { [weak self] ok in
                if ok { self?.configure() } else { self?.fail("카메라 권한이 꺼져 있어요. 설정에서 허용해 주세요.") }
            }
        default: fail("카메라 권한이 꺼져 있어요. 설정에서 허용해 주세요.")
        }
    }

    func stop() {
        timer?.invalidate(); timer = nil
        queue.async { [session] in if session.isRunning { session.stopRunning() } }
    }

    private func fail(_ text: String) { DispatchQueue.main.async { self.failed = text } }

    private func configure() {
        queue.async { [weak self] in
            guard let self else { return }
            let device = AVCaptureDevice.default(.builtInTripleCamera, for: .video, position: .back)
                ?? AVCaptureDevice.default(.builtInDualWideCamera, for: .video, position: .back)
                ?? AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back)
            guard let device, let input = try? AVCaptureDeviceInput(device: device) else { self.fail("카메라를 열지 못했어요."); return }
            self.session.beginConfiguration()
            // 4:3 사진 비율 (16:9보다 넓게 보임)
            self.session.sessionPreset = .photo
            if self.session.canAddInput(input) { self.session.addInput(input) }
            self.session.commitConfiguration()
            self.device = device
            let base = device.virtualDeviceSwitchOverVideoZoomFactors.first.map { CGFloat(truncating: $0) } ?? 1
            self.base = base
            if (try? device.lockForConfiguration()) != nil {
                device.videoZoomFactor = min(max(base, device.minAvailableVideoZoomFactor), device.maxAvailableVideoZoomFactor)
                if device.isExposureModeSupported(.continuousAutoExposure) { device.exposureMode = .continuousAutoExposure }
                device.unlockForConfiguration()
            }
            self.session.startRunning()
            let lo = Double(device.minAvailableVideoZoomFactor / base), hi = Double(min(device.maxAvailableVideoZoomFactor, base * 10) / base)
            DispatchQueue.main.async {
                self.zoomRange = lo...max(lo, hi)
                self.timer = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { [weak self] _ in self?.read() }
            }
        }
    }

    /// 트리플·듀얼 카메라의 가상 기기는 조리개를 0으로 두고, 셔터·감도도 지금 화면을 만드는 물리 렌즈에 있다
    private func source(_ d: AVCaptureDevice) -> AVCaptureDevice {
        if d.isVirtualDevice, let active = d.activePrimaryConstituent { return active }
        return d
    }

    private func read() {
        queue.async { [weak self] in
            guard let self, let d = self.device else { return }
            let s = self.source(d)
            let t = s.exposureDuration.seconds, iso = Double(s.iso)
            guard t > 0, iso > 0, t.isFinite, iso.isFinite else { return }
            let n = Double(s.lensAperture) > 0.2 ? Double(s.lensAperture) : 1.8
            let settings = log2(n * n / t) - log2(iso / 100)
            let offset = Double(s.exposureTargetOffset)
            let metered = settings + (offset.isFinite ? offset : 0)
            DispatchQueue.main.async {
                self.frameEV = settings
                self.meteredEV = metered
            }
        }
    }

    /// 측광 지점 (미리보기 화면 안 0–1). 중앙·평균은 가운데
    func setPoint(_ p: CGPoint) {
        let layer = previewLayer
        let size = layer.bounds.size
        guard size.width > 1 else { return }
        let point = layer.captureDevicePointConverted(fromLayerPoint: CGPoint(x: p.x * size.width, y: p.y * size.height))
        queue.async { [weak self] in
            guard let d = self?.device, d.isExposurePointOfInterestSupported, (try? d.lockForConfiguration()) != nil else { return }
            d.exposurePointOfInterest = point
            if d.isExposureModeSupported(.continuousAutoExposure) { d.exposureMode = .continuousAutoExposure }
            d.unlockForConfiguration()
        }
    }

    /// 광각 기준 배율로 부드럽게 확대·축소
    func setZoom(_ rel: Double) {
        queue.async { [weak self] in
            guard let self, let d = self.device, (try? d.lockForConfiguration()) != nil else { return }
            let want = min(max(CGFloat(rel) * self.base, d.minAvailableVideoZoomFactor), d.maxAvailableVideoZoomFactor)
            d.ramp(toVideoZoomFactor: want, withRate: 6)
            d.unlockForConfiguration()
        }
    }
}

/// 카메라 화면
struct MeterPreview: UIViewRepresentable {
    let camera: MeterCamera
    func makeUIView(context: Context) -> PreviewHost {
        let v = PreviewHost()
        v.layer.addSublayer(camera.previewLayer)
        v.backgroundColor = .black
        return v
    }
    func updateUIView(_ uiView: PreviewHost, context: Context) {}

    final class PreviewHost: UIView {
        override func layoutSubviews() {
            super.layoutSubviews()
            layer.sublayers?.forEach { $0.frame = bounds }
        }
    }
}
#endif
