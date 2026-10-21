// 웹 pages/LoadFilm.tsx
import { useEffect, useMemo, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { db, kept } from '../data'
import { useLiveQuery } from '../store'
import type { Roll } from '../core/types'
import { formatInfo, uid } from '../core/types'
import { allFilms, filmById, filmDisplayName, popularFilms } from '../core/films'
import { lensesFor } from '../core/lenses'
import { Btn, CameraCover, Canister, Chip, DateInput, Field, Footnote, Group, Row, Section, Select, Toggle } from '../kit'
import { Sheet, SheetBtn } from '../overlay'
import { currentPlace, locationAvailable, weatherAt } from '../platform'
import { useTheme } from '../theme'
import { CustomFilmEdit } from './CustomFilmEdit'

export function LoadFilm({ initialCameraId, onClose }: { initialCameraId?: string; onClose: (loaded?: Roll) => void }) {
  const c = useTheme()
  const cameras = useLiveQuery(() => db.cameras.orderBy('sortOrder').filter((x) => !x.deletedAt).toArray(), [])
  const rollsLoaded = useLiveQuery(() => db.rolls.orderBy('loadedAt').reverse().toArray(), [])
  const rolls = rollsLoaded ?? []
  const allLenses = useLiveQuery(() => db.lenses.toArray(), []) ?? []
  const [cameraId, setCameraId] = useState(initialCameraId)
  const [filmId, setFilmId] = useState<string>()
  const [showAll, setShowAll] = useState(false)
  const [search, setSearch] = useState('')
  const [lensId, setLensId] = useState('')
  const [newLens, setNewLens] = useState('')
  const [push, setPush] = useState(0)
  const [today, setToday] = useState(true)
  const [startAt, setStartAt] = useState(Date.now())
  const isToday = new Date(startAt).toDateString() === new Date().toDateString()
  // 내가 만든 필름 (바뀌면 다시 그리도록)
  const customRows = useLiveQuery(() => db.customFilms.toArray(), []) ?? []
  const [customEdit, setCustomEdit] = useState<string | 'new' | null>(null)

  // 필름이 없는 카메라를 앞에, 처음 고른 카메라는 맨 앞에
  const isLoaded = (id: string) => rolls.some((r) => r.cameraId === id && r.status === 'loaded')
  const pickOrder = useMemo(() => {
    const list = cameras ?? []
    if (initialCameraId) return [...list.filter((x) => x.id === initialCameraId), ...list.filter((x) => x.id !== initialCameraId)]
    return [...list.filter((x) => !isLoaded(x.id)), ...list.filter((x) => isLoaded(x.id))]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameras, rollsLoaded, initialCameraId])

  // 롤 기록까지 읽은 뒤에 기본 카메라를 고른다 (먼저 고르면 이미 장착된 카메라가 잡힌다)
  useEffect(() => {
    if (cameraId || !cameras?.length || !rollsLoaded) return
    setCameraId(pickOrder[0].id)
  }, [cameras, rollsLoaded, cameraId, pickOrder])

  const camera = cameras?.find((x) => x.id === cameraId)

  // 렌즈 교환식이면 그 카메라에 지난번 끼웠던 렌즈를 미리 고른다
  useEffect(() => {
    if (!camera?.mount || !rollsLoaded) return
    const last = rollsLoaded.find((r) => r.cameraId === camera.id && (r.lensChanges?.length || r.lensId))
    const lastLens = last ? ([...(last.lensChanges ?? [])].sort((a, b) => b.startFrame - a.startFrame)[0]?.lensId ?? last.lensId) : undefined
    setLensId(lastLens && allLenses.some((l) => l.id === lastLens) ? lastLens : '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera?.id, !!rollsLoaded, allLenses.length])
  const loaded = rolls.find((r) => kept(r) && r.cameraId === cameraId && r.status === 'loaded')
  const mountLenses = camera?.mount ? allLenses.filter((l) => l.mount.toLowerCase() === camera.mount!.toLowerCase()) : []
  const film = filmById(filmId)

  // 최근 쓴 순 → 기록이 없으면 많이 쓰는 필름 순
  const stocks = useMemo(() => {
    const fmt = camera?.format ?? '135'
    const recent = rolls.map((r) => r.filmId)
    const rank = (id: string) => [recent.indexOf(id) < 0 ? 1e9 : recent.indexOf(id), popularFilms.indexOf(id) < 0 ? 1e9 : popularFilms.indexOf(id)]
    return allFilms()
      .filter((f) => (fmt === '135-half' ? f.formats.includes('135') : f.formats.some((x) => formatInfo[x].is120 === formatInfo[fmt].is120)))
      .filter((f) => !search || filmDisplayName(f).toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => { const ra = rank(a.id), rb = rank(b.id); return ra[0] - rb[0] || ra[1] - rb[1] })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera, rolls, search, customRows])

  const visible = useMemo(() => {
    if (showAll) return stocks
    const top = stocks.slice(0, 6)
    if (film && !top.includes(film) && stocks.includes(film)) top[5] = film
    return top
  }, [stocks, showAll, film])

  // 렌즈 교환식 카메라는 렌즈를 골라야 장착할 수 있다
  const lensReady = !camera?.mount || (lensId === '__new' ? !!newLens.trim() : !!lensId)
  const shotISO = film && push !== 0 ? Math.round(film.iso * 2 ** push) : undefined

  const load = async () => {
    if (!camera || !film) return
    let lens = mountLenses.find((l) => l.id === lensId)
    if (!lens && newLens.trim() && camera.mount) {
      lens = { id: uid(), brand: camera.brand, model: newLens.trim(), mount: camera.mount, createdAt: Date.now() }
      await db.lenses.add(lens)
    }
    if (loaded) await db.rolls.update(loaded.id, { status: 'finished', finishedAt: Date.now() })
    const now = Date.now()
    const start = isToday ? now : startAt
    const roll: Roll = {
      id: uid(), cameraId: camera.id, cameraBrand: camera.brand, cameraModel: camera.model, cameraFormat: camera.format, cameraFixedLens: camera.fixedLens,
      lensId: lens?.id, filmId: film.id, shotISO, status: 'loaded', loadedAt: today ? start : now,
      days: today ? [{ id: uid(), startedAt: start, startFrame: 1 }] : [], locations: [], favorite: false, isArchive: false,
    }
    await db.rolls.add(roll)
    onClose(roll)
    // 위치는 창을 닫은 뒤 채운다
    if (today && isToday && locationAvailable()) {
      const place = await currentPlace()
      if (place) await db.rolls.update(roll.id, { locations: [{ id: uid(), startFrame: 1, name: place.name, point: place.point, weather: weatherAt(place.point) }] })
    }
  }

  // .film-grid: minmax(96px, 1fr), 안쪽 여백 10, 틈 6
  const [gridW, setGridW] = useState(0)
  const cols = Math.max(1, Math.floor((gridW - 20 + 6) / (96 + 6)))
  const cellW = gridW ? (gridW - 20 - 6 * (cols - 1)) / cols : 96

  return (
    <Sheet title="필름 장착하기" onClose={() => onClose()}
      right={<SheetBtn label="장착" accent disabled={!camera || !film || !lensReady} onPress={load} />}>
      <Section title="카메라" foot={loaded ? "지금 장착된 필름은 '촬영 완료'로 바뀌어요." : undefined} warn>
        {cameras?.length === 0 ? <Footnote>먼저 내 장비에서 카메라를 추가해 주세요.</Footnote> : null}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 2, paddingTop: 2, paddingBottom: 4 }}>
          {pickOrder.map((x) => {
            const inUse = rolls.find((r) => r.cameraId === x.id && r.status === 'loaded')
            const on = x.id === cameraId
            return (
              <Pressable key={x.id} onPress={() => { setCameraId(x.id); setLensId('') }} style={({ pressed }) => ({
                width: 116, borderRadius: 16, backgroundColor: on ? c.soft : c.cell, borderWidth: on ? 2 : 1, borderColor: on ? c.safelight : c.sep,
                paddingVertical: on ? 7 : 8, paddingHorizontal: on ? 5 : 6, alignItems: 'center', gap: 2, transform: [{ scale: pressed ? 0.975 : 1 }],
              })}>
                <CameraCover camera={x} height={56} />
                <Text numberOfLines={1} style={{ fontSize: 12, color: c.ink, maxWidth: '100%' }}>{x.brand} {x.model}</Text>
                {inUse ? <Text numberOfLines={1} style={{ fontSize: 12, color: c.safelight, maxWidth: '100%' }}>{filmDisplayName(filmById(inUse.filmId))}</Text> : null}
              </Pressable>
            )
          })}
        </ScrollView>
      </Section>

      {camera?.mount ? (
        <Section title={`렌즈 · ${camera.mount}`} foot={!lensReady ? '끼운 렌즈를 골라 주세요. 중간에 바꿔 끼우면 롤 화면에서 기록할 수 있어요.' : undefined} warn>
          <Group>
            <Field label="렌즈">
              {lensId === '' ? (
                <Select value={'' as string} title="렌즈" onChange={setLensId}
                  options={[['', '렌즈 고르기'], ...mountLenses.map((l): [string, string] => [l.id, `${l.brand} ${l.model}`]), ['__new', '새 렌즈 추가…']]} />
              ) : (
                <Select value={lensId} title="렌즈" onChange={setLensId}
                  options={[...mountLenses.map((l): [string, string] => [l.id, `${l.brand} ${l.model}`]), ['__new', '새 렌즈 추가…']]} />
              )}
            </Field>
            {lensId === '__new' ? [
              <Field key="new" label="새 렌즈" value={newLens} onChangeText={setNewLens} autoCorrect={false} />,
              <ScrollView key="suggest" horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="always" contentContainerStyle={{ gap: 6, paddingHorizontal: 18, paddingBottom: 12 }}>
                {lensesFor(camera.mount, newLens).slice(0, 8).map((l) => <Chip key={l} label={l} flat onPress={() => setNewLens(l)} />)}
              </ScrollView>,
            ] : null}
          </Group>
        </Section>
      ) : null}

      <Section title={showAll ? '필름' : '필름 · 최근 사용'}>
        <Group>
          {showAll ? <Field label="필름 검색" value={search} onChangeText={setSearch} /> : null}
          <View onLayout={(e) => setGridW(e.nativeEvent.layout.width)} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, padding: 10 }}>
            {visible.map((f) => {
              const on = f.id === filmId
              return (
                <Pressable key={f.id} onPress={() => setFilmId(f.id)} style={({ pressed }) => ({
                  width: cellW, borderWidth: 2, borderColor: on ? c.safelight : 'transparent', backgroundColor: on ? c.soft : 'transparent',
                  borderRadius: 16, paddingVertical: 6, paddingHorizontal: 4, alignItems: 'center', gap: 2, transform: [{ scale: pressed ? 0.975 : 1 }],
                })}>
                  <Canister film={f} format={camera?.format} size={84} />
                  <Text style={{ fontSize: 12, lineHeight: 15, textAlign: 'center', color: c.ink }}>{filmDisplayName(f)}</Text>
                </Pressable>
              )
            })}
            <Pressable onPress={() => setCustomEdit('new')} style={{ width: cellW, borderRadius: 16, paddingVertical: 6, paddingHorizontal: 4, alignItems: 'center', gap: 2 }}>
              <View style={{ width: 84, height: 84, borderRadius: 18, borderWidth: 1.5, borderStyle: 'dashed', borderColor: `${c.safelight}8C`, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 34, fontWeight: '300', color: c.safelight }}>+</Text>
              </View>
              <Text style={{ fontSize: 12, fontWeight: '600', color: c.safelight }}>직접 추가</Text>
            </Pressable>
          </View>
          {film?.id.startsWith('custom-') ? (
            <Row onPress={() => setCustomEdit(film.id)} style={{ justifyContent: 'center' }}>
              <Text style={{ fontSize: 17, color: c.safelight }}>{filmDisplayName(film)} 수정</Text>
            </Row>
          ) : null}
          <Row onPress={() => { setShowAll(!showAll); setSearch('') }} style={{ justifyContent: 'center' }}>
            <Text style={{ fontSize: 17, color: c.safelight }}>{showAll ? '접기' : `더보기 (${stocks.length}종)`}</Text>
          </Row>
        </Group>
      </Section>

      {film ? (
        <Section foot={today && isToday ? (locationAvailable() ? '지금 시각과 현재 위치를 첫 촬영일로 기록해요.' : '지금 시각을 첫 촬영일로 기록해요. 장소는 롤 화면에서 넣을 수 있어요.') : undefined}>
          <Group>
            <View style={{ minHeight: 52, paddingVertical: 10, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <Text style={{ fontSize: 17, color: c.ink }}>감도</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Btn label="−" size="small" onPress={() => setPush(Math.max(-2, push - 1))} />
                <Text style={{ minWidth: 110, textAlign: 'center', fontSize: 17, fontWeight: '700', color: c.ink, fontVariant: ['tabular-nums'] }}>
                  ISO {shotISO ?? film.iso}{push !== 0 ? ` (${push > 0 ? '+' : ''}${push})` : ''}
                </Text>
                <Btn label="+" size="small" onPress={() => setPush(Math.min(3, push + 1))} />
              </View>
            </View>
            <Toggle label="첫 촬영일 추가" value={today} onChange={setToday} />
            {today ? <Field label="날짜"><DateInput value={startAt} max={Date.now()} onChange={setStartAt} /></Field> : null}
          </Group>
        </Section>
      ) : null}
      {customEdit ? (
        <CustomFilmEdit row={customEdit === 'new' ? undefined : customRows.find((r) => r.id === customEdit)}
          onClose={(saved) => { setCustomEdit(null); if (saved !== undefined) setFilmId(saved || undefined) }} />
      ) : null}
    </Sheet>
  )
}
