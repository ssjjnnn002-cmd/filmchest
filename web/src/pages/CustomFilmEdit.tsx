import { useState } from 'react'
import { db } from '../db'
import type { CustomFilmRow } from '../core/films'
import { customStock } from '../core/films'
import { uid } from '../core/types'
import { Canister, Confirm, Icon, Sheet } from '../ui/common'

// 목록에 없는 필름을 직접 만든다: 이름, 감도, 필름통 색
const isoChoices = [50, 100, 125, 160, 200, 250, 400, 500, 800, 1600, 3200]
const palette = ['#F4EFE4', '#FDB913', '#F2A71B', '#E2231A', '#C8102E', '#E85D9C', '#5A2D82', '#1E4FA0', '#2B6CB0', '#00A15F', '#0C8A4B', '#1B1B1B', '#7A7A7A', '#F5F5F2']

export function CustomFilmEdit({ row, onClose }: { row?: CustomFilmRow; onClose: (selectId?: string) => void }) {
  const [name, setName] = useState(row?.name ?? '')
  const [iso, setIso] = useState(row?.iso ?? 400)
  const [color, setColor] = useState(row?.color ?? '#FDB913')
  const [bw, setBw] = useState(row?.bw ?? false)
  const [confirm, setConfirm] = useState(false)
  const preview = customStock({ id: row?.id ?? 'custom-preview', name: name.trim() || '내 필름', iso, color, bw, createdAt: 0 })

  const save = async () => {
    const value: CustomFilmRow = { id: row?.id ?? `custom-${uid()}`, name: name.trim(), iso, color, bw, createdAt: row?.createdAt ?? Date.now() }
    await db.customFilms.put(value)
    onClose(value.id)
  }

  return (
    <Sheet title={row ? '필름 수정' : '필름 직접 추가'} onClose={() => onClose()}
      right={<button className="btn ghost" disabled={!name.trim() || !iso} onClick={save}><b>저장</b></button>}>
      <div style={{ display: 'grid', placeItems: 'center', padding: '8px 0 4px' }}>
        <Canister film={preview} size={150} />
      </div>
      <div className="section">
        <div className="group">
          <div className="field">
            <label htmlFor="cf-name">필름 이름</label>
            <input id="cf-name" className="input" value={name} autoComplete="off" onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="cf-iso">감도</label>
            <input id="cf-iso" className="input" inputMode="numeric" value={iso || ''}
              onChange={(e) => setIso(Number(e.target.value.replace(/\D/g, '')) || 0)} />
          </div>
          <div className="suggest">
            {isoChoices.map((v) => <button key={v} className={`chip ${v === iso ? 'active' : ''}`} onClick={() => setIso(v)}>{v}</button>)}
          </div>
          <label className="toggle">
            <span>흑백 필름</span>
            <input type="checkbox" className="switch" checked={bw} onChange={(e) => setBw(e.target.checked)} />
          </label>
        </div>
      </div>
      <div className="section">
        <h2>필름통 색</h2>
        <div className="group" style={{ padding: 16, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          {palette.map((c) => (
            <button key={c} className={`swatch ${c.toLowerCase() === color.toLowerCase() ? 'on' : ''}`} style={{ background: c }}
              aria-label={`색 ${c}`} onClick={() => setColor(c)} />
          ))}
          <label className="swatch swatch-custom" aria-label="다른 색 고르기">
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
          </label>
        </div>
      </div>
      {row && (
        <div className="group">
          <button className="row danger" onClick={() => setConfirm(true)}><Icon name="trash" /> 필름 삭제</button>
        </div>
      )}
      {confirm && row && (
        <Confirm message="이 필름을 목록에서 지울까요? 이 필름으로 기록한 롤은 그대로 남아요." onCancel={() => setConfirm(false)}
          onConfirm={async () => { await db.customFilms.delete(row.id); onClose('') }} />
      )}
    </Sheet>
  )
}
