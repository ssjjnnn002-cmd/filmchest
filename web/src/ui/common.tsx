import { createPortal } from 'react-dom'
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Camera, Roll, RollStatus } from '../core/types'
import { statusName } from '../core/types'
import type { FilmStock } from '../core/films'
import { useCameraPhoto } from '../photoStore'
import { filmById, filmDisplayName } from '../core/films'
import { fallbackSnapshot, snapshot } from '../core/model3d'
import { modelHash, profileFor } from '../core/profiles'
import { canisterURL } from '../core/canister'
import type { FilmFormat } from '../core/types'

// --- 아이콘: iOS 시스템 아이콘 느낌(둥근 끝, 같은 굵기, 탭은 채운 모양)으로 새로 그린 것. currentColor.

/** 톱니바퀴 (톱니 8개를 계산해서 그린다) */
function gearPath() {
  const n = 8, ro = 9.2, ri = 7.4, cx = 12, cy = 12
  let d = ''
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    const w = Math.PI / n
    const pts = [[ri, a - w * 0.62], [ro, a - w * 0.34], [ro, a + w * 0.34], [ri, a + w * 0.62]]
    pts.forEach(([r, t], k) => {
      const x = (cx + r * Math.cos(t)).toFixed(2), y = (cy + r * Math.sin(t)).toFixed(2)
      d += `${i === 0 && k === 0 ? 'M' : 'L'}${x} ${y}`
    })
  }
  return d + 'Z M12 15.1a3.1 3.1 0 1 0 0-6.2 3.1 3.1 0 0 0 0 6.2z'
}

const roundSq = (x: number, y: number, s: number, r = 1.4) =>
  `M${x + r} ${y}h${s - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${s - 2 * r}a${r} ${r} 0 0 1-${r} ${r}h-${s - 2 * r}a${r} ${r} 0 0 1-${r}-${r}v-${s - 2 * r}a${r} ${r} 0 0 1 ${r}-${r}z`

const perfs = (x: number) => [5.6, 8.9, 12.2, 15.5].map((y) => `M${x} ${y}h1.6v1.9h-1.6z`).join(' ')

