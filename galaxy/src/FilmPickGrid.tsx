// 필름 고르기 바둑판 (웹 .film-grid · .film-pick과 같음): 칸 너비는 화면에 맞추고, 고른 칸은 주황 테두리,
// 묶어 보면 묶음마다 제목, 마지막에 점선 '직접 추가'. 필름 장착·필름 재고 추가가 같이 쓴다
import { useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import { Text } from './text'
import { Canister } from './kit'
import { GroupTitle } from './gearExtras'
import { filmSections, type GearGroup } from './core/gearGroup'
import { filmDisplayName, type FilmStock } from './core/films'
import type { FilmFormat } from './core/types'
import { useTheme } from './theme'

export function FilmPickGrid({ films, value, onPick, format, sort = 'none', note, onCustom, scroll }: {
  films: FilmStock[]; value?: string; onPick: (id: string) => void; format?: FilmFormat; sort?: GearGroup
  /** 추천 6개처럼 한 줄로 가로로 넘겨 보기 (아래 칸이 바로 보이게, 웹 .film-grid.scroll) */
  scroll?: boolean
  /** 칸 아래 작은 글씨 (예: 재고 2롤) */
  note?: (f: FilmStock) => string
  onCustom: () => void
}) {
  const c = useTheme()
  const [gridW, setGridW] = useState(0)
  const cols = Math.max(1, Math.floor((gridW - 20 + 6) / (96 + 6)))
  const cellW = scroll ? 96 : gridW ? (gridW - 20 - 6 * (cols - 1)) / cols : 96
  const custom = (
    <Pressable onPress={onCustom} style={{ width: cellW, borderRadius: 16, paddingVertical: 6, paddingHorizontal: 4, alignItems: 'center', gap: 2 }}>
      <View style={{ width: 84, height: 84, borderRadius: 18, borderWidth: 1.5, borderStyle: 'dashed', borderColor: `${c.safelight}8C`, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 34, fontWeight: '300', color: c.safelight }}>+</Text>
      </View>
      <Text style={{ fontSize: 12, fontWeight: '600', color: c.safelight }}>직접 추가</Text>
    </Pressable>
  )
  if (scroll) {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, padding: 10 }}>
        {films.map((f) => cell(f))}
        {custom}
      </ScrollView>
    )
  }
  function cell(f: FilmStock) {
    const on = f.id === value
    return (
      <Pressable key={f.id} onPress={() => onPick(f.id)} style={({ pressed }) => ({
        width: cellW, borderWidth: 2, borderColor: on ? c.safelight : 'transparent', backgroundColor: on ? c.soft : 'transparent',
        borderRadius: 16, paddingVertical: 6, paddingHorizontal: 4, alignItems: 'center', gap: 2, transform: [{ scale: pressed ? 0.975 : 1 }],
      })}>
        <Canister film={f} format={format} size={84} />
        <Text style={{ fontSize: 12, lineHeight: 15, textAlign: 'center', color: c.ink }}>{filmDisplayName(f)}</Text>
        {note ? <Text style={{ fontSize: 11, lineHeight: 14, minHeight: 14, color: c.muted, fontVariant: ['tabular-nums'] }}>{note(f)}</Text> : null}
      </Pressable>
    )
  }
  return (
    <>
      {filmSections(films, sort).map((sec, i, all) => (
        <View key={sec.title ?? i}>
          {sec.title ? <View style={{ marginTop: 10, marginHorizontal: 12 }}><GroupTitle>{`${sec.title} · ${sec.items.length}`}</GroupTitle></View> : null}
          <View onLayout={(e) => setGridW(e.nativeEvent.layout.width)} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, padding: 10 }}>
            {sec.items.map((f) => {
              const on = f.id === value
              return (
                <Pressable key={f.id} onPress={() => onPick(f.id)} style={({ pressed }) => ({
                  width: cellW, borderWidth: 2, borderColor: on ? c.safelight : 'transparent', backgroundColor: on ? c.soft : 'transparent',
                  borderRadius: 16, paddingVertical: 6, paddingHorizontal: 4, alignItems: 'center', gap: 2, transform: [{ scale: pressed ? 0.975 : 1 }],
                })}>
                  <Canister film={f} format={format} size={84} />
                  <Text style={{ fontSize: 12, lineHeight: 15, textAlign: 'center', color: c.ink }}>{filmDisplayName(f)}</Text>
                  {note ? <Text style={{ fontSize: 11, lineHeight: 14, minHeight: 14, color: c.muted, fontVariant: ['tabular-nums'] }}>{note(f)}</Text> : null}
                </Pressable>
              )
            })}
            {i === all.length - 1 ? (
              <Pressable onPress={onCustom} style={{ width: cellW, borderRadius: 16, paddingVertical: 6, paddingHorizontal: 4, alignItems: 'center', gap: 2 }}>
                <View style={{ width: 84, height: 84, borderRadius: 18, borderWidth: 1.5, borderStyle: 'dashed', borderColor: `${c.safelight}8C`, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 34, fontWeight: '300', color: c.safelight }}>+</Text>
                </View>
                <Text style={{ fontSize: 12, fontWeight: '600', color: c.safelight }}>직접 추가</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ))}
    </>
  )
}
