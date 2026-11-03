// 웹 ui/FilterRing.tsx — 렌즈 필터 그림 (제품 사진처럼 살짝 돌아간 모습): 얇은 검은 링 + 큰 색 유리 + 그림자. 필터는 사진 대신 늘 이 그림
import { useId } from 'react'
import Svg, { ClipPath, Defs, Ellipse, G, Line, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg'
import { glassLook } from './core/filterLook'

export function FilterRing({ name, glass, size = 96 }: { name: string; glass?: string; size?: number }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '')
  const look = glassLook(name, glass)
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityLabel="필터 그림">
      <Defs>
        <RadialGradient id={`${id}sh`} cx="53" cy="94" rx="27" ry="3.6" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#000" stopOpacity=".22" /><Stop offset="1" stopColor="#000" stopOpacity="0" />
        </RadialGradient>
        <LinearGradient id={`${id}gl`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#fff" stopOpacity=".16" /><Stop offset=".55" stopColor="#fff" stopOpacity="0" /><Stop offset="1" stopColor="#000" stopOpacity=".2" />
        </LinearGradient>
        <LinearGradient id={`${id}gnd`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={look.color} stopOpacity={look.alpha} /><Stop offset=".45" stopColor={look.color} stopOpacity={look.alpha * 0.85} />
          <Stop offset=".62" stopColor="#c9d6e6" stopOpacity=".2" /><Stop offset="1" stopColor="#c9d6e6" stopOpacity=".2" />
        </LinearGradient>
        <RadialGradient id={`${id}hz`} cx="50" cy="53" r="45" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#fff" stopOpacity={look.haze} /><Stop offset="1" stopColor="#fff" stopOpacity={look.haze * 0.4} />
        </RadialGradient>
        <ClipPath id={`${id}c`}><Ellipse cx="50" cy="48" rx="30" ry="41" /></ClipPath>
      </Defs>
      {/* 두께·그림자가 오른쪽으로 나오므로 전체를 조금 왼쪽으로 옮겨 가운데로 (웹과 같음) */}
      <G x={-1.6}>
      <Ellipse cx="53" cy="94" rx="27" ry="3.6" fill={`url(#${id}sh)`} />
      <Ellipse cx="53.2" cy="48" rx="34.4" ry="45.2" fill="#070708" />
      <Ellipse cx="50" cy="48" rx="34.4" ry="45.2" fill="#141416" />
      <Ellipse cx="50" cy="48" rx="33.7" ry="44.5" fill="none" stroke="#3a3a3e" strokeWidth={1} strokeDasharray=".5 .55" />
      <Ellipse cx="50" cy="48" rx="31.2" ry="42.3" fill="none" stroke="#000" strokeOpacity={0.7} strokeWidth={1.2} />
      <G clipPath={`url(#${id}c)`}>
        <Rect x="0" y="0" width="100" height="100" fill={look.alpha < 0.3 ? '#dfe4ea' : '#101114'} />
        {look.kind === 'gnd'
          ? <Rect x="0" y="0" width="100" height="100" fill={`url(#${id}gnd)`} />
          : <Rect x="0" y="0" width="100" height="100" fill={look.color} fillOpacity={look.alpha} />}
        {look.haze > 0 ? <Rect x="0" y="0" width="100" height="100" fill={`url(#${id}hz)`} /> : null}
        {look.kind === 'clear' ? <Path d="M24 70 Q48 86 76 62" fill="none" stroke="#9b7cf0" strokeOpacity={0.28} strokeWidth={2.4} /> : null}
        {look.kind === 'star' ? [0, 45, 90, 135].map((d) => (
          <Line key={d} x1="50" y1="6" x2="50" y2="90" stroke="#fff" strokeOpacity={0.4} strokeWidth={0.5} rotation={d} origin="50, 48" />
        )) : null}
        <Rect x="0" y="0" width="100" height="100" fill={`url(#${id}gl)`} />
        <Ellipse cx="50" cy="48" rx="30" ry="41" fill="none" stroke="#000" strokeOpacity={0.28} strokeWidth={2} />
      </G>
      {look.kind === 'polar' ? <Rect x="49.3" y="3.6" width="1.4" height="3.6" rx=".7" fill="#fff" fillOpacity={0.75} /> : null}
      </G>
    </Svg>
  )
}
