// 웹 ui/gearExtras.tsx와 같은 구성: 태그, 태그 거르기, 악세서리, 비워 둘 수 있는 날짜
import { useMemo, useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { DateTimePickerAndroid as Picker } from '@react-native-community/datetimepicker'
import { db } from './data'
import { defaultAccessoryKinds, uid } from './core/types'
import { Chip, Chips, Group, Row, Section } from './kit'
import { getPref, setPref, useLiveQuery } from './store'
import { forgetSuggestion, hiddenSet, rememberSuggestion } from './suggest'
import { useTheme } from './theme'
import { Icon } from './icons'

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

/** 액세서리 유형: 기본 + 사용자가 더한 것 */
export function accessoryKinds(): string[] {
  let added: string[] = []
  try { added = JSON.parse(getPref('accessoryKinds', '[]')) } catch { /* 없음 */ }
  return [...defaultAccessoryKinds, ...added.filter((k) => !defaultAccessoryKinds.includes(k))]
}
export function addAccessoryKind(raw: string) {
  const name = raw.trim()
  if (!name || accessoryKinds().includes(name)) return
  let added: string[] = []
  try { added = JSON.parse(getPref('accessoryKinds', '[]')) } catch { /* 없음 */ }
  setPref('accessoryKinds', JSON.stringify([...added, name]))
}

/** 태그별로 묶기 (웹과 같음) */
export function tagSections<T extends { tags?: string[] }>(items: T[], grouped: boolean): { title?: string; items: T[] }[] {
  if (!grouped) return [{ items }]
  const all = [...new Set(items.flatMap((x) => x.tags ?? []))].sort((a, b) => a.localeCompare(b))
  const out: { title?: string; items: T[] }[] = all.map((t) => ({ title: `#${t}`, items: items.filter((x) => x.tags?.includes(t)) }))
  const none = items.filter((x) => !x.tags?.length)
  if (none.length) out.push({ title: '태그 없음', items: none })
  return out
}

/** 블록 안 태그 한 줄. 없어도 자리를 지켜 블록 높이가 같다 */
export function TagLine({ tags }: { tags?: string[] }) {
  const c = useTheme()
  return (
    <Text numberOfLines={1} style={{ fontSize: 12, lineHeight: 17, height: 17, fontWeight: '600', color: c.safelight, opacity: tags?.length ? 1 : 0 }}>
      {tags?.length ? tags.map((t) => `#${t}`).join(' ') : ' '}
    </Text>
  )
}

/** 묶음 제목 */
export function GroupTitle({ children }: { children: string }) {
  const c = useTheme()
  return <Text style={{ fontSize: 14, fontWeight: '600', color: c.muted, marginTop: 6, marginHorizontal: 4 }}>{children}</Text>
}

/** 예전에 카메라 안에 적어 둔 액세서리를 액세서리 탭 장비로 옮긴다 */
export async function migrateAccessories() {
  for (const cam of await db.cameras.toArray()) {
    if (!cam.accessories?.length) continue
    const ids = [...(cam.accessoryIds ?? [])]
    for (const a of cam.accessories) {
      if (!a.name.trim()) continue
      const id = uid()
      await db.filters.put({ id, kind: accessoryKinds().includes(a.name) ? a.name : '기타', name: a.name, price: a.price, createdAt: Date.now() })
      ids.push(id)
    }
    await db.cameras.update(cam.id, { accessories: undefined, accessoryIds: ids })
  }
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


/** 사진 고르기 줄 메뉴 (아이폰·웹과 같은 모양): 사진 찍기 · 앨범에서 사진 고르기 · 사진 지우기 */
export function PhotoRows({ onCamera, onAlbum, onClear, inset = 12 }: { onCamera: () => void; onAlbum: () => void; onClear?: () => void; inset?: number }) {
  const c = useTheme()
  const row = (icon: string, label: string, color: string, onPress: () => void) => (
    <Pressable key={label} onPress={onPress} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 18,
      borderTopWidth: 0.5, borderTopColor: c.sep, backgroundColor: pressed ? c.fill : undefined })}>
      <Icon name={icon} size={22} color={color} />
      <Text style={{ fontSize: 17, color }}>{label}</Text>
    </Pressable>
  )
  return (
    <View style={{ marginHorizontal: -inset, marginBottom: -inset }}>
      {row('camera', '사진 찍기', c.safelight, onCamera)}
      {row('photos', '앨범에서 사진 고르기', c.safelight, onAlbum)}
      {onClear ? row('trash', '사진 지우기', c.danger, onClear) : null}
    </View>
  )
}
