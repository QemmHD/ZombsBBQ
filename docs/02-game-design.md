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
| **Tired zombies attack the customers.** | **HANGRY** zombies lunge at a guest: a cartoon chase around the tables, the customer screams and flees, the stars wobble. Nurses and cops react (the cop "arrests" the zombie and it sulks for 10 s). | Hunger system §3.3 |
| **Any customer can be infected, and keeps their outfit as a zombie.** | Same, with an **infection dance** cutscene. Every zombie keeps their human outfit, torn and green, plus one gag detail: the food critic's notepad reads "BRAINS 5/5", the lumberjack's axe is stuck in his own hat, the cheerleader's pom-pom is a brain. | §3.3, art bible |
| **"YOU": the lone human chef in the room**, with your own health bar. | You're the only living employee, with a customizable avatar (hard hat, apron, hats). Zombies *never* bite you because they respect the boss, but a hungry one will sniff you and get shooed away. Tap yourself for Photo/Info/Chef. | Joint, avatar |
| **Zombies crash face-down on tables, or sprawl on the lawn to rest.** | Exhausted zombies face-plant into tables or the lawn with "Zzz" bubbles. Unhired zombie applicants crawl on the grass outside groaning "joooob". | Hunger/rest, curb |
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
Tap smoker → pick dish → (optional) timing tap for "Perfect Bark" bonus
   → dish cooks (timer) → tap to plate onto counter
   → zombie waiters auto-serve customers → coins/XP pop above tables
   → watch zombie Hunger → feed / send to nap coffin before they bite someone
   → handle special requests (a customer bubble: "Extra sauce!") for tips
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
| Neon Taco Truck | Lv 30 (event) | Event dishes | Parks outside the joint |

**Dishes** have: cost, cook time, servings, sell price per serving, XP, and the station they need. Recipes are unlocked by **level** (bought with cash), **raids** (stolen), or **events**.

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

**Spoilage (gentle):** finished dishes left on a station longer than their cook time turn "Crispy" and lose 25% of servings, never 100%. Each station has one free Keep-Warm slot. This keeps the "come back on time" tension without cruelty.

### 3.2 Customers

Customers arrive based on **Star Rating**, **Seats** and **Curb Appeal** (outside decor). Each has a type, patience, spend multiplier and tip chance.

| Type | Unlock | Spend | Quirk |
|---|---|---|---|
| Lumberjack | ★1 | ×1.0 | Eats 2 servings |
| Construction Worker | ★1 | ×1.0 | Comes in groups at "lunch rush" |
| Nurse | ★1.5 | ×1.1 | Calms nearby customers (patience+) |
| Cop | ★2 | ×1.2 | Arrests a misbehaving zombie (stuns it 10 s) |
| Grandma | ★2.5 | ×1.3 | Huge tips, very slow eater |
| Cheerleader | ★3 | ×1.3 | Boosts the joint's Vibe while seated |
| Food Critic | ★3.5 | ×2.0 | Rates your joint: great review = a rush of customers for 1 h |
| Influencer | ★4 | ×1.5 | Films your joint; your decor score matters ×2 |
| Rival Chef (spy) | ★4.5 | ×1.0 | Tries to steal a recipe. Your bouncer catches them for a reward |
| Celebrity (event) | ★5 | ×5.0 | Rare, limited-time zombie form |

**Requests:** about 1 in 6 customers shows a bubble ("Extra sauce!", "Something spicy!", "Hurry!"). Fill it within its timer for tips, Vibe and quest progress.

### 3.3 Zombie crew (the heart of the game)

**Getting zombies:** tap a seated, happy customer, then **Infect** (costs cash scaled by rarity; Grandma ≈ $1k, Critic ≈ $25k). A short transformation animation plays: the customer convulses, turns green, eyes pop yellow, and they do a little dance. Every customer type has a unique zombie form. Rare zombies also come from raids, events and the Grill Pass.

