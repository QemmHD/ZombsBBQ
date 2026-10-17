# 21b — Rebuild: HUD, controls, store and tutorial

Branch `rebuild/ui` (off `feat/fix-and-features`). Scope: everything the player touches outside the
simulation itself: the camera, the awning HUD, the character command strip, the store and placement,
the tutorial overlay, chef avatars and the sim features that had no screen yet. The sim core
(movement, infection chase, cooking/serving, bites, rating, start state) and raids are rebuilt on
their own branches; this branch talks to them only through `Controller` and a few small, separate
sim modules (`src/sim/chefs.ts`, `src/sim/locker.ts`).

Sources: doc 19 (play notes from the real game), doc 08 §1.4 (HUD), doc 16 §H/§J/§M (Meat Locker,
avatars, extra features), doc 17 §2.3 (avatar stat rows). Rule as always: the original's facts and
numbers, our own art, words and code.

Line numbers in the "ours" column are for `feat/fix-and-features` at 61e923f, before this rebuild.

---

## 1. Camera

| The original | Ours (before) | The change |
|---|---|---|
| Close in: the room fills the screen and you drag to see the rest. At the tutorial zoom a floor tile is ~330 px of a 1920 px screen (17%) and a character ~1/3 of the screen height (doc 19 §1, §4). | `JointScene.baseZoom` (`src/scenes/JointScene.ts:337`) fits the whole room *inside* the screen (`min(cssW·0.92/roomW, cssH·1.18/roomH)`), so a 7×6 room sits small in the middle with lawn all round. | Base zoom *covers* the screen instead: the floor diamond is at least as wide as the screen and the room at least as tall as the space under the awning. Clamped so a tile is never wider than ~19% of the screen (huge rooms stay pannable, not giant). Pinch range stays 0.55–2.2× of that. |
| The tutorial pans and zooms the camera itself to frame each target, ease-out ~0.5 s (doc 19 §1, §8). | No camera moves except a wall-hanging ghost pan (`JointScene.ts:681`). | `JointScene.focusOn(x, y, zoomMul)`: a 0.5 s ease-out pan (+ optional zoom) that frames a world point above the command strip. Used by the tutorial per step, and when a selection would sit under the strip. |
| Camera bounds: the lot. | `setBounds` (`JointScene.ts:323`) with 40% sideways slack added so the room could be dragged out from under the big card. | The slack goes (the strip is short, nothing big covers the room); bounds keep the awning clearance and add the strip's height at the bottom so the front row of tiles can be scrolled above it. |

## 2. HUD (awning + icon column)

| The original | Ours (before) | The change |
|---|---|---|
| A full-width striped awning: "YOUR CAFÉ", star row, big level number, XP bar with "n/m XP" ("LEVEL UP!" when full), `$` cash, toxin, one round "ZC" button at the far right (doc 19 §1, doc 08 §1.4). | Already there from the visual pass: `hud.ts:92` + `theme3.css` §awning (name, stars, level star, XP bar, cash, Brain Sauce, round ZB button). | Kept. Checked against doc 19: (a) XP text reads **LEVEL UP!** for the moment the bar is full; (b) the name is the joint's own name (`jointName`) and tapping it renames (it was the rating button; stars still open the rating card); (c) the ZB button opens the menu (settings, chef, help) — the original's one round button. |
| Top-left icon column, revealed **progressively** in the tutorial: shop bag → cookbook → crew head "n/m" → map (doc 19 §1); each new icon carries a red marker. Storage crate after the crew head (doc 08 §1.4). | All icons always visible (`hud.ts:100–116`), right-hand column with sign, fridge, Zombiepedia. | Icons appear as the tutorial reaches them (`tutorialIcons()`); after the tutorial everything shows. New-thing badges from `hints.badges()` (the bouncing "!") on shop, cookbook, crew, Zombiepedia and map. |
| Hints: Gus's contextual tips, one-shot (doc 16 §M). | `hints.ts` (`nextHint`, `showHint`, `GUIDE_TEXT`) exists but nothing calls it (doc 11/13 audit). | The HUD asks `nextHint` every refresh and shows the line on Gus's chalkboard bar (§5), without freezing. |

## 3. Command strip (replaces the big context card)

