import type { BodyStyle } from './types'

/**
 * 3D 기본 모형의 생김새. 인기 기종은 실제 치수·실루엣에 가깝게, 나머지는 형태별 기본형.
 * 단위: cm (몸체 폭, 높이, 깊이 — 렌즈 제외)
 */
export type ModelKind =
  | 'slr' // 펜타프리즘 SLR (AE-1, FM2, X-700 …)
  | 'afslr' // 둥근 AF SLR (F100, EOS …)
  | 'rf' // 레인지파인더 (Leica M, 35 RC …)
  | 'compact' // 똑딱이 (Big Mini, T2, AF600 …)
  | 'clamshell' // 덮개를 미는 형 (mju, XA)
  | 'tlr' // 이안 반사식 (Rolleiflex, Yashica Mat)
  | 'cube' // 핫셀블라드형 (Hasselblad, Bronica SQ)
  | 'rb' // 마미야 RB/RZ
  | 'mf645' // 645 손잡이형
  | 'flattop' // 프리즘 없는 하프 SLR (Pen F)

export interface ModelProfile {
  kind: ModelKind
  body: [number, number, number]
  lensR: number
  lensLen: number
  lensX?: number
  lens?: 'prime' | 'af' | 'small' | 'leica' | 'fixed' | 'mf'
  prism?: 'nikon' | 'canon' | 'om' | 'tall' | 'pointed' | 'f' | 'round'
  shape?: 'box' | 'round' | 'pill'
  flash?: 'left' | 'right' | 'none'
  windows?: 'two' | 'three'
  badge?: 'red' | 'redbutton'
  lever?: boolean
  roundEnds?: boolean
  selenium?: boolean
  grip?: boolean
}

const P = (kind: ModelKind, body: [number, number, number], lensR: number, lensLen: number,
  extra: Partial<ModelProfile> = {}): ModelProfile => ({ kind, body, lensR, lensLen, ...extra })

/** 형태별 기본형 */
export const defaultProfiles: Record<BodyStyle, ModelProfile> = {
  slr: P('slr', [14, 8.8, 5], 2.8, 4.2, { prism: 'nikon', lever: true }),
  rangefinder: P('rf', [13.6, 7.8, 3.6], 2.1, 2.6, { lever: true, lensX: -0.4 }),
  compact: P('compact', [11.8, 6.4, 3.8], 1.5, 1.2, { shape: 'pill', lensX: 0.6 }),
  mediumFormat: P('cube', [8.4, 8.4, 7.2], 3.5, 6.4),
}

// --- 기종별 (소문자, 공백 제거한 "제조사모델")

const slr = (body: [number, number, number], prism: ModelProfile['prism'], extra: Partial<ModelProfile> = {}) =>
  P('slr', body, 2.8, 4.0, { prism, lever: true, ...extra })
const af = (body: [number, number, number], lensR = 3.0, lensLen = 5.6) => P('afslr', body, lensR, lensLen)
const leicaM = (extra: Partial<ModelProfile> = {}) =>
  P('rf', [13.8, 7.7, 3.8], 2.1, 2.5, { lens: 'leica', lever: true, roundEnds: true, lensX: -0.5, ...extra })
const fixedRF = (body: [number, number, number], lensR: number, lensLen: number, extra: Partial<ModelProfile> = {}) =>
  P('rf', body, lensR, lensLen, { lens: 'fixed', windows: 'two', lever: true, lensX: 0, ...extra })
const compact = (body: [number, number, number], shape: ModelProfile['shape'], lensR: number, lensLen: number, extra: Partial<ModelProfile> = {}) =>
  P('compact', body, lensR, lensLen, { shape, lensX: 0.6, ...extra })

