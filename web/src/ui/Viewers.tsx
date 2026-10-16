import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { ModelProfile } from '../core/profiles'
import { buildScene, fallbackSnapshot } from '../core/model3d'
import { modelHash } from '../core/profiles'

/** 손가락/마우스로 돌려 보는 기본 3D 모형 (턴테이블) */
export function Model3D({ profile, color, height = 240 }: { profile: ModelProfile; color: string; height?: number }) {
  const host = useRef<HTMLDivElement>(null)
  const state = useRef<{ renderer: THREE.WebGLRenderer; controls: OrbitControls; camera: THREE.PerspectiveCamera; scene?: THREE.Scene } | null>(null)
  const [failed, setFailed] = useState(false)
  const lastProfile = useRef('')

  // 렌더러는 한 번만 만든다
  useEffect(() => {
    const el = host.current!
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    } catch {
      setFailed(true)
      return
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.NeutralToneMapping
    el.appendChild(renderer.domElement)
    const camera = new THREE.PerspectiveCamera(21, 4 / 3, 0.1, 800)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableZoom = false
    controls.enablePan = false
    controls.enableDamping = true
    controls.minPolarAngle = Math.PI * 0.28
    controls.maxPolarAngle = Math.PI * 0.53
    state.current = { renderer, controls, camera }
    let frame = 0
    const loop = () => {
      frame = requestAnimationFrame(loop)
      const s = state.current
      if (!s?.scene) return
      controls.update()
      renderer.render(s.scene, camera)
    }
    const resize = () => {
      const w = el.clientWidth, h = el.clientHeight
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    const ro = new ResizeObserver(resize)
    ro.observe(el)
    resize()
    loop()
    return () => {
      cancelAnimationFrame(frame)
      ro.disconnect()
      controls.dispose()
      renderer.dispose()
      renderer.domElement.remove()
      state.current = null
      lastProfile.current = '' // 다시 붙을 때 카메라 위치를 새로 잡게

    }
  }, [])

  // 형태/색이 바뀌면 장면만 갈아 끼운다 (돌려 본 각도는 형태가 같으면 유지)
  const key = JSON.stringify(profile) + color
  useEffect(() => {
    const s = state.current
    if (!s) return
    const { scene, camera, target } = buildScene(profile, color, s.renderer)
    const profileKey = JSON.stringify(profile)
    if (lastProfile.current !== profileKey) {
      s.camera.position.copy(camera.position)
      s.controls.target.copy(target)
      lastProfile.current = profileKey
    }
    s.scene?.traverse((o) => { if (o instanceof THREE.Mesh) o.geometry.dispose() })
    s.scene = scene
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  if (failed) return <img src={`/models/${modelHash(profile)}.png`} alt="" style={{ width: '100%', height, objectFit: 'contain' }} onError={(e) => { e.currentTarget.src = fallbackSnapshot(profile) }} />
  return <div ref={host} className="viewer3d" style={{ height }} aria-label="끌어서 돌려 보는 카메라 모형" />
}

/**
 * 확대/이동 보기: 두 손가락 확대, 끌어서 이동, 휠 확대, 두 번 눌러 확대/원래대로.
 * onSwipe가 있으면 원래 크기에서 좌우로 밀 때 호출한다.
 */
export function ZoomView({ src, onSwipe, background = 'transparent' }: {
  src: string; onSwipe?: (dir: 1 | -1) => void; background?: string
}) {
  const box = useRef<HTMLDivElement>(null)
  const img = useRef<HTMLImageElement>(null)
  const t = useRef({ s: 1, x: 0, y: 0, fit: 1, w: 0, h: 0 })
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const gesture = useRef<{ dist: number; s: number; cx: number; cy: number; startX: number; moved: boolean } | null>(null)

  const apply = () => {
    const { s, x, y } = t.current
    if (img.current) img.current.style.transform = `translate(${x}px, ${y}px) scale(${s})`
  }

  const fit = () => {
    const el = box.current, im = img.current
    if (!el || !im || !im.naturalWidth) return
    const W = el.clientWidth, H = el.clientHeight
    const f = Math.min(W / im.naturalWidth, H / im.naturalHeight)
    t.current = { s: f, fit: f, x: (W - im.naturalWidth * f) / 2, y: (H - im.naturalHeight * f) / 2, w: W, h: H }
    apply()
  }

  useEffect(() => {
    const ro = new ResizeObserver(fit)
    if (box.current) ro.observe(box.current)
    return () => ro.disconnect()
  }, [])

  const zoomAt = (px: number, py: number, ns: number) => {
    const c = t.current
    ns = Math.min(Math.max(ns, c.fit), c.fit * 10)
    c.x = px - ((px - c.x) * ns) / c.s
    c.y = py - ((py - c.y) * ns) / c.s
    c.s = ns
    clamp()
    apply()
  }

  const clamp = () => {
    const c = t.current, im = img.current!
    const w = im.naturalWidth * c.s, h = im.naturalHeight * c.s
    c.x = w <= c.w ? (c.w - w) / 2 : Math.min(0, Math.max(c.w - w, c.x))
    c.y = h <= c.h ? (c.h - h) / 2 : Math.min(0, Math.max(c.h - h, c.y))
  }

  const local = (e: { clientX: number; clientY: number }) => {
    const r = box.current!.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }

  const onDown = (e: React.PointerEvent) => {
    box.current!.setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, local(e))
    const pts = [...pointers.current.values()]
    if (pts.length === 2) {
      gesture.current = { dist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y), s: t.current.s,
        cx: (pts[0].x + pts[1].x) / 2, cy: (pts[0].y + pts[1].y) / 2, startX: 0, moved: true }
    } else {
      gesture.current = { dist: 0, s: t.current.s, cx: pts[0].x, cy: pts[0].y, startX: pts[0].x, moved: false }
    }
  }

  const onMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return
    const prev = pointers.current.get(e.pointerId)!
    const p = local(e)
    pointers.current.set(e.pointerId, p)
    const pts = [...pointers.current.values()]
    const g = gesture.current
    if (!g) return
    if (pts.length === 2) {
      const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
      zoomAt((pts[0].x + pts[1].x) / 2, (pts[0].y + pts[1].y) / 2, (g.s * d) / g.dist)
    } else if (t.current.s > t.current.fit * 1.01) {
      t.current.x += p.x - prev.x
      t.current.y += p.y - prev.y
      clamp()
      apply()
    }
    if (Math.abs(p.x - g.startX) > 6) g.moved = true
  }

  const onUp = (e: React.PointerEvent) => {
    const p = local(e)
    const g = gesture.current
    pointers.current.delete(e.pointerId)
    if (g && pointers.current.size === 0 && onSwipe && g.dist === 0 && t.current.s <= t.current.fit * 1.01) {
      const dx = p.x - g.startX
      if (Math.abs(dx) > 50) onSwipe(dx < 0 ? 1 : -1)
    }
    if (pointers.current.size === 0) gesture.current = null
  }

  const onDouble = (e: React.MouseEvent) => {
    const p = local(e)
    const c = t.current
    if (c.s > c.fit * 1.05) fit()
    else zoomAt(p.x, p.y, c.fit * 3)
  }

  const onWheel = (e: React.WheelEvent) => {
    const p = local(e)
    zoomAt(p.x, p.y, t.current.s * (e.deltaY < 0 ? 1.12 : 1 / 1.12))
  }

  return (
    <div ref={box} className="zoom" style={{ background, width: '100%', height: '100%' }}
      onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
      onDoubleClick={onDouble} onWheel={onWheel}>
      <img ref={img} src={src} alt="" onLoad={fit} draggable={false} />
    </div>
  )
}
