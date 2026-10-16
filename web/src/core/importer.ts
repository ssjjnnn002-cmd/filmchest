import JSZip from 'jszip'
import { db } from '../db'
import type { Camera, Frame, Lens, Original, Roll } from './types'
import { uid } from './types'
import { buildTimeline } from './timeline'
import type { ScanSet } from './zip'
import { formatFamily } from './zip'
import { readScanner, writeMeta } from './exif'
import { filmById } from './films'
import { meterShotAt } from './meter'

export interface ImportProgress {
  done: number
  total: number
}

async function thumbnail(blob: Blob, max = 1200): Promise<{ thumb?: Blob; w?: number; h?: number }> {
  try {
    const full = await createImageBitmap(blob)
    const w = full.width, h = full.height
    const scale = Math.min(1, max / Math.max(w, h))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(w * scale)
    canvas.height = Math.round(h * scale)
    canvas.getContext('2d')!.drawImage(full, 0, 0, canvas.width, canvas.height)
    full.close()
    const thumb = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.85))
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
  const timeline = buildTimeline(roll, files.length)
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
      iso: roll.shotISO ?? film?.iso,
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
    files.push(new File([original.blob], name, { type }))
  }
  return files
}

/** 롤의 사진을 zip 하나로 (촬영 순서대로 01, 02 …) */
export async function rollZip(roll: { id: string }): Promise<Blob> {
  const frames = await db.frames.where('rollId').equals(roll.id).sortBy('index')
  const zip = new JSZip()
  for (const f of frames) {
    const o = await db.originals.get(f.id)
    if (!o) continue
    const ext = (f.name?.split('.').pop() ?? 'jpg').toLowerCase()
    zip.file(`${String(f.index).padStart(2, '0')}.${ext}`, o.blob)
  }
  return zip.generateAsync({ type: 'blob', compression: 'STORE' })
}
