// 웹 pages/ManualRecord.tsx — 상세 기록 (노출계 없이): 카메라 윗면 다이얼로 셔터 · 노출 보정 · 조리개(맨 끝 ⚡)를 맞추고,
// 셔터를 누르면 레버가 감기며 그 칸에 장소·시간과 함께 남는다. 배치·규칙은 아이폰·웹과 같다 (소리만 없음)
import { useEffect, useMemo, useRef, useState } from 'react'
import { Modal, PanResponder, Pressable, ScrollView, TextInput, Vibration, View, useWindowDimensions } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, RadialGradient, Rect, Stop, Text as SvgText, TSpan } from 'react-native-svg'
import { Text } from '../text'
import { db } from '../data'
import { useLiveQuery } from '../store'
import { framesPerRoll, lensIdAt, type Camera, type GeoPoint, type Lens as GearLens, type MeterShot, type Roll } from '../core/types'
import { filmDisplayName } from '../core/films'
import { catalogMatch } from '../core/cameras'
import { formatAperture, formatComp, formatShutter } from '../core/meter'
import { cameraName, rollCameraFormat, rollFilm } from '../core/display'
import { currentPlace } from '../platform'
import { Chip, Chips, DateInput, Group, Row, RowText } from '../kit'
import { Confirm, Sheet, SheetBtn } from '../overlay'
import { PlacePicker } from './Editors'

type Lens = { id: string; name: string; min: number; max: number; open: number; close: number; fixed?: boolean }

const STANDARD = [1 / 8000, 1 / 4000, 1 / 2000, 1 / 1000, 1 / 500, 1 / 250, 1 / 125, 1 / 60, 1 / 30, 1 / 15, 1 / 8, 1 / 4, 1 / 2, 1, 2, 4, 8, 15, 30]
const COMPS = Array.from({ length: 13 }, (_, i) => (i - 6) / 3)
const ISOS = [25, 32, 40, 50, 64, 80, 100, 125, 160, 200, 250, 320, 400, 500, 640, 800, 1000, 1250, 1600, 2000, 2500, 3200, 4000, 5000, 6400]
const FILTERS = ['UV', '노랑', '주황', '빨강', '녹색', '편광', 'ND2', 'ND4', 'ND8', 'ND16', 'ND64', 'ND1000', '80A 블루', '85B 앰버']
// 셔터 자리 값: P = -2, A = 0, B = -1, 그 밖은 초
const P = -2, A = 0, B = -1
const ORANGE = '#ff6b1f', SUB = '#8d8a85', PANEL = '#161618', LINE = '#2a2a2e'
const nearest = (list: number[], v: number) => list.reduce((b, x, i) => (Math.abs(Math.log2(x / v)) < Math.abs(Math.log2(list[b] / v)) ? i : b), 0)
const dialS = (t: number) => (t === P ? 'P' : t === A ? 'A' : t === B ? 'B' : t >= 1 ? `${t}"` : String(Math.round(1 / t)))
const trim = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1))
const buzz = (ms: number) => { try { Vibration.vibrate(ms) } catch { /* 진동 없음 */ } }
const num = (s?: string) => { const m = s?.match(/\d+(\.\d+)?/); return m ? +m[0] : undefined }

/** 장비 탭 렌즈 → 기록용 렌즈 (화각이 비면 50mm, 조리개가 비면 f/1.4–22) */
function lensOf(l: GearLens): Lens {
  const min = l.focalMin && l.focalMin > 0 ? l.focalMin : 50
  const max = l.zoom && l.focalMax && l.focalMax > min ? l.focalMax : min
  return { id: l.id, name: `${l.brand} ${l.model}`.trim(), min, max, open: num(l.apertureOpen) ?? 1.4, close: num(l.apertureClose) ?? 22 }
}
/** 렌즈 고정형: 이름(예: "Zuiko 42mm f/2.8")에서 화각·조리개를 읽는다 */
function fixedLens(name: string): Lens {
  const mm = +(name.match(/(\d+)\s*mm/)?.[1] ?? 35)
  const f = num(name.match(/[fF]\s*\/?\s*\d+(\.\d+)?/)?.[0]) ?? 2.8
  return { id: 'fixed', name, min: mm, max: mm, open: f, close: 22, fixed: true }
}
function apertures(open: number, close: number) {
  const list = [1.4, 2, 2.8, 4, 5.6, 8, 11, 16, 22].filter((x) => x >= open - 0.01 && x <= close + 0.01)
  if (!list.length || list[0] - open > 0.05) list.unshift(Math.round(open * 10) / 10)
  return list
}
/** 이 카메라의 셔터 속도. 1/400·1/300·1/6000처럼 표준 단계가 아닌 최고·최저 값도 넣는다 */
function speeds(fastest: number, slowest: number) {
  const list = STANDARD.filter((t) => t >= 1 / fastest - 1e-9 && t <= slowest + 1e-9)
  for (const v of [1 / fastest, slowest]) if (!list.some((t) => Math.abs(Math.log2(t / v)) < 0.05)) list.push(v)
  return list.sort((a, b) => a - b)
}

