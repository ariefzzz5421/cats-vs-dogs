import { ARENA, PHYSICS, other } from "./constants";
import { simulateShot, trajectoryPointAt } from "./ballistics";
import { aimGuidePoints } from "./aimGuide";
import { drawWeapon, WEAPON_ART } from "./weapons";
import { BOT_PROFILES, botState, botTrackingOffset } from "./bot";
import {
  cameraKick,
  cameraTarget,
  FIGHTER_VISUAL_SCALE,
  hitMotion,
  throwPose,
  THROW_DURATION,
} from "./presentation";
import type { MatchState, Side } from "./types";
import { THEMES, WALL_VARIANTS, type ThemeId as ArenaTheme } from "./themes";
import {
  characterFor,
  characterMotion,
  CHARACTERS,
  type CharacterId,
  type WeaponId,
} from "./characters";
import { createMatch } from "./engine";

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

function cloud(c: Context, x: number, y: number, scale: number, fill: string) {
  c.save();
  c.translate(x, y);
  c.scale(scale, scale);
  path(
    c,
    "M-65 12 Q-85-9-49-18 Q-48-49-17-38 Q11-67 34-32 Q66-40 72-13 Q101-5 82 14Z",
    fill,
    fill,
    0,
  );
  c.restore();
}

function centerWall(c: Context, theme: ArenaTheme) {
  const { x, y, width, height } = ARENA.wall;
  const skin = WALL_VARIANTS[theme];
  c.save();
  c.beginPath();
  c.rect(x, y, width, height);
  c.clip();
  c.fillStyle = skin.shade;
  c.fillRect(x, y, width, height);
  c.fillStyle = skin.face;
  c.fillRect(x + 3, y + 4, width - 6, height - 4);
  if (skin.kind === "vent") {
    c.fillStyle = skin.light;
    c.fillRect(x + 2, y + 4, width - 4, 17);
    for (let row = 0; row < 6; row++) {
      const sy = y + 31 + row * 21;
      c.fillStyle = row % 2 ? skin.shade : skin.mortar;
      c.fillRect(x + 7, sy, width - 14, 11);
      line(c, x + 10, sy + 3, x + width - 10, sy + 3, skin.light, 2);
    }
    line(c, x + 5, y + 23, x + 5, y + height, skin.detail, 2);
  } else {
    const rows = skin.kind === "stone" ? 6 : 9;
    const rowHeight = height / rows;
    for (let row = 0; row < rows; row++) {
      const sy = y + row * rowHeight;
      line(c, x + 2, sy, x + width - 2, sy, skin.mortar, 2.4);
      const seam = x + (row % 2 ? 15 : 27);
      line(
        c,
        seam,
        sy + 2,
        seam - (row % 3 === 0 ? 2 : 0),
        sy + rowHeight - 3,
        skin.mortar,
        2,
      );
      c.fillStyle = row % 3 === 0 ? skin.light : skin.shade;
      c.globalAlpha = 0.34;
      c.fillRect(
        x + (row % 2 ? 4 : 19),
        sy + 5,
        11,
        Math.max(3, rowHeight - 10),
      );
      c.globalAlpha = 1;
    }
    path(c, "M486 343l5 5 4-8m13 83 5 6 3-4", "transparent", skin.shade, 1.5);
    if (theme === "night" || theme === "sakura") {
      for (const [mx, my] of [
        [x + 4, y + 17],
        [x + 32, y + 67],
        [x + 8, y + 111],
      ])
        ellipse(c, mx, my, 4, 2, skin.detail);
    }
    if (theme === "rainy") {
      c.globalAlpha = 0.5;
      for (const drip of [x + 8, x + 27])
        line(c, drip, y + 7, drip, y + 25, skin.detail, 2);
      c.globalAlpha = 1;
    }
  }
  path(
    c,
    `M${x} ${y + 4}L${x + 4} ${y + 1}L${x + 15} ${y + 2}L${x + 21} ${y}L${x + width - 5} ${y + 1}L${x + width} ${y + 4}`,
    "transparent",
    skin.light,
    4,
    false,
  );
  line(c, x + width - 3, y + 5, x + width - 3, y + height, skin.shade, 4);
  c.restore();
  c.strokeStyle = C.ink;
  c.lineWidth = 3;
  c.lineJoin = "round";
  c.beginPath();
  c.moveTo(x + 1.5, y + height - 1.5);
  c.lineTo(x + 1.5, y + 5);
  c.lineTo(x + 7, y + 2);
  c.lineTo(x + 17, y + 3);
  c.lineTo(x + 24, y + 1.5);
  c.lineTo(x + width - 7, y + 2);
  c.lineTo(x + width - 1.5, y + 5);
  c.lineTo(x + width - 1.5, y + height - 1.5);
  c.closePath();
  c.stroke();
}

