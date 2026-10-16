import { useMemo, useState } from 'react'
import { View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { WebView, type WebViewMessageEvent } from 'react-native-webview'
import { cameraName, getCamera, getRoll, meterShots, saveMeter, setCameraPrewind, type MeterShot } from '../../src/db'
import { filmById, filmDisplayName } from '../../src/films'
import { formatInfo, type FilmFormat } from '../../src/types'
import { LabDropOff } from '../../src/lab'
import { meterHtml } from '../../src/meterHtml'

const BG = '#0b0b0c'

/** 노출계. 화면은 src/meterHtml.ts (원본 prototypes/meter/index.html, scripts/sync-meter.mjs로 복사) */
export default function Meter() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [ended, setEnded] = useState(false)

  // 처음 열 때의 값만 넘긴다 (열려 있는 동안은 화면이 기록을 들고 있다)
  const init = useMemo(() => {
    const roll = getRoll(id)
    if (!roll) return null
    const camera = roll.cameraId ? getCamera(roll.cameraId) : undefined
    const film = filmById(roll.filmId)
    const format = (camera?.format ?? roll.cameraFormat ?? '135') as FilmFormat
    return {
      camera: { id: roll.cameraId ?? roll.id, name: cameraName(camera, roll) },
      film: {
        name: film ? filmDisplayName(film) : '필름 알 수 없음',
        short: film ? film.name.replace(/\s*\d+$/, '') : 'FILM',
        iso: roll.shotISO ?? film?.iso ?? 400,
        format: formatInfo[format]?.is120 ? '120' : '135',
        frames: formatInfo[format]?.count ?? 36,
        color: film?.style.band ?? '#f0b43a',
      },
      prewind: camera?.prewind ?? null,
      rollPrewind: roll.meterPrewind == null ? null : roll.meterPrewind === 1,
      shots: meterShots(roll),
    }
  }, [id])

  const onMessage = (e: WebViewMessageEvent) => {
    let msg: { type: string; shots?: MeterShot[]; prewind?: boolean; value?: boolean }
    try { msg = JSON.parse(e.nativeEvent.data) } catch { return }
    if (msg.type === 'shots') saveMeter(id, msg.shots ?? [], !!msg.prewind)
    else if (msg.type === 'prewind') {
      const roll = getRoll(id)
      if (roll?.cameraId) setCameraPrewind(roll.cameraId, !!msg.value)
    } else if (msg.type === 'close') router.back()
    else if (msg.type === 'end') setEnded(true)
  }

  // 넘길 값을 화면 코드 맨 앞에 바로 심는다 (injectedJavaScript는 다시 열 때 빠지는 경우가 있어서)
  const html = useMemo(() => init
    ? meterHtml.replace('<head>', `<head><script>window.FILMCHEST_METER_INIT = ${JSON.stringify(init).replace(/</g, '\\u003c')};</script>`)
    : meterHtml, [init])

  const roll = getRoll(id)
  if (!init || !roll) return <View style={{ flex: 1, backgroundColor: BG }} />
  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar style="light" />
      <WebView
        source={{ html, baseUrl: 'https://meter.filmchest.app/' }}
        onMessage={onMessage}
        originWhitelist={['*']}
        mediaCapturePermissionGrantType="grant"
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
        domStorageEnabled
        overScrollMode="never"
        style={{ flex: 1, backgroundColor: BG }}
      />
      {/* 노출계에서 촬영을 끝내면 현상 맡기기로 이어진다 */}
      {ended ? <LabDropOff roll={roll} onClose={() => router.back()} /> : null}
    </View>
  )
}
