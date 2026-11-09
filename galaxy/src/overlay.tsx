// 웹 common.tsx의 Sheet·Confirm·useToast, .menu 를 갤럭시로 옮긴 것
import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { fieldFocusListeners } from './fieldFocus'
import { ActivityIndicator, Animated, findNodeHandle, Keyboard, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native'
import { Glass } from './glass'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from './theme'
import { subscribeWork } from './core/work'

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

const overlayClosers: Array<() => void> = []

/** 안드로이드 뒤로: 열려 있는 입력 창이 있으면 화면 대신 그 창만 닫는다. */
export function closeTopOverlay() {
  const close = overlayClosers.at(-1)
  if (!close) return false
  close()
  return true
}

function useOverlayBack(onClose: () => void) {
  const ref = useRef(onClose)
  ref.current = onClose
  useEffect(() => {
    const fn = () => ref.current()
    overlayClosers.push(fn)
    return () => {
      const i = overlayClosers.lastIndexOf(fn)
      if (i >= 0) overlayClosers.splice(i, 1)
    }
  }, [])
}


/** 키보드에 가려진 입력칸을 스크롤 영역 안으로 올린다.
 *  칸에 들어갈 때 한 번만 맞춘다. 그 뒤 사용자가 스크롤하면 그대로 둔다 (키보드 높이가 조금 바뀌어도 다시 끌어오지 않는다). */
export function useScrollFocusedField(scrollRef: RefObject<ScrollView | null>) {
  useEffect(() => {
    let shown = false
    let revealed: number | null = null
    const reveal = () => {
      const input = TextInput.State.currentlyFocusedInput?.()
      const node = input ? findNodeHandle(input as never) : null
      if (!node || node === revealed) return
      const responder = scrollRef.current?.getScrollResponder?.() as { scrollResponderScrollNativeHandleToKeyboard?: (n: number, extra: number, prevent: boolean) => void } | undefined
      if (!responder?.scrollResponderScrollNativeHandleToKeyboard) return
      revealed = node
      responder.scrollResponderScrollNativeHandleToKeyboard(node, 96, true)
    }
    const show = Keyboard.addListener('keyboardDidShow', () => { if (!shown) { shown = true; reveal() } })
    const hide = Keyboard.addListener('keyboardDidHide', () => { shown = false; revealed = null })
    const focus = () => { if (shown) setTimeout(reveal, 50) }
    fieldFocusListeners.add(focus)
    return () => { show.remove(); hide.remove(); fieldFocusListeners.delete(focus) }
  }, [scrollRef])
}

/** 입력칸 밖(버튼·입력칸이 아닌 곳)을 누르면 키보드를 닫는다. 스크롤은 누름으로 치지 않는다 */
export const dismissOnTap = {
  onStartShouldSetResponder: () => { if (Keyboard.isVisible()) Keyboard.dismiss(); return false },
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

type Layer = { id: number; node: ReactNode }
type Host = { mount: (id: number, node: ReactNode) => void; unmount: (id: number) => void }
const HostContext = createContext<Host | null>(null)
let portalSeq = 1
let boundarySeq = 1
const boundaryStores = new Map<number, { layers: Layer[]; listeners: Set<() => void> }>()

function getBoundary(bid: number) {
  let s = boundaryStores.get(bid)
  if (!s) { s = { layers: [], listeners: new Set() }; boundaryStores.set(bid, s) }
  return s
}
function emitBoundary(bid: number) { getBoundary(bid).listeners.forEach((fn) => fn()) }

/**
 * Modal/Sheet 안쪽에 둔다. 자식 Sheet·Confirm이 새 Modal을 열지 않고 여기로 붙어서
 * 삼성 기기에서 Modal이 겹쳐 앱이 죽는 일을 막는다.
 */
export function OverlayBoundary({ children, style }: { children: ReactNode; style?: object }) {
  const bid = useRef(0)
  if (!bid.current) bid.current = boundarySeq++
  const host = useRef<Host>({
    mount: (id, node) => {
      const s = getBoundary(bid.current)
      const i = s.layers.findIndex((x) => x.id === id)
      if (i >= 0) s.layers[i] = { id, node }
      else s.layers = [...s.layers, { id, node }]
      emitBoundary(bid.current)
    },
    unmount: (id) => {
      const s = getBoundary(bid.current)
      s.layers = s.layers.filter((x) => x.id !== id)
      emitBoundary(bid.current)
    },
  }).current
  useEffect(() => () => { boundaryStores.delete(bid.current) }, [])
  return (
    <HostContext.Provider value={host}>
      <View style={[{ flex: 1 }, style]}>
        {children}
        <OverlayLayers bid={bid.current} />
      </View>
    </HostContext.Provider>
  )
}

function OverlayLayers({ bid }: { bid: number }) {
  const [, bump] = useState(0)
  useEffect(() => {
    const s = getBoundary(bid)
    const fn = () => bump((n) => n + 1)
    s.listeners.add(fn)
    return () => { s.listeners.delete(fn) }
  }, [bid])
  const layers = getBoundary(bid).layers
  return (
    <>
      {layers.map((l) => (
        <View key={l.id} style={StyleSheet.absoluteFill} pointerEvents="box-none">{l.node}</View>
      ))}
    </>
  )
}

/** 이미 Modal 안에 있으면 포털로, 아니면 새 Modal로 띄운다. */
function useOverlayPortal(node: ReactNode) {
  const host = useContext(HostContext)
  const id = useRef(0)
  if (!id.current) id.current = portalSeq++
  const nodeRef = useRef(node)
  nodeRef.current = node
  useLayoutEffect(() => {
    if (!host) return
    host.mount(id.current, nodeRef.current)
    return () => host.unmount(id.current)
  }, [host])
  // props가 바뀌면 같은 칸만 고친다 (부모 children은 다시 그리지 않음)
  useLayoutEffect(() => {
    if (!host) return
    host.mount(id.current, node)
  })
  if (host) return null
  return node
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
  const scrollRef = useRef<ScrollView>(null)
  const nested = !!useContext(HostContext)
  useScrollFocusedField(scrollRef)
  useOverlayBack(onClose)
  // left === null 이면 왼쪽 닫기를 숨긴다(웹 span 자리). HTML span은 안드로이드에서 호스트가 없어 앱이 죽는다.
  const head = (
    <View style={{ minHeight: 64, paddingTop: 8, paddingBottom: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <View style={{ flex: 1, alignItems: 'flex-start' }}>{left === undefined ? <SheetBtn label="닫기" onPress={onClose} /> : left}</View>
      <Text style={{ color: c.ink, fontSize: 17, fontWeight: '600', maxWidth: '46%', textAlign: 'center' }} numberOfLines={1}>{title}</Text>
      <View style={{ flex: 1, alignItems: 'flex-end' }}>{right}</View>
    </View>
  )
  const body = scroll ? (
    <ScrollView ref={scrollRef} keyboardShouldPersistTaps="handled" style={page ? { flex: 1 } : { flexGrow: 0 }}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: (keyboard ? 12 : insets.bottom) + 28 }}>
      {children}
    </ScrollView>
  ) : <View style={{ flex: 1 }}>{children}</View>

  const max = Math.round(height - Math.max(insets.top, 12) - 12 - keyboard)
  const inner = page ? (
    <OverlayBoundary>
      <View {...dismissOnTap} style={{ flex: 1, backgroundColor: c.paper, paddingTop: nested ? 0 : insets.top, paddingBottom: keyboard }}>
        {head}
        {body}
      </View>
    </OverlayBoundary>
  ) : (
    <OverlayBoundary>
      <View style={{ flex: 1, justifyContent: 'flex-end', paddingBottom: keyboard }}>
        <Pressable onPress={onClose} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.3)' }} />
        <View {...dismissOnTap} style={{ maxHeight: max, height: scroll ? undefined : max, backgroundColor: c.paper, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden',
          shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 40, elevation: 12 }}>
          <View style={{ width: 36, height: 5, borderRadius: 3, backgroundColor: c.faint, opacity: 0.6, alignSelf: 'center', marginTop: 6 }} />
          {head}
          {body}
        </View>
      </View>
    </OverlayBoundary>
  )
  return useOverlayPortal(
    nested ? inner : page ? (
      <Modal visible animationType="slide" onRequestClose={onClose} statusBarTranslucent>{inner}</Modal>
    ) : (
      <Modal transparent visible animationType="slide" onRequestClose={onClose} statusBarTranslucent>{inner}</Modal>
    ),
  )
}

/** 페이지 안 확인 창 (.alert) */
export function Confirm({ message, action = '삭제', safe, busy, onConfirm, onCancel }: {
  message: string; action?: string; safe?: boolean; onConfirm: () => void; onCancel: () => void
  /** 진행 중 알림: 버튼 없이 글만 */
  busy?: boolean
}) {
  const c = useTheme()
  const nested = !!useContext(HostContext)
  useOverlayBack(onCancel)
  const btn = (label: string, color: string, fn: () => void) => (
    <Pressable onPress={fn} style={({ pressed }) => ({ flex: 1, height: 48, borderRadius: 999, backgroundColor: c.fill, alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.96 : 1 }] })}>
      <Text style={{ color, fontSize: 17, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  )
  const inner = (
    <Pressable onPress={onCancel} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.25)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Pressable style={{ width: '100%', maxWidth: 320, borderRadius: 28, overflow: 'hidden', elevation: 16 }}>
        <Glass intensity={40} tint={c.dark ? 'dark' : 'light'} style={{ backgroundColor: c.glass, paddingTop: 22, paddingHorizontal: 18, paddingBottom: 16 }}>
          <Text style={{ color: c.ink, fontSize: 17, fontWeight: '600', textAlign: 'center', lineHeight: 23, marginBottom: 16 }}>{message}</Text>
          {busy ? null : (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {btn('취소', c.ink, onCancel)}
              {btn(action, safe ? c.safelight : c.danger, onConfirm)}
            </View>
          )}
        </Glass>
      </Pressable>
    </Pressable>
  )
  return useOverlayPortal(
    nested ? inner : (
      <Modal transparent visible animationType="fade" onRequestClose={onCancel} statusBarTranslucent>{inner}</Modal>
    ),
  )
}