function backdrop(c: Context, themeId: ArenaTheme) {
  const t = THEMES[themeId].palette;
  const sky = c.createLinearGradient(0, 0, 0, 420);
  sky.addColorStop(0, t.skyTop);
  sky.addColorStop(1, t.skyBottom);
  c.fillStyle = sky;
  c.fillRect(0, 0, 1000, 560);

  if (themeId === "night") {
    for (let i = 0; i < 30; i++) {
      const x = (i * 137 + 31) % 1000;
      const y = 24 + ((i * 67) % 190);
      ellipse(c, x, y, i % 5 === 0 ? 2 : 1.2, i % 5 === 0 ? 2 : 1.2, "#f5f0d7");
    }
    ellipse(c, 862, 82, 34, 34, t.sun);
    ellipse(c, 875, 70, 30, 30, t.skyTop);
  } else if (themeId !== "rainy") {
    const sunY = themeId === "sunset" ? 128 : 87;
    ellipse(c, 868, sunY, 37, 37, t.sun);
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      line(
        c,
        868 + Math.cos(a) * 48,
        sunY + Math.sin(a) * 48,
        868 + Math.cos(a) * 56,
        sunY + Math.sin(a) * 56,
        t.sun,
        4,
      );
    }
  }

  path(
    c,
    "M0 343 Q150 225 310 339 Q450 268 610 327 Q827 241 1000 329V560H0Z",
    t.hill,
    t.hill,
    0,
  );

  c.save();
  c.globalAlpha = 0.52;
  if (
    THEMES[themeId].environment === "roof" ||
    THEMES[themeId].environment === "alley"
  ) {
    for (let i = 0; i < 9; i++) {
      const x = i * 132 - 50,
        y = 160 + ((i * 47) % 130);
      c.fillStyle = t.house;
      c.fillRect(x, y, 98, 270);
      c.fillStyle = t.roof;
      c.fillRect(x - 6, y, 110, 9);
      for (let row = 0; row < 4; row++)
        for (let col = 0; col < 3; col++) {
          c.fillStyle = t.window;
          c.fillRect(x + 12 + col * 27, y + 22 + row * 42, 12, 19);
        }
      line(c, x + 54, y, x + 54, y - 34, t.fenceDark, 3);
      line(c, x + 36, y - 28, x + 72, y - 28, t.fenceDark, 2);
    }
  }
  for (const [x, y, width] of [
    [-32, 270, 181],
    [911, 257, 159],
  ] as const) {
    c.fillStyle = t.house;
    c.fillRect(x, y, width, 140);
    path(
      c,
      `M${x - 14} ${y} L${x + width / 2} ${y - 63} L${x + width + 14} ${y}Z`,
      t.roof,
      t.roof,
      0,
    );
    c.fillStyle = t.window;
    c.fillRect(x + width * 0.45, y + 22, 32, 43);
    line(
      c,
      x + width * 0.45 + 16,
      y + 22,
      x + width * 0.45 + 16,
      y + 65,
      t.cloud,
      3,
    );
  }

  for (const x of [70, 340, 966]) {
    c.fillStyle = t.fenceDark;
    c.fillRect(x, 305, 10, 95);
    ellipse(c, x - 12, 300, 36, 36, t.leaf);
    ellipse(c, x + 20, 295, 37, 44, t.leaf);
    ellipse(c, x, 274, 34, 37, t.leafLight);
  }
  c.restore();

  if (themeId === "sakura") {
    for (let i = 0; i < 24; i++) {
      const x = (i * 83 + 20) % 1000;
      const y = 205 + ((i * 29) % 145);
      ellipse(c, x, y, 5, 3, i % 2 ? "#f0a8ba" : "#ffd2dc");
    }
  }

  c.fillStyle = t.fenceDark;
  c.fillRect(0, 360, 1000, 88);
  for (let x = -10; x < 1000; x += 28) {
    path(
      c,
      `M${x} 440 V365L${x + 12} 352L${x + 25} 365V440Z`,
      t.fence,
      t.fenceDark,
      2,
    );
    ellipse(c, x + 12, 382, 1.5, 1.5, t.fenceDark);
  }

  c.fillStyle = t.grass;
  c.fillRect(0, 426, 1000, 134);
  path(
    c,
    "M0 482 Q210 450 400 479 Q635 510 1000 475V560H0Z",
    t.soil,
    t.soil,
    0,
  );

  for (let i = 0; i < 18; i++) {
    ellipse(
      c,
      (i * 137) % 1000,
      491 + ((i * 31) % 65),
      2 + (i % 3),
      1.5,
      themeId === "night" ? "#756a5b" : C.dirt,
    );
  }

  c.save();
  c.translate(58, 424);
  path(c, "M-22 0L-26-62H24L19 0Z", "#647d87");
  path(c, "M-30-62Q0-74 29-62V-57H-30Z", "#92a5aa");
  line(c, -10, -49, -8, -9, "#92a5aa", 3);
  line(c, 9, -49, 7, -9, "#92a5aa", 3);
  c.restore();

  c.save();
  c.translate(927, 444);
  c.save();
  c.translate(-4, -19);
  c.rotate(-0.3);
  c.scale(0.6, 0.6);
  weapon(c, "dog");
  c.restore();
  path(c, "M-25-14H25L18 0H-18Z", C.dogTeam);
  c.save();
  c.translate(0, -6);
  c.scale(0.32, 0.32);
  weapon(c, "dog");
  c.restore();
  c.restore();

  c.save();
  c.globalAlpha = 0.48;
  line(c, 225, 306, 418, 316, t.fenceDark, 2);
  path(c, "M283 310L278 342L303 344L308 311Z", "#fff0d4", "#fff0d4", 0);
  path(c, "M333 313L331 337L351 339L357 314Z", C.catTeam, C.catTeam, 0);
  c.restore();

  centerWall(c, themeId);

  if (THEMES[themeId].environment === "roof") {
    c.fillStyle = t.soil;
    c.fillRect(0, 461, 1000, 90);
    for (let x = 0; x < 1000; x += 125)
      line(c, x, 480, x + 70, 551, t.fenceDark, 1);
    path(c, "M50 469V437H91V469Z", t.fenceDark);
    path(c, "M910 466V430H949V466Z", t.fenceDark);
    ellipse(c, 70, 431, 20, 9, t.leaf);
    ellipse(c, 930, 425, 20, 9, t.leaf);
  }
  if (THEMES[themeId].environment === "alley") {
    c.fillStyle = t.soil;
    c.fillRect(0, 461, 1000, 90);
    for (const x of [110, 380, 620, 906]) {
      ellipse(c, x, 485 + (x % 17), 56, 7, "#c0d4d7");
      line(c, x - 29, 484 + (x % 17), x + 29, 484 + (x % 17), "#e0ecdf", 2);
    }
    for (let x = 0; x < 1000; x += 90)
      line(c, x, 542, x + 50, 542, t.fenceDark, 2);
  }
  if (themeId === "sakura") {
    path(c, "M75 309L63 261H95L82 309Z", t.fenceDark);
    ellipse(c, 78, 232, 68, 30, t.leaf);
    ellipse(c, 105, 213, 42, 32, t.leafLight);
    path(
      c,
      "M650 390V355H724V390M640 353Q686 344 734 353",
      "transparent",
      t.fenceDark,
      5,
    );
  }
  c.fillStyle = t.grassDark;
  c.fillRect(0, 551, 1000, 9);

  for (let i = 0; i < 16; i++) {
    const x = (i * 89) % 1000;
    const y = 454 + (i % 4) * 4;
    line(c, x, y, x - 4, y - 8, t.grassDark, 2);
    line(c, x, y, x + 5, y - 10, t.grassDark, 2);
  }
}

