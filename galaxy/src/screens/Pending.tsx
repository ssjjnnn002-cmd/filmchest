// 웹 pages/Pending.tsx
import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { db, kept } from '../data'
import { useLiveQuery } from '../store'
import { useNav } from '../App'
import type { Roll } from '../core/types'
import { Btn, Footnote, Group, Row, RowText, Section, Sub } from '../kit'
import { Icon } from '../icons'
import { GlassBtn, Page } from '../page'
import { Confirm, Sheet } from '../overlay'
import { pickFiles } from '../pick'
import { RollRow } from '../RollRow'
import { useTheme } from '../theme'
import { LabDropOff } from './Editors'
import { ArchiveImport } from './ArchiveImport'
import { isZipFile } from '../core/zip'

const scanTypes = ['application/zip', 'application/x-zip-compressed', 'application/octet-stream', 'image/*']

export function Pending() {
  const c = useTheme()
  const nav = useNav()
  const rolls = useLiveQuery(async () => (await db.rolls.where('status').anyOf(['finished', 'atLab']).reverse().sortBy('loadedAt')).filter(kept), []) ?? []
  const [dropOff, setDropOff] = useState<Roll>()
  const [archive, setArchive] = useState(false)
  const [choice, setChoice] = useState(false)
  const [clearQueue, setClearQueue] = useState(false)
  const atLab = rolls.filter((r) => r.status === 'atLab')
  const finished = rolls.filter((r) => r.status === 'finished')

  return (
    <Page title="현상 스캔" actions={<GlassBtn icon="plus" label="기존 롤 가져오기" onPress={() => setChoice(true)} />}>

      {nav.zipQueue.length > 0 ? (
        <Section title={`가져오기 대기열 · ${nav.zipQueue.length}`} foot="닫아도 여기 남아요. 줄을 누르면 이어서 입력해요."
          right={<Pressable onPress={() => setClearQueue(true)}><Text style={{ color: c.danger, fontSize: 15, fontWeight: '600' }}>모두 비우기</Text></Pressable>}>
          <Group>
            {nav.zipQueue.map((job) => (
              <Row key={job.id} static>
                <Pressable style={{ flex: 1, minWidth: 0 }} onPress={() => nav.resumeZip(job.id)}>
                  <Text numberOfLines={1} style={{ fontSize: 17, fontWeight: '700', color: c.ink }}>{job.file.name}</Text>
                  <Sub>{job.index} / {job.total}{nav.activeZipId === job.id ? ' · 지금' : ''}</Sub>
                </Pressable>
                <Pressable accessibilityLabel={`${job.file.name} 대기열에서 삭제`} onPress={() => nav.dropZip(job.id)}
                  style={({ pressed }) => ({ width: 36, height: 36, borderRadius: 18, backgroundColor: `${c.danger}1F`, alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.88 : 1 }] })}>
                  <Icon name="trash" size={19} color={c.danger} />
                </Pressable>
              </Row>
            ))}
          </Group>
        </Section>
      ) : null}
      {clearQueue ? (
        <Confirm message={`대기열의 zip ${nav.zipQueue.length}개를 모두 지울까요?`} action="모두 지우기"
          onCancel={() => setClearQueue(false)}
          onConfirm={() => { nav.zipQueue.forEach((job) => nav.dropZip(job.id)); setClearQueue(false) }} />
      ) : null}

      <Group>
        <Row onPress={async () => { const f = await pickFiles(scanTypes); if (!f.length) return; if (f.every((x) => isZipFile({ name: x.name, type: x.mimeType }))) nav.receiveZips(f); else nav.importScans(f) }}>
          <Icon name="zip" size={24} color={c.safelight} /><RowText color={c.safelight}>zip 파일 열기</RowText>
        </Row>
      </Group>
      <View style={{ marginTop: 8 }}><Footnote>현상소에서 받은 zip을 고르세요. 사진 여러 장을 골라도 돼요.</Footnote></View>

      <Section title={`현상 맡김 · ${atLab.length}`}>
        {atLab.length > 0 ? (
          <Group>
            {atLab.map((r) => (
              <Row key={r.id} static>
                <Pressable style={{ flex: 1, minWidth: 0 }} onPress={() => nav.push({ type: 'roll', id: r.id })}><RollRow roll={r} /></Pressable>
                <ScanButton rollId={r.id} label="불러오기" />
              </Row>
            ))}
          </Group>
        ) : null}
      </Section>

      <Section title={`촬영 완료 · ${finished.length}`}>
        {finished.length > 0 ? (
          <Group>
            {finished.map((r) => (
              <Row key={r.id} static>
                <Pressable style={{ flex: 1, minWidth: 0 }} onPress={() => nav.push({ type: 'roll', id: r.id })}><RollRow roll={r} /></Pressable>
                <Btn label="맡기기" kind="soft" size="small" onPress={() => setDropOff(r)} />
              </Row>
            ))}
          </Group>
        ) : null}
      </Section>

      {dropOff ? <LabDropOff roll={dropOff} onClose={() => setDropOff(undefined)} /> : null}
      {archive ? <ArchiveImport onClose={() => setArchive(false)} /> : null}
      {choice ? (
        <Sheet title="기존 롤 가져오기" onClose={() => setChoice(false)}>
          <Group>
            <Row onPress={() => { setChoice(false); setArchive(true) }}>
              <View style={{ flex: 1 }}><Text style={{ fontSize: 17, fontWeight: '700', color: c.ink }}>한 롤</Text><Sub>사진이나 zip 하나를 바로 입력해요</Sub></View>
            </Row>
            <Row onPress={async () => {
              const files = await pickFiles(['application/zip', 'application/x-zip-compressed', 'application/octet-stream'])
              setChoice(false)
              if (files.length) nav.enqueueZipRolls(await keepZips(files))
            }}>
              <View style={{ flex: 1 }}><Text style={{ fontSize: 17, fontWeight: '700', color: c.ink }}>여러 롤</Text><Sub>zip을 여러 개 고르면 대기열에서 차례로 입력해요</Sub></View>
            </Row>
          </Group>
        </Sheet>
      ) : null}
    </Page>
  )
}

/** 대기열 zip은 앱을 다시 켜도 남도록 앱 폴더로 옮겨 둔다 (웹은 IndexedDB에 넣는다) */
async function keepZips(files: { uri: string; name: string; size?: number; mimeType?: string }[]) {
  const { copyIn } = await import('../files')
  const { uid } = await import('../core/types')
  return Promise.all(files.map(async (f) => ({ ...f, uri: await copyIn(f.uri, 'zip-queue', `${uid()}.zip`) })))
}

export function ScanButton({ rollId, label = '스캔 불러오기', big }: { rollId: string; label?: string; big?: boolean }) {
  const nav = useNav()
  return (
    <Btn label={label} kind="primary" size={big ? 'stack' : 'small'} block={big} onPress={async () => {
      const f = await pickFiles(scanTypes)
      if (f.length) nav.importScans(f, rollId)
    }} />
  )
}
