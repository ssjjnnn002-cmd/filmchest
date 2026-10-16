import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { ConvexGeometry } from 'three/examples/jsm/geometries/ConvexGeometry.js'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { profileFor, type ModelProfile } from './profiles'
import type { BodyStyle } from './types'

// 기본 3D 모형. 단위 cm, 렌즈는 +z(보는 사람 쪽), 몸체 중심이 원점.
// 보는 사람 기준 왼쪽(-x)이 카메라를 쥔 사람의 오른손 쪽: 셔터 버튼, 감는 레버, 그립이 여기 있다.

const PI = Math.PI

// --- 색

function brightness(c: THREE.Color) {
  const s = c.clone().convertLinearToSRGB()
  return 0.299 * s.r + 0.587 * s.g + 0.114 * s.b
}

function adjusted(c: THREE.Color, amount: number) {
  const s = c.clone().convertLinearToSRGB()
  s.r = Math.min(Math.max(s.r + amount, 0), 1)
  s.g = Math.min(Math.max(s.g + amount, 0), 1)
  s.b = Math.min(Math.max(s.b + amount, 0), 1)
  return s.convertSRGBToLinear()
}

// --- 텍스처 (캔버스로 그림)

const texCache = new Map<string, THREE.Texture>()
function canvasTex(key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void, srgb = true): THREE.Texture | null {
  // iOS(JavaScriptCore)에서는 캔버스가 없다: 모양만 만들고 텍스처는 앱이 직접 그린다
  if (typeof document === 'undefined') return null
  const hit = texCache.get(key)
  if (hit) return hit
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  draw(c.getContext('2d')!)
  const t = new THREE.CanvasTexture(c)
  if (srgb) t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  texCache.set(key, t)
  return t
}

/** 가죽 결 (밝기 변화만, 색은 재질 색을 따른다) */
function leatherTex() {
  const t = canvasTex('leather', 256, 256, (ctx) => {
    ctx.fillStyle = '#d8d8d8'
    ctx.fillRect(0, 0, 256, 256)
    let seed = 0x9e3779b9
    const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32)
    for (let i = 0; i < 5200; i++) {
      const v = 200 + (rand() - 0.5) * 90
      ctx.fillStyle = `rgb(${v},${v},${v})`
      ctx.beginPath()
      ctx.arc(rand() * 256, rand() * 256, 0.6 + rand() * 1.4, 0, PI * 2)
      ctx.fill()
    }
  }, false)
  if (t) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(0.9, 0.9) }
  return t
}

/** 렌즈 유리: 코팅 반사가 살짝 보이는 검은 유리 */
function glassTex() {
  return canvasTex('glass', 256, 256, (ctx) => {
    const s = 256
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
    g.addColorStop(0, '#1a1a20'); g.addColorStop(0.7, '#0c0c10'); g.addColorStop(1, '#050507')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, s, s)
    const ring = (r: number, color: string, lw: number) => {
      ctx.strokeStyle = color; ctx.lineWidth = lw
      ctx.beginPath(); ctx.arc(s / 2, s / 2, r, 0, PI * 2); ctx.stroke()
    }
    // 무채색: 렌즈에 색이 들어가지 않게 회색 반사 고리만
    ring(96, 'rgba(120,120,124,0.22)', 8)
    ring(60, 'rgba(110,110,114,0.18)', 5)
    const hl = (x: number, y: number, r: number, a: number) => {
      const h = ctx.createRadialGradient(x, y, 0, x, y, r)
      h.addColorStop(0, `rgba(255,255,255,${a})`); h.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = h
      ctx.fillRect(0, 0, s, s)
    }
    hl(s * 0.36, s * 0.33, 36, 0.95)
    hl(s * 0.6, s * 0.62, 12, 0.6)
    hl(s * 0.45, s * 0.42, 80, 0.2)
  })
}

/** 렌즈 경통 눈금 (둘레에 감기는 띠). 위쪽(u=0.5 근처)에 숫자가 모인다. */
function scaleTex(labels: string[], ink = '#f2f2f2', bg = '#111113') {
  return canvasTex(`scale:${labels.join(',')}:${ink}`, 1024, 64, (ctx) => {
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, 1024, 64)
    ctx.fillStyle = ink
    ctx.font = '600 30px Helvetica, Arial, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const span = 380
    labels.forEach((l, i) => {
      const x = 512 - span / 2 + (span * i) / Math.max(1, labels.length - 1)
      ctx.save()
      ctx.translate(x, 32)
      ctx.scale(-1, 1) // 원통 바깥에서 읽히게
      ctx.fillText(l, 0, 2)
      ctx.restore()
    })
  })
}

/** 다이얼 윗면 숫자 (투명 배경) */
function dialTex(labels: string[], ink: string) {
  return canvasTex(`dial:${labels.join(',')}:${ink}`, 256, 256, (ctx) => {
    ctx.fillStyle = ink
    ctx.strokeStyle = ink
    ctx.font = '600 22px Helvetica, Arial, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    labels.forEach((l, i) => {
      const a = (i / labels.length) * PI * 2
      ctx.save()
      ctx.translate(128 + Math.sin(a) * 92, 128 - Math.cos(a) * 92)
      ctx.rotate(a)
      ctx.fillText(l, 0, 0)
      ctx.restore()
    })
    ctx.lineWidth = 3
    ctx.beginPath(); ctx.arc(128, 128, 60, 0, PI * 2); ctx.stroke()
  })
}

// --- 재질

interface Kit {
  leather: THREE.Material
  plate: THREE.Material
  accent: THREE.Material
  plastic: THREE.Material
  lensBlack: THREE.Material
  lensSatin: THREE.Material
  rubber: THREE.Material
  window: THREE.Material
  frosted: THREE.Material
  glass: THREE.Material
  red: THREE.Material
  ink: string
}

function makeKit(hex: string): Kit {
  const kit = makeKitRaw(hex)
  for (const [name, m] of Object.entries(kit)) if (m instanceof THREE.Material) m.name = name
  return kit
}

function makeKitRaw(hex: string): Kit {
  const base = new THREE.Color(hex)
  const dark = brightness(base) < 0.35
  const phys = (color: THREE.Color | number, roughness: number, metalness: number, extra: THREE.MeshPhysicalMaterialParameters = {}) =>
    new THREE.MeshPhysicalMaterial({ color, roughness, metalness, ...extra })
  return {
    leather: phys(adjusted(base, dark ? 0.03 : -0.1), 0.88, 0, { map: leatherTex(), bumpMap: leatherTex(), bumpScale: 1.2 }),
    plate: phys(adjusted(base, dark ? 0.08 : 0.02), dark ? 0.36 : 0.3, dark ? 0.35 : 0.8, { clearcoat: dark ? 0.6 : 0.2, clearcoatRoughness: 0.3 }),
    accent: phys(adjusted(base, dark ? 0.12 : 0.06), 0.28, dark ? 0.5 : 0.9, { clearcoat: 0.4 }),
    plastic: phys(base, 0.5, 0.05, { clearcoat: 0.25, clearcoatRoughness: 0.5 }),
    lensBlack: phys(0x111112, 0.4, 0.3, { clearcoat: 0.5, clearcoatRoughness: 0.35 }),
    lensSatin: phys(0x1a1a1c, 0.55, 0.2),
    rubber: phys(0x0d0d0e, 0.9, 0),
    window: phys(0x0e1014, 0.05, 0.2, { clearcoat: 1, clearcoatRoughness: 0.02 }),
    frosted: phys(0xdcdcdc, 0.45, 0.05),
    glass: new THREE.MeshBasicMaterial({ map: glassTex() }),
    red: phys(0xc8102e, 0.35, 0.1, { clearcoat: 0.8 }),
    ink: dark ? '#e8e8e8' : '#1a1a1a',
  }
}

