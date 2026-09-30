import type { SetupScreenProps } from "./SetupFlow";
import { ABILITIES } from "@/lib/game/abilities";
import type { Item } from "@/lib/game/types";
import { GameIcon } from "../GameIcon";
export function LoadoutSelect({ setup, onChange }: SetupScreenProps) {
  const toggleItem = (item: Item) =>
    onChange({
      ...setup,
      loadout: setup.loadout.includes(item)
        ? setup.loadout.filter((id) => id !== item)
        : setup.loadout.length < 3
          ? [...setup.loadout, item]
          : setup.loadout,
    });
  return (
    <>
      <div className="loadout-count" role="status">
        {setup.loadout.length} / 3 TRICKS PACKED
      </div>
      <div className="loadout-grid">
        {(Object.keys(ABILITIES) as Item[]).map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={setup.loadout.includes(item)}
            disabled={
              !setup.loadout.includes(item) && setup.loadout.length === 3
            }
            onClick={() => toggleItem(item)}
          >
            <GameIcon name={item} />
            <strong>{ABILITIES[item].name}</strong>
            <span>{ABILITIES[item].description}</span>
            <i>{setup.loadout.includes(item) ? "PACKED" : "PACK THIS"}</i>
          </button>
        ))}
      </div>
    </>
  );
}
