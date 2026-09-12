import { ARENA, NAMES, other } from "./constants";
import { trajectoryPointAt } from "./ballistics";
import type { MatchState, Side } from "./types";

// Original flat-cartoon palette. Canvas colours live here, not in per-frame styles.
const C = {
  ink: "#273c42",
  sky: "#b9e5eb",
  cloud: "#fff9e9",
  sun: "#f8cf61",
  hill: "#91bba0",
  leaf: "#70996c",
  leafLight: "#97ba73",
  grass: "#9ab765",
  grassDark: "#789653",
  soil: "#dfbf84",
  dirt: "#c29e64",
  fence: "#d8ae76",
  fenceDark: "#bc8d59",
  mortar: "#ecd6b4",
  brick: "#c57759",
  brickDark: "#a75a49",
  house: "#e7caab",
  roof: "#b48e7b",
  window: "#88b7bf",
  cat: "#efa345",
  catDark: "#c47631",
  cream: "#fff0d4",
  dog: "#92a5aa",
  dogDark: "#647d87",
  catTeam: "#1d8dab",
  dogTeam: "#cb563c",
  pink: "#df897e",
  shadow: "#42544833",
};
type Context = CanvasRenderingContext2D;
const paths = new Map<string, Path2D>();
function ellipse(
  c: Context,
  x: number,
  y: number,
  rx: number,
  ry: number,
  fill: string,
  outline = false,
) {
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  c.fillStyle = fill;
  c.fill();
  if (outline) {
    c.strokeStyle = C.ink;
    c.lineWidth = 3;
    c.stroke();
  }
}
function path(
  c: Context,
  d: string,
  fill: string,
  stroke = C.ink,
  width = 3,
  cache = true,
) {
  let shape = cache ? paths.get(d) : undefined;
  if (!shape) {
    shape = new Path2D(d);
    if (cache) {
      if (paths.size >= 256) paths.clear();
      paths.set(d, shape);
    }
  }
  c.fillStyle = fill;
  c.fill(shape);
  c.strokeStyle = stroke;
  c.lineWidth = width;
  if (width) c.stroke(shape);
}
function line(
  c: Context,
  x: number,
  y: number,
  a: number,
  b: number,
  color: string,
  width = 3,
) {
  c.beginPath();
  c.moveTo(x, y);
  c.lineTo(a, b);
  c.strokeStyle = color;
  c.lineWidth = width;
  c.stroke();
}
function text(
  c: Context,
  label: string,
  x: number,
  y: number,
  size = 18,
  color = C.ink,
) {
  c.font = `800 ${size}px "Trebuchet MS", sans-serif`;
  c.textAlign = "center";
  c.fillStyle = color;
  c.fillText(label, x, y);
}
function cloud(c: Context, x: number, y: number, scale: number) {
  c.save();
  c.translate(x, y);
  c.scale(scale, scale);
  path(
    c,
    "M-65 12 Q-85-9-49-18 Q-48-49-17-38 Q11-67 34-32 Q66-40 72-13 Q101-5 82 14Z",
    C.cloud,
    C.cloud,
    0,
  );
  c.restore();
}
function backdrop(c: Context) {
  c.fillStyle = C.sky;
  c.fillRect(0, 0, 1000, 560);
  ellipse(c, 868, 87, 37, 37, C.sun);
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    line(
      c,
      868 + Math.cos(a) * 48,
      87 + Math.sin(a) * 48,
      868 + Math.cos(a) * 56,
      87 + Math.sin(a) * 56,
      C.sun,
      4,
    );
  }
  path(
    c,
    "M0 343 Q150 225 310 339 Q450 268 610 327 Q827 241 1000 329V560H0Z",
    C.hill,
    C.hill,
    0,
  );
  for (const [x, y, width] of [
    [-32, 270, 181],
    [658, 281, 157],
    [911, 257, 159],
  ]) {
    c.fillStyle = C.house;
    c.fillRect(x, y, width, 140);
    path(
      c,
      `M${x - 14} ${y} L${x + width / 2} ${y - 63} L${x + width + 14} ${y}Z`,
      C.roof,
      C.roof,
      0,
    );
    c.fillStyle = C.window;
    c.fillRect(x + width * 0.45, y + 22, 32, 43);
    line(
      c,
      x + width * 0.45 + 16,
      y + 22,
      x + width * 0.45 + 16,
      y + 65,
      C.cloud,
      3,
    );
  }
  for (const x of [70, 340, 625, 966]) {
    c.fillStyle = C.fenceDark;
    c.fillRect(x, 305, 10, 95);
    ellipse(c, x - 12, 300, 36, 36, C.leaf);
    ellipse(c, x + 20, 295, 37, 44, C.leaf);
    ellipse(c, x, 274, 34, 37, C.leafLight);
  }
  c.fillStyle = C.fenceDark;
  c.fillRect(0, 360, 1000, 88);
  for (let x = -10; x < 1000; x += 28) {
    path(
      c,
      `M${x} 440 V365L${x + 12} 352L${x + 25} 365V440Z`,
      C.fence,
      C.fenceDark,
      2,
    );
    ellipse(c, x + 12, 382, 1.5, 1.5, C.fenceDark);
  }
  c.fillStyle = C.grass;
  c.fillRect(0, 426, 1000, 134);
  path(
    c,
    "M0 482 Q210 450 400 479 Q635 510 1000 475V560H0Z",
    C.soil,
    C.soil,
    0,
  );
  for (let i = 0; i < 40; i++)
    ellipse(
      c,
      (i * 137) % 1000,
      491 + ((i * 31) % 65),
      2 + (i % 3),
      1.5,
      C.dirt,
    );
  // Props stay behind the combat area, never in the flight corridor.
  c.save();
  c.translate(58, 424);
  path(c, "M-22 0L-26-62H24L19 0Z", C.dogDark);
  path(c, "M-30-62Q0-74 29-62V-57H-30Z", C.dog);
  line(c, -10, -49, -8, -9, C.dog, 3);
  line(c, 9, -49, 7, -9, C.dog, 3);
  c.restore();
  c.save();
  c.translate(927, 444);
  path(c, "M-25-14H25L18 0H-18Z", C.dogTeam);
  text(c, "B", 0, -2, 11, C.cream);
  c.restore();
  line(c, 225, 306, 418, 316, C.fenceDark, 2);
  path(c, "M283 310L278 342L303 344L308 311Z", C.cream, C.cream, 0);
  path(c, "M333 313L331 337L351 339L357 314Z", C.catTeam, C.catTeam, 0);
  const w = ARENA.wall;
  c.fillStyle = C.mortar;
  c.fillRect(w.x, w.y, w.width, w.height);
  for (let row = 0; row < 8; row++) {
    c.fillStyle = row % 3 === 0 ? C.brickDark : C.brick;
    c.fillRect(w.x + 1, w.y + row * 20 + 1, w.width - 2, 17);
    const seam = w.x + (row % 2 ? 12 : 28);
    line(c, seam, w.y + row * 20, seam, w.y + row * 20 + 18, C.mortar, 2);
  }
  c.strokeStyle = C.ink;
  c.lineWidth = 2;
  c.strokeRect(w.x, w.y, w.width, w.height);
  for (let i = 0; i < 28; i++) {
    const x = (i * 89) % 1000,
      y = 454 + (i % 4) * 4;
    line(c, x, y, x - 4, y - 8, C.grassDark, 2);
    line(c, x, y, x + 5, y - 10, C.grassDark, 2);
  }
}

