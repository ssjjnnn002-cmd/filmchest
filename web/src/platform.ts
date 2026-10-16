import type { GeoPoint, WeatherNote } from './core/types'

// 실행 환경 차이를 여기서 흡수한다.
// - claude.ai에 올린 페이지: 다운로드는 downloads 기능(확인 창), 위치·지도 검색은 막혀 있다.
// - 일반 호스팅: 브라우저 다운로드/공유, 위치, 지도 검색(OpenStreetMap) 사용.

interface DownloadsNS {
  save(r: { filename: string; data: Blob | string | ArrayBuffer }): Promise<{ status: string }>
}

type ClaudeWindow = Window & { claude?: { use?: (name: string) => Promise<unknown> } }

let downloadsPromise: Promise<DownloadsNS | null> | undefined
function hostDownloads() {
  const w = window as ClaudeWindow
  if (!w.claude?.use) return Promise.resolve(null)
  downloadsPromise ??= (w.claude.use('downloads') as Promise<DownloadsNS | null>).catch(() => null)
  return downloadsPromise
}

/** claude.ai 페이지 안에서 열렸는지 */
export const inClaudeHost = () => !!(window as ClaudeWindow).claude?.use

export type SaveOutcome = 'saved' | 'declined' | 'failed'

/** 파일 내보내기. 결과를 알려 준다 (취소/실패 포함). */
export async function saveFile(filename: string, blob: Blob): Promise<SaveOutcome> {
  const dl = await hostDownloads()
  if (dl) {
    try {
      await dl.save({ filename, data: blob })
      return 'saved'
    } catch (e) {
      return (e as { code?: string }).code === 'declined' ? 'declined' : 'failed'
    }
  }
  if (inClaudeHost()) return 'failed'
  saveFileNow(filename, blob)
  return 'saved'
}

/** 클릭 안에서 바로 실행해야 아이폰·갤럭시가 저장을 막지 않는다. */
export function saveFileNow(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  setTimeout(() => {
    a.remove()
    URL.revokeObjectURL(url)
  }, 1500)
}

const galleryType = (file: File) => file.size > 0 && file.type.startsWith('image/') && !file.type.includes('tiff')

function canShareFiles(files: File[]) {
  try { return !!navigator.canShare?.({ files }) } catch { return false }
}

/** 한 번에 공유 창으로 보낼 수 있는 묶음. 크면 여러 묶음으로 나눈다. */
export function shareBatches(files: File[]): File[][] {
  const images = files.filter(galleryType)
  if (!images.length || !canShareFiles(images.slice(0, 1))) return []
  if (canShareFiles(images)) return [images]
  const batches: File[][] = []
  let batch: File[] = []
  for (const file of images) {
    const next = batch.concat(file)
    if (canShareFiles(next)) {
      batch = next
      continue
    }
    if (batch.length) batches.push(batch)
    batch = canShareFiles([file]) ? [file] : []
  }
  if (batch.length) batches.push(batch)
  return batches
}

export type GalleryOpen =
  | { kind: 'share'; done: Promise<'saved' | 'declined' | 'failed'> }
  | { kind: 'file' }
  | { kind: 'none' }

/** 클릭 처리 안에서 동기적으로 호출해야 갤러리 공유 창이 열린다. */
export function saveToGallery(files: File[], title: string): GalleryOpen {
  const images = files.filter(galleryType)
  if (images.length && canShareFiles(images)) {
    const done = navigator.share({ files: images, title }).then(
      () => 'saved' as const,
      (e: Error) => (e.name === 'AbortError' ? 'declined' as const : 'failed' as const),
    )
    return { kind: 'share', done }
  }
  if (images.length === 1) {
    saveFileNow(images[0].name, images[0])
    return { kind: 'file' }
  }
  return { kind: 'none' }
}

/** 화면만 다시 받는다. 카메라·롤·스캔이 들어 있는 브라우저 저장소는 지우지 않는다. */
export async function refreshApp() {
  if ('serviceWorker' in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations()
    await Promise.all(regs.map((r) => r.unregister()))
  }
  if ('caches' in window) {
    const keys = await caches.keys()
    await Promise.all(keys.map((k) => caches.delete(k)))
  }
  const url = new URL(location.href)
  url.searchParams.set('fresh', Date.now().toString())
  location.replace(url.href)
}

/** 휴대폰 공유 시트로 사진 여러 장 보내기 (사진 앱/구글 포토 저장). 안 되면 false */
export async function shareFiles(files: File[], title: string): Promise<boolean> {
  if (inClaudeHost()) return false
  try {
    if (navigator.canShare?.({ files })) {
      await navigator.share({ files, title })
      return true
    }
  } catch {
    /* 취소 또는 미지원 */
  }
  return false
}

// --- 위치

export interface Place {
  name: string
  point: GeoPoint
  address?: string
}

export const locationAvailable = () => !inClaudeHost() && 'geolocation' in navigator

export function currentPoint(timeoutMs = 8000): Promise<GeoPoint | undefined> {
  if (!locationAvailable()) return Promise.resolve(undefined)
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude }),
      () => resolve(undefined),
      { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 60_000 },
    )
  })
}

