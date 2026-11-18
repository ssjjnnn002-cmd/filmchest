// 웹 pages/RollDetail.tsx
import { useEffect, useRef, useState } from 'react'
import { Pressable, Switch, View } from 'react-native'
import { Text } from '../text'
import { TextInput } from '../textInput'
import Svg, { Path } from 'react-native-svg'
import { db, deleteRoll } from '../data'
import { useLiveQuery } from '../store'
import { useNav } from '../App'
import { weatherText, type Camera, type FilmFormat, type LocationSegment, type MeterShot, type Roll, type ShootingDay } from '../core/types'
import { exposureText, meterFrameTitle, meterProgress, meterShotsByOrder, shotRowMeta } from '../core/meter'
import { ManualRecord, RollShotEdit } from './ManualRecord'
import { bytesText, cameraName, dateRangeText, fmtDay, fmtDayTime, resolutionText, rollCameraFormat, rollFilm, rollFilmName, rollName, rollTitle, sortedDays, sortedLocations } from '../core/display'
import { Btn, CameraCover, Canister, Field, Group, Progress, Row, RowText, Section, Segmented, StatusBadge, Sub } from '../kit'
import { Icon } from '../icons'
import { Page } from '../page'
import { Confirm, Menu, Sheet, SheetBtn } from '../overlay'
import { features } from '../core/features'
import { RollGalleryButton } from '../GallerySave'
import { useTheme } from '../theme'
import { DayEdit, LabDropOff, LensChangeEdit, PlaceEdit } from './Editors'
import { RollProjects } from './Projects'
import { TagField } from '../gearExtras'
import { FramePrint } from './FramePrint'
import { ContactSheetView, FilmStrip, FrameViewer } from './RollViewers'
import { ScanButton } from './Pending'
import { driveConnected, syncPhotosToDrive } from '../drive'
import { refreshRollPhotoMeta, rollImageFiles } from '../scan'
import { replaceInGallery } from '../gallery'

