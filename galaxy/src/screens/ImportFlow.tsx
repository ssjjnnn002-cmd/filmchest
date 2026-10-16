// 웹 pages/ImportFlow.tsx
import { useEffect, useMemo, useState } from 'react'
import { Image, ScrollView, Text, View } from 'react-native'
import { db } from '../data'
import { useLiveQuery } from '../store'
import { useNav } from '../App'
import type { Roll } from '../core/types'
import { uid, lensIdAt } from '../core/types'
import { allFilms, filmDisplayName } from '../core/films'
import type { ScanResult } from '../core/zip'
import { readScanner } from '../core/exif'
import { buildTimeline, type FrameInfo } from '../core/timeline'
import { exposureText, meterAlignLimit, meterAlignText, meterFrameTitle, meterShotsInScan } from '../core/meter'
import { bytesText, cameraName, fmtDay, rollCameraFormat, rollFilm, rollFilmName, rollTitle } from '../core/display'
import { Btn, Canister, DateInput, Empty, EmptyText, Field, Footnote, Group, Progress, Row, RowText, Section, Select, Spinner, Sub } from '../kit'
import { Sheet, SheetBtn } from '../overlay'
import { bytesToB64 } from '../files'
import type { PickedFile } from '../pick'
import { importScans, readFiles } from '../scan'
import { RollRow } from '../RollRow'
import { RollGalleryButton } from '../GallerySave'
import { useTheme } from '../theme'
import { LabField, rememberLab } from './Editors'

type Phase = 'analyzing' | 'pick' | 'confirm' | 'saving' | 'done' | 'error'

const thumbUri = (data: Uint8Array, type: string) => `data:${type === 'png' ? 'image/png' : 'image/jpeg'};base64,${bytesToB64(data)}`

