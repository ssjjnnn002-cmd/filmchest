// 웹 common.tsx의 Sheet·Confirm·useToast, .menu 를 갤럭시로 옮긴 것
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Animated, Keyboard, Modal, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native'
import { BlurView } from 'expo-blur'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from './theme'

/** 시트 머리의 동그란 버튼 (.sheet-head .btn). right 쪽이면 주황 */
export function SheetBtn({ label, onPress, accent, disabled }: { label: string; onPress: () => void; accent?: boolean; disabled?: boolean }) {
  const c = useTheme()
  return (
    <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => ({
      height: 44, paddingHorizontal: 16, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
      backgroundColor: c.glass, borderWidth: 0.5, borderColor: c.glassLine,
      shadowColor: '#28201a', shadowOpacity: 0.12, shadowRadius: 18, shadowOffset: { width: 0, height: 4 }, elevation: 2,
      opacity: disabled ? 0.4 : 1, transform: [{ scale: pressed && !disabled ? 0.96 : 1 }],
    })}>
      <Text style={{ color: accent ? c.safelight : c.ink, fontSize: 17, fontWeight: accent ? '600' : '500' }}>{label}</Text>
    </Pressable>
  )
}

function useKeyboard() {
  const [h, setH] = useState(0)
  useEffect(() => {
    const a = Keyboard.addListener('keyboardDidShow', (e) => setH(e.endCoordinates.height))
    const b = Keyboard.addListener('keyboardDidHide', () => setH(0))
    return () => { a.remove(); b.remove() }
  }, [])
  return h
}

/** 아래에서 올라오는 창. page면 화면을 꽉 채운다. */
export function Sheet({ title, onClose, left, right, children, page, scroll = true }: {
  title: string; onClose: () => void; left?: ReactNode; right?: ReactNode; children: ReactNode; page?: boolean
  /** false면 안쪽을 스스로 스크롤하는 내용(지도·웹뷰 등) */
  scroll?: boolean
}) {
  const c = useTheme()
  const insets = useSafeAreaInsets()
  const { height } = useWindowDimensions()
  const keyboard = useKeyboard()
  const head = (
    <View style={{ minHeight: 64, paddingTop: 8, paddingBottom: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <View style={{ flex: 1, alignItems: 'flex-start' }}>{left ?? <SheetBtn label="닫기" onPress={onClose} />}</View>
      <Text style={{ color: c.ink, fontSize: 17, fontWeight: '600', maxWidth: '46%', textAlign: 'center' }} numberOfLines={1}>{title}</Text>
      <View style={{ flex: 1, alignItems: 'flex-end' }}>{right}</View>
    </View>
  )
  const body = scroll ? (
    <ScrollView keyboardShouldPersistTaps="handled" style={page ? { flex: 1 } : { flexGrow: 0 }}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: (keyboard ? 12 : insets.bottom) + 28 }}>
      {children}
    </ScrollView>
  ) : <View style={{ flex: 1 }}>{children}</View>
  if (page) {
    return (
      <Modal visible animationType="slide" onRequestClose={onClose} statusBarTranslucent>
        <View style={{ flex: 1, backgroundColor: c.paper, paddingTop: insets.top, paddingBottom: keyboard }}>
          {head}
          {body}
        </View>
      </Modal>
    )
  }
  const max = Math.round(height - Math.max(insets.top, 12) - 12 - keyboard)
  return (
    <Modal transparent visible animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: 'flex-end', paddingBottom: keyboard }}>
        <Pressable onPress={onClose} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.3)' }} />
        <View style={{ maxHeight: max, height: scroll ? undefined : max, backgroundColor: c.paper, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden',
          shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 40, elevation: 12 }}>
          <View style={{ width: 36, height: 5, borderRadius: 3, backgroundColor: c.faint, opacity: 0.6, alignSelf: 'center', marginTop: 6 }} />
          {head}
          {body}
        </View>
      </View>
    </Modal>
  )
}

