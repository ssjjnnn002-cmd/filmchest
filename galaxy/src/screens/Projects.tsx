// 웹 pages/Projects.tsx
import { useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import { db, kept } from '../data'
import { useLiveQuery } from '../store'
import { useNav } from '../App'
import { projectPalette, uid, type Project, type Roll } from '../core/types'
import { rollStart } from '../core/display'
import { Field, Group, Row, RowText, Section, Sub } from '../kit'
import { Icon } from '../icons'
import { Confirm, Sheet, SheetBtn } from '../overlay'
import { RollRow } from '../RollRow'
import { useTheme } from '../theme'

const colorOf = (p: Project) => projectPalette[p.color] ?? projectPalette[0]

/** 롤 넣기/빼기. 연달아 눌러도 꼬이지 않게 저장된 최신 목록에서 바꾼다 (저장소가 동기라 바로 쓴다) */
function setInProject(projectId: string, rollId: string, on?: boolean) {
  const p = db.projects.getSync(projectId)
  if (!p) return
  const has = p.rollIds.includes(rollId)
  const want = on ?? !has
  if (want === has) return
  void db.projects.update(projectId, { rollIds: want ? [...p.rollIds, rollId] : p.rollIds.filter((x) => x !== rollId) })
}

function Folder({ color, size = 26 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M3 6.5A2.5 2.5 0 0 1 5.5 4h4l2 2.2h7A2.5 2.5 0 0 1 21 8.7v8.8a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5v-11Z" fill={color} />
    </Svg>
  )
}

function Check({ on }: { on: boolean }) {
  const c = useTheme()
  return (
    <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: on ? c.safelight : c.faint, backgroundColor: on ? c.safelight : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
      {on ? <Icon name="check" size={14} color="#fff" /> : null}
    </View>
  )
}

/** 롤 보관함 맨 위: 전체 개수 + 진행 중인 프로젝트 (보관된 건 따로) */
export function ProjectStrip({ rolls }: { rolls: Roll[] }) {
  const c = useTheme()
  const projects = useLiveQuery(() => db.projects.orderBy('createdAt').reverse().toArray(), []) ?? []
  const [editing, setEditing] = useState<Project | 'new' | null>(null)
  const [opened, setOpened] = useState<string | null>(null)
  const [archivedOpen, setArchivedOpen] = useState(false)
  const live = new Set(rolls.filter(kept).map((r) => r.id))
  const active = projects.filter((p) => !p.archived)
  const archived = projects.filter((p) => p.archived)
  return (
    <View style={{ marginTop: 4, marginBottom: 14 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4, paddingBottom: 8 }}>
        <Text style={{ color: c.muted, fontSize: 14, fontWeight: '600' }}>롤 {live.size} · 프로젝트 {projects.length}</Text>
        {archived.length > 0 ? <Pressable onPress={() => setArchivedOpen(true)}><Text style={{ color: c.safelight, fontSize: 14, fontWeight: '600' }}>보관됨 {archived.length}</Text></Pressable> : null}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ gap: 10, paddingHorizontal: 16, paddingVertical: 2 }}>
        {active.map((p) => (
          <Pressable key={p.id} onPress={() => setOpened(p.id)} style={({ pressed }) => ({ width: 128, height: 92, borderRadius: 16, backgroundColor: c.card, padding: 12, justifyContent: 'space-between', transform: [{ scale: pressed ? 0.97 : 1 }] })}>
            <Folder color={colorOf(p)} />
            <View>
              <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: '700', color: c.ink }}>{p.name}</Text>
              <Text style={{ fontSize: 12, color: c.muted }}>{p.rollIds.filter((id) => live.has(id)).length}롤</Text>
            </View>
          </Pressable>
        ))}
        <Pressable onPress={() => setEditing('new')} style={({ pressed }) => ({ width: 128, height: 92, borderRadius: 16, borderWidth: 1.5, borderStyle: 'dashed', borderColor: `${c.safelight}73`,
          alignItems: 'center', justifyContent: 'center', gap: 6, transform: [{ scale: pressed ? 0.97 : 1 }] })}>
          <Icon name="plus" size={22} color={c.safelight} />
          <Text style={{ fontSize: 13, fontWeight: '700', color: c.safelight }}>새 프로젝트</Text>
        </Pressable>
      </ScrollView>
      {editing ? <ProjectEdit project={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} /> : null}
      {opened ? <ProjectDetail id={opened} onClose={() => setOpened(null)} /> : null}
      {archivedOpen ? (
        <Sheet title="보관된 프로젝트" onClose={() => setArchivedOpen(false)}>
          <Group>
            {archived.map((p) => (
              <Row key={p.id} chev onPress={() => { setArchivedOpen(false); setOpened(p.id) }}>
                <Folder color={colorOf(p)} size={22} />
                <RowText sub={p.memo}>{p.name}</RowText>
              </Row>
            ))}
          </Group>
        </Sheet>
      ) : null}
    </View>
  )
}

