// 웹 pages/Rolls.tsx
import { useMemo, useState } from 'react'
import { View } from 'react-native'
import { db, kept } from '../data'
import { getPref, setPref, useLiveQuery } from '../store'
import { useNav } from '../App'
import type { Roll, RollStatus } from '../core/types'
import { statusName } from '../core/types'
import { dateUnknown, rollFilmName, rollStart } from '../core/display'
import { tagSections } from '../gearExtras'
import { Btn, Chip, Chips, Empty, Group, OptionsModal, Row, SearchBox, Section, Segmented } from '../kit'
import { GlassBtn, Page } from '../page'
import { RollCard, RollRow } from '../RollRow'
import { ProjectStrip } from './Projects'

type Grouping = 'month' | 'quarter' | 'half' | 'year' | 'tag'
const groupingName: Record<Grouping, string> = { month: '월', quarter: '분기', half: '반기', year: '년', tag: '태그' }

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
  const [tag, setTag] = useState('')
  const [gridW, setGridW] = useState(0)

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
    if (tag && !r.tags?.includes(tag)) return false
    if (search) {
      const text = [rollFilmName(r), cameraName(r), r.lab, r.note, ...r.locations.map((l) => `${l.name} ${l.memo ?? ''}`), ...(r.tags ?? [])].join(' ').toLowerCase()
      if (!text.includes(search.toLowerCase())) return false
    }
    return true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [rolls, favoritesOnly, filmId, cameraId, status, tag, search, cameras])

  const groups = useMemo(() => {
    if (grouping === 'tag') {
      // 태그마다 한 묶음 (태그가 여럿이면 여러 묶음), 태그 없는 롤은 맨 아래
      return tagSections(filtered, true).map((sec) => ({ key: sec.title ?? '', title: sec.title ?? '', rolls: [...sec.items].sort((a, b) => rollStart(b) - rollStart(a)) }))
    }
    const m = new Map<number, Roll[]>()
    for (const r of filtered) {
      const k = dateUnknown(r) ? 0 : periodKey(grouping, rollStart(r))
      m.set(k, [...(m.get(k) ?? []), r])
    }
    return [...m.entries()].sort((a, b) => b[0] - a[0])
      .map(([k, list]) => ({ key: String(k), title: periodTitle(grouping, k), rolls: list.sort((a, b) => rollStart(b) - rollStart(a)) }))
  }, [filtered, grouping])

  const filmOptions = useMemo(() => {
    const m = new Map<string, string>()
    for (const r of rolls ?? []) m.set(r.filmId, rollFilmName(r))
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [rolls])
  const cameraOptions = cameras.filter((c) => (rolls ?? []).some((r) => r.cameraId === c.id))
  const tagOptions = useMemo(() => [...new Set((rolls ?? []).filter(kept).flatMap((r) => r.tags ?? []))].sort((a, b) => a.localeCompare(b)), [rolls])
  const filtering = favoritesOnly || filmId || cameraId || status || tag

  const reset = () => { setFavoritesOnly(false); setFilmId(''); setCameraId(''); setStatus(''); setTag('') }

  return (
    <Page title="롤 보관함"
      actions={<GlassBtn icon={layout === 'grid' ? 'list' : 'grid'} label={layout === 'grid' ? '목록으로 보기' : '그리드로 보기'}
        onPress={() => { const n = layout === 'grid' ? 'list' : 'grid'; setLayout(n); setPref('rollsLayout', n) }} />}>

      <ProjectStrip rolls={rolls ?? []} />

      <View style={{ gap: 10 }}>
        <SearchBox placeholder="필름, 카메라, 장소, 메모, 태그" value={search} onChange={setSearch} />
        <Segmented value={grouping} options={(Object.keys(groupingName) as Grouping[]).map((g) => [g, groupingName[g]])}
          onChange={(g) => { setGrouping(g); setPref('rollGrouping', g) }} />
        <Chips>
          <Chip label="즐겨찾기" icon="star" active={favoritesOnly} onPress={() => setFavoritesOnly(!favoritesOnly)} />
          <ChipSelect label="필름" value={filmId} onChange={setFilmId} options={filmOptions} />
          <ChipSelect label="카메라" value={cameraId} onChange={setCameraId} options={cameraOptions.map((c) => [c.id, `${c.brand} ${c.model}`])} />
          {tagOptions.length > 0 ? <ChipSelect label="태그" value={tag} onChange={setTag} options={tagOptions.map((t) => [t, `#${t}`])} /> : null}
          <ChipSelect label="진행 상태" value={status} onChange={(v) => setStatus(v as RollStatus | '')}
            options={(Object.keys(statusName) as RollStatus[]).map((s) => [s, statusName[s]])} />
          {filtering ? <Chip label="초기화 ✕" onPress={reset} /> : null}
        </Chips>
      </View>

      {rolls?.length === 0 ? <Empty icon="stack" title="아직 롤이 없어요" /> : null}
      {rolls && rolls.length > 0 && filtered.length === 0 ? (
        <Empty icon="" title="조건에 맞는 롤이 없어요"><Btn label="필터 초기화" onPress={reset} /></Empty>
      ) : null}

      {groups.map((g) => (
        <Section key={g.key} title={`${g.title} · ${g.rolls.length}롤`}>
          {layout === 'grid' ? (
            <View onLayout={(e) => setGridW(e.nativeEvent.layout.width)} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {g.rolls.map((r) => (
                <View key={r.id} style={{ width: gridW ? (gridW - 10) / 2 : '47%' }}>
                  <RollCard roll={r} onPress={() => nav.push({ type: 'roll', id: r.id })} />
                </View>
              ))}
            </View>
          ) : (
            <Group>
              {g.rolls.map((r) => (
                <Row key={r.id} chev onPress={() => nav.push({ type: 'roll', id: r.id })}><RollRow roll={r} /></Row>
              ))}
            </Group>
          )}
        </Section>
      ))}
    </Page>
  )
}

/** 칩 모양 드롭다운 */
function ChipSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: [string, string][]
}) {
  const [open, setOpen] = useState(false)
  const current = options.find(([v]) => v === value)?.[1]
  return (
    <>
      <Chip label={current ?? label} chevron active={!!value} onPress={() => setOpen(true)} />
      {open ? <OptionsModal title={label} value={value} options={[['', '전체'], ...options]} onPick={(v) => { setOpen(false); onChange(v) }} onClose={() => setOpen(false)} /> : null}
    </>
  )
}
