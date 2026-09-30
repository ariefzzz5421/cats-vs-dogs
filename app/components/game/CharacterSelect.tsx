import type { SetupScreenProps } from "./SetupFlow";
import { useState } from "react";
import type { Side } from "@/lib/game/types";
import { CHARACTERS, SIGNATURE_DETAILS } from "@/lib/game/characters";
import { FighterArt, WeaponArt } from "./ArtPreview";
export function CharacterSelect({ setup, onChange }: SetupScreenProps) {
  const [side, setSide] = useState<Side>("cat");
  return (
    <div className="fighter-select">
      <div className="fighter-focus">
        <FighterArt id={setup.fighters[side]} animated />
        <div>
          <p className={`team-label ${side}`}>
            {side === "cat" ? "CAT CREW" : "DOG PACK"}
          </p>
          <h2>{CHARACTERS[setup.fighters[side]].name}</h2>
          <p>“{CHARACTERS[setup.fighters[side]].tagline}”</p>
          <span>{CHARACTERS[setup.fighters[side]].role}</span>
          <dl className="fighter-stats">
            {["Speed", "Power", "Control"].map((stat, i) => (
              <div key={stat}>
                <dt>{stat}</dt>
                <dd
                  aria-label={`${CHARACTERS[setup.fighters[side]].stats[i]} of 5`}
                >
                  {Array.from({ length: 5 }, (_, n) => (
                    <i
                      key={n}
                      className={
                        n < CHARACTERS[setup.fighters[side]].stats[i]
                          ? "filled"
                          : ""
                      }
                    />
                  ))}
                </dd>
              </div>
            ))}
          </dl>
          <p className="signature-name">
            <small>SIGNATURE / ONE USE</small>
            {CHARACTERS[setup.fighters[side]].signature}
          </p>
          <p className="signature-detail">
            {SIGNATURE_DETAILS[setup.fighters[side]]}
          </p>
          <div className="weapon-label">
            <WeaponArt id={setup.fighters[side]} />
            <small>{CHARACTERS[setup.fighters[side]].weaponName}</small>
          </div>
          <small className="stats-note">
            Style ratings guide signatures and Lucky. Everyone gets 100 HP.
          </small>
        </div>
      </div>
      <div className="roster">
        <div className="team-tabs">
          {(["cat", "dog"] as const).map((team) => (
            <button
              type="button"
              key={team}
              aria-pressed={side === team}
              onClick={() => setSide(team)}
            >
              {team === "cat" ? "CAT CREW" : "DOG PACK"}
            </button>
          ))}
        </div>
        {(["cat", "dog"] as const).map((team) => (
          <div className={`roster-row team-${team}`} key={team}>
            <h3>{team === "cat" ? "CAT CREW" : "DOG PACK"}</h3>
            <div>
              {Object.values(CHARACTERS)
                .filter((c) => c.side === team)
                .map((c) => (
                  <button
                    type="button"
                    key={c.id}
                    aria-label={`Select ${c.name}`}
                    aria-pressed={setup.fighters[team] === c.id}
                    onClick={() => {
                      setSide(team);
                      onChange({
                        ...setup,
                        fighters: { ...setup.fighters, [team]: c.id },
                      });
                    }}
                  >
                    <FighterArt id={c.id} portrait />
                    <span>{c.name}</span>
                  </button>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
