// 웹 pages/Stats.tsx — 통계와 기록: 기간 고르기, 막대를 누르면 그 기간 롤, 순위, 기록, 장비에 쓴 돈
import { useRef, useState, type ReactNode } from 'react'
import { Pressable, View } from 'react-native'
import { useNav } from '../App'
import { RollRow } from '../RollRow'
import { Text } from '../text'
import { db, kept } from '../data'
import { getPref, setPref, useLiveQuery } from '../store'
import { fmtDay, rollFilmName } from '../core/display'
import { filmById } from '../core/films'
import { groupedNumber, priceText, priceValue, type Roll } from '../core/types'
import { avgDaysText, bucketUnit, buckets, colorSplit, periodRange, rollStartOf, statsPeriodName, topCounts, unitName, type Bucket, type StatsPeriod } from '../core/stats'
import { Canister, DateInput, Field, Group, Row, RowText, Section, Sub } from '../kit'
import { Icon } from '../icons'
import { Menu, Sheet, SheetBtn, measureAnchor, type MenuAnchor } from '../overlay'
import { useTheme } from '../theme'
import { Spending } from './Spending'

export function Stats({ onClose }: { onClose: () => void }) {
  const c = useTheme()
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
  const [periodMenu, setPeriodMenu] = useState<MenuAnchor>()
  const periodRef = useRef<View>(null)
  const [spending, setSpending] = useState(false)
  const cameraName = (id?: string, brand?: string, model?: string) => {
    const x = cameras.find((k) => k.id === id)
    return x ? `${x.brand} ${x.model}` : [brand, model].filter(Boolean).join(' ') || undefined
  }
  const lensName = (id?: string) => { const l = lenses.find((x) => x.id === id); return l ? `${l.brand} ${l.model}`.trim() : undefined }

  // 웹과 같은 계산 (core/stats)
  const range = periodRange(period, all.length ? Math.min(...all.map(rollStartOf)) : undefined, new Date(), custom)
  const rolls = all.filter((r) => { const d = rollStartOf(r); return d >= range[0] && d <= range[1] })
  const unit = bucketUnit(period, range)
  const bars = buckets(rolls, range, unit)
  const framesOf = (list: Roll[]) => { const ids = new Set(list.map((r) => r.id)); return Math.max(list.reduce((n, r) => n + (r.frameCount ?? 0), 0), frames.filter((f) => ids.has(f.rollId)).length) }
  const photos = framesOf(rolls)
  const days = new Set(rolls.flatMap((r) => r.days.map((d) => new Date(d.startedAt).toDateString()))).size
  const split = colorSplit(rolls)
  const films = topCounts(rolls.map((r) => r.filmId)).map(([id, n]) => {
    const roll = rolls.find((r) => r.filmId === id)!
    const film = filmById(id)
    return { name: rollFilmName(roll), count: n, icon: film ? <Canister film={film} size={34} /> : undefined }
  })
  const picked = bars.find((b) => b.key === selected)
  const first = rolls.length ? Math.min(...rolls.map(rollStartOf)) : undefined
  const last = rolls.length ? Math.max(...rolls.map(rollStartOf)) : undefined
  const tile = (label: string, value: number) => (
    <View style={{ flex: 1, backgroundColor: c.card, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 12, gap: 2 }}>
      <Text style={{ fontSize: 28, fontWeight: '700', color: c.ink, fontVariant: ['tabular-nums'] }}>{groupedNumber(value)}</Text>
      <Text style={{ fontSize: 13, color: c.muted }}>{label}</Text>
    </View>
  )
  const info = (label: string, value: string) => <Row key={label} static value={value}><RowText>{label}</RowText></Row>
  if (spending) return <Spending onClose={() => setSpending(false)} />
  const menu = periodMenu ? (
    <Menu anchor={periodMenu} onClose={() => setPeriodMenu(undefined)}
      items={(Object.keys(statsPeriodName) as StatsPeriod[]).map((p) => ({ label: statsPeriodName[p], checked: p === period, onPress: () => setPeriod(p) }))} />
  ) : null

  return (
    <Sheet title="통계와 기록" onClose={onClose} left={null} right={<SheetBtn label="완료" accent onPress={onClose} />}>
      {menu}
      <Section foot={`${fmtDay(range[0])} – ${fmtDay(range[1])}`}>
        <Group>
          {/* 아이폰 메뉴와 같은 모양 */}
          <Row onPress={async () => setPeriodMenu(await measureAnchor(periodRef))}>
            <RowText>기간</RowText>
            <View ref={periodRef} collapsable={false} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ fontSize: 17, color: c.safelight }}>{statsPeriodName[period]}</Text>
              <Icon name="chevDown" size={14} color={c.safelight} />
            </View>
          </Row>
          {period === 'custom' ? (
            <>
              <Field label="시작"><DateInput value={custom[0]} onChange={(v) => setCustom([v, custom[1]])} /></Field>
              <Field label="끝"><DateInput value={custom[1]} onChange={(v) => setCustom([custom[0], v])} /></Field>
            </>
          ) : null}
        </Group>
      </Section>

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, marginBottom: 18 }}>
        {tile('롤', rolls.length)}
        {tile('사진', photos)}
        {tile('촬영한 날', days)}
      </View>

      <Section title={`롤 · ${unitName[unit]}별`} foot={picked ? '다른 막대를 누르거나, 같은 막대를 다시 누르면 닫혀요.' : '막대를 누르면 그때 찍은 롤을 볼 수 있어요.'}>
        <Group><BarChart bars={bars} selected={selected} onPick={(k) => setSelected(selected === k ? undefined : k)} /></Group>
        {picked ? (
          <Group style={{ marginTop: 8 }}>
            <Row static><RowText sub={`${picked.rolls.length}롤 · 사진 ${framesOf(picked.rolls)}장`}>{picked.title}</RowText></Row>
            {[...picked.rolls].sort((a, b) => rollStartOf(a) - rollStartOf(b)).map((r) => (
              <Row key={r.id} chev onPress={() => { onClose(); nav.showRoll(r.id) }} style={{ minHeight: 0, paddingVertical: 5, paddingLeft: 14 }}><RollRow roll={r} /></Row>
            ))}
          </Group>
        ) : null}
      </Section>

      {rolls.length > 0 ? (
        <Section title="컬러 · 흑백">
          <Group>
            <View style={{ padding: 14 }}>
              <View style={{ flexDirection: 'row', gap: 2, height: 14, borderRadius: 4, overflow: 'hidden' }}>
                {split.color > 0 ? <View style={{ flex: split.color, backgroundColor: c.safelight }} /> : null}
                {split.bw > 0 ? <View style={{ flex: split.bw, backgroundColor: c.muted }} /> : null}
              </View>
              <View style={{ flexDirection: 'row', gap: 16, marginTop: 10 }}>
                <Legend color={c.safelight} label="컬러" value={`${split.color}롤`} />
                <Legend color={c.muted} label="흑백" value={`${split.bw}롤`} />
              </View>
            </View>
          </Group>
        </Section>
      ) : null}

      <RankBars title="자주 쓴 필름" unit="롤" items={films} />
      <RankBars title="많이 사용한 카메라" unit="롤" items={topCounts(rolls.map((r) => cameraName(r.cameraId, r.cameraBrand, r.cameraModel))).map(([name, count]) => ({ name, count }))} />
      <RankBars title="많이 사용한 렌즈" unit="롤" items={topCounts(rolls.flatMap((r) => [lensName(r.lensId), ...(r.lensChanges ?? []).map((x) => lensName(x.lensId))])).map(([name, count]) => ({ name, count }))} />
      <RankBars title="많이 사용한 필터" unit="컷" items={topCounts(rolls.flatMap((r) => (r.meterShots ?? []).flatMap((s) => s.filters ?? []))).map(([name, count]) => ({ name, count }))} />
      <RankBars title="자주 간 장소" unit="롤" items={topCounts(rolls.flatMap((r) => r.locations.map((l) => l.name || undefined))).map(([name, count]) => ({ name, count }))} />
      <RankBars title="자주 맡긴 현상소" unit="롤" items={topCounts(rolls.map((r) => r.lab || undefined)).map(([name, count]) => ({ name, count }))} />

      <Section title="기록">
        <Group>
          {info('한 롤 다 찍는 데', avgDaysText(rolls.map((r) => (r.finishedAt ? r.finishedAt - r.loadedAt : 0))))}
          {info('맡기고 스캔 받기까지', avgDaysText(rolls.map((r) => (r.droppedAt && r.importedAt ? r.importedAt - r.droppedAt : 0))))}
          {first !== undefined ? info('첫 롤', fmtDay(first)) : null}
          {last !== undefined ? info('최근 롤', fmtDay(last)) : null}
          {info('즐겨찾기한 롤', `${rolls.filter((r) => r.favorite).length}롤`)}
        </Group>
      </Section>

      <SpendingCard period={period} range={range} kinds={[
        ['카메라', cameras.filter(kept)], ['렌즈', lenses], ['액세서리', accessories], ['필름', lots],
      ]} onMore={() => setSpending(true)} />
    </Sheet>
  )
}

