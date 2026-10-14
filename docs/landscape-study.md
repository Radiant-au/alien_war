# Flat landscape study

The default entry now presents only the flat landscape and control bar from the simple concept. The empty upper field is a solid navy canvas; there are no background images, mountains, moon, characters, health cards, or aiming trajectory.

The landscape is drawn into a generated canvas texture by Phaser: broad hills, teal-to-navy soil, sparse low-contrast polygon stones, dots, a thin green edge, slope-aligned grass, two flowers, and four faceted crystal groups. A single reusable radial halo texture supplies animated crystal glow. Static textures rebuild only on resize. No external raster assets are loaded.

The bottom controls include four selectable spell cards, keyboard-accessible range controls with pointer-draggable circular dials, and Fire, which previews an expanding impact ring. Movement buttons are deliberately disabled until characters return. This is a presentation study, not a playable battle. Existing terrain, projectile, movement and match modules remain available for the next stage; the study's normalized contour does not yet drive those collision modules.

Desktop, narrow portrait and short landscape layouts are supported. Run `npm ci`, `npm run dev`, `npm run build`, and `npm test` as before.
