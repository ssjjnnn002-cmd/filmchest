import { useState } from 'react'
import { Image, Linking, Platform, Text, View } from 'react-native'
import { signInWithGoogle, pullFromDrive } from './drive'
import { importBackupFile } from './backup'
import { pickFiles } from './pick'
import { setPref } from './store'
import { withWork } from './core/work'
import { Footnote, Group, Row, RowText, Section } from './kit'
import { Sheet, SheetBtn } from './overlay'
import { useTheme } from './theme'

const OLD_SITE = 'https://filmchest.vercel.app'
const NEW_SITE = 'https://filmchest.pages.dev'
const oldHost = 'filmchest.vercel.app'
const newHost = 'filmchest.pages.dev'

/** 처음 켤 때 한 번: 구글로 시작하기 + 예전 서버 기록 옮기기 (웹과 같게) */
export function Welcome({ onDone }: { onDone: () => void }) {
  const c = useTheme()
  const [step, setStep] = useState<string>()
  const [result, setResult] = useState<string>()
  const [error, setError] = useState<string>()
  const [guide, setGuide] = useState(false)
  const [note, setNote] = useState<string>()
  const finish = () => { setPref('welcomeSeen', '1'); setPref('moveAsked', '1'); onDone() }
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
  const fromDrive = () => {
    if (step) return
    void withWork(async () => {
      setStep('불러오는 중…')
      setError(undefined)
      try {
        const n = await pullFromDrive(true)
        setResult(n
          ? `카메라 ${n.cameras}대, 롤 ${n.rolls}개를 불러왔어요.`
          : '드라이브에 기록 파일이 아직 없어요. 구글로 로그인해 이어갈 수 있어요.')
      } catch (e) {
        setNote((e as Error).message || '불러오지 못했어요.')
      } finally { setStep(undefined) }
    })
  }
  const fromFile = () => {
    if (step) return
    void withWork(async () => {
      const [file] = await pickFiles(['application/json', 'text/plain', 'application/zip', '*/*'], false)
      if (!file) return
      setStep('불러오는 중…')
      setError(undefined)
      try {
        const counts = await importBackupFile(file.uri)
        setResult(`카메라 ${counts.cameras}대, 롤 ${counts.rolls}개${counts.photos ? `, 사진 ${counts.photos}장` : ''}을 불러왔어요.`)
      } catch (e) {
        setNote((e as Error).message || '백업 파일을 읽지 못했어요.')
      } finally { setStep(undefined) }
    })
  }

  return (
    <>
      <Sheet title="필름함 시작하기" onClose={finish} left={null}>
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
              : [
                <Row key="new" onPress={start}><RowText color={c.muted}>처음이에요</RowText><Text style={{ color: c.safelight, fontWeight: '700', fontSize: 17 }}>구글로 시작하기</Text></Row>,
                <Row key="has" onPress={start}><RowText color={c.muted}>계정이 있어요</RowText><Text style={{ color: c.safelight, fontWeight: '700', fontSize: 17 }}>구글로 로그인하기</Text></Row>,
              ]}
          {!result ? <Row onPress={() => { if (!step) finish() }}><RowText>로그인 없이 쓰기</RowText></Row> : null}
        </Group>
        {error ? <Text style={{ color: c.danger, fontSize: 14, margin: 12 }}>{error}</Text> : null}
        <Footnote>필름함 서버에는 아무것도 올라가지 않아요. 나중에 설정에서도 로그인할 수 있어요.</Footnote>

        {!result ? (
          <>
            <Section title="예전 기록 불러오기" foot={`필름함 주소가 ${oldHost}에서 ${newHost}로 변경되었습니다. 서버 사용량 한도 초과로 예전 주소는 11월 30일까지 일시 중단된 상태입니다. 이용에 불편을 드려 죄송합니다.`}>
              <Group>
                <Row onPress={() => { if (!step) fromDrive() }}><RowText color={c.safelight}>구글 드라이브에서 불러오기</RowText></Row>
                <Row onPress={() => { if (!step) fromFile() }}><RowText color={c.safelight}>백업 파일 불러오기</RowText></Row>
                <Row onPress={() => { if (!step) setGuide(true) }}><RowText color={c.safelight}>예전 서버에서 바로 불러오기</RowText></Row>
                <Row onPress={() => { if (!step) finish() }}><RowText>처음 써요</RowText></Row>
              </Group>
              {note ? <Text style={{ color: c.ink, fontSize: 14, margin: 12 }}>{note}</Text> : null}
            </Section>
            <Section title="백업 파일이 없는 경우" foot={`위의 '예전 서버에서 바로 불러오기'를 눌러 안내에 따라 진행해 주세요. 기록과 사진이 새 주소로 그대로 옮겨집니다. 11월 30일 이후에는 예전 주소(${oldHost})에 접속해 '기록 옮기고 새 주소로 가기' 버튼만 눌러도 됩니다.`}>
              <Text style={{ color: c.danger, fontSize: 13, lineHeight: 18, paddingHorizontal: 18, marginTop: 4 }}>
                기록은 예전 주소를 사용하던 브라우저 안에만 저장되어 있습니다.{'\n'}
                옮기기 전까지 해당 브라우저의 방문 기록, 쿠키, 사이트 데이터를 삭제하지 마세요. 삭제하면 복구할 수 없습니다.
              </Text>
            </Section>
          </>
        ) : null}
      </Sheet>
      {guide ? <MoveGuide onClose={() => setGuide(false)} /> : null}
    </>
  )
}

