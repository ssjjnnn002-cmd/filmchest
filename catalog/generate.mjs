// catalog/cameras.mjs → iOS(Swift) / 웹(TS) 카메라 목록 생성
//   node catalog/generate.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { cameras } from './cameras.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const header = '// 자동 생성 파일 — 직접 고치지 말고 catalog/cameras.mjs를 고친 뒤 `node catalog/generate.mjs` 실행\n'

// 검증: 형태/포맷 값, 마운트와 렌즈 동시 지정, 중복
const styles = new Set(['slr', 'rangefinder', 'compact', 'mediumFormat'])
const formats = new Set(['135', '135-half', '120-645', '120-66', '120-67', '120-69'])
const seen = new Set()
for (const c of cameras) {
  const key = `${c.brand}${c.model}`.toLowerCase().replace(/\s+/g, '')
  if (seen.has(key)) throw new Error(`중복: ${c.brand} ${c.model}`)
  seen.add(key)
  if (!styles.has(c.style)) throw new Error(`형태 오류: ${c.brand} ${c.model}`)
  if (c.f && !formats.has(c.f)) throw new Error(`포맷 오류: ${c.brand} ${c.model}`)
  if (c.m && c.l) throw new Error(`마운트와 렌즈를 같이 적음: ${c.brand} ${c.model}`)
}

// --- Swift
const swiftFormat = { '135': '.f135', '135-half': '.halfFrame', '120-645': '.f120_645', '120-66': '.f120_66', '120-67': '.f120_67', '120-69': '.f120_69' }
const s = (v) => (v === undefined ? 'nil' : JSON.stringify(v))
const swiftRows = cameras.map((c) =>
  `        CatalogCamera(brand: ${s(c.brand)}, model: ${s(c.model)}, style: .${c.style}, format: ${swiftFormat[c.f ?? '135']}, ` +
  `mount: ${s(c.m)}, lens: ${s(c.l)}, battery: ${s(c.b)}, aka: ${JSON.stringify(c.aka ?? [])}),`)
const swift = `${header}import FilmScanCore

extension CameraCatalog {
    /// 카메라 ${cameras.length}종
    static let all: [CatalogCamera] = [
${swiftRows.join('\n')}
    ]
}
`
fs.writeFileSync(path.join(root, 'App/Shared/Model/CameraCatalogData.swift'), swift)

// --- TS
const tsRows = cameras.map((c) => {
  const o = { brand: c.brand, model: c.model, style: c.style, format: c.f ?? '135' }
  if (c.m) o.mount = c.m
  if (c.l) o.lens = c.l
  if (c.b) o.battery = c.b
  if (c.aka?.length) o.aka = c.aka
  return `  ${JSON.stringify(o)},`
})
const ts = `${header}import type { CatalogCamera } from './cameras'

/** 카메라 ${cameras.length}종 */
export const catalogData: CatalogCamera[] = [
${tsRows.join('\n')}
]
`
fs.writeFileSync(path.join(root, 'web/src/core/cameraData.ts'), ts)
console.log(`카메라 ${cameras.length}종 → iOS, 웹`)

