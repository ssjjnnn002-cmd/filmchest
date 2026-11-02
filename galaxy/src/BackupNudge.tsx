import { useEffect, useReducer, useState } from 'react'
import { Text, View } from 'react-native'
import { db } from './data'
import { useLiveQuery } from './store'
import { backupNudge, onBackupChange, snoozeBackupNudge } from './core/backupNudge'
import { Btn, Group } from './kit'
import { Icon } from './icons'
import { useTheme } from './theme'

/** 기록이 이 기기에만 있을 때: 기기 밖으로 백업한 적이 없거나 오래됐으면 한 번 알려 준다 (웹과 같게) */
export function BackupNudge({ onBackup }: { onBackup: () => void }) {
  useBackupRefresh()
  const c = useTheme()
  const rolls = useLiveQuery(() => db.rolls.count(), []) ?? 0
  const [hidden, setHidden] = useState(false)
  const state = hidden ? null : backupNudge(rolls > 0)
  if (state === null) return null
  return (
    <Group style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', gap: 12, padding: 14, paddingBottom: 6 }}>
        <Icon name="download" size={20} color={c.safelight} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: c.ink }}>{state === 'never' ? '아직 백업하지 않았어요' : `백업한 지 ${state}일 지났어요`}</Text>
          <Text style={{ fontSize: 13, color: c.muted, marginTop: 2 }}>기록은 이 기기에만 있어요. 앱을 지우거나 휴대폰을 바꾸면 함께 사라져요.</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 4, padding: 8, paddingTop: 0 }}>
        <Btn label="나중에" kind="ghost" size="small" onPress={() => { snoozeBackupNudge(); setHidden(true) }} />
        <Btn label="백업하기" kind="ghost" size="small" onPress={onBackup} />
      </View>
    </Group>
  )
}

/** 백업하면 다시 그린다 ('마지막 백업' 문구·알림 카드) */
export function useBackupRefresh() {
  const [, bump] = useReducer((n: number) => n + 1, 0)
  useEffect(() => onBackupChange(bump), [])
}
