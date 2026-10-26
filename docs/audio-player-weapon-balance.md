# Playback level, player size and weapon balance

## Audio diagnosis and change

The previous mixer applied several independent cuts: a nonlinear slider curve, 0.65/0.7 channel multipliers, a 0.8 master multiplier, compression beginning at −18 dB and temporary music ducking. At the default 70% music setting, the gain before compression was roughly 0.32. Even at 100% it was only 0.56. Decoded effects above a peak of 0.9 were also rewritten, and recorded stereo effects were panned toward the shooter/impact.

Music and effects now use a linear 0–100% slider and a unity master. At 100%, there is no hidden gain reduction. Recorded sample data is not normalized or rewritten, original stereo balance is centered, music bypasses the effects limiter and automatic ducking is removed. Smooth slider ramps, track crossfades, mute, hidden-tab handling, fallback playback and bounded voices remain.

Effects use a narrow peak limiter at −1 dB instead of broad compression. A separate −0.1 dB mixed-output guard protects overlapping full-volume sources. These guards are for near-full-scale peaks; no resolution, bitrate or source-file conversion is added. Existing saved volumes are respected; set both sliders to 100% to compare with the original playback level. This cannot restore information missing from a low-quality source file.

## Larger players

Procedural in-game hull scale rises from 1.5 to 1.8 (20%). Collision dimensions rise from 84×44 to 100×52 so shots, spawn support and neighboring ships agree with the larger footprint. Hover clearance, cannon size, active marker and hover rings are adjusted. Terrain, movement fuel and aiming physics retain their existing rules. A small crater can leave a wide ship supported at the edges; the gravity regression fixture now creates a crater wide enough to remove the complete enlarged support.

## Starting weapon balance: 100 health

| Weapon | Previous damage budget | New maximum per shot | Radius | Intended role |
| --- | ---: | ---: | ---: | --- |
| Plasma Bolt | 55 | 24 total: 3 × 8 | 56 | Spread fire; all three hits required for full budget |
| Acid Bomb | 60 | 26 | 82 | Broad splash without terrain destruction |
| Gravity Orb / fire effect | 65 | 30 | 70 | Mid-size crater and cosmetic lingering burn |
| Cryo Spike | 70 | 32 | 48 | Smaller blast with higher precision reward |

Existing linear splash falloff applies from the nearest point on the collision body. Hits outside the radius do zero damage. These budgets imply 4–5 full-budget hits to defeat a full-health ship, with more needed for partial splash. Fire/acid visual effects do not add hidden damage over time. Knockback naturally decreases with the lower damage. The shared weaponBlast helper supplies the electric per-pellet budget to both live impacts and AI scoring, preventing disagreement between planning and execution. Weapon buttons show their maximum whole-shot damage on hover.

This is a playable starting balance, subject to match playtesting rather than a claim of final competitive tuning.

## Validation

TypeScript, bundling and all 54 tests pass. New/expanded tests cover unchanged decoded sample data, unity music/effect/master gains, removal of music ducking, original recorded stereo balance, whole-volley damage caps, splash falloff, larger collision dimensions and muzzle clearance. Existing AI, terrain, turn, fuel and menu tests pass.

Browser checks use real short SFX and gameplay assets; existing large music/loading artwork uses uncommitted local stand-ins because those files could not be materialized. Browser checks are not a listening assessment of the original music.

The live Chromium check measured 28 damage from a fire shot (under its 30 cap), compared the recorded shot buffer against a fresh decode of the original file with maximum sample difference 0, and confirmed master/music/effects gains all settled at 1.0 for 100% sliders. Setup, pause/resume, local/AI launch, 390px/844px/320px layouts and browser page-error checks passed.
