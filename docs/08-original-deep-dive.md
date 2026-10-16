# 08 — Deep Dive: How the Original Really Worked, and What Zombs BBQ Must Change

Round two of research (Oct 2026). Unlike [01 — Research](01-research.md), this round could check facts against **the original game's own data**. Two public fan-preservation projects decode its files: [Airyzz/zombie-cafe-revival](https://github.com/Airyzz/zombie-cafe-revival) and [0StevenH0/zombie-cafe-revival](https://github.com/0StevenH0/zombie-cafe-revival). From them we used:
- the furniture table (484 items);
- the customer and character table (219);
- the recipe table (216);
- the enemy café list;
- the animation list;
- the official in-game Help page;
- a real player save, rebuilt into a screenshot.

Fan wikis, forums and reviews (via web search) fill the gaps.

> **IP rule.** We use these files only to *study* mechanics, numbers, layout and colour. No sprite, sound, text or name from the original is copied into Zombs BBQ. Every asset in our game is drawn from scratch in code.

Confidence labels:
- **[DATA]**: read from the original's data files or official Help text.
- **[WIKI]**: from fan wikis or forums.
- **[INF]**: our inference.

---

## 1. What the original actually looks like

### 1.1 The street
**[DATA]**, from the ground tiles and a rebuilt player save:
- The café sits on the **corner of a crossroads**. Its back (north) corner points into the intersection.
- A **concrete sidewalk** runs flush along *both* back walls, the north-west and the north-east.
- Beyond each sidewalk is a two-lane **grey asphalt road with a yellow dashed centre line**, then a far sidewalk with a kerb.
- **Olive, tufted grass** fills the other three quadrants of the crossroads and the whole front of the lot, where the café grows when expanded.
- The ground tile set has only five tiles: Grass 1, Grass 2, Sidewalk, Road and Road stripe. There is no city backdrop.

### 1.2 The café
- **Shape [DATA]:** two very tall back walls, about 3 tile-heights and roughly twice a character's height. The front two sides are open.
- **Floor:** the starting floor is pale grey tiles split 2×2 with dark grout. Starting stains on the floor:
  - olive and maroon grime smears;
  - cracked tiles;
  - a **rat** and a bug.
- **Walls:** the starting walls are **dirty cream-yellow** with:
  - green **slime drips**;
  - jagged **cracks**;
  - **claw gouges**;
  - smears at the base.
- **Item tints:** walls, floors, tables and chairs are grey artwork tinted by one of six stock colours: white, cream-yellow, sage green, slate blue, oxblood and charcoal.
- **Grid:**
  - **Every buildable item fills exactly one tile** (468 of 484).
  - The floor diamond is about **1.58 : 1** (164×104 px on retina), noticeably steeper than a 2:1 grid.
- **Starting kit (all $50 or less) [DATA]:**
  - **Dirty stove, dirty fridge and dirty sink**. Each *lowers* the rating slightly (−0.01).
  - **Plain table** and **plain chair**.
  - **Dead plant**, **boarded window** and **toxic barrel**.
- **Camera:** in real play it is zoomed in close. Characters are about one-sixth of the screen height, and you pan around the café.

### 1.3 Characters
- **Proportions [DATA]:** big heads (about 45% of body height, about 2.2 heads tall).
- **Faces:** *adult, ugly and sardonic*, not cute: heavy lids, eye bags, smirks, missing teeth, stubble.
- **Humans:** khaki-grey skin (`#b3b294`, shadow `#968e6f`) and muted clothes (charcoal, olive drab, khaki).
- **Zombies:**
  - green skin in several shades (`#88bb44`, `#55aa66`, shadow `#427e40`);
  - **yellow eyes with no pupils**;
  - hair falling out to show green scalp;
  - torn, stained clothes.
- **Line:** thin near-black outlines, only about 3% of head width.
- **Rig:** cut-out parts (head, torso, pelvis, two-part arms and legs), drawn in two facings (front-¾ and back-¾) and mirrored. Separate "chair-back" pieces exist so seated customers look right.
- **Animation list [DATA]:**
  - attack, attack2, attackHuman, bump, carry, celebrate, crouch, death, eat, feast, hit, hung;
  - hungry1/2, idle ×3–5, mouthwipe, operate (cooking), rise, run, serve, sit, startled, walk ×4.

