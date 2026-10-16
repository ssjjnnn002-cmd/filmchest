import type { FilmFormat, FilmProcess } from './types'

// 필름 통 일러스트 색. 실제 패키지 색감을 참고한 근사값 (iOS 앱과 같음)
export interface CanisterStyle {
  body: string
  band: string
  text: string
  bandText: string
  cap: string
}

export interface FilmStock {
  id: string
  brand: string
  name: string
  iso: number
  process: FilmProcess
  formats: FilmFormat[]
  style: CanisterStyle
}

const s = (body: string, band: string, text: string, bandText: string, cap = '#2B2B2B'): CanisterStyle => ({
  body, band, text, bandText, cap,
})
const both: FilmFormat[] = ['135', '120-66']
const only135: FilmFormat[] = ['135']

const f = (id: string, brand: string, name: string, iso: number, process: FilmProcess, style: CanisterStyle,
  formats: FilmFormat[] = both): FilmStock => ({ id, brand, name, iso, process, formats, style })

export const films: FilmStock[] = [
  f('kodak-portra-160', 'Kodak', 'Portra 160', 160, 'C-41', s('#F4EFE4', '#E39B2D', '#3A2E22', '#FFFFFF')),
  f('kodak-portra-400', 'Kodak', 'Portra 400', 400, 'C-41', s('#F4EFE4', '#F2A71B', '#3A2E22', '#FFFFFF')),
  f('kodak-portra-800', 'Kodak', 'Portra 800', 800, 'C-41', s('#F4EFE4', '#D9771E', '#3A2E22', '#FFFFFF')),
  f('kodak-ektar-100', 'Kodak', 'Ektar 100', 100, 'C-41', s('#FFC20E', '#E2231A', '#1A1A1A', '#FFFFFF')),
  f('kodak-gold-200', 'Kodak', 'Gold 200', 200, 'C-41', s('#FDB913', '#C8102E', '#1A1A1A', '#FFFFFF')),
  f('kodak-ultramax-400', 'Kodak', 'UltraMax 400', 400, 'C-41', s('#FDB913', '#1F4E9C', '#1A1A1A', '#FFFFFF'), only135),
  f('kodak-colorplus-200', 'Kodak', 'ColorPlus 200', 200, 'C-41', s('#FDB913', '#5B3A8C', '#1A1A1A', '#FFFFFF'), only135),
  f('kodak-ektachrome-e100', 'Kodak', 'Ektachrome E100', 100, 'E-6', s('#1B1B1B', '#FDB913', '#FFFFFF', '#1B1B1B')),
  f('kodak-trix-400', 'Kodak', 'Tri-X 400', 400, 'B&W', s('#FDB913', '#1B1B1B', '#1B1B1B', '#FDB913')),
  f('kodak-tmax-100', 'Kodak', 'T-Max 100', 100, 'B&W', s('#FDB913', '#2E5AA8', '#1B1B1B', '#FFFFFF')),
  f('kodak-tmax-400', 'Kodak', 'T-Max 400', 400, 'B&W', s('#FDB913', '#C8102E', '#1B1B1B', '#FFFFFF')),
  f('kodak-vision3-250d', 'Kodak', 'Vision3 250D', 250, 'ECN-2', s('#2A2A2A', '#E8B02E', '#F2F2F2', '#1B1B1B'), only135),
  f('kodak-vision3-500t', 'Kodak', 'Vision3 500T', 500, 'ECN-2', s('#2A2A2A', '#3C7DD9', '#F2F2F2', '#FFFFFF'), only135),
  f('fuji-200', 'Fujifilm', '200', 200, 'C-41', s('#F5F5F2', '#00A15F', '#1B1B1B', '#FFFFFF'), only135),
  f('fuji-400', 'Fujifilm', '400', 400, 'C-41', s('#F5F5F2', '#2B6CB0', '#1B1B1B', '#FFFFFF'), only135),
  f('fuji-superia-xtra-400', 'Fujifilm', 'Superia X-TRA 400', 400, 'C-41', s('#0C8A4B', '#E2231A', '#FFFFFF', '#FFFFFF'), only135),
  f('fuji-c200', 'Fujifilm', 'Fujicolor C200', 200, 'C-41', s('#00A15F', '#F5F5F2', '#FFFFFF', '#00A15F'), only135),
  f('fuji-pro-400h', 'Fujifilm', 'Pro 400H', 400, 'C-41', s('#EDEDED', '#6CB33F', '#1B1B1B', '#FFFFFF')),
  f('fuji-velvia-50', 'Fujifilm', 'Velvia 50', 50, 'E-6', s('#5A2D82', '#E2231A', '#FFFFFF', '#FFFFFF')),
  f('fuji-velvia-100', 'Fujifilm', 'Velvia 100', 100, 'E-6', s('#7A2A82', '#F5F5F2', '#FFFFFF', '#7A2A82')),
  f('fuji-provia-100f', 'Fujifilm', 'Provia 100F', 100, 'E-6', s('#1E4FA0', '#F5F5F2', '#FFFFFF', '#1E4FA0')),
  f('fuji-acros-100-ii', 'Fujifilm', 'Acros II 100', 100, 'B&W', s('#1B1B1B', '#9A9A9A', '#FFFFFF', '#1B1B1B')),
  f('ilford-hp5-plus', 'Ilford', 'HP5 Plus', 400, 'B&W', s('#1B1B1B', '#F5F5F2', '#F5F5F2', '#1B1B1B', '#111111')),
  f('ilford-fp4-plus', 'Ilford', 'FP4 Plus', 125, 'B&W', s('#1B1B1B', '#2F6DB5', '#F5F5F2', '#FFFFFF', '#111111')),
  f('ilford-delta-100', 'Ilford', 'Delta 100', 100, 'B&W', s('#F5F5F2', '#1B1B1B', '#1B1B1B', '#F5F5F2')),
  f('ilford-delta-400', 'Ilford', 'Delta 400', 400, 'B&W', s('#F5F5F2', '#E2231A', '#1B1B1B', '#FFFFFF')),
  f('ilford-delta-3200', 'Ilford', 'Delta 3200', 3200, 'B&W', s('#F5F5F2', '#5A2D82', '#1B1B1B', '#FFFFFF')),
  f('ilford-panf-plus-50', 'Ilford', 'Pan F Plus 50', 50, 'B&W', s('#1B1B1B', '#E85D9C', '#F5F5F2', '#FFFFFF', '#111111')),
  f('ilford-xp2-super', 'Ilford', 'XP2 Super', 400, 'C-41', s('#1B1B1B', '#F28C28', '#F5F5F2', '#1B1B1B', '#111111')),
  f('kentmere-pan-400', 'Kentmere', 'Pan 400', 400, 'B&W', s('#F5F5F2', '#E87722', '#1B1B1B', '#FFFFFF'), only135),
  f('harman-phoenix-200', 'Harman', 'Phoenix 200', 200, 'C-41', s('#F15A22', '#1B1B1B', '#FFFFFF', '#F15A22')),
  f('cinestill-800t', 'CineStill', '800T', 800, 'C-41', s('#1B1B1B', '#D7262E', '#FFFFFF', '#FFFFFF', '#111111')),
  f('cinestill-400d', 'CineStill', '400D', 400, 'C-41', s('#1B1B1B', '#F2A71B', '#FFFFFF', '#1B1B1B', '#111111')),
  f('cinestill-50d', 'CineStill', '50D', 50, 'C-41', s('#1B1B1B', '#3C9DD9', '#FFFFFF', '#FFFFFF', '#111111')),
  f('lomo-cn-100', 'Lomography', 'Color Negative 100', 100, 'C-41', s('#F5F5F2', '#F4C430', '#1B1B1B', '#1B1B1B')),
  f('lomo-cn-400', 'Lomography', 'Color Negative 400', 400, 'C-41', s('#F5F5F2', '#E2231A', '#1B1B1B', '#FFFFFF')),
  f('lomo-cn-800', 'Lomography', 'Color Negative 800', 800, 'C-41', s('#F5F5F2', '#1F4E9C', '#1B1B1B', '#FFFFFF')),
  f('lomo-lomochrome-purple', 'Lomography', 'LomoChrome Purple', 400, 'C-41', s('#6B2C91', '#E85D9C', '#FFFFFF', '#FFFFFF')),
  f('foma-fomapan-100', 'Foma', 'Fomapan 100', 100, 'B&W', s('#F5F5F2', '#2E8B57', '#1B1B1B', '#FFFFFF')),
  f('foma-fomapan-400', 'Foma', 'Fomapan 400', 400, 'B&W', s('#F5F5F2', '#C8102E', '#1B1B1B', '#FFFFFF')),
]

