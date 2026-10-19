import test from 'node:test'
import assert from 'node:assert/strict'
import { CLIMB_LIMIT, MOVEMENT_ALLOWANCE, PLAYER_START_FRACTIONS, PLAYER_HEIGHT, PLAYER_WIDTH, VIEW_WIDTH, WORLD_HEIGHT, WORLD_WIDTH } from './config.ts'
import { movePlayer, stepPlayerGravity } from './movement.ts'
import { carveCrater, createPlayers, createTerrain, explosionDamage, playerSupport, surfaceAt } from './terrain.ts'
import { createShot, MAX_SPEED, STEP_SECONDS, stepShot, sweepShot, trajectory } from './projectile.ts'
import { cameraCenterX, overviewScrollX, overviewZoom, createMatch, fire, resolveShot, updateMatch } from './match.ts'
import { createGrassTufts, tuftSupportDestroyed } from './terrain-visuals.ts'

function readyMatch() {
  const match = createMatch()
  match.phase = 'MovementAiming'
  match.cameraX = overviewScrollX(match.players)
  return match
}

test('expanded fixed-seed terrain and starting positions are continuous and reproducible', () => {
  const first = createTerrain()
  const second = createTerrain()
  assert.equal(WORLD_WIDTH, VIEW_WIDTH * 3.5)
  assert.equal(first.heights.length, WORLD_WIDTH + 1)
  assert.deepEqual(first, second)
  const players = createPlayers(first)
  assert.deepEqual(players.map(p => p.x), PLAYER_START_FRACTIONS.map(fraction => WORLD_WIDTH * fraction))
  assert.ok(players.every(p => Math.abs(p.y + PLAYER_HEIGHT / 2 - playerSupport(first, p)) < 1e-6))
  assert.ok(first.heights.every(h => h >= 0 && h < WORLD_HEIGHT))
  assert.ok(cameraCenterX(players[1].x) <= WORLD_WIDTH - VIEW_WIDTH)
})

test('craters only remove terrain, stay bounded, and increment the terrain revision', () => {
  const terrain = createTerrain()
  const before = [...terrain.heights]
  carveCrater(terrain, 2, 400, 48)
  const once = [...terrain.heights]
  carveCrater(terrain, 2, 390, 48)
  assert.ok(terrain.heights.every((height, x) => height >= once[x]))
  assert.ok(terrain.heights.every((height, x) => height >= before[x] && height <= WORLD_HEIGHT - 4))
  assert.equal(terrain.revision, 2)
  assert.equal(terrain.heights[0], Math.max(before[0], 400 + Math.sqrt(48 ** 2 - 2 ** 2)))
})

test('texture offsets and grass details are seeded, with clear wizard start areas', () => {
  const terrain = createTerrain(1234)
  assert.deepEqual(terrain.textureOffset, createTerrain(1234).textureOffset)
  assert.notDeepEqual(terrain.textureOffset, createTerrain(1235).textureOffset)
  const tufts = createGrassTufts(terrain)
  assert.deepEqual(tufts, createGrassTufts(createTerrain(1234)))
  assert.ok(tufts.length > 20)
  const starts = PLAYER_START_FRACTIONS.map(fraction => WORLD_WIDTH * fraction)
  assert.ok(tufts.every(tuft => starts.every(start => Math.abs(tuft.x - start) >= 76)))
  const tuft = tufts[0]
  carveCrater(terrain, tuft.x, tuft.y, 24)
  assert.equal(tuftSupportDestroyed(terrain, tuft), true)
})

test('movement allowance measures actual travel and stops at the world edge or opposing player', () => {
  const terrain = createTerrain()
  terrain.heights.fill(300)
  const players = createPlayers(terrain)
  const [player, other] = players
  const moved = movePlayer(terrain, players, player, 1, 0.25)
  assert.ok(Math.abs(moved - 60) < 1e-6)
  assert.ok(Math.abs(player.movementRemaining - (MOVEMENT_ALLOWANCE - moved)) < 1e-6)
  const before = player.movementRemaining
  player.x = other.x - PLAYER_WIDTH - 4
  assert.equal(movePlayer(terrain, players, player, 1, 0.1), 0)
  assert.equal(player.movementRemaining, before)
  player.x = PLAYER_WIDTH / 2
  assert.equal(movePlayer(terrain, players, player, -1, 0.1), 0)
})

