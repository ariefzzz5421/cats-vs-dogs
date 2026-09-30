import type { WeaponId } from "./characters";

type Ctx = CanvasRenderingContext2D;
type Painter = (c: Ctx) => void;
const ink = "#273c42";
const cream = "#fff0d4";
const shapes = new Map<string, Path2D>();
function shape(c: Ctx, d: string, fill: string, width = 2.5) {
  let p = shapes.get(d);
  if (!p) {
    p = new Path2D(d);
    shapes.set(d, p);
  }
  c.fillStyle = fill;
  c.fill(p);
  if (width) {
    c.strokeStyle = ink;
    c.lineWidth = width;
    c.stroke(p);
  }
}
function stroke(c: Ctx, d: string, color: string, width: number) {
  c.strokeStyle = color;
  c.lineWidth = width;
  c.stroke(new Path2D(d));
}
function circle(
  c: Ctx,
  x: number,
  y: number,
  r: number,
  fill: string,
  width = 0,
) {
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fillStyle = fill;
  c.fill();
  if (width) {
    c.strokeStyle = ink;
    c.lineWidth = width;
    c.stroke();
  }
}
const fishbone: Painter = (c) => {
  shape(c, "M-18 0L-29-10L-25 0L-29 10Z", "#f8dca3");
  stroke(c, "M-23 0Q-4-3 17 1", ink, 7);
  stroke(c, "M-23 0Q-4-3 17 1", cream, 4);
  for (const x of [-12, -3, 6]) {
    stroke(c, `M${x} -1l-5-9m5 9l-5 9`, ink, 5);
    stroke(c, `M${x} -1l-5-9m5 9l-5 9`, cream, 2.6);
  }
  shape(c, "M13-7Q27-13 29 0Q27 12 13 7Q17 1 13-7Z", cream);
  circle(c, 22, -3, 1.8, ink);
};
const sardine: Painter = (c) => {
  shape(c, "M-18 0L-28-8L-26 0L-28 8Z", "#5b9a99");
  shape(c, "M-19 0Q-7-10 11-7Q26-4 27 0Q23 7 10 8Q-9 10-19 0Z", "#8bc7bd");
  shape(c, "M-9-6L-3-13L3-7Z", "#5b9a99", 1.6);
  stroke(c, "M-12 2Q3 6 20 2", "#d6eee1", 2);
  circle(c, 19, -3, 1.8, ink);
};
const yarn: Painter = (c) => {
  circle(c, 0, 0, 16, "#d794b1", 2.6);
  stroke(c, "M-14-4Q0-16 14 2M-13 5Q-2-7 12-8M-7 14Q2 0 15 8", "#a85e83", 2.5);
  stroke(c, "M-10-12Q-16-18-25-14", "#a85e83", 2);
  circle(c, -8, -8, 2, "#f8d5df");
};
const mouse: Painter = (c) => {
  stroke(c, "M-16 3Q-27 1-26-8Q-22-14-17-9", "#9a83a8", 3);
  shape(c, "M-18 0Q-13-13 5-12Q20-9 24 0Q14 13-2 11Q-16 10-18 0Z", "#ad9abb");
  circle(c, -7, -12, 6, "#d9bfd3", 2);
  circle(c, 5, -13, 5, "#d9bfd3", 2);
  circle(c, 17, -3, 1.8, ink);
  circle(c, 25, 1, 2.4, "#e48f94");
};
const anchor: Painter = (c) => {
  shape(c, "M-8-6Q-4-11 5-7Q13-6 15 0Q10 7 2 7L-8 3Z", "#9db8b8");
  circle(c, 9, -2, 1.6, ink);
  circle(c, -1, -14, 5, "#a4bdc3", 2);
  stroke(
    c,
    "M-1-10V15M-20 7Q-15 25-1 20Q13 25 20 7M-20 7l1 8M20 7l-1 8",
    ink,
    8,
  );
  stroke(
    c,
    "M-1-10V15M-20 7Q-15 25-1 20Q13 25 20 7M-20 7l1 8M20 7l-1 8",
    "#91aebb",
    4,
  );
};
const bone: Painter = (c) => {
  shape(
    c,
    "M-13-5Q-19-15-26-9Q-31-3-24 0Q-31 6-24 11Q-16 16-12 5H12Q17 15 25 10Q31 4 23 0Q30-6 24-11Q17-16 12-5Z",
    cream,
    3,
  );
  stroke(c, "M-10-1Q0 2 10-1M-15-9l-3-1", "#d6ba8e", 2);
};
const bigbone: Painter = (c) => {
  c.save();
  c.scale(1.15, 1.15);
  bone(c);
  stroke(c, "M-4-5l-4 5 5 2-3 4M9-4l-3 4", "#987f68", 2);
  c.restore();
};
const tennis: Painter = (c) => {
  circle(c, 0, 0, 16, "#cbe76b", 2.8);
  stroke(c, "M-11-11Q3 0-11 11M11-11Q-3 0 11 11", "#fff9e9", 3);
  circle(c, -6, -8, 2.3, "#eef9ad");
};
const tag: Painter = (c) => {
  stroke(c, "M-20-10l-6-4 5-4 5 4", "#849aa4", 3);
  shape(c, "M-17-11H13L22-3V11L13 17H-17L-22 12V-6Z", "#a9bdc4", 3);
  stroke(c, "M-12-5H10M-12 3H8M-12 10H3", "#e2eef0", 2);
  circle(c, 13, -5, 2.5, "#5e7983", 1);
};
const duck: Painter = (c) => {
  shape(
    c,
    "M-20 4Q-15-10-2-7Q1-19 14-16Q23-11 19-3Q24 2 19 9Q11 17-5 13Q-16 17-20 4Z",
    "#ffd25a",
    3,
  );
  shape(c, "M17-8L28-5L19 0Z", "#e9814d", 2);
  shape(c, "M-16 4Q-7-1 2 4Q0 10-8 11Z", "#edb943", 1.5);
  circle(c, 14, -10, 2.2, ink);
  circle(c, 8, -13, 2, "#fff5bc");
};

export const WEAPON_ART: Record<
  WeaponId,
  { paint: Painter; spinRate: number; trail: string; impact: string }
> = {
  fishbone: {
    paint: fishbone,
    spinRate: 7,
    trail: "#e8cf9e",
    impact: "#fff0d4",
  },
  sardine: { paint: sardine, spinRate: 4, trail: "#7db5b0", impact: "#bce7d9" },
  yarn: { paint: yarn, spinRate: 8, trail: "#d794b1", impact: "#f3c8d9" },
  mouse: { paint: mouse, spinRate: 9, trail: "#b1a3c6", impact: "#d8c9df" },
  anchor: { paint: anchor, spinRate: 3.5, trail: "#789aa8", impact: "#a9c0c7" },
  bone: { paint: bone, spinRate: 6, trail: "#ecd7ac", impact: "#fff0d4" },
  bigbone: { paint: bigbone, spinRate: 4, trail: "#c4a881", impact: "#f5d9b3" },
  tennis: { paint: tennis, spinRate: 11, trail: "#d7ec89", impact: "#eff5b3" },
  tag: { paint: tag, spinRate: 7, trail: "#a9bdc4", impact: "#d3e1e3" },
  duck: { paint: duck, spinRate: 5, trail: "#ffd25a", impact: "#ffe997" },
};
export function drawWeapon(c: Ctx, id: WeaponId) {
  c.save();
  c.lineCap = "round";
  c.lineJoin = "round";
  WEAPON_ART[id].paint(c);
  c.restore();
}
