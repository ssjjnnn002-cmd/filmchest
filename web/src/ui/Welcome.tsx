import { useState } from 'react'
import { signInWithGoogle, driveAvailable, driveToken, restoreFromDrive } from '../core/drive'
import { importAll } from '../core/backup'
import { OLD_SITE, NEW_SITE } from '../core/move'
import { setPref } from '../platform'
import { Sheet } from './common'
import { MoveGuide } from './MoveNotice'

const oldHost = OLD_SITE.replace('https://', '')
const newHost = NEW_SITE.replace('https://', '')

/** 처음 켤 때 한 번: 구글 시작 + 예전 서버 기록 옮기기 */
export function Welcome({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<string>()
  const [result, setResult] = useState<string>()
  const [error, setError] = useState<string>()
  const [guide, setGuide] = useState(false)
  const [note, setNote] = useState<string>()
  const finish = () => {
    setPref('welcomeSeen', '1')
    setPref('moveAsked', '1')
    onDone()
  }
  const start = async () => {
    if (step) return
    setError(undefined)
    try {
      const r = await signInWithGoogle(setStep)
      setResult(r.rolls || r.cameras
        ? `카메라 ${r.cameras}대, 롤 ${r.rolls}개${r.photos ? `, 사진 ${r.photos}장` : ''}을 받았어요.`
        : '연결했어요. 이제 기록과 사진이 내 구글 드라이브에 저장돼요.')
    } catch (e) {
      setError((e as Error).message || '로그인하지 못했어요.')
    } finally { setStep(undefined) }
  }
  const run = async (job: () => Promise<{ cameras: number; rolls: number }>) => {
    if (step) return
    setError(undefined)
    setStep('불러오는 중…')
    try {
      const c = await job()
      setResult(`카메라 ${c.cameras}대, 롤 ${c.rolls}개를 불러왔어요.`)
    } catch (e) {
      setNote((e as Error).message || '불러오지 못했어요.')
    } finally { setStep(undefined) }
  }

  return (
    <>
      <Sheet title="필름함 시작하기" onClose={finish} left={<span />}>
        <div className="welcome">
          <img src="./icon-192.png?v=2" alt="" width={84} height={84} />
          <p>구글 계정으로 시작하면 기록과 사진이 <b>내 구글 드라이브</b>에 저장돼요.<br />다른 기기에서 같은 계정으로 들어오면 그대로 이어져요.</p>
        </div>
        <div className="group">
          {result
            ? <button className="row accent" onClick={finish}><span className="grow">{result}</span><b>시작</b></button>
            : step
              ? <div className="row static"><span className="grow"><b>{step}</b></span></div>
              : <>
                <button className="row accent" onClick={start}><span className="grow sub">처음이에요</span><b>구글로 시작하기</b></button>
                <button className="row accent" onClick={start}><span className="grow sub">계정이 있어요</span><b>구글로 로그인하기</b></button>
              </>}
          {!result && <button className="row" disabled={!!step} onClick={finish}>로그인 없이 쓰기</button>}
        </div>
        {error && <p className="footnote" style={{ color: 'var(--danger)' }}>{error}</p>}
        <p className="footnote">필름함 서버에는 아무것도 올라가지 않아요. 나중에 설정에서도 로그인할 수 있어요.</p>

        {!result ? (
          <>
            <div className="section">
              <h2>예전 기록 불러오기</h2>
              <p className="footnote">
                필름함 주소가 {oldHost}에서 {newHost}로 변경되었습니다.
                서버 사용량 한도 초과로 예전 주소는 11월 30일까지 일시 중단된 상태입니다.
                이용에 불편을 드려 죄송합니다.
              </p>
              <div className="group">
                {driveAvailable && (
                  <button className="row accent" disabled={!!step} onClick={() => run(async () => { await driveToken('consent'); return restoreFromDrive() })}>
                    구글 드라이브에서 불러오기
                  </button>
                )}
                <label className={`row accent${step ? ' disabled' : ''}`}>
                  백업 파일 불러오기
                  <input type="file" accept="application/json,.json" hidden disabled={!!step} onChange={(e) => {
                    const file = e.target.files?.[0]
                    e.target.value = ''
                    if (file) void run(() => importAll(file))
                  }} />
                </label>
                <button className="row accent" disabled={!!step} onClick={() => setGuide(true)}>예전 서버에서 바로 불러오기</button>
                <button className="row" disabled={!!step} onClick={finish}>처음 써요</button>
              </div>
              {note && <p className="footnote">{note}</p>}
            </div>
            <div className="section">
              <h2>백업 파일이 없는 경우</h2>
              <p className="footnote">
                위의 &apos;예전 서버에서 바로 불러오기&apos;를 눌러 안내에 따라 진행해 주세요. 기록과 사진이 새 주소로 그대로 옮겨집니다.
                11월 30일 이후에는 예전 주소({oldHost})에 접속해 &apos;기록 옮기고 새 주소로 가기&apos; 버튼만 눌러도 됩니다.
              </p>
              <p className="footnote" style={{ color: 'var(--danger)' }}>
                기록은 예전 주소를 사용하던 브라우저 안에만 저장되어 있습니다.
                옮기기 전까지 해당 브라우저의 방문 기록, 쿠키, 사이트 데이터를 삭제하지 마세요. 삭제하면 복구할 수 없습니다.
              </p>
            </div>
          </>
        ) : null}
      </Sheet>
      {guide && <MoveGuide onClose={() => setGuide(false)} />}
    </>
  )
}
