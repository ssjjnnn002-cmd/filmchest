import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { buildTimeline, startFrames } from './timeline'
import { decodeFileName, naturalCompare, readZip } from './zip'
import { readMeta, readScanner, writeMeta, scannerName } from './exif'
import { exposureText, formatComp, meterFrameTitle, meterProgress, meterShotAt, meterShotMeta, meterShotsByOrder, meterShotsInScan } from './meter'
import type { MeterShot } from './types'
import { filmById } from './films'
import { catalogMatch, inferStyle } from './cameras'

const day = (s: string) => new Date(s).getTime()

describe('timeline', () => {
  it('evenly splits days without start frames', () => {
    const days = [0, 1, 2].map((i) => ({ id: `${i}`, startedAt: day(`2026-09-0${i + 1}T10:00:00`) }))
    expect(startFrames(days, 36)).toEqual([1, 13, 25])
  })

  it('assigns dates and places per frame in increasing order', () => {
    const t = buildTimeline({
      loadedAt: 0,
      days: [
        { id: 'a', startedAt: day('2026-09-27T14:10:00') },
        { id: 'b', startedAt: day('2026-10-03T10:30:00'), startFrame: 21 },
      ],
      locations: [
        { id: '1', startFrame: 1, name: '성수동' },
        { id: '2', startFrame: 13, name: '서울숲' },
      ],
    }, 36)
    expect(t[0].date).toBe(day('2026-09-27T14:10:00'))
    expect(t[1].date).toBe(day('2026-09-27T14:11:00'))
    expect(t[20].date).toBe(day('2026-10-03T10:30:00'))
    expect(t[11].location?.name).toBe('성수동')
    expect(t[12].location?.name).toBe('서울숲')
    expect(t.every((f, i) => i === 0 || f.date > t[i - 1].date)).toBe(true)
  })
})

describe('zip', () => {
  it('decodes CP949 file names', () => {
    // "스캔" in CP949
    expect(decodeFileName(new Uint8Array([0xbd, 0xba, 0xc4, 0xb5]))).toBe('스캔')
    expect(decodeFileName(new TextEncoder().encode('스캔.jpg'))).toBe('스캔.jpg')
  })

  it('sorts naturally', () => {
    expect(['10.jpg', '2.jpg', '1.jpg'].sort(naturalCompare)).toEqual(['1.jpg', '2.jpg', '10.jpg'])
  })
})

const samplePath = path.resolve(__dirname, '../../../sample/MINOLTA_X-700_50mm_F1.7_ILFORD HP5 PLUS_400_망원동.zip')
const hasSample = fs.existsSync(samplePath)

describe.runIf(hasSample)('real lab zip', () => {
  it('reads 39 frames in order with Korean folder and detects scanner, writes metadata', async () => {
    const result = await readZip(fs.readFileSync(samplePath))
    const files = result.primary.files
    expect(files.length).toBe(39)
    expect(files[0].name).toContain('HP5/000190010001.jpg')
    expect(files.at(-1)!.name).toContain('000190010039.jpg')
    expect(files[0].name).toMatch(/BW일포드HP5/)
    expect(readScanner(files[0].data).name).toBe('Noritsu · EZ Controller')

    const out = writeMeta(files[0].data, {
      frame: 1, frameCount: 39, date: day('2026-09-28T14:20:00'), locationName: '망원동', memo: '산책',
      point: { latitude: 37.5556, longitude: 126.9019 }, cameraBrand: 'Minolta', cameraModel: 'X-700',
      lens: 'MD 50mm f/1.7', film: filmById('ilford-hp5-plus'), iso: 400, lab: '동네현상소', scanner: 'Noritsu · EZ Controller',
    })
    const m = readMeta(out)
    expect(m.dateTimeOriginal).toBe('2026:09:28 14:20:00')
    expect(m.make).toBe('Minolta')
    expect(m.model).toBe('X-700')
    expect(m.lens).toBe('MD 50mm f/1.7')
    expect(m.iso).toBe(400)
    expect(m.latRef).toBe('N')
    expect(m.caption).toBe('Ilford HP5 Plus · 1/39 · 망원동 · 산책 · 동네현상소 · Noritsu · EZ Controller')
    // 스캔일은 그대로
    expect(m.dateTimeDigitized).toBe(readMeta(files[0].data).dateTimeDigitized)
    // 이미지 데이터 크기는 거의 같아야 한다 (재압축 없음)
    expect(Math.abs(out.length - files[0].data.length)).toBeLessThan(20_000)
  }, 60_000)

  it('keeps original date and device when unknown', async () => {
    const result = await readZip(fs.readFileSync(samplePath))
    const src = result.primary.files[1].data
    const out = writeMeta(src, { frame: 2, frameCount: 39 })
    expect(readMeta(out).dateTimeOriginal).toBe(readMeta(src).dateTimeOriginal)
    expect(readMeta(out).make).toBe('NORITSU KOKI')
  }, 60_000)
})

