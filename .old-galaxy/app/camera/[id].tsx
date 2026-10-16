import { useState } from 'react'
import { Text, View } from 'react-native'
import { Confirm } from '../../src/chrome'
import { router, useLocalSearchParams } from 'expo-router'
import { cameraName, deleteCamera, getCamera, loadedRoll, useDb } from '../../src/db'
import { filmById, filmDisplayName } from '../../src/films'
import { formatInfo, styleName } from '../../src/types'
import { Button, Canister, Row, Screen, Section } from '../../src/ui'
import { useTheme } from '../../src/theme'

export default function CameraDetail() {
  useDb()
  const c = useTheme()
  const { id } = useLocalSearchParams<{ id: string }>()
  const [confirm, setConfirm] = useState(false)
  const camera = id ? getCamera(id) : undefined
  if (!camera) {
    return <Screen title="카메라" onBack={() => router.back()}><Text style={{ color: c.muted }}>없는 카메라입니다.</Text></Screen>
  }
  const roll = loadedRoll(camera.id)
  const film = filmById(roll?.filmId)
  return (
    <Screen title={cameraName(camera)} onBack={() => router.back()} right={
      <Text onPress={() => router.push(`/camera/new?id=${camera.id}`)} style={{ color: c.safelight, fontSize: 17, fontWeight: '600' }}>수정</Text>
    }>
      <View style={{ alignItems: 'center', gap: 8 }}>
        {roll ? <Canister film={film} format={camera.format} size={120} /> : null}
        <Text style={{ color: c.muted }}>{[camera.brand, camera.model].join(' ')}</Text>
      </View>
      <Section>
        <Row label="규격" value={formatInfo[camera.format].name} />
        <Row label="형태" value={styleName[camera.style]} />
        <Row label="마운트" value={camera.mount ?? '고정'} />
        <Row label="렌즈" value={camera.fixedLens ?? '교환식'} />
        <Row label="배터리" value={camera.battery ?? '—'} last />
      </Section>
      {roll ? (
        <Button label={`${filmDisplayName(film)} 보는 중`} onPress={() => router.push(`/roll/${roll.id}`)} />
      ) : (
        <Button label="필름 장착" onPress={() => router.push(`/load?cameraId=${camera.id}`)} />
      )}
      <Button label="카메라 삭제" kind="danger" onPress={() => setConfirm(true)} />
      {confirm ? (
        <Confirm
          message="이 카메라를 삭제할까요? 필름에 적힌 카메라 정보는 남고, 24시간 안에는 설정에서 되돌릴 수 있어요."
          onCancel={() => setConfirm(false)}
          onConfirm={() => { deleteCamera(camera.id); router.back() }}
        />
      ) : null}
    </Screen>
  )
}
