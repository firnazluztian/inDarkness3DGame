import type { Rect } from './collision'

export interface WallSeg {
  x0: number
  z0: number
  x1: number
  z1: number
}

export interface Prop {
  id: string
  cx: number
  cz: number
  w: number
  d: number
  h: number
  mat: 'wood' | 'fabric' | 'stone' | 'metal'
  solid: boolean
}

export interface DoorSpec {
  id: string
  hx: number
  hz: number
  /** Closed door extends from the hinge along this unit axis. */
  ax: number
  az: number
  /** +1 swings with positive yaw. */
  swing: 1 | -1
  width: number
  startOpen: boolean
}

export interface CandleSpec {
  id: string
  x: number
  z: number
  /** Height of the surface the stick sits on. */
  y: number
  birthday?: boolean
}

export interface Marker {
  x: number
  z: number
}

export const WALL_T = 0.22
export const WALL_H = 2.7

export const BOUNDS: Rect = { minX: -10.5, maxX: 10.5, minZ: -7.5, maxZ: 8.2 }

/** Axis-aligned wall centerlines. Gaps are doorways. */
export const WALLS: WallSeg[] = [
  { x0: -10, z0: -7, x1: -10, z1: 7 },
  { x0: 10, z0: -7, x1: 10, z1: 7 },
  { x0: -10, z0: -7, x1: 10, z1: -7 },
  { x0: -10, z0: 7, x1: -0.9, z1: 7 },
  { x0: 0.9, z0: 7, x1: 10, z1: 7 },
  { x0: -2.2, z0: -7, x1: -2.2, z1: -4.7 },
  { x0: -2.2, z0: -3.1, x1: -2.2, z1: 1.4 },
  { x0: -2.2, z0: 3.0, x1: -2.2, z1: 7 },
  { x0: 2.2, z0: -7, x1: 2.2, z1: -4.9 },
  { x0: 2.2, z0: -3.3, x1: 2.2, z1: 1.7 },
  { x0: 2.2, z0: 3.3, x1: 2.2, z1: 7 },
  { x0: -10, z0: -1, x1: -6.5, z1: -1 },
  { x0: -4.9, z0: -1, x1: -2.2, z1: -1 },
  { x0: 2.2, z0: -1, x1: 5.0, z1: -1 },
  { x0: 6.6, z0: -1, x1: 10, z1: -1 },
  { x0: -2.2, z0: 3.4, x1: -1.15, z1: 3.4 },
  { x0: 1.15, z0: 3.4, x1: 2.2, z1: 3.4 },
]

export const PROPS: Prop[] = [
  { id: 'sofa', cx: -8.9, cz: 4.55, w: 1.05, d: 2.2, h: 0.72, mat: 'fabric', solid: true },
  { id: 'coffee', cx: -6.55, cz: 4.35, w: 1.35, d: 0.8, h: 0.36, mat: 'wood', solid: true },
  { id: 'shelf', cx: -9.28, cz: 1.2, w: 0.48, d: 1.3, h: 1.55, mat: 'wood', solid: true },
  { id: 'bed', cx: -8.15, cz: -5.25, w: 2.35, d: 1.5, h: 0.52, mat: 'fabric', solid: true },
  { id: 'nightstand', cx: -5.9, cz: -6.28, w: 0.52, d: 0.42, h: 0.62, mat: 'wood', solid: true },
  { id: 'wardrobe', cx: -9.28, cz: -3.15, w: 0.5, d: 1.45, h: 1.75, mat: 'wood', solid: true },
  { id: 'table', cx: 5.8, cz: -4.65, w: 2.7, d: 1.3, h: 0.74, mat: 'wood', solid: true },
  { id: 'counter', cx: 9.18, cz: 3.35, w: 0.7, d: 4.8, h: 1.02, mat: 'wood', solid: true },
  { id: 'cart', cx: 4.35, cz: 6.15, w: 1.05, d: 0.58, h: 0.82, mat: 'wood', solid: true },
  { id: 'foyer-table', cx: -1.55, cz: 4.5, w: 0.86, d: 0.5, h: 0.58, mat: 'wood', solid: true },
  { id: 'rug-foyer', cx: 0.1, cz: 5.35, w: 2.3, d: 2.15, h: 0.02, mat: 'fabric', solid: false },
  { id: 'rug-living', cx: -6.7, cz: 4.5, w: 3.1, d: 2.3, h: 0.02, mat: 'fabric', solid: false },
]