function weapon(c: Context, side: Side) {
  c.lineCap = "round";
  if (side === "cat") {
    line(c, -17, 0, 17, 0, C.ink, 7);
    line(c, -17, 0, 17, 0, C.cream, 4);
    for (const x of [-7, 1, 9]) {
      line(c, x - 4, -7, x + 2, 0, C.cream, 4);
      line(c, x - 4, 7, x + 2, 0, C.cream, 4);
    }
    path(c, "M-17 0L-25-8V8Z", C.cream, C.ink, 1.5);
    ellipse(c, 20, 0, 7, 7, C.cream, true);
    ellipse(c, 22, -2, 1.5, 1.5, C.ink);
  } else {
    path(
      c,
      "M-13-5Q-21-17-26-8Q-31 0-22 1Q-30 10-22 12Q-16 14-12 5H12Q17 16 24 10Q31 3 23 0Q30-7 24-11Q17-15 12-5Z",
      C.cream,
      C.ink,
      2,
    );
  }
}

function fighter(c: Context, s: MatchState, side: Side, reduced: boolean) {
  const active = s.turn === side,
    cat = side === "cat",
    skin = cat ? C.cat : C.dog;
  const hit = s.effects.find((e) => e.impact.target === side);
  const miss =
    s.phase === "impact" &&
    !s.effects.some((e) => e.impact.kind === "target") &&
    !s.message.includes("snack");
  const victory = s.winner === side,
    defeat = s.winner === other(side);
  const charge = active && s.phase === "charging" ? s.power / 100 : 0;
  const throwing =
    active &&
    (s.phase === "throwing" || (s.phase === "flying" && s.elapsed < 0.25));
  const time = reduced ? 0 : s.clock;
  c.save();
  c.translate(ARENA.fighters[side].x, ARENA.ground);
  ellipse(c, 0, 1, 49, 9, C.shadow);
  if (active && s.phase !== "menu" && !s.winner) {
    c.strokeStyle = cat ? C.catTeam : C.dogTeam;
    c.lineWidth = 3;
    c.beginPath();
    c.ellipse(0, 2, 51, 12, 0, 0, Math.PI * 2);
    c.stroke();
  }
  c.scale(cat ? 1 : -1, 1);
  if (!reduced) {
    c.rotate(
      charge * -0.12 +
        (throwing ? 0.09 : 0) +
        (hit ? -Math.sin(hit.age * 25) * 0.13 * (1 - hit.age) : 0),
    );
    c.scale(1 + charge * 0.05, 1 - charge * 0.07 + Math.sin(time * 2.8) * 0.01);
    if (victory) c.translate(0, -Math.abs(Math.sin(time * 7)) * 9);
    if (miss && !active) c.scale(1, 1 + Math.sin(s.elapsed * 19) * 0.025);
  }
  if (defeat) {
    c.scale(1.08, 0.72);
    c.rotate(-0.08);
  }
  // Tail, torso, and feet are articulated around the ground anchor.
  c.save();
  c.translate(-26, -29);
  c.rotate(Math.sin(time * 3) * 0.12);
  path(
    c,
    cat
      ? "M0 7C-51 13-73-12-59-43Q-51-54-46-43C-59-18-28-9 0-10Z"
      : "M0 5Q-57-14-43-36Q-33-42-30-31Q-35-18 4-8Z",
    skin,
  );
  c.restore();
  ellipse(c, 0, -43, cat ? 32 : 39, 44, skin, true);
  ellipse(c, 7, -40, 20, 27, C.cream);
  ellipse(c, -21, -5, 20, 9, skin, true);
  ellipse(c, 23, -5, 22, 9, skin, true);
  line(c, 20, -5, 20, -1, C.ink, 1.5);
  line(c, 28, -5, 28, -1, C.ink, 1.5);
  // Back paw and throwing arm have independent, short anticipation/follow-through.
  ellipse(c, -27, -48, 12, 23, skin, true);
  c.save();
  c.translate(23, -64);
  c.rotate(charge * -1.1 + (throwing ? 0.8 : -0.25));
  path(c, "M-7 0Q-14-25-3-32Q9-37 14-23L13 0Z", skin);
  ellipse(c, 5, -29, 12, 12, skin, true);
  if (
    (active && ["aiming", "charging", "throwing"].includes(s.phase)) ||
    s.phase === "menu"
  ) {
    c.translate(5, -43);
    c.rotate(-0.4);
    c.scale(0.65, 0.65);
    weapon(c, side);
  }
  c.restore();
  // Head: different ear and muzzle silhouettes; no borrowed sprite assets.
  c.save();
  c.translate(0, -96 + (defeat ? 16 : 0));
  if (cat) {
    path(c, "M-35-9L-39-51L-11-32L13-33L36-51L39-10Z", skin);
    path(c, "M-31-32L-32-42L-21-32ZM24-32L31-42L31-30Z", C.pink, C.pink, 0);
  } else {
    ellipse(c, -36, -13, 18, 31, C.dogDark, true);
    ellipse(c, 33, -12, 17, 31, C.dogDark, true);
  }
  ellipse(c, 0, -5, cat ? 39 : 41, 34, skin, true);
  if (cat) {
    path(c, "M-12-36L-6-20L0-33L7-19L12-35", C.catDark, C.catDark, 0);
    line(c, -35, 0, -26, 4, C.catDark, 4);
    line(c, -35, 9, -26, 12, C.catDark, 4);
  } else ellipse(c, -19, -11, 17, 20, C.dogDark);
  const blink = time % 4.1 > 3.98 || defeat;
  for (const x of [-13, 16]) {
    ellipse(c, x, -10, 12, blink ? 2 : 14, C.cloud, true);
    if (!blink) ellipse(c, x + 4, -8, 4.5, hit ? 7 : 8, C.ink);
    line(c, x - 10, -26 + (hit ? -6 : 0), x + 9, -23, C.ink, 3.5);
  }
  ellipse(c, 7, 13, cat ? 24 : 31, cat ? 15 : 20, C.cream, true);
  path(c, "M-2 5Q9-1 16 5L8 12Z", C.ink, C.ink, 1);
  if (hit || victory || (miss && !active)) {
    ellipse(c, 10, 24, 10, hit ? 10 : 7, C.ink);
    if (!hit) ellipse(c, 12, 27, 7, 3, C.pink);
  } else {
    path(c, "M8 12V21Q19 28 27 16", "transparent", C.ink, 2);
  }
  if (cat)
    for (const dy of [9, 17]) {
      line(c, -17, dy, -47, dy - 4, C.ink, 1.7);
      line(c, 25, dy, 45, dy - 3, C.ink, 1.7);
    }
  else {
    ellipse(c, -7, 17, 1.4, 1.4, C.ink);
    ellipse(c, -13, 12, 1.4, 1.4, C.ink);
  }
  c.restore();
  path(
    c,
    cat ? "M-23-67L29-67L13-53L6-40L-3-53Z" : "M-30-68H32V-58H-30Z",
    cat ? C.catTeam : C.dogTeam,
    C.ink,
    2,
  );
  if (!cat) ellipse(c, 10, -55, 7, 8, C.sun, true);
  c.restore();
}

