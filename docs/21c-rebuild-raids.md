# 21c — Raid rebuild: the original vs ours, and the change

**Branch:** `rebuild/raids` (off `feat/fix-and-features`). **Owner files:** `game/src/sim/raid.ts`, `game/src/sim/rivals.ts`, `game/src/sim/petdata.ts` (new), `game/src/scenes/RaidScene.ts`, `game/src/ui/raidui.ts`, `game/src/art3/chars/raidcast.ts`, `game/src/art3/chars/pets.ts`.

**Sources:** doc 16 §B–D and §I (decompiled rules), doc 17 §2.3, §3.6, §3.7 and §5 (data tables), doc 10 §2 and §3 (rival layouts, per-level curves, movement), doc 13 items 9–11 (bot-tested balance), doc 08 (later version changes). Doc 19 never reached a raid ("not reached", §7 and §9), so nothing here is from play capture.

**Rule:** facts and numbers only. No Capcom code, data files, art or text; names below are ours.

"Ours" cites the code **before** this rebuild (`feat/fix-and-features` at `61e923f`). The "change" column is what this branch does.

---

## 1. Flow of a raid

| # | Original (doc) | Ours before (file:line) | Change |
|---|---|---|---|
| 1.1 | **Line-up.** The squad (zombies, never the chef avatar) stands idle on the sidewalk in one row. A zombie moves only once it is ordered: tap it then ATTACK, tap it then a target, or ATTACK ALL (doc 16 C.1). | Same: `startRaid` queues every squad unit, `raid.ts:529-570`; `order` / `sendOne` / `sendAll`, `raid.ts:628-665`. | Kept. |
| 1.2 | **Live on entry.** The raid goes live the first time any zombie steps inside. Then every rival server drops its job and starts fighting (doc 16 C.1). | Goes live on entry (`raid.ts:1084`) **or on the first blow anywhere** (`damage` calls `aggro`, `raid.ts:969`). | Live only on the first zombie (or pet or summon) inside. `r.liveAt` records the moment. The first-blow path is removed. |
| 1.3 | **Before live**, rival servers behave like a normal café: one cleans, one serves food from the counter (doc 16 C.2). | Servers stand still at their posts until aggro (`updateStaff`, `raid.ts:1134-1149`). | Before live, a server now and then fetches a plate from the counter and walks it to a seated diner, then goes back to its post. Diners stay seated. |
| 1.4 | **Servers attack the nearest zombie inside.** A server with no target picks the nearest living player unit inside the café and keeps it. If the target dies or leaves the café, the server drops it and wanders to a random tile inside (doc 16 C.3). | Re-picks the nearest every tick, a Champ's taunt comes first, and an idle server walks back to its post (`raid.ts:1134-1149`, `1173-1178`). | Target lock as in the original: pick the nearest inside, keep it while it is alive and inside, then wander to a random free inside tile. The taunt is removed (see §7). |
| 1.5 | **The chef fights only once every server is down.** Until then the chef stays at the stove. Being hit makes any character turn on its attacker (doc 16 B "Being hit", C.3). | The chef comes out when 60 % of the staff are down **or after 100 s**, and before that guards the kitchen tiles (`raid.ts:1215-1224`, `1151-1170`). | The chef comes out when **every** server is down. Before that the chef stays at the stove and only fights back against a unit that hits it. There is no timer and no kitchen guard. |
| 1.6 | **Player zombie in attack mode with no target** goes after enemies inside; with a tapped target it attacks that (doc 16 C.3). | Rampage prefers food (diners, waiter bodies), then the nearest waiter, then the chef, re-picked every tick (`raid.ts:1119-1131`). | Rampage locks the nearest diner or server inside and keeps it until it is down or gone. The chef is picked only once no server is standing (or after it has hit the zombie). An ordered target is kept until it is down. |
| 1.7 | **Fight back.** A unit that is hit turns to fight its attacker unless it is already fighting someone in range (doc 16 B, `tookDamage`). | No such rule. | Servers, the chef and rampaging squad units turn on an attacker when their own target is out of reach. A zombie the player gave a target or a steal order keeps its order: the player's command wins. |
| 1.8 | **Win / lose / retreat.** Win when the chef reaches 0; lose when every squad unit is at 0; the white flag ends it. The reward screen follows after 5 s (doc 16 C.7). | Same (`stepRaid`, `raid.ts:1235-1245`; `RaidUi.showResult`, `raidui.ts:407-473`), plus a 5-minute give-up (`RAID_TIME`, `raid.ts:33`). | Kept. The 5-minute give-up stays (ours: doc 16 says the raid countdown field is UNKNOWN). Retreat is still instant; the original walks the squad out first. |

