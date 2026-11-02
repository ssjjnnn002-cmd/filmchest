// Vercel 서버 함수(api/*.js)를 고치지 않고 Cloudflare Pages에서 그대로 돌린다: req/res 모양만 맞춰 준다
export function runVercel(handler) {
  return async ({ request, env }) => {
    globalThis.process ??= { env: {} }
    Object.assign(globalThis.process.env, env)
    const url = new URL(request.url)
    const req = { method: request.method, query: Object.fromEntries(url.searchParams), headers: Object.fromEntries(request.headers) }
    let status = 200, body = null
    const headers = new Headers()
    const res = {
      status(s) { status = s; return res },
      setHeader(k, v) { headers.set(k, v); return res },
      json(o) { headers.set('Content-Type', 'application/json; charset=utf-8'); body = JSON.stringify(o); return res },
      send(s) { body = s; return res },
      end(s) { if (s !== undefined) body = s; return res },
    }
    await handler(req, res)
    return new Response(body, { status, headers })
  }
}
