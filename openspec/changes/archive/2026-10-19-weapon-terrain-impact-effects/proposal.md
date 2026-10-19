## Why

The sibling `phaser_weapon` project has four distinct weapon impact animations with lingering effects, while this game currently uses one short generic impact. Bringing those styles into the destructible battlefield will make each weapon recognizable and let its aftermath read against the existing terrain. Poison should affect players without changing the terrain.

## What Changes

- Add weapon-specific electric, fire, poison, and ice impact and lingering effects based on the four reference styles.
- Map the current spells to those styles: Plasma Bolt to electric, Acid Bomb to poison, Gravity Orb to fire, and Cryo Spike to ice.
- Increase blast radii and visual scale for clearer, more destructive electric, fire, and ice impacts; make poison substantially larger and longer-lived while keeping it non-destructive to terrain.
- Keep each spell's maximum damage, and animate the health HUD downward one point at a time after damage resolves.
- Keep transient effects in world coordinates, visible over the terrain and correctly positioned while the camera follows projectiles or impacts.

## Capabilities

### New Capabilities

### Modified Capabilities
- `artillery-battlefield`: weapon impacts have distinct persistent visual aftermath; poison impacts do not destroy terrain, while the other weapon impacts retain bowl-shaped crater destruction.
- `artillery-match`: the HUD animates health decreases one point at a time while actual combat health remains authoritative.

## Impact

- Affects `src/landscape-scene.ts`, `src/match.ts`, `src/spells.ts`, `src/main.ts`, terrain rendering and impact tests.
- Uses the existing reference assets in `../phaser_weapon` where suitable, plus lightweight Phaser effects for lingering embers, ice shards, poison bubbles, and electric arcs. No new dependency is expected.
- Preserves the current heightmap as the collision and support model. Poison impacts must also avoid terrain revision changes and terrain-decoration removal.
