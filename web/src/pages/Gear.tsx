import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import type { CustomFilmRow } from '../core/films'
import { allFilms, filmById, filmDisplayName, popularFilms } from '../core/films'
import { lensesFor } from '../core/lenses'
import { filmFits, filterDiameters, filterKinds, groupPrice, lensSpec, parseLens } from '../core/optics'
import type { FilmFormat, FilmLot, FilmStorage, GearFilter, Lens } from '../core/types'
import { formatInfo, uid } from '../core/types'
import { getPref } from '../platform'
import { forgetSuggestion, hiddenSet, rememberSuggestion } from '../suggest'
import { deleteCameraPhoto, saveCameraPhoto, useCameraPhoto } from '../photoStore'
import { Canister, Confirm, Icon, Sheet } from '../ui/common'
import { CustomFilmEdit } from './CustomFilmEdit'
import { TagField } from '../ui/gearExtras'

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
        <div className="field">
          <label htmlFor="buy-date">구입 날짜</label>
          <input id="buy-date" type="date" className="input" value={date !== undefined ? new Date(date).toISOString().slice(0, 10) : ''}
            onChange={(e) => setDate(e.target.value ? new Date(`${e.target.value}T12:00:00`).getTime() : undefined)} />
          {date !== undefined && <button type="button" className="chip-x" aria-label="구입 날짜 지우기" onClick={() => setDate(undefined)}>×</button>}
        </div>
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

