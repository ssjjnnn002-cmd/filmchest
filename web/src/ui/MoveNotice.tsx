import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { NEW_SITE, OLD_SITE, isOldSite, receiveFromOldSite, sendToNewSite } from '../core/move'
import { importAll } from '../core/backup'
import { driveAvailable, driveToken, restoreFromDrive } from '../core/drive'
import { getPref, setPref } from '../platform'
import { Sheet } from './common'

const newHost = NEW_SITE.replace('https://', '')
const oldHost = OLD_SITE.replace('https://', '')

/** 예전 주소: 새 주소 안내와 기록 옮기기. 새 주소: 예전 기록 받기·불러오기 */
export function MoveNotice() {
  return isOldSite ? <OldSiteNotice /> : <NewSiteWelcome />
}

function OldSiteNotice() {
  const [state, setState] = useState<'idle' | 'moving' | 'done'>('idle')
  const [err, setErr] = useState('')
  const move = async () => {
    setErr(''); setState('moving')
    try { await sendToNewSite(); setState('done') } catch (e) { setErr((e as Error).message); setState('idle') }
  }
  return (
    <Sheet title="주소가 바뀌었어요" onClose={() => {}} left={<span />}>
      <div className="section">
        <div className="group">
          <div className="row static"><span className="grow">새 주소</span><b>{newHost}</b></div>
        </div>
        <p className="footnote">이 주소는 곧 닫혀요. 아래 버튼을 누르면 이 브라우저의 기록과 사진이 새 주소로 그대로 옮겨져요.</p>
      </div>
      <div className="group">
        {state === 'done'
          ? <a className="row accent" href={NEW_SITE}>새 주소 열기</a>
          : <button className="row accent" disabled={state === 'moving'} onClick={move}>{state === 'moving' ? '옮기는 중…' : '기록 옮기고 새 주소로 가기'}</button>}
      </div>
      {state === 'done' && <p className="footnote">다 옮겼어요. 이제 새 주소를 쓰세요. 홈 화면에 추가해 두셨다면 새 주소로 다시 추가해 주세요.</p>}
      {err && <p className="footnote" style={{ color: 'var(--danger)' }}>{err}</p>}
    </Sheet>
  )
}

function NewSiteWelcome() {
  const [receiving, setReceiving] = useState(() => new URLSearchParams(location.search).has('move'))
  const [asked, setAsked] = useState(() => getPref('moveAsked', '' as string) === '1')
  const [note, setNote] = useState('')
  const empty = useLiveQuery(async () => (await db.cameras.count()) + (await db.rolls.count()) === 0, [])

  useEffect(() => {
    receiveFromOldSite(() => { setPref('moveAsked', '1'); setReceiving(false); setAsked(true); setNote('예전 주소의 기록을 옮겼어요.') })
  }, [])

  const close = () => { setPref('moveAsked', '1'); setAsked(true) }
  const run = async (job: () => Promise<{ cameras: number; rolls: number }>) => {
    try { const c = await job(); setNote(`카메라 ${c.cameras}대, 롤 ${c.rolls}개를 불러왔어요.`); setPref('moveAsked', '1') }
    catch (e) { setNote((e as Error).message || '불러오지 못했어요.') }
  }

  if (receiving) {
    return (
      <Sheet title="기록 옮기기" onClose={() => {}} left={<span />}>
        <p className="footnote">예전 주소에서 기록을 받는 중이에요. 이 창을 닫지 마세요.</p>
      </Sheet>
    )
  }
  if (note && asked) {
    return (
      <Sheet title="기록 옮기기" onClose={() => setNote('')} right={<button className="btn ghost" onClick={() => setNote('')}><b>완료</b></button>}>
        <p className="footnote">{note}</p>
      </Sheet>
    )
  }
  if (asked || empty !== true) return null
  return (
    <Sheet title="예전 기록 불러오기" onClose={close} right={<button className="btn ghost" onClick={close}><b>닫기</b></button>}>
      <div className="section">
        <p className="footnote">필름함 주소가 {oldHost}에서 {newHost}로 바뀌었어요. 예전 주소에서 쓰던 기록이 있다면 불러오세요.</p>
        <div className="group">
          {driveAvailable && <button className="row accent" onClick={() => run(async () => { await driveToken('consent'); return restoreFromDrive() })}>구글 드라이브에서 불러오기</button>}
          <label className="row accent">백업 파일 불러오기
            <input type="file" accept="application/json,.json" hidden onChange={(e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (file) void run(() => importAll(file))
            }} />
          </label>
          <button className="row" onClick={close}>처음 써요</button>
        </div>
        {note && <p className="footnote">{note}</p>}
        <p className="footnote">백업이 없다면: 예전 주소가 다시 열리면({oldHost}) 그곳에서 '기록 옮기고 새 주소로 가기'를 누르세요. 사진까지 한 번에 옮겨져요.</p>
      </div>
    </Sheet>
  )
}
