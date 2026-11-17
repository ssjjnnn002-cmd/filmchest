// 자동 복사: web/src/core/gearGroup.ts (node scripts/sync-galaxy-core.mjs). 여기서 고치지 말 것.
// 묶어 보기 (내 장비 카메라·필름 재고, 필름 고르기 '더보기', 카메라 목록). 아이폰 GearGrouping.swift와 같은 이름·순서
import type { BodyStyle, Camera, FilmLot } from './types'
import { styleName } from './types'
import type { FilmStock } from './films'
import { filmById, filmDisplayName } from './films'

export type GearGroup = 'none' | 'tag' | 'brand' | 'type' | 'iso' | 'process' | 'format'

export const groupTitle: Record<GearGroup, string> = {
  none: '묶지 않기', tag: '태그', brand: '브랜드', type: '유형', iso: 'ISO', process: '흑백·컬러', format: '35mm·120',
}
export const cameraGroups: GearGroup[] = ['none', 'tag', 'brand', 'type']
export const filmStockGroups: GearGroup[] = ['none', 'brand', 'iso', 'process', 'format']
/** 필름 고르기 (none은 '추천' 순) */
export const filmPickGroups: GearGroup[] = ['none', 'brand', 'iso', 'process']

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
}

export function filmKey(f: FilmStock, g: GearGroup): Key {
  if (g === 'brand') return { sort: f.brand.toLowerCase(), title: f.brand || '기타' }
  if (g === 'iso') return { sort: String(f.iso).padStart(6, '0'), title: `ISO ${f.iso}` }
  if (g === 'process') return processKey[f.process]
  return { sort: '', title: '' }
}

/** 필름 목록을 고른 기준으로 묶는다 (묶음 안은 이름순) */
export function filmSections(list: FilmStock[], g: GearGroup): { title?: string; items: FilmStock[] }[] {
  if (g === 'none') return [{ items: list }]
  const byName = [...list].sort((a, b) => filmDisplayName(a).toLowerCase().localeCompare(filmDisplayName(b).toLowerCase()) || a.iso - b.iso)
  return groupSections(byName, (f) => filmKey(f, g))
}

export function lotKey(l: FilmLot, g: GearGroup): Key {
  if (g === 'format') return l.format.startsWith('120') ? { sort: '1', title: '120' } : { sort: '0', title: '35mm' }
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
