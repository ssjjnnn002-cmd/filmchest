// 아이폰과 같은 화면 밀기: 새 화면이 오른쪽에서 덮고, 아래 화면은 왼쪽으로 조금 밀리며 어두워진다.
// 아래(또는 나가는) 화면은 모습을 복제해 움직인다. 가장자리 밀기로 손가락을 따라 되돌릴 수 있다.
export const IOS_CURVE = 'cubic-bezier(.32,.72,0,1)'
export const PUSH_MS = 500
const PARALLAX = 0.3

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
const narrow = () => window.innerWidth < 900
const still = new Map<string, { node: HTMLElement; scroll: number }>()

/** 지금 화면의 모습을 떠 둔다 (밀기 직전, 되돌릴 때 아래에 깔 화면) */
export function capturePage(key: string, page: HTMLElement | null) {
  if (!page || !narrow()) return
  const main = page.closest('.main') as HTMLElement | null
  if (!main) return
  const layer = document.createElement('div')
  layer.className = 'nav-layer'
  layer.setAttribute('aria-hidden', 'true')
  layer.inert = true
  const copy = main.cloneNode(true) as HTMLElement
  const inner = copy.querySelector('.page') as HTMLElement | null
  if (inner) { inner.className = 'page'; inner.style.cssText = '' }
  // 그려 둔 그림은 복제되지 않아서 옮겨 그린다
  const from = main.querySelectorAll('canvas'), to = copy.querySelectorAll('canvas')
  from.forEach((c, i) => { try { to[i].getContext('2d')?.drawImage(c, 0, 0) } catch { /* 옮기지 못하면 빈칸 */ } })
  layer.appendChild(copy)
  const dim = document.createElement('i')
  dim.className = 'nav-dim'
  layer.appendChild(dim)
  still.set(key, { node: layer, scroll: window.scrollY })
  if (still.size > 12) still.delete(still.keys().next().value!)
}
export const dropStill = (key: string) => still.delete(key)

function show(key: string, above: boolean) {
  const s = still.get(key)
  if (!s) return null
  const node = s.node.cloneNode(true) as HTMLElement
  node.inert = true
  const a = s.node.querySelectorAll('canvas'), b = node.querySelectorAll('canvas')
  a.forEach((c, i) => { try { b[i].getContext('2d')?.drawImage(c, 0, 0) } catch { /* 빈칸 */ } })
  node.style.zIndex = above ? '25' : '1'
  document.querySelector('.app')?.appendChild(node)
  node.scrollTop = s.scroll
  return { node, dim: node.querySelector('.nav-dim') as HTMLElement }
}

const opts = (ms = PUSH_MS): KeyframeAnimationOptions => ({ duration: ms, easing: IOS_CURVE, fill: 'both' })

/** 새 화면이 그려진 다음 부른다 */
export function playPush(fromKey: string, page: HTMLElement | null) {
  if (!page || reduced() || !narrow()) return
  const under = show(fromKey, false)
  page.classList.add('nav-moving')
  const a = page.animate([{ transform: 'translateX(100%)' }, { transform: 'none' }], opts())
  under?.node.animate([{ transform: 'none' }, { transform: `translateX(${-PARALLAX * 100}%)` }], opts())
  under?.dim.animate([{ opacity: 0 }, { opacity: 1 }], opts())
  const end = () => { a.cancel(); page.classList.remove('nav-moving'); under?.node.remove() }
  a.onfinish = end
  window.setTimeout(end, PUSH_MS + 120)
}

export function playPop(fromKey: string, page: HTMLElement | null) {
  if (!page || reduced() || !narrow()) return
  const over = show(fromKey, true)
  if (!over) return
  over.dim.remove()
  over.node.classList.add('over')
  const a = over.node.animate([{ transform: 'none' }, { transform: 'translateX(100%)' }], opts())
  const b = page.animate([{ transform: `translateX(${-PARALLAX * 100}%)`, filter: 'brightness(.9)' }, { transform: 'none', filter: 'none' }], opts())
  const end = () => { a.cancel(); b.cancel(); over.node.remove() }
  a.onfinish = end
  window.setTimeout(end, PUSH_MS + 120)
}

/** 가장자리 밀기: 손가락을 따라 움직이고, 놓으면 끝까지 가거나 제자리로 */
export function startSwipeBack(prevKey: string, page: HTMLElement) {
  const under = show(prevKey, false)
  page.classList.add('nav-moving')
  const w = window.innerWidth
  const at = (p: number) => {
    page.style.transform = `translateX(${p * w}px)`
    if (under) {
      under.node.style.transform = `translateX(${-PARALLAX * (1 - p) * w}px)`
      under.dim.style.opacity = String(1 - p)
    }
  }
  at(0)
  return {
    move: (dx: number) => at(Math.min(1, Math.max(0, dx / w))),
    end: (done: boolean, dx: number, after: () => void) => {
      const ms = Math.max(180, PUSH_MS * (done ? 1 - dx / w : dx / w))
      const t = `transform ${ms}ms ${IOS_CURVE}`
      page.style.transition = t
      if (under) { under.node.style.transition = t; under.dim.style.transition = `opacity ${ms}ms ${IOS_CURVE}` }
      requestAnimationFrame(() => at(done ? 1 : 0))
      window.setTimeout(() => {
        if (done) after()
        // 아래 화면이 실제로 그려진 다음 복제를 걷는다 (깜빡임 막기)
        requestAnimationFrame(() => requestAnimationFrame(() => {
          page.style.transition = ''; page.style.transform = ''
          page.classList.remove('nav-moving')
          under?.node.remove()
        }))
      }, ms)
    },
  }
}

/** 마지막으로 누른 자리: 확인 말풍선을 그 옆에 띄운다 (아이폰과 같음) */
export const lastTap = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
document.addEventListener('pointerdown', (e) => { lastTap.x = e.clientX; lastTap.y = e.clientY }, true)
/** 가벼운 진동 (되는 기기에서만) */
export const tick = (ms = 10) => { navigator.vibrate?.(ms) }
