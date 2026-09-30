import type { SetupScreenProps } from "./SetupFlow";
import { GameIcon } from "../GameIcon";
export function ModeSelect({ setup, onChange }: SetupScreenProps) {
  return (
    <>
      <div className="mode-select">
        {(["solo", "local"] as const).map((mode) => (
          <button
            key={mode}
            className={`mode-card ${mode}`}
            type="button"
            aria-pressed={setup.mode === mode}
            onClick={() => onChange({ ...setup, mode })}
          >
            <GameIcon name={mode} />
            <strong>
              {mode === "solo" ? "VS COMPUTER" : "LOCAL 2 PLAYER"}
            </strong>
            <span>
              {mode === "solo"
                ? "Outsmart a cheeky rival."
                : "One device. Two grudges."}
            </span>
            <i>{setup.mode === mode ? "SELECTED" : "CHOOSE"}</i>
          </button>
        ))}
      </div>
      {setup.mode === "solo" && (
        <fieldset className="difficulty">
          <legend>How much trouble?</legend>
          {(["easy", "normal", "hard"] as const).map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={setup.difficulty === d}
              onClick={() => onChange({ ...setup, difficulty: d })}
            >
              {d}
            </button>
          ))}
        </fieldset>
      )}
    </>
  );
}
