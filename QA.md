# Rebuild verification — 12 September 2026

Final continuation check on 13 September: refreshed the production menu at 1280×800 with no horizontal overflow and captured `public/og.png` from the actual game. This replaces the obsolete social preview artwork.

## Audit and reference

Baseline branch was the previously merged classic-2D implementation (main at 89dd1a3); all 19 baseline tests passed. The previous renderer was DOM, not Three.js. Problems confirmed in source: oscillating charge, grid-search bot, reduced-motion endpoint teleport, duplicated ref/React match state, unowned impact timers, and weakly validated PeerJS messages. Browser observations of the reference covered its intro, player choice, fixed duel composition, top health/wind/items, active-player marker, and hold/release interaction. No reference code or assets were copied.

## Automated mechanics

`npm test`: 16 tests pass. Includes 162 combinations (two sides × three angles × three powers × three winds), deterministic output/interpolation, wall corners, capsule collision, ground/boundary misses, bounded/weighted wind, damage, capped charging, duplicate release, blocked flight input, death, fresh match, pause/resume, large frame gaps, all four items, AI correction, and all three difficulty turn flows. Tests exercise mechanics rather than matching implementation strings.

`npm run lint`: passes without suppressions added.

`npm run build`: passes on Next.js 16.3.5. Main route statically generated; no database or game server required.

`npm install` and compatible `npm audit fix`: completed. `npm audit`: 0 vulnerabilities after patching the inherited dependency versions.

## Browser gameplay

Verified through Playwright-driven Chromium against both development and local production builds:

- Main menu → mode/difficulty → match; Solo Easy, Normal, Hard; local alternating Cat/Dog.
- Pointer hold/release: 85% Cat shot hit Dog, 100 → 77 HP; next turn Dog.
- Keyboard Space: held past maximum, readout stayed 100%; release resolved and returned Cat turn.
- Double toss: two simulated shots, one charge consumed, one turn switch. Browser shot caused 14 damage (one projectile hit, the other missed).
- Snack: Dog 63 → 83 HP, immediately used its turn.
- Heavy and wind shield selected and consumed; flight/AI/turn flow completed. Trajectory and damage differences additionally checked by unit tests.
- Full local match: Dog 100 → 77 → 63, healed to 83, then 60 → 37 → 14 → 0. Victory dialog appeared; game input stopped.
- Rematch reset both HP to 100. Return to menu worked. Hard Solo bot produced a real hit (Cat 100 → 77) and returned control.
- Native touch events via Chromium CDP: hold → 78% → release → flight → Dog turn. `touchCancel` returned to aiming with no shot.
- Reduced-motion emulation: shot still in flight 350 ms after release, then completed normally. Low-core branch tested via emulated hardwareConcurrency; not a physical low-end device benchmark.
- Pause/resume dialog and sound toggle verified. Native dialogs provide focus trapping and Escape handling.
- Production console: 0 errors, 0 warnings during checks.

## Responsive coverage

320×800, 375×812, 390×844, 414×896, 768×1024, 1024×768, 1280×800, 1440×900, 844×390.
All had no page-level horizontal overflow; complete throw button visible within viewport. Portrait remains playable. Landscape uses a smaller uncropped stage with controls outside the projectile corridor. Fixed camera includes 80 extra world pixels above the original viewport for high arcs.

Screenshots: `docs/qa/battle.png`, `docs/qa/landscape.png`. Additional transient screenshots remain in ignored `output/playwright/`.

## Performance and limits

- No Three.js, PeerJS, raster character loads, per-frame React state, or bot trajectory search.
- Background cached in an offscreen canvas; reusable Path2D objects cached with a fixed bound; trails/particles bounded; DPR capped at 2 (1.25 on low-core devices).
- Local production browser sampled 179 rAF intervals: mean 11.11 ms, p95 11.20 ms on this machine. This is scheduling evidence on a roughly 90 Hz browser, not proof of 60 FPS on all phones or a before/after benchmark.
- Safari/iOS and physical low-end devices have not been tested. Fullscreen support is browser-dependent and failures are non-blocking.
- Online and six-hero selection are intentionally not shipped in this two-character rebuild. Old code/assets remain recoverable in Git. Reintroducing online should use a separately tested authoritative adapter for items, multi-projectiles, and rematches.
- Reference timing/physics were independently tuned from observations and the brief, not extracted. Longer human playtesting remains valuable for difficulty and wind balance.