## 2. Movement

| # | Original | Ours before | Change |
|---|---|---|---|
| 2.1 | Speed multiplier **`2 + 0.2·Speed`**, about 0.669 tiles/s per multiplier point (doc 10 §3.1: Speed 4 = 1.87 tiles/s). **Zombies are 1.2× slower.** Running takes 0.6× the time (doc 16 D). | Zombies `walkSpeed(speed) × 1.15` (`raid.ts:546`); waiters `walkSpeed × 0.85` and chef `× 0.75` (`rivals.ts:408, 413`); diners a flat 1.7 (`raid.ts:293`); `walkSpeed` = 1.4 + 0.125·Speed (`data.ts:519`). | New **`raidSpeed(speed, zombie)`** in `raid.ts` = `(2 + 0.2·Speed) × 0.669`, divided by 1.2 for zombies and the summon. Every raid mover uses it. Fleeing diners run (÷0.6). Pets use their move stat with no zombie slowdown (INFERRED). The café sim's own movement belongs to the core rebuild; `raidSpeed` is defined in `raid.ts` so the two branches do not collide. |

## 3. Combat numbers

| # | Original | Ours before | Change |
|---|---|---|---|
| 3.1 | **Swing timer `1000 / (2 + 0.2·Speed)` ms** (455 ms at Speed 1, 250 ms at Speed 10). It is set when the attacker reaches the target, so the first swing waits one interval (doc 16 B). | Fixed cooldowns: zombie 0.9 s, waiter 1.1 s, chef 1.2 s, pets 0.7 s (`raid.ts:547, 597, 613, 567`). | Swing interval from the attacker's Speed stat (pets: their attack-speed stat). The timer is reset when the attacker comes into reach. |
| 3.2 | **Damage = the attacker's Attack stat**, with no defence stat (doc 16 C.4). Waiters use the per-level server strength, the chef the per-level chef strength. | `zombieRaidDmg = 2 + 1.7·Power`, waiters `3 + 1.6·str`, chef `(3 + 1.6·str)·1.4 + 0.3·level`, all ×`COMBAT_PACE` 0.3 with ±15 % noise (`raid.ts:131, 850, 967`; `rivals.ts:356-359`). | Damage = Power for zombies, the curve's strength for waiters and chef, the first stat for pets. No pace factor, no noise. |
| 3.3 | **Knockback: one tile per hit**, in the attacker's facing direction, if that tile is inside the café (doc 16 B). The attacker then has to step in again. | None. | Each hit slides the victim one tile away from the attacker over 0.15 s, if the tile is inside and free of furniture. A pushed unit cannot act until it lands. The chase-and-swing loop this creates is what paces a fight. |
| 3.4 | **HP is energy.** Player zombies bring their current energy (max = type max × level multiplier). Rival waiters use the waiter character's energy, **90**; the chef uses the per-level `BOSS_HP` (doc 16 C.4, doc 17 §2.3 rows 55–63). | Zombie HP = energy (kept). Waiters `35 + 20·str` × gen (`rivals.ts:355`); chef `chefHp × 2.6` (`rivals.ts:358, 411`). | Waiters 90 HP; chef HP straight from the curve. Toughness for new management is still applied (see §7). |

## 4. Kills and rewards

