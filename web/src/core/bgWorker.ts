// 배경 지우기 인식 모델(ISNet)을 화면과 따로 돌린다. 모델은 처음 한 번 받아 이 기기(Cache)에 둔다.
import * as ort from 'onnxruntime-web/wasm'

const CACHE = 'filmchest-bg-model-v1'
let session: Promise<ort.InferenceSession> | null = null

type Meta = { parts: number; size: number; input: number }

async function loadModel(base: string, post: (m: unknown) => void): Promise<ort.InferenceSession> {
  ort.env.wasm.wasmPaths = `${base}ort/`
  ort.env.wasm.numThreads = 1
  const meta = (await (await fetch(`${base}bg-model/model.json`, { cache: 'no-cache' })).json()) as Meta
  const cache = await caches.open(CACHE).catch(() => null)
  const bytes = new Uint8Array(meta.size)
  let at = 0
  for (let i = 0; i < meta.parts; i++) {
    const url = `${base}bg-model/part${i}.bin?v=${meta.size}`
    let res = await cache?.match(url)
    if (!res) {
      const net = await fetch(url)
      if (!net.ok) throw new Error(`모델을 받지 못했어요 (${net.status})`)
      await cache?.put(url, net.clone()).catch(() => {})
      res = net
    }
    // 받는 동안 진행 상황
    const reader = res.body!.getReader()
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      bytes.set(value, at)
      at += value.length
      post({ type: 'progress', done: at, total: meta.size })
    }
  }
  if (at !== meta.size) throw new Error('모델 파일이 덜 받아졌어요')
  return ort.InferenceSession.create(bytes, { executionProviders: ['wasm'] })
}

self.onmessage = async (e: MessageEvent<{ base: string; pixels: Uint8ClampedArray; size: number }>) => {
  const { base, pixels, size } = e.data
  const post = (m: unknown) => (self as unknown as Worker).postMessage(m)
  try {
    session ??= loadModel(base, post)
    const s = await session.catch((err) => { session = null; throw err })
    post({ type: 'running' })
    // 0~1로 맞추고 0.5를 뺀다 (ISNet general use 입력)
    const n = size * size
    const input = new Float32Array(3 * n)
    for (let i = 0; i < n; i++) {
      input[i] = pixels[i * 4] / 255 - 0.5
      input[n + i] = pixels[i * 4 + 1] / 255 - 0.5
      input[2 * n + i] = pixels[i * 4 + 2] / 255 - 0.5
    }
    const out = await s.run({ [s.inputNames[0]]: new ort.Tensor('float32', input, [1, 3, size, size]) })
    const pred = out[s.outputNames[0]].data as Float32Array
    let lo = Infinity, hi = -Infinity
    for (let i = 0; i < n; i++) { const v = pred[i]; if (v < lo) lo = v; if (v > hi) hi = v }
    const mask = new Uint8ClampedArray(n)
    const span = hi - lo || 1
    for (let i = 0; i < n; i++) mask[i] = ((pred[i] - lo) / span) * 255
    post({ type: 'done', mask }, )
  } catch (err) {
    post({ type: 'error', message: (err as Error).message })
  }
}
