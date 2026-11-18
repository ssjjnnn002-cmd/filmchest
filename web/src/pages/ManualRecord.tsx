import { boxPalette } from '../core/filmBox'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { framesPerRoll, lensIdAt, type GeoPoint, type MeterShot, type Roll } from '../core/types'
import { filmDisplayName } from '../core/films'
import { catalogMatch } from '../core/cameras'
import { exposureText, formatAperture, formatComp, formatShutter, meterFrameTitle, shotRowMeta } from '../core/meter'
import { cameraName, rollCameraFormat, rollFilm, Confirm, Sheet, Canister as UiCanister } from '../ui/common'
import { currentPlace } from '../platform'
import { PlacePicker } from './Editors'
import { fixedLens, meterLens } from './Meter'

// 상세 기록 (노출계 없이): 카메라 윗면 다이얼로 셔터 · 노출 보정 · 조리개(맨 끝 ⚡)를 맞추고,
// 셔터를 누르면 레버가 감기며 그 칸에 장소·시간과 함께 남는다. 다이얼 값은 이 카메라·렌즈가 지원하는 것만.
// 아이폰 ManualRecordView와 같은 배치·규칙. 기록은 노출계와 같은 meterShots로 롤에 저장한다

type Lens = { id: string; name: string; min: number; max: number; open: number; close: number; fixed?: boolean }

const STANDARD = [1 / 8000, 1 / 4000, 1 / 2000, 1 / 1000, 1 / 500, 1 / 250, 1 / 125, 1 / 60, 1 / 30, 1 / 15, 1 / 8, 1 / 4, 1 / 2, 1, 2, 4, 8, 15, 30]
const COMPS = Array.from({ length: 13 }, (_, i) => (i - 6) / 3)
const FILTERS: [string, number][] = [['UV', 0], ['노랑', 1], ['주황', 2], ['빨강', 3], ['녹색', 2], ['편광', 1.5], ['ND2', 1], ['ND4', 2], ['ND8', 3],
  ['ND16', 4], ['ND64', 6], ['ND1000', 10], ['80A 블루', 2], ['85B 앰버', 0.67]]
// 셔터 자리 값: P = -2, A = 0, B = -1, 그 밖은 초
const P = -2, A = 0, B = -1
const nearest = (list: number[], v: number) => list.reduce((b, x, i) => (Math.abs(Math.log2(x / v)) < Math.abs(Math.log2(list[b] / v)) ? i : b), 0)
const dialS = (t: number) => (t === P ? 'P' : t === A ? 'A' : t === B ? 'B' : t >= 1 ? `${t}"` : String(Math.round(1 / t)))
const trim = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1))
const pad = (n: number) => String(n).padStart(2, '0')
const localInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
const buzz = (ms: number) => { try { navigator.vibrate?.(ms) } catch { /* 진동 없음 */ } }

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
/** comps: 이 카메라에서 고를 수 있는 노출 보정 값 (catalog/comps.mjs) */
interface Dial { stops: number[]; aps: number[]; s: number; a: number; c: number; fullAuto: boolean; lastA: number; comps: number[] }
const dialOf = {
  /** 셔터 자리: P 모드가 있으면 맨 앞 P, 셔터를 고를 수 있으면 A · 값 · B, 조리개 우선 자동은 A만, 완전 자동은 P만 */
  stops: (sp: number[], manual: boolean, program: boolean) => (!manual ? [program ? P : A] : [...(program ? [P] : []), A, ...sp, B]),
  program: (d: Dial) => d.stops[d.s] === P,
  flashIndex: (d: Dial) => (d.fullAuto ? 1 : d.aps.length + 1),
  flash: (d: Dial) => d.a === dialOf.flashIndex(d),
  shutter: (d: Dial) => { const v = d.stops[d.s]; return v === P || v === A || v === undefined ? null : v },
  aperture: (d: Dial) => (dialOf.program(d) || d.fullAuto || d.a === 0 || dialOf.flash(d) || d.a > d.aps.length ? null : d.aps[d.a - 1]),
  comp: (d: Dial) => (d.comps.length > 1 ? d.comps[d.c] ?? 0 : 0),
  mode: (d: Dial): MeterShot['mode'] => {
    if (dialOf.program(d)) return 'P'
    const a = dialOf.aperture(d), s = dialOf.shutter(d)
    return a != null && s != null ? 'M' : a != null ? 'A' : s != null ? 'S' : 'P'
  },
  apLabels: (d: Dial) => (d.fullAuto ? ['A', '⚡'] : ['A', ...d.aps.map(trim), '⚡']),
  /** 기록된 컷 값으로 다이얼을 맞춘다 */
  fromShot: (shot: MeterShot, like: Dial, aps: number[]): Dial => {
    const st = like.stops, sp = st.map((v, i) => [v, i]).filter(([v]) => v > 0)
    let s = st.indexOf(A) >= 0 ? st.indexOf(A) : 0
    if (shot.shutter != null && shot.shutter < 0 && st.includes(B)) s = st.indexOf(B)
    else if (shot.shutter != null && shot.shutter > 0 && sp.length) s = sp[nearest(sp.map(([v]) => v), shot.shutter)][1]
    else if (shot.mode === 'P' && st.includes(P)) s = st.indexOf(P)
    const ap = like.fullAuto || shot.aperture == null ? 0 : 1 + nearest(aps, shot.aperture)
    const cs = like.comps
    const c = cs.reduce((b, x, i) => (Math.abs(x - shot.comp) < Math.abs(cs[b] - shot.comp) ? i : b), 0)
    return { stops: st, aps, s, a: shot.flash ? (like.fullAuto ? 1 : aps.length + 1) : ap, c, fullAuto: like.fullAuto, lastA: ap, comps: cs }
  },
}

// ───────── 소리 (노출계와 같은 잡음 딸깍)
let ac: AudioContext | null = null
const audio = () => { ac ||= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)(); if (ac.state === 'suspended') void ac.resume(); return ac }
function noise(at: number, dur: number, freq: number, gain: number) {
  const a = audio(), len = Math.ceil(a.sampleRate * dur)
  const buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3)
  const src = a.createBufferSource(); src.buffer = buf
  const f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 1.4
  const g = a.createGain(); g.gain.value = gain
  src.connect(f).connect(g).connect(a.destination); src.start(a.currentTime + at)
}
const sound = (fn: () => void) => { try { fn() } catch { /* 소리 없음 */ } }
const shutterSound = (t: number) => { const gap = Math.min(Math.max(t, 0.012), 8); noise(0.01, 0.028, 2600, 1.6); noise(0.012, 0.05, 900, 0.7); noise(0.01 + gap, 0.03, 2100, 1.5); noise(0.012 + gap, 0.06, 700, 0.8) }
const ratchetSound = () => { for (let i = 0; i < 7; i++) noise(i * 0.045, 0.012, 5200, 0.35) }

