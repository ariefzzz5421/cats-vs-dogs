"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DataConnection, Peer as PeerInstance } from "peerjs";

import { playGameSound, setSoundEnabled, startChargeSound, stopChargeSound } from "@/lib/game/audio";
import { makeDeterministicWind, simulateShot } from "@/lib/game/ballistics";
import { BOT_PROFILES, makeBotShot } from "@/lib/game/bot";
import { DEFAULT_ANGLES, PHYSICS, opponentOf, projectileFor } from "@/lib/game/constants";
import { getCatHero, getDogHero } from "@/lib/game/roster";
import type { ActiveShot, CatHeroId, Difficulty, DogHeroId, GameMode, GamePhase, HealthState, ImpactResult, MatchSnapshot, ShotInput, Side } from "@/lib/game/types";
import { GameArena2D } from "./GameArena2D";
import { BattleHUD } from "./game/BattleHUD";
import { GameLobby } from "./game/GameLobby";

type OnlineRole = Side | null;
type PeerMessage =
  | { type: "selection"; side: "cat"; hero: CatHeroId }
  | { type: "selection"; side: "dog"; hero: DogHeroId }
  | { type: "shot-request"; input: ShotInput }
  | { type: "shot"; input: ShotInput }
  | { type: "snapshot"; snapshot: MatchSnapshot }
  | { type: "rematch-request" }
  | { type: "rematch"; snapshot: MatchSnapshot };

const fullHealth = (): HealthState => ({ cat: 100, dog: 100 });
const shotId = () => typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;

