import {
  PLAYER_HEIGHT,
  PLAYER_WIDTH,
  MOVEMENT_ALLOWANCE,
  PLAYER_START_FRACTIONS,
  SOIL_TEXTURE_SCALE,
  SOIL_TEXTURE_SIZE,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from "./config.ts";

export {
  PLAYER_HEIGHT,
  PLAYER_WIDTH,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from "./config.ts";

export interface Terrain {
  heights: number[];
  initialHeights: number[];
  textureOffset: { x: number; y: number };
  decorationSeed: number;
  revision: number;
}

export interface Player {
  id: 0 | 1;
  x: number;
  y: number;
  health: number;
  aimAngle: number;
  power: number;
  grounded: boolean;
  velocityY: number;
  movementRemaining: number;
}

export function createTerrain(seed = 0x51a7): Terrain {
  let state = seed >>> 0;
  const random = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
  const phase = random() * Math.PI * 2;
  const heights = Array.from({ length: WORLD_WIDTH + 1 }, (_, x) => {
    const u = x / WORLD_WIDTH;
    // Broad hills and a central ridge encourage high-angle shots.
    return 420 - 55 * Math.exp(-Math.pow((u - 0.15) / 0.15, 2))
      - 50 * Math.exp(-Math.pow((u - 0.86) / 0.16, 2))
      - 140 * Math.exp(-Math.pow((u - 0.50) / 0.075, 2))
      + 12 * Math.sin(u * Math.PI * 6 + phase);
  });
  for (const fraction of PLAYER_START_FRACTIONS) {
    const center = WORLD_WIDTH * fraction;
    const ground = heights[Math.round(center)];
    for (
      let x = Math.floor(center - PLAYER_WIDTH);
      x <= center + PLAYER_WIDTH;
      x++
    )
      heights[x] = ground;
  }
  const initialHeights = [...heights];
  const tileWorldSize = SOIL_TEXTURE_SIZE * SOIL_TEXTURE_SCALE;
  return {
    heights,
    initialHeights,
    textureOffset: { x: random() * tileWorldSize, y: random() * tileWorldSize },
    decorationSeed: state,
    revision: 0,
  };
}

export function surfaceAt(terrain: Terrain, x: number): number {
  const clamped = Math.max(0, Math.min(WORLD_WIDTH, x));
  const left = Math.floor(clamped);
  const right = Math.min(WORLD_WIDTH, left + 1);
  return (
    terrain.heights[left] +
    (terrain.heights[right] - terrain.heights[left]) * (clamped - left)
  );
}

export function playerSupport(terrain: Terrain, player: Player): number {
  let support = WORLD_HEIGHT;
  const left = Math.max(0, Math.floor(player.x - PLAYER_WIDTH / 2));
  const right = Math.min(WORLD_WIDTH, Math.ceil(player.x + PLAYER_WIDTH / 2));
  for (let x = left; x <= right; x++)
    support = Math.min(support, terrain.heights[x]);
  return support;
}

export function createPlayers(terrain: Terrain): [Player, Player] {
  const positions = PLAYER_START_FRACTIONS.map((fraction) => WORLD_WIDTH * fraction);
  return positions.map((x, id) => {
    const player: Player = {
      id: id as 0 | 1,
      x,
      y: 0,
      health: 100,
      aimAngle: id === 0 ? -Math.PI / 4 : (-Math.PI * 3) / 4,
      power: 0.58,
      grounded: true,
      velocityY: 0,
      movementRemaining: MOVEMENT_ALLOWANCE,
    };
    player.y = playerSupport(terrain, player) - PLAYER_HEIGHT / 2;
    return player;
  }) as [Player, Player];
}

export function carveCrater(
  terrain: Terrain,
  cx: number,
  cy: number,
  radius: number,
): void {
  const from = Math.max(0, Math.floor(cx - radius));
  const to = Math.min(WORLD_WIDTH, Math.ceil(cx + radius));
  for (let x = from; x <= to; x++) {
    const dx = x - cx;
    const edge = cy + Math.sqrt(Math.max(0, radius * radius - dx * dx));
    terrain.heights[x] = Math.min(
      WORLD_HEIGHT - 4,
      Math.max(terrain.heights[x], edge),
    );
  }
  terrain.revision++;
}

export function explosionDamage(
  player: Player,
  cx: number,
  cy: number,
  radius: number,
  maximumDamage = 60,
): number {
  const left = player.x - PLAYER_WIDTH / 2;
  const right = player.x + PLAYER_WIDTH / 2;
  const top = player.y - PLAYER_HEIGHT / 2;
  const bottom = player.y + PLAYER_HEIGHT / 2;
  const dx = Math.max(left - cx, 0, cx - right);
  const dy = Math.max(top - cy, 0, cy - bottom);
  return Math.round(maximumDamage * Math.max(0, 1 - Math.hypot(dx, dy) / radius));
}
