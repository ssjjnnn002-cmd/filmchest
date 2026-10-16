import Foundation

public enum FilmProcess: String, Codable, Sendable {
    case c41 = "C-41"
    case e6 = "E-6"
    case bw = "B&W"
    case ecn2 = "ECN-2"
}

/// 필름 통 일러스트 색상. 실제 패키지 색감을 참고한 근사값이며 사용자가 바꿀 수 있다.
public struct CanisterStyle: Codable, Hashable, Sendable {
    public var body: String      // 라벨 바탕색 (hex)
    public var band: String      // 라벨 띠 색
    public var text: String      // 이름 글자색
    public var bandText: String  // 띠 위 글자색
    public var cap: String       // 위아래 뚜껑 색

    public init(body: String, band: String, text: String, bandText: String, cap: String = "#2B2B2B") {
        self.body = body; self.band = band; self.text = text; self.bandText = bandText; self.cap = cap
    }
}

public struct FilmStock: Identifiable, Codable, Hashable, Sendable {
    public var id: String
    public var brand: String
    public var name: String
    public var iso: Int
    public var process: FilmProcess
    public var formats: [FilmFormat]
    public var style: CanisterStyle

    public init(id: String, brand: String, name: String, iso: Int, process: FilmProcess,
                formats: [FilmFormat] = [.f135, .f120_66], style: CanisterStyle) {
        self.id = id; self.brand = brand; self.name = name; self.iso = iso
        self.process = process; self.formats = formats; self.style = style
    }

    public var displayName: String { brand.isEmpty ? name : "\(brand) \(name)" }
    /// 필름 가장자리 인쇄 문구 (밀착 인화용)
    public var edgeMarking: String { displayName.uppercased() }
    /// 사용자가 직접 만든 필름인지
    public var isCustom: Bool { id.hasPrefix("custom-") }
}

public enum FilmStockCatalog {
    private static func s(_ body: String, _ band: String, _ text: String, _ bandText: String, cap: String = "#2B2B2B") -> CanisterStyle {
        CanisterStyle(body: body, band: band, text: text, bandText: bandText, cap: cap)
    }

