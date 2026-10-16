// 웹 pages/ArchiveImport.tsx — 예전에 찍어 스캔본을 받아 둔 롤을 롤 보관함에 넣는다. 모르는 정보는 '알 수 없음'.
import { useEffect, useState } from 'react'
import { Image, ScrollView, View } from 'react-native'
import { db } from '../data'
import { useLiveQuery } from '../store'
import { useNav } from '../App'
import type { GeoPoint, Roll } from '../core/types'
import { uid } from '../core/types'
import { allFilms, filmDisplayName, filmFromText } from '../core/films'
import { isZipFile, previewZip } from '../core/zip'
import { Btn, DateInput, Empty, EmptyText, Field, Footnote, Group, Progress, Row, RowText, Section, Select, Sub, Toggle } from '../kit'
import { Sheet, SheetBtn } from '../overlay'
import { readBytes } from '../files'
import { pickFiles, pickFolder, type PickedFile } from '../pick'
import { importScans, readFiles } from '../scan'
import { useTheme } from '../theme'
import { LabField, MemoInput, PlacePicker, rememberLab } from './Editors'

export function ArchiveImport({ onClose, presetFile, stepLabel, onSaved }: {
  onClose: () => void
  presetFile?: PickedFile
  stepLabel?: string
  onSaved?: () => void
}) {
  const c = useTheme()
  const nav = useNav()
  const cameras = useLiveQuery(() => db.cameras.orderBy('sortOrder').filter((x) => !x.deletedAt).toArray(), []) ?? []
  const [files, setFiles] = useState<PickedFile[]>(presetFile ? [presetFile] : [])
  const [cameraId, setCameraId] = useState('')
  const [filmId, setFilmId] = useState('')
  const [dateKnown, setDateKnown] = useState(false)
  const [date, setDate] = useState(Date.now())
  const [place, setPlace] = useState('')
  const [point, setPoint] = useState<GeoPoint>()
  const [lab, setLab] = useState('')
  const [memo, setMemo] = useState('')
  const [progress, setProgress] = useState<{ done: number; total: number }>()
  const [error, setError] = useState<string>()
  const [thumbs, setThumbs] = useState<string[]>([])

  useEffect(() => {
    const file = presetFile ?? files.find((f) => isZipFile({ name: f.name, type: f.mimeType }))
    if (!file) { setThumbs([]); return }
    let cancel = false
    readBytes(file.uri).then((data) => previewZip(data)).then(({ paths, thumbs: next }) => {
      if (cancel) return
      setThumbs(next)
      const folders = [...new Set(paths.map((p) => (p.includes('/') ? p.slice(0, p.lastIndexOf('/')) : '')).filter(Boolean))]
      const storedCopy = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(file.name)
      const guess = (storedCopy ? undefined : filmFromText(file.name)) ?? filmFromText(folders.join('\n'))
      if (guess) setFilmId((cur) => cur || guess)
    }).catch(() => { if (!cancel) setThumbs([]) })
    return () => { cancel = true }
  }, [presetFile, files])

  const save = async () => {
    setError(undefined)
    try {
      setProgress({ done: 0, total: 0 })
      const scan = await readFiles(files)
      rememberLab(lab)
      const camera = cameras.find((x) => x.id === cameraId)
      const roll: Roll = {
        id: uid(), cameraId: camera?.id, cameraBrand: camera?.brand, cameraModel: camera?.model, cameraFormat: camera?.format, cameraFixedLens: camera?.fixedLens,
        filmId, status: 'atLab', loadedAt: dateKnown ? date : Date.now(),
        days: dateKnown ? [{ id: uid(), startedAt: date, startFrame: 1 }] : [],
        locations: place.trim() || point ? [{ id: uid(), startFrame: 1, name: place.trim(), point }] : [],
        lab: lab.trim() || undefined, note: memo.trim() || undefined, favorite: false, isArchive: true,
      }
      await db.rolls.add(roll)
      await importScans(scan.primary, roll, camera, () => undefined, setProgress)
      nav.toast(`${scan.primary.files.length}장을 롤 보관함에 넣었어요`)
      if (onSaved) onSaved()
      else onClose()
    } catch (e) {
      setProgress(undefined)
      setError(`가져오지 못했어요. (${(e as Error).message})`)
    }
  }

  const busy = !!progress
  return (
    <Sheet title={stepLabel ? `기존 롤 ${stepLabel}` : '기존 롤 가져오기'} onClose={busy ? () => {} : onClose} left={busy ? <View /> : undefined}
      right={<SheetBtn label="가져오기" accent disabled={!files.length || busy} onPress={save} />}>
      {busy ? (
        <Empty icon="" title="가져오는 중">
          <View style={{ alignSelf: 'stretch', paddingHorizontal: 8 }}><Progress done={progress.done} total={progress.total} /></View>
          <EmptyText>{progress.done} / {progress.total || '…'}</EmptyText>
        </Empty>
      ) : (
        <>
          <Section title="사진" foot={presetFile ? '사진을 보고 카메라와 필름을 채워 주세요. 폴더 이름에 필름이 있으면 미리 넣어 둬요. 닫아도 대기열에 남아요.' : '파일명 순서대로 컷 번호가 붙어요.'}>
            <Group>
              {presetFile ? (
                <Row static><RowText>{presetFile.name}</RowText></Row>
              ) : [
                <Row key="files" onPress={async () => { const f = await pickFiles(['image/*', 'application/zip', 'application/x-zip-compressed', 'application/octet-stream']); if (f.length) setFiles(f) }}>
                  <RowText color={c.safelight}>사진 또는 zip 고르기</RowText>
                </Row>,
                <Row key="folder" onPress={async () => { const f = await pickFolder(); if (f.length) setFiles(f) }}>
                  <RowText color={c.safelight}>폴더 통째로 고르기</RowText>
                </Row>,
                files.length > 0 ? <Row key="count" static><Sub>파일 {files.length}개 선택함</Sub></Row> : null,
              ]}
            </Group>
            {thumbs.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingTop: 4, paddingBottom: 8 }}>
                {thumbs.map((src, i) => <Image key={i} source={{ uri: src }} style={{ width: 92, height: 68, borderRadius: 8, backgroundColor: '#111' }} resizeMode="cover" />)}
              </ScrollView>
            ) : null}
          </Section>
          {presetFile ? <View style={{ alignItems: 'flex-start', marginTop: -8 }}><Btn label="나중에 이어하기" onPress={onClose} /></View> : null}

          <Section foot={!dateKnown ? '알 수 없음으로 두면 사진에 원래 들어 있던 날짜를 그대로 둬요.' : undefined}>
            <Group>
              <Field label="카메라">
                <Select value={cameraId} title="카메라" onChange={setCameraId}
                  options={[['', '알 수 없음'], ...cameras.map((x): [string, string] => [x.id, `${x.brand} ${x.model}`])]} />
              </Field>
              <Field label="필름">
                <Select value={filmId} title="필름" onChange={setFilmId}
                  options={[['', '알 수 없음'], ...allFilms().map((f): [string, string] => [f.id, filmDisplayName(f)])]} />
              </Field>
              <Toggle label="촬영일 알아요" value={dateKnown} onChange={setDateKnown} />
              {dateKnown ? <Field label="촬영일"><DateInput value={date} onChange={setDate} /></Field> : null}
            </Group>
          </Section>

          <PlacePicker name={place} point={point} onChange={(n, p) => { setPlace(n); setPoint(p) }} />

          <Section>
            <Group>
              <LabField value={lab} onChange={setLab} />
              <View>
                <View style={{ paddingTop: 8, paddingHorizontal: 18 }}><Sub>메모</Sub></View>
                <MemoInput value={memo} onChange={setMemo} />
              </View>
            </Group>
          </Section>
          {error ? <Footnote warn>{error}</Footnote> : null}
        </>
      )}
    </Sheet>
  )
}
