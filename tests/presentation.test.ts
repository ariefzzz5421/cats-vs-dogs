import assert from "node:assert/strict";
import test from "node:test";
import { cameraKick, cameraTarget, FIGHTER_VISUAL_SCALE, hitMotion, throwPose, THROW_DURATION } from "../lib/game/presentation";
import { createMatch, advance, startMatch, startCharge, releaseCharge } from "../lib/game/engine";

test("charge tension increases and release choreography is continuous", () => {
  assert.ok(throwPose("charging", 1, 100).arm < throwPose("charging", 1, 5).arm);
  assert.deepEqual(throwPose("charging", 0, 75), throwPose("throwing", 0, 75));
  assert.deepEqual(throwPose("throwing", THROW_DURATION, 75), throwPose("flying", 0, 75));
  assert.deepEqual(throwPose("flying", 0.38, 75), throwPose("aiming", 0, 75));
  const start = throwPose("throwing", 0, 75).arm;
  const finish = throwPose("throwing", THROW_DURATION, 75).arm;
  const early = throwPose("throwing", THROW_DURATION / 4, 75).arm;
  assert.ok((early - start) / (finish - start) > 0.25, "throw accelerates promptly on release");
});

test("hit recoil peaks, settles and stays inside restrained screen-motion bounds", () => {
  const impact = hitMotion(0, 20);
  const peak = hitMotion(0.06, 20);
  const settle = hitMotion(0.2, 20);
  assert.equal(impact.knockback, 0);
  assert.ok(peak.knockback > settle.knockback && settle.knockback > 0);
  assert.equal(hitMotion(0.5, 20).knockback, 0);
  assert.equal(hitMotion(0.5, 20).scaleX, 1);
  assert.equal(FIGHTER_VISUAL_SCALE, 1.24);
  assert.ok(hitMotion(0.06, 30).knockback > peak.knockback);
  for (let age = 0; age <= 0.2; age += 0.005) {
    const kick = cameraKick(age, 30);
    assert.ok(Math.abs(kick.x) <= 3 && Math.abs(kick.y) <= 2);
  }
  assert.deepEqual(cameraKick(0.22, 30), { x: 0, y: 0 });
  assert.deepEqual(cameraTarget(), { x: 0, y: 0, zoom: 1 });
  assert.ok(cameraTarget({ x: 100, y: -150 }).zoom < 1);
  assert.ok(Math.abs(cameraTarget({ x: 100, y: -150 }).x) <= 14);
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
