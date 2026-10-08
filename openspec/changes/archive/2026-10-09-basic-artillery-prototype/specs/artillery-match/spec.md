## ADDED Requirements

### Requirement: Explicit alternating turn flow
Turn rules SHALL be independent of rendering and SHALL follow Aiming → Projectile flying → Impact resolution → Players settling → Winner check → Next turn, returning to Aiming unless the match ends. Player 1 SHALL start. Each turn SHALL accept exactly one shot, and the active player SHALL switch only after projectile resolution, explosion completion, settling, and winner checking.

#### Scenario: Resolved impact
- **WHEN** a player fires and the projectile impacts
- **THEN** the game completes the ordered resolution phases before giving the other living player control

#### Scenario: Miss completes a turn
- **WHEN** a shot exits horizontally or times out
- **THEN** the same turn flow completes without an explosion, crater, or damage, and the other player receives control exactly once

### Requirement: Input locking
The game SHALL accept aim and Fire only for the active living player in Aiming, with Fire additionally blocked during a drag. Acceptance of Fire SHALL immediately leave Aiming and create a single projectile. Defeated players and completed matches SHALL reject aiming and firing.

#### Scenario: Repeated Fire
- **WHEN** Fire is clicked or tapped repeatedly during launch and resolution
- **THEN** only the first valid activation creates a projectile, and no further shot can start until the next Aiming state

#### Scenario: Locked resolution
- **WHEN** either player tries to aim or fire during flight, impact, settling, or winner checking
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
After settling, the game SHALL end with the surviving player as winner when exactly one player has zero health, or a draw when both have zero health. A completed match SHALL NOT advance to another playable turn.

#### Scenario: One player defeated
- **WHEN** winner checking finds one player's health at zero and the other's above zero
- **THEN** the survivor is announced as winner and neither player can fire

#### Scenario: Simultaneous defeat
- **WHEN** winner checking finds both players at zero health
- **THEN** the match announces a draw and disables aiming and firing

### Requirement: Minimal match interface
The interface SHALL show both players' health, whose turn is active, whether the shot is resolving or the match is over, a separate Fire button, and a Restart button. Fire availability SHALL reflect the actual input rules. The game SHALL run in a browser without a backend and allow two people to complete a match on one device.

#### Scenario: Shared-device match
- **WHEN** two people alternate valid shots until defeat using the visible controls
- **THEN** health and turn indicators remain consistent with play and the final winner or draw is displayed

### Requirement: Clean restart
Restart SHALL be available in every match state. It SHALL recreate the fixed-seed initial terrain and positions, restore both players to 100 health, restore default aims, clear projectiles, effects, timers, simulation accumulator, pointer ownership, and outcome, and return to Player 1 Aiming without duplicating event handlers.

#### Scenario: Restart during resolution
- **WHEN** Restart is activated during flight, impact effects, or settling
- **THEN** a clean playable match appears immediately and no previous shot or effect later changes its health, terrain, or turn

#### Scenario: Restart after outcome repeatedly
- **WHEN** Restart is activated after a win or draw and then activated again
- **THEN** each reset produces the same initial battlefield with Player 1 active, and a single Fire activation still creates only one projectile