// ───────── 다이얼 상태 (메인과 컷 고치기가 같이 쓴다)
interface Dial { stops: number[]; aps: number[]; s: number; a: number; c: number; fullAuto: boolean; lastA: number }
const dialOf = {
  stops: (sp: number[], manual: boolean, program: boolean) => (!manual ? [program ? P : A] : [...(program ? [P] : []), A, ...sp, B]),
  program: (d: Dial) => d.stops[d.s] === P,
  flashIndex: (d: Dial) => (d.fullAuto ? 1 : d.aps.length + 1),
  flash: (d: Dial) => d.a === dialOf.flashIndex(d),
  shutter: (d: Dial) => { const v = d.stops[d.s]; return v === P || v === A || v === undefined ? null : v },
  aperture: (d: Dial) => (dialOf.program(d) || d.fullAuto || d.a === 0 || dialOf.flash(d) || d.a > d.aps.length ? null : d.aps[d.a - 1]),
  comp: (d: Dial) => (d.fullAuto ? 0 : COMPS[d.c]),
  mode: (d: Dial): MeterShot['mode'] => {
    if (dialOf.program(d)) return 'P'
    const a = dialOf.aperture(d), s = dialOf.shutter(d)
    return a != null && s != null ? 'M' : a != null ? 'A' : s != null ? 'S' : 'P'
  },
  apLabels: (d: Dial) => (d.fullAuto ? ['A', '⚡'] : ['A', ...d.aps.map(trim), '⚡']),
  fromShot: (shot: MeterShot, like: Dial, aps: number[]): Dial => {
    const st = like.stops, sp = st.map((v, i) => [v, i]).filter(([v]) => v > 0)
    let s = st.indexOf(A) >= 0 ? st.indexOf(A) : 0
    if (shot.shutter != null && shot.shutter < 0 && st.includes(B)) s = st.indexOf(B)
    else if (shot.shutter != null && shot.shutter > 0 && sp.length) s = sp[nearest(sp.map(([v]) => v), shot.shutter)][1]
    else if (shot.mode === 'P' && st.includes(P)) s = st.indexOf(P)
    const ap = like.fullAuto || shot.aperture == null ? 0 : 1 + nearest(aps, shot.aperture)
    const c = COMPS.reduce((b, x, i) => (Math.abs(x - shot.comp) < Math.abs(COMPS[b] - shot.comp) ? i : b), 6)
    return { stops: st, aps, s, a: shot.flash ? (like.fullAuto ? 1 : aps.length + 1) : ap, c, fullAuto: like.fullAuto, lastA: ap }
  },
}

/** 값이 바뀌면 부드럽게 따라가는 숫자 (다이얼·레버·노브 회전) */
function useTween(target: number, ms = 280) {
  const [v, setV] = useState(target)
  const cur = useRef(target)
  useEffect(() => {
    const from = cur.current, start = Date.now()
    let id = 0
    const step = () => {
      const t = Math.min(1, (Date.now() - start) / ms), e = 1 - Math.pow(1 - t, 3)
      cur.current = from + (target - from) * e
      setV(cur.current)
      if (t < 1) id = requestAnimationFrame(step)
    }
    id = requestAnimationFrame(step)
    return () => cancelAnimationFrame(id)
  }, [target, ms])
  return v
}

export function ManualRecord({ roll, onClose }: { roll: Roll; onClose: () => void }) {
  const camera = useLiveQuery(() => (roll.cameraId ? db.cameras.get(roll.cameraId) : undefined), [roll.cameraId], null)
  const allLenses = useLiveQuery(() => db.lenses.toArray(), [], null)
  const ready = (camera !== null || !roll.cameraId) && allLenses !== null
  return (
    <Modal visible animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <StatusBar style="light" />
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        {ready ? <Recorder roll={roll} camera={camera ?? undefined} allLenses={allLenses ?? []} onClose={onClose} /> : null}
      </View>
    </Modal>
  )
}

