// 필름 상자 정면 그림 (평면, 가로 1.6 : 1 — 35mm 상자 정면 약 60×38mm). 아이폰·갤럭시는 이 그림을 미리 PNG로 뽑아 쓴다 (scripts/render-film-boxes.mjs).
// 종류마다 실제 상자 정면의 글씨 배치·색 배치·분위기를 따르되, 로고·글꼴은 쓰지 않고 무료 글꼴(Archivo, 폭 62~125)로 새로 쓴다.
import type { FilmStock } from './films'

/** 무료 글꼴 Archivo (public/fonts, OFL). 폭 62~125 · 굵기 100~900 */
export const FILM_BOX_FONT = 'FilmBox Archivo'
const F = `"${FILM_BOX_FONT}", "Archivo", "Helvetica Neue", Arial, sans-serif`
type Ctx = CanvasRenderingContext2D
type Opt = { size: number; weight?: number; wdth?: number; color: string; maxW?: number; align?: CanvasTextAlign; italic?: boolean; track?: number; base?: CanvasTextBaseline; stroke?: string }

const stretch = (w?: number) => (w == null ? 'normal' : w <= 66 ? 'extra-condensed' : w <= 80 ? 'condensed' : w <= 94 ? 'semi-condensed'
  : w >= 122 ? 'expanded' : w >= 108 ? 'semi-expanded' : 'normal')

function t(ctx: Ctx, text: string, x: number, y: number, o: Opt) {
  const set = (sz: number) => {
    ctx.font = `${o.italic ? 'italic ' : ''}${o.weight ?? 700} ${sz}px ${F}`
    ;(ctx as unknown as { fontStretch: string }).fontStretch = stretch(o.wdth)
    ;(ctx as unknown as { letterSpacing: string }).letterSpacing = `${(o.track ?? 0) * sz}px`
  }
  let size = o.size
  set(size)
  if (o.maxW) { const w = ctx.measureText(text).width; if (w > o.maxW) { size *= o.maxW / w; set(size) } }
  ctx.textAlign = o.align ?? 'left'
  ctx.textBaseline = o.base ?? 'alphabetic'
  if (o.stroke) { ctx.strokeStyle = o.stroke; ctx.lineWidth = size * 0.09; ctx.lineJoin = 'round'; ctx.strokeText(text, x, y) }
  ctx.fillStyle = o.color
  ctx.fillText(text, x, y)
  ;(ctx as unknown as { letterSpacing: string }).letterSpacing = '0px'
  return ctx.measureText(text).width
}
/** 상자에 칠한 큰 면 색 (처음 두 번), boxPalette가 읽는다 */
let painted: string[] | null = null
const rect = (ctx: Ctx, c: string, x: number, y: number, w: number, h: number) => { painted?.push(c); ctx.fillStyle = c; ctx.fillRect(x, y, w, h) }

function nameOnly(s: FilmStock) {
  const suf = ` ${s.iso}`
  return s.name.endsWith(suf) ? s.name.slice(0, -suf.length) : s.name
}

/** 이름 + 감도 (이름에 이미 감도 숫자가 있으면 그대로) */
const label = (s: FilmStock) => (nameOnly(s).includes(String(s.iso)) ? nameOnly(s) : `${nameOnly(s)} ${s.iso}`)

/** 정면 칸 (x, y, w, h)와 단위 */
interface Box { x: number; y: number; w: number; h: number; st: FilmStock; fmt: string }
const P = (b: Box, px: number, py: number) => [b.x + b.w * px, b.y + b.h * py] as const

// ───────── 정면 형식들 (필름 종류별 분위기)

/** 프로 컬러 네거티브 (보라·노랑): 얇고 넓은 글씨 이름, 아래 노란 띠에 브랜드 */
function proWide(ctx: Ctx, b: Box, bg: string, strip: string, ink: string, stripInk: string) {
  rect(ctx, bg, b.x, b.y, b.w, b.h)
  rect(ctx, strip, b.x, b.y + b.h * 0.76, b.w, b.h * 0.24)
  const [lx] = P(b, 0.07, 0)
  t(ctx, b.fmt, lx, b.y + b.h * 0.2, { size: b.h * 0.1, weight: 500, color: ink })
  t(ctx, label(b.st).toUpperCase(), lx, b.y + b.h * 0.5, { size: b.h * 0.26, weight: 300, wdth: 118, color: ink, maxW: b.w * 0.86 })
  t(ctx, 'Film · Película · Pellicola', lx, b.y + b.h * 0.65, { size: b.h * 0.075, weight: 400, color: ink, maxW: b.w * 0.6 })
  const bw = t(ctx, b.st.brand, lx, b.y + b.h * 0.94, { size: b.h * 0.13, weight: 800, color: stripInk })
  t(ctx, 'Professional', lx + bw + b.h * 0.05, b.y + b.h * 0.94, { size: b.h * 0.13, weight: 400, color: stripInk })
}

