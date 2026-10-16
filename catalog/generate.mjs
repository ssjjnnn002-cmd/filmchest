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
const lensSwift = `${header}import Foundation

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
  `${header}/** 마운트별로 잘 알려진 렌즈 */\nexport const lensData: Record<string, string[]> = ${JSON.stringify(lenses, null, 2)}\n`)
console.log(`렌즈 ${Object.keys(lenses).length}개 마운트 → iOS, 웹`)