function Recorder({ roll, camera, allLenses, onClose }: { roll: Roll; camera?: Camera; allLenses: GearLens[]; onClose: () => void }) {
  const insets = useSafeAreaInsets()
  const film = rollFilm(roll)
  const frames = framesPerRoll[rollCameraFormat(camera, roll)] ?? 36
  const iso = roll.shotISO ?? film?.iso ?? 400
  const [shots, setShots] = useState<MeterShot[]>(() => [...(roll.meterShots ?? [])].sort((a, b) => a.pos - b.pos))
  // 렌즈: 고정형이면 이름에서, 아니면 다음 컷에 끼운 렌즈 → 롤 렌즈. 바꿔 낄 수 있는 렌즈는 같은 마운트
  const fixedName = camera?.fixedLens ?? roll.cameraFixedLens
  const mount = camera?.mount ?? allLenses.find((l) => l.id === roll.lensId)?.mount
  const lensList = useMemo(() => (fixedName ? [] : allLenses.filter((l) => l.mount && l.mount === mount).map(lensOf)), [allLenses, fixedName, mount])
  const [lens, setLens] = useState<Lens>(() => {
    if (fixedName) return fixedLens(fixedName)
    const cur = allLenses.find((l) => l.id === (lensIdAt(roll, shots.length + 1) ?? roll.lensId))
    return cur ? lensOf(cur) : { id: 'generic', name: '렌즈', min: 50, max: 50, open: 1.4, close: 22 }
  })
  // 셔터 범위·P 모드: 카메라 목록. 모르면 똑딱이는 완전 자동, 그 밖은 1/1000–1초
  const known = camera ? catalogMatch(camera.brand, camera.model) : undefined
  const range = known?.shutter ?? (camera?.style === 'compact' ? [] : [1000, 1])
  const manual = range.length === 2
  const program = known ? !!known.program : camera?.style === 'compact'
  const [dial, setDial] = useState<Dial>(() => {
    const aps = apertures(lens.open, lens.close)
    const fullAuto = !manual && program
    const stops = dialOf.stops(manual ? speeds(range[0], range[1]) : [], manual, program)
    const sp = stops.map((v, i) => [v, i]).filter(([v]) => v > 0)
    return { stops, aps, s: manual && sp.length ? sp[nearest(sp.map(([v]) => v), 1 / 125)][1] : 0,
      a: fullAuto ? 0 : 1 + nearest(aps, 8), c: 6, fullAuto, lastA: 0 }
  })
  const [filters, setFilters] = useState<string[]>([])
  const [frame, setFrame] = useState(() => Math.max(0, ...(roll.meterShots ?? []).map((s) => s.pos)) + 1)
  const [placeName, setPlaceName] = useState('')
  const [point, setPoint] = useState<GeoPoint>()
  const [locating, setLocating] = useState(true)
  const [useNow, setUseNow] = useState(true)
  const [time, setTime] = useState(() => Date.now())
  const [sheet, setSheet] = useState<'place' | 'time' | 'filter' | 'lens'>()
  const [editing, setEditing] = useState<number>()
  const [toast, setToast] = useState<string>()
  const [leverOut, setLeverOut] = useState(false)
  const [down, setDown] = useState(false)
  const [rewind, setRewind] = useState(() => (roll.meterShots?.length ?? 0) * -150)
  const busy = useRef(false)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const stripRef = useRef<ScrollView>(null)
  const { width } = useWindowDimensions()

  const show = (t: string) => { setToast(t); if (toastTimer.current) clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToast(undefined), 2000) }
  const save = (list: MeterShot[]) => { setShots(list); void db.rolls.update(roll.id, { meterShots: list }) }

  // 장소: 마지막 기록 장소를 먼저 쓰고 현재 위치로 바꾼다
  useEffect(() => {
    const last = [...shots].sort((a, b) => b.order - a.order)[0]
    if (last?.place) { setPlaceName(last.place); if (last.lat != null && last.lon != null) setPoint({ latitude: last.lat, longitude: last.lon }) }
    void currentPlace().then((p) => { if (p) { setPlaceName(p.name); setPoint(p.point) } }).finally(() => setLocating(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const lo = Math.min(1, ...shots.map((s) => s.pos)), hi = Math.max(frames + 2, frame, ...shots.map((s) => s.pos))
  const cells = Array.from({ length: hi - lo + 1 }, (_, i) => hi - i)
  // 다음 칸이 가운데 오게 (칸 104, 왼쪽 끝은 필름통 자리)
  const first = useRef(true)
  useEffect(() => {
    const x = cells.indexOf(frame) * 104 - (width - 104) / 2
    stripRef.current?.scrollTo({ x: Math.max(0, x), animated: !first.current })
    first.current = false
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame, shots.length, width])

  /** 셔터: 지금 다이얼 값으로 이 칸을 기록하고, 셔터가 닫힌 뒤 레버가 감기며 다음 칸으로 */
  const fire = () => {
    if (busy.current) return
    const sh = dialOf.shutter(dial)
    const t = sh == null ? 1 / 125 : sh < 0 ? 1 : sh
    buzz(12)
    setDown(true); setTimeout(() => setDown(false), 140)
    const old = shots.find((s) => s.pos === frame)
    const shot: MeterShot = {
      pos: frame, order: old?.order ?? shots.length + 1, mode: dialOf.mode(dial), aperture: dialOf.aperture(dial), shutter: sh,
      comp: dialOf.comp(dial), flash: dialOf.flash(dial), ev: 0, focal: lens.max > lens.min ? null : lens.min,
      at: new Date(useNow ? Date.now() : time).toISOString(), edited: false, filters: filters.length ? filters : undefined,
      memo: old?.memo, tags: old?.tags, place: placeName || undefined, lat: point?.latitude, lon: point?.longitude, lensId: lens.id,
    }
    save([...shots.filter((s) => s.pos !== frame), shot].sort((a, b) => a.pos - b.pos))
    if (old) show(`${frame}번을 새로 기록했어요`)
    if (!useNow) setTime(time + 60000)
    busy.current = true
    const next = frame + 1
    setTimeout(() => {
      setLeverOut(true); buzz(4)
      setRewind((r) => r - 150); setFrame(next)
      setTimeout(() => { setLeverOut(false); setTimeout(() => { busy.current = false }, 320) }, 360)
    }, Math.max(150, Math.min(t, 8) * 1000 + 140))
  }

  const editShot = editing != null ? shots.find((s) => s.pos === editing) : undefined
  const pickLens = (l: Lens) => {
    setLens(l)
    setDial((d) => { const keep = dialOf.aperture(d), aps = apertures(l.open, l.close); return { ...d, aps, a: dialOf.flash(d) ? aps.length + 1 : keep != null ? 1 + nearest(aps, keep) : 0 } })
    setSheet(undefined); show(`${l.name}로 바꿨어요 · 다음 컷부터 기록돼요`)
  }

  return (
    <View style={{ flex: 1, paddingTop: insets.top + 8, paddingHorizontal: 16 }}>
      {/* 위: 뒤로 · 카메라/필름 · ISO · 필터 · 렌즈 */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Pressable onPress={onClose} accessibilityLabel="닫기" style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: PANEL, alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={20} height={20} viewBox="0 0 24 24"><Path d="M15 5l-7 7 7 7" fill="none" stroke="#fff" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" /></Svg>
        </Pressable>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ color: '#fff', fontSize: 17, fontWeight: '700' }}>{cameraName(camera, roll)}</Text>
          {film ? <Text numberOfLines={1} style={{ color: SUB, fontSize: 12 }}>{filmDisplayName(film)} · {frames}컷</Text> : null}
        </View>
        <Pill onPress={() => show('장착한 필름 감도예요')}><Text style={{ color: SUB, fontSize: 14, fontWeight: '600' }}>ISO </Text><Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>{iso}</Text></Pill>
        <Pill on={filters.length > 0} onPress={() => setSheet('filter')}>
          <FilterIcon color={filters.length ? '#111' : '#fff'} />
          {filters.length ? <Text style={{ color: '#111', fontSize: 14, fontWeight: '700' }}>{filters.length > 1 ? `${filters[0]}+${filters.length - 1}` : filters[0]}</Text> : null}
        </Pill>
        <Pill onPress={() => {
          if (lens.fixed) show('렌즈 고정형 카메라라 렌즈를 바꿀 수 없어요')
          else if (lensList.length < 2) show('장비 탭에 같은 마운트 렌즈를 등록하면 바꿔 낄 수 있어요')
          else setSheet('lens')
        }}><Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>{lens.max > lens.min ? `${lens.min}–${lens.max}mm` : `${lens.min}mm`}{lens.fixed ? '' : ' ›'}</Text></Pill>
      </View>

      <View style={{ flex: 1, minHeight: 6 }} />
      <RecordDials dial={dial} onChange={setDial} onLocked={show} iso={iso} />
      <PlaceTimeCard place={locating && !placeName ? '현재 위치 찾는 중…' : placeName || '없음'}
        time={useNow ? '기록하는 순간' : new Date(time).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        onPlace={() => setSheet('place')} onTime={() => { if (useNow) setTime(Date.now()); setSheet('time') }} />
      <View style={{ flex: 1, minHeight: 6 }} />

      {/* 셔터 줄 · 필름 (노출계와 같은 모양) */}
      <View style={{ paddingBottom: insets.bottom + 70 }}>
        <Controls counter={String(frame)} flash={dialOf.flash(dial)} leverOut={leverOut} rewind={rewind} down={down}
          onFlash={() => { setDial((d) => (dialOf.flash(d) ? { ...d, a: d.lastA } : { ...d, lastA: d.a, a: dialOf.flashIndex(d) })); buzz(15) }}
          onShutter={fire} />
        <View style={{ marginHorizontal: -16, marginTop: 8 }}>
          <ScrollView ref={stripRef} horizontal showsHorizontalScrollIndicator={false} style={{ opacity: 0.86 }}>
            {cells.map((p) => {
              const s = shots.find((x) => x.pos === p)
              return <Cell key={p} p={p} shot={s} next={p === frame && !s} onPress={() => (s ? setEditing(p) : setFrame(p))} />
            })}
          </ScrollView>
          <Canister iso={iso} frames={frames} body={film?.style.body} band={film?.style.band} />
        </View>
      </View>

      {toast ? (
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: insets.bottom + 260, alignItems: 'center' }}>
          <Text style={{ backgroundColor: 'rgba(60,60,64,0.92)', color: '#fff', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, overflow: 'hidden', fontSize: 14, fontWeight: '600' }}>{toast}</Text>
        </View>
      ) : null}

      {sheet === 'place' ? (
        <Sheet title="장소" onClose={() => setSheet(undefined)} right={<SheetBtn label="완료" accent onPress={() => setSheet(undefined)} />}>
          <PlacePicker name={placeName} point={point} onChange={(n, p) => { setPlaceName(n); setPoint(p) }} />
        </Sheet>
      ) : null}
      {sheet === 'time' ? (
        <TimeSheet time={time} onChange={setTime} onNow={() => { setUseNow(true); setSheet(undefined) }} onDone={() => { setUseNow(false); setSheet(undefined) }} />
      ) : null}
      {sheet === 'filter' ? (
        <Sheet title="필터" onClose={() => setSheet(undefined)} right={<SheetBtn label="완료" accent onPress={() => setSheet(undefined)} />}>
          <FilterChips value={filters} onChange={setFilters} />
        </Sheet>
      ) : null}
      {sheet === 'lens' ? <LensSheet lenses={lensList} current={lens} onClose={() => setSheet(undefined)} onPick={pickLens} /> : null}
      {editShot ? (
        <ShotEdit shot={editShot} like={dial} lenses={lensList.length ? lensList : [lens]} current={lens} iso={iso}
          onClose={() => setEditing(undefined)}
          onSave={(s) => { save(shots.map((x) => (x.pos === s.pos ? { ...s, edited: true } : x))); setEditing(undefined); show(`${s.pos}번을 고쳤어요`) }}
          onDelete={() => { save(shots.filter((x) => x.pos !== editShot.pos)); setEditing(undefined); show(`${editShot.pos}번 기록을 지웠어요`) }} />
      ) : null}
    </View>
  )
}

function Pill({ children, on, onPress }: { children: React.ReactNode; on?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ height: 36, paddingHorizontal: 12, borderRadius: 18, borderWidth: on ? 0 : 1, borderColor: LINE,
      backgroundColor: on ? '#9ec9ff' : PANEL, flexDirection: 'row', alignItems: 'center', gap: 4 }}>{children}</Pressable>
  )
}