/** 진한 단색 바탕 가운데 가는 이름 (Ektar 같은 분위기) */
function darkCenter(ctx: Ctx, b: Box, bg: string, strip: string, ink: string, stripInk: string) {
  rect(ctx, bg, b.x, b.y, b.w, b.h)
  // 위쪽이 살짝 더 진한 두 겹
  ctx.fillStyle = 'rgba(0,0,0,0.25)'
  ctx.fillRect(b.x, b.y, b.w, b.h * 0.22)
  rect(ctx, strip, b.x, b.y + b.h * 0.74, b.w, b.h * 0.26)
  const cx = b.x + b.w / 2
  t(ctx, label(b.st), cx, b.y + b.h * 0.52, { size: b.h * 0.3, weight: 300, wdth: 90, color: ink, align: 'center', maxW: b.w * 0.86 })
  t(ctx, b.st.process === 'E-6' ? 'Color Reversal Film' : 'Color Negative Film', cx + b.w * 0.18, b.y + b.h * 0.64, { size: b.h * 0.07, weight: 500, color: ink, align: 'center' })
  t(ctx, `${b.st.brand} Professional`, cx, b.y + b.h * 0.92, { size: b.h * 0.12, weight: 700, color: stripInk, align: 'center', maxW: b.w * 0.8 })
}

/** 흑백 클래식 (노랑 바탕, 큰 넓은 감도+약자, 아래 작은 설명) */
function bwCode(ctx: Ctx, b: Box, bg: string, ink: string, sub: string, code: string) {
  rect(ctx, bg, b.x, b.y, b.w, b.h)
  const cx = b.x + b.w / 2
  t(ctx, `${b.st.iso}${code}`, cx, b.y + b.h * 0.55, { size: b.h * 0.42, weight: 800, wdth: 125, color: ink, align: 'center', maxW: b.w * 0.88 })
  t(ctx, 'BLACK & WHITE NEGATIVE FILM', cx, b.y + b.h * 0.69, { size: b.h * 0.065, weight: 600, color: ink, align: 'center', track: 0.05 })
  t(ctx, `${b.st.brand} Professional`, cx, b.y + b.h * 0.88, { size: b.h * 0.12, weight: 800, color: sub, align: 'center' })
}

/** 노란 상자 + 보라 띠에 굵은 이름 (일상용 컬러) */
function consumerStripe(ctx: Ctx, b: Box, bg: string, stripe: string, nameInk: string, ink: string, accent: string) {
  rect(ctx, bg, b.x, b.y, b.w, b.h)
  rect(ctx, stripe, b.x, b.y + b.h * 0.3, b.w, b.h * 0.4)
  const [lx] = P(b, 0.06, 0)
  t(ctx, b.st.brand, lx, b.y + b.h * 0.2, { size: b.h * 0.13, weight: 900, color: accent })
  const isoW = t(ctx, String(b.st.iso), b.x + b.w * 0.94, b.y + b.h * 0.63, { size: b.h * 0.28, weight: 900, wdth: 80, color: nameInk, align: 'right' })
  t(ctx, nameOnly(b.st).toUpperCase(), lx, b.y + b.h * 0.62, { size: b.h * 0.3, weight: 900, wdth: 100, color: nameInk, stroke: accent, maxW: b.w * 0.88 - isoW - b.h * 0.1 })
  t(ctx, `${b.fmt}  ·  ${b.st.process}`, lx, b.y + b.h * 0.9, { size: b.h * 0.08, weight: 700, color: ink })
}

