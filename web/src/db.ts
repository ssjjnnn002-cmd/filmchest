import Dexie, { type Table } from 'dexie'
import type { Camera, FilmLot, Frame, GearFilter, Lens, Original, Project, Roll } from './core/types'
import type { CustomFilmRow } from './core/films'

/** 브라우저 안(IndexedDB)에만 저장. 서버로 아무것도 보내지 않는다. */
class FilmchestDB extends Dexie {
  cameras!: Table<Camera, string>
  lenses!: Table<Lens, string>
  rolls!: Table<Roll, string>
  frames!: Table<Frame, string>
  originals!: Table<Original, string>
  zipQueue!: Table<ZipQueueRow, string>
  customFilms!: Table<CustomFilmRow, string>
  cameraPhotos!: Table<CameraPhotoRow, string>
  projects!: Table<Project, string>
  filters!: Table<GearFilter, string>
  filmLots!: Table<FilmLot, string>

  constructor() {
    super('filmchest')
    this.version(1).stores({
      cameras: 'id, sortOrder, createdAt',
      lenses: 'id, mount, createdAt',
      rolls: 'id, cameraId, status, loadedAt, filmId',
      frames: 'id, rollId, [rollId+index]',
      originals: 'frameId, rollId',
    })
    this.version(2).stores({
      cameras: 'id, sortOrder, createdAt',
      lenses: 'id, mount, createdAt',
      rolls: 'id, cameraId, status, loadedAt, filmId',
      frames: 'id, rollId, [rollId+index]',
      originals: 'frameId, rollId',
      zipQueue: 'id, addedAt',
    })
    this.version(3).stores({
      cameras: 'id, sortOrder, createdAt',
      lenses: 'id, mount, createdAt',
      rolls: 'id, cameraId, status, loadedAt, filmId',
      frames: 'id, rollId, [rollId+index]',
      originals: 'frameId, rollId',
      zipQueue: 'id, addedAt',
      customFilms: 'id, createdAt',
    })
    this.version(4).stores({
      cameras: 'id, sortOrder, createdAt',
      lenses: 'id, mount, createdAt',
      rolls: 'id, cameraId, status, loadedAt, filmId',
      frames: 'id, rollId, [rollId+index]',
      originals: 'frameId, rollId',
      zipQueue: 'id, addedAt',
      customFilms: 'id, createdAt',
      cameraPhotos: 'id',
    })
    this.version(5).stores({
      cameras: 'id, sortOrder, createdAt',
      lenses: 'id, mount, createdAt',
      rolls: 'id, cameraId, status, loadedAt, filmId',
      frames: 'id, rollId, [rollId+index]',
      originals: 'frameId, rollId',
      zipQueue: 'id, addedAt',
      customFilms: 'id, createdAt',
      cameraPhotos: 'id',
      projects: 'id, createdAt',
    })
    this.version(6).stores({
      cameras: 'id, sortOrder, createdAt',
      lenses: 'id, mount, createdAt',
      rolls: 'id, cameraId, status, loadedAt, filmId',
      frames: 'id, rollId, [rollId+index]',
      originals: 'frameId, rollId',
      zipQueue: 'id, addedAt',
      customFilms: 'id, createdAt',
      cameraPhotos: 'id',
      projects: 'id, createdAt',
      filters: 'id, createdAt',
      filmLots: 'id, filmId, createdAt',
    })
  }
}

/** 기기 파일로 옮기지 못했을 때의 사진 복사본. 카메라 기록과 따로 둔다. */
export interface CameraPhotoRow {
  id: string
  blob: Blob
}

export interface ZipQueueRow {
  id: string
  name: string
  blob: Blob
  index: number
  total: number
  addedAt: number
}

export const db = new FilmchestDB()

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
  await db.transaction('rw', db.rolls, db.frames, db.originals, async () => {
    await db.frames.where('rollId').equals(id).delete()
    await db.originals.where('rollId').equals(id).delete()
    await db.rolls.delete(id)
  })
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
  const { deleteCameraPhoto } = await import('./photoStore')
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

/** 저장 공간 사용량 (브라우저가 알려 주면) */
export async function storageEstimate() {
  try {
    const e = await navigator.storage?.estimate?.()
    return e ? { used: e.usage ?? 0, quota: e.quota ?? 0 } : undefined
  } catch {
    return undefined
  }
}
