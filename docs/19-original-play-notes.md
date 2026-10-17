# 19 — Playing the Original (Android build in BlueStacks): what it actually does

Observed 2026-10-17 on a fresh save of the Capcom Android build (1920×1080 landscape, local backend). Everything below is from screenshots and 10 fps frame dumps of screen recordings, not from code. Image names refer to files kept outside the repo (scratchpad `zc-release/shots/`): `tNN-*.png` are full-res screenshots (`-small` = 960 wide), `rN.mp4` are recordings with frames in `rN/f-NNN.png` (10 fps, 640 wide) and `rN-gN.png` / `rN-mN.png` are 2×2 / 3×3 contact sheets.

**Session stopped early (usage limit).** Reached: the whole tutorial up to "touch the map icon". Save state left running: **Level 2, $4762, 4 toxin, crew 2/2 (Donny the Hipster, Danielle the Retiree), one Mystery Meat ready on the stove, café open, tutorial dialog "touch the map icon" on screen (game paused on it).** Not reached: map/raid, zombie command strip, hungry attack, cookbook/to-do/Meat Locker pages, store tabs other than Furniture, pinch zoom. See §9.

Numbers from docs 08/10 that this session **confirms** are marked ✔; **corrections** are marked ✘.

---

## 1. Start state and HUD

| Fact | Original (observed) | Ours |
|---|---|---|
| Start cash / toxin | **$5000 / 5 toxin** ✔ (doc 10 §3.4) | $300 |
| Start level / XP | Level 1, XP bar "0/3 XP". Level 2 needs 3 XP; level 3 needs 12 ("1/12 XP"). | — |
| Start kit | Dirty stove, dirty sink, dirty fridge against the back-left wall; 2-tile blue counter; one plain table + one plain chair; door in the back-right wall with a "Sorry we're CLOSED" sign. Rat scurries across the floor (t31). ✔ | — |
| Awning HUD (top) | "YOUR CAFÉ", star row (rating), big level number, XP bar with "n/m XP" text (reads "LEVEL UP!" when full), `$` cash, toxin, round "ZC" button at the far right. | — |
| Top-left icon column | Appears **progressively during the tutorial**: shopping bag ($) → cookbook → crew head with "1/1" (after first infection) → **map** (after second infection). Each new icon carries a red tutorial marker. | always visible |
| Tutorial | Dialog panel at the bottom with the zombie chef mascot on the left and an olive OK button at bottom-right (≈1805,1018). **The simulation is frozen while any dialog is up** (customers, timers, cooking all stop). A red arrow bounces over the thing to touch. | — |

Screens: `s00-start`, `t01-after-ok`, `t19-after-ok5`, `t29-after-levelup`.

Camera: the tutorial **pans and zooms the camera itself** to frame each target (after OK on the first dialog it zoomed in ~1.6× and centred the door; selecting the chef panned to the stove). Characters are ~1/3 of screen height at that zoom. Pinch-zoom limits not tested.

---

## 2. Cooking (full flow, timed)

Flow = **select cook → touch stove → cookbook → COOK**. The cook walks there afterwards; the dish and its timer start *immediately* on COOK, before he arrives.

