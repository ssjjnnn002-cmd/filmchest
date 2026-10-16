// 자동 복사: web/src/seed.ts (node scripts/sync-galaxy-core.mjs). 여기서 고치지 말 것.
import { db } from './data'
import { uid } from './core/types'
import type { Camera, Roll } from './core/types'

/** 처음 열었을 때 둘러볼 수 있는 예시 (이름에 '예시'를 붙여 실제 기록과 구분) */
export async function seedExample() {
  const now = Date.now()
  const x700: Camera = {
    id: uid(), brand: 'Minolta', model: 'X-700', nickname: '예시', format: '135', mount: 'Minolta MD',
    style: 'slr', styleManual: false, color: '#1C1C1E', battery: 'SR44 ×2', createdAt: now, sortOrder: 1,
  }
  const rc: Camera = {
    id: uid(), brand: 'Olympus', model: '35 RC', nickname: '예시', format: '135', fixedLens: 'Zuiko 42mm f/2.8',
    style: 'rangefinder', styleManual: false, color: '#C9C9C4', battery: 'PX625 (1.35V)', createdAt: now + 1, sortOrder: 2,
  }
  const day = (d: string) => new Date(d).getTime()
  const loaded: Roll = {
    id: uid(), cameraId: x700.id, filmId: 'kodak-portra-400', status: 'loaded', loadedAt: now - 3 * 864e5,
    days: [{ id: uid(), startedAt: now - 3 * 864e5, startFrame: 1 }],
    locations: [{ id: uid(), startFrame: 1, name: '망원동', point: { latitude: 37.5556, longitude: 126.9019 } }],
    favorite: false, isArchive: false, note: '예시 롤',
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
    favorite: false, isArchive: false, note: '예시 롤',
  }
  await db.transaction('rw', db.cameras, db.rolls, async () => {
    await db.cameras.bulkAdd([x700, rc])
    await db.rolls.bulkAdd([loaded, atLab])
  })
}
