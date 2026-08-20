import assert from "node:assert/strict";
import { access, readFile, stat } from "node:fs/promises";
import test from "node:test";

test("game source includes the complete roster and match modes", async () => {
  const source = await readFile(new URL("../app/components/game/GameLobby.tsx", import.meta.url), "utf8");
  const roster = await readFile(new URL("../lib/game/roster.ts", import.meta.url), "utf8");
  for (const hero of ["Blaze", "Luna", "Shadow", "Major Bark", "Bruno", "Snow"]) {
    assert.match(roster, new RegExp(hero));
  }
  assert.match(source, /Play Solo/);
  assert.match(source, /Local 2P/);
  assert.match(source, /Online/);
  assert.match(source, /Fishbone Spinner/);
  assert.match(source, /Rubber Bone/);
});

test("combat uses ballistic input sync instead of pre-decided hit messages", async () => {
  const experience = await readFile(new URL("../app/components/GameExperience.tsx", import.meta.url), "utf8");
  const ballistics = await readFile(new URL("../lib/game/ballistics.ts", import.meta.url), "utf8");
  assert.match(experience, /simulateShot\(input\)/);
  assert.match(experience, /shot-request/);
  assert.doesNotMatch(experience, /makeShot\(side, power, target\)/);
  assert.match(ballistics, /expandedWallCollision/);
  assert.match(ballistics, /circleCollision/);
  assert.match(ballistics, /input\.wind \* PHYSICS\.windAcceleration/);
});

test("battle uses the lightweight 2D renderer and exact trajectory playback", async () => {
  const arenaUrl = new URL("../app/components/GameArena2D.tsx", import.meta.url);
  const arena = await readFile(arenaUrl, "utf8");
  const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));

  await access(arenaUrl);
  await assert.rejects(access(new URL("../app/components/GameArena3D.tsx", import.meta.url)));
  assert.match(arena, /trajectoryPointAt/);
  assert.match(arena, /requestAnimationFrame/);
  assert.match(arena, /ARENA\.wall\.minX/);
  assert.doesNotMatch(arena, /useFrame|<Canvas|@react-three/);
  assert.equal(packageJson.dependencies.three, undefined);
  assert.equal(packageJson.dependencies["@react-three/fiber"], undefined);
  assert.equal(packageJson.dependencies["@react-three/drei"], undefined);
});

test("ships compressed game art instead of multi-megabyte PNG assets", async () => {
  const assets = ["og.webp", "cat-roster.webp", "dog-roster.webp", "weapon-kit.webp"];
  for (const name of assets) {
    const url = new URL(`../public/${name}`, import.meta.url);
    await access(url);
    const details = await stat(url);
    assert.ok(details.size < 180_000, `${name} should remain below 180 KB`);
  }
  await assert.rejects(access(new URL("../public/og.png", import.meta.url)));
});

test("ships the generated six-hero v2 lineup and asset manifest", async () => {
  for (const name of ["blaze.webp", "luna.webp", "shadow.webp", "major.webp", "bruno.webp", "snow.webp", "manifest.json"]) {
    await access(new URL(`../public/characters/${name}`, import.meta.url));
  }
  for (const hero of ["blaze", "luna", "shadow", "major", "bruno", "snow"]) {
    const asset = await stat(new URL(`../public/characters/${hero}.webp`, import.meta.url));
    assert.ok(asset.size < 25_000, `${hero}.webp should stay below 25 KB`);
  }
});

test("ships transparent, optimized battle cutouts for every hero", async () => {
  for (const hero of ["blaze", "luna", "shadow", "major", "bruno", "snow"]) {
    const asset = await stat(new URL(`../public/characters/battle/${hero}.webp`, import.meta.url));
    assert.ok(asset.size < 55_000, `${hero} battle cutout should stay below 55 KB`);
  }
});
