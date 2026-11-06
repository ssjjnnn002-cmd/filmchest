import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { NEW_SITE, OLD_SITE, isOldSite, receiveFromOldSite, sendToNewSite } from '../core/move'
import { importAll } from '../core/backup'
import { driveAvailable, driveToken, restoreFromDrive } from '../core/drive'
import { getPref, setPref } from '../platform'
import { Sheet, useToast } from './common'
import { replaceUrl } from '../backStack'

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
  // 예전 주소가 연 창일 때만 기다린다 (주소만 붙여 열었거나 새로 고친 경우는 바로 넘어간다)
  const [receiving, setReceiving] = useState(() => new URLSearchParams(location.search).has('move') && !!window.opener)
  const [asked, setAsked] = useState(() => getPref('moveAsked', '' as string) === '1')
  const [note, setNote] = useState('')
  const [guide, setGuide] = useState(false)
  const empty = useLiveQuery(async () => (await db.cameras.count()) + (await db.rolls.count()) === 0, [])

  useEffect(() => {
    receiveFromOldSite(() => { setPref('moveAsked', '1'); setReceiving(false); setAsked(true); setNote('예전 주소의 기록을 옮겼어요.') })
    if (new URLSearchParams(location.search).has('move') && !window.opener) replaceUrl('/')
    // 2분 안에 못 받으면 기다림을 푼다 (예전 주소 창을 닫은 경우)
    const t = window.setTimeout(() => setReceiving((r) => { if (r) setNote('기록을 받지 못했어요. 예전 주소에서 다시 눌러 주세요.'); return false }), 120_000)
    return () => window.clearTimeout(t)
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
      <Sheet title="기록 옮기기" onClose={() => setNote('')} left={<span />} right={<button className="btn ghost" onClick={() => setNote('')}><b>완료</b></button>}>
        <p className="footnote">{note}</p>
      </Sheet>
    )
  }
  if (guide) return <MoveGuide onClose={() => setGuide(false)} />
  if (asked || empty !== true) return null
  return (
    <Sheet title="예전 기록 불러오기" onClose={close}>
      <div className="section">
        <p className="footnote">
          필름함 주소가 {oldHost}에서 {newHost}로 변경되었습니다.
          서버 사용량 한도 초과로 예전 주소는 11월 30일까지 일시 중단된 상태입니다.
          이용에 불편을 드려 죄송합니다.
        </p>
        <div className="group">
          {driveAvailable && <button className="row accent" onClick={() => run(async () => { await driveToken('consent'); return restoreFromDrive() })}>구글 드라이브에서 불러오기</button>}
          <label className="row accent">백업 파일 불러오기
            <input type="file" accept="application/json,.json" hidden onChange={(e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (file) void run(() => importAll(file))
            }} />
          </label>
          <button className="row accent" onClick={() => setGuide(true)}>백업 없이 지금 옮기기</button>
          <button className="row" onClick={close}>처음 써요</button>
        </div>
        {note && <p className="footnote">{note}</p>}
      </div>
      <div className="section">
        <h2>백업 파일이 없는 경우</h2>
        <p className="footnote">
          위의 '백업 없이 지금 옮기기'를 눌러 안내에 따라 진행해 주세요. 기록과 사진이 새 주소로 그대로 옮겨집니다.
          11월 30일 이후에는 예전 주소({oldHost})에 접속해 '기록 옮기고 새 주소로 가기' 버튼만 눌러도 됩니다.
        </p>
        <p className="footnote" style={{ color: 'var(--danger)' }}>
          기록은 예전 주소를 사용하던 브라우저 안에만 저장되어 있습니다.
          옮기기 전까지 해당 브라우저의 방문 기록, 쿠키, 사이트 데이터를 삭제하지 마세요. 삭제하면 복구할 수 없습니다.
        </p>
      </div>
    </Sheet>
  )
}

