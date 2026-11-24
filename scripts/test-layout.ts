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

function solids(closed: string[]) {
  return allSolids(new Set(closed))
}

function canReach(
  from: { x: number; z: number },
  to: { x: number; z: number },
  closed: string[],
): boolean {
  const grid = buildGrid(BOUNDS, 0.4, solids(closed), 0.28)
  return findPath(grid, from.x, from.z, to.x, to.z).length > 0
}

function approachable(x: number, z: number, closed: string[]): boolean {
  const body = solids(closed)
  for (let i = 0; i < 20; i += 1) {
    const angle = (i / 20) * Math.PI * 2
    const px = x + Math.cos(angle) * 1.2
    const pz = z + Math.sin(angle) * 1.2
    if (circleHits(px, pz, 0.3, body)) continue
    if (canReach(PLAYER, { x: px, z: pz }, closed)) return true
  }
  return false
}

const open = ['exit']
const shut = DOORS.map((door) => door.id)

for (const point of [PLAYER, ...SPAWNS, MARK.hall, MARK.living, MARK.bedroom, MARK.kitchen, MARK.dining]) {
  check(!circleHits(point.x, point.z, 0.3, solids(open)), `blocked spawn/sample ${point.x},${point.z}`)
}

for (const candle of CANDLES) {
  check(approachable(candle.x, candle.z, open), `no approach to candle ${candle.id}`)
}
for (const ward of WARDS) {
  check(approachable(ward.x, ward.z, open), `no approach to ward ${ward.x},${ward.z}`)
}

check(canReach(MARK.bedroom, PLAYER, open), 'bedroom should reach the foyer while doors are open')
check(canReach(MARK.dining, PLAYER, open), 'dining should reach the foyer while doors are open')
check(canReach(MARK.kitchen, MARK.living, open), 'kitchen should reach the living room')
check(canReach(MARK.bedroom, PLAYER, shut) === false, 'closed doors should seal the bedroom from the foyer')

for (const spawn of SPAWNS) {
  check(canReach(spawn, PLAYER, open), `ghost spawn ${spawn.x},${spawn.z} cannot reach the player`)
}

if (failures.length > 0) {
  console.error(failures.join('\n'))
  process.exit(1)
}

console.log(`layout ok — ${CANDLES.length} candles, ${DOORS.length} doors, ${SPAWNS.length} ghost spawns`)
