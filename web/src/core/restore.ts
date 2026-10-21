import { db, restoreRoll } from '../db'
import { guessRollFromMeta, readFilmchestMark, readPhotoInfo, rollPatchFromPhotos } from './exif'
import { allFilms, filmDisplayName } from './films'
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
  const groups = new Map<string, { frame: number; blob: Blob; info: ReturnType<typeof readPhotoInfo> }[]>()
  // 표식이 없는 사진: 사진 정보로 짐작한 롤 (같은 카메라·필름·날짜끼리)
  const guessed = new Map<string, Partial<Roll>>()
  const hash = (s: string) => { let h = 5381; for (const c of s) h = ((h * 33) ^ c.charCodeAt(0)) >>> 0; return h.toString(36) }
  for (const file of files) {
    const data = new Uint8Array(await file.arrayBuffer())
    const blob = new Blob([data], { type: file.type || 'image/jpeg' })
    const mark = readFilmchestMark(data)
    let rollId = mark?.rollId
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
    list.push({ frame: frame!, blob, info: readPhotoInfo(data) })
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
      const { thumb, w, h } = await thumbOf(item.blob)
      await db.frames.add({
        id, rollId, index: item.frame, thumb, favorite: false, w, h, bytes: item.blob.size,
        takenAt: item.info.date, locationName: item.info.place,
      })
      added.push({ frame: item.frame, info: item.info, w, h, bytes: item.blob.size })
      await db.originals.add({ frameId: id, rollId, blob: item.blob })
      frames += 1
    }
    const count = Math.max(roll.frameCount ?? 0, ...items.map((item) => item.frame))
    await db.rolls.update(rollId, { ...rollPatchFromPhotos(roll, added), frameCount: count, status: 'imported' })
  }
  return { rolls, frames }
}
