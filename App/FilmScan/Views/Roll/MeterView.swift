#if os(iOS)
import SwiftUI
import SwiftData
import WebKit
import AVFoundation
import FilmScanCore

/// 노출계. 화면은 Resources/meter.html (원본 prototypes/meter/index.html, scripts/sync-meter.mjs로 복사)
/// 카메라 화면은 앱이 직접 띄워 웹 화면 아래(파인더 자리)에 깔고, 노출값도 아이폰 카메라에서 바로 읽어 넘긴다.
struct MeterView: View {
    let roll: RollItem
    var onEnd: () -> Void
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        MeterWebView(roll: roll, close: { dismiss() }, end: onEnd)
            .ignoresSafeArea()
            .background(MeterHostView.background.swiftUI)
            .preferredColorScheme(.dark)
    }
}

private struct MeterWebView: UIViewRepresentable {
    let roll: RollItem
    let close: () -> Void
    let end: () -> Void

    func makeCoordinator() -> MeterBridge { MeterBridge(roll: roll, close: close, end: end) }
    func makeUIView(context: Context) -> MeterHostView { context.coordinator.makeView() }
    func updateUIView(_ uiView: MeterHostView, context: Context) {}
    static func dismantleUIView(_ uiView: MeterHostView, coordinator: MeterBridge) { coordinator.stop() }
}

final class MeterHostView: UIView {
    static let background = UIColor(red: 11 / 255, green: 11 / 255, blue: 12 / 255, alpha: 1)
    let preview = AVCaptureVideoPreviewLayer()
    var webView: WKWebView!

    override func layoutSubviews() {
        super.layoutSubviews()
        webView.frame = bounds
    }
}

private extension UIColor {
    var swiftUI: Color { Color(uiColor: self) }
}

/// 웹 화면 ↔ 앱. 기록은 롤에, 프리와인딩 답은 카메라에 저장한다.
final class MeterBridge: NSObject, WKScriptMessageHandler, AVCaptureVideoDataOutputSampleBufferDelegate {
    private let roll: RollItem
    private let close: () -> Void
    private let end: () -> Void
    private weak var host: MeterHostView?

    private let session = AVCaptureSession()
    private let sessionQueue = DispatchQueue(label: "filmchest.meter.camera")
    private var device: AVCaptureDevice?
    /// 일반(광각) 렌즈의 배율. 초광각이 묶인 카메라는 1이 초광각이라 2쯤이 된다
    private var zoomBase: CGFloat = 1
    private var evTimer: Timer?
    private var started = false
    /// 'spot' 스팟 · 'center' 중앙 중점 · 'avg' 평균
    private var metering = "spot"
    /// 화면 전체 평균 밝기 ÷ 가운데 중점 밝기 (평균 측광 보정용, 카메라 화면에서 직접 잰다)
    private var avgOverCenter: Double = 1
    /// 파인더 안 스팟. 0–1, 왼쪽 위가 0
    private var meterX = 0.5
    private var meterY = 0.5
    /// 지금 측광 방식이 보는 밝기가 중간 회색보다 몇 스톱 밝은지
    private var lumaAdjust = 0.0
    private let videoQueue = DispatchQueue(label: "filmchest.meter.frames")
    private var lastFrameAt: CFTimeInterval = 0
    private var lastPublishedAt: CFTimeInterval = 0
    private var watchingExposure = false
    private var watchingPrimary = false
    /// 셔터·감도를 관찰 중인 기기. 트리플 카메라는 가상 기기가 아니라 지금 찍는 물리 렌즈다
    private var observedDevice: AVCaptureDevice?
    private let exposureGate = NSLock()
    private let durationContext = UnsafeMutableRawPointer(bitPattern: 0xE7A1)
    private let isoContext = UnsafeMutableRawPointer(bitPattern: 0xE7A2)
    private let apertureContext = UnsafeMutableRawPointer(bitPattern: 0xE7A3)
    private let offsetContext = UnsafeMutableRawPointer(bitPattern: 0xE7A4)
    private let primaryContext = UnsafeMutableRawPointer(bitPattern: 0xE7A5)

