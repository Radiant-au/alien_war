import { CAMERA_TRANSITION_SECONDS, EXPLOSION_RADIUS, MOVEMENT_ALLOWANCE, VIEW_WIDTH, WORLD_WIDTH } from './config.ts'
import { movePlayer, stepPlayerGravity } from './movement.ts'
import { createShot, type Shot, type TerminalResult } from './projectile.ts'
import { carveCrater, createPlayers, createTerrain, explosionDamage, type Player, type Terrain } from './terrain.ts'

export type Phase = 'InitialCameraTransition' | 'MovementAiming' | 'ProjectileFlight' | 'Impact' | 'Settling' | 'WinnerCheck' | 'CameraTransition' | 'NextPlayerReady' | 'GameOver'

export interface Match {
  terrain: Terrain
  players: Player[]
  active: number
  phase: Phase
  shot?: Shot
  explosion?: { x: number; y: number; time: number }
  impactX?: number
  outcome?: string
  accumulator: number
  pointerId?: number
  viewWidth: number
  cameraX: number
  cameraZoom: number
  cameraFromX: number
  cameraToX: number
  cameraElapsed: number
  pendingPlayer: number
}

export function cameraCenterX(playerX: number): number {
  return Math.max(0, Math.min(WORLD_WIDTH - VIEW_WIDTH, playerX - VIEW_WIDTH / 2))
}

export function overviewZoom(players: Player[], viewWidth = VIEW_WIDTH): number {
  const alive = players.filter(p => p.health > 0)
  const visible = alive.length ? alive : players
  const separation = Math.max(...visible.map(p => p.x)) - Math.min(...visible.map(p => p.x))
  return Math.max(viewWidth / WORLD_WIDTH, Math.min(1, viewWidth / (separation + 240)))
}

export function overviewScrollX(players: Player[], zoom = overviewZoom(players), viewWidth = VIEW_WIDTH): number {
  const alive = players.filter(p => p.health > 0)
  const visible = alive.length ? alive : players
  const midpoint = (Math.min(...visible.map(p => p.x)) + Math.max(...visible.map(p => p.x))) / 2
  const visibleWidth = viewWidth / zoom
  return Math.max(0, Math.min(WORLD_WIDTH - visibleWidth, midpoint - visibleWidth / 2))
}

export function createMatch(seed = 0x51a7, count = 2): Match {
  const terrain = createTerrain(seed, count)
  const players = createPlayers(terrain, count)
  return {
    viewWidth: VIEW_WIDTH,
    terrain,
    players,
    active: 0,
    phase: 'InitialCameraTransition',
    accumulator: 0,
    cameraX: overviewScrollX(players),
    cameraZoom: overviewZoom(players),
    cameraFromX: overviewScrollX(players),
    cameraToX: overviewScrollX(players),
    cameraElapsed: 0,
    pendingPlayer: 0,
  }
}

export function fire(match: Match): boolean {
  const player = match.players[match.active]
  if (match.phase !== 'MovementAiming' || !player.grounded || player.health === 0 || match.pointerId !== undefined) return false
  match.shot = createShot(player)
  match.phase = 'ProjectileFlight'
  match.accumulator = 0
  return true
}

export function resolveShot(match: Match, result: TerminalResult, blast = { radius: EXPLOSION_RADIUS, damage: 60 }): void {
  match.shot = undefined
  match.impactX = result.kind === 'impact' ? result.x : undefined
  if (result.kind === 'impact') {
    const radius = blast.radius
    match.explosion = { x: result.x, y: result.y, time: 0.2 }
    carveCrater(match.terrain, result.x, result.y, radius)
    for (const player of match.players) player.health = Math.max(0, player.health - explosionDamage(player, result.x, result.y, radius, blast.damage))
  }
  match.phase = 'Impact'
}

function stepCamera(match: Match, dt: number): void {
  if (match.phase === 'InitialCameraTransition' || match.phase === 'CameraTransition') {
    match.cameraElapsed += dt
    const t = Math.min(1, match.cameraElapsed / CAMERA_TRANSITION_SECONDS)
    const eased = 1 - (1 - t) ** 3
    match.cameraX = match.cameraFromX + (match.cameraToX - match.cameraFromX) * eased
    if (t >= 1) {
      match.cameraX = match.cameraToX
      match.phase = 'NextPlayerReady'
    }
    return
  }

  const zoom = match.cameraZoom
  const overview = overviewScrollX(match.players, zoom, match.viewWidth)
  let target = overview
  if (match.phase === 'ProjectileFlight' && match.shot) {
    const visibleWidth = match.viewWidth / zoom
    const margin = 90 / zoom
    const left = match.cameraX + margin
    const right = match.cameraX + visibleWidth - margin
    if (match.shot.x < left) target = match.shot.x - margin
    else if (match.shot.x > right) target = match.shot.x - visibleWidth + margin
    else target = match.cameraX
  } else if (match.phase === 'Impact' || match.phase === 'Settling') {
    target = match.cameraX
  }
  match.cameraX += (target - match.cameraX) * Math.min(1, dt * 8)
  const maxScroll = Math.max(0, WORLD_WIDTH - match.viewWidth / zoom)
  match.cameraX = Math.max(0, Math.min(maxScroll, match.cameraX))
}

export function updateMatch(match: Match, dt: number, movementAxis: -1 | 0 | 1 = 0): void {
  switch (match.phase) {
    case 'MovementAiming': {
      const active = match.players[match.active]
      movePlayer(match.terrain, match.players, active, movementAxis, dt)
      stepPlayerGravity(match.terrain, active, dt)
      break
    }
    case 'Impact':
      if (match.explosion) {
        match.explosion.time -= dt
        if (match.explosion.time <= 0) match.explosion = undefined
      }
      if (!match.explosion) match.phase = 'Settling'
      break
    case 'Settling': {
      let settled = true
      for (const player of match.players) if (player.health > 0) settled = stepPlayerGravity(match.terrain, player, dt) && settled
      if (settled) match.phase = 'WinnerCheck'
      break
    }
    case 'WinnerCheck': {
      const alive = match.players.filter(player => player.health > 0)
      if (alive.length <= 1) {
        match.outcome = alive.length === 0 ? 'Draw' : `Player ${alive[0].id + 1} wins`
        match.phase = 'GameOver'
      } else {
        let next = (match.active + 1) % match.players.length
        while (match.players[next].health <= 0) next = (next + 1) % match.players.length
        match.pendingPlayer = next
        match.cameraFromX = match.cameraX
        match.cameraToX = overviewScrollX(match.players, match.cameraZoom, match.viewWidth)
        match.cameraElapsed = 0
        match.phase = 'CameraTransition'
      }
      break
    }
    case 'NextPlayerReady':
      match.active = match.pendingPlayer
      match.players[match.active].movementRemaining = MOVEMENT_ALLOWANCE
      match.impactX = undefined
      match.phase = 'MovementAiming'
      break
  }
  stepCamera(match, dt)
}

