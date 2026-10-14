# Crater Clash: local alien artillery

The default scene now uses the four code-drawn alien ship designs: cyan Scout, orange Hopper, violet Stinger and mint Orbit. A planet, moon, mountains, alien plants and stepped mesa/basin/ridge terrain follow the flat concept. All ship art is Phaser Graphics geometry; no raster assets or external image downloads are required. The repository remains named `wizard_war`.

## Local play

The upper-right selector starts a fresh local 2-, 3- or 4-player match; four players is the default. All controllers are human on the same device. The turn cycle visits each living player in order and skips eliminated players. One survivor wins; no survivors yields a draw. HUD cards match ship colors and show HP/turn ownership. The camera overview spans living ships.

A/D or arrow keys and hold-to-move buttons consume the active ship's movement allowance. The fuel meter directly below the movement buttons shows that allowance as a percentage; it drains only by actual distance travelled and refills when that player's next turn starts. A blocked move does not spend fuel. Ship movement is bounded by the world and the nearest living neighbor on either side.

Drag angle/power dials or focus their range inputs and use arrow keys. Aim left/right changes weapon facing, so middle players can target either side. Fire/Space launches the selected weapon; inputs are gated during flight, explosions, settling and turn transitions. New match resets HP, fuel, effects, terrain and motion state.

## Animation and collision

`ships.ts` draws four distinct silhouettes, cockpit aliens, engines and thumbnails. `ship-motion.ts` calculates a visual pose: subtle 1.8-unit hover, ground-slope tilt clamped to about 32 degrees, and phased expanding elliptical waves below the hull. Slope changes ease smoothly. Movement adds a small pulsing thruster. Hover, tilt and wave geometry never change player coordinates, fuel, collision or ballistic calculations. The barrel retains world-space aiming while the hull tilts. Reduced-motion mode uses a stable hover height and static waves, disables thruster pulsing, glow pulses and camera shake, and retains slope alignment.

The same heightmap drives terrain drawing, crater removal, shot collision and ship support. Spawn shelves are flattened and blended into adjacent ramps. The hull collider is resized for ships. Unsupported grass/plants/crystals disappear after impacts; surviving ships settle before the next turn. Eliminated ships are hidden and no longer absorb shots or block movement.

The four weapon profiles keep existing ballistic motion, distinct blast radius/damage, trails, particles, impact rings and subtle shake. Static soil is refreshed only when the terrain revision changes. Screen sizes use a compact responsive control bar; landscape orientation offers more room to see all ships.

## Validation

Run `npm ci`, `npm run dev`, `npm run build` and `npm test`. Tests cover 2/3/4-player turn cycles, skipped eliminations and victory, per-player fuel/refill/blocked movement, live-neighbor collisions, stable collision bodies under hover, terrain/craters, projectile blocking and camera bounds.
