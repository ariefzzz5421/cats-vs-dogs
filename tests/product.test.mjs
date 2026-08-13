import assert from "node:assert/strict";
import { access, readFile, stat } from "node:fs/promises";
import test from "node:test";

test("game source includes the complete roster and match modes", async () => {
  const source = await readFile(new URL("../app/components/GameExperience.tsx", import.meta.url), "utf8");
  for (const hero of ["Blaze", "Luna", "Shadow", "Major Bark", "Bruno", "Snow"]) {
    assert.match(source, new RegExp(hero));
  }
  assert.match(source, /Vs Bot/);
  assert.match(source, /Same Device/);
  assert.match(source, /Online Room/);
  assert.match(source, /Fishbone Spinner/);
  assert.match(source, /Golden Bone/);
  assert.match(source, /HP: \$\{value\} dari 100/);
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
