import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, kept } from '../db'
import { useNav } from '../App'
import type { Roll } from '../core/types'
import { lensIdAt } from '../core/types'
import { previewZip, readFiles } from '../core/zip'
import { importScans } from '../core/importer'
import { Progress, Sheet, rollFilmName } from '../ui/common'
import { ImportFlow } from './ImportFlow'
import { ArchiveImport } from './ArchiveImport'

/**
 * 파일 앱 '다음으로 열기'·공유·zip 열기로 받은 파일: 어디로 넣을지 고른 뒤 이어서 진행한다. (아이폰 IncomingImportView와 같은 흐름)
 * 스캔 대기 중인 롤에 넣기 → 한 개면 기존 가져오기, 여러 개면 롤을 한 번에 짝지어 모두 가져오기.
 * 기존 롤로 가져오기 → 한 개면 바로 입력, 여러 개면 대기열에 넣고 차례로.
 */
export function IncomingImport({ files, onClose }: { files: File[]; onClose: () => void }) {
  const nav = useNav()
  const rolls = useLiveQuery(async () => (await db.rolls.where('status').anyOf('finished', 'atLab').toArray()).filter(kept), []) ?? []
  const [step, setStep] = useState<'choose' | 'pending' | 'archive' | 'multi'>('choose')
  const samples = useZipSamples(files)
  const many = files.length > 1

  if (step === 'pending') return <ImportFlow files={files} onClose={onClose} />
  if (step === 'archive') return <ArchiveImport presetFile={files[0]} onClose={onClose} />
  if (step === 'multi') return <MultiRollImport files={files} samples={samples} onClose={onClose} />

  return (
    <Sheet title="스캔 가져오기" onClose={onClose}>
      <div className="section">
        <h2>{many ? `가져올 파일 · ${files.length}개` : '가져올 파일'}</h2>
        <div className="group">
          {files.map((f, i) => <ZipPreviewRow key={i} name={f.name} thumbs={samples[i]} />)}
        </div>
      </div>
      <div className="group">
        <button className="row" onClick={() => setStep(many ? 'multi' : 'pending')}>
          <span className="grow"><b>스캔 대기 중인 롤에 넣기</b>
            <div className="sub">{rolls.length === 0 ? '현상 맡긴 롤이 없으면 새 롤로 만들 수 있어요' : many ? '파일마다 롤을 골라 한 번에 가져와요' : '현상 맡긴 롤 중에서 골라요'}</div>
          </span>
        </button>
        <button className="row" onClick={() => { if (many) { nav.enqueueZipRolls(files); onClose() } else setStep('archive') }}>
          <span className="grow"><b>기존 롤로 가져오기</b>
            <div className="sub">{many ? '대기열에 넣고 차례로 입력해요' : '예전에 찍은 롤을 롤 보관함에 넣어요'}</div>
          </span>
        </button>
      </div>
    </Sheet>
  )
}

/** zip마다 안에 든 사진 몇 장 (아직 읽는 중이면 undefined) */
function useZipSamples(files: File[]) {
  const [samples, setSamples] = useState<(string[] | undefined)[]>([])
  useEffect(() => {
    let cancel = false
    const made: string[] = []
    void (async () => {
      for (let i = 0; i < files.length; i++) {
        const thumbs = await previewZip(files[i], 6).then((p) => p.thumbs).catch(() => [] as string[])
        made.push(...thumbs)
        if (cancel) return
        setSamples((s) => { const n = s.slice(); n[i] = thumbs; return n })
      }
    })()
    return () => { cancel = true; made.forEach((u) => URL.revokeObjectURL(u)) }
  }, [files])
  return samples
}

function ZipPreviewRow({ name, thumbs }: { name: string; thumbs?: string[] }) {
  return (
    <div className="row static" style={{ display: 'grid', gap: 8 }}>
      <b className="truncate" style={{ fontWeight: 500 }}>{name}</b>
      {!thumbs ? <div className="spinner" />
        : thumbs.length === 0 ? <span className="sub">미리 볼 사진이 없어요</span>
          : (
            <div className="strip" style={{ padding: 6, gap: 4, borderRadius: 10 }}>
              {thumbs.map((u, i) => <img key={i} src={u} alt="" style={{ width: 66, height: 46, objectFit: 'cover', flex: '0 0 auto' }} />)}
            </div>
          )}
    </div>
  )
}

