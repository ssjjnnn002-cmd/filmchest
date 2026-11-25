// 필름 재고: 필름을 장착하면 재고에서 1롤 뺀다 (세 앱 같은 규칙)
import type { FilmFormat, FilmLot } from './types'

/** 이 필름을 장착할 때 뺄 재고: 남은 수량이 있고, 포맷이 맞는 것 먼저, 유통기한이 이른 것 먼저 */
export function lotToUse(lots: FilmLot[], filmId: string, format?: FilmFormat): FilmLot | undefined {
  const fit = (l: FilmLot) => (format && l.format === format ? 0 : 1)
  return lots
    .filter((l) => l.filmId === filmId && l.count > 0)
    .sort((a, b) => fit(a) - fit(b) || (a.expiresAt ?? Infinity) - (b.expiresAt ?? Infinity) || a.createdAt - b.createdAt)[0]
}

/** 장착 화면에 보여 줄 남은 재고 (이 필름 전체) */
export const stockCount = (lots: FilmLot[], filmId: string) => lots.filter((l) => l.filmId === filmId).reduce((n, l) => n + Math.max(0, l.count), 0)

/** 재고에 유통기한이 지난 이 필름이 있는지 */
export const hasExpiredLot = (lots: FilmLot[], filmId: string, now = Date.now()) => lots.some((l) => l.filmId === filmId && l.count > 0 && !!l.expiresAt && l.expiresAt < now)
