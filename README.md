# Cats vs Dogs — Backyard Rumble

An original side-on browser artillery game built with Next.js, React Three Fiber, Three.js, and PeerJS.

## Game modes

- Solo versus a physics-aware bot with Easy, Medium, Hard, and Expert difficulty
- Local two-player pass-and-play on one device
- Online peer-to-peer rooms with host-authoritative match state

## Controls

- Drag vertically or use the angle slider to aim.
- Hold `Space` or the throw button to charge power.
- Release to throw. Wind changes each turn and physically changes the trajectory.

The same fixed-timestep ballistics module drives every mode. Collision with the rival, center wall, ground, or arena boundary determines the result; hit and damage are never chosen before the projectile flies.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Validation

```bash
npm run lint
npm test
npm run build
```

Art rules for future characters and arenas live in `ART_DIRECTION.md`; UI rules live in `design.md`.
