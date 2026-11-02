// 통계 계산 (웹·갤럭시 공통): 숫자 타일, 월별 롤, 컬러·흑백, 많이 쓴 순위
import type { Roll } from './types'
import { filmById } from './films'

export interface MonthBar { key: string; label: string; title: string; count: number }

const startOf = (r: Roll) => [...r.days].sort((a, b) => a.startedAt - b.startedAt)[0]?.startedAt ?? r.loadedAt

/** 최근 12달 (이번 달 포함) 롤 수. 롤은 첫 촬영일 기준 */
export function monthlyRolls(rolls: Roll[], now = new Date()): MonthBar[] {
  const bars: MonthBar[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    bars.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: `${d.getMonth() + 1}월`, title: `${d.getFullYear()}년 ${d.getMonth() + 1}월`, count: 0 })
  }
  for (const r of rolls) {
    const d = new Date(startOf(r))
    const bar = bars.find((b) => b.key === `${d.getFullYear()}-${d.getMonth()}`)
    if (bar) bar.count += 1
  }
  return bars
}

export const rollsThisYear = (rolls: Roll[], now = new Date()) => rolls.filter((r) => new Date(startOf(r)).getFullYear() === now.getFullYear()).length

/** 컬러 / 흑백 롤 수 */
export function colorSplit(rolls: Roll[]) {
  let bw = 0
  for (const r of rolls) if (filmById(r.filmId)?.process === 'B&W') bw += 1
  return { color: rolls.length - bw, bw }
}

/** 많이 쓴 순서 (같으면 이름순), 위에서 n개 */
export function topCounts(names: (string | undefined)[], n = 5): [string, number][] {
  const m = new Map<string, number>()
  for (const name of names) if (name) m.set(name, (m.get(name) ?? 0) + 1)
  return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, n)
}
