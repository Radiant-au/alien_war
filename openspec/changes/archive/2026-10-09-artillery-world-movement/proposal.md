## Why

The first prototype proves short-range firing and turn resolution but keeps both players visible in a single 960-pixel-wide world and fixes them in place. A larger, traversable battlefield with camera transitions adds tactical positioning and long-range aiming while preserving the local two-player match.

## What Changes

- Expand the continuous heightmap world to approximately 2880 × 540 logical units, keep the camera viewport at 960 × 540, and place players far enough apart to require long-range shots.
- Keep terrain, players, movement, aiming, and projectiles in world coordinates while health, turn status, movement allowance, and controls stay fixed on screen.
- Add bounded smooth camera follow for the active player, projectile flight, impact view, and next-player transition; keep manual camera control disabled and show an edge direction indicator for above-view projectiles.
- Let the active player move horizontally before firing using keyboard or touch controls, consuming a configurable per-turn allowance from actual horizontal distance.
- Add slope following, climb limits, falling, landing, player collision and field bounds; disable firing while falling and preserve movement allowance when destruction causes a fall.
- Allow movement and aiming in either order, clear active pointer drags at turn/camera transitions, and update the aim origin and trajectory after movement or camera scrolling.
- Sequence turns through movement/aiming, projectile flight, impact, settling, winner check, camera transition, and next-player readiness; keep misses and timeouts in the same transition flow.
- Reset camera, world, player state, allowance, health, terrain, and turn state on restart.
- Keep movement speed, allowance, climb limit, camera duration, and launch power configurable, with maximum launch power tuned to reach across the expanded field.

## Capabilities

### New Capabilities

- `artillery-large-world`: Expanded continuous terrain, world-coordinate simulation, player spacing, and long-range projectile tuning.
- `artillery-player-movement`: Per-turn movement controls and allowance, slope/climb behavior, collision bounds, falling, and aim interaction.
- `artillery-camera-flow`: Camera bounds and follow modes, impact and turn transitions, above-view indicators, fixed HUD, and camera reset.

### Modified Capabilities

None. The completed prototype’s change specs have not been synced into `openspec/specs`, so this follow-on defines its extension as new capabilities rather than modifying unavailable main specs.

## Impact

Implementation will extend `src/terrain.ts`, `src/projectile.ts`, `src/match.ts`, `src/main.ts`, and `src/style.css`. It requires no new runtime dependency, backend, artwork, or deployment configuration. The Phaser camera viewport and logical world dimensions will become separate values; current callers of world width, terrain queries, projectile launch, match phases, player turn data, pointer handling, HUD, and restart will need coordinated updates. This change contains planning artifacts only.
