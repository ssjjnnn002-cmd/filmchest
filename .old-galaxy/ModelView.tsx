import { Image } from 'react-native'
import Svg, { Circle, Path, Rect } from 'react-native-svg'
import { modelHash, profileFor } from './profiles'
import { modelShots } from './modelShots'
import type { BodyStyle } from './types'

function Silhouette({ styleName, height }: { styleName: BodyStyle; height: number }) {
  const compact = styleName === 'compact'
  const rf = styleName === 'rangefinder'
  const scale = height / 110
  return (
    <Svg width={132 * scale} height={84 * scale} viewBox="0 0 132 84">
      <Rect x="8" y={compact ? 28 : 22} width="116" height={compact ? 40 : 48} rx="10" fill="#1C1C1E" />
      <Rect x="46" y={compact ? 16 : 8} width="40" height="16" rx="5" fill="#2A2A2C" />
      <Circle cx={rf ? 48 : 66} cy="48" r={compact ? 12 : 16} fill="#111" stroke="#3A3A3C" strokeWidth="3" />
      <Circle cx={rf ? 48 : 66} cy="48" r="5" fill="#1C1C1E" />
      {rf ? <Circle cx="92" cy="40" r="6" fill="#111" stroke="#3A3A3C" strokeWidth="2" /> : null}
      <Path d="M18 34h16" stroke="#3A3A3C" strokeWidth="2" />
    </Svg>
  )
}

/** 웹앱과 같은 기본 3D 모형. 구워 둔 그림이 없으면 실루엣을 보여 빈 카드가 되지 않게 한다. */
export function ModelView({ brand, model, style, height = 110 }: {
  brand: string
  model: string
  style: BodyStyle
  height?: number
}) {
  const src = modelShots[modelHash(profileFor(brand, model, style))]
  if (!src) return <Silhouette styleName={style} height={height} />
  return <Image source={src} resizeMode="contain" style={{ width: '100%', height }} accessibilityLabel={`${brand} ${model}`} />
}
