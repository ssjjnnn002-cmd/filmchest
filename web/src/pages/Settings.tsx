import { tick } from '../motion'
import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, wipeLocal, deleteRoll, purgeCamera, purgeOldCameras, purgeOldRolls, restoreCamera, restoreRoll, storageEstimate } from '../db'
import { backupFileName, exportAll, exportWithPhotos, importBackupFile, photoBackupFileName } from '../core/backup'
import { isOldSite } from '../core/move'
import { lastBackupAt, markFileBackup } from '../core/backupNudge'
import { useBackupRefresh } from '../ui/BackupNudge'
import { MoveGuide } from '../ui/MoveNotice'
import { Welcome } from '../ui/Welcome'
import { disconnectDrive, driveAccount, driveAvailable, driveConnected, signOutKeep } from '../core/drive'
import { CloudBackup, cloudStatus } from './CloudBackup'
import { Stats } from './Stats'
import { restorePhotos } from '../core/restore'
import { filmById } from '../core/films'
import { formatDateTime } from '../core/types'
import { withWork } from '../core/work'
import { Confirm, Icon, Sheet, bytesText } from '../ui/common'
import { PrivacyPolicy } from './Privacy'
import { lockDevMode, unlockDevMode, useDevMode } from '../core/devMode'
import { supporterNames } from '../core/supporters'
import { FREE_ROLLS_PER_MONTH, clearPremiumTest, devPremiumOn, loadsThisMonth, premiumTestOn, setDevPremium, setPremiumTest } from '../core/premium'
import { applyTheme, getPref, inClaudeHost, refreshApp, saveFileNow, setPref } from '../platform'

const themes: [string, string][] = [['system', '기기 설정'], ['light', '라이트'], ['dark', '다크']]

/** 기기 밖에 남긴 마지막 백업 */
export const lastBackupText = () => { const t = lastBackupAt(); return t ? `마지막 백업 ${formatDateTime(t)}.` : '아직 기기 밖에 백업하지 않았어요.' }

const SHOW_APK = false

