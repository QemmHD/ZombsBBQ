# Zombs BBQ — notes for Claude

iPhone restaurant sim, spiritual successor to Zombie Café. Design docs live in `docs/` (01 research → 06 menus/unlocks); concept art in `art/concepts/`.

## Game code (`game/`)
- Stack: TypeScript + Phaser 4 + Vite; web-first, wrapped for iOS with Capacitor later (see `docs/04-tech-plan.md` §0).
- `src/sim/` — pure game rules, no Phaser/DOM imports. Deterministic (seeded RNG in state). All gameplay rules go here, with tests.
- `src/art/` — SVG sprite generators following `src/art/types.ts` (the art contract). Style rules: `docs/03-art-and-animation.md`.
- `src/scenes/` — Phaser rendering only; reads sim state, never owns game rules.
- `src/ui/` — DOM HUD (awning bar, cards, modals). `src/game/controller.ts` glues sim ↔ scene ↔ HUD.

## Commands (run in `game/`)
- `npm test` — Vitest unit tests (sim + art)
- `npm run typecheck` — TypeScript, the project's lint gate
- `npm run build` — production build + `dist/zombs-bbq.html` single-file build
- `npm run smoke` — after a build: opens the game as an iPhone (844×390 @3x) in the pre-installed Chromium, taps through the tutorial, writes screenshots to `test-results/`, fails on console errors

## Conventions
- Stay faithful to the original's mechanics as documented in `docs/01-research.md`; deviations are deliberate fixes listed there.
- Original IP only: no Capcom names, art or assets.
- Pin exact dependency versions; run `npm audit` after adding any.
- Check every visual change by looking at a smoke-test screenshot before calling it done.
