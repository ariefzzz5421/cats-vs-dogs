import type { PointerEvent, RefObject } from "react";
import { canControl } from "@/lib/game/engine";
import { windStrengthLabel } from "@/lib/game/ballistics";
import { characterFor, SIGNATURE_DETAILS } from "@/lib/game/characters";
import { ABILITIES } from "@/lib/game/abilities";
import type { Item, MatchState } from "@/lib/game/types";
import { GameIcon } from "../GameIcon";
import { FighterArt, WeaponArt } from "./ArtPreview";
export function BattleHUD({ state }: { state: MatchState }) {
  return (
    <section className="battle-hud" aria-label="Health, wind and turn">
      {(["cat", "dog"] as const).map((side) => {
        const fighter = characterFor(side, state.setup.fighters);
        return (
          <div key={side} className={`health health-${side}`}>
            <FighterArt id={fighter.id} portrait />
            <div className="health-info">
              <div>
                <strong>{fighter.name}</strong>
                <span>
                  {state.health[side]} <small>HP</small>
                </span>
              </div>
              <div
                className="health-track"
                role="meter"
                aria-label={`${fighter.name} health`}
                aria-valuenow={state.health[side]}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <i
                  style={{ transform: `scaleX(${state.health[side] / 100})` }}
                />
              </div>
            </div>
          </div>
        );
      })}
      <div className="wind">
        <small>WIND</small>
        <strong
          key={state.turnIndex}
          aria-label={`Wind ${Math.abs(state.wind).toFixed(1)} ${state.wind < 0 ? "left" : state.wind > 0 ? "right" : "calm"}, ${windStrengthLabel(state.wind)}`}
        >
          <span className="wind-arrow">
            {state.wind < 0 ? "←" : state.wind > 0 ? "→" : "—"}
          </span>
          {Math.abs(state.wind).toFixed(1)}
        </strong>
        <div className="wind-scale" aria-hidden="true">
          <span>←</span>
          <i
            className="wind-marker"
            style={{ left: `${50 + state.wind * 5}%` }}
          />
          <span>→</span>
        </div>
        <b className="wind-strength">{windStrengthLabel(state.wind)}</b>
        <span className={`turn-chip ${state.turn}`} role="status">
          {state.turn.toUpperCase()} TURN · {state.turnIndex + 1}
        </span>
      </div>
    </section>
  );
}
type ControlsProps = {
  state: MatchState;
  onItem: (item: Item) => void;
  onSignature: () => void;
  onAngle: (angle: number) => void;
  onDown: (e: PointerEvent<HTMLElement>) => void;
  onEnd: (e: PointerEvent<HTMLElement>, cancelled?: boolean) => void;
  meter: RefObject<HTMLElement | null>;
  powerText: RefObject<HTMLOutputElement | null>;
  powerMeter: RefObject<HTMLDivElement | null>;
  chargeLabel: RefObject<HTMLElement | null>;
  throwLabel: RefObject<HTMLElement | null>;
};
export function BattleControls({
  state: s,
  onItem,
  onSignature,
  onAngle,
  onDown,
  onEnd,
  meter,
  powerText,
  powerMeter,
  chargeLabel,
  throwLabel,
}: ControlsProps) {
  const controlled = canControl(s),
    charging = s.phase === "charging",
    fighter = characterFor(s.turn, s.setup.fighters);
  return (
    <section
      className={`battle-controls team-${s.turn}`}
      data-phase={s.phase}
      aria-label="Combat controls"
    >
      <div className="ability-bar">
        {s.setup.loadout.map((item) => (
          <button
            type="button"
            key={item}
            title={ABILITIES[item].description}
            aria-label={`${ABILITIES[item].name}. ${ABILITIES[item].description}. ${s.stock[s.turn][item]} use remaining`}
            aria-pressed={s.selected === item}
            disabled={
              !controlled ||
              charging ||
              !s.stock[s.turn][item] ||
              (item === "heal" && s.health[s.turn] === 100)
            }
            onClick={() => onItem(item)}
          >
            <GameIcon name={item} side={s.turn} />
            <span>{ABILITIES[item].short}</span>
            <small>{s.stock[s.turn][item]}</small>
          </button>
        ))}
        <button
          className="signature-slot"
          type="button"
          title={`${fighter.signature} · ${SIGNATURE_DETAILS[fighter.id]} · once per match`}
          aria-label={`${fighter.signature} signature attack. ${s.signatureStock[s.turn]} use remaining`}
          aria-pressed={s.signatureSelected}
          disabled={!controlled || charging || !s.signatureStock[s.turn]}
          onClick={onSignature}
        >
          <WeaponArt id={fighter.id} />
          <span>Signature</span>
          <small>{s.signatureStock[s.turn]}</small>
        </button>
      </div>
      <label className="aim-control">
        <span>
          <GameIcon name="aim" />
          ANGLE <output>{Math.round(s.angle)}°</output>
        </span>
        <input
          type="range"
          min={20}
          max={78}
          value={s.angle}
          disabled={!controlled || charging}
          onChange={(e) => onAngle(Number(e.target.value))}
        />
      </label>
      <div className="attack-cluster">
        <div className="charge-readout">
          <span ref={chargeLabel}>{charging ? "LOW" : "POWER"}</span>
          <output ref={powerText}>{Math.round(s.power)}%</output>
          <span className="charge-wind">
            WIND {s.wind < 0 ? "←" : s.wind > 0 ? "→" : "—"}{" "}
            {Math.abs(s.wind).toFixed(1)}
          </span>
        </div>
        <div
          className="power-track"
          ref={powerMeter}
          role="meter"
          aria-label="Throw power"
          aria-valuemin={0}
          aria-valuemax={s.retryTurn ? 70 : 100}
          aria-valuenow={Math.round(s.power)}
        >
          <i ref={meter} />
        </div>
        <button
          className="primary throw-button"
          type="button"
          disabled={!controlled}
          onPointerDown={onDown}
          onPointerUp={(e) => onEnd(e)}
          onPointerCancel={(e) => onEnd(e, true)}
          onLostPointerCapture={(e) => onEnd(e, true)}
          onContextMenu={(e) => e.preventDefault()}
        >
          <WeaponArt id={fighter.id} />
          <span>
            <strong ref={throwLabel}>
              {controlled
                ? charging
                  ? "RELEASE!"
                  : "HOLD TO THROW"
                : "RIVAL IN ACTION"}
            </strong>
            <small>
              {s.signatureSelected
                ? fighter.signature
                : s.selected
                  ? ABILITIES[s.selected].name
                  : controlled
                    ? "Space / touch & hold"
                    : s.phase === "gameOver"
                      ? "The yard has a winner"
                      : "Watch the landing"}
            </small>
          </span>
        </button>
      </div>
      <p className="battle-message" role="status">
        {s.message}
      </p>
    </section>
  );
}
