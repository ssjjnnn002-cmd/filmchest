// 카메라 사진 다듬기: 단색(흰색 등) 배경을 투명하게 지우고, 빈 여백을 잘라 PNG로 만든다.
// 갤러리에서 고른 PNG가 흰 배경째 들어오거나, 흰 바탕에서 찍은 사진을 깔끔하게 쓰려고.

const MAX_SIDE = 1400

export interface PreparedPhoto {
  blob: Blob
  /** 배경을 지웠는지 (단색 배경이 아니면 지우지 않는다) */
  removed: boolean
}

export async function prepareCameraPhoto(file: Blob, removeBackground: boolean): Promise<PreparedPhoto> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const w = Math.max(1, Math.round(bitmap.width * scale)), h = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()
  const img = ctx.getImageData(0, 0, w, h)
  const removed = removeBackground && !hasTransparentEdge(img) && clearBackground(img)
  ctx.putImageData(img, 0, 0)
  const box = contentBox(img)
  const out = document.createElement('canvas')
  out.width = box.w
  out.height = box.h
  out.getContext('2d')!.drawImage(canvas, box.x, box.y, box.w, box.h, 0, 0, box.w, box.h)
  const blob = await new Promise<Blob>((resolve, reject) => out.toBlob((b) => (b ? resolve(b) : reject(new Error('png'))), 'image/png'))
  return { blob, removed }
}

/** 이미 투명 배경인 PNG면 건드리지 않는다 */
function hasTransparentEdge({ data, width, height }: ImageData) {
  let clear = 0, total = 0
  forEdge(width, height, (i) => { total++; if (data[i + 3] < 200) clear++ })
  return clear > total * 0.3
}

function forEdge(w: number, h: number, fn: (i: number) => void) {
  for (let x = 0; x < w; x++) { fn(x * 4); fn(((h - 1) * w + x) * 4) }
  for (let y = 1; y < h - 1; y++) { fn(y * w * 4); fn((y * w + w - 1) * 4) }
}

/**
 * 가장자리에서 시작해 배경색과 비슷한 픽셀을 이어서 지운다(플러드 필).
 * 배경이 단색이 아니면(가장자리 색이 제각각) 아무것도 하지 않고 false.
 */
function clearBackground(img: ImageData): boolean {
  const { data, width: w, height: h } = img
  // 배경색: 가장자리 픽셀의 중앙값
  const rs: number[] = [], gs: number[] = [], bs: number[] = []
  forEdge(w, h, (i) => { rs.push(data[i]); gs.push(data[i + 1]); bs.push(data[i + 2]) })
  const med = (a: number[]) => a.sort((x, y) => x - y)[a.length >> 1]
  const bg = [med(rs), med(gs), med(bs)]
  const dist = (i: number) => Math.hypot(data[i] - bg[0], data[i + 1] - bg[1], data[i + 2] - bg[2])
  let near = 0, total = 0
  forEdge(w, h, (i) => { total++; if (dist(i) < 40) near++ })
  if (near < total * 0.7) return false

  const tol = 42
  const mask = new Uint8Array(w * h) // 1 = 배경
  const stack: number[] = []
  const push = (p: number) => { if (!mask[p] && dist(p * 4) < tol) { mask[p] = 1; stack.push(p) } }
  for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x) }
  for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1) }
  while (stack.length) {
    const p = stack.pop()!
    const x = p % w, y = (p / w) | 0
    if (x > 0) push(p - 1)
    if (x < w - 1) push(p + 1)
    if (y > 0) push(p - w)
    if (y < h - 1) push(p + w)
  }
  let cleared = 0
  for (let p = 0; p < w * h; p++) {
    const i = p * 4
    if (mask[p]) { data[i + 3] = 0; cleared++; continue }
    // 배경과 맞닿은 가장자리는 배경색에 가까울수록 투명하게 (거친 테두리 방지)
    const x = p % w, y = (p / w) | 0
    const edge = (x > 0 && mask[p - 1]) || (x < w - 1 && mask[p + 1]) || (y > 0 && mask[p - w]) || (y < h - 1 && mask[p + w])
    if (edge) {
      const d = dist(i)
      if (d < tol * 2.2) data[i + 3] = Math.round(data[i + 3] * Math.min(1, (d - tol * 0.6) / (tol * 1.6)))
    }
  }
  // 거의 다 지워졌다면(카메라까지 배경색과 비슷) 실패로 본다
  if (cleared > w * h * 0.97) { for (let p = 0; p < w * h; p++) data[p * 4 + 3] = 255; return false }
  return cleared > 0
}

/** 보이는 부분만 남기도록 자를 상자 (조금 여유를 둔다) */
function contentBox({ data, width: w, height: h }: ImageData) {
  let minX = w, minY = h, maxX = -1, maxY = -1
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 16) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  if (maxX < minX) return { x: 0, y: 0, w, h }
  const pad = Math.round(Math.max(maxX - minX, maxY - minY) * 0.03)
  const x = Math.max(0, minX - pad), y = Math.max(0, minY - pad)
  return { x, y, w: Math.min(w, maxX + pad + 1) - x, h: Math.min(h, maxY + pad + 1) - y }
}

/** 배경을 지운 사진인지: 가장자리가 실제로 투명한지 본다 (PNG로 저장돼도 배경이 그대로면 false) */
export async function isCutoutBlob(blob: Blob): Promise<boolean> {
  const bmp = await createImageBitmap(blob)
  const scale = Math.min(1, 160 / Math.max(bmp.width, bmp.height))
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(bmp.width * scale))
  c.height = Math.max(1, Math.round(bmp.height * scale))
  const g = c.getContext('2d')!
  g.drawImage(bmp, 0, 0, c.width, c.height)
  bmp.close()
  return hasTransparentEdge(g.getImageData(0, 0, c.width, c.height))
}
