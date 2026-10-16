import Constants from 'expo-constants'
import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { router } from 'expo-router'
import { getPref, patchRoll, restoreCamera, setPref, trashedCameras, trashedRolls, useDb } from '../src/db'
import { filmById, filmDisplayName } from '../src/films'
import { Confirm, Sheet } from '../src/chrome'
import { PrivacyPolicy } from '../src/privacy'
import { Row, Section } from '../src/ui'
import { useTheme } from '../src/theme'

const themes: [string, string][] = [['system', '기기 설정'], ['light', '라이트'], ['dark', '다크']]

export default function Settings() {
  useDb()
  const c = useTheme()
  const theme = getPref('theme', 'system')
  const trash = trashedRolls()
  const trashCameras = trashedCameras()
  const version = Constants.nativeAppVersion || Constants.expoConfig?.version || '1.5.0'
  const [ask, setAsk] = useState<string | null>(null)
  const [privacy, setPrivacy] = useState(false)
  const asked = trashCameras.find((camera) => camera.id === ask)
  const close = () => router.back()
  return (
    <View style={{ flex: 1 }}>
      <Sheet tall title="설정" onClose={close} right="완료" onRight={close}>
        <View style={{ gap: 8 }}>
          <Text style={{ color: c.muted, fontSize: 13, fontWeight: '600', paddingHorizontal: 16 }}>화면</Text>
          <View style={{ flexDirection: 'row', backgroundColor: c.fill, borderRadius: 999, padding: 3 }}>
            {themes.map(([id, name]) => {
              const on = theme === id
              return (
                <Pressable key={id} onPress={() => setPref('theme', id)} style={{
                  flex: 1, height: 34, borderRadius: 999, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: on ? c.cell : 'transparent',
                }}>
                  <Text numberOfLines={1} style={{ color: c.ink, fontSize: 15, fontWeight: on ? '700' : '500' }}>{name}</Text>
                </Pressable>
              )
            })}
          </View>
        </View>

        <Section title="저장" foot="장비와 롤은 이 앱 안에만 저장됩니다. 크롬에서 쿠키를 지워도 여기 기록은 남고, 폰을 껐다 켜도 그대로입니다. 아이폰 앱과는 아직 동기화되지 않습니다.">
          <Row label="저장 위치" value="이 앱" last />
        </Section>

        <Section title="삭제한 롤" foot="지운 롤은 24시간 동안 여기 남습니다. 누르면 되돌아옵니다.">
          {trash.length === 0 ? <Row label="최근 24시간 안에 지운 롤이 없어요" last /> : trash.map((roll, i) => (
            <Row key={roll.id} label={filmDisplayName(filmById(roll.filmId))} value="되돌리기" last={i === trash.length - 1}
              onPress={() => patchRoll(roll.id, { deletedAt: null })} />
          ))}
        </Section>

        <Section title="삭제한 장비" foot="지운 카메라는 24시간 동안 여기 남습니다. 필름에 적힌 카메라 정보는 카메라를 지워도 그대로입니다.">
          {trashCameras.length === 0 ? <Row label="최근 24시간 안에 지운 카메라가 없어요" last /> : trashCameras.map((camera, i) => (
            <Row key={camera.id} label={`${camera.brand} ${camera.model}`} value="되돌리기" last={i === trashCameras.length - 1}
              onPress={() => setAsk(camera.id)} />
          ))}
        </Section>

        <Section title="안내">
          <Row label="개인정보 처리방침" onPress={() => setPrivacy(true)} last />
        </Section>

        <Section title="버전" foot="아이폰, 갤럭시, 웹의 앱 버전은 같은 번호입니다.">
          <Row label="앱 버전" value={version} last />
        </Section>
      </Sheet>
      {privacy ? <PrivacyPolicy onClose={() => setPrivacy(false)} /> : null}
      {asked ? (
        <Confirm
          message={`${asked.brand} ${asked.model}을 되돌릴까요?`}
          action="되돌리기"
          onCancel={() => setAsk(null)}
          onConfirm={() => { restoreCamera(asked.id); setAsk(null) }}
        />
      ) : null}
    </View>
  )
}
