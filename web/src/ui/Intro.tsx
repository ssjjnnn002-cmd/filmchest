import { useEffect, useRef, useState } from 'react'

/** 켤 때 한 번. 통에서 필름이 나오고, 제목만 남긴 뒤 앱으로 넘어간다. */
export function Intro({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false)
  const dark = useDark()
  const done = useRef(onDone)
  done.current = onDone

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const hold = window.setTimeout(() => setLeaving(true), reduce ? 700 : 2200)
    const end = window.setTimeout(() => done.current(), reduce ? 700 : 2620)
    return () => { window.clearTimeout(hold); window.clearTimeout(end) }
  }, [])

  return (
    <div className={`intro ${dark ? 'dark' : 'light'} ${leaving ? 'leaving' : ''}`} onClick={() => done.current()} role="img" aria-label="필름함">
      <div className="intro-stage">
        <div className="intro-mark">
          <div className="intro-leader">
            <svg viewBox="0 0 130 66" aria-hidden="true">
              <defs>
                <linearGradient id="intro-base" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stopColor="#c47637" /><stop offset=".5" stopColor="#a95a26" /><stop offset="1" stopColor="#8c4719" />
                </linearGradient>
              </defs>
              <path d="M0 0 H104 Q116 0 122 12 L130 26 V66 H0 Z" fill="url(#intro-base)" />
              <g fill="#3a1d0b" opacity=".75">
                {[8, 24, 40, 56, 72, 88].map((x) => <rect key={`t${x}`} x={x} y="5" width="7" height="6" rx="1.5" />)}
                {[8, 24, 40, 56, 72, 88, 104, 120].map((x) => <rect key={`b${x}`} x={x} y="55" width="7" height="6" rx="1.5" />)}
              </g>
            </svg>
          </div>
          <svg className="intro-can" viewBox="0 0 92 150" aria-hidden="true">
            <defs>
              <linearGradient id="intro-metal" x1="0" x2="1">
                <stop offset="0" stopColor="#1c1c1c" /><stop offset=".35" stopColor="#5a5a5a" /><stop offset=".6" stopColor="#2a2a2a" /><stop offset="1" stopColor="#111" />
              </linearGradient>
              <linearGradient id="intro-label" x1="0" x2="1">
                <stop offset="0" stopColor="#d9d6cf" /><stop offset=".4" stopColor="#fbfaf7" /><stop offset="1" stopColor="#cfcbc3" />
              </linearGradient>
              <linearGradient id="intro-band" x1="0" x2="1">
                <stop offset="0" stopColor="#b8401f" /><stop offset=".4" stopColor="#e45a33" /><stop offset="1" stopColor="#a93a1c" />
              </linearGradient>
            </defs>
            <rect x="30" y="0" width="32" height="10" rx="3" fill="url(#intro-metal)" />
            <rect x="4" y="8" width="84" height="14" rx="5" fill="url(#intro-metal)" />
            <rect x="6" y="20" width="80" height="108" fill="url(#intro-label)" />
            <text x="46" y="42" textAnchor="middle" fontSize="10" fontWeight="800" fill="#2a2522" fontFamily="Helvetica, Arial" letterSpacing="1.2">FILMCHEST</text>
            <text x="46" y="61" textAnchor="middle" fontSize="15" fontWeight="800" fill="#2a2522">필름함</text>
            <rect x="6" y="68" width="80" height="24" fill="url(#intro-band)" />
            <text x="46" y="86" textAnchor="middle" fontSize="17" fontWeight="900" fill="#fff" fontFamily="Helvetica, Arial">36</text>
            <text x="46" y="106" textAnchor="middle" fontSize="6.5" fill="#6b625b" fontFamily="Helvetica, Arial" letterSpacing=".8">C-41 · 135-36</text>
            <g fill="#2a2522">
              <rect x="14" y="112" width="8" height="4" /><rect x="26" y="114" width="5" height="4" /><rect x="36" y="112" width="9" height="4" />
              <rect x="50" y="114" width="6" height="4" /><rect x="60" y="112" width="4" height="4" /><rect x="68" y="114" width="8" height="4" />
            </g>
            <rect x="4" y="126" width="84" height="14" rx="5" fill="url(#intro-metal)" />
          </svg>
        </div>
        <h1>필름함</h1>
      </div>
    </div>
  )
}

function useDark() {
  const read = () => {
    const theme = document.documentElement.dataset.theme
    if (theme === 'dark') return true
    if (theme === 'light') return false
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }
  const [dark, setDark] = useState(read)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const sync = () => setDark(read())
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])
  return dark
}
