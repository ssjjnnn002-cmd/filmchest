// 깃허브 릴리스에 올라간 새 APK 확인 → 내려받아 설치 (같은 서명이라 기록은 그대로 두고 덮어 설치된다)
import { Linking } from 'react-native'
import { APK_BUILT } from './apkBuild'

// 웹 주소에 같이 올린 최신 APK (scripts/build-android.sh가 나눠 두고, 웹 배포로 올라간다)
const LATEST = 'https://filmchest.pages.dev'

export async function checkUpdate(): Promise<{ newer: boolean; built?: number }> {
  const res = await fetch(`${LATEST}/apk.json?t=${Date.now()}`)
  if (!res.ok) throw new Error('업데이트 정보를 받지 못했어요')
  const { built } = (await res.json()) as { built: number }
  return { newer: built > APK_BUILT, built }
}

export const downloadUpdate = () => Linking.openURL(`${LATEST}/filmchest.apk?v=${APK_BUILT}`)
export const installedBuilt = () => APK_BUILT
