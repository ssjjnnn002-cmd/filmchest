// 필름함: 다른 앱의 '공유'로 받은 zip만 처리한다 (오프라인 캐시는 하지 않는다)
self.addEventListener('install', () => self.skipWaiting())
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
      await cache.put(`./shared/${i++}`, new Response(f, { headers: { 'x-name': encodeURIComponent(f.name || 'scan.zip') } }))
    }
    return Response.redirect('./?shared=1', 303)
  })())
})
