// 필름함: 다른 앱의 '공유'로 받은 zip을 처리하고, 앱 화면을 이 기기에 저장해 둔다.
// 서버가 멈추거나 인터넷이 끊겨도 저장해 둔 화면으로 열려서, 이 브라우저의 기록을 계속 쓰고 꺼낼 수 있다.
// 늘 서버에서 새로 받고(업데이트가 바로 보이게), 못 받을 때만 저장본을 쓴다.
const APP = 'filmchest-app'
self.addEventListener('install', (e) => e.waitUntil((async () => {
  const cache = await caches.open(APP)
  await cache.addAll(['./', './app.js', './style.css', './manifest.webmanifest', './icon-192.png?v=2']).catch(() => {})
  await self.skipWaiting()
})()))
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/') || url.pathname.startsWith('/apk') || url.pathname.endsWith('.apk')) return
  e.respondWith((async () => {
    const page = e.request.mode === 'navigate'
    const key = page ? './' : e.request
    try {
      const res = await fetch(e.request)
      // 402·5xx: 서버가 멈춘 것 → 저장본으로
      if (res.status === 402 || res.status >= 500) throw new Error(String(res.status))
      if (res.ok && (page ? url.pathname === '/' || url.pathname.endsWith('index.html') : true)) {
        const copy = res.clone()
        e.waitUntil(caches.open(APP).then((c) => c.put(key, copy)).catch(() => {}))
      }
      return res
    } catch (err) {
      const hit = await caches.match(key, { ignoreSearch: true })
      if (hit) return hit
      throw err
    }
  })())
})
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)
  if (e.request.method !== 'POST' || !url.pathname.endsWith('/share-target')) return
  e.respondWith((async () => {
    const form = await e.request.formData()
    const files = form.getAll('files').filter((f) => f && typeof f !== 'string')
    const cache = await caches.open('filmchest-share')
    for (const k of await cache.keys()) await cache.delete(k)
    let i = 0
    for (const f of files) {
      await cache.put(`./shared/${i++}`, new Response(f, { headers: { 'x-name': encodeURIComponent(f.name || 'scan.zip'), 'content-type': f.type || 'application/octet-stream' } }))
    }
    return Response.redirect('./?shared=1', 303)
  })())
})
