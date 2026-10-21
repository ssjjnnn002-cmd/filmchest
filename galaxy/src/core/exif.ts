// 자동 복사: web/src/core/exif.ts (node scripts/sync-galaxy-core.mjs). 여기서 고치지 말 것.
import piexif from 'piexifjs'
import type { FilmStock } from './films'
import { filmDisplayName } from './films'
import type { GeoPoint, MeterShot } from './types'

// JPEG의 EXIF만 바꾼다 (이미지 데이터는 그대로 → 화질 손실 없음).
// TIFF 등은 메타데이터를 쓰지 않고 원본 그대로 둔다.

export interface FrameMeta {
  frame: number
  frameCount: number
  date?: number // 없으면 원본 날짜 유지
  locationName?: string
  memo?: string
  point?: GeoPoint
  cameraBrand?: string // 없으면 원본 기기 정보 유지
  cameraModel?: string
  lens?: string
  film?: FilmStock
  iso?: number
  lab?: string
  scanner?: string
  /** 사진 앱에서 다시 찾을 표식. 캡션에는 넣지 않는다. */
  rollId?: string
  /** 노출계에서 이 칸에 남겨 둔 설정. 칸 번호가 같은 장에만 넣는다. */
  exposure?: Pick<MeterShot, 'aperture' | 'shutter' | 'comp' | 'flash' | 'mode'>
}

export function caption(m: FrameMeta) {
  return [m.film ? filmDisplayName(m.film) : undefined, `${m.frame}/${m.frameCount}`, m.locationName, m.memo, m.lab, m.scanner]
    .filter((x): x is string => !!x && x.length > 0)
    .join(' · ')
}

export function keywords(m: FrameMeta) {
  const k = ['필름']
  if (m.cameraBrand) k.push(`${m.cameraBrand} ${m.cameraModel ?? ''}`.trim())
  if (m.film) k.push(filmDisplayName(m.film), m.film.process)
  if (m.lens) k.push(m.lens)
  if (m.locationName) k.push(m.locationName)
  if (m.lab) k.push(m.lab)
  if (m.scanner) k.push(m.scanner)
  if (m.rollId) k.push(`filmchest:${m.rollId}:${m.frame}`)
  return k
}

// --- 바이너리 문자열 도우미 (piexif는 바이너리 문자열을 쓴다)

function bytesToBinary(bytes: Uint8Array) {
  let s = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) s += String.fromCharCode(...bytes.subarray(i, i + chunk))
  return s
}

function binaryToBytes(s: string) {
  const out = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0xff
  return out
}

/** UTF-8로 인코딩한 바이트를 바이너리 문자열로 (한글 캡션용) */
const utf8Binary = (s: string) => bytesToBinary(new TextEncoder().encode(s))
const binaryUtf8 = (s: string) => new TextDecoder().decode(binaryToBytes(s))

/** 윈도우 XP* 태그: UCS-2LE 바이트 배열 */
function ucs2(s: string) {
  const out: number[] = []
  for (const ch of s + '\0') {
    const c = ch.charCodeAt(0)
    out.push(c & 0xff, c >> 8)
  }
  return out
}

const pad = (n: number) => String(n).padStart(2, '0')

