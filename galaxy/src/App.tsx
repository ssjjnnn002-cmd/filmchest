// 웹 App.tsx와 같은 뼈대: 탭 4개, 탭마다 쌓이는 화면, 필름 장착·스캔 가져오기·zip 대기열.
import { importAll, restoredBackupUri, startLocalAutoBackup } from './backup'
import { Welcome } from './Welcome'
import { getPref } from './store'
import { driveConnected, keptAccount, onSignedOut } from './drive'
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Animated, BackHandler, PanResponder, Pressable, useWindowDimensions, View } from 'react-native'
import { Text } from './text'
import { Glass } from './glass'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { db, kept, purgeOldCameras, purgeOldRolls, removeDoubleLoads } from './data'
import { useLiveQuery } from './store'
import { Icon } from './icons'
import { useTheme } from './theme'
import { closeTopOverlay, iosCurve, OverlayBoundary, PUSH_MS, trackTap, useToast, WorkBanner } from './overlay'
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
  pop: () => boolean
  /** 그 롤 화면을 롤 보관함에서 연다 */
  showRoll: (id: string) => void
  /** 촬영을 막 끝낸 롤이면 현상 스캔 탭으로 간다 */
  toPending: (rollId: string) => void
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

const tabOrder: Tab[] = ['library', 'shooting', 'pending', 'rolls']

