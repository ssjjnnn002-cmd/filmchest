/** 렌즈 이름에서 화각과 최대개방을 읽는다. */
export interface ParsedLens {
  zoom: boolean
  focalMin: number
  focalMax: number
  open: string
  close: string
}

export function parseLens(name: string): ParsedLens {
  const text = name.replace(/[–—~]/g, '-')
  const value: ParsedLens = { zoom: false, focalMin: 0, focalMax: 0, open: '', close: '' }
  const range = text.match(/(\d+)\s*-\s*(\d+)\s*mm/i)
  const single = text.match(/(\d+)\s*mm/i)
  if (range) {
    const a = Number(range[1])
    const b = Number(range[2])
    value.focalMin = Math.min(a, b)
    value.focalMax = Math.max(a, b)
    value.zoom = value.focalMax > value.focalMin
  } else if (single) {
    value.focalMin = Number(single[1])
    value.focalMax = value.focalMin
  }
  const aperture = text.match(/f\s*\/?\s*(\d+(?:\.\d+)?)(?:\s*-\s*(\d+(?:\.\d+)?))?/i)
  if (aperture) {
    const first = Number(aperture[1])
    const second = aperture[2] ? Number(aperture[2]) : 0
    if (aperture[2] && second >= 11 && second > first) {
      value.open = aperture[1]
      value.close = aperture[2]
    } else if (aperture[2]) value.open = `${aperture[1]}–${aperture[2]}`
    else value.open = aperture[1]
  }
  if (/zoom/i.test(text)) value.zoom = true
  return value
}

export function lensSpec(lens: {
  model: string
  zoom?: boolean
  focalMin?: number
  focalMax?: number
  apertureOpen?: string
  apertureClose?: string
}): string {
  const parsed = parseLens(lens.model)
  const focalMin = lens.focalMin || parsed.focalMin
  const focalMax = lens.focalMax || (focalMin ? parsed.focalMax || focalMin : 0)
  const zoom = !!(lens.zoom || parsed.zoom || (focalMax > focalMin && focalMin > 0))
  const open = lens.apertureOpen || parsed.open
  const close = lens.apertureClose || parsed.close
  if (!focalMin && !zoom && !open && !close) return ''
  const parts: string[] = []
  if (focalMin || zoom) parts.push(zoom ? '줌렌즈' : '단렌즈')
  if (focalMin) parts.push(zoom && focalMax > focalMin ? `${focalMin}–${focalMax}mm` : `${focalMin}mm`)
  const stops = [open ? `최대 f/${open}` : '', close ? `최소 f/${close}` : ''].filter(Boolean)
  if (stops.length) parts.push(stops.join(' '))
  return parts.join(' · ')
}

/** 숫자만 쉼표로 묶는다. 글자가 섞인 예전 메모는 그대로 둔다. */
export function groupPrice(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''
  if (![...trimmed].every((ch) => ch === ',' || (ch >= '0' && ch <= '9'))) return raw
  const digits = trimmed.replace(/\D/g, '').replace(/^0+(?=\d)/, '')
  if (!digits) return ''
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

export const filterKinds = ['UV', 'CPL', 'ND2', 'ND4', 'ND8', 'ND16', 'Yellow', 'Orange', 'Red', 'Green', 'Soft',
  'Black Pro-Mist 1/8', 'Black Pro-Mist 1/4', 'Black Pro-Mist 1/2']
export const filterDiameters = ['37', '39', '40.5', '43', '46', '49', '52', '55', '58', '62', '67', '72', '77', '82']

export function filmFits(formats: string[], format: string) {
  if (format === '135-half') return formats.includes('135')
  const roll120 = format.startsWith('120')
  return formats.some((item) => item.startsWith('120') === roll120)
}
