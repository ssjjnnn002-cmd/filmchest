// 갤러리 저장: 웹은 공유 창을 거치지만 갤럭시 앱은 사진 앱에 바로 넣는다
import * as MediaLibrary from 'expo-media-library'
import { File } from 'expo-file-system'
import { folder } from './files'

const galleryOk = (name: string) => /\.(jpe?g|png|heic|heif|webp)$/i.test(name)

/** 이름(01.jpg …)을 붙인 복사본을 사진 앱에 넣는다 */
export async function saveImagesToGallery(items: { uri: string; name: string }[]) {
  const perm = await MediaLibrary.requestPermissionsAsync(true)
  if (!perm.granted) return { saved: 0, denied: true }
  const dir = folder('gallery-out')
  let saved = 0
  for (const it of items.filter((x) => galleryOk(x.name))) {
    try {
      const out = new File(dir, it.name.replace(/[/\\:]/g, '-'))
      if (out.exists) out.delete()
      new File(it.uri).copy(out)
      await MediaLibrary.saveToLibraryAsync(out.uri)
      out.delete()
      saved += 1
    } catch { /* 한 장 실패는 건너뛴다 */ }
  }
  return { saved, denied: false }
}