function weapon(
  c: Context,
  side: Side,
  identity: WeaponId = side === "cat" ? "fishbone" : "bone",
) {
  drawWeapon(c, identity);
}

let hintKey = "";
let hint: ReturnType<typeof simulateShot> | null = null;
function drawAimGuide(c: Context, s: MatchState, reduced: boolean) {
  const style = characterFor(s.turn, s.setup.fighters);
  const power = s.phase === "charging" ? Math.round(s.power / 2) * 2 : 55;
  const key = [
    s.turn,
    s.angle,
    power,
    s.wind,
    s.selected,
    s.signatureSelected,
    style.id,
  ].join("|");
  if (key !== hintKey) {
    hintKey = key;
    hint = simulateShot({
      side: s.turn,
      angle: s.angle,
      power,
      wind: s.wind,
      item: s.selected ?? undefined,
      character: style.id,
      signature: s.signatureSelected,
    });
  }
  if (!hint) return;
  const guide = aimGuidePoints(
    hint,
    power,
    s.phase === "charging",
    s.signatureSelected && style.id === "rex",
  );
  if (guide.length < 2) return;
  const end = guide[guide.length - 1];
  const tangent = Math.atan2(end.vy, end.vx);
  c.save();
  c.strokeStyle = style.accent;
  c.lineWidth = reduced ? 3 : 4;
  c.lineCap = "round";
  c.lineJoin = "round";
  c.globalAlpha = 0.82;
  c.beginPath();
  c.moveTo(guide[0].x, guide[0].y);
  for (const point of guide.slice(1)) c.lineTo(point.x, point.y);
  c.stroke();
  c.translate(end.x, end.y);
  c.rotate(tangent);
  c.fillStyle = style.accent;
  c.beginPath();
  c.moveTo(1, 0);
  c.lineTo(-13, -8);
  c.lineTo(-10, 0);
  c.lineTo(-13, 8);
  c.closePath();
  c.fill();
  c.strokeStyle = C.ink;
  c.lineWidth = 1.5;
  c.stroke();
  c.restore();
}
function chargeDial(c: Context, s: MatchState, visualOffset: number) {
  if (!["aiming", "charging", "throwing"].includes(s.phase)) return;
  const x = ARENA.fighters[s.turn].x;
  const y = ARENA.ground - 198;
  const charging = s.phase !== "aiming";
  const visualPower =
    s.phase === "charging"
      ? Math.min(PHYSICS.maxPower, s.power + PHYSICS.chargeRate * visualOffset)
      : s.power;
  c.save();
  c.lineWidth = 12;
  c.strokeStyle = C.ink;
  c.beginPath();
  c.arc(x, y, 57, Math.PI * 1.12, Math.PI * 1.88);
  c.stroke();
  c.lineWidth = 7;
  c.strokeStyle = "#fff9e9";
  c.stroke();
  if (charging) {
    c.strokeStyle = s.power > 85 ? C.dogTeam : C.sun;
    c.beginPath();
    c.arc(
      x,
      y,
      57,
      Math.PI * 1.12,
      Math.PI * (1.12 + (0.76 * visualPower) / 100),
    );
    c.stroke();
  }
  text(c, charging ? `${Math.round(visualPower)}%` : "HOLD", x, y - 19, 20);
  text(c, charging ? "RELEASE!" : "TO THROW", x, y - 2, 11);
  c.restore();
}

