// 한글로 검색해도 찾게: 한글 → 영어 (표시는 영어 그대로). 고친 뒤 `node catalog/generate-films.mjs`
// 긴 것부터 바꾼다 (후지필름 → fujifilm 이 후지 → fuji 보다 먼저)
export const searchAliases = {
  // 필름 브랜드
  코닥: 'kodak', 후지필름: 'fujifilm', 후지컬러: 'fujicolor', 후지크롬: 'fujichrome', 후지: 'fuji', 일포드: 'ilford', 켄트미어: 'kentmere',
  하만: 'harman', 시네스틸: 'cinestill', 씨네스틸: 'cinestill', 로모그래피: 'lomography', 로모크롬: 'lomochrome', 로모: 'lomo',
  포마팬: 'fomapan', 포마: 'foma', 롤라이플렉스: 'rolleiflex', 롤라이: 'rollei', 아도: 'adox', 아그파포토: 'agfaphoto', 아그파: 'agfa',
  페라니아: 'ferrania', 코스모포토: 'kosmofoto', 코스모: 'kosmo', 상하이: 'shanghai', 코니카: 'konica', 폴라로이드: 'polaroid', 인스탁스: 'instax',
  // 필름 이름
  포트라: 'portra', 엑타크롬: 'ektachrome', 엑타르: 'ektar', 엑타: 'ekta', 골드: 'gold', 울트라맥스: 'ultramax', 울트라: 'ultra',
  컬러플러스: 'colorplus', 칼라플러스: 'colorplus', 코다컬러: 'kodacolor', 프로이미지: 'proimage', 트라이엑스: 'trix', 티맥스: 'tmax',
  더블엑스: 'doublex', 비전: 'vision', 벨비아: 'velvia', 프로비아: 'provia', 아크로스: 'acros', 슈페리아: 'superia', 수퍼리아: 'superia',
  나투라: 'natura', 네오판: 'neopan', 아스티아: 'astia', 센시아: 'sensia', 레알라: 'reala', 비너스: 'venus', 인더스트리얼: 'industrial',
  델타: 'delta', 팬에프: 'panf', 피닉스: 'phoenix', 레트로: 'retro', 슈퍼팬: 'superpan', 인프라레드: 'infrared', 실버맥스: 'silvermax',
  스칼라: 'scala', 비스타: 'vista', 센츄리아: 'centuria', 컬러네거티브: 'colornegative', 퍼플: 'purple', 터콰이즈: 'turquoise',
  메트로폴리스: 'metropolis', 레드스케일: 'redscale', 베를린: 'berlin', 포츠담: 'potsdam', 바빌론: 'babylon', 얼그레이: 'earlgrey',
  레이디그레이: 'ladygrey', 키노: 'kino', 스트리트팬: 'streetpan', 오르토: 'ortho', 미니: 'mini', 스퀘어: 'square', 와이드: 'wide', 모노: 'mono',
  // 카메라·렌즈 브랜드
  니콘: 'nikon', 캐논: 'canon', 미놀타: 'minolta', 올림푸스: 'olympus', 펜탁스: 'pentax', 아사히: 'asahi', 라이카: 'leica', 콘탁스: 'contax',
  야시카: 'yashica', 마미야: 'mamiya', 핫셀블라드: 'hasselblad', 핫셀: 'hassel', 리코: 'ricoh', 브로니카: 'bronica', 젠자: 'zenza',
  후지카: 'fujica', 소니: 'sony', 보이그랜더: 'voigtlander', 보익틀랜더: 'voigtlander', 자이스: 'zeiss', 제니트: 'zenit', 키예프: 'kiev',
  홀가: 'holga', 다이아나: 'diana', 시그마: 'sigma', 탐론: 'tamron', 토키나: 'tokina', 삼양: 'samyang', 로키논: 'rokinon', 캐논넷: 'canonet',
  // 카메라 이름에 자주 나오는 말
  로코르: 'rokkor', 주이코: 'zuiko', 타쿠마: 'takumar', 타쿠마르: 'takumar', 니코르: 'nikkor', 섬마론: 'summaron', 즈미크론: 'summicron',
  하이매틱: 'himatic', 트립: 'trip', 뮤: 'mju', 오토보이: 'autoboy', 에프: 'f',
}