// --- 모양 도우미

/** 가운데 기준 둥근 사각형. r: [왼아래, 오른아래, 오른위, 왼위] */
function rrect(w: number, h: number, r: number | [number, number, number, number], cx = 0, cy = 0) {
  const lim = Math.min(w, h) / 2 - 0.001
  const [a, b, c, d] = (typeof r === 'number' ? [r, r, r, r] : r).map((v) => Math.max(0.001, Math.min(v, lim)))
  const x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy - h / 2, y1 = cy + h / 2
  const s = new THREE.Shape()
  s.moveTo(x0 + a, y0)
  s.lineTo(x1 - b, y0)
  s.absarc(x1 - b, y0 + b, b, -PI / 2, 0, false)
  s.lineTo(x1, y1 - c)
  s.absarc(x1 - c, y1 - c, c, 0, PI / 2, false)
  s.lineTo(x0 + d, y1)
  s.absarc(x0 + d, y1 - d, d, PI / 2, PI, false)
  s.lineTo(x0, y0 + a)
  s.absarc(x0 + a, y0 + a, a, PI, PI * 1.5, false)
  return s
}

type ShapeFn = (inset: number) => THREE.Shape

class Builder {
  constructor(readonly group: THREE.Group, readonly k: Kit) {}

  add(geo: THREE.BufferGeometry, m: THREE.Material) {
    const mesh = new THREE.Mesh(geo, m)
    this.group.add(mesh)
    return mesh
  }

  box(w: number, h: number, d: number, r: number, m: THREE.Material, x: number, y: number, z: number, rotY = 0, rotZ = 0, rotX = 0) {
    const mesh = this.add(new RoundedBoxGeometry(w, h, d, 3, Math.max(0.005, Math.min(r, w / 2, h / 2, d / 2) - 0.001)), m)
    mesh.position.set(x, y, z)
    mesh.rotation.set(rotX, rotY, rotZ)
    return mesh
  }

  /** 위에서 본 모양(x, z)을 위로 쌓는다. y0 = 바닥 */
  extY(shape: ShapeFn, height: number, bevel: number, m: THREE.Material, y0: number, curve = 28) {
    const bv = Math.min(bevel, height / 2 - 0.001)
    const geo = new THREE.ExtrudeGeometry(shape(bv), {
      depth: Math.max(0.001, height - bv * 2), bevelEnabled: bv > 0, bevelThickness: bv, bevelSize: bv, bevelSegments: 5, curveSegments: curve,
    })
    geo.translate(0, 0, bv)
    geo.rotateX(PI / 2) // 모양의 y → 월드 z, 높이 → 아래로
    geo.translate(0, y0 + height, 0)
    return this.add(geo, m)
  }

  /** 앞에서 본 모양(x, y)을 앞으로 민다. z0 = 뒷면 */
  extZ(shape: ShapeFn, depth: number, bevel: number, m: THREE.Material, z0: number, curve = 28) {
    const bv = Math.min(bevel, depth / 2 - 0.001)
    const geo = new THREE.ExtrudeGeometry(shape(bv), {
      depth: Math.max(0.001, depth - bv * 2), bevelEnabled: bv > 0, bevelThickness: bv, bevelSize: bv, bevelSegments: 4, curveSegments: curve,
    })
    geo.translate(0, 0, z0 + bv)
    return this.add(geo, m)
  }

  /** 옆에서 본 모양(z, y)을 가로로 민다. x0 = 왼쪽 */
  extX(shape: ShapeFn, width: number, bevel: number, m: THREE.Material, x0: number) {
    const bv = Math.min(bevel, width / 2 - 0.001)
    const geo = new THREE.ExtrudeGeometry(shape(bv), {
      depth: Math.max(0.001, width - bv * 2), bevelEnabled: bv > 0, bevelThickness: bv, bevelSize: bv, bevelSegments: 4, curveSegments: 24,
    })
    geo.translate(0, 0, bv)
    geo.rotateY(PI / 2) // 모양의 x → 월드 -z, 너비 → +x
    geo.translate(x0, 0, 0)
    return this.add(geo, m)
  }

  /** 층마다 (y, 폭, 깊이, z 중심, 모서리)를 주면 볼록한 덩어리로 감싼다 (프리즘, 그립) */
  hull(layers: [number, number, number, number, number][], m: THREE.Material, smooth = false) {
    const pts: THREE.Vector3[] = []
    for (const [y, w, d, zc, r] of layers) {
      const rr = Math.max(0.001, Math.min(r, w / 2, d / 2))
      for (let i = 0; i < 4; i++) {
        const cx = (i === 0 || i === 3 ? 1 : -1) * (w / 2 - rr)
        const cz = zc + (i < 2 ? 1 : -1) * (d / 2 - rr)
        const a0 = [0, PI / 2, PI, PI * 1.5][i]
        const steps = r > 0.05 ? 5 : 1
        for (let s = 0; s <= steps; s++) {
          const a = a0 + ((PI / 2) * s) / steps
          pts.push(new THREE.Vector3(cx + Math.cos(a) * rr, y, cz + Math.sin(a) * rr))
        }
      }
    }
    let geo: THREE.BufferGeometry = new ConvexGeometry(pts)
    if (smooth) {
      geo.deleteAttribute('normal')
      geo.deleteAttribute('uv')
      geo = mergeVertices(geo, 0.01)
      geo.computeVertexNormals()
    }
    return this.add(geo, m)
  }

  /** +z를 향한 원통. z = 뒤쪽 끝. side/cap 재질을 따로 줄 수 있다 */
  cylZ(r: number, len: number, m: THREE.Material | THREE.Material[], x: number, y: number, z: number, rBack = r, seg = 64) {
    const mesh = this.add(new THREE.CylinderGeometry(r, rBack, len, seg), m as THREE.Material)
    mesh.rotation.x = PI / 2
    mesh.position.set(x, y, z + len / 2)
    return mesh
  }

  cylY(r: number, h: number, m: THREE.Material | THREE.Material[], x: number, y: number, z: number, rBottom = r) {
    const mesh = this.add(new THREE.CylinderGeometry(r, rBottom, h, 48), m as THREE.Material)
    mesh.position.set(x, y, z)
    return mesh
  }

  cylX(r: number, h: number, m: THREE.Material, x: number, y: number, z: number) {
    const mesh = this.add(new THREE.CylinderGeometry(r, r, h, 48), m)
    mesh.rotation.z = PI / 2
    mesh.position.set(x, y, z)
    return mesh
  }

  /** 앞을 보는 고리 */
  ringZ(rIn: number, rOut: number, m: THREE.Material, x: number, y: number, z: number) {
    const mesh = this.add(new THREE.RingGeometry(rIn, rOut, 64), m)
    mesh.position.set(x, y, z)
    return mesh
  }

  /** 톱니 (축 둘레 가는 막대) */
  ridges(axis: 'x' | 'y' | 'z', r: number, len: number, count: number, m: THREE.Material, x: number, y: number, z: number, size = 0.1) {
    const geo = axis === 'z' ? new THREE.BoxGeometry(size, size * 1.2, len) : axis === 'y' ? new THREE.BoxGeometry(size, len, size * 1.2) : new THREE.BoxGeometry(len, size, size * 1.2)
    const inst = new THREE.InstancedMesh(geo, m, count)
    const o = new THREE.Object3D()
    for (let i = 0; i < count; i++) {
      const a = (i / count) * PI * 2
      if (axis === 'z') { o.position.set(x + r * Math.cos(a), y + r * Math.sin(a), z + len / 2); o.rotation.set(0, 0, a) }
      else if (axis === 'y') { o.position.set(x + r * Math.cos(a), y, z + r * Math.sin(a)); o.rotation.set(0, -a, 0) }
      else { o.position.set(x, y + r * Math.cos(a), z + r * Math.sin(a)); o.rotation.set(-a, 0, 0) }
      o.updateMatrix()
      inst.setMatrixAt(i, o.matrix)
    }
    this.group.add(inst)
  }

