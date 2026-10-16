// 웹 core/gear.ts (사진은 기기 파일)
import { db } from './data'
import { b64ToBytes, bytesToB64, cameraPhotoBytes, readBytes, saveCameraPhoto } from './files'
import type { BodyStyle, Camera, FilmFormat, Lens } from './core/types'

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

export async function exportGear(): Promise<Uint8Array> {
  const cameras = (await db.cameras.toArray()).filter((c) => !c.deletedAt)
  const lenses = await db.lenses.toArray()
  const file: GearFile = {
    kind: 'filmchest-gear',
    version: 1,
    cameras: await Promise.all(cameras.map(async (c) => ({
      id: c.id, brand: c.brand, model: c.model, nickname: c.nickname,
      formatRaw: c.format, mount: c.mount, fixedLensName: c.fixedLens,
      photo: await cameraPhotoBytes(c.id).then((b) => (b ? bytesToB64(b) : undefined)),
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
  return new TextEncoder().encode(JSON.stringify(file))
}

export async function importGear(uri: string) {
  const data = JSON.parse(new TextDecoder().decode(await readBytes(uri))) as GearFile
  if (data.kind !== 'filmchest-gear' || !Array.isArray(data.cameras)) throw new Error('장비 파일이 아니에요')
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
  for (const item of data.cameras) {
    if (item.photo) await saveCameraPhoto(item.id, b64ToBytes(item.photo))
  }
  return { cameras: data.cameras.length, lenses: data.lenses?.length ?? 0 }
}
