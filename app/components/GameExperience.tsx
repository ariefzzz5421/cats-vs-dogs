"use client";

/* eslint-disable @next/next/no-img-element -- pre-compressed WebP sprites need native object-position cropping. */

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DataConnection, Peer as PeerInstance } from "peerjs";
import type { CatHeroId, DogHeroId, ShotVisual, Side } from "./GameArena3D";

const GameArena3D = dynamic(() => import("./GameArena3D").then((module) => module.GameArena3D), {
  ssr: false,
  loading: () => <div className="arena-loading" role="status"><span />Loading 3D arena…</div>,
});

type GameMode = "bot" | "local" | "online";
type Difficulty = "easy" | "medium" | "hard" | "expert";
type Screen = "menu" | "battle";
type OnlineRole = Side | null;
type HeroSelectionMessage =
  | { type: "selection"; side: "cat"; hero: CatHeroId }
  | { type: "selection"; side: "dog"; hero: DogHeroId };
type PeerMessage = { type: "shot"; shot: ShotVisual } | { type: "rematch" } | HeroSelectionMessage;

type Hero<T extends string> = {
  id: T;
  name: string;
  role: string;
  trait: string;
  position: string;
};

const catHeroes: Hero<CatHeroId>[] = [
  { id: "blaze", name: "Blaze", role: "Tabby striker", trait: "Fearless", position: "8% center" },
  { id: "luna", name: "Luna", role: "Moon tactician", trait: "Focused", position: "50% center" },
  { id: "shadow", name: "Shadow", role: "Night trickster", trait: "Sneaky", position: "92% center" },
];

const dogHeroes: Hero<DogHeroId>[] = [
  { id: "major", name: "Major Bark", role: "Yard captain", trait: "Brave", position: "8% center" },
  { id: "bruno", name: "Bruno", role: "Power bruiser", trait: "Sturdy", position: "50% center" },
  { id: "snow", name: "Snow", role: "Quick terrier", trait: "Playful", position: "92% center" },
];

const difficultyCopy: Record<Difficulty, { label: string; hint: string; spread: number }> = {
  easy: { label: "Easy", hint: "Bot sering meleset", spread: 27 },
  medium: { label: "Medium", hint: "Timing cukup rapi", spread: 16 },
  hard: { label: "Hard", hint: "Zona hampir selalu kena", spread: 9 },
  expert: { label: "Expert", hint: "Sedikit ruang untuk salah", spread: 4 },
};

const randomTarget = () => Math.round(60 + Math.random() * 26);
const getHero = <T extends string>(heroes: Hero<T>[], id: T) => heroes.find((hero) => hero.id === id) ?? heroes[0];

function makeShot(side: Side, power: number, target: number): ShotVisual {
  const distance = Math.abs(power - target);
  const hit = distance <= 24;
  const perfect = distance <= 5;
  const accuracy = Math.max(0, 1 - distance / 24);
  const damage = hit ? Math.min(45, Math.round(10 + accuracy * 28 + (perfect ? 7 : 0))) : 0;
  return { id: Date.now() + Math.round(Math.random() * 1000), side, power: Math.round(power), target, damage, hit, perfect };
}

function HeroCard<T extends string>({ hero, side, selected, onSelect }: { hero: Hero<T>; side: Side; selected: boolean; onSelect: () => void }) {
  return (
    <button className={`hero-card hero-card--${side}`} type="button" aria-pressed={selected} onClick={onSelect}>
      <span className="hero-card__portrait">
        <img src={side === "cat" ? "/cat-roster.webp" : "/dog-roster.webp"} alt="" width="1200" height="800" loading="eager" style={{ objectPosition: hero.position }} />
      </span>
      <span className="hero-card__copy"><strong>{hero.name}</strong><small>{hero.trait}</small></span>
      <span className="hero-card__check" aria-hidden="true">✓</span>
    </button>
  );
}

