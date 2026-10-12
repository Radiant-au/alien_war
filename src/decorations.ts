import { PLAYER_START_FRACTIONS, WORLD_HEIGHT, WORLD_WIDTH } from './config.ts'
import type { Terrain } from './terrain.ts'

export interface TerrainDecoration {
  key: string
  kind: 'plant' | 'crystal'
  x: number
  y: number
  width: number
}

export function createDecorations(terrain: Terrain): TerrainDecoration[] {
  let state = terrain.decorationSeed >>> 0
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 0x100000000
  }
  const items: TerrainDecoration[] = []
  for (let x = 30; x < WORLD_WIDTH - 30; x += 55 + Math.floor(random() * 50)) {
    if (PLAYER_START_FRACTIONS.some(f => Math.abs(x - f * WORLD_WIDTH) < 65)) continue
    const y = terrain.initialHeights[x]
    items.push({ kind: 'plant', key: `p${1 + Math.floor(random() * 6)}`, x, y: y + 2, width: 17 + random() * 16 })
  }
  for (let x = 50; x < WORLD_WIDTH - 50; x += 100 + Math.floor(random() * 120)) {
    const surface = terrain.initialHeights[x]
    items.push({ kind: 'crystal', key: `c${1 + Math.floor(random() * 6)}`, x, y: Math.min(WORLD_HEIGHT - 5, surface + 45 + random() * 85), width: 22 + random() * 20 })
  }
  return items
}

export function decorationDestroyed(terrain: Terrain, item: TerrainDecoration, cx: number, cy: number, radius: number): boolean {
  const x = Math.max(0, Math.min(WORLD_WIDTH, Math.round(item.x)))
  // Embedded crystals are clipped by the soil mask; plants disappear if their base loses support.
  return (item.kind === 'plant' && terrain.heights[x] > terrain.initialHeights[x] + 0.5)
    || Math.hypot(item.x - cx, item.y - cy) < radius
}
