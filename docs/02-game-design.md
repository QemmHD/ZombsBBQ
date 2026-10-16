# 02 — Game Design Document: Zombs BBQ

> **Elevator pitch:** The world ended, but the brisket didn't. Run a backyard smokehouse after the zombie apocalypse, staffed entirely by zombies you infect from your own customers. Smoke ribs, keep your crew from snacking on the guests, decorate the joint into a legend, and send your horde to raid rival restaurants for their secret recipes.

| | |
|---|---|
| **Platform** | iPhone first (iOS 17+), iPad supported; Android later |
| **Orientation** | Landscape, like the original. Every HUD element sits outside the notch/Dynamic Island and home-indicator zones. |
| **Genre** | Restaurant management + decorating sim + light async raiding |
| **Session length** | 3–10 min check-ins; 20–40 min "decorating sessions" |
| **Audience** | 16–35, nostalgic Zombie Café players, cozy-sim fans who like dark humor |
| **Rating target** | 12+ (cartoon horror, goo instead of gore) |
| **Business model** | Free-to-play, fair: cosmetics, Grill Pass, optional rewarded ads, one-time "No Ads + Starter" pack |

---

## 1. Design pillars

1. **Gross-cute & funny.** Every system has a joke in it. Zombies drool in the brisket, the food critic gets bitten mid-review, the bug zapper electrocutes a zombie's hair into an afro.
2. **Always something juicy to tap.** No dead screens. Sizzles, coin bursts, squash-and-stretch, steam, combo popups. Things bounce when you touch them.
3. **Your joint, your way.** Deep decorating with themes, and a joint that visibly evolves from a burnt-out shack to a neon roadhouse.
4. **Collect the horde.** Every customer is a potential zombie with a unique look, stats and a funny idle animation.
5. **Fair & respectful.** Timers create anticipation, not frustration. You can always progress without paying.

---

## 1b. The original's funny twists (all kept, then turned up)

Everything that made Zombie Café funny is in, mapped to Zombs BBQ:

| Original gag | In Zombs BBQ | Where it shows up |
|---|---|---|
| **Your waiters are zombies, and the customers don't seem to mind.** | Same. Customers happily eat ribs served by a drooling corpse. Some only complain about the slow service. | Core joint |
| **Tired zombies attack the customers.** | When a zombie's Energy drops below its **Patience**, it lunges at a guest: a cartoon chase around the tables, the customer screams and flees, the stars wobble. Nurses and cops react (the cop "arrests" the zombie and it sulks for 10 s). | Energy system §3.3 |
| **Any customer can be infected, and keeps their outfit as a zombie.** | Same, with an **infection dance** cutscene. Every zombie keeps their human outfit, torn and green, plus one gag detail: the food critic's notepad reads "BRAINS 5/5", the lumberjack's axe is stuck in his own hat, the cheerleader's pom-pom is a brain. | §3.3, art bible |
| **"YOU" look human, but you're the one doing the infecting.** In the original you start as the only human-looking chef: you cook the first dish yourself, then infect your first customer, and that customer becomes your first cook. From then on you infect more and more customers to build your crew. | **You are Patient Zero.** You look like a normal (slightly pale) cook with a bandage on your arm, and you have an Energy bar like everyone else. You cook, serve and infect. Your first infection becomes your first cook, and every zombie after that comes from *you*. The zombies call you "Boss" and never bite you. Tap yourself for **Photo / Info / Chef** (Chef sends you to cook at a stove). | Joint, FTUE §5, avatar |
| **Zombies crash face-down on tables, or sprawl on the lawn to rest.** | Exhausted zombies face-plant into tables or the lawn with "Zzz" bubbles. Unhired zombie applicants crawl on the grass outside groaning "joooob". | Energy/rest, curb |
| **"CLOSED" at night, zombies sleeping on the sidewalk.** | Flip the sign to **CLOSED**: zombies line up on the sidewalk and snooze (Zzz). Dishes don't spoil while closed (a vacation mode). | Joint |
| **Gross recipe names.** | Brain Burger, Finger-Lickin' Wings (literally), Pulled Pork(ish), Eyeball Kebabs, Toe-fu Skewers, Spleen Beans, Liver-and-Let-Die, Mystery Meatloaf. | Menu §3.1 |
| **Pun-named rival restaurants** ("Jane Wayne's Mess Hall"). | Every raid target is a pun: *Chuck Wagon's Chow Hall*, *Big Hank's Burger Barn*, *Vegan Vera's Salad Fortress*, *Colonel Crunch's Chicken Shack*, *Le Snob Bistro*, *Crust Me Pizzeria*. | Raid map §3.6 |
| **Costume and B-movie parody zombies** (kings, conquistadors, caped heroes, robot suits, cat-girls, monster zombies). | Event and raid-reward zombies are parody costumes and B-movie monsters: Zombie King, Conquistadead, Captain Rotten (caped), Mecha-Muncher, Kitty Corpse, The Swamp Thing-ish, Mummy Dearest, the 50-Foot Grandma. | Collection, events |
| **Zombie pets that fight in raids** (zombie dogs, werewolves). | Zombie Pug, Rot-weiler, Werewoof, and Two-Headed Cat. They roam the joint for perks *and* join raids as fast runners. | Pets §3.7, raids |
| **Raid line: zombies shamble in single file with "!" and health bars.** | Same visual, plus lanes, abilities and goofy KO animations (dizzy stars, sinking into the ground, a "bonk" sound). | Raids §3.6 |
| **Toxin as the magic green currency.** | **Brain Sauce**: a glowing green jar. Zombies chug it and their eyes spin. | Economy §4 |

