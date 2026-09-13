import { simulateShot, makeDeterministicWind } from "./ballistics";
import { BOT_PROFILES, chooseBotShot, freshBot, learnFromShot } from "./bot";
import { NAMES, PHYSICS, clamp, other } from "./constants";
import type { Difficulty, GameMode, Item, MatchState, Phase } from "./types";
const inventory = () => ({ double: 1, heavy: 1, shield: 1, heal: 1 });
export function createMatch(
  mode: GameMode = "solo",
  difficulty: Difficulty = "normal",
  seed = 1,
): MatchState {
  return {
    phase: "menu",
    mode,
    difficulty,
    turn: "cat",
    turnIndex: 0,
    health: { cat: 100, dog: 100 },
    stock: { cat: inventory(), dog: inventory() },
    angle: 55,
    power: 5,
    wind: makeDeterministicWind(seed, 0),
    seed,
    selected: null,
    elapsed: 0,
    clock: 0,
    flights: [],
    effects: [],
    winner: null,
    paused: false,
    bot: freshBot(),
    botPower: 75,
    message: "Hold. Release. Rule the yard.",
  };
}
function phase(s: MatchState, next: Phase, message: string) {
  s.phase = next;
  s.elapsed = 0;
  s.message = message;
}
export function startMatch(s: MatchState) {
  phase(s, "starting", "Backyard Block Party · Cat throws first");
}
export const canControl = (s: MatchState) =>
  !s.paused &&
  (s.mode === "local" || s.turn === "cat") &&
  (s.phase === "aiming" || s.phase === "charging");
export function startCharge(s: MatchState) {
  if (!canControl(s) || s.phase !== "aiming") return false;
  s.power = 5;
  phase(s, "charging", "Release to throw!");
  return true;
}
export function cancelCharge(s: MatchState) {
  if (s.phase === "charging") {
    s.power = 5;
    phase(s, "aiming", `${NAMES[s.turn]} · Hold to throw`);
  }
}
export function releaseCharge(s: MatchState) {
  if (!canControl(s) || s.phase !== "charging") return false;
  phase(s, "throwing", `${NAMES[s.turn]} throws!`);
  return true;
}
export function setAngle(s: MatchState, value: number) {
  if (canControl(s) && s.phase === "aiming" && Number.isFinite(value))
    s.angle = clamp(value, 20, 78);
}
export function selectItem(s: MatchState, item: Item) {
  if (!canControl(s) || s.phase !== "aiming" || !s.stock[s.turn][item])
    return false;
  if (item === "heal") {
    if (s.health[s.turn] === 100) return false;
    s.stock[s.turn].heal--;
    s.health[s.turn] = Math.min(100, s.health[s.turn] + 20);
    s.selected = null;
    phase(s, "impact", `${NAMES[s.turn]} takes a snack break. +20 HP`);
  } else s.selected = s.selected === item ? null : item;
  return true;
}
export function togglePause(s: MatchState) {
  if (s.phase === "menu" || s.phase === "gameOver") return;
  cancelCharge(s);
  s.paused = !s.paused;
}
function launch(s: MatchState) {
  const input = {
    side: s.turn,
    power: s.power,
    angle: s.angle,
    wind: s.wind,
    item: s.selected ?? undefined,
  };
  if (s.selected) s.stock[s.turn][s.selected]--;
  s.flights = [{ result: simulateShot(input), delay: 0, resolved: false }];
  if (s.selected === "double")
    s.flights.push({
      result: simulateShot({
        ...input,
        angle: s.angle + 3,
        power: s.power * 0.98,
      }),
      delay: 0.15,
      resolved: false,
    });
  s.selected = null;
  phase(s, "flying", "Watch the wind…");
}
/** One owned state, no React, browser globals, timers, or renderer callbacks. */
export function advance(s: MatchState, delta: number) {
  if (s.paused) return;
  const dt = clamp(Number.isFinite(delta) ? delta : 0, 0, 0.05);
  s.clock += dt;
  s.elapsed += dt;
  s.effects = s.effects.filter((e) => (e.age += dt) < 0.8);
  if (s.phase === "starting" && s.elapsed >= 0.65)
    phase(s, "aiming", `${NAMES[s.turn]} · Hold to throw`);
  else if (
    s.phase === "aiming" &&
    s.mode === "solo" &&
    s.turn === "dog" &&
    s.elapsed >= BOT_PROFILES[s.difficulty].delay
  ) {
    if (s.health.dog <= 55 && s.stock.dog.heal && s.difficulty !== "easy") {
      s.stock.dog.heal--;
      s.health.dog = Math.min(100, s.health.dog + 20);
      phase(s, "impact", "Major Bark takes a snack break. +20 HP");
      return;
    }
    const aim = chooseBotShot(
      s.bot,
      s.wind,
      s.difficulty,
      s.seed + s.turnIndex * 331,
    );
    s.angle = aim.angle;
    s.botPower = aim.power;
    s.power = 5;
    if (s.difficulty === "hard" && Math.abs(s.wind) > 5 && s.stock.dog.shield) {
      s.selected = "shield";
      s.botPower = chooseBotShot(
        s.bot,
        s.wind * 0.2,
        s.difficulty,
        s.seed + s.turnIndex * 331,
      ).power;
    }
    phase(s, "charging", "Major Bark sizes up the throw…");
  } else if (s.phase === "charging") {
    s.power = Math.min(100, s.power + PHYSICS.chargeRate * dt);
    if (s.mode === "solo" && s.turn === "dog" && s.power >= s.botPower) {
      s.power = s.botPower;
      phase(s, "throwing", "Major Bark throws!");
    }
  } else if (s.phase === "throwing" && s.elapsed >= 0.16) launch(s);
  else if (s.phase === "flying") {
    for (const flight of s.flights) {
      if (
        flight.resolved ||
        s.elapsed < flight.result.impact.point.time + flight.delay
      )
        continue;
      flight.resolved = true;
      const impact = flight.result.impact;
      s.effects.push({ impact, age: 0 });
      if (impact.target)
        s.health[impact.target] = Math.max(
          0,
          s.health[impact.target] - impact.damage,
        );
      s.message =
        impact.kind === "target"
          ? `Direct hit! −${impact.damage} HP`
          : impact.kind === "wall"
            ? "CLONK! Try a higher arc."
            : impact.kind === "ground"
              ? "PUFF! A little more… or less?"
              : "Out of the yard!";
      if (s.turn === "dog" && s.mode === "solo")
        s.bot = learnFromShot(s.bot, flight.result, s.difficulty);
    }
    if (s.flights.every((f) => f.resolved)) {
      s.flights = [];
      phase(s, "impact", s.message);
    }
  } else if (s.phase === "impact" && s.elapsed >= 0.65) {
    if (s.health[other(s.turn)] <= 0) {
      s.winner = s.turn;
      phase(s, "gameOver", `${NAMES[s.turn]} wins the yard!`);
    } else phase(s, "switching", "Next throw…");
  } else if (s.phase === "switching" && s.elapsed >= 0.15) {
    s.turn = other(s.turn);
    s.turnIndex++;
    s.wind = makeDeterministicWind(s.seed, s.turnIndex);
    s.angle = 55;
    s.power = 5;
    phase(s, "aiming", `${NAMES[s.turn]} · Hold to throw`);
  }
}
