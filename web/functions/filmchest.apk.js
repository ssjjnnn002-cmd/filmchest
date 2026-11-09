// 갤럭시 APK 내려받기: 정적 파일은 25MB까지라 APK를 나눠 올리고(web/public/apk/), 여기서 이어 붙여 한 파일로 내보낸다.
// 나누기: scripts/build-android.sh
export async function onRequest({ request, env }) {
  const at = (path) => env.ASSETS.fetch(new URL(path, request.url))
  const meta = await (await at('/apk/parts.json')).json()
  const { readable, writable } = new TransformStream()
  ;(async () => {
    for (let i = 0; i < meta.parts; i++) await (await at(`/apk/part${i}.bin`)).body.pipeTo(writable, { preventClose: true })
    await writable.close()
  })()
  const name = meta.version ? `filmchest-${meta.version}.apk` : 'filmchest.apk'
  return new Response(readable, {
    headers: {
      'Content-Type': 'application/vnd.android.package-archive',
      'Content-Disposition': `attachment; filename="${name}"`,
      'Content-Length': String(meta.size),
      'Cache-Control': 'no-store',
    },
  })
}
