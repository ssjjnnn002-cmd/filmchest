import { db } from './db'
import { uid } from './core/types'
import { thumbnail } from './core/importer'

/** 예시 롤에 앱에 들어 있는 예시 스캔(public/demo)을 붙인다 */
export async function addDemoPhotos(rollId: string, names: string[], takenAt: number, place: string) {
  for (const [i, name] of names.entries()) {
    const res = await fetch(`/demo/${name}`)
    if (!res.ok) continue
    const blob = await res.blob()
    const { thumb, w, h } = await thumbnail(blob)
    const id = uid()
    await db.frames.add({ id, rollId, index: i + 1, thumb, takenAt: takenAt + i * 9e5, locationName: place, favorite: i === 1, w, h, bytes: blob.size, name })
    await db.originals.add({ frameId: id, rollId, blob })
  }
}
