// 웹 core/importer.ts + zip.ts readFiles (사진·썸네일은 기기 파일)
import JSZip from 'jszip'
import { db } from './data'
import type { Camera, Frame, Lens, Original, Roll } from './core/types'
import { uid } from './core/types'
import { buildTimeline } from './core/timeline'
import { formatFamily, isScanImage, isZipFile, readZip, type ScanResult, type ScanSet } from './core/zip'
import { readScanner, writeMeta } from './core/exif'
import { filmById } from './core/films'
import { meterShotAt } from './core/meter'
import { readBytes, removeFile, writeBytes } from './files'
import type { PickedFile } from './pick'
import { thumbOf } from './restore'

export interface ImportProgress {
  done: number
  total: number
}

const mime = (type: string) =>
  type === 'png' ? 'image/png' : type === 'tif' || type === 'tiff' ? 'image/tiff' : type === 'heic' ? 'image/heic' : 'image/jpeg'

/** 낱장 파일들 (zip이 섞여 있으면 zip 우선) */
export async function readFiles(list: PickedFile[]): Promise<ScanResult> {
  const zip = list.find((f) => isZipFile({ name: f.name, type: f.mimeType })) ?? (
    list.length === 1 && !(list[0].mimeType ?? '').startsWith('image/') && !isScanImage(list[0].name) ? list[0] : undefined
  )
  if (zip) return readZip(await readBytes(zip.uri))
  const images = list.filter((f) => isScanImage(f.name) || (f.mimeType ?? '').startsWith('image/'))
  const files = await Promise.all(images.map(async (f) => ({ name: f.name, data: await readBytes(f.uri) })))
  if (files.length === 0) throw new Error('사진 파일이 없어요.')
  // 웹 group()과 같은 묶음 (zip.ts readZip이 쓰는 것을 그대로 쓰려고 작은 zip으로 감싸지 않고 바로 묶는다)
  const z = new JSZip()
  for (const f of files) z.file(f.name, f.data)
  return readZip(await z.generateAsync({ type: 'uint8array', compression: 'STORE' }))
}

/**
 * 스캔 묶음에 촬영 정보를 써 넣고 롤에 저장한다.
 * 결과물(메타데이터 기록본)은 originals에 보관해서 나중에 다시 내려받을 수 있다.
 */
export async function importScans(
  set: ScanSet,
  roll: Roll,
  camera: Camera | undefined,
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
    const id = uid()
    const blob = writeBytes('originals', `${id}.${f.type || 'jpg'}`, data)
    const { thumb, w, h } = await thumbOf(data, mime(f.type), id)
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

  // 예전 스캔 파일은 지운다
  for (const o of await db.originals.where('rollId').equals(roll.id).toArray()) removeFile(o.blob)
  for (const fr of await db.frames.where('rollId').equals(roll.id).toArray()) removeFile(fr.thumb)
  await db.frames.where('rollId').equals(roll.id).delete()
  await db.originals.where('rollId').equals(roll.id).delete()
  await db.frames.bulkAdd(frames)
  await db.originals.bulkAdd(originals)
  await db.rolls.put(updated)
  return updated
}

/** 갤러리에 넣을 사진 파일. 촬영 순서대로 01, 02 … */
export async function rollImageFiles(rollId: string): Promise<{ uri: string; name: string }[]> {
  const frames = await db.frames.where('rollId').equals(rollId).sortBy('index')
  const out: { uri: string; name: string }[] = []
  for (const frame of frames) {
    const original = await db.originals.get(frame.id)
    if (!original) continue
    const ext = (frame.name?.split('.').pop() ?? 'jpg').toLowerCase().replace('jpeg', 'jpg')
    out.push({ uri: original.blob, name: `${String(frame.index).padStart(2, '0')}.${ext}`.replace(/[/\\:]/g, '-') })
  }
  return out
}

/** 롤의 사진을 zip 하나로 (촬영 순서대로 01, 02 …) */
export async function rollZip(roll: { id: string }): Promise<Uint8Array> {
  const zip = new JSZip()
  for (const f of await rollImageFiles(roll.id)) zip.file(f.name, await readBytes(f.uri))
  return zip.generateAsync({ type: 'uint8array', compression: 'STORE' })
}
