import test from 'node:test'
import assert from 'node:assert/strict'
import { createMatch, fire, resolveShot, updateMatch } from '../src/game/match.ts'
import { createShot, stepShot, STEP_SECONDS } from '../src/game/projectile.ts'
import { surfaceAt } from '../src/game/terrain.ts'
import { WORLD_WIDTH } from '../src/game/config.ts'
import { SPELLS } from '../src/game/spells.ts'

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
    assert.equal(player.health,spell.effect==='poison'?100:100-spell.damage)
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

test('wide arena ridges block the straight sightline between every neighboring spawn',()=>{
  for(const count of [2,3,4]){
    const match=createMatch(42,count)
    for(let i=0;i<count-1;i++){
      const left=match.players[i],right=match.players[i+1]
      let blocked=false
      for(let x=Math.ceil(left.x+60);x<right.x-60;x++){
        const lineY=left.y+(right.y-left.y)*(x-left.x)/(right.x-left.x)
        if(surfaceAt(match.terrain,x)<lineY-15){blocked=true;break}
      }
      assert.ok(blocked,`no blocking ridge between P${i+1} and P${i+2}`)
    }
  }
})

test('neighboring ships remain reachable with arcing shots over the new ridges',()=>{
  const match=createMatch(42,4)
  for(const [shooter,power,degrees] of [[0,.475,39],[1,.4,43],[2,.55,37]]){
    const player=match.players[shooter]
    player.power=power;player.aimAngle=-degrees*Math.PI/180
    const shot=createShot(player);let result
    for(let i=0;i<1440&&!result;i++)result=stepShot(shot,match.terrain,match.players)
    assert.equal(result?.kind,'impact')
    assert.equal(result.target,shooter+1)
  }
})

