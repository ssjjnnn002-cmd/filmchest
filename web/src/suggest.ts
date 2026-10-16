import { getPref, setPref } from './platform'

function read(key: string): string[] {
  try { return JSON.parse(getPref(key, '[]')) as string[] } catch { return [] }
}

function hiddenKey(kind: string) {
  if (kind === 'knownSellers') return 'hiddenSellers'
  if (kind === 'labs') return 'hiddenLabs'
  return `hidden.${kind}`
}

export function hiddenSet(kind: string) {
  return new Set(read(hiddenKey(kind)).map((name) => name.toLowerCase()))
}

export function rememberSuggestion(kind: string, raw: string) {
  const name = raw.trim()
  if (!name) return
  const list = read(kind).filter((item) => item.toLowerCase() !== name.toLowerCase())
  list.unshift(name)
  setPref(kind, JSON.stringify(list.slice(0, 40)))
  const hidden = read(hiddenKey(kind)).filter((item) => item.toLowerCase() !== name.toLowerCase())
  setPref(hiddenKey(kind), JSON.stringify(hidden))
}

export function forgetSuggestion(kind: string, raw: string) {
  const name = raw.trim()
  if (!name) return
  setPref(kind, JSON.stringify(read(kind).filter((item) => item.toLowerCase() !== name.toLowerCase())))
  const hidden = read(hiddenKey(kind)).filter((item) => item.toLowerCase() !== name.toLowerCase())
  hidden.unshift(name)
  setPref(hiddenKey(kind), JSON.stringify(hidden.slice(0, 40)))
}
