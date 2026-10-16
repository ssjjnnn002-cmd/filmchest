import type { FilmStock } from './films'
import type { FilmFormat } from './types'
import { formatInfo } from './types'

// 필름 통 일러스트 (iOS FilmCanisterRenderer 포팅). 배경 투명.

const cache = new Map<string, string>()

export function paintCanister(ctx: CanvasRenderingContext2D, stock: FilmStock, format: FilmFormat, size: number) {
  if (formatInfo[format].is120) drawRoll120(ctx, stock, size)
  else draw135(ctx, stock, size)
}

export function canisterURL(stock: FilmStock, format: FilmFormat = '135', size = 360): string {
  const key = `${stock.id}|${stock.name}|${stock.iso}|${stock.style.body}|${formatInfo[format].is120}|${size}`
  const hit = cache.get(key)
  if (hit) return hit
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  paintCanister(ctx, stock, format, size)
  const url = canvas.toDataURL('image/png')
  cache.set(key, url)
  return url
}

const FONT = '"Helvetica Neue", "Pretendard", "Apple SD Gothic Neo", Arial, sans-serif'

function nameWithoutISO(s: FilmStock) {
  const suffix = ` ${s.iso}`
  const n = s.name.endsWith(suffix) ? s.name.slice(0, -suffix.length) : s.name
  return (n || s.name).toUpperCase()
}

function fitText(ctx: CanvasRenderingContext2D, text: string, weight: string, maxWidth: number, maxSize: number, condensed = false) {
  let size = maxSize
  const family = condensed ? `"Helvetica Neue Condensed", ${FONT}` : FONT
  ctx.font = `${weight} ${size}px ${family}`
  const w = ctx.measureText(text).width
  if (w > maxWidth) size = (maxSize * maxWidth) / w
  ctx.font = `${weight} ${size}px ${family}`
  return size
}

function centerText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string) {
  ctx.fillStyle = color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, x, y)
}

function cylinderShade(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, stops: [number, string][]) {
  const g = ctx.createLinearGradient(x, 0, x + w, 0)
  for (const [o, c] of stops) g.addColorStop(o, c)
  ctx.fillStyle = g
  ctx.fillRect(x, y, w, h)
}

const shade = (a: number) => `rgba(0,0,0,${a})`
const light = (a: number) => `rgba(255,255,255,${a})`

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

function cap(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  roundRect(ctx, x, y, w, h, h * 0.25)
  ctx.fillStyle = color
  ctx.fill()
  ctx.save()
  ctx.clip()
  cylinderShade(ctx, x, y, w, h, [[0, shade(0.45)], [0.25, light(0.35)], [0.4, light(0.08)], [0.85, shade(0.2)], [1, shade(0.55)]])
  ctx.restore()
}

