import type { Item, Side } from "@/lib/game/types";

type IconName =
  | Item
  | "weapon"
  | "power"
  | "aim"
  | "play"
  | "solo"
  | "local"
  | "sound"
  | "mute"
  | "pause"
  | "fullscreen";

/** Original backyard icon family. Shared silhouettes, rounded ink edges, no image requests. */
function Weapon({ side }: { side: Side }) {
  return side === "cat" ? (
    <g className="icon-weapon">
      <path d="M43 31 57 20 55 32 59 43Z" fill="var(--color-bone-shadow)" />
      <path
        d="M20 32H48M29 32 26 20M29 32 26 44M38 32 35 22M38 32 35 42"
        fill="none"
        stroke="var(--color-ink)"
        strokeWidth="7"
      />
      <path
        d="M20 32H48M29 32 26 20M29 32 26 44M38 32 35 22M38 32 35 42"
        fill="none"
        stroke="var(--color-bone)"
        strokeWidth="3.5"
      />
      <path
        d="M24 32C22 16 6 16 5 29L10 32 5 35C8 48 23 46 24 32Z"
        fill="var(--color-bone)"
      />
      <circle cx="15" cy="27" r="2.5" fill="var(--color-ink)" stroke="none" />
    </g>
  ) : (
    <g className="icon-weapon" transform="rotate(-28 32 32)">
      <path
        d="M19 25C14 10 0 18 8 29 0 41 15 49 20 38H44C49 50 64 41 56 30 64 19 49 10 44 25Z"
        fill="var(--color-bone)"
      />
      <path d="M20 35H44" stroke="var(--color-bone-shadow)" strokeWidth="4" />
      <path
        d="M12 23 15 22M48 22 51 23"
        stroke="var(--color-paper)"
        strokeWidth="3"
      />
    </g>
  );
}

export function GameIcon({
  name,
  side = "cat",
  className = "",
}: {
  name: IconName;
  side?: Side;
  className?: string;
}) {
  return (
    <svg
      className={`game-icon ${className}`}
      viewBox="0 0 64 64"
      width="64"
      height="64"
      fill="none"
      stroke="var(--color-ink)"
      strokeWidth="2.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {name === "weapon" && <Weapon side={side} />}
      {name === "double" && (
        <>
          <g opacity=".65" transform="translate(2 -2) scale(.8)">
            <Weapon side={side} />
          </g>
          <g transform="translate(9 16) scale(.8)">
            <Weapon side={side} />
          </g>
          <path d="m47 7 5 3-5 3M54 10h6" stroke="var(--color-accent-2)" />
        </>
      )}
      {name === "heavy" && (
        <>
          <path d="m8 44 8-4 4 9 9-3 7 9 11-9 9 1" fill="var(--color-accent)" />
          <g transform="translate(0 -6)">
            <Weapon side={side} />
            <path d="M29 23h10v18H29Z" fill="var(--color-metal)" />
            <path d="M32 27v10" stroke="var(--color-paper)" />
          </g>
        </>
      )}
      {name === "shield" && (
        <>
          <path
            d="m32 5 22 8v19c0 13-14 23-22 27C24 55 10 45 10 32V13Z"
            fill="var(--color-sky)"
          />
          <path
            d="m32 12 15 6v14c0 8-8 16-15 20"
            stroke="var(--color-accent-2)"
            strokeWidth="4"
          />
          <path
            d="M5 24h23c9 0 9-11 2-11M2 33h32c10 0 10 13 1 13M8 42h10"
            stroke="var(--color-paper)"
            strokeWidth="4"
          />
        </>
      )}
      {name === "heal" && (
        <>
          <g transform="translate(14 -2) scale(.6)">
            <Weapon side={side} />
          </g>
          <path d="m9 33 5 22h37l5-22Z" fill="var(--color-accent-3)" />
          <path d="M7 33h50M12 55h41" strokeWidth="4" />
          <path
            d="M32 38v12m-6-6h12"
            stroke="var(--color-bone)"
            strokeWidth="4"
          />
          <path d="m52 7 0 10m-5-5h10" stroke="var(--color-accent-2)" />
        </>
      )}
      {name === "power" && (
        <>
          <path d="M9 49a27 27 0 1 1 46 0" fill="var(--color-accent)" />
          <path d="m32 16 0 5M15 24l4 4m30-4-4 4" />
          <path d="m32 39 12-14" strokeWidth="5" />
          <circle cx="32" cy="39" r="5" fill="var(--color-bone)" />
        </>
      )}
      {name === "aim" && (
        <>
          <path d="M9 52V12m0 40h46" />
          <path d="M17 45Q26 4 55 16" strokeDasharray="3 5" />
          <path d="m46 9 10 6-7 9" />
          <path
            d="M9 52 31 30"
            stroke="var(--color-accent-2)"
            strokeWidth="5"
          />
        </>
      )}
      {name === "play" && (
        <path d="M20 10 53 32 20 54Z" fill="var(--color-bone)" />
      )}
      {name === "solo" && (
        <>
          <path d="M32 9v8" />
          <circle cx="32" cy="8" r="4" fill="var(--color-accent)" />
          <rect
            x="9"
            y="18"
            width="46"
            height="35"
            rx="10"
            fill="var(--color-sky)"
          />
          <circle cx="23" cy="32" r="4" fill="var(--color-ink)" />
          <circle cx="42" cy="32" r="4" fill="var(--color-ink)" />
          <path d="M24 44h16M4 29v12m56-12v12" />
        </>
      )}
      {name === "local" && (
        <>
          <circle cx="22" cy="21" r="10" fill="var(--color-sky)" />
          <circle cx="46" cy="25" r="9" fill="var(--color-accent)" />
          <path
            d="M4 54v-7c0-19 35-19 35 0v7ZM39 38c11-5 21 3 21 12v4H44"
            fill="var(--color-bone)"
          />
        </>
      )}
      {(name === "sound" || name === "mute") && (
        <>
          <path d="M9 25h11L34 12v40L20 39H9Z" fill="var(--color-bone)" />
          {name === "sound" ? (
            <path d="M43 23q10 9 0 18m7-25q17 16 0 32" />
          ) : (
            <path d="m44 25 13 14m0-14L44 39" />
          )}
        </>
      )}
      {name === "pause" && (
        <>
          <rect
            x="16"
            y="12"
            width="10"
            height="40"
            rx="3"
            fill="var(--color-bone)"
          />
          <rect
            x="38"
            y="12"
            width="10"
            height="40"
            rx="3"
            fill="var(--color-bone)"
          />
        </>
      )}
      {name === "fullscreen" && (
        <path
          d="M25 10H10v15m29-15h15v15M10 39v15h15m14 0h15V39"
          strokeWidth="5"
        />
      )}
    </svg>
  );
}
