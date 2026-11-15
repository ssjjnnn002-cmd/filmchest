// 웹 pages/CloudBackup.tsx 자리. 안드로이드는 클라우드 앱에 올린 백업 파일을 골라 연결한다.
import { useState } from 'react'
import { View } from 'react-native'
import { Text } from '../text'
import {
  backupFileName, importAll, cloudDays, cloudLast, cloudName, cloudUri, disconnectCloud, linkCloudFile, localBackupAt, openAppSettings, shareForCloud, verifyCloud, writeCloud,
} from '../backup'
import { setPref } from '../store'
import * as Drive from '../drive'
import { Toggle } from '../kit'
import { Group, Row, RowText, Section, Select, Sub } from '../kit'
import { Sheet, SheetBtn } from '../overlay'
import { formatDateTime } from '../core/types'
import { withWork } from '../core/work'
import { useTheme } from '../theme'

const clouds: [string, string][] = [
  ['구글 드라이브', 'Google Drive 앱'],
  ['OneDrive', 'OneDrive 앱'],
  ['Dropbox', 'Dropbox 앱'],
  ['삼성 클라우드·내 파일', '내 파일 앱의 클라우드 위치'],
  ['다른 위치', '파일을 저장할 수 있는 아무 앱'],
]

export function cloudStatus() {
  if (Drive.driveConnected()) return '연결됨 · 구글 드라이브'
  return cloudUri() ? `연결됨 · ${cloudName() ?? '파일'}` : '연결 안 됨'
}

