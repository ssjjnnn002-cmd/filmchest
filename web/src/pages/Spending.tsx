import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, kept } from '../db'
import type { Camera, Lens } from '../core/types'
import { kindOf, priceText, priceValue } from '../core/types'
import { filmById, filmDisplayName } from '../core/films'
import { Sheet } from '../ui/common'

/** 장비에 쓴 돈: 전체, 종류별, 카메라 조합(카메라 + 렌즈 + 액세서리), 장비별, 필름 */
export function Spending({ onClose }: { onClose: () => void }) {
  const cameras = (useLiveQuery(() => db.cameras.orderBy('sortOrder').toArray(), []) ?? []).filter(kept)
  const lenses = useLiveQuery(() => db.lenses.toArray(), []) ?? []
  const accessories = useLiveQuery(() => db.filters.toArray(), []) ?? []
  const lots = useLiveQuery(() => db.filmLots.toArray(), []) ?? []
  const [open, setOpen] = useState<string>()
  const sum = (list: { price?: string }[]) => list.reduce((n, x) => n + priceValue(x.price), 0)
  const cameraSum = sum(cameras), lensSum = sum(lenses), accSum = sum(accessories), filmSum = sum(lots)
  const gearSum = cameraSum + lensSum + accSum
  // 카메라 상세와 같은 기준: 고른 렌즈, 아니면 같은 마운트 렌즈
  const lensesFor = (c: Camera): Lens[] => c.lensesChosen
    ? (c.lensIds ?? []).map((id) => lenses.find((l) => l.id === id)).filter((l): l is Lens => !!l)
    : c.mount ? lenses.filter((l) => l.mount.toLowerCase() === c.mount!.toLowerCase()) : []
  const accFor = (c: Camera) => (c.accessoryIds ?? []).map((id) => accessories.find((a) => a.id === id)).filter((a): a is NonNullable<typeof a> => !!a)
  const won = (p?: string) => (p ? priceText(priceValue(p)) : '금액 없음')
  const row = (label: string, value: string, key?: string, sub?: string) => (
    <div key={key ?? label} className="row static"><span className="grow"><span className="truncate">{label}</span>{sub && <span className="sub">{sub}</span>}</span><span className="value">{value}</span></div>
  )
  const list = (title: string, items: { id: string; name: string; price?: string }[]) => items.length > 0 && (
    <div className="section">
      <h2>{title}별</h2>
      <div className="group">{[...items].sort((a, b) => priceValue(b.price) - priceValue(a.price)).map((x) => row(x.name, won(x.price), x.id))}</div>
    </div>
  )
  return (
    <Sheet title="장비에 쓴 돈" onClose={onClose} right={<button className="btn ghost" onClick={onClose}><b>완료</b></button>}>
      <div className="section">
        <div className="group" style={{ padding: '14px 18px' }}>
          <span className="sub">여태까지 쓴 돈</span>
          <b style={{ display: 'block', fontSize: 34, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{priceText(gearSum + filmSum)}</b>
        </div>
        <div className="group" style={{ marginTop: 10 }}>
          {row('장비', priceText(gearSum))}
          {row('필름', priceText(filmSum))}
        </div>
        <p className="footnote">구입 금액을 적은 것만 더해요.</p>
      </div>
      <div className="section">
        <h2>종류별</h2>
        <div className="group">
          {row('카메라', priceText(cameraSum), 'c', `${cameras.length}대`)}
          {row('렌즈', priceText(lensSum), 'l', `${lenses.length}개`)}
          {row('액세서리', priceText(accSum), 'a', `${accessories.length}개`)}
          {row('필름', priceText(filmSum), 'f', `${lots.length}묶음`)}
        </div>
      </div>
      {cameras.length > 0 && (
        <div className="section">
          <h2>카메라 조합</h2>
          <div className="group">
            {cameras.map((c) => {
              const ls = lensesFor(c), acc = accFor(c)
              const total = priceValue(c.price) + sum(ls) + sum(acc)
              return (
                <div key={c.id}>
                  <button type="button" className="row" onClick={() => setOpen(open === c.id ? undefined : c.id)}>
                    <span className="grow truncate">{c.brand} {c.model}</span>
                    <span className="value">{priceText(total)} {open === c.id ? '▴' : '▾'}</span>
                  </button>
                  {open === c.id && (
                    <div style={{ paddingLeft: 16, fontSize: 15 }}>
                      {row('본체', won(c.price))}
                      {ls.map((l) => row(`렌즈 · ${l.brand} ${l.model}`, won(l.price), l.id))}
                      {acc.map((a) => row(`${kindOf(a)} · ${a.name}`, won(a.price), a.id))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <p className="footnote">카메라 + 이 카메라에 쓰는 렌즈 + 액세서리. 렌즈를 여러 카메라에 쓰면 각 조합에 모두 들어가요.</p>
        </div>
      )}
      {list('카메라', cameras.map((c) => ({ id: c.id, name: `${c.brand} ${c.model}`, price: c.price })))}
      {list('렌즈', lenses.map((l) => ({ id: l.id, name: `${l.brand} ${l.model}`, price: l.price })))}
      {list('액세서리', accessories.map((a) => ({ id: a.id, name: `${kindOf(a)} · ${a.name}`, price: a.price })))}
      {list('필름', lots.map((l) => ({ id: l.id, name: `${filmDisplayName(filmById(l.filmId))} · ${l.count}롤`, price: l.price })))}
    </Sheet>
  )
}