type IconDef = { d: string; fill?: boolean; width?: number }
const icons: Record<string, IconDef> = {
  // 탭 (채운 모양)
  'camera.fill': { fill: true, d: 'M5 7.4h2.5l1.4-2.1a1.8 1.8 0 0 1 1.5-.8h3.2a1.8 1.8 0 0 1 1.5.8l1.4 2.1H19a3 3 0 0 1 3 3v7.6a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3v-7.6a3 3 0 0 1 3-3z M12 18.1a3.9 3.9 0 1 0 0-7.8 3.9 3.9 0 0 0 0 7.8z M12 16.4a2.2 2.2 0 1 1 0-4.4 2.2 2.2 0 0 1 0 4.4z M18.6 11.3a1 1 0 1 0 0-2 1 1 0 0 0 0 2z' },
  'film.fill': { fill: true, d: `M5 3.5h14a2.2 2.2 0 0 1 2.2 2.2v12.6a2.2 2.2 0 0 1-2.2 2.2H5a2.2 2.2 0 0 1-2.2-2.2V5.7A2.2 2.2 0 0 1 5 3.5z M7 4.6h.9v14.8H7z M16.1 4.6h.9v14.8h-.9z ${perfs(4.2)} ${perfs(18.2)} M4.2 18.8h1.6v.1h-1.6z` },
  'tray.fill': { fill: true, d: 'M2.8 13.6 5 7.2a1.6 1.6 0 0 1 1.5-1.1H9v1.8H7l-1.8 5.1h3.3a1 1 0 0 1 .95.7l.45 1.3h4.2l.45-1.3a1 1 0 0 1 .95-.7h3.3L17 7.9h-2V6.1h2.5A1.6 1.6 0 0 1 19 7.2l2.2 6.4V18a2.4 2.4 0 0 1-2.4 2.4H5.2A2.4 2.4 0 0 1 2.8 18z M11.05 2.4h1.9v6.4l1.9-1.9 1.35 1.35L12 12.4 7.8 8.25 9.15 6.9l1.9 1.9z' },
  'canister.fill': { fill: true, d: 'M9.3 2.3h5.4a1.1 1.1 0 0 1 1.1 1.1v1.4H8.2V3.4a1.1 1.1 0 0 1 1.1-1.1z M7.6 5.8h8.8a2.2 2.2 0 0 1 2.2 2.2v11.4a2.2 2.2 0 0 1-2.2 2.2H7.6a2.2 2.2 0 0 1-2.2-2.2V8a2.2 2.2 0 0 1 2.2-2.2z M5.4 9.3h13.2v1H5.4z M5.4 17.2h13.2v1H5.4z' },

  // 선 아이콘
  camera: { d: 'M5 7.4h2.5l1.4-2.1a1.8 1.8 0 0 1 1.5-.8h3.2a1.8 1.8 0 0 1 1.5.8l1.4 2.1H19a3 3 0 0 1 3 3v7.6a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3v-7.6a3 3 0 0 1 3-3z M12 17.6a3.4 3.4 0 1 0 0-6.8 3.4 3.4 0 0 0 0 6.8z' },
  film: { d: 'M5 3.5h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2z M7.5 3.5v17 M16.5 3.5v17 M3 8h4.5 M3 12h4.5 M3 16h4.5 M16.5 8H21 M16.5 12H21 M16.5 16H21' },
  inbox: { d: 'M3 13.5 5.3 6.8A1.5 1.5 0 0 1 6.7 5.8H9 M15 5.8h2.3a1.5 1.5 0 0 1 1.4 1L21 13.5V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M3 13.5h5l1 2h6l1-2h5 M12 3v8 M9 8l3 3 3-3' },
  stack: { d: 'M9.3 2.8h5.4v2.4H9.3z M7.6 5.2h8.8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7.6a2 2 0 0 1-2-2v-12a2 2 0 0 1 2-2z M5.6 9.5h12.8 M5.6 17h12.8' },
  plus: { d: 'M12 4.8v14.4 M4.8 12h14.4', width: 2.1 },
  gear: { fill: true, d: gearPath() },
  grid: { d: `${roundSq(4, 4, 6.8, 1.8)} ${roundSq(13.2, 4, 6.8, 1.8)} ${roundSq(4, 13.2, 6.8, 1.8)} ${roundSq(13.2, 13.2, 6.8, 1.8)}` },
  list: { d: 'M9 6.5h11 M9 12h11 M9 17.5h11 M4.6 6.5h.01 M4.6 12h.01 M4.6 17.5h.01', width: 2.1 },
  back: { d: 'M14.8 5.2 8 12l6.8 6.8', width: 2.2 },
  left: { d: 'M14.8 5.2 8 12l6.8 6.8', width: 2.2 },
  right: { d: 'M9.2 5.2 16 12l-6.8 6.8', width: 2.2 },
  chev: { d: 'M9.5 6l6 6-6 6', width: 2.2 },
  star: { d: 'M12 3.4l2.6 5.3 5.8.85-4.2 4.1 1 5.8L12 16.7l-5.2 2.75 1-5.8-4.2-4.1 5.8-.85z' },
  heart: { d: 'M12 20.2s-7.8-4.6-7.8-10.4A4.4 4.4 0 0 1 12 7a4.4 4.4 0 0 1 7.8 2.8c0 5.8-7.8 10.4-7.8 10.4z' },
  pin: { d: 'M12 21.2s-6.6-6-6.6-11.4a6.6 6.6 0 0 1 13.2 0c0 5.4-6.6 11.4-6.6 11.4z M12 12.3a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8z' },
  trash: { d: 'M4.3 6.5h15.4 M9.4 6.5V5a1.6 1.6 0 0 1 1.6-1.6h2A1.6 1.6 0 0 1 14.6 5v1.5 M6.4 6.5l.85 12.3a1.9 1.9 0 0 0 1.9 1.8h5.7a1.9 1.9 0 0 0 1.9-1.8l.85-12.3 M10 10.3v6.2 M14 10.3v6.2' },
  more: { d: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M7.8 12h.01 M12 12h.01 M16.2 12h.01', width: 2 },
  ellipsis: { d: 'M6 12h.01 M12 12h.01 M18 12h.01', width: 2.6 },
  check: { d: 'M5 12.6l4.4 4.4L19.2 7.2', width: 2.2 },
  close: { d: 'M6.5 6.5l11 11 M17.5 6.5l-11 11', width: 2.1 },
  download: { d: 'M12 3.8v11.4 M7.6 10.8 12 15.2l4.4-4.4 M5 19.8h14' },
  zip: { d: 'M7 2.8h6.6L19 8.2V19a2.2 2.2 0 0 1-2.2 2.2H7A2.2 2.2 0 0 1 4.8 19V5A2.2 2.2 0 0 1 7 2.8z M13.4 2.8v5.6H19 M10.2 2.8v1.8 M10.2 6.4v1.8 M10.2 10v1.8 M9 14.4h2.4v3.6H9z' },
  sheet: { d: [4, 9.6, 15.2].flatMap((y) => [4, 9.6, 15.2].map((x) => roundSq(x, y, 4.8, 1.2))).join(' ') },
  photos: { d: 'M7 5.5h11a2 2 0 0 1 2 2v9 M4 8.5h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2z M2.5 17.5l4-4 4 4 2.5-2.5 4 4' },
  battery: { d: 'M4.5 7.5h13a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2z M21.5 10.5v3' },
  search: { d: 'M10.8 17.6a6.8 6.8 0 1 0 0-13.6 6.8 6.8 0 0 0 0 13.6z M15.8 15.8 20.4 20.4', width: 2.1 },
  'rotate.left': { d: 'M4 8V3.8M4 8h4.2M4.6 8A8 8 0 1 1 4 12' },
  'rotate.right': { d: 'M20 8V3.8M20 8h-4.2M19.4 8A8 8 0 1 0 20 12' },
}

export function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const icon = icons[name]
  if (!icon) return <svg width={size} height={size} aria-hidden="true" />
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0 }}
      fill={icon.fill ? 'currentColor' : 'none'} stroke={icon.fill ? 'none' : 'currentColor'}
      strokeWidth={icon.width ?? 1.9} strokeLinecap="round" strokeLinejoin="round">
      <path d={icon.d} fillRule={icon.fill ? 'evenodd' : undefined} />
    </svg>
  )
}

