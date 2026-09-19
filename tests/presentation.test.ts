import assert from "node:assert/strict";
import test from "node:test";
import { throwPose, THROW_DURATION } from "../lib/game/presentation";
import { createMatch, advance, startMatch, startCharge, releaseCharge } from "../lib/game/engine";

test("charge tension increases and release choreography is continuous", () => {
  assert.ok(throwPose("charging", 1, 100).arm < throwPose("charging", 1, 5).arm);
  assert.deepEqual(throwPose("charging", 0, 75), throwPose("throwing", 0, 75));
  assert.deepEqual(throwPose("throwing", THROW_DURATION, 75), throwPose("flying", 0, 75));
  assert.deepEqual(throwPose("flying", 0.3, 75), throwPose("aiming", 0, 75));
});

test("release waits for anticipation, then launches one physical projectile", () => {
  const s = createMatch("local"); startMatch(s);
  for (let i = 0; i < 100; i++) advance(s, 1 / 120);
  startCharge(s); releaseCharge(s);
  advance(s, 0.05);
  assert.equal(s.phase, "throwing"); assert.equal(s.flights.length, 0);
  for (let i = 0; i < 24; i++) advance(s, 1 / 120);
  assert.equal(s.phase, "flying"); assert.equal(s.flights.length, 1);
  assert.equal(releaseCharge(s), false);
});
