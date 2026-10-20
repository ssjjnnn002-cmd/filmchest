import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, kept, purgeOldCameras, purgeOldRolls } from './db'
import { migrateCameraPhotos } from './photoStore'
import { Icon, useToast } from './ui/common'
import { Library } from './pages/Library'
import { CameraDetail } from './pages/CameraDetail'
import { Shooting } from './pages/Shooting'
import { Pending } from './pages/Pending'
import { Rolls } from './pages/Rolls'
import { RollDetail } from './pages/RollDetail'
import { LoadFilm } from './pages/LoadFilm'
import { ImportFlow } from './pages/ImportFlow'
import { ArchiveImport } from './pages/ArchiveImport'
import { IncomingImport } from './pages/IncomingImport'
import { PhotoImportFlow } from './pages/PhotoSplit'
import { isZipFile } from './core/zip'
import { uid } from './core/types'
import { Intro } from './ui/Intro'

export type Tab = 'library' | 'shooting' | 'pending' | 'rolls'
type Screen = { type: 'camera'; id: string } | { type: 'roll'; id: string }

export interface ZipJob {
  id: string
  file: File
  index: number
  total: number
}

interface Nav {
  tab: Tab
  setTab: (t: Tab) => void
  push: (s: Screen, inTab?: Tab) => void
  pop: () => void
  loadFilm: (cameraId?: string) => void
  importScans: (files: File[], rollId?: string) => void
  /** 바깥에서 받은 zip들: 어디로 넣을지 묻는 창을 띄운다 */
  receiveZips: (files: File[]) => void
  toast: (m: string) => void
  zipQueue: ZipJob[]
  activeZipId: string | null
  enqueueZipRolls: (files: File[]) => void
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
  const [tab, setTabState] = useState<Tab>('library')
  const [motion, setMotion] = useState<Motion>('none')
  // 화면마다 보던 스크롤 위치 (탭을 오가도, 뒤로 와도 그 자리로)
  const scrollPos = useRef(new Map<string, number>())
  const [stacks, setStacks] = useState<Record<Tab, Screen[]>>({ library: [], shooting: [], pending: [], rolls: [] })
  const [loadFilmFor, setLoadFilmFor] = useState<{ cameraId?: string } | null>(null)
  const [importReq, setImportReq] = useState<{ files: File[]; rollId?: string } | null>(null)
  const [zipQueue, setZipQueue] = useState<ZipJob[]>([])
  const [activeZipId, setActiveZipId] = useState<string | null>(null)
  const zipQueueRef = useRef<ZipJob[]>([])
  const [toastNode, toast] = useToast()
  const [incoming, setIncoming] = useState<File[] | null>(null)
  const [incomingPhotos, setIncomingPhotos] = useState<File[] | null>(null)

  // 안드로이드 크롬 '공유'(share_target)·컴퓨터 크롬 '다음으로 열기'(file_handlers)로 받은 zip
  useEffect(() => {
    if ('serviceWorker' in navigator) void navigator.serviceWorker.register('./sw.js').catch(() => {})
    const take = (files: File[]) => {
      const zips = files.filter(isZipFile)
      const photos = files.filter((f) => !isZipFile(f) && (f.type.startsWith('image/') || /\.(jpe?g|png|heic|heif|tiff?)$/i.test(f.name)))
      if (zips.length) setIncoming(zips)
      else if (photos.length) setIncomingPhotos(photos)
    }
    if (new URLSearchParams(location.search).has('shared')) {
      history.replaceState(null, '', location.pathname)
      void caches.open('filmchest-share').then(async (cache) => {
        const keys = await cache.keys()
        const files = await Promise.all(keys.map(async (k) => {
          const r = await cache.match(k)
          const name = decodeURIComponent(r?.headers.get('x-name') ?? 'scan.zip')
          return r ? new File([await r.blob()], name, { type: r.headers.get('content-type') || (/\.zip$/i.test(name) ? 'application/zip' : '') }) : undefined
        }))
        await Promise.all(keys.map((k) => cache.delete(k)))
        take(files.filter((f): f is File => !!f))
      }).catch(() => {})
    }
    const lq = (window as unknown as { launchQueue?: { setConsumer: (fn: (p: { files: { getFile: () => Promise<File> }[] }) => void) => void } }).launchQueue
    lq?.setConsumer(async (p) => take(await Promise.all(p.files.map((h) => h.getFile()))))
  }, [])
  const [intro, setIntro] = useState(true)

  const setQueue = (next: ZipJob[], active: string | null) => {
    zipQueueRef.current = next
    setZipQueue(next)
    setActiveZipId(active)
  }

  const rolls = useLiveQuery(async () => (await db.rolls.toArray()).filter(kept), []) ?? []
  const loaded = rolls.filter((r) => r.status === 'loaded').length
  const pending = rolls.filter((r) => r.status === 'finished' || r.status === 'atLab').length

  useEffect(() => {
    void purgeOldRolls()
    void purgeOldCameras()
    void migrateCameraPhotos()
    void db.zipQueue.orderBy('addedAt').toArray().then((rows) => {
      if (!rows.length || zipQueueRef.current.length) return
      setQueue(rows.map((r) => ({
        id: r.id, file: new File([r.blob], r.name, { type: 'application/zip' }), index: r.index, total: r.total,
      })), null)
    })
  }, [])
  const badge: Record<Tab, number> = { library: 0, shooting: loaded, pending, rolls: 0 }

