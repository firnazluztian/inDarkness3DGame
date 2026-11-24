export interface Rect {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}

export function circleHits(
  x: number,
  z: number,
  radius: number,
  solids: readonly Rect[],
): boolean {
  const r2 = radius * radius
  for (const solid of solids) {
    const inside =
      x >= solid.minX && x <= solid.maxX && z >= solid.minZ && z <= solid.maxZ
    if (inside) return true
    const cx = clamp(x, solid.minX, solid.maxX)
    const cz = clamp(z, solid.minZ, solid.maxZ)
    const dx = x - cx
    const dz = z - cz
    if (dx * dx + dz * dz < r2) return true
  }
  return false
}

/** Slide on X, then Z, in short steps so a fast ghost cannot tunnel thin walls. */
export function moveCircle(
  x: number,
  z: number,
  dx: number,
  dz: number,
  radius: number,
  solids: readonly Rect[],
): { x: number; z: number } {
  const distance = Math.hypot(dx, dz)
  const steps = Math.max(1, Math.ceil(distance / 0.12))
  const stepX = dx / steps
  const stepZ = dz / steps
  let cx = x
  let cz = z
  for (let i = 0; i < steps; i += 1) {
    const nextX = cx + stepX
    if (!circleHits(nextX, cz, radius, solids)) cx = nextX
    const nextZ = cz + stepZ
    if (!circleHits(cx, nextZ, radius, solids)) cz = nextZ
  }
  return { x: cx, z: cz }
}

export function segmentBlocked(
  x0: number,
  z0: number,
  x1: number,
  z1: number,
  solids: readonly Rect[],
): boolean {
  const distance = Math.hypot(x1 - x0, z1 - z0)
  const steps = Math.max(1, Math.ceil(distance / 0.18))
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps
    if (circleHits(x0 + (x1 - x0) * t, z0 + (z1 - z0) * t, 0.05, solids)) return true
  }
  return false
}

export function segmentDistance(
  px: number,
  pz: number,
  ax: number,
  az: number,
  bx: number,
  bz: number,
): number {
  const vx = bx - ax
  const vz = bz - az
  const len2 = vx * vx + vz * vz || 1
  const t = clamp(((px - ax) * vx + (pz - az) * vz) / len2, 0, 1)
  const cx = ax + vx * t
  const cz = az + vz * t
  return Math.hypot(px - cx, pz - cz)
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}
