// 웹 App.tsx와 같은 뼈대: 탭 4개, 탭마다 쌓이는 화면, 필름 장착·스캔 가져오기·zip 대기열.
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Animated, BackHandler, Easing, Pressable, Text, View } from 'react-native'
import { BlurView } from 'expo-blur'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { db, kept, purgeOldCameras, purgeOldRolls } from './data'
import { useLiveQuery } from './store'
import { Icon } from './icons'
import { useTheme } from './theme'
import { useToast } from './overlay'
import { PageScrollContext, type PageScroll } from './page'
import { uid } from './core/types'
import { setCustomFilms } from './core/films'
import { removeFile } from './files'
import type { PickedFile } from './pick'
import { Library } from './screens/Library'
import { CameraDetail } from './screens/CameraDetail'
import { Shooting } from './screens/Shooting'
import { Pending } from './screens/Pending'
import { Rolls } from './screens/Rolls'
import { RollDetail } from './screens/RollDetail'
import { LoadFilm } from './screens/LoadFilm'
import { ImportFlow } from './screens/ImportFlow'
import { ArchiveImport } from './screens/ArchiveImport'
import { IncomingImport } from './screens/IncomingImport'
import { PhotoImportFlow } from './screens/PhotoSplit'
import { useShareIntent } from 'expo-share-intent'
import { isZipFile } from './core/zip'
import { takeIncoming, onIncoming } from './incoming'
import { Intro } from './Intro'
import { WebToolsHost } from './webTools'

export type Tab = 'library' | 'shooting' | 'pending' | 'rolls'
type Screen = { type: 'camera'; id: string } | { type: 'roll'; id: string }

export interface ZipJob {
  id: string
  file: PickedFile
  index: number
  total: number
}

interface Nav {
  tab: Tab
  setTab: (t: Tab) => void
  push: (s: Screen, inTab?: Tab) => void
  pop: () => void
  loadFilm: (cameraId?: string) => void
  importScans: (files: PickedFile[], rollId?: string) => void
  /** 바깥에서 받은 zip들: 어디로 넣을지 묻는 창을 띄운다 */
  receiveZips: (files: PickedFile[]) => void
  toast: (m: string) => void
  zipQueue: ZipJob[]
  activeZipId: string | null
  enqueueZipRolls: (files: PickedFile[]) => void
  resumeZip: (id: string) => void
  dropZip: (id: string) => void
}

const NavContext = createContext<Nav>(null!)
export const useNav = () => useContext(NavContext)

const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: 'library', label: '내 장비', icon: 'camera.fill' },
  { id: 'shooting', label: '촬영 중', icon: 'film.fill' },
  { id: 'pending', label: '현상 스캔', icon: 'tray.fill' },
  { id: 'rolls', label: '롤 보관함', icon: 'canister.fill' },
]

type Motion = 'none' | 'tab-left' | 'tab-right' | 'push' | 'pop'
const tabOrder: Tab[] = ['library', 'shooting', 'pending', 'rolls']

