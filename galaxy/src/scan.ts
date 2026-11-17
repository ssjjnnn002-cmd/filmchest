// 웹 core/importer.ts + zip.ts readFiles (사진·썸네일은 기기 파일)
import JSZip from 'jszip'
import { db } from './data'
import type { Camera, Frame, Lens, Original, Roll } from './core/types'
import { lensIdAt, uid } from './core/types'
import { buildTimeline } from './core/timeline'
import { formatFamily, isScanImage, isZipFile, readZip, type ScanResult, type ScanSet } from './core/zip'
import { readScanner, withRotation, writeMeta } from './core/exif'
import { webTool } from './webTools'
import { b64ToBytes, bytesToB64 } from './files'
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
    out.push({ uri: await rotatedFile(original.blob, frame.rotation, frame.id), name: `${String(frame.index).padStart(2, '0')}.${ext}`.replace(/[/\\:]/g, '-') })
  }
  return out
}

/** 롤의 사진을 zip 하나로 (촬영 순서대로 01, 02 …) */
export async function rollZip(roll: { id: string }): Promise<Uint8Array> {
  const zip = new JSZip()
  for (const f of await rollImageFiles(roll.id)) zip.file(f.name, await readBytes(f.uri))
  return zip.generateAsync({ type: 'uint8array', compression: 'STORE' })
}

/** 돌린 방향을 반영한 사진 파일 (JPEG는 방향 정보만 바꾼다. 원본 파일은 그대로) */
export async function rotatedFile(uri: string, turns: number | undefined, id: string) {
  const t = (((turns ?? 0) % 4) + 4) % 4
  if (!t) return uri
  const data = await readBytes(uri)
  const out = withRotation(data, t)
  return out === data ? uri : writeBytes('rotated', `${id}-${t}.jpg`, out)
}

/** 화면에 보일 돌린 사진 (픽셀을 돌린 미리보기, 한 번 만들면 다시 쓴다) */
export async function rotatedForView(uri: string, turns: number, id: string) {
  const name = `${id}-view-${turns}.jpg`
  const { File } = await import('expo-file-system')
  const { folder } = await import('./files')
  const f = new File(folder('rotated'), name)
  if (f.exists) return f.uri
  const data = await readBytes(uri)
  const out = await webTool<string>('rotate', { data: bytesToB64(data), type: 'image/jpeg', turns, max: 3200 })
  return writeBytes('rotated', name, b64ToBytes(out))
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
    const data = writeMeta(await readBytes(original.blob), {
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
    writeBytes('originals', original.blob.split('/').pop() ?? `${fr.id}.jpg`, data)
    await db.frames.update(fr.id, { takenAt: dateUnknown ? fr.takenAt : info.date, locationName: info.location?.name, metaAt: now })
    changed += 1
  }
  return changed
}