export function RollDetail({ id }: { id: string }) {
  const c = useTheme()
  const nav = useNav()
  const roll = useLiveQuery(() => db.rolls.get(id), [id])
  usePhotoMetaSync(roll, nav.toast)
  const frames = useLiveQuery(() => db.frames.where('rollId').equals(id).sortBy('index'), [id]) ?? []
  const camera = useLiveQuery(() => (roll?.cameraId ? db.cameras.get(roll.cameraId) : undefined), [roll?.cameraId])
  const lens = useLiveQuery(() => (roll?.lensId ? db.lenses.get(roll.lensId) : undefined), [roll?.lensId])
  const allLenses = useLiveQuery(() => db.lenses.toArray(), []) ?? []
  const lensName = (lid?: string) => { const l = allLenses.find((x) => x.id === lid); return l ? `${l.brand} ${l.model}` : '렌즈 모름' }
  const [lensEdit, setLensEdit] = useState<'first' | 'new' | { id: string; startFrame: number; lensId: string } | null>(null)
  const [day, setDay] = useState<ShootingDay | 'new' | null>(null)
  const [place, setPlace] = useState<LocationSegment | 'new' | null>(null)
  const [dropOff, setDropOff] = useState(false)
  const [titleEdit, setTitleEdit] = useState<string>()
  const [viewing, setViewing] = useState<number | null>(null)
  const [sheet, setSheet] = useState(false)
  const [framePrint, setFramePrint] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [recording, setRecording] = useState(false)
  const [moreMenu, setMoreMenu] = useState(false)
  const [pickCamera, setPickCamera] = useState(false)
  const [shotEdit, setShotEdit] = useState<number>()
  const [allShots, setAllShots] = useState(false)

  if (!roll) return <Page title="" onBack={nav.pop} large={false}><View /></Page>
  // 컷 기록: 촬영 중이거나 상세 기록을 남긴 롤
  const showShots = roll.status === 'loaded' || (roll.meterShots?.length ?? 0) > 0
  // 상세 기록이 있으면 컷마다 시간·장소가 있어 촬영일·장소 칸은 따로 두지 않는다
  const noShots = !(roll.meterShots?.length)
  const locs = sortedLocations(roll)
  const rangeOf = (i: number) => {
    const s = locs[i].startFrame
    const end = i + 1 < locs.length ? locs[i + 1].startFrame - 1 : roll.frameCount
    if (end && end > s) return `${s}–${end}번`
    if (end === s) return `${s}번`
    return `${s}번부터`
  }
  const accentRow = (icon: string, label: string, onPress: () => void) => (
    <Row onPress={onPress}><Icon name={icon} size={20} color={c.safelight} /><RowText color={c.safelight}>{label}</RowText></Row>
  )
  const info = (label: string, value: string) => <Row key={label} static value={value}><RowText>{label}</RowText></Row>

  return (
    <Page title={rollName(roll)} onBack={nav.pop}
      actions={
        <View style={{ height: 44, borderRadius: 22, paddingHorizontal: 4, flexDirection: 'row', backgroundColor: c.glass, borderWidth: 0.5, borderColor: c.glassLine, boxShadow: c.shadowGlass }}>
          <Pressable accessibilityLabel={roll.favorite ? '즐겨찾기 해제' : '즐겨찾기'} onPress={() => db.rolls.update(id, { favorite: !roll.favorite })}
            style={({ pressed }) => ({ width: 48, height: 44, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
            <Svg width={23} height={23} viewBox="0 0 24 24">
              <Path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" fill={roll.favorite ? '#f5b700' : 'none'}
                stroke={roll.favorite ? '#f5b700' : c.ink} strokeWidth={1.8} strokeLinejoin="round" />
            </Svg>
          </Pressable>
          <Pressable accessibilityLabel="더 보기" onPress={() => setMoreMenu(true)}
            style={({ pressed }) => ({ width: 48, height: 44, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
            <Icon name="more" size={23} color={c.safelight} />
          </Pressable>
        </View>
      }>
      {/* 맨 위 큰 제목 바로 아래: 제목 편집 (비우면 필름 이름) */}
      <Pressable onPress={() => setTitleEdit(roll.title ?? '')} hitSlop={6}
        style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: -6, marginBottom: 12, marginHorizontal: 4, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 99, backgroundColor: c.fill }}>
        <Icon name="pencil" size={15} color={c.muted} />
        <Text style={{ fontSize: 13, fontWeight: '600', color: c.muted }}>제목 편집</Text>
      </Pressable>
      <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center', marginHorizontal: 4, marginBottom: 8 }}>
        <Canister film={rollFilm(roll)} format={rollCameraFormat(camera, roll)} size={104} />
        <View style={{ gap: 3, minWidth: 0, flex: 1, alignItems: 'flex-start' }}>
          <StatusBadge status={roll.status} />
          <Text style={{ fontSize: 22, fontWeight: '700', color: c.ink }}>{rollFilmName(roll)}{roll.shotISO ? ` @ ISO ${roll.shotISO}` : ''}</Text>
          <Text style={{ fontSize: 17, color: c.ink }}>{cameraName(camera, roll)}</Text>
          {lens || camera?.fixedLens || roll.cameraFixedLens ? (
            <Sub>
              {lens ? `${lens.brand} ${lens.model}` : camera?.fixedLens || roll.cameraFixedLens}
              {roll.lensChanges?.length ? ` 외 렌즈 ${roll.lensChanges.length}번 교체` : ''}
            </Sub>
          ) : null}
          <Sub>{dateRangeText(roll)}</Sub>
        </View>
      </View>

      {/* 다음에 할 일을 맨 위에: 촬영 중이면 상세 기록 */}
      {roll.status === 'loaded' ? <View style={{ marginTop: 4, marginBottom: 8 }}><Btn label="상세 기록" kind="primary" block onPress={() => setRecording(true)} /></View> : null}
      {roll.status === 'finished' ? <Section foot="고르면 스캔 대기로 넘어가요."><Btn label="현상소 고르기" kind="primary" block onPress={() => setDropOff(true)} /></Section> : null}
      {roll.status === 'atLab' ? <Section foot="현상소에서 받은 zip이나 사진을 골라요."><ScanButton rollId={id} big /></Section> : null}

      {roll.status === 'imported' && frames.length > 0 ? (
        <Section foot="갤러리에 저장을 누르면 사진 앱에 바로 들어가요.">
          <FilmStrip roll={roll} frames={frames} onSelect={setViewing} />
          <View style={{ gap: 10 }}>
            <Btn label="밀착 인화지로 보기" icon="sheet" kind="soft" onPress={() => setSheet(true)} />
            {features.framePrint ? <Btn label="프레임 만들기" icon="photos" kind="soft" onPress={() => setFramePrint(true)} /> : null}
            <RollGalleryButton rollId={roll.id} title={rollTitle(roll, camera)} onToast={nav.toast} block />
          </View>
        </Section>
      ) : null}

      {showShots ? <ShotsSection roll={roll} format={rollCameraFormat(camera, roll)} onEdit={setShotEdit} onAll={() => setAllShots(true)} /> : null}

      {noShots ? <Section title="촬영일" foot={roll.days.length > 0 ? '눌러서 수정하거나 삭제할 수 있어요.' : undefined}>
        <Group>
          {sortedDays(roll).map((d) => (
            <Row key={d.id} onPress={() => setDay(d)} value={d.startFrame ? `${d.startFrame}번부터` : '컷 미확인'}>
              <RowText>{fmtDayTime(d.startedAt)}</RowText>
            </Row>
          ))}
          {roll.isArchive && roll.days.length === 0 ? <Row static><Sub>알 수 없음 (원본 날짜 유지)</Sub></Row> : null}
          {accentRow('plus', '촬영일 추가', () => setDay('new'))}
        </Group>
      </Section> : null}

      {camera?.mount ? (
        <Section title="렌즈" foot="중간에 렌즈를 바꿨다면 몇 번 컷부터인지 남겨 두세요. 사진마다 그때 렌즈가 기록돼요.">
          <Group>
            <Row onPress={() => setLensEdit('first')} value="1번부터"><RowText>{roll.lensId ? lensName(roll.lensId) : '렌즈 고르기'}</RowText></Row>
            {[...(roll.lensChanges ?? [])].sort((a, b) => a.startFrame - b.startFrame).map((x) => (
              <Row key={x.id} onPress={() => setLensEdit(x)} value={`${x.startFrame}번부터`}><RowText>{lensName(x.lensId)}</RowText></Row>
            ))}
            {accentRow('plus', '렌즈 바꿔 낌', () => setLensEdit('new'))}
          </Group>
        </Section>
      ) : null}

      {noShots ? <Section title="장소" warn foot={locs.some((l) => !l.point) ? '주황색 장소는 좌표가 없어 사진에 위치가 기록되지 않아요. 눌러서 좌표를 넣어 주세요.' : undefined}>
        <Group>
          {locs.map((l, i) => (
            <Row key={l.id} onPress={() => setPlace(l)} value={rangeOf(i)}>
              <Icon name="pin" size={20} color={l.point ? c.safelight : c.warn} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontSize: 17, color: c.ink }}>{l.name || '장소 없음'}</Text>
                {l.memo ? <Sub>{l.memo}</Sub> : null}
                {l.weather ? <Sub>{weatherText(l.weather)}</Sub> : null}
                {!l.point ? <Text style={{ fontSize: 14, color: c.warn }}>좌표 없음</Text> : null}
              </View>
            </Row>
          ))}
          {accentRow('plus', '장소 추가', () => setPlace('new'))}
        </Group>
      </Section> : null}

      {roll.lab || roll.droppedAt || roll.scanner || resolutionText(roll.scanW, roll.scanH) || roll.frameCount || roll.importedAt ? (
        <Section title="현상 · 스캔">
          <Group>
            {roll.lab ? info('현상소', roll.lab) : null}
            {roll.droppedAt ? info('맡긴 날', fmtDay(roll.droppedAt)) : null}
            {roll.scanner ? info('스캐너', roll.scanner) : null}
            {resolutionText(roll.scanW, roll.scanH) ? info('해상도', resolutionText(roll.scanW, roll.scanH)!) : null}
            {roll.frameCount ? info('스캔', [`${roll.frameCount}장`, roll.scanFormat, bytesText(roll.scanBytes)].filter(Boolean).join(' · ')) : null}
            {roll.importedAt ? info('불러온 날', fmtDay(roll.importedAt)) : null}
          </Group>
        </Section>
      ) : null}

      {/* 정리: 태그 · 프로젝트 · 메모 */}
      <TagField tags={roll.tags ?? []} setTags={(tags) => db.rolls.update(id, { tags })} />
      <RollProjects roll={roll} />

      <Section title="메모" right={
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 13, color: c.muted }}>목록에서 표시하기</Text>
          <Switch value={!!roll.noteInList} onValueChange={(v) => { void db.rolls.update(id, { noteInList: v || undefined }) }}
            trackColor={{ true: c.safelight }} thumbColor="#fff" />
        </View>
      }>
        <Group>
          <View style={{ paddingVertical: 8, paddingHorizontal: 18 }}>
            <TextInput multiline accessibilityLabel="메모" defaultValue={roll.note ?? ''} placeholderTextColor={c.faint}
              style={{ minHeight: 64, fontSize: 17, lineHeight: 23, color: c.ink, textAlignVertical: 'top', paddingVertical: 3 }}
              onEndEditing={(e) => db.rolls.update(id, { note: e.nativeEvent.text.trim() || undefined })} />
          </View>
        </Group>
      </Section>

      {roll.status !== 'atLab' ? (
      <Section>
        <View style={{ gap: 10 }}>
          {roll.status === 'loaded' ? <Btn label="촬영 끝내기" kind="primary" size="stack" block onPress={() => setDropOff(true)} /> : null}
          {roll.status === 'finished' ? <Btn label="다시 촬영 중으로" size="stack" block onPress={() => db.rolls.update(id, { status: 'loaded' })} /> : null}
          {roll.status === 'imported' ? <ScanButton rollId={id} label="다시 불러오기" big /> : null}
          {roll.status === 'imported' ? <Btn label="사진 날짜·위치 다시 맞추기" size="stack" block onPress={() => { void syncPhotoMeta(id, nav.toast) }} /> : null}
        </View>
      </Section>
      ) : null}

      {moreMenu ? <Menu onClose={() => setMoreMenu(false)} items={[
        { label: '카메라 바꾸기', onPress: () => setPickCamera(true) },
        { label: '롤 삭제', danger: true, onPress: () => setConfirm(true) },
      ]} /> : null}
      {pickCamera ? <RollCameraPick roll={roll} onClose={() => setPickCamera(false)} /> : null}
      {recording ? <ManualRecord roll={roll} onClose={() => setRecording(false)} /> : null}
      {shotEdit !== undefined ? <RollShotEdit roll={roll} pos={shotEdit} onClose={() => setShotEdit(undefined)} onToast={nav.toast} /> : null}
      {allShots ? (
        <Sheet title="컷 기록" onClose={() => setAllShots(false)} right={<SheetBtn label="완료" accent onPress={() => setAllShots(false)} />}>
          <AllShots roll={roll} format={rollCameraFormat(camera, roll)} onEdit={(p) => { setAllShots(false); setShotEdit(p) }} />
        </Sheet>
      ) : null}
      {day ? <DayEdit roll={roll} day={day === 'new' ? undefined : day} onClose={() => setDay(null)} /> : null}
      {place ? <PlaceEdit roll={roll} segment={place === 'new' ? undefined : place} onClose={() => setPlace(null)} /> : null}
      {titleEdit !== undefined ? (
        <Sheet title="롤 제목" onClose={() => setTitleEdit(undefined)}
          right={<SheetBtn label="저장" accent onPress={async () => { await db.rolls.update(id, { title: titleEdit.trim() || undefined }); setTitleEdit(undefined) }} />}>
          <Section foot="비워 두면 필름 이름으로 보여요.">
            <Group>
              <Field label="제목" value={titleEdit} placeholder={rollFilmName(roll)} maxLength={60} autoFocus onChangeText={setTitleEdit} />
            </Group>
          </Section>
        </Sheet>
      ) : null}
      {dropOff ? <LabDropOff roll={roll} onClose={(ended) => { setDropOff(false); if (ended) nav.toPending(roll.id) }} /> : null}
      {viewing !== null ? <FrameViewer frames={frames} start={viewing} onClose={() => setViewing(null)} /> : null}
      {framePrint ? <FramePrint roll={roll} frames={frames} onClose={() => setFramePrint(false)} /> : null}
      {sheet ? <ContactSheetView roll={roll} frames={frames} onClose={() => setSheet(false)} /> : null}
      {confirm ? (
        <Confirm message="이 롤 기록을 삭제할까요? 24시간 안에는 설정에서 되돌릴 수 있어요. 사진 앱에 저장한 사진은 그대로 남아요." onCancel={() => setConfirm(false)}
          onConfirm={async () => { setConfirm(false); await deleteRoll(id); nav.setTab(nav.tab) }} />
      ) : null}
      {lensEdit && camera?.mount ? (
        <LensChangeEdit roll={roll} mount={camera.mount} brand={camera.brand}
          change={lensEdit === 'new' ? undefined : lensEdit} onClose={() => setLensEdit(null)} />
      ) : null}
    </Page>
  )
}