  // --- 부품

  /** 셔터 속도 다이얼 (숫자 새김). y = 바닥 */
  speedDial(x: number, y: number, z: number, r: number, h: number, labels = ['B', '1', '2', '4', '8', '15', '30', '60', '125', '250', '500', '1000']) {
    const k = this.k
    this.cylY(r, h, k.accent, x, y + h / 2, z)
    this.ridges('y', r, h * 0.85, 40, k.accent, x, y + h / 2, z, 0.08)
    const labelMat = new THREE.MeshBasicMaterial({ map: dialTex(labels, k.ink), transparent: true })
    labelMat.name = `dial:${labels.join(',')}`
    const label = this.add(new THREE.CircleGeometry(r * 0.95, 48), labelMat)
    label.rotation.x = -PI / 2
    label.position.set(x, y + h + 0.005, z)
  }

  knob(x: number, y: number, z: number, r: number, h: number) {
    this.cylY(r, h, this.k.accent, x, y + h / 2, z)
    this.ridges('y', r, h * 0.8, 28, this.k.accent, x, y + h / 2, z, 0.08)
  }

  /**
   * 필름 감는 레버: 셔터 버튼과 같은 축에 얇은 판이 납작하게 얹혀, 쉬는 위치에서는 윗판을 따라 몸 쪽(+x, 뒤)으로 눕는다.
   * 끝에는 작은 플라스틱 손잡이. y = 윗판 높이(축 바닥)
   */
  lever(x: number, y: number, z: number, length: number, angle: number) {
    const k = this.k
    this.cylY(0.5, 0.1, k.accent, x, y + 0.05, z) // 축 받침
    const arm = this.extY(() => {
      const s = new THREE.Shape()
      s.moveTo(0, -0.34)
      s.lineTo(length * 0.75, -0.2)
      s.quadraticCurveTo(length, -0.2, length, 0.02)
      s.lineTo(length, 0.12)
      s.quadraticCurveTo(length * 0.85, 0.2, length * 0.6, 0.2)
      s.lineTo(0, 0.34)
      s.absarc(0, 0, 0.34, PI / 2, PI * 1.5, false)
      return s
    }, 0.09, 0.02, k.accent, y + 0.1)
    arm.rotation.y = angle
    arm.position.set(x, 0, z)
    // 끝 손잡이: 살짝 위로 솟은 납작한 플라스틱
    const tip = this.box(0.7, 0.26, 0.42, 0.1, k.lensBlack, 0, 0, 0)
    tip.position.set(x + Math.cos(angle) * (length - 0.25), y + 0.26, z - Math.sin(angle) * (length - 0.25))
    tip.rotation.y = angle
  }

  shutterButton(x: number, y: number, z: number, red = false) {
    this.cylY(0.42, 0.14, this.k.accent, x, y + 0.07, z)
    this.cylY(0.26, 0.24, red ? this.k.red : this.k.accent, x, y + 0.2, z)
  }

  hotShoe(x: number, y: number, z: number) {
    this.box(1.9, 0.22, 1.9, 0.04, this.k.accent, x, y + 0.11, z)
    this.box(1.5, 0.08, 1.7, 0.02, this.k.lensBlack, x, y + 0.24, z)
  }

  lugs(halfW: number, y: number, z = 0) {
    for (const s of [-1, 1]) {
      const m = this.add(new THREE.TorusGeometry(0.28, 0.07, 10, 24), this.k.accent)
      m.position.set(s * (halfW + 0.12), y, z)
      m.rotation.y = PI / 2
    }
  }

  /** 앞면 창 (테두리 + 유리) */
  windowAt(w: number, h: number, x: number, y: number, z: number, m: THREE.Material = this.k.window) {
    this.box(w + 0.16, h + 0.16, 0.12, 0.08, this.k.accent, x, y, z + 0.02)
    this.box(w, h, 0.14, 0.06, m, x, y, z + 0.04)
  }