**New gags in the same spirit:**
- **Butterfingers trait:** the zombie drops plates; the customer eats off the floor anyway and leaves a *bigger* tip.
- **Spare parts:** a zombie's arm occasionally falls off mid-serve, and they pick it up and keep going. There's a 1% chance it ends up in the brisket ("Secret Ingredient!" popup, +10% servings).
- **Food critic review cards** are hand-written and funny: "Service was dead. 4 stars."
- **Health Inspector visit:** the inspector is visibly terrified, and you get a bonus if no zombie snacks on him.
- **Influencer customer** films a story; if a zombie lunges on camera, the video "goes viral" and you get a crowd rush, so a disaster becomes a win.
- **Zombie idle animations:** one plays air guitar on the smoker, one tries to eat a fly, one stares at the wall for 10 seconds, then walks into it.

---

## 2. Core loops

### 2.1 Minute-to-minute (the "shift")
```
Tap a cook (YOU or a zombie) → tap a stove → pick a dish (pay its cost)
   → (optional) timing tap for "Perfect Bark" bonus → dish cooks on a real-time timer
   → tap the finished dish → it moves to the serving counter with a serving count
   → zombie waiters auto-serve customers → happy (yellow) / angry (blue) faces, coins & XP pop
   → watch Energy bars → let tired zombies rest before they attack a customer
   → tap daydreaming zombies to snap them back to work
   → infect a happy customer → new crew member
```

### 2.2 Session (the "day")
```
Collect offline earnings → restock smokers with long timers → clear requests
   → infect 1 customer → decorate with new cash → launch 1–2 raids
   → claim daily quests → leave with long cooks running
```

### 2.3 Long-term (the "career")
```
Level up → unlock recipes, stations, expansions, themes
   → star rating ↑ → richer customer types arrive (critics, influencers)
   → rarer zombies → stronger raids → rival bosses on the Raid Map
   → seasonal events & Grill Pass → crew (guild) cook-offs
```

---

## 3. Systems

### 3.1 Cooking & menu

**Stations** (placed like furniture, upgradeable 1–5):

| Station | Unlock | Cooks | Special |
|---|---|---|---|
| Rusty Grill | Lv 1 | Fast dishes (1–15 min) | Starter station |
| Barrel Smoker | Lv 3 | Mid dishes (30 min–4 h) | Puffing smoke, "Perfect Bark" timing tap |
| Deep Fryer | Lv 8 | Sides (5–60 min) | Fry-splash animation |
| Sauce Cauldron | Lv 12 | Sauces that **buff** dishes (+servings/+price) | Bubbling green goo |
| Pit Oven (2×2) | Lv 20 | Long feasts (8–24 h) | Huge payout, big XP |
| Pizza Kiln | Lv 15 | Mafioso Pizzeria cookbook | Nod to the original's Pizza Oven → Mafia recipes |
| Tomb Smoker | Lv 25 | Graveyard Grill cookbook | Coffin-shaped, green smoke |
| Tiki Fire Pit | Lv 45 | Tiki cookbook | Torches, hula zombie idle |
| Neon Taco Truck | Lv 30 (event) | Event dishes | Parks outside the joint |