const FilterIcon = ({ color }: { color: string }) => (
  <Svg width={17} height={17} viewBox="0 0 24 24"><Circle cx={12} cy={12} r={8.5} fill="none" stroke={color} strokeWidth={2} />
    <Path d="M6.5 9.5h11M5.5 13h13M7 16.5h10" stroke={color} strokeWidth={1.6} strokeLinecap="round" opacity={0.7} /></Svg>
)

// ───────── 다이얼

/** 셔터 · (위에 작게) 노출 보정 · 조리개(⚡). 그 카메라에서 의미 없는 다이얼은 흐리게 막는다 */
function RecordDials({ dial, onChange, onLocked, iso }: { dial: Dial; onChange: (d: Dial) => void; onLocked: (t: string) => void; iso: number }) {
  const program = dialOf.program(dial), flash = dialOf.flash(dial)
  const sh = dialOf.shutter(dial), ap = dialOf.aperture(dial)
  const accentS = new Set(dial.stops.map((v, i) => (v <= 0 ? i : -1)).filter((i) => i >= 0))
  // 보정하면: 실제로 맞춘 감도와 더 밝게/더 어둡게
  const comp = dial.fullAuto ? 0 : COMPS[dial.c]
  const compNote = comp ? `ISO ${ISOS[nearest(ISOS, iso / Math.pow(2, comp))]}\n${comp > 0 ? '더 밝게' : '더 어둡게'}` : undefined
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <TopDial low title="셔터" labels={dial.stops.map(dialS)} index={dial.s} onChange={(s) => onChange({ ...dial, s })} size={132}
        big={program ? 'P 자동' : sh != null ? formatShutter(sh) : '자동'} accent={accentS} bigSize={24}
        disabled={dial.stops.length < 2} onLocked={() => onLocked(dial.fullAuto ? '이 카메라는 셔터·조리개를 자동으로 정해요' : '이 카메라는 셔터를 자동으로 정해요')} />
      <TopDial title={compNote ?? '노출 보정'} titleOn={!!compNote} labels={COMPS.map((c) => (c === 0 ? '0' : Number.isInteger(c) ? formatComp(c) : '·'))} index={dial.c}
        onChange={(c) => onChange({ ...dial, c })} size={88} big={dial.fullAuto || COMPS[dial.c] === 0 ? '±0' : formatComp(COMPS[dial.c])}
        accent={new Set([6])} bigSize={18} disabled={dial.fullAuto} onLocked={() => onLocked('이 카메라는 노출 보정이 없어요')} />
      <TopDial low title="조리개" labels={dialOf.apLabels(dial)} index={dial.a} onChange={(a) => onChange({ ...dial, a })} size={132}
        big={flash ? '플래시' : program ? 'P 자동' : ap != null ? formatAperture(ap) : '자동'}
        accent={new Set([0, dialOf.flashIndex(dial)])} bigSize={24}
        disabled={program} onLocked={() => onLocked('P 모드에서는 조리개도 카메라가 정해요')} />
    </View>
  )
}

