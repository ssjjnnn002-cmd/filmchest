import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, kept } from '../db'
import { useNav } from '../App'
import { projectPalette, uid, type Project, type Roll } from '../core/types'
import { Confirm, Icon, Sheet, rollStart } from '../ui/common'
import { RollRow } from '../ui/RollRow'

const colorOf = (p: Project) => projectPalette[p.color] ?? projectPalette[0]

/** 롤 넣기/빼기. 연달아 눌러도 꼬이지 않게 저장된 최신 목록에서 바꾼다 */
async function setInProject(projectId: string, rollId: string, on?: boolean) {
  await db.transaction('rw', db.projects, async () => {
    const p = await db.projects.get(projectId)
    if (!p) return
    const has = p.rollIds.includes(rollId)
    const want = on ?? !has
    if (want === has) return
    await db.projects.update(projectId, { rollIds: want ? [...p.rollIds, rollId] : p.rollIds.filter((x) => x !== rollId) })
  })
}

function Folder({ color, size = 26 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 6.5A2.5 2.5 0 0 1 5.5 4h4l2 2.2h7A2.5 2.5 0 0 1 21 8.7v8.8a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5v-11Z" fill={color} />
    </svg>
  )
}

/** 롤 보관함 맨 위: 전체 개수 + 진행 중인 프로젝트 (보관된 건 따로) */
export function ProjectStrip({ rolls }: { rolls: Roll[] }) {
  const projects = useLiveQuery(() => db.projects.orderBy('createdAt').reverse().toArray(), []) ?? []
  const [editing, setEditing] = useState<Project | 'new' | null>(null)
  const [opened, setOpened] = useState<string | null>(null)
  const [archivedOpen, setArchivedOpen] = useState(false)
  const live = new Set(rolls.filter(kept).map((r) => r.id))
  const active = projects.filter((p) => !p.archived)
  const archived = projects.filter((p) => p.archived)
  return (
    <div className="projects">
      <div className="projects-head">
        <span>롤 {live.size} · 프로젝트 {projects.length}</span>
        {archived.length > 0 && <button className="link" onClick={() => setArchivedOpen(true)}>보관됨 {archived.length}</button>}
      </div>
      <div className="projects-strip">
        {active.map((p) => (
          <button key={p.id} className="project-card" onClick={() => setOpened(p.id)}>
            <Folder color={colorOf(p)} />
            <b className="truncate">{p.name}</b>
            <span>{p.rollIds.filter((id) => live.has(id)).length}롤</span>
          </button>
        ))}
        <button className="project-card add" onClick={() => setEditing('new')}>
          <Icon name="plus" size={22} />
          <b>새 프로젝트</b>
        </button>
      </div>
      {editing && <ProjectEdit project={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
      {opened && <ProjectDetail id={opened} onClose={() => setOpened(null)} />}
      {archivedOpen && (
        <Sheet title="보관된 프로젝트" onClose={() => setArchivedOpen(false)}>
          <div className="group">
            {archived.map((p) => (
              <button key={p.id} className="row" onClick={() => { setArchivedOpen(false); setOpened(p.id) }}>
                <Folder color={colorOf(p)} size={22} />
                <span className="grow" style={{ minWidth: 0 }}>
                  <span className="truncate" style={{ display: 'block' }}>{p.name}</span>
                  {p.memo && <span className="sub truncate" style={{ display: 'block' }}>{p.memo}</span>}
                </span>
                <Icon name="chev" size={18} />
              </button>
            ))}
          </div>
        </Sheet>
      )}
    </div>
  )
}

/** 프로젝트 만들기/수정: 이름, 설명, 색 16가지 */
export function ProjectEdit({ project, onClose, onSaved }: { project?: Project; onClose: () => void; onSaved?: (p: Project) => void }) {
  const [name, setName] = useState(project?.name ?? '')
  const [memo, setMemo] = useState(project?.memo ?? '')
  const [color, setColor] = useState(project?.color ?? 0)
  const save = async () => {
    const next: Project = {
      id: project?.id ?? uid(), name: name.trim(), memo: memo.trim() || undefined, color,
      archived: project?.archived ?? false, createdAt: project?.createdAt ?? Date.now(), rollIds: project?.rollIds ?? [],
    }
    await db.projects.put(next)
    onSaved?.(next)
    onClose()
  }
  return (
    <Sheet title={project ? '프로젝트 수정' : '새 프로젝트'} onClose={onClose}
      right={<button className="btn ghost" disabled={!name.trim()} onClick={save}><b>저장</b></button>}>
      <div className="section"><div className="group">
        <div className="field"><label htmlFor="pj-name">이름</label>
          <input id="pj-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="프로젝트 이름" /></div>
        <div className="field"><label htmlFor="pj-memo">설명</label>
          <input id="pj-memo" className="input" value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="메모 (선택)" /></div>
      </div></div>
      <div className="section">
        <h2>색</h2>
        <div className="group palette">
          {projectPalette.map((c, i) => (
            <button key={c} className={`swatch ${i === color ? 'on' : ''}`} style={{ background: c }} aria-label={`색 ${i + 1}`} onClick={() => setColor(i)}>
              {i === color && <Icon name="check" size={16} />}
            </button>
          ))}
        </div>
      </div>
    </Sheet>
  )
}

/** 프로젝트 화면: 담긴 롤(날짜순), 롤 담기, 보관/꺼내기, 삭제 */
function ProjectDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const nav = useNav()
  const project = useLiveQuery(() => db.projects.get(id), [id])
  const rolls = useLiveQuery(() => db.rolls.toArray(), []) ?? []
  const [editing, setEditing] = useState(false)
  const [adding, setAdding] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  if (!project) return null
  const mine = rolls.filter((r) => kept(r) && project.rollIds.includes(r.id)).sort((a, b) => rollStart(b) - rollStart(a))
  return (
    <Sheet title={project.name} onClose={onClose}
      right={<button className="btn ghost" onClick={() => setEditing(true)}><b>수정</b></button>}>
      <div className="project-hero">
        <Folder color={colorOf(project)} size={44} />
        <div>
          <div className="sub">{mine.length}롤{project.archived ? ' · 보관됨' : ''}</div>
          {project.memo && <div>{project.memo}</div>}
        </div>
      </div>
      <div className="section"><div className="group">
        {mine.length === 0 && <div className="row sub">아직 담긴 롤이 없어요</div>}
        {mine.map((r) => (
          <div key={r.id} className="row">
            <button className="grow plain" style={{ minWidth: 0 }} onClick={() => { onClose(); nav.push({ type: 'roll', id: r.id }) }}><RollRow roll={r} /></button>
            <button className="icon-btn" aria-label="프로젝트에서 빼기"
              onClick={() => setInProject(project.id, r.id, false)}><Icon name="close" size={16} /></button>
          </div>
        ))}
        <button className="row accent" onClick={() => setAdding(true)}><Icon name="plus" /> 롤 담기</button>
      </div></div>
      <div className="section"><div className="group">
        <button className="row" onClick={() => db.projects.update(project.id, { archived: !project.archived })}>
          {project.archived ? '진행 중으로 꺼내기' : '보관하기'}
        </button>
        <button className="row danger" onClick={() => setConfirmDelete(true)}>프로젝트 삭제</button>
      </div></div>
      {editing && <ProjectEdit project={project} onClose={() => setEditing(false)} />}
      {adding && (
        <Sheet title="롤 담기" onClose={() => setAdding(false)} right={<button className="btn ghost" onClick={() => setAdding(false)}><b>완료</b></button>}>
          <div className="group">
            {rolls.filter(kept).sort((a, b) => rollStart(b) - rollStart(a)).map((r) => {
              const on = project.rollIds.includes(r.id)
              return (
                <button key={r.id} className="row" onClick={() => setInProject(project.id, r.id)}>
                  <span className="grow" style={{ minWidth: 0 }}><RollRow roll={r} /></span>
                  <span className={`check ${on ? 'on' : ''}`}>{on && <Icon name="check" size={14} />}</span>
                </button>
              )
            })}
          </div>
        </Sheet>
      )}
      {confirmDelete && <Confirm message="프로젝트를 삭제할까요? 담긴 롤은 지워지지 않아요."
        onCancel={() => setConfirmDelete(false)} onConfirm={async () => { await db.projects.delete(project.id); onClose() }} />}
    </Sheet>
  )
}

/** 롤 화면의 "프로젝트" 줄: 담긴 프로젝트 + 담기/빼기 */
export function RollProjects({ roll }: { roll: Roll }) {
  const projects = useLiveQuery(() => db.projects.orderBy('createdAt').reverse().toArray(), []) ?? []
  const [picking, setPicking] = useState(false)
  const [creating, setCreating] = useState(false)
  const mine = projects.filter((p) => p.rollIds.includes(roll.id))
  const toggle = (p: Project) => setInProject(p.id, roll.id)
  return (
    <div className="section">
      <h2>프로젝트</h2>
      <div className="group">
        {mine.length > 0 && (
          <div className="row project-chips">
            {mine.map((p) => <span key={p.id} className="project-chip" style={{ color: colorOf(p), background: `${colorOf(p)}22` }}><Folder color={colorOf(p)} size={14} /> {p.name}</span>)}
          </div>
        )}
        <button className="row accent" onClick={() => setPicking(true)}><Icon name="plus" /> {mine.length ? '프로젝트 바꾸기' : '프로젝트에 담기'}</button>
      </div>
      {picking && (
        <Sheet title="프로젝트에 담기" onClose={() => setPicking(false)} right={<button className="btn ghost" onClick={() => setPicking(false)}><b>완료</b></button>}>
          <div className="group">
            {projects.map((p) => {
              const on = p.rollIds.includes(roll.id)
              return (
                <button key={p.id} className="row" onClick={() => toggle(p)}>
                  <Folder color={colorOf(p)} size={22} />
                  <span className="grow">{p.name}{p.archived ? ' (보관됨)' : ''}</span>
                  <span className={`check ${on ? 'on' : ''}`}>{on && <Icon name="check" size={14} />}</span>
                </button>
              )
            })}
            <button className="row accent" onClick={() => setCreating(true)}><Icon name="plus" /> 새 프로젝트</button>
          </div>
        </Sheet>
      )}
      {creating && <ProjectEdit onClose={() => setCreating(false)}
        onSaved={(p) => setInProject(p.id, roll.id, true)} />}
    </div>
  )
}