export function App() {
  const c = useTheme()
  const [tab, setTabState] = useState<Tab>('library')
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
  // 하루 한 번 기록 백업 파일을 써 두고(안드로이드가 구글 드라이브로 올림), 새로 설치해 비어 있으면 되살린다
  useEffect(() => {
    startLocalAutoBackup()
    // 예전 불러오기로 둘이 된 장비·롤(대소문자만 다른 id)을 하나로 합친다
    void import('./core/backupMerge').then((m) => m.dedupeCaseIds(db as unknown as Parameters<typeof m.dedupeCaseIds>[0])).catch(() => {})
    void import('./drive').then((d) => d.startDrivePull())
    void restoredBackupUri().then(async (uri) => {
      if (!uri) return
      const c = await importAll(uri)
      if (c.cameras || c.rolls) toast('백업에서 기록을 되살렸어요')
    }).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
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
  // 처음 켤 때 한 번: 구글로 시작하기 (이미 연결했으면 묻지 않는다)
  const [welcome, setWelcome] = useState(() => !driveConnected() && (getPref('welcomeSeen', '' as string) !== '1' || !!keptAccount()))
  // 로그아웃하면 시작 화면으로 (기록은 기기에 남아 있다)
  useEffect(() => onSignedOut(() => setWelcome(true)), [])

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
    void removeDoubleLoads()
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

  const cloneStacks = (st: Record<Tab, Screen[]>): Record<Tab, Screen[]> => ({
    library: [...st.library], shooting: [...st.shooting], pending: [...st.pending], rolls: [...st.rolls],
  })
  const sameStacks = (a: Record<Tab, Screen[]>, b: Record<Tab, Screen[]>) =>
    (['library', 'shooting', 'pending', 'rolls'] as Tab[]).every((k) => a[k].length === b[k].length && a[k].every((s, i) => s.type === b[k][i].type && s.id === b[k][i].id))
  // 탭과 화면을 밟은 순서. 뒤로 가면 직전 단계로 돌아가고, 처음 화면에서만 앱을 나간다.
  const trail = useRef<{ tab: Tab; stacks: Record<Tab, Screen[]> }[]>([
    { tab: 'library', stacks: { library: [], shooting: [], pending: [], rolls: [] } },
  ])
  const restoring = useRef(false)
  const record = (nextTab: Tab, nextStacks: Record<Tab, Screen[]>) => {
    if (restoring.current) return
    const snap = { tab: nextTab, stacks: cloneStacks(nextStacks) }
    const top = trail.current.at(-1)
    if (top && top.tab === snap.tab && sameStacks(top.stacks, snap.stacks)) return
    trail.current.push(snap)
  }
  const goBack = () => {
    if (trail.current.length <= 1) return false
    trail.current.pop()
    const prev = trail.current.at(-1)!
    restoring.current = true
    setTabState(prev.tab)
    setStacks(cloneStacks(prev.stacks))
    restoring.current = false
    return true
  }
  const nav: Nav = {
    tab,
    setTab: (t) => {
      if (t === tab) {
        // 같은 탭을 다시 누르면: 안쪽 화면이면 처음으로, 처음 화면이면 맨 위로
        if (stacks[t].length) {
          const next = { ...stacks, [t]: [] }
          setStacks(next)
          record(t, next)
        } else toTop.forEach((fn) => fn())
        return
      }
      setTabState(t)
      record(t, stacks)
    },
    push: (s, inTab) => {
      const t = inTab ?? tab
      scrollSaved.delete(`${t}/${s.type}/${s.id}`)
      const next = { ...stacks, [t]: [...stacks[t], s] }
      setStacks(next)
      record(tab, next)
    },
    pop: () => {
      if (goBack()) return true
      if (!stacks[tab].length) return false
      scrollSaved.delete(screenKey(tab))
      const next = { ...stacks, [tab]: stacks[tab].slice(0, -1) }
      setStacks(next)
      record(tab, next)
      return true
    },
    showRoll: (id) => {
      const rolls = [...stacks.rolls.filter((s) => !(s.type === 'roll' && s.id === id)), { type: 'roll' as const, id }]
      const next = { ...stacks, rolls }
      setTabState('rolls')
      setStacks(next)
      record('rolls', next)
    },
    toPending: (rollId) => {
      const next = { ...stacks, shooting: stacks.shooting.filter((s) => !(s.type === 'roll' && s.id === rollId)) }
      setTabState('pending')
      setStacks(next)
      record('pending', next)
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
      if (tab !== 'pending') {
        setTabState('pending')
        record('pending', stacks)
      }
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
    const active = following && next.some((job) => job.id === following.id) ? following.id : (next[0]?.id ?? null)
    setQueue(next, active)
    removeFile(prev[index]?.file.uri)
    void db.zipQueue.delete(id)
    return active != null
  }

  // 안드로이드 뒤로: 입력 창 → 직전 화면. 처음 화면에서만 앱 밖으로 나간다.
  const navRef = useRef(nav)
  navRef.current = nav
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (closeTopOverlay()) return true
      return navRef.current.pop()
    })
    return () => sub.remove()
  }, [])


  const render = (t: Tab, top?: Screen): ReactNode =>
    top?.type === 'camera' ? <CameraDetail id={top.id} /> : top?.type === 'roll' ? <RollDetail id={top.id} />
      : t === 'library' ? <Library /> : t === 'shooting' ? <Shooting /> : t === 'pending' ? <Pending /> : <Rolls />

  return (
    <NavContext.Provider value={nav}>
      <OverlayBoundary>
      <View {...trackTap} style={{ flex: 1, backgroundColor: c.paper }}>
        <ScreenStack key={tab} tab={tab} stack={stacks[tab]} render={render} saved={scrollSaved} toTop={toTop} onBack={() => nav.pop()} />
        <TabBar tab={tab} badge={badge} onTab={nav.setTab} />
      </View>
      {loadFilmFor && (
        <LoadFilm initialCameraId={loadFilmFor.cameraId} onClose={(loadedRoll) => {
          setLoadFilmFor(null)
          if (loadedRoll) {
            nav.setTab('shooting')
            toast('필름을 장착했어요')
          }
        }} />
      )}
      {incomingPhotos && <PhotoImportFlow photos={incomingPhotos} onClose={() => setIncomingPhotos(null)} />}
      {incoming && <IncomingImport files={incoming} onClose={() => setIncoming(null)} />}
      {importReq && <ImportFlow files={importReq.files} rollId={importReq.rollId} onClose={() => setImportReq(null)} />}
      {activeZip && (
        <ArchiveImport key={activeZip.id} presetFile={activeZip.file}
          stepLabel={`${activeZip.index} / ${activeZip.total}`}
          onClose={() => setActiveZipId(null)}
          onSaved={(rollId) => {
            const more = finishZip(activeZip.id)
            if (!more) nav.showRoll(rollId)
          }} />
      )}
      </OverlayBoundary>
      <WebToolsHost />
      {toastNode}
      <WorkBanner />
      {intro && <Intro onDone={() => setIntro(false)} />}
      {!intro && welcome ? <Welcome onDone={() => setWelcome(false)} /> : null}
    </NavContext.Provider>
  )
}

