// 웹앱에 올라간 새 APK 확인 → 내려받아 설치 (같은 서명이라 기록은 그대로 두고 덮어 설치된다)
import { Linking } from 'react-native'
import { APK_BUILT } from './apkBuild'

const SITE = 'https://filmchest.vercel.app'

export async function checkUpdate(): Promise<{ newer: boolean; built?: number }> {
  const res = await fetch(`${SITE}/apk.json?t=${Date.now()}`)
  if (!res.ok) throw new Error('업데이트 정보를 받지 못했어요')
  const { built } = (await res.json()) as { built: number }
  return { newer: built > APK_BUILT, built }
}

export const downloadUpdate = () => Linking.openURL(`${SITE}/filmchest.apk?v=${Date.now()}`)
export const installedBuilt = () => APK_BUILT