/** 장비에 쓴 돈: 여태까지 합계를 크게, 기간 구입, 종류별 비율 막대 (웹과 같음) */
function SpendingCard({ period, range, kinds, onMore }: {
  period: StatsPeriod; range: [number, number]; kinds: [string, { price?: string; purchasedAt?: number }[]][]; onMore: () => void
}) {
  const c = useTheme()
  const sums = kinds.map(([name, list]) => ({
    name, total: list.reduce((n, x) => n + priceValue(x.price), 0),
    inPeriod: list.filter((x) => x.purchasedAt !== undefined && x.purchasedAt >= range[0] && x.purchasedAt <= range[1]).reduce((n, x) => n + priceValue(x.price), 0),
  }))
  const total = sums.reduce((n, x) => n + x.total, 0)
  const inPeriod = sums.reduce((n, x) => n + x.inPeriod, 0)
  const shade = (i: number) => c.safelight + ['FF', 'C7', '8F', '57'][i]
  return (
    <Section title="장비에 쓴 돈" foot="구입 금액을 적은 것만 더해요. 기간 구입은 구입일을 적은 것만이에요.">
      <Group>
        <View style={{ padding: 14 }}>
          <Text style={{ fontSize: 14, color: c.muted }}>여태까지</Text>
          <Text style={{ fontSize: 30, fontWeight: '800', color: c.ink, fontVariant: ['tabular-nums'] }}>{priceText(total)}</Text>
          {period !== 'all' ? <Text style={{ fontSize: 15, fontWeight: '600', color: c.safelight }}>{statsPeriodName[period]} 구입 {priceText(inPeriod)}</Text> : null}
          <View style={{ flexDirection: 'row', gap: 2, height: 12, borderRadius: 4, overflow: 'hidden', marginTop: 12 }}>
            {sums.map((x, i) => (x.total > 0 ? <View key={x.name} style={{ flex: x.total, backgroundColor: shade(i) }} /> : null))}
          </View>
          {sums.map((x, i) => (
            <View key={x.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: shade(i) }} />
              <Text style={{ flex: 1, fontSize: 15, color: c.ink }}>{x.name}</Text>
              <Text style={{ fontSize: 15, fontWeight: '700', color: c.ink, fontVariant: ['tabular-nums'] }}>{priceText(x.total)}</Text>
            </View>
          ))}
        </View>
      </Group>
      <Group style={{ marginTop: 8 }}>
        <Row chev onPress={onMore}><RowText>장비별 · 카메라 조합 자세히</RowText></Row>
      </Group>
    </Section>
  )
}

