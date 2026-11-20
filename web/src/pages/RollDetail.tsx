import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, deleteRoll } from '../db'
import { useNav } from '../App'
import { weatherText, type Camera, type FilmFormat, type LocationSegment, type MeterShot, type Roll, type ShootingDay } from '../core/types'
import { exposureText, meterFrameTitle, meterProgress, meterShotsByOrder, shotRowMeta } from '../core/meter'
import { ManualRecord, RollShotEdit } from './ManualRecord'
import { features } from '../core/features'
import { RollGalleryButton } from '../ui/GallerySave'
import { CameraCover, Canister, cameraName, Confirm, Sheet, GlassGroup, Icon, PageHeader, StatusBadge, bytesText, dateRangeText, fmtDay, fmtDayTime, resolutionText, rollCameraFormat, rollFilm, rollFilmName, rollName, rollTitle, sortedDays, sortedLocations } from '../ui/common'
import { DayEdit, LabDropOff, LabField, LensChangeEdit, PlaceEdit, rememberLab } from './Editors'
import { RollProjects } from './Projects'
import { TagField } from '../ui/gearExtras'
import { FramePrint } from './FramePrint'
import { ContactSheetView, FilmStrip, FrameViewer } from './RollViewers'
import { ScanButton } from './Pending'
import { driveConnected, hasDriveToken, syncPhotosToDrive } from '../core/drive'
import { refreshRollPhotoMeta, reverseRollFrames } from '../core/importer'

