import { useState } from 'react'
import { Image, Text, View } from 'react-native'
import { signInWithGoogle } from './drive'
import { setPref } from './store'
import { Footnote, Group, Row, RowText } from './kit'
import { Sheet } from './overlay'
import { useTheme } from './theme'

/** 처음 켤 때 한 번: 구글로 시작하기 (내 구글 드라이브에 기록·사진 저장) 또는 로그인 없이 쓰기 (웹과 같게) */
export function Welcome({ onDone }: { onDone: () => void }) {
  const c = useTheme()
  const [step, setStep] = useState<string>()
  const [result, setResult] = useState<string>()
  const [error, setError] = useState<string>()
  const finish = () => { setPref('welcomeSeen', '1'); onDone() }
  const start = async () => {
    if (step) return
    setError(undefined)
    try {
      const r = await signInWithGoogle(setStep)
      setResult(r.rolls || r.cameras
        ? `카메라 ${r.cameras}대, 롤 ${r.rolls}개${r.photos ? `, 사진 ${r.photos}장` : ''}을 받았어요.`
        : '연결했어요. 이제 기록과 사진이 내 구글 드라이브에 저장돼요.')
    } catch (e) {
      setError((e as Error).message || '로그인하지 못했어요.')
    } finally { setStep(undefined) }
  }
  return (
    <Sheet title="필름함 시작하기" onClose={finish} left={<View />}>
      <View style={{ alignItems: 'center', gap: 14, paddingTop: 12, paddingBottom: 20, paddingHorizontal: 8 }}>
        <Image source={require('../assets/icon.png')} style={{ width: 84, height: 84, borderRadius: 20 }} />
        <Text style={{ fontSize: 16, lineHeight: 25, color: c.ink, textAlign: 'center' }}>
          구글 계정으로 시작하면 기록과 사진이 <Text style={{ fontWeight: '700' }}>내 구글 드라이브</Text>에 저장돼요.{'\n'}다른 기기에서 같은 계정으로 들어오면 그대로 이어져요.
        </Text>
      </View>
      <Group>
        {result
          ? <Row onPress={finish}><RowText color={c.safelight}>{result}</RowText><Text style={{ color: c.safelight, fontWeight: '700', fontSize: 17 }}>시작</Text></Row>
          : step
            ? <Row static><Text style={{ color: c.safelight, fontWeight: '700', fontSize: 17 }}>{step}</Text></Row>
            // 둘 다 같은 구글 로그인 (웹과 같음)
            : [
              <Row key="new" onPress={start}><RowText color={c.muted}>처음이에요</RowText><Text style={{ color: c.safelight, fontWeight: '700', fontSize: 17 }}>구글로 시작하기</Text></Row>,
              <Row key="has" onPress={start}><RowText color={c.muted}>계정이 있어요</RowText><Text style={{ color: c.safelight, fontWeight: '700', fontSize: 17 }}>구글로 로그인하기</Text></Row>,
            ]}
        {!result ? <Row onPress={() => { if (!step) finish() }}><RowText>로그인 없이 쓰기</RowText></Row> : null}
      </Group>
      {error ? <Text style={{ color: c.danger, fontSize: 14, margin: 12 }}>{error}</Text> : null}
      <Footnote>필름함 서버에는 아무것도 올라가지 않아요. 나중에 설정에서도 로그인할 수 있어요.</Footnote>
    </Sheet>
  )
}
