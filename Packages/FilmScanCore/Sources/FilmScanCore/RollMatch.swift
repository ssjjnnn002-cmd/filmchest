import Foundation

/// 가져올 파일 이름과 맞을 것 같은 롤 고르기. 자동으로 정하지 않고 '추천'으로 맨 위에 보여 준다.
/// 웹·갤럭시 core/rollMatch.ts와 같은 규칙.
public enum RollMatch {
    public struct Facts: Sendable {
        public var id: UUID
        public var filmID: String?
        public var model: String?
        public var places: [String]
        public var lab: String?
        /// 처음 찍은 때 ~ 마지막 기록(촬영 끝·맡긴 날)
        public var from: Date
        public var to: Date
        public init(id: UUID, filmID: String?, model: String?, places: [String], lab: String?, from: Date, to: Date) {
            self.id = id; self.filmID = filmID; self.model = model; self.places = places; self.lab = lab; self.from = from; self.to = to
        }
    }

    private static func keep(_ c: Character) -> Bool {
        guard let v = c.unicodeScalars.first?.value else { return false }
        return (97...122).contains(v) || (48...57).contains(v) || (0xAC00...0xD7A3).contains(v)
    }
    private static func squash(_ s: String) -> String { String(s.precomposedStringWithCanonicalMapping.lowercased().filter(keep)) }

    /// names에는 한글을 영어로 바꾼 이름도 함께 넣는다
    public static func score(names: [String], filmID: String?, date: Date?, roll r: Facts) -> Int {
        let text = names.joined(separator: " ").precomposedStringWithCanonicalMapping.lowercased()
        let whole = squash(text)
        let tokens = Set(text.split(whereSeparator: { !keep($0) }).map(String.init))
        var score = 0
        // 이름에 적힌 필름이 다른 롤은 추천하지 않는다
        if let filmID, let own = r.filmID, own != filmID { return 0 }
        if let filmID, r.filmID == filmID { score += 3 }
        if let model = r.model.map(squash), model.count >= 2 {
            // 짧은 이름(XA·F2·M6)은 낱말이 똑같을 때만
            if model.count >= 4 ? whole.contains(model) : tokens.contains(model) { score += 4 }
        }
        if r.places.contains(where: { let p = squash($0); return p.count >= 2 && whole.contains(p) }) { score += 2 }
        if let lab = r.lab.map(squash), lab.count >= 2, whole.contains(lab) { score += 1 }
        // 이름 속 날짜는 찍은 날이거나 현상·스캔한 날 (맡긴 뒤 한 달 반까지)
        if let date, date >= r.from.addingTimeInterval(-86400), date <= r.to.addingTimeInterval(45 * 86400) { score += 2 }
        return score
    }

    /// 점수가 가장 높은 롤 (3점 이상, 같은 점수는 셋까지). 더 많으면 알 수 없는 것이라 추천하지 않는다
    public static func suggest(names: [String], filmID: String?, date: Date?, rolls: [Facts]) -> [UUID] {
        let scored = rolls.map { ($0.id, score(names: names, filmID: filmID, date: date, roll: $0)) }
        guard let best = scored.map(\.1).max(), best >= 3 else { return [] }
        let top = scored.filter { $0.1 == best }.map(\.0)
        return top.count > 3 ? [] : top
    }
}
