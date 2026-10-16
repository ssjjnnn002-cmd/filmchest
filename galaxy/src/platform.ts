// 웹 platform.ts 자리: 파일 내보내기(공유 창), 저장 공간
import * as Sharing from 'expo-sharing'
import { Directory, File, Paths } from 'expo-file-system'
import { writeBytes } from './files'

/** 웹 saveFileNow: 갤럭시는 공유 창으로 (파일 앱·드라이브 등에 저장) */
export async function saveFileNow(filename: string, bytes: Uint8Array, mimeType?: string) {
  const uri = writeBytes('exports', filename, bytes)
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType, dialogTitle: filename })
}

function dirSize(dir: Directory): number {
  let total = 0
  try {
    for (const item of dir.list()) {
      if (item instanceof Directory) total += dirSize(item)
      else total += (item as File).size ?? 0
    }
  } catch { /* 읽을 수 없음 */ }
  return total
}

/** 앱 안에 저장된 양 */
export async function storageEstimate() {
  try { return { used: dirSize(Paths.document), quota: 0 } } catch { return undefined }
}

// --- 위치 (웹 platform.ts와 같은 순서·같은 서버 함수)
import * as Location from 'expo-location'
import type { GeoPoint, WeatherNote } from './core/types'

const SITE = 'https://filmchest.vercel.app'

export interface Place {
  name: string
  point: GeoPoint
  address?: string
}

export const locationAvailable = () => true

export async function currentPoint(timeoutMs = 8000): Promise<GeoPoint | undefined> {
  try {
    const perm = await Location.requestForegroundPermissionsAsync()
    if (perm.status !== 'granted') return undefined
    const last = await Location.getLastKnownPositionAsync({ maxAge: 60_000 })
    if (last) return { latitude: last.coords.latitude, longitude: last.coords.longitude }
    const p = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<undefined>((r) => setTimeout(() => r(undefined), timeoutMs)),
    ])
    return p ? { latitude: p.coords.latitude, longitude: p.coords.longitude } : undefined
  } catch {
    return undefined
  }
}

const NOMINATIM = 'https://nominatim.openstreetmap.org'
const nominatimHeaders = { 'User-Agent': 'Filmchest/1.0 (filmchest.vercel.app)' }

export const placeSearchAvailable = () => true

/** 네이버·카카오·구글 검색(서버 함수 /api/places). 키가 없거나 함수가 없으면 OpenStreetMap */
let serverSearch: boolean | undefined
export async function searchPlaces(q: string): Promise<Place[]> {
  if (!q.trim()) return []
  if (serverSearch !== false) {
    try {
      const r = await fetch(`${SITE}/api/places?q=${encodeURIComponent(q)}`)
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
    const r = await fetch(`${NOMINATIM}/search?format=jsonv2&limit=6&accept-language=ko&countrycodes=kr&q=${encodeURIComponent(q)}`, { headers: nominatimHeaders })
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
  try {
    const r = await fetch(`${SITE}/api/places?lat=${point.latitude}&lng=${point.longitude}`)
    if (r.ok) return ((await r.json()) as { name?: string }).name || undefined
  } catch { /* 서버 함수 없음 */ }
  try {
    const r = await fetch(`${NOMINATIM}/reverse?format=jsonv2&zoom=16&accept-language=ko&lat=${point.latitude}&lon=${point.longitude}`, { headers: nominatimHeaders })
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