  /** 렌즈 앞 테두리 글씨 */
  frontRing(rIn: number, rOut: number, x: number, y: number, z: number) {
    const tex = canvasTex('frontring', 512, 512, (ctx) => {
      ctx.fillStyle = '#121214'
      ctx.beginPath(); ctx.arc(256, 256, 256, 0, PI * 2); ctx.fill()
      ctx.fillStyle = '#e6e6e6'
      ctx.font = '600 26px Helvetica, Arial, sans-serif'
      ctx.textAlign = 'center'
      const text = 'LENS  1:1.8  f=50mm  ⌀52  ·  MULTI COATED  ·  '
      const R = 222
      for (let i = 0; i < text.length; i++) {
        const a = -PI * 0.95 + (i / text.length) * PI * 1.9
        ctx.save(); ctx.translate(256 + Math.cos(a) * R, 256 + Math.sin(a) * R); ctx.rotate(a + PI / 2)
        ctx.fillText(text[i], 0, 0); ctx.restore()
      }
    })
    const geo = new THREE.RingGeometry(rIn, rOut, 64)
    // RingGeometry UV는 바깥 지름 기준 사각형 → 원형 텍스처를 그대로 맞춘다
    const uv = geo.attributes.uv as THREE.BufferAttribute
    const pos = geo.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / (rOut * 2) + 0.5, pos.getY(i) / (rOut * 2) + 0.5)
    const mat = new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.5, metalness: 0.2 })
    mat.name = 'frontring'
    const mesh = this.add(geo, mat)
    mesh.position.set(x, y, z)
  }

  /** 렌즈 유리 + 안쪽 깊이 */
  glassFront(r: number, x: number, y: number, z: number, recess = 0.3) {
    // 경통 앞면 위에 얹는다 (원통 뚜껑에 가려지지 않게). 안쪽 검은 테로 깊이감만 낸다.
    void recess
    const recessMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.8 })
    recessMat.name = 'recess'
    this.ringZ(r * 0.86, r, recessMat, x, y, z + 0.004)
    const g = this.add(new THREE.CircleGeometry(r * 0.86, 64), this.k.glass)
    g.position.set(x, y, z + 0.006)
  }

  /**
   * 렌즈. z = 마운트 면, 앞(+z)으로 len만큼.
   * prime: 수동 SLR 렌즈 / af: AF 렌즈 / small: RF·하프 렌즈 / fixed: 똑딱이·고정 렌즈 / mf: 중형 / leica: 라이카 M
   */
  lens(type: string, r: number, len: number, z: number, x = 0, y = 0) {
    const k = this.k
    const sideTex = (labels: string[]) => {
      const m = new THREE.MeshPhysicalMaterial({ map: scaleTex(labels), roughness: 0.45, metalness: 0.2, clearcoat: 0.4 })
      m.name = `scale:${labels.join(',')}`
      return m
    }
    const apert = sideTex(['16', '11', '8', '5.6', '4', '2.8', '2'])
    const dist = sideTex(['∞', '10', '5', '3', '2', '1.5', '1', '.7', 'm'])
    const withSide = (m: THREE.Material) => [m, k.lensBlack, k.lensBlack]
    let zz = z
    const seg = (rr: number, l: number, m: THREE.Material | THREE.Material[], rBack = rr) => { this.cylZ(rr, l, m, x, y, zz, rBack); zz += l }

    if (type === 'af') {
      this.cylZ(r * 1.12, 0.3, k.accent, x, y, zz); zz += 0.3
      seg(r * 0.98, len * 0.18, k.lensSatin, r * 1.02)
      this.ridges('z', r * 1.0, len * 0.08, 70, k.rubber, x, y, zz, 0.07)
      seg(r * 0.99, len * 0.1, k.rubber)
      seg(r * 1.0, len * 0.12, withSide(dist))
      this.ridges('z', r * 1.04, len * 0.3, 90, k.rubber, x, y, zz, 0.08)
      seg(r * 1.04, len * 0.32, k.rubber)
      seg(r * 1.03, len * 0.28, k.lensSatin)
      this.ringZ(r * 0.82, r * 1.03, k.lensBlack, x, y, zz + 0.001)
      this.glassFront(r * 0.82, x, y, zz, 0.5)
      return
    }
    if (type === 'fixed') {
      seg(r * 1.25, len * 0.25, k.accent, r * 1.3)
      seg(r * 1.05, len * 0.35, k.lensBlack)
      seg(r * 1.0, len * 0.4, k.lensSatin)
      this.ringZ(r * 0.78, r * 1.0, k.lensBlack, x, y, zz + 0.001)
      this.glassFront(r * 0.78, x, y, zz, 0.2)
      return
    }
    if (type === 'leica' || type === 'small') {
      this.cylZ(r * 1.1, 0.2, k.accent, x, y, zz); zz += 0.2
      seg(r * 1.0, len * 0.22, withSide(dist))
      this.ridges('z', r * 1.0, len * 0.16, 40, k.lensBlack, x, y, zz, 0.08)
      seg(r * 0.98, len * 0.2, k.lensBlack)
      seg(r * 0.96, len * 0.18, withSide(apert))
      seg(r * 0.92, len * 0.4, k.lensBlack)
      if (type === 'leica') {
        // 초점 손잡이(탭)
        this.box(0.5, 0.5, 0.3, 0.15, k.lensBlack, x, y - r * 1.1, z + 0.2 + len * 0.1)
      }
      this.ringZ(r * 0.7, r * 0.92, k.lensBlack, x, y, zz + 0.001)
      this.glassFront(r * 0.7, x, y, zz, 0.3)
      return
    }
    if (type === 'mf') {
      this.cylZ(r * 1.1, 0.4, k.accent, x, y, zz); zz += 0.4
      seg(r * 1.0, len * 0.14, withSide(sideTex(['1', '2', '4', '8', '15', '30', '60', '125', '250', '500'])))
      this.ridges('z', r * 1.01, len * 0.08, 40, k.lensBlack, x, y, zz, 0.12)
      seg(r * 1.0, len * 0.1, k.lensBlack)
      seg(r * 0.98, len * 0.12, withSide(apert))
      this.ridges('z', r * 1.04, len * 0.3, 80, k.rubber, x, y, zz, 0.12)
      seg(r * 1.04, len * 0.3, k.rubber)
      seg(r * 0.96, len * 0.25, k.lensBlack)
      this.ringZ(r * 0.78, r * 0.96, k.lensBlack, x, y, zz + 0.001)
      this.glassFront(r * 0.78, x, y, zz, 0.5)
      return
    }
    // prime (수동 SLR 렌즈)
    this.cylZ(r * 1.12, 0.25, k.accent, x, y, zz); zz += 0.25
    this.ridges('z', r * 1.03, len * 0.12, 18, k.lensBlack, x, y, zz, 0.16)
    seg(r * 1.0, len * 0.12, withSide(apert))
    seg(r * 0.97, len * 0.08, k.lensBlack)
    seg(r * 0.99, len * 0.12, withSide(dist))
    this.ridges('z', r * 1.04, len * 0.3, 72, k.rubber, x, y, zz, 0.09)
    seg(r * 1.04, len * 0.3, k.rubber)
    seg(r * 0.98, len * 0.32, k.lensBlack)
    this.ringZ(r * 0.8, r * 0.98, k.lensBlack, x, y, zz + 0.001)
    this.glassFront(r * 0.8, x, y, zz, 0.35)
  }

  /** 셀레늄 노출계 (렌즈 둘레 벌집 무늬) */
  selenium(r: number, x: number, y: number, z: number) {
    const k = this.k
    this.cylZ(r * 1.65, 0.35, k.accent, x, y, z)
    const cells = new THREE.InstancedMesh(new THREE.SphereGeometry(0.11, 8, 6), k.frosted, 120)
    const o = new THREE.Object3D()
    let i = 0
    for (let ring = 0; ring < 3; ring++) {
      const rr = r * (1.18 + ring * 0.15)
      const n = 40
      for (let j = 0; j < n && i < 120; j++, i++) {
        const a = (j / n) * PI * 2 + ring * 0.08
        o.position.set(x + rr * Math.cos(a), y + rr * Math.sin(a), z + 0.36)
        o.updateMatrix()
        cells.setMatrixAt(i, o.matrix)
      }
    }
    this.group.add(cells)
  }
}

// --- 형태별 조립

function prismLayers(p: ModelProfile, w: number, d: number, h: number): [number, number, number, number, number][] {
  // [아래 폭, 위 폭, 아래 깊이, 위 깊이, 높이, 위쪽이 뒤로 물러난 정도, 모서리]
  const spec: Record<string, number[]> = {
    nikon: [0.5, 0.26, 0.92, 0.46, 0.4, 0.12, 0.15],
    canon: [0.46, 0.3, 0.92, 0.5, 0.42, 0.08, 0.35],
    om: [0.4, 0.2, 0.86, 0.4, 0.34, 0.1, 0.3],
    tall: [0.48, 0.32, 0.95, 0.6, 0.48, 0.1, 0.15],
    pointed: [0.46, 0.14, 0.9, 0.34, 0.44, 0.12, 0.12],
    f: [0.5, 0.42, 0.95, 0.72, 0.42, 0.06, 0.12],
    round: [0.5, 0.24, 0.9, 0.42, 0.4, 0.1, 0.8],
  }
  const [bw, tw, bd, td, ph, back, r] = spec[p.prism ?? 'nikon']
  const H = h * ph
  return [
    [0, w * bw, d * bd, 0, 0.1],
    [H * 0.15, w * bw * 0.98, d * bd * 0.97, -d * back * 0.1, r * 0.6],
    [H - r * 0.5, w * tw, d * td, -d * back, r],
    [H, w * tw - r * 0.8, d * td - r * 0.8, -d * back, r * 0.5],
  ]
}

