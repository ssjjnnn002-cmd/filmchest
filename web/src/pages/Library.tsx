import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, kept } from '../db'
import { useNav } from '../App'
import type { Camera, Roll } from '../core/types'
import { filmById } from '../core/films'
import { CameraCover, Canister, GlassGroup, Icon, PageHeader, rollFilmName } from '../ui/common'
import { CameraEdit } from './CameraEdit'
import { GearAdd, GearBoard, type GearKind } from './Gear'
import { TagFilter } from '../ui/gearExtras'
import { Settings } from './Settings'
import { getPref, setPref } from '../platform'
import { cameraPhotoURL } from '../photoStore'
import { seedExample } from '../seed'

export const batteryDue = (c: Camera) =>
  !!c.batteryAt && !(c.battery ?? '').startsWith('필요 없음') && Date.now() - c.batteryAt > 365 * 864e5

/** 끄는 중인 카드 (화면에 떠서 손가락을 따라다니는 복사본의 위치) */
interface Drag {
  id: string
  x: number // 손가락 위치
  y: number
  offX: number // 카드 왼쪽 위에서 손가락까지
  offY: number
  w: number
  h: number
}

export function Library() {
  const nav = useNav()
  const cameras = useLiveQuery(() => db.cameras.orderBy('sortOrder').filter((c) => !c.deletedAt).toArray(), [])
  const rolls = useLiveQuery(async () => (await db.rolls.where('status').equals('loaded').toArray()).filter(kept), []) ?? []
  const [adding, setAdding] = useState(false)
  const [gear, setGear] = useState<GearKind | 'camera'>('camera')
  const [gearAdd, setGearAdd] = useState(false)
  const [tag, setTag] = useState<string>()
  const lensTags = useLiveQuery(async () => (await db.lenses.toArray()).flatMap((x) => x.tags ?? []), []) ?? []
  const filterTags = useLiveQuery(async () => (await db.filters.toArray()).flatMap((x) => x.tags ?? []), []) ?? []
  const [settings, setSettings] = useState(false)
  const [layout, setLayout] = useState<string>(getPref('libraryLayout', 'grid'))
  // 순서 편집 중: 카드가 흔들리고, 눌러도 들어가지 않는다. 화면 배치는 그대로 둔다(끄는 카드가 어긋나지 않게).
  const [editing, setEditing] = useState(false)
  const [order, setOrder] = useState<string[]>([])
  const orderRef = useRef<string[]>([])
  const [drag, setDrag] = useState<Drag | null>(null)
  const dragRef = useRef<Drag | null>(null)
  const ghostRef = useRef<HTMLDivElement>(null)
  const pointerRef = useRef<{ x: number; y: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const slots = useRef(new Map<string, DOMRect>())
  // 격자 칸의 실제 자리. 카드가 움직이는 중에도 이 좌표로만 자리를 고른다.
  const slotRects = useRef<DOMRect[]>([])
  const slotScroll = useRef(0)
  const signature = (cameras ?? []).map((c) => c.id).join('|')

  // 저장된 순서가 바뀌면 따라간다 (끄는 중에는 건드리지 않음)
  useEffect(() => {
    if (dragRef.current) return
    const next = signature ? signature.split('|') : []
    orderRef.current = next
    setOrder(next)
  }, [signature])

  const loadedFor = (c: Camera) => rolls.find((r) => r.cameraId === c.id)
  const empty = (cameras ?? []).filter((c) => !loadedFor(c)).length
  const byId = new Map((cameras ?? []).map((c) => [c.id, c]))
  const shown = (order.length ? order : (cameras ?? []).map((c) => c.id))
    .map((id) => byId.get(id))
    .filter((c): c is Camera => !!c)
    .filter((c) => editing || !tag || (c.tags ?? []).includes(tag))

  const toggleLayout = () => {
    const next = layout === 'grid' ? 'list' : 'grid'
    setLayout(next)
    setPref('libraryLayout', next)
  }

  // 순서가 바뀌면 다른 카드들이 새 자리로 미끄러진다 (끄는 카드는 제외)
  useLayoutEffect(() => {
    const nodes = containerRef.current?.querySelectorAll<HTMLElement>('[data-reorder]') ?? []
    const next = new Map<string, DOMRect>()
    const rects: DOMRect[] = []
    nodes.forEach((node) => {
      const id = node.dataset.reorder!
      node.getAnimations().forEach((anim) => anim.cancel())
      const box = node.getBoundingClientRect()
      rects.push(box)
      const prev = slots.current.get(id)
      if (prev && id !== dragRef.current?.id && (Math.abs(prev.left - box.left) > 1 || Math.abs(prev.top - box.top) > 1)) {
        node.animate(
          [{ transform: `translate(${prev.left - box.left}px, ${prev.top - box.top}px)` }, { transform: 'none' }],
          { duration: 180, easing: 'cubic-bezier(.2,.8,.2,1)' },
        )
      }
      next.set(id, box)
    })
    slots.current = next
    if (dragRef.current) {
      slotRects.current = rects
      slotScroll.current = window.scrollY
    }
  }, [order.join('|'), layout])

  const beginDrag = (id: string, node: HTMLElement, x: number, y: number) => {
    const nodes = [...(containerRef.current?.querySelectorAll<HTMLElement>('[data-reorder]') ?? [])]
    slotRects.current = nodes.map((item) => item.getBoundingClientRect())
    slotScroll.current = window.scrollY
    pointerRef.current = { x, y }
    const r = node.getBoundingClientRect()
    const d: Drag = { id, x, y, offX: x - r.left, offY: y - r.top, w: r.width, h: r.height }
    dragRef.current = d
    setDrag(d)
    navigator.vibrate?.(12)
  }

  // 끄는 동안: 떠 있는 카드만 손가락을 따라가고, 칸 좌표는 드래그가 시작될 때의 격자를 쓴다.
  useEffect(() => {
    if (!drag) return
    let pointer: { x: number; y: number } | null = null
    let scrollDir = 0
    let raf = 0
    const tick = () => {
      raf = requestAnimationFrame(tick)
      if (scrollDir) window.scrollBy(0, scrollDir * 8)
      const cur = dragRef.current
      if (!cur || !pointer) return
      const el = ghostRef.current
      if (el) {
        el.style.left = `${pointer.x - cur.offX}px`
        el.style.top = `${pointer.y - cur.offY}px`
      }
      const rects = slotRects.current
      if (!rects.length) return
      const dy = window.scrollY - slotScroll.current
      const cx = pointer.x - cur.offX + cur.w / 2
      const cy = pointer.y - cur.offY + cur.h / 2
      let best = 0
      let bestDist = Infinity
      for (let i = 0; i < rects.length; i++) {
        const r = rects[i]
        const dist = Math.hypot(cx - (r.left + r.width / 2), cy - (r.top - dy + r.height / 2))
        if (dist < bestDist) { bestDist = dist; best = i }
      }
      const list = orderRef.current
      const from = list.indexOf(cur.id)
      if (from < 0 || best === from) return
      const here = rects[from]
      const hereDist = Math.hypot(cx - (here.left + here.width / 2), cy - (here.top - dy + here.height / 2))
      // 칸 가운데를 분명히 지나갔을 때만 옮긴다. 경계에서 왕복하지 않게.
      if (bestDist + 36 > hereDist) return
      const next = list.slice()
      next.splice(from, 1)
      next.splice(best, 0, cur.id)
      orderRef.current = next
      setOrder(next)
      navigator.vibrate?.(4)
    }
    raf = requestAnimationFrame(tick)
    const onMove = (e: PointerEvent) => {
      pointer = { x: e.clientX, y: e.clientY }
      pointerRef.current = pointer
      scrollDir = e.clientY < 90 ? -1 : e.clientY > window.innerHeight - 130 ? 1 : 0
      e.preventDefault()
    }
    const onUp = async () => {
      cancelAnimationFrame(raf)
      scrollDir = 0
      const ordered = orderRef.current.slice()
      dragRef.current = null
      pointerRef.current = null
      setDrag(null)
      // 손을 뗄 때 생기는 클릭이 카드 안 버튼으로 가지 않게
      const swallow = (ev: Event) => { ev.preventDefault(); ev.stopPropagation() }
      window.addEventListener('click', swallow, true)
      window.setTimeout(() => window.removeEventListener('click', swallow, true), 350)
      // 순서를 기록하기 전에 사진을 파일로 복사해 둔다. 순서 저장이 사진을 지우지 않게.
      await Promise.all(ordered.map((id) => cameraPhotoURL(id)))
      await db.transaction('rw', db.cameras, async () => {
        await Promise.all(ordered.map((id, index) => (byId.get(id)?.sortOrder !== index ? db.cameras.update(id, { sortOrder: index }) : undefined)))
      })
    }
    const blockScroll = (e: TouchEvent) => e.preventDefault()
    window.addEventListener('pointermove', onMove, { passive: false })
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    window.addEventListener('touchmove', blockScroll, { passive: false })
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      window.removeEventListener('touchmove', blockScroll)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!drag])

  // 순서가 바뀌며 다시 그려져도, 떠 있는 카드는 손가락 자리에 그대로 둔다.
  useLayoutEffect(() => {
    const cur = dragRef.current
    const el = ghostRef.current
    if (!cur || !el) return
    const x = pointerRef.current?.x ?? cur.x
    const y = pointerRef.current?.y ?? cur.y
    el.style.left = `${x - cur.offX}px`
    el.style.top = `${y - cur.offY}px`
  })

  const enterEdit = () => {
    if (editing) return
    setEditing(true)
    nav.toast('끌어서 순서를 바꾸세요')
  }

  const dragged = drag ? byId.get(drag.id) : undefined
  const item = (c: Camera) => (
    <ReorderItem key={c.id} id={c.id} editing={editing} placeholder={drag?.id === c.id}
      onLongPress={enterEdit} onStart={beginDrag}>
      {layout === 'grid' ? <CameraCard camera={c} roll={loadedFor(c)} /> : <CameraRow camera={c} roll={loadedFor(c)} />}
    </ReorderItem>
  )

  return (
    <>
      <PageHeader title="내 장비"
        left={editing ? undefined : <button className="glass-btn round" onClick={() => setSettings(true)} aria-label="설정"><Icon name="gear" /></button>}
        actions={editing
          ? <button className="glass-btn prominent" onClick={() => setEditing(false)}>완료</button>
          : (
            <GlassGroup>
              <button onClick={toggleLayout} aria-label={layout === 'grid' ? '목록으로 보기' : '그리드로 보기'}>
                <Icon name={layout === 'grid' ? 'list' : 'grid'} />
              </button>
              <button onClick={() => gear === 'camera' ? setAdding(true) : setGearAdd(true)} aria-label={gear === 'camera' ? '카메라 추가' : `${gear === 'lens' ? '렌즈' : gear === 'filter' ? '필터' : '필름'} 추가`}><Icon name="plus" /></button>
            </GlassGroup>
          )} />

      {!editing && (
        <div className="segmented" role="tablist" aria-label="장비" style={{ margin: '4px 0 12px' }}>
          {([['camera', '카메라'], ['lens', '렌즈'], ['filter', '필터'], ['film', '필름']] as const).map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={gear === id} className={gear === id ? 'on' : ''} onClick={() => { setGear(id); setTag(undefined) }}>{label}</button>
          ))}
        </div>
      )}
      {!editing && gear !== 'film' && (
        <TagFilter tags={gear === 'camera' ? (cameras ?? []).flatMap((c) => c.tags ?? []) : gear === 'lens' ? lensTags : filterTags} value={tag} onChange={setTag} />
      )}

      {gear !== 'camera' && !editing && <GearBoard kind={gear} layout={layout} tag={tag} />}

      {gear === 'camera' && cameras && cameras.length === 0 && (
        <div className="empty">
          <Icon name="camera" size={40} />
          <b>카메라가 없어요</b>
          <span>가진 카메라를 등록해 보세요.</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn primary" onClick={() => setAdding(true)}>카메라 추가</button>
            <button className="btn" onClick={async () => { await seedExample(); nav.toast('예시 카메라와 롤을 넣었어요') }}>예시로 둘러보기</button>
          </div>
        </div>
      )}

      {gear === 'camera' && cameras && cameras.length > 0 && (
        <div style={{ display: 'grid', gap: 18 }}>
          <button className={`banner ${editing ? 'dimmed' : ''}`} onClick={() => nav.loadFilm()} tabIndex={editing ? -1 : 0}>
            <Canister film={filmById('kodak-portra-400')} size={52} />
            <div style={{ flex: 1 }}>
              <b>필름 장착하기</b>
              <span>{empty > 0 ? `빈 카메라 ${empty}대` : '모든 카메라에 필름이 들어 있어요'}</span>
            </div>
            <Icon name="right" />
          </button>

          <div ref={containerRef} className={`${layout === 'grid' ? 'grid' : 'group'} ${editing ? 'editing' : ''}`}>
            {shown.map(item)}
          </div>
        </div>
      )}

      {drag && dragged && createPortal(
        <div ref={ghostRef} className={`reorder-ghost ${layout === 'grid' ? '' : 'row-ghost'}`}
          style={{ left: drag.x - drag.offX, top: drag.y - drag.offY, width: drag.w, height: drag.h }}>
          {layout === 'grid' ? <CameraCard camera={dragged} roll={loadedFor(dragged)} /> : <CameraRow camera={dragged} roll={loadedFor(dragged)} />}
        </div>,
        document.body,
      )}

      {adding && <CameraEdit onClose={() => setAdding(false)} />}
      {gearAdd && gear !== 'camera' && <GearAdd kind={gear} onClose={() => setGearAdd(false)} />}
      {settings && <Settings onClose={() => setSettings(false)} />}
    </>
  )
}

