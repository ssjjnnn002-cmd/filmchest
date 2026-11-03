import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { useNav } from '../App'
import type { GeoPoint, Roll } from '../core/types'
import { uid } from '../core/types'
import { allFilms, filmDisplayName, filmFromText } from '../core/films'
import { isZipFile, previewZip, readFiles } from '../core/zip'
import { LabField, rememberLab } from './Editors'
import { importScans, thumbnail } from '../core/importer'
import { Progress, Sheet, toInputDate } from '../ui/common'
import { PlacePicker } from './Editors'

/** 예전에 찍어 스캔본을 받아 둔 롤을 롤 보관함에 넣는다. 모르는 정보는 '알 수 없음'. */
export function ArchiveImport({ onClose, presetFile, presetFiles, stepLabel, onSaved }: {
  onClose: () => void
  presetFile?: File
  /** 공유로 받은 사진 묶음 (한 롤) */
  presetFiles?: File[]
  stepLabel?: string
  onSaved?: () => void
}) {
  const nav = useNav()
  const cameras = useLiveQuery(() => db.cameras.orderBy('sortOrder').filter((c) => !c.deletedAt).toArray(), []) ?? []
  const [files, setFiles] = useState<File[]>(presetFile ? [presetFile] : presetFiles ?? [])
  const [cameraId, setCameraId] = useState('')
  const [filmId, setFilmId] = useState('')
  const [dateKnown, setDateKnown] = useState(false)
  const [date, setDate] = useState(Date.now())
  const [place, setPlace] = useState('')
  const [point, setPoint] = useState<GeoPoint>()
  const [lab, setLab] = useState('')
  const [memo, setMemo] = useState('')
  const [progress, setProgress] = useState<{ done: number; total: number }>()
  const [error, setError] = useState<string>()
  const [thumbs, setThumbs] = useState<string[]>([])
  // 미리보기 칸마다 원본 (눌러서 크게 볼 때)
  const [sources, setSources] = useState<(() => Promise<Blob>)[]>([])
  const [viewing, setViewing] = useState<number>()

  useEffect(() => {
    const zipFile = presetFile ?? files.find(isZipFile)
    const images = zipFile ? [] : [...(presetFiles ?? []), ...files].filter((f) => f.type.startsWith('image/'))
    setThumbs([]); setSources([])
    let urls: string[] = []
    let cancel = false
    // 한 장씩 작은 미리보기를 만들어 차례로 채운다 (36장이어도 앞쪽부터 바로 보인다)
    const fill = async (loads: (() => Promise<Blob>)[]) => {
      setSources(loads)
      for (const load of loads) {
        if (cancel) return
        const { thumb } = await thumbnail(await load(), 360).catch(() => ({ thumb: undefined }))
        if (cancel) return
        const url = thumb ? URL.createObjectURL(thumb) : ''
        if (url) urls = [...urls, url]
        setThumbs((t) => [...t, url])
      }
    }
    if (zipFile) {
      previewZip(zipFile).then(({ paths, items }) => {
        if (cancel) return
        const folders = [...new Set(paths.map((p) => (p.includes('/') ? p.slice(0, p.lastIndexOf('/')) : '')).filter(Boolean))]
        const storedCopy = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(zipFile.name)
        const guess = (storedCopy ? undefined : filmFromText(zipFile.name)) ?? filmFromText(folders.join('\n'))
        if (guess) setFilmId((cur) => cur || guess)
        return fill(items.map((it) => it.load))
      }).catch(() => {})
    } else if (images.length) {
      void fill(images.map((f) => async () => f))
    }
    return () => { cancel = true; urls.forEach((u) => URL.revokeObjectURL(u)) }
  }, [presetFile, presetFiles, files])

  const save = async () => {
    setError(undefined)
    try {
      setProgress({ done: 0, total: 0 })
      const scan = await readFiles(files)
      rememberLab(lab)
      const camera = cameras.find((c) => c.id === cameraId)
      const roll: Roll = {
        id: uid(), cameraId: camera?.id, cameraBrand: camera?.brand, cameraModel: camera?.model, cameraFormat: camera?.format, cameraFixedLens: camera?.fixedLens,
        filmId, status: 'atLab', loadedAt: dateKnown ? date : Date.now(),
        days: dateKnown ? [{ id: uid(), startedAt: date, startFrame: 1 }] : [],
        locations: place.trim() || point ? [{ id: uid(), startFrame: 1, name: place.trim(), point }] : [],
        lab: lab.trim() || undefined, note: memo.trim() || undefined, favorite: false, isArchive: true,
      }
      await db.rolls.add(roll)
      await importScans(scan.primary, roll, camera, () => undefined, setProgress)
      nav.toast(`${scan.primary.files.length}장을 롤 보관함에 넣었어요`)
      if (onSaved) onSaved()
      else onClose()
    } catch (e) {
      setProgress(undefined)
      setError(`가져오지 못했어요. (${(e as Error).message})`)
    }
  }

  const busy = !!progress
  return (
    <Sheet shield={!!presetFile} title={stepLabel ? `기존 롤 ${stepLabel}` : '기존 롤 가져오기'} onClose={busy ? () => {} : onClose} left={busy ? <span /> : undefined}
      right={<button className="btn ghost" disabled={!files.length || busy} onClick={save}><b>가져오기</b></button>}>
      {busy ? (
        <div className="empty">
          <b>가져오는 중</b>
          <div style={{ width: '100%' }}><Progress done={progress.done} total={progress.total} /></div>
          <span>{progress.done} / {progress.total || '…'}</span>
        </div>
      ) : (
        <>
          <div className="section">
            <h2>사진</h2>
            <div className="group">
              {presetFile || presetFiles?.length ? (
                <div className="row static"><span className="grow">{presetFile ? presetFile.name : `공유한 사진 ${presetFiles!.length}장`}</span></div>
              ) : (
                <>
                  <label className="row" style={{ color: 'var(--safelight)' }}>
                    사진 또는 zip 고르기
                    <input type="file" accept="image/*,.zip,application/zip" multiple hidden onChange={(e) => setFiles([...(e.target.files ?? [])])} />
                  </label>
                  <label className="row" style={{ color: 'var(--safelight)' }}>
                    폴더 통째로 고르기
                    <input type="file" multiple hidden {...{ webkitdirectory: '' }} onChange={(e) => setFiles([...(e.target.files ?? [])])} />
                  </label>
                  {files.length > 0 && <div className="row static sub">파일 {files.length}개 선택함</div>}
                </>
              )}
            </div>
            {thumbs.length > 0 && (
              <>
                <div className="thumb-grid">
                  {thumbs.map((src, i) => (
                    <button key={i} type="button" onClick={() => setViewing(i)} aria-label={`${i + 1}번 크게 보기`}>
                      {src && <img src={src} alt="" />}
                      <span>{i + 1}</span>
                    </button>
                  ))}
                </div>
                <p className="footnote">사진 {sources.length}장{thumbs.length < sources.length ? ` · 미리보기 ${thumbs.length}장 만드는 중` : ''}</p>
              </>
            )}
            <p className="footnote">{presetFile ? '사진을 보고 카메라와 필름을 채워 주세요. 폴더 이름에 필름이 있으면 미리 넣어 둬요. 닫아도 대기열에 남아요.' : '파일명 순서대로 컷 번호가 붙어요.'}</p>
            {presetFile && <button className="btn" type="button" onClick={onClose}>나중에 이어하기</button>}
          </div>

          <div className="section"><div className="group">
            <div className="field"><label htmlFor="a-cam">카메라</label>
              <select id="a-cam" className="input" value={cameraId} onChange={(e) => setCameraId(e.target.value)}>
                <option value="">알 수 없음</option>
                {cameras.map((c) => <option key={c.id} value={c.id}>{c.brand} {c.model}</option>)}
              </select></div>
            <div className="field"><label htmlFor="a-film">필름</label>
              <select id="a-film" className="input" value={filmId} onChange={(e) => setFilmId(e.target.value)}>
                <option value="">알 수 없음</option>
                {allFilms().map((f) => <option key={f.id} value={f.id}>{filmDisplayName(f)}</option>)}
              </select></div>
            <label className="toggle"><span>촬영일 알아요</span>
              <input type="checkbox" className="switch" checked={dateKnown} onChange={(e) => setDateKnown(e.target.checked)} /></label>
            {dateKnown && (
              <div className="field"><label htmlFor="a-date">촬영일</label>
                <input id="a-date" type="date" className="input" value={toInputDate(date)}
                  onChange={(e) => e.target.value && setDate(new Date(`${e.target.value}T12:00:00`).getTime())} /></div>
            )}
          </div>
          {!dateKnown && <p className="footnote">알 수 없음으로 두면 사진에 원래 들어 있던 날짜를 그대로 둬요.</p>}
          </div>

          <PlacePicker name={place} point={point} onChange={(n, p) => { setPlace(n); setPoint(p) }} />

          <div className="section"><div className="group">
            <LabField id="a-lab" value={lab} onChange={setLab} />
            <div className="field"><label htmlFor="a-memo">메모</label>
              <textarea id="a-memo" className="input" value={memo} onChange={(e) => setMemo(e.target.value)} /></div>
          </div></div>
          {error && <p className="footnote warn">{error}</p>}
        </>
      )}
      {viewing !== undefined && <PreviewPager sources={sources} start={viewing} onClose={() => setViewing(undefined)} />}
    </Sheet>
  )
}

