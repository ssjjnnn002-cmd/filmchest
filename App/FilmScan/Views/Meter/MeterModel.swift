#if os(iOS)
import SwiftUI
import FilmScanCore

/// 노출계 상태와 계산 (웹 시안 solve()와 같은 규칙)
@MainActor
final class MeterModel: ObservableObject {
    let gear: MeterGear

    // 장비에서 오는 값
    @Published var lens: MeterLens
    @Published private(set) var apertures: [Double]
    let shutters: [Double]
    @Published var iso: Double

    // 조작
    @Published var mode: String
    @Published var aIndex: Int
    @Published var sIndex: Int
    @Published var cIndex = 6
    /// spot · center · avg
    @Published var metering = "spot"
    @Published var held = false
    @Published var flash = false
    @Published var filters: [String] = []
    /// 렌즈 화각 (mm)
    @Published var focal: Double
    /// 스팟 위치 (사진 칸 안 0–1)
    @Published var spot = CGPoint(x: 0.5, y: 0.5)

    // 측정 (ISO 100 기준 EV)
    @Published var meterEV: Double = 12

    // 기록
    @Published var shots: [MeterShot]
    @Published var prewind: Bool
    @Published var ended = false

    init(gear: MeterGear, shots: [MeterShot] = [], rollPrewind: Bool? = nil) {
        self.gear = gear
        lens = gear.lens
        apertures = MeterMath.apertures(open: gear.lens.open, close: gear.lens.close)
        shutters = MeterMath.shutters(fastest: gear.fastest, slowest: gear.slowest)
        iso = gear.film.map { Double($0.iso) } ?? (UserDefaults.standard.double(forKey: "meterOnlyIso").nonZero ?? 400)
        mode = gear.modes.contains("A") ? "A" : (gear.modes.first ?? "P")
        aIndex = 0; sIndex = 0
        focal = Double(gear.lens.min)
        self.shots = shots
        prewind = rollPrewind ?? gear.prewind
        aIndex = MeterMath.nearest(apertures, 8)
        sIndex = MeterMath.nearest(shutters, 1.0 / 125)
    }

    var comp: Double { MeterMath.comps[cIndex] }
    var aperture: Double { apertures[aIndex] }
    var shutter: Double { shutters[sIndex] }
    var shotCount: Int { shots.count }
    /// P 모드에서 링을 두는 최소 조리개 (X-700 등)
    var pLock: Double? { gear.programAtMinAperture ? apertures.last : nil }

    /// 보정만큼 바뀐 감도 (보정은 감도를 바꿔 다는 것과 같다)
    var effectiveISO: Double { MeterMath.isoList[MeterMath.nearest(MeterMath.isoList, iso / pow(2, comp))] }

    var aperturePriority: Bool { mode == "A" || mode == "P" }
    var shutterPriority: Bool { mode == "S" || mode == "P" }
    var apertureAuto: Bool { mode == "S" || mode == "P" }
    var shutterAuto: Bool { mode == "A" || mode == "P" }

    struct Solved { var n: Double; var t: Double; var diff: Double }

    /// 고른 모드로 조리개·셔터를 정하고, 정노출과의 차이(+면 오버)를 낸다
    func solve() -> Solved {
        let e = meterEV + log2(effectiveISO / 100) - MeterMath.filterStops(filters)
        let nMin = apertures.first ?? 1.4, nMax = apertures.last ?? 22
        let tMin = shutters.first ?? 1.0 / 4000, tMax = shutters.last ?? 8
        var n: Double, t: Double
        switch mode {
        case "A":
            n = aperture; t = min(max(n * n / pow(2, e), tMin), tMax)
        case "S":
            t = shutter; n = min(max((t * pow(2, e)).squareRoot(), nMin), nMax)
        case "M":
            n = aperture; t = shutter
        default:
            let av = min(max(e / 2 - 1.5, log2(nMin * nMin)), log2(nMax * nMax))
            let tv = min(max(e - av, -log2(tMax)), log2(1 / tMin))
            n = pow(2, av).squareRoot(); t = pow(2, -tv)
        }
        return Solved(n: n, t: t, diff: e - log2(n * n / t))
    }

    /// 자동 쪽 링을 계산값에 맞춰 돌린다 (루프에서 부른다)
    func followAutoRings(_ s: Solved) {
        if mode == "A" || mode == "P" { let i = MeterMath.nearest(shutters, s.t); if i != sIndex { sIndex = i } }
        if mode == "S" || mode == "P" {
            let i = mode == "P" && pLock != nil ? apertures.count - 1 : MeterMath.nearest(apertures, s.n)
            if i != aIndex { aIndex = i }
        }
    }

    // 모드: 버튼을 누른 쪽이 '우선', 둘 다 누르면 자동, 둘 다 풀면 수동 (웹과 같은 규칙)
    func toggle(_ which: String) -> String? {
        var a = mode == "A" || mode == "P", s = mode == "S" || mode == "P"
        if which == "a" { a.toggle() } else { s.toggle() }
        let next = a && s ? "P" : a ? "A" : s ? "S" : "M"
        guard gear.modes.contains(next) else { return "이 카메라는 \(MeterShot.modeName(next))이 없어요" }
        mode = next
        return nil
    }

    func cycleMetering() {
        metering = metering == "spot" ? "center" : metering == "center" ? "avg" : "spot"
    }

    func setISO(_ v: Double) {
        iso = v
        UserDefaults.standard.set(v, forKey: "meterOnlyIso")
    }

    func setLens(_ l: MeterLens) {
        lens = l
        let keep = aperture
        apertures = MeterMath.apertures(open: l.open, close: l.close)
        aIndex = MeterMath.nearest(apertures, keep)
        focal = min(max(focal, Double(l.min)), Double(l.max))
    }

    // MARK: 찍기

    /// 다음에 찍힐 칸. 프리와인딩은 끝 번호부터 거꾸로
    var nextPos: Int { prewind ? max(0, gear.frames - shotCount) : shotCount + 1 }

    /// 한 컷 기록 (자동이면 값 없음, 조리개 우선은 조리개만, 셔터 우선은 셔터만, 수동은 둘 다)
    func fire() -> MeterShot {
        var pos = nextPos
        if prewind && pos == 0 {
            // 역순 추가 컷: 이번 컷이 1번, 앞서 찍은 컷들은 번호가 하나씩 올라간다
            shots = shots.map { var s = $0; s.pos += 1; return s }
            pos = 1
        }
        let iso8601 = ISO8601DateFormatter().string(from: Date())
        let shot = MeterShot(pos: pos, order: shotCount + 1, mode: mode,
                             aperture: mode == "A" || mode == "M" ? aperture : nil,
                             shutter: mode == "S" || mode == "M" ? shutter : nil,
                             comp: comp, flash: flash, ev: (meterEV * 10).rounded() / 10,
                             focal: Int(focal.rounded()), at: iso8601, filters: filters.isEmpty ? nil : filters)
        shots.append(shot)
        return shot
    }
}

private extension Double {
    var nonZero: Double? { self == 0 ? nil : self }
}
#endif
