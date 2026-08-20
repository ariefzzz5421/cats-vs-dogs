# Art Direction — Backyard Rumble

All visual assets must look like one original game. Classic backyard artillery games inform the play pattern only; no character, costume, map, UI, or branding is copied.

## Character proportions

- Heads are about 38% of standing height.
- Bodies are compact and pear-shaped with large readable paws.
- Arms and tails have clean, broad arcs that remain legible at 96 px.
- Silhouettes differ by ears, muzzle, torso width, tail, and one signature accessory.

## Edge and sprite treatment

- Clean illustrated cutout characters with broad value separation and restrained fur shapes.
- Use one consistent edge treatment across all six raster portraits; avoid mismatched outline weights.
- Avoid photoreal fur, plastic mascot gloss, and feature-film imitation. Shapes stay matte, tactile, and readable at game scale.

## Color philosophy

- Blaze: orange tabby, red bandana.
- Luna: silver-cream, purple moon charm.
- Shadow: charcoal, acid-green collar.
- Major Bark: blue-grey captain, yellow collar/tag.
- Bruno: warm brown, teal bandana.
- Snow: warm white, coral collar.
- Accessories provide the strongest small accent; fur carries the silhouette.

## Lighting and viewpoint

- Fixed side-facing three-quarter view, eye level slightly above the paws.
- Warm key light from upper-left, cool rim from upper-right.
- Transparent or tightly keyed sprite sources have no baked floor or environmental reflection.
- Character select, battle, hit, and victory states reuse the same portrait identity. Battle physics and presentation remain on the X/Y plane.

## Facial design

- Large readable eyes, compact brows, simple muzzle, strong mouth corners.
- Rivalry is mischievous, never threatening.
- Expressions must read at thumbnail size: focused aim, clenched charge, surprised hit, smug laugh, broad victory, exhausted defeat.

## Accessory rules

- Exactly one signature neck accessory per hero plus an optional small tag.
- No shirts, armor, hats, realistic weapons, or unrelated props.
- Accessories never hide the hands or throwing silhouette.

## Animation principles

- Idle motion is asymmetric and subtle.
- Charge builds anticipation through lean and squash; it never moves the fighter's feet.
- Throw completes within roughly 600 ms; impact reactions within roughly 450 ms.
- Miss taunts are brief and never delay the next turn.
- State motion uses a grounded portrait wrapper so the contact point never slides.
- Reduced-motion mode keeps expression/state changes but removes shake and large displacement.

## Environment

- Primary arena: Backyard Block Party.
- Midground divider and fighters have the highest contrast.
- Houses, bushes, clothesline, bins, bowls, clouds, leaves, and foreground grass establish place without hiding the trajectory.
- Wind animation always agrees with the numeric wind direction.
