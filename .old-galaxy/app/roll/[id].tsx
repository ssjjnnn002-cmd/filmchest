import { useState } from 'react'
import { Text, TextInput, View } from 'react-native'
import { Confirm } from '../../src/chrome'
import { router, useLocalSearchParams } from 'expo-router'
import { cameraName, getCamera, getRoll, patchRoll, useDb } from '../../src/db'
import { LabDropOff } from '../../src/lab'
import { filmById, filmDisplayName } from '../../src/films'
import { statusName } from '../../src/types'
import { Button, Canister, Row, Screen, Section, fmtDay } from '../../src/ui'
import { useTheme } from '../../src/theme'
import { RollProjects } from '../../src/projects'

export default function RollDetail() {
  useDb()
  const c = useTheme()
  const { id } = useLocalSearchParams<{ id: string }>()
  const roll = id ? getRoll(id) : undefined
  const [note, setNote] = useState(roll?.note ?? '')
  const [frames, setFrames] = useState(roll?.frameCount ? String(roll.frameCount) : '')
  const [confirm, setConfirm] = useState(false)
  const [dropOff, setDropOff] = useState(false)
  if (!roll || roll.deletedAt) {
    return <Screen title="롤" onBack={() => router.back()}><Text style={{ color: c.muted }}>없는 롤입니다.</Text></Screen>
  }
  const film = filmById(roll.filmId)
  const camera = getCamera(roll.cameraId ?? '')
  const saveNote = () => patchRoll(roll.id, { note })

  const imported = () => {
    const count = Number(frames)
    patchRoll(roll.id, {
      status: 'imported',
      frameCount: Number.isFinite(count) && count > 0 ? count : null,
      note,
    })
  }
  const remove = () => setConfirm(true)

  return (
    <Screen title={filmDisplayName(film)} onBack={() => router.back()}>
      <View style={{ alignItems: 'center', gap: 8 }}>
        <Canister film={film} format={camera?.format} size={160} />
        <Text style={{ color: c.safelight, fontWeight: '700' }}>{statusName[roll.status]}</Text>
      </View>
      <Section>
        <Row label="카메라" value={cameraName(camera, roll)} />
        <Row label="렌즈" value={roll.lensName ?? camera?.fixedLens ?? roll.cameraFixedLens ?? '—'} />
        <Row label="장착" value={fmtDay(roll.loadedAt)} />
        <Row label="감도" value={roll.shotISO ? `ISO ${roll.shotISO}` : film ? `ISO ${film.iso}` : '—'} last={!roll.frameCount && !roll.lab && !roll.droppedAt} />
        {roll.frameCount ? <Row label="스캔" value={`${roll.frameCount}장`} last={!roll.lab && !roll.droppedAt} /> : null}
        {roll.lab ? <Row label="현상소" value={roll.lab} last={!roll.droppedAt} /> : null}
        {roll.droppedAt ? <Row label="맡긴 날" value={fmtDay(roll.droppedAt)} last /> : null}
      </Section>
      <RollProjects roll={roll} />
      <Section title="메모">
        <TextInput value={note} onChangeText={setNote} onEndEditing={saveNote} placeholder="메모" placeholderTextColor={c.faint} multiline
          style={{ paddingHorizontal: 16, paddingVertical: 14, minHeight: 80, fontSize: 17, color: c.ink }} />
      </Section>
      {roll.status === 'loaded' ? <Button block label="촬영 끝내기" onPress={() => setDropOff(true)} /> : null}
      {roll.status === 'finished' ? <Button block kind="soft" label="현상 맡기기" onPress={() => setDropOff(true)} /> : null}
      {roll.status === 'atLab' ? (
        <>
          <Section title="스캔 장수">
            <TextInput value={frames} onChangeText={setFrames} keyboardType="number-pad" placeholder="36" placeholderTextColor={c.faint}
              style={{ paddingHorizontal: 16, height: 52, fontSize: 17, color: c.ink }} />
          </Section>
          <Button block label="스캔 완료로 보관" onPress={imported} />
        </>
      ) : null}
      <Button label={roll.favorite ? '즐겨찾기 해제' : '즐겨찾기'} kind="plain" onPress={() => patchRoll(roll.id, { favorite: !roll.favorite })} />
      <Button label="롤 삭제" kind="danger" onPress={remove} />
      {dropOff ? <LabDropOff roll={roll} onClose={() => setDropOff(false)} /> : null}
      {confirm ? (
        <Confirm
          message="이 롤 기록을 삭제할까요? 24시간 안에는 설정에서 되돌릴 수 있어요. 사진 앱에 저장한 사진은 그대로 남아요."
          onCancel={() => setConfirm(false)}
          onConfirm={() => { patchRoll(roll.id, { deletedAt: Date.now() }); router.back() }}
        />
      ) : null}
    </Screen>
  )
}
