import Foundation

/// 촬영일·장소를 "몇 번부터 몇 번까지"로 고친다.
/// 기록은 "몇 번 컷부터"만 저장하므로, 범위 뒤쪽 컷은 원래 값으로 이어지게 나눠 둔다.
/// 웹·갤럭시 core/rangeEdit.ts와 같은 규칙.
public enum RangeEdit {
    /// 촬영일마다 실제로 시작하는 컷 (시작 컷을 모르는 날은 앞뒤 사이를 고르게 나눈 값). 순서는 timeline과 같다
    public static func resolvedDays(_ days: [ShootingDay], frameCount: Int) -> [ShootingDay] {
        let sorted = FrameTimeline.orderedDays(days)
        let starts = FrameTimeline.startFrames(for: sorted, frameCount: max(frameCount, 1))
        return zip(sorted, starts).map { d, s in var x = d; x.startFrame = s; return x }
    }

    /// 컷 a~b를 그날로. at(n)은 지금 n번 컷의 촬영 시각 (뒤쪽을 나눌 때 원래 시각을 이어 가려고)
    public static func setDays(_ days: [ShootingDay], from a: Int, to b: Int, date: Date, timeZone: TimeZone = .current,
                               frameCount: Int, removing id: UUID? = nil, at: (Int) -> Date?) -> [ShootingDay] {
        var list = resolvedDays(days, frameCount: frameCount)
        let afterSource = b < frameCount ? list.last { ($0.startFrame ?? 1) <= b + 1 } : nil
        let afterDate = at(b + 1)
        if let id { list.removeAll { $0.id == id } }
        list.removeAll { let s = $0.startFrame ?? 1; return s >= a && s <= b + 1 }
        if let src = afterSource, src.id != id || id == nil, b < frameCount {
            list.append(ShootingDay(startedAt: afterDate ?? src.startedAt, timeZone: src.timeZone, startFrame: b + 1))
        }
        list.append(ShootingDay(startedAt: date, timeZone: timeZone, startFrame: a))
        list.sort { ($0.startFrame ?? 1) < ($1.startFrame ?? 1) }
        // 첫 촬영일은 늘 1번부터
        if var first = list.first, first.startFrame != 1 { first.startFrame = 1; list[0] = first }
        return list
    }

    /// 컷 a~b를 그 장소로. 장소 미상은 이름·좌표가 빈 칸
    public static func setPlace(_ places: [LocationSegment], from a: Int, to b: Int, place: LocationSegment,
                                frameCount: Int, removing id: UUID? = nil) -> [LocationSegment] {
        var list = places.sorted { $0.startFrame < $1.startFrame }
        let afterSource = b < frameCount ? list.last { $0.startFrame <= b + 1 } : nil
        if let id { list.removeAll { $0.id == id } }
        list.removeAll { $0.startFrame >= a && $0.startFrame <= b + 1 }
        if let src = afterSource, src.id != id || id == nil {
            var rest = src
            rest.id = UUID()
            rest.startFrame = b + 1
            list.append(rest)
        }
        var mine = place
        mine.startFrame = a
        list.append(mine)
        list.sort { $0.startFrame < $1.startFrame }
        // 이어지는 같은 장소는 하나로
        var merged: [LocationSegment] = []
        for seg in list {
            if let last = merged.last, last.name == seg.name, last.point == seg.point, last.memo == seg.memo { continue }
            merged.append(seg)
        }
        return merged
    }

    /// 그 촬영일·장소가 덮는 컷 범위 (편집 화면을 열 때)
    public static func span(start: Int, nextStart: Int?, frameCount: Int) -> ClosedRange<Int> {
        let end = max(start, min(frameCount, (nextStart ?? frameCount + 1) - 1))
        return start...end
    }
}
