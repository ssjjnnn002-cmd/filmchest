// 목록 줄 밀기 (아이폰 목록과 같음): 왼쪽→오른쪽으로 밀면 즐겨찾기, 오른쪽→왼쪽으로 밀면 삭제.
// 세로 스크롤은 그대로 (가로로 더 많이 움직였을 때만 민다). 끝까지 밀거나 놓으면 동작, 짧으면 제자리.
import { useRef, useState, type ReactNode } from 'react'
import { Icon } from './common'

const TRIGGER = 72

export function SwipeRow({ children, favorite, onFavorite, onDelete }: {
  children: ReactNode
  favorite?: boolean
  onFavorite?: () => void
  onDelete?: () => void
}) {
  const [dx, setDx] = useState(0)
  const start = useRef<{ x: number; y: number; id: number; horizontal?: boolean } | null>(null)
  const moved = useRef(false)

  const end = () => {
    if (dx > TRIGGER && onFavorite) onFavorite()
    else if (dx < -TRIGGER && onDelete) onDelete()
    start.current = null
    setDx(0)
  }

  return (
    <div className="swipe-row"
      onPointerDown={(e) => { start.current = { x: e.clientX, y: e.clientY, id: e.pointerId }; moved.current = false }}
      onPointerMove={(e) => {
        const s = start.current
        if (!s || s.id !== e.pointerId) return
        const ddx = e.clientX - s.x, ddy = e.clientY - s.y
        if (s.horizontal === undefined) {
          if (Math.abs(ddx) < 8 && Math.abs(ddy) < 8) return
          s.horizontal = Math.abs(ddx) > Math.abs(ddy)
          if (s.horizontal) (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
        }
        if (!s.horizontal) return
        moved.current = true
        const v = ddx > 0 ? (onFavorite ? Math.min(ddx, 140) : 0) : (onDelete ? Math.max(ddx, -140) : 0)
        setDx(v)
      }}
      onPointerUp={end}
      onPointerCancel={() => { start.current = null; setDx(0) }}
      // 민 뒤에는 줄을 눌러 열지 않는다
      onClickCapture={(e) => { if (moved.current) { e.stopPropagation(); e.preventDefault(); moved.current = false } }}>
      {dx > 0 && <div className="swipe-bg fav" style={{ width: dx }}><Icon name="star" size={20} /><span>{favorite ? '해제' : '즐겨찾기'}</span></div>}
      {dx < 0 && <div className="swipe-bg del" style={{ width: -dx }}><Icon name="trash" size={20} /><span>삭제</span></div>}
      <div className="swipe-body" style={{ transform: `translateX(${dx}px)`, transition: start.current ? 'none' : 'transform .2s' }}>{children}</div>
    </div>
  )
}