const genericFilmWord = new Set(['plus', 'super', 'ii', 'color', 'negative', 'pan'])

function normFilm(text: string) {
  return text.toLowerCase().replace(/(\d+)/g, ' $1 ').replace(/[^a-z0-9가-힣]+/g, ' ').replace(/\s+/g, ' ').trim()
}

/** 폴더명·파일명에 필름 이름이 있으면 그 필름 id. 여럿이 같으면 비운다. */
export function filmFromText(text: string): string | undefined {
  const hay = normFilm(text)
  if (!hay) return undefined
  const words = hay.split(' ')
  const hits: { id: string; score: number }[] = []
  for (const film of films) {
    const name = normFilm(film.name)
    const tokens = name.split(' ')
    const compactName = name.replace(/ /g, '')
    const compactHay = hay.replace(/ /g, '')
    if (compactName.length >= 4 && compactHay.includes(compactName)) {
      hits.push({ id: film.id, score: 100 + compactName.length })
      continue
    }
    const keys = tokens.filter((t) => t.length >= 2 && !/^\d+$/.test(t) && !genericFilmWord.has(t))
    const nums = tokens.filter((t) => /^\d+$/.test(t))
    if (!keys.length || !keys.every((t) => hay.includes(t))) continue
    const numsOK = nums.length > 0 && nums.every((n) => words.includes(n))
    if (nums.length && !numsOK && keys.length < 2) continue
    const score = name.length + (hay.includes(normFilm(film.brand)) ? 8 : 0) + (numsOK ? 20 : 0)
    hits.push({ id: film.id, score })
  }
  hits.sort((a, b) => b.score - a.score)
  if (!hits.length || (hits.length > 1 && hits[0].score === hits[1].score)) return undefined
  return hits[0].id
}

