## MODIFIED Requirements

### Requirement: Heightmap destruction
An impact from a terrain-destructive weapon SHALL display a temporary explosion and carve a bowl-shaped crater wherever its radius intersects solid ground. Carving SHALL only remove ground, retain one surface height per horizontal sample, and preserve a bottom support floor. A poison impact SHALL NOT alter terrain heights, terrain revision, or terrain decoration. Terrain SHALL NOT contain caves or overhangs.

#### Scenario: Destructive surface impact
- **WHEN** an electric, fire, or ice weapon impacts the terrain
- **THEN** its impact effect appears, the rendered surface shows the resulting bowl after the initial blast ends, and the heightmap remains the collision and support model

#### Scenario: Poison surface impact
- **WHEN** a poison weapon impacts the terrain
- **THEN** its poison effect appears and player blast damage resolves, while terrain heights, terrain revision, and terrain decoration remain unchanged

#### Scenario: Repeated or edge impacts
- **WHEN** a terrain-destructive weapon's crater overlaps an existing crater or a battlefield edge
- **THEN** only in-bounds surface samples change, no ground is added, and the surface remains within its vertical bounds

## ADDED Requirements

### Requirement: Weapon-specific impact aftermath
Each of the four existing spells SHALL present the matching electric, poison, fire, or ice impact style, including its characteristic lingering effect. Ground aftermath SHALL conform to the live heightmap surface after terrain destruction and SHALL remain anchored to that surface as later impacts reshape it. Lingering effects SHALL remain aligned with the impact in world coordinates while the camera moves and SHALL be cleaned up when they finish or when the match restarts.

Weapon impact visuals SHALL be large enough to read clearly over the battlefield. Electric, fire, and ice impacts SHALL use increased blast radii and destructive crater sizes. Poison aftermath SHALL be substantially wider and longer-lived, while poison SHALL NOT destroy terrain. Ice shards SHALL be large enough to visibly overlap a player when Cryo Spike hits one.

#### Scenario: Spell-specific presentation
- **WHEN** Plasma Bolt, Acid Bomb, Gravity Orb, or Cryo Spike impacts
- **THEN** it displays respectively an electric pulse/scorch, bubbling poison, fire/embers, or ice growth/glints effect

#### Scenario: Large poison aftermath
- **WHEN** Acid Bomb impacts
- **THEN** a broad poison puddle and bubbles remain clearly visible for several seconds without changing terrain

#### Scenario: Ice hit overlaps a player
- **WHEN** Cryo Spike hits a player
- **THEN** large ice shards visibly grow across and in front of the player's body

#### Scenario: Camera moves during aftermath
- **WHEN** the camera scrolls while an impact effect is active
- **THEN** the effect stays attached to its world-space impact location

#### Scenario: Aftermath follows crater terrain
- **WHEN** a terrain-destroying weapon impacts and leaves a crater
- **THEN** ground patches follow the crater floor and rim profile, and anchored flames, pulses, or ice shards sit on the resulting surface

#### Scenario: Later blast reshapes active aftermath
- **WHEN** another impact changes terrain beneath an active ground effect
- **THEN** its ground patch and anchored objects update to follow the revised heightmap

#### Scenario: Match restarts during aftermath
- **WHEN** a match restarts while lingering effects are active
- **THEN** those effects are removed and do not appear in the new match
