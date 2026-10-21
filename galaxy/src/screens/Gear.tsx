import { useMemo, useState } from 'react'
import { Image, Pressable, Text, View } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { db } from '../data'
import type { CustomFilmRow } from '../core/films'
import { allFilms, filmById, filmDisplayName, popularFilms } from '../core/films'
import { lensesFor } from '../core/lenses'
import { filmFits, filterDiameters, filterKinds, groupPrice, lensSpec, parseLens } from '../core/optics'
import type { FilmFormat, FilmLot, FilmStorage, GearFilter, Lens } from '../core/types'
import { formatInfo, uid } from '../core/types'
import { deleteCameraPhoto, readBytes, saveCameraPhoto, useCameraPhoto } from '../files'
import { Btn, Canister, Chip, Chips, Empty, EmptyText, Field, Group, Row, Section, Segmented, Sub } from '../kit'
import { Confirm, Sheet, SheetBtn } from '../overlay'
import { getPref, useLiveQuery } from '../store'
import { forgetSuggestion, hiddenSet, rememberSuggestion } from '../suggest'
import { useTheme } from '../theme'
import { CustomFilmEdit } from './CustomFilmEdit'
import { OptionalDate, TagField } from '../gearExtras'

export type GearKind = 'lens' | 'filter' | 'film'
const storageName: Record<FilmStorage, string> = { fridge: '냉장고', freezer: '냉동고', drawer: '서랍', room: '상온' }
const formats = Object.keys(formatInfo) as FilmFormat[]

function knownSellers() {
  try { return JSON.parse(getPref('knownSellers', '[]')) as string[] } catch { return [] }
}
export function rememberSeller(raw: string) {
  rememberSuggestion('knownSellers', raw)
}

function sellerOptions(query: string, used: (string | undefined)[]) {
  const blocked = hiddenSet('knownSellers')
  const seen = new Set<string>()
  const list: string[] = []
  for (const name of [...knownSellers(), ...used.filter((item): item is string => !!item?.trim())]) {
    const key = name.toLowerCase()
    if (blocked.has(key) || seen.has(key)) continue
    seen.add(key)
    list.push(name)
  }
  const q = query.trim().toLowerCase()
  return list.filter((name) => !q || (name.toLowerCase().includes(q) && name.toLowerCase() !== q)).slice(0, 8)
}

export function useUsedSellers() {
  const cameras = useLiveQuery(() => db.cameras.toArray(), [])
  const lenses = useLiveQuery(() => db.lenses.toArray(), [])
  const filters = useLiveQuery(() => db.filters.toArray(), [])
  const lots = useLiveQuery(() => db.filmLots.toArray(), [])
  return useMemo(() => [
    ...(cameras ?? []).map((item) => item.seller),
    ...(lenses ?? []).map((item) => item.seller),
    ...(filters ?? []).map((item) => item.seller),
    ...(lots ?? []).map((item) => item.seller),
  ], [cameras, lenses, filters, lots])
}

export function PurchaseFields({ date, setDate, price, setPrice, seller, setSeller, used }: {
  date?: number
  setDate: (v?: number) => void
  price: string
  setPrice: (v: string) => void
  seller: string
  setSeller: (v: string) => void
  used: (string | undefined)[]
}) {
  const [rev, setRev] = useState(0)
  const hits = useMemo(() => sellerOptions(seller, used), [seller, used, rev])
  return (
    <Section title="구입">
      <Group>
        <OptionalDate label="구입 날짜" value={date} onChange={setDate} />
        <Field label="구입 금액" value={price} onChangeText={(v) => setPrice(groupPrice(v))} keyboardType="number-pad" />
        <Field label="구입처" value={seller} onChangeText={setSeller} />
        {hits.length > 0 && <Chips>{hits.map((name) => (
          <View key={name} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Chip label={name} flat onPress={() => setSeller(name)} />
            <Pressable onPress={() => { forgetSuggestion('knownSellers', name); setRev((n) => n + 1) }} hitSlop={8} accessibilityLabel={`${name} 추천 지우기`}>
              <Text style={{ fontSize: 16, fontWeight: '700', marginLeft: -6, marginRight: 4 }}>×</Text>
            </Pressable>
          </View>
        ))}</Chips>}
      </Group>
    </Section>
  )
}

