import { db, restoreRoll } from '../db'
import { readFilmchestMark } from './exif'
import { uid } from './types'
import type { Roll } from './types'

async function thumbOf(blob: Blob) {
  try {
    const full = await createImageBitmap(blob)
    const w = full.width
    const h = full.height
    const scale = Math.min(1, 1200 / Math.max(w, h))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(w * scale)
    canvas.height = Math.round(h * scale)
    canvas.getContext('2d')!.drawImage(full, 0, 0, canvas.width, canvas.height)
    full.close()
    const thumb = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85))
    return { thumb: thumb ?? undefined, w, h }
  } catch {
    return {}
  }
}

/** 이 앱이 저장한 사진의 표식으로 롤을 다시 만든다. */
export async function restorePhotos(files: File[]) {
  const groups = new Map<string, { frame: number; blob: Blob }[]>()
  for (const file of files) {
    const data = new Uint8Array(await file.arrayBuffer())
    const mark = readFilmchestMark(data)
    if (!mark) continue
    const list = groups.get(mark.rollId) ?? []
    list.push({ frame: mark.frame, blob: new Blob([data], { type: file.type || 'image/jpeg' }) })
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
      const { thumb, w, h } = await thumbOf(item.blob)
      await db.frames.add({
        id, rollId, index: item.frame, thumb, favorite: false, w, h, bytes: item.blob.size,
      })
      await db.originals.add({ frameId: id, rollId, blob: item.blob })
      frames += 1
    }
    const count = Math.max(roll.frameCount ?? 0, ...items.map((item) => item.frame))
    await db.rolls.update(rollId, { frameCount: count, status: 'imported' })
  }
  return { rolls, frames }
}
