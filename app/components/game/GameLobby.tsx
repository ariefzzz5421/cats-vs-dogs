"use client";

/* eslint-disable @next/next/no-img-element -- roster sheets are intentionally cropped with object-position. */

import type { CatHeroId, Difficulty, DogHeroId, GameMode } from "@/lib/game/types";
import { CAT_HEROES, DIFFICULTY_COPY, DOG_HEROES, getCatHero, getDogHero } from "@/lib/game/roster";

type Props = {
  mode: GameMode;
  difficulty: Difficulty;
  catHero: CatHeroId;
  dogHero: DogHeroId;
  roomCode: string;
  joinCode: string;
  connectionState: "idle" | "loading" | "ready" | "error";
  connectionMessage: string;
  onMode: (mode: GameMode) => void;
  onDifficulty: (difficulty: Difficulty) => void;
  onCatHero: (hero: CatHeroId) => void;
  onDogHero: (hero: DogHeroId) => void;
  onJoinCode: (code: string) => void;
  onCreateRoom: () => void;
  onJoinRoom: () => void;
  onCopyRoom: () => void;
  onStart: () => void;
};

function FighterTile({
  side,
  hero,
  selected,
  onSelect,
}: {
  side: "cat" | "dog";
  hero: (typeof CAT_HEROES)[number] | (typeof DOG_HEROES)[number];
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button className={`fighter-tile fighter-tile--${side}`} type="button" aria-pressed={selected} onClick={onSelect}>
      <span className="fighter-tile__art">
        <img src={`/characters/battle/${hero.id}.webp`} alt="" width="432" height="600" decoding="async" />
      </span>
      <span><strong>{hero.name}</strong><small>{hero.trait}</small></span>
    </button>
  );
}

export function GameLobby(props: Props) {
  const selectedCat = getCatHero(props.catHero);
  const selectedDog = getDogHero(props.dogHero);
  return (
    <main className="game-menu">
      <header className="menu-masthead">
        <div className="menu-mark" aria-label="Cats vs Dogs Backyard Rumble">
          <span>CATS</span><b>VS</b><span>DOGS</span><small>Backyard Rumble</small>
        </div>
        <p>Aim high. Read the wind. Rule the yard.</p>
      </header>

      <section className="mode-select" aria-labelledby="mode-heading">
        <h1 id="mode-heading">Choose a match</h1>
        <div className="mode-buttons">
          {(["bot", "local", "online"] as GameMode[]).map((item) => (
            <button key={item} type="button" aria-pressed={props.mode === item} onClick={() => props.onMode(item)}>
              <i aria-hidden="true">{item === "bot" ? "1P" : item === "local" ? "2P" : "NET"}</i>
              <span><strong>{item === "bot" ? "Play Solo" : item === "local" ? "Local 2P" : "Online"}</strong><small>{item === "bot" ? "Fight the bot" : item === "local" ? "Same device" : "Private room"}</small></span>
            </button>
          ))}
        </div>
      </section>

      <section className="fighter-select" aria-labelledby="fighters-heading">
        <div className="menu-section-title"><span>Fighter select</span><h2 id="fighters-heading">Pick your backyard rivals</h2></div>
        <div className="fighter-select__teams">
          <div className="fighter-team fighter-team--cat">
            <div className="fighter-team__preview">
              <img src={`/characters/battle/${selectedCat.id}.webp`} alt={`${selectedCat.name}, ${selectedCat.role}`} width="432" height="600" decoding="async" />
              <span><small>Cat crew</small><strong>{selectedCat.name}</strong><em>{selectedCat.role} · Fishbone Spinner</em></span>
            </div>
            <div className="fighter-tiles">{CAT_HEROES.map((hero) => <FighterTile key={hero.id} side="cat" hero={hero} selected={hero.id === props.catHero} onSelect={() => props.onCatHero(hero.id)} />)}</div>
          </div>
          <div className="fighter-vs" aria-hidden="true"><span>VS</span></div>
          <div className="fighter-team fighter-team--dog">
            <div className="fighter-team__preview">
              <img src={`/characters/battle/${selectedDog.id}.webp`} alt={`${selectedDog.name}, ${selectedDog.role}`} width="432" height="600" decoding="async" />
              <span><small>Dog squad</small><strong>{selectedDog.name}</strong><em>{selectedDog.role} · Rubber Bone</em></span>
            </div>
            <div className="fighter-tiles">{DOG_HEROES.map((hero) => <FighterTile key={hero.id} side="dog" hero={hero} selected={hero.id === props.dogHero} onSelect={() => props.onDogHero(hero.id)} />)}</div>
          </div>
        </div>
      </section>

      <section className="match-setup" aria-live="polite">
        {props.mode === "bot" && (
          <div className="difficulty-picker">
            <span>Bot difficulty</span>
            <div>{(Object.keys(DIFFICULTY_COPY) as Difficulty[]).map((item) => <button key={item} type="button" aria-pressed={props.difficulty === item} onClick={() => props.onDifficulty(item)}><strong>{DIFFICULTY_COPY[item].label}</strong><small>{DIFFICULTY_COPY[item].hint}</small></button>)}</div>
          </div>
        )}
        {props.mode === "local" && <p className="setup-note"><strong>Pass & play.</strong> Cat aims first, then hand the device to Dog.</p>}
        {props.mode === "online" && (
          <div className="online-setup">
            <div><strong>Host as Cat</strong><button type="button" onClick={props.onCreateRoom} disabled={props.connectionState === "loading"}>Create room</button>{props.roomCode && <button className="room-code" type="button" onClick={props.onCopyRoom}><span>{props.roomCode}</span><small>Copy</small></button>}</div>
            <div><label htmlFor="room-code">Join as Dog</label><div className="join-row"><input id="room-code" value={props.joinCode} onChange={(event) => props.onJoinCode(event.target.value)} placeholder="Paste room code" autoComplete="off" /><button type="button" onClick={props.onJoinRoom} disabled={props.connectionState === "loading"}>Join</button></div></div>
            <p className={props.connectionState === "error" ? "online-status is-error" : "online-status"}>{props.connectionMessage}</p>
          </div>
        )}
        {props.mode !== "online" ? (
          <button className="start-match" type="button" onClick={props.onStart}>
            <span>Start match</span><small>{selectedCat.name} vs {selectedDog.name}</small><b aria-hidden="true">→</b>
          </button>
        ) : null}
      </section>
    </main>
  );
}
