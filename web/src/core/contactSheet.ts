import type { FilmStock } from './films'
import { edgeMarking } from './films'
import type { FilmFormat } from './types'
import { formatInfo } from './types'

// 밀착 인화 (iOS ContactSheetRenderer 포팅)

export interface SheetOptions {
  width?: number
  header?: string
  title?: string
  rotatePortrait?: boolean
}

const MONO = '"SF Mono", Menlo, Consolas, monospace'
const SANS = '"Pretendard", "Helvetica Neue", "Apple SD Gothic Neo", sans-serif'

export async function renderContactSheet(
  images: (ImageBitmap | undefined)[],
  format: FilmFormat,
  film: FilmStock | undefined,
  opt: SheetOptions = {},
): Promise<HTMLCanvasElement> {
  const info = formatInfo[format]
  const per = info.perStrip
  const count = images.length
  const stripCount = Math.max(1, Math.ceil(count / per))
  const W = opt.width ?? 4200
  const margin = W * 0.045
  const stripGap = W * 0.018
  const usable = W - margin * 2
  const gapRatio = info.is120 ? 0.09 : 0.055
  const frameW = usable / (per + per * gapRatio)
  const frameGap = frameW * gapRatio
  const frameH = frameW / info.aspect
  const rebate = info.is120 ? frameH * (2.5 / 56) : frameH * (5.5 / 24)
  const stripH = frameH + rebate * 2
  const titleH = opt.title ? W * 0.045 : 0
  const headerH = titleH + (opt.header ? W * 0.035 : 0)
  const H = Math.ceil(margin * 2 + headerH + stripCount * stripH + (stripCount - 1) * stripGap)

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#F2F0EA'
  ctx.fillRect(0, 0, W, H)

  ctx.textBaseline = 'middle'
  if (opt.title) {
    ctx.fillStyle = '#26221E'
    ctx.font = `700 ${W * 0.022}px ${SANS}`
    ctx.textAlign = 'left'
    ctx.fillText(opt.title, margin, margin + titleH * 0.55)
  }
  if (opt.header) {
    ctx.fillStyle = '#3A3631'
    ctx.font = `500 ${W * 0.012}px ${SANS}`
    ctx.textAlign = 'left'
    ctx.fillText(opt.header, margin, margin + titleH + (headerH - titleH) * 0.45)
  }

  const mm = frameW / 36
  for (let s = 0; s < stripCount; s++) {
    const y0 = margin + headerH + s * (stripH + stripGap)
    const inStrip = Math.max(1, Math.min(per, count - s * per))
    const sx = margin - frameGap / 2
    const sw = inStrip * (frameW + frameGap)
    ctx.fillStyle = '#1C1A18'
    ctx.fillRect(sx, y0, sw, stripH)

    if (!info.is120) {
      ctx.fillStyle = '#060606'
      const pitch = 4.75 * mm, hw = 1.98 * mm, hh = 2.79 * mm * 0.72, fe = 2 * mm * 0.62
      for (let x = sx + pitch * 0.35; x + hw < sx + sw; x += pitch) {
        for (const y of [y0 + fe, y0 + stripH - fe - hh]) {
          ctx.beginPath()
          ctx.roundRect(x, y, hw, hh, hw * 0.22)
          ctx.fill()
        }
      }
    }

    for (let i = 0; i < inStrip; i++) {
      const n = s * per + i
      const x = margin + i * (frameW + frameGap)
      const cy = y0 + rebate
      const img = images[n]
      if (img) drawFrame(ctx, img, x, cy, frameW, frameH, opt.rotatePortrait ?? true)
      else { ctx.fillStyle = '#0B0B0B'; ctx.fillRect(x, cy, frameW, frameH) }

      const numSize = rebate * (info.is120 ? 0.75 : 0.26)
      const edgeY = info.is120 ? y0 + rebate * 0.5 : y0 + stripH - rebate * 0.79
      ctx.fillStyle = '#D9CFB8'
      ctx.font = `700 ${numSize}px ${MONO}`
      ctx.textAlign = 'center'
      ctx.fillText(String(n + 1), x + frameW * 0.08, edgeY)
      ctx.fillText(`${n + 1}A`, x + frameW * 0.62, edgeY)
      if (film && i % 2 === 0) {
        const topY = info.is120 ? y0 + stripH - rebate * 0.5 : y0 + rebate * 0.79
        ctx.font = `700 ${numSize * 0.9}px ${MONO}`
        ctx.fillText(edgeMarking(film).split('').join(' '), x + frameW * 0.5, topY)
      }
    }
  }
  return canvas
}

function drawFrame(ctx: CanvasRenderingContext2D, img: ImageBitmap, x: number, y: number, w: number, h: number, rotatePortrait: boolean) {
  const portrait = img.height > img.width
  const landscapeCell = w >= h
  const rotate = rotatePortrait && portrait === landscapeCell && w !== h
  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, w, h)
  ctx.clip()
  ctx.translate(x + w / 2, y + h / 2)
  if (rotate) ctx.rotate(Math.PI / 2)
  const tw = rotate ? h : w, th = rotate ? w : h
  const scale = Math.max(tw / img.width, th / img.height)
  const dw = img.width * scale, dh = img.height * scale
  ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh)
  ctx.restore()
}
