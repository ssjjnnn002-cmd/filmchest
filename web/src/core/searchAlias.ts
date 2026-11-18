// 자동 생성 파일 — 직접 고치지 말고 catalog/search-aliases.mjs를 고친 뒤 `node catalog/generate-films.mjs` 실행
// 한글로 검색해도 찾게 (표시는 영어). 낱말마다: 영어로 바꾼 것 또는 그대로가 칸들 어딘가에 있으면 맞음
const aliases: [string, string][] = [["롤라이플렉스","rolleiflex"],["인더스트리얼","industrial"],["컬러네거티브","colornegative"],["메트로폴리스","metropolis"],["레이디그레이","ladygrey"],["로모그래피","lomography"],["아그파포토","agfaphoto"],["코스모포토","kosmofoto"],["폴라로이드","polaroid"],["울트라맥스","ultramax"],["컬러플러스","colorplus"],["칼라플러스","colorplus"],["프로이미지","proimage"],["트라이엑스","trix"],["인프라레드","infrared"],["레드스케일","redscale"],["스트리트팬","streetpan"],["핫셀블라드","hasselblad"],["보이그랜더","voigtlander"],["보익틀랜더","voigtlander"],["후지필름","fujifilm"],["후지컬러","fujicolor"],["후지크롬","fujichrome"],["켄트미어","kentmere"],["시네스틸","cinestill"],["씨네스틸","cinestill"],["로모크롬","lomochrome"],["페라니아","ferrania"],["인스탁스","instax"],["엑타크롬","ektachrome"],["코다컬러","kodacolor"],["더블엑스","doublex"],["프로비아","provia"],["아크로스","acros"],["슈페리아","superia"],["수퍼리아","superia"],["아스티아","astia"],["실버맥스","silvermax"],["센츄리아","centuria"],["터콰이즈","turquoise"],["얼그레이","earlgrey"],["올림푸스","olympus"],["브로니카","bronica"],["다이아나","diana"],["타쿠마르","takumar"],["즈미크론","summicron"],["하이매틱","himatic"],["오토보이","autoboy"],["일포드","ilford"],["포마팬","fomapan"],["롤라이","rollei"],["아그파","agfa"],["코스모","kosmo"],["상하이","shanghai"],["코니카","konica"],["포트라","portra"],["엑타르","ektar"],["울트라","ultra"],["티맥스","tmax"],["벨비아","velvia"],["나투라","natura"],["네오판","neopan"],["센시아","sensia"],["레알라","reala"],["비너스","venus"],["팬에프","panf"],["피닉스","phoenix"],["레트로","retro"],["슈퍼팬","superpan"],["스칼라","scala"],["비스타","vista"],["베를린","berlin"],["포츠담","potsdam"],["바빌론","babylon"],["오르토","ortho"],["스퀘어","square"],["와이드","wide"],["미놀타","minolta"],["펜탁스","pentax"],["아사히","asahi"],["라이카","leica"],["콘탁스","contax"],["야시카","yashica"],["마미야","mamiya"],["후지카","fujica"],["자이스","zeiss"],["제니트","zenit"],["키예프","kiev"],["시그마","sigma"],["토키나","tokina"],["로키논","rokinon"],["캐논넷","canonet"],["로코르","rokkor"],["주이코","zuiko"],["타쿠마","takumar"],["니코르","nikkor"],["섬마론","summaron"],["코닥","kodak"],["후지","fuji"],["하만","harman"],["로모","lomo"],["포마","foma"],["아도","adox"],["엑타","ekta"],["골드","gold"],["비전","vision"],["델타","delta"],["퍼플","purple"],["키노","kino"],["미니","mini"],["모노","mono"],["니콘","nikon"],["캐논","canon"],["핫셀","hassel"],["리코","ricoh"],["젠자","zenza"],["소니","sony"],["홀가","holga"],["탐론","tamron"],["삼양","samyang"],["트립","trip"],["에프","f"],["뮤","mju"]]

const norm = (s: string) => s.toLowerCase().replace(/[\s\-.·/&']+/g, '')
const latin = (s: string) => aliases.reduce((t, [ko, en]) => t.split(ko).join(en), s.toLowerCase())

/** 검색어(한글·영어 섞어도)가 칸들(fields)에 맞는지 */
export function searchMatch(query: string, fields: (string | undefined | null)[]): boolean {
  const words = query.trim().split(/\s+/).filter(Boolean)
  if (!words.length) return true
  const hay = norm(fields.filter(Boolean).join(' '))
  return words.every((w) => hay.includes(norm(latin(w))) || hay.includes(norm(w)))
}

/** 한글 이름을 영어로 바꾼 검색어 (자동 완성 목록용) */
export const searchLatin = (query: string) => latin(query.trim())
