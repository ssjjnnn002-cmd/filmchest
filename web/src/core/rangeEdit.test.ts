import { describe, expect, it } from 'vitest'
import { setDays, setPlace } from './rangeEdit'
import { buildTimeline } from './timeline'
import type { Roll } from './types'

const d = (n: number) => n * 86_400_000

describe('rangeEdit', () => {
  it('middle range keeps tail', () => {
    const out = setDays([{ id: 'a', startedAt: d(1), startFrame: 1 }], 10, 15, d(5), 36, undefined, () => d(1))
    expect(out.map((x) => x.startFrame)).toEqual([1, 10, 16])
    expect(out.map((x) => x.startedAt)).toEqual([d(1), d(5), d(1)])
    const t = buildTimeline({ days: out, locations: [], loadedAt: 0 } as unknown as Roll, 36)
    expect(new Date(t[11].date).toDateString()).toBe(new Date(d(5)).toDateString())
    expect(new Date(t[20].date).toDateString()).toBe(new Date(d(1)).toDateString())
  })
  it('edit existing day shrinks', () => {
    const out = setDays([{ id: 'a', startedAt: d(1), startFrame: 1 }, { id: 'b', startedAt: d(2), startFrame: 20 }], 25, 36, d(3), 36, 'b', () => undefined)
    expect(out.map((x) => x.startFrame)).toEqual([1, 25])
  })
  it('unknown place and merge', () => {
    const out = setPlace([{ id: 'p', startFrame: 1, name: '성수동' }], 5, 8, { id: 'n', startFrame: 0, name: '' }, 36)
    expect(out.map((x) => [x.startFrame, x.name])).toEqual([[1, '성수동'], [5, ''], [9, '성수동']])
    const back = setPlace(out, 5, 8, { id: 'm', startFrame: 0, name: '성수동' }, 36)
    expect(back.map((x) => x.startFrame)).toEqual([1])
  })
})
