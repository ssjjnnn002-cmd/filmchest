// 웹 styles.css의 기본 부품을 그대로 옮긴 것 (.section, .group, .row, .field, .toggle, .btn, .chip, .segmented, .search, .status ...)
import { Children, createContext, Fragment, isValidElement, useContext, useEffect, useState, type ReactNode } from 'react'
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker'
import Slider from '@react-native-community/slider'
import { notifyFieldFocus } from './fieldFocus'
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, Switch, View, type TextInputProps, type ViewStyle } from 'react-native'
import { Text } from './text'
import { TextInput } from './textInput'
import { Icon } from './icons'
import { watchWork } from './core/work'
import { useTheme } from './theme'
import { statusName, type Camera, type FilmFormat, type RollStatus, filmPack } from './core/types'
import { formatInfo } from './core/types'
import type { FilmStock } from './core/films'
import { canisterShots } from './canisterShots'
import { modelShots } from './modelShots'
import { modelHash, profileFor } from './core/profiles'
import { useCameraPhoto } from './files'
import { webTool } from './webTools'

/** .section: 위아래 22, 회색 제목(15/600), 아래 작은 설명 */
export function Section({ title, right, foot, warn, children, style }: {
  title?: string; right?: ReactNode; foot?: string; warn?: boolean; children: ReactNode; style?: ViewStyle
}) {
  const c = useTheme()
  return (
    <View style={[{ gap: 8, marginVertical: 11 }, style]}>
      {title || right ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, gap: 8 }}>
          <Text style={{ color: c.muted, fontSize: 15, fontWeight: '600', flexShrink: 1 }}>{title}</Text>
          {right}
        </View>
      ) : null}
      {children}
      {foot ? <Footnote warn={warn}>{foot}</Footnote> : null}
    </View>
  )
}

export function Footnote({ children, warn }: { children: ReactNode; warn?: boolean }) {
  const c = useTheme()
  return <Text style={{ color: warn ? c.warn : c.muted, fontSize: 13, lineHeight: 18, paddingHorizontal: 18 }}>{children}</Text>
}

/** .group: 흰 둥근 묶음. 줄 사이에 왼쪽 18 띄운 구분선 */
/** 묶음 안에 있는지 (웹 .suggest: 묶음 안 칩 줄은 여백·작은 회색 칩) */
const InGroup = createContext(false)
const isChips = (x: unknown) => isValidElement(x) && x.type === Chips
export function Group({ children, style, plain }: { children: ReactNode; style?: ViewStyle; /** 구분선 없이 */ plain?: boolean }) {
  const c = useTheme()
  const items = Children.toArray(children).filter((x) => isValidElement(x) || typeof x === 'string')
  return (
    <InGroup.Provider value>
      <View style={[{ backgroundColor: c.cell, borderRadius: 22, overflow: 'hidden' }, style]}>
        {items.map((child, i) => (
          <Fragment key={i}>
            {/* 웹처럼 칩 줄 앞뒤에는 선을 긋지 않는다 (칩은 위 칸에 딸린 것) */}
            {i > 0 && !plain && !isChips(child) && !isChips(items[i - 1]) ? <View style={{ height: 0.5, marginLeft: 18, backgroundColor: c.sep }} /> : null}
            {child}
          </Fragment>
        ))}
      </View>
    </InGroup.Provider>
  )
}

/** .row: 누를 수 있는 한 줄 */
export function Row({ children, onPress, accent, danger, chev, value, static: isStatic, style }: {
  children: ReactNode; onPress?: () => void; accent?: boolean; danger?: boolean; chev?: boolean; value?: string; static?: boolean; style?: ViewStyle
}) {
  const c = useTheme()
  const color = danger ? c.danger : accent ? c.safelight : c.ink
  const body = (pressed: boolean) => (
    <View style={[{ minHeight: 52, paddingVertical: 12, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: pressed ? c.fill : 'transparent' }, style]}>
      {typeof children === 'string' ? <Text style={{ flex: 1, fontSize: 17, color }}>{children}</Text> : children}
      {value ? <Text style={{ color: c.muted, fontSize: 17, textAlign: 'right', flexShrink: 1 }} numberOfLines={1}>{value}</Text> : null}
      {chev ? <Icon name="chev" size={18} color={c.faint} /> : null}
    </View>
  )
  if (!onPress || isStatic) return body(false)
  return <Pressable onPress={() => watchWork(onPress())}>{({ pressed }) => body(pressed)}</Pressable>
}