| # | Original | Ours before | Change |
|---|---|---|---|
| 4.1 | **Each customer kill: +20 cash and +2 café XP**, and +2 XP to the zombie that made it (doc 16 C.5, `CUSTOMER_CASH_AMOUNT` 20, `CUSTOMER_XP` 2). | Diner cash `15 + 2.5·level` (`rivals.ts:403`); +2 XP per eaten diner (`raid.ts:65`); a knocked-out waiter is "lunch" for 2× diner cash (`raid.ts:67, 928-940`). Zombie XP `2·eats + 3` (`raid.ts:1293`). | **+20 cash and +2 XP per customer kill**, kept win or lose. Downed waiters are no longer lunch. Zombie XP is +2 per kill (customers; waiter and chef kills also give +2, INFERRED). |
| 4.2 | A kill starts the feast; eating gives health (`KILL_HEALTH_BOOST` 5, doc 10 §2.7 / doc 17 §5). | `devour` +5 HP, 1.4 s feast (`raid.ts:928-940`). | Kept. |
| 4.3 | **Customers in raids.** They are ordinary customers (about 100 energy). Panicking ones loop the run clip 10 times (`CUSTOMER_PANIC_LOOPS`). Whether raid diners leave is UNKNOWN. | 2 HP diners that scream and run for the door (`raid.ts:291, 1180-1210`). | Diners get **20 HP** (a few swings), scream, then run for the door. **Deviation:** with knockback and running at 1.67× speed, 100-HP diners would never be caught. |
| 4.4 | **Win:** cash 10·level, XP 2·level, toxin with a per-level chance (doc 10 §2.7). | Our economy's scale: 125 cash and 30 XP per level, a floor of 2 h of income, and a per-rival sauce chance (`rivals.ts:361-362`, `raid.ts:415-419`, `1323-1327`). | Kept, as our economy differs (doc 13 #11). |

## 5. Tombstones

| # | Original | Ours before | Change |
|---|---|---|---|
| 5.1 | **Strength: ×2 damage for 5 s** for every squad member (doc 16 C.6). | ×1.5 (`raid.ts:42`). | **×2.** |
| 5.2 | **Health: +100 energy spread over 5 s** (+20/s), capped at max, for zombies and pets (doc 16 C.6; doc 01 §3.6). | +30 over 5 s (`raid.ts:43`). | **+100 over 5 s.** |
| 5.3 | **5 uses a day, 12 when upgraded** (iOS help); a refill costs 2 toxin. Only one effect runs at a time (doc 17 §3.6). | 5, or 7 at level 2 (`raid.ts:44-46`). | **5 / 12.** Refill 2 sauce; one glow at a time (kept). |
| 5.4 | Golden stone: revives every fallen squad member **at 100 energy**, 1 use per 24 h (doc 17 §3.6). | Revive at 50 % of max, 5 uses (`raid.ts:52, 699-701`). | Revive at 100 energy (capped at max), **1 use a day**, no level 2. |
| 5.5 | Doc 13 #10: once per stone per raid, and soften to ×1.5 / +30. | Once per raid (`raid.ts:732`) with the soft numbers. | **Once per stone per raid is kept** (deviation from the original, which let you spend all five in one raid). The original's ×2 / +100 come back, so the once-per-raid cap is what stops the "I-win button" doc 13 measured. |

## 6. KO, rivals, loot, pets, commands