// --- 화면 머리 (iOS: 위에 동그란 유리 버튼, 아래 큰 제목. 스크롤하면 가운데 작은 제목)

export function PageHeader({ title, onBack, left, actions, large = true }: {
  title: string; onBack?: () => void; left?: ReactNode; actions?: ReactNode; large?: boolean
}) {
  const [scrolled, setScrolled] = useState(!large)
  const titleRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    if (!large || !titleRef.current) return
    const io = new IntersectionObserver(([e]) => setScrolled(!e.isIntersecting), { rootMargin: '-64px 0px 0px 0px' })
    io.observe(titleRef.current)
    return () => io.disconnect()
  }, [large])
  return (
    <>
      <div className={`navbar ${scrolled ? 'scrolled' : ''}`}>
        <div className="nav-left">
          {onBack && <button className="glass-btn round back" onClick={onBack} aria-label="뒤로"><Icon name="back" size={22} /></button>}
          {left}
        </div>
        <div className="nav-title" aria-hidden={large}>{title}</div>
        <div className="nav-right">{actions}</div>
      </div>
      {large && <h1 ref={titleRef} className="large-title">{title}</h1>}
    </>
  )
}

/** 오른쪽 위 버튼 묶음 (여러 개면 한 캡슐 안에) */
export function GlassGroup({ children }: { children: ReactNode }) {
  return <div className="glass-group">{children}</div>
}

// --- 시트 (아래에서 올라오는 창)