function PhotoBlock({ id, hasPhoto, uri, setUri, cleared, setCleared }: {
  id?: string
  hasPhoto?: boolean
  uri?: string
  setUri: (v?: string) => void
  cleared: boolean
  setCleared: (v: boolean) => void
}) {
  const saved = useCameraPhoto(id ?? '', !!hasPhoto && !uri && !cleared)
  const src = uri || saved
  const pick = async (camera: boolean) => {
    if (camera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync()
      if (!perm.granted) return
    }
    const res = camera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.85 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 })
    if (res.canceled || !res.assets[0]) return
    setCleared(false)
    setUri(res.assets[0].uri)
  }
  return (
    <Section title="사진">
      <Group style={{ padding: 12, gap: 8, alignItems: 'center' }}>
        {src ? <Image source={{ uri: src }} style={{ width: 180, height: 140 }} resizeMode="contain" /> : <Text style={{ fontSize: 28, opacity: 0.35 }}>◎</Text>}
        <Btn label="사진 찍기" onPress={() => pick(true)} />
        <Btn label="앨범에서 사진 고르기" onPress={() => pick(false)} />
        {!!src && <Btn label="사진 지우기" onPress={() => { setUri(undefined); setCleared(true) }} />}
      </Group>
    </Section>
  )
}

async function storePhoto(id: string, uri?: string, cleared?: boolean) {
  if (uri) await saveCameraPhoto(id, await readBytes(uri))
  else if (cleared) await deleteCameraPhoto(id)
}

export function GearBoard({ kind, layout, tag }: { kind: GearKind; layout: string; tag?: string }) {
  const c = useTheme()
  const lenses = useLiveQuery(async () => (await db.lenses.orderBy('createdAt').toArray()).filter((x) => !tag || (x.tags ?? []).includes(tag)), [tag])
  const filters = useLiveQuery(async () => (await db.filters.orderBy('createdAt').toArray()).filter((x) => !tag || (x.tags ?? []).includes(tag)), [tag])
  const lots = useLiveQuery(() => db.filmLots.orderBy('createdAt').reverse().toArray(), [])
  const [edit, setEdit] = useState<string | null>(null)
  const grid = layout === 'grid'
  const items = kind === 'lens' ? lenses : kind === 'filter' ? filters : lots
  const empty = kind === 'lens' ? ['렌즈가 없어요', '가진 렌즈를 등록해 보세요.']
    : kind === 'filter' ? ['필터가 없어요', '가진 필터를 등록해 보세요.']
    : ['필름 재고가 없어요', '가진 롤을 등록해 보세요.']
  const card = { backgroundColor: c.cell, borderRadius: 22, padding: 14, gap: 8, width: grid ? '48%' as const : undefined }
  return (
    <View style={{ gap: 12 }}>
      {items && items.length === 0 && (
        <Empty icon="camera" title={empty[0]}><EmptyText>{empty[1]}</EmptyText></Empty>
      )}
      {items && items.length > 0 && (
        <View style={grid ? { flexDirection: 'row', flexWrap: 'wrap', gap: 12 } : { backgroundColor: c.cell, borderRadius: 22 }}>
          {kind === 'lens' && (lenses ?? []).map((lens) => (
            <Pressable key={lens.id} onPress={() => setEdit(lens.id)} style={grid ? card : { padding: 14, gap: 4 }}>
              <GearImage id={lens.id} hasPhoto={lens.hasPhoto} tall={grid} />
              <Text style={{ fontWeight: '700', color: c.ink }} numberOfLines={2}>{lens.model || '렌즈'}</Text>
              {!!lens.brand && <Sub>{lens.brand}</Sub>}
              {!!lensSpec(lens) && <Sub>{lensSpec(lens)}</Sub>}
            </Pressable>
          ))}
          {kind === 'filter' && (filters ?? []).map((filter) => (
            <Pressable key={filter.id} onPress={() => setEdit(filter.id)} style={grid ? card : { padding: 14, gap: 4 }}>
              <GearImage id={filter.id} hasPhoto={filter.hasPhoto} tall={grid} />
              <Text style={{ fontWeight: '700', color: c.ink }} numberOfLines={2}>{filter.name || '필터'}</Text>
              {!!filter.diameter && <Sub>직경 {filter.diameter}mm</Sub>}
            </Pressable>
          ))}
          {kind === 'film' && (lots ?? []).map((lot) => {
            const film = filmById(lot.filmId)
            const late = !!lot.expiresAt && lot.expiresAt < Date.now()
            return (
              <Pressable key={lot.id} onPress={() => setEdit(lot.id)} style={grid ? { ...card, alignItems: 'flex-start' } : { padding: 14, flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                <Canister film={film} format={lot.format} size={grid ? 96 : 52} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '700', color: c.ink }} numberOfLines={2}>{filmDisplayName(film)}</Text>
                  <Sub>{formatInfo[lot.format].name} · {storageName[lot.storage]} · {lot.count}롤</Sub>
                  {late && <Text style={{ color: '#ff453a' }}>기한 지남</Text>}
                  {!late && lot.count <= lot.lowAt && <Text style={{ color: '#ff9f0a' }}>부족</Text>}
                </View>
              </Pressable>
            )
          })}
        </View>
      )}
      {edit && kind === 'lens' && <LensEdit lens={(lenses ?? []).find((item) => item.id === edit)} onClose={() => setEdit(null)} />}
      {edit && kind === 'filter' && <FilterEdit filter={(filters ?? []).find((item) => item.id === edit)} onClose={() => setEdit(null)} />}
      {edit && kind === 'film' && <FilmEdit lot={(lots ?? []).find((item) => item.id === edit)} onClose={() => setEdit(null)} />}
    </View>
  )
}

