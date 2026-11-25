// 기기 파일 (웹의 Blob·OPFS 자리). 카메라 사진, 스캔 원본, 썸네일을 앱 문서 폴더에 둔다.
import { Directory, File, Paths } from 'expo-file-system'
import { useEffect, useState, useSyncExternalStore } from 'react'

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

export function clearFolder(name: string) {
  try { const dir = new Directory(Paths.document, name); if (dir.exists) dir.delete() } catch { /* 다음에 다시 */ }
}

// 가져오다 남은 임시 사진은 앱을 켤 때 비운다
clearFolder('scan-tmp')
clearFolder('zip-preview')

const CHUNK = 8 * 1024 * 1024

/** 큰 파일(현상소 zip)은 나눠 읽는다. 한 번에 읽으면 앱 메모리 한도(기기마다 200~500MB)를 넘어 열리지 않는다 */
export async function readBytes(uri: string): Promise<Uint8Array<ArrayBuffer>> {
  const file = new File(uri)
  const size = file.size ?? 0
  if (size <= CHUNK) return file.bytes()
  const out = new Uint8Array(size)
  const handle = file.open()
  try {
    let at = 0
    while (at < size) {
      const part = handle.readBytes(Math.min(CHUNK, size - at))
      if (!part.length) throw new Error('파일을 끝까지 읽지 못했어요.')
      out.set(part, at)
      at += part.length
      await new Promise((r) => setTimeout(r, 0))
    }
  } finally { handle.close() }
  return out
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
  await new File(uri).copy(out)
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

// 배경을 지운 PNG인지 (그냥 사진이면 바둑판 카드 위쪽·양옆을 꽉 채운다)
const cutoutCache = new Map<string, boolean>()
export function usePhotoIsCutout(id: string, enabled: boolean) {
  const key = `${id}:${enabled ? revision : 0}`
  const [, setTick] = useState(0)
  useEffect(() => {
    if (!enabled || cutoutCache.has(key)) return
    void cameraPhotoBytes(id).then(async (b) => {
      const png = !!b && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47
      // PNG로 저장돼도 배경이 그대로일 수 있어 가장자리가 투명한지 본다 (웹 도구)
      let cut = png
      if (png && b) {
        const { webTool } = await import('./webTools')
        cut = await webTool<boolean>('isCutout', { data: bytesToB64(b), type: 'image/png' }).catch(() => true)
      }
      cutoutCache.set(key, cut)
      setTick((n) => n + 1)
    }).catch(() => {})
  }, [key, id, enabled])
  return cutoutCache.get(key)
}
