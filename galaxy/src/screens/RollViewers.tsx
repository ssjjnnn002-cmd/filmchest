// 웹 pages/RollViewers.tsx + ui/Viewers.tsx ZoomView
import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Animated, Image, Modal, Pressable, ScrollView, Text, View } from 'react-native'
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import Svg, { Path } from 'react-native-svg'
import { db } from '../data'
import { useLiveQuery } from '../store'
import { useNav } from '../App'
import type { Camera, Frame, Roll } from '../core/types'
import { formatInfo } from '../core/types'
import { exposureText, meterShotAt } from '../core/meter'
import { edgeMarking } from '../core/films'
import { bytesText, cameraName, dateRangeText, fmtDayTime, resolutionText, rollCameraFormat, rollFilm, rollFilmName, rollTitle, sortedLocations } from '../core/display'
import { Btn, Field, Group, Section, Toggle } from '../kit'
import { Icon } from '../icons'
import { Sheet, SheetBtn } from '../overlay'
import { b64ToBytes, bytesToB64, readBytes, writeBytes } from '../files'
import { saveFileNow } from '../platform'
import { saveImagesToGallery } from '../gallery'
import { webTool } from '../webTools'
import { rotatedFile, rotatedForView } from '../scan'
import { useTheme } from '../theme'

/** 필름 롤을 펼친 모양. 가장자리 구멍은 바탕색으로 뚫는다. */
export function FilmStrip({ roll, frames, onSelect }: { roll: Roll; frames: Frame[]; onSelect: (i: number) => void }) {
  const c = useTheme()
  const camera = useLiveQuery(() => (roll.cameraId ? db.cameras.get(roll.cameraId) : undefined), [roll.cameraId])
  const fmt = formatInfo[rollCameraFormat(camera, roll)]
  const h = 120
  const w = h * fmt.aspect
  const film = rollFilm(roll)
  const fw = w + 8
  const edge = (top: boolean, label: string) => {
    const tw = fw / 8, hy = top ? 4 : 15
    let d = ''
    if (!fmt.is120) {
      for (let k = 0; k < 8; k++) {
        const x = k * tw + (tw - 7) / 2
        d += `M${x + 1.5} ${hy}h4a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5h-4a1.5 1.5 0 0 1-1.5-1.5v-8a1.5 1.5 0 0 1 1.5-1.5Z`
      }
    }
    return (
      <View style={{ width: fw, height: 30, backgroundColor: c.filmBase }}>
        {d ? <Svg width={fw} height={30} style={{ position: 'absolute' }}><Path d={d} fill={c.paper} /></Svg> : null}
        <Text style={{ position: 'absolute', left: 10, [top ? 'bottom' : 'top']: 2, fontFamily: 'monospace', fontSize: 9, fontWeight: '700', color: c.edgeInk, letterSpacing: 0.7 }}>{label}</Text>
      </View>
    )
  }
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }}>
      {frames.map((f, i) => (
        <Pressable key={f.id} onPress={() => onSelect(i)} accessibilityLabel={`${f.index}번 컷`}>
          {edge(true, film ? edgeMarking(film) : '')}
          <View style={{ backgroundColor: c.filmBase, paddingHorizontal: 4 }}>
            <View style={{ width: w, height: h, backgroundColor: '#000', overflow: 'hidden' }}>
              {f.thumb ? <Image source={{ uri: f.thumb }} style={{ width: '100%', height: '100%' }} resizeMode="cover" /> : null}
              {f.favorite ? <Text style={{ position: 'absolute', top: 5, right: 6, color: c.safelight, fontSize: 13, textShadowColor: '#000', textShadowRadius: 2 }}>♥</Text> : null}
            </View>
          </View>
          {edge(false, `${f.index} ▸ ${f.index}A`)}
        </Pressable>
      ))}
    </ScrollView>
  )
}

