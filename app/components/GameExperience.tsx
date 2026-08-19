"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Side = "cat" | "dog";
type GameMode = "bot" | "local";
type Difficulty = "easy" | "medium" | "hard" | "expert";
type Screen = "menu" | "battle";
type CatHeroId = "blaze" | "luna" | "shadow";
type DogHeroId = "major" | "bruno" | "snow";
type HeroId = CatHeroId | DogHeroId;

type Hero<T extends HeroId> = {
  id: T;
  name: string;
  role: string;
  trait: string;
  fur: string;
  accent: string;
};

type ProjectileState = {
  side: Side;
  x: number;
  y: number;
  rotation: number;
};

type ShotResult = {
  hit: boolean;
  damage: number;
  reason: "hit" | "wall" | "ground" | "out";
};

const catHeroes: Hero<CatHeroId>[] = [
  { id: "blaze", name: "Blaze", role: "Tabby striker", trait: "Fearless", fur: "#f28b2d", accent: "#1677ff" },
  { id: "luna", name: "Luna", role: "Moon tactician", trait: "Focused", fur: "#c9c8d7", accent: "#8b5cf6" },
  { id: "shadow", name: "Shadow", role: "Night trickster", trait: "Sneaky", fur: "#30364b", accent: "#ef3b76" },
];

const dogHeroes: Hero<DogHeroId>[] = [
  { id: "major", name: "Major Bark", role: "Yard captain", trait: "Brave", fur: "#a85b32", accent: "#e53935" },
  { id: "bruno", name: "Bruno", role: "Power bruiser", trait: "Sturdy", fur: "#c79a66", accent: "#f59e0b" },
  { id: "snow", name: "Snow", role: "Quick terrier", trait: "Playful", fur: "#ece8df", accent: "#19a974" },
];

