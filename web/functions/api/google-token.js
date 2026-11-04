// 웹앱의 구글 드라이브 허가를 창 없이 이어 간다. 저장하는 것은 없다:
// 오래 쓰는 허가(refresh token)는 각자의 브라우저에만 있고, 여기서는 앱 비밀번호를 붙여 구글에 대신 물어봐 주기만 한다.
// 비밀번호: npx wrangler pages secret put GOOGLE_CLIENT_SECRET --project-name filmchest
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } })

// 비밀번호가 들어 있는지만 알려 준다 (없으면 웹앱은 예전 방식으로 연결한다)
export const onRequestGet = ({ env }) => json({ ready: !!env.GOOGLE_CLIENT_SECRET }, env.GOOGLE_CLIENT_SECRET ? 200 : 503)

export async function onRequestPost({ request, env }) {
  if (!env.GOOGLE_CLIENT_SECRET) return json({ error: 'not_configured' }, 503)
  // 이 웹앱에서 보낸 요청만
  const origin = request.headers.get('origin')
  if (!origin || new URL(origin).host !== new URL(request.url).host) return json({ error: 'forbidden' }, 403)
  const body = await request.json().catch(() => ({}))
  if (typeof body.client_id !== 'string') return json({ error: 'bad_request' }, 400)
  const form = new URLSearchParams({ client_id: body.client_id, client_secret: env.GOOGLE_CLIENT_SECRET })
  if (typeof body.code === 'string') {
    form.set('grant_type', 'authorization_code')
    form.set('code', body.code)
    form.set('redirect_uri', 'postmessage') // 구글 로그인 창(팝업) 방식의 약속된 값
  } else if (typeof body.refresh_token === 'string') {
    form.set('grant_type', 'refresh_token')
    form.set('refresh_token', body.refresh_token)
  } else {
    return json({ error: 'bad_request' }, 400)
  }
  const res = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', body: form })
  const j = await res.json().catch(() => ({}))
  if (!j.access_token) return json({ error: j.error ?? 'failed' }, res.status === 200 ? 502 : res.status)
  return json({ access_token: j.access_token, expires_in: j.expires_in, refresh_token: j.refresh_token })
}
