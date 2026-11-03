// 렌즈 필터 그림의 유리: 필터 종류(UV·ND·CPL…)를 고르면 그 모양. 기본은 UV. 웹·갤럭시·아이폰 같은 표.

export type GlassKind = 'clear' | 'nd' | 'polar' | 'blackMist' | 'whiteMist' | 'gnd' | 'star' | 'yellow' | 'orange' | 'red' | 'green' | 'blue'

export interface GlassLook {
  kind: GlassKind
  /** 유리 색 (#rrggbb) */
  color: string
  /** 유리 불투명도 0~1 (UV는 낮다) */
  alpha: number
  /** 뿌연 막 (미스트) 0~1 */
  haze: number
}

export const glassPresets: { kind: GlassKind; name: string; color: string; alpha: number; haze: number }[] = [
  { kind: 'clear', name: 'UV', color: '#c9d6e6', alpha: 0.16, haze: 0 },
  { kind: 'nd', name: 'ND', color: '#1d1d20', alpha: 0.82, haze: 0 },
  { kind: 'polar', name: 'CPL', color: '#4a4d55', alpha: 0.7, haze: 0 },
  { kind: 'blackMist', name: '블랙 미스트', color: '#2a2a2e', alpha: 0.62, haze: 0.28 },
  { kind: 'whiteMist', name: '화이트 미스트', color: '#e9ebef', alpha: 0.42, haze: 0.45 },
  { kind: 'gnd', name: 'GND', color: '#1d1d20', alpha: 0.8, haze: 0 },
  { kind: 'star', name: '스타', color: '#c9d6e6', alpha: 0.16, haze: 0 },
  { kind: 'yellow', name: 'Y2', color: '#f0be2c', alpha: 0.78, haze: 0 },
  { kind: 'orange', name: 'O2', color: '#ee7a22', alpha: 0.8, haze: 0 },
  { kind: 'red', name: 'R1', color: '#cf2f2a', alpha: 0.82, haze: 0 },
  { kind: 'green', name: 'X1', color: '#4f9a3c', alpha: 0.78, haze: 0 },
  { kind: 'blue', name: '80A', color: '#3a6fc6', alpha: 0.78, haze: 0 },
]

/** 그릴 모양. glass: 고른 값 (프리셋 이름 또는 #rrggbb). 고르지 않았으면 UV */
export function glassLook(_name: string, glass?: string): GlassLook {
  const preset = glassPresets.find((p) => p.kind === glass)
  if (preset) return { ...preset }
  if (glass && /^#[0-9a-f]{6}$/i.test(glass)) return { kind: 'clear', color: glass, alpha: 0.72, haze: 0 }
  return { ...glassPresets[0] }
}

/** 유형이 필터인 액세서리만 링 그림 (그립·스트랩 등은 그대로) */
export const isLensFilter = (kind?: string) => !kind?.trim() || kind.trim() === '필터'
