// 자동 복사: web/src/core/driveApi.ts (node scripts/sync-galaxy-core.mjs). 여기서 고치지 말 것.
// 구글 드라이브 폴더·파일 다루기 (웹·갤럭시 공통). drive.file 권한이라 이 앱이 만든 것만 보인다.
// 내용 올리기(바이트)는 플랫폼마다 다르게: 웹은 fetch(Blob), 갤럭시는 파일 업로드.

const API = 'https://www.googleapis.com/drive/v3/files'
export const FOLDER = 'application/vnd.google-apps.folder'
export const ROOT_NAME = '필름함'
export const mediaUrl = (id: string) => `https://www.googleapis.com/upload/drive/v3/files/${id}?uploadType=media`

async function call<T>(token: string, url: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url, { ...init, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) } })
  if (!res.ok) throw Object.assign(new Error(`드라이브 요청 실패 (${res.status})`), { status: res.status })
  return (res.status === 204 ? undefined : await res.json()) as T
}

const q = (s: string) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")

/** 이름으로 찾기 (폴더 안) */
export async function findByName(token: string, name: string, parent?: string, folder = false) {
  const parts = [`name = '${q(name)}'`, 'trashed = false', folder ? `mimeType = '${FOLDER}'` : `mimeType != '${FOLDER}'`]
  if (parent) parts.push(`'${parent}' in parents`)
  const r = await call<{ files: { id: string }[] }>(token, `${API}?q=${encodeURIComponent(parts.join(' and '))}&fields=files(id)&pageSize=1`)
  return r.files[0]?.id
}

/** 있으면 쓰고 없으면 만든 폴더 id */
export async function ensureFolder(token: string, name: string, parent?: string) {
  const found = await findByName(token, name, parent, true)
  if (found) return found
  const made = await call<{ id: string }>(token, API, { method: 'POST', body: JSON.stringify({ name, mimeType: FOLDER, parents: parent ? [parent] : undefined }) })
  return made.id
}

/** 내용 없는 파일을 만들고 id (내용은 mediaUrl로 올린다) */
export async function createFile(token: string, name: string, parent: string, mimeType: string) {
  const made = await call<{ id: string }>(token, API, { method: 'POST', body: JSON.stringify({ name, mimeType, parents: [parent] }) })
  return made.id
}

/** 폴더 안 파일·폴더 목록 */
export async function listChildren(token: string, parent: string) {
  const out: { id: string; name: string; mimeType: string }[] = []
  let page = ''
  do {
    const r = await call<{ files: { id: string; name: string; mimeType: string }[]; nextPageToken?: string }>(token,
      `${API}?q=${encodeURIComponent(`'${parent}' in parents and trashed = false`)}&fields=nextPageToken,files(id,name,mimeType)&pageSize=200${page ? `&pageToken=${page}` : ''}`)
    out.push(...r.files)
    page = r.nextPageToken ?? ''
  } while (page)
  return out
}

export const downloadUrl = (id: string) => `${API}/${id}?alt=media`

/** 롤 폴더 이름 (같은 이름이 겹치지 않게 날짜를 붙인다) */
export function rollFolderName(title: string, startedAt?: number) {
  const d = startedAt ? new Date(startedAt) : undefined
  const day = d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ` : ''
  return `${day}${title}`.replace(/[/\\:]/g, '-').slice(0, 120)
}