export function Sheet({ title, onClose, left, right, children, wide, page, shield }: {
  title: string; onClose: () => void; left?: ReactNode; right?: ReactNode; children: ReactNode; wide?: boolean
  /** 화면을 꽉 채운다. 바깥 탭으로 닫히지 않는다. */
  page?: boolean
  /** 연 직후 남는 탭을 한 번 삼킨다. 파일 선택 직후 창이 닫히거나 가져오기가 눌리는 것을 막는다. */
  shield?: boolean
}) {
  const blockBackdrop = useRef(true)
  const blockTimer = useRef(0)
  const [shieldOn, setShieldOn] = useState(!!shield)
  useEffect(() => {
    const pause = () => {
      blockBackdrop.current = true
      window.clearTimeout(blockTimer.current)
      blockTimer.current = window.setTimeout(() => { blockBackdrop.current = false }, 800)
    }
    pause()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    // 필름·날짜·파일 선택 창이 닫힐 때 남는 탭
    document.addEventListener('change', pause, true)
    document.addEventListener('focusout', pause, true)
    window.addEventListener('keydown', onKey)
    return () => {
      window.clearTimeout(blockTimer.current)
      document.removeEventListener('change', pause, true)
      document.removeEventListener('focusout', pause, true)
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])
  useEffect(() => {
    if (!shield) return
    const t = window.setTimeout(() => setShieldOn(false), 700)
    return () => window.clearTimeout(t)
  }, [shield])
  // 닫힐 때(어떤 이유로든 사라질 때) 모습을 복제해 내려가며 사라지게 한다
  const rootRef = useRef<HTMLDivElement>(null)
  const sheetRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{ y: number; dy: number } | null>(null)
  const backdropDown = useRef(false)
  useLayoutEffect(() => {
    const root = rootRef.current
    const openedAt = performance.now()
    return () => {
      // 열자마자 사라지는 경우(개발 모드의 이중 실행 등)는 건너뛴다
      if (!root || performance.now() - openedAt < 150 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      const ghost = root.cloneNode(true) as HTMLElement
      ghost.classList.add('leaving')
      ghost.setAttribute('aria-hidden', 'true')
      ghost.style.pointerEvents = 'none'
      const scroller = root.querySelector('.sheet, .sheet-page')
      const ghostScroller = ghost.querySelector('.sheet, .sheet-page')
      document.body.appendChild(ghost)
      if (scroller && ghostScroller) ghostScroller.scrollTop = scroller.scrollTop
      window.setTimeout(() => ghost.remove(), 300)
    }
  }, [])

  // 키보드는 화면을 줄인다. 시트는 보이는 영역에만 두고, 그 변화 때문에 커서가 빠지면 다시 붙인다.
  useEffect(() => {
    const root = rootRef.current
    const sheet = sheetRef.current
    const vv = window.visualViewport
    if (!root || !sheet) return
    const body = document.body
    const lockedHere = !body.dataset.sheetLock
    const scrollY = window.scrollY
    const prev = { position: body.style.position, top: body.style.top, width: body.style.width, overflow: body.style.overflow }
    if (lockedHere) {
      body.dataset.sheetLock = '1'
      body.style.overflow = 'hidden'
      body.style.position = 'fixed'
      body.style.top = `-${scrollY}px`
      body.style.width = '100%'
    }
    let resizedAt = 0
    const pinCaret = (el: EventTarget | null) => {
      if (!(el instanceof HTMLInputElement) || el.type === 'date' || el.type === 'time' || el.type === 'file') return
      // WebKit은 오른쪽 정렬 입력칸에서 스크롤 위치와 그려진 커서가 어긋난다. 치는 동안만 왼쪽으로 두고 끝글자를 보여 준다.
      el.style.textAlign = 'left'
      if (el.selectionStart === el.value.length && el.selectionEnd === el.value.length) {
        el.scrollLeft = el.scrollWidth
      }
    }
    const reveal = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement) || !target.matches('input, textarea, select')) return
      const field = target.closest('.field') ?? target
      window.setTimeout(() => {
        const box = sheet.getBoundingClientRect()
        const rect = field.getBoundingClientRect()
        const top = box.top + 72
        const bottom = Math.min(box.bottom, (vv?.offsetTop ?? 0) + (vv?.height ?? window.innerHeight)) - 16
        if (rect.bottom > bottom) sheet.scrollTop += rect.bottom - bottom
        else if (rect.top < top) sheet.scrollTop -= top - rect.top
        pinCaret(target)
      }, 60)
    }
    const fit = () => {
      if (!vv || drag.current) return
      root.style.top = `${vv.offsetTop}px`
      root.style.height = `${vv.height}px`
      root.style.bottom = 'auto'
      sheet.style.maxHeight = `${Math.max(280, vv.height - 12)}px`
    }
    const onResize = () => { resizedAt = performance.now(); fit() }
    const onFocusIn = (e: FocusEvent) => reveal(e.target)
    const onInput = (e: Event) => pinCaret(e.target)
    const onFocusOut = (e: FocusEvent) => {
      const t = e.target
      if (!(t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement) || !root.contains(t)) return
      const recentResize = performance.now() - resizedAt <= 500
      const movedInside = e.relatedTarget instanceof Node && root.contains(e.relatedTarget)
      window.setTimeout(() => {
        if (!root.isConnected) return
        const back = recentResize && !movedInside && !(document.activeElement instanceof HTMLElement && root.contains(document.activeElement))
        if (back) {
          t.focus({ preventScroll: true })
          reveal(t)
          return
        }
        if (document.activeElement !== t && t instanceof HTMLInputElement) t.style.textAlign = ''
      }, 0)
    }
    fit()
    vv?.addEventListener('resize', onResize)
    vv?.addEventListener('scroll', fit)
    root.addEventListener('focusin', onFocusIn)
    root.addEventListener('input', onInput)
    root.addEventListener('focusout', onFocusOut)
    return () => {
      vv?.removeEventListener('resize', onResize)
      vv?.removeEventListener('scroll', fit)
      root.removeEventListener('focusin', onFocusIn)
      root.removeEventListener('input', onInput)
      root.removeEventListener('focusout', onFocusOut)
      root.style.top = ''
      root.style.height = ''
      root.style.bottom = ''
      sheet.style.maxHeight = ''
      if (lockedHere) {
        delete body.dataset.sheetLock
        body.style.position = prev.position
        body.style.top = prev.top
        body.style.width = prev.width
        body.style.overflow = prev.overflow
        window.scrollTo(0, scrollY)
      }
    }
  }, [])

  // 위쪽(손잡이·제목줄)을 아래로 끌어 닫기
  const onDragStart = (e: React.PointerEvent) => {
    if (page || (e.target as HTMLElement).closest('button')) return
    drag.current = { y: e.clientY, dy: 0 }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onDragMove = (e: React.PointerEvent) => {
    const d = drag.current, el = sheetRef.current
    if (!d || !el) return
    d.dy = Math.max(0, e.clientY - d.y)
    el.style.transition = 'none'
    el.style.transform = `translateY(${d.dy}px)`
  }
  const onDragEnd = () => {
    const d = drag.current, el = sheetRef.current
    drag.current = null
    if (!d || !el) return
    el.style.transition = ''
    if (d.dy > 110) { onClose(); return }
    el.style.transform = ''
  }

  const head = (
    <div className="sheet-head" onPointerDown={onDragStart} onPointerMove={onDragMove} onPointerUp={onDragEnd} onPointerCancel={onDragEnd}>
      <div className="left">{left ?? <button className="btn" onClick={onClose}>닫기</button>}</div>
      <h2>{title}</h2>
      <div className="right">{right}</div>
    </div>
  )
  const guard = shieldOn ? (
    <div className="sheet-shield" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
      onClick={(e) => { e.preventDefault(); e.stopPropagation() }} />
  ) : null
  if (page) {
    return createPortal(
      <div ref={rootRef} className="fullscreen sheet-root" role="dialog" aria-label={title}>
        {head}
        <div className="sheet-page">{children}</div>
        {guard}
      </div>,
      document.body,
    )
  }
  // 움직이는(transform) 카드 안에서 열려도 화면 기준으로 뜨게 body에 둔다
  return createPortal(
    <div ref={rootRef} className="sheet-backdrop sheet-root"
      onPointerDown={(e) => { backdropDown.current = e.target === e.currentTarget }}
      onPointerUp={(e) => {
        const startedOutside = backdropDown.current
        backdropDown.current = false
        if (!startedOutside || e.target !== e.currentTarget || blockBackdrop.current) return
        onClose()
      }}>
      <div ref={sheetRef} className="sheet" role="dialog" aria-label={title} style={wide ? { width: 'min(820px, 100%)' } : undefined}>
        {head}
        {children}
        {guard}
      </div>
    </div>,
    document.body,
  )
}

