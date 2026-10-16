import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import type { GeoPoint, Lens, LocationSegment, Roll, ShootingDay } from '../core/types'
import { formatInfo, uid } from '../core/types'
import { Confirm, Icon, Sheet, rollCameraFormat, sortedLocations, toInputDate, toInputDateTime } from '../ui/common'
import { currentPlace, locationAvailable, parseCoordinates, placeSearchAvailable, searchPlaces, type Place, weatherAt } from '../platform'
import { forgetSuggestion, hiddenSet, rememberSuggestion } from '../suggest'

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
    <Sheet title={day ? '촬영일 수정' : '촬영일 추가'} onClose={onClose} right={<button className="btn ghost" onClick={save}><b>저장</b></button>}>
      <div className="section">
        <div className="group">
          <div className="field">
            <label htmlFor="day-date">촬영 시작</label>
            <input id="day-date" type="datetime-local" className="input" value={toInputDateTime(date)}
              onChange={(e) => e.target.value && setDate(new Date(e.target.value).getTime())} />
          </div>
          <label className="toggle">
            <span>카운터 확인</span>
            <input type="checkbox" className="switch" checked={knows} onChange={(e) => setKnows(e.target.checked)} />
          </label>
          {knows && <Stepper label="카운터" value={frame} onChange={setFrame} max={frameMax(rollCameraFormat(camera, roll))} />}
        </div>
        <p className="footnote">카메라 카운터에 보이는 숫자예요. 모르면 끄세요. 스캔을 불러올 때 촬영일끼리 고르게 나눠요.</p>
      </div>
      {!day && (
        <>
          <PlacePicker name={name} point={point} onChange={(n, p) => { setName(n); setPoint(p) }} />
          <div className="section">
            <h2>메모</h2>
            <div className="group"><div className="field">
              <textarea id="day-memo" className="input" value={memo} onChange={(e) => setMemo(e.target.value)} aria-label="메모" />
            </div></div>
          </div>
        </>
      )}
      {day && <div className="group"><button className="row" style={{ color: '#c0392b' }} onClick={() => setConfirm(true)}><Icon name="trash" /> 촬영일 삭제</button></div>}
      {confirm && day && (
        <Confirm message="이 촬영일을 삭제할까요?" onCancel={() => setConfirm(false)}
          onConfirm={async () => { await db.rolls.update(roll.id, { days: roll.days.filter((d) => d.id !== day.id) }); onClose() }} />
      )}
    </Sheet>
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
      right={<button className="btn ghost" disabled={!name.trim() && !point && !memo.trim()} onClick={save}><b>저장</b></button>}>
      <div className="section"><div className="group">
        <Stepper label="시작 컷" value={frame} onChange={setFrame} max={frameMax(rollCameraFormat(camera, roll))} />
      </div></div>
      <PlacePicker name={name} point={point} onChange={(n, p) => { setName(n); setPoint(p) }} />
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

export function LabDropOff({ roll, onClose }: { roll: Roll; onClose: () => void }) {
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
    <Sheet title="현상 맡기기" onClose={close} right={<button className="btn ghost" onClick={save}><b>저장</b></button>}>
      <div className="section">
        <h2>현상소</h2>
        <div className="group">
          <LabField value={lab} onChange={setLab} />
          <button className="row accent" onClick={() => setNearby(true)}><Icon name="pin" /> 가까운 현상소 찾기</button>
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