export function Settings({ onClose, openBackup = false }: { onClose: () => void; openBackup?: boolean }) {
  useBackupRefresh()
  const [theme, setTheme] = useState<string>(getPref('theme', 'system'))
  const [usage, setUsage] = useState<{ used: number; quota: number }>()
  const [confirm, setConfirm] = useState(false)
  const [privacy, setPrivacy] = useState(false)
  const [thanks, setThanks] = useState(false)
  const supporters = supporterNames()
  const [note, setNote] = useState<string>()
  const [cloud, setCloud] = useState(false)
  const [backupOpen, setBackupOpen] = useState(openBackup)
  const [purge, setPurge] = useState<(() => Promise<unknown>) | null>(null)
  const [spending, setSpending] = useState(false)
  const deleted = useLiveQuery(async () => (await db.rolls.toArray()).filter((r) => r.deletedAt), [])
  const deletedCameras = useLiveQuery(async () => (await db.cameras.toArray()).filter((c) => c.deletedAt), [])
  useEffect(() => { storageEstimate().then(setUsage); void purgeOldRolls(); void purgeOldCameras() }, [])
  // 안드로이드에서만 내려받기를 보여 준다 (파일은 깃허브 릴리스에 있다)
  const [apk, setApk] = useState(false)
  const [moveGuide, setMoveGuide] = useState(false)
  const [saveChoice, setSaveChoice] = useState(false)
  const [login, setLogin] = useState(false)
  const [logout, setLogout] = useState(false)
  const [logoutStep, setLogoutStep] = useState<string>()
  const [logoutError, setLogoutError] = useState<string>()
  const [saving, setSaving] = useState<string>()
  const [showDev, setShowDev] = useState(false)
  const devPress = useRef<number>()
  useEffect(() => {
    // 아이폰, 클로드 화면, 이미 설치된 앱 안에서는 숨긴다
    const installed = matchMedia('(display-mode: standalone)').matches || document.referrer.startsWith('android-app://')
    if (inClaudeHost() || installed || /iPhone|iPad|iPod/.test(navigator.userAgent)) return
    // 정식 출시(플레이스토어) 준비 중이라 내려받기는 숨긴다. 파일은 남겨 둬서 이미 설치한 앱의 업데이트는 그대로
    if (!SHOW_APK) return
    setApk(true)
  }, [])

  const choose = (t: string) => { setTheme(t); setPref('theme', t); applyTheme(t) }

  return (
    <Sheet title="설정" onClose={onClose} left={<span />} right={<button className="btn ghost" onClick={onClose}><b>완료</b></button>}>
      {/* 계정 · 백업 · 저장을 한곳에 (아이폰·갤럭시와 같은 순서) */}
      <div className="section">
        <h2>계정 · 백업</h2>
        <div className="group">
          {driveAvailable && !inClaudeHost() && (driveConnected()
            ? <div className="row static"><span className="grow">{driveAccount() ?? '구글 계정'}<span className="sub">기록과 사진을 내 구글 드라이브에 맞춰요</span></span></div>
            : <button className="row accent" onClick={() => setLogin(true)}>구글로 로그인</button>)}
          <button className="row" onClick={() => setBackupOpen(true)}><span className="grow">백업 및 복구</span><span className="value">{cloudStatus()}</span><Icon name="chev" size={18} /></button>
          <div className="row static"><span className="grow">이 브라우저에 저장된 양</span><span className="value">{bytesText(usage?.used) ?? '—'}</span></div>
          {driveAvailable && !inClaudeHost() && driveConnected() && <button className="row danger" onClick={() => setLogout(true)}>로그아웃</button>}
        </div>
        <p className="footnote">
          {driveConnected()
            ? '기록과 사진은 이 브라우저와 내 구글 드라이브에 저장돼요. 같은 계정으로 로그인한 기기에서만 보여요.'
            : '기록과 사진은 이 브라우저 안에만 저장돼요. 브라우저 데이터를 지우면 함께 지워지니, 구글로 로그인하거나 백업해 두세요.'}
          {' '}{lastBackupText()}
        </p>
        {inClaudeHost() && <p className="footnote">이 화면에서는 위치 확인과 장소 검색을 쓸 수 없어요. 장소는 이름과 좌표를 직접 넣어 주세요.</p>}
      </div>

      <div className="section">
        <div className="group">
          <button className="row" onClick={() => setSpending(true)}><span className="grow">통계와 기록</span><Icon name="chev" size={18} /></button>
        </div>
      </div>

      {apk && (
        <div className="section">
          <h2>안드로이드 앱</h2>
          <div className="group">
            <a className="row accent" href={`/filmchest.apk?v=${__APP_VERSION__}`}>
              <span className="grow">안드로이드 앱 내려받기</span>
              <span className="value">{__APP_VERSION__}</span>
            </a>
          </div>
          <p className="footnote">
            내려받은 파일을 열어 설치하세요. 처음엔 '출처를 알 수 없는 앱 설치'를 허용해 달라고 나와요.
            갤럭시에 설치되는 필름함 앱이에요. 같은 구글 계정으로 로그인하면 기록이 이어져요.
          </p>
        </div>
      )}


      <div className="section">
        <h2>화면</h2>
        <div className="group"><div className="segmented-cell"><div className="segmented slide" style={{ '--i': Math.max(0, themes.findIndex(([k]) => k === theme)), '--n': themes.length } as React.CSSProperties}>
          {themes.map(([k, n]) => <button key={k} className={k === theme ? 'on' : ''} onClick={() => choose(k)}>{n}</button>)}
        </div></div></div>
      </div>

      <div className="section">
        <h2>정보</h2>
        <div className="group">
          <button className="row" onClick={() => setPrivacy(true)}><span className="grow">개인정보 처리방침</span><Icon name="chev" size={18} /></button>
          {/* 함께 만든 분들 (텀블벅 후원자). 목록이 비어 있으면 줄을 숨긴다 */}
          {supporters.length > 0 && <button className="row" onClick={() => setThanks(true)}><span className="grow">함께 만든 분들</span><Icon name="chev" size={18} /></button>}
          {/* 개발자 모드는 숨겨 둔다: 앱 버전을 5초 누르면 나타난다. 켜져 있으면 끌 때까지 늘 보인다 */}
          <div className="row static" style={{ userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }} onContextMenu={(e) => e.preventDefault()}
            onPointerDown={() => { window.clearTimeout(devPress.current); devPress.current = window.setTimeout(() => { tick(15); setShowDev(true) }, 5000) }}
            onPointerUp={() => window.clearTimeout(devPress.current)} onPointerLeave={() => window.clearTimeout(devPress.current)} onPointerCancel={() => window.clearTimeout(devPress.current)}>
            <span className="grow">앱 버전</span>
            <span className="value">{__APP_VERSION__}</span>
          </div>
          <button className="row" onClick={() => { void withWork(async () => { await refreshApp() }) }}>
            <span className="grow">최신 버전 적용</span>
          </button>
          <DevModeRow shown={showDev} />
        </div>
        <p className="footnote">
          앱 버전은 아이폰, 갤럭시, 웹이 같습니다.
          최신 버전 적용은 화면만 다시 불러오고, 카메라·롤·현상·스캔 기록은 이 브라우저에 그대로 남아요.
        </p>
      </div>

      <div className="group">
        <button className="row" style={{ color: '#c0392b' }} onClick={() => setConfirm(true)}>모든 기록 지우기</button>
      </div>

      {privacy && (
        <Sheet title="개인정보 처리방침" onClose={() => setPrivacy(false)}>
          <PrivacyPolicy />
        </Sheet>
      )}
      {thanks && (
        <Sheet title="함께 만든 분들" onClose={() => setThanks(false)}>
          <Supporters names={supporters} />
        </Sheet>
      )}

      {note && (
        <Confirm message={note} action="확인" onCancel={() => setNote(undefined)} onConfirm={async () => setNote(undefined)} />
      )}
      {confirm && (
        <Confirm message={driveConnected() ? '카메라, 렌즈, 롤, 저장한 사진을 이 기기에서 모두 지울까요? 구글 드라이브의 기록은 그대로 두고 로그아웃돼요. 되돌릴 수 없어요.' : '카메라, 렌즈, 롤, 저장한 사진을 모두 지울까요? 되돌릴 수 없어요.'} action="모두 지우기"
          onCancel={() => setConfirm(false)}
          onConfirm={() => { void withWork(async () => { if (driveConnected()) disconnectDrive(); await wipeLocal(); setConfirm(false); onClose() }) }} />
      )}
      {spending && <Stats onClose={() => setSpending(false)} />}
      {backupOpen && (
        <Sheet title="백업 및 복구" onClose={() => setBackupOpen(false)} left={<span />} right={<button className="btn ghost" onClick={() => setBackupOpen(false)}><b>완료</b></button>}>
          <div className="section">
            <h2>백업</h2>
            <div className="group">
              <button className="row" onClick={() => setCloud(true)}><span className="grow">클라우드 백업</span><span className="value">{cloudStatus()}</span><Icon name="chev" size={18} /></button>
              <button className="row" onClick={() => setSaveChoice(true)}>백업 파일로 저장</button>
              {!isOldSite && <button className="row" onClick={() => setMoveGuide(true)}>예전 주소(vercel.app) 기록 옮기기</button>}
              <label className="row">백업 불러오기
                <input type="file" accept="application/json,.json,application/zip,.zip" hidden onChange={async (e) => {
                  const file = e.target.files?.[0]
                  e.target.value = ''
                  if (!file) return
                  try {
                    const counts = await withWork(() => importBackupFile(file))
                    setNote(`카메라 ${counts.cameras}대, 롤 ${counts.rolls}개${counts.photos ? `, 사진 ${counts.photos}장` : ''}을 불러왔어요.`)
                  } catch {
                    setNote('백업 파일을 읽지 못했어요.')
                  }
                }} />
              </label>
            </div>
            <p className="footnote">{lastBackupText()} 저장할 때 스캔 사진도 넣을지 골라요. 불러오면 같은 항목은 덮어써서 늘어나지 않아요.</p>
          </div>

          <div className="section">
            <h2>사진으로 롤 복구</h2>
            <div className="group">
              <label className="row">이 앱이 저장한 사진 고르기
                <input type="file" accept="image/*" multiple hidden onChange={async (e) => {
                  const files = [...(e.target.files ?? [])]
                  e.target.value = ''
                  if (!files.length) return
                  const result = await withWork(() => restorePhotos(files))
                  setNote(result.frames === 0 ? '표식을 찾지 못했어요. 아이폰에서는 사진 앱 대신 \'파일\'에서 고르거나, 원본으로 공유해서 저장한 사진을 골라 주세요.' : `롤 ${result.rolls}개, 사진 ${result.frames}장을 가져왔어요.`)
                }} />
              </label>
            </div>
            <p className="footnote">이 앱(아이폰·웹·갤럭시)으로 저장했던 사진을 고르면 표식으로 롤을 다시 묶어요. 클라우드 백업을 먼저 복구하면 필름·카메라 정보까지 함께 돌아와요.</p>
          </div>
          <div className="section">
            <h2>삭제한 롤</h2>
            <div className="group">
              {deleted === undefined && <div className="row static sub">불러오는 중…</div>}
              {deleted?.length === 0 && <div className="row static sub">최근 24시간 안에 지운 롤이 없어요</div>}
              {deleted?.map((roll) => (
                <div className="row" key={roll.id}>
                  <span className="grow">{filmById(roll.filmId)?.name ?? '필름 알 수 없음'}</span>
                  <button className="btn ghost" onClick={() => { void restoreRoll(roll.id) }}>되돌리기</button>
                  <button className="btn ghost" style={{ color: '#c0392b' }} onClick={() => setPurge(() => () => deleteRoll(roll.id, true))}>지금 지우기</button>
                </div>
              ))}
            </div>
            <p className="footnote">지운 롤은 24시간 동안 여기 남아요. 사진 앱에 저장한 사진은 그대로예요.</p>
          </div>

          <div className="section">
            <h2>삭제한 장비</h2>
            <div className="group">
              {deletedCameras === undefined && <div className="row static sub">불러오는 중…</div>}
              {deletedCameras?.length === 0 && <div className="row static sub">최근 24시간 안에 지운 카메라가 없어요</div>}
              {deletedCameras?.map((camera) => (
                <div className="row" key={camera.id}>
                  <span className="grow">{camera.brand} {camera.model}</span>
                  <button className="btn ghost" onClick={() => { void restoreCamera(camera.id) }}>되돌리기</button>
                  <button className="btn ghost" style={{ color: '#c0392b' }} onClick={() => setPurge(() => () => purgeCamera(camera.id))}>지금 지우기</button>
                </div>
              ))}
            </div>
            <p className="footnote">지운 카메라는 24시간 동안 여기 남아요. 필름에 적힌 카메라 정보는 카메라를 지워도 그대로예요.</p>
          </div>

        </Sheet>
      )}
      {cloud && <CloudBackup onClose={() => setCloud(false)} />}
      {purge && <Confirm message='완전히 지울까요? 이 작업은 되돌릴 수 없습니다.' action="지우기" onCancel={() => setPurge(null)} onConfirm={async () => { const run = purge; setPurge(null); await run() }} />}
      {moveGuide && <MoveGuide onClose={() => setMoveGuide(false)} />}
      {login && <Welcome loginOnly onDone={() => setLogin(false)} />}
      {logout && <Confirm message="로그아웃할까요? 이 기기의 기록은 그대로 남고, 같은 계정으로 다시 로그인하면 바로 이어져요." action="로그아웃"
        onCancel={() => setLogout(false)} onConfirm={async () => {
          setLogout(false)
          setLogoutStep('준비 중…')
          try {
            await signOutKeep(setLogoutStep)
            onClose()
            window.dispatchEvent(new Event('filmchest-signedout'))
          } catch (e) {
            setLogoutError(`로그아웃하지 못했어요. (${e instanceof Error ? e.message : e})`)
          } finally {
            setLogoutStep(undefined)
          }
        }} />}
      {logoutStep && <div className="alert-backdrop"><div className="alert" role="status"><p>{logoutStep}</p></div></div>}
      {logoutError && <Confirm message={logoutError} action="확인" safe onCancel={() => setLogoutError(undefined)} onConfirm={() => setLogoutError(undefined)} />}
      {saveChoice && (
        <Sheet title="백업 파일로 저장" onClose={() => setSaveChoice(false)}>
          <div className="section">
            <div className="group">
              <button className="row" disabled={!!saving} onClick={() => { void withWork(async () => {
                await saveFileNow(backupFileName, await exportAll()); markFileBackup(); setSaveChoice(false)
              }) }}><span className="grow">기록만<span className="sub">장비·필름·롤 기록 · 작은 파일</span></span></button>
              <button className="row" disabled={!!saving} onClick={() => { void withWork(async () => {
                try {
                  const zip = await exportWithPhotos((done, total) => setSaving(`사진 ${done}/${total}`))
                  await saveFileNow(photoBackupFileName, zip); markFileBackup(); setSaveChoice(false)
                } finally { setSaving(undefined) }
              }) }}><span className="grow">사진까지<span className="sub">스캔 사진도 함께 · zip · 큰 파일</span></span>{saving && <span className="value">{saving}</span>}</button>
            </div>
            <p className="footnote">사진까지 저장한 zip을 불러오면 사진도 롤에 다시 붙어요.</p>
          </div>
        </Sheet>
      )}
    </Sheet>
  )
}