// 예전 주소에서 누를 북마크: 새 주소의 move-out.js를 그 주소 위에서 불러온다
const bookmarklet = `javascript:(function(){var s=document.createElement('script');s.src='${NEW_SITE}/move-out.js?'+Date.now();document.body.appendChild(s)})()`
const device = /iPhone|iPad|iPod/.test(navigator.userAgent) ? 'ios' : /Android/.test(navigator.userAgent) ? 'android' : 'pc'

/** 백업 없이 예전 주소의 기록을 옮기는 법: 북마크 하나 만들고 예전 주소에서 누르기 */
export function MoveGuide({ onClose }: { onClose: () => void }) {
  const [toastNode, toast] = useToast()
  const drag = useRef<HTMLAnchorElement>(null)
  // 리액트는 javascript: 주소를 막아서 직접 넣는다
  useEffect(() => { drag.current?.setAttribute('href', bookmarklet) }, [])
  const copy = async () => {
    try { await navigator.clipboard.writeText(bookmarklet); toast('복사했어요') } catch { toast('복사하지 못했어요') }
  }
  const steps: Record<typeof device, string[]> = {
    ios: [
      '아래 \'코드 복사\'를 눌러요.',
      '사파리 아래쪽 공유 버튼 → \'북마크 추가\' → 이름을 \'필름함 옮기기\'로 저장해요.',
      '책 모양 북마크 버튼 → \'편집\' → \'필름함 옮기기\'를 눌러 주소를 모두 지우고 붙여 넣어요.',
      '아래 \'예전 주소 열기\'를 눌러요. 오류 화면이 떠도 괜찮아요.',
      '그 화면에서 북마크 → \'필름함 옮기기\'를 누르고, 뜨는 \'기록 옮기기\'를 눌러요.',
    ],
    android: [
      '아래 \'코드 복사\'를 눌러요.',
      '크롬 오른쪽 위 ⋮ → ☆ 를 눌러 북마크하고, \'수정\'을 눌러요.',
      '이름은 \'필름함 옮기기\', 주소는 모두 지우고 붙여 넣은 뒤 저장해요.',
      '아래 \'예전 주소 열기\'를 눌러요. 오류 화면이 떠도 괜찮아요.',
      '주소창에 \'필름함 옮기기\'를 쳐서 아래 뜨는 북마크(☆)를 누르고, 뜨는 \'기록 옮기기\'를 눌러요.',
    ],
    pc: [
      '아래 \'필름함 옮기기\' 버튼을 브라우저 위쪽 북마크바로 끌어다 놓아요. (북마크바가 안 보이면 Ctrl+Shift+B, 맥은 ⌘+Shift+B)',
      '아래 \'예전 주소 열기\'를 눌러요. 오류 화면이 떠도 괜찮아요.',
      '그 화면에서 북마크바의 \'필름함 옮기기\'를 누르고, 뜨는 \'기록 옮기기\'를 눌러요.',
    ],
  }
  return (
    <Sheet title="백업 없이 옮기기" onClose={onClose}>
      <div className="section">
        <p className="footnote">예전에 필름함을 쓰던 기기, 그 브라우저에서 해 주세요.</p>
        <ol className="move-steps">{steps[device].map((t, i) => <li key={i}>{t}</li>)}</ol>
        <div className="group">
          {device === 'pc'
            ? <a ref={drag} className="row accent" onClick={(e) => { e.preventDefault(); toast('누르지 말고 북마크바로 끌어다 놓아요') }}>필름함 옮기기</a>
            : <button className="row accent" onClick={copy}>코드 복사</button>}
          <a className="row accent" href={OLD_SITE} target="_blank" rel="noopener">예전 주소 열기</a>
        </div>
        <p className="footnote">기록과 사진이 새 주소로 옮겨지면 새 창에 '기록을 옮겼어요'가 떠요.</p>
      </div>
      {toastNode}
    </Sheet>
  )
}