const NOMINATIM = 'https://nominatim.openstreetmap.org'

export const placeSearchAvailable = () => !inClaudeHost()

/** 네이버·카카오·구글 검색(서버 함수 /api/places). 키가 없거나 함수가 없으면 OpenStreetMap */
let serverSearch: boolean | undefined
export async function searchPlaces(q: string): Promise<Place[]> {
  if (!placeSearchAvailable() || !q.trim()) return []
  if (serverSearch !== false) {
    try {
      const r = await fetch(`/api/places?q=${encodeURIComponent(q)}`)
      if (r.ok) {
        serverSearch = true
        const { places } = (await r.json()) as { places: { name: string; address?: string; latitude: number; longitude: number }[] }
        return places.map((p) => ({ name: p.name, address: p.address, point: { latitude: p.latitude, longitude: p.longitude } }))
      }
      if (r.status === 501 || r.status === 404) serverSearch = false
    } catch {
      serverSearch = false
    }
  }
  try {
    const r = await fetch(`${NOMINATIM}/search?format=jsonv2&limit=6&accept-language=ko&countrycodes=kr&q=${encodeURIComponent(q)}`)
    const list = (await r.json()) as { name?: string; display_name: string; lat: string; lon: string }[]
    return list.map((x) => ({
      name: x.name || x.display_name.split(',')[0],
      address: x.display_name.split(',').slice(1, 4).join(',').trim(),
      point: { latitude: +x.lat, longitude: +x.lon },
    }))
  } catch {
    return []
  }
}

export async function placeName(point: GeoPoint): Promise<string | undefined> {
  if (!placeSearchAvailable()) return undefined
  try {
    const r = await fetch(`/api/places?lat=${point.latitude}&lng=${point.longitude}`)
    if (r.ok) return ((await r.json()) as { name?: string }).name || undefined
  } catch { /* 서버 함수 없음 */ }
  try {
    const r = await fetch(`${NOMINATIM}/reverse?format=jsonv2&zoom=16&accept-language=ko&lat=${point.latitude}&lon=${point.longitude}`)
    const x = (await r.json()) as { address?: Record<string, string>; name?: string }
    const a = x.address ?? {}
    return a.quarter || a.suburb || a.neighbourhood || a.city_district || a.town || a.city || x.name
  } catch {
    return undefined
  }
}

export async function currentPlace(): Promise<Place | undefined> {
  const point = await currentPoint()
  if (!point) return undefined
  const [name] = await Promise.all([placeName(point), currentWeather(point)])
  return { name: name ?? '', point }
}

// --- 날씨 (Open-Meteo, 키 없이 무료)

/** 현재 위치로 잰 날씨. 같은 좌표를 저장할 때 꺼내 쓴다 (30분) */
const recentWeather = new Map<string, { at: number; weather: WeatherNote }>()
const pointKey = (p: GeoPoint) => `${p.latitude.toFixed(5)},${p.longitude.toFixed(5)}`

export async function currentWeather(point: GeoPoint): Promise<WeatherNote | undefined> {
  try {
    const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${point.latitude}&longitude=${point.longitude}&current=temperature_2m,weather_code`)
    if (!r.ok) return undefined
    const { current } = (await r.json()) as { current: { temperature_2m: number; weather_code: number } }
    const weather = { code: current.weather_code, temperature: current.temperature_2m }
    recentWeather.set(pointKey(point), { at: Date.now(), weather })
    return weather
  } catch {
    return undefined
  }
}

/** 이 좌표가 방금 현재 위치로 잰 곳이면 그때 날씨 */
export function weatherAt(point?: GeoPoint): WeatherNote | undefined {
  if (!point) return undefined
  const hit = recentWeather.get(pointKey(point))
  return hit && Date.now() - hit.at < 30 * 60_000 ? hit.weather : undefined
}

/** "37.5556, 126.9019" 또는 구글 지도 링크(@37.55,126.90)에서 좌표 꺼내기 */
export function parseCoordinates(text: string): GeoPoint | undefined {
  const m = text.match(/(-?\d{1,2}\.\d+)\s*[, ]\s*(-?\d{1,3}\.\d+)/)
  if (!m) return undefined
  const latitude = +m[1], longitude = +m[2]
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return undefined
  return { latitude, longitude }
}

// --- 보관용 설정 (기기마다)

export function getPref<T extends string>(key: string, fallback: T): T {
  try {
    return (localStorage.getItem(`filmchest.${key}`) as T) || fallback
  } catch {
    return fallback
  }
}

export function setPref(key: string, value: string) {
  try {
    localStorage.setItem(`filmchest.${key}`, value)
  } catch {
    /* 저장 불가 환경 */
  }
}

/** 앱 안 테마 설정 (기기 설정 / 라이트 / 다크) */
export function applyTheme(mode: string) {
  const root = document.documentElement
  if (mode === 'light' || mode === 'dark') root.setAttribute('data-theme', mode)
  else root.removeAttribute('data-theme')
}
