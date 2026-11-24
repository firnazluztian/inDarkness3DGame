import * as THREE from 'three'
import type { Rect } from './collision'
import {
  CANDLES,
  DOORS,
  PROPS,
  WALLS,
  WALL_H,
  WARDS,
  type CandleSpec,
  type DoorSpec,
  wallToRect,
} from './layout'
import type { Materials } from './textures'

const TILE = 1.7

export interface DoorState {
  spec: DoorSpec
  open: number
  target: number
  pivot: THREE.Group
}

export interface SmokePuff {
  mesh: THREE.Mesh
  life: number
  vy: number
  x: number
  z: number
}

export interface CandleState {
  spec: CandleSpec
  lit: boolean
  justBlown: boolean
  group: THREE.Group
  flame: THREE.Mesh
  glow: THREE.Mesh
  light: THREE.PointLight
  puffs: SmokePuff[]
}

export interface WardState {
  homeX: number
  homeZ: number
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
  active: boolean
  carried: boolean
  flying: boolean
  group: THREE.Group
}

export interface LevelContent {
  doors: DoorState[]
  candles: CandleState[]
  wards: WardState[]
  ghost: THREE.Group
  staticSolids: Rect[]
}

export function buildLevel(scene: THREE.Scene, materials: Materials, staticSolids: Rect[]): LevelContent {
  addArchitecture(scene, materials)
  const doors = DOORS.map((spec) => makeDoor(scene, materials, spec))
  const candles = CANDLES.map((spec) => makeCandle(scene, materials, spec))
  const wards = WARDS.map((marker) => makeWard(scene, materials, marker.x, marker.z))
  const ghost = makeGhost(scene, materials)
  return { doors, candles, wards, ghost, staticSolids }
}

function addArchitecture(scene: THREE.Scene, materials: Materials) {
  const floor = new THREE.Mesh(sizedBox(21.2, 0.2, 15.2), materials.floor)
  floor.position.set(0, -0.1, 0)
  floor.receiveShadow = true
  scene.add(floor)

  const ceiling = new THREE.Mesh(sizedBox(20.4, 0.12, 14.4), materials.stone)
  ceiling.position.set(0, WALL_H + 0.06, 0)
  scene.add(ceiling)

  for (const wall of WALLS) {
    const rect = wallToRect(wall)
    const mesh = new THREE.Mesh(
      sizedBox(rect.maxX - rect.minX, WALL_H, rect.maxZ - rect.minZ),
      materials.plaster,
    )
    mesh.position.set((rect.minX + rect.maxX) / 2, WALL_H / 2, (rect.minZ + rect.maxZ) / 2)
    mesh.castShadow = true
    mesh.receiveShadow = true
    scene.add(mesh)
  }

  for (const prop of PROPS) {
    const mat = materials[prop.mat]
    const mesh = new THREE.Mesh(sizedBox(prop.w, prop.h, prop.d), mat)
    mesh.position.set(prop.cx, prop.h / 2, prop.cz)
    mesh.castShadow = prop.solid
    mesh.receiveShadow = true
    scene.add(mesh)
  }

  const yard = new THREE.Mesh(new THREE.PlaneGeometry(36, 18), materials.stone)
  yard.rotation.x = -Math.PI / 2
  yard.position.set(0, -0.02, 16)
  scene.add(yard)

  const moon = new THREE.Mesh(new THREE.SphereGeometry(1.4, 16, 12), new THREE.MeshBasicMaterial({ color: 0xe4e9f2 }))
  moon.position.set(-14, 11, 16)
  scene.add(moon)

  for (const tree of [
    { x: -6, z: 12 },
    { x: 5, z: 13 },
    { x: -2, z: 15.5 },
    { x: 8, z: 11 },
  ]) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 1.1, 6), materials.wood)
    trunk.position.set(tree.x, 0.55, tree.z)
    const crown = new THREE.Mesh(
      new THREE.ConeGeometry(0.7, 1.6, 7),
      new THREE.MeshLambertMaterial({ color: 0x1a2820 }),
    )
    crown.position.set(tree.x, 1.7, tree.z)
    scene.add(trunk, crown)
  }

  addWindows(scene, materials)
  addFrames(scene, materials)

  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), materials.metal)
  lamp.position.set(0, WALL_H - 0.28, 0.2)
  scene.add(lamp)
}

function addWindows(scene: THREE.Scene, materials: Materials) {
  const glass = materials.glass
  const specs = [
    { x: 0, y: 1.55, z: -6.84, ry: 0, w: 1.35, h: 1.45 },
    { x: -6.2, y: 1.55, z: -6.84, ry: 0, w: 1.15, h: 1.35 },
    { x: 6.4, y: 1.55, z: -6.84, ry: 0, w: 1.15, h: 1.35 },
    { x: -9.84, y: 1.5, z: 4.4, ry: Math.PI / 2, w: 1.2, h: 1.3 },
    { x: -9.84, y: 1.5, z: -4.2, ry: Math.PI / 2, w: 1.1, h: 1.25 },
    { x: 9.84, y: 1.5, z: 4.2, ry: -Math.PI / 2, w: 1.2, h: 1.3 },
    { x: 9.84, y: 1.5, z: -4.4, ry: -Math.PI / 2, w: 1.1, h: 1.25 },
  ]
  for (const spec of specs) {
    const frame = new THREE.Mesh(new THREE.PlaneGeometry(spec.w + 0.16, spec.h + 0.16), materials.wood)
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(spec.w, spec.h), glass)
    frame.position.set(spec.x, spec.y, spec.z)
    pane.position.set(spec.x, spec.y, spec.z)
    frame.rotation.y = spec.ry
    pane.rotation.y = spec.ry
    const nudge = new THREE.Vector3(0, 0, 0.03).applyAxisAngle(new THREE.Vector3(0, 1, 0), spec.ry)
    pane.position.add(nudge)
    scene.add(frame, pane)
  }
}

