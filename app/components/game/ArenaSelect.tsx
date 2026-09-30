import type { SetupScreenProps } from "./SetupFlow";
import { THEMES } from "@/lib/game/themes";
import { ArenaArt } from "./ArtPreview";
export function ArenaSelect({
  setup,
  onChange,
  onConfirm,
}: SetupScreenProps & { onConfirm: () => void }) {
  return (
    <div className="arena-select">
      <div className="arena-large">
        <ArenaArt setup={setup} animated />
        <div>
          <strong>{THEMES[setup.theme].name}</strong>
          <span>{THEMES[setup.theme].description}</span>
        </div>
      </div>
      <div className="arena-grid">
        {Object.values(THEMES).map((theme) => (
          <button
            type="button"
            key={theme.id}
            aria-pressed={setup.theme === theme.id}
            onClick={() => {
              onConfirm();
              onChange({ ...setup, theme: theme.id });
            }}
          >
            <ArenaArt setup={{ ...setup, theme: theme.id }} />
            <strong>{theme.name}</strong>
            <small>{theme.description}</small>
          </button>
        ))}
      </div>
    </div>
  );
}
