import { BURN_DAMAGE } from './spells.ts'
import { CAMERA_TRANSITION_SECONDS, EXPLOSION_RADIUS, MOVEMENT_ALLOWANCE, VIEW_WIDTH, WORLD_WIDTH } from './config.ts'
import { movePlayer, stepPlayerGravity } from './movement.ts'
import { createShot, type Shot, type TerminalResult } from './projectile.ts'
import { carveCrater, createPlayers, createTerrain, explosionDamage, type Player, type Terrain } from './terrain.ts'

export type Phase = 'InitialCameraTransition' | 'MovementAiming' | 'ProjectileFlight' | 'Impact' | 'Settling' | 'WinnerCheck' | 'CameraTransition' | 'NextPlayerReady' | 'GameOver'

export interface Match {
  /** Defined only for solo matches against AI. */
  humanPlayerId?: number
  poisons: { player: number; remaining: number; elapsed: number }[]
  burnGrants: number[]
  burns: { player: number; remaining: number; elapsed: number }[]
  burnTicks: number[]
  support: {shots:number;ready:boolean}[]
  damageTicks: number[]
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

export function createMatch(seed = 0x51a7, count = 2, variant?: number): Match {
  const terrain = createTerrain(seed, count, variant)
  const players = createPlayers(terrain, count)
  return {
    poisons: [], damageTicks: [], burns: [], burnGrants: [], burnTicks: [], support: players.map(()=>({shots:0,ready:false})),
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
  const support=match.support[player.id]
  support.shots++
  if(support.shots%3===0)support.ready=true
  match.burnGrants=[]
  match.shot = createShot(player)
  match.phase = 'ProjectileFlight'
  match.accumulator = 0
  return true
}

export function resolveShot(match: Match, result: TerminalResult, blast: { radius: number; damage: number; destroyTerrain?: boolean; effect?: string; terrainRadius?: number } = { radius: EXPLOSION_RADIUS, damage: 60 }): void {
  applyShotResult(match,result,blast)
  finishShot(match)
}

export function applyShotResult(match: Match, result: TerminalResult, blast: { radius: number; damage: number; destroyTerrain?: boolean; effect?: string; terrainRadius?: number }): void {
  match.impactX = result.kind === 'impact' ? result.x : undefined
  if (result.kind === 'impact') {
    const radius = blast.radius
    match.explosion = { x: result.x, y: result.y, time: 0.2 }
    if (blast.destroyTerrain !== false) carveCrater(match.terrain, result.x, result.y, blast.terrainRadius ?? radius)
    for (const player of match.players) {
      const damage = explosionDamage(player, result.x, result.y, radius, blast.damage)
      if (blast.effect === 'poison') {
        if (damage > 0 && player.health > 0) {
          const existing = match.poisons.find(p => p.player === player.id)
          if (existing) existing.remaining = Math.max(existing.remaining, damage)
          else match.poisons.push({ player: player.id, remaining: damage, elapsed: 0 })
        }
        continue
      }
      damagePlayer(player,damage)
      if(blast.effect==='fire'&&damage>0&&player.health>0){
        const remaining=explosionDamage(player,result.x,result.y,radius,BURN_DAMAGE)
        const existing=match.burns.find(b=>b.player===player.id)
        const granted=match.burnGrants[player.id]??0,additional=Math.max(0,remaining-granted)
        match.burnGrants[player.id]=Math.max(granted,remaining)
        if(existing)existing.remaining=granted===0?Math.max(existing.remaining,remaining):Math.min(BURN_DAMAGE,existing.remaining+additional)
        else if(additional>0)match.burns.push({player:player.id,remaining:additional,elapsed:0})
      }
      if (damage > 0 && player.health > 0) {
        player.grounded = false
        player.velocityY = -Math.min(360, 120 + damage * 2)
      }
    }
  }
}

export function finishShot(match: Match): void {
  match.shot = undefined
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
  match.damageTicks = [];match.burnTicks=[]
  if (match.phase === 'GameOver') return
  for (const poison of match.poisons) {
    const player = match.players[poison.player]
    poison.elapsed += dt
    while (poison.elapsed >= .5 && poison.remaining > 0 && player.health > 0) {
      poison.elapsed -= .5; poison.remaining--; damagePlayer(player,1)
      match.damageTicks.push(player.id)
    }
  }
  match.poisons = match.poisons.filter(p => p.remaining > 0 && match.players[p.player].health > 0)
  for(const burn of match.burns){
    const player=match.players[burn.player];burn.elapsed+=dt
    while(burn.elapsed>=.5&&burn.remaining>0&&player.health>0){
      burn.elapsed-=.5;burn.remaining--;damagePlayer(player,1);match.burnTicks.push(player.id)
    }
  }
  match.burns=match.burns.filter(b=>b.remaining>0&&match.players[b.player].health>0)
  if (match.humanPlayerId !== undefined && match.players[match.humanPlayerId].health <= 0) {
    match.outcome = match.players.every(p => p.health <= 0) ? 'Draw' : 'Defeat'
    match.phase = 'GameOver'
    match.shot = undefined
    match.pointerId = undefined
    return
  }
  // Resolve deaths at safe phase boundaries, including a poisoned active player.
  if (match.phase === 'MovementAiming' && (match.players[match.active].health <= 0 || match.players.filter(p => p.health > 0).length <= 1)) match.phase = 'WinnerCheck'
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



/** Shields absorb direct and status damage before hull health. */
export function damagePlayer(player:Player,amount:number){
  if(player.health<=0)return
  const damage=Math.max(0,Math.round(amount)),absorbed=Math.min(player.shield??0,damage)
  player.shield=Math.max(0,(player.shield??0)-absorbed)
  player.health=Math.max(0,player.health-(damage-absorbed))
}
export type SupportChoice='heal'|'shield'
export function supportReady(match:Match){return match.phase==='MovementAiming'&&match.players[match.active].health>0&&match.support[match.active].ready}
/** Choosing support never consumes the firing action; invalid/full choices keep the unlock. */
export function useSupport(match:Match,choice:SupportChoice):number{
  if(!supportReady(match)||match.pointerId!==undefined)return 0
  const player=match.players[match.active]
  const amount=choice==='heal'?Math.min(20,100-player.health):Math.max(0,20-(player.shield??0))
  if(amount<=0)return 0
  if(choice==='heal')player.health+=amount
  else player.shield=20
  match.support[player.id].ready=false
  match.support[player.id].shots=0
  return amount
}

/** Counts this player's own firing actions, not global turns or volley pellets. */
export function supportCountdown(match:Match,id=match.active):number{
 const support=match.support[id]
 return support.ready?0:3-support.shots%3
}

