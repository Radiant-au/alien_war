import { GRASS_START_CLEAR_RADIUS, GRASS_TUFT_DENSITY, PLAYER_START_FRACTIONS, WORLD_WIDTH } from '../game/config.ts'
import type { Terrain } from '../game/terrain.ts'

export interface GrassTuft {
  x: number
  y: number
  height: number
}

export function createGrassTufts(terrain: Terrain, density = GRASS_TUFT_DENSITY): GrassTuft[] {
  let state = terrain.decorationSeed >>> 0
  const random = () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 0x100000000
  }
  const starts = PLAYER_START_FRACTIONS.map(fraction => WORLD_WIDTH * fraction)
  const tufts: GrassTuft[] = []
  for (let x = 8; x < WORLD_WIDTH - 8; x += 8) {
    if (starts.some(start => Math.abs(x - start) < GRASS_START_CLEAR_RADIUS) || random() >= density) continue
    const left = Math.floor(x)
    const right = Math.min(WORLD_WIDTH, left + 1)
    const t = x - left
    const y = terrain.initialHeights[left] + (terrain.initialHeights[right] - terrain.initialHeights[left]) * t
    tufts.push({ x, y, height: 3 + random() * 4 })
  }
  return tufts
}

export function tuftSupportDestroyed(terrain: Terrain, tuft: GrassTuft): boolean {
  const x = Math.max(0, Math.min(WORLD_WIDTH, Math.round(tuft.x)))
  return terrain.heights[x] > terrain.initialHeights[x] + 0.5
}
