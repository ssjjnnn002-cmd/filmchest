// 자동 복사: web/src/core/timeline.ts (node scripts/sync-galaxy-core.mjs). 여기서 고치지 말 것.
import type { LocationSegment, Roll, ShootingDay } from './types'

export interface FrameInfo {
  frame: number
  date: number
  location?: LocationSegment
}

/** 촬영일별 시작 컷. 모르는 날은 앞뒤 기준점 사이를 고르게 나눈다. 첫 값은 항상 1. */
export function startFrames(days: ShootingDay[], frameCount: number): number[] {
  if (days.length === 0) return []
  const starts: (number | undefined)[] = days.map((d) =>
    d.startFrame === undefined ? undefined : Math.min(Math.max(d.startFrame, 1), frameCount))
  starts[0] = 1
  let i = 0
  while (i < starts.length) {
    if (starts[i] !== undefined) { i++; continue }
    const prev = i - 1
    let next = i
    while (next < starts.length && starts[next] === undefined) next++
    const lo = starts[prev]!
    const hi = next < starts.length ? starts[next]! : frameCount + 1
    const gaps = next - prev
    for (let k = prev + 1; k < next; k++) starts[k] = lo + Math.floor(((hi - lo) * (k - prev)) / gaps)
    i = next
  }
  const fixed: number[] = []
  for (const s of starts) fixed.push(Math.max(s!, fixed.at(-1) ?? 1))
  return fixed
}

/** 같은 날 안에서 컷마다 1분씩. 자정을 넘길 것 같으면 간격을 줄인다. */
function timestamp(base: number, offset: number, count: number) {
  const end = new Date(base)
  end.setHours(23, 59, 59, 0)
  const available = (end.getTime() - base) / 1000
  const step = count > 1 ? Math.min(60, Math.max(1, available / (count - 1))) : 60
  return base + offset * Math.floor(step) * 1000
}

/** 촬영일·장소 기록을 컷 번호별 날짜/장소로 펼친다 */
export function buildTimeline(roll: Pick<Roll, 'days' | 'locations' | 'loadedAt'>, frameCount: number): FrameInfo[] {
  if (frameCount <= 0) return []
  const days = [...roll.days].sort((a, b) => a.startedAt - b.startedAt)
  const starts = startFrames(days, frameCount)
  const locations = [...roll.locations].sort((a, b) => a.startFrame - b.startFrame)
  const out: FrameInfo[] = []
  for (let frame = 1; frame <= frameCount; frame++) {
    const location = [...locations].reverse().find((l) => l.startFrame <= frame)
    if (days.length === 0) {
      out.push({ frame, date: roll.loadedAt + (frame - 1) * 60_000, location })
      continue
    }
    let dayIndex = 0
    starts.forEach((s, i) => { if (s <= frame) dayIndex = i })
    const dayStart = starts[dayIndex]
    const dayEnd = dayIndex + 1 < starts.length ? starts[dayIndex + 1] - 1 : frameCount
    out.push({
      frame,
      date: timestamp(days[dayIndex].startedAt, frame - dayStart, Math.max(1, dayEnd - dayStart + 1)),
      location,
    })
  }
  return out
}
