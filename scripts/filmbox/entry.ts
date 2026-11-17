// 필름 상자 그림을 전부 PNG(data URL)로 그려 #out에 JSON으로 적는다 (scripts/render-film-boxes.mjs가 읽음)
import { films } from '../../web/src/core/films'
import { boxFormatText, drawBox } from '../../web/src/core/filmBox'

const key = (t: string) => (t === '135-36' ? '135' : t === '' ? 'inst' : t === '4×5' ? '45' : t === '8×10' ? '810' : t)
async function main() {
  await document.fonts.load("900 20px 'FilmBox Archivo'")
  await document.fonts.load("italic 900 20px 'FilmBox Archivo'")
  const out: Record<string, string> = {}
  const S = 300
  for (const st of films) {
    const seen = new Set<string>()
    for (const f of st.formats) {
      const t = boxFormatText(f)
      if (seen.has(t)) continue
      seen.add(t)
      const cv = document.createElement('canvas')
      cv.width = cv.height = S
      drawBox(cv.getContext('2d')!, st, S, f)
      out[`${st.id}-${key(t)}`] = cv.toDataURL('image/png')
    }
  }
  const pre = document.createElement('pre')
  pre.id = 'out'
  pre.textContent = JSON.stringify(out)
  document.body.appendChild(pre)
}
main()
