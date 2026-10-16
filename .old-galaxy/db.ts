import { openDatabaseSync } from 'expo-sqlite'
import { randomUUID } from 'expo-crypto'
import { useSyncExternalStore } from 'react'
import type { BodyStyle, FilmFormat, RollStatus } from './types'

export type Camera = {
  id: string
  brand: string
  model: string
  nickname: string | null
  format: FilmFormat
  mount: string | null
  fixedLens: string | null
  style: BodyStyle
  battery: string | null
  createdAt: number
  sortOrder: number
  deletedAt: number | null
  /** 필름을 먼저 끝까지 감아 두고 거꾸로 세는 카메라 (모르면 null) */
  prewind?: boolean | null
}

/** 노출계로 남긴 한 컷. pos는 필름 칸 번호, order는 찍은 순서 */
export type MeterShot = {
  pos: number
  order: number
  mode: 'P' | 'A' | 'S' | 'M'
  aperture: number | null
  shutter: number | null
  comp: number
  flash: boolean
  ev: number
  focal: number | null
  at: string | null
  edited: boolean
  filters?: string[]
  tags?: string[]
  memo?: string
}

export type Roll = {
  id: string
  cameraId: string | null
  filmId: string
  shotISO: number | null
  status: RollStatus
  loadedAt: number
  finishedAt: number | null
  droppedAt: number | null
  lab: string | null
  note: string | null
  favorite: boolean
  frameCount: number | null
  lensName: string | null
  cameraBrand: string | null
  cameraModel: string | null
  cameraFormat: string | null
  cameraFixedLens: string | null
  deletedAt: number | null
  /** 노출계 기록 (JSON) */
  meterShots?: string | null
  meterPrewind?: number | null
}

const db = openDatabaseSync('filmchest.db')

db.execSync(`
  CREATE TABLE IF NOT EXISTS cameras (
    id TEXT PRIMARY KEY NOT NULL,
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    nickname TEXT,
    format TEXT NOT NULL,
    mount TEXT,
    fixedLens TEXT,
    style TEXT NOT NULL,
    battery TEXT,
    createdAt INTEGER NOT NULL,
    sortOrder INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS rolls (
    id TEXT PRIMARY KEY NOT NULL,
    cameraId TEXT,
    filmId TEXT NOT NULL,
    shotISO INTEGER,
    status TEXT NOT NULL,
    loadedAt INTEGER NOT NULL,
    finishedAt INTEGER,
    droppedAt INTEGER,
    lab TEXT,
    note TEXT,
    favorite INTEGER NOT NULL DEFAULT 0,
    frameCount INTEGER,
    lensName TEXT,
    deletedAt INTEGER
  );
  CREATE TABLE IF NOT EXISTS prefs (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );
`)

function addColumn(sql: string) {
  try { db.execSync(sql) } catch { /* 이미 있는 열 */ }
}
addColumn('ALTER TABLE cameras ADD COLUMN deletedAt INTEGER')
addColumn('ALTER TABLE rolls ADD COLUMN cameraBrand TEXT')
addColumn('ALTER TABLE rolls ADD COLUMN cameraModel TEXT')
addColumn('ALTER TABLE rolls ADD COLUMN cameraFormat TEXT')
addColumn('ALTER TABLE rolls ADD COLUMN cameraFixedLens TEXT')
addColumn('ALTER TABLE cameras ADD COLUMN prewind INTEGER')
addColumn('ALTER TABLE rolls ADD COLUMN meterShots TEXT')
addColumn('ALTER TABLE rolls ADD COLUMN meterPrewind INTEGER')
db.execSync(`
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    memo TEXT,
    color INTEGER NOT NULL DEFAULT 0,
    archived INTEGER NOT NULL DEFAULT 0,
    createdAt INTEGER NOT NULL,
    rollIds TEXT NOT NULL DEFAULT '[]'
  );
`)