function Roster<T extends string>({ title, side, heroes, selected, onSelect }: { title: string; side: Side; heroes: Hero<T>[]; selected: T; onSelect: (id: T) => void }) {
  return (
    <section className={`roster roster--${side}`} aria-labelledby={`${side}-roster-title`}>
      <div className="roster__head">
        <span className="team-emblem" aria-hidden="true">{side === "cat" ? "CAT" : "DOG"}</span>
        <div><p>{side === "cat" ? "Fishbone crew" : "Bone brigade"}</p><h2 id={`${side}-roster-title`}>{title}</h2></div>
      </div>
      <div className="hero-list">
        {heroes.map((hero) => <HeroCard key={hero.id} hero={hero} side={side} selected={hero.id === selected} onSelect={() => onSelect(hero.id)} />)}
      </div>
      <div className={`weapon-loadout weapon-loadout--${side}`}>
        <span className="weapon-loadout__art" aria-hidden="true" />
        <div><small>Signature throw</small><strong>{side === "cat" ? "Fishbone Spinner" : "Golden Bone"}</strong></div>
      </div>
    </section>
  );
}

function HealthBar<T extends string>({ side, value, hero }: { side: Side; value: number; hero: Hero<T> }) {
  return (
    <div className={`fighter-card fighter-card--${side}`}>
      <div className="fighter-card__head">
        <span className="fighter-card__avatar"><img src={side === "cat" ? "/cat-roster.webp" : "/dog-roster.webp"} alt="" width="1200" height="800" style={{ objectPosition: hero.position }} /></span>
        <div><strong>{hero.name}</strong><span>{hero.role}</span></div>
        <b><small>HP</small>{value}<em>/100</em></b>
      </div>
      <div className="health-track" aria-label={`${hero.name} HP: ${value} dari 100`}><span style={{ transform: `scaleX(${value / 100})` }} /></div>
    </div>
  );
}