/** 코닥 일상용 상자 (위 노랑에 빨간 브랜드·감도, 아래 색 면에 흰 이름, 경계는 살짝 휘게) */
function kodakConsumer(ctx: Ctx, b: Box, bottom: string, tagline: string[]) {
  rect(ctx, '#F7C600', b.x, b.y, b.w, b.h)
  rect(ctx, bottom, b.x, b.y + b.h * 0.46, b.w, b.h * 0.54)
  const lx = b.x + b.w * 0.06, rx = b.x + b.w * 0.94
  t(ctx, b.st.brand, lx, b.y + b.h * 0.3, { size: b.h * 0.22, weight: 900, wdth: 100, color: '#D21F1B' })
  t(ctx, 'EXP.', rx, b.y + b.h * 0.17, { size: b.h * 0.055, weight: 700, color: '#1a1a1a', align: 'right' })
  t(ctx, '36', rx - b.h * 0.15, b.y + b.h * 0.17, { size: b.h * 0.11, weight: 700, wdth: 85, color: '#1a1a1a', align: 'right' })
  t(ctx, String(b.st.iso), rx, b.y + b.h * 0.3, { size: b.h * 0.12, weight: 700, wdth: 85, color: '#1a1a1a', align: 'right' })
  t(ctx, nameOnly(b.st), lx, b.y + b.h * 0.76, { size: b.h * 0.3, weight: 500, wdth: 82, color: '#ffffff', maxW: b.w * 0.86 })
  tagline.forEach((line, i) => t(ctx, line, lx, b.y + b.h * (tagline.length === 1 ? 0.9 : 0.85 + i * 0.075), { size: b.h * 0.055, weight: 700, color: '#ffffff', maxW: b.w * 0.62 }))
  t(ctx, 'CONT.', rx, b.y + b.h * 0.85, { size: b.h * 0.05, weight: 600, color: '#F7C600', align: 'right' })
  t(ctx, `1 ${b.fmt}`, rx, b.y + b.h * 0.92, { size: b.h * 0.05, weight: 600, color: '#F7C600', align: 'right' })
}

/** 흰 바탕 + 초록 아래 + 빨간 이름 딱지 (일상용 Fuji 느낌) */
function whiteTag(ctx: Ctx, b: Box, bg: string, base: string, tag: string, tagInk: string, ink: string) {
  rect(ctx, bg, b.x, b.y, b.w, b.h)
  rect(ctx, base, b.x, b.y + b.h * 0.72, b.w, b.h * 0.28)
  // 사선으로 걸친 색 띠
  ctx.fillStyle = base
  ctx.beginPath(); ctx.moveTo(b.x, b.y + b.h * 0.72); ctx.lineTo(b.x + b.w * 0.35, b.y + b.h * 0.55); ctx.lineTo(b.x + b.w * 0.5, b.y + b.h * 0.72); ctx.fill()
  const [lx] = P(b, 0.06, 0)
  t(ctx, b.st.brand.toUpperCase(), lx, b.y + b.h * 0.22, { size: b.h * 0.1, weight: 800, color: base, track: 0.05 })
  const numeric = /^\d+$/.test(b.st.name)
  const tagText = numeric ? b.st.name : nameOnly(b.st)
  ctx.font = `italic 900 ${b.h * 0.24}px ${F}`
  const tw = Math.min(ctx.measureText(tagText).width, b.w * 0.5) + b.h * 0.12
  ctx.fillStyle = tag
  ctx.beginPath(); ctx.roundRect(b.x + b.w * 0.94 - tw, b.y + b.h * 0.3, tw, b.h * 0.3, b.h * 0.06); ctx.fill()
  t(ctx, tagText, b.x + b.w * 0.94 - tw / 2, b.y + b.h * 0.53, { size: b.h * 0.24, weight: 900, italic: true, color: tagInk, align: 'center', maxW: b.w * 0.5 })
  t(ctx, numeric ? 'Fujicolor' : String(b.st.iso), lx, b.y + b.h * 0.55, { size: b.h * (numeric ? 0.13 : 0.2), weight: 800, italic: true, color: ink, maxW: b.w * 0.42 })
  t(ctx, `${b.fmt}  ·  ${b.st.process}`, lx, b.y + b.h * 0.92, { size: b.h * 0.08, weight: 700, color: '#ffffff' })
}

