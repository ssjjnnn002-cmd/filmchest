import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, deleteRoll, kept } from '../db'
import { useNav } from '../App'
import type { Roll, RollStatus } from '../core/types'
import { Confirm, GlassGroup, Icon, PageHeader, PickMenu, dateUnknown, rollFilmName, rollName, rollStart } from '../ui/common'
import { SwipeRow } from '../ui/SwipeRow'
import { SettingsButton } from './Settings'
import { ArchiveImportButton } from './Pending'
import { RollCard, RollRow } from '../ui/RollRow'
import { getPref, setPref } from '../platform'
import { ProjectStrip, RollProjectsPicker } from './Projects'
import { PressMenu } from '../ui/PressMenu'
import { searchMatch } from '../core/searchAlias'

type Period = 'month' | 'quarter' | 'half' | 'year'
const periodName: Record<Period, string> = { month: '월', quarter: '분기', half: '반기', year: '년' }
const periodGroupName: Record<Period, string> = { month: '월별', quarter: '분기별', half: '반기별', year: '연도별' }
type GroupBy = 'period' | 'project' | 'camera' | 'film'
const groupByName: Record<GroupBy, string> = { period: '기간', project: '프로젝트', camera: '카메라', film: '필름 종류' }
const groupByShort: Record<Exclude<GroupBy, 'period'>, string> = { project: '프로젝트별', camera: '카메라별', film: '필름별' }
/** 정렬 기준 (오름·내림차순은 따로, 아이폰과 같음) */
type Sort = 'name' | 'time' | 'tag' | 'film'
const sortName: Record<Sort, string> = { name: '이름', time: '시간', tag: '태그', film: '종류' }
type Mode = 'gallery' | 'list'
const modeName: Record<Mode, string> = { gallery: '갤러리 보기', list: '목록 보기' }
const modeIcon: Record<Mode, string> = { gallery: 'grid', list: 'list' }
type StatusTab = 'all' | 'loaded' | 'waiting' | 'done'
const statusTabName: Record<StatusTab, string> = { all: '전체', loaded: '촬영 중', waiting: '현상 스캔', done: '완료' }
/** 현상 스캔(탭과 같은 이름): 다 찍은 롤과 현상 맡긴 롤 (아이폰과 같음) */
const inTab = (t: StatusTab, s: RollStatus) => t === 'all' || (t === 'loaded' && s === 'loaded') || (t === 'waiting' && (s === 'finished' || s === 'atLab')) || (t === 'done' && s === 'imported')

function periodKey(g: Period, ms: number) {
  const d = new Date(ms)
  const y = d.getFullYear(), m = d.getMonth() + 1
  if (g === 'month') return y * 100 + m
  if (g === 'quarter') return y * 100 + Math.floor((m - 1) / 3) + 1
  if (g === 'half') return y * 100 + (m <= 6 ? 1 : 2)
  return y * 100
}