export function RollDetail({ id }: { id: string }) {
  const nav = useNav()
  const roll = useLiveQuery(() => db.rolls.get(id), [id])
  usePhotoMetaSync(roll, nav.toast)
  const frames = useLiveQuery(() => db.frames.where('rollId').equals(id).sortBy('index'), [id]) ?? []
  const camera = useLiveQuery(() => (roll?.cameraId ? db.cameras.get(roll.cameraId) : undefined), [roll?.cameraId])
  const lens = useLiveQuery(() => (roll?.lensId ? db.lenses.get(roll.lensId) : undefined), [roll?.lensId])
  const allLenses = useLiveQuery(() => db.lenses.toArray(), []) ?? []
  const lensName = (id?: string) => { const l = allLenses.find((x) => x.id === id); return l ? `${l.brand} ${l.model}` : '렌즈 모름' }
  const [lensEdit, setLensEdit] = useState<'first' | 'new' | { id: string; startFrame: number; lensId: string } | null>(null)
  const [day, setDay] = useState<ShootingDay | 'new' | null>(null)
  const [place, setPlace] = useState<LocationSegment | 'new' | null>(null)
  const [dropOff, setDropOff] = useState(false)
  const [titleEdit, setTitleEdit] = useState<string>()
  const [viewing, setViewing] = useState<number | null>(null)
  const [sheet, setSheet] = useState(false)
  const [framePrint, setFramePrint] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [recording, setRecording] = useState(false)
  const [moreMenu, setMoreMenu] = useState(false)
  const [pickCamera, setPickCamera] = useState(false)
  const [shotEdit, setShotEdit] = useState<number>()
  const [allShots, setAllShots] = useState(false)
  const [labEdit, setLabEdit] = useState(false)
  const [confirmReverse, setConfirmReverse] = useState(false)

  if (!roll) return null
  // 컷 기록: 촬영 중이거나 상세 기록을 남긴 롤
  const showShots = roll.status === 'loaded' || (roll.meterShots?.length ?? 0) > 0
  // 상세 기록이 있으면 컷마다 시간·장소가 있어 촬영일·장소 칸은 따로 두지 않는다
  const noShots = !(roll.meterShots?.length)
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
      <PageHeader title={rollName(roll)} onBack={nav.pop}
        actions={
          <GlassGroup>
            <button aria-label={roll.favorite ? '즐겨찾기 해제' : '즐겨찾기'} style={{ color: roll.favorite ? '#f5b700' : 'var(--ink)' }}
              onClick={() => db.rolls.update(id, { favorite: !roll.favorite })}>
              <svg width="23" height="23" viewBox="0 0 24 24" fill={roll.favorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />
              </svg>
            </button>
            <div style={{ position: 'relative' }}>
              <button aria-label="더 보기" onClick={() => setMoreMenu(!moreMenu)}><Icon name="more" /></button>
              {moreMenu && (
                <div className="menu">
                  <button className="row" onClick={() => { setMoreMenu(false); setPickCamera(true) }}>카메라 바꾸기</button>
                  <button className="row" onClick={() => { setMoreMenu(false); setLabEdit(true) }}>현상소 수정</button>
                  {(roll.frameCount ?? 0) > 1 && <button className="row" onClick={() => { setMoreMenu(false); setConfirmReverse(true) }}>컷 순서 뒤집기</button>}
                  <button className="row danger" onClick={() => { setMoreMenu(false); setConfirm(true) }}>롤 삭제</button>
                </div>
              )}
            </div>
          </GlassGroup>
        } />

      {/* 맨 위 큰 제목 바로 아래: 제목 편집 (비우면 필름 이름) */}
      <button className="title-edit" onClick={() => setTitleEdit(roll.title ?? '')}><Icon name="pencil" size={15} />제목 편집</button>

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

      {/* 다음에 할 일을 맨 위에: 상세 기록 / 현상소 고르기 / 스캔 불러오기 (아이폰과 같음) */}
      {roll.status === 'loaded' && <button className="btn primary block" style={{ margin: '4px 0 8px' }} onClick={() => setRecording(true)}>상세 기록</button>}
      {roll.status === 'finished' && <div className="section"><button className="btn primary block" onClick={() => setDropOff(true)}>현상소 고르기</button><p className="footnote">고르면 스캔 대기로 넘어가요.</p></div>}
      {roll.status === 'atLab' && <div className="section"><ScanButton rollId={id} /><p className="footnote">현상소에서 받은 zip이나 사진을 골라요.</p></div>}

      {roll.status === 'imported' && frames.length > 0 && (
        <div className="section">
          <div className="bleed"><FilmStrip roll={roll} frames={frames} onSelect={setViewing} /></div>
          <div style={{ display: 'grid', gap: 10 }}>
            <button className="btn soft" onClick={() => setSheet(true)}><Icon name="sheet" size={18} /> 밀착 인화지로 보기</button>
            {features.framePrint && <button className="btn soft" onClick={() => setFramePrint(true)}><Icon name="photos" size={18} /> 프레임 만들기</button>}
            <RollGalleryButton rollId={roll.id} title={rollTitle(roll, camera)} onToast={nav.toast} className="btn primary block" />
          </div>
          <p className="footnote">공유 창에서 이미지 저장을 고르면 사진 앱 최근 항목에 들어가요.</p>
        </div>
      )}

      {showShots && <ShotsSection roll={roll} format={rollCameraFormat(camera, roll)} onEdit={setShotEdit} onAll={() => setAllShots(true)} />}

      {noShots && <div className="section">
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
      </div>}

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

      {noShots && <div className="section">
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
      </div>}

      {(roll.status === 'atLab' || roll.status === 'imported' || roll.lab || roll.droppedAt || roll.scanner || resolutionText(roll.scanW, roll.scanH) || roll.frameCount || roll.importedAt) && (
        <div className="section">
          <h2>현상 · 스캔</h2>
          <div className="group">
            <button className="row" onClick={() => setLabEdit(true)}><span className="grow">현상소</span><span className="value">{roll.lab || '없음'}</span><Icon name="chev" size={18} /></button>
            {roll.droppedAt && <Info label="맡긴 날" value={fmtDay(roll.droppedAt)} />}
            {roll.scanner && <Info label="스캐너" value={roll.scanner} />}
            {resolutionText(roll.scanW, roll.scanH) && <Info label="해상도" value={resolutionText(roll.scanW, roll.scanH)!} />}
            {roll.frameCount && <Info label="스캔" value={[`${roll.frameCount}장`, roll.scanFormat, bytesText(roll.scanBytes)].filter(Boolean).join(' · ')} />}
            {roll.importedAt && <Info label="불러온 날" value={fmtDay(roll.importedAt)} />}
          </div>
        </div>
      )}

      {/* 정리: 태그 · 프로젝트 · 메모 */}
      <TagField tags={roll.tags ?? []} setTags={(tags) => db.rolls.update(id, { tags })} />

      <RollProjects roll={roll} />

      <div className="section">
        <h2 className="section-title"><span>메모</span>
          <label className="inline-toggle">목록에서 표시하기
            <input type="checkbox" className="switch" checked={!!roll.noteInList} onChange={(e) => db.rolls.update(id, { noteInList: e.target.checked || undefined })} /></label>
        </h2>
        <div className="group"><div className="field">
          <textarea className="input" aria-label="메모" defaultValue={roll.note ?? ''}
            onBlur={(e) => db.rolls.update(id, { note: e.target.value.trim() || undefined })} />
        </div></div>
      </div>

      {roll.status !== 'atLab' && (
        <div className="section">
        <div className="action-stack">
          {roll.status === 'loaded' && <button className="btn primary" onClick={() => setDropOff(true)}>촬영 끝내기</button>}
          {roll.status === 'finished' && <button className="btn" onClick={() => db.rolls.update(id, { status: 'loaded' })}>다시 촬영 중으로</button>}
          {roll.status === 'imported' && <ScanButton rollId={id} label="다시 불러오기" />}
          {roll.status === 'imported' && <button className="btn" onClick={() => { void syncPhotoMeta(id, nav.toast) }}>사진 날짜·위치 다시 맞추기</button>}
        </div>
      </div>
      )}

      {pickCamera && <RollCameraPick roll={roll} onClose={() => setPickCamera(false)} />}
      {recording && <ManualRecord roll={roll} onClose={() => setRecording(false)} />}
      {shotEdit !== undefined && <RollShotEdit roll={roll} pos={shotEdit} onClose={() => setShotEdit(undefined)} onToast={nav.toast} />}
      {allShots && (
        <Sheet title="컷 기록" onClose={() => setAllShots(false)} right={<button className="btn ghost" onClick={() => setAllShots(false)}><b>완료</b></button>}>
          <AllShots roll={roll} format={rollCameraFormat(camera, roll)} onEdit={(p) => { setAllShots(false); setShotEdit(p) }} />
        </Sheet>
      )}
      {day && <DayEdit roll={roll} day={day === 'new' ? undefined : day} onClose={() => setDay(null)} />}
      {place && <PlaceEdit roll={roll} segment={place === 'new' ? undefined : place} onClose={() => setPlace(null)} />}
      {titleEdit !== undefined && (
        <Sheet title="롤 제목" onClose={() => setTitleEdit(undefined)}
          right={<button className="btn ghost" onClick={async () => { await db.rolls.update(id, { title: titleEdit.trim() || undefined }); setTitleEdit(undefined) }}><b>저장</b></button>}>
          <div className="group">
            <div className="field">
              <input className="input" autoFocus value={titleEdit} placeholder={rollFilmName(roll)} maxLength={60}
                onChange={(e) => setTitleEdit(e.target.value)}
                onKeyDown={async (e) => { if (e.key === 'Enter') { await db.rolls.update(id, { title: titleEdit.trim() || undefined }); setTitleEdit(undefined) } }} />
            </div>
          </div>
          <p className="footnote">비워 두면 필름 이름으로 보여요.</p>
        </Sheet>
      )}
      {dropOff && <LabDropOff roll={roll} onClose={(ended) => { setDropOff(false); if (ended) nav.toPending(roll.id) }} />}
      {viewing !== null && <FrameViewer frames={frames} start={viewing} onClose={() => setViewing(null)} />}
      {framePrint && <FramePrint roll={roll} frames={frames} onClose={() => setFramePrint(false)} />}
      {sheet && <ContactSheetView roll={roll} frames={frames} onClose={() => setSheet(false)} />}
      {confirm && (
        <Confirm message="이 롤 기록을 삭제할까요? 24시간 안에는 설정에서 되돌릴 수 있어요. 사진 앱에 저장한 사진은 그대로 남아요." onCancel={() => setConfirm(false)}
          onConfirm={async () => { await deleteRoll(id); nav.setTab(nav.tab) }} />
      )}
      {labEdit && <LabEditSheet roll={roll} onClose={() => setLabEdit(false)} />}
      {confirmReverse && (
        <Confirm message="컷 순서를 거꾸로 바꿀까요? 마지막 컷이 1번이 돼요. 사진 속 날짜·컷 번호도 새 순서로 다시 써요." action="뒤집기" safe
          onCancel={() => setConfirmReverse(false)}
          onConfirm={async () => { setConfirmReverse(false); if (await reverseRollFrames(id)) { nav.toast('컷 순서를 뒤집었어요'); void syncPhotoMeta(id, nav.toast) } }} />
      )}
      {lensEdit && camera?.mount && (
        <LensChangeEdit roll={roll} mount={camera.mount} brand={camera.brand}
          change={lensEdit === 'new' ? undefined : lensEdit} onClose={() => setLensEdit(null)} />
      )}
    </>
  )
}