// --- 내가 만든 필름 (목록에 없는 필름). 기기 안에만 저장되고, 앱 시작 때 불러와 여기 채운다.

export interface CustomFilmRow {
  id: string // 'custom-…'
  name: string
  iso: number
  color: string // 필름통 색 (#RRGGBB)
  bw?: boolean // 흑백
  createdAt: number
}

export const customFilms: FilmStock[] = []

const lum = (hex: string) => {
  const n = parseInt(hex.replace('#', ''), 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255)
  return 0.299 * r + 0.587 * g + 0.114 * b
}
const shade = (hex: string, amt: number) => {
  const n = parseInt(hex.replace('#', ''), 16)
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.max(0, Math.min(255, Math.round(v + amt * 255))))
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

/** 색 하나로 필름통 색 조합을 만든다 (글자는 바탕에 맞춰 검정/흰색) */
export function customStock(row: CustomFilmRow): FilmStock {
  const light = lum(row.color) > 0.55
  const band = shade(row.color, light ? -0.28 : 0.22)
  return {
    id: row.id, brand: '', name: row.name, iso: row.iso, process: row.bw ? 'B&W' : 'C-41', formats: ['135', '120-66'],
    style: { body: row.color, band, text: light ? '#1B1B1B' : '#F5F5F2', bandText: lum(band) > 0.55 ? '#1B1B1B' : '#FFFFFF', cap: '#2B2B2B' },
  }
}

export function setCustomFilms(rows: CustomFilmRow[]) {
  customFilms.splice(0, customFilms.length, ...rows.sort((a, b) => b.createdAt - a.createdAt).map(customStock))
}

/** 기본 목록 + 내가 만든 필름 */
export const allFilms = () => [...customFilms, ...films]

export const filmById = (id?: string) => customFilms.find((x) => x.id === id) ?? films.find((x) => x.id === id)
export const filmDisplayName = (f?: FilmStock) => (f ? [f.brand, f.name].filter(Boolean).join(' ') : '필름 알 수 없음')
export const edgeMarking = (f: FilmStock) => [f.brand, f.name].filter(Boolean).join(' ').toUpperCase()

/** 처음 쓰는 사람에게 먼저 보여줄 필름 */
export const popularFilms = ['kodak-portra-400', 'kodak-gold-200', 'ilford-hp5-plus', 'kodak-ultramax-400',
  'fuji-400', 'kodak-trix-400', 'cinestill-800t', 'kodak-ektar-100']
