// 자동 생성: web/src/ui/common.tsx 아이콘 (node scripts/sync-galaxy-core.mjs). 여기서 고치지 말 것.
import Svg, { Path } from 'react-native-svg'

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

export function Icon({ name, size = 20, color }: { name: string; size?: number; color: string }) {
  const icon = icons[name]
  if (!icon) return <Svg width={size} height={size} />
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={icon.d} fill={icon.fill ? color : 'none'} stroke={icon.fill ? 'none' : color}
        strokeWidth={icon.width ?? 1.9} strokeLinecap="round" strokeLinejoin="round" fillRule={icon.fill ? 'evenodd' : 'nonzero'} />
    </Svg>
  )
}
