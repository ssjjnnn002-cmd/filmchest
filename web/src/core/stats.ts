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

// ───── 기간 고르기 (아이폰 StatsPeriod와 같음)

export type StatsPeriod = 'days30' | 'months3' | 'months12' | 'thisYear' | 'lastYear' | 'all' | 'custom'
export const statsPeriodName: Record<StatsPeriod, string> = {
  days30: '최근 30일', months3: '최근 3달', months12: '최근 12달', thisYear: '올해', lastYear: '작년', all: '전체', custom: '사용자 지정',
}
export const rollStartOf = startOf

/** 기간 [시작, 끝] (ms) */
/** custom: 사용자 지정 [시작일, 끝 날] (ms, 날짜만 본다) */
export function periodRange(p: StatsPeriod, earliest: number | undefined, now = new Date(), custom?: [number, number]): [number, number] {
  const y = now.getFullYear(), m = now.getMonth()
  const t = now.getTime()
  switch (p) {
    case 'days30': return [new Date(y, m, now.getDate() - 29).getTime(), t]
    case 'months3': return [new Date(y, m - 2, 1).getTime(), t]
    case 'months12': return [new Date(y, m - 11, 1).getTime(), t]
    case 'thisYear': return [new Date(y, 0, 1).getTime(), t]
    case 'lastYear': return [new Date(y - 1, 0, 1).getTime(), new Date(y, 0, 1).getTime() - 1]
    case 'all': return [Math.min(earliest ?? t, t), t]
    case 'custom': {
      const [a, b] = custom ?? [t - 89 * 86_400_000, t]
      const lo = new Date(Math.min(a, b)), hi = new Date(Math.max(a, b))
      return [new Date(lo.getFullYear(), lo.getMonth(), lo.getDate()).getTime(), new Date(hi.getFullYear(), hi.getMonth(), hi.getDate() + 1).getTime() - 1]
    }
  }
}

export type BucketUnit = 'week' | 'month' | 'year'
/** 막대 하나의 단위: 짧으면 주, 길면 달, 2년 넘게 '전체'면 해 */
export function bucketUnit(p: StatsPeriod, range: [number, number]): BucketUnit {
  if (p === 'days30' || p === 'months3') return 'week'
  if (p === 'all' || p === 'custom') {
    // 사용자 지정은 짧으면 주 단위
    if (p === 'custom' && range[1] - range[0] <= 100 * 86_400_000) return 'week'
    const a = new Date(range[0]), b = new Date(range[1])
    return (b.getFullYear() - a.getFullYear()) * 12 + b.getMonth() - a.getMonth() > 24 ? 'year' : 'month'
  }
  return 'month'
}
export const unitName: Record<BucketUnit, string> = { week: '주', month: '달', year: '해' }

export interface Bucket { key: string; start: number; end: number; label: string; title: string; rolls: Roll[] }

const pad = (n: number) => String(n).padStart(2, '0')
/** 기간 안을 단위로 나눈 막대 (주는 월요일부터) */
export function buckets(rolls: Roll[], range: [number, number], unit: BucketUnit): Bucket[] {
  const s = new Date(range[0])
  let from = unit === 'year' ? new Date(s.getFullYear(), 0, 1)
    : unit === 'month' ? new Date(s.getFullYear(), s.getMonth(), 1)
    : new Date(s.getFullYear(), s.getMonth(), s.getDate() - ((s.getDay() + 6) % 7))
  const out: Bucket[] = []
  for (let i = 0; from.getTime() <= range[1] && i < 400; i++) {
    const to = unit === 'year' ? new Date(from.getFullYear() + 1, 0, 1)
      : unit === 'month' ? new Date(from.getFullYear(), from.getMonth() + 1, 1)
      : new Date(from.getFullYear(), from.getMonth(), from.getDate() + 7)
    const lo = from.getTime(), hi = to.getTime()
    const last = new Date(hi - 86_400_000)
    out.push({
      key: String(lo), start: lo, end: hi,
      label: unit === 'year' ? `${from.getFullYear()}` : unit === 'month' ? `${from.getMonth() + 1}월` : `${from.getMonth() + 1}.${from.getDate()}`,
      title: unit === 'year' ? `${from.getFullYear()}년` : unit === 'month' ? `${from.getFullYear()}년 ${from.getMonth() + 1}월`
        : `${pad(from.getMonth() + 1)}.${pad(from.getDate())} – ${pad(last.getMonth() + 1)}.${pad(last.getDate())}`,
      rolls: rolls.filter((r) => { const d = startOf(r); return d >= lo && d < hi }),
    })
    from = to
  }
  return out
}

/** 평균 며칠 (기록 없으면 '기록 없음') */
export function avgDaysText(list: number[]) {
  const ok = list.filter((x) => x > 0)
  if (!ok.length) return '기록 없음'
  const d = ok.reduce((a, b) => a + b, 0) / ok.length / 86_400_000
  return d < 1 ? '하루 안' : `평균 ${Math.round(d)}일`
}
