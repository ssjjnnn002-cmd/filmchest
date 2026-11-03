// 자동 생성 파일 — 직접 고치지 말고 catalog/lensSpecs.mjs를 고친 뒤 `node catalog/generate.mjs` 실행
import { parseLens } from './optics'

export interface LensSpec {
  /** 마운트 면에서 앞테까지, mm */
  lengthMm: number
  /** 경통 바깥 지름, mm */
  diameterMm: number
  /** 필터 나사, mm */
  frontMm: number
  finish: 'black' | 'silver' | 'chrome-nose'
  focusRing: 'rubber-grid' | 'rubber-ribbed' | 'metal-scalloped' | 'metal-knurled' | 'thin-af'
  apertureRing: boolean
  hood: 'none' | 'built-in' | 'round' | 'petal'
  zoom: boolean
  /** 거리계 렌즈의 초점 손잡이 */
  focusTab?: boolean
}

const table: Record<string, LensSpec> = {
  "Nikkor-S Auto 50mm f/1.4": {
    "lengthMm": 48,
    "diameterMm": 63,
    "frontMm": 52,
    "finish": "silver",
    "focusRing": "metal-scalloped",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "Nikkor-H Auto 50mm f/2": {
    "lengthMm": 38,
    "diameterMm": 62,
    "frontMm": 52,
    "finish": "silver",
    "focusRing": "metal-scalloped",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "Nikkor 50mm f/1.4 AI-S": {
    "lengthMm": 49,
    "diameterMm": 63,
    "frontMm": 52,
    "finish": "black",
    "focusRing": "rubber-grid",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "Nikkor 50mm f/1.8 AI-S": {
    "lengthMm": 36,
    "diameterMm": 63,
    "frontMm": 52,
    "finish": "black",
    "focusRing": "rubber-grid",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "Nikkor 50mm f/2 AI": {
    "lengthMm": 40,
    "diameterMm": 64,
    "frontMm": 52,
    "finish": "black",
    "focusRing": "rubber-ribbed",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "Nikkor 55mm f/1.2 AI": {
    "lengthMm": 58,
    "diameterMm": 74,
    "frontMm": 52,
    "finish": "black",
    "focusRing": "rubber-ribbed",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "Noct-Nikkor 58mm f/1.2 AI-S": {
    "lengthMm": 63,
    "diameterMm": 74,
    "frontMm": 52,
    "finish": "black",
    "focusRing": "rubber-grid",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "Nikkor 35mm f/1.4 AI-S": {
    "lengthMm": 68,
    "diameterMm": 68,
    "frontMm": 52,
    "finish": "black",
    "focusRing": "rubber-grid",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "Nikkor 35mm f/2 AI-S": {
    "lengthMm": 53,
    "diameterMm": 63,
    "frontMm": 52,
    "finish": "black",
    "focusRing": "rubber-grid",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "Nikkor 28mm f/2.8 AI-S": {
    "lengthMm": 46,
    "diameterMm": 63,
    "frontMm": 52,
    "finish": "black",
    "focusRing": "rubber-grid",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "Nikkor 28mm f/2 AI-S": {
    "lengthMm": 58,
    "diameterMm": 63,
    "frontMm": 52,
    "finish": "black",
    "focusRing": "rubber-grid",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "Nikkor 24mm f/2.8 AI-S": {
    "lengthMm": 48,
    "diameterMm": 63,
    "frontMm": 52,
    "finish": "black",
    "focusRing": "rubber-grid",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "Nikkor 24mm f/2 AI-S": {
    "lengthMm": 61,
    "diameterMm": 63,
    "frontMm": 52,
    "finish": "black",
    "focusRing": "rubber-grid",
    "apertureRing": true,
    "hood": "built-in",
    "zoom": false
  },
  "Nikkor 20mm f/3.5 AI": {
    "lengthMm": 50,
    "diameterMm": 63,
    "frontMm": 52,
    "finish": "black",
    "focusRing": "rubber-ribbed",
    "apertureRing": true,
    "hood": "built-in",
    "zoom": false
  },
  "Nikkor 20mm f/2.8 AI-S": {
    "lengthMm": 54,
    "diameterMm": 65,
    "frontMm": 62,
    "finish": "black",
    "focusRing": "rubber-grid",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "Nikkor 85mm f/1.4 AI-S": {
    "lengthMm": 72,
    "diameterMm": 80,
    "frontMm": 72,
    "finish": "black",
    "focusRing": "rubber-grid",
    "apertureRing": true,
    "hood": "round",
    "zoom": false
  },
  "Nikkor 85mm f/2 AI-S": {
    "lengthMm": 61,
    "diameterMm": 64,
    "frontMm": 52,
    "finish": "black",
    "focusRing": "rubber-grid",
    "apertureRing": true,
    "hood": "round",
    "zoom": false
  },
  "Nikkor 85mm f/1.8": {
    "lengthMm": 70,
    "diameterMm": 72,
    "frontMm": 52,
    "finish": "black",
    "focusRing": "rubber-ribbed",
    "apertureRing": true,
    "hood": "round",
    "zoom": false
  },
  "Nikkor 105mm f/2.5 AI-S": {
    "lengthMm": 78,
    "diameterMm": 66,
    "frontMm": 52,
    "finish": "black",
    "focusRing": "rubber-grid",
    "apertureRing": true,
    "hood": "round",
    "zoom": false
  },
  "Nikkor 105mm f/1.8 AI-S": {
    "lengthMm": 106,
    "diameterMm": 79,
    "frontMm": 62,
    "finish": "black",
    "focusRing": "rubber-grid",
    "apertureRing": true,
    "hood": "round",
    "zoom": false
  },
  "Nikkor 135mm f/2.8 AI-S": {
    "lengthMm": 91,
    "diameterMm": 65,
    "frontMm": 52,
    "finish": "black",
    "focusRing": "rubber-grid",
    "apertureRing": true,
    "hood": "round",
    "zoom": false
  },
  "Nikkor 180mm f/2.8 ED AI-S": {
    "lengthMm": 140,
    "diameterMm": 79,
    "frontMm": 72,
    "finish": "black",
    "focusRing": "rubber-grid",
    "apertureRing": true,
    "hood": "round",
    "zoom": false
  },
  "Nikkor 45mm f/2.8 GN": {
    "lengthMm": 31,
    "diameterMm": 64,
    "frontMm": 52,
    "finish": "black",
    "focusRing": "rubber-ribbed",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "Micro-Nikkor 55mm f/2.8 AI-S": {
    "lengthMm": 64,
    "diameterMm": 64,
    "frontMm": 52,
    "finish": "black",
    "focusRing": "rubber-grid",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "Series E 50mm f/1.8": {
    "lengthMm": 33,
    "diameterMm": 63,
    "frontMm": 52,
    "finish": "black",
    "focusRing": "rubber-grid",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "Series E 28mm f/2.8": {
    "lengthMm": 45,
    "diameterMm": 63,
    "frontMm": 52,
    "finish": "black",
    "focusRing": "rubber-grid",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "Series E 100mm f/2.8": {
    "lengthMm": 72,
    "diameterMm": 63,
    "frontMm": 52,
    "finish": "black",
    "focusRing": "rubber-grid",
    "apertureRing": true,
    "hood": "round",
    "zoom": false
  },
  "AF Nikkor 50mm f/1.8D": {
    "lengthMm": 39,
    "diameterMm": 64,
    "frontMm": 52,
    "finish": "black",
    "focusRing": "thin-af",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "AF Nikkor 50mm f/1.4D": {
    "lengthMm": 42,
    "diameterMm": 65,
    "frontMm": 52,
    "finish": "black",
    "focusRing": "thin-af",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "AF Nikkor 35mm f/2D": {
    "lengthMm": 55,
    "diameterMm": 65,
    "frontMm": 52,
    "finish": "black",
    "focusRing": "thin-af",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "AF Nikkor 85mm f/1.8D": {
    "lengthMm": 71,
    "diameterMm": 72,
    "frontMm": 62,
    "finish": "black",
    "focusRing": "thin-af",
    "apertureRing": true,
    "hood": "round",
    "zoom": false
  },
  "AF Micro-Nikkor 60mm f/2.8D": {
    "lengthMm": 75,
    "diameterMm": 70,
    "frontMm": 62,
    "finish": "black",
    "focusRing": "thin-af",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "AF Nikkor 35-70mm f/2.8D": {
    "lengthMm": 95,
    "diameterMm": 73,
    "frontMm": 62,
    "finish": "black",
    "focusRing": "thin-af",
    "apertureRing": true,
    "hood": "petal",
    "zoom": true
  },
  "AF Nikkor 80-200mm f/2.8D": {
    "lengthMm": 187,
    "diameterMm": 87,
    "frontMm": 77,
    "finish": "black",
    "focusRing": "thin-af",
    "apertureRing": true,
    "hood": "round",
    "zoom": true
  },
  "AF-S Nikkor 50mm f/1.8G": {
    "lengthMm": 52,
    "diameterMm": 72,
    "frontMm": 58,
    "finish": "black",
    "focusRing": "thin-af",
    "apertureRing": false,
    "hood": "none",
    "zoom": false
  },
  "AF-S Nikkor 50mm f/1.4G": {
    "lengthMm": 54,
    "diameterMm": 73,
    "frontMm": 58,
    "finish": "black",
    "focusRing": "thin-af",
    "apertureRing": false,
    "hood": "none",
    "zoom": false
  },
  "FL 50mm f/1.8": {
    "lengthMm": 45,
    "diameterMm": 62,
    "frontMm": 48,
    "finish": "silver",
    "focusRing": "metal-scalloped",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "FD 50mm f/1.8": {
    "lengthMm": 45,
    "diameterMm": 63,
    "frontMm": 55,
    "finish": "silver",
    "focusRing": "metal-scalloped",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "FD 50mm f/1.4": {
    "lengthMm": 49,
    "diameterMm": 66,
    "frontMm": 55,
    "finish": "black",
    "focusRing": "metal-scalloped",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "FD 50mm f/1.4 SSC": {
    "lengthMm": 49,
    "diameterMm": 66,
    "frontMm": 55,
    "finish": "black",
    "focusRing": "metal-scalloped",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "FD 55mm f/1.2": {
    "lengthMm": 53,
    "diameterMm": 76,
    "frontMm": 58,
    "finish": "black",
    "focusRing": "metal-scalloped",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "FD 35mm f/2": {
    "lengthMm": 60,
    "diameterMm": 66,
    "frontMm": 55,
    "finish": "black",
    "focusRing": "metal-scalloped",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "FD 28mm f/2.8": {
    "lengthMm": 48,
    "diameterMm": 64,
    "frontMm": 55,
    "finish": "black",
    "focusRing": "rubber-ribbed",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "FD 24mm f/2.8": {
    "lengthMm": 52,
    "diameterMm": 66,
    "frontMm": 55,
    "finish": "black",
    "focusRing": "rubber-ribbed",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "FD 85mm f/1.8": {
    "lengthMm": 71,
    "diameterMm": 67,
    "frontMm": 55,
    "finish": "black",
    "focusRing": "rubber-ribbed",
    "apertureRing": true,
    "hood": "round",
    "zoom": false
  },
  "FD 135mm f/3.5": {
    "lengthMm": 85,
    "diameterMm": 66,
    "frontMm": 55,
    "finish": "black",
    "focusRing": "rubber-ribbed",
    "apertureRing": true,
    "hood": "round",
    "zoom": false
  },
  "New FD 50mm f/1.8": {
    "lengthMm": 35,
    "diameterMm": 63,
    "frontMm": 52,
    "finish": "black",
    "focusRing": "rubber-ribbed",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "New FD 50mm f/1.4": {
    "lengthMm": 46,
    "diameterMm": 63,
    "frontMm": 52,
    "finish": "black",
    "focusRing": "rubber-ribbed",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "New FD 35mm f/2": {
    "lengthMm": 58,
    "diameterMm": 63,
    "frontMm": 52,
    "finish": "black",
    "focusRing": "rubber-ribbed",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "New FD 85mm f/1.8": {
    "lengthMm": 63,
    "diameterMm": 63,
    "frontMm": 52,
    "finish": "black",
    "focusRing": "rubber-ribbed",
    "apertureRing": true,
    "hood": "round",
    "zoom": false
  },
  "New FD 35-70mm f/4": {
    "lengthMm": 85,
    "diameterMm": 66,
    "frontMm": 52,
    "finish": "black",
    "focusRing": "rubber-ribbed",
    "apertureRing": true,
    "hood": "petal",
    "zoom": true
  },
  "EF 50mm f/1.8 II": {
    "lengthMm": 41,
    "diameterMm": 68,
    "frontMm": 52,
    "finish": "black",
    "focusRing": "thin-af",
    "apertureRing": false,
    "hood": "none",
    "zoom": false
  },
  "EF 50mm f/1.8 STM": {
    "lengthMm": 39,
    "diameterMm": 69,
    "frontMm": 49,
    "finish": "black",
    "focusRing": "thin-af",
    "apertureRing": false,
    "hood": "none",
    "zoom": false
  },
  "EF 50mm f/1.4 USM": {
    "lengthMm": 51,
    "diameterMm": 74,
    "frontMm": 58,
    "finish": "black",
    "focusRing": "thin-af",
    "apertureRing": false,
    "hood": "none",
    "zoom": false
  },
  "EF 40mm f/2.8 STM": {
    "lengthMm": 23,
    "diameterMm": 68,
    "frontMm": 52,
    "finish": "black",
    "focusRing": "thin-af",
    "apertureRing": false,
    "hood": "none",
    "zoom": false
  },
  "EF 35mm f/2": {
    "lengthMm": 43,
    "diameterMm": 67,
    "frontMm": 52,
    "finish": "black",
    "focusRing": "thin-af",
    "apertureRing": false,
    "hood": "none",
    "zoom": false
  },
  "EF 85mm f/1.8 USM": {
    "lengthMm": 72,
    "diameterMm": 75,
    "frontMm": 58,
    "finish": "black",
    "focusRing": "thin-af",
    "apertureRing": false,
    "hood": "round",
    "zoom": false
  },
  "EF 85mm f/1.2L USM": {
    "lengthMm": 84,
    "diameterMm": 92,
    "frontMm": 72,
    "finish": "black",
    "focusRing": "thin-af",
    "apertureRing": false,
    "hood": "round",
    "zoom": false
  },
  "EF 24-70mm f/2.8L USM": {
    "lengthMm": 124,
    "diameterMm": 83,
    "frontMm": 77,
    "finish": "black",
    "focusRing": "thin-af",
    "apertureRing": false,
    "hood": "petal",
    "zoom": true
  },
  "EF 70-200mm f/2.8L USM": {
    "lengthMm": 194,
    "diameterMm": 85,
    "frontMm": 77,
    "finish": "black",
    "focusRing": "thin-af",
    "apertureRing": false,
    "hood": "round",
    "zoom": true
  },
  "SMC Pentax 55mm f/1.8": {
    "lengthMm": 46,
    "diameterMm": 63,
    "frontMm": 52,
    "finish": "black",
    "focusRing": "metal-knurled",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "SMC Pentax 50mm f/1.4": {
    "lengthMm": 48,
    "diameterMm": 63,
    "frontMm": 52,
    "finish": "black",
    "focusRing": "metal-knurled",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "SMC Pentax 50mm f/1.2": {
    "lengthMm": 50,
    "diameterMm": 65,
    "frontMm": 52,
    "finish": "black",
    "focusRing": "rubber-ribbed",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "SMC Pentax-M 50mm f/1.7": {
    "lengthMm": 31,
    "diameterMm": 63,
    "frontMm": 49,
    "finish": "black",
    "focusRing": "rubber-ribbed",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "SMC Pentax-M 50mm f/1.4": {
    "lengthMm": 37,
    "diameterMm": 63,
    "frontMm": 49,
    "finish": "black",
    "focusRing": "rubber-ribbed",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "SMC Pentax-M 40mm f/2.8": {
    "lengthMm": 18,
    "diameterMm": 63,
    "frontMm": 49,
    "finish": "black",
    "focusRing": "rubber-ribbed",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "SMC Pentax-M 28mm f/2.8": {
    "lengthMm": 37,
    "diameterMm": 63,
    "frontMm": 49,
    "finish": "black",
    "focusRing": "rubber-ribbed",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "SMC Pentax-M 85mm f/2": {
    "lengthMm": 56,
    "diameterMm": 63,
    "frontMm": 49,
    "finish": "black",
    "focusRing": "rubber-ribbed",
    "apertureRing": true,
    "hood": "round",
    "zoom": false
  },
  "SMC Pentax-A 50mm f/1.7": {
    "lengthMm": 31,
    "diameterMm": 63,
    "frontMm": 49,
    "finish": "black",
    "focusRing": "rubber-ribbed",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "SMC Pentax-FA 43mm f/1.9 Limited": {
    "lengthMm": 27,
    "diameterMm": 64,
    "frontMm": 49,
    "finish": "black",
    "focusRing": "metal-knurled",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "SMC Pentax-FA 77mm f/1.8 Limited": {
    "lengthMm": 48,
    "diameterMm": 64,
    "frontMm": 49,
    "finish": "black",
    "focusRing": "metal-knurled",
    "apertureRing": true,
    "hood": "round",
    "zoom": false
  },
  "SMC Pentax-FA 31mm f/1.8 Limited": {
    "lengthMm": 69,
    "diameterMm": 66,
    "frontMm": 58,
    "finish": "black",
    "focusRing": "metal-knurled",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "Super-Takumar 55mm f/1.8": {
    "lengthMm": 46,
    "diameterMm": 59,
    "frontMm": 49,
    "finish": "silver",
    "focusRing": "metal-scalloped",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "Super-Takumar 50mm f/1.4": {
    "lengthMm": 47,
    "diameterMm": 60,
    "frontMm": 49,
    "finish": "silver",
    "focusRing": "metal-scalloped",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "Super-Takumar 35mm f/3.5": {
    "lengthMm": 42,
    "diameterMm": 58,
    "frontMm": 49,
    "finish": "silver",
    "focusRing": "metal-scalloped",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "SMC Takumar 55mm f/1.8": {
    "lengthMm": 42,
    "diameterMm": 60,
    "frontMm": 49,
    "finish": "black",
    "focusRing": "rubber-ribbed",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "SMC Takumar 50mm f/1.4": {
    "lengthMm": 46,
    "diameterMm": 60,
    "frontMm": 49,
    "finish": "black",
    "focusRing": "rubber-ribbed",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "Helios 44-2 58mm f/2": {
    "lengthMm": 47,
    "diameterMm": 60,
    "frontMm": 49,
    "finish": "silver",
    "focusRing": "metal-knurled",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "Helios-44M 58mm f/2": {
    "lengthMm": 50,
    "diameterMm": 62,
    "frontMm": 52,
    "finish": "black",
    "focusRing": "metal-knurled",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "Helios-40-2 85mm f/1.5": {
    "lengthMm": 98,
    "diameterMm": 82,
    "frontMm": 67,
    "finish": "black",
    "focusRing": "metal-knurled",
    "apertureRing": true,
    "hood": "round",
    "zoom": false
  },
  "Jupiter-9 85mm f/2": {
    "lengthMm": 80,
    "diameterMm": 68,
    "frontMm": 49,
    "finish": "silver",
    "focusRing": "metal-knurled",
    "apertureRing": true,
    "hood": "round",
    "zoom": false
  },
  "Carl Zeiss Jena Pancolar 50mm f/1.8": {
    "lengthMm": 52,
    "diameterMm": 62,
    "frontMm": 49,
    "finish": "silver",
    "focusRing": "metal-knurled",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "Carl Zeiss Jena Biotar 58mm f/2": {
    "lengthMm": 55,
    "diameterMm": 62,
    "frontMm": 49,
    "finish": "silver",
    "focusRing": "metal-knurled",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "Carl Zeiss Jena Tessar 50mm f/2.8": {
    "lengthMm": 40,
    "diameterMm": 58,
    "frontMm": 49,
    "finish": "silver",
    "focusRing": "metal-scalloped",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "Carl Zeiss Jena Flektogon 35mm f/2.8": {
    "lengthMm": 58,
    "diameterMm": 70,
    "frontMm": 49,
    "finish": "black",
    "focusRing": "metal-knurled",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "Industar-61 L/Z 50mm f/2.8": {
    "lengthMm": 48,
    "diameterMm": 56,
    "frontMm": 49,
    "finish": "silver",
    "focusRing": "metal-knurled",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "MC Rokkor-PF 50mm f/1.7": {
    "lengthMm": 45,
    "diameterMm": 64,
    "frontMm": 55,
    "finish": "black",
    "focusRing": "rubber-ribbed",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "MC Rokkor-PG 50mm f/1.4": {
    "lengthMm": 48,
    "diameterMm": 65,
    "frontMm": 55,
    "finish": "black",
    "focusRing": "rubber-ribbed",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "MC Rokkor-PF 58mm f/1.4": {
    "lengthMm": 50,
    "diameterMm": 66,
    "frontMm": 55,
    "finish": "black",
    "focusRing": "rubber-ribbed",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "MD Rokkor 50mm f/1.7": {
    "lengthMm": 40,
    "diameterMm": 64,
    "frontMm": 55,
    "finish": "black",
    "focusRing": "rubber-ribbed",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "MD Rokkor 50mm f/1.4": {
    "lengthMm": 46,
    "diameterMm": 64,
    "frontMm": 55,
    "finish": "black",
    "focusRing": "rubber-ribbed",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "MD 50mm f/1.7": {
    "lengthMm": 36,
    "diameterMm": 64,
    "frontMm": 49,
    "finish": "black",
    "focusRing": "rubber-ribbed",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "MD 45mm f/2": {
    "lengthMm": 28,
    "diameterMm": 63,
    "frontMm": 49,
    "finish": "black",
    "focusRing": "rubber-ribbed",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "MD 28mm f/2.8": {
    "lengthMm": 43,
    "diameterMm": 64,
    "frontMm": 49,
    "finish": "black",
    "focusRing": "rubber-ribbed",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "MD 35-70mm f/3.5": {
    "lengthMm": 67,
    "diameterMm": 64,
    "frontMm": 55,
    "finish": "black",
    "focusRing": "rubber-ribbed",
    "apertureRing": true,
    "hood": "petal",
    "zoom": true
  },
  "AF 50mm f/1.7": {
    "lengthMm": 39,
    "diameterMm": 65,
    "frontMm": 49,
    "finish": "black",
    "focusRing": "thin-af",
    "apertureRing": false,
    "hood": "none",
    "zoom": false
  },
  "AF 50mm f/1.4": {
    "lengthMm": 39,
    "diameterMm": 65,
    "frontMm": 55,
    "finish": "black",
    "focusRing": "thin-af",
    "apertureRing": false,
    "hood": "none",
    "zoom": false
  },
  "AF 35-70mm f/4": {
    "lengthMm": 52,
    "diameterMm": 68,
    "frontMm": 49,
    "finish": "black",
    "focusRing": "thin-af",
    "apertureRing": false,
    "hood": "none",
    "zoom": true
  },
  "Zuiko 50mm f/1.8": {
    "lengthMm": 31,
    "diameterMm": 59,
    "frontMm": 49,
    "finish": "black",
    "focusRing": "rubber-ribbed",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "Zuiko 50mm f/1.4": {
    "lengthMm": 40,
    "diameterMm": 60,
    "frontMm": 49,
    "finish": "black",
    "focusRing": "rubber-ribbed",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "Zuiko 50mm f/1.2": {
    "lengthMm": 48,
    "diameterMm": 65,
    "frontMm": 49,
    "finish": "black",
    "focusRing": "rubber-ribbed",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "Zuiko 28mm f/2.8": {
    "lengthMm": 32,
    "diameterMm": 60,
    "frontMm": 49,
    "finish": "black",
    "focusRing": "rubber-ribbed",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "Zuiko 24mm f/2.8": {
    "lengthMm": 42,
    "diameterMm": 60,
    "frontMm": 49,
    "finish": "black",
    "focusRing": "rubber-ribbed",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "Zuiko 100mm f/2.8": {
    "lengthMm": 70,
    "diameterMm": 60,
    "frontMm": 49,
    "finish": "black",
    "focusRing": "rubber-ribbed",
    "apertureRing": true,
    "hood": "round",
    "zoom": false
  },
  "Zuiko 50mm f/3.5 Macro": {
    "lengthMm": 40,
    "diameterMm": 60,
    "frontMm": 49,
    "finish": "black",
    "focusRing": "rubber-ribbed",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "F.Zuiko 38mm f/1.8": {
    "lengthMm": 32,
    "diameterMm": 56,
    "frontMm": 43,
    "finish": "black",
    "focusRing": "metal-knurled",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "G.Zuiko 40mm f/1.4": {
    "lengthMm": 38,
    "diameterMm": 60,
    "frontMm": 49,
    "finish": "black",
    "focusRing": "metal-knurled",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "E.Zuiko 25mm f/4": {
    "lengthMm": 28,
    "diameterMm": 52,
    "frontMm": 43,
    "finish": "silver",
    "focusRing": "metal-scalloped",
    "apertureRing": true,
    "hood": "built-in",
    "zoom": false
  },
  "Summicron-M 50mm f/2": {
    "lengthMm": 43,
    "diameterMm": 53,
    "frontMm": 39,
    "finish": "chrome-nose",
    "focusRing": "metal-knurled",
    "apertureRing": true,
    "hood": "none",
    "zoom": false,
    "focusTab": true
  },
  "Summicron-M 35mm f/2": {
    "lengthMm": 34,
    "diameterMm": 52,
    "frontMm": 39,
    "finish": "chrome-nose",
    "focusRing": "metal-knurled",
    "apertureRing": true,
    "hood": "none",
    "zoom": false,
    "focusTab": true
  },
  "Summicron-M 35mm f/2 ASPH": {
    "lengthMm": 35,
    "diameterMm": 53,
    "frontMm": 39,
    "finish": "black",
    "focusRing": "metal-knurled",
    "apertureRing": true,
    "hood": "none",
    "zoom": false,
    "focusTab": true
  },
  "Summicron-M 28mm f/2": {
    "lengthMm": 41,
    "diameterMm": 53,
    "frontMm": 46,
    "finish": "black",
    "focusRing": "metal-knurled",
    "apertureRing": true,
    "hood": "none",
    "zoom": false,
    "focusTab": true
  },
  "Summicron-M 90mm f/2": {
    "lengthMm": 77,
    "diameterMm": 58,
    "frontMm": 55,
    "finish": "black",
    "focusRing": "metal-knurled",
    "apertureRing": true,
    "hood": "round",
    "zoom": false
  },
  "Summilux-M 50mm f/1.4": {
    "lengthMm": 52,
    "diameterMm": 53,
    "frontMm": 43,
    "finish": "chrome-nose",
    "focusRing": "metal-knurled",
    "apertureRing": true,
    "hood": "none",
    "zoom": false,
    "focusTab": true
  },
  "Summilux-M 50mm f/1.4 ASPH": {
    "lengthMm": 52,
    "diameterMm": 53,
    "frontMm": 46,
    "finish": "black",
    "focusRing": "metal-knurled",
    "apertureRing": true,
    "hood": "none",
    "zoom": false,
    "focusTab": true
  },
  "Summilux-M 35mm f/1.4": {
    "lengthMm": 46,
    "diameterMm": 53,
    "frontMm": 46,
    "finish": "black",
    "focusRing": "metal-knurled",
    "apertureRing": true,
    "hood": "none",
    "zoom": false,
    "focusTab": true
  },
  "Noctilux-M 50mm f/1": {
    "lengthMm": 62,
    "diameterMm": 61,
    "frontMm": 58,
    "finish": "black",
    "focusRing": "metal-knurled",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "Elmar-M 50mm f/2.8": {
    "lengthMm": 38,
    "diameterMm": 52,
    "frontMm": 39,
    "finish": "silver",
    "focusRing": "metal-scalloped",
    "apertureRing": true,
    "hood": "none",
    "zoom": false,
    "focusTab": true
  },
  "Summaron 35mm f/2.8": {
    "lengthMm": 29,
    "diameterMm": 51,
    "frontMm": 39,
    "finish": "chrome-nose",
    "focusRing": "metal-scalloped",
    "apertureRing": true,
    "hood": "none",
    "zoom": false,
    "focusTab": true
  },
  "Elmarit-M 28mm f/2.8": {
    "lengthMm": 42,
    "diameterMm": 52,
    "frontMm": 46,
    "finish": "black",
    "focusRing": "metal-knurled",
    "apertureRing": true,
    "hood": "none",
    "zoom": false,
    "focusTab": true
  },
  "Voigtländer Nokton 40mm f/1.4": {
    "lengthMm": 30,
    "diameterMm": 55,
    "frontMm": 43,
    "finish": "black",
    "focusRing": "metal-knurled",
    "apertureRing": true,
    "hood": "none",
    "zoom": false,
    "focusTab": true
  },
  "Voigtländer Color Skopar 35mm f/2.5": {
    "lengthMm": 25,
    "diameterMm": 51,
    "frontMm": 39,
    "finish": "chrome-nose",
    "focusRing": "metal-knurled",
    "apertureRing": true,
    "hood": "none",
    "zoom": false,
    "focusTab": true
  },
  "Voigtländer Nokton Classic 35mm f/1.4": {
    "lengthMm": 28,
    "diameterMm": 55,
    "frontMm": 43,
    "finish": "chrome-nose",
    "focusRing": "metal-scalloped",
    "apertureRing": true,
    "hood": "none",
    "zoom": false,
    "focusTab": true
  },
  "Zeiss Biogon 35mm f/2": {
    "lengthMm": 44,
    "diameterMm": 52,
    "frontMm": 43,
    "finish": "black",
    "focusRing": "metal-knurled",
    "apertureRing": true,
    "hood": "none",
    "zoom": false,
    "focusTab": true
  },
  "Konica M-Hexanon 50mm f/2": {
    "lengthMm": 45,
    "diameterMm": 54,
    "frontMm": 46,
    "finish": "black",
    "focusRing": "metal-knurled",
    "apertureRing": true,
    "hood": "none",
    "zoom": false,
    "focusTab": true
  },
  "Minolta M-Rokkor 40mm f/2": {
    "lengthMm": 24,
    "diameterMm": 51,
    "frontMm": 40.5,
    "finish": "black",
    "focusRing": "metal-knurled",
    "apertureRing": true,
    "hood": "none",
    "zoom": false,
    "focusTab": true
  },
  "Leica Summitar 50mm f/2": {
    "lengthMm": 45,
    "diameterMm": 48,
    "frontMm": 36,
    "finish": "chrome-nose",
    "focusRing": "metal-scalloped",
    "apertureRing": true,
    "hood": "none",
    "zoom": false,
    "focusTab": true
  },
  "Elmar 50mm f/3.5": {
    "lengthMm": 38,
    "diameterMm": 48,
    "frontMm": 19,
    "finish": "silver",
    "focusRing": "metal-scalloped",
    "apertureRing": true,
    "hood": "none",
    "zoom": false,
    "focusTab": true
  },
  "Jupiter-8 50mm f/2": {
    "lengthMm": 42,
    "diameterMm": 49,
    "frontMm": 40.5,
    "finish": "chrome-nose",
    "focusRing": "metal-knurled",
    "apertureRing": true,
    "hood": "none",
    "zoom": false,
    "focusTab": true
  },
  "Jupiter-3 50mm f/1.5": {
    "lengthMm": 46,
    "diameterMm": 50,
    "frontMm": 40.5,
    "finish": "chrome-nose",
    "focusRing": "metal-knurled",
    "apertureRing": true,
    "hood": "none",
    "zoom": false,
    "focusTab": true
  },
  "Industar-61 L/D 55mm f/2.8": {
    "lengthMm": 48,
    "diameterMm": 55,
    "frontMm": 40.5,
    "finish": "silver",
    "focusRing": "metal-knurled",
    "apertureRing": true,
    "hood": "none",
    "zoom": false,
    "focusTab": true
  },
  "Canon 50mm f/1.8 LTM": {
    "lengthMm": 40,
    "diameterMm": 49,
    "frontMm": 40,
    "finish": "chrome-nose",
    "focusRing": "metal-scalloped",
    "apertureRing": true,
    "hood": "none",
    "zoom": false,
    "focusTab": true
  },
  "Canon 35mm f/2.8 LTM": {
    "lengthMm": 32,
    "diameterMm": 48,
    "frontMm": 34,
    "finish": "chrome-nose",
    "focusRing": "metal-scalloped",
    "apertureRing": true,
    "hood": "none",
    "zoom": false,
    "focusTab": true
  },
  "Planar 45mm f/2": {
    "lengthMm": 41,
    "diameterMm": 56,
    "frontMm": 46,
    "finish": "black",
    "focusRing": "thin-af",
    "apertureRing": false,
    "hood": "none",
    "zoom": false
  },
  "Planar 35mm f/2": {
    "lengthMm": 35,
    "diameterMm": 56,
    "frontMm": 46,
    "finish": "black",
    "focusRing": "thin-af",
    "apertureRing": false,
    "hood": "none",
    "zoom": false
  },
  "Biogon 28mm f/2.8": {
    "lengthMm": 31,
    "diameterMm": 56,
    "frontMm": 46,
    "finish": "black",
    "focusRing": "thin-af",
    "apertureRing": false,
    "hood": "built-in",
    "zoom": false
  },
  "Biogon 21mm f/2.8": {
    "lengthMm": 36,
    "diameterMm": 59,
    "frontMm": 55,
    "finish": "black",
    "focusRing": "thin-af",
    "apertureRing": false,
    "hood": "built-in",
    "zoom": false
  },
  "Sonnar 90mm f/2.8": {
    "lengthMm": 63,
    "diameterMm": 56,
    "frontMm": 46,
    "finish": "black",
    "focusRing": "thin-af",
    "apertureRing": false,
    "hood": "round",
    "zoom": false
  },
  "Planar 50mm f/1.4": {
    "lengthMm": 46,
    "diameterMm": 63,
    "frontMm": 55,
    "finish": "black",
    "focusRing": "rubber-ribbed",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "Planar 50mm f/1.7": {
    "lengthMm": 38,
    "diameterMm": 62,
    "frontMm": 55,
    "finish": "black",
    "focusRing": "rubber-ribbed",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "Tessar 45mm f/2.8": {
    "lengthMm": 25,
    "diameterMm": 60,
    "frontMm": 49,
    "finish": "black",
    "focusRing": "rubber-ribbed",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "Distagon 28mm f/2.8": {
    "lengthMm": 50,
    "diameterMm": 63,
    "frontMm": 55,
    "finish": "black",
    "focusRing": "rubber-ribbed",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "Yashica ML 50mm f/1.7": {
    "lengthMm": 40,
    "diameterMm": 64,
    "frontMm": 52,
    "finish": "black",
    "focusRing": "rubber-ribbed",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "Yashica ML 50mm f/1.9": {
    "lengthMm": 38,
    "diameterMm": 63,
    "frontMm": 52,
    "finish": "black",
    "focusRing": "rubber-ribbed",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "Planar C 80mm f/2.8": {
    "lengthMm": 65,
    "diameterMm": 80,
    "frontMm": 50,
    "finish": "black",
    "focusRing": "metal-knurled",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "Planar CF 80mm f/2.8": {
    "lengthMm": 65,
    "diameterMm": 81,
    "frontMm": 60,
    "finish": "black",
    "focusRing": "rubber-grid",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "Distagon CF 50mm f/4": {
    "lengthMm": 98,
    "diameterMm": 84,
    "frontMm": 60,
    "finish": "black",
    "focusRing": "rubber-grid",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "Sonnar CF 150mm f/4": {
    "lengthMm": 96,
    "diameterMm": 81,
    "frontMm": 60,
    "finish": "black",
    "focusRing": "rubber-grid",
    "apertureRing": true,
    "hood": "round",
    "zoom": false
  },
  "45mm f/4": {
    "lengthMm": 52,
    "diameterMm": 60,
    "frontMm": 49,
    "finish": "black",
    "focusRing": "rubber-ribbed",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "30mm f/5.6": {
    "lengthMm": 60,
    "diameterMm": 66,
    "frontMm": 58,
    "finish": "black",
    "focusRing": "rubber-ribbed",
    "apertureRing": true,
    "hood": "built-in",
    "zoom": false
  },
  "90mm f/4": {
    "lengthMm": 73,
    "diameterMm": 60,
    "frontMm": 49,
    "finish": "black",
    "focusRing": "rubber-ribbed",
    "apertureRing": true,
    "hood": "round",
    "zoom": false
  },
  "Sekor C 90mm f/3.8": {
    "lengthMm": 96,
    "diameterMm": 98,
    "frontMm": 77,
    "finish": "black",
    "focusRing": "rubber-ribbed",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "Sekor C 127mm f/3.8": {
    "lengthMm": 92,
    "diameterMm": 98,
    "frontMm": 77,
    "finish": "black",
    "focusRing": "rubber-ribbed",
    "apertureRing": true,
    "hood": "round",
    "zoom": false
  },
  "K/L 90mm f/3.5": {
    "lengthMm": 90,
    "diameterMm": 96,
    "frontMm": 77,
    "finish": "black",
    "focusRing": "rubber-ribbed",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "Sekor Z 110mm f/2.8 W": {
    "lengthMm": 98,
    "diameterMm": 100,
    "frontMm": 77,
    "finish": "black",
    "focusRing": "rubber-ribbed",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "N 80mm f/4": {
    "lengthMm": 56,
    "diameterMm": 64,
    "frontMm": 58,
    "finish": "black",
    "focusRing": "rubber-ribbed",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "N 65mm f/4": {
    "lengthMm": 65,
    "diameterMm": 64,
    "frontMm": 58,
    "finish": "black",
    "focusRing": "rubber-ribbed",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "N 150mm f/4.5": {
    "lengthMm": 96,
    "diameterMm": 70,
    "frontMm": 67,
    "finish": "black",
    "focusRing": "rubber-ribbed",
    "apertureRing": true,
    "hood": "round",
    "zoom": false
  },
  "Sekor C 80mm f/2.8": {
    "lengthMm": 58,
    "diameterMm": 76,
    "frontMm": 67,
    "finish": "black",
    "focusRing": "rubber-ribbed",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "Sekor C 80mm f/1.9": {
    "lengthMm": 72,
    "diameterMm": 88,
    "frontMm": 77,
    "finish": "black",
    "focusRing": "rubber-ribbed",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "Sekor 80mm f/2.8": {
    "lengthMm": 70,
    "diameterMm": 62,
    "frontMm": 46,
    "finish": "black",
    "focusRing": "metal-knurled",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "SMC Takumar 6x7 105mm f/2.4": {
    "lengthMm": 92,
    "diameterMm": 99,
    "frontMm": 67,
    "finish": "black",
    "focusRing": "rubber-ribbed",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "SMC Pentax 67 90mm f/2.8": {
    "lengthMm": 90,
    "diameterMm": 98,
    "frontMm": 67,
    "finish": "black",
    "focusRing": "rubber-ribbed",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "SMC Pentax 67 75mm f/4.5": {
    "lengthMm": 90,
    "diameterMm": 96,
    "frontMm": 67,
    "finish": "black",
    "focusRing": "rubber-ribbed",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "SMC Pentax 67 165mm f/2.8": {
    "lengthMm": 140,
    "diameterMm": 106,
    "frontMm": 67,
    "finish": "black",
    "focusRing": "rubber-ribbed",
    "apertureRing": true,
    "hood": "round",
    "zoom": false
  },
  "SMC Pentax-A 645 75mm f/2.8": {
    "lengthMm": 48,
    "diameterMm": 76,
    "frontMm": 58,
    "finish": "black",
    "focusRing": "rubber-ribbed",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "Zenzanon-S 80mm f/2.8": {
    "lengthMm": 60,
    "diameterMm": 80,
    "frontMm": 67,
    "finish": "black",
    "focusRing": "rubber-ribbed",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "Zenzanon-PS 80mm f/2.8": {
    "lengthMm": 58,
    "diameterMm": 80,
    "frontMm": 67,
    "finish": "black",
    "focusRing": "rubber-ribbed",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "Zenzanon-E 75mm f/2.8": {
    "lengthMm": 52,
    "diameterMm": 74,
    "frontMm": 62,
    "finish": "black",
    "focusRing": "rubber-ribbed",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "Zenzanon-PG 100mm f/3.5": {
    "lengthMm": 80,
    "diameterMm": 90,
    "frontMm": 72,
    "finish": "black",
    "focusRing": "rubber-ribbed",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "G 75mm f/3.5": {
    "lengthMm": 55,
    "diameterMm": 64,
    "frontMm": 58,
    "finish": "black",
    "focusRing": "rubber-ribbed",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "Volna-3 80mm f/2.8": {
    "lengthMm": 70,
    "diameterMm": 84,
    "frontMm": 62,
    "finish": "black",
    "focusRing": "metal-knurled",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "Biometar 80mm f/2.8": {
    "lengthMm": 68,
    "diameterMm": 82,
    "frontMm": 58,
    "finish": "silver",
    "focusRing": "metal-knurled",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "Summicron-R 50mm f/2": {
    "lengthMm": 51,
    "diameterMm": 66,
    "frontMm": 55,
    "finish": "black",
    "focusRing": "rubber-ribbed",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "Summilux-R 50mm f/1.4": {
    "lengthMm": 58,
    "diameterMm": 68,
    "frontMm": 55,
    "finish": "black",
    "focusRing": "rubber-ribbed",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "Elmarit-R 35mm f/2.8": {
    "lengthMm": 48,
    "diameterMm": 63,
    "frontMm": 55,
    "finish": "black",
    "focusRing": "rubber-ribbed",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "Hexanon AR 40mm f/1.8": {
    "lengthMm": 27,
    "diameterMm": 63,
    "frontMm": 55,
    "finish": "black",
    "focusRing": "rubber-ribbed",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "Hexanon AR 50mm f/1.7": {
    "lengthMm": 40,
    "diameterMm": 64,
    "frontMm": 55,
    "finish": "black",
    "focusRing": "rubber-ribbed",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "Hexanon AR 57mm f/1.4": {
    "lengthMm": 50,
    "diameterMm": 66,
    "frontMm": 55,
    "finish": "black",
    "focusRing": "rubber-ribbed",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  },
  "Prakticar 50mm f/1.8": {
    "lengthMm": 40,
    "diameterMm": 62,
    "frontMm": 49,
    "finish": "black",
    "focusRing": "rubber-ribbed",
    "apertureRing": true,
    "hood": "none",
    "zoom": false
  }
}

function norm(value: string) {
  return value.toLowerCase().replace(/\s+/g, '')
}

const SKIP = new Set(['the', 'lens', 'auto', 'smc', 'super', 'multi', 'coated', 'new', 'series'])

function tokens(value: string) {
  return value.toLowerCase()
    .replace(/voigtländer/g, 'voigtlander')
    .replace(/[^a-z0-9./+]+/g, ' ')
    .split(' ')
    .filter((token) => token && !SKIP.has(token))
}

/** 마운트와 이름이 같은 계열이면 가산. 같은 화각이 여러 마운트에 있을 때 골라 쓴다. */
function affinity(name: string, mount: string) {
  const n = name.toLowerCase()
  const m = mount.toLowerCase()
  if (m.includes('nikon') && /nikkor|series e/.test(n)) return 8
  if (m.includes('canon fd') && /new fd|\bfd\b|\bfl\b/.test(n)) return 8
  if (m.includes('canon ef') && /\bef\b/.test(n)) return 8
  if (m === 'leica m' && /-m\b|voigt|summi|elmar|hexanon|m-rokkor|biogon|planar|sonnar/.test(n)) return 6
  if ((m.includes('l39') || m.includes('ltm')) && /ltm|jupiter|industar|summitar|elmar|summar|canon|w-nikkor|nikkor/.test(n)) return 6
  if (m.includes('pentax') && /pentax|takumar/.test(n)) return 6
  if (m.includes('olympus') && /zuiko/.test(n)) return 6
  if (m.includes('minolta') && /rokkor|\bmd\b|\bmc\b|\baf\b/.test(n)) return 5
  if (m === 'm42' && /takumar|helios|jupiter|jena|pancolar|flektogon|industar|pentacon|biotar|orest|mir-/.test(n)) return 6
  if (m.includes('contax g') && /planar|biogon|sonnar|hologon|vario/.test(n)) return 6
  if ((m.includes('yashica') || m.includes('contax/')) && /yashica|planar|distagon|tessar|sonnar|makro/.test(n)) return 4
  if (m.includes('hasselblad') && /planar|distagon|sonnar|tessar|\bcf\b|\bc\b/.test(n)) return 4
  if (m.includes('mamiya') && /sekor|k\/l|\bn\b|\bg\b/.test(n)) return 4
  if (m.includes('bronica') && /zenzanon/.test(n)) return 6
  if (m.includes('konica') && /hexanon/.test(n)) return 6
  if (m.includes('leica r') && /-r\b/.test(n)) return 6
  return 0
}

const FILTERS = [39, 40.5, 43, 46, 49, 52, 55, 58, 62, 67, 72, 77, 82, 86, 95]

function nearestFilter(diameter: number) {
  const want = diameter * 0.82
  return FILTERS.reduce((best, size) => (Math.abs(size - want) < Math.abs(best - want) ? size : best), FILTERS[0])
}

function estimateLens(brand: string, model: string, mount = ''): LensSpec {
  const parsed = parseLens(`${brand} ${model}`)
  const name = `${brand} ${model}`.toLowerCase()
  const m = mount.toLowerCase()
  const focal = parsed.focalMax || parsed.focalMin || 50
  const wide = parsed.focalMin || focal
  const open = Number(String(parsed.open).split(/[–-]/)[0]) || 2.8
  const zoom = parsed.zoom
  const mediumSLR = /hasselblad|pentax 67|pentax 645|bronica|kiev|pentacon six|mamiya rb|mamiya rz|mamiya 645|mamiya c/.test(m)
  const mediumRF = /mamiya 7|mamiya 6|xpan/.test(m)
  const compact = /leica m$|leica l39|\bl39\b|contax g|pen f/.test(m)
  const af = /canon ef|minolta a|contax g/.test(m) || /\baf\b|af-s|af-d|\busm\b|\bstm\b|pentax-f/.test(name)

  let length = 46
  let diameter = 64
  if (zoom) {
    length = 48 + focal * 0.42 + (focal - wide) * 0.2 + (open <= 2.8 ? 16 : 0)
    diameter = (compact ? 58 : mediumSLR ? 84 : 68) + (open <= 2.8 ? 6 : 0)
  } else if (mediumSLR) {
    length = 42 + focal * 0.32 + Math.max(0, 2.8 - open) * 6
    diameter = 80 + Math.max(0, 2.8 - open) * 4
  } else if (mediumRF) {
    length = 36 + focal * 0.28
    diameter = 68
  } else if (compact) {
    length = 16 + focal * 0.48 + Math.max(0, 2 - open) * 8
    diameter = 51 + Math.max(0, 2 - open) * 5
  } else if (focal < 35) {
    length = 46 + (35 - focal) * 0.35 + Math.max(0, 2.8 - open) * 4
    diameter = 63 + Math.max(0, 2.8 - open) * 3
  } else if (focal > 85) {
    length = 28 + focal * 0.55
    diameter = 66 + Math.min(18, (focal - 85) * 0.08)
  } else {
    length = 24 + focal * 0.42 + Math.max(0, 2.2 - open) * 10
    diameter = 62 + Math.max(0, 2 - open) * 6
  }
  length = Math.round(Math.min(190, Math.max(22, length)))
  diameter = Math.round(Math.min(110, Math.max(48, diameter)))

  let finish: LensSpec['finish'] = 'black'
  if (compact && !/asph|apo|noctilux/.test(name)) finish = focal <= 50 ? 'chrome-nose' : 'silver'
  if (/silver|chrome/.test(name)) finish = 'silver'
  if (/super-takumar|auto-takumar|biotar|tessar 50/.test(name)) finish = 'silver'

  let focusRing: LensSpec['focusRing'] = 'rubber-ribbed'
  if (af) focusRing = 'thin-af'
  else if (/series e/.test(name)) focusRing = 'rubber-grid'
  else if (/takumar|\belmar\b|summar/.test(name)) focusRing = 'metal-scalloped'
  else if (compact || /helios|jupiter|industar|biotar|pancolar|flektogon/.test(name)) focusRing = 'metal-knurled'

  const nikonG = /nikkor|nikon/.test(name + ' ' + m) && /af-s|\bf\/\d+(?:\.\d+)?g\b|\bg\b/.test(name) && !/\baf\b.*\bd\b|\bd\b/.test(name)
  const apertureRing = !(/canon ef|minolta a|contax g/.test(m) || /^ef\b/.test(model.toLowerCase()) || nikonG)

  let hood: LensSpec['hood'] = 'none'
  if (!zoom && wide < 24) hood = 'built-in'
  else if (zoom && wide < 36) hood = 'petal'
  else if (!zoom && focal >= 100) hood = 'round'

  const spec: LensSpec = {
    lengthMm: length,
    diameterMm: diameter,
    frontMm: nearestFilter(diameter),
    finish,
    focusRing,
    apertureRing,
    hood,
    zoom,
  }
  if (!zoom && compact && focal <= 50 && !af) spec.focusTab = true
  return spec
}

/** 카탈로그 이름에 가깝게 맞추고, 없으면 화각·마운트로 추정한다. */
export function lensSpec(brand = '', model = '', mount = ''): LensSpec {
  const query = `${brand} ${model}`.trim()
  if (!query) return estimateLens('', '50mm f/1.8', mount)
  const modelNorm = norm(model)
  const queryNorm = norm(query)
  const queryTokens = tokens(query)
  let best: LensSpec | undefined
  let bestScore = 0
  for (const [name, spec] of Object.entries(table)) {
    const nameNorm = norm(name)
    if (nameNorm === queryNorm || (modelNorm && nameNorm === modelNorm)) return { ...spec }
    const nameTokens = tokens(name)
    const brandTokens = new Set(tokens(brand))
    const wordQuery = queryTokens.filter((token) => !brandTokens.has(token) && !/^\d+(?:-\d+)?mm$/.test(token) && !/^f\/\d/.test(token))
    if (wordQuery.length && !wordQuery.some((token) => nameTokens.includes(token))) continue
    const focalQuery = queryTokens.find((token) => /^\d+(?:-\d+)?mm$/.test(token))
    const focalName = nameTokens.find((token) => /^\d+(?:-\d+)?mm$/.test(token))
    if (focalQuery && focalName && focalQuery !== focalName) continue
    const apertureQuery = queryTokens.find((token) => /^f\/\d/.test(token))
    const apertureName = nameTokens.find((token) => /^f\/\d/.test(token))
    if (apertureQuery && apertureName && apertureQuery !== apertureName) continue
    let shared = 0
    for (const token of queryTokens) if (nameTokens.includes(token)) shared++
    if (shared < 2) continue
    const extra = Math.max(0, nameTokens.length - shared)
    const score = shared * 10 - extra * 3 + affinity(name, mount) + (modelNorm.length > 5 && nameNorm.includes(modelNorm) ? 25 : 0)
    if (score > bestScore) {
      bestScore = score
      best = spec
    }
  }
  if (best && bestScore >= 18) return { ...best }
  return estimateLens(brand, model, mount)
}
