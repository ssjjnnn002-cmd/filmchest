// 웹 pages/CustomFilmEdit.tsx — 목록에 없는 필름을 직접 만든다: 이름, 감도, 필름통 색
import { useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg'
import { db } from '../data'
import type { CustomFilmRow } from '../core/films'
import { customStock } from '../core/films'
import { uid } from '../core/types'
import { Canister, Chip, Field, Group, RangeSlider, Row, RowText, Section, Toggle } from '../kit'
import { Icon } from '../icons'
import { Confirm, Sheet, SheetBtn } from '../overlay'
import { useTheme } from '../theme'

const isoChoices = [50, 100, 125, 160, 200, 250, 400, 500, 800, 1600, 3200]
const palette = ['#F4EFE4', '#FDB913', '#F2A71B', '#E2231A', '#C8102E', '#E85D9C', '#5A2D82', '#1E4FA0', '#2B6CB0', '#00A15F', '#0C8A4B', '#1B1B1B', '#7A7A7A', '#F5F5F2']

export function CustomFilmEdit({ row, onClose }: { row?: CustomFilmRow; onClose: (selectId?: string) => void }) {
  const c = useTheme()
  const [name, setName] = useState(row?.name ?? '')
  const [iso, setIso] = useState(row?.iso ?? 400)
  const [color, setColor] = useState(row?.color ?? '#FDB913')
  const [bw, setBw] = useState(row?.bw ?? false)
  const [confirm, setConfirm] = useState(false)
  const [picker, setPicker] = useState(false)
  const preview = customStock({ id: row?.id ?? 'custom-preview', name: name.trim() || '내 필름', iso, color, bw, createdAt: 0 })

  const save = async () => {
    const value: CustomFilmRow = { id: row?.id ?? `custom-${uid()}`, name: name.trim(), iso, color, bw, createdAt: row?.createdAt ?? Date.now() }
    await db.customFilms.put(value)
    onClose(value.id)
  }

  return (
    <Sheet title={row ? '필름 수정' : '필름 직접 추가'} onClose={() => onClose()}
      right={<SheetBtn label="저장" accent disabled={!name.trim() || !iso} onPress={save} />}>
      <View style={{ alignItems: 'center', paddingTop: 8, paddingBottom: 4 }}>
        <Canister film={preview} size={150} />
      </View>
      <Section>
        <Group>
          <Field label="필름 이름" value={name} autoCorrect={false} onChangeText={setName} />
          <Field label="감도" keyboardType="number-pad" value={iso ? String(iso) : ''} onChangeText={(t) => setIso(Number(t.replace(/\D/g, '')) || 0)} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="always" contentContainerStyle={{ gap: 6, paddingHorizontal: 18, paddingBottom: 12 }}>
            {isoChoices.map((v) => <Chip key={v} label={String(v)} flat active={v === iso} onPress={() => setIso(v)} />)}
          </ScrollView>
          <Toggle label="흑백 필름" value={bw} onChange={setBw} />
        </Group>
      </Section>
      <Section title="필름통 색">
        <Group style={{ padding: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          {palette.map((p) => {
            const on = p.toLowerCase() === color.toLowerCase()
            return (
              <Pressable key={p} accessibilityLabel={`색 ${p}`} onPress={() => setColor(p)}
                style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: p, borderWidth: 0.5, borderColor: c.sep,
                  outlineWidth: on ? 2.5 : 0, outlineColor: c.safelight, outlineOffset: 3 } as never} />
            )
          })}
          <Pressable accessibilityLabel="다른 색 고르기" onPress={() => setPicker(true)} style={{ width: 32, height: 32, borderRadius: 16, overflow: 'hidden' }}>
            <Svg width={32} height={32}>
              <Defs>
                <LinearGradient id="rainbow" x1="0" y1="0" x2="1" y2="1">
                  {['#f00', '#ff0', '#0f0', '#0ff', '#00f', '#f0f', '#f00'].map((s, i) => <Stop key={i} offset={i / 6} stopColor={s} />)}
                </LinearGradient>
              </Defs>
              <Rect width={32} height={32} fill="url(#rainbow)" />
            </Svg>
          </Pressable>
        </Group>
      </Section>
      {row ? (
        <Group>
          <Row onPress={() => setConfirm(true)}><Icon name="trash" size={20} color={c.danger} /><RowText color={c.danger}>필름 삭제</RowText></Row>
        </Group>
      ) : null}
      {picker ? <ColorPicker value={color} onPick={(v) => { setColor(v); setPicker(false) }} onClose={() => setPicker(false)} /> : null}
      {confirm && row ? (
        <Confirm message="이 필름을 목록에서 지울까요? 이 필름으로 기록한 롤은 그대로 남아요." onCancel={() => setConfirm(false)}
          onConfirm={async () => { setConfirm(false); await db.customFilms.delete(row.id); onClose('') }} />
      ) : null}
    </Sheet>
  )
}

// 웹 <input type="color"> 자리: 색상·채도·밝기
function hexToHsv(hex: string) {
  const n = parseInt(hex.replace('#', '').padEnd(6, '0').slice(0, 6), 16)
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min
  let h = 0
  if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return { h: (h * 60 + 360) % 360, s: max ? d / max : 0, v: max }
}
function hsvToHex(h: number, s: number, v: number) {
  const f = (n: number) => { const k = (n + h / 60) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)) }
  return `#${[f(5), f(3), f(1)].map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join('').toUpperCase()}`
}

function ColorPicker({ value, onPick, onClose }: { value: string; onPick: (hex: string) => void; onClose: () => void }) {
  const c = useTheme()
  const start = hexToHsv(value)
  const [h, setH] = useState(start.h)
  const [s, setS] = useState(start.s)
  const [v, setV] = useState(start.v)
  const hex = hsvToHex(h, s, v)
  const [text, setText] = useState(hex)
  return (
    <Sheet title="색 고르기" onClose={onClose} right={<SheetBtn label="완료" accent onPress={() => onPick(hex)} />}>
      <View style={{ alignItems: 'center', paddingVertical: 8 }}>
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: hex, borderWidth: 0.5, borderColor: c.sep }} />
      </View>
      <Section>
        <Group style={{ padding: 16, gap: 8 }}>
          <RowText>색상</RowText>
          <RangeSlider value={h} min={0} max={359} step={1} onChange={(x) => { setH(x); setText(hsvToHex(x, s, v)) }} />
          <RowText>채도</RowText>
          <RangeSlider value={s} min={0} max={1} step={0.01} onChange={(x) => { setS(x); setText(hsvToHex(h, x, v)) }} />
          <RowText>밝기</RowText>
          <RangeSlider value={v} min={0} max={1} step={0.01} onChange={(x) => { setV(x); setText(hsvToHex(h, s, x)) }} />
        </Group>
      </Section>
      <Group>
        <Field label="색 코드" value={text} autoCapitalize="characters" autoCorrect={false}
          onChangeText={(t) => {
            setText(t)
            if (/^#?[0-9a-f]{6}$/i.test(t)) { const x = hexToHsv(t.startsWith('#') ? t : `#${t}`); setH(x.h); setS(x.s); setV(x.v) }
          }} />
      </Group>
    </Sheet>
  )
}