export function ManualRecord({ roll, onClose }: { roll: Roll; onClose: () => void }) {
  const camera = useLiveQuery(() => (roll.cameraId ? db.cameras.get(roll.cameraId) : undefined), [roll.cameraId])
  const allLenses = useLiveQuery(() => db.lenses.toArray(), [])
  if (camera === undefined && roll.cameraId) return null
  if (!allLenses) return null
  return <Recorder roll={roll} camera={camera ?? undefined} allLenses={allLenses} onClose={onClose} />
}

type Cam = { brand: string; model: string; mount?: string; fixedLens?: string; style: string }
type GearLens = Parameters<typeof meterLens>[0]

/** 이 롤의 카메라·렌즈로 정하는 다이얼 자리 (기록 화면과 컷 고치기가 같이 쓴다) */
function setupOf(roll: Roll, camera: Cam | undefined, allLenses: GearLens[]) {
  const film = rollFilm(roll)
  const frames = framesPerRoll[rollCameraFormat(camera as never, roll)] ?? 36
  const iso = roll.shotISO ?? film?.iso ?? 400
  // 렌즈: 고정형이면 이름에서, 아니면 같은 마운트 렌즈 (아이폰과 같음)
  const fixedName = camera?.fixedLens ?? roll.cameraFixedLens
  const mount = camera?.mount ?? allLenses.find((l) => l.id === roll.lensId)?.mount
  const lensList: Lens[] = fixedName ? [] : allLenses.filter((l) => l.mount && l.mount === mount).map(meterLens)
  const lensById = (id?: string): Lens | undefined => {
    if (fixedName) return fixedLens(fixedName)
    const l = allLenses.find((x) => x.id === id)
    return l ? meterLens(l) : undefined
  }
  // 셔터 범위·P 모드: 카메라 목록(catalog/shutters.mjs). 모르면 똑딱이는 완전 자동, 그 밖은 1/1000–1초
  const known = camera ? catalogMatch(camera.brand, camera.model) : undefined
  const range = known?.shutter ?? (camera?.style === 'compact' ? [] : [1000, 1])
  const manual = range.length === 2
  const program = known ? !!known.program : camera?.style === 'compact'
  const baseDial = (lens: Lens): Dial => {
    const aps = apertures(lens.open, lens.close)
    const fullAuto = !manual && program
    const stops = dialOf.stops(manual ? speeds(range[0], range[1]) : [], manual, program)
    const sp = stops.map((v, i) => [v, i]).filter(([v]) => v > 0)
    // 노출 보정: 이 카메라에 있는 값만 (XA는 역광 +1.5 하나, 기계식은 없음)
    const comps = known?.comp ? (known.comp.length ? known.comp : [0]) : fullAuto ? [0] : COMPS
    return { stops, aps, s: manual && sp.length ? sp[nearest(sp.map(([v]) => v), 1 / 125)][1] : 0,
      a: fullAuto ? 0 : 1 + nearest(aps, 8), c: Math.max(0, comps.indexOf(0)), fullAuto, lastA: 0, comps }
  }
  return { film, frames, iso, lensList, lensById, baseDial }
}
const GENERIC: Lens = { id: 'generic', name: '렌즈', min: 50, max: 50, open: 1.4, close: 22 }

