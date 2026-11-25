// 목록 줄 밀기 (아이폰 목록과 같음): 밀면 동그란 버튼이 나오고 그대로 멈춘다. 끝까지 밀면 바로 실행.
// 세로 스크롤은 그대로 (가로로 더 많이 움직였을 때만 민다). 다른 줄을 밀거나 밖을 누르면 닫힌다.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Icon } from './common'
import { IOS_CURVE, tick } from '../motion'

const OPEN = 78
let closeOpened: (() => void) | undefined

export function SwipeRow({ children, favorite, onFavorite, onDelete }: {
  children: ReactNode
  favorite?: boolean
  onFavorite?: () => void
  onDelete?: () => void
}) {
  const [dx, setDx] = useState(0)
  const base = useRef(0)
  const [dragging, setDragging] = useState(false)
  const start = useRef<{ x: number; y: number; id: number; horizontal?: boolean } | null>(null)
  const moved = useRef(false)
  const root = useRef<HTMLDivElement>(null)
  const full = useRef(false)
  const close = useRef(() => {})
  close.current = () => { base.current = 0; setDx(0) }
  const rest = (v: number) => {
    base.current = v
    setDx(v)
    if (v) { const me = () => close.current(); if (closeOpened) closeOpened(); closeOpened = me; close.current = () => { base.current = 0; setDx(0); if (closeOpened === me) closeOpened = undefined } }
  }
  useEffect(() => {
    if (!dx || dragging) return
    const away = (e: Event) => { if (!root.current?.contains(e.target as Node)) close.current() }
    document.addEventListener('pointerdown', away, true)
    return () => document.removeEventListener('pointerdown', away, true)
  }, [dx, dragging])

  const end = () => {
    setDragging(false)
    if (!start.current?.horizontal) { start.current = null; return }
    start.current = null
    if (full.current) {
      full.current = false
      if (dx > 0) { rest(0); onFavorite?.() } else { rest(0); onDelete?.() }
      return
    }
    rest(dx > OPEN * 0.5 && onFavorite ? OPEN : dx < -OPEN * 0.5 && onDelete ? -OPEN : 0)
  }
  const act = (fn?: () => void) => { close.current(); fn?.() }
  const shown = Math.min(1, Math.abs(dx) / OPEN)

  return (
    <div ref={root} className={`swipe-row ${dx ? 'open' : ''}`}
      onPointerDown={(e) => { start.current = { x: e.clientX, y: e.clientY, id: e.pointerId }; moved.current = false }}
      onPointerMove={(e) => {
        const s = start.current
        if (!s || s.id !== e.pointerId) return
        const ddx = e.clientX - s.x, ddy = e.clientY - s.y
        if (s.horizontal === undefined) {
          if (Math.abs(ddx) < 8 && Math.abs(ddy) < 8) return
          s.horizontal = Math.abs(ddx) > Math.abs(ddy)
          if (s.horizontal) { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); setDragging(true) }
        }
        if (!s.horizontal) return
        moved.current = true
        let v = base.current + ddx
        if ((v > 0 && !onFavorite) || (v < 0 && !onDelete)) v *= 0.12   // 버튼이 없는 쪽은 뻑뻑하게
        const far = Math.abs(v) > (root.current?.clientWidth ?? 320) * 0.55 && (v > 0 ? !!onFavorite : !!onDelete)
        if (far !== full.current) { full.current = far; if (far) tick() }
        setDx(v)
      }}
      onPointerUp={end}
      onPointerCancel={() => { start.current = null; setDragging(false); rest(0) }}
      // 민 뒤이거나 열려 있을 때는 줄을 눌러 들어가지 않는다
      onClickCapture={(e) => {
        const onBtn = (e.target as HTMLElement).closest('.swipe-act')
        if (onBtn) return
        if (moved.current || base.current) { e.stopPropagation(); e.preventDefault(); if (!moved.current) close.current(); moved.current = false }
      }}>
      {dx > 0 && onFavorite && (
        <button className="swipe-act fav" style={{ width: Math.max(dx, OPEN) , opacity: shown }} onClick={() => act(onFavorite)}>
          <i style={{ transform: `scale(${0.5 + shown * 0.5})` }}><Icon name="star" size={22} /></i><span>{favorite ? '해제' : '즐겨찾기'}</span>
        </button>
      )}
      {dx < 0 && onDelete && (
        <button className="swipe-act del" style={{ width: Math.max(-dx, OPEN), opacity: shown }} onClick={() => act(onDelete)}>
          <i style={{ transform: `scale(${0.5 + shown * 0.5})` }}><Icon name="trash" size={22} /></i><span>삭제</span>
        </button>
      )}
      <div className="swipe-body" style={{ transform: dx ? `translateX(${dx}px)` : undefined, transition: dragging ? 'none' : `transform .38s ${IOS_CURVE}` }}>{children}</div>
    </div>
  )
}
