import test from 'node:test'
import assert from 'node:assert/strict'
import { createMatch, fire, resolveShot, updateMatch, overviewZoom, overviewScrollX } from '../src/game/match.ts'
import { createTerrain, createPlayers, playerSupport, playerStarts } from '../src/game/terrain.ts'
import { movePlayer } from '../src/game/movement.ts'
import { STEP_SECONDS, sweepShot } from '../src/game/projectile.ts'
import { MOVEMENT_ALLOWANCE, PLAYER_HEIGHT, PLAYER_WIDTH, PLAYER_GAP, WORLD_WIDTH } from '../src/game/config.ts'
import { shipPose } from '../src/rendering/ship-motion.ts'

function ready(match) {
  for(let i=0;i<500&&match.phase!=='MovementAiming'&&match.phase!=='GameOver';i++)updateMatch(match,STEP_SECONDS)
}
function miss(match) { assert.equal(fire(match),true);resolveShot(match,{kind:'miss'});ready(match) }

test('2/3/4 local players spawn safely and each receives a turn before the cycle repeats',()=>{
  for(const count of [2,3,4]){
    const match=createMatch(42,count);ready(match)
    assert.equal(match.players.length,count)
    assert.equal(match.players[0].x,WORLD_WIDTH*playerStarts(count)[0])
    assert.ok(match.players.every(p=>p.grounded&&p.y+PLAYER_HEIGHT/2===playerSupport(match.terrain,p)))
    const order=[]
    for(let turn=0;turn<count;turn++){order.push(match.active);miss(match)}
    assert.deepEqual(order,Array.from({length:count},(_,i)=>i));assert.equal(match.active,0)
    const zoom=overviewZoom(match.players),left=overviewScrollX(match.players,zoom)
    assert.ok(match.players.every(p=>p.x>=left&&p.x<=left+960/zoom))
  }
  assert.throws(()=>createMatch(42,5),RangeError)
})

test('eliminated ships are skipped and the last of four survivors wins',()=>{
  const match=createMatch(42,4);ready(match);match.players[1].health=0
  miss(match);assert.equal(match.active,2)
  miss(match);assert.equal(match.active,3)
  miss(match);assert.equal(match.active,0)
  match.players[0].health=0;match.players[3].health=0;match.phase='WinnerCheck'
  updateMatch(match,STEP_SECONDS);assert.equal(match.outcome,'Player 3 wins');assert.equal(fire(match),false)
  match.players[2].health=0;match.phase='WinnerCheck';updateMatch(match,STEP_SECONDS);assert.equal(match.outcome,'Draw')
})

test('fuel measures actual movement, blocks at either neighbor, and refills on the next own turn',()=>{
  const match=createMatch(42,4);ready(match);match.terrain.heights.fill(400)
  const p=match.players[0]
  p.y=400-PLAYER_HEIGHT/2
  const travelled=movePlayer(match.terrain,match.players,p,1,.25)
  assert.equal(travelled,60);assert.equal(p.movementRemaining,MOVEMENT_ALLOWANCE-60)
  miss(match);assert.equal(p.movementRemaining,MOVEMENT_ALLOWANCE-60)
  for(let i=1;i<4;i++)miss(match)
  assert.equal(match.active,0);assert.equal(p.movementRemaining,MOVEMENT_ALLOWANCE)
  const middle=match.players[2],left=match.players[1],right=match.players[3]
  middle.x=left.x+PLAYER_WIDTH+PLAYER_GAP;middle.y=400-PLAYER_HEIGHT/2
  assert.equal(movePlayer(match.terrain,match.players,middle,-1,.1),0)
  middle.x=right.x-PLAYER_WIDTH-PLAYER_GAP
  assert.equal(movePlayer(match.terrain,match.players,middle,1,.1),0)
  assert.equal(middle.movementRemaining,MOVEMENT_ALLOWANCE)
})

test('hover and pulse change visual pose while collision position and fuel remain unchanged',()=>{
  const terrain=createTerrain(42,4),p=createPlayers(terrain,4)[2]
  for(let x=0;x<=WORLD_WIDTH;x++)terrain.heights[x]=200+x*.1
  p.y=playerSupport(terrain,p)-PLAYER_HEIGHT/2
  const before={...p},a=shipPose(terrain,p,0),b=shipPose(terrain,p,.6)
  assert.ok(a.angle>0&&a.angle<=.55);assert.notEqual(a.y,b.y);assert.notEqual(a.pulse,b.pulse)
  assert.deepEqual(p,before)
  assert.deepEqual(shipPose(terrain,p,0,true),shipPose(terrain,p,3,true))
  p.grounded=false;assert.equal(shipPose(terrain,p,0).angle,0)
})

test('dead ships no longer absorb shots intended for a surviving neighbor',()=>{
  const terrain=createTerrain();terrain.heights.fill(400)
  const players=createPlayers(terrain,4)
  players.forEach((p,i)=>{p.x=200+i*200;p.y=200})
  players[1].health=0
  const result=sweepShot({x:300,y:200,vx:1000,vy:0,age:0,shooter:0},terrain,players,800,200)
  assert.equal(result.target,2)
})
