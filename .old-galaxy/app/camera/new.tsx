import { useMemo, useState } from 'react'
import { Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { deleteCamera, getCamera, saveCamera, setCameraPrewind, useDb } from '../../src/db'
import { brandsMatching, catalog, catalogMatch, catalogName, inferStyle, kindText, modelsMatching, type CatalogCamera } from '../../src/cameras'
import { ModelView } from '../../src/ModelView'
import { Confirm, Sheet } from '../../src/chrome'
import { formatInfo, styleName, type BodyStyle, type FilmFormat } from '../../src/types'
import { useTheme } from '../../src/theme'

export default function CameraForm() {
  useDb()
  const c = useTheme()
  const { id } = useLocalSearchParams<{ id?: string }>()
  const existing = id ? getCamera(id) : undefined
  const [brand, setBrand] = useState(existing?.brand ?? '')
  const [model, setModel] = useState(existing?.model ?? '')
  const [nickname, setNickname] = useState(existing?.nickname ?? '')
  const [format, setFormat] = useState<FilmFormat>(existing?.format ?? '135')
  const [interchangeable, setInterchangeable] = useState(!!existing?.mount)
  const [mount, setMount] = useState(existing?.mount ?? '')
  const [fixedLens, setFixedLens] = useState(existing?.fixedLens ?? '')
  const [manualStyle, setManualStyle] = useState<BodyStyle | undefined>(existing?.style)
  const [battery, setBattery] = useState(existing?.battery ?? '')
  const [prewind, setPrewind] = useState<boolean | null>(existing?.prewind ?? null)
  const [focus, setFocus] = useState<'brand' | 'model' | null>(null)
  const [catalogOpen, setCatalogOpen] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [menu, setMenu] = useState<'style' | 'format' | null>(null)

  const autoStyle = inferStyle(brand, model, format, interchangeable)
  const style = manualStyle ?? autoStyle
  const known = catalogMatch(brand, model)
  const brandHits = brandsMatching(brand)
  const brandKey = brand.trim().toLowerCase()
  const brandList = [...brandHits.filter((item) => item.toLowerCase() === brandKey), ...brandHits.filter((item) => item.toLowerCase() !== brandKey)].slice(0, 24)
  const modelHits = modelsMatching(brand, model)
  const modelList = [...modelHits.filter((item) => item === known), ...modelHits.filter((item) => item !== known)].slice(0, 24)

  const apply = (camera: CatalogCamera) => {
    setBrand(camera.brand)
    setModel(camera.model)
    setFormat(camera.format)
    setInterchangeable(!!camera.mount)
    setMount(camera.mount ?? '')
    setFixedLens(camera.lens ?? '')
    if (camera.battery) setBattery(camera.battery)
    setManualStyle(undefined)
    setFocus(null)
    setCatalogOpen(false)
  }

  const onModel = (value: string) => {
    setModel(value)
    const match = catalogMatch(brand, value)
    if (match && !mount && !fixedLens) {
      setFormat(match.format)
      setInterchangeable(!!match.mount)
      setMount(match.mount ?? '')
      setFixedLens(match.lens ?? '')
      if (!battery && match.battery) setBattery(match.battery)
    }
  }

  const save = () => {
    if (!brand.trim() || !model.trim()) return
    const savedId = saveCamera({
      id: existing?.id,
      brand, model, nickname,
      format,
      style,
      mount: interchangeable ? mount : '',
      fixedLens: interchangeable ? '' : fixedLens,
      battery,
    })
    if (prewind !== (existing?.prewind ?? null)) setCameraPrewind(savedId, prewind)
    router.back()
  }

  return (
    <View style={{ flex: 1 }}>
      <Sheet
        tall
        title={existing ? '카메라 수정' : '카메라 추가'}
        onClose={() => router.back()}
        right="저장"
        rightDisabled={!brand.trim() || !model.trim()}
        onRight={save}
      >
        <View style={{ gap: 8 }}>
          <Text style={{ color: c.muted, fontSize: 13, fontWeight: '600', paddingHorizontal: 4 }}>외관</Text>
          <View style={{ backgroundColor: c.cell, borderRadius: 22, padding: 12, gap: 12 }}>
            <View style={{ height: 180, alignItems: 'center', justifyContent: 'center' }}>
              <ModelView brand={brand} model={model} style={style} height={160} />
            </View>
            <Text style={{ color: c.muted, fontSize: 14, textAlign: 'center' }}>기본 모형</Text>
            <Pressable onPress={() => setMenu('style')} style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ flex: 1, fontSize: 17, color: c.ink }}>형태</Text>
              <Text style={{ fontSize: 17, color: c.safelight }}>{styleName[style]}</Text>
            </Pressable>
            <Text style={{ color: c.muted, fontSize: 13, lineHeight: 18 }}>사진이 없으면 모델에 맞는 기본 모형으로 보여요.</Text>
          </View>
        </View>

        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 }}>
            <Text style={{ color: c.muted, fontSize: 13, fontWeight: '600' }}>카메라</Text>
            <Pressable onPress={() => setCatalogOpen(true)}><Text style={{ color: c.safelight, fontSize: 15, fontWeight: '600' }}>목록에서 고르기</Text></Pressable>
          </View>
          <View style={{ backgroundColor: c.cell, borderRadius: 22, overflow: 'hidden' }}>
            <Labeled label="제조사" value={brand} onChangeText={(value) => { setBrand(value); setFocus('brand') }} onFocus={() => setFocus('brand')} />
            {focus === 'brand' && brandList.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingBottom: 12 }}>
                {brandList.map((item) => (
                  <Pressable key={item} onPress={() => { setBrand(item); setFocus('model') }} style={{ height: 32, paddingHorizontal: 12, borderRadius: 16, backgroundColor: c.fill, justifyContent: 'center' }}>
                    <Text style={{ color: c.ink, fontSize: 14 }}>{item}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}
            <Labeled label="모델" value={model} onChangeText={onModel} onFocus={() => setFocus('model')} />
            {focus === 'model' && modelList.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingBottom: 12 }}>
                {modelList.map((item) => {
                  const on = item === known
                  return (
                    <Pressable key={catalogName(item)} onPress={() => apply(item)} style={{ height: 32, paddingHorizontal: 12, borderRadius: 16, backgroundColor: on ? c.safelight : c.fill, justifyContent: 'center' }}>
                      <Text style={{ color: on ? '#fff' : c.ink, fontSize: 14 }}>{brand ? item.model : catalogName(item)}</Text>
                    </Pressable>
                  )
                })}
              </ScrollView>
            ) : null}
            <Labeled label="별명" value={nickname} onChangeText={setNickname} placeholder="선택" />
            <Pressable onPress={() => setMenu('format')} style={{ minHeight: 52, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Text style={{ width: 72, fontSize: 17, color: c.ink }}>포맷</Text>
              <Text style={{ flex: 1, fontSize: 17, color: c.muted, textAlign: 'right' }}>{formatInfo[format].name}</Text>
            </Pressable>
          </View>
          {known ? <Text style={{ color: c.muted, fontSize: 13, paddingHorizontal: 16 }}>✓ {kindText(known)}로 자동 설정했어요.</Text> : null}
        </View>

        <View style={{ gap: 8 }}>
          <Text style={{ color: c.muted, fontSize: 13, fontWeight: '600', paddingHorizontal: 4 }}>렌즈</Text>
          <View style={{ backgroundColor: c.cell, borderRadius: 22, overflow: 'hidden' }}>
            <View style={{ minHeight: 52, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ flex: 1, fontSize: 17, color: c.ink }}>렌즈 교환식</Text>
              <Switch value={interchangeable} onValueChange={setInterchangeable} trackColor={{ true: c.safelight, false: c.fill }} />
            </View>
            <Labeled label={interchangeable ? '마운트' : '렌즈'} value={interchangeable ? mount : fixedLens} onChangeText={interchangeable ? setMount : setFixedLens} placeholder={interchangeable ? '예: MD' : '예: 40mm f/2.8'} last />
          </View>
        </View>

        <View style={{ gap: 8 }}>
          <Text style={{ color: c.muted, fontSize: 13, fontWeight: '600', paddingHorizontal: 4 }}>배터리</Text>
          <View style={{ backgroundColor: c.cell, borderRadius: 22, overflow: 'hidden' }}>
            <Labeled label="배터리" value={battery} onChangeText={setBattery} placeholder="예: SR44 ×2" last />
          </View>
          <Text style={{ color: c.muted, fontSize: 13, lineHeight: 18, paddingHorizontal: 16 }}>교체한 지 1년이 지나면 내 장비에서 알려 드려요.</Text>
        </View>

        <View style={{ gap: 8 }}>
          <Text style={{ color: c.muted, fontSize: 13, fontWeight: '600', paddingHorizontal: 4 }}>필름 감기</Text>
          <View style={{ backgroundColor: c.cell, borderRadius: 22, overflow: 'hidden' }}>
            <View style={{ minHeight: 52, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ flex: 1, fontSize: 17, color: c.ink }}>프리와인딩 카메라</Text>
              <Switch value={!!prewind} onValueChange={setPrewind} trackColor={{ true: c.safelight, false: c.fill }} />
            </View>
          </View>
          <Text style={{ color: c.muted, fontSize: 13, lineHeight: 18, paddingHorizontal: 16 }}>필름을 먼저 끝까지 감아 두고, 카운트가 거꾸로 줄어드는 카메라예요.</Text>
        </View>

        {existing ? (
          <Pressable onPress={() => setConfirm(true)} style={{ height: 52, borderRadius: 22, backgroundColor: c.cell, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: c.danger, fontSize: 17 }}>카메라 삭제</Text>
          </Pressable>
        ) : null}
      </Sheet>
      {menu === 'style' ? (
        <ChoiceSheet title="형태" value={style} onClose={() => setMenu(null)}
          options={(Object.keys(styleName) as BodyStyle[]).map((item) => ({ id: item, label: styleName[item] }))}
          onPick={(id) => { setManualStyle(id as BodyStyle); setMenu(null) }} />
      ) : null}
      {menu === 'format' ? (
        <ChoiceSheet title="포맷" value={format} onClose={() => setMenu(null)}
          options={(Object.keys(formatInfo) as FilmFormat[]).map((item) => ({ id: item, label: formatInfo[item].name }))}
          onPick={(id) => { setFormat(id as FilmFormat); setMenu(null) }} />
      ) : null}
      {catalogOpen ? <CatalogPicker onPick={apply} onClose={() => setCatalogOpen(false)} /> : null}
      {confirm && existing ? (
        <Confirm
          message="이 카메라를 삭제할까요? 필름에 적힌 카메라 정보는 남고, 24시간 안에는 설정에서 되돌릴 수 있어요."
          onCancel={() => setConfirm(false)}
          onConfirm={() => { deleteCamera(existing.id); setConfirm(false); router.back() }}
        />
      ) : null}
    </View>
  )
}

