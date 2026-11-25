// 길게 누르기 메뉴 (웹 ui/PressMenu.tsx · 아이폰과 같음): 누른 것이 떠오르고 뒤가 어두워지며, 아래에 메뉴가 나온다.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Animated, Pressable, View, useWindowDimensions } from 'react-native'
import { Text } from './text'
import { Icon } from './icons'
import { Glass } from './glass'
import { Floating, tick, useLeaving } from './overlay'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from './theme'

export interface PressItem { label: string; icon: string; danger?: boolean; onPress: () => void }
type Rect = { x: number; y: number; w: number; h: number }

/** children에 onLongPress를 이어 준다. 떠오르는 모습은 같은 내용을 한 번 더 그린다 */
export function PressMenu({ items, children }: { items: PressItem[]; children: (onLongPress: () => void) => ReactNode }) {
  const ref = useRef<View>(null)
  const [at, setAt] = useState<Rect>()
  const open = () => { tick(15); ref.current?.measureInWindow((x, y, w, h) => setAt({ x, y, w, h })) }
  return (
    <View ref={ref} collapsable={false} style={{ opacity: at ? 0 : 1 }}>
      {children(open)}
      {at ? <Floating onClose={() => setAt(undefined)}><Lifted rect={at} items={items} onClose={() => setAt(undefined)}>{children(() => {})}</Lifted></Floating> : null}
    </View>
  )
}

function Lifted({ rect, items, onClose, children }: { rect: Rect; items: PressItem[]; onClose: () => void; children: ReactNode }) {
  const c = useTheme()
  const insets = useSafeAreaInsets()
  const { width: sw, height: sh } = useWindowDimensions()
  const leaving = useLeaving()
  const v = useRef(new Animated.Value(0)).current
  useEffect(() => { Animated.spring(v, { toValue: 1, stiffness: 300, damping: 20, mass: 0.8, useNativeDriver: true }).start() }, [v])
  useEffect(() => { if (leaving) Animated.timing(v, { toValue: 0, duration: 180, useNativeDriver: true }).start() }, [leaving, v])
  const menuH = items.length * 46 + 16
  const below = rect.y + rect.h + 16 + menuH < sh - insets.bottom - 16
  const above = !below && rect.y - 16 - menuH > insets.top
  const lift = below || above ? 0 : sh - insets.bottom - 24 - menuH - rect.y - rect.h
  return (
    <Pressable onPress={onClose} style={{ flex: 1 }}>
      <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.2)', opacity: v }} />
      <Animated.View pointerEvents="none" style={{ position: 'absolute', left: rect.x, top: rect.y + lift, width: rect.w, height: rect.h, borderRadius: 22, overflow: 'hidden', backgroundColor: c.cell,
        boxShadow: '0px 14px 44px rgba(0,0,0,0.2)', transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }] }}>{children}</Animated.View>
      <Animated.View style={{ position: 'absolute', width: 250, left: Math.min(Math.max(16, rect.x + (rect.w > 300 ? 60 : 0)), sw - 266),
        top: above ? rect.y - 12 - menuH : rect.y + rect.h + lift + 16, borderRadius: 26, overflow: 'hidden', boxShadow: '0px 12px 40px rgba(0,0,0,0.2)',
        opacity: v.interpolate({ inputRange: [0, 0.5], outputRange: [0, 1], extrapolate: 'clamp' }), transformOrigin: above ? 'bottom left' : 'top left', transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }] }}>
        <Glass intensity={40} tint={c.dark ? 'dark' : 'light'} style={{ backgroundColor: c.glass, paddingVertical: 8 }}>
          {items.map((it) => (
            <Pressable key={it.label} onPress={() => { onClose(); it.onPress() }} style={({ pressed }) => ({ minHeight: 46, paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: pressed ? c.fill : 'transparent' })}>
              <Icon name={it.icon} size={21} color={c.safelight} />
              <Text style={{ fontSize: 17, color: it.danger ? c.danger : c.ink }}>{it.label}</Text>
            </Pressable>
          ))}
        </Glass>
      </Animated.View>
    </Pressable>
  )
}
