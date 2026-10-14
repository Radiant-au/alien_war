import test from 'node:test'
import assert from 'node:assert/strict'
import { dragAim } from './aim.ts'
import { createMatch, fire } from './match.ts'
import { createShot, trajectory } from './projectile.ts'

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
