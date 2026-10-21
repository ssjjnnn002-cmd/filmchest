// 갤럭시: 구글 계정으로 로그인해 드라이브 '필름함' 폴더에 기록 백업과 롤별 사진 폴더를 올린다 (웹 core/drive.ts와 같은 구조)
import { GoogleSignin } from '@react-native-google-signin/google-signin'
import * as FS from 'expo-file-system/legacy'
import { Linking } from 'react-native'
import { db } from './data'
import type { Frame, Roll } from './core/types'
import { FOLDER, ROOT_NAME, createFile, downloadUrl, ensureFolder, findByName, listChildren, mediaUrl, rollFolderName } from './core/driveApi'
import { rollTitle } from './core/display'
import { backupFileName, exportAll, importAll } from './backup'
import { folder, writeBytes } from './files'
import { rotatedFile } from './scan'
import { restorePhotos } from './restore'
import { getPref, setPref } from './store'

/** 구글 클라우드에 등록한 웹용 클라이언트 ID (안드로이드용은 패키지 이름·서명으로 구글이 알아본다) */
const WEB_CLIENT_ID = '940262391554-kgu48knnnogdglo9h3qp8pbc5qi4s8en.apps.googleusercontent.com'
const SCOPE = 'https://www.googleapis.com/auth/drive.file'
let configured = false

export const driveConnected = () => getPref('driveConnected', '' as string) === '1'
export const driveAccount = () => getPref('driveAccount', '' as string) || undefined
export const driveLast = () => Number(getPref('driveLast', '0')) || undefined
export const driveDays = () => Number(getPref('driveDays', '1'))
export const drivePhotosOn = () => getPref('drivePhotos', '1' as string) === '1'

async function token(interactive: boolean) {
  if (!configured) { GoogleSignin.configure({ webClientId: WEB_CLIENT_ID, scopes: [SCOPE] }); configured = true }
  const silent = await GoogleSignin.signInSilently().catch(() => undefined)
  if (!silent || silent.type !== 'success') {
    if (!interactive) throw new Error('구글 연결이 끊겼어요. 다시 연결해 주세요.')
    await GoogleSignin.hasPlayServices()
    const r = await GoogleSignin.signIn()
    if (r.type !== 'success') throw new Error('구글 로그인을 하지 않았어요')
    setPref('driveAccount', r.data.user.email)
  } else {
    setPref('driveAccount', silent.data.user.email)
  }
  const { accessToken } = await GoogleSignin.getTokens()
  setPref('driveConnected', '1')
  return accessToken
}

async function rootFolder(t: string) {
  const id = await ensureFolder(t, ROOT_NAME)
  setPref('driveRoot', id)
  return id
}

/** 드라이브에서 '필름함' 폴더 열기 (드라이브 앱이 있으면 앱으로) */
export const openDriveFolder = () => {
  const id = getPref('driveRoot', '' as string)
  return Linking.openURL(id ? `https://drive.google.com/drive/folders/${id}` : 'https://drive.google.com/drive/my-drive')
}

async function put(t: string, id: string, uri: string, mime: string) {
  const r = await FS.uploadAsync(mediaUrl(id), uri, {
    httpMethod: 'PATCH', uploadType: FS.FileSystemUploadType.BINARY_CONTENT,
    headers: { Authorization: `Bearer ${t}`, 'Content-Type': mime },
  })
  return r.status
}

/** 처음 연결 (버튼에서) */
export async function connectDrive() { await token(true); await backupToDrive(true) }

export async function disconnectDrive() {
  await GoogleSignin.signOut().catch(() => {})
  for (const k of ['driveConnected', 'driveAccount', 'driveFileId', 'driveKey', 'driveRoot']) setPref(k, '')
  setPref('driveRollFolders', '{}'); setPref('driveFrames', '{}')
}

function key(body: Uint8Array) {
  const text = new TextDecoder().decode(body).replace(/"savedAt":"[^"]*",?/, '')
  let h = 5381
  for (let i = 0; i < text.length; i++) h = ((h * 33) ^ text.charCodeAt(i)) >>> 0
  return `${text.length}-${h.toString(36)}`
}

/** 기록 백업: '필름함/필름함 백업.json' 하나에 덮어쓴다. force가 아니면 바뀐 게 없을 때 건너뛴다 */
export async function backupToDrive(force = false, interactive = true) {
  const t = await token(interactive)
  const body = await exportAll()
  const k = key(body)
  let id = getPref('driveFileId', '' as string)
  if (force || !id || k !== getPref('driveKey', '' as string)) {
    const root = await rootFolder(t)
    if (!id) id = (await findByName(t, backupFileName, root)) ?? (await createFile(t, backupFileName, root, 'application/json'))
    const uri = writeBytes('backup', 'drive-upload.json', body)
    let status = await put(t, id, uri, 'application/json')
    if (status === 404) { id = await createFile(t, backupFileName, root, 'application/json'); status = await put(t, id, uri, 'application/json') }
    if (status >= 300) throw new Error(`드라이브에 올리지 못했어요 (${status})`)
    setPref('driveFileId', id)
    setPref('driveKey', k)
  }
  setPref('driveLast', String(Date.now()))
  void syncPhotosToDrive(undefined, interactive).catch(() => {})
}

