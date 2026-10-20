import { useEffect, useMemo, useRef, useState } from 'react'
import { Sheet } from '../ui/common'
import { ArchiveImport } from './ArchiveImport'

const colors = ['var(--safelight)', '#0a7aff', '#34a853', '#8e5cd9', '#f08a00', '#14a3a3', '#e5488a', '#8d6e4c', '#5856d6', '#2fb38a']

/** 사진을 여러 장 공유받았을 때: 몇 롤인지 고르고 롤마다 나눈 뒤, 롤 하나씩 기존 롤 가져오기로 (아이폰 PhotoImportFlow와 같은 흐름) */
export function PhotoImportFlow({ photos, onClose }: { photos: File[]; onClose: () => void }) {
  const [sets, setSets] = useState<File[][] | null>(null)
  const [step, setStep] = useState(0)
  if (sets && sets[step]) {
    return <ArchiveImport key={step} presetFiles={sets[step]} stepLabel={sets.length > 1 ? `${step + 1} / ${sets.length}` : undefined}
      onClose={onClose} onSaved={() => { if (step + 1 < sets.length) setStep(step + 1); else onClose() }} />
  }
  return <PhotoSplit photos={photos} onCancel={onClose} onDone={(s) => { setSets(s); setStep(0) }} />
}

function PhotoSplit({ photos, onCancel, onDone }: { photos: File[]; onCancel: () => void; onDone: (sets: File[][]) => void }) {
  const [count, setCount] = useState(1)
  const [assign, setAssign] = useState<number[]>(() => photos.map(() => 0))
  const [active, setActive] = useState(0)
  const urls = useMemo(() => photos.map((f) => URL.createObjectURL(f)), [photos])
  useEffect(() => () => urls.forEach(URL.revokeObjectURL), [urls])
  const sets = Array.from({ length: count }, (_, r) => photos.filter((_, i) => assign[i] === r))
  const spread = (n: number) => {
    const per = photos.length / Math.max(n, 1)
    setAssign(photos.map((_, i) => Math.min(n - 1, Math.floor(i / per))))
    setActive((a) => Math.min(a, n - 1))
    setCount(n)
  }
  const pressTimer = useRef(0)
  return (
    <Sheet title={`사진 ${photos.length}장`} onClose={onCancel}
      right={<button className="btn ghost" disabled={sets.every((s) => !s.length)} onClick={() => onDone(sets.filter((s) => s.length))}><b>다음</b></button>}>
      <div className="section">
        <div className="group">
          <div className="toggle">
            <span>롤 수 · {count}롤</span>
            <span style={{ display: 'flex', gap: 8 }}>
              <button className="btn small" disabled={count <= 1} onClick={() => spread(count - 1)}>−</button>
              <button className="btn small" disabled={count >= Math.min(photos.length, 20)} onClick={() => spread(count + 1)}>+</button>
            </span>
          </div>
        </div>
        {count > 1 && (
          <>
            <div className="chips">
              {sets.map((s, r) => (
                <button key={r} className="chip" onClick={() => setActive(r)}
                  style={{ background: active === r ? colors[r % colors.length] : undefined, color: active === r ? '#fff' : colors[r % colors.length] }}>
                  {r + 1}롤 · {s.length}장
                </button>
              ))}
            </div>
            <p className="footnote">롤을 고른 뒤 사진을 누르면 그 롤로 옮겨요. 길게 누르면 그 사진부터 끝까지 옮겨요.</p>
          </>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(92px, 1fr))', gap: 6 }}>
        {urls.map((u, i) => (
          <button key={i} style={{ position: 'relative', border: count > 1 ? `2px solid ${colors[assign[i] % colors.length]}` : 0, padding: 0, borderRadius: 8, overflow: 'hidden', height: 92, background: 'var(--fill)' }}
            onClick={() => { if (count > 1) setAssign((a) => { const n = a.slice(); n[i] = active; return n }) }}
            onPointerDown={() => { if (count > 1) pressTimer.current = window.setTimeout(() => setAssign((a) => a.map((v, k) => (k >= i ? active : v))), 500) }}
            onPointerUp={() => window.clearTimeout(pressTimer.current)} onPointerLeave={() => window.clearTimeout(pressTimer.current)}>
            <img src={u} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            {count > 1 && <span style={{ position: 'absolute', top: 5, left: 5, width: 22, height: 22, borderRadius: 11, background: colors[assign[i] % colors.length], color: '#fff', fontSize: 12, fontWeight: 700, display: 'grid', placeItems: 'center' }}>{assign[i] + 1}</span>}
          </button>
        ))}
      </div>
    </Sheet>
  )
}