/** 탭 왼쪽 위 설정 버튼 (모든 탭 같은 자리) */
export function SettingsButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button className="glass-btn round" onClick={() => setOpen(true)} aria-label="설정"><Icon name="gear" /></button>
      {open && <Settings onClose={() => setOpen(false)} />}
    </>
  )
}

/** 개발자 모드: 관리자 코드를 넣으면 아직 모두에게 열지 않은 기능(노출계)이 열린다 */
function DevModeRow({ shown }: { shown: boolean }) {
  const on = useDevMode()
  const [asking, setAsking] = useState(false)
  const [offAsk, setOffAsk] = useState(false)
  const [code, setCode] = useState('')
  const [wrong, setWrong] = useState(false)
  const close = () => { setAsking(false); setCode(''); setWrong(false) }
  const submit = () => { if (unlockDevMode(code)) close(); else setWrong(true) }
  return (
    <>
      {(on || shown) && <button className="row" onClick={() => (on ? setOffAsk(true) : setAsking(true))}>
        <span className="grow">개발자 모드</span>
        {on && <span className="value">켜짐</span>}
      </button>}
      {on && <a className="row" href={`${import.meta.env.BASE_URL}meter-lab.html`}><span className="grow">노출계 시험</span><Icon name="chev" size={18} /></a>}
      {on && <PremiumTestRows />}
      {asking && (
        <Sheet title="개발자 모드" onClose={close}
          left={<button className="btn ghost" onClick={close}>취소</button>}
          right={<button className="btn ghost" onClick={submit} disabled={!code}><b>켜기</b></button>}>
          <div className="section">
            <div className="group">
              <div className="field">
                <label htmlFor="dev-code">관리자 코드</label>
                <input id="dev-code" className="input" type="password" inputMode="numeric" autoComplete="off" autoFocus value={code}
                  onChange={(e) => { setCode(e.target.value); setWrong(false) }}
                  onKeyDown={(e) => { if (e.key === 'Enter' && code) submit() }} />
              </div>
            </div>
            {wrong && <p className="footnote warn">코드가 맞지 않아요.</p>}
          </div>
        </Sheet>
      )}
      {offAsk && <Confirm message="개발자 모드를 끌까요?" action="끄기" onCancel={() => setOffAsk(false)} onConfirm={() => { clearPremiumTest(); lockDevMode(); setOffAsk(false) }} />}
    </>
  )
}

