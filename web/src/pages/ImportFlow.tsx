import { createPortal } from 'react-dom'
import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { useNav } from '../App'
import type { Roll } from '../core/types'
import { uid, lensIdAt } from '../core/types'
import { allFilms, filmDisplayName } from '../core/films'
import { readFiles, type ScanResult } from '../core/zip'
import { readScanner } from '../core/exif'
import { buildTimeline, type FrameInfo } from '../core/timeline'
import { exposureText, meterAlignLimit, meterAlignText, meterFrameTitle, meterShotsInScan } from '../core/meter'
import { importScans } from '../core/importer'
import { Canister, cameraName, Progress, Sheet, bytesText, fmtDay, rollCameraFormat, rollFilm, rollFilmName, rollTitle, toInputDate } from '../ui/common'
import { RollRow } from '../ui/RollRow'
import { RollGalleryButton } from '../ui/GallerySave'
import { LabField, rememberLab } from './Editors'
import { features } from '../core/features'

type Phase = 'analyzing' | 'pick' | 'confirm' | 'saving' | 'done' | 'error'

export function ImportFlow({ files, rollId, onClose }: { files: File[]; rollId?: string; onClose: () => void }) {
  const nav = useNav()
  const rolls = useLiveQuery(() => db.rolls.toArray(), []) ?? []
  const [phase, setPhase] = useState<Phase>('analyzing')
  const [scan, setScan] = useState<ScanResult>()
  const [setIndex, setSetIndex] = useState(0)
  const [roll, setRoll] = useState<Roll>()
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [error, setError] = useState<string>()
  const [thumbs, setThumbs] = useState<string[]>([])
  const [quick, setQuick] = useState(false)

  useEffect(() => {
    let urls: string[] = []
    readFiles(files).then(async (r) => {
      setScan(r)
      const pre = rollId ? await db.rolls.get(rollId) : undefined
      setRoll(pre)
      setPhase(pre ? 'confirm' : 'pick')
      urls = r.primary.files.slice(0, 12).map((f) => URL.createObjectURL(new Blob([f.data])))
      setThumbs(urls)
    }).catch((e: Error) => { setError(e.message || 'zip 파일을 열 수 없어요.'); setPhase('error') })
    return () => urls.forEach(URL.revokeObjectURL)
  }, [files, rollId])

  const sets = scan ? [scan.primary, ...scan.alternatives] : []
  const set = sets[setIndex]
  const scanner = useMemo(() => (set ? readScanner(set.files[0].data).name : undefined), [set])
  const order: Record<string, number> = { atLab: 0, finished: 1, loaded: 2 }
  const candidates = rolls.filter((r) => !r.deletedAt && r.status !== 'imported').sort((a, b) => order[a.status] - order[b.status] || b.loadedAt - a.loadedAt)

  const save = async (meterOffset = 0) => {
    if (!roll || !set) return
    setPhase('saving')
    setProgress({ done: 0, total: set.files.length })
    try {
      const camera = roll.cameraId ? await db.cameras.get(roll.cameraId) : undefined
      const lensMap = new Map((await db.lenses.toArray()).map((l) => [l.id, l]))
      const lensAt = (frame: number) => { const id = lensIdAt(roll, frame); return id ? lensMap.get(id) : undefined }
      const updated = await importScans(set, roll, camera, lensAt, setProgress, meterOffset)
      setRoll(updated)
      setPhase('done')
    } catch (e) {
      setError(`저장하지 못했어요. 브라우저 저장 공간이 부족할 수 있어요. (${(e as Error).message})`)
      setPhase('error')
    }
  }

  const saveCamera = useLiveQuery(() => (roll?.cameraId ? db.cameras.get(roll.cameraId) : undefined), [roll?.cameraId])

  return (
    <Sheet title="스캔 불러오기" onClose={onClose} left={phase === 'saving' ? <span /> : undefined}>
      {phase === 'analyzing' && <div className="empty"><div className="spinner" /><span>스캔 파일 확인 중…</span></div>}
      {phase === 'error' && <div className="empty"><b>불러오지 못했어요</b><span>{error}</span></div>}

      {scan && phase === 'pick' && (
        <>
          <Summary thumbs={thumbs} count={scan.primary.files.length} scanner={scanner} />
          <div className="section">
            <h2>어느 롤인가요?</h2>
            <div className="group">
              {candidates.length === 0 && <div className="row static sub">기록해 둔 롤이 없어요. 아래에서 바로 기록할 수 있어요.</div>}
              {candidates.map((r) => (
                <button key={r.id} className="row" onClick={() => { setRoll(r); setPhase('confirm') }}><RollRow roll={r} /></button>
              ))}
            </div>
          </div>
          <div className="group">
            <button className="row" style={{ color: 'var(--safelight)' }} onClick={() => setQuick(true)}>+ 기록 없이 새 롤로 저장</button>
          </div>
        </>
      )}

      {roll && set && phase === 'confirm' && (
        <Confirmation roll={roll} sets={sets} setIndex={setIndex} onSetIndex={setSetIndex} scanner={scanner}
          onChangeRoll={rollId ? undefined : () => setPhase('pick')} onSave={save} />
      )}

      {phase === 'saving' && (
        <div className="empty" style={{ paddingInline: 24 }}>
          <b>사진에 촬영 정보 기록 중</b>
          <div style={{ width: '100%' }}><Progress done={progress.done} total={progress.total} /></div>
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>{progress.done} / {progress.total}</span>
        </div>
      )}

      {phase === 'done' && roll && (
        <div className="empty">
          <Canister film={rollFilm(roll)} size={110} />
          <b>{roll.frameCount}장 기록 완료</b>
          <span>롤 보관함에 기록했어요. 갤러리에 저장을 누르면 공유 창이 열려요. 이미지 저장을 고르면 사진 앱 최근 항목에 들어가요.</span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            <RollGalleryButton rollId={roll.id} title={rollTitle(roll, saveCamera)} onToast={nav.toast} />
            <button className="btn" onClick={() => { onClose(); nav.setTab('rolls'); nav.push({ type: 'roll', id: roll.id }, 'rolls') }}>롤 보기</button>
          </div>
        </div>
      )}

      {quick && <QuickRoll onClose={() => setQuick(false)} onCreate={(r) => { setQuick(false); setRoll(r); setPhase('confirm') }} />}
    </Sheet>
  )
}

