// 묶어 보기 (내 장비 카메라·필름 재고, 필름 고르기 '더보기', 카메라 목록). 아이폰 GearGrouping.swift와 같은 이름·순서
import type { BodyStyle, Camera, FilmFormat, FilmLot } from './types'
import { formatFamily, styleName } from './types'
import type { FilmStock } from './films'
import { filmById, filmDisplayName } from './films'

export type GearGroup = 'none' | 'tag' | 'brand' | 'type' | 'iso' | 'process' | 'format'

export const groupTitle: Record<GearGroup, string> = {
  none: '묶지 않기', tag: '태그', brand: '브랜드', type: '유형', iso: 'ISO', process: '종류', format: '규격',
}
export const cameraGroups: GearGroup[] = ['none', 'tag', 'brand', 'type']
/** 내 장비 필름 재고: 늘 묶어서 본다 (기본은 브랜드, 아이폰과 같음) */
export const filmStockGroups: GearGroup[] = ['brand', 'iso', 'process', 'format']
export const filmStockGroupOf = (v: string): GearGroup => (filmStockGroups.includes(v as GearGroup) ? (v as GearGroup) : 'brand')

/** 내 장비 필름 재고 정렬: 알파벳 · 재고량 · 자주 사용 */
export type FilmLotSort = 'name' | 'count' | 'usage'
export const filmLotSortTitle: Record<FilmLotSort, string> = { name: '알파벳', count: '재고량', usage: '자주 사용' }

/** 재고를 고른 기준으로 늘어놓는다 (같으면 이름순). used = 필름 id → 쓴 롤 수 */
export function sortLots(lots: FilmLot[], by: FilmLotSort, desc: boolean, used: Record<string, number>): FilmLot[] {
  const name = (l: FilmLot) => filmDisplayName(filmById(l.filmId)).toLowerCase()
  const key = (l: FilmLot) => (by === 'count' ? l.count : by === 'usage' ? used[l.filmId] ?? 0 : 0)
  const asc = [...lots].sort((a, b) => key(a) - key(b) || name(a).localeCompare(name(b)))
  return desc ? asc.reverse() : asc
}

type Key = { sort: string; title: string }

/** 같은 묶음 이름끼리 모으고, sort 값 순서로 묶음을 늘어놓는다 (묶음 안 순서는 그대로) */
export function groupSections<T>(items: T[], key: (x: T) => Key): { title?: string; items: T[] }[] {
  const map = new Map<string, { sort: string; items: T[] }>()
  for (const x of items) {
    const k = key(x)
    if (!map.has(k.title)) map.set(k.title, { sort: k.sort, items: [] })
    map.get(k.title)!.items.push(x)
  }
  return [...map.entries()]
    .sort(([ta, a], [tb, b]) => (a.sort < b.sort ? -1 : a.sort > b.sort ? 1 : ta.localeCompare(tb)))
    .map(([title, v]) => ({ title, items: v.items }))
}

const processKey: Record<FilmStock['process'], Key> = {
  'C-41': { sort: '0', title: '컬러 네거티브' },
  'B&W': { sort: '1', title: '흑백' },
  'E-6': { sort: '2', title: '슬라이드' },
  'ECN-2': { sort: '3', title: '영화용' },
  instant: { sort: '4', title: '인스턴트' },
}

export function filmKey(f: FilmStock, g: GearGroup): Key {
  if (g === 'brand') return { sort: f.brand.toLowerCase(), title: f.brand || '기타' }
  if (g === 'iso') return { sort: String(f.iso).padStart(6, '0'), title: `ISO ${f.iso}` }
  if (g === 'process') return processKey[f.process]
  if (g === 'format') return formatFamily(f.formats[0] ?? '135')
  return { sort: '', title: '' }
}

/** 필름 고르기 한 칸. format이 있으면 그 규격으로 보여 주고 고른다 (규격으로 묶을 때) */
export interface FilmPickItem { film: FilmStock; format?: FilmFormat }

/** 필름 고르기(장착·재고 추가 '더보기'): 묶기(브랜드·ISO·종류·규격)가 1순위, 그 안에서 정렬(알파벳·재고량·자주 사용, 오름/내림).
 *  규격으로 묶으면 35mm·120처럼 여러 규격으로 나오는 필름은 규격마다 한 칸씩. stock = 필름 id → 재고 롤 수, used = 필름 id → 쓴 롤 수 */
export function filmPickSections(list: FilmStock[], g: GearGroup, by: FilmLotSort, desc: boolean,
  stock: Record<string, number>, used: Record<string, number>): { title?: string; items: FilmPickItem[] }[] {
  const name = (f: FilmStock) => filmDisplayName(f).toLowerCase()
  const key = (f: FilmStock) => (by === 'count' ? stock[f.id] ?? 0 : by === 'usage' ? used[f.id] ?? 0 : 0)
  const asc = [...list].sort((a, b) => key(a) - key(b) || name(a).localeCompare(name(b)) || a.iso - b.iso)
  const sorted = desc ? asc.reverse() : asc
  if (g === 'format') {
    const items: FilmPickItem[] = []
    for (const film of sorted) {
      const seen = new Set<string>()
      for (const f of film.formats) {
        const t = formatFamily(f).title
        if (!seen.has(t)) { seen.add(t); items.push({ film, format: f }) }
      }
    }
    return groupSections(items, (x) => formatFamily(x.format!))
  }
  return groupSections(sorted.map((film) => ({ film })), (x) => filmKey(x.film, g))
}

export function lotKey(l: FilmLot, g: GearGroup): Key {
  if (g === 'format') return formatFamily(l.format)
  const f = filmById(l.filmId)
  if (!f) return { sort: '~', title: '기타' }
  return filmKey(f, g)
}

const typeOrder: BodyStyle[] = ['slr', 'rangefinder', 'compact', 'mediumFormat']
export function styleKey(style: BodyStyle): Key {
  const i = typeOrder.indexOf(style)
  return { sort: String(i < 0 ? 9 : i), title: styleName[style] }
}

export function cameraKey(c: Pick<Camera, 'brand' | 'style'>, g: GearGroup): Key {
  if (g === 'brand') return { sort: c.brand.toLowerCase(), title: c.brand || '기타' }
  if (g === 'type') return styleKey(c.style)
  return { sort: '', title: '' }
}