function ChoiceSheet({ title, options, value, onPick, onClose }: {
  title: string
  options: { id: string; label: string }[]
  value: string
  onPick: (id: string) => void
  onClose: () => void
}) {
  const c = useTheme()
  return (
    <Sheet title={title} onClose={onClose}>
      <View style={{ backgroundColor: c.cell, borderRadius: 22, overflow: 'hidden' }}>
        {options.map((option, index) => (
          <Pressable key={option.id} onPress={() => onPick(option.id)} style={{
            minHeight: 52, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center',
            borderTopWidth: index ? 0.5 : 0, borderTopColor: c.sep,
          }}>
            <Text style={{ flex: 1, color: c.ink, fontSize: 17 }}>{option.label}</Text>
            {option.id === value ? <Text style={{ color: c.safelight, fontSize: 17, fontWeight: '700' }}>✓</Text> : null}
          </Pressable>
        ))}
      </View>
    </Sheet>
  )
}

function Labeled({ label, value, onChangeText, onFocus, placeholder, last }: {
  label: string
  value: string
  onChangeText: (value: string) => void
  onFocus?: () => void
  placeholder?: string
  last?: boolean
}) {
  const c = useTheme()
  return (
    <View style={{ minHeight: 52, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: last ? 0 : 0.5, borderBottomColor: c.sep }}>
      <Text style={{ width: 72, fontSize: 17, color: c.ink }}>{label}</Text>
      <TextInput value={value} onChangeText={onChangeText} onFocus={onFocus} placeholder={placeholder} placeholderTextColor={c.faint}
        style={{ flex: 1, fontSize: 17, color: c.ink, textAlign: 'right', paddingVertical: 12 }} />
    </View>
  )
}

