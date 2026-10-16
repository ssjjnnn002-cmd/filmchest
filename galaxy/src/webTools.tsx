// 숨은 WebView 하나로 웹의 캔버스 코드(배경 지우기, 필름 통, 썸네일, 밀착 인화)를 그대로 돌린다.
import { useRef } from 'react'
import { View } from 'react-native'
import { WebView } from 'react-native-webview'
import { webToolsJs } from './webToolsJs'

const html = `<!doctype html><html><head><meta charset="utf-8"></head><body><script>${webToolsJs.replace(/<\/script/g, '<\\/script')}</script></body></html>`

let view: WebView | null = null
let ready = false
const waiting: (() => void)[] = []
const pending = new Map<string, { resolve: (v: any) => void; reject: (e: Error) => void }>()
let seq = 0

function whenReady() {
  return ready ? Promise.resolve() : new Promise<void>((r) => waiting.push(r))
}

export async function webTool<T = any>(name: string, args: unknown): Promise<T> {
  await whenReady()
  const id = String(++seq)
  return new Promise<T>((resolve, reject) => {
    pending.set(id, { resolve, reject })
    view?.injectJavaScript(`window.run(${JSON.stringify(id)}, ${JSON.stringify(name)}, ${JSON.stringify(args)}); true;`)
  })
}

/** App에 한 번 둔다 */
export function WebToolsHost() {
  const ref = useRef<WebView>(null)
  return (
    <View pointerEvents="none" style={{ position: 'absolute', width: 1, height: 1, opacity: 0, left: -10, top: -10 }}>
      <WebView ref={(r) => { ref.current = r; view = r }} source={{ html }} originWhitelist={['*']}
        onMessage={(e) => {
          let msg: { ready?: boolean; id?: string; result?: unknown; error?: string }
          try { msg = JSON.parse(e.nativeEvent.data) } catch { return }
          if (msg.ready) { ready = true; waiting.splice(0).forEach((fn) => fn()); return }
          const p = msg.id ? pending.get(msg.id) : undefined
          if (!p) return
          pending.delete(msg.id!)
          if (msg.error) p.reject(new Error(msg.error))
          else p.resolve(msg.result)
        }}
        onContentProcessDidTerminate={() => { ready = false; ref.current?.reload() }} />
    </View>
  )
}
