# Artillery Match

## Purpose

Define turn ownership, match resolution, health, interface, and restart behavior.

## Requirements

### Requirement: Explicit alternating turn flow
Turn rules SHALL be independent of rendering and SHALL follow Movement/Aiming → Projectile flight → Impact → Settling → Winner check → Camera transition → Next player ready. Player 1 SHALL start. Each turn SHALL accept exactly one shot, and the active player SHALL switch only after projectile resolution, impact effects, settling, and winner checking.

#### Scenario: Resolved impact
- **WHEN** a player fires and the projectile impacts
- **THEN** the game completes the ordered resolution and camera transition before giving the other living player control

#### Scenario: Miss completes a turn
- **WHEN** a shot exits horizontally or times out
- **THEN** the same turn flow completes without an explosion, crater, or damage, and the other player receives control exactly once

### Requirement: Input locking
Only the active living player SHALL be able to move or aim during Movement/Aiming. Fire SHALL additionally require the active player to be grounded and no aim drag to be active. Accepting Fire SHALL immediately leave Movement/Aiming and create one projectile. Controls SHALL remain locked during resolution and camera transition. Defeated players and completed matches SHALL reject controls.

#### Scenario: Repeated Fire
- **WHEN** Fire is clicked or tapped repeatedly during launch and resolution
- **THEN** only the first valid activation creates a projectile

#### Scenario: Locked resolution
- **WHEN** either player tries to move, aim, or fire during flight, impact, settling, winner checking, or camera transition
- **THEN** the resolving shot and saved aims remain unaffected

### Requirement: Health and radial explosion damage
Each player SHALL begin with 100 health. Each impact SHALL apply distance-based explosion damage to both players exactly once, using distance from impact center to each pre-settling rectangle. Damage SHALL decrease with distance, be zero at or beyond the blast radius, allow self-damage, and clamp health at zero. Misses and falling SHALL NOT cause damage.

#### Scenario: Near and far players
- **WHEN** an explosion occurs with one player closer than the other
- **THEN** the closer player receives at least as much damage, and any player outside the radius receives none

#### Scenario: Blast reaches both players
- **WHEN** both players overlap one explosion's damage radius
- **THEN** both health changes are applied before evaluating a match result

### Requirement: Winner and draw resolution
After settling, the game SHALL end with the surviving player as winner when exactly one player has zero health, or a draw when both players have zero health. A completed match SHALL NOT advance to another playable turn.

#### Scenario: One player defeated
- **WHEN** winner checking finds one player's health at zero and the other's above zero
- **THEN** the survivor is announced as winner and neither player can act

#### Scenario: Simultaneous defeat
- **WHEN** winner checking finds both players at zero health
- **THEN** the match announces a draw and disables player controls

### Requirement: Minimal match interface
The screen-fixed interface SHALL show both players' health, the active turn or resolution state, movement allowance, Fire, Restart, and touch movement controls. Fire availability SHALL reflect actual input rules. The game SHALL run in a browser without a backend and support two people sharing one device.

#### Scenario: Shared-device match
- **WHEN** two people alternate valid moves and shots until defeat
- **THEN** health and turn indicators remain consistent and the final winner or draw is displayed

### Requirement: Animated health loss display
The health HUD SHALL animate each health decrease one point at a time while game logic applies the full damage immediately and uses authoritative health for elimination, turn flow, and damage calculations.

#### Scenario: Health decreases after impact
- **WHEN** an impact lowers a player's health
- **THEN** the displayed number and health bar step down one point at a time until they match the authoritative health value

#### Scenario: Restart restores health display
- **WHEN** a new match starts with players restored to full health
- **THEN** the HUD displays full health without replaying a damage animation

### Requirement: Clean restart
Restart SHALL be available in every match state. It SHALL recreate fixed-seed initial terrain and positions, restore both players to 100 health and full movement allowances, restore default aims, clear projectiles, effects, timers, accumulator, pointer/key ownership, and outcome, then reset the camera and perform the initial Player 1 transition before enabling controls.

#### Scenario: Restart during resolution
- **WHEN** Restart is activated during flight, impact effects, settling, or a camera transition
- **THEN** a clean match appears and no previous shot or effect changes its state

#### Scenario: Restart after outcome repeatedly
- **WHEN** Restart is activated after a win or draw and then activated again
- **THEN** each reset produces the same initial battlefield with Player 1 ready after the initial camera transition and one Fire activation creates only one projectile
