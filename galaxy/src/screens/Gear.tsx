import { useMemo, useState } from 'react'
import { Image, Pressable, View } from 'react-native'
import { Text } from '../text'
import { TextInput } from '../textInput'
import { glassPresets, isLensFilter } from '../core/filterLook'
import { FilterRing } from '../FilterRing'
import { LensModel3D } from '../Model3D'
import * as ImagePicker from 'expo-image-picker'
import { db } from '../data'
import type { CustomFilmRow } from '../core/films'
import { allFilms, filmById, filmDisplayName, popularFilms } from '../core/films'
import { lensesFor } from '../core/lenses'
import { filmFits, filterDiameters, filterKinds, groupPrice, lensSpec, parseLens } from '../core/optics'
import type { FilmFormat, FilmLot, FilmStorage, GearFilter, Lens } from '../core/types'
import { FILTER_KIND, formatInfo, kindOf, priceText, priceValue, uid } from '../core/types'
import { groupSections, lotKey, sortLots, type FilmLotSort, type GearGroup } from '../core/gearGroup'
import { FilmPickGrid } from '../FilmPickGrid'
import { deleteCameraPhoto, readBytes, saveCameraPhoto, useCameraPhoto, usePhotoIsCutout } from '../files'
import { Btn, Canister, Chip, Chips, Empty, EmptyText, Field, Footnote, Group, LensPicture, Row, Section, Segmented, Select, Sub } from '../kit'
import { Confirm, Sheet, SheetBtn } from '../overlay'
import { getPref, useLiveQuery } from '../store'
import { forgetSuggestion, hiddenSet, rememberSuggestion } from '../suggest'
import { useTheme } from '../theme'
import { Icon } from '../icons'
import { CustomFilmEdit } from './CustomFilmEdit'
import { FilmPickSortBar, PhotoRows, GroupTitle, OptionalDate, TagField, TagLine, accessoryKinds, addAccessoryKind, tagSections } from '../gearExtras'

export type GearKind = 'lens' | 'filter' | 'film'
const storageName: Record<FilmStorage, string> = { fridge: '냉장고', freezer: '냉동고', drawer: '서랍', room: '상온', custom: '직접 입력' }
/** 보관 장소 글자 (직접 입력이면 적은 글자) */
const storageText = (l: Pick<FilmLot, 'storage' | 'storagePlace'>) => (l.storage === 'custom' ? l.storagePlace?.trim() || '직접 입력' : storageName[l.storage])
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

function PhotoBlock({ id, hasPhoto, uri, setUri, cleared, setCleared, placeholder }: {
  /** 사진이 없을 때 보일 그림 (필터 링) */
  placeholder?: React.ReactNode
  id?: string
  hasPhoto?: boolean
  uri?: string
  setUri: (v?: string) => void
  cleared: boolean
  setCleared: (v: boolean) => void
}) {
  const c = useTheme()
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
      <Group style={{ padding: 12, gap: 12 }}>
        {src
          ? <Image source={{ uri: src }} style={{ width: '100%', height: 220, borderRadius: 16 }} resizeMode="contain" />
          : <View style={{ height: 160, alignItems: 'center', justifyContent: 'center' }}>{placeholder ?? <Icon name="camera" size={42} color={c.muted} />}</View>}
        <PhotoRows onCamera={() => { void pick(true) }} onAlbum={() => { void pick(false) }}
          onClear={src ? () => { setUri(undefined); setCleared(true) } : undefined} />
      </Group>
    </Section>
  )
}

async function storePhoto(id: string, uri?: string, cleared?: boolean) {
  if (uri) await saveCameraPhoto(id, await readBytes(uri))
  else if (cleared) await deleteCameraPhoto(id)
}