  const screenKey = (t: Tab, st = stacks) => {
    const top = st[t].at(-1)
    return top ? `${t}/${top.type}/${top.id}` : t
  }
  const remember = () => scrollPos.current.set(screenKey(tab), window.scrollY)

  const nav: Nav = {
    tab,
    setTab: (t) => {
      remember()
      if (t === tab) {
        // 같은 탭을 다시 누르면: 안쪽 화면이면 처음으로, 처음 화면이면 맨 위로
        if (stacks[t].length) { setMotion('pop'); setStacks((s) => ({ ...s, [t]: [] })) }
        else window.scrollTo({ top: 0, behavior: 'smooth' })
        return
      }
      setMotion(tabOrder.indexOf(t) > tabOrder.indexOf(tab) ? 'tab-left' : 'tab-right')
      setTabState(t)
    },
    push: (s, inTab) => {
      remember()
      const t = inTab ?? tab
      setMotion('push')
      scrollPos.current.delete(`${t}/${s.type}/${s.id}`)
      setStacks((st) => ({ ...st, [t]: [...st[t], s] }))
    },
    pop: () => {
      if (!stacks[tab].length) return
      scrollPos.current.delete(screenKey(tab))
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
        id: job.id, name: job.file.name, blob: job.file, index: job.index, total: job.total, addedAt: Date.now(),
      })))
    },
    resumeZip: (id) => setActiveZipId(id),
    dropZip: (id) => {
      const prev = zipQueueRef.current
      const next = prev.filter((job) => job.id !== id)
      setQueue(next, activeZipId === id ? null : activeZipId)
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
    void db.zipQueue.delete(id)
  }

  const currentKey = screenKey(tab)
  useLayoutEffect(() => {
    window.scrollTo(0, scrollPos.current.get(currentKey) ?? 0)
  }, [currentKey])

  // 왼쪽 가장자리에서 오른쪽으로 밀면 뒤로 (iOS처럼)
  const swipe = useRef<{ x: number; y: number; dx: number; active: boolean } | null>(null)
  const pageRef = useRef<HTMLDivElement>(null)
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0]
    if (!stacks[tab].length || t.clientX > 28) return
    swipe.current = { x: t.clientX, y: t.clientY, dx: 0, active: false }
  }
  const onTouchMove = (e: React.TouchEvent) => {
    const g = swipe.current
    if (!g) return
    const t = e.touches[0]
    const dx = t.clientX - g.x, dy = t.clientY - g.y
    if (!g.active) {
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 8) { swipe.current = null; return }
      if (dx > 8) g.active = true
    }
    if (g.active && pageRef.current) {
      g.dx = Math.max(0, dx)
      pageRef.current.style.transition = 'none'
      pageRef.current.style.transform = `translateX(${g.dx}px)`
      pageRef.current.style.boxShadow = '-12px 0 30px rgb(0 0 0 / 0.12)'
    }
  }
  const onTouchEnd = () => {
    const g = swipe.current
    swipe.current = null
    const el = pageRef.current
    if (!g?.active || !el) return
    const done = g.dx > Math.min(120, window.innerWidth * 0.3)
    el.style.transition = 'transform .22s cubic-bezier(.2,.8,.2,1)'
    el.style.transform = done ? `translateX(${window.innerWidth}px)` : 'translateX(0)'
    window.setTimeout(() => {
      el.style.transition = ''; el.style.transform = ''; el.style.boxShadow = ''
      if (done) {
        scrollPos.current.delete(currentKey)
        setMotion('none')
        setStacks((st) => ({ ...st, [tab]: st[tab].slice(0, -1) }))
      }
    }, 220)
  }

  const top = stacks[tab].at(-1)
  let content: ReactNode
  if (top?.type === 'camera') content = <CameraDetail key={top.id} id={top.id} />
  else if (top?.type === 'roll') content = <RollDetail key={top.id} id={top.id} />
  else if (tab === 'library') content = <Library />
  else if (tab === 'shooting') content = <Shooting />
  else if (tab === 'pending') content = <Pending />
  else content = <Rolls />

  const tabIndex = tabOrder.indexOf(tab)
  const tabButtons = tabs.map((t) => (
    <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => nav.setTab(t.id)}
      aria-current={tab === t.id ? 'page' : undefined}>
      <Icon name={t.icon} />
      <span>{t.label}</span>
      {badge[t.id] > 0 && <span className="badge">{badge[t.id]}</span>}
    </button>
  ))

  return (
    <NavContext.Provider value={nav}>
      <div className="app">
        <nav className="sidebar" aria-label="메뉴" style={{ '--ti': tabIndex } as React.CSSProperties}>
          <div className="brand"><b>필름함</b><small>Filmchest</small></div>
          {tabButtons}
        </nav>
        <main className="main" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} onTouchCancel={onTouchEnd}>
          <div ref={pageRef} key={currentKey} className={`page motion-${motion}`}>{content}</div>
        </main>
        <nav className="tabbar" aria-label="탭" style={{ '--ti': tabIndex } as React.CSSProperties}>
          <span className="tab-pill" aria-hidden="true" />
          {tabButtons}
        </nav>
      </div>
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
      {toastNode}
      {intro && <Intro onDone={() => setIntro(false)} />}
    </NavContext.Provider>
  )
}
