// 깃허브 릴리스에 올라간 새 APK 확인 → 내려받아 설치 (같은 서명이라 기록은 그대로 두고 덮어 설치된다)
import { Linking } from 'react-native'
import { APK_BUILT } from './apkBuild'

// 가장 최근 릴리스의 파일 (scripts/upload-apk.sh가 올린다)
const LATEST = 'https://github.com/ssjjnnn002-cmd/filmchest/releases/latest/download'

export async function checkUpdate(): Promise<{ newer: boolean; built?: number }> {
  const res = await fetch(`${LATEST}/apk.json?t=${Date.now()}`)
  if (!res.ok) throw new Error('업데이트 정보를 받지 못했어요')
  const { built } = (await res.json()) as { built: number }
  return { newer: built > APK_BUILT, built }
}

export const downloadUpdate = () => Linking.openURL(`${LATEST}/filmchest.apk`)
export const installedBuilt = () => APK_BUILT
