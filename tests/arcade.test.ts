import test from "node:test";
import assert from "node:assert/strict";
import { CHARACTERS } from "../lib/game/characters";
import { THEMES } from "../lib/game/themes";
import { ABILITIES, planThrow, shotProperties } from "../lib/game/abilities";
import {
  DEFAULT_SETUP,
  sanitizeSetup,
  migrateLegacySetup,
} from "../lib/game/setup";
import { simulateShot } from "../lib/game/ballistics";
import {
  advance,
  createMatch,
  releaseCharge,
  selectItem,
  selectSignature,
  startCharge,
  startMatch,
} from "../lib/game/engine";
import type { Item, ShotInput } from "../lib/game/types";
const step = (s: ReturnType<typeof createMatch>, seconds: number) => {
  for (let i = 0; i < seconds * 120; i++) advance(s, 1 / 120);
};
test("six arenas and ten original fighters form a validated, serializable setup", () => {
  assert.equal(Object.keys(THEMES).length, 6);
  assert.equal(Object.keys(CHARACTERS).length, 10);
  assert.equal(
    Object.values(CHARACTERS).filter((c) => c.side === "cat").length,
    5,
  );
  assert.deepEqual(
    sanitizeSetup(JSON.parse(JSON.stringify(DEFAULT_SETUP))),
    DEFAULT_SETUP,
  );
  assert.deepEqual(
    sanitizeSetup({
      theme: "bad",
      fighters: { cat: "major", dog: "blaze" },
      loadout: ["double", "double", "bad"],
    }),
    DEFAULT_SETUP,
  );
});
test("loadout grants only the three chosen one-use items to both fighters", () => {
  const s = createMatch("local", "normal", 1, {
    ...DEFAULT_SETUP,
    mode: "local",
    loadout: ["heal", "curve", "retry"],
  });
  startMatch(s);
  step(s, 0.7);
  assert.equal(selectItem(s, "double"), false);
  assert.equal(selectItem(s, "curve"), true);
  assert.equal(s.stock.dog.curve, 1);
  assert.equal(s.stock.cat.heavy, 0);
});
test("corrupt or prototype-named saved settings safely fall back", () => {
  assert.deepEqual(
    sanitizeSetup({
      theme: "constructor",
      fighters: { cat: "__proto__", dog: 3 },
      loadout: ["constructor", "toString", "__proto__"],
    }),
    DEFAULT_SETUP,
  );
});
test("legacy arena, skins and difficulty migrate into typed setup", () => {
  const setup = migrateLegacySetup(
    { arena: "night", cat: "tuxedo", dog: "brown" },
    "hard",
  );
  assert.equal(setup.theme, "night");
  assert.deepEqual(setup.fighters, { cat: "shadow", dog: "bruno" });
  assert.equal(setup.difficulty, "hard");
  assert.deepEqual(
    migrateLegacySetup({ cat: "constructor", dog: "__proto__" }, null),
    DEFAULT_SETUP,
  );
});
test("bounce contact emits one feedback event without duplicate damage", () => {
  const s = createMatch("local", "normal", 1, {
    ...DEFAULT_SETUP,
    mode: "local",
    fighters: { cat: "mochi", dog: "major" },
  });
  startMatch(s);
  step(s, 0.7);
  selectSignature(s);
  startCharge(s);
  s.angle = 20;
  releaseCharge(s);
  const effects = new Set();
  for (let i = 0; i < 600; i++) {
    advance(s, 1 / 120);
    for (const effect of s.effects) effects.add(effect);
  }
  assert.equal(effects.size, 2, "one bounce and one terminal impact");
  assert.equal(s.health.dog, 100);
});
test("every signature is deterministic and bounds per-turn damage", () => {
  for (const fighter of Object.values(CHARACTERS)) {
    for (const angle of [20, 45, 78])
      for (const power of [5, 50, 100])
        for (const wind of [-10, 0, 10]) {
          const input: ShotInput = {
            side: fighter.side,
            character: fighter.id,
            signature: true,
            angle,
            power,
            wind,
          };
          const shots = planThrow(input),
            results = shots.map((s) => simulateShot(s.input));
          assert.deepEqual(
            results,
            shots.map((s) => simulateShot(s.input)),
          );
          assert.ok(
            results.every(
              (r) =>
                r.points.length < 1201 && Number.isFinite(r.impact.point.x),
            ),
          );
          assert.ok(
            results.reduce((total, r) => total + r.impact.damage, 0) <= 36,
            "no one-shot signature",
          );
        }
  }
});
test("normal weapon identity never replaces base physics", () => {
  const input: ShotInput = { side: "cat", angle: 55, power: 75, wind: 0 };
  for (const character of Object.values(CHARACTERS).filter(
    (c) => c.side === "cat",
  ))
    assert.deepEqual(
      simulateShot({ ...input, character: character.id }).points,
      simulateShot(input).points,
    );
});
test("ground and wall signatures bounce at physical contact once", () => {
  const ground = simulateShot({
    side: "cat",
    character: "mochi",
    signature: true,
    angle: 20,
    power: 5,
    wind: 0,
  });
  assert.equal(ground.bounces?.length, 1);
  assert.ok(ground.bounces![0].y >= 450);
  const wall = simulateShot({
    side: "dog",
    character: "biscuit",
    signature: true,
    angle: 20,
    power: 50,
    wind: 0,
  });
  assert.equal(wall.bounces?.length, 1);
  assert.ok(wall.points.some((p) => p.vx > 0));
});
test("curve and lucky change real trajectories; all seven items resolve", () => {
  const base: ShotInput = { side: "cat", angle: 55, power: 60, wind: 0 };
  const normal = simulateShot(base);
  assert.ok(
    simulateShot({ ...base, item: "curve" }).points[20].vx >
      normal.points[20].vx,
  );
  assert.ok(
    simulateShot({ ...base, item: "lucky" }).points[20].vx >
      normal.points[20].vx,
  );
  for (const item of Object.keys(ABILITIES) as Item[])
    assert.ok(simulateShot({ ...base, item }).impact.point.time > 0);
});
test("signature selection is exclusive, consumed once and reset by rematch", () => {
  const s = createMatch("local");
  startMatch(s);
  step(s, 0.7);
  assert.equal(selectSignature(s), true);
  assert.equal(selectItem(s, "heavy"), true);
  assert.equal(s.signatureSelected, false);
  selectSignature(s);
  assert.equal(s.selected, null);
  startCharge(s);
  s.power = 75;
  releaseCharge(s);
  step(s, 0.25);
  assert.equal(s.signatureStock.cat, 0);
  assert.equal(s.flights.length, 3);
  step(s, 4);
  assert.equal(s.turn, "dog");
  s.turn = "cat";
  s.phase = "aiming";
  assert.equal(selectSignature(s), false);
  assert.equal(createMatch().signatureStock.cat, 1);
});
test("Lucky favors a fighter's style without changing baseline health or one-shot balance", () => {
  const base: ShotInput = {
    side: "dog",
    angle: 55,
    power: 75,
    wind: 6,
    item: "lucky",
  };
  const tank = shotProperties({ ...base, character: "bruno" }),
    fast = shotProperties({ ...base, character: "bolt" });
  assert.ok(tank.damage > fast.damage);
  assert.ok(fast.velocity > tank.velocity);
  for (const fighter of Object.values(CHARACTERS))
    assert.ok(
      simulateShot({ ...base, side: fighter.side, character: fighter.id })
        .impact.damage <= 28,
    );
});
test("second chance grants only one capped retry, with no premature turn switch", () => {
  const s = createMatch("local");
  startMatch(s);
  step(s, 0.7);
  selectItem(s, "retry");
  startCharge(s);
  releaseCharge(s);
  for (let i = 0; i < 600 && !s.retryTurn; i++) advance(s, 1 / 120);
  assert.equal(s.turn, "cat");
  assert.equal(s.phase, "aiming");
  assert.equal(s.retryTurn, true);
  assert.equal(s.stock.cat.retry, 0);
  startCharge(s);
  step(s, 3);
  assert.equal(s.power, 70);
  releaseCharge(s);
  step(s, 5);
  assert.equal(s.turn, "dog");
  assert.equal(s.retryTurn, false);
});