export function ImportFlow({ files, rollId, onClose }: { files: PickedFile[]; rollId?: string; onClose: () => void }) {
  const c = useTheme()
  const nav = useNav()
  const rolls = useLiveQuery(() => db.rolls.toArray(), []) ?? []
  const [phase, setPhase] = useState<Phase>('analyzing')
  const [scan, setScan] = useState<ScanResult>()
  const [setIndex, setSetIndex] = useState(0)
  const [roll, setRoll] = useState<Roll>()
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [error, setError] = useState<string>()
  const [thumbs, setThumbs] = useState<string[]>([])
  const [quick, setQuick] = useState(false)

  useEffect(() => {
    readFiles(files).then(async (r) => {
      setScan(r)
      const pre = rollId ? await db.rolls.get(rollId) : undefined
      setRoll(pre)
      setPhase(pre ? 'confirm' : 'pick')
      // 안드로이드가 그릴 수 있는 사진만 미리보기 (TIFF 제외)
      setThumbs(r.primary.files.slice(0, 12).filter((f) => !/^tiff?$/.test(f.type)).map((f) => thumbUri(f.data, f.type)))
    }).catch((e: Error) => { setError(e.message || 'zip 파일을 열 수 없어요.'); setPhase('error') })
  }, [files, rollId])

  const sets = scan ? [scan.primary, ...scan.alternatives] : []
  const set = sets[setIndex]
  const scanner = useMemo(() => (set ? readScanner(set.files[0].data).name : undefined), [set])
  const order: Record<string, number> = { atLab: 0, finished: 1, loaded: 2 }
  const candidates = rolls.filter((r) => !r.deletedAt && r.status !== 'imported').sort((a, b) => order[a.status] - order[b.status] || b.loadedAt - a.loadedAt)

  const save = async (meterOffset = 0) => {
    if (!roll || !set) return
    setPhase('saving')
    setProgress({ done: 0, total: set.files.length })
    try {
      const camera = roll.cameraId ? await db.cameras.get(roll.cameraId) : undefined
      const lensMap = new Map((await db.lenses.toArray()).map((l) => [l.id, l]))
      const lensAt = (frame: number) => { const id = lensIdAt(roll, frame); return id ? lensMap.get(id) : undefined }
      const updated = await importScans(set, roll, camera, lensAt, setProgress, meterOffset)
      setRoll(updated)
      setPhase('done')
    } catch (e) {
      setError(`저장하지 못했어요. 기기 저장 공간이 부족할 수 있어요. (${(e as Error).message})`)
      setPhase('error')
    }
  }

  const saveCamera = useLiveQuery(() => (roll?.cameraId ? db.cameras.get(roll.cameraId) : undefined), [roll?.cameraId])

  return (
    <Sheet title="스캔 불러오기" onClose={phase === 'saving' ? () => {} : onClose} left={phase === 'saving' ? <View /> : undefined}>
      {phase === 'analyzing' ? <Empty icon="" title=""><Spinner /><EmptyText>스캔 파일 확인 중…</EmptyText></Empty> : null}
      {phase === 'error' ? <Empty icon="" title="불러오지 못했어요"><EmptyText>{error}</EmptyText></Empty> : null}

      {scan && phase === 'pick' ? (
        <>
          <Summary thumbs={thumbs} count={scan.primary.files.length} scanner={scanner} />
          <Section title="어느 롤인가요?">
            <Group>
              {candidates.length === 0 ? <Row static><Sub>기록해 둔 롤이 없어요. 아래에서 바로 기록할 수 있어요.</Sub></Row> : null}
              {candidates.map((r) => (
                <Row key={r.id} onPress={() => { setRoll(r); setPhase('confirm') }}><RollRow roll={r} /></Row>
              ))}
            </Group>
          </Section>
          <Group>
            <Row onPress={() => setQuick(true)}><RowText color={c.safelight}>+ 기록 없이 새 롤로 저장</RowText></Row>
          </Group>
        </>
      ) : null}

      {roll && set && phase === 'confirm' ? (
        <Confirmation roll={roll} sets={sets} setIndex={setIndex} onSetIndex={setSetIndex} scanner={scanner}
          onChangeRoll={rollId ? undefined : () => setPhase('pick')} onSave={save} />
      ) : null}

      {phase === 'saving' ? (
        <Empty icon="" title="사진에 촬영 정보 기록 중">
          <View style={{ alignSelf: 'stretch', paddingHorizontal: 8 }}><Progress done={progress.done} total={progress.total} /></View>
          <EmptyText>{progress.done} / {progress.total}</EmptyText>
        </Empty>
      ) : null}

      {phase === 'done' && roll ? (
        <Empty icon="" title={`${roll.frameCount}장 기록 완료`}>
          <View style={{ marginBottom: 4 }}><Canister film={rollFilm(roll)} size={110} /></View>
          <EmptyText>롤 보관함에 기록했어요. 갤러리에 저장을 누르면 사진 앱에 바로 들어가요.</EmptyText>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            <RollGalleryButton rollId={roll.id} title={rollTitle(roll, saveCamera)} onToast={nav.toast} />
            <Btn label="롤 보기" onPress={() => { onClose(); nav.setTab('rolls'); nav.push({ type: 'roll', id: roll.id }, 'rolls') }} />
          </View>
        </Empty>
      ) : null}

      {quick ? <QuickRoll onClose={() => setQuick(false)} onCreate={(r) => { setQuick(false); setRoll(r); setPhase('confirm') }} /> : null}
    </Sheet>
  )
}

function Summary({ thumbs, count, scanner }: { thumbs: string[]; count: number; scanner?: string }) {
  const c = useTheme()
  return (
    <Section>
      {thumbs.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ backgroundColor: c.filmBase, borderRadius: 14 }} contentContainerStyle={{ padding: 6, gap: 4 }}>
          {thumbs.map((u, i) => <Image key={i} source={{ uri: u }} style={{ width: 66, height: 44 }} resizeMode="cover" />)}
        </ScrollView>
      ) : null}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 }}>
        <Sub>{count}장</Sub><Sub>{scanner ?? ''}</Sub>
      </View>
    </Section>
  )
}

