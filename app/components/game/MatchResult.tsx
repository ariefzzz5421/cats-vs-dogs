import { characterFor } from "@/lib/game/characters";
import type { MatchState } from "@/lib/game/types";
import { FighterArt } from "./ArtPreview";
export function MatchResult({
  state,
  onRematch,
  onChange,
  onMenu,
}: {
  state: MatchState;
  onRematch: () => void;
  onChange: () => void;
  onMenu: () => void;
}) {
  if (!state.winner) return null;
  const fighter = characterFor(state.winner, state.setup.fighters);
  return (
    <div className={`match-result team-${state.winner}`}>
      <p className="eyebrow">THE YARD HAS A NEW BOSS</p>
      <h2>{fighter.name} wins!</h2>
      <div className="winner-art">
        <FighterArt id={fighter.id} animated victory />
        <i />
        <i />
        <i />
      </div>
      <p>{state.health[state.winner]} HP remaining</p>
      <button className="primary" type="button" onClick={onRematch}>
        REMATCH
      </button>
      <button type="button" onClick={onChange}>
        Change fighters
      </button>
      <button className="text-button" type="button" onClick={onMenu}>
        Main menu
      </button>
    </div>
  );
}
