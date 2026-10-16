import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, deleteCamera, kept } from '../db'
import { useNav } from '../App'
import type { Camera, Lens } from '../core/types'
import { lensSpec } from '../core/optics'
import { formatInfo, uid } from '../core/types'
import { profileFor } from '../core/profiles'
import { lensesFor } from '../core/lenses'
import { Model3D } from '../ui/Viewers'
import { useCameraPhoto } from '../photoStore'
import { Confirm, Icon, PageHeader, Sheet, fmtDay, rollFilmName } from '../ui/common'
import { RollRow } from '../ui/RollRow'
import { CameraEdit } from './CameraEdit'
import { batteryDue } from './Library'

function lensesOnCamera(camera: Camera, all: Lens[]) {
  if (camera.lensesChosen) {
    const ids = new Set(camera.lensIds ?? [])
    return all.filter((lens) => ids.has(lens.id))
  }
  if (!camera.mount) return []
  return all.filter((lens) => lens.mount.toLowerCase() === camera.mount!.toLowerCase())
}

async function attachLens(camera: Camera, lens: Lens, shown: Lens[]) {
  const ids = camera.lensesChosen ? [...(camera.lensIds ?? [])] : shown.map((item) => item.id)
  if (!ids.includes(lens.id)) ids.push(lens.id)
  await db.cameras.update(camera.id, { lensesChosen: true, lensIds: ids })
}

async function detachLens(camera: Camera, lens: Lens, shown: Lens[]) {
  const ids = (camera.lensesChosen ? camera.lensIds ?? [] : shown.map((item) => item.id)).filter((item) => item !== lens.id)
  await db.cameras.update(camera.id, { lensesChosen: true, lensIds: ids })
}

function LensPick({ camera, shown, library, onClose }: { camera: Camera; shown: Lens[]; library: Lens[]; onClose: () => void }) {
  const taken = new Set(shown.map((lens) => lens.id))
  const mount = (camera.mount ?? '').toLowerCase()
  const rest = library.filter((lens) => !taken.has(lens.id))
  const ordered = [...rest.filter((lens) => lens.mount.toLowerCase() === mount), ...rest.filter((lens) => lens.mount.toLowerCase() !== mount)]
  return (
    <Sheet title="렌즈 불러오기" onClose={onClose}>
      <div className="section">
        <h2>렌즈 탭</h2>
        <div className="group">
          {library.length === 0 && <div className="row static sub">렌즈 탭에서 렌즈를 먼저 등록해 주세요.</div>}
          {library.length > 0 && ordered.length === 0 && <div className="row static sub">등록된 렌즈는 이미 이 카메라에 있어요.</div>}
          {ordered.map((lens) => (
            <button key={lens.id} className="row" onClick={async () => { await attachLens(camera, lens, shown); onClose() }}>
              <span className="grow">{lens.brand} {lens.model}</span>
              <span className="sub">{lensSpec(lens) || lens.mount}</span>
            </button>
          ))}
        </div>
      </div>
    </Sheet>
  )
}

