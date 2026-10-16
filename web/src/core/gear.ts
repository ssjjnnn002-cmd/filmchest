import { db } from '../db'
import { cameraPhotoBlob, saveCameraPhoto } from '../photoStore'
import type { BodyStyle, Camera, FilmFormat, Lens } from './types'

/** 아이폰 앱과 같은 장비 파일. 롤과 사진은 들어가지 않는다. */
interface GearFile {
  kind: 'filmchest-gear'
  version: 1
  cameras: GearCamera[]
  lenses: GearLens[]
}

interface GearCamera {
  id: string
  brand: string
  model: string
  nickname?: string
  formatRaw: string
  mount?: string
  fixedLensName?: string
  photo?: string
  bodyStyleRaw: string
  bodyStyleManual: boolean
  modelColorHex: string
  batteryType?: string
  batteryReplacedAt?: string
  createdAt: string
  sortOrder: number
}

interface GearLens {
  id: string
  brand: string
  model: string
  mount: string
  createdAt: string
}

const formats = new Set<FilmFormat>(['135', '135-half', '120-645', '120-66', '120-67', '120-69'])
const styles = new Set<BodyStyle>(['slr', 'compact', 'rangefinder', 'mediumFormat'])

const toB64 = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
  reader.onerror = () => reject(reader.error)
  reader.readAsDataURL(blob)
})

const fromB64 = (b64: string) => {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type: 'image/png' })
}

export async function exportGear(): Promise<Blob> {
  const cameras = (await db.cameras.toArray()).filter((c) => !c.deletedAt)
  const lenses = await db.lenses.toArray()
  const file: GearFile = {
    kind: 'filmchest-gear',
    version: 1,
    cameras: await Promise.all(cameras.map(async (c) => ({
      id: c.id, brand: c.brand, model: c.model, nickname: c.nickname,
      formatRaw: c.format, mount: c.mount, fixedLensName: c.fixedLens,
      photo: await cameraPhotoBlob(c.id).then((blob) => (blob ? toB64(blob) : undefined)),
      bodyStyleRaw: c.style, bodyStyleManual: c.styleManual, modelColorHex: c.color,
      batteryType: c.battery,
      batteryReplacedAt: c.batteryAt ? new Date(c.batteryAt).toISOString() : undefined,
      createdAt: new Date(c.createdAt).toISOString(),
      sortOrder: c.sortOrder,
    }))),
    lenses: lenses.map((l) => ({
      id: l.id, brand: l.brand, model: l.model, mount: l.mount,
      createdAt: new Date(l.createdAt).toISOString(),
    })),
  }
  return new Blob([JSON.stringify(file)], { type: 'application/json' })
}

export async function importGear(file: Blob) {
  const data = JSON.parse(await file.text()) as GearFile
  if (data.kind !== 'filmchest-gear' || !Array.isArray(data.cameras)) throw new Error('장비 파일이 아니에요')
  await db.transaction('rw', db.cameras, db.lenses, async () => {
    for (const item of data.cameras) {
      const camera: Camera = {
        id: item.id,
        brand: item.brand,
        model: item.model,
        nickname: item.nickname,
        format: formats.has(item.formatRaw as FilmFormat) ? item.formatRaw as FilmFormat : '135',
        mount: item.mount,
        fixedLens: item.fixedLensName,
        style: styles.has(item.bodyStyleRaw as BodyStyle) ? item.bodyStyleRaw as BodyStyle : 'slr',
        styleManual: item.bodyStyleManual,
        color: item.modelColorHex || '#8A8A8A',
        hasPhoto: !!item.photo,
        battery: item.batteryType,
        batteryAt: item.batteryReplacedAt ? Date.parse(item.batteryReplacedAt) : undefined,
        createdAt: Date.parse(item.createdAt) || Date.now(),
        sortOrder: item.sortOrder ?? 0,
      }
      await db.cameras.put(camera)
    }
    for (const item of data.lenses ?? []) {
      const lens: Lens = {
        id: item.id, brand: item.brand, model: item.model, mount: item.mount,
        createdAt: Date.parse(item.createdAt) || Date.now(),
      }
      await db.lenses.put(lens)
    }
  })
  for (const item of data.cameras) {
    if (item.photo) await saveCameraPhoto(item.id, fromB64(item.photo))
  }
  return { cameras: data.cameras.length, lenses: data.lenses?.length ?? 0 }
}