/**
 * 카드 하나. 평소엔 길게(0.45초) 누르면 편집 모드로 들어가며 바로 끌기 시작하고,
 * 편집 중엔 살짝만 움직여도 끈다. 편집 중엔 안쪽 버튼이 눌리지 않는다.
 */
function ReorderItem({ id, editing, placeholder, onLongPress, onStart, children }: {
  id: string; editing: boolean; placeholder: boolean
  onLongPress: () => void
  onStart: (id: string, node: HTMLElement, x: number, y: number) => void
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)

  const down = (e: React.PointerEvent) => {
    if (e.button !== 0 || !ref.current) return
    const node = ref.current
    const sx = e.clientX, sy = e.clientY
    let x = sx, y = sy
    let started = false
    let timer = 0
    const cleanup = () => {
      window.clearTimeout(timer)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', cleanup)
      window.removeEventListener('pointercancel', cleanup)
    }
    const start = () => {
      if (started) return
      started = true
      cleanup()
      onStart(id, node, x, y)
    }
    const move = (ev: PointerEvent) => {
      x = ev.clientX; y = ev.clientY
      const dist = Math.hypot(x - sx, y - sy)
      if (editing) { if (dist > 4) start() }
      else if (dist > 10) cleanup() // 길게 누르기 전에 움직이면 스크롤
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', cleanup)
    window.addEventListener('pointercancel', cleanup)
    if (!editing) timer = window.setTimeout(() => { onLongPress(); start() }, 450)
  }

  return (
    <div ref={ref} data-reorder={id} onPointerDown={down} onContextMenu={(e) => e.preventDefault()}
      onClickCapture={(e) => { if (editing) { e.preventDefault(); e.stopPropagation() } }}
      className={`reorder-item ${editing ? 'wiggle' : ''} ${placeholder ? 'placeholder' : ''}`}>
      <div className="reorder-inner" style={editing ? { pointerEvents: 'none' } : undefined}>{children}</div>
    </div>
  )
}

function CameraCard({ camera, roll }: { camera: Camera; roll?: Roll }) {
  const nav = useNav()
  const open = () => nav.push({ type: 'camera', id: camera.id })
  return (
    <div className="card">
      <div className="cover" onClick={open}><CameraCover camera={camera} /></div>
      <div className="name" onClick={open}>
        <b className="truncate">{camera.model}</b>
        <span className="sub">{camera.brand}</span>{' '}
        {batteryDue(camera) && <span className="battery-due">배터리 교체</span>}
      </div>
      <hr />
      {roll ? (
        <button className="film-line" onClick={() => nav.push({ type: 'roll', id: roll.id })}>
          <Canister film={filmById(roll.filmId)} size={30} />
          <span className="truncate">{rollFilmName(roll)}</span>
        </button>
      ) : (
        <button className="load-btn" onClick={() => nav.loadFilm(camera.id)}><Icon name="plus" size={18} /> 필름 장착</button>
      )}
    </div>
  )
}

function CameraRow({ camera, roll }: { camera: Camera; roll?: Roll }) {
  const nav = useNav()
  return (
    <div className="row" style={{ cursor: 'default' }}>
      <button className="row" style={{ padding: 0, minHeight: 0 }} onClick={() => nav.push({ type: 'camera', id: camera.id })}>
        <div style={{ width: 68 }}><CameraCover camera={camera} height={52} /></div>
        <div className="grow">
          <b className="truncate" style={{ display: 'block', fontWeight: 600 }}>{camera.brand} {camera.model}</b>
          {roll
            ? <span className="sub" style={{ color: 'var(--safelight)' }}>{rollFilmName(roll)}</span>
            : <span className="sub">비어 있음</span>}
          {batteryDue(camera) && <div className="battery-due">배터리 교체할 때가 됐어요</div>}
        </div>
      </button>
      {roll
        ? <Canister film={filmById(roll.filmId)} size={34} />
        : <button className="btn soft small" onClick={() => nav.loadFilm(camera.id)}>필름 장착</button>}
    </div>
  )
}
