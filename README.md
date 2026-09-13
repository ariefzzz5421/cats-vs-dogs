# Cats vs Dogs — Backyard Rumble

An original Canvas artillery game: hold to charge, release to throw, watch the wind.
Next.js + React + TypeScript. No game framework, physics library, database, or login.

## Play

- **Solo:** Easy, Normal, or Hard computer opponent.
- **2 players:** alternate Cat and Dog on one device.
- Hold the arena, throw button, or Space. Release to throw. Power caps at 100% after about 1.5 seconds.
- Optional angle slider: 20–78°. Default is 55°; power and wind alone are enough to learn the game.
- Each player gets one Double toss, Heavy shot, Wind shield, and Snack break. Select before charging; select again to cancel. Snack restores up to 20 HP and consumes the turn.
- Escape pauses. Switching tabs pauses and cancels an unfinished charge. Fullscreen is optional.

## Development

```sh
npm install
npm run dev
npm run lint
npm test
npm run build
```

Open http://localhost:3000. Deploy as a normal Next.js application on Vercel; no environment variables required.

## One production architecture

- `app/components/GameExperience.tsx`: menus, accessible controls, pointer capture, keyboard, settings, and the animation-loop adapter.
- `lib/game/engine.ts`: one authoritative match state machine. It owns turns, item inventory, charge, damage, pause, and game-over. No browser timers or React dependencies.
- `lib/game/ballistics.ts`: pure 120 Hz integration and collision, with interpolated trajectory playback. Wind is deterministic and triangularly distributed on a −10…10 scale.
- `lib/game/bot.ts`: approximate wind compensation, difficulty-dependent noise, and remembered short/long correction. No search for perfect shots.
- `lib/game/renderer.ts`: original vector characters, environment, projectiles, and effects, all drawn on Canvas. Background painted once to an offscreen canvas. Visual wall coordinates come directly from physics constants.
- `lib/game/audio.ts`: original synthesized Web Audio cues; audio failure never gates a match.
- `tests/game.test.ts`: mechanics tests, including a 162-shot angle/power/wind/side matrix.

Rendering uses a bounded DPR (2, or 1.25 on low-core devices), a fixed-step accumulator, and interpolation. React publishes only meaningful state changes; power and projectile frames do not cause React renders. Large frame deltas are clamped. Reduced motion preserves complete flight while disabling decorative movement and particles.

The old DOM arena, roster-selection UI, unused raster roster assets, duplicate CSS, and PeerJS transport were removed. Online is intentionally not exposed in this rebuild: adapting its loosely validated message protocol to new multi-projectile/item state needs a separate tested host-authority adapter. Git history retains the previous implementation. The current release prioritizes Solo and local play, as requested.

## Reference and originality

Reference observed in-browser: https://www.gimori.com/game/cat-vs-dog
Mechanics observed: hold on the active fighter, release to throw, fixed side view, central fence, upper wind/health/items, alternate turns, and compact player-mode selection.
No reference sprites, audio, source, or other proprietary assets are shipped. Characters, backyard, projectiles, and synthesized sounds are original. Timing/physics constants are independently tuned, not claimed as extracted from the reference.

Art rules: `ART_DIRECTION.md`. QA evidence and outstanding limits: `QA.md`.
