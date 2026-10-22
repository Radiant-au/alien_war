import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { SPELLS } from '../src/game/spells.ts'
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')

test('the actual HTML entry reaches the scene with the approved flame assets',()=>{
  assert.match(source('index.html'),/src="\/src\/app\/bootstrap.ts"/)
  assert.match(source('src/app/bootstrap.ts'),/import\('\.\/main.ts'\)/)
  assert.match(source('src/app/main.ts'),/from '\.\.\/rendering\/landscape-scene.ts'/)
  const active=source('src/rendering/landscape-scene.ts')
  assert.match(active,/load.spritesheet\('fire-cluster','\/assets\/fire_cluster_spritesheet.svg'/)
  assert.doesNotMatch(active,/fire_explosion_32_grid|fire-impact|fire:'missile-fire'/)
  assert.match(active,/terrainFire\?\.add\(this.match.terrain,x,radius\)/)
  assert.match(active,/terrainFire\?\.update\(/)
  assert.equal((active.match(/this\.terrainFire\?\.add\(/g)||[]).length,1)
  const loader=source('src/app/bootstrap.ts')
  assert.match(loader,/fire_cluster_spritesheet.svg/)
  assert.doesNotMatch(loader,/fire_explosion_32_grid|fire_missile_spritesheet/)
})

test('legacy entry files forward to the canonical implementations without duplicate scenes',()=>{
  const scene=source('src/landscape-scene.ts')
  assert.match(scene,/export \{ LandscapeScene \} from '\.\/rendering\/landscape-scene.ts'/)
  assert.doesNotMatch(scene,/class LandscapeScene/)
  assert.match(source('src/bootstrap.ts'),/import '\.\/app\/bootstrap.ts'/)
  const fire=SPELLS.find(s=>s.effect==='fire')
  assert.equal(fire.name,'Fire Cluster')
  assert.equal(fire.icon,'fire_cluster_icon.svg')
})