/** 확대/이동 보기: 두 손가락 확대, 끌어서 이동, 두 번 눌러 확대/원래대로. onSwipe가 있으면 원래 크기에서 좌우로 밀 때. */
export function ZoomView({ uri, onSwipe, background = 'transparent' }: { uri: string; onSwipe?: (dir: 1 | -1) => void; background?: string }) {
  const [box, setBox] = useState({ w: 0, h: 0 })
  const [nat, setNat] = useState({ w: 0, h: 0 })
  const t = useRef({ s: 1, x: 0, y: 0, fit: 1 })
  const tx = useRef(new Animated.Value(0)).current
  const ty = useRef(new Animated.Value(0)).current
  const sc = useRef(new Animated.Value(1)).current
  const start = useRef({ s: 1, x: 0, y: 0 })
  useEffect(() => { Image.getSize(uri, (w, h) => setNat({ w, h }), () => {}) }, [uri])
  const apply = () => {
    const { s, x, y } = t.current
    // 이미지를 원래 크기로 두고 왼쪽 위 기준으로 옮긴 뒤 키운다
    tx.setValue(x + (nat.w * s - nat.w) / 2)
    ty.setValue(y + (nat.h * s - nat.h) / 2)
    sc.setValue(s)
  }
  const clamp = () => {
    const k = t.current
    const w = nat.w * k.s, h = nat.h * k.s
    k.x = w <= box.w ? (box.w - w) / 2 : Math.min(0, Math.max(box.w - w, k.x))
    k.y = h <= box.h ? (box.h - h) / 2 : Math.min(0, Math.max(box.h - h, k.y))
  }
  const fit = () => {
    if (!box.w || !nat.w) return
    const f = Math.min(box.w / nat.w, box.h / nat.h)
    t.current = { s: f, fit: f, x: (box.w - nat.w * f) / 2, y: (box.h - nat.h * f) / 2 }
    apply()
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(fit, [box.w, box.h, nat.w, nat.h])
  const zoomAt = (px: number, py: number, ns: number) => {
    const k = t.current
    ns = Math.min(Math.max(ns, k.fit), k.fit * 10)
    k.x = px - ((px - k.x) * ns) / k.s
    k.y = py - ((py - k.y) * ns) / k.s
    k.s = ns
    clamp()
    apply()
  }
  const zoomed = () => t.current.s > t.current.fit * 1.01
  const pinch = Gesture.Pinch().runOnJS(true)
    .onStart(() => { start.current = { ...t.current } })
    .onUpdate((e) => zoomAt(e.focalX, e.focalY, start.current.s * e.scale))
  const pan = Gesture.Pan().runOnJS(true).minDistance(6)
    .onStart(() => { start.current = { ...t.current } })
    .onUpdate((e) => {
      if (!zoomed()) return
      t.current.x = start.current.x + e.translationX
      t.current.y = start.current.y + e.translationY
      clamp()
      apply()
    })
    .onEnd((e) => {
      if (onSwipe && start.current.s <= t.current.fit * 1.01 && e.numberOfPointers <= 1 && Math.abs(e.translationX) > 50) onSwipe(e.translationX < 0 ? 1 : -1)
    })
  const dbl = Gesture.Tap().numberOfTaps(2).runOnJS(true).onEnd((e) => {
    if (t.current.s > t.current.fit * 1.05) fit()
    else zoomAt(e.x, e.y, t.current.fit * 3)
  })
  return (
    <GestureDetector gesture={Gesture.Simultaneous(pinch, pan, dbl)}>
      <View collapsable={false} onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
        style={{ flex: 1, overflow: 'hidden', backgroundColor: background }}>
        {nat.w ? (
          <Animated.Image source={{ uri }} style={{ position: 'absolute', left: 0, top: 0, width: nat.w, height: nat.h,
            transform: [{ translateX: tx }, { translateY: ty }, { scale: sc }] }} />
        ) : null}
      </View>
    </GestureDetector>
  )
}

function RoundBtn({ icon, label, onPress, color = '#fff', disabled, bg }: { icon: string; label: string; onPress: () => void; color?: string; disabled?: boolean; bg?: string }) {
  return (
    <Pressable accessibilityLabel={label} disabled={disabled} onPress={onPress}
      style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: bg, opacity: disabled ? 0.4 : pressed ? 0.6 : 1 })}>
      <Icon name={icon} size={22} color={color} />
    </Pressable>
  )
}