/** 현상소만 고친다. 사진 속 현상소 정보도 다시 쓴다 (usePhotoMetaSync) */
function LabEditSheet({ roll, onClose }: { roll: Roll; onClose: () => void }) {
  const [lab, setLab] = useState(roll.lab ?? '')
  const save = async () => {
    rememberLab(lab)
    await db.rolls.update(roll.id, { lab: lab.trim() || undefined })
    onClose()
  }
  return (
    <Sheet title="현상소" onClose={onClose} right={<button className="btn ghost" onClick={save}><b>저장</b></button>}>
      <div className="section"><div className="group"><LabField id="lab-edit" value={lab} onChange={setLab} /></div>
        {roll.status === 'imported' && <p className="footnote">사진 속 현상소 정보도 바꿔요.</p>}
      </div>
    </Sheet>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="row static"><span className="grow">{label}</span><span className="value">{value}</span></div>
}

/** 롤 카메라 바꾸기: 내 장비 카메라 중에서 (아이폰 RollCameraPicker와 같음). 촬영 중인 롤은 다른 필름이 든 카메라로는 못 옮긴다.
 *  마운트가 다르거나 렌즈 고정형으로 바꾸면 롤 렌즈 기록은 비운다. 바꾸면 저장한 사진 속 카메라 정보도 다시 쓴다 */
function RollCameraPick({ roll, onClose }: { roll: Roll; onClose: () => void }) {
  const cameras = useLiveQuery(() => db.cameras.orderBy('sortOrder').filter((c) => !c.deletedAt).toArray(), []) ?? []
  const busyIds = useLiveQuery(async () => new Set((await db.rolls.where('status').equals('loaded').toArray()).filter((r) => !r.deletedAt && r.id !== roll.id).map((r) => r.cameraId)), [roll.id]) ?? new Set()
  const lens = useLiveQuery(() => (roll.lensId ? db.lenses.get(roll.lensId) : undefined), [roll.lensId])
  const pick = async (c: Camera) => {
    if (c.id !== roll.cameraId) {
      const keepLens = !c.fixedLens && !!lens && (lens.mount ?? '').toLowerCase() === (c.mount ?? '').toLowerCase()
      await db.rolls.update(roll.id, {
        cameraId: c.id, cameraBrand: c.brand, cameraModel: c.model, cameraFormat: c.format, cameraFixedLens: c.fixedLens,
        ...(keepLens ? {} : { lensId: undefined, lensChanges: [] }),
      })
    }
    onClose()
  }
  return (
    <Sheet title="카메라 바꾸기" onClose={onClose}>
      <div className="section">
        <div className="group">
          {cameras.map((c) => {
            const busy = roll.status === 'loaded' && busyIds.has(c.id)
            return (
              <button key={c.id} className="row" disabled={busy} style={{ opacity: busy ? 0.45 : 1 }} onClick={() => { void pick(c) }}>
                <span style={{ width: 56, flex: 'none' }}><CameraCover camera={c} height={40} /></span>
                <span className="grow">{c.brand} {c.model}{busy && <span className="sub">다른 필름이 들어 있어요</span>}</span>
                {c.id === roll.cameraId && <span style={{ color: 'var(--safelight)' }}>✓</span>}
              </button>
            )
          })}
        </div>
        <p className="footnote">저장한 사진의 카메라 정보도 함께 바꿔요. 휴대폰 갤러리에 이미 저장한 사진은 '갤러리에 저장'을 다시 눌러 주세요.</p>
      </div>
    </Sheet>
  )
}

/** 롤 화면의 컷 기록: 최근 5컷, 넘으면 전체 보기 (아이폰과 같음) */
function ShotsSection({ roll, format, onEdit, onAll }: { roll: Roll; format: FilmFormat; onEdit: (pos: number) => void; onAll: () => void }) {
  // 컷 번호 순서 (역순 감기여도 1번부터). 촬영 중이면 최근 5컷, 다 찍은 롤은 전부 (아이폰과 같음)
  const num = (x: MeterShot) => Number(meterFrameTitle(x.pos, !!roll.meterPrewind).replace(/\D/g, '')) || x.pos
  // 큰 번호(최근)부터: 36, 35, 34 … (아이폰과 같음)
  const byNumber = (list: MeterShot[]) => [...list].sort((a, b) => num(b) - num(a))
  const shots = byNumber(roll.meterShots ?? [])
  const recent = roll.status === 'loaded' && shots.length > 6 ? byNumber([...shots].sort((a, b) => b.order - a.order).slice(0, 5)) : shots
  const { capacity } = meterProgress(shots.length, format)
  return (
    <div className="section">
      <h2 className="section-title"><span>컷 기록</span>{shots.length > 0 && <span className="sub" style={{ fontWeight: 600 }}>{shots.length} / {capacity}컷</span>}</h2>
      <div className="group">
        {shots.length === 0 && <div className="row static sub">상세 기록에서 찍으면 여기에 쌓여요.</div>}
        {recent.map((s) => <ShotRow key={s.pos} shot={s} prewind={!!roll.meterPrewind} onClick={() => onEdit(s.pos)} />)}
        {shots.length > recent.length && <button className="row" onClick={onAll}><span className="grow">전체 {shots.length}컷 보기</span><Icon name="chev" size={16} /></button>}
      </div>
    </div>
  )
}

function ShotRow({ shot, prewind, onClick }: { shot: MeterShot; prewind: boolean; onClick: () => void }) {
  return (
    <button className="row" onClick={onClick}>
      <span className="grow">
        {meterFrameTitle(shot.pos, prewind)}
        <div className="sub">{shotRowMeta(shot)}</div>
      </span>
      <span className="value">{exposureText(shot)}</span>
    </button>
  )
}

/** 컷 기록 전체 (찍은 순서) */
function AllShots({ roll, format, onEdit }: { roll: Roll; format: FilmFormat; onEdit: (pos: number) => void }) {
  // 마지막에 찍은 컷부터 (아이폰과 같음)
  const shots = meterShotsByOrder(roll.meterShots).reverse()
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
          {shots.map((s) => <ShotRow key={s.pos} shot={s} prewind={prewind} onClick={() => onEdit(s.pos)} />)}
        </div>
      </div>
    </>
  )
}

