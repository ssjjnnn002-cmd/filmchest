import { describe, expect, it } from 'vitest'
import { suggestRolls, type RollFacts } from './rollMatch'
import { nameHints } from './nameHints'

const t = (s: string) => new Date(`${s}T12:00:00`).getTime()
const rolls: RollFacts[] = [
  { id: 'a', filmId: 'ilford-hp5-plus', model: 'X-700', places: ['망원동'], from: t('2026-09-20'), to: t('2026-10-01') },
  { id: 'b', filmId: 'ilford-hp5-plus', model: 'XA', places: ['성수동'], from: t('2026-06-01'), to: t('2026-06-10') },
  { id: 'c', filmId: 'kodak-gold-200', model: '35 RC', places: [], from: t('2026-10-05'), to: t('2026-10-19') },
]
const run = (name: string) => suggestRolls([name], nameHints([name]), rolls)

describe('rollMatch', () => {
  it('카메라·필름·장소', () => expect(run('MINOLTA_X-700_50mm_F1.7_ILFORD HP5 PLUS_400_망원동.zip')).toEqual(['a']))
  it('짧은 모델 이름은 낱말로만', () => { expect(run('olympus XA hp5.zip')).toEqual(['b']); expect(run('exact scans.zip')).toEqual([]) })
  it('필름만 같으면 같은 점수끼리', () => expect(run('hp5.zip')).toEqual(['a', 'b']))
  it('한글 필름 이름과 날짜', () => expect(run('20261025 골드200.zip')).toEqual(['c']))
  it('이름의 필름과 다른 롤은 뺀다', () => expect(suggestRolls(['X-700 gold 200 망원동.zip'], nameHints(['X-700 gold 200 망원동.zip']), rolls)).toEqual(['c']))
  it('모르면 추천 없음', () => expect(run('scan_0012.zip')).toEqual([]))
})
