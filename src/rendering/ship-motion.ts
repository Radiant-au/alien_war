import { PLAYER_HEIGHT, PLAYER_WIDTH } from '../game/config.ts'
import { surfaceAt, type Player, type Terrain } from '../game/terrain.ts'

/** Visual-only pose; never move the collision body for hover or slope animation. */
export function shipPose(terrain: Terrain, player: Player, time: number, reducedMotion = false) {
  const half = PLAYER_WIDTH / 2
  const slope = Math.atan2(surfaceAt(terrain, player.x + half) - surfaceAt(terrain, player.x - half), PLAYER_WIDTH)
  const bob = reducedMotion || !player.grounded ? 0 : Math.sin(time * 1.8 + player.id * 1.7) * 8
  return {
    x: player.x, y: player.y - 6 + bob,
    groundY: player.y + PLAYER_HEIGHT / 2,
    angle: player.grounded ? Math.max(-.55, Math.min(.55, slope)) + (reducedMotion ? 0 : Math.sin(time * 1.8 + player.id * 1.7) * .045) : 0,
    pulse: reducedMotion ? .3 : (time * .7 + player.id * .23) % 1,
  }
}


/** Damped firing impulse, applied to drawing only, never collision or trajectory. */
export function shotRecoil(age:number,angle:number,power:number,reducedMotion=false) {
  if(reducedMotion||!Number.isFinite(age)||age<=0||age>=.65)return {x:0,y:0,angle:0}
  const kick=Math.sin(age*24)*Math.exp(-age*9)*(5+Math.max(0,Math.min(1,power))*6)
  return {x:-Math.cos(angle)*kick,y:-Math.sin(angle)*kick*.3,angle:Math.cos(angle)*kick*.009}
}
