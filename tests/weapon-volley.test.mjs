import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {SPELLS,projectileCount,weaponBlast} from '../src/game/spells.ts'
import {createWeaponShots} from '../src/game/projectile.ts'
import {createMatch,applyShotResult} from '../src/game/match.ts'
import {surfaceAt,carveCrater} from '../src/game/terrain.ts'
test('gameplay volleys have 3 flames, 5 shards and one shared damage budget',()=>{
 for(const [i,count] of [[0,3],[1,1],[2,3],[3,5]]){
  const m=createMatch(),p=m.players[0],shots=createWeaponShots(p,SPELLS[i])
  assert.equal(shots.length,count);assert.equal(projectileCount(SPELLS[i]),count)
  assert.ok(shots.every(s=>s.shooter===p.id&&Number.isFinite(s.vx)&&Number.isFinite(s.vy)))
  if(count>1)assert.equal(new Set(shots.map(s=>Math.atan2(s.vy,s.vx).toFixed(6))).size,count)
  const blast=weaponBlast(SPELLS[i]);assert.equal(blast.damage*count,SPELLS[i].damage)
 }
})
test('several cryo craters remove a wider terrain area than the previous single impact',()=>{
 const old=createMatch().terrain,current=structuredClone(old),x=400,y=surfaceAt(old,x)
 carveCrater(old,x,y,48)
 for(const dx of [-32,-16,0,16,32])applyShotResult({...createMatch(),terrain:current},{kind:'impact',x:x+dx,y,target:'terrain'},weaponBlast(SPELLS[3]))
 const removed=t=>t.heights.reduce((sum,h,i)=>sum+Math.max(0,h-t.initialHeights[i]),0)
 assert.ok(removed(current)>removed(old))
})
test('the HTML import path uses the new fire and ice sprites without the legacy blast',()=>{
 const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
 assert.match(read('index.html'),/src\/app\/bootstrap.ts/)
 assert.match(read('src/app/main.ts'),/rendering\/landscape-scene.ts/)
 const scene=read('src/rendering/landscape-scene.ts')
 assert.match(scene,/fire_cluster_spritesheet.svg/);assert.match(scene,/ice_missile_spritesheet.svg/)
 assert.doesNotMatch(scene,/fire_explosion_32_grid|fire_missile_spritesheet|fire-impact-blast/)
 assert.match(read('src/landscape-scene.ts'),/export.*LandscapeScene.*rendering\/landscape-scene/)
 for(const name of ['fire_cluster','ice_missile'])assert.match(read('public/assets/'+name+'_spritesheet.svg'),/<svg/)
})
