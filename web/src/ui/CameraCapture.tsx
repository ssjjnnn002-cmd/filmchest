import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Confirm } from './common'

/** 웹앱 안에서 카메라를 직접 열어 한 장 찍는다 (아이폰 앱의 사진 찍기와 같게). 못 열면 안내만 띄운다 */
export function CameraCapture({ onShot, onClose }: { onShot: (file: File) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null)
  const [stream, setStream] = useState<MediaStream>()
  const [error, setError] = useState<string>()

  useEffect(() => {
    let live: MediaStream | undefined
    let cancelled = false
    ;(async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('none')
        live = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1440 } }, audio: false })
        if (cancelled) { live.getTracks().forEach((t) => t.stop()); return }
        setStream(live)
        if (video.current) { video.current.srcObject = live; await video.current.play().catch(() => {}) }
      } catch (e) {
        const name = (e as DOMException)?.name
        setError(name === 'NotAllowedError'
          ? '카메라 사용이 허용되지 않았어요. 브라우저 주소창의 설정에서 카메라를 허용해 주세요.'
          : '이 기기에서는 카메라를 쓸 수 없어요. 맥의 iPhone 미러링 중이라면 휴대폰에서 직접 눌러 주세요.')
      }
    })()
    return () => { cancelled = true; live?.getTracks().forEach((t) => t.stop()) }
  }, [])

  const shoot = () => {
    const v = video.current
    if (!v || !v.videoWidth) return
    const c = document.createElement('canvas')
    c.width = v.videoWidth
    c.height = v.videoHeight
    c.getContext('2d')!.drawImage(v, 0, 0)
    c.toBlob((b) => {
      if (!b) return
      onShot(new File([b], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' }))
      onClose()
    }, 'image/jpeg', 0.92)
  }

  if (error) return <Confirm message={error} action="확인" safe onCancel={onClose} onConfirm={onClose} />
  return createPortal(
    <div className="fullscreen dark" role="dialog" aria-label="사진 찍기">
      <div className="fs-bar">
        <button className="btn ghost" style={{ color: '#fff' }} onClick={onClose}>닫기</button>
        <h2>사진 찍기</h2>
        <span style={{ width: 52 }} />
      </div>
      <div style={{ display: 'grid', placeItems: 'center', minHeight: 0, overflow: 'hidden' }}>
        <video ref={video} playsInline muted style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
      </div>
      <div style={{ display: 'grid', placeItems: 'center', padding: '16px 0 calc(20px + env(safe-area-inset-bottom, 0px))' }}>
        <button aria-label="찍기" disabled={!stream} onClick={shoot}
          style={{ width: 72, height: 72, borderRadius: 999, border: '4px solid #fff', background: 'rgba(255,255,255,.85)', boxShadow: '0 0 0 3px #000 inset', cursor: 'pointer' }} />
      </div>
    </div>,
    document.body,
  )
}