function GearImage({ id, hasPhoto, tall }: { id: string; hasPhoto?: boolean; tall: boolean }) {
  const uri = useCameraPhoto(id, !!hasPhoto)
  return uri
    ? <Image source={{ uri }} style={{ width: '100%', height: tall ? 110 : 52 }} resizeMode="contain" />
    : <View style={{ height: tall ? 110 : 52, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 28, opacity: 0.3 }}>◎</Text></View>
}

export function GearAdd({ kind, onClose }: { kind: GearKind; onClose: () => void }) {
  if (kind === 'lens') return <LensEdit onClose={onClose} />
  if (kind === 'filter') return <FilterEdit onClose={onClose} />
  return <FilmEdit onClose={onClose} />
}

function LensEdit({ lens, onClose }: { lens?: Lens; onClose: () => void }) {
  const used = useUsedSellers()
  const parsed = parseLens(lens?.model ?? '')
  const [brand, setBrand] = useState(lens?.brand ?? '')
  const [model, setModel] = useState(lens?.model ?? '')
  const [mount, setMount] = useState(lens?.mount ?? '')
  const [zoom, setZoom] = useState(lens?.zoom ?? parsed.zoom)
  const [focalMin, setFocalMin] = useState(lens?.focalMin ? String(lens.focalMin) : parsed.focalMin ? String(parsed.focalMin) : '')
  const [focalMax, setFocalMax] = useState(lens?.focalMax && lens.focalMax !== lens.focalMin ? String(lens.focalMax) : '')
  const [open, setOpen] = useState(lens?.apertureOpen || parsed.open)
  const [close, setClose] = useState(lens?.apertureClose || parsed.close)
  const [uri, setUri] = useState<string>()
  const [cleared, setCleared] = useState(false)
  const [date, setDate] = useState(lens?.purchasedAt)
  const [price, setPrice] = useState(groupPrice(lens?.price ?? ''))
  const [seller, setSeller] = useState(lens?.seller ?? '')
  const [tags, setTags] = useState<string[]>(lens?.tags ?? [])
  const [confirm, setConfirm] = useState(false)
  const hits = lensesFor(mount, model).filter((name) => name !== model).slice(0, 6)
  const apply = (name: string) => {
    const next = parseLens(name)
    setModel(name)
    setZoom(next.zoom)
    setFocalMin(next.focalMin ? String(next.focalMin) : '')
    setFocalMax(next.zoom && next.focalMax > next.focalMin ? String(next.focalMax) : '')
    setOpen(next.open)
    setClose(next.close)
  }
  const save = async () => {
    const min = Number(focalMin.replace(/\D/g, '')) || 0
    const max = zoom ? (Number(focalMax.replace(/\D/g, '')) || 0) : min
    const data: Lens = {
      id: lens?.id ?? uid(), brand: brand.trim(), model: model.trim(), mount: mount.trim(),
      zoom, focalMin: min || undefined, focalMax: max || undefined,
      apertureOpen: open.trim() || undefined, apertureClose: close.trim() || undefined,
      hasPhoto: cleared ? false : !!(uri || lens?.hasPhoto),
      purchasedAt: date, price: groupPrice(price) || undefined, seller: seller.trim() || undefined, tags,
      createdAt: lens?.createdAt ?? Date.now(),
    }
    await storePhoto(data.id, uri, cleared)
    await db.lenses.put(data)
    rememberSeller(seller)
    onClose()
  }
  return (
    <Sheet title={lens ? '렌즈 수정' : '렌즈 추가'} onClose={onClose}
      right={<SheetBtn label="저장" accent disabled={!model.trim() || !mount.trim()} onPress={save} />}>
      <PhotoBlock id={lens?.id} hasPhoto={lens?.hasPhoto} uri={uri} setUri={setUri} cleared={cleared} setCleared={setCleared} />
      <Section title="렌즈">
        <Group>
          <Field label="마운트" value={mount} onChangeText={setMount} />
          <Field label="제조사" value={brand} onChangeText={setBrand} />
          <Field label="렌즈" value={model} onChangeText={setModel} />
          {hits.length > 0 && <Chips>{hits.map((name) => <Chip key={name} label={name} onPress={() => apply(name)} />)}</Chips>}
        </Group>
      </Section>
      <Section title="사양">
        <Group>
          <Segmented value={zoom ? 'zoom' : 'prime'} options={[['prime', '단렌즈'], ['zoom', '줌렌즈']]} onChange={(v) => setZoom(v === 'zoom')} />
          <Field label={zoom ? '짧은 화각 (mm)' : '화각 (mm)'} value={focalMin} onChangeText={(v) => setFocalMin(v.replace(/\D/g, ''))} keyboardType="number-pad" />
          {zoom && <Field label="긴 화각 (mm)" value={focalMax} onChangeText={(v) => setFocalMax(v.replace(/\D/g, ''))} keyboardType="number-pad" />}
          <Field label="최대개방" value={open} onChangeText={setOpen} keyboardType="decimal-pad" />
          <Field label="최소개방" value={close} onChangeText={setClose} keyboardType="decimal-pad" />
        </Group>
      </Section>
      <PurchaseFields date={date} setDate={setDate} price={price} setPrice={setPrice} seller={seller} setSeller={setSeller} used={used} />
      <TagField tags={tags} setTags={setTags} />
      {lens && <Group><Row onPress={() => setConfirm(true)}><Text style={{ color: '#ff453a' }}>렌즈 삭제</Text></Row></Group>}
      {confirm && lens && <Confirm message="이 렌즈를 삭제할까요? 이 렌즈로 찍은 롤 기록은 남아요." onCancel={() => setConfirm(false)}
        onConfirm={async () => { await db.lenses.delete(lens.id); onClose() }} />}
    </Sheet>
  )
}

