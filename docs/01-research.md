# 01 — Research: How Zombie Café Actually Played

Zombie Café was a free-to-play iOS restaurant sim from Beeline Interactive (a Capcom subsidiary). It launched on iOS in January 2011, later came to Android, and has since been pulled from both stores. Zombs BBQ is a spiritual successor. We keep the gameplay and humor, and build a fully original game with its own name, characters, art and code. No Capcom assets, names or likenesses are used.

> The original servers and wikis are offline or unreachable from here, so this is reconstructed from the fan wikis (Fandom and Wikidot), GameFAQs, TouchArcade and guide sites listed under Sources, plus the reference screenshots supplied. Where fan sources disagree, it's noted.

---

## 1. The premise: you look human, but you're the one infecting

- You play the café owner and chef, shown in the café as **"YOU"**, a human-looking character with a red Energy bar under the name. Tapping yourself gives **Photo / Info / Chef**.
- You **cook the first dish yourself** (the tutorial has you select your chef, then the stove).
- When your first customer has eaten, the tutorial has you **tap the customer and press Infect**. They turn into a zombie, and **that zombie becomes your first cook**. From then on you keep infecting customers to build an all-zombie staff.
- The tutorial is narrated by the **Zombie Union Rep**, a zombie chef (on the title screen) who, according to fan lore, invented Toxin.

## 2. Step by step: how a session plays

