// 배경 지우기와 다듬기. 아이폰 SubjectLifter(CutoutSource)와 같은 생각:
// 원래 사진 + 가림막(남길 곳 255, 지울 곳 0)을 들고 있다가, 다듬은 뒤 투명 PNG로 만든다.

/** 다듬기에 쓰는 크기 (아이폰과 같음) */
const SIDE = 1600

export interface Cutout {
  /** 원래 사진 (투명한 곳이 있으면 그대로) */
  image: HTMLCanvasElement
  /** 남길 곳 255, 지울 곳 0 */
  mask: Uint8ClampedArray
  /** 처음 결과 ('처음대로') */
  initial: Uint8ClampedArray
}

export type BgProgress = { phase: 'download'; done: number; total: number } | { phase: 'running' }

function canvasOf(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

async function load(blob: Blob) {
  const bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' })
  const scale = Math.min(1, SIDE / Math.max(bitmap.width, bitmap.height))
  const c = canvasOf(Math.max(1, Math.round(bitmap.width * scale)), Math.max(1, Math.round(bitmap.height * scale)))
  c.getContext('2d')!.drawImage(bitmap, 0, 0, c.width, c.height)
  bitmap.close()
  return c
}

/** 지금 사진으로 다듬기를 시작한다 (투명한 곳은 지운 곳으로) */
export async function cutoutFrom(blob: Blob): Promise<Cutout> {
  const image = await load(blob)
  const px = image.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, image.width, image.height).data
  const mask = new Uint8ClampedArray(image.width * image.height)
  for (let i = 0; i < mask.length; i++) mask[i] = px[i * 4 + 3]
  return { image, mask, initial: mask.slice() }
}

let worker: Worker | null = null

/** 인식 모델로 피사체를 찾는다. 처음엔 모델(약 46MB)을 받는다 */
export async function removeBackground(blob: Blob, onProgress?: (p: BgProgress) => void): Promise<Cutout> {
  const image = await load(blob)
  const SIZE = 1024
  const sq = canvasOf(SIZE, SIZE)
  const sctx = sq.getContext('2d', { willReadFrequently: true })!
  sctx.drawImage(image, 0, 0, SIZE, SIZE)
  const pixels = sctx.getImageData(0, 0, SIZE, SIZE).data
  worker ??= new Worker(new URL('./bgWorker.ts', import.meta.url), { type: 'module' })
  const w = worker
  const base = new URL('./', document.baseURI).href
  const small = await new Promise<Uint8ClampedArray>((resolve, reject) => {
    w.onmessage = (e: MessageEvent<{ type: string; done?: number; total?: number; mask?: Uint8ClampedArray; message?: string }>) => {
      const m = e.data
      if (m.type === 'progress') onProgress?.({ phase: 'download', done: m.done!, total: m.total! })
      else if (m.type === 'running') onProgress?.({ phase: 'running' })
      else if (m.type === 'done') resolve(m.mask!)
      else reject(new Error(m.message || '배경을 지우지 못했어요'))
    }
    w.onerror = (e) => { worker = null; reject(new Error(e.message || '배경을 지우지 못했어요')) }
    w.postMessage({ base, pixels, size: SIZE }, [pixels.buffer])
  })
  // 1024 가림막을 사진 크기로 늘린다
  const mc = canvasOf(SIZE, SIZE)
  const mctx = mc.getContext('2d')!
  const md = mctx.createImageData(SIZE, SIZE)
  for (let i = 0; i < small.length; i++) { md.data[i * 4] = md.data[i * 4 + 1] = md.data[i * 4 + 2] = 255; md.data[i * 4 + 3] = small[i] }
  mctx.putImageData(md, 0, 0)
  const big = canvasOf(image.width, image.height)
  const bctx = big.getContext('2d', { willReadFrequently: true })!
  bctx.imageSmoothingQuality = 'high'
  bctx.drawImage(mc, 0, 0, image.width, image.height)
  const bpx = bctx.getImageData(0, 0, image.width, image.height).data
  // 이미 투명한 곳은 지운 곳으로 두고, 흐릿한 경계는 조금 또렷하게
  const own = image.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, image.width, image.height).data
  const mask = new Uint8ClampedArray(image.width * image.height)
  for (let i = 0; i < mask.length; i++) {
    const v = bpx[i * 4 + 3] / 255
    const t = Math.min(1, Math.max(0, (v - 0.15) / 0.7))
    mask[i] = Math.min(own[i * 4 + 3], t * t * (3 - 2 * t) * 255)
  }
  let kept = 0
  for (let i = 0; i < mask.length; i += 7) if (mask[i] > 128) kept++
  if (kept < mask.length / 7 / 400) throw new Error('카메라를 찾지 못했어요')
  return { image, mask, initial: mask.slice() }
}

/** 가림막을 씌우고 빈 여백을 잘라 투명 PNG로 */
export async function composeCutout({ image, mask }: Cutout): Promise<Blob> {
  const w = image.width, h = image.height
  const c = canvasOf(w, h)
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(image, 0, 0)
  const img = ctx.getImageData(0, 0, w, h)
  const d = img.data
  let minX = w, minY = h, maxX = -1, maxY = -1
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      d[i * 4 + 3] = (d[i * 4 + 3] * mask[i]) / 255
      if (d[i * 4 + 3] > 16) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y }
    }
  }
  if (maxX < minX) throw new Error('남은 부분이 없어요')
  ctx.putImageData(img, 0, 0)
  const pad = Math.floor(Math.max(maxX - minX, maxY - minY) * 0.03)
  const x0 = Math.max(0, minX - pad), y0 = Math.max(0, minY - pad)
  const out = canvasOf(Math.min(w, maxX + pad + 1) - x0, Math.min(h, maxY + pad + 1) - y0)
  out.getContext('2d')!.drawImage(c, x0, y0, out.width, out.height, 0, 0, out.width, out.height)
  return new Promise<Blob>((resolve, reject) => out.toBlob((b) => (b ? resolve(b) : reject(new Error('png'))), 'image/png'))
}
