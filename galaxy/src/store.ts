// 갤럭시 저장소. 웹앱(Dexie/IndexedDB)과 같은 모양으로 쓰도록 만든 작은 문서 저장소.
// 웹 화면 코드의 db.rolls.get(...), db.rolls.where('cameraId').equals(id).toArray() 같은 호출을 그대로 옮길 수 있다.
// 실제 저장은 SQLite 한 테이블(docs)에 JSON으로. 바뀌면 useLiveQuery를 쓰는 화면이 다시 읽는다.
import { openDatabaseSync } from 'expo-sqlite'
import { useEffect, useRef, useState } from 'react'

const sql = openDatabaseSync('filmchest.db')
sql.execSync(`
  CREATE TABLE IF NOT EXISTS docs (
    coll TEXT NOT NULL,
    id TEXT NOT NULL,
    data TEXT NOT NULL,
    PRIMARY KEY (coll, id)
  );
  CREATE TABLE IF NOT EXISTS prefs (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
`)

// --- 바뀜 알림

let revision = 0
const listeners = new Set<() => void>()
function changed() {
  revision += 1
  // 한 번에 여러 번 바뀌어도 화면은 한 번만 다시 읽게
  queueMicrotask(() => listeners.forEach((fn) => fn()))
}
export const storeRevision = () => revision
export function subscribe(fn: () => void) {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}

type Doc = Record<string, any>
const get = (o: Doc, path: string) => path.split('.').reduce((v, k) => v?.[k], o)
const cmp = (a: any, b: any) => (a === b ? 0 : a === undefined ? 1 : b === undefined ? -1 : a < b ? -1 : 1)
const clone = <T,>(o: T): T => (o === undefined ? o : JSON.parse(JSON.stringify(o)))

export class Collection<T extends Doc> {
  constructor(private table: Table<T, any>, private pick: (row: T) => boolean, private order?: string, private desc = false) {}
  private rows() {
    const list = this.table.all().filter(this.pick)
    if (this.order) list.sort((a, b) => cmp(get(a, this.order!), get(b, this.order!)))
    if (this.desc) list.reverse()
    return list
  }
  reverse() { return new Collection(this.table, this.pick, this.order, !this.desc) }
  filter(fn: (row: T) => boolean) { return new Collection(this.table, (r) => this.pick(r) && fn(r), this.order, this.desc) }
  async toArray() { return this.rows().map(clone) }
  async sortBy(field: string) {
    const list = this.rows().sort((a, b) => cmp(get(a, field), get(b, field)))
    return (this.desc ? list.reverse() : list).map(clone)
  }
  async first() { return clone(this.rows()[0]) }
  async count() { return this.rows().length }
  async delete() {
    const keys = this.rows().map((r) => this.table.keyOf(r))
    for (const k of keys) this.table.remove(k)
    if (keys.length) changed()
    return keys.length
  }
  async modify(patch: Partial<T> | ((row: T) => void)) {
    const rows = this.rows()
    for (const r of rows) {
      const next = clone(r)
      if (typeof patch === 'function') patch(next)
      else Object.assign(next, patch)
      this.table.write(next)
    }
    if (rows.length) changed()
    return rows.length
  }
}

export class Table<T extends Doc, K extends string = string> {
  private cache: Map<string, T> | null = null
  constructor(readonly name: string, readonly key: string = 'id') {}

  keyOf(row: T) { return String(row[this.key]) }
  all(): T[] {
    if (!this.cache) {
      this.cache = new Map()
      for (const r of sql.getAllSync<{ id: string; data: string }>('SELECT id, data FROM docs WHERE coll = ?', this.name)) {
        try { this.cache.set(r.id, JSON.parse(r.data)) } catch { /* 깨진 줄은 건너뛴다 */ }
      }
    }
    return [...this.cache.values()]
  }
  write(row: T) {
    this.all()
    const id = this.keyOf(row)
    // undefined 필드는 지운다 (웹 Dexie와 같게)
    const clean = JSON.parse(JSON.stringify(row))
    this.cache!.set(id, clean)
    sql.runSync('INSERT OR REPLACE INTO docs (coll, id, data) VALUES (?, ?, ?)', this.name, id, JSON.stringify(clean))
  }
  remove(id: string) {
    this.all()
    this.cache!.delete(id)
    sql.runSync('DELETE FROM docs WHERE coll = ? AND id = ?', this.name, id)
  }

  async get(id: K | undefined | null) { return id == null ? undefined : clone(this.all().find((r) => this.keyOf(r) === String(id))) }
  getSync(id: K | undefined | null) { return id == null ? undefined : clone(this.all().find((r) => this.keyOf(r) === String(id))) }
  async put(row: T) { this.write(row); changed(); return this.keyOf(row) as K }
  async add(row: T) { return this.put(row) }
  async bulkAdd(rows: T[]) { for (const r of rows) this.write(r); if (rows.length) changed() }
  async bulkPut(rows: T[]) { return this.bulkAdd(rows) }
  async update(id: K, patch: Partial<T>) {
    const row = this.all().find((r) => this.keyOf(r) === String(id))
    if (!row) return 0
    const next = { ...clone(row), ...patch }
    for (const k of Object.keys(patch)) if ((patch as Doc)[k] === undefined) delete (next as Doc)[k]
    this.write(next)
    changed()
    return 1
  }
  async delete(id: K) { this.remove(String(id)); changed() }
  async clear() {
    this.all()
    this.cache!.clear()
    sql.runSync('DELETE FROM docs WHERE coll = ?', this.name)
    changed()
  }
  async toArray() { return this.all().map(clone) }
  async count() { return this.all().length }
  toArraySync() { return this.all().map(clone) }
  where(field: string) {
    return {
      equals: (v: any) => new Collection<T>(this, (r) => get(r, field) === v),
      anyOf: (list: any[]) => new Collection<T>(this, (r) => list.includes(get(r, field))),
    }
  }
  orderBy(field: string) { return new Collection<T>(this, () => true, field) }
  filter(fn: (row: T) => boolean) { return new Collection<T>(this, fn) }
}

/** 웹 Dexie의 db.transaction('rw', ...tables, fn)과 같은 모양. 여기선 그냥 차례로 실행한다. */
export async function transaction(..._args: any[]) {
  const fn = _args[_args.length - 1] as () => Promise<any>
  return fn()
}

/** 웹 dexie-react-hooks의 useLiveQuery와 같은 모양: 저장소가 바뀌면 다시 읽는다 */
export function useLiveQuery<R>(fn: () => Promise<R> | R, deps?: any[]): R | undefined
export function useLiveQuery<R, D>(fn: () => Promise<R> | R, deps: any[], initial: D): R | D
export function useLiveQuery<R>(fn: () => Promise<R> | R, deps: any[] = [], initial?: any) {
  const [value, setValue] = useState<R | undefined>(initial)
  const fnRef = useRef(fn)
  fnRef.current = fn
  useEffect(() => {
    let alive = true
    const run = () => {
      Promise.resolve(fnRef.current()).then((v) => { if (alive) setValue(v) }).catch(() => {})
    }
    run()
    const off = subscribe(run)
    return () => { alive = false; off() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return value
}

// --- 기기 설정 (웹의 localStorage getPref/setPref 자리)

export function getPref<T extends string>(key: string, fallback: T): T {
  return (sql.getFirstSync<{ value: string }>('SELECT value FROM prefs WHERE key = ?', key)?.value as T) ?? fallback
}
export function setPref(key: string, value: string) {
  sql.runSync('INSERT INTO prefs (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', key, value)
}

export const rawSql = sql
