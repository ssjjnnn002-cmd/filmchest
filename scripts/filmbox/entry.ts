// 필름 상자 그림을 전부 PNG(data URL)로 그려 #out에 JSON으로 적는다 (scripts/render-film-boxes.mjs가 읽음)
import { films } from '../../web/src/core/films'
import { boxFormatText, boxHeight, boxPalette, drawBox } from '../../web/src/core/filmBox'
import { paintCanister } from './oldCanister'

const key = (t: string) => (t === '135-36' ? '135' : t === '' ? 'inst' : t === '4×5' ? '45' : t === '8×10' ? '810' : t)
async function main() {
  await document.fonts.load("900 20px 'FilmBox Archivo'")
  await document.fonts.load("italic 900 20px 'FilmBox Archivo'")
  const out: Record<string, string> = {}
  const colors: Record<string, [string, string]> = {}
  const S = 300
  for (const st of films) {
    colors[st.id] = boxPalette(st)
    const seen = new Set<string>()
    for (const f of st.formats) {
      const t = boxFormatText(f)
      if (seen.has(t)) continue
      seen.add(t)
      const cv = document.createElement('canvas')
      cv.width = S
      cv.height = boxHeight(S)
      drawBox(cv.getContext('2d')!, st, S, f, true)
      out[`${st.id}-${key(t)}`] = cv.toDataURL('image/png')
    }
  }
  // '필름 장착하기' 버튼: 예전 필름통 그림, 글씨 없이
  const cv = document.createElement('canvas')
  cv.width = cv.height = 240
  paintCanister(cv.getContext('2d')!, films.find((f) => f.id === 'kodak-portra-400')!, '135', 240)
  const plain = cv.toDataURL('image/png')
  const pre = document.createElement('pre')
  pre.id = 'out'
  pre.textContent = JSON.stringify({ out, colors, plain })
  document.body.appendChild(pre)
}
main()
