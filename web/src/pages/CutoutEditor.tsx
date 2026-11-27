import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { pushOverlay } from '../backStack'
import type { Cutout } from '../core/bgRemove'
import { Icon } from '../ui/common'

/** 배경 다듬기: 지운 곳(흐리게 보임)을 되살리거나 더 지운다. 아이폰 CutoutEditorView와 같은 화면 */
export function CutoutEditor({ cutout, onDone }: { cutout: Cutout; onDone: (c: Cutout | null) => void }) {
  const { image } = cutout
  const w = image.width, h = image.height
  const [erase, setErase] = useState(true)
  const [brush, setBrush] = useState(36)
  const [undoCount, setUndoCount] = useState(0)
  const [changed, setChanged] = useState(false)
  const stage = useRef<HTMLDivElement>(null)
  const view = useRef<HTMLCanvasElement>(null)
  const cancelRef = useRef(() => onDone(null))
  cancelRef.current = () => onDone(null)
  useEffect(() => pushOverlay(() => cancelRef.current()), [])

  // 가림막 캔버스 (알파 = 남길 정도), 합친 그림, 그리기 상태
  const st = useRef<{
    mask: HTMLCanvasElement; comp: HTMLCanvasElement; tmp: HTMLCanvasElement
    undo: Uint8ClampedArray[]; zoom: number; pan: { x: number; y: number }
    pointers: Map<number, { x: number; y: number }>; last?: { x: number; y: number }
    pinch?: { dist: number; zoom: number; pan: { x: number; y: number }; mid: { x: number; y: number } }
    ring?: { x: number; y: number }; painting: boolean
  }>()
  if (!st.current) {
    const mk = () => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c }
    const mask = mk()
    putAlpha(mask, cutout.mask)
    st.current = { mask, comp: mk(), tmp: mk(), undo: [], zoom: 1, pan: { x: 0, y: 0 }, pointers: new Map(), painting: false }
  }
  const brushRef = useRef(brush)
  brushRef.current = brush
  const eraseRef = useRef(erase)
  eraseRef.current = erase

  const rect = () => {
    const el = stage.current!
    const fit = Math.min(el.clientWidth / w, el.clientHeight / h) * 0.92
    const s = fit * st.current!.zoom
    return { x: el.clientWidth / 2 - (w * s) / 2 + st.current!.pan.x, y: el.clientHeight / 2 - (h * s) / 2 + st.current!.pan.y, s }
  }

  /** 남길 곳은 그대로, 지운 곳은 흐리게 */
  const compose = () => {
    const { comp, tmp, mask } = st.current!
    const t = tmp.getContext('2d')!
    t.globalCompositeOperation = 'copy'
    t.drawImage(image, 0, 0)
    t.globalCompositeOperation = 'destination-in'
    t.drawImage(mask, 0, 0)
    const c = comp.getContext('2d')!
    c.globalCompositeOperation = 'copy'
    c.globalAlpha = 0.28
    c.drawImage(image, 0, 0)
    c.globalCompositeOperation = 'source-over'
    c.globalAlpha = 1
    c.drawImage(tmp, 0, 0)
  }

  const draw = () => {
    const cv = view.current, el = stage.current
    if (!cv || !el) return
    const dpr = window.devicePixelRatio || 1
    const cw = Math.round(el.clientWidth * dpr), ch = Math.round(el.clientHeight * dpr)
    if (cv.width !== cw || cv.height !== ch) { cv.width = cw; cv.height = ch }
    const ctx = cv.getContext('2d')!
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, el.clientWidth, el.clientHeight)
    const r = rect()
    // 바둑판
    ctx.save()
    ctx.beginPath()
    ctx.rect(r.x, r.y, w * r.s, h * r.s)
    ctx.clip()
    ctx.fillStyle = checker(ctx)
    ctx.fillRect(r.x, r.y, w * r.s, h * r.s)
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(st.current!.comp, r.x, r.y, w * r.s, h * r.s)
    ctx.restore()
    const ring = st.current!.ring
    if (ring) {
      ctx.beginPath()
      ctx.arc(ring.x, ring.y, brushRef.current / 2, 0, Math.PI * 2)
      ctx.fillStyle = 'rgb(255 255 255 / .15)'
      ctx.fill()
      ctx.lineWidth = 1.5
      ctx.strokeStyle = '#fff'
      ctx.shadowColor = 'rgb(0 0 0 / .6)'
      ctx.shadowBlur = 2
      ctx.stroke()
      ctx.shadowBlur = 0
    }
  }

  useEffect(() => {
    compose()
    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(stage.current!)
    return () => ro.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const alpha = () => getAlpha(st.current!.mask)
  const report = () => {
    setUndoCount(st.current!.undo.length)
    const a = alpha(), init = cutout.initial
    let diff = false
    for (let i = 0; i < a.length; i += 3) if (Math.abs(a[i] - init[i]) > 2) { diff = true; break }
    setChanged(diff)
  }
  const snapshot = () => {
    const u = st.current!.undo
    u.push(alpha())
    if (u.length > 20) u.shift()
  }
  const toImage = (p: { x: number; y: number }) => { const r = rect(); return { x: (p.x - r.x) / r.s, y: (p.y - r.y) / r.s } }
  const stroke = (a: { x: number; y: number }, b: { x: number; y: number }) => {
    const r = rect()
    const width = brushRef.current / r.s
    const ctx = st.current!.mask.getContext('2d')!
    ctx.globalCompositeOperation = eraseRef.current ? 'destination-out' : 'source-over'
    ctx.strokeStyle = '#fff'
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = width
    // 가장자리를 살짝 부드럽게
    ctx.shadowColor = '#fff'
    ctx.shadowBlur = width * 0.18
    const p = toImage(a), q = toImage(b)
    ctx.beginPath()
    ctx.moveTo(p.x, p.y)
    ctx.lineTo(q.x + 0.01, q.y)
    ctx.stroke()
    compose()
  }
  const local = (e: React.PointerEvent) => { const b = stage.current!.getBoundingClientRect(); return { x: e.clientX - b.left, y: e.clientY - b.top } }

  const down = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    const s = st.current!
    const p = local(e)
    s.pointers.set(e.pointerId, p)
    if (s.pointers.size === 1) {
      snapshot()
      s.painting = true
      s.last = p
      s.ring = p
      stroke(p, p)
    } else if (s.pointers.size === 2) {
      // 두 손가락이 닿으면 칠하던 것을 무르고 확대로
      if (s.painting) { const prev = s.undo.pop(); if (prev) { putAlpha(s.mask, prev); compose() } }
      s.painting = false
      s.ring = undefined
      const [a, b] = [...s.pointers.values()]
      s.pinch = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom: s.zoom, pan: { ...s.pan }, mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } }
    }
    draw()
  }
  const move = (e: React.PointerEvent) => {
    const s = st.current!
    const p = local(e)
    if (!s.pointers.has(e.pointerId)) {
      // 마우스: 붓 크기 미리보기
      if (e.pointerType === 'mouse') { s.ring = p; draw() }
      return
    }
    s.pointers.set(e.pointerId, p)
    if (s.pinch && s.pointers.size >= 2) {
      const [a, b] = [...s.pointers.values()]
      const el = stage.current!
      const z = Math.min(8, Math.max(1, s.pinch.zoom * Math.hypot(a.x - b.x, a.y - b.y) / Math.max(1, s.pinch.dist)))
      const k = z / s.pinch.zoom
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
      const anchor = { x: s.pinch.mid.x - el.clientWidth / 2 - s.pinch.pan.x, y: s.pinch.mid.y - el.clientHeight / 2 - s.pinch.pan.y }
      s.zoom = z
      s.pan = z === 1 ? { x: 0, y: 0 } : { x: s.pinch.pan.x + anchor.x * (1 - k) + (mid.x - s.pinch.mid.x), y: s.pinch.pan.y + anchor.y * (1 - k) + (mid.y - s.pinch.mid.y) }
    } else if (s.painting && s.last) {
      stroke(s.last, p)
      s.last = p
      s.ring = p
    }
    draw()
  }
  const up = (e: React.PointerEvent) => {
    const s = st.current!
    s.pointers.delete(e.pointerId)
    if (s.pointers.size < 2) s.pinch = undefined
    if (s.pointers.size === 0) {
      if (s.painting) report()
      s.painting = false
      s.last = undefined
      if (e.pointerType !== 'mouse') s.ring = undefined
      draw()
    }
  }
  const wheel = (e: React.WheelEvent) => {
    const s = st.current!
    const el = stage.current!
    const p = local(e as unknown as React.PointerEvent)
    const z = Math.min(8, Math.max(1, s.zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1)))
    const k = z / s.zoom
    const anchor = { x: p.x - el.clientWidth / 2 - s.pan.x, y: p.y - el.clientHeight / 2 - s.pan.y }
    s.zoom = z
    s.pan = z === 1 ? { x: 0, y: 0 } : { x: s.pan.x + anchor.x * (1 - k), y: s.pan.y + anchor.y * (1 - k) }
    draw()
  }

  const undo = () => {
    const prev = st.current!.undo.pop()
    if (!prev) return
    putAlpha(st.current!.mask, prev)
    compose(); draw(); report()
  }
  const reset = () => {
    snapshot()
    putAlpha(st.current!.mask, cutout.initial)
    compose(); draw(); report()
  }

  return createPortal(
    <div className="fullscreen cutout-editor" role="dialog" aria-label="배경 다듬기">
      <div className="fs-bar">
        <button className="btn ghost" onClick={() => onDone(null)}>취소</button>
        <h2>배경 다듬기</h2>
        <button className="btn ghost" style={{ fontWeight: 600 }} onClick={() => onDone({ ...cutout, mask: alpha() })}>완료</button>
      </div>
      <div ref={stage} className="cutout-stage" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        onPointerLeave={(e) => { if (e.pointerType === 'mouse' && !st.current!.pointers.size) { st.current!.ring = undefined; draw() } }} onWheel={wheel}>
        <canvas ref={view} />
      </div>
      <div className="cutout-tools">
        <div className="segmented slide" style={{ '--i': erase ? 0 : 1, '--n': 2 } as React.CSSProperties}>
          <button className={erase ? 'on' : ''} onClick={() => setErase(true)}>지우기</button>
          <button className={!erase ? 'on' : ''} onClick={() => setErase(false)}>되살리기</button>
        </div>
        <div className="toggle" style={{ padding: 0 }}>
          <span>붓 크기</span>
          <input type="range" className="slider" min={10} max={90} step={1} value={brush} onChange={(e) => setBrush(Number(e.target.value))} aria-label="붓 크기" />
          <span style={{ width: 36, display: 'grid', placeItems: 'center' }}>
            <span style={{ width: brush / 3 + 6, height: brush / 3 + 6, borderRadius: '50%', background: 'var(--muted)', opacity: 0.5 }} />
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <button className="btn ghost small" onClick={undo} disabled={!undoCount}><Icon name="undo" size={18} /> 되돌리기</button>
          <button className="btn ghost small" onClick={reset} disabled={!changed}><Icon name="rotate.left" size={18} /> 처음대로</button>
        </div>
        <p className="sub" style={{ margin: 0 }}>한 손가락으로 칠하고, 두 손가락으로 키우거나 옮겨요. 흐린 곳이 지워진 곳이에요.</p>
      </div>
    </div>,
    document.body,
  )
}

function putAlpha(c: HTMLCanvasElement, a: Uint8ClampedArray) {
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  const img = ctx.createImageData(c.width, c.height)
  for (let i = 0; i < a.length; i++) { img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = 255; img.data[i * 4 + 3] = a[i] }
  ctx.putImageData(img, 0, 0)
}

function getAlpha(c: HTMLCanvasElement) {
  const d = c.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, c.width, c.height).data
  const a = new Uint8ClampedArray(c.width * c.height)
  for (let i = 0; i < a.length; i++) a[i] = d[i * 4 + 3]
  return a
}

let tile: HTMLCanvasElement | null = null
function checker(ctx: CanvasRenderingContext2D) {
  if (!tile) {
    tile = document.createElement('canvas')
    tile.width = tile.height = 16
    const t = tile.getContext('2d')!
    t.fillStyle = '#ededed'; t.fillRect(0, 0, 16, 16)
    t.fillStyle = '#d1d1d1'; t.fillRect(0, 0, 8, 8); t.fillRect(8, 8, 8, 8)
  }
  return ctx.createPattern(tile, 'repeat')!
}
