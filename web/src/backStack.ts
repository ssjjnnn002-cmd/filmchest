// 브라우저·안드로이드 뒤로 가기를 앱 안 단계와 맞춘다.
// 시트(입력 창)는 한 겹으로 쌓이고, 닫히면 그 창만 사라진다. 그 다음 뒤로는 직전 화면이다.

export type BackSnap = {
  tab: string
  stacks: Record<string, { type: string; id: string }[]>
}

type Hist = { fc: 1; n: number; snap: BackSnap; overlay?: number }

const empty = (): BackSnap => ({
  tab: 'library',
  stacks: { library: [], shooting: [], pending: [], rolls: [] },
})

let serial = 0
let applying = false
let seq = 0
let reuseOverlay = false
const closers = new Map<number, () => void>()

function read(): Hist | null {
  const s = history.state as Hist | null
  return s?.fc === 1 ? s : null
}

export function ensureHistory() {
  if (read()) return
  history.replaceState({ fc: 1, n: 0, snap: empty() } satisfies Hist, '')
  serial = 0
}

/** 주소만 바꿀 때 뒤로 가기 기록을 지우지 않는다. */
export function replaceUrl(path: string) {
  history.replaceState(history.state, '', path)
}

export function overlayOpen() {
  return read()?.overlay != null
}

/** 화면이 바뀔 때. 시트가 위에 있으면 그 기록을 목적지 화면으로 바꿔, 시트가 닫히며 한 번 더 뒤로 가지 않게 한다. */
export function noteNavigation(snap: BackSnap) {
  if (applying) return
  const cur = read()
  if (cur?.overlay != null) {
    history.replaceState({ fc: 1, n: cur.n, snap } satisfies Hist, '')
    return
  }
  serial += 1
  history.pushState({ fc: 1, n: serial, snap } satisfies Hist, '')
}

/** 이어지는 가져오기 창은 뒤로 가기 기록을 새로 쌓지 않는다. */
export function reuseNextOverlay() {
  reuseOverlay = true
}

export function goBack() {
  const cur = read()
  if (!cur || cur.n <= 0) return false
  history.back()
  return true
}

/** 시트가 열릴 때 호출. 반환된 함수는 시트가 사라질 때 실행한다. */
export function pushOverlay(close: () => void) {
  const id = ++seq
  closers.set(id, close)
  const cur = read() ?? { fc: 1 as const, n: serial, snap: empty() }
  // 개발 모드가 효과를 바로 지웠다 다시 켜면, 방금 쌓인 빈 기록을 새 창으로 갈아끼운다.
  const dangling = cur.overlay != null && !closers.has(cur.overlay)
  if (reuseOverlay || dangling) {
    reuseOverlay = false
    history.replaceState({ fc: 1, n: cur.n, snap: cur.snap, overlay: id } satisfies Hist, '')
  } else {
    serial += 1
    history.pushState({ fc: 1, n: serial, snap: cur.snap, overlay: id } satisfies Hist, '')
  }
  // 개발 모드가 효과를 두 번 돌릴 때는, 같은 차례에 지워진 기록을 뒤로 보내면 안 된다.
  let settled = false
  const timer = window.setTimeout(() => { settled = true }, 0)
  return () => {
    closers.delete(id)
    window.clearTimeout(timer)
    if (!settled || reuseOverlay) return
    if (read()?.overlay === id) history.back()
  }
}

export function startBackStack(apply: (snap: BackSnap) => void) {
  ensureHistory()
  const onPop = () => {
    const s = read()
    if (!s) return
    serial = s.n
    applying = true
    for (const [id, close] of [...closers]) {
      if (id !== s.overlay) {
        closers.delete(id)
        close()
      }
    }
    apply(s.snap)
    applying = false
  }
  window.addEventListener('popstate', onPop)
  return () => window.removeEventListener('popstate', onPop)
}
