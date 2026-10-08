# Artillery Shooting

## Purpose

Define pointer aiming, trajectory previews, projectile physics, and collision handling.

## Requirements

### Requirement: Retained pointer aiming
Only the active player during Movement/Aiming SHALL adjust aim. Drag direction SHALL set firing direction and drag distance SHALL set bounded power. Mouse and touch SHALL use pointer input. Releasing SHALL retain the selected aim without launching; only the separate Fire button SHALL launch. A zero-length/dead-zone drag SHALL retain a valid prior aim. Only one pointer SHALL own a drag, and firing SHALL be disabled during that drag.

#### Scenario: Both players aim toward one another
- **WHEN** Player 1 drags toward the right and Player 2 drags toward the left, using mouse or touch
- **THEN** each selected aim points in that direction and a longer drag increases power up to its maximum

#### Scenario: Release and fire
- **WHEN** the active player releases a valid drag and then presses Fire
- **THEN** the aim remains unchanged and the shot uses those retained parameters

#### Scenario: Canceled or additional pointer
- **WHEN** a second pointer is pressed during a drag or the owning pointer is canceled
- **THEN** the second pointer does not change aim, cancellation releases ownership, and neither event launches a shot

### Requirement: Matching short trajectory preview
The game SHALL display a short dotted trajectory preview while aiming. Preview and projectile SHALL share launch origin, direction, power mapping, gravity, fixed-step calculation, and collision rules. Preview calculation SHALL NOT mutate live state and SHALL stop at collision or horizontal exit.

#### Scenario: Preview agreement
- **WHEN** a player fires an unchanged aim
- **THEN** the initial flight path follows the preview dots within one logical pixel at corresponding simulation times

### Requirement: Fixed-step gravity and safe launch
The projectile SHALL use a fixed simulation timestep independent of rendering. It SHALL spawn beyond the shooter's body with clearance for its radius and SHALL collide normally with either player afterward. An initial overlap with terrain SHALL resolve as terrain impact.

#### Scenario: Clear muzzle
- **WHEN** a valid shot launches with terrain clearance
- **THEN** it starts outside the shooter and follows a gravity-curved trajectory affected by direction and power

#### Scenario: Returning projectile
- **WHEN** a projectile later returns to the shooter's body
- **THEN** it is treated as a player impact

#### Scenario: Rendering rates differ
- **WHEN** the same launch is simulated for the same fixed steps under different rendering frame rates
- **THEN** the projectile path and terminal result are identical

### Requirement: Swept earliest collision
The simulation SHALL check the projectile's radius along each movement segment against the terrain and both player bodies, resolve the earliest contact, and emit only one terminal result per shot.

#### Scenario: Fast projectile crosses thin geometry
- **WHEN** a projectile crosses a narrow ridge or player body between two simulation positions
- **THEN** the collision is detected even if the endpoint is beyond the obstacle

#### Scenario: Multiple possible contacts
- **WHEN** terrain and player contacts occur along the same movement segment
- **THEN** only the earliest contact produces an impact and explosion

### Requirement: Bounded misses and above-screen flight
Horizontal out-of-bounds shots and shots reaching the configured maximum simulated flight time SHALL finish as misses without damage or destruction. Above-screen flight alone SHALL NOT terminate a projectile. If impact and exit or timeout occur in one step, the earliest terminal event SHALL win.

#### Scenario: High arc returns
- **WHEN** the projectile travels above the visible screen while within horizontal bounds and below its flight-time limit
- **THEN** simulation continues and it can return to collide with the battlefield

#### Scenario: Horizontal miss
- **WHEN** the projectile crosses either horizontal boundary before impact
- **THEN** it is removed and reports a miss for turn resolution

#### Scenario: Flight timeout
- **WHEN** the projectile reaches the maximum flight time without an earlier terminal event
- **THEN** it is removed and reports a miss for turn resolution
