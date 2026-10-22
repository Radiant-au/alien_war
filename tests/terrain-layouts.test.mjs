import test from 'node:test'
import assert from 'node:assert/strict'
import { createTerrain, createPlayers, nextTerrainVariant, surfaceAt, WORLD_WIDTH, WORLD_HEIGHT, PLAYER_WIDTH } from '../src/game/terrain.ts'
import { createShot, stepShot } from '../src/game/projectile.ts'

test('six distinct layouts stay reproducible, bounded, and provide flat supported spawns', () => {
  const ids = new Set()
  for (const count of [2,3,4]) for (const variant of [0,1]) {
    const terrain = createTerrain(42,count,variant)
    ids.add(terrain.layoutId)
    assert.deepEqual(terrain,createTerrain(42,count,variant))
    assert.notDeepEqual(terrain.heights,createTerrain(1337,count,variant).heights)
    for (const seed of [0,1,42,1337,0xffffffff]) {
      const map=createTerrain(seed,count,variant)
      assert.ok(map.heights.every(y=>Number.isFinite(y)&&y>80&&y<WORLD_HEIGHT-40))
      for (const player of createPlayers(map,count)) {
        for(let dx=-PLAYER_WIDTH/2;dx<=PLAYER_WIDTH/2;dx++) assert.equal(surfaceAt(map,player.x+dx),surfaceAt(map,player.x))
      }
    }
  }
  assert.equal(ids.size,6)
})

test('each mode alternates layouts without consecutive repeats',()=>{
  for (const initial of [0,1]) {
    let previous=nextTerrainVariant(undefined,()=>initial*.9)
    assert.equal(previous,initial)
    for(let i=0;i<12;i++) { const next=nextTerrainVariant(previous);assert.notEqual(next,previous);previous=next }
  }
})

test('all six layouts block direct sightlines but neighboring ships can be hit with arcs',()=>{
  for (const count of [2,3,4]) for (const variant of [0,1]) {
    const terrain=createTerrain(42,count,variant),players=createPlayers(terrain,count)
    for(let i=0;i<count-1;i++) {
      const left=players[i],right=players[i+1]
      let blocked=false
      for(let x=left.x+100;x<right.x-100;x++) {
        const line=left.y+(right.y-left.y)*(x-left.x)/(right.x-left.x)
        if(surfaceAt(terrain,x)<line-15) { blocked=true;break }
      }
      assert.ok(blocked,`${terrain.layoutId} ridge ${i}`)
      let reachable=false
      search: for(let degrees=15;degrees<=85;degrees+=2) for(let power=.25;power<=1.001;power+=.025) {
        const shot=createShot({...left,aimAngle:-degrees*Math.PI/180,power})
        let hit
        for(let step=0;step<1600&&!hit;step++) hit=stepShot(shot,terrain,players)
        if(hit?.kind==='impact'&&hit.target===right.id) {reachable=true;break search}
      }
      assert.ok(reachable,`${terrain.layoutId} P${i+1} can reach P${i+2}`)
    }
    assert.equal(terrain.heights.length,WORLD_WIDTH+1)
  }
})
