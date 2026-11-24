import * as THREE from 'three'
import { AudioBus } from './audio'
import { circleHits, clamp, moveCircle, segmentBlocked, segmentDistance, type Rect } from './collision'
import {
  BOUNDS,
  CANDLES,
  EXIT_ZONE,
  PLAYER,
  SPAWNS,
  doorToRect,
  staticSolids,
  swungDoorRect,
} from './layout'
import { buildLevel, type CandleState, type DoorState, type LevelContent, type WardState } from './level'
import { MicMeter } from './mic'
import { buildGrid, findPath, type Grid, type Point } from './nav'
import { createMaterials } from './textures'

/**
 * Ash House — browser port of the Unity prototype.
 * Flashlight on: the ghost chases. Flashlight off: it stops (NavMeshAgent.isStopped).
 * Blow out every candle, then step into the exit. A touch is fatal.
 * Rage speed is tied to the candles, not keyCount — that field is never written in the original scripts.
 */

const EYE = 1.58
const WALK = 3.45
const SPRINT = 5.5
const RADIUS = 0.3
const GHOST_SPEED = 2.35
const GHOST_RADIUS = 0.32
const LOOK = 0.00215
const BLOW_LEVEL = 1.6
const INTERACT = 1.5
const CATCH = 0.82
const CELL = 0.4
const INFLATE = 0.28

const RAIL = [
  { x: 0, y: 1.55, z: 5.3, lx: 0, ly: 1.25, lz: 1.2 },
  { x: 0, y: 1.52, z: 2.15, lx: -5.2, ly: 1.1, lz: 2.4 },
  { x: 0, y: 1.5, z: -0.35, lx: 0, ly: 1.35, lz: -3.2 },
  { x: 0.15, y: 1.5, z: -1.7, lx: 5.6, ly: 1.15, lz: -4.3 },
  { x: 0, y: 1.54, z: 1.5, lx: -1.4, ly: 1.05, lz: 4.6 },
]

type Mode = 'menu' | 'play' | 'pause' | 'end'
type Action = 'light' | 'blow' | 'relight' | 'use' | 'take' | 'throw'

const ACTION: Record<string, Action> = {
  KeyQ: 'light',
  KeyB: 'blow',
  KeyL: 'relight',
  KeyE: 'use',
  KeyC: 'take',
}

export class Game {
  private renderer: THREE.WebGLRenderer | null = null
  private scene = new THREE.Scene()
  private camera = new THREE.PerspectiveCamera(74, 1, 0.08, 50)
  private fog = new THREE.FogExp2(0x07060a, 0.02)
  private flash!: THREE.SpotLight
  private moon!: THREE.DirectionalLight
  private hemi!: THREE.HemisphereLight
  private scare!: THREE.Mesh
  private level!: LevelContent
  private canvas!: HTMLCanvasElement
  private audio = new AudioBus()
  private mic = new MicMeter()
  private grid: Grid | null = null
  private navSig = ''
  private solidsCache: Rect[] = []
  private mode: Mode = 'menu'
  private starting = false
  private startTimer = 0
  private raf = 0
  private last = performance.now()
  private reduced = false
  private playerX = PLAYER.x
  private playerZ = PLAYER.z
  private yaw = 0
  private pitch = 0
  private bob = 0
  private step = 0
  private lookX = 0
  private lookY = 0
  private lightOn = true
  private ghostX = 0
  private ghostZ = -3.1
  private spawnX = SPAWNS[0].x
  private spawnZ = SPAWNS[0].z
  private retreating = false
  private path: Point[] = []
  private repath = 0
  private ghostBob = 0
  private carried: WardState | null = null
  private wasComplete = false
  private grace = 0
  private scareLeft = 0
  private toastText = ''
  private toastLeft = 0
  private endKind: 'win' | 'lose' = 'lose'
  private endAt = 0
  private endShake = 0
  private readonly endBase = new THREE.Vector3()
  private readonly worldPoint = new THREE.Vector3()
  private readonly held = new Set<string>()
  private readonly actions: Action[] = []
  private menuTime = 0
  private touch = false
  private stickX = 0
  private stickY = 0
  private stickPointer = -1
  private lookPointer = -1
  private lookLastX = 0
  private lookLastY = 0

