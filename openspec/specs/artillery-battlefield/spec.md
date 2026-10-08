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
An impact SHALL display a temporary explosion circle and carve a bowl-shaped crater wherever its radius intersects solid ground. Carving SHALL only remove ground, retain one surface height per horizontal sample, and preserve a bottom support floor. Terrain SHALL NOT contain caves or overhangs.

#### Scenario: Surface impact
- **WHEN** a projectile impacts the terrain
- **THEN** the explosion circle appears and the rendered surface shows the resulting bowl after the circle disappears

#### Scenario: Repeated or edge impacts
- **WHEN** a crater overlaps an existing crater or a battlefield edge
- **THEN** only in-bounds surface samples change, no ground is added, and the surface remains within its vertical bounds

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
