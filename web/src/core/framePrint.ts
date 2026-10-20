// 사진 한 장을 여백 프레임으로 그린다. 회사 로고는 넣지 않고 이름만 글씨로 쓴다.
// 아이폰 FilmScanCore/FramePrintRenderer.swift와 같은 배치 (비율, 왼쪽·오른쪽 글줄, 사진과 글자 사이 고정 여백)

export interface FrameCaption {
  camera?: string
  lens?: string
  film?: string
  filter?: string
  date?: string
  photographer?: string
  exposure?: string
  dark: boolean
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

const font = '-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif'

export async function renderFramePrint(image: CanvasImageSource, caption: FrameCaption, ratio = 1, pixelWidth = 2400) {
  const owned = !(image instanceof ImageBitmap)
  const bmp = owned ? await createImageBitmap(image as ImageBitmapSource) : image
  const longSide = Math.max(pixelWidth, 64)
  const aspect = Math.max(ratio, 0.2)
  const W = aspect >= 1 ? longSide : Math.ceil(longSide * aspect)
  const H = aspect >= 1 ? Math.ceil(longSide / aspect) : longSide
  const pad = Math.min(W, H) * 0.055
  const left = [caption.camera, caption.lens, caption.film, caption.filter].filter((s): s is string => !!s)
  const right = [caption.date, caption.photographer, caption.exposure].filter((s): s is string => !!s)
  const rows = Math.max(left.length, right.length)
  const line = Math.min(W, H) * 0.032
  // 사진과 글자 사이는 항상 같은 여백
  const gap = pad * 0.45
  const footer = rows === 0 ? pad * 0.85 : pad * 0.6 + rows * line + gap

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = caption.dark ? '#111111' : '#F7F6F2'
  ctx.fillRect(0, 0, W, H)

  // 사진 칸: 위 여백 pad, 아래는 글자 자리
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

  // 첫 줄 글자 윗부분이 사진 아래에서 gap만큼 떨어지게
  ctx.fillStyle = caption.dark ? '#F4F1EA' : '#1A1816'
  ctx.textBaseline = 'alphabetic'
  const top = dy + dh + gap + line * 0.8
  left.forEach((text, i) => {
    const lead = i === 0 && text === caption.camera
    ctx.font = `${lead ? 600 : 400} ${lead ? line * 0.92 : line * 0.78}px ${font}`
    ctx.fillText(text, pad, top + i * line, (W - pad * 2) * 0.62)
  })
  right.forEach((text, i) => {
    ctx.font = `400 ${line * 0.78}px ${font}`
    ctx.fillText(text, W - pad - ctx.measureText(text).width, top + i * line)
  })
  return canvas
}
