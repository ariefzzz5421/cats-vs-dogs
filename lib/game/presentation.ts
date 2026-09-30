import { clamp } from "./constants";
import type { Phase } from "./types";

export const THROW_DURATION = 0.24;

const easeOut = (progress: number) => 1 - (1 - progress) ** 3;

/** Screen-only impact motion. The fighter's collision box stays at its arena position. */
export function hitMotion(age: number, damage: number) {
  const time = clamp(age, 0, 0.36);
  const strength = clamp(damage / 25, 0.6, 1.2);
  const push = easeOut(clamp(time / 0.055, 0, 1));
  const settle = 1 - easeOut(clamp((time - 0.055) / 0.29, 0, 1));
  const deformation = Math.sin((time / 0.34) * Math.PI * 2) * settle * strength;
  return {
    knockback: 13 * strength * push * settle,
    scaleX: 1 + deformation * 0.07,
    scaleY: 1 - deformation * 0.055,
    tilt: -0.065 * strength * push * settle,
  };
}

export function cameraKick(age: number, damage: number) {
  const fade = (1 - clamp(age / 0.16, 0, 1)) ** 2;
  const strength = clamp(damage / 25, 0.5, 1.2);
  return {
    x: Math.sin(age * 95) * 2.5 * fade * strength,
    y: Math.sin(age * 123) * 1.5 * fade * strength,
  };
}

/** Throw choreography shares the engine's release time; it never drives physics. */
export function throwPose(phase: Phase, elapsed: number, power: number) {
  const tension = clamp(power / 100, 0, 1);
  if (phase === "charging") return { arm: -0.25 - tension * 1.1, lean: -tension * 0.12 };
  if (phase === "throwing") {
    const progress = clamp(elapsed / THROW_DURATION, 0, 1);
    const swing = easeOut(progress);
    return { arm: (-0.25 - tension * 1.1) * (1 - swing) + 0.52 * swing, lean: -0.12 * tension * (1 - swing) + 0.07 * swing };
  }
  if (phase === "flying") {
    const recovery = 1 - easeOut(clamp(elapsed / 0.3, 0, 1));
    return { arm: -0.25 + 0.77 * recovery, lean: 0.07 * recovery };
  }
  return { arm: -0.25, lean: 0 };
}
