// 웹 pages/Settings.tsx
import { useEffect, useState } from 'react'
import { Welcome } from '../Welcome'
import { disconnectDrive, driveAccount, driveConnected, signOutAndClear } from '../drive'
import { notifyBackup } from '../core/backupNudge'
import { View } from 'react-native'
import { Text } from '../text'
import { db, wipeLocal, deleteRoll, purgeCamera, purgeOldCameras, purgeOldRolls, restoreCamera, restoreRoll } from '../data'
import { getPref, useLiveQuery } from '../store'
import { backupFileName, exportAll, exportWithPhotos, importBackupFile, photoBackupFileName, writeLocalBackup } from '../backup'
import { lastBackupAt, markFileBackup } from '../core/backupNudge'
import { useBackupRefresh } from '../BackupNudge'
import { restorePhotos } from '../restore'
import { CloudBackup, cloudStatus } from './CloudBackup'
import { Stats } from './Stats'
import { checkUpdate, downloadUpdate, installedBuilt } from '../update'
import { filmById } from '../core/films'
import { formatDate, formatDateTime } from '../core/types'
import { withWork } from '../core/work'
import { bytesText } from '../core/display'
import { sections } from '../core/privacyText'
import { APP_VERSION } from '../core/version'
import { Btn, Footnote, Group, Row, RowText, Section, Segmented, Sub } from '../kit'
import { Confirm, Sheet, SheetBtn } from '../overlay'
import { GlassBtn } from '../page'
import { saveFileNow, storageEstimate } from '../platform'
import { pickFiles } from '../pick'
import { applyTheme, useTheme } from '../theme'

const themes: [string, string][] = [['system', '기기 설정'], ['light', '라이트'], ['dark', '다크']]

/** 기기 밖에 남긴 마지막 백업 (기기 안 자동 백업은 앱을 지우면 함께 지워져서 빼고 센다) */
export const lastBackupText = () => { const t = lastBackupAt(); return t ? `마지막 백업 ${formatDateTime(t)}.` : '아직 기기 밖에 백업하지 않았어요.' }

