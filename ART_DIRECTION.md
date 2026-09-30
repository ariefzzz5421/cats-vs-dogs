# Backyard Rumble — original Canvas art

Two rivals, one warm backyard. Flat hand-shaped outlines, not procedural 3D or photorealistic animals.

UI icon family: original 64×64 SVG silhouettes, 2.8px rounded ink outlines, cream bone with ochre underside. Cat uses fish head/ribs/tail; Dog uses a rounded chew bone. Double layers two silhouettes, Heavy adds a metal cuff and impact burst, Shield uses a wind-deflecting shield, Snack uses a food bowl. Icons share these shapes across the menu, skills, and animated throw control. Charge pulls the weapon back; release snaps it forward; flight adds two short motion lines. No idle looping UI motion. Reduced motion stops these effects.

- Fixed side view. 1000×640 logical pixels, camera top at world y=−80 and ground at y=460. Uniform display scaling leaves even the highest legal arc visible.
- Blaze: orange tabby, angular ears, slim curling tail, cyan triangular bandana, smug half-smile.
- Major Bark: blue-grey dog, floppy ears, round cheek pads, short curling tail, rust collar and gold tag.
- Both heads are about 45% of body height. Paws oversized; face readable at mobile size. Main bodies align with shared capsule hitboxes; ears/tails are decorative extremities.
- Thick blue-charcoal outer edges (3 logical px), thin face detail (1.5–2 px). No baked glossy lighting. Cream muzzles and eye whites.
- Warm cream setup surfaces; cyan Cat and rust Dog accents; mustard charge/wind; quiet blue sky and olive grass. Data-driven Canvas palettes in themes.ts; named UI tokens in tokens.css. Home composition places two large original rivals around the central play ticket, without duplicate background fighters.
- One soft oval contact shadow. Feet anchor every reaction. Head/arm/torso/tail drawn separately.
- Charge: backward lean and squash, independent raised throwing arm and a curved power dial above the fighter. Throw: 240 ms continuous wind-up/swing then physical release and 300 ms recovery. A short fading ballistic hint responds to angle and charging power, stopping at collision or 430 ms of flight (700 ms for Rex's limited signature). It does not reveal the landing point.
- Hit: short recoil, surprised mouth, dust/stars and number. Miss: brief opponent bounce. Victory: small celebratory hop. Defeat: grounded slump.
- Reduced motion keeps facial pose and essential projectile motion; no shake, particles, leaves, body bob, or cloud drift.
- Background never obscures a shot. Wall uses the exact arena rectangle; no decorative collider outside it.
- Future characters must share this scale, outline weight, palette logic and animation anchors. Never import assets from the reference.

## Expanded roster and arena language

Characters are original layered Canvas vectors used in roster tiles, portraits, battle and results. A single typed character definition controls colors, markings, proportions, accessory and weapon.
Shadow is slender, masked and caped; Mochi has a fluffy silhouette and bow; Pixel is tiny calico with goggles; Captain Paws has a broad body, tricorn and patch. Bruno is a broad mastiff with harness; Bolt is lanky and scarfed; Rex has pointed ears and harness; Biscuit has short corgi proportions, pointed ears and bow. Each has different idle/celebration cadence. Decorative size changes do not alter collision capsules.
Rooftops add skyline, antennas, roof tiles and planter edges. Rainy alley adds wet pavement, puddles, ripples and bounded rain. Sakura has pink canopies and a garden lantern; Moonlight has fireflies. Rain does not change physical friction or wind rules.
No downloaded artwork, reference audio or sprites. SVG trick icons share the original thick-edge vocabulary; Curve, Retry and Lucky extend it.
