import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { useNav } from '../App'
import type { Camera, Frame, Roll } from '../core/types'
import { formatInfo } from '../core/types'
import { exposureText, meterShotAt } from '../core/meter'
import { edgeMarking } from '../core/films'
import { renderContactSheet } from '../core/contactSheet'
import { ZoomView } from '../ui/Viewers'
import { Icon, Sheet, bytesText, cameraName, dateRangeText, fmtDayTime, resolutionText, rollCameraFormat, rollFilm, rollFilmName, rollTitle, sortedLocations, useObjectURL } from '../ui/common'
import { inClaudeHost, saveFile, saveFileNow, saveToGallery } from '../platform'
import { rotatedBlob } from '../core/importer'

/** 필름 롤을 펼친 모양 */
export function FilmStrip({ roll, frames, onSelect }: { roll: Roll; frames: Frame[]; onSelect: (i: number) => void }) {
  const camera = useLiveQuery(() => (roll.cameraId ? db.cameras.get(roll.cameraId) : undefined), [roll.cameraId])
  const fmt = formatInfo[rollCameraFormat(camera, roll)]
  const h = 120
  const w = h * fmt.aspect
  const film = rollFilm(roll)
  // 퍼포레이션: 가장자리 띠에 구멍 모양 마스크를 씌워 뒤 배경이 비쳐 보이게 한다
  const fw = w + 8
  const perf = (top: boolean) => {
    if (fmt.is120) return undefined
    const tw = fw / 8, hy = top ? 4 : 15
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${tw}" height="30"><path fill-rule="evenodd" d="M0 0H${tw}V30H0Z` +
      `M${(tw - 7) / 2 + 1.5} ${hy}h4a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5h-4a1.5 1.5 0 0 1-1.5-1.5v-8a1.5 1.5 0 0 1 1.5-1.5Z"/></svg>`
    const url = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
    return { maskImage: url, WebkitMaskImage: url, maskSize: `${tw}px 30px`, WebkitMaskSize: `${tw}px 30px` }
  }
  return (
    <div className="strip" role="list" aria-label="필름 스트립">
      {frames.map((f, i) => (
        <button key={f.id} className="strip-frame" onClick={() => onSelect(i)} role="listitem" aria-label={`${f.index}번 컷`}>
          <div className="strip-edge" style={{ width: fw, ...perf(true) }}>
            <span>{film ? edgeMarking(film) : ''}</span>
          </div>
          <div className="strip-mid">
            <div className="strip-img" style={{ width: w, height: h }}>
              <Thumb blob={f.thumb} turns={f.rotation} box={[w, h]} />
              {f.favorite && <span className="heart">♥</span>}
            </div>
          </div>
          <div className="strip-edge bottom" style={{ width: fw, ...perf(false) }}>
            <span>{f.index} ▸ {f.index}A</span>
          </div>
        </button>
      ))}
    </div>
  )
}

/** 스트립 칸: 돌린 사진은 돌린 채로 칸을 채운다 */
function Thumb({ blob, turns, box }: { blob?: Blob; turns?: number; box?: [number, number] }) {
  const url = useObjectURL(blob)
  const t = (((turns ?? 0) % 4) + 4) % 4
  if (!url) return null
  if (!t || !box) return <img src={url} alt="" loading="lazy" />
  const [w, h] = box
  const side = t % 2 === 1
  return <img src={url} alt="" loading="lazy" style={{ position: 'absolute', left: '50%', top: '50%', width: side ? h : w, height: side ? w : h,
    transform: `translate(-50%, -50%) rotate(${t * 90}deg)` }} />
}

