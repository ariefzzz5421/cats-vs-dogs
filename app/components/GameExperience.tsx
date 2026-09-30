"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import {
  advance,
  cancelCharge,
  createMatch,
  releaseCharge,
  selectItem,
  selectSignature,
  setAngle,
  startCharge,
  startMatch,
  togglePause,
} from "@/lib/game/engine";
import { ARENA, PHYSICS } from "@/lib/game/constants";
import { GameRenderer } from "@/lib/game/renderer";
import {
  playGameSound,
  setSoundEnabled,
  startChargeSound,
  stopChargeSound,
  stopGameSounds,
  updateChargeSound,
} from "@/lib/game/audio";
import type { Difficulty, MatchState } from "@/lib/game/types";
import { GameIcon } from "./GameIcon";
import {
  DEFAULT_SETUP,
  sanitizeSetup,
  migrateLegacySetup,
  SETTINGS_KEY,
  type MatchSetup,
} from "@/lib/game/setup";
import { SetupFlow, type SetupStep } from "./game/SetupFlow";
import { BattleHUD, BattleControls } from "./game/BattleHUD";
import { MatchResult } from "./game/MatchResult";
import { characterFor } from "@/lib/game/characters";

const copyState = (s: MatchState): MatchState => ({
  ...s,
  health: { ...s.health },
  stock: { cat: { ...s.stock.cat }, dog: { ...s.stock.dog } },
  signatureStock: { ...s.signatureStock },
});
function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog ref={ref} className="game-dialog" onCancel={onClose}>
      <h2>{title}</h2>
      {children}
    </dialog>
  );
}

