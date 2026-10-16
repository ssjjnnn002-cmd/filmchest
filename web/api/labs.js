// 가까운 현상소 찾기 (Vercel 서버 함수). 카카오 로컬 검색을 대신 불러 키를 앱에 드러내지 않는다.
//   KAKAO_REST_KEY  (developers.kakao.com → 내 애플리케이션 → 앱 키 → REST API 키)
// 키가 없으면 501. 아이폰 앱은 그때 애플 지도 검색으로 대신 찾는다.
//
//   GET /api/labs?lat=37.55&lng=126.90  → { provider: 'kakao', labs: [{ name, address, phone, latitude, longitude, distance, url }] }

const QUERIES = ['필름현상', '필름현상소', '현상소', '필름 스캔', '필름랩']
// 이름에 '필름'이 들어간 셀프사진관·프로필 스튜디오가 많아서, 현상소로 볼 만한 곳만 남긴다
const labLike = (d) => /현상|랩|lab|스캔|scan/i.test(`${d.place_name} ${d.category_name}`)
const notLab = (d) => /셀프|프로필|바디|웨딩|증명|포토부스|인생네컷|하루필름/i.test(d.place_name) && !/현상/.test(d.place_name)
const filmish = (d) => labLike(d) && !notLab(d)

export default async function handler(req, res) {
  const lat = Number(req.query.lat), lng = Number(req.query.lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return res.status(400).json({ error: 'lat, lng 필요' })
  const key = process.env.KAKAO_REST_KEY
  if (!key) return res.status(501).json({ error: 'no-key' })

  const seen = new Map()
  let failure = null
  await Promise.all(QUERIES.map(async (q) => {
    const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(q)}&x=${lng}&y=${lat}&radius=20000&sort=distance&size=15`
    try {
      const r = await fetch(url, { headers: { Authorization: `KakaoAK ${key}` } })
      if (!r.ok) { failure ??= { status: r.status, body: (await r.text()).slice(0, 300) }; return }
      const { documents = [] } = await r.json()
      for (const d of documents) if (!seen.has(d.id)) seen.set(d.id, d)
    } catch { /* 한 검색어가 실패해도 나머지로 */ }
  }))

  const labs = [...seen.values()]
    .filter(filmish)
    .sort((a, b) => Number(a.distance) - Number(b.distance))
    .slice(0, 30)
    .map((d) => ({
      name: d.place_name,
      address: d.road_address_name || d.address_name,
      phone: d.phone || undefined,
      latitude: Number(d.y),
      longitude: Number(d.x),
      distance: Number(d.distance),
      url: d.place_url,
    }))
  // 카카오가 전부 거절하면 이유를 알려 준다 (카카오맵 사용 설정이 꺼져 있는 경우 등)
  if (!seen.size && failure) return res.status(502).json({ error: 'kakao', ...failure })
  res.setHeader('Cache-Control', 'public, max-age=600')
  res.setHeader('Access-Control-Allow-Origin', '*')
  return res.status(200).json({ provider: 'kakao', labs })
}
