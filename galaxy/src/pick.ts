// 웹의 File 자리: 기기에서 고른 파일
import * as DocumentPicker from 'expo-document-picker'

export interface PickedFile {
  uri: string
  name: string
  size?: number
  mimeType?: string
}

/** 파일 고르기 (웹 <input type="file">) */
export async function pickFiles(types: string[], multiple = true): Promise<PickedFile[]> {
  const res = await DocumentPicker.getDocumentAsync({ type: types, multiple, copyToCacheDirectory: true })
  if (res.canceled) return []
  return res.assets.map((a) => ({ uri: a.uri, name: a.name, size: a.size ?? undefined, mimeType: a.mimeType ?? undefined }))
}

/** 폴더 통째로 고르기 (웹 webkitdirectory). 안쪽 폴더까지, 이름은 폴더/파일 */
export async function pickFolder(): Promise<PickedFile[]> {
  const { Directory, File } = await import('expo-file-system')
  let root
  try { root = await Directory.pickDirectoryAsync() } catch { return [] }
  if (!root) return []
  const out: PickedFile[] = []
  const walk = (dir: InstanceType<typeof Directory>, prefix: string) => {
    for (const item of dir.list()) {
      if (item instanceof Directory) walk(item, `${prefix}${item.name}/`)
      else if (item instanceof File) out.push({ uri: item.uri, name: `${prefix}${item.name}`, size: item.size ?? undefined, mimeType: item.type ?? undefined })
    }
  }
  walk(root, `${root.name}/`)
  return out
}
