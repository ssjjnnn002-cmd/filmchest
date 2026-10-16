// 자동 복사: web/src/ui/common.tsx 표시용 도우미 (node scripts/sync-galaxy-core.mjs). 여기서 고치지 말 것.
import type { Camera, FilmFormat, Roll } from './types'
import { filmById, filmDisplayName } from './films'

// --- 표시용 도우미

const pad = (n: number) => String(n).padStart(2, '0')
export const fmtDay = (ms: number) => { const d = new Date(ms); return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}` }
export const fmtMonthDay = (ms: number) => { const d = new Date(ms); return `${pad(d.getMonth() + 1)}.${pad(d.getDate())}` }
export const fmtDayTime = (ms: number) => { const d = new Date(ms); return `${fmtDay(ms)} ${pad(d.getHours())}:${pad(d.getMinutes())}` }
export const toInputDate = (ms: number) => { const d = new Date(ms); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }
export const toInputDateTime = (ms: number) => `${toInputDate(ms)}T${pad(new Date(ms).getHours())}:${pad(new Date(ms).getMinutes())}`

/** 카메라 이름. 장비를 지운 뒤에는 롤에 적어 둔 이름을 쓴다. 아직 읽는 중이면 빈 칸. */
export const cameraName = (camera: Camera | undefined, roll: Roll) => {
  if (camera) return `${camera.brand} ${camera.model}`
  const recorded = [roll.cameraBrand, roll.cameraModel].filter(Boolean).join(' ')
  if (recorded) return recorded
  return roll.cameraId ? '\u00a0' : '카메라 알 수 없음'
}

export const rollCameraFormat = (camera: Camera | undefined, roll: Roll): FilmFormat =>
  camera?.format ?? roll.cameraFormat ?? '135'

export const rollFilm = (r: Roll) => filmById(r.filmId)
export const rollFilmName = (r: Roll) => filmById(r.filmId) ? filmDisplayName(filmById(r.filmId)) : '필름 알 수 없음'
export const dateUnknown = (r: Roll) => r.isArchive && r.days.length === 0
export const sortedDays = (r: Roll) => [...r.days].sort((a, b) => a.startedAt - b.startedAt)
export const sortedLocations = (r: Roll) => [...r.locations].sort((a, b) => a.startFrame - b.startFrame)
export const rollStart = (r: Roll) => sortedDays(r)[0]?.startedAt ?? r.loadedAt

export function dateRangeText(r: Roll) {
  if (dateUnknown(r)) return '날짜 알 수 없음'
  const days = sortedDays(r).map((d) => d.startedAt)
  if (!days.length) return fmtDay(r.loadedAt)
  const first = days[0], last = days.at(-1)!
  if (new Date(first).toDateString() === new Date(last).toDateString()) return fmtDay(first)
  const sameYear = new Date(first).getFullYear() === new Date(last).getFullYear()
  return `${fmtDay(first)} – ${sameYear ? fmtMonthDay(last) : fmtDay(last)}`
}

/** 내려받을 때 이름: "2026.09.28 HP5 Plus · X-700" */
export function rollTitle(r: Roll, camera?: Camera) {
  const date = dateUnknown(r) ? '날짜 미상' : fmtDay(rollStart(r))
  return `${date} ${filmById(r.filmId)?.name ?? '필름 미상'} · ${camera?.model || r.cameraModel || '카메라 미상'}`
}

export const bytesText = (b?: number) => {
  if (!b) return undefined
  if (b > 1e9) return `${(b / 1e9).toFixed(1)}GB`
  if (b > 1e6) return `${(b / 1e6).toFixed(1)}MB`
  return `${Math.round(b / 1e3)}KB`
}
export const resolutionText = (w?: number, h?: number) =>
  w && h ? `${w} × ${h} · ${((w * h) / 1e6).toFixed(1)}MP` : undefined
