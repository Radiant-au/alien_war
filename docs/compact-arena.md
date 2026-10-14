# Colorful compact arena

The terrain now uses a teal-to-blue-to-indigo soil gradient, clipped depth bands, seeded angular rock facets and fourteen cyan/purple crystal clusters. A mint rim follows the original supported surface; destroyed grass stays removed. Facets, stones and crystals use the existing terrain mask, so explosions carve through the visuals and collision data together. The camera places the ground lower, leaving more sky above the four ships.

The top HUD uses slim player-colored health pills with P1–P4 and live health values. The bottom bar stays in one compact row, including on a 320px screen: movement, fuel, four weapons and Fire. The Angle and Power dials are removed.

## Aiming

- Drag on the battlefield from your ship toward the direction you want to shoot. Distance from the ship sets shot strength, bounded to 15–100%.
- Release to keep the aim; press Fire or Space to shoot. Releasing does not auto-fire.
- Aim in either direction. The short preview has at most nine fading, small dots and uses the same projectile simulation as the real shot.
- Movement pauses during an aim drag. Pointer cancellation or losing focus clears the drag and unlocks Fire.
- For keyboard aiming, focus Drag to Aim: Up/Down changes elevation, Left/Right changes strength, X reverses direction. A/D moves when focus is on the battlefield. Movement buttons and the fuel bar remain available for touch.

No new raster assets are needed by the game. Terrain and effects remain procedural Phaser/canvas drawings.

## Validation

Production build and 29 unit tests pass. Chromium checks cover mouse aiming in both directions, keyboard aiming without accidental movement, real touch drag/cancel, fuel drain, firing, craters, next turns, 2/3/4-player matches and layouts at 1672×940, 1280×720, 844×390, 390×844 and 320×640. Desktop and small-screen screenshots were visually inspected.

## Image concept

A preview mockup was made with the built-in image generator using the user's selected Crater Clash image. Prompt: preserve the four colored alien ships, moonlit planetary sky, mountains and logo; make the ground colorful teal/blue/indigo with angular facets, mint grass and cyan/purple crystals; lower the terrain and make the HUD slimmer; replace the dials with compact movement/fuel, weapon squares, Drag to Aim and Fire; add a short dotted aiming arc. The mockup is an art-direction preview rather than a runtime asset.
