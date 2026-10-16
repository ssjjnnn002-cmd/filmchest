import { formatInfo, styleName, type BodyStyle, type FilmFormat } from './types'
import { catalogData } from './cameraData'

/** 앱이 알고 있는 필름 카메라 (iOS 앱과 같은 목록). 배터리는 확실한 것만. */
export interface CatalogCamera {
  brand: string
  model: string
  style: BodyStyle
  format: FilmFormat
  mount?: string
  lens?: string
  battery?: string
  aka?: string[] // 다른 이름 (예: AF600 → Lite Touch)
}

export const catalog: CatalogCamera[] = catalogData

export const catalogName = (c: CatalogCamera) => `${c.brand} ${c.model}`

/** 예: "SLR · 렌즈 교환식", "똑딱이 · 하프 · 렌즈 일체형" */
export function kindText(c: CatalogCamera) {
  const parts = [styleName[c.style]]
  if (c.format === '135-half') parts.push('하프')
  if (formatInfo[c.format].is120) parts.push(formatInfo[c.format].name)
  parts.push(c.mount ? '렌즈 교환식' : '렌즈 일체형')
  return parts.join(' · ')
}

export const catalogBrands = [...new Set(catalog.map((c) => c.brand))].sort()

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, '')

export function brandsMatching(text: string) {
  const q = text.trim().toLowerCase()
  return q ? catalogBrands.filter((b) => b.toLowerCase().includes(q)) : catalogBrands
}

export function modelsMatching(brand: string, text: string) {
  const b = brand.trim().toLowerCase()
  const q = norm(text)
  // 다른 이름으로도 찾고, 제조사를 안 썼으면 "제조사+모델"로도 찾는다
  return catalog.filter((c) => (!b || c.brand.toLowerCase() === b) && (!q || norm(c.model).includes(q)
    || (c.aka ?? []).some((a) => norm(a).includes(q)) || (!b && norm(`${c.brand}${c.model}`).includes(q))))
}

export function catalogMatch(brand: string, model: string) {
  if (!model.trim()) return undefined
  const b = norm(brand), m = norm(model)
  return catalog.find((c) => norm(c.brand) === b && (norm(c.model) === m || (c.aka ?? []).some((a) => norm(a) === m)))
}

// 목록에 없는 모델은 이름으로 짐작
const mediumKeys = ['hasselblad', 'mamiya', 'bronica', 'rolleiflex', 'rolleicord', 'pentax 67', 'pentax 645', 'fuji gw',
  'ga645', 'gf670', 'plaubel', 'yashica mat', 'yashica-mat', 'kiev 88', 'holga', 'diana', 'seagull', 'lubitel', 'makina']
const compactKeys = ['mju', 'stylus', ' xa', 'trip 35', ' pen ', 'pen ee', 't2', 't3', 'contax t', 'gr1', 'big mini', '28ti',
  '35ti', 'l35', 't4', 't5', 'espio', 'klasse', 'natura', 'tiara', 'autoboy', 'sure shot', 'af35', 'tc-1', 'rollei 35',
  'lc-a', 'lomo', 'minilux', 'leica cm', 'hexar af', 'minox', 'zoom', 'prima', 'half']
const rfKeys = ['leica m', ' m2', ' m3', ' m4', ' m5', ' m6', ' m7', ' mp ', 'm-a', 'canonet', '35 rc', '35 sp', '35 dc',
  'electro 35', 'minolta cle', 'hi-matic', 'hexar rf', 'bessa', 'contax g', 'zeiss ikon', 'fed', 'zorki', 'canon p',
  'yashica gsn', 'konica c35', 'olympus 35', 'rangefinder']

export function inferStyle(brand: string, model: string, format: FilmFormat, interchangeable: boolean): BodyStyle {
  const known = catalogMatch(brand, model)
  if (known) return known.style
  const name = ` ${brand} ${model} `.toLowerCase()
  const has = (keys: string[]) => keys.some((k) => name.includes(k))
  if (formatInfo[format].is120 || has(mediumKeys)) return 'mediumFormat'
  if (has(compactKeys)) return 'compact'
  if (has(rfKeys)) return 'rangefinder'
  return interchangeable ? 'slr' : 'compact'
}
