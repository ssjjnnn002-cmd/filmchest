// 목록 줄 밀기 (웹 ui/SwipeRow.tsx · 아이폰 목록과 같음): 왼쪽→오른쪽 밀면 즐겨찾기, 오른쪽→왼쪽 밀면 삭제.
// 가로로 더 많이 움직였을 때만 민다 (세로 스크롤은 그대로)
import { useRef, useState, type ReactNode } from 'react'
import { Animated, PanResponder, View } from 'react-native'
import { Text } from './text'
import { Icon } from './icons'
import { useTheme } from './theme'

const TRIGGER = 72

export function SwipeRow({ children, favorite, onFavorite, onDelete }: {
  children: ReactNode
  favorite?: boolean
  onFavorite?: () => void
  onDelete?: () => void
}) {
  const c = useTheme()
  const x = useRef(new Animated.Value(0)).current
  const [side, setSide] = useState<'fav' | 'del' | null>(null)
  const last = useRef(0)
  const cbs = useRef({ onFavorite, onDelete })
  cbs.current = { onFavorite, onDelete }
  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
    onPanResponderMove: (_, g) => {
      const v = g.dx > 0 ? (cbs.current.onFavorite ? Math.min(g.dx, 140) : 0) : (cbs.current.onDelete ? Math.max(g.dx, -140) : 0)
      last.current = v
      setSide(v > 0 ? 'fav' : v < 0 ? 'del' : null)
      x.setValue(v)
    },
    onPanResponderRelease: () => {
      const v = last.current
      if (v > TRIGGER) cbs.current.onFavorite?.()
      else if (v < -TRIGGER) cbs.current.onDelete?.()
      last.current = 0
      Animated.timing(x, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => setSide(null))
    },
    onPanResponderTerminate: () => { last.current = 0; Animated.timing(x, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => setSide(null)) },
  })).current

  return (
    <View style={{ overflow: 'hidden' }}>
      {side ? (
        <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center',
          justifyContent: side === 'fav' ? 'flex-start' : 'flex-end', paddingHorizontal: 18, backgroundColor: side === 'fav' ? '#f5b700' : '#ff3b30' }}>
          <View style={{ alignItems: 'center', gap: 2 }}>
            <Icon name={side === 'fav' ? 'star' : 'trash'} size={20} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>{side === 'fav' ? (favorite ? '해제' : '즐겨찾기') : '삭제'}</Text>
          </View>
        </View>
      ) : null}
      <Animated.View {...pan.panHandlers} style={{ backgroundColor: c.cell, transform: [{ translateX: x }] }}>{children}</Animated.View>
    </View>
  )
}
