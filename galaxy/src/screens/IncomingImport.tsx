// 웹 pages/IncomingImport.tsx — 파일 앱 '다음으로 열기'·zip 열기로 받은 파일: 어디로 넣을지 고른 뒤 이어서 진행한다.
import { useEffect, useState } from 'react'
import { Image, ScrollView, Text, View } from 'react-native'
import { db, kept } from '../data'
import { useLiveQuery } from '../store'
import { useNav } from '../App'
import type { Roll } from '../core/types'
import { lensIdAt } from '../core/types'
import { previewZip } from '../core/zip'
import { rollFilmName } from '../core/display'
import { Field, Footnote, Group, Progress, Row, Section, Select, Spinner, Sub } from '../kit'
import { Sheet, SheetBtn } from '../overlay'
import { readBytes } from '../files'
import type { PickedFile } from '../pick'
import { importScans, readFiles } from '../scan'
import { useTheme } from '../theme'
import { ImportFlow } from './ImportFlow'
import { ArchiveImport } from './ArchiveImport'

export function IncomingImport({ files, onClose }: { files: PickedFile[]; onClose: () => void }) {
  const c = useTheme()
  const nav = useNav()
  const rolls = useLiveQuery(async () => (await db.rolls.where('status').anyOf(['finished', 'atLab']).toArray()).filter(kept), []) ?? []
  const [step, setStep] = useState<'choose' | 'pending' | 'archive' | 'multi'>('choose')
  const samples = useZipSamples(files)
  const many = files.length > 1

  if (step === 'pending') return <ImportFlow files={files} onClose={onClose} />
  if (step === 'archive') return <ArchiveImport presetFile={files[0]} onClose={onClose} />
  if (step === 'multi') return <MultiRollImport files={files} samples={samples} onClose={onClose} />

  const choice = (title: string, sub: string, onPress: () => void) => (
    <Row onPress={onPress}>
      <View style={{ flex: 1 }}><Text style={{ fontSize: 17, fontWeight: '700', color: c.ink }}>{title}</Text><Sub>{sub}</Sub></View>
    </Row>
  )
  return (
    <Sheet title="스캔 가져오기" onClose={onClose}>
      <Section title={many ? `가져올 파일 · ${files.length}개` : '가져올 파일'}>
        <Group>{files.map((f, i) => <ZipPreviewRow key={i} name={f.name} thumbs={samples[i]} />)}</Group>
      </Section>
      <Group>
        {choice('스캔 대기 중인 롤에 넣기',
          rolls.length === 0 ? '현상 맡긴 롤이 없으면 새 롤로 만들 수 있어요' : many ? '파일마다 롤을 골라 한 번에 가져와요' : '현상 맡긴 롤 중에서 골라요',
          () => setStep(many ? 'multi' : 'pending'))}
        {choice('기존 롤로 가져오기', many ? '대기열에 넣고 차례로 입력해요' : '예전에 찍은 롤을 롤 보관함에 넣어요',
          () => { if (many) { nav.enqueueZipRolls(files); onClose() } else setStep('archive') })}
      </Group>
    </Sheet>
  )
}

/** zip마다 안에 든 사진 몇 장 (아직 읽는 중이면 undefined) */
function useZipSamples(files: PickedFile[]) {
  const [samples, setSamples] = useState<(string[] | undefined)[]>([])
  useEffect(() => {
    let cancel = false
    void (async () => {
      for (let i = 0; i < files.length; i++) {
        const thumbs = await readBytes(files[i].uri).then((d) => previewZip(d, 6)).then((p) => p.thumbs).catch(() => [] as string[])
        if (cancel) return
        setSamples((s) => { const n = s.slice(); n[i] = thumbs; return n })
      }
    })()
    return () => { cancel = true }
  }, [files])
  return samples
}

function ZipPreviewRow({ name, thumbs }: { name: string; thumbs?: string[] }) {
  const c = useTheme()
  return (
    <View style={{ paddingVertical: 12, paddingHorizontal: 18, gap: 8 }}>
      <Text numberOfLines={1} style={{ fontSize: 17, color: c.ink }}>{name}</Text>
      {!thumbs ? <Spinner />
        : thumbs.length === 0 ? <Sub>미리 볼 사진이 없어요</Sub>
          : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ backgroundColor: c.filmBase, borderRadius: 10 }} contentContainerStyle={{ padding: 6, gap: 4 }}>
              {thumbs.map((u, i) => <Image key={i} source={{ uri: u }} style={{ width: 66, height: 46 }} resizeMode="cover" />)}
            </ScrollView>
          )}
    </View>
  )
}

