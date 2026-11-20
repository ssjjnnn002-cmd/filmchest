import { describe, expect, it } from 'vitest'
import { dateFromName, nameHints } from './nameHints'
import { filmById } from './films'

const now = new Date('2026-11-20T00:00:00').getTime()
const ymd = (s: string) => { const t = dateFromName(s, now); if (t === undefined) return undefined; const d = new Date(t); return [d.getFullYear(), d.getMonth() + 1, d.getDate()] }

describe('nameHints', () => {
  it('reads dates', () => {
    expect(ymd('2026.11.20 Portra 400')).toEqual([2026, 11, 20])
    expect(ymd('20261120_hp5')).toEqual([2026, 11, 20])
    expect(ymd('261120 골드200')).toEqual([2026, 11, 20])
    expect(ymd('2025-3-7 roll')).toEqual([2025, 3, 7])
    expect(ymd('2024년 5월 1일 제주')).toEqual([2024, 5, 1])
    expect(ymd('99.12.31')).toEqual([1999, 12, 31])
    expect(ymd('Portra 400')).toBeUndefined()
    expect(ymd('000036')).toBeUndefined()
    expect(ymd('DSC01234')).toBeUndefined()
    expect(ymd('20261340')).toBeUndefined()
    expect(ymd('ColorPlus 200 36')).toBeUndefined()
  })
  it('reads film, also in Korean', () => {
    expect(filmById(nameHints(['20261120_Kodak Portra 400.zip']).filmId!)?.name).toBe('Portra 400')
    expect(filmById(nameHints(['261120 골드200.zip']).filmId!)?.name).toBe('Gold 200')
  })
})
