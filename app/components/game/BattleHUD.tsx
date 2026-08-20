"use client";

import { windToKmh } from "@/lib/game/ballistics";
import { PHYSICS } from "@/lib/game/constants";
import type { GamePhase, HealthState, Side } from "@/lib/game/types";

type Props = {
  catName: string;
  dogName: string;
  health: HealthState;
  turn: Side;
  phase: GamePhase;
  angle: number;
  power: number;
  wind: number;
  status: string;
  canAct: boolean;
  soundEnabled: boolean;
  lowPowerDevice: boolean;
  onAngle: (angle: number) => void;
  onChargeStart: () => void;
  onChargeEnd: () => void;
  onLobby: () => void;
  onFullscreen: () => void;
  onSound: () => void;
};

function HealthBar({ side, name, value }: { side: Side; name: string; value: number }) {
  return <div className={`battle-health battle-health--${side}`}><div><strong>{name}</strong><b>{value}<small> HP</small></b></div><span role="meter" aria-label={`${name} health`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}><i style={{ transform: `scaleX(${value / 100})` }} /></span></div>;
}

export function BattleHUD(props: Props) {
  const windDirection = props.wind < 0 ? "←" : props.wind > 0 ? "→" : "—";
  const charging = props.phase === "CHARGING";
  return (
    <div className="battle-hud">
      <div className="battle-hud__top">
        <HealthBar side="cat" name={props.catName} value={props.health.cat} />
        <div className={`wind-readout wind-readout--${props.wind < 0 ? "left" : props.wind > 0 ? "right" : "calm"}`}>
          <small>{props.turn} · Wind</small><b>{windDirection} {windToKmh(props.wind)}</b><span>km/h</span>
        </div>
        <HealthBar side="dog" name={props.dogName} value={props.health.dog} />
        <div className="battle-tools">
          <button type="button" onClick={props.onLobby} aria-label="Exit to lobby">×</button>
          <button type="button" onClick={props.onSound} aria-label={props.soundEnabled ? "Turn sound off" : "Turn sound on"}>{props.soundEnabled ? "♪" : "♪̸"}</button>
          <button type="button" onClick={props.onFullscreen} aria-label="Fullscreen">⛶</button>
          {props.lowPowerDevice && <span>Lite</span>}
        </div>
      </div>

      <div className="battle-hud__bottom">
        <div className="turn-copy" aria-live="polite"><small>{props.turn === "cat" ? "Cat turn" : "Dog turn"}</small><strong>{props.status}</strong></div>
        <label className="angle-control">
          <span>Angle <b>{Math.round(props.angle)}°</b></span>
          <input aria-label={`Angle ${Math.round(props.angle)} degrees`} type="range" min={PHYSICS.minAngle} max={PHYSICS.maxAngle} step="1" value={props.angle} onChange={(event) => props.onAngle(Number(event.target.value))} disabled={!props.canAct || charging} />
        </label>
        <div className="power-control">
          <span>Power <b>{Math.round(props.power)}%</b></span>
          <div role="meter" aria-label="Throw power" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(props.power)}><i style={{ transform: `scaleX(${props.power / 100})` }} /></div>
        </div>
        <button
          className={`throw-control${charging ? " is-charging" : ""}`}
          type="button"
          disabled={!props.canAct && !charging}
          onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); props.onChargeStart(); }}
          onPointerUp={props.onChargeEnd}
          onPointerCancel={props.onChargeEnd}
          onContextMenu={(event) => event.preventDefault()}
        >
          <strong>{charging ? "Release!" : "Hold to throw"}</strong><small>Space or touch</small>
        </button>
      </div>
      <div className="rotate-prompt"><b>Rotate your phone</b><span>Backyard Rumble plays best in landscape.</span></div>
    </div>
  );
}