function fighter(
  c: Context,
  s: MatchState,
  side: Side,
  reduced: boolean,
  visualOffset: number,
) {
  const active = s.turn === side;
  const cat = side === "cat";
  const style = characterFor(side, s.setup.fighters);
  const motion = characterMotion(style.id);
  const hit = s.effects.findLast(
    (e) => e.impact.target === side && e.age < 0.5,
  );
  const miss =
    s.phase === "impact" &&
    !s.effects.some((e) => e.impact.kind === "target") &&
    !s.message.includes("snack");
  const victory = s.winner === side;
  const defeat = s.winner === other(side);
  const charge = active && s.phase === "charging" ? s.power / 100 : 0;
  const throwing =
    active &&
    (s.phase === "throwing" || (s.phase === "flying" && s.elapsed < 0.25));
  const elapsed = s.elapsed + visualOffset;
  const time = reduced
    ? 0
    : (s.clock + visualOffset) * (s.health[side] < 30 ? 0.75 : 1);
  const idle = Math.sin(time * motion.idleRate + (cat ? 0 : 1.2));
  const breathe = reduced ? 0 : Math.sin(time * 3.1) * 0.026;
  const recoil =
    throwing && s.phase === "throwing"
      ? Math.sin(Math.min(1, elapsed / THROW_DURATION) * Math.PI)
      : 0;
  const pose = throwPose(active ? s.phase : "menu", elapsed, s.power);
  const reaction =
    hit && !reduced
      ? hitMotion(hit.age + visualOffset, hit.impact.damage)
      : null;

  c.save();
  c.translate(ARENA.fighters[side].x, ARENA.ground);
  ellipse(c, 0, 1, 58, 10, C.shadow);

  if (active && s.phase !== "menu" && !s.winner) {
    c.strokeStyle = style.accent;
    c.lineWidth = 3;
    c.beginPath();
    c.ellipse(0, 2, 59, 13, 0, 0, Math.PI * 2);
    c.stroke();
  }

  c.scale(
    cat ? FIGHTER_VISUAL_SCALE : -FIGHTER_VISUAL_SCALE,
    FIGHTER_VISUAL_SCALE,
  );
  c.scale(
    style.shape === "heavy"
      ? 1.13
      : style.shape === "sleek"
        ? 0.88
        : style.shape === "small"
          ? cat
            ? 0.86
            : 1.06
          : 1,
    style.shape === "sleek"
      ? 1.07
      : style.shape === "small"
        ? cat
          ? 0.92
          : 0.82
        : 1,
  );
  if (!reduced) {
    c.translate(-recoil * 3 - (reaction?.knockback ?? 0), 0);
    c.rotate(pose.lean + (reaction?.tilt ?? 0));
    c.scale(
      (1 + charge * 0.085 - breathe * 0.5) * (reaction?.scaleX ?? 1),
      (1 - charge * 0.11 + breathe) * (reaction?.scaleY ?? 1),
    );
    if (victory) {
      c.translate(
        0,
        -Math.abs(Math.sin(time * motion.celebrateRate)) * motion.celebrateHop,
      );
      c.rotate(Math.sin(time * motion.celebrateRate) * motion.celebrateLean);
    }
    if (miss && !active) c.rotate(Math.sin(elapsed * 15) * 0.028);
  }

  if (defeat) {
    c.scale(1.08, 0.72);
    c.rotate(-0.08);
  }

  c.save();
  c.translate(-26, -29);
  c.rotate(
    Math.sin(time * motion.tailRate) * 0.2 +
      charge * 0.25 -
      recoil * 0.22 +
      (hit ? -0.22 : 0) +
      (victory ? Math.sin(time * 8) * 0.24 : 0),
  );
  path(
    c,
    cat
      ? "M0 7C-51 13-73-12-59-43Q-51-54-46-43C-59-18-28-9 0-10Z"
      : "M0 5Q-57-14-43-36Q-33-42-30-31Q-35-18 4-8Z",
    style.fur,
  );
  c.restore();

  c.save();
  c.translate(-22, -7);
  c.rotate(-idle * 0.025);
  ellipse(c, 0, 0, 23, 11, style.fur, true);
  c.restore();

  c.save();
  c.translate(23, -6);
  c.rotate(idle * 0.03);
  ellipse(c, 0, 0, 25, 11, style.fur, true);
  line(c, -3, 0, -3, 4, C.ink, 1.5);
  line(c, 5, 0, 5, 4, C.ink, 1.5);
  c.restore();

  if (style.accessory === "cape")
    path(c, "M-20-70Q-63-64-53-18L-24-29Z", style.accent);
  if (style.shape === "fluffy")
    path(
      c,
      "M-30-69L-42-55L-33-50L-40-36L-30-30L-35-14L-19-13H21L36-18L28-30L40-42L29-47L36-60L25-66Z",
      style.fur,
    );
  ellipse(c, 0, -43, cat ? 32 : 39, 44, style.fur, true);
  ellipse(c, 7, -40, 20, 27, style.cream);

  c.save();
  c.translate(-27, -51);
  c.rotate(-0.32 + idle * 0.08 + charge * 0.16);
  path(c, "M-7 0Q-14-25-3-32Q9-37 14-23L13 0Z", style.fur);
  ellipse(c, 5, -29, 12, 12, style.fur, true);
  c.restore();

  c.save();
  c.translate(23, -64);
  c.rotate(pose.arm + idle * 0.035);
  path(c, "M-7 0Q-14-25-3-32Q9-37 14-23L13 0Z", style.fur);
  ellipse(c, 5, -29, 12, 12, style.fur, true);
  if (
    (active && ["aiming", "charging", "throwing"].includes(s.phase)) ||
    s.phase === "menu"
  ) {
    c.translate(5, -43);
    c.rotate(
      -0.4 -
        charge * 0.06 +
        (charge > 0.9 && !reduced ? Math.sin(time * 75) * 0.05 : 0),
    );
    c.scale(0.65, 0.65);
    weapon(c, side, style.weapon);
  }
  c.restore();

  c.save();
  c.translate(idle * 0.9, -97 + (defeat ? 16 : 0) + (charge ? charge * 2 : 0));
  c.rotate(idle * 0.023 - recoil * 0.06 + (hit ? -0.03 : 0));
  c.scale(1.06, 1.07);

  if (cat || style.shape === "pointed" || style.shape === "small") {
    const earTwitch = reduced
      ? 0
      : Math.max(0, Math.sin(time * 5.1)) * 3 + charge * 3 - (hit ? 5 : 0);
    path(
      c,
      `M-35-9L-39-${51 + earTwitch}L-11-32L13-33L36-${51 - earTwitch}L39-10Z`,
      style.fur,
    );
    path(c, "M-31-32L-32-42L-21-32ZM24-32L31-42L31-30Z", C.pink, C.pink, 0);
  } else {
    c.save();
    c.rotate(idle * 0.04 + charge * 0.12 + (hit ? -0.22 : 0));
    ellipse(c, -36, -13, 18, 31, style.dark, true);
    c.restore();
    c.save();
    c.rotate(-idle * 0.04 - charge * 0.08 + (hit ? 0.24 : 0));
    ellipse(c, 33, -12, 17, 31, style.dark, true);
    c.restore();
  }

  ellipse(c, 0, -5, cat ? 39 : 41, 34, style.fur, true);

  if (style.mark === "tabby") {
    path(c, "M-12-36L-6-20L0-33L7-19L12-35", style.dark, style.dark, 0);
    line(c, -35, 0, -26, 4, style.dark, 4);
    line(c, -35, 9, -26, 12, style.dark, 4);
  } else if (style.mark === "mask") {
    path(
      c,
      "M-37-16Q-18-35-2-18Q17-35 38-15Q29 0 11 3Q-8-1-27 4Z",
      style.dark,
      style.dark,
      0,
    );
  } else if (style.mark === "spot") {
    ellipse(c, -20, -18, 15, 10, style.dark);
    ellipse(c, 28, 3, 9, 7, style.dark);
  }

  if (s.health[side] <= 60) {
    c.save();
    c.translate(-24, -29);
    c.rotate(-0.3);
    path(c, "M-11-5H11V5H-11Z", "#f7dbc2", C.ink, 1);
    line(c, -3, -3, 3, 3, C.brick, 2);
    c.restore();
  }

  const blink = time % 4.1 > 3.98 || defeat;
  const expression = defeat
    ? "defeat"
    : victory
      ? "victory"
      : hit
        ? "hit"
        : miss && !active
          ? "laugh"
          : throwing
            ? "throw"
            : charge > 0
              ? "charge"
              : active && s.phase === "aiming"
                ? "aim"
                : "idle";
  const trackingGaze =
    botState(s) === "chase" && !reduced
      ? botTrackingOffset(s.elapsed, BOT_PROFILES[s.difficulty].delay) * 0.25
      : 0;
  const gaze = active && !s.winner ? 2.5 + trackingGaze : 0;
  for (const x of [-13, 16]) {
    const squint =
      expression === "charge" || expression === "aim" || expression === "laugh";
    const closed = blink || expression === "victory" || expression === "laugh";
    ellipse(c, x, -10, 12, closed ? 2 : squint ? 10 : 14, "#fff9e9", true);
    if (!closed)
      ellipse(
        c,
        x + 4 + gaze,
        -8 + (expression === "hit" ? -3 : 0),
        4.5,
        expression === "hit" ? 9 : 8,
        C.ink,
      );
    const browRaise =
      expression === "hit"
        ? -7
        : expression === "charge"
          ? 3
          : expression === "defeat"
            ? 5
            : 0;
    line(
      c,
      x - 10,
      -26 + browRaise,
      x + 9,
      -23 + browRaise + (expression === "aim" ? 2 : 0),
      C.ink,
      3.5,
    );
  }

  ellipse(c, 7, 13, cat ? 24 : 31, cat ? 15 : 20, style.cream, true);
  path(c, "M-2 5Q9-1 16 5L8 12Z", C.ink, C.ink, 1);
  if (["hit", "victory", "laugh", "throw"].includes(expression)) {
    ellipse(
      c,
      10,
      24,
      expression === "hit" ? 11 : 9,
      expression === "hit" ? 11 : 7,
      C.ink,
    );
    if (expression !== "hit") ellipse(c, 12, 27, 7, 3, C.pink);
  } else {
    path(
      c,
      expression === "defeat"
        ? "M8 25Q17 16 26 25"
        : expression === "charge"
          ? "M8 18Q17 21 25 17"
          : "M8 12V21Q19 28 27 16",
      "transparent",
      C.ink,
      2,
    );
  }

  if (cat) {
    for (const dy of [9, 17]) {
      line(c, -17, dy, -47, dy - 4, C.ink, 1.7);
      line(c, 25, dy, 45, dy - 3, C.ink, 1.7);
    }
  } else {
    ellipse(c, -7, 17, 1.4, 1.4, C.ink);
    ellipse(c, -13, 12, 1.4, 1.4, C.ink);
  }
  c.restore();

  path(
    c,
    cat ? "M-23-67L29-67L13-53L6-40L-3-53Z" : "M-30-68H32V-58H-30Z",
    style.accent,
    C.ink,
    2,
  );
  if (!cat) ellipse(c, 10, -55, 7, 8, C.sun, true);
  if (style.accessory === "pirate") {
    path(c, "M-37-130Q-24-154 0-140Q25-154 38-130L29-124H-27Z", C.ink);
    line(c, -35, -116, 30, -88, C.ink, 3);
    ellipse(c, -16, -107, 12, 12, C.ink);
    text(c, "×", 0, -137, 16, "#fff9e9");
  }
  if (style.accessory === "goggles") {
    ellipse(c, -15, -116, 15, 9, "#96d3da", true);
    ellipse(c, 17, -116, 15, 9, "#96d3da", true);
    line(c, -1, -116, 3, -116, C.ink, 3);
  }
  if (style.accessory === "bow")
    path(c, "M-14-68L-24-80L-24-57L-12-66L0-78V-56Z", style.accent);
  if (style.accessory === "harness") {
    line(c, -25, -60, 21, -16, style.accent, 8);
    line(c, 25, -60, -21, -16, style.accent, 8);
  }
  c.restore();
}

