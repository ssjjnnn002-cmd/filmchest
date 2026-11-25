import type { NameHints } from './nameHints'
import { searchLatin } from './searchAlias'

/** 가져올 파일 이름과 맞을 것 같은 롤 고르기. 자동으로 정하지 않고 '추천'으로 맨 위에 보여 준다.
 *  아이폰 RollMatch.swift와 같은 규칙. */
export interface RollFacts {
  id: string
  filmId?: string
  model?: string
  places: string[]
  lab?: string
  /** 처음 찍은 때 ~ 마지막 기록(촬영 끝·맡긴 날) */
  from: number
  to: number
}

const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9가-힣]+/g, '')
const DAY = 864e5

function hasModel(model: string, tokens: string[], whole: string) {
  const m = squash(model)
  if (m.length < 2) return false
  // 짧은 이름(XA·F2·M6)은 낱말이 똑같을 때만
  return m.length >= 4 ? whole.includes(m) : tokens.includes(m)
}

export function matchScore(names: string[], hints: NameHints, r: RollFacts): number {
  const text = names.map((n) => `${n} ${searchLatin(n)}`).join(' ')
  const whole = squash(text)
  const tokens = text.toLowerCase().split(/[^a-z0-9가-힣]+/).filter(Boolean)
  let score = 0
  // 이름에 적힌 필름이 다른 롤은 추천하지 않는다
  if (hints.filmId && r.filmId && r.filmId !== hints.filmId) return 0
  if (hints.filmId && r.filmId === hints.filmId) score += 3
  if (r.model && hasModel(r.model, tokens, whole)) score += 4
  if (r.places.some((p) => squash(p).length >= 2 && whole.includes(squash(p)))) score += 2
  if (r.lab && squash(r.lab).length >= 2 && whole.includes(squash(r.lab))) score += 1
  // 이름 속 날짜는 찍은 날이거나 현상·스캔한 날 (맡긴 뒤 한 달 반까지)
  if (hints.date !== undefined && hints.date >= r.from - DAY && hints.date <= r.to + 45 * DAY) score += 2
  return score
}

/** 점수가 가장 높은 롤 (3점 이상, 같은 점수는 셋까지). 더 많으면 알 수 없는 것이라 추천하지 않는다 */
export function suggestRolls(names: string[], hints: NameHints, rolls: RollFacts[]): string[] {
  const scored = rolls.map((r) => ({ id: r.id, s: matchScore(names, hints, r) }))
  const best = Math.max(0, ...scored.map((x) => x.s))
  if (best < 3) return []
  const top = scored.filter((x) => x.s === best)
  return top.length > 3 ? [] : top.map((x) => x.id)
}