/** 프로젝트 만들기/수정: 이름, 설명, 색 16가지 */
export function ProjectEdit({ project, onClose, onSaved }: { project?: Project; onClose: () => void; onSaved?: (p: Project) => void }) {
  const c = useTheme()
  const [name, setName] = useState(project?.name ?? '')
  const [memo, setMemo] = useState(project?.memo ?? '')
  const [color, setColor] = useState(project?.color ?? 0)
  const [w, setW] = useState(0)
  const save = async () => {
    const next: Project = {
      id: project?.id ?? uid(), name: name.trim(), memo: memo.trim() || undefined, color,
      archived: project?.archived ?? false, createdAt: project?.createdAt ?? Date.now(), rollIds: project?.rollIds ?? [],
    }
    await db.projects.put(next)
    onSaved?.(next)
    onClose()
  }
  const size = w ? (w - 28 - 10 * 7) / 8 : 30
  return (
    <Sheet title={project ? '프로젝트 수정' : '새 프로젝트'} onClose={onClose}
      right={<SheetBtn label="저장" accent disabled={!name.trim()} onPress={save} />}>
      <Section><Group>
        <Field label="이름" value={name} onChangeText={setName} placeholder="프로젝트 이름" />
        <Field label="설명" value={memo} onChangeText={setMemo} placeholder="메모 (선택)" />
      </Group></Section>
      <Section title="색">
        <View onLayout={(e) => setW(e.nativeEvent.layout.width)}>
        <Group style={{ padding: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {projectPalette.map((p, i) => (
            <Pressable key={p} accessibilityLabel={`색 ${i + 1}`} onPress={() => setColor(i)}
              style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: p, alignItems: 'center', justifyContent: 'center',
                borderWidth: i === color ? 2 : 0, borderColor: c.card, outlineWidth: i === color ? 2 : 0, outlineColor: c.ink } as never}>
              {i === color ? <Icon name="check" size={16} color="#fff" /> : null}
            </Pressable>
          ))}
        </Group>
        </View>
      </Section>
    </Sheet>
  )
}

