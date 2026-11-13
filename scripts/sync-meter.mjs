// 노출계 화면(prototypes/meter/index.html)을 세 앱에 복사한다. 원본은 이 파일 하나.
//   node scripts/sync-meter.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const html = readFileSync(join(root, 'prototypes/meter/index.html'), 'utf8')
writeFileSync(join(root, 'web/public/meter.html'), html)
// 시험: filmchest.pages.dev/meter.html?go (혼자 열기) · /meter-lab (촬영 중 화면 흉내에서 열기, web/public/meter-lab.html은 따로 손으로 씀)
writeFileSync(join(root, 'App/FilmScan/Resources/meter.html'), html)
writeFileSync(join(root, 'galaxy/src/meterHtml.ts'),
  `// 자동 생성: node scripts/sync-meter.mjs (원본 prototypes/meter/index.html)\nexport const meterHtml = ${JSON.stringify(html)}\n`)
console.log('노출계 화면 복사 완료', html.length, 'bytes')