export function CameraDetail({ id }: { id: string }) {
  const nav = useNav()
  const camera = useLiveQuery(() => db.cameras.get(id), [id])
  const rolls = useLiveQuery(async () => (await db.rolls.where('cameraId').equals(id).reverse().sortBy('loadedAt')).filter(kept), [id]) ?? []
  const allLenses = useLiveQuery(() => db.lenses.orderBy('createdAt').toArray(), []) ?? []
  const photo = useCameraPhoto(camera?.id, !!(camera?.hasPhoto || camera?.photo))
  const [editing, setEditing] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [lensEdit, setLensEdit] = useState<Lens | 'pick' | null>(null)
  const [menu, setMenu] = useState(false)

  if (!camera) return null
  const lenses = lensesOnCamera(camera, allLenses)
  const loaded = rolls.find((r) => r.status === 'loaded')
  const history = rolls.filter((r) => r.status !== 'loaded')
  const noBattery = (camera.battery ?? '').startsWith('필요 없음')
  const stats = Object.entries(rolls.reduce<Record<string, number>>((m, r) => {
    const n = rollFilmName(r); m[n] = (m[n] ?? 0) + 1; return m
  }, {})).sort((a, b) => b[1] - a[1])

  return (
    <>
      <PageHeader title={camera.model} onBack={nav.pop}
        actions={
          <div style={{ position: 'relative' }}>
            <button className="glass-btn round" aria-label="더 보기" onClick={() => setMenu(!menu)}><Icon name="more" /></button>
            {menu && (
              <div className="menu">
                <button className="row" onClick={() => { setMenu(false); setEditing(true) }}>수정</button>
                <button className="row danger" onClick={() => { setMenu(false); setConfirm(true) }}>삭제</button>
              </div>
            )}
          </div>
        } />

      <div style={{ display: 'grid', justifyItems: 'center', gap: 4, marginBottom: 8 }}>
        {photo
          ? <img src={photo} alt="" style={{ maxHeight: 240, objectFit: 'contain' }} />
          : <div style={{ width: '100%' }}><Model3D profile={profileFor(camera.brand, camera.model, camera.style)} color="#1C1C1E" height={260} /></div>}
        <h2 style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>{camera.brand} {camera.model}</h2>
        <span className="sub">{[formatInfo[camera.format].name, camera.mount ? `${camera.mount} 마운트` : camera.fixedLens].filter(Boolean).join(' · ')}</span>
      </div>

      <div className="section">
        <h2>배터리</h2>
        <div className="group">
          {noBattery ? (
            <div className="row static"><span className="grow">배터리</span><span className="value">{camera.battery}</span></div>
          ) : (
            <>
              <div className="row static"><span className="grow">종류</span><span className="value">{camera.battery ?? '모름'}</span></div>
              <div className="row static">
                <span className="grow">마지막 교체</span>
                <span className="value" style={batteryDue(camera) ? { color: 'var(--warn)' } : undefined}>
                  {camera.batteryAt ? fmtDay(camera.batteryAt) : '기록 없음'}
                </span>
              </div>
              <button className="row accent" onClick={() => db.cameras.update(id, { batteryAt: Date.now() })}>
                <Icon name="battery" /> 오늘 교체함
              </button>
            </>
          )}
        </div>
        {batteryDue(camera) && <p className="footnote warn">교체한 지 1년이 넘었어요. 노출계가 정확하지 않을 수 있어요.</p>}
      </div>

      <div className="section">
        <h2>장착된 필름</h2>
        <div className="group">
          {loaded
            ? <button className="row" onClick={() => nav.push({ type: 'roll', id: loaded.id })}><RollRow roll={loaded} /><Icon name="chev" size={18} /></button>
            : <button className="row accent" onClick={() => nav.loadFilm(camera.id)}><Icon name="film" /> 필름 장착하기</button>}
        </div>
      </div>

      {camera.mount && (
        <div className="section">
          <h2>렌즈 · {camera.mount}</h2>
          <div className="group">
            {lenses.map((l) => (
              <div key={l.id} className="row">
                <button className="row" style={{ padding: 0, minHeight: 0, flex: 1 }} onClick={() => setLensEdit(l)}>
                  <span className="grow">{l.brand} {l.model}{lensSpec(l) ? ` · ${lensSpec(l)}` : ''}</span>
                  <span className="value">{rolls.filter((r) => r.lensId === l.id || r.lensChanges?.some((c) => c.lensId === l.id)).length}롤</span>
                </button>
                <button type="button" className="btn small ghost" onClick={() => detachLens(camera, l, lenses)}>빼기</button>
              </div>
            ))}
            <button className="row accent" onClick={() => setLensEdit('pick')}><Icon name="plus" /> 렌즈 추가</button>
          </div>
          <p className="footnote">렌즈 탭에 등록한 렌즈를 불러와요. 여기서 빼도 렌즈 탭의 등록은 남아요.</p>
        </div>
      )}

      <div className="section">
        <h2>필름 기록 · {history.length}롤</h2>
        <div className="group">
          {history.length === 0 && <div className="row static sub">아직 기록이 없어요</div>}
          {history.map((r) => (
            <button key={r.id} className="row" onClick={() => nav.push({ type: 'roll', id: r.id })}><RollRow roll={r} /><Icon name="chev" size={18} /></button>
          ))}
        </div>
      </div>

      {stats.length > 0 && (
        <div className="section">
          <h2>자주 쓴 필름</h2>
          <div className="group">
            {stats.map(([name, n]) => <div key={name} className="row static"><span className="grow">{name}</span><span className="value">{n}롤</span></div>)}
          </div>
        </div>
      )}

      {editing && <CameraEdit camera={camera} onClose={() => setEditing(false)} />}
      {lensEdit === 'pick' && <LensPick camera={camera} shown={lenses} library={allLenses} onClose={() => setLensEdit(null)} />}
      {lensEdit && lensEdit !== 'pick' && <LensEdit lens={lensEdit} mount={camera.mount!} brand={camera.brand} onClose={() => setLensEdit(null)} />}
      {confirm && (
        <Confirm message="이 카메라를 삭제할까요? 필름에 적힌 카메라 정보는 남고, 24시간 안에는 설정에서 되돌릴 수 있어요." onCancel={() => setConfirm(false)}
          onConfirm={async () => { await deleteCamera(id); nav.pop() }} />
      )}
    </>
  )
}