export function GearBoard({ kind, layout, tag, search = '', grouped = false, filmGroup = 'brand', filmSort = 'name', filmSortDesc = false }: { kind: GearKind; layout: string; tag?: string; search?: string; grouped?: boolean; filmGroup?: GearGroup; filmSort?: FilmLotSort; filmSortDesc?: boolean }) {
  // 자주 사용: 필름마다 쓴 롤 수
  const used = useLiveQuery(async () => { const m: Record<string, number> = {}; for (const r of await db.rolls.toArray()) if (!r.deletedAt) m[r.filmId] = (m[r.filmId] ?? 0) + 1; return m }, []) ?? {}
  const c = useTheme()
  const allLenses = useLiveQuery(() => db.lenses.orderBy('createdAt').toArray(), [])
  const allFilters = useLiveQuery(() => db.filters.orderBy('createdAt').toArray(), [])
  const allLots = useLiveQuery(() => db.filmLots.orderBy('createdAt').reverse().toArray(), [])
  const [edit, setEdit] = useState<string | null>(null)
  const grid = layout === 'grid'
  const q = search.trim().toLowerCase()
  const keep = (tags: string[] | undefined, text: (string | undefined)[]) =>
    (!tag || !!tags?.includes(tag)) && (!q || [...text, ...(tags ?? [])].some((t) => t?.toLowerCase().includes(q)))
  const lenses = (allLenses ?? []).filter((l) => keep(l.tags, [l.brand, l.model, l.mount, lensSpec(l)]))
  const filters = (allFilters ?? []).filter((f) => keep(f.tags, [f.name, kindOf(f), f.diameter]))
  const lots = (allLots ?? []).filter((l) => keep(undefined, [filmDisplayName(filmById(l.filmId)), storageText(l)]))
  const all = kind === 'lens' ? allLenses : kind === 'filter' ? allFilters : allLots
  const shown = kind === 'lens' ? lenses : kind === 'filter' ? filters : lots
  const empty = kind === 'lens' ? ['렌즈가 없어요', '가진 렌즈를 등록해 보세요.']
    : kind === 'filter' ? ['액세서리가 없어요', '필터, 그립, 스트랩처럼 가진 장비를 등록해 보세요.']
    : ['필름 재고가 없어요', '가진 롤을 등록해 보세요.']
  const card = { backgroundColor: c.cell, borderRadius: 22, padding: 14, gap: 6, width: '48%' as const, overflow: 'hidden' as const }
  const row = { padding: 14, flexDirection: 'row' as const, gap: 12, alignItems: 'center' as const }
  // 줄 수를 정해 두어 블록 높이가 모두 같다
  const title = (t: string) => <Text style={{ fontWeight: '700', color: c.ink, fontSize: 16, lineHeight: 21, height: grid ? 42 : 21 }} numberOfLines={grid ? 2 : 1}>{t}</Text>
  const sub = (t?: string, lines = 1) => <Text style={{ color: c.muted, fontSize: 13, lineHeight: 18, height: 18 * lines }} numberOfLines={lines}>{t || ' '}</Text>
  const box = (children: React.ReactNode) => <View style={grid ? { flexDirection: 'row', flexWrap: 'wrap', gap: 12 } : { backgroundColor: c.cell, borderRadius: 22 }}>{children}</View>
  const lensCell = (lens: Lens) => (
    <Pressable key={lens.id} onPress={() => setEdit(lens.id)} style={grid ? card : row}>
      <GearImage id={lens.id} hasPhoto={lens.hasPhoto} tall={grid}
        fallback={(size) => <LensPicture brand={lens.brand} model={lens.model} mount={lens.mount} width={size === 50 ? 68 : '100%'} height={size === 50 ? 52 : 110} />} />
      <View style={{ flex: grid ? undefined : 1, gap: 2 }}>
        {title(lens.model || '렌즈')}
        {sub(grid ? lens.brand : [lens.brand, lensSpec(lens)].filter(Boolean).join(' · '))}
        {grid && sub(lensSpec(lens), 2)}
        <TagLine tags={lens.tags} />
      </View>
    </Pressable>
  )
  const filterCell = (f: GearFilter) => (
    <Pressable key={f.id} onPress={() => setEdit(f.id)} style={grid ? card : row}>
      {isLensFilter(f.kind)
        ? <View style={grid ? { height: 110, alignItems: 'center', justifyContent: 'center' } : { width: 68, height: 52, alignItems: 'center', justifyContent: 'center' }}>
            <FilterRing name={f.name} glass={f.glass} size={grid ? 108 : 52} />
          </View>
        : <GearImage id={f.id} hasPhoto={f.hasPhoto} tall={grid} />}
      <View style={{ flex: grid ? undefined : 1, gap: 2 }}>
        {title(f.name || kindOf(f))}
        {sub([kindOf(f), f.diameter ? `직경 ${f.diameter}mm` : '', f.price ? priceText(priceValue(f.price)) : ''].filter(Boolean).join(' · '))}
        <TagLine tags={f.tags} />
      </View>
    </Pressable>
  )
  const sections = <T extends { tags?: string[] }>(list: T[], cell: (x: T) => React.ReactNode, secs = tagSections(list, grouped)) =>
    secs.map((sec, n) => (
      <View key={sec.title ?? n} style={{ gap: 8 }}>
        {sec.title ? <GroupTitle>{`${sec.title} · ${sec.items.length}`}</GroupTitle> : null}
        {box(sec.items.map(cell))}
      </View>
    ))
  const kindOrder = (k: string) => { const i = accessoryKinds().indexOf(k); return i < 0 ? 999 : i }
  return (
    <View style={{ gap: 12 }}>
      {all && all.length === 0 && <Empty icon="camera" title={empty[0]}><EmptyText>{empty[1]}</EmptyText></Empty>}
      {all && all.length > 0 && shown.length === 0 && <Empty icon="search" title="맞는 장비가 없어요" />}
      {kind === 'lens' && lenses.length > 0 && sections(lenses, lensCell)}
      {kind === 'filter' && filters.length > 0 && sections(filters, filterCell, grouped ? undefined
        : [...new Set(filters.map(kindOf))].sort((a, b) => kindOrder(a) - kindOrder(b)).map((k) => ({ title: k, items: filters.filter((f) => kindOf(f) === k) })))}
      {/* 필름 재고: 브랜드·ISO·흑백/컬러·35mm/120으로 묶어 볼 수 있다 (묶음 안은 이름순, 웹과 같음) */}
      {/* 필름 재고: 브랜드·ISO·종류·규격으로 묶고, 묶음 안은 알파벳·재고량·자주 사용 순 (오름/내림, 웹과 같음) */}
      {kind === 'film' && lots.length > 0 && (groupSections(sortLots(lots, filmSort, filmSortDesc, used), (l) => lotKey(l, filmGroup)) as { title?: string; items: FilmLot[] }[])
        .map((sec, n) => <View key={sec.title ?? n} style={{ gap: 8 }}>{sec.title ? <GroupTitle>{`${sec.title} · ${sec.items.length}`}</GroupTitle> : null}{box(sec.items.map((lot) => {
        const film = filmById(lot.filmId)
        const late = !!lot.expiresAt && lot.expiresAt < Date.now()
        return (
          <Pressable key={lot.id} onPress={() => setEdit(lot.id)} style={grid ? { ...card, alignItems: 'flex-start' } : row}>
            <Canister film={film} format={lot.format} size={grid ? 96 : 52} />
            <View style={{ flex: grid ? undefined : 1, gap: 2, alignSelf: 'stretch' }}>
              {/* 바둑판: 브랜드는 이름 위에 작게 (필름 이름이 먼저 눈에 들어오게, 웹·아이폰과 같음) */}
              {grid ? <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: '500', color: c.muted, lineHeight: 15 }}>{film?.brand || ' '}</Text> : null}
              {title(grid && film?.brand ? film.name : filmDisplayName(film))}
              {sub(`${formatInfo[lot.format].name} · ${storageText(lot)}`, grid ? 2 : 1)}
              {/* 재고 수량은 크게, 부족·기한 지남은 옆에 둥근 표시 (웹·아이폰과 같음) */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: c.ink, fontVariant: ['tabular-nums'] }}>{lot.count}롤</Text>
                {late || lot.count <= lot.lowAt ? (
                  <Text style={{ fontSize: 12, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, overflow: 'hidden',
                    backgroundColor: late ? '#ff453a' : '#ffd23f', color: late ? '#fff' : '#3a2a00' }}>{late ? '기한 지남' : '부족'}</Text>
                ) : null}
              </View>
            </View>
          </Pressable>
        )
      }))}</View>)}
      {edit && kind === 'lens' && <LensEdit lens={(allLenses ?? []).find((item) => item.id === edit)} onClose={() => setEdit(null)} />}
      {edit && kind === 'filter' && <FilterEdit filter={(allFilters ?? []).find((item) => item.id === edit)} onClose={() => setEdit(null)} />}
      {edit && kind === 'film' && <FilmEdit lot={(allLots ?? []).find((item) => item.id === edit)} onClose={() => setEdit(null)} />}
    </View>
  )
}

