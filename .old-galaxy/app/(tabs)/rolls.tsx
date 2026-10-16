import { useMemo, useState } from 'react'
import { Pressable, ScrollView, Text, TextInput, useWindowDimensions, View } from 'react-native'
import { router } from 'expo-router'
import { cameraName, getCamera, getPref, listCameras, listRolls, setPref, useDb, type Roll } from '../../src/db'
import { filmById, filmDisplayName } from '../../src/films'
import { Icon } from '../../src/icons'
import { statusName, type RollStatus } from '../../src/types'
import { Canister, Empty, GlassButton, Screen, fmtDay } from '../../src/ui'
import { useTheme } from '../../src/theme'
import { ProjectStrip } from '../../src/projects'

type Grouping = 'month' | 'quarter' | 'half' | 'year'
const groupingName: Record<Grouping, string> = { month: '월', quarter: '분기', half: '반기', year: '년' }
const groupings = Object.keys(groupingName) as Grouping[]

const statusColor: Record<RollStatus, { color: string; bg: string }> = {
  loaded: { color: '#DE542E', bg: 'rgba(222,84,46,0.15)' },
  finished: { color: '#F08A00', bg: 'rgba(240,138,0,0.15)' },
  atLab: { color: '#0A7AFF', bg: 'rgba(10,122,255,0.15)' },
  imported: { color: '#34A853', bg: 'rgba(52,168,83,0.15)' },
}

function periodKey(g: Grouping, ms: number) {
  const d = new Date(ms)
  const y = d.getFullYear()
  const m = d.getMonth() + 1
  if (g === 'month') return y * 100 + m
  if (g === 'quarter') return y * 100 + Math.floor((m - 1) / 3) + 1
  if (g === 'half') return y * 100 + (m <= 6 ? 1 : 2)
  return y * 100
}

function periodTitle(g: Grouping, key: number) {
  const y = Math.floor(key / 100)
  const n = key % 100
  if (g === 'month') return `${y}년 ${n}월`
  if (g === 'quarter') return `${y}년 ${n}분기`
  if (g === 'half') return `${y}년 ${n === 1 ? '상반기' : '하반기'}`
  return `${y}년`
}

function dateText(roll: Roll) {
  const start = fmtDay(roll.loadedAt)
  const end = roll.finishedAt ? fmtDay(roll.finishedAt) : ''
  if (!end || end === start) return start
  const sameYear = start.slice(0, 4) === end.slice(0, 4)
  return `${start} – ${sameYear ? end.slice(5) : end}`
}