| Step | Original | Ours |
|---|---|---|
| Select cook | Tap the chef → bottom chalkboard card "YOU" + red energy bar + red X at right; a **green disc** appears under the selected character's feet and the camera pans to the stove (tutorial). | tap → command strip |
| Touch stove | Opens **The General Cookbook** full-screen (`t04-stove-01`, `t34-cookbook2`). The stove tile is tinted green while targeted. | COOK/ORDER UI |
| Cookbook layout | Wood shelf header with two tabs: fork/spoon (recipes) and a green zombie-hand tab (toxin/variants?, not opened). Ring-bound paper page: "n/80" recipes at top-left, "RANK: Fresh Corpse Chef" top-right. A horizontal strip of 6 recipe slots (locked ones are black bombs numbered **with the level that unlocks them**: 2,3,4,5,6…), red arrow to scroll. Below: big dish picture with a green COOK button under it; price "$8" and "LEVEL 1" at left; a stat column **READY IN / SERVINGS / TOTAL EARNINGS / TOTAL XP**. Bottom row: 10 variant icons (Spicy×2, Fancy×2, Bulk, Fresh, Frozen, Quick×2…) each with a toxin price tag. | recipe list rows |
| Recipes seen | **Mystery Meat**: $8, Lv1, ready in **2M**, 12 servings, total earnings 12 ($1/serving), total XP 1. **Dishwater Soup**: $125, Lv2, **15M**, 50 servings, earnings 150, XP 5. ✔ (doc 08 "thin margins, XP engine") | — |
| COOK pressed | Cash −$8 at once; a **steel pot appears on the stove at once** (no cook present yet); card text "YOU — COOKING"; cookbook icon appears in HUD. Chef then walks from the door to the stove (`r2`): ~5 tiles in ~5 s. | timer starts on arrival |
| Cook position | He stands on the tile **behind/beside the stove (NE of it) facing it**, "operate" pose, and stays (`r2-g2`). No timer bar or bubble over the stove while cooking; the only progress read-out is the stove card. | must stay ✔ (same) |
| Stove card (tap stove while cooking) | Dish icon, name, countdown "1M, 54S", two buttons: **FINISH** (toxin icon + clock) and **DISCARD** (trash). `t07-stove-menu`. | — |
| FINISH | Confirm "DO YOU WISH TO USE 1 TOXIN?" → USE TOXIN / CANCEL (`r3-g1`). Toxin 5→4, dish done instantly. | — |
| Done cue | A **speech bubble with a green check** over the cook (`r4-g1`); stove card reads "READY!" (`t10`). Dish stays in the pot on the stove until picked up. | plated on stove |
| Getting food to the counter | **Select the cook, then touch the food/stove**: he picks up a plate (pot vanishes), "carry" walk to the counter (2 tiles, ~2 s), sets it down; a **"+1 XP" float** appears on placing it and the counter shows the plate with a **serving count "12"** (`r5-g1/g2`). XP is awarded here, not on cook completion. | tap stove to plate; worker carries |

Real (un-skipped) cook of Mystery Meat started 00:23:40; it was ready before 00:27 (interrupted by dialog pauses, so the 2 min could not be measured exactly).

---

## 3. Serving, eating, paying (timed from `r6`)

| Step | Original | Ours |
|---|---|---|
| Who serves | In the tutorial you **select the chef and touch the counter**; he takes one plate (counter 12→11), card says "Serving". Later, **the zombie Donny served Danielle on his own**, uncommanded (`t42`): zombies auto-serve from the counter. | servers auto-pick nearest dish |
| Carry | Plate in hand, walks to the **tile next to the table** (2 tiles ≈ 2.5 s), puts the plate on the table (`r6-g1/g2`). | — |
| Server during the meal | **Stays standing beside the table in "Serving" for the whole meal** (12 s here) and only frees up when the customer finishes (`r6-m1/m2`). | leaves immediately |
| Ordering | No thought-bubble order; the customer sits with one arm raised ("waiting" wave, `r5-g1`) and accepts whatever dish comes. ✔ (doc 08) | no specific dish (same) |
| Eat time | Plate down at f-050 → finish at f-168 = **11.8 s** (tutorial value; doc 10 says 10 s tutorial / 30 s normal). | — |
| Finish cue | **Smiley thought bubble** over the customer + a small **"$1" float** rising from the table; plate becomes an empty dirty plate; cash +1 (`r6-m4`, `t15`: 4992→4993). No flying coins. Rating stars unchanged at this point. | coins fly |
| After eating | Customer stands, walks to the door and out (`t15`), the dirty plate stayed on the table; by `t31` the first table was clean again (cleared off-screen during the tutorial pause — who cleared it was not seen). | — |