**Who cooks (same as the original):** a stove does nothing by itself. Tap a cook (**YOU** or any zombie), then tap a stove. The cook walks over, picks a dish and cooks it, and burns Energy while doing it. Better cooks (high Speed) work faster. Two cooks can stand on one floor tile between two stoves, the original's well-known space-saving trick, and we keep it on purpose.

**Dishes** have: cost, cook time, servings, sell price per serving, XP, and the station they need. Cooking keeps going while the app is closed.

**Cookbooks:** recipes are grouped in themed cookbooks, as in the original (which had 21 cookbooks and 320 recipes, 100+ of them only from raids). A cookbook unlocks by **buying its themed station**, the way the original's pizza oven unlocked the Mafia recipes. Zombs BBQ launch cookbooks: *Backyard Basics* (Rusty Grill), *Smokehouse* (Barrel Smoker), *Fry Shack* (Deep Fryer), *Mad Sauces* (Sauce Cauldron), *Feast of the Dead* (Pit Oven), *Raid Cookbook* (only from raids), plus event cookbooks such as *Graveyard Grill* and *Vampire Cookout* (Staked Steak-style puns).

**Fridge:** dishes you **loot in raids go to your Fridge**. From there you can serve them for free, or "study" them to **unlock that recipe** permanently. This is the original's raid-for-recipes loop.

**Finish now:** tap a cooking stove and press Finish to spend Brain Sauce and complete it instantly (as Toxin did in the original).

Starter menu (sample balance, tune in the spreadsheet):

| Dish | Station | Cost | Time | Servings | $/serving | XP | Profit |
|---|---|---|---|---|---|---|---|
| Charred Hot Dog | Grill | $10 | 1 min | 8 | $2 | 2 | $6 |
| Brain Burger | Grill | $40 | 5 min | 20 | $3 | 6 | $20 |
| Finger-Lickin' Wings | Fryer | $90 | 30 min | 30 | $5 | 12 | $60 |
| Pulled Pork(ish) | Smoker | $200 | 1 h | 40 | $8 | 25 | $120 |
| Rib Rack of Doom | Smoker | $650 | 4 h | 60 | $16 | 70 | $310 |
| 24-Hour Brisket | Pit Oven | $2,400 | 12 h | 120 | $32 | 300 | $1,440 |

Design rule: **short timers are lower profit per hour but higher XP per hour; long timers are higher profit and fit around real life.** Players choose to play actively or idly.

**Perfect Bark (optional skill moment):** when you start a smoker dish, a quick ring-timing tap appears. Hit the green zone for a **+15% servings** "Perfect" or **+5%** "Good". Missing it costs nothing. You can turn it off in settings (auto = "Good").

**Burning (faithful, with a safety net):** as in the original, a finished dish left on the stove **burns once it has sat for its full cook time again** (finish at 4 h → it burns at 8 h), and a burned dish is lost along with its cost. That "come back on time" tension is part of the feel, so we keep it, and add modern safety nets:
- A local push notification when the dish is ready, and another at 75% of the burn window.
- The first 3 burns are forgiven during the tutorial week.
- A **Keep-Warm Lamp** station upgrade adds +50% to the burn window.

### 3.2 Customers

Who walks in depends on **level and star rating**, as in the original. Customers inside at once ≈ **1 + your half-stars**, capped by free seats. Anyone arriving to a full house leaves with a blue frowny face. Each customer type has patience, a spend multiplier, a tip chance and a unique zombie form.

