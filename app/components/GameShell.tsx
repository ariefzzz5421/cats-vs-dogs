"use client";

import { useEffect, useState } from "react";
import { GameExperience } from "./GameExperience";

type ArenaTheme = "sunny" | "sunset" | "night" | "sakura";
type CatStyle = "ginger" | "tuxedo" | "snow";
type DogStyle = "slate" | "brown" | "cream";

type LookSettings = {
  arena: ArenaTheme;
  cat: CatStyle;
  dog: DogStyle;
};

const DEFAULT_LOOK: LookSettings = {
  arena: "sunny",
  cat: "ginger",
  dog: "slate",
};

const ARENAS: { id: ArenaTheme; label: string; hint: string }[] = [
  { id: "sunny", label: "Sunny Yard", hint: "Classic bright backyard" },
  { id: "sunset", label: "Golden Hour", hint: "Warm sunset and long shadows" },
  { id: "night", label: "Moon Yard", hint: "Cool night sky and stars" },
  { id: "sakura", label: "Spring Yard", hint: "Soft morning with drifting petals" },
];

const CAT_STYLES: { id: CatStyle; label: string }[] = [
  { id: "ginger", label: "Blaze" },
  { id: "tuxedo", label: "Shadow" },
  { id: "snow", label: "Mochi" },
];

const DOG_STYLES: { id: DogStyle; label: string }[] = [
  { id: "slate", label: "Major Bark" },
  { id: "brown", label: "Bruno" },
  { id: "cream", label: "Bolt" },
];

function isLookSettings(value: unknown): value is LookSettings {
  if (!value || typeof value !== "object") return false;
  const look = value as Partial<LookSettings>;
  return (
    ARENAS.some((item) => item.id === look.arena) &&
    CAT_STYLES.some((item) => item.id === look.cat) &&
    DOG_STYLES.some((item) => item.id === look.dog)
  );
}

function applyLook(look: LookSettings) {
  const root = document.documentElement;
  root.dataset.arenaTheme = look.arena;
  root.dataset.catStyle = look.cat;
  root.dataset.dogStyle = look.dog;
}

export function GameShell() {
  const [open, setOpen] = useState(false);
  const [look, setLook] = useState<LookSettings>(DEFAULT_LOOK);

  useEffect(() => {
    let next = DEFAULT_LOOK;
    try {
      const saved = JSON.parse(localStorage.getItem("cats-dogs-look-v1") ?? "null");
      if (isLookSettings(saved)) next = saved;
    } catch {
      // Cosmetic settings are optional.
    }
    setLook(next);
    applyLook(next);
  }, []);

  const updateLook = (patch: Partial<LookSettings>) => {
    const next = { ...look, ...patch };
    setLook(next);
    applyLook(next);
    try {
      localStorage.setItem("cats-dogs-look-v1", JSON.stringify(next));
    } catch {
      // Cosmetic settings are optional.
    }
  };

  return (
    <div className="game-shell">
      <button
        type="button"
        className="look-fab"
        aria-expanded={open}
        aria-controls="look-panel"
        onClick={() => setOpen((value) => !value)}
      >
        <span aria-hidden="true">✦</span>
        Customize
      </button>

      <aside
        id="look-panel"
        className={`look-panel ${open ? "is-open" : ""}`}
        aria-hidden={!open}
      >
        <div className="look-heading">
          <div>
            <strong>Choose the yard</strong>
            <small>Background + character styles</small>
          </div>
          <button type="button" aria-label="Close customizer" onClick={() => setOpen(false)}>
            ×
          </button>
        </div>

        <div className="look-group" aria-label="Arena background">
          <span className="look-label">Background</span>
          <div className="arena-options">
            {ARENAS.map((arena) => (
              <button
                key={arena.id}
                type="button"
                className={`arena-option arena-${arena.id}`}
                aria-pressed={look.arena === arena.id}
                title={arena.hint}
                onClick={() => updateLook({ arena: arena.id })}
              >
                <span className="arena-preview" aria-hidden="true" />
                <span>{arena.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="look-group">
          <span className="look-label">Cat character</span>
          <div className="skin-options" aria-label="Cat character">
            {CAT_STYLES.map((fighter) => (
              <button
                key={fighter.id}
                type="button"
                aria-pressed={look.cat === fighter.id}
                onClick={() => updateLook({ cat: fighter.id })}
              >
                <span className={`skin-dot cat-${fighter.id}`} aria-hidden="true" />
                {fighter.label}
              </button>
            ))}
          </div>
        </div>

        <div className="look-group">
          <span className="look-label">Dog character</span>
          <div className="skin-options" aria-label="Dog character">
            {DOG_STYLES.map((fighter) => (
              <button
                key={fighter.id}
                type="button"
                aria-pressed={look.dog === fighter.id}
                onClick={() => updateLook({ dog: fighter.id })}
              >
                <span className={`skin-dot dog-${fighter.id}`} aria-hidden="true" />
                {fighter.label}
              </button>
            ))}
          </div>
        </div>
      </aside>

      <GameExperience />
    </div>
  );
}
