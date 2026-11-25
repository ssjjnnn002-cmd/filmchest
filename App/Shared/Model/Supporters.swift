// 자동 생성: web/src/core/supporters.ts (node scripts/sync-galaxy-core.mjs). 여기서 고치지 말 것.
import Foundation

/// 함께 만든 분들 (텀블벅 후원자). 비어 있으면 설정에 줄이 보이지 않는다
enum Supporters {
    static let list: [String] = []

    /// 화면에 올릴 이름 (앞뒤 공백 정리, 빈 이름·중복 제외, 넣은 순서 그대로)
    static var names: [String] {
        var seen = Set<String>()
        return list.compactMap { raw in
            let name = raw.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !name.isEmpty, seen.insert(name).inserted else { return nil }
            return name
        }
    }
}