/** 장비 사진. 바둑판: 그냥 사진이면 카드 위쪽·양옆 끝까지 채운다(높이는 다른 카드와 같게). 목록: 고정 크기 + 둥근 모서리 */
function GearImage({ id, hasPhoto, tall, fallback }: { id: string; hasPhoto?: boolean; tall: boolean; fallback?: (size: number) => React.ReactNode }) {
  const uri = useCameraPhoto(id, !!hasPhoto)
  const cutout = usePhotoIsCutout(id, !!uri)
  if (!tall) {
    return uri
      ? <Image source={{ uri }} style={{ width: 68, height: 52, borderRadius: 8 }} resizeMode={cutout === false ? 'cover' : 'contain'} />
      : <View style={{ width: 68, height: 52, alignItems: 'center', justifyContent: 'center' }}>{fallback?.(50) ?? <Text style={{ fontSize: 28, opacity: 0.3 }}>◎</Text>}</View>
  }
  if (uri && cutout === false) {
    return <Image source={{ uri }} style={{ height: 124, marginHorizontal: -14, marginTop: -14 }} resizeMode="cover" />
  }
  return uri
    ? <Image source={{ uri }} style={{ width: '100%', height: 110 }} resizeMode="contain" />
    : <View style={{ height: 110, alignItems: 'center', justifyContent: 'center' }}>{fallback?.(100) ?? <Text style={{ fontSize: 28, opacity: 0.3 }}>◎</Text>}</View>
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
      <PhotoBlock id={lens?.id} hasPhoto={lens?.hasPhoto} uri={uri} setUri={setUri} cleared={cleared} setCleared={setCleared}
        placeholder={model.trim() ? <LensModel3D brand={brand} model={model} mount={mount} height={190} /> : undefined} />
      <Section title="렌즈">
        <Group>
          <Field label="마운트" value={mount} onChangeText={setMount} />
          <Field label="제조사" value={brand} onChangeText={setBrand} />
          <Field label="렌즈" value={model} onChangeText={setModel} />
          {hits.length > 0 && <Chips>{hits.map((name) => <Chip key={name} label={name} onPress={() => apply(name)} />)}</Chips>}
        </Group>
      </Section>
      <TagField tags={tags} setTags={setTags} />
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
      {lens && <Group><Row onPress={() => setConfirm(true)}><Text style={{ color: '#ff453a' }}>렌즈 삭제</Text></Row></Group>}
      {confirm && lens && <Confirm message="이 렌즈를 삭제할까요? 이 렌즈로 찍은 롤 기록은 남아요." onCancel={() => setConfirm(false)}
        onConfirm={async () => { await db.lenses.delete(lens.id); onClose() }} />}
    </Sheet>
  )
}

