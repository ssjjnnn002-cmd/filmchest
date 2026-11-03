// 웹 demoPhotos.ts — 예시 롤에 예시 스캔을 붙인다 (갤럭시는 웹앱 주소에서 받아 기기 파일로)
import * as FS from 'expo-file-system/legacy'
import { db } from './data'
import { uid } from './core/types'
import { folder, readBytes } from './files'
import { thumbOf } from './restore'

const SITE = 'https://filmchest.pages.dev'

export async function addDemoPhotos(rollId: string, names: string[], takenAt: number, place: string) {
  const dir = folder('originals').uri.replace(/\/?$/, '/')
  for (const [i, name] of names.entries()) {
    const id = uid()
    const r = await FS.downloadAsync(`${SITE}/demo/${name}`, `${dir}${id}.jpg`)
    if (r.status >= 300) continue
    const bytes = await readBytes(r.uri)
    const { thumb, w, h } = await thumbOf(bytes, 'image/jpeg', id)
    await db.frames.add({ id, rollId, index: i + 1, thumb, takenAt: takenAt + i * 9e5, locationName: place, favorite: i === 1, w, h, bytes: bytes.length, name })
    await db.originals.add({ frameId: id, rollId, blob: r.uri })
  }
}
