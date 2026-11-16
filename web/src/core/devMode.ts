import { useEffect, useState } from 'react'
import { features } from './features'

/** 개발자 모드: 설정 > 버전에서 관리자 코드를 넣으면 켜진다. 아직 모두에게 열지 않은 기능(노출계)을 먼저 시험할 때 쓴다. */
const KEY = 'filmchest.devMode'
const CODE = '3372'
const EVENT = 'filmchest-devmode'

export function isDevMode(): boolean {
  try { return localStorage.getItem(KEY) === '1' } catch { return false }
}

/** 코드가 맞으면 켜고 true */
export function unlockDevMode(code: string): boolean {
  if (code.trim() !== CODE) return false
  try { localStorage.setItem(KEY, '1') } catch { /* 저장 못 해도 이번엔 켠다 */ }
  window.dispatchEvent(new Event(EVENT))
  return true
}

export function lockDevMode() {
  try { localStorage.removeItem(KEY) } catch { /* 무시 */ }
  window.dispatchEvent(new Event(EVENT))
}

export function useDevMode(): boolean {
  const [on, setOn] = useState(isDevMode)
  useEffect(() => {
    const sync = () => setOn(isDevMode())
    window.addEventListener(EVENT, sync)
    window.addEventListener('storage', sync)
    return () => { window.removeEventListener(EVENT, sync); window.removeEventListener('storage', sync) }
  }, [])
  return on
}

/** 노출계 관련 기능을 보여 줄지 (모두에게 열리기 전엔 개발자 모드에서만) */
export function useMeterOn(): boolean {
  return useDevMode() || features.meter
}