export class GameRenderer {
  private background: HTMLCanvasElement;
  constructor() {
    this.background = document.createElement("canvas");
    this.background.width = ARENA.width;
    this.background.height = ARENA.height;
    const context = this.background.getContext("2d");
    if (context) {
      context.fillStyle = C.sky;
      context.fillRect(0, 0, ARENA.width, ARENA.height);
      context.translate(0, -ARENA.cameraTop);
      backdrop(context);
    }
  }
  draw(c: Context, s: MatchState, reduced: boolean, lowPower: boolean) {
    c.save();
    c.lineJoin = "round";
    c.lineCap = "round";
    const hit = s.effects.find(
      (e) => e.impact.kind === "target" && e.age < 0.18,
    );
    if (hit && !reduced)
      c.translate(Math.sin(hit.age * 70) * 2.5, Math.cos(hit.age * 80) * 1.5);
    c.drawImage(this.background, 0, 0);
    c.translate(0, -ARENA.cameraTop);
    const windTime = reduced ? 0 : s.clock * s.wind * 0.5;
    cloud(c, 235 + Math.sin(windTime / 60) * 20, 100, 0.75);
    cloud(c, 600 + Math.sin(windTime / 90) * 24, 160, 0.55);
    // Flag responds to actual wind, never random opposite-direction decoration.
    line(c, 500, 300, 500, 237, C.ink, 3);
    const dir = s.wind >= 0 ? 1 : -1,
      length = 12 + Math.abs(s.wind) * 3.5;
    path(
      c,
      `M500 238Q${500 + (dir * length) / 2} ${232 + Math.sin(s.clock * 7) * (reduced ? 0 : 3)} ${500 + dir * length} 240L${500 + dir * length} 259Q${500 + (dir * length) / 2} 252 500 258Z`,
      C.sun,
      C.ink,
      1.5,
      false,
    );
    fighter(c, s, "cat", reduced);
    fighter(c, s, "dog", reduced);
    if (["aiming", "charging"].includes(s.phase)) {
      const origin = ARENA.origins[s.turn],
        a = (s.angle * Math.PI) / 180,
        direction = s.turn === "cat" ? 1 : -1;
      for (let i = 1; i <= 4; i++)
        ellipse(
          c,
          origin.x + Math.cos(a) * i * 13 * direction,
          origin.y - Math.sin(a) * i * 13,
          2.5,
          2.5,
          C.ink,
        );
      text(
        c,
        NAMES[s.turn],
        ARENA.fighters[s.turn].x,
        499,
        17,
        s.turn === "cat" ? C.catTeam : C.dogTeam,
      );
    }
    for (const flight of s.flights) {
      const elapsed = s.elapsed - flight.delay;
      if (elapsed < 0 || flight.resolved) continue;
      const point = trajectoryPointAt(flight.result, elapsed);
      if (!reduced)
        for (let i = 1; i <= (lowPower ? 3 : 7); i++) {
          const tail = trajectoryPointAt(
            flight.result,
            Math.max(0, elapsed - i * 0.024),
          );
          c.globalAlpha = 0.5 - i * 0.055;
          ellipse(c, tail.x, tail.y, 4 - i * 0.3, 4 - i * 0.3, C.cloud);
        }
      c.globalAlpha = 1;
      c.save();
      c.translate(point.x, point.y);
      c.rotate(Math.atan2(point.vy, point.vx) + elapsed * 7);
      c.scale(0.7, 0.7);
      weapon(c, flight.result.input.side);
      c.restore();
    }
    for (const effect of s.effects) {
      const { impact, age } = effect;
      const x = Math.max(42, Math.min(958, impact.point.x)),
        y = impact.point.y;
      c.globalAlpha = Math.max(0, 1 - age / 0.8);
      if (!reduced)
        for (let i = 0; i < (lowPower ? 5 : 10); i++) {
          const a = i * 2.399;
          const px = x + Math.cos(a) * age * 85,
            py = y + Math.sin(a) * age * 65 + age * age * 80;
          ellipse(
            c,
            px,
            py,
            4 * (1 - age),
            3,
            impact.kind === "target" ? C.sun : C.brick,
          );
        }
      text(
        c,
        impact.kind === "target"
          ? "BONK!"
          : impact.kind === "wall"
            ? "CLONK!"
            : impact.kind === "boundary"
              ? "WHOOPS!"
              : "PUFF!",
        x,
        y - 32 - (reduced ? 0 : age * 30),
        24,
      );
      if (impact.damage)
        text(
          c,
          `−${impact.damage}`,
          x,
          y - 62 - (reduced ? 0 : age * 30),
          29,
          C.dogTeam,
        );
      c.globalAlpha = 1;
    }
    if (!reduced && !lowPower && Math.abs(s.wind) > 1)
      for (let i = 0; i < 4; i++) {
        const x = (((i * 273 + s.clock * s.wind * 8) % 1000) + 1000) % 1000;
        c.save();
        c.translate(x, 270 + i * 41 + Math.sin(s.clock + i) * 5);
        c.rotate(s.clock + i);
        ellipse(c, 0, 0, 5, 2, C.leaf);
        c.restore();
      }
    c.restore();
  }
}