function addFrames(scene: THREE.Scene, materials: Materials) {
  const frames = [
    { x: -7.4, y: 1.65, z: 6.84, ry: Math.PI },
    { x: 6.8, y: 1.6, z: 6.84, ry: Math.PI },
  ]
  for (const frame of frames) {
    const board = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.96), materials.wood)
    const art = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.78), materials.fabric)
    board.position.set(frame.x, frame.y, frame.z)
    art.position.set(frame.x, frame.y, frame.z)
    board.rotation.y = frame.ry
    art.rotation.y = frame.ry
    art.position.add(new THREE.Vector3(0, 0, frame.ry === 0 ? 0.02 : -0.02))
    if (frame.ry === Math.PI) art.position.z = frame.z - 0.02
    scene.add(board, art)
  }
}

function makeDoor(scene: THREE.Scene, materials: Materials, spec: DoorSpec): DoorState {
  const pivot = new THREE.Group()
  pivot.position.set(spec.hx, 0, spec.hz)
  const alongZ = Math.abs(spec.ax) < 0.5
  const panel = new THREE.Mesh(
    alongZ ? sizedBox(0.07, 2.32, spec.width) : sizedBox(spec.width, 2.32, 0.07),
    materials.wood,
  )
  panel.castShadow = true
  panel.receiveShadow = true
  if (alongZ) panel.position.set(0, 1.2, (spec.az * spec.width) / 2)
  else panel.position.set((spec.ax * spec.width) / 2, 1.2, 0)
  pivot.add(panel)

  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), materials.metal)
  if (alongZ) knob.position.set(0.07, 1.05, spec.az * (spec.width - 0.14))
  else knob.position.set(spec.ax * (spec.width - 0.14), 1.05, 0.07)
  pivot.add(knob)

  const open = spec.startOpen ? 1 : 0
  pivot.rotation.y = open * spec.swing * (Math.PI / 2)
  scene.add(pivot)
  return { spec, open, target: open, pivot }
}

function makeCandle(scene: THREE.Scene, materials: Materials, spec: CandleSpec): CandleState {
  const group = new THREE.Group()
  group.position.set(spec.x, spec.y, spec.z)
  let stickBase = 0
  if (spec.birthday) {
    const cake = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.34, 0.16, 18), materials.cake)
    cake.position.y = 0.08
    cake.castShadow = true
    const icing = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.035, 18), materials.fabric)
    icing.position.y = 0.16
    group.add(cake, icing)
    stickBase = 0.18
  }
  const stickH = spec.birthday ? 0.2 : 0.46
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.045, stickH, 8), materials.metal)
  stick.position.y = stickBase + stickH / 2
  group.add(stick)
  const flameY = stick.position.y + stickH / 2 + 0.07
  const flame = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.2), materials.flame)
  flame.position.y = flameY
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), materials.glow)
  glow.position.y = flameY
  const light = new THREE.PointLight(0xff8a3a, 5, 5.5, 2)
  light.position.y = flameY
  group.add(flame, glow, light)

  const puffs: SmokePuff[] = []
  for (let i = 0; i < 7; i += 1) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.028, 6, 5),
      new THREE.MeshBasicMaterial({
        color: 0xc8c2ba,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
      }),
    )
    mesh.visible = false
    group.add(mesh)
    puffs.push({ mesh, life: 0, vy: 0, x: 0, z: 0 })
  }
  scene.add(group)
  return { spec, lit: true, justBlown: false, group, flame, glow, light, puffs }
}

function makeWard(scene: THREE.Scene, materials: Materials, x: number, z: number): WardState {
  const group = new THREE.Group()
  const barA = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.48, 0.07), materials.metal)
  const barB = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.48, 0.07), materials.metal)
  barB.rotation.z = Math.PI / 2.6
  group.add(barA, barB)
  group.position.set(x, 0.55, z)
  scene.add(group)
  return {
    homeX: x,
    homeZ: z,
    x,
    y: 0.55,
    z,
    vx: 0,
    vy: 0,
    vz: 0,
    active: true,
    carried: false,
    flying: false,
    group,
  }
}

function makeGhost(scene: THREE.Scene, materials: Materials): THREE.Group {
  const group = new THREE.Group()
  const skirt = new THREE.Mesh(new THREE.ConeGeometry(0.46, 1.2, 9), materials.ghost)
  skirt.position.y = 0.58
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.28, 0.72, 9), materials.ghost)
  torso.position.y = 1.28
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 12), materials.ghost)
  head.position.y = 1.74
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.38), materials.face)
  face.position.set(0, 1.76, 0.19)
  const light = new THREE.PointLight(0xff3344, 0.45, 3.4, 2)
  light.position.y = 1.45
  group.add(skirt, torso, head, face, light)
  scene.add(group)
  return group
}

function sizedBox(w: number, h: number, d: number): THREE.BoxGeometry {
  const geo = new THREE.BoxGeometry(w, h, d)
  const pos = geo.attributes.position
  const uv = geo.attributes.uv
  const norm = geo.attributes.normal
  for (let i = 0; i < pos.count; i += 1) {
    const nx = Math.abs(norm.getX(i))
    const ny = Math.abs(norm.getY(i))
    let u: number
    let v: number
    if (nx > 0.5) {
      u = pos.getZ(i)
      v = pos.getY(i)
    } else if (ny > 0.5) {
      u = pos.getX(i)
      v = pos.getZ(i)
    } else {
      u = pos.getX(i)
      v = pos.getY(i)
    }
    uv.setXY(i, u / TILE, v / TILE)
  }
  uv.needsUpdate = true
  return geo
}
