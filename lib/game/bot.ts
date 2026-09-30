import { ARENA, clamp } from "./constants";
import { randomUnit } from "./ballistics";
import type { BallisticResult, BotMemory, Difficulty, MatchState } from "./types";

export type BotState = "chase" | "attack" | "recover";

/** Derived from the match phase so the bot cannot drift into an illegal action. */
export function botState(s: Pick<MatchState, "mode" | "turn" | "phase">): BotState | null {
  if (s.mode !== "solo" || s.turn !== "dog") return null;
  if (s.phase === "aiming") return "chase";
  if (s.phase === "charging" || s.phase === "throwing") return "attack";
  if (s.phase === "flying" || s.phase === "impact" || s.phase === "switching") return "recover";
  return null;
}

/** Small visual search around the eventual aim; never changes shot inputs. */
export function botTrackingOffset(elapsed: number, delay: number) {
  const progress = clamp(elapsed / Math.max(delay, 0.001), 0, 1);
  return Math.sin(progress * Math.PI) * Math.sin(elapsed * 12) * 4;
}
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
