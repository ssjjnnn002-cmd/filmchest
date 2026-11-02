import { useEffect, useMemo, useRef, useState } from 'react'

// 앱 아이콘(docs/icon/filmchest-icon.svg)의 1024 좌표
const ORANGE = '#F0701E'
const BG = '#141414'
const CX = 512, CY = 504
/** 아이콘이 처음 보이는 크기 (px) */
const ICON_PX = 168
/** 필름 띠: 통 오른쪽에서 나온다 (돌린 뒤엔 아래로) */
const STRIP = { x: 524, y: 420, w: 470, h: 232 }
/** 확대해 들어갈 컷 */
const FRAME = { x: 700, y: 482, w: 168, h: 108 }
const T = { show: 350, turn: 550, pull: 650, zoom: 900 }

/** 켤 때 한 번. 아이콘이 시계 방향으로 돌고, 통에서 필름이 나오고, 그 컷 안으로 들어가면 앱 첫 화면이 열린다. */
export function Intro({ onDone }: { onDone: () => void }) {
  const done = useRef(onDone)
  done.current = onDone
  const root = useRef<HTMLDivElement>(null)
  const [gone, setGone] = useState(false)
  // 화면 크기에 맞춘 보기 영역: 아이콘이 ICON_PX 크기로 가운데
  const view = useMemo(() => {
    const w = window.innerWidth, h = window.innerHeight
    const unit = 500 / ICON_PX
    return { x: CX - (w * unit) / 2, y: CY - (h * unit) / 2, w: w * unit, h: h * unit }
  }, [])

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) { const t = window.setTimeout(() => done.current(), 500); return () => window.clearTimeout(t) }
    // 브라우저마다 마스크 속 움직임이 안 그려지기도 해서, 매 프레임 속성을 직접 바꾼다
    const all = (name: string) => [...(root.current?.querySelectorAll(`.${name}`) ?? [])]
    const turnEls = all('i-turn'), pullEls = all('i-pull'), leaderEls = all('i-leader'), zoomEls = all('i-zoom')
    const fx = FRAME.x + FRAME.w / 2, fy = FRAME.y + FRAME.h / 2
    const ox = 1024 - fy, oy = fx                       // 시계 방향 90도 돌린 뒤 컷 가운데
    const scale = Math.max(view.w / FRAME.h, view.h / FRAME.w) * 1.3   // 돌리면 가로·세로가 바뀐다
    const clamp = (v: number) => Math.min(1, Math.max(0, v))
    const inOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)
    const out = (t: number) => 1 - (1 - t) ** 3
    const t1 = T.show, t2 = t1 + T.turn, t3 = t2 + T.pull, t4 = t3 + T.zoom
    // 뒤의 앱 화면을 컷 크기로 줄여 두었다가 컷과 함께 키운다 (컷 안에 첫 화면 전체가 보이게)
    const W = window.innerWidth, H = window.innerHeight, k0 = W / view.w
    const app = [...document.querySelectorAll<HTMLElement>('.app > *')].map((el) => {
      const r = el.getBoundingClientRect()
      el.style.transformOrigin = `${-r.left}px ${-r.top}px`
      return el
    })
    const fitApp = (s: number, cx: number, cy: number) => {
      const a = Math.min(1, (FRAME.h * s * k0) / W, (FRAME.w * s * k0) / H)   // 첫 화면 전체가 컷 안에 들어가게
      const px = (cx - view.x) * k0, py = (cy - view.y) * k0
      app.forEach((el) => { el.style.transform = `translate(${px - (a * W) / 2}px, ${py - (a * H) / 2}px) scale(${a})` })
    }
    const restore = () => app.forEach((el) => { el.style.transform = ''; el.style.transformOrigin = '' })
    let raf = 0
    const start = performance.now()
    const frame = (now: number) => {
      const t = now - start
      const turn = inOut(clamp((t - t1) / T.turn)) * 90
      const pull = out(clamp((t - t2) / T.pull))
      const z = clamp((t - t3) / T.zoom)
      const zp = z * z * (3 - 2 * z)                    // 천천히 시작해 빨라졌다 멈춘다
      turnEls.forEach((el) => el.setAttribute('transform', `rotate(${turn} 512 512)`))
      pullEls.forEach((el) => el.setAttribute('transform', `translate(${(pull - 1) * STRIP.w} 0)`))
      leaderEls.forEach((el) => el.setAttribute('opacity', String(1 - clamp((t - t2) / 160))))
      // 확대는 배율이 고르게 느껴지도록 로그로 키우고, 컷 가운데를 화면 가운데로 옮긴다
      const s = scale ** zp
      const tx = (CX - ox) * zp, ty = (CY - oy) * zp
      zoomEls.forEach((el) => el.setAttribute('transform', `translate(${tx + ox} ${ty + oy}) scale(${s}) translate(${-ox} ${-oy})`))
      // 컷이 나오기 전엔 컷이 통 안 자리(돌린 뒤)에 있다고 보고 맞춘다
      const cx = turn < 90 ? ox : tx + ox, cy = turn < 90 ? oy - (1 - pull) * STRIP.w : ty + oy - (1 - pull) * STRIP.w
      fitApp(s, cx, cy)
      if (t < t4) raf = requestAnimationFrame(frame)
      else { restore(); setGone(true); done.current() }
    }
    raf = requestAnimationFrame(frame)
    return () => { cancelAnimationFrame(raf); restore() }
  }, [view])

  if (gone) return null
  const holes = (y: number) => Array.from({ length: 9 }, (_, i) => (
    <rect key={`${y}-${i}`} x={STRIP.x + 24 + i * 50} y={y} width="26" height="26" rx="6" />
  ))
  return (
    <div ref={root} className="intro" onClick={() => done.current()} role="img" aria-label="필름함">
      <svg width="100%" height="100%" viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`} preserveAspectRatio="xMidYMid slice">
        <defs>
          {/* 컷 창으로 앱 첫 화면이 보인다 */}
          <mask id="intro-window" maskUnits="userSpaceOnUse" x="-100000" y="-100000" width="200000" height="200000">
            <rect x="-100000" y="-100000" width="200000" height="200000" fill="#fff" />
            <g className="i-turn" clipPath="url(#intro-out)">
              <rect className="i-pull" x={FRAME.x} y={FRAME.y} width={FRAME.w} height={FRAME.h} rx="8" fill="#000" />
            </g>
          </mask>
          <clipPath id="intro-out"><rect x={STRIP.x} y="0" width="2000" height="1024" /></clipPath>
        </defs>
        <g className="i-zoom">
          <rect x="-100000" y="-100000" width="200000" height="200000" fill={BG} mask="url(#intro-window)" />
          <g className="i-turn">
            <g fill="none" stroke={ORANGE} strokeWidth="33" strokeLinejoin="round" strokeLinecap="round">
              <g clipPath="url(#intro-out)">
                <g className="i-pull">
                  <rect x={STRIP.x - 40} y={STRIP.y} width={STRIP.w + 40} height={STRIP.h} rx="20" strokeWidth="26" />
                  <rect x={FRAME.x} y={FRAME.y} width={FRAME.w} height={FRAME.h} rx="8" strokeWidth="18" />
                  <g fill={ORANGE} stroke="none">{holes(STRIP.y + 18)}{holes(STRIP.y + STRIP.h - 44)}</g>
                </g>
              </g>
              <g className="i-leader">
                <path d="M524 420H708Q732 420 732 444V548Q732 572 708 572H676Q652 572 652 596V628Q652 652 628 652H524" />
                <g fill={ORANGE} stroke="none">
                  {[[563, 463], [613, 463], [663, 463], [563, 577]].map(([x, y], i) => <rect key={i} x={x} y={y} width="30" height="30" rx="7" />)}
                </g>
              </g>
              <rect x="292" y="356" width="232" height="360" rx="40" fill={BG} />
              <path d="M364 356V316Q364 292 388 292H428Q452 292 452 316V356" />
            </g>
          </g>
        </g>
      </svg>
    </div>
  )
}
