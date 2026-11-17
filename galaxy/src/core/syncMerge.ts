// 자동 복사: web/src/core/syncMerge.ts (node scripts/sync-galaxy-core.mjs). 여기서 고치지 말 것.
// 기기 사이 기록 맞추기 규칙 (웹·갤럭시 공통, 아이폰 WebFormat.merge도 같은 규칙)
//
// - 줄마다 updatedAt(ms): 그 기기에서 마지막으로 고친 시각. 받은 줄이 더 최근일 때만 덮는다
//   (드라이브의 옛 값이 방금 고친 값을 덮지 않게)
// - 지운 기록은 '지움 표시'(표 → id → 지운 시각)를 백업 파일 deleted 칸에 실어 보낸다.
//   지운 뒤에 고친 줄이 아니면 다른 기기에서도 지운다 (지운 롤·장비가 다시 살아나지 않게)
// - 휴지통(deletedAt)은 지움이 아니라 고침이라 줄과 함께 그대로 오간다

export type Tombs = Record<string, Record<string, number>>
type Row = Record<string, unknown> & { id?: unknown }

/** 지움 표시는 90일 지나면 버린다 (그 사이 모든 기기가 한 번은 맞췄다고 본다) */
export const TOMB_DAYS = 90

export const rowTime = (r: Row | undefined) => Number(r?.updatedAt) || 0
const key = (id: unknown) => String(id).toLowerCase()

export function addTomb(t: Tombs, table: string, id: unknown, at = Date.now()): Tombs {
  const k = key(id)
  return { ...t, [table]: { ...(t[table] ?? {}), [k]: Math.max(at, t[table]?.[k] ?? 0) } }
}

export function mergeTombs(a: Tombs, b: Tombs): Tombs {
  let out = { ...a }
  for (const [table, ids] of Object.entries(b ?? {})) for (const [id, at] of Object.entries(ids ?? {})) out = addTomb(out, table, id, Number(at) || 0)
  return out
}

export function pruneTombs(t: Tombs, now = Date.now()): Tombs {
  const cut = now - TOMB_DAYS * 86_400_000
  const out: Tombs = {}
  for (const [table, ids] of Object.entries(t)) {
    const keep = Object.fromEntries(Object.entries(ids).filter(([, at]) => at >= cut))
    if (Object.keys(keep).length) out[table] = keep
  }
  return out
}

/** 받은 줄을 쓸지: 이 기기 줄이 더 최근에 고친 것이면 쓰지 않는다. 둘 다 시각이 없으면(예전 기록) 받은 것을 쓴다 */
export function remoteWins(local: Row | undefined, remote: Row): boolean {
  if (!local) return true
  const lt = rowTime(local), rt = rowTime(remote)
  if (!lt && !rt) return true
  return rt >= lt
}

/** 이 줄이 지움 표시 뒤로 고쳐진 적 없으면 true (지워야 함) */
export function tombKills(t: Tombs, table: string, row: Row): boolean {
  const at = t[table]?.[key(row.id)]
  return at !== undefined && at >= rowTime(row)
}

/** 받은 줄로 바꿀 때 이 기기에만 있는 값(썸네일 같은 Blob·바이트)만 남긴다.
 *  받은 줄에서 빠진 칸(지운 메모, 되돌린 휴지통)은 그대로 빠진다 */
export function replaceRow(local: Row | undefined, remote: Row, keepLocal: (v: unknown) => boolean): Row {
  const kept = Object.fromEntries(Object.entries(local ?? {}).filter(([k, v]) => !(k in remote) && keepLocal(v)))
  return { ...kept, ...remote }
}