/** 줄 안 글자 (웹 .row 안의 기본 글자) */
export function RowText({ children, color, sub, grow = true, lines = 1 }: { children: ReactNode; color?: string; sub?: string; grow?: boolean; lines?: number }) {
  const c = useTheme()
  return (
    <View style={{ flex: grow ? 1 : undefined, minWidth: 0 }}>
      <Text style={{ fontSize: 17, color: color ?? c.ink }} numberOfLines={lines}>{children}</Text>
      {sub ? <Text style={{ fontSize: 14, color: c.muted }} numberOfLines={1}>{sub}</Text> : null}
    </View>
  )
}

/** .field: 왼쪽 이름, 오른쪽 값. 여러 줄(또는 stack)이면 위에 작은 이름, 아래 입력 */
export function Field({ label, children, stack, suffix, ...input }: { label: string; children?: ReactNode; stack?: boolean; /** 입력 오른쪽에 늘 보이는 단위 (예: mm) */ suffix?: string } & TextInputProps) {
  const c = useTheme()
  const stacked = stack || input.multiline
  if (stacked) {
    return (
      <View style={{ minHeight: 52, paddingVertical: 8, paddingHorizontal: 18, gap: 4 }}>
        <Text style={{ fontSize: 13, color: c.muted }}>{label}</Text>
        {children ?? (
          <TextInput placeholderTextColor={c.faint} {...input} onFocus={(e) => { notifyFieldFocus(); input.onFocus?.(e) }}
            style={[{ fontSize: 17, color: c.ink, paddingVertical: 3, paddingHorizontal: 0 }, input.multiline ? { minHeight: 64, textAlignVertical: 'top', lineHeight: 23 } : null]} />
        )}
      </View>
    )
  }
  return (
    <View style={{ minHeight: 52, paddingVertical: 8, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <Text style={{ fontSize: 17, color: c.ink, minWidth: 72, maxWidth: '45%' }} numberOfLines={1}>{label}</Text>
      <View style={{ flex: 1, minWidth: 0, alignItems: 'flex-end', flexDirection: suffix ? 'row' : 'column', justifyContent: 'flex-end', gap: 4 }}>
        {children ?? (
          <TextInput placeholderTextColor={c.faint} returnKeyType="done" submitBehavior="blurAndSubmit" {...input}
            onFocus={(e) => { notifyFieldFocus(); input.onFocus?.(e) }}
            style={{ alignSelf: 'stretch', flex: suffix ? 1 : undefined, fontSize: 17, color: c.ink, paddingVertical: 3, paddingHorizontal: 0, textAlign: 'right' }} />
        )}
        {suffix ? <Text style={{ fontSize: 17, color: c.muted, alignSelf: 'center' }}>{suffix}</Text> : null}
      </View>
    </View>
  )
}

/** .toggle: 이름 + 스위치 */
export function Toggle({ label, value, onChange, sub }: { label: string; value: boolean; onChange: (v: boolean) => void; sub?: string }) {
  const c = useTheme()
  return (
    <View style={{ minHeight: 52, paddingVertical: 10, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 17, color: c.ink }}>{label}</Text>
        {sub ? <Text style={{ fontSize: 14, color: c.muted }}>{sub}</Text> : null}
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: '#34C759', false: c.fill }} thumbColor="#FFFFFF" />
    </View>
  )
}

