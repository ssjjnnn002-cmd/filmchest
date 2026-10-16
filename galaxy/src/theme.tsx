import { createContext, useContext, useSyncExternalStore, type ReactNode } from 'react'
import { useColorScheme } from 'react-native'
import { getPref, setPref } from './store'

export type Palette = {
  dark: boolean
  paper: string
  card: string
  cell: string
  ink: string
  muted: string
  faint: string
  sep: string
  fill: string
  safelight: string
  soft: string
  danger: string
  warn: string
  glass: string
  glassLine: string
  good: string
  blue: string
  filmBase: string
  edgeInk: string
}

export function palette(dark: boolean): Palette {
  return dark
    ? {
        dark: true,
        paper: '#131211',
        card: '#201E1C',
        cell: '#1F1D1B',
        ink: '#F2EEE8',
        muted: '#9B948C',
        faint: '#5C5751',
        sep: 'rgba(255,245,235,0.1)',
        fill: 'rgba(255,245,235,0.1)',
        safelight: '#EF6A43',
        soft: '#3B241C',
        danger: '#FF453A',
        warn: '#FF9F0A',
        glass: 'rgba(40,38,36,0.72)',
        glassLine: 'rgba(255,255,255,0.08)',
        good: '#30D158',
        blue: '#0A84FF',
        filmBase: '#0C0B0A',
        edgeInk: '#CFC4AD',
      }
    : {
        dark: false,
        paper: '#F2F0EA',
        card: '#FCFBF8',
        cell: '#FFFFFF',
        ink: '#1A1816',
        muted: '#86807A',
        faint: '#B9B3AB',
        sep: 'rgba(60,50,40,0.12)',
        fill: 'rgba(120,110,100,0.12)',
        safelight: '#DE542E',
        soft: '#F8E3DB',
        danger: '#FF3B30',
        warn: '#F08A00',
        glass: 'rgba(252,251,248,0.72)',
        glassLine: 'rgba(255,255,255,0.7)',
        good: '#34A853',
        blue: '#0A7AFF',
        filmBase: '#1C1A17',
        edgeInk: '#D9CFB8',
      }
}

const ThemeContext = createContext<Palette>(palette(false))

// 웹 platform.applyTheme 자리: 설정에서 고르면 바로 바뀐다
let themeRev = 0
const themeListeners = new Set<() => void>()
export function applyTheme(mode: string) {
  setPref('theme', mode)
  themeRev += 1
  themeListeners.forEach((fn) => fn())
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  useSyncExternalStore((fn) => { themeListeners.add(fn); return () => { themeListeners.delete(fn) } }, () => themeRev)
  const system = useColorScheme()
  const pref = getPref<string>('theme', 'system')
  const dark = pref === 'dark' || (pref !== 'light' && system === 'dark')
  return <ThemeContext.Provider value={palette(dark)}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  return useContext(ThemeContext)
}
