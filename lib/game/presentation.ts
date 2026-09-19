import { clamp } from "./constants";
import type { Phase } from "./types";

export const THROW_DURATION = 0.24;

/** Throw choreography shares the engine's release time; it never drives physics. */
export function throwPose(phase: Phase, elapsed: number, power: number) {
  const tension = clamp(power / 100, 0, 1);
  if (phase === "charging") return { arm: -0.25 - tension * 1.1, lean: -tension * 0.12 };
  if (phase === "throwing") {
    const progress = clamp(elapsed / THROW_DURATION, 0, 1);
    const swing = progress * progress * (3 - 2 * progress);
    return { arm: (-0.25 - tension * 1.1) * (1 - swing) + 0.52 * swing, lean: -0.12 * tension * (1 - swing) + 0.07 * swing };
  }
  if (phase === "flying") {
    const recovery = 1 - clamp(elapsed / 0.3, 0, 1);
    return { arm: -0.25 + 0.77 * recovery, lean: 0.07 * recovery };
  }
  return { arm: -0.25, lean: 0 };
}
