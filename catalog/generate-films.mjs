// catalog/films.mjs → 웹(web/src/core/filmData.ts) · iOS(FilmStockCatalogMore.swift)
//   node catalog/generate-films.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { moreFilms } from './films.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const header = '// 자동 생성 파일 — 직접 고치지 말고 catalog/films.mjs를 고친 뒤 `node catalog/generate-films.mjs` 실행\n'
/** 기본 목록에 있는 필름 중 단종된 것 */
const oldDisc = ['fuji-pro-400h', 'fuji-c200']

const fmt = { '35': ['135'], '120': ['120-66'], both: ['135', '120-66'], sheets: ['135', '120-66', 'sheet-45', 'sheet-810'], '110': ['110'] }
const proc = new Set(['C-41', 'B&W', 'E-6', 'ECN-2', 'instant'])
const seen = new Set()
for (const f of moreFilms) {
  const [id, , , iso, p, formats, style] = f
  if (seen.has(id)) throw new Error(`중복: ${id}`)
  seen.add(id)
  if (!proc.has(p) || !fmt[formats] || style.length < 4 || !(iso > 0)) throw new Error(`값 오류: ${id}`)
}
const disc = [...oldDisc, ...moreFilms.filter((f) => f[7]).map((f) => f[0])]

// 웹
const ts = `${header}import type { FilmFormat, FilmProcess } from './types'

/** [id, 브랜드, 이름, ISO, 현상, 규격, [바탕, 띠, 글자, 띠 글자, 뚜껑?]] */
export const moreFilmRows: [string, string, string, number, FilmProcess, FilmFormat[], string[]][] = [
${moreFilms.map(([id, b, n, iso, p, f, s]) => `  ${JSON.stringify([id, b, n, iso, p, fmt[f], s])},`).join('\n')}
]

/** 단종됐지만 기한 지난 재고로 아직 구할 수 있는 필름 */
export const discontinuedFilmIds = new Set<string>(${JSON.stringify(disc)})
`
fs.writeFileSync(path.join(root, 'web/src/core/filmData.ts'), ts)

// iOS
const sw = { '135': '.f135', '120-66': '.f120_66', 'sheet-45': '.sheet45', 'sheet-810': '.sheet810', '110': '.f110' }
const sp = { 'C-41': '.c41', 'B&W': '.bw', 'E-6': '.e6', 'ECN-2': '.ecn2', instant: '.instant' }
const q = (v) => JSON.stringify(v)
const swift = `${header}import Foundation

extension FilmStockCatalog {
    /// 기본 목록에 더하는 필름 (지금 판매 + 단종됐지만 구할 수 있는 필름)
    static let more: [FilmStock] = [
${moreFilms.map(([id, b, n, iso, p, f, s]) => `        FilmStock(id: ${q(id)}, brand: ${q(b)}, name: ${q(n)}, iso: ${iso}, process: ${sp[p]}, formats: [${fmt[f].map((x) => sw[x]).join(', ')}],
                  style: CanisterStyle(body: ${q(s[0])}, band: ${q(s[1])}, text: ${q(s[2])}, bandText: ${q(s[3])}${s[4] ? `, cap: ${q(s[4])}` : ''})),`).join('\n')}
    ]

    /// 단종됐지만 기한 지난 재고로 아직 구할 수 있는 필름
    public static let discontinuedIDs: Set<String> = [${disc.map(q).join(', ')}]
}

extension FilmStock {
    /// 단종 필름 (목록에 '단종'으로 작게 표시)
    public var isDiscontinued: Bool { FilmStockCatalog.discontinuedIDs.contains(id) }
}
`
fs.writeFileSync(path.join(root, 'Packages/FilmScanCore/Sources/FilmScanCore/FilmStockCatalogMore.swift'), swift)
console.log(`필름 ${moreFilms.length}종 추가 (단종 ${disc.length})`)
