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
  id: number;
  x: number;
  y: number;
  health: number;
  aimAngle: number;
  power: number;
  grounded: boolean;
  velocityY: number;
  movementRemaining: number;
}

export function playerStarts(count = 2): readonly number[] {
  if (!Number.isInteger(count) || count < 2 || count > 4) throw new RangeError('Choose 2, 3 or 4 players');
  return count === 2 ? PLAYER_START_FRACTIONS : count === 3 ? [0.09, 0.59, 0.91] : [0.09, 0.37, 0.59, 0.91];
}

export function createTerrain(seed = 0x51a7, playerCount = 2): Terrain {
  let state = seed >>> 0;
  const random = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
  const anchors = [
    [0, .38], [.12, .38], [.145, .48], [.175, .48], [.19, .61], [.22, .61],
    [.27, .80], [.31, .82], [.335, .81], [.35, .72], [.425, .72], [.47, .23],
    [.50, .23], [.53, .52], [.545, .52], [.56, .60], [.635, .60], [.65, .77],
    [.69, .83], [.74, .81], [.79, .66], [.82, .66], [.84, .49], [.86, .49],
    [.875, .44], [.96, .44], [.975, .49], [1, .49],
  ];
  const variation = random() * 10 - 5;
  const heights = Array.from({ length: WORLD_WIDTH + 1 }, (_, x) => {
    const u = x / WORLD_WIDTH;
    const index = Math.max(0, anchors.findIndex(anchor => anchor[0] >= u) - 1);
    const a = anchors[index], b = anchors[Math.min(index + 1, anchors.length - 1)];
    const t = (u - a[0]) / (b[0] - a[0]);
    // Keep ramps angular, while the two deep basins have gently rounded floors.
    const rounded = (u > .22 && u < .35) || (u > .635 && u < .79);
    const blend = rounded ? t * t * (3 - 2 * t) : t;
    return (a[1] + (b[1] - a[1]) * blend) * WORLD_HEIGHT + variation;
  });
  for (const fraction of playerStarts(playerCount)) {
    const center = Math.round(WORLD_WIDTH * fraction), ground = heights[center];
    const radius = PLAYER_WIDTH * 2;
    for (let x = Math.max(0, center - radius); x <= Math.min(WORLD_WIDTH, center + radius); x++) {
      const t = Math.max(0, Math.min(1, (Math.abs(x - center) - PLAYER_WIDTH) / PLAYER_WIDTH));
      heights[x] = ground + (heights[x] - ground) * t * t * (3 - 2 * t);
    }
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

export function createPlayers(terrain: Terrain, count = 2): Player[] {
  const positions = playerStarts(count).map((fraction) => WORLD_WIDTH * fraction);
  return positions.map((x, id) => {
    const player: Player = {
      id,
      x,
      y: 0,
      health: 100,
      aimAngle: x < WORLD_WIDTH / 2 ? -Math.PI / 4 : (-Math.PI * 3) / 4,
      power: 0.58,
      grounded: true,
      velocityY: 0,
      movementRemaining: MOVEMENT_ALLOWANCE,
    };
    player.y = playerSupport(terrain, player) - PLAYER_HEIGHT / 2;
    return player;
  });
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