/** 카메라 윗면에서 본 다이얼: 값이 방사형으로 적히고 오른쪽 표시에 맞춘 값이 고른 값.
 *  원을 그리며 끌면 반 바퀴를 넘어가도 같은 방향으로 계속 돈다 */
function TopDial({ title, labels, index, onChange, size, big, accent, bigSize, disabled, onLocked, low, titleOn }: {
  title: string; labels: string[]; index: number; onChange: (i: number) => void; size: number; big: string
  accent: Set<number>; bigSize: number; disabled?: boolean; onLocked?: () => void; low?: boolean; titleOn?: boolean
}) {
  const c = size / 2, R = c - (size < 100 ? 20 : 24)
  const step = labels.includes('·') ? 20 : Math.max((15.5 / R) * (180 / Math.PI), Math.min(30, 300 / Math.max(labels.length - 1, 1)))
  const rot = useTween(-index * step)
  const ref = useRef<View>(null)
  const st = useRef({ cx: 0, cy: 0, last: 0, turned: 0, start: 0, ready: false, moved: false })
  const live = useRef({ index, onChange, labels, step, disabled, onLocked, accent })
  live.current = { index, onChange, labels, step, disabled, onLocked, accent }
  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (e) => {
      const s = st.current
      s.ready = false; s.moved = false; s.turned = 0; s.start = live.current.index
      const { pageX, pageY } = e.nativeEvent
      ref.current?.measure((_x, _y, w, h, px, py) => {
        s.cx = px + w / 2; s.cy = py + h / 2
        s.last = Math.atan2(pageY - s.cy, pageX - s.cx) * 180 / Math.PI
        s.ready = true
      })
    },
    onPanResponderMove: (e) => {
      const s = st.current, L = live.current
      if (!s.ready || L.disabled) return
      const dx = e.nativeEvent.pageX - s.cx, dy = e.nativeEvent.pageY - s.cy
      if (dx * dx + dy * dy < 64) return
      const angle = Math.atan2(dy, dx) * 180 / Math.PI
      let d = angle - s.last
      if (d > 180) d -= 360; else if (d < -180) d += 360
      s.turned += d; s.last = angle
      if (Math.abs(s.turned) > 4) s.moved = true
      // 시계 방향으로 끌면 다이얼도 시계 방향 (앞 칸이 표시로 온다)
      const next = Math.min(Math.max(s.start - Math.round(s.turned / L.step), 0), L.labels.length - 1)
      if (next !== L.index) { L.onChange(next); buzz(L.accent.has(next) ? 15 : 4) }
    },
    onPanResponderRelease: () => { const L = live.current; if (L.disabled && !st.current.moved) L.onLocked?.() },
  }), [])
  const knurl = useMemo(() => Array.from({ length: 120 }, (_, i) => {
    const a = (i / 120) * Math.PI * 2
    return <Line key={i} x1={c + Math.cos(a) * (c - 7)} y1={c + Math.sin(a) * (c - 7)} x2={c + Math.cos(a) * c} y2={c + Math.sin(a) * c}
      stroke={i % 2 ? '#2e2e30' : '#737373'} strokeWidth={1.4} />
  }), [c])
  return (
    <View style={{ width: size, alignItems: 'center', marginTop: low ? 56 : 0 }}>
      <View ref={ref} {...pan.panHandlers} style={{ width: size, height: size, opacity: disabled ? 0.32 : 1 }}>
        <Svg width={size} height={size}>
          <Defs>
            <RadialGradient id="face" cx="50%" cy="50%" r="50%"><Stop offset="0" stopColor="#3d3d3d" /><Stop offset="1" stopColor="#1a1a1a" /></RadialGradient>
            <LinearGradient id="hub" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#6b6b6b" /><Stop offset="1" stopColor="#292929" /></LinearGradient>
          </Defs>
          <Circle cx={c} cy={c} r={c} fill="url(#face)" />
          {knurl}
          <Circle cx={c} cy={c} r={c - 8} fill="none" stroke="#4d4d4d" strokeWidth={1} />
          <G rotation={rot} origin={`${c}, ${c}`}>
            {labels.map((l, i) => (
              <G key={i} rotation={i * step} origin={`${c}, ${c}`}>
                <SvgText x={c + R} y={c + (l === '·' ? 5 : 4)} textAnchor="middle"
                  fontSize={l === '·' ? 16 : size < 120 ? 11 : l.length > 3 ? 11 : 13} fontWeight={i === index ? '800' : '600'}
                  fill={accent.has(i) ? ORANGE : '#fff'} opacity={i === index ? 1 : 0.62}>{l}</SvgText>
              </G>
            ))}
          </G>
          <Circle cx={c} cy={c} r={size * 0.1} fill="url(#hub)" />
        </Svg>
        {/* 맞춤 표시 (오른쪽, 고정) */}
        <View style={{ position: 'absolute', right: -13, top: c - 6, width: 0, height: 0, borderTopWidth: 6, borderBottomWidth: 6, borderRightWidth: 9,
          borderTopColor: 'transparent', borderBottomColor: 'transparent', borderRightColor: ORANGE }} />
      </View>
      <Text numberOfLines={1} style={{ marginTop: 4, color: disabled || (index === 0 && accent.has(0)) ? SUB : '#fff', fontSize: bigSize, fontWeight: '600', fontVariant: ['tabular-nums'] }}>{big}</Text>
      <Text style={{ color: titleOn ? '#dbdbdb' : SUB, fontSize: 12, fontWeight: '600', textAlign: 'center', lineHeight: 15 }}>{title}</Text>
    </View>
  )
}

