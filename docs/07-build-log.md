# 07 — Build Log

Each step is built small, tested, checked on an iPhone-landscape screenshot, then committed.

## Prototype 0.1 (Oct 2026) — the core loop is playable
Play link (private to the owner until shared): https://claude.ai/artifact/2P1H2yXZt5oxNg1FbHGt5f

**What works**
- Isometric BBQ joint (8×8) with walls, door, counter, grill, locked smoker, picnic tables, lawn, sidewalk and road.
- Cutout-puppet characters: walk / zombie shamble with arms forward / cook / eat / sit / nap lying on the lawn.
- Tutorial narrated by Gus the Zombie Union Rep, in the original's order: YOU cook → plate to counter → customers eat and pay → infect your first customer (free) → your zombie cooks → Energy lesson → rest.
- Cooking: tap a cook, then a stove, pick a dish; timers keep running while away; dishes burn if left too long.
- Customers: arrive by star rating (≈ 1 + half-stars), sit, wait, eat, pay with tips, leave with happy/angry faces; full house = they turn away angry.
- Zombie crew with the original's six stats; Patience-based HANGRY bites ("CHOMP!"), daydreaming (tap to snap out), resting, Brain Sauce refills.
- Level/XP, crew cap, smoker unlock at level 4, autosave, offline earnings (8 h cap) with a "Welcome back" report.

**Tests**: 83 unit tests (rules + art contract) and an iPhone smoke test that plays the full tutorial with real taps.

## Version 2 (Oct 2026): the whole game
Play link (private to the owner until shared): https://claude.ai/artifact/AceM4efaihGpTXtDs1MsDE

**Joint**
- 8×8 room that expands to 9, 10, 11 and 12; four themes (Shack, Roadhouse, Diner, Graveyard) restyle floors and walls.
- Shop with 7 tabs (Featured, Decor, Kitchen, Furniture, Walls, Special, Storage): 43 items across tables, chairs, benches, stations, counters, decor, wall hangings, money-makers, pet houses, the Brain Sauce keg and expansions.
- Decorate mode: buy and place, move (drag or tap), rotate, store, sell for 50%. Layout rules keep the door, stoves, counters and seats reachable.
- Grill, Barrel Smoker and Deep Fryer with 13 dishes (9 from levels, 4 secret recipes stolen in raids). Heat lamps, Brain Sauce "Finish now", cancel for 50% back, and a counter card with Discard.
- The OPEN/CLOSED sign: close before a raid so no new customers come and tired zombies nap.
- Rating = the lower of service (rolling customer moods; bites count triple) and decor (points ladder up to 5★). Tap the stars for the breakdown.

**People**
- 20 customer types from Accountant to Celebrity, each with a zombie form, six stats, a gag and an infect price. Rares show up more often once your stars beat their requirement.
- Patient Zero flow: YOU infect your first cook for free, then grow the crew (crew slots rise with level). Fire a weak zombie to make room for a better one.
- Zombiepedia (silhouettes until met), Crew list, Gus's goal clipboard (26 goals), Cookbook, Fridge (serve or study stolen food), pets (Zombie Pug finds cash; Rot-weiler joins raids).

**Raids**
- Road-trip map with 5 rivals: Chuck Wagon's Chow Hall (L2), Big Hank's Burger Barn (L4), Vegan Vera's Salad Fortress (L6), Colonel Crunch's Chicken Shack (L8), Le Snob Bistro (L10).
- Pick a squad (cooks can leave the stove; the food finishes alone). The horde lines up on the sidewalk; send one or SEND ALL. Tap a defender to focus it, or tap the counter to steal a dish.
- Gate, waiters, guard dogs, bug zappers, then the Head Chef storms out. Green/red grave markers (5 free a day), Healing Headstone and the Big Foot-Long summon.
- Action camera; brawls last about 20–60 s of the 2-minute clock. Win for cash, XP, Brain Sauce and the rival's signature recipe. KO'd zombies reanimate in 15 minutes, or sooner with Brain Sauce.