/** 페이지 안 확인 창 (브라우저 confirm()은 쓸 수 없는 환경이 있어서) */
export function Confirm({ message, action = '삭제', onConfirm, onCancel }: {
  message: string; action?: string; onConfirm: () => void; onCancel: () => void
}) {
  return createPortal(
    <div className="alert-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel() }}>
      <div className="alert" role="alertdialog" aria-label={message}>
        <p>{message}</p>
        <div className="actions">
          <button className="btn" onClick={onCancel}>취소</button>
          <button className="btn" style={{ color: 'var(--danger)' }} onClick={onConfirm}>{action}</button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

let toastTimer: number | undefined
export function useToast() {
  const [msg, setMsg] = useState<string>()
  const [leaving, setLeaving] = useState(false)
  const show = (m: string) => {
    setMsg(m)
    setLeaving(false)
    window.clearTimeout(toastTimer)
    toastTimer = window.setTimeout(() => {
      setLeaving(true)
      toastTimer = window.setTimeout(() => setMsg(undefined), 250)
    }, 2400)
  }
  const node = msg ? <div key={msg} className={`toast ${leaving ? 'leaving' : ''}`} role="status">{msg}</div> : null
  return [node, show] as const
}

// --- 그림

export function Canister({ film, format = '135', size = 48, className }: { film?: FilmStock; format?: FilmFormat; size?: number; className?: string }) {
  const url = useMemo(() => (film ? canisterURL(film, format) : undefined), [film, format])
  if (!url) return <div style={{ width: size, height: size, display: 'grid', placeItems: 'center', color: 'var(--muted)' }}><Icon name="film" size={size * 0.6} /></div>
  return <img src={url} width={size} height={size} alt={filmDisplayName(film)} className={className} />
}

export function useObjectURL(blob?: Blob) {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    if (!blob || blob.size === 0) { setUrl(undefined); return }
    let cancelled = false
    let created: string | undefined
    void blob.arrayBuffer().then((buf) => {
      if (cancelled || !buf.byteLength) return
      created = URL.createObjectURL(new Blob([buf], { type: blob.type || 'image/png' }))
      setUrl(created)
    }).catch(() => { if (!cancelled) setUrl(undefined) })
    return () => {
      cancelled = true
      if (created) URL.revokeObjectURL(created)
    }
  }, [blob])
  return url
}

