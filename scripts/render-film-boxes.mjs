// 웹 filmBox.ts 그림을 PNG로 뽑아 아이폰(App/FilmScan/Resources/FilmBoxes)·갤럭시(galaxy/assets/canisters)에 넣는다.
//   node scripts/render-film-boxes.mjs   (Chrome 필요)
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const tmp = fs.mkdtempSync('/tmp/filmbox-')
execFileSync(path.join(root, 'web/node_modules/.bin/esbuild'), [path.join(root, 'scripts/filmbox/entry.ts'), '--bundle', '--format=iife', `--outfile=${tmp}/b.js`, '--log-level=error'])
const font = (f) => fs.readFileSync(path.join(root, 'web/public/fonts', f)).toString('base64')
fs.writeFileSync(`${tmp}/p.html`, `<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:'FilmBox Archivo';src:url(data:font/ttf;base64,${font('Archivo.ttf')});font-weight:100 900;font-stretch:62% 125%;font-style:normal}
@font-face{font-family:'FilmBox Archivo';src:url(data:font/ttf;base64,${font('Archivo-Italic.ttf')});font-weight:100 900;font-stretch:62% 125%;font-style:italic}
</style><body><script>${fs.readFileSync(`${tmp}/b.js`, 'utf8')}</script>`)
const dom = execFileSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ['--headless=new', '--disable-gpu', '--virtual-time-budget=30000', '--dump-dom', `file://${tmp}/p.html`], { maxBuffer: 1 << 30 }).toString()
const m = dom.match(/<pre id="out">([\s\S]*?)<\/pre>/)
if (!m) throw new Error('그림을 못 뽑았어요')
const out = JSON.parse(m[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"'))
const ios = path.join(root, 'App/FilmScan/Resources/FilmBoxes')
fs.rmSync(ios, { recursive: true, force: true })
fs.mkdirSync(ios, { recursive: true })
for (const [k, url] of Object.entries(out)) fs.writeFileSync(path.join(ios, `filmbox-${k}.png`), Buffer.from(url.split(',')[1], 'base64'))
console.log(`✓ ${Object.keys(out).length}장`)
