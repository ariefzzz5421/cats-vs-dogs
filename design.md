# Design — Cats vs Dogs: Backyard Rumble

This is the locked interface system for the game. Gameplay state, character, action, and feedback outrank decoration.

## Genre

Playful arcade. Family-friendly, tactile, competitive, and readable at a glance.

## Macrostructure family

- Lobby: compact Workbench — mode, fighters, and start action stay in one game-menu viewport where possible.
- Battle: stage-first shell — arena owns the flexible center while HP/wind and controls sit in dedicated rows outside the projectile path.
- Results: short arena overlay — no navigation away from the match.

## Theme

- Warm cream menus, dark navy game chrome, cyan Cat energy, orange-red Dog energy, coral impact, yellow wind/power.
- Accent color is reserved for current turn, wind, power, damage, selection, and focus.
- No glass panels, decorative gradients, marketing badges, or non-game sections.

## Typography

- Display: Plus Jakarta Sans, weight 800–900, roman.
- Body: Plus Jakarta Sans, weight 400–700.
- Numeric telemetry: JetBrains Mono, weight 700–800.
- Labels are short, uppercase only when they identify live game state.

## Spacing and shape

- Use the named four-point scale in `tokens.css`.
- Game panels use 8–16 px corners; only circular meters and icon controls use pills/circles.
- Borders are functional separators. Shadows suggest physical arcade controls, not floating cards.

## Motion

- Character motion: breathing, aim lean, charge squash, throw follow-through, hit recoil, short laugh/victory.
- UI motion: transform and opacity only.
- Reduced motion keeps state changes and removes shake/spatial flourish.

## Audio

- Audio starts only after interaction.
- Short synthesized cues: UI, charge, release, flight, wall, ground, hit, laugh, victory.
- A visible global sound toggle is always available during play.

## App rules

- Battle has no marketing navbar or footer.
- Angle, power, wind, HP, phase, and whose turn are always visible.
- No perfect full trajectory preview; only a short aiming hint.
- Every projectile result comes from deterministic simulation.
- No Three.js runtime, free camera, or procedural 3D geometry in battle.
- Mobile supports drag-to-aim and hold-to-fire; portrait receives a rotate hint.

## Exports

`tokens.css` is the canonical source. The portable core is mirrored below; arena-specific tokens remain in that source file.

### Tailwind v4

```css
@theme {
  --color-paper: oklch(97% 0.012 95);
  --color-ink: oklch(20% 0.012 250);
  --color-accent: oklch(86% 0.18 95);
  --color-accent-2: oklch(66% 0.18 235);
  --color-accent-3: oklch(68% 0.24 18);
  --font-display: var(--font-jakarta), "Trebuchet MS", sans-serif;
  --font-body: var(--font-jakarta), "Trebuchet MS", sans-serif;
  --font-outlier: var(--font-jetbrains), monospace;
  --spacing-xs: 0.5rem;
  --spacing-sm: 0.75rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --text-sm: 0.82rem;
  --text-md: 1.18rem;
  --text-lg: 1.48rem;
  --radius-input: 0.75rem;
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
}
```

### DTCG

```json
{
  "$schema": "https://design-tokens.github.io/community-group/format/",
  "color": {
    "paper": { "$value": "oklch(97% 0.012 95)", "$type": "color" },
    "ink": { "$value": "oklch(20% 0.012 250)", "$type": "color" },
    "accent": { "$value": "oklch(86% 0.18 95)", "$type": "color" },
    "cat": { "$value": "oklch(66% 0.17 50)", "$type": "color" },
    "dog": { "$value": "oklch(62% 0.08 225)", "$type": "color" }
  },
  "space": {
    "xs": { "$value": "0.5rem", "$type": "dimension" },
    "sm": { "$value": "0.75rem", "$type": "dimension" },
    "md": { "$value": "1rem", "$type": "dimension" },
    "lg": { "$value": "1.5rem", "$type": "dimension" }
  },
  "duration": {
    "micro": { "$value": "120ms", "$type": "duration" },
    "short": { "$value": "220ms", "$type": "duration" },
    "long": { "$value": "420ms", "$type": "duration" }
  }
}
```

### shadcn/ui mapping

```css
:root {
  --background: 97% 0.012 95;
  --foreground: 20% 0.012 250;
  --card: 94% 0.016 95;
  --card-foreground: 20% 0.012 250;
  --primary: 68% 0.24 18;
  --primary-foreground: 97% 0.012 95;
  --secondary: 90% 0.055 235;
  --secondary-foreground: 20% 0.012 250;
  --border: 72% 0.026 95;
  --ring: 60% 0.2 305;
  --radius: 0.75rem;
}
```
