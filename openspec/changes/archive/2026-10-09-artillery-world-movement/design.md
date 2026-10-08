## Context

The completed prototype uses a 960 × 540 Phaser canvas as both logical world and visible view. `terrain.ts` generates 961 height samples and places stationary players at 15% and 85%; `projectile.ts` uses 300 units/s² gravity and a 650 units/s maximum; `match.ts` owns fixed-shot turn phases; `main.ts` renders the whole world and maps Phaser pointer world coordinates. The extension must add scrolling and movement without breaking terrain collision, launch preview, health, or restart. No backend or additional dependency is needed.

## Goals / Non-Goals

**Goals:** Expand the continuous terrain to roughly three view widths; add world-space movement and long-range shots; follow active players/projectiles with a bounded camera; add grounded movement, per-turn allowance, and fall/landing; preserve accurate aim and previews through scrolling; gate each new turn on impact, settling, and camera transition; keep the HUD screen-fixed and restart deterministic.

**Non-Goals:** Manual camera control, jumping, flight, player rotation, movement while inactive or after firing, network play, new art, new weapons, and a physics-engine migration.

## Decisions

### 1. Keep view and world dimensions separate

Keep the Phaser camera viewport at 960 × 540 logical pixels and retain the existing aspect-ratio scale behavior. Set the continuous terrain and world bounds to 2880 × 540, with 2881 surface samples. All terrain, actors, aiming, and projectile coordinates remain world-space values; only camera scroll maps them to the screen. Keep HTML HUD elements outside the camera canvas so health, turn, movement allowance, and controls stay fixed.

Generate hills continuously over the full 2880 units from the existing fixed-seed interpolation pattern, with a consistent maximum surface range that leaves overhead projectile space. Place starting player centers at x=576 and x=2304 (20% and 80% of the field), flatten small starting pads, and preserve their separation after restart. These positions are at least half a viewport from either world edge, so each can be centered exactly while respecting camera bounds. The camera scroll range is 0–1920.

### 2. Long-range launch tuning

Move world dimensions, movement settings, camera timing, and projectile limits into a small shared configuration module. Start with movement speed 240 world units/s, allowance 120 horizontal world units per turn, climb limit 12 vertical units per 2-unit movement substep, camera transition 350 ms, gravity 300 units/s², and configurable maximum launch speed 950 units/s. At equal launch and landing heights, the ideal range at 950 and gravity 300 is about 3008 world units, above the 1728-unit start separation; terrain, muzzle height, and firing angle reduce this range, so acceptance play must verify maximum-power reach over the generated hills. Keep the preview and projectile creation on the same speed mapping.

### 3. Grounded movement as explicit actor state

Extend each player with `grounded` and vertical velocity. Process horizontal motion in short fixed-world substeps so slope changes and ledges cannot be skipped. Query the same heightmap used for drawing and projectile collision under the player's full footprint. Follow terrain when the required upward step is at most the configurable climb limit; block a larger upward step. A sufficiently large downward support change is a walk-off: accept the horizontal movement, mark the player airborne, and apply gravity until the footprint reaches support. Horizontal input while airborne remains bounded by the remaining allowance; only actual X displacement consumes allowance. Gravity or settling after destruction never consumes it.

Clamp player centers so their rectangle remains inside world bounds and preserve a small horizontal gap between the two rectangles. If a player is already falling, keep applying gravity and prevent firing until landing. After cratering, compare each player's bottom with new footprint support; unsupported players enter the same falling path. Landing clamps the bottom to support, zeros vertical velocity, and marks the player grounded. A miss still enters settling, which completes immediately if both players remain grounded.

### 4. Movement and aim share one pre-fire phase

Use `MovementAiming` for a player's entire pre-fire opportunity. Keyboard A/D and arrow keys plus on-screen press-and-hold buttons set horizontal movement intent. Only the active living player may move or aim. Remaining allowance decreases by measured absolute horizontal displacement, not by elapsed key time; terrain-blocked motion spends none. Reset the allowance only when that player becomes ready on their next turn. Movement and retained drag aim can occur in either order. Firing atomically closes movement, clears pointer ownership, and enters ProjectileFlight. Update the muzzle and trajectory from the player's current world position after every movement step.

