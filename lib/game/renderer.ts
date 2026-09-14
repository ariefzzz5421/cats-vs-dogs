import { ARENA, NAMES, PHYSICS, other } from "./constants";
import { simulateShot, trajectoryPointAt } from "./ballistics";
import type { MatchState, Side } from "./types";

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
type ArenaTheme = "sunny" | "sunset" | "night" | "sakura";
type FighterStyle = {
  id: string;
  fur: string;
  dark: string;
  cream: string;
  accent: string;
  mark: "tabby" | "mask" | "spot" | "plain";
};

const THEMES: Record<
  ArenaTheme,
  {
    skyTop: string;
    skyBottom: string;
    sun: string;
    hill: string;
    grass: string;
    grassDark: string;
    soil: string;
    fence: string;
    fenceDark: string;
    house: string;
    roof: string;
    window: string;
    leaf: string;
    leafLight: string;
    cloud: string;
  }
> = {
  sunny: {
    skyTop: "#b9e5eb",
    skyBottom: "#d9f0e6",
    sun: "#f8cf61",
    hill: "#91bba0",
    grass: "#9ab765",
    grassDark: "#789653",
    soil: "#dfbf84",
    fence: "#d8ae76",
    fenceDark: "#bc8d59",
    house: "#e7caab",
    roof: "#b48e7b",
    window: "#88b7bf",
    leaf: "#70996c",
    leafLight: "#97ba73",
    cloud: "#fff9e9",
  },
  sunset: {
    skyTop: "#6f5a8f",
    skyBottom: "#f2b36f",
    sun: "#ffd46b",
    hill: "#798b78",
    grass: "#899b5e",
    grassDark: "#657646",
    soil: "#c99a68",
    fence: "#c89563",
    fenceDark: "#9b6f4f",
    house: "#dbb28e",
    roof: "#8f6b69",
    window: "#f2c77f",
    leaf: "#68795f",
    leafLight: "#8e9a65",
    cloud: "#f9dfc9",
  },
  night: {
    skyTop: "#16233f",
    skyBottom: "#334d70",
    sun: "#f3edcf",
    hill: "#445e62",
    grass: "#536f58",
    grassDark: "#3e5747",
    soil: "#8d7c67",
    fence: "#8d795d",
    fenceDark: "#6d5d4b",
    house: "#7e7480",
    roof: "#54495b",
    window: "#f4cf70",
    leaf: "#3f5f56",
    leafLight: "#587566",
    cloud: "#cbd8df",
  },
  sakura: {
    skyTop: "#ccecf2",
    skyBottom: "#f6dce5",
    sun: "#f8d57d",
    hill: "#9ab9a1",
    grass: "#a4bf72",
    grassDark: "#80985b",
    soil: "#dbc093",
    fence: "#d7aa81",
    fenceDark: "#b88465",
    house: "#ead0b9",
    roof: "#b98c91",
    window: "#91bec3",
    leaf: "#7eaa78",
    leafLight: "#a4c486",
    cloud: "#fffaf0",
  },
};

const CAT_STYLES: FighterStyle[] = [
  {
    id: "ginger",
    fur: "#efa345",
    dark: "#c47631",
    cream: "#fff0d4",
    accent: C.catTeam,
    mark: "tabby",
  },
  {
    id: "tuxedo",
    fur: "#46545c",
    dark: "#28363c",
    cream: "#fff5e8",
    accent: "#7a66c7",
    mark: "mask",
  },
  {
    id: "snow",
    fur: "#f4ead9",
    dark: "#c5a67f",
    cream: "#fffaf1",
    accent: "#2d9b87",
    mark: "spot",
  },
];

const DOG_STYLES: FighterStyle[] = [
  {
    id: "slate",
    fur: "#92a5aa",
    dark: "#647d87",
    cream: "#fff0d4",
    accent: C.dogTeam,
    mark: "plain",
  },
  {
    id: "brown",
    fur: "#9d6b4f",
    dark: "#704a39",
    cream: "#f7dfbd",
    accent: "#d57942",
    mark: "spot",
  },
  {
    id: "cream",
    fur: "#dbc79f",
    dark: "#9b7e5d",
    cream: "#fff6df",
    accent: "#cd5f59",
    mark: "mask",
  },
];

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

