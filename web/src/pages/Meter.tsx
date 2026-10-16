import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { framesPerRoll, type MeterShot, type Roll } from '../core/types'
import { filmDisplayName } from '../core/films'
import { cameraName, rollCameraFormat, rollFilm } from '../ui/common'

/** 노출계: public/meter.html (원본 prototypes/meter/index.html)을 띄우고, 기록을 롤에 저장한다 */
export function Meter({ roll, onClose, onEnd }: { roll: Roll; onClose: () => void; onEnd: () => void }) {
  const camera = useLiveQuery(() => (roll.cameraId ? db.cameras.get(roll.cameraId) : undefined), [roll.cameraId])
  const frame = useRef<HTMLIFrameElement>(null)
  const ready = camera !== undefined || !roll.cameraId

  // 처음 열 때의 값만 넘긴다 (열려 있는 동안은 화면이 기록을 들고 있다)
  const src = useRef<string>()
  if (ready && !src.current) {
    const film = rollFilm(roll)
    const format = rollCameraFormat(camera, roll)
    const init = {
      camera: { id: roll.cameraId ?? roll.id, name: cameraName(camera, roll) },
      film: {
        name: film ? filmDisplayName(film) : '필름 알 수 없음',
        short: film ? film.name.replace(/\s*\d+$/, '') : 'FILM',
        iso: roll.shotISO ?? film?.iso ?? 400,
        format: format.startsWith('120') ? '120' : '135',
        frames: framesPerRoll[format] ?? 36,
        color: film?.style.band ?? '#f0b43a',
      },
      prewind: camera?.prewind ?? null,
      rollPrewind: roll.meterPrewind ?? null,
      shots: roll.meterShots ?? [],
    }
    src.current = `${import.meta.env.BASE_URL}meter.html#init=${encodeURIComponent(JSON.stringify(init))}`
  }

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.source !== frame.current?.contentWindow || e.data?.source !== 'filmchest-meter') return
      const msg = e.data as { type: string; shots?: MeterShot[]; prewind?: boolean; value?: boolean }
      if (msg.type === 'shots') void db.rolls.update(roll.id, { meterShots: msg.shots ?? [], meterPrewind: !!msg.prewind })
      else if (msg.type === 'prewind' && roll.cameraId) void db.cameras.update(roll.cameraId, { prewind: !!msg.value })
      else if (msg.type === 'close') onClose()
      else if (msg.type === 'end') onEnd()
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [roll.id, roll.cameraId, onClose, onEnd])

  return createPortal(
    <div className="meter-overlay">
      {src.current && <iframe ref={frame} src={src.current} title="노출계" allow="camera; autoplay" />}
    </div>,
    document.body,
  )
}
