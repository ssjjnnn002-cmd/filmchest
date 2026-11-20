import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import type { Frame, GeoPoint, Lens, LocationSegment, Roll, ShootingDay } from '../core/types'
import { buildTimeline } from '../core/timeline'
import { resolvedDays, setDays, setPlace, span } from '../core/rangeEdit'
import { formatInfo, uid } from '../core/types'
import { Confirm, Icon, Sheet, rollCameraFormat, sortedLocations, toInputDate, toInputDateTime } from '../ui/common'
import { currentPlace, locationAvailable, parseCoordinates, placeSearchAvailable, searchPlaces, type Place, weatherAt } from '../platform'
import { forgetSuggestion, hiddenSet, rememberSuggestion } from '../suggest'
import { features } from '../core/features'

const frameMax = (format: keyof typeof formatInfo = '135') => formatInfo[format].count + 4

function Stepper({ value, onChange, min = 1, max, label }: { value: number; onChange: (n: number) => void; min?: number; max: number; label: string }) {
  return (
    <div className="toggle">
      <span>{label}</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button className="btn small" onClick={() => onChange(Math.max(min, value - 1))} aria-label="하나 줄이기">−</button>
        <b style={{ minWidth: 72, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{value}번부터</b>
        <button className="btn small" onClick={() => onChange(Math.min(max, value + 1))} aria-label="하나 늘리기">+</button>
      </span>
    </div>
  )
}

/** 장소 고르기: 검색/현재 위치(가능할 때) 또는 이름 + 좌표 붙여넣기 */
/** 장소 하나: 검색해서 고르면 이름과 좌표가 같이 들어간다. 고르지 않고 쓴 글자는 이름으로만 저장. */
export function PlacePicker({ name, point, onChange }: { name: string; point?: GeoPoint; onChange: (name: string, point?: GeoPoint) => void }) {
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
    ;(document.activeElement as HTMLElement | null)?.blur()
  }

  return (
    <div className="section">
      <h2>장소</h2>
      <div className="group">
        <label className="search-row">
          <Icon name={picked ? 'pin' : 'search'} size={20} />
          <input className="input" value={query} autoComplete="off" enterKeyHint="search" placeholder="장소 검색"
            aria-label="장소 검색"
            onChange={(e) => { setQuery(e.target.value); setPicked(null); onChange(e.target.value, undefined) }} />
          {searching && <div className="spinner" />}
          {query && !searching && (
            <button className="clear" aria-label="지우기" onClick={() => { setQuery(''); setPicked(null); onChange('', undefined) }}>
              <Icon name="close" size={14} />
            </button>
          )}
        </label>
        {picked && point && (
          <div className="row static picked">
            <span className="grow">
              <span className="sub" style={{ display: 'block' }}>{picked.address || `${point.latitude.toFixed(4)}, ${point.longitude.toFixed(4)}`}</span>
            </span>
            <span className="status imported">위치 기록</span>
          </div>
        )}
        {results.map((r, i) => (
          <button key={i} className="row" onClick={() => choose(r)}>
            <span className="place-dot"><Icon name="pin" size={16} /></span>
            <span className="grow" style={{ minWidth: 0 }}>
              <span className="truncate" style={{ display: 'block' }}>{r.name}</span>
              {r.address && <span className="sub truncate" style={{ display: 'block' }}>{r.address}</span>}
            </span>
          </button>
        ))}
        {locationAvailable() && !results.length && (
          <button className="row accent" disabled={locating} onClick={async () => {
            setLocating(true)
            const p = await currentPlace()
            setLocating(false)
            if (p) choose({ ...p, name: p.name || query || '현재 위치' })
          }}>
            {locating ? <div className="spinner" /> : <Icon name="pin" />} {locating ? '현재 위치 찾는 중…' : '현재 위치'}
          </button>
        )}
        {!results.length && (
          <button className="row" style={{ color: 'var(--muted)', fontSize: 15 }} onClick={() => setCoordOpen(!coordOpen)}>
            <span className="grow">좌표 직접 넣기</span>
            <Icon name={coordOpen ? 'close' : 'chev'} size={16} />
          </button>
        )}
        {coordOpen && (
          <div className="field stack">
            <label htmlFor="place-coord">좌표 또는 지도 링크</label>
            <input id="place-coord" className="input" value={coordText} inputMode="decimal"
              onChange={(e) => {
                setCoordText(e.target.value)
                const p = parseCoordinates(e.target.value)
                setPicked(p ? {} : null)
                onChange(query, p)
              }} />
          </div>
        )}
      </div>
      {!point && query.trim() && !results.length && !searching && (
        <p className="footnote">목록에서 고르면 사진에 위치도 기록돼요. 고르지 않으면 이름만 저장돼요.</p>
      )}
    </div>
  )
}

/** 편집 화면이 쓰는 롤의 컷 수와 지금 컷별 촬영 정보 (아이폰 RollFrames와 같음) */
function useRollFrames(roll: Roll) {
  const camera = useLiveQuery(() => (roll.cameraId ? db.cameras.get(roll.cameraId) : undefined), [roll.cameraId])
  const frames = useLiveQuery(() => db.frames.where('rollId').equals(roll.id).toArray(), [roll.id]) ?? []
  const scanned = Math.max(0, ...frames.map((f) => f.index))
  const count = Math.max(1, roll.frameCount ?? (scanned > 0 ? scanned : formatInfo[rollCameraFormat(camera, roll)].count))
  const timeline = useMemo(() => buildTimeline(roll, count), [roll, count])
  return { count, timeline, frames, date: (n: number) => timeline[n - 1]?.date }
}

/** 필름 띠에서 범위 고르기: 처음 누른 컷부터 다음에 누른 컷까지 (아이폰과 같음) */
function FrameRangeStrip({ count, frames, range, onRange, caption }: {
  count: number; frames: Frame[]; range: [number, number]; onRange: (r: [number, number]) => void; caption: (n: number) => string | undefined
}) {
  const [anchor, setAnchor] = useState<number>()
  const box = useRef<HTMLDivElement>(null)
  const urls = useMemo(() => new Map(frames.filter((f) => f.thumb).map((f) => [f.index, { url: URL.createObjectURL(f.thumb!), turns: f.rotation ?? 0 }])), [frames])
  useEffect(() => () => urls.forEach((u) => URL.revokeObjectURL(u.url)), [urls])
  useEffect(() => { box.current?.querySelector(`[data-n="${range[0]}"]`)?.scrollIntoView({ inline: 'start', block: 'nearest' }) }, [])
  const tap = (n: number) => {
    if (anchor === undefined) { onRange([n, n]); setAnchor(n) } else { onRange([Math.min(anchor, n), Math.max(anchor, n)]); setAnchor(undefined) }
  }
  return (
    <>
      <div className="range-strip" ref={box}>
        {Array.from({ length: count }, (_, i) => i + 1).map((n) => {
          const on = n >= range[0] && n <= range[1]
          const u = urls.get(n)
          return (
            <button key={n} data-n={n} type="button" className={on ? 'on' : ''} onClick={() => tap(n)} aria-label={`${n}번`}>
              <span className="cell">{u ? <img src={u.url} alt="" style={{ transform: `rotate(${u.turns * 90}deg)` }} /> : <b>{n}</b>}</span>
              {u && <span className="num">{n}</span>}
              <span className="cap">{caption(n) ?? ' '}</span>
            </button>
          )
        })}
      </div>
      <div className="range-bar">
        <b>{anchor !== undefined ? `${range[0]}번부터 · 끝 컷을 눌러요` : range[0] === range[1] ? `${range[0]}번` : `${range[0]}번 – ${range[1]}번`}</b>
        <button type="button" className="btn ghost small" onClick={() => { onRange([1, count]); setAnchor(undefined) }}>전체</button>
      </div>
    </>
  )
}

const md = (t: number) => { const d = new Date(t); return `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}` }

/** 촬영일 추가/수정: 필름 띠에서 컷 범위를 고르고 그 컷들의 날짜를 정한다 */
export function DayEdit({ roll, day, onClose }: { roll: Roll; day?: ShootingDay; onClose: () => void }) {
  const f = useRollFrames(roll)
  const init = useMemo(() => {
    const resolved = resolvedDays(roll.days, f.count)
    const i = day ? resolved.findIndex((d) => d.id === day.id) : -1
    if (day && i >= 0) return { range: span(resolved[i].startFrame ?? 1, resolved[i + 1]?.startFrame, f.count), date: day.startedAt }
    // 새 촬영일: 마지막 촬영일 다음 컷부터 끝까지, 날짜는 그 컷에 지금 기록된 날짜
    const start = resolved.length ? Math.min(f.count, (resolved.at(-1)!.startFrame ?? 1) + 1) : 1
    return { range: [start, f.count] as [number, number], date: f.date(start) ?? roll.loadedAt }
  }, [])
  const [range, setRange] = useState<[number, number]>(init.range)
  const [date, setDate] = useState(init.date)
  const [touched, setTouched] = useState(false)
  const [confirm, setConfirm] = useState(false)
  useEffect(() => { if (!touched && !day) { const d = f.date(range[0]); if (d) setDate(d) } }, [range[0]])

  const save = async () => {
    const days = setDays(roll.days, range[0], range[1], date, f.count, day?.id, f.date)
    await db.rolls.update(roll.id, { days })
    onClose()
  }

  return (
    <Sheet title={day ? '촬영일 수정' : '촬영일 추가'} onClose={onClose} right={<button className="btn ghost" onClick={save}><b>저장</b></button>}>
      <div className="section">
        <h2>컷</h2>
        <FrameRangeStrip count={f.count} frames={f.frames} range={range} onRange={setRange} caption={(n) => { const d = f.date(n); return d ? md(d) : undefined }} />
        <p className="footnote">처음 누른 컷부터 다음에 누른 컷까지 이 날짜로 바꿔요. 컷 아래는 지금 기록된 날짜예요.</p>
      </div>
      <div className="section"><div className="group">
        <div className="field">
          <label htmlFor="day-date">날짜·시각</label>
          <input id="day-date" type="datetime-local" className="input" value={toInputDateTime(date)}
            onChange={(e) => { if (e.target.value) { setDate(new Date(e.target.value).getTime()); setTouched(true) } }} />
        </div>
      </div></div>
      {day && <div className="group"><button className="row" style={{ color: '#c0392b' }} onClick={() => setConfirm(true)}><Icon name="trash" /> 촬영일 삭제</button></div>}
      {confirm && day && (
        <Confirm message="이 촬영일을 삭제할까요?" onCancel={() => setConfirm(false)}
          onConfirm={async () => { await db.rolls.update(roll.id, { days: roll.days.filter((d) => d.id !== day.id) }); onClose() }} />
      )}
    </Sheet>
  )
}

/** 장소 추가/수정: 필름 띠에서 컷 범위를 고르고 그 컷들의 장소를 정한다 (장소 미상도) */
export function PlaceEdit({ roll, segment, onClose }: { roll: Roll; segment?: LocationSegment; onClose: () => void }) {
  const f = useRollFrames(roll)
  const init = useMemo((): [number, number] => {
    const list = sortedLocations(roll)
    const i = segment ? list.findIndex((l) => l.id === segment.id) : -1
    if (segment && i >= 0) return span(segment.startFrame, list[i + 1]?.startFrame, f.count)
    return [list.length ? Math.min(f.count, list.at(-1)!.startFrame + 1) : 1, f.count]
  }, [])
  const [range, setRange] = useState<[number, number]>(init)
  const [unknown, setUnknown] = useState(!!segment && !segment.name && !segment.point)
  const [name, setName] = useState(segment?.name ?? '')
  const [point, setPoint] = useState<GeoPoint | undefined>(segment?.point)
  const [memo, setMemo] = useState(segment?.memo ?? '')
  const [confirm, setConfirm] = useState(false)

  const save = async () => {
    const value: LocationSegment = {
      id: segment?.id ?? uid(), startFrame: range[0], name: unknown ? '' : name.trim(), point: unknown ? undefined : point, memo: memo.trim() || undefined,
      // 장소를 그대로 두면 예전 날씨를, 방금 현재 위치로 바꿨으면 지금 날씨를
      weather: unknown ? undefined : weatherAt(point) ?? (point && segment?.point && point.latitude === segment.point.latitude && point.longitude === segment.point.longitude ? segment.weather : undefined),
    }
    await db.rolls.update(roll.id, { locations: setPlace(roll.locations, range[0], range[1], value, f.count, segment?.id) })
    onClose()
  }

  return (
    <Sheet title={segment ? '장소 수정' : '장소 추가'} onClose={onClose}
      right={<button className="btn ghost" disabled={!unknown && !name.trim() && !point && !memo.trim()} onClick={save}><b>저장</b></button>}>
      <div className="section">
        <h2>컷</h2>
        <FrameRangeStrip count={f.count} frames={f.frames} range={range} onRange={setRange}
          caption={(n) => { const l = f.timeline[n - 1]?.location; return l ? (l.name || '미상') : undefined }} />
        <p className="footnote">처음 누른 컷부터 다음에 누른 컷까지 이 장소로 바꿔요. 컷 아래는 지금 기록된 장소예요.</p>
      </div>
      <div className="section"><div className="group">
        <label className="toggle"><span>장소 미상</span>
          <input type="checkbox" className="switch" checked={unknown} onChange={(e) => setUnknown(e.target.checked)} /></label>
      </div></div>
      {!unknown && <PlacePicker name={name} point={point} onChange={(n, p) => { setName(n); setPoint(p) }} />}
      <div className="section">
        <h2>메모</h2>
        <div className="group"><div className="field">
          <textarea className="input" value={memo} onChange={(e) => setMemo(e.target.value)} aria-label="메모" />
        </div></div>
      </div>
      {segment && <div className="group"><button className="row" style={{ color: '#c0392b' }} onClick={() => setConfirm(true)}><Icon name="trash" /> 장소 삭제</button></div>}
      {confirm && segment && (
        <Confirm message="이 장소를 삭제할까요?" onCancel={() => setConfirm(false)}
          onConfirm={async () => { await db.rolls.update(roll.id, { locations: roll.locations.filter((l) => l.id !== segment.id) }); onClose() }} />
      )}
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
export function LabField({ value, onChange, id = 'lab-name' }: { value: string; onChange: (v: string) => void; id?: string }) {
  const rolls = useLiveQuery(() => db.rolls.toArray(), []) ?? []
  const [rev, setRev] = useState(0)
  const labs = useMemo(() => { void rev; return recentLabs(rolls) }, [rolls, rev])
  return (
    <>
      <div className="field">
        <label htmlFor={id}>현상소</label>
        <input id={id} className="input" value={value} placeholder="현상소 이름" onChange={(e) => onChange(e.target.value)} />
      </div>
      {labs.length > 0 && (
        <div className="suggest">
          {labs.map((l) => (
            <span key={l} className={`chip-row ${l === value ? 'active' : ''}`}>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => onChange(l)}>{l}</button>
              <button type="button" className="chip-x" aria-label={`${l} 추천 지우기`} onClick={() => { forgetSuggestion('labs', l); setRev((n) => n + 1) }}>×</button>
            </span>
          ))}
        </div>
      )}
    </>
  )
}

export function LabDropOff({ roll, onClose }: { roll: Roll; onClose: (ended?: boolean) => void }) {
  const [lab, setLab] = useState(roll.lab ?? '')
  const [date, setDate] = useState(roll.droppedAt ?? Date.now())
  const [nearby, setNearby] = useState(false)
  const wasLoaded = useRef(roll.status === 'loaded').current

  // 취소: 아무것도 바꾸지 않는다 (촬영 중이던 롤은 그대로 촬영 중). 저장해야만 현상 맡김으로 넘어간다
  const close = () => onClose(false)

  const save = async () => {
    rememberLab(lab)
    await db.rolls.update(roll.id, {
      lab: lab.trim() || undefined, droppedAt: date,
      status: roll.status === 'loaded' || roll.status === 'finished' ? 'atLab' : roll.status,
      finishedAt: roll.finishedAt ?? date,
    })
    onClose(wasLoaded)
  }

  return (
    <Sheet page title="현상소 고르기" onClose={close} left={<button className="btn" onClick={close}>취소</button>} right={<button className="btn ghost" onClick={save}><b>저장</b></button>}>
      <div className="section">
        <h2>현상소</h2>
        <div className="group">
          <LabField value={lab} onChange={setLab} />
          {features.nearbyLabs && <button className="row accent" onClick={() => setNearby(true)}><Icon name="pin" /> 가까운 현상소 찾기</button>}
        </div>
      </div>
      {nearby && <NearbyLabs onPick={(name) => { setLab(name); setNearby(false) }} onClose={() => setNearby(false)} />}
      <div className="section"><div className="group"><div className="field">
        <label htmlFor="lab-date">맡긴 날</label>
        <input id="lab-date" type="date" className="input" value={toInputDate(date)}
          onChange={(e) => e.target.value && setDate(new Date(`${e.target.value}T12:00:00`).getTime())} />
      </div></div></div>
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
  const camera = useLiveQuery(() => (roll.cameraId ? db.cameras.get(roll.cameraId) : undefined), [roll.cameraId])
  const lenses = useLiveQuery(async () => (await db.lenses.toArray()).filter((l) => l.mount.toLowerCase() === mount.toLowerCase()), [mount]) ?? []
  const isFirst = change === 'first'
  const existing = typeof change === 'object' ? change : undefined
  const lastStart = Math.max(1, ...(roll.lensChanges ?? []).map((c) => c.startFrame))
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
      const list = existing ? (roll.lensChanges ?? []).map((c) => (c.id === existing.id ? value : c)) : [...(roll.lensChanges ?? []), value]
      await db.rolls.update(roll.id, { lensChanges: list.sort((a, b) => a.startFrame - b.startFrame) })
    }
    onClose()
  }

  return (
    <Sheet title={isFirst ? '처음 끼운 렌즈' : existing ? '렌즈 교체 수정' : '렌즈 바꿔 낌'} onClose={onClose}
      right={<button className="btn ghost" disabled={!ready} onClick={save}><b>저장</b></button>}>
      {!isFirst && (
        <div className="section"><div className="group">
          <Stepper label="바꾼 컷" value={Math.max(2, frame)} onChange={setFrame} min={2} max={frameMax(rollCameraFormat(camera, roll))} />
        </div></div>
      )}
      <div className="section">
        <h2>렌즈 · {mount}</h2>
        <div className="group">
          {lenses.map((l) => (
            <button key={l.id} className="row" onClick={() => setLensId(l.id)}>
              <span className="grow">{l.brand} {l.model}</span>
              {lensId === l.id && <Icon name="check" />}
            </button>
          ))}
          <button className="row accent" onClick={() => setLensId('__new')}>
            <Icon name="plus" /> <span className="grow">새 렌즈</span>{lensId === '__new' && <Icon name="check" />}
          </button>
          {lensId === '__new' && (
            <div className="field">
              <label htmlFor="lc-new">렌즈 이름</label>
              <input id="lc-new" className="input" value={newLens} autoComplete="off" onChange={(e) => setNewLens(e.target.value)} />
            </div>
          )}
        </div>
      </div>
      {existing && (
        <div className="group">
          <button className="row danger" onClick={() => setConfirm(true)}><Icon name="trash" /> 이 교체 기록 삭제</button>
        </div>
      )}
      {confirm && existing && (
        <Confirm message="이 렌즈 교체 기록을 지울까요?" onCancel={() => setConfirm(false)}
          onConfirm={async () => { await db.rolls.update(roll.id, { lensChanges: (roll.lensChanges ?? []).filter((c) => c.id !== existing.id) }); onClose() }} />
      )}
    </Sheet>
  )
}

/** 가까운 현상소 (public/labs.html: 지도 + 거리순 목록) */
function NearbyLabs({ onPick, onClose }: { onPick: (name: string) => void; onClose: () => void }) {
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.data?.source !== 'filmchest-labs') return
      if (e.data.type === 'pick') onPick(String(e.data.name ?? ''))
      else if (e.data.type === 'close') onClose()
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [onPick, onClose])
  return createPortal(
    <div className="meter-overlay"><iframe src={`${import.meta.env.BASE_URL}labs.html`} title="가까운 현상소" allow="geolocation" /></div>,
    document.body,
  )
}
