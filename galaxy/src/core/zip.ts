// 자동 복사: web/src/core/zip.ts (미리보기만 data URI). 여기서 고치지 말 것.
import { bytesToB64 } from '../files'
import JSZip from 'jszip'

/** 압축을 푼 스캔 이미지 한 장 */
export interface ScanFile {
  index: number // 촬영 순서 (1부터)
  name: string // 원래 경로
  data: Uint8Array
  size: number
  type: string // 'jpg' | 'tif' ...
}

export interface ScanSet {
  label: string
  files: ScanFile[]
  totalBytes: number
}

export interface ScanResult {
  primary: ScanSet
  alternatives: ScanSet[]
}

const imageExt = new Set(['jpg', 'jpeg', 'tif', 'tiff', 'png', 'heic', 'heif', 'dng'])

export const extOf = (path: string) => (path.split('.').pop() ?? '').toLowerCase()

/** 아이폰은 zip인데 이름에 확장자가 없거나 종류가 application/octet-stream인 경우가 있다. */
export function isZipFile(file: { name: string; type?: string }) {
  return /\.zip$/i.test(file.name) || /zip/i.test(file.type ?? '')
}

export function isScanImage(path: string) {
  const parts = path.split('/')
  if (parts.some((p) => p === '__MACOSX' || p.startsWith('.'))) return false
  return imageExt.has(extOf(path))
}

export function formatFamily(path: string) {
  const e = extOf(path)
  if (e === 'jpg' || e === 'jpeg') return 'JPG'
  if (e === 'tif' || e === 'tiff') return 'TIFF'
  if (e === 'heic' || e === 'heif') return 'HEIC'
  return e.toUpperCase()
}

/** 숫자는 숫자로 비교 ("2.jpg" < "10.jpg") */
export const naturalCompare = (a: string, b: string) =>
  a.localeCompare(b, 'en', { numeric: true, sensitivity: 'base' })

/** 파일명 인코딩: UTF-8 → CP949(국내 Windows 압축) 순서로 */
export function decodeFileName(bytes: Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    try {
      return new TextDecoder('euc-kr').decode(bytes)
    } catch {
      try { return new TextDecoder('latin1').decode(bytes) } catch { return String.fromCharCode(...bytes) }
    }
  }
}

function group(files: { name: string; data: Uint8Array }[]): ScanResult {
  if (files.length === 0) throw new Error('사진 파일이 없어요.')
  const groups = new Map<string, { name: string; data: Uint8Array }[]>()
  for (const f of files) {
    const folder = f.name.includes('/') ? f.name.slice(0, f.name.lastIndexOf('/')) : ''
    const key = `${folder}|${formatFamily(f.name)}`
    groups.set(key, [...(groups.get(key) ?? []), f])
  }
  const sets: ScanSet[] = [...groups.entries()].map(([key, list]) => {
    const [folder, fam] = key.split('|')
    const sorted = [...list].sort((a, b) => naturalCompare(a.name, b.name))
    const out = sorted.map((f, i) => ({
      index: i + 1, name: f.name, data: f.data, size: f.data.byteLength, type: extOf(f.name),
    }))
    return {
      label: folder ? `${folder}/ · ${fam}` : fam,
      files: out,
      totalBytes: out.reduce((s, f) => s + f.size, 0),
    }
  })
  sets.sort((a, b) => b.totalBytes - a.totalBytes)
  return { primary: sets[0], alternatives: sets.slice(1) }
}

/** zip을 풀어 촬영 순서대로 정렬. 해상도/포맷이 여러 벌이면 가장 큰 묶음이 기본. */
export async function readZip(data: Blob | ArrayBuffer | Uint8Array): Promise<ScanResult> {
  const zip = await JSZip.loadAsync(data, { decodeFileName: (b) => decodeFileName(b as Uint8Array) })
  const entries = Object.values(zip.files).filter((e) => !e.dir && isScanImage(e.name))
  const files = await Promise.all(entries.map(async (e) => ({ name: e.name, data: await e.async('uint8array') })))
  return group(files)
}

/** 가져오기 전에 보여줄 몇 장. 가능하면 JPG 묶음에서 고른다. */
export async function previewZip(file: Uint8Array, limit = 8): Promise<{ paths: string[]; thumbs: string[] }> {
  const zip = await JSZip.loadAsync(file, { decodeFileName: (b) => decodeFileName(b as Uint8Array) })
  const entries = Object.values(zip.files).filter((e) => !e.dir && isScanImage(e.name))
  const groups = new Map<string, typeof entries>()
  for (const e of entries) {
    const folder = e.name.includes('/') ? e.name.slice(0, e.name.lastIndexOf('/')) : ''
    const key = `${folder}|${formatFamily(e.name)}`
    groups.set(key, [...(groups.get(key) ?? []), e])
  }
  const jpg = [...groups.entries()].filter(([k]) => k.endsWith('|JPG')).sort((a, b) => b[1].length - a[1].length)[0]
  const chosen = (jpg?.[1] ?? [...groups.values()].sort((a, b) => b.length - a.length)[0] ?? [])
    .slice().sort((a, b) => naturalCompare(a.name, b.name)).slice(0, limit)
  const thumbs: string[] = []
  for (const e of chosen) {
    const data = await e.async('uint8array')
    const ext = extOf(e.name)
    const type = ext === 'png' ? 'image/png' : 'image/jpeg'
    thumbs.push(`data:${type};base64,${bytesToB64(data)}`)
  }
  return { paths: entries.map((e) => e.name), thumbs }
}