/** .btn */
export function Btn({ label, onPress, kind, size, block, disabled, icon }: {
  label: string; onPress: () => void; kind?: 'primary' | 'soft' | 'ghost' | 'danger'; size?: 'small' | 'large' | 'stack'; block?: boolean; disabled?: boolean; icon?: string
}) {
  const c = useTheme()
  const bg = kind === 'primary' ? c.safelight : kind === 'soft' ? c.soft : kind === 'ghost' || kind === 'danger' ? 'transparent' : c.fill
  const color = kind === 'primary' ? '#fff' : kind === 'soft' || kind === 'ghost' ? c.safelight : kind === 'danger' ? c.danger : c.ink
  const height = size === 'large' ? 54 : size === 'stack' ? 50 : size === 'small' ? 32 : 40
  return (
    <Pressable disabled={disabled} onPress={() => watchWork(onPress())} style={({ pressed }) => ({
      height, paddingHorizontal: kind === 'ghost' ? 8 : size === 'small' ? 12 : 18, borderRadius: size === 'large' || size === 'stack' ? 16 : 999,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: bg,
      alignSelf: block ? 'stretch' : 'auto', flex: block ? undefined : undefined,
      opacity: disabled ? 0.4 : 1, transform: [{ scale: pressed && !disabled ? 0.97 : 1 }],
    })}>
      {icon ? <Icon name={icon} size={18} color={color} /> : null}
      <Text style={{ color, fontSize: size === 'large' ? 17 : size === 'stack' ? 16 : size === 'small' ? 14 : 15, fontWeight: '600', includeFontPadding: false }} numberOfLines={1}>{label}</Text>
    </Pressable>
  )
}

/** .chip */
export function Chip({ label, active, icon, chevron, onPress, flat: flatProp }: {
  label: string; active?: boolean; icon?: string; chevron?: boolean; onPress: () => void; flat?: boolean
}) {
  const groupFlat = useContext(ChipsFlat)
  const flat = flatProp ?? groupFlat
  const c = useTheme()
  const color = active ? '#fff' : c.ink
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({
      height: flat ? 32 : 36, paddingHorizontal: 14, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 5,
      backgroundColor: active ? c.safelight : flat ? c.fill : c.cell, opacity: pressed ? 0.8 : 1,
      boxShadow: flat || active ? undefined : c.shadow,
    })}>
      {icon ? <Icon name={icon} size={16} color={color} /> : null}
      <Text style={{ color, fontSize: flat ? 14 : 15, fontWeight: '500' }} numberOfLines={1}>{label}</Text>
      {chevron ? <Icon name="chevDown" size={12} color={color} /> : null}
    </Pressable>
  )
}

export function Chips({ children }: { children: ReactNode }) {
  const inGroup = useContext(InGroup)
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}
      contentContainerStyle={inGroup ? { gap: 6, paddingHorizontal: 18, paddingBottom: 12 } : { gap: 8, paddingHorizontal: 2, paddingTop: 2, paddingBottom: 4 }}>
      <ChipsFlat.Provider value={inGroup}>{children}</ChipsFlat.Provider>
    </ScrollView>
  )
}
/** 묶음 안 칩 줄의 칩은 웹 .suggest .chip처럼 낮고 회색 */
const ChipsFlat = createContext(false)

