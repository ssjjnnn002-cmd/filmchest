// 웹 pages/FramePrint.tsx — 스캔 한 장을 프레임으로 저장한다 (그림은 웹 framePrint.ts)
import { useEffect, useState } from 'react'
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { db } from '../data'
import { getPref, setPref, useLiveQuery } from '../store'
import { useNav } from '../App'
import type { Frame, Roll } from '../core/types'
import { lensIdAt } from '../core/types'
import { meterShotAt } from '../core/meter'
import { exposureLine } from '../core/frameCaption'
import { frameAspects } from '../core/framePrint'
import { cameraName, fmtDay, rollFilm, rollFilmName, rollTitle, sortedDays } from '../core/display'
import { Btn, Chip, Chips, Segmented } from '../kit'
import { Sheet, SheetBtn } from '../overlay'
import { b64ToBytes, bytesToB64, readBytes, writeBytes } from '../files'
import { saveFileNow } from '../platform'
import { saveImagesToGallery } from '../gallery'
import { webTool } from '../webTools'
import { rotatedFile } from '../scan'
import { useTheme } from '../theme'

type Show = { camera: boolean; lens: boolean; film: boolean; filter: boolean; date: boolean; photographer: boolean; exposure: boolean }

export function FramePrint({ roll, frames, onClose }: { roll: Roll; frames: Frame[]; onClose: () => void }) {
  const c = useTheme()
  const nav = useNav()
  const insets = useSafeAreaInsets()
  const camera = useLiveQuery(() => (roll.cameraId ? db.cameras.get(roll.cameraId) : undefined), [roll.cameraId])
  const lenses = useLiveQuery(() => db.lenses.toArray(), []) ?? []
  const [index, setIndex] = useState(0)
  const [dark, setDark] = useState(false)
  const [aspect, setAspect] = useState('square')
  const [show, setShow] = useState<Show>({ camera: true, lens: true, film: true, filter: true, date: true, photographer: true, exposure: true })
  const [photographer, setPhotographer] = useState<string>(getPref('photographer', ''))
  const [uri, setUri] = useState<string>()
  const [exporting, setExporting] = useState(false)
  const frame = frames[index]
  const original = useLiveQuery(() => (frame ? db.originals.get(frame.id) : undefined), [frame?.id])
  const live = useLiveQuery(() => (frame ? db.frames.get(frame.id) : undefined), [frame?.id])
  const turns = live?.rotation ?? frame?.rotation ?? 0

  const dateFor = (n: number) => {
    const days = sortedDays(roll)
    const day = [...days].reverse().find((d) => (d.startFrame ?? 1) <= n) ?? days[0]
    return day?.startedAt ?? roll.loadedAt
  }

  useEffect(() => {
    if (!frame) return
    let cancelled = false
    const t = setTimeout(async () => {
      const src = original && !/\.tiff?$/i.test(frame.name ?? '') ? original.blob : frame.thumb
      if (!src) return
      const n = frame.index
      const lens = lenses.find((l) => l.id === lensIdAt(roll, n))
      const shot = meterShotAt(roll.meterShots, n, roll.meterOffset ?? 0)
      const film = rollFilm(roll)
      const filter = shot?.filters?.filter(Boolean).join(', ')
      try {
        const data = bytesToB64(await readBytes(await rotatedFile(src, turns, frame.id)))
        const out = await webTool<string>('framePrint', {
          data, type: 'image/jpeg', ratio: frameAspects.find((a) => a.id === aspect)?.ratio ?? 1,
          caption: {
            dark,
            camera: show.camera ? cameraName(camera, roll).trim() || undefined : undefined,
            lens: show.lens ? (lens ? `${lens.brand} ${lens.model}`.trim() : camera?.fixedLens ?? roll.cameraFixedLens) : undefined,
            film: show.film ? (film?.name ?? rollFilmName(roll)) : undefined,
            filter: show.filter && filter ? filter : undefined,
            date: show.date ? fmtDay(frame.takenAt ?? dateFor(n)) : undefined,
            photographer: show.photographer ? photographer.trim() || undefined : undefined,
            exposure: show.exposure ? exposureLine(shot ? { aperture: shot.aperture ?? null, shutter: shot.shutter ?? null } : undefined, roll.shotISO ?? film?.iso) : undefined,
          },
        })
        if (!cancelled) setUri(writeBytes('frame-prints', `${roll.id}-${Date.now()}.jpg`, b64ToBytes(out)))
      } catch { /* 그리지 못함 */ }
    }, 150)
    return () => { cancelled = true; clearTimeout(t) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame?.id, original?.blob, turns, dark, aspect, show, photographer, camera, lenses.length])

  const fileName = () => `${rollTitle(roll, camera)} 프레임.jpg`.replace(/[/\\:]/g, '-')
  const meta: [keyof Show, string][] = [['camera', '카메라'], ['lens', '렌즈'], ['film', '필름'], ['filter', '필터'], ['date', '날짜'], ['photographer', '찍은 사람'], ['exposure', '노출']]

  return (
    <Modal visible animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: c.paper, paddingTop: insets.top + 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 6 }}>
          <Btn label="닫기" kind="ghost" onPress={onClose} />
          <Text style={{ fontSize: 17, fontWeight: '600', color: c.ink }}>프레임 만들기</Text>
          <View style={{ width: 52 }} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 6, gap: 8 }}>
          {frames.map((f, i) => (
            <Pressable key={f.id} onPress={() => setIndex(i)} accessibilityLabel={`${f.index}번 컷`}
              style={{ width: 54, height: 54, borderRadius: 8, overflow: 'hidden', borderWidth: 2, borderColor: i === index ? c.safelight : 'transparent', backgroundColor: c.fill }}>
              {f.thumb ? <Image source={{ uri: f.thumb }} style={{ width: '100%', height: '100%', transform: f.rotation ? [{ rotate: `${f.rotation * 90}deg` }] : undefined }} resizeMode="cover" /> : null}
            </Pressable>
          ))}
        </ScrollView>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 12, backgroundColor: dark ? '#111' : c.paper }}>
          {uri ? <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="contain" /> : <ActivityIndicator color={c.muted} />}
        </View>
        <View style={{ gap: 10, paddingHorizontal: 16, paddingTop: 10, paddingBottom: insets.bottom + 12 }}>
          <Segmented value={dark ? 'dark' : 'light'} options={[['light', '흰색'], ['dark', '검정']]} onChange={(v) => setDark(v === 'dark')} />
          <Chips>{frameAspects.map((a) => <Chip key={a.id} label={a.title} flat active={aspect === a.id} onPress={() => setAspect(a.id)} />)}</Chips>
          <Chips>{meta.map(([k, label]) => <Chip key={k} label={label} flat active={show[k]} onPress={() => setShow((s) => ({ ...s, [k]: !s[k] }))} />)}</Chips>
          {show.photographer ? (
            <TextInput value={photographer} placeholder="찍은 사람" placeholderTextColor={c.faint}
              onChangeText={(t) => { setPhotographer(t); setPref('photographer', t) }}
              style={{ backgroundColor: c.cell, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, fontSize: 17, color: c.ink }} />
          ) : null}
          <Btn label="저장" kind="primary" size="large" block disabled={!uri} onPress={() => setExporting(true)} />
        </View>
        {exporting ? (
          <Sheet title="프레임 만들기" onClose={() => setExporting(false)} right={<SheetBtn label="완료" accent onPress={() => setExporting(false)} />}>
            <View style={{ gap: 10, marginTop: 8 }}>
              <Btn label="갤러리에 저장" icon="download" kind="primary" block disabled={!uri} onPress={async () => {
                if (!uri) return
                const r = await saveImagesToGallery([{ uri, name: fileName() }])
                nav.toast(r.saved ? '갤러리에 저장했어요' : r.denied ? '사진 저장을 허용해 주세요' : '갤러리에 저장하지 못했어요')
              }} />
              <Btn label="파일로 저장" block disabled={!uri} onPress={async () => { if (uri) await saveFileNow(fileName(), await readBytes(uri), 'image/jpeg') }} />
            </View>
          </Sheet>
        ) : null}
      </View>
    </Modal>
  )
}
