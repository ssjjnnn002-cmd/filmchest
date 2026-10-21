// 웹 pages/CameraDetail.tsx
import { useState } from 'react'
import { Image, Pressable, Text, View } from 'react-native'
import { db, deleteCamera, kept } from '../data'
import { useLiveQuery } from '../store'
import { useNav } from '../App'
import type { Camera, Lens } from '../core/types'
import { lensSpec } from '../core/optics'
import { formatInfo, priceText, priceValue, uid } from '../core/types'
import { OptionalDate, TagChips } from '../gearExtras'
import { profileFor } from '../core/profiles'
import { lensesFor } from '../core/lenses'
import { fmtDay, rollFilmName } from '../core/display'
import { Model3D } from '../Model3D'
import { useCameraPhoto } from '../files'
import { CameraCover, Field, Footnote, Group, Row, RowText, Section, Sub } from '../kit'
import { Icon } from '../icons'
import { GlassBtn, Page } from '../page'
import { Confirm, Menu, Sheet, SheetBtn } from '../overlay'
import { RollRow } from '../RollRow'
import { useTheme } from '../theme'
import { CameraEdit } from './CameraEdit'
import { batteryDue } from './Library'

export function CameraDetail({ id }: { id: string }) {
  const c = useTheme()
  const nav = useNav()
  const camera = useLiveQuery(() => db.cameras.get(id), [id])
  const rolls = useLiveQuery(async () => (await db.rolls.where('cameraId').equals(id).reverse().sortBy('loadedAt')).filter(kept), [id]) ?? []
  const allLenses = useLiveQuery(() => db.lenses.orderBy('createdAt').toArray(), []) ?? []
  const photo = useCameraPhoto(id, !!(camera?.hasPhoto || camera?.photo))
  const [editing, setEditing] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [lensEdit, setLensEdit] = useState<Lens | 'pick' | null>(null)
  const [menu, setMenu] = useState(false)

  if (!camera) return <Page title="" onBack={nav.pop} large={false}><View /></Page>
  const lenses = lensesOnCamera(camera, allLenses)
  const loaded = rolls.find((r) => r.status === 'loaded')
  const history = rolls.filter((r) => r.status !== 'loaded')
  const noBattery = (camera.battery ?? '').startsWith('필요 없음')
  const stats = Object.entries(rolls.reduce<Record<string, number>>((m, r) => {
    const n = rollFilmName(r); m[n] = (m[n] ?? 0) + 1; return m
  }, {})).sort((a, b) => b[1] - a[1])

  return (
    <Page title={camera.model} onBack={nav.pop}
      actions={<GlassBtn icon="more" label="더 보기" onPress={() => setMenu(true)} />}>

      <View style={{ alignItems: 'center', gap: 4, marginBottom: 8 }}>
        {photo
          ? <CameraCover camera={camera} height={240} />
          : <View style={{ width: '100%' }}><Model3D profile={profileFor(camera.brand, camera.model, camera.style)} color="#1C1C1E" height={260} /></View>}
        <Text style={{ fontSize: 24, fontWeight: '700', marginTop: 4, color: c.ink, textAlign: 'center' }}>{camera.brand} {camera.model}</Text>
        <Sub>{[formatInfo[camera.format].name, camera.mount ? `${camera.mount} 마운트` : camera.fixedLens].filter(Boolean).join(' · ')}</Sub>
      </View>

      <Section title="배터리" foot={batteryDue(camera) ? '교체한 지 1년이 넘었어요. 노출계가 정확하지 않을 수 있어요.' : undefined} warn>
        <Group>
          {noBattery ? (
            <Row static value={camera.battery}><RowText>배터리</RowText></Row>
          ) : [
            <Row key="kind" static value={camera.battery ?? '모름'}><RowText>종류</RowText></Row>,
            <OptionalDate key="at" label="마지막 교체" value={camera.batteryAt} max={Date.now()}
              onChange={(v) => db.cameras.update(id, { batteryAt: v })} />,
            <Row key="now" onPress={() => db.cameras.update(id, { batteryAt: Date.now() })}>
              <Icon name="battery" size={20} color={c.safelight} /><RowText color={c.safelight}>오늘 교체함</RowText>
            </Row>,
          ]}
        </Group>
      </Section>

      {camera.tags?.length ? <Section title="태그"><TagChips tags={camera.tags} /></Section> : null}

      {priceValue(camera.price) > 0 || camera.accessories?.length ? (
        <Section title="쓴 금액">
          <Group>
            {priceValue(camera.price) > 0 ? <Row static value={priceText(priceValue(camera.price))}><RowText>본체</RowText></Row> : null}
            {(camera.accessories ?? []).map((a) => (
              <Row key={a.id} static value={a.price ? priceText(priceValue(a.price)) : '-'}><RowText>{a.name}</RowText></Row>
            ))}
            <Row static>
              <Text style={{ flex: 1, fontSize: 17, fontWeight: '700', color: c.ink }}>합계</Text>
              <Text style={{ fontSize: 17, fontWeight: '700', color: c.ink }}>{priceText(priceValue(camera.price) + (camera.accessories ?? []).reduce((n, a) => n + priceValue(a.price), 0))}</Text>
            </Row>
          </Group>
        </Section>
      ) : null}

      <Section title="장착된 필름">
        <Group>
          {loaded
            ? <Row onPress={() => nav.push({ type: 'roll', id: loaded.id })} chev><RollRow roll={loaded} /></Row>
            : <Row onPress={() => nav.loadFilm(camera.id)}><Icon name="film" size={20} color={c.safelight} /><RowText color={c.safelight}>필름 장착하기</RowText></Row>}
        </Group>
      </Section>

      {camera.mount ? (
        <Section title={`렌즈 · ${camera.mount}`} foot="렌즈 탭에 등록한 렌즈를 불러와요. 여기서 빼도 렌즈 탭의 등록은 남아요.">
          <Group>
            {lenses.map((l) => (
              <Row key={l.id} onPress={() => setLensEdit(l)}
                value={`${rolls.filter((r) => r.lensId === l.id || r.lensChanges?.some((ch) => ch.lensId === l.id)).length}롤`}>
                <RowText>{l.brand} {l.model}</RowText>
                <Pressable onPress={() => detachLens(camera, l, lenses)} hitSlop={8}><Text style={{ color: c.muted }}>빼기</Text></Pressable>
              </Row>
            ))}
            <Row onPress={() => setLensEdit('pick')}><Icon name="plus" size={20} color={c.safelight} /><RowText color={c.safelight}>렌즈 추가</RowText></Row>
          </Group>
        </Section>
      ) : null}

      <Section title={`필름 기록 · ${history.length}롤`}>
        <Group>
          {history.length === 0 ? <Row static><Sub>아직 기록이 없어요</Sub></Row> : null}
          {history.map((r) => (
            <Row key={r.id} onPress={() => nav.push({ type: 'roll', id: r.id })} chev><RollRow roll={r} /></Row>
          ))}
        </Group>
      </Section>

      {stats.length > 0 ? (
        <Section title="자주 쓴 필름">
          <Group>
            {stats.map(([name, n]) => <Row key={name} static value={`${n}롤`}><RowText>{name}</RowText></Row>)}
          </Group>
        </Section>
      ) : null}

      {menu ? <Menu onClose={() => setMenu(false)} items={[
        { label: '수정', onPress: () => setEditing(true) },
        { label: '삭제', danger: true, onPress: () => setConfirm(true) },
      ]} /> : null}
      {editing ? <CameraEdit camera={camera} onClose={() => setEditing(false)} /> : null}
      {lensEdit === 'pick' ? <LensPick camera={camera} lenses={allLenses} attached={lenses} onClose={() => setLensEdit(null)} /> : null}
      {lensEdit && lensEdit !== 'pick' ? <LensEdit lens={lensEdit} mount={camera.mount!} brand={camera.brand} onClose={() => setLensEdit(null)} /> : null}
      {confirm ? (
        <Confirm message="이 카메라를 삭제할까요? 필름에 적힌 카메라 정보는 남고, 24시간 안에는 설정에서 되돌릴 수 있어요." onCancel={() => setConfirm(false)}
          onConfirm={async () => { setConfirm(false); await deleteCamera(id); nav.pop() }} />
      ) : null}
    </Page>
  )
}

