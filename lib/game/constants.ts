import type { ProjectileProperties, ProjectileType, Side, Vec2 } from "./types";

export const PHYSICS = {
  fixedDt: 1 / 120,
  gravity: -9.4,
  maxFlightTime: 6,
  windAcceleration: 1.45,
  minAngle: 20,
  maxAngle: 78,
  minPower: 8,
  maxPower: 100,
  minVelocity: 5.15,
  velocityRange: 7.05,
} as const;

export const ARENA = {
  groundY: 0,
  minX: -5.65,
  maxX: 5.65,
  maxY: 7.4,
  wall: { minX: -0.34, maxX: 0.34, minY: 0, maxY: 2.22 },
  characters: {
    cat: { center: { x: -3.42, y: 0.86 }, radius: 0.7 },
    dog: { center: { x: 3.42, y: 0.86 }, radius: 0.72 },
  },
  origins: {
    cat: { x: -2.82, y: 1.32 },
    dog: { x: 2.82, y: 1.32 },
  },
} as const;

export const PROJECTILES: Record<ProjectileType, ProjectileProperties> = {
  fishbone: { radius: 0.13, mass: 0.92, drag: 0.0018, baseDamage: 17 },
  "rubber-bone": { radius: 0.15, mass: 1.08, drag: 0.0015, baseDamage: 18 },
};

export const DEFAULT_ANGLES: Record<Side, number> = { cat: 48, dog: 48 };

export function opponentOf(side: Side): Side {
  return side === "cat" ? "dog" : "cat";
}

export function originFor(side: Side): Vec2 {
  return { ...ARENA.origins[side] };
}

export function targetFor(side: Side) {
  return ARENA.characters[opponentOf(side)];
}

export function projectileFor(side: Side): ProjectileType {
  return side === "cat" ? "fishbone" : "rubber-bone";
}
