// 웹 pages/LoadFilm.tsx
import { useEffect, useMemo, useRef, useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import { Text } from '../text'
import { db, kept } from '../data'
import { getPref, useLiveQuery } from '../store'
import { FilmPicker } from '../FilmPickGrid'
import type { Roll } from '../core/types'
import { formatInfo, uid } from '../core/types'
import { allFilms, filmById, filmDisplayName, popularFilms } from '../core/films'
import { hasExpiredLot, lotToUse, stockCount } from '../core/filmStock'
import { lensesFor } from '../core/lenses'
import { Btn, CameraCover, Canister, Chip, DateInput, Field, Footnote, Group, Row, RowText, Section, Select, Toggle } from '../kit'
import { Confirm, Sheet, SheetBtn } from '../overlay'
import { currentPlace, locationAvailable, weatherAt } from '../platform'
import { useTheme } from '../theme'
import { Icon } from '../icons'
import { CameraEdit } from './CameraEdit'
import { CustomFilmEdit } from './CustomFilmEdit'
import { FREE_ROLLS_PER_MONTH, canLoadRoll, isPremium, loadsThisMonth, noteRollLoaded, premiumGateOn, rollLimitText } from '../core/premium'

export function LoadFilm({ initialCameraId, onClose }: { initialCameraId?: string; onClose: (loaded?: Roll) => void }) {
  const c = useTheme()
  const cameras = useLiveQuery(() => db.cameras.orderBy('sortOrder').filter((x) => !x.deletedAt).toArray(), [])
  const rollsLoaded = useLiveQuery(() => db.rolls.orderBy('loadedAt').reverse().toArray(), [])
  const rolls = rollsLoaded ?? []
  const allLenses = useLiveQuery(() => db.lenses.toArray(), []) ?? []
  const [cameraId, setCameraId] = useState(initialCameraId)
  const [filmId, setFilmId] = useState<string>()
  const [lensId, setLensId] = useState('')
  const [newLens, setNewLens] = useState('')
  const [push, setPush] = useState(0)
  const [today, setToday] = useState(true)
  const [startAt, setStartAt] = useState(Date.now())
  const isToday = new Date(startAt).toDateString() === new Date().toDateString()
  // 내가 만든 필름 (바뀌면 다시 그리도록)
  const customRows = useLiveQuery(() => db.customFilms.toArray(), []) ?? []
  const [customEdit, setCustomEdit] = useState<string | 'new' | null>(null)

  // 최근에 쓴 카메라 순서 (쓴 적 없으면 장비 순서), 지금 필름이 들어 있는 카메라는 맨 오른쪽 (웹·아이폰과 같음)
  const isLoaded = (id: string) => rolls.some((r) => r.cameraId === id && r.status === 'loaded' && !r.deletedAt)
  const pickOrder = useMemo(() => {
    const recent = (id: string) => { const i = rolls.findIndex((r) => r.cameraId === id && !r.deletedAt); return i < 0 ? Infinity : i }
    const list = (cameras ?? []).map((x, i) => ({ x, i })).sort((a, b) => recent(a.x.id) - recent(b.x.id) || a.i - b.i).map((v) => v.x)
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
  // 재고에 유통기한이 지난 이 필름이 있으면 장착 전에 한 번 묻는다 (아이폰과 같게)
  const lots = useLiveQuery(() => db.filmLots.toArray(), []) ?? []
  const expired = !!film && hasExpiredLot(lots, film.id)
  const stock = film ? stockCount(lots, film.id) : 0
  const [confirmExpired, setConfirmExpired] = useState(false)
  const [addingCamera, setAddingCamera] = useState(false)

  // 렌즈 교환식 카메라는 렌즈를 골라야 장착할 수 있다
  const lensReady = !camera?.mount || (lensId === '__new' ? !!newLens.trim() : !!lensId)
  const shotISO = film && push !== 0 ? Math.round(film.iso * 2 ** push) : undefined

  // '장착'을 빠르게 여러 번 눌러도 롤은 하나만 만든다
  const loading = useRef(false)
  const load = async () => {
    if (!camera || !film || loading.current) return
    loading.current = true
    try {
      // 무료는 달마다 4롤 (무료/프리미엄 구분이 꺼져 있으면 늘 통과, 웹과 같음)
      const all = await db.rolls.toArray()
      if (!canLoadRoll(all)) { loading.current = false; setLimit(true); return }
      noteRollLoaded(loadsThisMonth(all))
      await doLoad()
    } catch (e) { loading.current = false; throw e } // 실패하면 다시 누를 수 있게
  }
  const [limit, setLimit] = useState(false)
  const doLoad = async () => {
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
    // 재고가 있으면 1롤 뺀다
    const lot = lotToUse(lots, film.id, camera.format)
    if (lot) {
      await db.filmLots.update(lot.id, { count: lot.count - 1 })
      // 빈티지 필름: 그 재고의 유통기한을 롤에 남긴다 (웹·아이폰과 같음)
      if (lot.expiresAt) await db.rolls.update(roll.id, { filmExpiresAt: lot.expiresAt })
    }
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
      right={<SheetBtn label="장착" accent disabled={!camera || !film || !lensReady} onPress={() => expired ? setConfirmExpired(true) : load()} />}>
      <Section title="카메라" foot={loaded ? "지금 장착된 필름은 '촬영 완료'로 바뀌어요." : undefined} warn>
        {cameras?.length === 0 ? <Group><Row onPress={() => setAddingCamera(true)}><Icon name="plus" size={22} color={c.safelight} /><RowText color={c.safelight}>카메라 추가</RowText></Row></Group> : null}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 2, paddingTop: 2, paddingBottom: 4 }}>
          {pickOrder.map((x) => {
            const on = x.id === cameraId
            return (
              <Pressable key={x.id} onPress={() => { setCameraId(x.id); setLensId('') }} style={({ pressed }) => ({
                width: 116, borderRadius: 16, backgroundColor: on ? c.soft : c.cell, borderWidth: on ? 2 : 1, borderColor: on ? c.safelight : c.sep,
                paddingVertical: on ? 7 : 8, paddingHorizontal: on ? 5 : 6, alignItems: 'center', gap: 2, transform: [{ scale: pressed ? 0.975 : 1 }],
              })}>
                <CameraCover camera={x} height={56} />
                <Text numberOfLines={1} style={{ fontSize: 12, color: c.ink, maxWidth: '100%' }}>{x.brand} {x.model}</Text>
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

      <FilmPicker format={camera?.format ?? '135'} filmId={filmId} onPick={setFilmId}
        onAddCustom={() => setCustomEdit('new')} onEditCustom={(id) => setCustomEdit(id)}
        footer={stock > 0 ? <Footnote>재고 {stock}롤 · 장착하면 1롤 빼요</Footnote> : null} />

      {/* 필름을 고르기 전에도 보인다 (감도는 '선택 안 됨') */}
      {true ? (
        <Section foot={[
          premiumGateOn() && !isPremium() ? `이번 달 무료 롤 ${Math.min(loadsThisMonth(rolls), FREE_ROLLS_PER_MONTH)}/${FREE_ROLLS_PER_MONTH}` : '',
          today && isToday ? (locationAvailable() ? '지금 시각과 현재 위치를 첫 촬영일로 기록해요.' : '지금 시각을 첫 촬영일로 기록해요. 장소는 롤 화면에서 넣을 수 있어요.') : '',
        ].filter(Boolean).join('\n') || undefined}>
          <Group>
            <View style={{ minHeight: 52, paddingVertical: 10, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <Text style={{ fontSize: 17, color: c.ink }}>감도</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Btn label="−" size="small" disabled={!film} onPress={() => setPush(Math.max(-2, push - 1))} />
                <Text style={{ minWidth: 110, textAlign: 'center', fontSize: 17, fontWeight: film ? '700' : '500', color: film ? c.ink : c.muted, fontVariant: ['tabular-nums'] }}>
                  {film ? `ISO ${shotISO ?? film.iso}${push !== 0 ? ` (${push > 0 ? '+' : ''}${push})` : ''}` : '선택 안 됨'}
                </Text>
                <Btn label="+" size="small" disabled={!film} onPress={() => setPush(Math.min(3, push + 1))} />
              </View>
            </View>
            <Toggle label="오늘을 촬영일로 설정하기" value={today} onChange={setToday} />
            {today ? <Field label="날짜"><DateInput value={startAt} max={Date.now()} onChange={setStartAt} /></Field> : null}
          </Group>
        </Section>
      ) : null}
      {addingCamera ? <CameraEdit onClose={() => setAddingCamera(false)} /> : null}
      {limit ? <Confirm message={rollLimitText} action="확인" safe onCancel={() => setLimit(false)} onConfirm={() => setLimit(false)} /> : null}
      {confirmExpired ? <Confirm message="유통기한이 지난 필름이에요." action="그래도 장착" safe onCancel={() => setConfirmExpired(false)} onConfirm={() => { setConfirmExpired(false); void load() }} /> : null}
      {customEdit ? (
        <CustomFilmEdit row={customEdit === 'new' ? undefined : customRows.find((r) => r.id === customEdit)}
          onClose={(saved) => { setCustomEdit(null); if (saved !== undefined) setFilmId(saved || undefined) }} />
      ) : null}
    </Sheet>
  )
}
