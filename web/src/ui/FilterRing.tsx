import { useId } from 'react'
import { glassLook } from '../core/filterLook'

/** 렌즈 필터 그림 (제품 사진처럼 살짝 돌아간 모습): 얇은 검은 링 + 큰 색 유리 + 그림자. 필터는 사진 대신 늘 이 그림 */
export function FilterRing({ name, glass, size = 96 }: { name: string; glass?: string; size?: number }) {
  const id = useId().replace(/:/g, '')
  const look = glassLook(name, glass)
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="필터 그림">
      <defs>
        <radialGradient id={`${id}sh`} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#000" stopOpacity=".22" /><stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}gl`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".16" /><stop offset=".55" stopColor="#fff" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity=".2" />
        </linearGradient>
        <linearGradient id={`${id}gnd`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={look.color} stopOpacity={look.alpha} /><stop offset=".45" stopColor={look.color} stopOpacity={look.alpha * 0.85} />
          <stop offset=".62" stopColor="#c9d6e6" stopOpacity=".2" /><stop offset="1" stopColor="#c9d6e6" stopOpacity=".2" />
        </linearGradient>
        <radialGradient id={`${id}hz`} cx="50%" cy="55%" r="60%">
          <stop offset="0" stopColor="#fff" stopOpacity={look.haze} /><stop offset="1" stopColor="#fff" stopOpacity={look.haze * 0.4} />
        </radialGradient>
        <clipPath id={`${id}c`}><ellipse cx="50" cy="48" rx="30" ry="41" /></clipPath>
      </defs>
      {/* 그림자 */}
      <ellipse cx="53" cy="94" rx="27" ry="3.6" fill={`url(#${id}sh)`} />
      {/* 테 두께 (오른쪽으로 보이는 면) */}
      <ellipse cx="53.2" cy="48" rx="34.4" ry="45.2" fill="#070708" />
      {/* 앞면 링 + 톱니 */}
      <ellipse cx="50" cy="48" rx="34.4" ry="45.2" fill="#141416" />
      <ellipse cx="50" cy="48" rx="33.7" ry="44.5" fill="none" stroke="#3a3a3e" strokeWidth="1" strokeDasharray=".5 .55" />
      <ellipse cx="50" cy="48" rx="31.2" ry="42.3" fill="none" stroke="#000" strokeOpacity=".7" strokeWidth="1.2" />
      {/* 유리 */}
      <g clipPath={`url(#${id}c)`}>
        <rect x="0" y="0" width="100" height="100" fill={look.alpha < 0.3 ? '#dfe4ea' : '#101114'} />
        {look.kind === 'gnd'
          ? <rect x="0" y="0" width="100" height="100" fill={`url(#${id}gnd)`} />
          : <rect x="0" y="0" width="100" height="100" fill={look.color} fillOpacity={look.alpha} />}
        {look.haze > 0 && <rect x="0" y="0" width="100" height="100" fill={`url(#${id}hz)`} />}
        {look.kind === 'clear' && <path d="M24 70 Q48 86 76 62" fill="none" stroke="#9b7cf0" strokeOpacity=".28" strokeWidth="2.4" />}
        {look.kind === 'star' && [0, 45, 90, 135].map((d) => (
          <line key={d} x1="50" y1="6" x2="50" y2="90" stroke="#fff" strokeOpacity=".4" strokeWidth=".5" transform={`rotate(${d} 50 48)`} />
        ))}
        <rect x="0" y="0" width="100" height="100" fill={`url(#${id}gl)`} />
        {/* 유리 가장자리 안쪽 그늘 */}
        <ellipse cx="50" cy="48" rx="30" ry="41" fill="none" stroke="#000" strokeOpacity=".28" strokeWidth="2" />
      </g>
      {look.kind === 'polar' && <rect x="49.3" y="3.6" width="1.4" height="3.6" rx=".7" fill="#fff" fillOpacity=".75" />}
    </svg>
  )
}