export function GameExperience() {
  const engine = useRef<MatchState>(createMatch());
  const canvas = useRef<HTMLCanvasElement>(null);
  const meter = useRef<HTMLElement>(null);
  const chargeLabel = useRef<HTMLElement>(null);
  const throwLabel = useRef<HTMLElement>(null);
  const powerText = useRef<HTMLOutputElement>(null);
  const powerMeter = useRef<HTMLDivElement>(null);
  const [view, setView] = useState(() => createMatch());
  const [setup, setSetup] = useState<MatchSetup>(DEFAULT_SETUP);
  const [step, setStep] = useState<SetupStep>("home");
  const [tutorial, setTutorial] = useState(false);
  const [sound, setSound] = useState(true);
  const [error, setError] = useState("");
  const [fullSupported, setFullSupported] = useState(false);
  const activePointer = useRef<number | null>(null);
  const keyboardCharge = useRef(false);
  const publish = () => setView(copyState(engine.current));

  useEffect(() => {
    const surface = canvas.current,
      context = surface?.getContext("2d", { alpha: false });
    if (!surface || !context) {
      const id = requestAnimationFrame(() =>
        setError(
          "Canvas is unavailable. Try a current browser or enable graphics support.",
        ),
      );
      return () => cancelAnimationFrame(id);
    }
    let savedSound = true;
    try {
      const readSetting = (key: string): unknown => {
        try {
          return JSON.parse(localStorage.getItem(key) ?? "null");
        } catch {
          return null;
        }
      };
      const settings = readSetting("backyard-settings-v3");
      const saved =
        settings && typeof settings === "object"
          ? (settings as { difficulty?: unknown; sound?: unknown })
          : {};
      const modern = readSetting(SETTINGS_KEY);
      const storedSetup = modern
        ? sanitizeSetup(modern)
        : migrateLegacySetup(
            readSetting("cats-dogs-look-v1"),
            saved.difficulty,
          );
      requestAnimationFrame(() => setSetup(storedSetup));
      // Restore only settings; the mandatory setup flow always begins at Home.
      engine.current.difficulty = storedSetup.difficulty;
      if (typeof saved.sound === "boolean") {
        savedSound = saved.sound;
        setSoundEnabled(saved.sound);
      }
    } catch {
      /* Storage is optional (private browsing, corrupt settings). */
    }
    let initialized = false;
    const renderer = new GameRenderer();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const lowPower = navigator.hardwareConcurrency <= 4;
    let frame = 0,
      previous = 0,
      accumulator = 0,
      signature = "",
      width = 1000,
      height = 560;
    const resize = () => {
      const rect = surface.getBoundingClientRect(),
        dpr = Math.min(window.devicePixelRatio || 1, lowPower ? 1.25 : 2);
      width = Math.max(1, Math.round(rect.width * dpr));
      height = Math.max(1, Math.round(rect.height * dpr));
      surface.width = width;
      surface.height = height;
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(surface);
    const tick = (now: number) => {
      if (!initialized) {
        initialized = true;
        setSound(savedSound);
        setFullSupported(Boolean(document.fullscreenEnabled));
      }
      const s = engine.current;
      const dt = previous ? Math.min((now - previous) / 1000, 0.05) : 0;
      previous = now;
      accumulator += dt;
      while (accumulator >= PHYSICS.dt) {
        const before = s.phase,
          hp = s.health.cat + s.health.dog;
        const previousEffects = s.effects;
        advance(s, PHYSICS.dt);
        accumulator -= PHYSICS.dt;
        if (s.phase !== before) {
          if (s.phase === "charging") startChargeSound();
          if (before === "charging") stopChargeSound();
          if (s.phase === "flying") {
            playGameSound("release");
            playGameSound("whoosh");
          }
          if (s.phase === "gameOver")
            playGameSound(
              s.mode === "solo" && s.winner === "dog" ? "defeat" : "victory",
            );
          if (
            s.phase === "impact" &&
            s.effects.length &&
            !s.effects.some((e) => e.impact.target)
          )
            playGameSound("laugh");
        }
        if (s.health.cat + s.health.dog > hp) playGameSound("heal");
        for (const effect of s.effects) {
          if (previousEffects.includes(effect)) continue;
          playGameSound(
            effect.impact.target
              ? "hit"
              : effect.impact.kind === "wall"
                ? "wall"
                : "ground",
          );
          if (effect.impact.target) playGameSound(effect.impact.target);
        }
      }
      if (s.phase === "charging" && !s.paused) updateChargeSound(s.power);
      context.setTransform(
        width / ARENA.width,
        0,
        0,
        height / ARENA.height,
        0,
        0,
      );
      if (s.phase !== "menu")
        renderer.draw(
          context,
          s,
          reduced.matches,
          lowPower,
          s.paused ? 0 : accumulator,
          dt,
        );
      if (meter.current)
        meter.current.style.transform = `scaleX(${s.power / 100})`;
      if (powerText.current)
        powerText.current.value = `${Math.round(s.power)}%`;
      const level =
        s.power >= 99
          ? "MAX!"
          : s.power >= 70
            ? "STRONG"
            : s.power >= 30
              ? "GOOD"
              : "LOW";
      if (chargeLabel.current)
        chargeLabel.current.textContent =
          s.phase === "charging" ? level : "POWER";
      if (
        throwLabel.current &&
        s.phase === "charging" &&
        (s.mode === "local" || s.turn === "cat")
      )
        throwLabel.current.textContent =
          s.power >= 99
            ? "MAX POWER!"
            : s.power >= 70
              ? "STRONG! RELEASE"
              : "HOLDING…";
      powerMeter.current?.style.setProperty(
        "--charge-color",
        s.power >= 90
          ? "#e57255"
          : s.power >= 70
            ? "#f1a24d"
            : s.power >= 30
              ? "#ffd366"
              : "#69bac5",
      );
      powerMeter.current?.setAttribute(
        "aria-valuenow",
        String(Math.round(s.power)),
      );
      const next = [
        s.phase,
        s.turnIndex,
        s.paused,
        s.health.cat,
        s.health.dog,
        s.message,
        s.selected,
        s.signatureSelected,
      ].join("|");
      if (signature !== next) {
        signature = next;
        setView(copyState(s));
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    const suspend = () => {
      const s = engine.current;
      cancelCharge(s);
      stopGameSounds();
      activePointer.current = null;
      keyboardCharge.current = false;
      if (s.phase !== "menu" && s.phase !== "gameOver") s.paused = true;
      previous = 0;
      accumulator = 0;
      setView(copyState(s));
    };
    const visibility = () => {
      if (document.hidden) suspend();
    };
    const down = (event: KeyboardEvent) => {
      if (event.code === "Escape") {
        if (!engine.current.paused) {
          togglePause(engine.current);
          stopGameSounds();
          setView(copyState(engine.current));
        }
        return;
      }
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.matches("input, select, textarea, button:not(.throw-button)") ||
          target.closest("dialog"))
      )
        return;
      if (
        event.code === "Space" &&
        !event.repeat &&
        activePointer.current === null
      ) {
        event.preventDefault();
        if (startCharge(engine.current)) {
          keyboardCharge.current = true;
          startChargeSound();
          setView(copyState(engine.current));
        }
      }
    };
    const up = (event: KeyboardEvent) => {
      if (event.code === "Space" && keyboardCharge.current) {
        event.preventDefault();
        keyboardCharge.current = false;
        releaseCharge(engine.current);
        stopChargeSound();
        setView(copyState(engine.current));
      }
    };
    window.addEventListener("blur", suspend);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      stopGameSounds();
      window.removeEventListener("blur", suspend);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  const save = (difficulty: Difficulty, enabled: boolean) => {
    try {
      localStorage.setItem(
        "backyard-settings-v3",
        JSON.stringify({ difficulty, sound: enabled }),
      );
    } catch {
      /* Optional settings only. */
    }
  };
  const begin = () => {
    engine.current = createMatch(
      setup.mode,
      setup.difficulty,
      crypto.getRandomValues(new Uint32Array(1))[0],
      setup,
    );
    startMatch(engine.current);
    playGameSound("ui");
    setStep("home");
    publish();
  };
  const menu = () => {
    stopGameSounds();
    activePointer.current = null;
    keyboardCharge.current = false;
    engine.current = createMatch(
      engine.current.mode,
      engine.current.difficulty,
    );
    setStep("home");
    publish();
  };
  const pointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (
      !event.isPrimary ||
      event.button !== 0 ||
      activePointer.current !== null ||
      keyboardCharge.current
    )
      return;
    if (startCharge(engine.current)) {
      event.preventDefault();
      activePointer.current = event.pointerId;
      event.currentTarget.setPointerCapture(event.pointerId);
      startChargeSound();
      publish();
    }
  };
  const pointerEnd = (
    event: ReactPointerEvent<HTMLElement>,
    cancelled = false,
  ) => {
    if (activePointer.current !== event.pointerId) return;
    activePointer.current = null;
    if (cancelled) cancelCharge(engine.current);
    else releaseCharge(engine.current);
    stopChargeSound();
    publish();
  };
  const toggleSound = () => {
    const next = !sound;
    setSound(next);
    setSoundEnabled(next);
    save(engine.current.difficulty, next);
    if (next) playGameSound("ui");
  };
  const fullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      setError(
        "Fullscreen is unavailable here. You can keep playing in this window.",
      );
    }
  };
  const isMenu = view.phase === "menu";
  const updateSetup = (value: MatchSetup) => {
    setSetup(value);
    playGameSound("ui");
    if (value.loadout.length === 3)
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(value));
      } catch {
        /* Optional settings. */
      }
  };
  return (
    <main className={`arcade ${isMenu ? "is-menu" : "is-match"}`}>
      <header className="game-toolbar">
        <span className="small-brand">
          CATS <b>vs</b> DOGS <small>BACKYARD RUMBLE</small>
        </span>
        <div>
          <button
            type="button"
            onClick={toggleSound}
            aria-pressed={sound}
            aria-label={`Sound ${sound ? "on" : "off"}`}
          >
            <GameIcon name={sound ? "sound" : "mute"} />
          </button>
          {fullSupported && (
            <button
              type="button"
              onClick={() => void fullscreen()}
              aria-label="Toggle fullscreen"
            >
              <GameIcon name="fullscreen" />
            </button>
          )}
          {!isMenu && (
            <button
              type="button"
              onClick={() => {
                togglePause(engine.current);
                stopGameSounds();
                publish();
              }}
              aria-label="Pause game"
            >
              <GameIcon name="pause" />
            </button>
          )}
        </div>
      </header>
      {isMenu && (
        <SetupFlow
          setup={setup}
          step={step}
          onStep={(value) => {
            setStep(value);
            playGameSound("ui");
          }}
          onChange={updateSetup}
          onStart={begin}
          onTutorial={() => setTutorial(true)}
        />
      )}
      <div className="battle-frame" hidden={isMenu}>
        <BattleHUD state={view} />
        <div className="playfield">
          <canvas
            ref={canvas}
            width={1000}
            height={640}
            aria-label={`${characterFor("cat", view.setup.fighters).name} left, ${characterFor("dog", view.setup.fighters).name} right. Hold Space or touch to charge and release to throw.`}
            onPointerDown={pointerDown}
            onPointerUp={(e) => pointerEnd(e)}
            onPointerCancel={(e) => pointerEnd(e, true)}
            onLostPointerCapture={(e) => pointerEnd(e, true)}
            onContextMenu={(e) => e.preventDefault()}
          >
            Your browser needs Canvas support.
          </canvas>
          {view.phase === "starting" && (
            <div className="round-intro">
              ROUND 1<small>Cat throws first</small>
            </div>
          )}
        </div>
        <BattleControls
          state={view}
          onItem={(item) => {
            if (selectItem(engine.current, item))
              playGameSound(item === "heal" ? "heal" : "ui");
            publish();
          }}
          onSignature={() => {
            if (selectSignature(engine.current)) playGameSound("ui");
            publish();
          }}
          onAngle={(angle) => {
            setAngle(engine.current, angle);
            publish();
          }}
          onDown={pointerDown}
          onEnd={pointerEnd}
          meter={meter}
          powerText={powerText}
          powerMeter={powerMeter}
          chargeLabel={chargeLabel}
          throwLabel={throwLabel}
        />
      </div>
      {error && (
        <p role="alert" className="error-note">
          {error}
          <button type="button" onClick={() => setError("")}>
            Dismiss
          </button>
        </p>
      )}
      {tutorial && (
        <Modal
          title="A little backyard etiquette"
          onClose={() => setTutorial(false)}
        >
          <ol>
            <li>
              <strong>Hold</strong> the arena, throw button, or Space to charge.
            </li>
            <li>
              <strong>Release</strong> to throw. Power stops at 100%.
            </li>
            <li>
              <strong>Watch the wind.</strong> Arrows show where it pushes.
            </li>
            <li>
              <strong>Hit your rival.</strong> First to zero HP loses.
            </li>
          </ol>
          <p>
            Angle changes your arc. Items are one use each; a snack uses your
            turn.
          </p>
          <button
            className="primary"
            type="button"
            onClick={() => {
              try {
                localStorage.setItem("backyard-tutorial-seen", "true");
              } catch {
                /* Optional. */
              }
              setTutorial(false);
            }}
          >
            GOT IT
          </button>
        </Modal>
      )}
      {view.paused && (
        <Modal
          title="Taking a breather?"
          onClose={() => {
            engine.current.paused = false;
            publish();
          }}
        >
          <p>Your throw is right where you left it.</p>
          <button
            className="primary"
            type="button"
            onClick={() => {
              engine.current.paused = false;
              publish();
            }}
          >
            RESUME
          </button>
          <button type="button" onClick={menu}>
            Main menu
          </button>
        </Modal>
      )}
      {view.phase === "gameOver" && (
        <Modal title="Backyard champion" onClose={menu}>
          <MatchResult
            state={view}
            onRematch={begin}
            onChange={() => {
              menu();
              setStep("fighters");
            }}
            onMenu={menu}
          />
        </Modal>
      )}
    </main>
  );
}
