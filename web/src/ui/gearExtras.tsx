import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import type { GearAccessory } from '../core/types'
import { priceText, priceValue, uid } from '../core/types'
import { groupPrice } from '../core/optics'
import { getPref } from '../platform'
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
          <input className="input" style={{ textAlign: 'left' }} placeholder="태그 추가" value={text}
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

const accessoryNames = ['그립', '소프트 셔터 버튼', '스트랩', '스트랩 고리', '렌즈 후드', '케이스']

/** 악세서리 이름·가격 + 본체 포함 합계 */
export function AccessoryFields({ items, setItems, bodyPrice }: { items: GearAccessory[]; setItems: (v: GearAccessory[]) => void; bodyPrice: string }) {
  const total = priceValue(bodyPrice) + items.reduce((n, a) => n + priceValue(a.price), 0)
  const patch = (id: string, p: Partial<GearAccessory>) => setItems(items.map((a) => (a.id === id ? { ...a, ...p } : a)))
  return (
    <div className="section">
      <h2>악세서리</h2>
      <div className="group">
        {items.map((a) => (
          <div key={a.id} className="field">
            <input className="input" style={{ textAlign: 'left' }} placeholder="이름" value={a.name} onChange={(e) => patch(a.id, { name: e.target.value })} />
            <input className="input" style={{ maxWidth: 120 }} placeholder="가격" inputMode="numeric" value={a.price ?? ''}
              onChange={(e) => patch(a.id, { price: groupPrice(e.target.value) || undefined })} />
            <button type="button" className="chip-x" aria-label={`${a.name || '악세서리'} 지우기`} onClick={() => setItems(items.filter((x) => x.id !== a.id))}>×</button>
          </div>
        ))}
        <div className="suggest" style={{ paddingTop: 12 }}>
          {accessoryNames.map((n) => <button key={n} type="button" className="chip" onClick={() => setItems([...items, { id: uid(), name: n }])}>+ {n}</button>)}
          <button type="button" className="chip" onClick={() => setItems([...items, { id: uid(), name: '' }])}>+ 직접 입력</button>
        </div>
        {total > 0 && (
          <div className="field"><label>본체 + 악세서리</label><div><b>{priceText(total)}</b></div></div>
        )}
      </div>
    </div>
  )
}
