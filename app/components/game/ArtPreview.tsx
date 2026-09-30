"use client";
import { useEffect, useRef } from "react";
import {
  drawCharacterPreview,
  drawWeaponPreview,
  GameRenderer,
} from "@/lib/game/renderer";
import { createMatch } from "@/lib/game/engine";
import { type CharacterId } from "@/lib/game/characters";
import type { MatchSetup } from "@/lib/game/setup";
export function FighterArt({
  id,
  animated = false,
  portrait = false,
  victory = false,
}: {
  id: CharacterId;
  animated?: boolean;
  portrait?: boolean;
  victory?: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current,
      c = canvas?.getContext("2d");
    if (!canvas || !c) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0,
      previous = -100;
    const render = (now: number) => {
      if (now - previous > 32 || !animated) {
        previous = now;
        c.setTransform(portrait ? 1 : 2, 0, 0, portrait ? 1 : 2, 0, 0);
        c.clearRect(0, 0, 300, 260);
        drawCharacterPreview(
          c,
          id,
          reduced.matches || !animated ? 0 : now / 1000,
          portrait,
          victory,
        );
      }
      if (animated && !reduced.matches) frame = requestAnimationFrame(render);
    };
    render(0);
    return () => cancelAnimationFrame(frame);
  }, [id, animated, portrait, victory]);
  return (
    <canvas
      className={`fighter-art ${portrait ? "portrait-art" : ""}`}
      ref={ref}
      width={portrait ? 300 : 600}
      height={portrait ? 260 : 520}
      aria-hidden="true"
    />
  );
}
export function ArenaArt({
  setup,
  animated = false,
  fighters = true,
}: {
  setup: MatchSetup;
  animated?: boolean;
  fighters?: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current?.getContext("2d");
    if (!c) return;
    const state = createMatch(setup.mode, setup.difficulty, 1, setup),
      renderer = new GameRenderer(),
      reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0,
      previous = -100;
    const render = (now: number) => {
      if (now - previous > 40 || !animated) {
        previous = now;
        state.clock = reduced.matches ? 0 : now / 1000;
        c.setTransform(0.6, 0, 0, 0.6, 0, 0);
        renderer.draw(
          c,
          state,
          reduced.matches,
          !animated,
          0,
          1 / 60,
          fighters,
        );
      }
      if (animated && !reduced.matches) frame = requestAnimationFrame(render);
    };
    render(0);
    return () => cancelAnimationFrame(frame);
  }, [setup, animated, fighters]);
  return (
    <canvas
      ref={ref}
      className="arena-art"
      width={600}
      height={384}
      aria-hidden="true"
    />
  );
}
export function WeaponArt({ id }: { id: CharacterId }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current?.getContext("2d");
    if (c) {
      c.clearRect(0, 0, 128, 128);
      c.setTransform(2, 0, 0, 2, 0, 0);
      drawWeaponPreview(c, id);
    }
  }, [id]);
  return (
    <canvas
      ref={ref}
      className="game-icon weapon-art"
      width={128}
      height={128}
      aria-hidden="true"
    />
  );
}
