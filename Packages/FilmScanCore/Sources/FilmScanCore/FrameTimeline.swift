import Foundation

/// 컷 하나에 기록할 촬영 정보
public struct FrameInfo: Sendable, Hashable {
    public let frame: Int            // 1부터
    public let date: Date
    public let timeZone: TimeZone
    public let location: LocationSegment?
}

/// 촬영일·장소 기록을 컷 번호별 날짜/장소로 펼친다.
///
/// - 촬영일에 시작 컷이 있으면 그 컷부터 다음 촬영일 전까지 그날로 본다.
/// - 시작 컷이 없는 촬영일은 앞뒤 기준점 사이를 균등하게 나눈다.
/// - 같은 날 안에서는 기록한 시각부터 1분씩 증가시켜 사진 앱에서도 순서가 유지되게 한다.
public enum FrameTimeline {
    public static func build(roll: Roll, frameCount: Int) -> [FrameInfo] {
        guard frameCount > 0 else { return [] }
        let days = roll.shootingDays.sorted { $0.startedAt < $1.startedAt }
        let starts = startFrames(for: days, frameCount: frameCount)
        let locations = roll.locations.sorted { $0.startFrame < $1.startFrame }

        var result: [FrameInfo] = []
        result.reserveCapacity(frameCount)

        for frame in 1...frameCount {
            let location = locations.last { $0.startFrame <= frame }

            guard !days.isEmpty else {
                // 촬영일 기록이 없으면 장착한 시각 기준
                result.append(FrameInfo(frame: frame, date: roll.loadedAt.addingTimeInterval(Double(frame - 1) * 60),
                                        timeZone: .current, location: location))
                continue
            }

            let dayIndex = starts.lastIndex { $0 <= frame } ?? 0
            let day = days[dayIndex]
            let dayStart = starts[dayIndex]
            let dayEnd = dayIndex + 1 < starts.count ? starts[dayIndex + 1] - 1 : frameCount
            let offset = frame - dayStart
            let count = max(1, dayEnd - dayStart + 1)

            result.append(FrameInfo(frame: frame,
                                    date: timestamp(base: day.startedAt, offset: offset, count: count, timeZone: day.timeZone),
                                    timeZone: day.timeZone, location: location))
        }
        return result
    }

    /// 촬영일별 시작 컷을 정한다. 결과는 항상 증가하는 순서이며 첫 값은 1.
    static func startFrames(for days: [ShootingDay], frameCount: Int) -> [Int] {
        guard !days.isEmpty else { return [] }
        var starts: [Int?] = days.map { $0.startFrame.map { min(max($0, 1), frameCount) } }
        starts[0] = 1

        // 알려진 기준점 사이의 빈칸을 균등 분배
        var i = 0
        while i < starts.count {
            guard starts[i] == nil else { i += 1; continue }
            let prev = i - 1
            var next = i
            while next < starts.count, starts[next] == nil { next += 1 }
            let lo = starts[prev]!
            let hi = next < starts.count ? starts[next]! : frameCount + 1
            let gaps = next - prev
            for k in (prev + 1)..<next {
                starts[k] = lo + Int((Double(hi - lo) * Double(k - prev) / Double(gaps)).rounded(.down))
            }
            i = next
        }

        // 순서가 꼬였으면(사용자 입력 실수) 앞 값보다 작지 않게 보정
        var fixed: [Int] = []
        for s in starts.compactMap({ $0 }) { fixed.append(max(s, fixed.last ?? 1)) }
        return fixed
    }

    /// 같은 날 안에서 컷마다 1분씩. 자정을 넘길 것 같으면 간격을 줄인다.
    static func timestamp(base: Date, offset: Int, count: Int, timeZone: TimeZone) -> Date {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = timeZone
        let endOfDay = calendar.date(bySettingHour: 23, minute: 59, second: 59, of: base) ?? base
        let available = endOfDay.timeIntervalSince(base)
        let step = count > 1 ? min(60, max(1, available / Double(count - 1))) : 60
        return base.addingTimeInterval(Double(offset) * step.rounded(.down))
    }
}
