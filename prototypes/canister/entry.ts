import { films } from '../../web/src/core/films'
import { canisterURL } from '../../web/src/core/canister'
import { drawBox, tplOf } from './box'

type St = (typeof films)[number]
const pick = ['kodak-portra-400', 'kodak-gold-200', 'kodak-ektar-100', 'kodak-trix-400', 'fuji-c200', 'ilford-hp5-plus',
  'cinestill-800t', 'fuji-velvia-50', 'ilford-delta-3200', 'harman-phoenix-200', 'kodak-ultramax-400', 'kodak-ektachrome-e100',
  'fuji-400', 'lomo-cn-400', 'foma-fomapan-400', 'kodak-vision3-500t', 'fuji-instax-mini', 'polaroid-600-color']

function png(st: St, S: number, fmt: string) {
  const cv = document.createElement('canvas')
  cv.width = cv.height = S
  drawBox(cv.getContext('2d')!, st, S, fmt)
  return cv.toDataURL('image/png')
}
const fmtFor = (st: St, want: string) => (want === '120' && st.formats.includes('120-66') ? '120-66' : st.formats[0])

function render() {
  const want = (document.querySelector('input[name=fmt]:checked') as HTMLInputElement).value
  const grid = document.getElementById('grid')!
  grid.innerHTML = ''
  for (const id of pick) {
    const st = films.find((f) => f.id === id)
    if (!st) continue
    const f = fmtFor(st, want)
    const el = document.createElement('div')
    el.className = 'card'
    el.innerHTML = `<div class="pair"><figure><img src="${canisterURL(st, f as never, 360)}"><figcaption>지금</figcaption></figure>
      <figure class="new"><img src="${png(st, 360, f)}"><figcaption>새 시안</figcaption></figure></div>
      <div class="small"><img src="${canisterURL(st, f as never, 360)}"><img src="${png(st, 252, f)}"></div><b>${st.brand} ${st.name}</b><small>${tplOf(st)}</small>`
    grid.appendChild(el)
  }
  const all = document.getElementById('all')!
  all.innerHTML = films.map((st) => `<figure><img src="${png(st, 252, fmtFor(st, want))}"><figcaption>${st.brand} ${st.name}</figcaption></figure>`).join('')
}
document.querySelectorAll('input[name=fmt]').forEach((r) => r.addEventListener('change', render))
document.fonts.load('900 20px Archivo').then(() => document.fonts.ready).then(render)
