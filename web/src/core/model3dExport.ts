// iOS 앱(JavaScriptCore)에서 3D 모형의 모양을 받아 가는 진입점.
// 웹과 같은 buildCamera를 그대로 쓰고, 재질 이름(역할)별로 삼각형을 모아 넘긴다.
//   빌드: npm run build:ios3d  → App/FilmScan/Resources/camera3d.js
import * as THREE from 'three'
import { buildCamera } from './model3d'
import { profileFor } from './profiles'
import type { BodyStyle } from './types'

export interface Part {
  role: string
  position: Float32Array
  normal: Float32Array
  uv: Float32Array
}

function collect(group: THREE.Object3D) {
  const parts = new Map<string, { p: number[]; n: number[]; t: number[] }>()
  const bucket = (role: string) => {
    let b = parts.get(role)
    if (!b) parts.set(role, (b = { p: [], n: [], t: [] }))
    return b
  }
  const v = new THREE.Vector3()
  const nm = new THREE.Matrix3()

  const addGeometry = (geo: THREE.BufferGeometry, matrix: THREE.Matrix4, materials: THREE.Material | THREE.Material[]) => {
    const g = geo.index ? geo.toNonIndexed() : geo
    const pos = g.attributes.position as THREE.BufferAttribute
    const nor = g.attributes.normal as THREE.BufferAttribute | undefined
    const uv = g.attributes.uv as THREE.BufferAttribute | undefined
    nm.getNormalMatrix(matrix)
    const groups = Array.isArray(materials) && g.groups.length
      ? g.groups.map((gr) => ({ start: gr.start, count: gr.count, mat: materials[gr.materialIndex ?? 0] }))
      : [{ start: 0, count: pos.count, mat: Array.isArray(materials) ? materials[0] : materials }]
    for (const gr of groups) {
      const b = bucket(gr.mat.name || 'plate')
      const end = Math.min(pos.count, gr.start + gr.count)
      for (let i = gr.start; i < end; i++) {
        v.fromBufferAttribute(pos, i).applyMatrix4(matrix)
        b.p.push(v.x, v.y, v.z)
        if (nor) { v.fromBufferAttribute(nor, i).applyMatrix3(nm).normalize(); b.n.push(v.x, v.y, v.z) } else b.n.push(0, 1, 0)
        if (uv) b.t.push(uv.getX(i), uv.getY(i)); else b.t.push(0, 0)
      }
    }
    if (g !== geo) g.dispose()
  }

  group.updateMatrixWorld(true)
  const inst = new THREE.Matrix4()
  const world = new THREE.Matrix4()
  group.traverse((o) => {
    if (o instanceof THREE.InstancedMesh) {
      for (let i = 0; i < o.count; i++) {
        o.getMatrixAt(i, inst)
        world.multiplyMatrices(o.matrixWorld, inst)
        addGeometry(o.geometry, world, o.material)
      }
    } else if (o instanceof THREE.Mesh) {
      if (!o.geometry.attributes.normal) o.geometry.computeVertexNormals()
      addGeometry(o.geometry, o.matrixWorld, o.material)
    }
  })
  return [...parts.entries()].map(([role, b]): Part => ({
    role, position: new Float32Array(b.p), normal: new Float32Array(b.n), uv: new Float32Array(b.t),
  }))
}

/** 몸체 색에 따라 재질 밝기가 달라지므로 색도 받는다 (모양에는 영향 없음) */
export function build(brand: string, model: string, style: BodyStyle) {
  const profile = profileFor(brand, model, style)
  const group = buildCamera(profile, '#1c1c1c')
  group.rotation.y = 0 // 방향은 앱에서 정한다
  return { parts: collect(group), bottom: profile.body[1] / 2, profile: JSON.stringify(profile) }
}
