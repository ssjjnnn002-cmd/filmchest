import { db } from './db'
import { uid } from './core/types'
import type { Camera, FilmLot, GearFilter, Lens, MeterShot, Project, Roll } from './core/types'
import { addDemoPhotos } from './demoPhotos'

/** 처음 열었을 때 둘러볼 수 있는 예시. 장비·필름 재고·롤 네 단계·사진·노출 기록·프로젝트까지 거의 모든 기능을 눌러 볼 수 있게.
 *  (카메라 별명과 롤 메모에 '예시'를 붙여 실제 기록과 구분) */
export async function seedExample() {
  const now = Date.now()
  const d = 864e5
  const day = (s: string) => new Date(s).getTime()

  // --- 장비
  const x700: Camera = {
    id: uid(), brand: 'Minolta', model: 'X-700', nickname: '예시', format: '135', mount: 'Minolta MD',
    style: 'slr', styleManual: false, color: '#1C1C1E', battery: 'SR44 ×2', batteryAt: now - 120 * d, tags: ['SLR'],
    purchasedAt: day('2025-03-14T12:00:00'), price: '180,000', seller: '중고 카메라 가게', createdAt: now, sortOrder: 1,
  }
  const rc: Camera = {
    id: uid(), brand: 'Olympus', model: '35 RC', nickname: '예시', format: '135', fixedLens: 'Zuiko 42mm f/2.8',
    style: 'rangefinder', styleManual: false, color: '#C9C9C4', battery: 'PX625 (1.35V)', tags: ['RF'],
    purchasedAt: day('2025-06-02T12:00:00'), price: '150,000', seller: '중고 거래', createdAt: now + 1, sortOrder: 2,
  }
  const xa: Camera = {
    id: uid(), brand: 'Olympus', model: 'XA', nickname: '예시', format: '135', fixedLens: 'F.Zuiko 35mm f/2.8',
    style: 'compact', styleManual: false, color: '#1C1C1E', battery: 'SR44 ×2', tags: ['똑딱이'],
    purchasedAt: day('2025-09-10T12:00:00'), price: '120,000', seller: '중고 거래', createdAt: now + 2, sortOrder: 3,
  }
  const lens50: Lens = {
    id: uid(), brand: 'Minolta', model: 'MD Rokkor 50mm f/1.7', mount: 'Minolta MD', focalMin: 50, focalMax: 50,
    apertureOpen: '1.7', apertureClose: '16', price: '40,000', purchasedAt: day('2025-03-14T12:00:00'), createdAt: now,
  }
  const lens28: Lens = {
    id: uid(), brand: 'Minolta', model: 'MD 28mm f/2.8', mount: 'Minolta MD', focalMin: 28, focalMax: 28,
    apertureOpen: '2.8', apertureClose: '22', price: '60,000', purchasedAt: day('2025-08-21T12:00:00'), tags: ['광각'], createdAt: now + 1,
  }
  const uv: GearFilter = { id: uid(), kind: '필터', name: 'UV', diameter: '55', price: '15,000', createdAt: now }
  const y2: GearFilter = { id: uid(), kind: '필터', name: 'Y2', diameter: '55', glass: 'yellow', price: '22,000', tags: ['흑백'], createdAt: now + 1 }
  const nd: GearFilter = { id: uid(), kind: '필터', name: 'ND8', diameter: '55', glass: 'nd', price: '28,000', createdAt: now + 2 }
  const strap: GearFilter = { id: uid(), kind: '스트랩', name: '가죽 스트랩', price: '25,000', createdAt: now + 3 }
  x700.accessoryIds = [uv.id, y2.id, nd.id, strap.id]
  x700.lensIds = [lens50.id, lens28.id]

  // --- 필름 재고 (넉넉함 · 부족 · 기한 지남)
  const lots: FilmLot[] = [
    { id: uid(), filmId: 'kodak-portra-400', format: '135', count: 4, lowAt: 1, storage: 'fridge', expiresAt: now + 400 * d, price: '23,000', createdAt: now },
    { id: uid(), filmId: 'ilford-hp5-plus', format: '135', count: 1, lowAt: 2, storage: 'drawer', expiresAt: now + 700 * d, price: '14,000', createdAt: now + 1 },
    { id: uid(), filmId: 'kodak-gold-200', format: '135', count: 2, lowAt: 1, storage: 'room', expiresAt: now - 40 * d, price: '13,000', createdAt: now + 2 },
  ]

  // --- 롤 네 단계
  const shot = (pos: number, aperture: number, shutter: number, ev: number, extra: Partial<MeterShot> = {}): MeterShot => ({
    pos, order: pos, mode: 'A', aperture, shutter, comp: 0, flash: false, ev, focal: 50, at: new Date(now - 2 * d + pos * 6e5).toISOString(), edited: false, ...extra,
  })
  const loaded: Roll = {
    id: uid(), cameraId: x700.id, lensId: lens50.id, filmId: 'kodak-portra-400', status: 'loaded', loadedAt: now - 3 * d,
    lensChanges: [{ id: uid(), startFrame: 9, lensId: lens28.id }],
    meterShots: [
      shot(1, 5.6, 1 / 250, 13), shot(2, 8, 1 / 125, 13, { filters: ['UV'] }), shot(3, 2.8, 1 / 60, 9, { memo: '골목 그늘' }),
      shot(9, 11, 1 / 500, 15, { focal: 28, tags: ['풍경'] }),
    ],
    days: [{ id: uid(), startedAt: now - 3 * d, startFrame: 1 }, { id: uid(), startedAt: now - 1 * d, startFrame: 9 }],
    locations: [
      { id: uid(), startFrame: 1, name: '망원동', point: { latitude: 37.5556, longitude: 126.9019 }, weather: { code: 1, temperature: 17 } },
      { id: uid(), startFrame: 9, name: '한강공원', point: { latitude: 37.5531, longitude: 126.8960 }, weather: { code: 0, temperature: 19 } },
    ],
    favorite: false, isArchive: false, note: '예시 롤 · 컷마다 상세 기록이 있어요',
  }
  const finished: Roll = {
    id: uid(), cameraId: xa.id, filmId: 'kodak-gold-200', status: 'finished', loadedAt: day('2026-10-05T10:00:00'), finishedAt: day('2026-10-19T18:00:00'),
    days: [{ id: uid(), startedAt: day('2026-10-05T10:00:00'), startFrame: 1 }],
    locations: [{ id: uid(), startFrame: 1, name: '연남동', point: { latitude: 37.5626, longitude: 126.9254 } }],
    favorite: false, isArchive: false, note: '예시 롤 · 현상소를 골라 보세요',
  }
  const atLab: Roll = {
    id: uid(), cameraId: rc.id, filmId: 'ilford-hp5-plus', status: 'atLab', loadedAt: day('2026-09-20T11:00:00'),
    days: [
      { id: uid(), startedAt: day('2026-09-20T11:00:00'), startFrame: 1 },
      { id: uid(), startedAt: day('2026-09-27T15:30:00'), startFrame: 19 },
    ],
    locations: [
      { id: uid(), startFrame: 1, name: '성수동', point: { latitude: 37.5446, longitude: 127.0559 } },
      { id: uid(), startFrame: 19, name: '서울숲', point: { latitude: 37.5444, longitude: 127.0374 }, memo: '산책' },
    ],
    lab: '예시 현상소', droppedAt: day('2026-10-01T10:00:00'), finishedAt: day('2026-10-01T10:00:00'),
    favorite: false, isArchive: false, note: '예시 롤 · 스캔을 불러와 보세요',
  }
  const imported: Roll = {
    id: uid(), cameraId: x700.id, lensId: lens50.id, filmId: 'ilford-hp5-plus', status: 'imported', loadedAt: day('2026-08-09T10:00:00'),
    title: '망원동 산책', tags: ['흑백', '동네'], favorite: true, isArchive: false, coverIndex: 2,
    note: '예시 롤 · 사진을 눌러 크게 보고, 밀착 인화·액자로 저장도 해 보세요', noteInList: true,
    days: [{ id: uid(), startedAt: day('2026-08-09T10:00:00'), startFrame: 1 }],
    locations: [{ id: uid(), startFrame: 1, name: '망원동', point: { latitude: 37.5556, longitude: 126.9019 }, weather: { code: 2, temperature: 27 } }],
    lab: '예시 현상소', droppedAt: day('2026-08-12T10:00:00'), finishedAt: day('2026-08-11T20:00:00'), importedAt: day('2026-08-16T12:00:00'),
    scanner: 'Noritsu HS-1800', frameCount: 36,
  }
  const project: Project = { id: uid(), name: '동네 기록', memo: '예시 프로젝트', color: 3, archived: false, createdAt: now, rollIds: [imported.id, atLab.id] }

  await db.transaction('rw', [db.cameras, db.lenses, db.filters, db.filmLots, db.rolls, db.projects], async () => {
    await db.cameras.bulkAdd([x700, rc, xa])
    await db.lenses.bulkAdd([lens50, lens28])
    await db.filters.bulkAdd([uv, y2, nd, strap])
    await db.filmLots.bulkAdd(lots)
    await db.rolls.bulkAdd([loaded, finished, atLab, imported])
    await db.projects.add(project)
  })
  // 스캔 사진 (앱에 들어 있는 예시 사진). 실패해도 나머지 예시는 그대로
  await addDemoPhotos(imported.id, ['hp5-01.jpg', 'hp5-02.jpg', 'hp5-03.jpg', 'hp5-04.jpg', 'hp5-05.jpg', 'hp5-06.jpg', 'hp5-07.jpg'],
    day('2026-08-09T10:00:00'), '망원동').catch(() => {})
}