function lensesOnCamera(camera: Camera, lenses: Lens[]) {
  if (camera.lensesChosen) {
    const byId = new Map(lenses.map((lens) => [lens.id, lens]))
    return (camera.lensIds ?? []).map((id) => byId.get(id)).filter((lens): lens is Lens => !!lens)
  }
  return camera.mount ? lenses.filter((lens) => lens.mount.toLowerCase() === camera.mount!.toLowerCase()) : []
}

async function chooseLenses(camera: Camera, ids: string[]) {
  await db.cameras.update(camera.id, { lensesChosen: true, lensIds: ids })
}

async function detachLens(camera: Camera, lens: Lens, shown: Lens[]) {
  const ids = camera.lensesChosen ? (camera.lensIds ?? []) : shown.map((item) => item.id)
  await chooseLenses(camera, ids.filter((id) => id !== lens.id))
}

function LensPick({ camera, lenses, attached, onClose }: { camera: Camera; lenses: Lens[]; attached: Lens[]; onClose: () => void }) {
  const c = useTheme()
  const taken = new Set(attached.map((lens) => lens.id))
  const rest = lenses.filter((lens) => !taken.has(lens.id))
  const same = rest.filter((lens) => camera.mount && lens.mount.toLowerCase() === camera.mount.toLowerCase())
  const other = rest.filter((lens) => !same.includes(lens))
  const row = (lens: Lens) => (
    <Row key={lens.id} onPress={async () => {
      const ids = camera.lensesChosen ? (camera.lensIds ?? []) : attached.map((item) => item.id)
      await chooseLenses(camera, [...ids, lens.id])
      onClose()
    }}>
      <RowText>{lens.brand} {lens.model}</RowText>
      <Text style={{ color: c.muted }}>{lensSpec(lens)}</Text>
    </Row>
  )
  return (
    <Sheet title="렌즈 불러오기" onClose={onClose}>
      {rest.length === 0 ? <Text style={{ color: c.muted, padding: 18 }}>{lenses.length ? '이미 이 카메라에 다 있어요.' : '렌즈 탭에서 먼저 등록해 주세요.'}</Text> : (
        <>
          {same.length > 0 ? <Section title="같은 마운트"><Group>{same.map(row)}</Group></Section> : null}
          {other.length > 0 ? <Section title="다른 마운트"><Group>{other.map(row)}</Group></Section> : null}
        </>
      )}
    </Sheet>
  )
}