/** 롤 카메라 바꾸기: 내 장비 카메라 중에서 (웹·아이폰과 같음). 촬영 중인 롤은 다른 필름이 든 카메라로는 못 옮긴다.
 *  마운트가 다르거나 렌즈 고정형으로 바꾸면 롤 렌즈 기록은 비운다. 바꾸면 저장한 사진·갤러리 사진의 카메라 정보도 바꾼다 */
function RollCameraPick({ roll, onClose }: { roll: Roll; onClose: () => void }) {
  const c = useTheme()
  const cameras = useLiveQuery(() => db.cameras.orderBy('sortOrder').filter((x) => !x.deletedAt).toArray(), []) ?? []
  const busyIds = useLiveQuery(async () => new Set((await db.rolls.where('status').equals('loaded').toArray()).filter((r) => !r.deletedAt && r.id !== roll.id).map((r) => r.cameraId)), [roll.id]) ?? new Set<string | undefined>()
  const lens = useLiveQuery(() => (roll.lensId ? db.lenses.get(roll.lensId) : undefined), [roll.lensId])
  const pick = async (x: Camera) => {
    if (x.id !== roll.cameraId) {
      const keepLens = !x.fixedLens && !!lens && (lens.mount ?? '').toLowerCase() === (x.mount ?? '').toLowerCase()
      await db.rolls.update(roll.id, {
        cameraId: x.id, cameraBrand: x.brand, cameraModel: x.model, cameraFormat: x.format, cameraFixedLens: x.fixedLens,
        ...(keepLens ? {} : { lensId: undefined, lensChanges: [] }),
      })
    }
    onClose()
  }
  return (
    <Sheet title="카메라 바꾸기" onClose={onClose}>
      <Section foot="저장한 사진과 갤러리에 저장한 사진의 카메라 정보도 함께 바꿔요.">
        <Group>
          {cameras.map((x) => {
            const busy = roll.status === 'loaded' && busyIds.has(x.id)
            return (
              <Pressable key={x.id} disabled={busy} onPress={() => { void pick(x) }}
                style={({ pressed }) => ({ minHeight: 60, paddingHorizontal: 18, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 12, opacity: busy ? 0.45 : pressed ? 0.6 : 1 })}>
                <View style={{ width: 56 }}><CameraCover camera={x} height={40} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 17, color: c.ink }}>{x.brand} {x.model}</Text>
                  {busy ? <Sub>다른 필름이 들어 있어요</Sub> : null}
                </View>
                {x.id === roll.cameraId ? <Text style={{ fontSize: 17, color: c.safelight }}>✓</Text> : null}
              </Pressable>
            )
          })}
        </Group>
      </Section>
    </Sheet>
  )
}