/** .segmented */
export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  const c = useTheme()
  return (
    <View style={{ flexDirection: 'row', backgroundColor: c.fill, borderRadius: 999, padding: 3 }}>
      {options.map(([id, name]) => {
        const on = id === value
        return (
          <Pressable key={id} onPress={() => onChange(id)} style={{
            flex: 1, minWidth: 0, height: 34, borderRadius: 999, alignItems: 'center', justifyContent: 'center',
            backgroundColor: on ? c.cell : 'transparent',
            boxShadow: on ? '0px 2px 8px rgba(0,0,0,0.1)' : undefined,
          }}>
            <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: on ? '600' : '500', color: c.ink }}>{name}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

/** .search */
export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  const c = useTheme()
  return (
    <View style={{ height: 44, borderRadius: 22, backgroundColor: c.fill, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 8 }}>
      <Icon name="search" size={18} color={c.muted} />
      <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={c.muted}
        style={{ flex: 1, minWidth: 0, fontSize: 17, color: c.ink, padding: 0 }} returnKeyType="search" />
    </View>
  )
}

const statusTone: Record<RollStatus, 'safelight' | 'warn' | 'blue' | 'good'> = {
  loaded: 'safelight', finished: 'warn', atLab: 'blue', imported: 'good',
}
/** .status */
export function StatusBadge({ status }: { status: RollStatus }) {
  const c = useTheme()
  const color = c[statusTone[status]]
  return (
    <View style={{ borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: `${color}26` }}>
      <Text style={{ color, fontSize: 12, fontWeight: '600' }}>{statusName[status]}</Text>
    </View>
  )
}

/** .progress */
export function Progress({ done, total }: { done: number; total: number }) {
  const c = useTheme()
  return (
    <View style={{ height: 6, borderRadius: 3, backgroundColor: c.fill, overflow: 'hidden' }}>
      <View style={{ width: `${(done / Math.max(total, 1)) * 100}%`, height: '100%', backgroundColor: c.safelight }} />
    </View>
  )
}

export function Sub({ children, lines }: { children: ReactNode; lines?: number }) {
  const c = useTheme()
  return <Text style={{ fontSize: 14, color: c.muted }} numberOfLines={lines}>{children}</Text>
}

/** .empty */
export function Empty({ icon = 'film', title, children }: { icon?: string; title: string; children?: ReactNode }) {
  const c = useTheme()
  return (
    <View style={{ alignItems: 'center', gap: 10, paddingVertical: 64, paddingHorizontal: 16 }}>
      {icon ? <Icon name={icon} size={40} color={c.muted} /> : null}
      <Text style={{ color: c.ink, fontSize: 20, fontWeight: '700', textAlign: 'center' }}>{title}</Text>
      {children}
    </View>
  )
}

export function EmptyText({ children }: { children: ReactNode }) {
  const c = useTheme()
  return <Text style={{ color: c.muted, fontSize: 17, lineHeight: 23, textAlign: 'center' }}>{children}</Text>
}

/** .skeleton */
export function Skeleton({ height }: { height: number }) {
  const c = useTheme()
  return <View style={{ height, borderRadius: 12, backgroundColor: c.fill }} />
}

export function Spinner() {
  const c = useTheme()
  return <ActivityIndicator color={c.muted} />
}

/** .card */
export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const c = useTheme()
  return (
    <View style={[{ backgroundColor: c.card, borderRadius: 22, padding: 16, gap: 10, minWidth: 0,
      boxShadow: c.shadow }, style]}>
      {children}
    </View>
  )
}

/** 필름 통 그림 (웹 canister.ts를 미리 그려 둔 것). 목록에 없는 필름은 색 상자. */
export function Canister({ film, format = '135', size = 48, cover, thumb }: { film?: FilmStock; format?: FilmFormat; size?: number; /** 썸네일처럼 칸 너비에 꽉 채운다 (웹과 같음) */ cover?: boolean; /** 목록 썸네일 [너비, 높이]: 그 칸을 꽉 채운다 */ thumb?: [number, number] }) {
  const c = useTheme()
  if (!film) return <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}><Icon name="film" size={size * 0.6} color={c.muted} /></View>
  // 목록에 있는 필름은 미리 그려 둔 상자 그림 (웹과 같은 그림), 직접 만든 필름은 웹 그림을 그 자리에서 그린다
  const pack = filmPack(format)
  const k = pack === 'roll' ? '120' : format === '110' ? '110' : format === 'sheet-45' ? '45' : format === 'sheet-810' ? '810' : pack === 'instant' ? 'inst' : '135'
  const src = canisterShots[`${film.id}-${k}`]
  if (src && thumb) return <Image source={src} resizeMode="cover" style={{ width: thumb[0], height: thumb[1], borderRadius: thumb[0] > 70 ? 10 : 6 }} accessibilityLabel={film.name} />
  // 칸 너비에 맞춘 틀 안에 꽉 채운다 (그림 크기대로 커져 칸 밖으로 넘치지 않게)
  if (src && cover) return (
    <View style={{ alignSelf: 'stretch', aspectRatio: 1.6, borderRadius: 8, overflow: 'hidden' }}>
      <Image source={src} resizeMode="cover" style={{ width: '100%', height: '100%' }} accessibilityLabel={film.name} />
    </View>
  )
  if (src) return <Image source={src} resizeMode="contain" style={{ width: size, height: size }} accessibilityLabel={film.name} />
  return <DrawnCanister film={film} format={format} size={size} />
}