The **full roster** (common → legendary, the original's level-15 "rare" customers, Brain Sauce-priced specials up to 🧪 80 for The Champ) and the **rare-spawn rules** are in [06 — Menus, Unlocks, Customers & Raid Rules](06-menus-unlocks-customers.md#4-customer-roster).

Special-behavior customers (new to Zombs BBQ):
| Customer | Quirk |
|---|---|
| Cop | Arrests a misbehaving zombie (stuns it 10 s) |
| Nurse | Calms nearby customers (patience +) |
| Food Critic | Rates your joint; a great review brings a 1 h rush |
| Influencer | Films your joint; decor counts ×2 while they're in; a zombie attack on camera "goes viral" for a rush |
| Rival Chef (spy) | Tries to steal a recipe; a Bouncer catches them for a reward |

**Requests:** about 1 in 6 customers shows a bubble ("Extra sauce!", "Something spicy!", "Hurry!"). Fill it within its timer for tips, Vibe and quest progress.

### 3.3 Zombie crew (the heart of the game)

**Where zombies come from: YOU.** You are Patient Zero. You look human, but every zombie in the joint was infected by you. Tap a customer who has finished eating, then tap **Infect**. The customer shivers, turns green, their eyes pop yellow, and they do a little dance. They keep their outfit (torn and green) and join the crew. Your very first infection, in the tutorial, becomes your **first cook**. After that you keep infecting to grow the crew.

**Infection cost (like the original):** common customers cost **cash** (e.g. Construction Worker $250); special customers cost **Brain Sauce** (the original's Cop cost 1 Toxin and its Boxer 15 Toxin). Customers you meet in the tutorial are **free**. Every customer type has its own zombie form. Rare and parody zombies also come from raids, events and the Grill Pass.

**Crew cap:** shown on the HUD as `4/4`, like the original. The cap grows with level (to about 13 at level 47, matching the original's max-level shot of `12/13`), and with crew-slot purchases, up to 20+.

**Zombie stats (the original's six, kept as-is):**
| Stat | Effect |
|---|---|
| **Energy** | The red bar. It drains while cooking or serving, and refills while resting. |
| **Speed** | Walk, serve and cook speed. |
| **Power** | Fighting strength in raids. |
| **Tips** | Tip income vs. meal income. Tips 10 ≈ $1 in tips per $5 of food. |
| **Focus** | How rarely they **daydream**. Low Focus = stops working to stare into space more often. |
| **Patience** | How low their Energy can go before they **attack a customer**. Patience 1 snaps at about 20% Energy; Patience 10 holds out until about 2%. |
| *Trait (new)* | One fun perk, e.g. *Butterfingers* (drops plates), *Neat Freak* (cleans spills), *Showman* (Vibe +). |

**Jobs:** any zombie can do any job, as in the original. Tap a zombie, then tap a stove to make them **cook**. Unassigned zombies automatically **serve** whenever a customer is waiting. In raids they fight. New for Zombs BBQ: an optional **Bouncer** post at the door that catches spies and defends in PvP.

**Daydreaming:** low-Focus zombies randomly stop and daydream (a thought bubble with a brain or a steak). Tap them to snap them back to work. If one gets too bored, it may wander toward a customer.

**Energy & attacks (the original's signature gag):**
- Working drains Energy. When it drops below the zombie's **Patience** threshold, the zombie **attacks a customer**: a cartoon lunge, the customer screams and flees with a blue frowny face, and your star rating drops.
- **Resting:** tap a tired zombie and choose **Rest**. They flop down **face-first on a table or sprawl on the lawn outside with "Zzz"** (exactly like the original's screenshots) and recover over time.
- **Brain Sauce Keg** (the original's Toxin Barrel): decor that **doubles Energy recovery** for resting zombies.
- **Brain Sauce:** instantly refills a zombie's Energy (the original's Toxin refill).
- *New:* **Brain Snacks**, cheap items you cook on the grill to feed a zombie a partial refill, which gives free players another option.

**Mutations (new, late game, Lv 25+):** combine 2 duplicate zombies plus Brain Sauce to mutate: a new color variant, +1 rarity and a stat boost. Mutations are earned only, never sold.

### 3.4 Star Rating & Vibe

Star Rating (0.5–5★) is recalculated every 10 minutes:
- **Decor Score** (sum of item points, with diminishing returns per item type): 40%
- **Menu Variety** (distinct dishes on the counter): 20%
- **Service** (average wait time, requests filled): 25%
- **Incidents** (zombie lunges, spills): −15% max

**Faces (from the original):** every customer shows a **happy yellow face** (raises rating) or a **frowning blue face** (lowers it) when they leave. Frowns come from long waits, no free seat, no food on the counter, or a zombie attack. A customer who arrives when every seat is taken **leaves unhappy**, so you need enough seats *and* enough dishes on the counter.

Higher stars bring more customers, better customer types and bigger tips. The awning at the top of the HUD shows the stars (like the original).

### 3.5 Decorating

- **Isometric 2:1 grid.** Items have footprints (1×1, 1×2, 2×2…), and can be rotated (4 directions where art allows), moved, stored and sold back (50%).
- **Categories:** Tables, Seating, Stations, Counters, Walls, Floors, Wall hangings, Lighting, Plants, Novelties (jukebox, pool table, dartboard, mechanical bull), Outdoor (fences, grills, neon signs), Brain Sauce Keg (faster rest).
- **Wall decor counts:** as in the original, wall hangings (bottles, signs, skulls) raise popularity **without using floor space** that tables need. Veteran players will look for this.
- **Themes** (sets with a set bonus for 5+ pieces): *Burnt Shack* (start), *Texas Roadhouse*, *50s Diner*, *Tiki Luau*, *Graveyard Garden*, *Neon Night*, *Mad Scientist Lab*, *Haunted Victorian*. Late-game shots of the original (Western saloon, cherry-blossom café) show how much players love this.
- **Expansions:** 8×8 at start → 30×30 max, bought with cash and gated by level. Outdoor patio and a parking lot food-truck spot.
- **Edit mode:** pinch-zoom, drag to move, a "ghost" placement preview with green/red footprint, undo/redo, and a "Store all" button.
- **Photo Mode:** hides the HUD and adds filters and frames, so players can share their joint.

### 3.6 Raids

**Classic raid flow (faithful to the original):**
1. **Pick a target:** tap a rival joint on the map (an NPC pun joint, a neighbor or a friend).
2. **Choose your team:** zombies **and pets**. The deploy tray shows counts like `14/14` zombies and `1/6` pets, like the original's raid screen.
3. **Line up:** your horde stands in single file on the sidewalk outside the rival's fence, each with a health bar and a red **"!"**. Send zombies one at a time, or hit **Send All Zombies**.
4. **Command:** during the raid, **tap where you want them to attack**: a defender, the fence, or **the serving counter to steal a dish**.
5. **The staff swarm:** the moment violence starts, every rival staff member rushes your zombies.
6. **The Head Chef (raid boss):** comes out once most of the joint is cleared. **Defeat the Head Chef to win the raid.** Killing them fast, with several zombies at once, raises the chance of a rare **Brain Sauce** drop (the original's rare Toxin vial drop).
7. **Retreat:** tap the **white truce flag** (top-left) to pull out at any time and keep what you've stolen so far.

**Raid items (the original's tombstones, renamed):**
| Item | Effect | Limit |
|---|---|---|
| **Green Grave Marker** | Boosts every raider's health before the attack | 5 uses/day, recharges at midnight |
| **Red Grave Marker** | Temporarily raises attack power (zombies flash red) | 5 uses/day, recharges at midnight |
| **Healing Headstone** | Restores Energy to every zombie and pet in the raid over a few seconds, without interrupting fighting | Consumable |
| **Summon Stone: Big Foot-Long** | Summons a giant hot-dog Sasquatch zombie ally (the original's Zombie Yeti) | Up to 3 active, bought with Brain Sauce |

**Raid pets:** zombie dogs (Rot-weiler), werewolves (Werewoof), and a set of 5 **Grill-Bots** that **combine into one giant robot, "Mega Grillatron"**, when all 5 are on the team. That last one is a nod to the original's Amtron robot pets.

**Loot:**
- Guaranteed: **cash** and **dishes** (looted dishes go to your Fridge, where you serve them or unlock the recipe).
- Rare: **Brain Sauce**, **rare Raid-Cookbook recipes**, decor blueprints, and "captured customers" (rare types you can infect).

**Modern upgrades on top:**
- **Raid Map (PvE campaign):** a road trip across a ruined America, with 9 chapters at launch and a boss joint per chapter: *Chuck Wagon's Chow Hall*, *Big Hank's Burger Barn*, *Vegan Vera's Salad Fortress*, *Sushi Samurai*, *Colonel Crunch's Chicken Shack*, *Le Snob Bistro*, *Taco Titan*, *Crust Me Pizzeria*, *The Golden Spork* (final). Each awards 1–3 stars and a **signature recipe**.
- **Neighbors (PvP):** other players' joints, defended by their saved layout, their staff, and Bouncer zombies. Matchmaking uses Raid Power. A defender gets a 6 h shield after a hit, plus a revenge button.
- **Friends:** a "Friendly Food Fight" with no losses.
- **Scout** before committing to see the defenders and Head Chef level.
- **Defenses** you place in your own yard (they double as decor): *Picket Fence* → *Spiked Barricade* (the wooden spike fence in the original raid screen), *Bug Zapper Tower*, *Sprinkler of Holy Water*, *Grease Trap*, *Guard Dog*.
- **Eating pays:** raiders **eat rival customers and staff for cash**, which you **keep even if the raid fails** (as in the original).
- **Down, not dead forever:** a raider at 0 Energy (Energy is raid health) shows dizzy stars, sinks into the ground, and **reanimates for 1 hour** (the original's later timing), or Brain Sauce skips it. Never permanently lost.
- Full raid rules table: [06 §5](06-menus-unlocks-customers.md#5-raid-rules-faithful-version).

### 3.7 Pets

Unlock at Lv 10. One active pet roams the joint: *Zombie Pug* (finds coins), *Two-Headed Cat* (catches spies), *Undead Chicken* (lays a free Brain Snack daily), *Rot-weiler* and *Werewoof* (fast raid runners), *Mini T-Rex skeleton* (event). Pets are cosmetic plus small perks.

### 3.8 Meta & retention

- **Daily Specials:** 3 daily quests ("Serve 200 servings", "Infect a Grandma", "Win 2 raids").
- **Weekly Health Inspection:** an inspector visits. Score your joint against a theme ("Spooky!") for a big reward.
- **Rush Hour:** twice a day (player-chosen times), a 10-minute burst with double customers and combo multipliers. An active, exciting session.
- **Login calendar:** 7-day and 28-day, with cosmetics on day 7/28.
- **Achievements:** Game Center + in-game "Trophy Wall" decor that unlocks with achievements.
- **Seasonal events (every ~4 weeks):** *Halloween Graveyard Grill*, *4th of July Cook-Off*, *Holiday Ham-pocalypse*, *Spring Rot Festival*. Each has an event currency, an exclusive zombie, a decor set, an event dish and a bonus raid map.

### 3.9 Social

- **Visit** friends' joints (friend codes, Game Center, contacts): leave a **tip** (free daily, small bonus both ways) and "eat" one of their dishes for a buff.
- **Crews (guilds, Lv 16+):** up to 30 players, crew chat with preset emotes plus text with a profanity filter, weekly **Cook-Off** (a combined servings goal → crew chest), and **Crew Raids** on boss joints with shared HP.
- **Leaderboards:** Star Rating, Raid Trophies, Event points (weekly, by league).
- **Share:** Photo Mode → iOS share sheet.

---

## 4. Economy

### 4.1 Currencies
| Currency | Icon | Earned | Spent on | Sold? |
|---|---|---|---|---|
| **Cash** ($) | gold coin | Serving dishes, raids, quests | Cooking, recipes, decor, infect, expansions | Small packs only |
| **Brain Sauce** | glowing green jar | 5 to start (like the original's 5 vials), rare Head Chef drops in raids, a **10-day cooking streak** reward (the original's "Frequent Fryer"), friend gifts, daily quests, level-ups, achievements, Undead Chicken, rewarded ads | Instant Energy refills, special infections (e.g. Boxer), Finish-now on stoves, raid summons, mutations, premium decor | Yes, but always earnable |
| **XP** | — | Cooking, serving, raids | Level-ups (unlocks) | No |
| **Event tokens** | per event | Event dishes/raids | Event shop | No |

### 4.2 Pacing targets (first week)
| Time played | Player level | Stars | Crew | Feels like |
|---|---|---|---|---|
| 5 min | 2 | 0.5★ | 2/4 | Tutorial complete, first zombie |
| 30 min | 5 | 1★ | 4/4 | First raid won, Smoker unlocked |
| Day 1 end | 8 | 1.5★ | 5/5 | First expansion, Fryer |
| Day 3 | 12 | 2.5★ | 5/5 | Sauces, Chapter 2 boss |
| Day 7 | 16 | 3★ | 6/6 | Crews, Brain Sauce Keg, first event |
| Day 30 | 26 | 4★ | 8/8 | Mutations, 3rd theme |
| Day 90 | 40+ | 4.5–5★ | 11–13 | Endgame decorating, crew raids |

Level cap at launch: **50** (raised by updates). XP curve: `xp_to_next(L) = round(50 * L^1.65)`.

### 4.3 Monetization (fair by design)
- **Grill Pass** (season pass, ~$4.99/season): cosmetic zombies, decor, Brain Sauce, pet skins. A free track exists for everyone.
- **Decor & zombie bundles:** direct purchase. You see exactly what you get. **No paid random loot boxes.**
- **Starter Pack** ($1.99, one-time): crew slot +1, a rare zombie, Brain Sauce.
- **Remove Ads** ($2.99): permanently removes optional ad prompts and grants a daily Brain Sauce stipend.
- **Rewarded ads** (opt-in only): double offline earnings, +1 raid ability. Never forced interstitials.
- **Caps:** no "energy" that blocks play. Timer skips cost scale linearly and are never required for events.

---

## 5. First-time user experience (first 10 minutes)

The tutorial follows the original's order (cook → counter → serve → infect your first cook), narrated by **Gus, the Zombie Union Rep**. He's a grumpy zombie chef in a stained apron, and he's this game's version of the original's union-rep narrator, who invented Toxin. Ours invented Brain Sauce.

1. **Cold open (20 s):** a rainy night. You, a down-on-your-luck cook with a suspicious bandage on your arm, find an abandoned roadside BBQ shack. The radio says "…outbreak…". Gus shambles in waving a union card: "You look human. You ain't. Let's get cookin', Boss."
2. **Select your chef, then the stove:** tap **YOU**, then the Rusty Grill. You cook a Charred Hot Dog (10 s timer in the tutorial).
3. **Tap the food** to move it to the serving counter, then tap the counter to serve. The first customer walks in.
4. The customer eats and shows a happy yellow face; coins and XP pop.
5. **Infect your first cook:** Gus says "Now give 'em a little nibble." Tap the customer, then **Infect**. It's free in the tutorial. The infection dance plays, and they become **your first cook**. Tap them, then the grill, and they start cooking.
6. **Infect a second customer**, who becomes a waiter. The crew reaches `2/4`.
7. **Energy lesson:** your cook's Energy drops into the red, they **attack a customer**, the customer flees with a blue frowny face, and a star wobbles. Gus: "Union mandates naps." Tap → **Rest**, and the cook flops face-down on a table with "Zzz".
8. **Brain Sauce lesson:** you have 5 starting jars (the original gave 5 Toxin vials). Use one to refill a zombie instantly.
9. **First raid:** a tiny scripted raid on *Chuck Wagon's Chow Hall*. Send your zombies, tap the counter to steal a dish, beat the Head Chef. The stolen dish goes to your Fridge, and you study it to unlock the **Brain Burger** recipe.
10. **Name your joint.** Reward: the Barrel Smoker. The tutorial ends with a long cook running, so the player **wants to come back**.

---

## 6. Content list for launch (v1.0)

| Content | Count |
|---|---|
| Customer types (each with zombie form) | 20 |
| Special/event/raid-only zombies | 8 |
| Recipes | 40 (24 level, 10 raid, 6 event) |
| Stations | 6 |
| Decor items | ~220 across 6 themes |
| Defenses | 7 |
| Raid Map chapters | 9 (45 stages + 9 bosses) |
| Pets | 6 |
| Launch event | Halloween Graveyard Grill |
| Languages | English at launch; Spanish, Portuguese, French, German post-launch |

---

## 7. Audio direction

- **Music:** swampy blues-rock and surf guitar with theremin wobbles (think *Scooby-Doo meets a Texas roadhouse*). Separate loops for the joint, edit mode, raids (faster, drums) and events.
- **SFX:** sizzles, meaty plops, cash-register "ka-ching" on combos, cartoon zombie groans (varied pitch per zombie), a squishy "pop" on placing decor, and electrocution "bzzt" on the bug zapper.
- **Haptics (iPhone Taptic Engine):** light tick on taps, success thump on Perfect Bark, heavy buzz when a zombie lunges.

---

## 8. Accessibility & quality of life

- Toggle timing minigames to auto, colorblind-safe status icons (shape plus color), adjustable text size, reduced-motion mode (less screen shake), one-hand-reachable primary buttons, full VoiceOver labels on menus.
- **Offline-first:** the joint simulates offline progress (capped at 8 h, upgradable to 12 h). Raids against NPC joints work offline; PvP needs a connection.
- iCloud plus account-linked cloud save (Sign in with Apple).
