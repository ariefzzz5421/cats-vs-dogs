# Arcade setup and roster verification — 30 September 2026

## Aim, wind, weapon and readability polish — 30 September 2026

- Audited `origin/main` and the live production URL before editing. Both still serve the older Customize interface; this polish continues the unmerged arcade-redesign branch and does not alter production directly.
- Added rounded UI typography and a larger responsive type scale for setup, roster, trick descriptions, and battle controls. Setup actions now keep consistent bottom alignment; the fighter preview no longer clips its lower explanation.
- Ten distinct vector weapons share one data-driven renderer for held, flying, trail and impact presentation. Six center-wall skins share the unchanged collision rectangle.
- The aiming guide is a curved directional arrow sampled from the actual fixed-step `simulateShot` result. It shortens before first wall, fighter, ground, or boundary collision and extends while charging. Cat and Dog arrowheads follow their respective trajectory tangents.
- The top-center wind barometer shows direction, numeric strength, category and turn. Wind was already generated once per turn with weighted randomness and applied as horizontal acceleration; this pass exposes those mechanics more clearly without changing the physics or game rules.
- Added four regression tests for wind directions/strength, slow-vs-fast drift, arrow/contact sampling and wind labels. **37 tests passed**, lint passed and the production build passed.
- Local production-build Chromium: inspected setup and battle at 1920×1080, 1366×768, 390×844 and 844×390; tested pointer charging, solo bot response, local Cat and Dog Space throws, and confirmed no page-level horizontal overflow. Physical-device/Safari performance and balance are still unverified.
- Browser console: zero errors and warnings in the final verification run. Screenshots: `docs/qa/polish-fighters.png` and `docs/qa/polish-landscape.png`.

## Current release

- Mandatory Home → Mode → Arena → Fighters → three-item Loadout → Ready → Battle flow. Saved selections remain highlighted, but an arena must be explicitly chosen on every fresh setup. Legacy appearance/difficulty preferences migrate safely.
- Six distinct arena environments, ten original vector fighters, ten matching normal weapons, ten one-use signatures, and seven selectable tricks. No downloaded game assets, additional rendering framework, or new dependencies.
- Baseline fixed-step physics, collision geometry, 100 HP, charging, local turns, approximate solo AI, pause, sound, fullscreen and keyboard/pointer input preserved. Signature and item modifiers are centralized; baseline normal-shot trajectories remain unchanged.
- Automated validation: **33 tests passed**, lint passed, production build passed. Includes 54 baseline shot combinations and 270 signature combinations across angles/power/wind, deterministic results, bounce handling, bounded damage, stock exclusivity, retries, settings validation and legacy migration.
- Chromium production-build QA: all six arena selections; all ten fighter/signature selections and consumption; all seven tricks. Snack Time restored 77 → 97 HP and consumed its turn. Second Chance allowed one retry only. Charge capped at 100% with MAX POWER feedback.
- Solo Easy, Normal and Hard completed bot turns and returned control. Local match reached victory, rematch restored 100/100 HP, menu return worked. Pointer and Space throws, pause/resume, tutorial, sound and fullscreen passed.
- Layouts checked at 1920×1080, 1366×768, 1024×768, 390×844 and 844×390: no horizontal page overflow; throw control remains visible. Short landscape uses a compact side control rail.
- Emulated mobile touch at 390×844: hold → 81% → release → real flight → damage and next turn. Reduced-motion and low-core rendering tested together; backing-canvas DPR capped at 1.25. This is emulation, not a physical-device benchmark.
- Browser console: zero errors and warnings during the verification session.
- Performance: cached arena backgrounds, static thumbnails, 30 FPS menu previews, bounded particles/path cache, imperative charge readout and no per-frame React projectile updates. No claim of measured 60 FPS on physical phones.
- Evidence: `docs/qa/arcade-home.png`, `arcade-roster.png`, `arcade-battle.png`, `arcade-landscape.png`, `arcade-result.png`.
- Remaining checks: physical Android/iOS and Safari; extended balance/playtesting of signature combinations. Existing production architecture does not currently include online rooms; this release does not add or remove online networking.

## Historical rebuild verification — 12 September 2026

## Icon and menu refresh — 13 September 2026

- Added original inline SVG fishbone/bone weapons, four illustrated skills, angle/power, mode, sound, pause and fullscreen icons. No new dependencies or image requests for these icons.
- Refreshed team wordmark, play ticket and mode selector. Reflowed desktop skills into a wider compact row; kept controls outside the arena.
- Production Chromium: real pointer charge activates `weapon-charge`, release resolves a shot and changes to Dog's bone icon; Heavy skill selection works on Dog's turn. Reduced-motion reports animation `none`. Native touch cancellation returns to aiming. No console errors or warnings.
- Menu checked at 320, 375, 414, 768, 1024, 1280, 1440 and 844-landscape widths; battle at 320, 375, 390, 414, 768, 1280 and 844-landscape. No horizontal overflow. Landscape throw control fits after reducing stage height; skill description stays visible.
- Existing 16 mechanics tests, lint and production build pass. Engine, bot, damage and item rules unchanged. SVG/CSS feedback uses transforms/opacity and no React frame updates. Physical device/Safari checks remain outstanding.
- Screenshots: `docs/qa/icons-menu.png`, `docs/qa/icons-battle.png`, `docs/qa/icons-mobile.png`.

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
