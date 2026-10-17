# 21a — Core loop rebuild: movement, infection chase, cooking/serving, joint attacks, rating, start state

**Why.** The owner's direction (RESTART-HERE): "movement, infection (the zombie must chase the customer),
attacks, … cooking … are wrong". This doc puts each system side by side: what the original did (from the
decompiled rules in doc 16 and the BlueStacks play-through in doc 19, numbers from doc 17), what ours did
before this branch (`file:line` on `feat/fix-and-features` @ 61e923f), and what we change. Rules are
reimplemented in our own code; nothing of Capcom's is copied.

Branch: `rebuild/core`. Code: `game/src/sim/*` (rules, with tests), `game/src/scenes/JointScene.ts` and
`puppet.ts` (what it looks like). Where we keep a deliberate deviation it is marked **Deviation**.

---

## 1. Movement

| | Original | Ours before | Change |
|---|---|---|---|
| Speed formula | `getSpeedMultiplier` = **2 + 0.2·Speed** (doc 16 §D, doc 10 §3.1). Time per path unit ÷ that multiplier. | `walkSpeed = 1.4 + 0.125·Speed` tiles/s (`data.ts:519`, `TUNING.baseWalkSpeed`/`walkSpeedPerStat` `data.ts:416`). | `tilesPerSec(stat) = TUNING.tilesPerSpeedUnit × (2 + 0.2·Speed)`. |
| Absolute pace | Code: ≈2.0 tiles/s at Speed 5. Observed (doc 19 §4, §5): chef walks door→stove ≈ **1 tile/s**; chaser and runner ≈ **2 tiles/s** while running. | Speed 4 ≈ 1.9 tiles/s walking. | `tilesPerSpeedUnit = 0.4`: chef (Speed 5) walks 1.2 tiles/s, runs 2.0; a Speed-4 customer walks 1.12, runs 1.87 — both observed figures. |
| Zombies | **×1.2 time** per path unit (`ZOMBIE_SLOWDOWN_MULTIPLIER`), i.e. 1/1.2 speed. | ×0.8 (`TUNING.zombieWalkMult`, `sim.ts:31`). | ÷1.2. |
| Running | "Hurry"/`run` moves take **0.6×** the time (= ×1.67 speed): panicking and fleeing customers, fired zombies, the infect chaser (doc 16 §D table). | Fleeing customers `max(3.0, 1.67×)` (`sim.ts:713`); hungry hunters ×1.3 (`sim.ts:197`); fired zombies ×0.8 (`sim.ts:597`). | One `RUN = 1/0.6` factor for panic, flee, fired and the infect chase. Attackers walk at normal pace (AttackTask uses a plain walk, doc 16 §B). |
| Pathing | Tile-grid `CFPathFinder`; tasks fail with no path ("can't reach"). Diagonals UNKNOWN. | 4-way A* on tiles, walls block except the door (`grid.ts` `findPath`); "can't reach" events (`sim.ts:149`). | Unchanged (4-way). |
| Arrive | Walker stops on the target tile and faces what it uses. | Same (`faceTowards`, `sim.ts:142`). | Unchanged; plus a "follow" mode (re-path to a moving target's tile every 0.3 s) for the infect chase and attacks. |
| Wander | Idle zombies wander on their own (doc 19 §5, Donny); `ZOMBIE_IDLE_TIME` 60 s. | Idle zombies stand still until a job comes up. | Idle zombies stroll to a nearby free tile every 6–14 s (YOU stays put); a job interrupts the stroll. |

Raids (`raid.ts`, not owned here) still use the old `walkSpeed`; it is left in `data.ts` for them.

---

## 2. Infection chase

| | Original | Ours before | Change |
|---|---|---|---|
| Button | Customer card: INFECT (price tag) + INFO; **no confirm** (doc 19 §5). | INFECT on the customer card (`hud.ts`). | Unchanged (HUD helper's area). |
| Checks | Crew cap first, then cost (doc 16 §A). | Same order (`sim.ts:537`). | Unchanged. |
| Cost | Per customer type, not per level: the starting crowd is **free** ("$0" at level 1); later types cost cash ($100 Politician … ) or toxin (Cop T1 … Sumo T30) (doc 17 §2.2). | Per type (`CustomerDef.infect`, `data.ts`), first infection free (`freeInfects`). | Unchanged: our prices already follow the same shape (common types free). The first-free coupon stays (harmless at level 1, where every type is free anyway). |
| Runner | **Immediately runs for the door, arms up**; can't get out (café closed in the capture), bounces back along the wall (doc 19 §5, `r7`). (Doc 16 §A reads the code as "the customer does not flee"; the capture wins.) | Customer stays put, shivers green for 1.6 s, then turns (`sim.ts:550`, `:853`). | New customer state flow `infecting`: run (×1.67) to the door tile, rattle it, then run to the free tile farthest from the chaser; repeat. They never get out. |
| Chaser | The **nearest** crew member — chef or an **idle zombie** (Donny chased while the chef cooked, `r11`) — runs after them, **arms forward**, at about the runner's speed. | None. | Nearest free crew member (idle / daydreaming / serving zombie, or YOU); if nobody is free, YOU drops what he's doing. New worker state `chasing`, follow mode, run pace. The runner is held to 95% of the chaser's pace so the catch always happens. A cook who chases goes back to the stove afterwards. |
| Catch time | ≈**5.5 s** across the room; **<0.5 s** when already adjacent. | — | Catch = chaser within 1 tile. Safety: after `TUNING.chaseMaxSec` (12 s) the runner freezes, cornered. |
| Transform | **No bite or transform clip** (`INSTANT_INFECT`): the sprite swaps to the zombie form in 1–2 frames, keeping clothes, hair and **name**; it stands idle, then wanders and auto-serves (doc 19 §5, doc 16 §A). Starts at **20 energy**. | Green flash, squash-and-stretch, "INFECTED!" float, stink puff (`JointScene.ts` `fx('infected')`); name becomes "Zombie Gary" (`sim.ts:861`). | Instant swap: the zombie art is preloaded while the chase runs; no float, no puff, no squash; the infect sound only. The zombie keeps the customer's first name. 20 energy (unchanged). |

---

## 3. Cooking and serving

| | Original | Ours before | Change |
|---|---|---|---|
| COOK | Select cook → touch stove → cookbook → COOK: **cash at once, pot and timer at once**, then the cook walks over (doc 19 §2). | Cash at once, stove `reserved` until the cook arrives (`sim.ts:349`); pulling the cook away refunds (`sim.ts:660`). | The stove is `cooking` at once (pot shows). Pulling the cook away pauses it; no refund (CANCEL still refunds in full while nothing has cooked). |
| Where the cook stands | On the tile **behind/beside the stove** (NE), facing it, `operate` clip (doc 19 §2). | In front of it (`useTile`, `sim.ts:75`). | Stoves: behind first, then the side further from the camera, then the front. |
| Progress | **Only while a worker stands at the stove** (`Stove::use` only from CookTask, doc 16 §E). | Same (`sim.ts:1281`). | Unchanged (walking to the stove does not count). |
| Done cue | **Green-check speech bubble** (doc 19 §2). | Dish icon bouncing over the stove + "!" badge. | `bubble_check` over the stove; the "!" only as the burn warning. |
| To the counter | Only by **selecting a cook, then touching the stove**: one plate carried; **XP on reaching the counter** (doc 19 §2, `r5`). | Tap the stove: the nearest free worker carries it (`sim.ts:361`, `controller.ts:369`); XP when it finishes cooking (`sim.ts:1258`). | Controller: a done stove needs a selected crew member (else a hint). XP (with the cook's XP perk) is paid when the dish lands on the counter. `plateDish` without a worker still auto-picks, for scripts and tests. |
| Serving | Server carries one plate to the table and **stays beside it for the whole meal**; zombies auto-serve (doc 19 §3). | Server leaves at once (`sim.ts:1105`). | New worker state `serving` until the diner pays or leaves. |
| Order bubble | **None**: the diner sits with an arm raised and takes whatever comes (doc 19 §3). | A thought bubble with a dish (`JointScene.ts` `syncCustomer`). | Removed; a waiting diner raises one arm (new `wave` in `puppet.sit`). |
| End of meal | **Smiley thought bubble + "$N" float**, dirty plate left (doc 19 §3). | "$" icon + amount; no face for a happy diner. | Smiley pop + white "$N" float. Dirty plate unchanged. |
| Burning | Only **unattended** time counts: burns when time on stove − attended progress > `burnTime − cookTime`; normal `burnTime = max(2×cook, cook+10 min)`, **Fresh** `max(3×cook, cook+10 min)`; **+120 s grace while a cook is attached** (doc 16 §E). | Burns `max(5 min, cook)` after it finishes (`sim.ts:1253`); paused dishes never burn. | New `Stove.unattended` seconds; window `max(m×cook, cook+600) − cook` (m 3 for Fresh, else 2) + 120 s while a cook or carrier is on it. A dish left half-cooked can burn too. Our heat-lamp, stove-tier and Frozen multipliers still stretch the window (**Deviation**, our items). |
| FINISH | `max(1, floor((xp×10 + price×servings)/500 × remaining/total))` toxin (doc 16 §E). | 1 per started 2 min (`sim.ts:456`). | Original formula. |
| Tip | `floor(price×0.2×tips/10)` (+1 by the fraction) × chef-avatar tip multiplier (doc 16 §E). | `bill×tips×0.02` × server's tip perk × purple boost (`sim.ts:837`). | Same formula (0.02×tips = 0.2×tips/10). The server's tip perk stands in for the avatar multiplier; purple stars and the customer's `spend` stay (**Deviation**, ours). |

---

## 4. Joint attacks (bites)

| | Original | Ours before | Change |
|---|---|---|---|
| When | One check per zombie every **60 s** (`ZOMBIE_ATTACK_INTERVAL`), counting in every state except resting and attacking. Restless only below `threshold = max × (0.05 + 0.2 × (11 − selfControl)/10)`; chance `p + (1 − e/threshold)(1 − p)`, p = 0.019 (doc 16 §B). | Bites as soon as energy ≤ `max × (0.2 − 0.02(P−1))` (`data.ts:515`), then a 60 s cooldown (`sim.ts:170`). | The original timer and roll (`TUNING.biteCheckSec`, `isRestless`). Patience = self-control: P10 → 7% of max, P1 → 25%. |
| Warning | `ZOMBIE_ATTACK_WARNING` 5 s and `hungry1/2` clips exist; no call site found. | 5 s slumped `hungry` warning (`sim.ts:183`). | **Deviation kept**: the 5 s warning, so the player can Rest them. |
| Target | The nearest customer. | Nearest seated customer. | Nearest customer inside (entering, waiting or eating). |
| Chase | Follow at normal walking pace. | ×1.3 run (`sim.ts:197`). | Normal walk, follow mode. |
| Swing | In range (adjacent or same tile): one swing every `1000/(2 + 0.2·Speed)` ms; **damage = Attack stat**; each hit **knocks the victim back one tile** (if that tile is inside). | One instant "bite": the customer vanishes (`sim.ts:1180`). | New `attacking` state with a swing timer; customers have energy (their type's, ~100); damage = Power; knockback onto a free floor tile; a seated victim is knocked off the chair. The victim cowers (new customer state `cowering`). |
| First hit | Every customer inside panics, a **group scream**, rating **−0.1** (doc 16 §B). | Everyone flees; rating as 3 angry verdicts (`sim.ts:1189`). | Others run out screaming (no pay, no extra rating); rating −0.1 flat; `bite` event on the first hit, `hit` on each. |
| Attack ends early | A living victim runs out the door. | — | Rest/Refill/wake cancels: the victim runs out. |
| Feast | `crouch`, then one flesh chunk every 500 ms ÷ speed multiplier, **+2 energy each**, then `mouthwipe` (doc 16 §B). | 3 s feast, +20% of max at once (`TUNING.biteEnergyFrac`). | Crouch 0.6 s + `TUNING.fleshChunks` (10, chunk count UNKNOWN in the original) × 0.5 s/mult at +2 each + 0.8 s wipe. |
| Bones | The body becomes a bone pile: **10 s, then a 3 s fade**. | Same, timed off `TUNING.feastSec` (`JointScene.ts` `updateRemains`). | Timed off the real feast length carried in the `eaten` event. |

---

## 5. Rating

| | Original | Ours before | Change |
|---|---|---|---|
| Live steps | **+0.005** per paid customer, **−0.006** per unhappy one (no seat, unfed after 60 s), **−0.1** per attack, clamped 0–1 (doc 16 §F). | Exponential drift toward each verdict, 3% a step, decor multiplies the rate (`sim.ts:254`, `TUNING.ratingRate`). | The original steps (`TUNING.ratingServe/ratingUnhappy/ratingAttack`). A peek with no free table counts as a full unhappy customer. Fresh still weighs 1.5× (**Deviation**, our variant). |
| Decor | Furniture bonus added on top (modified rating = popularity + bonus, max 1). Best decor **+0.20** (RESTART-HERE, doc 17 §4.4). | Rate multiplier `1 + 8×bonus` (`ratingMult`, `sim.ts:228`). | `decorBonus = clamp(ratingBonus, −0.2, +0.2)` added to the shown/used rating. Grime counts against it (**Deviation**, ours). |
| Arrivals | `18 s + (4.5 − 18)·modifiedRating ± 1 s`; each roll passes a visit chance 211–238/256 (doc 16 §F). | Same span, ×(0.75–1.25) jitter (`sim.ts:248`, `:744`). | Original formula on the modified rating, ±1 s, plus the visit chance. |
| Start | Popularity 0.185. | 0.3 with −0.116 of grime ≈ 0.184 shown. | Kept: our 0.3 minus the grime lands on the original's 0.185. |
| Away | Time scaled ×**0.25**; net change capped **±0.4** per catch-up; closed drain 1.852e-8/ms (≈0.08 stars/h away) (doc 16 §F). | Simulated at full speed, up to 8 h (`sim.ts:1471`); closed drift 3e-6/s. | The away sim runs a quarter of the time (still ≤ 8 h of absence), the rest is skipped on real-time timers; rating change clamped ±0.4; closed drain 1.852e-5/s live (so ×0.25 away). |
| Sold out | Customers keep coming to an empty counter and leave unhappy. | — | **Deviation (doc 13 #1)**: with no food anywhere (counters, plates in hand, dishes ready), at most one customer every 5 min walks in, looks and leaves. |
| Offline loop | Nobody plates while you're away. | Stoves keep cooking on real time for up to 24 h, union break (doc 13 #2, #3). | **Deviation kept** (doc 13 #2, #3). |
| Pug | — | $5–15 a find, nothing while closed, ≤ $600/day (doc 13 #4). | **Deviation kept**. |

---

## 6. Start state

| | Original | Ours before | Change |
|---|---|---|---|
| Cash / toxin | **$5,000 / 5** (doc 19 §1, doc 17 §4.4). | $300 / 5 (`data.ts:408`). | $5,000 / 5. |
| Room | 7×6; dirty stove, sink and fridge on the back-left wall, a counter, **one table, one chair** (doc 19 §1). | 7×6, two one-seat tables, kitchen on the back-right wall (`state.ts` `createInitialState`). | Kitchen on the back-left wall (fridge, stove with the cook's spot behind it, counter, sink), one table + one chair, the dead plant. |
| Chef | Starts at the **glass front door on the right wall**; sign **CLOSED**; tap the door to open (doc 19 §1, §4). | Next to the door, open. | YOU starts in the doorway; a new game starts CLOSED (`newGame`), and the tutorial asks you to open the door once food is on the counter. (The door art itself is not glass yet: art pass.) |
| Zombie levels | Max energy **×1.03 per level** (doc 17 §4.2). | +5% per level (`TUNING.zombieLevelEnergy`, `state.ts:385`). | ×1.03^(level−1). Our faster zombie XP ladder stays (**Deviation**). |

---

## Tests whose numbers changed

Listed in the branch's report and in the test files' comments: start cash/room, patience thresholds,
FINISH price, burn window, infection timing (chase instead of a 1.6 s shiver), bite timing (60 s check),
feast energy, rating steps, closed drain, offline rating cap.
