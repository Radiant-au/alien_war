## 1. Expand world coordinates and terrain

- [x] 1.1 Add shared configurable world/view dimensions and movement, camera, and launch settings; keep the Phaser view at 960 × 540 and expand world bounds and heightmap samples to 2880 × 540.
- [x] 1.2 Extend fixed-seed terrain continuously across the full world, create stable pads and players at the configured 20%/80% positions, and test terrain continuity, repeatable positions, and camera-center feasibility.
- [x] 1.3 Separate Phaser camera bounds from the visible viewport, clamp horizontal scroll, keep vertical scroll fixed, and keep health, turn, Fire, Restart, and movement allowance in screen-fixed HUD elements.

## 2. Camera follow, transitions, and long-range aiming

- [x] 2.1 Add bounded configurable camera easing: initially center Player 1, follow the active player during Movement/Aiming, follow the projectile during flight, and hold the impact view during the effect and settling phases.
- [x] 2.2 Add the serialized camera-transition and next-player-ready phases; lock all controls until the transition completes, clear pointer drag ownership at shot and transition boundaries, and keep manual pan/zoom disabled.
- [x] 2.3 Increase configurable maximum launch power enough for a shot to reach across the seeded 1728-unit starting separation; test real simulated reach over terrain and preserve shared launch/preview physics.
- [x] 2.4 Convert pointer screen coordinates through the active camera, anchor the handle/muzzle/trajectory to the current world position, and display a fixed-screen projectile direction indicator whenever the projectile is above the camera view.

## 3. Movement allowance and controls

- [x] 3.1 Extend player and match state with grounded status, vertical velocity, per-turn allowance, and movement intent; initialize and reset the configurable 120-unit allowance only when a player becomes ready.
- [x] 3.2 Add active-player A/D and arrow-key movement plus on-screen press-and-hold left/right controls; release controls on pointer up/cancel, focus loss, firing, restart, and turn change.
- [x] 3.3 Show remaining allowance in the fixed HUD and charge only actual horizontal displacement; support movement and aiming in either order and end movement immediately on Fire.
- [x] 3.4 Block inactive movement, world-edge escape, and player overlap; ensure blocked movement spends no allowance and movement during a fall charges only its actual horizontal displacement.

## 4. Terrain traversal, gravity, and turn resolution

- [x] 4.1 Implement short fixed-world horizontal substeps against the shared heightmap support query; follow gentle slopes and block upward steps exceeding the configurable climb limit.
- [x] 4.2 Apply gravity when movement leaves support or destruction removes it, prevent Fire while the active player is airborne, and land by clamping the full footprint to support and clearing vertical velocity without charging fall distance.
- [x] 4.3 Integrate movement/aiming, projectile flight, impact, settling, winner check, camera transition, and next-player readiness; preserve exactly-once damage and make misses/timeouts follow the same settling and transition path.
- [x] 4.4 Recompute muzzle and preview from each player's latest world position and ensure scrolling never changes the selected world-space aim.

## 5. Restart and verification

- [x] 5.1 Reset fixed-seed expanded terrain, both player positions/health/aims/ground state, full movement allowances, Player 1 ownership, projectile/effect state, pointer and key input, accumulator, and camera to its initial transition without duplicating listeners or leaving stale tweens.
- [x] 5.2 Add focused logic checks for movement allowance measurement, blocked/climb movement, world bounds and player separation, gravity/landing, terrain-destruction falls, long-range reachability, camera clamping/transition gates, and restart from flight/settling/transition/game over.
- [ ] 5.3 Run the focused tests and production build; exercise the full browser match with keyboard, mouse, and touch controls, resize and scroll aiming, misses/timeouts, falls/craters, terminal outcomes, and restart. Record any physical-device checks that cannot be performed separately.

Verification note: focused tests, production build, and a headless page-load smoke check pass. Interactive keyboard/mouse/touch match coverage and physical-device checks remain open; the available browser connector requires a headful X server.