export default function Rolls() {
  useDb()
  const c = useTheme()
  const { width } = useWindowDimensions()
  const rolls = listRolls()
  const cameras = listCameras()
  const savedGrouping = getPref('rollGrouping', 'month')
  const [grouping, setGrouping] = useState<Grouping>(groupings.includes(savedGrouping as Grouping) ? savedGrouping as Grouping : 'month')
  const [layout, setLayout] = useState(getPref('rollsLayout', 'grid'))
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [filmId, setFilmId] = useState('')
  const [cameraId, setCameraId] = useState('')
  const [status, setStatus] = useState<RollStatus | ''>('')
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState<'film' | 'camera' | 'status' | ''>('')
  const cardWidth = Math.floor((width - 32 - 10) / 2)

  const nameOf = (roll: Roll) => cameraName(getCamera(roll.cameraId ?? ''), roll)
  const filtered = useMemo(() => rolls.filter((roll) => {
    if (favoritesOnly && !roll.favorite) return false
    if (filmId && roll.filmId !== filmId) return false
    if (cameraId && roll.cameraId !== cameraId) return false
    if (status && roll.status !== status) return false
    if (search.trim()) {
      const text = [filmDisplayName(filmById(roll.filmId)), nameOf(roll), roll.lab, roll.note].join(' ').toLowerCase()
      if (!text.includes(search.trim().toLowerCase())) return false
    }
    return true
  }), [rolls, favoritesOnly, filmId, cameraId, status, search, cameras])

  const groups = useMemo(() => {
    const map = new Map<number, Roll[]>()
    for (const roll of filtered) {
      const key = periodKey(grouping, roll.loadedAt)
      map.set(key, [...(map.get(key) ?? []), roll])
    }
    return [...map.entries()].sort((a, b) => b[0] - a[0]).map(([key, list]) => ({
      key, title: periodTitle(grouping, key), rolls: list.sort((a, b) => b.loadedAt - a.loadedAt),
    }))
  }, [filtered, grouping])

  const filmOptions = useMemo(() => {
    const map = new Map<string, string>()
    for (const roll of rolls) map.set(roll.filmId, filmDisplayName(filmById(roll.filmId)))
    return [...map.entries()]
  }, [rolls])
  const cameraOptions = cameras.filter((camera) => rolls.some((roll) => roll.cameraId === camera.id))
    .map((camera) => [camera.id, cameraName(camera)] as [string, string])
  const filtering = favoritesOnly || filmId || cameraId || status

  const chooseGrouping = (next: Grouping) => {
    setGrouping(next)
    setPref('rollGrouping', next)
  }
  const toggleLayout = () => {
    const next = layout === 'grid' ? 'list' : 'grid'
    setLayout(next)
    setPref('rollsLayout', next)
  }

  return (
    <Screen
      large
      title="롤 보관함"
      right={(
        <GlassButton label={layout === 'grid' ? '목록으로 보기' : '그리드로 보기'} onPress={toggleLayout}>
          <Icon name={layout === 'grid' ? 'list' : 'grid'} size={22} color={c.safelight} />
        </GlassButton>
      )}
    >
      <ProjectStrip rolls={rolls} />

      <View style={{ width: '100%', maxWidth: '100%', gap: 10 }}>
        <View style={{ height: 44, width: '100%', borderRadius: 22, backgroundColor: c.fill, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 8 }}>
          <Icon name="search" size={18} color={c.muted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="필름, 카메라, 장소, 메모"
            placeholderTextColor={c.muted}
            style={{ flex: 1, minWidth: 0, width: 0, fontSize: 17, color: c.ink, padding: 0 }}
          />
        </View>
        <View style={{ width: '100%', flexDirection: 'row', backgroundColor: c.fill, borderRadius: 999, padding: 3 }}>
          {groupings.map((item) => {
            const on = item === grouping
            return (
              <Pressable key={item} onPress={() => chooseGrouping(item)} style={{
                flex: 1, minWidth: 0, height: 34, borderRadius: 999, alignItems: 'center', justifyContent: 'center',
                backgroundColor: on ? c.cell : 'transparent',
              }}>
                <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: on ? '700' : '500', color: c.ink }}>{groupingName[item]}</Text>
              </Pressable>
            )
          })}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ width: '100%', flexGrow: 0 }} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
          <FilterChip label="즐겨찾기" active={favoritesOnly} icon="star" onPress={() => setFavoritesOnly((v) => !v)} />
          <FilterChip label="필름" value={filmOptions.find(([id]) => id === filmId)?.[1]} active={!!filmId} onPress={() => setOpen(open === 'film' ? '' : 'film')} />
          <FilterChip label="카메라" value={cameraOptions.find(([id]) => id === cameraId)?.[1]} active={!!cameraId} onPress={() => setOpen(open === 'camera' ? '' : 'camera')} />
          <FilterChip label="진행 상태" value={status ? statusName[status] : undefined} active={!!status} onPress={() => setOpen(open === 'status' ? '' : 'status')} />
          {filtering ? <FilterChip label="초기화" onPress={() => { setFavoritesOnly(false); setFilmId(''); setCameraId(''); setStatus(''); setOpen('') }} /> : null}
        </ScrollView>
        {open === 'film' ? <OptionRow options={filmOptions} value={filmId} onChange={(id) => { setFilmId(id); setOpen('') }} /> : null}
        {open === 'camera' ? <OptionRow options={cameraOptions} value={cameraId} onChange={(id) => { setCameraId(id); setOpen('') }} /> : null}
        {open === 'status' ? (
          <OptionRow
            options={(Object.keys(statusName) as RollStatus[]).map((id) => [id, statusName[id]])}
            value={status}
            onChange={(id) => { setStatus(id as RollStatus | ''); setOpen('') }}
          />
        ) : null}
      </View>

      {rolls.length === 0 ? <Empty title="아직 롤이 없어요" /> : null}
      {rolls.length > 0 && filtered.length === 0 ? (
        <Empty title="조건에 맞는 롤이 없어요" action="필터 초기화" onPress={() => { setFavoritesOnly(false); setFilmId(''); setCameraId(''); setStatus('') }} />
      ) : null}

      {groups.map((group) => (
        <View key={group.key} style={{ width: '100%', gap: 8 }}>
          <Text style={{ color: c.muted, fontSize: 15, fontWeight: '600', paddingHorizontal: 2 }}>{group.title} · {group.rolls.length}롤</Text>
          {layout === 'grid' ? (
            <View style={{ width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {group.rolls.map((roll) => <RollGridCard key={roll.id} roll={roll} width={cardWidth} />)}
            </View>
          ) : (
            <View style={{ backgroundColor: c.cell, borderRadius: 22, overflow: 'hidden' }}>
              {group.rolls.map((roll, index) => <RollListRow key={roll.id} roll={roll} first={index === 0} />)}
            </View>
          )}
        </View>
      ))}
    </Screen>
  )
}