// --- 렌즈 목록
const { lenses } = await import('./lenses.mjs')
const lensHeader = '// 자동 생성 파일 — 직접 고치지 말고 catalog/lenses.mjs를 고친 뒤 `node catalog/generate.mjs` 실행\n'
for (const [mount, list] of Object.entries(lenses)) {
  const seenLens = new Set()
  for (const name of list) {
    if (seenLens.has(name)) throw new Error(`중복 렌즈: ${mount} / ${name}`)
    seenLens.add(name)
  }
}
const lensSwift = `${lensHeader}import Foundation

/// 마운트별로 잘 알려진 렌즈 (렌즈 입력 추천용)
enum LensCatalog {
    static let byMount: [String: [String]] = [
${Object.entries(lenses).map(([m, l]) => `        ${JSON.stringify(m)}: ${JSON.stringify(l)},`).join('\n')}
    ]

    /// 마운트 이름은 대소문자를 가리지 않는다. text가 있으면 그 글자가 들어간 렌즈만.
    static func lenses(for mount: String?, matching text: String = "") -> [String] {
        guard let mount, let key = byMount.keys.first(where: { $0.caseInsensitiveCompare(mount) == .orderedSame }) else { return [] }
        let q = text.lowercased().replacingOccurrences(of: " ", with: "")
        let list = byMount[key] ?? []
        return q.isEmpty ? list : list.filter { $0.lowercased().replacingOccurrences(of: " ", with: "").contains(q) }
    }
}
`
fs.writeFileSync(path.join(root, 'App/Shared/Model/LensCatalogData.swift'), lensSwift)
fs.writeFileSync(path.join(root, 'web/src/core/lensData.ts'),
  `${lensHeader}/** 마운트별로 잘 알려진 렌즈 */\nexport const lensData: Record<string, string[]> = ${JSON.stringify(lenses, null, 2)}\n`)
const lensCount = Object.values(lenses).reduce((n, list) => n + list.length, 0)
console.log(`렌즈 ${lensCount}개 · 마운트 ${Object.keys(lenses).length}개 → iOS, 웹`)