Use `camera.getWorldPoint(pointer.x, pointer.y)` or the equivalent active-camera transform for pointer input. Phaser camera `worldX/worldY` may also be used if tied to the active camera; never use screen coordinates directly as world aim coordinates. Draw the aim handle, dotted trajectory, projectile, terrain, and actors in world space, so ordinary camera scrolling preserves alignment.

### 5. Bounded camera modes and serialized turn transitions

Represent camera behavior with explicit modes: initial transition to Player 1, follow active player during MovementAiming, follow the projectile during ProjectileFlight, hold the impact view during Impact and Settling, and transition to the next player after WinnerCheck. Use a simple configurable horizontal lerp/ease over 350 ms and clamp scroll to [0, 1920]. The world height equals the viewport height, so vertical scroll remains zero; the camera cannot follow a high arc above the field.

While a projectile lies above the camera view, keep the camera clamped and show a small fixed-screen edge arrow at the projected horizontal position indicating whether the projectile is above and its current travel direction. When an impact occurs, hold the view on the impact center while its brief visual and settling resolve. Then check for a winner. If the match continues, clear any drag, begin the camera transition to the other player, and leave movement, aiming, and Fire disabled until the transition completes. Only then switch active player, refill that player's allowance, and enter MovementAiming. Miss and timeout use this same settling/check/transition path. On game over, retain the impact view and do not enable another turn. Disable wheel, pinch, drag-pan, and other manual camera inputs.

### 6. Restart reconstructs world and camera state

Keep controls registered once per scene. Restart recreates the fixed-seed 2880-unit terrain and starting pads, both players at their configured world positions, 100 health, full movement allowance, default aim, Player 1 as active, and no shot, explosion, pointer owner, fall velocity, or outcome. Reset accumulator and camera transition state, then perform the initial Player 1 camera transition before enabling controls. This ensures no previous tween or projectile can mutate a restarted match.

## Risks / Trade-offs

- [Maximum-power shots still fall short over generated hills] → Calculate ideal range from configured speed and gravity, then test actual shot paths across the seeded field; adjust the maximum speed or elevation/power mapping before changing gravity.
- [Movement crosses a ledge or steep terrain in one frame] → Limit horizontal movement to short fixed-world substeps and use footprint support from the same heightmap as rendering.
- [Players overlap or clip the world edge after movement or settling] → Clamp actor bounds and apply a horizontal separation constraint in the shared movement/landing update.
- [Camera and input coordinates diverge while scrolling] → Use the active Phaser camera's world transform for pointer input and keep every rendered game object in world coordinates.
- [A new turn becomes active before the camera arrives or a fall ends] → Keep `CameraTransition` and `Settling` as explicit locked states; allow `MovementAiming` only after both transition and landing conditions finish.
- [Projectile leaves the viewport above the terrain] → Keep vertical camera scroll clamped and draw a fixed-screen direction indicator while the projectile is outside the view.
- [Restart leaves an old camera tween or pointer drag active] → Cancel camera motion, clear input ownership, recreate match state, and test restart from flight, settling, transition, and game over.

## Migration Plan

No persistent data or service migration is required. Extend the current terrain, projectile, match, and scene modules; keep Phaser and Vite. Implement world and camera coordinates first, then movement and grounded physics, then serialized camera/turn flow and fixed HUD controls. Verify logic tests, production build, and browser play including both firing directions, a full match, misses/timeouts, resize, and restart. Rollback consists of reverting this follow-on implementation; the completed short-field prototype remains the baseline.

## Open Questions

None block planning. The world positions and tuning values above are starting assumptions; launch reach, hill difficulty, and camera transition feel must be confirmed during acceptance play. Physical touch hardware verification depends on device availability.
