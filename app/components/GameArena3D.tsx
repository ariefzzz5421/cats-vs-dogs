"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { trajectoryPointAt } from "@/lib/game/ballistics";
import { ARENA } from "@/lib/game/constants";
import type {
  ActiveShot,
  CatHeroId,
  CharacterReaction,
  DogHeroId,
  GamePhase,
  ImpactResult,
  Side,
  TrajectoryPoint,
} from "@/lib/game/types";

type ArenaProps = {
  activeShot: ActiveShot | null;
  impact: ImpactResult | null;
  catHero: CatHeroId;
  dogHero: DogHeroId;
  catReaction: CharacterReaction;
  dogReaction: CharacterReaction;
  turn: Side;
  angle: number;
  wind: number;
  phase: GamePhase;
  reducedMotion: boolean;
  lowPowerDevice: boolean;
  onShotComplete: (impact: ImpactResult) => void;
};

const xPercent = (x: number) => ((x - ARENA.minX) / (ARENA.maxX - ARENA.minX)) * 100;
const yPercent = (y: number) => 10 + (Math.max(0, y) / ARENA.maxY) * 72;

function ProjectileIcon({ side }: { side: Side }) {
  if (side === "cat") {
    return (
      <svg viewBox="0 0 60 28" aria-hidden="true">
        <path d="M8 14h30M18 7l8 7-8 7M29 5l8 9-8 9M41 8l10 6-10 6" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="7" cy="14" r="4" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 60 28" aria-hidden="true">
      <path d="M15 10h30v8H15z" fill="currentColor" />
      <circle cx="11" cy="8" r="7" fill="currentColor" />
      <circle cx="11" cy="20" r="7" fill="currentColor" />
      <circle cx="49" cy="8" r="7" fill="currentColor" />
      <circle cx="49" cy="20" r="7" fill="currentColor" />
    </svg>
  );
}

function Fighter({
  side,
  hero,
  reaction,
  active,
}: {
  side: Side;
  hero: CatHeroId | DogHeroId;
  reaction: CharacterReaction;
  active: boolean;
}) {
  const label = side === "cat" ? "Cat fighter" : "Dog fighter";
  return (
    <div className={`classic-fighter classic-fighter--${side} reaction-${reaction}${active ? " is-active" : ""}`}>
      <div className="classic-fighter__shadow" />
      <img src={`/characters/${hero}.webp`} alt={label} width="288" height="400" draggable={false} />
      <span className="classic-fighter__ground-ring" aria-hidden="true" />
    </div>
  );
}

function AimGuide({ side, angle }: { side: Side; angle: number }) {
  const signed = side === "cat" ? -angle : angle - 180;
  return (
    <div className={`classic-aim classic-aim--${side}`} style={{ transform: `rotate(${signed}deg)` }} aria-hidden="true">
      <span />
      <b>›</b>
    </div>
  );
}

export function GameArena3D({
  activeShot,
  impact,
  catHero,
  dogHero,
  catReaction,
  dogReaction,
  turn,
  angle,
  wind,
  phase,
  reducedMotion,
  onShotComplete,
}: ArenaProps) {
  const [point, setPoint] = useState<TrajectoryPoint | null>(null);
  const completedShot = useRef<string | null>(null);
  const flightFrame = useRef<number | null>(null);

  useEffect(() => {
    if (flightFrame.current) cancelAnimationFrame(flightFrame.current);
    flightFrame.current = null;

    if (!activeShot) {
      setPoint(null);
      return;
    }

    if (completedShot.current === activeShot.input.shotId) return;

    const first = activeShot.result.points[0] ?? null;
    setPoint(first);

    if (reducedMotion) {
      setPoint(activeShot.result.points.at(-1) ?? first);
      const timer = window.setTimeout(() => {
        completedShot.current = activeShot.input.shotId;
        onShotComplete(activeShot.result.impact);
      }, 110);
      return () => window.clearTimeout(timer);
    }

    const startedAt = performance.now();
    const playbackRate = 1.12;
    const tick = (now: number) => {
      const elapsed = ((now - startedAt) / 1000) * playbackRate;
      setPoint(trajectoryPointAt(activeShot.result, elapsed));
      if (elapsed >= activeShot.result.impact.time) {
        completedShot.current = activeShot.input.shotId;
        flightFrame.current = null;
        onShotComplete(activeShot.result.impact);
        return;
      }
      flightFrame.current = requestAnimationFrame(tick);
    };
    flightFrame.current = requestAnimationFrame(tick);

    return () => {
      if (flightFrame.current) cancelAnimationFrame(flightFrame.current);
      flightFrame.current = null;
    };
  }, [activeShot, onShotComplete, reducedMotion]);

  const projectileStyle = useMemo(() => {
    if (!point) return undefined;
    const rotation = -(Math.atan2(point.vy, point.vx) * 180) / Math.PI;
    return {
      left: `${xPercent(point.x)}%`,
      bottom: `${yPercent(point.y)}%`,
      transform: `translate(-50%, 50%) rotate(${rotation}deg)`,
    };
  }, [point]);

  const impactStyle = impact
    ? { left: `${xPercent(impact.position.x)}%`, bottom: `${yPercent(impact.position.y)}%` }
    : undefined;

  const isAiming = phase === "AIMING" || phase === "CHARGING";
  const windDirection = wind === 0 ? "still" : wind > 0 ? "right" : "left";

  return (
    <div className={`classic-arena wind-${windDirection}`} role="img" aria-label="Cat and dog face each other across a backyard wall">
      <div className="classic-sky">
        <span className="classic-sun" />
        <span className="classic-cloud classic-cloud--one" />
        <span className="classic-cloud classic-cloud--two" />
      </div>

      <div className="classic-neighborhood" aria-hidden="true">
        <span className="classic-house classic-house--left"><i /></span>
        <span className="classic-house classic-house--right"><i /></span>
        <span className="classic-tree classic-tree--one" />
        <span className="classic-tree classic-tree--two" />
      </div>

      <div className="classic-fence" aria-hidden="true" />
      <div className="classic-grass classic-grass--back" aria-hidden="true" />

      <div className="classic-wall" aria-hidden="true">
        <span /><span /><span /><span /><span /><span /><span /><span /><span />
      </div>

      <Fighter side="cat" hero={catHero} reaction={catReaction} active={turn === "cat"} />
      <Fighter side="dog" hero={dogHero} reaction={dogReaction} active={turn === "dog"} />

      {isAiming && <AimGuide side={turn} angle={angle} />}

      {activeShot && point && projectileStyle && (
        <div className={`classic-projectile classic-projectile--${activeShot.input.side}`} style={projectileStyle}>
          <ProjectileIcon side={activeShot.input.side} />
          <span className="classic-projectile__trail" />
        </div>
      )}

      {impact && impactStyle && (
        <div className={`classic-impact classic-impact--${impact.kind}`} style={impactStyle} aria-hidden="true">
          <i /><i /><i /><i /><b>{impact.kind === "target" ? "POW!" : impact.kind === "wall" ? "CLONK!" : "PUFF!"}</b>
        </div>
      )}

      {Math.abs(wind) > 0.08 && (
        <div className="classic-wind-leaves" aria-hidden="true">
          <i /><i /><i /><i />
        </div>
      )}

      <div className="classic-grass classic-grass--front" aria-hidden="true" />
    </div>
  );
}
