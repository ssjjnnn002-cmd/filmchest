// 웹 ImportFlow ScanStrip: 가져올 사진 전체를 번호와 함께 훑어본다. 누르면 크게.
import { useMemo, useState } from 'react'
import { FlatList, Image, Modal, Pressable, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { bytesToB64 } from '../files'
import { Btn } from '../kit'
import { useTheme } from '../theme'

type ScanFile = { name: string; data: Uint8Array; type: string }
const viewable = (t: string) => /^(jpe?g|png|webp|heic|heif)$/.test(t)

export function ScanStrip({ files }: { files: ScanFile[] }) {
  const c = useTheme()
  const insets = useSafeAreaInsets()
  const [open, setOpen] = useState<number | null>(null)
  const uri = (i: number) => (viewable(files[i].type) ? `data:image/${files[i].type === 'png' ? 'png' : 'jpeg'};base64,${bytesToB64(files[i].data)}` : '')
  const cache = useMemo(() => new Map<number, string>(), [files])
  const get = (i: number) => { if (!cache.has(i)) cache.set(i, uri(i)); return cache.get(i)! }
  return (
    <>
      <FlatList horizontal data={files} keyExtractor={(_, i) => String(i)} initialNumToRender={6} windowSize={5} showsHorizontalScrollIndicator={false}
        style={{ backgroundColor: c.filmBase, borderRadius: 14 }} contentContainerStyle={{ padding: 6, gap: 6 }}
        renderItem={({ item, index }) => (
          <Pressable onPress={() => setOpen(index)} style={{ alignItems: 'center', gap: 3 }}>
            {viewable(item.type)
              ? <Image source={{ uri: get(index) }} style={{ width: 96, height: 66, borderRadius: 6 }} resizeMode="cover" />
              : <View style={{ width: 96, height: 66, borderRadius: 6, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: c.edgeInk, fontSize: 11 }}>{item.type.toUpperCase()}</Text></View>}
            <Text style={{ color: c.edgeInk, fontSize: 11 }}>{index + 1}</Text>
          </Pressable>
        )} />
      {open !== null ? (
        <Modal visible animationType="fade" onRequestClose={() => setOpen(null)} statusBarTranslucent>
          <View style={{ flex: 1, backgroundColor: '#000', paddingTop: insets.top + 10, paddingBottom: insets.bottom + 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 }}>
              <Btn label="닫기" kind="ghost" onPress={() => setOpen(null)} />
              <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>{open + 1} / {files.length}</Text>
              <View style={{ width: 60 }} />
            </View>
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              {viewable(files[open].type)
                ? <Image source={{ uri: get(open) }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
                : <Text style={{ color: '#fff' }}>미리 볼 수 없는 형식이에요</Text>}
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 24 }}>
              <Btn label="이전" kind="ghost" disabled={open === 0} onPress={() => setOpen(open - 1)} />
              <Btn label="다음" kind="ghost" disabled={open === files.length - 1} onPress={() => setOpen(open + 1)} />
            </View>
          </View>
        </Modal>
      ) : null}
    </>
  )
}
