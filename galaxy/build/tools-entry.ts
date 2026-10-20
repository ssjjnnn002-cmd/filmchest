// 갤럭시 숨은 WebView에서 도는 웹 그림 도구 (캔버스가 필요한 웹 core 코드를 그대로 쓴다)
import { prepareCameraPhoto } from '../../web/src/core/cutout'
import { canisterURL } from '../../web/src/core/canister'
import { renderContactSheet } from '../../web/src/core/contactSheet'
import { renderFramePrint } from '../../web/src/core/framePrint'

type RN = { ReactNativeWebView: { postMessage: (s: string) => void } }
const post = (o: unknown) => (window as unknown as RN).ReactNativeWebView.postMessage(JSON.stringify(o))

const b64ToBlob = (b64: string, type: string) => {
  const bin = atob(b64)
  const u = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i)
  return new Blob([u], { type })
}
const blobToB64 = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const r = new FileReader()
  r.onload = () => resolve(String(r.result).split(',')[1] ?? '')
  r.onerror = () => reject(r.error)
  r.readAsDataURL(blob)
})
const canvasToB64 = (c: HTMLCanvasElement, type: string, q?: number) => new Promise<string>((resolve, reject) =>
  c.toBlob((b) => (b ? blobToB64(b).then(resolve, reject) : reject(new Error('blob'))), type, q))

const tools: Record<string, (a: any) => Promise<unknown>> = {
  async cutout({ data, type, remove }) {
    const r = await prepareCameraPhoto(b64ToBlob(data, type), remove)
    return { data: await blobToB64(r.blob), removed: r.removed }
  },
  async canister({ stock, format, size }) {
    return canisterURL(stock, format, size)
  },
  /** 사진을 줄여 JPEG로 (썸네일) */
  async thumb({ data, type, max, quality }) {
    const bmp = await createImageBitmap(b64ToBlob(data, type), { imageOrientation: 'from-image' })
    const s = Math.min(1, max / Math.max(bmp.width, bmp.height))
    const c = document.createElement('canvas')
    c.width = Math.max(1, Math.round(bmp.width * s)); c.height = Math.max(1, Math.round(bmp.height * s))
    c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height)
    const out = { data: await canvasToB64(c, 'image/jpeg', quality ?? 0.82), width: bmp.width, height: bmp.height }
    bmp.close()
    return out
  },
  /** 프레임 (웹 framePrint.ts 그대로) */
  async framePrint({ data, type, caption, ratio }) {
    const bmp = await createImageBitmap(b64ToBlob(data, type), { imageOrientation: 'from-image' })
    const canvas = await renderFramePrint(bmp, caption, ratio, 2400)
    return canvasToB64(canvas, 'image/jpeg', 0.92)
  },
  /** 화면에 보일 돌린 사진 (보기 전용, 갤러리 저장은 방향 정보만 바꾼다) */
  async rotate({ data, type, turns, max }) {
    const bmp = await createImageBitmap(b64ToBlob(data, type), { imageOrientation: 'from-image' })
    const s = Math.min(1, (max ?? 3200) / Math.max(bmp.width, bmp.height))
    const w = Math.round(bmp.width * s), h = Math.round(bmp.height * s)
    const t = ((turns % 4) + 4) % 4
    const c = document.createElement('canvas')
    c.width = t % 2 ? h : w; c.height = t % 2 ? w : h
    const ctx = c.getContext('2d')!
    ctx.translate(c.width / 2, c.height / 2)
    ctx.rotate((t * Math.PI) / 2)
    ctx.drawImage(bmp, -w / 2, -h / 2, w, h)
    bmp.close()
    return canvasToB64(c, 'image/jpeg', 0.9)
  },
  async contactSheet({ images, format, stock, options }) {
    const bitmaps = await Promise.all((images as (string | null)[]).map((d) => (d ? createImageBitmap(b64ToBlob(d, 'image/jpeg')) : undefined)))
    const canvas = await renderContactSheet(bitmaps, format, stock, options)
    return canvasToB64(canvas, 'image/jpeg', 0.92)
  },
}

;(window as unknown as { run: (id: string, name: string, args: unknown) => void }).run = (id, name, args) => {
  const fn = tools[name]
  if (!fn) { post({ id, error: `no tool ${name}` }); return }
  fn(args).then((result) => post({ id, result }), (e) => post({ id, error: String(e?.message ?? e) }))
}
post({ ready: true })