const BODY_COLOR = '#1C1C1E'

/** 카메라 대표 모습: 기기 파일로 둔 사진 → 기본 3D 모형 정지 이미지. 기본 모형은 항상 검정. */
export function CameraCover({ camera, height = 110 }: { camera: Camera; height?: number }) {
  const wantPhoto = !!(camera.hasPhoto || camera.photo)
  const photo = useCameraPhoto(camera.id, wantPhoto)
  const baked = modelHash(profileFor(camera.brand, camera.model, camera.style))
  const [model, setModel] = useState(`/models/${baked}.png`)
  useEffect(() => {
    if (wantPhoto) return
    setModel(`/models/${baked}.png`)
  }, [wantPhoto, baked])
  const useDrawnModel = () => {
    const profile = profileFor(camera.brand, camera.model, camera.style)
    try { setModel(snapshot(profile, BODY_COLOR)) } catch { setModel(fallbackSnapshot(profile)) }
  }
  if (wantPhoto && !photo) {
    return <div style={{ height, display: 'grid', placeItems: 'center' }}><div className="spinner" /></div>
  }
  const src = photo ?? model
  return src
    ? <div style={{ overflow: photo ? 'hidden' : undefined }}>
        <img src={src} alt={`${camera.brand} ${camera.model}`} draggable={false}
          onError={photo ? undefined : useDrawnModel}
          style={{ width: '100%', height, objectFit: 'contain', display: 'block',
            transform: photo ? `translate(${(camera.photoOffsetX ?? 0) * 100}%, ${(camera.photoOffsetY ?? 0) * 100}%) scale(${camera.photoScale ?? 1})` : undefined }} />
      </div>
    : <div style={{ height, display: 'grid', placeItems: 'center' }}><div className="spinner" /></div>
}