// --- 렌즈 실측 (웹 3D 모형)
const { lensSpecs } = await import('./lensSpecs.mjs')
const knownNames = new Set(Object.values(lenses).flat())
for (const name of Object.keys(lensSpecs)) {
  if (!knownNames.has(name)) throw new Error(`사양 이름이 목록에 없음: ${name}`)
}
const specHeader = '// 자동 생성 파일 — 직접 고치지 말고 catalog/lensSpecs.mjs를 고친 뒤 `node catalog/generate.mjs` 실행\n'
const specBody = `import { parseLens } from './optics'

export interface LensSpec {
  /** 마운트 면에서 앞테까지, mm */
  lengthMm: number
  /** 경통 바깥 지름, mm */
  diameterMm: number
  /** 필터 나사, mm */
  frontMm: number
  finish: 'black' | 'silver' | 'chrome-nose'
  focusRing: 'rubber-grid' | 'rubber-ribbed' | 'metal-scalloped' | 'metal-knurled' | 'thin-af'
  apertureRing: boolean
  hood: 'none' | 'built-in' | 'round' | 'petal'
  zoom: boolean
  /** 거리계 렌즈의 초점 손잡이 */
  focusTab?: boolean
}

const table: Record<string, LensSpec> = ${JSON.stringify(lensSpecs, null, 2)}

function norm(value: string) {
  return value.toLowerCase().replace(/\\s+/g, '')
}

const SKIP = new Set(['the', 'lens', 'auto', 'smc', 'super', 'multi', 'coated', 'new', 'series'])

function tokens(value: string) {
  return value.toLowerCase()
    .replace(/voigtländer/g, 'voigtlander')
    .replace(/[^a-z0-9./+]+/g, ' ')
    .split(' ')
    .filter((token) => token && !SKIP.has(token))
}

/** 마운트와 이름이 같은 계열이면 가산. 같은 화각이 여러 마운트에 있을 때 골라 쓴다. */
function affinity(name: string, mount: string) {
  const n = name.toLowerCase()
  const m = mount.toLowerCase()
  if (m.includes('nikon') && /nikkor|series e/.test(n)) return 8
  if (m.includes('canon fd') && /new fd|\\bfd\\b|\\bfl\\b/.test(n)) return 8
  if (m.includes('canon ef') && /\\bef\\b/.test(n)) return 8
  if (m === 'leica m' && /-m\\b|voigt|summi|elmar|hexanon|m-rokkor|biogon|planar|sonnar/.test(n)) return 6
  if ((m.includes('l39') || m.includes('ltm')) && /ltm|jupiter|industar|summitar|elmar|summar|canon|w-nikkor|nikkor/.test(n)) return 6
  if (m.includes('pentax') && /pentax|takumar/.test(n)) return 6
  if (m.includes('olympus') && /zuiko/.test(n)) return 6
  if (m.includes('minolta') && /rokkor|\\bmd\\b|\\bmc\\b|\\baf\\b/.test(n)) return 5
  if (m === 'm42' && /takumar|helios|jupiter|jena|pancolar|flektogon|industar|pentacon|biotar|orest|mir-/.test(n)) return 6
  if (m.includes('contax g') && /planar|biogon|sonnar|hologon|vario/.test(n)) return 6
  if ((m.includes('yashica') || m.includes('contax/')) && /yashica|planar|distagon|tessar|sonnar|makro/.test(n)) return 4
  if (m.includes('hasselblad') && /planar|distagon|sonnar|tessar|\\bcf\\b|\\bc\\b/.test(n)) return 4
  if (m.includes('mamiya') && /sekor|k\\/l|\\bn\\b|\\bg\\b/.test(n)) return 4
  if (m.includes('bronica') && /zenzanon/.test(n)) return 6
  if (m.includes('konica') && /hexanon/.test(n)) return 6
  if (m.includes('leica r') && /-r\\b/.test(n)) return 6
  return 0
}

const FILTERS = [39, 40.5, 43, 46, 49, 52, 55, 58, 62, 67, 72, 77, 82, 86, 95]

function nearestFilter(diameter: number) {
  const want = diameter * 0.82
  return FILTERS.reduce((best, size) => (Math.abs(size - want) < Math.abs(best - want) ? size : best), FILTERS[0])
}

function estimateLens(brand: string, model: string, mount = ''): LensSpec {
  const parsed = parseLens(\`\${brand} \${model}\`)
  const name = \`\${brand} \${model}\`.toLowerCase()
  const m = mount.toLowerCase()
  const focal = parsed.focalMax || parsed.focalMin || 50
  const wide = parsed.focalMin || focal
  const open = Number(String(parsed.open).split(/[–-]/)[0]) || 2.8
  const zoom = parsed.zoom
  const mediumSLR = /hasselblad|pentax 67|pentax 645|bronica|kiev|pentacon six|mamiya rb|mamiya rz|mamiya 645|mamiya c/.test(m)
  const mediumRF = /mamiya 7|mamiya 6|xpan/.test(m)
  const compact = /leica m$|leica l39|\\bl39\\b|contax g|pen f/.test(m)
  const af = /canon ef|minolta a|contax g/.test(m) || /\\baf\\b|af-s|af-d|\\busm\\b|\\bstm\\b|pentax-f/.test(name)

  let length = 46
  let diameter = 64
  if (zoom) {
    length = 48 + focal * 0.42 + (focal - wide) * 0.2 + (open <= 2.8 ? 16 : 0)
    diameter = (compact ? 58 : mediumSLR ? 84 : 68) + (open <= 2.8 ? 6 : 0)
  } else if (mediumSLR) {
    length = 42 + focal * 0.32 + Math.max(0, 2.8 - open) * 6
    diameter = 80 + Math.max(0, 2.8 - open) * 4
  } else if (mediumRF) {
    length = 36 + focal * 0.28
    diameter = 68
  } else if (compact) {
    length = 16 + focal * 0.48 + Math.max(0, 2 - open) * 8
    diameter = 51 + Math.max(0, 2 - open) * 5
  } else if (focal < 35) {
    length = 46 + (35 - focal) * 0.35 + Math.max(0, 2.8 - open) * 4
    diameter = 63 + Math.max(0, 2.8 - open) * 3
  } else if (focal > 85) {
    length = 28 + focal * 0.55
    diameter = 66 + Math.min(18, (focal - 85) * 0.08)
  } else {
    length = 24 + focal * 0.42 + Math.max(0, 2.2 - open) * 10
    diameter = 62 + Math.max(0, 2 - open) * 6
  }
  length = Math.round(Math.min(190, Math.max(22, length)))
  diameter = Math.round(Math.min(110, Math.max(48, diameter)))

  let finish: LensSpec['finish'] = 'black'
  if (compact && !/asph|apo|noctilux/.test(name)) finish = focal <= 50 ? 'chrome-nose' : 'silver'
  if (/silver|chrome/.test(name)) finish = 'silver'
  if (/super-takumar|auto-takumar|biotar|tessar 50/.test(name)) finish = 'silver'

  let focusRing: LensSpec['focusRing'] = 'rubber-ribbed'
  if (af) focusRing = 'thin-af'
  else if (/series e/.test(name)) focusRing = 'rubber-grid'
  else if (/takumar|\\belmar\\b|summar/.test(name)) focusRing = 'metal-scalloped'
  else if (compact || /helios|jupiter|industar|biotar|pancolar|flektogon/.test(name)) focusRing = 'metal-knurled'

  const nikonG = /nikkor|nikon/.test(name + ' ' + m) && /af-s|\\bf\\/\\d+(?:\\.\\d+)?g\\b|\\bg\\b/.test(name) && !/\\baf\\b.*\\bd\\b|\\bd\\b/.test(name)
  const apertureRing = !(/canon ef|minolta a|contax g/.test(m) || /^ef\\b/.test(model.toLowerCase()) || nikonG)

  let hood: LensSpec['hood'] = 'none'
  if (!zoom && wide < 24) hood = 'built-in'
  else if (zoom && wide < 36) hood = 'petal'
  else if (!zoom && focal >= 100) hood = 'round'

  const spec: LensSpec = {
    lengthMm: length,
    diameterMm: diameter,
    frontMm: nearestFilter(diameter),
    finish,
    focusRing,
    apertureRing,
    hood,
    zoom,
  }
  if (!zoom && compact && focal <= 50 && !af) spec.focusTab = true
  return spec
}

/** 카탈로그 이름에 가깝게 맞추고, 없으면 화각·마운트로 추정한다. */
export function lensSpec(brand = '', model = '', mount = ''): LensSpec {
  const query = \`\${brand} \${model}\`.trim()
  if (!query) return estimateLens('', '50mm f/1.8', mount)
  const modelNorm = norm(model)
  const queryNorm = norm(query)
  const queryTokens = tokens(query)
  let best: LensSpec | undefined
  let bestScore = 0
  for (const [name, spec] of Object.entries(table)) {
    const nameNorm = norm(name)
    if (nameNorm === queryNorm || (modelNorm && nameNorm === modelNorm)) return { ...spec }
    const nameTokens = tokens(name)
    const brandTokens = new Set(tokens(brand))
    const wordQuery = queryTokens.filter((token) => !brandTokens.has(token) && !/^\\d+(?:-\\d+)?mm$/.test(token) && !/^f\\/\\d/.test(token))
    if (wordQuery.length && !wordQuery.some((token) => nameTokens.includes(token))) continue
    const focalQuery = queryTokens.find((token) => /^\\d+(?:-\\d+)?mm$/.test(token))
    const focalName = nameTokens.find((token) => /^\\d+(?:-\\d+)?mm$/.test(token))
    if (focalQuery && focalName && focalQuery !== focalName) continue
    const apertureQuery = queryTokens.find((token) => /^f\\/\\d/.test(token))
    const apertureName = nameTokens.find((token) => /^f\\/\\d/.test(token))
    if (apertureQuery && apertureName && apertureQuery !== apertureName) continue
    let shared = 0
    for (const token of queryTokens) if (nameTokens.includes(token)) shared++
    if (shared < 2) continue
    const extra = Math.max(0, nameTokens.length - shared)
    const score = shared * 10 - extra * 3 + affinity(name, mount) + (modelNorm.length > 5 && nameNorm.includes(modelNorm) ? 25 : 0)
    if (score > bestScore) {
      bestScore = score
      best = spec
    }
  }
  if (best && bestScore >= 18) return { ...best }
  return estimateLens(brand, model, mount)
}
`
fs.writeFileSync(path.join(root, 'web/src/core/lensSpecs.ts'), specHeader + specBody)
console.log(`렌즈 실측 ${Object.keys(lensSpecs).length}개 → 웹`)