/** 슬라이드 (초록 테두리, 흰 칸 + 파란 이름 딱지, 아래 띠에 이름) */
function slidePanel(ctx: Ctx, b: Box, frame: string, tag: string, tagInk: string, ink: string) {
  rect(ctx, frame, b.x, b.y, b.w, b.h)
  rect(ctx, '#f7f7f4', b.x + b.w * 0.05, b.y + b.h * 0.08, b.w * 0.9, b.h * 0.56)
  rect(ctx, '#b9b9b9', b.x + b.w * 0.05, b.y + b.h * 0.42, b.w * 0.9, b.h * 0.012)
  const lab = label(b.st)
  ctx.font = `600 ${b.h * 0.2}px ${F}`
  const tw = Math.min(ctx.measureText(lab).width + b.h * 0.12, b.w * 0.6)
  rect(ctx, tag, b.x + b.w * 0.9 - tw, b.y + b.h * 0.32, tw, b.h * 0.24)
  t(ctx, lab, b.x + b.w * 0.9 - tw / 2, b.y + b.h * 0.5, { size: b.h * 0.2, weight: 600, wdth: 90, color: tagInk, align: 'center', maxW: tw * 0.9 })
  t(ctx, `${b.st.process}  ·  ${b.fmt}`, b.x + b.w * 0.09, b.y + b.h * 0.24, { size: b.h * 0.07, weight: 600, color: ink })
  t(ctx, 'FOR PROFESSIONALS', b.x + b.w * 0.9, b.y + b.h * 0.62, { size: b.h * 0.055, weight: 700, color: ink, align: 'right' })
  t(ctx, `${b.st.brand.toUpperCase()}CHROME`.replace('FUJIFILMCHROME', 'FUJICHROME'), b.x + b.w * 0.92, b.y + b.h * 0.88, { size: b.h * 0.12, weight: 800, wdth: 110, color: '#ffffff', align: 'right', maxW: b.w * 0.7 })
}

/** 흑백 굵은 이름 (흰 바탕, 위 브랜드, 큰 검은 이름, 검정 상자에 PLUS) */
function bwHeavy(ctx: Ctx, b: Box, bg: string, ink: string, accent: string) {
  rect(ctx, bg, b.x, b.y, b.w, b.h)
  const cx = b.x + b.w / 2
  t(ctx, b.st.brand.toUpperCase(), cx, b.y + b.h * 0.2, { size: b.h * 0.15, weight: 900, wdth: 85, color: ink, align: 'center' })
  const words = nameOnly(b.st).toUpperCase().split(' ')
  const main = words[0], rest = words.slice(1).join(' ')
  t(ctx, main, cx, b.y + b.h * 0.52, { size: b.h * 0.34, weight: 900, wdth: 72, color: accent, stroke: ink, align: 'center', maxW: b.w * 0.75 })
  if (rest) {
    ctx.font = `900 ${b.h * 0.13}px ${F}`
    const tw = Math.min(ctx.measureText(rest).width + b.h * 0.12, b.w * 0.7)
    rect(ctx, ink, cx - tw / 2, b.y + b.h * 0.56, tw, b.h * 0.16)
    t(ctx, rest, cx, b.y + b.h * 0.69, { size: b.h * 0.13, weight: 900, wdth: 85, color: bg, align: 'center', maxW: tw * 0.9 })
  }
  t(ctx, b.st.process === 'C-41' ? 'C41 PROCESS B&W FILM' : 'BLACK & WHITE FILM', cx, b.y + b.h * 0.82, { size: b.h * 0.065, weight: 600, color: ink, align: 'center', track: 0.04 })
  rect(ctx, ink, b.x + b.w * 0.08, b.y + b.h * 0.88, b.w * 0.84, b.h * 0.012)
  t(ctx, `ISO ${b.st.iso}  ·  ${b.fmt}`, cx, b.y + b.h * 0.97, { size: b.h * 0.065, weight: 700, color: ink, align: 'center' })
}