### 1.4 HUD
- Icon buttons along the **top-left**: shop bag, clipboard, map, cookbook, then the crew head with "11/11" and the storage crate.
- The **awning** runs across the top: "YOUR CAFÉ", stars, level, XP bar, cash, toxin, logo. Its stripes are maroon `#6d1727` and dusty rose `#7e454e`, with stains and a torn edge.
- Buttons are slanted **olive "sticker" buttons** (`#486d0d` → `#658433`) with white caps text. Red is used for back.
- Panels are textured materials: chalkboards in wood frames, a yellow legal pad with pushpins, torn paper, a ring-bound cookbook.
- **Overall palette is muted** (mean saturation about 0.3, value about 0.6). Bright colour appears only in small accents.

---

## 2. How the original played (verified)

| System | The original | Source |
|---|---|---|
| Start size | 7×6 | DATA (save) |
| Expansions | 8×7 $3.5k → 9×8 $25k → 10×9 $75k → 11×10 $100k → 12×11 $120k → 13×12, 14×13, 15×14 $150k each. Cash or toxin, bought in order. | DATA |
| Seating | **One customer per table**: a 1×1 table plus a 1×1 chair beside it, facing it. Chairs rotate four ways. | DATA, WIKI, Help |
| Cleaning | Customers leave a **dirty plate**. Servers carry plates to a **sink or trash can** (Dirty sink $50, Plain $500, Stainless $25k, Red trash can $1.5k…). A table with a dirty plate can't seat anyone, and customers who find no clean table leave unhappy. | Help, DATA |
| Serving | Servers take dishes from the counter to waiting customers and clear plates. They need a clear path to every table, counter and sink. More servers means less work and less energy each. | Help |
| Cooking | Select a cook, then a stove, then a recipe. **The cook must stay at the stove for the whole cook time.** If they leave, cooking pauses. Tap the cook, then the stove, to carry the finished dish to a counter. | Help, WIKI |
| Burning | A dish burns if left untouched as long as its cook time. Mystery Meat burns after 5 min. | Help |
| Counters | Dishes stack on one counter without overwriting each other. | Help |
| Stoves | All 1×1. Better stoves cook 10–30% faster (StoveSpeedMult 1.1–1.3). | DATA |
| Rating | 0–5★. Happy customers raise it; unhappy or attacked customers lower it. **Star items make it rise faster and fall slower.** Dirty starting items count slightly against it. A closed café drifts down slowly; running out of food drops it faster. | Help, DATA |
| Purple stars | The objective to-do list (from Lv 6) has 4 tasks. Finishing it adds a purple star (max 3) lasting 48 h / +36 h / +24 h. You can bribe the reviewer with 2 toxin per task. | Help, WIKI |
| Customers | The pool depends on café level and star rating (min rating stored as 51 per star). Each type has a spawn weight. Customers leave unhappy if there's no clean table or they wait too long. When a zombie eats one, **everyone inside runs out screaming without paying**. | DATA, WIKI |
| Customer stats | Energy (usually 100; tough types 140–160), Speed, Attack, Tips, Recharge, Focus, Patience. Infect cost in cash or toxin. | DATA |
| Crew cap | 1 zombie at the start, about 10 by Lv 20, 12 at Lv 42, 13 at Lv 46. | WIKI |
| Zombie levels | Zombies gain XP by serving and raiding. Each level raises max energy (+5%). | Help, WIKI |
| Energy | Drains while cooking or serving. Resting zombies **walk out the door and rest outside**, recharging about 3 energy/min. Toxin barrels speed this up and stack. Eating a customer restores about 20%. | WIKI, Help |
| Daydreams | Low-Focus zombies daydream or fall asleep. Tap them to send them back to work. | Help |
| Closing | Tap the **door** to close. No new customers come; diners finish and leave; cash items stop. The rating slowly falls. | Help, WIKI |
| Cash items | Each earns $/h up to a max (Vending $25/h up to $250, Jukebox $55/h up to $1.5k, Slot machine $150/h up to $1.8k, ATM $200/h up to $5k). "$" shows when cash is waiting, "!" when full. | DATA, Help |
| Dishes | Long real-time timers: 2 min, 5, 15, 60, 90, 180, 480, 720, 1080, 1440, 2880, 4320 min. Thin margins; mainly an XP engine. | DATA |
| Variants | Bulk, Quick, Spicy, Fancy, Frozen and Fresh versions come from raids or friends. An UNLOCK button in the fridge learns them. | Help, WIKI |
| Daily | "Online Frequent Fryer": cook every day for escalating rewards. | WIKI |
| Storage | The Meat Locker holds spare zombies on hooks (5 hooks at first, more for toxin). | WIKI |

