// 웹 pages/Rolls.tsx
import { useMemo, useRef, useState, type RefObject } from 'react'
import { View } from 'react-native'
import { db, deleteRoll, kept } from '../data'
import { getPref, setPref, useLiveQuery } from '../store'
import { useNav } from '../App'
import type { Roll, RollStatus } from '../core/types'
import { dateUnknown, rollFilmName, rollName, rollStart } from '../core/display'
import { Btn, Chip, Chips, Empty, Group, OptionsModal, Row, SearchBox, Section, Segmented } from '../kit'
import { GlassGroup, Page } from '../page'
import { SettingsButton } from './Settings'
import { useArchiveChoice } from './Pending'
import { RollCard, RollRow } from '../RollRow'
import { SwipeRow } from '../SwipeRow'
import { Confirm, Menu, measureAnchor, type MenuAnchor } from '../overlay'
import { useRollInGallery } from '../GallerySave'
import { deleteRollFromGallery } from '../gallery'
import { ProjectStrip, RollProjectsPicker } from './Projects'
import { PressMenu } from '../PressMenu'
import { searchMatch } from '../core/searchAlias'

type Period = 'month' | 'quarter' | 'half' | 'year'
const periodName: Record<Period, string> = { month: '월', quarter: '분기', half: '반기', year: '년' }
const periodGroupName: Record<Period, string> = { month: '월별', quarter: '분기별', half: '반기별', year: '연도별' }
type GroupBy = 'period' | 'project' | 'camera' | 'film'
const groupByName: Record<GroupBy, string> = { period: '기간', project: '프로젝트', camera: '카메라', film: '필름 종류' }
const groupByShort: Record<Exclude<GroupBy, 'period'>, string> = { project: '프로젝트별', camera: '카메라별', film: '필름별' }
/** 정렬 기준 (오름·내림차순은 따로, 웹·아이폰과 같음) */
type Sort = 'name' | 'time' | 'tag' | 'film'
const sortName: Record<Sort, string> = { name: '이름', time: '시간', tag: '태그', film: '종류' }
type Mode = 'gallery' | 'list'
const modeName: Record<Mode, string> = { gallery: '갤러리 보기', list: '목록 보기' }
const modeIcon: Record<Mode, string> = { gallery: 'grid', list: 'list' }
type StatusTab = 'all' | 'loaded' | 'waiting' | 'done'
const statusTabName: Record<StatusTab, string> = { all: '전체', loaded: '촬영 중', waiting: '현상 스캔', done: '완료' }
/** 현상 스캔(탭과 같은 이름): 다 찍은 롤과 현상 맡긴 롤 (웹·아이폰과 같음) */
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

const pick = <T extends string>(key: string, fallback: T, ok: Record<string, unknown>): T => { const v = getPref(key, fallback as string); return (v in ok ? v : fallback) as T }

