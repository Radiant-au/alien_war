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
  layoutId: string;
  variant: number;
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

// Each mode has its own silhouette; normalized coordinates keep the world wide.
export const TERRAIN_LAYOUTS: Record<number, readonly { id: string; anchors: readonly (readonly [number, number])[] }[]> = {
  2: [
    { id: 'duel-crown', anchors: [[0,.58],[.13,.58],[.23,.79],[.30,.79],[.43,.22],[.53,.22],[.66,.81],[.73,.81],[.87,.60],[1,.60]] },
    { id: 'duel-twin-spires', anchors: [[0,.65],[.13,.65],[.24,.24],[.29,.24],[.40,.78],[.50,.36],[.60,.78],[.71,.24],[.76,.24],[.87,.65],[1,.65]] },
  ],
  3: [
    { id: 'trio-crater-gates', anchors: [[0,.62],[.13,.62],[.24,.80],[.31,.23],[.37,.23],[.49,.65],[.63,.65],[.72,.22],[.77,.22],[.87,.61],[1,.61]] },
    { id: 'trio-highland-bowls', anchors: [[0,.51],[.13,.51],[.25,.25],[.33,.25],[.44,.80],[.49,.80],[.55,.60],[.63,.60],[.70,.28],[.77,.28],[.87,.72],[1,.72]] },
  ],
  4: [
    { id: 'squad-sawtooth', anchors: [[0,.65],[.13,.65],[.21,.24],[.25,.24],[.33,.64],[.41,.64],[.46,.25],[.50,.25],[.55,.66],[.63,.66],[.72,.23],[.77,.23],[.87,.64],[1,.64]] },
    { id: 'squad-fortress', anchors: [[0,.58],[.13,.58],[.20,.32],[.26,.32],[.33,.73],[.41,.73],[.46,.21],[.50,.21],[.55,.73],[.63,.73],[.71,.32],[.78,.32],[.87,.58],[1,.58]] },
  ],
};

/** Alternate per mode, including when returning from a different player count. */
export function nextTerrainVariant(previous?: number, random = Math.random): number {
  return previous === undefined ? Math.min(1, Math.floor(random() * 2)) : 1 - previous;
}

export function createTerrain(seed = 0x51a7, playerCount = 2, variant = (seed >>> 0) % 2): Terrain {
  const starts = playerStarts(playerCount);
  if (variant !== 0 && variant !== 1) throw new RangeError('Choose terrain variant 0 or 1');
  let state = seed >>> 0;
  const random = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
  const layout = TERRAIN_LAYOUTS[playerCount][variant];
  // Perturb shared anchor heights and interior positions, rather than shifting
  // the entire map vertically. Flat shelves and ordered ramps stay intact.
  const jitter = new Map<number, number>();
  const anchors = layout.anchors.map(([x, y]) => {
    if (!jitter.has(y)) jitter.set(y, (random() - .5) * .035);
    return [x === 0 || x === 1 ? x : x + (random() - .5) * .008, y + jitter.get(y)!];
  });
  let segment = 0;
  const heights = Array.from({ length: WORLD_WIDTH + 1 }, (_, x) => {
    const u = x / WORLD_WIDTH;
    while (segment < anchors.length - 2 && u > anchors[segment + 1][0]) segment++;
    const a = anchors[segment], b = anchors[segment + 1];
    const t = (u - a[0]) / (b[0] - a[0]);
    return (a[1] + (b[1] - a[1]) * t) * WORLD_HEIGHT;
  });
  for (const fraction of starts) {
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
    layoutId: layout.id,
    variant,
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

