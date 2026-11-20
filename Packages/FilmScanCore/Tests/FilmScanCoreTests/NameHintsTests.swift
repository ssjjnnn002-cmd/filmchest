import XCTest
@testable import FilmScanCore

final class NameHintsTests: XCTestCase {
    private let now = ISO8601DateFormatter().date(from: "2026-11-20T00:00:00Z")!
    private func ymd(_ s: String) -> [Int]? {
        NameHints.date(in: s, now: now).map { [$0.year!, $0.month!, $0.day!] }
    }

    func testDates() {
        XCTAssertEqual(ymd("2026.11.20 Portra 400"), [2026, 11, 20])
        XCTAssertEqual(ymd("20261120_hp5"), [2026, 11, 20])
        XCTAssertEqual(ymd("261120 골드200"), [2026, 11, 20])
        XCTAssertEqual(ymd("2025-3-7 roll"), [2025, 3, 7])
        XCTAssertEqual(ymd("2024년 5월 1일 제주"), [2024, 5, 1])
        XCTAssertEqual(ymd("99.12.31"), [1999, 12, 31])
        XCTAssertNil(ymd("Portra 400"))
        XCTAssertNil(ymd("000036"))
        XCTAssertNil(ymd("DSC01234"))
        XCTAssertNil(ymd("20261340"))
        XCTAssertNil(ymd("ColorPlus 200 36"))
    }

    func testFilm() {
        let h = NameHints.parse(["20261120_Kodak Portra 400.zip"])
        XCTAssertEqual(h.date?.day, 20)
        XCTAssertEqual(h.filmID.flatMap { FilmStockCatalog.stock(id: $0)?.name }, "Portra 400")
    }
}
