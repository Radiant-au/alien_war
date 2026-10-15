# Colorful compact arena

The terrain now uses a teal-to-blue-to-indigo soil gradient, clipped depth bands, seeded angular rock facets and fourteen cyan/purple crystal clusters. A mint rim follows the original supported surface; destroyed grass stays removed. Facets, stones and crystals use the existing terrain mask, so explosions carve through the visuals and collision data together. The camera places the ground lower, leaving more sky above the four ships. The world is now 3,360 units wide (40% wider than the earlier 2,400-unit arena). Three intervening ridges block straight sightlines between neighboring spawns, while arcing shots can still reach opponents.

The top HUD uses slim player-colored health pills with P1–P4 and live health values. The bottom bar stays in one slim row, including on a 320px screen: four centered weapons and Fire at the right. The larger circular aim wheel floats over the lower-left foreground, separated from the toolbar. Movement buttons and their fuel bar float over the lower-right foreground. Controls respect safe-area margins and follow the actual toolbar height on resize. The wheel is 132px on large desktops, 120px on smaller desktops, 104px on phones, and 96px on narrow or short landscape screens. The Angle and Power dials are removed.

## Aiming

- Drag the circular wheel at the lower-left of the battlefield. Direction from its center sets the firing angle and facing; dragging farther increases strength, bounded to 15–100%. Full power is reached at the edge of the wheel, so both left- and right-facing full-strength shots can be set without dragging offscreen. Dragging may continue beyond the wheel because it captures the pointer.
- A center tap reveals the current values without changing them. The two small Power and Angle panels appear above the active ship, stay visible while dragging, hold for 1.2 seconds after release, then fade over 0.5 seconds. The saved aim remains unchanged.
- Release to keep the aim; press Fire or Space to shoot. Releasing does not auto-fire.
- Aim in either direction. The short preview has at most nine fading, small dots and uses the same projectile simulation as the real shot.
- Movement pauses during an aim drag. Pointer cancellation or losing focus clears the drag and unlocks Fire.
- For keyboard aiming, focus the aim wheel: Up/Down changes elevation, Left/Right changes strength, X reverses direction. A/D moves when focus is on the battlefield. Movement buttons and the fuel bar remain available for touch on the lower-right.

No new raster assets are needed by the game. Terrain and effects remain procedural Phaser/canvas drawings.

## Validation

Production build and 32 unit tests pass. Chromium checks cover mouse aiming in both directions, keyboard aiming without accidental movement, wheel power/direction, center-tap stability, idle fade without changing aim, real touch drag/cancel, fuel drain, firing, craters, next turns, 2/3/4-player matches and layouts at 1672×940, 1280×720, 844×390, 390×844 and 320×640. Desktop and small-screen screenshots were visually inspected, including the approved separated layout, larger wheel, centered weapons and thin toolbar. New regression tests cover the idle fade, all neighboring sightlines, and arcing shots over the new ridges.

## Image concept

A preview mockup was made with the built-in image generator using the user's selected Crater Clash image. Prompt: preserve the four colored alien ships, moonlit planetary sky, mountains and logo; make the ground colorful teal/blue/indigo with angular facets, mint grass and cyan/purple crystals; lower the terrain and make the HUD slimmer; replace the dials with compact movement/fuel, weapon squares, Drag to Aim and Fire; add a short dotted aiming arc. The mockup is an art-direction preview rather than a runtime asset.