const keptFor = Date.now() - 24 * 60 * 60 * 1000
db.runSync('DELETE FROM rolls WHERE deletedAt IS NOT NULL AND deletedAt < ?', keptFor)
for (const camera of db.getAllSync<Camera>('SELECT * FROM cameras')) {
  db.runSync(
    'UPDATE rolls SET cameraBrand = ?, cameraModel = ?, cameraFormat = ?, cameraFixedLens = ? WHERE cameraId = ?',
    camera.brand, camera.model, camera.format, camera.fixedLens, camera.id,
  )
}
db.runSync('DELETE FROM cameras WHERE deletedAt IS NOT NULL AND deletedAt < ?', keptFor)

let revision = 0
const listeners = new Set<() => void>()

function touch() {
  revision += 1
  listeners.forEach((fn) => fn())
}

export function useDb() {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    () => revision,
    () => revision,
  )
}

export const newId = () => randomUUID()

export function cameraName(camera?: Camera | null, roll?: Pick<Roll, 'cameraBrand' | 'cameraModel'> | null) {
  if (camera) return camera.nickname?.trim() || `${camera.brand} ${camera.model}`
  const recorded = [roll?.cameraBrand, roll?.cameraModel].filter(Boolean).join(' ')
  return recorded || '카메라 없음'
}

type CameraSql = Omit<Camera, 'prewind'> & { prewind?: number | null }
type RollSql = Omit<Roll, 'favorite'> & { favorite: number }

const asCamera = (row: CameraSql): Camera => ({ ...row, prewind: row.prewind == null ? null : row.prewind === 1 })

function asRoll(row: RollSql): Roll {
  return { ...row, favorite: row.favorite === 1 }
}

export function listCameras() {
  return db.getAllSync<CameraSql>('SELECT * FROM cameras WHERE deletedAt IS NULL ORDER BY sortOrder, createdAt').map(asCamera)
}

export function trashedCameras() {
  return db.getAllSync<CameraSql>('SELECT * FROM cameras WHERE deletedAt IS NOT NULL ORDER BY deletedAt DESC').map(asCamera)
}

export function getCamera(id: string) {
  const row = db.getFirstSync<CameraSql>('SELECT * FROM cameras WHERE id = ?', id)
  return row ? asCamera(row) : undefined
}

export function saveCamera(input: Omit<Camera, 'id' | 'createdAt' | 'sortOrder' | 'deletedAt'> & { id?: string }) {
  const existing = input.id ? getCamera(input.id) : undefined
  const id = existing?.id ?? newId()
  const createdAt = existing?.createdAt ?? Date.now()
  const sortOrder = existing?.sortOrder ?? (db.getFirstSync<{ n: number }>('SELECT COALESCE(MAX(sortOrder), 0) + 1 AS n FROM cameras')?.n ?? 1)
  db.runSync(
    `INSERT INTO cameras (id, brand, model, nickname, format, mount, fixedLens, style, battery, createdAt, sortOrder)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       brand = excluded.brand, model = excluded.model, nickname = excluded.nickname, format = excluded.format,
       mount = excluded.mount, fixedLens = excluded.fixedLens, style = excluded.style, battery = excluded.battery`,
    id, input.brand.trim(), input.model.trim(), blank(input.nickname), input.format, blank(input.mount),
    blank(input.fixedLens), input.style, blank(input.battery), createdAt, sortOrder,
  )
  db.runSync(
    'UPDATE rolls SET cameraBrand = ?, cameraModel = ?, cameraFormat = ?, cameraFixedLens = ? WHERE cameraId = ?',
    input.brand.trim(), input.model.trim(), input.format, blank(input.fixedLens), id,
  )
  touch()
  return id
}

function rememberCamera(id: string) {
  const camera = getCamera(id)
  if (!camera) return
  db.runSync(
    'UPDATE rolls SET cameraBrand = ?, cameraModel = ?, cameraFormat = ?, cameraFixedLens = ? WHERE cameraId = ?',
    camera.brand, camera.model, camera.format, camera.fixedLens, camera.id,
  )
}

