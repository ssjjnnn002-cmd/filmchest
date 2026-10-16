import { type ReactNode } from 'react'
import { Image, Platform, Pressable, ScrollView, StatusBar, Text, TextInput, View, type TextInputProps } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { canisterShots } from './canisterShots'
import type { FilmStock } from './films'
import { Icon } from './icons'
import { useTheme } from './theme'
import { formatInfo, type FilmFormat } from './types'

const GUTTER = 16

export function GlassButton({ onPress, label, children, prominent }: {
  onPress: () => void
  label: string
  children: ReactNode
  prominent?: boolean
}) {
  const c = useTheme()
  const round = label !== '완료' && !prominent
  return (
    <Pressable accessibilityLabel={label} onPress={onPress} style={({ pressed }) => ({
      height: 44, width: round ? 44 : undefined, minWidth: 44,
      paddingHorizontal: round ? 0 : 16, borderRadius: 22,
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: prominent ? c.safelight : c.glass,
      borderWidth: prominent ? 0 : 0.5, borderColor: c.glassLine,
      transform: [{ scale: pressed ? 0.94 : 1 }],
    })}>
      {children}
    </Pressable>
  )
}

export function Screen({
  title, large, onBack, left, right, children,
}: {
  title: string
  large?: boolean
  onBack?: () => void
  left?: ReactNode
  right?: ReactNode
  children: ReactNode
}) {
  const c = useTheme()
  const insets = useSafeAreaInsets()
  const tab = !onBack
  const top = Math.max(insets.top, Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0)
  return (
    <View style={{ flex: 1, backgroundColor: c.paper }}>
      <View style={{ paddingTop: top + 10, paddingBottom: 8, paddingHorizontal: GUTTER }}>
        <View style={{ height: 44, flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start' }}>
            {onBack ? (
              <GlassButton label="뒤로" onPress={onBack}><Icon name="back" size={22} color={c.safelight} /></GlassButton>
            ) : left}
          </View>
          {!large ? <Text style={{ color: c.ink, fontSize: 17, fontWeight: '600', maxWidth: '46%' }} numberOfLines={1}>{title}</Text> : null}
          <View style={{ flex: 1, height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>{right}</View>
        </View>
      </View>
      {large ? (
        <Text style={{ color: c.ink, fontSize: 34, fontWeight: '700', letterSpacing: -0.68, lineHeight: 40, paddingHorizontal: GUTTER + 2, paddingTop: 6, paddingBottom: 14 }}>
          {title}
        </Text>
      ) : null}
      <ScrollView contentContainerStyle={{ paddingHorizontal: GUTTER, paddingBottom: tab ? insets.bottom + 118 : 48, gap: 18 }} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </View>
  )
}

export function Section({ title, children, foot }: { title?: string; children: ReactNode; foot?: string }) {
  const c = useTheme()
  return (
    <View style={{ gap: 8 }}>
      {title ? <Text style={{ color: c.muted, fontSize: 13, fontWeight: '600', paddingHorizontal: 16 }}>{title}</Text> : null}
      <View style={{ backgroundColor: c.cell, borderRadius: 22, overflow: 'hidden' }}>{children}</View>
      {foot ? <Text style={{ color: c.muted, fontSize: 13, lineHeight: 18, paddingHorizontal: 16 }}>{foot}</Text> : null}
    </View>
  )
}

export function Row({ label, value, onPress, danger, last }: {
  label: string
  value?: string
  onPress?: () => void
  danger?: boolean
  last?: boolean
}) {
  const c = useTheme()
  const body = (
    <View style={{ minHeight: 52, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12,
      borderBottomWidth: last ? 0 : 0.5, borderBottomColor: c.sep }}>
      <Text style={{ flex: 1, fontSize: 17, color: danger ? c.danger : c.ink }}>{label}</Text>
      {value ? <Text style={{ color: c.muted, fontSize: 17, maxWidth: '48%' }} numberOfLines={1}>{value}</Text> : null}
      {onPress && !danger ? <Icon name="chev" size={18} color={c.faint} /> : null}
    </View>
  )
  if (!onPress) return body
  return <Pressable onPress={onPress} style={({ pressed }) => ({ backgroundColor: pressed ? c.sep : 'transparent' })}>{body}</Pressable>
}

export function Field({ label, ...props }: { label: string } & TextInputProps) {
  const c = useTheme()
  return (
    <View style={{ minHeight: 52, paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 0.5, borderBottomColor: c.sep }}>
      <Text style={{ width: 72, fontSize: 17, color: c.ink }}>{label}</Text>
      <TextInput
        placeholderTextColor={c.faint}
        {...props}
        style={{ flex: 1, fontSize: 17, color: c.ink, paddingVertical: 8, textAlign: 'right' }}
      />
    </View>
  )
}

export function Button({ label, onPress, kind = 'primary', disabled, block }: {
  label: string
  onPress: () => void
  kind?: 'primary' | 'plain' | 'danger' | 'soft'
  disabled?: boolean
  block?: boolean
}) {
  const c = useTheme()
  const bg = kind === 'primary' ? c.safelight : kind === 'soft' ? c.soft : kind === 'danger' ? 'transparent' : c.fill
  const color = kind === 'primary' ? '#fff' : kind === 'danger' ? c.danger : c.safelight
  return (
    <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => ({
      alignSelf: block ? 'stretch' : 'center',
      height: block ? 50 : 40,
      paddingHorizontal: 18,
      borderRadius: block ? 16 : 999,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: bg,
      opacity: disabled ? 0.4 : 1,
      transform: [{ scale: pressed && !disabled ? 0.97 : 1 }],
    })}>
      <Text style={{ color, fontSize: block ? 16 : 15, lineHeight: 20, fontWeight: '600', includeFontPadding: false, textAlignVertical: 'center' }}>{label}</Text>
    </Pressable>
  )
}

export function Chips({ value, options, onChange }: {
  value: string
  options: [string, string][]
  onChange: (id: string) => void
}) {
  const c = useTheme()
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8, padding: 12 }}>
      {options.map(([id, name]) => {
        const on = id === value
        return (
          <Pressable key={id} onPress={() => onChange(id)} style={{
            height: 36, paddingHorizontal: 14, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
            backgroundColor: on ? c.safelight : c.paper,
          }}>
            <Text style={{ color: on ? '#fff' : c.ink, fontSize: 15, fontWeight: '500' }}>{name}</Text>
          </Pressable>
        )
      })}
    </ScrollView>
  )
}