function ranges(timeline: FrameInfo[], key: (f: FrameInfo) => string) {
  const out: { key: string; start: number; end: number }[] = []
  for (const f of timeline) {
    const k = key(f)
    const last = out.at(-1)
    if (last && last.key === k) last.end = f.frame
    else out.push({ key: k, start: f.frame, end: f.frame })
  }
  return out.map((r) => ({ label: r.key, frames: r.start === r.end ? `${r.start}번` : `${r.start}–${r.end}번` }))
}

function Confirmation({ roll, sets, setIndex, onSetIndex, scanner, onChangeRoll, onSave }: {
  roll: Roll; sets: ScanResult['primary'][]; setIndex: number; onSetIndex: (i: number) => void; scanner?: string
  onChangeRoll?: () => void; onSave: (meterOffset: number) => void
}) {
  const c = useTheme()
  const camera = useLiveQuery(() => (roll.cameraId ? db.cameras.get(roll.cameraId) : undefined), [roll.cameraId])
  const [offset, setOffset] = useState(roll.meterOffset ?? 0)
  const count = sets[setIndex].files.length
  const unknownDate = roll.isArchive && roll.days.length === 0
  const timeline = buildTimeline(roll, count)
  const noPoint = roll.locations.find((l) => !l.point)
  const outOfRange = roll.locations.find((l) => l.startFrame > count)
  const line = (label: string, value: string, key?: string) => <Row key={key ?? label} static value={value}><RowText>{label}</RowText></Row>
  return (
    <>
      <Section>
        <Group>
          <Row static>
            <Canister film={rollFilm(roll)} format={rollCameraFormat(camera, roll)} size={64} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: c.ink }}>{rollFilmName(roll)}</Text>
              <Sub>{cameraName(camera, roll)}</Sub>
              {roll.lab ? <Sub>{roll.lab}</Sub> : null}
            </View>
            {onChangeRoll ? <Btn label="다른 롤" kind="ghost" size="small" onPress={onChangeRoll} /> : null}
          </Row>
        </Group>
      </Section>
      {sets.length > 1 ? (
        <Section title="저장할 파일">
          <Group>
            {sets.map((s, i) => (
              <Row key={i} onPress={() => onSetIndex(i)}>
                <RowText>{s.label} · {s.files.length}장 · {bytesText(s.totalBytes)}</RowText>
                {i === setIndex ? <Text style={{ color: c.safelight, fontSize: 17 }}>✓</Text> : null}
              </Row>
            ))}
          </Group>
        </Section>
      ) : null}
      <Section title="촬영일">
        <Group>
          {unknownDate
            ? line('알 수 없음', '원본 날짜 유지')
            : ranges(timeline, (f) => fmtDay(f.date)).map((r) => line(r.label, r.frames, r.label + r.frames))}
        </Group>
      </Section>
      <ExposureMap roll={roll} count={count} offset={offset} onOffset={setOffset} />
      {roll.locations.length > 0 ? (
        <Section title="장소">
          <Group>
            {ranges(timeline, (f) => f.location?.name || '기록 없음').map((r) => line(r.label, r.frames, r.label + r.frames))}
          </Group>
          {noPoint ? <Footnote warn>'{noPoint.name || '장소'}'는 좌표가 없어 사진에 위치가 기록되지 않아요. 롤 화면에서 좌표를 넣을 수 있어요.</Footnote> : null}
          {outOfRange ? <Footnote warn>'{outOfRange.name}'는 {outOfRange.startFrame}번부터로 기록했는데 스캔은 {count}장이에요.</Footnote> : null}
        </Section>
      ) : null}
      {scanner ? <Footnote>스캐너: {scanner}</Footnote> : null}
      <View style={{ marginTop: 8 }}><Btn label={`${count}장에 촬영 정보 기록하기`} kind="primary" block onPress={() => onSave(offset)} /></View>
      <View style={{ marginTop: 8, alignItems: 'center' }}><Footnote>사진은 이 기기 안에서만 처리돼요. 어디에도 올라가지 않아요.</Footnote></View>
    </>
  )
}

