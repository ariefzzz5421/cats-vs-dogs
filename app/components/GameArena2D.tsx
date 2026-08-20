"use client";

/* eslint-disable @next/next/no-img-element -- small local fighter sprites avoid image-pipeline overhead during a match. */

import { useEffect, useMemo, useRef, type CSSProperties } from "react";

import { trajectoryPointAt } from "@/lib/game/ballistics";
import { ARENA, originFor } from "@/lib/game/constants";
import { getCatHero, getDogHero } from "@/lib/game/roster";
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
  power: number;
  wind: number;
  phase: GamePhase;
  reducedMotion: boolean;
  lowPowerDevice: boolean;
  onShotComplete: (impact: ImpactResult) => void;
};

const GROUND_LINE = 0.82;
const FLIGHT_SPAN = 0.7;

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const xRatio = (x: number) => clamp01((x - ARENA.minX) / (ARENA.maxX - ARENA.minX));
const yRatio = (y: number) => GROUND_LINE - (clamp01(y / ARENA.maxY) * FLIGHT_SPAN);

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
  power,
}: {
  side: Side;
  hero: CatHeroId | DogHeroId;
  reaction: CharacterReaction;
  active: boolean;
  power: number;
}) {
  const definition = side === "cat" ? getCatHero(hero as CatHeroId) : getDogHero(hero as DogHeroId);
  const center = ARENA.characters[side].center;
  const chargeLevel = clamp01(power / 100);
  const style = {
    left: `${xRatio(center.x) * 100}%`,
    "--charge-squeeze": `${1 - chargeLevel * 0.035}`,
    "--charge-stretch": `${1 + chargeLevel * 0.035}`,
  } as CSSProperties;

  return (
    <div
      className={`classic-fighter classic-fighter--${side} reaction-${reaction}${active ? " is-active" : ""}`}
      style={style}
      data-reaction={reaction}
    >
      <div className="classic-fighter__shadow" />
      <div className="classic-fighter__portrait">
        <img
          src={`/characters/battle/${hero}.webp`}
          alt={`${definition.name}, ${definition.role}`}
          width="432"
          height="600"
          decoding="async"
          draggable={false}
        />
      </div>
      <span className="classic-fighter__ground-ring" aria-hidden="true" />
    </div>
  );
}

function AimGuide({ side, angle }: { side: Side; angle: number }) {
  const origin = originFor(side);
  const rotation = side === "cat" ? -angle : angle - 180;
  return (
    <div
      className={`classic-aim classic-aim--${side}`}
      style={{ left: `${xRatio(origin.x) * 100}%`, top: `${yRatio(origin.y) * 100}%`, transform: `rotate(${rotation}deg)` }}
      aria-hidden="true"
    >
      <span /><b>›</b>
    </div>
  );
}

function placeProjectile(element: HTMLDivElement, point: TrajectoryPoint, width: number, height: number) {
  const x = xRatio(point.x) * width;
  const y = yRatio(point.y) * height;
  const rotation = (Math.atan2(-point.vy, point.vx) * 180) / Math.PI;
  element.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) rotate(${rotation}deg)`;
}

export function GameArena2D({
  activeShot,
  impact,
  catHero,
  dogHero,
  catReaction,
  dogReaction,
  turn,
  angle,
  power,
  wind,
  phase,
  reducedMotion,
  lowPowerDevice,
  onShotComplete,
}: ArenaProps) {
  const arenaRef = useRef<HTMLDivElement>(null);
  const projectileRef = useRef<HTMLDivElement>(null);
  const completedShot = useRef<string | null>(null);
  const flightFrame = useRef<number | null>(null);
  const arenaSize = useRef({ width: 1, height: 1 });

  useEffect(() => {
    const arena = arenaRef.current;
    if (!arena) return;
    const measure = () => {
      const bounds = arena.getBoundingClientRect();
      arenaSize.current = { width: Math.max(1, bounds.width), height: Math.max(1, bounds.height) };
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(arena);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (flightFrame.current) cancelAnimationFrame(flightFrame.current);
    flightFrame.current = null;
    const projectile = projectileRef.current;
    if (!activeShot || !projectile || completedShot.current === activeShot.input.shotId) return;

    const first = activeShot.result.points[0];
    if (first) placeProjectile(projectile, first, arenaSize.current.width, arenaSize.current.height);

    if (reducedMotion) {
      const finalPoint = activeShot.result.points.at(-1) ?? first;
      if (finalPoint) placeProjectile(projectile, finalPoint, arenaSize.current.width, arenaSize.current.height);
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
      placeProjectile(projectile, trajectoryPointAt(activeShot.result, elapsed), arenaSize.current.width, arenaSize.current.height);
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

  const wallStyle = useMemo(() => ({
    left: `${xRatio(ARENA.wall.minX) * 100}%`,
    width: `${(xRatio(ARENA.wall.maxX) - xRatio(ARENA.wall.minX)) * 100}%`,
    top: `${yRatio(ARENA.wall.maxY) * 100}%`,
    height: `${(yRatio(ARENA.wall.minY) - yRatio(ARENA.wall.maxY)) * 100}%`,
  }), []);

  const impactStyle = impact ? {
    left: `${xRatio(impact.position.x) * 100}%`,
    top: `${yRatio(impact.position.y) * 100}%`,
  } : undefined;

  const isAiming = phase === "AIMING" || phase === "CHARGING";
  const windDirection = wind === 0 ? "still" : wind > 0 ? "right" : "left";
  const strongHit = impact?.kind === "target" && impact.speed >= 6;
  const particles = lowPowerDevice ? 3 : 6;

  return (
    <div
      ref={arenaRef}
      className={`classic-arena wind-${windDirection}${strongHit ? " is-strong-hit" : ""}${lowPowerDevice ? " is-lite" : ""}`}
      role="img"
      aria-label={`${getCatHero(catHero).name} stands left, ${getDogHero(dogHero).name} stands right, with a brick wall in the center`}
    >
      <div className="classic-sky" aria-hidden="true">
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

      <div className="classic-wall" style={wallStyle} aria-label="Center brick wall">
        {Array.from({ length: 12 }, (_, index) => <span key={index} />)}
      </div>

      <Fighter side="cat" hero={catHero} reaction={catReaction} active={turn === "cat"} power={power} />
      <Fighter side="dog" hero={dogHero} reaction={dogReaction} active={turn === "dog"} power={power} />

      {isAiming && <AimGuide side={turn} angle={angle} />}

      {activeShot && (
        <div ref={projectileRef} className={`classic-projectile classic-projectile--${activeShot.input.side}`}>
          <ProjectileIcon side={activeShot.input.side} />
          <span className="classic-projectile__trail" />
        </div>
      )}

      {impact && impactStyle && (
        <div className={`classic-impact classic-impact--${impact.kind}`} style={impactStyle} aria-hidden="true">
          {Array.from({ length: particles }, (_, index) => <i key={index} />)}
          <b>{impact.kind === "target" ? "POW!" : impact.kind === "wall" ? "CLONK!" : "PUFF!"}</b>
          {impact.kind === "target" && <strong>−{impact.damage} HP</strong>}
        </div>
      )}

      {!lowPowerDevice && Math.abs(wind) > 0.08 && (
        <div className="classic-wind-leaves" aria-hidden="true"><i /><i /><i /><i /></div>
      )}

      <div className="classic-grass classic-grass--front" aria-hidden="true" />
    </div>
  );
}