/** 액세서리 추가·수정 (유형은 사용자가 더할 수 있다) */
export function FilterEdit({ filter, onClose, onSaved }: { filter?: GearFilter; onClose: () => void; onSaved?: (f: GearFilter) => void }) {
  const c = useTheme()
  const used = useUsedSellers()
  const [kind, setKind] = useState(filter ? kindOf(filter) : FILTER_KIND)
  const [kinds, setKinds] = useState(() => { const k = accessoryKinds(); return filter && !k.includes(kindOf(filter)) ? [...k, kindOf(filter)] : k })
  const [name, setName] = useState(filter?.name ?? '')
  const [diameter, setDiameter] = useState(filter?.diameter ?? '')
  const [glass, setGlass] = useState(filter?.glass)
  const [uri, setUri] = useState<string>()
  const [cleared, setCleared] = useState(false)
  const [date, setDate] = useState(filter?.purchasedAt)
  const [price, setPrice] = useState(groupPrice(filter?.price ?? ''))
  const [seller, setSeller] = useState(filter?.seller ?? '')
  const [tags, setTags] = useState<string[]>(filter?.tags ?? [])
  const [confirm, setConfirm] = useState(false)
  const [newKind, setNewKind] = useState<string | null>(null)
  const isFilter = kind === FILTER_KIND
  const hints = isFilter ? filterKinds.filter((item) => !name || item.toLowerCase().includes(name.toLowerCase())).filter((item) => item !== name).slice(0, 8) : []
  const save = async () => {
    const data: GearFilter = {
      id: filter?.id ?? uid(), kind, name: name.trim(), diameter: isFilter ? diameter.replace(/[^\d.]/g, '') || undefined : undefined,
      glass: isFilter ? glass : undefined,
      hasPhoto: isFilter ? false : cleared ? false : !!(uri || filter?.hasPhoto),
      purchasedAt: date, price: groupPrice(price) || undefined, seller: seller.trim() || undefined, tags,
      createdAt: filter?.createdAt ?? Date.now(),
    }
    await storePhoto(data.id, isFilter ? undefined : uri, isFilter ? !!filter?.hasPhoto : cleared)
    await db.filters.put(data)
    rememberSeller(seller)
    onSaved?.(data)
    onClose()
  }
  return (
    <Sheet title={filter ? '액세서리 수정' : '액세서리 추가'} onClose={onClose}
      right={<SheetBtn label="저장" accent disabled={!name.trim()} onPress={save} />}>
      {/* 렌즈 필터는 사진 대신 늘 기본 그림 (모양만 고른다) */}
      {isFilter
        ? <Group style={{ alignItems: 'center', paddingVertical: 16 }}><FilterRing name={name} glass={glass} size={190} /></Group>
        : <PhotoBlock id={filter?.id} hasPhoto={filter?.hasPhoto} uri={uri} setUri={setUri} cleared={cleared} setCleared={setCleared} />}
      <Section title="액세서리">
        <Group>
          <Field label="유형"><Select value={kind} title="유형" options={[...kinds.map((k) => [k, k] as [string, string]), ['__add', '유형 추가…']]}
            onChange={(v) => { if (v === '__add') setNewKind(''); else setKind(v) }} /></Field>
          {newKind !== null && (
            <Row>
              <TextInput value={newKind} onChangeText={setNewKind} autoFocus placeholder="새 유형 (예: 핫슈 수평계)" placeholderTextColor={c.faint}
                style={{ flex: 1, fontSize: 17, color: c.ink, paddingVertical: 4 }} />
              <Pressable disabled={!newKind.trim()} hitSlop={8} onPress={() => { addAccessoryKind(newKind); setKinds(accessoryKinds()); setKind(newKind.trim()); setNewKind(null) }}>
                <Text style={{ color: newKind.trim() ? c.safelight : c.faint, fontSize: 17 }}>추가</Text>
              </Pressable>
            </Row>
          )}
          <Field label={isFilter ? '종류' : '이름'} value={name} onChangeText={setName} />
          {hints.length > 0 && <Chips>{hints.map((item) => <Chip key={item} label={item} onPress={() => setName(item)} />)}</Chips>}
          {isFilter && <Field label="직경" value={diameter} onChangeText={setDiameter} keyboardType="decimal-pad" suffix="mm" />}
          {isFilter && <Chips>{filterDiameters.filter((item) => item !== diameter).map((item) => <Chip key={item} label={item} onPress={() => setDiameter(item)} />)}</Chips>}
        </Group>
      </Section>
      {isFilter ? <GlassPicker name={name} glass={glass} setGlass={setGlass} /> : null}
      <TagField tags={tags} setTags={setTags} />
      <PurchaseFields date={date} setDate={setDate} price={price} setPrice={setPrice} seller={seller} setSeller={setSeller} used={used} />
      {filter && <Group><Row onPress={() => setConfirm(true)}><Text style={{ color: '#ff453a' }}>액세서리 삭제</Text></Row></Group>}
      {confirm && filter && <Confirm message="이 액세서리를 삭제할까요?" onCancel={() => setConfirm(false)}
        onConfirm={async () => { await db.filters.delete(filter.id); onClose() }} />}
    </Sheet>
  )
}