/** 오른쪽 위 버튼에서 내려오는 메뉴 (.menu) */
export function Menu({ items, onClose }: { items: { label: string; danger?: boolean; onPress: () => void }[]; onClose: () => void }) {
  const c = useTheme()
  const insets = useSafeAreaInsets()
  const nested = !!useContext(HostContext)
  useOverlayBack(onClose)
  const scale = useRef(new Animated.Value(0.9)).current
  useEffect(() => { Animated.timing(scale, { toValue: 1, duration: 180, useNativeDriver: true }).start() }, [scale])
  const inner = (
    <Pressable onPress={onClose} style={{ flex: 1 }}>
      <Animated.View style={{ position: 'absolute', right: 16, top: insets.top + 10 + 52, minWidth: 200, borderRadius: 18, overflow: 'hidden', elevation: 14, transform: [{ scale }] }}>
        <Glass intensity={40} tint={c.dark ? 'dark' : 'light'} style={{ backgroundColor: c.glass }}>
          {items.map((it, i) => (
            <Pressable key={it.label} onPress={() => { onClose(); it.onPress() }}
              style={({ pressed }) => ({ minHeight: 46, paddingVertical: 10, paddingHorizontal: 16, justifyContent: 'center', backgroundColor: pressed ? c.fill : 'transparent',
                borderTopWidth: i ? 0.5 : 0, borderTopColor: c.sep })}>
              <Text style={{ fontSize: 17, color: it.danger ? c.danger : c.ink }}>{it.label}</Text>
            </Pressable>
          ))}
        </Glass>
      </Animated.View>
    </Pressable>
  )
  return useOverlayPortal(
    nested ? inner : (
      <Modal transparent visible animationType="fade" onRequestClose={onClose} statusBarTranslucent>{inner}</Modal>
    ),
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
        <Glass intensity={30} tint={c.dark ? 'dark' : 'light'} style={{ backgroundColor: c.glass, paddingHorizontal: 20, paddingVertical: 12 }}>
          <Text style={{ color: c.ink, fontSize: 15, fontWeight: '600', textAlign: 'center' }}>{msg}</Text>
        </Glass>
      </View>
    </Animated.View>
  ) : null
  return [node, show] as const
}

/** 바로 끝나지 않는 일. 일은 이미 시작됐고, 이 줄은 그동안만 보인다. */
export function WorkBanner() {
  const c = useTheme()
  const insets = useSafeAreaInsets()
  const [on, setOn] = useState(false)
  useEffect(() => subscribeWork(setOn), [])
  if (!on) return null
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 16, right: 16, bottom: insets.bottom + 96, alignItems: 'center', zIndex: 40 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 999, overflow: 'hidden', borderWidth: 0.5, borderColor: c.glassLine, backgroundColor: c.glass, paddingHorizontal: 18, paddingVertical: 12 }}>
        <ActivityIndicator color={c.ink} />
        <Text style={{ color: c.ink, fontSize: 15, fontWeight: '600' }}>불러오는 중…</Text>
      </View>
    </View>
  )
}