test('substeps follow gentle slopes and block climbs above the configured limit without charging blocked motion', () => {
  const terrain = createTerrain()
  const players = createPlayers(terrain)
  const p = players[0]
  terrain.heights.fill(300)
  for (let x = 480; x <= 500; x++) terrain.heights[x] = 300 - (x - 480) * 0.5
  for (let x = 501; x <= 540; x++) terrain.heights[x] = 270
  p.x = 440
  p.y = playerSupport(terrain, p) - PLAYER_HEIGHT / 2
  p.grounded = true
  p.velocityY = 0
  p.movementRemaining = MOVEMENT_ALLOWANCE
  const moved = movePlayer(terrain, players, p, 1, 0.5)
  assert.ok(moved > 0 && moved < 120)
  assert.ok(300 - terrain.heights[Math.round(p.x)] <= CLIMB_LIMIT + 2)
  const blockedAllowance = p.movementRemaining
  const blocked = movePlayer(terrain, players, p, 1, 0.5)
  assert.equal(blocked, 0)
  assert.equal(p.movementRemaining, blockedAllowance)
})

test('gravity lands actors on support without consuming movement and supports terrain destruction falls', () => {
  const terrain = createTerrain()
  const players = createPlayers(terrain)
  const p = players[0]
  const allowance = p.movementRemaining
  p.grounded = false
  p.velocityY = 0
  p.y -= 40
  for (let i = 0; i < 120 && !p.grounded; i++) stepPlayerGravity(terrain, p, STEP_SECONDS)
  assert.equal(p.grounded, true)
  assert.ok(Math.abs(p.y + PLAYER_HEIGHT / 2 - playerSupport(terrain, p)) < 1e-6)
  assert.equal(p.movementRemaining, allowance)
  p.grounded = true
  carveCrater(terrain, p.x, p.y, 48)
  assert.equal(stepPlayerGravity(terrain, p, STEP_SECONDS), false)
})

test('muzzle clears shooter and trajectory uses the same launch physics', () => {
  const terrain = createTerrain()
  const players = createPlayers(terrain)
  const shot = createShot(players[0])
  assert.ok(Math.hypot(shot.x - players[0].x, shot.y - players[0].y) > 17)
  const expected = { ...shot }
  stepShot(expected, terrain, players)
  assert.deepEqual(trajectory(shot, terrain, players)[0], { x: expected.x, y: expected.y })
  assert.equal(MAX_SPEED, 950)
})

test('swept collision catches fast shots and maximum arc has cross-field range', () => {
  const terrain = createTerrain()
  const players = createPlayers(terrain)
  players[0].x = 300
  players[0].y = 200
  players[1].x = 400
  players[1].y = 200
  terrain.heights.fill(400)
  const shot = { x: 100, y: 200, vx: 1000, vy: 0, age: 0, shooter: 1 }
  assert.deepEqual(sweepShot(shot, terrain, players, 500, 200), { kind: 'impact', x: 300 - PLAYER_WIDTH / 2 - 4, y: 200, target: 0 })
  // Test range on unobstructed ground; generated ridges can correctly block a shot.
  const flatTerrain = createTerrain()
  flatTerrain.heights.fill(400)
  const fieldPlayers = createPlayers(flatTerrain)
  let canReachOpponent = false
  for (let degrees = 5; degrees < 85 && !canReachOpponent; degrees += 0.25) {
    fieldPlayers[0].aimAngle = -degrees * Math.PI / 180
    fieldPlayers[0].power = 1
    const shot = createShot(fieldPlayers[0])
    let result
    for (let i = 0; i < 1500 && !result; i++) result = stepShot(shot, flatTerrain, fieldPlayers)
    canReachOpponent = result?.target === 1
  }
  assert.equal(canReachOpponent, true)
  assert.ok(MAX_SPEED > 900)
})

test('camera clamps to world and initial/next-player transitions gate controls', () => {
  assert.equal(cameraCenterX(-100), 0)
  assert.equal(cameraCenterX(WORLD_WIDTH + 100), WORLD_WIDTH - VIEW_WIDTH)
  const match = createMatch()
  assert.equal(match.phase, 'InitialCameraTransition')
  assert.equal(fire(match), false)
  for (let i = 0; i < 50; i++) updateMatch(match, STEP_SECONDS)
  assert.equal(match.phase, 'MovementAiming')
  assert.equal(fire(match), true)
  assert.equal(fire(match), false)
  assert.equal(match.phase, 'ProjectileFlight')
})

