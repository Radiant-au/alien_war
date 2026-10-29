# Support, lasting effects and longer battles

## Turn-based support unlock

Each player earns a support choice after every third valid firing action. A volley is one action, misses count, and blocked/invalid fire attempts do not count. The choice becomes usable on that player's next aiming turn. At most one unlock can be held; it does not accumulate multiple charges. Choosing either option consumes that unlock, without consuming movement or the firing action. It is optional: firing without choosing carries the single unlock forward.

- Heal restores up to 20 hull HP, capped at 100. A full-health ship cannot waste its unlock on healing. Green rings, rising crosses, floating actual healing amount and a refilling HUD show the result.
- Shield adds up to 20 shield points, capped at 20. A full shield cannot consume another unlock. A cyan bubble follows the hull's movement/tilt/facing, and a cyan strip plus remaining shield number overlays the HUD health bar. Direct damage, poison and burning drain shield before hull health; excess damage carries through exactly. Shield break expands/fades the bubble.
- Dead players cannot use support. Restart clears shield, counters, statuses and effect instances.
- AI uses the same unlock and support function: heal at 80 HP or below, otherwise shield.

## Battle length and status damage

Whole-shot budgets are now Plasma 36 (3×12), Cryo 30 (5×6), and Fire 30 impact (3×10) plus up to six 1-point burning ticks. Poison remains zero impact plus up to 18 gradual damage. Existing splash falloff and terrain radii remain. Reapplying burn refreshes the remaining budget rather than stacking a burn per projectile. Both statuses tick every 0.5 seconds of running simulation time, including aiming time, preserving existing poison timing. Pause stops ticks; game over stops damage. Ground flame/puddle effects remain cosmetic; statuses are applied through the weapon impact.

The original `public/assets/ice_missile_spritesheet.svg` is loaded again, rendered small in the five-projectile volley. Weapon icon JPEG pictures remain unchanged.

## Visuals and controls

The wheel protrudes halfway above the control bar. The Phaser viewport reserves a 104-pixel band above the bar, keeping all ships/terrain drawing out of the wheel and support-panel area; the previous oscillating ship-avoidance repositioning is removed. The compact support choice sits above the bar inside that reserved band.

Poison uses a 12-frame transparent canvas sprite with curved asymmetric liquid tongues and droplets. A terrain-following puddle and looping bubbles persist for the corresponding poison feedback duration. Attached drips continue on poisoned ships. Burning has attached flame tongues and orange −1 feedback, alongside the existing cosmetic ground flames. Shield and healing effects are procedural Phaser graphics. Pools, timers, sprites and support pulses clear on reset and shutdown and honor reduced motion.

## Validation

71 tests, TypeScript and production build pass. Added tests cover per-player three-shot counters, valid/invalid firing, support caps and single use, no revival, shield/status overflow, fire's shared burn budget (including staggered pellets) and expiry, reset, sprite frame baking, effect cleanup and attached support drawing. Existing AI, terrain, weapon budget and active import-path tests pass.

Visual browser validation remains outstanding because the cloud browser cannot reach the workspace server. Large original music/loading assets use local testing stand-ins only; no stand-ins or audio changes are included in this PR.
