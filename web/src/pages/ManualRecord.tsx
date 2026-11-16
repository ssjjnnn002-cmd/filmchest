import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { framesPerRoll, lensIdAt, type GeoPoint, type MeterShot, type Roll } from '../core/types'
import { filmDisplayName } from '../core/films'
import { formatAperture, formatComp, formatShutter } from '../core/meter'
import { cameraName, rollCameraFormat, rollFilm, Confirm, Sheet } from '../ui/common'
import { currentPlace } from '../platform'
import { PlacePicker } from './Editors'
import { fixedLens, meterLens } from './Meter'

// 상세 기록 (노출계 없이): 카메라 윗면 다이얼로 셔터·조리개를 돌려 고르고, 칸 번호·장소·시간과 함께 컷마다 남긴다.
// 아이폰 ManualRecordView와 같은 배치·규칙. 기록은 노출계와 같은 meterShots로 롤에 저장한다

const SHUTTERS = [1 / 4000, 1 / 2000, 1 / 1000, 1 / 500, 1 / 250, 1 / 125, 1 / 60, 1 / 30, 1 / 15, 1 / 8, 1 / 4, 1 / 2, 1, 2, 4, 8]
const COMPS = Array.from({ length: 13 }, (_, i) => (i - 6) / 3)
const nearest = (list: number[], v: number) => list.reduce((b, x, i) => (Math.abs(Math.log2(x / v)) < Math.abs(Math.log2(list[b] / v)) ? i : b), 0)
const dialS = (t: number) => (t >= 1 ? `${t}"` : String(Math.round(1 / t)))
const trim = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1))
function apertures(open: number, close: number) {
  const list = [1.4, 2, 2.8, 4, 5.6, 8, 11, 16, 22].filter((x) => x >= open - 0.01 && x <= close + 0.01)
  if (!list.length || list[0] - open > 0.05) list.unshift(Math.round(open * 10) / 10)
  return list
}
const tick = () => { try { navigator.vibrate?.(4) } catch { /* 진동 없음 */ } }
const pad = (n: number) => String(n).padStart(2, '0')
const localInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`

export function ManualRecord({ roll, onClose }: { roll: Roll; onClose: () => void }) {
  const camera = useLiveQuery(() => (roll.cameraId ? db.cameras.get(roll.cameraId) : undefined), [roll.cameraId])
  const lenses = useLiveQuery(() => db.lenses.toArray(), [])
  const film = rollFilm(roll)
  const frames = framesPerRoll[rollCameraFormat(camera, roll)] ?? 36
  const [shots, setShots] = useState<MeterShot[]>(() => [...(roll.meterShots ?? [])].sort((a, b) => a.pos - b.pos))
  // 렌즈: 고정형이면 이름에서, 아니면 다음 컷에 끼운 렌즈 → 롤 렌즈 (아이폰 MeterGear.from과 같음)
  const lens = useMemo(() => {
    const fixedName = camera?.fixedLens ?? roll.cameraFixedLens
    if (fixedName) return fixedLens(fixedName)
    const cur = (lenses ?? []).find((l) => l.id === (lensIdAt(roll, shots.length + 1) ?? roll.lensId))
    return cur ? meterLens(cur) : { id: 'generic', name: '렌즈', min: 50, max: 50, open: 1.4, close: 22 }
  }, [camera, lenses, roll, shots.length])
  const aps = useMemo(() => apertures(lens.open, lens.close), [lens])
  // 다이얼 0번은 A (자동 · 값 없이 기록)
  const [sIndex, setSIndex] = useState(1 + nearest(SHUTTERS, 1 / 125))
  const [aIndex, setAIndex] = useState(1 + nearest(aps, 8))
  const [comp, setComp] = useState(0)
  const [flash, setFlash] = useState(false)
  const [frame, setFrame] = useState(() => Math.max(0, ...(roll.meterShots ?? []).map((s) => s.pos)) + 1)
  const [autoCount, setAutoCount] = useState(() => { try { return localStorage.getItem('manualRecord.autoCount') !== '0' } catch { return true } })
  const [placeName, setPlaceName] = useState('')
  const [point, setPoint] = useState<GeoPoint>()
  const [locating, setLocating] = useState(true)
  const [useNow, setUseNow] = useState(true)
  const [time, setTime] = useState(() => new Date())
  const [placeSheet, setPlaceSheet] = useState(false)
  const [timeSheet, setTimeSheet] = useState(false)
  const [editing, setEditing] = useState<number>()
  const [toast, setToast] = useState<string>()
  const toastTimer = useRef(0)
  const stripRef = useRef<HTMLDivElement>(null)

  const shutter = sIndex === 0 ? null : SHUTTERS[sIndex - 1]
  const aperture = aIndex === 0 ? null : aps[Math.min(aIndex - 1, aps.length - 1)]
  const exists = shots.some((s) => s.pos === frame)
  const show = (t: string) => { setToast(t); window.clearTimeout(toastTimer.current); toastTimer.current = window.setTimeout(() => setToast(undefined), 1800) }
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
  useEffect(() => {
    const strip = stripRef.current, el = strip?.querySelector<HTMLElement>(`[data-p="${frame}"]`)
    if (strip && el) strip.scrollTo({ left: el.offsetLeft - (strip.clientWidth - el.clientWidth) / 2, behavior: 'smooth' })
  }, [frame, shots.length])

  const record = () => {
    const mode: MeterShot['mode'] = aperture != null && shutter != null ? 'M' : aperture != null ? 'A' : shutter != null ? 'S' : 'P'
    const old = shots.find((s) => s.pos === frame)
    const shot: MeterShot = {
      pos: frame, order: old?.order ?? shots.length + 1, mode, aperture, shutter, comp, flash, ev: 0,
      focal: lens.max > lens.min ? null : lens.min, at: (useNow ? new Date() : time).toISOString(), edited: false,
      memo: old?.memo, tags: old?.tags, place: placeName || undefined, lat: point?.latitude, lon: point?.longitude,
    }
    save([...shots.filter((s) => s.pos !== frame), shot].sort((a, b) => a.pos - b.pos))
    try { navigator.vibrate?.(12) } catch { /* 진동 없음 */ }
    show(old ? `${frame}번을 새로 기록했어요` : `${frame}번 기록`)
    if (autoCount) setFrame(frame + 1)
    if (!useNow) setTime(new Date(time.getTime() + 60000))
  }

  const lo = Math.min(1, ...shots.map((s) => s.pos)), hi = Math.max(frames + 2, frame, ...shots.map((s) => s.pos))
  const cells = Array.from({ length: hi - lo + 1 }, (_, i) => hi - i)
  const editShot = editing != null ? shots.find((s) => s.pos === editing) : undefined

  return createPortal(
    <div className="mr-overlay">
      <div className="mr-head">
        <button className="mr-back" aria-label="닫기" onClick={onClose}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7" /></svg>
        </button>
        <div className="mr-title">
          <b>{cameraName(camera, roll)}</b>
          {film && <span>{filmDisplayName(film)} · {frames}컷</span>}
        </div>
        <span className="mr-count">{shots.length}컷 기록</span>
      </div>

      <div className="mr-dials">
        <TopDial title="셔터" labels={['A', ...SHUTTERS.map(dialS)]} index={sIndex} onChange={setSIndex} big={shutter != null ? formatShutter(shutter) : '자동'} />
        <TopDial title="조리개" labels={['A', ...aps.map(trim)]} index={Math.min(aIndex, aps.length)} onChange={setAIndex} big={aperture != null ? formatAperture(aperture) : '자동'} />
      </div>

      <div className="mr-row">
        <div className="mr-comp">
          <button aria-label="보정 낮추기" onClick={() => { setComp(Math.max(-2, Math.round((comp - 1 / 3) * 3) / 3)); tick() }}>−</button>
          <span><small>노출 보정</small><b className={comp ? 'on' : ''}>{comp ? formatComp(comp) : '±0'}</b></span>
          <button aria-label="보정 높이기" onClick={() => { setComp(Math.min(2, Math.round((comp + 1 / 3) * 3) / 3)); tick() }}>+</button>
        </div>
        <button className={`mr-chip ${flash ? 'on' : ''}`} onClick={() => { setFlash(!flash); tick() }}>⚡ {flash ? '플래시 켬' : '플래시'}</button>
      </div>

      <div className="mr-card">
        <div className="mr-line">
          <span className="k">칸</span>
          <span className="mr-stepper">
            <button aria-label="앞 칸" onClick={() => { if (frame > 1) { setFrame(frame - 1); tick() } }}>−</button>
            <b>{frame}</b>
            <button aria-label="다음 칸" onClick={() => { setFrame(frame + 1); tick() }}>+</button>
          </span>
        </div>
        <label className="mr-line">
          <span>기록하면 다음 칸으로</span>
          <input type="checkbox" className="switch" checked={autoCount}
            onChange={(e) => { setAutoCount(e.target.checked); try { localStorage.setItem('manualRecord.autoCount', e.target.checked ? '1' : '0') } catch { /* 저장 못 함 */ } }} />
        </label>
        <button className="mr-line" onClick={() => setPlaceSheet(true)}>
          <span className="k">장소</span><span className="v">{locating && !placeName ? '현재 위치 찾는 중…' : placeName || '없음'}</span><span className="chev">›</span>
        </button>
        <button className="mr-line" onClick={() => { if (useNow) setTime(new Date()); setTimeSheet(true) }}>
          <span className="k">시간</span>
          <span className="v">{useNow ? '기록하는 순간' : time.toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span><span className="chev">›</span>
        </button>
      </div>

      <button className="mr-record" onClick={record}>{exists ? `${frame}번 다시 기록` : `${frame}번 기록`}</button>

      <div className="mr-strip" ref={stripRef}>
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
                  {s.comp ? <small>{formatComp(s.comp)}</small> : null}
                </>) : p === frame ? '다음' : ''}
              </span>
              {s?.flash && <span className="fl">⚡</span>}
            </button>
          )
        })}
      </div>

      {toast && <div className="mr-toast">{toast}</div>}

      {placeSheet && (
        <Sheet title="장소" onClose={() => setPlaceSheet(false)} right={<button className="btn ghost" onClick={() => setPlaceSheet(false)}><b>완료</b></button>}>
          <PlacePicker name={placeName} point={point} onChange={(n, p) => { setPlaceName(n); setPoint(p) }} />
        </Sheet>
      )}
      {timeSheet && (
        <Sheet title="촬영 시간" onClose={() => setTimeSheet(false)} right={<button className="btn ghost" onClick={() => { setUseNow(false); setTimeSheet(false) }}><b>완료</b></button>}>
          <div className="section"><div className="group">
            <div className="field"><label htmlFor="mr-time">촬영 시간</label>
              <input id="mr-time" type="datetime-local" className="input" value={localInput(time)} onChange={(e) => e.target.value && setTime(new Date(e.target.value))} /></div>
            <button className="row accent" onClick={() => { setUseNow(true); setTimeSheet(false) }}>지금으로</button>
          </div></div>
        </Sheet>
      )}
      {editShot && (
        <ShotEdit shot={editShot} aps={aps} lensZoom={lens.max > lens.min}
          onClose={() => setEditing(undefined)}
          onSave={(s) => { save(shots.map((x) => (x.pos === s.pos ? { ...s, edited: true } : x))); setEditing(undefined); show('고쳤어요') }}
          onDelete={() => { save(shots.filter((x) => x.pos !== editShot.pos)); setEditing(undefined); show(`${editShot.pos}번 기록을 지웠어요`) }} />
      )}
    </div>,
    document.body,
  )
}

/** 카메라 윗면에서 본 다이얼: 값이 둥글게 적혀 있고 위쪽 표시에 맞춘 값이 고른 값. 좌우(또는 위아래)로 끌어서 돌린다 */
function TopDial({ title, labels, index, onChange, big }: { title: string; labels: string[]; index: number; onChange: (i: number) => void; big: string }) {
  const STEP = 32
  const drag = useRef<{ x: number; y: number; start: number } | null>(null)
  const knurl = useMemo(() => Array.from({ length: 120 }, (_, i) => {
    const a = (i / 120) * Math.PI * 2
    return <line key={i} x1={75 + Math.cos(a) * 68} y1={75 + Math.sin(a) * 68} x2={75 + Math.cos(a) * 75} y2={75 + Math.sin(a) * 75}
      stroke={i % 2 ? '#2e2e30' : '#737373'} strokeWidth="1.4" />
  }), [])
  return (
    <div className="mr-dial">
      <div className="mr-knob"
        onPointerDown={(e) => { (e.target as Element).setPointerCapture?.(e.pointerId); drag.current = { x: e.clientX, y: e.clientY, start: index } }}
        onPointerMove={(e) => {
          const d = drag.current; if (!d) return
          const step = Math.round(((e.clientX - d.x) - (e.clientY - d.y)) / 22)
          const next = Math.min(Math.max(d.start - step, 0), labels.length - 1)
          if (next !== index) { onChange(next); tick() }
        }}
        onPointerUp={() => { drag.current = null }} onPointerCancel={() => { drag.current = null }}>
        <svg viewBox="0 0 150 150" aria-hidden="true">
          <defs><radialGradient id="mrFace"><stop offset="0" stopColor="#3d3d3d" /><stop offset="1" stopColor="#1a1a1a" /></radialGradient>
            <linearGradient id="mrHub" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#6b6b6b" /><stop offset="1" stopColor="#292929" /></linearGradient></defs>
          <circle cx="75" cy="75" r="75" fill="url(#mrFace)" />
          {knurl}
          <circle cx="75" cy="75" r="67" fill="none" stroke="#4d4d4d" strokeWidth="1" />
          <g style={{ transform: `rotate(${-index * STEP}deg)`, transformOrigin: '75px 75px', transition: 'transform .28s cubic-bezier(.3,1.3,.5,1)' }}>
            {labels.map((l, i) => (
              <text key={i} x="75" y="23" textAnchor="middle" dominantBaseline="middle" transform={`rotate(${i * STEP} 75 75)`}
                fontSize={l.length > 3 ? 11 : 14} fontWeight={i === index ? 700 : 600} fill={i === 0 ? '#ff6b1f' : '#fff'}
                opacity={Math.abs(i - index) <= 2 ? 1 : Math.abs(i - index) <= 4 ? 0.35 : 0} style={{ fontVariantNumeric: 'tabular-nums' }}>{l}</text>
            ))}
          </g>
          <circle cx="75" cy="75" r="17" fill="url(#mrHub)" />
        </svg>
        <i className="mr-index" aria-hidden="true" />
      </div>
      <b className={`mr-big ${index === 0 ? 'auto' : ''}`}>{big}</b>
      <span className="mr-dial-title">{title}</span>
    </div>
  )
}

/** 찍은 칸 고치기: 촬영 시간 · 장소 · 모드 · 조리개 · 셔터 · 플래시 · 보정 · 메모, 지우기 */
function ShotEdit({ shot, aps, lensZoom, onClose, onSave, onDelete }: {
  shot: MeterShot; aps: number[]; lensZoom: boolean; onClose: () => void; onSave: (s: MeterShot) => void; onDelete: () => void
}) {
  const [s, setS] = useState(shot)
  const [ask, setAsk] = useState(false)
  const needA = s.mode === 'A' || s.mode === 'M', needS = s.mode === 'S' || s.mode === 'M'
  const chips = <T,>(list: T[], cur: T | null | undefined, fmt: (v: T) => string, pick: (v: T) => void) => (
    <div className="suggest" style={{ padding: '4px 12px 12px' }}>
      {list.map((v, i) => <button key={i} type="button" className={`chip ${v === cur ? 'on' : ''}`} onClick={() => pick(v)}>{fmt(v)}</button>)}
    </div>
  )
  const at = s.at ? new Date(s.at) : new Date()
  void lensZoom
  return (
    <Sheet title={`${shot.pos}번 컷 고치기`} onClose={onClose} right={<button className="btn ghost" onClick={() => onSave(s)}><b>저장</b></button>}>
      <div className="section"><h2>촬영 시간</h2><div className="group"><div className="field">
        <label htmlFor="se-time">시간</label>
        <input id="se-time" type="datetime-local" className="input" value={localInput(at)} onChange={(e) => e.target.value && setS({ ...s, at: new Date(e.target.value).toISOString() })} />
      </div></div></div>
      <PlacePicker name={s.place ?? ''} point={s.lat != null && s.lon != null ? { latitude: s.lat, longitude: s.lon } : undefined}
        onChange={(n, p) => setS({ ...s, place: n || undefined, lat: p?.latitude, lon: p?.longitude })} />
      <div className="section"><h2>모드</h2>
        <div className="segmented" role="tablist">
          {(['P', 'A', 'S', 'M'] as const).map((md) => (
            <button key={md} type="button" className={s.mode === md ? 'on' : ''} onClick={() => setS({
              ...s, mode: md,
              aperture: md === 'A' || md === 'M' ? s.aperture ?? 8 : null,
              shutter: md === 'S' || md === 'M' ? s.shutter ?? 1 / 125 : null,
            })}>{({ P: '자동', A: '조리개 우선', S: '셔터 우선', M: '수동' })[md]}</button>
          ))}
        </div>
      </div>
      {needA && <div className="section"><h2>조리개</h2><div className="group">{chips(aps, s.aperture, formatAperture, (v) => setS({ ...s, aperture: v }))}</div></div>}
      {needS && <div className="section"><h2>셔터</h2><div className="group">{chips(SHUTTERS, s.shutter, formatShutter, (v) => setS({ ...s, shutter: v }))}</div></div>}
      <div className="section"><h2>플래시 · 노출 보정</h2><div className="group">
        {chips([false, true], s.flash, (v) => (v ? '플래시 켬' : '플래시 끔'), (v) => setS({ ...s, flash: v }))}
        {chips(COMPS, s.comp, (c) => (c ? formatComp(c) : '±0'), (v) => setS({ ...s, comp: v }))}
      </div></div>
      <div className="section"><h2>메모</h2><div className="group"><div className="field">
        <textarea className="input" aria-label="메모" value={s.memo ?? ''} onChange={(e) => setS({ ...s, memo: e.target.value || undefined })} />
      </div></div></div>
      <div className="group"><button className="row danger" onClick={() => setAsk(true)}>이 칸 기록 지우기</button></div>
      {ask && <Confirm message="이 칸 기록을 지울까요?" action="지우기" onCancel={() => setAsk(false)} onConfirm={onDelete} />}
    </Sheet>
  )
}
