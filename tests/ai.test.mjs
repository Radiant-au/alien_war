import test from 'node:test'
import assert from 'node:assert/strict'
import { searchAiShot, imperfectAim, AiController, computerTurn } from '../src/game/ai.ts'
import { createMatch, updateMatch, fire, resolveShot } from '../src/game/match.ts'
import { createShot, stepShot } from '../src/game/projectile.ts'
import { SPELLS } from '../src/game/spells.ts'
import { normalizePreferences } from '../src/app/preferences.ts'

function search(match,level){
  const generator=searchAiShot(match.terrain,match.players,match.active,level)
  for(let i=0;i<100000;i++){const next=generator.next();if(next.done)return next.value}
  throw Error('search did not terminate')
}
function land(match,plan){
  const shot=createShot({...match.players[match.active],aimAngle:plan.angle,power:plan.power})
  for(let i=0;i<1441;i++){const result=stepShot(shot,match.terrain,match.players);if(result)return result}
  throw Error('no terminal result')
}

test('AI preferences restore old saves and reject invalid modes and difficulty',()=>{
  assert.equal(normalizePreferences({}).mode,'local')
  assert.equal(normalizePreferences({mode:'wrong',difficulty:'extreme',players:1}).difficulty,'normal')
  assert.equal(normalizePreferences({mode:'ai',difficulty:'hard',players:3}).mode,'ai')
  assert.equal(computerTurn('ai',0),false)
  assert.equal(computerTurn('local',3),false)
  for(let i=1;i<4;i++)assert.equal(computerTurn('ai',i),true)
})
test('hard AI reaches enemies over blocking ridges for all player counts without mutating the match',()=>{
  for(const count of [2,3,4])for(const variant of [0,1]){
    const match=createMatch(17,count,variant);match.active=1
    const before=JSON.stringify(match),plan=search(match,'hard')
    assert.equal(JSON.stringify(match),before)
    assert.ok(plan.score>0,`${count}/${variant}: ${plan.score}`)
    const result=land(match,plan)
    assert.equal(result.kind,'impact')
    assert.ok(plan.power>=.15&&plan.power<=1)
    assert.ok(Math.sin(plan.angle)<0)
  }
})
test('difficulty errors are bounded and hard searches no worse than easy on the same fixture',()=>{
  const match=createMatch(51,4);match.active=2
  const easy=search(match,'easy'),hard=search(match,'hard')
  assert.ok(hard.score>=easy.score)
  assert.ok(Math.abs(imperfectAim(hard,'easy',()=>1).angle-hard.angle)>Math.abs(imperfectAim(hard,'hard',()=>1).angle-hard.angle))
  for(const level of ['easy','normal','hard'])for(const r of [0,.5,1]){
    const p=imperfectAim(hard,level,()=>r);assert.ok(p.power>=.15&&p.power<=1);assert.ok(Math.sin(p.angle)<0)
  }
})
test('controller fires once, resets on restart and phase transitions, and can finish an actual AI turn',()=>{
  const match=createMatch(20,3);match.active=1;match.phase='MovementAiming'
  const controller=new AiController()
  let fired=0
  for(let i=0;i<3000;i++){
    const action=controller.tick(match,'normal',1/60,()=>.5)
    updateMatch(match,1/60,action.axis)
    if(action.plan){match.players[1].aimAngle=action.plan.angle;match.players[1].power=action.plan.power}
    if(action.fire){
      fired++;assert.equal(fire(match),true)
      const result=land({...match,active:1},action.plan)
      resolveShot(match,result,SPELLS[action.plan.spell]);break
    }
  }
  assert.equal(fired,1)
  assert.equal(controller.tick(match,'normal',1/60).fire,undefined)
  for(let i=0;i<600&&match.phase!=='MovementAiming'&&match.phase!=='GameOver';i++)updateMatch(match,1/60)
  assert.ok(match.active!==1||match.phase==='GameOver')
  controller.reset()
  const next=createMatch(30,2);next.active=1;next.phase='MovementAiming'
  assert.equal(controller.tick(next,'hard',.01).fire,undefined)
  assert.ok(next.players[1].movementRemaining>=0)
})
test('search ignores eliminated players and supports aiming to the left',()=>{
  const match=createMatch(51,4);match.active=3;match.players[1].health=0;match.players[2].health=0
  const plan=search(match,'normal')
  assert.ok(Math.cos(plan.angle)<0)
  assert.ok(plan.score>0)
})
