# 🧟🔥 Zombs BBQ

**The world ended, but the brisket didn't.**

Zombs BBQ is an iPhone restaurant sim and spiritual successor to *Zombie Café* (2011). You run a post-apocalypse BBQ smokehouse staffed entirely by zombies you infect from your own customers. Smoke ribs, keep your crew from snacking on the guests, decorate the joint into a legend, and raid rival restaurants for their secret recipes.

![Logo](art/concepts/logo.svg)

## Play it

**On your iPhone:** open https://claude.ai/artifact/AceM4efaihGpTXtDs1MsDE and turn the phone sideways. Progress saves on the device.

The game lives in [`game/`](game/) (TypeScript + Phaser 4). `cd game && npm install && npm run dev` to run it, `npm test` for tests. See [07 — Build Log](docs/07-build-log.md) for everything that's in.

## The plan

| Doc | What's inside |
|---|---|
| [01 — Research](docs/01-research.md) | How the original played, what fans loved, what to fix |
| [02 — Game Design](docs/02-game-design.md) | Pillars, loops, every system, economy, FTUE, launch content |
| [03 — Art & Animation](docs/03-art-and-animation.md) | Style rules, palette, UI, Spine animation list, juice checklist, pipeline |
| [04 — Tech Plan](docs/04-tech-plan.md) | Web-first TypeScript + Phaser build (§0), Capacitor for the App Store, architecture, what you need for iPhone |
| [05 — Roadmap](docs/05-roadmap.md) | Step-by-step phases from setup to App Store and live ops |
| [07 — Build Log](docs/07-build-log.md) | What's playable now, how it's tested, what's next |
| [06 — Menus, Unlocks, Customers & Raid Rules](docs/06-menus-unlocks-customers.md) | Every screen and button, store tabs, level 1–50 unlock tree, full customer roster with rare spawns, raid and friend rules |

## Concept art

| | |
|---|---|
| ![Main screen](art/concepts/mockup-joint.svg) | ![Raid](art/concepts/mockup-raid.svg) |
| ![Zombie crew](art/concepts/characters-zombies.svg) | ![Customers](art/concepts/characters-customers.svg) |
| ![Palette](art/concepts/palette.svg) | ![App icon](art/concepts/app-icon.svg) |

*Original IP. Not affiliated with Capcom or Beeline Interactive. No assets from Zombie Café are used.*
