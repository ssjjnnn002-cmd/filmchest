import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, kept } from '../db'
import { useNav } from '../App'
import type { Roll } from '../core/types'
import { Confirm, Icon, PageHeader, Sheet } from '../ui/common'
import { RollRow } from '../ui/RollRow'
import { LabDropOff } from './Editors'
import { ArchiveImport } from './ArchiveImport'
import { isZipFile } from '../core/zip'
import { SettingsButton } from './Settings'

export function Pending() {
  const nav = useNav()
  const rolls = useLiveQuery(async () => (await db.rolls.where('status').anyOf('finished', 'atLab').reverse().sortBy('loadedAt')).filter(kept), []) ?? []
  const [dropOff, setDropOff] = useState<Roll>()
  const [clearQueue, setClearQueue] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const atLab = rolls.filter((r) => r.status === 'atLab')
  const finished = rolls.filter((r) => r.status === 'finished')

  return (
    <>
      <PageHeader title="현상 스캔"
        left={<SettingsButton />}
        actions={<ArchiveImportButton />} />

      {nav.zipQueue.length > 0 && (
        <div className="section">
          <h2 className="section-title">
            <span>가져오기 대기열 · {nav.zipQueue.length}</span>
            <button className="btn ghost small" style={{ color: 'var(--danger)' }} onClick={() => setClearQueue(true)}>모두 비우기</button>
          </h2>
          <div className="group">
            {nav.zipQueue.map((job) => (
              <div key={job.id} className="row static">
                <button className="grow" style={{ border: 0, background: 'none', padding: 0, textAlign: 'left', cursor: 'pointer', minWidth: 0 }}
                  onClick={() => nav.resumeZip(job.id)}>
                  <b className="truncate" style={{ display: 'block' }}>{job.file.name}</b>
                  <span className="sub">{job.index} / {job.total}{nav.activeZipId === job.id ? ' · 지금' : ''}</span>
                </button>
                <button className="queue-remove" aria-label={`${job.file.name} 대기열에서 삭제`} onClick={() => nav.dropZip(job.id)}>
                  <Icon name="trash" size={19} />
                </button>
              </div>
            ))}
          </div>
          <p className="footnote">닫아도 여기 남아요. 줄을 누르면 이어서 입력해요.</p>
        </div>
      )}
      {clearQueue && (
        <Confirm message={`대기열의 zip ${nav.zipQueue.length}개를 모두 지울까요?`} action="모두 지우기"
          onCancel={() => setClearQueue(false)}
          onConfirm={() => { nav.zipQueue.forEach((job) => nav.dropZip(job.id)); setClearQueue(false) }} />
      )}

      <div className="group">
        <button className="row accent" onClick={() => fileInput.current?.click()}>
          <Icon name="zip" size={24} /> <span className="grow">zip 파일 열기</span>
        </button>
        <input ref={fileInput} type="file" accept=".zip,application/zip,image/*" multiple hidden
          onChange={(e) => { const f = [...(e.target.files ?? [])]; e.target.value = ''; if (!f.length) return; if (f.every(isZipFile)) nav.receiveZips(f); else nav.importScans(f) }} />
      </div>
      <p className="footnote" style={{ marginTop: 8 }}>현상소에서 받은 zip을 고르세요. 사진 여러 장을 골라도 돼요.</p>
      {__SAMPLE_ZIP__ && (
        <button className="btn small" style={{ marginTop: 10 }} onClick={async () => {
          const blob = await (await fetch(__SAMPLE_ZIP__)).blob()
          nav.importScans([new File([blob], 'sample.zip', { type: 'application/zip' })])
        }}>개발용: 샘플 zip 불러오기</button>
      )}

      <DropZone />

      {atLab.length > 0 && (
        <div className="section">
          <h2>현상 맡김 · {atLab.length}</h2>
          <div className="group">
            {atLab.map((r) => (
              // 옆에 두면 이름이 잘려서 버튼은 아래에 넓게 (아이폰과 같음)
              <div key={r.id} className="row static" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
                <button style={{ border: 0, background: 'none', padding: 0, textAlign: 'left', cursor: 'pointer', minWidth: 0 }}
                  onClick={() => nav.push({ type: 'roll', id: r.id })}><RollRow roll={r} /></button>
                <ScanButton rollId={r.id} label="불러오기" block />
              </div>
            ))}
          </div>
        </div>
      )}

      {finished.length > 0 && (
        <div className="section">
          <h2>촬영 완료 · {finished.length}</h2>
          <div className="group">
            {finished.map((r) => (
              // 옆에 두면 이름이 잘려서 버튼은 아래에 넓게 (아이폰과 같음)
              <div key={r.id} className="row static" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
                <button style={{ border: 0, background: 'none', padding: 0, textAlign: 'left', cursor: 'pointer', minWidth: 0 }}
                  onClick={() => nav.push({ type: 'roll', id: r.id })}><RollRow roll={r} /></button>
                <button className="btn soft small" style={{ width: '100%' }} onClick={() => setDropOff(r)}>현상소 고르기</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {atLab.length + finished.length + nav.zipQueue.length === 0 && <div className="empty"><Icon name="stack" size={40} /><b>현상할 롤이 없어요</b></div>}

      {dropOff && <LabDropOff roll={dropOff} onClose={() => setDropOff(undefined)} />}
    </>
  )
}

export function ScanButton({ rollId, label = '스캔 불러오기', block, row }: { rollId: string; label?: string; block?: boolean; row?: boolean }) {
  const nav = useNav()
  const input = useRef<HTMLInputElement>(null)
  return (
    <>
      <button className={row ? 'row accent' : 'btn primary small'} style={block ? { width: '100%' } : undefined} onClick={() => input.current?.click()}>{label}</button>
      <input ref={input} type="file" accept=".zip,application/zip,image/*" multiple hidden
        onChange={(e) => { const f = [...(e.target.files ?? [])]; if (f.length) nav.importScans(f, rollId); e.target.value = '' }} />
    </>
  )
}

/** 파일을 끌어다 놓기 (넓은 화면) */
function DropZone() {
  const nav = useNav()
  const [over, setOver] = useState(false)
  return (
    <div onDragOver={(e) => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); const f = [...e.dataTransfer.files]; if (!f.length) return; if (f.every(isZipFile)) nav.receiveZips(f); else nav.importScans(f) }}
      className="dropzone" style={{ borderColor: over ? 'var(--safelight)' : undefined, color: over ? 'var(--safelight)' : undefined }}>
      zip이나 사진을 여기에 놓으세요
    </div>
  )
}

/** 오른쪽 위 + : 기존 롤 가져오기 (한 롤 / 여러 롤). 현상 스캔·롤 보관함에서 같은 창 */
export function ArchiveImportButton({ bare }: { bare?: boolean }) {
  const nav = useNav()
  const [archive, setArchive] = useState(false)
  const [choice, setChoice] = useState(false)
  const multiInput = useRef<HTMLInputElement>(null)
  return (
    <>
      <button className={bare ? undefined : 'glass-btn round'} onClick={() => setChoice(true)} aria-label="기존 롤 가져오기"><Icon name="plus" /></button>
      <input ref={multiInput} type="file" accept=".zip,application/zip" multiple hidden
        onChange={(e) => {
          const files = [...(e.target.files ?? [])]
          e.target.value = ''
          setChoice(false)
          if (files.length) nav.enqueueZipRolls(files)
        }} />
      {archive && <ArchiveImport onClose={() => setArchive(false)} />}
      {choice && (
        <Sheet title="기존 롤 가져오기" onClose={() => setChoice(false)}>
          <div className="group">
            <button className="row" onClick={() => { setChoice(false); setArchive(true) }}>
              <span className="grow"><b>한 롤</b><div className="sub">사진이나 zip 하나를 바로 입력해요</div></span>
            </button>
            <button className="row" onClick={() => multiInput.current?.click()}>
              <span className="grow"><b>여러 롤</b><div className="sub">zip을 여러 개 고르면 대기열에서 차례로 입력해요</div></span>
            </button>
          </div>
        </Sheet>
      )}
    </>
  )
}
