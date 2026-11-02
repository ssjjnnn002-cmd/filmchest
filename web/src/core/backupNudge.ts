// 백업 알림: 기록이 있는데 백업한 적이 없거나 오래됐으면 내 장비 위에 한 번 알려 준다.
// 웹은 기록이 이 브라우저에만, 갤럭시는 이 기기에만 있어서 따로 남겨 두지 않으면 잃기 쉽다.
import { getPref, setPref } from '../platform'

const DAY = 86_400_000
/** 이만큼 지나면 '오래됐다'고 본다 */
export const BACKUP_STALE_DAYS = 14
/** '나중에'를 누르면 이만큼 다시 묻지 않는다 */
const SNOOZE_DAYS = 7

// 백업하면 '마지막 백업' 문구와 알림 카드가 바로 바뀌게 알린다
const listeners = new Set<() => void>()
export function onBackupChange(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn) } }
export const notifyBackup = () => listeners.forEach((fn) => fn())

/** 백업 파일로 저장했을 때 부른다 */
export function markFileBackup() { setPref('fileBackupAt', String(Date.now())); notifyBackup() }

/** 기기 밖으로 나간 마지막 백업 (드라이브, 폴더, 파일 저장 중 가장 최근) */
export function lastBackupAt(): number | undefined {
  const t = Math.max(...['driveLast', 'folderLast', 'fileBackupAt'].map((k) => Number(getPref(k, '0')) || 0))
  return t || undefined
}

/** 알릴 때면 'never'(한 번도 안 함) 또는 지난 날 수, 아니면 null */
export function backupNudge(hasData: boolean, now = Date.now()): 'never' | number | null {
  if (!hasData) return null
  if (now - (Number(getPref('backupNudgeAt', '0')) || 0) < SNOOZE_DAYS * DAY) return null
  const last = lastBackupAt()
  if (!last) return 'never'
  const days = Math.floor((now - last) / DAY)
  return days >= BACKUP_STALE_DAYS ? days : null
}

export function snoozeBackupNudge() { setPref('backupNudgeAt', String(Date.now())); notifyBackup() }
