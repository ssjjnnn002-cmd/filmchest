import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, kept } from '../db'
import type { Roll } from '../core/types'
import { formatInfo, uid } from '../core/types'
import { allFilms, filmById, filmDisplayName, popularFilms } from '../core/films'
import { CustomFilmEdit } from './CustomFilmEdit'
import { lensesFor } from '../core/lenses'
import { CameraCover, Canister, Sheet, toInputDate } from '../ui/common'
import { currentPlace, locationAvailable, weatherAt } from '../platform'

export function LoadFilm({ initialCameraId, onClose }: { initialCameraId?: string; onClose: (loaded?: Roll) => void }) {
  const cameras = useLiveQuery(() => db.cameras.orderBy('sortOrder').filter((c) => !c.deletedAt).toArray(), [])
  const rollsLoaded = useLiveQuery(() => db.rolls.orderBy('loadedAt').reverse().toArray(), [])
  const rolls = rollsLoaded ?? []
  const allLenses = useLiveQuery(() => db.lenses.toArray(), []) ?? []
  const [cameraId, setCameraId] = useState(initialCameraId)
  const [filmId, setFilmId] = useState<string>()
  const [showAll, setShowAll] = useState(false)
  const [search, setSearch] = useState('')
  const [lensId, setLensId] = useState('')
  const [newLens, setNewLens] = useState('')
  const [push, setPush] = useState(0)
  const [today, setToday] = useState(true)
  const [startDay, setStartDay] = useState(toInputDate(Date.now()))
  const isToday = startDay === toInputDate(Date.now())
  // 내가 만든 필름 (바뀌면 다시 그리도록)
  const customRows = useLiveQuery(() => db.customFilms.toArray(), []) ?? []
  const [customEdit, setCustomEdit] = useState<string | 'new' | null>(null)

  // 필름이 없는 카메라를 앞에, 처음 고른 카메라는 맨 앞에
  const isLoaded = (id: string) => rolls.some((r) => r.cameraId === id && r.status === 'loaded')
  const pickOrder = useMemo(() => {
    const list = cameras ?? []
    if (initialCameraId) return [...list.filter((c) => c.id === initialCameraId), ...list.filter((c) => c.id !== initialCameraId)]
    return [...list.filter((c) => !isLoaded(c.id)), ...list.filter((c) => isLoaded(c.id))]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameras, rollsLoaded, initialCameraId])

  // 롤 기록까지 읽은 뒤에 기본 카메라를 고른다 (먼저 고르면 이미 장착된 카메라가 잡힌다)
  useEffect(() => {
    if (cameraId || !cameras?.length || !rollsLoaded) return
    setCameraId(pickOrder[0].id)
  }, [cameras, rollsLoaded, cameraId, pickOrder])

  const camera = cameras?.find((c) => c.id === cameraId)

  // 렌즈 교환식이면 그 카메라에 지난번 끼웠던 렌즈를 미리 고른다
  useEffect(() => {
    if (!camera?.mount || !rollsLoaded) return
    const last = rollsLoaded.find((r) => r.cameraId === camera.id && (r.lensChanges?.length || r.lensId))
    const lastLens = last ? ([...(last.lensChanges ?? [])].sort((a, b) => b.startFrame - a.startFrame)[0]?.lensId ?? last.lensId) : undefined
    setLensId(lastLens && allLenses.some((l) => l.id === lastLens) ? lastLens : '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera?.id, !!rollsLoaded, allLenses.length])
  const loaded = rolls.find((r) => kept(r) && r.cameraId === cameraId && r.status === 'loaded')
  const mountLenses = camera?.mount ? allLenses.filter((l) => l.mount.toLowerCase() === camera.mount!.toLowerCase()) : []
  const film = filmById(filmId)

  // 최근 쓴 순 → 기록이 없으면 많이 쓰는 필름 순
  const stocks = useMemo(() => {
    const fmt = camera?.format ?? '135'
    const recent = rolls.map((r) => r.filmId)
    const rank = (id: string) => [recent.indexOf(id) < 0 ? 1e9 : recent.indexOf(id), popularFilms.indexOf(id) < 0 ? 1e9 : popularFilms.indexOf(id)]
    return allFilms()
      .filter((f) => (fmt === '135-half' ? f.formats.includes('135') : f.formats.some((x) => formatInfo[x].is120 === formatInfo[fmt].is120)))
      .filter((f) => !search || filmDisplayName(f).toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => { const ra = rank(a.id), rb = rank(b.id); return ra[0] - rb[0] || ra[1] - rb[1] })
  }, [camera, rolls, search, customRows])

  const visible = useMemo(() => {
    if (showAll) return stocks
    const top = stocks.slice(0, 6)
    if (film && !top.includes(film) && stocks.includes(film)) top[5] = film
    return top
  }, [stocks, showAll, film])

  // 렌즈 교환식 카메라는 렌즈를 골라야 장착할 수 있다
  const lensReady = !camera?.mount || (lensId === '__new' ? !!newLens.trim() : !!lensId)
  const shotISO = film && push !== 0 ? Math.round(film.iso * 2 ** push) : undefined

  const load = async () => {
    if (!camera || !film) return
    let lens = mountLenses.find((l) => l.id === lensId)
    if (!lens && newLens.trim() && camera.mount) {
      lens = { id: uid(), brand: camera.brand, model: newLens.trim(), mount: camera.mount, createdAt: Date.now() }
      await db.lenses.add(lens)
    }
    if (loaded) await db.rolls.update(loaded.id, { status: 'finished', finishedAt: Date.now() })
    const now = Date.now()
    const start = isToday ? now : new Date(`${startDay}T12:00:00`).getTime()
    const roll: Roll = {
      id: uid(), cameraId: camera.id, cameraBrand: camera.brand, cameraModel: camera.model, cameraFormat: camera.format, cameraFixedLens: camera.fixedLens,
      lensId: lens?.id, filmId: film.id, shotISO, status: 'loaded', loadedAt: today ? start : now,
      days: today ? [{ id: uid(), startedAt: start, startFrame: 1 }] : [], locations: [], favorite: false, isArchive: false,
    }
    await db.rolls.add(roll)
    onClose(roll)
    // 위치는 창을 닫은 뒤 채운다
    if (today && isToday && locationAvailable()) {
      const place = await currentPlace()
      if (place) await db.rolls.update(roll.id, { locations: [{ id: uid(), startFrame: 1, name: place.name, point: place.point, weather: weatherAt(place.point) }] })
    }
  }

  return (
    <Sheet title="필름 장착하기" onClose={() => onClose()}
      right={<button className="btn ghost" disabled={!camera || !film || !lensReady} onClick={load}><b>장착</b></button>}>
      <div className="section">
        <h2>카메라</h2>
        {cameras?.length === 0 && <p className="footnote">먼저 내 장비에서 카메라를 추가해 주세요.</p>}
        <div className="chips">
          {pickOrder.map((c) => {
            const inUse = rolls.find((r) => r.cameraId === c.id && r.status === 'loaded')
            return (
              <button key={c.id} className={`camera-pick ${c.id === cameraId ? 'on' : ''}`} onClick={() => { setCameraId(c.id); setLensId('') }}>
                <CameraCover camera={c} height={56} />
                <span className="truncate" style={{ maxWidth: '100%' }}>{c.brand} {c.model}</span>
                {inUse && <span className="truncate" style={{ color: 'var(--safelight)', maxWidth: '100%' }}>{filmDisplayName(filmById(inUse.filmId))}</span>}
              </button>
            )
          })}
        </div>
        {loaded && <p className="footnote warn">지금 장착된 필름은 '촬영 완료'로 바뀌어요.</p>}
      </div>

      {camera?.mount && (
        <div className="section">
          <h2>렌즈 · {camera.mount}</h2>
          <div className="group">
            <div className="field">
              <label htmlFor="lf-lens">렌즈</label>
              <select id="lf-lens" className="input" value={lensId} onChange={(e) => setLensId(e.target.value)}>
                <option value="" disabled>렌즈 고르기</option>
                {mountLenses.map((l) => <option key={l.id} value={l.id}>{l.brand} {l.model}</option>)}
                <option value="__new">새 렌즈 추가…</option>
              </select>
            </div>
            {lensId === '__new' && (
              <>
                <div className="field">
                  <label htmlFor="lf-newlens">새 렌즈</label>
                  <input id="lf-newlens" className="input" value={newLens} onChange={(e) => setNewLens(e.target.value)} autoComplete="off" />
                </div>
                <div className="suggest">
                  {lensesFor(camera.mount, newLens).slice(0, 8).map((l) => (
                    <button key={l} className="chip" onClick={() => setNewLens(l)}>{l}</button>
                  ))}
                </div>
              </>
            )}
          </div>
          {!lensReady && <p className="footnote warn">끼운 렌즈를 골라 주세요. 중간에 바꿔 끼우면 롤 화면에서 기록할 수 있어요.</p>}
        </div>
      )}

      <div className="section">
        <h2>{showAll ? '필름' : '필름 · 최근 사용'}</h2>
        <div className="group">
          {showAll && (
            <div className="field">
              <label htmlFor="film-q">필름 검색</label>
              <input id="film-q" className="input" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          )}
          <div className="film-grid">
            {visible.map((f) => (
              <button key={f.id} className={`film-pick ${f.id === filmId ? 'on' : ''}`} onClick={() => setFilmId(f.id)}>
                <Canister film={f} format={camera?.format} size={84} />
                <span>{filmDisplayName(f)}</span>
              </button>
            ))}
            <button className="film-pick custom-add" onClick={() => setCustomEdit('new')}>
              <span className="custom-plus" aria-hidden="true">+</span>
              <span>직접 추가</span>
            </button>
          </div>
          {film?.id.startsWith('custom-') && (
            <button className="row accent" style={{ justifyContent: 'center' }} onClick={() => setCustomEdit(film.id)}>
              {filmDisplayName(film)} 수정
            </button>
          )}
          <button className="row" style={{ justifyContent: 'center', color: 'var(--safelight)' }}
            onClick={() => { setShowAll(!showAll); setSearch('') }}>
            {showAll ? '접기' : `더보기 (${stocks.length}종)`}
          </button>
        </div>
      </div>

      {film && (
        <div className="section">
          <div className="group">
            <div className="toggle">
              <span>감도</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button className="btn small" onClick={() => setPush(Math.max(-2, push - 1))} aria-label="감도 낮추기">−</button>
                <b style={{ minWidth: 110, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
                  ISO {shotISO ?? film.iso}{push !== 0 && ` (${push > 0 ? '+' : ''}${push})`}
                </b>
                <button className="btn small" onClick={() => setPush(Math.min(3, push + 1))} aria-label="감도 높이기">+</button>
              </span>
            </div>
            <label className="toggle">
              <span>첫 촬영일 추가</span>
              <input type="checkbox" className="switch" checked={today} onChange={(e) => setToday(e.target.checked)} />
            </label>
            {today && (
              <div className="field">
                <label htmlFor="start-day">날짜</label>
                <input id="start-day" type="date" className="input" max={toInputDate(Date.now())} value={startDay}
                  onChange={(e) => setStartDay(e.target.value || toInputDate(Date.now()))} />
              </div>
            )}
          </div>
          {today && isToday && <p className="footnote">{locationAvailable() ? '지금 시각과 현재 위치를 첫 촬영일로 기록해요.' : '지금 시각을 첫 촬영일로 기록해요. 장소는 롤 화면에서 넣을 수 있어요.'}</p>}
        </div>
      )}
      {customEdit && (
        <CustomFilmEdit row={customEdit === 'new' ? undefined : customRows.find((r) => r.id === customEdit)}
          onClose={(saved) => { setCustomEdit(null); if (saved !== undefined) setFilmId(saved || undefined) }} />
      )}
    </Sheet>
  )
}