/** 한 장씩 보기: 좌우로 넘기기, 확대, 하트 */
export function FrameViewer({ frames, start, onClose }: { frames: Frame[]; start: number; onClose: () => void }) {
  const nav = useNav()
  const [i, setI] = useState(start)
  const frame = frames[i]
  const original = useLiveQuery(() => (frame ? db.originals.get(frame.id) : undefined), [frame?.id])
  const live = useLiveQuery(() => (frame ? db.frames.get(frame.id) : undefined), [frame?.id])
  const turns = ((live?.rotation ?? frame?.rotation ?? 0) % 4 + 4) % 4
  const [shown, setShown] = useState<Blob>()
  useEffect(() => {
    const src = original?.blob ?? frame?.thumb
    if (!src) { setShown(undefined); return }
    let live = true
    void rotatedBlob(src, turns).then((b) => { if (live) setShown(b) })
    return () => { live = false }
  }, [original?.blob, frame?.thumb, turns])
  const url = useObjectURL(shown)
  const rotate = (d: number) => { if (frame) void db.frames.update(frame.id, { rotation: ((turns + d) % 4 + 4) % 4 }) }
  const step = (d: number) => setI((x) => Math.min(Math.max(x + d, 0), frames.length - 1))

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') step(1)
      if (e.key === 'ArrowLeft') step(-1)
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [])

  if (!frame) return null
  const fav = live?.favorite ?? frame.favorite
  const roll = useLiveQuery(() => db.rolls.get(frame.rollId), [frame.rollId])
  const shot = meterShotAt(roll?.meterShots, frame.index, roll?.meterOffset ?? 0)
  const isCover = (roll?.coverIndex ?? 1) === frame.index
  return (
    <div className="fullscreen dark" role="dialog" aria-label="사진 보기">
      <div className="fs-bar">
        <button className="btn ghost" onClick={onClose}>닫기</button>
        <h2 style={{ fontVariantNumeric: 'tabular-nums' }}>{i + 1} / {frames.length}</h2>
        <div style={{ display: 'flex', gap: 4 }}>
          <button className="btn ghost icon-btn" aria-label={fav ? '즐겨찾기 해제' : '즐겨찾기'}
            style={{ color: fav ? 'var(--safelight)' : '#fff' }} onClick={() => db.frames.update(frame.id, { favorite: !fav })}>
            <Icon name={fav ? 'heartFill' : 'heart'} />
          </button>
          {original && (
            <button className="btn ghost icon-btn" aria-label="이 사진 갤러리에 저장" style={{ color: '#fff' }} onClick={() => {
              const ext = (frame.name?.split('.').pop() ?? 'jpg').toLowerCase()
              const name = `${String(frame.index).padStart(2, '0')}.${ext}`
              const type = original.blob.type.startsWith('image/') ? original.blob.type : 'image/jpeg'
              const opened = saveToGallery([new File([shown ?? original.blob], name, { type })], name)
              if (opened.kind === 'share') nav.toast('공유 창에서 이미지 저장을 누르면 갤러리 최근 항목에 들어가요.')
              else if (opened.kind === 'file') nav.toast('갤러리에 바로 넣지 못해서 사진 파일로 저장했어요')
              else void saveFile(name, shown ?? original.blob).then((r) => nav.toast(r === 'saved' ? '사진 파일로 저장했어요' : '이 화면에서는 저장할 수 없어요'))
            }}><Icon name="download" /></button>
          )}
        </div>
      </div>
      <div style={{ position: 'relative', minHeight: 0 }}>
        {url && <ZoomView key={`${frame.id}-${turns}`} src={url} background="#000" onSwipe={step} />}
        <button className="btn ghost icon-btn" aria-label="이전" onClick={() => step(-1)} disabled={i === 0}
          style={{ position: 'absolute', left: 8, top: '50%', color: '#fff', background: 'rgb(0 0 0 / 0.4)' }}><Icon name="left" /></button>
        <button className="btn ghost icon-btn" aria-label="다음" onClick={() => step(1)} disabled={i === frames.length - 1}
          style={{ position: 'absolute', right: 8, top: '50%', color: '#fff', background: 'rgb(0 0 0 / 0.4)' }}><Icon name="right" /></button>
      </div>
      <div style={{ textAlign: 'center', padding: '10px 16px calc(14px + env(safe-area-inset-bottom, 0px))', fontSize: 13 }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 28, marginBottom: 6 }}>
          <button className="btn ghost icon-btn" aria-label="왼쪽으로 돌리기" style={{ color: '#fff' }} onClick={() => rotate(-1)}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 8V3.8M4 8h4.2M4.6 8A8 8 0 1 1 4 12" /></svg>
          </button>
          <button className="btn ghost icon-btn" aria-label="오른쪽으로 돌리기" style={{ color: '#fff' }} onClick={() => rotate(1)}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 8V3.8M20 8h-4.2M19.4 8A8 8 0 1 0 20 12" /></svg>
          </button>
        </div>
        {shot ? <div style={{ fontWeight: 600, marginBottom: 2 }}>{exposureText(shot)}</div> : null}
        <div>{[frame.takenAt ? fmtDayTime(frame.takenAt) : undefined, frame.locationName].filter(Boolean).join(' · ')}</div>
        <div style={{ opacity: 0.6 }}>{[resolutionText(frame.w, frame.h), bytesText(frame.bytes)].filter(Boolean).join(' · ')}</div>
        <button className="glass-btn" style={{ marginTop: 10, fontSize: 15 }} disabled={isCover}
          onClick={async () => { await db.rolls.update(frame.rollId, { coverIndex: frame.index }); nav.toast('대표 사진으로 정했어요') }}>
          {isCover ? '대표 사진' : '대표 사진으로 지정'}
        </button>
      </div>
    </div>
  )
}

function headerFor(roll: Roll, camera?: Camera, lensName?: string) {
  const parts = [rollFilmName(roll) + (roll.shotISO ? ` @ ${roll.shotISO}` : '')]
  const name = cameraName(camera, roll)
  if (name && name !== '\u00a0' && name !== '카메라 알 수 없음') {
    parts.push([name, lensName ?? camera?.fixedLens].filter(Boolean).join(' + '))
  }
  parts.push(dateRangeText(roll))
  const places = sortedLocations(roll).map((l) => l.name).filter(Boolean)
  if (places.length) parts.push(places.join(', '))
  if (roll.lab) parts.push(roll.lab)
  return parts.join('  ·  ')
}