export function Settings({ onClose, openBackup = false }: { onClose: () => void; openBackup?: boolean }) {
  useBackupRefresh()
  const c = useTheme()
  const [theme, setTheme] = useState<string>(getPref<string>('theme', 'system'))
  const [usage, setUsage] = useState<{ used: number; quota: number }>()
  const [confirm, setConfirm] = useState(false)
  const [privacy, setPrivacy] = useState(false)
  const [note, setNote] = useState<string>()
  const [cloud, setCloud] = useState(false)
  const [backupOpen, setBackupOpen] = useState(openBackup)
  const [saveChoice, setSaveChoice] = useState(false)
  const [login, setLogin] = useState(false)
  const [logout, setLogout] = useState(false)
  const [logoutStep, setLogoutStep] = useState<string>()
  const [saving, setSaving] = useState<string>()
  const [purge, setPurge] = useState<(() => Promise<unknown>) | null>(null)
  const [spending, setSpending] = useState(false)
  const [update, setUpdate] = useState(() => (installedBuilt() ? formatDate(installedBuilt() * 1000) : ''))
  // 백업 시트를 열 때만 휴지통을 읽는다 (설정 열자마자 큰 JSON을 건드리지 않음)
  const deleted = useLiveQuery(() => (backupOpen ? db.rolls.deletedOnly() : null), [backupOpen])
  const deletedCameras = useLiveQuery(() => (backupOpen ? db.cameras.deletedOnly() : null), [backupOpen])
  useEffect(() => {
    // 시트 그린 뒤에만 무거운 일 (폴드처럼 메모리가 빠듯한 기기에서 열자마자 죽지 않게)
    const t = setTimeout(() => {
      void storageEstimate().then(setUsage)
      void purgeOldRolls()
      void purgeOldCameras()
    }, 400)
    return () => clearTimeout(t)
  }, [])

  const choose = (t: string) => { setTheme(t); applyTheme(t) }

  const dialogs = (
    <>
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
        <Confirm message={driveConnected() ? '카메라, 렌즈, 롤, 저장한 사진을 이 기기에서 모두 지울까요? 구글 드라이브의 기록은 그대로 두고 로그아웃돼요. 되돌릴 수 없어요.' : '카메라, 렌즈, 롤, 저장한 사진을 모두 지울까요? 되돌릴 수 없어요.'} action="모두 지우기"
          onCancel={() => setConfirm(false)}
          onConfirm={async () => {
            if (driveConnected()) await disconnectDrive()
            await wipeLocal()
            setConfirm(false)
            onClose()
          }} />
      ) : null}
      {login ? <Welcome loginOnly onDone={() => setLogin(false)} /> : null}
      {logout ? <Confirm message="로그아웃할까요? 기록과 사진을 드라이브에 올린 뒤 이 기기에서 지워요. 다시 로그인하면 받아 와요." action="로그아웃"
        onCancel={() => setLogout(false)} onConfirm={async () => {
          setLogout(false)
          setLogoutStep('준비 중…')
          try {
            await signOutAndClear(setLogoutStep)
            notifyBackup()
            onClose()
          } catch (e) {
            setNote(`드라이브에 다 올리지 못해서 로그아웃하지 않았어요. 기록은 이 기기에 그대로 있어요. (${e instanceof Error ? e.message : String(e)})`)
          } finally {
            setLogoutStep(undefined)
          }
        }} /> : null}
      {logoutStep ? <Confirm message={logoutStep} busy onCancel={() => {}} onConfirm={() => {}} /> : null}
      {purge ? <Confirm message='완전히 지울까요? 이 작업은 되돌릴 수 없습니다.' action="지우기" onCancel={() => setPurge(null)} onConfirm={() => { const run = purge; setPurge(null); void withWork(run) }} /> : null}
    </>
  )

  // 삼성 등에서 Modal을 겹치면 바로 종료되는 경우가 있어, 맨 위 시트만 연다.
  if (cloud) {
    return (
      <>
        <CloudBackup onClose={() => setCloud(false)} />
        {dialogs}
      </>
    )
  }

  if (saveChoice) {
    return (
      <>
        <Sheet title="백업 파일로 저장" onClose={() => setSaveChoice(false)}>
          <Section foot="사진까지 저장한 zip을 불러오면 사진도 롤에 다시 붙어요.">
            <Group>
              <Row onPress={() => { if (saving) return; void withWork(async () => {
                await writeLocalBackup(); await saveFileNow(backupFileName, await exportAll(), 'application/json'); markFileBackup(); setSaveChoice(false)
              }) }}><RowText sub="장비·필름·롤 기록 · 작은 파일">기록만</RowText></Row>
              <Row value={saving} onPress={() => { if (saving) return; void withWork(async () => {
                try {
                  const zip = await exportWithPhotos((d, t) => setSaving(`사진 ${d}/${t}`))
                  await saveFileNow(photoBackupFileName, zip, 'application/zip'); markFileBackup(); setSaveChoice(false)
                } finally { setSaving(undefined) }
              }) }}><RowText sub="스캔 사진도 함께 · zip · 큰 파일">사진까지</RowText></Row>
            </Group>
          </Section>
        </Sheet>
        {dialogs}
      </>
    )
  }

  if (spending) {
    return (
      <>
        <Stats onClose={() => setSpending(false)} />
        {dialogs}
      </>
    )
  }

  if (backupOpen) {
    return (
      <>
        <Sheet title="백업 및 복구" onClose={() => setBackupOpen(false)} left={null} right={<SheetBtn label="완료" accent onPress={() => setBackupOpen(false)} />}>
          <Section title="백업" foot={`${lastBackupText()} 장비·필름·롤 기록을 파일 하나로 저장해요. 스캔 사진은 빠져요. 웹앱 백업 파일도 불러올 수 있어요.`}>
            <Group>
              <Row chev value={cloudStatus()} onPress={() => setCloud(true)}><RowText>클라우드 백업</RowText></Row>
              <Row onPress={() => setSaveChoice(true)}>백업 파일로 저장</Row>
              <Row onPress={() => { void withWork(async () => {
                const [file] = await pickFiles(['application/json', 'text/plain', '*/*'], false)
                if (!file) return
                try {
                  const counts = await importBackupFile(file.uri)
                  setNote(`카메라 ${counts.cameras}대, 롤 ${counts.rolls}개${counts.photos ? `, 사진 ${counts.photos}장` : ''}을 불러왔어요.`)
                } catch {
                  setNote('백업 파일을 읽지 못했어요.')
                }
              }) }}>백업 불러오기</Row>
            </Group>
          </Section>

          <Section title="사진으로 롤 복구" foot="이 앱(아이폰·웹·갤럭시)으로 저장했던 사진을 고르면 표식으로 롤을 다시 묶어요. 클라우드 백업을 먼저 복구하면 필름·카메라 정보까지 함께 돌아와요.">
            <Group>
              <Row onPress={() => { void withWork(async () => {
                const files = await pickFiles(['image/jpeg'])
                if (!files.length) return
                const result = await restorePhotos(files)
                setNote(result.frames === 0 ? '표식을 찾지 못했어요. 이 앱에서 저장한 원본 사진을 골라 주세요.' : `롤 ${result.rolls}개, 사진 ${result.frames}장을 가져왔어요.`)
              }) }}>이 앱이 저장한 사진 고르기</Row>
            </Group>
          </Section>
          <Section title="삭제한 롤" foot="지운 롤은 24시간 동안 여기 남아요. 사진 앱에 저장한 사진은 그대로예요.">
            <Group>
              {deleted == null ? <Row static><Sub>불러오는 중…</Sub></Row> : deleted.length === 0 ? <Row static><Sub>최근 24시간 안에 지운 롤이 없어요</Sub></Row> : null}
              {deleted?.map((roll) => (
                <Row key={roll.id} static>
                  <RowText>{filmById(roll.filmId)?.name ?? '필름 알 수 없음'}</RowText>
                  <Btn label="되돌리기" kind="ghost" onPress={() => { void restoreRoll(roll.id) }} />
                  <Btn label="지금 지우기" kind="danger" onPress={() => setPurge(() => () => deleteRoll(roll.id, true))} />
                </Row>
              ))}
            </Group>
          </Section>

          <Section title="삭제한 장비" foot="지운 카메라는 24시간 동안 여기 남아요. 필름에 적힌 카메라 정보는 카메라를 지워도 그대로예요.">
            <Group>
              {deletedCameras == null ? <Row static><Sub>불러오는 중…</Sub></Row> : deletedCameras.length === 0 ? <Row static><Sub>최근 24시간 안에 지운 카메라가 없어요</Sub></Row> : null}
              {deletedCameras?.map((camera) => (
                <Row key={camera.id} static>
                  <RowText>{camera.brand} {camera.model}</RowText>
                  <Btn label="되돌리기" kind="ghost" onPress={() => { void restoreCamera(camera.id) }} />
                  <Btn label="지금 지우기" kind="danger" onPress={() => setPurge(() => () => purgeCamera(camera.id))} />
                </Row>
              ))}
            </Group>
          </Section>
        </Sheet>
        {dialogs}
      </>
    )
  }

  return (
    <>
      <Sheet title="설정" onClose={onClose} left={null} right={<SheetBtn label="완료" accent onPress={onClose} />}>
        <Section title="화면">
          <Segmented value={theme} options={themes} onChange={choose} />
        </Section>

        <Section title="계정">
          <Group>
            {driveConnected() ? [
              <Row key="a" static><RowText sub="기록과 사진을 내 구글 드라이브에 맞춰요">{driveAccount() ?? '구글 계정'}</RowText></Row>,
              <Row key="o" onPress={() => setLogout(true)}><RowText color={c.danger}>로그아웃</RowText></Row>,
            ] : <Row onPress={() => setLogin(true)}><Text style={{ color: c.safelight, fontSize: 17 }}>구글로 로그인</Text></Row>}
          </Group>
        </Section>

        <Section foot={lastBackupText()}>
          <Group>
            <Row chev onPress={() => setSpending(true)}><RowText>통계</RowText></Row>
            <Row chev value={cloudStatus()} onPress={() => setBackupOpen(true)}><RowText>백업 및 복구</RowText></Row>
          </Group>
        </Section>

        <Section title="저장" foot={driveConnected()
          ? '기록과 사진은 이 앱과 내 구글 드라이브에 저장돼요. 같은 계정으로 로그인한 기기에서만 보여요.'
          : '기록과 사진은 이 앱 안에만 저장돼요. 앱을 지우면 함께 지워지니, 구글로 로그인하거나 백업해 두세요.'}>
          <Group>
            <Row static value={bytesText(usage?.used) ?? '—'}><RowText>이 앱에 저장된 양</RowText></Row>
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
            <Row chev value={update} onPress={() => { void withWork(async () => {
              try {
                const u = await checkUpdate()
                if (u.newer) { setUpdate('새 버전 있음'); void downloadUpdate(); setNote('새 버전을 내려받아요. 다 받으면 알림을 눌러 설치하세요. 기록은 그대로 남아요.') }
                else { setUpdate('최신 버전'); setNote('지금 최신 버전이에요.') }
              } catch { setNote('업데이트를 확인하지 못했어요. 인터넷 연결을 확인해 주세요.') }
            }) }}><RowText>업데이트 확인</RowText></Row>
          </Group>
        </Section>

        <Group>
          <Row onPress={() => setConfirm(true)}><RowText color="#c0392b">모든 기록 지우기</RowText></Row>
        </Group>

        <View style={{ marginTop: 24, alignItems: 'center' }}><Footnote>필름함 {APP_VERSION}</Footnote></View>
      </Sheet>
      {dialogs}
    </>
  )
}

/** 탭 왼쪽 위 설정 버튼 (웹 SettingsButton과 같음) */
export function SettingsButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <GlassBtn icon="gear" label="설정" onPress={() => setOpen(true)} />
      {open ? <Settings onClose={() => setOpen(false)} /> : null}
    </>
  )
}
