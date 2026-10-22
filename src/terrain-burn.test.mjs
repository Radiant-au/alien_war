import test from 'node:test'
import assert from 'node:assert/strict'
import { createTerrain, carveCrater, surfaceAt } from './terrain.ts'
import { createBurnPatch, burnSupported, burnStrength, scorchStrength, BURN_SECONDS, SCORCH_SECONDS } from './terrain-burn.ts'

test('burn samples the carved contour and stays inside world edges',()=>{
  for(const x of [0,300,3359]){
    const terrain=createTerrain(),y=surfaceAt(terrain,x)
    carveCrater(terrain,x,y,70)
    const burn=createBurnPatch(terrain,x,70)
    assert.ok(burn.points.length<30)
    for(const p of burn.points){
      assert.ok(p.x>=0&&p.x<terrain.heights.length)
      assert.equal(p.y,surfaceAt(terrain,p.x))
      assert.ok(burnSupported(terrain,p))
    }
  }
})

test('later destruction extinguishes old fuel while adjacent ground keeps burning',()=>{
  const terrain=createTerrain(),x=300
  carveCrater(terrain,x,surfaceAt(terrain,x),70)
  const burn=createBurnPatch(terrain,x,70)
  const center=burn.points[Math.floor(burn.points.length/2)]
  carveCrater(terrain,center.x,center.y,16)
  assert.equal(burnSupported(terrain,center),false)
  assert.equal(burnSupported(terrain,burn.points[0]),true)
})

test('fire fades out before the scorch mark and both expire',()=>{
  assert.equal(burnStrength(0),0)
  assert.equal(burnStrength(1),1)
  assert.ok(burnStrength(6)>0&&burnStrength(6)<1)
  assert.equal(burnStrength(BURN_SECONDS),0)
  assert.equal(scorchStrength(BURN_SECONDS),1)
  assert.equal(scorchStrength(SCORCH_SECONDS),0)
  assert.equal(burnStrength(100),0)
})

// Exercise the renderer's real lifecycle without loading Phaser's browser runtime.
import { TerrainFire } from './terrain-fire.ts'
test('renderer bounds repeated impacts, expires flames, and clears restart/shutdown objects',()=>{
  const previous=globalThis.document
  const context=new Proxy({}, {get:(_target,key)=>key==='createLinearGradient'?()=>({addColorStop(){}}):()=>{}})
  globalThis.document={createElement:()=>({getContext:()=>context})}
  const images=[],graphics=[]
  function object(list){
    const o={active:true,destroy(){this.active=false},clear(){return this}}
    const proxy=new Proxy(o,{get:(target,key)=>key in target?target[key]:()=>proxy})
    list.push(proxy);return proxy
  }
  const scene={textures:{exists:()=>false,addCanvas:()=>({add(){}})},add:{
    graphics:()=>object(graphics),image:()=>object(images),
  }}
  try{
    const terrain=createTerrain(),fire=new TerrainFire(scene,false)
    for(let i=0;i<30;i++)fire.add(terrain,300+i,70)
    assert.equal(images.filter(i=>i.active).length,6*6*2)
    fire.update(1,terrain)
    fire.update(BURN_SECONDS,terrain)
    assert.equal(images.filter(i=>i.active).length,0)
    fire.add(terrain,500,70)
    fire.clear()
    assert.equal(images.filter(i=>i.active).length,0)
    fire.add(terrain,500,70)
    fire.update(SCORCH_SECONDS+1,terrain)
    assert.equal(images.filter(i=>i.active).length,0)
    fire.destroy()
    assert.ok(graphics.every(g=>!g.active))
  }finally{globalThis.document=previous}
})
