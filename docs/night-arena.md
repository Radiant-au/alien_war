# Moonlit arena presentation

The battlefield fills the browser viewport. A fixed `assets/bg.png` backdrop sits behind the transparent Phaser canvas. The HUD overlays the scene with player health, movement controls, angle and power sliders, cast, new-match, and optional browser fullscreen controls. Drag aiming and A/D movement still work.

## Asset map

| Files | Use |
| --- | --- |
| `assets/bg.png` | Fixed, cover-sized night background |
| `assets/soil.png` | Repeated soil material, clipped to terrain |
| `assets/grass.png` | Alpha-trimmed at load time, sampled into narrow strips along initial hills |
| `assets/c1.png`–`assets/c6.png` | Individual crystal decorations embedded in soil |
| `assets/p1.png`–`assets/p6.png` | Individual surface plant decorations |

The individual crystal and plant PNGs were already present on main and are reused directly. Group sheets remain source artwork and are not loaded by the game. `terrain.png` is obsolete and removed.

Decorations are deterministic for a terrain seed. Crystals share the terrain mask; plants disappear after losing support. Blasts erase grass permanently and expose bare soil. The game retains its existing heightmap crater model; it does not implement tunnels or overhangs.

`src/decorations.ts` controls decoration sizes and spacing. `src/config.ts` controls soil scale, world dimensions and procedural grass. `src/viewport.ts` controls proportional resizing. `src/style.css` controls the HUD and fixed background. The camera uses the current logical viewport width for overview and projectile tracking.

## Validation

- `npm run build`: passes.
- `node --experimental-strip-types --test src/presentation.test.mjs`: covers seeded placement, destruction support, and responsive camera bounds.
- The existing `game.test.mjs` cross-field test fails on the unchanged baseline: its fixed angle hits terrain instead of player 2. The gameplay physics and that test are unchanged by this presentation update.
- Browser visual validation could not run in the editing environment because Chromium's socket creation was denied. Check desktop, portrait, landscape, fullscreen, restart, and a complete shot/turn locally before merging.
