import JSZip from 'jszip'
import { db } from '../db'
import type { Camera, Frame, Lens, Original, Roll } from './types'
import { lensIdAt, uid } from './types'
import { buildTimeline } from './timeline'
import type { ScanSet } from './zip'
import { formatFamily } from './zip'
import { readScanner, withRotation, writeMeta } from './exif'
import { filmById } from './films'
import { meterShotAt } from './meter'

export interface ImportProgress {
  done: number
  total: number
}

// 미리보기용 캔버스는 하나를 돌려 쓰고, 다 쓰면 크기를 0으로 줄여 메모리를 돌려준다.
// (아이폰 Safari는 캔버스 메모리 한도가 작아서, 캔버스를 장마다 새로 만들면 몇십 장 뒤부터 미리보기가 비어 버린다)
let thumbCanvas: HTMLCanvasElement | undefined

/** 사진 미리보기 (긴 변 max) */
export async function thumbnail(blob: Blob, max = 1200): Promise<{ thumb?: Blob; w?: number; h?: number }> {
  try {
    const full = await createImageBitmap(blob)
    const w = full.width, h = full.height
    const scale = Math.min(1, max / Math.max(w, h))
    const canvas = (thumbCanvas ??= document.createElement('canvas'))
    canvas.width = Math.round(w * scale)
    canvas.height = Math.round(h * scale)
    canvas.getContext('2d')!.drawImage(full, 0, 0, canvas.width, canvas.height)
    full.close()
    const thumb = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.85))
    canvas.width = 0
    canvas.height = 0
    return { thumb: thumb ?? undefined, w, h }
  } catch {
    return {} // 브라우저가 못 여는 형식(TIFF 등)
  }
}

const mime = (type: string) =>
  type === 'png' ? 'image/png' : type === 'tif' || type === 'tiff' ? 'image/tiff' : type === 'heic' ? 'image/heic' : 'image/jpeg'

/**
 * 스캔 묶음에 촬영 정보를 써 넣고 롤에 저장한다.
 * 결과물(메타데이터 기록본)은 originals에 보관해서 나중에 다시 내려받을 수 있다.
 */