function currentTheme(): ArenaTheme {
  const value = document.documentElement.dataset.arenaTheme;
  return value && value in THEMES ? (value as ArenaTheme) : "sunny";
}

function fighterStyle(side: Side) {
  const requested =
    side === "cat"
      ? document.documentElement.dataset.catStyle
      : document.documentElement.dataset.dogStyle;
  const styles = side === "cat" ? CAT_STYLES : DOG_STYLES;
  return styles.find((style) => style.id === requested) ?? styles[0];
}

function cloud(
  c: Context,
  x: number,
  y: number,
  scale: number,
  fill: string,
) {
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

function backdrop(c: Context, themeId: ArenaTheme) {
  const t = THEMES[themeId];
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
  } else {
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

  for (const [x, y, width] of [
    [-32, 270, 181],
    [658, 281, 157],
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

  for (const x of [70, 340, 625, 966]) {
    c.fillStyle = t.fenceDark;
    c.fillRect(x, 305, 10, 95);
    ellipse(c, x - 12, 300, 36, 36, t.leaf);
    ellipse(c, x + 20, 295, 37, 44, t.leaf);
    ellipse(c, x, 274, 34, 37, t.leafLight);
  }

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

  for (let i = 0; i < 40; i++) {
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
  path(c, "M-25-14H25L18 0H-18Z", C.dogTeam);
  text(c, "B", 0, -2, 11, "#fff0d4");
  c.restore();

  line(c, 225, 306, 418, 316, t.fenceDark, 2);
  path(c, "M283 310L278 342L303 344L308 311Z", "#fff0d4", "#fff0d4", 0);
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
    const x = (i * 89) % 1000;
    const y = 454 + (i % 4) * 4;
    line(c, x, y, x - 4, y - 8, t.grassDark, 2);
    line(c, x, y, x + 5, y - 10, t.grassDark, 2);
  }
}

function weapon(c: Context, side: Side) {
  c.lineCap = "round";
  if (side === "cat") {
    line(c, -17, 0, 17, 0, C.ink, 7);
    line(c, -17, 0, 17, 0, "#fff0d4", 4);
    for (const x of [-7, 1, 9]) {
      line(c, x - 4, -7, x + 2, 0, "#fff0d4", 4);
      line(c, x - 4, 7, x + 2, 0, "#fff0d4", 4);
    }
    path(c, "M-17 0L-25-8V8Z", "#fff0d4", C.ink, 1.5);
    ellipse(c, 20, 0, 7, 7, "#fff0d4", true);
    ellipse(c, 22, -2, 1.5, 1.5, C.ink);
  } else {
    path(
      c,
      "M-13-5Q-21-17-26-8Q-31 0-22 1Q-30 10-22 12Q-16 14-12 5H12Q17 16 24 10Q31 3 23 0Q30-7 24-11Q17-15 12-5Z",
      "#fff0d4",
      C.ink,
      2,
    );
  }
}

function drawAimGuide(c: Context, s: MatchState, reduced: boolean) {
  if (s.selected === "heal") return;
  const style = fighterStyle(s.turn);
  const guidePower = s.phase === "charging" ? Math.max(s.power, 14) : 58;
  const result = simulateShot({
    side: s.turn,
    angle: s.angle,
    power: guidePower,
    wind: s.wind,
    item: s.selected ?? undefined,
  });
  const points = result.points;
  if (points.length < 3) return;

  const step = Math.max(1, Math.ceil(points.length / 88));
  c.save();
  c.globalAlpha = s.phase === "charging" ? 0.8 : 0.56;
  c.strokeStyle = style.accent;
  c.lineWidth = s.phase === "charging" ? 3.5 : 3;
  c.setLineDash(reduced ? [9, 11] : [6, 9]);
  c.beginPath();
  c.moveTo(points[0].x, points[0].y);
  for (let i = step; i < points.length; i += step) {
    c.lineTo(points[i].x, points[i].y);
  }
  const nearImpact = points[Math.max(1, points.length - 3)];
  c.lineTo(nearImpact.x, nearImpact.y);
  c.stroke();
  c.setLineDash([]);

  const previous = points[Math.max(0, points.length - 12)];
  const angle = Math.atan2(nearImpact.y - previous.y, nearImpact.x - previous.x);
  c.translate(nearImpact.x, nearImpact.y);
  c.rotate(angle);
  path(c, "M0 0L-15-8L-11 0L-15 8Z", style.accent, style.accent, 0, false);
  c.restore();
}

function fighter(c: Context, s: MatchState, side: Side, reduced: boolean) {
  const active = s.turn === side;
  const cat = side === "cat";
  const style = fighterStyle(side);
  const hit = s.effects.find((e) => e.impact.target === side);
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
  const time = reduced ? 0 : s.clock;
  const idle = Math.sin(time * 2.25 + (cat ? 0 : 1.2));
  const breathe = reduced ? 0 : Math.sin(time * 3.1) * 0.018;
  const recoil = throwing ? Math.sin(Math.min(1, s.elapsed * 5) * Math.PI) : 0;

  c.save();
  c.translate(ARENA.fighters[side].x, ARENA.ground);
  ellipse(c, 0, 1, 49, 9, C.shadow);

  if (active && s.phase !== "menu" && !s.winner) {
    c.strokeStyle = style.accent;
    c.lineWidth = 3;
    c.beginPath();
    c.ellipse(0, 2, 51, 12, 0, 0, Math.PI * 2);
    c.stroke();
  }

  c.scale(cat ? 1 : -1, 1);
  if (!reduced) {
    c.translate(-recoil * 3, idle * 1.6);
    c.rotate(
      charge * -0.12 +
        recoil * 0.08 +
        (hit ? -Math.sin(hit.age * 25) * 0.13 * Math.max(0, 1 - hit.age) : 0),
    );
    c.scale(1 + charge * 0.05 - breathe * 0.5, 1 - charge * 0.07 + breathe);
    if (victory) c.translate(0, -Math.abs(Math.sin(time * 7)) * 9);
    if (miss && !active) c.rotate(Math.sin(s.elapsed * 15) * 0.018);
  }

  if (defeat) {
    c.scale(1.08, 0.72);
    c.rotate(-0.08);
  }

  c.save();
  c.translate(-26, -29);
  c.rotate(Math.sin(time * 3.2) * 0.16 + charge * 0.12 - recoil * 0.12);
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
  ellipse(c, 0, 0, 20, 9, style.fur, true);
  c.restore();

  c.save();
  c.translate(23, -6);
  c.rotate(idle * 0.03);
  ellipse(c, 0, 0, 22, 9, style.fur, true);
  line(c, -3, 0, -3, 4, C.ink, 1.5);
  line(c, 5, 0, 5, 4, C.ink, 1.5);
  c.restore();

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
  c.rotate(charge * -1.1 + (throwing ? 0.82 : -0.25) + idle * 0.035);
  path(c, "M-7 0Q-14-25-3-32Q9-37 14-23L13 0Z", style.fur);
  ellipse(c, 5, -29, 12, 12, style.fur, true);
  if (
    (active && ["aiming", "charging", "throwing"].includes(s.phase)) ||
    s.phase === "menu"
  ) {
    c.translate(5, -43);
    c.rotate(-0.4 - charge * 0.06);
    c.scale(0.65, 0.65);
    weapon(c, side);
  }
  c.restore();

  c.save();
  c.translate(idle * 0.7, -96 + (defeat ? 16 : 0));
  c.rotate(idle * 0.018 - recoil * 0.03);

  if (cat) {
    const earTwitch = reduced ? 0 : Math.max(0, Math.sin(time * 5.1)) * 2;
    path(c, `M-35-9L-39-${51 + earTwitch}L-11-32L13-33L36-${51 - earTwitch}L39-10Z`, style.fur);
    path(c, "M-31-32L-32-42L-21-32ZM24-32L31-42L31-30Z", C.pink, C.pink, 0);
  } else {
    c.save();
    c.rotate(idle * 0.02);
    ellipse(c, -36, -13, 18, 31, style.dark, true);
    c.restore();
    c.save();
    c.rotate(-idle * 0.02);
    ellipse(c, 33, -12, 17, 31, style.dark, true);
    c.restore();
  }

  ellipse(c, 0, -5, cat ? 39 : 41, 34, style.fur, true);

  if (style.mark === "tabby") {
    path(c, "M-12-36L-6-20L0-33L7-19L12-35", style.dark, style.dark, 0);
    line(c, -35, 0, -26, 4, style.dark, 4);
    line(c, -35, 9, -26, 12, style.dark, 4);
  } else if (style.mark === "mask") {
    path(c, "M-37-16Q-18-35-2-18Q17-35 38-15Q29 0 11 3Q-8-1-27 4Z", style.dark, style.dark, 0);
  } else if (style.mark === "spot") {
    ellipse(c, -20, -18, 15, 10, style.dark);
    ellipse(c, 28, 3, 9, 7, style.dark);
  }

  const blink = time % 4.1 > 3.98 || defeat;
  const gaze = active && !s.winner ? 2.5 : 0;
  for (const x of [-13, 16]) {
    ellipse(c, x, -10, 12, blink ? 2 : 14, THEMES[currentTheme()].cloud, true);
    if (!blink) ellipse(c, x + 4 + gaze, -8, 4.5, hit ? 7 : 8, C.ink);
    line(c, x - 10, -26 + (hit ? -6 : 0), x + 9, -23, C.ink, 3.5);
  }

  ellipse(c, 7, 13, cat ? 24 : 31, cat ? 15 : 20, style.cream, true);
  path(c, "M-2 5Q9-1 16 5L8 12Z", C.ink, C.ink, 1);
  if (hit || victory || (miss && !active)) {
    ellipse(c, 10, 24, 10, hit ? 10 : 7, C.ink);
    if (!hit) ellipse(c, 12, 27, 7, 3, C.pink);
  } else {
    path(c, "M8 12V21Q19 28 27 16", "transparent", C.ink, 2);
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
  c.restore();
}

export class GameRenderer {
  private backgrounds = new Map<ArenaTheme, HTMLCanvasElement>();

  private backgroundFor(theme: ArenaTheme) {
    const cached = this.backgrounds.get(theme);
    if (cached) return cached;

    const canvas = document.createElement("canvas");
    canvas.width = ARENA.width;
    canvas.height = ARENA.height;
    const context = canvas.getContext("2d");
    if (context) {
      context.fillStyle = THEMES[theme].skyTop;
      context.fillRect(0, 0, ARENA.width, ARENA.height);
      context.translate(0, -ARENA.cameraTop);
      backdrop(context, theme);
    }
    this.backgrounds.set(theme, canvas);
    return canvas;
  }

  draw(c: Context, s: MatchState, reduced: boolean, lowPower: boolean) {
    c.save();
    c.lineJoin = "round";
    c.lineCap = "round";

    const theme = currentTheme();
    const t = THEMES[theme];
    const hit = s.effects.find(
      (e) => e.impact.kind === "target" && e.age < 0.18,
    );
    if (hit && !reduced) {
      c.translate(Math.sin(hit.age * 70) * 2.5, Math.cos(hit.age * 80) * 1.5);
    }

    c.drawImage(this.backgroundFor(theme), 0, 0);
    c.translate(0, -ARENA.cameraTop);

    const windTime = reduced ? 0 : s.clock * s.wind * 0.5;
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

    fighter(c, s, "cat", reduced);
    fighter(c, s, "dog", reduced);

    if (["aiming", "charging"].includes(s.phase)) {
      drawAimGuide(c, s, reduced);
      text(
        c,
        NAMES[s.turn],
        ARENA.fighters[s.turn].x,
        499,
        17,
        fighterStyle(s.turn).accent,
      );
    }

    for (const flight of s.flights) {
      const elapsed = s.elapsed - flight.delay;
      if (elapsed < 0 || flight.resolved) continue;
      const point = trajectoryPointAt(flight.result, elapsed);
      const projectileStyle = fighterStyle(flight.result.input.side);

      if (!reduced) {
        c.save();
        c.strokeStyle = projectileStyle.accent;
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
      c.rotate(Math.atan2(point.vy, point.vx) + elapsed * 7);
      c.scale(0.7, 0.7);
      weapon(c, flight.result.input.side);
      c.restore();
    }

    for (const effect of s.effects) {
      const { impact, age } = effect;
      const x = Math.max(42, Math.min(958, impact.point.x));
      const y = impact.point.y;
      c.globalAlpha = Math.max(0, 1 - age / 0.8);
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
            impact.kind === "target" ? t.sun : C.brick,
          );
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
        24,
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

    c.restore();
  }
}