/** 장비 목록에서 빼 둔다. 롤의 카메라 연결은 끊지 않는다. */
export function deleteCamera(id: string) {
  const camera = getCamera(id)
  if (!camera || camera.deletedAt) return false
  rememberCamera(id)
  db.runSync('UPDATE cameras SET deletedAt = ? WHERE id = ?', Date.now(), id)
  touch()
  return true
}

export function restoreCamera(id: string) {
  db.runSync('UPDATE cameras SET deletedAt = NULL WHERE id = ?', id)
  touch()
}

/** 휴지통에서 카메라를 없앤다. 롤에 적어 둔 이름과 규격은 남긴다. */
export function purgeCamera(id: string) {
  rememberCamera(id)
  db.runSync('DELETE FROM cameras WHERE id = ?', id)
  touch()
}

export function listRolls(status?: Roll['status'] | Roll['status'][]) {
  const rows = db.getAllSync<RollSql>('SELECT * FROM rolls WHERE deletedAt IS NULL ORDER BY loadedAt DESC').map(asRoll)
  if (!status) return rows
  const set = new Set(Array.isArray(status) ? status : [status])
  return rows.filter((r) => set.has(r.status))
}

export function trashedRolls() {
  return db.getAllSync<RollSql>('SELECT * FROM rolls WHERE deletedAt IS NOT NULL ORDER BY deletedAt DESC').map(asRoll)
}

export function getRoll(id: string) {
  const row = db.getFirstSync<RollSql>('SELECT * FROM rolls WHERE id = ?', id)
  return row ? asRoll(row) : undefined
}

export function loadedRoll(cameraId: string) {
  const row = db.getFirstSync<RollSql>(
    `SELECT * FROM rolls WHERE cameraId = ? AND status = 'loaded' AND deletedAt IS NULL ORDER BY loadedAt DESC LIMIT 1`,
    cameraId,
  )
  return row ? asRoll(row) : undefined
}

export function loadFilm(input: { cameraId: string; filmId: string; shotISO?: number; lensName?: string }) {
  if (loadedRoll(input.cameraId)) return undefined
  const id = newId()
  const now = Date.now()
  db.runSync(
    `INSERT INTO rolls (id, cameraId, filmId, shotISO, status, loadedAt, favorite, lensName, cameraBrand, cameraModel, cameraFormat, cameraFixedLens)
     VALUES (?, ?, ?, ?, 'loaded', ?, 0, ?, ?, ?, ?, ?)`,
    id, input.cameraId, input.filmId, input.shotISO ?? null, now, blank(input.lensName),
    getCamera(input.cameraId)?.brand ?? null, getCamera(input.cameraId)?.model ?? null, getCamera(input.cameraId)?.format ?? null,
    getCamera(input.cameraId)?.fixedLens ?? null,
  )
  touch()
  return id
}

export function patchRoll(id: string, patch: Partial<Omit<Roll, 'id' | 'favorite'>> & { favorite?: boolean }) {
  const current = getRoll(id)
  if (!current) return
  const next = { ...current, ...patch }
  db.runSync(
    `UPDATE rolls SET cameraId = ?, filmId = ?, shotISO = ?, status = ?, loadedAt = ?, finishedAt = ?, droppedAt = ?,
      lab = ?, note = ?, favorite = ?, frameCount = ?, lensName = ?, cameraBrand = ?, cameraModel = ?, cameraFormat = ?, cameraFixedLens = ?, deletedAt = ? WHERE id = ?`,
    next.cameraId, next.filmId, next.shotISO, next.status, next.loadedAt, next.finishedAt, next.droppedAt,
    blank(next.lab), blank(next.note), next.favorite ? 1 : 0, next.frameCount, blank(next.lensName),
    blank(next.cameraBrand), blank(next.cameraModel), blank(next.cameraFormat), blank(next.cameraFixedLens), next.deletedAt, id,
  )
  touch()
}