function Recorder({ roll, camera, allLenses, onClose }: {
  roll: Roll; camera?: Cam; allLenses: GearLens[]; onClose: () => void
}) {
  const setup = useMemo(() => setupOf(roll, camera, allLenses), [roll.id, camera, allLenses])
  const { film, frames, iso, lensList } = setup
  const [shots, setShots] = useState<MeterShot[]>(() => [...(roll.meterShots ?? [])].sort((a, b) => a.pos - b.pos))
  // 이어서: 마지막에 찍은 컷의 렌즈·필터·다이얼 값에서 다시 시작
  const last = useMemo(() => [...(roll.meterShots ?? [])].sort((a, b) => b.order - a.order)[0], [])
  const [lens, setLens] = useState<Lens>(() =>
    (last?.lensId ? setup.lensById(last.lensId) : undefined) ?? setup.lensById(lensIdAt(roll, shots.length + 1) ?? roll.lensId) ?? GENERIC)
  const [dial, setDial] = useState<Dial>(() => {
    const base = setup.baseDial(lens)
    return last ? dialOf.fromShot(last, base, base.aps) : base
  })
  const [filters, setFilters] = useState<string[]>(() => last?.filters ?? [])
  // 카메라 ISO: 필름 감도(box)와 다르게 맞추면 오버·언더로 컷마다 기록
  const box = film?.iso ?? iso
  const [camIso, setCamIso] = useState(() => last?.iso ?? iso)
  const [frame, setFrame] = useState(() => Math.max(0, ...(roll.meterShots ?? []).map((s) => s.pos)) + 1)
  const [placeName, setPlaceName] = useState('')
  const [point, setPoint] = useState<GeoPoint>()
  const [locating, setLocating] = useState(true)
  const [useNow, setUseNow] = useState(true)
  const [time, setTime] = useState(() => new Date())
  const [sheet, setSheet] = useState<'place' | 'time' | 'filter' | 'lens' | 'iso' | 'roll'>()
  const [editing, setEditing] = useState<number>()
  const [toast, setToast] = useState<string>()
  const [leverOut, setLeverOut] = useState(false)
  const [down, setDown] = useState(false)
  const [rewind, setRewind] = useState(() => (roll.meterShots?.length ?? 0) * -150)
  const busy = useRef(false)
  const toastTimer = useRef(0)
  const stripRef = useRef<HTMLDivElement>(null)

  const show = (t: string) => { setToast(t); window.clearTimeout(toastTimer.current); toastTimer.current = window.setTimeout(() => setToast(undefined), 2000) }
  const save = (list: MeterShot[]) => { setShots(list); void db.rolls.update(roll.id, { meterShots: list }) }

  // 장소: 마지막 기록 장소를 먼저 쓰고 현재 위치로 바꾼다
  useEffect(() => {
    const last = [...shots].sort((a, b) => b.order - a.order)[0]
    if (last?.place) { setPlaceName(last.place); if (last.lat != null && last.lon != null) setPoint({ latitude: last.lat, longitude: last.lon }) }
    void currentPlace().then((p) => { if (p) { setPlaceName(p.name); setPoint(p.point) } }).finally(() => setLocating(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  // 띄운 동안 뒤 페이지가 같이 스크롤되지 않게
  useEffect(() => {
    const html = document.documentElement.style, body = document.body.style
    const prev = [html.overflow, body.overflow]
    html.overflow = 'hidden'; body.overflow = 'hidden'
    return () => { html.overflow = prev[0]; body.overflow = prev[1] }
  }, [])
  // 다음 칸이 가운데 오게
  const openedAt = useRef(Date.now())
  useEffect(() => {
    const go = (smooth: boolean) => {
      const strip = stripRef.current, el = strip?.querySelector<HTMLElement>(`[data-p="${frame}"]`)
      if (strip && el) strip.scrollTo({ left: el.offsetLeft - (strip.clientWidth - el.clientWidth) / 2, behavior: smooth ? 'smooth' : 'auto' })
    }
    // 처음 열 때는 화면이 다 그려지기 전이라 몇 번 더 맞춘다 (한 번만 하면 맨 왼쪽에 남던 것)
    // 연 직후(0.8초 안)는 처음으로 본다 (개발 모드에서 효과가 두 번 돌아도)
    const first = Date.now() - openedAt.current < 800
    const id = requestAnimationFrame(() => go(!first))
    const later = first ? [150, 450].map((ms) => setTimeout(() => go(false), ms)) : []
    return () => { cancelAnimationFrame(id); later.forEach(clearTimeout) }
  }, [frame, shots.length])

  /** 셔터: 지금 다이얼 값으로 이 칸을 기록하고, 셔터가 닫힌 뒤 레버가 감기며 다음 칸으로 */
  const fire = () => {
    if (busy.current) return
    const sh = dialOf.shutter(dial)
    const t = sh == null ? 1 / 125 : sh < 0 ? 1 : sh // B는 1초, P·A는 1/125로 소리를 낸다
    sound(() => shutterSound(t)); buzz(12)
    setDown(true); window.setTimeout(() => setDown(false), 140)
    const old = shots.find((s) => s.pos === frame)
    const shot: MeterShot = {
      pos: frame, order: old?.order ?? shots.length + 1, mode: dialOf.mode(dial), aperture: dialOf.aperture(dial), shutter: sh,
      comp: dialOf.comp(dial), flash: dialOf.flash(dial), ev: 0, focal: lens.max > lens.min ? null : lens.min,
      at: (useNow ? new Date() : time).toISOString(), edited: false, filters: filters.length ? filters : undefined,
      memo: old?.memo, tags: old?.tags, place: placeName || undefined, lat: point?.latitude, lon: point?.longitude, lensId: lens.id, iso: camIso !== box ? camIso : undefined,
    }
    save([...shots.filter((s) => s.pos !== frame), shot].sort((a, b) => a.pos - b.pos))
    if (old) show(`${frame}번을 새로 기록했어요`)
    if (!useNow) setTime(new Date(time.getTime() + 60000))
    busy.current = true
    const next = frame + 1
    window.setTimeout(() => {
      setLeverOut(true); sound(ratchetSound); buzz(4)
      setRewind((r) => r - 150); setFrame(next)
      window.setTimeout(() => { setLeverOut(false); window.setTimeout(() => { busy.current = false }, 320) }, 360)
    }, Math.max(150, Math.min(t, 8) * 1000 + 140))
  }

  const lo = Math.min(1, ...shots.map((s) => s.pos)), hi = Math.max(frames + 2, frame, ...shots.map((s) => s.pos))
  const cells = Array.from({ length: hi - lo + 1 }, (_, i) => hi - i)
  const editShot = editing != null ? shots.find((s) => s.pos === editing) : undefined
  const zoomOrFocal = (s: MeterShot) => (s.focal ? `${s.focal}mm` : '')

  return createPortal(
    <div className="mr-overlay">
      <div className="mr-head">
        <button className="mr-back" aria-label="닫기" onClick={onClose}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7" /></svg>
        </button>
        <div className="mr-title">
          <b>{cameraName(camera as never, roll)}</b>
          {film && <span>{filmDisplayName(film)} · {frames}컷</span>}
        </div>
        <div className="mr-pills">
          <button className={`mr-pill ${camIso !== box ? 'filt' : ''}`} aria-label="카메라 ISO" onClick={() => setSheet('iso')}>
            <span className="sub">ISO</span> <b>{camIso}</b>{camIso !== box && <b> {formatComp(Math.log2(box / camIso))}</b>}
          </button>
          <button className={`mr-pill ${filters.length ? 'filt' : ''}`} aria-label="필터" onClick={() => setSheet('filter')}>
            <FilterIcon />{filters.length ? <span>{filters.length > 1 ? `${filters[0]}+${filters.length - 1}` : filters[0]}</span> : null}
          </button>
          <button className="mr-pill" onClick={() => {
            if (lens.fixed) show('렌즈 고정형 카메라라 렌즈를 바꿀 수 없어요')
            else if (lensList.length < 2) show('장비 탭에 같은 마운트 렌즈를 등록하면 바꿔 낄 수 있어요')
            else setSheet('lens')
          }}>{lens.max > lens.min ? `${lens.min}–${lens.max}mm` : `${lens.min}mm`}{!lens.fixed && <i className="chev">›</i>}</button>
        </div>
      </div>

      <div className="mr-space" />
      <RecordDials dial={dial} onChange={setDial} onLocked={show} iso={camIso} />

      <PlaceTimeCard place={locating && !placeName ? '현재 위치 찾는 중…' : placeName || '없음'}
        time={useNow ? '기록하는 순간' : time.toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        onPlace={() => setSheet('place')} onTime={() => { if (useNow) setTime(new Date()); setSheet('time') }} />

      <div className="mr-space" />
      <div className="mr-bottom">
        <Controls counter={String(frame)} flash={dialOf.flash(dial)} leverOut={leverOut} rewind={rewind} down={down}
          onFlash={() => { setDial((d) => (dialOf.flash(d) ? { ...d, a: d.lastA } : { ...d, lastA: d.a, a: dialOf.flashIndex(d) })); buzz(15) }}
          onShutter={() => { audio(); fire() }} />
        <div className="mr-stripwrap">
          <div className="mr-strip" ref={stripRef}>
            {/* 필름통까지 이어지는 필름 (칸·번호 없이). 맨 끝에서 마지막 컷이 딱 가운데에 오는 길이 (아이폰과 같음) */}
            <span className="mr-strip-lead" aria-hidden="true" />
            {cells.map((p) => {
              const s = shots.find((x) => x.pos === p)
              return (
                <button key={p} data-p={p} className={`mr-cell ${s ? 'shot' : ''} ${p === frame && !s ? 'next' : ''}`}
                  onClick={() => (s ? setEditing(p) : setFrame(p))}>
                  <i className="num">▸{p}&nbsp;&nbsp;{p}A</i>
                  <span className="frame">
                    {s ? (<>
                      {s.aperture != null && <b>{formatAperture(s.aperture)}</b>}
                      {s.shutter != null && (s.aperture != null ? <em>{formatShutter(s.shutter)}</em> : <b>{formatShutter(s.shutter)}</b>)}
                      {s.aperture == null && s.shutter == null && <span className="auto">AUTO</span>}
                      {(s.comp || zoomOrFocal(s)) ? <small>{[zoomOrFocal(s), s.comp ? formatComp(s.comp) : ''].filter(Boolean).join(' · ')}</small> : null}
                    </>) : p === frame ? '다음' : ''}
                  </span>
                  {s?.flash && <span className="fl">⚡</span>}
                </button>
              )
            })}
            {/* 필름 앞쪽 (잘린 혀 모양) — 1번 칸이 가운데일 때 오른쪽에 보인다 (아이폰과 같음) */}
            <svg className="mr-tongue" viewBox="0 0 232 112" aria-hidden="true">
              <path d="M0 0 L206 0 Q226 0 227 18 L227 42 Q227 60 207 60 L122 60 C94 60 76 67 60 84 C46 100 28 112 0 112 Z" fill="#2a1a0f" />
              {Array.from({ length: 12 }, (_, i) => <rect key={i} x={6 + i * 17.33} y={4} width={7} height={8} rx={1.5} fill="#0b0b0c" />)}
              <rect x={6} y={100} width={7} height={8} rx={1.5} fill="#0b0b0c" />
            </svg>
            {/* 아주 넓은 화면에서도 1번 칸이 가운데로 올 수 있게 */}
            <span className="mr-strip-end" aria-hidden="true" />
          </div>
          <Canister iso={iso} frames={frames} colors={film ? boxPalette(film) : undefined} onClick={() => setSheet('roll')} />
        </div>
      </div>

      {toast && <div className="mr-toast">{toast}</div>}

      {sheet === 'place' && (
        <Sheet title="장소" onClose={() => setSheet(undefined)} right={<button className="btn ghost" onClick={() => setSheet(undefined)}><b>완료</b></button>}>
          <PlacePicker name={placeName} point={point} onChange={(n, p) => { setPlaceName(n); setPoint(p) }} />
        </Sheet>
      )}
      {sheet === 'time' && (
        <TimeSheet time={time} onChange={setTime} onNow={() => { setUseNow(true); setSheet(undefined) }} onDone={() => { setUseNow(false); setSheet(undefined) }} />
      )}
      {sheet === 'filter' && (
        <Sheet title="필터" onClose={() => setSheet(undefined)} right={<button className="btn ghost" onClick={() => setSheet(undefined)}><b>완료</b></button>}>
          <FilterChips value={filters} onChange={setFilters} />
        </Sheet>
      )}
      {sheet === 'iso' && <IsoSheet value={camIso} box={box} onChange={setCamIso} onClose={() => setSheet(undefined)} />}
      {/* 필름통을 누르면: 필름 정보 + 지금까지 기록한 컷 전부 (번호순, 누르면 고치기. 아이폰과 같음) */}
      {sheet === 'roll' && (
        <Sheet title="필름 · 컷 기록" onClose={() => setSheet(undefined)} right={<button className="btn ghost" onClick={() => setSheet(undefined)}><b>완료</b></button>}>
          <div className="section">
            <div className="row static" style={{ gap: 14 }}>
              {film && <UiCanister film={film} format={rollCameraFormat(camera as never, roll)} thumb={[96, 60]} />}
              <span className="grow">
                {film?.brand && <small className="lot-brand">{film.brand}</small>}
                <b>{film ? (film.brand ? film.name : filmDisplayName(film)) : '필름'}</b>
                <span className="sub">ISO {box} · {cameraName(camera as never, roll)}</span>
                <span className="sub">{lens.name}</span>
              </span>
            </div>
          </div>
          <div className="section">
            <h2 className="section-title"><span>컷 기록</span><span className="sub" style={{ fontWeight: 600 }}>{shots.length} / {frames}컷</span></h2>
            <div className="group">
              {shots.length === 0 && <div className="row static sub">아직 기록한 컷이 없어요.</div>}
              {[...shots].sort((a, b) => a.pos - b.pos).map((s) => (
                <button key={s.pos} className="row" onClick={() => { setSheet(undefined); setEditing(s.pos) }}>
                  <span className="grow">{meterFrameTitle(s.pos, !!roll.meterPrewind)}<div className="sub">{shotRowMeta(s)}</div></span>
                  <span className="value">{exposureText(s)}</span>
                </button>
              ))}
            </div>
          </div>
        </Sheet>
      )}
      {sheet === 'lens' && (
        <LensSheet lenses={lensList} current={lens} onClose={() => setSheet(undefined)} onPick={(l) => {
          setLens(l)
          setDial((d) => { const keep = dialOf.aperture(d), aps = apertures(l.open, l.close); return { ...d, aps, a: dialOf.flash(d) ? aps.length + 1 : keep != null ? 1 + nearest(aps, keep) : 0 } })
          setSheet(undefined); show(`${l.name}로 바꿨어요 · 다음 컷부터 기록돼요`)
        }} />
      )}
      {editShot && (
        <ShotEdit shot={editShot} like={dial} lenses={lensList.length ? lensList : [lens]} current={lens} iso={camIso} box={box}
          onClose={() => setEditing(undefined)}
          onSave={(s) => { save(shots.map((x) => (x.pos === s.pos ? { ...s, edited: true } : x))); setEditing(undefined); show(`${s.pos}번을 고쳤어요`) }}
          onDelete={() => { save(shots.filter((x) => x.pos !== editShot.pos)); setEditing(undefined); show(`${editShot.pos}번 기록을 지웠어요`) }} />
      )}
    </div>,
    document.body,
  )
}

// ───────── 다이얼

/** 셔터 · (가운데 작게) 노출 보정 · 조리개(⚡). 그 카메라에서 의미 없는 다이얼은 흐리게 막는다 */
function RecordDials({ dial, onChange, onLocked }: { dial: Dial; onChange: (d: Dial) => void; onLocked: (t: string) => void; iso?: number }) {
  const program = dialOf.program(dial), flash = dialOf.flash(dial)
  const comp = dialOf.comp(dial)
  const zero = Math.max(0, dial.comps.indexOf(0))
  // 보정하면: 다이얼 숫자 그대로 몇 스톱 더 밝게/더 어둡게 (보정은 셔터·조리개를 옮기는 것, 필름 감도는 그대로)
  const compNote = comp ? `${formatComp(Math.abs(comp)).replace('+', '')}스톱\n${comp > 0 ? '더 밝게' : '더 어둡게'}` : undefined
  const sh = dialOf.shutter(dial), ap = dialOf.aperture(dial)
  const accentS = new Set(dial.stops.map((v, i) => (v <= 0 ? i : -1)).filter((i) => i >= 0))
  return (
    <div className="mr-dials">
      <TopDial low title="셔터" labels={dial.stops.map(dialS)} index={dial.s} onChange={(s) => onChange({ ...dial, s })} size={132}
        big={program ? 'P 자동' : sh != null ? formatShutter(sh) : '자동'} accent={accentS} bigSize={24}
        disabled={dial.stops.length < 2} onLocked={() => onLocked(dial.fullAuto ? '이 카메라는 셔터·조리개를 자동으로 정해요' : '이 카메라는 셔터를 자동으로 정해요')} />
      <div className="mr-comp-dial">
        <TopDial title={compNote ?? '노출 보정'} titleOn={!!compNote} labels={dial.comps.map((c) => (c === 0 ? '0' : Number.isInteger(c * 2) ? formatComp(c) : '·'))} index={dial.c}
          onChange={(c) => onChange({ ...dial, c })} size={88} big={comp === 0 ? '±0' : formatComp(comp)}
          accent={new Set([zero])} bigSize={18} disabled={dial.comps.length < 2} onLocked={() => onLocked('이 카메라는 노출 보정이 없어요')} />
      </div>
      <TopDial low title="조리개" labels={dialOf.apLabels(dial)} index={dial.a} onChange={(a) => onChange({ ...dial, a })} size={132}
        big={flash ? '플래시' : program ? 'P 자동' : ap != null ? formatAperture(ap) : '자동'}
        accent={new Set([0, dialOf.flashIndex(dial)])} bigSize={24}
        disabled={program} onLocked={() => onLocked('P 모드에서는 조리개도 카메라가 정해요')} />
    </div>
  )
}

/** 카메라 윗면에서 본 다이얼: 값이 방사형(바깥쪽으로)으로 적혀 겹치지 않고, 오른쪽 표시에 맞춘 값이 고른 값.
 *  위아래(또는 좌우)로 끌어서 돌린다. A·P·B·⚡·0 자리에서는 '딱' 하고 걸린다 */
function TopDial({ title, labels, index, onChange, size, big, accent, bigSize, disabled, onLocked, low, titleOn }: {
  title: string; labels: string[]; index: number; onChange: (i: number) => void; size: number; big: string
  /** 제목 자리에 안내(보정 감도)를 주황으로 */
  titleOn?: boolean
  accent: Set<number>; bigSize: number; disabled?: boolean; onLocked?: () => void
  /** 셔터·조리개는 노출 보정보다 아래에 */
  low?: boolean
}) {
  // 원을 그리며 돌린다: 손가락을 다이얼 가운데 기준 각도로 따라가서, 반 바퀴를 넘어가도 같은 방향으로 이어진다
  const drag = useRef<{ cx: number; cy: number; last: number; turned: number; start: number } | null>(null)
  const moved = useRef(false)
  const c = size / 2, R = c - (size < 100 ? 20 : 24)
  const step = labels.includes('·') ? 20 : Math.max((15.5 / R) * (180 / Math.PI), Math.min(30, 300 / Math.max(labels.length - 1, 1)))
  const knurl = useMemo(() => Array.from({ length: 120 }, (_, i) => {
    const a = (i / 120) * Math.PI * 2
    return <line key={i} x1={c + Math.cos(a) * (c - 7)} y1={c + Math.sin(a) * (c - 7)} x2={c + Math.cos(a) * c} y2={c + Math.sin(a) * c}
      stroke={i % 2 ? '#2e2e30' : '#737373'} strokeWidth="1.4" />
  }), [c])
  return (
    <div className={`mr-dial ${disabled ? 'off' : ''}`} style={{ width: size, marginTop: low ? 56 : 0 }}>
      <div className="mr-knob" style={{ width: size, height: size }}
        onClick={() => { if (disabled && !moved.current) onLocked?.() }}
        onPointerDown={(e) => {
          moved.current = false; if (disabled) return
          ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
          const r = (e.currentTarget as Element).getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2
          drag.current = { cx, cy, last: Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI, turned: 0, start: index }
        }}
        onPointerMove={(e) => {
          const d = drag.current; if (!d) return
          const dx = e.clientX - d.cx, dy = e.clientY - d.cy
          if (dx * dx + dy * dy < 64) return
          const angle = Math.atan2(dy, dx) * 180 / Math.PI
          let delta = angle - d.last
          if (delta > 180) delta -= 360; else if (delta < -180) delta += 360
          d.turned += delta; d.last = angle
          // 시계 방향으로 끌면 다이얼도 시계 방향 (앞 칸이 표시로 온다)
          const n = -Math.round(d.turned / step)
          const next = Math.min(Math.max(d.start + n, 0), labels.length - 1)
          if (n) moved.current = true
          if (next !== index) { onChange(next); buzz(accent.has(next) ? 15 : 4) }
        }}
        onPointerUp={() => { drag.current = null }} onPointerCancel={() => { drag.current = null }}>
        <svg viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
          <defs><radialGradient id={`mrFace${size}`}><stop offset="0" stopColor="#3d3d3d" /><stop offset="1" stopColor="#1a1a1a" /></radialGradient>
            <linearGradient id="mrHub" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#6b6b6b" /><stop offset="1" stopColor="#292929" /></linearGradient></defs>
          <circle cx={c} cy={c} r={c} fill={`url(#mrFace${size})`} />
          {knurl}
          <circle cx={c} cy={c} r={c - 8} fill="none" stroke="#4d4d4d" strokeWidth="1" />
          <g style={{ transform: `rotate(${-index * step}deg)`, transformOrigin: `${c}px ${c}px`, transition: 'transform .28s cubic-bezier(.3,1.3,.5,1)' }}>
            {labels.map((l, i) => (
              <text key={i} x={c + R} y={c} textAnchor="middle" dominantBaseline="central" transform={`rotate(${i * step} ${c} ${c})`}
                fontSize={l === '·' ? 16 : size < 120 ? 11 : l.length > 3 ? 11 : 13} fontWeight={i === index ? 800 : 600}
                fill={accent.has(i) ? '#ff6b1f' : '#fff'} opacity={i === index ? 1 : 0.62} style={{ fontVariantNumeric: 'tabular-nums' }}>{l}</text>
            ))}
          </g>
          <circle cx={c} cy={c} r={size * 0.1} fill="url(#mrHub)" />
        </svg>
        <i className="mr-index" aria-hidden="true" />
      </div>
      <b className={`mr-big ${disabled || (index === 0 && accent.has(0)) ? 'dim' : ''}`} style={{ fontSize: bigSize }}>{big}</b>
      <span className={`mr-dial-title ${titleOn ? 'on' : ''}`}>{title}</span>
    </div>
  )
}

function PlaceTimeCard({ place, time, onPlace, onTime }: { place: string; time: string; onPlace: () => void; onTime: () => void }) {
  return (
    <div className="mr-card">
      <button className="mr-line" onClick={onPlace}><span className="k">장소</span><span className="v">{place}</span><span className="chev">›</span></button>
      <button className="mr-line" onClick={onTime}><span className="k">시간</span><span className="v">{time}</span><span className="chev">›</span></button>
    </div>
  )
}

function TimeSheet({ time, onChange, onNow, onDone }: { time: Date; onChange: (d: Date) => void; onNow: () => void; onDone: () => void }) {
  return (
    <Sheet title="촬영 시간" onClose={onDone} right={<button className="btn ghost" onClick={onDone}><b>완료</b></button>}>
      <div className="section"><div className="group">
        <div className="field"><label htmlFor="mr-time">촬영 시간</label>
          <input id="mr-time" type="datetime-local" className="input" value={localInput(time)} onChange={(e) => e.target.value && onChange(new Date(e.target.value))} /></div>
        <button className="row accent" onClick={onNow}>지금으로</button>
      </div></div>
    </Sheet>
  )
}

/** 카메라 ISO 고르기: 필름 감도보다 낮게 맞추면 오버(더 밝게), 높게 맞추면 언더(더 어둡게). 아이폰 IsoChips와 같음 */
const isoStops = (v: number, box: number) => { const s = Math.log2(box / v); return `${formatComp(s)} ${s > 0 ? '오버' : '언더'}` }
function IsoSheet({ value, box, onChange, onClose }: { value: number; box: number; onChange: (v: number) => void; onClose: () => void }) {
  const list = [25, 32, 40, 50, 64, 80, 100, 125, 160, 200, 250, 320, 400, 500, 640, 800, 1000, 1250, 1600, 2000, 2500, 3200, 4000, 5000, 6400].filter((v) => v >= box / 8 && v <= box * 8)
  return (
    <Sheet title="카메라 ISO" onClose={onClose} right={<button className="btn ghost" onClick={onClose}><b>완료</b></button>}>
      {/* 카메라 윗면 ISO 다이얼처럼 돌려서 고른다. 필름 감도 자리에서 '딱' 걸린다 */}
      <div className="mr-iso-dial">
        <TopDial title={value === box ? '필름 그대로' : isoStops(value, box)} titleOn={value !== box} labels={list.map(String)}
          index={Math.max(0, list.indexOf(value))} onChange={(i) => onChange(list[i])} size={220} big={`ISO ${value}`}
          accent={new Set([Math.max(0, list.indexOf(box))])} bigSize={28} />
      </div>
      <p className="footnote">필름 감도(ISO {box})보다 낮게 맞추면 더 밝게(오버), 높게 맞추면 더 어둡게(언더) 찍혀요.</p>
    </Sheet>
  )
}

function FilterChips({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="suggest" style={{ padding: 12 }}>
      <button type="button" className={`chip ${value.length ? '' : 'on'}`} onClick={() => onChange([])}>없음</button>
      {FILTERS.map(([id]) => (
        <button key={id} type="button" className={`chip ${value.includes(id) ? 'on' : ''}`}
          onClick={() => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id])}>{id}</button>
      ))}
    </div>
  )
}

function LensSheet({ lenses, current, onPick, onClose }: { lenses: Lens[]; current: Lens; onPick: (l: Lens) => void; onClose: () => void }) {
  return (
    <Sheet title="렌즈" onClose={onClose} right={<button className="btn ghost" onClick={onClose}><b>완료</b></button>}>
      <div className="group">
        {lenses.map((l) => (
          <button key={l.id} className="row" onClick={() => onPick(l)}>
            <span className="grow"><b>{l.name}</b><span className="sub">{l.max > l.min ? `${l.min}–${l.max}mm` : `${l.min}mm`} f/{trim(l.open)}</span></span>
            {l.id === current.id && <span style={{ color: 'var(--safelight)', fontWeight: 700 }}>끼움</span>}
          </button>
        ))}
      </div>
    </Sheet>
  )
}

const FilterIcon = () => (
  <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="2" />
    <path d="M6.5 9.5h11M5.5 13h13M7 16.5h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity=".7" /></svg>
)

// ───────── 셔터 줄 (노출계와 같은 모양: 되감기 노브 · 카운터(왼쪽 플래시 칸) · 셔터+레버, 360×162 좌표)
function Controls({ counter, flash, leverOut, rewind, down, onFlash, onShutter }: {
  counter: string; flash: boolean; leverOut: boolean; rewind: number; down: boolean; onFlash: () => void; onShutter: () => void
}) {
  return (
    <div className="mr-controls">
      <svg viewBox="0 0 360 162" aria-label="셔터와 카운터">
        <defs>
          <radialGradient id="mrChrome" cx=".38" cy=".35" r=".8"><stop offset="0" stopColor="#fafafa" /><stop offset=".6" stopColor="#a5a5a8" /><stop offset="1" stopColor="#5d5d60" /></radialGradient>
          <linearGradient id="mrLever" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#2a2a2d" /><stop offset=".6" stopColor="#18181a" /><stop offset="1" stopColor="#0f0f10" /></linearGradient>
          <radialGradient id="mrOrange" cx=".45" cy=".4" r=".7"><stop offset="0" stopColor="#ff7a35" /><stop offset=".7" stopColor="#f2621f" /><stop offset="1" stopColor="#d9531a" /></radialGradient>
        </defs>
        <g transform="translate(-30 0)">
          <g style={{ transform: `rotate(${rewind}deg)`, transformOrigin: '70px 52px', transition: 'transform .6s cubic-bezier(.35,0,.25,1)' }}>
            <circle cx="70" cy="52" r="30" fill="url(#mrChrome)" />
            <circle cx="70" cy="52" r="25" fill="#1d1d1f" />
            <circle cx="70" cy="52" r="22" fill="none" stroke="#2c2c30" strokeWidth="1" strokeDasharray="2 2.5" />
            <rect x="52" y="47" width="36" height="10" rx="5" fill="#2f2f33" stroke="#444" strokeWidth=".8" />
            <circle cx="84" cy="52" r="4.5" fill="#4a4a4e" />
            <circle cx="70" cy="52" r="3" fill="#555" />
          </g>
        </g>
        <rect x="110" y="19" width="140" height="66" rx="15" fill="#151517" stroke="#2c2c30" />
        <g role="button" aria-label="플래시" style={{ cursor: 'pointer', pointerEvents: 'auto' }} onClick={onFlash}>
          <rect x="114" y="23" width="42" height="58" rx="11" fill={flash ? '#ffd23f' : '#232326'} />
          <path d="M137.6 31 l-8.6 11.6 h5.8 l-1.7 9.4 l9-12.3 h-6 z" fill={flash ? '#1a1300' : '#8d8a85'} />
          <text x="135" y="69" textAnchor="middle" fontSize="10" fontWeight="700" fill={flash ? '#1a1300' : '#8d8a85'}>{flash ? '켬' : '끔'}</text>
        </g>
        <text x="203" y="64" textAnchor="middle" fontSize="32" fontWeight="700" fill="#fff" style={{ fontVariantNumeric: 'tabular-nums' }}>{counter}</text>
        <g transform="translate(30 0)">
          <g style={{ transform: `rotate(${leverOut ? -105 : -14}deg)`, transformOrigin: '290px 52px', transition: `transform .34s ${leverOut ? 'cubic-bezier(.4,.1,.3,1)' : 'cubic-bezier(.35,0,.25,1)'}` }}>
            <path d="M 290 18 A 34 34 0 1 1 278.4 84 C 266 92 250 98 236 98 H 202 A 10 10 0 0 1 202 78 H 230 C 244 78 254 70 258.5 64.7 A 34 34 0 0 1 290 18 Z" fill="url(#mrLever)" stroke="#3d3d42" strokeWidth=".8" />
            <path d="M 290 18.6 A 33.4 33.4 0 0 1 322 44" fill="none" stroke="rgb(255 255 255 / .14)" strokeWidth="1.2" strokeLinecap="round" />
            <g stroke="#47474d" strokeWidth="1.5" strokeLinecap="round">
              <path d="M197 82.5H226" /><path d="M195 86.5H228" /><path d="M195 90.5H228" /><path d="M197 94.5H226" />
            </g>
          </g>
          <g role="button" aria-label="셔터" style={{ cursor: 'pointer', pointerEvents: 'auto' }} onPointerDown={(e) => { e.preventDefault(); onShutter() }}>
            <circle cx="290" cy="52" r="34" fill="transparent" />
            <circle cx="290" cy="52" r="26.5" fill="url(#mrChrome)" />
            <circle cx="290" cy="52" r="23.2" fill="#2a2a2c" />
            <circle cx="290" cy="52" r="22.4" fill="url(#mrOrange)"
              style={{ transformBox: 'fill-box', transformOrigin: 'center', transform: down ? 'scale(.88)' : 'none', filter: down ? 'brightness(.8)' : 'none', transition: 'transform .09s, filter .09s' }} />
          </g>
        </g>
      </svg>
    </div>
  )
}

/** 화면 왼쪽 끝에 걸친 135 필름통 (노출계와 같음) */
function Canister({ iso, frames, colors, onClick }: { iso: number; frames: number; colors?: [string, string]; onClick?: () => void }) {
  const lum = (h?: string) => { const n = parseInt(String(h ?? '#888').replace('#', ''), 16); return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255 }
  // 라벨은 상자처럼 위 바탕색 · 아래 띠색 (아이폰·갤럭시와 같음)
  const label = colors?.[0] ?? '#f0b43a', band = colors?.[1] ?? label
  const num = lum(label) < 0.25 ? (lum(band) < 0.25 ? '#f0b43a' : band) : label
  return (
    <div className="mr-canister" role="button" aria-label="필름 정보와 컷 기록" onClick={onClick} style={{ pointerEvents: onClick ? 'auto' : 'none', cursor: 'pointer' }}>
      <svg viewBox="0 0 80 132">
        <defs>
          <linearGradient id="mrCap" x1="0" x2="1"><stop offset="0" stopColor="#050505" /><stop offset=".55" stopColor="#262628" /><stop offset=".78" stopColor="#3a3a3d" /><stop offset="1" stopColor="#0b0b0c" /></linearGradient>
          <linearGradient id="mrShade" x1="0" x2="1"><stop offset="0" stopColor="#000" stopOpacity=".5" /><stop offset=".5" stopColor="#fff" stopOpacity="0" /><stop offset=".72" stopColor="#fff" stopOpacity=".08" /><stop offset=".86" stopColor="#000" stopOpacity=".2" /></linearGradient>
          <linearGradient id="mrVig" x1="0" x2="1"><stop offset=".22" stopColor="#000" stopOpacity=".7" /><stop offset=".62" stopColor="#000" stopOpacity="0" /></linearGradient>
        </defs>
        <rect x="2" y="9" width="64" height="114" fill="#0b0b0c" />
        <rect x="2" y="11" width="33" height="110" fill={label} />
        <rect x="2" y="66" width="33" height="55" fill={band} />
        <text transform="translate(62 117) rotate(-90)" fontSize="22" fontWeight="700" fill={num} letterSpacing="-.6">{iso}</text>
        <text transform="translate(62 71) rotate(-90)" fontSize="22" fontWeight="700" fill={num} letterSpacing="-.6">{frames}<tspan fontSize="11" letterSpacing=".1">exp.</tspan></text>
        <path d="M63 8 C67 7.5 70 9 71.5 12 C70.5 15 72.5 18 71.8 22 L72.2 110 C73 114 71 117 71.8 121 C70 124.5 67 124.8 63 124 Z" fill="#232221" stroke="#55524e" strokeWidth=".6" />
        <rect x="2" y="9" width="70" height="114" fill="url(#mrShade)" />
        <rect x="0" y="3" width="66" height="9" rx="3.5" fill="url(#mrCap)" />
        <rect x="0" y="120" width="66" height="9" rx="3.5" fill="url(#mrCap)" />
        <rect x="16" y="128" width="16" height="4" fill="#0a0a0a" />
        <rect x="0" y="0" width="80" height="132" fill="url(#mrVig)" />
      </svg>
    </div>
  )
}

// ───────── 컷 고치기 (메인과 같은 다이얼 배치, 그 컷 값으로 맞춰서 연다)
function ShotEdit({ shot, like, lenses, current, box, onClose, onSave, onDelete }: {
  shot: MeterShot; like: Dial; lenses: Lens[]; current: Lens; iso: number; box: number; onClose: () => void; onSave: (s: MeterShot) => void; onDelete: () => void
}) {
  const [lens, setLens] = useState<Lens>(() => lenses.find((l) => l.id === shot.lensId) ?? current)
  const [dial, setDial] = useState<Dial>(() => dialOf.fromShot(shot, like, apertures(lens.open, lens.close)))
  const [filters, setFilters] = useState<string[]>(shot.filters ?? [])
  const [placeName, setPlaceName] = useState(shot.place ?? '')
  const [point, setPoint] = useState<GeoPoint | undefined>(shot.lat != null && shot.lon != null ? { latitude: shot.lat, longitude: shot.lon } : undefined)
  const [time, setTime] = useState(() => (shot.at ? new Date(shot.at) : new Date()))
  const [memo, setMemo] = useState(shot.memo ?? '')
  const [sheet, setSheet] = useState<'place' | 'time' | 'filter' | 'lens' | 'iso'>()
  const [camIso, setCamIso] = useState(shot.iso ?? box)
  const [ask, setAsk] = useState(false)
  const [note, setNote] = useState<string>()
  const save = () => {
    const changed = lens.id !== shot.lensId
    onSave({
      ...shot, mode: dialOf.mode(dial), aperture: dialOf.aperture(dial), shutter: dialOf.shutter(dial), flash: dialOf.flash(dial), comp: dialOf.comp(dial),
      filters: filters.length ? filters : undefined, place: placeName || undefined, lat: point?.latitude, lon: point?.longitude,
      at: time.toISOString(), memo: memo || undefined, iso: camIso !== box ? camIso : undefined,
      ...(changed ? { lensId: lens.id, focal: lens.max > lens.min ? null : lens.min } : {}),
    })
  }
  return createPortal(
    <div className="mr-overlay mr-edit">
      <div className="mr-edit-head">
        <button className="mr-text" onClick={onClose}>취소</button>
        <b>{shot.pos}번 컷</b>
        <button className="mr-text strong" onClick={save}>저장</button>
      </div>
      <div className="mr-edit-body">
        <RecordDials dial={dial} onChange={setDial} onLocked={setNote} iso={camIso} />
        {note && <p className="mr-note">{note}</p>}
        <PlaceTimeCard place={placeName || '없음'} time={time.toLocaleString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          onPlace={() => setSheet('place')} onTime={() => setSheet('time')} />
        <div className="mr-card">
          <button className="mr-line" onClick={() => { if (!lens.fixed && lenses.length > 1) setSheet('lens') }}>
            <span className="k">렌즈</span><span className="v">{lens.name}</span>{!lens.fixed && lenses.length > 1 && <span className="chev">›</span>}
          </button>
          <button className="mr-line" onClick={() => setSheet('iso')}>
            <span className="k">카메라 ISO</span><span className="v">{camIso === box ? `${camIso} (필름 그대로)` : `${camIso} · ${isoStops(camIso, box)}`}</span><span className="chev">›</span>
          </button>
          <button className="mr-line" onClick={() => setSheet('filter')}>
            <span className="k">필터</span><span className="v">{filters.length ? filters.join('+') : '없음'}</span><span className="chev">›</span>
          </button>
        </div>
        <textarea className="mr-memo" placeholder="메모" value={memo} onChange={(e) => setMemo(e.target.value)} />
        <button className="mr-delete" onClick={() => setAsk(true)}>이 칸 기록 지우기</button>
      </div>
      {sheet === 'place' && (
        <Sheet title="장소" onClose={() => setSheet(undefined)} right={<button className="btn ghost" onClick={() => setSheet(undefined)}><b>완료</b></button>}>
          <PlacePicker name={placeName} point={point} onChange={(n, p) => { setPlaceName(n); setPoint(p) }} />
        </Sheet>
      )}
      {sheet === 'time' && <TimeSheet time={time} onChange={setTime} onNow={() => { setTime(new Date()); setSheet(undefined) }} onDone={() => setSheet(undefined)} />}
      {sheet === 'filter' && (
        <Sheet title="필터" onClose={() => setSheet(undefined)} right={<button className="btn ghost" onClick={() => setSheet(undefined)}><b>완료</b></button>}>
          <FilterChips value={filters} onChange={setFilters} />
        </Sheet>
      )}
      {sheet === 'lens' && (
        <LensSheet lenses={lenses} current={lens} onClose={() => setSheet(undefined)} onPick={(l) => {
          setLens(l)
          setDial((d) => { const keep = dialOf.aperture(d), aps = apertures(l.open, l.close); return { ...d, aps, a: dialOf.flash(d) ? aps.length + 1 : keep != null ? 1 + nearest(aps, keep) : 0 } })
          setSheet(undefined)
        }} />
      )}
      {sheet === 'iso' && <IsoSheet value={camIso} box={box} onChange={setCamIso} onClose={() => setSheet(undefined)} />}
      {ask && <Confirm message="이 칸 기록을 지울까요?" action="지우기" onCancel={() => setAsk(false)} onConfirm={onDelete} />}
    </div>,
    document.body,
  )
}

/** 롤 화면에서 여는 컷 고치기 (상세 기록과 같은 화면) */
export function RollShotEdit({ roll, pos, onClose, onToast }: { roll: Roll; pos: number; onClose: () => void; onToast: (t: string) => void }) {
  const camera = useLiveQuery(() => (roll.cameraId ? db.cameras.get(roll.cameraId) : undefined), [roll.cameraId])
  const allLenses = useLiveQuery(() => db.lenses.toArray(), [])
  const shot = roll.meterShots?.find((s) => s.pos === pos)
  if ((camera === undefined && roll.cameraId) || !allLenses || !shot) return null
  const setup = setupOf(roll, camera ?? undefined, allLenses)
  const current = setup.lensById(shot.lensId ?? lensIdAt(roll, pos) ?? roll.lensId) ?? GENERIC
  const save = (list: MeterShot[]) => db.rolls.update(roll.id, { meterShots: list })
  return (
    <ShotEdit shot={shot} like={setup.baseDial(current)} lenses={setup.lensList.length ? setup.lensList : [current]} current={current} iso={setup.iso} box={setup.film?.iso ?? setup.iso}
      onClose={onClose}
      onSave={(s) => { void save((roll.meterShots ?? []).map((x) => (x.pos === s.pos ? { ...s, edited: true } : x))); onClose(); onToast(`${s.pos}번을 고쳤어요`) }}
      onDelete={() => { void save((roll.meterShots ?? []).filter((x) => x.pos !== pos)); onClose(); onToast(`${pos}번 기록을 지웠어요`) }} />
  )
}
