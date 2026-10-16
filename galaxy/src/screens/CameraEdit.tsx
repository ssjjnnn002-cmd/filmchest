// 웹 pages/CameraEdit.tsx
import { useEffect, useMemo, useState } from 'react'
import { Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { db, rememberCamera } from '../data'
import type { BodyStyle, Camera, FilmFormat } from '../core/types'
import { formatInfo, styleName, uid } from '../core/types'
import { brandsMatching, catalog, catalogMatch, catalogName, inferStyle, kindText, modelsMatching, type CatalogCamera } from '../core/cameras'
import { profileFor } from '../core/profiles'
import { Model3D } from '../Model3D'
import { b64ToBytes, bytesToB64, cameraPhotoBytes, deleteCameraPhoto, readBytes, saveCameraPhoto } from '../files'
import { webTool } from '../webTools'
import { Btn, Chip, DateInput, Field, Footnote, Group, RangeSlider, Row, RowText, Section, Segmented, Select, Spinner, Sub, Toggle } from '../kit'
import { Sheet, SheetBtn } from '../overlay'
import { groupPrice } from '../core/optics'
import { PurchaseFields, rememberSeller, useUsedSellers } from './Gear'
import { useTheme } from '../theme'

const BODY_COLOR = '#1C1C1E'

export function CameraEdit({ camera, onClose }: { camera?: Camera; onClose: () => void }) {
  const c = useTheme()
  const [brand, setBrand] = useState(camera?.brand ?? '')
  const [model, setModel] = useState(camera?.model ?? '')
  const [nickname, setNickname] = useState(camera?.nickname ?? '')
  const [format, setFormat] = useState<FilmFormat>(camera?.format ?? '135')
  const [interchangeable, setInterchangeable] = useState(!!camera?.mount)
  const [mount, setMount] = useState(camera?.mount ?? '')
  const [fixedLens, setFixedLens] = useState(camera?.fixedLens ?? '')
  const [manualStyle, setManualStyle] = useState<BodyStyle | undefined>(camera?.styleManual ? camera.style : undefined)
  // 갤럭시: 사진은 PNG base64로 들고 있다가 저장할 때 파일로
  const [photo, setPhoto] = useState<string | undefined>()
  const [photoReady, setPhotoReady] = useState(!camera?.hasPhoto)
  useEffect(() => {
    if (!camera?.hasPhoto) return
    let live = true
    void cameraPhotoBytes(camera.id).then((bytes) => {
      if (!live) return
      if (bytes) setPhoto(bytesToB64(bytes))
      setPhotoReady(true)
    })
    return () => { live = false }
  }, [camera?.id, camera?.hasPhoto])
  // 새로 고른 사진 원본 (배경 지우기를 켜고 끌 때 다시 만든다)
  const [original, setOriginal] = useState<{ data: string; type: string }>()
  const [removeBg, setRemoveBg] = useState(true)
  const [bgRemoved, setBgRemoved] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [photoScale, setPhotoScale] = useState(camera?.photoScale ?? 1)
  const usePhoto = async (file: { data: string; type: string }, remove: boolean) => {
    setProcessing(true)
    try {
      const r = await webTool<{ data: string; removed: boolean }>('cutout', { data: file.data, type: file.type, remove })
      setPhoto(r.data)
      setBgRemoved(r.removed)
    } catch {
      setPhoto(file.data)
      setBgRemoved(false)
    } finally {
      setProcessing(false)
    }
  }
  const [battery, setBattery] = useState(camera?.battery ?? '')
  const [batteryAt, setBatteryAt] = useState<number | undefined>(camera?.batteryAt)
  const usedSellers = useUsedSellers()
  const [prewind, setPrewind] = useState<boolean | undefined>(camera?.prewind)
  const [purchasedAt, setPurchasedAt] = useState(camera?.purchasedAt)
  const [price, setPrice] = useState(groupPrice(camera?.price ?? ''))
  const [seller, setSeller] = useState(camera?.seller ?? '')
  const [focus, setFocus] = useState<'brand' | 'model' | null>(null)
  const [showCatalog, setShowCatalog] = useState(false)

  const autoStyle = inferStyle(brand, model, format, interchangeable)
  const style = manualStyle ?? autoStyle
  const known = catalogMatch(brand, model)
  const profile = useMemo(() => profileFor(brand, model, style), [brand, model, style])

  const apply = (k: CatalogCamera) => {
    setBrand(k.brand)
    setModel(k.model)
    setFormat(k.format)
    setInterchangeable(!!k.mount)
    setMount(k.mount ?? '')
    setFixedLens(k.lens ?? '')
    if (k.battery) setBattery(k.battery)
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
  const modelList = [...modelHits.filter((k) => k === known), ...modelHits.filter((k) => k !== known)].slice(0, 24)

  const pickPhoto = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 })
    if (res.canceled || !res.assets[0]) return
    const a = res.assets[0]
    const data = bytesToB64(await readBytes(a.uri))
    const file = { data, type: a.mimeType ?? 'image/jpeg' }
    setOriginal(file)
    setPhotoScale(1)
    void usePhoto(file, removeBg)
  }

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
      sortOrder: camera?.sortOrder ?? Math.max(0, ...all.map((x) => x.sortOrder)) + 1,
      lensesChosen: camera?.lensesChosen,
      lensIds: camera?.lensIds,
    }
    rememberSeller(seller)
    if (photo) await saveCameraPhoto(data.id, b64ToBytes(photo))
    else await deleteCameraPhoto(data.id)
    await db.cameras.put(data)
    await rememberCamera(data.id)
    onClose()
  }

  const suggest = (children: React.ReactNode) => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="always" contentContainerStyle={{ gap: 6, paddingHorizontal: 18, paddingBottom: 12 }}>
      {children}
    </ScrollView>
  )

  return (
    <Sheet title={camera ? '카메라 수정' : '카메라 추가'} onClose={onClose}
      right={<SheetBtn label="저장" accent disabled={!brand.trim() || !model.trim() || !photoReady} onPress={save} />}>

      <Section title="외관">
        <Group style={{ padding: 12, gap: 12 }}>
          {photo ? (
            <View style={{ height: 220, borderRadius: 16, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: c.fill }}>
              <Image source={{ uri: `data:image/png;base64,${photo}` }} resizeMode="contain" style={{ width: '100%', height: '100%', transform: [{ scale: photoScale }] }} />
              {processing ? <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: c.dark ? 'rgba(31,29,27,0.6)' : 'rgba(255,255,255,0.6)' }}><Spinner /></View> : null}
            </View>
          ) : processing ? (
            <View style={{ height: 220, alignItems: 'center', justifyContent: 'center' }}><Spinner /></View>
          ) : <Model3D profile={profile} color={BODY_COLOR} height={220} />}
          <View style={{ alignItems: 'center' }}><Sub>{photo ? '사진' : '기본 모형 · 끌어서 돌려 보기'}</Sub></View>

          {photo ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Text style={{ fontSize: 17, color: c.ink }}>크기</Text>
              <RangeSlider value={photoScale} min={0.5} max={1.6} step={0.05} onChange={setPhotoScale} />
              <Btn label="기본" size="small" disabled={photoScale === 1} onPress={() => setPhotoScale(1)} />
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 32 }}>
              <Text style={{ fontSize: 17, color: c.ink }}>형태</Text>
              <View style={{ flex: 1 }}>
                <Select value={style} color={c.safelight} title="형태" onChange={(v) => setManualStyle(v)}
                  options={(Object.keys(styleName) as BodyStyle[]).map((s) => [s, styleName[s]])} />
              </View>
            </View>
          )}

          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <Btn label={photo ? '사진 바꾸기' : '사진으로 등록'} kind="soft" size="small" onPress={pickPhoto} />
            {photo ? <Btn label="사진 지우고 기본 모형 쓰기" kind="danger" size="small" onPress={() => { setPhoto(undefined); setOriginal(undefined) }} /> : null}
          </View>
          {photo ? (
            <View style={{ backgroundColor: c.fill, borderRadius: 16 }}>
              <Toggle label="배경 지우기" value={removeBg}
                sub={original && !processing && removeBg && !bgRemoved ? '단색 배경이 아니라 그대로 두었어요' : undefined}
                onChange={(v) => { if (!original || processing) return; setRemoveBg(v); void usePhoto(original, v) }} />
            </View>
          ) : null}
          <Text style={{ fontSize: 13, color: c.muted, lineHeight: 18 }}>흰 배경처럼 단색 배경은 자동으로 지워요. 사진이 없으면 모델에 맞는 기본 모형으로 보여요.</Text>
        </Group>
      </Section>

      <Section title="카메라" right={<Pressable onPress={() => setShowCatalog(true)}><Text style={{ color: c.safelight, fontSize: 15, fontWeight: '600' }}>목록에서 고르기</Text></Pressable>}
        foot={known ? `✓ ${kindText(known)}로 자동 설정했어요.` : undefined}>
        <Group>
          <Field label="제조사" value={brand} autoCorrect={false} onFocus={() => setFocus('brand')} onChangeText={setBrand} />
          {focus === 'brand' && brandList.length > 0 ? suggest(brandList.map((b) => (
            <Chip key={b} label={b} flat onPress={() => { setBrand(b); setFocus('model') }} />
          ))) : null}
          <Field label="모델" value={model} autoCorrect={false} autoFocus={false} onFocus={() => setFocus('model')} onChangeText={onModelChange} />
          {focus === 'model' && modelList.length > 0 ? suggest(modelList.map((k) => (
            <Chip key={catalogName(k)} label={brand ? k.model : catalogName(k)} flat active={k === known} onPress={() => apply(k)} />
          ))) : null}
          <Field label="별명 (선택)" value={nickname} onChangeText={setNickname} />
          <Field label="포맷">
            <Select value={format} title="포맷" onChange={setFormat} options={(Object.keys(formatInfo) as FilmFormat[]).map((k) => [k, formatInfo[k].name])} />
          </Field>
        </Group>
      </Section>

      <Section title="렌즈">
        <Group>
          <Toggle label="렌즈 교환식" value={interchangeable} onChange={setInterchangeable} />
          {interchangeable
            ? <Field label="마운트" value={mount} onChangeText={setMount} />
            : <Field label="렌즈" value={fixedLens} onChangeText={setFixedLens} />}
        </Group>
      </Section>

      <Section title="배터리" foot="교체한 지 1년이 지나면 내 장비에서 알려 드려요.">
        <Group>
          <Field label="배터리 종류" value={battery} onChangeText={setBattery} />
          <Toggle label="마지막 교체일 기록" value={batteryAt !== undefined} onChange={(v) => setBatteryAt(v ? Date.now() : undefined)} />
          {batteryAt !== undefined ? (
            <Field label="마지막 교체"><DateInput value={batteryAt} onChange={setBatteryAt} /></Field>
          ) : null}
        </Group>
      </Section>

      <PurchaseFields date={purchasedAt} setDate={setPurchasedAt} price={price} setPrice={setPrice} seller={seller} setSeller={setSeller} used={usedSellers} />

      <Section title="필름 감기" foot={prewind == null
        ? '아직 고르지 않았어요. 노출계를 열면 한 번 묻고, 고른 쪽이 이 카메라에 저장돼요.'
        : '프리와인딩은 필름을 먼저 끝까지 감아 두고 카운트가 거꾸로 줄어드는 카메라예요.'}>
        <Segmented<'forward' | 'pre' | 'unset'>
          value={prewind === true ? 'pre' : prewind === false ? 'forward' : 'unset'}
          options={[['forward', '정순 · 1→끝'], ['pre', '프리와인딩 · 끝→1']]}
          onChange={(v) => setPrewind(v === 'pre')} />
      </Section>

      {showCatalog ? <CatalogPicker onPick={(k) => { apply(k); setShowCatalog(false) }} onClose={() => setShowCatalog(false)} /> : null}
    </Sheet>
  )
}