/** 여러 zip을 스캔 대기 중인 롤과 한 번에 짝지어 가져온다 (대기열 없이) */
function MultiRollImport({ files, samples, onClose }: { files: File[]; samples: (string[] | undefined)[]; onClose: () => void }) {
  const nav = useNav()
  const all = useLiveQuery(async () => (await db.rolls.where('status').anyOf('finished', 'atLab').reverse().sortBy('loadedAt')).filter(kept), [])
  const rolls: Roll[] = all ? [...all.filter((r) => r.status === 'atLab'), ...all.filter((r) => r.status === 'finished')] : []
  const [pick, setPick] = useState<(string | '')[]>([])
  const [busy, setBusy] = useState<{ roll: number; done: number; total: number } | null>(null)
  const [saved, setSaved] = useState<number | null>(null)
  const [error, setError] = useState<string>()

  // 처음엔 현상 맡긴 롤부터 차례로 짝지어 둔다. 바꿀 수 있다.
  useEffect(() => {
    if (!all || pick.length) return
    setPick(files.map((_, i) => rolls[i]?.id ?? ''))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all])

  const chosen = files.map((f, i) => ({ file: f, roll: rolls.find((r) => r.id === pick[i]) })).filter((x): x is { file: File; roll: Roll } => !!x.roll)

  const saveAll = async () => {
    setError(undefined)
    const lensMap = new Map((await db.lenses.toArray()).map((l) => [l.id, l]))
    let count = 0
    for (const [i, { file, roll }] of chosen.entries()) {
      setBusy({ roll: i + 1, done: 0, total: 0 })
      try {
        const scan = await readFiles([file])
        const camera = roll.cameraId ? await db.cameras.get(roll.cameraId) : undefined
        await importScans(scan.primary, roll, camera, (n) => { const id = lensIdAt(roll, n); return id ? lensMap.get(id) : undefined },
          (p) => setBusy({ roll: i + 1, done: p.done, total: p.total }))
        count += 1
      } catch (e) {
        setError(`${file.name}: ${(e as Error).message}`)
        break
      }
    }
    setBusy(null)
    setSaved(count)
    nav.toast(`${count}롤을 가져왔어요`)
  }

  return (
    <Sheet title="여러 롤 가져오기" onClose={busy ? () => {} : onClose} left={busy ? <span /> : undefined}
      right={saved === null
        ? <button className="btn ghost" disabled={!!busy || chosen.length === 0} onClick={saveAll}><b>가져오기</b></button>
        : <button className="btn ghost" onClick={onClose}><b>완료</b></button>}>
      {saved !== null && <p className="footnote" style={{ color: 'var(--safelight)', marginTop: 8 }}>{saved}롤을 가져왔어요.</p>}
      {busy && (
        <div className="section">
          <Progress done={busy.done} total={busy.total} />
          <p className="footnote">{busy.roll} / {chosen.length}롤 · {busy.done} / {busy.total || '…'}장 저장 중</p>
        </div>
      )}
      {files.map((f, i) => (
        <div className="section" key={i}>
          <div className="group">
            <ZipPreviewRow name={f.name} thumbs={samples[i]} />
            <div className="field">
              <label htmlFor={`mr-${i}`}>롤</label>
              <select id={`mr-${i}`} className="input" value={pick[i] ?? ''} disabled={!!busy || saved !== null}
                onChange={(e) => setPick((p) => { const n = p.slice(); n[i] = e.target.value; return n })}>
                <option value="">고르지 않음</option>
                {rolls.filter((r) => r.id === pick[i] || !pick.includes(r.id)).map((r) => (
                  <option key={r.id} value={r.id}>{rollFilmName(r)} · {r.cameraModel ?? ''}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      ))}
      {all && rolls.length === 0 && <p className="footnote">스캔 대기 중인 롤이 없어요. 하나씩 가져오면 새 롤로 만들 수 있어요.</p>}
      {error && <p className="footnote warn">{error}</p>}
    </Sheet>
  )
}
