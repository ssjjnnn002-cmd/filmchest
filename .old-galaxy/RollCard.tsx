import { Pressable, Text, View } from 'react-native'
import { router } from 'expo-router'
import { filmById, filmDisplayName } from './films'
import type { Camera, Roll } from './db'
import { cameraName } from './db'
import { statusName } from './types'
import { Canister, fmtDay } from './ui'
import { useTheme } from './theme'

export function RollCard({ roll, camera }: { roll: Roll; camera?: Camera }) {
  const c = useTheme()
  const film = filmById(roll.filmId)
  const sub = [cameraName(camera, roll), roll.lensName, fmtDay(roll.loadedAt), roll.frameCount ? `${roll.frameCount}장` : ''].filter(Boolean).join(' · ')
  return (
    <Pressable onPress={() => router.push(`/roll/${roll.id}`)} style={({ pressed }) => ({
      backgroundColor: pressed ? c.sep : c.card, borderRadius: 22, padding: 14, flexDirection: 'row', gap: 12, alignItems: 'center',
    })}>
      <Canister film={film} format={camera?.format} size={64} />
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={{ color: c.ink, fontSize: 17, fontWeight: '700' }} numberOfLines={1}>{filmDisplayName(film)}</Text>
        <Text style={{ color: c.muted, fontSize: 13 }} numberOfLines={1}>{sub}</Text>
        <Text style={{ color: c.safelight, fontSize: 13, fontWeight: '600' }}>{statusName[roll.status]}</Text>
      </View>
    </Pressable>
  )
}
