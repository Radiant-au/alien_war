## ADDED Requirements

### Requirement: Animated health loss display
The health HUD SHALL animate each health decrease one point at a time while game logic applies the full damage immediately and uses authoritative health for elimination, turn flow, and damage calculations.

#### Scenario: Health decreases after impact
- **WHEN** an impact lowers a player's health
- **THEN** the displayed number and health bar step down one point at a time until they match the authoritative health value

#### Scenario: Restart restores health display
- **WHEN** a new match starts with players restored to full health
- **THEN** the HUD displays full health without replaying a damage animation
