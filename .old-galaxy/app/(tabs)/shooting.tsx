import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { router } from 'expo-router'
import { cameraName, getCamera, listRolls, useDb, type Roll } from '../../src/db'
import { LabDropOff } from '../../src/lab'
import { filmById, filmDisplayName } from '../../src/films'
import { Icon } from '../../src/icons'
import { Canister, Empty, fmtDay, GlassButton, Screen } from '../../src/ui'
import { useTheme } from '../../src/theme'

export default function Shooting() {
  useDb()
  const c = useTheme()
  const rolls = listRolls('loaded')
  return (
    <Screen
      large
      title="촬영 중"
      right={<GlassButton label="필름 장착하기" onPress={() => router.push('/load')}><Icon name="plus" size={22} color={c.safelight} /></GlassButton>}
    >
      {rolls.length === 0 ? (
        <Empty icon="film" title="장착된 필름이 없어요" action="필름 장착하기" onPress={() => router.push('/load')} />
      ) : rolls.map((roll) => <ShootingCard key={roll.id} roll={roll} />)}
    </Screen>
  )
}

function ShootingCard({ roll }: { roll: Roll }) {
  const c = useTheme()
  const [dropOff, setDropOff] = useState(false)
  const camera = getCamera(roll.cameraId ?? '')
  const film = filmById(roll.filmId)
  return (
    <View style={{ backgroundColor: c.card, borderRadius: 22, overflow: 'hidden' }}>
      <Pressable onPress={() => router.push(`/roll/${roll.id}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 }}>
        <View style={{ width: 72, alignItems: 'center' }}>
          <Canister film={film} format={camera?.format} size={64} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ color: c.ink, fontSize: 18, fontWeight: '700' }} numberOfLines={1}>{cameraName(camera, roll)}</Text>
          <Text style={{ color: c.safelight, fontSize: 15, fontWeight: '600' }} numberOfLines={1}>
            {filmDisplayName(film)}{roll.shotISO ? ` @ ${roll.shotISO}` : ''}
          </Text>
          <Text style={{ color: c.muted, fontSize: 13 }}>{fmtDay(roll.loadedAt)} 장착</Text>
        </View>
        <Icon name="chev" size={18} color={c.faint} />
      </Pressable>
      <View style={{ paddingHorizontal: 16, paddingBottom: 16, flexDirection: 'row', gap: 8 }}>
        <Pressable onPress={() => setDropOff(true)} style={({ pressed }) => ({
          flex: 1, height: 40, borderRadius: 999, backgroundColor: c.fill, alignItems: 'center', justifyContent: 'center',
          transform: [{ scale: pressed ? 0.97 : 1 }],
        })}>
          <Text style={{ color: c.ink, fontSize: 15, lineHeight: 20, fontWeight: '600', includeFontPadding: false }}>촬영 끝내기</Text>
        </Pressable>
        <Pressable onPress={() => router.push(`/meter/${roll.id}`)} style={({ pressed }) => ({
          flex: 1, height: 40, borderRadius: 999, backgroundColor: c.safelight, alignItems: 'center', justifyContent: 'center',
          transform: [{ scale: pressed ? 0.97 : 1 }],
        })}>
          <Text style={{ color: '#fff', fontSize: 15, lineHeight: 20, fontWeight: '600', includeFontPadding: false }}>노출계</Text>
        </Pressable>
      </View>
      {dropOff ? <LabDropOff roll={roll} onClose={() => setDropOff(false)} /> : null}
    </View>
  )
}
