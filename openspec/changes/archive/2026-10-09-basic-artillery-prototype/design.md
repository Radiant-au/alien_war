## Context

The workspace contains the stock Vite TypeScript demo: `src/main.ts`, `src/counter.ts`, demo assets, and `src/style.css`. `package.json` provides dev, build (`tsc && vite build`), and preview commands; Phaser and a test runner are absent. There are no existing OpenSpec capability specifications. Reuse this setup and the `#app` mount. The deliverable for this change is planning only; dependency installation and source changes belong to implementation.

## Goals / Non-Goals

**Goals:** A complete two-person browser match with deterministic terrain, pointer aiming, consistent preview and flight, reliable impacts/misses, craters, settling, health, and restart. Keep data and rules independently testable. Reach a playable alternating-shot checkpoint before adding destruction and match outcomes.

**Non-Goals:** React, backend, downloaded artwork, wizard art, character animations, multiple spells, movement, wind, AI, network play, accounts, inventory, audio, elaborate menus, deployment configuration, caves, overhangs, and fall damage.

## Decisions

### 1. Small browser-only architecture

Add Phaser as the only required runtime dependency. Use one scene for generated graphics and pointer input, plus a small HTML HUD for health, status, Fire, and Restart. Keep the existing Vite commands. Suggested modules are `terrain.ts` (generation, surface queries, craters, support), `projectile.ts` (launch, fixed steps, sweep), `match.ts` (state and resolution), and one Phaser scene. Share constants and plain TypeScript types only as needed. Phaser physics engines are unnecessary: custom heightmap collision and a single projectile need only a few pure functions. A generic entity framework or event bus would add no value here.

### 2. Logical world and deterministic surface

Assume a fixed 960 × 540 logical battlefield, positive Y downward, with a separate HUD. Fit and center the entire canvas within the remaining viewport, retaining its aspect ratio. Convert pointer input through the actual canvas/Phaser coordinate transform; never mix CSS pixels with world coordinates. Resize changes presentation, not terrain or physics.

Represent terrain with one surface height per logical X pixel and linear interpolation between samples. Solid ground extends from the surface to the bottom. Use a small fixed-seed PRNG with smoothly interpolated hill control points, constrained to leave sky and ground depth. Put player centers near 15% and 85% of world width; flatten a short initial pad under each rectangle. Keep X fixed throughout the match. Alternatives such as bitmap terrain or polygon rigid bodies are unnecessary and introduce unsupported caves or more collision complexity.

For an upright rectangle of half-width `w`, support height is the minimum surface Y across its footprint, including interpolated edges; set its bottom to that height. This prevents penetration even on crater lips. A rectangle can bridge a narrow crater; that is intentional in this minimal model. After carving, move unsupported rectangles vertically downward at a bounded speed, clamp exactly to support, and signal completion when both are supported. Do not rotate, slide, or damage players from falling.

### 3. Retained directional drag and shared launch calculation

Provide a visible aiming handle at the active player's upper center. One pointer owns a drag; ignore additional pointers. The vector from handle to pointer gives firing direction directly, including leftward shots; its length maps linearly to bounded power. A small dead zone retains the last valid aim. Permit all directions; a downward shot can immediately hit terrain. Default each player's aim diagonally upward toward the opponent with medium power. Release retains the latest valid aim without firing. Pointer cancellation ends ownership without firing or leaving input stuck. Fire is disabled during an active drag and outside Aiming.

Provisional tuning: maximum drag 140 world units, speed range 120–650 world units/second, gravity 300 world units/second². Values live together and can be tuned for reachability without changing the architecture. Compute the muzzle by intersecting the aim ray with the shooter rectangle and offsetting beyond it by projectile radius plus a small clearance. Include this same origin in the preview and real shot. Do not grant permanent shooter immunity: a returning projectile can hit the shooter. If the muzzle overlaps terrain, resolve an immediate terrain impact rather than moving the shot through ground.

Generate a short dotted preview by running the same launch and stepping functions on a copy of state, sampling the first roughly 0.75 seconds and stopping at first collision or horizontal exit. Preview never mutates the match. This avoids a separate analytic curve drifting from numerical flight.

### 4. Fixed simulation and first-impact collision

Use an accumulator with a 1/120-second step. Advance position using constant-acceleration integration (`p += v*dt + 0.5*g*dt²`, `v += g*dt`), with gravity on Y only. Bound catch-up work per render frame, discard excess backlog after long pauses, and advance flight age only on processed simulation steps. This avoids a long background-tab pause causing a burst of work; the maximum flight time is simulation time.