function Legend({ color, label, value }: { color: string; label: string; value: string }) {
  const c = useTheme()
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: color }} />
      <Text style={{ fontSize: 14, color: c.muted }}>{label} <Text style={{ color: c.ink, fontWeight: '600' }}>{value}</Text></Text>
    </View>
  )
}

/** 기간 막대 (한 가지 색). 누르면 그 막대를 고른다. 가장 많은 막대(또는 고른 막대)에만 숫자 (웹과 같음) */
function BarChart({ bars, selected, onPick }: { bars: Bucket[]; selected?: string; onPick: (key: string) => void }) {
  const c = useTheme()
  const max = Math.max(1, ...bars.map((m) => m.rolls.length))
  const peak = bars.reduce((a, b) => (b.rolls.length > a.rolls.length ? b : a), bars[0])
  const every = Math.max(1, Math.ceil(bars.length / 7))
  return (
    <View style={{ padding: 14, paddingBottom: 10 }} accessibilityLabel={bars.map((m) => `${m.title} ${m.rolls.length}롤`).join(', ')}>
      <View style={{ flexDirection: 'row', gap: 4, height: 120, alignItems: 'flex-end' }}>
        {bars.map((m) => {
          const on = selected === m.key
          return (
            <Pressable key={m.key} onPress={() => onPick(m.key)} style={{ flex: 1, height: '100%', justifyContent: 'flex-end', alignItems: 'center' }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: c.ink, minHeight: 16 }}>{(on || (!selected && m === peak)) && m.rolls.length > 0 ? String(m.rolls.length) : ''}</Text>
              <View style={{ width: '100%', maxWidth: 18, minHeight: 2, height: `${(m.rolls.length / max) * 82}%`, backgroundColor: c.safelight, opacity: selected && !on ? 0.35 : 1, borderTopLeftRadius: 4, borderTopRightRadius: 4 }} />
            </Pressable>
          )
        })}
      </View>
      <View style={{ flexDirection: 'row', gap: 4, marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: c.sep }}>
        {bars.map((m, i) => (
          <Text key={m.key} numberOfLines={1} style={{ flex: 1, fontSize: 11, color: c.muted, textAlign: 'center' }}>{(bars.length - 1 - i) % every === 0 ? m.label : ''}</Text>
        ))}
      </View>
    </View>
  )
}

