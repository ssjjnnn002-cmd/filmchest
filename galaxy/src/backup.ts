// 웹 core/backup.ts와 같은 파일 형식 (웹 ↔ 갤럭시 서로 불러오기 가능). 스캔 사진은 빠진다.
import { AppState, Linking } from 'react-native'
import * as Sharing from 'expo-sharing'
import { File } from 'expo-file-system'
import { db } from './data'
import { b64ToBytes, bytesToB64, cameraPhotoBytes, folder, readBytes, saveCameraPhoto, writeBytes } from './files'
import { importGear } from './gear'
import { getPref, setPref } from './store'

const tables = ['cameras', 'lenses', 'filters', 'filmLots', 'customFilms', 'rolls', 'projects'] as const
export const backupFileName = '필름함 백업.json'
type Table = { toArray(): Promise<Record<string, unknown>[]>; get(id: string): Promise<Record<string, unknown> | undefined>; put(row: unknown): Promise<unknown> }
const table = (t: typeof tables[number]) => (db as unknown as Record<string, Table>)[t]

export async function exportAll(): Promise<Uint8Array> {
  const data: Record<string, unknown[]> = {}
  for (const t of tables) {
    data[t] = (await table(t).toArray()).filter((r) => !r.deletedAt)
  }
  const photos: Record<string, string> = {}
  for (const t of ['cameras', 'lenses', 'filters'] as const) {
    for (const row of data[t] as { id: string; hasPhoto?: boolean }[]) {
      if (!row.hasPhoto) continue
      const bytes = await cameraPhotoBytes(row.id).catch(() => undefined)
      if (bytes) photos[row.id] = bytesToB64(bytes)
    }
  }
  const file = { kind: 'filmchest-backup-web', version: 1, savedAt: new Date().toISOString(), data, photos }
  return new TextEncoder().encode(JSON.stringify(file))
}

export async function importAll(uri: string): Promise<{ cameras: number; rolls: number }> {
  const json = JSON.parse(new TextDecoder().decode(await readBytes(uri)))
  if (json?.kind !== 'filmchest-backup-web') {
    const gear = await importGear(uri)
    return { cameras: gear.cameras, rolls: 0 }
  }
  for (const t of tables) {
    const rows = json.data?.[t]
    if (!Array.isArray(rows)) continue
    for (const row of rows) {
      const old = await table(t).get(row.id)
      await table(t).put({ ...(old ?? {}), ...row })
    }
  }
  for (const [id, b64] of Object.entries((json.photos ?? {}) as Record<string, string>)) {
    await saveCameraPhoto(id, b64ToBytes(b64)).catch(() => {})
  }
  return { cameras: json.data?.cameras?.length ?? 0, rolls: json.data?.rolls?.length ?? 0 }
}

// 안드로이드 자동 백업(구글 드라이브)은 backup 폴더만 올린다 (android/backup_rules). 앱이 뒤로 갈 때 하루 한 번 새로 쓴다.
const localFile = () => new File(folder('backup'), backupFileName)
export const localBackupAt = () => Number(getPref('localBackupAt', '0')) || undefined

export async function writeLocalBackup() {
  writeBytes('backup', backupFileName, await exportAll())
  setPref('localBackupAt', String(Date.now()))
}

export function startLocalAutoBackup() {
  AppState.addEventListener('change', (s) => {
    if (s !== 'background') return
    if (cloudDue()) void writeCloud().catch(() => {})
    if (Date.now() - (localBackupAt() ?? 0) < 20 * 3_600_000) return
    void writeLocalBackup().catch(() => {})
  })
}

// --- 클라우드 백업 파일 연결
// 안드로이드는 구글 드라이브 폴더를 직접 고를 수 없어서: 백업 파일을 클라우드 앱에 한 번 올리고 → 그 파일을 골라 연결한다.
// 이후에는 그 파일(사용자가 준 권한)에 덮어쓴다.
export const cloudName = () => getPref('cloudName', '' as string) || undefined
export const cloudUri = () => getPref('cloudUri', '' as string) || undefined
export const cloudLast = () => Number(getPref('cloudLast', '0')) || undefined
export const cloudDays = () => Number(getPref('cloudDays', '1'))
export function cloudDue() {
  const days = cloudDays()
  return !!cloudUri() && days > 0 && Date.now() - (cloudLast() ?? 0) > days * 86_400_000 - 3_600_000
}

/** 1단계: 백업 파일을 공유 창으로 넘겨 클라우드 앱(드라이브 등)에 저장하게 한다 */
export async function shareForCloud() {
  await writeLocalBackup()
  await Sharing.shareAsync(localFile().uri, { mimeType: 'application/json', dialogTitle: backupFileName })
}

/** 2단계: 클라우드에 올린 백업 파일을 골라 연결 */
export async function linkCloudFile(name: string) {
  const picked = await File.pickFileAsync({ mimeTypes: ['application/json', 'text/plain', 'application/octet-stream', '*/*'] })
  if (picked.canceled || !picked.result) return false
  setPref('cloudUri', picked.result.uri)
  setPref('cloudName', name)
  setPref('cloudLen', '0')
  return true
}

/** 연결한 파일에 덮어쓴다. 일부 클라우드는 덮어쓸 때 뒤를 자르지 않아서 이전 길이만큼 공백으로 채운다 */
export async function writeCloud() {
  const uri = cloudUri()
  if (!uri) throw new Error('연결된 파일이 없어요')
  const body = await exportAll()
  const prev = Number(getPref('cloudLen', '0')) || 0
  const out = new Uint8Array(Math.max(body.length, prev)).fill(0x20)
  out.set(body)
  try { new File(uri).write(out) } catch { throw new Error('파일에 쓸 수 없어요. 파일을 다시 골라 주세요.') }
  setPref('cloudLen', String(body.length))
  setPref('cloudLast', String(Date.now()))
}

/** 연결 확인: 덮어쓴 뒤 다시 읽어서 같은지 본다 */
export async function verifyCloud(): Promise<string | undefined> {
  try {
    await writeCloud()
    const text = new TextDecoder().decode(await new File(cloudUri()!).bytes())
    const json = JSON.parse(text)
    return json?.kind === 'filmchest-backup-web' ? undefined : '저장한 내용을 다시 읽지 못했어요.'
  } catch (e) {
    return (e as Error).message || '연결을 확인하지 못했어요.'
  }
}

export function disconnectCloud() { setPref('cloudUri', ''); setPref('cloudName', ''); setPref('cloudLen', '0') }

/** 휴대폰 설정 > 애플리케이션 > 필름함 */
export const openAppSettings = () => Linking.openSettings()

/** 새로 설치한 뒤 기록이 비어 있고 복원된 백업이 있으면 그 경로 */
export async function restoredBackupUri() {
  const f = localFile()
  if (!f.exists) return undefined
  const cams = await db.cameras.toArray()
  const rolls = await db.rolls.toArray()
  return cams.length === 0 && rolls.length === 0 ? f.uri : undefined
}
