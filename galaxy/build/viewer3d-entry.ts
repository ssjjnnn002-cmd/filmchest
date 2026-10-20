// 갤럭시 3D 모형 보기 (웹 ui/Viewers.tsx Model3D와 같은 장면·조작). WebView 안에서 돈다.
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { buildScene } from '../../web/src/core/model3d'
import type { ModelProfile } from '../../web/src/core/profiles'

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.NeutralToneMapping
document.body.appendChild(renderer.domElement)
const camera = new THREE.PerspectiveCamera(21, 4 / 3, 0.1, 800)
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableZoom = false
controls.enablePan = false
controls.enableDamping = true
controls.minPolarAngle = Math.PI * 0.28
controls.maxPolarAngle = Math.PI * 0.53
let scene: THREE.Scene | undefined
let last = ''
const loop = () => {
  requestAnimationFrame(loop)
  if (!scene) return
  controls.update()
  renderer.render(scene, camera)
}
const resize = () => {
  const w = innerWidth, h = innerHeight
  renderer.setSize(w, h, false)
  camera.aspect = w / h
  camera.updateProjectionMatrix()
}
addEventListener('resize', resize)
resize()
loop()
;(window as unknown as { show: (p: ModelProfile, color: string) => void }).show = (profile, color) => {
  const built = buildScene(profile, color, renderer)
  const key = JSON.stringify(profile)
  if (key !== last) {
    camera.position.copy(built.camera.position)
    controls.target.copy(built.target)
    last = key
  }
  scene?.traverse((o) => { if (o instanceof THREE.Mesh) o.geometry.dispose() })
  scene = built.scene
}
