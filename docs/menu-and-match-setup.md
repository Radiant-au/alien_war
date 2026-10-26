# Main menu and separate match setup

The main menu follows the approved ALIEN WAR mockup: a cyan/amber illustrated logo, three large New Game / Options / Exit buttons on the left, a floating Scout ship on the right, and an alien crystal landscape behind them. There is no Continue action on the main menu.

New Game opens Match Setup. Its two panels provide Local/Vs AI mode cards, 2–4 total ships (1–3 opponents in AI mode), Easy/Normal/Hard difficulty, and four ship choices. Only Start Battle creates/restarts the match. Back returns to the originating menu without starting one. Mode, ship, count, difficulty and audio preferences retain the existing persistence behavior.

The in-game Pause button and Escape open a separate pause view with Resume, New Game, Options and Back to Main Menu. Setup opened from pause returns to pause when Back is clicked; Resume preserves the existing match. Back to Main Menu ends access to the current match, consistent with removing Continue. Keyboard navigation uses real buttons, visible focus and aria-pressed selections; reduced-motion settings stop floating/pulse animations.

## Generated artwork

The built-in imagegen tool produced three independent layers from the approved main-menu reference. Each was converted to WebP for runtime use; transparent alpha is retained for the logo and ship. Total artwork payload is about 462 KB.

- `assets/menu/planet-menu.webp`: remove all UI, lettering and ships from the reference, reconstruct the same purple ringed-planet sky, lavender moon, mountains, teal platform and corner crystals. Leave the right platform empty for the floating hero.
- `assets/menu/scout-hero.webp`: isolate the cyan saucer, mint alien, glass dome, cannon and running lights on transparency; omit scenery and hover rings.
- `assets/menu/alien-war-title.webp`: isolate the exact ALIEN WAR two-line cyan/amber title, orbital ring and small rock accents on transparency.

The background is an actual image layer; buttons, settings, ship portraits and navigation remain interactive HTML/CSS. CSS animates the hero independently and draws the hover rings and sparse twinkles. Desktop layout matches the approved composition; narrow screens stack setup panels and keep Start Battle reachable. Other ship previews use the game's existing vector ship portraits.

## Validation

- All 51 automated tests and TypeScript checks pass. New tests cover setup/back, pause/resume and returning to main, and separation of main-menu actions from setup/pause controls.
- Chromium checks passed main → setup → battle, every ship choice, AI/local setup, saved settings, Back, Options, Exit cancellation, Escape pause, Resume with preserved position/phase, setup-from-pause Back, and returning to main without a Continue button.
- Visual checks passed at 1440×810, 390×844, 844×390 and 320×568. A 320px overflow found during QA was corrected. Reduced-motion mode disables the hero animation. No browser page errors were observed.
- Bundling and browser checks used the real new artwork and short recordings/gameplay assets. The existing large intro/menu music and loading PNGs used local stand-ins because those binaries could not be materialized through the connector. Stand-ins are not committed.
