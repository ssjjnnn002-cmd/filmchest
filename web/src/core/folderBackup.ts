// 컴퓨터의 클라우드 동기화 폴더(구글 드라이브·OneDrive·Dropbox·iCloud Drive 앱 폴더)에 백업 파일을 덮어쓴다.
// 크롬·엣지 같은 브라우저에서만 된다 (폴더 고르기 API). 권한은 웹앱 안에서 '허용'을 눌러 받는다.
import { getPref, setPref } from '../platform'
import { backupFileName, exportAll } from './backup'

type Perm = 'granted' | 'denied' | 'prompt'
type DirHandle = FileSystemDirectoryHandle & {
  queryPermission(o: { mode: 'readwrite' }): Promise<Perm>
  requestPermission(o: { mode: 'readwrite' }): Promise<Perm>
}
declare global { interface Window { showDirectoryPicker?: (o?: { mode?: string; id?: string }) => Promise<FileSystemDirectoryHandle> } }

export const folderAvailable = typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function'

// 폴더 핸들은 IndexedDB에 따로 둔다
function store<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open('filmchest-backup-folder', 1)
    open.onupgradeneeded = () => open.result.createObjectStore('kv')
    open.onerror = () => reject(open.error)
    open.onsuccess = () => {
      const req = fn(open.result.transaction('kv', mode).objectStore('kv'))
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    }
  })
}
const loadHandle = () => store<DirHandle | undefined>('readonly', (s) => s.get('dir') as IDBRequest<DirHandle | undefined>).catch(() => undefined)

export const folderCloud = () => getPref('folderCloud', '' as string) || undefined
export const folderName = () => getPref('folderName', '' as string) || undefined
export const folderLast = () => Number(getPref('folderLast', '0')) || undefined
export const folderDays = () => Number(getPref('folderDays', '1'))

/** 버튼을 눌렀을 때 부른다 */
export async function pickFolder(cloud: string) {
  const dir = await window.showDirectoryPicker!({ mode: 'readwrite', id: 'filmchest-backup' }) as DirHandle
  await store('readwrite', (s) => s.put(dir, 'dir'))
  setPref('folderCloud', cloud)
  setPref('folderName', dir.name)
  return dir
}

export async function folderPermission(): Promise<Perm | 'none'> {
  const dir = await loadHandle()
  if (!dir) return 'none'
  return dir.queryPermission({ mode: 'readwrite' }).catch(() => 'prompt' as Perm)
}

/** 웹앱 안에서 권한 허용 (버튼에서 부른다) */
export async function allowFolder() {
  const dir = await loadHandle()
  if (!dir) return 'none'
  return dir.requestPermission({ mode: 'readwrite' })
}

export async function backupToFolder() {
  const dir = await loadHandle()
  if (!dir) throw new Error('폴더가 연결되지 않았어요')
  if (await dir.queryPermission({ mode: 'readwrite' }) !== 'granted') throw new Error('권한을 허용해 주세요')
  const file = await dir.getFileHandle(backupFileName, { create: true })
  const w = await file.createWritable()
  await w.write(await exportAll())
  await w.close()
  setPref('folderLast', String(Date.now()))
}

/** 연결 확인: 작은 파일을 쓰고 다시 읽은 뒤 지운다 */
export async function verifyFolder(): Promise<string | undefined> {
  try {
    const dir = await loadHandle()
    if (!dir) return '폴더가 연결되지 않았어요.'
    if (await dir.queryPermission({ mode: 'readwrite' }) !== 'granted') return '권한이 없어요. 권한 허용을 눌러 주세요.'
    const name = '.필름함 연결 확인.txt'
    const stamp = new Date().toISOString()
    const f = await dir.getFileHandle(name, { create: true })
    const w = await f.createWritable()
    await w.write(stamp)
    await w.close()
    const back = await (await f.getFile()).text()
    await dir.removeEntry(name).catch(() => {})
    return back === stamp ? undefined : '저장한 내용을 다시 읽지 못했어요.'
  } catch {
    return '이 폴더에 저장할 수 없어요. 폴더를 다시 골라 주세요.'
  }
}

export async function disconnectFolder() {
  await store('readwrite', (s) => s.delete('dir')).catch(() => {})
  setPref('folderCloud', ''); setPref('folderName', '')
}

export function startFolderAutoBackup() {
  if (!folderAvailable) return
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'hidden' || !folderName()) return
    const days = folderDays()
    if (days <= 0 || Date.now() - (folderLast() ?? 0) < days * 86_400_000 - 3_600_000) return
    void backupToFolder().catch(() => {})
  })
}
