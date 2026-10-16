import { useEffect, useRef } from 'react'
import { AccessibilityInfo, Animated, Easing, Pressable, Text, View } from 'react-native'
import Svg, { Defs, G, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg'
import { useTheme } from './theme'

/** 웹·아이폰과 같은 인트로. 통에서 필름이 나오고 제목만 남긴 뒤 앱으로 넘어간다. */
export function Intro({ onDone }: { onDone: () => void }) {
  const c = useTheme()
  const rise = useRef(new Animated.Value(0)).current
  const pull = useRef(new Animated.Value(0)).current
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
    const start = (reduce: boolean) => {
      if (ended) return
      if (reduce) {
        rise.setValue(1)
        pull.setValue(1)
        hold = setTimeout(finish, 700)
        return
      }
      Animated.timing(rise, { toValue: 1, duration: 900, easing: Easing.bezier(0.2, 0.8, 0.2, 1), useNativeDriver: true }).start()
      Animated.timing(pull, { toValue: 1, duration: 1700, delay: 450, easing: Easing.bezier(0.45, 0.05, 0.2, 1), useNativeDriver: false }).start()
      hold = setTimeout(finish, 2200)
    }
    AccessibilityInfo.isReduceMotionEnabled().then(start).catch(() => start(false))
    return () => { ended = true; finishRef.current = () => {}; if (hold) clearTimeout(hold) }
  }, [fade, pull, rise])
  const ink = c.dark ? '#F2EEE8' : '#1A1816'
  return (
    <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: fade, backgroundColor: c.dark ? '#0C0B0A' : '#F2EFE8' }}>
      <Pressable onPress={() => finishRef.current()} accessibilityLabel="필름함" style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        {c.dark ? <View pointerEvents="none" style={{ position: 'absolute', top: -80, width: 420, height: 420, borderRadius: 210, backgroundColor: 'rgba(222,84,46,0.22)' }} /> : null}
        <Animated.View style={{
          alignItems: 'center', gap: 30, transform: [{
            translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [-10, -24] }),
          }, {
            scale: rise.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }),
          }], opacity: rise,
        }}>
          <View style={{ width: 300, height: 180 }}>
            <Animated.View style={{
              position: 'absolute', left: 190, top: 53, height: 79, overflow: 'hidden',
              width: pull.interpolate({ inputRange: [0, 1], outputRange: [0, 104] }),
            }}>
              <Leader />
            </Animated.View>
            <View style={{ position: 'absolute', left: 95, top: 0, width: 110, height: 180, shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 9, shadowOffset: { width: 0, height: 10 }, elevation: 8 }}>
              <Canister />
            </View>
          </View>
          <Text style={{ fontSize: 38, fontWeight: '800', letterSpacing: -0.6, color: ink, textShadowColor: c.dark ? 'rgba(222,84,46,0.25)' : 'transparent', textShadowRadius: c.dark ? 16 : 0 }}>필름함</Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  )
}

function Canister() {
  return (
    <Svg width={110} height={180} viewBox="0 0 92 150">
      <Defs>
        <LinearGradient id="metal" x1="0" x2="1" y1="0" y2="0">
          <Stop offset="0" stopColor="#1c1c1c" />
          <Stop offset="0.35" stopColor="#5a5a5a" />
          <Stop offset="0.6" stopColor="#2a2a2a" />
          <Stop offset="1" stopColor="#111" />
        </LinearGradient>
        <LinearGradient id="label" x1="0" x2="1" y1="0" y2="0">
          <Stop offset="0" stopColor="#d9d6cf" />
          <Stop offset="0.4" stopColor="#fbfaf7" />
          <Stop offset="1" stopColor="#cfcbc3" />
        </LinearGradient>
        <LinearGradient id="band" x1="0" x2="1" y1="0" y2="0">
          <Stop offset="0" stopColor="#b8401f" />
          <Stop offset="0.4" stopColor="#e45a33" />
          <Stop offset="1" stopColor="#a93a1c" />
        </LinearGradient>
      </Defs>
      <Rect x="30" y="0" width="32" height="10" rx="3" fill="url(#metal)" />
      <Rect x="4" y="8" width="84" height="14" rx="5" fill="url(#metal)" />
      <Rect x="6" y="20" width="80" height="108" fill="url(#label)" />
      <SvgText x="46" y="42" textAnchor="middle" fontSize="10" fontWeight="800" fill="#2a2522" letterSpacing="1.2">FILMCHEST</SvgText>
      <SvgText x="46" y="61" textAnchor="middle" fontSize="15" fontWeight="800" fill="#2a2522">필름함</SvgText>
      <Rect x="6" y="68" width="80" height="24" fill="url(#band)" />
      <SvgText x="46" y="86" textAnchor="middle" fontSize="17" fontWeight="900" fill="#fff">36</SvgText>
      <SvgText x="46" y="106" textAnchor="middle" fontSize="6.5" fill="#6b625b" letterSpacing="0.8">C-41 · 135-36</SvgText>
      <G fill="#2a2522">
        <Rect x="14" y="112" width="8" height="4" />
        <Rect x="26" y="114" width="5" height="4" />
        <Rect x="36" y="112" width="9" height="4" />
        <Rect x="50" y="114" width="6" height="4" />
        <Rect x="60" y="112" width="4" height="4" />
        <Rect x="68" y="114" width="8" height="4" />
      </G>
      <Rect x="4" y="126" width="84" height="14" rx="5" fill="url(#metal)" />
    </Svg>
  )
}

function Leader() {
  return (
    <Svg width={156} height={79} viewBox="0 0 130 66">
      <Defs>
        <LinearGradient id="base" x1="0" x2="0" y1="0" y2="1">
          <Stop offset="0" stopColor="#c47637" />
          <Stop offset="0.5" stopColor="#a95a26" />
          <Stop offset="1" stopColor="#8c4719" />
        </LinearGradient>
      </Defs>
      <Path d="M0 0 H104 Q116 0 122 12 L130 26 V66 H0 Z" fill="url(#base)" />
      <G fill="#3a1d0b" opacity={0.75}>
        {[8, 24, 40, 56, 72, 88].map((x) => <Rect key={`t${x}`} x={x} y="5" width="7" height="6" rx="1.5" />)}
        {[8, 24, 40, 56, 72, 88, 104, 120].map((x) => <Rect key={`b${x}`} x={x} y="55" width="7" height="6" rx="1.5" />)}
      </G>
    </Svg>
  )
}
