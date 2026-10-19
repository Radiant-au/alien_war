## Context

The current game simulates a small circular shot in `src/projectile.ts` and draws that same dot in `LandscapeScene`. Aim power maps to launch speed between `MIN_SPEED` and `MAX_LAUNCH_SPEED`; both the preview and live shot use `stepShot`. The sibling `../weapons` project has four looping right-facing missile sheets, each 512 × 64 with four 128 × 64 frames.

## Goals / Non-Goals

**Goals:**
- Show an animated missile corresponding to the selected spell during flight.
- Keep missile position and rotation synchronized with the simulated shot on its gravity curve.
- Increase launch speed by about 12% without changing aim/power shape, gravity, or collision behavior.

**Non-Goals:**
- Add physics bodies, alter hitboxes, or change terrain/player collision.
- Change weapon damage, blast radius, or the preview's shared simulation rules.
- Change the existing dotted aim preview into a separate missile preview.

## Decisions

- Copy the four SVG sprite sheets into this app's `public/assets` and load them as 4-frame sheets at 128 × 64. Keeping assets local makes the production build independent of sibling project paths.
- Map selected spells to the matching existing elemental style: Cryo Spike → ice, Acid Bomb → poison, Plasma Bolt → electric, and Gravity Orb → fire. Start a looping animation when a shot launches and destroy it as soon as the shot impacts, misses, or the match restarts.
- Orient the sprite with `atan2(vy, vx)` each render frame. The sheets face right, and direct rotation handles both left/right travel and changing angle under gravity.
- Apply a 1.12 multiplier to the computed launch speed in `createShot`. The preview uses `createShot` and `stepShot`, so it remains synchronized automatically, while swept collision continues to use the unchanged physical projectile radius.
- Render the sprite above the player/terrain graphics and size it to roughly one ship-body length. This makes the missile readable without changing its collision footprint.

## Risks / Trade-offs

- SVG sheet loading or Phaser frame slicing may vary by browser → confirm all four frames load and animate in the production build.
- A larger sprite can visually overlap terrain before the physical shot collides → preserve the existing hitbox and accept the overlap as cosmetic, tuning display size if it obscures the aim path.
- Faster shots can cross more world distance per rendered frame → simulation remains at 120 Hz and uses swept earliest-contact checks for terrain and players.

## Migration Plan

No migration is needed. Copy the sheets, register animations, replace the dot with a scene-owned missile sprite, and apply the speed multiplier. Rollback is limited to the visual and launch-speed changes; collision and terrain data remain unchanged.
