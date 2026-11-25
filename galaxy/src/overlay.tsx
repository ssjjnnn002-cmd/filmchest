// 웹 common.tsx의 Sheet·Confirm·useToast, .menu 를 갤럭시로 옮긴 것
import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { fieldFocusListeners } from './fieldFocus'
import { ActivityIndicator, Animated, Easing, findNodeHandle, Keyboard, Modal, PanResponder, Pressable, Vibration, ScrollView, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native'
import { Text } from './text'
import { Icon } from './icons'
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
      boxShadow: c.shadowGlass,
      opacity: disabled ? 0.4 : 1, transform: [{ scale: pressed && !disabled ? 0.96 : 1 }],
    })}>
      <Text style={{ color: c.safelight, fontSize: 17, fontWeight: accent ? '600' : '500' }}>{label}</Text>
    </Pressable>
  )
}

/** 아이폰 화면·창이 움직이는 곡선 */
export const iosCurve = Easing.bezier(0.32, 0.72, 0, 1)
export const PUSH_MS = 500
const LEAVE_MS = 420
/** 마지막으로 누른 자리: 확인 말풍선을 그 옆에 띄운다 */
export const lastTap = { x: 0, y: 0 }
export const trackTap = {
  onStartShouldSetResponderCapture: (e: { nativeEvent: { pageX: number; pageY: number } }) => { lastTap.x = e.nativeEvent.pageX; lastTap.y = e.nativeEvent.pageY; return false },
}
export const tick = (ms = 10) => { try { Vibration.vibrate(ms) } catch { /* 진동 없음 */ } }
/** 창이 닫히는 중인지 (닫힌 뒤에도 잠깐 남아 내려가는 모습을 보인다) */
const Leaving = createContext(false)

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