1. **Open the café.** Customers walk in from the sidewalk and sit at tables. The HUD awning at the top shows café name, star rating, level, XP bar, cash and Toxin.
2. **Cook.** Tap a cook (YOU or a zombie), then tap a stove, then pick a dish and pay its cost. The cook walks over and cooks. Dishes have real-time timers (minutes to many hours) and keep cooking while the app is closed.
3. **Don't let it burn.** A finished dish left on the stove **burns once it sits for as long as its cook time again**. A burned dish is lost along with all the money you spent on it.
4. **Plate it.** Tap the finished dish to move it to the **serving counter**, where it shows a serving count (e.g. "37", "1089").
5. **Serve.** Idle zombies **automatically serve** waiting customers. Customers pay for the meal plus **tips** (based on the server's Tips stat).
6. **Faces and rating.** Leaving customers show a **happy yellow face** (rating up) or a **frowning blue face** (rating down). A customer who arrives when every seat is full **leaves unhappy**. You need enough seats *and* enough food.
7. **Watch Energy.** Cooking and serving drain each zombie's Energy. When Energy falls below the zombie's **Patience** level, it **attacks a customer**, which lowers your rating. Tired zombies must **rest** (they lie down; the screenshots show them face-down on tables and sprawled on the lawn) or be refilled instantly with **Toxin**.
8. **Snap out daydreamers.** Low-Focus zombies periodically **daydream** and stop working. Tap them to send them back to work.
9. **Infect.** Tap any customer → Infect. Common types cost cash; special types cost Toxin. Every customer has a unique zombie form that keeps their outfit.
10. **Decorate.** Buy and place tables, chairs, stoves, counters, walls, floors, wall hangings and novelties on the isometric grid. Decor raises popularity.
11. **Raid.** Tap a rival café on the map and send zombies (and pets) to attack it and steal food. Loot goes to the **fridge**.
12. **Close up.** A **CLOSED** sign shows; the zombies line up on the sidewalk and sleep with "ZZZ" bubbles (reference screenshot 5).

## 3. Systems in detail

### 3.1 Zombie stats
| Stat | Meaning in the original |
|---|---|
| **Energy** | Drains while cooking or serving and recovers while resting. Generic zombies had about 100; tough ones such as the "Champ" had about 250. |
| **Speed** | Movement, serving and cooking speed. |
| **Power** | Fighting strength in raids. Players rated attackers by Speed × Power. |
| **Tips** | Tip income relative to meal income. Tips 10 ≈ $1 in tips for every $5 in meals. |
| **Focus** | How often they daydream. Focus 1 ≈ a daydream about every 100 s. |
| **Patience** | The Energy level at which they attack a customer. Patience 1 attacks at about 20%; Patience 10 waits until about 2%. |

### 3.2 Hiring and infection costs (examples)
| Zombie | Cost | Players' verdict |
|---|---|---|
| Tutorial customers | Free | |
| Construction Worker | $250 cash | Powerful for the price |
| Cop | 1 Toxin | "Weak, don't waste your toxin" |
| Boxer | 15 Toxin | The best fighter; guides said save up for it |
| Movie Star | — | A strong pure server |
| "Stoogey" | — | High tips but daydreams constantly |

The crew cap shows on the HUD as `4/4` early on, and `12/13` at the max level of 47 in the reference shot.

### 3.3 Toxin (the premium green currency)
- **Uses:** instant Energy refills, finishing a dish instantly, infecting special zombies, special store items (tombstones, the Toxin Barrel).
- **Sources:** 5 vials at the start; a **rare drop from killing a rival's Head Chef** in raids (better odds for fast kills with several zombies attacking at once, and worse against lower-level cafés); the **daily cooking streak** ("Online Frequent Fryer": cook online 10 days in a row, then 4 or 5 vials depending on the source, repeating while the streak lasts); purchase; friends.
- **Community wisdom:** save Toxin for **buying staff**, never for refills or rushing food. This tells us the refill-for-Toxin model frustrated players.
- **Toxin Barrel** (store item): **doubles Energy recharge** for resting zombies (one tester measured about 1 Energy per 10 s instead of per 20 s). Cooks still drain at the same rate.

### 3.4 Cooking and recipes
- Stoves are required, and each cook needs a stove. **Two zombies can share one floor tile when cooking at two ovens**, a well-known layout trick.
- Recipes come in **themed cookbooks**. By v1.13 there were **320 recipes in 21 cookbooks**, with **100+ obtainable only from raids (34 rare)**. Examples: Mafia (unlocked by buying the Standard Pizza Oven at Lv 15), Politician, Greek, Super Mutant, Alice, Graveyard, Vampire (Staked Steak, Nosfera-Stew, Bat BQ), Tiki, and the Raid Cookbook.
- **Dish example:** *Head Cheesesteak*: Lv 17, 30 min, costs 385, 140 servings, earns 420 (profit 35), 12 XP. Many dishes had thin margins and were really XP engines.
- **Dish names are gross puns:** Bangers & Mush, Lady Fingers, Foie Gross, Cockroach Calzone, Tiramiseeeww, Flied Lice, Wonton Goop, Curry Slurry, Bul-goo-gi, Misfortune Cookies.
- **Leveling advice from the community:** raiding is the fastest XP, then cooking, then selling. Cook with as many zombies as possible.

### 3.5 Decorating and popularity
- 100+ store items: tables, chairs, stoves, counters, floors, walls, wall hangings, novelties (jukebox, pool table, dartboard, cacti, guitars, cherry trees… see the reference shots).
- **Wall items raise popularity without taking floor space**, so veterans covered their walls (e.g. bottles) and used the floor for tables.
- Common opening tip: move the starting table first to make room for more tables.
- Late-game cafés became huge themed builds (Western saloon at Lv 47, the cherry-blossom "Kraken's Café").

### 3.6 Raids
- Tap a rival café to send **zombies and/or pets**. On the raid screen they **line up in single file on the sidewalk** with health bars and a red **"!"**, with a **Send all zombies** button (reference screenshot 2: "Jane Wayne's Mess Hall").
- During the raid, you **command your zombies where to attack**, including **stealing a dish from the counter**.
- The rival's **staff swarm** at the first sign of violence. Waiters are weak; the **Head Chef** is the **raid boss**, comes out once most of the café is cleared, and **must be defeated to take the café**. Guides advised clearing the dining room first and keeping out of the kitchen until the end.
- **Boss rewards:** food and money guaranteed, Toxin extremely rare. **Looted dishes go to your fridge**, where you serve them or use them to **unlock the recipe**.
- **Retreat** with the white truce flag in the top-left corner.
- **Raid items (tombstones, from v1.1.0):** a **green** one boosts zombie health before an attack; a **red** one raises attack temporarily (zombies flash while it lasts). Each can be used 5×/day and recharges at midnight. A **Health Stone** restores +100 Energy to every zombie and pet in the raid over a few seconds, mid-fight. The **Zombie Yeti** could be summoned from a tombstone bought for 75 Toxin, with up to 3 active. The reference raid screen shows counters such as `12/12` tombstones, `10/12` crystals and a `3/3` golem.
- **Pets in raids:** zombie dogs and werewolves (the `1/6` pet counter), and **5 robot pets that combine into "Amtron"**, which was strong in enemy cafés.

### 3.7 Updates and collectables
Themed packs: Victorian Britain, a 50s update (3 new zombies), B-movie monster zombies (v1.2.6), plus costume zombies seen in the raid shot (king, conquistador, caped superhero types, robot suit, cat-ears) and a Mega Man crossover (Capcom). New cookbooks shipped with themes.

### 3.8 Reception
An average of about **4★ on the store (as of v1.13)**. Players loved the humor, collecting and decorating. Complaints were mostly about **glitches/bugs** and the **Energy/Toxin squeeze**.

---

## 4. What players loved (keep all of it)
1. **The premise:** you're the secret infector, your staff are your victims, and they still serve food.
2. **The jokes:** tired zombies **eat the customers**, daydreaming zombies, face-down naps, pun recipes and pun rival names.
3. **The look:** chunky isometric rooms, thick outlines, big-headed chibi characters, the maroon awning HUD.
4. **Collecting:** every customer has a zombie form; costume and monster zombies; pets.
5. **Decorating:** huge themed builds.
6. **Raiding for recipes:** your collection becomes an army, and your cookbook grows from what you steal.
7. **Check-in rhythm:** timers, burning risk, coming back to a full till.

## 5. What hurt it (fix this)
| Pain point | Fix in Zombs BBQ |
|---|---|
| Energy/Toxin squeeze: players hoarded Toxin and their staff kept breaking down. | Keep Energy, Patience and attacks exactly (they're the joke). Add free recovery paths: the Brain Sauce Keg (the Toxin Barrel), Brain Snacks you cook yourself, a cooking streak reward, and generous Brain Sauce from play. |
| Burned dishes lost all their money with no warning. | Keep burning, but add push notifications, forgiven burns in week 1, and a Keep-Warm Lamp upgrade. |
| Raids were mostly "send and watch". | Keep the line-up, tap-to-command and Head Chef boss, and add scouting, grave-marker timing and PvE boss chapters. |
| Bugs and glitches; it eventually died with its servers. | Modern engine, crash reporting, cloud saves, **offline-first** design so the game keeps working. |
| Facebook/Game Center social that has aged out. | Friend codes, Crews, visiting and tipping, shareable Photo Mode. |

## 6. Market check (2026)
The cozy restaurant-sim genre is still healthy on iOS. The **zombie + food + decorating + raiding** mix has had no real successor since Zombie Café was delisted. Players are still nostalgic for it: fan revival sites exist (one appears in the "Kraken's Café" reference shot) and browser re-hosts still appear on game portals.

## Sources
- [Zombie Cafe, Wikipedia](https://en.wikipedia.org/wiki/Zombie_Cafe)
- [Zombie Cafe, Capcom wiki (Fandom)](https://capcom.fandom.com/wiki/Zombie_Cafe)
- [Zombie Cafe Wiki (Fandom)](https://zombiecafe.fandom.com/wiki/ZCWiki): [Raid](https://zombiecafe.fandom.com/wiki/Raid), [Recipe](https://zombiecafe.fandom.com/wiki/Recipe), [Energy level](https://zombiecafe.fandom.com/wiki/Energy_level), [Zombie union rep](https://zombiecafe.fandom.com/wiki/Zombie_union_rep), [Store](https://zombiecafe.fandom.com/wiki/Store)
- Zombie Cafe Wiki (Wikidot): [Zombies List](http://zombiecafe.wikidot.com/zombies-list), [Attacking](http://zombiecafe.wikidot.com/attacking), [Cooking](http://zombiecafe.wikidot.com/cooking), [Acquiring Vials](http://zombiecafe.wikidot.com/acquiring-vials), [Dishes](http://zombiecafe.wikidot.com/dishes), [Head Cheesesteak](http://zombiecafe.wikidot.com/dish:head-cheesesteak), [Restaurant Design](http://zombiecafe.wikidot.com/restaurant-design), [Toxin Barrel thread](http://zombiecafe.wikidot.com/forum/t-400464/toxin-barrel), [Tombstones thread](http://zombiecafe.wikidot.com/forum/t-405297/tombstones-badass-or-bull), [Bashmento Tips & Tricks](https://zombiecafe.wikidot.com/forum/t-344705/bashmento-tips-tricks-guide), [Fast Leveling Guide](http://zombiecafe.wikidot.com/forum/t-318977/general-guide-to-fast-leveling)
- [The Zombies Guide, GameFAQs](https://gamefaqs.gamespot.com/boards/620809-zombie-cafe/58189845)
- [Zombie Cafe Guide, TapGamers](https://www.tapgamers.com/?p=2699)
- [Zombie Cafe 1.1.0 tombstones update (blog)](https://appworthyblog.wordpress.com/2011/10/25/hello-world/)
- [Zombie Café, TouchArcade](https://toucharcade.com/games/zombie-cafe)
- [Zombie Café, Apptopia listing (update history)](https://apptopia.com/ios/app/407401359/about)
- [Zombie Caf 1.2.6: B-movie monster zombies (Softpedia)](https://mac.softpedia.com/blog/Download-Zombie-Caf-1-2-6-iOS-Starring-5-New-B-Movie-Monster-Zombies-319384.shtml)
- Reference screenshots supplied by the project owner.
