## 1. Missile assets and animations

- [x] 1.1 Copy the four reference SVG sprite sheets into the app's `public/assets` and load each as a 4-frame, 128 × 64 sheet.
- [x] 1.2 Register looping animations for ice, poison, electric, and fire missiles and map them to the existing spells.

## 2. Projectile presentation and speed

- [x] 2.1 Replace the circular in-flight shot with a scene-owned missile sprite that tracks the simulated position and rotates with instantaneous velocity.
- [x] 2.2 Remove the missile cleanly on impact, miss, and match restart while preserving the dotted trajectory preview.
- [x] 2.3 Increase launch speed by approximately 12 percent in the shared shot creation path so preview and live simulation stay synchronized.

## 3. Verification

- [x] 3.1 Add focused coverage for speed scaling and missile lifecycle/weapon mapping where the current test structure permits.
- [x] 3.2 Verify all four SVG animations, left/right orientation, arc-following, impact/miss cleanup, preview agreement, and unchanged collision behavior.
- [x] 3.3 Run focused shooting tests and the production build.
