import { Platform, View, type StyleProp, type ViewStyle } from 'react-native'
import { BlurView } from 'expo-blur'
import type { ReactNode } from 'react'

/** 안드로이드 블러는 시트를 열 때 앱을 종료시키거나 터치를 붙잡는다. 그곳에서는 반투명으로 둔다. */
export function Glass({ intensity = 30, tint = 'light', style, children }: {
  intensity?: number
  tint?: 'light' | 'dark' | 'default'
  style?: StyleProp<ViewStyle>
  children?: ReactNode
}) {
  if (Platform.OS === 'android') return <View style={style}>{children}</View>
  return <BlurView intensity={intensity} tint={tint} style={style}>{children}</BlurView>
}
