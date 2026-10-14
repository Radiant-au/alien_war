import { PLAYER_HEIGHT, PLAYER_WIDTH } from './config.ts'
import { surfaceAt, type Player, type Terrain } from './terrain.ts'

/** Visual-only pose; never move the collision body for hover or slope animation. */
export function shipPose(terrain: Terrain, player: Player, time: number, reducedMotion = false) {
  const half = PLAYER_WIDTH / 2
  const slope = Math.atan2(surfaceAt(terrain, player.x + half) - surfaceAt(terrain, player.x - half), PLAYER_WIDTH)
  const bob = reducedMotion ? 0 : Math.sin(time * 2.4 + player.id * 1.7) * 1.8
  return {
    x: player.x, y: player.y - 2 + bob,
    groundY: player.y + PLAYER_HEIGHT / 2,
    angle: player.grounded ? Math.max(-.55, Math.min(.55, slope)) : 0,
    pulse: reducedMotion ? .3 : (time * .7 + player.id * .23) % 1,
  }
}