function PlaceTimeCard({ place, time, onPlace, onTime }: { place: string; time: string; onPlace: () => void; onTime: () => void }) {
  return (
    <View style={{ marginTop: 18, backgroundColor: PANEL, borderWidth: 1, borderColor: LINE, borderRadius: 16, paddingHorizontal: 14 }}>
      <DarkLine k="장소" v={place} onPress={onPlace} />
      <View style={{ height: 1, backgroundColor: LINE }} />
      <DarkLine k="시간" v={time} onPress={onTime} />
    </View>
  )
}

function DarkLine({ k, v, onPress, chev = true }: { k: string; v: string; onPress: () => void; chev?: boolean }) {
  return (
    <Pressable onPress={onPress} style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Text style={{ color: SUB, fontSize: 15 }}>{k}</Text>
      <Text numberOfLines={1} style={{ flex: 1, textAlign: 'right', color: '#fff', fontSize: 15 }}>{v}</Text>
      {chev ? <Text style={{ color: SUB, fontSize: 15 }}>›</Text> : null}
    </Pressable>
  )
}

function TimeSheet({ time, onChange, onNow, onDone }: { time: number; onChange: (t: number) => void; onNow: () => void; onDone: () => void }) {
  return (
    <Sheet title="촬영 시간" onClose={onDone} right={<SheetBtn label="완료" accent onPress={onDone} />}>
      <Group>
        <Row static><RowText>촬영 시간</RowText><DateInput value={time} onChange={onChange} time /></Row>
        <Row accent onPress={onNow}><RowText>지금으로</RowText></Row>
      </Group>
    </Sheet>
  )
}

function FilterChips({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  return (
    <Chips>
      <Chip label="없음" active={!value.length} onPress={() => onChange([])} />
      {FILTERS.map((id) => <Chip key={id} label={id} active={value.includes(id)} onPress={() => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id])} />)}
    </Chips>
  )
}

function LensSheet({ lenses, current, onPick, onClose }: { lenses: Lens[]; current: Lens; onPick: (l: Lens) => void; onClose: () => void }) {
  return (
    <Sheet title="렌즈" onClose={onClose} right={<SheetBtn label="완료" accent onPress={onClose} />}>
      <Group>
        {lenses.map((l) => (
          <Row key={l.id} onPress={() => onPick(l)} value={l.id === current.id ? '끼움' : undefined}>
            <RowText sub={`${l.max > l.min ? `${l.min}–${l.max}mm` : `${l.min}mm`} f/${trim(l.open)}`}>{l.name}</RowText>
          </Row>
        ))}
      </Group>
    </Sheet>
  )
}

// ───────── 셔터 줄 (되감기 노브 · 카운터(왼쪽 플래시 칸) · 셔터+레버, 360×162 좌표)
function Controls({ counter, flash, leverOut, rewind, down, onFlash, onShutter }: {
  counter: string; flash: boolean; leverOut: boolean; rewind: number; down: boolean; onFlash: () => void; onShutter: () => void
}) {
  const { width } = useWindowDimensions()
  const W = Math.min(width - 32, 318), s = W / 360, H = W * 162 / 360
  const lever = useTween(leverOut ? -105 : -14, 340)
  const knob = useTween(rewind, 600)
  return (
    <View style={{ width: W, height: H, alignSelf: 'center', marginBottom: -W * 58 / 360 + 30, zIndex: 2 }}>
      <Svg width={W} height={H} viewBox="0 0 360 162">
        <Defs>
          <RadialGradient id="chrome" cx="38%" cy="35%" r="80%"><Stop offset="0" stopColor="#fafafa" /><Stop offset="0.6" stopColor="#a5a5a8" /><Stop offset="1" stopColor="#5d5d60" /></RadialGradient>
          <LinearGradient id="leverBlack" x1="0" x2="0" y1="0" y2="1"><Stop offset="0" stopColor="#2a2a2d" /><Stop offset="0.6" stopColor="#18181a" /><Stop offset="1" stopColor="#0f0f10" /></LinearGradient>
          <RadialGradient id="orangeMatte" cx="45%" cy="40%" r="70%"><Stop offset="0" stopColor="#ff7a35" /><Stop offset="0.7" stopColor="#f2621f" /><Stop offset="1" stopColor="#d9531a" /></RadialGradient>
        </Defs>
        <G x={-30}>
          <G rotation={knob} origin="70, 52">
            <Circle cx={70} cy={52} r={30} fill="url(#chrome)" />
            <Circle cx={70} cy={52} r={25} fill="#1d1d1f" />
            <Circle cx={70} cy={52} r={22} fill="none" stroke="#2c2c30" strokeWidth={1} strokeDasharray="2 2.5" />
            <Rect x={52} y={47} width={36} height={10} rx={5} fill="#2f2f33" stroke="#444" strokeWidth={0.8} />
            <Circle cx={84} cy={52} r={4.5} fill="#4a4a4e" />
            <Circle cx={70} cy={52} r={3} fill="#555" />
          </G>
        </G>
        <Rect x={110} y={19} width={140} height={66} rx={15} fill="#151517" stroke="#2c2c30" />
        <Rect x={114} y={23} width={42} height={58} rx={11} fill={flash ? '#ffd23f' : '#232326'} />
        <Path d="M137.6 31 l-8.6 11.6 h5.8 l-1.7 9.4 l9-12.3 h-6 z" fill={flash ? '#1a1300' : '#8d8a85'} />
        <SvgText x={135} y={69} textAnchor="middle" fontSize={10} fontWeight="700" fill={flash ? '#1a1300' : '#8d8a85'}>{flash ? '켬' : '끔'}</SvgText>
        <SvgText x={203} y={64} textAnchor="middle" fontSize={32} fontWeight="700" fill="#fff">{counter}</SvgText>
        <G x={30}>
          <G rotation={lever} origin="290, 52">
            <Path d="M 290 18 A 34 34 0 1 1 278.4 84 C 266 92 250 98 236 98 H 202 A 10 10 0 0 1 202 78 H 230 C 244 78 254 70 258.5 64.7 A 34 34 0 0 1 290 18 Z" fill="url(#leverBlack)" stroke="#3d3d42" strokeWidth={0.8} />
            <Path d="M 290 18.6 A 33.4 33.4 0 0 1 322 44" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth={1.2} strokeLinecap="round" />
            <G stroke="#47474d" strokeWidth={1.5} strokeLinecap="round">
              <Path d="M197 82.5H226" /><Path d="M195 86.5H228" /><Path d="M195 90.5H228" /><Path d="M197 94.5H226" />
            </G>
          </G>
          <Circle cx={290} cy={52} r={26.5} fill="url(#chrome)" />
          <Circle cx={290} cy={52} r={23.2} fill="#2a2a2c" />
          <Circle cx={290} cy={52} r={down ? 19.7 : 22.4} fill="url(#orangeMatte)" opacity={down ? 0.8 : 1} />
        </G>
      </Svg>
      {/* 누르는 자리: 플래시 칸 · 셔터 */}
      <Pressable accessibilityLabel="플래시" onPress={onFlash} style={{ position: 'absolute', left: 114 * s, top: 23 * s, width: 42 * s, height: 58 * s }} />
      <Pressable accessibilityLabel="셔터" onPressIn={onShutter} style={{ position: 'absolute', left: (320 - 34) * s, top: (52 - 34) * s, width: 68 * s, height: 68 * s, borderRadius: 34 * s }} />
    </View>
  )
}