export function LensEdit({ lens, mount, brand, onClose }: { lens?: Lens; mount: string; brand: string; onClose: () => void }) {
  const c = useTheme()
  const [lensBrand, setLensBrand] = useState(lens?.brand ?? brand)
  const [model, setModel] = useState(lens?.model ?? '')
  const [confirm, setConfirm] = useState(false)
  const suggestions = lensesFor(mount, model).filter((l) => l !== model).slice(0, 8)
  const save = async () => {
    await db.lenses.put({ id: lens?.id ?? uid(), brand: lensBrand.trim(), model: model.trim(), mount, createdAt: lens?.createdAt ?? Date.now() })
    onClose()
  }
  return (
    <Sheet title={lens ? '렌즈 수정' : '렌즈 추가'} onClose={onClose}
      right={<SheetBtn label="저장" accent disabled={!model.trim()} onPress={save} />}>
      <Section title={`렌즈 · ${mount}`} foot={suggestions.length > 0 ? `${mount} 마운트에서 자주 쓰는 렌즈예요.` : undefined}>
        <Group>
          <Field label="제조사" value={lensBrand} onChangeText={setLensBrand} />
          <Field label="렌즈" value={model} onChangeText={setModel} autoCorrect={false} />
          {suggestions.map((s) => (
            <Row key={s} onPress={() => setModel(s)}><RowText>{s}</RowText><Sub>↖</Sub></Row>
          ))}
        </Group>
      </Section>
      {lens ? (
        <Group><Row onPress={() => setConfirm(true)}><Icon name="trash" size={20} color="#c0392b" /><RowText color="#c0392b">렌즈 삭제</RowText></Row></Group>
      ) : null}
      {confirm && lens ? (
        <Confirm message="이 렌즈를 삭제할까요? 이 렌즈로 찍은 롤 기록은 남아요." onCancel={() => setConfirm(false)}
          onConfirm={async () => { setConfirm(false); await db.lenses.delete(lens.id); onClose() }} />
      ) : null}
    </Sheet>
  )
}
