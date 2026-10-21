// 웹 pages/Library.tsx
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Animated, Easing, LayoutAnimation, Pressable, Text, Vibration, View, type LayoutRectangle } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { db, kept } from '../data'
import { getPref, setPref, useLiveQuery } from '../store'
import { useNav } from '../App'
import type { Camera, Roll } from '../core/types'
import { filmById } from '../core/films'
import { rollFilmName } from '../core/display'
import { Btn, CameraCover, Canister, Empty, EmptyText, Segmented } from '../kit'
import { Icon } from '../icons'
import { GlassBtn, GlassGroup, Page } from '../page'
import { useTheme } from '../theme'
import { seedExample } from '../seed'
import { CameraEdit } from './CameraEdit'
import { GearAdd, GearBoard, type GearKind } from './Gear'
import { TagFilter } from '../gearExtras'
import { Settings } from './Settings'

export const batteryDue = (c: Camera) =>
  !!c.batteryAt && !(c.battery ?? '').startsWith('필요 없음') && Date.now() - c.batteryAt > 365 * 864e5

interface Drag { id: string; slot: LayoutRectangle; dx: number; dy: number }

export function Library() {
  const c = useTheme()
  const nav = useNav()
  const cameras = useLiveQuery(() => db.cameras.orderBy('sortOrder').filter((x) => !x.deletedAt).toArray(), [])
  const rolls = useLiveQuery(async () => (await db.rolls.where('status').equals('loaded').toArray()).filter(kept), []) ?? []
  const [adding, setAdding] = useState(false)
  const [gear, setGear] = useState<GearKind | 'camera'>('camera')
  const [tag, setTag] = useState<string>()
  const lensTags = useLiveQuery(async () => (await db.lenses.toArray()).flatMap((x) => x.tags ?? []), []) ?? []
  const filterTags = useLiveQuery(async () => (await db.filters.toArray()).flatMap((x) => x.tags ?? []), []) ?? []
  const [gearAdd, setGearAdd] = useState(false)
  const [settings, setSettings] = useState(false)
  const [layout, setLayout] = useState<string>(getPref('libraryLayout', 'grid'))
  // 순서 편집 중: 카드가 흔들리고, 눌러도 들어가지 않는다.
  const [editing, setEditing] = useState(false)
  const [order, setOrder] = useState<string[]>([])
  const orderRef = useRef<string[]>([])
  const [drag, setDrag] = useState<Drag | null>(null)
  const dragRef = useRef<Drag | null>(null)
  const slotsAtStart = useRef<LayoutRectangle[]>([])
  const layouts = useRef(new Map<string, LayoutRectangle>())
  const [width, setWidth] = useState(0)
  const signature = (cameras ?? []).map((x) => x.id).join('|')

  // 저장된 순서가 바뀌면 따라간다 (끄는 중에는 건드리지 않음)
  useEffect(() => {
    if (dragRef.current) return
    const next = signature ? signature.split('|') : []
    orderRef.current = next
    setOrder(next)
  }, [signature])

  const loadedFor = (x: Camera) => rolls.find((r) => r.cameraId === x.id)
  const empty = (cameras ?? []).filter((x) => !loadedFor(x)).length
  const byId = new Map((cameras ?? []).map((x) => [x.id, x]))
  const shown = (order.length ? order : (cameras ?? []).map((x) => x.id))
    .map((id) => byId.get(id))
    .filter((x): x is Camera => !!x)
    .filter((x) => editing || !tag || (x.tags ?? []).includes(tag))

  const toggleLayout = () => {
    const next = layout === 'grid' ? 'list' : 'grid'
    setLayout(next)
    setPref('libraryLayout', next)
  }

  const enterEdit = () => {
    if (editing) return
    setEditing(true)
    nav.toast('끌어서 순서를 바꾸세요')
  }

  const beginDrag = (id: string) => {
    const slot = layouts.current.get(id)
    if (!slot) return
    slotsAtStart.current = orderRef.current.map((x) => layouts.current.get(x)!).filter(Boolean)
    const d = { id, slot, dx: 0, dy: 0 }
    dragRef.current = d
    setDrag(d)
    Vibration.vibrate(12)
  }
  const moveDrag = (dx: number, dy: number) => {
    const cur = dragRef.current
    if (!cur) return
    const d = { ...cur, dx, dy }
    dragRef.current = d
    setDrag(d)
    const rects = slotsAtStart.current
    const cx = cur.slot.x + dx + cur.slot.width / 2
    const cy = cur.slot.y + dy + cur.slot.height / 2
    let best = 0, bestDist = Infinity
    rects.forEach((r, i) => {
      const dist = Math.hypot(cx - (r.x + r.width / 2), cy - (r.y + r.height / 2))
      if (dist < bestDist) { bestDist = dist; best = i }
    })
    const list = orderRef.current
    const from = list.indexOf(cur.id)
    if (from < 0 || best === from) return
    const here = rects[from]
    const hereDist = Math.hypot(cx - (here.x + here.width / 2), cy - (here.y + here.height / 2))
    // 칸 가운데를 분명히 지나갔을 때만 옮긴다. 경계에서 왕복하지 않게.
    if (bestDist + 36 > hereDist) return
    const next = list.slice()
    next.splice(from, 1)
    next.splice(best, 0, cur.id)
    orderRef.current = next
    // 끄는 카드의 출발 칸도 새 자리로 (손가락 위치는 그대로)
    const to = rects[best]
    const moved = { ...d, slot: { ...cur.slot, x: to.x, y: to.y }, dx: d.dx + cur.slot.x - to.x, dy: d.dy + cur.slot.y - to.y }
    dragRef.current = moved
    setDrag(moved)
    LayoutAnimation.configureNext(LayoutAnimation.create(180, 'easeInEaseOut', 'opacity'))
    setOrder(next)
    Vibration.vibrate(4)
  }
  const endDrag = async () => {
    const ordered = orderRef.current.slice()
    dragRef.current = null
    setDrag(null)
    await db.transaction('rw', db.cameras, async () => {
      await Promise.all(ordered.map((id, index) => (byId.get(id)?.sortOrder !== index ? db.cameras.update(id, { sortOrder: index }) : undefined)))
    })
  }

  const grid = layout === 'grid'
  const cols = Math.max(2, Math.floor((width + 14) / (160 + 14)))
  const cell = grid && width ? (width - 14 * (cols - 1)) / cols : undefined
  const dragged = drag ? byId.get(drag.id) : undefined

  const item = (x: Camera, i: number) => (
    <ReorderItem key={x.id} id={x.id} first={i === 0} editing={editing} placeholder={drag?.id === x.id} grid={grid} width={cell}
      onLayout={(r) => layouts.current.set(x.id, r)}
      onLongPress={enterEdit} onStart={beginDrag} onMove={moveDrag} onEnd={endDrag}>
      {grid ? <CameraCard camera={x} roll={loadedFor(x)} editing={editing} /> : <CameraRow camera={x} roll={loadedFor(x)} editing={editing} />}
    </ReorderItem>
  )

  return (
    <Page title="내 장비"
      left={editing ? undefined : <GlassBtn icon="gear" label="설정" onPress={() => setSettings(true)} />}
      actions={editing
        ? <GlassBtn label="완료" prominent onPress={() => setEditing(false)} />
        : <GlassGroup items={[
          { icon: grid ? 'list' : 'grid', label: grid ? '목록으로 보기' : '그리드로 보기', onPress: toggleLayout },
          { icon: 'plus', label: gear === 'camera' ? '카메라 추가' : `${gear === 'lens' ? '렌즈' : gear === 'filter' ? '필터' : '필름'} 추가`, onPress: () => gear === 'camera' ? setAdding(true) : setGearAdd(true) },
        ]} />}>

      {!editing && (
        <View style={{ marginBottom: 12 }}>
          <Segmented value={gear} options={[['camera', '카메라'], ['lens', '렌즈'], ['filter', '필터'], ['film', '필름']]} onChange={(g) => { setGear(g); setTag(undefined) }} />
        </View>
      )}
      {!editing && gear !== 'film' ? (
        <View style={{ marginBottom: 8 }}>
          <TagFilter tags={gear === 'camera' ? (cameras ?? []).flatMap((x) => x.tags ?? []) : gear === 'lens' ? lensTags : filterTags} value={tag} onChange={setTag} />
        </View>
      ) : null}

      {gear !== 'camera' && !editing ? <GearBoard kind={gear} layout={layout} tag={tag} /> : null}

      {gear === 'camera' && cameras && cameras.length === 0 ? (
        <Empty icon="camera" title="카메라가 없어요">
          <EmptyText>가진 카메라를 등록해 보세요.</EmptyText>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Btn label="카메라 추가" kind="primary" onPress={() => setAdding(true)} />
            <Btn label="예시로 둘러보기" onPress={async () => { await seedExample(); nav.toast('예시 카메라와 롤을 넣었어요') }} />
          </View>
        </Empty>
      ) : null}

      {gear === 'camera' && cameras && cameras.length > 0 ? (
        <View style={{ gap: 18 }}>
          <Pressable disabled={editing} onPress={() => nav.loadFilm()} style={({ pressed }) => ({
            flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 18, borderRadius: 22,
            backgroundColor: c.safelight, opacity: editing ? 0.4 : 1, transform: [{ scale: pressed ? 0.98 : 1 }],
          })}>
            <Canister film={filmById('kodak-portra-400')} size={52} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#fff', fontSize: 19, fontWeight: '600' }}>필름 장착하기</Text>
              <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 14 }}>{empty > 0 ? `빈 카메라 ${empty}대` : '모든 카메라에 필름이 들어 있어요'}</Text>
            </View>
            <Icon name="right" size={20} color="#fff" />
          </Pressable>

          <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
            style={grid
              ? { flexDirection: 'row', flexWrap: 'wrap', gap: 14 }
              : { backgroundColor: c.cell, borderRadius: 22 }}>
            {shown.map(item)}
            {drag && dragged ? (
              <View pointerEvents="none" style={{ position: 'absolute', left: drag.slot.x + drag.dx, top: drag.slot.y + drag.dy, width: drag.slot.width, height: drag.slot.height,
                transform: [{ scale: grid ? 1.05 : 1.03 }, { rotate: grid ? '-1deg' : '0deg' }], zIndex: 10, elevation: 16,
                shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 25, shadowOffset: { width: 0, height: 22 },
                backgroundColor: grid ? undefined : c.cell, borderRadius: grid ? 22 : 14 }}>
                {grid ? <CameraCard camera={dragged} roll={loadedFor(dragged)} editing /> : <CameraRow camera={dragged} roll={loadedFor(dragged)} editing />}
              </View>
            ) : null}
          </View>
        </View>
      ) : null}

      {adding ? <CameraEdit onClose={() => setAdding(false)} /> : null}
      {gearAdd && gear !== 'camera' ? <GearAdd kind={gear} onClose={() => setGearAdd(false)} /> : null}
      {settings ? <Settings onClose={() => setSettings(false)} /> : null}
    </Page>
  )
}

