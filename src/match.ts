import { CAMERA_TRANSITION_SECONDS, EXPLOSION_RADIUS, MOVEMENT_ALLOWANCE, VIEW_WIDTH, WORLD_WIDTH } from './config.ts'
import { movePlayer, stepPlayerGravity } from './movement.ts'
import { createShot, type Shot, type TerminalResult } from './projectile.ts'
import { carveCrater, createPlayers, createTerrain, explosionDamage, type Player, type Terrain } from './terrain.ts'

export type Phase = 'InitialCameraTransition' | 'MovementAiming' | 'ProjectileFlight' | 'Impact' | 'Settling' | 'WinnerCheck' | 'CameraTransition' | 'NextPlayerReady' | 'GameOver'

export interface Match {
  terrain: Terrain
  players: [Player, Player]
  active: 0 | 1
  phase: Phase
  shot?: Shot
  explosion?: { x: number; y: number; time: number }
  impactX?: number
  outcome?: 'Player 1 wins' | 'Player 2 wins' | 'Draw'
  accumulator: number
  pointerId?: number
  cameraX: number
  cameraFromX: number
  cameraToX: number
  cameraElapsed: number
  pendingPlayer: 0 | 1
}

export function cameraCenterX(playerX: number): number {
  return Math.max(0, Math.min(WORLD_WIDTH - VIEW_WIDTH, playerX - VIEW_WIDTH / 2))
}

export function createMatch(): Match {
  const terrain = createTerrain()
  const players = createPlayers(terrain)
  return {
    terrain,
    players,
    active: 0,
    phase: 'InitialCameraTransition',
    accumulator: 0,
    cameraX: 0,
    cameraFromX: 0,
    cameraToX: cameraCenterX(players[0].x),
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

export function resolveShot(match: Match, result: TerminalResult): void {
  match.shot = undefined
  match.impactX = result.kind === 'impact' ? result.x : undefined
  if (result.kind === 'impact') {
    const radius = EXPLOSION_RADIUS
    match.explosion = { x: result.x, y: result.y, time: 0.2 }
    carveCrater(match.terrain, result.x, result.y, radius)
    for (const player of match.players) player.health = Math.max(0, player.health - explosionDamage(player, result.x, result.y, radius))
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

  let target = match.cameraX
  if (match.phase === 'MovementAiming') target = cameraCenterX(match.players[match.active].x)
  else if (match.phase === 'ProjectileFlight' && match.shot) target = cameraCenterX(match.shot.x)
  else if (match.phase === 'Impact' || match.phase === 'Settling' || match.phase === 'WinnerCheck' || match.phase === 'GameOver') {
    if (match.impactX !== undefined) target = cameraCenterX(match.impactX)
  }
  match.cameraX += (target - match.cameraX) * Math.min(1, dt * 8)
  match.cameraX = Math.max(0, Math.min(WORLD_WIDTH - VIEW_WIDTH, match.cameraX))
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
      for (const player of match.players) settled = stepPlayerGravity(match.terrain, player, dt) && settled
      if (settled) match.phase = 'WinnerCheck'
      break
    }
    case 'WinnerCheck': {
      const [one, two] = match.players
      if (one.health === 0 && two.health === 0) {
        match.outcome = 'Draw'
        match.phase = 'GameOver'
      } else if (one.health === 0 || two.health === 0) {
        match.outcome = one.health === 0 ? 'Player 2 wins' : 'Player 1 wins'
        match.phase = 'GameOver'
      } else {
        match.pendingPlayer = match.active === 0 ? 1 : 0
        match.cameraFromX = match.cameraX
        match.cameraToX = cameraCenterX(match.players[match.pendingPlayer].x)
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
