import { lensData } from './lensData'

/** 마운트별로 잘 알려진 렌즈 (catalog/lenses.mjs에서 생성) */
export const lensCatalog = lensData

export function lensesFor(mount?: string, text = '') {
  if (!mount) return []
  const key = Object.keys(lensCatalog).find((m) => m.toLowerCase() === mount.toLowerCase())
  const list = key ? lensCatalog[key] : []
  const q = text.toLowerCase().replace(/\s+/g, '')
  return q ? list.filter((l) => l.toLowerCase().replace(/\s+/g, '').includes(q)) : list
}