export function StatusBadge({ status }: { status: RollStatus }) {
  return <span className={`status ${status}`}>{statusName[status]}</span>
}

export function Progress({ done, total }: { done: number; total: number }) {
  return <div className="progress" role="progressbar" aria-valuenow={done} aria-valuemax={total}><i style={{ width: `${(done / Math.max(total, 1)) * 100}%` }} /></div>
}

// --- 표시용 도우미

const pad = (n: number) => String(n).padStart(2, '0')
export const fmtDay = (ms: number) => { const d = new Date(ms); return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}` }
export const fmtMonthDay = (ms: number) => { const d = new Date(ms); return `${pad(d.getMonth() + 1)}.${pad(d.getDate())}` }
export const fmtDayTime = (ms: number) => { const d = new Date(ms); return `${fmtDay(ms)} ${pad(d.getHours())}:${pad(d.getMinutes())}` }
export const toInputDate = (ms: number) => { const d = new Date(ms); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }
export const toInputDateTime = (ms: number) => `${toInputDate(ms)}T${pad(new Date(ms).getHours())}:${pad(new Date(ms).getMinutes())}`

/** 카메라 이름. 장비를 지운 뒤에는 롤에 적어 둔 이름을 쓴다. 아직 읽는 중이면 빈 칸. */
export const cameraName = (camera: Camera | undefined, roll: Roll) => {
  if (camera) return `${camera.brand} ${camera.model}`
  const recorded = [roll.cameraBrand, roll.cameraModel].filter(Boolean).join(' ')
  if (recorded) return recorded
  return roll.cameraId ? '\u00a0' : '카메라 알 수 없음'
}

export const rollCameraFormat = (camera: Camera | undefined, roll: Roll): FilmFormat =>
  camera?.format ?? roll.cameraFormat ?? '135'

export const rollFilm = (r: Roll) => filmById(r.filmId)
export const rollFilmName = (r: Roll) => filmById(r.filmId) ? filmDisplayName(filmById(r.filmId)) : '필름 알 수 없음'
export const dateUnknown = (r: Roll) => r.isArchive && r.days.length === 0
export const sortedDays = (r: Roll) => [...r.days].sort((a, b) => a.startedAt - b.startedAt)
export const sortedLocations = (r: Roll) => [...r.locations].sort((a, b) => a.startFrame - b.startFrame)
export const rollStart = (r: Roll) => sortedDays(r)[0]?.startedAt ?? r.loadedAt

export function dateRangeText(r: Roll) {
  if (dateUnknown(r)) return '날짜 알 수 없음'
  const days = sortedDays(r).map((d) => d.startedAt)
  if (!days.length) return fmtDay(r.loadedAt)
  const first = days[0], last = days.at(-1)!
  if (new Date(first).toDateString() === new Date(last).toDateString()) return fmtDay(first)
  const sameYear = new Date(first).getFullYear() === new Date(last).getFullYear()
  return `${fmtDay(first)} – ${sameYear ? fmtMonthDay(last) : fmtDay(last)}`
}

/** 내려받을 때 이름: "2026.09.28 HP5 Plus · X-700" */
export function rollTitle(r: Roll, camera?: Camera) {
  const date = dateUnknown(r) ? '날짜 미상' : fmtDay(rollStart(r))
  return `${date} ${filmById(r.filmId)?.name ?? '필름 미상'} · ${camera?.model || r.cameraModel || '카메라 미상'}`
}

export const bytesText = (b?: number) => {
  if (!b) return undefined
  if (b > 1e9) return `${(b / 1e9).toFixed(1)}GB`
  if (b > 1e6) return `${(b / 1e6).toFixed(1)}MB`
  return `${Math.round(b / 1e3)}KB`
}
export const resolutionText = (w?: number, h?: number) =>
  w && h ? `${w} × ${h} · ${((w * h) / 1e6).toFixed(1)}MP` : undefined