function buildSLR(b: Builder, p: ModelProfile) {
  // 치수의 높이는 프리즘까지 포함한 전체 높이
  const [w, H, d] = p.body
  const h = H * 0.7
  const k = b.k
  const topH = h * 0.3
  const y0 = -H / 2
  const top = y0 + h
  // 몸체: 금속 뼈대 + 앞뒤 가죽 + 위 판
  b.extY((i) => rrect(w - i * 2, d - i * 2, 0.55), h - topH, 0.12, k.plate, y0)
  b.extY((i) => rrect(w - 0.5 - i * 2, d + 0.08 - i * 2, 0.45), h - topH - 0.9, 0.03, k.leather, y0 + 0.45)
  b.extY((i) => rrect(w - i * 2, d - i * 2, 0.6), topH, 0.28, k.plate, top - topH)
  // 펜타프리즘
  const layers = prismLayers(p, w, d, H * 0.3 / 0.4)
  const prism = b.hull(layers, k.plate, p.prism === 'round')
  prism.position.set(0, top - 0.05, 0.1)
  const [ph, ptw, ptd, pz] = [layers[3][0], layers[3][1], layers[3][2], layers[3][3]]
  b.hotShoe(0, top - 0.05 + ph - 0.05, pz + 0.1)
  if (p.prism === 'canon') b.box(w * 0.26, H * 0.08, 0.2, 0.08, k.accent, 0, top + H * 0.06, d * 0.4) // 이름판
  void ptw; void ptd
  // 뒤 접안부
  b.box(2.1, 1.5, 0.8, 0.3, k.rubber, 0, top + H * 0.1, -d / 2 - 0.2)

  // 오른손 쪽(-x): 셔터 다이얼, 레버, 셔터 버튼
  const dx = -w * 0.3
  b.speedDial(dx + w * 0.04, top, -d * 0.12, Math.min(1.05, w * 0.075), 0.45)
  const bx = -w * 0.4, bz = d * 0.2
  if (p.lever) b.lever(bx, top, bz, Math.min(3.4, w * 0.24), -0.22)
  b.shutterButton(bx, top + (p.lever ? 0.19 : 0), bz)
  // 왼손 쪽(+x): 되감기 노브 + 감도 다이얼
  b.cylY(1.2, 0.18, k.accent, w * 0.32, top + 0.09, 0)
  b.knob(w * 0.32, top + 0.18, 0, 0.85, 0.5)
  // 앞: 셀프타이머 레버, 렌즈 분리 버튼
  b.box(0.5, 1.6, 0.35, 0.15, k.accent, -w * 0.3, y0 + h * 0.55, d / 2 + 0.15, 0, 0.35)
  b.cylZ(0.3, 0.3, k.accent, w * 0.2, y0 + h * 0.35, d / 2)
  b.lugs(w / 2, top - topH / 2)
  // 마운트 + 렌즈
  const ly = y0 + h * 0.45
  b.cylZ(p.lensR * 1.22, 0.35, k.accent, 0, ly, d / 2 - 0.05)
  b.lens(p.lens ?? 'prime', p.lensR, p.lensLen, d / 2 + 0.3, 0, ly)
  if (p.grip) {
    b.extZ((i) => rrect(1.6 - i * 2, h * 0.68 - i * 2, 0.6), 0.9, 0.3, k.leather, d / 2 - 0.2).position.set(-w * 0.42, y0 + h * 0.45, 0)
  }
}

function buildAFSLR(b: Builder, p: ModelProfile) {
  const [w, h, d] = p.body
  const k = b.k
  const y0 = -h / 2
  const hb = h * 0.76 // 어깨 높이까지 (치수 높이는 프리즘 포함)
  const gw = w * 0.26
  const gd = d * 0.32
  // 몸체 + 그립(-x)
  b.extY((i) => rrect(w - i * 2, d - i * 2, [1.0, 1.4, 1.4, 1.0]), hb, 0.7, k.plastic, y0)
  b.extY((i) => rrect(gw - i * 2, d + gd - i * 2, [1.2, 1.0, 2.2, 2.2], -w / 2 + gw / 2, gd / 2), hb * 0.97, 0.9, k.rubber, y0 + 0.02)
  // 둥근 프리즘
  const pr = b.hull([
    [0, w * 0.52, d * 0.95, 0, 0.6],
    [h * 0.1, w * 0.42, d * 0.8, -0.2, 1.0],
    [h * 0.2, w * 0.3, d * 0.56, -0.4, 1.1],
    [h * 0.26, w * 0.2, d * 0.4, -0.5, 0.8],
  ], k.plastic, true)
  pr.position.set(0, y0 + hb - 0.4, 0.2)
  b.hotShoe(0, y0 + hb + h * 0.26 - 0.45, -0.3)
  // 어깨: 오른손 쪽 LCD, 왼손 쪽 모드 다이얼
  b.box(w * 0.2, 0.12, d * 0.42, 0.05, k.window, -w * 0.26, y0 + hb + 0.02, -0.2)
  b.speedDial(w * 0.3, y0 + hb - 0.05, -0.2, 1.1, 0.5, ['P', 'S', 'A', 'M', '', '', '', '', ''])
  // 그립 위 셔터 버튼 + 앞 다이얼
  b.shutterButton(-w / 2 + gw * 0.55, y0 + hb - 0.1, d / 2 + gd * 0.25)
  b.cylX(0.9, 0.3, k.lensSatin, -w / 2 + gw * 0.85, y0 + hb - 0.6, d / 2 + gd * 0.45)
  b.box(2.1, 1.6, 0.9, 0.4, k.rubber, 0, y0 + hb + h * 0.1, -d / 2 - 0.2)
  b.lugs(w / 2, y0 + hb - 1.0)
  const ly = y0 + hb * 0.48
  b.cylZ(p.lensR * 1.2, 0.3, k.accent, 0, ly, d / 2 - 0.05)
  b.lens('af', p.lensR, p.lensLen, d / 2 + 0.25, 0, ly)
}

function buildRF(b: Builder, p: ModelProfile, flat = false) {
  const [w, h, d] = p.body
  const k = b.k
  const topH = h * 0.3
  const y0 = -h / 2
  const top = h / 2
  const r = p.roundEnds ? d / 2 - 0.02 : 0.6
  b.extY((i) => rrect(w - i * 2, d - i * 2, r), h, 0.22, k.plate, y0)
  if (p.roundEnds) b.extY((i) => rrect(w + 0.06 - i * 2, d + 0.08 - i * 2, r + 0.03), h - topH - 0.55, 0.02, k.leather, y0 + 0.35)
  else b.extY((i) => rrect(w - 0.5 - i * 2, d + 0.08 - i * 2, 0.4), h - topH - 0.55, 0.02, k.leather, y0 + 0.35)
  // 위판 경계선
  b.extY((i) => rrect(w + 0.02 - i * 2, d + 0.02 - i * 2, r), 0.05, 0, k.lensSatin, top - topH - 0.05)

  const wy = top - topH / 2 - 0.05
  const fz = d / 2
  if (!flat) {
    b.windowAt(w * 0.15, topH * 0.5, w * 0.3, wy, fz) // 뷰파인더 (+x)
    if (p.windows !== 'two') b.windowAt(w * 0.09, topH * 0.4, w * 0.12, wy, fz, k.frosted) // 프레임 조명
    b.windowAt(w * 0.07, topH * 0.4, -w * 0.31, wy, fz) // 거리계 (-x)
  }
  if (p.badge === 'red') b.cylZ(0.3, 0.08, k.red, -w * 0.1, wy, fz)

  const fixedLens = p.lens === 'fixed'
  if (!fixedLens) b.speedDial(-w * 0.22, top, 0, Math.min(1.0, w * 0.075), 0.45)
  if (p.lever) b.lever(-w * 0.37, top, d * 0.1, Math.min(2.8, w * 0.2), -0.2)
  b.shutterButton(-w * 0.37, top + (p.lever ? 0.19 : 0), d * 0.1)
  b.knob(w * 0.36, top, 0, 0.8, 0.45)
  b.hotShoe(w * 0.08, top, 0)
  if (p.grip) b.extZ((i) => rrect(1.7 - i * 2, h * 0.7 - i * 2, 0.6), 0.9, 0.3, k.leather, d / 2 - 0.2).position.set(-w * 0.42, -h * 0.08, 0)
  b.lugs(w / 2, top - topH / 2)

  const lx = p.lensX ?? 0
  const ly = -h * 0.08
  let lz = fz
  if (p.selenium) { b.selenium(p.lensR, lx, ly, fz); lz += 0.35 }
  b.cylZ(p.lensR * 1.2, 0.25, k.accent, lx, ly, lz - 0.05)
  b.lens(p.lens ?? 'small', p.lensR, p.lensLen, lz + 0.2, lx, ly)
}

