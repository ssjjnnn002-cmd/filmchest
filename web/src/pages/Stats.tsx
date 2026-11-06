import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, kept } from '../db'
import { Canister, Icon, Sheet, rollFilmName } from '../ui/common'
import { filmById } from '../core/films'
import { groupedNumber } from '../core/types'
import { colorSplit, monthlyRolls, rollsThisYear, topCounts } from '../core/stats'
import { Spending } from './Spending'

/** 통계: 숫자 타일, 월별 롤 그래프, 컬러·흑백, 많이 쓴 필름·카메라·렌즈·필터, 장비에 쓴 돈 */
export function Stats({ onClose }: { onClose: () => void }) {
  const rolls = (useLiveQuery(() => db.rolls.toArray(), []) ?? []).filter(kept)
  const cameras = useLiveQuery(() => db.cameras.toArray(), []) ?? []
  const lenses = useLiveQuery(() => db.lenses.toArray(), []) ?? []
  const frameCount = useLiveQuery(() => db.frames.count(), []) ?? 0
  const [spending, setSpending] = useState(false)
  const cameraName = (id?: string, brand?: string, model?: string) => {
    const c = cameras.find((x) => x.id === id)
    return c ? `${c.brand} ${c.model}` : [brand, model].filter(Boolean).join(' ') || undefined
  }
  const lensName = (id?: string) => { const l = lenses.find((x) => x.id === id); return l ? `${l.brand} ${l.model}`.trim() : undefined }
  const photos = Math.max(rolls.reduce((n, r) => n + (r.frameCount ?? 0), 0), frameCount)
  const months = monthlyRolls(rolls)
  const split = colorSplit(rolls)
  // 필름은 통 그림을 함께 보여 주려고 id로 센다
  const films = topCounts(rolls.map((r) => r.filmId)).map(([id, n]) => {
    const roll = rolls.find((r) => r.filmId === id)!
    return { name: rollFilmName(roll), count: n, film: filmById(id) }
  })

  return (
    <Sheet title="통계" onClose={onClose} left={<span />} right={<button className="btn ghost" onClick={onClose}><b>완료</b></button>}>
      <div className="stat-tiles">
        <Tile label="총 롤" value={rolls.length} />
        <Tile label="총 사진" value={photos} />
        <Tile label="올해 롤" value={rollsThisYear(rolls)} />
      </div>

      <div className="section">
        <h2>월별 롤 · 최근 12달</h2>
        <MonthChart months={months} />
      </div>

      {rolls.length > 0 && (
        <div className="section">
          <h2>컬러 · 흑백</h2>
          <div className="group stat-card">
            <div className="split-bar" role="img" aria-label={`컬러 ${split.color}롤, 흑백 ${split.bw}롤`}>
              {split.color > 0 && <span className="split-color" style={{ flex: split.color }} title={`컬러 ${split.color}롤`} />}
              {split.bw > 0 && <span className="split-bw" style={{ flex: split.bw }} title={`흑백 ${split.bw}롤`} />}
            </div>
            <div className="split-legend">
              <span><i className="split-color" />컬러 <b>{split.color}롤</b></span>
              <span><i className="split-bw" />흑백 <b>{split.bw}롤</b></span>
            </div>
          </div>
        </div>
      )}

      <RankBars title="자주 쓴 필름" unit="롤" items={films.map((f) => ({ name: f.name, count: f.count, icon: f.film && <Canister film={f.film} size={34} /> }))} />
      <RankBars title="많이 사용한 카메라" unit="롤" items={topCounts(rolls.map((r) => cameraName(r.cameraId, r.cameraBrand, r.cameraModel))).map(([name, count]) => ({ name, count }))} />
      <RankBars title="많이 사용한 렌즈" unit="롤" items={topCounts(rolls.flatMap((r) => [lensName(r.lensId), ...(r.lensChanges ?? []).map((c) => lensName(c.lensId))])).map(([name, count]) => ({ name, count }))} />
      <RankBars title="많이 사용한 필터" unit="컷" items={topCounts(rolls.flatMap((r) => (r.meterShots ?? []).flatMap((s) => s.filters ?? []))).map(([name, count]) => ({ name, count }))} />

      <div className="group">
        <button className="row" onClick={() => setSpending(true)}><span className="grow">장비에 쓴 돈</span><Icon name="chev" size={18} /></button>
      </div>
      {spending && <Spending onClose={() => setSpending(false)} />}
    </Sheet>
  )
}

function Tile({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat-tile">
      <b>{groupedNumber(value)}</b>
      <span>{label}</span>
    </div>
  )
}

/** 최근 12달 막대 (한 가지 색). 가장 많은 달에만 숫자를 붙이고, 막대에 손을 올리면 그 달 숫자 */
function MonthChart({ months }: { months: { key: string; label: string; title: string; count: number }[] }) {
  const max = Math.max(1, ...months.map((m) => m.count))
  const peak = months.reduce((a, b) => (b.count > a.count ? b : a), months[0])
  return (
    <div className="group stat-card">
      <div className="month-chart" role="img" aria-label={months.map((m) => `${m.title} ${m.count}롤`).join(', ')}>
        {months.map((m) => (
          <div key={m.key} className="month-col" title={`${m.title} · ${m.count}롤`}>
            <span className="month-value">{m === peak && m.count > 0 ? m.count : ''}</span>
            <span className="month-bar" style={{ height: `${(m.count / max) * 100}%` }} />
          </div>
        ))}
      </div>
      <div className="month-labels">
        {months.map((m, i) => <span key={m.key}>{i % 2 === 1 || i === 11 ? m.label : ''}</span>)}
      </div>
    </div>
  )
}

/** 많이 쓴 순위: 이름 · 길이로 비교되는 막대 · 숫자 */
function RankBars({ title, unit, items }: { title: string; unit: string; items: { name: string; count: number; icon?: React.ReactNode }[] }) {
  const max = Math.max(1, ...items.map((i) => i.count))
  return (
    <div className="section">
      <h2>{title}</h2>
      <div className="group stat-card">
        {items.length === 0 ? <span className="sub">기록이 없어요</span> : items.map((item) => (
          <div key={item.name} className="rank-row" title={`${item.name} · ${item.count}${unit}`}>
            {item.icon && <span className="rank-icon">{item.icon}</span>}
            <span className="rank-main">
              <span className="rank-name truncate">{item.name}</span>
              <span className="rank-track"><span className="rank-bar" style={{ width: `${(item.count / max) * 100}%` }} /></span>
            </span>
            <span className="rank-value">{item.count}{unit}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
