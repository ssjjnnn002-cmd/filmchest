// 예전 35mm 필름통 그림 (글씨 없이) — '필름 장착하기' 버튼 그림을 뽑을 때만 쓴다
// @ts-nocheck
import type { FilmStock } from '../../web/src/core/films'
import type { FilmFormat } from '../../web/src/core/types'
import { filmPack, formatInfo } from '../../web/src/core/types'

// 필름 통 일러스트 (iOS FilmCanisterRenderer 포팅). 배경 투명.

const cache = new Map<string, string>()

export function paintCanister(ctx: CanvasRenderingContext2D, stock: FilmStock, format: FilmFormat, size: number) {
  const pack = filmPack(format)
  if (pack === 'roll') drawRoll120(ctx, stock, size)
  else if (pack === 'cartridge') drawCartridge110(ctx, stock, size)
  else if (pack === 'sheet') drawSheetBox(ctx, stock, size, formatInfo[format].name.replace(' 시트', ''))
  else if (pack === 'instant') drawInstantPack(ctx, stock, size, format)
  else draw135(ctx, stock, size)
}

export function _unusedURL(stock: FilmStock, format: FilmFormat = '135', size = 360): string {
  const key = `${stock.id}|${stock.name}|${stock.iso}|${stock.style.body}|${filmPack(format)}|${format}|${size}`
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

  const cx = bx + bw / 2
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

function dropShadow(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, blur: number) {
  ctx.save()
  ctx.filter = `blur(${blur}px)`
  ctx.fillStyle = shade(0.25)
  ctx.beginPath()
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

/** 110: 두 칸짜리 납작한 플라스틱 카트리지 (왼쪽에 라벨, 가운데 필름 창) */
function drawCartridge110(ctx: CanvasRenderingContext2D, st: FilmStock, S: number) {
  const u = (v: number) => v * S
  const sty = st.style
  dropShadow(ctx, u(0.5), u(0.76), u(0.42), u(0.025), u(0.015))
  const plastic = '#232325'
  const top = u(0.3), h = u(0.42)
  // 두 칸 + 잇는 다리
  for (const [x, w] of [[u(0.08), u(0.38)], [u(0.64), u(0.28)]] as const) {
    roundRect(ctx, x, top, w, h, u(0.035)); ctx.fillStyle = plastic; ctx.fill()
  }
  ctx.fillStyle = plastic
  ctx.fillRect(u(0.44), u(0.4), u(0.22), u(0.2))
  // 필름 창 (필름 색)
  const leader = st.process === 'B&W' ? '#3C3C40' : '#8A4A1E'
  ctx.fillStyle = leader
  ctx.fillRect(u(0.47), u(0.43), u(0.16), u(0.14))
  // 라벨
  const lx = u(0.11), ly = u(0.33), lw = u(0.32), lh = u(0.36)
  roundRect(ctx, lx, ly, lw, lh, u(0.02)); ctx.fillStyle = sty.body; ctx.fill()
  ctx.fillStyle = sty.band
  ctx.fillRect(lx, ly + lh * 0.52, lw, lh * 0.24)
  const cx = lx + lw / 2
  fitText(ctx, st.brand.toUpperCase(), 'bold', lw * 0.8, u(0.035))
  centerText(ctx, st.brand.toUpperCase(), cx, ly + lh * 0.13, sty.text)
  const name = nameWithoutISO(st)
  fitText(ctx, name, '900', lw * 0.86, u(0.06), true)
  centerText(ctx, name, cx, ly + lh * 0.34, sty.text)
  fitText(ctx, String(st.iso), '900', lw * 0.6, u(0.07), true)
  centerText(ctx, String(st.iso), cx, ly + lh * 0.64, sty.bandText)
  ctx.font = `600 ${u(0.026)}px ${FONT}`
  centerText(ctx, '110', cx, ly + lh * 0.88, sty.text)
  // 오른쪽 칸 홈
  ctx.fillStyle = shade(0.35)
  ctx.fillRect(u(0.7), u(0.36), u(0.16), u(0.03))
  ctx.fillRect(u(0.7), u(0.61), u(0.16), u(0.03))
  // 윗빛
  const g = ctx.createLinearGradient(0, top, 0, top + h)
  g.addColorStop(0, light(0.18)); g.addColorStop(0.3, light(0)); g.addColorStop(1, shade(0.25))
  ctx.fillStyle = g
  for (const [x, w] of [[u(0.08), u(0.38)], [u(0.64), u(0.28)]] as const) { roundRect(ctx, x, top, w, h, u(0.035)); ctx.fill() }
}

/** 시트 필름: 납작한 상자 (윗면이 보이게), 앞면에 띠와 크기 */
function drawSheetBox(ctx: CanvasRenderingContext2D, st: FilmStock, S: number, sizeLabel: string) {
  const u = (v: number) => v * S
  const sty = st.style
  dropShadow(ctx, u(0.5), u(0.8), u(0.44), u(0.025), u(0.015))
  const x = u(0.08), y = u(0.36), w = u(0.84), h = u(0.42), d = u(0.12)
  // 윗면
  ctx.beginPath()
  ctx.moveTo(x, y); ctx.lineTo(x + d * 0.6, y - d); ctx.lineTo(x + w + d * 0.6 - u(0.05), y - d); ctx.lineTo(x + w - u(0.05), y)
  ctx.closePath(); ctx.fillStyle = sty.body; ctx.fill()
  ctx.fillStyle = light(0.25); ctx.fill()
  // 옆면
  ctx.beginPath()
  ctx.moveTo(x + w - u(0.05), y); ctx.lineTo(x + w + d * 0.6 - u(0.05), y - d); ctx.lineTo(x + w + d * 0.6 - u(0.05), y + h - d); ctx.lineTo(x + w - u(0.05), y + h)
  ctx.closePath(); ctx.fillStyle = sty.body; ctx.fill()
  ctx.fillStyle = shade(0.3); ctx.fill()
  // 앞면
  const fw = w - u(0.05)
  ctx.fillStyle = sty.body
  ctx.fillRect(x, y, fw, h)
  ctx.fillStyle = sty.band
  ctx.fillRect(x, y + h * 0.56, fw, h * 0.22)
  const cx = x + fw / 2
  fitText(ctx, st.brand.toUpperCase(), 'bold', fw * 0.5, u(0.045))
  centerText(ctx, st.brand.toUpperCase(), cx, y + h * 0.16, sty.text)
  const name = nameWithoutISO(st)
  fitText(ctx, name, '900', fw * 0.8, u(0.085), true)
  centerText(ctx, name, cx, y + h * 0.38, sty.text)
  fitText(ctx, String(st.iso), '900', fw * 0.4, u(0.07), true)
  centerText(ctx, String(st.iso), cx, y + h * 0.67, sty.bandText)
  ctx.font = `700 ${u(0.032)}px ${FONT}`
  centerText(ctx, `${sizeLabel} · SHEET FILM`, cx, y + h * 0.9, sty.text)
  const g = ctx.createLinearGradient(0, y, 0, y + h)
  g.addColorStop(0, light(0.12)); g.addColorStop(0.5, light(0)); g.addColorStop(1, shade(0.18))
  ctx.fillStyle = g
  ctx.fillRect(x, y, fw, h)
}

/** 인스턴트 필름: 팩 상자 + 앞에 비스듬히 놓인 사진 한 장 (인스탁스·폴라로이드 모양 비율) */
function drawInstantPack(ctx: CanvasRenderingContext2D, st: FilmStock, S: number, format: FilmFormat) {
  const u = (v: number) => v * S
  const sty = st.style
  dropShadow(ctx, u(0.5), u(0.86), u(0.4), u(0.025), u(0.015))
  // 팩 상자
  const bx = u(0.1), by = u(0.14), bw = u(0.6), bh = u(0.66)
  roundRect(ctx, bx, by, bw, bh, u(0.03)); ctx.fillStyle = sty.body; ctx.fill()
  ctx.fillStyle = sty.band
  ctx.fillRect(bx, by + bh * 0.5, bw, bh * 0.16)
  const cx = bx + bw / 2
  fitText(ctx, st.brand.toUpperCase(), 'bold', bw * 0.7, u(0.045))
  centerText(ctx, st.brand.toUpperCase(), cx, by + bh * 0.12, sty.text)
  const name = nameWithoutISO(st)
  fitText(ctx, name, '900', bw * 0.86, u(0.075), true)
  centerText(ctx, name, cx, by + bh * 0.3, sty.text)
  fitText(ctx, String(st.iso), '900', bw * 0.5, u(0.06), true)
  centerText(ctx, String(st.iso), cx, by + bh * 0.58, sty.bandText)
  ctx.font = `700 ${u(0.03)}px ${FONT}`
  centerText(ctx, 'INSTANT FILM', cx, by + bh * 0.76, sty.text)
  const g = ctx.createLinearGradient(bx, 0, bx + bw, 0)
  g.addColorStop(0, shade(0.15)); g.addColorStop(0.3, light(0.12)); g.addColorStop(1, shade(0.2))
  roundRect(ctx, bx, by, bw, bh, u(0.03)); ctx.fillStyle = g; ctx.fill()
  // 사진 한 장 (규격 비율: 미니 세로, 스퀘어·폴라로이드 정사각, 와이드 가로)
  const ratio = format === 'instax-mini' ? [0.3, 0.46] : format === 'instax-wide' ? [0.46, 0.34] : [0.36, 0.42]
  const [pw, ph] = [u(ratio[0]), u(ratio[1])]
  ctx.save()
  ctx.translate(u(0.68), u(0.6))
  ctx.rotate(0.12)
  ctx.shadowColor = shade(0.3); ctx.shadowBlur = u(0.02); ctx.shadowOffsetY = u(0.008)
  ctx.fillStyle = '#FBFAF7'
  ctx.fillRect(-pw / 2, -ph / 2, pw, ph)
  ctx.shadowColor = 'transparent'
  const m = pw * 0.08, bottom = format === 'instax-wide' ? ph * 0.2 : ph * 0.24
  const iw = pw - m * 2, ih = ph - m - bottom
  const pic = ctx.createLinearGradient(0, -ph / 2 + m, 0, -ph / 2 + m + ih)
  pic.addColorStop(0, st.process === 'instant' && sty.body === '#1B1B1B' ? '#9A9A9A' : '#7FB2D9')
  pic.addColorStop(0.6, sty.body === '#1B1B1B' ? '#4A4A4A' : '#E8C27A')
  pic.addColorStop(1, sty.body === '#1B1B1B' ? '#2A2A2A' : '#7A5A3A')
  ctx.fillStyle = pic
  ctx.fillRect(-pw / 2 + m, -ph / 2 + m, iw, ih)
  ctx.restore()
}

