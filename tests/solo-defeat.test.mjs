import test from 'node:test'
import assert from 'node:assert/strict'
import {createMatch,updateMatch,applyShotResult} from '../src/game/match.ts'
import {needsLandscape,viewportMetrics} from '../src/rendering/viewport.ts'

for(const count of [2,3,4])for(const phase of ['MovementAiming','ProjectileFlight','Impact','Settling','CameraTransition','NextPlayerReady']){
 test(`solo defeat ends ${count}-ship match during ${phase}`,()=>{
  const m=createMatch(42,count);m.humanPlayerId=0;m.active=1;m.phase=phase
  m.players[0].health=0
  updateMatch(m,1/60)
  assert.equal(m.phase,'GameOver');assert.equal(m.outcome,'Defeat')
  assert.equal(m.players.filter(p=>p.health>0).length,count-1)
  const snapshot=JSON.stringify(m);updateMatch(m,10);assert.equal(JSON.stringify(m),snapshot)
 })
}
test('direct hit ends solo battle while multiple AI survive',()=>{
 const m=createMatch(42,4);m.humanPlayerId=0;m.phase='ProjectileFlight'
 const p=m.players[0];p.health=1
 applyShotResult(m,{kind:'impact',x:p.x,y:p.y,target:0},{radius:80,damage:100,destroyTerrain:false})
 updateMatch(m,1/60);assert.equal(m.outcome,'Defeat');assert.equal(m.phase,'GameOver')
})
for(const effect of ['poisons','burns'])test(`${effect} defeat cancels AI turn and remaining status damage`,()=>{
 const m=createMatch(42,4);m.humanPlayerId=0;m.active=2;m.phase='MovementAiming';m.players[0].health=1
 m[effect].push({player:0,remaining:10,elapsed:0})
 updateMatch(m,.5);assert.equal(m.outcome,'Defeat');assert.equal(m.phase,'GameOver')
})
test('local battle continues after player one is eliminated',()=>{
 const m=createMatch(42,4);m.players[0].health=0;m.phase='WinnerCheck'
 updateMatch(m,.1);assert.equal(m.phase,'CameraTransition');assert.equal(m.outcome,undefined)
})
test('solo win and simultaneous elimination still resolve correctly',()=>{
 const m=createMatch(42,3);m.humanPlayerId=0;m.players[1].health=m.players[2].health=0;m.phase='WinnerCheck'
 updateMatch(m,.1);assert.equal(m.outcome,'Player 1 wins')
 const draw=createMatch();draw.humanPlayerId=0;draw.players.forEach(p=>p.health=0)
 updateMatch(draw,.1);assert.equal(draw.outcome,'Draw')
})
test('touch portrait requires rotation; landscape and desktop portrait stay playable',()=>{
 assert.equal(needsLandscape(390,844,true),true)
 assert.equal(needsLandscape(768,1024,true),true)
 for(const [w,h,touch] of [[844,390,true],[1024,768,true],[1440,900,false],[900,1440,false]])assert.equal(needsLandscape(w,h,touch),false)
 for(const [w,h] of [[568,190],[844,230],[1024,500],[1920,900]]){
  const v=viewportMetrics(w,h);assert.ok(v.scale>0);assert.ok(v.logicalWidth>=960)
 }
})
