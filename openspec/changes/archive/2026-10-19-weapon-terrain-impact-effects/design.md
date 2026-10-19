## Context

`LandscapeScene` owns the active spell, impact presentation, and terrain canvas. `resolveShot` currently carves a crater for every impact, while the scene redraws the terrain when its revision changes. The reference project contains four styles: 32-frame fire with lingering embers, growing ice shards with glints, bubbling poison sludge with fumes, and an electric sprite pulse with residual ground scorch. The game already has four spell slots and uses an authoritative heightmap.

## Goals / Non-Goals

**Goals:**
- Adapt each reference style to the current spells and render it at world impact coordinates.
- Retain a readable aftermath on the terrain presentation for destructive weapons.
- Make the poison/Acid Bomb impact damage players without altering terrain height, terrain revision, or ground decoration.

**Non-Goals:**
- Add new spell slots, status damage, terrain materials, or collision geometry.
- Change current spell radius, damage, turn phases, or player settling rules.
- Copy the sibling project's demo scenes, UI, or dependencies into the game.

## Decisions

- Keep spell-to-style mapping explicit at the scene boundary: Plasma Bolt uses electric, Acid Bomb uses poison, Gravity Orb uses fire, and Cryo Spike uses ice. This gives every existing slot a recognizable style without adding or renaming gameplay spells.
- Use the existing `Spell` identity and pass a terrain-destruction policy into shot resolution. Acid Bomb keeps its current player blast damage and radius but skips `carveCrater`; other spells retain current crater behavior. A data property on each spell is preferable to brittle name checks if a small `destroyTerrain` field can be added cleanly.
- Render lingering aftermath as transient scene objects in world space. Ground patches sample the authoritative post-impact heightmap across their footprint, and embedded sprites/shards re-anchor when later terrain revisions reshape the surface. Reuse the sibling sprite sheets for fire/electric where practical; use Phaser primitives/particles for poison bubbles and ice shards if no dedicated sheets exist. Effect completion destroys its objects; match restart and scene shutdown clean up outstanding effects.
- Keep crater scars in the existing terrain canvas and heightmap redraw path. Do not paint persistent poison marks onto the terrain canvas, so its non-destructive behavior remains unambiguous.
- Use reduced-motion settings to shorten or suppress repeated/looping components while preserving a brief impact cue.

## Risks / Trade-offs

- Reference sprite sheets may have transparent padding or a scale that obscures small impacts → inspect frame bounds and tune display size against the 960 × 540 camera viewport.
- Overlapping or camera-following animations can clutter the battlefield → constrain effect footprint and duration to the spell radius and clean up on restart.
- Skipping crater creation can alter settling and turn outcomes for Acid Bomb → retain player damage and impact phase, but only run settling based on the unchanged terrain as current phases permit.

## Migration Plan

No data migration is needed. Add spell impact policy and presentation, then verify each spell's visual and terrain outcome. Rollback consists of removing the presentation and policy changes; the heightmap remains the source of truth throughout.

## Open Questions

- Confirm exact frame sheet dimensions and licensing/asset ownership before copying assets from the sibling project into this repository.