export async function importScans(
  set: ScanSet,
  roll: Roll,
  camera: Camera | undefined,
  /** n번 컷에 끼운 렌즈 (중간에 바꿔 낀 경우까지) */
  lensAt: (frame: number) => Lens | undefined,
  onProgress: (p: ImportProgress) => void,
  /** 노출 기록을 스캔 번호에서 몇 칸 밀지. +1이면 1번 기록이 2번 사진 */
  meterOffset = 0,
): Promise<Roll> {
  const files = set.files
  // 상세 기록한 컷은 그 컷의 시간·장소로 (번호 맞추기 값은 지금 고른 값)
  const timeline = buildTimeline({ ...roll, meterOffset }, files.length)
  const dateUnknown = roll.isArchive && roll.days.length === 0
  const scanner = roll.scanner ?? readScanner(files[0].data).name
  const film = filmById(roll.filmId)

  const frames: Frame[] = []
  const originals: Original[] = []
  let bytes = 0
  const sizes = new Map<string, number>()

  for (const f of files) {
    const info = timeline[f.index - 1]
    const data = writeMeta(f.data, {
      frame: f.index,
      frameCount: files.length,
      date: dateUnknown ? undefined : info.date,
      locationName: info.location?.name || undefined,
      memo: info.location?.memo,
      point: info.location?.point,
      cameraBrand: camera?.brand ?? roll.cameraBrand,
      cameraModel: camera?.model ?? roll.cameraModel,
      lens: ((l) => (l ? `${l.brand} ${l.model}`.trim() : camera?.fixedLens ?? roll.cameraFixedLens))(lensAt(f.index)),
      film,
      iso: meterShotAt(roll.meterShots, f.index, meterOffset)?.iso ?? roll.shotISO ?? film?.iso,
      lab: roll.lab,
      scanner,
      rollId: roll.id,
      exposure: meterShotAt(roll.meterShots, f.index, meterOffset),
    })
    const blob = new Blob([data], { type: mime(f.type) })
    const { thumb, w, h } = await thumbnail(blob)
    const id = uid()
    frames.push({
      id, rollId: roll.id, index: f.index, thumb, takenAt: dateUnknown ? undefined : info.date,
      locationName: info.location?.name, favorite: false, w, h, bytes: data.byteLength,
      name: f.name.split('/').pop(),
    })
    originals.push({ frameId: id, rollId: roll.id, blob })
    bytes += data.byteLength
    if (w && h) sizes.set(`${w}x${h}`, (sizes.get(`${w}x${h}`) ?? 0) + 1)
    onProgress({ done: f.index, total: files.length })
  }

  const common = [...sizes.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
  const [scanW, scanH] = common ? common.split('x').map(Number) : [undefined, undefined]
  const updated: Roll = {
    ...roll,
    status: 'imported',
    importedAt: Date.now(),
    frameCount: files.length,
    scanner,
    scanW, scanH,
    scanFormat: formatFamily(files[0].name),
    scanBytes: bytes,
    meterOffset,
  }

  await db.transaction('rw', db.rolls, db.frames, db.originals, async () => {
    await db.frames.where('rollId').equals(roll.id).delete()
    await db.originals.where('rollId').equals(roll.id).delete()
    await db.frames.bulkAdd(frames)
    await db.originals.bulkAdd(originals)
    await db.rolls.put(updated)
  })
  return updated
}

/** 갤러리 공유 창에 넣을 사진 파일. 촬영 순서대로 01, 02 … */
export async function rollImageFiles(rollId: string): Promise<File[]> {
  const frames = await db.frames.where('rollId').equals(rollId).sortBy('index')
  const files: File[] = []
  for (const frame of frames) {
    const original = await db.originals.get(frame.id)
    if (!original) continue
    const ext = (frame.name?.split('.').pop() ?? 'jpg').toLowerCase().replace('jpeg', 'jpg')
    const type = original.blob.type.startsWith('image/') ? original.blob.type : ext === 'png' ? 'image/png' : 'image/jpeg'
    const name = `${String(frame.index).padStart(2, '0')}.${ext}`.replace(/[/\\:]/g, '-')
    files.push(new File([await rotatedBlob(original.blob, frame.rotation)], name, { type }))
  }
  return files
}

/** 돌린 방향을 반영한 사진 (JPEG는 방향 정보만 바꾼다) */
export async function rotatedBlob(blob: Blob, turns?: number): Promise<Blob> {
  if (!turns || turns % 4 === 0) return blob
  const data = new Uint8Array(await blob.arrayBuffer())
  return new Blob([withRotation(data, turns) as BlobPart], { type: blob.type || 'image/jpeg' })
}

/** 롤의 사진을 zip 하나로 (촬영 순서대로 01, 02 …) */
export async function rollZip(roll: { id: string }): Promise<Blob> {
  const frames = await db.frames.where('rollId').equals(roll.id).sortBy('index')
  const zip = new JSZip()
  for (const f of frames) {
    const o = await db.originals.get(f.id)
    if (!o) continue
    const ext = (f.name?.split('.').pop() ?? 'jpg').toLowerCase()
    zip.file(`${String(f.index).padStart(2, '0')}.${ext}`, await rotatedBlob(o.blob, f.rotation))
  }
  return zip.generateAsync({ type: 'blob', compression: 'STORE' })
}

/** 촬영일·장소를 고친 뒤: 저장해 둔 사진 속 날짜·위치 정보를 새 기록으로 다시 쓴다.
 *  드라이브에 올린 사진은 다음 백업 때 새 정보의 사진으로 바뀐다. 바꾼 장 수를 돌려준다. */
export async function refreshRollPhotoMeta(rollId: string): Promise<number> {
  const roll = await db.rolls.get(rollId)
  if (!roll || roll.status !== 'imported') return 0
  const frames = await db.frames.where('rollId').equals(rollId).toArray()
  if (!frames.length) return 0
  const camera = roll.cameraId ? await db.cameras.get(roll.cameraId) : undefined
  const lenses = new Map((await db.lenses.toArray()).map((l) => [l.id, l]))
  const count = Math.max(roll.frameCount ?? 0, ...frames.map((f) => f.index))
  const timeline = buildTimeline(roll, count)
  const dateUnknown = roll.isArchive && roll.days.length === 0
  const film = filmById(roll.filmId)
  const now = Date.now()
  let changed = 0
  for (const fr of frames) {
    const original = await db.originals.get(fr.id)
    const info = timeline[fr.index - 1]
    if (!original || !info) continue
    const lensId = meterShotAt(roll.meterShots, fr.index, roll.meterOffset ?? 0)?.lensId ?? lensIdAt(roll, fr.index)
    const lens = lensId ? lenses.get(lensId) : undefined
    const data = writeMeta(new Uint8Array(await original.blob.arrayBuffer()), {
      frame: fr.index,
      frameCount: count,
      date: dateUnknown ? undefined : info.date,
      locationName: info.location?.name || undefined,
      memo: info.location?.memo,
      point: info.location?.point,
      cameraBrand: camera?.brand ?? roll.cameraBrand,
      cameraModel: camera?.model ?? roll.cameraModel,
      lens: lens ? `${lens.brand} ${lens.model}`.trim() : camera?.fixedLens ?? roll.cameraFixedLens,
      film,
      iso: meterShotAt(roll.meterShots, fr.index, roll.meterOffset ?? 0)?.iso ?? roll.shotISO ?? film?.iso,
      lab: roll.lab,
      scanner: roll.scanner,
      rollId: roll.id,
      exposure: meterShotAt(roll.meterShots, fr.index, roll.meterOffset ?? 0),
      replace: true,
    })
    await db.originals.put({ ...original, blob: new Blob([data], { type: original.blob.type || 'image/jpeg' }) })
    await db.frames.update(fr.id, { takenAt: dateUnknown ? fr.takenAt : info.date, locationName: info.location?.name, metaAt: now })
    changed += 1
  }
  return changed
}
