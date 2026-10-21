import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { defaultAccessoryKinds, uid } from '../core/types'
import { getPref, setPref } from '../platform'
import { forgetSuggestion, hiddenSet, rememberSuggestion } from '../suggest'

const cleanTag = (raw: string) => raw.trim().replace(/^#+/, '').trim()

/** 장비·롤에 붙은 모든 태그 */
export function useAllTags() {
  const lists = useLiveQuery(async () => [
    ...(await db.cameras.toArray()).map((x) => x.tags ?? []),
    ...(await db.lenses.toArray()).map((x) => x.tags ?? []),
    ...(await db.filters.toArray()).map((x) => x.tags ?? []),
    ...(await db.rolls.toArray()).map((x) => x.tags ?? []),
  ], [])
  return useMemo(() => (lists ?? []).flat(), [lists])
}

/** 태그 넣기: 붙인 태그(× 빼기) + 입력 + 예전 태그 추천(× 추천 지우기) */
export function TagField({ tags, setTags }: { tags: string[]; setTags: (t: string[]) => void }) {
  const [text, setText] = useState('')
  const [rev, setRev] = useState(0)
  const used = useAllTags()
  const hits = useMemo(() => {
    const hidden = hiddenSet('tags')
    let known: string[] = []
    try { known = JSON.parse(getPref('tags', '[]')) } catch { /* 없음 */ }
    const seen = new Set(tags.map((t) => t.toLowerCase()))
    const out: string[] = []
    for (const t of [...known, ...used]) {
      const k = t.toLowerCase()
      if (hidden.has(k) || seen.has(k)) continue
      seen.add(k)
      out.push(t)
    }
    const q = cleanTag(text).toLowerCase()
    return out.filter((t) => !q || t.toLowerCase().includes(q)).slice(0, 12)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tags, used, text, rev])
  const add = (raw: string) => {
    const t = cleanTag(raw)
    if (!t) return
    if (!tags.some((x) => x.toLowerCase() === t.toLowerCase())) setTags([...tags, t])
    rememberSuggestion('tags', t)
    setText('')
  }
  return (
    <div className="section">
      <h2>태그</h2>
      <div className="group">
        {tags.length > 0 && (
          <div className="suggest" style={{ paddingTop: 12 }}>
            {tags.map((t) => (
              <span key={t} className="chip-row active">
                <span>#{t}</span>
                <button type="button" className="chip-x" style={{ color: '#fff' }} aria-label={`${t} 빼기`} onClick={() => setTags(tags.filter((x) => x !== t))}>×</button>
              </span>
            ))}
          </div>
        )}
        <div className="field">
          <input className="input left" placeholder="태그 추가" value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(text) } }} />
          {text.trim() && <button type="button" className="btn small" onClick={() => add(text)}>추가</button>}
        </div>
        {hits.length > 0 && (
          <div className="suggest">
            {hits.map((t) => (
              <span key={t} className="chip-row">
                <button type="button" onClick={() => add(t)}>#{t}</button>
                <button type="button" className="chip-x" aria-label={`${t} 추천 지우기`} onClick={() => { forgetSuggestion('tags', t); setRev((n) => n + 1) }}>×</button>
              </span>
            ))}
          </div>
        )}
      </div>
      <p className="footnote">검색과 목록 정리에 써요.</p>
    </div>
  )
}

/** 태그 칩 줄 (보기만) */
export function TagChips({ tags }: { tags?: string[] }) {
  if (!tags?.length) return null
  return (
    <div className="suggest" style={{ padding: '4px 0' }}>
      {tags.map((t) => <span key={t} className="chip-row active" style={{ paddingRight: 12 }}>#{t}</span>)}
    </div>
  )
}

/** 태그로 거르는 칩 줄 */
export function TagFilter({ tags, value, onChange }: { tags: string[]; value?: string; onChange: (t?: string) => void }) {
  const list = useMemo(() => {
    const count = new Map<string, number>()
    tags.forEach((t) => count.set(t, (count.get(t) ?? 0) + 1))
    return [...count.keys()].sort((a, b) => (count.get(b)! - count.get(a)!) || a.localeCompare(b))
  }, [tags])
  if (!list.length) return null
  return (
    <div className="chips" style={{ padding: '0 16px 6px' }}>
      {list.map((t) => (
        <button key={t} className={`chip ${value === t ? 'active' : ''}`} style={{ height: 32, fontSize: 14 }} onClick={() => onChange(value === t ? undefined : t)}>#{t}</button>
      ))}
    </div>
  )
}

/** 액세서리 유형: 기본 + 사용자가 더한 것 */
export function accessoryKinds(): string[] {
  let added: string[] = []
  try { added = JSON.parse(getPref('accessoryKinds', '[]')) } catch { /* 없음 */ }
  return [...defaultAccessoryKinds, ...added.filter((k) => !defaultAccessoryKinds.includes(k))]
}
export function addAccessoryKind(raw: string) {
  const name = raw.trim()
  if (!name || accessoryKinds().includes(name)) return
  let added: string[] = []
  try { added = JSON.parse(getPref('accessoryKinds', '[]')) } catch { /* 없음 */ }
  setPref('accessoryKinds', JSON.stringify([...added, name]))
}

/** 태그별로 묶기. 태그가 여럿이면 여러 묶음에, 태그 없는 것은 맨 아래. 묶지 않으면 제목 없는 한 묶음 */
export function tagSections<T extends { tags?: string[] }>(items: T[], grouped: boolean): { title?: string; items: T[] }[] {
  if (!grouped) return [{ items }]
  const all = [...new Set(items.flatMap((x) => x.tags ?? []))].sort((a, b) => a.localeCompare(b))
  const out: { title?: string; items: T[] }[] = all.map((t) => ({ title: `#${t}`, items: items.filter((x) => x.tags?.includes(t)) }))
  const none = items.filter((x) => !x.tags?.length)
  if (none.length) out.push({ title: '태그 없음', items: none })
  return out
}

/** 블록 안 태그 한 줄. 없어도 자리를 지켜 블록 높이가 같다 */
export function TagLine({ tags }: { tags?: string[] }) {
  return (
    <span className="tag-line" style={{ visibility: tags?.length ? 'visible' : 'hidden' }}>
      {tags?.length ? tags.map((t) => `#${t}`).join(' ') : '#'}
    </span>
  )
}

/** 예전에 카메라 안에 적어 둔 액세서리를 액세서리 탭 장비로 옮긴다 */
export async function migrateAccessories() {
  const cams = await db.cameras.toArray()
  for (const c of cams) {
    if (!c.accessories?.length) continue
    const ids = [...(c.accessoryIds ?? [])]
    for (const a of c.accessories) {
      if (!a.name.trim()) continue
      const id = uid()
      await db.filters.put({ id, kind: accessoryKinds().includes(a.name) ? a.name : '기타', name: a.name, price: a.price, createdAt: Date.now() })
      ids.push(id)
    }
    await db.cameras.update(c.id, { accessories: undefined, accessoryIds: ids })
  }
}