const byModel: [string[], ModelProfile][] = [
  // --- 수동 SLR
  [['nikonfm', 'nikonfm2', 'nikonfm3a', 'nikonfe', 'nikonfe2', 'nikonfa', 'nikonfm10', 'nikonfe10', 'nikonem', 'nikonfg', 'nikonfg-20'],
    slr([14.2, 8.9, 5.0], 'nikon')],
  [['nikonnikkormatft2', 'nikonnikkormatftn'], slr([14.8, 9.6, 5.4], 'pointed')],
  [['nikonf', 'nikonf2'], slr([14.8, 9.8, 5.4], 'f')],
  [['nikonf3'], slr([14.8, 9.6, 5.6], 'tall', { lever: true })],
  [['canonae-1', 'canonae-1program', 'canona-1', 'canonav-1', 'canonat-1', 'canonal-1'], slr([14.1, 8.7, 4.8], 'canon')],
  [['canonftb'], slr([14.4, 9.3, 4.4], 'pointed')],
  [['canonf-1', 'canonnewf-1'], slr([14.7, 9.9, 4.8], 'tall')],
  [['olympusom-1', 'olympusom-1n', 'olympusom-2', 'olympusom-2n', 'olympusom-2sp', 'olympusom-3', 'olympusom-4', 'olympusom-4ti',
    'olympusom-10', 'olympusom-20', 'olympusom-40'], slr([13.6, 8.3, 5.0], 'om', { lens: 'prime' })],
  [['pentaxk1000', 'pentaxkx', 'pentaxkm', 'pentaxspotmatic', 'pentaxspotmaticf'], slr([14.3, 9.2, 4.8], 'pointed')],
  [['pentaxmx', 'pentaxme', 'pentaxmesuper', 'pentaxlx', 'pentaxsupera', 'pentaxprograma'], slr([13.1, 8.3, 4.9], 'om')],
  [['minoltax-700', 'minoltax-570', 'minoltax-370', 'minoltax-300', 'minoltaxd', 'minoltaxg-m', 'minoltaxg-1', 'minoltaxe'],
    slr([13.6, 8.9, 5.1], 'canon')],
  [['minoltasr-t101', 'minoltasr-t102', 'minoltasr-t201'], slr([14.8, 9.3, 4.8], 'pointed')],
  [['zenite', 'zenitet', 'zenit12xp'], slr([14.2, 10.0, 5.0], 'pointed')],
  [['prakticamtl3', 'prakticamtl5', 'prakticabx20'], slr([14.3, 9.4, 4.8], 'pointed')],
  [['contaxrtsii', 'contax167mt', 'contaxaria', 'contax139quartz', 'contaxst', 'leicar6.2'], slr([14.2, 9.2, 5.0], 'tall')],
  [['yashicafx-3super2000', 'yashicafx-d', 'yashicafr', 'ricohkr-5', 'ricohxr-7', 'chinonce-4', 'cosinact-1', 'fujicast801',
    'konicaautoreflext3', 'konicafs-1'], slr([13.8, 8.8, 4.8], 'nikon')],
  [['kiev60'], slr([18.6, 15.0, 8.0], 'canon', { lens: 'mf', grip: true })],
  [['pentax67', 'pentax67ii'], P('slr', [18.4, 15.0, 7.4], 4.0, 6.0, { prism: 'canon', lens: 'mf', lever: true, grip: true })],

  // --- AF SLR
  [['nikonf100', 'nikonf5', 'nikonf6', 'canoneos-1v', 'canoneos-1n', 'canoneos3', 'nikonf4'], af([15.6, 11.2, 7.0], 3.2, 6.2)],
  [['nikonf90x', 'nikonf-801', 'nikonf-601', 'nikonf-501', 'canont90', 'canoneos5', 'canoneos650', 'canoneos620', 'minoltaalpha7',
    'minoltaalpha9', 'minoltamaxxum7000', 'minoltax-7'], af([15.0, 10.4, 6.8])],
  [['nikonf80', 'nikonf75', 'nikonf65', 'nikonf55', 'nikonf-401', 'nikonf-301', 'canoneos30', 'canoneos300', 'canoneos300v',
    'canoneos500n', 'canont70', 'canont50', 'pentaxmz-5', 'pentaxmz-3', 'pentaxmz-s', 'pentaxp30'], af([14.1, 9.6, 6.6], 2.9, 5.0)],

  // --- 레인지파인더
  [['leicam6', 'leicam6ttl', 'leicam7', 'leicam4-p', 'leicam4-2', 'leicam5'], leicaM({ badge: 'red' })],
  [['leicam2', 'leicam3', 'leicam4', 'leicamp', 'leicam-a'], leicaM()],
  [['minoltacle', 'leicacl'], P('rf', [12.1, 7.6, 3.2], 2.0, 2.4, { lens: 'leica', lever: true, roundEnds: true, lensX: -0.3 })],
  [['konicahexarrf', 'zeissikonzm', 'voigtländerbessar2', 'voigtländerbessar2a', 'voigtländerbessar3a', 'voigtländerbessar4a',
    'voigtländerbessar', 'voigtländerbessa-l'], P('rf', [13.6, 8.0, 3.6], 2.1, 2.5, { lens: 'leica', lever: true, lensX: -0.4, windows: 'two' })],
  [['leicaiiif', 'leicaiiig', 'fed2', 'fed3', 'zorki4'], P('rf', [13.4, 6.8, 3.3], 1.8, 2.2, { lens: 'small', roundEnds: true, lensX: 0, windows: 'two' })],
  [['fed5', 'canonp', 'canon7'], P('rf', [14.2, 8.2, 3.6], 2.0, 2.6, { lens: 'small', lever: true, lensX: 0, windows: 'two' })],
  [['contaxg1', 'contaxg2'], P('rf', [13.9, 8.0, 4.0], 2.2, 2.6, { lens: 'small', grip: true, lensX: -0.6, windows: 'two' })],
  [['hasselbladxpan', 'fujifilmtx-1'], P('rf', [16.5, 8.0, 4.4], 2.4, 3.2, { lens: 'small', grip: true, windows: 'two' })],
  [['olympus35rc', 'olympus35sp', 'olympus35dc', 'olympus35ecr'], fixedRF([11.3, 7.0, 4.2], 2.2, 2.2)],
  [['canoncanonetql17giii', 'canoncanonetql19', 'minoltahi-matic7s', 'minoltahi-matic7sii', 'konicac35', 'konicaautos2',
    'yashicalynx14e', 'ricoh500g', 'kodaksignet35'], fixedRF([12.0, 7.5, 4.2], 2.3, 2.6)],
  [['yashicaelectro35gsn', 'yashicaelectro35gt', 'yashicaelectro35cc'], fixedRF([14.0, 8.7, 4.4], 2.6, 3.0)],
  [['olympustrip35'], fixedRF([12.2, 7.2, 4.4], 2.0, 2.0, { selenium: true, lever: false })],
  [['zeissikoncontessa', 'kodakretinaiia'], fixedRF([12.4, 8.0, 4.0], 1.9, 2.4, { lever: false })],
  [['mamiya7', 'mamiya7ii'], P('rf', [15.9, 11.2, 6.0], 2.8, 3.8, { lens: 'small', grip: true, lever: true, lensX: -0.4, windows: 'two' })],
  [['mamiya6', 'mamiya6mf'], P('rf', [16.6, 11.0, 6.2], 2.9, 2.2, { lens: 'small', grip: true, lensX: -0.4, windows: 'two' })],
  [['fujifilmgw690', 'fujifilmgw670', 'fujifilmgf670', 'fujifilmgsw690'], fixedRF([18.2, 12.0, 8.0], 3.0, 4.4, { grip: true })],
  [['plaubelmakina67'], fixedRF([16.6, 10.8, 5.8], 3.0, 2.2, { lever: false })],

  // --- 하프 SLR
  [['olympuspenf', 'olympuspenft'], P('flattop', [12.4, 7.0, 3.6], 2.0, 2.6, { lens: 'small', lever: true, lensX: -0.6 })],

  // --- 똑딱이 (일체형 렌즈)
  [['contaxt2'], compact([11.9, 6.7, 3.3], 'box', 1.6, 2.4, { lensX: 0.2, flash: 'left' })],
  [['contaxt3', 'contaxt', 'yashicat5', 'yashicat4', 'yashicat3', 'yashicat2'], compact([10.5, 6.3, 3.2], 'pill', 1.4, 1.2, { lensX: 0.5 })],
  [['contaxtvs', 'contaxtvsii', 'contaxtvsiii', 'nikon28ti', 'nikon35ti'], compact([11.8, 6.5, 3.8], 'box', 1.7, 2.0, { lensX: 0.4 })],
  [['leicaminilux', 'leicacm', 'leicamini', 'leicaminiii', 'leicac2', 'leicaz2x', 'minoltatc-1', 'ricohr1', 'ricohr1s'],
    compact([11.8, 6.4, 3.4], 'box', 1.5, 1.6, { lensX: 0.6 })],
  [['ricohgr1', 'ricohgr1s', 'ricohgr1v', 'ricohgr10', 'ricohgr21'], compact([11.7, 6.1, 2.7], 'box', 1.3, 0.8, { grip: true, lensX: 0.9 })],
  [['nikonaf600', 'nikonlitetouchzoom70w', 'nikonzoom300'], compact([11.7, 6.3, 3.8], 'pill', 1.4, 1.0, { lensX: 0.4, flash: 'right' })],
  [['konicabigmini', 'konicabigminibm-301', 'konicabigminibm-302'], compact([11.3, 6.4, 3.2], 'round', 1.4, 1.0, { lensX: 0.9, flash: 'left' })],
  [['konicahexaraf'], compact([13.0, 7.3, 4.6], 'box', 2.2, 2.2, { lensX: 0.6, flash: 'none' })],
  [['fujifilmklassew', 'fujifilmklasses', 'fujifilmklasse', 'fujifilmtiara', 'fujifilmtiaraii', 'fujifilmnaturaclassica',
    'fujifilmnaturablack', 'fujifilmsilvif2.8', 'fujifilmcardiamini', 'fujifilmdlsupermini', 'pentaxespiomini', 'minoltarivamini',
    'canonprimamini', 'canonprimaminiii'], compact([11.7, 6.3, 3.8], 'pill', 1.4, 1.2, { lensX: 0.6 })],
  [['nikonl35af', 'nikonl35af2', 'nikonl35ad', 'nikonl35aw', 'nikonaf230', 'canonaf35m', 'canonaf35mii', 'canonaf35ml',
    'canonautoboy3', 'canonautoboyluna', 'pentaxpc35af', 'pentaxpc35af-m', 'konicac35af', 'konicapop', 'minoltahi-maticaf2',
    'olympusaf-1', 'olympusaf-10', 'yashicapartner', 'ricohff-1', 'ricohff-9', 'ricohyf-20', 'agfaoptima', 'canonsnappy'],
    compact([13.0, 7.5, 5.0], 'box', 1.9, 1.6, { lensX: 0.4 })],
  [['canonprimasuper105', 'pentaxzoom60', 'minoltarivazoom70', 'konicaz-up80', 'konicalexio70', 'fujifilmzoomdate90', 'nikontwzoom'],
    compact([12.4, 7.0, 5.0], 'pill', 1.7, 2.2, { lensX: 0.5 })],
  [['lomographylc-a', 'lomographylc-a+', 'lomographylc-wide'], compact([10.7, 6.8, 4.3], 'box', 1.4, 0.8, { lensX: 0, flash: 'none' })],
  [['rolleirollei35', 'rolleirollei35s', 'rolleirollei35se', 'rolleirollei35t'], compact([9.7, 6.0, 3.2], 'box', 1.5, 2.2, { lensX: 0, flash: 'none' })],
  [['rolleipregomicron'], compact([11.4, 6.2, 3.6], 'pill', 1.4, 1.2, { lensX: 0.5 })],
  [['kodakm35', 'kodakm38', 'kodakfunsaver', 'lomographysimpleuse', 'vivitarultrawide&slim', 'ilfordsprite35-ii',
    'ilfordilfocolorrapidretro', 'agfaphotolebox', 'superheadzblackslimdevil', 'halina35x', 'fujifilmquicksnap'],
    compact([11.6, 6.2, 3.4], 'box', 1.1, 0.5, { lensX: 0 })],
  [['lomographysprocketrocket'], compact([17, 8.4, 6.6], 'box', 2.6, 1.6, { lensX: 0, flash: 'none' })],
  [['pentax17'], compact([11.8, 7.5, 4.6], 'box', 1.6, 1.4, { lever: true, lensX: 0, flash: 'none' })],
  [['kodakektarh35', 'kodakektarh35n'], compact([11.0, 6.4, 3.8], 'box', 1.3, 0.8, { lensX: 0, flash: 'right' })],
  [['olympuspenee-2', 'olympuspenee-3', 'olympuspenee-s', 'olympuspend', 'canondemiee17', 'konicarecorder'],
    compact([10.8, 6.7, 3.6], 'box', 1.5, 1.4, { selenium: true, lensX: 0, flash: 'none' })],
  [['yashicasamuraix3.0'], P('slr', [9.2, 13.4, 9.0], 2.8, 5.0, { prism: 'round', lens: 'af' })],
  [['holga120n', 'holga120cfn', 'lomographydianaf+'], compact([13.6, 9.6, 7.6], 'box', 3.0, 2.6, { lensX: 0, flash: 'none' })],
  [['fujifilmga645', 'fujifilmga645zi', 'fujifilmgs645s'], compact([13.0, 9.6, 6.8], 'box', 2.6, 3.2, { lensX: 0.4 })],

  // --- 미는 덮개형
  [['olympusmju', 'olympusmju-ii'], P('clamshell', [10.8, 5.9, 3.5], 1.1, 0.4, { lensX: 2.0 })],
  [['olympusmjuzoom', 'olympusmju-iizoom80'], P('clamshell', [11.8, 6.4, 4.2], 1.4, 0.8, { lensX: 2.0 })],
  [['olympusxa'], P('clamshell', [10.2, 6.5, 4.0], 1.1, 0.4, { shape: 'box', lensX: 1.4, badge: 'redbutton' })],
  [['olympusxa2', 'olympusxa3', 'olympusxa4'], P('clamshell', [10.2, 6.5, 4.0], 1.1, 0.4, { shape: 'box', lensX: 1.4 })],

  // --- 중형
  [['rolleirolleiflex2.8f', 'rolleirolleiflex3.5f', 'rolleirolleicord', 'yashicamat-124g', 'yashicamat-124', 'yashicad',
    'seagull4a', 'lomolubitel166'], P('tlr', [9.8, 14.4, 9.0], 2.5, 2.6)],
  [['mamiyac330', 'mamiyac220'], P('tlr', [11.0, 15.0, 10.0], 2.8, 3.6)],
  [['hasselblad500c', 'hasselblad500c/m', 'hasselblad501cm', 'hasselblad503cw', 'kiev88'], P('cube', [8.5, 8.5, 7.0], 3.4, 6.2)],
  [['bronicasq-a', 'bronicasq-ai'], P('cube', [9.0, 9.2, 7.4], 3.5, 6.4)],
  [['bronicags-1'], P('cube', [10.0, 10.0, 8.6], 3.9, 6.8)],
  [['mamiyarb67', 'mamiyarz67'], P('rb', [11, 12, 12], 4.2, 7.5)],
  [['pentax645', 'pentax645n', 'mamiya645pro', 'mamiya6451000s', 'bronicaetrs', 'bronicaetrsi'], P('mf645', [14.6, 10.8, 9.8], 3.4, 5.6)],
]

const key = (brand: string, model: string) => `${brand}${model}`.toLowerCase().replace(/\s+/g, '')

export function profileFor(brand: string, model: string, style: BodyStyle): ModelProfile {
  const k = key(brand, model)
  const found = byModel.find(([keys]) => keys.includes(k))
  return found ? found[1] : defaultProfiles[style]
}

export const profileKey = (p: ModelProfile) => JSON.stringify(p)

/** 같은 모형이면 항상 같은 짧은 이름. 구워 둔 그림 파일을 찾을 때 쓴다. */
export function modelHash(p: ModelProfile) {
  const s = profileKey(p)
  let h = 5381
  for (let i = 0; i < s.length; i++) h = Math.imul(h, 33) + s.charCodeAt(i)
  return (h >>> 0).toString(16)
}
