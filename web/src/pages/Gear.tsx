import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import type { CustomFilmRow } from '../core/films'
import { filmById, filmDisplayName } from '../core/films'
import { groupSections, lotKey, type GearGroup, sortLots, type FilmLotSort } from '../core/gearGroup'
import { lensesFor } from '../core/lenses'
import { lensSpec as lensBody } from '../core/lensSpecs'
import { fallbackLensSnapshot, lensSnapshot } from '../core/model3d'
import { LensModel3D } from '../ui/Viewers'
import { filterDiameters, filterKinds, groupPrice, lensSpec, parseLens } from '../core/optics'
import type { FilmFormat, FilmLot, FilmStorage, GearFilter, Lens } from '../core/types'
import { FILTER_KIND, expiredSince, formatInfo, kindOf, priceText, priceValue, uid } from '../core/types'
import { glassPresets, isLensFilter } from '../core/filterLook'
import { FilterRing } from '../ui/FilterRing'
import { getPref } from '../platform'
import { forgetSuggestion, hiddenSet, rememberSuggestion } from '../suggest'
import { deleteCameraPhoto, saveCameraPhoto, useCameraPhoto, usePhotoIsCutout } from '../photoStore'
import { Canister, Confirm, Icon, Sheet } from '../ui/common'
import { CustomFilmEdit } from './CustomFilmEdit'
import { FilmPicker } from '../ui/FilmPicker'
import { PhotoActions } from '../ui/PhotoActions'
import { OptionalDate, TagField, TagLine, accessoryKinds, addAccessoryKind, tagSections } from '../ui/gearExtras'
import { searchMatch } from '../core/searchAlias'

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
  const q = query.trim()
  return list.filter((name) => !q || (name.toLowerCase().includes(q.toLowerCase()) && name.toLowerCase() !== q.toLowerCase())).slice(0, 8)
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
    <div className="section">
      <h2>구입</h2>
      <div className="group">
        <OptionalDate label="구입 날짜" value={date} onChange={setDate} />
        <div className="field">
          <label htmlFor="buy-price">구입 금액</label>
          <input id="buy-price" className="input" inputMode="numeric" value={price} onChange={(e) => setPrice(groupPrice(e.target.value))} />
        </div>
        <div className="field">
          <label htmlFor="buy-seller">구입처</label>
          <input id="buy-seller" className="input" value={seller} onChange={(e) => setSeller(e.target.value)} />
        </div>
        {hits.length > 0 && (
          <div className="suggest">
            {hits.map((name) => (
              <span key={name} className="chip-row">
                <button type="button" onClick={() => setSeller(name)}>{name}</button>
                <button type="button" className="chip-x" aria-label={`${name} 추천 지우기`} onClick={() => { forgetSuggestion('knownSellers', name); setRev((n) => n + 1) }}>×</button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
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

function PhotoField({ id, hasPhoto, blob, setBlob, cleared, setCleared, placeholder }: {
  /** 사진이 없을 때 보일 그림 (필터 링) */
  placeholder?: React.ReactNode
  id?: string
  hasPhoto?: boolean
  blob?: Blob
  setBlob: (b?: Blob) => void
  cleared: boolean
  setCleared: (v: boolean) => void
}) {
  const saved = useCameraPhoto(id, !!hasPhoto && !blob && !cleared)
  const [local, setLocal] = useState<string>()
  useEffect(() => {
    if (!blob) { setLocal(undefined); return }
    const url = URL.createObjectURL(blob)
    setLocal(url)
    return () => URL.revokeObjectURL(url)
  }, [blob])
  const src = local || saved
  const take = (file?: File) => {
    if (!file) return
    setCleared(false)
    setBlob(file)
  }
  // 카메라 탭의 외관 칸과 같은 모양: 넓은 미리보기 + 작은 버튼 한 줄
  return (
    <div className="section">
      <h2>사진</h2>
      <div className="group" style={{ padding: 12, display: 'grid', gap: 12 }}>
        {src ? <div className="photo-preview"><img src={src} alt="" /></div> : <div className="photo-empty">{placeholder ?? <Icon name="camera" size={42} />}</div>}
        <PhotoActions onFile={take} onClear={src ? () => { setBlob(undefined); setCleared(true) } : undefined} />
      </div>
    </div>
  )
}

export function GearBoard({ kind, layout, tag, search = '', grouped = false, filmGroup = 'brand', filmSort = 'name', filmSortDesc = false }: { kind: GearKind; layout: string; tag?: string; search?: string; grouped?: boolean; filmGroup?: GearGroup; filmSort?: FilmLotSort; filmSortDesc?: boolean }) {
  // 자주 사용: 필름마다 쓴 롤 수
  const used = useLiveQuery(async () => { const m: Record<string, number> = {}; for (const r of await db.rolls.toArray()) if (!r.deletedAt) m[r.filmId] = (m[r.filmId] ?? 0) + 1; return m }, []) ?? {}
  const allLenses = useLiveQuery(() => db.lenses.orderBy('createdAt').toArray(), [])
  const allFilters = useLiveQuery(() => db.filters.orderBy('createdAt').toArray(), [])
  const allLots = useLiveQuery(() => db.filmLots.orderBy('createdAt').reverse().toArray(), [])
  const [edit, setEdit] = useState<string | null>(null)
  const q = search.trim().toLowerCase()
  const keep = (tags: string[] | undefined, text: (string | undefined)[]) =>
    (!tag || !!tags?.includes(tag)) && (!q || searchMatch(q, [...text, ...(tags ?? [])]))
  const lenses = (allLenses ?? []).filter((l) => keep(l.tags, [l.brand, l.model, l.mount, lensSpec(l)]))
  const filters = (allFilters ?? []).filter((f) => keep(f.tags, [f.name, kindOf(f), f.diameter]))
  const lots = (allLots ?? []).filter((l) => keep(undefined, [filmDisplayName(filmById(l.filmId)), storageText(l)]))
  const all = kind === 'lens' ? allLenses : kind === 'filter' ? allFilters : allLots
  const shown = kind === 'lens' ? lenses : kind === 'filter' ? filters : lots
  const empty = kind === 'lens' ? ['렌즈가 없어요', '가진 렌즈를 등록해 보세요.']
    : kind === 'filter' ? ['액세서리가 없어요', '필터, 그립, 스트랩처럼 가진 장비를 등록해 보세요.']
    : ['필름 재고가 없어요', '가진 롤을 등록해 보세요.']
  const grid = layout === 'grid'
  const box = (children: React.ReactNode) => <div className={grid ? 'grid' : 'group'}>{children}</div>
  const lensCell = (lens: Lens) => (
    <button key={lens.id} className={grid ? 'card' : 'row'} onClick={() => setEdit(lens.id)} style={{ textAlign: 'left' }}>
      <GearPhoto id={lens.id} hasPhoto={lens.hasPhoto} grid={grid}
        fallback={<LensPicture brand={lens.brand} model={lens.model} mount={lens.mount} height={grid ? 110 : 52} />} />
      <span className="grow">
        {/* 브랜드는 이름 위에 작게 (필름·카메라와 같은 방식) */}
        {(grid || lens.brand) && <small className="lot-brand">{lens.brand || '\u00a0'}</small>}
        <b className={grid ? 'clamp-2 reserve-2' : 'truncate'}>{lens.model || '렌즈'}</b>
        {!grid && <span className="sub truncate">{lensSpec(lens) || lens.mount || '\u00a0'}</span>}
        {grid && <span className="sub clamp-2 reserve-2">{lensSpec(lens) || '\u00a0'}</span>}
        <TagLine tags={lens.tags} />
      </span>
    </button>
  )
  const filterCell = (f: GearFilter) => (
    <button key={f.id} className={grid ? 'card' : 'row'} onClick={() => setEdit(f.id)} style={{ textAlign: 'left' }}>
      {isLensFilter(f.kind)
        ? <span style={{ width: grid ? '100%' : 68, height: grid ? 110 : 52, display: 'grid', placeItems: 'center', flexShrink: 0 }}><FilterRing name={f.name} glass={f.glass} size={grid ? 108 : 52} /></span>
        : <GearPhoto id={f.id} hasPhoto={f.hasPhoto} grid={grid} />}
      <span className="grow">
        <b className={grid ? 'clamp-2 reserve-2' : 'truncate'}>{f.name || kindOf(f)}</b>
        <span className="sub truncate">{[kindOf(f), f.diameter ? `직경 ${f.diameter}mm` : '', f.price ? priceText(priceValue(f.price)) : ''].filter(Boolean).join(' · ')}</span>
        <TagLine tags={f.tags} />
      </span>
    </button>
  )
  const sections = <T extends { tags?: string[] }>(list: T[], cell: (x: T) => React.ReactNode, secs = tagSections(list, grouped)) => (
    secs.map((sec, n) => (
      <div key={sec.title ?? n}>
        {sec.title && <h3 className="group-title">{sec.title} · {sec.items.length}</h3>}
        {box(sec.items.map(cell))}
      </div>
    ))
  )
  const kindOrder = (k: string) => { const i = accessoryKinds().indexOf(k); return i < 0 ? 999 : i }
  return (
    <>
      {all && all.length === 0 && <div className="empty"><b>{empty[0]}</b><span>{empty[1]}</span></div>}
      {all && all.length > 0 && shown.length === 0 && <div className="empty"><b>맞는 장비가 없어요</b></div>}
      {kind === 'lens' && lenses.length > 0 && sections(lenses, lensCell)}
      {kind === 'filter' && filters.length > 0 && sections(filters, filterCell, grouped ? undefined
        : [...new Set(filters.map(kindOf))].sort((a, b) => kindOrder(a) - kindOrder(b)).map((k) => ({ title: k, items: filters.filter((f) => kindOf(f) === k) })))}
      {/* 필름 재고: 브랜드·ISO·흑백/컬러·35mm/120으로 묶어 볼 수 있다 (묶음 안은 이름순) */}
      {/* 필름 재고: 브랜드·ISO·종류·규격으로 묶고, 묶음 안은 알파벳·재고량·자주 사용 순 (오름/내림) */}
      {kind === 'film' && lots.length > 0 && ((s) => (filmSortDesc ? s.reverse() : s))(groupSections(sortLots(lots, filmSort, filmSortDesc, used), (l) => lotKey(l, filmGroup)) as { title?: string; items: FilmLot[] }[])
        .map((sec, n) => <div key={sec.title ?? n}>{sec.title && <h3 className="group-title">{sec.title} · {sec.items.length}</h3>}{box(sec.items.map((lot) => {
        const film = filmById(lot.filmId)
        const late = !!lot.expiresAt && lot.expiresAt < Date.now()
        // 부족·기한 지남: 바둑판은 상자 그림 모서리, 목록은 브랜드 줄 끝 (− + 와 겹치지 않게, 아이폰과 같음)
        const tag = late ? <i className="lot-tag late">기한 {expiredSince(lot.expiresAt!) ?? ''} 지남</i> : lot.count <= lot.lowAt ? <i className="lot-tag low">재고 부족</i> : null
        return (
          <div key={lot.id} className={grid ? 'lot-cell grid' : 'lot-cell'}>
            <button className={grid ? 'card' : 'row'} onClick={() => setEdit(lot.id)} style={{ textAlign: 'left' }}>
              {grid ? <Canister film={film} format={lot.format} cover /> : <Canister film={film} format={lot.format} thumb={[64, 40]} />}
              <span className="grow">
                {/* 바둑판: 브랜드는 이름 위에 작게 (필름 이름이 먼저 눈에 들어오게, 아이폰과 같음) */}
                {(grid || film?.brand || tag) && <small className="lot-brand">{film?.brand || '\u00a0'}{!grid && tag}</small>}
                <b className={grid ? 'clamp-2 reserve-2' : 'truncate'}>{film ? (film.brand ? film.name : filmDisplayName(film)) : filmDisplayName(film)}</b>
                <span className='sub truncate'>{formatInfo[lot.format].name} · {storageText(lot)}</span>
                {grid && <span className="lot-step-space" />}
              </span>
              {!grid && <span className="lot-step-space" />}
            </button>
            {grid && tag && <span className="lot-corner">{tag}</span>}
            <LotStepper count={lot.count} onChange={(n) => void db.filmLots.update(lot.id, { count: n })} />
          </div>
        )
      }))}</div>)}
      {edit && kind === 'lens' && <LensEdit lens={(allLenses ?? []).find((item) => item.id === edit)} onClose={() => setEdit(null)} />}
      {edit && kind === 'filter' && <FilterEdit filter={(allFilters ?? []).find((item) => item.id === edit)} onClose={() => setEdit(null)} />}
      {edit && kind === 'film' && <FilmEdit lot={(allLots ?? []).find((item) => item.id === edit)} onClose={() => setEdit(null)} />}
    </>
  )
}

export function GearAdd({ kind, onClose }: { kind: GearKind; onClose: () => void }) {
  if (kind === 'lens') return <LensEdit onClose={onClose} />
  if (kind === 'filter') return <FilterEdit onClose={onClose} />
  return <FilmEdit onClose={onClose} />
}

const lensShotQueue: Array<() => void> = []
let lensShotBusy = false
/** 목록의 렌즈를 한꺼번에 그리지 않고 한 장씩 만든다 */
function scheduleLensShot(run: () => void) {
  lensShotQueue.push(run)
  if (lensShotBusy) return
  lensShotBusy = true
  const pump = () => {
    const next = lensShotQueue.shift()
    if (!next) { lensShotBusy = false; return }
    next()
    window.setTimeout(pump, 24)
  }
  window.setTimeout(pump, 24)
}

function useLensPreview(brand: string, model: string, mount?: string) {
  const spec = useMemo(() => lensBody(brand, model, mount), [brand, model, mount])
  const [src, setSrc] = useState('')
  useEffect(() => {
    let cancel = false
    try { setSrc(fallbackLensSnapshot(spec)) } catch { setSrc('') }
    scheduleLensShot(() => {
      if (!cancel) {
        try { setSrc(lensSnapshot(spec)) } catch { /* 납작한 그림을 유지 */ }
      }
    })
    return () => { cancel = true }
  }, [spec])
  return src
}

function LensPicture({ brand, model, mount, height }: { brand: string; model: string; mount?: string; height: number }) {
  const src = useLensPreview(brand, model, mount)
  if (!src) return <Icon name="camera" size={28} />
  return <img src={src} alt="" style={{ width: '100%', height, objectFit: 'contain', display: 'block' }} />
}

/** 장비 사진. 바둑판: 그냥 사진이면 카드 위쪽·양옆 끝까지 채운다. 목록: 고정 크기 + 둥근 모서리 */
function GearPhoto({ id, hasPhoto, grid, fallback }: { id: string; hasPhoto?: boolean; grid: boolean; fallback?: React.ReactNode }) {
  const url = useCameraPhoto(id, !!hasPhoto)
  const bleed = usePhotoIsCutout(id, !!url) === false
  // 자리(110px)는 다른 카드와 같게 비워 두고, 사진은 카드 맨 위·양옆 끝에 붙인다
  if (url && grid && bleed) return <span style={{ height: 110, display: 'block' }}><img src={url} alt="" className="card-bleed" /></span>
  return url
    ? <img src={url} alt="" style={{ width: grid ? '100%' : 68, height: grid ? 110 : 52, objectFit: bleed ? 'cover' : 'contain', borderRadius: grid ? 0 : 8, flexShrink: 0 }} />
    : <span style={{ width: grid ? '100%' : 68, height: grid ? 110 : 52, display: 'grid', placeItems: 'center' }}>{fallback ?? <Icon name="camera" size={28} />}</span>
}

function LensEdit({ lens, onClose }: { lens?: Lens; onClose: () => void }) {
  const used = useUsedSellers()
  const [brand, setBrand] = useState(lens?.brand ?? '')
  const [model, setModel] = useState(lens?.model ?? '')
  const [mount, setMount] = useState(lens?.mount ?? '')
  const parsed = parseLens(lens?.model ?? '')
  const [zoom, setZoom] = useState(lens?.zoom ?? parsed.zoom)
  const [focalMin, setFocalMin] = useState(lens?.focalMin ? String(lens.focalMin) : parsed.focalMin ? String(parsed.focalMin) : '')
  const [focalMax, setFocalMax] = useState(lens?.focalMax && lens.focalMax !== lens.focalMin ? String(lens.focalMax) : '')
  const [open, setOpen] = useState(lens?.apertureOpen || parsed.open)
  const [close, setClose] = useState(lens?.apertureClose || parsed.close)
  const [blob, setBlob] = useState<Blob>()
  const [cleared, setCleared] = useState(false)
  const [date, setDate] = useState(lens?.purchasedAt)
  const [price, setPrice] = useState(groupPrice(lens?.price ?? ''))
  const [seller, setSeller] = useState(lens?.seller ?? '')
  const [tags, setTags] = useState<string[]>(lens?.tags ?? [])
  const [confirm, setConfirm] = useState(false)
  const hits = lensesFor(mount, model).filter((name) => name !== model).slice(0, 6)
  const body = useMemo(() => lensBody(brand, model, mount), [brand, model, mount])
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
      hasPhoto: cleared ? false : !!(blob || lens?.hasPhoto),
      purchasedAt: date, price: groupPrice(price) || undefined, seller: seller.trim() || undefined, tags,
      createdAt: lens?.createdAt ?? Date.now(),
    }
    if (blob) await saveCameraPhoto(data.id, blob)
    else if (cleared) await deleteCameraPhoto(data.id)
    await db.lenses.put(data)
    rememberSeller(seller)
    onClose()
  }
  return (
    <Sheet title={lens ? '렌즈 수정' : '렌즈 추가'} onClose={onClose}
      right={<button className="btn ghost" disabled={!model.trim() || !mount.trim()} onClick={save}><b>저장</b></button>}>
      <PhotoField id={lens?.id} hasPhoto={lens?.hasPhoto} blob={blob} setBlob={setBlob} cleared={cleared} setCleared={setCleared}
        placeholder={<LensModel3D spec={body} height={190} />} />
      <div className="section">
        <h2>렌즈</h2>
        <div className="group">
          <div className="field"><label htmlFor="ln-mount">마운트</label><input id="ln-mount" className="input" value={mount} onChange={(e) => setMount(e.target.value)} /></div>
          <div className="field"><label htmlFor="ln-brand">제조사</label><input id="ln-brand" className="input" value={brand} onChange={(e) => setBrand(e.target.value)} /></div>
          <div className="field"><label htmlFor="ln-model">렌즈</label><input id="ln-model" className="input" value={model} onChange={(e) => setModel(e.target.value)} /></div>
          {hits.length > 0 && <div className="suggest">{hits.map((name) => <button key={name} type="button" className="chip" onClick={() => apply(name)}>{name}</button>)}</div>}
        </div>
      </div>
      <TagField tags={tags} setTags={setTags} />
      <div className="section">
        <h2>사양</h2>
        <div className="group">
          <div className="segmented">
            <button type="button" className={!zoom ? 'on' : ''} onClick={() => setZoom(false)}>단렌즈</button>
            <button type="button" className={zoom ? 'on' : ''} onClick={() => setZoom(true)}>줌렌즈</button>
          </div>
          <div className="field"><label htmlFor="ln-min">{zoom ? '짧은 화각' : '화각'}</label>
            <div className="unit-field"><input id="ln-min" className="input" inputMode="numeric" value={focalMin} onChange={(e) => setFocalMin(e.target.value.replace(/\D/g, ''))} /><span className="unit-mark">mm</span></div></div>
          {zoom && <div className="field"><label htmlFor="ln-max">긴 화각</label>
            <div className="unit-field"><input id="ln-max" className="input" inputMode="numeric" value={focalMax} onChange={(e) => setFocalMax(e.target.value.replace(/\D/g, ''))} /><span className="unit-mark">mm</span></div></div>}
          <div className="field"><label htmlFor="ln-open">최대개방</label>
            <div className="unit-field"><span className="unit-mark">f/</span><input id="ln-open" className="input" inputMode="decimal" value={open} onChange={(e) => setOpen(e.target.value)} /></div></div>
          <div className="field"><label htmlFor="ln-close">최소개방</label>
            <div className="unit-field"><span className="unit-mark">f/</span><input id="ln-close" className="input" inputMode="decimal" value={close} onChange={(e) => setClose(e.target.value)} /></div></div>
        </div>
      </div>
      <PurchaseFields date={date} setDate={setDate} price={price} setPrice={setPrice} seller={seller} setSeller={setSeller} used={used} />
      {lens && <div className="group"><button className="row danger" onClick={() => setConfirm(true)}>렌즈 삭제</button></div>}
      {confirm && lens && <Confirm message="이 렌즈를 삭제할까요? 이 렌즈로 찍은 롤 기록은 남아요." onCancel={() => setConfirm(false)}
        onConfirm={async () => { await db.lenses.delete(lens.id); onClose() }} />}
    </Sheet>
  )
}

/** 액세서리 추가·수정 (유형은 사용자가 더할 수 있다) */
export function FilterEdit({ filter, onClose, onSaved }: { filter?: GearFilter; onClose: () => void; onSaved?: (f: GearFilter) => void }) {
  const used = useUsedSellers()
  const [kind, setKind] = useState(filter ? kindOf(filter) : FILTER_KIND)
  const [kinds, setKinds] = useState(() => { const k = accessoryKinds(); return filter && !k.includes(kindOf(filter)) ? [...k, kindOf(filter)] : k })
  const [name, setName] = useState(filter?.name ?? '')
  const [diameter, setDiameter] = useState(filter?.diameter ?? '')
  const [glass, setGlass] = useState(filter?.glass)
  const [blob, setBlob] = useState<Blob>()
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
      hasPhoto: isFilter ? false : cleared ? false : !!(blob || filter?.hasPhoto),
      purchasedAt: date, price: groupPrice(price) || undefined, seller: seller.trim() || undefined, tags,
      createdAt: filter?.createdAt ?? Date.now(),
    }
    if (isFilter) { if (filter?.hasPhoto) await deleteCameraPhoto(data.id) }
    else if (blob) await saveCameraPhoto(data.id, blob)
    else if (cleared) await deleteCameraPhoto(data.id)
    await db.filters.put(data)
    rememberSeller(seller)
    onSaved?.(data)
    onClose()
  }
  return (
    <Sheet title={filter ? '액세서리 수정' : '액세서리 추가'} onClose={onClose}
      right={<button className="btn ghost" disabled={!name.trim()} onClick={save}><b>저장</b></button>}>
      {/* 렌즈 필터는 사진 대신 늘 기본 그림 (유리 색만 고른다) */}
      {isFilter
        ? <div className="section"><div className="group filter-preview"><FilterRing name={name} glass={glass} size={190} /></div></div>
        : <PhotoField id={filter?.id} hasPhoto={filter?.hasPhoto} blob={blob} setBlob={setBlob} cleared={cleared} setCleared={setCleared} />}
      <div className="section">
        <h2>액세서리</h2>
        <div className="group">
          <div className="field">
            <label htmlFor="ac-kind">유형</label>
            <select id="ac-kind" className="input" value={kind} onChange={(e) => { if (e.target.value === '__add') setNewKind(''); else setKind(e.target.value) }}>
              {kinds.map((k) => <option key={k} value={k}>{k}</option>)}
              <option value="__add">유형 추가…</option>
            </select>
          </div>
          {newKind !== null && (
            <div className="field">
              <input className="input left" autoFocus placeholder="새 유형 (예: 핫슈 수평계)" value={newKind} onChange={(e) => setNewKind(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') (e.currentTarget.nextSibling as HTMLButtonElement | null)?.click() }} />
              <button type="button" className="btn small" disabled={!newKind.trim()} onClick={() => {
                addAccessoryKind(newKind); setKinds(accessoryKinds()); setKind(newKind.trim()); setNewKind(null)
              }}>추가</button>
            </div>
          )}
          <div className="field"><label htmlFor="ft-name">{isFilter ? '종류' : '이름'}</label><input id="ft-name" className="input" value={name} onChange={(e) => setName(e.target.value)} /></div>
          {hints.length > 0 && <div className="suggest">{hints.map((item) => <button key={item} type="button" className="chip" onClick={() => setName(item)}>{item}</button>)}</div>}
          {isFilter && <>
            <div className="field"><label htmlFor="ft-mm">직경</label><input id="ft-mm" className="input" inputMode="decimal" value={diameter} onChange={(e) => setDiameter(e.target.value)} /><span className="unit">mm</span></div>
            <div className="suggest">{filterDiameters.filter((item) => item !== diameter).map((item) => <button key={item} type="button" className="chip" onClick={() => setDiameter(item)}>{item}</button>)}</div>
          </>}
        </div>
      </div>
      {isFilter && (
        <div className="section">
          <h2>필터 모양</h2>
          <div className="group glass-picker">
            {glassPresets.filter((p) => p.kind !== 'star').map((p) => (
              <button key={p.kind} type="button" className={(glass ?? 'clear') === p.kind ? 'on' : ''} onClick={() => setGlass(p.kind === 'clear' ? undefined : p.kind)}>
                <FilterRing name="" glass={p.kind} size={44} /><span>{p.name}</span>
              </button>
            ))}
            <label className={glass?.startsWith('#') ? 'on' : ''}>
              <FilterRing name="" glass={glass?.startsWith('#') ? glass : '#8a5cd6'} size={44} /><span>직접</span>
              <input type="color" value={glass?.startsWith('#') ? glass : '#8a5cd6'} onChange={(e) => setGlass(e.target.value)} />
            </label>
          </div>
        </div>
      )}
      <TagField tags={tags} setTags={setTags} />
      <PurchaseFields date={date} setDate={setDate} price={price} setPrice={setPrice} seller={seller} setSeller={setSeller} used={used} />
      {filter && <div className="group"><button className="row danger" onClick={() => setConfirm(true)}>액세서리 삭제</button></div>}
      {confirm && filter && <Confirm message="이 액세서리를 삭제할까요?" onCancel={() => setConfirm(false)}
        onConfirm={async () => { await db.filters.delete(filter.id); onClose() }} />}
    </Sheet>
  )
}

/** 카메라에 쓰는 액세서리: 액세서리 탭에 등록한 것에서 고르고, 없으면 바로 추가하고 돌아온다 */
export function AccessoryLinkFields({ ids, setIds, bodyPrice }: { ids: string[]; setIds: (v: string[]) => void; bodyPrice: string }) {
  const items = useLiveQuery(() => db.filters.orderBy('createdAt').toArray(), []) ?? []
  const [picking, setPicking] = useState(false)
  const [adding, setAdding] = useState(false)
  const chosen = ids.map((id) => items.find((x) => x.id === id)).filter((x): x is GearFilter => !!x)
  const total = priceValue(bodyPrice) + chosen.reduce((n, a) => n + priceValue(a.price), 0)
  const toggle = (id: string) => setIds(ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id])
  const kinds = [...new Set(items.map(kindOf))]
  return (
    <div className="section">
      <h2>액세서리</h2>
      <div className="group">
        {chosen.map((a) => (
          <div key={a.id} className="row static">
            <span className="grow"><span className="truncate">{a.name}</span><span className="sub">{kindOf(a)}</span></span>
            {a.price && <span className="value">{priceText(priceValue(a.price))}</span>}
            <button type="button" className="chip-x" aria-label={`${a.name} 빼기`} onClick={() => toggle(a.id)}>×</button>
          </div>
        ))}
        <button type="button" className="row accent" onClick={() => setPicking(true)}><Icon name="plus" /> 액세서리 고르기</button>
        {total > 0 && <div className="row static"><span className="grow">본체 + 액세서리</span><b>{priceText(total)}</b></div>}
      </div>
      <p className="footnote">내 장비의 액세서리 탭에 등록한 것에서 골라요.</p>
      {picking && (
        <Sheet title="액세서리 고르기" onClose={() => setPicking(false)} left={<span />} right={<button className="btn ghost" onClick={() => setPicking(false)}><b>완료</b></button>}>
          <div className="group" style={{ marginTop: 8 }}>
            <button type="button" className="row accent" onClick={() => setAdding(true)}><Icon name="plus" /> 새 액세서리 추가</button>
          </div>
          {items.length === 0 && <p className="footnote">등록된 액세서리가 없어요. 추가하면 여기서 바로 골라져요.</p>}
          {kinds.map((k) => (
            <div key={k} className="section">
              <h2>{k}</h2>
              <div className="group">
                {items.filter((x) => kindOf(x) === k).map((a) => (
                  <button key={a.id} type="button" className="row" onClick={() => toggle(a.id)}>
                    <span className="grow"><span className="truncate">{a.name}</span>
                      <span className="sub">{[a.diameter ? `직경 ${a.diameter}mm` : '', a.price ? priceText(priceValue(a.price)) : ''].filter(Boolean).join(' · ') || '\u00a0'}</span></span>
                    <span style={{ color: ids.includes(a.id) ? 'var(--safelight)' : 'var(--muted)', fontSize: 20 }}>{ids.includes(a.id) ? '●' : '○'}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
          {adding && <FilterEdit onClose={() => setAdding(false)} onSaved={(f) => { if (!ids.includes(f.id)) setIds([...ids, f.id]) }} />}
        </Sheet>
      )}
    </div>
  )
}

function FilmEdit({ lot, onClose }: { lot?: FilmLot; onClose: () => void }) {
  const used = useUsedSellers()
  const custom = useLiveQuery(() => db.customFilms.orderBy('createdAt').reverse().toArray(), []) ?? []
  const [filmId, setFilmId] = useState(lot?.filmId ?? '')
  const [format, setFormat] = useState<FilmFormat>(lot?.format ?? '135')
  const [count, setCount] = useState(lot?.count ?? 1)
  const [lowAt, setLowAt] = useState(lot?.lowAt ?? 1)
  const [storage, setStorage] = useState<FilmStorage>(lot?.storage ?? 'fridge')
  const [storagePlace, setStoragePlace] = useState(lot?.storagePlace ?? '')
  const [expires, setExpires] = useState(lot?.expiresAt)
  const [date, setDate] = useState(lot?.purchasedAt)
  const [price, setPrice] = useState(groupPrice(lot?.price ?? ''))
  const [seller, setSeller] = useState(lot?.seller ?? '')
  const [customEdit, setCustomEdit] = useState<CustomFilmRow | 'new' | null>(null)
  const [confirm, setConfirm] = useState(false)
  // 이미 있는 재고는 필름 종류·포맷을 바꾸지 않는다 (목록에 없는 필름·직접 만든 필름은 고를 수 있다, 아이폰과 같음)
  const fixedFilm = lot && filmById(filmId) && !filmId.startsWith('custom-') ? filmById(filmId) : undefined
  const save = async () => {
    const data: FilmLot = {
      id: lot?.id ?? uid(), filmId, format, count, lowAt, storage, storagePlace: storage === 'custom' ? storagePlace.trim() || undefined : undefined, expiresAt: expires,
      purchasedAt: date, price: groupPrice(price) || undefined, seller: seller.trim() || undefined,
      createdAt: lot?.createdAt ?? Date.now(),
    }
    await db.filmLots.put(data)
    rememberSeller(seller)
    onClose()
  }
  return (
    <Sheet title={lot ? '필름 수정' : '필름 추가'} onClose={onClose}
      right={<button className="btn ghost" disabled={!filmId} onClick={save}><b>저장</b></button>}>
      {fixedFilm && (
        <div className="section">
          <div className="group">
            <div className="row static" style={{ gap: 14 }}>
              <Canister film={fixedFilm} format={format} size={52} />
              <span className="grow">{fixedFilm.brand && <span className="sub">{fixedFilm.brand}</span>}<b>{fixedFilm.brand ? fixedFilm.name : filmDisplayName(fixedFilm)}</b><span className="sub">{formatInfo[format].name}</span></span>
            </div>
          </div>
        </div>
      )}
      {!fixedFilm && (
        <FilmPicker format={format} anyFormat filmId={filmId || undefined}
          onPick={(id, f) => { setFilmId(id); if (f) setFormat(f) }}
          onAddCustom={() => setCustomEdit('new')} onEditCustom={(id) => setCustomEdit(custom.find((r) => r.id === id) ?? null)}
          footer={lot && filmId && !filmById(filmId) && <p className="footnote warn">목록에서 찾을 수 없는 필름이에요. 그대로 저장해도 되고, 다시 고를 수 있어요.</p>} />
      )}
      <div className="section">
        <h2>보관</h2>
        <div className="group">
          {!fixedFilm && <div className="field">
            <label htmlFor="lot-format">포맷</label>
            <select id="lot-format" className="input" value={format} onChange={(e) => setFormat(e.target.value as FilmFormat)}>
              {formats.map((item) => <option key={item} value={item}>{formatInfo[item].name}</option>)}
            </select>
          </div>}
          {/* 수량: 바로 적거나 −/+ 로 */}
          <div className="toggle">
            <label htmlFor="lot-count">수량</label>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button type="button" className="btn small" aria-label="수량 줄이기" onClick={() => setCount(Math.max(0, count - 1))}>−</button>
              <input id="lot-count" className="input" inputMode="numeric" style={{ width: 56, textAlign: 'center', padding: '6px 4px' }} value={count}
                onChange={(e) => setCount(Math.max(0, Math.min(99, Number(e.target.value.replace(/\D/g, '')) || 0)))} />
              <button type="button" className="btn small" aria-label="수량 늘리기" onClick={() => setCount(Math.min(99, count + 1))}>+</button>
            </span>
          </div>
          <div className="field"><label htmlFor="lot-low">부족 알림</label><input id="lot-low" className="input" inputMode="numeric" value={lowAt} onChange={(e) => setLowAt(Math.max(0, Math.min(20, Number(e.target.value.replace(/\D/g, '')) || 0)))} /></div>
          <div className="field">
            <label htmlFor="lot-keep">보관</label>
            <select id="lot-keep" className="input" value={storage} onChange={(e) => setStorage(e.target.value as FilmStorage)}>
              {(Object.keys(storageName) as FilmStorage[]).map((item) => <option key={item} value={item}>{storageName[item]}</option>)}
            </select>
          </div>
          {storage === 'custom' && <div className="field"><label htmlFor="lot-place">보관 장소</label>
            <input id="lot-place" className="input" placeholder="예: 카메라 가방" value={storagePlace} onChange={(e) => setStoragePlace(e.target.value)} /></div>}
          <label className="toggle">
            <span>유통기한</span>
            <input type="checkbox" className="switch" checked={expires !== undefined} onChange={(e) => setExpires(e.target.checked ? Date.now() : undefined)} />
          </label>
          {expires !== undefined && (
            <div className="field"><label htmlFor="lot-exp">기한</label>
              <input id="lot-exp" type="date" className="input" value={new Date(expires).toISOString().slice(0, 10)}
                onChange={(e) => e.target.value && setExpires(new Date(`${e.target.value}T12:00:00`).getTime())} /></div>
          )}
        </div>
      </div>
      <PurchaseFields date={date} setDate={setDate} price={price} setPrice={setPrice} seller={seller} setSeller={setSeller} used={used} />
      {lot && <div className="group"><button className="row danger" onClick={() => setConfirm(true)}>재고 삭제</button></div>}
      {confirm && lot && <Confirm message="이 재고를 삭제할까요?" onCancel={() => setConfirm(false)}
        onConfirm={async () => { await db.filmLots.delete(lot.id); onClose() }} />}
      {customEdit && (
        <CustomFilmEdit row={customEdit === 'new' ? undefined : customEdit} onClose={(id) => { if (id !== undefined) setFilmId(id); setCustomEdit(null) }} />
      )}
    </Sheet>
  )
}

/** 재고 칸에서 바로 한 롤씩 빼고 더하기: [− 3롤 +] (아이폰과 같음) */
function LotStepper({ count, onChange }: { count: number; onChange: (n: number) => void }) {
  return (
    <span className="lot-stepper">
      <button type="button" aria-label="한 롤 빼기" disabled={count <= 0} onClick={() => onChange(Math.max(0, count - 1))}>−</button>
      <b>{count}롤</b>
      <button type="button" aria-label="한 롤 더하기" onClick={() => onChange(count + 1)}>+</button>
    </span>
  )
}
