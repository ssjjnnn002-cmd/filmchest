import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { startDriveAutoBackup } from './core/drive'
import { startFolderAutoBackup } from './core/folderBackup'
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

// 시트 밖 화면에서 키보드가 입력칸을 가리면 그 칸이 보이게 올린다. (시트 안은 시트가 직접 스크롤한다)
// 키보드 높이는 짐작하지 않고 보이는 영역(visualViewport)만 쓴다. 칸에 들어갈 때·키보드가 올라올 때만 맞춘다.
const textLike = (t: EventTarget | null): t is HTMLInputElement | HTMLTextAreaElement => {
  if (t instanceof HTMLTextAreaElement) return true
  if (!(t instanceof HTMLInputElement)) return false
  return !['date', 'time', 'datetime-local', 'month', 'week', 'file', 'checkbox', 'radio', 'color', 'range', 'button', 'submit', 'reset'].includes(t.type)
}
const revealPageField = (t: EventTarget | null) => {
  if (!textLike(t) || t.closest('.sheet-root')) return
  const panel = (t.closest('.field') as HTMLElement | null) ?? t
  const vv = window.visualViewport
  const top = (vv?.offsetTop ?? 0) + 12
  const bottom = (vv?.offsetTop ?? 0) + (vv?.height ?? window.innerHeight) - 12
  const rect = panel.getBoundingClientRect()
  if (rect.bottom > bottom) window.scrollBy({ top: rect.bottom - bottom + 16, behavior: 'smooth' })
  else if (rect.top < top) window.scrollBy({ top: rect.top - top - 8, behavior: 'smooth' })
}
let pageReveal: number[] = []
const cancelPageReveal = () => { pageReveal.forEach((t) => window.clearTimeout(t)); pageReveal = [] }
document.addEventListener('focusin', (e) => {
  cancelPageReveal()
  pageReveal = [window.setTimeout(() => revealPageField(e.target), 60), window.setTimeout(() => revealPageField(e.target), 320)]
})
let lastVVHeight = window.visualViewport?.height ?? window.innerHeight
window.visualViewport?.addEventListener('resize', () => {
  const h = window.visualViewport?.height ?? window.innerHeight
  const opening = h < lastVVHeight - 80
  lastVVHeight = h
  if (opening) window.setTimeout(() => revealPageField(document.activeElement), 80)
})
document.addEventListener('touchstart', cancelPageReveal, { passive: true })
document.addEventListener('wheel', cancelPageReveal, { passive: true })

// 입력칸 밖을 누르면 키보드를 닫는다 (스크롤은 click이 생기지 않아 닫히지 않는다)
document.addEventListener('click', (e) => {
  const active = document.activeElement
  if (!textLike(active)) return
  const t = e.target
  if (t instanceof Element && t.closest('input, textarea, select, label, [contenteditable], .suggest, .field')) return
  active.blur()
})
// 한 줄 입력칸에서 Enter(키보드의 완료·이동)를 누르면 키보드를 닫는다. 칸이 Enter를 따로 쓰면(태그 추가 등) 그대로 둔다
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' || e.isComposing || e.defaultPrevented) return
  const t = e.target
  if (t instanceof HTMLInputElement && textLike(t)) t.blur()
})

// 내가 만든 필름을 먼저 불러온 뒤 그린다 (필름 이름이 처음부터 보이게). 바뀌면 다시 채운다.
liveQuery(() => db.customFilms.toArray()).subscribe((rows) => setCustomFilms(rows))
await db.customFilms.toArray().then(setCustomFilms).catch(() => {})

startDriveAutoBackup()
startFolderAutoBackup()
// 예전 불러오기로 둘이 된 장비·롤(대소문자만 다른 id)을 하나로 합친다
void import('./core/backupMerge').then(async (m) => m.dedupeCaseIds((await import('./db')).db as unknown as Parameters<typeof m.dedupeCaseIds>[0])).catch(() => {})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