function periodTitle(g: Period, key: number) {
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
  const projects = useLiveQuery(() => db.projects.toArray(), []) ?? []
  const pref = <T extends string>(key: string, fallback: T, ok: Record<string, unknown>) => { const v = getPref(key, fallback as string); return (v in ok ? v : fallback) as T }
  const [mode, setModeS] = useState<Mode>(pref<Mode>('rollViewMode', (getPref('rollsLayout', 'list') as string) === 'grid' ? 'gallery' : 'list', modeName))
  const [tab, setTabS] = useState<StatusTab>(pref('rollStatusTab', 'all', statusTabName))
  const [sort, setSortS] = useState<Sort>(pref('rollSortField', 'time', sortName))
  const [ascending, setAscS] = useState((getPref('rollSortAscending', '0') as string) === '1')
  const setAscending = (v: boolean) => { setAscS(v); setPref('rollSortAscending', v ? '1' : '0') }
  const [groupBy, setGroupByS] = useState<GroupBy>(pref('rollGroupBy', 'period', groupByName))
  const [period, setPeriodS] = useState<Period>(pref('rollGrouping', 'month', periodName))
  const setMode = (v: Mode) => { setModeS(v); setPref('rollViewMode', v) }
  const setTab = (v: StatusTab) => { setTabS(v); setPref('rollStatusTab', v) }
  const setSort = (v: Sort) => { setSortS(v); setPref('rollSortField', v) }
  const setGroupBy = (v: GroupBy) => { setGroupByS(v); setPref('rollGroupBy', v) }
  const setPeriod = (v: Period) => { setPeriodS(v); setPref('rollGrouping', v) }
  const [modeMenu, setModeMenu] = useState(false)
  const [deleting, setDeleting] = useState<string>()
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [search, setSearch] = useState('')

  const cameraName = (r: Roll) => {
    const c = cameras.find((x) => x.id === r.cameraId)
    return c ? `${c.brand} ${c.model}` : [r.cameraBrand, r.cameraModel].filter(Boolean).join(' ')
  }

  const filtered = useMemo(() => (rolls ?? []).filter((r) => {
    if (!kept(r)) return false
    if (favoritesOnly && !r.favorite) return false
    if (!inTab(tab, r.status)) return false
    if (search) {
      // 태그도 검색된다 (#를 붙여도 된다)
      const q = search.replace(/^#/, '')
      const text = [rollName(r), rollFilmName(r), cameraName(r), r.lab, r.note, ...r.locations.map((l) => `${l.name} ${l.memo ?? ''}`), ...(r.tags ?? [])].join(' ').toLowerCase()
      if (!searchMatch(q, [text])) return false
    }
    return true
  }), [rolls, favoritesOnly, tab, search, cameras])

  /** 정렬 기준 + 오름·내림차순. 기준 값이 같으면 시간 순 (아이폰과 같음) */
  const sorted = (list: Roll[]) => {
    const text = (r: Roll) => sort === 'name' ? rollName(r) : sort === 'tag' ? ([...(r.tags ?? [])].sort()[0] ?? '') : sort === 'film' ? rollFilmName(r) : ''
    return [...list].sort((a, b) => {
      if (sort !== 'time') {
        const x = text(a), y = text(b)
        // 태그가 없는 롤은 늘 맨 아래
        if (!x !== !y) return x ? -1 : 1
        const c = x.localeCompare(y, 'ko')
        if (c) return ascending ? c : -c
      }
      return ascending ? rollStart(a) - rollStart(b) : rollStart(b) - rollStart(a)
    })
  }

  const groups = useMemo(() => {
    const list = filtered
    if (groupBy === 'project') {
      const live = projects.filter((p) => !p.archived).sort((a, b) => a.name.localeCompare(b.name, 'ko'))
      const out = live.map((p) => ({ key: `p:${p.id}`, title: p.name || '이름 없는 프로젝트', rolls: sorted(list.filter((r) => p.rollIds.includes(r.id))) })).filter((g) => g.rolls.length)
      const filed = new Set(live.flatMap((p) => p.rollIds))
      const none = list.filter((r) => !filed.has(r.id))
      if (none.length) out.push({ key: 'p:none', title: '프로젝트 없음', rolls: sorted(none) })
      return out
    }
    if (groupBy === 'camera' || groupBy === 'film') {
      const m = new Map<string, Roll[]>()
      for (const r of list) { const k = groupBy === 'camera' ? cameraName(r) : rollFilmName(r); m.set(k, [...(m.get(k) ?? []), r]) }
      return [...m.entries()].sort((a, b) => (!a[0] !== !b[0] ? (a[0] ? -1 : 1) : a[0].localeCompare(b[0], 'ko')))
        .map(([k, rs]) => ({ key: `${groupBy}:${k}`, title: k || (groupBy === 'camera' ? '카메라 알 수 없음' : '필름 알 수 없음'), rolls: sorted(rs) }))
    }
    const m = new Map<number, Roll[]>()
    for (const r of list) {
      const k = dateUnknown(r) ? 0 : periodKey(period, rollStart(r))
      m.set(k, [...(m.get(k) ?? []), r])
    }
    // 날짜 알 수 없음(0)은 맨 아래
    return [...m.entries()].sort((a, b) => (a[0] === 0) !== (b[0] === 0) ? (a[0] === 0 ? 1 : -1) : sort === 'time' && ascending ? a[0] - b[0] : b[0] - a[0])
      .map(([k, rs]) => ({ key: String(k), title: periodTitle(period, k), rolls: sorted(rs) }))
  }, [filtered, groupBy, period, sort, ascending, projects, cameras])

  const [filing, setFiling] = useState<Roll>()
  const pressItems = (r: Roll) => [
    { label: r.favorite ? '즐겨찾기 해제' : '즐겨찾기', icon: 'star', onPress: () => void db.rolls.update(r.id, { favorite: !r.favorite }) },
    { label: '프로젝트에 담기', icon: 'folderPlus', onPress: () => setFiling(r) },
    { label: '삭제', icon: 'trash', danger: true, onPress: () => setDeleting(r.id) },
  ]
  return (
    <>
      <PageHeader title="롤 보관함"
        left={<SettingsButton />}
        actions={
          <GlassGroup>
            <div style={{ position: 'relative' }}>
              <button aria-label="보기 방식" aria-expanded={modeMenu} onClick={() => setModeMenu(!modeMenu)}><Icon name={modeIcon[mode]} /></button>
              {modeMenu && (
                // 아이폰 메뉴와 같은 모양: 왼쪽 체크 · 아이콘 · 이름
                <div className="menu pick-menu" role="menu">
                  {(Object.keys(modeName) as Mode[]).map((m) => (
                    <button key={m} role="menuitemradio" aria-checked={m === mode} className="row" onClick={() => { setModeMenu(false); setMode(m) }}>
                      <span className="pick-check">{m === mode ? <Icon name="check" size={18} /> : null}</span>
                      <span style={{ color: 'var(--safelight)', display: 'grid' }}><Icon name={modeIcon[m]} /></span>
                      <span className="grow">{modeName[m]}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <ArchiveImportButton bare />
          </GlassGroup>
        } />

      <ProjectStrip rolls={rolls ?? []} />

      <div className="rolls-tools">
        <label className="search">
          <Icon name="search" size={18} />
          <input type="search" placeholder="필름, 카메라, 장소, 메모, #태그" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="검색" />
        </label>
        {rolls && rolls.length > 0 && <div className="segmented slide" role="tablist" aria-label="상태"
          style={{ '--i': (Object.keys(statusTabName) as StatusTab[]).indexOf(tab), '--n': 4 } as React.CSSProperties}>
          {(Object.keys(statusTabName) as StatusTab[]).map((t) => (
            <button key={t} className={t === tab ? 'on' : ''} onClick={() => setTab(t)}>{statusTabName[t]}</button>
          ))}
        </div>}
        {rolls && rolls.length > 0 && <div className="chips">
          {/* 정렬: 기준 하나 + 선 아래 오름·내림차순 (아이폰 메뉴와 같은 모양) */}
          <PickMenu label="정렬" className="chip" trigger={<><Icon name="sort" size={15} /> {sortName[sort]} {ascending ? '↑' : '↓'} <Chevron /></>} sections={[
            { value: sort, options: (Object.keys(sortName) as Sort[]).map((k) => [k, sortName[k]]), onPick: (v) => setSort(v as Sort) },
            { value: ascending ? 'asc' : 'desc', options: [['asc', '오름차순'], ['desc', '내림차순']], onPick: (v) => setAscending(v === 'asc') },
          ]} />
          {/* 그룹화: 네 가지 중 하나 + 기간이면 선 아래 단위 */}
          <PickMenu label="그룹화" className="chip" trigger={<><Icon name="layers" size={15} /> {groupBy === 'period' ? periodGroupName[period] : groupByShort[groupBy]} <Chevron /></>} sections={[
            { value: groupBy, options: (Object.keys(groupByName) as GroupBy[]).map((g) => [g, groupByName[g]]), onPick: (v) => setGroupBy(v as GroupBy) },
            ...(groupBy === 'period' ? [{ value: period, options: (Object.keys(periodName) as Period[]).map((p): [string, string] => [p, periodName[p]]), onPick: (v: string) => setPeriod(v as Period) }] : []),
          ]} />
          <button className={`chip ${favoritesOnly ? 'active' : ''}`} onClick={() => setFavoritesOnly(!favoritesOnly)}><Icon name="star" size={16} /> 즐겨찾기</button>
        </div>}
      </div>

      {rolls?.length === 0 && <div className="empty"><Icon name="stack" size={40} /><b>아직 롤이 없어요</b></div>}
      {rolls && rolls.length > 0 && filtered.length === 0 && (
        <div className="empty"><b>조건에 맞는 롤이 없어요</b><button className="btn" onClick={() => { setFavoritesOnly(false); setTab('all'); setSearch('') }}>처음으로</button></div>
      )}

      {groups.map((g) => (
        <div className="section" key={g.key}>
          <h2>{g.title} · {g.rolls.length}롤</h2>
          {mode === 'gallery' ? (
            <div className="grid rolls-grid">
              {g.rolls.map((r) => <PressMenu key={r.id} items={pressItems(r)}><RollCard roll={r} onClick={() => nav.push({ type: 'roll', id: r.id })} /></PressMenu>)}
            </div>
          ) : (
            <div className="group rolls-list">
              {g.rolls.map((r) => (
                // 왼쪽→오른쪽 밀면 즐겨찾기, 오른쪽→왼쪽 밀면 삭제 (아이폰과 같음)
                <SwipeRow key={r.id} favorite={!!r.favorite} onFavorite={() => void db.rolls.update(r.id, { favorite: !r.favorite })} onDelete={() => setDeleting(r.id)}>
                  <PressMenu items={pressItems(r)}><button className="row" onClick={() => nav.push({ type: 'roll', id: r.id })}><RollRow roll={r} /><Icon name="chev" size={18} /></button></PressMenu>
                </SwipeRow>
              ))}
            </div>
          )}
        </div>
      ))}
      {filing && <RollProjectsPicker roll={filing} onClose={() => setFiling(undefined)} />}
      {deleting && (
        <Confirm message="이 롤 기록을 삭제할까요? 24시간 안에는 설정에서 되돌릴 수 있어요. 사진 앱에 저장한 사진은 그대로 남아요." onCancel={() => setDeleting(undefined)}
          onConfirm={async () => { await deleteRoll(deleting); setDeleting(undefined) }} />
      )}
    </>
  )
}

const Chevron = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
