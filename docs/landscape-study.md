# Flat moonlit battlefield

The landscape study is now a playable two-player artillery scene. Flat code-drawn art keeps the terrain, wizards and night background consistent without raster downloads. `background.ts` builds a static sky, moon, stars, mountain and forest SVG layer independent of the battlefield camera.

`landscape-scene.ts` connects the existing fixed-step match, movement and projectile modules to a 2400-unit battlefield. Broad hills and a central ridge can block low shots. The same heightmap drives collision and the canvas terrain texture. Craters expose bare soil, remove unsupported plants and crystals, and let players fall before the next turn. Static terrain is redrawn only on revision changes. Both wizards stay visible while aiming; the camera can pan for a projectile and returns for the next turn.

Wizards are drawn with hats, faces, shaded robes, staffs, feet, a distance-driven walk cycle and a gentle idle animation. The cyan/amber logo and health cards show turn ownership, HP and remaining movement. The compact full-width bar contains four spell cards, circular pointer/keyboard aim controls, hold-to-move buttons and Fire. Desktop movement uses A/D or arrows, and Space casts when focus is outside form controls. A focused range retains native arrow-key behavior. New match resets the battle, terrain and transient effects.

`spells.ts` defines colors, blast radii and maximum damage. Magic Bolt, Fireball, Arcane Orb and Ice Spike share ballistic motion but have distinct impact colors, particle shapes and blast sizes. Impact adds a short subtle shake; reduced-motion mode disables shake, glow pulses and character bobbing. Cosmetic particles do not affect collision or turns.

Run `npm ci`, `npm run dev`, `npm run build`, and `npm test`. The tests cover terrain blocking, per-spell crater/damage behavior, settling, turn gating, movement, projectile collision, camera bounds, restart and winner resolution. The old range test now checks an unobstructed field rather than requiring a hard-coded angle to hit through generated terrain.
