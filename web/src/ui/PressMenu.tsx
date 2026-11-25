// 길게 누르기 메뉴 (아이폰과 같음): 누른 것이 살짝 떠오르고 뒤가 어두워지며, 아래에 메뉴가 나온다.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from './common'
import { pushOverlay } from '../backStack'
import { tick } from '../motion'

export interface PressItem { label: string; icon: string; danger?: boolean; onPress: () => void }

export function PressMenu({ items, children, className }: { items: PressItem[]; children: ReactNode; className?: string }) {
  const root = useRef<HTMLDivElement>(null)
  const timer = useRef<number>()
  const from = useRef<{ x: number; y: number }>()
  const held = useRef(false)
  const [at, setAt] = useState<DOMRect>()
  const open = () => {
    if (!root.current) return
    held.current = true
    tick(15)
    setAt(root.current.getBoundingClientRect())
  }
  const stop = () => window.clearTimeout(timer.current)
  useEffect(() => stop, [])
  return (
    <div ref={root} className={`press-menu ${className ?? ''}`}
      onPointerDown={(e) => {
        held.current = false
        if (e.button || (e.target as HTMLElement).closest('.no-press')) return
        from.current = { x: e.clientX, y: e.clientY }
        stop()
        timer.current = window.setTimeout(open, 480)
      }}
      onPointerMove={(e) => { const f = from.current; if (f && Math.hypot(e.clientX - f.x, e.clientY - f.y) > 8) stop() }}
      onPointerUp={stop} onPointerCancel={stop} onPointerLeave={stop}
      onContextMenu={(e) => { e.preventDefault(); stop(); if (!at) open() }}
      onClickCapture={(e) => { if (held.current) { held.current = false; e.preventDefault(); e.stopPropagation() } }}>
      {children}
      {at && <Lifted from={root.current!} rect={at} items={items} onClose={() => setAt(undefined)} />}
    </div>
  )
}

function Lifted({ from, rect, items, onClose }: { from: HTMLElement; rect: DOMRect; items: PressItem[]; onClose: () => void }) {
  const slot = useRef<HTMLDivElement>(null)
  const closing = useRef(onClose)
  closing.current = onClose
  useEffect(() => pushOverlay(() => closing.current()), [])
  useEffect(() => {
    const copy = from.firstElementChild?.cloneNode(true) as HTMLElement | undefined
    if (copy && slot.current) { copy.inert = true; slot.current.appendChild(copy) }
    from.style.visibility = 'hidden'
    return () => { from.style.visibility = '' }
  }, [from])
  const menuH = items.length * 46 + 20
  // 아래에 자리가 없으면 위로 (그래도 없으면 카드를 밀어 올린다)
  const below = rect.bottom + 12 + menuH < window.innerHeight - 20
  const above = !below && rect.top - 12 - menuH > 20
  const lift = below || above ? 0 : window.innerHeight - 30 - menuH - rect.bottom - 12
  const ignore = useRef(performance.now())
  return createPortal(
    <div className="press-back" onClick={() => { if (performance.now() - ignore.current > 350) onClose() }}>
      <div ref={slot} className="press-lift" style={{ left: rect.left, top: rect.top + lift, width: rect.width, height: rect.height }} />
      <div className="menu press-list" role="menu" style={{
        position: 'fixed', zIndex: 2, right: 'auto',
        left: Math.min(Math.max(16, rect.left + (rect.width > 300 ? 60 : 0)), window.innerWidth - 266), width: 250,
        ...(above ? { top: rect.top - 12 - menuH, transformOrigin: 'bottom left' } : { top: rect.bottom + lift + 16, transformOrigin: 'top left' }),
      }}>
        {items.map((it) => (
          <button key={it.label} className={`row ${it.danger ? 'danger' : ''}`} role="menuitem" onClick={(e) => { e.stopPropagation(); onClose(); it.onPress() }}>
            <span style={{ color: 'var(--safelight)' }}><Icon name={it.icon} size={21} /></span><span className="grow">{it.label}</span>
          </button>
        ))}
      </div>
    </div>,
    document.body,
  )
}
