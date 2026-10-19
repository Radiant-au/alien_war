# Alien War main menu

Startup now presents a lightweight flat menu before importing Phaser. New Game starts a fresh 2-, 3- or 4-player local match. The chosen Scout, Hopper, Stinger or Orbit becomes Player 1; the other ships remain unique. Menu portraits use the same shapes and colors as the battlefield ships. The battle Menu button pauses play and exposes Continue. New Game discards the previous match.

Options provides a sound switch, music volume and effects volume. Preferences persist in local storage when available. Original quiet synthesized music, menu clicks and a firing cue use Web Audio after a user gesture; sound stops while the page is hidden. Audio availability does not gate gameplay. Exit pauses sound and explains that a browser tab can be closed; Back to Menu returns to the menu.

## Loading fix

The old bootstrap read `scene.events` immediately after importing the game, while Phaser may not yet have injected scene plugins. It could throw before its create-event subscription was registered. An explicit startup promise is now installed before constructing Phaser.Game, resolves after arena creation, and rejects on creation errors or a 30-second deadline. Artwork decoding and the engine import have independent deadlines. Failures expose Retry and Back to Menu rather than leaving an indefinite loading overlay.

## Repository name

The application package and visible branding use Alien War. Renaming the remote GitHub repository is a separate administrator action: Repository Settings → General → Repository name → `alien_war` → Rename. Afterward, local clones can use `git remote set-url origin https://github.com/Radiant-au/alien_war.git`. The current GitHub connector does not expose that administrator action.
