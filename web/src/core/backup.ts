import { db } from '../db'
import { cameraPhotoBlob, saveCameraPhoto } from '../photoStore'
import { importGear } from './gear'

/** 스캔 사진을 뺀 기록 전체 (장비 사진은 포함) */
const tables = ['cameras', 'lenses', 'filters', 'filmLots', 'customFilms', 'rolls', 'projects'] as const
export const backupFileName = '필름함 백업.json'

const toB64 = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
  reader.onerror = () => reject(reader.error)
  reader.readAsDataURL(blob)
})
const fromB64 = (b64: string) => new Blob([Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))], { type: 'image/png' })

export async function exportAll(): Promise<Blob> {
  const data: Record<string, unknown[]> = {}
  for (const t of tables) {
    const rows = await (db[t] as unknown as { toArray(): Promise<Record<string, unknown>[]> }).toArray()
    data[t] = rows
      .filter((r) => !r.deletedAt)
      .map((r) => Object.fromEntries(Object.entries(r).filter(([, v]) => !(v instanceof Blob))))
  }
  const photos: Record<string, string> = {}
  for (const t of ['cameras', 'lenses', 'filters'] as const) {
    for (const row of data[t] as { id: string; hasPhoto?: boolean }[]) {
      if (!row.hasPhoto) continue
      const blob = await cameraPhotoBlob(row.id).catch(() => undefined)
      if (blob) photos[row.id] = await toB64(blob)
    }
  }
  const file = { kind: 'filmchest-backup-web', version: 1, savedAt: new Date().toISOString(), data, photos }
  return new Blob([JSON.stringify(file)], { type: 'application/json' })
}

/** 같은 id는 백업 내용으로 덮고 없는 것은 만든다. 지금 있는 것은 지우지 않는다. */
export async function importAll(file: Blob): Promise<{ cameras: number; rolls: number }> {
  const json = JSON.parse(await file.text())
  if (json?.kind !== 'filmchest-backup-web') {
    const gear = await importGear(file)   // 예전 장비 파일
    return { cameras: gear.cameras, rolls: 0 }
  }
  for (const t of tables) {
    const rows = json.data?.[t]
    if (!Array.isArray(rows) || !rows.length) continue
    const table = db[t] as unknown as { get(id: string): Promise<Record<string, unknown> | undefined>; put(row: unknown): Promise<unknown> }
    for (const row of rows) {
      const old = await table.get(row.id)
      // 사진 없이 저장된 줄이라 기존 Blob 필드(썸네일 등)는 남긴다
      await table.put({ ...(old ?? {}), ...row })
    }
  }
  for (const [id, b64] of Object.entries((json.photos ?? {}) as Record<string, string>)) {
    await saveCameraPhoto(id, fromB64(b64)).catch(() => {})
  }
  return { cameras: json.data?.cameras?.length ?? 0, rolls: json.data?.rolls?.length ?? 0 }
}

/** 백업 내용이 지난번과 같은지 보는 열쇠 (저장 시각은 빼고) */
export async function backupKey(blob: Blob) {
  const text = (await blob.text()).replace(/"savedAt":"[^"]*",?/, '')
  let h = 5381
  for (let i = 0; i < text.length; i++) h = ((h * 33) ^ text.charCodeAt(i)) >>> 0
  return `${text.length}-${h.toString(36)}`
}
