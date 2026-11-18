// catalog/films.mjs → 웹(web/src/core/filmData.ts) · iOS(FilmStockCatalogMore.swift)
//   node catalog/generate-films.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { moreFilms } from './films.mjs'
import { searchAliases } from './search-aliases.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const header = '// 자동 생성 파일 — 직접 고치지 말고 catalog/films.mjs를 고친 뒤 `node catalog/generate-films.mjs` 실행\n'
/** 기본 목록에 있는 필름 중 단종된 것 */
const oldDisc = ['fuji-pro-400h'] // C200은 지금도 판매 중

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
// 한글 검색 별칭 (웹·갤럭시 TS, 아이폰 Swift 같은 표)
const aliasPairs = Object.entries(searchAliases).sort((a, b) => b[0].length - a[0].length)
const searchHeader = '// 자동 생성 파일 — 직접 고치지 말고 catalog/search-aliases.mjs를 고친 뒤 `node catalog/generate-films.mjs` 실행\n'
fs.writeFileSync(path.join(root, 'web/src/core/searchAlias.ts'), `${searchHeader}// 한글로 검색해도 찾게 (표시는 영어). 낱말마다: 영어로 바꾼 것 또는 그대로가 칸들 어딘가에 있으면 맞음
const aliases: [string, string][] = ${JSON.stringify(aliasPairs)}

const norm = (s: string) => s.toLowerCase().replace(/[\\s\\-.·/&']+/g, '')
const latin = (s: string) => aliases.reduce((t, [ko, en]) => t.split(ko).join(en), s.toLowerCase())

/** 검색어(한글·영어 섞어도)가 칸들(fields)에 맞는지 */
export function searchMatch(query: string, fields: (string | undefined | null)[]): boolean {
  const words = query.trim().split(/\\s+/).filter(Boolean)
  if (!words.length) return true
  const hay = norm(fields.filter(Boolean).join(' '))
  return words.every((w) => hay.includes(norm(latin(w))) || hay.includes(norm(w)))
}

/** 한글 이름을 영어로 바꾼 검색어 (자동 완성 목록용) */
export const searchLatin = (query: string) => latin(query.trim())
`)
const sq = (v) => JSON.stringify(v)
fs.writeFileSync(path.join(root, 'App/Shared/Model/SearchAlias.swift'), `${searchHeader}import Foundation

/// 한글로 검색해도 찾게 (표시는 영어). 웹 core/searchAlias.ts와 같은 표·같은 규칙
enum SearchAlias {
    static let aliases: [(String, String)] = [
${aliasPairs.map(([k, v]) => `        (${sq(k)}, ${sq(v)}),`).join('\n')}
    ]

    static func norm(_ s: String) -> String {
        s.lowercased().replacingOccurrences(of: "[\\\\s\\\\-.·/&']+", with: "", options: .regularExpression)
    }
    static func latin(_ s: String) -> String {
        aliases.reduce(s.lowercased()) { $0.replacingOccurrences(of: $1.0, with: $1.1) }
    }
    /// 검색어(한글·영어 섞어도)가 칸들에 맞는지
    static func matches(_ query: String, _ fields: [String?]) -> Bool {
        let words = query.split(whereSeparator: { $0.isWhitespace }).map(String.init)
        if words.isEmpty { return true }
        let hay = norm(fields.compactMap { $0 }.joined(separator: " "))
        return words.allSatisfy { hay.contains(norm(latin($0))) || hay.contains(norm($0)) }
    }
}
`)
console.log(`필름 ${moreFilms.length}종 추가 (단종 ${disc.length}), 검색 별칭 ${aliasPairs.length}개`)
