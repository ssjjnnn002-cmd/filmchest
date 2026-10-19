import { prepareCameraPhoto } from '../core/cutout'
import { useEffect, useMemo, useState } from 'react'
import { db, rememberCamera } from '../db'
import { cameraPhotoBlob, deleteCameraPhoto, saveCameraPhoto } from '../photoStore'
import type { BodyStyle, Camera, FilmFormat } from '../core/types'
import { formatInfo, styleName, uid } from '../core/types'
import { brandsMatching, catalog, catalogMatch, catalogName, inferStyle, kindText, modelsMatching, type CatalogCamera } from '../core/cameras'
import { profileFor } from '../core/profiles'
import { Model3D } from '../ui/Viewers'
import { Sheet, toInputDate, useObjectURL } from '../ui/common'
import { groupPrice } from '../core/optics'
import { PurchaseFields, rememberSeller, useUsedSellers } from './Gear'
import { features } from '../core/features'

const BODY_COLOR = '#1C1C1E'

export function CameraEdit({ camera, onClose }: { camera?: Camera; onClose: () => void }) {
  const [brand, setBrand] = useState(camera?.brand ?? '')
  const [model, setModel] = useState(camera?.model ?? '')
  const [nickname, setNickname] = useState(camera?.nickname ?? '')
  const [format, setFormat] = useState<FilmFormat>(camera?.format ?? '135')
  const [interchangeable, setInterchangeable] = useState(!!camera?.mount)
  const [mount, setMount] = useState(camera?.mount ?? '')
  const [fixedLens, setFixedLens] = useState(camera?.fixedLens ?? '')
  const [manualStyle, setManualStyle] = useState<BodyStyle | undefined>(camera?.styleManual ? camera.style : undefined)
  const [photo, setPhoto] = useState<Blob | undefined>(camera?.photo)
  const [photoReady, setPhotoReady] = useState(!camera?.hasPhoto || !!camera?.photo)
  useEffect(() => {
    if (!camera?.hasPhoto || camera.photo) return
    let live = true
    void cameraPhotoBlob(camera.id).then((blob) => {
      if (!live) return
      if (blob) setPhoto(blob)
      setPhotoReady(true)
    })
    return () => { live = false }
  }, [camera?.id, camera?.hasPhoto, camera?.photo])
  // 새로 고른 사진 원본 (배경 지우기를 켜고 끌 때 다시 만든다)
  const [original, setOriginal] = useState<Blob>()
  const [removeBg, setRemoveBg] = useState(true)
  const [bgRemoved, setBgRemoved] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [photoScale, setPhotoScale] = useState(camera?.photoScale ?? 1)
  const usePhoto = async (file: Blob, remove: boolean) => {
    setProcessing(true)
    try {
      const r = await prepareCameraPhoto(file, remove)
      setPhoto(r.blob)
      setBgRemoved(r.removed)
    } catch {
      setPhoto(file)
      setBgRemoved(false)
    } finally {
      setProcessing(false)
    }
  }
  const [battery, setBattery] = useState(camera?.battery ?? '')
  const [batteryAt, setBatteryAt] = useState<number | undefined>(camera?.batteryAt)
  const [prewind, setPrewind] = useState<boolean | undefined>(camera?.prewind)
  const usedSellers = useUsedSellers()
  const [purchasedAt, setPurchasedAt] = useState(camera?.purchasedAt)
  const [price, setPrice] = useState(groupPrice(camera?.price ?? ''))
  const [seller, setSeller] = useState(camera?.seller ?? '')
  const [focus, setFocus] = useState<'brand' | 'model' | null>(null)
  const [showCatalog, setShowCatalog] = useState(false)
  const photoURL = useObjectURL(photo)

  const autoStyle = inferStyle(brand, model, format, interchangeable)
  const style = manualStyle ?? autoStyle
  const known = catalogMatch(brand, model)
  const profile = useMemo(() => profileFor(brand, model, style), [brand, model, style])

  const apply = (c: CatalogCamera) => {
    setBrand(c.brand)
    setModel(c.model)
    setFormat(c.format)
    setInterchangeable(!!c.mount)
    setMount(c.mount ?? '')
    setFixedLens(c.lens ?? '')
    if (c.battery) setBattery(c.battery)
    setManualStyle(undefined)
    setFocus(null)
  }

  // 직접 입력한 이름이 아는 모델과 같으면 비어 있는 정보만 채운다
  const onModelChange = (v: string) => {
    setModel(v)
    const k = catalogMatch(brand, v)
    if (k && !mount && !fixedLens) {
      setFormat(k.format)
      setInterchangeable(!!k.mount)
      setMount(k.mount ?? '')
      setFixedLens(k.lens ?? '')
      if (!battery && k.battery) setBattery(k.battery)
    }
  }

  const brandHits = brandsMatching(brand)
  const brandKey = brand.trim().toLowerCase()
  const brandList = [...brandHits.filter((b) => b.toLowerCase() === brandKey), ...brandHits.filter((b) => b.toLowerCase() !== brandKey)]
  const modelHits = modelsMatching(brand, model)
  const modelList = [...modelHits.filter((c) => c === known), ...modelHits.filter((c) => c !== known)].slice(0, 24)

  const save = async () => {
    const all = await db.cameras.toArray()
    const data: Camera = {
      id: camera?.id ?? uid(),
      brand: brand.trim(),
      model: model.trim(),
      nickname: nickname.trim() || undefined,
      format,
      mount: interchangeable ? mount.trim() || undefined : undefined,
      fixedLens: interchangeable ? undefined : fixedLens.trim() || undefined,
      style,
      styleManual: !!manualStyle,
      color: BODY_COLOR,
      hasPhoto: !!photo,
      photoScale: photo ? photoScale : undefined,
      battery: battery.trim() || undefined,
      batteryAt,
      prewind,
      purchasedAt,
      price: groupPrice(price) || undefined,
      seller: seller.trim() || undefined,
      createdAt: camera?.createdAt ?? Date.now(),
      sortOrder: camera?.sortOrder ?? Math.max(0, ...all.map((c) => c.sortOrder)) + 1,
      lensesChosen: camera?.lensesChosen,
      lensIds: camera?.lensIds,
    }
    rememberSeller(seller)
    if (photo) await saveCameraPhoto(data.id, photo)
    else await deleteCameraPhoto(data.id)
    await db.cameras.put(data)
    await rememberCamera(data.id)
    onClose()
  }

  return (
    <Sheet title={camera ? '카메라 수정' : '카메라 추가'} onClose={onClose}
      right={<button className="btn ghost" disabled={!brand.trim() || !model.trim() || !photoReady} onClick={save}><b>저장</b></button>}>

      <div className="section">
        <h2>외관</h2>
        <div className="group" style={{ padding: 12, display: 'grid', gap: 12 }}>
          {photoURL
            ? (
              <div className="photo-preview">
                <img src={photoURL} alt="" style={{ transform: `scale(${photoScale})` }} />
                {processing && <div className="photo-busy"><div className="spinner" /></div>}
              </div>
            )
            : <Model3D profile={profile} color={BODY_COLOR} height={220} />}
          <p className="sub" style={{ textAlign: 'center', margin: 0 }}>{photo ? '사진' : '기본 모형 · 끌어서 돌려 보기'}</p>

          {photo && (
            <div className="toggle" style={{ padding: 0 }}>
              <span>크기</span>
              <input type="range" className="slider" min={0.5} max={1.6} step={0.05} value={photoScale}
                onChange={(e) => setPhotoScale(Number(e.target.value))} aria-label="사진 크기" />
              <button className="btn small" onClick={() => setPhotoScale(1)} disabled={photoScale === 1}>기본</button>
            </div>
          )}

          {!photo && (
            <div className="toggle" style={{ padding: 0 }}>
              <span>형태</span>
              <select className="input" style={{ width: 'auto', textAlign: 'right', color: 'var(--safelight)' }}
                value={style} onChange={(e) => setManualStyle(e.target.value as BodyStyle)}>
                {(Object.keys(styleName) as BodyStyle[]).map((s) => <option key={s} value={s}>{styleName[s]}</option>)}
              </select>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <label className="btn soft small" style={{ cursor: 'pointer' }}>
              {photo ? '사진 바꾸기' : '사진으로 등록'}
              <input type="file" accept="image/png,image/*" hidden onChange={(e) => {
                const f = e.target.files?.[0]
                e.target.value = ''
                if (!f) return
                setOriginal(f)
                setPhotoScale(1)
                void usePhoto(f, removeBg)
              }} />
            </label>
            {photo && <button className="btn small danger" onClick={() => { setPhoto(undefined); setOriginal(undefined) }}>사진 지우고 기본 모형 쓰기</button>}
          </div>
          {photo && (
            <div className="group inner-group">
              <label className="toggle">
                <span>
                  배경 지우기
                  {original && !processing && removeBg && !bgRemoved && <span className="sub" style={{ display: 'block' }}>단색 배경이 아니라 그대로 두었어요</span>}
                </span>
                <input type="checkbox" className="switch" checked={removeBg} disabled={!original || processing}
                  onChange={(e) => { setRemoveBg(e.target.checked); if (original) void usePhoto(original, e.target.checked) }} />
              </label>
            </div>
          )}
          <p className="footnote" style={{ margin: 0 }}>흰 배경처럼 단색 배경은 자동으로 지워요. 사진이 없으면 모델에 맞는 기본 모형으로 보여요.</p>
        </div>
      </div>

      <div className="section">
        <div className="section-title">
          카메라
          <button className="btn ghost small" onClick={() => setShowCatalog(true)}>목록에서 고르기</button>
        </div>
        <div className="group">
          <div className="field">
            <label htmlFor="cam-brand">제조사</label>
            <input id="cam-brand" className="input" value={brand} autoComplete="off"
              onFocus={() => setFocus('brand')} onChange={(e) => setBrand(e.target.value)} />
          </div>
          {focus === 'brand' && brandList.length > 0 && (
            <div className="suggest">
              {brandList.map((b) => (
                <button key={b} className="chip" onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { setBrand(b); setFocus('model'); document.getElementById('cam-model')?.focus() }}>{b}</button>
              ))}
            </div>
          )}
          <div className="field">
            <label htmlFor="cam-model">모델</label>
            <input id="cam-model" className="input" value={model} autoComplete="off"
              onFocus={() => setFocus('model')} onChange={(e) => onModelChange(e.target.value)} />
          </div>
          {focus === 'model' && modelList.length > 0 && (
            <div className="suggest">
              {modelList.map((c) => (
                <button key={catalogName(c)} type="button" className={`chip ${c === known ? 'active' : ''}`}
                  onMouseDown={(e) => e.preventDefault()} onClick={() => apply(c)}>
                  {brand ? c.model : catalogName(c)}
                </button>
              ))}
            </div>
          )}
          <div className="field">
            <label htmlFor="cam-nick">별명 (선택)</label>
            <input id="cam-nick" className="input" value={nickname} onChange={(e) => setNickname(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="cam-format">포맷</label>
            <select id="cam-format" className="input" value={format} onChange={(e) => setFormat(e.target.value as FilmFormat)}>
              {Object.entries(formatInfo).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
            </select>
          </div>
        </div>
        {known && <p className="footnote">✓ {kindText(known)}로 자동 설정했어요.</p>}
      </div>

      <div className="section">
        <h2>렌즈</h2>
        <div className="group">
          <label className="toggle">
            <span>렌즈 교환식</span>
            <input type="checkbox" className="switch" checked={interchangeable} onChange={(e) => setInterchangeable(e.target.checked)} />
          </label>
          <div className="field">
            <label htmlFor="cam-lens">{interchangeable ? '마운트' : '렌즈'}</label>
            {interchangeable
              ? <input id="cam-lens" className="input" value={mount} onChange={(e) => setMount(e.target.value)} />
              : <input id="cam-lens" className="input" value={fixedLens} onChange={(e) => setFixedLens(e.target.value)} />}
          </div>
        </div>
      </div>

      <div className="section">
        <h2>배터리</h2>
        <div className="group">
          <div className="field">
            <label htmlFor="cam-battery">배터리 종류</label>
            <input id="cam-battery" className="input" value={battery} onChange={(e) => setBattery(e.target.value)} />
          </div>
          <label className="toggle">
            <span>마지막 교체일 기록</span>
            <input type="checkbox" className="switch" checked={batteryAt !== undefined}
              onChange={(e) => setBatteryAt(e.target.checked ? Date.now() : undefined)} />
          </label>
          {batteryAt !== undefined && (
            <div className="field">
              <label htmlFor="cam-bdate">마지막 교체</label>
              <input id="cam-bdate" type="date" className="input" value={toInputDate(batteryAt)}
                onChange={(e) => e.target.value && setBatteryAt(new Date(`${e.target.value}T12:00:00`).getTime())} />
            </div>
          )}
        </div>
        <p className="footnote">교체한 지 1년이 지나면 내 장비에서 알려 드려요.</p>
      </div>

      <PurchaseFields date={purchasedAt} setDate={setPurchasedAt} price={price} setPrice={setPrice} seller={seller} setSeller={setSeller}
        used={usedSellers} />

      {features.meter && <div className="section">
        <h2>필름 감기</h2>
        <div className="segmented" role="group" aria-label="필름 감기">
          <button type="button" className={prewind === false ? 'on' : ''} onClick={() => setPrewind(false)}>정순 · 1→끝</button>
          <button type="button" className={prewind === true ? 'on' : ''} onClick={() => setPrewind(true)}>프리와인딩 · 끝→1</button>
        </div>
        <p className="footnote">{prewind == null
          ? '아직 고르지 않았어요. 노출계를 열면 한 번 묻고, 고른 쪽이 이 카메라에 저장돼요.'
          : '프리와인딩은 필름을 먼저 끝까지 감아 두고 카운트가 거꾸로 줄어드는 카메라예요.'}</p>
      </div>}

      {showCatalog && <CatalogPicker onPick={(c) => { apply(c); setShowCatalog(false) }} onClose={() => setShowCatalog(false)} />}
    </Sheet>
  )
}

function CatalogPicker({ onPick, onClose }: { onPick: (c: CatalogCamera) => void; onClose: () => void }) {
  const [q, setQ] = useState('')
  const groups = useMemo(() => {
    const n = (x: string) => x.toLowerCase().replace(/\s+/g, '')
    const list = catalog.filter((c) => !q || n(catalogName(c)).includes(n(q)) || (c.aka ?? []).some((a) => n(a).includes(n(q))))
    const m = new Map<string, CatalogCamera[]>()
    for (const c of list) m.set(c.brand, [...(m.get(c.brand) ?? []), c])
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [q])
  return (
    <Sheet title="카메라 목록" onClose={onClose}>
      <div className="group" style={{ marginBottom: 12 }}>
        <div className="field">
          <label htmlFor="cat-q">검색</label>
          <input id="cat-q" className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="제조사나 모델" autoFocus />
        </div>
      </div>
      {groups.map(([brand, list]) => (
        <div className="section" key={brand}>
          <h2>{brand}</h2>
          <div className="group">
            {list.map((c) => (
              <button key={c.model} className="row" onClick={() => onPick(c)}>
                <div className="grow">
                  <div>{c.model}</div>
                  <div className="sub">{[kindText(c), c.aka?.join(', '), c.battery].filter(Boolean).join(' · ')}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </Sheet>
  )
}
