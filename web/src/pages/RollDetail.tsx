import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, deleteRoll } from '../db'
import { useNav } from '../App'
import { weatherText, type FilmFormat, type LocationSegment, type Roll, type ShootingDay } from '../core/types'
import { features } from '../core/features'
import { exposureText, meterProgress, meterShotMeta, meterShotsByOrder } from '../core/meter'
import { RollGalleryButton } from '../ui/GallerySave'
import { Canister, cameraName, Confirm, GlassGroup, Icon, PageHeader, StatusBadge, bytesText, dateRangeText, fmtDay, fmtDayTime, resolutionText, rollCameraFormat, rollFilm, rollFilmName, rollTitle, sortedDays, sortedLocations } from '../ui/common'
import { DayEdit, LabDropOff, LensChangeEdit, PlaceEdit } from './Editors'
import { RollProjects } from './Projects'
import { TagField } from '../ui/gearExtras'
import { FramePrint } from './FramePrint'
import { ContactSheetView, FilmStrip, FrameViewer } from './RollViewers'
import { ScanButton } from './Pending'

export function RollDetail({ id }: { id: string }) {
  const nav = useNav()
  const roll = useLiveQuery(() => db.rolls.get(id), [id])
  const frames = useLiveQuery(() => db.frames.where('rollId').equals(id).sortBy('index'), [id]) ?? []
  const camera = useLiveQuery(() => (roll?.cameraId ? db.cameras.get(roll.cameraId) : undefined), [roll?.cameraId])
  const lens = useLiveQuery(() => (roll?.lensId ? db.lenses.get(roll.lensId) : undefined), [roll?.lensId])
  const allLenses = useLiveQuery(() => db.lenses.toArray(), []) ?? []
  const lensName = (id?: string) => { const l = allLenses.find((x) => x.id === id); return l ? `${l.brand} ${l.model}` : '렌즈 모름' }
  const [lensEdit, setLensEdit] = useState<'first' | 'new' | { id: string; startFrame: number; lensId: string } | null>(null)
  const [day, setDay] = useState<ShootingDay | 'new' | null>(null)
  const [place, setPlace] = useState<LocationSegment | 'new' | null>(null)
  const [dropOff, setDropOff] = useState(false)
  const [viewing, setViewing] = useState<number | null>(null)
  const [sheet, setSheet] = useState(false)
  const [framePrint, setFramePrint] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [tab, setTab] = useState<'log' | 'meter' | null>(null)

  if (!roll) return null
  const view = tab ?? 'log'
  const locs = sortedLocations(roll)
  const rangeOf = (i: number) => {
    const s = locs[i].startFrame
    const end = i + 1 < locs.length ? locs[i + 1].startFrame - 1 : roll.frameCount
    if (end && end > s) return `${s}–${end}번`
    if (end === s) return `${s}번`
    return `${s}번부터`
  }

  return (
    <>
      <PageHeader title={rollFilmName(roll)} onBack={nav.pop}
        actions={
          <GlassGroup>
            <button aria-label={roll.favorite ? '즐겨찾기 해제' : '즐겨찾기'} style={{ color: roll.favorite ? '#f5b700' : 'var(--ink)' }}
              onClick={() => db.rolls.update(id, { favorite: !roll.favorite })}>
              <svg width="23" height="23" viewBox="0 0 24 24" fill={roll.favorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />
              </svg>
            </button>
            <button aria-label="롤 삭제" onClick={() => setConfirm(true)}><Icon name="trash" /></button>
          </GlassGroup>
        } />

      <div style={{ display: 'flex', gap: 16, alignItems: 'center', margin: '0 4px 8px' }}>
        <Canister film={rollFilm(roll)} format={rollCameraFormat(camera, roll)} size={104} />
        <div style={{ display: 'grid', gap: 3, minWidth: 0, justifyItems: 'start' }}>
          <StatusBadge status={roll.status} />
          <h2 style={{ fontSize: 22, fontWeight: 700 }}>{rollFilmName(roll)}{roll.shotISO ? ` @ ISO ${roll.shotISO}` : ''}</h2>
          <span>{cameraName(camera, roll)}</span>
          {(lens || camera?.fixedLens || roll.cameraFixedLens) && (
            <span className="sub">
              {lens ? `${lens.brand} ${lens.model}` : camera?.fixedLens || roll.cameraFixedLens}
              {roll.lensChanges?.length ? ` 외 렌즈 ${roll.lensChanges.length}번 교체` : ''}
            </span>
          )}
          <span className="sub">{dateRangeText(roll)}</span>
        </div>
      </div>

      {features.meter && <div className="segmented" role="tablist" aria-label="롤 내용" style={{ margin: '8px 0 4px' }}>
        <button role="tab" aria-selected={view === 'log'} className={view === 'log' ? 'on' : ''} onClick={() => setTab('log')}>기록</button>
        <button role="tab" aria-selected={view === 'meter'} className={view === 'meter' ? 'on' : ''} onClick={() => setTab('meter')}>노출</button>
      </div>}

      {view === 'meter' ? <MeterPanel roll={roll} format={rollCameraFormat(camera, roll)} /> : null}

      {view === 'log' && roll.status === 'imported' && frames.length > 0 && (
        <div className="section">
          <div className="bleed"><FilmStrip roll={roll} frames={frames} onSelect={setViewing} /></div>
          <div style={{ display: 'grid', gap: 10 }}>
            <button className="btn soft" onClick={() => setSheet(true)}><Icon name="sheet" size={18} /> 밀착 인화지로 보기</button>
            <button className="btn soft" onClick={() => setFramePrint(true)}><Icon name="photos" size={18} /> 프레임 만들기</button>
            <RollGalleryButton rollId={roll.id} title={rollTitle(roll, camera)} onToast={nav.toast} className="btn primary block" />
          </div>
          <p className="footnote">공유 창에서 이미지 저장을 고르면 사진 앱 최근 항목에 들어가요.</p>
        </div>
      )}

      {view === 'log' && <>
      <div className="section">
        <h2>촬영일</h2>
        <div className="group">
          {sortedDays(roll).map((d) => (
            <button key={d.id} className="row" onClick={() => setDay(d)}>
              <span className="grow">{fmtDayTime(d.startedAt)}</span>
              <span className="value">{d.startFrame ? `${d.startFrame}번부터` : '컷 미확인'}</span>
            </button>
          ))}
          {roll.isArchive && roll.days.length === 0 && <div className="row static sub">알 수 없음 (원본 날짜 유지)</div>}
          <button className="row accent" onClick={() => setDay('new')}><Icon name="plus" /> 촬영일 추가</button>
        </div>
        {roll.days.length > 0 && <p className="footnote">눌러서 수정하거나 삭제할 수 있어요.</p>}
      </div>

      {camera?.mount && (
        <div className="section">
          <h2>렌즈</h2>
          <div className="group">
            <button className="row" onClick={() => setLensEdit('first')}>
              <span className="grow">{roll.lensId ? lensName(roll.lensId) : '렌즈 고르기'}</span>
              <span className="value">1번부터</span>
            </button>
            {[...(roll.lensChanges ?? [])].sort((a, b) => a.startFrame - b.startFrame).map((c) => (
              <button key={c.id} className="row" onClick={() => setLensEdit(c)}>
                <span className="grow">{lensName(c.lensId)}</span>
                <span className="value">{c.startFrame}번부터</span>
              </button>
            ))}
            <button className="row accent" onClick={() => setLensEdit('new')}><Icon name="plus" /> 렌즈 바꿔 낌</button>
          </div>
          <p className="footnote">중간에 렌즈를 바꿨다면 몇 번 컷부터인지 남겨 두세요. 사진마다 그때 렌즈가 기록돼요.</p>
        </div>
      )}

      <div className="section">
        <h2>장소</h2>
        <div className="group">
          {locs.map((l, i) => (
            <button key={l.id} className="row" onClick={() => setPlace(l)}>
              <span style={{ color: l.point ? 'var(--safelight)' : 'var(--warn)' }}><Icon name="pin" /></span>
              <span className="grow">
                {l.name || '장소 없음'}
                {l.memo && <div className="sub">{l.memo}</div>}
                {l.weather && <div className="sub">{weatherText(l.weather)}</div>}
                {!l.point && <div className="sub" style={{ color: 'var(--warn)' }}>좌표 없음</div>}
              </span>
              <span className="value">{rangeOf(i)}</span>
            </button>
          ))}
          <button className="row accent" onClick={() => setPlace('new')}><Icon name="plus" /> 장소 추가</button>
        </div>
        {locs.some((l) => !l.point) && <p className="footnote warn">주황색 장소는 좌표가 없어 사진에 위치가 기록되지 않아요. 눌러서 좌표를 넣어 주세요.</p>}
      </div>

      {(roll.lab || roll.droppedAt || roll.scanner || resolutionText(roll.scanW, roll.scanH) || roll.frameCount || roll.importedAt) && (
        <div className="section">
          <h2>현상 · 스캔</h2>
          <div className="group">
            {roll.lab && <Info label="현상소" value={roll.lab} />}
            {roll.droppedAt && <Info label="맡긴 날" value={fmtDay(roll.droppedAt)} />}
            {roll.scanner && <Info label="스캐너" value={roll.scanner} />}
            {resolutionText(roll.scanW, roll.scanH) && <Info label="해상도" value={resolutionText(roll.scanW, roll.scanH)!} />}
            {roll.frameCount && <Info label="스캔" value={[`${roll.frameCount}장`, roll.scanFormat, bytesText(roll.scanBytes)].filter(Boolean).join(' · ')} />}
            {roll.importedAt && <Info label="불러온 날" value={fmtDay(roll.importedAt)} />}
          </div>
        </div>
      )}

      <div className="section">
        <div className="action-stack">
          {roll.status === 'loaded' && <button className="btn primary" onClick={() => setDropOff(true)}>촬영 끝내기</button>}
          {roll.status === 'finished' && <>
            <button className="btn soft" onClick={() => setDropOff(true)}>현상 맡기기</button>
            <button className="btn" onClick={() => db.rolls.update(id, { status: 'loaded' })}>다시 촬영 중으로</button>
          </>}
          {roll.status === 'atLab' && <>
            <ScanButton rollId={id} />
          </>}
          {roll.status === 'imported' && <ScanButton rollId={id} label="다시 불러오기" />}
        </div>
      </div>

      <RollProjects roll={roll} />
      <TagField tags={roll.tags ?? []} setTags={(tags) => db.rolls.update(id, { tags })} />

      <div className="section">
        <h2>메모</h2>
        <div className="group"><div className="field">
          <textarea className="input" aria-label="메모" defaultValue={roll.note ?? ''}
            onBlur={(e) => db.rolls.update(id, { note: e.target.value.trim() || undefined })} />
        </div></div>
      </div>
      </>}

      {day && <DayEdit roll={roll} day={day === 'new' ? undefined : day} onClose={() => setDay(null)} />}
      {place && <PlaceEdit roll={roll} segment={place === 'new' ? undefined : place} onClose={() => setPlace(null)} />}
      {dropOff && <LabDropOff roll={roll} onClose={() => setDropOff(false)} />}
      {viewing !== null && <FrameViewer frames={frames} start={viewing} onClose={() => setViewing(null)} />}
      {framePrint && <FramePrint roll={roll} frames={frames} onClose={() => setFramePrint(false)} />}
      {sheet && <ContactSheetView roll={roll} frames={frames} onClose={() => setSheet(false)} />}
      {confirm && (
        <Confirm message="이 롤 기록을 삭제할까요? 24시간 안에는 설정에서 되돌릴 수 있어요. 사진 앱에 저장한 사진은 그대로 남아요." onCancel={() => setConfirm(false)}
          onConfirm={async () => { await deleteRoll(id); nav.pop() }} />
      )}
      {lensEdit && camera?.mount && (
        <LensChangeEdit roll={roll} mount={camera.mount} brand={camera.brand}
          change={lensEdit === 'new' ? undefined : lensEdit} onClose={() => setLensEdit(null)} />
      )}
    </>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="row static"><span className="grow">{label}</span><span className="value">{value}</span></div>
}

function MeterPanel({ roll, format }: { roll: Roll; format: FilmFormat }) {
  const shots = meterShotsByOrder(roll.meterShots)
  const { shot, capacity, percent } = meterProgress(shots.length, format)
  const prewind = !!roll.meterPrewind
  return (
    <>
      <div className="section">
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '0 4px' }}>
          <b style={{ fontSize: 34, fontVariantNumeric: 'tabular-nums', letterSpacing: -0.5 }}>{percent}%</b>
          <span className="sub">{shot} / {capacity}컷</span>
        </div>
        <div className="progress" aria-hidden="true"><i style={{ width: `${Math.min(percent, 100)}%` }} /></div>
        {shot > capacity && <p className="footnote">{capacity}컷을 넘겨 {shot - capacity}장 더 찍었어요.</p>}
        <p className="footnote">
          {prewind ? '역순으로 기록 중이에요. ' : ''}
          스캔을 불러오면 1번 칸의 기록이 첫 장에, 같은 번호끼리 붙어요.
        </p>
      </div>
      <div className="section">
        <h2>찍은 순서</h2>
        <div className="group">
          {shots.length === 0 && <div className="row static sub">아직 기록한 컷이 없어요. 노출계에서 찍으면 여기에 쌓여요.</div>}
          {shots.map((s) => (
            <div key={s.pos} className="row static">
              <span className="grow">
                {s.order}번째
                <div className="sub">{meterShotMeta(s, prewind)}</div>
              </span>
              <span className="value">{exposureText(s)}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
