import test from 'node:test'
import assert from 'node:assert/strict'
import { aimFeedbackAlpha, dragAim } from '../src/game/aim.ts'
import { createMatch, fire } from '../src/game/match.ts'
import { createShot, trajectory } from '../src/game/projectile.ts'

test('drag aim handles both directions, distance, camera scaling and bounded downward drags', () => {
  const right=dragAim(80,-80,200),left=dragAim(-80,-80,200)
  assert.ok(Math.abs(right.angle+Math.PI/4)<1e-9)
  assert.ok(Math.abs(Math.cos(right.angle)+Math.cos(left.angle))<1e-9)
  assert.equal(right.power,left.power)
  assert.deepEqual(dragAim(160,-160,400),right)
  assert.ok(dragAim(160,-160,200).power>right.power)
  assert.equal(dragAim(10000,0,200).power,1)
  assert.equal(dragAim(0,0,200).power,.15)
  assert.equal(dragAim(10,100,200).angle,-3*Math.PI/180)
  assert.equal(dragAim(0,-100,200).angle,-87*Math.PI/180)
})

test('aim drag gates firing and short dotted preview uses real shot physics without changing state', () => {
  const match=createMatch(42,4);match.phase='MovementAiming'
  match.pointerId=5;assert.equal(fire(match),false)
  match.pointerId=undefined
  const player=match.players[0],aim=dragAim(200,-200,400)
  player.aimAngle=aim.angle;player.power=aim.power
  const shot=createShot(player),before={...shot}
  const points=trajectory(shot,match.terrain,match.players,.55)
  assert.deepEqual(shot,before)
  assert.ok(points.length>0&&points.length<=9)
  assert.ok(points[0].x>player.x)
  assert.equal(fire(match),true)
  assert.deepEqual(match.shot,shot)
})

test('ship readout stays visible while dragging, holds after release, then fades to hidden', () => {
  assert.equal(aimFeedbackAlpha(0,-Infinity,false),0)
  assert.equal(aimFeedbackAlpha(100,0,true),1)
  assert.equal(aimFeedbackAlpha(10.9,10,false),1)
  assert.ok(Math.abs(aimFeedbackAlpha(11.45,10,false)-.5)<1e-9)
  assert.equal(aimFeedbackAlpha(12,10,false),0)
  assert.equal(aimFeedbackAlpha(12,12,false),1)
})

test('aiming trajectory clears shooter corner angles without colliding with own ship', () => {
  const match = createMatch(42, 4)
  match.phase = 'MovementAiming'
  const player = match.players[0]
  for (let deg = 3; deg <= 87; deg += 1) {
    for (const dir of [1, -1]) {
      const angle = dir === 1 ? -deg * Math.PI / 180 : Math.PI - (-deg * Math.PI / 180)
      player.aimAngle = angle
      player.power = 0.5
      const shot = createShot(player)
      const points = trajectory(shot, match.terrain, match.players, 0.55)
      assert.ok(points.length > 1, `trajectory blocked at angle ${deg}° (dir=${dir})`)
    }
  }
})

