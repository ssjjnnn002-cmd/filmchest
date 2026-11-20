import XCTest
@testable import FilmScanCore

final class RangeEditTests: XCTestCase {
    private func d(_ day: Int) -> Date { Date(timeIntervalSince1970: Double(day) * 86_400) }

    func testSetDaysMiddleRangeKeepsTail() {
        let a = ShootingDay(startedAt: d(1), startFrame: 1)
        let out = RangeEdit.setDays([a], from: 10, to: 15, date: d(5), frameCount: 36, at: { _ in self.d(1) })
        XCTAssertEqual(out.map { $0.startFrame }, [1, 10, 16])
        XCTAssertEqual(out.map { $0.startedAt }, [d(1), d(5), d(1)])
        // timeline에서도 그대로: 16번은 다시 첫날
        let roll = Roll(cameraID: UUID(), filmStockID: "x", shootingDays: out, frameCount: 36)
        let t = FrameTimeline.build(roll: roll, frameCount: 36)
        XCTAssertEqual(Calendar.current.isDate(t[11].date, inSameDayAs: d(5)), true)
        XCTAssertEqual(Calendar.current.isDate(t[20].date, inSameDayAs: d(1)), true)
    }

    func testEditExistingDayShrinks() {
        let a = ShootingDay(startedAt: d(1), startFrame: 1)
        let b = ShootingDay(startedAt: d(2), startFrame: 20)
        let out = RangeEdit.setDays([a, b], from: 25, to: 36, date: d(3), frameCount: 36, removing: b.id, at: { _ in nil })
        XCTAssertEqual(out.map { $0.startFrame }, [1, 25])
    }

    func testSetPlaceUnknownAndMerge() {
        let p1 = LocationSegment(startFrame: 1, name: "성수동")
        let out = RangeEdit.setPlace([p1], from: 5, to: 8, place: LocationSegment(startFrame: 0, name: ""), frameCount: 36)
        XCTAssertEqual(out.map(\.startFrame), [1, 5, 9])
        XCTAssertEqual(out.map(\.name), ["성수동", "", "성수동"])
        let back = RangeEdit.setPlace(out, from: 5, to: 8, place: LocationSegment(startFrame: 0, name: "성수동"), frameCount: 36)
        XCTAssertEqual(back.map(\.startFrame), [1])
    }
}
