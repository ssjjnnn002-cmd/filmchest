// 자동 복사: web/src/core/types.ts (Blob → 파일 경로만 바꿈). 여기서 고치지 말 것.
import { randomUUID } from 'expo-crypto'
// 앱(iOS)과 같은 데이터 구조. 저장은 IndexedDB(db.ts).

export type FilmFormat = '135' | '135-half' | '120-645' | '120-66' | '120-67' | '120-69'
export type BodyStyle = 'slr' | 'compact' | 'rangefinder' | 'mediumFormat'
export type RollStatus = 'loaded' | 'finished' | 'atLab' | 'imported'
export type FilmProcess = 'C-41' | 'E-6' | 'B&W' | 'ECN-2'

export interface GeoPoint {
  latitude: number
  longitude: number
}

export interface ShootingDay {
  id: string
  startedAt: number // ms
  startFrame?: number
}

export interface LocationSegment {
  id: string
  startFrame: number
  name: string
  point?: GeoPoint
  memo?: string
  /** 현재 위치로 기록할 때 그 자리의 날씨 */
  weather?: WeatherNote
}

/** 날씨 (WMO 날씨 코드 + 기온) */
export interface WeatherNote {
  code: number
  temperature: number
}

export function weatherText(w: WeatherNote) {
  const c = w.code
  const t = c === 0 ? '맑음' : c <= 2 ? '구름 조금' : c === 3 ? '흐림' : c === 45 || c === 48 ? '안개'
    : c >= 51 && c <= 57 ? '이슬비' : c >= 61 && c <= 67 ? '비' : c >= 71 && c <= 77 ? '눈'
    : c >= 80 && c <= 82 ? '소나기' : c === 85 || c === 86 ? '눈발' : c >= 95 ? '뇌우' : '날씨'
  return `${t} ${Math.round(w.temperature)}°`
}

export interface Camera {
  id: string
  brand: string
  model: string
  nickname?: string
  format: FilmFormat
  mount?: string
  fixedLens?: string
  style: BodyStyle
  styleManual: boolean
  color: string
  /** 예전 저장. 새 사진은 기기 파일로 두고, 여기엔 남기지 않는다. */
  photo?: string // 갤럭시: 기기 파일 경로
  /** 이 카메라 사진이 기기 파일로 있는지 */
  hasPhoto?: boolean
  /** 사진 썸네일 크기 (1 = 기본) */
  photoScale?: number
  /** 사진 위치 (칸 크기 대비 비율) */
  photoOffsetX?: number
  photoOffsetY?: number
  tags?: string[]
  /** 예전 방식 (액세서리 탭으로 옮긴 뒤 비운다) */
  accessories?: GearAccessory[]
  /** 이 카메라에 쓰는 액세서리 (액세서리 탭의 GearFilter id) */
  accessoryIds?: string[]
  battery?: string
  batteryAt?: number
  /** 필름을 먼저 끝까지 감아 두고 거꾸로 세는 카메라 (모르면 비움) */
  prewind?: boolean
  purchasedAt?: number
  price?: string
  seller?: string
  createdAt: number
  sortOrder: number
  /** 있으면 휴지통. 24시간이 지나면 장비 목록에서만 지운다. */
  deletedAt?: number
  /** 한 번이라도 렌즈를 불러오거나 빼면 true. 그 전엔 같은 마운트 렌즈를 모두 보여 준다. */
  lensesChosen?: boolean
  /** 이 카메라에 불러온 렌즈 id. 렌즈 목록의 등록은 그대로다. */
  lensIds?: string[]
}

export interface Lens {
  id: string
  brand: string
  model: string
  mount: string
  zoom?: boolean
  focalMin?: number
  focalMax?: number
  /** 최대개방. 예: "1.4", 가변 줌이면 "3.5–5.6" */
  apertureOpen?: string
  /** 최소개방. 예: "16" */
  apertureClose?: string
  hasPhoto?: boolean
  purchasedAt?: number
  price?: string
  seller?: string
  tags?: string[]
  createdAt: number
}

export interface GearAccessory {
  id: string
  name: string
  price?: string
}

/** "123,000" → 123000 */
export const priceValue = (text?: string) => Number((text ?? '').replace(/\D/g, '')) || 0
export const FILTER_KIND = '필터'
export const defaultAccessoryKinds = [FILTER_KIND, '그립', '소프트 셔터 버튼', '스트랩', '스트랩 고리', '렌즈 후드', '렌즈 캡', '케이스',
  '플래시', '노출계', '삼각대', '릴리즈 케이블', '배터리', '어댑터', '기타']
export const kindOf = (a: { kind?: string }) => a.kind?.trim() || FILTER_KIND

export const priceText = (n: number) => `${n.toLocaleString('ko-KR')}원`

/** 액세서리 (필터, 그립, 스트랩 … 유형은 사용자가 더할 수 있다). 이름은 예전 필터 그대로 GearFilter */
export interface GearFilter {
  id: string
  /** 유형. 비어 있으면 필터 */
  kind?: string
  name: string
  diameter?: string
  hasPhoto?: boolean
  purchasedAt?: number
  price?: string
  seller?: string
  tags?: string[]
  createdAt: number
}

export type FilmStorage = 'fridge' | 'freezer' | 'drawer' | 'room'

export interface FilmLot {
  id: string
  filmId: string
  format: FilmFormat
  count: number
  lowAt: number
  storage: FilmStorage
  expiresAt?: number
  purchasedAt?: number
  price?: string
  seller?: string
  createdAt: number
}

