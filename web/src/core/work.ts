/** 바로 시작하지 못하는 일에만 쓴다. 문구를 먼저 그린 다음 일을 한다. */
let shown = 0
const listeners = new Set<(on: boolean) => void>()

function emit() {
  const on = shown > 0
  listeners.forEach((fn) => fn(on))
}

export function subscribeWork(fn: (on: boolean) => void) {
  listeners.add(fn)
  fn(shown > 0)
  return () => { listeners.delete(fn) }
}

export async function withWork<T>(work: () => Promise<T>): Promise<T> {
  shown += 1
  emit()
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  try {
    return await work()
  } finally {
    shown = Math.max(0, shown - 1)
    emit()
  }
}
