// 필름 고르기 (웹 ui/FilmPicker.tsx와 같음): 필름 장착하기·필름 재고 추가가 같은 목록을 쓴다.
// 접혀 있을 땐 추천 6개를 가로로, '더보기'를 누르면 검색 + 정렬·묶기 칩(가로 스크롤) + 묶음별 바둑판
import { useMemo, useState, type ReactNode } from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import { Text } from './text'
import { Canister, Chip, Field, Group, OptionsModal, Row, Section } from './kit'
import { GroupTitle } from './gearExtras'
import { db } from './data'
import { getPref, setPref, useLiveQuery } from './store'
import { filmLotSortTitle, filmPickSections, filmStockGroupOf, filmStockGroups, groupTitle, type FilmLotSort, type FilmPickItem, type GearGroup } from './core/gearGroup'
import { allFilms, filmById, filmDisplayName, isDiscontinued, popularFilms, type FilmStock } from './core/films'
import { stockCount } from './core/filmStock'
import { filmFits } from './core/optics'
import { formatFamily, type FilmFormat } from './core/types'
import { useTheme } from './theme'

const sorts = Object.keys(filmLotSortTitle) as FilmLotSort[]

export function FilmPicker({ format, anyFormat, filmId, onPick, onAddCustom, onEditCustom, footer }: {
  /** 카메라·재고의 규격 (이 규격에 맞는 필름만) */
  format: FilmFormat
  /** 재고 추가처럼 규격을 같이 고를 땐 모든 규격의 필름을 보여 주고, 고른 칸의 규격을 넘긴다 */
  anyFormat?: boolean
  filmId?: string
  onPick: (id: string, format?: FilmFormat) => void
  onAddCustom: () => void
  onEditCustom: (id: string) => void
  /** 목록 아래 작은 설명 */
  footer?: ReactNode
}) {
  const c = useTheme()
  const lots = useLiveQuery(() => db.filmLots.toArray(), []) ?? []
  const rolls = useLiveQuery(() => db.rolls.orderBy('loadedAt').reverse().toArray(), []) ?? []
  const customRows = useLiveQuery(() => db.customFilms.toArray(), []) ?? []
  const [showAll, setShowAll] = useState(false)
  const [search, setSearch] = useState('')
  const [group, setGroup] = useState<GearGroup>(() => filmStockGroupOf(getPref('filmPickGroup', 'brand' as string)))
  const [by, setBy] = useState<FilmLotSort>(() => {
    const v = getPref('filmPickBy', 'name' as string) as FilmLotSort
    return sorts.includes(v) ? v : 'name'
  })
  const [desc, setDesc] = useState(() => getPref('filmPickDesc', '' as string) === '1')

  const stock = useMemo(() => {
    const m: Record<string, number> = {}
    for (const l of lots) m[l.filmId] = stockCount(lots, l.filmId)
    return m
  }, [lots])
  const used = useMemo(() => {
    const m: Record<string, number> = {}
    for (const r of rolls) if (!r.deletedAt) m[r.filmId] = (m[r.filmId] ?? 0) + 1
    return m
  }, [rolls])

  // 추천 순서: 재고 있는 필름 → 많이 쓴 순 → 최근 쓴 순 → 기록이 없으면 많이 쓰는 필름 순
  const stocks = useMemo(() => {
    const recent = rolls.map((r) => r.filmId)
    const at = (list: string[], id: string) => (list.indexOf(id) < 0 ? 1e9 : list.indexOf(id))
    const rank = (id: string) => [(stock[id] ?? 0) > 0 ? 0 : 1, -(used[id] ?? 0), at(recent, id), at(popularFilms, id)]
    return allFilms()
      .filter((f) => anyFormat || filmFits(f.formats, format))
      .filter((f) => !search || filmDisplayName(f).toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => { const ra = rank(a.id), rb = rank(b.id); return ra[0] - rb[0] || ra[1] - rb[1] || ra[2] - rb[2] || ra[3] - rb[3] })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rolls, format, anyFormat, search, customRows, stock, used])

  // 고른 필름은 규격·검색·순서와 상관없이 늘 보이게
  const picked = filmById(filmId)
  const visible = useMemo(() => {
    const has = (list: FilmStock[]) => !!picked && list.some((s) => s.id === picked.id)
    if (showAll) return picked && !has(stocks) ? [picked, ...stocks] : stocks
    const top = stocks.slice(0, 6)
    if (picked && !has(top)) { if (top.length < 6) top.push(picked); else top[5] = picked }
    return top
  }, [stocks, showAll, picked])
  const sections: { title?: string; items: FilmPickItem[] }[] = showAll ? filmPickSections(visible, group, by, desc, stock, used)
    : [{ title: undefined, items: visible.map((film) => ({ film })) }]
  const fmtOf = (x: FilmPickItem) => x.format ?? (filmFits(x.film.formats, format) ? format : x.film.formats[0])
  const isOn = (x: FilmPickItem) => x.film.id === filmId && formatFamily(fmtOf(x)).title === formatFamily(format).title
  const [sortOpen, setSortOpen] = useState(false)

  const [gridW, setGridW] = useState(0)
  const cols = Math.max(1, Math.floor((gridW - 20 + 8) / (100 + 8)))
  const cellW = !showAll ? 108 : gridW ? (gridW - 20 - 8 * (cols - 1)) / cols : 100
  const note = (f: FilmStock) => ((stock[f.id] ?? 0) > 0 ? `재고 ${stock[f.id]}롤` : isDiscontinued(f.id) ? '단종' : '')
  const cell = (x: FilmPickItem) => {
    const f = x.film
    const on = isOn(x)
    return (
      <Pressable key={`${f.id}|${x.format ?? ''}`} onPress={() => onPick(f.id, x.format ?? (filmFits(f.formats, format) ? undefined : f.formats[0]))} style={({ pressed }) => ({
        width: cellW, borderWidth: 2, borderColor: on ? c.safelight : 'transparent', backgroundColor: on ? c.soft : 'transparent',
        borderRadius: 10, padding: 3, alignItems: 'center', gap: 4, transform: [{ scale: pressed ? 0.975 : 1 }],
      })}>
        <Canister film={f} format={fmtOf(x)} cover />
        <Text numberOfLines={2} style={{ fontSize: 12, lineHeight: 15, minHeight: 30, textAlign: 'center', color: c.ink }}>{filmDisplayName(f)}</Text>
        <Text style={{ fontSize: 11, lineHeight: 14, minHeight: 14, color: c.muted, fontVariant: ['tabular-nums'] }}>{note(f)}</Text>
      </Pressable>
    )
  }
  const custom = (
    <Pressable onPress={onAddCustom} style={{ width: cellW, borderRadius: 10, padding: 3, alignItems: 'center', gap: 4 }}>
      <View style={{ width: '100%', aspectRatio: 1.6, borderRadius: 6, borderWidth: 1.5, borderStyle: 'dashed', borderColor: `${c.safelight}8C`, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 34, fontWeight: '300', color: c.safelight }}>+</Text>
      </View>
      <Text style={{ fontSize: 12, fontWeight: '600', color: c.safelight }}>직접 추가</Text>
    </Pressable>
  )

  return (
    <Section title={showAll ? '필름' : '필름 · 추천'}>
      <Group>
        {showAll ? (
          <>
            <Field label="필름 검색" value={search} onChangeText={setSearch} />
            {/* 정렬·묶기: 필름 재고 탭과 같은 기준, 가로로 넘겨 본다 (웹 .film-pick-bar) */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}
              contentContainerStyle={{ gap: 6, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 6, alignItems: 'center' }}>
              {filmStockGroups.map((g) => <Chip key={g} flat label={groupTitle[g]} active={group === g} onPress={() => { setGroup(g); setPref('filmPickGroup', g) }} />)}
              <View style={{ width: 1, alignSelf: 'stretch', marginVertical: 4, marginHorizontal: 4, backgroundColor: c.sep }} />
              <Chip flat label={desc ? '내림차순 ↓' : '오름차순 ↑'} onPress={() => { setDesc(!desc); setPref('filmPickDesc', desc ? '' : '1') }} />
              {/* 정렬 기준: 묶음 안에서 2순위 (눌러서 고른다) */}
              <Chip flat chevron label={`정렬 기준 · ${filmLotSortTitle[by]}`} onPress={() => setSortOpen(true)} />
            </ScrollView>
          </>
        ) : null}
        {showAll ? sections.map((sec, i, all) => (
          <View key={sec.title ?? i}>
            {sec.title ? <View style={{ marginTop: 10, marginHorizontal: 12 }}><GroupTitle>{`${sec.title} · ${sec.items.length}`}</GroupTitle></View> : null}
            <View onLayout={(e) => setGridW(e.nativeEvent.layout.width)} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 8, paddingHorizontal: 10 }}>
              {sec.items.map(cell)}
              {i === all.length - 1 ? custom : null}
            </View>
          </View>
        )) : (
          // 추천 6개는 가로로 넘겨 본다 (아래 칸이 바로 보이게)
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, padding: 10 }}>
            {visible.map((film) => cell({ film }))}
            {custom}
          </ScrollView>
        )}
        {picked?.id.startsWith('custom-') ? (
          <Row onPress={() => onEditCustom(picked.id)} style={{ justifyContent: 'center' }}>
            <Text style={{ fontSize: 17, color: c.safelight }}>{filmDisplayName(picked)} 수정</Text>
          </Row>
        ) : null}
        <Row onPress={() => { setShowAll(!showAll); setSearch('') }} style={{ justifyContent: 'center' }}>
          <Text style={{ fontSize: 17, color: c.safelight }}>{showAll ? '접기' : `더보기 (${stocks.length}종)`}</Text>
        </Row>
      </Group>
      {footer}
      {sortOpen ? (
        <OptionsModal title="정렬 기준" value={by} options={sorts.map((k) => [k, filmLotSortTitle[k]] as [FilmLotSort, string])}
          onPick={(k) => { setSortOpen(false); setBy(k); setPref('filmPickBy', k) }} onClose={() => setSortOpen(false)} />
      ) : null}
    </Section>
  )
}
