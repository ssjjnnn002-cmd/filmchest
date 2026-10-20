// 자동 복사: web/src/core/frameCaption.ts (node scripts/sync-galaxy-core.mjs). 여기서 고치지 말 것.
// 프레임 아래 글씨. 세 앱이 같은 규칙을 쓴다. 화면 그리기는 framePrint.ts

export function shutterText(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return ''
  if (seconds >= 1) {
    const whole = Math.round(seconds)
    return Math.abs(seconds - whole) < 0.05 ? `${whole}"` : `${Math.round(seconds * 10) / 10}"`
  }
  return `1/${Math.max(1, Math.round(1 / seconds))}`
}

export function apertureText(n: number) {
  if (!Number.isFinite(n) || n <= 0) return ''
  const rounded = Math.round(n * 10) / 10
  return `f/${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded}`
}

/** 노출계 기록이 있는 컷만. 없으면 undefined */
export function exposureLine(shot: { aperture: number | null; shutter: number | null } | undefined, iso?: number) {
  if (!shot || (shot.aperture == null && shot.shutter == null)) return undefined
  const parts = [shot.aperture != null ? apertureText(shot.aperture) : '', shot.shutter != null ? shutterText(shot.shutter) : ''].filter(Boolean)
  if (iso) parts.push(`ISO ${iso}`)
  return parts.join('   ')
}