/** 롤 화면의 컷 기록: 최근 5컷, 넘으면 전체 보기 (웹과 같음) */
function ShotsSection({ roll, format, onEdit, onAll }: { roll: Roll; format: FilmFormat; onEdit: (pos: number) => void; onAll: () => void }) {
  // 컷 번호 순서 (역순 감기여도 1번부터). 촬영 중이면 최근 5컷, 다 찍은 롤은 전부 (아이폰과 같음)
  const num = (x: MeterShot) => Number(meterFrameTitle(x.pos, !!roll.meterPrewind).replace(/\D/g, '')) || x.pos
  // 큰 번호(최근)부터: 36, 35, 34 … (웹·아이폰과 같음)
  const byNumber = (list: MeterShot[]) => [...list].sort((a, b) => num(b) - num(a))
  const shots = byNumber(roll.meterShots ?? [])
  const recent = roll.status === 'loaded' && shots.length > 6 ? byNumber([...shots].sort((a, b) => b.order - a.order).slice(0, 5)) : shots
  const { capacity } = meterProgress(shots.length, format)
  return (
    <Section title="컷 기록" right={shots.length ? <Sub>{shots.length} / {capacity}컷</Sub> : undefined}>
      <Group>
        {shots.length === 0 ? <Row static><Sub>상세 기록에서 찍으면 여기에 쌓여요.</Sub></Row> : null}
        {recent.map((s) => <ShotRow key={s.pos} shot={s} prewind={!!roll.meterPrewind} onPress={() => onEdit(s.pos)} />)}
        {shots.length > recent.length ? <Row chev onPress={onAll}><RowText>전체 {shots.length}컷 보기</RowText></Row> : null}
      </Group>
    </Section>
  )
}

