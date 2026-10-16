import { useState } from 'react'
import { Pressable, Text, useWindowDimensions, View } from 'react-native'
import { router } from 'expo-router'
import { cameraName, getPref, listCameras, loadedRoll, setPref, useDb } from '../../src/db'
import { filmById, filmDisplayName } from '../../src/films'
import { Icon } from '../../src/icons'
import { ModelView } from '../../src/ModelView'
import { formatInfo } from '../../src/types'
import { Canister, Empty, GlassButton, Screen } from '../../src/ui'
import { useTheme } from '../../src/theme'

export default function Library() {
  useDb()
  const c = useTheme()
  const { width } = useWindowDimensions()
  const [layout, setLayout] = useState(getPref('libraryLayout', 'grid'))
  const cameras = listCameras()
  const cardWidth = (width - 32 - 14) / 2
  const toggle = () => {
    const next = layout === 'grid' ? 'list' : 'grid'
    setLayout(next)
    setPref('libraryLayout', next)
  }
  return (
    <Screen
      large
      title="내 장비"
      left={<GlassButton label="설정" onPress={() => router.push('/settings')}><Icon name="gear" size={22} color={c.safelight} /></GlassButton>}
      right={(
        <View style={{ height: 44, borderRadius: 22, paddingHorizontal: 4, flexDirection: 'row', alignItems: 'center', borderWidth: 0.5, borderColor: c.glassLine, backgroundColor: c.glass }}>
          <Pressable accessibilityLabel={layout === 'grid' ? '목록으로 보기' : '그리드로 보기'} onPress={toggle} style={({ pressed }) => ({ width: 48, height: 44, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.5 : 1 })}>
            <Icon name={layout === 'grid' ? 'list' : 'grid'} size={23} color={c.safelight} />
          </Pressable>
          <Pressable accessibilityLabel="카메라 추가" onPress={() => router.push('/camera/new')} style={({ pressed }) => ({ width: 48, height: 44, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.5 : 1 })}>
            <Icon name="plus" size={23} color={c.safelight} />
          </Pressable>
        </View>
      )}
    >
      {cameras.length > 0 ? (
      <Pressable onPress={() => router.push('/load')} style={({ pressed }) => ({
        backgroundColor: c.safelight, borderRadius: 22, paddingVertical: 14, paddingHorizontal: 18,
        flexDirection: 'row', alignItems: 'center', gap: 14, transform: [{ scale: pressed ? 0.98 : 1 }],
      })}>
        <Canister film={filmById('kodak-portra-400')} size={48} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#fff', fontSize: 19, fontWeight: '600' }}>필름 장착하기</Text>
          <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 14, marginTop: 2 }}>
            {cameras.filter((camera) => !loadedRoll(camera.id)).length > 0
              ? `빈 카메라 ${cameras.filter((camera) => !loadedRoll(camera.id)).length}대`
              : '모든 카메라에 필름이 들어 있어요'}
          </Text>
        </View>
        <Icon name="right" size={20} color="#fff" />
      </Pressable>
      ) : null}

      {cameras.length === 0 ? (
        <Empty icon="camera.fill" title="카메라가 없어요" detail="가진 카메라를 등록해 보세요." action="카메라 추가" onPress={() => router.push('/camera/new')} />
      ) : layout === 'grid' ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
          {cameras.map((camera) => {
            const roll = loadedRoll(camera.id)
            const film = filmById(roll?.filmId)
            return (
              <Pressable key={camera.id} onPress={() => router.push(`/camera/${camera.id}`)} style={({ pressed }) => ({
                width: cardWidth, backgroundColor: c.card, borderRadius: 22, padding: 16, gap: 10,
                transform: [{ scale: pressed ? 0.975 : 1 }],
              })}>
                <View style={{ height: 110, alignItems: 'center', justifyContent: 'center' }}>
                  <ModelView brand={camera.brand} model={camera.model} style={camera.style} />
                </View>
                <View>
                  <Text style={{ color: c.ink, fontSize: 19, fontWeight: '700' }} numberOfLines={1}>{camera.model}</Text>
                  <Text style={{ color: c.muted, fontSize: 15, marginTop: 1 }}>{camera.brand}</Text>
                </View>
                <View style={{ height: 0.5, backgroundColor: c.sep }} />
                {roll ? (
                  <Pressable onPress={() => router.push(`/roll/${roll.id}`)} style={{ height: 36, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Canister film={film} format={camera.format} size={36} />
                    <Text style={{ color: c.safelight, fontWeight: '600', flex: 1 }} numberOfLines={1}>{filmDisplayName(film)}</Text>
                  </Pressable>
                ) : (
                  <Pressable onPress={() => router.push(`/load?cameraId=${camera.id}`)} style={{
                    height: 36, borderRadius: 18, backgroundColor: c.soft, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 4,
                  }}>
                    <Icon name="plus" size={16} color={c.safelight} />
                    <Text style={{ color: c.safelight, fontWeight: '600', fontSize: 15 }}>필름 장착</Text>
                  </Pressable>
                )}
              </Pressable>
            )
          })}
        </View>
      ) : (
        <View style={{ backgroundColor: c.cell, borderRadius: 22, overflow: 'hidden' }}>
          {cameras.map((camera, i) => {
            const roll = loadedRoll(camera.id)
            return (
              <Pressable key={camera.id} onPress={() => router.push(`/camera/${camera.id}`)} style={{
                minHeight: 72, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12,
                borderTopWidth: i ? 0.5 : 0, borderTopColor: c.sep,
              }}>
                <View style={{ width: 78, height: 50, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
                  <ModelView brand={camera.brand} model={camera.model} style={camera.style} height={50} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c.ink, fontSize: 17, fontWeight: '600' }}>{cameraName(camera)}</Text>
                  <Text style={{ color: roll ? c.safelight : c.muted, marginTop: 2 }}>
                    {roll ? filmDisplayName(filmById(roll.filmId)) : `${formatInfo[camera.format].name} · 비어 있음`}
                  </Text>
                </View>
                <Icon name="chev" size={18} color={c.faint} />
              </Pressable>
            )
          })}
        </View>
      )}
    </Screen>
  )
}
