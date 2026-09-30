import test from "node:test";
import assert from "node:assert/strict";
import { aimGuidePoints } from "../lib/game/aimGuide";
import {
  characterCollision,
  simulateShot,
  wallCollision,
  windStrengthLabel,
} from "../lib/game/ballistics";
import { PHYSICS } from "../lib/game/constants";

test("wind shifts the same physical trajectory in the correct direction for both fighters", () => {
  for (const side of ["cat", "dog"] as const) {
    const shot = (wind: number) =>
      simulateShot({ side, angle: 45, power: 60, wind });
    const winds = [-10, -5, 0, 5, 10].map(shot);
    const at = 24;
    assert.equal(shot(0).points[at].x, winds[2].points[at].x);
    for (let i = 1; i < winds.length; i++)
      assert.ok(winds[i - 1].points[at].x < winds[i].points[at].x);
  }
});

test("a slower shot accumulates more wind drift over the same horizontal journey", () => {
  const shots = (power: number) => ({
    calm: simulateShot({ side: "cat", angle: 45, power, wind: 0 }),
    windy: simulateShot({ side: "cat", angle: 45, power, wind: 10 }),
  });
  const driftAtX = (power: number) => {
    const { calm, windy } = shots(power);
    const index = calm.points.findIndex((p) => p.x >= 350);
    assert.ok(index > 0, "both shots reach the same part of the yard");
    return windy.points[index].x - calm.points[index].x;
  };
  assert.ok(driftAtX(15) > driftAtX(85));
});

test("curved guide samples the real simulation and ends before first wall or ground contact", () => {
  const wall = simulateShot({ side: "cat", angle: 20, power: 40, wind: 0 });
  assert.equal(wall.impact.kind, "wall");
  const guide = aimGuidePoints(wall, 100, true);
  assert.ok(guide.length <= 36);
  assert.equal(guide[0], wall.points[0]);
  assert.ok(guide.at(-1)!.time < wall.impact.point.time);
  assert.ok(guide.every((p) => !wallCollision(p.x, p.y)));

  const ground = simulateShot({ side: "cat", angle: 20, power: 5, wind: 0 });
  assert.equal(ground.impact.kind, "ground");
  const lowGuide = aimGuidePoints(ground, 100, true);
  assert.ok(lowGuide.at(-1)!.y + PHYSICS.radius < 460);
  assert.ok(aimGuidePoints(wall, 10, true).length < guide.length);

  for (const [side, power] of [
    ["cat", 75],
    ["cat", 100],
    ["dog", 75],
  ] as const) {
    const result = simulateShot({ side, angle: 55, power, wind: 0 });
    const sample = aimGuidePoints(result, 100, true, true);
    const contact = result.bounces?.[0] ?? result.impact.point;
    assert.ok(sample.at(-1)!.time < contact.time);
    assert.ok(
      sample.every(
        (p) => !characterCollision(p.x, p.y, side === "cat" ? "dog" : "cat"),
      ),
    );
    assert.ok(sample.every((p) => !wallCollision(p.x, p.y)));
  }
});

test("barometer categories communicate calm through gale without changing wind physics", () => {
  assert.equal(windStrengthLabel(0), "CALM");
  assert.equal(windStrengthLabel(1), "LIGHT");
  assert.equal(windStrengthLabel(-3), "MODERATE");
  assert.equal(windStrengthLabel(6), "STRONG");
  assert.equal(windStrengthLabel(-9), "GALE");
});
