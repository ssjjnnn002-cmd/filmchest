import Foundation
import Testing
@testable import FilmScanCore

@Suite struct RollMatchTests {
    let a = UUID(), b = UUID()
    func day(_ d: Double) -> Date { Date(timeIntervalSince1970: 1_790_000_000 + d * 86400) }
    var rolls: [RollMatch.Facts] {
        [.init(id: a, filmID: "ilford-hp5-plus", model: "X-700", places: ["망원동"], lab: nil, from: day(0), to: day(10)),
         .init(id: b, filmID: "ilford-hp5-plus", model: "XA", places: ["성수동"], lab: nil, from: day(-100), to: day(-90))]
    }
    func run(_ name: String, film: String? = nil, date: Date? = nil) -> [UUID] { RollMatch.suggest(names: [name], filmID: film, date: date, rolls: rolls) }

    @Test func cameraAndPlace() { #expect(run("MINOLTA_X-700_ILFORD HP5 PLUS_망원동.zip", film: "ilford-hp5-plus") == [a]) }
    @Test func shortModelNeedsWord() {
        #expect(run("olympus XA.zip") == [b])
        #expect(run("exact scans.zip") == [])
    }
    @Test func tiesAndDate() {
        #expect(run("hp5.zip", film: "ilford-hp5-plus") == [a, b])
        #expect(run("hp5.zip", film: "ilford-hp5-plus", date: day(20)) == [a])
        #expect(run("scan_0012.zip") == [])
        #expect(run("X-700 망원동.zip", film: "kodak-gold-200") == [])
    }
}
