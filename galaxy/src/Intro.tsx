import { useEffect, useRef } from 'react'
import { AccessibilityInfo, Animated, Easing, Pressable, View } from 'react-native'
import Svg, { G, Path, Rect } from 'react-native-svg'

const ORANGE = '#F0701E'
const AnimatedRect = Animated.createAnimatedComponent(Rect)
const AnimatedPath = Animated.createAnimatedComponent(Path)
// 선 길이 (아이콘 좌표 기준, 조금 넉넉히): 통 · 뚜껑 · 필름
const LEN = { can: 1120, cap: 195, leader: 600 }
const HOLES = [[563, 463], [613, 463], [663, 463], [563, 577]]

/** 웹·아이폰과 같은 인트로. 앱 아이콘의 필름통이 선으로 그려지고 필름이 나온 뒤 앱으로 넘어간다. */
export function Intro({ onDone }: { onDone: () => void }) {
  const can = useRef(new Animated.Value(0)).current
  const cap = useRef(new Animated.Value(0)).current
  const leader = useRef(new Animated.Value(0)).current
  const holes = useRef(HOLES.map(() => new Animated.Value(0))).current
  const fade = useRef(new Animated.Value(1)).current
  const done = useRef(onDone)
  const finishRef = useRef<() => void>(() => {})
  done.current = onDone
  useEffect(() => {
    let hold: ReturnType<typeof setTimeout> | undefined
    let ended = false
    const finish = () => {
      if (ended) return
      ended = true
      if (hold) clearTimeout(hold)
      Animated.timing(fade, { toValue: 0, duration: 400, easing: Easing.in(Easing.ease), useNativeDriver: true }).start(() => done.current())
    }
    finishRef.current = finish
    const draw = (v: Animated.Value, duration: number, delay: number, easing = Easing.bezier(0.65, 0, 0.35, 1)) =>
      Animated.timing(v, { toValue: 1, duration, delay, easing, useNativeDriver: false })
    const start = (reduce: boolean) => {
      if (ended) return
      if (reduce) {
        for (const v of [can, cap, leader, ...holes]) v.setValue(1)
        hold = setTimeout(finish, 700)
        return
      }
      Animated.parallel([
        draw(can, 750, 100),
        draw(cap, 400, 550),
        draw(leader, 600, 750, Easing.bezier(0.45, 0.05, 0.2, 1)),
        ...holes.map((v, i) => Animated.timing(v, { toValue: 1, duration: 280, delay: 1050 + i * 90, easing: Easing.out(Easing.back(2)), useNativeDriver: false })),
      ]).start()
      hold = setTimeout(finish, 2200)
    }
    AccessibilityInfo.isReduceMotionEnabled().then(start).catch(() => start(false))
    return () => { ended = true; finishRef.current = () => {}; if (hold) clearTimeout(hold) }
  }, [can, cap, leader, holes, fade])

  const dash = (v: Animated.Value, len: number) => ({
    strokeDasharray: [len, len],
    strokeDashoffset: v.interpolate({ inputRange: [0, 1], outputRange: [len, 0] }),
  })
  return (
    <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: fade, backgroundColor: '#141414' }}>
      <Pressable onPress={() => finishRef.current()} accessibilityLabel="필름함" style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ alignItems: 'center' }}>
          {/* 아이콘(docs/icon/filmchest-icon.svg)과 같은 선 */}
          <Svg width={168} height={163} viewBox="262 262 500 484">
            <G fill="none" stroke={ORANGE} strokeWidth={33} strokeLinejoin="round" strokeLinecap="round">
              <AnimatedRect x={292} y={356} width={232} height={360} rx={40} {...dash(can, LEN.can)} />
              <AnimatedPath d="M364 356V316Q364 292 388 292H428Q452 292 452 316V356" {...dash(cap, LEN.cap)} />
              <AnimatedPath d="M524 420H708Q732 420 732 444V548Q732 572 708 572H676Q652 572 652 596V628Q652 652 628 652H524" {...dash(leader, LEN.leader)} />
            </G>
            {HOLES.map(([x, y], i) => (
              <AnimatedRect key={i} fill={ORANGE} rx={7} opacity={holes[i]}
                x={holes[i].interpolate({ inputRange: [0, 1], outputRange: [x + 10, x] })}
                y={holes[i].interpolate({ inputRange: [0, 1], outputRange: [y + 10, y] })}
                width={holes[i].interpolate({ inputRange: [0, 1], outputRange: [10, 30] })}
                height={holes[i].interpolate({ inputRange: [0, 1], outputRange: [10, 30] })} />
            ))}
          </Svg>
        </View>
      </Pressable>
    </Animated.View>
  )
}