/** 한 장씩 보기: 좌우로 넘기기, 확대, 하트 */
export function FrameViewer({ frames, start, onClose }: { frames: Frame[]; start: number; onClose: () => void }) {
  const c = useTheme()
  const nav = useNav()
  const insets = useSafeAreaInsets()
  const [i, setI] = useState(start)
  const frame = frames[i]
  const original = useLiveQuery(() => (frame ? db.originals.get(frame.id) : undefined), [frame?.id])
  const live = useLiveQuery(() => (frame ? db.frames.get(frame.id) : undefined), [frame?.id])
  const roll = useLiveQuery(() => (frame ? db.rolls.get(frame.rollId) : undefined), [frame?.rollId])
  const step = (d: number) => setI((x) => Math.min(Math.max(x + d, 0), frames.length - 1))
  const turns = ((live?.rotation ?? frame?.rotation ?? 0) % 4 + 4) % 4
  const src = frame ? (original && !/\.tiff?$/i.test(frame.name ?? '') ? original.blob : frame.thumb) : undefined
  const [rotatedUri, setRotatedUri] = useState<string>()
  useEffect(() => {
    setRotatedUri(undefined)
    if (!src || !turns || !frame) return
    let alive = true
    void rotatedForView(src, turns, frame.id).then((u) => { if (alive) setRotatedUri(u) })
    return () => { alive = false }
  }, [src, turns, frame?.id])
  const rotate = (d: number) => { if (frame) void db.frames.update(frame.id, { rotation: ((turns + d) % 4 + 4) % 4 }) }
  if (!frame) return null
  // 안드로이드가 그릴 수 없는 TIFF 원본은 썸네일로 본다
  const viewable = turns ? rotatedUri : src
  const fav = live?.favorite ?? frame.favorite
  const shot = meterShotAt(roll?.meterShots, frame.index, roll?.meterOffset ?? 0)
  const isCover = (roll?.coverIndex ?? 1) === frame.index
  return (
    <Modal visible animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#000' }}>
        <StatusBar style="light" />
        <View style={{ paddingTop: insets.top + 10, paddingBottom: 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <Btn label="닫기" kind="ghost" onPress={onClose} />
          <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600', fontVariant: ['tabular-nums'] }}>{i + 1} / {frames.length}</Text>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            <RoundBtn icon="heart" label={fav ? '즐겨찾기 해제' : '즐겨찾기'} color={fav ? c.safelight : '#fff'} onPress={() => db.frames.update(frame.id, { favorite: !fav })} />
            {original ? (
              <RoundBtn icon="download" label="이 사진 갤러리에 저장" onPress={async () => {
                const ext = (frame.name?.split('.').pop() ?? 'jpg').toLowerCase()
                const name = `${String(frame.index).padStart(2, '0')}.${ext}`
                const r = await saveImagesToGallery([{ uri: await rotatedFile(original.blob, frame.rotation, frame.id), name }])
                nav.toast(r.saved ? '갤러리에 저장했어요' : r.denied ? '사진 저장을 허용해 주세요' : '갤러리에 저장하지 못했어요')
              }} />
            ) : null}
          </View>
        </View>
        <View style={{ flex: 1 }}>
          {viewable ? <ZoomView key={`${frame.id}-${turns}`} uri={viewable} background="#000" onSwipe={step} /> : null}
          <View style={{ position: 'absolute', left: 8, top: '50%' }}><RoundBtn icon="left" label="이전" bg="rgba(0,0,0,0.4)" disabled={i === 0} onPress={() => step(-1)} /></View>
          <View style={{ position: 'absolute', right: 8, top: '50%' }}><RoundBtn icon="right" label="다음" bg="rgba(0,0,0,0.4)" disabled={i === frames.length - 1} onPress={() => step(1)} /></View>
        </View>
        <View style={{ alignItems: 'center', paddingTop: 10, paddingHorizontal: 16, paddingBottom: insets.bottom + 14 }}>
          <View style={{ flexDirection: 'row', gap: 28, marginBottom: 6 }}>
            <RoundBtn icon="rotate.left" label="왼쪽으로 돌리기" onPress={() => rotate(-1)} />
            <RoundBtn icon="rotate.right" label="오른쪽으로 돌리기" onPress={() => rotate(1)} />
          </View>
          {shot ? <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600', marginBottom: 2 }}>{exposureText(shot)}</Text> : null}
          <Text style={{ color: '#fff', fontSize: 13 }}>{[frame.takenAt ? fmtDayTime(frame.takenAt) : undefined, frame.locationName].filter(Boolean).join(' · ')}</Text>
          <Text style={{ color: '#fff', opacity: 0.6, fontSize: 13 }}>{[resolutionText(frame.w, frame.h), bytesText(frame.bytes)].filter(Boolean).join(' · ')}</Text>
          <Pressable disabled={isCover} onPress={async () => { await db.rolls.update(frame.rollId, { coverIndex: frame.index }); nav.toast('대표 사진으로 정했어요') }}
            style={{ marginTop: 10, height: 44, paddingHorizontal: 14, borderRadius: 22, justifyContent: 'center', backgroundColor: 'rgba(40,40,40,0.6)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.1)', opacity: isCover ? 0.4 : 1 }}>
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '500' }}>{isCover ? '대표 사진' : '대표 사진으로 지정'}</Text>
          </Pressable>
        </View>
      </GestureHandlerRootView>
    </Modal>
  )
}

function headerFor(roll: Roll, camera?: Camera, lensName?: string) {
  const parts = [rollFilmName(roll) + (roll.shotISO ? ` @ ${roll.shotISO}` : '')]
  const name = cameraName(camera, roll)
  if (name && name !== ' ' && name !== '카메라 알 수 없음') {
    parts.push([name, lensName ?? camera?.fixedLens].filter(Boolean).join(' + '))
  }
  parts.push(dateRangeText(roll))
  const places = sortedLocations(roll).map((l) => l.name).filter(Boolean)
  if (places.length) parts.push(places.join(', '))
  if (roll.lab) parts.push(roll.lab)
  return parts.join('  ·  ')
}

/** 밀착 인화지 미리보기. 저장은 만들기를 누른 다음 고른다. (그림은 웹 contactSheet.ts) */
export function ContactSheetView({ roll, frames, onClose }: { roll: Roll; frames: Frame[]; onClose: () => void }) {
  const c = useTheme()
  const nav = useNav()
  const insets = useSafeAreaInsets()
  const camera = useLiveQuery(() => (roll.cameraId ? db.cameras.get(roll.cameraId) : undefined), [roll.cameraId])
  const lens = useLiveQuery(() => (roll.lensId ? db.lenses.get(roll.lensId) : undefined), [roll.lensId])
  const [useTitle, setUseTitle] = useState(!!roll.note)
  const [title, setTitle] = useState(roll.note ?? '')
  const [info, setInfo] = useState(true)
  const [uri, setUri] = useState<string>()
  const [exporting, setExporting] = useState(false)
  const [canMake, setCanMake] = useState(false)
  const thumbs = useRef<(string | null)[] | null>(null)

  useEffect(() => {
    let cancelled = false
    const t = setTimeout(async () => {
      thumbs.current ??= await Promise.all(frames.map((f) => (f.thumb ? readBytes(f.thumb).then(bytesToB64).catch(() => null) : null)))
      const data = await webTool<string>('contactSheet', {
        images: thumbs.current, format: rollCameraFormat(camera, roll), stock: rollFilm(roll),
        options: {
          width: 4200,
          header: info ? headerFor(roll, camera, lens ? `${lens.model}` : undefined) : undefined,
          title: useTitle && title.trim() ? title.trim() : undefined,
        },
      }).catch(() => undefined)
      if (cancelled || !data) return
      setUri(writeBytes('sheets', `${roll.id}-${Date.now()}.jpg`, b64ToBytes(data)))
    }, uri ? 350 : 0)
    return () => { cancelled = true; clearTimeout(t) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frames, camera, lens, useTitle, title, info])

  useEffect(() => {
    const t = setTimeout(() => setCanMake(true), 500)
    return () => clearTimeout(t)
  }, [])

  const fileName = () => `${(useTitle && title.trim()) || rollTitle(roll, camera)} 밀착.jpg`.replace(/[/\\:]/g, '-')

  const saveGallery = async () => {
    if (!uri) return
    const r = await saveImagesToGallery([{ uri, name: fileName() }])
    nav.toast(r.saved ? '갤러리에 저장했어요' : r.denied ? '사진 저장을 허용해 주세요' : '갤러리에 저장하지 못했어요')
  }

  const saveAsFile = async () => {
    if (!uri) return
    await saveFileNow(fileName(), await readBytes(uri), 'image/jpeg')
  }

  return (
    <Modal visible animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: c.paper }}>
        <View style={{ paddingTop: insets.top + 10, paddingBottom: 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <Btn label="닫기" kind="ghost" onPress={onClose} />
          <Text numberOfLines={1} style={{ flexShrink: 1, color: c.ink, fontSize: 17, fontWeight: '600' }}>{rollFilmName(roll)}</Text>
          <View style={{ width: 60 }} />
        </View>
        <View style={{ flex: 1 }}>
          {uri ? <ZoomView uri={uri} /> : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <ActivityIndicator color={c.muted} />
              <Text style={{ color: c.muted, fontSize: 17 }}>펼치는 중…</Text>
            </View>
          )}
        </View>
        <View style={{ paddingTop: 12, paddingHorizontal: 16, paddingBottom: insets.bottom + 12 }}>
          <Btn label="밀착 인화지로 만들기" kind="primary" block disabled={!uri || !canMake} onPress={() => setExporting(true)} />
        </View>
        {exporting ? (
          <Sheet title="밀착 인화지로 만들기" onClose={() => setExporting(false)} right={<SheetBtn label="완료" accent onPress={() => setExporting(false)} />}>
            <Section foot={roll.note ? '롤 메모로 제목을 채웠어요.' : undefined}>
              <Group>
                <Toggle label="제목 넣기" value={useTitle} onChange={setUseTitle} />
                {useTitle ? <Field label="제목" value={title} onChangeText={setTitle} /> : null}
              </Group>
            </Section>
            <Section foot="필름, 카메라, 날짜, 장소, 현상소가 한 줄로 들어가요. 바꾸면 뒤의 미리보기에 바로 반영돼요.">
              <Group>
                <Toggle label="촬영 정보 넣기" value={info} onChange={setInfo} />
              </Group>
            </Section>
            <View style={{ gap: 10 }}>
              <Btn label="갤러리에 저장" icon="download" kind="primary" block disabled={!uri} onPress={saveGallery} />
              <Btn label="파일로 저장" block disabled={!uri} onPress={saveAsFile} />
            </View>
          </Sheet>
        ) : null}
      </GestureHandlerRootView>
    </Modal>
  )
}

