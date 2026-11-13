// 노출계 화면(prototypes/meter/index.html)을 세 앱에 복사한다. 원본은 이 파일 하나.
//   node scripts/sync-meter.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const html = readFileSync(join(root, 'prototypes/meter/index.html'), 'utf8')
writeFileSync(join(root, 'web/public/meter.html'), html)
// 앱 밖에서 노출계만 따로 열어 보는 시험 페이지 (filmchest.pages.dev/meter-lab, ?go · ?go&pw · ?reset)
writeFileSync(join(root, 'web/public/meter-lab.html'), html)
writeFileSync(join(root, 'App/FilmScan/Resources/meter.html'), html)
writeFileSync(join(root, 'galaxy/src/meterHtml.ts'),
  `// 자동 생성: node scripts/sync-meter.mjs (원본 prototypes/meter/index.html)\nexport const meterHtml = ${JSON.stringify(html)}\n`)
console.log('노출계 화면 복사 완료', html.length, 'bytes')
