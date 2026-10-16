import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, kept } from '../db'
import { useNav } from '../App'
import type { Roll } from '../core/types'
import { CameraCover, cameraName, Canister, Icon, PageHeader, fmtDay, rollCameraFormat, rollFilm, rollFilmName, sortedLocations } from '../ui/common'
import { LabDropOff, PlaceEdit } from './Editors'
import { Meter } from './Meter'

export function Shooting() {
  const nav = useNav()
  const rolls = useLiveQuery(async () => (await db.rolls.where('status').equals('loaded').reverse().sortBy('loadedAt')).filter(kept), [])
  return (
    <>
      <PageHeader title="촬영 중"
        actions={<button className="glass-btn round" onClick={() => nav.loadFilm()} aria-label="필름 장착하기"><Icon name="plus" /></button>} />
      {rolls === undefined && <div className="skeleton" style={{ height: 160 }} />}
      {rolls?.length === 0 && (
        <div className="empty">
          <Icon name="film" size={40} />
          <b>장착된 필름이 없어요</b>
          <button className="btn primary" onClick={() => nav.loadFilm()}>필름 장착하기</button>
        </div>
      )}
      <div style={{ display: 'grid', gap: 12 }}>
        {rolls?.map((r) => <LoadedCard key={r.id} roll={r} />)}
      </div>
    </>
  )
}

function LoadedCard({ roll }: { roll: Roll }) {
  const nav = useNav()
  const camera = useLiveQuery(() => (roll.cameraId ? db.cameras.get(roll.cameraId) : undefined), [roll.cameraId])
  const [placing, setPlacing] = useState(false)
  const [dropOff, setDropOff] = useState(false)
  const [meter, setMeter] = useState(false)
  const places = sortedLocations(roll).map((l) => l.name).filter(Boolean).join(' → ')
  return (
    <div className="card shooting-card">
      <button className="shooting-main" onClick={() => nav.push({ type: 'roll', id: roll.id })}>
        <div className="shooting-art">
          {camera && <CameraCover camera={camera} height={72} />}
          <div className="shooting-can"><Canister film={rollFilm(roll)} format={rollCameraFormat(camera, roll)} size={44} /></div>
        </div>
        <div className="grow" style={{ minWidth: 0 }}>
          <b className="truncate" style={{ display: 'block', fontSize: 18 }}>{cameraName(camera, roll)}</b>
          <div className="truncate" style={{ color: 'var(--safelight)', fontSize: 15, fontWeight: 600 }}>{rollFilmName(roll)}{roll.shotISO ? ` @ ${roll.shotISO}` : ''}</div>
          <div className="sub">{fmtDay(roll.loadedAt)} 장착 · 촬영일 {roll.days.length}일</div>
          {places && <div className="sub truncate">{places}</div>}
        </div>
        <Icon name="chev" size={18} />
      </button>
      <div className="shooting-actions">
        {roll.locations.length === 0 && <button className="btn soft" onClick={() => setPlacing(true)}><Icon name="pin" size={18} /> 장소 추가</button>}
        <button className="btn soft" onClick={() => setDropOff(true)}>
          촬영 끝내기
        </button>
        <button className="btn primary" onClick={() => setMeter(true)}>노출계</button>
      </div>
      {placing && <PlaceEdit roll={roll} onClose={() => setPlacing(false)} />}
      {dropOff && <LabDropOff roll={roll} onClose={() => setDropOff(false)} />}
      {meter && <Meter roll={roll} onClose={() => setMeter(false)} onEnd={() => { setMeter(false); setDropOff(true) }} />}
    </div>
  )
}