**Crew slots:** start at 4 (like the original's "4/4"), grow with level and the "Coffin Rack" decor up to 20+.

**Zombie stats**
| Stat | Effect |
|---|---|
| **Speed** | Walk/serve speed |
| **Hunger tank** | How long before they get "snacky" |
| **Charm** | Tip bonus when they serve |
| **Brawn** | Raid HP & damage |
| **Trait** | One special perk, e.g. *Butterfingers* (drops plates, funny but bad), *Neat Freak* (cleans spills), *Showman* (Vibe +) |

**Roles** (assign by dragging a zombie onto a station or the door):
- **Server:** carries dishes to tables (core role).
- **Pitmaster:** stands at a station, cooking time −10–30%.
- **Bouncer:** guards the door: catches spies, defends during enemy raids.
- **Raider:** sent out on raids (reserved while out).

**Hunger (modernized Energy)**
- Working drains Hunger. At 25% the zombie gets a ⚠ drool icon and slows down.
- At 0% the zombie **lunges at a customer** (comedy chase animation; customer flees, Star Rating dips a little, customer loses patience). It never kills progress or loses items.
- **Ways to refill:**
  1. **Nap Coffin** decor: zombies auto-rest there (free, takes time). This is the main free method.
  2. **Brain Snack** items: cooked at the grill like a dish (cheap). This turns feeding into part of the cooking loop.
  3. **Auto-Feeder** upgrade (Lv 15): feeds idle zombies from your Brain Snack stock.
  4. **Brain Sauce** (soft currency): instant full refill, a convenience only.

That makes the original's best joke (zombies eat customers) a fun thing to manage instead of a paywall.

**Mutations (late game, Lv 25+):** combine 2 duplicate zombies plus Brain Sauce to mutate: a new color variant, +1 star rarity and a stat boost. Mutations are purely earned and never sold directly.

### 3.4 Star Rating & Vibe

Star Rating (0.5–5★) is recalculated every 10 minutes:
- **Decor Score** (sum of item points, with diminishing returns per item type): 40%
- **Menu Variety** (distinct dishes on the counter): 20%
- **Service** (average wait time, requests filled): 25%
- **Incidents** (zombie lunges, spills): −15% max

Higher stars bring more customers, better customer types and bigger tips. The awning at the top of the HUD shows the stars (like the original).

### 3.5 Decorating

- **Isometric 2:1 grid.** Items have footprints (1×1, 1×2, 2×2…), and can be rotated (4 directions where art allows), moved, stored and sold back (50%).
- **Categories:** Tables, Seating, Stations, Counters, Walls, Floors, Wall hangings, Lighting, Plants, Novelties (jukebox, pool table, dartboard, mechanical bull), Outdoor (fences, grills, neon signs), Coffins (crew rest).
- **Themes** (sets with a set bonus for 5+ pieces): *Burnt Shack* (start), *Texas Roadhouse*, *50s Diner*, *Tiki Luau*, *Graveyard Garden*, *Neon Night*, *Mad Scientist Lab*, *Haunted Victorian*. Late-game shots of the original (Western saloon, cherry-blossom café) show how much players love this.
- **Expansions:** 8×8 at start → 30×30 max, bought with cash and gated by level. Outdoor patio and a parking lot food-truck spot.
- **Edit mode:** pinch-zoom, drag to move, a "ghost" placement preview with green/red footprint, undo/redo, and a "Store all" button.
- **Photo Mode:** hides the HUD and adds filters and frames, so players can share their joint.

### 3.6 Raids (modernized)

Raids are **asynchronous PvP plus PvE**. They're short (≤ 2 min), skillful and funny.

**Targets**
- **Raid Map (PvE campaign):** a road-trip map of rival joints across a ruined America, with 9 chapters at launch and a boss joint per chapter: *Chuck Wagon's Chow Hall*, *Big Hank's Burger Barn*, *Vegan Vera's Salad Fortress*, *Sushi Samurai*, *Colonel Crunch's Chicken Shack*, *Le Snob Bistro*, *Taco Titan*, *Crust Me Pizzeria*, *The Golden Spork* (final). Each awards stars (1–3) and a **signature recipe**.
- **Neighbors (PvP):** other players' joints, defended by their saved layout and assigned Bouncers. You get matched by Raid Power. The defender gets a 6 h shield after being hit and a revenge button.
- **Friends:** a "Friendly Food Fight" with no losses, for fun and quests.

**How a raid plays**
1. **Pick squad:** up to 8 zombies (crew-slot limited); a power estimate vs the target.
2. **Scout:** see the defenses (fence, turrets, guards) before you commit.
3. **Deploy:** drag zombies onto one of 2–3 **lanes** (sidewalk, back alley, parking lot) and choose the timing. Zombies shamble toward the joint and fight automatically.
4. **Abilities (tap):** *BBQ Sauce Bomb* (AoE slow), *Brain Bait* (pulls defenders), *Horde Howl* (speed buff). They run on cooldowns, and you equip 2.
5. **Win condition:** break into the kitchen within the timer. Loot scales with damage %.

**Defenses** (placed in your own joint's yard; they also decorate it):
- *Picket Fence* → *Spiked Barricade* (HP walls)
- *Bug Zapper Tower* (single target), *Sprinkler of Holy Water* (area), *Grease Trap* (slow), *Guard Dog* (fast melee), *Human Chef with Spatula* (NPC defender), *Bouncer zombies* (yours).

**Loot:** cash, Brain Sauce, **recipe fragments** (5 = full recipe), decor blueprints, and "captured customers" (rare types you can infect).

**Raid damage to zombies:** injured raiders return "Patched Up" (bandaged look, 1 h rest or Brain Sauce). They are never permanently lost.

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
- **Crews (guilds, Lv 15+):** up to 30 players, crew chat with preset emotes plus text with a profanity filter, weekly **Cook-Off** (a combined servings goal → crew chest), and **Crew Raids** on boss joints with shared HP.
- **Leaderboards:** Star Rating, Raid Trophies, Event points (weekly, by league).
- **Share:** Photo Mode → iOS share sheet.

---

## 4. Economy

### 4.1 Currencies
| Currency | Icon | Earned | Spent on | Sold? |
|---|---|---|---|---|
| **Cash** ($) | gold coin | Serving dishes, raids, quests | Cooking, recipes, decor, infect, expansions | Small packs only |
| **Brain Sauce** | glowing green jar | Raids, daily quests, level-ups, achievements, Undead Chicken, rewarded ads | Instant Hunger refills, timer skips, mutations, premium decor | Yes, but always earnable |
| **XP** | — | Cooking, serving, raids | Level-ups (unlocks) | No |
| **Event tokens** | per event | Event dishes/raids | Event shop | No |

### 4.2 Pacing targets (first week)
| Time played | Player level | Stars | Crew | Feels like |
|---|---|---|---|---|
| 5 min | 2 | 0.5★ | 1 | Tutorial complete, first zombie |
| 30 min | 5 | 1★ | 4/4 | First raid won, Smoker unlocked |
| Day 1 end | 8 | 1.5★ | 5 | First expansion, Fryer |
| Day 3 | 12 | 2.5★ | 7 | Sauces, Chapter 2 boss |
| Day 7 | 16 | 3★ | 9 | Crews, Auto-Feeder, first event |
| Day 30 | 26 | 4★ | 14 | Mutations, 3rd theme |
| Day 90 | 40+ | 4.5–5★ | 18+ | Endgame decorating, crew raids |

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

1. **Cold open (cutscene, 20 s):** a rainy night. You, a laid-off line cook, find an abandoned roadside BBQ shack. The radio says "…outbreak…". Your first customer stumbles in. It's a zombie, and it just wants ribs.
2. **Tap the grill** → cook a Charred Hot Dog (10 s timer in the tutorial).
3. Meet **Gus**, a zombie pitmaster who "applies for the job" by groaning. He's your first crew member.
4. Serve 3 customers → coins burst → buy your first table.
5. A customer gets bored → **infect** them (guided) → Nurse Nell joins.
6. Gus gets hungry → he lunges at a customer (the joke!) → you learn to feed him a Brain Snack.
7. A rival biker gang raids *you*: a tiny scripted defense, introduces raids.
8. **Revenge raid** on their lean-to: you win, steal the *Brain Burger* recipe.
9. Name your joint → reward: Barrel Smoker → the tutorial ends with a long cook running so the player **wants to come back**.

---

## 6. Content list for launch (v1.0)

| Content | Count |
|---|---|
| Customer types (each with zombie form) | 16 |
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