| The original | Ours (before) | The change |
|---|---|---|
| Selecting a character shows a slim chalkboard plate at the bottom ("YOU" + red energy bar + state text + red X) and a **row of green sticker buttons**: Serve, Infect, Rest, Energize, Info, Upgrade, Destroy, Recipes, Photo, Attack, Revive, Discard, Salvage, Transform, Meat Locker, Work, Finish; the stove shows Cook and Order. Only the buttons that apply are shown (doc 19 §2, §5, §7; RESTART-HERE). | `Hud.renderCard` (`hud.ts:286–432`): a 340 px chalkboard card on the right with portrait, stat chips, bars, text and up to three buttons. It covers a third of the screen, and in the tutorial it sits on top of the grimy stove — the smoke test fails at that step. | `src/ui/strip.ts`: a ~64 px strip along the bottom: a name plate (portrait, name, energy/progress bar, one line of state) then sticker buttons, then the red X. Stats, perks, flavour text and the stove's upgrade details move to **Info** (a modal). The dish picker stays a modal (the original's cookbook is full-screen). The strip never covers the middle of the screen, so the tutorial's stove stays tappable. |

Which buttons show (our features mapped onto the original's verbs):

| Selection | Buttons (when they apply) |
|---|---|
| YOU (the chef) | **Recipes** (cookbook) · **Transform** (chef picker, §6) · **Energize** (refill, when not full) · **Info** · **Photo** |
| Zombie at work | **Work** (when daydreaming, asleep or napping: back to work) · **Rest** · **Energize** · **Attack** (the Eat! order: then tap a customer) · **Meat Locker** (hang them up) · **Info** · **Destroy** (two taps) |
| Zombie knocked out (raid) | **Revive** (toxin) · **Info** |
| Customer (seated / walking in) | **Infect** (price tag, "FREE" with the tutorial freebie) · **Info** |
| Stove, empty | **Cook** (the cookbook/dish picker) · **Order** (the last dish cooked here, one tap) · **Upgrade** |
| Stove, cooking / paused | **Finish** (toxin) · **Discard** (two taps, half back) · **Info** |
| Stove, done | **Serve** (carry it to the counter) |
| Stove, burnt | **Salvage** (scrape it off) |
| Counter | one **Discard** per dish on it ("Bin it") · **Info** |
| Table, sink, money-maker, keg, pet house, tombstone | **Info**, plus **Upgrade** (stoves, tombstones), **Serve**-style collect ($) on money-makers |

`data-a` names stay the ones the smoke test already uses (`infect`, `rest`, `refill`, `finish`,
`cancel`, `discard`, `fire`, `collect`, `wake`) and gain `info`, `recipes`, `chef`, `photo`, `eat`,
`locker`, `cook`, `order`, `upgrade`, `serve`, `salvage`.

## 4. Store

| The original | Ours (before) | The change |
|---|---|---|
| Tabs: FEATURED, FURNITURE, DECOR, WALLS/FLOORS, UTILITY, CASH, SPECIAL, plus item storage (doc 19 §6 saw six; doc 16 §M Help adds Cash items and Item Storage). | `store.ts:9`: Featured, Decor, **Kitchen**, Furniture, **Walls & Floors**, Special, Storage. Money-makers are mixed into Special/Decor. | Tabs **Featured, Furniture, Decor, Walls/Floors, Utility, Cash, Special, Storage** in that order. Utility = the sim's `kitchen` tab (stoves, counters, sinks, fridges). Cash = every money-maker (`kind: 'moneymaker'`), pulled out of the other tabs. `data-id`s: `featured, furniture, decor, walls, utility, cash, special, storage`. |
| Item strip: one horizontal row of icons with the price under each, a red arrow to scroll; no names on the strip (doc 19 §6). | A wrapping grid of cards with name, price, rating tag. | One horizontally scrolling row of item tiles, price under each; the name shows only on the selected tile's flavour panel. Locked items show their level on a black tag. |
| Tap an item → a **ghost on a green tile** in the café; existing furniture goes translucent; a **green rotate** button floats over it; every valid tile glows green; bottom panel: flavour text, "Drag the new item to place it.", **TOTAL COST: $150 / +2 XP**, green **PURCHASE** (doc 19 §6). | Ghost tinted green/red, one footprint diamond, a decorating toolbar with Rotate / Buy / Cancel (`editbar.ts:49`). | Placing: valid tiles glow green (`placeableTiles`, computed in the controller), other furniture fades to 45%, the ghost's own tile is green/red. The toolbar becomes the original's purchase panel: flavour text, "Drag the new item to place it.", **TOTAL COST** and **+n XP**, a green **PURCHASE** (`data-a="ok"`), a rotate button and cancel. Buying gives the XP float. |

## 5. Tutorial

| The original | Ours (before) | The change |
|---|---|---|
| Gus-style mascot on a **chalkboard bar along the bottom**, olive OK at bottom-right (doc 19 §1). | Gus's badge + a yellow legal-pad bubble at bottom-left (`hud.ts:117`), always up while the tutorial runs, never dismissed. | `src/ui/tutorial.ts`: a full-width chalkboard bar along the bottom with Gus on the left and an olive **OK** on the right. |
| **The simulation is frozen while any dialog is up** (doc 19 §1). | Never frozen. | While the bar is up the controller skips `tick` (`Controller.frozen`). OK hides it and the sim runs; the step's target keeps its arrow. Each tutorial step opens the bar once. |
| A **red arrow bounces over the thing to touch**. | None. | `tutorialTarget(state, selection)` (pure, `src/game/tutorial.ts`) says what to point at: YOU, the stove, the counter, a customer, the first zombie, the door, or a HUD button. The scene draws a bouncing red arrow over world targets; the HUD puts one over buttons. |
| The camera pans/zooms to frame each target. | — | On OK the camera eases to the target (`focusOn`, 1.25× closer). |
| Start: closed sign, the chef standing at the glass front door. | Start state is the sim branch's (`createInitialState`, `state.ts`), open, YOU at (DOOR_X−1, 1). | For a brand-new save the controller flips the sign to CLOSED and stands YOU on the tile inside the door (a hook, so it works whatever the sim branch's start state is). The tutorial points at the door when customers are needed ("open up") — the step that also opens the café in the original. |