**Art and sound**: 42 joint characters (front and back views, 3 expressions each), 15 raid characters (5 bosses, 5 staff, monsters, pets), 120+ props, 5 rival arenas, the road map and 32 HUD icons, all drawn as code (SVG) in one cartoon style. Procedural sound effects (34) and music for the joint, the map and raids.

**Quality checks**
- 577 unit tests: rules, art contract, audio, a 2-hour random "monkey" soak with invariants, an economy bot that checks pacing (≈ L5 and 2★ by 30 min; 3.5★ and 3 rivals beaten by 6 h), and raid balance for every rival.
- `npm run smoke`: plays the game as an iPhone with real taps, from the tutorial through every menu, shop tab, decorating, expansion, themes, a full raid with a mid-raid level-up, save/reload, drag-to-move and the "welcome back" screen. Fails on any console error.
- `npm run gallery`: screenshots a decked-out 12×12 joint in every theme and every rival arena mid-fight, for art review.
- Texture memory on an iPhone screen: about 51 MB.

## Version 3 (Oct 2026): the faithful rework
Researched against the original's real gameplay and its decoded animation and layout data (facts and numbers only; see [10](10-original-animation-and-layouts.md)). No original code or assets were used.

**Look**
- Art v3: a grimy adult-cartoon style replaces the bright v2 art. Muted palette, ink outlines, stains and grime, two-tone shading.
- A corner lot with sidewalks and road on both street sides, plus matching scenery.
- A real front door: an actual doorway you can see through. The leaf swings open as people pass, and it has an OPEN/CLOSED sign you can tap.
- The cast is rebuilt to the original's construction: a huge 3/4 head (≈50% of height) and two-segment limbs that bend at the knees and elbows.

**Animation:** poses retuned to the original's decoded clips.
- walk: thighs ±24°, knee folding 55° a quarter-cycle behind, arms ±17°.
- idle: head-only sway.
- sit: thighs 64°/84°, shins hanging straight.
- eat: fork to mouth, then chew.
- carry: arms locked at 17°/7° with forearms at 44°/55°.
- cook: stirring.
- run: zombie lurch; humans run with hands to the head.
- raids: zombie claw, human punch and hit reaction; feast, serve and death fall.
- A dev pose sheet (`tools/poses.html`) shows every pose frame by frame.

**Rules and timing** (tuned to the original)
- Customers: they wait 60 s, eat for 30 s, and arrive every 18 s down to every 4.5 s as the rating rises.
- Walking: 1.4 + 0.125 × speed tiles/s; zombies are 20% slower.
- Raids: +5 HP per kill and 2 s to steal a dish. Rivals reopen after 4, 8, 12 and then 18 h under new management.

**Raids**
- Rival cafés laid out like the original's: 9×8 rooms, a kitchen along the back wall behind a divider with a serving counter, diners seated at tables, and the head chef at the stove.
- The squad lines up on the sidewalk.
- You select a zombie, then tap a target or the counter. You can also use ATTACK ALL, tombstones (5-second buffs) and summons.
- A neglected rival steals your customers. A boss food truck turns up from level 5.

**Fixes**
- Phaser 4.2.1's multi-texture shader compared an interpolated texture id with exact float equality, so half of a rotated sprite could vanish. It's patched at build time (`vite.config.ts`).
- Servers no longer walk into unreachable pockets.
- Economy rebalanced so an engaged player (the economy bot) reaches level 3 and 4 seats by 30 min, 2★ by 1 h, and level 6–12 with 1–3 rivals beaten by 6 h.

## Next steps
1. Playtest on a real iPhone: tune timers, prices and energy drain from feel.
2. Haptics, Home Screen icon and manifest, and a "photo mode" share card.
3. Capacitor iOS wrapper + TestFlight (needs a Mac + Apple Developer account).
4. Online features from doc 06 §6 (friends, franchise orders, friendly raids): these need a backend.
