import { Text } from 'react-native'
import { router } from 'expo-router'
import { listProjects, useDb } from '../../src/db'
import { Row, Screen, Section } from '../../src/ui'
import { useTheme } from '../../src/theme'

/** 보관된 프로젝트 */
export default function ArchivedProjects() {
  useDb()
  const c = useTheme()
  const projects = listProjects().filter((p) => p.archived)
  return (
    <Screen title="보관된 프로젝트" onBack={() => router.back()}>
      {projects.length === 0 ? <Text style={{ color: c.muted }}>보관된 프로젝트가 없어요.</Text> : null}
      <Section>
        {projects.map((p, i) => (
          <Row key={p.id} label={p.name} value={`${p.rollIds.length}롤`} onPress={() => router.push(`/project/${p.id}`)} last={i === projects.length - 1} />
        ))}
      </Section>
    </Screen>
  )
}
