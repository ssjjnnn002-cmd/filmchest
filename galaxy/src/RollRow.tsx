// 웹 ui/RollRow.tsx
import { Image, Pressable, Text, View } from 'react-native'
import { db } from './data'
import { useLiveQuery } from './store'
import type { Roll } from './core/types'
import { formatInfo } from './core/types'
import { cameraName, dateRangeText, rollCameraFormat, rollFilm, rollFilmName, rollName, showRollMemo, sortedLocations } from './core/display'
import { Canister, StatusBadge, Sub } from './kit'
import { useTheme } from './theme'
import { TagLine } from './gearExtras'

export function RollRow({ roll }: { roll: Roll }) {
  const c = useTheme()
  const camera = useLiveQuery(() => (roll.cameraId ? db.cameras.get(roll.cameraId) : undefined), [roll.cameraId])
  const places = sortedLocations(roll).map((l) => l.name).filter(Boolean).join(', ')
  const cover = useCoverFrame(roll)
  return (
    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14, minWidth: 0 }}>
      {/* 스캔이 있으면 대표 사진, 없으면 필름통 (웹과 같음) */}
      {/* 바둑판형 표지와 같은 가로 비율. 필름통도 같은 폭 칸에 두어 글 시작이 맞는다 */}
      <View style={{ width: 84, height: 56, alignItems: 'center', justifyContent: 'center' }}>
        {cover?.thumb ? <Image source={{ uri: cover.thumb }} style={{ width: 84, height: 56, borderRadius: 10, backgroundColor: c.filmBase }} resizeMode="cover" />
          : <Canister film={rollFilm(roll)} format={rollCameraFormat(camera, roll)} size={52} />}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: 17, fontWeight: '600', color: c.ink }}>{rollName(roll)}</Text>
          <StatusBadge status={roll.status} />
          {roll.favorite ? <Text style={{ color: '#F5B700' }}>★</Text> : null}
        </View>
        {/* 제목을 붙였으면 필름 이름은 아래 줄에 (웹과 같음) */}
        <Sub lines={1}>{[roll.title?.trim() ? rollFilmName(roll) : undefined, cameraName(camera, roll), dateRangeText(roll)].filter(Boolean).join(' · ')}</Sub>
        <Sub lines={1}>{places || ' '}</Sub>
        {showRollMemo() && roll.note?.trim() ? <Sub lines={1}>{roll.note.trim()}</Sub> : null}
        <TagLine tags={roll.tags} />
      </View>
    </View>
  )
}

export function RollCard({ roll, onPress }: { roll: Roll; onPress: () => void }) {
  const c = useTheme()
  const camera = useLiveQuery(() => (roll.cameraId ? db.cameras.get(roll.cameraId) : undefined), [roll.cameraId])
  const first = useCoverFrame(roll)
  const format = rollCameraFormat(camera, roll)
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ flex: 1, minWidth: 0, backgroundColor: c.cell, borderRadius: 18, padding: 10, gap: 8,
      shadowColor: '#28201a', shadowOpacity: 0.06, shadowRadius: 20, shadowOffset: { width: 0, height: 6 }, elevation: 1, transform: [{ scale: pressed ? 0.98 : 1 }] })}>
      <View style={{ height: 110, borderRadius: 12, backgroundColor: c.filmBase, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
        {first?.thumb ? <Image source={{ uri: first.thumb }} style={{ width: '100%', height: '100%' }} resizeMode="cover" /> : <Canister film={rollFilm(roll)} format={format} size={84} />}
        {roll.favorite ? <Text style={{ position: 'absolute', top: 5, right: 6, color: '#F5B700', fontSize: 13 }}>★</Text> : null}
      </View>
      <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', minWidth: 0 }}>
        <Text numberOfLines={1} style={{ flex: 1, fontSize: 17, fontWeight: '700', color: c.ink }}>{rollName(roll)}</Text>
        <StatusBadge status={roll.status} />
      </View>
      <Sub lines={1}>{[roll.title?.trim() ? rollFilmName(roll) : undefined, cameraName(camera, roll)].filter(Boolean).join(' · ')}</Sub>
      <Sub lines={1}>{dateRangeText(roll)}{formatInfo[format].is120 ? ` · ${formatInfo[format].name}` : ''}</Sub>
      {/* 목록형과 같이 장소 (웹과 같음) */}
      <Sub lines={1}>{sortedLocations(roll).map((l) => l.name).filter(Boolean).join(', ') || ' '}</Sub>
      {showRollMemo() && roll.note?.trim() ? <Sub lines={1}>{roll.note.trim()}</Sub> : null}
      <TagLine tags={roll.tags} />
    </Pressable>
  )
}

/** 대표 사진, 없으면 첫 컷 (웹과 같음) */
function useCoverFrame(roll: Roll) {
  return useLiveQuery(async () => {
    const list = (await db.frames.where('rollId').equals(roll.id).toArray()).sort((a, b) => a.index - b.index)
    return list.find((f) => f.index === (roll.coverIndex ?? 1)) ?? list.find((f) => f.index >= 1) ?? list[0]
  }, [roll.id, roll.coverIndex])
}
