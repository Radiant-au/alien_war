import test from 'node:test'
import assert from 'node:assert/strict'
import { SPELLS } from './spells.ts'

test('the visible Fire Cluster weapon selects the fire behavior and new artwork',()=>{
  const spell=SPELLS.find(s=>s.name==='Fire Cluster')
  assert.ok(spell)
  assert.equal(spell.effect,'fire')
  assert.equal(spell.icon,'fire_cluster_icon.svg')
  assert.equal(spell.color,0xffa13c)
  assert.equal(spell.destroyTerrain,true)
  assert.equal(SPELLS.filter(s=>s.effect==='fire').length,1)
})
