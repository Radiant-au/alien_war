## 1. Seeded terrain visuals

- [x] 1.1 Add configurable soil scale, grass thickness/colors/density, and seeded texture-offset/initial-surface data to terrain creation.
- [x] 1.2 Load the existing soil asset and render it as a world-anchored repeated texture clipped to the current solid-terrain mask; keep the background separate and update the mask only on terrain revisions.
- [x] 1.3 Generate the initial grass cap, highlight, and sparse pad-cleared tufts once from the seeded terrain; blend only tile-edge bands if the source shows visible seams.

## 2. Persistent blast integration

- [x] 2.1 Erase the blast circle from the grass canvas and remove unsupported tufts without regenerating initial grass; retain bare crater interiors and edge safety.
- [x] 2.2 Add focused checks for seeded repeatability, world-anchored offsets, grass placements, blast persistence/overlap/bounds, and unchanged terrain support semantics.

## 3. Verification

- [x] 3.1 Run tests and production build, then inspect a browser render for tile seams, grass slopes, craters, scrolling/zoom alignment, and wizard settling; record any checks unavailable in the environment.

Verification note: unit tests and production build pass. Headless browser rendering confirms the soil mask and grass appearance on generated slopes. Interactive blast erasure, camera movement/zoom, and wizard settling remain unverified in-browser.