function draw135(ctx: CanvasRenderingContext2D, st: FilmStock, S: number) {
  const u = (v: number) => v * S
  const sty = st.style
  const bx = u(0.12), bw = u(0.4), top = u(0.17), bottom = u(0.85)

  // 바닥 그림자
  ctx.save()
  ctx.filter = `blur(${u(0.015)}px)`
  ctx.fillStyle = shade(0.25)
  ctx.beginPath()
  ctx.ellipse(bx + u(0.42), u(0.91), u(0.42), u(0.02), 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  // 리더
  const leaderColor = st.process === 'C-41' ? '#8A4A1E' : st.process === 'ECN-2' ? '#5E3218' : st.process === 'E-6' ? '#2C2A2B' : '#3C3C40'
  const fromX = bx + bw - u(0.01), lt = u(0.215), lb = u(0.805), mid = (lt + lb) / 2
  const fullEnd = u(0.7), tongueEnd = u(0.93)
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(fromX, lt)
  ctx.lineTo(fullEnd, lt)
  ctx.bezierCurveTo(fullEnd + u(0.04), lt, fullEnd + u(0.02), mid, fullEnd + u(0.06), mid)
  ctx.lineTo(tongueEnd - u(0.03), mid)
  ctx.quadraticCurveTo(tongueEnd, mid, tongueEnd, mid + u(0.04))
  ctx.lineTo(tongueEnd, lb)
  ctx.lineTo(fromX, lb)
  ctx.closePath()
  ctx.fillStyle = leaderColor
  ctx.fill()
  ctx.clip()
  ctx.globalCompositeOperation = 'destination-out'
  for (let x = fromX + u(0.02); x < tongueEnd; x += u(0.034)) {
    for (const y of [lt + u(0.018), lb - u(0.018) - u(0.022)]) {
      roundRect(ctx, x, y, u(0.016), u(0.022), u(0.003))
      ctx.fill()
    }
  }
  ctx.globalCompositeOperation = 'source-over'
  const gloss = ctx.createLinearGradient(0, lt, 0, lb)
  gloss.addColorStop(0, light(0)); gloss.addColorStop(0.35, light(0.16)); gloss.addColorStop(0.5, light(0)); gloss.addColorStop(1, shade(0.2))
  ctx.fillStyle = gloss
  ctx.fillRect(fromX, lt, tongueEnd - fromX, lb - lt)
  ctx.restore()

  // 벨벳
  ctx.fillStyle = '#141210'
  ctx.fillRect(bx + bw - u(0.015), top + u(0.02), u(0.03), bottom - top - u(0.04))

  // 몸통 + 띠
  ctx.fillStyle = sty.body
  ctx.fillRect(bx, top, bw, bottom - top)
  ctx.fillStyle = sty.band
  ctx.fillRect(bx, u(0.45), bw, u(0.14))

  // DX 코드
  const cell = bw / 12
  for (let i = 0; i < 12; i++) for (let row = 0; row < 2; row++) {
    const on = (((st.iso >> (i % 8)) ^ ((row * 0b10100110) >> i)) & 1) === 0 || i === 0
    ctx.fillStyle = on ? '#C9CCCF' : '#1A1A1A'
    ctx.fillRect(bx + i * cell, u(0.7) + row * cell * 0.9, cell, cell * 0.9)
  }

  const cx = bx + bw / 2
  fitText(ctx, st.brand.toUpperCase(), 'bold', bw * 0.8, u(0.05))
  centerText(ctx, st.brand.toUpperCase(), cx, u(0.235), sty.text)
  const name = nameWithoutISO(st)
  fitText(ctx, name, '900', bw * 0.86, u(0.085), true)
  centerText(ctx, name, cx, u(0.35), sty.text)
  fitText(ctx, String(st.iso), '900', bw * 0.7, u(0.11), true)
  centerText(ctx, String(st.iso), cx, u(0.52), sty.bandText)
  ctx.font = `500 ${u(0.026)}px ${FONT}`
  ctx.globalAlpha = 0.8
  centerText(ctx, `${st.process} · 135-36`, cx, u(0.65), sty.text)
  ctx.globalAlpha = 1

  cylinderShade(ctx, bx, top, bw, bottom - top, [[0, shade(0.42)], [0.1, shade(0.12)], [0.3, light(0.22)], [0.45, light(0)], [0.8, shade(0.18)], [1, shade(0.5)]])

  cap(ctx, bx - u(0.012), top - u(0.06), bw + u(0.024), u(0.065), sty.cap)
  cap(ctx, bx - u(0.012), bottom - u(0.005), bw + u(0.024), u(0.06), sty.cap)
  ctx.fillStyle = '#1E1E1E'
  ctx.fillRect(cx - u(0.07), top - u(0.115), u(0.14), u(0.06))
  cylinderShade(ctx, cx - u(0.07), top - u(0.115), u(0.14), u(0.06), [[0, shade(0.5)], [0.35, light(0.18)], [1, shade(0.55)]])
}

function drawRoll120(ctx: CanvasRenderingContext2D, st: FilmStock, S: number) {
  const u = (v: number) => v * S
  const sty = st.style
  const x = u(0.27), w = u(0.46), top = u(0.17), bottom = u(0.83)

  ctx.save()
  ctx.filter = `blur(${u(0.015)}px)`
  ctx.fillStyle = shade(0.25)
  ctx.beginPath()
  ctx.ellipse(x + w / 2, u(0.885), w / 2 + u(0.05), u(0.025), 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  for (const y of [top - u(0.045), bottom - u(0.005)]) {
    ctx.fillStyle = '#151515'
    ctx.fillRect(x - u(0.035), y, w + u(0.07), u(0.05))
    cylinderShade(ctx, x - u(0.035), y, w + u(0.07), u(0.05), [[0, shade(0.4)], [0.3, light(0.2)], [1, shade(0.5)]])
  }
  ctx.fillStyle = sty.body
  ctx.fillRect(x, top, w, bottom - top)
  ctx.fillStyle = sty.band
  ctx.fillRect(x, u(0.46), w, u(0.12))

  const cx = x + w / 2
  fitText(ctx, st.brand.toUpperCase(), 'bold', w * 0.7, u(0.05))
  centerText(ctx, st.brand.toUpperCase(), cx, u(0.24), sty.text)
  const name = nameWithoutISO(st)
  fitText(ctx, name, '900', w * 0.86, u(0.09), true)
  centerText(ctx, name, cx, u(0.35), sty.text)
  ctx.font = `900 ${u(0.09)}px ${FONT}`
  centerText(ctx, String(st.iso), cx, u(0.52), sty.bandText)
  ctx.font = `500 ${u(0.028)}px ${FONT}`
  ctx.globalAlpha = 0.8
  centerText(ctx, `${st.process} · 120`, cx, u(0.7), sty.text)
  ctx.globalAlpha = 1

  ctx.fillStyle = sty.body
  ctx.beginPath()
  ctx.moveTo(x + w, top + u(0.02))
  ctx.lineTo(x + w + u(0.05), top + u(0.05))
  ctx.lineTo(x + w + u(0.05), bottom - u(0.05))
  ctx.lineTo(x + w, bottom - u(0.02))
  ctx.closePath()
  ctx.fill()
  cylinderShade(ctx, x, top, w, bottom - top, [[0, shade(0.4)], [0.12, shade(0.1)], [0.32, light(0.22)], [0.48, light(0)], [0.82, shade(0.18)], [1, shade(0.48)]])
}
