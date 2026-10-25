// 구글 드라이브에 백업 파일 하나를 올리고 덮어쓴다 (drive.file 권한: 이 앱이 만든 파일만 본다)
import { getPref, setPref } from '../platform'
import { db } from '../db'
import type { Frame, Roll } from './types'
import { backupFileName, backupKey, exportAll, importAll } from './backup'
import { FOLDER, ROOT_NAME, createFile, downloadUrl, ensureFolder, findByName, listChildren, mediaUrl, rollFolderName } from './driveApi'
import { rotatedBlob } from './importer'
import { restorePhotos } from './restore'
import { rollTitle } from '../ui/common'

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
export const driveAvailable = !!clientId

type TokenClient = { requestAccessToken(o?: { prompt?: string }): void; callback: (r: { access_token?: string; expires_in?: number; error?: string }) => void }
declare global { interface Window { google?: { accounts: { oauth2: { initTokenClient(o: Record<string, unknown>): TokenClient } } } } }

// 받은 구글 허가는 만료 전까지 기억해 둔다 (새로 고쳐도 다시 묻지 않게)
let token: { value: string; until: number } | undefined = (() => {
  try { const t = JSON.parse(sessionStorage.getItem('driveToken') ?? 'null'); return t && t.until > Date.now() ? t : undefined } catch { return undefined }
})()
let client: TokenClient | undefined

function loadScript() {
  if (window.google?.accounts) return Promise.resolve()
  return new Promise<void>((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('구글 로그인을 불러오지 못했어요'))
    document.head.appendChild(s)
  })
}

/** 버튼을 누를 때 불러야 팝업이 막히지 않는다 */
export async function driveToken(prompt = ''): Promise<string> {
  if (token && token.until > Date.now() + 60_000) return token.value
  await loadScript()
  return new Promise((resolve, reject) => {
    client = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId, scope: 'https://www.googleapis.com/auth/drive.file',
      callback: () => {},
    })
    client.callback = (r) => {
      if (!r.access_token) return reject(new Error(r.error ?? '연결하지 못했어요'))
      token = { value: r.access_token, until: Date.now() + (r.expires_in ?? 3600) * 1000 }
      try { sessionStorage.setItem('driveToken', JSON.stringify(token)) } catch { /* 저장 못 함 */ }
      setPref('driveConnected', '1')
      resolve(r.access_token)
    }
    client.requestAccessToken({ prompt })
  })
}

export const driveConnected = () => getPref('driveConnected', '' as string) === '1'
export const driveLastBackup = () => Number(getPref('driveLast', '0')) || undefined
export const driveIntervalDays = () => Number(getPref('driveDays', '1'))
export function disconnectDrive() {
  for (const k of ['driveConnected', 'driveFileId', 'driveRoot', 'driveKey']) setPref(k, '')
  setPref('driveRollFolders', '{}'); setPref('driveFrames', '{}')
  token = undefined
  try { sessionStorage.removeItem('driveToken') } catch { /* 없음 */ }
}
export const hasDriveToken = () => !!token && token.until > Date.now() + 60_000

type Fetchable = { status: number; ok: boolean }
/** 드라이브 안 '필름함' 폴더 (지웠으면 다시 만든다) */
async function rootFolder(t: string) {
  const id = await ensureFolder(t, ROOT_NAME)
  setPref('driveRoot', id)
  return id
}
async function putBlob(t: string, id: string, blob: Blob): Promise<Fetchable> {
  return fetch(mediaUrl(id), { method: 'PATCH', headers: { Authorization: `Bearer ${t}`, 'Content-Type': blob.type || 'application/octet-stream' }, body: blob })
}

/** 기록 백업 파일: 드라이브 '필름함' 폴더 안 하나에 덮어쓴다. force가 아니면 바뀐 게 없을 때 건너뛴다 */
export async function backupToDrive(force = false) {
  const t = await driveToken()
  const blob = await exportAll()
  const key = await backupKey(blob)
  let id = getPref('driveFileId', '' as string)
  if (!force && id && key === getPref('driveKey', '' as string)) { setPref('driveLast', String(Date.now())); void syncPhotosToDrive().catch(() => {}); return }
  const root = await rootFolder(t)
  if (!id) id = (await findByName(t, backupFileName, root)) ?? (await createFile(t, backupFileName, root, 'application/json'))
  let res = await putBlob(t, id, blob)
  if (res.status === 404) {   // 드라이브에서 지운 경우 새로 만든다
    id = await createFile(t, backupFileName, root, 'application/json')
    res = await putBlob(t, id, blob)
  }
  if (!res.ok) throw new Error(`드라이브에 올리지 못했어요 (${res.status})`)
  setPref('driveFileId', id)
  setPref('driveKey', key)
  setPref('drivePulledAt', String(Date.now()))
  setPref('driveLast', String(Date.now()))
  void syncPhotosToDrive().catch(() => {})
}

/** 드라이브 웹에서 '필름함' 폴더 (아직 모르면 내 드라이브) */
export const driveFolderUrl = () => { const id = getPref('driveRoot', '' as string); return id ? `https://drive.google.com/drive/folders/${id}` : 'https://drive.google.com/drive/my-drive' }

export const drivePhotosOn = () => getPref('drivePhotos', '1' as string) === '1'
type Progress = (done: number, total: number) => void
let syncing: Promise<number> | undefined

