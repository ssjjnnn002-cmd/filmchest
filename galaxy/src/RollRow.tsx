// 웹 ui/RollRow.tsx
import { Image, Pressable, Text, View } from 'react-native'
import { db } from './data'
import { useLiveQuery } from './store'
import type { Roll } from './core/types'
import { formatInfo } from './core/types'
import { cameraName, dateRangeText, rollCameraFormat, rollFilm, rollFilmName, sortedLocations } from './core/display'
import { Canister, StatusBadge, Sub } from './kit'
import { useTheme } from './theme'
import { TagLine } from './gearExtras'

export function RollRow({ roll }: { roll: Roll }) {
  const c = useTheme()
  const camera = useLiveQuery(() => (roll.cameraId ? db.cameras.get(roll.cameraId) : undefined), [roll.cameraId])
  const places = sortedLocations(roll).map((l) => l.name).filter(Boolean).join(', ')
  return (
    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14, minWidth: 0 }}>
      <Canister film={rollFilm(roll)} format={rollCameraFormat(camera, roll)} size={48} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: 17, fontWeight: '600', color: c.ink }}>{rollFilmName(roll)}</Text>
          <StatusBadge status={roll.status} />
          {roll.favorite ? <Text style={{ color: '#F5B700' }}>★</Text> : null}
        </View>
        <Sub lines={1}>{[cameraName(camera, roll), dateRangeText(roll)].join(' · ')}</Sub>
        <Sub lines={1}>{places || ' '}</Sub>
        <TagLine tags={roll.tags} />
      </View>
    </View>
  )
}

export function RollCard({ roll, onPress }: { roll: Roll; onPress: () => void }) {
  const c = useTheme()
  const camera = useLiveQuery(() => (roll.cameraId ? db.cameras.get(roll.cameraId) : undefined), [roll.cameraId])
  const first = useLiveQuery(() => db.frames.where('rollId').equals(roll.id).filter((f) => f.index === (roll.coverIndex ?? 1)).first(), [roll.id, roll.coverIndex])
  const format = rollCameraFormat(camera, roll)
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ flex: 1, minWidth: 0, backgroundColor: c.cell, borderRadius: 18, padding: 10, gap: 8,
      shadowColor: '#28201a', shadowOpacity: 0.06, shadowRadius: 20, shadowOffset: { width: 0, height: 6 }, elevation: 1, transform: [{ scale: pressed ? 0.98 : 1 }] })}>
      <View style={{ height: 110, borderRadius: 12, backgroundColor: c.filmBase, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
        {first?.thumb ? <Image source={{ uri: first.thumb }} style={{ width: '100%', height: '100%' }} resizeMode="cover" /> : <Canister film={rollFilm(roll)} format={format} size={84} />}
        {roll.favorite ? <Text style={{ position: 'absolute', top: 5, right: 6, color: '#F5B700', fontSize: 13 }}>★</Text> : null}
      </View>
      <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', minWidth: 0 }}>
        <Text numberOfLines={1} style={{ flex: 1, fontSize: 17, fontWeight: '700', color: c.ink }}>{rollFilmName(roll)}</Text>
        <StatusBadge status={roll.status} />
      </View>
      <Sub lines={1}>{cameraName(camera, roll)}</Sub>
      <Sub lines={1}>{dateRangeText(roll)}{formatInfo[format].is120 ? ` · ${formatInfo[format].name}` : ''}</Sub>
      <TagLine tags={roll.tags} />
    </Pressable>
  )
}