/** 필름 한 칸 (위아래 구멍, 칸 번호, 찍은 값) */
function Cell({ p, shot, next, onPress }: { p: number; shot?: MeterShot; next: boolean; onPress: () => void }) {
  const holes = useMemo(() => Array.from({ length: 6 }, (_, i) => 6 + i * 17.33).filter((x) => x < 104), [])
  const extra = shot ? [shot.focal ? `${shot.focal}mm` : '', shot.comp ? formatComp(shot.comp) : ''].filter(Boolean).join(' · ') : ''
  return (
    <Pressable onPress={onPress} style={{ width: 104, height: 112, backgroundColor: '#2a1a0f' }}>
      <Svg width={104} height={112} style={{ position: 'absolute' }}>
        {holes.map((x) => <Rect key={`t${x}`} x={x} y={4} width={7} height={8} fill="#000" />)}
        {holes.map((x) => <Rect key={`b${x}`} x={x} y={100} width={7} height={8} fill="#000" />)}
      </Svg>
      <Text style={{ position: 'absolute', top: 13, left: 8, fontSize: 9, fontWeight: '700', color: '#f3a256', opacity: 0.85 }}>▸{p}  {p}A</Text>
      {shot?.flash ? <Text style={{ position: 'absolute', right: 5, top: 1, fontSize: 10, color: '#ffd23f' }}>⚡</Text> : null}
      <View style={{ position: 'absolute', left: 6, right: 6, top: 26, height: 60, borderRadius: 4, backgroundColor: shot ? '#3a2414' : '#1a100a',
        borderWidth: 1.5, borderStyle: next ? 'dashed' : 'solid', borderColor: next ? 'rgba(255,255,255,0.55)' : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
        {shot ? (
          <>
            {shot.aperture != null ? <Text style={{ color: '#f6e6d4', fontSize: 17, fontWeight: '800' }}>{formatAperture(shot.aperture)}</Text> : null}
            {shot.shutter != null ? <Text style={{ color: '#f6e6d4', fontSize: shot.aperture != null ? 13 : 17, fontWeight: shot.aperture != null ? '700' : '800', opacity: shot.aperture != null ? 0.85 : 1 }}>{formatShutter(shot.shutter)}</Text> : null}
            {shot.aperture == null && shot.shutter == null ? <Text style={{ color: '#f6e6d4', fontSize: 13, fontWeight: '800', opacity: 0.5, letterSpacing: 1 }}>AUTO</Text> : null}
            {extra ? <Text style={{ color: '#f3a256', fontSize: 11, fontWeight: '800' }}>{extra}</Text> : null}
          </>
        ) : next ? <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: '700' }}>다음</Text> : null}
      </View>
    </Pressable>
  )
}

/** 화면 왼쪽 끝에 걸친 135 필름통 */
function Canister({ iso, frames, body, band }: { iso: number; frames: number; body?: string; band?: string }) {
  const lum = (h?: string) => { const n = parseInt(String(h ?? '#888').replace('#', ''), 16); return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255 }
  const label = body ?? '#f0b43a', numColor = body && lum(body) < 0.25 ? band ?? label : label
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: -18, top: -10, width: 80, height: 132, opacity: 0.85 }}>
      <Svg width={80} height={132} viewBox="0 0 80 132">
        <Defs>
          <LinearGradient id="cap" x1="0" x2="1" y1="0" y2="0"><Stop offset="0" stopColor="#050505" /><Stop offset="0.55" stopColor="#262628" /><Stop offset="0.78" stopColor="#3a3a3d" /><Stop offset="1" stopColor="#0b0b0c" /></LinearGradient>
          <LinearGradient id="vig" x1="0" x2="1" y1="0" y2="0"><Stop offset="0.22" stopColor="#000" stopOpacity={0.7} /><Stop offset="0.62" stopColor="#000" stopOpacity={0} /></LinearGradient>
        </Defs>
        <Rect x={2} y={9} width={64} height={114} fill="#0b0b0c" />
        <Rect x={2} y={11} width={33} height={110} fill={label} />
        <G rotation={-90} origin="62, 117"><SvgText x={62} y={117} fontSize={22} fontWeight="700" fill={numColor}>{iso}</SvgText></G>
        <G rotation={-90} origin="62, 71"><SvgText x={62} y={71} fontSize={22} fontWeight="700" fill={numColor}>{frames}<TSpan fontSize={11}>exp.</TSpan></SvgText></G>
        <Path d="M63 8 C67 7.5 70 9 71.5 12 C70.5 15 72.5 18 71.8 22 L72.2 110 C73 114 71 117 71.8 121 C70 124.5 67 124.8 63 124 Z" fill="#232221" stroke="#55524e" strokeWidth={0.6} />
        <Rect x={0} y={3} width={66} height={9} rx={3.5} fill="url(#cap)" />
        <Rect x={0} y={120} width={66} height={9} rx={3.5} fill="url(#cap)" />
        <Rect x={16} y={128} width={16} height={4} fill="#0a0a0a" />
        <Rect x={0} y={0} width={80} height={132} fill="url(#vig)" />
      </Svg>
    </View>
  )
}