/** 카메라에 쓰는 액세서리: 액세서리 탭에 등록한 것에서 고르고, 없으면 바로 추가하고 돌아온다 */
export function AccessoryLinkFields({ ids, setIds, bodyPrice }: { ids: string[]; setIds: (v: string[]) => void; bodyPrice: string }) {
  const c = useTheme()
  const items = useLiveQuery(() => db.filters.orderBy('createdAt').toArray(), []) ?? []
  const [picking, setPicking] = useState(false)
  const [adding, setAdding] = useState(false)
  const chosen = ids.map((id) => items.find((x) => x.id === id)).filter((x): x is GearFilter => !!x)
  const total = priceValue(bodyPrice) + chosen.reduce((n, a) => n + priceValue(a.price), 0)
  const toggle = (id: string) => setIds(ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id])
  const kinds = [...new Set(items.map(kindOf))]
  return (
    <Section title="액세서리" foot="내 장비의 액세서리 탭에 등록한 것에서 골라요.">
      <Group>
        {chosen.map((a) => (
          <Row key={a.id} static>
            <View style={{ flex: 1 }}><Text style={{ fontSize: 17, color: c.ink }} numberOfLines={1}>{a.name}</Text><Sub>{kindOf(a)}</Sub></View>
            {a.price ? <Text style={{ color: c.muted, fontSize: 17 }}>{priceText(priceValue(a.price))}</Text> : null}
            <Pressable onPress={() => toggle(a.id)} hitSlop={8} accessibilityLabel={`${a.name} 빼기`}><Text style={{ fontSize: 18, color: c.muted, marginLeft: 10 }}>×</Text></Pressable>
          </Row>
        ))}
        <Row onPress={() => setPicking(true)}><Text style={{ color: c.safelight, fontSize: 17 }}>＋ 액세서리 고르기</Text></Row>
        {total > 0 && (
          <Row static>
            <Text style={{ flex: 1, fontSize: 17, color: c.ink }}>본체 + 액세서리</Text>
            <Text style={{ fontSize: 17, fontWeight: '700', color: c.ink }}>{priceText(total)}</Text>
          </Row>
        )}
      </Group>
      {picking && (
        <Sheet title="액세서리 고르기" onClose={() => setPicking(false)} left={null} right={<SheetBtn label="완료" accent onPress={() => setPicking(false)} />}>
          <Group><Row onPress={() => setAdding(true)}><Text style={{ color: c.safelight, fontSize: 17 }}>＋ 새 액세서리 추가</Text></Row></Group>
          {items.length === 0 && <Sub>등록된 액세서리가 없어요. 추가하면 여기서 바로 골라져요.</Sub>}
          {kinds.map((k) => (
            <Section key={k} title={k}>
              <Group>
                {items.filter((x) => kindOf(x) === k).map((a) => (
                  <Row key={a.id} onPress={() => toggle(a.id)}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 17, color: c.ink }} numberOfLines={1}>{a.name}</Text>
                      <Sub>{[a.diameter ? `직경 ${a.diameter}mm` : '', a.price ? priceText(priceValue(a.price)) : ''].filter(Boolean).join(' · ') || ' '}</Sub>
                    </View>
                    <Text style={{ fontSize: 20, color: ids.includes(a.id) ? c.safelight : c.muted }}>{ids.includes(a.id) ? '●' : '○'}</Text>
                  </Row>
                ))}
              </Group>
            </Section>
          ))}
          {adding && <FilterEdit onClose={() => setAdding(false)} onSaved={(f) => { if (!ids.includes(f.id)) setIds([...ids, f.id]) }} />}
        </Sheet>
      )}
    </Section>
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
  const [storagePlace, setStoragePlace] = useState(lot?.storagePlace ?? '')
  const [expires, setExpires] = useState(lot?.expiresAt)
  const [date, setDate] = useState(lot?.purchasedAt)
  const [price, setPrice] = useState(groupPrice(lot?.price ?? ''))
  const [seller, setSeller] = useState(lot?.seller ?? '')
  const c = useTheme()
  const [search, setSearch] = useState('')
  const [showAll, setShowAll] = useState(false)
  const [pickSort, setPickSort] = useState<GearGroup>(() => getPref('filmPickSort', 'none' as string) as GearGroup)
  const [customEdit, setCustomEdit] = useState<CustomFilmRow | 'new' | null>(null)
  const [confirm, setConfirm] = useState(false)
  const stocks = useMemo(() => {
    const recent = rolls.map((roll) => roll.filmId)
    const list = allFilms().filter((stock) => filmFits(stock.formats, format))
      .filter((stock) => !search || filmDisplayName(stock).toLowerCase().includes(search.toLowerCase()))
    const rank = (stock: { id: string }) => [(recent.indexOf(stock.id) < 0 ? 999 : recent.indexOf(stock.id)), (popularFilms.indexOf(stock.id) < 0 ? 999 : popularFilms.indexOf(stock.id))] as const
    return list.sort((a, b) => rank(a)[0] - rank(b)[0] || rank(a)[1] - rank(b)[1])
  }, [rolls, format, search, custom])
  // 고른 필름은 접혀 있어도 늘 보이게 (수정할 때 다시 찾지 않도록)
  const visible = useMemo(() => {
    // 고른 필름은 포맷·검색·순서와 상관없이 늘 보이게 (수정할 때 저장된 필름이 안 보여 못 고치던 것)
    const picked = filmById(filmId)
    const has = (list: typeof stocks) => !!picked && list.some((s) => s.id === picked.id)
    if (showAll) return picked && !has(stocks) ? [picked, ...stocks] : stocks
    const top = stocks.slice(0, 6)
    if (picked && !has(top)) { if (top.length < 6) top.push(picked); else top[5] = picked }
    return top
  }, [stocks, showAll, filmId])
  const pickedCustom = custom.find((r) => r.id === filmId)
  // 이미 있는 재고는 필름 종류·포맷을 바꾸지 않는다 (목록에 없는 필름·직접 만든 필름은 고를 수 있다, 웹·아이폰과 같음)
  const fixedFilm = lot && filmById(filmId) && !filmId.startsWith('custom-') ? filmById(filmId) : undefined
  const save = async () => {
    const data: FilmLot = {
      id: lot?.id ?? uid(), filmId, format,
      count: Math.max(0, Math.min(99, Number(count) || 0)),
      lowAt: Math.max(0, Math.min(20, Number(lowAt) || 0)),
      storage, storagePlace: storage === 'custom' ? storagePlace.trim() || undefined : undefined, expiresAt: expires,
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
      {fixedFilm ? (
        <Section>
          <Group>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 18, paddingVertical: 10 }}>
              <Canister film={fixedFilm} format={format} size={52} />
              <View style={{ flex: 1 }}>
                {fixedFilm.brand ? <Sub>{fixedFilm.brand}</Sub> : null}
                <Text style={{ fontSize: 17, fontWeight: '700', color: c.ink }}>{fixedFilm.brand ? fixedFilm.name : filmDisplayName(fixedFilm)}</Text>
                <Sub>{formatInfo[format].name}</Sub>
              </View>
            </View>
          </Group>
        </Section>
      ) : null}
      {!fixedFilm ? <Section title={showAll ? '필름' : '필름 · 최근 사용'}>
        <Group>
          {showAll ? <Field label="필름 검색" value={search} onChangeText={setSearch} /> : null}
          {showAll ? <FilmPickSortBar value={pickSort} onChange={setPickSort} /> : null}
          <FilmPickGrid films={visible} value={filmId} onPick={setFilmId} format={format} sort={showAll ? pickSort : 'none'} onCustom={() => setCustomEdit('new')} />
          {pickedCustom ? (
            <Row onPress={() => setCustomEdit(pickedCustom)} style={{ justifyContent: 'center' }}>
              <Text style={{ fontSize: 17, color: c.safelight }}>{pickedCustom.name} 수정</Text>
            </Row>
          ) : null}
          <Row onPress={() => { setShowAll(!showAll); setSearch('') }} style={{ justifyContent: 'center' }}>
            <Text style={{ fontSize: 17, color: c.safelight }}>{showAll ? '접기' : `더보기 (${stocks.length}종)`}</Text>
          </Row>
        </Group>
        {lot && filmId && !filmById(filmId) ? <Footnote>목록에서 찾을 수 없는 필름이에요. 그대로 저장해도 되고, 다시 고를 수 있어요.</Footnote> : null}
      </Section> : null}
      <Section title="보관">
        <Group>
          {!fixedFilm ? <Chips>{formats.map((item) => <Chip key={item} label={formatInfo[item].name} active={format === item} onPress={() => setFormat(item)} />)}</Chips> : null}
          {/* 수량: 바로 적거나 −/+ 로 (웹·아이폰과 같음) */}
          <View style={{ minHeight: 52, paddingHorizontal: 18, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ flex: 1, fontSize: 17, color: c.ink }}>수량</Text>
            <Btn label="−" size="small" onPress={() => setCount(String(Math.max(0, (Number(count) || 0) - 1)))} />
            <TextInput value={count} onChangeText={(t) => setCount(t.replace(/\D/g, '').slice(0, 2))} keyboardType="number-pad"
              style={{ width: 56, textAlign: 'center', fontSize: 17, color: c.ink, paddingVertical: 6, borderRadius: 10, backgroundColor: c.fill }} />
            <Btn label="+" size="small" onPress={() => setCount(String(Math.min(99, (Number(count) || 0) + 1)))} />
          </View>
          <Field label="부족 알림" value={lowAt} onChangeText={setLowAt} keyboardType="number-pad" />
          <Chips>{(Object.keys(storageName) as FilmStorage[]).map((item) => <Chip key={item} label={storageName[item]} active={storage === item} onPress={() => setStorage(item)} />)}</Chips>
          {storage === 'custom' ? <Field label="보관 장소" value={storagePlace} onChangeText={setStoragePlace} placeholder="예: 카메라 가방" /> : null}
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
      {customEdit && <CustomFilmEdit row={customEdit === 'new' ? undefined : customEdit} onClose={(id) => { if (id !== undefined) setFilmId(id); setCustomEdit(null) }} />}
    </Sheet>
  )
}