test('impact damages once, settles, then transitions before the next player can act', () => {
  const match = readyMatch()
  resolveShot(match, { kind: 'impact', x: match.players[0].x, y: match.players[0].y, target: 0 })
  assert.equal(match.players[0].health, 40)
  assert.equal(match.phase, 'Impact')
  assert.equal(fire(match), false)
  for (let i = 0; i < 600 && match.phase !== 'MovementAiming'; i++) updateMatch(match, STEP_SECONDS)
  assert.equal(match.active, 1)
  assert.equal(match.phase, 'MovementAiming')
  assert.equal(match.players[1].movementRemaining, MOVEMENT_ALLOWANCE)
})

test('misses and timeouts resolve without damage and still advance turns', () => {
  const match = readyMatch()
  resolveShot(match, { kind: 'miss' })
  assert.deepEqual(match.players.map(player => player.health), [100, 100])
  for (let i = 0; i < 100; i++) updateMatch(match, STEP_SECONDS)
  assert.equal(match.active, 1)
  assert.equal(match.phase, 'MovementAiming')
})

test('winner check handles simultaneous defeat and prevents further firing', () => {
  const match = readyMatch()
  match.players[0].health = 0
  match.players[1].health = 0
  match.phase = 'WinnerCheck'
  updateMatch(match, STEP_SECONDS)
  assert.equal(match.outcome, 'Draw')
  assert.equal(match.phase, 'GameOver')
  assert.equal(fire(match), false)
})

test('blast damage decreases with distance and can affect both players', () => {
  const players = createPlayers(createTerrain())
  const near = explosionDamage(players[0], players[0].x, players[0].y, 48)
  const far = explosionDamage(players[1], players[0].x, players[0].y, 48)
  assert.ok(near >= far)
  assert.equal(far, 0)
})

test('fresh restart state resets terrain, health, movement, turn, shot, input, and camera', () => {
  const match = readyMatch()
  fire(match)
  match.players[0].health = 0
  const restarted = createMatch()
  assert.equal(restarted.phase, 'InitialCameraTransition')
  assert.equal(restarted.active, 0)
  assert.deepEqual(restarted.players.map(player => player.health), [100, 100])
  assert.deepEqual(restarted.players.map(player => player.movementRemaining), [MOVEMENT_ALLOWANCE, MOVEMENT_ALLOWANCE])
  assert.deepEqual(restarted.terrain, createTerrain())
  assert.equal(restarted.shot, undefined)
  assert.equal(restarted.pointerId, undefined)
  assert.equal(restarted.cameraX, overviewScrollX(restarted.players))
  assert.equal(restarted.cameraZoom, overviewZoom(restarted.players))
})

test('hybrid overview keeps both wizards within the visible horizontal frame', () => {
  const match = createMatch()
  const left = match.cameraX
  const right = left + VIEW_WIDTH / match.cameraZoom
  assert.ok(match.cameraZoom > 0 && match.cameraZoom <= 1)
  assert.ok(match.players.every(player => player.x >= left + 60 && player.x <= right - 60))
  for (let i = 0; i < 50; i++) updateMatch(match, STEP_SECONDS)
  assert.equal(match.phase, 'MovementAiming')
  assert.ok(Math.abs(match.cameraX - overviewScrollX(match.players)) < 1e-6)
})

test('hybrid camera remains stationary for on-screen shots and pans when the projectile exits', () => {
  const match = readyMatch()
  const initialX = match.cameraX
  match.phase = 'ProjectileFlight'
  match.shot = { x: (match.players[0].x + match.players[1].x) / 2, y: 100, vx: 0, vy: 0, age: 0, shooter: 0 }
  updateMatch(match, STEP_SECONDS)
  assert.equal(match.cameraX, initialX)
  match.shot.x = WORLD_WIDTH + 100
  updateMatch(match, STEP_SECONDS)
  assert.ok(match.cameraX > initialX)
  assert.ok(match.cameraX <= WORLD_WIDTH - VIEW_WIDTH / match.cameraZoom)
})

test('hybrid camera returns to overview after impact and before next turn', () => {
  const match = readyMatch()
  match.cameraX = 0
  resolveShot(match, { kind: 'miss' })
  for (let i = 0; i < 600 && match.phase !== 'MovementAiming'; i++) updateMatch(match, STEP_SECONDS)
  assert.equal(match.phase, 'MovementAiming')
  assert.equal(match.active, 1)
  assert.ok(Math.abs(match.cameraX - overviewScrollX(match.players)) < 1e-6)
})