/** 미리보기를 눌렀을 때: 한 장씩 크게, 옆으로 넘겨 본다 */
function PreviewPager({ sources, start, onClose }: { sources: (() => Promise<Blob>)[]; start: number; onClose: () => void }) {
  const [page, setPage] = useState(start)
  const [url, setUrl] = useState<string>()
  const touch = useRef<number>()
  useEffect(() => {
    let cancel = false
    let made: string | undefined
    setUrl(undefined)
    void sources[page]().then((b) => { if (cancel) return; made = URL.createObjectURL(b); setUrl(made) })
    return () => { cancel = true; if (made) URL.revokeObjectURL(made) }
  }, [page, sources])
  const go = (d: number) => setPage((p) => Math.min(sources.length - 1, Math.max(0, p + d)))
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'ArrowRight') go(1); else if (e.key === 'ArrowLeft') go(-1); else if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  })
  return createPortal(
    <div className="preview-pager" onTouchStart={(e) => { touch.current = e.touches[0].clientX }}
      onTouchEnd={(e) => { const s = touch.current; if (s === undefined) return; const dx = e.changedTouches[0].clientX - s; if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1) }}>
      <div className="preview-top">
        <b>{page + 1} / {sources.length}</b>
        <button className="btn" onClick={onClose}>닫기</button>
      </div>
      {url ? <img src={url} alt="" /> : <span className="sub">불러오는 중…</span>}
      {page > 0 && <button className="preview-nav prev" onClick={() => go(-1)} aria-label="이전">‹</button>}
      {page < sources.length - 1 && <button className="preview-nav next" onClick={() => go(1)} aria-label="다음">›</button>}
    </div>,
    document.body,
  )
}
