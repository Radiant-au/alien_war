# Flame cluster projectile

The fire weapon uses `public/assets/fire_cluster_spritesheet.svg`, a transparent four-frame sheet built from the approved SVG preview's exact flame paths, core gradients, short tails and five-flame layout. Preview scenery, labels, arrows and decorative ember dots are omitted. Small scale changes animate the flame silhouettes without replacing them with particles.

The leading flame anchors to the shot position and the cluster rotates with projectile velocity. Its 112 × 56 screen-pixel footprint remains readable as the battlefield camera zoom changes. Fire flight no longer draws the generic dotted trail. The opening loader and scene preload use the new sheet; the old fire missile sheet is no longer loaded. Other weapons are unchanged.

The five visible flames form one projectile effect. They do not multiply damage, change collision radius, or create extra terrain impacts. Existing procedural fire impact and lingering ground burn remain connected.

Validation: TypeScript checking and all 45 existing tests pass. The SVG was rendered with Inkscape and visually inspected for visible flame shapes and complete frames. Full production bundling and browser gameplay verification remain pending because the local checkout lacks existing binary assets and Chromium is unavailable.
