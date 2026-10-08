## ADDED Requirements

### Requirement: Deterministic single-screen battlefield
The game SHALL render a hilly heightmap battlefield and two distinct colored rectangles using generated shapes. The same fixed development seed SHALL reproduce the initial terrain. Players SHALL start on stable ground near opposite sides with fixed horizontal positions and no movement controls. Terrain data SHALL remain independent of rendering.

#### Scenario: New battlefield
- **WHEN** a match initializes
- **THEN** the complete battlefield and both players are visible, each rectangle rests on stable ground, and no external artwork is needed

#### Scenario: Repeatable generation
- **WHEN** terrain is generated twice with the same development seed and settings
- **THEN** both heightmaps and initial player positions are identical

### Requirement: Heightmap destruction
An impact SHALL display a temporary explosion circle and carve a bowl-shaped crater wherever its radius intersects solid ground. Carving SHALL only remove ground, retain one surface height per horizontal sample, and preserve a bottom support floor. Terrain SHALL NOT contain caves or overhangs.

#### Scenario: Surface impact
- **WHEN** a projectile impacts the terrain
- **THEN** the explosion circle appears and the rendered surface shows the resulting bowl after the circle disappears

#### Scenario: Repeated or edge impacts
- **WHEN** a crater overlaps an existing crater or a battlefield edge
- **THEN** only in-bounds surface samples change, no ground is added, and the surface remains within its vertical bounds

### Requirement: Player settling
After destruction, each player SHALL settle vertically onto the highest remaining ground under its full rectangular footprint. Player X positions SHALL remain fixed; players SHALL NOT penetrate ground, rotate, or take fall damage. Settling SHALL finish in finite time and report completion before winner checking.

#### Scenario: Ground removed under a player
- **WHEN** a crater removes support across a player's footprint
- **THEN** that player descends to the new support height without health loss from falling

#### Scenario: Crater leaves supporting rim
- **WHEN** part of the player's footprint still rests on a higher crater rim
- **THEN** the player remains supported at that height without intersecting the rim

### Requirement: Responsive battlefield coordinates
The canvas SHALL fit the available viewport with the entire battlefield visible and aspect ratio preserved. Mouse and touch input SHALL map to the same logical world coordinates after resizing, including when the canvas is centered with margins. Resizing SHALL NOT regenerate terrain or change simulation state.

#### Scenario: Aim after resize
- **WHEN** the viewport changes size or orientation and a player drags the aiming handle
- **THEN** the drag direction and distance correspond to the displayed handle in logical coordinates, and the existing battlefield remains intact