export function GameExperience() {
  const [phase, setPhase] = useState<GamePhase>("LOBBY");
  const [mode, setMode] = useState<GameMode>("bot");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [catHero, setCatHero] = useState<CatHeroId>("blaze");
  const [dogHero, setDogHero] = useState<DogHeroId>("major");
  const [health, setHealth] = useState<HealthState>(fullHealth);
  const [turn, setTurn] = useState<Side>("cat");
  const [turnIndex, setTurnIndex] = useState(0);
  const [wind, setWind] = useState(0);
  const [angles, setAngles] = useState(DEFAULT_ANGLES);
  const [power, setPower] = useState(0);
  const [activeShot, setActiveShot] = useState<ActiveShot | null>(null);
  const [impact, setImpact] = useState<ImpactResult | null>(null);
  const [winner, setWinner] = useState<Side | null>(null);
  const [status, setStatus] = useState("Read the wind, set your angle, then charge.");
  const [soundEnabled, setSoundState] = useState(true);
  const [onlineRole, setOnlineRole] = useState<OnlineRole>(null);
  const [roomCode, setRoomCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [connectionState, setConnectionState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [connectionMessage, setConnectionMessage] = useState("Create a room or paste a friend’s code.");
  const [reducedMotion, setReducedMotion] = useState(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [lowPowerDevice] = useState(() => typeof window !== "undefined" && ((navigator.hardwareConcurrency ?? 8) <= 4 || window.innerWidth < 640));

  const peerRef = useRef<PeerInstance | null>(null);
  const connectionRef = useRef<DataConnection | null>(null);
  const onlineRoleRef = useRef<OnlineRole>(null);
  const handlerRef = useRef<(message: PeerMessage) => void>(() => undefined);
  const processedShots = useRef(new Set<string>());
  const matchSeed = useRef(1);
  const chargeFrame = useRef<number | null>(null);
  const chargeDirection = useRef(1);
  const chargeTime = useRef(0);
  const powerRef = useRef(power);
  const healthRef = useRef(health);
  const phaseRef = useRef(phase);
  const turnRef = useRef(turn);
  const turnIndexRef = useRef(turnIndex);
  const windRef = useRef(wind);
  const activeShotRef = useRef<ActiveShot | null>(null);
  const catHeroRef = useRef(catHero);
  const dogHeroRef = useRef(dogHero);
  const dragRef = useRef<{ y: number; angle: number } | null>(null);
  const introTimer = useRef<number | null>(null);

  const selectedCat = getCatHero(catHero);
  const selectedDog = getDogHero(dogHero);

  useEffect(() => { healthRef.current = health; }, [health]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { turnRef.current = turn; }, [turn]);
  useEffect(() => { turnIndexRef.current = turnIndex; }, [turnIndex]);
  useEffect(() => { windRef.current = wind; }, [wind]);
  useEffect(() => { powerRef.current = power; }, [power]);
  useEffect(() => { catHeroRef.current = catHero; }, [catHero]);
  useEffect(() => { dogHeroRef.current = dogHero; }, [dogHero]);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => () => {
    peerRef.current?.destroy();
    if (chargeFrame.current) cancelAnimationFrame(chargeFrame.current);
    if (introTimer.current) window.clearTimeout(introTimer.current);
    stopChargeSound();
  }, []);

  const applySnapshot = useCallback((snapshot: MatchSnapshot) => {
    healthRef.current = snapshot.health; setHealth(snapshot.health);
    turnRef.current = snapshot.turn; setTurn(snapshot.turn);
    windRef.current = snapshot.wind; setWind(snapshot.wind);
    turnIndexRef.current = snapshot.turnIndex; setTurnIndex(snapshot.turnIndex);
    catHeroRef.current = snapshot.catHero; setCatHero(snapshot.catHero);
    dogHeroRef.current = snapshot.dogHero; setDogHero(snapshot.dogHero);
    setWinner(snapshot.winner); setImpact(null); setActiveShot(null); activeShotRef.current = null; setPower(0);
    setPhase(snapshot.winner ? "GAME_OVER" : "AIMING");
    setStatus(snapshot.winner ? `${snapshot.winner === "cat" ? getCatHero(snapshot.catHero).name : getDogHero(snapshot.dogHero).name} wins the yard!` : `${snapshot.turn === "cat" ? getCatHero(snapshot.catHero).name : getDogHero(snapshot.dogHero).name} is aiming.`);
  }, []);

  const beginMatch = useCallback((nextMode = mode, broadcast = true) => {
    const seed = nextMode === "online" && onlineRoleRef.current === "dog" ? matchSeed.current : (Date.now() & 0x7fffffff);
    matchSeed.current = seed;
    const initialWind = makeDeterministicWind(seed, 0);
    const snapshot: MatchSnapshot = { health: fullHealth(), turn: "cat", wind: initialWind, turnIndex: 0, winner: null, catHero: catHeroRef.current, dogHero: dogHeroRef.current };
    processedShots.current.clear();
    setMode(nextMode); setAngles(DEFAULT_ANGLES); setImpact(null); setPower(0); setWinner(null);
    applySnapshot(snapshot);
    setPhase("MATCH_INTRO");
    setStatus("Cat opens the rumble.");
    if (introTimer.current) window.clearTimeout(introTimer.current);
    introTimer.current = window.setTimeout(() => { setPhase("AIMING"); phaseRef.current = "AIMING"; setStatus(`${getCatHero(catHeroRef.current).name}: set angle and charge.`); }, reducedMotion ? 80 : 520);
    if (broadcast && nextMode === "online" && onlineRoleRef.current === "cat") connectionRef.current?.send({ type: "rematch", snapshot } satisfies PeerMessage);
  }, [applySnapshot, mode, reducedMotion]);

  const launchInput = useCallback((input: ShotInput, broadcast: boolean) => {
    if (processedShots.current.has(input.shotId) || activeShotRef.current) return;
    processedShots.current.add(input.shotId);
    const next = { input, result: simulateShot(input) };
    activeShotRef.current = next; setActiveShot(next); setImpact(null); setPower(input.power);
    phaseRef.current = "PROJECTILE_FLIGHT"; setPhase("PROJECTILE_FLIGHT");
    setStatus(`${input.side === "cat" ? getCatHero(catHeroRef.current).name : getDogHero(dogHeroRef.current).name} throws!`);
    stopChargeSound(); playGameSound("release", input.power / 100); window.setTimeout(() => playGameSound("whoosh", input.power / 100), 55);
    if (broadcast) connectionRef.current?.send({ type: "shot", input } satisfies PeerMessage);
  }, []);

  useEffect(() => {
    handlerRef.current = (message) => {
      if (message.type === "selection") {
        if (message.side === "cat") { catHeroRef.current = message.hero; setCatHero(message.hero); }
        else { dogHeroRef.current = message.hero; setDogHero(message.hero); }
        return;
      }
      if (message.type === "snapshot" || message.type === "rematch") { applySnapshot(message.snapshot); return; }
      if (message.type === "shot") {
        if (message.input.turnIndex !== turnIndexRef.current || message.input.side !== turnRef.current) return;
        launchInput(message.input, false); return;
      }
      if (message.type === "shot-request" && onlineRoleRef.current === "cat") {
        const legal = message.input.side === "dog" && turnRef.current === "dog" && message.input.turnIndex === turnIndexRef.current && phaseRef.current === "AIMING" && Math.abs(message.input.wind - windRef.current) < 0.001;
        if (legal) launchInput(message.input, true);
        return;
      }
      if (message.type === "rematch-request" && onlineRoleRef.current === "cat") beginMatch("online", true);
    };
  }, [applySnapshot, beginMatch, launchInput]);

  const wireConnection = useCallback((connection: DataConnection, role: Side) => {
    connectionRef.current = connection; onlineRoleRef.current = role; setOnlineRole(role);
    connection.on("data", (data) => handlerRef.current(data as PeerMessage));
    connection.on("open", () => {
      setConnectionState("ready");
      setConnectionMessage(role === "cat" ? "Opponent connected. You are Cat." : "Room joined. You are Dog.");
      connection.send(role === "cat" ? { type: "selection", side: "cat", hero: catHeroRef.current } : { type: "selection", side: "dog", hero: dogHeroRef.current });
      if (role === "cat") beginMatch("online", true);
    });
    connection.on("close", () => { setConnectionState("error"); setConnectionMessage("Opponent disconnected. Return to the lobby to reconnect."); setStatus("Connection lost."); });
    connection.on("error", () => { setConnectionState("error"); setConnectionMessage("The room connection failed. Try a new code."); });
  }, [beginMatch]);

  const createRoom = async () => {
    setMode("online"); setConnectionState("loading"); setConnectionMessage("Creating a private room…"); peerRef.current?.destroy();
    try {
      const { Peer } = await import("peerjs"); const peer = new Peer(); peerRef.current = peer;
      peer.on("open", (id) => { setRoomCode(id); setConnectionState("ready"); setConnectionMessage("Room ready. Share the code and keep this tab open."); });
      peer.on("connection", (connection) => wireConnection(connection, "cat"));
      peer.on("error", () => { setConnectionState("error"); setConnectionMessage("Could not create the room. Check your connection."); });
    } catch { setConnectionState("error"); setConnectionMessage("Online mode is unavailable in this browser."); }
  };

  const joinRoom = async () => {
    const code = joinCode.trim(); if (!code) { setConnectionState("error"); setConnectionMessage("Paste a room code first."); return; }
    setMode("online"); setConnectionState("loading"); setConnectionMessage("Finding the room…"); peerRef.current?.destroy();
    try {
      const { Peer } = await import("peerjs"); const peer = new Peer(); peerRef.current = peer;
      peer.on("open", () => wireConnection(peer.connect(code, { reliable: true }), "dog"));
      peer.on("error", () => { setConnectionState("error"); setConnectionMessage("Room not found. Ask the host for a fresh code."); });
    } catch { setConnectionState("error"); setConnectionMessage("Online mode is unavailable in this browser."); }
  };

  useEffect(() => {
    if (phase !== "CHARGING") {
      if (chargeFrame.current) cancelAnimationFrame(chargeFrame.current);
      chargeFrame.current = null; chargeTime.current = 0; return;
    }
    const tick = (time: number) => {
      const delta = chargeTime.current ? time - chargeTime.current : 16; chargeTime.current = time;
      setPower((current) => { let next = current + chargeDirection.current * delta * 0.075; if (next >= 100) { next = 100; chargeDirection.current = -1; } else if (next <= PHYSICS.minPower) { next = PHYSICS.minPower; chargeDirection.current = 1; } powerRef.current = next; return next; });
      chargeFrame.current = requestAnimationFrame(tick);
    };
    chargeFrame.current = requestAnimationFrame(tick);
    return () => { if (chargeFrame.current) cancelAnimationFrame(chargeFrame.current); };
  }, [phase]);

  const canAct = phase === "AIMING" && !winner && !activeShot && (mode !== "bot" || turn === "cat") && (mode !== "online" || onlineRole === turn);
  const setCurrentAngle = useCallback((value: number) => {
    if (!canAct) return;
    const next = Math.max(PHYSICS.minAngle, Math.min(PHYSICS.maxAngle, value)); setAngles((current) => ({ ...current, [turn]: next }));
  }, [canAct, turn]);

  const startCharge = useCallback(() => {
    if (!canAct) return;
    chargeDirection.current = 1; powerRef.current = PHYSICS.minPower; setPower(PHYSICS.minPower); phaseRef.current = "CHARGING"; setPhase("CHARGING"); setStatus("Charging… release when it feels right."); startChargeSound();
  }, [canAct]);

  const releaseCharge = useCallback(() => {
    if (phaseRef.current !== "CHARGING" || activeShotRef.current) return;
    const input: ShotInput = { shotId: shotId(), side: turnRef.current, angle: angles[turnRef.current], power: Math.round(powerRef.current), wind: windRef.current, projectileType: projectileFor(turnRef.current), turnIndex: turnIndexRef.current };
    if (mode === "online" && onlineRole === "dog") { phaseRef.current = "TURN_START"; setPhase("TURN_START"); setStatus("Host is validating the throw…"); stopChargeSound(); connectionRef.current?.send({ type: "shot-request", input } satisfies PeerMessage); }
    else launchInput(input, mode === "online");
  }, [angles, launchInput, mode, onlineRole]);

  useEffect(() => {
    const keyDown = (event: KeyboardEvent) => { if (event.code === "Space" && !event.repeat) { event.preventDefault(); startCharge(); } };
    const keyUp = (event: KeyboardEvent) => { if (event.code === "Space") { event.preventDefault(); releaseCharge(); } };
    window.addEventListener("keydown", keyDown); window.addEventListener("keyup", keyUp);
    return () => { window.removeEventListener("keydown", keyDown); window.removeEventListener("keyup", keyUp); };
  }, [releaseCharge, startCharge]);

  useEffect(() => {
    if (mode !== "bot" || turn !== "dog" || phase !== "AIMING" || winner) return;
    const aim = makeBotShot("dog", wind, difficulty, turnIndex, shotId());
    const prepareTimer = window.setTimeout(() => {
      setAngles((current) => ({ ...current, dog: aim.angle })); setPower(18); setStatus(`${selectedDog.name} studies the wind…`);
    }, 0);
    const shotTimer = window.setTimeout(() => { setPower(aim.power); powerRef.current = aim.power; launchInput(aim, false); }, BOT_PROFILES[difficulty].reactionMs);
    return () => { window.clearTimeout(prepareTimer); window.clearTimeout(shotTimer); };
  }, [difficulty, launchInput, mode, phase, selectedDog.name, turn, turnIndex, wind, winner]);

  const finishShot = useCallback((resultImpact: ImpactResult) => {
    const finished = activeShotRef.current; if (!finished) return;
    activeShotRef.current = null; setActiveShot(null); setImpact(resultImpact); phaseRef.current = "IMPACT"; setPhase("IMPACT");
    if (resultImpact.kind === "target") playGameSound("hit", resultImpact.speed / 12); else if (resultImpact.kind === "wall") playGameSound("wall"); else playGameSound("ground");
    const impactLabel = resultImpact.kind === "target" ? `Direct hit! ${resultImpact.damage} damage.` : resultImpact.kind === "wall" ? "Brick wall!" : resultImpact.kind === "ground" ? "Missed — dirt everywhere." : "That one left the yard.";
    setStatus(impactLabel);

    // Guests render the deterministic flight but only accept HP/turn/winner from the host.
    if (mode === "online" && onlineRole === "dog") return;
    const shooter = finished.input.side; const victim = opponentOf(shooter);
    const nextHealth = { ...healthRef.current };
    if (resultImpact.kind === "target") nextHealth[victim] = Math.max(0, nextHealth[victim] - resultImpact.damage);
    const nextWinner = nextHealth[victim] <= 0 ? shooter : null;
    window.setTimeout(() => {
      healthRef.current = nextHealth; setHealth(nextHealth); setWinner(nextWinner); setPower(0);
      if (nextWinner) {
        phaseRef.current = "GAME_OVER"; setPhase("GAME_OVER"); setStatus(`${nextWinner === "cat" ? getCatHero(catHeroRef.current).name : getDogHero(dogHeroRef.current).name} wins the yard!`); playGameSound("victory");
      } else {
        const nextTurnIndex = turnIndexRef.current + 1; const nextTurn = victim; const nextWind = makeDeterministicWind(matchSeed.current, nextTurnIndex);
        turnIndexRef.current = nextTurnIndex; setTurnIndex(nextTurnIndex); turnRef.current = nextTurn; setTurn(nextTurn); windRef.current = nextWind; setWind(nextWind); setImpact(null); phaseRef.current = "AIMING"; setPhase("AIMING"); setStatus(`${nextTurn === "cat" ? getCatHero(catHeroRef.current).name : getDogHero(dogHeroRef.current).name}: adjust for the new wind.`);
        if (resultImpact.kind !== "target") playGameSound("laugh");
      }
      if (mode === "online" && onlineRole === "cat") connectionRef.current?.send({ type: "snapshot", snapshot: { health: nextHealth, turn: nextWinner ? shooter : victim, wind: nextWinner ? windRef.current : makeDeterministicWind(matchSeed.current, turnIndexRef.current), turnIndex: turnIndexRef.current, winner: nextWinner, catHero: catHeroRef.current, dogHero: dogHeroRef.current } } satisfies PeerMessage);
    }, reducedMotion ? 100 : 620);
  }, [mode, onlineRole, reducedMotion]);

  const reactions = useMemo(() => {
    if (winner) return { cat: winner === "cat" ? "victory" : "defeat", dog: winner === "dog" ? "victory" : "defeat" } as const;
    if (impact?.kind === "target" && impact.target) return { cat: impact.target === "cat" ? "hit" : "idle", dog: impact.target === "dog" ? "hit" : "idle" } as const;
    if (impact && impact.kind !== "target") return { cat: turn === "dog" ? "laugh" : "idle", dog: turn === "cat" ? "laugh" : "idle" } as const;
    if (phase === "PROJECTILE_FLIGHT") return { cat: activeShot?.input.side === "cat" ? "throw" : "idle", dog: activeShot?.input.side === "dog" ? "throw" : "idle" } as const;
    if (phase === "CHARGING") return { cat: turn === "cat" ? "charge" : "idle", dog: turn === "dog" ? "charge" : "idle" } as const;
    return { cat: turn === "cat" ? "aim" : "idle", dog: turn === "dog" ? "aim" : "idle" } as const;
  }, [activeShot?.input.side, impact, phase, turn, winner]);

  const returnToLobby = () => { stopChargeSound(); if (introTimer.current) window.clearTimeout(introTimer.current); activeShotRef.current = null; setActiveShot(null); setImpact(null); setWinner(null); phaseRef.current = "LOBBY"; setPhase("LOBBY"); };
  const rematch = () => { if (mode === "online" && onlineRole === "dog") connectionRef.current?.send({ type: "rematch-request" } satisfies PeerMessage); else beginMatch(mode, mode === "online"); };
  const toggleSound = () => { const next = !soundEnabled; setSoundState(next); setSoundEnabled(next); if (next) playGameSound("ui"); };
  const fullscreen = async () => { if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.(); else await document.exitFullscreen?.(); };

  if (phase === "LOBBY") return <GameLobby mode={mode} difficulty={difficulty} catHero={catHero} dogHero={dogHero} roomCode={roomCode} joinCode={joinCode} connectionState={connectionState} connectionMessage={connectionMessage} onMode={(next) => { playGameSound("ui"); setMode(next); }} onDifficulty={setDifficulty} onCatHero={(hero) => { setCatHero(hero); if (mode === "online" && onlineRole === "cat") connectionRef.current?.send({ type: "selection", side: "cat", hero } satisfies PeerMessage); }} onDogHero={(hero) => { setDogHero(hero); if (mode === "online" && onlineRole === "dog") connectionRef.current?.send({ type: "selection", side: "dog", hero } satisfies PeerMessage); }} onJoinCode={setJoinCode} onCreateRoom={createRoom} onJoinRoom={joinRoom} onCopyRoom={() => { if (roomCode) void navigator.clipboard.writeText(roomCode); setConnectionMessage("Room code copied."); }} onStart={() => beginMatch(mode, false)} />;

  return (
    <main className={`battle-screen battle-screen--${phase.toLowerCase().replaceAll("_", "-")}`}>
      <div
        className="arena-stage"
        onPointerDown={(event) => { if (!canAct || event.button !== 0) return; dragRef.current = { y: event.clientY, angle: angles[turn] }; event.currentTarget.setPointerCapture(event.pointerId); }}
        onPointerMove={(event) => { if (!dragRef.current) return; setCurrentAngle(dragRef.current.angle + (dragRef.current.y - event.clientY) * 0.22); }}
        onPointerUp={() => { dragRef.current = null; }}
        onPointerCancel={() => { dragRef.current = null; }}
      >
        <GameArena2D activeShot={activeShot} impact={impact} catHero={catHero} dogHero={dogHero} catReaction={reactions.cat} dogReaction={reactions.dog} turn={turn} angle={angles[turn]} power={power} wind={wind} phase={phase} reducedMotion={reducedMotion} lowPowerDevice={lowPowerDevice} onShotComplete={finishShot} />
      </div>
      <BattleHUD catName={selectedCat.name} dogName={selectedDog.name} health={health} turn={turn} phase={phase} angle={angles[turn]} power={power} wind={wind} status={status} canAct={canAct} soundEnabled={soundEnabled} lowPowerDevice={lowPowerDevice} onAngle={setCurrentAngle} onChargeStart={startCharge} onChargeEnd={releaseCharge} onLobby={returnToLobby} onFullscreen={() => void fullscreen()} onSound={toggleSound} />
      {winner && <div className="result-overlay" role="dialog" aria-modal="true" aria-labelledby="winner-title"><div><small>Backyard champion</small><h1 id="winner-title">{winner === "cat" ? selectedCat.name : selectedDog.name} wins!</h1><p>{winner === "cat" ? "Fishbone crew" : "Bone squad"} owns the yard—for now.</p><span><button type="button" onClick={rematch}>Rematch</button><button type="button" onClick={returnToLobby}>Fighter select</button></span></div></div>}
    </main>
  );
}
