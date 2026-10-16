import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { cameraName, deleteProject, getCamera, getProject, listRolls, setProjectArchived, setRollInProject, useDb, type Roll } from '../../src/db'
import { filmById, filmDisplayName } from '../../src/films'
import { Confirm, Sheet } from '../../src/chrome'
import { Canister, Row, Screen, Section, fmtDay } from '../../src/ui'
import { colorOf, Folder, ProjectEditSheet } from '../../src/projects'
import { useTheme } from '../../src/theme'

/** 프로젝트 화면: 담긴 롤(날짜순), 롤 담기, 보관/꺼내기, 삭제 */
export default function ProjectScreen() {
  useDb()
  const c = useTheme()
  const { id } = useLocalSearchParams<{ id: string }>()
  const project = getProject(id)
  const [editing, setEditing] = useState(false)
  const [adding, setAdding] = useState(false)
  const [confirm, setConfirm] = useState(false)
  if (!project) return <Screen title="프로젝트" onBack={() => router.back()}><Text style={{ color: c.muted }}>없는 프로젝트예요.</Text></Screen>
  const rolls = listRolls()
  const mine = rolls.filter((r) => project.rollIds.includes(r.id)).sort((a, b) => b.loadedAt - a.loadedAt)
  return (
    <Screen title={project.name} onBack={() => router.back()}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Folder color={colorOf(project)} size={44} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: c.muted, fontSize: 14 }}>{mine.length}롤{project.archived ? ' · 보관됨' : ''}</Text>
          {project.memo ? <Text style={{ color: c.ink, fontSize: 16 }}>{project.memo}</Text> : null}
        </View>
      </View>
      <Section>
        {mine.length === 0 ? <Row label="아직 담긴 롤이 없어요" /> : null}
        {mine.map((r) => <RollLine key={r.id} roll={r} onRemove={() => setRollInProject(project.id, r.id, false)} />)}
        <Row label="롤 담기" onPress={() => setAdding(true)} last />
      </Section>
      <Section>
        <Row label="수정" onPress={() => setEditing(true)} />
        <Row label={project.archived ? '진행 중으로 꺼내기' : '보관하기'} onPress={() => setProjectArchived(project.id, !project.archived)} />
        <Row label="프로젝트 삭제" danger onPress={() => setConfirm(true)} last />
      </Section>
      {editing ? <ProjectEditSheet project={project} onClose={() => setEditing(false)} /> : null}
      {adding ? (
        <Sheet title="롤 담기" onClose={() => setAdding(false)} right="완료" onRight={() => setAdding(false)} tall>
          <View style={{ backgroundColor: c.cell, borderRadius: 22, overflow: 'hidden' }}>
            {rolls.map((r, i) => {
              const on = project.rollIds.includes(r.id)
              return (
                <Pressable key={r.id} onPress={() => setRollInProject(project.id, r.id)} style={{
                  minHeight: 64, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12,
                  borderTopWidth: i ? 0.5 : 0, borderTopColor: c.sep,
                }}>
                  <Canister film={filmById(r.filmId)} size={40} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ color: c.ink, fontSize: 16, fontWeight: '600' }} numberOfLines={1}>{filmDisplayName(filmById(r.filmId))}</Text>
                    <Text style={{ color: c.muted, fontSize: 13 }} numberOfLines={1}>{cameraName(getCamera(r.cameraId ?? ''), r)} · {fmtDay(r.loadedAt)}</Text>
                  </View>
                  <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: on ? 0 : 1.5, borderColor: c.faint, backgroundColor: on ? c.safelight : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                    {on ? <Text style={{ color: '#fff', fontWeight: '800' }}>✓</Text> : null}
                  </View>
                </Pressable>
              )
            })}
          </View>
        </Sheet>
      ) : null}
      {confirm ? <Confirm message="프로젝트를 삭제할까요? 담긴 롤은 지워지지 않아요." onCancel={() => setConfirm(false)}
        onConfirm={() => { deleteProject(project.id); router.back() }} /> : null}
    </Screen>
  )
}

function RollLine({ roll, onRemove }: { roll: Roll; onRemove: () => void }) {
  const c = useTheme()
  return (
    <View style={{ minHeight: 64, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 0.5, borderBottomColor: c.sep }}>
      <Pressable onPress={() => router.push(`/roll/${roll.id}`)} style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Canister film={filmById(roll.filmId)} size={40} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ color: c.ink, fontSize: 16, fontWeight: '600' }} numberOfLines={1}>{filmDisplayName(filmById(roll.filmId))}</Text>
          <Text style={{ color: c.muted, fontSize: 13 }} numberOfLines={1}>{cameraName(getCamera(roll.cameraId ?? ''), roll)} · {fmtDay(roll.loadedAt)}</Text>
        </View>
      </Pressable>
      <Pressable accessibilityLabel="프로젝트에서 빼기" onPress={onRemove} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: c.fill, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: c.muted, fontSize: 16 }}>✕</Text>
      </Pressable>
    </View>
  )
}
