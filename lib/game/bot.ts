import { ARENA, clamp } from "./constants";
import { randomUnit } from "./ballistics";
import type { BallisticResult, BotMemory, Difficulty } from "./types";
export const BOT_PROFILES = {
  easy: { error: 15, wind: 0.2, learning: 0.25, delay: 1.05 },
  normal: { error: 8, wind: 0.6, learning: 0.5, delay: 0.8 },
  hard: { error: 3.5, wind: 0.9, learning: 0.75, delay: 0.65 },
};
export const freshBot = (): BotMemory => ({
  power: 75,
  lastWind: 0,
  correction: 0,
});
/** Estimate, don't solve: remembered strength + approximate wind compensation + error. */
export function chooseBotShot(
  memory: BotMemory,
  wind: number,
  difficulty: Difficulty,
  seed: number,
) {
  const profile = BOT_PROFILES[difficulty];
  return {
    angle: 55,
    power: clamp(
      memory.power +
        wind * profile.wind * 1.5 +
        (randomUnit(seed) * 2 - 1) * profile.error,
      12,
      100,
    ),
  };
}
export function learnFromShot(
  memory: BotMemory,
  result: BallisticResult,
  difficulty: Difficulty,
): BotMemory {
  const impact = result.impact;
  if (impact.kind === "target")
    return { ...memory, correction: 0, lastWind: result.input.wind };
  const targetX = ARENA.fighters[result.input.side === "cat" ? "dog" : "cat"].x;
  const direction = result.input.side === "cat" ? 1 : -1;
  const correction =
    clamp((targetX - impact.point.x) * direction * 0.055, -14, 14) *
    BOT_PROFILES[difficulty].learning;
  return {
    power: clamp(memory.power + correction, 48, 93),
    lastWind: result.input.wind,
    correction,
  };
}
