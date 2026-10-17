# 16 — Reverse-engineering findings (game logic, formulas, state machines)

**Status (2026-10-17):** sections A–E complete (infection, in-joint attacks, raids, movement, cooking). Rating formula, state machines, Meat Locker, tombstones, pets, chef avatars, sounds, idle clips and extra features are written; a few parts of each are still marked UNKNOWN (list at the end).

**What this is.** These are facts about how the 2011 original worked, read from the user's own copies of the shipped game. They are written as plain-English rules and neutral pseudocode in our own words. **No Capcom code, art, data files or text is copied here.** Short quoted words (button labels, file names) are for reference only and must not be shipped. Read with docs 08, 10, 11 and 13; facts already in those docs are not repeated unless this pass corrects or extends them.

**Targets and method.**
- **Android native lib:** `lib/armeabi/libZombieCafeAndroid.so` (SHA-256 `24c6509a…cb45d`), from the user's APK. It keeps its C++ symbol names, so every function below is cited by name and address (Ghidra addresses, image base 0x10000).
- **iOS bundle (v1.13.0):** used for data tables (`PetData.bin`, `TombstoneData.bin`, `SoundData.bin`, `MusicData.bin`, `ItemData.bin`), its in-game Help page and its UI strings. The iOS executable is stripped, so its logic was not decompiled.
- **REA status.** REA's native providers are blocked on this Windows host:
  - Windows Ghidra provider: "accepts native PE only" (ELF and Mach-O are rejected).
  - Rizin and objdump: `ERR_REA_WINDOWS_NATIVE`.
  - The iOS Mach-O was rejected outright (a FAT binary with no x64 slice).
  - So the same Ghidra 12.1.4 (`C:\tools`) was driven headless instead, with scratch scripts that:
    - decompile the named functions and resolve the position-independent references to `Constants::*`, `Strings::*` and string literals;
    - run `Constants::load` in Ghidra's p-code emulator against the APK's `constants.bin.mid`, which recovered **all 600 named constants** (values below).
  - Evidence IDs are therefore function names, addresses and constant names, not REA Evidence records.
- **Version caveat.** The Android lib is an older build than iOS 1.13. Pets, the Golden/Yeti/Grim tombstones, boosters and radioactive recipes exist only in the iOS data and strings.

Tags: **OBSERVED** = read directly from decompiled code, constants or data. **INFERRED** = our reading of partial evidence. **UNKNOWN** = not resolved.

---

## 0. Data model used by the logic (needed to read the rules)

**Per-character type** (the character table; field offsets inside the type record):

| Offset | Meaning | How it is used |
|---|---|---|
| +0xab5 | **Speed** stat (1–10) | Movement and attack-rate multiplier |
| +0xab6 | **Attack** stat (1–10) | Damage per hit |
| +0xab7 | Server stat | Averaged over working servers in the offline sim |
| +0xab9 | Daydream stat | Higher = longer gap between daydreams; probably "Focus" |
| +0xaba | Self-control stat | Higher = less likely to bite; probably "Patience" |
| +0xabc | **Max energy** (float) | Energy is HP |
| +0xac0 | Walk cost per ms | Movement |
| +0xac4 | Female flag | Picks which voice set plays |
| +0xad8 | Infect cost | |
| +0xadc | "Cost is toxin" flag | |
| +0xae8 | Chef avatar: cook-speed multiplier | Avatar perks; see §G |
| +0xaec | Chef avatar: tip multiplier | |
| +0xaf0 | Chef avatar: zombie-regen bonus | |

The four avatar perks match the iOS UI labels Cook Speed, Tip Multiplier, Zombie Regen and Cook XP. All offsets are OBSERVED from literal pools in the functions cited below.

**Per character** (the save record):
- form: 0 = human, 2 = zombie (byte +9);
- isZombie (byte +8);
- **energy** (float +0x38): one number serves as HP and as work energy;
- level (+0x2c) and XP (+0x30);
- customersServed, humansKilled (+0x20), deaths (+0x24);
- reanimation timer (+0x48);
- default walk clip (+0x4c): either `walk` or `walk2`;
- **state** (byte +0x3c): 0 idle, 1 working/serving, 2 cooking, 3 resting, 4 attacking, 5 daydreaming, 6 reanimating (OBSERVED: the task-start writes listed in §H).

**Effective max energy** = type max energy × `zombieLevelEnergyMultiplier[level]`, rounded down. Every energy change clamps to [0, this max] (OBSERVED, used in tookDamage, FeastTask and the level-up code).

**Animation index table** (from `animationData.bin.mid`):

| # | Clip | # | Clip | # | Clip |
|---|---|---|---|---|---|
| 0 | walk | 10 | bump | 20 | walk3 |
| 1 | idle | 11 | celebrate | 21 | walk4 |
| 2 | sit | 12 | hit | 22 | crouch |
| 3 | attack | 13 | attack2 | 23 | feast |
| 4 | carry | 14 | attackHuman | 24 | mouthwipe |
| 5 | serve | 15 | idle3 | 25 | hungry1 |
| 6 | death | 16 | idle4 | 26 | hungry2 |
| 7 | eat | 17 | idle5 | 27 | rise |
| 8 | operate | 18 | startled | 28 | hung |
| 9 | run | 19 | walk2 | 29 | hung2 |

---

## A. Infection

**Tap flow** (OBSERVED, `GameStateCafe::onInfectButtonPressed` @0xb4668):
1. The player taps a customer, which opens the command bar with INFECT.
2. Tapping INFECT runs two checks, in this order:
   1. **Crew cap:** current staff count must be below `zombieCaps[cafeLevel−1]`. If not, a "no room" notice shows and nothing else happens.
   2. **Cost:** if the type's cost is in toxin, the infection goes ahead and payment is asked for at the end. If the cost is in cash, the player needs at least that much cash, or a "not enough cash" notice shows.
