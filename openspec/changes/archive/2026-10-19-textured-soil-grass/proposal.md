## Why

The generated battlefield currently uses a flat fill, so its destructible ground lacks the provided soil texture and a readable grassy surface. Layering world-anchored texture and persistent initial grass over the existing terrain mask will give random maps a cohesive style without changing projectile or support rules.

## What Changes

- Load and repeat the provided soil texture inside the current solid-terrain mask, with a seeded per-map offset and configurable scale.
- Add a configurable procedural grass cap, highlight, and sparse seeded tufts along the initial terrain outline, leaving wizard pads relatively clear.
- Erase soil through the authoritative terrain mask and erase grass pixels/tufts on every crater without regenerating decoration.
- Keep the background separate, preserve camera alignment and terrain collision behavior, and update visuals only when terrain changes.

## Capabilities

### New Capabilities

### Modified Capabilities
- `artillery-battlefield`: define soil and grass rendering as terrain visuals, including persistent destruction and bare crater surfaces.

## Impact

- Affects `src/main.ts`, `src/terrain.ts`, `src/config.ts`, and terrain tests.
- Uses the existing `assets/terrain.png` image and Phaser 4.2.1 Canvas renderer; adds no dependency.
- The current collision model is a heightmap and does not represent tunnels or overhangs; this change preserves that model and does not add unsupported terrain geometry.