export function Empty({ icon = 'film', title, detail, action, onPress }: {
  icon?: string
  title: string
  detail?: string
  action?: string
  onPress?: () => void
}) {
  const c = useTheme()
  return (
    <View style={{ alignItems: 'center', gap: 10, paddingVertical: 64, paddingHorizontal: 16 }}>
      <Icon name={icon} size={40} color={c.faint} />
      <Text style={{ color: c.ink, fontSize: 20, fontWeight: '700', textAlign: 'center' }}>{title}</Text>
      {detail ? <Text style={{ color: c.muted, fontSize: 17, lineHeight: 23, textAlign: 'center' }}>{detail}</Text> : null}
      {action && onPress ? <Button label={action} onPress={onPress} /> : null}
    </View>
  )
}

function canisterKind(film: FilmStock | undefined, format?: FilmFormat) {
  if (format && formatInfo[format].is120) return '120'
  if (!format && film && film.formats.length > 0 && film.formats.every((item) => formatInfo[item].is120)) return '120'
  return '135'
}

/** 웹앱·아이폰과 같은 필름 통. 목록에 없는 필름만 색 상자로 대신한다. */
export function Canister({ film, size = 56, format }: { film?: FilmStock; size?: number; format?: FilmFormat }) {
  const src = film ? canisterShots[`${film.id}-${canisterKind(film, format)}`] : undefined
  if (src) {
    return <Image source={src} resizeMode="contain" style={{ width: size, height: size }} accessibilityLabel={film?.name ?? '필름'} />
  }
  const height = Math.round(size * 1.35)
  const body = film?.style.body ?? '#E7E1D6'
  const band = film?.style.band ?? '#C8C2B8'
  const text = film?.style.text ?? '#1A1816'
  const bandText = film?.style.bandText ?? '#FFFFFF'
  return (
    <View style={{ width: size, height, borderRadius: size * 0.14, backgroundColor: body, overflow: 'hidden' }}>
      <View style={{ height: Math.max(6, height * 0.1), backgroundColor: film?.style.cap ?? '#2B2B2B' }} />
      <Text style={{ textAlign: 'center', color: text, fontSize: Math.max(8, size * 0.12), fontWeight: '700', marginTop: 4, paddingHorizontal: 3 }} numberOfLines={1}>
        {film?.name ?? '필름'}
      </Text>
      <View style={{ flex: 1 }} />
      <View style={{ height: height * 0.3, backgroundColor: band, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: bandText, fontWeight: '800', fontSize: Math.max(11, size * 0.22) }}>{film?.iso ?? ''}</Text>
      </View>
    </View>
  )
}

export function fmtDay(ms?: number | null) {
  if (!ms) return ''
  const d = new Date(ms)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`
}
