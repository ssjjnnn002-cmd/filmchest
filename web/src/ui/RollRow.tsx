import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import type { Roll } from '../core/types'
import { formatInfo } from '../core/types'
import { TagLine } from './gearExtras'
import { Canister, cameraName, rollCameraFormat, StatusBadge, dateRangeText, rollFilm, rollFilmName, sortedLocations, useObjectURL } from './common'

export function RollRow({ roll }: { roll: Roll }) {
  const camera = useLiveQuery(() => (roll.cameraId ? db.cameras.get(roll.cameraId) : undefined), [roll.cameraId])
  const places = sortedLocations(roll).map((l) => l.name).filter(Boolean).join(', ')
  return (
    <div className="roll-row">
      <Canister film={rollFilm(roll)} format={rollCameraFormat(camera, roll)} size={48} className="can" />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div className="roll-title">
          <b className="truncate">{rollFilmName(roll)}</b>
          <StatusBadge status={roll.status} />
          {roll.favorite && <span className="star" aria-label="즐겨찾기">★</span>}
        </div>
        <div className="sub truncate">{[cameraName(camera, roll), dateRangeText(roll)].join(' · ')}</div>
        <div className="sub truncate">{places || '\u00a0'}</div>
        <TagLine tags={roll.tags} />
      </div>
    </div>
  )
}

export function RollCard({ roll, onClick }: { roll: Roll; onClick: () => void }) {
  const camera = useLiveQuery(() => (roll.cameraId ? db.cameras.get(roll.cameraId) : undefined), [roll.cameraId])
  const first = useLiveQuery(() => db.frames.where('[rollId+index]').equals([roll.id, roll.coverIndex ?? 1]).first(), [roll.id, roll.coverIndex])
  const url = useObjectURL(first?.thumb)
  return (
    <button className="roll-card" onClick={onClick}>
      <div className="thumb">
        {url ? <img src={url} alt="" /> : <Canister film={rollFilm(roll)} format={rollCameraFormat(camera, roll)} size={84} className="can" />}
        {roll.favorite && <span className="heart star">★</span>}
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', minWidth: 0 }}>
        <b className="truncate" style={{ flex: 1 }}>{rollFilmName(roll)}</b>
        <StatusBadge status={roll.status} />
      </div>
      <div className="sub truncate">{cameraName(camera, roll)}</div>
      <div className="sub">{dateRangeText(roll)}{formatInfo[rollCameraFormat(camera, roll)].is120 ? ` · ${formatInfo[rollCameraFormat(camera, roll)].name}` : ''}</div>
      <TagLine tags={roll.tags} />
    </button>
  )
}
