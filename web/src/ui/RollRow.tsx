import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import type { Roll } from '../core/types'
import { formatInfo } from '../core/types'
import { TagLine } from './gearExtras'
import { Canister, cameraName, rollCameraFormat, StatusBadge, dateRangeText, rollFilm, rollFilmName, rollName, showRollMemo, sortedLocations, useObjectURL } from './common'

export function RollRow({ roll }: { roll: Roll }) {
  const camera = useLiveQuery(() => (roll.cameraId ? db.cameras.get(roll.cameraId) : undefined), [roll.cameraId])
  const places = sortedLocations(roll).map((l) => l.name).filter(Boolean).join(', ')
  // 스캔이 있으면 대표 사진, 없으면 필름통 (필름 이름은 옆에 있다)
  const cover = useCoverFrame(roll)
  const url = useObjectURL(cover?.thumb)
  return (
    <div className="roll-row">
      {url ? <img className="roll-row-thumb" src={url} alt="" /> : <Canister film={rollFilm(roll)} format={rollCameraFormat(camera, roll)} size={48} className="can" />}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div className="roll-title">
          <b className="truncate">{rollName(roll)}</b>
          <StatusBadge status={roll.status} />
          {roll.favorite && <span className="star" aria-label="즐겨찾기">★</span>}
        </div>
        {/* 제목을 붙였으면 필름 이름은 아래 줄에 */}
        <div className="sub truncate">{[roll.title?.trim() ? rollFilmName(roll) : undefined, cameraName(camera, roll), dateRangeText(roll)].filter(Boolean).join(' · ')}</div>
        <div className="sub truncate">{places || '\u00a0'}</div>
        {showRollMemo() && roll.note?.trim() && <div className="sub truncate roll-memo">{roll.note.trim()}</div>}
        <TagLine tags={roll.tags} />
      </div>
    </div>
  )
}

export function RollCard({ roll, onClick }: { roll: Roll; onClick: () => void }) {
  const camera = useLiveQuery(() => (roll.cameraId ? db.cameras.get(roll.cameraId) : undefined), [roll.cameraId])
  const first = useCoverFrame(roll)
  const url = useObjectURL(first?.thumb)
  return (
    <button className="roll-card" onClick={onClick}>
      <div className="thumb">
        {url ? <img src={url} alt="" /> : <Canister film={rollFilm(roll)} format={rollCameraFormat(camera, roll)} size={84} className="can" />}
        {roll.favorite && <span className="heart star">★</span>}
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', minWidth: 0 }}>
        <b className="truncate" style={{ flex: 1 }}>{rollName(roll)}</b>
        <StatusBadge status={roll.status} />
      </div>
      <div className="sub truncate">{[roll.title?.trim() ? rollFilmName(roll) : undefined, cameraName(camera, roll)].filter(Boolean).join(' · ')}</div>
      <div className="sub">{dateRangeText(roll)}{formatInfo[rollCameraFormat(camera, roll)].is120 ? ` · ${formatInfo[rollCameraFormat(camera, roll)].name}` : ''}</div>
      {/* 목록형과 같이 장소 (비어 있어도 자리를 지켜 카드 높이가 같다) */}
      <div className="sub truncate">{sortedLocations(roll).map((l) => l.name).filter(Boolean).join(', ') || '\u00a0'}</div>
      {showRollMemo() && roll.note?.trim() && <div className="sub truncate roll-memo">{roll.note.trim()}</div>}
      <TagLine tags={roll.tags} />
    </button>
  )
}

/** 대표 사진, 없으면 첫 컷 (0번 컷부터 시작하거나 1번이 빠진 롤도) */
function useCoverFrame(roll: Roll) {
  return useLiveQuery(async () => {
    const list = await db.frames.where('rollId').equals(roll.id).sortBy('index')
    return list.find((f) => f.index === (roll.coverIndex ?? 1)) ?? list.find((f) => f.index >= 1) ?? list[0]
  }, [roll.id, roll.coverIndex])
}
