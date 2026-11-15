// 웹 pages/Stats.tsx — 통계: 숫자 타일, 월별 롤 그래프, 컬러·흑백, 많이 쓴 순위 막대
import { useState, type ReactNode } from 'react'
import { View } from 'react-native'
import { Text } from '../text'
import { db, kept } from '../data'
import { useLiveQuery } from '../store'
import { rollFilmName } from '../core/display'
import { filmById } from '../core/films'
import { groupedNumber } from '../core/types'
import { colorSplit, monthlyRolls, rollsThisYear, topCounts, type MonthBar } from '../core/stats'
import { Canister, Group, Row, RowText, Section, Sub } from '../kit'
import { Sheet, SheetBtn } from '../overlay'
import { useTheme } from '../theme'
import { Spending } from './Spending'

export function Stats({ onClose }: { onClose: () => void }) {
  const c = useTheme()
  const rolls = (useLiveQuery(() => db.rolls.toArray(), []) ?? []).filter(kept)
  const cameras = useLiveQuery(() => db.cameras.toArray(), []) ?? []
  const lenses = useLiveQuery(() => db.lenses.toArray(), []) ?? []
  const frameCount = useLiveQuery(() => db.frames.count(), []) ?? 0
  const [spending, setSpending] = useState(false)
  const cameraName = (id?: string, brand?: string, model?: string) => {
    const x = cameras.find((k) => k.id === id)
    return x ? `${x.brand} ${x.model}` : [brand, model].filter(Boolean).join(' ') || undefined
  }
  const lensName = (id?: string) => { const l = lenses.find((x) => x.id === id); return l ? `${l.brand} ${l.model}`.trim() : undefined }
  const photos = Math.max(rolls.reduce((n, r) => n + (r.frameCount ?? 0), 0), frameCount)
  const split = colorSplit(rolls)
  const films = topCounts(rolls.map((r) => r.filmId)).map(([id, n]) => {
    const roll = rolls.find((r) => r.filmId === id)!
    const film = filmById(id)
    return { name: rollFilmName(roll), count: n, icon: film ? <Canister film={film} size={34} /> : undefined }
  })
  const tile = (label: string, value: number) => (
    <View style={{ flex: 1, backgroundColor: c.card, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 12, gap: 2 }}>
      <Text style={{ fontSize: 28, fontWeight: '700', color: c.ink, fontVariant: ['tabular-nums'] }}>{groupedNumber(value)}</Text>
      <Text style={{ fontSize: 13, color: c.muted }}>{label}</Text>
    </View>
  )
  if (spending) return <Spending onClose={() => setSpending(false)} />

  return (
    <Sheet title="통계" onClose={onClose} left={null} right={<SheetBtn label="완료" accent onPress={onClose} />}>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, marginBottom: 18 }}>
        {tile('총 롤', rolls.length)}
        {tile('총 사진', photos)}
        {tile('올해 롤', rollsThisYear(rolls))}
      </View>

      <Section title="월별 롤 · 최근 12달">
        <Group><MonthChart months={monthlyRolls(rolls)} /></Group>
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

      <Group>
        <Row chev onPress={() => setSpending(true)}><RowText>장비에 쓴 돈</RowText></Row>
      </Group>
    </Sheet>
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

/** 최근 12달 막대 (한 가지 색). 가장 많은 달에만 숫자 */
function MonthChart({ months }: { months: MonthBar[] }) {
  const c = useTheme()
  const max = Math.max(1, ...months.map((m) => m.count))
  const peak = months.reduce((a, b) => (b.count > a.count ? b : a), months[0])
  return (
    <View style={{ padding: 14, paddingBottom: 10 }} accessibilityLabel={months.map((m) => `${m.title} ${m.count}롤`).join(', ')}>
      <View style={{ flexDirection: 'row', gap: 4, height: 120, alignItems: 'flex-end' }}>
        {months.map((m) => (
          <View key={m.key} style={{ flex: 1, height: '100%', justifyContent: 'flex-end', alignItems: 'center' }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: c.ink, minHeight: 16 }}>{m === peak && m.count > 0 ? String(m.count) : ''}</Text>
            <View style={{ width: '100%', maxWidth: 18, minHeight: 2, height: `${(m.count / max) * 82}%`, backgroundColor: c.safelight, borderTopLeftRadius: 4, borderTopRightRadius: 4 }} />
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 4, marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: c.sep }}>
        {months.map((m, i) => (
          <Text key={m.key} numberOfLines={1} style={{ flex: 1, fontSize: 11, color: c.muted, textAlign: 'center' }}>{i % 2 === 1 || i === 11 ? m.label : ''}</Text>
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
