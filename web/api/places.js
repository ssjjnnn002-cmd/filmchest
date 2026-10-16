// 장소 검색 (Vercel 서버 함수). 검색 키를 브라우저에 드러내지 않으려고 여기서 대신 부른다.
// 키가 있는 서비스부터 쓴다: 네이버 → 카카오 → 구글. 하나도 없으면 501 (앱은 OpenStreetMap으로 검색).
//   NAVER_CLIENT_ID / NAVER_CLIENT_SECRET  (developers.naver.com, 검색 API)
//   KAKAO_REST_KEY                          (developers.kakao.com, REST API 키)
//   GOOGLE_PLACES_KEY                       (Google Cloud, Places API (New))
//
//   GET /api/places?q=망원동 카페          → { provider, places: [{ name, address, latitude, longitude }] }
//   GET /api/places?lat=37.55&lng=126.90   → { provider, name } (현재 위치의 동네 이름, 카카오만)

const strip = (s) => (s ?? '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim()

async function naver(q) {
  const id = process.env.NAVER_CLIENT_ID, secret = process.env.NAVER_CLIENT_SECRET
  if (!id || !secret) return null
  const r = await fetch(`https://openapi.naver.com/v1/search/local.json?display=5&query=${encodeURIComponent(q)}`, {
    headers: { 'X-Naver-Client-Id': id, 'X-Naver-Client-Secret': secret },
  })
  if (!r.ok) return null
  const { items = [] } = await r.json()
  return items.map((x) => ({
    name: strip(x.title),
    address: x.roadAddress || x.address,
    // mapx/mapy: 경도/위도 × 10^7
    latitude: Number(x.mapy) / 1e7,
    longitude: Number(x.mapx) / 1e7,
  })).filter((p) => p.latitude && p.longitude)
}

async function kakao(q) {
  const key = process.env.KAKAO_REST_KEY
  if (!key) return null
  const r = await fetch(`https://dapi.kakao.com/v2/local/search/keyword.json?size=10&query=${encodeURIComponent(q)}`, {
    headers: { Authorization: `KakaoAK ${key}` },
  })
  if (!r.ok) return null
  const { documents = [] } = await r.json()
  return documents.map((d) => ({
    name: d.place_name,
    address: d.road_address_name || d.address_name,
    latitude: Number(d.y),
    longitude: Number(d.x),
  }))
}

async function google(q) {
  const key = process.env.GOOGLE_PLACES_KEY
  if (!key) return null
  const r = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location',
    },
    body: JSON.stringify({ textQuery: q, languageCode: 'ko', pageSize: 8 }),
  })
  if (!r.ok) return null
  const { places = [] } = await r.json()
  return places.map((p) => ({
    name: p.displayName?.text ?? '',
    address: p.formattedAddress,
    latitude: p.location?.latitude,
    longitude: p.location?.longitude,
  }))
}

async function kakaoRegion(lat, lng) {
  const key = process.env.KAKAO_REST_KEY
  if (!key) return null
  const r = await fetch(`https://dapi.kakao.com/v2/local/geo/coord2regioncode.json?x=${lng}&y=${lat}`, {
    headers: { Authorization: `KakaoAK ${key}` },
  })
  if (!r.ok) return null
  const { documents = [] } = await r.json()
  const h = documents.find((d) => d.region_type === 'H') ?? documents[0]
  return h ? h.region_3depth_name || h.region_2depth_name : null
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  const { q, lat, lng } = req.query ?? {}
  try {
    if (lat && lng) {
      const name = await kakaoRegion(Number(lat), Number(lng))
      if (name == null) return res.status(501).json({ error: 'no provider' })
      return res.status(200).json({ provider: 'kakao', name })
    }
    const query = String(q ?? '').trim().slice(0, 80)
    if (!query) return res.status(400).json({ error: 'q required' })
    for (const [provider, fn] of [['naver', naver], ['kakao', kakao], ['google', google]]) {
      const places = await fn(query)
      if (places) return res.status(200).json({ provider, places })
    }
    return res.status(501).json({ error: 'no provider' })
  } catch {
    return res.status(502).json({ error: 'search failed' })
  }
}
