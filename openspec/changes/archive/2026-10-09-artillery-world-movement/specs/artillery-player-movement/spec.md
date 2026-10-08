## ADDED Requirements

### Requirement: Per-turn horizontal movement allowance
During Movement/Aiming, only the active living player SHALL move left or right using A/D, arrow keys, or on-screen press-and-hold controls. Each player's allowance SHALL be configurable and initially 120 world pixels per turn. The remaining allowance SHALL be shown on screen and SHALL decrease by actual absolute horizontal distance traveled, including input movement while falling. Blocked movement and vertical gravity SHALL consume no allowance. The allowance SHALL reset when that player becomes ready on their next turn. Firing SHALL end all movement for that turn; movement and aiming SHALL be allowed in either order before Fire.

#### Scenario: Movement and aim in either order
- **WHEN** the active player moves then aims, or aims then moves, before firing
- **THEN** both actions affect the eventual launch and the same remaining movement allowance is displayed

#### Scenario: Allowance is measured from displacement
- **WHEN** the active player moves toward a blocked ledge or wall, then moves across open ground
- **THEN** blocked distance does not reduce allowance and only actual horizontal displacement is charged

#### Scenario: Turn ownership and reset
- **WHEN** the inactive player tries to move, or a player begins their next ready turn
- **THEN** the inactive input has no effect and the newly active player's allowance is restored to its configured amount

#### Scenario: Fire closes movement
- **WHEN** the active player fires
- **THEN** movement input stops immediately and no allowance remains usable until that player's next turn

### Requirement: Ground-following and climb limits
Players SHALL remain upright on the terrain and SHALL follow gentle slopes using the shared heightmap support query. Upward steps exceeding a configurable climb limit SHALL be blocked. Players SHALL remain within world bounds and SHALL NOT overlap one another. Jumping and flying SHALL NOT be available.

#### Scenario: Gentle slope
- **WHEN** a player moves across a gradual rise or fall within the climb limit
- **THEN** the player follows the surface while remaining supported and upright

#### Scenario: Excessive uphill ledge
- **WHEN** movement would require an upward step greater than the configured climb limit
- **THEN** horizontal movement is blocked, the player remains grounded, and allowance is not spent for the blocked distance

#### Scenario: Field edge or other player
- **WHEN** movement would carry a player outside the battlefield or overlap the other player
- **THEN** movement stops at the nearest valid horizontal position

### Requirement: Falling and reliable landing
Players SHALL fall under gravity when movement walks them off support or terrain destruction removes support. Falling caused by terrain destruction SHALL NOT consume movement allowance. Fire SHALL be disabled while the active player is airborne. Landing SHALL clamp the player's feet to the highest support beneath the full footprint, stop vertical velocity, and complete settling once stable.

#### Scenario: Walk off an edge
- **WHEN** horizontal movement leaves insufficient terrain support beneath the player's footprint
- **THEN** the player falls under gravity, firing remains disabled until landing, and only horizontal input distance reduces allowance

#### Scenario: Crater removes support
- **WHEN** an impact removes the surface under a player
- **THEN** the player falls and lands on the remaining terrain without losing movement allowance because of the fall

#### Scenario: Landing on crater rim
- **WHEN** a falling player's footprint reaches a remaining slope or crater rim
- **THEN** the player stops at the computed support height and the Settling phase completes

### Requirement: Aim follows moved player
The aiming handle, muzzle origin, and trajectory preview SHALL use the active player's current world position. Pointer coordinates SHALL convert from screen coordinates through the active camera transform. Movement or camera scrolling SHALL NOT change the selected world-space firing direction or cause preview/launch disagreement. Ending a turn or beginning a camera transition SHALL clear any active drag without firing.

#### Scenario: Aim after scrolling and movement
- **WHEN** the active player moves, the camera scrolls, and the player drags to a new aim point
- **THEN** the resulting aim uses the displayed screen point converted into world coordinates relative to the player's current position

#### Scenario: Turn transition during drag
- **WHEN** a shot or transition begins while a pointer owns the aim drag
- **THEN** drag ownership is cleared and the drag cannot alter the next player's aim