/** 페이지 안 확인 창 (.alert) */
export function Confirm({ message, action = '삭제', onConfirm, onCancel }: {
  message: string; action?: string; onConfirm: () => void; onCancel: () => void
}) {
  const c = useTheme()
  const btn = (label: string, color: string, fn: () => void) => (
    <Pressable onPress={fn} style={({ pressed }) => ({ flex: 1, height: 48, borderRadius: 999, backgroundColor: c.fill, alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.96 : 1 }] })}>
      <Text style={{ color, fontSize: 17, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  )
  return (
    <Modal transparent visible animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <Pressable onPress={onCancel} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.25)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Pressable style={{ width: '100%', maxWidth: 320, borderRadius: 28, overflow: 'hidden', elevation: 16 }}>
          <BlurView intensity={40} tint={c.dark ? 'dark' : 'light'} style={{ backgroundColor: c.glass, paddingTop: 22, paddingHorizontal: 18, paddingBottom: 16 }}>
            <Text style={{ color: c.ink, fontSize: 17, fontWeight: '600', textAlign: 'center', lineHeight: 23, marginBottom: 16 }}>{message}</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {btn('취소', c.ink, onCancel)}
              {btn(action, c.danger, onConfirm)}
            </View>
          </BlurView>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

/** 오른쪽 위 버튼에서 내려오는 메뉴 (.menu) */
export function Menu({ items, onClose }: { items: { label: string; danger?: boolean; onPress: () => void }[]; onClose: () => void }) {
  const c = useTheme()
  const insets = useSafeAreaInsets()
  const scale = useRef(new Animated.Value(0.9)).current
  useEffect(() => { Animated.timing(scale, { toValue: 1, duration: 180, useNativeDriver: true }).start() }, [scale])
  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable onPress={onClose} style={{ flex: 1 }}>
        <Animated.View style={{ position: 'absolute', right: 16, top: insets.top + 10 + 52, minWidth: 200, borderRadius: 18, overflow: 'hidden', elevation: 14, transform: [{ scale }] }}>
          <BlurView intensity={40} tint={c.dark ? 'dark' : 'light'} style={{ backgroundColor: c.glass }}>
            {items.map((it, i) => (
              <Pressable key={it.label} onPress={() => { onClose(); it.onPress() }}
                style={({ pressed }) => ({ minHeight: 46, paddingVertical: 10, paddingHorizontal: 16, justifyContent: 'center', backgroundColor: pressed ? c.fill : 'transparent',
                  borderTopWidth: i ? 0.5 : 0, borderTopColor: c.sep })}>
                <Text style={{ fontSize: 17, color: it.danger ? c.danger : c.ink }}>{it.label}</Text>
              </Pressable>
            ))}
          </BlurView>
        </Animated.View>
      </Pressable>
    </Modal>
  )
}

/** .toast — 화면 아래 떠 있다가 사라지는 한 줄 */
export function useToast() {
  const c = useTheme()
  const insets = useSafeAreaInsets()
  const [msg, setMsg] = useState<string>()
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const anim = useRef(new Animated.Value(0)).current
  const show = (m: string) => {
    setMsg(m)
    anim.setValue(0)
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, stiffness: 260, damping: 20 }).start()
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      Animated.timing(anim, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => setMsg(undefined))
    }, 2400)
  }
  const node = msg ? (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 16, right: 16, bottom: insets.bottom + 96, alignItems: 'center',
      opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }] }}>
      <View style={{ borderRadius: 999, overflow: 'hidden', borderWidth: 0.5, borderColor: c.glassLine, elevation: 6 }}>
        <BlurView intensity={30} tint={c.dark ? 'dark' : 'light'} style={{ backgroundColor: c.glass, paddingHorizontal: 20, paddingVertical: 12 }}>
          <Text style={{ color: c.ink, fontSize: 15, fontWeight: '600', textAlign: 'center' }}>{msg}</Text>
        </BlurView>
      </View>
    </Animated.View>
  ) : null
  return [node, show] as const
}
