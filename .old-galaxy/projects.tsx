import { useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { router } from 'expo-router'
import Svg, { Path } from 'react-native-svg'
import { getProject, listProjects, projectPalette, saveProject, setRollInProject, type Project, type Roll } from './db'
import { Sheet } from './chrome'
import { Field } from './ui'
import { useTheme } from './theme'

export const colorOf = (p: Project) => projectPalette[p.color] ?? projectPalette[0]

export function Folder({ color, size = 26 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M3 6.5A2.5 2.5 0 0 1 5.5 4h4l2 2.2h7A2.5 2.5 0 0 1 21 8.7v8.8a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5v-11Z" fill={color} />
    </Svg>
  )
}

/** 롤 보관함 맨 위: 전체 개수 + 진행 중인 프로젝트 (보관된 건 따로) */
export function ProjectStrip({ rolls }: { rolls: Roll[] }) {
  const c = useTheme()
  const [creating, setCreating] = useState(false)
  const projects = listProjects()
  const live = new Set(rolls.map((r) => r.id))
  const active = projects.filter((p) => !p.archived)
  const archived = projects.filter((p) => p.archived)
  return (
    <View style={{ width: '100%', gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 2 }}>
        <Text style={{ flex: 1, color: c.muted, fontSize: 15, fontWeight: '600' }}>롤 {live.size} · 프로젝트 {projects.length}</Text>
        {archived.length ? (
          <Pressable onPress={() => router.push('/project/archived')}>
            <Text style={{ color: c.safelight, fontSize: 15, fontWeight: '600' }}>보관됨 {archived.length}</Text>
          </Pressable>
        ) : null}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
        {active.map((p) => (
          <Pressable key={p.id} onPress={() => router.push(`/project/${p.id}`)} style={({ pressed }) => ({
            width: 128, height: 92, borderRadius: 16, backgroundColor: c.card, padding: 12, justifyContent: 'space-between',
            transform: [{ scale: pressed ? 0.97 : 1 }],
          })}>
            <Folder color={colorOf(p)} />
            <View>
              <Text style={{ color: c.ink, fontSize: 15, fontWeight: '700' }} numberOfLines={1}>{p.name}</Text>
              <Text style={{ color: c.muted, fontSize: 12 }}>{p.rollIds.filter((id) => live.has(id)).length}롤</Text>
            </View>
          </Pressable>
        ))}
        <Pressable onPress={() => setCreating(true)} style={{
          width: 110, height: 92, borderRadius: 16, borderWidth: 1.5, borderStyle: 'dashed', borderColor: c.safelight,
          alignItems: 'center', justifyContent: 'center', gap: 4,
        }}>
          <Text style={{ color: c.safelight, fontSize: 24, lineHeight: 26 }}>+</Text>
          <Text style={{ color: c.safelight, fontSize: 13, fontWeight: '700' }}>새 프로젝트</Text>
        </Pressable>
      </ScrollView>
      {creating ? <ProjectEditSheet onClose={() => setCreating(false)} /> : null}
    </View>
  )
}

/** 프로젝트 만들기/수정: 이름, 설명, 색 16가지 */
export function ProjectEditSheet({ project, onClose, onSaved }: { project?: Project; onClose: () => void; onSaved?: (id: string) => void }) {
  const c = useTheme()
  const [name, setName] = useState(project?.name ?? '')
  const [memo, setMemo] = useState(project?.memo ?? '')
  const [color, setColor] = useState(project?.color ?? 0)
  const save = () => {
    const id = saveProject({ id: project?.id, name, memo, color })
    onSaved?.(id)
    onClose()
  }
  return (
    <Sheet title={project ? '프로젝트 수정' : '새 프로젝트'} onClose={onClose} right="저장" rightDisabled={!name.trim()} onRight={save}>
      <View style={{ backgroundColor: c.cell, borderRadius: 22, overflow: 'hidden' }}>
        <Field label="이름" value={name} onChangeText={setName} placeholder="프로젝트 이름" />
        <Field label="설명" value={memo} onChangeText={setMemo} placeholder="메모 (선택)" />
      </View>
      <Text style={{ color: c.muted, fontSize: 13, fontWeight: '600', paddingHorizontal: 16 }}>색</Text>
      <View style={{ backgroundColor: c.cell, borderRadius: 22, padding: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' }}>
        {projectPalette.map((hex, i) => (
          <Pressable key={hex} accessibilityLabel={`색 ${i + 1}`} onPress={() => setColor(i)} style={{
            width: 32, height: 32, borderRadius: 16, backgroundColor: hex, alignItems: 'center', justifyContent: 'center',
            borderWidth: i === color ? 3 : 0, borderColor: c.ink,
          }}>
            {i === color ? <Text style={{ color: '#fff', fontWeight: '800' }}>✓</Text> : null}
          </Pressable>
        ))}
      </View>
    </Sheet>
  )
}

/** 롤 화면의 "프로젝트" 줄 */
export function RollProjects({ roll }: { roll: Roll }) {
  const c = useTheme()
  const [picking, setPicking] = useState(false)
  const [creating, setCreating] = useState(false)
  const projects = listProjects()
  const mine = projects.filter((p) => p.rollIds.includes(roll.id))
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: c.muted, fontSize: 13, fontWeight: '600', paddingHorizontal: 16 }}>프로젝트</Text>
      <View style={{ backgroundColor: c.cell, borderRadius: 22, overflow: 'hidden' }}>
        {mine.length ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, padding: 14, paddingBottom: 4 }}>
            {mine.map((p) => (
              <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99, backgroundColor: `${colorOf(p)}22` }}>
                <Folder color={colorOf(p)} size={14} />
                <Text style={{ color: colorOf(p), fontSize: 14, fontWeight: '600' }}>{p.name}</Text>
              </View>
            ))}
          </View>
        ) : null}
        <Pressable onPress={() => setPicking(true)} style={{ minHeight: 50, paddingHorizontal: 16, justifyContent: 'center' }}>
          <Text style={{ color: c.safelight, fontSize: 17, fontWeight: '600' }}>{mine.length ? '프로젝트 바꾸기' : '프로젝트에 담기'}</Text>
        </Pressable>
      </View>
      {picking ? (
        <Sheet title="프로젝트에 담기" onClose={() => setPicking(false)} right="완료" onRight={() => setPicking(false)}>
          <View style={{ backgroundColor: c.cell, borderRadius: 22, overflow: 'hidden' }}>
            {projects.map((p, i) => {
              const on = p.rollIds.includes(roll.id)
              return (
                <Pressable key={p.id} onPress={() => setRollInProject(p.id, roll.id)} style={{
                  minHeight: 52, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12,
                  borderTopWidth: i ? 0.5 : 0, borderTopColor: c.sep,
                }}>
                  <Folder color={colorOf(p)} size={22} />
                  <Text style={{ flex: 1, color: c.ink, fontSize: 17 }}>{p.name}{p.archived ? ' (보관됨)' : ''}</Text>
                  <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: on ? 0 : 1.5, borderColor: c.faint, backgroundColor: on ? c.safelight : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                    {on ? <Text style={{ color: '#fff', fontWeight: '800' }}>✓</Text> : null}
                  </View>
                </Pressable>
              )
            })}
            <Pressable onPress={() => setCreating(true)} style={{ minHeight: 52, paddingHorizontal: 16, justifyContent: 'center', borderTopWidth: projects.length ? 0.5 : 0, borderTopColor: c.sep }}>
              <Text style={{ color: c.safelight, fontSize: 17, fontWeight: '600' }}>새 프로젝트</Text>
            </Pressable>
          </View>
          {creating ? <ProjectEditSheet onClose={() => setCreating(false)} onSaved={(id) => setRollInProject(id, roll.id, true)} /> : null}
        </Sheet>
      ) : null}
    </View>
  )
}

export { getProject }
