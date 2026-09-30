import type { Item, ShotInput } from "./types";
import { CHARACTERS } from "./characters";
export const ABILITIES: Record<
  Item,
  { name: string; short: string; description: string }
> = {
  double: {
    name: "Double Trouble",
    short: "Double",
    description: "Two slightly separated throws, each with 60% damage.",
  },
  heavy: {
    name: "Power Shot",
    short: "Power",
    description: "30% more impact. Slower launch, heavier arc.",
  },
  shield: {
    name: "Wind Bubble",
    short: "Bubble",
    description: "Ignore 80% of wind for this throw.",
  },
  heal: {
    name: "Snack Time",
    short: "Snack",
    description: "Restore up to 20 HP. Uses your turn.",
  },
  curve: {
    name: "Curve Shot",
    short: "Curve",
    description: "A gentle forward acceleration bends your throw.",
  },
  retry: {
    name: "Second Chance",
    short: "Retry",
    description: "Miss everything? Retry once, capped at 70% power.",
  },
  lucky: {
    name: "Lucky Paw / Bone",
    short: "Lucky",
    description:
      "Your fighter’s style boosts speed, impact and wind control for one throw.",
  },
};
/** All weapon/signature rules live here, independent of drawing and React. */
export function shotProperties(input: ShotInput) {
  const fighter = input.character ? CHARACTERS[input.character] : undefined;
  let velocity = input.item === "heavy" ? 0.9 : 1;
  let damage = input.item === "heavy" ? 1.3 : input.item === "double" ? 0.6 : 1;
  let wind = input.item === "shield" ? 0.2 : 1;
  let curve = input.item === "curve" ? 22 : 0;
  let bounce: "ground" | "wall" | null = null;
  let shockwave = false;
  if (input.item === "lucky") {
    velocity *= fighter ? 1.02 + fighter.stats[0] * 0.005 : 1.04;
    damage *= fighter ? 1 + fighter.stats[1] * 0.02 : 1.1;
    wind *= fighter ? 1 - fighter.stats[2] * 0.025 : 1;
  }
  if (fighter && input.signature) {
    switch (fighter.id) {
      case "blaze":
        damage *= 0.43;
        break;
      case "shadow":
        velocity *= 1.12;
        damage *= 0.87;
        break;
      case "mochi":
        bounce = "ground";
        damage *= 0.9;
        break;
      case "pixel":
        damage *= 0.6;
        break;
      case "captain":
        velocity *= 0.88;
        damage *= 1.3;
        break;
      case "major":
        velocity *= 0.92;
        damage *= 1.25;
        break;
      case "bruno":
        velocity *= 0.9;
        damage *= 1.15;
        shockwave = true;
        break;
      case "bolt":
        velocity *= 1.18;
        damage *= 0.78;
        break;
      case "rex":
        wind *= 0.7;
        break;
      case "biscuit":
        bounce = "wall";
        damage *= 0.9;
        break;
    }
  }
  if (!Number.isFinite(curve)) curve = 0;
  return {
    velocity,
    damage,
    wind,
    curve,
    bounce,
    shockwave,
    previewDuration: input.signature && fighter?.id === "rex" ? 0.7 : 0.43,
    previewRadius: input.signature && fighter?.id === "shadow" ? 1.5 : 2.8,
  };
}
export function planThrow(
  input: ShotInput,
): { input: ShotInput; delay: number }[] {
  const id = input.signature ? input.character : undefined;
  const count =
    id === "blaze" ? 3 : id === "pixel" || input.item === "double" ? 2 : 1;
  return Array.from({ length: count }, (_, i) => ({
    input: {
      ...input,
      angle: input.angle + i * 3,
      power: input.power * (1 - i * 0.02),
    },
    delay: i * (id === "pixel" ? 0.22 : 0.15),
  }));
}