function buildCompact(b: Builder, p: ModelProfile) {
  const [w, h, d] = p.body
  const k = b.k
  const y0 = -h / 2
  const top = h / 2
  const shape = p.shape ?? 'box'
  const r = shape === 'round' ? d / 2 - 0.02 : shape === 'pill' ? d * 0.42 : Math.min(0.8, d * 0.25)
  const bevel = shape === 'box' ? 0.35 : 0.6
  b.extY((i) => rrect(w - i * 2, d - i * 2, r), h, bevel, k.plastic, y0)

  const lx = p.lensX ?? 0
  const ly = -h * 0.06
  const fz = d / 2
  // 렌즈 둘레가 앞으로 튀어나온 부분
  if (shape === 'pill') {
    b.extZ((i) => rrect(p.lensR * 3.2 - i * 2, h * 0.86 - i * 2, p.lensR * 1.5), 0.9, 0.35, k.plastic, fz - 0.5).position.set(lx, ly * 0.5, 0)
  } else if (p.lensLen > 1.4) {
    b.extZ((i) => rrect(p.lensR * 3 - i * 2, p.lensR * 3 - i * 2, p.lensR * 0.9), 0.6, 0.25, k.plate, fz - 0.3).position.set(lx, ly, 0)
  }
  let lz = fz + (shape === 'pill' ? 0.35 : p.lensLen > 1.4 ? 0.25 : 0)
  if (p.selenium) { b.selenium(p.lensR, lx, ly, lz); lz += 0.35 }
  b.lens('fixed', p.lensR, p.lensLen, lz, lx, ly)

  // 앞 위쪽 창: 뷰파인더, AF 창, 플래시
  const wy = top - h * 0.17
  const flashSide = p.flash === 'left' ? -1 : 1
  b.windowAt(w * 0.09, h * 0.11, -flashSide * w * 0.12 + (lx > 0 ? -w * 0.05 : 0), wy, fz - 0.05)
  b.windowAt(w * 0.045, h * 0.07, -flashSide * w * 0.26, wy, fz - 0.05)
  b.windowAt(w * 0.045, h * 0.07, -flashSide * w * 0.36, wy, fz - 0.05)
  if (p.flash !== 'none') b.windowAt(w * 0.15, h * 0.13, flashSide * w * 0.33, wy, fz - 0.05, k.frosted)
  // 위: 셔터(오른손 쪽 -x), 작은 LCD
  b.shutterButton(-w * 0.32, top - 0.05 + (p.lever ? 0.19 : 0), 0, p.badge === 'redbutton')
  if (!p.lever) b.box(w * 0.16, 0.08, d * 0.35, 0.03, k.window, w * 0.12, top - 0.02, -d * 0.05)
  if (p.lever) b.lever(-w * 0.32, top - 0.05, 0, 2.4, -0.2)
  if (p.grip) b.extZ((i) => rrect(w * 0.16 - i * 2, h * 0.8 - i * 2, 0.5), 0.5, 0.2, k.rubber, fz - 0.3).position.set(-w * 0.38, -0.1, 0)
  b.lugs(w / 2 - 0.1, top - h * 0.25)
}

function buildClamshell(b: Builder, p: ModelProfile) {
  const [w, h, d] = p.body
  const k = b.k
  const y0 = -h / 2
  const fz = d / 2
  const pebble = p.shape !== 'box'
  b.extY((i) => rrect(w - i * 2, d - i * 2, pebble ? d / 2 - 0.02 : 0.7), h, pebble ? Math.min(1.4, h * 0.25) : 0.4, k.plastic, y0)
  // 열린 덮개: 몸체 앞면 일부가 한쪽으로 밀려나 있다
  const coverW = w * 0.46
  const cover = b.extZ((i) => rrect(coverW - i * 2, h * 0.88 - i * 2, pebble ? h * 0.4 : 0.5), 0.55, pebble ? 0.25 : 0.12, k.plastic, fz - 0.35)
  cover.position.set(-w / 2 + coverW / 2 + 0.2, 0, 0)
  if (!pebble) for (let i = 0; i < 9; i++) b.box(0.08, h * 0.7, 0.08, 0.02, k.lensSatin, -w / 2 + coverW - 0.3 - i * 0.16, 0, fz + 0.22)
  const lx = p.lensX ?? w * 0.08
  b.cylZ(p.lensR * 1.6, 0.25, k.lensBlack, lx, 0, fz - 0.15)
  b.lens('fixed', p.lensR, p.lensLen, fz + 0.05, lx, 0)
  b.windowAt(w * 0.09, h * 0.12, w * 0.33, h * 0.28, fz - 0.15)
  b.windowAt(w * 0.12, h * 0.14, -w * 0.3, h * 0.28, fz + 0.15, k.frosted)
  b.shutterButton(-w * 0.28, h / 2 - (pebble ? 0.25 : 0.05), 0, p.badge === 'redbutton')
}

function buildTLR(b: Builder, p: ModelProfile) {
  const [w, h, d] = p.body
  const k = b.k
  const y0 = -h / 2
  const fz = d / 2
  b.extY((i) => rrect(w - i * 2, d - i * 2, 0.5), h, 0.2, k.plate, y0)
  b.extY((i) => rrect(w + 0.06 - i * 2, d + 0.06 - i * 2, 0.52), h - 1.2, 0.02, k.leather, y0 + 0.6)
  // 렌즈판
  const board = b.extZ((i) => rrect(w * 0.84 - i * 2, h * 0.82 - i * 2, 0.4), 1.4, 0.2, k.plate, fz - 0.1)
  board.position.set(0, -h * 0.04, 0)
  const bz = fz + 1.3
  const upY = h * 0.19, loY = -h * 0.2
  b.lens('small', p.lensR * 0.95, p.lensLen * 0.9, bz, 0, upY)
  b.lens('mf', p.lensR, p.lensLen, bz, 0, loY)
  // 이름판 + 양옆 조리개/셔터 휠
  b.box(w * 0.6, h * 0.07, 0.25, 0.06, k.accent, 0, upY - p.lensR * 1.25, bz + 0.1)
  for (const s of [-1, 1]) {
    b.cylZ(0.75, 0.35, k.accent, s * w * 0.32, (upY + loY) / 2 - 0.3, bz - 0.1)
    b.ridges('z', 0.75, 0.3, 24, k.accent, s * w * 0.32, (upY + loY) / 2 - 0.3, bz - 0.08, 0.07)
  }
  // 웨이스트 레벨 파인더 (접힌 후드)
  b.extY((i) => rrect(w * 0.94 - i * 2, d * 0.94 - i * 2, 0.4), 1.5, 0.15, k.plate, h / 2)
  b.box(w * 0.88, 0.12, d * 0.88, 0.05, k.lensBlack, 0, h / 2 + 1.52, 0)
  b.box(w * 0.4, 0.15, 0.6, 0.05, k.accent, 0, h / 2 + 1.55, d * 0.3)
  // 초점 노브(+x), 크랭크(-x)
  b.cylX(h * 0.12, 0.7, k.accent, w / 2 + 0.35, h * 0.12, -d * 0.05)
  b.ridges('x', h * 0.12, 0.6, 40, k.accent, w / 2 + 0.35, h * 0.12, -d * 0.05, 0.1)
  b.cylX(h * 0.08, 0.5, k.accent, -w / 2 - 0.25, h * 0.05, d * 0.05)
  b.box(0.3, h * 0.13, 0.5, 0.12, k.accent, -w / 2 - 0.55, h * 0.05 - h * 0.06, d * 0.05)
  b.cylX(0.3, 0.7, k.lensBlack, -w / 2 - 0.9, h * 0.05 - h * 0.12, d * 0.05)
  b.lugs(w / 2, h * 0.32)
}

