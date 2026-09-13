# Backyard Rumble — original Canvas art

Two rivals, one warm backyard. Flat hand-shaped outlines, not procedural 3D or photorealistic animals.

UI icon family: original 64×64 SVG silhouettes, 2.8px rounded ink outlines, cream bone with ochre underside. Cat uses fish head/ribs/tail; Dog uses a rounded chew bone. Double layers two silhouettes, Heavy adds a metal cuff and impact burst, Shield uses a wind-deflecting shield, Snack uses a food bowl. Icons share these shapes across the menu, skills, and animated throw control. Charge pulls the weapon back; release snaps it forward; flight adds two short motion lines. No idle looping UI motion. Reduced motion stops these effects.

- Fixed side view. 1000×640 logical pixels, camera top at world y=−80 and ground at y=460. Uniform display scaling leaves even the highest legal arc visible.
- Blaze: orange tabby, angular ears, slim curling tail, cyan triangular bandana, smug half-smile.
- Major Bark: blue-grey dog, floppy ears, round cheek pads, short curling tail, rust collar and gold tag.
- Both heads are about 45% of body height. Paws oversized; face readable at mobile size. Main bodies align with shared capsule hitboxes; ears/tails are decorative extremities.
- Thick blue-charcoal outer edges (3 logical px), thin face detail (1.5–2 px). No baked glossy lighting. Cream muzzles and eye whites.
- Warm cream menu; cyan Cat and rust Dog accents; mustard charge/wind; quiet blue sky and olive grass. Named Canvas palette in renderer; named UI tokens in tokens.css.
- One soft oval contact shadow. Feet anchor every reaction. Head/arm/torso/tail drawn separately.
- Charge: backward lean and squash, independent raised throwing arm. Throw: 160 ms anticipation then forward follow-through.
- Hit: short recoil, surprised mouth, dust/stars and number. Miss: brief opponent bounce. Victory: small celebratory hop. Defeat: grounded slump.
- Reduced motion keeps facial pose and essential projectile motion; no shake, particles, leaves, body bob, or cloud drift.
- Background never obscures a shot. Wall uses the exact arena rectangle; no decorative collider outside it.
- Future characters must share this scale, outline weight, palette logic and animation anchors. Never import assets from the reference.
