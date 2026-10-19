## ADDED Requirements

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