    public static let all: [FilmStock] = [
        // Kodak
        FilmStock(id: "kodak-portra-160", brand: "Kodak", name: "Portra 160", iso: 160, process: .c41,
                  style: s("#F4EFE4", "#E39B2D", "#3A2E22", "#FFFFFF")),
        FilmStock(id: "kodak-portra-400", brand: "Kodak", name: "Portra 400", iso: 400, process: .c41,
                  style: s("#F4EFE4", "#F2A71B", "#3A2E22", "#FFFFFF")),
        FilmStock(id: "kodak-portra-800", brand: "Kodak", name: "Portra 800", iso: 800, process: .c41,
                  style: s("#F4EFE4", "#D9771E", "#3A2E22", "#FFFFFF")),
        FilmStock(id: "kodak-ektar-100", brand: "Kodak", name: "Ektar 100", iso: 100, process: .c41,
                  style: s("#FFC20E", "#E2231A", "#1A1A1A", "#FFFFFF")),
        FilmStock(id: "kodak-gold-200", brand: "Kodak", name: "Gold 200", iso: 200, process: .c41,
                  formats: [.f135, .f120_66],
                  style: s("#FDB913", "#C8102E", "#1A1A1A", "#FFFFFF")),
        FilmStock(id: "kodak-ultramax-400", brand: "Kodak", name: "UltraMax 400", iso: 400, process: .c41,
                  formats: [.f135],
                  style: s("#FDB913", "#1F4E9C", "#1A1A1A", "#FFFFFF")),
        FilmStock(id: "kodak-colorplus-200", brand: "Kodak", name: "ColorPlus 200", iso: 200, process: .c41,
                  formats: [.f135],
                  style: s("#FDB913", "#5B3A8C", "#1A1A1A", "#FFFFFF")),
        FilmStock(id: "kodak-ektachrome-e100", brand: "Kodak", name: "Ektachrome E100", iso: 100, process: .e6,
                  style: s("#1B1B1B", "#FDB913", "#FFFFFF", "#1B1B1B")),
        FilmStock(id: "kodak-trix-400", brand: "Kodak", name: "Tri-X 400", iso: 400, process: .bw,
                  style: s("#FDB913", "#1B1B1B", "#1B1B1B", "#FDB913")),
        FilmStock(id: "kodak-tmax-100", brand: "Kodak", name: "T-Max 100", iso: 100, process: .bw,
                  style: s("#FDB913", "#2E5AA8", "#1B1B1B", "#FFFFFF")),
        FilmStock(id: "kodak-tmax-400", brand: "Kodak", name: "T-Max 400", iso: 400, process: .bw,
                  style: s("#FDB913", "#C8102E", "#1B1B1B", "#FFFFFF")),
        FilmStock(id: "kodak-vision3-250d", brand: "Kodak", name: "Vision3 250D", iso: 250, process: .ecn2,
                  formats: [.f135],
                  style: s("#2A2A2A", "#E8B02E", "#F2F2F2", "#1B1B1B")),
        FilmStock(id: "kodak-vision3-500t", brand: "Kodak", name: "Vision3 500T", iso: 500, process: .ecn2,
                  formats: [.f135],
                  style: s("#2A2A2A", "#3C7DD9", "#F2F2F2", "#FFFFFF")),

        // Fujifilm
        FilmStock(id: "fuji-200", brand: "Fujifilm", name: "200", iso: 200, process: .c41,
                  formats: [.f135],
                  style: s("#F5F5F2", "#00A15F", "#1B1B1B", "#FFFFFF")),
        FilmStock(id: "fuji-400", brand: "Fujifilm", name: "400", iso: 400, process: .c41,
                  formats: [.f135],
                  style: s("#F5F5F2", "#2B6CB0", "#1B1B1B", "#FFFFFF")),
        FilmStock(id: "fuji-superia-xtra-400", brand: "Fujifilm", name: "Superia X-TRA 400", iso: 400, process: .c41,
                  formats: [.f135],
                  style: s("#0C8A4B", "#E2231A", "#FFFFFF", "#FFFFFF")),
        FilmStock(id: "fuji-c200", brand: "Fujifilm", name: "Fujicolor C200", iso: 200, process: .c41,
                  formats: [.f135],
                  style: s("#00A15F", "#F5F5F2", "#FFFFFF", "#00A15F")),
        FilmStock(id: "fuji-pro-400h", brand: "Fujifilm", name: "Pro 400H", iso: 400, process: .c41,
                  style: s("#EDEDED", "#6CB33F", "#1B1B1B", "#FFFFFF")),
        FilmStock(id: "fuji-velvia-50", brand: "Fujifilm", name: "Velvia 50", iso: 50, process: .e6,
                  style: s("#5A2D82", "#E2231A", "#FFFFFF", "#FFFFFF")),
        FilmStock(id: "fuji-velvia-100", brand: "Fujifilm", name: "Velvia 100", iso: 100, process: .e6,
                  style: s("#7A2A82", "#F5F5F2", "#FFFFFF", "#7A2A82")),
        FilmStock(id: "fuji-provia-100f", brand: "Fujifilm", name: "Provia 100F", iso: 100, process: .e6,
                  style: s("#1E4FA0", "#F5F5F2", "#FFFFFF", "#1E4FA0")),
        FilmStock(id: "fuji-acros-100-ii", brand: "Fujifilm", name: "Acros II 100", iso: 100, process: .bw,
                  style: s("#1B1B1B", "#9A9A9A", "#FFFFFF", "#1B1B1B")),

        // Ilford / Kentmere / Harman
        FilmStock(id: "ilford-hp5-plus", brand: "Ilford", name: "HP5 Plus", iso: 400, process: .bw,
                  style: s("#1B1B1B", "#F5F5F2", "#F5F5F2", "#1B1B1B", cap: "#111111")),
        FilmStock(id: "ilford-fp4-plus", brand: "Ilford", name: "FP4 Plus", iso: 125, process: .bw,
                  style: s("#1B1B1B", "#2F6DB5", "#F5F5F2", "#FFFFFF", cap: "#111111")),
        FilmStock(id: "ilford-delta-100", brand: "Ilford", name: "Delta 100", iso: 100, process: .bw,
                  style: s("#F5F5F2", "#1B1B1B", "#1B1B1B", "#F5F5F2")),
        FilmStock(id: "ilford-delta-400", brand: "Ilford", name: "Delta 400", iso: 400, process: .bw,
                  style: s("#F5F5F2", "#E2231A", "#1B1B1B", "#FFFFFF")),
        FilmStock(id: "ilford-delta-3200", brand: "Ilford", name: "Delta 3200", iso: 3200, process: .bw,
                  style: s("#F5F5F2", "#5A2D82", "#1B1B1B", "#FFFFFF")),
        FilmStock(id: "ilford-panf-plus-50", brand: "Ilford", name: "Pan F Plus 50", iso: 50, process: .bw,
                  style: s("#1B1B1B", "#E85D9C", "#F5F5F2", "#FFFFFF", cap: "#111111")),
        FilmStock(id: "ilford-xp2-super", brand: "Ilford", name: "XP2 Super", iso: 400, process: .c41,
                  style: s("#1B1B1B", "#F28C28", "#F5F5F2", "#1B1B1B", cap: "#111111")),
        FilmStock(id: "kentmere-pan-400", brand: "Kentmere", name: "Pan 400", iso: 400, process: .bw,
                  formats: [.f135],
                  style: s("#F5F5F2", "#E87722", "#1B1B1B", "#FFFFFF")),
        FilmStock(id: "harman-phoenix-200", brand: "Harman", name: "Phoenix 200", iso: 200, process: .c41,
                  formats: [.f135, .f120_66],
                  style: s("#F15A22", "#1B1B1B", "#FFFFFF", "#F15A22")),

        // CineStill / Lomography / Foma
        FilmStock(id: "cinestill-800t", brand: "CineStill", name: "800T", iso: 800, process: .c41,
                  style: s("#1B1B1B", "#D7262E", "#FFFFFF", "#FFFFFF", cap: "#111111")),
        FilmStock(id: "cinestill-400d", brand: "CineStill", name: "400D", iso: 400, process: .c41,
                  style: s("#1B1B1B", "#F2A71B", "#FFFFFF", "#1B1B1B", cap: "#111111")),
        FilmStock(id: "cinestill-50d", brand: "CineStill", name: "50D", iso: 50, process: .c41,
                  style: s("#1B1B1B", "#3C9DD9", "#FFFFFF", "#FFFFFF", cap: "#111111")),
        FilmStock(id: "lomo-cn-100", brand: "Lomography", name: "Color Negative 100", iso: 100, process: .c41,
                  style: s("#F5F5F2", "#F4C430", "#1B1B1B", "#1B1B1B")),
        FilmStock(id: "lomo-cn-400", brand: "Lomography", name: "Color Negative 400", iso: 400, process: .c41,
                  style: s("#F5F5F2", "#E2231A", "#1B1B1B", "#FFFFFF")),
        FilmStock(id: "lomo-cn-800", brand: "Lomography", name: "Color Negative 800", iso: 800, process: .c41,
                  style: s("#F5F5F2", "#1F4E9C", "#1B1B1B", "#FFFFFF")),
        FilmStock(id: "lomo-lomochrome-purple", brand: "Lomography", name: "LomoChrome Purple", iso: 400, process: .c41,
                  style: s("#6B2C91", "#E85D9C", "#FFFFFF", "#FFFFFF")),
        FilmStock(id: "foma-fomapan-100", brand: "Foma", name: "Fomapan 100", iso: 100, process: .bw,
                  style: s("#F5F5F2", "#2E8B57", "#1B1B1B", "#FFFFFF")),
        FilmStock(id: "foma-fomapan-400", brand: "Foma", name: "Fomapan 400", iso: 400, process: .bw,
                  style: s("#F5F5F2", "#C8102E", "#1B1B1B", "#FFFFFF")),
    ]

