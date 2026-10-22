# Fire effects after the source reorganization

The live import chain is index.html → src/app/bootstrap.ts → src/app/main.ts → src/rendering/landscape-scene.ts. The approved flame projectile changes were in src/landscape-scene.ts, which this chain never imported. The active scene still loaded the old missile SVG and all PNG blast/burn/fade animations. It also invoked TerrainFire, so two fire effects played over the impact area.

Port the approved SVG loading, texture mapping, frame animation, leading-flame anchor, zoom compensation and dotted-trail suppression into the active rendering scene. Remove the old PNG loader/animations/impact sprite there. TerrainFire remains the single lingering ground-fire implementation with its existing restart/shutdown cleanup. Terrain geometry, collision and crater algorithms are unchanged; a separate terrain-overlap bug is not established by this audit.

The legacy root scene and bootstrap now forward to their canonical implementations instead of holding duplicate code. Restore TypeScript checking over all src files now that these compatibility entries no longer import removed modules. Update the active weapon metadata, label, icon and startup asset list to Fire Cluster and the approved flame artwork.

Move the burn tests into tests/ and update their terrain imports so the current npm test script actually runs them. New regression checks follow the HTML/app/scene chain, reject legacy fire asset wiring, and ensure compatibility entries do not contain a second scene.

Validation: TypeScript and all 47 tests pass against the reorganized source tree. Browser gameplay and full production bundling are unverified in this environment because Chromium and the repository's existing binary assets are unavailable. No claim is made about unpushed files on the user's laptop.