### 2.1 Raids
- **Map:** enemy cafés sit to the right of yours and friends to the left. Each enemy café shows its level.
  - A beaten café **closes and a new restaurant opens in its place later**.
  - A rival left alone too long **starts stealing your customers**. **[Help]**
  - After Lv 5 a special **boss café** sometimes appears and drops a rare recipe. **[Help]**
- **The rival café** is drawn exactly like a player café: two back walls, a door, the corner-lot streets, dining tables with stools and customers, plants, **dividers** walling off the kitchen, a serving counter with food, and a chef at the stoves behind it. **[DATA: enemy café item lists use diner tables, stools, potted plants and plain dividers]**
  - Named cafés include Café, Diner, Italian Eatery, Asian Restaurant, Tex-Mex, Pub, Chez, Frankenstein's Lab, Leprechaun's, Gourmet Goblin, Deadbeard's, Drac's and Snack Shack.
- **Line-up:** zombies line up **single-file on the sidewalk** outside, each with an energy bar.
  - **Tap a zombie, then ATTACK** to send it on a general rampage.
  - Or **tap a zombie, then a target** (a person, or the counter to steal food).
  - "Attack all" exists too. Zombies walk to the door at their own Speed, so wiki advice is to send slow ones first.
- **In the fight:**
  - Customers **run around screaming** and can escape.
  - Waiters and waitresses fight back. The **Head Chef stays in the kitchen** behind the counter and **comes out once most of the staff are down**.
  - Wiki advice: "keep them out of the kitchen" (1-on-1 with the chef there is deadly).
  - Attacks are scratching, then eating. There's no blood.
  - Eating pays $20 and 2 XP and restores some energy.
- **End:**
  - **Win** = Head Chef beaten. Rewards: food (100%), cash every time, rare toxin, a recipe from studying the food.
  - **Lose** = everyone down, but you keep the cash from eating.
  - **Retreat** = white flag.
  - Downed zombies **reanimate in 1 h** (8 h in early versions) with 20 energy, or toxin to skip.
- **Tombstones:** bought and **placed outside the café**. During a raid, tap one to give all zombies its bonus for **5 seconds**, glowing in its colour:
  - Strength = red, Health = green.
  - One bonus at a time. Five uses, then 24 h to recharge.
- **Pets:** dogs, a wolf, five robots that combine (Amtron), and the Yeti summon (75 toxin, max 3).

---

## 3. Gap list, ranked (what to fix first)

Priority reflects (a) how much it changes the feel of play compared with the original, and (b) what the owner asked for explicitly.

### P0 — identity: without these it doesn't look or play like the original
1. **Art direction**
   - Muted, grimy adult-cartoon art with thin outlines and texture, replacing the bright, thick-outlined kids' look.
   - Adult, ugly faces; khaki human skin; yellow-eyed zombies.
   - The textured awning; olive sticker buttons; chalkboard and paper panels.
2. **The street**
   - Corner lot at a crossroads.
   - Sidewalk plus two-lane road along **both** back walls; far sidewalks; olive grass elsewhere.
   - Customers arrive along these sidewalks.
3. **Grid fidelity**
   - Steeper tile (about 1.6:1), tall dirty walls, a tiled floor with stains.
   - **Rectangular rooms** (7×6 up to 15×14) with the real expansion ladder.
   - **All items 1×1.**
