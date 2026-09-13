import assert from "node:assert/strict";
import test from "node:test";
import {
  simulateShot,
  trajectoryPointAt,
  makeDeterministicWind,
  wallCollision,
  characterCollision,
  calculateDamage,
} from "../lib/game/ballistics";
import {
  createMatch,
  startMatch,
  startCharge,
  releaseCharge,
  cancelCharge,
  advance,
  selectItem,
  togglePause,
} from "../lib/game/engine";
import { chooseBotShot, freshBot, learnFromShot } from "../lib/game/bot";
import type { MatchState, ShotInput } from "../lib/game/types";
const shot = (p: Partial<ShotInput> = {}) =>
  simulateShot({ side: "cat", angle: 55, power: 75, wind: 0, ...p });
function step(s: MatchState, seconds: number) {
  for (let t = 0; t < seconds; t += 1 / 120) advance(s, 1 / 120);
}
function ready() {
  const s = createMatch("local");
  startMatch(s);
  step(s, 0.7);
  return s;
}
function fire(s: MatchState, power = 75) {
  assert.equal(startCharge(s), true);
  s.power = power;
  s.wind = 0;
  assert.equal(releaseCharge(s), true);
}

test("identical inputs produce identical trajectories and interpolation", () => {
  assert.deepEqual(shot(), shot());
  assert.deepEqual(
    trajectoryPointAt(shot(), 0.405),
    trajectoryPointAt(shot(), 0.405),
  );
});
test("wind pushes actual trajectory left and right", () => {
  const x = (wind: number) => trajectoryPointAt(shot({ wind }), 0.4).x;
  assert.ok(x(-10) < x(0));
  assert.ok(x(0) < x(10));
});
test("20°, 45°, 78° and min/mid/max power all resolve in bounds of simulation", () => {
  for (const side of ["cat", "dog"] as const)
    for (const angle of [20, 45, 78])
      for (const power of [5, 50, 100])
        for (const wind of [-10, 0, 10]) {
          const r = shot({ side, angle, power, wind });
          assert.ok(r.points.length > 2 && r.points.length <= 1201);
          for (let i = 1; i < r.points.length; i++)
            assert.ok(
              Math.hypot(
                r.points[i].x - r.points[i - 1].x,
                r.points[i].y - r.points[i - 1].y,
              ) < 12,
              "no tunneling or teleport",
            );
        }
});
test("low, wall, direct, overshoot and dog mirror have collision-based damage", () => {
  assert.equal(shot({ power: 5 }).impact.kind, "ground");
  assert.equal(shot({ power: 50 }).impact.kind, "wall");
  assert.equal(shot().impact.kind, "target");
  assert.equal(shot({ power: 100 }).impact.kind, "boundary");
  assert.equal(shot({ side: "dog" }).impact.target, "cat");
  assert.equal(shot({ power: 5 }).impact.damage, 0);
  assert.ok(shot().impact.damage >= 15 && shot().impact.damage <= 25);
});
test("wall corners and character capsule use circle geometry", () => {
  assert.equal(wallCollision(472, 292), false);
  assert.equal(wallCollision(476, 296), true);
  assert.equal(characterCollision(830, 360, "dog"), true);
  assert.equal(characterCollision(780, 315, "dog"), false);
});
test("wind is deterministic, bounded and favors moderate conditions", () => {
  const values = Array.from({ length: 1000 }, (_, i) =>
    makeDeterministicWind(123, i),
  );
  assert.deepEqual(
    values,
    Array.from({ length: 1000 }, (_, i) => makeDeterministicWind(123, i)),
  );
  assert.ok(values.every((n) => Math.abs(n) <= 10));
  assert.ok(values.filter((n) => Math.abs(n) < 5).length > 650);
});
test("power caps, duplicate release is rejected, flight blocks charge", () => {
  const s = ready();
  startCharge(s);
  step(s, 3);
  assert.equal(s.power, 100);
  assert.equal(releaseCharge(s), true);
  assert.equal(releaseCharge(s), false);
  assert.equal(startCharge(s), false);
  step(s, 0.2);
  assert.equal(s.phase, "flying");
  assert.equal(startCharge(s), false);
});
test("damage applies once and a local turn switches to Dog", () => {
  const s = ready();
  fire(s);
  step(s, 3);
  assert.equal(s.health.dog, 77);
  assert.equal(s.turn, "dog");
  const hp = s.health.dog;
  step(s, 2);
  assert.equal(s.health.dog, hp);
});
test("player death reaches gameOver, stops input, and fresh rematch resets everything", () => {
  const s = ready();
  s.health.dog = 10;
  fire(s);
  step(s, 3);
  assert.equal(s.health.dog, 0);
  assert.equal(s.phase, "gameOver");
  assert.equal(s.winner, "cat");
  assert.equal(startCharge(s), false);
  const fresh = ready();
  assert.equal(fresh.health.dog, 100);
  assert.equal(fresh.turn, "cat");
  assert.equal(fresh.stock.cat.heavy, 1);
});
test("pause freezes flight; cancelling charge and huge delta cannot stick or jump", () => {
  const s = ready();
  startCharge(s);
  advance(s, 100);
  assert.ok(s.power < 10);
  cancelCharge(s);
  assert.equal(s.phase, "aiming");
  fire(s);
  step(s, 0.3);
  togglePause(s);
  const elapsed = s.elapsed;
  step(s, 5);
  assert.equal(s.elapsed, elapsed);
  togglePause(s);
  step(s, 3);
  assert.equal(s.turn, "dog");
});
test("double toss resolves two independent flights and consumes one charge", () => {
  const s = ready();
  selectItem(s, "double");
  fire(s);
  step(s, 0.2);
  assert.equal(s.flights.length, 2);
  assert.equal(s.stock.cat.double, 0);
  step(s, 3);
  assert.ok(s.health.dog < 100 && s.health.dog >= 70);
  assert.equal(s.turnIndex, 1);
});
test("heavy changes arc/damage; wind shield reduces actual acceleration", () => {
  assert.ok(
    trajectoryPointAt(shot({ item: "heavy" }), 0.3).x <
      trajectoryPointAt(shot(), 0.3).x,
  );
  assert.ok(calculateDamage(550, "heavy") > calculateDamage(550));
  assert.deepEqual(
    shot({ item: "shield", wind: 10 }).points,
    shot({ wind: 2 }).points,
  );
});
test("heal restores at most 20 HP, consumes turn, cannot be repeated or used at full HP", () => {
  const s = ready();
  assert.equal(selectItem(s, "heal"), false);
  s.health.cat = 90;
  assert.equal(selectItem(s, "heal"), true);
  assert.equal(s.health.cat, 100);
  assert.equal(s.stock.cat.heal, 0);
  step(s, 1);
  assert.equal(s.turn, "dog");
});
test("AI corrects short/long results in opposite directions without searching physics", () => {
  const memory = freshBot();
  const short = learnFromShot(memory, shot({ side: "dog", power: 50 }), "hard");
  const long = learnFromShot(memory, shot({ side: "dog", power: 100 }), "hard");
  assert.ok(short.power > memory.power);
  assert.ok(long.power < memory.power);
  for (const d of ["easy", "normal", "hard"] as const) {
    const aim = chooseBotShot(memory, 10, d, 42);
    assert.ok(aim.power <= 100 && aim.power >= 5);
  }
});
test("Solo AI completes turns on all difficulties with same collision engine", () => {
  for (const d of ["easy", "normal", "hard"] as const) {
    const s = createMatch("solo", d, 12);
    startMatch(s);
    step(s, 0.7);
    fire(s, 5);
    step(s, 9);
    assert.equal(s.turn, "cat");
    assert.equal(s.turnIndex, 2);
    assert.equal(s.phase, "aiming");
  }
});
test("invalid numeric input is rejected instead of freezing the simulation", () => {
  assert.throws(() => shot({ power: NaN }), RangeError);
});