    // MARK: 직접 만든 필름 (목록에 없는 필름). 앱이 저장소에서 읽어 채운다.

    private static let customLock = NSLock()
    nonisolated(unsafe) private static var customStorage: [FilmStock] = []

    public static var custom: [FilmStock] {
        get { customLock.lock(); defer { customLock.unlock() }; return customStorage }
        set { customLock.lock(); customStorage = newValue; customLock.unlock() }
    }

    /// 직접 만든 필름 + 기본 목록
    public static var allIncludingCustom: [FilmStock] { custom + all }

    public static func stock(id: String) -> FilmStock? {
        custom.first { $0.id == id } ?? all.first { $0.id == id }
    }

    /// 색 하나로 필름통 색 조합을 만든다 (글자는 바탕에 맞춰 검정/흰색). 웹앱 customStock과 같은 규칙.
    public static func customStock(id: String, name: String, iso: Int, colorHex: String, blackAndWhite: Bool) -> FilmStock {
        func rgb(_ hex: String) -> (Double, Double, Double) {
            let v = Int(hex.trimmingCharacters(in: CharacterSet(charactersIn: "#")), radix: 16) ?? 0xFDB913
            return (Double((v >> 16) & 255) / 255, Double((v >> 8) & 255) / 255, Double(v & 255) / 255)
        }
        func lum(_ hex: String) -> Double { let c = rgb(hex); return 0.299 * c.0 + 0.587 * c.1 + 0.114 * c.2 }
        func shade(_ hex: String, _ amt: Double) -> String {
            let c = rgb(hex)
            let f = { (x: Double) in Int((max(0, min(1, x + amt)) * 255).rounded()) }
            return String(format: "#%02X%02X%02X", f(c.0), f(c.1), f(c.2))
        }
        let light = lum(colorHex) > 0.55
        let band = shade(colorHex, light ? -0.28 : 0.22)
        return FilmStock(id: id, brand: "", name: name, iso: iso, process: blackAndWhite ? .bw : .c41,
                         style: CanisterStyle(body: colorHex, band: band, text: light ? "#1B1B1B" : "#F5F5F2",
                                              bandText: lum(band) > 0.55 ? "#1B1B1B" : "#FFFFFF"))
    }