export function CloudBackup({ onClose }: { onClose: () => void }) {
  const c = useTheme()
  const [, setRev] = useState(0)
  const [pick, setPick] = useState<string>()
  const [msg, setMsg] = useState<{ text: string; ok: boolean }>()
  const [progress, setProgress] = useState('')
  const drive = Drive.driveConnected()
  const refresh = () => setRev((n) => n + 1)
  const connected = !!cloudUri()
  const run = (fn: () => Promise<unknown>, ok: string) => { void withWork(async () => {
    try { await fn(); if (ok) setMsg({ text: ok, ok: true }) } catch (e) { setProgress(''); setMsg({ text: (e as Error).message || '하지 못했어요', ok: false }) }
    refresh()
  }) }
  return (
    <Sheet title="클라우드 백업" onClose={onClose} left={null} right={<SheetBtn label="완료" accent onPress={onClose} />}>
      <Section title="구글 드라이브" foot={`내 드라이브의 '필름함' 폴더에 기록과 스캔 사진을 올려요. 바뀌면 바로 올리고, 앱을 보는 동안 다른 기기에서 고친 기록을 받아요. 장비 기록은 '${backupFileName}' 하나에 덮어써서 여러 번 불러와도 늘어나지 않아요.`}>
        <Group>
          {msg ? <Row static><Text style={{ color: msg.ok ? '#30a46c' : c.danger, fontSize: 15 }}>{msg.ok ? '✓ ' : '✕ '}{msg.text}</Text></Row> : null}
          {!drive ? (
            <Row onPress={() => run(Drive.connectDrive, '구글 드라이브에 연결하고 첫 백업을 올렸어요.')}><Text style={{ color: c.safelight, fontSize: 17, fontWeight: '600' }}>구글 드라이브 연결</Text></Row>
          ) : [
            <Row key="s" static>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 17, fontWeight: '700', color: c.ink }}>연결됨 · {Drive.driveAccount() ?? '구글 드라이브'}</Text>
                {Drive.driveLast() ? <Sub>마지막 백업 {formatDateTime(Drive.driveLast()!)}</Sub> : null}
              </View>
            </Row>,
            <Row key="o" chev onPress={() => { void Drive.openDriveFolder() }}><RowText>드라이브에서 백업 폴더 열기</RowText></Row>,
            <Row key="r" onPress={() => run(async () => { const n = await Drive.pullFromDrive(true); setMsg(n ? { text: `카메라 ${n.cameras}대, 롤 ${n.rolls}개를 되살렸어요.`, ok: true } : { text: '드라이브에 기록 파일이 아직 없어요.', ok: false }) }, '')}><RowText>드라이브에서 장비·기록 복구 (최신 파일)</RowText></Row>,
            <Row key="ph" onPress={() => { if (!progress) void run(async () => {
              const n = await Drive.restorePhotosFromDrive((d, t) => setProgress(t ? `${d} / ${t}장 받는 중` : ''))
              setProgress(''); setMsg({ text: `롤 ${n.rolls}개, 사진 ${n.frames}장을 되살렸어요.`, ok: true })
            }, '') }}><RowText>드라이브에서 사진 복구</RowText></Row>,
            <Row key="x" onPress={() => run(Drive.disconnectDrive, '구글 드라이브 연결을 끊었어요. 올린 파일은 그대로예요.')}><RowText color={c.danger}>연결 끊기</RowText></Row>,
          ]}
        </Group>
      </Section>

      <Section title="다른 클라우드 (파일 하나 연결)" foot={`기록이 바뀌면 연결한 '${backupFileName}' 파일에 덮어써요. 스캔 사진은 빠져요.`}>
        <Group>
          <Row static>
            <Text style={{ fontSize: 24, color: connected ? c.safelight : c.muted, marginRight: 4 }}>{connected ? '☁︎' : '⊘'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: c.ink }}>{cloudStatus()}</Text>
              {cloudLast() ? <Sub>마지막 백업 {formatDateTime(cloudLast()!)}</Sub> : null}
            </View>
          </Row>
          {connected ? [
            <Row key="v" onPress={() => run(async () => { const f = await verifyCloud(); if (f) throw new Error(f) }, `${cloudName() ?? '파일'}에 저장하고 다시 읽었어요. 연결돼 있어요.`)}><RowText>연결 확인</RowText></Row>,
            <Row key="r" onPress={() => run(async () => { const n = await importAll(cloudUri()!); setMsg({ text: `카메라 ${n.cameras}대, 롤 ${n.rolls}개를 되살렸어요. 사진은 '사진으로 롤 복구'로 붙여 주세요.`, ok: true }) }, '')}><RowText>클라우드 백업에서 복구</RowText></Row>,
            <Row key="x" danger onPress={() => { disconnectCloud(); setMsg(undefined); refresh() }}><RowText color={c.danger}>연결 끊기</RowText></Row>,
          ] : null}
        </Group>
      </Section>

      <Section title={connected ? '다른 클라우드로 바꾸기' : '연결할 클라우드'} foot="안드로이드는 클라우드 폴더를 바로 고를 수 없어서 두 단계로 연결해요.">
        <Group>
          {clouds.map(([name, help]) => (
            <Row key={name} onPress={() => { setPick(name); setMsg(undefined) }}>
              <View style={{ flex: 1 }}><Text style={{ fontSize: 17, color: c.ink }}>{name}</Text><Sub>{help}</Sub></View>
              {connected && cloudName() === name ? <Text style={{ color: c.safelight }}>✓</Text> : <Text style={{ color: c.muted }}>›</Text>}
            </Row>
          ))}
        </Group>
      </Section>

      {pick ? (
        <Section title={`${pick} 연결`}>
          <Group>
            <Row onPress={() => run(shareForCloud, `공유 창에서 ${pick}에 저장했다면 2단계를 눌러 주세요.`)}>
              <View style={{ flex: 1 }}><Text style={{ fontSize: 17, color: c.safelight }}>1. 백업 파일 올리기</Text>
                <Sub>{`공유 창에서 ${pick}(또는 '드라이브에 저장')을 골라 저장해요.`}</Sub></View>
            </Row>
            <Row onPress={() => run(async () => {
              if (!(await linkCloudFile(pick))) throw new Error('파일을 고르지 않았어요')
              const f = await verifyCloud()
              if (f) { disconnectCloud(); throw new Error(`${f} 이 클라우드는 앱이 파일을 고쳐 쓸 수 없을 수 있어요.`) }
              setPick(undefined)
            }, `${pick}에 연결했어요. 연결 확인까지 마쳤어요.`)}>
              <View style={{ flex: 1 }}><Text style={{ fontSize: 17, color: c.safelight }}>2. 올린 파일 골라 연결</Text>
                <Sub>{`파일 고르는 창 왼쪽 메뉴에서 ${pick}을 열고 '${backupFileName}'을 고르세요.`}</Sub></View>
            </Row>
          </Group>
        </Section>
      ) : null}

      <Section title="휴대폰 구글 백업" foot={`${localBackupAt() ? `마지막으로 써 둔 파일 ${formatDateTime(localBackupAt()!)}. ` : ''}휴대폰 설정 > 계정 및 백업 > Google 드라이브 백업이 켜져 있으면 이 파일도 함께 올라가요. 확인은 휴대폰 설정에서만 할 수 있어요.`}>
        <Group>
          <Row onPress={openAppSettings}><RowText>{"휴대폰 설정 › 애플리케이션 › 필름함 열기"}</RowText></Row>
        </Group>
      </Section>
    </Sheet>
  )
}