function buildCube(b: Builder, p: ModelProfile) {
  const [w, h, d] = p.body
  const k = b.k
  const y0 = -h / 2
  const cham = (i: number) => {
    const c = 0.9 - i, x = w / 2 - i, z = d / 2 - i
    return new THREE.Shape([[-x + c, -z], [x - c, -z], [x, -z + c], [x, z - c], [x - c, z], [-x + c, z], [-x, z - c], [-x, -z + c]].map(([a, b2]) => new THREE.Vector2(a, b2)))
  }
  b.extY(cham, h, 0.15, k.plate, y0)
  b.extY((i) => cham(i - 0.04), h * 0.76, 0.02, k.leather, y0 + h * 0.12)
  // 필름 매거진 (뒤)
  const md = 3.4
  const mag = b.extY((i) => rrect(w * 1.02 - i * 2, md - i * 2, 0.4), h * 1.02, 0.2, k.plate, y0 - h * 0.01)
  mag.position.z = -d / 2 - md / 2 - 0.12
  b.box(w * 0.98, h * 0.05, md * 0.8, 0.05, k.lensSatin, 0, y0 + h * 0.98, -d / 2 - md / 2 - 0.12) // 다크 슬라이드 틈
  b.extY((i) => rrect(w * 1.03 - i * 2, md * 0.7 - i * 2, 0.3), h * 0.7, 0.02, k.leather, y0 + h * 0.15).position.z = -d / 2 - md / 2 - 0.12
  // 웨이스트 레벨 파인더
  b.extY((i) => rrect(w * 0.94 - i * 2, d * 0.94 - i * 2, 0.4), 1.8, 0.15, k.plate, h / 2)
  b.box(w * 0.86, 0.12, d * 0.86, 0.05, k.lensBlack, 0, h / 2 + 1.82, 0)
  // 감는 노브 (-x)
  b.cylX(1.9, 0.9, k.accent, -w / 2 - 0.45, h * 0.05, -0.4)
  b.ridges('x', 1.9, 0.8, 36, k.accent, -w / 2 - 0.45, h * 0.05, -0.4, 0.12)
  b.cylX(0.6, 1.05, k.lensBlack, -w / 2 - 0.5, h * 0.05, -0.4)
  b.cylZ(0.35, 0.3, k.accent, w * 0.32, h * 0.32, d / 2) // 셔터 버튼 (앞)
  const ly = -h * 0.04
  b.cylZ(p.lensR * 1.08, 0.5, k.accent, 0, ly, d / 2 - 0.1)
  b.lens('mf', p.lensR, p.lensLen, d / 2 + 0.4, 0, ly)
}

function buildRB(b: Builder, p: ModelProfile) {
  const [w, h, d] = p.body
  const k = b.k
  const y0 = -h / 2
  b.extY((i) => rrect(w - i * 2, d - i * 2, 0.6), h, 0.3, k.plastic, y0)
  // 회전 백
  b.extZ((i) => rrect(w * 1.06 - i * 2, h * 1.06 - i * 2, 0.6), 3.0, 0.25, k.plate, -d / 2 - 3.0)
  // 파인더
  b.extY((i) => rrect(w * 0.9 - i * 2, d * 0.8 - i * 2, 0.4), 2.4, 0.15, k.plate, h / 2).position.z = -0.4
  // 주름 상자
  for (let i = 0; i < 9; i++) b.box(w * (0.78 - (i % 2) * 0.04), h * (0.74 - (i % 2) * 0.04), 0.4, 0.25, k.rubber, 0, -0.5, d / 2 + 0.2 + i * 0.36)
  b.box(w * 0.82, h * 0.82, 0.8, 0.3, k.plate, 0, -0.5, d / 2 + 3.6)
  // 초점 노브 양쪽
  for (const s of [-1, 1]) {
    b.cylX(1.5, 0.8, k.accent, s * (w / 2 + 0.4), -h * 0.28, d * 0.2)
    b.ridges('x', 1.5, 0.7, 30, k.accent, s * (w / 2 + 0.4), -h * 0.28, d * 0.2, 0.1)
  }
  b.lens('mf', p.lensR, p.lensLen * 0.8, d / 2 + 4.0, 0, -0.5)
}

function buildMF645(b: Builder, p: ModelProfile) {
  const [w, h, d] = p.body
  const k = b.k
  const y0 = -h / 2
  const bw = w * 0.72
  const bx = w / 2 - bw / 2
  b.extY((i) => rrect(bw - i * 2, d - i * 2, 0.6, bx), h * 0.78, 0.3, k.plastic, y0).position.x = 0
  // 손잡이 (-x)
  b.extY((i) => rrect(w * 0.3 - i * 2, d * 0.85 - i * 2, [1.5, 1.5, 1.5, 1.5], -w / 2 + w * 0.15, 0.4), h * 0.95, 0.8, k.rubber, y0)
  b.shutterButton(-w / 2 + w * 0.15, y0 + h * 0.95 - 0.05, d * 0.3)
  // 프리즘
  const pr = b.hull([[0, bw * 0.8, d * 0.9, 0, 0.5], [h * 0.12, bw * 0.6, d * 0.62, -0.4, 0.9], [h * 0.22, bw * 0.42, d * 0.45, -0.6, 0.6]], k.plastic, true)
  pr.position.set(bx, y0 + h * 0.78 - 0.3, 0)
  const ly = -h * 0.12
  b.cylZ(p.lensR * 1.12, 0.5, k.accent, bx, ly, d / 2 - 0.1)
  b.lens('mf', p.lensR, p.lensLen, d / 2 + 0.4, bx, ly)
}

/** 바닥 높이(그림자 위치) */
export function bottomOf(p: ModelProfile) {
  return p.body[1] / 2
}

export function buildCamera(p: ModelProfile, colorHex: string) {
  const group = new THREE.Group()
  const b = new Builder(group, makeKit(colorHex))
  switch (p.kind) {
    case 'slr': buildSLR(b, p); break
    case 'afslr': buildAFSLR(b, p); break
    case 'rf': buildRF(b, p); break
    case 'flattop': buildRF(b, p, true); break
    case 'compact': buildCompact(b, p); break
    case 'clamshell': buildClamshell(b, p); break
    case 'tlr': buildTLR(b, p); break
    case 'cube': buildCube(b, p); break
    case 'rb': buildRB(b, p); break
    case 'mf645': buildMF645(b, p); break
  }
  group.traverse((o) => { if (o instanceof THREE.Mesh) o.castShadow = true })
  group.rotation.y = -0.42
  return group
}

// --- 장면

let shadowTex: THREE.Texture | undefined
function contactShadow() {
  if (!shadowTex) {
    const c = document.createElement('canvas')
    c.width = c.height = 128
    const ctx = c.getContext('2d')!
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
    g.addColorStop(0, 'rgba(0,0,0,0.5)'); g.addColorStop(0.6, 'rgba(0,0,0,0.18)'); g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 128, 128)
    shadowTex = new THREE.CanvasTexture(c)
  }
  return new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }))
}

export function buildScene(p: ModelProfile, colorHex: string, renderer: THREE.WebGLRenderer) {
  const scene = new THREE.Scene()
  // 에뮬레이터·일부 안드로이드는 환경맵(WebGL2)이 없다. 없어도 조명만으로 그린다.
  try {
    const pmrem = new THREE.PMREMGenerator(renderer)
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environmentIntensity = 0.9
    pmrem.dispose()
  } catch { /* 방향광으로 충분 */ }
  renderer.setRenderTarget(null)

  const model = buildCamera(p, colorHex)
  model.name = 'model'
  scene.add(model)

  const shadow = contactShadow()
  const span = Math.max(p.body[0], p.body[2]) * 1.6
  shadow.scale.set(span, span * 0.6, 1)
  shadow.rotation.x = -PI / 2
  shadow.position.y = -bottomOf(p) - 0.02
  scene.add(shadow)

  const key = new THREE.DirectionalLight(0xffffff, 2.0)
  key.position.set(-10, 18, 14)
  scene.add(key)
  const fill = new THREE.DirectionalLight(0xffffff, 0.6)
  fill.position.set(14, 4, 10)
  scene.add(fill)
  const rim = new THREE.DirectionalLight(0xffffff, 1.4)
  rim.position.set(8, 12, -16)
  scene.add(rim)
  scene.add(new THREE.AmbientLight(0xffffff, 0.25))

  // 정면에서 살짝 위. 기종끼리 거리 비율은 유지하고, 카드에서는 더 크게 보이게 카메라를 당긴다.
  const box = new THREE.Box3().setFromObject(model)
  const sz = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())
  const size = Math.max(sz.x, sz.y * 1.33, sz.z)
  const dist = Math.max(size, referenceSpan()) * 1.7
  const camera = new THREE.PerspectiveCamera(21, 4 / 3, 0.1, 800)
  camera.position.set(center.x, center.y + dist * 0.32, center.z + dist)
  const target = new THREE.Vector3(center.x, center.y - sz.y * 0.04, center.z)
  camera.lookAt(target)
  return { scene, camera, target }
}

