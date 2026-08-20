import { ARENA, PHYSICS, PROJECTILES, opponentOf, originFor, targetFor } from "./constants";
import type { BallisticResult, ImpactKind, ImpactResult, ProjectileProperties, ShotInput, TrajectoryPoint, Vec2 } from "./types";

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const distance = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.y - b.y);

export function powerToVelocity(power: number) {
  const normalized = clamp(power, PHYSICS.minPower, PHYSICS.maxPower) / PHYSICS.maxPower;
  return PHYSICS.minVelocity + normalized * PHYSICS.velocityRange;
}

export function calculateDamage(speed: number, distanceFromCenter: number, projectile: ProjectileProperties) {
  const centerBonus = clamp(1 - distanceFromCenter / 0.72, 0, 1) * 5;
  return clamp(Math.round(projectile.baseDamage + speed * 0.58 + centerBonus), 15, 30);
}

function circleCollision(position: Vec2, center: Vec2, radius: number) {
  return distance(position, center) <= radius;
}

function expandedWallCollision(position: Vec2, radius: number) {
  return position.x >= ARENA.wall.minX - radius
    && position.x <= ARENA.wall.maxX + radius
    && position.y >= ARENA.wall.minY
    && position.y <= ARENA.wall.maxY + radius;
}

function makeImpact(kind: ImpactKind, point: TrajectoryPoint, damage = 0, target?: "cat" | "dog"): ImpactResult {
  const speed = Math.hypot(point.vx, point.vy);
  return {
    kind,
    position: { x: point.x, y: Math.max(ARENA.groundY, point.y) },
    velocity: { x: point.vx, y: point.vy },
    speed,
    time: point.time,
    target,
    damage,
  };
}

function integrateShot(input: ShotInput, recordTrajectory: boolean): BallisticResult {
  const projectile = PROJECTILES[input.projectileType];
  const origin = originFor(input.side);
  const targetSide = opponentOf(input.side);
  const target = targetFor(input.side);
  const direction = input.side === "cat" ? 1 : -1;
  const radians = (clamp(input.angle, PHYSICS.minAngle, PHYSICS.maxAngle) * Math.PI) / 180;
  const velocity = powerToVelocity(input.power);

  let x = origin.x;
  let y = origin.y;
  let vx = Math.cos(radians) * velocity * direction;
  let vy = Math.sin(radians) * velocity;
  let time = 0;
  let closestTargetDistance = Number.POSITIVE_INFINITY;
  let maxHeight = y;
  const initialPoint: TrajectoryPoint = { x, y, vx, vy, time };
  let lastPoint = initialPoint;
  const points: TrajectoryPoint[] = [initialPoint];
  let impact: ImpactResult | null = null;

  while (time < PHYSICS.maxFlightTime) {
    const dragX = projectile.drag * vx * Math.abs(vx);
    const dragY = projectile.drag * vy * Math.abs(vy);
    vx += ((input.wind * PHYSICS.windAcceleration) / projectile.mass - dragX) * PHYSICS.fixedDt;
    vy += (PHYSICS.gravity - dragY) * PHYSICS.fixedDt;
    x += vx * PHYSICS.fixedDt;
    y += vy * PHYSICS.fixedDt;
    time += PHYSICS.fixedDt;

    const point = { x, y, vx, vy, time };
    lastPoint = point;
    if (recordTrajectory) points.push(point);
    maxHeight = Math.max(maxHeight, y);
    const targetDistance = distance(point, target.center);
    closestTargetDistance = Math.min(closestTargetDistance, targetDistance);

    if (time > 0.12 && circleCollision(point, target.center, target.radius + projectile.radius)) {
      impact = makeImpact("target", point, calculateDamage(Math.hypot(vx, vy), targetDistance, projectile), targetSide);
      break;
    }
    if (expandedWallCollision(point, projectile.radius)) {
      impact = makeImpact("wall", point);
      break;
    }
    if (y - projectile.radius <= ARENA.groundY && time > PHYSICS.fixedDt * 2) {
      impact = makeImpact("ground", point);
      break;
    }
    if (x < ARENA.minX || x > ARENA.maxX || y > ARENA.maxY) {
      impact = makeImpact("boundary", point);
      break;
    }
  }

  if (!recordTrajectory && impact) points.push({
    x: impact.position.x,
    y: impact.position.y,
    vx: impact.velocity.x,
    vy: impact.velocity.y,
    time: impact.time,
  });
  const finalPoint = impact ? (points.at(-1) ?? lastPoint) : lastPoint;
  return {
    input,
    points,
    impact: impact ?? makeImpact("boundary", finalPoint),
    closestTargetDistance,
    maxHeight,
  };
}

export function simulateShot(input: ShotInput): BallisticResult {
  return integrateShot(input, true);
}

/** Fast deterministic evaluation for AI search. It runs identical physics and
 * collision rules but stores only the origin and final impact point. */
export function evaluateShot(input: ShotInput): BallisticResult {
  return integrateShot(input, false);
}

export function trajectoryPointAt(result: BallisticResult, elapsed: number) {
  const points = result.points;
  if (elapsed <= 0) return points[0];
  if (elapsed >= result.impact.time) return points.at(-1) ?? points[0];
  const index = clamp(Math.floor(elapsed / PHYSICS.fixedDt), 0, points.length - 2);
  const current = points[index];
  const next = points[index + 1];
  const local = clamp((elapsed - current.time) / Math.max(PHYSICS.fixedDt, next.time - current.time), 0, 1);
  return {
    x: current.x + (next.x - current.x) * local,
    y: current.y + (next.y - current.y) * local,
    vx: current.vx + (next.vx - current.vx) * local,
    vy: current.vy + (next.vy - current.vy) * local,
    time: elapsed,
  };
}

export function makeDeterministicWind(seed: number, turnIndex: number) {
  let value = (seed ^ Math.imul(turnIndex + 1, 0x9e3779b1)) >>> 0;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  const normalized = (value >>> 0) / 0xffffffff;
  const wind = (normalized * 2 - 1) * 0.92;
  return Math.abs(wind) < 0.09 ? 0 : Math.round(wind * 100) / 100;
}

export function windToKmh(wind: number) {
  return Math.round(Math.abs(wind) * 18);
}
