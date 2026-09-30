import type { MatchSetup } from "@/lib/game/setup";
import { characterFor } from "@/lib/game/characters";
import { ArenaArt, FighterArt } from "./ArtPreview";
import { GameIcon } from "../GameIcon";
export function MainMenu({
  setup,
  onPlay,
  onTutorial,
}: {
  setup: MatchSetup;
  onPlay: () => void;
  onTutorial: () => void;
}) {
  const cat = characterFor("cat", setup.fighters),
    dog = characterFor("dog", setup.fighters);
  return (
    <>
      <div className="home-scene">
        <ArenaArt setup={setup} animated fighters={false} />
        <div className="home-hero cat-hero">
          <FighterArt id={cat.id} animated />
          <span>{cat.name}</span>
        </div>
        <div className="home-hero dog-hero">
          <FighterArt id={dog.id} animated />
          <span>{dog.name}</span>
        </div>
      </div>
      <div className="home-content">
        <p className="eyebrow">THE NEIGHBOURHOOD ISN’T BIG ENOUGH.</p>
        <h1 className="game-logo">
          <span>CATS</span>
          <em>VS</em>
          <span>DOGS</span>
        </h1>
        <p className="logo-subtitle">BACKYARD RUMBLE</p>
        <button className="primary play" type="button" onClick={onPlay}>
          <GameIcon name="play" />
          LET’S PLAY
        </button>
        <button className="text-button" type="button" onClick={onTutorial}>
          How to play
        </button>
        <p className="home-note">Small yard. Big rivalry.</p>
      </div>
    </>
  );
}
