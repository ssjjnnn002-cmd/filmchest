// 웹 ui/gearExtras.tsx와 같은 구성: 태그, 태그 거르기, 악세서리, 비워 둘 수 있는 날짜
import { useMemo, useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { DateTimePickerAndroid as Picker } from '@react-native-community/datetimepicker'
import { db } from './data'
import type { GearAccessory } from './core/types'
import { priceText, priceValue, uid } from './core/types'
import { groupPrice } from './core/optics'
import { Chip, Chips, Group, Row, Section } from './kit'
import { getPref, useLiveQuery } from './store'
import { forgetSuggestion, hiddenSet, rememberSuggestion } from './suggest'
import { useTheme } from './theme'

const cleanTag = (raw: string) => raw.trim().replace(/^#+/, '').trim()

export function useAllTags() {
  const lists = useLiveQuery(async () => [
    ...(await db.cameras.toArray()).map((x) => x.tags ?? []),
    ...(await db.lenses.toArray()).map((x) => x.tags ?? []),
    ...(await db.filters.toArray()).map((x) => x.tags ?? []),
    ...(await db.rolls.toArray()).map((x) => x.tags ?? []),
  ], [])
  return useMemo(() => (lists ?? []).flat(), [lists])
}

const X = ({ label, onPress, color }: { label: string; onPress: () => void; color?: string }) => (
  <Pressable onPress={onPress} hitSlop={8} accessibilityLabel={label}>
    <Text style={{ fontSize: 16, fontWeight: '700', marginLeft: -6, marginRight: 4, color }}>×</Text>
  </Pressable>
)

export function TagField({ tags, setTags }: { tags: string[]; setTags: (t: string[]) => void }) {
  const c = useTheme()
  const [text, setText] = useState('')
  const [rev, setRev] = useState(0)
  const used = useAllTags()
  const hits = useMemo(() => {
    const hidden = hiddenSet('tags')
    let known: string[] = []
    try { known = JSON.parse(getPref('tags', '[]')) } catch { /* 없음 */ }
    const seen = new Set(tags.map((t) => t.toLowerCase()))
    const out: string[] = []
    for (const t of [...known, ...used]) {
      const k = t.toLowerCase()
      if (hidden.has(k) || seen.has(k)) continue
      seen.add(k)
      out.push(t)
    }
    const q = cleanTag(text).toLowerCase()
    return out.filter((t) => !q || t.toLowerCase().includes(q)).slice(0, 12)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tags, used, text, rev])
  const add = (raw: string) => {
    const t = cleanTag(raw)
    if (!t) return
    if (!tags.some((x) => x.toLowerCase() === t.toLowerCase())) setTags([...tags, t])
    rememberSuggestion('tags', t)
    setText('')
  }
  return (
    <Section title="태그" foot="검색과 목록 정리에 써요.">
      <Group>
        {tags.length > 0 && <Chips>{tags.map((t) => (
          <View key={t} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Chip label={`#${t}`} active flat onPress={() => setTags(tags.filter((x) => x !== t))} />
            <X label={`${t} 빼기`} onPress={() => setTags(tags.filter((x) => x !== t))} />
          </View>
        ))}</Chips>}
        <Row>
          <TextInput value={text} onChangeText={setText} placeholder="태그 추가" placeholderTextColor={c.faint}
            autoCapitalize="none" returnKeyType="done" onSubmitEditing={() => add(text)} blurOnSubmit={false}
            style={{ flex: 1, fontSize: 17, color: c.ink, paddingVertical: 4 }} />
          {text.trim() ? <Pressable onPress={() => add(text)} hitSlop={8}><Text style={{ color: c.safelight, fontSize: 17 }}>추가</Text></Pressable> : null}
        </Row>
        {hits.length > 0 && <Chips>{hits.map((t) => (
          <View key={t} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Chip label={`#${t}`} flat onPress={() => add(t)} />
            <X label={`${t} 추천 지우기`} onPress={() => { forgetSuggestion('tags', t); setRev((n) => n + 1) }} />
          </View>
        ))}</Chips>}
      </Group>
    </Section>
  )
}

export function TagChips({ tags }: { tags?: string[] }) {
  if (!tags?.length) return null
  return <Chips>{tags.map((t) => <Chip key={t} label={`#${t}`} active flat onPress={() => {}} />)}</Chips>
}

export function TagFilter({ tags, value, onChange }: { tags: string[]; value?: string; onChange: (t?: string) => void }) {
  const list = useMemo(() => {
    const count = new Map<string, number>()
    tags.forEach((t) => count.set(t, (count.get(t) ?? 0) + 1))
    return [...count.keys()].sort((a, b) => (count.get(b)! - count.get(a)!) || a.localeCompare(b))
  }, [tags])
  if (!list.length) return null
  return <Chips>{list.map((t) => <Chip key={t} label={`#${t}`} flat active={value === t} onPress={() => onChange(value === t ? undefined : t)} />)}</Chips>
}

const accessoryNames = ['그립', '소프트 셔터 버튼', '스트랩', '스트랩 고리', '렌즈 후드', '케이스']

export function AccessoryFields({ items, setItems, bodyPrice }: { items: GearAccessory[]; setItems: (v: GearAccessory[]) => void; bodyPrice: string }) {
  const c = useTheme()
  const total = priceValue(bodyPrice) + items.reduce((n, a) => n + priceValue(a.price), 0)
  const patch = (id: string, p: Partial<GearAccessory>) => setItems(items.map((a) => (a.id === id ? { ...a, ...p } : a)))
  return (
    <Section title="악세서리">
      <Group>
        {items.map((a) => (
          <Row key={a.id}>
            <TextInput value={a.name} onChangeText={(v) => patch(a.id, { name: v })} placeholder="이름" placeholderTextColor={c.faint}
              style={{ flex: 1, fontSize: 17, color: c.ink, paddingVertical: 4 }} />
            <TextInput value={a.price ?? ''} onChangeText={(v) => patch(a.id, { price: groupPrice(v) || undefined })} placeholder="가격"
              placeholderTextColor={c.faint} keyboardType="number-pad"
              style={{ width: 110, fontSize: 17, color: c.ink, textAlign: 'right', paddingVertical: 4 }} />
            <Pressable onPress={() => setItems(items.filter((x) => x.id !== a.id))} hitSlop={8} accessibilityLabel="악세서리 지우기">
              <Text style={{ fontSize: 18, color: c.muted, marginLeft: 10 }}>×</Text>
            </Pressable>
          </Row>
        ))}
        <Chips>
          {accessoryNames.map((n) => <Chip key={n} label={`+ ${n}`} flat onPress={() => setItems([...items, { id: uid(), name: n }])} />)}
          <Chip label="+ 직접 입력" flat onPress={() => setItems([...items, { id: uid(), name: '' }])} />
        </Chips>
        {total > 0 && (
          <Row static>
            <Text style={{ flex: 1, fontSize: 17, color: c.ink }}>본체 + 악세서리</Text>
            <Text style={{ fontSize: 17, fontWeight: '700', color: c.ink }}>{priceText(total)}</Text>
          </Row>
        )}
      </Group>
    </Section>
  )
}

/** 비워 둘 수 있는 날짜: 누르면 바로 달력, × 로 지우기 */
export function OptionalDate({ label, value, onChange, max }: { label: string; value?: number; onChange: (v?: number) => void; max?: number }) {
  const c = useTheme()
  const open = () => Picker.open({
    value: new Date(value ?? Date.now()), mode: 'date', maximumDate: max ? new Date(max) : undefined,
    onChange: (e, picked) => {
      if (e.type !== 'set' || !picked) return
      const x = new Date(picked); x.setHours(12, 0, 0, 0); onChange(x.getTime())
    },
  })
  const d = value !== undefined ? new Date(value) : undefined
  return (
    <Row>
      <Text style={{ flex: 1, fontSize: 17, color: c.ink }}>{label}</Text>
      <Pressable onPress={open} hitSlop={8}>
        <Text style={{ fontSize: 17, color: d ? c.ink : c.muted }}>{d ? `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.` : '기록 안 함'}</Text>
      </Pressable>
      {d ? <Pressable onPress={() => onChange(undefined)} hitSlop={8} accessibilityLabel={`${label} 지우기`}><Text style={{ fontSize: 18, color: c.muted, marginLeft: 10 }}>×</Text></Pressable> : null}
    </Row>
  )
}

