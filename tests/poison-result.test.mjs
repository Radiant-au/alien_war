import test from 'node:test'
import assert from 'node:assert/strict'
import {createMatch,applyShotResult,updateMatch} from '../src/game/match.ts'
import {SPELLS,weaponBlast} from '../src/game/spells.ts'
import {MenuNavigation} from '../src/app/menu-state.ts'
test('acid has zero impact damage then ticks one health every half second without stacking',()=>{
 const m=createMatch(),p=m.players[1];m.phase='MovementAiming'
 const impact={kind:'impact',x:p.x,y:p.y,target:1}
 applyShotResult(m,impact,weaponBlast(SPELLS[1]));assert.equal(p.health,100)
 assert.equal(m.poisons[0].remaining,18)
 updateMatch(m,.49);assert.equal(p.health,100)
 updateMatch(m,.01);assert.equal(p.health,99);assert.deepEqual(m.damageTicks,[1])
 applyShotResult(m,impact,weaponBlast(SPELLS[1]));assert.equal(m.poisons.length,1)
 for(let i=0;i<20;i++)updateMatch(m,.5)
 assert.equal(p.health,81);assert.equal(m.poisons.length,0)
 const fresh=createMatch();assert.equal(fresh.poisons.length,0)
})
test('poison elimination resolves winner and stops after game over',()=>{
 const m=createMatch(),p=m.players[1];m.phase='MovementAiming';p.health=1
 applyShotResult(m,{kind:'impact',x:p.x,y:p.y,target:1},weaponBlast(SPELLS[1]))
 updateMatch(m,.5);assert.equal(p.health,0);assert.equal(m.phase,'GameOver');assert.equal(m.outcome,'Player 1 wins')
 updateMatch(m,10);assert.deepEqual(m.damageTicks,[])
})
test('weapons have a modest reduction from original budgets',()=>{
 assert.deepEqual(SPELLS.map(s=>s.damage),[36,18,30,30])
 assert.equal(weaponBlast(SPELLS[0]).damage*3,36)
})
test('result allows replay and main menu but cannot resume an ended battle',()=>{
 const n=new MenuNavigation();n.setup();n.start();n.finish();assert.equal(n.view,'result');assert.equal(n.resume(),false)
 assert.equal(n.replay(),true);assert.equal(n.view,'battle');n.finish();n.main();assert.equal(n.replay(),false)
})