/** 예전 vercel이 중단돼도 브라우저 저장소를 북마크로 꺼내는 안내 (웹에서 진행) */
function MoveGuide({ onClose }: { onClose: () => void }) {
  const c = useTheme()
  const steps = Platform.OS === 'ios' ? [
    '아래 \'새 주소(웹) 열기\'로 사파리에서 필름함 웹을 열어요.',
    '웹 시작 화면에서 \'예전 서버에서 바로 불러오기\' → \'코드 복사\'로 북마크를 만들어요.',
    '\'예전 주소 열기\'를 눌러요. 서버 오류 화면이 떠도 그대로 두세요.',
    '그 화면에서 북마크 \'필름함 옮기기\' → \'기록 옮기기\'를 눌러요.',
  ] : [
    '아래 \'새 주소(웹) 열기\'로 크롬에서 필름함 웹을 열어요.',
    '웹 시작 화면에서 \'예전 서버에서 바로 불러오기\' → \'코드 복사\'로 북마크를 만들어요.',
    '\'예전 주소 열기\'를 눌러요. 서버 오류 화면이 떠도 그대로 두세요.',
    '주소창에 \'필름함 옮기기\'를 쳐 북마크를 누르고, \'기록 옮기기\'를 눌러요.',
  ]
  return (
    <Sheet title="예전 서버에서 바로 불러오기" onClose={onClose} right={<SheetBtn label="완료" accent onPress={onClose} />}>
      <Section foot={`예전 주소(${oldHost}) 서버는 사용량 초과로 지금은 열리지 않아요. 기록은 서버가 아니라 예전에 쓰던 브라우저 안에 남아 있어서, 웹 북마크로 그 브라우저에서 바로 꺼낼 수 있어요.`}>
        <View style={{ gap: 10, paddingHorizontal: 4, marginBottom: 12 }}>
          {steps.map((t, i) => (
            <Text key={i} style={{ fontSize: 15, lineHeight: 22, color: c.ink }}>{i + 1}. {t}</Text>
          ))}
        </View>
        <Group>
          <Row onPress={() => { void Linking.openURL(NEW_SITE) }}><RowText color={c.safelight}>새 주소(웹) 열기</RowText></Row>
          <Row onPress={() => { void Linking.openURL(OLD_SITE) }}><RowText color={c.safelight}>예전 주소 열기</RowText></Row>
        </Group>
        <Footnote>반드시 예전에 필름함 웹을 쓰던 같은 브라우저에서 해 주세요. 앱만 쓰던 기록은 구글 드라이브나 백업 파일로 가져오면 돼요.</Footnote>
      </Section>
    </Sheet>
  )
}
