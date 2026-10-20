import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { useNav } from '../App'
import type { Frame, Roll } from '../core/types'
import { lensIdAt } from '../core/types'
import { meterShotAt } from '../core/meter'
import { exposureLine } from '../core/frameCaption'
import { frameAspects, renderFramePrint } from '../core/framePrint'
import { rotatedBlob } from '../core/importer'
import { Icon, Sheet, cameraName, fmtDay, rollFilm, rollFilmName, rollTitle, sortedDays, useObjectURL } from '../ui/common'
import { getPref, inClaudeHost, saveFile, saveFileNow, setPref } from '../platform'

/** 스캔 한 장을 프레임으로 저장한다 (아이폰 FramePrintView와 같은 구성) */
export function FramePrint({ roll, frames, onClose }: { roll: Roll; frames: Frame[]; onClose: () => void }) {
  const nav = useNav()
  const camera = useLiveQuery(() => (roll.cameraId ? db.cameras.get(roll.cameraId) : undefined), [roll.cameraId])
  const lenses = useLiveQuery(() => db.lenses.toArray(), []) ?? []
  const [index, setIndex] = useState(0)
  const [dark, setDark] = useState(false)
  const [aspect, setAspect] = useState('square')
  const [show, setShow] = useState({ camera: true, lens: true, film: true, filter: true, date: true, photographer: true, exposure: true })
  const [photographer, setPhotographer] = useState<string>(getPref('photographer', ''))
  const [blob, setBlob] = useState<Blob>()
  const [exporting, setExporting] = useState(false)
  const url = useObjectURL(blob)
  const frame = frames[index]
  const original = useLiveQuery(() => (frame ? db.originals.get(frame.id) : undefined), [frame?.id])
  const live = useLiveQuery(() => (frame ? db.frames.get(frame.id) : undefined), [frame?.id])
  const turns = live?.rotation ?? frame?.rotation ?? 0

  const dateFor = (n: number) => {
    const days = sortedDays(roll)
    const day = [...days].reverse().find((d) => (d.startFrame ?? 1) <= n) ?? days[0]
    return day?.startedAt ?? roll.loadedAt
  }

  useEffect(() => {
    if (!frame) return
    let cancelled = false
    const t = setTimeout(async () => {
      const src = original?.blob ?? frame.thumb
      if (!src) return
      const n = frame.index
      const lens = lenses.find((l) => l.id === lensIdAt(roll, n))
      const shot = meterShotAt(roll.meterShots, n, roll.meterOffset ?? 0)
      const film = rollFilm(roll)
      const filter = shot?.filters?.filter(Boolean).join(', ')
      const bmp = await createImageBitmap(await rotatedBlob(src, turns), { imageOrientation: 'from-image' })
      const canvas = await renderFramePrint(bmp, {
        dark,
        camera: show.camera ? cameraName(camera, roll).trim() || undefined : undefined,
        lens: show.lens ? (lens ? `${lens.brand} ${lens.model}`.trim() : camera?.fixedLens ?? roll.cameraFixedLens) : undefined,
        film: show.film ? (film?.name ?? rollFilmName(roll)) : undefined,
        filter: show.filter && filter ? filter : undefined,
        date: show.date ? fmtDay(frame.takenAt ?? dateFor(n)) : undefined,
        photographer: show.photographer ? photographer.trim() || undefined : undefined,
        exposure: show.exposure ? exposureLine(shot ? { aperture: shot.aperture ?? null, shutter: shot.shutter ?? null } : undefined, roll.shotISO ?? film?.iso) : undefined,
      }, frameAspects.find((a) => a.id === aspect)?.ratio ?? 1, 2400)
      const b = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.92))
      if (!cancelled && b) setBlob(b)
    }, 120)
    return () => { cancelled = true; clearTimeout(t) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame?.id, original?.blob, turns, dark, aspect, show, photographer, camera, lenses.length])

  const fileName = () => `${rollTitle(roll, camera)} 프레임.jpg`.replace(/[/\\:]/g, '-')
  const saveGallery = () => {
    if (!blob) return
    const name = fileName()
    const file = new File([blob], name, { type: 'image/jpeg' })
    if (!inClaudeHost() && navigator.canShare?.({ files: [file] })) {
      void navigator.share({ files: [file], title: name }).catch(() => {})
      nav.toast('공유 창에서 이미지 저장을 누르면 갤러리 최근 항목에 들어가요.')
      return
    }
    nav.toast('이 화면에서는 갤러리 창을 열 수 없어요. 파일로 저장을 눌러 주세요.')
  }
  const saveAsFile = () => {
    if (!blob) return
    if (inClaudeHost()) { void saveFile(fileName(), blob).then((r) => nav.toast(r === 'saved' ? '프레임을 파일로 저장했어요' : '이 화면에서는 저장할 수 없어요')); return }
    saveFileNow(fileName(), blob)
    nav.toast('프레임을 파일로 저장했어요')
  }

  const chip = (label: string, on: boolean, toggle: () => void) => (
    <button key={label} className={`chip ${on ? 'active' : ''}`} style={{ height: 32, fontSize: 14 }} onClick={toggle}>{label}</button>
  )
  const meta: [keyof typeof show, string][] = [['camera', '카메라'], ['lens', '렌즈'], ['film', '필름'], ['filter', '필터'], ['date', '날짜'], ['photographer', '찍은 사람'], ['exposure', '노출']]

  return createPortal(
    <div className="fullscreen" role="dialog" aria-label="프레임 만들기">
      <div className="fs-bar">
        <button className="btn ghost" onClick={onClose}>닫기</button>
        <h2>프레임 만들기</h2>
        <span style={{ width: 52 }} />
      </div>
      <div style={{ display: 'grid', gridTemplateRows: 'auto minmax(0, 1fr)', minHeight: 0 }}>
        <div className="chips" style={{ padding: '6px 16px 10px', gap: 8 }}>
          {frames.map((f, i) => (
            <button key={f.id} onClick={() => setIndex(i)} aria-label={`${f.index}번 컷`}
              style={{ flex: '0 0 auto', width: 54, height: 54, padding: 0, border: `2px solid ${i === index ? 'var(--safelight)' : 'transparent'}`, borderRadius: 8, overflow: 'hidden', background: 'var(--fill)' }}>
              <Thumb blob={f.thumb} turns={f.rotation} />
            </button>
          ))}
        </div>
        <div style={{ display: 'grid', placeItems: 'center', minHeight: 0, padding: 12, background: dark ? '#111' : 'var(--paper)' }}>
          {url ? <img src={url} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', boxShadow: '0 2px 12px rgb(0 0 0 / .12)' }} /> : <div className="spinner" />}
        </div>
      </div>
      <div style={{ display: 'grid', gap: 10, padding: '10px 16px calc(12px + env(safe-area-inset-bottom, 0px))' }}>
        <div className="segmented slide" style={{ '--i': dark ? 1 : 0, '--n': 2 } as React.CSSProperties}>
          <button className={!dark ? 'on' : ''} onClick={() => setDark(false)}>흰색</button>
          <button className={dark ? 'on' : ''} onClick={() => setDark(true)}>검정</button>
        </div>
        <div className="chips">{frameAspects.map((a) => chip(a.title, aspect === a.id, () => setAspect(a.id)))}</div>
        <div className="chips">{meta.map(([k, label]) => chip(label, show[k], () => setShow((s) => ({ ...s, [k]: !s[k] }))))}</div>
        {show.photographer && (
          <input className="input" placeholder="찍은 사람" value={photographer}
            style={{ background: 'var(--cell)', borderRadius: 12, padding: '10px 14px', textAlign: 'left' }}
            onChange={(e) => { setPhotographer(e.target.value); setPref('photographer', e.target.value) }} />
        )}
        <button className="btn primary block large" disabled={!blob} onClick={() => setExporting(true)}>저장</button>
      </div>
      {exporting && (
        <Sheet title="프레임 만들기" onClose={() => setExporting(false)} right={<button className="btn ghost" onClick={() => setExporting(false)}><b>완료</b></button>}>
          <div style={{ display: 'grid', gap: 10, marginTop: 8 }}>
            <button className="btn primary block" disabled={!blob} onClick={saveGallery}><Icon name="download" /> 갤러리에 저장</button>
            <button className="btn block" disabled={!blob} onClick={saveAsFile}>파일로 저장</button>
          </div>
        </Sheet>
      )}
    </div>,
    document.body,
  )
}

function Thumb({ blob, turns }: { blob?: Blob; turns?: number }) {
  const url = useObjectURL(blob)
  return url ? <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', transform: turns ? `rotate(${turns * 90}deg)` : undefined }} /> : null
}
