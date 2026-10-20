import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { useNav } from '../App'
import type { GeoPoint, Roll } from '../core/types'
import { uid } from '../core/types'
import { allFilms, filmDisplayName, filmFromText } from '../core/films'
import { isZipFile, previewZip, readFiles } from '../core/zip'
import { LabField, rememberLab } from './Editors'
import { importScans } from '../core/importer'
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

  useEffect(() => {
    const file = presetFile ?? files.find(isZipFile)
    if (!file) { setThumbs([]); return }
    let urls: string[] = []
    let cancel = false
    previewZip(file).then(({ paths, thumbs: next }) => {
      if (cancel) { next.forEach((u) => URL.revokeObjectURL(u)); return }
      urls = next
      setThumbs(next)
      const folders = [...new Set(paths.map((p) => (p.includes('/') ? p.slice(0, p.lastIndexOf('/')) : '')).filter(Boolean))]
      const storedCopy = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(file.name)
      const guess = (storedCopy ? undefined : filmFromText(file.name)) ?? filmFromText(folders.join('\n'))
      if (guess) setFilmId((cur) => cur || guess)
    }).catch(() => { if (!cancel) setThumbs([]) })
    return () => { cancel = true; urls.forEach((u) => URL.revokeObjectURL(u)) }
  }, [presetFile, files])

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
              <div className="thumb-row">{thumbs.map((src) => <img key={src} src={src} alt="" />)}</div>
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
    </Sheet>
  )
}