/** 밝은 회색 + 윤곽 글씨 이름 + 큰 감도 (Delta 느낌) */
function outlineDelta(ctx: Ctx, b: Box, bg: string, ink: string, tint: string) {
  rect(ctx, bg, b.x, b.y, b.w, b.h)
  const cx = b.x + b.w / 2
  t(ctx, b.st.brand.toUpperCase(), cx, b.y + b.h * 0.2, { size: b.h * 0.14, weight: 900, wdth: 85, color: ink, align: 'center' })
  t(ctx, nameOnly(b.st).toUpperCase(), cx, b.y + b.h * 0.42, { size: b.h * 0.22, weight: 900, wdth: 80, color: tint, stroke: ink, align: 'center', maxW: b.w * 0.8 })
  t(ctx, String(b.st.iso), cx, b.y + b.h * 0.7, { size: b.h * 0.3, weight: 900, wdth: 85, color: ink, align: 'center' })
  t(ctx, 'PROFESSIONAL', cx, b.y + b.h * 0.8, { size: b.h * 0.07, weight: 800, color: tint, align: 'center', track: 0.08 })
  rect(ctx, ink, b.x, b.y + b.h * 0.86, b.w, b.h * 0.14)
  t(ctx, b.st.process === 'C-41' ? 'C41 PROCESS' : 'BLACK & WHITE FILM', cx, b.y + b.h * 0.96, { size: b.h * 0.07, weight: 700, color: bg, align: 'center' })
}

/** 영화 필름 개조 (빨간 바탕, 커다란 두 줄 이름, 작은 종류) */
function cineBig(ctx: Ctx, b: Box, bg: string, ink: string, edge: string) {
  rect(ctx, bg, b.x, b.y, b.w, b.h)
  // 위아래 필름 구멍 줄
  rect(ctx, edge, b.x, b.y, b.w, b.h * 0.1)
  rect(ctx, edge, b.x, b.y + b.h * 0.9, b.w, b.h * 0.1)
  ctx.fillStyle = bg
  for (let i = 0; i < 14; i++) for (const yy of [0.025, 0.925]) ctx.fillRect(b.x + b.w * (0.02 + i * 0.07), b.y + b.h * yy, b.w * 0.035, b.h * 0.05)
  const words = b.st.brand.length > 8 ? [b.st.brand.slice(0, 4), b.st.brand.slice(4)] : [b.st.brand]
  words.forEach((w, i) => t(ctx, w, b.x + b.w * 0.07, b.y + b.h * (words.length === 2 ? 0.48 + i * 0.3 : 0.62), {
    size: b.h * (words.length === 2 ? 0.32 : 0.36), weight: 400, wdth: 75, italic: true, color: ink, maxW: b.w * 0.5,
  }))
  t(ctx, nameOnly(b.st), b.x + b.w * 0.93, b.y + b.h * 0.42, { size: b.h * 0.2, weight: 800, wdth: 75, color: ink, align: 'right', maxW: b.w * 0.38 })
  const kind = /T$/.test(nameOnly(b.st)) ? 'Tungsten' : /D$/.test(nameOnly(b.st)) ? 'Daylight' : b.st.process === 'B&W' ? 'Black & White' : 'Motion Picture'
  t(ctx, kind, b.x + b.w * 0.93, b.y + b.h * 0.56, { size: b.h * 0.08, weight: 600, color: ink, align: 'right' })
  t(ctx, `${b.st.process} · ${b.fmt}`, b.x + b.w * 0.93, b.y + b.h * 0.8, { size: b.h * 0.065, weight: 600, color: ink, align: 'right' })
}

/** 꽉 찬 진한 바탕에 넓은 흰 이름 (Phoenix·로모 같은 새 브랜드) */
function boldWide(ctx: Ctx, b: Box, bg: string, ink: string, accent: string) {
  rect(ctx, bg, b.x, b.y, b.w, b.h)
  const cx = b.x + b.w / 2
  t(ctx, b.st.brand.toUpperCase(), cx, b.y + b.h * 0.3, { size: b.h * 0.08, weight: 800, color: ink, align: 'center', track: 0.12 })
  t(ctx, nameOnly(b.st).toUpperCase(), cx, b.y + b.h * 0.6, { size: b.h * 0.28, weight: 600, wdth: 110, color: ink, align: 'center', maxW: b.w * 0.86 })
  t(ctx, `ISO ${b.st.iso} ${b.st.process === 'B&W' ? 'BLACK & WHITE' : 'COLOUR'} FILM`, cx, b.y + b.h * 0.76, { size: b.h * 0.075, weight: 800, color: accent, align: 'center', track: 0.05 })
  t(ctx, b.fmt, cx, b.y + b.h * 0.92, { size: b.h * 0.065, weight: 600, color: ink, align: 'center' })
}