function ShotRow({ shot, prewind, onPress }: { shot: MeterShot; prewind: boolean; onPress: () => void }) {
  return (
    <Row onPress={onPress} value={exposureText(shot)}>
      <RowText sub={shotRowMeta(shot)}>{meterFrameTitle(shot.pos, prewind)}</RowText>
    </Row>
  )
}

/** 컷 기록 전체 (찍은 순서) */
function AllShots({ roll, format, onEdit }: { roll: Roll; format: FilmFormat; onEdit: (pos: number) => void }) {
  const c = useTheme()
  const shots = meterShotsByOrder(roll.meterShots).reverse() // 마지막에 찍은 컷부터
  const { shot, capacity, percent } = meterProgress(shots.length, format)
  const prewind = !!roll.meterPrewind
  return (
    <>
      <Section foot={`${prewind ? '역순으로 기록 중이에요. ' : ''}스캔을 불러오면 1번 칸의 기록이 첫 장에, 같은 번호끼리 붙어요.`}>
        <Group>
          <View style={{ paddingHorizontal: 18, paddingVertical: 16, gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 34, fontWeight: '700', color: c.ink, fontVariant: ['tabular-nums'], letterSpacing: -0.5 }}>{percent}%</Text>
              <Sub>{shot} / {capacity}컷</Sub>
            </View>
            <Progress done={Math.min(shot, capacity)} total={capacity} />
            {shot > capacity ? <Sub>{capacity}컷을 넘겨 {shot - capacity}장 더 찍었어요.</Sub> : null}
          </View>
        </Group>
      </Section>
      <Section title="찍은 순서">
        <Group>
          {shots.map((s) => <ShotRow key={s.pos} shot={s} prewind={prewind} onPress={() => onEdit(s.pos)} />)}
        </Group>
      </Section>
    </>
  )
}