    /// 폴더명·파일명에 필름 이름이 있으면 그 필름. 여럿이면 숫자가 맞는 쪽, 그래도 겹치면 비운다.
    public static func match(in text: String) -> FilmStock? {
        let hay = normalize(text)
        guard !hay.isEmpty else { return nil }
        let generic: Set<String> = ["plus", "super", "ii", "color", "negative", "pan"]
        var hits: [(FilmStock, Int)] = []
        for film in all {
            let name = normalize(film.name)
            let tokens = name.split(separator: " ").map(String.init)
            let compactName = name.replacingOccurrences(of: " ", with: "")
            let compactHay = hay.replacingOccurrences(of: " ", with: "")
            if compactName.count >= 4, compactHay.contains(compactName) {
                hits.append((film, 100 + compactName.count))
                continue
            }
            let words = tokens.filter { $0.count >= 2 && Int($0) == nil && !generic.contains($0) }
            let nums = tokens.filter { Int($0) != nil }
            guard !words.isEmpty, words.allSatisfy({ hay.contains($0) }) else { continue }
            let numsOK = !nums.isEmpty && nums.allSatisfy { hay.split(separator: " ").contains(Substring($0)) }
            if !nums.isEmpty && !numsOK && words.count < 2 { continue }
            let score = name.count + (hay.contains(normalize(film.brand)) ? 8 : 0) + (numsOK ? 20 : 0)
            hits.append((film, score))
        }
        let ranked = hits.sorted { $0.1 > $1.1 }
        guard let top = ranked.first else { return nil }
        if ranked.count > 1, ranked[1].1 == top.1 { return nil }
        return top.0
    }

    private static func normalize(_ text: String) -> String {
        var out = ""
        for ch in text.lowercased() {
            if ch.isNumber { if !out.hasSuffix(" ") { out.append(" ") }; out.append(ch); continue }
            if ch.isLetter { out.append(ch) } else if !out.hasSuffix(" ") { out.append(" ") }
        }
        return out.split(separator: " ").joined(separator: " ")
    }
}