/** 카탈로그에서 큰 기종 몇 개의 바깥 크기. 한 번만 재고 모든 모형이 이 거리를 같이 쓴다. */
let cachedReferenceSpan: number | undefined
function referenceSpan() {
  if (cachedReferenceSpan) return cachedReferenceSpan
  const probes: [string, string, BodyStyle][] = [
    ['Mamiya', 'RB67', 'mediumFormat'],
    ['Pentax', '67', 'mediumFormat'],
    ['Hasselblad', '500C/M', 'mediumFormat'],
    ['Nikon', 'F5', 'slr'],
  ]
  let best = 1
  for (const [brand, model, style] of probes) {
    const group = buildCamera(profileFor(brand, model, style), '#888888')
    const box = new THREE.Box3().setFromObject(group)
    const sz = box.getSize(new THREE.Vector3())
    best = Math.max(best, sz.x, sz.y * 1.33, sz.z)
    group.traverse((o) => { if (o instanceof THREE.Mesh) o.geometry.dispose() })
  }
  cachedReferenceSpan = best
  return best
}

// --- 정지 이미지 (목록/카드용)

let snapRenderer: THREE.WebGLRenderer | undefined
const snapCache = new Map<string, string>()

/** 몸체가 거의 안 그려졌으면 빈 그림이다. 안드로이드는 화면 밖 캔버스의 기본 버퍼를 비워 둔다. */
function looksBlank(pixels: Uint8Array): boolean {
  let ink = 0
  for (let i = 0; i < pixels.length; i += 64) {
    if (pixels[i + 3] < 24) continue
    if (pixels[i] + pixels[i + 1] + pixels[i + 2] < 540) ink++
  }
  return ink < 24
}

/** WebGL 버퍼를 2D 캔버스로 옮긴다. 위아래가 뒤집혀 있으므로 행을 뒤집는다. */
function pixelsToPNG(pixels: Uint8Array, w: number, h: number): string {
  if (!w || !h || looksBlank(pixels)) throw new Error('blank')
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('blank')
  const image = ctx.createImageData(w, h)
  const row = w * 4
  for (let y = 0; y < h; y++) image.data.set(pixels.subarray((h - 1 - y) * row, (h - y) * row), y * row)
  ctx.putImageData(image, 0, 0)
  return canvas.toDataURL('image/png')
}

function mountSnapCanvas(renderer: THREE.WebGLRenderer) {
  const el = renderer.domElement
  if (el.isConnected) return
  // 크기는 있어야 버퍼가 생긴다. 보이는 영역은 0으로 잘라 화면에 비치지 않게 한다.
  let holder = document.getElementById('snap-holder')
  if (!holder) {
    holder = document.createElement('div')
    holder.id = 'snap-holder'
    holder.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;overflow:hidden;pointer-events:none'
    document.body.appendChild(holder)
  }
  el.style.cssText = 'width:800px;height:600px'
  holder.appendChild(el)
}

export function snapshot(p: ModelProfile, colorHex: string): string {
  const key = `${JSON.stringify(p)}|${colorHex.toUpperCase()}|fit`
  const hit = snapCache.get(key)
  if (hit) return hit
  try {
    return renderSnapshot(p, colorHex, key)
  } catch {
    const url = fallbackSnapshot(p)
    snapCache.set(key, url)
    return url
  }
}

function renderSnapshot(p: ModelProfile, colorHex: string, key: string): string {
  if (!snapRenderer || !snapRenderer.getContext()) {
    snapRenderer?.dispose()
    snapRenderer?.domElement.remove()
    snapRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true, failIfMajorPerformanceCaveat: false })
    snapRenderer.setPixelRatio(1)
    snapRenderer.setSize(800, 600, false)
    snapRenderer.outputColorSpace = THREE.SRGBColorSpace
    snapRenderer.toneMapping = THREE.NeutralToneMapping
    mountSnapCanvas(snapRenderer)
  }
  if (!snapRenderer.getContext()) throw new Error('webgl')
  const { scene, camera } = buildScene(p, colorHex, snapRenderer)
  snapRenderer.setClearColor(0x000000, 0)
  let url: string
  try {
    url = captureScene(snapRenderer, scene, camera)
  } catch {
    // 환경맵이 프레임버퍼를 붙잡은 채 끝나면 캔버스가 빈다. 조명만으로 다시 그린다.
    scene.environment = null
    url = captureScene(snapRenderer, scene, camera)
  }
  snapCache.set(key, url)
  scene.traverse((o) => { if (o instanceof THREE.Mesh) o.geometry.dispose() })
  return url
}

function captureScene(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera): string {
  const w = 800
  const h = 600
  const target = new THREE.WebGLRenderTarget(w, h, {
    format: THREE.RGBAFormat,
    type: THREE.UnsignedByteType,
    colorSpace: THREE.SRGBColorSpace,
    depthBuffer: true,
  })
  try {
    renderer.setRenderTarget(target)
    renderer.clear()
    renderer.render(scene, camera)
    const pixels = new Uint8Array(w * h * 4)
    renderer.readRenderTargetPixels(target, 0, 0, w, h, pixels)
    if (!looksBlank(pixels)) return pixelsToPNG(pixels, w, h)
  } catch {
    // 렌더 타깃을 못 읽으면 아래 기본 버퍼로 간다.
  } finally {
    renderer.setRenderTarget(null)
    target.dispose()
  }
  const gl = renderer.getContext()
  renderer.clear()
  renderer.render(scene, camera)
  gl.finish()
  const bw = gl.drawingBufferWidth
  const bh = gl.drawingBufferHeight
  const fb = new Uint8Array(bw * bh * 4)
  gl.readPixels(0, 0, bw, bh, gl.RGBA, gl.UNSIGNED_BYTE, fb)
  return pixelsToPNG(fb, bw, bh)
}

/** WebGL이 없을 때 목록에라도 형태가 보이게 하는 납작한 그림 */
export function fallbackSnapshot(p: ModelProfile): string {
  const c = document.createElement('canvas')
  c.width = 800
  c.height = 600
  const ctx = c.getContext('2d')!
  const [w, h] = p.body
  const s = 280 / Math.max(w, h, 1)
  const bw = w * s
  const bh = h * s
  const x = 400 - bw / 2
  const y = 310 - bh / 2
  ctx.fillStyle = '#1c1c1e'
  ctx.beginPath()
  if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, bw, bh, 16)
  else ctx.rect(x, y, bw, bh)
  ctx.fill()
  const r = Math.min(bw, bh) * 0.22
  ctx.beginPath()
  ctx.arc(x + bw * 0.68, y + bh * 0.58, r, 0, Math.PI * 2)
  ctx.fillStyle = '#0a0a0c'
  ctx.fill()
  ctx.lineWidth = 8
  ctx.strokeStyle = '#3a3a40'
  ctx.stroke()
  return c.toDataURL('image/png')
}
