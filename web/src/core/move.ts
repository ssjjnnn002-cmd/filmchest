// 주소 이사: 예전 주소(Vercel)의 브라우저에 있는 기록·사진을 새 주소로 그대로 넘긴다.
// 브라우저 저장소는 주소마다 따로라서, 예전 주소 화면이 새 주소 창을 열고 postMessage로 건넨다.
import { db } from '../db'
import { cameraPhotoBlob, saveCameraPhoto } from '../photoStore'

export const OLD_SITE: string = import.meta.env.VITE_OLD_SITE ?? 'https://filmchest.vercel.app'
export const NEW_SITE: string = import.meta.env.VITE_NEW_SITE ?? 'https://filmchest.pages.dev'
export const isOldSite = location.origin === OLD_SITE

type Payload = { tables: Record<string, unknown[]>; photos: Record<string, Blob>; prefs: Record<string, string> }
// 기기마다 다른 값(드라이브 연결, 받아 둔 표시)은 옮기지 않는다
const skipPref = /^filmchest\.(drive|intro)/

async function collect(): Promise<Payload> {
  const tables: Record<string, unknown[]> = {}
  for (const t of db.tables) if (t.name !== 'zipQueue' && t.name !== 'cameraPhotos') tables[t.name] = await t.toArray()
  const photos: Record<string, Blob> = {}
  for (const name of ['cameras', 'lenses', 'filters']) {
    for (const row of (tables[name] ?? []) as { id: string; hasPhoto?: boolean }[]) {
      const b = await cameraPhotoBlob(row.id).catch(() => undefined)
      if (b) photos[row.id] = b
    }
  }
  const prefs: Record<string, string> = {}
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)!
    if (k.startsWith('filmchest.') && !skipPref.test(k)) prefs[k] = localStorage.getItem(k) ?? ''
  }
  return { tables, photos, prefs }
}

/** 예전 주소에서: 새 주소 창을 열고 기록을 넘긴다. 다 받으면 resolve */
export function sendToNewSite(): Promise<void> {
  const w = window.open(`${NEW_SITE}/?move=1`, '_blank')
  if (!w) return Promise.reject(new Error('새 창이 막혔어요. 다시 눌러 주세요.'))
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => { removeEventListener('message', on); reject(new Error('새 주소에서 답이 없어요. 다시 눌러 주세요.')) }, 120_000)
    const on = async (e: MessageEvent) => {
      if (e.origin !== NEW_SITE) return
      if (e.data?.type === 'filmchest-ready') w.postMessage({ type: 'filmchest-move', payload: await collect() }, NEW_SITE)
      if (e.data?.type === 'filmchest-done') { window.clearTimeout(timer); removeEventListener('message', on); resolve() }
    }
    addEventListener('message', on)
  })
}

/** 새 주소에서: 예전 주소가 연 창이면 기록을 받아 넣는다 */
export function receiveFromOldSite(onDone: () => void) {
  if (!new URLSearchParams(location.search).has('move') || !window.opener) return
  addEventListener('message', async (e: MessageEvent) => {
    if (e.origin !== OLD_SITE || e.data?.type !== 'filmchest-move') return
    const { tables, photos, prefs } = e.data.payload as Payload
    for (const [name, rows] of Object.entries(tables)) {
      const t = db.tables.find((x) => x.name === name)
      if (t && rows.length) await t.bulkPut(rows)
    }
    for (const [id, blob] of Object.entries(photos)) await saveCameraPhoto(id, blob)
    for (const [k, v] of Object.entries(prefs)) if (localStorage.getItem(k) === null) localStorage.setItem(k, v)
    window.opener?.postMessage({ type: 'filmchest-done' }, OLD_SITE)
    history.replaceState(null, '', '/')
    onDone()
  })
  window.opener.postMessage({ type: 'filmchest-ready' }, OLD_SITE)
}