/** 프로젝트 화면: 담긴 롤(날짜순), 롤 담기, 보관/꺼내기, 삭제 */
function ProjectDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const c = useTheme()
  const nav = useNav()
  const project = useLiveQuery(() => db.projects.get(id), [id])
  const rolls = useLiveQuery(() => db.rolls.toArray(), []) ?? []
  const [editing, setEditing] = useState(false)
  const [adding, setAdding] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  if (!project) return null
  const mine = rolls.filter((r) => kept(r) && project.rollIds.includes(r.id)).sort((a, b) => rollStart(b) - rollStart(a))
  return (
    <Sheet title={project.name} onClose={onClose} right={<SheetBtn label="수정" accent onPress={() => setEditing(true)} />}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', paddingTop: 4, paddingHorizontal: 4, paddingBottom: 14 }}>
        <Folder color={colorOf(project)} size={44} />
        <View style={{ flex: 1 }}>
          <Sub>{mine.length}롤{project.archived ? ' · 보관됨' : ''}</Sub>
          {project.memo ? <Text style={{ fontSize: 17, color: c.ink }}>{project.memo}</Text> : null}
        </View>
      </View>
      <Section><Group>
        {mine.length === 0 ? <Row static><Sub>아직 담긴 롤이 없어요</Sub></Row> : null}
        {mine.map((r) => (
          <Row key={r.id} static>
            <Pressable style={{ flex: 1, minWidth: 0 }} onPress={() => { onClose(); nav.push({ type: 'roll', id: r.id }) }}><RollRow roll={r} /></Pressable>
            <Pressable accessibilityLabel="프로젝트에서 빼기" onPress={() => setInProject(project.id, r.id, false)}
              style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: c.fill, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="close" size={16} color={c.muted} />
            </Pressable>
          </Row>
        ))}
        <Row onPress={() => setAdding(true)}><Icon name="plus" size={20} color={c.safelight} /><RowText color={c.safelight}>롤 담기</RowText></Row>
      </Group></Section>
      <Section><Group>
        <Row onPress={() => db.projects.update(project.id, { archived: !project.archived })}>{project.archived ? '진행 중으로 꺼내기' : '보관하기'}</Row>
        <Row danger onPress={() => setConfirmDelete(true)}>프로젝트 삭제</Row>
      </Group></Section>
      {editing ? <ProjectEdit project={project} onClose={() => setEditing(false)} /> : null}
      {adding ? (
        <Sheet title="롤 담기" onClose={() => setAdding(false)} right={<SheetBtn label="완료" accent onPress={() => setAdding(false)} />}>
          <Group>
            {rolls.filter(kept).sort((a, b) => rollStart(b) - rollStart(a)).map((r) => (
              <Row key={r.id} onPress={() => setInProject(project.id, r.id)}>
                <View style={{ flex: 1, minWidth: 0 }}><RollRow roll={r} /></View>
                <Check on={project.rollIds.includes(r.id)} />
              </Row>
            ))}
          </Group>
        </Sheet>
      ) : null}
      {confirmDelete ? <Confirm message="프로젝트를 삭제할까요? 담긴 롤은 지워지지 않아요."
        onCancel={() => setConfirmDelete(false)} onConfirm={async () => { setConfirmDelete(false); await db.projects.delete(project.id); onClose() }} /> : null}
    </Sheet>
  )
}

/** 롤 화면의 "프로젝트" 줄: 담긴 프로젝트 + 담기/빼기 */
export function RollProjects({ roll }: { roll: Roll }) {
  const c = useTheme()
  const projects = useLiveQuery(() => db.projects.orderBy('createdAt').reverse().toArray(), []) ?? []
  const [picking, setPicking] = useState(false)
  const [creating, setCreating] = useState(false)
  const mine = projects.filter((p) => p.rollIds.includes(roll.id))
  return (
    <Section title="프로젝트">
      <Group>
        {mine.length > 0 ? (
          <Row static style={{ flexWrap: 'wrap', gap: 6 }}>
            {mine.map((p) => (
              <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 99, backgroundColor: `${colorOf(p)}22` }}>
                <Folder color={colorOf(p)} size={14} />
                <Text style={{ fontSize: 14, fontWeight: '600', color: colorOf(p) }}>{p.name}</Text>
              </View>
            ))}
          </Row>
        ) : null}
        <Row onPress={() => setPicking(true)}><Icon name="plus" size={20} color={c.safelight} /><RowText color={c.safelight}>{mine.length ? '프로젝트 바꾸기' : '프로젝트에 담기'}</RowText></Row>
      </Group>
      {picking ? (
        <Sheet title="프로젝트에 담기" onClose={() => setPicking(false)} right={<SheetBtn label="완료" accent onPress={() => setPicking(false)} />}>
          <Group>
            {projects.map((p) => (
              <Row key={p.id} onPress={() => setInProject(p.id, roll.id)}>
                <Folder color={colorOf(p)} size={22} />
                <RowText>{p.name}{p.archived ? ' (보관됨)' : ''}</RowText>
                <Check on={p.rollIds.includes(roll.id)} />
              </Row>
            ))}
            <Row onPress={() => setCreating(true)}><Icon name="plus" size={20} color={c.safelight} /><RowText color={c.safelight}>새 프로젝트</RowText></Row>
          </Group>
        </Sheet>
      ) : null}
      {creating ? <ProjectEdit onClose={() => setCreating(false)} onSaved={(p) => setInProject(p.id, roll.id, true)} /> : null}
    </Section>
  )
}
