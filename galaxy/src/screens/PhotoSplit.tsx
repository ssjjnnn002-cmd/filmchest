// 웹 pages/PhotoSplit.tsx — 사진을 여러 장 공유받았을 때: 몇 롤인지 고르고 롤마다 나눈 뒤, 롤 하나씩 기존 롤 가져오기로
import { useState } from 'react'
import { Image, Pressable, Text, View, useWindowDimensions } from 'react-native'
import { Btn, Chip, Chips, Footnote, Group, Section } from '../kit'
import { Sheet, SheetBtn } from '../overlay'
import type { PickedFile } from '../pick'
import { useTheme } from '../theme'
import { ArchiveImport } from './ArchiveImport'

const colors = ['#DE542E', '#0A7AFF', '#34A853', '#8E5CD9', '#F08A00', '#14A3A3', '#E5488A', '#8D6E4C', '#5856D6', '#2FB38A']

export function PhotoImportFlow({ photos, onClose }: { photos: PickedFile[]; onClose: () => void }) {
  const [sets, setSets] = useState<PickedFile[][] | null>(null)
  const [step, setStep] = useState(0)
  if (sets && sets[step]) {
    return <ArchiveImport key={step} presetFiles={sets[step]} stepLabel={sets.length > 1 ? `${step + 1} / ${sets.length}` : undefined}
      onClose={onClose} onSaved={() => { if (step + 1 < sets.length) setStep(step + 1); else onClose() }} />
  }
  return <PhotoSplit photos={photos} onCancel={onClose} onDone={(s) => { setSets(s); setStep(0) }} />
}

function PhotoSplit({ photos, onCancel, onDone }: { photos: PickedFile[]; onCancel: () => void; onDone: (sets: PickedFile[][]) => void }) {
  const c = useTheme()
  const { width } = useWindowDimensions()
  const [count, setCount] = useState(1)
  const [assign, setAssign] = useState<number[]>(() => photos.map(() => 0))
  const [active, setActive] = useState(0)
  const sets = Array.from({ length: count }, (_, r) => photos.filter((_, i) => assign[i] === r))
  const spread = (n: number) => {
    const per = photos.length / Math.max(n, 1)
    setAssign(photos.map((_, i) => Math.min(n - 1, Math.floor(i / per))))
    setActive((a) => Math.min(a, n - 1))
    setCount(n)
  }
  const cols = Math.max(3, Math.floor((width - 32 + 6) / (92 + 6)))
  const cell = (width - 32 - 6 * (cols - 1)) / cols
  return (
    <Sheet title={`사진 ${photos.length}장`} onClose={onCancel}
      right={<SheetBtn label="다음" accent disabled={sets.every((s) => !s.length)} onPress={() => onDone(sets.filter((s) => s.length))} />}>
      <Section>
        <Group>
          <View style={{ minHeight: 52, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 17, color: c.ink }}>롤 수 · {count}롤</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Btn label="−" size="small" disabled={count <= 1} onPress={() => spread(count - 1)} />
              <Btn label="+" size="small" disabled={count >= Math.min(photos.length, 20)} onPress={() => spread(count + 1)} />
            </View>
          </View>
        </Group>
        {count > 1 ? (
          <>
            <Chips>
              {sets.map((s, r) => <Chip key={r} label={`${r + 1}롤 · ${s.length}장`} active={active === r} onPress={() => setActive(r)} />)}
            </Chips>
            <Footnote>롤을 고른 뒤 사진을 누르면 그 롤로 옮겨요. 길게 누르면 그 사진부터 끝까지 옮겨요.</Footnote>
          </>
        ) : null}
      </Section>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {photos.map((p, i) => (
          <Pressable key={i} onPress={() => { if (count > 1) setAssign((a) => { const n = a.slice(); n[i] = active; return n }) }}
            onLongPress={() => { if (count > 1) setAssign((a) => a.map((v, k) => (k >= i ? active : v))) }}
            style={{ width: cell, height: 92, borderRadius: 8, overflow: 'hidden', borderWidth: count > 1 ? 2 : 0, borderColor: colors[assign[i] % colors.length], backgroundColor: c.fill }}>
            <Image source={{ uri: p.uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            {count > 1 ? (
              <View style={{ position: 'absolute', top: 5, left: 5, width: 22, height: 22, borderRadius: 11, backgroundColor: colors[assign[i] % colors.length], alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{assign[i] + 1}</Text>
              </View>
            ) : null}
          </Pressable>
        ))}
      </View>
    </Sheet>
  )
}
