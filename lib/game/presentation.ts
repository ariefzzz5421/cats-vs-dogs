import { clamp } from "./constants";
import type { Phase } from "./types";

export const THROW_DURATION = 0.24;
export const FIGHTER_VISUAL_SCALE = 1.24;

const easeOut = (progress: number) => 1 - (1 - progress) ** 3;

/** Screen-only impact motion. The fighter's collision box stays at its arena position. */
export function hitMotion(age: number, damage: number) {
  // The first frames hold the pose visually; simulation and damage keep running.
  const time = clamp(Math.max(0, age - 0.038), 0, 0.42);
  const strength = clamp(damage / 25, 0.6, 1.2);
  const push = easeOut(clamp(time / 0.07, 0, 1));
  const settle = 1 - easeOut(clamp((time - 0.07) / 0.35, 0, 1));
  const deformation = Math.sin((time / 0.42) * Math.PI * 2) * settle * strength;
  const impactSquash = (1 - easeOut(clamp(time / 0.06, 0, 1))) * strength;
  return {
    knockback: 19 * strength * push * settle,
    scaleX: 1 + impactSquash * 0.12 + deformation * 0.11,
    scaleY: 1 - impactSquash * 0.1 - deformation * 0.085,
    tilt: -0.085 * strength * push * settle,
  };
}

export function cameraKick(age: number, damage: number) {
  const fade = (1 - clamp(age / 0.22, 0, 1)) ** 2;
  const strength = clamp(damage / 25, 0.5, 1.2);
  return {
    x: Math.sin(age * 95) * 2.8 * fade * strength,
    y: Math.sin(age * 123) * 1.8 * fade * strength,
  };
}

/** Visual camera intent only. World positions and collisions never use it. */
export function cameraTarget(projectile?: { x: number; y: number }) {
  if (!projectile) return { x: 0, y: 0, zoom: 1 };
  const highArc = clamp((-projectile.y - 30) / 230, 0, 1);
  return {
    x: clamp((500 - projectile.x) * 0.045, -14, 14),
    y: clamp((160 - projectile.y) * 0.045, -8, 8),
    zoom: 1 - highArc * 0.035,
  };
}

/** Throw choreography shares the engine's release time; it never drives physics. */
export function throwPose(phase: Phase, elapsed: number, power: number) {
  const tension = clamp(power / 100, 0, 1);
  if (phase === "charging") return { arm: -0.25 - tension * 1.28, lean: -tension * 0.17 };
  if (phase === "throwing") {
    const progress = clamp(elapsed / THROW_DURATION, 0, 1);
    const swing = easeOut(clamp((progress - 0.1) / 0.9, 0, 1));
    return { arm: (-0.25 - tension * 1.28) * (1 - swing) + 0.6 * swing, lean: -0.17 * tension * (1 - swing) + 0.09 * swing };
  }
  if (phase === "flying") {
    const recovery = 1 - easeOut(clamp(elapsed / 0.38, 0, 1));
    return { arm: -0.25 + 0.85 * recovery, lean: 0.09 * recovery };
  }
  return { arm: -0.25, lean: 0 };
}
