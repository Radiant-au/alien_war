## 1. First playable checkpoint: terrain, aiming, shooting, and alternating turns

- [x] 1.1 Add Phaser to the existing Vite/TypeScript project, replace the demo entry and styling with one generated-shape scene and a minimal turn/Fire HUD, and retain the existing dev/build/preview commands without React or backend code.
- [x] 1.2 Create rendering-independent terrain data with fixed-seed hills, interpolated surface queries, initial stable pads, and two stationary colored rectangular players near opposite sides; verify repeated initialization matches.
- [x] 1.3 Fit the full logical battlefield into the available viewport and map pointer coordinates correctly through canvas scale and margins; verify mouse and touch after resizing.
- [x] 1.4 Add active-player directional drag aiming, bounded distance-to-power mapping, default aims, single-pointer ownership, dead-zone handling, cancellation, and retained aim on release; keep Fire separate and blocked during dragging.
- [x] 1.5 Implement the pure shared launch and fixed-step projectile functions, shooter-clear muzzle placement, gravity, accumulator limits, and the short dotted preview using copied simulation state.
- [x] 1.6 Implement swept radius-aware first-contact checks against terrain and both bodies, including initial terrain overlap, returning self-hits, horizontal exits, above-screen return, and maximum simulated flight time; emit one impact or miss per shot.
- [x] 1.7 Implement Player 1 start and the explicit turn controller with atomic Fire acceptance, input locking, and one turn switch per resolved shot; initially make impact effects, settling, and winner checking immediate no-ops while preserving their states.
- [x] 1.8 Verify this checkpoint in the browser: both players aim and fire repeatedly with mouse/touch, direction and power change flight, preview matches launch, rapid Fire cannot duplicate shots, and impacts, horizontal misses, and a forced timeout all hand off control. Run the existing production build.

## 2. Destruction and settling

- [x] 2.1 Implement bowl-shaped heightmap carving with bounded samples and a bottom support floor; draw updated ground and a short explosion circle for both terrain and player impacts, with no effects on misses.
- [x] 2.2 Implement footprint-based support and bounded vertical settling with fixed player X positions, exact support clamping, and no fall damage; cover complete support loss and a remaining crater rim.
- [x] 2.3 Connect explosion duration and settling completion to the existing controller so Winner check and Next turn cannot run early; confirm repeated and edge impacts finish without stuck turns.

## 3. Health, outcomes, and restart

- [x] 3.1 Initialize both players to 100 health, apply radial damage once to both pre-settling bodies including the shooter, clamp health, and show current health and resolution status in the HUD.
- [x] 3.2 Implement post-settling winner checking, survivor announcement, simultaneous-defeat draw, and terminal input locking; use controlled state fixtures to verify the draw even if normal fixed positions make it rare or unreachable.
- [x] 3.3 Add Restart in every state to recreate seeded terrain, initial positions, health, default aims, Player 1 Aiming, and clean transient state; clear projectiles, effect timers, accumulator, pointer ownership, and outcomes without duplicating listeners.

## 4. Focused verification and complete-match acceptance

- [x] 4.1 Add a minimal test command for the pure TypeScript logic using existing tooling where practical; cover deterministic terrain, monotonic bounded craters, footprint support, launch clearance, preview/flight agreement, swept fast contacts, earliest-event selection, above-screen return, and timeout resolution.
- [x] 4.2 Add controller regression cases for rapid Fire, exactly-once impact damage and turn advancement, input locks through settling, damage falloff/self-damage, winner/draw, and restart during flight, impact, settling, and after game over.
- [x] 4.3 Run the focused tests and `npm run build`; resolve failures without expanding scope.
- [x] 4.4 Complete a two-person match on one device, verify both firing directions and visible power differences, visible craters and player settling, defeated-player lockout, and clean repeated restart. Check mouse plus real touch where available, portrait/landscape resizing, and pointer cancellation; record any unverified device checks separately from automated results.

Acceptance note: The full match, mouse drag, emulated touch drag/cancel, and portrait/landscape scaling were checked in headless Chrome; pure-logic tests cover timeout and repeated crater edges. No physical mobile device was available for hardware touch verification.
