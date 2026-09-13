import { ARENA, PHYSICS, clamp, other } from "./constants";
import type { BallisticResult, ShotInput, TrajectoryPoint } from "./types";
export function powerToVelocity(power: number) {
  return 200 + clamp(power, PHYSICS.minPower, PHYSICS.maxPower) * 5;
}
/** Circle against the same vertical capsule that the artist draws around. */
export function characterCollision(
  x: number,
  y: number,
  side: "cat" | "dog",
  radius: number = PHYSICS.radius,
) {
  const body = ARENA.fighters[side];
  return (
    Math.hypot(x - body.x, y - clamp(y, body.top, body.bottom)) <=
    body.radius + radius
  );
}
export function wallCollision(
  x: number,
  y: number,
  radius: number = PHYSICS.radius,
) {
  const wall = ARENA.wall;
  return (
    Math.hypot(
      x - clamp(x, wall.x, wall.x + wall.width),
      y - clamp(y, wall.y, wall.y + wall.height),
    ) <= radius
  );
}
export function calculateDamage(speed: number, item?: ShotInput["item"]) {
  const normal = clamp(Math.round(15 + speed / 75), 15, 25);
  return Math.round(
    normal * (item === "heavy" ? 1.3 : item === "double" ? 0.6 : 1),
  );
}
/** Pure fixed-step simulation. Collision selects the outcome; no hidden target power. */
export function simulateShot(input: ShotInput): BallisticResult {
  if (![input.angle, input.power, input.wind].every(Number.isFinite))
    throw new RangeError("Shot inputs must be finite");
  const angle = (clamp(input.angle, 20, 78) * Math.PI) / 180;
  const velocity =
    powerToVelocity(input.power) * (input.item === "heavy" ? 0.9 : 1);
  const wind =
    clamp(input.wind, -10, 10) *
    PHYSICS.windAcceleration *
    (input.item === "shield" ? 0.2 : 1);
  let point: TrajectoryPoint = {
    ...ARENA.origins[input.side],
    vx: Math.cos(angle) * velocity * (input.side === "cat" ? 1 : -1),
    vy: -Math.sin(angle) * velocity,
    time: 0,
  };
  const points = [point];
  const target = other(input.side);
  for (let tick = 1; tick <= 1200; tick++) {
    const vx = point.vx + wind * PHYSICS.dt,
      vy = point.vy + PHYSICS.gravity * PHYSICS.dt;
    point = {
      x: point.x + vx * PHYSICS.dt,
      y: point.y + vy * PHYSICS.dt,
      vx,
      vy,
      time: tick * PHYSICS.dt,
    };
    points.push(point);
    // Maximum legal step is smaller than the smallest collision diameter (18 px).
    const kind = characterCollision(point.x, point.y, target)
      ? "target"
      : wallCollision(point.x, point.y)
        ? "wall"
        : point.y + PHYSICS.radius >= ARENA.ground
          ? "ground"
          : point.x < -PHYSICS.radius ||
              point.x > ARENA.width + PHYSICS.radius ||
              point.y < -100
            ? "boundary"
            : null;
    if (kind)
      return {
        input,
        points,
        impact: {
          kind,
          point,
          target: kind === "target" ? target : undefined,
          damage:
            kind === "target"
              ? calculateDamage(Math.hypot(vx, vy), input.item)
              : 0,
        },
      };
  }
  return { input, points, impact: { kind: "boundary", point, damage: 0 } };
}
export function trajectoryPointAt(
  result: BallisticResult,
  elapsed: number,
): TrajectoryPoint {
  const index = clamp(
    Math.floor(elapsed / PHYSICS.dt),
    0,
    result.points.length - 1,
  );
  const a = result.points[index],
    b = result.points[index + 1] ?? a;
  const mix = clamp((elapsed - a.time) / PHYSICS.dt, 0, 1);
  return {
    x: a.x + (b.x - a.x) * mix,
    y: a.y + (b.y - a.y) * mix,
    vx: a.vx + (b.vx - a.vx) * mix,
    vy: a.vy + (b.vy - a.vy) * mix,
    time: elapsed,
  };
}
export function randomUnit(seed: number) {
  let n = (seed + 0x6d2b79f5) | 0;
  n = Math.imul(n ^ (n >>> 15), n | 1);
  n ^= n + Math.imul(n ^ (n >>> 7), n | 61);
  return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
}
/** Triangular distribution makes extreme wind rarer than moderate wind. */
export function makeDeterministicWind(seed: number, turn: number) {
  const n = seed + turn * 1709;
  const wind =
    Math.round((randomUnit(n) + randomUnit(n + 9137) - 1) * 100) / 10;
  return Math.abs(wind) < 0.7 ? 0 : wind;
}