/** 함께 만든 분들: 고마운 후원자 이름을 한 줄씩 (텀블벅 선물 이미지와 같은 모양) */
function Supporters({ names }: { names: string[] }) {
  return (
    <div className="section">
      <h2 style={{ fontSize: 22, fontWeight: 700, textTransform: 'none', letterSpacing: 0, color: 'var(--ink)', margin: '4px 0 10px' }}>고마운 후원자</h2>
      <div className="group">
        {names.map((n, i) => (
          <div key={`${i}-${n}`} className="row static" style={{ gap: 14 }}>
            <span aria-hidden style={{ width: 26, height: 26, borderRadius: '50%', flex: 'none', background: 'color-mix(in srgb, var(--safelight) 28%, transparent)' }} />
            <span className="grow">{n}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** 개발자 모드: 무료/프리미엄 구분을 이 기기에서만 켜 보고, 프리미엄 이용 중인 것처럼 바꿔 본다 (결제 없음) */
function PremiumTestRows() {
  const [test, setTest] = useState(premiumTestOn)
  const [dev, setDev] = useState(devPremiumOn)
  const rolls = useLiveQuery(() => db.rolls.toArray(), []) ?? []
  return (
    <>
      <button className="row" onClick={() => { setPremiumTest(!test); setTest(!test) }}>
        <span className="grow">무료/프리미엄 구분 시험</span><span className="value">{test ? '켜짐' : '꺼짐'}</span>
      </button>
      {test && <button className="row" onClick={() => { setDevPremium(!dev); setDev(!dev) }}>
        <span className="grow">프리미엄 이용 중 (시험)</span><span className="value">{dev ? '예' : '아니요'}</span>
      </button>}
      {test && <div className="row static"><span className="grow">이번 달 장착</span><span className="value">{loadsThisMonth(rolls)}/{FREE_ROLLS_PER_MONTH}</span></div>}
    </>
  )
}