const difficultyCopy: Record<Difficulty, { label: string; hint: string; spread: number }> = {
  easy: { label: "Easy", hint: "Bot sering meleset", spread: 16 },
  medium: { label: "Medium", hint: "Bot cukup konsisten", spread: 9 },
  hard: { label: "Hard", hint: "Bot membaca angin", spread: 4 },
  expert: { label: "Expert", hint: "Nyaris tidak memberi ruang", spread: 1.5 },
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const randomWind = () => Math.round((Math.random() * 16 - 8) * 10) / 10;
const otherSide = (side: Side): Side => (side === "cat" ? "dog" : "cat");

function getHero<T extends HeroId>(heroes: Hero<T>[], id: T) {
  return heroes.find((hero) => hero.id === id) ?? heroes[0];
}

function FighterArt({ side, hero, hit = false, compact = false }: { side: Side; hero: Hero<HeroId>; hit?: boolean; compact?: boolean }) {
  const isCat = side === "cat";
  return (
    <svg
      className={`fighter-art fighter-art--${side}${hit ? " is-hit" : ""}${compact ? " is-compact" : ""}`}
      viewBox="0 0 220 200"
      role="img"
      aria-label={`${hero.name}, ${hero.role}`}
    >
      <ellipse cx="110" cy="181" rx="68" ry="10" fill="rgba(19,25,38,.18)" />
      {isCat ? (
        <>
          <path d="M60 132C20 125 27 91 53 100C72 106 68 130 48 132" fill="none" stroke={hero.fur} strokeWidth="17" strokeLinecap="round" />
          <ellipse cx="111" cy="132" rx="54" ry="45" fill={hero.fur} stroke="#2d2431" strokeWidth="5" />
          <circle cx="111" cy="80" r="48" fill={hero.fur} stroke="#2d2431" strokeWidth="5" />
          <path d="M72 49L79 12L103 42Z" fill={hero.fur} stroke="#2d2431" strokeWidth="5" strokeLinejoin="round" />
          <path d="M150 49L143 12L119 42Z" fill={hero.fur} stroke="#2d2431" strokeWidth="5" strokeLinejoin="round" />
          <path d="M80 40L83 24L94 42Z" fill="#f7a3ad" />
          <path d="M142 40L139 24L128 42Z" fill="#f7a3ad" />
          <ellipse cx="94" cy="76" rx="10" ry="13" fill="#fff" stroke="#2d2431" strokeWidth="4" />
          <ellipse cx="130" cy="76" rx="10" ry="13" fill="#fff" stroke="#2d2431" strokeWidth="4" />
          <circle cx="98" cy="79" r="4.5" fill="#152033" />
          <circle cx="126" cy="79" r="4.5" fill="#152033" />
          <path d="M105 94Q111 100 117 94Q112 87 105 94Z" fill="#5b2938" />
          <path d="M94 108Q111 121 128 108" fill="none" stroke="#2d2431" strokeWidth="4" strokeLinecap="round" />
          <path d="M80 95L45 89M81 104L43 106M142 95L177 89M141 104L179 106" stroke="#2d2431" strokeWidth="3" strokeLinecap="round" />
          <path d="M69 131Q48 140 43 157" fill="none" stroke={hero.fur} strokeWidth="19" strokeLinecap="round" />
          <path d="M152 128Q176 130 186 145" fill="none" stroke={hero.fur} strokeWidth="19" strokeLinecap="round" />
          <path d="M78 160L68 180M142 160L151 180" stroke={hero.fur} strokeWidth="22" strokeLinecap="round" />
          <path d="M69 50Q111 25 153 50" fill="none" stroke={hero.accent} strokeWidth="10" strokeLinecap="round" />
          {hero.id === "blaze" && <path d="M147 48L183 36L163 58L187 67L150 67Z" fill={hero.accent} stroke="#2d2431" strokeWidth="3" />}
          {hero.id === "luna" && <path d="M112 31A14 14 0 1 0 127 47A11 11 0 1 1 112 31Z" fill="#fff3a5" stroke="#2d2431" strokeWidth="3" />}
          {hero.id === "shadow" && <path d="M73 69Q111 45 149 69L143 87Q111 73 79 87Z" fill="#171827" opacity=".92" />}
        </>
      ) : (
        <>
          <ellipse cx="111" cy="136" rx="58" ry="43" fill={hero.fur} stroke="#2d2431" strokeWidth="5" />
          <circle cx="111" cy="82" r="49" fill={hero.fur} stroke="#2d2431" strokeWidth="5" />
          <path d="M70 62Q34 41 38 83Q46 108 76 92Z" fill={hero.fur} stroke="#2d2431" strokeWidth="5" />
          <path d="M152 62Q188 41 184 83Q176 108 146 92Z" fill={hero.fur} stroke="#2d2431" strokeWidth="5" />
          <ellipse cx="94" cy="77" rx="10" ry="12" fill="#fff" stroke="#2d2431" strokeWidth="4" />
          <ellipse cx="130" cy="77" rx="10" ry="12" fill="#fff" stroke="#2d2431" strokeWidth="4" />
          <circle cx="98" cy="80" r="4.5" fill="#152033" />
          <circle cx="126" cy="80" r="4.5" fill="#152033" />
          <ellipse cx="111" cy="104" rx="30" ry="24" fill="#e9c49f" stroke="#2d2431" strokeWidth="4" />
          <path d="M101 98Q111 90 121 98Q116 108 106 108Z" fill="#27242b" />
          <path d="M94 116Q111 126 129 116" fill="none" stroke="#2d2431" strokeWidth="4" strokeLinecap="round" />
          <path d="M59 132Q36 140 32 158" fill="none" stroke={hero.fur} strokeWidth="20" strokeLinecap="round" />
          <path d="M162 131Q188 136 190 153" fill="none" stroke={hero.fur} strokeWidth="20" strokeLinecap="round" />
          <path d="M78 161L67 181M144 161L154 181" stroke={hero.fur} strokeWidth="23" strokeLinecap="round" />
          <path d="M69 121Q111 139 153 121" fill="none" stroke={hero.accent} strokeWidth="11" strokeLinecap="round" />
          <circle cx="111" cy="132" r="8" fill="#ffd54a" stroke="#2d2431" strokeWidth="3" />
          {hero.id === "major" && <path d="M75 43Q111 17 148 44L139 56H82Z" fill={hero.accent} stroke="#2d2431" strokeWidth="4" />}
          {hero.id === "bruno" && <path d="M76 48L84 32M146 48L138 32" stroke="#fff2ca" strokeWidth="8" strokeLinecap="round" />}
          {hero.id === "snow" && <path d="M79 49Q111 35 143 49" fill="none" stroke={hero.accent} strokeWidth="9" strokeLinecap="round" />}
        </>
      )}
    </svg>
  );
}

function ProjectileIcon({ side }: { side: Side }) {
  if (side === "cat") {
    return (
      <svg viewBox="0 0 64 40" aria-hidden="true">
        <path d="M8 20C18 4 43 4 55 20C43 36 18 36 8 20Z" fill="#52c9ff" stroke="#143151" strokeWidth="4" />
        <path d="M9 20L1 8V32Z" fill="#ffcf48" stroke="#143151" strokeWidth="4" strokeLinejoin="round" />
        <circle cx="43" cy="16" r="3" fill="#143151" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 64 40" aria-hidden="true">
      <path d="M16 14C6 4 0 10 7 20C0 30 6 36 16 26H48C58 36 64 30 57 20C64 10 58 4 48 14Z" fill="#fff1c7" stroke="#6c4528" strokeWidth="4" />
    </svg>
  );
}

function HealthBar<T extends HeroId>({ side, value, hero }: { side: Side; value: number; hero: Hero<T> }) {
  return (
    <div className={`health-card health-card--${side}`}>
      <span className="health-card__portrait"><FighterArt side={side} hero={hero} compact /></span>
      <div className="health-card__copy">
        <div><strong>{hero.name}</strong><span>{side === "cat" ? "CAT" : "DOG"}</span></div>
        <div className="health-track" aria-label={`${hero.name} HP: ${value} dari 100`}><span style={{ width: `${value}%` }} /></div>
      </div>
      <b>{value}<small>HP</small></b>
    </div>
  );
}

function HeroCard<T extends HeroId>({ hero, side, selected, onSelect }: { hero: Hero<T>; side: Side; selected: boolean; onSelect: () => void }) {
  return (
    <button className={`hero-card hero-card--${side}${selected ? " is-selected" : ""}`} type="button" aria-pressed={selected} onClick={onSelect}>
      <span className="hero-card__portrait"><FighterArt side={side} hero={hero} compact /></span>
      <span><strong>{hero.name}</strong><small>{hero.trait}</small></span>
      <em>{selected ? "READY" : "SELECT"}</em>
    </button>
  );
}

function trajectoryAt(side: Side, angle: number, power: number, wind: number, t: number) {
  const direction = side === "cat" ? 1 : -1;
  const radians = (angle * Math.PI) / 180;
  const speed = 28 + power * 0.62;
  const vx = direction * Math.cos(radians) * speed + wind * 0.32;
  const vy = -Math.sin(radians) * speed;
  const x = (side === "cat" ? 16 : 84) + vx * t;
  const y = 69 + vy * t + 21 * t * t;
  return { x, y };
}

function evaluatePoint(side: Side, x: number, y: number, power: number): ShotResult | null {
  const targetX = side === "cat" ? 84 : 16;
  const targetSide = otherSide(side);
  const insideWall = x >= 47 && x <= 53 && y >= 48;
  if (insideWall) return { hit: false, damage: 0, reason: "wall" };

  if (Math.abs(x - targetX) <= 5.3 && y >= 49 && y <= 73) {
    const damage = clamp(Math.round(18 + power * 0.17), 20, 36);
    void targetSide;
    return { hit: true, damage, reason: "hit" };
  }

  if (x < -8 || x > 108) return { hit: false, damage: 0, reason: "out" };
  if (y >= 72.5) return { hit: false, damage: 0, reason: "ground" };
  return null;
}

function predictShot(side: Side, angle: number, power: number, wind: number) {
  let last = side === "cat" ? 16 : 84;
  for (let t = 0.04; t < 4; t += 0.04) {
    const point = trajectoryAt(side, angle, power, wind, t);
    last = point.x;
    const result = evaluatePoint(side, point.x, point.y, power);
    if (result) return { x: point.x, result };
  }
  return { x: last, result: { hit: false, damage: 0, reason: "out" } as ShotResult };
}

function findBotAim(wind: number, difficulty: Difficulty) {
  let best = { angle: 56, power: 55, score: Number.POSITIVE_INFINITY };
  for (let angle = 38; angle <= 72; angle += 2) {
    for (let power = 22; power <= 92; power += 2) {
      const prediction = predictShot("dog", angle, power, wind);
      const score = prediction.result.hit ? -100 : Math.abs(prediction.x - 16) + (prediction.result.reason === "wall" ? 18 : 0);
      if (score < best.score) best = { angle, power, score };
    }
  }
  const spread = difficultyCopy[difficulty].spread;
  return {
    angle: clamp(Math.round(best.angle + (Math.random() - 0.5) * spread), 25, 78),
    power: clamp(Math.round(best.power + (Math.random() - 0.5) * spread * 1.4), 12, 100),
  };
}

export function GameExperience() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [mode, setMode] = useState<GameMode>("bot");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [catHero, setCatHero] = useState<CatHeroId>("blaze");
  const [dogHero, setDogHero] = useState<DogHeroId>("major");
  const [health, setHealth] = useState({ cat: 100, dog: 100 });
  const [turn, setTurn] = useState<Side>("cat");
  const [angle, setAngle] = useState(52);
  const [power, setPower] = useState(0);
  const [charging, setCharging] = useState(false);
  const [wind, setWind] = useState(randomWind);
  const [projectile, setProjectile] = useState<ProjectileState | null>(null);
  const [shotActive, setShotActive] = useState(false);
  const [hitSide, setHitSide] = useState<Side | null>(null);
  const [winner, setWinner] = useState<Side | null>(null);
  const [status, setStatus] = useState("Pilih fighter lalu mulai duel.");

  const healthRef = useRef(health);
  const powerRef = useRef(power);
  const chargingRef = useRef(false);
  const chargeDirection = useRef(1);
  const chargeFrame = useRef<number | null>(null);
  const shotFrame = useRef<number | null>(null);

  const selectedCat = useMemo(() => getHero(catHeroes, catHero), [catHero]);
  const selectedDog = useMemo(() => getHero(dogHeroes, dogHero), [dogHero]);

  useEffect(() => { healthRef.current = health; }, [health]);
  useEffect(() => { powerRef.current = power; }, [power]);

  useEffect(() => () => {
    if (chargeFrame.current) cancelAnimationFrame(chargeFrame.current);
    if (shotFrame.current) cancelAnimationFrame(shotFrame.current);
  }, []);

  const stopCharging = useCallback(() => {
    chargingRef.current = false;
    setCharging(false);
    if (chargeFrame.current) cancelAnimationFrame(chargeFrame.current);
    chargeFrame.current = null;
  }, []);

  const resetMatch = useCallback((nextMode: GameMode = mode) => {
    stopCharging();
    if (shotFrame.current) cancelAnimationFrame(shotFrame.current);
    const fresh = { cat: 100, dog: 100 };
    healthRef.current = fresh;
    setHealth(fresh);
    setWinner(null);
    setProjectile(null);
    setShotActive(false);
    setHitSide(null);
    setTurn("cat");
    setPower(0);
    powerRef.current = 0;
    setAngle(52);
    setWind(randomWind());
    setMode(nextMode);
    setScreen("battle");
    setStatus("Cat starts. Aim, hold POWER, release to throw.");
  }, [mode, stopCharging]);

  const animateShot = useCallback((side: Side, shotAngle: number, shotPower: number, shotWind: number) => {
    return new Promise<ShotResult>((resolve) => {
      const started = performance.now();
      let finished = false;

      const end = (result: ShotResult) => {
        if (finished) return;
        finished = true;
        setProjectile(null);
        shotFrame.current = null;
        resolve(result);
      };

      const frame = (now: number) => {
        const elapsed = Math.min(4, ((now - started) / 1000) * 1.35);
        const point = trajectoryAt(side, shotAngle, shotPower, shotWind, elapsed);
        setProjectile({ side, x: point.x, y: point.y, rotation: elapsed * 420 * (side === "cat" ? 1 : -1) });
        const result = evaluatePoint(side, point.x, point.y, shotPower);
        if (result) return end(result);
        shotFrame.current = requestAnimationFrame(frame);
      };

      shotFrame.current = requestAnimationFrame(frame);
    });
  }, []);

  const fireShot = useCallback(async (side: Side, shotPower: number, shotAngle: number) => {
    if (shotActive || winner) return;
    stopCharging();
    setShotActive(true);
    setStatus(`${side === "cat" ? "Cat" : "Dog"} throws ${side === "cat" ? "Fishbone Spinner" : "Golden Bone"}!`);

    const currentWind = wind;
    const result = await animateShot(side, shotAngle, shotPower, currentWind);
    const victim = otherSide(side);

    if (result.hit) {
      const current = healthRef.current;
      const next = { ...current, [victim]: Math.max(0, current[victim] - result.damage) };
      healthRef.current = next;
      setHealth(next);
      setHitSide(victim);
      window.setTimeout(() => setHitSide(null), 520);
      if (next[victim] <= 0) {
        setWinner(side);
        setStatus(`${side === "cat" ? selectedCat.name : selectedDog.name} wins the backyard!`);
        setShotActive(false);
        return;
      }
      setStatus(`Direct hit! ${result.damage} damage.`);
    } else if (result.reason === "wall") {
      setStatus("BONK! The shot smashed into the fence wall.");
    } else if (result.reason === "out") {
      setStatus("Way too much sauce. The projectile left the yard!");
    } else {
      setStatus("Missed. Adjust angle, power, and read the wind.");
    }

    await new Promise((resolve) => window.setTimeout(resolve, 650));
    const nextTurn = otherSide(side);
    setTurn(nextTurn);
    setPower(0);
    powerRef.current = 0;
    setWind(randomWind());
    setShotActive(false);
    setStatus(mode === "bot" && nextTurn === "dog" ? "Major Bark is calculating the throw…" : `${nextTurn === "cat" ? "Cat" : "Dog"}'s turn.`);
  }, [animateShot, mode, selectedCat.name, selectedDog.name, shotActive, stopCharging, wind, winner]);

  useEffect(() => {
    if (screen !== "battle" || mode !== "bot" || turn !== "dog" || shotActive || winner) return;
    const timer = window.setTimeout(() => {
      const aim = findBotAim(wind, difficulty);
      setAngle(aim.angle);
      setPower(aim.power);
      powerRef.current = aim.power;
      void fireShot("dog", aim.power, aim.angle);
    }, 850);
    return () => window.clearTimeout(timer);
  }, [difficulty, fireShot, mode, screen, shotActive, turn, wind, winner]);

  const canControl = screen === "battle" && !shotActive && !winner && (mode === "local" || turn === "cat");

  const startCharge = useCallback(() => {
    if (!canControl || chargingRef.current) return;
    chargingRef.current = true;
    setCharging(true);
    chargeDirection.current = powerRef.current >= 96 ? -1 : 1;
    let last = performance.now();

    const tick = (now: number) => {
      if (!chargingRef.current) return;
      const delta = now - last;
      last = now;
      setPower((current) => {
        let next = current + chargeDirection.current * delta * 0.095;
        if (next >= 100) { next = 100; chargeDirection.current = -1; }
        if (next <= 0) { next = 0; chargeDirection.current = 1; }
        powerRef.current = next;
        return next;
      });
      chargeFrame.current = requestAnimationFrame(tick);
    };
    chargeFrame.current = requestAnimationFrame(tick);
  }, [canControl]);

  const releaseCharge = useCallback(() => {
    if (!chargingRef.current || !canControl) return;
    const releasedPower = Math.max(12, Math.round(powerRef.current));
    stopCharging();
    void fireShot(turn, releasedPower, angle);
  }, [angle, canControl, fireShot, stopCharging, turn]);

  useEffect(() => {
    if (screen !== "battle") return;
    const down = (event: KeyboardEvent) => {
      if (event.code === "Space" && !event.repeat) {
        event.preventDefault();
        startCharge();
      }
    };
    const up = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        event.preventDefault();
        releaseCharge();
      }
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [releaseCharge, screen, startCharge]);

  if (screen === "menu") {
    return (
      <main className="game-shell menu-shell">
        <header className="brandbar">
          <div className="brandmark"><span>CAT</span><b>VS</b><span>DOG</span></div>
          <p>Backyard Rumble</p>
        </header>

        <section className="hero-banner">
          <div className="hero-banner__fighter hero-banner__fighter--cat"><FighterArt side="cat" hero={selectedCat} /></div>
          <div className="hero-banner__copy">
            <p>CLASSIC THROWING DUEL · REBUILT</p>
            <h1>Cats <span>vs</span> Dogs</h1>
            <strong>Aim. Charge. Throw. Trash-talk responsibly.</strong>
            <button className="play-now" type="button" onClick={() => resetMatch(mode)}>PLAY GAME</button>
          </div>
          <div className="hero-banner__fighter hero-banner__fighter--dog"><FighterArt side="dog" hero={selectedDog} /></div>
        </section>

        <section className="setup-grid">
          <div className="setup-panel">
            <div className="setup-panel__head"><span>01</span><div><small>CAT CREW</small><h2>Choose your cat</h2></div></div>
            <div className="hero-list">
              {catHeroes.map((hero) => <HeroCard key={hero.id} hero={hero} side="cat" selected={catHero === hero.id} onSelect={() => setCatHero(hero.id)} />)}
            </div>
            <div className="signature"><span>🐟</span><div><small>Signature throw</small><strong>Fishbone Spinner</strong></div></div>
          </div>

          <div className="setup-panel">
            <div className="setup-panel__head"><span>02</span><div><small>DOG CREW</small><h2>Choose your dog</h2></div></div>
            <div className="hero-list">
              {dogHeroes.map((hero) => <HeroCard key={hero.id} hero={hero} side="dog" selected={dogHero === hero.id} onSelect={() => setDogHero(hero.id)} />)}
            </div>
            <div className="signature signature--dog"><span>🦴</span><div><small>Signature throw</small><strong>Golden Bone</strong></div></div>
          </div>
        </section>

        <section className="mode-panel">
          <div><small>03 · GAME MODE</small><h2>Pick the chaos level</h2></div>
          <div className="mode-buttons">
            <button type="button" className={mode === "bot" ? "is-active" : ""} onClick={() => setMode("bot")}><strong>Vs Bot</strong><span>Quick solo match</span></button>
            <button type="button" className={mode === "local" ? "is-active" : ""} onClick={() => setMode("local")}><strong>Same Device</strong><span>Pass the controls</span></button>
            <button type="button" disabled title="Online mode will return after the core gameplay is stable"><strong>Online Room</strong><span>Rebuilding · soon</span></button>
          </div>
          {mode === "bot" && (
            <div className="difficulty-row">
              {(Object.keys(difficultyCopy) as Difficulty[]).map((item) => (
                <button key={item} type="button" className={difficulty === item ? "is-active" : ""} onClick={() => setDifficulty(item)}>
                  <strong>{difficultyCopy[item].label}</strong><span>{difficultyCopy[item].hint}</span>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="howto-strip">
          <div><b>1</b><span><strong>AIM</strong>Set the throw angle.</span></div>
          <div><b>2</b><span><strong>CHARGE</strong>Hold POWER. Release at the sweet spot.</span></div>
          <div><b>3</b><span><strong>READ WIND</strong>Wind changes after every throw.</span></div>
          <div><b>4</b><span><strong>KO</strong>Drop the rival from 100 HP to zero.</span></div>
        </section>
      </main>
    );
  }

  return (
    <main className="game-shell battle-shell">
      <header className="battle-topbar">
        <button className="icon-button" type="button" onClick={() => setScreen("menu")} aria-label="Back to menu">←</button>
        <HealthBar side="cat" value={health.cat} hero={selectedCat} />
        <div className="turn-chip"><small>TURN</small><strong>{turn === "cat" ? "CAT" : "DOG"}</strong></div>
        <HealthBar side="dog" value={health.dog} hero={selectedDog} />
        <button className="icon-button" type="button" onClick={() => resetMatch(mode)} aria-label="Restart match">↻</button>
      </header>

      <section className="battle-status" aria-live="polite">
        <div className="wind-chip"><span>{wind < 0 ? "←" : wind > 0 ? "→" : "·"}</span><strong>WIND {Math.abs(wind).toFixed(1)}</strong></div>
        <p>{status}</p>
        <div className="mode-chip">{mode === "bot" ? `BOT · ${difficultyCopy[difficulty].label}` : "LOCAL · 2P"}</div>
      </section>

      <section className="arena" aria-label="Backyard battle arena">
        <div className="sky-cloud sky-cloud--one" /><div className="sky-cloud sky-cloud--two" />
        <div className="sun" />
        <div className="far-house far-house--cat"><span>CAT</span></div>
        <div className="far-house far-house--dog"><span>DOG</span></div>
        <div className="fence" />
        <div className="bush bush--one" /><div className="bush bush--two" /><div className="bush bush--three" />
        <div className="wall"><span /><span /><span /><span /><span /><span /></div>
        <div className={`arena-fighter arena-fighter--cat${hitSide === "cat" ? " is-hit" : ""}${turn === "cat" ? " is-turn" : ""}`}><FighterArt side="cat" hero={selectedCat} hit={hitSide === "cat"} /></div>
        <div className={`arena-fighter arena-fighter--dog${hitSide === "dog" ? " is-hit" : ""}${turn === "dog" ? " is-turn" : ""}`}><FighterArt side="dog" hero={selectedDog} hit={hitSide === "dog"} /></div>
        {projectile && (
          <div className={`projectile projectile--${projectile.side}`} style={{ left: `${projectile.x}%`, top: `${projectile.y}%`, transform: `translate(-50%, -50%) rotate(${projectile.rotation}deg)` }}>
            <ProjectileIcon side={projectile.side} />
          </div>
        )}
        <div className="ground-line" />
      </section>

      <section className={`control-deck${canControl ? "" : " is-locked"}`}>
        <div className="aim-control">
          <div className="control-label"><span>AIM ANGLE</span><strong>{Math.round(angle)}°</strong></div>
          <input type="range" min="25" max="78" step="1" value={angle} disabled={!canControl} onChange={(event) => setAngle(Number(event.target.value))} aria-label="Throw angle" />
          <div className="angle-scale"><span>LOW</span><span>LOB</span><span>HIGH</span></div>
        </div>

        <button
          className={`power-button${charging ? " is-charging" : ""}`}
          type="button"
          disabled={!canControl}
          onPointerDown={startCharge}
          onPointerUp={releaseCharge}
          onPointerCancel={stopCharging}
        >
          <span>HOLD</span><strong>POWER</strong><small>{Math.round(power)}%</small>
        </button>

        <div className="power-control">
          <div className="control-label"><span>THROW POWER</span><strong>{Math.round(power)}%</strong></div>
          <div className="power-meter"><span style={{ width: `${power}%` }} /><i style={{ left: `${power}%` }} /></div>
          <p>{mode === "bot" && turn === "dog" ? "Bot is aiming…" : "Hold button or SPACE, then release."}</p>
        </div>
      </section>

      {winner && (
        <div className="winner-layer" role="dialog" aria-modal="true" aria-label="Match result">
          <div className={`winner-card winner-card--${winner}`}>
            <p>BACKYARD CHAMPION</p>
            <div className="winner-art"><FighterArt side={winner} hero={winner === "cat" ? selectedCat : selectedDog} /></div>
            <h2>{winner === "cat" ? selectedCat.name : selectedDog.name} wins!</h2>
            <span>{winner === "cat" ? "Fish beats bone today." : "The bone brigade owns the yard."}</span>
            <div><button type="button" onClick={() => resetMatch(mode)}>REMATCH</button><button type="button" onClick={() => setScreen("menu")}>MAIN MENU</button></div>
          </div>
        </div>
      )}
    </main>
  );
}
