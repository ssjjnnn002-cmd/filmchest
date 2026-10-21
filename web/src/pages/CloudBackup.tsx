import { useEffect, useState } from 'react'
import { Sheet } from '../ui/common'
import { setPref } from '../platform'
import { backupFileName } from '../core/backup'
import { backupToDrive, disconnectDrive, driveAvailable, driveConnected, driveIntervalDays, driveLastBackup, driveToken } from '../core/drive'
import {
  allowFolder, backupToFolder, disconnectFolder, folderAvailable, folderCloud, folderDays, folderLast, folderName, folderPermission, pickFolder, verifyFolder,
} from '../core/folderBackup'

const clouds = [
  ['구글 드라이브', 'PC용 Google Drive 앱의 폴더'],
  ['OneDrive', 'OneDrive 앱의 폴더'],
  ['Dropbox', 'Dropbox 앱의 폴더'],
  ['iCloud Drive', 'iCloud for Windows 또는 Mac의 iCloud Drive 폴더'],
  ['다른 폴더', '컴퓨터의 아무 폴더'],
] as const

export function cloudStatus() {
  if (driveConnected()) return '연결됨 · 구글 드라이브'
  if (folderName()) return `연결됨 · ${folderCloud() ?? '폴더'}`
  return '연결 안 됨'
}

/** 클라우드 백업: 어디에 둘지 고르고, 상태와 연결 확인 */
export function CloudBackup({ onClose }: { onClose: () => void }) {
  const [, setRev] = useState(0)
  const [perm, setPerm] = useState<string>('none')
  const [msg, setMsg] = useState<{ text: string; ok: boolean }>()
  const refresh = () => { setRev((n) => n + 1); void folderPermission().then(setPerm) }
  useEffect(refresh, [])
  const folder = folderName()
  const drive = driveConnected()
  const connected = !!folder || drive
  const last = Math.max(folderLast() ?? 0, driveLastBackup() ?? 0)
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try { await fn(); setMsg({ text: ok, ok: true }) } catch (e) { setMsg({ text: (e as Error).message || '하지 못했어요', ok: false }) }
    refresh()
  }
  return (
    <Sheet title="클라우드 백업" onClose={onClose} right={<button className="btn ghost" onClick={onClose}><b>완료</b></button>}>
      <div className="section">
        <h2>상태</h2>
        <div className="group">
          <div className="row static">
            <span style={{ fontSize: 24, color: connected ? 'var(--safelight)' : 'var(--muted)' }}>{connected ? '☁︎' : '⊘'}</span>
            <span className="grow">
              <b>{cloudStatus()}</b>
              {folder && <span className="sub">폴더: {folder}{perm === 'granted' ? '' : ' · 권한 필요'}</span>}
              {last > 0 && <span className="sub">마지막 백업 {new Date(last).toLocaleString('ko-KR')}</span>}
            </span>
          </div>
          {msg && <div className="row static" style={{ color: msg.ok ? '#30a46c' : 'var(--danger)' }}>{msg.ok ? '✓' : '✕'} {msg.text}</div>}
          {folder && perm !== 'granted' && (
            <button className="row accent" onClick={() => run(async () => { if (await allowFolder() !== 'granted') throw new Error('권한을 허용하지 않았어요') }, '권한을 허용했어요.')}>권한 허용</button>
          )}
          {folder && (
            <>
              <button className="row" onClick={() => run(async () => { const f = await verifyFolder(); if (f) throw new Error(f) }, `${folderCloud() ?? '폴더'}에 저장하고 다시 읽었어요. 연결돼 있어요.`)}>연결 확인</button>
              <button className="row" onClick={() => run(backupToFolder, `'${backupFileName}'을 저장했어요.`)}>지금 백업</button>
              <label className="row static">
                <span className="grow">자동 백업</span>
                <select className="input" style={{ width: 'auto', textAlign: 'right' }} value={String(folderDays())}
                  onChange={(e) => { setPref('folderDays', e.target.value); refresh() }}>
                  <option value="0">끔</option><option value="1">매일</option><option value="7">매주</option>
                </select>
              </label>
              <button className="row danger" onClick={() => run(disconnectFolder, '연결을 끊었어요. 올린 파일은 그대로예요.')}>연결 끊기</button>
            </>
          )}
          {drive && (
            <>
              <button className="row" onClick={() => run(backupToDrive, '구글 드라이브에 저장했어요. 연결돼 있어요.')}>연결 확인 · 지금 백업</button>
              <label className="row static">
                <span className="grow">자동 백업</span>
                <select className="input" style={{ width: 'auto', textAlign: 'right' }} value={String(driveIntervalDays())}
                  onChange={(e) => { setPref('driveDays', e.target.value); refresh() }}>
                  <option value="0">끔</option><option value="1">매일</option><option value="7">매주</option>
                </select>
              </label>
              <button className="row danger" onClick={() => { disconnectDrive(); refresh() }}>연결 끊기</button>
            </>
          )}
        </div>
        <p className="footnote">웹앱을 닫거나 다른 탭으로 갈 때 정한 주기가 지났으면 '{backupFileName}' 하나를 덮어써요. 스캔 사진은 빠져요.</p>
      </div>

      {driveAvailable && !drive && (
        <div className="section">
          <h2>바로 연결</h2>
          <div className="group">
            <button className="row accent" onClick={() => run(async () => { await driveToken('consent'); await backupToDrive() }, '구글 드라이브에 연결하고 첫 백업을 올렸어요.')}>구글 드라이브 계정 연결</button>
          </div>
          <p className="footnote">구글 로그인 창에서 허용을 누르면 돼요. 이 앱이 만든 파일만 볼 수 있어요.</p>
        </div>
      )}

      {folderAvailable ? (
        <div className="section">
          <h2>{connected ? '다른 클라우드로 바꾸기' : '연결할 클라우드'}</h2>
          <div className="group">
            {clouds.map(([name, help]) => (
              <button key={name} className="row" onClick={() => run(async () => {
                await pickFolder(name)
                if (await allowFolder() !== 'granted') throw new Error('권한을 허용하지 않았어요')
                const f = await verifyFolder()
                if (f) throw new Error(f)
                await backupToFolder()
              }, `${name}에 연결하고 첫 백업을 저장했어요.`)}>
                <span className="grow"><span>{name}</span><span className="sub">{help}</span></span>
                {folderCloud() === name && folder && <span style={{ color: 'var(--safelight)' }}>✓</span>}
              </button>
            ))}
          </div>
          <p className="footnote">누르면 폴더 고르는 창이 열려요. 컴퓨터에 깔린 클라우드 앱의 폴더를 고르면 그 클라우드로 올라가요. 브라우저가 묻는 '수정 허용'을 눌러 주세요.</p>
        </div>
      ) : !driveAvailable && (
        <div className="section">
          <h2>이 브라우저에서는</h2>
          <p className="footnote">휴대폰 브라우저는 폴더에 자동으로 저장할 수 없어요. 설정의 '백업 파일로 저장'으로 파일을 받아 클라우드 앱에 올리거나, 아이폰·갤럭시 앱의 클라우드 백업을 써 주세요. 컴퓨터의 크롬·엣지에서는 클라우드 폴더를 연결할 수 있어요.</p>
        </div>
      )}
    </Sheet>
  )
}
