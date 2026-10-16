// 자동 복사: web/src/core/meter.ts (node scripts/sync-galaxy-core.mjs). 여기서 고치지 말 것.
import type { FilmFormat, MeterShot } from './types'
import { framesPerRoll } from './types'

const modeName: Record<MeterShot['mode'], string> = {
  P: '자동', A: '조리개 우선', S: '셔터 우선', M: '수동',
}

/** 칸 번호 표기. 1 이상은 숫자, 그 앞은 0, 00, E1… 역순으로 아직 번호가 없는 칸은 빈 글자. */
export function meterFrameLabel(pos: number, prewind = false): string {
  if (prewind && pos === 0) return ''
  if (pos >= 1) return String(pos)
  if (pos === 0) return '0'
  if (pos === -1) return '00'
  return `E${-pos - 1}`
}

export function meterFrameTitle(pos: number, prewind = false): string {
  const label = meterFrameLabel(pos, prewind)
  return label ? `${label}번` : '추가'
}

export function formatAperture(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return ''
  const rounded = Math.round(n * 10) / 10
  return Number.isInteger(rounded) ? `f/${rounded}` : `f/${rounded}`
}

export function formatShutter(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return ''
  if (seconds >= 1) {
    const whole = Math.round(seconds)
    if (Math.abs(seconds - whole) < 0.05) return `${whole}"`
    return `${Math.round(seconds * 10) / 10}"`
  }
  return `1/${Math.max(1, Math.round(1 / seconds))}`
}

/** 1/3 스톱 단위. 예: 0.333 → +⅓, 1 → +1, -0.666 → −⅔ */
export function formatComp(stops: number): string {
  const k = Math.round(stops * 3)
  if (!k) return '0'
  const w = Math.floor(Math.abs(k) / 3)
  const r = Math.abs(k) % 3
  return (k > 0 ? '+' : '−') + (w || '') + (r === 1 ? '⅓' : r === 2 ? '⅔' : '')
}

/** 한 컷의 노출. 조리개·셔터가 없으면 자동. */
export function exposureText(shot: Pick<MeterShot, 'aperture' | 'shutter' | 'comp' | 'flash'>): string {
  const parts: string[] = []
  if (shot.aperture) parts.push(formatAperture(shot.aperture))
  if (shot.shutter) parts.push(formatShutter(shot.shutter))
  if (!parts.length) parts.push('자동')
  if (shot.comp) parts.push(formatComp(shot.comp))
  if (shot.flash) parts.push('플래시')
  return parts.join(' · ')
}

export function meterShotDetail(shot: MeterShot): string {
  const parts = [modeName[shot.mode] ?? shot.mode, `${shot.order}번째`]
  if (shot.focal) parts.push(`${shot.focal}mm`)
  if (shot.filters?.length) parts.push(shot.filters.join(', '))
  if (shot.tags?.length) parts.push(shot.tags.join(', '))
  if (shot.memo) parts.push(shot.memo)
  return parts.filter(Boolean).join(' · ')
}

/** 찍은 순서. 같은 순서면 칸 번호가 앞인 것부터. */
export function meterShotsByOrder(shots: MeterShot[] | undefined): MeterShot[] {
  return [...(shots ?? [])].sort((a, b) => a.order - b.order || a.pos - b.pos)
}

/** 순번 옆 부가 정보. 몇 번째인지는 제목으로 쓰므로 빼 둔다. */
export function meterShotMeta(shot: MeterShot, prewind = false): string {
  const parts = [`${meterFrameTitle(shot.pos, prewind)} 칸`, modeName[shot.mode] ?? shot.mode]
  if (shot.focal) parts.push(`${shot.focal}mm`)
  if (shot.filters?.length) parts.push(shot.filters.join(', '))
  if (shot.tags?.length) parts.push(shot.tags.join(', '))
  if (shot.memo) parts.push(shot.memo)
  return parts.filter(Boolean).join(' · ')
}

/** 맞출 때 앞뒤로 옮길 수 있는 칸 수 */
export const meterAlignLimit = 6

/**
 * 스캔 frame번에 붙는 노출 기록.
 * offset이 +1이면 노출계 1번이 스캔 2번에 간다. 현상소 번호가 어긋날 때 쓴다.
 */
export function meterShotAt(shots: MeterShot[] | undefined, frame: number, offset = 0): MeterShot | undefined {
  return shots?.find((s) => s.pos + offset === frame)
}

/** 스캔 n장 안에 들어가는 기록. 붙는 사진 번호 순. */
export function meterShotsInScan(shots: MeterShot[] | undefined, frameCount: number, offset = 0): MeterShot[] {
  return (shots ?? [])
    .filter((s) => { const frame = s.pos + offset; return frame >= 1 && frame <= frameCount })
    .sort((a, b) => a.pos - b.pos)
}

/** 1번 기록이 어느 사진에 붙는지 */
export function meterAlignText(offset: number): string {
  if (!offset) return '1번 기록이 1번 사진에 붙어요.'
  if (offset > 0) return `1번 기록이 ${1 + offset}번 사진에 붙어요.`
  return `${1 - offset}번 기록이 1번 사진에 붙어요.`
}

export function meterProgress(shotCount: number, format: FilmFormat): { shot: number; capacity: number; percent: number } {
  const capacity = framesPerRoll[format] ?? 36
  const percent = capacity > 0 ? Math.round((shotCount / capacity) * 100) : 0
  return { shot: shotCount, capacity, percent }
}
