import type { Item, Side } from "./types";
export const ARENA = {
  width: 1000,
  height: 640,
  cameraTop: -80,
  ground: 460,
  wall: { x: 480, y: 300, width: 40, height: 160 },
  fighters: {
    cat: { x: 170, top: 359, bottom: 424, radius: 35 },
    dog: { x: 830, top: 359, bottom: 424, radius: 35 },
  },
  origins: { cat: { x: 213, y: 370 }, dog: { x: 787, y: 370 } },
} as const;
export const PHYSICS = {
  dt: 1 / 120,
  gravity: 560,
  windAcceleration: 7,
  minPower: 5,
  maxPower: 100,
  minAngle: 20,
  maxAngle: 78,
  defaultAngle: 55,
  chargeRate: 62,
  radius: 9,
} as const;
export const NAMES: Record<Side, string> = { cat: "Blaze", dog: "Major Bark" };
export const ITEMS: Record<
  Item,
  { name: string; symbol: string; description: string }
> = {
  double: {
    name: "Double toss",
    symbol: "×2",
    description: "Two throws, 60% damage each. One use.",
  },
  heavy: {
    name: "Heavy shot",
    symbol: "↓",
    description: "30% more damage, 10% slower arc. One use.",
  },
  shield: {
    name: "Wind shield",
    symbol: "≋",
    description: "Ignore 80% of wind for one throw. One use.",
  },
  heal: {
    name: "Snack break",
    symbol: "+",
    description: "Restore 20 HP instead of throwing. One use.",
  },
};
export const other = (side: Side): Side => (side === "cat" ? "dog" : "cat");
export const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));