function FilterChip({ label, value, active, icon, onPress }: {
  label: string
  value?: string
  active?: boolean
  icon?: string
  onPress: () => void
}) {
  const c = useTheme()
  return (
    <Pressable onPress={onPress} style={{
      height: 36, paddingHorizontal: 14, borderRadius: 18, flexDirection: 'row', alignItems: 'center', gap: 5,
      backgroundColor: active ? c.safelight : c.cell,
    }}>
      {icon ? <Icon name={icon} size={15} color={active ? '#fff' : c.ink} /> : null}
      <Text style={{ color: active ? '#fff' : c.ink, fontSize: 15, fontWeight: '500' }}>{value ?? label}</Text>
      {value || (!icon && label !== '초기화' && label !== '즐겨찾기') ? <Text style={{ color: active ? '#fff' : c.muted, fontSize: 12 }}>▾</Text> : null}
    </Pressable>
  )
}

function OptionRow({ options, value, onChange }: { options: [string, string][]; value: string; onChange: (id: string) => void }) {
  const c = useTheme()
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      <Pressable onPress={() => onChange('')} style={{ height: 32, paddingHorizontal: 12, borderRadius: 16, backgroundColor: value ? c.cell : c.safelight, justifyContent: 'center' }}>
        <Text style={{ color: value ? c.ink : '#fff', fontSize: 14 }}>전체</Text>
      </Pressable>
      {options.map(([id, name]) => {
        const on = id === value
        return (
          <Pressable key={id} onPress={() => onChange(id)} style={{ height: 32, paddingHorizontal: 12, borderRadius: 16, backgroundColor: on ? c.safelight : c.cell, justifyContent: 'center' }}>
            <Text style={{ color: on ? '#fff' : c.ink, fontSize: 14 }}>{name}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

function Badge({ status }: { status: RollStatus }) {
  const tone = statusColor[status]
  return (
    <View style={{ borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: tone.bg }}>
      <Text style={{ color: tone.color, fontSize: 12, fontWeight: '700' }}>{statusName[status]}</Text>
    </View>
  )
}

function RollGridCard({ roll, width }: { roll: Roll; width: number }) {
  const c = useTheme()
  const camera = getCamera(roll.cameraId ?? '')
  return (
    <Pressable onPress={() => router.push(`/roll/${roll.id}`)} style={({ pressed }) => ({
      width, backgroundColor: c.card, borderRadius: 22, padding: 12, gap: 6, transform: [{ scale: pressed ? 0.98 : 1 }],
    })}>
      <View style={{ height: 118, borderRadius: 16, backgroundColor: '#141210', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <Canister film={filmById(roll.filmId)} format={camera?.format} size={112} />
        {roll.favorite ? <Text style={{ position: 'absolute', top: 8, right: 8, color: '#F2A71B' }}>★</Text> : null}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Text style={{ flex: 1, minWidth: 0, color: c.ink, fontSize: 16, fontWeight: '700' }} numberOfLines={1}>{filmDisplayName(filmById(roll.filmId))}</Text>
        <Badge status={roll.status} />
      </View>
      <Text style={{ color: c.muted, fontSize: 14 }} numberOfLines={1}>{nameOfCard(camera, roll)}</Text>
      <Text style={{ color: c.muted, fontSize: 14 }}>{dateText(roll)}</Text>
    </Pressable>
  )
}

function nameOfCard(camera: ReturnType<typeof getCamera>, roll: Roll) {
  return cameraName(camera, roll)
}

function RollListRow({ roll, first }: { roll: Roll; first: boolean }) {
  const c = useTheme()
  const camera = getCamera(roll.cameraId ?? '')
  return (
    <Pressable onPress={() => router.push(`/roll/${roll.id}`)} style={{
      minHeight: 72, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 12,
      borderTopWidth: first ? 0 : 0.5, borderTopColor: c.sep,
    }}>
      <Canister film={filmById(roll.filmId)} format={camera?.format} size={52} />
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ flex: 1, color: c.ink, fontSize: 16, fontWeight: '700' }} numberOfLines={1}>{filmDisplayName(filmById(roll.filmId))}</Text>
          <Badge status={roll.status} />
        </View>
        <Text style={{ color: c.muted, fontSize: 14 }} numberOfLines={1}>{cameraName(camera, roll)} · {dateText(roll)}</Text>
      </View>
    </Pressable>
  )
}
