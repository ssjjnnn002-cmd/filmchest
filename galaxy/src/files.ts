// 기기 파일 (웹의 Blob·OPFS 자리). 카메라 사진, 스캔 원본, 썸네일을 앱 문서 폴더에 둔다.
import { Directory, File, Paths } from 'expo-file-system'
import { useEffect, useSyncExternalStore } from 'react'

export function folder(name: string) {
  const dir = new Directory(Paths.document, name)
  if (!dir.exists) dir.create({ intermediates: true })
  return dir
}

/** 바이트를 파일로 쓰고 경로(uri)를 돌려준다 */
export function writeBytes(dir: string, name: string, bytes: Uint8Array) {
  const file = new File(folder(dir), name)
  if (file.exists) file.delete()
  file.create()
  file.write(bytes)
  return file.uri
}

export async function readBytes(uri: string) {
  return new File(uri).bytes()
}

export function removeFile(uri?: string) {
  if (!uri) return
  try { const f = new File(uri); if (f.exists) f.delete() } catch { /* 이미 없음 */ }
}

export function fileSize(uri?: string) {
  if (!uri) return 0
  try { return new File(uri).size ?? 0 } catch { return 0 }
}

/** 다른 앱이 준 파일(content://)을 앱 폴더로 복사 */
export async function copyIn(uri: string, dir: string, name: string) {
  const out = new File(folder(dir), name)
  if (out.exists) out.delete()
  new File(uri).copy(out)
  return out.uri
}

// --- 카메라 사진 (웹 photoStore와 같은 역할)

let revision = 0
const listeners = new Set<() => void>()
const emit = () => { revision += 1; listeners.forEach((fn) => fn()) }
const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn) } }

const photoFile = (id: string) => new File(folder('camera-photos'), `${id}.png`)

export function cameraPhotoUri(id: string) {
  const f = photoFile(id)
  // 같은 이름으로 다시 저장해도 새로 그리도록 버전을 붙인다
  return f.exists ? `${f.uri}?v=${f.modificationTime ?? revision}` : undefined
}

export async function saveCameraPhoto(id: string, bytes: Uint8Array) {
  writeBytes('camera-photos', `${id}.png`, bytes)
  emit()
}

export async function deleteCameraPhoto(id: string) {
  removeFile(photoFile(id).uri)
  emit()
}

export async function cameraPhotoBytes(id: string) {
  const f = photoFile(id)
  return f.exists ? f.bytes() : undefined
}

/** 카메라 사진 경로 (없으면 undefined) */
export function useCameraPhoto(id: string, enabled = true) {
  useSyncExternalStore(subscribe, () => revision, () => revision)
  useEffect(() => {}, [id])
  return enabled ? cameraPhotoUri(id) : undefined
}

/** 배경을 지운 PNG(투명)인지. 파일이 바뀔 때만 앞 4바이트를 다시 읽는다. */
const cutouts = new Map<string, { at: number; png: boolean }>()
function isCutout(id: string) {
  const f = photoFile(id)
  if (!f.exists) return undefined
  const at = f.modificationTime ?? 0
  const hit = cutouts.get(id)
  if (hit && hit.at === at) return hit.png
  let png = false
  try {
    const h = f.open()
    const b = h.readBytes(4)
    h.close()
    png = b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47
  } catch { return undefined }
  cutouts.set(id, { at, png })
  return png
}

/** 그냥 사진(배경 안 지운 사진)이면 true. 칸을 꽉 채워 보여 줄지 정할 때 쓴다. */
export function usePhotoBleeds(id: string, enabled = true) {
  useSyncExternalStore(subscribe, () => revision, () => revision)
  return enabled && isCutout(id) === false
}

// --- base64 (웹 도구 WebView와 주고받기)

export function bytesToB64(bytes: Uint8Array) {
  let s = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) s += String.fromCharCode(...bytes.subarray(i, i + chunk))
  return btoa(s)
}

export function b64ToBytes(b64: string) {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}
