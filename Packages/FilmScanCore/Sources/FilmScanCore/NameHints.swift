import Foundation

/// 가져올 파일·zip·폴더 이름에서 촬영일과 필름을 짐작한다.
/// 예: "2026.11.20 Portra 400.zip", "20261120_hp5.zip", "261120 골드200"
/// 웹·갤럭시의 nameHints.ts와 같은 규칙.
public enum NameHints {
    public struct Hints: Sendable, Equatable {
        public var date: DateComponents?
        public var filmID: String?
    }

    public static func parse(_ names: [String]) -> Hints {
        var hints = Hints()
        for name in names {
            let base = (name as NSString).deletingPathExtension
            if hints.date == nil { hints.date = date(in: base) }
            if hints.filmID == nil { hints.filmID = FilmStockCatalog.match(in: base)?.id }
        }
        return hints
    }

    /// 이름 속 날짜 (년·월·일). 없거나 말이 안 되는 날짜면 nil
    public static func date(in text: String, now: Date = Date()) -> DateComponents? {
        let thisYear = Calendar(identifier: .gregorian).component(.year, from: now)
        let chars = Array(text)
        // 숫자 덩어리와 그 사이 구분자를 나눈다
        var runs: [(value: String, start: Int, end: Int)] = []
        var i = 0
        while i < chars.count {
            if chars[i].isASCII, chars[i].isNumber {
                var j = i
                while j < chars.count, chars[j].isASCII, chars[j].isNumber { j += 1 }
                runs.append((String(chars[i..<j]), i, j))
                i = j
            } else { i += 1 }
        }
        func valid(_ y: Int, _ m: Int, _ d: Int) -> DateComponents? {
            guard (1950...thisYear + 1).contains(y), (1...12).contains(m), (1...31).contains(d) else { return nil }
            var c = DateComponents(year: y, month: m, day: d)
            c.calendar = Calendar(identifier: .gregorian)
            guard c.isValidDate else { return nil }
            return DateComponents(year: y, month: m, day: d)
        }
        func fullYear(_ yy: Int) -> Int { yy + (yy <= thisYear % 100 + 1 ? 2000 : 1900) }
        let seps: Set<Character> = [".", "-", "_", " ", "/", "년", "월"]
        func sepBetween(_ a: Int, _ b: Int) -> Bool {
            let gap = chars[a..<b]
            return !gap.isEmpty && gap.count <= 2 && gap.allSatisfy { seps.contains($0) }
        }

        // 1) 나눠 쓴 날짜: 2026.11.20 / 26-11-20 / 2026년 11월 20일
        if runs.count >= 3 {
            for k in 0...(runs.count - 3) {
                let a = runs[k], b = runs[k + 1], c = runs[k + 2]
                guard sepBetween(a.end, b.start), sepBetween(b.end, c.start),
                      (1...2).contains(b.value.count), (1...2).contains(c.value.count),
                      let y = Int(a.value), let m = Int(b.value), let d = Int(c.value) else { continue }
                let year = a.value.count == 4 ? y : a.value.count == 2 ? fullYear(y) : -1
                if let r = valid(year, m, d) { return r }
            }
        }
        // 2) 붙여 쓴 날짜: 20261120 / 261120
        for r in runs {
            let v = Array(r.value)
            if v.count == 8, let y = Int(String(v[0..<4])), let m = Int(String(v[4..<6])), let d = Int(String(v[6..<8])),
               let out = valid(y, m, d) { return out }
            if v.count == 6, let y = Int(String(v[0..<2])), let m = Int(String(v[2..<4])), let d = Int(String(v[4..<6])),
               let out = valid(fullYear(y), m, d) { return out }
        }
        return nil
    }
}
