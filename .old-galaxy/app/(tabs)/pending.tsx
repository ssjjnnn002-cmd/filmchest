import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { router } from 'expo-router'
import { cameraName, getCamera, listRolls, useDb, type Roll } from '../../src/db'
import { LabDropOff } from '../../src/lab'
import { filmById, filmDisplayName } from '../../src/films'
import { Icon } from '../../src/icons'
import { Sheet } from '../../src/chrome'
import { Canister, GlassButton, Screen, fmtDay } from '../../src/ui'
import { useTheme } from '../../src/theme'

export default function Pending() {
  useDb()
  const c = useTheme()
  const rolls = listRolls(['finished', 'atLab'])
  const atLab = rolls.filter((roll) => roll.status === 'atLab')
  const finished = rolls.filter((roll) => roll.status === 'finished')
  const [choice, setChoice] = useState(false)
  const [dropOff, setDropOff] = useState<Roll | null>(null)
  return (
    <Screen
      large
      title="현상 스캔"
      right={<GlassButton label="기존 롤 가져오기" onPress={() => setChoice(true)}><Icon name="plus" size={22} color={c.safelight} /></GlassButton>}
    >
      <View style={{ backgroundColor: c.cell, borderRadius: 22, overflow: 'hidden' }}>
        <Pressable onPress={() => setChoice(true)} style={({ pressed }) => ({ minHeight: 52, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: pressed ? c.fill : 'transparent' })}>
          <Icon name="zip" size={24} color={c.safelight} />
          <Text style={{ color: c.safelight, fontSize: 17, flex: 1 }}>zip 파일 열기</Text>
        </Pressable>
      </View>
      <Text style={{ color: c.muted, fontSize: 13, lineHeight: 18, paddingHorizontal: 18, marginTop: -8 }}>현상소에서 받은 zip을 고르세요. 사진 여러 장을 골라도 돼요.</Text>

      <RollSection title={`현상 맡김 · ${atLab.length}`} rolls={atLab} action="불러오기" />
      <RollSection title={`촬영 완료 · ${finished.length}`} rolls={finished} action="맡기기" onAction={setDropOff} />

      {choice ? (
        <Sheet title="기존 롤 가져오기" onClose={() => setChoice(false)}>
          <View style={{ backgroundColor: c.cell, borderRadius: 22, overflow: 'hidden' }}>
            <Pressable onPress={() => setChoice(false)} style={{ minHeight: 64, paddingHorizontal: 18, paddingVertical: 12, justifyContent: 'center' }}>
              <Text style={{ color: c.ink, fontSize: 17, fontWeight: '700' }}>한 롤</Text>
              <Text style={{ color: c.muted, fontSize: 14, marginTop: 2 }}>사진이나 zip 하나를 바로 입력해요</Text>
            </Pressable>
            <Pressable onPress={() => setChoice(false)} style={{ minHeight: 64, paddingHorizontal: 18, paddingVertical: 12, justifyContent: 'center', borderTopWidth: 0.5, borderTopColor: c.sep }}>
              <Text style={{ color: c.ink, fontSize: 17, fontWeight: '700' }}>여러 롤</Text>
              <Text style={{ color: c.muted, fontSize: 14, marginTop: 2 }}>zip을 여러 개 고르면 대기열에서 차례로 입력해요</Text>
            </Pressable>
          </View>
        </Sheet>
      ) : null}
      {dropOff ? <LabDropOff roll={dropOff} onClose={() => setDropOff(null)} /> : null}
    </Screen>
  )
}

function RollSection({ title, rolls, action, onAction }: {
  title: string
  rolls: Roll[]
  action: string
  onAction?: (roll: Roll) => void
}) {
  const c = useTheme()
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: c.muted, fontSize: 13, fontWeight: '600', paddingHorizontal: 4 }}>{title}</Text>
      {rolls.length > 0 ? (
        <View style={{ backgroundColor: c.cell, borderRadius: 22, overflow: 'hidden' }}>
          {rolls.map((roll, index) => {
            const film = filmById(roll.filmId)
            const camera = getCamera(roll.cameraId ?? '')
            return (
              <View key={roll.id} style={{ minHeight: 64, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: index ? 0.5 : 0, borderTopColor: c.sep }}>
                <Pressable onPress={() => router.push(`/roll/${roll.id}`)} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Canister film={film} format={camera?.format} size={48} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: c.ink, fontSize: 16, fontWeight: '700' }} numberOfLines={1}>{filmDisplayName(film)}</Text>
                    <Text style={{ color: c.muted, fontSize: 13, marginTop: 2 }} numberOfLines={1}>{cameraName(camera, roll)} · {fmtDay(roll.loadedAt)}</Text>
                  </View>
                </Pressable>
                <Pressable onPress={() => onAction ? onAction(roll) : router.push(`/roll/${roll.id}`)} style={{ height: 32, paddingHorizontal: 12, borderRadius: 16, backgroundColor: action === '불러오기' ? c.safelight : c.soft, justifyContent: 'center' }}>
                  <Text style={{ color: action === '불러오기' ? '#fff' : c.safelight, fontSize: 14, fontWeight: '600' }}>{action}</Text>
                </Pressable>
              </View>
            )
          })}
        </View>
      ) : null}
    </View>
  )
}