---

## 4. Customers and movement

- Customers come along the **outside sidewalk** past the back-right wall and turn in at the door; the first one appeared outside within 20 s of the café being touched, while the sign still said CLOSED (`t01`, `t07`). Several just walked past on the sidewalk without entering while the café was closed (`r6-g1` old lady, `r6-m3` man).
- Door open → a customer entered **immediately** (one was already waiting on the step: `t40`).
- Customers walk straight from the door to the chair and sit **facing the table** (chair placed on the tile NW of the table; the diner faces SE toward the camera). One customer per table ✔.
- **No queue seen** (only two customers in the café at once; the second, Danielle, took the new table).
- Walking speed (chef, `r2`): door → stove ≈ 5 tiles in ≈ 5 s → **~1 tile/s** at tutorial zoom (rough; doc 10's 2.0 tiles/s for chefs looks high — ✘ re-measure with a longer path). Floor tile at the zoom of `t31` ≈ 330 px wide on the 1920 screen.
- Arrival rate: not measurable this session (the tutorial froze the sim most of the time).
- Door: tapping it **opened the café instantly with no OPEN/CLOSE menu** (door swings open, sign disappears, `t40-door-tap`). Note: later shots (`r10-g4`, `t44`) show the CLOSED sign back on the door while customers still came — unclear whether the tutorial re-closes it.

Ours: 4-way A*, random seat, 1 s door pause, no queue — directionally the same; the original's "walk past on the sidewalk" ambient traffic is missing in ours.

---

## 5. Infection (critical) — two captures, `r7` and `r11`

| Step | Original | Ours |
|---|---|---|
| Tap a customer | Bottom card: **name + type** ("DONNY / HIPSTER", "DANIELLE / RETIREE"), red energy bar, and buttons **INFECT** (biohazard icon, price tag "$0" at this level) and **INFO** (i icon; INFO was absent on the very first tutorial card). Button order left→right: INFECT, INFO. `t16`, `t42`. | instant on tap |
| Press INFECT | **No confirmation.** The customer instantly turns and **runs for the door, arms up** (startled/run pose, `r7-g2`), his tile ringed green. The **nearest zombie-side character gives chase** with arms stretched forward ("attackHuman" pose). In `r7` the chaser was the chef (only crew); in `r11` it was **Donny, the idle zombie**, not the chef (the chef was busy at the stove). | zombie hunts ×1.3 |
| Chase | Chaser and runner move at **about the same speed** (`r7-m1`: both ~1 tile per 0.5 s). The customer ran to the door, could not exit (café was CLOSED), bounced back along the wall and was caught after **~5.5 s** (INFECT at ≈f-030, caught f-085). In `r11` Danielle was seated with Donny already adjacent → caught in **<0.5 s**. | flee ≥3 tiles/s |
| Other customers | Only one other diner existed; she kept eating. No screaming/fleeing by others seen. | — |
| Catch → transform | **No bite or feast clip visible.** When the chaser reaches the adjacent tile the human sprite is swapped for the zombie version within one or two frames at 30 fps (`r7-hi1`, h-013→h-014). No puff, flash or card. | — |
| New zombie look | Same hair, glasses, clothes and name; skin green, eyes/teeth zombified (`t19`, Donny keeps his hipster outfit). | — |
| First state | Stands idle next to the chaser; **no stats card/popup**. The HUD crew counter appears/increments ("1/1" → "2/2") with a green zombie head icon. Donny then **wandered on his own** and later **auto-served** a customer. | — |
| Crew cap | 1 at level 1, **2 at level 2** ✔ (doc 10 §3.4 table). Meat Locker message not reached. | — |

Frames: `r7-g1..g4`, `r7-m1..m3`, `r7-hi1`; `r11-g1..g4`; stills `t18-infect-01..12`, `t45-infect2-01..10`.

---

## 6. Store (Furniture tab only)

- Opened from the shopping bag. Tabs across the top, in order: **FEATURED, DECOR, UTILITY, FURNITURE, WALLS/FLOORS, SPECIAL**, red X at right (`t21`). Ours: Featured/Decor/Kitchen/Furniture/Walls & Floors/Special/Storage ✘ — the original says UTILITY (not Kitchen) and has no Storage tab here (the Meat Locker is a HUD icon).
- Item strip: a single horizontal row of icons with the **price under each** and a red arrow to scroll; no name, level or star value on the strip itself.
- Furniture row seen: Plain table 150, Plain chair 75, Yellow/Green/Blue/Red tables 200 each, Yellow chair 100, (next) 100…
- Tap an item → it appears as a **ghost in the café on a green tile**, existing furniture goes translucent, a **green rotate button** floats above it, and **all valid tiles (adjacent to tables, for a chair) glow green** ("the green boxes", `t25`). Bottom panel: flavour text ("Just a regular ol' table."), "Drag the new item to place it.", **TOTAL COST: $150 / +2XP**, green **PURCHASE** button (`t22`).
- Placement = **drag, then PURCHASE**; buying grants XP at once ("+2 XP" float, `t24`; chair +1 XP). Buying the table+chair took the café to Level 2 (3 XP).
- Level-up panel (`t27`): "LEVEL UP! Your café has reached LEVEL 2", "YOU CAN NOW COOK: Dishwater Soup" on a pinned note, blue SHARE button (Facebook — not pressed), OK.

Not reached: other tabs, expansion item, walls/floors, item sell/move.

---

## 7. Zombie command strip, hungry attack, raid, other HUD

**Not reached** (session cut at the "touch the map icon" dialog). Observed in passing:
- Selected chef card shows only "YOU" + energy bar + state text (COOKING / SERVING); the zombie card was not opened.
- Zombies idle-wander and auto-serve without commands (§3, §5).
- Idle gag seen: chef scratches his face while idle (`t32`); rat crosses the floor (`t31`).
- The map icon appears in the HUD only after the second infection (level 2).

---

## 8. Animation feel (from the recordings)

- Walk is a flat-footed shuffle; carry pose holds the plate at chest height in both hands; the serve is a short bend at the table.
- Run (fleeing customer): arms straight up, lean forward, clearly faster leg cycle; chaser runs with both arms stretched forward.
- Sit/eat: diner faces the table, one arm raised while waiting; the eat loop is small head/arm motion for the whole 12 s.
- Feedback floats: "+n XP" in cyan, "$n" in white, thought bubbles (smiley when happy, "$" when paying), green-check speech bubble when the dish is ready. Everything is short (≈1 s) and understated — no particle effects seen.
- Camera: tutorial-scripted pans/zooms with ease-out (~0.5 s).

---

## 9. Not reached and why

Usage limit hit ~40 min in; the tutorial froze the sim on every dialog so very little free play happened. Still to do, in priority order: (1) map → first raid (map icon is now unlocked); (2) zombie command strip (tap Donny/Danielle: SERVE/REST/ENERGIZE/INFO…); (3) hungry attack (needs a zombie to run low on energy; ZOMBIE_ATTACK_INTERVAL 60 s per doc 10); (4) other store tabs, expansion; (5) cookbook/to-do/Meat Locker pages, ZC button; (6) speed measurements with a long open-door walk; (7) pinch zoom and pan limits. Save state: Level 2, $4762, 4 toxin, crew 2/2, café open, Mystery Meat ready on the stove.

Practical notes for whoever resumes: `adb shell input tap` is ignored — use a 120 ms swipe; set `MSYS_NO_PATHCONV=1` for `screenrecord /sdcard/...`; helper functions live in `zc-release/h.sh` (press/drag/shot/rec/pullrec/grid/m9). The INFECT button is the **left** button when INFO is present (≈1480,1010) and the only button (≈1710,1010) on the first tutorial card.