  mount() {
    const canvas = document.getElementById('view')
    if (!(canvas instanceof HTMLCanvasElement)) throw new Error('Missing canvas')
    this.canvas = canvas
    this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    this.touch = window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0
    if (this.touch) this.markTouch()
    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        powerPreference: 'high-performance',
        alpha: false,
      })
    } catch {
      this.el('webgl-error').hidden = false
      return
    }

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.05
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFShadowMap
    this.renderer.setClearColor(0x07060a)

    this.scene.background = new THREE.Color(0x07060a)
    this.scene.fog = this.fog
    this.hemi = new THREE.HemisphereLight(0x8ea0c0, 0x1a100e, 0.4)
    this.moon = new THREE.DirectionalLight(0xc5d2ea, 0.6)
    this.moon.position.set(-8, 12, 10)
    this.scene.add(this.hemi, this.moon)

    const materials = createMaterials()
    const solids = staticSolids()
    this.level = buildLevel(this.scene, materials, solids)

    this.flash = new THREE.SpotLight(0xfff1d6, 0, 16, 0.68, 0.45, 1.6)
    this.flash.castShadow = true
    this.flash.shadow.mapSize.set(1024, 1024)
    this.flash.shadow.camera.near = 0.2
    this.flash.shadow.camera.far = 16
    this.flash.shadow.bias = -0.00035
    this.flash.shadow.normalBias = 0.04
    this.flash.position.set(0.16, -0.14, 0.02)
    const target = new THREE.Object3D()
    target.position.set(0.16, -0.16, -1)
    this.flash.target = target
    this.camera.add(this.flash, target)

    const scareMat = materials.face.clone()
    scareMat.depthTest = false
    scareMat.depthWrite = false
    this.scare = new THREE.Mesh(new THREE.PlaneGeometry(0.64, 0.86), scareMat)
    this.scare.position.set(0, 0.02, -0.58)
    this.scare.visible = false
    this.scare.renderOrder = 20
    this.scare.frustumCulled = false
    this.camera.add(this.scare)
    this.scene.add(this.camera)

    this.bindInput()
    this.bindUi()
    this.reset(true)
    this.setMode('menu')
    this.resize()
    this.raf = requestAnimationFrame(this.frame)
  }

  destroy() {
    cancelAnimationFrame(this.raf)
    window.clearTimeout(this.startTimer)
    this.mic.stop()
    this.audio.dispose()
    this.renderer?.dispose()
  }

  private frame = (now: number) => {
    const dt = Math.min(0.05, Math.max(0, (now - this.last) / 1000))
    this.last = now
    try {
      if (this.mode === 'pause') {
        this.renderer?.render(this.scene, this.camera)
      } else if (this.mode === 'end') {
        this.updateEnd(dt)
        this.renderer?.render(this.scene, this.camera)
      } else if (this.mode === 'menu') {
        this.updateMenu(dt)
        this.renderer?.render(this.scene, this.camera)
      } else {
        this.updatePlay(dt, now / 1000)
        this.renderer?.render(this.scene, this.camera)
      }
    } catch (error) {
      console.error(error)
    }
    this.raf = requestAnimationFrame(this.frame)
  }

  private updateMenu(dt: number) {
    this.menuTime += dt
    this.applyLights()
    this.updateCandles(dt, this.menuTime)
    this.spinLooseWards(dt)
    this.animateDoors(dt)
    if (this.reduced) {
      this.camera.position.set(0, 1.55, 5.2)
      this.camera.lookAt(0, 1.3, -1)
    } else {
      const span = 7
      const travel = (this.menuTime % (RAIL.length * span)) / span
      const index = mod(Math.floor(travel), RAIL.length)
      const next = (index + 1) % RAIL.length
      const t = travel - Math.floor(travel)
      const s = t * t * (3 - 2 * t)
      const a = RAIL[index]
      const b = RAIL[next]
      this.camera.position.set(a.x + (b.x - a.x) * s, a.y + (b.y - a.y) * s, a.z + (b.z - a.z) * s)
      this.camera.lookAt(a.lx + (b.lx - a.lx) * s, a.ly + (b.ly - a.ly) * s, a.lz + (b.lz - a.lz) * s)
    }
    this.level.ghost.position.set(this.ghostX, Math.sin(this.menuTime * 1.6) * 0.05, this.ghostZ)
    this.level.ghost.lookAt(this.camera.position.x, 1.2, this.camera.position.z)
  }

  private updatePlay(dt: number, time: number) {
    this.applyLights()
    this.mic.update()
    const solids = this.currentSolids()
    this.solidsCache = solids
    this.ensureGrid(solids)
    this.applyLook()
    this.movePlayer(dt, solids)
    this.consumeActions()
    this.updateFlyingWards(dt, solids)
    this.updateGhost(dt, solids)
    this.resolveCandles()
    this.updateExit()
    this.animateDoors(dt)
    this.updateCandles(dt, time)
    this.spinLooseWards(dt)
    this.updateScare(dt)
    this.toastLeft = Math.max(0, this.toastLeft - dt)
    this.updateHud()
    this.updateTension()
    if (this.mode !== 'play') return
    const dist = Math.hypot(this.ghostX - this.playerX, this.ghostZ - this.playerZ)
    if (this.grace <= 0 && dist < CATCH && !segmentBlocked(this.playerX, this.playerZ, this.ghostX, this.ghostZ, solids)) {
      this.finish('lose')
      return
    }
    if (this.inExit() && this.blown() === this.level.candles.length) this.finish('win')
  }

  private updateEnd(dt: number) {
    this.endShake += dt
    if (this.endKind === 'lose') {
      const kick = Math.max(0, 0.7 - this.endShake) * 0.06
      this.camera.position.set(
        this.endBase.x + Math.sin(this.endShake * 46) * kick,
        this.endBase.y + Math.cos(this.endShake * 34) * kick,
        this.endBase.z,
      )
      this.scare.visible = true
    }
    if (performance.now() >= this.endAt) this.toMenu()
  }

  private applyLook() {
    this.yaw -= this.lookX * LOOK
    this.pitch = clamp(this.pitch - this.lookY * LOOK, -1.25, 1.25)
    this.lookX = 0
    this.lookY = 0
  }

  private movePlayer(dt: number, solids: Rect[]) {
    const sin = Math.sin(this.yaw)
    const cos = Math.cos(this.yaw)
    let forward = 0
    let strafe = 0
    if (this.held.has('KeyW')) forward += 1
    if (this.held.has('KeyS')) forward -= 1
    if (this.held.has('KeyD')) strafe += 1
    if (this.held.has('KeyA')) strafe -= 1
    const stickMag = Math.hypot(this.stickX, this.stickY)
    if (stickMag > 0.14) {
      forward += -this.stickY
      strafe += this.stickX
    }
    const mag = Math.hypot(forward, strafe)
    if (mag > 0) {
      const keys = this.held.has('KeyW') || this.held.has('KeyA') || this.held.has('KeyS') || this.held.has('KeyD')
      const sprint = this.held.has('ShiftLeft') || this.held.has('ShiftRight') || stickMag > 0.86
      const scale = keys ? 1 : Math.min(1, stickMag)
      const speed = (sprint ? SPRINT : WALK) * scale
      const ix = (-sin * forward + cos * strafe) / mag
      const iz = (-cos * forward - sin * strafe) / mag
      const moved = moveCircle(this.playerX, this.playerZ, ix * speed * dt, iz * speed * dt, RADIUS, solids)
      this.step += Math.hypot(moved.x - this.playerX, moved.z - this.playerZ)
      this.playerX = moved.x
      this.playerZ = moved.z
      if (this.step > 1.35) {
        this.step = 0
        this.audio.footstep()
      }
      this.bob += dt * speed * 1.7
    }
    const dip = mag > 0 && !this.reduced ? Math.sin(this.bob) * 0.028 : 0
    this.camera.position.set(this.playerX, EYE + dip, this.playerZ)
    this.camera.rotation.order = 'YXZ'
    this.camera.rotation.y = this.yaw
    this.camera.rotation.x = this.pitch
    this.camera.rotation.z = 0
  }

  private consumeActions() {
    const queued = this.actions.splice(0, this.actions.length)
    for (const action of queued) {
      if (action === 'light') this.toggleLight()
      else if (action === 'blow') this.blow()
      else if (action === 'relight') this.relight()
      else if (action === 'use') this.useDoor()
      else if (action === 'take') this.takeOrDrop()
      else if (action === 'throw') this.throwWard()
    }
    if (this.mic.level >= BLOW_LEVEL) this.blow()
  }

  private toggleLight() {
    this.lightOn = !this.lightOn
    this.audio.toggleLight()
    this.repath = 0
    if (this.lightOn) {
      if (Math.random() < 0.25) this.showScare(true)
    } else {
      this.scareLeft = 0
      this.scare.visible = false
    }
  }

  private blow() {
    const candle = this.closestCandle(true)
    if (!candle) return
    candle.lit = false
    candle.justBlown = true
    this.audio.blow()
    this.burst(candle)
    if (candle.spec.birthday) {
      this.audio.birthday()
      this.showScare(true)
    }
  }

  private relight() {
    const candle = this.closestCandle(false)
    if (!candle) return
    candle.lit = true
    this.audio.relight()
  }

  private useDoor() {
    const door = this.closestDoor()
    if (!door) return
    if (door.spec.id === 'exit' && this.blown() < this.level.candles.length) {
      this.toast('First, you must find all the candles to unlock the door')
      return
    }
    const closing = door.target > 0.5
    if (closing && this.doorwayOccupied(door)) {
      this.toast('The door is blocked.')
      return
    }
    door.target = closing ? 0 : 1
    this.audio.door()
  }

  private takeOrDrop() {
    if (this.carried) {
      this.dropWard()
      return
    }
    const ward = this.closestWard()
    if (!ward) return
    ward.carried = true
    ward.flying = false
    this.carried = ward
    this.scene.remove(ward.group)
    this.camera.add(ward.group)
    ward.group.position.set(0.26, -0.22, -0.52)
    ward.group.rotation.set(0.4, 0.6, 0.2)
    ward.group.scale.setScalar(0.62)
    this.audio.pickup()
  }

  private dropWard() {
    const ward = this.carried
    if (!ward) return
    const sin = Math.sin(this.yaw)
    const cos = Math.cos(this.yaw)
    let x = this.playerX - sin * 0.75
    let z = this.playerZ - cos * 0.75
    if (circleHits(x, z, 0.2, this.solidsCache)) {
      x = this.playerX
      z = this.playerZ
    }
    this.releaseWard(ward, x, z)
  }

  private throwWard() {
    const ward = this.carried
    if (!ward) return
    this.camera.updateMatrixWorld()
    this.worldPoint.set(0.2, -0.12, -0.55).applyMatrix4(this.camera.matrixWorld)
    const dir = new THREE.Vector3()
    this.camera.getWorldDirection(dir)
    this.scene.add(ward.group)
    this.camera.remove(ward.group)
    ward.group.scale.setScalar(1)
    ward.carried = false
    ward.flying = true
    ward.active = true
    ward.x = this.worldPoint.x
    ward.y = this.worldPoint.y
    ward.z = this.worldPoint.z
    ward.vx = dir.x * 9
    ward.vy = dir.y * 9 + 0.6
    ward.vz = dir.z * 9
    ward.group.position.copy(this.worldPoint)
    this.carried = null
  }

  private releaseWard(ward: WardState, x: number, z: number) {
    ward.group.parent?.remove(ward.group)
    this.scene.add(ward.group)
    ward.group.scale.setScalar(1)
    ward.carried = false
    ward.flying = false
    ward.active = true
    ward.group.visible = true
    ward.x = x
    ward.y = 0.55
    ward.z = z
    ward.vx = 0
    ward.vy = 0
    ward.vz = 0
    ward.group.position.set(x, 0.55, z)
    if (this.carried === ward) this.carried = null
  }

  private updateFlyingWards(dt: number, solids: Rect[]) {
    for (const ward of this.level.wards) {
      if (!ward.flying) continue
      ward.vy -= 12 * dt
      const nx = ward.x + ward.vx * dt
      const ny = ward.y + ward.vy * dt
      const nz = ward.z + ward.vz * dt
      ward.group.rotation.x += dt * 6
      ward.group.rotation.y += dt * 4
      if (ny <= 0.45 || circleHits(nx, nz, 0.16, solids)) {
        const landX = circleHits(ward.x, ward.z, 0.16, solids) ? this.playerX : ward.x
        const landZ = circleHits(ward.x, ward.z, 0.16, solids) ? this.playerZ : ward.z
        this.releaseWard(ward, landX, landZ)
        continue
      }
      ward.x = nx
      ward.y = ny
      ward.z = nz
      ward.group.position.set(nx, ny, nz)
      if (Math.hypot(nx - this.ghostX, nz - this.ghostZ) < 0.85 && ny < 1.8) this.banish(ward)
    }
  }

  private updateGhost(dt: number, solids: Rect[]) {
    this.ghostBob += dt
    if (this.grace > 0) this.grace -= dt
    const bob = Math.sin(this.ghostBob * 2.4) * 0.05
    const hunting = this.lightOn && this.grace <= 0
    if (!hunting) {
      this.level.ghost.position.set(this.ghostX, bob, this.ghostZ)
      this.level.ghost.lookAt(this.playerX, 1.2, this.playerZ)
      return
    }
    const enraged = this.blown() === CANDLES.length
    const speed = this.retreating ? GHOST_SPEED * 5 : enraged ? GHOST_SPEED * 2 : GHOST_SPEED
    this.repath -= dt
    if (this.repath <= 0 && this.grid) {
      const goalX = this.retreating ? this.spawnX : this.playerX
      const goalZ = this.retreating ? this.spawnZ : this.playerZ
      this.path = findPath(this.grid, this.ghostX, this.ghostZ, goalX, goalZ)
      this.repath = 0.28
    }
    const next = this.path[0]
    if (next) {
      const dx = next.x - this.ghostX
      const dz = next.z - this.ghostZ
      const len = Math.hypot(dx, dz)
      if (len < 0.28) this.path.shift()
      else {
        const step = Math.min(len, speed * dt)
        const moved = moveCircle(this.ghostX, this.ghostZ, (dx / len) * step, (dz / len) * step, GHOST_RADIUS, solids)
        this.ghostX = moved.x
        this.ghostZ = moved.z
        this.level.ghost.lookAt(next.x, 1.2, next.z)
      }
    } else {
      this.level.ghost.lookAt(this.playerX, 1.2, this.playerZ)
    }
    this.level.ghost.position.set(this.ghostX, bob, this.ghostZ)
    if (this.retreating && Math.hypot(this.ghostX - this.spawnX, this.ghostZ - this.spawnZ) < 0.8) {
      this.retreating = false
      this.path = []
      this.repath = 0
    }
    for (const ward of this.level.wards) {
      if (!ward.active || ward.carried || ward.flying) continue
      if (Math.hypot(ward.x - this.ghostX, ward.z - this.ghostZ) < 0.75) this.banish(ward)
    }
  }

  private banish(ward: WardState) {
    if (!ward.active && !ward.flying) return
    ward.active = false
    ward.flying = false
    ward.carried = false
    ward.group.visible = false
    ward.group.parent?.remove(ward.group)
    if (this.carried === ward) this.carried = null
    this.retreating = true
    this.path = []
    this.repath = 0
    this.audio.ward()
  }

  private resolveCandles() {
    if (!this.lightOn || this.grace > 0) {
      for (const candle of this.level.candles) candle.justBlown = false
      return
    }
    for (const candle of this.level.candles) {
      if (!candle.lit && !candle.justBlown) {
        const dist = Math.hypot(candle.spec.x - this.ghostX, candle.spec.z - this.ghostZ)
        if (dist < 1.05) {
          candle.lit = true
          this.audio.relight()
          this.toast('The ghost turned the candle back on.')
        }
      }
      candle.justBlown = false
    }
  }

  private updateExit() {
    const exit = this.level.doors.find((door) => door.spec.id === 'exit')
    if (!exit) return
    const complete = this.blown() === this.level.candles.length
    if (complete && !this.wasComplete) {
      exit.target = 1
      this.audio.unlock()
      this.audio.door()
    }
    if (!complete && this.wasComplete) {
      exit.target = 0
      this.nudgeOffExit(exit)
    }
    this.wasComplete = complete
  }

  private nudgeOffExit(door: DoorState) {
    const rect = doorToRect(door.spec)
    if (circleHits(this.playerX, this.playerZ, RADIUS, [rect])) this.playerZ = rect.minZ - 0.5
    if (circleHits(this.ghostX, this.ghostZ, GHOST_RADIUS, [rect])) this.ghostZ = rect.minZ - 0.6
  }

  private updateTension() {
    const dist = Math.hypot(this.ghostX - this.playerX, this.ghostZ - this.playerZ)
    if (this.lightOn && !this.retreating && dist < 8) this.audio.heartbeat(clamp(1 - dist / 8, 0, 1))
    if (dist < 11) this.audio.moan(this.panToGhost())
    this.el('danger').style.opacity = this.lightOn ? String(clamp((3.2 - dist) / 3.2, 0, 0.9)) : '0'
  }

  private panToGhost(): number {
    const dx = this.ghostX - this.playerX
    const dz = this.ghostZ - this.playerZ
    const len = Math.hypot(dx, dz) || 1
    const rightX = Math.cos(this.yaw)
    const rightZ = -Math.sin(this.yaw)
    return clamp((dx / len) * rightX + (dz / len) * rightZ, -1, 1)
  }

  private updateCandles(dt: number, time: number) {
    for (const candle of this.level.candles) {
      candle.flame.visible = candle.lit
      candle.glow.visible = candle.lit
      candle.light.intensity = candle.lit ? 11 + Math.sin(time * 9 + candle.spec.x * 3) * 1.2 : 0
      if (candle.lit) {
        const world = candle.flame.getWorldPosition(this.worldPoint)
        candle.flame.lookAt(this.camera.position.x, world.y, this.camera.position.z)
      }
      for (const puff of candle.puffs) {
        if (puff.life <= 0) continue
        puff.life -= dt
        puff.mesh.position.y += puff.vy * dt
        puff.mesh.position.x += puff.x * dt
        puff.mesh.position.z += puff.z * dt
        const material = puff.mesh.material
        if (material instanceof THREE.MeshBasicMaterial) material.opacity = Math.max(0, puff.life) * 0.45
        puff.mesh.visible = puff.life > 0
      }
    }
  }

  private burst(candle: CandleState) {
    for (const puff of candle.puffs) {
      puff.life = 0.55 + Math.random() * 0.25
      puff.vy = 0.55 + Math.random() * 0.35
      puff.x = (Math.random() - 0.5) * 0.08
      puff.z = (Math.random() - 0.5) * 0.08
      puff.mesh.position.set((Math.random() - 0.5) * 0.04, 0.72, (Math.random() - 0.5) * 0.04)
      puff.mesh.visible = true
    }
  }

  private spinLooseWards(dt: number) {
    for (const ward of this.level.wards) {
      if (!ward.active || ward.carried || ward.flying) continue
      ward.group.rotation.x += THREE.MathUtils.degToRad(15) * dt
      ward.group.rotation.y += THREE.MathUtils.degToRad(30) * dt
      ward.group.rotation.z += THREE.MathUtils.degToRad(45) * dt
    }
  }

  private animateDoors(dt: number) {
    for (const door of this.level.doors) {
      const delta = door.target - door.open
      door.open += Math.abs(delta) < 0.001 ? delta : Math.sign(delta) * Math.min(Math.abs(delta), dt * 2.6)
      door.pivot.rotation.y = door.open * door.spec.swing * (Math.PI / 2)
    }
  }

  private updateScare(dt: number) {
    if (this.scareLeft <= 0) return
    this.scareLeft -= dt
    this.scare.visible = this.scareLeft > 0
  }

  private showScare(withSting: boolean) {
    this.scare.visible = true
    this.scareLeft = 1
    const flash = this.el('flash')
    flash.classList.remove('on')
    void flash.offsetWidth
    flash.classList.add('on')
    if (withSting) this.audio.scare()
  }

  private updateHud() {
    const total = this.level.candles.length
    const blown = this.blown()
    const objective = this.el('objective')
    if (this.inExit() && blown < total) {
      objective.textContent = 'First, you must find all the candles to unlock the door'
    } else if (blown >= total) {
      objective.textContent = 'Nice! now escape the mansion by going to the exit'
    } else {
      objective.textContent = `Find ${total - blown} candle(s) to escape`
    }
    this.el('count').textContent = `${blown} candle(s) blown out of ${total}`
    this.el('rage').hidden = blown < total
    this.el('light-state').textContent = this.touch
      ? this.lightOn
        ? 'Light on — it can see you'
        : 'Light off — it is still'
      : this.lightOn
        ? 'Flashlight on — it can see you'
        : 'Flashlight off — it is still'
    this.el('mic').textContent =
      this.mic.status === 'denied' ? 'Mic off — press B to blow' : `Loudness level: ${this.mic.level.toFixed(2)}`
    this.el('hold').textContent = this.carried ? 'Ward in hand' : ''
    this.el('btn-light').classList.toggle('on', this.lightOn)
    this.el('btn-ward').textContent = this.carried ? 'Throw' : 'Ward'
    this.el('prompt').textContent = this.prompt()
    this.el('toast').textContent = this.toastLeft > 0 ? this.toastText : ''
  }

  private prompt(): string {
    if (this.carried) return this.touch ? 'Throw the ward' : 'Click to throw the ward · C to drop'
    const options: { dist: number; text: string }[] = []
    const door = this.closestDoor()
    if (door) {
      const locked = door.spec.id === 'exit' && this.blown() < this.level.candles.length
      options.push({
        dist: this.doorDistance(door),
        text: locked
          ? 'The exit is still locked'
          : this.touch
            ? door.target > 0.5
              ? 'Door — close it'
              : 'Door — open it'
            : door.target > 0.5
              ? 'Press E to close the door'
              : 'Press E to open the door',
      })
    }
    const lit = this.closestCandle(true)
    if (lit) {
      options.push({
        dist: Math.hypot(lit.spec.x - this.playerX, lit.spec.z - this.playerZ),
        text: this.touch
          ? lit.spec.birthday
            ? 'Flame — something is listening'
            : 'Flame — put it out'
          : lit.spec.birthday
            ? 'Press B or blow — something is listening'
            : 'Press B or blow to put the flame out',
      })
    }
    const dark = this.closestCandle(false)
    if (dark) {
      options.push({
        dist: Math.hypot(dark.spec.x - this.playerX, dark.spec.z - this.playerZ),
        text: this.touch ? 'Flame — light it again' : 'Press L to light the candle',
      })
    }
    const ward = this.closestWard()
    if (ward) {
      options.push({
        dist: Math.hypot(ward.x - this.playerX, ward.z - this.playerZ),
        text: this.touch ? 'Ward — pick it up' : 'Press C to take the ward',
      })
    }
    options.sort((a, b) => a.dist - b.dist)
    return options[0]?.text ?? ''
  }

  private applyLights() {
    const playing = this.mode !== 'menu'
    this.flash.intensity = playing && this.lightOn ? 48 : 0
    this.flash.castShadow = playing && this.lightOn
    this.moon.intensity = playing ? 0.09 : 0.7
    this.hemi.intensity = playing ? 0.15 : 0.45
    this.fog.density = playing ? 0.034 : 0.015
  }

  private currentSolids(): Rect[] {
    const solids = this.level.staticSolids.slice()
    for (const door of this.level.doors) {
      const phase = this.doorPhase(door)
      if (phase === 'c') solids.push(doorToRect(door.spec))
      else if (phase === 'o') solids.push(swungDoorRect(door.spec))
    }
    return solids
  }

  private doorPhase(door: DoorState): 'c' | 'm' | 'o' {
    if (door.open < 0.45) return 'c'
    if (door.open > 0.8) return 'o'
    return 'm'
  }

  private ensureGrid(solids: Rect[]) {
    const sig = this.level.doors.map((door) => this.doorPhase(door)).join('')
    if (this.grid && sig === this.navSig) return
    this.navSig = sig
    this.grid = buildGrid(BOUNDS, CELL, solids, INFLATE)
    this.path = []
    this.repath = 0
  }

  private closestCandle(lit: boolean): CandleState | null {
    let best: CandleState | null = null
    let bestDist = INTERACT
    for (const candle of this.level.candles) {
      if (candle.lit !== lit) continue
      const dx = candle.spec.x - this.playerX
      const dz = candle.spec.z - this.playerZ
      const dist = Math.hypot(dx, dz)
      if (dist > bestDist) continue
      if (dist > 0.7 && !this.facing(dx, dz)) continue
      best = candle
      bestDist = dist
    }
    return best
  }

  private closestDoor(): DoorState | null {
    let best: DoorState | null = null
    let bestDist = 1.65
    for (const door of this.level.doors) {
      const dist = this.doorDistance(door)
      if (dist > bestDist) continue
      const midX = door.spec.hx + (door.spec.ax * door.spec.width) / 2
      const midZ = door.spec.hz + (door.spec.az * door.spec.width) / 2
      if (dist > 0.85 && !this.facing(midX - this.playerX, midZ - this.playerZ)) continue
      best = door
      bestDist = dist
    }
    return best
  }

  private closestWard(): WardState | null {
    let best: WardState | null = null
    let bestDist = INTERACT
    for (const ward of this.level.wards) {
      if (!ward.active || ward.carried || ward.flying) continue
      const dist = Math.hypot(ward.x - this.playerX, ward.z - this.playerZ)
      if (dist > bestDist) continue
      if (dist > 0.7 && !this.facing(ward.x - this.playerX, ward.z - this.playerZ)) continue
      best = ward
      bestDist = dist
    }
    return best
  }

  private doorDistance(door: DoorState): number {
    const x2 = door.spec.hx + door.spec.ax * door.spec.width
    const z2 = door.spec.hz + door.spec.az * door.spec.width
    return segmentDistance(this.playerX, this.playerZ, door.spec.hx, door.spec.hz, x2, z2)
  }

  private doorwayOccupied(door: DoorState): boolean {
    const rect = doorToRect(door.spec)
    return (
      circleHits(this.playerX, this.playerZ, RADIUS, [rect]) ||
      circleHits(this.ghostX, this.ghostZ, GHOST_RADIUS, [rect])
    )
  }

  private facing(dx: number, dz: number): boolean {
    const len = Math.hypot(dx, dz) || 1
    const fx = -Math.sin(this.yaw)
    const fz = -Math.cos(this.yaw)
    return (dx / len) * fx + (dz / len) * fz > 0.15
  }

  private inExit(): boolean {
    return (
      this.playerX >= EXIT_ZONE.minX &&
      this.playerX <= EXIT_ZONE.maxX &&
      this.playerZ >= EXIT_ZONE.minZ &&
      this.playerZ <= EXIT_ZONE.maxZ
    )
  }

  private blown(): number {
    return this.level.candles.filter((candle) => !candle.lit).length
  }

  private reset(menuGhost: boolean) {
    this.playerX = PLAYER.x
    this.playerZ = PLAYER.z
    this.yaw = 0
    this.pitch = 0
    this.bob = 0
    this.step = 0
    this.lightOn = true
    this.wasComplete = false
    this.grace = menuGhost ? 0 : 1.35
    this.retreating = false
    this.path = []
    this.repath = 0
    this.toastLeft = 0
    this.scareLeft = 0
    this.scare.visible = false
    this.navSig = ''
    this.grid = null
    for (const door of this.level.doors) {
      door.open = door.spec.startOpen ? 1 : 0
      door.target = door.open
      door.pivot.rotation.y = door.open * door.spec.swing * (Math.PI / 2)
    }
    for (const candle of this.level.candles) {
      candle.lit = true
      candle.justBlown = false
      for (const puff of candle.puffs) {
        puff.life = 0
        puff.mesh.visible = false
      }
    }
    for (const ward of this.level.wards) this.releaseWard(ward, ward.homeX, ward.homeZ)
    const spawn = menuGhost ? { x: 0, z: -3.15 } : SPAWNS[Math.floor(Math.random() * SPAWNS.length)]
    this.ghostX = spawn.x
    this.ghostZ = spawn.z
    this.spawnX = spawn.x
    this.spawnZ = spawn.z
    this.level.ghost.visible = true
    this.level.ghost.position.set(spawn.x, 0, spawn.z)
    this.camera.position.set(PLAYER.x, EYE, PLAYER.z)
    this.camera.rotation.set(0, 0, 0)
  }

  private play() {
    if (this.mode !== 'menu' || this.starting) return
    this.starting = true
    const ctx = this.audio.resume()
    this.lockPointer()
    void this.mic.enable(ctx)
    this.el('fade').classList.add('show')
    window.clearTimeout(this.startTimer)
    this.startTimer = window.setTimeout(() => {
      this.starting = false
      this.reset(false)
      this.setMode('play')
      this.el('fade').classList.remove('show')
    }, 260)
  }

  private pause() {
    if (this.mode !== 'play') return
    this.held.clear()
    this.actions.length = 0
    this.resetStick()
    this.setMode('pause')
    this.unlock()
  }

  private resume() {
    if (this.mode !== 'pause') return
    this.setMode('play')
    this.lockPointer()
  }

  private restart() {
    this.held.clear()
    this.resetStick()
    this.reset(false)
    this.setMode('play')
    this.lockPointer()
  }

  private toMenu() {
    window.clearTimeout(this.startTimer)
    this.starting = false
    this.held.clear()
    this.actions.length = 0
    if (this.mode === 'menu') return
    this.unlock()
    this.reset(true)
    this.setMode('menu')
    this.el('danger').style.opacity = '0'
  }

  private finish(kind: 'win' | 'lose') {
    if (this.mode === 'end') return
    this.endKind = kind
    this.endAt = performance.now() + 2400
    this.endShake = 0
    this.endBase.copy(this.camera.position)
    this.held.clear()
    this.setMode('end')
    this.unlock()
    this.el('end-kicker').textContent = kind === 'win' ? 'The door opens' : 'Caught'
    this.el('end-title').textContent = kind === 'win' ? 'you have escaped! you won!!' : 'You are dead!'
    if (kind === 'lose') {
      this.scare.visible = true
      this.scareLeft = 3
      const flash = this.el('flash')
      flash.classList.remove('on')
      void flash.offsetWidth
      flash.classList.add('on')
      this.audio.lose()
    } else {
      this.audio.win()
    }
  }

  private setMode(mode: Mode) {
    this.mode = mode
    this.el('menu').hidden = mode !== 'menu'
    this.el('hud').hidden = mode !== 'play'
    this.el('pause').hidden = mode !== 'pause'
    this.el('end').hidden = mode !== 'end'
    if (mode === 'pause' && !this.touch) this.el('resume').focus()
  }

  private toast(text: string) {
    this.toastText = text
    this.toastLeft = 2.6
  }

  private bindUi() {
    this.el('play').addEventListener('click', () => this.play())
    this.el('howto').addEventListener('click', () => this.openSheet('How to play', HOW_TO))
    this.el('credits').addEventListener('click', () => this.openSheet('Credits', CREDITS))
    this.el('sheet-close').addEventListener('click', () => {
      this.el('sheet').hidden = true
    })
    this.el('pause-btn').addEventListener('click', () => this.pause())
    this.el('resume').addEventListener('click', () => this.resume())
    this.el('resume-scrim').addEventListener('click', () => this.resume())
    this.el('restart').addEventListener('click', () => this.restart())
    this.el('pause-menu').addEventListener('click', () => this.toMenu())
    this.el('end-menu').addEventListener('click', () => this.toMenu())
  }

  private openSheet(title: string, html: string) {
    this.el('sheet-title').textContent = title
    this.el('sheet-body').innerHTML = html
    this.el('sheet').hidden = false
    this.el('sheet-close').focus()
  }

  private bindInput() {
    window.addEventListener('keydown', (event) => {
      if (event.repeat) return
      if (event.code === 'Escape') {
        if (!this.el('sheet').hidden) {
          this.el('sheet').hidden = true
          return
        }
        if (this.mode === 'play') this.pause()
        else if (this.mode === 'pause') this.resume()
        return
      }
      if (event.code === 'KeyM') {
        this.audio.setMuted(!this.audio.muted)
        return
      }
      if (this.mode === 'menu' && event.code === 'Enter' && this.el('sheet').hidden) {
        event.preventDefault()
        this.play()
        return
      }
      if (this.mode !== 'play') return
      this.held.add(event.code)
      if (MOVEMENT.has(event.code)) event.preventDefault()
      const action = ACTION[event.code]
      if (action) {
        event.preventDefault()
        this.actions.push(action)
      }
    })
    window.addEventListener('keyup', (event) => {
      this.held.delete(event.code)
    })
    window.addEventListener('mousemove', (event) => {
      if (document.pointerLockElement !== this.canvas) return
      this.lookX += event.movementX
      this.lookY += event.movementY
    })
    this.canvas.addEventListener('mousedown', (event) => {
      if (this.mode !== 'play' || this.touch) return
      if (document.pointerLockElement !== this.canvas) {
        this.lockPointer()
        return
      }
      if (event.button === 0) this.actions.push('throw')
    })
    this.canvas.addEventListener('contextmenu', (event) => event.preventDefault())
    document.addEventListener('pointerlockchange', () => {
      if (this.touch) return
      if (document.pointerLockElement !== this.canvas && this.mode === 'play') this.pause()
    })
    this.bindTouch()
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.mode === 'play') this.pause()
    })
    window.addEventListener('resize', () => this.resize())
    window.visualViewport?.addEventListener('resize', () => this.resize())
    window.visualViewport?.addEventListener('scroll', () => this.resize())
    window.addEventListener('blur', () => {
      this.held.clear()
      this.resetStick()
    })
    window.addEventListener(
      'touchmove',
      (event) => {
        if (event.cancelable) event.preventDefault()
      },
      { passive: false },
    )
  }

  private markTouch() {
    document.documentElement.classList.add('touch')
    this.el('blurb').textContent = 'Drag to look. The glass controls walk, blow, and open doors.'
  }

  private lockPointer() {
    if (this.touch) return
    try {
      const result = this.canvas.requestPointerLock()
      void Promise.resolve(result).catch(() => {})
    } catch {
      // Phones reject pointer lock. Touch look does not need it.
    }
  }

  private bindTouch() {
    const stick = this.el('stick')
    const knob = this.el('stick-knob')
    const place = (event: PointerEvent) => {
      const rect = stick.getBoundingClientRect()
      const max = rect.width * 0.34
      let dx = event.clientX - (rect.left + rect.width / 2)
      let dy = event.clientY - (rect.top + rect.height / 2)
      const len = Math.hypot(dx, dy) || 1
      const reach = Math.min(len, max)
      dx = (dx / len) * reach
      dy = (dy / len) * reach
      this.stickX = dx / max
      this.stickY = dy / max
      knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`
    }
    stick.addEventListener('pointerdown', (event) => {
      event.preventDefault()
      event.stopPropagation()
      try {
        stick.setPointerCapture(event.pointerId)
      } catch {
        // The pointer can already be gone on a cancelled touch.
      }
      this.stickPointer = event.pointerId
      place(event)
    })
    stick.addEventListener('pointermove', (event) => {
      if (event.pointerId !== this.stickPointer) return
      place(event)
    })
    const releaseStick = (event: PointerEvent) => {
      if (event.pointerId !== this.stickPointer) return
      this.resetStick()
    }
    stick.addEventListener('pointerup', releaseStick)
    stick.addEventListener('pointercancel', releaseStick)

    const press = (run: () => void) => (event: PointerEvent) => {
      event.preventDefault()
      event.stopPropagation()
      if (this.mode !== 'play') return
      run()
    }
    this.el('btn-light').addEventListener(
      'pointerdown',
      press(() => this.actions.push('light')),
    )
    this.el('btn-use').addEventListener(
      'pointerdown',
      press(() => this.actions.push('use')),
    )
    this.el('btn-blow').addEventListener(
      'pointerdown',
      press(() => this.actions.push(this.closestCandle(true) ? 'blow' : 'relight')),
    )
    this.el('btn-ward').addEventListener(
      'pointerdown',
      press(() => this.actions.push(this.carried ? 'throw' : 'take')),
    )

    window.addEventListener('pointerdown', (event) => {
      if (!this.touch || this.mode !== 'play') return
      const target = event.target
      if (!(target instanceof Element) || target.closest('button, #stick')) return
      this.lookPointer = event.pointerId
      this.lookLastX = event.clientX
      this.lookLastY = event.clientY
    })
    window.addEventListener('pointermove', (event) => {
      if (event.pointerId !== this.lookPointer) return
      this.lookX += (event.clientX - this.lookLastX) * 1.7
      this.lookY += (event.clientY - this.lookLastY) * 1.7
      this.lookLastX = event.clientX
      this.lookLastY = event.clientY
    })
    const releaseLook = (event: PointerEvent) => {
      if (event.pointerId === this.lookPointer) this.lookPointer = -1
    }
    window.addEventListener('pointerup', releaseLook)
    window.addEventListener('pointercancel', releaseLook)
  }

  private resetStick() {
    this.stickX = 0
    this.stickY = 0
    this.stickPointer = -1
    this.lookPointer = -1
    const knob = document.getElementById('stick-knob')
    if (knob) knob.style.transform = 'translate(-50%, -50%)'
  }

  private unlock() {
    if (document.pointerLockElement === this.canvas) document.exitPointerLock()
  }

  private resize() {
    const view = window.visualViewport
    const width = Math.round(view?.width ?? window.innerWidth)
    const height = Math.max(1, Math.round(view?.height ?? window.innerHeight))
    const app = document.getElementById('app')
    if (app && view) {
      app.style.top = `${view.offsetTop}px`
      app.style.left = `${view.offsetLeft}px`
      app.style.width = `${width}px`
      app.style.height = `${height}px`
    }
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer?.setSize(width, height, false)
  }

  private el(id: string): HTMLElement {
    const node = document.getElementById(id)
    if (!node) throw new Error(`Missing #${id}`)
    return node
  }
}