export function Rolls() {
  const nav = useNav()
  const rolls = useLiveQuery(() => db.rolls.toArray(), [])
  const cameras = useLiveQuery(() => db.cameras.toArray(), []) ?? []
  const projects = useLiveQuery(() => db.projects.toArray(), []) ?? []
  const [mode, setModeS] = useState<Mode>(pick<Mode>('rollViewMode', (getPref('rollsLayout', 'list') as string) === 'grid' ? 'gallery' : 'list', modeName))
  const [tab, setTabS] = useState<StatusTab>(pick<StatusTab>('rollStatusTab', 'all', statusTabName))
  const [sort, setSortS] = useState<Sort>(pick<Sort>('rollSortField', 'time', sortName))
  const [ascending, setAscS] = useState((getPref('rollSortAscending', '0') as string) === '1')
  const setAscending = (v: boolean) => { setAscS(v); setPref('rollSortAscending', v ? '1' : '0') }
  const [groupBy, setGroupByS] = useState<GroupBy>(pick<GroupBy>('rollGroupBy', 'period', groupByName))
  const [period, setPeriodS] = useState<Period>(pick<Period>('rollGrouping', 'month', periodName))
  const setMode = (v: Mode) => { setModeS(v); setPref('rollViewMode', v) }
  const setTab = (v: StatusTab) => { setTabS(v); setPref('rollStatusTab', v) }
  const setSort = (v: Sort) => { setSortS(v); setPref('rollSortField', v) }
  const setGroupBy = (v: GroupBy) => { setGroupByS(v); setPref('rollGroupBy', v) }
  const setPeriod = (v: Period) => { setPeriodS(v); setPref('rollGrouping', v) }
  const [menu, setMenu] = useState<{ kind: 'mode' | 'sort' | 'group'; at?: MenuAnchor }>()
  const sortRef = useRef<View>(null)
  const groupRef = useRef<View>(null)
  const openAt = async (kind: 'sort' | 'group', ref: RefObject<View | null>) => setMenu({ kind, at: await measureAnchor(ref) })
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [deleting, setDeleting] = useState<string>()
  const inGallery = useRollInGallery(deleting)
  const [search, setSearch] = useState('')
  const [gridW, setGridW] = useState(0)

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [rolls, favoritesOnly, tab, search, cameras])

  /** 정렬 기준 + 오름·내림차순. 기준 값이 같으면 시간 순 (웹·아이폰과 같음) */
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, groupBy, period, sort, ascending, projects, cameras])

  const archiveChoice = useArchiveChoice()
  const [filing, setFiling] = useState<Roll>()
  const pressItems = (r: Roll) => [
    { label: r.favorite ? '즐겨찾기 해제' : '즐겨찾기', icon: 'star', onPress: () => void db.rolls.update(r.id, { favorite: !r.favorite }) },
    { label: '프로젝트에 담기', icon: 'folderPlus', onPress: () => setFiling(r) },
    { label: '삭제', icon: 'trash', danger: true, onPress: () => setDeleting(r.id) },
  ]
  return (
    <Page title="롤 보관함"
      left={<SettingsButton />}
      actions={<GlassGroup items={[
        { icon: modeIcon[mode], label: '보기 방식', onPress: () => setMenu({ kind: 'mode' }) },
        { icon: 'plus', label: '기존 롤 가져오기', onPress: archiveChoice.open },
      ]} />}>
      {archiveChoice.sheets}
      {menu?.kind === 'mode' ? <Menu onClose={() => setMenu(undefined)} items={(Object.keys(modeName) as Mode[]).map((m) => ({
        label: modeName[m], icon: modeIcon[m], checked: m === mode, onPress: () => setMode(m),
      }))} /> : null}
      {/* 정렬: 기준 하나 + 선 아래 오름·내림차순 (아이폰 메뉴와 같은 모양) */}
      {menu?.kind === 'sort' ? <Menu anchor={menu.at} onClose={() => setMenu(undefined)} items={[
        ...(Object.keys(sortName) as Sort[]).map((k) => ({ label: sortName[k], checked: k === sort, onPress: () => setSort(k) })),
        { label: '오름차순', checked: ascending, section: true, onPress: () => setAscending(true) },
        { label: '내림차순', checked: !ascending, onPress: () => setAscending(false) },
      ]} /> : null}
      {/* 그룹화: 네 가지 중 하나 + 기간이면 선 아래 단위 */}
      {menu?.kind === 'group' ? <Menu anchor={menu.at} onClose={() => setMenu(undefined)} items={[
        ...(Object.keys(groupByName) as GroupBy[]).map((g) => ({ label: groupByName[g], checked: g === groupBy, onPress: () => setGroupBy(g) })),
        ...(groupBy === 'period' ? (Object.keys(periodName) as Period[]).map((p, i) => ({ label: periodName[p], checked: p === period, section: i === 0, onPress: () => setPeriod(p) })) : []),
      ]} /> : null}

      <ProjectStrip rolls={rolls ?? []} />

      <View style={{ gap: 10 }}>
        <SearchBox placeholder="필름, 카메라, 장소, 메모, #태그" value={search} onChange={setSearch} />
        {rolls && rolls.length > 0 ? <Segmented value={tab} options={(Object.keys(statusTabName) as StatusTab[]).map((t) => [t, statusTabName[t]])} onChange={setTab} /> : null}
        {rolls && rolls.length > 0 ? <Chips>
          <View ref={sortRef} collapsable={false}><Chip label={`${sortName[sort]} ${ascending ? '↑' : '↓'}`} icon="sort" chevron onPress={() => void openAt('sort', sortRef)} /></View>
          <View ref={groupRef} collapsable={false}><Chip label={groupBy === 'period' ? periodGroupName[period] : groupByShort[groupBy]} icon="layers" chevron onPress={() => void openAt('group', groupRef)} /></View>
          <Chip label="즐겨찾기" icon="star" active={favoritesOnly} onPress={() => setFavoritesOnly(!favoritesOnly)} />
        </Chips> : null}
      </View>

      {rolls?.length === 0 ? <Empty icon="stack" title="아직 롤이 없어요" /> : null}
      {rolls && rolls.length > 0 && filtered.length === 0 ? (
        <Empty icon="" title="조건에 맞는 롤이 없어요"><Btn label="처음으로" onPress={() => { setFavoritesOnly(false); setTab('all'); setSearch('') }} /></Empty>
      ) : null}

      {groups.map((g) => (
        <Section key={g.key} title={`${g.title} · ${g.rolls.length}롤`}>
          {mode === 'gallery' ? (
            <View onLayout={(e) => setGridW(e.nativeEvent.layout.width)} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {g.rolls.map((r) => (
                <View key={r.id} style={{ width: gridW ? (gridW - 10) / 2 : '47%' }}>
                  <PressMenu items={pressItems(r)}>{(hold) => <RollCard roll={r} onPress={() => nav.push({ type: 'roll', id: r.id })} onLongPress={hold} />}</PressMenu>
                </View>
              ))}
            </View>
          ) : (
            // 구분선 없이 촘촘하게 (웹과 같음)
            <Group plain style={{ paddingVertical: 9 }}>
              {g.rolls.map((r) => (
                // 왼쪽→오른쪽 밀면 즐겨찾기, 오른쪽→왼쪽 밀면 삭제 (웹·아이폰과 같음)
                <SwipeRow key={r.id} favorite={!!r.favorite} onFavorite={() => void db.rolls.update(r.id, { favorite: !r.favorite })} onDelete={() => setDeleting(r.id)}>
                  <PressMenu items={pressItems(r)}>{(hold) => <Row chev onPress={() => nav.push({ type: 'roll', id: r.id })} onLongPress={hold} style={{ minHeight: 0, paddingVertical: 5, paddingLeft: 14 }}><RollRow roll={r} /></Row>}</PressMenu>
                </SwipeRow>
              ))}
            </Group>
          )}
        </Section>
      ))}
      {filing ? <RollProjectsPicker roll={filing} onClose={() => setFiling(undefined)} /> : null}
      {deleting ? (
        <Confirm message="이 롤 기록을 삭제할까요? 24시간 안에는 설정에서 되돌릴 수 있어요. '기록만 삭제'는 갤러리 사진을 남겨요." onCancel={() => setDeleting(undefined)}
          action={inGallery ? '기록만 삭제' : '삭제'}
          extra={inGallery ? { label: '갤러리 사진까지 삭제', onPress: async () => { const id = deleting; setDeleting(undefined); if (await deleteRollFromGallery(id)) await deleteRoll(id) } } : undefined}
          onConfirm={async () => { const id = deleting; setDeleting(undefined); await deleteRoll(id) }} />
      ) : null}
    </Page>
  )
}
