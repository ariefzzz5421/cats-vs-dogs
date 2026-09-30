import type { Difficulty, GameMode, Item, Side } from "./types";
import { CHARACTERS, type CharacterId } from "./characters";
import { THEMES, type ThemeId } from "./themes";
import { ABILITIES } from "./abilities";
export type MatchSetup = {
  mode: GameMode;
  difficulty: Difficulty;
  theme: ThemeId;
  fighters: Record<Side, CharacterId>;
  loadout: Item[];
};
export const DEFAULT_SETUP: MatchSetup = {
  mode: "solo",
  difficulty: "normal",
  theme: "sunny",
  fighters: { cat: "blaze", dog: "major" },
  loadout: ["double", "heavy", "shield"],
};
export const SETTINGS_KEY = "backyard-arcade-setup-v1";
/** Preserve the previous cosmetic/difficulty preferences without skipping setup. */
export function migrateLegacySetup(
  value: unknown,
  difficulty: unknown,
): MatchSetup {
  const look =
    value && typeof value === "object"
      ? (value as { arena?: unknown; cat?: unknown; dog?: unknown })
      : {};
  const cats: Record<string, CharacterId> = {
    ginger: "blaze",
    tuxedo: "shadow",
    snow: "mochi",
  };
  const dogs: Record<string, CharacterId> = {
    slate: "major",
    brown: "bruno",
    cream: "bolt",
  };
  return sanitizeSetup({
    theme: look.arena,
    difficulty,
    fighters: {
      cat:
        typeof look.cat === "string" && Object.hasOwn(cats, look.cat)
          ? cats[look.cat]
          : "blaze",
      dog:
        typeof look.dog === "string" && Object.hasOwn(dogs, look.dog)
          ? dogs[look.dog]
          : "major",
    },
    loadout: DEFAULT_SETUP.loadout,
  });
}
export function sanitizeSetup(value: unknown): MatchSetup {
  if (!value || typeof value !== "object")
    return {
      ...DEFAULT_SETUP,
      fighters: { ...DEFAULT_SETUP.fighters },
      loadout: [...DEFAULT_SETUP.loadout],
    };
  const s = value as Partial<MatchSetup>;
  const side = (key: Side) =>
    typeof s.fighters?.[key] === "string" &&
    Object.hasOwn(CHARACTERS, s.fighters[key]) &&
    CHARACTERS[s.fighters[key]]?.side === key
      ? s.fighters[key]
      : DEFAULT_SETUP.fighters[key];
  const loadout = Array.isArray(s.loadout)
    ? [
        ...new Set(
          s.loadout.filter(
            (id) => typeof id === "string" && Object.hasOwn(ABILITIES, id),
          ),
        ),
      ].slice(0, 3)
    : [];
  return {
    mode: s.mode === "local" ? "local" : "solo",
    difficulty:
      s.difficulty === "easy" || s.difficulty === "hard"
        ? s.difficulty
        : "normal",
    theme:
      typeof s.theme === "string" && Object.hasOwn(THEMES, s.theme)
        ? s.theme
        : "sunny",
    fighters: { cat: side("cat"), dog: side("dog") },
    loadout: loadout.length === 3 ? loadout : [...DEFAULT_SETUP.loadout],
  };
}
