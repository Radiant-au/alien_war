import test from 'node:test'
import assert from 'node:assert/strict'
import { createTerrain, carveCrater } from './terrain.ts'
import { createDecorations, decorationDestroyed } from './decorations.ts'
import { viewportMetrics } from './viewport.ts'
import { createMatch, overviewZoom, overviewScrollX, updateMatch } from './match.ts'
import { WORLD_WIDTH } from './config.ts'

test('decorations are seeded, use all existing asset names, and stay within the terrain', () => {
  const terrain = createTerrain(42)
  const items = createDecorations(terrain)
  assert.deepEqual(items, createDecorations(terrain))
  assert.notDeepEqual(items, createDecorations(createTerrain(43)))
  for (const item of items) {
    assert.match(item.key, /^[cp][1-6]$/)
    assert.ok(item.x > 0 && item.x < WORLD_WIDTH)
    assert.ok(item.y >= terrain.initialHeights[Math.round(item.x)])
  }
})

test('plants lose support after a crater, while distant decorations survive', () => {
  const terrain = createTerrain(42)
  const plants = createDecorations(terrain).filter(item => item.kind === 'plant')
  const plant = plants[0]
  const distant = plants.at(-1)
  carveCrater(terrain, plant.x, plant.y, 48)
  assert.equal(decorationDestroyed(terrain, plant, plant.x, plant.y, 48), true)
  assert.equal(decorationDestroyed(terrain, distant, plant.x, plant.y, 48), false)
})

test('responsive overview contains both players and camera stays bounded at different aspect ratios', () => {
  for (const [width, height] of [[1440,900],[2560,1080],[5120,1080],[390,844],[844,390]]) {
    const metrics = viewportMetrics(width, height)
    const match = createMatch()
    match.viewWidth = metrics.logicalWidth
    match.cameraZoom = overviewZoom(match.players, match.viewWidth)
    match.cameraX = overviewScrollX(match.players, match.cameraZoom, match.viewWidth)
    const visible = match.viewWidth / match.cameraZoom
    assert.ok(visible <= WORLD_WIDTH + 1e-8)
    for (const player of match.players) assert.ok(player.x > match.cameraX && player.x < match.cameraX + visible)
    match.phase = 'ProjectileFlight'
    match.shot = { x: WORLD_WIDTH + 100, y: 50, vx: 1, vy: 0, age: 0, shooter: 0 }
    updateMatch(match, 0.1)
    assert.ok(match.cameraX >= 0)
    assert.ok(match.cameraX <= Math.max(0, WORLD_WIDTH - visible))
  }
})
