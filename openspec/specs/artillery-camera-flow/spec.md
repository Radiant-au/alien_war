# Artillery Camera Flow

## Purpose

Define bounded camera follow modes and turn-transition sequencing.

## Requirements

### Requirement: Bounded camera follow modes
The camera SHALL use a 960 × 540 view over the larger battlefield and SHALL remain within world bounds. At match start it SHALL smoothly center on Player 1. During movement and aiming it SHALL follow the active player; during projectile flight it SHALL follow the projectile. Manual camera panning, wheel zoom, and pinch zoom SHALL be disabled.

#### Scenario: Initial view
- **WHEN** a match starts
- **THEN** the camera smoothly centers on Player 1 before enabling movement, aiming, or firing

#### Scenario: Active player and projectile follow
- **WHEN** the active player moves or a projectile is fired
- **THEN** the camera smoothly follows that player or projectile and remains within battlefield bounds

### Requirement: Impact, settling, and turn camera sequence
Turn flow SHALL follow Movement/Aiming → Projectile flight → Impact → Settling → Winner check → Camera transition → Next player ready. On impact, the camera SHALL hold a view that includes the explosion and affected terrain while the explosion resolves. The game SHALL wait for damage and player settling before winner checking. If play continues, the camera SHALL transition to the next player and controls SHALL remain disabled until the transition completes. Misses and timeouts SHALL also settle, check for a winner, transition, and enable the next player exactly once. A completed match SHALL remain locked.

#### Scenario: Impact before next player readiness
- **WHEN** a projectile impacts and players are damaged or fall
- **THEN** the impact view remains through damage and settling, winner checking follows, and next-player controls stay disabled until the camera transition finishes

#### Scenario: Miss or timeout
- **WHEN** a projectile misses horizontally or reaches maximum flight time
- **THEN** the turn completes through settling, winner checking, and camera transition before the next player's controls become available

#### Scenario: Match ends
- **WHEN** winner checking finds a winner or draw
- **THEN** the match displays its outcome and does not enable another player's controls

### Requirement: Above-view projectile indicator
When a projectile travels above the visible battlefield view, the camera SHALL stay within its vertical and horizontal bounds and the interface SHALL show a fixed-screen direction indicator until the projectile returns to view or resolves.

#### Scenario: Projectile arcs above view
- **WHEN** a projectile leaves the top of the camera view
- **THEN** the camera does not scroll beyond world bounds and an edge indicator shows the projectile's direction

### Requirement: Restart camera and turn state
Restart SHALL restore the initial terrain, player positions, health, full movement allowances, Player 1 ownership, and clean projectile/settling state. It SHALL clear camera tweens, pending transitions, and pointer ownership, reset the camera to its initial bounded position, and perform the initial Player 1 transition before enabling controls.

#### Scenario: Restart in flight or transition
- **WHEN** Restart is activated during projectile flight, settling, or a camera transition
- **THEN** the old shot and transition cannot affect the new match and Player 1 becomes ready only after the initial camera transition

#### Scenario: Restart after game over
- **WHEN** Restart is activated after an outcome
- **THEN** the camera and all match state return to their configured initial values and movement allowance is full for Player 1