/**
 * 카드 하나. 평소엔 길게(0.45초) 누르면 편집 모드로 들어가며 바로 끌기 시작하고,
 * 편집 중엔 살짝만 움직여도 끈다. 편집 중엔 안쪽 버튼이 눌리지 않는다.
 */
function ReorderItem({ id, first, editing, placeholder, grid, width, onLayout, onLongPress, onStart, onMove, onEnd, children }: {
  id: string; first: boolean; editing: boolean; placeholder: boolean; grid: boolean; width?: number
  onLayout: (r: LayoutRectangle) => void
  onLongPress: () => void
  onStart: (id: string) => void
  onMove: (dx: number, dy: number) => void
  onEnd: () => void
  children: ReactNode
}) {
  const c = useTheme()
  const wiggle = useRef(new Animated.Value(0)).current
  useEffect(() => {
    if (!editing || !grid) { wiggle.setValue(0); return }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(wiggle, { toValue: 1, duration: 280, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(wiggle, { toValue: -1, duration: 280, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]))
    loop.start()
    return () => loop.stop()
  }, [editing, grid, wiggle])
  const start = () => { if (!editing) onLongPress(); onStart(id) }
  const pan = (editing
    ? Gesture.Pan().minDistance(4)
    : Gesture.Pan().activateAfterLongPress(450))
    .runOnJS(true)
    .onStart(() => start())
    .onUpdate((e) => onMove(e.translationX, e.translationY))
    .onFinalize((_e, ok) => { if (ok) void onEnd() })
  return (
    <GestureDetector gesture={pan}>
      <View collapsable={false} onLayout={(e) => onLayout(e.nativeEvent.layout)}
        style={[grid ? { width } : null, placeholder && grid ? { borderRadius: 22, borderWidth: 2, borderStyle: 'dashed', borderColor: `${c.safelight}73` } : null]}>
        <Animated.View pointerEvents={editing ? 'none' : 'auto'} style={{ opacity: placeholder ? 0.18 : 1,
          transform: [{ rotate: wiggle.interpolate({ inputRange: [-1, 1], outputRange: ['-0.8deg', '0.8deg'] }) }] }}>
          {children}
        </Animated.View>
        {!grid && !first ? <View style={{ position: 'absolute', top: 0, left: 18, right: 0, height: 0.5, backgroundColor: c.sep }} /> : null}
        {editing && !grid ? <Text style={{ position: 'absolute', right: 18, top: 0, bottom: 0, textAlignVertical: 'center', fontSize: 22, color: c.faint }}>≡</Text> : null}
      </View>
    </GestureDetector>
  )
}

function CameraCard({ camera, roll, editing }: { camera: Camera; roll?: Roll; editing?: boolean }) {
  const c = useTheme()
  const nav = useNav()
  const open = () => nav.push({ type: 'camera', id: camera.id })
  return (
    <View style={{ backgroundColor: c.card, borderRadius: 22, padding: 16, gap: 10, minWidth: 0,
      shadowColor: '#28201a', shadowOpacity: c.dark ? 0.4 : 0.06, shadowRadius: 20, shadowOffset: { width: 0, height: 6 }, elevation: 1 }}>
      <Pressable disabled={editing} onPress={open} style={{ height: 120, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <CameraCover camera={camera} />
      </Pressable>
      <Pressable disabled={editing} onPress={open} style={{ minWidth: 0 }}>
        <Text numberOfLines={1} style={{ fontSize: 19, fontWeight: '700', color: c.ink }}>{camera.model}</Text>
        <Text style={{ fontSize: 15, color: c.muted }}>
          {camera.brand}{batteryDue(camera) ? <Text style={{ color: c.warn, fontSize: 12, fontWeight: '600' }}>{'  '}배터리 교체</Text> : null}
        </Text>
      </Pressable>
      <View style={{ height: 0.5, backgroundColor: c.sep }} />
      {roll ? (
        <Pressable disabled={editing} onPress={() => nav.push({ type: 'roll', id: roll.id })} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, height: 36, minWidth: 0 }}>
          <Canister film={filmById(roll.filmId)} size={30} />
          <Text numberOfLines={1} style={{ flex: 1, color: c.safelight, fontSize: 15, fontWeight: '600' }}>{rollFilmName(roll)}</Text>
        </Pressable>
      ) : (
        <Pressable disabled={editing} onPress={() => nav.loadFilm(camera.id)} style={({ pressed }) => ({ height: 36, borderRadius: 999, backgroundColor: c.soft,
          flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, transform: [{ scale: pressed ? 0.97 : 1 }] })}>
          <Icon name="plus" size={18} color={c.safelight} />
          <Text style={{ color: c.safelight, fontSize: 15, fontWeight: '600' }}>필름 장착</Text>
        </Pressable>
      )}
    </View>
  )
}

function CameraRow({ camera, roll, editing }: { camera: Camera; roll?: Roll; editing?: boolean }) {
  const c = useTheme()
  const nav = useNav()
  return (
    <View style={{ minHeight: 52, paddingVertical: 12, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <Pressable disabled={editing} onPress={() => nav.push({ type: 'camera', id: camera.id })} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minWidth: 0 }}>
        <View style={{ width: 68 }}><CameraCover camera={camera} height={52} /></View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ fontSize: 17, fontWeight: '600', color: c.ink }}>{camera.brand} {camera.model}</Text>
          {roll
            ? <Text numberOfLines={1} style={{ fontSize: 14, color: c.safelight }}>{rollFilmName(roll)}</Text>
            : <Text style={{ fontSize: 14, color: c.muted }}>비어 있음</Text>}
          {batteryDue(camera) ? <Text style={{ color: c.warn, fontSize: 12, fontWeight: '600' }}>배터리 교체할 때가 됐어요</Text> : null}
        </View>
      </Pressable>
      {editing ? <View style={{ width: 34 }} /> : roll
        ? <Canister film={filmById(roll.filmId)} size={34} />
        : <Btn label="필름 장착" kind="soft" size="small" onPress={() => nav.loadFilm(camera.id)} />}
    </View>
  )
}