function PhotoField({ id, hasPhoto, blob, setBlob, cleared, setCleared }: {
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
  return (
    <div className="section">
      <h2>사진</h2>
      <div className="group" style={{ padding: 12, display: 'grid', gap: 8, justifyItems: 'center' }}>
        {src ? <img src={src} alt="" style={{ maxHeight: 160, objectFit: 'contain' }} /> : <Icon name="camera" size={42} />}
        <label className="btn">
          사진 찍기
          <input type="file" accept="image/*" capture="environment" hidden onChange={(e) => take(e.target.files?.[0])} />
        </label>
        <label className="btn">
          앨범에서 사진 고르기
          <input type="file" accept="image/*" hidden onChange={(e) => take(e.target.files?.[0])} />
        </label>
        {src && <button type="button" className="btn" onClick={() => { setBlob(undefined); setCleared(true) }}>사진 지우기</button>}
      </div>
    </div>
  )
}

export function GearBoard({ kind, layout, tag }: { kind: GearKind; layout: string; tag?: string }) {
  const lenses = useLiveQuery(() => db.lenses.orderBy('createdAt').filter((x) => !tag || (x.tags ?? []).includes(tag)).toArray(), [tag])
  const filters = useLiveQuery(() => db.filters.orderBy('createdAt').filter((x) => !tag || (x.tags ?? []).includes(tag)).toArray(), [tag])
  const lots = useLiveQuery(() => db.filmLots.orderBy('createdAt').reverse().toArray(), [])
  const [edit, setEdit] = useState<string | 'new' | null>(null)
  const items = kind === 'lens' ? lenses : kind === 'filter' ? filters : lots
  const empty = kind === 'lens' ? ['렌즈가 없어요', '가진 렌즈를 등록해 보세요.']
    : kind === 'filter' ? ['필터가 없어요', '가진 필터를 등록해 보세요.']
    : ['필름 재고가 없어요', '가진 롤을 등록해 보세요.']
  return (
    <>
      {items && items.length === 0 && (
        <div className="empty"><b>{empty[0]}</b><span>{empty[1]}</span></div>
      )}
      {items && items.length > 0 && (
        <div className={layout === 'grid' ? 'grid' : 'group'}>
          {kind === 'lens' && (lenses ?? []).map((lens) => (
            <button key={lens.id} className={layout === 'grid' ? 'card' : 'row'} onClick={() => setEdit(lens.id)} style={{ textAlign: 'left' }}>
              <GearPhoto id={lens.id} hasPhoto={lens.hasPhoto} grid={layout === 'grid'} />
              <span className="grow">
                <b className={layout === 'grid' ? 'clamp-2' : 'truncate'}>{lens.model || '렌즈'}</b>
                {lens.brand && <span className={layout === 'grid' ? 'sub clamp-1' : 'sub'}>{lens.brand}</span>}
                {lensSpec(lens) && <span className={layout === 'grid' ? 'sub clamp-2' : 'sub'}>{lensSpec(lens)}</span>}
              </span>
            </button>
          ))}
          {kind === 'filter' && (filters ?? []).map((filter) => (
            <button key={filter.id} className={layout === 'grid' ? 'card' : 'row'} onClick={() => setEdit(filter.id)} style={{ textAlign: 'left' }}>
              <GearPhoto id={filter.id} hasPhoto={filter.hasPhoto} grid={layout === 'grid'} />
              <span className="grow">
                <b className={layout === 'grid' ? 'clamp-2' : 'truncate'}>{filter.name || '필터'}</b>
                {filter.diameter && <span className={layout === 'grid' ? 'sub clamp-1' : 'sub'}>직경 {filter.diameter}mm</span>}
              </span>
            </button>
          ))}
          {kind === 'film' && (lots ?? []).map((lot) => {
            const film = filmById(lot.filmId)
            const late = !!lot.expiresAt && lot.expiresAt < Date.now()
            return (
              <button key={lot.id} className={layout === 'grid' ? 'card' : 'row'} onClick={() => setEdit(lot.id)} style={{ textAlign: 'left' }}>
                <Canister film={film} format={lot.format} size={layout === 'grid' ? 110 : 52} />
                <span className="grow">
                  <b className={layout === 'grid' ? 'clamp-2' : 'truncate'}>{filmDisplayName(film)}</b>
                  <span className={layout === 'grid' ? 'sub clamp-2' : 'sub'}>{formatInfo[lot.format].name} · {storageName[lot.storage]} · {lot.count}롤</span>
                  {late && <span className="sub" style={{ color: 'var(--warn, #ff453a)' }}>기한 지남</span>}
                  {!late && lot.count <= lot.lowAt && <span className="sub" style={{ color: '#ff9f0a' }}>부족</span>}
                </span>
              </button>
            )
          })}
        </div>
      )}
      {edit && kind === 'lens' && <LensEdit lens={(lenses ?? []).find((item) => item.id === edit)} onClose={() => setEdit(null)} />}
      {edit && kind === 'filter' && <FilterEdit filter={(filters ?? []).find((item) => item.id === edit)} onClose={() => setEdit(null)} />}
      {edit && kind === 'film' && <FilmEdit lot={(lots ?? []).find((item) => item.id === edit)} onClose={() => setEdit(null)} />}
      {edit === 'new' ? null : null}
    </>
  )
}

export function GearAdd({ kind, onClose }: { kind: GearKind; onClose: () => void }) {
  if (kind === 'lens') return <LensEdit onClose={onClose} />
  if (kind === 'filter') return <FilterEdit onClose={onClose} />
  return <FilmEdit onClose={onClose} />
}

function GearPhoto({ id, hasPhoto, grid }: { id: string; hasPhoto?: boolean; grid: boolean }) {
  const url = useCameraPhoto(id, !!hasPhoto)
  return url
    ? <img src={url} alt="" style={{ width: grid ? '100%' : 68, height: grid ? 110 : 52, objectFit: 'contain' }} />
    : <span style={{ width: grid ? '100%' : 68, height: grid ? 110 : 52, display: 'grid', placeItems: 'center' }}><Icon name="camera" size={28} /></span>
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
      <PhotoField id={lens?.id} hasPhoto={lens?.hasPhoto} blob={blob} setBlob={setBlob} cleared={cleared} setCleared={setCleared} />
      <div className="section">
        <h2>렌즈</h2>
        <div className="group">
          <div className="field"><label htmlFor="ln-mount">마운트</label><input id="ln-mount" className="input" value={mount} onChange={(e) => setMount(e.target.value)} /></div>
          <div className="field"><label htmlFor="ln-brand">제조사</label><input id="ln-brand" className="input" value={brand} onChange={(e) => setBrand(e.target.value)} /></div>
          <div className="field"><label htmlFor="ln-model">렌즈</label><input id="ln-model" className="input" value={model} onChange={(e) => setModel(e.target.value)} /></div>
          {hits.length > 0 && <div className="suggest">{hits.map((name) => <button key={name} type="button" className="chip" onClick={() => apply(name)}>{name}</button>)}</div>}
        </div>
      </div>
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
      <TagField tags={tags} setTags={setTags} />
      {lens && <div className="group"><button className="row danger" onClick={() => setConfirm(true)}>렌즈 삭제</button></div>}
      {confirm && lens && <Confirm message="이 렌즈를 삭제할까요? 이 렌즈로 찍은 롤 기록은 남아요." onCancel={() => setConfirm(false)}
        onConfirm={async () => { await db.lenses.delete(lens.id); onClose() }} />}
    </Sheet>
  )
}

