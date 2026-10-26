# Cryo presentation

The active Phaser scene replaces the old tall spikes with a compact six-ray icy impact, a fast spreading frost ribbon, small ice chips and surface mist. Frost samples the current terrain contour every frame, including after craters.

Surviving ships within the blast radius get a translucent ice coating and snowflake marker for 2.5 seconds. The overlay uses the same hull transform as the ship, following its position, slope, facing and recoil. It fades in, holds, then brightens its cracks and releases small fragments during the final 0.55 seconds. Repeated hits refresh that ship's visual timer. Terrain effects are bounded to eight simultaneous patches and expire. Restart clears everything; pause freezes time. Reduced motion omits moving mist/chips and thaw fragments.

This is visual only: damage, fuel, movement, turns and projectile behavior are unchanged. No generated sprites or added asset downloads are required.

Validation: 58 existing tests and production build. Browser checks cover impact/frozen/thaw frames, expiry, restart cleanup, unchanged health/fuel, pause/navigation, and no page errors. Large original music/loading images use local test stand-ins only; those files are not part of this change.