type Layer = { id: number; node: ReactNode; leaving?: boolean }
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
    // 바로 없애지 않고 닫히는 모습까지 보인 다음 뺀다
    unmount: (id) => {
      const s = getBoundary(bid.current)
      s.layers = s.layers.map((x) => x.id === id ? { ...x, leaving: true } : x)
      emitBoundary(bid.current)
      setTimeout(() => {
        const cur = getBoundary(bid.current)
        if (!cur.layers.some((x) => x.id === id && x.leaving)) return
        cur.layers = cur.layers.filter((x) => x.id !== id)
        emitBoundary(bid.current)
      }, LEAVE_MS)
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
        <View key={l.id} style={StyleSheet.absoluteFill} pointerEvents={l.leaving ? 'none' : 'box-none'}><Leaving.Provider value={!!l.leaving}>{l.node}</Leaving.Provider></View>
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

/** 화면을 꽉 채우는 창: 안에서 여는 창·확인이 이 위에 뜬다 */
export function FullModal({ children, ...rest }: { children: ReactNode; visible?: boolean; transparent?: boolean; animationType?: 'none' | 'slide' | 'fade'; onRequestClose?: () => void; statusBarTranslucent?: boolean }) {
  return <Modal {...rest}><OverlayBoundary>{children}</OverlayBoundary></Modal>
}

/** 아이폰에서 작은 제목(가운데)으로 뜨는 창들. 나머지는 왼쪽 큰 제목 (웹 common.tsx와 같음) */
const inlineTitles = /^(스캔 불러오기|스캔 가져오기|통계와 기록|백업|클라우드 백업|개인정보|필름함 시작하기|구글로 로그인|밀착|프레임|컷 기록|필터|필름 · 컷|촬영 시간|카메라 ISO|렌즈$|장소$|개발자 모드|사진 \d|기존 롤|주소가|기록 옮기기|예전)/
/** 아이폰에서 창 안에서 옆으로 넘어가는 화면 (뒤로 버튼) */
const pushTitles = /^(통계와 기록|백업 및 복구|클라우드 백업|개인정보 처리방침|노출계 시험|장비에 쓴 돈)$/
/** 아이폰에서 화면 절반만 올라오는 창들 */
const halfTitles = /^(밀착 인화지로 만들기|프레임 만들기|필름 유통기한|필터|카메라 ISO|렌즈$|촬영 시간|롤 제목|개발자 모드)/

/** 아래에서 올라오는 창. page면 화면을 꽉 채운다. */
export function Sheet({ title, onClose, left, right, children, page, push: pushProp, scroll = true }: {
  title: string; onClose: () => void; left?: ReactNode; right?: ReactNode; children: ReactNode; page?: boolean; /** 옆에서 밀려 들어오는 화면 */ push?: boolean
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
  const leaving = useContext(Leaving)
  const push = !!pushProp || pushTitles.test(title)
  const big = (!inlineTitles.test(title) || !!pushProp) && !halfTitles.test(title)
  const half = !page && scroll && halfTitles.test(title)
  const [tall, setTall] = useState(false)
  const [small, setSmall] = useState(!big)
  useEffect(() => setSmall(!big), [big])
  const full = Math.round(height - Math.max(insets.top, 10))
  const sheetH = half && !tall ? Math.min(Math.round(height * 0.52), 480) : full
  // 올라오기·내려가기. 손잡이를 끌면 손가락을 따라간다
  const y = useRef(new Animated.Value(height)).current
  useEffect(() => { Animated.timing(y, { toValue: 0, duration: PUSH_MS, easing: iosCurve, useNativeDriver: true }).start() }, [y])
  useEffect(() => { if (leaving) Animated.timing(y, { toValue: height, duration: LEAVE_MS - 20, easing: iosCurve, useNativeDriver: true }).start() }, [leaving, y, height])
  const dim = y.interpolate({ inputRange: [0, height], outputRange: [1, 0], extrapolate: 'clamp' })
  // 옆으로 넘어온 화면은 왼쪽에서 밀어 되돌린다
  const { width } = useWindowDimensions()
  const side = y.interpolate({ inputRange: [0, height], outputRange: [0, width], extrapolateLeft: 'clamp' })
  const move = push ? [{ translateX: side }] : [{ translateY: y }]
  const size = useRef({ width, height })
  size.current = { width, height }
  const edge = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => g.x0 < 70 && g.dx > 12 && g.dx > Math.abs(g.dy) * 1.5,
    onPanResponderMove: (_, g) => y.setValue(Math.max(0, g.dx / size.current.width) * size.current.height),
    onPanResponderRelease: (_, g) => {
      if (g.dx > size.current.width * 0.5 || g.vx > 0.4) { closeRef.current(); return }
      Animated.timing(y, { toValue: 0, duration: 260, easing: iosCurve, useNativeDriver: true }).start()
    },
    onPanResponderTerminate: () => { Animated.timing(y, { toValue: 0, duration: 260, easing: iosCurve, useNativeDriver: true }).start() },
  })).current
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  const mode = useRef({ half, tall, sheetH })
  mode.current = { half, tall, sheetH }
  const drag = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 6 && Math.abs(g.dy) > Math.abs(g.dx),
    onPanResponderMove: (_, g) => y.setValue(g.dy > 0 ? g.dy : g.dy / 6),
    onPanResponderRelease: (_, g) => {
      const m = mode.current
      const back = () => Animated.timing(y, { toValue: 0, duration: 320, easing: iosCurve, useNativeDriver: true }).start()
      if (m.half && !m.tall && g.dy < -40) { setTall(true); tick(); back(); return }
      if (m.half && m.tall && g.dy > 60 && g.dy < m.sheetH * 0.5 && g.vy < 0.5) { setTall(false); back(); return }
      if (g.dy > m.sheetH * 0.4 || (g.vy > 0.5 && g.dy > 30)) { closeRef.current(); setTimeout(back, 60); return }
      back()
    },
    onPanResponderTerminate: () => { Animated.timing(y, { toValue: 0, duration: 320, easing: iosCurve, useNativeDriver: true }).start() },
  })).current
  // left === null 이면 왼쪽 닫기를 숨긴다(웹 span 자리). HTML span은 안드로이드에서 호스트가 없어 앱이 죽는다.
  const head = (
    <View {...(page || push ? {} : drag.panHandlers)} style={{ minHeight: 64, paddingTop: page ? 8 : half && !tall ? 4 : 16, paddingBottom: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <View style={{ flex: 1, alignItems: 'flex-start' }}>{push ? (
        <Pressable accessibilityLabel="뒤로" onPress={onClose} style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: c.glass, borderWidth: 0.5, borderColor: c.glassLine, boxShadow: c.shadowGlass, transform: [{ scale: pressed ? 0.94 : 1 }] })}><Icon name="back" size={22} color={c.ink} /></Pressable>
      ) : left === undefined ? <SheetBtn label={right ? '취소' : '닫기'} accent={false} onPress={onClose} /> : left}</View>
      <Text style={{ color: c.ink, fontSize: 17, fontWeight: '600', maxWidth: '46%', textAlign: 'center', opacity: small ? 1 : 0 }} numberOfLines={1}>{title}</Text>
      <View style={{ flex: 1, alignItems: 'flex-end' }}>{push && !pushProp ? null : right}</View>
    </View>
  )
  const body = scroll ? (
    <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ flex: 1 }} scrollEventThrottle={16}
      onScroll={big ? (e) => setSmall(e.nativeEvent.contentOffset.y > 42) : undefined}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: (keyboard ? 12 : insets.bottom) + 28 }}>
      {big ? <Text style={{ fontSize: 34, fontWeight: '700', letterSpacing: -0.7, color: c.ink, paddingTop: 2, paddingHorizontal: 2, paddingBottom: 8 }}>{title}</Text> : null}
      {children}
    </ScrollView>
  ) : <View style={{ flex: 1 }}>{children}</View>

  const inner = page ? (
    <OverlayBoundary>
      <Animated.View {...dismissOnTap} {...(push ? edge.panHandlers : {})} style={{ flex: 1, backgroundColor: c.paper, paddingTop: insets.top, paddingBottom: keyboard, boxShadow: push ? '-10px 0px 30px rgba(0,0,0,0.1)' : undefined, transform: move }}>
        {head}
        {body}
      </Animated.View>
    </OverlayBoundary>
  ) : (
    <OverlayBoundary>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Animated.View style={{ ...StyleSheet.absoluteFill, backgroundColor: push ? 'transparent' : 'rgba(0,0,0,0.2)', opacity: dim }}>
          <Pressable onPress={onClose} style={{ flex: 1 }} />
        </Animated.View>
        <Animated.View {...dismissOnTap} {...(push ? edge.panHandlers : {})} style={{ height: sheetH, paddingBottom: keyboard, backgroundColor: c.paper, overflow: 'hidden',
          borderTopLeftRadius: 34, borderTopRightRadius: 34,
          ...(half && !tall ? { borderRadius: 34, marginHorizontal: 8, marginBottom: 8 + insets.bottom / 2 } : {}),
          transform: move }}>
          {half && !tall ? <View style={{ width: 36, height: 5, borderRadius: 3, backgroundColor: c.faint, opacity: 0.6, alignSelf: 'center', marginTop: 6 }} /> : null}
          {head}
          {body}
        </Animated.View>
      </View>
    </OverlayBoundary>
  )
  return useOverlayPortal(nested ? inner : (
    <Modal transparent visible animationType="none" onRequestClose={onClose} statusBarTranslucent>{inner}</Modal>
  ))
}