export const DOORS: DoorSpec[] = [
  { id: 'living', hx: -2.2, hz: 1.4, ax: 0, az: 1, swing: -1, width: 1.6, startOpen: true },
  { id: 'bedroom', hx: -2.2, hz: -4.7, ax: 0, az: 1, swing: -1, width: 1.6, startOpen: true },
  { id: 'kitchen', hx: 2.2, hz: 1.7, ax: 0, az: 1, swing: 1, width: 1.6, startOpen: true },
  { id: 'dining', hx: 2.2, hz: -4.9, ax: 0, az: 1, swing: 1, width: 1.6, startOpen: true },
  { id: 'bed-living', hx: -6.5, hz: -1, ax: 1, az: 0, swing: -1, width: 1.6, startOpen: true },
  { id: 'dine-kitchen', hx: 5.0, hz: -1, ax: 1, az: 0, swing: -1, width: 1.6, startOpen: true },
  { id: 'exit', hx: -0.9, hz: 7, ax: 1, az: 0, swing: 1, width: 1.8, startOpen: false },
]

export const CANDLES: CandleSpec[] = [
  { id: 'foyer', x: -1.55, z: 4.5, y: 0.58 },
  { id: 'living', x: -6.45, z: 6.12, y: 0 },
  { id: 'bedroom', x: -5.9, z: -6.28, y: 0.62 },
  { id: 'kitchen', x: 9.15, z: 4.15, y: 1.02 },
  { id: 'birthday', x: 5.8, z: -4.22, y: 0.74, birthday: true },
]

export const WARDS: Marker[] = [
  { x: 1.28, z: 5.9 },
  { x: -4.05, z: -5.55 },
  { x: 4.15, z: 2.35 },
]

export const SPAWNS: Marker[] = [
  { x: -3.75, z: -5.15 },
  { x: 8.55, z: -6.35 },
  { x: 6.7, z: 4.85 },
  { x: 0, z: -5.5 },
]

export const PLAYER: Marker = { x: 0, z: 5.15 }

export const MARK = {
  hall: { x: 0, z: 0.2 },
  living: { x: -6.1, z: 2.6 },
  bedroom: { x: -4.7, z: -3.55 },
  kitchen: { x: 5.6, z: 3.15 },
  dining: { x: 6.3, z: -2.9 },
} as const

/** Just inside the front door. Standing here with every candle out wins. */
export const EXIT_ZONE: Rect = { minX: -0.95, maxX: 0.95, minZ: 6.05, maxZ: 7.25 }

/** Keeps an open exit from spilling into an endless yard. */
export const STOPPER: Rect = { minX: -1.25, maxX: 1.25, minZ: 7.2, maxZ: 7.95 }

export function wallToRect(wall: WallSeg, thickness = WALL_T): Rect {
  if (Math.abs(wall.x0 - wall.x1) < 1e-4) {
    return {
      minX: wall.x0 - thickness / 2,
      maxX: wall.x0 + thickness / 2,
      minZ: Math.min(wall.z0, wall.z1),
      maxZ: Math.max(wall.z0, wall.z1),
    }
  }
  return {
    minX: Math.min(wall.x0, wall.x1),
    maxX: Math.max(wall.x0, wall.x1),
    minZ: wall.z0 - thickness / 2,
    maxZ: wall.z0 + thickness / 2,
  }
}

/** The panel after a full swing, so an open door still occupies space. */
export function swungDoorRect(door: DoorSpec): Rect {
  const theta = door.swing * (Math.PI / 2)
  const rx = door.ax * Math.cos(theta) + door.az * Math.sin(theta)
  const rz = -door.ax * Math.sin(theta) + door.az * Math.cos(theta)
  const x2 = door.hx + rx * door.width
  const z2 = door.hz + rz * door.width
  const pad = 0.08
  return {
    minX: Math.min(door.hx, x2) - pad,
    maxX: Math.max(door.hx, x2) + pad,
    minZ: Math.min(door.hz, z2) - pad,
    maxZ: Math.max(door.hz, z2) + pad,
  }
}

export function doorToRect(door: DoorSpec, thickness = WALL_T): Rect {
  const x2 = door.hx + door.ax * door.width
  const z2 = door.hz + door.az * door.width
  if (Math.abs(door.ax) < 0.5) {
    return {
      minX: door.hx - thickness / 2,
      maxX: door.hx + thickness / 2,
      minZ: Math.min(door.hz, z2),
      maxZ: Math.max(door.hz, z2),
    }
  }
  return {
    minX: Math.min(door.hx, x2),
    maxX: Math.max(door.hx, x2),
    minZ: door.hz - thickness / 2,
    maxZ: door.hz + thickness / 2,
  }
}

export function propToRect(prop: Prop): Rect {
  return {
    minX: prop.cx - prop.w / 2,
    maxX: prop.cx + prop.w / 2,
    minZ: prop.cz - prop.d / 2,
    maxZ: prop.cz + prop.d / 2,
  }
}

export function staticSolids(): Rect[] {
  const solids = WALLS.map((wall) => wallToRect(wall))
  for (const prop of PROPS) {
    if (prop.solid) solids.push(propToRect(prop))
  }
  solids.push(STOPPER)
  return solids
}

export function allSolids(closedDoorIds: ReadonlySet<string>): Rect[] {
  const solids = staticSolids()
  for (const door of DOORS) {
    solids.push(closedDoorIds.has(door.id) ? doorToRect(door) : swungDoorRect(door))
  }
  return solids
}
