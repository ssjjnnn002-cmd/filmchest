// 기종별 노출 보정 — 상세 기록의 노출 보정 다이얼에 이 카메라에서 고를 수 있는 값만 나오게.
// 값은 EV 목록. 목록에 없으면: 완전 자동 똑딱이는 없음, 그 밖은 −2 ~ +2 (⅓ 단계).
// 고친 뒤 `node catalog/generate.mjs`
const NONE = []                 // 노출 보정 없음 (기계식·수동 측광만, 자동 노출이 없어 보정할 게 없음)
const BACK15 = [0, 1.5]         // 역광 보정 버튼·레버 하나 (+1.5)
const BACK2 = [0, 2]            // 역광 보정 버튼 (+2)
const HALF2 = [-2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2]

export const comps = {
  // Nikon
  'Nikon F': NONE, 'Nikon F2': NONE, 'Nikon FM': NONE, 'Nikon FM2': NONE, 'Nikon FM10': NONE,
  'Nikon Nikkormat FT2': NONE, 'Nikon Nikkormat FTn': NONE, 'Nikon EM': BACK2,
  // Canon
  'Canon AE-1': BACK15, 'Canon AE-1 Program': BACK15, 'Canon AV-1': BACK15, 'Canon AT-1': NONE, 'Canon AL-1': NONE,
  'Canon F-1': NONE, 'Canon FTb': NONE, 'Canon P': NONE, 'Canon 7': NONE,
  'Canon Canonet QL17 GIII': NONE, 'Canon Canonet QL19': NONE, 'Canon Demi EE17': NONE,
  // Pentax
  'Pentax K1000': NONE, 'Pentax KX': NONE, 'Pentax KM': NONE, 'Pentax MX': NONE, 'Pentax ME': NONE,
  'Pentax Spotmatic': NONE, 'Pentax Spotmatic F': NONE, 'Pentax 67': NONE,
  // Minolta
  'Minolta SR-T 101': NONE, 'Minolta SR-T 102': NONE, 'Minolta SR-T 201': NONE,
  'Minolta Hi-Matic 7s': NONE, 'Minolta Hi-Matic 7sII': NONE,
  // Olympus
  'Olympus OM-1': NONE, 'Olympus OM-1n': NONE, 'Olympus OM-3': NONE, 'Olympus 35 RC': NONE, 'Olympus 35 SP': NONE,
  'Olympus 35 DC': BACK15, 'Olympus 35 ECR': NONE, 'Olympus XA': BACK15,
  'Olympus Pen D': NONE, 'Olympus Pen F': NONE, 'Olympus Pen FT': NONE,
  // Leica
  'Leica IIIf': NONE, 'Leica IIIg': NONE, 'Leica M2': NONE, 'Leica M3': NONE, 'Leica M4': NONE, 'Leica M4-2': NONE,
  'Leica M4-P': NONE, 'Leica M5': NONE, 'Leica M6': NONE, 'Leica M6 TTL': NONE, 'Leica MP': NONE, 'Leica M-A': NONE,
  'Leica CL': NONE, 'Leica R6.2': NONE,
  // Yashica · Ricoh · Konica · Fujifilm
  'Yashica FX-3 Super 2000': NONE, 'Yashica Electro 35 GSN': NONE, 'Yashica Electro 35 GT': NONE, 'Yashica Electro 35 CC': NONE,
  'Yashica Lynx 14E': NONE, 'Yashica Mat-124G': NONE, 'Yashica Mat-124': NONE, 'Yashica D': NONE,
  'Ricoh 500G': NONE, 'Ricoh KR-5': NONE, 'Konica Auto S2': NONE, 'Konica Autoreflex T3': NONE,
  'Fujifilm GA645': HALF2, 'Fujifilm GA645Zi': HALF2,
  'Fujifilm GS645S': NONE, 'Fujifilm GW690': NONE, 'Fujifilm GSW690': NONE, 'Fujifilm GW670': NONE, 'Fujifilm GF670': NONE,
  // Rollei · Voigtländer · Zeiss Ikon · Hasselblad
  'Rollei Rolleiflex 2.8F': NONE, 'Rollei Rolleiflex 3.5F': NONE, 'Rollei Rolleicord': NONE,
  'Rollei Rollei 35': NONE, 'Rollei Rollei 35S': NONE, 'Rollei Rollei 35SE': NONE, 'Rollei Rollei 35T': NONE,
  'Voigtländer Bessa R': NONE, 'Voigtländer Bessa R2': NONE, 'Voigtländer Bessa-L': NONE, 'Zeiss Ikon Contessa': NONE,
  'Hasselblad 500C': NONE, 'Hasselblad 500C/M': NONE, 'Hasselblad 501CM': NONE, 'Hasselblad 503CW': NONE,
  // 중형 · 그 밖
  'Mamiya RB67': NONE, 'Mamiya RZ67': NONE, 'Mamiya 6': NONE, 'Mamiya 6MF': NONE, 'Mamiya 645 1000S': NONE,
  'Mamiya C330': NONE, 'Mamiya C220': NONE,
  'Bronica SQ-A': NONE, 'Bronica SQ-Ai': NONE, 'Bronica ETRS': NONE, 'Bronica ETRSi': NONE, 'Bronica GS-1': NONE,
  'Kiev 88': NONE, 'Kiev 60': NONE, 'Plaubel Makina 67': NONE, 'Seagull 4A': NONE, 'Lomo Lubitel 166': NONE,
  'Zenit E': NONE, 'Zenit ET': NONE, 'Zenit 12XP': NONE, 'Praktica MTL 3': NONE, 'Praktica MTL 5': NONE,
  'Cosina CT-1': NONE, 'Fujica ST801': NONE, 'FED 2': NONE, 'FED 3': NONE, 'FED 5': NONE, 'Zorki 4': NONE,
  'Kodak Retina IIa': NONE, 'Kodak Signet 35': NONE,
}
