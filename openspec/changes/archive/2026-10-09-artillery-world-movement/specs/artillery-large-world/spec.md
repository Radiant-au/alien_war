## ADDED Requirements

### Requirement: Expanded continuous battlefield
The battlefield SHALL span approximately three 960-unit camera widths, retain one continuous fixed-seed heightmap surface across its full 2880-unit width, and keep terrain, players, aiming, and projectiles in world coordinates. Both players SHALL start on stable ground near opposite sides with sufficient separation for long-range shots. The camera SHALL show only its bounded viewport, not scale the whole world to fit on screen.

#### Scenario: Full world initialization
- **WHEN** a new match starts
- **THEN** terrain spans the complete 2880-unit world, both separated players rest on stable ground, and only the 960-unit camera view is visible

#### Scenario: Continuous terrain sampling
- **WHEN** terrain is sampled or a projectile crosses any horizontal position in the world
- **THEN** the same interpolated heightmap surface supplies rendering, support, and collision without gaps at former screen boundaries

### Requirement: Reachable opposing player
Maximum projectile launch power SHALL be configurable and SHALL be tuned so a projectile can reach the opposing player across the starting separation on the fixed-seed battlefield. The preview and launched shot SHALL use the same current player world position, power mapping, gravity, and collision simulation.

#### Scenario: Maximum-power cross-field shot
- **WHEN** an active player aims toward the opponent at maximum power on the initial seeded terrain
- **THEN** the projectile trajectory can reach the opponent's region without being limited by the former 960-unit world boundary

#### Scenario: Moved player launch
- **WHEN** a player moves and then fires without changing the retained aim
- **THEN** the projectile and trajectory preview start from the player's updated world position

### Requirement: Screen-fixed match interface
Health, turn status, movement allowance, Fire, Restart, and on-screen movement controls SHALL remain fixed relative to the screen while the camera scrolls across the battlefield.

#### Scenario: HUD remains fixed while following
- **WHEN** the camera follows a player or projectile across the world
- **THEN** all HUD values and controls remain in the same screen positions and continue to reflect current match state
