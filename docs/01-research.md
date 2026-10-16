# 01 — Research: How Zombie Café Played

Zombie Café was a free-to-play iOS restaurant sim from Beeline Interactive (a Capcom subsidiary). It launched on iOS on 26 January 2011, later came to Android, and has since been pulled from both stores. Zombs BBQ is a spiritual successor. We keep the *feel* and build a fully original game with its own name, characters, art and code. No Capcom assets, names or likenesses are used.

## The core loop of the original

```
 Buy & cook dishes ──► Zombie waiters serve ──► Customers pay cash + XP
        ▲                                                  │
        │                                                  ▼
 Unlock recipes ◄── Raid rival cafés ◄── Infect customers into new zombies
        │                                                  │
        └──────────── Buy furniture / decor / expand ◄─────┘
```

| System | How it worked | What made it stick |
|---|---|---|
| **Cooking** | You pay cash up front for a dish on a stove. It cooks on a real-time timer, then sits on the counter with a serving count (e.g. "37"). Each dish has its own cost, cook time, servings and XP. | "Come back in 4 hours" timers gave you a reason to check in, and the counter of stacked dishes felt satisfying. |
| **Zombie staff** | All waiters are zombies. Any customer can be *infected*, and every customer type has a unique zombie form. | Collecting zombies: cops, nurses, construction workers, later B-movie monsters. |
| **Energy** | Zombies lose energy as they work. At low energy they **attack customers**, which drops your café rating. They rest to recover, or you spend **Toxin** (the premium green currency) to refill them instantly. | The joke is great, but this was also the main paywall and the main frustration. |
| **Café rating** | 1–5 stars driven by decor, food and service. More stars means more and richer customers. | Visible goal, cosmetic progression. |
| **Decorating** | Isometric room: place tables, chairs, stoves, counters, walls, floors and novelties, and buy expansions. Players built huge themed cafés (see the "Kraken's Café" reference shot). | Self-expression. The late game was basically a dollhouse. |
| **Raids** | Send zombies to attack another café (friend or NPC). Zombies walk in a line with health bars, fight defenders and steal dishes and recipes, sometimes Toxin. | The only "action" in the game. It turned your collection into an army. |
| **Social** | Game Center friends, Facebook "franchises", visiting friends' cafés. | Showing off, plus raid targets. |
| **Events/updates** | Themed packs (Victorian Britain, 50s, B-movie monster zombies), pets, holiday decor. | New collectables kept veterans around. |

## What players loved (keep this)

1. **The premise and humor.** Zombies serving food and occasionally eating a customer.
2. **The look.** Chunky isometric rooms, thick outlines, chibi characters with big heads. Readable and charming on a small screen.
3. **Collecting zombies.** Every customer is a possible new zombie.
4. **Decorating freedom.** Fully customizable rooms and expansions.
5. **Low-stress, check-in play.** Short sessions, timers, coming back to a full till.

## What hurt it (fix this)

| Pain point | Fix in Zombs BBQ |
|---|---|
| Energy/Toxin was a hard paywall. Zombies broke down constantly unless you paid. | Hunger is a **management mini-system** (nap coffins, auto-feeders, Brain Sauce earned in play), not a paywall. Brain Sauce is earned generously and never sold as the *only* fix. |
| Gameplay was mostly passive: tap, wait, tap. | **Active cooking moments** (optional timing taps for bonus quality), **rush hours**, **customer requests**, and **real-time raids** with abilities. |
| Raids were "send and watch", with little skill. | Light **lane-strategy raids**: choose deploy order and timing, trigger abilities, and counter specific defenses. |
| Long dead time early on. | A tight first-hour FTUE (first-time user experience) with fast early timers and a story hook. |
| Dated tech: low-res sprites, no cloud saves, it eventually died with its servers. | 60 fps, Retina-sharp vector/skeletal art, iCloud + account cloud saves, **offline-first** design so the game keeps working. |
| Game Center/Facebook social that has since aged out. | Crews (guilds), friend codes, visiting, tipping, co-op events, shareable joint photos. |

## Market check (2026)

The "cozy restaurant sim" genre is still healthy on iOS (Cooking Fever, Restaurant DASH-likes, Hay Day-style builders). The "**zombie + food + decorating + light raiding**" mix has had no real successor since Zombie Café was delisted. Players are still nostalgic for it: fan revival sites exist and browser re-hosts show up on game portals. That gives a strong hook for a modern spiritual successor, and the original's pain points are clear enough to design against.

## Sources

- [Zombie Cafe, Wikipedia](https://en.wikipedia.org/wiki/Zombie_Cafe)
- [Zombie Cafe, Capcom fandom wiki (mirror)](https://breezewiki.discard.no/capcom/wiki/Zombie_Cafe)
- [Zombie Café, TouchArcade](https://toucharcade.com/games/zombie-cafe)
- [Zombie Café, Apptopia listing (update history)](https://apptopia.com/ios/app/407401359/about)
- [Zombie Caf 1.2.6, B-movie monster zombies update (Softpedia)](https://mac.softpedia.com/blog/Download-Zombie-Caf-1-2-6-iOS-Starring-5-New-B-Movie-Monster-Zombies-319384.shtml)
- Reference screenshots supplied by the project owner (early café, raid line, max-level Western café, themed late-game café).