| # | Original | Ours before | Change |
|---|---|---|---|
| 6.1 | **KO:** 8 h in the decompiled Android build (`REANIMATION_DURATION`); later versions cut it to **1 h** (doc 08 lines 127, 218; doc 01 §3.10). | 1 h (`data.ts:484`, applied in `finishRaid`, `raid.ts:1294-1302`). | **Kept at 1 h**, which is what the later shipping game used. It is a deviation only from the early Android build. |
| 6.2 | **Per-level rival stats** (doc 10 §2.7, doc 17 §5): customers, servers, server str/spd, chef HP/str/spd, plateau after ~26, arrays to level 83. Boss café: 4 minions with the chef's stats × `BOSS_MULTIPLIER` (1.0 at level 5, +0.1 a level). | The curves are in `rivals.ts:305-339`, then rescaled (HP ×2.6, damage formulas, speed factors) in `rivalStats` (`rivals.ts:392-418`). | `rivalStats` uses the curve as-is: waiter 90 HP, damage = str, speed stat = spd; chef HP/str/spd from the curve. Boss café: 4 minions with the chef's HP/str/spd × multiplier, and the chef × multiplier. |
| 6.3 | **Reopen** after a win: 4 / 8 / 12 / 18 h by reopening; boss café cooldown 4 h (doc 10 §2.7). | Already `rivalClosedSec` (`rivals.ts:267-269`); boss gen stays 0, so 4 h. | Kept, with a test. |
| 6.4 | **Counter food** (`getNewRandomFoodStack`): a random recipe at player level −3/−2/−1/0/+1 (cumulative 15/35/65/95/100), stack × **0.25**, variant rolled over 10 variants with cumulative **60/68/72/77/79/84/86/91/96/100** (plain, Spicy, Very Spicy, Fancy, Very Fancy, Bulk, Fresh, Frozen, Quick, Very Quick), 2 % a rare recipe (doc 10 §2.7, doc 17 §1.1). | Level roll kept, but drawn from every level dish and a flat 40 % "any variant" (`raid.ts:459-478`). | Drawn **from the player's recipes** (dishes unlocked at their level, plus raid recipes they know), falling back to the nearest lower level they have. Variant rolled with the original's ten-way odds, mapped onto our nine variant ids. Quarter stacks kept. |
| 6.5 | **Pets in raids** (iOS `PetData`): 9 pets, HP 250–1000, four stat bytes (attack, attack speed, move speed, one unknown: INFERRED), crit chance 0.1–0.2 and crit ×2–×3 (doc 16 §I, doc 17 §3.7). | Two pets: the Zombie Pug (ours, 45 HP) and the Rot-weiler (90 HP), fixed damage, no crits (`raid.ts:551-570`). | New `petdata.ts`: the original's nine pets as our own creatures, plus our Pug. Each has HP, attack, attack speed, move speed, crit chance and crit multiplier from the table. Pets roll crits (a `CRIT!` pop). New pets are adopted from pet houses in the Special tab and drawn on the four-legged rig. The five robots' combined form is not built. |
| 6.6 | **Commands:** tap a zombie, then a target (a person or the counter), or ATTACK (doc 16 C.1). | Tap a zombie, then a target or ATTACK; with nobody picked, tapping a target sends **everyone** at it (`focusTarget`, `raid.ts:668-674`; `RaidScene.ts:299-302`), and tapping a waiter's body sends someone to eat it (`RaidScene.ts:305-318`). | Tap a zombie (sprite or tray), then a target or ATTACK. Tapping an enemy with nobody picked asks you to pick a zombie first. The pile-on and body taps are removed. Tapping the counter with nobody picked still sends the nearest zombie, as a shortcut. |

## 7. Doc 13 balance notes, checked against the original

| Doc 13 item | Keep? | Why |
|---|---|---|
| Threat meter Easy / Even / Deadly (#9) | **Kept**, recomputed for the new combat model (swing rates, knockback-limited hit rate, the chef joining last). | Information only; it does not change how a raid plays. |
| Gus tip "clear the waiters first" (#9) | **Kept.** | It is exactly the original's rule (the chef comes out only when every server is down). |
| Per-type abilities (#9) | **Kept, trimmed.** Sumo belly-slam (knocks everyone round the target back a tile), Boxer one-two (a second jab at half strength), Cop cuffs (a 1.5 s stun every 4th hit), Cheerleader pep (+15 % near her). **The Champ's taunt is dropped**: it overrides the original's "servers go for the nearest zombie inside". | With damage = Attack, quality already beats numbers (a Boxer hits 2.5× a Joe), so the abilities are flavour on top. |
| Tombstones once per raid (#10) | **Kept** with the original ×2 / +100 (see 5.5). | It caps the "I-win" use without softening each stone. |
| Toughness cap `1 + 0.15·min(gen, 5)` (#11) | **Kept** on new-management HP and damage. | The original had no reopen scaling; the cap keeps ours from closing the road. |

## 8. Ours, kept (not in the original)

- Health Stone consumable (+60 over 3 s, once per raid) and the Big Foot-Long summon (Summon Stone, up to 3): ours, alongside the original-style tombstones.
- 5-minute give-up, raid stars (1–3), "Raid again" / "Next joint", the threat meter.
- The rival room: one counter in a divider line, kitchen behind it (not the original's five letter layouts, doc 10 §2.5).
- Win loot: whatever is still on the counter comes home.

## 9. Tests (`game/tests/raid.test.ts`)

One test per rule above: raidSpeed and the 1.2× zombie slowdown; swing interval; damage = Attack; knockback one tile (and none into furniture or out of the door); live only on entry; servers lock the nearest zombie inside and drop it when it leaves; the chef stays at the stove until every server is down, but fights back if hit; +20 cash / +2 XP per customer kill; tombstones ×2 and +100 over 5 s, 5/12 uses, once per raid, revive at 100; KO 1 h; curve stats as-is; boss multiplier; reopen times; counter food from the player's recipes with the ten-way variant odds; the nine pets' table and crits; the command flow.