function CatalogPicker({ onPick, onClose }: { onPick: (camera: CatalogCamera) => void; onClose: () => void }) {
  const c = useTheme()
  const [query, setQuery] = useState('')
  const groups = useMemo(() => {
    const fold = (value: string) => value.toLowerCase().replace(/\s+/g, '')
    const needle = fold(query)
    const list = catalog.filter((camera) => !needle || fold(catalogName(camera)).includes(needle) || (camera.aka ?? []).some((name) => fold(name).includes(needle)))
    const map = new Map<string, CatalogCamera[]>()
    for (const camera of list) map.set(camera.brand, [...(map.get(camera.brand) ?? []), camera])
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [query])
  return (
    <Sheet title="카메라 목록" onClose={onClose} tall>
      <View style={{ backgroundColor: c.cell, borderRadius: 22, overflow: 'hidden' }}>
        <Labeled label="검색" value={query} onChangeText={setQuery} placeholder="제조사나 모델" last />
      </View>
      {groups.map(([name, list]) => (
        <View key={name} style={{ gap: 8 }}>
          <Text style={{ color: c.muted, fontSize: 13, fontWeight: '600', paddingHorizontal: 4 }}>{name}</Text>
          <View style={{ backgroundColor: c.cell, borderRadius: 22, overflow: 'hidden' }}>
            {list.map((camera, index) => (
              <Pressable key={camera.model} onPress={() => onPick(camera)} style={{ minHeight: 52, paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: index ? 0.5 : 0, borderTopColor: c.sep }}>
                <Text style={{ color: c.ink, fontSize: 17 }}>{camera.model}</Text>
                <Text style={{ color: c.muted, fontSize: 14, marginTop: 2 }}>{[kindText(camera), camera.aka?.join(', '), camera.battery].filter(Boolean).join(' · ')}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ))}
    </Sheet>
  )
}
