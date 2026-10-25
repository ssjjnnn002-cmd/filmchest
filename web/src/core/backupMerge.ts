// 백업 합치기 도우미 (웹·갤럭시 공통): 아이폰은 id를 대문자로, 웹·갤럭시는 소문자로 써서
// 같은 장비가 둘로 늘지 않게 대소문자를 가리지 않고 같은 것으로 본다.

type Row = Record<string, unknown> & { id?: unknown }
export const TABLES = ['cameras', 'lenses', 'filters', 'filmLots', 'customFilms', 'rolls', 'projects'] as const

/** 지금 있는 id 기준으로, 대소문자만 다른 id를 같은 id로 바꾸는 함수 */
export function idCanon(existing: Row[][]) {
  const map = new Map<string, string>()
  for (const rows of existing) for (const r of rows) if (typeof r.id === 'string' && !map.has(r.id.toLowerCase())) map.set(r.id.toLowerCase(), r.id)
  return (id: unknown) => {
    if (typeof id !== 'string') return id
    const k = id.toLowerCase()
    if (!map.has(k)) map.set(k, id)
    return map.get(k)!
  }
}

/** 한 줄 안의 id와 다른 장비·롤을 가리키는 칸을 모두 맞춘다 */
export function remapRow(row: Row, canon: (id: unknown) => unknown): Row {
  const r: Row = { ...row }
  for (const k of ['id', 'cameraId', 'lensId', 'rollId']) if (k in r) r[k] = canon(r[k])
  for (const k of ['lensIds', 'accessoryIds', 'rollIds']) if (Array.isArray(r[k])) r[k] = (r[k] as unknown[]).map(canon)
  if (Array.isArray(r.lensChanges)) r.lensChanges = (r.lensChanges as Row[]).map((c) => ({ ...c, lensId: canon(c.lensId) }))
  return r
}

interface TableLike { toArray(): Promise<Row[]>; put(row: unknown): Promise<unknown>; delete(id: string): Promise<unknown> }

/** 이미 둘로 늘어난 것(대소문자만 다른 id)을 하나로 합친다. 사진이 붙은 롤·쓰이는 장비를 남긴다 */
export async function dedupeCaseIds(db: Record<string, TableLike>) {
  const replaced = new Map<string, string>()
  const frames = (await db.frames.toArray()) as Row[]
  const rolls = (await db.rolls.toArray()) as Row[]
  const used = new Set<string>([
    ...frames.map((f) => String(f.rollId)),
    ...rolls.flatMap((r) => [r.cameraId, r.lensId].filter((x): x is string => typeof x === 'string')),
  ])
  for (const t of TABLES) {
    const rows = await db[t].toArray()
    const groups = new Map<string, Row[]>()
    for (const r of rows) if (typeof r.id === 'string') groups.set(r.id.toLowerCase(), [...(groups.get(r.id.toLowerCase()) ?? []), r])
    for (const list of groups.values()) {
      if (list.length < 2) continue
      const keep = list.find((r) => used.has(String(r.id))) ?? list[0]
      // 빈 칸은 다른 쪽 정보로 채워 둔다
      const merged = Object.assign({}, ...list.filter((r) => r !== keep), keep)
      await db[t].put(merged)
      for (const r of list) if (r !== keep) { replaced.set(String(r.id), String(keep.id)); await db[t].delete(String(r.id)) }
    }
  }
  if (!replaced.size) return 0
  const canon = (id: unknown) => (typeof id === 'string' ? replaced.get(id) ?? id : id)
  for (const t of [...TABLES, 'frames', 'originals'] as const) {
    for (const r of await db[t].toArray()) {
      const next = remapRow(r, canon)
      if (JSON.stringify(next) !== JSON.stringify(r)) await db[t].put(next)
    }
  }
  return replaced.size
}