function Summary({ thumbs, count, scanner }: { thumbs: string[]; count: number; scanner?: string }) {
  return (
    <div className="section">
      {thumbs.length > 0 && (
        <div className="strip" style={{ padding: 6, gap: 4 }}>
          {thumbs.map((u, i) => <img key={i} src={u} alt="" style={{ width: 66, height: 44, objectFit: 'cover', flex: '0 0 auto' }} />)}
        </div>
      )}
      <div className="sub" style={{ display: 'flex', justifyContent: 'space-between', paddingInline: 4 }}>
        <span>{count}장</span><span>{scanner ?? ''}</span>
      </div>
    </div>
  )
}

function ranges(timeline: FrameInfo[], key: (f: FrameInfo) => string) {
  const out: { key: string; start: number; end: number }[] = []
  for (const f of timeline) {
    const k = key(f)
    const last = out.at(-1)
    if (last && last.key === k) last.end = f.frame
    else out.push({ key: k, start: f.frame, end: f.frame })
  }
  return out.map((r) => ({ label: r.key, frames: r.start === r.end ? `${r.start}번` : `${r.start}–${r.end}번` }))
}

function Confirmation({ roll, sets, setIndex, onSetIndex, scanner, onChangeRoll, onSave }: {
  roll: Roll; sets: ScanResult['primary'][]; setIndex: number; onSetIndex: (i: number) => void; scanner?: string
  onChangeRoll?: () => void; onSave: (meterOffset: number) => void
}) {
  const camera = useLiveQuery(() => (roll.cameraId ? db.cameras.get(roll.cameraId) : undefined), [roll.cameraId])
  const [offset, setOffset] = useState(features.frameShift ? roll.meterOffset ?? 0 : 0)
  const count = sets[setIndex].files.length
  const unknownDate = roll.isArchive && roll.days.length === 0
  const timeline = buildTimeline(roll, count)
  const noPoint = roll.locations.find((l) => !l.point)
  const outOfRange = roll.locations.find((l) => l.startFrame > count)
  return (
    <>
      <div className="section">
        <div className="group">
          <div className="row static">
            <Canister film={rollFilm(roll)} format={rollCameraFormat(camera, roll)} size={64} />
            <div className="grow">
              <b>{rollFilmName(roll)}</b>
              <div className="sub">{cameraName(camera, roll)}</div>
              {roll.lab && <div className="sub">{roll.lab}</div>}
            </div>
            {onChangeRoll && <button className="btn ghost small" onClick={onChangeRoll}>다른 롤</button>}
          </div>
        </div>
      </div>
      {sets.length > 1 && (
        <div className="section">
          <h2>저장할 파일</h2>
          <div className="group">
            {sets.map((s, i) => (
              <button key={i} className="row" onClick={() => onSetIndex(i)}>
                <span className="grow">{s.label} · {s.files.length}장 · {bytesText(s.totalBytes)}</span>
                {i === setIndex && <span style={{ color: 'var(--safelight)' }}>✓</span>}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="section">
        <h2>촬영일</h2>
        <div className="group">
          {unknownDate
            ? <div className="row static"><span className="grow">알 수 없음</span><span className="value">원본 날짜 유지</span></div>
            : ranges(timeline, (f) => fmtDay(f.date)).map((r) => (
              <div key={r.label + r.frames} className="row static"><span className="grow">{r.label}</span><span className="value">{r.frames}</span></div>
            ))}
        </div>
      </div>
      <div className="section">
        <h2>사진 {count}장</h2>
        <ScanStrip files={sets[setIndex].files} />
        <p className="footnote">눌러서 크게 볼 수 있어요.</p>
      </div>
      <ExposureMap roll={roll} count={count} offset={offset} onOffset={setOffset} />
      {roll.locations.length > 0 && (
        <div className="section">
          <h2>장소</h2>
          <div className="group">
            {ranges(timeline, (f) => f.location?.name || '기록 없음').map((r) => (
              <div key={r.label + r.frames} className="row static"><span className="grow">{r.label}</span><span className="value">{r.frames}</span></div>
            ))}
          </div>
          {noPoint && <p className="footnote warn">'{noPoint.name || '장소'}'는 좌표가 없어 사진에 위치가 기록되지 않아요. 롤 화면에서 좌표를 넣을 수 있어요.</p>}
          {outOfRange && <p className="footnote warn">'{outOfRange.name}'는 {outOfRange.startFrame}번부터로 기록했는데 스캔은 {count}장이에요.</p>}
        </div>
      )}
      {scanner && <p className="footnote">스캐너: {scanner}</p>}
      <button className="btn primary block" style={{ marginTop: 8 }} onClick={() => onSave(offset)}>{count}장에 촬영 정보 기록하기</button>
      <p className="footnote" style={{ textAlign: 'center' }}>사진은 이 기기 브라우저 안에서만 처리돼요. 어디에도 올라가지 않아요.</p>
    </>
  )
}

function ExposureMap({ roll, count, offset, onOffset }: { roll: Roll; count: number; offset: number; onOffset: (n: number) => void }) {
  const matched = meterShotsInScan(roll.meterShots, count, offset)
  const recorded = roll.meterShots?.length ?? 0
  if (!recorded) return null
  const nudge = (d: number) => onOffset(Math.min(meterAlignLimit, Math.max(-meterAlignLimit, offset + d)))
  return (
    <div className="section">
      <h2>노출</h2>
      <div className="group">
        {features.frameShift && <div className="row static">
          <span className="grow">번호 맞추기</span>
          <button className="btn small" aria-label="한 칸 앞으로" disabled={offset <= -meterAlignLimit} onClick={() => nudge(-1)}>−</button>
          <span className="value" style={{ minWidth: 28, textAlign: 'center' }}>{offset > 0 ? `+${offset}` : offset}</span>
          <button className="btn small" aria-label="한 칸 뒤로" disabled={offset >= meterAlignLimit} onClick={() => nudge(1)}>+</button>
        </div>}
        {matched.map((s) => (
          <div key={s.pos} className="row static">
            <span className="grow">
              {s.pos + offset}번 사진
              <div className="sub">노출계 {meterFrameTitle(s.pos, !!roll.meterPrewind)}</div>
            </span>
            <span className="value">{exposureText(s)}</span>
          </div>
        ))}
      </div>
      <p className="footnote">{features.frameShift ? `${meterAlignText(offset)} 현상소 번호가 다르면 한 칸씩 옮기세요. 기록 없는 칸은 비워요.` : '같은 번호의 사진에 붙어요. 기록 없는 칸은 비워요.'}</p>
      {recorded > matched.length ? (
        <p className="footnote warn">기록 {recorded}장 중 {recorded - matched.length}장은 이 맞춤에서는 사진 밖에 있어요.</p>
      ) : null}
    </div>
  )
}

/** 미리 기록하지 않은 롤을 즉석에서 */
function QuickRoll({ onClose, onCreate }: { onClose: () => void; onCreate: (r: Roll) => void }) {
  const cameras = useLiveQuery(() => db.cameras.orderBy('sortOrder').filter((c) => !c.deletedAt).toArray(), []) ?? []
  const [cameraId, setCameraId] = useState('')
  const [filmId, setFilmId] = useState(allFilms()[0].id)
  const [date, setDate] = useState(Date.now())
  const [place, setPlace] = useState('')
  const [lab, setLab] = useState('')
  const create = async () => {
    rememberLab(lab)
    const camera = cameras.find((c) => c.id === cameraId)
    const r: Roll = {
      id: uid(), cameraId: camera?.id, cameraBrand: camera?.brand, cameraModel: camera?.model, cameraFormat: camera?.format, cameraFixedLens: camera?.fixedLens,
      filmId, status: 'atLab', loadedAt: date,
      days: [{ id: uid(), startedAt: date, startFrame: 1 }],
      locations: place.trim() ? [{ id: uid(), startFrame: 1, name: place.trim() }] : [],
      lab: lab.trim() || undefined, favorite: false, isArchive: false,
    }
    await db.rolls.add(r)
    onCreate(r)
  }
  return (
    <Sheet title="새 롤" onClose={onClose} right={<button className="btn ghost" onClick={create}><b>다음</b></button>}>
      <div className="section"><div className="group">
        <div className="field"><label htmlFor="q-cam">카메라</label>
          <select id="q-cam" className="input" value={cameraId} onChange={(e) => setCameraId(e.target.value)}>
            <option value="">알 수 없음</option>
            {cameras.map((c) => <option key={c.id} value={c.id}>{c.brand} {c.model}</option>)}
          </select></div>
        <div className="field"><label htmlFor="q-film">필름</label>
          <select id="q-film" className="input" value={filmId} onChange={(e) => setFilmId(e.target.value)}>
            {allFilms().map((f) => <option key={f.id} value={f.id}>{filmDisplayName(f)}</option>)}
          </select></div>
        <div className="field"><label htmlFor="q-date">촬영일</label>
          <input id="q-date" type="date" className="input" value={toInputDate(date)}
            onChange={(e) => e.target.value && setDate(new Date(`${e.target.value}T12:00:00`).getTime())} /></div>
        <div className="field"><label htmlFor="q-place">장소 (선택)</label>
          <input id="q-place" className="input" value={place} onChange={(e) => setPlace(e.target.value)} /></div>
        <LabField id="q-lab" value={lab} onChange={setLab} />
      </div></div>
    </Sheet>
  )
}

/** 가져올 사진 전체를 번호와 함께 훑어본다. 누르면 크게. */
export function ScanStrip({ files }: { files: { name: string; data: Uint8Array; type: string }[] }) {
  const urls = useMemo(() => files.map((f) => (/^(jpe?g|png|webp|heic|heif)$/.test(f.type) ? URL.createObjectURL(new Blob([f.data as BlobPart], { type: f.type === 'png' ? 'image/png' : 'image/jpeg' })) : '')), [files])
  useEffect(() => () => urls.forEach((u) => u && URL.revokeObjectURL(u)), [urls])
  const [open, setOpen] = useState<number | null>(null)
  return (
    <>
      <div className="strip" style={{ padding: 6, gap: 6 }}>
        {urls.map((u, i) => (
          <button key={i} onClick={() => setOpen(i)} style={{ flex: '0 0 auto', border: 0, padding: 0, background: 'none', display: 'grid', gap: 3, justifyItems: 'center', color: 'var(--edge-ink)', fontSize: 11 }}>
            {u ? <img src={u} alt="" loading="lazy" style={{ width: 96, height: 66, objectFit: 'cover', borderRadius: 6 }} />
              : <span style={{ width: 96, height: 66, display: 'grid', placeItems: 'center', background: '#000', borderRadius: 6 }}>{files[i].type.toUpperCase()}</span>}
            <span>{i + 1}</span>
          </button>
        ))}
      </div>
      {open !== null && createPortal(
        <div className="fullscreen dark" role="dialog" aria-label="사진 미리보기" onClick={() => setOpen(null)}>
          <div className="fs-bar">
            <button className="btn ghost" onClick={() => setOpen(null)}>닫기</button>
            <h2>{open + 1} / {urls.length}</h2>
            <span />
          </div>
          <div style={{ display: 'grid', placeItems: 'center', minHeight: 0, position: 'relative' }} onClick={(e) => e.stopPropagation()}>
            {urls[open] ? <img src={urls[open]} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} /> : <span>미리 볼 수 없는 형식이에요</span>}
            <button className="btn ghost icon-btn" aria-label="이전" disabled={open === 0} onClick={() => setOpen(open - 1)}
              style={{ position: 'absolute', left: 8, top: '50%', color: '#fff', background: 'rgb(0 0 0 / 0.4)' }}>‹</button>
            <button className="btn ghost icon-btn" aria-label="다음" disabled={open === urls.length - 1} onClick={() => setOpen(open + 1)}
              style={{ position: 'absolute', right: 8, top: '50%', color: '#fff', background: 'rgb(0 0 0 / 0.4)' }}>›</button>
          </div>
          <div />
        </div>,
        document.body,
      )}
    </>
  )
}
