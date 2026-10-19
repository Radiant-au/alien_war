# Ship feedback and sky ambience

Projectile launch plays the existing `assets/Sfx/shoot.mp3` once after a successful fire action. An electric terrain impact plays `assets/Sfx/electric.ogg` when the ground pulse animation starts. Electric direct ship hits and misses do not trigger this ground-impact cue. Both files are preloaded by the opening loader and use a small reusable voice pool, the saved SFX level, the sound switch and page visibility. Changing audio scenes stops existing voices.

Firing applies a small power-scaled, damped backward impulse and rotation to the hull and barrel drawing for 0.65 seconds. Logical positions, movement fuel, terrain support and the projectile's launch calculations remain unchanged. Restart clears impulses; reduced motion disables recoil.

Each background has two short meteor passes with randomized positions, long 40–70 second cycles and staggered delays. The moon halo gently expands and dims over nine seconds; a faint planet halo follows a slower cycle. These effects use CSS/SVG, add no downloaded art, and are disabled under reduced motion. SVG definition IDs are scoped per background so the menu and battlefield skies can coexist.
