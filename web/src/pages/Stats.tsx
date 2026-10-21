import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, kept } from '../db'
import { Icon, Sheet, rollFilmName } from '../ui/common'
import { Spending } from './Spending'

/** 통계: 많이 쓴 필름·카메라·렌즈·필터, 총 롤·사진, 장비에 쓴 돈 */
export function Stats({ onClose }: { onClose: () => void }) {
  const rolls = (useLiveQuery(() => db.rolls.toArray(), []) ?? []).filter(kept)
  const cameras = useLiveQuery(() => db.cameras.toArray(), []) ?? []
  const lenses = useLiveQuery(() => db.lenses.toArray(), []) ?? []
  const frameCount = useLiveQuery(() => db.frames.count(), []) ?? 0
  const [spending, setSpending] = useState(false)
  const count = (names: (string | undefined)[]) => {
    const m = new Map<string, number>()
    names.filter((n): n is string => !!n).forEach((n) => m.set(n, (m.get(n) ?? 0) + 1))
    return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 5)
  }
  const cameraName = (id?: string, brand?: string, model?: string) => {
    const c = cameras.find((x) => x.id === id)
    return c ? `${c.brand} ${c.model}` : [brand, model].filter(Boolean).join(' ') || undefined
  }
  const lensName = (id?: string) => { const l = lenses.find((x) => x.id === id); return l ? `${l.brand} ${l.model}`.trim() : undefined }
  const photos = rolls.reduce((n, r) => n + (r.frameCount ?? 0), 0)
  const rank = (title: string, list: [string, number][], unit: string) => (
    <div className="section" key={title}>
      <h2>{title}</h2>
      <div className="group">
        {list.length === 0 ? <div className="row static"><span className="sub">기록이 없어요</span></div>
          : list.map(([name, n], i) => <div key={name} className="row static"><span className="grow truncate">{i + 1}. {name}</span><span className="value">{n}{unit}</span></div>)}
      </div>
    </div>
  )
  return (
    <Sheet title="통계" onClose={onClose} right={<button className="btn ghost" onClick={onClose}><b>완료</b></button>}>
      <div className="section">
        <div className="group">
          <div className="row static"><span className="grow">총 롤</span><span className="value">{rolls.length}</span></div>
          <div className="row static"><span className="grow">총 사진</span><span className="value">{Math.max(photos, frameCount)}</span></div>
          <button className="row" onClick={() => setSpending(true)}><span className="grow">장비에 쓴 돈</span><Icon name="chev" size={18} /></button>
        </div>
      </div>
      {rank('자주 쓴 필름', count(rolls.map((r) => rollFilmName(r))), '롤')}
      {rank('많이 사용한 카메라', count(rolls.map((r) => cameraName(r.cameraId, r.cameraBrand, r.cameraModel))), '롤')}
      {rank('많이 사용한 렌즈', count(rolls.flatMap((r) => [lensName(r.lensId), ...(r.lensChanges ?? []).map((c) => lensName(c.lensId))])), '롤')}
      {rank('많이 사용한 필터', count(rolls.flatMap((r) => (r.meterShots ?? []).flatMap((s) => s.filters ?? []))), '컷')}
      {spending && <Spending onClose={() => setSpending(false)} />}
    </Sheet>
  )
}
