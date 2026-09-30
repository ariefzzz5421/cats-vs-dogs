"use client";
import { useState } from "react";
import { THEMES } from "@/lib/game/themes";
import { characterFor } from "@/lib/game/characters";
import { ABILITIES } from "@/lib/game/abilities";
import type { MatchSetup } from "@/lib/game/setup";

import { GameIcon } from "../GameIcon";
import { ArenaArt } from "./ArtPreview";
import { MainMenu } from "./MainMenu";
import { ModeSelect } from "./ModeSelect";
import { ArenaSelect } from "./ArenaSelect";
import { CharacterSelect } from "./CharacterSelect";
import { LoadoutSelect } from "./LoadoutSelect";
export type SetupScreenProps = {
  setup: MatchSetup;
  onChange: (setup: MatchSetup) => void;
};
export type SetupStep =
  "home" | "mode" | "arena" | "fighters" | "loadout" | "ready";
const steps: SetupStep[] = ["mode", "arena", "fighters", "loadout", "ready"];
const labels = {
  home: "Home",
  mode: "Showdown",
  arena: "Your yard",
  fighters: "Fighters",
  loadout: "Tricks",
  ready: "Ready?",
};
export function SetupFlow({
  setup,
  step,
  onStep,
  onChange,
  onStart,
  onTutorial,
}: {
  setup: MatchSetup;
  step: SetupStep;
  onStep: (step: SetupStep) => void;
  onChange: (setup: MatchSetup) => void;
  onStart: () => void;
  onTutorial: () => void;
}) {
  const [arenaChosen, setArenaChosen] = useState(false);
  const index = steps.indexOf(step),
    cat = characterFor("cat", setup.fighters),
    dog = characterFor("dog", setup.fighters);
  return (
    <section className={`setup-screen setup-${step}`} aria-label={labels[step]}>
      {step !== "home" && (
        <nav className="setup-progress" aria-label="Match setup">
          <button
            type="button"
            onClick={() => onStep(index === 0 ? "home" : steps[index - 1])}
          >
            ← Back
          </button>
          <ol>
            {steps.map((id, i) => (
              <li key={id} aria-current={step === id ? "step" : undefined}>
                <span>{i + 1}</span>
                {labels[id]}
              </li>
            ))}
          </ol>
        </nav>
      )}
      {step === "home" ? (
        <MainMenu
          setup={setup}
          onPlay={() => onStep("mode")}
          onTutorial={onTutorial}
        />
      ) : (
        <div className="setup-content" key={step}>
          <header className="step-heading">
            <p className="eyebrow">
              BACKYARD RUMBLE / {String(index + 1).padStart(2, "0")}
            </p>
            <h1>
              {step === "mode"
                ? "Pick a fight."
                : step === "arena"
                  ? "Where’s the trouble?"
                  : step === "fighters"
                    ? "Choose your troublemakers."
                    : step === "loadout"
                      ? "Bring three dirty tricks."
                      : "Let’s settle this."}
            </h1>
            <p>
              {step === "mode"
                ? "A worthy rival. No sign-up required."
                : step === "arena"
                  ? "Six yards. One grudge. Choose your arena."
                  : step === "fighters"
                    ? "Different personalities. The same fair fight."
                    : step === "loadout"
                      ? "One use each, for both sides. Make them count."
                      : `${THEMES[setup.theme].name} · ${setup.mode === "solo" ? `${setup.difficulty} computer` : "Local two-player"}`}
            </p>
          </header>
          {step === "mode" && <ModeSelect setup={setup} onChange={onChange} />}
          {step === "arena" && (
            <ArenaSelect
              setup={setup}
              onChange={onChange}
              onConfirm={() => setArenaChosen(true)}
            />
          )}
          {step === "fighters" && (
            <CharacterSelect setup={setup} onChange={onChange} />
          )}
          {step === "loadout" && (
            <LoadoutSelect setup={setup} onChange={onChange} />
          )}
          {step === "ready" && (
            <div className="ready-preview">
              <ArenaArt setup={setup} animated />
              <div className="versus-card">
                <strong>{cat.name}</strong>
                <b>VS</b>
                <strong>{dog.name}</strong>
              </div>
              <div className="ready-loadout">
                {setup.loadout.map((item) => (
                  <span key={item}>
                    <GameIcon name={item} />
                    {ABILITIES[item].short}
                  </span>
                ))}
              </div>
              <p>Set your angle. Hold to charge. Release to throw.</p>
            </div>
          )}
          <footer className="setup-actions">
            <span>
              {step === "arena" && !arenaChosen
                ? "Click an arena to confirm your choice."
                : step === "loadout"
                  ? "Both fighters get your selected three tricks."
                  : step === "fighters"
                    ? `${cat.name} vs ${dog.name}`
                    : "Hold. Release. Rule the yard."}
            </span>
            <button
              className="primary"
              type="button"
              disabled={
                (step === "arena" && !arenaChosen) ||
                (step === "loadout" && setup.loadout.length !== 3)
              }
              onClick={() =>
                step === "ready" ? onStart() : onStep(steps[index + 1])
              }
            >
              {step === "ready" ? "LET’S RUMBLE" : "CONTINUE"}
              <GameIcon name="play" />
            </button>
          </footer>
        </div>
      )}
    </section>
  );
}