/** 인스턴트: 흰 상자, 왼쪽 색 막대, 작은 사진 칸 */
function instantBox(ctx: Ctx, b: Box, bg: string, band: string, ink: string) {
  rect(ctx, bg, b.x, b.y, b.w, b.h)
  rect(ctx, band, b.x, b.y, b.w * 0.08, b.h)
  rect(ctx, '#ffffff', b.x + b.w * 0.6, b.y + b.h * 0.18, b.w * 0.3, b.h * 0.62)
  rect(ctx, band, b.x + b.w * 0.62, b.y + b.h * 0.22, b.w * 0.26, b.h * 0.42)
  ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = b.h * 0.01
  ctx.strokeRect(b.x + b.w * 0.6, b.y + b.h * 0.18, b.w * 0.3, b.h * 0.62)
  t(ctx, b.st.brand.toLowerCase(), b.x + b.w * 0.13, b.y + b.h * 0.3, { size: b.h * 0.11, weight: 800, color: ink })
  t(ctx, nameOnly(b.st), b.x + b.w * 0.13, b.y + b.h * 0.56, { size: b.h * 0.17, weight: 800, wdth: 85, color: ink, maxW: b.w * 0.44 })
  t(ctx, `ISO ${b.st.iso}`, b.x + b.w * 0.13, b.y + b.h * 0.85, { size: b.h * 0.08, weight: 700, color: ink })
}

// ───────── 필름별로 형식 고르기

const KY = '#F6C000', KP = '#9B6CB6'
function paint(ctx: Ctx, b: Box) {
  const st = b.st, s = st.style, id = st.id
  if (/portra/.test(id)) return proWide(ctx, b, id.includes('800') ? '#B8732E' : id.includes('160') ? '#C9A3D8' : KP, KY, '#ffffff', '#1a1a1a')
  if (/ektacolor|kodak-proimage/.test(id)) return proWide(ctx, b, s.band, KY, '#ffffff', '#1a1a1a')
  if (/ektar/.test(id)) return darkCenter(ctx, b, '#5A1A1E', KY, '#f3e6d8', '#B0161E')
  if (/ektachrome|elite-chrome/.test(id)) return darkCenter(ctx, b, '#1C1C1C', KY, '#f3f3f3', '#1a1a1a')
  if (id === 'kodak-trix-400') return bwCode(ctx, b, KY, '#1F6B3A', '#C8102E', 'TX')
  if (/tmax|plus-x/.test(id)) return bwCode(ctx, b, KY, s.band, '#C8102E', id.includes('plus-x') ? 'PX' : id.includes('p3200') ? 'TMZ' : st.iso === 100 ? 'TMX' : 'TMY')
  if (id === 'kodak-bw400cn') return bwCode(ctx, b, '#f4efe4', '#1a1a1a', '#C8102E', 'CN')
  if (/vision3|double-x|cinestill/.test(id)) return cineBig(ctx, b, st.brand === 'CineStill' ? (s.band === '#D7262E' ? '#D7262E' : s.band) : '#232323', '#ffffff', '#111111')
  // 코닥 일상용: 모두 같은 틀 (위 노랑 + 아래 색 면에 흰 이름), 색과 문구만 다르다
  const kc: Record<string, [string, string[]]> = {
    'kodak-gold-200': ['#B4389F', ['FILM FOR COLOR PRINTS']], 'kodak-gold-100': ['#B4389F', ['FILM FOR COLOR PRINTS']],
    'kodak-colorplus-200': ['#E0241B', ['FILM • FILME', 'PELÍCULA PARA FOTOS A COLOR']],
    'kodak-ultramax-400': ['#1F5FB5', ['FILM FOR COLOR PRINTS']], 'kodak-max-800': ['#1B1B1B', ['FILM FOR COLOR PRINTS']],
    'kodak-kodacolor-100': ['#E87722', ['FILM FOR COLOR PRINTS']], 'kodak-kodacolor-200': ['#2E8B57', ['FILM FOR COLOR PRINTS']],
  }
  if (kc[id]) return kodakConsumer(ctx, b, kc[id][0], kc[id][1])
  if (st.brand === 'Kodak') return consumerStripe(ctx, b, KY, s.band, KY, '#1a1a1a', '#C8102E')
  if (st.brand === 'Fujifilm') {
    if (st.process === 'E-6') return slidePanel(ctx, b, s.body, s.band === '#F5F5F2' ? s.body : s.band, '#ffffff', '#1a1a1a')
    if (st.process === 'instant') return instantBox(ctx, b, '#f7f7f4', s.band, '#1a1a1a')
    if (st.process === 'B&W') return bwHeavy(ctx, b, '#f4f4f1', '#141414', '#ffffff')
    if (/pro-|natura/.test(id)) return darkCenter(ctx, b, s.body === '#EDEDED' ? '#2E6B3A' : s.body, '#EDEDED', '#ffffff', '#1a1a1a')
    return whiteTag(ctx, b, '#ffffff', /c200|superia/.test(id) ? '#0C9A48' : s.band, '#D7262E', '#ffffff', '#0C9A48')
  }
  if (st.brand === 'Ilford' || st.brand === 'Kentmere') {
    if (/delta|xp2/.test(id)) return outlineDelta(ctx, b, '#ECECEA', '#141414', s.band === '#1B1B1B' ? '#9A9A9A' : s.band)
    return bwHeavy(ctx, b, '#f7f7f4', '#141414', id.includes('hp5') ? '#2BB673' : s.band)
  }
  if (st.process === 'instant') return instantBox(ctx, b, '#f7f7f4', s.band, '#1a1a1a')
  if (st.process === 'B&W') return /adox|rollei|foma|kosmo|jch|shanghai|ferrania|agfa/.test(id) ? bwHeavy(ctx, b, s.body === '#1B1B1B' ? '#f4f4f1' : s.body, '#141414', s.band) : bwHeavy(ctx, b, '#f4f4f1', '#141414', s.band)
  if (st.process === 'E-6') return slidePanel(ctx, b, s.body, s.band, '#ffffff', '#ffffff')
  // 그 밖의 컬러: 꽉 찬 바탕 + 넓은 이름
  const bg = /F5F5F2|F4EFE4|EDEDED/i.test(s.body) ? s.band : s.body
  return boldWide(ctx, b, bg, '#ffffff', /F5F5F2|FFFFFF/i.test(s.bandText) && bg === s.band ? '#ffffff' : s.bandText === bg ? '#ffffff' : s.bandText)
}

