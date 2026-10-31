// 깃허브 릴리스(android)에 올라간 새 APK 확인 → 내려받아 설치 (같은 서명이라 기록은 그대로 두고 덮어 설치된다)
// APK는 용량이 커서 Vercel에 두면 전송량 한도를 넘긴다. 그래서 깃허브 릴리스에서 받는다.
import { Linking } from 'react-native'
import { APK_BUILT } from './apkBuild'

export const RELEASE = 'https://github.com/ssjjnnn002-cmd/filmchest/releases/download/android'

export async function checkUpdate(): Promise<{ newer: boolean; built?: number }> {
  const res = await fetch(`${RELEASE}/apk.json?t=${Date.now()}`)
  if (!res.ok) throw new Error('업데이트 정보를 받지 못했어요')
  const { built } = (await res.json()) as { built: number }
  return { newer: built > APK_BUILT, built }
}

export const downloadUpdate = () => Linking.openURL(`${RELEASE}/filmchest.apk`)
export const installedBuilt = () => APK_BUILT