4. **Seating:** single-seat tables with separate chairs (four-way rotation). Replaces our picnic tables with benches and our 4-seat diner tables.
5. **Cleaning loop**
   - Dirty plates stay on tables.
   - Servers carry them to a **sink or trash can**.
   - Dirty tables can't be used.
   - The starting kit has a dirty sink.
6. **Cooking fidelity**
   - The cook stays at the stove; cooking **pauses** if they leave.
   - Burn time = cook time.
   - Dishes stack on counters.
   - Better stoves cook faster.
   - The starting kit has a dirty stove and fridge.
7. **Raids rebuilt as real cafés**
   - Walls, door, tables with customers, dividers, a kitchen with the chef.
   - Single-file sidewalk line-up.
   - Commands: tap a zombie, then a target, or ATTACK.
   - Screaming customers; staff swarm; the chef comes out when the staff are down.
   - White flag to retreat.
8. **Animations that read correctly**
   - Sitting on a chair at a table: the right facing, legs bent, the chair back drawn over the body when it faces away.
   - Eating, carrying plates, clearing plates, cooking ("operate").
   - Resting **outside**, daydream and sleep.
   - Scratch-then-eat attacks, death, rise.

### P1 — the systems around the core loop
9. **Customer flow:** walk the sidewalk, enter at the door, need a *clean* table, give up after a wait limit, show a thought bubble with the dish. Pay with a floating "$". Show a mood face as they leave. Everyone flees screaming when one is eaten.
10. **Crew cap curve** from 1 slot, to about 10 at Lv 20 and 13 late.
11. **Rating model**
    - Star items speed up rises and slow down falls.
    - Dirty items count against you.
    - Closed or out-of-food penalties.
    - Green or red blinking stars on return.
12. **Purple bonus stars** from a 4-task to-do list; the reviewer bribe. *(Done in v3.)*
13. **Cash items** at $/h with a cap; "$" and "!" markers; no earnings while closed.
14. **Zombie levels** from serving and raiding (+5% max energy per level).
15. **Recipe ladder** modelled on the original's economics: long timers, thin margins, XP-heavy. Our own BBQ dishes and names.
16. **Rare variants** (Bulk, Quick, Spicy, Fancy, Frozen, Fresh) from raids, plus UNLOCK in the fridge. *(Done in v3.)*
17. **Tombstones** as placed outdoor items with 5-second glow buffs and 5 uses per 24 h.
18. **Rival rotation:** a beaten café closes and is replaced later; a neglected rival steals customers; a special boss café appears after Lv 5.
19. **HUD layout** closer to the original (icon row at the top-left, crew head with count, storage crate), still fitted to the iPhone safe areas.

### P2 — depth and longevity
20. Online Frequent Fryer daily streak.
21. Meat Locker (zombie storage).
22. Chef avatars.
23. Paint individual floor tiles and wall sections (Walls/Floors tab), instead of only whole themes.
24. Offline "neighbour" cafés standing in for friends (franchise fees, one order a day, friendly raids), the way the revival project's offline mode does it.

---

## 4. Lessons from the original's bugs and patches

From the patch-history research. Each one is a rule for us.
1. **Saves must never die.**
   - Write atomically and keep a backup slot.
   - A crash or bad save must never force a wipe; the original's worst bug was the crash on Play.
2. **No frozen workers.**
   - Validate layouts at placement time.
   - Re-dispatch idle workers after load or a raid.
   - Show a "can't reach" icon on a stuck worker.
   - Frozen "brain-dead" zombies were the most common gameplay bug.
3. **Every state can be cleared.** Burnt food can always be scraped; any item can be stored or sold.
4. **Fair timers.** Cap offline progress and don't punish honest players. The original's clock-cheat detector shamed whole cafés green for days.
5. **Energy is a choice, not a punishment.**
   - Closing the café arrived within weeks of launch.
   - Each zombie level adds 5% energy.
   - Reanimation was cut from 8 h to 1 h.
6. **Nothing core behind premium currency.** Version 1.1.0 made every expansion buyable with cash.
7. **Raid buffs usable mid-raid.** The original only added this in its last patch.