function CatalogPicker({ onPick, onClose }: { onPick: (k: CatalogCamera) => void; onClose: () => void }) {
  const c = useTheme()
  const [q, setQ] = useState('')
  const groups = useMemo(() => {
    const n = (x: string) => x.toLowerCase().replace(/\s+/g, '')
    const list = catalog.filter((k) => !q || n(catalogName(k)).includes(n(q)) || (k.aka ?? []).some((a) => n(a).includes(n(q))))
    const m = new Map<string, CatalogCamera[]>()
    for (const k of list) m.set(k.brand, [...(m.get(k.brand) ?? []), k])
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [q])
  return (
    <Sheet title="카메라 목록" onClose={onClose}>
      <Group style={{ marginBottom: 12 }}>
        <Field label="검색" value={q} onChangeText={setQ} placeholder="제조사나 모델" autoFocus />
      </Group>
      {groups.map(([brand, list]) => (
        <Section key={brand} title={brand}>
          <Group>
            {list.map((k) => (
              <Row key={k.model} onPress={() => onPick(k)}>
                <RowText sub={[kindText(k), k.aka?.join(', '), k.battery].filter(Boolean).join(' · ')}>{k.model}</RowText>
              </Row>
            ))}
          </Group>
        </Section>
      ))}
    </Sheet>
  )
}
