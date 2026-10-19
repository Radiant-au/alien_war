## ADDED Requirements

### Requirement: Animated spell-specific missile projectile
During projectile flight, the game SHALL display a looping missile animation matching the selected spell: ice for Cryo Spike, poison for Acid Bomb, electric for Plasma Bolt, and fire for Gravity Orb. The missile visual SHALL follow the simulated shot position and instantaneous direction, and SHALL be removed on impact, miss, or restart. Its visual size SHALL NOT change the projectile collision radius.

#### Scenario: Elemental missile launches
- **WHEN** the active player fires any spell
- **THEN** its corresponding animated missile appears at the simulated launch point and follows the projectile path

#### Scenario: Missile follows a curved or reversed shot
- **WHEN** a shot changes direction under gravity or travels toward the left
- **THEN** the missile rotates to face its instantaneous velocity

#### Scenario: Shot terminates
- **WHEN** the projectile impacts, misses, or the match restarts
- **THEN** its missile sprite and animation are removed

#### Scenario: Cosmetic visual does not alter collision
- **WHEN** the missile sprite overlaps terrain or a player before the simulated projectile contacts them
- **THEN** collision is still determined by the existing projectile radius and swept simulation

### Requirement: Modestly faster projectile travel
The launch speed produced from the player's selected power SHALL be increased by approximately 12 percent. Aim direction, relative power mapping, gravity, fixed-step behavior, trajectory preview, and swept collision SHALL remain synchronized with that launch speed.

#### Scenario: Faster launch at any power
- **WHEN** a player fires at a selected power level
- **THEN** the shot travels approximately 12 percent faster than the prior speed for that same power

#### Scenario: Preview remains accurate
- **WHEN** a player fires without changing aim or power
- **THEN** the live missile follows the same simulated path as the updated trajectory preview
