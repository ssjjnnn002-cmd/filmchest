import { useState } from 'react'
import { useNav } from '../App'
import { getPref, setPref } from '../platform'
import { RollRow } from '../ui/RollRow'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, kept } from '../db'
import { Canister, Icon, PickMenu, Sheet, fmtDay, rollFilmName, toInputDate } from '../ui/common'
import { filmById } from '../core/films'
import { groupedNumber, priceText, priceValue, type Roll } from '../core/types'
import { avgDaysText, bucketUnit, buckets, colorSplit, periodRange, rollStartOf, statsPeriodName, topCounts, unitName, type Bucket, type StatsPeriod } from '../core/stats'
import { Spending } from './Spending'

/** 통계와 기록: 기간을 골라 보고, 막대를 누르면 그 기간의 롤이 나온다. 장비에 쓴 돈은 따로 크게 (아이폰과 같음) */
export function Stats({ onClose }: { onClose: () => void }) {
  const nav = useNav()
  const all = (useLiveQuery(() => db.rolls.toArray(), []) ?? []).filter(kept)
  const cameras = useLiveQuery(() => db.cameras.toArray(), []) ?? []
  const lenses = useLiveQuery(() => db.lenses.toArray(), []) ?? []
  const accessories = useLiveQuery(() => db.filters.toArray(), []) ?? []
  const lots = useLiveQuery(() => db.filmLots.toArray(), []) ?? []
  const frames = useLiveQuery(() => db.frames.toArray(), []) ?? []
  const [period, setPeriodState] = useState<StatsPeriod>(getPref('statsPeriod', 'months12') as StatsPeriod)
  const setPeriod = (p: StatsPeriod) => { setPeriodState(p); setPref('statsPeriod', p); setSelected(undefined) }
  const [selected, setSelected] = useState<string>()
  const [custom, setCustomS] = useState<[number, number]>(() => [Number(getPref('statsFrom', '0')) || Date.now() - 89 * 86_400_000, Number(getPref('statsTo', '0')) || Date.now()])
  const setCustom = (v: [number, number]) => { setCustomS(v); setPref('statsFrom', String(v[0])); setPref('statsTo', String(v[1])); setSelected(undefined) }
  const [spending, setSpending] = useState(false)
  const cameraName = (id?: string, brand?: string, model?: string) => {
    const c = cameras.find((x) => x.id === id)
    return c ? `${c.brand} ${c.model}` : [brand, model].filter(Boolean).join(' ') || undefined
  }
  const lensName = (id?: string) => { const l = lenses.find((x) => x.id === id); return l ? `${l.brand} ${l.model}`.trim() : undefined }

  const range = periodRange(period, all.length ? Math.min(...all.map(rollStartOf)) : undefined, new Date(), custom)
  const rolls = all.filter((r) => { const d = rollStartOf(r); return d >= range[0] && d <= range[1] })
  const unit = bucketUnit(period, range)
  const bars = buckets(rolls, range, unit)
  const framesOf = (list: Roll[]) => { const ids = new Set(list.map((r) => r.id)); return Math.max(list.reduce((n, r) => n + (r.frameCount ?? 0), 0), frames.filter((f) => ids.has(f.rollId)).length) }
  const photos = framesOf(rolls)
  const days = new Set(rolls.flatMap((r) => r.days.map((d) => new Date(d.startedAt).toDateString()))).size
  const split = colorSplit(rolls)
  // 필름은 통 그림을 함께 보여 주려고 id로 센다
  const films = topCounts(rolls.map((r) => r.filmId)).map(([id, n]) => {
    const roll = rolls.find((r) => r.filmId === id)!
    return { name: rollFilmName(roll), count: n, film: filmById(id) }
  })
  const picked = bars.find((b) => b.key === selected)
  const first = rolls.length ? Math.min(...rolls.map(rollStartOf)) : undefined
  const last = rolls.length ? Math.max(...rolls.map(rollStartOf)) : undefined

  return (
    <Sheet title="통계와 기록" onClose={onClose} left={<span />} right={<button className="btn ghost" onClick={onClose}><b>완료</b></button>}>
      <div className="section">
        <div className="group">
          {/* 아이폰 메뉴와 같은 모양 */}
          <div className="row static"><span className="grow">기간</span>
            <PickMenu label="기간" align="right" className="pick-trigger" trigger={<>{statsPeriodName[period]} <Icon name="chevDown" size={14} /></>}
              sections={[{ value: period, options: (Object.keys(statsPeriodName) as StatsPeriod[]).map((p) => [p, statsPeriodName[p]]), onPick: (v) => setPeriod(v as StatsPeriod) }]} /></div>
          {period === 'custom' && (
            <>
              <div className="field"><label htmlFor="stats-from">시작</label>
                <input id="stats-from" type="date" className="input" value={toInputDate(custom[0])} onChange={(e) => e.target.value && setCustom([new Date(`${e.target.value}T12:00:00`).getTime(), custom[1]])} /></div>
              <div className="field"><label htmlFor="stats-to">끝</label>
                <input id="stats-to" type="date" className="input" value={toInputDate(custom[1])} onChange={(e) => e.target.value && setCustom([custom[0], new Date(`${e.target.value}T12:00:00`).getTime()])} /></div>
            </>
          )}
        </div>
        <p className="footnote">{fmtDay(range[0])} – {fmtDay(range[1])}</p>
      </div>

      <div className="stat-tiles">
        <Tile label="롤" value={rolls.length} />
        <Tile label="사진" value={photos} />
        <Tile label="촬영한 날" value={days} />
      </div>

      <div className="section">
        <h2>롤 · {unitName[unit]}별</h2>
        <BarChart bars={bars} selected={selected} onPick={(k) => setSelected(selected === k ? undefined : k)} />
        {picked && (
          <div className="group" style={{ marginTop: 8 }}>
            <div className="row static"><span className="grow"><b>{picked.title}</b><div className="sub">{picked.rolls.length}롤 · 사진 {framesOf(picked.rolls)}장</div></span></div>
            {[...picked.rolls].sort((a, b) => rollStartOf(a) - rollStartOf(b)).map((r) => (
              <button key={r.id} className="row" onClick={() => { onClose(); nav.showRoll(r.id) }}><RollRow roll={r} /><Icon name="chev" size={18} /></button>
            ))}
          </div>
        )}
        <p className="footnote">{picked ? '다른 막대를 누르거나, 같은 막대를 다시 누르면 닫혀요.' : '막대를 누르면 그때 찍은 롤을 볼 수 있어요.'}</p>
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
      <RankBars title="자주 간 장소" unit="롤" items={topCounts(rolls.flatMap((r) => r.locations.map((l) => l.name || undefined))).map(([name, count]) => ({ name, count }))} />
      <RankBars title="자주 맡긴 현상소" unit="롤" items={topCounts(rolls.map((r) => r.lab || undefined)).map(([name, count]) => ({ name, count }))} />

      <div className="section">
        <h2>기록</h2>
        <div className="group">
          <Info label="한 롤 다 찍는 데" value={avgDaysText(rolls.map((r) => (r.finishedAt ? r.finishedAt - r.loadedAt : 0)))} />
          <Info label="맡기고 스캔 받기까지" value={avgDaysText(rolls.map((r) => (r.droppedAt && r.importedAt ? r.importedAt - r.droppedAt : 0)))} />
          {first !== undefined && <Info label="첫 롤" value={fmtDay(first)} />}
          {last !== undefined && <Info label="최근 롤" value={fmtDay(last)} />}
          <Info label="즐겨찾기한 롤" value={`${rolls.filter((r) => r.favorite).length}롤`} />
        </div>
      </div>

      <SpendingCard period={period} range={range} kinds={[
        ['카메라', cameras.filter(kept)], ['렌즈', lenses], ['액세서리', accessories], ['필름', lots],
      ]} onMore={() => setSpending(true)} />
      {spending && <Spending onClose={() => setSpending(false)} />}
    </Sheet>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="row static"><span className="grow">{label}</span><span className="value">{value}</span></div>
}

/** 장비에 쓴 돈: 여태까지 합계를 크게, 기간 구입, 종류별 비율 막대 */
function SpendingCard({ period, range, kinds, onMore }: {
  period: StatsPeriod; range: [number, number]; kinds: [string, { price?: string; purchasedAt?: number }[]][]; onMore: () => void
}) {
  const sums = kinds.map(([name, list]) => ({
    name, total: list.reduce((n, x) => n + priceValue(x.price), 0),
    inPeriod: list.filter((x) => x.purchasedAt !== undefined && x.purchasedAt >= range[0] && x.purchasedAt <= range[1]).reduce((n, x) => n + priceValue(x.price), 0),
  }))
  const total = sums.reduce((n, x) => n + x.total, 0)
  const inPeriod = sums.reduce((n, x) => n + x.inPeriod, 0)
  const shade = (i: number) => `color-mix(in srgb, var(--safelight) ${100 - i * 22}%, transparent)`
  return (
    <div className="section">
      <h2>장비에 쓴 돈</h2>
      <div className="group stat-card">
        <span className="sub">여태까지</span>
        <b style={{ display: 'block', fontSize: 30, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{priceText(total)}</b>
        {period !== 'all' && <div style={{ color: 'var(--safelight)', fontWeight: 600 }}>{statsPeriodName[period]} 구입 {priceText(inPeriod)}</div>}
        <div className="split-bar" style={{ marginTop: 12 }} role="img" aria-label={sums.map((x) => `${x.name} ${priceText(x.total)}`).join(', ')}>
          {sums.map((x, i) => x.total > 0 && <span key={x.name} style={{ flex: x.total, background: shade(i) }} />)}
        </div>
        {sums.map((x, i) => (
          <div key={x.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <i style={{ width: 10, height: 10, borderRadius: 3, background: shade(i) }} />
            <span className="grow">{x.name}</span><b style={{ fontVariantNumeric: 'tabular-nums' }}>{priceText(x.total)}</b>
          </div>
        ))}
      </div>
      <div className="group" style={{ marginTop: 8 }}>
        <button className="row" onClick={onMore}><span className="grow">장비별 · 카메라 조합 자세히</span><Icon name="chev" size={18} /></button>
      </div>
      <p className="footnote">구입 금액을 적은 것만 더해요. 기간 구입은 구입일을 적은 것만이에요.</p>
    </div>
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

/** 기간 막대 (한 가지 색). 누르면 그 막대를 고른다. 가장 많은 막대(또는 고른 막대)에만 숫자 */
function BarChart({ bars, selected, onPick }: { bars: Bucket[]; selected?: string; onPick: (key: string) => void }) {
  const max = Math.max(1, ...bars.map((m) => m.rolls.length))
  const peak = bars.reduce((a, b) => (b.rolls.length > a.rolls.length ? b : a), bars[0])
  const every = Math.max(1, Math.ceil(bars.length / 7))
  return (
    <div className="group stat-card">
      <div className="month-chart" style={{ gridTemplateColumns: `repeat(${bars.length}, 1fr)` }} role="img" aria-label={bars.map((m) => `${m.title} ${m.rolls.length}롤`).join(', ')}>
        {bars.map((m) => {
          const on = selected === m.key
          return (
            <button key={m.key} type="button" className="month-col" title={`${m.title} · ${m.rolls.length}롤`} onClick={() => onPick(m.key)}
              style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer' }}>
              <span className="month-value">{(on || (!selected && m === peak)) && m.rolls.length > 0 ? m.rolls.length : ''}</span>
              <span className="month-bar" style={{ height: `${(m.rolls.length / max) * 100}%`, opacity: selected && !on ? 0.35 : 1 }} />
            </button>
          )
        })}
      </div>
      <div className="month-labels" style={{ gridTemplateColumns: `repeat(${bars.length}, 1fr)` }}>
        {bars.map((m, i) => <span key={m.key}>{i % every === 0 ? m.label : ''}</span>)}
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
