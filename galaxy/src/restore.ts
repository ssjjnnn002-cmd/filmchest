// 웹 core/restore.ts (사진·썸네일은 기기 파일)
import { db, restoreRoll } from './data'
import { readFilmchestMark } from './core/exif'
import { uid } from './core/types'
import type { Roll } from './core/types'
import { b64ToBytes, bytesToB64, readBytes, writeBytes } from './files'
import type { PickedFile } from './pick'
import { webTool } from './webTools'

/** 사진을 줄인 썸네일을 파일로 */
export async function thumbOf(bytes: Uint8Array, type: string, name: string) {
  try {
    const r = await webTool<{ data: string; width: number; height: number }>('thumb', { data: bytesToB64(bytes), type, max: 1200, quality: 0.85 })
    return { thumb: writeBytes('thumbs', `${name}.jpg`, b64ToBytes(r.data)), w: r.width, h: r.height }
  } catch {
    return {}
  }
}

/** 이 앱이 저장한 사진의 표식으로 롤을 다시 만든다. */
export async function restorePhotos(files: PickedFile[]) {
  const groups = new Map<string, { frame: number; bytes: Uint8Array; type: string }[]>()
  for (const file of files) {
    const data = await readBytes(file.uri)
    const mark = readFilmchestMark(data)
    if (!mark) continue
    const list = groups.get(mark.rollId) ?? []
    list.push({ frame: mark.frame, bytes: data, type: file.mimeType || 'image/jpeg' })
    groups.set(mark.rollId, list)
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
      }
      await db.rolls.add(created)
      roll = created
      rolls += 1
    }
    const existing = new Set((await db.frames.where('rollId').equals(rollId).toArray()).map((f) => f.index))
    for (const item of items) {
      if (existing.has(item.frame)) continue
      const id = uid()
      const { thumb, w, h } = await thumbOf(item.bytes, item.type, id)
      const blob = writeBytes('originals', `${id}.jpg`, item.bytes)
      await db.frames.add({
        id, rollId, index: item.frame, thumb, favorite: false, w, h, bytes: item.bytes.length,
      })
      await db.originals.add({ frameId: id, rollId, blob })
      frames += 1
    }
    const count = Math.max(roll.frameCount ?? 0, ...items.map((item) => item.frame))
    await db.rolls.update(rollId, { frameCount: count, status: 'imported' })
  }
  return { rolls, frames }
}
