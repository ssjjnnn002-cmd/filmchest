// 사진 한 장을 여백 프레임으로 그린다. 회사 로고는 넣지 않고 이름만 글씨로 쓴다.

export interface FrameCaption {
  camera?: string
  lens?: string
  film?: string
  date?: string
  photographer?: string
  exposure?: string
  dark: boolean
}

const font = '-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif'

export async function renderFramePrint(image: CanvasImageSource, caption: FrameCaption, pixelWidth = 2400) {
  const owned = !(image instanceof ImageBitmap)
  const bmp = owned ? await createImageBitmap(image) : image
  const iw = bmp.width
  const ih = bmp.height
  const W = pixelWidth
  const padX = W * 0.055
  const padTop = W * 0.048
  const left = [caption.camera, caption.lens, caption.film].filter((s): s is string => !!s)
  const right = [caption.date, caption.photographer, caption.exposure].filter((s): s is string => !!s)
  const rows = Math.max(left.length, right.length)
  const line = W * 0.032
  const footer = rows === 0 ? padTop * 0.85 : W * 0.04 + rows * line + W * 0.042
  const imgW = W - padX * 2
  const imgH = imgW * (ih / Math.max(1, iw))
  const H = Math.round(padTop + imgH + footer)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(W)
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = caption.dark ? '#111111' : '#F7F6F2'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(bmp, padX, padTop, imgW, imgH)
  if (owned) bmp.close()
  ctx.fillStyle = caption.dark ? '#F4F1EA' : '#1A1816'
  ctx.textBaseline = 'middle'
  const top = padTop + imgH + W * 0.03 + line * 0.5
  left.forEach((text, i) => {
    const lead = i === 0 && text === caption.camera
    ctx.font = `${lead ? 600 : 460} ${lead ? line * 0.92 : line * 0.78}px ${font}`
    ctx.fillText(text, padX, top + i * line, imgW * 0.62)
  })
  right.forEach((text, i) => {
    ctx.font = `460 ${line * 0.78}px ${font}`
    ctx.fillText(text, canvas.width - padX - ctx.measureText(text).width, top + i * line)
  })
  return canvas
}
