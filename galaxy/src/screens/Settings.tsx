// 웹 pages/Settings.tsx
import { useEffect, useState } from 'react'
import { Text, View } from 'react-native'
import { db, deleteRoll, purgeCamera, purgeOldCameras, purgeOldRolls, restoreCamera, restoreRoll } from '../data'
import { getPref, useLiveQuery } from '../store'
import { backupFileName, exportAll, importAll, localBackupAt, writeLocalBackup } from '../backup'
import { restorePhotos } from '../restore'
import { CloudBackup, cloudStatus } from './CloudBackup'
import { Stats } from './Stats'
import { checkUpdate, downloadUpdate, installedBuilt } from '../update'
import { filmById } from '../core/films'
import { bytesText } from '../core/display'
import { sections } from '../core/privacyText'
import { APP_VERSION } from '../core/version'
import { Btn, Footnote, Group, Row, RowText, Section, Segmented, Sub } from '../kit'
import { Confirm, Sheet, SheetBtn } from '../overlay'
import { saveFileNow, storageEstimate } from '../platform'
import { pickFiles } from '../pick'
import { applyTheme, useTheme } from '../theme'

const themes: [string, string][] = [['system', '기기 설정'], ['light', '라이트'], ['dark', '다크']]

export function Settings({ onClose }: { onClose: () => void }) {
  const c = useTheme()
  const [theme, setTheme] = useState<string>(getPref<string>('theme', 'system'))
  const [usage, setUsage] = useState<{ used: number; quota: number }>()
  const [confirm, setConfirm] = useState(false)
  const [privacy, setPrivacy] = useState(false)
  const [note, setNote] = useState<string>()
  const [cloud, setCloud] = useState(false)
  const [spending, setSpending] = useState(false)
  const [update, setUpdate] = useState(() => (installedBuilt() ? new Date(installedBuilt() * 1000).toLocaleDateString('ko-KR') : ''))
  const deleted = useLiveQuery(async () => (await db.rolls.toArray()).filter((r) => r.deletedAt), []) ?? []
  const deletedCameras = useLiveQuery(async () => (await db.cameras.toArray()).filter((x) => x.deletedAt), []) ?? []
  useEffect(() => { storageEstimate().then(setUsage); void purgeOldRolls(); void purgeOldCameras() }, [])

  const choose = (t: string) => { setTheme(t); applyTheme(t) }

  return (
    <Sheet title="설정" onClose={onClose} right={<SheetBtn label="완료" accent onPress={onClose} />}>
      <Section title="화면">
        <Segmented value={theme} options={themes} onChange={choose} />
      </Section>

      <Section title="저장" foot="기록과 사진은 이 기기의 필름함 앱 안에만 저장돼요. 서버로 올라가지 않아서 다른 기기나 다른 사람에게는 보이지 않아요. 앱을 지우면 함께 지워지니, 중요한 롤은 사진을 내려받아 두세요.">
        <Group>
          <Row static value={bytesText(usage?.used) ?? '—'}><RowText>이 앱에 저장된 양</RowText></Row>
        </Group>
      </Section>

      <Section title="삭제한 롤" foot="지운 롤은 24시간 동안 여기 남아요. 사진 앱에 저장한 사진은 그대로예요.">
        <Group>
          {deleted.length === 0 ? <Row static><Sub>최근 24시간 안에 지운 롤이 없어요</Sub></Row> : null}
          {deleted.map((roll) => (
            <Row key={roll.id} static>
              <RowText>{filmById(roll.filmId)?.name ?? '필름 알 수 없음'}</RowText>
              <Btn label="되돌리기" kind="ghost" onPress={() => { void restoreRoll(roll.id) }} />
              <Btn label="지금 지우기" kind="danger" onPress={() => { void deleteRoll(roll.id, true) }} />
            </Row>
          ))}
        </Group>
      </Section>

      <Section title="삭제한 장비" foot="지운 카메라는 24시간 동안 여기 남아요. 필름에 적힌 카메라 정보는 카메라를 지워도 그대로예요.">
        <Group>
          {deletedCameras.length === 0 ? <Row static><Sub>최근 24시간 안에 지운 카메라가 없어요</Sub></Row> : null}
          {deletedCameras.map((camera) => (
            <Row key={camera.id} static>
              <RowText>{camera.brand} {camera.model}</RowText>
              <Btn label="되돌리기" kind="ghost" onPress={() => { void restoreCamera(camera.id) }} />
              <Btn label="지금 지우기" kind="danger" onPress={() => { void purgeCamera(camera.id) }} />
            </Row>
          ))}
        </Group>
      </Section>

      <Group>
        <Row chev onPress={() => setSpending(true)}><RowText>통계</RowText></Row>
        <Row chev value={update} onPress={async () => {
          try {
            const u = await checkUpdate()
            if (u.newer) { setUpdate('새 버전 있음'); void downloadUpdate(); setNote('새 버전을 내려받아요. 다 받으면 알림을 눌러 설치하세요. 기록은 그대로 남아요.') }
            else { setUpdate('최신 버전'); setNote('지금 최신 버전이에요.') }
          } catch { setNote('업데이트를 확인하지 못했어요. 인터넷 연결을 확인해 주세요.') }
        }}><RowText>업데이트 확인</RowText></Row>
      </Group>

      <Section title="백업" foot={`${localBackupAt() ? `마지막 백업 ${new Date(localBackupAt()!).toLocaleString('ko-KR')}. ` : ''}장비·필름·롤 기록을 파일 하나로 저장해요. 스캔 사진은 빠져요. 웹앱 백업 파일도 불러올 수 있어요.`}>
        <Group>
          <Row chev value={cloudStatus()} onPress={() => setCloud(true)}><RowText>클라우드 백업</RowText></Row>
          <Row chev onPress={() => setCloud(true)}><RowText>클라우드 백업에서 복구</RowText></Row>
          <Row onPress={async () => { await writeLocalBackup(); await saveFileNow(backupFileName, await exportAll(), 'application/json') }}>백업 파일로 저장</Row>
          <Row onPress={async () => {
            const [file] = await pickFiles(['application/json', 'text/plain', '*/*'], false)
            if (!file) return
            try {
              const counts = await importAll(file.uri)
              setNote(`카메라 ${counts.cameras}대, 롤 ${counts.rolls}개를 불러왔어요.`)
            } catch {
              setNote('백업 파일을 읽지 못했어요.')
            }
          }}>백업 불러오기</Row>
        </Group>
      </Section>

      <Section title="사진으로 롤 복구" foot="이 앱(아이폰·웹·갤럭시)으로 저장했던 사진을 고르면 표식으로 롤을 다시 묶어요. 클라우드 백업을 먼저 복구하면 필름·카메라 정보까지 함께 돌아와요.">
        <Group>
          <Row onPress={async () => {
            const files = await pickFiles(['image/jpeg'])
            if (!files.length) return
            const result = await restorePhotos(files)
            setNote(result.frames === 0 ? '표식을 찾지 못했어요. 이 앱에서 저장한 원본 사진을 골라 주세요.' : `롤 ${result.rolls}개, 사진 ${result.frames}장을 가져왔어요.`)
          }}>이 앱이 저장한 사진 고르기</Row>
        </Group>
      </Section>

      <Section title="안내">
        <Group>
          <Row onPress={() => setPrivacy(true)}>개인정보 처리방침</Row>
        </Group>
      </Section>

      <Section title="버전" foot="앱 버전은 아이폰, 갤럭시, 웹이 같습니다.">
        <Group>
          <Row static value={APP_VERSION}><RowText>앱 버전</RowText></Row>
        </Group>
      </Section>

      <Group>
        <Row onPress={() => setConfirm(true)}><RowText color="#c0392b">모든 기록 지우기</RowText></Row>
      </Group>

      <View style={{ marginTop: 24, alignItems: 'center' }}><Footnote>필름함 · Filmchest · {APP_VERSION}</Footnote></View>
      {privacy ? (
        <Sheet title="개인정보 처리방침" onClose={() => setPrivacy(false)}>
          <View style={{ gap: 18 }}>
            {sections.map((s) => (
              <View key={s.title ?? s.body.slice(0, 12)} style={{ gap: 6 }}>
                {s.title ? <Text style={{ fontSize: 17, fontWeight: '700', color: c.ink }}>{s.title}</Text> : null}
                {s.body.split('\n').map((line) => <Text key={line} style={{ fontSize: 16, lineHeight: 24, color: c.ink }}>{line}</Text>)}
              </View>
            ))}
          </View>
        </Sheet>
      ) : null}

      {note ? <Confirm message={note} action="확인" onCancel={() => setNote(undefined)} onConfirm={() => setNote(undefined)} /> : null}
      {confirm ? (
        <Confirm message="카메라, 렌즈, 롤, 저장한 사진을 모두 지울까요? 되돌릴 수 없어요." action="모두 지우기"
          onCancel={() => setConfirm(false)}
          onConfirm={async () => {
            await Promise.all([db.cameras.clear(), db.lenses.clear(), db.rolls.clear(), db.frames.clear(), db.originals.clear(), db.zipQueue.clear()])
            setConfirm(false)
            onClose()
          }} />
      ) : null}
      {cloud ? <CloudBackup onClose={() => setCloud(false)} /> : null}
      {spending ? <Stats onClose={() => setSpending(false)} /> : null}
    </Sheet>
  )
}
