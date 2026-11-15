// 한글 조합이 끊기지 않는 입력칸 (react-native TextInput 대신 쓴다)
// 안드로이드 천지인 같은 자판은 글자를 조합하는 중에 앱이 값을 다시 넣으면 조합이 끊겨 'ㄴㅣ·ㄷㅡ·' 처럼 낱자로 남는다.
// 그래서 입력한 그대로면 값을 넘기지 않고(글자는 입력칸이 가진 그대로), 앱이 값을 바꿨을 때만 넘긴다.
import { forwardRef, useRef } from 'react'
import { TextInput as RNTextInput, type TextInputProps } from 'react-native'
import { FONT } from './text'

export const TextInput = forwardRef<RNTextInput, TextInputProps>(function TextInput({ value, defaultValue, onChangeText, style, ...rest }, ref) {
  /** 입력칸에서 마지막으로 받은 글자 */
  const typed = useRef(value ?? defaultValue)
  /** 입력칸에 마지막으로 넣어 준 글자. 입력하는 동안 이 값이 바뀌지 않아야 조합이 안 끊긴다 */
  const base = useRef(value ?? defaultValue)
  const changedByApp = value !== undefined && value !== typed.current
  if (changedByApp) { base.current = value; typed.current = value }
  return (
    <RNTextInput ref={ref} {...rest} style={[{ fontFamily: FONT }, style]} defaultValue={base.current} value={changedByApp ? value : undefined}
      onChangeText={(t) => { typed.current = t; onChangeText?.(t) }} />
  )
})
