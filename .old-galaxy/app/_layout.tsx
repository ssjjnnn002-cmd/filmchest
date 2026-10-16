import 'react-native-gesture-handler'
import { useState } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { ChromeProvider } from '../src/chrome'
import { Intro } from '../src/Intro'
import { ThemeProvider, useTheme } from '../src/theme'

function Root() {
  const c = useTheme()
  const [intro, setIntro] = useState(true)
  return (
    <>
      <StatusBar style={c.dark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.paper } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="settings" options={{ presentation: 'transparentModal', animation: 'fade', contentStyle: { backgroundColor: 'transparent' } }} />
        <Stack.Screen name="camera/new" options={{ presentation: 'transparentModal', animation: 'fade', contentStyle: { backgroundColor: 'transparent' } }} />
        <Stack.Screen name="camera/[id]" />
        <Stack.Screen name="roll/[id]" />
        <Stack.Screen name="meter/[id]" options={{ animation: 'slide_from_bottom', contentStyle: { backgroundColor: '#0b0b0c' } }} />
        <Stack.Screen name="load" options={{ presentation: 'transparentModal', animation: 'fade', contentStyle: { backgroundColor: 'transparent' } }} />
      </Stack>
      {intro ? <Intro onDone={() => setIntro(false)} /> : null}
    </>
  )
}

export default function Layout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ChromeProvider>
          <Root />
        </ChromeProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  )
}