/** 롤 중간에 렌즈를 바꿔 낀 기록: startFrame번 컷부터 lensId */
export interface LensChange {
  id: string
  startFrame: number
  lensId: string
}

export interface Roll {
  id: string
  cameraId?: string
  /** 카메라를 지워도 롤에 남는 기록 */
  cameraBrand?: string
  cameraModel?: string
  cameraFormat?: FilmFormat
  cameraFixedLens?: string
  /** 처음(1번 컷부터) 끼운 렌즈 */
  lensId?: string
  /** 중간에 바꿔 낀 렌즈들 */
  lensChanges?: LensChange[]
  /** 노출계로 남긴 컷별 기록 (필름 칸 번호 기준) */
  meterShots?: MeterShot[]
  /** 이 롤을 거꾸로 세며 찍었는지 */
  meterPrewind?: boolean
  /** 스캔에 붙일 때 노출 기록을 몇 칸 밀었는지. +1이면 1번 기록이 2번 사진 */
  meterOffset?: number
  filmId: string // '' = 알 수 없음
  shotISO?: number
  status: RollStatus
  loadedAt: number
  finishedAt?: number
  days: ShootingDay[]
  locations: LocationSegment[]
  lab?: string
  droppedAt?: number
  scanner?: string
  importedAt?: number
  frameCount?: number
  note?: string
  tags?: string[]
  favorite: boolean
  isArchive: boolean
  /** 보관함 썸네일로 쓸 사진 번호 (없으면 첫 장) */
  coverIndex?: number
  scanW?: number
  scanH?: number
  scanFormat?: string
  scanBytes?: number
  /** 있으면 휴지통. 24시간이 지나면 지운다. */
  deletedAt?: number
}

export interface Frame {
  id: string
  rollId: string
  index: number
  thumb?: string // 갤럭시: 기기 파일 경로
  takenAt?: number
  locationName?: string
  favorite: boolean
  w?: number
  h?: number
  bytes?: number
  name?: string
  /** 사용자가 돌린 방향 (시계 방향 90°×n, 0…3). 밀착 인화지에는 쓰지 않는다 */
  rotation?: number
}

/** 저장해 둔 원본(메타데이터 기록본) */
export interface Original {
  frameId: string
  rollId: string
  blob: string // 갤럭시: 기기 파일 경로
}

export const formatInfo: Record<FilmFormat, { name: string; aspect: number; perStrip: number; count: number; is120: boolean }> = {
  '135': { name: '35mm', aspect: 36 / 24, perStrip: 6, count: 36, is120: false },
  '135-half': { name: '35mm 하프', aspect: 18 / 24, perStrip: 12, count: 72, is120: false },
  '120-645': { name: '120 6×4.5', aspect: 41.5 / 56, perStrip: 4, count: 15, is120: true },
  '120-66': { name: '120 6×6', aspect: 1, perStrip: 3, count: 12, is120: true },
  '120-67': { name: '120 6×7', aspect: 70 / 56, perStrip: 3, count: 10, is120: true },
  '120-69': { name: '120 6×9', aspect: 84 / 56, perStrip: 2, count: 8, is120: true },
}

export const statusName: Record<RollStatus, string> = {
  loaded: '장착 중',
  finished: '촬영 완료',
  atLab: '스캔 대기',
  imported: '완료',
}

export const styleName: Record<BodyStyle, string> = {
  slr: 'SLR',
  compact: 'P&S',
  rangefinder: 'RF',
  mediumFormat: '중형',
}

export const uid = () => randomUUID()

/** n번 컷을 찍을 때 끼워 둔 렌즈 */
export function lensIdAt(roll: Roll, frame: number): string | undefined {
  const change = [...(roll.lensChanges ?? [])].sort((a, b) => b.startFrame - a.startFrame).find((c) => c.startFrame <= frame)
  return change?.lensId ?? roll.lensId
}

/** 노출계로 남긴 한 컷. pos는 필름 칸 번호, order는 찍은 순서 */
export interface MeterShot {
  pos: number
  order: number
  mode: 'P' | 'A' | 'S' | 'M'
  aperture: number | null
  shutter: number | null
  /** 노출 보정 (스톱) */
  comp: number
  flash: boolean
  /** 측정값 (ISO 100 기준 EV) */
  ev: number
  focal: number | null
  at: string | null
  edited: boolean
  /** 끼운 필터 (예: ND8, 노랑) */
  filters?: string[]
  /** 메모 템플릿 태그 */
  tags?: string[]
  memo?: string
}

/** 규격별 한 롤 컷 수 */
export const framesPerRoll: Record<FilmFormat, number> = {
  '135': 36, '135-half': 72, '120-645': 15, '120-66': 12, '120-67': 10, '120-69': 8,
}

/** 롤 보관함 프로젝트(폴더). 한 롤을 여러 프로젝트에 넣을 수 있다 */
export interface Project {
  id: string
  name: string
  memo?: string
  /** projectPalette 순서 (0–15) */
  color: number
  archived: boolean
  createdAt: number
  rollIds: string[]
}

/** 프로젝트 폴더 색 16가지 (아이폰·갤럭시와 같은 순서) */
export const projectPalette = ['#E0552E', '#F08C2E', '#F2C230', '#B8C93A', '#5DB55B', '#2FA58F', '#2EA3C9', '#3F7FE0',
  '#5B5FD6', '#8C55D6', '#C24FB5', '#E05A8A', '#A0705A', '#7A7F87', '#3A3A3E', '#C9B79C']
