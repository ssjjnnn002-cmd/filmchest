// 웹 pages/Spending.tsx — 장비에 쓴 돈
import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { db, kept } from '../data'
import { useLiveQuery } from '../store'
import type { Camera, Lens } from '../core/types'
import { kindOf, priceText, priceValue } from '../core/types'
import { filmById, filmDisplayName } from '../core/films'
import { Footnote, Group, Row, Section, Sub } from '../kit'
import { Sheet, SheetBtn } from '../overlay'
import { useTheme } from '../theme'

export function Spending({ onClose }: { onClose: () => void }) {
  const c = useTheme()
  const cameras = (useLiveQuery(() => db.cameras.orderBy('sortOrder').toArray(), []) ?? []).filter(kept)
  const lenses = useLiveQuery(() => db.lenses.toArray(), []) ?? []
  const accessories = useLiveQuery(() => db.filters.toArray(), []) ?? []
  const lots = useLiveQuery(() => db.filmLots.toArray(), []) ?? []
  const [open, setOpen] = useState<string>()
  const sum = (list: { price?: string }[]) => list.reduce((n, x) => n + priceValue(x.price), 0)
  const cameraSum = sum(cameras), lensSum = sum(lenses), accSum = sum(accessories), filmSum = sum(lots)
  const gearSum = cameraSum + lensSum + accSum
  const lensesFor = (cam: Camera): Lens[] => cam.lensesChosen
    ? (cam.lensIds ?? []).map((id) => lenses.find((l) => l.id === id)).filter((l): l is Lens => !!l)
    : cam.mount ? lenses.filter((l) => l.mount.toLowerCase() === cam.mount!.toLowerCase()) : []
  const accFor = (cam: Camera) => (cam.accessoryIds ?? []).map((id) => accessories.find((a) => a.id === id)).filter((a): a is NonNullable<typeof a> => !!a)
  const won = (p?: string) => (p ? priceText(priceValue(p)) : '금액 없음')
  const line = (label: string, value: string, key?: string, sub?: string) => (
    <Row key={key ?? label} static>
      <View style={{ flex: 1, minWidth: 0 }}><Text numberOfLines={1} style={{ fontSize: 17, color: c.ink }}>{label}</Text>{sub ? <Sub>{sub}</Sub> : null}</View>
      <Text style={{ fontSize: 17, color: c.muted }}>{value}</Text>
    </Row>
  )
  const list = (title: string, items: { id: string; name: string; price?: string }[]) => items.length > 0 ? (
    <Section title={`${title}별`}>
      <Group>{[...items].sort((a, b) => priceValue(b.price) - priceValue(a.price)).map((x) => line(x.name, won(x.price), x.id))}</Group>
    </Section>
  ) : null
  return (
    <Sheet title="장비에 쓴 돈" onClose={onClose} right={<SheetBtn label="완료" accent onPress={onClose} />}>
      <Group style={{ padding: 18 }}>
        <Sub>여태까지 쓴 돈</Sub>
        <Text style={{ fontSize: 34, fontWeight: '800', color: c.ink }}>{priceText(gearSum + filmSum)}</Text>
      </Group>
      <Group style={{ marginTop: 10 }}>{line('장비', priceText(gearSum))}{line('필름', priceText(filmSum))}</Group>
      <Footnote>구입 금액을 적은 것만 더해요.</Footnote>
      <Section title="종류별">
        <Group>
          {line('카메라', priceText(cameraSum), 'c', `${cameras.length}대`)}
          {line('렌즈', priceText(lensSum), 'l', `${lenses.length}개`)}
          {line('액세서리', priceText(accSum), 'a', `${accessories.length}개`)}
          {line('필름', priceText(filmSum), 'f', `${lots.length}묶음`)}
        </Group>
      </Section>
      {cameras.length > 0 ? (
        <Section title="카메라 조합" foot="카메라 + 이 카메라에 쓰는 렌즈 + 액세서리. 렌즈를 여러 카메라에 쓰면 각 조합에 모두 들어가요.">
          <Group>
            {cameras.map((cam) => {
              const ls = lensesFor(cam), acc = accFor(cam)
              const total = priceValue(cam.price) + sum(ls) + sum(acc)
              return (
                <View key={cam.id}>
                  <Pressable onPress={() => setOpen(open === cam.id ? undefined : cam.id)}>
                    <Row static>
                      <Text numberOfLines={1} style={{ flex: 1, fontSize: 17, color: c.ink }}>{cam.brand} {cam.model}</Text>
                      <Text style={{ fontSize: 17, color: c.muted }}>{priceText(total)} {open === cam.id ? '▴' : '▾'}</Text>
                    </Row>
                  </Pressable>
                  {open === cam.id ? (
                    <View style={{ paddingLeft: 16 }}>
                      {line('본체', won(cam.price))}
                      {ls.map((l) => line(`렌즈 · ${l.brand} ${l.model}`, won(l.price), l.id))}
                      {acc.map((a) => line(`${kindOf(a)} · ${a.name}`, won(a.price), a.id))}
                    </View>
                  ) : null}
                </View>
              )
            })}
          </Group>
        </Section>
      ) : null}
      {list('카메라', cameras.map((x) => ({ id: x.id, name: `${x.brand} ${x.model}`, price: x.price })))}
      {list('렌즈', lenses.map((l) => ({ id: l.id, name: `${l.brand} ${l.model}`, price: l.price })))}
      {list('액세서리', accessories.map((a) => ({ id: a.id, name: `${kindOf(a)} · ${a.name}`, price: a.price })))}
      {list('필름', lots.map((l) => ({ id: l.id, name: `${filmDisplayName(filmById(l.filmId))} · ${l.count}롤`, price: l.price })))}
    </Sheet>
  )
}
