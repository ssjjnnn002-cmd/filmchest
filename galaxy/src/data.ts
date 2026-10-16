// 웹 db.ts와 같은 표와 도우미. (저장 방식만 갤럭시용 store.ts)
import type { Camera, FilmLot, Frame, GearFilter, Lens, Original, Project, Roll } from './core/types'
import type { CustomFilmRow } from './core/films'
import { rawSql, Table, transaction } from './store'
import { deleteCameraPhoto, removeFile } from './files'

export interface ZipQueueRow {
  id: string
  name: string
  /** 갤럭시: 앱 폴더에 복사해 둔 zip 경로 */
  blob: string
  index: number
  total: number
  addedAt: number
}

export const db = {
  cameras: new Table<Camera>('cameras'),
  lenses: new Table<Lens>('lenses'),
  rolls: new Table<Roll>('rolls'),
  frames: new Table<Frame>('frames'),
  originals: new Table<Original>('originals', 'frameId'),
  zipQueue: new Table<ZipQueueRow>('zipQueue'),
  customFilms: new Table<CustomFilmRow>('customFilms'),
  projects: new Table<Project>('projects'),
  filters: new Table<GearFilter>('filters'),
  filmLots: new Table<FilmLot>('filmLots'),
  transaction,
}

export const kept = (r: { deletedAt?: number }) => !r.deletedAt
export const cameraKept = (c: { deletedAt?: number }) => !c.deletedAt
const day = 24 * 60 * 60 * 1000

/** 롤에 카메라 이름과 규격을 남긴다. 장비를 지워도 필름 기록은 이 값을 본다. */
export async function rememberCamera(id: string) {
  const camera = await db.cameras.get(id)
  if (!camera) return
  await db.rolls.where('cameraId').equals(id).modify({
    cameraBrand: camera.brand,
    cameraModel: camera.model,
    cameraFormat: camera.format,
    cameraFixedLens: camera.fixedLens,
  })
}

export async function rememberCameras() {
  const cameras = await db.cameras.toArray()
  for (const camera of cameras) await rememberCamera(camera.id)
}

export async function deleteRoll(id: string, permanent = false) {
  if (!permanent) {
    await db.rolls.update(id, { deletedAt: Date.now() })
    return
  }
  for (const o of await db.originals.where('rollId').equals(id).toArray()) removeFile(o.blob)
  for (const f of await db.frames.where('rollId').equals(id).toArray()) removeFile(f.thumb)
  await db.frames.where('rollId').equals(id).delete()
  await db.originals.where('rollId').equals(id).delete()
  await db.rolls.delete(id)
}

export async function restoreRoll(id: string) {
  const roll = await db.rolls.get(id)
  if (!roll) return
  delete roll.deletedAt
  await db.rolls.put(roll)
}

export async function purgeOldRolls() {
  const cutoff = Date.now() - day
  const rolls = await db.rolls.toArray()
  for (const roll of rolls) {
    if (roll.deletedAt && roll.deletedAt < cutoff) await deleteRoll(roll.id, true)
  }
}

/** 장비 목록에서 빼 둔다. 롤의 카메라 연결은 끊지 않는다. */
export async function deleteCamera(id: string) {
  const camera = await db.cameras.get(id)
  if (!camera || camera.deletedAt) return
  await rememberCamera(id)
  await db.cameras.update(id, { deletedAt: Date.now() })
}

export async function restoreCamera(id: string) {
  const camera = await db.cameras.get(id)
  if (!camera) return
  delete camera.deletedAt
  await db.cameras.put(camera)
}

/** 휴지통에서 카메라를 없앤다. 롤에 적어 둔 이름과 규격은 남긴다. */
export async function purgeCamera(id: string) {
  await rememberCamera(id)
  await deleteCameraPhoto(id)
  await db.cameras.delete(id)
}

export async function purgeOldCameras() {
  await rememberCameras()
  const cutoff = Date.now() - day
  const cameras = await db.cameras.toArray()
  for (const camera of cameras) {
    if (camera.deletedAt && camera.deletedAt < cutoff) await purgeCamera(camera.id)
  }
}

// --- 예전 갤럭시 앱 기록 옮기기 (한 번만)

function migrateOldTables() {
  const done = rawSql.getFirstSync<{ value: string }>("SELECT value FROM prefs WHERE key = 'migratedToDocs'")
  if (done) return
  const has = (t: string) => !!rawSql.getFirstSync(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`, t)
  const camerasOld = has('cameras') ? rawSql.getAllSync<any>('SELECT * FROM cameras') : []
  const rollsOld = has('rolls') ? rawSql.getAllSync<any>('SELECT * FROM rolls') : []
  const projectsOld = has('projects') ? rawSql.getAllSync<any>('SELECT * FROM projects') : []
  for (const c of camerasOld) {
    const cam: Camera = {
      id: c.id, brand: c.brand, model: c.model, nickname: c.nickname ?? undefined, format: c.format,
      mount: c.mount ?? undefined, fixedLens: c.fixedLens ?? undefined, style: c.style, styleManual: false, color: '#1C1C1E',
      battery: c.battery ?? undefined, createdAt: c.createdAt, sortOrder: c.sortOrder, deletedAt: c.deletedAt ?? undefined,
      prewind: c.prewind == null ? undefined : c.prewind === 1,
    }
    db.cameras.write(cam)
  }
  const lensByName = new Map<string, string>()
  for (const r of rollsOld) {
    let lensId: string | undefined
    if (r.lensName) {
      lensId = lensByName.get(r.lensName)
      if (!lensId) {
        lensId = `lens-${r.id}`
        const camera = camerasOld.find((c) => c.id === r.cameraId)
        db.lenses.write({ id: lensId, brand: '', model: r.lensName, mount: camera?.mount ?? '', createdAt: r.loadedAt } as Lens)
        lensByName.set(r.lensName, lensId)
      }
    }
    let meterShots
    try { meterShots = r.meterShots ? JSON.parse(r.meterShots) : undefined } catch { meterShots = undefined }
    const roll: Roll = {
      id: r.id, cameraId: r.cameraId ?? undefined, cameraBrand: r.cameraBrand ?? undefined, cameraModel: r.cameraModel ?? undefined,
      cameraFormat: r.cameraFormat ?? undefined, cameraFixedLens: r.cameraFixedLens ?? undefined, lensId,
      filmId: r.filmId, shotISO: r.shotISO ?? undefined, status: r.status, loadedAt: r.loadedAt, finishedAt: r.finishedAt ?? undefined,
      days: [], locations: [], lab: r.lab ?? undefined, droppedAt: r.droppedAt ?? undefined, note: r.note ?? undefined,
      favorite: r.favorite === 1, isArchive: false, frameCount: r.frameCount ?? undefined, deletedAt: r.deletedAt ?? undefined,
      meterShots, meterPrewind: r.meterPrewind == null ? undefined : r.meterPrewind === 1,
    }
    db.rolls.write(roll)
  }
  for (const p of projectsOld) {
    let rollIds: string[] = []
    try { rollIds = JSON.parse(p.rollIds) } catch { rollIds = [] }
    db.projects.write({ id: p.id, name: p.name, memo: p.memo ?? undefined, color: p.color, archived: p.archived === 1, createdAt: p.createdAt, rollIds })
  }
  rawSql.runSync("INSERT OR REPLACE INTO prefs (key, value) VALUES ('migratedToDocs', '1')")
}
migrateOldTables()
