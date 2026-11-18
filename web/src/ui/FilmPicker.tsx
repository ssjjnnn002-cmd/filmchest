// 필름 고르기 (필름 장착하기 · 필름 재고 추가 같은 목록). 아이폰 FilmPickSection · 갤럭시 FilmPicker와 같음
// 접혀 있을 땐 추천 6개를 가로로, '더보기'를 누르면 검색 + 정렬·묶기 칩(가로 스크롤) + 묶음별 바둑판
import { useMemo, useState, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import type { FilmFormat } from '../core/types'
import { allFilms, filmById, filmDisplayName, isDiscontinued, popularFilms, type FilmStock } from '../core/films'
import { stockCount } from '../core/filmStock'
import { filmFits } from '../core/optics'
import { filmLotSortTitle, filmPickSections, filmStockGroupOf, filmStockGroups, groupTitle, type FilmLotSort, type FilmPickItem, type GearGroup } from '../core/gearGroup'
import { formatFamily } from '../core/types'
import { getPref, setPref } from '../platform'
import { Canister } from './common'

const sorts = Object.keys(filmLotSortTitle) as FilmLotSort[]

export function FilmPicker({ format, anyFormat, filmId, onPick, onAddCustom, onEditCustom, footer }: {
  /** 카메라·재고의 규격 (이 규격에 맞는 필름만) */
  format: FilmFormat
  /** 재고 추가처럼 규격을 같이 고를 땐 모든 규격의 필름을 보여 주고, 고른 칸의 규격을 넘긴다 */
  anyFormat?: boolean
  filmId?: string
  onPick: (id: string, format?: FilmFormat) => void
  onAddCustom: () => void
  onEditCustom: (id: string) => void
  /** 목록 아래 작은 설명 */
  footer?: ReactNode
}) {
  const lots = useLiveQuery(() => db.filmLots.toArray(), []) ?? []
  const rolls = useLiveQuery(() => db.rolls.orderBy('loadedAt').reverse().toArray(), []) ?? []
  const customRows = useLiveQuery(() => db.customFilms.toArray(), []) ?? []
  const [showAll, setShowAll] = useState(false)
  const [search, setSearch] = useState('')
  const [group, setGroup] = useState<GearGroup>(() => filmStockGroupOf(getPref('filmPickGroup', 'brand' as string)))
  const [by, setBy] = useState<FilmLotSort>(() => {
    const v = getPref('filmPickBy', 'name' as string) as FilmLotSort
    return sorts.includes(v) ? v : 'name'
  })
  const [desc, setDesc] = useState(() => getPref('filmPickDesc', '' as string) === '1')

  const stock = useMemo(() => {
    const m: Record<string, number> = {}
    for (const l of lots) m[l.filmId] = stockCount(lots, l.filmId)
    return m
  }, [lots])
  const used = useMemo(() => {
    const m: Record<string, number> = {}
    for (const r of rolls) if (!r.deletedAt) m[r.filmId] = (m[r.filmId] ?? 0) + 1
    return m
  }, [rolls])

  // 추천 순서: 재고 있는 필름 → 많이 쓴 순 → 최근 쓴 순 → 기록이 없으면 많이 쓰는 필름 순
  const stocks = useMemo(() => {
    const recent = rolls.map((r) => r.filmId)
    const at = (list: string[], id: string) => (list.indexOf(id) < 0 ? 1e9 : list.indexOf(id))
    const rank = (id: string) => [(stock[id] ?? 0) > 0 ? 0 : 1, -(used[id] ?? 0), at(recent, id), at(popularFilms, id)]
    return allFilms()
      .filter((f) => anyFormat || filmFits(f.formats, format))
      .filter((f) => !search || filmDisplayName(f).toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => { const ra = rank(a.id), rb = rank(b.id); return ra[0] - rb[0] || ra[1] - rb[1] || ra[2] - rb[2] || ra[3] - rb[3] })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rolls, format, anyFormat, search, customRows, stock, used])

  // 고른 필름은 규격·검색·순서와 상관없이 늘 보이게 (수정할 때 저장된 필름을 다시 찾지 않도록)
  const picked = filmById(filmId)
  const visible = useMemo(() => {
    const has = (list: FilmStock[]) => !!picked && list.some((s) => s.id === picked.id)
    if (showAll) return picked && !has(stocks) ? [picked, ...stocks] : stocks
    const top = stocks.slice(0, 6)
    if (picked && !has(top)) { if (top.length < 6) top.push(picked); else top[5] = picked }
    return top
  }, [stocks, showAll, picked])

  const sections: { title?: string; items: FilmPickItem[] }[] = showAll ? filmPickSections(visible, group, by, desc, stock, used)
    : [{ title: undefined, items: visible.map((film) => ({ film })) }]
  // 칸마다 보여 줄 규격: 규격으로 묶은 칸은 그 규격, 아니면 지금 규격(안 맞으면 그 필름의 첫 규격)
  const fmtOf = (x: FilmPickItem) => x.format ?? (filmFits(x.film.formats, format) ? format : x.film.formats[0])
  const isOn = (x: FilmPickItem) => x.film.id === filmId && formatFamily(fmtOf(x)).title === formatFamily(format).title
  const chip = (on: boolean, label: string, onClick: () => void) => (
    <button key={label} type="button" className={`chip small ${on ? 'active' : ''}`} aria-pressed={on} onClick={onClick}>{label}</button>
  )

  return (
    <div className="section">
      <h2>{showAll ? '필름' : '필름 · 추천'}</h2>
      <div className="group">
        {showAll && (
          <>
            <div className="field">
              <label htmlFor="film-q">필름 검색</label>
              <input id="film-q" className="input" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            {/* 정렬·묶기: 필름 재고 탭과 같은 기준, 가로로 넘겨 본다 */}
            <div className="chips film-pick-bar" role="toolbar" aria-label="묶기·정렬">
              {filmStockGroups.map((g) => chip(group === g, groupTitle[g], () => { setGroup(g); setPref('filmPickGroup', g) }))}
              <span className="chip-gap" aria-hidden="true" />
              {chip(false, desc ? '내림차순 ↓' : '오름차순 ↑', () => { setDesc(!desc); setPref('filmPickDesc', desc ? '' : '1') })}
              {/* 정렬 기준: 묶음 안에서 2순위 (눌러서 고른다) */}
              <label className="chip small">
                정렬 기준 · {filmLotSortTitle[by]} ▾
                <select aria-label="정렬 기준" value={by} onChange={(e) => { const v = e.target.value as FilmLotSort; setBy(v); setPref('filmPickBy', v) }}>
                  {sorts.map((k) => <option key={k} value={k}>{filmLotSortTitle[k]}</option>)}
                </select>
              </label>
            </div>
          </>
        )}
        {sections.map((sec, i, all) => (
          <div key={sec.title ?? i}>
            {sec.title && <h3 className="group-title" style={{ margin: '10px 16px 0' }}>{sec.title} · {sec.items.length}</h3>}
            {/* 추천 6개는 가로로 넘겨 본다 (아래 칸이 바로 보이게) */}
            <div className={`film-grid ${showAll ? '' : 'scroll'}`}>
              {sec.items.map((x) => { const f = x.film; return (
                <button key={`${f.id}|${x.format ?? ''}`} type="button" className={`film-pick ${isOn(x) ? 'on' : ''}`}
                  onClick={() => onPick(f.id, x.format ?? (filmFits(f.formats, format) ? undefined : f.formats[0]))}>
                  <Canister film={f} format={fmtOf(x)} cover />
                  <span>{filmDisplayName(f)}</span>
                  <small className="film-stock">
                    {(stock[f.id] ?? 0) > 0 ? `재고 ${stock[f.id]}롤` : isDiscontinued(f.id) ? '단종' : ''}
                  </small>
                </button>
              ) })}
              {i === all.length - 1 && (
                <button type="button" className="film-pick custom-add" onClick={onAddCustom}>
                  <span className="custom-plus" aria-hidden="true">+</span>
                  <span>직접 추가</span>
                </button>
              )}
            </div>
          </div>
        ))}
        {picked?.id.startsWith('custom-') && (
          <button type="button" className="row accent" style={{ justifyContent: 'center' }} onClick={() => onEditCustom(picked.id)}>
            {filmDisplayName(picked)} 수정
          </button>
        )}
        <button type="button" className="row" style={{ justifyContent: 'center', color: 'var(--safelight)' }}
          onClick={() => { setShowAll(!showAll); setSearch('') }}>
          {showAll ? '접기' : `더보기 (${stocks.length}종)`}
        </button>
      </div>
      {footer}
    </div>
  )
}