/** 여러 zip을 스캔 대기 중인 롤과 한 번에 짝지어 가져온다 (대기열 없이) */
function MultiRollImport({ files, samples, onClose }: { files: PickedFile[]; samples: (string[] | undefined)[]; onClose: () => void }) {
  const c = useTheme()
  const nav = useNav()
  const all = useLiveQuery(async () => (await db.rolls.where('status').anyOf(['finished', 'atLab']).reverse().sortBy('loadedAt')).filter(kept), [])
  const rolls: Roll[] = all ? [...all.filter((r) => r.status === 'atLab'), ...all.filter((r) => r.status === 'finished')] : []
  const [pick, setPick] = useState<string[]>([])
  const [busy, setBusy] = useState<{ roll: number; done: number; total: number } | null>(null)
  const [saved, setSaved] = useState<number | null>(null)
  const [error, setError] = useState<string>()

  // 처음엔 현상 맡긴 롤부터 차례로 짝지어 둔다. 바꿀 수 있다.
  useEffect(() => {
    if (!all || pick.length) return
    setPick(files.map((_, i) => rolls[i]?.id ?? ''))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all])

  const chosen = files.map((f, i) => ({ file: f, roll: rolls.find((r) => r.id === pick[i]) })).filter((x): x is { file: PickedFile; roll: Roll } => !!x.roll)

  const saveAll = async () => {
    setError(undefined)
    const lensMap = new Map((await db.lenses.toArray()).map((l) => [l.id, l]))
    let count = 0
    for (const [i, { file, roll }] of chosen.entries()) {
      setBusy({ roll: i + 1, done: 0, total: 0 })
      try {
        const scan = await readFiles([file])
        const camera = roll.cameraId ? await db.cameras.get(roll.cameraId) : undefined
        await importScans(scan.primary, roll, camera, (n) => { const id = lensIdAt(roll, n); return id ? lensMap.get(id) : undefined },
          (p) => setBusy({ roll: i + 1, done: p.done, total: p.total }))
        count += 1
      } catch (e) {
        setError(`${file.name}: ${(e as Error).message}`)
        break
      }
    }
    setBusy(null)
    setSaved(count)
    nav.toast(`${count}롤을 가져왔어요`)
  }

  return (
    <Sheet title="여러 롤 가져오기" onClose={busy ? () => {} : onClose} left={busy ? <View /> : undefined}
      right={saved === null
        ? <SheetBtn label="가져오기" accent disabled={!!busy || chosen.length === 0} onPress={saveAll} />
        : <SheetBtn label="완료" accent onPress={onClose} />}>
      {saved !== null ? <View style={{ marginTop: 8 }}><Text style={{ color: c.safelight, fontSize: 15, paddingHorizontal: 18 }}>{saved}롤을 가져왔어요.</Text></View> : null}
      {busy ? (
        <Section foot={`${busy.roll} / ${chosen.length}롤 · ${busy.done} / ${busy.total || '…'}장 저장 중`}>
          <Progress done={busy.done} total={busy.total} />
        </Section>
      ) : null}
      {files.map((f, i) => (
        <Section key={i}>
          <Group>
            <ZipPreviewRow name={f.name} thumbs={samples[i]} />
            <Field label="롤">
              <Select value={pick[i] ?? ''} title="롤" onChange={(v) => { if (busy || saved !== null) return; setPick((p) => { const n = p.slice(); n[i] = v; return n }) }}
                options={[['', '고르지 않음'], ...rolls.filter((r) => r.id === pick[i] || !pick.includes(r.id)).map((r): [string, string] => [r.id, `${rollFilmName(r)} · ${r.cameraModel ?? ''}`])]} />
            </Field>
          </Group>
        </Section>
      ))}
      {all && rolls.length === 0 ? <Footnote>스캔 대기 중인 롤이 없어요. 하나씩 가져오면 새 롤로 만들 수 있어요.</Footnote> : null}
      {error ? <Footnote warn>{error}</Footnote> : null}
    </Sheet>
  )
}