export function LensEdit({ lens, mount, brand, onClose }: { lens?: Lens; mount: string; brand: string; onClose: () => void }) {
  const [lensBrand, setLensBrand] = useState(lens?.brand ?? brand)
  const [model, setModel] = useState(lens?.model ?? '')
  const [confirm, setConfirm] = useState(false)
  const suggestions = lensesFor(mount, model).filter((l) => l !== model).slice(0, 8)
  const save = async () => {
    await db.lenses.put({ id: lens?.id ?? uid(), brand: lensBrand.trim(), model: model.trim(), mount, createdAt: lens?.createdAt ?? Date.now() })
    onClose()
  }
  return (
    <Sheet title={lens ? '렌즈 수정' : '렌즈 추가'} onClose={onClose}
      right={<button className="btn ghost" disabled={!model.trim()} onClick={save}><b>저장</b></button>}>
      <div className="section">
        <h2>렌즈 · {mount}</h2>
        <div className="group">
          <div className="field"><label htmlFor="lens-brand">제조사</label>
            <input id="lens-brand" className="input" value={lensBrand} onChange={(e) => setLensBrand(e.target.value)} /></div>
          <div className="field"><label htmlFor="lens-model">렌즈</label>
            <input id="lens-model" className="input" value={model} onChange={(e) => setModel(e.target.value)} autoComplete="off" /></div>
          {suggestions.map((s) => (
            <button key={s} className="row" onClick={() => setModel(s)}><span className="grow">{s}</span><span className="sub">↖</span></button>
          ))}
        </div>
        {suggestions.length > 0 && <p className="footnote">{mount} 마운트에서 자주 쓰는 렌즈예요.</p>}
      </div>
      {lens && (
        <div className="group"><button className="row" style={{ color: '#c0392b' }} onClick={() => setConfirm(true)}><Icon name="trash" /> 렌즈 삭제</button></div>
      )}
      {confirm && lens && (
        <Confirm message="이 렌즈를 삭제할까요? 이 렌즈로 찍은 롤 기록은 남아요." onCancel={() => setConfirm(false)}
          onConfirm={async () => { await db.lenses.delete(lens.id); onClose() }} />
      )}
    </Sheet>
  )
}