Treat the projectile as a small circle. Sweep from old to new position, checking the swept circle against both player rectangles and each crossed piecewise-linear terrain surface segment, including solid-ground overlap. Select the earliest contact, not simply the first object in an array. Collision checks must cover the movement segment and radius, not just endpoint samples. The fixed step bounds curvature error while the sweep prevents tunneling through narrow terrain and bodies.

Horizontal center exit (`x < 0` or `x > width`) or 12 seconds of simulated flight resolves a miss. Compare exit time with candidate impact time within the step so the earlier event wins; check impacts up to the lifetime limit before timing out. Negative Y is valid and never alone terminates a shot. Solid terrain reaches the bottom, so downward in-world shots collide before leaving below. A terminal event consumes the projectile once. Use a discriminated impact/miss result so both paths enter the same resolution sequence.

### 5. Craters and explosion damage

At an impact center `(cx, cy)`, use one explosion radius, initially 48 world units, for visuals, carving, and damage. For samples within the radius, set `height[x] = max(oldHeight[x], cy + sqrt(radius² - (x-cx)²))`, capped at a floor slightly above the bottom. This removes terrain into a bowl and never adds ground; it cannot represent caves. Draw the updated terrain once per impact and show a simple circle for about 200 ms. Player impacts also explode and carve terrain where the radius reaches ground. Misses have no explosion, crater, or damage.

Calculate damage once for both players using their pre-settling rectangles: shortest distance `d` from blast center to body, `round(60 * max(0, 1-d/radius))`, clamp health to 0–100. This supports self-damage and simultaneous defeat. Resolve all damage before deciding a winner. Alternatives such as direct-hit bonuses, fall damage, and multiple blast types are out of scope.

### 6. One explicit turn owner

Use `Aiming → ProjectileFlying → ImpactResolution → PlayersSettling → WinnerCheck → NextTurn → Aiming`, with `WinnerCheck → GameOver` for a winner or draw. Player 1 starts. Fire atomically leaves Aiming and creates exactly one projectile before any further input can be accepted. Only the controller advances states; rendering reads state. ImpactResolution applies the terminal result exactly once and waits for the explosion indicator to finish. Miss resolution immediately completes this phase. PlayersSettling completes when both players have support. WinnerCheck evaluates both health values; NextTurn toggles the active player exactly once.

The first playable checkpoint uses these same phases with impact effects, settling, and winner check as immediate no-ops. Later tasks fill them in. Keep effect durations and settling progress in the update-driven state rather than asynchronous callbacks to simplify restart. Restart is allowed in every state and reconstructs initial terrain, players, health, default aims, active player, accumulator, effect timers, projectile, pointer ownership, and outcome. Register controls once so restarting cannot multiply listeners.

## Risks / Trade-offs

- [Terrain tunneling or contacts disagreeing with the visible surface] → Use the same interpolated heightmap for drawing/support/collision, sweep the projectile radius across every crossed segment, and test steep lips and high-speed shots.
- [Duplicate impacts, repeated Fire, or misses leaving turns stuck] → Accept Fire only in Aiming, consume each terminal event once, and run impacts and misses through the same finite-state sequence with bounded effects and settling.
- [Preview disagrees with flight or immediately hits shooter] → Share launch origin, gravity, timestep, and collision functions; verify left/right launches and returning self-hits.
- [Players float on narrow crater edges] → Explicit footprint support permits bridging; test a crater wider than the body to verify actual settling. Rotation and collapse are excluded.
- [Small portrait canvas makes aiming difficult] → Preserve the whole world, keep HTML buttons usable, use a generous handle hit area, and verify touch input after resizing; no camera scrolling is added.
- [Initial constants produce unreachable opponents or tedious matches] → Tune seed, hill amplitude, power, and damage during two-person acceptance play without adding mechanics.
- [Restart during flight or impact leaks old state] → Rebuild match data, clear all transient input/timers, and test restart in each resolution phase.

## Migration Plan

No data or service migration is needed. During implementation, replace the demo entry and styles, add Phaser and the small modules, and retain existing Vite commands. Land the first playable checkpoint before destruction and match rules. Validate with focused pure-logic tests, the production build, and actual browser mouse/touch play. Rollback consists of reverting implementation files and dependency changes; no deployment work is included.

## Open Questions

None blocking. Logical dimensions, fixed seed, physics values, explosion duration/radius, and damage values above are explicit initial assumptions to tune through acceptance play. No additional user choice is required to implement this scope.
