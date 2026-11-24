import { circleHits } from '../src/game/collision'
import {
  allSolids,
  BOUNDS,
  CANDLES,
  DOORS,
  MARK,
  PLAYER,
  SPAWNS,
  WARDS,
} from '../src/game/layout'
import { buildGrid, findPath } from '../src/game/nav'

const failures: string[] = []

function check(condition: boolean, message: string) {
  if (!condition) failures.push(message)
}

function solids(closed: string[], floor: 0 | 1 = 0) {
  return allSolids(new Set(closed), floor)
}

function canReach(
  from: { x: number; z: number },
  to: { x: number; z: number },
  closed: string[],
  floor: 0 | 1 = 0,
): boolean {
  const grid = buildGrid(BOUNDS, 0.4, solids(closed, floor), 0.28)
  return findPath(grid, from.x, from.z, to.x, to.z).length > 0
}

function approachable(
  x: number,
  z: number,
  closed: string[],
  floor: 0 | 1,
  from: { x: number; z: number },
): boolean {
  const body = solids(closed, floor)
  for (let i = 0; i < 20; i += 1) {
    const angle = (i / 20) * Math.PI * 2
    const px = x + Math.cos(angle) * 1.2
    const pz = z + Math.sin(angle) * 1.2
    if (circleHits(px, pz, 0.3, body)) continue
    if (canReach(from, { x: px, z: pz }, closed, floor)) return true
  }
  return false
}

const open = ['exit']
const shut = DOORS.map((door) => door.id)

for (const point of [PLAYER, MARK.hall, MARK.living, MARK.bedroom, MARK.kitchen, MARK.dining, MARK.stairBottom]) {
  check(!circleHits(point.x, point.z, 0.3, solids(open, 0)), `blocked ground sample ${point.x},${point.z}`)
}
for (const point of [MARK.stairTop, MARK.study, MARK.guest, MARK.upperHall]) {
  check(!circleHits(point.x, point.z, 0.3, solids(open, 1)), `blocked upper sample ${point.x},${point.z}`)
}
for (const spawn of SPAWNS) {
  check(!circleHits(spawn.x, spawn.z, 0.3, solids(open, spawn.floor)), `blocked spawn ${spawn.x},${spawn.z}`)
}

for (const candle of CANDLES) {
  const from = candle.floor === 0 ? PLAYER : MARK.stairTop
  check(approachable(candle.x, candle.z, open, candle.floor, from), `no approach to candle ${candle.id}`)
}
for (const ward of WARDS) {
  const from = ward.floor === 0 ? PLAYER : MARK.stairTop
  check(approachable(ward.x, ward.z, open, ward.floor, from), `no approach to ward ${ward.x},${ward.z}`)
}

check(canReach(MARK.bedroom, PLAYER, open), 'bedroom should reach the foyer while doors are open')
check(canReach(MARK.dining, PLAYER, open), 'dining should reach the foyer while doors are open')
check(canReach(MARK.kitchen, MARK.living, open), 'kitchen should reach the living room')
check(canReach(MARK.bedroom, PLAYER, shut) === false, 'closed doors should seal the bedroom from the foyer')

for (const spawn of SPAWNS) {
  const goal = spawn.floor === 0 ? PLAYER : MARK.stairTop
  check(canReach(spawn, goal, open, spawn.floor), `ghost spawn ${spawn.x},${spawn.z} cannot reach its floor exit`)
}

check(canReach(PLAYER, MARK.stairBottom, open, 0), 'foyer should reach the bottom of the stairs')
check(canReach(MARK.stairTop, MARK.study, open, 1), 'upstairs landing should reach the study')
check(canReach(MARK.stairTop, MARK.guest, open, 1), 'upstairs landing should reach the guest room')
check(canReach(MARK.stairTop, MARK.upperHall, open, 1), 'upstairs landing should reach the upper hall')
check(!circleHits(MARK.stairBottom.x, 1.4, 0.3, solids(open, 0)), 'stair run is blocked on the ground floor')
check(!circleHits(MARK.stairBottom.x, 1.4, 0.3, solids(open, 1)), 'stair run is blocked upstairs')

if (failures.length > 0) {
  console.error(failures.join('\n'))
  process.exit(1)
}

console.log(`layout ok — ${CANDLES.length} candles, ${DOORS.length} doors, ${SPAWNS.length} ghost spawns`)
