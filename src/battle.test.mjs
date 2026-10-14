import test from 'node:test'
import assert from 'node:assert/strict'
import { createMatch, fire, resolveShot, updateMatch } from './match.ts'
import { createShot, stepShot, STEP_SECONDS } from './projectile.ts'
import { surfaceAt } from './terrain.ts'
import { WORLD_WIDTH } from './config.ts'
import { SPELLS } from './spells.ts'

test('central ridge blocks a low shot before it reaches the other wizard',()=>{
  const match=createMatch();const player=match.players[0]
  player.aimAngle=-.025;player.power=1
  const shot=createShot(player);let result
  for(let i=0;i<1500&&!result;i++)result=stepShot(shot,match.terrain,match.players)
  assert.equal(result?.kind,'impact');assert.equal(result.target,'terrain')
  assert.ok(result.x<match.players[1].x)
  assert.ok(surfaceAt(match.terrain,WORLD_WIDTH*.5)<surfaceAt(match.terrain,player.x)-50)
})

test('each spell uses its blast radius and damage, then gives the next player a turn',()=>{
  for(const spell of SPELLS){
    const match=createMatch();match.phase='MovementAiming'
    const player=match.players[0],x=player.x,y=player.y
    const edge=Math.round(x+spell.radius-1),before=match.terrain.heights[edge]
    assert.equal(fire(match),true)
    resolveShot(match,{kind:'impact',x,y,target:0},spell)
    assert.equal(player.health,100-spell.damage)
    assert.ok(match.terrain.heights[Math.round(x)]>y)
    // Beyond the radius the collision heightmap is unchanged.
    const outside=Math.ceil(x+spell.radius+2)
    assert.equal(match.terrain.heights[outside],match.terrain.initialHeights[outside])
    assert.ok(match.terrain.heights[edge]>=before)
    assert.equal(fire(match),false)
    for(let i=0;i<500&&match.phase!=='MovementAiming';i++)updateMatch(match,STEP_SECONDS)
    assert.equal(match.phase,'MovementAiming');assert.equal(match.active,1)
    assert.equal(player.grounded,true)
  }
})