/** 카메라가 프리와인딩인지 (노출계에서 처음 답하거나 카메라 수정에서 정한다) */
export function setCameraPrewind(id: string, value: boolean | null) {
  db.runSync('UPDATE cameras SET prewind = ? WHERE id = ?', value == null ? null : value ? 1 : 0, id)
  touch()
}

export function meterShots(roll: Roll): MeterShot[] {
  try { return roll.meterShots ? JSON.parse(roll.meterShots) : [] } catch { return [] }
}

/** 노출계 기록 저장 */
export function saveMeter(rollId: string, shots: MeterShot[], prewind: boolean) {
  db.runSync('UPDATE rolls SET meterShots = ?, meterPrewind = ? WHERE id = ?', JSON.stringify(shots), prewind ? 1 : 0, rollId)
  touch()
}

export function getPref(key: string, fallback: string) {
  return db.getFirstSync<{ value: string }>('SELECT value FROM prefs WHERE key = ?', key)?.value ?? fallback
}

export function setPref(key: string, value: string) {
  db.runSync(
    'INSERT INTO prefs (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    key, value,
  )
  touch()
}

function blank(value?: string | null) {
  const text = value?.trim()
  return text ? text : null
}

// --- 롤 보관함 프로젝트(폴더). 한 롤을 여러 프로젝트에 넣을 수 있다

export type Project = {
  id: string
  name: string
  memo: string | null
  /** projectPalette 순서 (0–15) */
  color: number
  archived: boolean
  createdAt: number
  rollIds: string[]
}

/** 프로젝트 폴더 색 16가지 (아이폰·웹과 같은 순서) */
export const projectPalette = ['#E0552E', '#F08C2E', '#F2C230', '#B8C93A', '#5DB55B', '#2FA58F', '#2EA3C9', '#3F7FE0',
  '#5B5FD6', '#8C55D6', '#C24FB5', '#E05A8A', '#A0705A', '#7A7F87', '#3A3A3E', '#C9B79C']

type ProjectSql = Omit<Project, 'archived' | 'rollIds'> & { archived: number; rollIds: string }
function asProject(row: ProjectSql): Project {
  let rollIds: string[] = []
  try { rollIds = JSON.parse(row.rollIds) } catch { /* 빈 목록 */ }
  return { ...row, archived: row.archived === 1, rollIds }
}

export function listProjects() {
  return db.getAllSync<ProjectSql>('SELECT * FROM projects ORDER BY createdAt DESC').map(asProject)
}

export function getProject(id: string) {
  const row = db.getFirstSync<ProjectSql>('SELECT * FROM projects WHERE id = ?', id)
  return row ? asProject(row) : undefined
}

export function saveProject(input: { id?: string; name: string; memo?: string | null; color: number }) {
  const existing = input.id ? getProject(input.id) : undefined
  const id = existing?.id ?? newId()
  db.runSync(
    `INSERT INTO projects (id, name, memo, color, archived, createdAt, rollIds) VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET name = excluded.name, memo = excluded.memo, color = excluded.color`,
    id, input.name.trim(), blank(input.memo), input.color, existing?.archived ? 1 : 0, existing?.createdAt ?? Date.now(),
    JSON.stringify(existing?.rollIds ?? []),
  )
  touch()
  return id
}

export function setProjectArchived(id: string, archived: boolean) {
  db.runSync('UPDATE projects SET archived = ? WHERE id = ?', archived ? 1 : 0, id)
  touch()
}

export function deleteProject(id: string) {
  db.runSync('DELETE FROM projects WHERE id = ?', id)
  touch()
}

/** 롤 넣기/빼기 (on을 안 주면 반대로) */
export function setRollInProject(projectId: string, rollId: string, on?: boolean) {
  const p = getProject(projectId)
  if (!p) return
  const has = p.rollIds.includes(rollId)
  const want = on ?? !has
  if (want === has) return
  const next = want ? [...p.rollIds, rollId] : p.rollIds.filter((x) => x !== rollId)
  db.runSync('UPDATE projects SET rollIds = ? WHERE id = ?', JSON.stringify(next), projectId)
  touch()
}
