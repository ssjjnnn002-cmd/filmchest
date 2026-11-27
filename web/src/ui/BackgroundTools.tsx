import { useState } from 'react'
import { composeCutout, cutoutFrom, removeBackground, type BgProgress, type Cutout } from '../core/bgRemove'
import { CutoutEditor } from '../pages/CutoutEditor'
import { Icon } from './common'

/**
 * 배경 지우기 · 배경 다듬기 (아이폰 카메라·렌즈·액세서리 사진 칸과 같은 버튼).
 * picked: 새로 고른 사진 (배경 지우기는 새로 고른 그냥 사진일 때만), current: 지금 보이는 사진
 */
export function useBackgroundTools({ picked, current, onResult }: {
  picked?: Blob
  current: () => Promise<Blob | undefined>
  onResult: (b: Blob) => void
}) {
  const [cut, setCut] = useState<Cutout>()
  const [lifted, setLifted] = useState<Blob>()
  const [editing, setEditing] = useState<Cutout>()
  const [progress, setProgress] = useState<BgProgress | 'busy'>()
  const [failed, setFailed] = useState<string>()
  // 다른 사진을 고르면 처음부터
  const [seen, setSeen] = useState(picked)
  if (seen !== picked) { setSeen(picked); setCut(undefined); setLifted(undefined); setFailed(undefined) }

  const canLift = !!picked && lifted !== picked
  const lift = async () => {
    if (!picked) return
    setFailed(undefined)
    setProgress('busy')
    try {
      const c = await removeBackground(picked, setProgress)
      onResult(await composeCutout(c))
      setCut(c)
      setLifted(picked)
    } catch (e) {
      const msg = (e as Error).message
      setFailed(/받지 못|덜 받|fetch|network/i.test(msg)
        ? '인식 모델을 받지 못했어요. 인터넷 연결을 확인하거나 배경 다듬기로 직접 지워 주세요.'
        : '카메라를 찾지 못했어요. 배경 다듬기로 직접 지울 수 있어요.')
    } finally {
      setProgress(undefined)
    }
  }
  const open = async () => {
    let c = cut
    if (!c) {
      const b = await current()
      if (!b) return
      setProgress('busy')
      try { c = await cutoutFrom(b) } finally { setProgress(undefined) }
      setCut(c)
    }
    setEditing(c)
  }
  const finish = async (edited: Cutout | null) => {
    setEditing(undefined)
    if (!edited) return
    try {
      onResult(await composeCutout(edited))
      setCut(edited)
      if (picked) setLifted(picked)
      setFailed(undefined)
    } catch {
      setFailed('남은 부분이 없어요. 되살리기로 조금 남겨 주세요.')
    }
  }

  const label = progress === 'busy' || !progress ? '배경 지우는 중…'
    : progress.phase === 'download' ? `처음 한 번 인식 모델 받는 중… ${Math.round((progress.done / progress.total) * 100)}%`
      : '배경 지우는 중…'
  return {
    busy: progress ? <div className="photo-busy" style={{ flexDirection: 'column', gap: 10 }}><div className="spinner" /><span className="sub">{label}</span></div> : null,
    rows: (hasPhoto: boolean) => (
      <>
        {canLift && <button type="button" className="row accent" disabled={!!progress} onClick={() => void lift()}><Icon name="wand" /> 배경 지우기</button>}
        {hasPhoto && <button type="button" className="row accent" disabled={!!progress} onClick={() => void open()}><Icon name="brush" /> 배경 다듬기</button>}
      </>
    ),
    note: failed,
    clear: () => { setCut(undefined); setLifted(undefined); setFailed(undefined) },
    editor: editing ? <CutoutEditor cutout={editing} onDone={(c) => void finish(c)} /> : null,
  }
}
