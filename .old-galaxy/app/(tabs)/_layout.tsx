import { useEffect, useRef, useState } from 'react'
import { Animated, Pressable, Text, View } from 'react-native'
import { Tabs } from 'expo-router'
import { BlurView } from 'expo-blur'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { listRolls, useDb } from '../../src/db'
import { Icon } from '../../src/icons'
import { useTheme } from '../../src/theme'

const tabs = [
  { name: 'index', title: '내 장비', icon: 'camera.fill' },
  { name: 'shooting', title: '촬영 중', icon: 'film.fill' },
  { name: 'pending', title: '현상 스캔', icon: 'tray.fill' },
  { name: 'rolls', title: '롤 보관함', icon: 'canister.fill' },
]

function GlassTabBar({ state, navigation }: {
  state: { index: number; routes: { key: string; name: string }[] }
  navigation: { navigate: (name: string) => void }
}) {
  const c = useTheme()
  const insets = useSafeAreaInsets()
  useDb()
  const badges: Record<string, number> = {
    shooting: listRolls('loaded').length,
    pending: listRolls(['finished', 'atLab']).length,
  }
  const routes = state.routes.filter((route) => tabs.some((tab) => tab.name === route.name))
  const active = routes.findIndex((route) => route.key === state.routes[state.index]?.key)
  const index = active < 0 ? 0 : active
  const slide = useRef(new Animated.Value(index)).current
  const [width, setWidth] = useState(0)
  useEffect(() => {
    Animated.spring(slide, { toValue: index, useNativeDriver: true, stiffness: 260, damping: 24, mass: 0.7 }).start()
  }, [index, slide])
  const inner = Math.max(0, width - 8)
  const gap = 2
  const pill = routes.length ? (inner - gap * (routes.length - 1)) / routes.length : 0
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 20, right: 20, bottom: insets.bottom + 14 }}>
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{
        height: 64, borderRadius: 32, overflow: 'hidden', borderWidth: 0.5, borderColor: c.glassLine,
      }}>
        <BlurView intensity={c.dark ? 48 : 36} tint={c.dark ? 'dark' : 'light'} style={{ flex: 1, backgroundColor: c.glass }}>
          {pill > 0 && active >= 0 ? (
            <Animated.View style={{
              position: 'absolute', top: 4, bottom: 4, left: 4, width: pill, borderRadius: 28, backgroundColor: c.fill,
              transform: [{ translateX: slide.interpolate({ inputRange: [0, 1, 2, 3], outputRange: [0, pill + gap, (pill + gap) * 2, (pill + gap) * 3] }) }],
            }} />
          ) : null}
          <View style={{ flex: 1, flexDirection: 'row', padding: 4, gap }}>
            {routes.map((route) => {
              const meta = tabs.find((tab) => tab.name === route.name)!
              const on = route.key === state.routes[state.index]?.key
              return (
                <Pressable key={route.key} onPress={() => navigation.navigate(route.name)} style={{ flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                  <View>
                    <Icon name={meta.icon} size={24} color={on ? c.safelight : c.ink} />
                    {badges[route.name] > 0 ? (
                      <View style={{ position: 'absolute', top: -4, left: 14, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, backgroundColor: '#FF3B30', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{badges[route.name]}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text numberOfLines={1} style={{ fontSize: 10.5, fontWeight: '600', color: on ? c.safelight : c.ink }}>{meta.title}</Text>
                </Pressable>
              )
            })}
          </View>
        </BlurView>
      </View>
    </View>
  )
}

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <GlassTabBar state={props.state} navigation={props.navigation} />} screenOptions={{ headerShown: false }}>
      {tabs.map((tab) => <Tabs.Screen key={tab.name} name={tab.name} options={{ title: tab.title }} />)}
    </Tabs>
  )
}
