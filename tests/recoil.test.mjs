import test from 'node:test'
import assert from 'node:assert/strict'
import { shotRecoil } from '../src/rendering/ship-motion.ts'

test('recoil kicks opposite firing direction and settles to its original pose',()=>{
 const right=shotRecoil(.055,-Math.PI/4,1)
 const left=shotRecoil(.055,-3*Math.PI/4,1)
 assert.ok(right.x<0&&left.x>0)
 assert.ok(Math.abs(right.x)<8&&Math.abs(right.angle)<.1)
 assert.deepEqual(shotRecoil(0,0,1),{x:0,y:0,angle:0})
 assert.deepEqual(shotRecoil(.65,0,1),{x:0,y:0,angle:0})
 assert.ok(Math.abs(shotRecoil(.6,0,1).x)<.1)
 assert.deepEqual(shotRecoil(.05,0,1,true),{x:0,y:0,angle:0})
})