/** 페이지 안 확인 창 (.alert) */
export function Confirm({ message, action = '삭제', safe, busy, onConfirm, onCancel, extra }: {
  message: string; action?: string; safe?: boolean; onConfirm: () => void; onCancel: () => void
  /** 아래 줄 버튼 하나 더 (예: 갤러리 사진까지 삭제) */
  extra?: { label: string; safe?: boolean; onPress: () => void }
  /** 진행 중 알림: 버튼 없이 글만 */
  busy?: boolean
}) {
  const c = useTheme()
  const nested = !!useContext(HostContext)
  useOverlayBack(onCancel)
  const leaving = useContext(Leaving)
  const insets = useSafeAreaInsets()
  const { width: sw, height: sh } = useWindowDimensions()
  const tap = useRef({ ...lastTap }).current
  const [box, setBox] = useState<{ w: number; h: number }>()
  const pop = useRef(new Animated.Value(0)).current
  useEffect(() => { if (box) Animated.spring(pop, { toValue: 1, stiffness: 320, damping: 22, mass: 0.8, useNativeDriver: true }).start() }, [box, pop])
  useEffect(() => { if (leaving) Animated.timing(pop, { toValue: 0, duration: 160, useNativeDriver: true }).start() }, [leaving, pop])
  // 누른 자리 옆의 말풍선 (아이폰과 같음). 밖을 누르면 취소
  const wide = extra ? Math.min(350, sw - 32) : 260
  const w = box?.w ?? wide, h = box?.h ?? 160
  const leftAt = Math.min(Math.max(16, tap.x - w / 2), sw - w - 16)
  const above = tap.y - h - 28 > insets.top + 8
  const topAt = above ? tap.y - h - 28 : Math.min(tap.y + 28, sh - h - insets.bottom - 16)
  const btn = (label: string, color: string, fn: () => void) => (
    <Pressable key={label} onPress={fn} style={({ pressed }) => ({ minHeight: 48, paddingHorizontal: 12, borderRadius: 999, backgroundColor: c.fill, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}>
      <Text numberOfLines={1} adjustsFontSizeToFit style={{ color, fontSize: 17, fontWeight: '500' }}>{label}</Text>
    </Pressable>
  )
  const inner = (
    <Pressable onPress={busy ? undefined : onCancel} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.06)' }}>
      <Animated.View onLayout={(e) => { if (!box) setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height }) }}
        style={{ position: 'absolute', left: leftAt, top: topAt, width: wide, opacity: box ? pop : 0,
          transformOrigin: `${tap.x - leftAt}px ${above ? h : 0}px`, transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }] }}>
        <Pressable style={{ borderRadius: 32, overflow: 'hidden', boxShadow: '0px 10px 50px rgba(0,0,0,0.18)' }}>
          <Glass intensity={40} tint={c.dark ? 'dark' : 'light'} style={{ backgroundColor: c.glass, paddingTop: 20, paddingHorizontal: 16, paddingBottom: 16 }}>
            <Text style={{ color: c.ink, fontSize: 17, lineHeight: 22, paddingHorizontal: 14, marginBottom: busy ? 0 : 16 }}>{message}</Text>
            {busy ? null : <View style={{ gap: 8 }}>{[btn(action, safe ? c.safelight : c.danger, onConfirm), extra ? btn(extra.label, extra.safe ? c.safelight : c.danger, extra.onPress) : null]}</View>}
          </Glass>
        </Pressable>
      </Animated.View>
    </Pressable>
  )
  return useOverlayPortal(
    nested ? inner : (
      <Modal transparent visible animationType="none" onRequestClose={onCancel} statusBarTranslucent>{inner}</Modal>
    ),
  )
}

