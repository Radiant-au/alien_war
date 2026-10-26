import test from 'node:test'
import assert from 'node:assert/strict'
import { SPELLS, weaponBlast } from '../src/game/spells.ts'
import { createMatch, applyShotResult } from '../src/game/match.ts'
import { explosionDamage } from '../src/game/terrain.ts'
import { PLAYER_WIDTH, PLAYER_HEIGHT, SHIP_RENDER_SCALE } from '../src/game/config.ts'
import { createShot, sweepShot } from '../src/game/projectile.ts'

test('a complete weapon shot removes at most 24–32 health, not 55–70',()=>{
  const budgets=[24,26,30,32]
  for(let i=0;i<SPELLS.length;i++){
    const match=createMatch(),target=match.players[1],spell=SPELLS[i],blast=weaponBlast(spell)
    const pellets=spell.effect==='electric'?3:1
    for(let p=0;p<pellets;p++)applyShotResult(match,{kind:'impact',x:target.x,y:target.y,target:target.id},blast)
    assert.equal(100-target.health,budgets[i])
    assert.ok(Math.ceil(100/budgets[i])>=4)
  }
})
test('splash falls off continuously outside the enlarged collision body',()=>{
  const match=createMatch(),target=match.players[1]
  for(const spell of SPELLS){
    const full=explosionDamage(target,target.x,target.y,spell.radius,spell.damage)
    const near=explosionDamage(target,target.x+PLAYER_WIDTH/2+spell.radius*.3,target.y,spell.radius,spell.damage)
    const far=explosionDamage(target,target.x+PLAYER_WIDTH/2+spell.radius*.75,target.y,spell.radius,spell.damage)
    const outside=explosionDamage(target,target.x+PLAYER_WIDTH/2+spell.radius+1,target.y,spell.radius,spell.damage)
    assert.equal(full,spell.damage);assert.ok(full>near&&near>far&&far>outside);assert.equal(outside,0)
  }
})
test('larger ships have matching collision dimensions and still launch outside the body',()=>{
  assert.equal(SHIP_RENDER_SCALE,1.8);assert.equal(PLAYER_WIDTH,100);assert.equal(PLAYER_HEIGHT,52)
  const match=createMatch()
  for(const angle of [-.05,-Math.PI/4,-Math.PI/2,-Math.PI+.05]){
    const player={...match.players[0],aimAngle:angle},shot=createShot(player)
    assert.ok(Math.abs(shot.x-player.x)>PLAYER_WIDTH/2||Math.abs(shot.y-player.y)>PLAYER_HEIGHT/2)
    const result=sweepShot({...shot,age:.1},match.terrain,[player],shot.x+Math.cos(angle)*4,shot.y+Math.sin(angle)*4)
    assert.notEqual(result?.kind==='impact'?result.target:undefined,player.id)
  }
})
