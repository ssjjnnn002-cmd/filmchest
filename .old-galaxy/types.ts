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
  photo?: Blob
  /** 사진 썸네일 크기 (1 = 기본) */
  photoScale?: number
  battery?: string
  batteryAt?: number
  createdAt: number
  sortOrder: number
}

export interface Lens {
  id: string
  brand: string
  model: string
  mount: string
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
  /** 처음(1번 컷부터) 끼운 렌즈 */
  lensId?: string
  /** 중간에 바꿔 낀 렌즈들 */
  lensChanges?: LensChange[]
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
  thumb?: Blob
  takenAt?: number
  locationName?: string
  favorite: boolean
  w?: number
  h?: number
  bytes?: number
  name?: string
}

/** 저장해 둔 원본(메타데이터 기록본) */
export interface Original {
  frameId: string
  rollId: string
  blob: Blob
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

export const uid = () => crypto.randomUUID()

/** n번 컷을 찍을 때 끼워 둔 렌즈 */
export function lensIdAt(roll: Roll, frame: number): string | undefined {
  const change = [...(roll.lensChanges ?? [])].sort((a, b) => b.startFrame - a.startFrame).find((c) => c.startFrame <= frame)
  return change?.lensId ?? roll.lensId
}
