# Lingering terrain fire

Fire weapon impacts now use a brief procedural upward fire bloom, warm flash and amber ring, then leave a cluster of small flames across the newly carved surface. The old fire explosion PNG is no longer loaded or animated. The 32-frame flame texture is generated once with layered Canvas gradients and independently moving tongues; no new image downloads or asset pipeline steps are needed. Cream cores, amber/orange edges, warm halos, ember cracks, drifting ember dots and blue-gray smoke complement the teal terrain. Subtle independent swaying and changing tongue heights give the flames a more natural appearance while retaining the simple game style.

Flames burn for seven seconds, shrinking during the final two seconds. The dark scorch strip lasts 22 seconds and fades over its final six seconds. These are cosmetic timers; damage, turn progression, and movement are unchanged. Existing ship-hit fire remains separate.

Each patch captures the exposed terrain contour after crater creation. A later explosion extinguishes flame samples and removes scorch segments whose supporting soil was removed; old fuel does not drop down onto newly exposed ground. The renderer retains at most six patches and nine flames per patch. Restart and scene shutdown release all effect objects. Reduced-motion mode uses a fixed flame frame and suppresses drifting particles and flicker.

## Validation

- TypeScript: `npx tsc --noEmit` passes.
- `npm test`: all 45 tests pass. New coverage checks crater/edge placement, destroyed fuel, timers, bounded repeated impacts, expiry, restart cleanup and shutdown cleanup. Renderer lifecycle coverage uses lightweight scene doubles; it is not a browser visual test.
- Full production bundling could not complete in the editing environment because existing PNG/audio files could not be retrieved through the GitHub connector. The changed TypeScript checks successfully.
- Browser verification is pending: Chromium was absent and its download returned a truncated archive.

Before merging, run `npm ci`, `npm run build` and `npm run dev` from a complete checkout. Fire beside a ship and onto a slope; confirm small flames follow the crater, fire fades to scorch, and a second impact removes unsupported fire. Check mobile/reduced-motion settings and restart during burning.
