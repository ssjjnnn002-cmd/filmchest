import Foundation
import FilmScanCore

extension NameHints {
    /// 파일·zip·폴더 이름에서 날짜·필름 짐작. 한글 필름 이름(포트라·골드)도 영어로 바꿔 한 번 더 본다
    static func guess(_ names: [String]) -> Hints {
        parse(names.flatMap { [$0, SearchAlias.latin($0)] })
    }
}

extension DateComponents {
    /// 이름에서 읽은 날짜 → 그날 정오 (시간대가 달라도 날짜가 안 밀리게)
    var noonDate: Date? {
        var c = self
        c.hour = 12
        return Calendar.current.date(from: c)
    }
}
