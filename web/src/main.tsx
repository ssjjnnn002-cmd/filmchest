import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { liveQuery } from 'dexie'
import { App } from './App'
import { db } from './db'
import { setCustomFilms } from './core/films'
import { applyTheme, getPref } from './platform'
import './styles.css'

applyTheme(getPref('theme', 'system'))

// 이 브라우저에서 기록을 최대한 지우지 않게 한다. 서버로는 나가지 않는다.
void navigator.storage?.persist?.()

// 키보드가 아래를 가릴 때만 탭바를 올린다.
// 스크롤이나 주소창으로 visualViewport가 조금씩 바뀌면 롤 보관함처럼 긴 화면에서 탭바가 위아래로 튄다.
const pinTabbar = () => {
  const vv = window.visualViewport
  const gap = vv ? window.innerHeight - vv.height - vv.offsetTop : 0
  const covered = gap > 140 ? Math.round(gap) : 0
  document.documentElement.style.setProperty('--vv-bottom', `${covered}px`)
}
pinTabbar()
window.visualViewport?.addEventListener('resize', pinTabbar)

// 갤럭시·안드로이드에서 키보드가 입력칸을 가리면 그 칸이 보이게 올린다.
document.addEventListener('focusin', (e) => {
  const t = e.target
  if (!(t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement)) return
  if (t.type === 'file' || t.type === 'checkbox' || t.type === 'radio' || t.type === 'color' || t.type === 'range') return
  window.setTimeout(() => {
    const vv = window.visualViewport
    if (vv && vv.height > window.innerHeight * 0.85) return
    t.scrollIntoView({ block: 'center', inline: 'nearest' })
  }, 280)
})

// 내가 만든 필름을 먼저 불러온 뒤 그린다 (필름 이름이 처음부터 보이게). 바뀌면 다시 채운다.
liveQuery(() => db.customFilms.toArray()).subscribe((rows) => setCustomFilms(rows))
await db.customFilms.toArray().then(setCustomFilms).catch(() => {})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
