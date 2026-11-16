import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { framesPerRoll, lensIdAt, type Lens, type MeterShot, type Roll } from '../core/types'
import { filmDisplayName } from '../core/films'
import { cameraName, rollCameraFormat, rollFilm } from '../ui/common'

/** 장비 탭 렌즈 → 노출계 렌즈 (아이폰 MeterLens(LensItem)와 같은 규칙: 화각이 비면 50mm, 조리개가 비면 f/1.4–22) */
const num = (s?: string) => { const m = s?.match(/\d+(\.\d+)?/); return m ? +m[0] : undefined }
export function meterLens(l: Lens) {
  const min = l.focalMin && l.focalMin > 0 ? l.focalMin : 50
  const max = l.zoom && l.focalMax && l.focalMax > min ? l.focalMax : min
  return { id: l.id, name: `${l.brand} ${l.model}`.trim(), min, max, open: num(l.apertureOpen) ?? 1.4, close: num(l.apertureClose) ?? 22 }
}
/** 렌즈 고정형: 이름(예: "Zuiko 42mm f/2.8")에서 화각·조리개를 읽는다 */
export function fixedLens(name: string) {
  const mm = +(name.match(/(\d+)\s*mm/)?.[1] ?? 35)
  const f = num(name.match(/[fF]\s*\/?\s*\d+(\.\d+)?/)?.[0]) ?? 2.8
  return { id: 'fixed', name, min: mm, max: mm, open: f, close: 22, fixed: true }
}

/** 노출계: public/meter.html (원본 prototypes/meter/index.html)을 띄운다.
 *  roll이 있으면 상세 기록(기록을 롤에 저장), 없으면 노출계만 */
export function Meter({ roll, onClose, onEnd }: { roll?: Roll; onClose: () => void; onEnd?: () => void }) {
  const camera = useLiveQuery(() => (roll?.cameraId ? db.cameras.get(roll.cameraId) : undefined), [roll?.cameraId])
  const lenses = useLiveQuery(() => db.lenses.toArray(), [])
  const frame = useRef<HTMLIFrameElement>(null)
  const ready = !roll || ((camera !== undefined || !roll.cameraId) && lenses !== undefined)

  // 처음 열 때의 값만 넘긴다 (열려 있는 동안은 화면이 기록을 들고 있다)
  const src = useRef<string>()
  if (ready && !src.current && !roll) {
    src.current = `${import.meta.env.BASE_URL}meter.html#init=${encodeURIComponent(JSON.stringify({ only: 'meter', camera: { id: 'meter-only', name: '노출계' } }))}`
  }
  if (ready && !src.current && roll) {
    const film = rollFilm(roll)
    const format = rollCameraFormat(camera, roll)
    // 렌즈: 고정형이면 이름에서, 아니면 다음 컷에 끼운 렌즈 → 롤 렌즈 (아이폰 MeterGear.from과 같음)
    const all = lenses ?? []
    const fixedName = camera?.fixedLens ?? roll.cameraFixedLens
    const nextFrame = (roll.meterShots?.length ?? 0) + 1
    const cur = all.find((l) => l.id === (lensIdAt(roll, nextFrame) ?? roll.lensId))
    const lens = fixedName ? fixedLens(fixedName) : cur ? meterLens(cur) : null
    const mount = camera?.mount ?? cur?.mount
    const swappable = fixedName ? [] : all.filter((l) => l.mount && l.mount === mount).map(meterLens)
    const init = {
      camera: { id: roll.cameraId ?? roll.id, name: cameraName(camera, roll), lens: lens ?? undefined },
      lenses: swappable,
      film: {
        name: film ? filmDisplayName(film) : '필름 알 수 없음',
        short: film ? film.name.replace(/\s*\d+$/, '') : 'FILM',
        iso: roll.shotISO ?? film?.iso ?? 400,
        format: format.startsWith('120') ? '120' : '135',
        frames: framesPerRoll[format] ?? 36,
        color: film?.style.band ?? '#f0b43a',
        style: film?.style,
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
      if (msg.type === 'close') onClose()
      else if (!roll) return
      else if (msg.type === 'shots') void db.rolls.update(roll.id, { meterShots: msg.shots ?? [], meterPrewind: !!msg.prewind })
      else if (msg.type === 'prewind' && roll.cameraId) void db.cameras.update(roll.cameraId, { prewind: !!msg.value })
      else if (msg.type === 'end') onEnd?.()
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [roll, onClose, onEnd])

  // 띄운 동안 뒤 페이지가 같이 스크롤되지 않게 (아이폰은 iframe 안 스크롤이 뒤로 넘어감)
  useEffect(() => {
    const html = document.documentElement.style, body = document.body.style
    const prev = [html.overflow, body.overflow]
    html.overflow = 'hidden'; body.overflow = 'hidden'
    return () => { html.overflow = prev[0]; body.overflow = prev[1] }
  }, [])

  return createPortal(
    <div className="meter-overlay">
      {src.current && <iframe ref={frame} src={src.current} title="노출계" allow="camera; autoplay" />}
    </div>,
    document.body,
  )
}