function ExposureMap({ roll, count, offset, onOffset }: { roll: Roll; count: number; offset: number; onOffset: (n: number) => void }) {
  const c = useTheme()
  const matched = meterShotsInScan(roll.meterShots, count, offset)
  const recorded = roll.meterShots?.length ?? 0
  if (!recorded) return null
  const nudge = (d: number) => onOffset(Math.min(meterAlignLimit, Math.max(-meterAlignLimit, offset + d)))
  return (
    <Section title="노출" foot={`${meterAlignText(offset)} 현상소 번호가 다르면 한 칸씩 옮기세요. 기록 없는 칸은 비워요.`}>
      <Group>
        <Row static>
          <RowText>번호 맞추기</RowText>
          <Btn label="−" kind="soft" size="small" disabled={offset <= -meterAlignLimit} onPress={() => nudge(-1)} />
          <Text style={{ minWidth: 28, textAlign: 'center', fontVariant: ['tabular-nums'], fontSize: 17, color: c.ink }}>{offset > 0 ? `+${offset}` : offset}</Text>
          <Btn label="+" kind="soft" size="small" disabled={offset >= meterAlignLimit} onPress={() => nudge(1)} />
        </Row>
        {matched.map((s) => (
          <Row key={s.pos} static value={exposureText(s)}>
            <RowText sub={`노출계 ${meterFrameTitle(s.pos, !!roll.meterPrewind)}`}>{s.pos + offset}번 사진</RowText>
          </Row>
        ))}
      </Group>
      {recorded > matched.length ? (
        <Footnote warn>기록 {recorded}장 중 {recorded - matched.length}장은 이 맞춤에서는 사진 밖에 있어요.</Footnote>
      ) : null}
    </Section>
  )
}

/** 미리 기록하지 않은 롤을 즉석에서 */
function QuickRoll({ onClose, onCreate }: { onClose: () => void; onCreate: (r: Roll) => void }) {
  const cameras = useLiveQuery(() => db.cameras.orderBy('sortOrder').filter((x) => !x.deletedAt).toArray(), []) ?? []
  const [cameraId, setCameraId] = useState('')
  const [filmId, setFilmId] = useState(allFilms()[0].id)
  const [date, setDate] = useState(Date.now())
  const [place, setPlace] = useState('')
  const [lab, setLab] = useState('')
  const create = async () => {
    rememberLab(lab)
    const camera = cameras.find((x) => x.id === cameraId)
    const r: Roll = {
      id: uid(), cameraId: camera?.id, cameraBrand: camera?.brand, cameraModel: camera?.model, cameraFormat: camera?.format, cameraFixedLens: camera?.fixedLens,
      filmId, status: 'atLab', loadedAt: date,
      days: [{ id: uid(), startedAt: date, startFrame: 1 }],
      locations: place.trim() ? [{ id: uid(), startFrame: 1, name: place.trim() }] : [],
      lab: lab.trim() || undefined, favorite: false, isArchive: false,
    }
    await db.rolls.add(r)
    onCreate(r)
  }
  return (
    <Sheet title="새 롤" onClose={onClose} right={<SheetBtn label="다음" accent onPress={create} />}>
      <Section><Group>
        <Field label="카메라">
          <Select value={cameraId} title="카메라" onChange={setCameraId}
            options={[['', '알 수 없음'], ...cameras.map((x): [string, string] => [x.id, `${x.brand} ${x.model}`])]} />
        </Field>
        <Field label="필름">
          <Select value={filmId} title="필름" onChange={setFilmId} options={allFilms().map((f): [string, string] => [f.id, filmDisplayName(f)])} />
        </Field>
        <Field label="촬영일"><DateInput value={date} onChange={setDate} /></Field>
        <Field label="장소 (선택)" value={place} onChangeText={setPlace} />
        <LabField value={lab} onChange={setLab} />
      </Group></Section>
    </Sheet>
  )
}