export function GameExperience() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [mode, setMode] = useState<GameMode>("bot");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [catHero, setCatHero] = useState<CatHeroId>("blaze");
  const [dogHero, setDogHero] = useState<DogHeroId>("major");
  const [health, setHealth] = useState({ cat: 100, dog: 100 });
  const [turn, setTurn] = useState<Side>("cat");
  const [power, setPower] = useState(0);
  const [target, setTarget] = useState(randomTarget);
  const [charging, setCharging] = useState(false);
  const [shot, setShot] = useState<ShotVisual | null>(null);
  const [hitSide, setHitSide] = useState<Side | null>(null);
  const [winner, setWinner] = useState<Side | null>(null);
  const [status, setStatus] = useState("Pilih hero dan mode permainan.");
  const [onlineRole, setOnlineRole] = useState<OnlineRole>(null);
  const [roomCode, setRoomCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [connectionState, setConnectionState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [connectionMessage, setConnectionMessage] = useState("Buat room atau masukkan kode teman.");
  const [reducedMotion, setReducedMotion] = useState(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [lowPowerDevice] = useState(() => typeof window !== "undefined" && ((navigator.hardwareConcurrency ?? 8) <= 4 || window.innerWidth < 640));

  const peerRef = useRef<PeerInstance | null>(null);
  const connectionRef = useRef<DataConnection | null>(null);
  const messageHandlerRef = useRef<(message: PeerMessage) => void>(() => undefined);
  const shotRef = useRef<ShotVisual | null>(null);
  const healthRef = useRef(health);
  const catHeroRef = useRef(catHero);
  const dogHeroRef = useRef(dogHero);
  const chargeDirection = useRef(1);
  const chargeFrame = useRef<number | null>(null);
  const chargeLastTime = useRef(0);

  const selectedCat = getHero(catHeroes, catHero);
  const selectedDog = getHero(dogHeroes, dogHero);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => { healthRef.current = health; }, [health]);
  useEffect(() => { shotRef.current = shot; }, [shot]);
  useEffect(() => { catHeroRef.current = catHero; }, [catHero]);
  useEffect(() => { dogHeroRef.current = dogHero; }, [dogHero]);

  useEffect(() => () => {
    peerRef.current?.destroy();
    if (chargeFrame.current) cancelAnimationFrame(chargeFrame.current);
  }, []);

  const resetMatch = useCallback((nextMode = mode) => {
    const nextHealth = { cat: 100, dog: 100 };
    healthRef.current = nextHealth;
    shotRef.current = null;
    setHealth(nextHealth);
    setTurn("cat");
    setPower(0);
    setTarget(randomTarget());
    setCharging(false);
    setShot(null);
    setWinner(null);
    setHitSide(null);
    setMode(nextMode);
    setScreen("battle");
    setStatus(nextMode === "online" ? "Tersambung. Cat melempar lebih dulu." : "Giliran Cat. Tahan POWER, lalu lepas.");
  }, [mode]);

  const launchShot = useCallback((nextShot: ShotVisual, sendOnline: boolean) => {
    if (shotRef.current) return;
    shotRef.current = nextShot;
    setCharging(false);
    setPower(nextShot.power);
    setShot(nextShot);
    setStatus(nextShot.perfect ? "PERFECT RELEASE!" : nextShot.hit ? `Kena! ${nextShot.damage} damage.` : nextShot.power < nextShot.target ? "Terlalu pelan. Tertahan tembok." : "Terlalu kuat. Senjata melewati lawan!");
    if (sendOnline) connectionRef.current?.send({ type: "shot", shot: nextShot } satisfies PeerMessage);
  }, []);

  useEffect(() => {
    messageHandlerRef.current = (message) => {
      if (message.type === "shot") launchShot(message.shot, false);
      if (message.type === "rematch") resetMatch("online");
      if (message.type === "selection" && message.side === "cat") setCatHero(message.hero);
      if (message.type === "selection" && message.side === "dog") setDogHero(message.hero);
    };
  }, [launchShot, resetMatch]);

  const wireConnection = useCallback((connection: DataConnection, role: Side) => {
    connectionRef.current = connection;
    setOnlineRole(role);
    connection.on("data", (data) => messageHandlerRef.current(data as PeerMessage));
    connection.on("open", () => {
      setConnectionState("ready");
      setConnectionMessage(role === "cat" ? "Lawan masuk. Kamu bermain sebagai Cat." : "Room ditemukan. Kamu bermain sebagai Dog.");
      if (role === "cat") connection.send({ type: "selection", side: "cat", hero: catHeroRef.current } satisfies PeerMessage);
      else connection.send({ type: "selection", side: "dog", hero: dogHeroRef.current } satisfies PeerMessage);
      resetMatch("online");
    });
    connection.on("close", () => { setConnectionState("error"); setConnectionMessage("Pemain lain keluar. Kembali ke lobby untuk menyambung ulang."); });
    connection.on("error", () => { setConnectionState("error"); setConnectionMessage("Koneksi room gagal. Periksa kode lalu coba lagi."); });
  }, [resetMatch]);

  const selectCat = (id: CatHeroId) => {
    setCatHero(id);
    if (mode === "online" && onlineRole === "cat") connectionRef.current?.send({ type: "selection", side: "cat", hero: id } satisfies PeerMessage);
  };
  const selectDog = (id: DogHeroId) => {
    setDogHero(id);
    if (mode === "online" && onlineRole === "dog") connectionRef.current?.send({ type: "selection", side: "dog", hero: id } satisfies PeerMessage);
  };

  const createRoom = async () => {
    setConnectionState("loading"); setConnectionMessage("Membuat private room…"); peerRef.current?.destroy();
    try {
      const { Peer } = await import("peerjs");
      const peer = new Peer(); peerRef.current = peer;
      peer.on("open", (id) => { setRoomCode(id); setConnectionState("ready"); setConnectionMessage("Room siap. Bagikan kode dan biarkan tab ini terbuka."); });
      peer.on("connection", (connection) => wireConnection(connection, "cat"));
      peer.on("error", () => { setConnectionState("error"); setConnectionMessage("Room gagal dibuat. Periksa koneksi lalu coba lagi."); });
    } catch { setConnectionState("error"); setConnectionMessage("Mode online tidak dapat dimulai di browser ini."); }
  };

  const joinRoom = async () => {
    const trimmed = joinCode.trim();
    if (!trimmed) { setConnectionState("error"); setConnectionMessage("Kode room masih kosong."); return; }
    setConnectionState("loading"); setConnectionMessage("Mencari room…"); peerRef.current?.destroy();
    try {
      const { Peer } = await import("peerjs");
      const peer = new Peer(); peerRef.current = peer;
      peer.on("open", () => wireConnection(peer.connect(trimmed, { reliable: true }), "dog"));
      peer.on("error", () => { setConnectionState("error"); setConnectionMessage("Room tidak ditemukan. Minta kode baru dari host."); });
    } catch { setConnectionState("error"); setConnectionMessage("Mode online tidak dapat dimulai di browser ini."); }
  };

  const copyRoomCode = async () => {
    if (!roomCode) return;
    await navigator.clipboard.writeText(roomCode);
    setConnectionMessage("Kode room disalin. Kirim ke pemain kedua.");
  };

  useEffect(() => {
    if (!charging) {
      if (chargeFrame.current) cancelAnimationFrame(chargeFrame.current);
      chargeFrame.current = null; chargeLastTime.current = 0; return;
    }
    const tick = (time: number) => {
      const delta = chargeLastTime.current ? time - chargeLastTime.current : 16;
      chargeLastTime.current = time;
      setPower((current) => {
        let next = current + chargeDirection.current * delta * 0.085;
        if (next >= 100) { next = 100; chargeDirection.current = -1; }
        else if (next <= 0) { next = 0; chargeDirection.current = 1; }
        return next;
      });
      chargeFrame.current = requestAnimationFrame(tick);
    };
    chargeFrame.current = requestAnimationFrame(tick);
    return () => { if (chargeFrame.current) cancelAnimationFrame(chargeFrame.current); };
  }, [charging]);

  const canAct = screen === "battle" && !winner && !shot && !charging && (mode !== "bot" || turn === "cat") && (mode !== "online" || onlineRole === turn);
  const startCharge = () => { if (!canAct) return; chargeDirection.current = 1; setPower(0); setCharging(true); setStatus("Charging… lepas di zona emas."); };
  const releaseCharge = () => { if (!charging || shotRef.current) return; launchShot(makeShot(turn, power, target), mode === "online"); };

  useEffect(() => {
    if (mode !== "bot" || turn !== "dog" || shot || winner || screen !== "battle") return;
    const timer = window.setTimeout(() => {
      const spread = difficultyCopy[difficulty].spread;
      const botPower = Math.max(0, Math.min(100, target + (Math.random() * 2 - 1) * spread));
      setPower(botPower); launchShot(makeShot("dog", botPower, target), false);
    }, 850);
    return () => window.clearTimeout(timer);
  }, [difficulty, launchShot, mode, screen, shot, target, turn, winner]);

  const finishShot = () => {
    const finished = shotRef.current;
    if (!finished) return;
    const victim: Side = finished.side === "cat" ? "dog" : "cat";
    const nextHealth = { ...healthRef.current, [victim]: Math.max(0, healthRef.current[victim] - finished.damage) };
    healthRef.current = nextHealth; setHealth(nextHealth);
    if (finished.hit) { setHitSide(victim); window.setTimeout(() => setHitSide(null), reducedMotion ? 120 : 420); }
    shotRef.current = null; setShot(null); setPower(0);
    if (nextHealth[victim] <= 0) {
      setWinner(finished.side);
      setStatus(`${finished.side === "cat" ? selectedCat.name : selectedDog.name} menguasai backyard!`);
      return;
    }
    setTurn(victim); setTarget(randomTarget()); setStatus(`Giliran ${victim === "cat" ? selectedCat.name : selectedDog.name}. Tahan POWER, lalu lepas.`);
  };

  const rematch = () => { resetMatch(mode); if (mode === "online") connectionRef.current?.send({ type: "rematch" } satisfies PeerMessage); };
  const returnToLobby = () => { setCharging(false); shotRef.current = null; setShot(null); setWinner(null); setScreen("menu"); setStatus("Pilih hero dan mode permainan."); };

  const modeLabel = useMemo(() => {
    if (mode === "bot") return `Solo · ${difficultyCopy[difficulty].label}`;
    if (mode === "local") return "Local · 2 Players";
    return onlineRole ? `Online · Kamu ${onlineRole === "cat" ? "Cat" : "Dog"}` : "Online";
  }, [difficulty, mode, onlineRole]);

  return (
    <div className="game-site">
      <header className="game-nav">
        <button className="game-logo" type="button" onClick={returnToLobby} aria-label="Kembali ke lobby Cats vs Dogs"><span>CATS</span><b>VS</b><span>DOGS</span></button>
        <nav className="game-nav__modes" aria-label="Game modes">
          {(["bot", "local", "online"] as GameMode[]).map((item) => <button key={item} type="button" onClick={() => { setMode(item); setScreen("menu"); }} aria-pressed={mode === item}><i aria-hidden="true">{item === "bot" ? "1P" : item === "local" ? "2P" : "NET"}</i>{item === "bot" ? "Solo" : item === "local" ? "Local" : "Online"}</button>)}
        </nav>
        <span className="match-chip"><i aria-hidden="true" />{screen === "battle" ? modeLabel : "Backyard Rumble"}</span>
      </header>

      <main>
        {screen === "menu" ? (
          <section className="lobby-shell" aria-labelledby="game-title">
            <div className="lobby-hero reveal">
              <div className="lobby-hero__copy">
                <p className="kicker"><span aria-hidden="true">★</span> Fixed feet. Wild throws.</p>
                <h1 id="game-title"><span>Choose.</span><span>Charge.</span><em>Throw!</em></h1>
                <p>Pilih jagoanmu, tahan tombol power, lalu lepas tepat di zona emas. Fishbone melawan golden bone—siapa penguasa halaman?</p>
                <div className="rules-strip"><span>100 HP</span><span>Turn based</span><span>Fair stats</span></div>
              </div>
              <figure className="key-art"><img src="/og.webp" width="1400" height="933" alt="Cat dan dog 3D bertarung melempar senjata di halaman" fetchPriority="high" /><figcaption><b>Backyard Arena</b><span>Wall split · No movement · Pure timing</span></figcaption></figure>
            </div>

            <div className="select-stage reveal" style={{ "--i": 1 } as React.CSSProperties}>
              <header className="select-stage__title"><span>01</span><div><p>Select your fighters</p><h2>Choose both heroes</h2></div><small>Cosmetic only · Same damage</small></header>
              <div className="roster-grid">
                <Roster title="Cat Heroes" side="cat" heroes={catHeroes} selected={catHero} onSelect={selectCat} />
                <div className="roster-versus" aria-hidden="true"><span>VS</span><i /></div>
                <Roster title="Dog Heroes" side="dog" heroes={dogHeroes} selected={dogHero} onSelect={selectDog} />
              </div>
            </div>

            <section className="match-console reveal" style={{ "--i": 2 } as React.CSSProperties} aria-labelledby="mode-title">
              <header><span>02</span><div><p>Match setup</p><h2 id="mode-title">Pick a game mode</h2></div></header>
              <div className="arcade-tabs" role="tablist" aria-label="Pilih mode permainan">
                {(["bot", "local", "online"] as GameMode[]).map((item) => <button key={item} type="button" role="tab" aria-selected={mode === item} onClick={() => setMode(item)}><span>{item === "bot" ? "1P" : item === "local" ? "2P" : "NET"}</span><strong>{item === "bot" ? "Vs Bot" : item === "local" ? "Same Device" : "Online Room"}</strong><small>{item === "bot" ? "4 difficulties" : item === "local" ? "Pass & play" : "Play remotely"}</small></button>)}
              </div>

              {mode === "bot" ? <div className="mode-panel"><div className="difficulty-list">{(Object.keys(difficultyCopy) as Difficulty[]).map((item) => <button key={item} type="button" aria-pressed={difficulty === item} onClick={() => setDifficulty(item)}><strong>{difficultyCopy[item].label}</strong><span>{difficultyCopy[item].hint}</span></button>)}</div><button className="fight-button" type="button" onClick={() => { setOnlineRole(null); resetMatch("bot"); }}><span>Enter arena</span><small>{selectedCat.name} vs {selectedDog.name} · {difficultyCopy[difficulty].label}</small><b aria-hidden="true">→</b></button></div> : null}

              {mode === "local" ? <div className="mode-panel mode-panel--local"><div className="player-versus"><div><span>P1</span><strong>{selectedCat.name}</strong><small>Cat controller</small></div><b>VS</b><div><span>P2</span><strong>{selectedDog.name}</strong><small>Dog controller</small></div></div><button className="fight-button" type="button" onClick={() => { setOnlineRole(null); resetMatch("local"); }}><span>Start local match</span><small>Satu perangkat · bergantian</small><b aria-hidden="true">→</b></button></div> : null}

              {mode === "online" ? <div className="mode-panel"><div className="online-grid"><div className="online-block"><span className="online-role">Host · Cat</span><h3>Main sebagai {selectedCat.name}</h3><button className="btn btn--primary" type="button" onClick={createRoom} disabled={connectionState === "loading"}>{connectionState === "loading" ? "Creating…" : "Create room"}</button>{roomCode ? <button className="room-code" type="button" onClick={copyRoomCode}><span>{roomCode}</span><b>Copy</b></button> : null}</div><div className="online-block"><span className="online-role">Guest · Dog</span><h3>Main sebagai {selectedDog.name}</h3><label htmlFor="room-code">Room code</label><input id="room-code" value={joinCode} onChange={(event) => setJoinCode(event.target.value)} placeholder="Paste host code" aria-describedby="room-help" aria-invalid={connectionState === "error"} /><button className="btn btn--cyan" type="button" onClick={joinRoom} disabled={connectionState === "loading"}>Join room</button></div></div><p id="room-help" className={`connection-note connection-note--${connectionState}`} aria-live="polite">{connectionMessage}</p></div> : null}
            </section>
          </section>
        ) : (
          <section className="battle-shell" aria-label="Cats vs Dogs match">
            <div className="scoreboard">
              <HealthBar side="cat" value={health.cat} hero={selectedCat} />
              <div className="turn-stamp" aria-live="polite"><span>{turn === "cat" ? "CAT TURN" : "DOG TURN"}</span><b>VS</b></div>
              <HealthBar side="dog" value={health.dog} hero={selectedDog} />
            </div>
            <div className="arena-frame">
              <GameArena3D shot={shot} hitSide={hitSide} catHero={catHero} dogHero={dogHero} reducedMotion={reducedMotion} lowPowerDevice={lowPowerDevice} onShotComplete={finishShot} />
              <div className={`impact-note ${shot?.perfect ? "impact-note--show" : ""}`} aria-hidden={!shot?.perfect}>Perfect!</div>
              <div className="arena-loadouts" aria-hidden="true"><span className="arena-weapon arena-weapon--cat" /><span className="arena-weapon arena-weapon--dog" /></div>
              <button className="arena-exit" type="button" onClick={returnToLobby}>← Lobby</button>
              {lowPowerDevice ? <span className="performance-badge">Lite graphics</span> : null}
            </div>
            <div className="control-deck">
              <div className="status-copy"><span>{modeLabel}</span><strong aria-live="polite">{status}</strong></div>
              <div className="power-control"><div className="power-label"><span>Throw power</span><b>{Math.round(power)}<small>%</small></b></div><div className="power-track" aria-hidden="true"><span className="sweet-zone" style={{ transform: `translateX(${target - 6}%)`, width: "12%" }} /><span className="power-fill" style={{ transform: `scaleX(${power / 100})` }} /><span className="power-needle" style={{ transform: `translateX(${power}%)` }} /></div><p>Lepas di zona emas. Titik tengah memberi bonus damage.</p></div>
              <button className={`power-button ${charging ? "is-charging" : ""}`} type="button" disabled={!canAct && !charging} aria-label="Tahan untuk mengisi power dan lepas untuk melempar" onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); startCharge(); }} onPointerUp={releaseCharge} onPointerCancel={releaseCharge} onKeyDown={(event) => { if (event.code === "Space" && !event.repeat) { event.preventDefault(); startCharge(); } }} onKeyUp={(event) => { if (event.code === "Space") { event.preventDefault(); releaseCharge(); } }}><span>{charging ? "RELEASE!" : mode === "online" && onlineRole !== turn ? "WAIT" : "HOLD POWER"}</span><small>{charging ? "Aim for gold" : "Space or touch"}</small></button>
            </div>
            {winner ? <div className="result-layer" role="dialog" aria-modal="true" aria-labelledby="winner-title"><div className={`result-card result-card--${winner}`}><span className="result-burst" aria-hidden="true" /><p>Backyard champion</p><h2 id="winner-title">{winner === "cat" ? selectedCat.name : selectedDog.name} wins!</h2><div className="result-actions"><button className="btn btn--primary" type="button" onClick={rematch}>Play again</button><button className="btn btn--outline" type="button" onClick={returnToLobby}>Change heroes</button></div></div></div> : null}
          </section>
        )}
      </main>
      <footer className="game-footer"><strong>Choose. Charge. Throw.</strong><span>3D backyard battles · Solo · Local · Online</span><small>Built for paws, thumbs, and perfect timing.</small></footer>
    </div>
  );
}