/** 오른쪽 위 버튼에서 내려오는 메뉴 (.menu) */
export interface MenuAnchor { x: number; y: number; w: number; h: number }
/** 누른 것의 화면 위치 (Menu를 그 바로 아래에 띄울 때) */
export function measureAnchor(ref: RefObject<View | null>): Promise<MenuAnchor | undefined> {
  return new Promise((done) => {
    if (!ref.current) return done(undefined)
    ref.current.measureInWindow((x, y, w, h) => done({ x, y, w, h }))
  })
}

export function Menu({ items, onClose, anchor }: {
  /** section: 이 줄부터 새 칸 (칸 사이는 굵은 선, 아이폰 메뉴처럼) */
  items: { label: string; danger?: boolean; icon?: string; checked?: boolean; section?: boolean; onPress: () => void }[]; onClose: () => void
  /** 있으면 그 바로 아래, 없으면 오른쪽 위 */
  anchor?: MenuAnchor
}) {
  const marks = items.some((it) => it.checked !== undefined)
  const { width: screenW } = useWindowDimensions()
  const c = useTheme()
  const insets = useSafeAreaInsets()
  const nested = !!useContext(HostContext)
  useOverlayBack(onClose)
  const leaving = useContext(Leaving)
  const scale = useRef(new Animated.Value(0.4)).current
  useEffect(() => { Animated.spring(scale, { toValue: 1, stiffness: 330, damping: 24, mass: 0.8, useNativeDriver: true }).start() }, [scale])
  useEffect(() => { if (leaving) Animated.timing(scale, { toValue: 0.4, duration: 160, useNativeDriver: true }).start() }, [leaving, scale])
  const origin = anchor ? (anchor.x + anchor.w / 2 < screenW / 2 ? 'top left' : 'top right') : 'top right'
  const inner = (
    <Pressable onPress={onClose} style={{ flex: 1 }}>
      <Animated.View style={{ position: 'absolute', ...(anchor
        ? (anchor.x + anchor.w / 2 < screenW / 2 ? { left: Math.max(8, anchor.x) } : { right: Math.max(8, screenW - anchor.x - anchor.w) })
        : { right: 16 }), top: anchor ? anchor.y + anchor.h + 6 : insets.top + 10 + 52, minWidth: 220, borderRadius: 26, overflow: 'hidden', boxShadow: '0px 12px 40px rgba(0,0,0,0.2)', transformOrigin: origin, opacity: scale.interpolate({ inputRange: [0.4, 0.8], outputRange: [0, 1], extrapolate: 'clamp' }), transform: [{ scale }] }}>
        <Glass intensity={40} tint={c.dark ? 'dark' : 'light'} style={{ backgroundColor: c.glass, paddingVertical: 8 }}>
          {items.map((it, i) => [
            // 칸 사이는 얇은 선 (아이폰 메뉴와 같음)
            it.section ? <View key={`sep-${i}`} style={{ height: 1, marginHorizontal: 16, marginVertical: 6, backgroundColor: c.sep }} /> : null,
            <Pressable key={`${i}-${it.label}`} onPress={() => { onClose(); it.onPress() }}
              style={({ pressed }) => ({ minHeight: 46, paddingVertical: 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: pressed ? c.fill : 'transparent',
                paddingLeft: 22 })}>
              {/* 고르는 메뉴(보기 방식 등): 왼쪽 체크 · 아이콘 · 이름 (아이폰 메뉴와 같은 모양) */}
              {marks ? <View style={{ width: 18 }}>{it.checked ? <Icon name="check" size={18} color={c.ink} /> : null}</View> : null}
              {it.icon ? <Icon name={it.icon} size={20} color={c.safelight} /> : null}
              <Text style={{ fontSize: 17, color: it.danger ? c.danger : c.ink }}>{it.label}</Text>
            </Pressable>,
          ])}
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
      <View style={{ borderRadius: 999, overflow: 'hidden', borderWidth: 0.5, borderColor: c.glassLine, boxShadow: c.shadowGlass }}>
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

export const useLeaving = () => useContext(Leaving)
/** 화면 맨 위층에 띄우는 것 (길게 누르기 메뉴). 뒤로 가기로 닫힌다 */
export function Floating({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  const nested = !!useContext(HostContext)
  useOverlayBack(onClose)
  return useOverlayPortal(nested ? children : <Modal transparent visible animationType="none" onRequestClose={onClose} statusBarTranslucent>{children}</Modal>)
}