/** 밀착 인화지 미리보기. 저장은 만들기를 누른 다음 고른다. */
export function ContactSheetView({ roll, frames, onClose }: { roll: Roll; frames: Frame[]; onClose: () => void }) {
  const nav = useNav()
  const camera = useLiveQuery(() => (roll.cameraId ? db.cameras.get(roll.cameraId) : undefined), [roll.cameraId])
  const lens = useLiveQuery(() => (roll.lensId ? db.lenses.get(roll.lensId) : undefined), [roll.lensId])
  const [useTitle, setUseTitle] = useState(!!roll.note)
  const [title, setTitle] = useState(roll.note ?? '')
  const [info, setInfo] = useState(true)
  const [url, setUrl] = useState<string>()
  const [blob, setBlob] = useState<Blob>()
  const [exporting, setExporting] = useState(false)
  const [canMake, setCanMake] = useState(false)

  useEffect(() => {
    let cancelled = false
    let made: string | undefined
    const t = setTimeout(async () => {
      const bitmaps = await Promise.all(frames.map((f) => (f.thumb ? createImageBitmap(f.thumb).catch(() => undefined) : undefined)))
      const canvas = await renderContactSheet(bitmaps, rollCameraFormat(camera, roll), rollFilm(roll), {
        width: 4200,
        header: info ? headerFor(roll, camera, lens ? `${lens.model}` : undefined) : undefined,
        title: useTitle && title.trim() ? title.trim() : undefined,
      })
      bitmaps.forEach((b) => b?.close())
      const b = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.9))
      if (cancelled || !b) return
      made = URL.createObjectURL(b)
      setBlob(b)
      setUrl((old) => { if (old) URL.revokeObjectURL(old); return made })
    }, url ? 350 : 0)
    return () => { cancelled = true; clearTimeout(t) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frames, camera, lens, useTitle, title, info])

  useEffect(() => {
    const t = window.setTimeout(() => setCanMake(true), 500)
    return () => window.clearTimeout(t)
  }, [])

  const fileName = () => `${(useTitle && title.trim()) || rollTitle(roll, camera)} 밀착.jpg`.replace(/[/\\:]/g, '-')

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
    const name = fileName()
    if (inClaudeHost()) {
      void saveFile(name, blob).then((r) => nav.toast(r === 'saved' ? '밀착 인화 파일로 저장했어요' : '이 화면에서는 저장할 수 없어요'))
      return
    }
    saveFileNow(name, blob)
    nav.toast('밀착 인화 파일로 저장했어요')
  }

  return (
    <div className="fullscreen" role="dialog" aria-label="밀착 인화">
      <div className="fs-bar">
        <button className="btn ghost" onClick={onClose}>닫기</button>
        <h2 className="truncate">{rollFilmName(roll)}</h2>
        <span />
      </div>
      <div style={{ minHeight: 0 }}>
        {url ? <ZoomView src={url} /> : <div className="empty"><div className="spinner" /><span>펼치는 중…</span></div>}
      </div>
      <div style={{ padding: '12px 16px calc(12px + env(safe-area-inset-bottom, 0px))' }}>
        <button className="btn primary block" disabled={!url || !canMake} onClick={() => setExporting(true)}>밀착 인화지로 만들기</button>
      </div>
      {exporting && (
        <Sheet title="밀착 인화지로 만들기" shield onClose={() => setExporting(false)} right={<button className="btn ghost" onClick={() => setExporting(false)}><b>완료</b></button>}>
          <div className="section">
            <div className="group">
              <label className="toggle"><span>제목 넣기</span>
                <input type="checkbox" className="switch" checked={useTitle} onChange={(e) => setUseTitle(e.target.checked)} /></label>
              {useTitle && (
                <div className="field"><label htmlFor="cs-title">제목</label>
                  <input id="cs-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
              )}
            </div>
            {roll.note && <p className="footnote">롤 메모로 제목을 채웠어요.</p>}
          </div>
          <div className="section">
            <div className="group">
              <label className="toggle"><span>촬영 정보 넣기</span>
                <input type="checkbox" className="switch" checked={info} onChange={(e) => setInfo(e.target.checked)} /></label>
            </div>
            <p className="footnote">필름, 카메라, 날짜, 장소, 현상소가 한 줄로 들어가요. 바꾸면 뒤의 미리보기에 바로 반영돼요.</p>
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            <button className="btn primary block" disabled={!blob} onClick={saveGallery}><Icon name="download" /> 갤러리에 저장</button>
            <button className="btn block" disabled={!blob} onClick={saveAsFile}>파일로 저장</button>
          </div>
        </Sheet>
      )}
    </div>
  )
}
