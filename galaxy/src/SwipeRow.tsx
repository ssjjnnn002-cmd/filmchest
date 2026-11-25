// 목록 줄 밀기 (웹 ui/SwipeRow.tsx · 아이폰 목록과 같음): 밀면 동그란 버튼이 나오고 그대로 멈춘다. 끝까지 밀면 바로 실행.
// 가로로 더 많이 움직였을 때만 민다 (세로 스크롤은 그대로)
import { useRef, useState, type ReactNode } from 'react'
import { Animated, PanResponder, Pressable, View } from 'react-native'
import { Text } from './text'
import { Icon } from './icons'
import { iosCurve, tick } from './overlay'
import { useTheme } from './theme'

const OPEN = 78
let closeOpened: (() => void) | undefined

export function SwipeRow({ children, favorite, onFavorite, onDelete }: {
  children: ReactNode
  favorite?: boolean
  onFavorite?: () => void
  onDelete?: () => void
}) {
  const c = useTheme()
  const x = useRef(new Animated.Value(0)).current
  const [side, setSide] = useState<'fav' | 'del' | null>(null)
  const [rested, setRested] = useState(false)
  const base = useRef(0)
  const width = useRef(340)
  const far = useRef(false)
  const cbs = useRef({ onFavorite, onDelete })
  cbs.current = { onFavorite, onDelete }
  const rest = useRef((v: number) => {
    base.current = v
    setRested(!!v)
    const me = () => rest.current(0)
    if (v) { if (closeOpened) closeOpened(); closeOpened = me }
    Animated.timing(x, { toValue: v, duration: 380, easing: iosCurve, useNativeDriver: true }).start(() => { if (!base.current) setSide(null) })
  })
  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5 && (g.dx > 0 ? !!cbs.current.onFavorite || base.current < 0 : !!cbs.current.onDelete || base.current > 0),
    onPanResponderTerminationRequest: () => false,
    onPanResponderMove: (_, g) => {
      let v = base.current + g.dx
      if ((v > 0 && !cbs.current.onFavorite) || (v < 0 && !cbs.current.onDelete)) v *= 0.12
      const now = Math.abs(v) > width.current * 0.55
      if (now !== far.current) { far.current = now; if (now) tick() }
      setSide(v > 0 ? 'fav' : v < 0 ? 'del' : null)
      x.setValue(v)
    },
    onPanResponderRelease: (_, g) => {
      const v = base.current + g.dx
      if (far.current) {
        far.current = false
        rest.current(0)
        if (v > 0) cbs.current.onFavorite?.(); else cbs.current.onDelete?.()
        return
      }
      rest.current(v > OPEN * 0.5 && cbs.current.onFavorite ? OPEN : v < -OPEN * 0.5 && cbs.current.onDelete ? -OPEN : 0)
    },
    onPanResponderTerminate: () => rest.current(0),
  })).current
  const act = (fn?: () => void) => { rest.current(0); fn?.() }
  const btn = (name: 'fav' | 'del') => (
    <View style={{ position: 'absolute', top: 0, bottom: 0, left: name === 'fav' ? 0 : undefined, right: name === 'del' ? 0 : undefined, width: OPEN, alignItems: 'center', justifyContent: 'center' }}>
      <Pressable onPress={() => act(name === 'fav' ? onFavorite : onDelete)} style={{ alignItems: 'center', gap: 4 }}>
        <Animated.View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: name === 'fav' ? '#f5b700' : c.danger, alignItems: 'center', justifyContent: 'center',
          transform: [{ scale: x.interpolate({ inputRange: name === 'fav' ? [0, OPEN] : [-OPEN, 0], outputRange: name === 'fav' ? [0.4, 1] : [1, 0.4], extrapolate: 'clamp' }) }] }}>
          <Icon name={name === 'fav' ? 'star' : 'trash'} size={22} color="#fff" />
        </Animated.View>
        <Text numberOfLines={1} style={{ color: c.muted, fontSize: 12 }}>{name === 'fav' ? (favorite ? '해제' : '즐겨찾기') : '삭제'}</Text>
      </Pressable>
    </View>
  )
  return (
    <View style={{ overflow: 'hidden' }} onLayout={(e) => { width.current = e.nativeEvent.layout.width }}>
      {side ? btn(side) : null}
      <Animated.View {...pan.panHandlers} style={{ backgroundColor: c.cell, borderRadius: side ? 22 : 0, transform: [{ translateX: x }] }}>
        {children}
        {/* 열려 있을 때는 눌러서 닫기만 */}
        {rested ? <Pressable onPress={() => rest.current(0)} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} /> : null}
      </Animated.View>
    </View>
  )
}
