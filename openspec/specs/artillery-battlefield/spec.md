# Artillery Battlefield

## Purpose

Define deterministic terrain, player placement, destruction, and responsive battlefield rendering.

## Requirements

### Requirement: Deterministic continuous battlefield
The game SHALL generate a continuous hilly heightmap across a battlefield approximately three 960-unit camera widths wide, using a fixed development seed. Terrain data SHALL remain independent of rendering. Both distinct colored player objects SHALL begin on stable ground near opposite sides, and the camera SHALL show its bounded viewport rather than scaling the full world to fit.

#### Scenario: New battlefield
- **WHEN** a match initializes
- **THEN** the complete terrain and both players exist in world coordinates, the players rest on stable ground, and only the camera viewport is visible

#### Scenario: Repeatable generation
- **WHEN** terrain is generated twice with the same development seed and settings
- **THEN** both heightmaps and initial player positions are identical

#### Scenario: Continuous terrain sampling
- **WHEN** terrain is sampled or a projectile crosses any horizontal position
- **THEN** rendering, player support, and collision use the same interpolated surface without gaps

### Requirement: Heightmap destruction
An impact from a terrain-destructive weapon SHALL display a temporary explosion and carve a bowl-shaped crater wherever its radius intersects solid ground. Carving SHALL only remove ground, retain one surface height per horizontal sample, and preserve a bottom support floor. A poison impact SHALL NOT alter terrain heights, terrain revision, or terrain decoration. Terrain SHALL NOT contain caves or overhangs.

#### Scenario: Surface impact
- **WHEN** a projectile impacts the terrain
- **THEN** the explosion circle appears and the rendered surface shows the resulting bowl after the circle disappears

#### Scenario: Destructive surface impact
- **WHEN** an electric, fire, or ice weapon impacts the terrain
- **THEN** its impact effect appears, the rendered surface shows the resulting bowl after the initial blast ends, and the heightmap remains the collision and support model

#### Scenario: Poison surface impact
- **WHEN** a poison weapon impacts the terrain
- **THEN** its poison effect appears and player blast damage resolves, while terrain heights, terrain revision, and terrain decoration remain unchanged

#### Scenario: Repeated or edge impacts
- **WHEN** a crater overlaps an existing crater or a battlefield edge
- **THEN** only in-bounds surface samples change, no ground is added, and the surface remains within its vertical bounds

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

### Requirement: Repeated soil texture follows solid terrain
The battlefield SHALL render the provided soil image repeated at a configurable scale only inside the authoritative current solid-terrain mask. The pattern SHALL be anchored to world coordinates and use a seeded per-map offset that remains fixed during a match. The background SHALL remain visually separate from destructible terrain. Repeated tile edges SHALL NOT show distracting seams.

#### Scenario: Soil texture on a generated map
- **WHEN** a randomly generated map is rendered
- **THEN** small repeated soil details fill the current solid terrain without stretching the source image across the battlefield

#### Scenario: Scrolling and zooming
- **WHEN** the camera scrolls or zooms during a match
- **THEN** texture features remain aligned with the same world coordinates and do not slide or reset

#### Scenario: Crater exposes soil
- **WHEN** an explosion removes solid terrain
- **THEN** soil pixels are clipped by the updated terrain mask and exposed crater surfaces retain the brown soil appearance

### Requirement: Initial procedural grass decoration
The game SHALL generate a decorative grass cap approximately 6–10 world pixels thick inside the initially generated terrain outline, with a thinner bright-green upper highlight. Grass colors, thickness, edge variation, and tuft density SHALL be configurable. Seeded tufts SHALL be sparse and leave wizard starting areas relatively clear. Grass SHALL NOT contribute collision data.

#### Scenario: Grass follows varied slopes
- **WHEN** generated terrain contains gentle or steep slopes
- **THEN** the cap and highlight follow the initial surface contour and tufts remain visually attached to their support

#### Scenario: Repeated maps
- **WHEN** a map is generated from a seed
- **THEN** grass edge details and tuft placements are deterministic for that map seed

### Requirement: Grass removal preserves destruction
Each explosion SHALL erase the same world-space circle from grass as from solid terrain and soil visibility. It SHALL remove tufts whose supporting terrain is destroyed, clip overlapping tuft pixels inside the blast, and SHALL NOT regenerate grass on crater walls, floors, or other newly exposed edges. Overlapping and world-edge explosions SHALL never restore removed terrain or grass.

#### Scenario: Crater and overlapping blast
- **WHEN** one or more explosions crater terrain
- **THEN** the blast regions remain bare soil and previously erased grass never reappears

#### Scenario: Blast at world edge
- **WHEN** an explosion intersects a world boundary
- **THEN** soil, grass, and collision updates remain aligned and clipped to valid terrain bounds

### Requirement: Terrain visuals update only with terrain changes
Soil and grass rendering SHALL remain aligned with the existing terrain collision/support data through camera movement and match resolution. Terrain masks and grass pixels SHALL update on terrain revisions or affected blast regions, not be rebuilt every frame. Players SHALL continue settling onto remaining collision support after destruction.

#### Scenario: Destruction and settling
- **WHEN** a crater removes support beneath a wizard
- **THEN** the terrain visuals show the removed region and the wizard settles using the same remaining authoritative terrain support

### Requirement: Player settling
After destruction, each player SHALL settle vertically onto the highest remaining ground under its full rectangular footprint. Players SHALL NOT penetrate ground, rotate, or take fall damage. Settling SHALL finish in finite time and complete before winner checking.

#### Scenario: Ground removed under a player
- **WHEN** a crater removes support across a player's footprint
- **THEN** that player descends to the new support height without health loss from falling

#### Scenario: Crater leaves supporting rim
- **WHEN** part of the player's footprint still rests on a higher crater rim
- **THEN** the player remains supported at that height without intersecting the rim

### Requirement: Responsive battlefield coordinates
The 960 × 540 camera viewport SHALL fit the available screen while preserving aspect ratio. Mouse and touch coordinates SHALL map through the current camera transform after resize and scrolling. Resizing SHALL NOT regenerate terrain or change simulation state.

#### Scenario: Aim after resize or scroll
- **WHEN** the viewport changes size or orientation, or the camera scrolls, and a player drags the aiming control
- **THEN** drag direction and distance correspond to the displayed handle in logical world coordinates, and the existing battlefield remains intact
