// 자동 복사: web/src/core/framePrint.ts (node scripts/sync-galaxy-core.mjs). 여기서 고치지 말 것.
// 사진 한 장을 여백 프레임으로 그린다. 회사 로고는 넣지 않고 이름만 글씨로 쓴다.
// 아이폰 FilmScanCore/FramePrintRenderer.swift와 같은 배치

export interface FrameCaption {
  camera?: string
  lens?: string
  film?: string
  filter?: string
  date?: string
  photographer?: string
  exposure?: string
  dark: boolean
  /**
   * 하단 한 줄 표기.
   * A — 왼쪽 정렬 · 얇은 한 줄
   * B — 가운데 정렬 · 얇은 한 줄
   */
  style?: 'A' | 'B'
}

/** 아이폰 FrameAspect와 같은 순서·이름 (가로/세로) */
export const frameAspects: { id: string; title: string; ratio: number }[] = [
  { id: 'square', title: '1:1', ratio: 1 },
  { id: 'fourFive', title: '4:5', ratio: 4 / 5 },
  { id: 'threeFour', title: '3:4', ratio: 3 / 4 },
  { id: 'twoThree', title: '2:3', ratio: 2 / 3 },
  { id: 'nineSixteen', title: '9:16', ratio: 9 / 16 },
  { id: 'fiveFour', title: '5:4', ratio: 5 / 4 },
  { id: 'fourThree', title: '4:3', ratio: 4 / 3 },
  { id: 'threeTwo', title: '3:2', ratio: 3 / 2 },
  { id: 'sixteenNine', title: '16:9', ratio: 16 / 9 },
]

export const frameCaptionStyles: { id: 'A' | 'B'; title: string; hint: string }[] = [
  { id: 'A', title: '타입 A', hint: '하단 · 왼쪽 · 한 줄' },
  { id: 'B', title: '타입 B', hint: '하단 · 가운데 · 한 줄' },
]

const font = '-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif'

/** 켜 둔 항목을 · 로 이은 한 줄 */
export function frameCaptionLine(caption: FrameCaption) {
  return [caption.camera, caption.lens, caption.film, caption.filter, caption.date, caption.photographer, caption.exposure]
    .filter((s): s is string => !!s && !!s.trim())
    .join('  ·  ')
}

export async function renderFramePrint(image: CanvasImageSource, caption: FrameCaption, ratio = 1, pixelWidth = 2400) {
  const owned = !(image instanceof ImageBitmap)
  const bmp = owned ? await createImageBitmap(image as ImageBitmapSource) : image
  const longSide = Math.max(pixelWidth, 64)
  const aspect = Math.max(ratio, 0.2)
  const W = aspect >= 1 ? longSide : Math.ceil(longSide * aspect)
  const H = aspect >= 1 ? Math.ceil(longSide / aspect) : longSide
  const pad = Math.min(W, H) * 0.055
  const lineText = frameCaptionLine(caption)
  const style = caption.style === 'B' ? 'B' : 'A'
  // 작고 얇은 한 줄
  const line = Math.min(W, H) * 0.018
  const gap = pad * 0.35
  const footer = lineText ? pad * 0.45 + line + gap : pad * 0.85

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = caption.dark ? '#111111' : '#F7F6F2'
  ctx.fillRect(0, 0, W, H)

  const boxW = W - pad * 2
  const boxH = Math.max(1, H - pad - footer)
  const iw = bmp.width, ih = bmp.height
  const ia = iw / Math.max(ih, 1)
  let dw = boxW
  let dh = dw / ia
  if (dh > boxH) { dh = boxH; dw = dh * ia }
  const dx = pad + (boxW - dw) / 2
  const dy = pad + (boxH - dh) / 2
  ctx.drawImage(bmp, dx, dy, dw, dh)
  if (owned) (bmp as ImageBitmap).close()

  if (!lineText) return canvas

  ctx.fillStyle = caption.dark ? '#E8E4DC' : '#3A3632'
  ctx.textBaseline = 'alphabetic'
  ctx.font = `300 ${line}px ${font}`
  const maxW = W - pad * 2
  // 한 줄이 길면 살짝 줄여 맞춤
  let size = line
  while (size > line * 0.72 && ctx.measureText(lineText).width > maxW) {
    size -= line * 0.02
    ctx.font = `300 ${size}px ${font}`
  }
  const y = H - pad * 0.55
  if (style === 'B') {
    ctx.textAlign = 'center'
    ctx.fillText(lineText, W / 2, y, maxW)
  } else {
    ctx.textAlign = 'left'
    ctx.fillText(lineText, pad, y, maxW)
  }
  ctx.textAlign = 'left'
  return canvas
}
