import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, kept } from '../db'
import { useNav } from '../App'
import type { Roll, RollStatus } from '../core/types'
import { statusName } from '../core/types'
import { Icon, PageHeader, dateUnknown, rollFilmName, rollStart } from '../ui/common'
import { RollCard, RollRow } from '../ui/RollRow'
import { getPref, setPref } from '../platform'
import { ProjectStrip } from './Projects'

type Grouping = 'month' | 'quarter' | 'half' | 'year'
const groupingName: Record<Grouping, string> = { month: '월', quarter: '분기', half: '반기', year: '년' }

function periodKey(g: Grouping, ms: number) {
  const d = new Date(ms)
  const y = d.getFullYear(), m = d.getMonth() + 1
  if (g === 'month') return y * 100 + m
  if (g === 'quarter') return y * 100 + Math.floor((m - 1) / 3) + 1
  if (g === 'half') return y * 100 + (m <= 6 ? 1 : 2)
  return y * 100
}

function periodTitle(g: Grouping, key: number) {
  if (key === 0) return '날짜 알 수 없음'
  const y = Math.floor(key / 100), n = key % 100
  if (g === 'month') return `${y}년 ${n}월`
  if (g === 'quarter') return `${y}년 ${n}분기`
  if (g === 'half') return `${y}년 ${n === 1 ? '상반기' : '하반기'}`
  return `${y}년`
}

export function Rolls() {
  const nav = useNav()
  const rolls = useLiveQuery(() => db.rolls.toArray(), [])
  const cameras = useLiveQuery(() => db.cameras.toArray(), []) ?? []
  const [grouping, setGrouping] = useState<Grouping>(getPref('rollGrouping', 'month'))
  const [layout, setLayout] = useState<string>(getPref('rollsLayout', 'list'))
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [filmId, setFilmId] = useState('')
  const [cameraId, setCameraId] = useState('')
  const [status, setStatus] = useState<RollStatus | ''>('')
  const [search, setSearch] = useState('')

  const cameraName = (r: Roll) => {
    const c = cameras.find((x) => x.id === r.cameraId)
    return c ? `${c.brand} ${c.model}` : [r.cameraBrand, r.cameraModel].filter(Boolean).join(' ')
  }

  const filtered = useMemo(() => (rolls ?? []).filter((r) => {
    if (!kept(r)) return false
    if (favoritesOnly && !r.favorite) return false
    if (filmId && r.filmId !== filmId) return false
    if (cameraId && r.cameraId !== cameraId) return false
    if (status && r.status !== status) return false
    if (search) {
      const text = [rollFilmName(r), cameraName(r), r.lab, r.note, ...r.locations.map((l) => `${l.name} ${l.memo ?? ''}`)].join(' ').toLowerCase()
      if (!text.includes(search.toLowerCase())) return false
    }
    return true
  }), [rolls, favoritesOnly, filmId, cameraId, status, search, cameras])

  const groups = useMemo(() => {
    const m = new Map<number, Roll[]>()
    for (const r of filtered) {
      const k = dateUnknown(r) ? 0 : periodKey(grouping, rollStart(r))
      m.set(k, [...(m.get(k) ?? []), r])
    }
    return [...m.entries()].sort((a, b) => b[0] - a[0])
      .map(([k, list]) => ({ key: k, title: periodTitle(grouping, k), rolls: list.sort((a, b) => rollStart(b) - rollStart(a)) }))
  }, [filtered, grouping])

  const filmOptions = useMemo(() => {
    const m = new Map<string, string>()
    for (const r of rolls ?? []) m.set(r.filmId, rollFilmName(r))
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [rolls])
  const cameraOptions = cameras.filter((c) => (rolls ?? []).some((r) => r.cameraId === c.id))
  const filtering = favoritesOnly || filmId || cameraId || status

  const reset = () => { setFavoritesOnly(false); setFilmId(''); setCameraId(''); setStatus('') }

  return (
    <>
      <PageHeader title="롤 보관함"
        actions={
          <button className="glass-btn round" aria-label={layout === 'grid' ? '목록으로 보기' : '그리드로 보기'}
            onClick={() => { const n = layout === 'grid' ? 'list' : 'grid'; setLayout(n); setPref('rollsLayout', n) }}>
            <Icon name={layout === 'grid' ? 'list' : 'grid'} />
          </button>
        } />

      <ProjectStrip rolls={rolls ?? []} />

      <div className="rolls-tools">
        <label className="search">
          <Icon name="search" size={18} />
          <input type="search" placeholder="필름, 카메라, 장소, 메모" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="검색" />
        </label>
        <div className="segmented slide" role="tablist" aria-label="보기 단위"
          style={{ '--i': (Object.keys(groupingName) as Grouping[]).indexOf(grouping), '--n': 4 } as React.CSSProperties}>
          {(Object.keys(groupingName) as Grouping[]).map((g) => (
            <button key={g} className={g === grouping ? 'on' : ''} onClick={() => { setGrouping(g); setPref('rollGrouping', g) }}>{groupingName[g]}</button>
          ))}
        </div>
        <div className="chips">
          <button className={`chip ${favoritesOnly ? 'active' : ''}`} onClick={() => setFavoritesOnly(!favoritesOnly)}><Icon name="star" size={16} /> 즐겨찾기</button>
          <ChipSelect label="필름" value={filmId} onChange={setFilmId} options={filmOptions} />
          <ChipSelect label="카메라" value={cameraId} onChange={setCameraId} options={cameraOptions.map((c) => [c.id, `${c.brand} ${c.model}`])} />
          <ChipSelect label="진행 상태" value={status} onChange={(v) => setStatus(v as RollStatus | '')}
            options={(Object.keys(statusName) as RollStatus[]).map((s) => [s, statusName[s]])} />
          {filtering && <button className="chip" onClick={reset}>초기화 ✕</button>}
        </div>
      </div>

      {rolls?.length === 0 && <div className="empty"><Icon name="stack" size={40} /><b>아직 롤이 없어요</b></div>}
      {rolls && rolls.length > 0 && filtered.length === 0 && (
        <div className="empty"><b>조건에 맞는 롤이 없어요</b><button className="btn" onClick={reset}>필터 초기화</button></div>
      )}

      {groups.map((g) => (
        <div className="section" key={g.key}>
          <h2>{g.title} · {g.rolls.length}롤</h2>
          {layout === 'grid' ? (
            <div className="grid rolls-grid">
              {g.rolls.map((r) => <RollCard key={r.id} roll={r} onClick={() => nav.push({ type: 'roll', id: r.id })} />)}
            </div>
          ) : (
            <div className="group">
              {g.rolls.map((r) => (
                <button key={r.id} className="row" onClick={() => nav.push({ type: 'roll', id: r.id })}><RollRow roll={r} /><Icon name="chev" size={18} /></button>
              ))}
            </div>
          )}
        </div>
      ))}
    </>
  )
}

/** 칩 모양 드롭다운 */
function ChipSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: [string, string][]
}) {
  const current = options.find(([v]) => v === value)?.[1]
  return (
    <label className={`chip ${value ? 'active' : ''}`} style={{ position: 'relative' }}>
      {current ?? label} <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}
        style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}>
        <option value="">전체</option>
        {options.map(([v, n]) => <option key={v} value={v}>{n}</option>)}
      </select>
    </label>
  )
}
