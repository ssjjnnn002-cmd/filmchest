import { filmFromText } from './films'
import { searchLatin } from './searchAlias'

/** 가져올 파일·zip·폴더 이름에서 촬영일과 필름을 짐작한다.
 *  예: "2026.11.20 Portra 400.zip", "20261120_hp5.zip", "261120 골드200"
 *  아이폰 NameHints.swift와 같은 규칙. */
export interface NameHints { date?: number; filmId?: string }

/** 이름 속 날짜 → 그날 정오(ms). 없거나 말이 안 되는 날짜면 undefined */
export function dateFromName(text: string, now = Date.now()): number | undefined {
  const thisYear = new Date(now).getFullYear()
  const runs = [...text.matchAll(/\d+/g)].map((m) => ({ v: m[0], start: m.index!, end: m.index! + m[0].length }))
  const valid = (y: number, m: number, d: number) => {
    if (y < 1950 || y > thisYear + 1 || m < 1 || m > 12 || d < 1 || d > 31) return undefined
    const t = new Date(y, m - 1, d, 12)
    return t.getMonth() === m - 1 && t.getDate() === d ? t.getTime() : undefined
  }
  const fullYear = (yy: number) => yy + (yy <= (thisYear % 100) + 1 ? 2000 : 1900)
  const sep = (a: number, b: number) => { const g = text.slice(a, b); return g.length > 0 && g.length <= 2 && /^[.\-_ /년월]+$/.test(g) }
  // 1) 나눠 쓴 날짜: 2026.11.20 / 26-11-20 / 2026년 11월 20일
  for (let k = 0; k + 2 < runs.length; k++) {
    const [a, b, c] = [runs[k], runs[k + 1], runs[k + 2]]
    if (!sep(a.end, b.start) || !sep(b.end, c.start) || b.v.length > 2 || c.v.length > 2) continue
    const year = a.v.length === 4 ? +a.v : a.v.length === 2 ? fullYear(+a.v) : -1
    const r = valid(year, +b.v, +c.v)
    if (r !== undefined) return r
  }
  // 2) 붙여 쓴 날짜: 20261120 / 261120
  for (const { v } of runs) {
    const r = v.length === 8 ? valid(+v.slice(0, 4), +v.slice(4, 6), +v.slice(6, 8))
      : v.length === 6 ? valid(fullYear(+v.slice(0, 2)), +v.slice(2, 4), +v.slice(4, 6)) : undefined
    if (r !== undefined) return r
  }
  return undefined
}

/** 여러 이름 중 먼저 나온 날짜·필름. 한글 필름 이름(포트라·골드)도 영어로 바꿔 한 번 더 본다 */
export function nameHints(names: string[]): NameHints {
  const out: NameHints = {}
  for (const name of names) {
    const base = name.replace(/\.[a-z0-9]{2,4}$/i, '')
    out.date ??= dateFromName(base)
    out.filmId ??= filmFromText(base) ?? filmFromText(searchLatin(base))
  }
  return out
}
