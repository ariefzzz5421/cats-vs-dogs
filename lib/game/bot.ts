import { PHYSICS, projectileFor } from "./constants";
import { evaluateShot } from "./ballistics";
import type { Difficulty, ShotInput, Side } from "./types";

type BotProfile = {
  angleError: number;
  powerError: number;
  windUnderstanding: number;
  reactionMs: number;
};

export const BOT_PROFILES: Record<Difficulty, BotProfile> = {
  easy: { angleError: 7, powerError: 12, windUnderstanding: 0.3, reactionMs: 1150 },
  medium: { angleError: 4, powerError: 7, windUnderstanding: 0.68, reactionMs: 900 },
  hard: { angleError: 2.2, powerError: 4, windUnderstanding: 0.88, reactionMs: 680 },
  expert: { angleError: 1.1, powerError: 2.2, windUnderstanding: 0.97, reactionMs: 520 },
};

function seededUnit(seed: number) {
  let value = seed >>> 0;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  return (value >>> 0) / 0xffffffff;
}

export function chooseBotShot(side: Side, wind: number, difficulty: Difficulty, turnIndex: number) {
  const profile = BOT_PROFILES[difficulty];
  const perceivedWind = wind * profile.windUnderstanding;
  let best = { angle: 48, power: 58, score: Number.POSITIVE_INFINITY };

  const probe = (angle: number, power: number) => {
      const result = evaluateShot({
        shotId: "bot-probe",
        side,
        angle,
        power,
        wind: perceivedWind,
        projectileType: projectileFor(side),
        turnIndex,
      });
      const targetBonus = result.impact.kind === "target" ? -4 : 0;
      const wallPenalty = result.impact.kind === "wall" ? 0.65 : 0;
      const score = result.closestTargetDistance + wallPenalty + targetBonus;
      if (score < best.score) best = { angle, power, score };
  };

  // A coarse pass followed by a small local refinement is fast enough for
  // low-power phones while still using the exact same fixed-step simulation.
  for (let angle = PHYSICS.minAngle; angle <= PHYSICS.maxAngle; angle += 6) {
    for (let power = 14; power <= PHYSICS.maxPower; power += 6) {
      probe(angle, power);
    }
  }
  const coarseBest = { ...best };
  for (let angle = coarseBest.angle - 5; angle <= coarseBest.angle + 5; angle += 1) {
    for (let power = coarseBest.power - 5; power <= coarseBest.power + 5; power += 1) {
      if (angle >= PHYSICS.minAngle && angle <= PHYSICS.maxAngle && power >= PHYSICS.minPower && power <= PHYSICS.maxPower) {
        probe(angle, power);
      }
    }
  }

  const angleNoise = (seededUnit(turnIndex * 37 + 11) * 2 - 1) * profile.angleError;
  const powerNoise = (seededUnit(turnIndex * 53 + 29) * 2 - 1) * profile.powerError;
  return {
    angle: Math.max(PHYSICS.minAngle, Math.min(PHYSICS.maxAngle, Math.round((best.angle + angleNoise) * 10) / 10)),
    power: Math.max(PHYSICS.minPower, Math.min(PHYSICS.maxPower, Math.round(best.power + powerNoise))),
    reactionMs: profile.reactionMs,
  };
}

export function makeBotShot(side: Side, wind: number, difficulty: Difficulty, turnIndex: number, shotId: string): ShotInput {
  const aim = chooseBotShot(side, wind, difficulty, turnIndex);
  return { shotId, side, angle: aim.angle, power: aim.power, wind, projectileType: projectileFor(side), turnIndex };
}
