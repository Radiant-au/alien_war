import test from 'node:test'
import assert from 'node:assert/strict'
import { startupSignal, withDeadline } from './startup.ts'
import { normalizePreferences, shipOrder } from './preferences.ts'

test('startup readiness survives completion before the importing caller subscribes', async () => {
  const signal = startupSignal(100)
  signal.ready()
  await signal.promise
})
test('startup errors and missing ready signals reject rather than leaving loading stuck', async () => {
  const failed = startupSignal(100)
  failed.fail(new Error('Create failed'))
  await assert.rejects(failed.promise, /Create failed/)
  await assert.rejects(startupSignal(10).promise, /startup timed out/)
  await assert.rejects(withDeadline(new Promise(() => {}), 10), /Loading timed out/)
})
test('preferences clamp damaged storage and selected ship orders preserve four unique players', () => {
  assert.deepEqual(normalizePreferences({ship: 10, players: 1, sound: false, music: Infinity, sfx: -10}), {ship:0,players:4,sound:false,music:70,sfx:0})
  for(let ship=0;ship<4;ship++) {
    const order = shipOrder(ship)
    assert.equal(order[0], ship)
    assert.deepEqual([...order].sort(), [0,1,2,3])
  }
})
