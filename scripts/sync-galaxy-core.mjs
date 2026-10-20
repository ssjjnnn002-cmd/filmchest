// 웹앱(web/src/core)의 순수 로직 파일을 갤럭시(galaxy/src/core)로 그대로 복사한다.
// 갤럭시는 웹앱과 똑같이 동작해야 해서, 화면에 쓰는 데이터 규칙은 웹 파일 하나만 고친다.
//   node scripts/sync-galaxy-core.mjs
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const from = join(root, 'web/src/core'), to = join(root, 'galaxy/src/core')
mkdirSync(to, { recursive: true })
// 브라우저 기능을 쓰지 않는 파일만 (그 밖의 파일은 갤럭시 쪽에서 같은 동작으로 따로 맞춘다)
const files = ['features', 'films', 'cameras', 'cameraData', 'lenses', 'lensData', 'timeline', 'profiles', 'exif', 'meter', 'frameCaption', 'framePrint']
for (const f of files) {
  const src = readFileSync(join(from, `${f}.ts`), 'utf8')
  writeFileSync(join(to, `${f}.ts`), `// 자동 복사: web/src/core/${f}.ts (node scripts/sync-galaxy-core.mjs). 여기서 고치지 말 것.\n${src}`)
}
// types.ts: 갤럭시엔 Blob 대신 기기 파일 경로(uri)를 담는다. 필드 이름은 웹과 같게 둔다.
{
  let src = readFileSync(join(from, 'types.ts'), 'utf8')
  const swaps = [
    ['photo?: Blob', 'photo?: string // 갤럭시: 기기 파일 경로'],
    ['thumb?: Blob', 'thumb?: string // 갤럭시: 기기 파일 경로'],
    ['blob: Blob', 'blob: string // 갤럭시: 기기 파일 경로'],
    ['export const uid = () => crypto.randomUUID()', "export const uid = () => randomUUID()"],
  ]
  for (const [a, b] of swaps) {
    if (!src.includes(a)) throw new Error(`types.ts에서 '${a}'를 못 찾음`)
    src = src.replace(a, b)
  }
  writeFileSync(join(to, 'types.ts'), `// 자동 복사: web/src/core/types.ts (Blob → 파일 경로만 바꿈). 여기서 고치지 말 것.\nimport { randomUUID } from 'expo-crypto'\n${src}`)
  files.push('types')
}
// 아이콘: 웹 ui/common.tsx의 아이콘 정의를 그대로 가져와 react-native-svg로 그린다
{
  const common = readFileSync(join(root, 'web/src/ui/common.tsx'), 'utf8')
  const start = common.indexOf('/** 톱니바퀴')
  const end = common.indexOf('export function Icon')
  if (start < 0 || end < 0) throw new Error('web 아이콘 정의를 찾지 못함')
  const defs = common.slice(start, end).trim()
  const out = `// 자동 생성: web/src/ui/common.tsx 아이콘 (node scripts/sync-galaxy-core.mjs). 여기서 고치지 말 것.
import Svg, { Path } from 'react-native-svg'

${defs}

export function Icon({ name, size = 20, color }: { name: string; size?: number; color: string }) {
  const icon = icons[name]
  if (!icon) return <Svg width={size} height={size} />
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={icon.d} fill={icon.fill ? color : 'none'} stroke={icon.fill ? 'none' : color}
        strokeWidth={icon.width ?? 1.9} strokeLinecap="round" strokeLinejoin="round" fillRule={icon.fill ? 'evenodd' : 'nonzero'} />
    </Svg>
  )
}
`
  writeFileSync(join(root, 'galaxy/src/icons.tsx'), out)
  files.push('icons')
}
// 표시용 도우미(날짜·이름 글자): 웹 ui/common.tsx 끝부분 그대로
{
  const common = readFileSync(join(root, 'web/src/ui/common.tsx'), 'utf8')
  const start = common.indexOf('// --- 표시용 도우미')
  if (start < 0) throw new Error('web 표시용 도우미를 찾지 못함')
  const out = `// 자동 복사: web/src/ui/common.tsx 표시용 도우미 (node scripts/sync-galaxy-core.mjs). 여기서 고치지 말 것.
import type { Camera, FilmFormat, Roll } from './types'
import { filmById, filmDisplayName } from './films'

${common.slice(start).trim()}
`
  writeFileSync(join(to, 'display.ts'), out)
  files.push('display')
}
// 예시 데이터: 웹 seed.ts 그대로 (가져오는 곳만 갤럭시 저장소로)
{
  const src = readFileSync(join(root, 'web/src/seed.ts'), 'utf8')
    .replace("from './db'", "from './data'").replace(/from '\.\/core\//g, "from './core/")
  writeFileSync(join(root, 'galaxy/src/seed.ts'), `// 자동 복사: web/src/seed.ts (node scripts/sync-galaxy-core.mjs). 여기서 고치지 말 것.\n${src}`)
  files.push('seed')
}
// 3D 모형 보기: 웹 model3d.ts로 WebView용 스크립트를 묶는다
{
  const out = execFileSync(join(root, 'web/node_modules/.bin/esbuild'), [join(root, 'galaxy/build/viewer3d-entry.ts'), '--bundle', '--format=iife', '--minify', '--target=es2020'],
    { cwd: join(root, 'web'), maxBuffer: 64 * 1024 * 1024, env: { ...process.env, NODE_PATH: join(root, 'web/node_modules') } }).toString()
  writeFileSync(join(root, 'galaxy/src/viewer3dJs.ts'), `// 자동 생성: galaxy/build/viewer3d-entry.ts + web model3d (node scripts/sync-galaxy-core.mjs)\nexport const viewer3dJs = ${JSON.stringify(out)}\n`)
  files.push('viewer3d')
  const tools = execFileSync(join(root, 'web/node_modules/.bin/esbuild'), [join(root, 'galaxy/build/tools-entry.ts'), '--bundle', '--format=iife', '--minify', '--target=es2020'],
    { cwd: join(root, 'web'), maxBuffer: 64 * 1024 * 1024 }).toString()
  writeFileSync(join(root, 'galaxy/src/webToolsJs.ts'), `// 자동 생성: galaxy/build/tools-entry.ts + web core (node scripts/sync-galaxy-core.mjs)\nexport const webToolsJs = ${JSON.stringify(tools)}\n`)
  files.push('webTools')
}
// 개인정보 처리방침 글: 웹 pages/Privacy.tsx의 sections 그대로
{
  const src = readFileSync(join(root, 'web/src/pages/Privacy.tsx'), 'utf8')
  const start = src.indexOf('const sections'), end = src.indexOf('export function PrivacyPolicy')
  if (start < 0 || end < 0) throw new Error('web Privacy sections를 찾지 못함')
  writeFileSync(join(to, 'privacyText.ts'), `// 자동 복사: web/src/pages/Privacy.tsx (node scripts/sync-galaxy-core.mjs). 여기서 고치지 말 것.\nexport ${src.slice(start, end).trim()}\n`)
  files.push('privacyText')
}
// 앱 버전: 웹 vite.config.ts와 같게
{
  const v = readFileSync(join(root, 'web/vite.config.ts'), 'utf8').match(/__APP_VERSION__: JSON.stringify\('([^']+)'\)/)?.[1]
  if (!v) throw new Error('웹 앱 버전을 찾지 못함')
  writeFileSync(join(to, 'version.ts'), `// 자동 생성: web/vite.config.ts 버전\nexport const APP_VERSION = '${v}'\n`)
  files.push('version')
}
// zip 읽기: 웹 zip.ts 그대로. 미리보기 그림만 data URI로, 낱장 파일 읽기(readFiles)는 갤럭시 scan.ts에서
{
  let src = readFileSync(join(from, 'zip.ts'), 'utf8')
  const swaps = [
    ['export async function previewZip(file: Blob,', 'export async function previewZip(file: Uint8Array,'],
    ['thumbs.push(URL.createObjectURL(new Blob([data], { type })))', 'thumbs.push(`data:${type};base64,${bytesToB64(data)}`)'],
    // 안드로이드 JS 엔진은 euc-kr·latin1 해독기가 없을 수 있다
    ["return new TextDecoder('latin1').decode(bytes)", "try { return new TextDecoder('latin1').decode(bytes) } catch { return String.fromCharCode(...bytes) }"],
  ]
  for (const [a, b] of swaps) {
    if (!src.includes(a)) throw new Error(`zip.ts에서 '${a}'를 못 찾음`)
    src = src.replace(a, b)
  }
  const cut = src.indexOf('/** 낱장 파일들')
  if (cut < 0) throw new Error('zip.ts readFiles를 못 찾음')
  src = src.slice(0, cut).trimEnd() + '\n'
  writeFileSync(join(to, 'zip.ts'), `// 자동 복사: web/src/core/zip.ts (미리보기만 data URI). 여기서 고치지 말 것.\nimport { bytesToB64 } from '../files'\n${src}`)
  files.push('zip')
}
console.log('갤럭시 core 복사 완료:', files.join(', '))