/** 많이 쓴 순위: 이름 · 길이로 비교되는 막대 · 숫자 */
function RankBars({ title, unit, items }: { title: string; unit: string; items: { name: string; count: number; icon?: ReactNode }[] }) {
  const c = useTheme()
  const max = Math.max(1, ...items.map((i) => i.count))
  return (
    <Section title={title}>
      <Group>
        {items.length === 0 ? <Row static><Sub>기록이 없어요</Sub></Row> : (
          <View style={{ paddingHorizontal: 14, paddingVertical: 4 }}>
            {items.map((item, i) => (
              <View key={item.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: i ? 0.5 : 0, borderTopColor: c.sep }}>
                {item.icon ? <View style={{ width: 34, alignItems: 'center' }}>{item.icon}</View> : null}
                <View style={{ flex: 1, gap: 6 }}>
                  <Text numberOfLines={1} style={{ fontSize: 15, color: c.ink }}>{item.name}</Text>
                  <View style={{ height: 6, backgroundColor: c.fill, borderRadius: 4, overflow: 'hidden' }}>
                    <View style={{ width: `${(item.count / max) * 100}%`, height: '100%', backgroundColor: c.safelight, borderRadius: 4 }} />
                  </View>
                </View>
                <Text style={{ fontSize: 15, fontWeight: '600', color: c.ink, minWidth: 44, textAlign: 'right', fontVariant: ['tabular-nums'] }}>{item.count}{unit}</Text>
              </View>
            ))}
          </View>
        )}
      </Group>
    </Section>
  )
}
