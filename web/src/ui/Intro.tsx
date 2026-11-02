import { useEffect, useRef, useState } from 'react'

/** 켤 때 한 번. 앱 아이콘의 필름통이 선으로 그려지고 필름이 나온 뒤 앱으로 넘어간다. */
export function Intro({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false)
  const done = useRef(onDone)
  done.current = onDone

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const hold = window.setTimeout(() => setLeaving(true), reduce ? 700 : 2200)
    const end = window.setTimeout(() => done.current(), reduce ? 700 : 2600)
    return () => { window.clearTimeout(hold); window.clearTimeout(end) }
  }, [])

  // 아이콘(docs/icon/filmchest-icon.svg)과 같은 선
  return (
    <div className={`intro ${leaving ? 'leaving' : ''}`} onClick={() => done.current()} role="img" aria-label="필름함">
      <div className="intro-stage">
        <svg className="intro-mark" viewBox="249 266 500 484" aria-hidden="true">
          <g fill="none" stroke="currentColor" strokeWidth="33" strokeLinejoin="round" strokeLinecap="round">
            <rect className="intro-line can" x="292" y="356" width="232" height="360" rx="40" pathLength={1} />
            <path className="intro-line cap" d="M364 356V316Q364 292 388 292H428Q452 292 452 316V356" pathLength={1} />
            <path className="intro-line leader" d="M524 420H708Q732 420 732 444V548Q732 572 708 572H676Q652 572 652 596V628Q652 652 628 652H524" pathLength={1} />
          </g>
          <g fill="currentColor">
            {[[563, 463], [613, 463], [663, 463], [563, 577]].map(([x, y], i) => (
              <rect key={i} className="intro-hole" style={{ animationDelay: `${1.05 + i * 0.09}s` }} x={x} y={y} width="30" height="30" rx="7" />
            ))}
          </g>
        </svg>
      </div>
    </div>
  )
}
