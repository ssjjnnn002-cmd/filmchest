import type { LocationSegment, ShootingDay } from './types'
import { uid } from './types'
import { orderedDays, startFrames } from './timeline'

/** 촬영일·장소를 "몇 번부터 몇 번까지"로 고친다.
 *  기록은 "몇 번 컷부터"만 저장하므로, 범위 뒤쪽 컷은 원래 값으로 이어지게 나눠 둔다.
 *  아이폰 RangeEdit.swift와 같은 규칙. */

/** 촬영일마다 실제로 시작하는 컷 (시작 컷을 모르는 날은 앞뒤 사이를 고르게 나눈 값) */
export function resolvedDays(days: ShootingDay[], frameCount: number): ShootingDay[] {
  const sorted = orderedDays(days)
  const starts = startFrames(sorted, Math.max(frameCount, 1))
  return sorted.map((d, i) => ({ ...d, startFrame: starts[i] }))
}

/** 컷 a~b를 그날로. at(n)은 지금 n번 컷의 촬영 시각 (뒤쪽을 나눌 때 원래 시각을 이어 가려고) */
export function setDays(days: ShootingDay[], a: number, b: number, date: number, frameCount: number,
  removing: string | undefined, at: (n: number) => number | undefined): ShootingDay[] {
  let list = resolvedDays(days, frameCount)
  const afterSource = b < frameCount ? [...list].reverse().find((d) => (d.startFrame ?? 1) <= b + 1) : undefined
  const afterDate = at(b + 1)
  if (removing) list = list.filter((d) => d.id !== removing)
  list = list.filter((d) => { const s = d.startFrame ?? 1; return s < a || s > b + 1 })
  if (afterSource && afterSource.id !== removing) list.push({ id: uid(), startedAt: afterDate ?? afterSource.startedAt, startFrame: b + 1 })
  list.push({ id: uid(), startedAt: date, startFrame: a })
  list.sort((x, y) => (x.startFrame ?? 1) - (y.startFrame ?? 1))
  // 첫 촬영일은 늘 1번부터
  if (list[0] && list[0].startFrame !== 1) list[0] = { ...list[0], startFrame: 1 }
  return list
}

/** 컷 a~b를 그 장소로. 장소 미상은 이름·좌표가 빈 칸 */
export function setPlace(places: LocationSegment[], a: number, b: number, place: LocationSegment, frameCount: number,
  removing?: string): LocationSegment[] {
  let list = [...places].sort((x, y) => x.startFrame - y.startFrame)
  const afterSource = b < frameCount ? [...list].reverse().find((l) => l.startFrame <= b + 1) : undefined
  if (removing) list = list.filter((l) => l.id !== removing)
  list = list.filter((l) => l.startFrame < a || l.startFrame > b + 1)
  if (afterSource && afterSource.id !== removing) list.push({ ...afterSource, id: uid(), startFrame: b + 1 })
  list.push({ ...place, startFrame: a })
  list.sort((x, y) => x.startFrame - y.startFrame)
  // 이어지는 같은 장소는 하나로
  const same = (x: LocationSegment, y: LocationSegment) => x.name === y.name && x.memo === y.memo
    && x.point?.latitude === y.point?.latitude && x.point?.longitude === y.point?.longitude
  return list.filter((l, i) => i === 0 || !same(list[i - 1], l))
}

/** 그 촬영일·장소가 덮는 컷 범위 */
export function span(start: number, nextStart: number | undefined, frameCount: number): [number, number] {
  return [start, Math.max(start, Math.min(frameCount, (nextStart ?? frameCount + 1) - 1))]
}