// 직접 추가한 필름: 웹 canister.ts로 그린 그림
const drawn = new Map<string, string>()
function DrawnCanister({ film, format, size }: { film: FilmStock; format: FilmFormat; size: number }) {
  const key = `box|${film.id}|${film.name}|${film.iso}|${film.style.body}|${format}`
  const [uri, setUri] = useState(drawn.get(key))
  useEffect(() => {
    if (drawn.has(key)) { setUri(drawn.get(key)); return }
    let live = true
    webTool<string>('canister', { stock: film, format, size: 360 }).then((u) => { drawn.set(key, u); if (live) setUri(u) }).catch(() => {})
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return uri ? <Image source={{ uri }} resizeMode="contain" style={{ width: size, height: size }} accessibilityLabel={film.name} /> : <View style={{ width: size, height: size }} />
}

/** 렌즈 기본 모형 그림 (사진이 없는 렌즈, 웹과 같은 그림) */
const lensShots = new Map<string, string>()
export function LensPicture({ brand, model, mount, width, height }: { brand: string; model: string; mount?: string; width: number | `${number}%`; height: number }) {
  const key = `${brand}|${model}|${mount ?? ''}`
  const [uri, setUri] = useState(lensShots.get(key))
  useEffect(() => {
    if (lensShots.has(key)) { setUri(lensShots.get(key)); return }
    let live = true
    webTool<string>('lensShot', { brand, model, mount: mount ?? '' }).then((u) => { lensShots.set(key, u); if (live) setUri(u) }).catch(() => {})
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return uri ? <Image source={{ uri }} resizeMode="contain" style={{ width, height }} accessibilityLabel="렌즈 그림" /> : <View style={{ width, height }} />
}

/** 카메라 대표 모습: 기기 파일로 둔 사진 → 기본 3D 모형 정지 이미지 */
export function CameraCover({ camera, height = 110, fill }: { camera: Camera; height?: number; fill?: boolean }) {
  const wantPhoto = !!(camera.hasPhoto || camera.photo)
  const photo = useCameraPhoto(camera.id, wantPhoto)
  const hash = modelHash(profileFor(camera.brand, camera.model, camera.style))
  const model = modelShots[hash] ?? modelShots[modelHash(profileFor('', '', camera.style))]
  if (photo) {
    return <CoverPhoto uri={photo} height={height} camera={camera} fill={fill} />
  }
  if (model) return <Image source={model} resizeMode="contain" style={{ width: '100%', height }} />
  return <View style={{ height, alignItems: 'center', justifyContent: 'center' }}><Spinner /></View>
}

function CoverPhoto({ uri, height, camera, fill }: { uri: string; height: number; camera: Camera; fill?: boolean }) {
  const [w, setW] = useState(0)
  return (
    <View style={{ width: '100%', height, overflow: 'hidden' }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      <Image source={{ uri }} resizeMode={fill ? 'cover' : 'contain'} style={{ width: '100%', height,
        transform: [{ translateX: (camera.photoOffsetX ?? 0) * w }, { translateY: (camera.photoOffsetY ?? 0) * height }, { scale: camera.photoScale ?? 1 }] }} />
    </View>
  )
}

/** 웹 <select class="input">: 오른쪽 회색 글자, 누르면 목록 창 */
export function Select<T extends string>({ value, options, onChange, color, title }: {
  value: T; options: [T, string][]; onChange: (v: T) => void; color?: string; title?: string
}) {
  const c = useTheme()
  const [open, setOpen] = useState(false)
  const name = options.find(([k]) => k === value)?.[1] ?? ''
  return (
    <>
      <Pressable onPress={() => setOpen(true)} hitSlop={8} style={{ alignSelf: 'stretch', alignItems: 'flex-end' }}>
        <Text numberOfLines={1} style={{ fontSize: 17, color: color ?? c.muted, textAlign: 'right' }}>{name}</Text>
      </Pressable>
      {open ? <OptionsModal title={title} value={value} options={options} onPick={(k) => { setOpen(false); onChange(k) }} onClose={() => setOpen(false)} /> : null}
    </>
  )
}

const pad2 = (n: number) => String(n).padStart(2, '0')
/** 웹 <input type="date|datetime-local">: 값 글자, 누르면 안드로이드 날짜·시간 창 */
export function DateInput({ value, onChange, time, min, max }: { value: number; onChange: (ms: number) => void; time?: boolean; min?: number; max?: number }) {
  const c = useTheme()
  const d = new Date(value)
  const text = `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.${time ? ` ${d.getHours() < 12 ? '오전' : '오후'} ${pad2(((d.getHours() + 11) % 12) + 1)}:${pad2(d.getMinutes())}` : ''}`
  const open = () => {
    DateTimePickerAndroid.open({
      value: d, mode: 'date', minimumDate: min ? new Date(min) : undefined, maximumDate: max ? new Date(max) : undefined,
      onChange: (e, picked) => {
        if (e.type !== 'set' || !picked) return
        if (!time) { const x = new Date(picked); x.setHours(12, 0, 0, 0); onChange(x.getTime()); return }
        DateTimePickerAndroid.open({
          value: picked, mode: 'time',
          onChange: (e2, t) => {
            const x = new Date(picked)
            if (e2.type === 'set' && t) x.setHours(t.getHours(), t.getMinutes(), 0, 0)
            else x.setHours(d.getHours(), d.getMinutes(), 0, 0)
            onChange(x.getTime())
          },
        })
      },
    })
  }
  return (
    <Pressable onPress={open} hitSlop={8} style={{ alignSelf: 'stretch', alignItems: 'flex-end', minHeight: 28, justifyContent: 'center' }}>
      <Text style={{ fontSize: 17, color: c.ink }}>{text}</Text>
    </Pressable>
  )
}

/** .slider */
export function RangeSlider({ value, min, max, step, onChange }: { value: number; min: number; max: number; step: number; onChange: (v: number) => void }) {
  const c = useTheme()
  return <Slider style={{ flex: 1, minWidth: 0, height: 32 }} value={value} minimumValue={min} maximumValue={max} step={step}
    onValueChange={onChange} minimumTrackTintColor={c.safelight} maximumTrackTintColor={c.fill} thumbTintColor={c.dark ? '#ddd' : '#fff'} />
}

/** 목록 창 (웹 <select>를 눌렀을 때 뜨는 목록) */
export function OptionsModal<T extends string>({ title, value, options, onPick, onClose }: {
  title?: string; value: T; options: [T, string][]; onPick: (v: T) => void; onClose: () => void
}) {
  const c = useTheme()
  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', padding: 32 }}>
        <View style={{ backgroundColor: c.cell, borderRadius: 22, overflow: 'hidden', maxHeight: '80%' }}>
          {title ? <Text style={{ fontSize: 15, fontWeight: '600', color: c.muted, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 6 }}>{title}</Text> : null}
          <ScrollView>
            {options.map(([k, label], i) => (
              <Pressable key={k || '_'} onPress={() => onPick(k)}
                style={({ pressed }) => ({ minHeight: 52, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 12,
                  backgroundColor: pressed ? c.fill : 'transparent', borderTopWidth: i ? 0.5 : 0, borderTopColor: c.sep })}>
                <Text style={{ flex: 1, fontSize: 17, color: c.ink }}>{label}</Text>
                {k === value ? <Icon name="check" size={20} color={c.safelight} /> : null}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Pressable>
    </Modal>
  )
}
