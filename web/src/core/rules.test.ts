// 세 앱이 같게 지켜야 하는 규칙 시험: 재고 빼기, 백업 알림, 아이폰(대문자 id)·웹(소문자 id) 백업 합치기
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FilmLot } from './types'
import { hasExpiredLot, lotToUse, stockCount } from './filmStock'
import { dedupeCaseIds, idCanon, remapRow } from './backupMerge'

const prefs = new Map<string, string>()
vi.mock('../platform', () => ({
  getPref: (k: string, f: string) => prefs.get(k) || f,
  setPref: (k: string, v: string) => { prefs.set(k, v) },
}))
const { backupNudge, lastBackupAt, markFileBackup, snoozeBackupNudge } = await import('./backupNudge')

const DAY = 86_400_000
const lot = (o: Partial<FilmLot>): FilmLot => ({ id: 'l', filmId: 'kodak-portra-400', format: '135', count: 1, lowAt: 1, storage: 'fridge', createdAt: 0, ...o } as FilmLot)

describe('필름 재고', () => {
  it('포맷이 맞고 유통기한이 이른 재고부터 뺀다', () => {
    const lots = [
      lot({ id: 'a', format: '120-67', expiresAt: 1 }),
      lot({ id: 'b', format: '135', expiresAt: 5 }),
      lot({ id: 'c', format: '135', expiresAt: 2 }),
      lot({ id: 'd', format: '135', count: 0, expiresAt: 0 }),
    ]
    expect(lotToUse(lots, 'kodak-portra-400', '135')?.id).toBe('c')
    expect(lotToUse(lots, 'kodak-portra-400', '120-67')?.id).toBe('a')
    expect(lotToUse(lots, 'ilford-hp5-plus', '135')).toBeUndefined()
  })
  it('남은 롤 수와 지난 유통기한', () => {
    const lots = [lot({ count: 2 }), lot({ count: 3, expiresAt: 10 }), lot({ filmId: 'x', count: 9 })]
    expect(stockCount(lots, 'kodak-portra-400')).toBe(5)
    expect(hasExpiredLot(lots, 'kodak-portra-400', 11)).toBe(true)
    expect(hasExpiredLot(lots, 'kodak-portra-400', 9)).toBe(false)
  })
})

describe('백업 알림', () => {
  beforeEach(() => prefs.clear())
  it('기록이 없으면 알리지 않는다', () => expect(backupNudge(false)).toBeNull())
  it('한 번도 백업하지 않았으면 알린다', () => expect(backupNudge(true)).toBe('never'))
  it('14일 안에 백업했으면 알리지 않고, 지나면 지난 날 수를 알린다', () => {
    markFileBackup()
    const t = lastBackupAt()!
    expect(backupNudge(true, t + 13 * DAY)).toBeNull()
    expect(backupNudge(true, t + 20 * DAY)).toBe(20)
  })
  it('드라이브·폴더 백업도 백업으로 친다', () => {
    prefs.set('driveLast', String(100))
    prefs.set('folderLast', String(500))
    expect(lastBackupAt()).toBe(500)
  })
  it('나중에를 누르면 7일 동안 묻지 않는다', () => {
    snoozeBackupNudge()
    expect(backupNudge(true)).toBeNull()
    expect(backupNudge(true, Date.now() + 8 * DAY)).toBe('never')
  })
})

describe('아이폰·웹 백업 합치기', () => {
  it('대소문자만 다른 id는 지금 있는 id로 맞추고, 가리키는 칸도 함께 바꾼다', () => {
    const canon = idCanon([[{ id: 'cam-1' }], [{ id: 'lens-1' }]])
    const roll = remapRow({ id: 'ROLL-1', cameraId: 'CAM-1', lensId: 'LENS-1', lensChanges: [{ lensId: 'LENS-1' }] }, canon)
    expect(roll).toEqual({ id: 'ROLL-1', cameraId: 'cam-1', lensId: 'lens-1', lensChanges: [{ lensId: 'lens-1' }] })
  })
  it('이미 둘로 늘어난 장비를 하나로 합친다', async () => {
    const mem = (rows: Record<string, unknown>[]) => ({
      rows,
      async toArray() { return [...this.rows] },
      async put(r: Record<string, unknown>) { this.rows = [...this.rows.filter((x) => x.id !== r.id), r] },
      async delete(id: string) { this.rows = this.rows.filter((x) => x.id !== id) },
    })
    const tables: Record<string, ReturnType<typeof mem>> = {
      cameras: mem([{ id: 'cam-1', model: 'FM2' }, { id: 'CAM-1', model: 'FM2', note: '아이폰에서' }]),
      lenses: mem([]), filters: mem([]), filmLots: mem([]), customFilms: mem([]), projects: mem([]),
      rolls: mem([{ id: 'r1', cameraId: 'CAM-1' }]),
      frames: mem([]), originals: mem([]),
    }
    await dedupeCaseIds(tables as never)
    const cams = await tables.cameras.toArray()
    expect(cams).toHaveLength(1)
    expect((await tables.rolls.toArray())[0].cameraId).toBe(cams[0].id)
  })
})
