#if os(iOS)
import SwiftUI
import SwiftData
import FilmScanCore

extension MeterLens {
    /// 장비 탭 렌즈 → 노출계 렌즈 (화각이 비어 있으면 50mm, 조리개가 비어 있으면 f/1.4–22)
    init(_ l: LensItem) {
        let lo = l.focalMin > 0 ? l.focalMin : 50
        let hi = l.zoomLens && l.focalMax > lo ? l.focalMax : lo
        self.init(id: l.id.uuidString, name: l.displayName, min: lo, max: hi,
                  open: Self.firstNumber(l.apertureOpen) ?? 1.4, close: Self.firstNumber(l.apertureClose) ?? 22)
    }

    /// 렌즈 고정형 카메라: 이름(예: "Zuiko 42mm f/2.8")에서 화각·조리개를 읽는다
    static func fixed(name: String) -> MeterLens {
        let mm = name.range(of: #"(\d+)\s*mm"#, options: .regularExpression).flatMap { Int(name[$0].filter(\.isNumber)) } ?? 35
        let f = name.range(of: #"[fF]\s*/?\s*(\d+(\.\d+)?)"#, options: .regularExpression)
            .flatMap { firstNumber(String(name[$0])) } ?? 2.8
        return MeterLens(id: "fixed", name: name, min: mm, max: mm, open: f, close: 22, fixed: true)
    }

    static func firstNumber(_ s: String) -> Double? {
        guard let r = s.range(of: #"\d+(\.\d+)?"#, options: .regularExpression) else { return nil }
        return Double(s[r])
    }
}

extension MeterGear {
    /// 촬영 중인 롤 → 노출계 장비 (등록된 카메라·렌즈·필름·감기 방식으로 바로 시작)
    static func from(roll: RollItem, lenses: [LensItem]) -> MeterGear {
        let camera = roll.camera
        let lens: MeterLens = {
            if let fixed = camera?.fixedLensName, !fixed.isEmpty { return .fixed(name: fixed) }
            let frame = roll.meterShots.count + 1
            if let id = roll.lensID(at: frame), let l = lenses.first(where: { $0.id == id }) { return MeterLens(l) }
            if let l = roll.lens { return MeterLens(l) }
            return .generic
        }()
        let mount = camera?.mount ?? roll.lens?.mount
        let swappable = lens.fixed ? [] : lenses.filter { !$0.mount.isEmpty && $0.mount == mount }.map(MeterLens.init)
        var gear = MeterGear(cameraName: roll.cameraName, lens: lens, lenses: swappable, film: roll.film, prewind: camera?.prewind)
        gear.iso = roll.shotISO.map(Double.init)
        return gear
    }
}

/// 촬영 중 화면에서 여는 노출계 (상세 기록). 기록은 롤에 바로 저장한다
struct RollMeterView: View {
    let roll: RollItem
    var onEnd: () -> Void
    @Environment(\.dismiss) private var dismiss
    @Query private var lenses: [LensItem]

    var body: some View {
        NativeMeterView(gear: .from(roll: roll, lenses: lenses), shots: roll.meterShots, rollPrewind: roll.meterPrewind, session: roll.id.uuidString,
                        onSave: { shots, prewind in
                            roll.meterShots = shots; roll.meterPrewind = prewind
                            // 이 카메라의 감기 방식은 처음 한 번 정하면 기억한다
                            if let cam = roll.camera, cam.prewind == nil { cam.prewind = prewind }
                        },
                        onClose: { dismiss() },
                        onEnd: { onEnd() })
    }
}
#endif
