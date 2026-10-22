# Lingering terrain fire

Fire weapon impacts keep the existing short explosion, then leave a cluster of small cartoon flames across the newly carved surface. The twelve-frame flame texture is generated once with Canvas curves; no new image downloads or asset pipeline steps are needed. Warm halos, ember cracks, drifting ember dots, and translucent smoke complement the teal terrain.

Flames burn for seven seconds, shrinking during the final two seconds. The dark scorch strip lasts 22 seconds and fades over its final six seconds. These are cosmetic timers; damage, turn progression, and movement are unchanged. Existing ship-hit fire remains separate.

Each patch captures the exposed terrain contour after crater creation. A later explosion extinguishes flame samples and removes scorch segments whose supporting soil was removed; old fuel does not drop down onto newly exposed ground. The renderer retains at most six patches and nine flames per patch. Restart and scene shutdown release all effect objects. Reduced-motion mode uses a fixed flame frame and suppresses drifting particles and flicker.

## Validation

- TypeScript: `npx tsc --noEmit` passes.
- `npm test`: all 45 tests pass. New coverage checks crater/edge placement, destroyed fuel, timers, bounded repeated impacts, expiry, restart cleanup and shutdown cleanup. Renderer lifecycle coverage uses lightweight scene doubles; it is not a browser visual test.
- Full production bundling could not complete in the editing environment because existing PNG/audio files could not be retrieved through the GitHub connector. The changed TypeScript checks successfully.
- Browser verification is pending: Chromium was absent and its download returned a truncated archive.

Before merging, run `npm ci`, `npm run build` and `npm run dev` from a complete checkout. Fire beside a ship and onto a slope; confirm small flames follow the crater, fire fades to scorch, and a second impact removes unsupported fire. Check mobile/reduced-motion settings and restart during burning.