export function App() {
  const c = useTheme()
  const [tab, setTabState] = useState<Tab>('library')
  const [motion, setMotion] = useState<Motion>('none')
  const scrollSaved = useRef(new Map<string, number>()).current
  const toTop = useRef(new Set<() => void>()).current
  const [stacks, setStacks] = useState<Record<Tab, Screen[]>>({ library: [], shooting: [], pending: [], rolls: [] })
  const [loadFilmFor, setLoadFilmFor] = useState<{ cameraId?: string } | null>(null)
  const [importReq, setImportReq] = useState<{ files: PickedFile[]; rollId?: string } | null>(null)
  const [zipQueue, setZipQueue] = useState<ZipJob[]>([])
  const [activeZipId, setActiveZipId] = useState<string | null>(null)
  const zipQueueRef = useRef<ZipJob[]>([])
  const [toastNode, toast] = useToast()
  const [incoming, setIncoming] = useState<PickedFile[] | null>(null)
  const [incomingPhotos, setIncomingPhotos] = useState<PickedFile[] | null>(null)
  // 다른 앱(사진·파일·카톡)의 '공유'로 받은 파일: zip이면 어디로 넣을지, 사진이면 롤마다 나누기
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent()
  useEffect(() => {
    if (!hasShareIntent) return
    const files: PickedFile[] = (shareIntent.files ?? []).map((f) => ({
      uri: /^[a-z]+:/.test(f.path) ? f.path : `file://${f.path}`, name: f.fileName || 'file', mimeType: f.mimeType,
    }))
    resetShareIntent()
    const zips = files.filter((f) => isZipFile({ name: f.name, type: f.mimeType }))
    const photos = files.filter((f) => !zips.includes(f) && ((f.mimeType ?? '').startsWith('image/') || /\.(jpe?g|png|heic|heif|tiff?)$/i.test(f.name)))
    if (zips.length) setIncoming(zips)
    else if (photos.length) setIncomingPhotos(photos)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasShareIntent])
  // 파일 앱 '다음으로 열기'로 받은 zip
  useEffect(() => {
    const first = takeIncoming()
    if (first.length) setIncoming(first)
    return onIncoming((files) => setIncoming(files))
  }, [])
  const [intro, setIntro] = useState(true)

  const setQueue = (next: ZipJob[], active: string | null) => {
    zipQueueRef.current = next
    setZipQueue(next)
    setActiveZipId(active)
  }

  const rolls = useLiveQuery(async () => (await db.rolls.toArray()).filter(kept), []) ?? []
  // 내가 만든 필름: 바뀌면 다시 채운다 (웹 main.tsx)
  const customRows = useLiveQuery(() => db.customFilms.toArray(), [])
  useMemo(() => { if (customRows) setCustomFilms(customRows) }, [customRows])
  const loaded = rolls.filter((r) => r.status === 'loaded').length
  const pending = rolls.filter((r) => r.status === 'finished' || r.status === 'atLab').length

  useEffect(() => {
    void purgeOldRolls()
    void purgeOldCameras()
    void db.zipQueue.orderBy('addedAt').toArray().then((rows) => {
      if (!rows.length || zipQueueRef.current.length) return
      setQueue(rows.map((r) => ({ id: r.id, file: { uri: r.blob, name: r.name }, index: r.index, total: r.total })), null)
    })
  }, [])
  const badge: Record<Tab, number> = { library: 0, shooting: loaded, pending, rolls: 0 }

  const screenKey = (t: Tab, st = stacks) => {
    const top = st[t].at(-1)
    return top ? `${t}/${top.type}/${top.id}` : t
  }

  const nav: Nav = {
    tab,
    setTab: (t) => {
      if (t === tab) {
        // 같은 탭을 다시 누르면: 안쪽 화면이면 처음으로, 처음 화면이면 맨 위로
        if (stacks[t].length) { setMotion('pop'); setStacks((s) => ({ ...s, [t]: [] })) }
        else toTop.forEach((fn) => fn())
        return
      }
      setMotion(tabOrder.indexOf(t) > tabOrder.indexOf(tab) ? 'tab-left' : 'tab-right')
      setTabState(t)
    },
    push: (s, inTab) => {
      const t = inTab ?? tab
      setMotion('push')
      scrollSaved.delete(`${t}/${s.type}/${s.id}`)
      setStacks((st) => ({ ...st, [t]: [...st[t], s] }))
    },
    pop: () => {
      if (!stacks[tab].length) return
      scrollSaved.delete(screenKey(tab))
      setMotion('pop')
      setStacks((st) => ({ ...st, [tab]: st[tab].slice(0, -1) }))
    },
    loadFilm: (cameraId) => setLoadFilmFor({ cameraId }),
    importScans: (files, rollId) => setImportReq({ files, rollId }),
    receiveZips: (files) => { if (files.length) setIncoming(files) },
    toast,
    zipQueue,
    activeZipId,
    enqueueZipRolls: (files) => {
      if (!files.length) { toast('zip 파일을 골라 주세요'); return }
      const batch = files.map((file, i) => ({ id: uid(), file, index: i + 1, total: files.length }))
      const next = [...zipQueueRef.current, ...batch]
      setQueue(next, activeZipId ?? batch[0].id)
      setTabState('pending')
      void Promise.all(batch.map((job) => db.zipQueue.put({
        id: job.id, name: job.file.name, blob: job.file.uri, index: job.index, total: job.total, addedAt: Date.now(),
      })))
    },
    resumeZip: (id) => setActiveZipId(id),
    dropZip: (id) => {
      const prev = zipQueueRef.current
      const next = prev.filter((job) => job.id !== id)
      setQueue(next, activeZipId === id ? null : activeZipId)
      removeFile(prev.find((job) => job.id === id)?.file.uri)
      void db.zipQueue.delete(id)
    },
  }

  const activeZip = zipQueue.find((job) => job.id === activeZipId) ?? null
  const finishZip = (id: string) => {
    const prev = zipQueueRef.current
    const index = prev.findIndex((job) => job.id === id)
    const next = prev.filter((job) => job.id !== id)
    const following = index >= 0 ? prev[index + 1] : undefined
    setQueue(next, following && next.some((job) => job.id === following.id) ? following.id : (next[0]?.id ?? null))
    removeFile(prev[index]?.file.uri)
    void db.zipQueue.delete(id)
  }

  // 안드로이드 뒤로 버튼: 안쪽 화면이면 한 단계 뒤로, 첫 화면이면 내 장비로
  const navRef = useRef(nav)
  navRef.current = nav
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      const n = navRef.current
      if (stacks[n.tab].length) { n.pop(); return true }
      if (n.tab !== 'library') { n.setTab('library'); return true }
      return false
    })
    return () => sub.remove()
  }, [stacks])

  const currentKey = screenKey(tab)
  const scroll: PageScroll = useMemo(() => ({ key: currentKey, saved: scrollSaved, toTop }), [currentKey, scrollSaved, toTop])

  // 화면 전환 움직임 (웹 .motion-*)
  const anim = useRef(new Animated.Value(1)).current
  const motionRef = useRef<Motion>('none')
  motionRef.current = motion
  useEffect(() => {
    if (motionRef.current === 'none') return
    anim.setValue(0)
    Animated.timing(anim, { toValue: 1, duration: motionRef.current === 'push' ? 340 : motionRef.current === 'pop' ? 300 : 260, easing: Easing.bezier(0.2, 0.8, 0.2, 1), useNativeDriver: true }).start()
  }, [currentKey, anim])
  const from = motion === 'push' ? 120 : motion === 'pop' ? -70 : motion === 'tab-left' ? 14 : motion === 'tab-right' ? -14 : 0
  const startOpacity = motion === 'pop' ? 0.3 : motion === 'none' ? 1 : 0

  const top = stacks[tab].at(-1)
  let content: ReactNode
  if (top?.type === 'camera') content = <CameraDetail key={top.id} id={top.id} />
  else if (top?.type === 'roll') content = <RollDetail key={top.id} id={top.id} />
  else if (tab === 'library') content = <Library />
  else if (tab === 'shooting') content = <Shooting />
  else if (tab === 'pending') content = <Pending />
  else content = <Rolls />

  return (
    <NavContext.Provider value={nav}>
      <View style={{ flex: 1, backgroundColor: c.paper }}>
        <PageScrollContext.Provider value={scroll}>
          <Animated.View key={currentKey} style={{ flex: 1,
            opacity: anim.interpolate({ inputRange: [0, motion === 'push' ? 0.4 : 1, 1], outputRange: [startOpacity, 1, 1] }),
            transform: [{ translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [from, 0] }) }] }}>
            {content}
          </Animated.View>
        </PageScrollContext.Provider>
        <TabBar tab={tab} badge={badge} onTab={nav.setTab} />
      </View>
      {loadFilmFor && (
        <LoadFilm initialCameraId={loadFilmFor.cameraId} onClose={(loadedRoll) => {
          setLoadFilmFor(null)
          if (loadedRoll) { setTabState('shooting'); toast('필름을 장착했어요') }
        }} />
      )}
      {incomingPhotos && <PhotoImportFlow photos={incomingPhotos} onClose={() => setIncomingPhotos(null)} />}
      {incoming && <IncomingImport files={incoming} onClose={() => setIncoming(null)} />}
      {importReq && <ImportFlow files={importReq.files} rollId={importReq.rollId} onClose={() => setImportReq(null)} />}
      {activeZip && (
        <ArchiveImport key={activeZip.id} presetFile={activeZip.file}
          stepLabel={`${activeZip.index} / ${activeZip.total}`}
          onClose={() => setActiveZipId(null)}
          onSaved={() => finishZip(activeZip.id)} />
      )}
      <WebToolsHost />
      {toastNode}
      {intro && <Intro onDone={() => setIntro(false)} />}
    </NavContext.Provider>
  )
}