/** EXIF 날짜 문자열 "yyyy:MM:dd HH:mm:ss" (기기 현지 시각) */
export function exifDate(ms: number) {
  const d = new Date(ms)
  return `${d.getFullYear()}:${pad(d.getMonth() + 1)}:${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

export function parseExifDate(s?: string): number | undefined {
  const m = s?.match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/)
  if (!m) return undefined
  return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]).getTime()
}

function toDMS(value: number): [number, number][] {
  const v = Math.abs(value)
  const d = Math.floor(v)
  const mFloat = (v - d) * 60
  const m = Math.floor(mFloat)
  const sec = Math.round((mFloat - m) * 60 * 10000)
  return [[d, 1], [m, 1], [sec, 10000]]
}

export const isJpeg = (data: Uint8Array) => data[0] === 0xff && data[1] === 0xd8

/** 스캔 파일에서 스캐너 정보 읽기 */
export function readScanner(data: Uint8Array): { name?: string; make?: string; model?: string; software?: string } {
  if (!isJpeg(data)) return {}
  try {
    const ex = piexif.load(bytesToBinary(data.subarray(0, Math.min(data.length, 256 * 1024))))
    const clean = (v: unknown) => (typeof v === 'string' ? v.replace(/\0/g, '').trim() || undefined : undefined)
    const make = clean(ex['0th']?.[piexif.ImageIFD.Make])
    const model = clean(ex['0th']?.[piexif.ImageIFD.Model])
    const software = clean(ex['0th']?.[piexif.ImageIFD.Software])
    return { name: scannerName(make, model, software), make, model, software }
  } catch {
    return {}
  }
}

export function scannerName(make?: string, model?: string, software?: string): string | undefined {
  const all = [make, model, software].filter(Boolean).join(' ').toUpperCase()
  if (!all) return undefined
  const suffix = model ? ` ${model}` : ''
  if (all.includes('NORITSU') || all.includes('EZ CONTROLLER')) {
    if (model?.toUpperCase().includes('EZ CONTROLLER')) return 'Noritsu · EZ Controller'
    if (model && !model.toUpperCase().includes('NORITSU')) return `Noritsu ${model}`
    return model ?? 'Noritsu'
  }
  const sp = ['SP-3000', 'SP3000', 'SP-500', 'SP500', 'SP-2000'].find((k) => all.includes(k))
  if (all.includes('FRONTIER') || sp) return `Fujifilm Frontier${sp ? ` ${sp}` : ''}`
  if (all.includes('IMACON') || all.includes('FLEXTIGHT') || all.includes('FLEXCOLOR')) return 'Hasselblad Flextight'
  if (all.includes('PAKON')) return `Kodak Pakon${suffix}`
  if (all.includes('COOLSCAN') || (all.includes('NIKON') && all.includes('LS-'))) return `Nikon Coolscan${suffix}`
  if (all.includes('EPSON')) return `Epson${suffix.replace(' EPSON', '')}`
  if (all.includes('PLUSTEK')) return `Plustek${suffix}`
  if (all.includes('SILVERFAST')) return 'SilverFast'
  if (all.includes('VUESCAN')) return 'VueScan'
  return [make, model].filter(Boolean).join(' ') || undefined
}

/** 메타데이터를 써 넣은 새 JPEG. JPEG가 아니면 원본 그대로. */
export function writeMeta(data: Uint8Array, m: FrameMeta): Uint8Array {
  if (!isJpeg(data)) return data
  const bin = bytesToBinary(data)
  let ex: Record<string, Record<number, unknown>>
  try {
    ex = piexif.load(bin)
  } catch {
    ex = { '0th': {}, Exif: {}, GPS: {}, Interop: {}, '1st': {}, thumbnail: null as never }
  }
  ex['0th'] ??= {}
  ex.Exif ??= {}
  ex.GPS ??= {}
  // 썸네일/호환 문제가 잦은 1st IFD는 비운다
  ex['1st'] = {}
  ;(ex as Record<string, unknown>).thumbnail = null

  const I = piexif.ImageIFD, E = piexif.ExifIFD, G = piexif.GPSIFD
  const cap = caption(m)

  if (m.date !== undefined) ex.Exif[E.DateTimeOriginal] = exifDate(m.date)
  if (m.cameraBrand) ex['0th'][I.Make] = utf8Binary(m.cameraBrand)
  if (m.cameraModel) ex['0th'][I.Model] = utf8Binary(m.cameraModel)
  if (m.lens) ex.Exif[E.LensModel] = utf8Binary(m.lens)
  if (m.iso) ex.Exif[E.ISOSpeedRatings] = m.iso
  if (m.scanner) ex['0th'][I.Software] = utf8Binary(m.scanner)
  ex['0th'][I.ImageDescription] = utf8Binary(cap)
  ex['0th'][I.XPComment] = ucs2(cap)
  ex['0th'][I.XPKeywords] = ucs2(keywords(m).join(';'))
  // 롤 표식은 사진 앱·다른 앱이 지우기 어려운 EXIF 사용자 설명에도 남긴다 (복구용)
  if (m.rollId) ex.Exif[E.UserComment] = `ASCII\0\0\0filmchest:${m.rollId}:${m.frame}`
  if (m.point) {
    ex.GPS[G.GPSLatitudeRef] = m.point.latitude >= 0 ? 'N' : 'S'
    ex.GPS[G.GPSLatitude] = toDMS(m.point.latitude)
    ex.GPS[G.GPSLongitudeRef] = m.point.longitude >= 0 ? 'E' : 'W'
    ex.GPS[G.GPSLongitude] = toDMS(m.point.longitude)
  }
  if (m.exposure) writeExposure(ex.Exif, E, m.exposure)
  const out = piexif.insert(piexif.dump(ex), bin)
  return binaryToBytes(out)
}

/** 읽기 (테스트/확인용) */
export function readMeta(data: Uint8Array) {
  const ex = piexif.load(bytesToBinary(data))
  const I = piexif.ImageIFD, E = piexif.ExifIFD, G = piexif.GPSIFD
  const str = (v: unknown) => (typeof v === 'string' ? binaryUtf8(v).replace(/\0/g, '') : undefined)
  return {
    dateTimeOriginal: ex.Exif?.[E.DateTimeOriginal] as string | undefined,
    dateTimeDigitized: ex.Exif?.[E.DateTimeDigitized] as string | undefined,
    make: str(ex['0th']?.[I.Make]),
    model: str(ex['0th']?.[I.Model]),
    lens: str(ex.Exif?.[E.LensModel]),
    iso: ex.Exif?.[E.ISOSpeedRatings] as number | undefined,
    caption: str(ex['0th']?.[I.ImageDescription]),
    latRef: ex.GPS?.[G.GPSLatitudeRef] as string | undefined,
    fNumber: ratio(ex.Exif?.[E.FNumber]),
    exposureTime: ratio(ex.Exif?.[E.ExposureTime]),
    exposureBias: ratio(ex.Exif?.[E.ExposureBiasValue]),
    exposureProgram: ex.Exif?.[E.ExposureProgram] as number | undefined,
    flash: ex.Exif?.[E.Flash] as number | undefined,
  }
}

const exposureProgram: Record<MeterShot['mode'], number> = { M: 1, P: 2, A: 3, S: 4 }

/** 조리개·셔터·보정·플래시·모드를 EXIF에 넣는다. 비어 있는 값은 쓰지 않는다. */
function writeExposure(
  exif: Record<number, unknown>,
  E: typeof piexif.ExifIFD,
  e: NonNullable<FrameMeta['exposure']>,
) {
  if (e.aperture && e.aperture > 0) exif[E.FNumber] = fStop(e.aperture)
  if (e.shutter && e.shutter > 0) exif[E.ExposureTime] = shutterRational(e.shutter)
  if (e.comp) exif[E.ExposureBiasValue] = [Math.round(e.comp * 3), 3]
  exif[E.Flash] = e.flash ? 1 : 0
  const program = exposureProgram[e.mode]
  if (program) exif[E.ExposureProgram] = program
}

function fStop(n: number): [number, number] {
  const tenths = Math.round(n * 10)
  return tenths % 10 === 0 ? [tenths / 10, 1] : [tenths, 10]
}

function shutterRational(seconds: number): [number, number] {
  if (seconds >= 1) return [Math.round(seconds), 1]
  return [1, Math.max(1, Math.round(1 / seconds))]
}

function ratio(v: unknown): number | undefined {
  if (Array.isArray(v) && v.length >= 2 && Number(v[1])) return Number(v[0]) / Number(v[1])
  if (typeof v === 'number') return v
  return undefined
}

/** 이 앱이 사진에 남긴 롤 표식 */
/** 이 앱(아이폰·웹·갤럭시)이 사진에 남긴 롤 표식. EXIF·IPTC·XMP 어디에 있든 파일 앞부분 바이트에서 찾는다 (UTF-16 윈도우 태그 포함) */
export function readFilmchestMark(data: Uint8Array): { rollId: string; frame: number } | undefined {
  const head = data.subarray(0, Math.min(data.length, 512 * 1024))
  const ascii = bytesToBinary(head)
  const re = /filmchest:([0-9a-fA-F-]{36}):(\d+)/
  let m = ascii.match(re)
  if (!m) m = ascii.replace(/\0/g, '').match(re)
  return m ? { rollId: m[1], frame: Number(m[2]) } : undefined
}

/** 사진 파일의 방향 정보만 바꿔 시계 방향 90°×turns로 보이게 한다 (다시 압축하지 않아 화질·촬영 정보가 그대로). JPEG만. */
export function withRotation(data: Uint8Array, turns: number): Uint8Array {
  const t = ((turns % 4) + 4) % 4
  if (!t || !isJpeg(data)) return data
  try {
    const bin = bytesToBinary(data)
    let ex: Record<string, Record<number, unknown>>
    try { ex = piexif.load(bin) } catch { ex = { '0th': {}, Exif: {}, GPS: {}, Interop: {}, '1st': {} } }
    ex['0th'] = { ...(ex['0th'] ?? {}), [piexif.ImageIFD.Orientation]: [1, 6, 3, 8][t] }
    return binaryToBytes(piexif.insert(piexif.dump(ex), bin))
  } catch {
    return data
  }
}

/** 표식이 없을 때: 이 앱이 적은 사진 정보(설명의 "필름 · 3/36 · …", 카메라, 찍은 날)로 롤을 짐작한다 */
export function guessRollFromMeta(data: Uint8Array): { key: string; frame?: number; frameCount?: number; film?: string; make?: string; model?: string; date?: number } | undefined {
  if (!isJpeg(data)) return undefined
  try {
    const m = readMeta(data)
    const parts = (m.caption ?? '').split(' · ').map((x) => x.trim())
    const at = parts.findIndex((x) => /^\d+\/\d+$/.test(x))
    const [frame, frameCount] = at >= 0 ? parts[at].split('/').map(Number) : []
    const film = at > 0 ? parts[0] : undefined
    const d = (m.dateTimeOriginal ?? m.dateTimeDigitized)?.match(/^(\d{4}):(\d{2}):(\d{2})/)
    const date = d ? new Date(`${d[1]}-${d[2]}-${d[3]}T12:00:00`).getTime() : undefined
    // 필름 이름이나 컷 번호가 있어야 이 앱이 내보낸 사진으로 본다
    if (!film && at < 0) return undefined
    const day = d ? `${d[1]}${d[2]}${d[3]}` : 'nodate'
    return { key: [m.make ?? '', m.model ?? '', film ?? '', day].join('|'), frame, frameCount, film, make: m.make, model: m.model, date }
  } catch {
    return undefined
  }
}