/** 스캔 사진: '필름함/날짜 롤 이름/01.jpg' 로 올린다. 이미 올린 사진은 건너뛰고, 돌렸으면 다시 올린다 */
export function syncPhotosToDrive(onProgress?: Progress): Promise<number> {
  if (!drivePhotosOn()) return Promise.resolve(0)
  syncing ??= (async () => {
    try {
      const t = await driveToken()
      const root = await rootFolder(t)
      const folders: Record<string, string> = JSON.parse(getPref('driveRollFolders', '{}'))
      const sent: Record<string, string> = JSON.parse(getPref('driveFrames', '{}'))
      const rolls = (await db.rolls.toArray()).filter((r) => !r.deletedAt)
      const todo: { roll: Roll; frame: Frame }[] = []
      for (const roll of rolls) {
        for (const frame of await db.frames.where('rollId').equals(roll.id).toArray()) {
          if (sent[frame.id]?.split(':')[1] !== String(frame.rotation ?? 0)) todo.push({ roll, frame })
        }
      }
      let done = 0
      onProgress?.(0, todo.length)
      for (const { roll, frame } of todo) {
        const original = await db.originals.get(frame.id)
        if (!original) { done += 1; continue }
        let folder = folders[roll.id]
        if (!folder) {
          const camera = roll.cameraId ? await db.cameras.get(roll.cameraId) : undefined
          folder = await ensureFolder(t, rollFolderName(rollTitle(roll, camera), roll.days[0]?.startedAt ?? roll.loadedAt), root)
          folders[roll.id] = folder
          setPref('driveRollFolders', JSON.stringify(folders))
        }
        const ext = (frame.name?.split('.').pop() ?? 'jpg').toLowerCase().replace('jpeg', 'jpg')
        const blob = await rotatedBlob(original.blob, frame.rotation)
        const name = `${String(frame.index).padStart(2, '0')}.${ext}`
        let id = sent[frame.id]?.split(':')[0]
        if (!id) id = (await findByName(t, name, folder)) ?? (await createFile(t, name, folder, blob.type || 'image/jpeg'))
        let res = await putBlob(t, id, blob)
        if (res.status === 404) {
          delete folders[roll.id]
          throw new Error('드라이브에서 폴더가 지워졌어요. 다시 올려 주세요.')
        }
        if (!res.ok) throw new Error(`사진을 올리지 못했어요 (${res.status})`)
        sent[frame.id] = `${id}:${frame.rotation ?? 0}`
        setPref('driveFrames', JSON.stringify(sent))
        done += 1
        onProgress?.(done, todo.length)
      }
      return todo.length
    } finally {
      syncing = undefined
    }
  })()
  return syncing
}

/** 다른 기기(아이폰·갤럭시)가 올린 최신 기록이면 받아서 합친다. force면 늘 받는다 */
export async function pullFromDrive(force = false) {
  const t = await driveToken()
  const root = await rootFolder(t)
  const id = getPref('driveFileId', '' as string) || await findByName(t, backupFileName, root)
  if (!id) return undefined
  setPref('driveFileId', id)
  const res = await fetch(downloadUrl(id), { headers: { Authorization: `Bearer ${t}` } })
  if (!res.ok) return undefined
  const blob = await res.blob()
  const saved = Date.parse(JSON.parse(await blob.text())?.savedAt ?? '') || 0
  if (!force && saved <= Number(getPref('drivePulledAt', '0'))) return undefined
  const counts = await importAll(blob)
  setPref('drivePulledAt', String(saved))
  setPref('driveKey', await backupKey(await exportAll()))
  return counts
}

/** 드라이브의 기록 백업으로 되살린다 */
export async function restoreFromDrive() {
  const t = await driveToken()
  const root = await rootFolder(t)
  const id = getPref('driveFileId', '') || await findByName(t, backupFileName, root)
  if (!id) throw new Error('드라이브에 백업이 없어요')
  const res = await fetch(downloadUrl(id), { headers: { Authorization: `Bearer ${t}` } })
  if (!res.ok) throw new Error('백업을 받지 못했어요')
  return importAll(await res.blob())
}

/** 드라이브 '필름함' 폴더의 사진을 내려받아 롤에 다시 붙인다 (사진 속 표식·정보로) */
export async function restorePhotosFromDrive(onProgress?: Progress) {
  const t = await driveToken()
  const root = await rootFolder(t)
  const files: File[] = []
  const folders = (await listChildren(t, root)).filter((f) => f.mimeType === FOLDER)
  const items: { id: string; name: string }[] = []
  for (const f of folders) items.push(...(await listChildren(t, f.id)).filter((x) => x.mimeType.startsWith('image/')))
  onProgress?.(0, items.length)
  for (const [i, it] of items.entries()) {
    const res = await fetch(downloadUrl(it.id), { headers: { Authorization: `Bearer ${t}` } })
    if (res.ok) { const b = await res.blob(); files.push(new File([b], it.name, { type: b.type || 'image/jpeg' })) }
    onProgress?.(i + 1, items.length)
  }
  return restorePhotos(files)
}

export function driveDue() {
  const days = driveIntervalDays()
  if (!driveAvailable || !driveConnected() || days <= 0) return false
  return Date.now() - (driveLastBackup() ?? 0) > days * 86_400_000 - 3_600_000
}

/** 연결해 둔 구글 허가가 살아 있는 동안(최대 1시간) 창 없이 맞춘다.
 *  로그인 창은 사용자가 버튼을 누를 때만 연다 (자동으로 열면 브라우저가 팝업 차단을 묻는다). */
export function startDriveAutoBackup() {
  if (!driveAvailable) return
  // 구글 로그인 도구를 미리 받아 둔다: 버튼을 누른 순간 바로 창을 열어야 팝업으로 막히지 않는다
  if (driveConnected()) void loadScript().catch(() => {})
  const pull = () => { if (driveConnected() && hasDriveToken()) void pullFromDrive().catch(() => {}) }
  pull()
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') pull()
    else if (driveDue() && hasDriveToken()) void backupToDrive().catch(() => {})
  })
}
