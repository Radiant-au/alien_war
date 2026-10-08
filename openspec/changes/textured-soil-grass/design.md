## Context

The Phaser 4.2.1 Canvas scene currently redraws a single flat-colored heightmap polygon only when `Terrain.revision` changes. `src/terrain.ts` is authoritative for terrain, support, and crater changes; terrain is a one-dimensional height array and cannot represent tunnels or overhangs. The supplied 1254 × 1254 `assets/terrain.png` is present but not loaded by the game.

## Goals / Non-Goals

**Goals:**
- Render the soil image as a small, world-anchored repeated material clipped to current solid terrain.
- Generate a one-time grass cap/highlight/tuft layer from the initial seeded surface, then erase it locally and permanently on craters.
- Keep background separate and retain revision-based updates rather than per-frame terrain rebuilds.
- Preserve the current heightmap collision, movement, projectile, camera, and settling behavior.

**Non-Goals:**
- Add pixel collision, tunnels, caves, or overhangs; those do not exist in this project and would require a terrain-physics redesign.
- Change terrain generation, damage, projectiles, camera controls, or match rules.
- Add a grass image or new dependency.

## Decisions

- Load `assets/terrain.png` with Vite's URL import and Phaser's existing scene loader. Derive a narrow-band edge-blended CanvasTexture from that source so only tile borders are adjusted; repeat it through a Phaser TileSprite at a configurable small scale.
- Seed a fixed per-map texture offset and grass detail seed from the same terrain PRNG. Keep the soil tile offset and original grass profile fixed for the match.
- Build the soil clip from the authoritative current heightmap using an off-display-list Graphics object and a Canvas GeometryMask. Refresh this mask only when `Terrain.revision` changes; the background remains in its own Graphics object without the terrain mask.
- Rasterize the initial cap, highlight, and tufts once into a world-sized CanvasTexture using initial heights. Draw all decorative pixels inside solid ground except tuft blades; skip wizard start pads. Keep tuft bounds/support samples so blasts can also remove an affected tuft in full when its support is cratered.
- On impact, keep `carveCrater` as the collision authority, rebuild the terrain mask once, erase the same blast circle from the grass canvas using `destination-out`, and erase any newly unsupported tuft bounds. Do not regenerate grass after destruction; the soil tile under the updated mask naturally exposes brown crater walls and floors.

## Risks / Trade-offs

- Canvas GeometryMasks are appropriate because the game explicitly uses Phaser's Canvas renderer; switching renderer later requires another mask implementation.
- [Project architecture mismatch] → Existing terrain is a heightmap, not a pixel mask, and cannot preserve overhangs or tunnels. Keep current collision semantics and call this limitation out; adding those shapes is a separate physics migration.
- [Tile seams] → Blend only a narrow source-image edge band and validate repeated edges; leave the rest of the texture sharp.
- [Grass texture refresh cost] → Mutate only the local crater region and refresh only on terrain revisions, never during ordinary frames.

## Migration Plan

No data migration is required. Load the existing asset, create the scene textures during startup, and rebuild them on normal match restart. Rollback is limited to restoring the previous terrain polygon renderer and removing the texture import/configuration.

## Open Questions

None for this implementation. Tunnels and overhangs remain unsupported because the current collision data cannot represent them.
