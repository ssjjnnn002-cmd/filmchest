import { useState } from 'react'
import { signInWithGoogle } from '../core/drive'
import { setPref } from '../platform'
import { Sheet } from './common'

/** 처음 켤 때 한 번: 구글로 시작하기 (내 구글 드라이브에 기록·사진 저장) 또는 로그인 없이 쓰기 */
export function Welcome({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<string>()
  const [result, setResult] = useState<string>()
  const [error, setError] = useState<string>()
  const finish = () => { setPref('welcomeSeen', '1'); onDone() }
  const start = async () => {
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
  return (
    <Sheet title="필름함 시작하기" onClose={finish} left={<span />}>
      <div className="welcome">
        <img src="./icon-192.png?v=2" alt="" width={84} height={84} />
        <p>구글 계정으로 시작하면 기록과 사진이 <b>내 구글 드라이브</b>에 저장돼요.<br />다른 기기에서 같은 계정으로 들어오면 그대로 이어져요.</p>
      </div>
      <div className="group">
        {result
          ? <button className="row accent" onClick={finish}><span className="grow">{result}</span><b>시작</b></button>
          : <button className="row accent" disabled={!!step} onClick={start}><span className="grow"><b>{step ?? '구글로 시작하기'}</b></span></button>}
        {!result && <button className="row" disabled={!!step} onClick={finish}>로그인 없이 쓰기</button>}
      </div>
      {error && <p className="footnote" style={{ color: 'var(--danger)' }}>{error}</p>}
      <p className="footnote">필름함 서버에는 아무것도 올라가지 않아요. 나중에 설정에서도 로그인할 수 있어요.</p>
    </Sheet>
  )
}