/** 떠 있는 유리 탭바. 선택 표시가 미끄러져 이동 */
function TabBar({ tab, badge, onTab }: { tab: Tab; badge: Record<Tab, number>; onTab: (t: Tab) => void }) {
  const c = useTheme()
  const insets = useSafeAreaInsets()
  const index = tabOrder.indexOf(tab)
  const slide = useRef(new Animated.Value(index)).current
  const [width, setWidth] = useState(0)
  useEffect(() => {
    Animated.spring(slide, { toValue: index, useNativeDriver: true, stiffness: 260, damping: 22, mass: 0.8 }).start()
  }, [index, slide])
  const gap = 2
  const pill = width ? (width - 8 - gap * 3) / 4 : 0
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: insets.bottom + 14, paddingHorizontal: 20, alignItems: 'center' }}>
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{
        width: '100%', maxWidth: 420, height: 64, borderRadius: 32, overflow: 'hidden',
        borderWidth: 0.5, borderColor: c.glassLine, elevation: 8,
      }}>
        <BlurView intensity={c.dark ? 48 : 36} tint={c.dark ? 'dark' : 'light'} style={{ flex: 1, backgroundColor: c.glass }}>
          {pill > 0 ? (
            <Animated.View style={{ position: 'absolute', top: 4, bottom: 4, left: 4, width: pill, borderRadius: 28, backgroundColor: c.fill,
              transform: [{ translateX: Animated.multiply(slide, pill + gap) }] }} />
          ) : null}
          <View style={{ flex: 1, flexDirection: 'row', padding: 4, gap }}>
            {tabs.map((t) => {
              const on = t.id === tab
              return (
                <Pressable key={t.id} onPress={() => onTab(t.id)} accessibilityLabel={t.label}
                  style={({ pressed }) => ({ flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center', gap: 1, transform: [{ scale: pressed ? 0.92 : 1 }] })}>
                  <Icon name={t.icon} size={25} color={on ? c.safelight : c.ink} />
                  <Text numberOfLines={1} style={{ fontSize: 10.5, fontWeight: '600', color: on ? c.safelight : c.ink }}>{t.label}</Text>
                  {badge[t.id] > 0 ? (
                    <View style={{ position: 'absolute', top: 3, left: '50%', marginLeft: 6, minWidth: 19, height: 19, paddingHorizontal: 5, borderRadius: 10,
                      backgroundColor: '#FF3B30', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600', includeFontPadding: false }}>{badge[t.id]}</Text>
                    </View>
                  ) : null}
                </Pressable>
              )
            })}
          </View>
        </BlurView>
      </View>
    </View>
  )
}
