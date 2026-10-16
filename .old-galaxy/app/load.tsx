import { useMemo, useState } from 'react'
import { Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { listCameras, listRolls, loadFilm, loadedRoll, patchRoll, useDb } from '../src/db'
import { allFilms, filmById, filmDisplayName, popularFilms } from '../src/films'
import { Canister } from '../src/ui'
import { Sheet, useToast } from '../src/chrome'
import { ModelView } from '../src/ModelView'
import { formatInfo, type FilmFormat } from '../src/types'
import { useTheme } from '../src/theme'

export default function Load() {
  useDb()
  const c = useTheme()
  const toast = useToast()
  const { width } = useWindowDimensions()
  const params = useLocalSearchParams<{ cameraId?: string }>()
  const cameras = listCameras()
  const rolls = listRolls()
  const emptyFirst = cameras.filter((camera) => !loadedRoll(camera.id))
  const busyFirst = cameras.filter((camera) => loadedRoll(camera.id))
  const ordered = params.cameraId
    ? [...cameras.filter((camera) => camera.id === params.cameraId), ...cameras.filter((camera) => camera.id !== params.cameraId)]
    : [...emptyFirst, ...busyFirst]
  const [cameraId, setCameraId] = useState(params.cameraId ?? ordered[0]?.id ?? '')
  const [filmId, setFilmId] = useState<string>()
  const [query, setQuery] = useState('')
  const [showAll, setShowAll] = useState(false)
  const [lensName, setLensName] = useState('')
  const camera = cameras.find((item) => item.id === cameraId)
  const current = camera ? loadedRoll(camera.id) : undefined

  const stocks = useMemo(() => {
    const fmt = camera?.format ?? '135'
    const same = (formats: FilmFormat[]) => fmt === '135-half'
      ? formats.includes('135')
      : formats.some((item) => formatInfo[item].is120 === formatInfo[fmt].is120)
    const recent = rolls.map((roll) => roll.filmId)
    const rank = (id: string) => [recent.indexOf(id) < 0 ? 1e9 : recent.indexOf(id), popularFilms.indexOf(id) < 0 ? 1e9 : popularFilms.indexOf(id)]
    return allFilms()
      .filter((film) => same(film.formats))
      .filter((film) => !query.trim() || filmDisplayName(film).toLowerCase().includes(query.trim().toLowerCase()))
      .sort((a, b) => rank(a.id)[0] - rank(b.id)[0] || rank(a.id)[1] - rank(b.id)[1])
  }, [camera?.format, query, rolls])

  const visible = useMemo(() => {
    if (showAll || query.trim()) return stocks
    const top = stocks.slice(0, 6)
    const chosen = filmById(filmId)
    if (chosen && !top.some((film) => film.id === chosen.id) && stocks.some((film) => film.id === chosen.id)) top[5] = chosen
    return top
  }, [stocks, showAll, query, filmId])

  const film = filmById(filmId)
  const cell = Math.floor((width - 32 - 16) / 3)
  const ready = !!camera && !!film && (!camera.mount || !!lensName.trim())

  const save = () => {
    if (!camera || !film || !ready) return
    if (current) patchRoll(current.id, { status: 'finished', finishedAt: Date.now() })
    const id = loadFilm({ cameraId: camera.id, filmId: film.id, lensName, shotISO: film.iso })
    if (!id) return
    toast('필름을 장착했어요')
    router.back()
  }

  return (
    <View style={{ flex: 1 }}>
      <Sheet tall title="필름 장착하기" onClose={() => router.back()} right="장착" rightDisabled={!ready} onRight={save}>
        <View style={{ gap: 8 }}>
          <Text style={{ color: c.muted, fontSize: 13, fontWeight: '600', paddingHorizontal: 4 }}>카메라</Text>
          {cameras.length === 0 ? <Text style={{ color: c.muted, fontSize: 13, paddingHorizontal: 16 }}>먼저 내 장비에서 카메라를 추가해 주세요.</Text> : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {ordered.map((item) => {
                const on = item.id === cameraId
                const inside = loadedRoll(item.id)
                return (
                  <Pressable key={item.id} onPress={() => { setCameraId(item.id); setLensName('') }} style={{
                    width: 116, borderRadius: 16, borderWidth: on ? 2 : 1, borderColor: on ? c.safelight : c.sep,
                    backgroundColor: on ? c.soft : c.cell, padding: on ? 7 : 8, alignItems: 'center', gap: 2,
                  }}>
                    <ModelView brand={item.brand} model={item.model} style={item.style} height={56} />
                    <Text numberOfLines={1} style={{ color: c.ink, fontSize: 12, maxWidth: '100%' }}>{item.brand} {item.model}</Text>
                    {inside ? <Text numberOfLines={1} style={{ color: c.safelight, fontSize: 12 }}>{filmDisplayName(filmById(inside.filmId))}</Text> : null}
                  </Pressable>
                )
              })}
            </ScrollView>
          )}
          {current ? <Text style={{ color: c.warn, fontSize: 13, paddingHorizontal: 16 }}>지금 장착된 필름은 '촬영 완료'로 바뀌어요.</Text> : null}
        </View>

        {camera?.mount ? (
          <View style={{ gap: 8 }}>
            <Text style={{ color: c.muted, fontSize: 13, fontWeight: '600', paddingHorizontal: 4 }}>렌즈 · {camera.mount}</Text>
            <TextInput value={lensName} onChangeText={setLensName} placeholder="끼운 렌즈" placeholderTextColor={c.faint}
              style={{ height: 52, borderRadius: 22, backgroundColor: c.cell, paddingHorizontal: 16, fontSize: 17, color: c.ink }} />
            {!lensName.trim() ? <Text style={{ color: c.warn, fontSize: 13, paddingHorizontal: 16 }}>끼운 렌즈를 골라 주세요. 중간에 바꿔 끼우면 롤 화면에서 기록할 수 있어요.</Text> : null}
          </View>
        ) : null}

        <View style={{ gap: 8 }}>
          <Text style={{ color: c.muted, fontSize: 13, fontWeight: '600', paddingHorizontal: 4 }}>{showAll ? '필름' : '필름 · 최근 사용'}</Text>
          <View style={{ backgroundColor: c.cell, borderRadius: 22, overflow: 'hidden' }}>
            {showAll ? (
              <TextInput value={query} onChangeText={setQuery} placeholder="필름 검색" placeholderTextColor={c.faint}
                style={{ height: 52, paddingHorizontal: 16, fontSize: 17, color: c.ink, borderBottomWidth: 0.5, borderBottomColor: c.sep }} />
            ) : null}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', padding: 8 }}>
              {visible.map((item) => {
                const on = item.id === filmId
                return (
                  <Pressable key={item.id} onPress={() => setFilmId(item.id)} style={{ width: cell, alignItems: 'center', gap: 2, padding: 4, borderRadius: 16, borderWidth: 2, borderColor: on ? c.safelight : 'transparent', backgroundColor: on ? c.soft : 'transparent' }}>
                    <Canister film={item} format={camera?.format} size={84} />
                    <Text style={{ color: c.ink, fontSize: 12, textAlign: 'center', lineHeight: 15 }} numberOfLines={2}>{filmDisplayName(item)}</Text>
                  </Pressable>
                )
              })}
            </View>
            <Pressable onPress={() => { setShowAll((value) => !value); setQuery('') }} style={{ height: 52, alignItems: 'center', justifyContent: 'center', borderTopWidth: 0.5, borderTopColor: c.sep }}>
              <Text style={{ color: c.safelight, fontSize: 17 }}>{showAll ? '접기' : `더보기 (${stocks.length}종)`}</Text>
            </Pressable>
          </View>
        </View>
      </Sheet>
    </View>
  )
}
