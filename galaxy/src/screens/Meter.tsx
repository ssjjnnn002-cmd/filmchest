// 웹 pages/Meter.tsx — 노출계 화면(src/meterHtml.ts, 원본 prototypes/meter/index.html)을 띄우고 기록을 롤에 저장한다
import { useMemo } from 'react'
import { Modal, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { WebView, type WebViewMessageEvent } from 'react-native-webview'
import { db } from '../data'
import { useLiveQuery } from '../store'
import { framesPerRoll, type MeterShot, type Roll } from '../core/types'
import { filmDisplayName } from '../core/films'
import { cameraName, rollCameraFormat, rollFilm } from '../core/display'
import { meterHtml } from '../meterHtml'

const BG = '#0b0b0c'

export function Meter({ roll, onClose, onEnd }: { roll: Roll; onClose: () => void; onEnd: () => void }) {
  const camera = useLiveQuery(() => (roll.cameraId ? db.cameras.get(roll.cameraId) : undefined), [roll.cameraId], null)
  const ready = camera !== null || !roll.cameraId

  // 처음 열 때의 값만 넘긴다 (열려 있는 동안은 화면이 기록을 들고 있다)
  const html = useMemo(() => {
    if (!ready) return null
    const cam = camera ?? undefined
    const film = rollFilm(roll)
    const format = rollCameraFormat(cam, roll)
    const init = {
      camera: { id: roll.cameraId ?? roll.id, name: cameraName(cam, roll) },
      film: {
        name: film ? filmDisplayName(film) : '필름 알 수 없음',
        short: film ? film.name.replace(/\s*\d+$/, '') : 'FILM',
        iso: roll.shotISO ?? film?.iso ?? 400,
        format: format.startsWith('120') ? '120' : '135',
        frames: framesPerRoll[format] ?? 36,
        color: film?.style.band ?? '#f0b43a',
      },
      prewind: cam?.prewind ?? null,
      rollPrewind: roll.meterPrewind ?? null,
      shots: roll.meterShots ?? [],
    }
    // 넘길 값을 화면 코드 맨 앞에 바로 심는다 (injectedJavaScript는 다시 열 때 빠지는 경우가 있어서)
    return meterHtml.replace('<head>', `<head><script>window.FILMCHEST_METER_INIT = ${JSON.stringify(init).replace(/</g, '\\u003c')};</script>`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready])

  const onMessage = (e: WebViewMessageEvent) => {
    let msg: { type: string; shots?: MeterShot[]; prewind?: boolean; value?: boolean }
    try { msg = JSON.parse(e.nativeEvent.data) } catch { return }
    if (msg.type === 'shots') void db.rolls.update(roll.id, { meterShots: msg.shots ?? [], meterPrewind: !!msg.prewind })
    else if (msg.type === 'prewind' && roll.cameraId) void db.cameras.update(roll.cameraId, { prewind: !!msg.value })
    else if (msg.type === 'close') onClose()
    else if (msg.type === 'end') onEnd()
  }

  return (
    <Modal visible animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <StatusBar style="light" />
      <View style={{ flex: 1, backgroundColor: BG }}>
        {html ? (
          <WebView source={{ html, baseUrl: 'https://meter.filmchest.app/' }} onMessage={onMessage} originWhitelist={['*']}
            mediaCapturePermissionGrantType="grant" allowsInlineMediaPlayback mediaPlaybackRequiresUserAction={false}
            javaScriptEnabled domStorageEnabled overScrollMode="never" style={{ flex: 1, backgroundColor: BG }} />
        ) : null}
      </View>
    </Modal>
  )
}