/** 촬영일·장소를 고치면 저장한 사진 속 날짜·위치도 새로 쓴다. 드라이브에 연결돼 있으면 새 정보의 사진으로 다시 올린다 */
function usePhotoMetaSync(roll: Roll | undefined, toast: (m: string) => void) {
  const key = roll?.status === 'imported'
    ? JSON.stringify([roll.days.map((d) => [d.startedAt, d.startFrame]), roll.locations.map((l) => [l.startFrame, l.name, l.point?.latitude, l.point?.longitude]), roll.isArchive, roll.cameraId, roll.cameraBrand, roll.cameraModel, roll.lensId, roll.lab,
      (roll.meterShots ?? []).map((x) => [x.pos, x.at, x.place, x.lat, x.lon, x.lensId, x.iso])])
    : ''
  const last = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (!key || !roll) return
    if (last.current === undefined || last.current === key) { last.current = key; return }
    last.current = key
    // 여러 칸을 연달아 고칠 때는 다 고친 뒤 한 번만
    const t = setTimeout(() => { void syncPhotoMeta(roll.id, toast) }, 1500)
    return () => clearTimeout(t)
  }, [key])
}

async function syncPhotoMeta(rollId: string, toast: (m: string) => void) {
  const n = await refreshRollPhotoMeta(rollId)
  if (!n) return
  const drive = driveConnected() && hasDriveToken()
  toast(drive ? `사진 정보도 바꿨어요 (${n}장). 드라이브에도 새로 올려요` : `사진 정보도 바꿨어요 (${n}장)`)
  if (drive) void syncPhotosToDrive().catch(() => {})
}