3. Which path runs next depends on a constant and the tutorial:
   - `GameStateCafe_INSTANT_INFECT = 1` **and** tutorial step 11 is done: the conversion is **instant**, with no chase.
   - Otherwise (during the tutorial): **the chef avatar (YOU) walks over and infects.** YOU's current task is cancelled and an InfectTask is given to YOU.

**Chase (InfectTask)** (OBSERVED, `InfectTask::start` @0xe95d0, `::tick` @0xe9634):
- YOU follows the customer's tile using a FollowTask with the **`walk2` clip in "hurry" mode**. Hurry means 0.6× time per path unit (doc 10 §3.1), so YOU moves about 1.67× faster than a normal walk.
- **The customer does not flee.** Nothing in the infect path sets the target to panic, and **other customers are not alarmed.**
- **It fails** if the target becomes a zombie some other way, or **if the target walks out of the café before YOU reaches them** (`Cafe::isInside` check).
- **On arrival** (the follow succeeds once YOU is adjacent to the target's tile or on it):
  1. play one of 3 random infect sounds;
  2. set the target's form to zombie;
  3. set energy = min(`InfectTask_ZOMBIE_START_ENERGY` = 20, effective max);
  4. refresh the clip;
  5. pick a default walk at random: 50% `walk`, 50% `walk2`.

**Completion** (OBSERVED, `onInfectTaskComplete` @0xb2d44 and `completeInfectPurchase` @0xb28bc; the instant path goes straight here):
- **Payment:**
  - a cash type deducts the cash cost;
  - a toxin type first shows a confirm dialog (or "buy toxin" if short), then spends the toxin.
- The new zombie:
  - moves from the customer list to the staff list;
  - gets `convertedOn` set to now and is deselected;
  - starts at 20 energy (capped at max) with state "working" (1), and has its old tasks cleared;
  - gets a random default walk clip.
- The type is added to the Zombiepedia "discovered" list, and the crew HUD button is enabled.
- **There is no transform clip** (no `death` → `rise`) in this build; the sprite just switches to its zombie art. OBSERVED, by the absence of any clip change other than the default one.
- **No cooldown** exists between infections. The only limits are the crew cap and the cost.

**Overflow to the Meat Locker:**
- **Android:** none. A full crew blocks INFECT.
- **iOS 1.13 strings** describe more (INFERRED from the strings only):
  - with a full crew, an infected or bought zombie **goes into the Meat Locker** (which unlocks at level 9);
  - if the locker is also full, the player is offered an expansion for toxin, or the zombie is dismissed.

**What Zombs BBQ should copy:**
- an instant convert as the default;
- the "chef walks over" version only for the tutorial beat;
- 20 starting energy;
- the crew-cap gate checked before the cost.

---

## B. Attacks in the joint (hungry zombie → bite → feast)

**The bite check, per zombie** (OBSERVED, `GameStateCafe::tickZombieWorkInterruptions` @0xb7b34):
- Each zombie runs an **attack timer** that counts down. It starts at, and resets to, `GameStateCafe_ZOMBIE_ATTACK_INTERVAL` = 60,000 ms. It counts in every state except resting (3) and attacking (4).
- When the timer expires, the zombie bites only if **`isRestless()`** passes and the tutorial is past step 'P'. Then:
  1. the zombie's tasks are cancelled and it **groans**;
  2. it targets **the nearest customer** (the first entry of the distance-sorted customer list);
  3. it starts an AttackTask with the café's began/hit/ended listeners attached.
- The timer then resets to 60 s whether or not a bite happened. So **at most one bite check per zombie per minute.**

**The `isRestless()` rule** (OBSERVED, `CharacterInstance::isRestless` @0x7d904):

```
threshold = effMaxEnergy × (0.05 + 0.2 × (11 − selfControlStat) / 10)
if energy > threshold: not restless
chance%  = 100 × ( p + (1 − energy/threshold) × (1 − p) )     p = ATTACK_PROBABILITY_PER_MINUTE = 0.019
restless if random(0..99) < chance%
```

- A self-control stat of 10 gives a threshold of 7% of max energy; a stat of 1 gives 25%.
- **A zombie above its threshold never bites. Below it, the chance rises from about 2% up to 100% at 0 energy.**

**Warning cue:**
- The constants `ZOMBIE_ATTACK_WARNING` (5,000 ms) and the `hungry1`/`hungry2` clips exist.
- **No warning beat or hungry-clip call was found** in any café task of this build. UNKNOWN whether iOS adds one.

**Daydreaming, handled by the same function** (OBSERVED):
- A second timer counts down. When it expires the zombie starts a DaydreamTask lasting `Character_DAYDREAM_DURATION` = 10 s.
- The next gap is `daydreamStat × 120,000 + random(0 … 2×120,000 − 30,000)` ms, using `DAYDREAM_INTERVAL_INCREMENT`/`VARIANCE`. That is between about 2 min + 0–3.5 min at stat 1 and 20 min + 0–3.5 min at stat 10.
- A daydream starts with the **`startled`** clip and plays **`hit`** as a gag inside the task (`DaydreamTask::start` @… / `::tick` @0x91694).

**AttackTask: chase, then strike** (OBSERVED, `AttackTask::tick` @0x6f400):
1. **Chase:**
   - The zombie follows the target with FollowTask using the plain `walk` clip, no hurry, so normal speed.
   - If no path exists the attack is abandoned.
   - If the target leaves the café, the attack ends.
2. **In range** (`withinAttackRange`: the target is on an adjacent tile or the same tile):
   - face the target;
   - set the swing timer to `AttackTask_MAX_ATTACK_TIME / speedMultiplier` = 1000 / (2 + 0.2 × Speed) ms, which is about 455 ms at Speed 1 and 250 ms at Speed 10.
3. **Each swing:**
   - play the `attack` clip;
   - deal damage = **the attacker's Attack stat**, doubled by a Strength tombstone (§C.6);
   - if the target has stepped away, go back to chasing.
4. **Kill:** when the target's energy reaches 0:
   - the attacker's kill count goes up by 1;
   - a dying voice plays, chosen by the victim's gender and whether it is a zombie;
   - the target `die()`s: deaths +1, `death` clip, tasks cleared.

**Being hit** (OBSERVED, `CharacterInstance::tookDamage` @0x7cc00):
- energy −= damage, clamped;
- the victim plays `hit` unless it is mid-`attack`;
- the victim **turns to fight the attacker** if it isn't already fighting someone in range;
- **Knockback:** the victim is pushed **one tile** in the direction the attacker faces, if that tile is inside the café;
- a grunt plays, chosen by gender and type, at most every `Character_SCREAM_INTERVAL` = 2 s.

**Panic** (OBSERVED, `GameStateCafe::onAttackHit` @0xab8a4):
- On the **first hit only** of each attack:
  - every living customer inside who isn't already panicking stops what they're doing and is flagged as panicking;
  - a **group scream** plays, weighted by the counts of men and women;
  - **the café rating drops 0.1** (`RATING_DECREMENT_ATTACK`, on a 0–1 scale, which is half a star), floored at 0.
- When an attack ends with the target still alive (OBSERVED, `onAttackEnded` @0xb7a20): a living human target **runs** (the `run` clip) to one of the two exit tiles, chosen 50/50, and leaves.

**Feast after a kill** (OBSERVED, `FeastTask::tick` @0x96dec, from `onAttackEnded`):

| Phase | Clip | What happens |
|---|---|---|
| 0 | `crouch` | Kneels over the body |
| 1 | `feast` | A **censor sign** pops over the body. Every 500 ms / speedMultiplier one "flesh" chunk comes off, giving **+2 energy** (`FLESH_ENERGY_BONUS`). A chewing sound plays every 500 ms. |
| 2 | `mouthwipe` | Plays once all the flesh is gone; then the task ends |

- When the flesh runs out the body is replaced by a **bone pile**. It stays 10 s, then fades over 3 s (`BonePile_*`).
- If the feast is interrupted, the corpse just fades out.

---

## C. Raids

**Who is in a raid:**
- Player squad: the staff zombies list (the chef avatar is not in it).
- The rival side:
  - servers;
  - one enemy chef;
  - customers already seated, with more trickling in (doc 10 §2.7).

**C.1 Line-up and entry** (OBSERVED, `GameStateRaid::tick` @0xe17xx–0xe2xxx, plus doc 10):
- Zombies idle on the raid sidewalk. A zombie stays idle until its state is set to 4 (attack). That happens when:
  - the player taps it and then ATTACK;
  - the player taps it and then a target;
  - the player uses `attackAll`, which sets state 4 on every squad member (@0xdba28).
- A zombie with no target walks to the door tile (`RAID_SIDEWALK_X`, `DOOR_Y`), groaning, at its own speed.
- **The first time any zombie steps inside**, the raid goes "live". Every rival server drops its normal job and starts fighting.

**C.2 Before the raid is live:** rival servers act like a normal café.
- One random free server is sent to clean a dirty plate (CleanupTask).
- Another is sent to serve food (ServeTask) when the counters have stock.

**C.3 Targeting once live** (OBSERVED):
- **Rival server:**
  - If it has no target, it picks **the nearest living player zombie that is inside the café** (distance-sorted object list) and starts an AttackTask.
  - If its target dies or leaves the café, it drops it and wanders to a random tile inside.
- **Rival chef:** stays at its stove, timing the dish there with the recipe's cook time, while any server is alive. **Once every server is down**, the chef clears its task and targets the zombie that is inside. This confirms the "chef comes out last" behaviour.
- **Player zombie in state 4 with no target:** goes after enemies inside. If the player tapped a target, it attacks that.
- If a zombie's target walks out of the café, the zombie's task is cleared.

**C.4 Combat numbers:**
- Same AttackTask rules as §B.
- **HP is energy**:
  - player zombies use their own current energy (max = type max × level multiplier);
  - rival servers' and the chef's strength, speed and HP come from the per-level arrays in doc 10 §2.7: server strength/speed, `BOSS_HP`, `BOSS_STRENGTH`, `BOSS_SPEED`.
- Damage per swing = attacker Attack stat (×2 with Strength).
- Swing interval = 1000 / (2 + 0.2 × Speed) ms.
- Knockback of 1 tile on each hit.
- There is **no separate defence stat**.

**C.5 Kills and loot during the raid** (OBSERVED, `GameStateRaid::onAttackEnded` @0xdd440):
- Killing a rival **customer** gives:
  - +`CUSTOMER_CASH_AMOUNT` 20 cash, added both to the raid tally and to your cash at once;
  - +`CUSTOMER_XP` 2 café XP (unless you are at max level);
  - +2 XP to the zombie that made the kill.
- A kill also triggers the feast, which gives +2 energy per chunk.
- Stealing food takes `StealFoodTask_STEAL_TIME` = 2 s at a counter, using the `operate` clip.
- The `KILL_HEALTH_BOOST` constant is 5. Its use site was not found in this build.

**C.6 Tombstones** (OBSERVED, `activatePowerTombstone` @0xdbae4, `activateHealthTombstone` @0xdba68, `CharacterInstance::startPowerUp` @0x7b18c, `Cafe::tick` @0x76148):
- Using one decrements a stored use counter, spending the level-2 stone's charges first if you own it. Then **every squad zombie** gets a 5,000 ms power-up:
  - **Strength (type 1):** damage ×`tombstone_POWER_STRENGTH` = 2 while it lasts.
  - **Health (type 2):** energy regenerates at `POWER_HEALTH` (100) per `POWER_DURATION` (5 s), so **+100 spread over 5 s** (+20/s), capped at max. It is not an instant lump.
- **Uses:**
  - **Android:** 5 per stone (7 for level 2).
  - **iOS help:** 5, upgradeable to 12. They refill at the next daily reset, or for **2 toxin** (`TOMBSTONE_RECHARGE_COST`).
- **iOS-only stones** (from `TombstoneData.bin` and `ItemData.bin`; descriptions paraphrased):

| Stone | Effect | Limit |
|---|---|---|
| Golden | Revives all fallen squad members to 100 energy mid-raid | 1 use per 24 h |
| Grim Reaper | Doubles zombie XP (multiplier 2.0) | Buy once |
| Yeti | Summons the Zombie Yeti in a raid; duration scales with your level | Data row shows 3 uses |
| Super Server | +1 to every server stat in café mode for 2 h (7,200 s in data) | 24 h recharge |
| Pet Tombstone L1/L2/L3 | Pet XP per kill +1 / +2 / +3 | |

**C.7 Win, lose, retreat** (INFERRED from the branch structure of `GameStateRaid::tick`; Ghidra splits the end-of-raid handlers into unnamed helpers):

| Outcome | How it happens | Detail |
|---|---|---|
| **Lose** | Every squad zombie is at 0 energy | "Your zombies lost" result |
| **Win** | The enemy chef reaches 0 energy | The chef branch ends the raid, the end-of-raid music plays (track 1), and the reward screen follows after `REWARD_DELAY_DURATION` = 5 s |
| **Retreat** | The white flag sets a flag and stops every zombie's tasks (`retreat` @0xdbb5c); zombies then walk out to a sidewalk point | It ends once every zombie is outside or down ("ran away") |

- A countdown field also exists in raid state. Its meaning is UNKNOWN, so no raid clock is confirmed.

**C.8 KO and reanimation** (OBSERVED, `GameStateCafe::advanceCharacter` @0xb6ecc, `ReanimateTask` @0x1099c0):
- A zombie at 0 energy enters state 6 with timer = `Character_REANIMATION_DURATION` = **28,800,000 ms (8 h)** in this build. Doc 08 notes later versions use 1 h.
- While reanimating it lies in the `death` pose.
- When the timer reaches 0, its bite timer resets to 60 s and it goes back to work.
- Revive and Heal buttons exist (`onReviveConfirmed`, `onHealConfirmed`) to skip the wait for toxin. Their prices were not traced (UNKNOWN).

---

## D. Movement

Doc 10 §3.1 is confirmed by code:
- **`CharacterData::getSpeedMultiplier`** @0x7af04 = `MIN + (MAX − MIN) × Speed/10` = 2 + 0.2 × Speed.
- **`Character::getMSPerCostUnit`** @0x7af50 = `walkCostPerMs / GLOBAL_SCALE(0.365) / speedMultiplier`, × `ZOMBIE_SLOWDOWN_MULTIPLIER` (1.2) for zombies.

**Which clip and speed each move uses** (OBSERVED, from MoveTask/FollowTask constructor arguments):

| Mover | Clip | Pace |
|---|---|---|
| Customers walking in or around | `walk` | Normal |
| Panicking or fleeing customers | `run` | Runs, which is the 0.6× hurry factor |
| Fired zombies | `run` | Run off |
| Zombies heading to a rest spot | `walk` | Normal |
| Rival servers retargeting in a raid | `walk` | Normal |
| YOU chasing an infect target | `walk2` | Hurry |
| Attackers, cleaners, dish carriers, seat-finders | `walk` (FollowTask) | Normal |

- **Resting** (OBSERVED, `RestTask::tick` @0x11c42c):
  - A resting zombie picks a **free random spot on the sidewalk outside**: x near `SIDEWALK_X−1`, y spread over 5 tiles. It reserves the spot so two zombies don't share it.
  - It walks there and stands in `idle`.
  - A "Zzz" note shows every 20 s.
  - It regains energy at `ENERGY_DRAIN_PER_MS` (5e-5/ms, 3 per min) × (café barrel bonus + the chef avatar's Zombie-Regen value).
- **Pathing:** tile-grid pathfinding (`CFPathFinder`). Tasks fail when there is no path, which produces the "can't reach" and "blocked door" tutorial lines. Diagonal rules were not traced (UNKNOWN).

---

## E. Cooking and serving

**Starting a dish** (OBSERVED, `CookTask::tick` @0x90bc0):

| Step | What happens |
|---|---|
| 0 | The chosen worker walks to the stove. No path means the task fails and the zombie goes back to idle. |
| 1 | Faces the stove, plays `idle` |
| 2 | If the dish isn't burnt or done: start the stove, play the cooking sound and the `operate` clip |
| 3 | Every tick: `cookProgress += dt × avatar CookSpeed multiplier × stove speed multiplier` (StoveSpeedMult 1.1–1.3 from the furniture data). When progress reaches the cook time, the task finishes and the worker goes idle. |

- **Cook progress only advances while a worker stands at the stove** (Stove::use is called only from the CookTask). This confirms "the cook must stay".
- **Energy drains** at 3/min the whole time (`Character::work`), but never below 1.
- A note on the speed multiplier: the code reads it from a global character slot. The same slot supplies the tip multiplier, so we read it as the **chef avatar's** perk, applied even when a zombie is the one cooking (INFERRED).

**Burning** (OBSERVED, `Stove::isBurned` @0x87f04, `burnTimeRemaining` @0xb5ea8, `Recipe::getBurnTimeSeconds` @0x10a41c):
- A dish burns when **total time on the stove − attended cook progress > burnTime − cookTime**. Only unattended time counts towards burning.
- **burnTime:**
  - normal dishes: `max(2 × cookTime, cookTime + 600 s)`. That gives at least 10 minutes of slack after the dish is done, or one more cook time if longer;
  - **Fresh** variant: `max(3 × cookTime, cookTime + 600 s)`.
- While a cook is attached there is an extra **120 s grace** (`Stove_ACTIVE_COOK_BURN_GRACE_SECONDS`).
- The iOS 1.13 Help states a later rule: burn time = 5× cook for dishes of 5 min or less, 4× for 6–30 min, 3× for 31 min and up. Fresh adds more on top, and the Hyper Booster stops burning altogether.

**Variants** (OBSERVED, `Recipe::get*` @0x10a300–0x10a4d0; the variant order matches the strings):

| # | Variant | Cook time | Cost | Servings | Price | XP |
|---|---|---|---|---|---|---|
| 0 | Plain | ×1 | ×1 | ×1 | ×1 | ×1 |
| 1 | Spicy | | | | | ×1.10 (at least +1) |
| 2 | Very Spicy | | | | | ×1.20 (at least +2) |
| 3 | Fancy | | +0.95 × servings | | **+1 per serving** | |
| 4 | Very Fancy | | +1.8 × servings | | **+2 per serving** | |
| 5 | Bulk | | ×2 | **×2** | | |
| 6 | Fresh | | | | | burn rule above |
| 7 | Frozen | **×2** | ×0.75 | | | |
| 8 | Quick | ×0.9 | | | | |
| 9 | Very Quick | ×0.8 | | | | |

- Recipe cook times are stored in whole minutes.

**FINISH now** (OBSERVED, `CookCommandBar::finishDish` @0x8ea84, `Recipe::getFinishToxinCost` @0x10a450):

```
toxin = max(1, floor( (xp × 10 + price × servings) / 500 × (cookTime − elapsed) / cookTime ))
```

The dish then completes instantly.

**Getting the dish to the counter:**
- Done dishes are carried to a counter by a DishToCounterTask, using the `carry` clip.
- In the original the player triggers this by tapping a worker and then the stove (Help).
- `GameStateCafe::findStaffForCookEndTask` exists to pick a free worker automatically, so the game can also auto-assign (INFERRED).

**Which counter a dish goes to** (OBSERVED, `Cafe::getAppropriatenessScore` @0x72b0c):
- Each counter gets a score: the sum of the servings already stacked on it, plus a bonus when its top stack is the same recipe.
- The dish goes to the best-scoring counter. In practice, **same dishes stack together**.

**Serving:**
- `ServeTask` hands over in 0.35 s.
- Customers wait `EatTask_WAIT_FOR_FOOD_TIME` = 60 s for food, then leave unhappy.
- They eat for 30 s.
- How a server chooses which dish to take was not fully traced (UNKNOWN). Doc 13 #12 still applies.

**Payment and tips** (OBSERVED, `GameStateCafe::onEatTaskComplete` @0xbaa10):

```
tipRaw = sellPrice × 0.2 × serverTipStat / 10
tip    = floor(tipRaw), +1 with probability = fractional part
tip   *= chefAvatar.tipMultiplier
cash  += sellPrice + tip
rating += 0.005
```

- A floating note shows "$price + $tip tip".
- With no tip, the plain cash sound plays; with a tip, the tip sound plays.
- A customer who leaves unfed shows an unhappy note and costs **rating −0.006**.

---

## F. Rating formula and the away / closed rules

**Scale.** Popularity is a float from 0 to 1. Stars = popularity × 5, and purple stars stack on top (INFERRED).
- `ZombieCafe::getModifiedRating` @0x13332c = clamp(popularity + furniture bonus + objective bonus, objectiveBonus, 1). Purple-star objective bonuses act as a **floor**.
- Each completed objective is worth +0.2 (`RATING_PER_COMPLETION`), which is 1 star.

**Live events:**

| Event | Change |
|---|---|
| Customer served | +0.005 |
| Customer leaves unhappy (no seat, not served in 60 s) | −0.006 |
| First bite of an attack | −0.1 |
| Neglected rival | −0.1 (`ZombieCafe_ENEMY_RATING_MODIFIER`) |

The rating is clamped to 0–1 after every change.

**Customer arrival** (OBSERVED, `resetCustomerTimer` @0xaf258):

```
interval = MAX(18,000) + (MIN(4,500) − MAX) × modifiedRating + U(−1000, +1000) ms
```

That is 18 s apart at 0 rating and 4.5 s apart at full rating. Each arrival roll also passes a visit chance of 211–238 out of 256, rising with rating.

**Away / offline catch-up** (OBSERVED, `GameStateCafe::advanceTime` @0xb7fc0 and `advanceTimeSection` @0xb6b78). The time away is first scaled by **`TIME_SCALE_FACTOR` = 0.25**: the café runs at **a quarter of real speed** while you're gone. Then:
1. **If the café is closed:** rating −= elapsed × `RATING_DECREMENT_CLOSED` (1.852e-8 per ms). Offline that is about **0.0167 per real hour, about 0.08 stars/h**. In live play (unscaled) it is about 0.067/h, about 0.33 stars/h.
2. **Cash items** fill at their $/h rate up to their cap.
3. **Each rating-bonus item** adds its bonus per hour of scaled time. These are the "star" decor items that make the rating rise faster.
4. **The customer flow is simulated with closed-form rates.** It uses:
   - the entry rate from the rating;
   - a departure rate of `1 / (P_notServed × 60 s + (1 − P_notServed) × (30 s eat + serving time))`;
   - a "café full" probability from seat count and server strength (`TABLE_SERVER_MODIFIER` 0.12).
5. **If the counter stock runs out partway**, the absence splits into a served part, then an **out-of-food part**:
   - in the out-of-food part every arriving customer counts as unserved (−0.006 each);
   - in the served part each customer is +0.005;
   - cash for the served part is the counter stock sold plus tips.
6. Working servers share the served count: each gets XP (`SERVING_EXPERIENCE` = 1 per customer) and adds to its customersServed.
7. **The net rating change over the whole absence is capped at ±0.4** (`MAX_RATING_INCREASE`), which is ±2 stars.

So the original's answer to "no food on the counter" (doc 13 #1) is:
- live: customers still come, wait 60 s, then leave unhappy;
- away: the same happens at quarter speed, with the loss capped at 2 stars per catch-up;
- the tutorial "out of food" hint fires;
- iOS adds an "Out of Food" push notification (from its notification options).

**Closing:** tapping the door closes the café (`Cafe::setDoorOpen`, `CafeWall_DOOR_CLOSED/OPEN` art 74/75). Help says the rating drifts down more slowly than when you're out of food.

---

## G. State machines

**Customer:**

| Step | Rule |
|---|---|
| Spawn | Walks along the sidewalk to the door |
| Door | Pauses 1 s ± 0.8 s |
| FindSeat | Walks to a free chair whose table is clean. None free: leaves unhappy (−0.006) |
| Sit | `sit` clip; starts the 60 s wait for food |
| Served in 60 s | Holds the food 2 s, then `eat` for 30 s (10 s in the tutorial), then pays (price + tip, +0.005) and leaves a dirty plate |
| Not served | Leaves unhappy (−0.006) |
| Panic (a bite starts nearby) | Stops everything, screams; if not killed, runs out (`run`) |
| Infected | Becomes staff (§A) |

**Zombie worker:**
- **Idle (0)** ⇄ **Working/Serving (1)**, **Cooking (2)**, **Resting (3)**.
- Every 60 s outside rest and attack: the bite check (§B), which can lead to **Attacking (4)** → feast → back to idle.
- The daydream timer leads to **Daydreaming (5)** for 10 s (`startled`, then `hit` gags). After it, the zombie goes back to its previous state, and the player can tap it awake.
- Energy 0 from damage leads to **Reanimating (6)** for 8 h (`death` pose), then idle.
- Working and cooking drain 3 energy/min, never below 1. Resting refills it.
- **Level up** (OBSERVED, `CharacterInstance::tick` @0x7cf30): when XP ≥ `STAFF_EXPERIENCE_LEVELS[level]`, the level goes up by 1 (cap 35) and **energy is refilled to the new max**.

**Rival server (raid):** café job (clean/serve) → raid goes live → attack the nearest zombie inside → re-target or wander.

**Rival chef:** cooks at the stove → once every server is down, attacks the zombie inside → dies → raid won.

---

## H. Meat Locker (zombie storage)

All OBSERVED in the Android build; `GameStateMeetLocker::*` @0x1401c0–0x142d30, `GameStateCafe::onLockerButtonPressed` @0xb2f54.

- **Capacity:**
  - starts at **5 hooks** (the `ZombieCafe` constructor @0x1373a0);
  - each expansion: **+5 hooks for 5 toxin** (`buyConfirmed`);
  - **no more expansion once capacity reaches 50**, with a "can't expand" notice. The iOS strings confirm a hard maximum.
- **Storing** (the LOCKER button on a zombie's command bar):
  - if the locker is full, the expand prompt shows instead;
  - otherwise the zombie leaves the staff list for the locker list, groans, has its tasks cleared and **disappears from the café**;
  - **if its energy is exactly 0 it is set to 1.**
  - It keeps its whole character record: level, XP, energy, kills and name. INFERRED from the same object being moved; nothing is reset.
- **Locker screen:**
  - zombies hang on hooks in the **`hung`** clip, and the selected one plays **`hung2`** (a wiggle);
  - buttons are Put back, Fire and Add 5 Hooks;
  - **Put back** works only if the staff count is below the crew cap for your level (`checkStaffNum`); otherwise a "staff full" notice shows;
  - **Fire** deletes the zombie for good.
- **Unlock and auto-store:** iOS gates the locker at **level 9**. Android gates it only behind a tutorial step. With a full crew, iOS sends newly infected or bought zombies straight to the locker (string evidence).
- **Energy regen in the locker:** UNKNOWN. No regen code was found for locker zombies.
- **Recovery:** a later build has a string compensating players whose locker zombies went missing (a save bug; paraphrased).

---

## I. Pets (iOS only; `PetData.bin` parsed, strings and Help)

**Basics** (OBSERVED, Help, paraphrased):
- Pets are like zombies but **never serve food**.
- **Each pet's house or station gives a café bonus**, and pets go on raids with the squad.
- The number of pets you can own is capped by café level. The cap values are UNKNOWN.

**Pet table:** 9 pets plus 1 empty slot (OBSERVED; columns decoded from the record layout).

| # | Pet (reference only) | HP | Stats (4 bytes) | Crit chance | Crit × | House bonus (from ItemData) |
|---|---|---|---|---|---|---|
| 0 | Steppe wolf | 950 | 11, 8, 9, 7 | 0.2 | 3.0 | −2% recipe cost |
| 1 | Undead rottweiler | 250 | 5, 5, 7, 5 | 0.1 | 2.0 | +1 tip on raid recipes |
| 2 | Grinning cat | 900 | 9, 11, 9, 6 | 0.2 | 3.0 | +5% cook XP on one theme |
| 3 | Sphinx | 1000 | 10, 9, 8, 9 | 0.2 | 2.0 | +5% cook XP on one theme |
| 4 | Robo hound | 900 | 10, 9, 5, 5 | 0.2 | 3.0 | +5% cook XP on one theme; Amptron torso |
| 5 | Robo lion | 1000 | 10, 10, 9, 7 | 0.2 | 3.0 | +1 speed to servers; left leg |
| 6 | Robo bear | 500 | 6, 5, 6, 6 | 0.1 | 2.0 | −2% recipe cost on one theme; right leg |
| 7 | Robo bull | 650 | 9, 6, 4, 3 | 0.1 | 2.0 | +1% zombie regen; right arm |
| 8 | Robo panther | 300 | 5, 6, 8, 4 | 0.1 | 2.0 | +1 tip on general recipes; left arm |

- The meaning of the four stat bytes is INFERRED to be attack strength, attack speed, move speed and one more; field names are not in the data.
- The 9-byte header of each record holds 20 and 1. These are probably a toxin price and a per-pet limit (UNKNOWN).
- **Crits:** pets roll a critical hit using the crit chance and multiplier columns. This is OBSERVED as data columns, plus the UI labels "Cri. Chance" and "Cri. Multiplier".

**Pet clips** (dog set, from the iOS file list):
- appear, disappear, walk, idle, sit, sleep;
- 3 attack clips plus one **critical attack**;
- dead.
- The robots have their own appear and disappear clips.

**KO and revive** (OBSERVED as server event names `RevivePet` and `HealPet`, and the `PetRobotRevive` sound):
- Pets get knocked out and are revived or healed, like zombies.
- The **Pet Tombstone** gives pets bonus XP per kill, so pets level up.

**Summons:**
- **Amptron:** needs all **5 different robot pets**. One can be summoned at a time, **once per day**. It has a **special attack button** to tap while it is attacking. It transforms in and out (the `voltron_*` clips and transform sounds).
- **Zombie Yeti:** summoned from the Yeti Tombstone. Its duration scales with your level. At least one of your zombies or pets must already be inside the rival café.
- **Big Bad Wolf:** a zombie of one of three fairy-tale types (a red-hood girl, a huntsman, a granny) that is inside the rival café can **transform** into the wolf. There is a per-raid limit.
- A **Tornado** effect clip also exists (UNKNOWN use).

---

## J. Chef avatars

Sources: OBSERVED from constants and strings; Help paraphrased.

- The player picks a chef at the start (`GameStateChooseChef`). There are 9 starting chef looks (character ids 55–63 are "Chef"; id 54 is the generic rival chef).
- **Unlockable avatars:**
  - `ZombieCafe_UNLOCKABLE_ENEMY_CHEFS` = 14 rival-chef character ids (40–47, 52, 59, 77–80), one per rival theme;
  - each shows **"Defeat to unlock"** until you beat that rival's chef. The iOS Help says special or boss cafés unlock them.
  - A "!" appears on the Chef button when a new one is available.
- **Avatar perks**, read from the avatar's type (§0):
  - **Cook Speed** multiplies stove progress (§E);
  - **Tip Multiplier** multiplies every tip;
  - **Zombie Regen** is added to the resting refill rate (§D);
  - **Cook XP** (iOS label; offset not traced).
- **Defence:** zombie-chef avatars get a zombie type's energy and defence when friends raid your café (Help).
- **Choose-chef screen:** previews each chef by randomly cycling the `ANIMATION_POOL` clips. The pool holds 20 byte entries; their exact clip ids were not decoded.

---

## K. Idle / acting clips: when they play

OBSERVED: every clip-change call site in the café, raid and locker code was checked.

| Clip | Where it plays |
|---|---|
| `startled`, `hit` | Daydream start and the gag inside it (§B). `hit` also plays on being struck. |
| `crouch` → `feast` → `mouthwipe` | The feast sequence (§B) |
| `hung` / `hung2` | Meat Locker hooks and the selected zombie (§H) |
| `death` | Dying, and lying KO while reanimating |
| `operate` | Cooking, and stealing food in a raid |
| `sit` | Seated customers |
| `run` | Panic, fleeing, fired zombies |
| `idle3`, `idle4`, `idle5`, `celebrate`, `rise`, `hungry1`, `hungry2`, `bump`, `attack2`, `attackHuman`, `walk3`, `walk4` | **No café-logic call site in this Android build.** They are probably used only in the choose-chef preview pool (INFERRED), or added in iOS logic we couldn't decompile. |

**Recommendation for Zombs BBQ:** the original never used random idle gags or a hungry warning in the café. Ours (doc 11 #2, #19) would be new design, not copying.

---

## L. Sounds and music

**Sound table** (iOS `SoundData.bin`; 227 ids, OBSERVED names grouped):
- **Kitchen:** blender (long and short), chopping, frying, drink pour, long-cook loop, egg timer.
- **Café:** door open, cash ×3, cash+tip, dish ×8.
- **UI:** page flip ×4, click ×21, select ×6, selecting-human ×14, pick-up item, put-down item, place object ×3, rotate ×3, buy error, unlock dialog, textbox pop, book close, camera, pop.
- **Ambience:**
  - **diner ambient loop**;
  - neon sign hum;
  - sign flicker;
  - fly buzz.
- **Zombie voices:** groans ×10, grunts ×23, "Brains" ×6, zombie dying (male ×2, female ×2), zombie eating, **zombie refresh** (male ×2, female ×2, played on ENERGIZE), daydream (male and female).
- **Human voices:** male grunt ×8, female grunt ×9, male dying ×7, female dying ×5, screams ×7 plus female screams ×8, **group screams**: mixed ×5, male ×3, female ×3, plus one man's scream.
- **Combat:** hits ×5, impacts ×7.
- **Pets and summons:** an animal set (dying, eating, groan, grunt, refresh, ×2 each), robot pet (attack, eat, groan, dead, revive), Yeti punch and smash, tornado, Amptron (transform, de-transform, walk, special attack), big wolf (attack, transform, de-transform), haunted-house transform poof.

**Triggers seen in code** (OBSERVED):
- **Being hit:** a voice grunt picked at random from the set for the victim's gender and human/zombie. At most once per 2 s per character (`tookDamage`).
- **Landing a hit:** one of 7 impact sounds, at most once per 0.9 s per attacker (`Character_HIT_INTERVAL`, `dealtDamage` @0x7d8c0).
- **Death:** zombie men and women have 2 dying sounds each; human men have 7 and women 5 (AttackTask and GuardTask kill branch).
- **Groan:** one of 5 per gender. It plays when a zombie starts a bite, enters the locker, or starts a raid entry walk (`groan` @0x7d76c).
- **Group scream:** on the first bite, weighted by the men/women panicking (`onAttackHit`).
- **Infect:** one of 3 on conversion.
- **Feast:** a chewing sound every 500 ms.
- **Rest:** a gendered voice sound when settling outside (which sound id is UNKNOWN).
- **Cooking:** the cooking sound when the stove starts.
- **Serve:** cash on payment; cash+tip when a tip lands.
- **Locker:** a sound when expanding.
- `SOUND_CHANNELS` = 4 and `MUSIC_CHANNELS` = 2.

**Music** (iOS `MusicData.bin`, 20 tracks):
- a jazz bed;
- theme versions 1, 3, 4 and 5;
- stings ×6 plus a short stinger;
- mini cues ×4;
- groove transitions ×3;
- a haunted-house track.

Track 1 plays at raid end. Music changes are spaced by `GameStateCafe_MUSIC_INTERVAL` = 5 s. Other track-to-event mappings are UNKNOWN.

---

## M. Other player-facing features not in docs 08/10/11/13

From the iOS Help, UI strings and constants; paraphrased.

- **Help page topics:**
  - Café Menu, Awning, Chef Avatar, Cooking, Recipes, Serving, Customers, Zombies, Tombstones;
  - Store (Cash items, Popularity items, Toxin barrels, Expansions, Special stoves, Pets), Item Storage;
  - Map (Friends/Franchises, Enemy cafés/Raids, Boss fights, Raiding friends), Leaderboards, Inviting friends;
  - Objectives, Options, FAQ.
- **Cookbooks:** four books:
  - General (unlocked by level);
  - Raid (raid, gift or toxin recipes);
  - Themed (unlocked by special stoves or cash; a stove comes with 2 recipes and can be upgraded for more);
  - **Favorites** (star a recipe; the book has a size cap and needs at least one entry).
  - Stoves can be told to cook from the Favorites book.
- **Recipe-collection XP bonuses:** unlocking 5, 10, 15 … 550 recipes pays out 5, 10, 25 … up to 7,500 XP (`RECIPE_XP_BONUS_*`, 33 steps). There are 10 chef **rank titles**, from a "fresh corpse" to an "inhuman remains" tier (paraphrased).
- **Online Frequent Fryer:** a daily return streak. Rewards by day: $25, $50, a set of meals, 1 toxin, $250, $350, meals, meals, 3 toxin, and so on. There is a 5% rare-recipe chance (`FrequentFryer_*`).
- **Magic Fridge:** one free dish a day (item index 248).
- **Boosters** (iOS): Super gives more cook XP and doubles burn time; Hyper gives more XP and dishes never burn; Turbo gives more servings and XP. Each needs the previous one.
- **Toxin Generator:** 5 toxin a day for 15 days, then it removes itself. **Toxin Drops** convert into toxin.
- **Radioactive recipes** (iOS): serving one turns a random customer into a free zombie, with a small chance of a premium type. It needs a free crew or locker slot.
- **Trial items:** 24-hour trial versions of store items.
- **Item storage box:** store furniture instead of selling it. Items can't be stored or sold while food sits on them.
- **Clock-cheat penalty:** the "union investigation" turns the café green and blocks visits. Punishment lasts 24–336 h with a 10× time multiplier (`EXPLOIT_*`).
- **Friends:** collect a franchise fee and order one dish from each friend per day; raid one friend per day; a leaderboard of orders filled per week. Friend raids use rating ×0.0067, food ×2, defenders ×0.1.
- **Backup saves:** 3 slots plus an online slot, and a "load a previous version" prompt when loading fails (`BACKUP1–3`).
- **Notifications:** per-type toggles for Cooking finished, Food burned, Out of food, Enemy raids and Other, plus quiet hours (a "Disable from … to …" time range).
- **Batch actions:** "Send all your zombies in to attack?" (`attackAll`) is the only batch action found. **No "close for the night" or batch-rest action exists**; closing is just tapping the door.
- **Reopen a beaten rival early:** costs 2 toxin (`ZombieCafe_CAFE_REOPEN_COST`).
- **Recipe unlock costs:** an unknown recipe costs 5 toxin, a variant 5, a rare one 10 (`RECIPE_*_COST`).

---

## N. Full constant set

All 600 values were recovered by emulating `Constants::load`.
- **Gameplay-relevant ones not already in doc 10:**
  - `Character_FILL_AVAILABLE_THRESHOLD` 0.8: ENERGIZE is only offered below 80% energy;
  - `Furniture_MAX_RATING_BONUS` 0.13;
  - `Furniture_MAX_EARNINGS` 200;
  - `Stove_ACTIVE_COOK_BURN_GRACE_SECONDS` 120;
  - `GameStateCafe_TIME_SCALE_FACTOR` 0.25;
  - `GameStateCafe_INSTANT_INFECT` 1;
  - `GameStateCafe_SAVE_INTERVAL` 30 s;
  - `ZombieCafe_ENEMY_BOSS_COOLDOWN` 4 h;
  - `ObjectiveSystem_MAX_BONUS_TIME` 168 h;
  - `ObjectiveSystem_TOXIN_PER_COMPLETION` 2 (the bribe);
  - `ObjectiveSystem_CUSTOMERS_PER_LEVEL` 10;
  - `ObjectiveSystem_SPEND_CASH_PER_LEVEL` 100;
  - `ZombieCafe_MAX_LEVEL` 83;
  - `ZombieCafe_MIN_LEVEL_THEME_AVAILABLE` per rival theme: 1, 1, 6, 9, 12, 15, 18, 10, 99, 8, 11, 12, 10, 10.
- **Café XP curve** (`experienceLevels`): 0, 3, 12, 30, 75, 150, 274, 465, 791, 1265, 2024, 3036, 4251, 5526, 7184 …
- The full dump is in the session scratchpad (`out3/consts_clean.txt`). It is not committed.

---

## O. Still UNKNOWN or blocked

- **REA native analysis is blocked on Windows** (details in the method note at the top). All logic comes from headless Ghidra; iOS logic (pets, auto-store into the locker, later tombstones) is from data and strings only.
- Unresolved items:
  - the server's dish-choice rule;
  - exact Revive and Heal toxin prices;
  - the meaning of the raid countdown field;
  - where `KILL_HEALTH_BOOST` and `ZOMBIE_ATTACK_WARNING` are used;
  - whether locker zombies regenerate;
  - pet stat-byte names and pet caps per level;
  - sound-id ↔ call-site numbers (the call arguments were lost in decompilation, so trigger→sound pairs above are matched by variant counts, INFERRED);
  - the choose-chef animation pool ids;
  - diagonal pathing rules.
