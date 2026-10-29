import test from 'node:test'
import assert from 'node:assert/strict'
import {createMatch,fire,supportReady,useSupport,damagePlayer,applyShotResult,updateMatch} from '../src/game/match.ts'
import {SPELLS,weaponBlast,projectileCount} from '../src/game/spells.ts'
function fireThree(m,id=0){for(let i=0;i<3;i++){m.active=id;m.phase='MovementAiming';m.players[id].grounded=true;assert.equal(fire(m),true)}}
test('each player earns one support choice every three valid shots, usable only on their aiming turn',()=>{
 const m=createMatch(42,4);fireThree(m)
 assert.equal(supportReady(m),false);assert.equal(useSupport(m,'shield'),0)
 m.phase='MovementAiming';m.active=1;assert.equal(supportReady(m),false)
 m.active=0;assert.equal(supportReady(m),true);assert.equal(useSupport(m,'shield'),20)
 assert.equal(m.players[0].shield,20);assert.equal(m.phase,'MovementAiming');assert.equal(supportReady(m),false)
 assert.equal(useSupport(m,'heal'),0);fireThree(m);m.phase='MovementAiming';m.players[0].health=65
 assert.equal(useSupport(m,'heal'),20);assert.equal(m.players[0].health,85)
 assert.equal(m.support[1].shots,0)
})
test('support respects caps, aiming capture, dead players, reset and cannot bank multiple charges',()=>{
 const m=createMatch(),p=m.players[0];fireThree(m);m.phase='MovementAiming'
 assert.equal(useSupport(m,'heal'),0);assert.equal(supportReady(m),true)
 p.health=95;m.pointerId=4;assert.equal(useSupport(m,'heal'),0);m.pointerId=undefined
 assert.equal(useSupport(m,'heal'),5);assert.equal(p.health,100)
 fireThree(m);fireThree(m);m.phase='MovementAiming';assert.equal(useSupport(m,'shield'),20);assert.equal(useSupport(m,'shield'),0)
 fireThree(m);m.phase='MovementAiming';assert.equal(useSupport(m,'shield'),0);assert.equal(supportReady(m),true)
 p.health=0;assert.equal(useSupport(m,'heal'),0)
 const fresh=createMatch();assert.equal(fresh.players[0].shield,0);assert.equal(fresh.support[0].shots,0);assert.equal(fresh.burns.length,0)
})
test('shield absorbs direct and status damage first, with exact overflow and no revival',()=>{
 const m=createMatch(),p=m.players[0];p.shield=20;damagePlayer(p,12);assert.equal(p.shield,8);assert.equal(p.health,100)
 damagePlayer(p,15);assert.equal(p.shield,0);assert.equal(p.health,93)
 p.shield=20;m.phase='MovementAiming';m.poisons.push({player:0,remaining:2,elapsed:0});m.burns.push({player:0,remaining:2,elapsed:0})
 updateMatch(m,.5);assert.equal(p.shield,18);assert.equal(p.health,93);assert.deepEqual(m.damageTicks,[0]);assert.deepEqual(m.burnTicks,[0])
 updateMatch(m,.5);assert.equal(p.shield,16);assert.equal(m.poisons.length+m.burns.length,0)
 p.health=0;damagePlayer(p,20);assert.equal(p.health,0)
})
test('fire deals 30 maximum impact and refreshes one six-point burn, not six per pellet',()=>{
 const m=createMatch(),p=m.players[1];m.phase='MovementAiming'
 for(let i=0;i<projectileCount(SPELLS[2]);i++)applyShotResult(m,{kind:'impact',x:p.x,y:p.y,target:1},weaponBlast(SPELLS[2]))
 assert.equal(p.health,70);assert.equal(m.burns.length,1);assert.equal(m.burns[0].remaining,6)
 for(let i=0;i<6;i++)updateMatch(m,.5)
 assert.equal(p.health,64);assert.equal(m.burns.length,0)
 m.burns.push({player:1,remaining:6,elapsed:0});m.phase='GameOver';updateMatch(m,9);assert.equal(p.health,64)
})
test('failed casts do not earn support, and a complete volley counts as one shot',()=>{
 const m=createMatch();assert.equal(fire(m),false);assert.equal(m.support[0].shots,0)
 m.phase='MovementAiming';m.players[0].grounded=true;m.pointerId=5;assert.equal(fire(m),false);assert.equal(m.support[0].shots,0)
 m.pointerId=undefined;assert.equal(fire(m),true);assert.equal(m.support[0].shots,1);assert.equal(fire(m),false);assert.equal(m.support[0].shots,1)
})
test('staggered flame pellets cannot refresh extra burning damage within one volley',()=>{
 const m=createMatch(),p=m.players[1];m.phase='MovementAiming'
 const hit=()=>applyShotResult(m,{kind:'impact',x:p.x,y:p.y,target:1},weaponBlast(SPELLS[2]))
 hit();updateMatch(m,.5);hit();hit();assert.equal(m.burns[0].remaining,5)
 for(let i=0;i<5;i++)updateMatch(m,.5)
 assert.equal(p.health,64)
})
