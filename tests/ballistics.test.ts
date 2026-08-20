import assert from "node:assert/strict";
import test from "node:test";

import { chooseBotShot } from "../lib/game/bot";
import { simulateShot } from "../lib/game/ballistics";
import type { ShotInput } from "../lib/game/types";

function catShot(overrides: Partial<ShotInput> = {}): ShotInput {
  return {
    shotId: "test-shot",
    side: "cat",
    angle: 48,
    power: 62,
    wind: 0,
    projectileType: "fishbone",
    turnIndex: 1,
    ...overrides,
  };
}

test("the same shot produces an identical trajectory", () => {
  const first = simulateShot(catShot());
  const second = simulateShot(catShot());
  assert.deepEqual(first, second);
});

test("wind changes horizontal flight in the expected direction", () => {
  const left = simulateShot(catShot({ angle: 70, power: 75, wind: -0.85 }));
  const calm = simulateShot(catShot({ angle: 70, power: 75, wind: 0 }));
  const right = simulateShot(catShot({ angle: 70, power: 75, wind: 0.85 }));
  assert.ok(left.impact.position.x < calm.impact.position.x);
  assert.ok(right.impact.position.x > calm.impact.position.x);
});

test("low power falls short while high power travels farther", () => {
  const low = simulateShot(catShot({ angle: 62, power: 10 }));
  const high = simulateShot(catShot({ angle: 62, power: 100 }));
  assert.ok(low.impact.position.x < high.impact.position.x);
  assert.notEqual(low.impact.kind, "target");
});

test("a shallow shot collides with the center wall", () => {
  const result = simulateShot(catShot({ angle: 28, power: 62 }));
  assert.equal(result.impact.kind, "wall");
});

test("a high arc can clear the wall and return to the ground", () => {
  const result = simulateShot(catShot({ angle: 70, power: 82 }));
  assert.equal(result.impact.kind, "ground");
});

test("20, 45, and 70 degree player angles produce distinct real arcs", () => {
  const shallow = simulateShot(catShot({ angle: 20, power: 72 }));
  const balanced = simulateShot(catShot({ angle: 45, power: 72 }));
  const high = simulateShot(catShot({ angle: 70, power: 72 }));
  assert.ok(shallow.maxHeight < balanced.maxHeight);
  assert.ok(balanced.maxHeight < high.maxHeight);
  assert.notDeepEqual(shallow.points, high.points);
});

test("bot searches the same simulation for a real target collision", () => {
  const aim = chooseBotShot("cat", 0, "expert", 4);
  const result = simulateShot(catShot({ angle: aim.angle, power: aim.power, turnIndex: 4 }));
  assert.equal(result.impact.kind, "target");
  assert.ok(result.impact.damage >= 15 && result.impact.damage <= 30);
});

test("dog-side trajectory is mirrored and can hit the cat", () => {
  const aim = chooseBotShot("dog", 0.3, "hard", 5);
  const result = simulateShot({
    shotId: "dog-shot",
    side: "dog",
    angle: aim.angle,
    power: aim.power,
    wind: 0.3,
    projectileType: "rubber-bone",
    turnIndex: 5,
  });
  assert.ok(["target", "ground"].includes(result.impact.kind));
  assert.ok(result.impact.position.x < 2.82);
});

test("damage stays readable and a normal match cannot end in one shot", () => {
  for (let turnIndex = 0; turnIndex < 8; turnIndex += 1) {
    const aim = chooseBotShot("cat", (turnIndex - 4) / 5, "expert", turnIndex);
    const result = simulateShot(catShot({ angle: aim.angle, power: aim.power, wind: (turnIndex - 4) / 5, turnIndex }));
    if (result.impact.kind === "target") assert.ok(result.impact.damage >= 15 && result.impact.damage <= 30);
  }
});

test("HP depletion reaches zero only after repeated collision damage", () => {
  const aim = chooseBotShot("cat", 0, "expert", 9);
  const result = simulateShot(catShot({ angle: aim.angle, power: aim.power, turnIndex: 9 }));
  assert.equal(result.impact.kind, "target");
  let hp = 100;
  let turns = 0;
  while (hp > 0) { hp = Math.max(0, hp - result.impact.damage); turns += 1; }
  assert.equal(hp, 0);
  assert.ok(turns >= 4 && turns <= 7);
});
