import { useEffect, useReducer, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { backupNudge, notifyBackup, onBackupChange, snoozeBackupNudge } from '../core/backupNudge'
import { backupToDrive, driveConnected, driveToken, hasDriveToken, pullFromDrive } from '../core/drive'
import { inClaudeHost } from '../platform'
import { Icon } from './common'

/** 기록이 이 브라우저에만 있을 때: 백업한 적이 없거나 오래됐으면 한 번 알려 준다 */
export function BackupNudge({ onBackup }: { onBackup: () => void }) {
  useBackupRefresh()
  const rolls = useLiveQuery(() => db.rolls.count(), []) ?? 0
  const [hidden, setHidden] = useState(false)
  const [busy, setBusy] = useState(false)
  // 드라이브에 연결해 두었는데 웹의 구글 허가(1시간)가 끝났으면: 한 번 눌러 다시 자동으로 맞춘다
  if (!inClaudeHost() && driveConnected() && !hasDriveToken()) {
    return (
      <div className="group nudge">
        <div className="row static">
          <Icon name="download" size={20} />
          <span className="grow">
            <b>드라이브와 다시 맞추기</b>
            <span className="sub">다른 기기에서 고친 기록을 받고, 여기서 고친 것을 올려요.</span>
          </span>
        </div>
        <div className="nudge-actions">
          <button className="btn ghost" disabled={busy} onClick={async () => {
            setBusy(true)
            try { await driveToken(); await pullFromDrive(); await backupToDrive() } catch { /* 창을 닫음 */ } finally { setBusy(false); notifyBackup() }
          }}><b>{busy ? '맞추는 중…' : '다시 연결'}</b></button>
        </div>
      </div>
    )
  }
  const state = hidden || inClaudeHost() ? null : backupNudge(rolls > 0)
  if (state === null) return null
  return (
    <div className="group nudge">
      <div className="row static">
        <Icon name="download" size={20} />
        <span className="grow">
          <b>{state === 'never' ? '아직 백업하지 않았어요' : `백업한 지 ${state}일 지났어요`}</b>
          <span className="sub">기록은 이 브라우저에만 있어요. 브라우저 데이터를 지우면 함께 지워져요.</span>
        </span>
      </div>
      <div className="nudge-actions">
        <button className="btn ghost" onClick={() => { snoozeBackupNudge(); setHidden(true) }}>나중에</button>
        <button className="btn ghost" onClick={onBackup}><b>백업하기</b></button>
      </div>
    </div>
  )
}

/** 백업하면 다시 그린다 ('마지막 백업' 문구·알림 카드) */
export function useBackupRefresh() {
  const [, bump] = useReducer((n: number) => n + 1, 0)
  useEffect(() => onBackupChange(bump), [])
}