const shot = (pos: number, order: number, extra: Partial<MeterShot> = {}): MeterShot => ({
  pos, order, mode: 'A', aperture: 2.8, shutter: 1 / 125, comp: 0, flash: false, ev: 12, focal: 50, at: null, edited: false,
  ...extra,
})

describe('meter', () => {
  const shots = [shot(2, 2), shot(1, 1, { aperture: 2, shutter: 1 / 60, comp: 1 / 3, flash: true }), shot(40, 3)]

  it('matches a scan frame to the same film slot, starting at frame 1', () => {
    expect(meterShotAt(shots, 1)?.order).toBe(1)
    expect(meterShotAt(shots, 3)).toBeUndefined()
    expect(meterShotsInScan(shots, 36).map((s) => s.pos)).toEqual([1, 2])
    expect(meterShotAt(shots, 2, 1)?.pos).toBe(1)
    expect(meterShotAt(shots, 1, -1)?.pos).toBe(2)
    expect(meterShotsInScan(shots, 3, 1).map((s) => s.pos)).toEqual([1, 2])
    expect(meterFrameTitle(1)).toBe('1번')
    expect(meterFrameTitle(0, true)).toBe('추가')
    expect(meterFrameTitle(-1)).toBe('00번')
  })

  it('formats exposure and roll progress', () => {
    expect(exposureText(shots[1])).toBe('f/2 · 1/60 · +⅓ · 플래시')
    expect(exposureText(shot(1, 1, { mode: 'P', aperture: null, shutter: null }))).toBe('자동')
    expect(formatComp(1)).toBe('+1')
    expect(formatComp(-2 / 3)).toBe('−⅔')
    expect(meterProgress(12, '135')).toEqual({ shot: 12, capacity: 36, percent: 33 })
    expect(meterShotsByOrder(shots).map((s) => s.order)).toEqual([1, 2, 3])
    expect(meterShotMeta(shots[1])).toBe('1번 칸 · 조리개 우선 · 50mm')
  })

  it.runIf(hasSample)('writes aperture, shutter and compensation into jpeg exif', async () => {
    const result = await readZip(fs.readFileSync(samplePath))
    const out = writeMeta(result.primary.files[0].data, {
      frame: 1, frameCount: 36,
      exposure: { mode: 'A', aperture: 2.8, shutter: 1 / 125, comp: 1 / 3, flash: false },
    })
    const m = readMeta(out)
    expect(m.fNumber).toBeCloseTo(2.8)
    expect(m.exposureTime).toBeCloseTo(1 / 125, 5)
    expect(m.exposureBias).toBeCloseTo(1 / 3, 5)
    expect(m.exposureProgram).toBe(3)
    expect(m.flash).toBe(0)
  }, 60_000)
})

describe('catalog', () => {
  it('maps known models', () => {
    expect(catalogMatch('Canon', 'AE-1')?.battery).toBe('4LR44 (6V)')
    expect(inferStyle('Olympus', '35 RC', '135', false)).toBe('rangefinder')
    expect(inferStyle('Pentax', '17', '135', false)).toBe('compact')
    expect(scannerName('NORITSU KOKI', 'HS-1800')).toBe('Noritsu HS-1800')
  })
})
