import { useEffect, useRef, useState } from 'react'
import { Keyboard, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { WebView } from 'react-native-webview'
import { Sheet, useToast } from './chrome'
import { listRolls, patchRoll, getRoll, type Roll } from './db'
import { useTheme } from './theme'

function recentLabs() {
  const counts = new Map<string, number>()
  for (const roll of listRolls()) {
    const name = roll.lab?.trim()
    if (name) counts.set(name, (counts.get(name) ?? 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name)
}

function dateText(ms: number) {
  const d = new Date(ms)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function dateValue(text: string, fallback: number) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text.trim())
  if (!match) return fallback
  const time = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12).getTime()
  return Number.isFinite(time) ? time : fallback
}

/** 현상 맡기기. 촬영 중 롤에서 저장하지 않고 닫으면 촬영 완료로 남긴다. */
export function LabDropOff({ roll, onClose }: { roll: Roll; onClose: () => void }) {
  const c = useTheme()
  const toast = useToast()
  const [lab, setLab] = useState(roll.lab ?? '')
  const [date, setDate] = useState(dateText(roll.droppedAt ?? Date.now()))
  const [labFocus, setLabFocus] = useState(false)
  const [nearby, setNearby] = useState(false)
  const labRef = useRef<TextInput>(null)
  const focusedAt = useRef(0)
  const recovering = useRef(false)
  const labs = recentLabs()
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => { focusedAt.current = Date.now() })
    return () => show.remove()
  }, [])

  const close = () => {
    const current = getRoll(roll.id)
    if (current?.status === 'loaded') {
      patchRoll(roll.id, { status: 'finished', finishedAt: current.finishedAt ?? Date.now() })
    }
    onClose()
  }

  const save = () => {
    const droppedAt = dateValue(date, roll.droppedAt ?? Date.now())
    patchRoll(roll.id, {
      lab: lab.trim(),
      droppedAt,
      status: roll.status === 'loaded' || roll.status === 'finished' ? 'atLab' : roll.status,
      finishedAt: roll.finishedAt ?? droppedAt,
    })
    toast('현상소에 맡겼어요')
    onClose()
  }

  return (
    <Sheet title="현상 맡기기" onClose={close} right="저장" onRight={save}>
      <View style={{ gap: 8 }}>
        <Text style={{ color: c.muted, fontSize: 13, fontWeight: '600', paddingHorizontal: 16 }}>현상소</Text>
        <View style={{ backgroundColor: c.cell, borderRadius: 22, overflow: 'hidden' }}>
          <View style={{ minHeight: 52, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Text style={{ color: c.ink, fontSize: 17 }}>현상소</Text>
            <TextInput
              ref={labRef}
              value={lab}
              onChangeText={setLab}
              placeholder="현상소 이름"
              placeholderTextColor={c.faint}
              onFocus={() => { setLabFocus(true); focusedAt.current = Date.now() }}
              onBlur={() => {
                setLabFocus(false)
                if (recovering.current || Date.now() - focusedAt.current > 400) return
                recovering.current = true
                requestAnimationFrame(() => labRef.current?.focus())
                setTimeout(() => { recovering.current = false }, 500)
              }}
              style={{ flex: 1, color: c.ink, fontSize: 17, textAlign: labFocus ? 'left' : 'right', paddingVertical: 12 }}
            />
          </View>
          {labs.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ gap: 6, paddingHorizontal: 18, paddingBottom: 12 }}>
              {labs.map((name) => {
                const on = name === lab
                return (
                  <Pressable key={name} onPress={() => setLab(name)} style={{
                    height: 32, paddingHorizontal: 12, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
                    backgroundColor: on ? c.safelight : c.fill,
                  }}>
                    <Text style={{ color: on ? '#fff' : c.ink, fontSize: 14, fontWeight: '600' }}>{name}</Text>
                  </Pressable>
                )
              })}
            </ScrollView>
          ) : null}
          <Pressable onPress={() => setNearby(true)} style={{ minHeight: 48, paddingHorizontal: 18, justifyContent: 'center', borderTopWidth: 0.5, borderTopColor: c.fill }}>
            <Text style={{ color: c.safelight, fontSize: 17, fontWeight: '600' }}>가까운 현상소 찾기</Text>
          </Pressable>
        </View>
      </View>
      {/* 가까운 현상소: 웹앱과 같은 화면(labs.html)을 띄우고, 고른 이름을 받는다 */}
      <Modal visible={nearby} animationType="slide" onRequestClose={() => setNearby(false)} statusBarTranslucent>
        <WebView
          source={{ uri: 'https://filmchest.vercel.app/labs.html' }}
          geolocationEnabled
          onMessage={(e) => {
            try {
              const msg = JSON.parse(e.nativeEvent.data) as { type: string; name?: string }
              if (msg.type === 'pick' && msg.name) setLab(msg.name)
              setNearby(false)
            } catch { /* 모르는 메시지 */ }
          }}
          style={{ flex: 1, backgroundColor: c.paper }}
        />
      </Modal>
      <View style={{ backgroundColor: c.cell, borderRadius: 22, overflow: 'hidden' }}>
        <View style={{ minHeight: 52, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Text style={{ color: c.ink, fontSize: 17 }}>맡긴 날</Text>
          <TextInput
            value={date}
            onChangeText={setDate}
            placeholder="2026-10-15"
            placeholderTextColor={c.faint}
            autoCapitalize="none"
            style={{ flex: 1, color: c.ink, fontSize: 17, textAlign: 'right', paddingVertical: 12 }}
          />
        </View>
      </View>
    </Sheet>
  )
}
