# Compact controls, music loudness and combat polish

Weapon choices keep the existing electric/poison/fire/ice JPEG pictures. Buttons add short names, rounded dark frames and a subtle cyan selected border; no damage numbers appear on buttons or hover text. Four buttons remain one row on wide screens and use a compact 2×2 layout on small phones. The user's wheel styling is retained, with the wheel docked in a reserved left toolbar lane to keep it below the battlefield. The FIRE button stays separate.

Options has a saved Music Boost switch, enabled for existing settings by default. It adds 1.6× music-bus gain, with the existing output peak limiter protecting the mix. Turning it off restores unity at 100% volume. Source files and decoded recordings are unchanged. This is a loudness improvement, not restoration of missing source quality. The HTML audio fallback remains limited to its native maximum volume.

Cosmetic combat additions:
- Directional 160 ms muzzle effects: electric snap, green pressure puff, flame tongue and icy star.
- Acid crown, flying drops, terrain-conforming puddle and cycling bubbles. Puddle duration follows remaining poison time, including a fade within that lifetime.
- Hull hit flash, plasma arcs, poison drips, and flickering fire tongues attached to the same facing/tilt/bob/recoil transform as the hull. Existing Cryo coating stays intact.
- Teal soil and purple crystal chips at destructive impacts, plus hull fragments and fading energy on elimination. Battle results wait 0.55 seconds so the final burst can finish.
- Four low-alpha spores and subtle engine exhaust. Existing crystal lighting stays in place.

Effects use bounded arrays, simulation time, reduced-motion variants and explicit reset/shutdown cleanup. No health, damage, movement or weapon balance changes are introduced.

Validation: 63 tests, TypeScript and production build pass. New renderer tests exercise the actual effect class through a graphics adapter, covering directional muzzle expiry, pool limits, acid lifetime, elimination deduplication and reset cleanup. Audio tests cover boost on/off, mute and untouched decoded samples. Browser visual verification was attempted but the cloud browser could not reach the workspace server. Original large music/loading assets are represented by local test stand-ins only; none are included in this PR. Listening validation on the original full music tracks remains outstanding.
