// 웹 core/backup.ts와 같은 파일 형식 (웹 ↔ 갤럭시 서로 불러오기 가능). 스캔 사진은 빠진다.
import { AppState } from 'react-native'
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
    if (Date.now() - (localBackupAt() ?? 0) < 20 * 3_600_000) return
    void writeLocalBackup().catch(() => {})
  })
}

/** 새로 설치한 뒤 기록이 비어 있고 복원된 백업이 있으면 그 경로 */
export async function restoredBackupUri() {
  const f = localFile()
  if (!f.exists) return undefined
  const cams = await db.cameras.toArray()
  const rolls = await db.rolls.toArray()
  return cams.length === 0 && rolls.length === 0 ? f.uri : undefined
}
