import { simulateShot, makeDeterministicWind } from "./ballistics";
import {
  BOT_PROFILES,
  botState,
  chooseBotShot,
  freshBot,
  learnFromShot,
} from "./bot";
import { PHYSICS, clamp, other } from "./constants";
import { THROW_DURATION } from "./presentation";
import type { Difficulty, GameMode, Item, MatchState, Phase } from "./types";
import { DEFAULT_SETUP, sanitizeSetup, type MatchSetup } from "./setup";
import { characterFor } from "./characters";
import { planThrow, shotProperties } from "./abilities";
import { THEMES } from "./themes";
const inventory = (loadout?: Item[]) =>
  Object.fromEntries(
    (
      ["double", "heavy", "shield", "heal", "curve", "retry", "lucky"] as Item[]
    ).map((id) => [id, !loadout || loadout.includes(id) ? 1 : 0]),
  ) as Record<Item, number>;
const name = (s: MatchState, side = s.turn) =>
  characterFor(side, s.setup.fighters).name;
export function createMatch(
  mode: GameMode = "solo",
  difficulty: Difficulty = "normal",
  seed = 1,
  setup?: MatchSetup,
): MatchState {
  const config = sanitizeSetup(setup ?? { ...DEFAULT_SETUP, mode, difficulty });
  return {
    phase: "menu",
    mode,
    difficulty,
    turn: "cat",
    turnIndex: 0,
    health: { cat: 100, dog: 100 },
    stock: {
      cat: inventory(setup ? config.loadout : undefined),
      dog: inventory(setup ? config.loadout : undefined),
    },
    setup: config,
    signatureStock: { cat: 1, dog: 1 },
    signatureSelected: false,
    retryPending: false,
    retryTurn: false,
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
  phase(s, "starting", `${THEMES[s.setup.theme].name} · Cat throws first`);
}
export function selectSignature(s: MatchState) {
  if (!canControl(s) || s.phase !== "aiming" || !s.signatureStock[s.turn])
    return false;
  s.signatureSelected = !s.signatureSelected;
  s.selected = null;
  return true;
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
    phase(s, "aiming", `${name(s)} · Hold to throw`);
  }
}
export function releaseCharge(s: MatchState) {
  if (!canControl(s) || s.phase !== "charging") return false;
  phase(s, "throwing", `${name(s)} throws!`);
  return true;
}
export function setAngle(s: MatchState, value: number) {
  if (canControl(s) && s.phase === "aiming" && Number.isFinite(value))
    s.angle = clamp(value, 20, 78);
}
export function selectItem(s: MatchState, item: Item) {
  if (!canControl(s) || s.phase !== "aiming" || !s.stock[s.turn][item])
    return false;
  s.signatureSelected = false;
  if (item === "heal") {
    if (s.health[s.turn] === 100) return false;
    s.stock[s.turn].heal--;
    s.health[s.turn] = Math.min(100, s.health[s.turn] + 20);
    s.selected = null;
    phase(s, "impact", `${name(s)} takes a snack break. +20 HP`);
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
    character: s.setup.fighters[s.turn],
    signature: s.signatureSelected,
  };
  if (s.selected) s.stock[s.turn][s.selected]--;
  if (s.signatureSelected) s.signatureStock[s.turn]--;
  s.retryPending = s.selected === "retry";
  s.flights = planThrow(input).map((shot) => ({
    result: simulateShot(shot.input),
    delay: shot.delay,
    resolved: false,
    bounceIndex: 0,
  }));
  s.selected = null;
  s.signatureSelected = false;
  phase(
    s,
    "flying",
    botState(s) === "attack"
      ? `${name(s)} watches the landing…`
      : "Watch the wind…",
  );
}
/** One owned state, no React, browser globals, timers, or renderer callbacks. */
export function advance(s: MatchState, delta: number) {
  if (s.paused) return;
  const dt = clamp(Number.isFinite(delta) ? delta : 0, 0, 0.05);
  s.clock += dt;
  s.elapsed += dt;
  s.effects = s.effects.filter((e) => (e.age += dt) < 0.8);
  if (s.phase === "starting" && s.elapsed >= 0.65)
    phase(s, "aiming", `${name(s)} · Hold to throw`);
  else if (
    botState(s) === "chase" &&
    s.elapsed >= BOT_PROFILES[s.difficulty].delay
  ) {
    if (s.health.dog <= 55 && s.stock.dog.heal && s.difficulty !== "easy") {
      s.stock.dog.heal--;
      s.health.dog = Math.min(100, s.health.dog + 20);
      phase(s, "impact", `${name(s)} takes a snack break. +20 HP`);
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
    if (s.retryTurn) s.botPower = Math.min(70, s.botPower);
    if (
      !s.selected &&
      s.difficulty === "hard" &&
      s.turnIndex >= 3 &&
      s.signatureStock.dog &&
      !s.retryTurn
    )
      s.signatureSelected = true;
    phase(s, "charging", `${name(s)} sizes up the throw…`);
  } else if (s.phase === "charging") {
    s.power = Math.min(
      s.retryTurn ? 70 : 100,
      s.power + PHYSICS.chargeRate * dt,
    );
    if (botState(s) === "attack" && s.power >= s.botPower) {
      s.power = s.botPower;
      phase(s, "throwing", `${name(s)} throws!`);
    }
  } else if (s.phase === "throwing" && s.elapsed >= THROW_DURATION) launch(s);
  else if (s.phase === "flying") {
    for (const flight of s.flights) {
      const bounces = flight.result.bounces ?? [];
      while (
        !flight.resolved &&
        flight.bounceIndex < bounces.length &&
        s.elapsed >= bounces[flight.bounceIndex].time + flight.delay
      ) {
        const point = bounces[flight.bounceIndex++];
        const properties = shotProperties(flight.result.input);
        s.effects.push({
          age: 0,
          impact: {
            kind: properties.bounce === "wall" ? "wall" : "ground",
            point,
            damage: 0,
            character: flight.result.input.character,
            signature: true,
          },
        });
      }
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
      s.message = impact.target
        ? `Direct hit! −${impact.damage} HP`
        : impact.kind === "wall"
          ? "CLONK! Try a higher arc."
          : impact.kind === "ground"
            ? "PUFF! A little more… or less?"
            : "Out of the yard!";
      if (botState(s) === "recover")
        s.bot = learnFromShot(s.bot, flight.result, s.difficulty);
    }
    if (s.flights.every((f) => f.resolved)) {
      if (s.retryPending && s.flights.every((f) => !f.result.impact.target)) {
        s.retryPending = false;
        s.retryTurn = true;
        s.flights = [];
        s.power = 5;
        phase(s, "aiming", "Second chance! One retry · maximum 70% power.");
        return;
      }
      s.flights = [];
      phase(s, "impact", s.message);
    }
  } else if (s.phase === "impact" && s.elapsed >= 0.65) {
    if (s.health[other(s.turn)] <= 0) {
      s.winner = s.turn;
      phase(s, "gameOver", `${name(s)} wins the yard!`);
    } else phase(s, "switching", "Next throw…");
  } else if (s.phase === "switching" && s.elapsed >= 0.15) {
    s.turn = other(s.turn);
    s.turnIndex++;
    s.retryTurn = false;
    s.retryPending = false;
    s.wind = makeDeterministicWind(s.seed, s.turnIndex);
    s.angle = 55;
    s.power = 5;
    phase(s, "aiming", `${name(s)} · Hold to throw`);
    if (botState(s) === "chase") s.message = `${name(s)} tracks the cat…`;
  }
}
