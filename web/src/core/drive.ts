// 구글 드라이브에 백업 파일 하나를 올리고 덮어쓴다 (drive.file 권한: 이 앱이 만든 파일만 본다)
import { getPref, setPref } from '../platform'
import { backupFileName, exportAll, importAll } from './backup'

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
export const driveAvailable = !!clientId

type TokenClient = { requestAccessToken(o?: { prompt?: string }): void; callback: (r: { access_token?: string; expires_in?: number; error?: string }) => void }
declare global { interface Window { google?: { accounts: { oauth2: { initTokenClient(o: Record<string, unknown>): TokenClient } } } } }

let token: { value: string; until: number } | undefined
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
      setPref('driveConnected', '1')
      resolve(r.access_token)
    }
    client.requestAccessToken({ prompt })
  })
}

export const driveConnected = () => getPref('driveConnected', '' as string) === '1'
export const driveLastBackup = () => Number(getPref('driveLast', '0')) || undefined
export const driveIntervalDays = () => Number(getPref('driveDays', '1'))
export function disconnectDrive() { setPref('driveConnected', ''); setPref('driveFileId', ''); token = undefined }
export const hasDriveToken = () => !!token && token.until > Date.now() + 60_000

export async function backupToDrive() {
  const t = await driveToken()
  const blob = await exportAll()
  let id = getPref('driveFileId', '')
  const meta = { name: backupFileName, mimeType: 'application/json' }
  const body = new FormData()
  body.append('metadata', new Blob([JSON.stringify(id ? {} : meta)], { type: 'application/json' }))
  body.append('file', blob)
  const url = id
    ? `https://www.googleapis.com/upload/drive/v3/files/${id}?uploadType=multipart`
    : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart'
  let res = await fetch(url, { method: id ? 'PATCH' : 'POST', headers: { Authorization: `Bearer ${t}` }, body })
  if (res.status === 404 && id) {   // 드라이브에서 지운 경우 새로 만든다
    setPref('driveFileId', '')
    return backupToDrive()
  }
  if (!res.ok) throw new Error(`드라이브에 올리지 못했어요 (${res.status})`)
  id = (await res.json()).id
  setPref('driveFileId', id)
  setPref('driveLast', String(Date.now()))
}

export async function restoreFromDrive() {
  const t = await driveToken()
  const id = getPref('driveFileId', '')
  if (!id) throw new Error('드라이브에 백업이 없어요')
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${id}?alt=media`, { headers: { Authorization: `Bearer ${t}` } })
  if (!res.ok) throw new Error('백업을 받지 못했어요')
  return importAll(await res.blob())
}

export function driveDue() {
  const days = driveIntervalDays()
  if (!driveAvailable || !driveConnected() || days <= 0) return false
  return Date.now() - (driveLastBackup() ?? 0) > days * 86_400_000 - 3_600_000
}

/** 앱을 쓰는 동안 때가 되면 올린다. 권한이 끊겼으면 다음 누름에서 조용히 다시 받는다. */
export function startDriveAutoBackup() {
  if (!driveAvailable) return
  const tryNow = () => { if (driveDue() && hasDriveToken()) void backupToDrive().catch(() => {}) }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') tryNow() })
  const onTap = () => {
    if (!driveDue()) return
    if (hasDriveToken()) { tryNow(); return }
    document.removeEventListener('pointerdown', onTap, true)
    void driveToken('').then(() => backupToDrive()).catch(() => {})
  }
  document.addEventListener('pointerdown', onTap, true)
}