    init(roll: RollItem, close: @escaping () -> Void, end: @escaping () -> Void) {
        self.roll = roll
        self.close = close
        self.end = end
    }

    func makeView() -> MeterHostView {
        let view = MeterHostView()
        view.backgroundColor = MeterHostView.background
        view.preview.videoGravity = .resizeAspectFill
        view.preview.session = session
        view.layer.addSublayer(view.preview)

        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        config.userContentController.add(WeakHandler(self), name: "meter")
        config.userContentController.addUserScript(
            WKUserScript(source: "window.FILMCHEST_METER_INIT = \(initJSON());", injectionTime: .atDocumentStart, forMainFrameOnly: true))
        let web = WKWebView(frame: .zero, configuration: config)
        web.isOpaque = false
        web.backgroundColor = .clear
        web.scrollView.backgroundColor = .clear
        web.scrollView.contentInsetAdjustmentBehavior = .never
        web.scrollView.showsVerticalScrollIndicator = false
        web.scrollView.isScrollEnabled = false
        web.scrollView.bounces = false
        web.scrollView.delaysContentTouches = false
        web.scrollView.canCancelContentTouches = false
        view.webView = web
        view.addSubview(web)
        if let url = Bundle.main.url(forResource: "meter", withExtension: "html") {
            web.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
        }
        host = view
        return view
    }

    func stop() {
        evTimer?.invalidate()
        evTimer = nil
        host?.webView.configuration.userContentController.removeScriptMessageHandler(forName: "meter")
        let session = session
        sessionQueue.async { [weak self] in
            self?.unwatchExposure()
            if session.isRunning { session.stopRunning() }
        }
    }

    // MARK: 처음 넘기는 값

    private func initJSON() -> String {
        let film = roll.film
        let shots = (try? JSONSerialization.jsonObject(with: JSONEncoder().encode(roll.meterShots))) ?? []
        let dict: [String: Any] = [
            "camera": ["id": roll.camera?.id.uuidString ?? roll.id.uuidString, "name": roll.cameraName],
            "film": [
                "name": roll.filmName,
                "short": film.map { $0.name.replacingOccurrences(of: #"\s*\d+$"#, with: "", options: .regularExpression) } ?? "FILM",
                "iso": roll.shotISO ?? film?.iso ?? 400,
                "format": roll.format.is120 ? "120" : "135",
                "frames": roll.format.framesPerRoll,
                "color": film?.style.band ?? "#f0b43a",
            ],
            "prewind": roll.camera?.prewind.map { $0 as Any } ?? NSNull(),
            "rollPrewind": roll.meterPrewind.map { $0 as Any } ?? NSNull(),
            "shots": shots,
            "nativeCamera": true,
            "bias": AppSettings.meterOffset,
        ]
        guard let data = try? JSONSerialization.data(withJSONObject: dict),
              let text = String(data: data, encoding: .utf8) else { return "null" }
        return text
    }

    // MARK: 웹 화면에서 온 메시지

    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any], let type = body["type"] as? String else { return }
        switch type {
        case "shots":
            if let list = body["shots"], let data = try? JSONSerialization.data(withJSONObject: list),
               let shots = try? JSONDecoder().decode([MeterShot].self, from: data) {
                roll.meterShots = shots
            }
            roll.meterPrewind = body["prewind"] as? Bool
        case "prewind":
            if let value = (body["value"] as? Bool) ?? (body["value"] as? NSNumber)?.boolValue {
                roll.camera?.prewind = value
            }
        case "close":
            close()
        case "end":
            end()
        case "camera":
            startCamera()
        case "finder":
            guard let host, let x = body["x"] as? Double, let y = body["y"] as? Double,
                  let w = body["w"] as? Double, let h = body["h"] as? Double else { return }
            CATransaction.begin()
            CATransaction.setDisableActions(true)
            host.preview.frame = CGRect(x: x, y: y, width: w, height: h)
            CATransaction.commit()
        case "zoom":
            let z = (body["z"] as? Double) ?? (body["z"] as? NSNumber)?.doubleValue
            if let z { setZoom(CGFloat(z)) }
        case "spot":
            metering = body["mode"] as? String ?? ((body["avg"] as? Bool ?? false) ? "avg" : "spot")
            let centered = metering != "spot"
            meterX = centered ? 0.5 : (body["x"] as? Double ?? 0.5)
            meterY = centered ? 0.5 : (body["y"] as? Double ?? 0.5)
            setMeteringPoint(x: meterX, y: meterY)
        default:
            break
        }
    }

