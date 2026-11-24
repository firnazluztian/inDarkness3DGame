import { circleHits, type Rect } from './collision'

export interface Grid {
  originX: number
  originZ: number
  cell: number
  cols: number
  rows: number
  blocked: Uint8Array
}

export interface Point {
  x: number
  z: number
}

/**
 * Coarse grid stand-in for the Unity NavMeshAgent.
 * Cells are blocked when a body of `inflate` radius would touch a solid.
 */
export function buildGrid(bounds: Rect, cell: number, solids: readonly Rect[], inflate: number): Grid {
  const originX = bounds.minX
  const originZ = bounds.minZ
  const cols = Math.ceil((bounds.maxX - bounds.minX) / cell)
  const rows = Math.ceil((bounds.maxZ - bounds.minZ) / cell)
  const blocked = new Uint8Array(cols * rows)
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const x = originX + (col + 0.5) * cell
      const z = originZ + (row + 0.5) * cell
      if (circleHits(x, z, inflate, solids)) blocked[row * cols + col] = 1
    }
  }
  return { originX, originZ, cell, cols, rows, blocked }
}

export function findPath(grid: Grid, sx: number, sz: number, gx: number, gz: number): Point[] {
  const start = nearestOpen(grid, sx, sz)
  const goal = nearestOpen(grid, gx, gz)
  if (!start || !goal) return []
  const startKey = keyOf(grid, start.col, start.row)
  const goalKey = keyOf(grid, goal.col, goal.row)
  if (startKey === goalKey) return [cellCenter(grid, start.col, start.row)]

  const total = grid.cols * grid.rows
  const came = new Int32Array(total).fill(-1)
  const gScore = new Float32Array(total).fill(Number.POSITIVE_INFINITY)
  gScore[startKey] = 0
  const open: number[] = [startKey]
  const inOpen = new Uint8Array(total)
  inOpen[startKey] = 1

  while (open.length > 0) {
    let bestIndex = 0
    let bestF = Number.POSITIVE_INFINITY
    for (let i = 0; i < open.length; i += 1) {
      const node = open[i]
      const col = node % grid.cols
      const row = (node / grid.cols) | 0
      const f = gScore[node] + heuristic(col, row, goal.col, goal.row)
      if (f < bestF) {
        bestF = f
        bestIndex = i
      }
    }
    const current = open[bestIndex]
    open.splice(bestIndex, 1)
    inOpen[current] = 0
    if (current === goalKey) return smooth(grid, reconstruct(grid, came, current))

    const col = current % grid.cols
    const row = (current / grid.cols) | 0
    for (let dz = -1; dz <= 1; dz += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        if (dx === 0 && dz === 0) continue
        const nextCol = col + dx
        const nextRow = row + dz
        if (!inside(grid, nextCol, nextRow)) continue
        if (grid.blocked[keyOf(grid, nextCol, nextRow)]) continue
        if (dx !== 0 && dz !== 0) {
          if (grid.blocked[keyOf(grid, col + dx, row)] || grid.blocked[keyOf(grid, col, row + dz)]) continue
        }
        const next = keyOf(grid, nextCol, nextRow)
        const cost = dx !== 0 && dz !== 0 ? 1.4142 : 1
        const tentative = gScore[current] + cost
        if (tentative >= gScore[next]) continue
        came[next] = current
        gScore[next] = tentative
        if (!inOpen[next]) {
          open.push(next)
          inOpen[next] = 1
        }
      }
    }
  }
  return []
}

function reconstruct(grid: Grid, came: Int32Array, current: number): Point[] {
  const path: Point[] = []
  let node = current
  while (node !== -1) {
    const col = node % grid.cols
    const row = (node / grid.cols) | 0
    path.push(cellCenter(grid, col, row))
    node = came[node]
  }
  path.reverse()
  return path
}

function smooth(grid: Grid, path: Point[]): Point[] {
  if (path.length < 3) return path
  const result: Point[] = [path[0]]
  let anchor = 0
  for (let i = 2; i < path.length; i += 1) {
    if (!lineClear(grid, path[anchor], path[i])) {
      result.push(path[i - 1])
      anchor = i - 1
    }
  }
  result.push(path[path.length - 1])
  return result
}

function lineClear(grid: Grid, a: Point, b: Point): boolean {
  const distance = Math.hypot(b.x - a.x, b.z - a.z)
  const steps = Math.max(1, Math.ceil(distance / (grid.cell * 0.45)))
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps
    const cell = worldToCell(grid, a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t)
    if (!cell || grid.blocked[keyOf(grid, cell.col, cell.row)]) return false
  }
  return true
}

function nearestOpen(grid: Grid, x: number, z: number): { col: number; row: number } | null {
  const hit = worldToCell(grid, x, z)
  if (!hit) return null
  if (!grid.blocked[keyOf(grid, hit.col, hit.row)]) return hit
  for (let radius = 1; radius <= 10; radius += 1) {
    for (let dz = -radius; dz <= radius; dz += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== radius) continue
        const col = hit.col + dx
        const row = hit.row + dz
        if (!inside(grid, col, row)) continue
        if (!grid.blocked[keyOf(grid, col, row)]) return { col, row }
      }
    }
  }
  return null
}

function worldToCell(grid: Grid, x: number, z: number): { col: number; row: number } | null {
  const col = Math.floor((x - grid.originX) / grid.cell)
  const row = Math.floor((z - grid.originZ) / grid.cell)
  if (!inside(grid, col, row)) return null
  return { col, row }
}

function cellCenter(grid: Grid, col: number, row: number): Point {
  return {
    x: grid.originX + (col + 0.5) * grid.cell,
    z: grid.originZ + (row + 0.5) * grid.cell,
  }
}

function inside(grid: Grid, col: number, row: number): boolean {
  return col >= 0 && row >= 0 && col < grid.cols && row < grid.rows
}

function keyOf(grid: Grid, col: number, row: number): number {
  return row * grid.cols + col
}

function heuristic(col: number, row: number, goalCol: number, goalRow: number): number {
  const dx = Math.abs(col - goalCol)
  const dz = Math.abs(row - goalRow)
  return Math.max(dx, dz) + 0.4142 * Math.min(dx, dz)
}
