#if os(iOS)
import SwiftUI
import FilmScanCore

// 노출계 (네이티브). 디자인 원본은 웹 시안 prototypes/meter/index.html — 같은 규칙·같은 배치로 옮긴다.

/// 렌즈 정보 (장비 탭 렌즈에서 만든다)
struct MeterLens: Hashable, Identifiable {
    var id: String
    var name: String
    var min: Int
    var max: Int
    var open: Double
    var close: Double
    /// 렌즈 고정형 카메라 (바꿀 수 없음)
    var fixed = false
    var isZoom: Bool { max > min }
    var rangeText: String { isZoom ? "\(min)–\(max)mm" : "\(min)mm" }

    static let generic = MeterLens(id: "generic", name: "줌 렌즈", min: 24, max: 105, open: 1.4, close: 22)
}

/// 노출계를 여는 쪽(촬영 중 카드·시험 화면)이 넘기는 정보
struct MeterGear {
    var cameraName: String
    /// P 자동 · A 조리개 우선 · S 셔터 우선 · M 수동 중 이 카메라에 있는 것
    var modes: [String] = ["P", "A", "S", "M"]
    /// 가장 빠른 셔터 1/x
    var fastest: Double = 4000
    /// 가장 느린 셔터 (초)
    var slowest: Double = 8
    /// P 모드에서 조리개 링을 최소 조리개에 두는 기종 (미놀타 X-700 등)
    var programAtMinAperture = false
    var lens: MeterLens = .generic
    /// 바꿔 낄 수 있는 렌즈 (장비 탭, 같은 마운트)
    var lenses: [MeterLens] = []
    /// nil이면 노출계만 (필름·기록 없음)
    var film: FilmStock?
    var frames = 36
    var prewind = false
    /// 증감(푸시) 촬영 감도. 없으면 필름 감도
    var iso: Double?
    var meterOnly: Bool { film == nil }
}

enum MeterMath {
    static let allShutters: [Double] = [1.0 / 8000, 1.0 / 4000, 1.0 / 2000, 1.0 / 1000, 1.0 / 500, 1.0 / 250, 1.0 / 125, 1.0 / 60,
                                        1.0 / 30, 1.0 / 15, 1.0 / 8, 1.0 / 4, 1.0 / 2, 1, 2, 4, 8, 15, 30]
    static let isoList: [Double] = [25, 32, 40, 50, 64, 80, 100, 125, 160, 200, 250, 320, 400, 500, 640, 800, 1000, 1250, 1600, 2000, 2500, 3200, 4000, 5000, 6400]
    static let comps: [Double] = (-6...6).map { Double($0) / 3 }

    static func shutters(fastest: Double, slowest: Double) -> [Double] {
        allShutters.filter { $0 >= 1 / fastest - 1e-9 && $0 <= slowest + 1e-9 }
    }

    /// 렌즈 최대 개방값(3.5 같은)도 넣는다
    static func apertures(open: Double, close: Double) -> [Double] {
        var list = [1.4, 2, 2.8, 4, 5.6, 8, 11, 16, 22].filter { $0 >= open - 0.01 && $0 <= close + 0.01 }
        if list.isEmpty || list[0] - open > 0.05 { list.insert((open * 10).rounded() / 10, at: 0) }
        return list
    }

    static func nearest(_ list: [Double], _ v: Double) -> Int {
        guard !list.isEmpty, v > 0 else { return 0 }
        var best = 0
        for i in list.indices where abs(log2(list[i] / v)) < abs(log2(list[best] / v)) { best = i }
        return best
    }

    static func fmtA(_ n: Double) -> String { "f/" + trim(n) }
    static func fmtS(_ t: Double) -> String { t >= 1 ? "\(trim(t))\"" : "1/\(Int((1 / t).rounded()))" }
    static func lcdS(_ t: Double) -> String { t >= 1 ? "\(trim(t))\"" : "\(Int((1 / t).rounded()))" }
    static func fmtC(_ c: Double) -> String {
        let k = Int((c * 3).rounded())
        if k == 0 { return "0" }
        let w = abs(k) / 3, r = abs(k) % 3
        return (k > 0 ? "+" : "−") + (w > 0 ? "\(w)" : "") + (r == 1 ? "⅓" : r == 2 ? "⅔" : "")
    }
    static func trim(_ v: Double) -> String {
        v == v.rounded() ? String(Int(v)) : String(format: "%.1f", v)
    }

    /// 필터가 줄이는 빛 (스톱)
    static let filters: [(id: String, stops: Double)] = [
        ("UV", 0), ("노랑", 1), ("주황", 2), ("빨강", 3), ("녹색", 2), ("편광", 1.5), ("ND2", 1), ("ND4", 2), ("ND8", 3),
        ("ND16", 4), ("ND64", 6), ("ND1000", 10), ("80A 블루", 2), ("85B 앰버", 0.67),
    ]
    static func filterStops(_ ids: [String]) -> Double { ids.reduce(0) { n, id in n + (filters.first { $0.id == id }?.stops ?? 0) } }
}

extension Color {
    /// "#RRGGBB"
    init(meterHex hex: String) {
        let v = UInt64(hex.replacingOccurrences(of: "#", with: ""), radix: 16) ?? 0
        self.init(red: Double((v >> 16) & 255) / 255, green: Double((v >> 8) & 255) / 255, blue: Double(v & 255) / 255)
    }
    static let meterOrange = Color(red: 1, green: 107 / 255, blue: 31 / 255)
    static let meterPanel = Color(red: 22 / 255, green: 22 / 255, blue: 24 / 255)
    static let meterLine = Color(red: 42 / 255, green: 42 / 255, blue: 46 / 255)
    static let meterSub = Color(red: 141 / 255, green: 138 / 255, blue: 133 / 255)
    static let meterLED = Color(red: 157 / 255, green: 1, blue: 168 / 255)
    static let meterOK = Color(red: 76 / 255, green: 217 / 255, blue: 100 / 255)
    static let meterOver = Color(red: 1, green: 179 / 255, blue: 64 / 255)
    static let meterUnder = Color(red: 100 / 255, green: 181 / 255, blue: 1)
}

func meterLuminance(_ hex: String) -> Double {
    let v = UInt64(hex.replacingOccurrences(of: "#", with: ""), radix: 16) ?? 0
    return (0.299 * Double((v >> 16) & 255) + 0.587 * Double((v >> 8) & 255) + 0.114 * Double(v & 255)) / 255
}
#endif