    private func js(_ script: String) {
        DispatchQueue.main.async { [weak self] in self?.host?.webView.evaluateJavaScript(script) }
    }

    // MARK: 카메라

    private func startCamera() {
        guard !started else { return }
        started = true
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized: configure()
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .video) { [weak self] ok in
                if ok { self?.configure() } else { self?.js("meterNative.error('카메라 권한이 꺼져 있어요. 설정에서 허용해 주세요.')") }
            }
        default:
            js("meterNative.error('카메라 권한이 꺼져 있어요. 설정에서 허용해 주세요.')")
        }
    }

    private func configure() {
        sessionQueue.async { [weak self] in
            guard let self else { return }
            let device = AVCaptureDevice.default(.builtInTripleCamera, for: .video, position: .back)
                ?? AVCaptureDevice.default(.builtInDualWideCamera, for: .video, position: .back)
                ?? AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back)
            guard let device, let input = try? AVCaptureDeviceInput(device: device) else {
                self.js("meterNative.error('카메라를 열지 못했어요.')")
                return
            }
            self.session.beginConfiguration()
            self.session.sessionPreset = .high
            if self.session.canAddInput(input) { self.session.addInput(input) }
            // 평균 측광용: 화면 밝기를 직접 잰다
            let output = AVCaptureVideoDataOutput()
            output.videoSettings = [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA]
            output.alwaysDiscardsLateVideoFrames = true
            output.setSampleBufferDelegate(self, queue: self.videoQueue)
            if self.session.canAddOutput(output) { self.session.addOutput(output) }
            self.session.commitConfiguration()
            if let conn = output.connection(with: .video), conn.isVideoRotationAngleSupported(90) {
                conn.videoRotationAngle = 90
            }
            self.device = device
            let base = device.virtualDeviceSwitchOverVideoZoomFactors.first.map { CGFloat(truncating: $0) } ?? 1
            self.zoomBase = base
            if (try? device.lockForConfiguration()) != nil {
                device.videoZoomFactor = min(max(base, device.minAvailableVideoZoomFactor), device.maxAvailableVideoZoomFactor)
                device.unlockForConfiguration()
            }
            self.session.startRunning()
            // 세션이 켜진 뒤에 자동 노출을 다시 걸어야 장면이 바뀌어도 셔터가 따라간다
            if (try? device.lockForConfiguration()) != nil {
                if device.isExposureModeSupported(.continuousAutoExposure) { device.exposureMode = .continuousAutoExposure }
                device.isSubjectAreaChangeMonitoringEnabled = true
                device.unlockForConfiguration()
            }
            NotificationCenter.default.addObserver(self, selector: #selector(self.subjectAreaChanged), name: AVCaptureDevice.subjectAreaDidChangeNotification, object: device)
            let minRel = device.minAvailableVideoZoomFactor / base
            let maxRel = min(device.maxAvailableVideoZoomFactor, base * 10) / base
            self.js("meterNative.zoomRange(\(Double(minRel)), \(Double(maxRel)))")
            self.watchExposure()
            self.publishExposure(mode: "spot", avgRatio: 1)
            DispatchQueue.main.async { self.startReadings() }
        }
    }

    /// 트리플·듀얼 카메라의 가상 기기는 조리개를 0으로 두고, 셔터·감도도 물리 렌즈와 따로 논다.
    /// 지금 화면을 만드는 렌즈에서 읽어야 장면 밝기가 따라온다.
    private func exposureSource(_ device: AVCaptureDevice) -> AVCaptureDevice {
        if device.isVirtualDevice, let active = device.activePrimaryConstituent { return active }
        return device
    }

    /// 셔터·감도가 바뀔 때마다 알려 준다. 렌즈가 바뀌면 관찰 대상을 그 렌즈로 옮긴다.
    private func watchExposure() {
        guard let virtual = device else { return }
        let source = exposureSource(virtual)
        if !(watchingExposure && observedDevice === source) {
            unwatchExposureKeys()
            source.addObserver(self, forKeyPath: "exposureDuration", options: [.new], context: durationContext)
            source.addObserver(self, forKeyPath: "ISO", options: [.new], context: isoContext)
            source.addObserver(self, forKeyPath: "lensAperture", options: [.new], context: apertureContext)
            source.addObserver(self, forKeyPath: "exposureTargetOffset", options: [.new], context: offsetContext)
            observedDevice = source
            watchingExposure = true
        }
        if virtual.isVirtualDevice, !watchingPrimary {
            virtual.addObserver(self, forKeyPath: #keyPath(AVCaptureDevice.activePrimaryConstituent), options: [.new], context: primaryContext)
            watchingPrimary = true
        }
    }

    private func unwatchExposureKeys() {
        guard watchingExposure, let source = observedDevice else { return }
        watchingExposure = false
        observedDevice = nil
        source.removeObserver(self, forKeyPath: "exposureDuration", context: durationContext)
        source.removeObserver(self, forKeyPath: "ISO", context: isoContext)
        source.removeObserver(self, forKeyPath: "lensAperture", context: apertureContext)
        source.removeObserver(self, forKeyPath: "exposureTargetOffset", context: offsetContext)
    }

    private func unwatchExposure() {
        unwatchExposureKeys()
        if watchingPrimary, let virtual = device {
            watchingPrimary = false
            virtual.removeObserver(self, forKeyPath: #keyPath(AVCaptureDevice.activePrimaryConstituent), context: primaryContext)
        }
        NotificationCenter.default.removeObserver(self, name: AVCaptureDevice.subjectAreaDidChangeNotification, object: device)
    }

    /// 장면이 바뀌면 자동 노출을 다시 건다. 한 번 맞춘 뒤 셔터를 고정하는 기기가 있다.
    @objc private func subjectAreaChanged() {
        sessionQueue.async { [weak self] in
            guard let self, let device = self.device, (try? device.lockForConfiguration()) != nil else { return }
            if device.isExposureModeSupported(.continuousAutoExposure) { device.exposureMode = .continuousAutoExposure }
            device.isSubjectAreaChangeMonitoringEnabled = true
            device.unlockForConfiguration()
            self.watchExposure()
            self.publishExposure(mode: self.metering, avgRatio: self.avgOverCenter)
        }
    }

    override func observeValue(forKeyPath keyPath: String?, of object: Any?, change: [NSKeyValueChangeKey: Any]?, context: UnsafeMutableRawPointer?) {
        if context == primaryContext {
            sessionQueue.async { [weak self] in self?.watchExposure() }
            return
        }
        if context == durationContext || context == isoContext || context == apertureContext || context == offsetContext {
            let mode = metering
            let ratio = avgOverCenter
            sessionQueue.async { [weak self] in self?.publishExposure(mode: mode, avgRatio: ratio) }
            return
        }
        super.observeValue(forKeyPath: keyPath, of: object, change: change, context: context)
    }

    /// 카메라의 셔터·감도·조리개로 장면 밝기(ISO 100 기준 EV)를 계산해 0.1초마다 넘긴다.
    /// 이 값은 세션 큐에서만 최신으로 읽힌다. 메인 스레드에서 읽으면 처음 값에 고정되는 기기가 있다.
    private func startReadings() {
        evTimer?.invalidate()
        let timer = Timer(timeInterval: 0.1, repeats: true) { [weak self] _ in
            guard let self else { return }
            let mode = self.metering
            let ratio = self.avgOverCenter
            self.sessionQueue.async { self.publishExposure(mode: mode, avgRatio: ratio) }
        }
        evTimer = timer
        RunLoop.main.add(timer, forMode: .common)
    }

    private func publishExposure(mode _: String, avgRatio _: Double) {
        let now = CACurrentMediaTime()
        guard now - lastPublishedAt > 0.08, let virtual = device else { return }
        let source = exposureSource(virtual)
        let t = source.exposureDuration.seconds
        let iso = Double(source.iso)
        guard t > 0, iso > 0, t.isFinite, iso.isFinite else { return }
        // 가상 카메라와 일부 물리 렌즈는 조리개를 0으로 알린다. 없으면 폰 기본 개방으로 둔다
        let aperture = Double(source.lensAperture)
        let n = aperture > 0.2 ? aperture : 1.8
        var ev = log2((n * n) / t) - log2(iso / 100)
        let offset = Double(source.exposureTargetOffset)
        if offset.isFinite { ev += offset }
        exposureGate.lock()
        let seen = lumaAdjust
        exposureGate.unlock()
        if seen.isFinite { ev += seen }
        guard ev.isFinite else { return }
        lastPublishedAt = now
        let script = String(format: "window.meterNative&&meterNative.ev(%.4f)", locale: Locale(identifier: "en_US_POSIX"), ev)
        DispatchQueue.main.async { [weak self] in
            self?.host?.webView.evaluateJavaScript(script)
        }
    }

    func captureOutput(_ output: AVCaptureOutput, didOutput sampleBuffer: CMSampleBuffer, from connection: AVCaptureConnection) {
        let now = CACurrentMediaTime()
        guard now - lastFrameAt > 0.08 else { return }
        lastFrameAt = now
        let mode = metering
        let nx = meterX, ny = meterY
        var adjust = 0.0
        var ratio = avgOverCenter
        if let pixels = CMSampleBufferGetImageBuffer(sampleBuffer) {
            let read = frameLight(pixels, mode: mode, nx: nx, ny: ny)
            adjust = read.adjust
            ratio = read.ratio
        }
        exposureGate.lock()
        lumaAdjust = adjust
        exposureGate.unlock()
        DispatchQueue.main.async { [weak self] in self?.avgOverCenter = ratio }
        sessionQueue.async { [weak self] in self?.publishExposure(mode: mode, avgRatio: ratio) }
    }

    /// 파인더에 보이는 범위에서 스팟·중앙·평균 밝기를 읽는다. 반환값 adjust는 중간 회색 대비 스톱.
    private func frameLight(_ pixels: CVPixelBuffer, mode: String, nx: Double, ny: Double) -> (adjust: Double, ratio: Double) {
        CVPixelBufferLockBaseAddress(pixels, .readOnly)
        defer { CVPixelBufferUnlockBaseAddress(pixels, .readOnly) }
        guard let base = CVPixelBufferGetBaseAddress(pixels)?.assumingMemoryBound(to: UInt8.self) else { return (0, 1) }
        let w = CVPixelBufferGetWidth(pixels), h = CVPixelBufferGetHeight(pixels), row = CVPixelBufferGetBytesPerRow(pixels)
        guard w > 2, h > 2 else { return (0, 1) }
        let bw = Double(w), bh = Double(h), viewAspect = 1.5, bufAspect = bw / bh
        let vx, vy, vw, vh: Double
        if bufAspect > viewAspect {
            vh = bh; vw = bh * viewAspect; vx = (bw - vw) / 2; vy = 0
        } else {
            vw = bw; vh = bw / viewAspect; vx = 0; vy = (bh - vh) / 2
        }
        func lin(_ c: UInt8) -> Double { let v = Double(c) / 255; return v <= 0.04045 ? v / 12.92 : pow((v + 0.055) / 1.055, 2.4) }
        func at(_ x: Int, _ y: Int) -> Double {
            let p = base + min(max(y, 0), h - 1) * row + min(max(x, 0), w - 1) * 4
            return 0.0722 * lin(p[0]) + 0.7152 * lin(p[1]) + 0.2126 * lin(p[2])
        }
        let cols = 36, rows = 24
        let sx = vx + min(max(nx, 0), 1) * vw, sy = vy + min(max(ny, 0), 1) * vh
        let rad = max(vw, vh) * 0.06, rad2 = rad * rad
        var sum = 0.0, n = 0.0, cw = 0.0, cwN = 0.0, sp = 0.0, spN = 0.0
        for j in 0..<rows {
            for i in 0..<cols {
                let x = vx + (Double(i) + 0.5) / Double(cols) * vw
                let y = vy + (Double(j) + 0.5) / Double(rows) * vh
                let l = at(Int(x), Int(y))
                sum += l; n += 1
                let dx = (Double(i) + 0.5) / Double(cols) - 0.5, dy = (Double(j) + 0.5) / Double(rows) - 0.5
                let wgt = 0.15 + exp(-((dx / 0.23) * (dx / 0.23) + (dy / 0.27) * (dy / 0.27)))
                cw += l * wgt; cwN += wgt
                let ddx = x - sx, ddy = y - sy
                if ddx * ddx + ddy * ddy <= rad2 { sp += l; spN += 1 }
            }
        }
        let avg = max(1e-4, sum / max(n, 1)), cen = max(1e-4, cw / max(cwN, 1))
        let spot = spN > 0 ? max(1e-4, sp / spN) : cen
        let use = mode == "spot" ? spot : mode == "avg" ? avg : cen
        let adjust = log2(use / 0.18)
        return (adjust.isFinite ? adjust : 0, max(1e-4, avg / cen))
    }

    private func setZoom(_ rel: CGFloat) {
        sessionQueue.async { [weak self] in
            guard let self, let d = self.device, (try? d.lockForConfiguration()) != nil else { return }
            d.videoZoomFactor = min(max(rel * self.zoomBase, d.minAvailableVideoZoomFactor), d.maxAvailableVideoZoomFactor)
            d.unlockForConfiguration()
        }
    }

    /// 스팟: 그 지점에 노출을 맞추게 한다. 중앙·평균: 가운데
    private func setMeteringPoint(x: Double, y: Double) {
        sessionQueue.async { [weak self] in
            guard let self, let host = self.host, let d = self.device, d.isExposurePointOfInterestSupported else { return }
            let size = host.preview.bounds.size
            guard size.width > 1, size.height > 1, (try? d.lockForConfiguration()) != nil else { return }
            let point = host.preview.captureDevicePointConverted(fromLayerPoint: CGPoint(x: x * size.width, y: y * size.height))
            d.exposurePointOfInterest = point
            if d.isExposureModeSupported(.continuousAutoExposure) { d.exposureMode = .continuousAutoExposure }
            d.unlockForConfiguration()
        }
    }
}

/// 메시지 핸들러가 브리지를 붙잡아 두지 않게
private final class WeakHandler: NSObject, WKScriptMessageHandler {
    weak var target: WKScriptMessageHandler?
    init(_ target: WKScriptMessageHandler) { self.target = target }
    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        target?.userContentController(controller, didReceive: message)
    }
}
#endif
