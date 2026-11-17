// 갤러리 저장: 웹은 공유 창을 거치지만 갤럭시 앱은 사진 앱에 바로 넣는다
import * as MediaLibrary from 'expo-media-library'
import { File } from 'expo-file-system'
import { folder } from './files'
import { getPref, setPref } from './store'

// 저장한 사진 기억: 컷 id → 갤러리 사진 id·앨범 (롤 정보를 고치면 그 사진을 새 정보로 바꿔 넣으려고)
type Saved = Record<string, { id: string; album: string }>
const savedMap = (): Saved => { try { return JSON.parse(getPref('galleryAssets', '{}')) as Saved } catch { return {} } }

const galleryOk = (name: string) => /\.(jpe?g|png|heic|heif|webp)$/i.test(name)

/** 이름(01.jpg …)을 붙인 복사본을 사진 앱의 앨범에 넣는다 (아이폰 앱처럼 앨범으로 정리) */
export async function saveImagesToGallery(items: { uri: string; name: string; key?: string }[], album = '필름함') {
  const perm = await MediaLibrary.requestPermissionsAsync(true)
  if (!perm.granted) return { saved: 0, denied: true }
  const dir = folder('gallery-out')
  let saved = 0
  const map = savedMap()
  for (const it of items.filter((x) => galleryOk(x.name))) {
    try {
      const out = new File(dir, it.name.replace(/[/\\:]/g, '-'))
      if (out.exists) out.delete()
      new File(it.uri).copy(out)
      const asset = await MediaLibrary.createAssetAsync(out.uri)
      out.delete()
      if (it.key) map[it.key] = { id: asset.id, album }
      try {
        const found = await MediaLibrary.getAlbumAsync(album)
        if (found) await MediaLibrary.addAssetsToAlbumAsync([asset], found, false)
        else await MediaLibrary.createAlbumAsync(album, asset, false)
      } catch { /* 앨범 정리만 실패하면 사진은 그대로 저장돼 있다 */ }
      saved += 1
    } catch { /* 한 장 실패는 건너뛴다 */ }
  }
  setPref('galleryAssets', JSON.stringify(map))
  return { saved, denied: false }
}

/** 갤러리에 저장해 둔 컷을 새 파일로 바꿔 넣는다 (예전 사진은 지운다 — 안드로이드가 한 번 묻는다). 바꾼 장 수 */
export async function replaceInGallery(items: { uri: string; name: string; key: string }[]) {
  const map = savedMap()
  const todo = items.filter((it) => map[it.key])
  if (!todo.length) return 0
  const perm = await MediaLibrary.requestPermissionsAsync(false)
  if (!perm.granted) return 0
  const removed = await MediaLibrary.deleteAssetsAsync(todo.map((it) => map[it.key].id)).catch(() => false)
  if (!removed) return 0
  let n = 0
  for (const album of [...new Set(todo.map((it) => map[it.key].album))]) {
    const r = await saveImagesToGallery(todo.filter((it) => map[it.key].album === album), album)
    n += r.saved
  }
  return n
}
