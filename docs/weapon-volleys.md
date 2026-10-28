# Smaller damage, larger impacts, flame and ice volleys

The active route is index.html → src/app/bootstrap.ts → src/app/main.ts → src/rendering/landscape-scene.ts. The obsolete root scene now re-exports that implementation, preventing another file mismatch.

Whole-shot damage budgets:

| Weapon | Before | After | Projectiles |
|---|---:|---:|---:|
| Plasma | 48 | 45 | 3 × 15 |
| Acid | 20 | 18 | 1, zero impact, gradual −1 ticks |
| Flame Volley | 56 | 51 | 3 × 17 |
| Cryo Shards | 60 | 55 | 5 × 11 |

Health splash radii increase to 64/90/80/58 respectively. Terrain radii are separate: Plasma 56, Flame 56 per projectile, Cryo 44 per shard; acid still does not carve terrain. Cryo's five spread impacts remove a wider area than the prior single 48-radius crater. Full volleys share one damage budget rather than multiplying it by projectile count. AI searches the same volleys with the same per-projectile damage.

The active scene loads the approved four-frame flame SVG cluster, not the old fire missile sprite. Fire's old explosion PNG and animation are removed from the active scene and startup downloads. Procedural flame tongues, embers and the existing terrain-following fire renderer provide impact and lingering flames without extra damage.

Cryo uses a new four-frame small faceted icy shard SVG. Five shots fan across a narrow arc. Each can spawn the approved crystal ground sprite, frost and ship coating. Projectiles are smaller; the combined effect covers more terrain.

Validation: 61 tests and TypeScript/production build pass. Tests verify volley counts, budget splitting, a wider cryo terrain cut, and the actual HTML-to-scene route and asset paths. Browser visual validation was not available in this turn. Large original music/loading assets use local testing stand-ins only and are excluded from the commit.

Repository rename: the connected GitHub tools have no rename capability. Browser settings could not be accessed while signed out. The repository remains wizard_war; requested target name is alien_war.
