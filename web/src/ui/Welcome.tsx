import { useState } from 'react'
import { signInWithGoogle } from '../core/drive'
import { importAll } from '../core/backup'
import { isOldSite } from '../core/move'
import { setPref } from '../platform'
import { Sheet } from './common'
import { MoveGuide, MoveInfo } from './MoveNotice'

/** 처음 켤 때 한 번: 구글로 시작하기 · 로그인 없이 쓰기 · 기록 불러오기.
 *  설정의 '구글로 로그인'에서 열면(loginOnly) 로그인 칸만 보인다. 아이폰·갤럭시와 같은 구성 (예전 주소 옮기기만 웹에 있음) */
export function Welcome({ onDone, loginOnly = false }: { onDone: () => void; loginOnly?: boolean }) {
  const [step, setStep] = useState<string>()
  const [result, setResult] = useState<string>()
  const [error, setError] = useState<string>()
  const [guide, setGuide] = useState(false)
  const finish = () => {
    setPref('welcomeSeen', '1')
    setPref('moveAsked', '1')
    onDone()
  }
  const run = async (job: () => Promise<string>) => {
    if (step) return
    setError(undefined)
    try { setResult(await job()) }
    catch (e) { setError((e as Error).message || '하지 못했어요.') }
    finally { setStep(undefined) }
  }
  // 둘 다 같은 구글 로그인 (드라이브에 기록이 있으면 받아 오고, 없으면 새로 시작)
  const start = () => run(async () => {
    const r = await signInWithGoogle(setStep)
    return r.rolls || r.cameras
      ? `카메라 ${r.cameras}대, 롤 ${r.rolls}개${r.photos ? `, 사진 ${r.photos}장` : ''}을 받았어요.`
      : '연결했어요. 이제 기록과 사진이 내 구글 드라이브에 저장돼요.'
  })
  const fromFile = (file: File) => run(async () => {
    setStep('불러오는 중…')
    const c = await importAll(file)
    return `카메라 ${c.cameras}대, 롤 ${c.rolls}개를 불러왔어요.`
  })

  return (
    <>
      <Sheet title={loginOnly ? '구글로 로그인' : '필름함 시작하기'} onClose={finish} left={loginOnly ? undefined : <span />}>
        <div className="welcome">
          <img src="./icon-192.png?v=2" alt="" width={84} height={84} />
          <p>구글 계정으로 시작하면 기록과 사진이 <b>내 구글 드라이브</b>에 저장돼요.<br />다른 기기에서 같은 계정으로 들어오면 그대로 이어져요.</p>
        </div>
        <div className="group">
          {result
            ? <button className="row accent" onClick={finish}><span className="grow">{result}</span><b>{loginOnly ? '완료' : '시작'}</b></button>
            : step
              ? <div className="row static"><span className="grow"><b>{step}</b></span></div>
              : <>
                <button className="row accent" onClick={start}><span className="grow sub">처음이에요</span><b>구글로 시작하기</b></button>
                <button className="row accent" onClick={start}><span className="grow sub">계정이 있어요</span><b>구글로 로그인하기</b></button>
              </>}
          {!result && !loginOnly && <button className="row" disabled={!!step} onClick={finish}>로그인 없이 쓰기</button>}
        </div>
        {error && <p className="footnote" style={{ color: 'var(--danger)' }}>{error}</p>}
        <p className="footnote">필름함 서버에는 아무것도 올라가지 않아요.{loginOnly ? '' : ' 나중에 설정에서도 로그인할 수 있어요.'}</p>

        {!result && !loginOnly && (
          <div className="section">
            <h2>기록 불러오기</h2>
            <div className="group">
              <label className={`row accent${step ? ' disabled' : ''}`}>
                백업 파일 불러오기
                <input type="file" accept="application/json,.json" hidden disabled={!!step} onChange={(e) => {
                  const file = e.target.files?.[0]
                  e.target.value = ''
                  if (file) void fromFile(file)
                }} />
              </label>
              {!isOldSite && <button className="row accent" disabled={!!step} onClick={() => setGuide(true)}>예전 주소에서 바로 불러오기</button>}
            </div>
            {!isOldSite && <MoveInfo />}
          </div>
        )}
      </Sheet>
      {guide && <MoveGuide onClose={() => setGuide(false)} />}
    </>
  )
}
