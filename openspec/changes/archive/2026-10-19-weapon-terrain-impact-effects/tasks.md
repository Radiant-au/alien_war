## 1. Spell impact policy

- [x] 1.1 Add an explicit terrain-destruction policy to each existing spell, with Acid Bomb set to non-destructive and the other spells retaining crater behavior.
- [x] 1.2 Update shot resolution so non-destructive impacts retain player damage and impact flow without changing terrain heights or revision.
- [ ] 1.3 Add focused tests for destructive crater outcomes and poison terrain preservation.

## 2. Weapon aftermath effects

- [x] 2.1 Inspect and integrate suitable fire and electric sprite-sheet assets from the sibling project, including license and frame dimensions. (No license file or attribution was present in the sibling README; sheets are 2048x1024 8x4 and 1024x1024 4x4.)
- [x] 2.2 Implement the four spell-specific impact and lingering effects in world coordinates, with finite lifetimes and cleanup on completion/restart.
- [x] 2.3 Respect reduced-motion settings and keep effect size/readability within each spell's blast footprint.
- [x] 2.4 Conform ground aftermath to the post-impact heightmap and re-anchor active effects after later terrain changes.
- [x] 2.5 Increase blast radii and effect size, extend and enlarge poison, and scale ice shards to overlap struck players.
- [x] 2.6 Animate HUD health decreases one point at a time while retaining immediate authoritative damage resolution.

## 3. Terrain integration and verification

- [x] 3.1 Keep destructive crater redraws and grass removal synchronized with the updated heightmap; ensure poison impacts do not redraw or remove terrain decoration.
- [x] 3.2 Verify each spell's effect, damage/radius preservation, terrain result, camera scrolling alignment, and restart cleanup.
- [x] 3.3 Run the focused game tests and production build; resolve regressions.