const MOVEMENT = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space'])

function mod(value: number, length: number): number {
  if (!Number.isFinite(value) || length <= 0) return 0
  return ((value % length) + length) % length
}

const HOW_TO = `
<p>Blow out every candle, then leave through the front door. The ghost hunts only while your flashlight is on.</p>
<ul>
  <li>WASD to walk, Shift to sprint, mouse to look. On a phone, drag to look and use the glass controls. Push the stick all the way to sprint.</li>
  <li>Q toggles the flashlight. Off, and the ghost freezes. On, and it chases. Switching it on has a one-in-four chance of a face in yours.</li>
  <li>Stand at a candle and press B, or blow into the mic. L lights it again, which you do not want.</li>
  <li>The ghost relights any candle it reaches while it is moving. Once all five are out, it runs twice as fast.</li>
  <li>E opens and closes a door. A shut door blocks the ghost.</li>
  <li>C takes a spinning ward. Click throws it. A hit sends the ghost back to where it appeared, and the ward is gone.</li>
  <li>Esc pauses. M mutes.</li>
</ul>
`

const CREDITS = `
<p>Ash House is a browser retelling of a small Unity horror prototype: one menu, one house, one ghost.</p>
<p>The chase, the flashlight, the candles, the microphone, the doors, the wards, and the jumpscare are the interactions from those scripts. The house, the ghost, and every sound are generated here — the original meshes and clips were not in the project.</p>
<p>Built with Three.js and Vite for a static deploy.</p>
`
