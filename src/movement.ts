import { CLIMB_LIMIT, GRAVITY, MOVEMENT_ALLOWANCE, MOVEMENT_SPEED, MOVEMENT_SUBSTEP, PLAYER_GAP, PLAYER_HEIGHT, PLAYER_WIDTH, WORLD_HEIGHT, WORLD_WIDTH } from './config.ts'
import { playerSupport, type Player, type Terrain } from './terrain.ts'

export function movePlayer(terrain: Terrain, players: [Player, Player], player: Player, axis: -1 | 0 | 1, dt: number): number {
  if (!axis || player.movementRemaining <= 0) return 0
  let distanceLeft = Math.min(MOVEMENT_SPEED * dt, player.movementRemaining)
  let travelled = 0
  while (distanceLeft > 1e-6) {
    const step = Math.min(MOVEMENT_SUBSTEP, distanceLeft) * axis
    const other = players[player.id === 0 ? 1 : 0]
    const separation = PLAYER_WIDTH + PLAYER_GAP
    const minX = player.id === 0 ? PLAYER_WIDTH / 2 : other.x + separation
    const maxX = player.id === 0 ? other.x - separation : WORLD_WIDTH - PLAYER_WIDTH / 2
    const nextX = Math.max(minX, Math.min(maxX, player.x + step))
    const actual = nextX - player.x
    if (Math.abs(actual) < 1e-6) break
    const currentSupport = playerSupport(terrain, player)
    const nextPlayer = { ...player, x: nextX }
    const nextSupport = playerSupport(terrain, nextPlayer)
    const supportDelta = nextSupport - currentSupport
    if (player.grounded && supportDelta < -CLIMB_LIMIT) break

    player.x = nextX
    if (player.grounded && supportDelta <= CLIMB_LIMIT) {
      player.y = nextSupport - PLAYER_HEIGHT / 2
    } else if (player.grounded) {
      player.grounded = false
      player.velocityY = 0
    }
    const moved = Math.abs(actual)
    travelled += moved
    distanceLeft -= moved
  }
  player.movementRemaining = Math.max(0, player.movementRemaining - travelled)
  return travelled
}

export function stepPlayerGravity(terrain: Terrain, player: Player, dt: number): boolean {
  const support = playerSupport(terrain, player)
  const feet = player.y + PLAYER_HEIGHT / 2
  if (player.grounded && feet < support - 0.01) player.grounded = false
  if (player.grounded) {
    if (feet > support) player.y = support - PLAYER_HEIGHT / 2
    player.velocityY = 0
    return true
  }

  player.velocityY += GRAVITY * dt
  const nextY = player.y + player.velocityY * dt
  if (nextY + PLAYER_HEIGHT / 2 >= support && player.velocityY >= 0) {
    player.y = support - PLAYER_HEIGHT / 2
    player.velocityY = 0
    player.grounded = true
    return true
  }
  player.y = Math.min(nextY, WORLD_HEIGHT - PLAYER_HEIGHT / 2)
  return false
}

export function restoreMovement(player: Player): void {
  player.movementRemaining = MOVEMENT_ALLOWANCE
}
