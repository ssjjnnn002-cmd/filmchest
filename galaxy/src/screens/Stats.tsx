// 웹 pages/Stats.tsx — 통계
import { useState } from 'react'
import { Text } from 'react-native'
import { db, kept } from '../data'
import { useLiveQuery } from '../store'
import { rollFilmName } from '../core/display'
import { Group, Row, RowText, Section, Sub } from '../kit'
import { Sheet, SheetBtn } from '../overlay'
import { useTheme } from '../theme'
import { Spending } from './Spending'

export function Stats({ onClose }: { onClose: () => void }) {
  const c = useTheme()
  const rolls = (useLiveQuery(() => db.rolls.toArray(), []) ?? []).filter(kept)
  const cameras = useLiveQuery(() => db.cameras.toArray(), []) ?? []
  const lenses = useLiveQuery(() => db.lenses.toArray(), []) ?? []
  const [spending, setSpending] = useState(false)
  const count = (names: (string | undefined)[]) => {
    const m = new Map<string, number>()
    names.filter((n): n is string => !!n).forEach((n) => m.set(n, (m.get(n) ?? 0) + 1))
    return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 5)
  }
  const cameraName = (id?: string, brand?: string, model?: string) => {
    const x = cameras.find((k) => k.id === id)
    return x ? `${x.brand} ${x.model}` : [brand, model].filter(Boolean).join(' ') || undefined
  }
  const lensName = (id?: string) => { const l = lenses.find((x) => x.id === id); return l ? `${l.brand} ${l.model}`.trim() : undefined }
  const photos = rolls.reduce((n, r) => n + (r.frameCount ?? 0), 0)
  const rank = (title: string, list: [string, number][], unit: string) => (
    <Section key={title} title={title}>
      <Group>
        {list.length === 0 ? <Row static><Sub>기록이 없어요</Sub></Row>
          : list.map(([name, n], i) => <Row key={name} static value={`${n}${unit}`}><RowText>{`${i + 1}. ${name}`}</RowText></Row>)}
      </Group>
    </Section>
  )
  return (
    <Sheet title="통계" onClose={onClose} right={<SheetBtn label="완료" accent onPress={onClose} />}>
      <Group>
        <Row static value={String(rolls.length)}><RowText>총 롤</RowText></Row>
        <Row static value={String(photos)}><RowText>총 사진</RowText></Row>
        <Row chev onPress={() => setSpending(true)}><Text style={{ flex: 1, fontSize: 17, color: c.ink }}>장비에 쓴 돈</Text></Row>
      </Group>
      {rank('자주 쓴 필름', count(rolls.map((r) => rollFilmName(r))), '롤')}
      {rank('많이 사용한 카메라', count(rolls.map((r) => cameraName(r.cameraId, r.cameraBrand, r.cameraModel))), '롤')}
      {rank('많이 사용한 렌즈', count(rolls.flatMap((r) => [lensName(r.lensId), ...(r.lensChanges ?? []).map((x) => lensName(x.lensId))])), '롤')}
      {rank('많이 사용한 필터', count(rolls.flatMap((r) => (r.meterShots ?? []).flatMap((s) => s.filters ?? []))), '컷')}
      {spending ? <Spending onClose={() => setSpending(false)} /> : null}
    </Sheet>
  )
}