function FilterEdit({ filter, onClose }: { filter?: GearFilter; onClose: () => void }) {
  const used = useUsedSellers()
  const [name, setName] = useState(filter?.name ?? '')
  const [diameter, setDiameter] = useState(filter?.diameter ?? '')
  const [uri, setUri] = useState<string>()
  const [cleared, setCleared] = useState(false)
  const [date, setDate] = useState(filter?.purchasedAt)
  const [price, setPrice] = useState(groupPrice(filter?.price ?? ''))
  const [seller, setSeller] = useState(filter?.seller ?? '')
  const [tags, setTags] = useState<string[]>(filter?.tags ?? [])
  const [confirm, setConfirm] = useState(false)
  const kinds = filterKinds.filter((item) => !name || item.toLowerCase().includes(name.toLowerCase())).filter((item) => item !== name).slice(0, 8)
  const save = async () => {
    const data: GearFilter = {
      id: filter?.id ?? uid(), name: name.trim(), diameter: diameter.replace(/[^\d.]/g, '') || undefined,
      hasPhoto: cleared ? false : !!(uri || filter?.hasPhoto),
      purchasedAt: date, price: groupPrice(price) || undefined, seller: seller.trim() || undefined, tags,
      createdAt: filter?.createdAt ?? Date.now(),
    }
    await storePhoto(data.id, uri, cleared)
    await db.filters.put(data)
    rememberSeller(seller)
    onClose()
  }
  return (
    <Sheet title={filter ? '필터 수정' : '필터 추가'} onClose={onClose}
      right={<SheetBtn label="저장" accent disabled={!name.trim() || !diameter.replace(/[^\d.]/g, '')} onPress={save} />}>
      <PhotoBlock id={filter?.id} hasPhoto={filter?.hasPhoto} uri={uri} setUri={setUri} cleared={cleared} setCleared={setCleared} />
      <Section title="필터">
        <Group>
          <Field label="종류" value={name} onChangeText={setName} />
          {kinds.length > 0 && <Chips>{kinds.map((item) => <Chip key={item} label={item} onPress={() => setName(item)} />)}</Chips>}
          <Field label="직경 (mm)" value={diameter} onChangeText={setDiameter} keyboardType="decimal-pad" />
          <Chips>{filterDiameters.filter((item) => item !== diameter).map((item) => <Chip key={item} label={item} onPress={() => setDiameter(item)} />)}</Chips>
        </Group>
      </Section>
      <PurchaseFields date={date} setDate={setDate} price={price} setPrice={setPrice} seller={seller} setSeller={setSeller} used={used} />
      <TagField tags={tags} setTags={setTags} />
      {filter && <Group><Row onPress={() => setConfirm(true)}><Text style={{ color: '#ff453a' }}>필터 삭제</Text></Row></Group>}
      {confirm && filter && <Confirm message="이 필터를 삭제할까요?" onCancel={() => setConfirm(false)}
        onConfirm={async () => { await db.filters.delete(filter.id); onClose() }} />}
    </Sheet>
  )
}