// ───────── 컷 고치기 (메인과 같은 다이얼 배치, 그 컷 값으로 맞춰서 연다)
function ShotEdit({ shot, like, lenses, current, iso, onClose, onSave, onDelete }: {
  shot: MeterShot; like: Dial; lenses: Lens[]; current: Lens; iso: number; onClose: () => void; onSave: (s: MeterShot) => void; onDelete: () => void
}) {
  const insets = useSafeAreaInsets()
  const [lens, setLens] = useState<Lens>(() => lenses.find((l) => l.id === shot.lensId) ?? current)
  const [dial, setDial] = useState<Dial>(() => dialOf.fromShot(shot, like, apertures(lens.open, lens.close)))
  const [filters, setFilters] = useState<string[]>(shot.filters ?? [])
  const [placeName, setPlaceName] = useState(shot.place ?? '')
  const [point, setPoint] = useState<GeoPoint | undefined>(shot.lat != null && shot.lon != null ? { latitude: shot.lat, longitude: shot.lon } : undefined)
  const [time, setTime] = useState(() => (shot.at ? new Date(shot.at).getTime() : Date.now()))
  const [memo, setMemo] = useState(shot.memo ?? '')
  const [sheet, setSheet] = useState<'place' | 'time' | 'filter' | 'lens'>()
  const [ask, setAsk] = useState(false)
  const [note, setNote] = useState<string>()
  const save = () => {
    const changed = lens.id !== shot.lensId
    onSave({
      ...shot, mode: dialOf.mode(dial), aperture: dialOf.aperture(dial), shutter: dialOf.shutter(dial), flash: dialOf.flash(dial), comp: dialOf.comp(dial),
      filters: filters.length ? filters : undefined, place: placeName || undefined, lat: point?.latitude, lon: point?.longitude,
      at: new Date(time).toISOString(), memo: memo || undefined,
      ...(changed ? { lensId: lens.id, focal: lens.max > lens.min ? null : lens.min } : {}),
    })
  }
  return (
    <Modal visible animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: '#000', paddingTop: insets.top + 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 8 }}>
          <Pressable onPress={onClose} style={{ backgroundColor: PANEL, height: 36, paddingHorizontal: 16, borderRadius: 18, justifyContent: 'center' }}><Text style={{ color: ORANGE, fontSize: 16 }}>취소</Text></Pressable>
          <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700' }}>{shot.pos}번 컷</Text>
          <Pressable onPress={save} style={{ backgroundColor: PANEL, height: 36, paddingHorizontal: 16, borderRadius: 18, justifyContent: 'center' }}><Text style={{ color: ORANGE, fontSize: 16, fontWeight: '700' }}>저장</Text></Pressable>
        </View>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24, gap: 12 }} keyboardShouldPersistTaps="handled">
          <RecordDials dial={dial} onChange={setDial} onLocked={setNote} iso={iso} />
          {note ? <Text style={{ color: SUB, fontSize: 13, textAlign: 'center' }}>{note}</Text> : null}
          <PlaceTimeCard place={placeName || '없음'} time={new Date(time).toLocaleString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            onPlace={() => setSheet('place')} onTime={() => setSheet('time')} />
          <View style={{ backgroundColor: PANEL, borderWidth: 1, borderColor: LINE, borderRadius: 16, paddingHorizontal: 14 }}>
            <DarkLine k="렌즈" v={lens.name} chev={!lens.fixed && lenses.length > 1} onPress={() => { if (!lens.fixed && lenses.length > 1) setSheet('lens') }} />
            <View style={{ height: 1, backgroundColor: LINE }} />
            <DarkLine k="필터" v={filters.length ? filters.join('+') : '없음'} onPress={() => setSheet('filter')} />
          </View>
          <TextInput value={memo} onChangeText={setMemo} placeholder="메모" placeholderTextColor={SUB} multiline
            style={{ minHeight: 60, borderRadius: 16, borderWidth: 1, borderColor: LINE, backgroundColor: PANEL, color: '#fff', padding: 14, fontSize: 15, textAlignVertical: 'top' }} />
          <Pressable onPress={() => setAsk(true)} style={{ padding: 10, alignItems: 'center' }}><Text style={{ color: '#ff453a', fontSize: 16 }}>이 칸 기록 지우기</Text></Pressable>
        </ScrollView>
        {sheet === 'place' ? (
          <Sheet title="장소" onClose={() => setSheet(undefined)} right={<SheetBtn label="완료" accent onPress={() => setSheet(undefined)} />}>
            <PlacePicker name={placeName} point={point} onChange={(n, p) => { setPlaceName(n); setPoint(p) }} />
          </Sheet>
        ) : null}
        {sheet === 'time' ? <TimeSheet time={time} onChange={setTime} onNow={() => { setTime(Date.now()); setSheet(undefined) }} onDone={() => setSheet(undefined)} /> : null}
        {sheet === 'filter' ? (
          <Sheet title="필터" onClose={() => setSheet(undefined)} right={<SheetBtn label="완료" accent onPress={() => setSheet(undefined)} />}>
            <FilterChips value={filters} onChange={setFilters} />
          </Sheet>
        ) : null}
        {sheet === 'lens' ? (
          <LensSheet lenses={lenses} current={lens} onClose={() => setSheet(undefined)} onPick={(l) => {
            setLens(l)
            setDial((d) => { const keep = dialOf.aperture(d), aps = apertures(l.open, l.close); return { ...d, aps, a: dialOf.flash(d) ? aps.length + 1 : keep != null ? 1 + nearest(aps, keep) : 0 } })
            setSheet(undefined)
          }} />
        ) : null}
        {ask ? <Confirm message="이 칸 기록을 지울까요?" action="지우기" onCancel={() => setAsk(false)} onConfirm={onDelete} /> : null}
      </View>
    </Modal>
  )
}
