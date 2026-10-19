// 웹 pages/Shooting.tsx
import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { db, kept } from '../data'
import { useLiveQuery } from '../store'
import { useNav } from '../App'
import type { Roll } from '../core/types'
import { cameraName, fmtDay, rollCameraFormat, rollFilm, rollFilmName, sortedLocations } from '../core/display'
import { Btn, CameraCover, Canister, Empty, Skeleton, Sub } from '../kit'
import { Icon } from '../icons'
import { GlassBtn, Page } from '../page'
import { useTheme } from '../theme'
import { LabDropOff, PlaceEdit } from './Editors'
import { Meter } from './Meter'
import { features } from '../core/features'

export function Shooting() {
  const nav = useNav()
  const rolls = useLiveQuery(async () => (await db.rolls.where('status').equals('loaded').reverse().sortBy('loadedAt')).filter(kept), [])
  return (
    <Page title="촬영 중" actions={<GlassBtn icon="plus" label="필름 장착하기" onPress={() => nav.loadFilm()} />}>
      {rolls === undefined ? <Skeleton height={160} /> : null}
      {rolls?.length === 0 ? (
        <Empty icon="film" title="장착된 필름이 없어요">
          <Btn label="필름 장착하기" kind="primary" onPress={() => nav.loadFilm()} />
        </Empty>
      ) : null}
      <View style={{ gap: 12 }}>
        {rolls?.map((r) => <LoadedCard key={r.id} roll={r} />)}
      </View>
    </Page>
  )
}

function LoadedCard({ roll }: { roll: Roll }) {
  const c = useTheme()
  const nav = useNav()
  const camera = useLiveQuery(() => (roll.cameraId ? db.cameras.get(roll.cameraId) : undefined), [roll.cameraId])
  const [placing, setPlacing] = useState(false)
  const [dropOff, setDropOff] = useState(false)
  const [meter, setMeter] = useState(false)
  const places = sortedLocations(roll).map((l) => l.name).filter(Boolean).join(' → ')
  return (
    <View style={{ backgroundColor: c.card, borderRadius: 22, overflow: 'hidden',
      shadowColor: '#28201a', shadowOpacity: c.dark ? 0.4 : 0.06, shadowRadius: 20, shadowOffset: { width: 0, height: 6 }, elevation: 1 }}>
      <Pressable onPress={() => nav.push({ type: 'roll', id: roll.id })} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, opacity: pressed ? 0.85 : 1 })}>
        <View style={{ width: 96 }}>
          {camera ? <CameraCover camera={camera} height={72} /> : <View style={{ height: 72 }} />}
          <View style={{ position: 'absolute', right: -6, bottom: -8 }}><Canister film={rollFilm(roll)} format={rollCameraFormat(camera, roll)} size={44} /></View>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ fontSize: 18, fontWeight: '700', color: c.ink }}>{cameraName(camera, roll)}</Text>
          <Text numberOfLines={1} style={{ color: c.safelight, fontSize: 15, fontWeight: '600' }}>{rollFilmName(roll)}{roll.shotISO ? ` @ ${roll.shotISO}` : ''}</Text>
          <Sub>{fmtDay(roll.loadedAt)} 장착 · 촬영일 {roll.days.length}일</Sub>
          {places ? <Sub lines={1}>{places}</Sub> : null}
        </View>
        <Icon name="chev" size={18} color={c.faint} />
      </Pressable>
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 16 }}>
        {roll.locations.length === 0 ? <View style={{ flex: 1 }}><Btn label="장소 추가" icon="pin" kind="soft" block onPress={() => setPlacing(true)} /></View> : null}
        <View style={{ flex: 1 }}><Btn label="촬영 끝내기" kind={features.meter ? 'soft' : 'primary'} block onPress={() => setDropOff(true)} /></View>
        {features.meter ? <View style={{ flex: 1 }}><Btn label="노출계" kind="primary" block onPress={() => setMeter(true)} /></View> : null}
      </View>
      {placing ? <PlaceEdit roll={roll} onClose={() => setPlacing(false)} /> : null}
      {dropOff ? <LabDropOff roll={roll} onClose={() => setDropOff(false)} /> : null}
      {meter ? <Meter roll={roll} onClose={() => setMeter(false)} onEnd={() => { setMeter(false); setDropOff(true) }} /> : null}
    </View>
  )
}
