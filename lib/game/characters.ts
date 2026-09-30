import type { Side } from "./types";
export type CharacterId =
  | "blaze"
  | "shadow"
  | "mochi"
  | "pixel"
  | "captain"
  | "major"
  | "bruno"
  | "bolt"
  | "rex"
  | "biscuit";
export type WeaponId =
  | "fishbone"
  | "sardine"
  | "yarn"
  | "mouse"
  | "anchor"
  | "bone"
  | "bigbone"
  | "tennis"
  | "tag"
  | "duck";
export type Character = {
  id: CharacterId;
  side: Side;
  name: string;
  tagline: string;
  role: string;
  signature: string;
  weapon: WeaponId;
  weaponName: string;
  fur: string;
  dark: string;
  cream: string;
  accent: string;
  mark: "tabby" | "mask" | "spot" | "plain";
  shape: "classic" | "sleek" | "fluffy" | "small" | "heavy" | "pointed";
  accessory:
    "scarf" | "cape" | "bow" | "goggles" | "pirate" | "collar" | "harness";
  stats: readonly [number, number, number];
};
export const CHARACTERS: Record<CharacterId, Character> = {
  blaze: {
    id: "blaze",
    side: "cat",
    name: "Blaze",
    tagline: "All claws. No brakes.",
    role: "Fearless striker",
    signature: "Fishbone Burst",
    weapon: "fishbone",
    weaponName: "Fishbone Toss",
    fur: "#efa345",
    dark: "#c47631",
    cream: "#fff0d4",
    accent: "#168aa5",
    mark: "tabby",
    shape: "classic",
    accessory: "scarf",
    stats: [3, 3, 3],
  },
  shadow: {
    id: "shadow",
    side: "cat",
    name: "Shadow",
    tagline: "You won't see it coming.",
    role: "Sneaky precision",
    signature: "Shadow Shot",
    weapon: "sardine",
    weaponName: "Sardine Dart",
    fur: "#46545c",
    dark: "#28363c",
    cream: "#fff5e8",
    accent: "#8270bc",
    mark: "mask",
    shape: "sleek",
    accessory: "cape",
    stats: [4, 2, 4],
  },
  mochi: {
    id: "mochi",
    side: "cat",
    name: "Mochi",
    tagline: "Soft outside. Trouble inside.",
    role: "Fluffy control",
    signature: "Bounce Ball",
    weapon: "yarn",
    weaponName: "Yarn Ball",
    fur: "#f4ead9",
    dark: "#c5a67f",
    cream: "#fffaf1",
    accent: "#329c87",
    mark: "plain",
    shape: "fluffy",
    accessory: "bow",
    stats: [2, 3, 4],
  },
  pixel: {
    id: "pixel",
    side: "cat",
    name: "Pixel",
    tagline: "Oops. Did I do that?",
    role: "Tiny chaos",
    signature: "Chaos Toss",
    weapon: "mouse",
    weaponName: "Toy Mouse",
    fur: "#f6e6cd",
    dark: "#db8a4d",
    cream: "#fff6e8",
    accent: "#d37d96",
    mark: "spot",
    shape: "small",
    accessory: "goggles",
    stats: [5, 2, 2],
  },
  captain: {
    id: "captain",
    side: "cat",
    name: "Captain Paws",
    tagline: "This yard be mine.",
    role: "Alley captain",
    signature: "Heavy Catch",
    weapon: "anchor",
    weaponName: "Anchor Fish",
    fur: "#b78b65",
    dark: "#725d4b",
    cream: "#f1debb",
    accent: "#517e9c",
    mark: "tabby",
    shape: "heavy",
    accessory: "pirate",
    stats: [2, 5, 2],
  },
  major: {
    id: "major",
    side: "dog",
    name: "Major Bark",
    tagline: "Orders first. Questions never.",
    role: "Backyard commander",
    signature: "Bone Crusher",
    weapon: "bone",
    weaponName: "Bone Toss",
    fur: "#92a5aa",
    dark: "#647d87",
    cream: "#fff0d4",
    accent: "#cb563c",
    mark: "plain",
    shape: "classic",
    accessory: "collar",
    stats: [3, 3, 3],
  },
  bruno: {
    id: "bruno",
    side: "dog",
    name: "Bruno",
    tagline: "Big dog. Bigger bone.",
    role: "Stubborn tank",
    signature: "Ground Pound",
    weapon: "bigbone",
    weaponName: "Big Bone",
    fur: "#9d6b4f",
    dark: "#704a39",
    cream: "#f7dfbd",
    accent: "#d57942",
    mark: "spot",
    shape: "heavy",
    accessory: "harness",
    stats: [2, 5, 2],
  },
  bolt: {
    id: "bolt",
    side: "dog",
    name: "Bolt",
    tagline: "Catch this.",
    role: "Quick-footed ace",
    signature: "Fastball",
    weapon: "tennis",
    weaponName: "Tennis Ball",
    fur: "#dbc79f",
    dark: "#9b7e5d",
    cream: "#fff6df",
    accent: "#cc6659",
    mark: "plain",
    shape: "sleek",
    accessory: "scarf",
    stats: [5, 2, 3],
  },
  rex: {
    id: "rex",
    side: "dog",
    name: "Rex",
    tagline: "Every throw has a plan.",
    role: "Tactical thinker",
    signature: "Tactical Shot",
    weapon: "tag",
    weaponName: "Dog Tag",
    fur: "#bc955a",
    dark: "#465258",
    cream: "#f0dfbd",
    accent: "#72907e",
    mark: "mask",
    shape: "pointed",
    accessory: "harness",
    stats: [3, 2, 5],
  },
  biscuit: {
    id: "biscuit",
    side: "dog",
    name: "Biscuit",
    tagline: "Small paws. Big attitude.",
    role: "Bouncy troublemaker",
    signature: "Ricochet",
    weapon: "duck",
    weaponName: "Rubber Duck",
    fur: "#dba062",
    dark: "#a77445",
    cream: "#fff0d4",
    accent: "#d98081",
    mark: "mask",
    shape: "small",
    accessory: "bow",
    stats: [5, 2, 2],
  },
};
export const characterFor = (side: Side, ids: Record<Side, CharacterId>) =>
  CHARACTERS[ids[side]];
export function characterMotion(id: CharacterId) {
  const index = Object.keys(CHARACTERS).indexOf(id),
    shape = CHARACTERS[id].shape;
  return {
    idleRate: shape === "small" ? 3.2 : shape === "heavy" ? 1.6 : 2.25,
    tailRate: 2.5 + index * 0.13,
    celebrateRate: 4.8 + index * 0.28,
    celebrateHop: shape === "small" ? 16 : shape === "heavy" ? 5 : 10,
    celebrateLean: (index % 2 ? 1 : -1) * 0.035,
  };
}
export const SIGNATURE_DETAILS: Record<CharacterId, string> = {
  blaze: "Three smaller fishbones. Each deals 43% damage.",
  shadow: "12% faster sardine dart, with a fine fading aim hint.",
  mochi: "A yarn ball that bounces once from the ground.",
  pixel: "Two light toy mice, tossed one after the other.",
  captain: "A slower anchor fish with 30% stronger impact.",
  major: "A heavy bone: 25% more impact, slower launch.",
  bruno: "Heavy throw; ground contact within 75 px splashes 9 damage.",
  bolt: "18% faster tennis ball with reduced damage.",
  rex: "Longer partial aim hint and 30% less wind influence.",
  biscuit: "Rubber duck ricochets once from the center wall.",
};