## 6. Chef avatars

| The original | Ours (before) | The change |
|---|---|---|
| 9 starting chef looks on a choose-chef screen, changeable any time; stats **Tip Rating, Attack Speed, Attack Strength, Energy**; perks Cook Speed, Tip Multiplier, Zombie Regen, Cook XP (doc 16 §J; doc 17 §2.3: the starting chef row is Energy 90, Spd 5, Str 4, Tips 3; unlockables have their own rows). | One fixed look (`you` in `art3/chars/cast.ts:743`), `YOU_STATS` in `data.ts:404`. | `src/sim/chefs.ts`: 9 avatars (our own characters), each with Tip Rating, Attack Speed, Attack Strength and Energy on the original's scale (base chef = 3/5/4/90; the others trade one stat for another, all around the same total, so it's a look choice with a small flavour, not a pay wall), and an optional perk (cook ×, tips ×, regen ×, XP × ≤ 1.1). `setChef(s, id)` swaps YOU's stats (energy kept as a fraction). Art: 9 new Looks `chef_*` on the v3 rig. Picker: the ZB menu → **Chef**, and **Transform** on YOU's strip; a 3×3 grid of portraits with the four stats as bars. |

## 7. Dormant sim features, now on screen

| Feature (sim) | Where it shows now |
|---|---|
| Hints (`nextHint`/`showHint`/`hintEvent`/`hintTick`) and the guided first table + chair (`guideStep`, `GUIDE_TEXT`) | Gus's chalkboard bar, non-freezing, with OK; one at a time, `HINT_GAP` apart, held while a menu is open. |
| Badges (`badges`, `markSeen`) | A bouncing "!" on shop / cookbook / crew / Zombiepedia / map; opening the menu clears it. |
| Alerts (`upcomingAlerts`) | Settings → "Coming up": the next four check-ins (dish done, burn soon, revived, rival reopens) — what the iOS wrapper will schedule as local notifications. |
| Eat! (`orderEat`) | **Attack** on a zombie's strip, then tap a customer (strip says "Tap a customer"). |
| Rest-all (`restTired`) | Crew list header button "Rest the tired ones". |
| Union-break toggle (`unionBreak`, `setUnionBreak`) | Settings switch. |
| Zombie level and perks (`zombieLevel`, `perk`, `PERK_LABEL`) | Level badge on the strip's name plate and the crew rows; perks as chips in Info. `zombieLevel` events toast "n reached level L". |
| Skip (`skipTodo`) and the reviewer card (`criticReview`) | To-do rows get **Skip** (once per list); a purple star opens the critic's newspaper review card. |
| Bin (`binFridge`) | A **Bin** button per fridge row. |
| Welcome-back counts (`AwayReport`) | The welcome-back card lists served, unhappy, bitten, burnt and the rating change, not just the cash. |
| Load-backup screen (`Controller.loadProblem`, `loadBackup`, `startFresh`) | A blocking card at boot when the save won't load: one row per backup (time, level, cash, crew) + "Start fresh". |
| Rename (`renameJoint`, `jointName`) | Tap the joint's name on the awning. |
| Meat Locker (doc 16 §H: 5 hooks, +5 per 5 toxin, max 50, needs a free crew slot to take one out) | `src/sim/locker.ts` + a crate icon in the HUD column, a locker page, and **Meat Locker** on a zombie's strip. |

## 8. Verification

`npm test`, `npm run typecheck`, `npm run build`, `npm run smoke` (must pass, including the tutorial
stove step), `node tests/devices.mjs` (four iPhone sizes, no HUD overlaps), and a look at the
screenshots. Results and screenshot paths are in the branch's final report.
