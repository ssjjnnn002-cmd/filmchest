import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, deleteRoll, kept } from '../db'
import { useNav } from '../App'
import type { Roll } from '../core/types'
import { weatherText } from '../core/types'
import { CameraCover, cameraName, Canister, Confirm, Icon, PageHeader, fmtDay, rollCameraFormat, rollFilm, rollFilmName, sortedLocations } from '../ui/common'
import { LabDropOff, PlaceEdit } from './Editors'
import { ManualRecord } from './ManualRecord'
import { SettingsButton } from './Settings'
import { PressMenu } from '../ui/PressMenu'
import { SwipeRow } from '../ui/SwipeRow'

export function Shooting() {
  const nav = useNav()
  const rolls = useLiveQuery(async () => (await db.rolls.where('status').equals('loaded').reverse().sortBy('loadedAt')).filter(kept), [])
  return (
    <>
      <PageHeader title="촬영 중"
        left={<SettingsButton />}
        actions={<button className="glass-btn round" onClick={() => nav.loadFilm()} aria-label="필름 장착하기"><Icon name="plus" /></button>} />
      {/* 노출계는 정확도 문제로 보류 (아이폰과 같음) */}
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
  const [deleting, setDeleting] = useState(false)
  const toggle = () => void db.rolls.update(roll.id, { favorite: !roll.favorite })
  const locs = sortedLocations(roll)
  const place = locs.map((l) => l.name).filter(Boolean).join(' → ')
  const weather = locs.at(-1)?.weather
  const places = place ? place + (weather ? ` · ${weatherText(weather)}` : '') : ''
  return (
    <div className="card shooting-card">
      {/* 길게 누르면 메뉴, 밀면 즐겨찾기·삭제 (아이폰과 같음) */}
      <SwipeRow favorite={!!roll.favorite} onFavorite={toggle} onDelete={() => setDeleting(true)}>
      <PressMenu items={[{ label: roll.favorite ? '즐겨찾기 해제' : '즐겨찾기', icon: 'star', onPress: toggle }, { label: '삭제', icon: 'trash', danger: true, onPress: () => setDeleting(true) }]}>
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
      </PressMenu>
      </SwipeRow>
      <div className="shooting-actions">
        {roll.locations.length === 0 && <button className="btn soft" onClick={() => setPlacing(true)}><Icon name="pin" size={18} /> 장소 추가</button>}
        <button className="btn soft" onClick={() => setMeter(true)}>상세 기록</button>
        <button className="btn primary" onClick={() => setDropOff(true)}>촬영 끝내기</button>
      </div>
      {deleting && (
        <Confirm message="이 롤 기록을 삭제할까요? 24시간 안에는 설정에서 되돌릴 수 있어요." onCancel={() => setDeleting(false)}
          onConfirm={async () => { setDeleting(false); await deleteRoll(roll.id) }} />
      )}
      {placing && <PlaceEdit roll={roll} onClose={() => setPlacing(false)} />}
      {dropOff && <LabDropOff roll={roll} onClose={(ended) => { setDropOff(false); if (ended) nav.toPending(roll.id) }} />}
      {/* 상세 기록: 노출계 없이 다이얼로 셔터·조리개를 골라 컷마다 기록 (장소·시간 포함) */}
      {meter && <ManualRecord roll={roll} onClose={() => setMeter(false)} />}
    </div>
  )
}
