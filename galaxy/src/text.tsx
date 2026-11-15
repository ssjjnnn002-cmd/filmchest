// 웹·아이폰과 같은 느낌의 글꼴(Pretendard)을 모든 글자에 쓴다 (react-native Text 대신 쓴다)
// 안드로이드 기본 글꼴은 획이 두껍고 자간이 넓어서 웹·아이폰 화면과 달라 보였다. 굵기는 400~800을 넣어 두었다.
import { forwardRef } from 'react'
import { Text as RNText, type TextProps } from 'react-native'

export const FONT = 'Pretendard'
const base = { fontFamily: FONT }

export const Text = forwardRef<RNText, TextProps>(function Text({ style, ...rest }, ref) {
  return <RNText ref={ref} {...rest} style={[base, style]} />
})