function FilterEdit({ filter, onClose }: { filter?: GearFilter; onClose: () => void }) {
  const used = useUsedSellers()
  const [name, setName] = useState(filter?.name ?? '')
  const [diameter, setDiameter] = useState(filter?.diameter ?? '')
  const [blob, setBlob] = useState<Blob>()
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
      hasPhoto: cleared ? false : !!(blob || filter?.hasPhoto),
      purchasedAt: date, price: groupPrice(price) || undefined, seller: seller.trim() || undefined, tags,
      createdAt: filter?.createdAt ?? Date.now(),
    }
    if (blob) await saveCameraPhoto(data.id, blob)
    else if (cleared) await deleteCameraPhoto(data.id)
    await db.filters.put(data)
    rememberSeller(seller)
    onClose()
  }
  return (
    <Sheet title={filter ? '필터 수정' : '필터 추가'} onClose={onClose}
      right={<button className="btn ghost" disabled={!name.trim() || !diameter.replace(/[^\d.]/g, '')} onClick={save}><b>저장</b></button>}>
      <PhotoField id={filter?.id} hasPhoto={filter?.hasPhoto} blob={blob} setBlob={setBlob} cleared={cleared} setCleared={setCleared} />
      <div className="section">
        <h2>필터</h2>
        <div className="group">
          <div className="field"><label htmlFor="ft-name">종류</label><input id="ft-name" className="input" value={name} onChange={(e) => setName(e.target.value)} /></div>
          {kinds.length > 0 && <div className="suggest">{kinds.map((item) => <button key={item} type="button" className="chip" onClick={() => setName(item)}>{item}</button>)}</div>}
          <div className="field"><label htmlFor="ft-mm">직경 (mm)</label><input id="ft-mm" className="input" inputMode="decimal" value={diameter} onChange={(e) => setDiameter(e.target.value)} /></div>
          <div className="suggest">{filterDiameters.filter((item) => item !== diameter).map((item) => <button key={item} type="button" className="chip" onClick={() => setDiameter(item)}>{item}</button>)}</div>
        </div>
      </div>
      <PurchaseFields date={date} setDate={setDate} price={price} setPrice={setPrice} seller={seller} setSeller={setSeller} used={used} />
      <TagField tags={tags} setTags={setTags} />
      {filter && <div className="group"><button className="row danger" onClick={() => setConfirm(true)}>필터 삭제</button></div>}
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
  const [count, setCount] = useState(lot?.count ?? 1)
  const [lowAt, setLowAt] = useState(lot?.lowAt ?? 1)
  const [storage, setStorage] = useState<FilmStorage>(lot?.storage ?? 'fridge')
  const [expires, setExpires] = useState(lot?.expiresAt)
  const [date, setDate] = useState(lot?.purchasedAt)
  const [price, setPrice] = useState(groupPrice(lot?.price ?? ''))
  const [seller, setSeller] = useState(lot?.seller ?? '')
  const [search, setSearch] = useState('')
  const [showAll, setShowAll] = useState(false)
  const [customEdit, setCustomEdit] = useState<CustomFilmRow | 'new' | null>(null)
  const [confirm, setConfirm] = useState(false)
  const stocks = useMemo(() => {
    const recent = rolls.map((roll) => roll.filmId)
    const list = allFilms()
      .filter((stock) => filmFits(stock.formats, format))
      .filter((stock) => !search || filmDisplayName(stock).toLowerCase().includes(search.toLowerCase()))
    const rank = (stock: { id: string }) => {
      const recentAt = recent.indexOf(stock.id)
      const popularAt = popularFilms.indexOf(stock.id)
      return [(recentAt < 0 ? 999 : recentAt), (popularAt < 0 ? 999 : popularAt)] as const
    }
    return list.sort((a, b) => { const ra = rank(a), rb = rank(b); return ra[0] - rb[0] || ra[1] - rb[1] })
  }, [rolls, format, search, custom])
  const visible = showAll ? stocks : stocks.slice(0, 6)
  const save = async () => {
    const data: FilmLot = {
      id: lot?.id ?? uid(), filmId, format, count, lowAt, storage, expiresAt: expires,
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
      <div className="section">
        <h2>{showAll ? '필름' : '필름 · 최근 사용'}</h2>
        <div className="group">
          {showAll && <div className="field"><label htmlFor="lot-q">필름 검색</label><input id="lot-q" className="input" value={search} onChange={(e) => setSearch(e.target.value)} /></div>}
          <div className="film-grid">
            {visible.map((stock) => (
              <button key={stock.id} type="button" className={`film-pick ${filmId === stock.id ? 'on' : ''}`} onClick={() => setFilmId(stock.id)}>
                <Canister film={stock} format={format} size={84} />
                <span>{filmDisplayName(stock)}</span>
              </button>
            ))}
            <button type="button" className="film-pick custom-add" onClick={() => setCustomEdit('new')}>
              <span className="custom-plus" aria-hidden="true">+</span>
              <span>직접 추가</span>
            </button>
          </div>
          <button type="button" className="row" style={{ justifyContent: 'center', color: 'var(--safelight)' }}
            onClick={() => { setShowAll(!showAll); setSearch('') }}>{showAll ? '접기' : `더보기 (${stocks.length}종)`}</button>
        </div>
      </div>
      <div className="section">
        <h2>보관</h2>
        <div className="group">
          <div className="field">
            <label htmlFor="lot-format">포맷</label>
            <select id="lot-format" className="input" value={format} onChange={(e) => setFormat(e.target.value as FilmFormat)}>
              {formats.map((item) => <option key={item} value={item}>{formatInfo[item].name}</option>)}
            </select>
          </div>
          <div className="field"><label htmlFor="lot-count">수량</label><input id="lot-count" className="input" inputMode="numeric" value={count} onChange={(e) => setCount(Math.max(0, Math.min(99, Number(e.target.value.replace(/\D/g, '')) || 0)))} /></div>
          <div className="field"><label htmlFor="lot-low">부족 알림</label><input id="lot-low" className="input" inputMode="numeric" value={lowAt} onChange={(e) => setLowAt(Math.max(0, Math.min(20, Number(e.target.value.replace(/\D/g, '')) || 0)))} /></div>
          <div className="field">
            <label htmlFor="lot-keep">보관</label>
            <select id="lot-keep" className="input" value={storage} onChange={(e) => setStorage(e.target.value as FilmStorage)}>
              {(Object.keys(storageName) as FilmStorage[]).map((item) => <option key={item} value={item}>{storageName[item]}</option>)}
            </select>
          </div>
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
        <CustomFilmEdit row={customEdit === 'new' ? undefined : customEdit} onClose={(id) => { if (id) setFilmId(id); setCustomEdit(null) }} />
      )}
    </Sheet>
  )
}
