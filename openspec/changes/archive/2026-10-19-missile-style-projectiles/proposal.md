## Why

Shots currently appear as tiny circles even though the sibling `../weapons` project has animated, elemental missiles. Replacing the shot visuals with those missiles and modestly increasing flight speed will make the game's weapon selection visible during flight and shorten shot travel without changing its artillery trajectory or collision model.

## What Changes

- Replace the circle projectile visual with a continuously animated missile matching the selected spell: ice, poison, electric, or fire.
- Orient the missile along its actual flight direction, including leftward shots and curved trajectories.
- Increase launch speed modestly (about 12%) while keeping aim, power, gravity, fixed-step simulation, terrain/player collision, and trajectory preview in sync.

## Capabilities

### New Capabilities

### Modified Capabilities
- `artillery-shooting`: define animated spell-specific missile visuals and a modest speed increase while preserving trajectory and collision agreement.

## Impact

- Affects `src/landscape-scene.ts`, `src/projectile.ts`, `src/config.ts` or projectile speed configuration, and shooting tests.
- Reuses the four 512 × 64 SVG sprite sheets from the sibling `../weapons` project (four 128 × 64 frames each); no runtime dependency is added.
- The displayed missile remains cosmetic; the existing swept projectile collision and heightmap terrain remain authoritative.
