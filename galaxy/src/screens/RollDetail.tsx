// 웹 pages/RollDetail.tsx
import { useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import { db, deleteRoll } from '../data'
import { useLiveQuery } from '../store'
import { useNav } from '../App'
import { weatherText, type FilmFormat, type LocationSegment, type Roll, type ShootingDay } from '../core/types'
import { exposureText, meterProgress, meterShotMeta, meterShotsByOrder } from '../core/meter'
import { bytesText, cameraName, dateRangeText, fmtDay, fmtDayTime, resolutionText, rollCameraFormat, rollFilm, rollFilmName, rollTitle, sortedDays, sortedLocations } from '../core/display'
import { Btn, Canister, Group, Progress, Row, RowText, Section, Segmented, StatusBadge, Sub } from '../kit'
import { Icon } from '../icons'
import { Page } from '../page'
import { Confirm } from '../overlay'
import { RollGalleryButton } from '../GallerySave'
import { useTheme } from '../theme'
import { DayEdit, LabDropOff, LensChangeEdit, PlaceEdit } from './Editors'
import { RollProjects } from './Projects'
import { TagField } from '../gearExtras'
import { FramePrint } from './FramePrint'
import { ContactSheetView, FilmStrip, FrameViewer } from './RollViewers'
import { ScanButton } from './Pending'
import { features } from '../core/features'

export function RollDetail({ id }: { id: string }) {
  const c = useTheme()
  const nav = useNav()
  const roll = useLiveQuery(() => db.rolls.get(id), [id])
  const frames = useLiveQuery(() => db.frames.where('rollId').equals(id).sortBy('index'), [id]) ?? []
  const camera = useLiveQuery(() => (roll?.cameraId ? db.cameras.get(roll.cameraId) : undefined), [roll?.cameraId])
  const lens = useLiveQuery(() => (roll?.lensId ? db.lenses.get(roll.lensId) : undefined), [roll?.lensId])
  const allLenses = useLiveQuery(() => db.lenses.toArray(), []) ?? []
  const lensName = (lid?: string) => { const l = allLenses.find((x) => x.id === lid); return l ? `${l.brand} ${l.model}` : '렌즈 모름' }
  const [lensEdit, setLensEdit] = useState<'first' | 'new' | { id: string; startFrame: number; lensId: string } | null>(null)
  const [day, setDay] = useState<ShootingDay | 'new' | null>(null)
  const [place, setPlace] = useState<LocationSegment | 'new' | null>(null)
  const [dropOff, setDropOff] = useState(false)
  const [viewing, setViewing] = useState<number | null>(null)
  const [sheet, setSheet] = useState(false)
  const [framePrint, setFramePrint] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [tab, setTab] = useState<'log' | 'meter' | null>(null)

  if (!roll) return <Page title="" onBack={nav.pop} large={false}><View /></Page>
  const view = tab ?? 'log'
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
    <Page title={rollFilmName(roll)} onBack={nav.pop}
      actions={
        <View style={{ height: 44, borderRadius: 22, paddingHorizontal: 4, flexDirection: 'row', backgroundColor: c.glass, borderWidth: 0.5, borderColor: c.glassLine, elevation: 3 }}>
          <Pressable accessibilityLabel={roll.favorite ? '즐겨찾기 해제' : '즐겨찾기'} onPress={() => db.rolls.update(id, { favorite: !roll.favorite })}
            style={({ pressed }) => ({ width: 48, height: 44, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
            <Svg width={23} height={23} viewBox="0 0 24 24">
              <Path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" fill={roll.favorite ? '#f5b700' : 'none'}
                stroke={roll.favorite ? '#f5b700' : c.ink} strokeWidth={1.8} strokeLinejoin="round" />
            </Svg>
          </Pressable>
          <Pressable accessibilityLabel="롤 삭제" onPress={() => setConfirm(true)}
            style={({ pressed }) => ({ width: 48, height: 44, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
            <Icon name="trash" size={23} color={c.safelight} />
          </Pressable>
        </View>
      }>

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

      {features.meter ? (
        <View style={{ marginTop: 8, marginBottom: 4 }}>
          <Segmented value={view} options={[['log', '기록'], ['meter', '노출']]} onChange={setTab} />
        </View>
      ) : null}

      {view === 'meter' ? <MeterPanel roll={roll} format={rollCameraFormat(camera, roll)} /> : null}

      {view === 'log' && roll.status === 'imported' && frames.length > 0 ? (
        <Section foot="갤러리에 저장을 누르면 사진 앱에 바로 들어가요.">
          <FilmStrip roll={roll} frames={frames} onSelect={setViewing} />
          <View style={{ gap: 10 }}>
            <Btn label="밀착 인화지로 보기" icon="sheet" kind="soft" onPress={() => setSheet(true)} />
            <Btn label="프레임 만들기" icon="photos" kind="soft" onPress={() => setFramePrint(true)} />
            <RollGalleryButton rollId={roll.id} title={rollTitle(roll, camera)} onToast={nav.toast} block />
          </View>
        </Section>
      ) : null}

      {view === 'log' ? <>
      <Section title="촬영일" foot={roll.days.length > 0 ? '눌러서 수정하거나 삭제할 수 있어요.' : undefined}>
        <Group>
          {sortedDays(roll).map((d) => (
            <Row key={d.id} onPress={() => setDay(d)} value={d.startFrame ? `${d.startFrame}번부터` : '컷 미확인'}>
              <RowText>{fmtDayTime(d.startedAt)}</RowText>
            </Row>
          ))}
          {roll.isArchive && roll.days.length === 0 ? <Row static><Sub>알 수 없음 (원본 날짜 유지)</Sub></Row> : null}
          {accentRow('plus', '촬영일 추가', () => setDay('new'))}
        </Group>
      </Section>

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

      <Section title="장소" warn foot={locs.some((l) => !l.point) ? '주황색 장소는 좌표가 없어 사진에 위치가 기록되지 않아요. 눌러서 좌표를 넣어 주세요.' : undefined}>
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
      </Section>

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

      <Section>
        <View style={{ gap: 10 }}>
          {roll.status === 'loaded' ? <Btn label="촬영 끝내기" kind="primary" size="stack" block onPress={() => setDropOff(true)} /> : null}
          {roll.status === 'finished' ? <>
            <Btn label="현상 맡기기" kind="soft" size="stack" block onPress={() => setDropOff(true)} />
            <Btn label="다시 촬영 중으로" size="stack" block onPress={() => db.rolls.update(id, { status: 'loaded' })} />
          </> : null}
          {roll.status === 'atLab' ? <ScanButton rollId={id} big /> : null}
          {roll.status === 'imported' ? <ScanButton rollId={id} label="다시 불러오기" big /> : null}
        </View>
      </Section>

      <RollProjects roll={roll} />
      <TagField tags={roll.tags ?? []} setTags={(tags) => db.rolls.update(id, { tags })} />

      <Section title="메모">
        <Group>
          <View style={{ paddingVertical: 8, paddingHorizontal: 18 }}>
            <TextInput multiline accessibilityLabel="메모" defaultValue={roll.note ?? ''} placeholderTextColor={c.faint}
              style={{ minHeight: 64, fontSize: 17, lineHeight: 23, color: c.ink, textAlignVertical: 'top', paddingVertical: 3 }}
              onEndEditing={(e) => db.rolls.update(id, { note: e.nativeEvent.text.trim() || undefined })} />
          </View>
        </Group>
      </Section>
      </> : null}

      {day ? <DayEdit roll={roll} day={day === 'new' ? undefined : day} onClose={() => setDay(null)} /> : null}
      {place ? <PlaceEdit roll={roll} segment={place === 'new' ? undefined : place} onClose={() => setPlace(null)} /> : null}
      {dropOff ? <LabDropOff roll={roll} onClose={() => setDropOff(false)} /> : null}
      {viewing !== null ? <FrameViewer frames={frames} start={viewing} onClose={() => setViewing(null)} /> : null}
      {framePrint ? <FramePrint roll={roll} frames={frames} onClose={() => setFramePrint(false)} /> : null}
      {sheet ? <ContactSheetView roll={roll} frames={frames} onClose={() => setSheet(false)} /> : null}
      {confirm ? (
        <Confirm message="이 롤 기록을 삭제할까요? 24시간 안에는 설정에서 되돌릴 수 있어요. 사진 앱에 저장한 사진은 그대로 남아요." onCancel={() => setConfirm(false)}
          onConfirm={async () => { setConfirm(false); await deleteRoll(id); nav.pop() }} />
      ) : null}
      {lensEdit && camera?.mount ? (
        <LensChangeEdit roll={roll} mount={camera.mount} brand={camera.brand}
          change={lensEdit === 'new' ? undefined : lensEdit} onClose={() => setLensEdit(null)} />
      ) : null}
    </Page>
  )
}

function MeterPanel({ roll, format }: { roll: Roll; format: FilmFormat }) {
  const c = useTheme()
  const shots = meterShotsByOrder(roll.meterShots)
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
          {shots.length === 0 ? <Row static><Sub>아직 기록한 컷이 없어요. 노출계에서 찍으면 여기에 쌓여요.</Sub></Row> : null}
          {shots.map((s) => (
            <Row key={s.pos} static value={exposureText(s)}>
              <RowText sub={meterShotMeta(s, prewind)}>{s.order}번째</RowText>
            </Row>
          ))}
        </Group>
      </Section>
    </>
  )
}
