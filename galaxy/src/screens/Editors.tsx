// 웹 pages/Editors.tsx
import { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Keyboard, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { WebView } from 'react-native-webview'
import * as Location from 'expo-location'
import { db } from '../data'
import { useLiveQuery } from '../store'
import { forgetSuggestion, hiddenSet, rememberSuggestion } from '../suggest'
import type { GeoPoint, Lens, LocationSegment, Roll, ShootingDay } from '../core/types'
import { formatInfo, uid } from '../core/types'
import { rollCameraFormat, sortedLocations } from '../core/display'
import { Btn, Chip, DateInput, Field, Group, Row, RowText, Section, Spinner, Sub, Toggle } from '../kit'
import { Icon } from '../icons'
import { Confirm, Sheet, SheetBtn } from '../overlay'
import { currentPlace, locationAvailable, parseCoordinates, placeSearchAvailable, searchPlaces, type Place, weatherAt } from '../platform'
import { useTheme } from '../theme'

const frameMax = (format: keyof typeof formatInfo = '135') => formatInfo[format].count + 4

function Stepper({ value, onChange, min = 1, max, label }: { value: number; onChange: (n: number) => void; min?: number; max: number; label: string }) {
  const c = useTheme()
  return (
    <View style={{ minHeight: 52, paddingVertical: 10, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <Text style={{ fontSize: 17, color: c.ink }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Btn label="−" size="small" onPress={() => onChange(Math.max(min, value - 1))} />
        <Text style={{ minWidth: 72, textAlign: 'center', fontSize: 17, fontWeight: '700', color: c.ink, fontVariant: ['tabular-nums'] }}>{value}번부터</Text>
        <Btn label="+" size="small" onPress={() => onChange(Math.min(max, value + 1))} />
      </View>
    </View>
  )
}

/** 장소 하나: 검색해서 고르면 이름과 좌표가 같이 들어간다. 고르지 않고 쓴 글자는 이름으로만 저장. */
export function PlacePicker({ name, point, onChange }: { name: string; point?: GeoPoint; onChange: (name: string, point?: GeoPoint) => void }) {
  const c = useTheme()
  const [query, setQuery] = useState(name)
  const [results, setResults] = useState<Place[]>([])
  const [picked, setPicked] = useState<{ address?: string } | null>(point ? {} : null)
  const [searching, setSearching] = useState(false)
  const [locating, setLocating] = useState(false)
  const [coordOpen, setCoordOpen] = useState(false)
  const [coordText, setCoordText] = useState(point ? `${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}` : '')
  const canSearch = placeSearchAvailable()

  useEffect(() => {
    if (!canSearch || picked || query.trim().length < 2) { setResults([]); setSearching(false); return }
    setSearching(true)
    const t = setTimeout(async () => { setResults(await searchPlaces(query)); setSearching(false) }, 350)
    return () => clearTimeout(t)
  }, [query, canSearch, picked])

  const choose = (p: Place) => {
    setQuery(p.name); setPicked({ address: p.address }); setResults([])
    setCoordText(`${p.point.latitude.toFixed(5)}, ${p.point.longitude.toFixed(5)}`)
    onChange(p.name, p.point)
    Keyboard.dismiss()
  }

  return (
    <Section title="장소" foot={!point && query.trim() && !results.length && !searching ? '목록에서 고르면 사진에 위치도 기록돼요. 고르지 않으면 이름만 저장돼요.' : undefined}>
      <Group>
        <View style={{ minHeight: 52, paddingLeft: 16, paddingRight: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Icon name={picked ? 'pin' : 'search'} size={20} color={c.muted} />
          <TextInput value={query} placeholder="장소 검색" placeholderTextColor={c.faint} returnKeyType="search" autoCorrect={false}
            style={{ flex: 1, fontSize: 17, color: c.ink, paddingVertical: 12 }}
            onChangeText={(t) => { setQuery(t); setPicked(null); onChange(t, undefined) }} />
          {searching ? <Spinner /> : null}
          {query && !searching ? (
            <Pressable accessibilityLabel="지우기" onPress={() => { setQuery(''); setPicked(null); onChange('', undefined) }}
              style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: c.faint, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="close" size={14} color={c.cell} />
            </Pressable>
          ) : null}
        </View>
        {picked && point ? (
          <View style={{ paddingLeft: 46, paddingRight: 18, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: -4 }}>
            <View style={{ flex: 1 }}><Sub>{picked.address || `${point.latitude.toFixed(4)}, ${point.longitude.toFixed(4)}`}</Sub></View>
            <View style={{ borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: `${c.good}26` }}>
              <Text style={{ color: c.good, fontSize: 12, fontWeight: '600' }}>위치 기록</Text>
            </View>
          </View>
        ) : null}
        {results.map((r, i) => (
          <Row key={i} onPress={() => choose(r)}>
            <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: c.soft, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="pin" size={16} color={c.safelight} />
            </View>
            <RowText sub={r.address}>{r.name}</RowText>
          </Row>
        ))}
        {locationAvailable() && !results.length ? (
          <Row onPress={locating ? undefined : async () => {
            setLocating(true)
            const p = await currentPlace()
            setLocating(false)
            if (p) choose({ ...p, name: p.name || query || '현재 위치' })
          }}>
            {locating ? <Spinner /> : <Icon name="pin" size={20} color={c.safelight} />}
            <RowText color={c.safelight}>{locating ? '현재 위치 찾는 중…' : '현재 위치'}</RowText>
          </Row>
        ) : null}
        {!results.length ? (
          <Row onPress={() => setCoordOpen(!coordOpen)}>
            <Text style={{ flex: 1, color: c.muted, fontSize: 15 }}>좌표 직접 넣기</Text>
            <Icon name={coordOpen ? 'close' : 'chev'} size={16} color={c.faint} />
          </Row>
        ) : null}
        {coordOpen ? (
          <Field label="좌표 또는 지도 링크" stack value={coordText} keyboardType="numbers-and-punctuation"
            onChangeText={(t) => {
              setCoordText(t)
              const p = parseCoordinates(t)
              setPicked(p ? {} : null)
              onChange(query, p)
            }} />
        ) : null}
      </Group>
    </Section>
  )
}

export function DayEdit({ roll, day, onClose }: { roll: Roll; day?: ShootingDay; onClose: () => void }) {
  const camera = useLiveQuery(() => (roll.cameraId ? db.cameras.get(roll.cameraId) : undefined), [roll.cameraId])
  const lastKnown = Math.max(0, ...roll.days.map((d) => d.startFrame ?? 0), ...roll.locations.map((l) => l.startFrame))
  const [date, setDate] = useState(day?.startedAt ?? Date.now())
  const [knows, setKnows] = useState(day ? day.startFrame !== undefined : roll.days.length === 0)
  const [frame, setFrame] = useState(day?.startFrame ?? (roll.days.length === 0 ? 1 : lastKnown + 1))
  const [name, setName] = useState('')
  const [point, setPoint] = useState<GeoPoint>()
  const [memo, setMemo] = useState('')
  const [confirm, setConfirm] = useState(false)

  useEffect(() => {
    if (day || !locationAvailable()) return
    currentPlace().then((p) => { if (p) { setName((n) => n || p.name); setPoint((x) => x ?? p.point) } })
  }, [day])

  const save = async () => {
    const start = knows ? frame : undefined
    let days = roll.days
    let locations = roll.locations
    if (day) {
      days = days.map((d) => (d.id === day.id ? { ...d, startedAt: date, startFrame: start } : d))
    } else {
      days = [...days, { id: uid(), startedAt: date, startFrame: days.length === 0 ? 1 : start }]
      if (name.trim() || point || memo.trim()) {
        const last = sortedLocations(roll).at(-1)
        if (last?.name !== name.trim() || !last) {
          const segStart = locations.length === 0 ? 1 : start ?? (last ? last.startFrame + 1 : 1)
          locations = [...locations, { id: uid(), startFrame: segStart, name: name.trim(), point, memo: memo.trim() || undefined, weather: weatherAt(point) }]
        }
      }
    }
    await db.rolls.update(roll.id, { days, locations })
    onClose()
  }

  return (
    <Sheet title={day ? '촬영일 수정' : '촬영일 추가'} onClose={onClose} right={<SheetBtn label="저장" accent onPress={save} />}>
      <Section foot="카메라 카운터에 보이는 숫자예요. 모르면 끄세요. 스캔을 불러올 때 촬영일끼리 고르게 나눠요.">
        <Group>
          <Field label="촬영 시작"><DateInput time value={date} onChange={setDate} /></Field>
          <Toggle label="카운터 확인" value={knows} onChange={setKnows} />
          {knows ? <Stepper label="카운터" value={frame} onChange={setFrame} max={frameMax(rollCameraFormat(camera, roll))} /> : null}
        </Group>
      </Section>
      {!day ? (
        <>
          <PlacePicker name={name} point={point} onChange={(n, p) => { setName(n); setPoint(p) }} />
          <Section title="메모">
            <Group><MemoInput value={memo} onChange={setMemo} /></Group>
          </Section>
        </>
      ) : null}
      {day ? <Group><Row onPress={() => setConfirm(true)}><Icon name="trash" size={20} color="#c0392b" /><RowText color="#c0392b">촬영일 삭제</RowText></Row></Group> : null}
      {confirm && day ? (
        <Confirm message="이 촬영일을 삭제할까요?" onCancel={() => setConfirm(false)}
          onConfirm={async () => { setConfirm(false); await db.rolls.update(roll.id, { days: roll.days.filter((d) => d.id !== day.id) }); onClose() }} />
      ) : null}
    </Sheet>
  )
}

/** .field 안 textarea */
export function MemoInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const c = useTheme()
  return (
    <View style={{ paddingVertical: 8, paddingHorizontal: 18 }}>
      <TextInput multiline value={value} onChangeText={onChange} accessibilityLabel="메모" placeholderTextColor={c.faint}
        style={{ minHeight: 64, fontSize: 17, lineHeight: 23, color: c.ink, textAlignVertical: 'top', paddingVertical: 3 }} />
    </View>
  )
}

export function PlaceEdit({ roll, segment, onClose }: { roll: Roll; segment?: LocationSegment; onClose: () => void }) {
  const camera = useLiveQuery(() => (roll.cameraId ? db.cameras.get(roll.cameraId) : undefined), [roll.cameraId])
  const last = sortedLocations(roll).at(-1)
  const [frame, setFrame] = useState(segment?.startFrame ?? (last ? last.startFrame + 1 : 1))
  const [name, setName] = useState(segment?.name ?? '')
  const [point, setPoint] = useState<GeoPoint | undefined>(segment?.point)
  const [memo, setMemo] = useState(segment?.memo ?? '')
  const [confirm, setConfirm] = useState(false)

  const save = async () => {
    const value: LocationSegment = {
      id: segment?.id ?? uid(), startFrame: frame, name: name.trim(), point, memo: memo.trim() || undefined,
      // 장소를 그대로 두면 예전 날씨를, 방금 현재 위치로 바꿨으면 지금 날씨를
      weather: weatherAt(point) ?? (point && segment?.point && point.latitude === segment.point.latitude && point.longitude === segment.point.longitude ? segment.weather : undefined),
    }
    const locations = segment ? roll.locations.map((l) => (l.id === segment.id ? value : l)) : [...roll.locations, value]
    await db.rolls.update(roll.id, { locations })
    onClose()
  }

  return (
    <Sheet title={segment ? '장소 수정' : '장소 추가'} onClose={onClose}
      right={<SheetBtn label="저장" accent disabled={!name.trim() && !point && !memo.trim()} onPress={save} />}>
      <Section><Group>
        <Stepper label="시작 컷" value={frame} onChange={setFrame} max={frameMax(rollCameraFormat(camera, roll))} />
      </Group></Section>
      <PlacePicker name={name} point={point} onChange={(n, p) => { setName(n); setPoint(p) }} />
      <Section title="메모">
        <Group><MemoInput value={memo} onChange={setMemo} /></Group>
      </Section>
      {segment ? <Group><Row onPress={() => setConfirm(true)}><Icon name="trash" size={20} color="#c0392b" /><RowText color="#c0392b">장소 삭제</RowText></Row></Group> : null}
      {confirm && segment ? (
        <Confirm message="이 장소를 삭제할까요?" onCancel={() => setConfirm(false)}
          onConfirm={async () => { setConfirm(false); await db.rolls.update(roll.id, { locations: roll.locations.filter((l) => l.id !== segment.id) }); onClose() }} />
      ) : null}
    </Sheet>
  )
}

export function recentLabs(rolls: { lab?: string; deletedAt?: number }[]) {
  const hidden = hiddenSet('labs')
  return Object.entries(rolls.reduce<Record<string, number>>((m, r) => {
    if (r.lab && !r.deletedAt && !hidden.has(r.lab.toLowerCase())) m[r.lab] = (m[r.lab] ?? 0) + 1
    return m
  }, {})).sort((a, b) => b[1] - a[1]).map(([l]) => l)
}

export function rememberLab(raw: string) {
  rememberSuggestion('labs', raw)
}

/** 직접 입력하거나, 예전에 적은 현상소를 고른다. */
export function LabField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const rolls = useLiveQuery(() => db.rolls.toArray(), []) ?? []
  const [rev, setRev] = useState(0)
  const labs = useMemo(() => { void rev; return recentLabs(rolls) }, [rolls, rev])
  return (
    <>
      <Field label="현상소" value={value} placeholder="현상소 이름" onChangeText={onChange} />
      {labs.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="always" contentContainerStyle={{ gap: 6, paddingHorizontal: 18, paddingBottom: 12 }}>
          {labs.map((l) => (
            <View key={l} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Chip label={l} flat active={l === value} onPress={() => onChange(l)} />
              <Pressable onPress={() => { forgetSuggestion('labs', l); setRev((n) => n + 1) }} hitSlop={8} accessibilityLabel={`${l} 추천 지우기`}>
                <Text style={{ fontSize: 16, fontWeight: '700', marginLeft: -6 }}>×</Text>
              </Pressable>
            </View>
          ))}
        </ScrollView>
      ) : null}
    </>
  )
}

export function LabDropOff({ roll, onClose }: { roll: Roll; onClose: () => void }) {
  const c = useTheme()
  const [lab, setLab] = useState(roll.lab ?? '')
  const [date, setDate] = useState(roll.droppedAt ?? Date.now())
  const [nearby, setNearby] = useState(false)

  const close = async () => {
    const current = await db.rolls.get(roll.id)
    if (current?.status === 'loaded') {
      await db.rolls.update(roll.id, { status: 'finished', finishedAt: current.finishedAt ?? Date.now() })
    }
    onClose()
  }

  const save = async () => {
    rememberLab(lab)
    await db.rolls.update(roll.id, {
      lab: lab.trim() || undefined, droppedAt: date,
      status: roll.status === 'loaded' || roll.status === 'finished' ? 'atLab' : roll.status,
      finishedAt: roll.finishedAt ?? date,
    })
    onClose()
  }

  return (
    <Sheet page title="현상 맡기기" onClose={close} right={<SheetBtn label="저장" accent onPress={save} />}>
      <Section title="현상소">
        <Group>
          <LabField value={lab} onChange={setLab} />
          <Row onPress={() => setNearby(true)}><Icon name="pin" size={20} color={c.safelight} /><RowText color={c.safelight}>가까운 현상소 찾기</RowText></Row>
        </Group>
      </Section>
      {nearby ? <NearbyLabs onPick={(name) => { setLab(name); setNearby(false) }} onClose={() => setNearby(false)} /> : null}
      <Section><Group>
        <Field label="맡긴 날"><DateInput value={date} onChange={setDate} /></Field>
      </Group></Section>
    </Sheet>
  )
}

/**
 * 렌즈 기록 수정: 처음 끼운 렌즈(1번 컷부터) 또는 중간에 바꿔 낀 렌즈(몇 번 컷부터).
 * change가 'first'면 처음 렌즈, 없으면 새 교체 기록, 있으면 그 교체 기록을 고친다.
 */
export function LensChangeEdit({ roll, mount, brand, change, onClose }: {
  roll: Roll; mount: string; brand: string; change?: 'first' | { id: string; startFrame: number; lensId: string }; onClose: () => void
}) {
  const c = useTheme()
  const camera = useLiveQuery(() => (roll.cameraId ? db.cameras.get(roll.cameraId) : undefined), [roll.cameraId])
  const lenses = useLiveQuery(async () => (await db.lenses.toArray()).filter((l) => l.mount.toLowerCase() === mount.toLowerCase()), [mount]) ?? []
  const isFirst = change === 'first'
  const existing = typeof change === 'object' ? change : undefined
  const lastStart = Math.max(1, ...(roll.lensChanges ?? []).map((x) => x.startFrame))
  const [frame, setFrame] = useState(existing?.startFrame ?? lastStart + 1)
  const [lensId, setLensId] = useState(isFirst ? roll.lensId ?? '' : existing?.lensId ?? '')
  const [newLens, setNewLens] = useState('')
  const [confirm, setConfirm] = useState(false)
  const ready = lensId === '__new' ? !!newLens.trim() : !!lensId

  const save = async () => {
    let id = lensId
    if (lensId === '__new') {
      const lens: Lens = { id: uid(), brand, model: newLens.trim(), mount, createdAt: Date.now() }
      await db.lenses.add(lens)
      id = lens.id
    }
    if (isFirst) {
      await db.rolls.update(roll.id, { lensId: id })
    } else {
      const value = { id: existing?.id ?? uid(), startFrame: Math.max(2, frame), lensId: id }
      const list = existing ? (roll.lensChanges ?? []).map((x) => (x.id === existing.id ? value : x)) : [...(roll.lensChanges ?? []), value]
      await db.rolls.update(roll.id, { lensChanges: list.sort((a, b) => a.startFrame - b.startFrame) })
    }
    onClose()
  }

  return (
    <Sheet title={isFirst ? '처음 끼운 렌즈' : existing ? '렌즈 교체 수정' : '렌즈 바꿔 낌'} onClose={onClose}
      right={<SheetBtn label="저장" accent disabled={!ready} onPress={save} />}>
      {!isFirst ? (
        <Section><Group>
          <Stepper label="바꾼 컷" value={Math.max(2, frame)} onChange={setFrame} min={2} max={frameMax(rollCameraFormat(camera, roll))} />
        </Group></Section>
      ) : null}
      <Section title={`렌즈 · ${mount}`}>
        <Group>
          {lenses.map((l) => (
            <Row key={l.id} onPress={() => setLensId(l.id)}>
              <RowText>{l.brand} {l.model}</RowText>
              {lensId === l.id ? <Icon name="check" size={20} color={c.safelight} /> : null}
            </Row>
          ))}
          <Row onPress={() => setLensId('__new')}>
            <Icon name="plus" size={20} color={c.safelight} /><RowText color={c.safelight}>새 렌즈</RowText>
            {lensId === '__new' ? <Icon name="check" size={20} color={c.safelight} /> : null}
          </Row>
          {lensId === '__new' ? <Field label="렌즈 이름" value={newLens} autoCorrect={false} onChangeText={setNewLens} /> : null}
        </Group>
      </Section>
      {existing ? (
        <Group>
          <Row onPress={() => setConfirm(true)}><Icon name="trash" size={20} color={c.danger} /><RowText color={c.danger}>이 교체 기록 삭제</RowText></Row>
        </Group>
      ) : null}
      {confirm && existing ? (
        <Confirm message="이 렌즈 교체 기록을 지울까요?" onCancel={() => setConfirm(false)}
          onConfirm={async () => { setConfirm(false); await db.rolls.update(roll.id, { lensChanges: (roll.lensChanges ?? []).filter((x) => x.id !== existing.id) }); onClose() }} />
      ) : null}
    </Sheet>
  )
}

/** 가까운 현상소 (웹 public/labs.html: 지도 + 거리순 목록) */
function NearbyLabs({ onPick, onClose }: { onPick: (name: string) => void; onClose: () => void }) {
  const [ready, setReady] = useState(false)
  // WebView 안 위치는 앱 위치 권한을 먼저 받아야 쓸 수 있다
  useEffect(() => { Location.requestForegroundPermissionsAsync().finally(() => setReady(true)) }, [])
  return (
    <Modal visible animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: '#0b0b0c' }}>
        {ready ? (
          <WebView source={{ uri: 'https://filmchest.vercel.app/labs.html' }} geolocationEnabled originWhitelist={['*']}
            style={{ flex: 1, backgroundColor: '#0b0b0c' }}
            onMessage={(e) => {
              try {
                const msg = JSON.parse(e.nativeEvent.data) as { type: string; name?: string }
                if (msg.type === 'pick') onPick(String(msg.name ?? ''))
                else if (msg.type === 'close') onClose()
              } catch { /* 모르는 메시지 */ }
            }} />
        ) : <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color="#fff" /></View>}
      </View>
    </Modal>
  )
}