function FilmEdit({ lot, onClose }: { lot?: FilmLot; onClose: () => void }) {
  const used = useUsedSellers()
  const rolls = useLiveQuery(() => db.rolls.orderBy('loadedAt').reverse().toArray(), []) ?? []
  const custom = useLiveQuery(() => db.customFilms.orderBy('createdAt').reverse().toArray(), []) ?? []
  const [filmId, setFilmId] = useState(lot?.filmId ?? '')
  const [format, setFormat] = useState<FilmFormat>(lot?.format ?? '135')
  const [count, setCount] = useState(String(lot?.count ?? 1))
  const [lowAt, setLowAt] = useState(String(lot?.lowAt ?? 1))
  const [storage, setStorage] = useState<FilmStorage>(lot?.storage ?? 'fridge')
  const [expires, setExpires] = useState(lot?.expiresAt)
  const [date, setDate] = useState(lot?.purchasedAt)
  const [price, setPrice] = useState(groupPrice(lot?.price ?? ''))
  const [seller, setSeller] = useState(lot?.seller ?? '')
  const [showAll, setShowAll] = useState(false)
  const [customEdit, setCustomEdit] = useState<CustomFilmRow | 'new' | null>(null)
  const [confirm, setConfirm] = useState(false)
  const stocks = useMemo(() => {
    const recent = rolls.map((roll) => roll.filmId)
    const list = allFilms().filter((stock) => filmFits(stock.formats, format))
    const rank = (stock: { id: string }) => [(recent.indexOf(stock.id) < 0 ? 999 : recent.indexOf(stock.id)), (popularFilms.indexOf(stock.id) < 0 ? 999 : popularFilms.indexOf(stock.id))] as const
    return list.sort((a, b) => rank(a)[0] - rank(b)[0] || rank(a)[1] - rank(b)[1])
  }, [rolls, format, custom])
  const visible = showAll ? stocks : stocks.slice(0, 6)
  const save = async () => {
    const data: FilmLot = {
      id: lot?.id ?? uid(), filmId, format,
      count: Math.max(0, Math.min(99, Number(count) || 0)),
      lowAt: Math.max(0, Math.min(20, Number(lowAt) || 0)),
      storage, expiresAt: expires,
      purchasedAt: date, price: groupPrice(price) || undefined, seller: seller.trim() || undefined,
      createdAt: lot?.createdAt ?? Date.now(),
    }
    await db.filmLots.put(data)
    rememberSeller(seller)
    onClose()
  }
  return (
    <Sheet title={lot ? '필름 수정' : '필름 추가'} onClose={onClose}
      right={<SheetBtn label="저장" accent disabled={!filmId} onPress={save} />}>
      <Section title={showAll ? '필름' : '필름 · 최근 사용'}>
        <Group>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 10 }}>
            {visible.map((stock) => (
              <Pressable key={stock.id} onPress={() => setFilmId(stock.id)} style={{ width: 96, alignItems: 'center', borderWidth: 2, borderColor: filmId === stock.id ? '#ff6b1f' : 'transparent', borderRadius: 16, padding: 4 }}>
                <Canister film={stock} format={format} size={84} />
                <Text style={{ fontSize: 11, textAlign: 'center' }} numberOfLines={2}>{filmDisplayName(stock)}</Text>
              </Pressable>
            ))}
            <Pressable onPress={() => setCustomEdit('new')} style={{ width: 96, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 28, color: '#ff6b1f' }}>+</Text>
              <Text style={{ color: '#ff6b1f', fontWeight: '600' }}>직접 추가</Text>
            </Pressable>
          </View>
          <Row onPress={() => setShowAll(!showAll)}><Text style={{ color: '#ff6b1f' }}>{showAll ? '접기' : `더보기 (${stocks.length}종)`}</Text></Row>
        </Group>
      </Section>
      <Section title="보관">
        <Group>
          <Chips>{formats.map((item) => <Chip key={item} label={formatInfo[item].name} active={format === item} onPress={() => setFormat(item)} />)}</Chips>
          <Field label="수량" value={count} onChangeText={setCount} keyboardType="number-pad" />
          <Field label="부족 알림" value={lowAt} onChangeText={setLowAt} keyboardType="number-pad" />
          <Chips>{(Object.keys(storageName) as FilmStorage[]).map((item) => <Chip key={item} label={storageName[item]} active={storage === item} onPress={() => setStorage(item)} />)}</Chips>
          <Row onPress={() => setExpires(expires === undefined ? Date.now() : undefined)}>
            <Text style={{ flex: 1 }}>유통기한</Text>
            <Text>{expires === undefined ? '없음' : new Date(expires).toISOString().slice(0, 10)}</Text>
          </Row>
        </Group>
      </Section>
      <PurchaseFields date={date} setDate={setDate} price={price} setPrice={setPrice} seller={seller} setSeller={setSeller} used={used} />
      {lot && <Group><Row onPress={() => setConfirm(true)}><Text style={{ color: '#ff453a' }}>재고 삭제</Text></Row></Group>}
      {confirm && lot && <Confirm message="이 재고를 삭제할까요?" onCancel={() => setConfirm(false)}
        onConfirm={async () => { await db.filmLots.delete(lot.id); onClose() }} />}
      {customEdit && <CustomFilmEdit row={customEdit === 'new' ? undefined : customEdit} onClose={(id) => { if (id) setFilmId(id); setCustomEdit(null) }} />}
    </Sheet>
  )
}
