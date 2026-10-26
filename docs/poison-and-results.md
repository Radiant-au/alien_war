# Poison and battle results

Acid causes zero immediate damage or knockback and does not destroy terrain. Targets in the impact radius receive a distance-scaled poison budget up to 20 HP. Each affected ship loses exactly 1 HP every 0.5 seconds (up to 10 seconds for a direct hit), with floating green −1 text above the ship. Reapplication refreshes the remaining budget to the larger value rather than stacking tick speed. Poison follows the affected ship and continues across turns. Pause freezes the simulation; restart clears all poison. Game-over stops further damage. The existing HUD health animation follows actual health.

Other weapons use a modest reduction from their original whole-shot budgets: Plasma 55 → 48 (three 16-HP projectiles), Fire/Gravity Orb 65 → 56, Cryo 70 → 60. Splash falloff remains unchanged. AI uses the same damage definitions, with acid scored by its eventual budget.

At battle end a cyan/purple modal overlays the dimmed current battlefield, using the winning ship artwork. It handles local and AI winners and draws. Play Again preserves ship choices, count, mode and difficulty, resets health/statuses, and generates a fresh terrain. Main Menu returns to the existing menu. Finished matches cannot be resumed through Escape.

Validation: 58 automated tests, TypeScript and production build; browser checks for live poison tick/elimination, result display, replay reset, main-menu navigation, desktop and mobile button visibility and clickability. No browser errors. Large original music/loading assets use local test substitutes only; no substitutes are included in this change.
