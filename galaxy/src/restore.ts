import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'
// 웹 core/restore.ts (사진·썸네일은 기기 파일)
import { db, restoreRoll } from './data'
import { guessRollFromMeta, readFilmchestMark, readPhotoInfo, rollPatchFromPhotos } from './core/exif'
import { allFilms, filmDisplayName } from './core/films'
import { uid } from './core/types'
import type { Roll } from './core/types'
import { b64ToBytes, bytesToB64, readBytes, writeBytes, copyIn, removeFile } from './files'
import type { PickedFile } from './pick'
import { webTool } from './webTools'

/** 사진을 줄인 썸네일을 파일로 */
export async function thumbOf(bytes: Uint8Array, type: string, name: string, uri?: string) {
  // 파일이 있으면 기기 기능으로 줄인다 (빠르고 메모리를 덜 쓴다). 못 여는 형식이면 아래 방법으로
  if (uri && !/tiff?$/.test(type)) {
    try {
      const ctx = ImageManipulator.manipulate(uri)
      const full = await ctx.renderAsync()
      const w = full.width, h = full.height
      full.release()
      const scale = Math.min(1, 1200 / Math.max(w, h))
      ctx.resize({ width: Math.round(w * scale) })
      const small = await ctx.renderAsync()
      const out = await small.saveAsync({ compress: 0.85, format: SaveFormat.JPEG })
      small.release(); ctx.release()
      const thumb = await copyIn(out.uri, 'thumbs', `${name}.jpg`)
      removeFile(out.uri)
      return { thumb, w, h }
    } catch { /* 아래 방법으로 */ }
  }
  try {
    const r = await webTool<{ data: string; width: number; height: number }>('thumb', { data: bytesToB64(bytes), type, max: 1200, quality: 0.85 })
    return { thumb: writeBytes('thumbs', `${name}.jpg`, b64ToBytes(r.data)), w: r.width, h: r.height }
  } catch {
    return {}
  }
}

/** 이 앱이 저장한 사진의 표식으로 롤을 다시 만든다. */
export async function restorePhotos(files: PickedFile[]) {
  const known = new Map((await db.rolls.toArray()).map((r) => [r.id.toLowerCase(), r.id]))
  const groups = new Map<string, { frame: number; bytes: Uint8Array; type: string; info: ReturnType<typeof readPhotoInfo> }[]>()
  // 표식이 없는 사진: 사진 정보로 짐작한 롤 (같은 카메라·필름·날짜끼리). 웹과 같은 규칙
  const guessed = new Map<string, Partial<Roll>>()
  const hash = (s: string) => { let h = 5381; for (const c of s) h = ((h * 33) ^ c.charCodeAt(0)) >>> 0; return h.toString(36) }
  for (const file of files) {
    const data = await readBytes(file.uri)
    const mark = readFilmchestMark(data)
    // 아이폰은 롤 id를 대문자로 적는다: 이 기기에 있는 같은 롤(소문자 id)에 붙인다
    let rollId = mark ? (known.get(mark.rollId.toLowerCase()) ?? mark.rollId) : undefined
    let frame = mark?.frame
    if (!mark) {
      const g = guessRollFromMeta(data)
      if (!g) continue
      rollId = `meta-${hash(g.key)}`
      if (!guessed.has(rollId)) {
        const film = g.film ? allFilms().find((f) => filmDisplayName(f) === g.film) : undefined
        guessed.set(rollId, {
          filmId: film?.id ?? '', cameraBrand: g.make, cameraModel: g.model, frameCount: g.frameCount,
          loadedAt: g.date ?? Date.now(), days: g.date ? [{ id: uid(), startedAt: g.date, startFrame: 1 }] : [],
        })
      }
      frame = g.frame ?? (groups.get(rollId)?.length ?? 0) + 1
    }
    const list = groups.get(rollId!) ?? []
    list.push({ frame: frame!, bytes: data, type: file.mimeType || 'image/jpeg', info: readPhotoInfo(data) })
    groups.set(rollId!, list)
  }
  let rolls = 0
  let frames = 0
  for (const [rollId, items] of groups) {
    let roll = await db.rolls.get(rollId)
    if (roll?.deletedAt) await restoreRoll(rollId)
    if (!roll) {
      const created: Roll = {
        id: rollId, filmId: '', status: 'imported', loadedAt: Date.now(),
        days: [], locations: [], favorite: false, isArchive: true, frameCount: items.length,
        ...guessed.get(rollId),
      }
      await db.rolls.add(created)
      roll = created
      rolls += 1
    }
    const existing = new Set((await db.frames.where('rollId').equals(rollId).toArray()).map((f) => f.index))
    const added: Parameters<typeof rollPatchFromPhotos>[1] = []
    for (const item of items) {
      if (existing.has(item.frame)) continue
      const id = uid()
      const { thumb, w, h } = await thumbOf(item.bytes, item.type, id)
      const blob = writeBytes('originals', `${id}.jpg`, item.bytes)
      await db.frames.add({
        id, rollId, index: item.frame, thumb, favorite: false, w, h, bytes: item.bytes.length,
        takenAt: item.info.date, locationName: item.info.place,
      })
      added.push({ frame: item.frame, info: item.info, w, h, bytes: item.bytes.length })
      await db.originals.add({ frameId: id, rollId, blob })
      frames += 1
    }
    const count = Math.max(roll.frameCount ?? 0, ...items.map((item) => item.frame))
    await db.rolls.update(rollId, { ...rollPatchFromPhotos(roll, added), frameCount: count, status: 'imported' })
  }
  return { rolls, frames }
}