/** 필터 모양 고르기 (웹과 같음): UV · ND · CPL … · 그 밖의 색. 고르지 않으면 UV */
const customGlasses: [string, string][] = [['#8a5cd6', '보라'], ['#d65c9c', '분홍'], ['#5cc6d6', '하늘'], ['#9c6b3c', '갈색']]
function GlassPicker({ glass, setGlass }: { name: string; glass?: string; setGlass: (g?: string) => void }) {
  const c = useTheme()
  const current = glass ?? 'clear'
  const cell = (key: string, label: string, value: string | undefined) => {
    const on = current === (value ?? 'clear')
    return (
      <Pressable key={key} onPress={() => setGlass(value)} style={{ width: '25%', alignItems: 'center', gap: 4, paddingVertical: 8, borderRadius: 12,
        backgroundColor: on ? c.fill : undefined, borderWidth: on ? 2 : 0, borderColor: c.safelight }}>
        <FilterRing name="" glass={value} size={44} />
        <Text style={{ fontSize: 12, color: on ? c.ink : c.muted }}>{label}</Text>
      </Pressable>
    )
  }
  return (
    <Section title="필터 모양">
      {/* 웹처럼 한 줄에 4개: 여백은 바깥 묶음에, 칸 나누기는 안쪽 줄에 (여백까지 25%로 계산돼 3개씩 되던 것) */}
      <Group style={{ padding: 6 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {glassPresets.filter((p) => p.kind !== 'star').map((p) => cell(p.kind, p.name, p.kind === 'clear' ? undefined : p.kind))}
          {customGlasses.map(([hex, label]) => cell(hex, label, hex))}
        </View>
      </Group>
    </Section>
  )
}
