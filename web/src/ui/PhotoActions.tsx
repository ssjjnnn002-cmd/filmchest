import { useState } from 'react'
import { CameraCapture } from './CameraCapture'
import { Icon } from './common'

/** 사진 고르기 줄 메뉴 (아이폰 앱과 같은 모양): 사진 찍기 · 앨범에서 사진 고르기 · 사진 지우기. 카메라·렌즈·액세서리 공통 */
export function PhotoActions({ onFile, onClear }: { onFile: (f: File) => void; onClear?: () => void }) {
  const [shooting, setShooting] = useState(false)
  return (
    <div className="photo-actions">
      <button type="button" className="row accent" onClick={() => setShooting(true)}><Icon name="camera" /> 사진 찍기</button>
      <label className="row accent">
        <Icon name="photos" /> 앨범에서 사진 고르기
        <input type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onFile(f) }} />
      </label>
      {onClear && <button type="button" className="row danger" onClick={onClear}><Icon name="trash" /> 사진 지우기</button>}
      {shooting && <CameraCapture onShot={onFile} onClose={() => setShooting(false)} />}
    </div>
  )
}
