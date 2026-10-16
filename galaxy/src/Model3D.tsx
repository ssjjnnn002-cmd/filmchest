// 웹 Model3D: 손가락으로 돌려 보는 기본 3D 모형 (웹 model3d.ts 장면을 WebView에서 그린다)
import { useEffect, useRef, useState } from 'react'
import { Image, View } from 'react-native'
import { WebView } from 'react-native-webview'
import type { ModelProfile } from './core/profiles'
import { modelHash } from './core/profiles'
import { modelShots } from './modelShots'
import { viewer3dJs } from './viewer3dJs'

const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">
<style>html,body{margin:0;height:100%;background:transparent;overflow:hidden;touch-action:none}canvas{display:block;width:100%!important;height:100%!important}</style>
</head><body><script>${viewer3dJs.replace(/<\/script/g, '<\\/script')}</script></body></html>`

export function Model3D({ profile, color, height = 240 }: { profile: ModelProfile; color: string; height?: number }) {
  const ref = useRef<WebView>(null)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const call = `window.show(${JSON.stringify(profile)}, ${JSON.stringify(color)}); true;`
  useEffect(() => { if (ready) ref.current?.injectJavaScript(call) }, [ready, call])
  const still = modelShots[modelHash(profile)]
  if (failed) return still ? <Image source={still} resizeMode="contain" style={{ width: '100%', height }} /> : <View style={{ height }} />
  return (
    <View style={{ height }}>
      {!ready && still ? <Image source={still} resizeMode="contain" style={{ position: 'absolute', width: '100%', height }} /> : null}
      <WebView ref={ref} source={{ html }} originWhitelist={['*']} style={{ backgroundColor: 'transparent', opacity: ready ? 1 : 0 }}
        scrollEnabled={false} bounces={false} overScrollMode="never" androidLayerType="hardware"
        onLoadEnd={() => setReady(true)} onError={() => setFailed(true)} />
    </View>
  )
}
