// 웹 PageHeader + .page: 위에 동그란 유리 버튼, 아래 큰 제목. 스크롤하면 가운데 작은 제목.
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { Animated, Pressable, Text, View, type ScrollView } from 'react-native'
import { BlurView } from 'expo-blur'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Icon } from './icons'
import { useTheme } from './theme'

/** 화면마다 보던 스크롤 위치, 같은 탭 다시 누르면 맨 위로 */
export interface PageScroll {
  key: string
  saved: Map<string, number>
  toTop: Set<() => void>
}
export const PageScrollContext = createContext<PageScroll | null>(null)

/** .glass-btn */
export function GlassBtn({ icon, label, onPress, prominent, back, disabled }: {
  icon?: string; label?: string; onPress: () => void; prominent?: boolean; back?: boolean; disabled?: boolean
}) {
  const c = useTheme()
  const color = prominent ? '#fff' : back ? c.ink : c.safelight
  return (
    <Pressable disabled={disabled} onPress={onPress} accessibilityLabel={label} style={({ pressed }) => ({
      height: 44, minWidth: 44, width: label && !icon ? undefined : icon && !label ? 44 : undefined,
      paddingHorizontal: icon && !label ? 0 : 14, borderRadius: 22, flexDirection: 'row', gap: 4,
      alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
      backgroundColor: prominent ? c.safelight : c.glass, borderWidth: prominent ? 0 : 0.5, borderColor: c.glassLine,
      shadowColor: '#28201a', shadowOpacity: 0.12, shadowRadius: 18, shadowOffset: { width: 0, height: 4 }, elevation: 3,
      opacity: disabled ? 0.4 : 1, transform: [{ scale: pressed && !disabled ? 0.94 : 1 }],
    })}>
      {icon ? <Icon name={icon} size={22} color={color} /> : null}
      {label && !icon ? <Text style={{ color, fontSize: 17, fontWeight: prominent ? '600' : '500' }}>{label}</Text> : null}
    </Pressable>
  )
}

/** .glass-group: 오른쪽 위 버튼 여러 개를 한 캡슐에 */
export function GlassGroup({ items }: { items: { icon: string; label: string; onPress: () => void }[] }) {
  const c = useTheme()
  return (
    <View style={{ height: 44, borderRadius: 22, paddingHorizontal: 4, flexDirection: 'row', backgroundColor: c.glass,
      borderWidth: 0.5, borderColor: c.glassLine, shadowColor: '#28201a', shadowOpacity: 0.12, shadowRadius: 18, shadowOffset: { width: 0, height: 4 }, elevation: 3 }}>
      {items.map((it) => (
        <Pressable key={it.label} accessibilityLabel={it.label} onPress={it.onPress}
          style={({ pressed }) => ({ width: 48, height: 44, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1, transform: [{ scale: pressed ? 0.88 : 1 }] })}>
          <Icon name={it.icon} size={23} color={c.safelight} />
        </Pressable>
      ))}
    </View>
  )
}

/** 화면 하나: 머리 + 스크롤 내용. 내용 좌우 16 여백, 아래는 탭바 자리. */
export function Page({ title, onBack, left, actions, large = true, children, footer }: {
  title: string; onBack?: () => void; left?: ReactNode; actions?: ReactNode; large?: boolean; children: ReactNode; footer?: ReactNode
}) {
  const c = useTheme()
  const insets = useSafeAreaInsets()
  const scroll = useContext(PageScrollContext)
  const ref = useRef<ScrollView>(null)
  const y = useRef(new Animated.Value(0)).current
  const [scrolled, setScrolled] = useState(!large)
  const titleBottom = 50
  useEffect(() => {
    const start = scroll?.saved.get(scroll.key) ?? 0
    if (start > 0) requestAnimationFrame(() => ref.current?.scrollTo({ y: start, animated: false }))
    if (!scroll) return
    const top = () => ref.current?.scrollTo({ y: 0, animated: true })
    scroll.toTop.add(top)
    return () => { scroll.toTop.delete(top) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const head = insets.top + 10 + 44 + 8
  return (
    <View style={{ flex: 1, backgroundColor: c.paper }}>
      <Animated.ScrollView ref={ref as never} keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y } } }], {
          useNativeDriver: false,
          listener: (e: { nativeEvent: { contentOffset: { y: number } } }) => {
            const v = e.nativeEvent.contentOffset.y
            if (scroll) scroll.saved.set(scroll.key, v)
            if (large) setScrolled(v > titleBottom)
          },
        })}
        contentContainerStyle={{ paddingTop: head, paddingHorizontal: 16, paddingBottom: 110 + insets.bottom }}>
        {large ? <Text style={{ fontSize: 34, fontWeight: '700', letterSpacing: -0.7, color: c.ink, paddingTop: 6, paddingHorizontal: 2, paddingBottom: 14 }}>{title}</Text> : null}
        {children}
      </Animated.ScrollView>
      <View pointerEvents="box-none" style={{ position: 'absolute', top: 0, left: 0, right: 0, paddingTop: insets.top + 10, paddingBottom: 8, paddingHorizontal: 16, overflow: 'hidden' }}>
        {scrolled ? (
          <BlurView intensity={30} tint={c.dark ? 'dark' : 'light'} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: c.dark ? 'rgba(19,18,17,0.78)' : 'rgba(242,240,234,0.78)' }} />
        ) : null}
        <View pointerEvents="box-none" style={{ height: 44, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ flex: 1, flexDirection: 'row', gap: 8, justifyContent: 'flex-start' }}>
            {onBack ? <GlassBtn icon="back" label="뒤로" back onPress={onBack} /> : null}
            {left}
          </View>
          <Text numberOfLines={1} style={{ maxWidth: '50%', fontSize: 17, fontWeight: '600', color: c.ink, opacity: scrolled ? 1 : 0 }}>{title}</Text>
          <View style={{ flex: 1, flexDirection: 'row', gap: 8, justifyContent: 'flex-end' }}>{actions}</View>
        </View>
      </View>
      {footer}
    </View>
  )
}