type Progress = (done: number, total: number) => void
let syncing: Promise<number> | undefined

/** 스캔 사진: '필름함/날짜 롤 이름/01.jpg'. 올린 사진은 건너뛰고, 돌렸으면 다시 올린다 */
export function syncPhotosToDrive(onProgress?: Progress, interactive = true): Promise<number> {
  if (!drivePhotosOn()) return Promise.resolve(0)
  syncing ??= (async () => {
    try {
      const t = await token(interactive)
      const root = await rootFolder(t)
      const folders: Record<string, string> = JSON.parse(getPref('driveRollFolders', '{}'))
      const sent: Record<string, string> = JSON.parse(getPref('driveFrames', '{}'))
      const todo: { roll: Roll; frame: Frame }[] = []
      for (const roll of (await db.rolls.toArray()).filter((r) => !r.deletedAt)) {
        for (const frame of await db.frames.where('rollId').equals(roll.id).toArray()) {
          if (sent[frame.id]?.split(':')[1] !== String(frame.rotation ?? 0)) todo.push({ roll, frame })
        }
      }
      onProgress?.(0, todo.length)
      let done = 0
      for (const { roll, frame } of todo) {
        const original = await db.originals.get(frame.id)
        if (original) {
          let dir = folders[roll.id]
          if (!dir) {
            const camera = roll.cameraId ? await db.cameras.get(roll.cameraId) : undefined
            dir = await ensureFolder(t, rollFolderName(rollTitle(roll, camera), roll.days[0]?.startedAt ?? roll.loadedAt), root)
            folders[roll.id] = dir
            setPref('driveRollFolders', JSON.stringify(folders))
          }
          const ext = (frame.name?.split('.').pop() ?? 'jpg').toLowerCase().replace('jpeg', 'jpg')
          const name = `${String(frame.index).padStart(2, '0')}.${ext}`
          const mime = ext === 'png' ? 'image/png' : ext.startsWith('tif') ? 'image/tiff' : 'image/jpeg'
          const uri = await rotatedFile(original.blob, frame.rotation, frame.id)
          let id = sent[frame.id]?.split(':')[0]
          if (!id) id = (await findByName(t, name, dir)) ?? (await createFile(t, name, dir, mime))
          const status = await put(t, id, uri, mime)
          if (status === 404) { delete folders[roll.id]; setPref('driveRollFolders', JSON.stringify(folders)); throw new Error('드라이브에서 폴더가 지워졌어요. 다시 올려 주세요.') }
          if (status >= 300) throw new Error(`사진을 올리지 못했어요 (${status})`)
          sent[frame.id] = `${id}:${frame.rotation ?? 0}`
          setPref('driveFrames', JSON.stringify(sent))
        }
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

export async function restoreFromDrive() {
  const t = await token(true)
  const root = await rootFolder(t)
  const id = getPref('driveFileId', '' as string) || await findByName(t, backupFileName, root)
  if (!id) throw new Error('드라이브에 백업이 없어요')
  const dest = `${folder('backup').uri.replace(/\/?$/, '/')}drive-download.json`
  const r = await FS.downloadAsync(downloadUrl(id), dest, { headers: { Authorization: `Bearer ${t}` } })
  if (r.status >= 300) throw new Error('백업을 받지 못했어요')
  return importAll(r.uri)
}

export async function restorePhotosFromDrive(onProgress?: Progress) {
  const t = await token(true)
  const root = await rootFolder(t)
  const items: { id: string; name: string; mimeType: string }[] = []
  for (const f of (await listChildren(t, root)).filter((x) => x.mimeType === FOLDER)) {
    items.push(...(await listChildren(t, f.id)).filter((x) => x.mimeType.startsWith('image/')))
  }
  const dir = folder('drive-restore').uri.replace(/\/?$/, '/')
  const files: { uri: string; name: string; mimeType: string }[] = []
  onProgress?.(0, items.length)
  for (const [i, it] of items.entries()) {
    const r = await FS.downloadAsync(downloadUrl(it.id), `${dir}${it.id}-${it.name}`, { headers: { Authorization: `Bearer ${t}` } })
    if (r.status < 300) files.push({ uri: r.uri, name: it.name, mimeType: it.mimeType })
    onProgress?.(i + 1, items.length)
  }
  return restorePhotos(files)
}

/** 앱이 뒤로 갈 때: 주기가 지났으면 (로그인 창 없이) 올린다 */
export function driveDue() {
  const days = driveDays()
  return driveConnected() && days > 0 && Date.now() - (driveLast() ?? 0) > days * 86_400_000 - 3_600_000
}
