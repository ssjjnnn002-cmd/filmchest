import { useEffect, useSyncExternalStore } from 'react'
import { db } from './db'
import type { Camera } from './core/types'

// 카메라 사진은 카메라 기록(순서, 배터리)과 떨어진 파일로 둔다.
// 기록을 다시 쓸 때 크롬이 사진 데이터를 무효로 만들어, 칸에 깨진 그림이 남던 문제를 피한다.

const urls = new Map<string, string>()
const blobs = new Map<string, Blob>()
const pending = new Map<string, Promise<string | undefined>>()
/** 배경을 지운 PNG(투명)인지. 그냥 사진이면 카드 칸을 꽉 채워 보여 준다. */
const cutouts = new Map<string, boolean>()
let revision = 0
const listeners = new Set<() => void>()

function emit() {
  revision += 1
  listeners.forEach((fn) => fn())
}

function subscribe(fn: () => void) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function fileName(id: string) {
  return `${id}.png`
}

async function folder() {
  if (!navigator.storage?.getDirectory) return undefined
  const root = await navigator.storage.getDirectory()
  return root.getDirectoryHandle('camera-photos', { create: true })
}

function publish(id: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  blobs.set(id, blob)
  urls.set(id, url)
  cutouts.delete(id)
  void blob.slice(0, 4).arrayBuffer().then((buf) => {
    if (blobs.get(id) !== blob) return
    const b = new Uint8Array(buf)
    cutouts.set(id, b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47)
    emit()
  }).catch(() => {})
  emit()
  return url
}

async function bytesOf(blob: Blob) {
  const buf = await blob.arrayBuffer()
  if (!buf.byteLength) return undefined
  return new Blob([buf], { type: blob.type || 'image/png' })
}

async function writeFile(id: string, blob: Blob) {
  const dir = await folder()
  if (!dir) return false
  const handle = await dir.getFileHandle(fileName(id), { create: true })
  const writable = await handle.createWritable()
  await writable.write(blob)
  await writable.close()
  return true
}

async function readFile(id: string) {
  const dir = await folder()
  if (!dir) return undefined
  try {
    const handle = await dir.getFileHandle(fileName(id))
    const file = await handle.getFile()
    return file.size > 0 ? file : undefined
  } catch {
    return undefined
  }
}

async function remember(id: string, blob: Blob) {
  const copy = await bytesOf(blob)
  if (!copy) return undefined
  const url = publish(id, copy)
  let stored = false
  try { stored = await writeFile(id, copy) } catch { stored = false }
  if (!stored) {
    try {
      await db.cameraPhotos.put({ id, blob: copy })
      stored = true
    } catch { stored = false }
  }
  return stored ? url : url
}

/** 편집 화면에서 고른 사진을 기기 파일로 저장한다. */
export async function saveCameraPhoto(id: string, blob: Blob) {
  const copy = await bytesOf(blob)
  if (!copy) return
  publish(id, copy)
  let stored = false
  try { stored = await writeFile(id, copy) } catch { stored = false }
  if (!stored) await db.cameraPhotos.put({ id, blob: copy })
}

export async function deleteCameraPhoto(id: string) {
  urls.delete(id)
  blobs.delete(id)
  cutouts.delete(id)
  pending.delete(id)
  emit()
  try {
    const dir = await folder()
    await dir?.removeEntry(fileName(id))
  } catch { /* 파일 없음 */ }
  await db.cameraPhotos.delete(id).catch(() => {})
}

export function cachedPhotoURL(id: string) {
  return urls.get(id)
}

export async function cameraPhotoBlob(id: string) {
  if (blobs.has(id)) return blobs.get(id)
  await cameraPhotoURL(id)
  return blobs.get(id)
}

export function cameraPhotoURL(id: string) {
  const hit = urls.get(id)
  if (hit) return Promise.resolve(hit)
  let job = pending.get(id)
  if (!job) {
    job = load(id).finally(() => pending.delete(id))
    pending.set(id, job)
  }
  return job
}

async function load(id: string) {
  const file = await readFile(id).catch(() => undefined)
  if (file) return publish(id, file)

  const stored = await db.cameraPhotos.get(id).catch(() => undefined)
  if (stored?.blob?.size) {
    const url = await remember(id, stored.blob)
    if (url) return url
  }

  const camera = await db.cameras.get(id)
  if (!camera?.photo?.size) return undefined
  let copy: Blob | undefined
  try { copy = await bytesOf(camera.photo) } catch { copy = undefined }
  if (!copy) return undefined
  publish(id, copy)
  let storedOk = false
  try { storedOk = await writeFile(id, copy) } catch { storedOk = false }
  if (!storedOk) {
    try {
      await db.cameraPhotos.put({ id, blob: copy })
      storedOk = true
    } catch { storedOk = false }
  }
  if (storedOk) await stripPhoto(camera)
  return urls.get(id)
}

async function stripPhoto(camera: Camera) {
  const next: Camera = { ...camera, hasPhoto: true }
  delete next.photo
  await db.cameras.put(next)
}

/** 이미 들어 있는 사진을 카메라 기록 밖으로 옮긴다. */
export async function migrateCameraPhotos() {
  const cameras = await db.cameras.toArray()
  for (const camera of cameras) {
    if (camera.photo?.size || camera.hasPhoto) await cameraPhotoURL(camera.id)
  }
}

/** 기기 파일에 있는 카메라 사진 주소. 없으면 불러온 뒤 다시 그린다. */
/** 그냥 사진(배경 안 지운 사진)이면 true. 칸을 꽉 채워 보여 줄지 정할 때 쓴다. */
export function usePhotoBleeds(id?: string, enabled = true) {
  useSyncExternalStore(subscribe, () => revision, () => revision)
  return !!id && enabled && cutouts.get(id) === false
}

export function useCameraPhoto(id?: string, enabled = true) {
  const rev = useSyncExternalStore(subscribe, () => revision, () => revision)
  const url = id && enabled ? urls.get(id) : undefined
  useEffect(() => {
    if (!id || !enabled || urls.get(id)) return
    void cameraPhotoURL(id)
  }, [id, enabled, url, rev])
  return url
}