/** 촬영일·장소를 고치면 저장한 사진 속 날짜·위치도 새로 쓴다. 드라이브에 연결돼 있으면 새 정보의 사진으로 다시 올린다 */
function usePhotoMetaSync(roll: Roll | undefined, toast: (m: string) => void) {
  const key = roll?.status === 'imported'
    ? JSON.stringify([roll.days.map((d) => [d.startedAt, d.startFrame]), roll.locations.map((l) => [l.startFrame, l.name, l.point?.latitude, l.point?.longitude]), roll.isArchive, roll.cameraId, roll.cameraBrand, roll.cameraModel, roll.lensId,
      (roll.meterShots ?? []).map((x) => [x.pos, x.at, x.place, x.lat, x.lon, x.lensId, x.iso])])
    : ''
  const last = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (!key || !roll) return
    if (last.current === undefined || last.current === key) { last.current = key; return }
    last.current = key
    // 여러 칸을 연달아 고칠 때는 다 고친 뒤 한 번만
    const t = setTimeout(() => { void syncPhotoMeta(roll.id, toast) }, 1500)
    return () => clearTimeout(t)
  }, [key])
}

async function syncPhotoMeta(rollId: string, toast: (m: string) => void) {
  const n = await refreshRollPhotoMeta(rollId)
  if (!n) return
  const drive = driveConnected()
  // 갤러리에 저장해 둔 사진도 새 정보의 사진으로 바꿔 넣는다
  const g = await replaceInGallery(await rollImageFiles(rollId)).catch(() => 0)
  toast(`사진 정보도 바꿨어요 (${n}장)${g ? ` · 갤러리 ${g}장도 바꿨어요` : ''}${drive ? '. 드라이브에도 새로 올려요' : ''}`)
  if (drive) void syncPhotosToDrive(undefined, false).catch(() => {})
}
