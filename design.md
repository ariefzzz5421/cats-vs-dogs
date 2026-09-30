# Backyard Rumble UI

Stage-first arcade layout, not a website landing page. One production game.

- Mandatory arcade setup: Home → Mode → Arena → Fighters → Loadout → Ready. The saved choice is highlighted, never skipped. Arena must be confirmed.
- Menu, fight, and result share the same Canvas and original character identity.
- Battle: health and wind above; turn, items, angle, power and hold button below. No controls cover the projectile corridor.
- Mobile portrait keeps the entire arena visible and stacks controls. Landscape is preferred, never forced.
- Lilita One for game headings, Plus Jakarta Sans for labels, JetBrains Mono for wind. `tokens.css` is the canonical compact UI palette.
- Cream, cyan, rust and mustard. No glass panels, marketing sections, gradient badges, or unnecessary nested cards.
- Native buttons, visible focus, dialog focus management. Pointer cancellation cancels rather than firing. Pause cancels charge but preserves flight.
- Transform/opacity for UI animation; essential Canvas simulation remains continuous under reduced motion.
- Menu variant: chunky outlined team wordmark with opposing weapon crests, angled play ticket, illustrated mode choices. Preserve the stage-first composition and existing font/palette family.
- Battle skills: three chosen tricks and one signature, illustrated slots with short labels, full accessible descriptions, stock and selected edge. Integrated power segments use LOW / GOOD / STRONG / MAX as well as color. No floating customization panel.
