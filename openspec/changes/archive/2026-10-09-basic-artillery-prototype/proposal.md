## Why

Validate the core feel and reliability of a shared-device browser artillery game before investing in artwork or additional mechanics. This prototype tests predictable terrain, drag aiming, projectile physics, destruction, and complete alternating turns with original generated shapes.

## What Changes

- Replace the Vite demo with a single-screen Phaser game using the existing TypeScript and Vite setup, without React or a backend.
- Generate fixed-seed hilly heightmap terrain and place two stationary colored rectangular players on stable ground near opposite sides.
- Add mouse/touch drag direction and power controls, a matching short dotted trajectory preview, and a separate Fire button that uses the retained aim.
- Simulate one gravity-driven projectile at a fixed timestep with swept collision checks, terrain/player impacts, and bounded miss resolution while allowing above-screen flight.
- Add explosion circles, bowl-shaped craters, vertical settling, distance-based damage, 100 health per player, wins/draws, and clean restart.
- Enforce the explicit aiming, flight, impact, settling, winner-check, and next-turn sequence, locking input during resolution.
- Deliver terrain, aiming, shots, and alternating turns as the first playable checkpoint; add destruction, settling, health, and restart afterward.
- Exclude wizard art, animations beyond the required impact indicator and physical settling, multiple spells, movement, wind, AI, online multiplayer, accounts, inventory, audio, elaborate menus, and deployment configuration.

## Capabilities

### New Capabilities

- `artillery-battlefield`: Deterministic heightmap terrain, stationary player placement, terrain destruction, settling, and viewport scaling.
- `artillery-shooting`: Pointer aiming, launch preview, projectile simulation, collision detection, impacts, and misses.
- `artillery-match`: Turn sequencing, input locking, explosion damage, health/status controls, outcomes, and restart.

### Modified Capabilities

None. There are no existing capability specifications.

## Impact

Implementation will replace the starter presentation in `src/main.ts` and `src/style.css`, reuse `index.html`, `tsconfig.json`, and the existing Vite commands, and add Phaser as a runtime dependency in `package.json` and the lockfile. Small TypeScript modules will keep terrain data, projectile simulation, and turn rules independent of Phaser rendering. No backend, external artwork, service integration, or deployment changes are required. This change currently contains planning artifacts only.
