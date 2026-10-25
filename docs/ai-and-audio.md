# Local and computer opponents

The active entry chain remains index.html → src/app/bootstrap.ts → src/app/main.ts → src/rendering/landscape-scene.ts. Changes are made in these active files, not the obsolete root scene.

The main menu offers Local (2–4 humans sharing the device) and Vs AI (P1 human plus 1–3 computers). The selected ship belongs to P1; computer ships use the remaining designs. Difficulty and mode are saved alongside the existing audio and ship settings. The HUD labels computer ships AI1–AI3, shows when they are thinking, and disables human movement, aiming, weapon selection and firing during computer turns. Restart and menu pause/resume preserve the selected mode and difficulty.

## AI behavior

The search uses the game's projectile simulation and terrain collision instead of an AI service. It scores possible impacts against living opponents, penalizes self damage and rewards eliminations. AI matches are free-for-all: computers can shoot one another. The search yields inside trajectories and uses a bounded per-frame work budget so the game can continue rendering.

| Difficulty | Shot grid per direction | Aiming error | Movement |
| --- | --- | --- | --- |
| Easy | 9 angles × 7 powers | Up to 6° and 7 percentage points of power | Stays put |
| Normal | 17 × 11 | Up to 2.2° and 2.5 points | Short reposition using normal movement/fuel |
| Hard | 27 × 15, then local refinement and electric-volley evaluation | Up to 0.45° and 0.8 points | Longer reposition using normal movement/fuel |

Movement still obeys slopes, neighbors, collisions and fuel. The controller resets across phases and restarts, waits for a grounded ship, displays its chosen aim briefly, and fires once. Eliminated players and victory follow the existing match state machine. No server or AI API is required.

## Audio

Existing shot/electric/poison recordings are retained. A shared Web Audio mixer routes music, recorded effects and synthesized cues through separate gain buses and a compressor. Effects use subtle stereo position, music ducks briefly during shots/impacts, track changes crossfade, and volume sliders use a perceptual gain curve with smooth changes. Hot decoded recordings are attenuated rather than amplified. Overlapping voices are capped; mute, tab hiding and scene changes stop active effects.

Fire and ice impacts, turn changes and victory receive synthesized cues. Recorded HTML audio pools provide fallback playback if decoding or Web Audio is unavailable. The change improves mixing and consistency; it does not increase the resolution of the original recordings.

## Verification

- TypeScript checking and 48 automated tests pass. New coverage includes safe preferences, shots over all six terrain layouts, difficulty errors, leftward targeting, eliminated opponents, single-fire scheduling, turn completion/reset, audio routing/muting/visibility/disposal and bounded volume curves.
- A Chromium gameplay check completed three consecutive computer turns and returned to human P1. It also completed Easy two-ship and Normal three-ship turns, and checked human input rejection during AI turns, pause/resume, restart during planning, local-mode switching, saved mute/music/SFX controls, and a mobile menu with no horizontal overflow. No page errors were observed.
- Production bundling was exercised with local stand-ins for the large intro/menu music and loading artwork because those binaries could not be materialized through the connector. Short sound recordings and gameplay assets were real repository files. Stand-ins are not committed. Browser checks used the same stand-ins; this is not a listening assessment of the original music.

AI difficulty is heuristic and can be tuned with playtesting. In cramped terrain a computer may hit a ridge instead of a player; normal terrain destruction and subsequent replanning still apply.
