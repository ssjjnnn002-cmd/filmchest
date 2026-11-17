import type { FilmStock } from './films'
import type { FilmFormat } from './types'
import { boxFormatText, drawBox } from './filmBox'

// 필름 그림: 상자 정면 (filmBox.ts). 배경 투명. 이름은 예전 그대로(canister).

const cache = new Map<string, string>()

export function paintCanister(ctx: CanvasRenderingContext2D, stock: FilmStock, format: FilmFormat, size: number) {
  drawBox(ctx, stock, size, format)
}

export function canisterURL(stock: FilmStock, format: FilmFormat = '135', size = 360): string {
  const key = `${stock.id}|${stock.name}|${stock.iso}|${stock.style.body}|${boxFormatText(format)}|${size}`
  const hit = cache.get(key)
  if (hit) return hit
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  paintCanister(ctx, stock, format, size)
  const url = canvas.toDataURL('image/png')
  cache.set(key, url)
  return url
}

