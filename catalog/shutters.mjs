// 기종별 셔터 범위 — 상세 기록 다이얼에 이 카메라가 지원하는 셔터 속도만 나오게.
// [가장 빠른 셔터 1/x의 x, 가장 느린 셔터(초)]. 'auto' = 셔터를 직접 고를 수 없는 자동 카메라(다이얼은 A만).
// 목록에 없으면: 똑딱이는 auto, 그 밖은 1/1000–1초. B(벌브)는 넣지 않는다.
// 고친 뒤 `node catalog/generate.mjs`
const A = 'auto'

export const shutters = {
  // Nikon
  'Nikon F': [1000, 1], 'Nikon F2': [2000, 10], 'Nikon F3': [2000, 8], 'Nikon F4': [8000, 30], 'Nikon F5': [8000, 30],
  'Nikon F6': [8000, 30], 'Nikon F100': [8000, 30], 'Nikon F90X': [8000, 30], 'Nikon F80': [4000, 30], 'Nikon F75': [4000, 30],
  'Nikon F65': [4000, 30], 'Nikon F55': [2000, 30], 'Nikon F-401': [2000, 1], 'Nikon F-501': [2000, 1], 'Nikon F-601': [2000, 30],
  'Nikon F-801': [8000, 30], 'Nikon F-301': [2000, 1], 'Nikon FM': [1000, 1], 'Nikon FM2': [4000, 1], 'Nikon FM3A': [4000, 8],
  'Nikon FM10': [2000, 1], 'Nikon FE': [1000, 8], 'Nikon FE2': [4000, 8], 'Nikon FE10': [2000, 8], 'Nikon FA': [4000, 1],
  'Nikon EM': A, 'Nikon FG': [1000, 1], 'Nikon FG-20': [1000, 1], 'Nikon Nikkormat FT2': [1000, 1], 'Nikon Nikkormat FTn': [1000, 1],
  // Canon
  'Canon AE-1': [1000, 2], 'Canon AE-1 Program': [1000, 2], 'Canon A-1': [1000, 30], 'Canon AV-1': A, 'Canon AT-1': [1000, 2],
  'Canon AL-1': [1000, 2], 'Canon F-1': [2000, 1], 'Canon New F-1': [2000, 8], 'Canon FTb': [1000, 1], 'Canon T50': A,
  'Canon T70': [1000, 2], 'Canon T90': [4000, 30], 'Canon EOS-1N': [8000, 30], 'Canon EOS-1V': [8000, 30], 'Canon EOS 3': [8000, 30],
  'Canon EOS 5': [8000, 30], 'Canon EOS 650': [2000, 30], 'Canon EOS 620': [4000, 30], 'Canon EOS 30': [4000, 30],
  'Canon EOS 300': [2000, 30], 'Canon EOS 500N': [2000, 30], 'Canon EOS 300V': [4000, 30],
  'Canon Canonet QL17 GIII': [500, 1], 'Canon Canonet QL19': [500, 1], 'Canon P': [1000, 1], 'Canon 7': [1000, 1], 'Canon Demi EE17': [500, 1 / 30],
  // Pentax
  'Pentax K1000': [1000, 1], 'Pentax KX': [1000, 1], 'Pentax KM': [1000, 1], 'Pentax MX': [1000, 1], 'Pentax ME': A,
  'Pentax ME Super': [2000, 4], 'Pentax LX': [2000, 4], 'Pentax P30': [1000, 1], 'Pentax Program A': [1000, 15], 'Pentax Super A': [2000, 15],
  'Pentax MZ-5': [2000, 30], 'Pentax MZ-3': [4000, 30], 'Pentax MZ-S': [6000, 30], 'Pentax Spotmatic': [1000, 1], 'Pentax Spotmatic F': [1000, 1],
  'Pentax 67': [1000, 1], 'Pentax 67II': [1000, 30], 'Pentax 645': [1000, 15], 'Pentax 645N': [1000, 30],
  // Minolta
  'Minolta X-700': [1000, 4], 'Minolta X-570': [1000, 4], 'Minolta X-370': [1000, 1], 'Minolta X-300': [1000, 1], 'Minolta X-7': A,
  'Minolta XD': [1000, 1], 'Minolta XG-M': [1000, 1], 'Minolta XG-1': [1000, 1], 'Minolta XE': [1000, 4], 'Minolta SR-T 101': [1000, 1],
  'Minolta SR-T 102': [1000, 1], 'Minolta SR-T 201': [1000, 1], 'Minolta Alpha 7': [8000, 30], 'Minolta Alpha 9': [8000, 30],
  'Minolta Maxxum 7000': [2000, 30], 'Minolta CLE': [1000, 1], 'Minolta Hi-Matic 7s': [500, 1], 'Minolta Hi-Matic 7sII': [500, 1],
  // Olympus
  'Olympus OM-1': [1000, 1], 'Olympus OM-1n': [1000, 1], 'Olympus OM-2': [1000, 1], 'Olympus OM-2n': [1000, 1], 'Olympus OM-2SP': [1000, 1],
  'Olympus OM-3': [2000, 1], 'Olympus OM-4': [2000, 1], 'Olympus OM-4Ti': [2000, 1], 'Olympus OM-10': A, 'Olympus OM-20': [1000, 1],
  'Olympus OM-40': [1000, 1], 'Olympus 35 RC': [500, 1 / 15], 'Olympus 35 SP': [500, 1], 'Olympus 35 DC': A, 'Olympus 35 ECR': A,
  'Olympus Pen D': [500, 1], 'Olympus Pen F': [500, 1], 'Olympus Pen FT': [500, 1],
  // Leica
  'Leica IIIf': [1000, 1], 'Leica IIIg': [1000, 1], 'Leica M2': [1000, 1], 'Leica M3': [1000, 1], 'Leica M4': [1000, 1],
  'Leica M4-2': [1000, 1], 'Leica M4-P': [1000, 1], 'Leica M5': [1000, 2], 'Leica M6': [1000, 1], 'Leica M6 TTL': [1000, 1],
  'Leica M7': [1000, 4], 'Leica MP': [1000, 1], 'Leica M-A': [1000, 1], 'Leica CL': [1000, 1 / 2], 'Leica R6.2': [2000, 1],
  // Contax
  'Contax G1': [2000, 1], 'Contax G2': [6000, 4], 'Contax Aria': [4000, 16], 'Contax 139 Quartz': [1000, 8],
  'Contax 167MT': [4000, 4], 'Contax RTS II': [2000, 4], 'Contax ST': [4000, 4],
  // Yashica
  'Yashica FX-3 Super 2000': [2000, 1], 'Yashica FX-D': [1000, 1], 'Yashica FR': [1000, 8], 'Yashica Electro 35 GSN': A,
  'Yashica Electro 35 GT': A, 'Yashica Electro 35 CC': A, 'Yashica Lynx 14E': A, 'Yashica Mat-124G': [500, 1], 'Yashica Mat-124': [500, 1],
  'Yashica D': [500, 1],
  // Ricoh · Konica · Fujifilm
  'Ricoh 500G': [500, 1], 'Ricoh KR-5': [500, 1], 'Ricoh XR-7': [1000, 8],
  'Konica Hexar RF': [4000, 8], 'Konica C35': A, 'Konica Auto S2': [500, 1], 'Konica Autoreflex T3': [1000, 1], 'Konica FS-1': [1000, 2],
  'Fujifilm TX-1': [1000, 8], 'Fujifilm GA645': A, 'Fujifilm GA645Zi': A, 'Fujifilm GS645S': [500, 1], 'Fujifilm GW690': [500, 1],
  'Fujifilm GSW690': [500, 1], 'Fujifilm GW670': [500, 1], 'Fujifilm GF670': [500, 4],
  // Rollei · Voigtländer · Zeiss Ikon · Hasselblad
  'Rollei Rolleiflex 2.8F': [500, 1], 'Rollei Rolleiflex 3.5F': [500, 1], 'Rollei Rolleicord': [500, 1],
  'Rollei Rollei 35': [500, 1 / 2], 'Rollei Rollei 35S': [500, 1 / 2], 'Rollei Rollei 35SE': [500, 1 / 2], 'Rollei Rollei 35T': [500, 1 / 2],
  'Voigtländer Bessa R': [1000, 1], 'Voigtländer Bessa R2': [2000, 1], 'Voigtländer Bessa R2A': [2000, 1], 'Voigtländer Bessa R3A': [2000, 1],
  'Voigtländer Bessa R4A': [2000, 1], 'Voigtländer Bessa-L': [2000, 1],
  'Zeiss Ikon ZM': [2000, 1], 'Zeiss Ikon Contessa': [500, 1],
  'Hasselblad 500C': [500, 1], 'Hasselblad 500C/M': [500, 1], 'Hasselblad 501CM': [500, 1], 'Hasselblad 503CW': [500, 1], 'Hasselblad XPan': [1000, 8],
  // 중형 · 그 밖
  'Mamiya RB67': [400, 1], 'Mamiya RZ67': [400, 8], 'Mamiya 7': [500, 4], 'Mamiya 7II': [500, 4], 'Mamiya 6': [500, 1], 'Mamiya 6MF': [500, 1],
  'Mamiya 645 Pro': [1000, 8], 'Mamiya 645 1000S': [1000, 8], 'Mamiya C330': [500, 1], 'Mamiya C220': [500, 1],
  'Bronica SQ-A': [500, 8], 'Bronica SQ-Ai': [500, 8], 'Bronica ETRS': [500, 8], 'Bronica ETRSi': [500, 8], 'Bronica GS-1': [500, 8],
  'Kiev 88': [1000, 1 / 2], 'Kiev 60': [1000, 1 / 2], 'Plaubel Makina 67': [500, 1], 'Seagull 4A': [300, 1], 'Lomo Lubitel 166': [250, 1 / 15],
  'Holga 120N': A, 'Holga 120CFN': A, 'Lomography Diana F+': A,
  'Zenit E': [500, 1 / 30], 'Zenit ET': [500, 1 / 30], 'Zenit 12XP': [500, 1 / 30],
  'Praktica MTL 3': [1000, 1], 'Praktica MTL 5': [1000, 1], 'Praktica BX20': [1000, 1], 'Chinon CE-4': [1000, 1], 'Cosina CT-1': [1000, 1 / 8],
  'Fujica ST801': [2000, 1], 'FED 2': [500, 1 / 30], 'FED 3': [500, 1], 'FED 5': [500, 1 / 30], 'Zorki 4': [1000, 1],
  'Kodak Retina IIa': [500, 1], 'Kodak Signet 35': [300, 1 / 30],
}