/** 탭 하나의 화면 쌓기 (아이폰과 같음): 새 화면이 오른쪽에서 덮고 아래 화면은 왼쪽으로 조금 밀리며 어두워진다.
 *  왼쪽에서 밀면 손가락을 따라 되돌아간다. */
function ScreenStack({ tab, stack, render, saved, toTop, onBack }: {
  tab: Tab; stack: Screen[]; render: (t: Tab, top?: Screen) => ReactNode
  saved: PageScroll['saved']; toTop: PageScroll['toTop']; onBack: () => void
}) {
  const { width } = useWindowDimensions()
  const [shown, setShown] = useState(stack)
  const depth = stack.length
  const pos = useRef(new Animated.Value(depth)).current
  const was = useRef(depth)
  // 나가는 화면은 다 밀려난 다음 없앤다
  const layers = shown.length > depth ? [...stack, ...shown.slice(depth)] : stack
  useEffect(() => {
    if (depth === was.current) { setShown(stack); return }
    const grew = depth > was.current
    was.current = depth
    if (grew) setShown(stack)
    Animated.timing(pos, { toValue: depth, duration: PUSH_MS, easing: iosCurve, useNativeDriver: true }).start(() => setShown(stack))
  }, [stack, depth, pos])
  const now = useRef({ depth, width, onBack })
  now.current = { depth, width, onBack }
  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => now.current.depth > 0 && g.x0 < 70 && g.dx > 12 && g.dx > Math.abs(g.dy) * 1.5,
    onPanResponderMove: (_, g) => pos.setValue(now.current.depth - Math.min(1, Math.max(0, g.dx / now.current.width))),
    onPanResponderRelease: (_, g) => {
      if (g.dx > now.current.width * 0.5 || g.vx > 0.4) { now.current.onBack(); return }
      Animated.timing(pos, { toValue: now.current.depth, duration: 260, easing: iosCurve, useNativeDriver: true }).start()
    },
    onPanResponderTerminate: () => { Animated.timing(pos, { toValue: now.current.depth, duration: 260, easing: iosCurve, useNativeDriver: true }).start() },
  })).current
  return (
    <View {...pan.panHandlers} style={{ flex: 1, overflow: 'hidden' }}>
      {[undefined, ...layers].map((s, i) => {
        const key = s ? `${tab}/${s.type}/${s.id}` : tab
        return (
          <Animated.View key={`${i}:${key}`} pointerEvents={i === depth ? 'auto' : 'none'} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            boxShadow: i ? '-10px 0px 30px rgba(0,0,0,0.12)' : undefined,
            transform: [{ translateX: pos.interpolate({ inputRange: [i - 1, i, i + 1], outputRange: [width, 0, -width * 0.3], extrapolate: 'clamp' }) }] }}>
            <Layer id={key} saved={saved} toTop={toTop}>{render(tab, s)}</Layer>
            <Animated.View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.1)',
              opacity: pos.interpolate({ inputRange: [i, i + 1], outputRange: [0, 1], extrapolate: 'clamp' }) }} />
          </Animated.View>
        )
      })}
    </View>
  )
}

function Layer({ id, saved, toTop, children }: { id: string; saved: PageScroll['saved']; toTop: PageScroll['toTop']; children: ReactNode }) {
  const value: PageScroll = useMemo(() => ({ key: id, saved, toTop }), [id, saved, toTop])
  return <PageScrollContext.Provider value={value}>{children}</PageScrollContext.Provider>
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
        borderWidth: 0.5, borderColor: c.glassLine, boxShadow: c.shadowGlass,
      }}>
        <Glass intensity={c.dark ? 48 : 36} tint={c.dark ? 'dark' : 'light'} style={{ flex: 1, backgroundColor: c.glass }}>
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
        </Glass>
      </View>
    </View>
  )
}