/** 상자 정면 (가로 1.6 : 1). 정사각 칸(S×S) 가운데에 그린다. crop이면 칸이 상자 크기(S × boxHeight(S))라 여백 없이 꽉 채운다 */
export const boxHeight = (S: number) => Math.round(S * 0.96 / 1.6 + S * 0.025)
export function drawBox(ctx: Ctx, st: FilmStock, S: number, format = '135', crop = false) {
  const w = S * (crop ? 0.97 : 0.94), h = w / 1.6
  const x = crop ? S * 0.005 : (S - w) / 2, y = crop ? S * 0.005 : (S - h) / 2
  const fmt = boxFormatText(format)
  ctx.fillStyle = 'rgba(0,0,0,0.14)'
  ctx.beginPath(); ctx.roundRect(x + S * 0.01, y + S * 0.012, w, h, S * 0.008); ctx.fill()
  ctx.save()
  ctx.beginPath(); ctx.roundRect(x, y, w, h, S * 0.008); ctx.clip()
  paint(ctx, { x, y, w, h, st, fmt })
  ctx.restore()
  ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = S * 0.003
  ctx.beginPath(); ctx.roundRect(x, y, w, h, S * 0.008); ctx.stroke()
}

/** 상자의 큰 두 색 [바탕, 띠] — 상세 기록 화면 필름통 라벨을 상자와 비슷하게 칠할 때 쓴다 */
const paletteCache = new Map<string, [string, string]>()
export function boxPalette(st: FilmStock): [string, string] {
  const ck = `${st.id}|${st.style.body}|${st.style.band}`
  const hit = paletteCache.get(ck)
  if (hit) return hit
  const cv = document.createElement('canvas')
  cv.width = 32; cv.height = 20
  painted = []
  try { paint(cv.getContext('2d')!, { x: 0, y: 0, w: 32, h: 20, st, fmt: '135-36' }) } finally { /* 아래에서 비움 */ }
  const [a, b] = painted
  painted = null
  const pair: [string, string] = [a ?? st.style.body, b ?? a ?? st.style.band]
  paletteCache.set(ck, pair)
  return pair
}

/** 상자에 적는 규격 글씨 (같은 글씨면 같은 그림) */
export const boxFormatText = (format: string) => format.startsWith('120') ? '120' : format === '110' ? '110' : format === 'sheet-810' ? '8×10' : format.startsWith('sheet') ? '4×5' : format.startsWith('instax') || format === 'polaroid' ? '' : '135-36'
