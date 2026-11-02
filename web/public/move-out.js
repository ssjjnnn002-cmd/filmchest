// 예전 주소(filmchest.vercel.app)에서 '필름함 옮기기' 북마크를 누르면 불려 오는 코드.
// 예전 주소의 브라우저 저장소는 그 주소에서 도는 코드만 읽을 수 있어서, 북마크로 이 코드를 그 주소 위에서 돌린다.
// 기록·사진을 꺼내 새 주소 창(?move=1)에 넘긴다. 받는 쪽: src/core/move.ts receiveFromOldSite
;(() => {
  const OLD = 'https://filmchest.vercel.app'
  const NEW = 'https://filmchest.pages.dev'
  if (location.origin !== OLD) {
    if (confirm('필름함 예전 주소에서 눌러야 해요. 예전 주소를 열까요?\n열리면 북마크를 한 번 더 눌러 주세요.')) location.href = OLD
    return
  }
  if (document.getElementById('fc-move')) return

  const box = document.createElement('div')
  box.id = 'fc-move'
  box.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#111;color:#fff;font:17px/1.5 -apple-system,system-ui,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;padding:24px;text-align:center'
  const msg = document.createElement('div')
  msg.textContent = '이 브라우저의 필름함 기록을 새 주소로 옮겨요.'
  const btn = document.createElement('button')
  btn.textContent = '기록 옮기기'
  btn.style.cssText = 'font:600 18px -apple-system,system-ui,sans-serif;padding:16px 36px;border:0;border-radius:14px;background:#ff6b1f;color:#fff'
  box.append(msg, btn)
  document.body.append(box)
  const say = (t) => { msg.textContent = t }

  const req = (r) => new Promise((ok, no) => { r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error) })

  async function collect() {
    const tables = {}
    const dbs = indexedDB.databases ? await indexedDB.databases() : [{ name: 'filmchest' }]
    if (dbs.some((d) => d.name === 'filmchest')) {
      const db = await req(indexedDB.open('filmchest'))
      for (const name of db.objectStoreNames) {
        if (name === 'zipQueue') continue
        tables[name] = await req(db.transaction(name).objectStore(name).getAll())
      }
      db.close()
    }
    const photos = {}
    try {
      const root = await navigator.storage.getDirectory()
      const dir = await root.getDirectoryHandle('camera-photos')
      for await (const [file, handle] of dir.entries()) {
        if (handle.kind === 'file' && file.endsWith('.png')) photos[file.slice(0, -4)] = await handle.getFile()
      }
    } catch { /* 사진 폴더 없음 */ }
    const prefs = {}
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k.startsWith('filmchest.') && !/^filmchest\.(drive|intro)/.test(k)) prefs[k] = localStorage.getItem(k)
    }
    return { tables, photos, prefs }
  }

  btn.onclick = () => {
    const w = window.open(`${NEW}/?move=1`, '_blank')
    if (!w) { say('새 창이 막혔어요. 버튼을 다시 눌러 주세요.'); return }
    btn.disabled = true
    btn.style.opacity = '.5'
    say('옮기는 중이에요. 새로 열린 창을 닫지 마세요.')
    const timer = setTimeout(() => { say('새 창에서 답이 없어요. 버튼을 다시 눌러 주세요.'); btn.disabled = false; btn.style.opacity = '1' }, 120000)
    addEventListener('message', async (e) => {
      if (e.origin !== NEW) return
      if (e.data?.type === 'filmchest-ready') {
        try {
          const payload = await collect()
          const n = (payload.tables.cameras?.length ?? 0) + (payload.tables.rolls?.length ?? 0)
          if (!n) say('이 브라우저에는 옮길 기록이 없어요. 예전에 쓰던 브라우저에서 눌러 주세요.')
          w.postMessage({ type: 'filmchest-move', payload }, NEW)
        } catch (err) { say(`기록을 꺼내지 못했어요. (${err?.message ?? err})`) }
      }
      if (e.data?.type === 'filmchest-done') {
        clearTimeout(timer)
        say('다 옮겼어요. 이제 새 주소(filmchest.pages.dev)를 쓰세요.')
        btn.remove()
      }
    })
  }
})()
