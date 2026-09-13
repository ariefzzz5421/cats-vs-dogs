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
  canControl,
  createMatch,
  releaseCharge,
  selectItem,
  setAngle,
  startCharge,
  startMatch,
  togglePause,
} from "@/lib/game/engine";
import { ARENA, ITEMS, NAMES, PHYSICS } from "@/lib/game/constants";
import { GameRenderer } from "@/lib/game/renderer";
import {
  playGameSound,
  setSoundEnabled,
  startChargeSound,
  stopChargeSound,
} from "@/lib/game/audio";
import type { Difficulty, GameMode, MatchState, Item } from "@/lib/game/types";

const copyState = (s: MatchState): MatchState => ({
  ...s,
  health: { ...s.health },
  stock: { cat: { ...s.stock.cat }, dog: { ...s.stock.dog } },
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
  const meter = useRef<HTMLDivElement>(null);
  const powerText = useRef<HTMLOutputElement>(null);
  const powerMeter = useRef<HTMLDivElement>(null);
  const [view, setView] = useState(() => createMatch());
  const [setup, setSetup] = useState(false);
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
      const saved = JSON.parse(
        localStorage.getItem("backyard-settings-v3") ?? "{}",
      );
      if (["easy", "normal", "hard"].includes(saved.difficulty))
        engine.current.difficulty = saved.difficulty;
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
            !s.effects.some((e) => e.impact.kind === "target")
          )
            playGameSound("laugh");
        }
        if (s.health.cat + s.health.dog < hp) playGameSound("hit");
        else if (s.effects.some((e) => e.age === 0))
          playGameSound(
            s.effects.at(-1)?.impact.kind === "wall" ? "wall" : "ground",
          );
      }
      context.setTransform(
        width / ARENA.width,
        0,
        0,
        height / ARENA.height,
        0,
        0,
      );
      renderer.draw(context, s, reduced.matches, lowPower);
      if (meter.current)
        meter.current.style.transform = `scaleX(${s.power / 100})`;
      if (powerText.current)
        powerText.current.value = `${Math.round(s.power)}%`;
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
      stopChargeSound();
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
          stopChargeSound();
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
      stopChargeSound();
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
    const current = engine.current;
    engine.current = createMatch(
      current.mode,
      current.difficulty,
      crypto.getRandomValues(new Uint32Array(1))[0],
    );
    startMatch(engine.current);
    playGameSound("ui");
    setSetup(false);
    publish();
  };
  const menu = () => {
    stopChargeSound();
    activePointer.current = null;
    keyboardCharge.current = false;
    engine.current = createMatch(
      engine.current.mode,
      engine.current.difficulty,
    );
    setSetup(false);
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
  const isMenu = view.phase === "menu",
    controlled = canControl(view),
    charging = view.phase === "charging";

  return (
    <main className={`rumble ${isMenu ? "is-menu" : "is-match"}`}>
      <header className="game-toolbar">
        <span className="small-brand">
          CATS <b>vs</b> DOGS
        </span>
        <div>
          <button type="button" onClick={toggleSound} aria-pressed={sound}>
            Sound {sound ? "on" : "off"}
          </button>
          {fullSupported && (
            <button
              type="button"
              onClick={() => void fullscreen()}
              aria-label="Toggle fullscreen"
            >
              ⛶
            </button>
          )}
          {!isMenu && (
            <button
              type="button"
              onClick={() => {
                togglePause(engine.current);
                stopChargeSound();
                publish();
              }}
              aria-label="Pause game"
            >
              Ⅱ
            </button>
          )}
        </div>
      </header>
      {isMenu ? (
        <div className="title-block">
          <h1>
            <span>CATS</span> <small>VS</small> <span>DOGS</span>
          </h1>
          <p>BACKYARD RUMBLE</p>
        </div>
      ) : (
        <section className="health-row" aria-label="Match health and wind">
          {(["cat", "dog"] as const).map((side) => (
            <div key={side} className={`health health-${side}`}>
              <div>
                <strong>{NAMES[side]}</strong>
                <span>
                  {view.health[side]} <small>HP</small>
                </span>
              </div>
              <div
                className="health-track"
                role="meter"
                aria-label={`${NAMES[side]} health`}
                aria-valuenow={view.health[side]}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <i
                  style={{ transform: `scaleX(${view.health[side] / 100})` }}
                />
              </div>
            </div>
          ))}
          <div className="wind">
            <small>WIND</small>
            <strong
              aria-label={`Wind ${Math.abs(view.wind)} out of 10 ${view.wind < 0 ? "left" : view.wind > 0 ? "right" : "calm"}`}
            >
              {view.wind < 0 ? "←" : view.wind > 0 ? "→" : "—"}{" "}
              {Math.abs(view.wind).toFixed(1)}
            </strong>
          </div>
        </section>
      )}
      <div className="playfield">
        <canvas
          ref={canvas}
          width={1000}
          height={560}
          aria-label="Backyard arena. Blaze the cat is left, Major Bark the dog is right. Hold the throw button or Space to charge, release to throw."
          onPointerDown={pointerDown}
          onPointerUp={(e) => pointerEnd(e)}
          onPointerCancel={(e) => pointerEnd(e, true)}
          onLostPointerCapture={(e) => pointerEnd(e, true)}
          onContextMenu={(e) => e.preventDefault()}
        >
          Your browser needs Canvas support to play this game.
        </canvas>
        {isMenu && (
          <div className="menu-overlay">
            {!setup ? (
              <>
                <p className="menu-tagline">
                  Good neighbors.
                  <br />
                  <strong>Terrible aim.</strong>
                </p>
                <button
                  className="primary play"
                  type="button"
                  onClick={() => {
                    setSetup(true);
                    playGameSound("ui");
                  }}
                >
                  PLAY <span aria-hidden="true">▶︎</span>
                </button>
                <button
                  className="text-button"
                  type="button"
                  onClick={() => setTutorial(true)}
                >
                  How to play
                </button>
              </>
            ) : (
              <div className="setup">
                <h2>Who’s throwing?</h2>
                <div className="mode-row">
                  {(["solo", "local"] as GameMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      aria-pressed={view.mode === mode}
                      onClick={() => {
                        engine.current.mode = mode;
                        publish();
                        playGameSound("ui");
                      }}
                    >
                      {mode === "solo" ? "VS COMPUTER" : "2 PLAYERS"}
                    </button>
                  ))}
                </div>
                {view.mode === "solo" ? (
                  <div className="difficulty" aria-label="Difficulty">
                    {(["easy", "normal", "hard"] as Difficulty[]).map((d) => (
                      <button
                        key={d}
                        type="button"
                        aria-pressed={view.difficulty === d}
                        onClick={() => {
                          engine.current.difficulty = d;
                          save(d, sound);
                          publish();
                        }}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p>One device. Cat first, then Dog.</p>
                )}
                <button className="primary" type="button" onClick={begin}>
                  LET’S RUMBLE <span aria-hidden="true">→</span>
                </button>
                <button
                  className="text-button"
                  type="button"
                  onClick={() => setSetup(false)}
                >
                  Back
                </button>
              </div>
            )}
          </div>
        )}
        {!isMenu && view.phase === "starting" && (
          <div className="round-intro">
            READY?<small>Cat throws first</small>
          </div>
        )}
      </div>
      {isMenu ? (
        <p className="menu-hint">
          Hold to charge · Release to throw · Watch the wind
        </p>
      ) : (
        <section
          className={`controls team-${view.turn}`}
          aria-label="Throw controls"
        >
          <div className="turn-status" role="status">
            <strong>
              {view.turn === "cat" ? "CAT" : "DOG"} TURN{" "}
              <span>#{view.turnIndex + 1}</span>
            </strong>
            <span>{view.message}</span>
          </div>
          <div className="item-row" aria-label="One-use items">
            {(Object.keys(ITEMS) as Item[]).map((item) => (
              <button
                type="button"
                key={item}
                title={ITEMS[item].description}
                aria-label={`${ITEMS[item].name}. ${ITEMS[item].description}`}
                aria-pressed={view.selected === item}
                disabled={
                  !controlled ||
                  charging ||
                  !view.stock[view.turn][item] ||
                  (item === "heal" && view.health[view.turn] === 100)
                }
                onClick={() => {
                  selectItem(engine.current, item);
                  playGameSound("ui");
                  publish();
                }}
              >
                <b aria-hidden="true">{ITEMS[item].symbol}</b>
                <span>{ITEMS[item].name}</span>
                <small>{view.stock[view.turn][item]}</small>
              </button>
            ))}
          </div>
          <label className="aim-control">
            Angle <output>{Math.round(view.angle)}°</output>
            <input
              type="range"
              min={20}
              max={78}
              value={view.angle}
              disabled={!controlled || charging}
              onChange={(e) => {
                setAngle(engine.current, Number(e.target.value));
                publish();
              }}
            />
          </label>
          <div className="power-control">
            <span>
              Power{" "}
              <output ref={powerText} aria-live="off">
                {Math.round(view.power)}%
              </output>
            </span>
            <div
              className="power-track"
              ref={powerMeter}
              role="meter"
              aria-label="Throw power"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(view.power)}
            >
              <i ref={meter} />
            </div>
          </div>
          <button
            className="primary throw-button"
            type="button"
            disabled={!controlled}
            onPointerDown={pointerDown}
            onPointerUp={(e) => pointerEnd(e)}
            onPointerCancel={(e) => pointerEnd(e, true)}
            onLostPointerCapture={(e) => pointerEnd(e, true)}
            onContextMenu={(e) => e.preventDefault()}
          >
            <strong>
              {controlled
                ? charging
                  ? "RELEASE!"
                  : "HOLD TO THROW"
                : "WATCH THE THROW"}
            </strong>
            <small>Space / touch & hold</small>
          </button>
          <p className="rotate-hint">Landscape gives your throws more room.</p>
          {view.selected && (
            <p className="item-description">
              {ITEMS[view.selected].description}
            </p>
          )}
        </section>
      )}
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
        <Modal
          title={`${view.winner ? NAMES[view.winner] : "Nobody"} wins!`}
          onClose={menu}
        >
          <p>The yard is yours. For now.</p>
          <button className="primary" type="button" onClick={begin}>
            REMATCH
          </button>
          <button type="button" onClick={menu}>
            Main menu
          </button>
        </Modal>
      )}
    </main>
  );
}
