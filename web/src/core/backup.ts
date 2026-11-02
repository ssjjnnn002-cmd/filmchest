import JSZip from 'jszip'
import { db } from '../db'
import type { Frame } from './types'
import { rollFolderName } from './driveApi'
import { rotatedBlob } from './importer'
import { restorePhotos } from './restore'
import { rollTitle } from '../ui/common'
import { cameraPhotoBlob, saveCameraPhoto } from '../photoStore'
import { importGear } from './gear'
import { dedupeCaseIds, idCanon, remapRow } from './backupMerge'

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
  // 대소문자만 다른 id(아이폰은 대문자)는 같은 장비·롤로 본다
  const canon = idCanon(await Promise.all(tables.map((t) => (db[t] as unknown as { toArray(): Promise<Record<string, unknown>[]> }).toArray())))
  for (const t of tables) {
    const rows = json.data?.[t]
    if (!Array.isArray(rows) || !rows.length) continue
    const table = db[t] as unknown as { get(id: string): Promise<Record<string, unknown> | undefined>; put(row: unknown): Promise<unknown> }
    for (const raw of rows) {
      const row = remapRow(raw, canon) as Record<string, unknown> & { id: string }
      const old = await table.get(row.id)
      // 사진 없이 저장된 줄이라 기존 Blob 필드(썸네일 등)는 남긴다
      await table.put({ ...(old ?? {}), ...row })
    }
  }
  for (const [id, b64] of Object.entries((json.photos ?? {}) as Record<string, string>)) {
    await saveCameraPhoto(String(canon(id)), fromB64(b64)).catch(() => {})
  }
  await dedupeCaseIds(db as unknown as Parameters<typeof dedupeCaseIds>[0])
  return { cameras: json.data?.cameras?.length ?? 0, rolls: json.data?.rolls?.length ?? 0 }
}

/** 백업 내용이 지난번과 같은지 보는 열쇠 (저장 시각은 빼고) */
export async function backupKey(blob: Blob) {
  const text = (await blob.text()).replace(/"savedAt":"[^"]*",?/, '')
  let h = 5381
  for (let i = 0; i < text.length; i++) h = ((h * 33) ^ text.charCodeAt(i)) >>> 0
  return `${text.length}-${h.toString(36)}`
}

export const photoBackupFileName = '필름함 백업 (사진 포함).zip'

/** 기록 + 스캔 사진을 zip 하나로. 사진은 롤마다 폴더에 넣고, 불러올 때 사진 속 표식으로 다시 롤에 붙인다 */
export async function exportWithPhotos(onProgress?: (done: number, total: number) => void): Promise<Blob> {
  const zip = new JSZip()
  zip.file(backupFileName, await exportAll())
  const rolls = (await db.rolls.toArray()).filter((r) => !r.deletedAt)
  const todo: { folder: string; frame: Frame }[] = []
  for (const roll of rolls) {
    const camera = roll.cameraId ? await db.cameras.get(roll.cameraId) : undefined
    const folder = rollFolderName(rollTitle(roll, camera), roll.days[0]?.startedAt ?? roll.loadedAt)
    for (const frame of await db.frames.where('rollId').equals(roll.id).toArray()) todo.push({ folder, frame })
  }
  onProgress?.(0, todo.length)
  for (const [i, { folder, frame }] of todo.entries()) {
    const original = await db.originals.get(frame.id)
    if (original) {
      const ext = (frame.name?.split('.').pop() ?? 'jpg').toLowerCase().replace('jpeg', 'jpg')
      zip.file(`사진/${folder}/${String(frame.index).padStart(2, '0')}.${ext}`, await rotatedBlob(original.blob, frame.rotation))
    }
    onProgress?.(i + 1, todo.length)
  }
  // 사진은 이미 압축돼 있어 다시 압축하지 않는다 (빠르게)
  return zip.generateAsync({ type: 'blob', compression: 'STORE' })
}

/** 백업 파일 불러오기: 기록만 있는 .json, 사진까지 든 .zip 둘 다 */
export async function importBackupFile(file: Blob): Promise<{ cameras: number; rolls: number; photos: number }> {
  const head = new Uint8Array(await file.slice(0, 2).arrayBuffer())
  if (head[0] !== 0x50 || head[1] !== 0x4b) return { ...(await importAll(file)), photos: 0 }   // PK = zip
  const zip = await JSZip.loadAsync(file)
  const json = zip.file(backupFileName)
  const counts = json ? await importAll(new Blob([await json.async('uint8array')], { type: 'application/json' })) : { cameras: 0, rolls: 0 }
  const images = zip.file(/^사진\/.+\.(jpe?g|png|tiff?|heic)$/i)
  const files = await Promise.all(images.map(async (f) => new File([await f.async('blob')], f.name.split('/').pop() ?? f.name, { type: f.name.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg' })))
  const restored = files.length ? await restorePhotos(files) : undefined
  return { ...counts, photos: restored?.frames ?? 0 }
}
