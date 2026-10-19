import { GRAVITY, MAX_LAUNCH_SPEED, PLAYER_HEIGHT, PLAYER_WIDTH, WORLD_HEIGHT, WORLD_WIDTH } from './config.ts'
import { type Player, type Terrain, surfaceAt } from './terrain.ts'

export const STEP_SECONDS = 1 / 120
export const MAX_FLIGHT_SECONDS = 12
export const PROJECTILE_RADIUS = 4
export const PROJECTILE_SPEED_MULTIPLIER = 1.7
export const MIN_SPEED = 120
export const MAX_SPEED = MAX_LAUNCH_SPEED

export interface Shot {
  x: number
  y: number
  vx: number
  vy: number
  age: number
  shooter: number
}

export type TerminalResult =
  | { kind: 'impact'; x: number; y: number; target: 'terrain' | number }
  | { kind: 'miss' }

export function createShot(player: Player): Shot {
  const dx = Math.cos(player.aimAngle)
  const dy = Math.sin(player.aimAngle)
  const halfWidth = PLAYER_WIDTH / 2 + PROJECTILE_RADIUS
  const halfHeight = PLAYER_HEIGHT / 2 + PROJECTILE_RADIUS
  const edge = Math.min(halfWidth / Math.max(Math.abs(dx), 1e-6), halfHeight / Math.max(Math.abs(dy), 1e-6)) + 2
  const speed = MIN_SPEED + player.power * (MAX_SPEED - MIN_SPEED)
  return {
    x: player.x + dx * edge,
    y: player.y + dy * edge,
    vx: dx * speed,
    vy: dy * speed,
    age: 0,
    shooter: player.id,
  }
}

function segmentBoxHit(x0: number, y0: number, x1: number, y1: number, player: Player): number | undefined {
  const minX = player.x - PLAYER_WIDTH / 2 - PROJECTILE_RADIUS
  const maxX = player.x + PLAYER_WIDTH / 2 + PROJECTILE_RADIUS
  const minY = player.y - PLAYER_HEIGHT / 2 - PROJECTILE_RADIUS
  const maxY = player.y + PLAYER_HEIGHT / 2 + PROJECTILE_RADIUS
  let near = 0
  let far = 1
  for (const [start, delta, min, max] of [[x0, x1 - x0, minX, maxX], [y0, y1 - y0, minY, maxY]] as const) {
    if (Math.abs(delta) < 1e-9) {
      if (start < min || start > max) return undefined
      continue
    }
    const a = (min - start) / delta
    const b = (max - start) / delta
    near = Math.max(near, Math.min(a, b))
    far = Math.min(far, Math.max(a, b))
    if (near > far) return undefined
  }
  return near
}

function terrainHit(x0: number, y0: number, x1: number, y1: number, terrain: Terrain): number | undefined {
  const gapAt = (t: number) => {
    const x = x0 + (x1 - x0) * t
    const y = y0 + (y1 - y0) * t
    return y + PROJECTILE_RADIUS - surfaceAt(terrain, x)
  }
  if (gapAt(0) >= 0) return 0
  const dx = x1 - x0
  const boundaries = [1]
  if (dx > 0) {
    for (let x = Math.floor(x0) + 1; x <= Math.floor(x1); x++) boundaries.push((x - x0) / dx)
  } else if (dx < 0) {
    for (let x = Math.ceil(x0) - 1; x >= Math.ceil(x1); x--) boundaries.push((x - x0) / dx)
  }
  boundaries.sort((a, b) => a - b)
  let previous = 0
  let previousGap = gapAt(0)
  for (const t of boundaries) {
    if (t < 0 || t > 1) continue
    const gap = gapAt(t)
    if (gap >= 0) return previous + (t - previous) * (-previousGap / (gap - previousGap))
    previous = t
    previousGap = gap
  }
  return undefined
}

export function sweepShot(shot: Shot, terrain: Terrain, players: Player[], x1: number, y1: number): TerminalResult | undefined {
  const x0 = shot.x
  const y0 = shot.y
  const contacts: { t: number; target: 'terrain' | number }[] = []
  const ground = terrainHit(x0, y0, x1, y1, terrain)
  if (ground !== undefined) contacts.push({ t: ground, target: 'terrain' })
  for (const player of players) {
    if (player.health <= 0) continue
    if (player.id === shot.shooter && shot.age === 0) continue
    const t = segmentBoxHit(x0, y0, x1, y1, player)
    if (t !== undefined) contacts.push({ t, target: player.id })
  }
  contacts.sort((a, b) => a.t - b.t)
  const contact = contacts[0]
  if (!contact) return undefined
  return { kind: 'impact', x: x0 + (x1 - x0) * contact.t, y: y0 + (y1 - y0) * contact.t, target: contact.target }
}

export function stepShot(shot: Shot, terrain: Terrain, players: Player[], dt = STEP_SECONDS): TerminalResult | undefined {
  const stepDuration = Math.min(dt, MAX_FLIGHT_SECONDS - shot.age)
  const endX = shot.x + shot.vx * stepDuration
  const endY = shot.y + shot.vy * stepDuration + 0.5 * GRAVITY * stepDuration * stepDuration
  const impact = sweepShot(shot, terrain, players, endX, endY)
  const exitT = endX < 0 && shot.vx < 0 ? -shot.x / (endX - shot.x)
    : endX > WORLD_WIDTH && shot.vx > 0 ? (WORLD_WIDTH - shot.x) / (endX - shot.x) : undefined
  if (impact?.kind === 'impact') {
    const dx = endX - shot.x
    const dy = endY - shot.y
    const distanceSquared = dx * dx + dy * dy
    const impactT = distanceSquared === 0 ? 0 : ((impact.x - shot.x) * dx + (impact.y - shot.y) * dy) / distanceSquared
    if (exitT === undefined || impactT <= exitT) return impact
  }
  if (exitT !== undefined && exitT >= 0 && exitT <= 1) return { kind: 'miss' }
  shot.x = endX
  shot.y = endY
  shot.vy += GRAVITY * stepDuration
  shot.age += stepDuration
  if (shot.age >= MAX_FLIGHT_SECONDS) return { kind: 'miss' }
  if (shot.y - PROJECTILE_RADIUS > WORLD_HEIGHT) return { kind: 'miss' }
  return undefined
}

export function trajectory(shot: Shot, terrain: Terrain, players: Player[], seconds = 0.75): { x: number; y: number }[] {
  const copy = { ...shot }
  const points: { x: number; y: number }[] = []
  const steps = Math.floor(seconds / STEP_SECONDS)
  for (let i = 0; i < steps; i++) {
    const result = stepShot(copy, terrain, players)
    if (i % 8 === 0) points.push({ x: copy.x, y: copy.y })
    if (result) break
  }
  return points
}
