import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, deleteRoll, purgeCamera, purgeOldCameras, purgeOldRolls, restoreCamera, restoreRoll, storageEstimate } from '../db'
import { exportGear, importGear } from '../core/gear'
import { restorePhotos } from '../core/restore'
import { filmById } from '../core/films'
import { Confirm, Sheet, bytesText } from '../ui/common'
import { PrivacyPolicy } from './Privacy'
import { applyTheme, getPref, inClaudeHost, refreshApp, saveFileNow, setPref } from '../platform'

const themes: [string, string][] = [['system', '기기 설정'], ['light', '라이트'], ['dark', '다크']]

export function Settings({ onClose }: { onClose: () => void }) {
  const [theme, setTheme] = useState<string>(getPref('theme', 'system'))
  const [usage, setUsage] = useState<{ used: number; quota: number }>()
  const [confirm, setConfirm] = useState(false)
  const [privacy, setPrivacy] = useState(false)
  const [note, setNote] = useState<string>()
  const deleted = useLiveQuery(async () => (await db.rolls.toArray()).filter((r) => r.deletedAt), []) ?? []
  const deletedCameras = useLiveQuery(async () => (await db.cameras.toArray()).filter((c) => c.deletedAt), []) ?? []
  useEffect(() => { storageEstimate().then(setUsage); void purgeOldRolls(); void purgeOldCameras() }, [])
  // 안드로이드 앱 파일이 올라가 있을 때만 내려받기를 보여 준다
  const [apk, setApk] = useState(false)
  useEffect(() => {
    // 아이폰, 클로드 화면, 이미 설치된 앱 안에서는 숨긴다
    const installed = matchMedia('(display-mode: standalone)').matches || document.referrer.startsWith('android-app://')
    if (inClaudeHost() || installed || /iPhone|iPad|iPod/.test(navigator.userAgent)) return
    fetch('/filmchest.apk', { method: 'HEAD' }).then((r) => setApk(r.ok && !(r.headers.get('content-type') ?? '').includes('html'))).catch(() => {})
  }, [])

  const choose = (t: string) => { setTheme(t); setPref('theme', t); applyTheme(t) }

  return (
    <Sheet title="설정" onClose={onClose} right={<button className="btn ghost" onClick={onClose}><b>완료</b></button>}>
      <div className="section">
        <h2>화면</h2>
        <div className="segmented slide" style={{ '--i': Math.max(0, themes.findIndex(([k]) => k === theme)), '--n': themes.length } as React.CSSProperties}>
          {themes.map(([k, n]) => <button key={k} className={k === theme ? 'on' : ''} onClick={() => choose(k)}>{n}</button>)}
        </div>
      </div>

      <div className="section">
        <h2>저장</h2>
        <div className="group">
          <div className="row static"><span className="grow">이 브라우저에 저장된 양</span><span className="value">{bytesText(usage?.used) ?? '—'}</span></div>
        </div>
        <p className="footnote">
          기록과 사진은 이 기기의 이 브라우저 안에만 저장돼요. 서버로 올라가지 않아서 다른 기기나 다른 사람에게는 보이지 않아요.
          브라우저 데이터를 지우면 함께 지워지니, 중요한 롤은 사진을 내려받아 두세요.
        </p>
        {inClaudeHost() && <p className="footnote">이 화면에서는 위치 확인과 장소 검색을 쓸 수 없어요. 장소는 이름과 좌표를 직접 넣어 주세요.</p>}
      </div>

      {apk && (
        <div className="section">
          <h2>안드로이드 앱</h2>
          <div className="group">
            <a className="row accent" href="/filmchest.apk" download="필름함.apk">
              <span className="grow">안드로이드 앱 내려받기</span>
              <span className="value">APK</span>
            </a>
          </div>
          <p className="footnote">
            내려받은 파일을 열어 설치하세요. 처음엔 '출처를 알 수 없는 앱 설치'를 허용해 달라고 나와요.
            갤럭시에 설치되는 필름함 앱이에요. 카메라와 롤 기록은 그 앱 안에 저장돼요.
          </p>
        </div>
      )}

      <div className="section">
        <h2>삭제한 롤</h2>
        <div className="group">
          {deleted.length === 0 && <div className="row static sub">최근 24시간 안에 지운 롤이 없어요</div>}
          {deleted.map((roll) => (
            <div className="row" key={roll.id}>
              <span className="grow">{filmById(roll.filmId)?.name ?? '필름 알 수 없음'}</span>
              <button className="btn ghost" onClick={() => { void restoreRoll(roll.id) }}>되돌리기</button>
              <button className="btn ghost" style={{ color: '#c0392b' }} onClick={() => { void deleteRoll(roll.id, true) }}>지금 지우기</button>
            </div>
          ))}
        </div>
        <p className="footnote">지운 롤은 24시간 동안 여기 남아요. 사진 앱에 저장한 사진은 그대로예요.</p>
      </div>

      <div className="section">
        <h2>삭제한 장비</h2>
        <div className="group">
          {deletedCameras.length === 0 && <div className="row static sub">최근 24시간 안에 지운 카메라가 없어요</div>}
          {deletedCameras.map((camera) => (
            <div className="row" key={camera.id}>
              <span className="grow">{camera.brand} {camera.model}</span>
              <button className="btn ghost" onClick={() => { void restoreCamera(camera.id) }}>되돌리기</button>
              <button className="btn ghost" style={{ color: '#c0392b' }} onClick={() => { void purgeCamera(camera.id) }}>지금 지우기</button>
            </div>
          ))}
        </div>
        <p className="footnote">지운 카메라는 24시간 동안 여기 남아요. 필름에 적힌 카메라 정보는 카메라를 지워도 그대로예요.</p>
      </div>

      <div className="section">
        <h2>장비 백업</h2>
        <div className="group">
          <button className="row" onClick={async () => {
            const blob = await exportGear()
            saveFileNow('filmchest-gear.json', blob)
          }}>장비 파일로 저장</button>
          <label className="row">장비 파일 불러오기
            <input type="file" accept="application/json,.json" hidden onChange={async (e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (!file) return
              try {
                const counts = await importGear(file)
                setNote(`카메라 ${counts.cameras}대, 렌즈 ${counts.lenses}개를 불러왔어요.`)
              } catch {
                setNote('장비 파일을 읽지 못했어요.')
              }
            }} />
          </label>
        </div>
        <p className="footnote">카메라와 렌즈만 파일로 옮겨요. 이미 있는 장비는 같은 항목으로 합치고, 롤은 지우지 않아요.</p>
      </div>

      <div className="section">
        <h2>사진으로 롤 복구</h2>
        <div className="group">
          <label className="row">이 앱이 저장한 사진 고르기
            <input type="file" accept="image/jpeg,image/jpg" multiple hidden onChange={async (e) => {
              const files = [...(e.target.files ?? [])]
              e.target.value = ''
              if (!files.length) return
              const result = await restorePhotos(files)
              setNote(result.frames === 0 ? '이 앱이 남긴 표식이 없는 사진이에요.' : `롤 ${result.rolls}개, 사진 ${result.frames}장을 가져왔어요.`)
            }} />
          </label>
        </div>
        <p className="footnote">웹에서는 사진 앱 앨범을 직접 열 수 없어요. 이 앱으로 저장했던 사진을 고르면 표식으로 롤을 다시 묶어요.</p>
      </div>

      <div className="section">
        <h2>안내</h2>
        <div className="group">
          <button className="row" onClick={() => setPrivacy(true)}>개인정보 처리방침</button>
        </div>
      </div>

      <div className="section">
        <h2>버전</h2>
        <div className="group">
          <div className="row static">
            <span className="grow">앱 버전</span>
            <span className="value">{__APP_VERSION__}</span>
          </div>
          <button className="row" onClick={() => { void refreshApp() }}>
            <span className="grow">최신 버전 적용</span>
          </button>
        </div>
        <p className="footnote">
          앱 버전은 아이폰, 갤럭시, 웹이 같습니다.
          최신 버전 적용은 화면만 다시 불러오고, 카메라·롤·현상·스캔 기록은 이 브라우저에 그대로 남아요.
        </p>
      </div>

      <div className="group">
        <button className="row" style={{ color: '#c0392b' }} onClick={() => setConfirm(true)}>모든 기록 지우기</button>
      </div>

      <p className="footnote" style={{ textAlign: 'center', marginTop: 24 }}>필름함 · Filmchest · {__APP_VERSION__}</p>
      {privacy && (
        <Sheet title="개인정보 처리방침" onClose={() => setPrivacy(false)}>
          <PrivacyPolicy />
        </Sheet>
      )}

      {note && (
        <Confirm message={note} action="확인" onCancel={() => setNote(undefined)} onConfirm={async () => setNote(undefined)} />
      )}
      {confirm && (
        <Confirm message="카메라, 렌즈, 롤, 저장한 사진을 모두 지울까요? 되돌릴 수 없어요." action="모두 지우기"
          onCancel={() => setConfirm(false)}
          onConfirm={async () => {
            await Promise.all([db.cameras.clear(), db.lenses.clear(), db.rolls.clear(), db.frames.clear(), db.originals.clear(), db.zipQueue.clear()])
            setConfirm(false)
            onClose()
          }} />
      )}
    </Sheet>
  )
}