export class GameRenderer {
  private backgrounds = new Map<ArenaTheme, HTMLCanvasElement>();
  private camera = { x: 0, y: 0, zoom: 1 };

  private backgroundFor(theme: ArenaTheme) {
    const cached = this.backgrounds.get(theme);
    if (cached) return cached;

    const canvas = document.createElement("canvas");
    canvas.width = ARENA.width;
    canvas.height = ARENA.height;
    const context = canvas.getContext("2d");
    if (context) {
      context.fillStyle = THEMES[theme].palette.skyTop;
      context.fillRect(0, 0, ARENA.width, ARENA.height);
      context.translate(0, -ARENA.cameraTop);
      backdrop(context, theme);
    }
    this.backgrounds.set(theme, canvas);
    return canvas;
  }

  draw(
    c: Context,
    s: MatchState,
    reduced: boolean,
    lowPower: boolean,
    visualOffset = 0,
    frameDelta = 1 / 60,
    showFighters = true,
  ) {
    c.save();
    c.lineJoin = "round";
    c.lineCap = "round";

    const theme = s.setup.theme;
    const t = THEMES[theme].palette;
    const followedFlight = s.flights.find(
      (flight) => !flight.resolved && s.elapsed + visualOffset >= flight.delay,
    );
    const followPoint = followedFlight
      ? trajectoryPointAt(
          followedFlight.result,
          s.elapsed + visualOffset - followedFlight.delay,
        )
      : undefined;
    const target =
      reduced || lowPower ? cameraTarget() : cameraTarget(followPoint);
    const ease =
      s.phase === "menu" || reduced
        ? 1
        : 1 - Math.exp(-Math.min(frameDelta, 0.05) * 8);
    this.camera.x += (target.x - this.camera.x) * ease;
    this.camera.y += (target.y - this.camera.y) * ease;
    this.camera.zoom += (target.zoom - this.camera.zoom) * ease;
    const hit = s.effects.findLast(
      (e) => e.impact.kind === "target" && e.age < 0.22,
    );
    const kick =
      hit && !reduced
        ? cameraKick(hit.age + visualOffset, hit.impact.damage)
        : { x: 0, y: 0 };
    c.fillStyle = t.skyTop;
    c.fillRect(0, 0, ARENA.width, ARENA.height);
    c.fillStyle = t.grass;
    c.fillRect(0, 430, ARENA.width, 140);
    c.fillStyle = t.soil;
    c.fillRect(0, 490, ARENA.width, 150);
    c.translate(
      ARENA.width / 2 + this.camera.x + kick.x,
      ARENA.height / 2 + this.camera.y + kick.y,
    );
    c.scale(this.camera.zoom, this.camera.zoom);
    c.translate(-ARENA.width / 2, -ARENA.height / 2);

    c.drawImage(this.backgroundFor(theme), 0, 0);
    c.translate(0, -ARENA.cameraTop);

    const windTime = reduced ? 0 : (s.clock + visualOffset) * s.wind * 0.5;
    cloud(c, 235 + Math.sin(windTime / 60) * 20, 100, 0.75, t.cloud);
    cloud(c, 600 + Math.sin(windTime / 90) * 24, 160, 0.55, t.cloud);

    line(c, 500, 300, 500, 237, C.ink, 3);
    const dir = s.wind >= 0 ? 1 : -1;
    const length = 12 + Math.abs(s.wind) * 3.5;
    path(
      c,
      `M500 238Q${500 + (dir * length) / 2} ${232 + Math.sin(s.clock * 7) * (reduced ? 0 : 3)} ${500 + dir * length} 240L${500 + dir * length} 259Q${500 + (dir * length) / 2} 252 500 258Z`,
      t.sun,
      C.ink,
      1.5,
      false,
    );

    if (showFighters) {
      fighter(c, s, "cat", reduced, visualOffset);
      fighter(c, s, "dog", reduced, visualOffset);
      chargeDial(c, s, visualOffset);
    }

    for (const side of ["cat", "dog"] as const) {
      const reaction = s.effects.findLast(
        (effect) => effect.impact.target === side,
      );
      if (!reaction) continue;
      c.save();
      c.globalAlpha = Math.max(0, 1 - (reaction.age + visualOffset) / 0.8);
      for (let i = 0; i < 3; i++) {
        const a =
          (i * Math.PI * 2) / 3 +
          (reduced ? 0 : (reaction.age + visualOffset) * 8);
        text(
          c,
          "✦",
          ARENA.fighters[side].x + Math.cos(a) * 42,
          ARENA.ground - 167 + Math.sin(a) * 10,
          23,
          C.sun,
        );
      }
      c.restore();
    }

    if (["aiming", "charging"].includes(s.phase)) {
      drawAimGuide(c, s, reduced);
      text(
        c,
        characterFor(s.turn, s.setup.fighters).name,
        ARENA.fighters[s.turn].x,
        499,
        17,
        characterFor(s.turn, s.setup.fighters).accent,
      );
    }

    for (const flight of s.flights) {
      const elapsed = s.elapsed + visualOffset - flight.delay;
      if (elapsed < 0 || flight.resolved) continue;
      const point = trajectoryPointAt(flight.result, elapsed);
      const projectileStyle = characterFor(
        flight.result.input.side,
        s.setup.fighters,
      );

      if (!reduced) {
        c.save();
        c.strokeStyle = WEAPON_ART[projectileStyle.weapon].trail;
        c.lineWidth = lowPower ? 3 : 4;
        c.globalAlpha = 0.3;
        c.beginPath();
        for (let i = lowPower ? 3 : 7; i >= 1; i--) {
          const tail = trajectoryPointAt(
            flight.result,
            Math.max(0, elapsed - i * 0.024),
          );
          if (i === (lowPower ? 3 : 7)) c.moveTo(tail.x, tail.y);
          else c.lineTo(tail.x, tail.y);
        }
        c.lineTo(point.x, point.y);
        c.stroke();
        c.restore();
      }

      c.save();
      c.translate(point.x, point.y);
      c.rotate(
        Math.atan2(point.vy, point.vx) +
          elapsed * WEAPON_ART[projectileStyle.weapon].spinRate,
      );
      c.scale(0.7, 0.7);
      weapon(c, flight.result.input.side, projectileStyle.weapon);
      c.restore();
    }

    for (const effect of s.effects) {
      const { impact } = effect;
      const impactFighter = impact.character
        ? CHARACTERS[impact.character]
        : undefined;
      const actualAge = effect.age + visualOffset;
      const age =
        impact.kind === "target" ? Math.max(0, actualAge - 0.038) : actualAge;
      const x = Math.max(42, Math.min(958, impact.point.x));
      const y = impact.point.y;
      c.globalAlpha = Math.max(0, 1 - age / 0.8);
      if (impact.kind === "target" && !reduced) {
        c.beginPath();
        c.arc(x, y, 13 + age * 120, 0, Math.PI * 2);
        c.strokeStyle = impactFighter?.accent ?? t.sun;
        c.lineWidth = Math.max(0.5, 5 * (1 - age / 0.4));
        c.stroke();
      }
      if (!reduced) {
        for (let i = 0; i < (lowPower ? 5 : 10); i++) {
          const a = i * 2.399;
          const px = x + Math.cos(a) * age * 85;
          const py = y + Math.sin(a) * age * 65 + age * age * 80;
          ellipse(
            c,
            px,
            py,
            4 * (1 - age),
            3,
            impact.kind === "target"
              ? t.sun
              : impactFighter
                ? WEAPON_ART[impactFighter.weapon].impact
                : C.brick,
          );
          if (impact.signature && impactFighter && i % 2 === 0) {
            c.save();
            c.translate(px, py);
            c.rotate(a + age * 5);
            c.scale(0.2, 0.2);
            weapon(c, impactFighter.side, impactFighter.weapon);
            c.restore();
          }
        }
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
        impact.kind === "target" ? 30 : 24,
      );
      if (impact.damage) {
        text(
          c,
          `−${impact.damage}`,
          x,
          y - 62 - (reduced ? 0 : age * 30),
          29,
          C.dogTeam,
        );
      }
      c.globalAlpha = 1;
    }

    if (!reduced && !lowPower && Math.abs(s.wind) > 1) {
      for (let i = 0; i < 4; i++) {
        const x = (((i * 273 + s.clock * s.wind * 8) % 1000) + 1000) % 1000;
        c.save();
        c.translate(x, 270 + i * 41 + Math.sin(s.clock + i) * 5);
        c.rotate(s.clock + i);
        ellipse(c, 0, 0, 5, 2, t.leaf);
        c.restore();
      }
    }

    if (!reduced && theme === "sakura") {
      for (let i = 0; i < (lowPower ? 3 : 7); i++) {
        const x = (i * 151 + s.clock * 12) % 1000;
        const y = 120 + ((i * 71 + s.clock * 9) % 300);
        c.save();
        c.translate(x, y);
        c.rotate(s.clock + i);
        ellipse(c, 0, 0, 4, 2.2, i % 2 ? "#f0a8ba" : "#ffd2dc");
        c.restore();
      }
    }

    if (!reduced && theme === "night") {
      for (let i = 0; i < (lowPower ? 4 : 10); i++) {
        c.globalAlpha = 0.3 + 0.4 * Math.abs(Math.sin(s.clock + i));
        ellipse(
          c,
          80 + i * 87 + Math.sin(s.clock * 0.7 + i) * 8,
          270 + ((i * 43) % 155),
          2,
          2,
          "#f4dc85",
        );
      }
      c.globalAlpha = 1;
    }
    if (!reduced && theme === "rainy") {
      c.globalAlpha = 0.42;
      for (let i = 0; i < (lowPower ? 15 : 45); i++) {
        const x = (i * 71 + s.clock * 42) % 1000,
          y = (i * 137 + s.clock * 330) % 550;
        line(c, x, y, x + 5, y + 14, "#eef5ed", 1.4);
      }
      for (let i = 0; i < 4; i++) {
        c.beginPath();
        c.ellipse(
          110 + i * 245,
          491 + ((i * 7) % 17),
          4 + ((s.clock * 14 + i * 7) % 24),
          2,
          0,
          0,
          Math.PI * 2,
        );
        c.strokeStyle = "#dce7e2";
        c.lineWidth = 1;
        c.stroke();
      }
      c.globalAlpha = 1;
    }
    if (!reduced && (theme === "sunset" || theme === "rooftop")) {
      const x = ((s.clock * 18) % 1250) - 100;
      path(c, `M${x} 150q8-9 16 0q8-9 16 0`, "transparent", t.roof, 2, false);
    }
    c.restore();
  }
}
/** Shared art for setup, portraits and results. No raster dependency or art mismatch. */
export function drawCharacterPreview(
  c: Context,
  id: CharacterId,
  time = 0,
  portrait = false,
  victory = false,
) {
  const s = createMatch("local");
  const character = CHARACTERS[id];
  s.setup.fighters[character.side] = id;
  s.clock = time;
  if (victory) {
    s.winner = character.side;
    s.phase = "gameOver";
  }
  c.save();
  c.translate(150, portrait ? 330 : 238);
  const scale = portrait ? 1.6 : 1.12;
  c.scale(character.side === "dog" ? -scale : scale, scale);
  c.translate(-ARENA.fighters[character.side].x, -ARENA.ground);
  fighter(c, s, character.side, time === 0, 0);
  c.restore();
}
export function drawWeaponPreview(c: Context, id: CharacterId) {
  const fighter = CHARACTERS[id];
  c.save();
  c.translate(32, 32);
  c.rotate(-0.3);
  c.scale(0.95, 0.95);
  weapon(c, fighter.side, fighter.weapon);
  c.restore();
}
