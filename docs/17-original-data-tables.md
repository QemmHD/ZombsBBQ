# 17 — The Original's Data Tables (decoded numbers)

What this is: the gameplay numbers from Zombie Café (Capcom/Beeline, 2011), decoded from the owner's own local copies of the game, so Zombs BBQ can be tuned against real values. It extends [10 — Animation & Layouts](10-original-animation-and-layouts.md) (formats, rival layouts, raid curves) and [08 — Deep Dive](08-original-deep-dive.md); it does not repeat them.

> **IP rule (same as docs 08/10).** Only facts and numbers are recorded here. No Capcom file, image, sound or long text is copied into the repo. Dish, customer, item and rival names appear **for reference only**, so the numbers can be matched to rows. Zombs BBQ must not reuse them.

**Sources.**
- **iOS build** (`Payload/ZombieCafe.app`). This is the *later* version: 320 recipes, 322 characters, 793 items, 22 cookbooks, 26 rivals, pets, max level 100. **This is the primary source for every table below** unless a row says otherwise.
- **Android APK** (`assets/data/*.bin.mid`, `libZombieCafeAndroid.so`). This is the *earlier* version: 216 recipes, 219 characters, 484 items, 10 cookbooks, max level 83. Its `.so` has symbols, so it was used to **name the fields** (loader code) and to emulate `Constants::load`. Where the two builds disagree, both values are shown.

Conventions:
- `$` = cash, `T` = toxin, `D` = currency 2 ("Toxin Drops" in `CurrencyTypesData`; used only by 7 iOS items).
- Times are minutes unless marked. "Lv" = café level.
- **[code]** = read from the loader or game logic in the Android `.so`. **[data]** = a table value. **[inf]** = our inference. **[help]** = the in-game Help page.

---

## 1. Recipes

### 1.1 Rules [code]

**Fields per recipe:**
- cost to cook (cash);
- unlock level;
- cook minutes;
- servings;
- sale price per serving;
- XP per cook;
- cookbook;
- the stove item that unlocks it (themed books only);
- a "source" code;
- the toxin price to study it from the fridge (5, 10 or 20).

**Variants** change these numbers through `Recipe::get*` (Android code). Variant *v* is named by string 333+*v*:

| v | Variant | Effect (exact formula) | Raid roll chance |
|---|---|---|---|
| 0 | plain | — | 60 % |
| 1 | Spicy | XP = max(XP × 1.1, XP + 1) | 8 % |
| 2 | Very Spicy | XP = max(XP × 1.2, XP + 2) | 4 % |
| 3 | Fancy | price + 1 per serving; cost + 0.95 × servings | 5 % |
| 4 | Very Fancy | price + 2 per serving; cost + 1.8 × servings | 2 % |
| 5 | Bulk | servings × 2; cost × 2 | 5 % |
| 6 | Fresh | burn deadline uses 3 × cook instead of 2 × cook (see below) | 2 % |
| 7 | Frozen | cook time × 2; cost × 0.75 | 5 % |
| 8 | Quick | cook time × 0.9 | 5 % |
| 9 | Very Quick | cook time × 0.8 | 4 % |

(The raid chances come from `GameStateRaid_VARIANT_CHANCES` = cumulative 60/68/72/77/79/84/86/91/96/100.)

**Burning:**
- Android code: the dish burns at max(2 × cook, cook + 10 min) after the start. So the grace window after it finishes is max(cook, 10 min). Fresh uses 3 × cook. `Stove_ACTIVE_COOK_BURN_GRACE_SECONDS` = 120.
- The **iOS Help page states a newer rule**: grace window = **5× cook if the cook is ≤ 5 min, 4× for 6–30 min, 3× for 31+ min**, and Fresh adds a further multiplier.
- The Android Help says "burns after a time equal to the cook time (Mystery Meat: 5 min)".

**Other rules:**
- **Finish now with toxin** = ⌊(10 × XP + servings × price) / 500 × remaining ÷ total⌋, minimum 1 [code].
- **Studying a recipe** from the fridge costs `RECIPE_COST` 5 T (plain), `RECIPE_VARIANT_COST` 5 T, or `RECIPE_RARE_COST` 10 T.
- **Collection XP bonus**: unlocking your N-th recipe pays a one-off XP bonus (§4.3).

### 1.2 Cookbooks [data] (22 in iOS, 10 in Android)

| id | Cookbook | Unlocked by | Stove theme | Level | Cash (iOS) | Android cash / toxin |
|---|---|---|---|---|---|---|
| 0 | Favorites | default | - | 2 | - | 0 / 0 |
| 1 | General | default | - | 2 | - | 0 / 0 |
| 2 | Raid | default | - | 2 | - | 0 / 0 |
| 3 | Mafia | buying its stove | 1 | 15 | - | 5000 / 20 |
| 4 | Politician | buying its stove | 2 | 16 | - | 5000 / 20 |
| 5 | Day of the Dead | buying its stove | 3 | 5 | - | 5000 / 20 |
| 6 | Medieval | buying its stove | 4 | 8 | - | 5000 / 20 |
| 7 | Pirate | purchase / event | - | 11 | 8000 | 0 / 20 |
| 8 | Vampire | purchase / event | - | 13 | 9000 | 0 / 30 |
| 9 | Super Hero | buying its stove | 5 | 14 | - | 0 / 30 |
| 10 | Egyptian | buying its stove | 6 | 12 | - | iOS only |
| 11 | Greek | buying its stove | 7 | 17 | - | iOS only |
| 12 | Super Mutant | buying its stove | 8 | 17 | - | iOS only |
| 13 | Alice | buying its stove | 9 | 17 | - | iOS only |
| 14 | Graveyard | buying its stove | 10 | 17 | - | iOS only |
| 15 | Norse | buying its stove | 11 | 17 | - | iOS only |
| 16 | Fantasy | buying its stove | 12 | 17 | - | iOS only |
| 17 | 50's Dining | buying its stove | 13 | 17 | - | iOS only |
| 18 | Victorian Practical Cookery | buying its stove | 14 | 19 | - | iOS only |
| 19 | Celebrity Catering | buying its stove | 15 | 20 | - | iOS only |
| 20 | Dark Side of the Spoon | buying its stove | 16 | 21 | - | iOS only |
| 21 | Tiki | default | - | 6 | - | iOS only |

- "Stove theme" is the theme id of the stoves that unlock the book (the `stoveTheme` byte of the stove items in §3.3).
- Every stove-themed book except Mafia has **exactly 6 recipes in 3 stove tiers × 2**: 2 come with the base stove and each upgrade tier unlocks 2 more (recipe "Stove id" column).
- Mafia is the exception: 13 recipes over 4 pizza-oven tiers (1 + 2 + 3 + 3), plus 4 raid-only ones.
- Pirate (7) and Vampire (8) are cash books of 7–8 recipes with no stove. Tiki (21) holds 1 recipe.
- The Android build sold the themed books for $5000 or 20 T as an alternative to buying the stove. The iOS build sells Pirate for $8000 and Vampire for $9000.

### 1.3 Full recipe table (iOS, 320 rows) [data]

Columns:
- **Gross** = servings × $/serv. **Net** = gross − cost. Both are derived by us.
- **Src** is the iOS source code:
  - 0 = General book, bought by level;
  - 1 = Raid book (study from the fridge);
  - 2 = rare raid/boss recipe;
  - 3/4 = one-offs (event or friend gift) [inf];
  - 5 = themed-stove recipe;
  - 6 = cash/toxin cookbook (Pirate, Vampire);
  - 7 = Tiki;
  - 12 = placeholder.
- **Stove id** = the furniture id of the stove tier that unlocks the row (see §3.3).

Rows 318–319 have an extra variable block (they look like combination recipes) that was not decoded.

| id | Dish (ref only) | Lv | Book | Cook min | Serv | Cost $ | $/serv | Gross $ | Net $ | XP | Src | Stove id | Study toxin |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 | Mystery Meat | 1 | General | 2 | 12 | 8 | 1 | 12 | 4 | 1 | 0 |  | 5 |
| 1 | Hobo Delight | 1 | Raid | 5 | 20 | 30 | 2 | 40 | 10 | 2 | 1 |  | 5 |
| 2 | Dishwater Soup | 2 | General | 15 | 50 | 125 | 3 | 150 | 25 | 5 | 0 |  | 5 |
| 3 | Leftunders | 3 | Raid | 480 | 300 | 400 | 3 | 900 | 500 | 65 | 1 |  | 5 |
| 4 | Green Eggs & Sam | 3 | General | 60 | 180 | 280 | 2 | 360 | 80 | 15 | 0 |  | 5 |
| 5 | Finger Sandwiches | 3 | Raid | 1080 | 650 | 1100 | 3 | 1950 | 850 | 90 | 1 |  | 5 |
| 6 | Gello Mold | 4 | General | 720 | 400 | 475 | 3 | 1200 | 725 | 60 | 0 |  | 5 |
| 7 | Toe Jam Sandwiches | 4 | Raid | 90 | 100 | 190 | 3 | 300 | 110 | 20 | 1 |  | 5 |
| 8 | Dough-Nots | 4 | Raid | 180 | 220 | 235 | 2 | 440 | 205 | 25 | 1 |  | 5 |
| 9 | Handburgers & Flies | 5 | General | 300 | 320 | 310 | 2 | 640 | 330 | 45 | 0 |  | 5 |
| 10 | Green-plate Special | 5 | Raid | 30 | 115 | 300 | 3 | 345 | 45 | 12 | 1 |  | 5 |
| 11 | Onion Wrongs | 5 | Raid | 15 | 125 | 100 | 1 | 125 | 25 | 6 | 1 |  | 5 |
| 12 | Sloppy "Joe" | 6 | General | 1440 | 850 | 1500 | 3 | 2550 | 1050 | 95 | 0 |  | 5 |
| 13 | Tumor Melts | 6 | Raid | 2880 | 1100 | 2600 | 4 | 4400 | 1800 | 160 | 1 |  | 5 |
| 14 | Zomelets | 6 | Raid | 60 | 190 | 300 | 2 | 380 | 80 | 20 | 1 |  | 5 |
| 15 | Meat Lover Pizza | 7 | General | 120 | 150 | 460 | 4 | 600 | 140 | 30 | 0 |  | 5 |
| 16 | Pork 'n' Brains | 7 | Raid | 660 | 430 | 650 | 3 | 1290 | 640 | 70 | 1 |  | 5 |
| 17 | Fetidccine | 7 | Raid | 4320 | 1900 | 3200 | 3 | 5700 | 2500 | 220 | 1 |  | 5 |
| 18 | Mac & Fleas | 8 | General | 360 | 400 | 380 | 2 | 800 | 420 | 55 | 0 |  | 5 |
| 19 | Wormicelli | 8 | Raid | 1200 | 900 | 1800 | 3 | 2700 | 900 | 90 | 1 |  | 5 |
| 20 | Gnasty Gnocchi | 9 | General | 840 | 375 | 475 | 3 | 1125 | 650 | 80 | 0 |  | 5 |
| 21 | Tiramiseeeww | 9 | Raid | 90 | 120 | 250 | 3 | 360 | 110 | 30 | 1 |  | 5 |
| 22 | Flied Lice | 9 | Raid | 150 | 185 | 200 | 2 | 370 | 170 | 40 | 1 |  | 5 |
| 23 | Wonton Goop | 10 | General | 20 | 115 | 320 | 3 | 345 | 25 | 9 | 0 |  | 5 |
| 24 | Curry Slurry | 10 | Raid | 1080 | 950 | 1100 | 2 | 1900 | 800 | 110 | 1 |  | 5 |
| 25 | Bul-goo-gi | 10 | Raid | 1920 | 1100 | 3000 | 4 | 4400 | 1400 | 150 | 1 |  | 5 |
| 26 | Misfortune Cookies | 11 | General | 15 | 125 | 100 | 1 | 125 | 25 | 7 | 0 |  | 5 |
| 27 | Faux Noodles | 11 | Raid | 420 | 300 | 475 | 3 | 900 | 425 | 70 | 1 |  | 5 |
| 28 | Ground Chuck | 12 | General | 120 | 200 | 440 | 3 | 600 | 160 | 40 | 0 |  | 5 |
| 29 | Burro-itos | 12 | Raid | 720 | 650 | 650 | 2 | 1300 | 650 | 90 | 1 |  | 5 |
| 30 | Chili con Carney | 13 | General | 5 | 40 | 30 | 1 | 40 | 10 | 5 | 0 |  | 5 |
| 31 | Loco Tacos | 13 | Raid | 60 | 350 | 265 | 1 | 350 | 85 | 30 | 1 |  | 5 |
| 32 | Entrail-ladas | 14 | General | 15 | 75 | 125 | 2 | 150 | 25 | 9 | 0 |  | 5 |
| 33 | Guck-a-mole | 14 | Raid | 300 | 650 | 300 | 1 | 650 | 350 | 55 | 1 |  | 5 |
| 34 | Blood Pudding | 15 | General | 1440 | 850 | 1900 | 3 | 2550 | 650 | 120 | 0 |  | 5 |
| 35 | Hag-Gus | 15 | Raid | 90 | 100 | 220 | 3 | 300 | 80 | 35 | 1 |  | 5 |
| 36 | Stake & Kidney Pies | 16 | General | 720 | 300 | 415 | 3 | 900 | 485 | 95 | 0 |  | 5 |
| 37 | Fishy Chips | 16 | Raid | 180 | 220 | 300 | 2 | 440 | 140 | 40 | 1 |  | 5 |
| 38 | Head Cheesesteak | 17 | General | 30 | 140 | 385 | 3 | 420 | 35 | 15 | 0 |  | 5 |
| 39 | Bangers & Mush | 17 | Raid | 1080 | 650 | 1400 | 3 | 1950 | 550 | 130 | 1 |  | 5 |
| 40 | Lady Fingers | 18 | General | 15 | 120 | 210 | 6 | 720 | 510 | 10 | 0 |  | 5 |
| 41 | Foie Gross | 18 | Raid | 480 | 300 | 1250 | 6 | 1800 | 550 | 85 | 1 |  | 5 |
| 42 | Escargut | 19 | General | 2880 | 1100 | 5500 | 7 | 7700 | 2200 | 200 | 0 |  | 5 |
| 43 | Stake Tar-Tar | 19 | Raid | 120 | 150 | 1040 | 8 | 1200 | 160 | 45 | 1 |  | 5 |
| 44 | Fileted Minion | 20 | General | 720 | 430 | 1850 | 6 | 2580 | 730 | 110 | 0 |  | 5 |
| 45 | Muscles Sprouts | 20 | Raid | 300 | 220 | 750 | 5 | 1100 | 350 | 65 | 1 |  | 5 |
| 46 | Anti Hero Sandwich | 21 | Raid | 1200 | 360 | 2500 | 8 | 2880 | 380 | 145 | 1 |  | 5 |
| 47 | Brine Shrimp Cocktail | 22 | Raid | 60 | 120 | 600 | 6 | 720 | 120 | 40 | 1 |  | 5 |
| 48 | Tofu Brain | 7 | Raid | 120 | 200 | 650 | 4 | 800 | 150 | 50 | 1 |  | 5 |
| 49 | Army Rations | 8 | Raid | 60 | 210 | 290 | 2 | 420 | 130 | 25 | 1 |  | 5 |
| 50 | Rot Dogs | 6 | Raid | 45 | 165 | 250 | 2 | 330 | 80 | 14 | 1 |  | 5 |
| 51 | Keblobs | 9 | Raid | 480 | 300 | 400 | 3 | 900 | 500 | 75 | 1 |  | 5 |
| 52 | Street Pizza | 8 | Raid | 240 | 350 | 340 | 2 | 700 | 360 | 40 | 2 |  | 10 |
| 53 | Jam on Toes | 5 | Raid | 300 | 340 | 260 | 2 | 680 | 420 | 90 | 3 |  | 10 |
| 54 | Net Prawn | 24 | General | 180 | 250 | 1100 | 6 | 1500 | 400 | 60 | 0 |  | 5 |
| 55 | Haggis | 5 | Raid | 120 | 260 | 250 | 2 | 520 | 270 | 50 | 2 |  | 10 |
| 56 | Mice Pudding | 25 | General | 15 | 150 | 220 | 6 | 900 | 680 | 15 | 0 |  | 5 |
| 57 | Sandwitch | 26 | General | 60 | 280 | 420 | 3 | 840 | 420 | 35 | 0 |  | 5 |
| 58 | Caramel Adam's Apple | 5 | Raid | 60 | 260 | 275 | 3 | 780 | 505 | 50 | 2 |  | 10 |
| 59 | Roast Turk-key | 12 | Raid | 240 | 415 | 410 | 2 | 830 | 420 | 40 | 1 |  | 5 |
| 60 | Cremated Brulee | 15 | Raid | 440 | 315 | 500 | 3 | 945 | 445 | 80 | 1 |  | 5 |
| 61 | Snot Cross Buns | 17 | Raid | 1850 | 1100 | 2800 | 4 | 4400 | 1600 | 140 | 2 |  | 10 |
| 62 | Blood Shake | 19 | Raid | 310 | 360 | 325 | 2 | 720 | 395 | 50 | 2 |  | 10 |
| 63 | Fish Fingers | 27 | General | 650 | 400 | 1600 | 5 | 2000 | 400 | 110 | 0 |  | 5 |
| 64 | Cuss-Turd Tart | 28 | General | 280 | 200 | 750 | 5 | 1000 | 250 | 60 | 0 |  | 5 |
| 65 | Fruit Cake | 29 | General | 2500 | 900 | 4500 | 7 | 6300 | 1800 | 180 | 0 |  | 5 |
| 66 | Puking Duck | 16 | Raid | 1100 | 700 | 1500 | 5 | 3500 | 2000 | 130 | 2 |  | 10 |
| 67 | Leg Rolls | 18 | Raid | 700 | 350 | 400 | 3 | 1050 | 650 | 100 | 2 |  | 10 |
| 68 | Lion's Head Meatballs | 30 | General | 470 | 320 | 1260 | 6 | 1920 | 660 | 85 | 0 |  | 5 |
| 69 | Torn-Up-Cake | 31 | General | 180 | 240 | 315 | 3 | 720 | 405 | 45 | 0 |  | 5 |
| 70 | Bleeding Hearts | 32 | General | 1900 | 1150 | 3250 | 4 | 4600 | 1350 | 150 | 0 |  | 5 |
| 71 | Ape-a-Teaser | 19 | Raid | 440 | 315 | 500 | 3 | 945 | 445 | 80 | 1 |  | 5 |
| 72 | Festering Hot Chocolate | 20 | Raid | 460 | 400 | 800 | 5 | 2000 | 1200 | 150 | 2 |  | 10 |
| 73 | Hunch-Back Roast | 22 | Raid | 45 | 120 | 650 | 6 | 720 | 70 | 40 | 2 |  | 10 |
| 74 | Rotten-Apple Pie | 33 | General | 500 | 320 | 1500 | 6 | 1920 | 420 | 95 | 0 |  | 5 |
| 75 | Tweet Loaf | 34 | General | 200 | 240 | 350 | 6 | 1440 | 1090 | 45 | 0 |  | 5 |
| 76 | Putrefied Clam Chowder | 35 | General | 165 | 300 | 1200 | 8 | 2400 | 1200 | 60 | 0 |  | 5 |
| 77 | Ham and Sneeze Sandwich | 36 | General | 400 | 300 | 450 | 4 | 1200 | 750 | 75 | 0 |  | 5 |
| 78 | Chicken Fried Snake | 37 | General | 500 | 500 | 2400 | 5 | 2500 | 100 | 200 | 0 |  | 5 |
| 79 | Pigs in a Blanket | 38 | General | 1850 | 1100 | 3000 | 5 | 5500 | 2500 | 200 | 0 |  | 5 |
| 80 | Malted Charm | 11 | Raid | 1800 | 1050 | 2500 | 4 | 4200 | 1700 | 150 | 2 |  | 10 |
| 81 | Mourned Beef and Cabbage | 14 | Raid | 1920 | 1200 | 3300 | 4 | 4800 | 1500 | 145 | 2 |  | 10 |
| 82 | Entropy Cassoulet | 17 | Raid | 470 | 390 | 800 | 5 | 1950 | 1150 | 140 | 2 |  | 10 |
| 83 | Quasar Coffee | 21 | Raid | 1000 | 700 | 1500 | 5 | 3500 | 2000 | 140 | 2 |  | 10 |
| 84 | String (Theory) Cheese | 24 | Raid | 1000 | 800 | 2500 | 5 | 4000 | 1500 | 100 | 2 |  | 10 |
| 85 | Dark Matter Loaf | 25 | Raid | 450 | 410 | 800 | 6 | 2460 | 1660 | 150 | 1 |  | 5 |
| 86 | Frozen T-Oort Cloud | 13 | Raid | 90 | 200 | 900 | 5 | 1000 | 100 | 60 | 1 |  | 5 |
| 87 | Khyber-Belt Kebabs | 10 | Raid | 450 | 290 | 500 | 3 | 870 | 370 | 60 | 1 |  | 5 |
| 88 | Plutonian Cider | 39 | General | 800 | 500 | 500 | 5 | 2500 | 2000 | 100 | 0 |  | 5 |
| 89 | Europan Sea Slugs | 40 | General | 500 | 390 | 1500 | 6 | 2340 | 840 | 110 | 0 |  | 5 |
| 90 | Spaghettified Meat Balls | 41 | General | 1000 | 750 | 2200 | 5 | 3750 | 1550 | 110 | 0 |  | 5 |
| 91 | Beeline Honey Glazed "Ham" | 7 | Raid | 400 | 500 | 550 | 3 | 1500 | 950 | 110 | 4 |  | 10 |
| 92 | Buffalo Wings | 27 | Raid | 315 | 400 | 325 | 3 | 1200 | 875 | 55 | 2 |  | 10 |
| 93 | Cockroach Calzone | 28 | Raid | 825 | 540 | 1945 | 5 | 2700 | 755 | 95 | 2 |  | 10 |
| 94 | Deep Fried Bacon Wrapped Pizza | 29 | Raid | 1050 | 835 | 2730 | 6 | 5010 | 2280 | 112 | 2 |  | 10 |
| 95 | English Breakfast Pizza | 30 | Raid | 350 | 450 | 865 | 4 | 1800 | 935 | 65 | 2 |  | 10 |
| 96 | Head Cheese Pizza | 31 | Raid | 1250 | 625 | 1430 | 5 | 3125 | 1695 | 56 | 1 |  | 5 |
| 97 | Meatzza | 32 | Raid | 350 | 425 | 525 | 3 | 1275 | 750 | 55 | 1 |  | 5 |
| 98 | Peanut Butter & Jelly Pizza | 42 | General | 720 | 576 | 610 | 3 | 1728 | 1118 | 35 | 0 |  | 5 |
| 99 | Spoiled Sea Food Pizza | 43 | General | 846 | 640 | 1230 | 4 | 2560 | 1330 | 75 | 0 |  | 5 |
| 100 | Vegan Pizza | 44 | General | 975 | 720 | 2050 | 5 | 3600 | 1550 | 95 | 0 |  | 5 |
| 101 | Thorn Bread | 33 | Raid | 950 | 650 | 2000 | 5 | 3250 | 1250 | 85 | 2 |  | 10 |
| 102 | Ox Tail | 34 | Raid | 300 | 220 | 736 | 5 | 1100 | 364 | 70 | 2 |  | 10 |
| 103 | Boiled Mystery Meat | 35 | Raid | 18 | 165 | 235 | 6 | 990 | 755 | 65 | 2 |  | 10 |
| 104 | Toe-Cooked Baked Beans | 36 | Raid | 810 | 600 | 1875 | 5 | 3000 | 1125 | 90 | 1 |  | 5 |
| 105 | Coal-Slaw | 37 | Raid | 800 | 550 | 532 | 5 | 2750 | 2218 | 95 | 1 |  | 5 |
| 106 | Rotisserie Chicken | 10 | Raid | 1000 | 626 | 1366 | 3 | 1878 | 512 | 125 | 1 |  | 5 |
| 107 | Grief Brisket | 45 | General | 2000 | 875 | 3850 | 7 | 6125 | 2275 | 170 | 0 |  | 5 |
| 108 | Rancid Pulled Pork | 46 | General | 285 | 225 | 723 | 6 | 1350 | 627 | 65 | 0 |  | 5 |
| 109 | Cracked Ribs | 47 | General | 475 | 375 | 1492 | 6 | 2250 | 758 | 105 | 0 |  | 5 |
| 110 | Gruesome Gruel | 23 | Raid | 1200 | 355 | 2450 | 8 | 2840 | 390 | 145 | 2 |  | 10 |
| 111 | Thumb Pudding | 26 | Raid | 1900 | 1150 | 3340 | 4 | 4600 | 1260 | 180 | 2 |  | 10 |
| 112 | Vile Veal | 34 | Raid | 800 | 550 | 425 | 5 | 2750 | 2325 | 80 | 2 |  | 10 |
| 113 | Rabid Rabbit | 17 | Raid | 1000 | 650 | 1350 | 4 | 2600 | 1250 | 130 | 1 |  | 5 |
| 114 | Tainted Sparkling Water | 23 | Raid | 15 | 150 | 285 | 6 | 900 | 615 | 20 | 1 |  | 5 |
| 115 | Toxic Trifle | 21 | Raid | 120 | 150 | 1050 | 8 | 1200 | 150 | 50 | 1 |  | 5 |
| 116 | Stewed Ox Cheek | 48 | General | 18 | 180 | 265 | 6 | 1080 | 815 | 66 | 0 |  | 5 |
| 117 | Torn Tripe | 49 | General | 710 | 576 | 650 | 3 | 1728 | 1078 | 40 | 0 |  | 5 |
| 118 | Broxy | 50 | General | 935 | 670 | 2010 | 6 | 4020 | 2010 | 85 | 0 |  | 5 |
| 119 | Ew-Nagi | 51 | General | 285 | 275 | 723 | 6 | 1650 | 927 | 68 | 0 |  | 5 |
| 120 | Bento Brain Box | 52 | General | 350 | 425 | 525 | 4 | 1700 | 1175 | 58 | 0 |  | 5 |
| 121 | Roe Boat | 53 | General | 1000 | 730 | 1500 | 5 | 3650 | 2150 | 145 | 0 |  | 5 |
| 122 | Ghoul Cheese Pizza | 15 | Mafia | 440 | 315 | 500 | 3 | 945 | 445 | 80 | 5 | 391 | 5 |
| 123 | Crunchy Crow Pizza | 15 | Mafia | 180 | 220 | 300 | 2 | 440 | 140 | 40 | 1 |  | 5 |
| 124 | Red Eye Gratin | 15 | Mafia | 315 | 400 | 1100 | 3 | 1200 | 100 | 55 | 2 |  | 10 |
| 125 | Brain Rattail Pizza | 15 | Mafia | 720 | 300 | 415 | 3 | 900 | 485 | 95 | 5 | 392 | 5 |
| 126 | Leech Ball Pizza | 15 | Mafia | 180 | 220 | 300 | 2 | 440 | 140 | 40 | 5 | 392 | 5 |
| 127 | Cheesey Bake Tongue | 15 | Mafia | 30 | 140 | 385 | 3 | 420 | 35 | 15 | 5 | 393 | 5 |
| 128 | Brain & Grease Pizza | 15 | Mafia | 1080 | 650 | 1400 | 3 | 1950 | 550 | 130 | 5 | 393 | 5 |
| 129 | Lavaian Maggot Pizza | 15 | Mafia | 15 | 120 | 210 | 6 | 720 | 510 | 10 | 5 | 394 | 5 |
| 130 | Slug Lime Pizza | 15 | Mafia | 480 | 300 | 1250 | 6 | 1800 | 550 | 85 | 5 | 394 | 5 |
| 131 | Kidney Pie | 54 | General | 1000 | 750 | 1500 | 6 | 4500 | 3000 | 124 | 0 |  | 5 |
| 132 | Piranha Stew | 55 | General | 1700 | 1420 | 2900 | 5 | 7100 | 4200 | 188 | 0 |  | 5 |
| 133 | Roasted Scorpion King | 56 | General | 645 | 300 | 700 | 7 | 2100 | 1400 | 88 | 0 |  | 5 |
| 134 | Alfred and Pesto | 16 | Mafia | 180 | 220 | 300 | 2 | 440 | 140 | 40 | 1 |  | 5 |
| 135 | Sneeze Disease Pizza | 16 | Mafia | 240 | 350 | 450 | 2 | 700 | 250 | 40 | 1 |  | 5 |
| 136 | Reformed Burger | 16 | Politician | 660 | 400 | 800 | 4 | 1600 | 800 | 130 | 5 | 397 | 5 |
| 137 | Donkey Dog | 16 | Politician | 440 | 315 | 500 | 3 | 945 | 445 | 80 | 5 | 397 | 5 |
| 138 | Grilled Foot n' Mouth | 16 | Politician | 90 | 100 | 220 | 3 | 300 | 80 | 35 | 5 | 398 | 5 |
| 139 | Jerk Elephant Skewers | 16 | Politician | 720 | 300 | 415 | 3 | 900 | 485 | 95 | 5 | 398 | 5 |
| 140 | Smoked Choppa` | 16 | Politician | 180 | 220 | 300 | 2 | 440 | 140 | 40 | 5 | 399 | 5 |
| 141 | Body Builder Burger | 16 | Politician | 30 | 140 | 385 | 3 | 420 | 35 | 15 | 5 | 399 | 5 |
| 142 | Toads & Tofu | 57 | General | 1000 | 750 | 1500 | 6 | 4500 | 3000 | 124 | 0 |  | 5 |
| 143 | Vamp Burger | 58 | General | 1700 | 1420 | 2900 | 5 | 7100 | 4200 | 188 | 0 |  | 5 |
| 144 | Scissors Salad | 59 | General | 645 | 300 | 700 | 2 | 600 | -100 | 600 | 0 |  | 5 |
| 145 | Guts N' Guacamole | 5 | Day of the Dead | 20 | 200 | 150 | 1 | 200 | 50 | 10 | 5 | 410 | 5 |
| 146 | Batty Burritos | 5 | Day of the Dead | 40 | 175 | 200 | 2 | 350 | 150 | 15 | 5 | 410 | 5 |
| 147 | Bread Of The Dead | 5 | Day of the Dead | 90 | 225 | 250 | 2 | 450 | 200 | 40 | 5 | 411 | 5 |
| 148 | Time Bomb Tamales | 5 | Day of the Dead | 180 | 220 | 300 | 3 | 660 | 360 | 65 | 5 | 411 | 5 |
| 149 | Sugar Skulls | 5 | Day of the Dead | 45 | 100 | 225 | 4 | 400 | 175 | 25 | 5 | 412 | 5 |
| 150 | Fried Finger Fajitas | 5 | Day of the Dead | 360 | 450 | 550 | 3 | 1350 | 800 | 100 | 5 | 412 | 5 |
| 151 | Leperoni Pizza | 60 | General | 860 | 600 | 1220 | 4 | 2400 | 1180 | 135 | 0 |  | 5 |
| 152 | Meatish Sweetballs | 61 | General | 700 | 650 | 950 | 3 | 1950 | 1000 | 108 | 0 |  | 5 |
| 153 | Riga Tony | 62 | General | 1200 | 830 | 2075 | 5 | 4150 | 2075 | 155 | 0 |  | 5 |
| 154 | Swampish Mousse | 63 | General | 1260 | 850 | 2250 | 3 | 2550 | 300 | 170 | 0 |  | 5 |
| 155 | Sluggish Eclair | 64 | General | 1045 | 735 | 1530 | 4 | 2940 | 1410 | 126 | 0 |  | 5 |
| 156 | Hash Clown | 65 | General | 735 | 550 | 1875 | 6 | 3300 | 1425 | 100 | 0 |  | 5 |
| 157 | Quick Stir-fly | 8 | Raid | 420 | 500 | 580 | 2 | 1000 | 420 | 62 | 1 |  | 5 |
| 158 | Bread & Brains Spread | 11 | Raid | 500 | 250 | 360 | 3 | 750 | 390 | 55 | 1 |  | 5 |
| 159 | Beetle in Beetroot Sauce | 14 | Raid | 600 | 680 | 670 | 2 | 1360 | 690 | 90 | 1 |  | 5 |
| 160 | Spiderello | 18 | Raid | 350 | 480 | 850 | 4 | 1920 | 1070 | 85 | 1 |  | 5 |
| 161 | Fried Snakeroll | 20 | Raid | 600 | 400 | 1000 | 5 | 2000 | 1000 | 88 | 1 |  | 5 |
| 162 | Jumble Eye-ah | 24 | Raid | 720 | 645 | 1230 | 4 | 2580 | 1350 | 100 | 1 |  | 5 |
| 163 | Garden Gnome Salad | 66 | General | 450 | 700 | 1340 | 4 | 2800 | 1460 | 105 | 0 |  | 5 |
| 164 | Fetid Djinni | 67 | General | 800 | 685 | 1670 | 5 | 3425 | 1755 | 150 | 0 |  | 5 |
| 165 | Verminestroni | 68 | General | 960 | 555 | 1915 | 7 | 3885 | 1970 | 160 | 0 |  | 5 |
| 166 | Wiccan Nuggets | 69 | General | 600 | 950 | 1420 | 3 | 2850 | 1430 | 120 | 0 |  | 5 |
| 167 | Voodoo Fondue | 70 | General | 860 | 720 | 1815 | 5 | 3600 | 1785 | 145 | 0 |  | 5 |
| 168 | Eyestir Sauce Noodles | 71 | General | 1320 | 580 | 2170 | 8 | 4640 | 2470 | 162 | 0 |  | 5 |
| 169 | Leech Melba | 26 | Raid | 240 | 320 | 650 | 5 | 1600 | 950 | 50 | 1 |  | 5 |
| 170 | Nukes 'N Puke | 27 | Raid | 480 | 500 | 840 | 4 | 2000 | 1160 | 75 | 1 |  | 5 |
| 171 | Knuckle Sandwich | 28 | Raid | 520 | 330 | 915 | 6 | 1980 | 1065 | 82 | 1 |  | 5 |
| 172 | Druid's Juice | 8 | Medieval | 150 | 265 | 220 | 2 | 530 | 310 | 22 | 5 | 430 | 5 |
| 173 | Hydrapanic Salad | 8 | Medieval | 190 | 350 | 315 | 2 | 700 | 385 | 27 | 5 | 430 | 5 |
| 174 | Helm & Cheese | 8 | Medieval | 225 | 360 | 445 | 3 | 1080 | 635 | 40 | 5 | 431 | 5 |
| 175 | Unicorn Chowder | 8 | Medieval | 280 | 375 | 540 | 3 | 1125 | 585 | 45 | 5 | 431 | 5 |
| 176 | Dragon Soup | 8 | Medieval | 360 | 420 | 615 | 3 | 1260 | 645 | 60 | 5 | 432 | 5 |
| 177 | Holy Gauntlet Pottage | 8 | Medieval | 400 | 480 | 680 | 3 | 1440 | 760 | 65 | 5 | 432 | 5 |
| 178 | Crimonade Can | 72 | General | 880 | 900 | 1755 | 4 | 3600 | 1845 | 152 | 0 |  | 5 |
| 179 | Orc Steak | 73 | General | 580 | 1080 | 1580 | 3 | 3240 | 1660 | 123 | 0 |  | 5 |
| 180 | Mandragora Dip | 74 | General | 1220 | 695 | 2375 | 7 | 4865 | 2490 | 168 | 0 |  | 5 |
| 181 | Eyeberry Jelly | 11 | Raid | 620 | 385 | 580 | 3 | 1155 | 575 | 80 | 1 |  | 5 |
| 182 | Red Dragon | 11 | Raid | 1200 | 950 | 2250 | 4 | 3800 | 1550 | 140 | 2 |  | 10 |
| 183 | Plundered Blowfish | 11 | Pirate | 280 | 530 | 740 | 3 | 1590 | 850 | 70 | 6 |  | 5 |
| 184 | Oyster Pearls | 11 | Pirate | 240 | 445 | 635 | 3 | 1335 | 700 | 85 | 6 |  | 5 |
| 185 | Jelly Roger Custard | 11 | Pirate | 180 | 505 | 410 | 2 | 1010 | 600 | 65 | 1 |  | 5 |
| 186 | Molar Breakers | 11 | Pirate | 330 | 440 | 860 | 4 | 1760 | 900 | 90 | 1 |  | 5 |
| 187 | Shark Tooth Dullers | 11 | Pirate | 385 | 495 | 935 | 4 | 1980 | 1045 | 95 | 1 |  | 5 |
| 188 | Killer Squid | 11 | Pirate | 500 | 520 | 1005 | 4 | 2080 | 1075 | 100 | 1 |  | 5 |
| 189 | Snake-Snacks | 75 | General | 900 | 755 | 1840 | 5 | 3775 | 1935 | 155 | 0 |  | 5 |
| 190 | Greasy Grizzly | 76 | General | 1160 | 800 | 2215 | 6 | 4800 | 2585 | 167 | 0 |  | 5 |
| 191 | Elephant Toe Jam | 77 | General | 1440 | 860 | 3055 | 8 | 6880 | 3825 | 195 | 0 |  | 5 |
| 192 | Vampire Ash Browns | 13 | Vampire | 240 | 120 | 140 | 3 | 360 | 220 | 50 | 6 |  | 5 |
| 193 | Staked Steak | 13 | Vampire | 130 | 200 | 185 | 2 | 400 | 215 | 40 | 6 |  | 5 |
| 194 | Nosfera-Stew | 13 | Vampire | 100 | 450 | 200 | 1 | 450 | 250 | 20 | 1 |  | 5 |
| 195 | Bat BQ | 13 | Vampire | 220 | 145 | 210 | 3 | 435 | 225 | 45 | 1 |  | 5 |
| 196 | Heart Dog on a Stake | 13 | Vampire | 180 | 250 | 225 | 2 | 500 | 275 | 35 | 2 |  | 10 |
| 197 | Garlic Choke | 13 | Vampire | 200 | 320 | 150 | 1 | 320 | 170 | 30 | 2 |  | 10 |
| 198 | Crucy Fries | 78 | General | 360 | 580 | 835 | 3 | 1740 | 905 | 80 | 0 |  | 5 |
| 199 | Eye Pop Candy | 79 | General | 180 | 1215 | 600 | 1 | 1215 | 615 | 100 | 0 |  | 5 |
| 200 | Crypt Cake | 80 | General | 420 | 750 | 780 | 2 | 1500 | 720 | 75 | 0 |  | 5 |
| 201 | Fish Bones & Gold Chips | 12 | Raid | 315 | 505 | 925 | 4 | 2020 | 1095 | 80 | 1 |  | 5 |
| 202 | Chili Chili Bang Bang | 12 | Raid | 440 | 610 | 1425 | 5 | 3050 | 1625 | 95 | 2 |  | 10 |
| 203 | Fireball Spaghetti | 14 | Super Hero | 100 | 265 | 250 | 2 | 530 | 280 | 44 | 5 | 478 | 5 |
| 204 | Zap Bar | 14 | Super Hero | 60 | 200 | 150 | 2 | 400 | 250 | 32 | 5 | 478 | 5 |
| 205 | Super Fruit Punch | 14 | Super Hero | 15 | 295 | 405 | 3 | 885 | 480 | 12 | 5 | 479 | 5 |
| 206 | Orion Soup | 14 | Super Hero | 200 | 285 | 400 | 3 | 855 | 455 | 68 | 5 | 479 | 5 |
| 207 | Green Belt Peppers | 14 | Super Hero | 245 | 235 | 430 | 4 | 940 | 510 | 75 | 5 | 480 | 5 |
| 208 | Reactor Burger | 14 | Super Hero | 450 | 290 | 700 | 4 | 1160 | 460 | 89 | 5 | 480 | 5 |
| 209 | Tropical Coco Brain | 81 | General | 840 | 720 | 2820 | 7 | 5040 | 2220 | 205 | 0 |  | 5 |
| 210 | Cali Snail Rolls | 82 | General | 1200 | 820 | 3295 | 8 | 6560 | 3265 | 218 | 0 |  | 5 |
| 211 | Croccoli Soup | 83 | General | 1560 | 900 | 3640 | 9 | 8100 | 4460 | 232 | 0 |  | 5 |
| 212 | Dracooler | 13 | Raid | 90 | 250 | 1350 | 6 | 1500 | 150 | 65 | 1 |  | 5 |
| 213 | Blueberry Fangcake | 13 | Raid | 600 | 700 | 2600 | 6 | 4200 | 1600 | 105 | 2 |  | 10 |
| 214 | Wedgie Burger | 84 | General | 890 | 770 | 3035 | 8 | 6160 | 3125 | 212 | 0 |  | 5 |
| 215 | Melon Coulis | 85 | General | 1140 | 870 | 3450 | 8 | 6960 | 3510 | 225 | 0 |  | 5 |
| 216 | Hot Frog | 86 | General | 1610 | 870 | 3870 | 9 | 7830 | 3960 | 250 | 0 |  | 5 |
| 217 | Brain Washer Soup | 14 | Raid | 20 | 600 | 600 | 2 | 1200 | 600 | 18 | 1 |  | 5 |
| 218 | Nuke Fondue | 14 | Raid | 1080 | 975 | 1800 | 4 | 3900 | 2100 | 110 | 1 |  | 5 |
| 219 | Z-Bone Steak | 87 | General | 840 | 800 | 1800 | 6 | 4800 | 3000 | 210 | 0 |  | 5 |
| 220 | Clown Pie | 88 | General | 150 | 300 | 675 | 4 | 1200 | 525 | 90 | 0 |  | 5 |
| 221 | Gulf Roast | 89 | General | 1320 | 1000 | 4170 | 8 | 8000 | 3830 | 218 | 0 |  | 5 |
| 222 | Creepy Crepes | 90 | General | 240 | 620 | 4120 | 8 | 4960 | 840 | 140 | 0 |  | 5 |
| 223 | Corpsicles | 91 | General | 360 | 1350 | 4410 | 4 | 5400 | 990 | 145 | 0 |  | 5 |
| 224 | Goat Chin Salad | 92 | General | 480 | 500 | 5040 | 12 | 6000 | 960 | 200 | 0 |  | 5 |
| 225 | Camel Custard | 12 | Egyptian | 120 | 620 | 310 | 1 | 620 | 310 | 65 | 5 | 511 | 5 |
| 226 | Venom on the Rocks | 12 | Egyptian | 180 | 440 | 405 | 2 | 880 | 475 | 70 | 5 | 511 | 5 |
| 227 | Cracked Scarab | 12 | Egyptian | 240 | 270 | 455 | 3 | 810 | 355 | 90 | 5 | 512 | 5 |
| 228 | Ooze Iris | 12 | Egyptian | 300 | 280 | 520 | 4 | 1120 | 600 | 104 | 5 | 512 | 5 |
| 229 | Cleo Pasta | 12 | Egyptian | 360 | 365 | 540 | 3 | 1095 | 555 | 85 | 5 | 513 | 5 |
| 230 | Fruitenkamon | 12 | Egyptian | 420 | 310 | 630 | 4 | 1240 | 610 | 110 | 5 | 513 | 5 |
| 231 | Stuffed Vomlet | 93 | General | 120 | 400 | 1570 | 5 | 2000 | 430 | 75 | 0 |  | 5 |
| 232 | Gooyabesse | 94 | General | 510 | 490 | 4800 | 12 | 5880 | 1080 | 220 | 0 |  | 5 |
| 233 | Nasal Nut Spread | 95 | General | 1320 | 1800 | 3200 | 4 | 7200 | 4000 | 240 | 0 |  | 5 |
| 234 | Mummy Munchies | 12 | Raid | 480 | 290 | 720 | 5 | 1450 | 730 | 120 | 1 |  | 5 |
| 235 | Mastaba Split | 12 | Raid | 540 | 300 | 880 | 6 | 1800 | 920 | 130 | 1 |  | 5 |
| 236 | Tommy Side Up | 15 | Mafia | 120 | 240 | 595 | 3 | 720 | 125 | 29 | 5 | 393 | 5 |
| 237 | Gangsta Clamps | 15 | Mafia | 1440 | 820 | 1600 | 3 | 2460 | 860 | 170 | 5 | 394 | 5 |
| 238 | Pukulele | 96 | General | 90 | 250 | 1600 | 8 | 2000 | 400 | 60 | 0 |  | 5 |
| 239 | Morgue Burger | 97 | General | 600 | 500 | 5200 | 13 | 6500 | 1300 | 256 | 0 |  | 5 |
| 240 | Pita Gora | 98 | General | 1440 | 920 | 6400 | 12 | 11040 | 4640 | 275 | 0 |  | 5 |
| 241 | Platonium Shot | 17 | Greek | 960 | 600 | 1200 | 3 | 1800 | 600 | 130 | 5 | 529 | 5 |
| 242 | Toeseidon | 17 | Greek | 2160 | 1200 | 2900 | 4 | 4800 | 1900 | 170 | 5 | 529 | 5 |
| 243 | Zeus Mousse | 17 | Greek | 90 | 60 | 200 | 5 | 300 | 100 | 36 | 5 | 530 | 5 |
| 244 | Berry Tarthenon | 17 | Greek | 450 | 400 | 700 | 5 | 2000 | 1300 | 150 | 5 | 530 | 5 |
| 245 | Cyclop Scallop | 17 | Greek | 240 | 200 | 500 | 4 | 800 | 300 | 50 | 5 | 531 | 5 |
| 246 | Wormopolis | 17 | Greek | 600 | 500 | 750 | 5 | 2500 | 1750 | 210 | 5 | 531 | 5 |
| 247 | Geese Burger | 99 | General | 480 | 600 | 4850 | 10 | 6000 | 1150 | 220 | 0 |  | 5 |
| 248 | Yucky-soba | 100 | General | 1200 | 900 | 3000 | 8 | 7200 | 4200 | 250 | 0 |  | 5 |
| 249 | Oysteroid Belt | 18 | Super Mutant | 1080 | 450 | 1000 | 4 | 1800 | 800 | 160 | 5 | 542 | 5 |
| 250 | Zero-Gravity Gravy | 18 | Super Mutant | 1920 | 960 | 2800 | 5 | 4800 | 2000 | 175 | 5 | 542 | 5 |
| 251 | Mars Mallows | 18 | Super Mutant | 120 | 75 | 160 | 4 | 300 | 140 | 50 | 5 | 543 | 5 |
| 252 | Galactic Galzone | 18 | Super Mutant | 420 | 350 | 825 | 6 | 2100 | 1275 | 150 | 5 | 543 | 5 |
| 253 | Cybork Bun | 18 | Super Mutant | 180 | 160 | 550 | 5 | 800 | 250 | 40 | 5 | 544 | 5 |
| 254 | Anti-matter | 18 | Super Mutant | 720 | 600 | 1450 | 6 | 3600 | 2150 | 260 | 5 | 544 | 5 |
| 255 | Hippo Crate | 17 | Raid | 90 | 180 | 625 | 4 | 720 | 95 | 23 | 1 |  | 5 |
| 256 | Achilles Chilies | 17 | Raid | 1320 | 420 | 1580 | 6 | 2520 | 940 | 180 | 1 |  | 5 |
| 257 | Mutant Flan | 18 | Raid | 480 | 350 | 600 | 6 | 2100 | 1500 | 180 | 1 |  | 5 |
| 258 | Nucus Can | 18 | Raid | 600 | 400 | 1400 | 9 | 3600 | 2200 | 235 | 1 |  | 5 |
| 259 | Iced Coffin | 13 | Vampire | 30 | 200 | 550 | 3 | 600 | 50 | 25 | 1 |  | 5 |
| 260 | Muddy Mary | 13 | Vampire | 1320 | 800 | 2000 | 7 | 5600 | 3600 | 250 | 2 |  | 10 |
| 261 | Half-A-Cup of Tea | 14 | Alice | 20 | 200 | 300 | 4 | 800 | 500 | 16 | 5 | 556 | 5 |
| 262 | Faterpillar | 14 | Alice | 120 | 200 | 300 | 4 | 800 | 500 | 64 | 5 | 556 | 5 |
| 263 | Queen of Tarts | 14 | Alice | 360 | 380 | 720 | 3 | 1140 | 420 | 70 | 5 | 557 | 5 |
| 264 | Cheshire Broth | 14 | Alice | 480 | 245 | 750 | 5 | 1225 | 475 | 82 | 5 | 557 | 5 |
| 265 | Jabber Wok | 14 | Alice | 720 | 300 | 1340 | 6 | 1800 | 460 | 90 | 5 | 558 | 5 |
| 266 | Unbirthday Cake | 14 | Alice | 1440 | 600 | 2285 | 5 | 3000 | 715 | 160 | 5 | 558 | 5 |
| 267 | Corpse Flakes | 9 | Graveyard | 150 | 180 | 200 | 3 | 540 | 340 | 22 | 5 | 580 | 5 |
| 268 | Cold feet | 9 | Graveyard | 240 | 275 | 500 | 4 | 1100 | 600 | 40 | 5 | 580 | 5 |
| 269 | Meatbag | 9 | Graveyard | 600 | 375 | 565 | 3 | 1125 | 560 | 72 | 5 | 581 | 5 |
| 270 | Lame Brains | 9 | Graveyard | 480 | 500 | 1000 | 4 | 2000 | 1000 | 90 | 5 | 581 | 5 |
| 271 | Poultrygheist | 9 | Graveyard | 1200 | 900 | 2100 | 4 | 3600 | 1500 | 130 | 5 | 582 | 5 |
| 272 | Doggy Digs | 9 | Graveyard | 1440 | 600 | 1750 | 6 | 3600 | 1850 | 175 | 5 | 582 | 5 |
| 273 | Beetle Dee and Beetle Dum | 14 | Raid | 420 | 400 | 1075 | 4 | 1600 | 525 | 82 | 1 |  | 5 |
| 274 | Jubjub Juice | 14 | Raid | 600 | 300 | 800 | 5 | 1500 | 700 | 150 | 1 |  | 5 |
| 275 | Arctic Sticks | 10 | Norse | 540 | 600 | 650 | 2 | 1200 | 550 | 80 | 5 | 610 | 5 |
| 276 | Dragon's Broth | 10 | Norse | 330 | 330 | 830 | 5 | 1650 | 820 | 85 | 5 | 610 | 5 |
| 277 | Elk Yolk | 10 | Norse | 280 | 300 | 700 | 5 | 1500 | 800 | 65 | 5 | 611 | 5 |
| 278 | Fishbone Pudding | 10 | Norse | 150 | 200 | 220 | 3 | 600 | 380 | 25 | 5 | 611 | 5 |
| 279 | Polar Paw | 10 | Norse | 180 | 505 | 410 | 2 | 1010 | 600 | 65 | 5 | 612 | 5 |
| 280 | Runey Nose | 10 | Norse | 1200 | 600 | 2500 | 6 | 3600 | 1100 | 155 | 5 | 612 | 5 |
| 281 | Worm Pit | 9 | Raid | 1200 | 500 | 2000 | 7 | 3500 | 1500 | 140 | 1 |  | 5 |
| 282 | Roach Motel | 9 | Raid | 1440 | 450 | 1650 | 8 | 3600 | 1950 | 180 | 1 |  | 5 |
| 283 | Mon-Stir-Fry | 13 | Fantasy | 15 | 130 | 190 | 5 | 650 | 460 | 11 | 5 | 631 | 5 |
| 284 | Macy Hair | 13 | Fantasy | 210 | 125 | 205 | 4 | 500 | 295 | 43 | 5 | 631 | 5 |
| 285 | Mage Pottage | 13 | Fantasy | 120 | 225 | 150 | 2 | 450 | 300 | 24 | 5 | 632 | 5 |
| 286 | Orc Chops | 13 | Fantasy | 220 | 145 | 210 | 3 | 435 | 225 | 45 | 5 | 632 | 5 |
| 287 | Boarbarian feast | 13 | Fantasy | 780 | 375 | 1400 | 5 | 1875 | 475 | 90 | 5 | 633 | 5 |
| 288 | Precious Onion Rings | 13 | Fantasy | 1560 | 750 | 2300 | 4 | 3000 | 700 | 160 | 5 | 633 | 5 |
| 289 | Roasted Turnkey | 10 | Raid | 600 | 300 | 600 | 4 | 1200 | 600 | 80 | 1 |  | 5 |
| 290 | Santa Claws | 10 | Raid | 1200 | 800 | 2200 | 5 | 4000 | 1800 | 140 | 1 |  | 5 |
| 291 | Belgian Awfuls | 11 | 50's Dining | 280 | 530 | 740 | 3 | 1590 | 850 | 70 | 5 | 665 | 5 |
| 292 | Eggs over Queasy | 11 | 50's Dining | 240 | 445 | 635 | 3 | 1335 | 700 | 85 | 5 | 665 | 5 |
| 293 | Eyeberry Filthshake | 11 | 50's Dining | 15 | 220 | 210 | 3 | 660 | 450 | 10 | 5 | 666 | 5 |
| 294 | Stench Toast | 11 | 50's Dining | 480 | 400 | 950 | 5 | 2000 | 1050 | 110 | 5 | 666 | 5 |
| 295 | Paincakes | 11 | 50's Dining | 1440 | 635 | 2250 | 6 | 3810 | 1560 | 140 | 5 | 667 | 5 |
| 296 | Rootbeard Float | 11 | 50's Dining | 30 | 120 | 200 | 6 | 720 | 520 | 11 | 5 | 667 | 5 |
| 297 | Soiled Ham | 19 | Victorian Practical Cookery | 360 | 380 | 720 | 3 | 1140 | 420 | 70 | 5 | 687 | 5 |
| 298 | Jack the Kipper | 19 | Victorian Practical Cookery | 330 | 330 | 830 | 5 | 1650 | 820 | 85 | 5 | 687 | 5 |
| 299 | Thigh Tea | 19 | Victorian Practical Cookery | 20 | 200 | 300 | 4 | 800 | 500 | 16 | 5 | 688 | 5 |
| 300 | Sweeney Pie | 19 | Victorian Practical Cookery | 600 | 500 | 750 | 5 | 2500 | 1750 | 210 | 5 | 688 | 5 |
| 301 | Peter Pancakes | 19 | Victorian Practical Cookery | 1440 | 635 | 2250 | 6 | 3810 | 1560 | 140 | 5 | 689 | 5 |
| 302 | Broiled Kidneys | 19 | Victorian Practical Cookery | 30 | 120 | 200 | 6 | 720 | 520 | 11 | 5 | 689 | 5 |
| 303 | Spaghetti Western | 20 | Celebrity Catering | 30 | 120 | 200 | 6 | 720 | 520 | 11 | 5 | 706 | 5 |
| 304 | The Fish Element | 20 | Celebrity Catering | 1440 | 635 | 2250 | 6 | 3810 | 1560 | 140 | 5 | 706 | 5 |
| 305 | Jurassic Pork | 20 | Celebrity Catering | 60 | 120 | 600 | 6 | 720 | 120 | 40 | 5 | 707 | 5 |
| 306 | Braisedheart | 20 | Celebrity Catering | 720 | 430 | 1850 | 6 | 2580 | 730 | 110 | 5 | 707 | 5 |
| 307 | Men in Black Bean Sauce | 20 | Celebrity Catering | 180 | 250 | 1100 | 6 | 1500 | 400 | 60 | 5 | 708 | 5 |
| 308 | Lethal Bacon | 20 | Celebrity Catering | 360 | 380 | 720 | 3 | 1140 | 420 | 70 | 5 | 708 | 5 |
| 309 | Rock & a Hard Plaice | 21 | Dark Side of the Spoon | 180 | 220 | 300 | 4 | 880 | 580 | 40 | 5 | 715 | 5 |
| 310 | Rock Lobster | 21 | Dark Side of the Spoon | 1200 | 360 | 2500 | 8 | 2880 | 380 | 145 | 5 | 715 | 5 |
| 311 | Vanilla Rice | 21 | Dark Side of the Spoon | 450 | 400 | 700 | 5 | 2000 | 1300 | 150 | 5 | 716 | 5 |
| 312 | Buns n' Roses | 21 | Dark Side of the Spoon | 1440 | 850 | 1900 | 3 | 2550 | 650 | 120 | 5 | 716 | 5 |
| 313 | Motley Bru | 21 | Dark Side of the Spoon | 1000 | 650 | 1300 | 4 | 2600 | 1300 | 130 | 5 | 717 | 5 |
| 314 | Voodoo Chilli | 21 | Dark Side of the Spoon | 600 | 300 | 800 | 5 | 1500 | 700 | 150 | 5 | 717 | 5 |
| 315 | Fried Abomination Of The Deep | 38 | Raid | 720 | 400 | 2000 | 7 | 2800 | 800 | 200 | 1 |  | 5 |
| 316 | Poo-tine | 39 | Raid | 30 | 180 | 500 | 8 | 1440 | 940 | 100 | 1 |  | 5 |
| 317 | Brain Poke | 6 | Tiki | 300 | 1010 | 925 | 2 | 2020 | 1095 | 80 | 7 |  | 5 |
| 318 | Fallout Poi | 6 | Pirate | 720 | 700 | 1 | 10 | 7000 | 6999 | 120 | 0 | 1284 | 5 |
| 319 | Pina Collider | 6 | Favorites | 480 | 500 | 5 | 16 | 8000 | 7995 | 150 | 12 |  | 20 |

**Android vs iOS** for the 216 shared rows: identical except these (rows 203–215 were reordered, and two rows were renamed):

| id | Dish | Field | Android | iOS |
|---|---|---|---|---|
| 78 | Chicken Fried Snake | cost | 850 | 2400 |
| 86 | Frozen T-Oort Cloud | cost | 1000 | 900 |
| 124 | Red Eye Gratin | cost | 2800 | 1100 |
| 144 | Scissors Salad | xp | 88 | 600 |
| 193 | Staked Steak | cost | 200 | 185 |
| 193 | Staked Steak | time | 15 | 130 |
| 193 | Staked Steak | serv | 110 | 200 |
| 197 | Garlic Choke | cost | 500 | 150 |
| 197 | Garlic Choke | time | 450 | 200 |
| 197 | Garlic Choke | serv | 300 | 320 |

Patterns worth copying (derived from the table):
- Margins are thin and cook times long. Across the 97 General-book dishes, net profit per cook has a median of about 1.0 × cost (10th–90th percentile 0.2–1.8 ×; one dish loses money). XP per hour falls steeply with cook length: dishes of 5–18 min give 60–220 XP/h, the 2-min starter gives 30 XP/h, and 12–72-h dishes give about 3–4 XP/h.
- Short dishes are an XP engine; long dishes exist so a stove is busy while the player is away.

---

## 2. Characters (customers, zombies, chefs)

### 2.1 Fields [code]

These come from `ZombieCafe::initData` and the `CharacterData` constructor. The stat byte offsets were matched to the code that reads them:

| Field | Meaning | Evidence |
|---|---|---|
| Lv | Café level before this customer can appear (255 = never a customer) | data; matches doc 06/08 levels |
| Stars min | Minimum star rating. Android stores it as ×51 (51 = 1★); iOS stores whole stars | data |
| Weight | Spawn weight in the random-customer pick; 0 = never spawns | read only by `Cafe::getDataForRandomCustomer` |
| Energy | Max energy = HP in raids | data |
| Spd | Walk speed 1–12. Speed multiplier = 2 + 0.2 × Spd (doc 10 §3.1) | `getSpeedMultiplier` |
| Str | Attack strength | `AttackTask`, `GuardTask` |
| Tips | Tip rating when serving | `ServeTask`, `advanceTime` |
| Raid stat | 4th stat byte. Read only in `GameStateRaid::init`; meaning unknown [inf: attack rate] | — |
| Focus | Resistance to daydreaming and work interruptions | `tickZombieWorkInterruptions`, daydream |
| Patience | Read by `CharacterInstance::isRestless`; higher = calmer [inf] | — |
| F | Female (picks the voice set) | data |
| Infect cost | Price to infect (T = toxin) | `completeInfectPurchase` |
| Tip ×, Regen ×, Cook ×, Cook XP × | Bonus multipliers. They match the UI labels "Tip Multiplier", "Zombie Regen", "Cook Speed" and "Cook XP" on character cards, and are mostly used by chef avatars and late customers | strings 515–518 |
| Theme | Customer theme set. Themed customers come only with their stove/cookbook theme (e.g. the Mafia set needs the pizza ovens) [inf] | data |

Stat scale: 1–10 in the base game, up to 12 for late-iOS characters. Typical customer: Energy 100, Spd 4, Str 4, Tips 3, Focus/Patience 5. Infect results:
- a new zombie starts at **20 energy** (`InfectTask_ZOMBIE_START_ENERGY`);
- zombie level-ups multiply max energy by **1.03 each** (§4.2).

### 2.2 Customer table (iOS, 225 spawnable rows) [data]

| id | Customer (ref only) | Lv | Stars min | Weight | Energy | Spd | Str | Tips | Raid stat | Focus | Patience | F | Infect cost | Tip x | Regen x | Cook x | Cook XP x |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 | Man | 0 | 0 | 8 | 100 | 4 | 4 | 3 | 3 | 5 | 5 |  | free | 1 | 1 | 1 | 1 |
| 1 | Senior | 0 | 0 | 4 | 100 | 4 | 4 | 3 | 3 | 5 | 5 |  | free | 1 | 1 | 1 | 1 |
| 2 | Woman | 0 | 0 | 10 | 100 | 4 | 4 | 3 | 3 | 5 | 5 | F | free | 1 | 1 | 1 | 1 |
| 3 | Hipster | 0 | 0 | 8 | 100 | 4 | 4 | 3 | 3 | 5 | 5 |  | free | 1 | 1 | 1 | 1 |
| 4 | Cashier | 0 | 0 | 10 | 100 | 4 | 4 | 3 | 3 | 5 | 5 | F | free | 1 | 1 | 1 | 1 |
| 5 | Couch Potato | 0 | 0 | 3 | 100 | 4 | 4 | 3 | 3 | 4 | 4 |  | free | 1 | 1 | 1 | 1 |
| 6 | Couch Potato | 0 | 0 | 2 | 100 | 4 | 4 | 3 | 3 | 4 | 4 | F | free | 1 | 1 | 1 | 1 |
| 7 | Telemarketer | 0 | 2 | 3 | 100 | 3 | 4 | 5 | 3 | 5 | 5 |  | free | 1 | 1 | 1 | 1 |
| 8 | Telemarketer | 0 | 0 | 5 | 100 | 3 | 4 | 5 | 3 | 5 | 5 | F | free | 1 | 1 | 1 | 1 |
| 9 | Teacher | 0 | 0 | 2 | 100 | 4 | 3 | 3 | 3 | 6 | 6 |  | free | 1 | 1 | 1 | 1 |
| 10 | Teacher | 0 | 0 | 5 | 100 | 4 | 3 | 3 | 3 | 6 | 6 | F | free | 1 | 1 | 1 | 1 |
| 11 | Accountant | 0 | 0 | 5 | 100 | 4 | 4 | 2 | 3 | 6 | 6 |  | free | 1 | 1 | 1 | 1 |
| 12 | Yoga Instructor | 0 | 1 | 3 | 100 | 4 | 5 | 3 | 5 | 4 | 4 | F | free | 1 | 1 | 1 | 1 |
| 13 | Businessman | 0 | 0 | 5 | 100 | 4 | 3 | 4 | 3 | 4 | 6 |  | free | 1 | 1 | 1 | 1 |
| 14 | Businessman | 0 | 0 | 5 | 90 | 4 | 3 | 4 | 3 | 4 | 6 |  | free | 1 | 1 | 1 | 1 |
| 15 | Businesswoman | 0 | 0 | 10 | 90 | 4 | 3 | 4 | 3 | 4 | 6 | F | free | 1 | 1 | 1 | 1 |
| 16 | Politician | 6 | 2 | 5 | 90 | 4 | 3 | 5 | 3 | 6 | 6 |  | $100 | 1 | 1 | 1 | 1 |
| 17 | Politician | 2 | 1 | 5 | 90 | 4 | 3 | 5 | 3 | 6 | 6 | F | $100 | 1 | 1 | 1 | 1 |
| 18 | Executive | 9 | 3 | 4 | 90 | 4 | 3 | 7 | 3 | 8 | 8 |  | $750 | 1 | 1 | 1 | 1 |
| 19 | Executive | 9 | 3 | 4 | 90 | 4 | 3 | 7 | 3 | 8 | 8 | F | $750 | 1 | 1 | 1 | 1 |
| 20 | CEO | 12 | 4 | 3 | 90 | 4 | 3 | 10 | 3 | 8 | 6 |  | $1500 | 1 | 1 | 1 | 1 |
| 21 | CEO | 12 | 4 | 3 | 90 | 4 | 3 | 10 | 3 | 8 | 6 | F | $1500 | 1 | 1 | 1 | 1 |
| 22 | Retiree | 0 | 0 | 4 | 70 | 1 | 2 | 6 | 3 | 2 | 10 |  | free | 1 | 1 | 1 | 1 |
| 23 | Retiree | 0 | 0 | 7 | 70 | 1 | 2 | 6 | 3 | 2 | 10 | F | free | 1 | 1 | 1 | 1 |
| 24 | Veteran | 0 | 1 | 4 | 100 | 2 | 6 | 6 | 4 | 4 | 6 |  | $100 | 1 | 1 | 1 | 1 |
| 25 | Centenarian | 6 | 2 | 1 | 50 | 1 | 2 | 6 | 1 | 2 | 10 |  | free | 1 | 1 | 1 | 1 |
| 26 | Teenager | 0 | 0 | 5 | 85 | 7 | 4 | 1 | 6 | 2 | 2 |  | free | 1 | 1 | 1 | 1 |
| 27 | Punk | 7 | 1 | 6 | 85 | 8 | 5 | 1 | 6 | 6 | 2 |  | $500 | 1 | 1 | 1 | 1 |
| 28 | Underachiever | 0 | 1 | 4 | 80 | 5 | 4 | 1 | 6 | 1 | 2 |  | free | 1 | 1 | 1 | 1 |
| 29 | Class Clown | 11 | 2 | 2 | 90 | 7 | 4 | 6 | 6 | 6 | 2 |  | $750 | 1 | 1 | 1 | 1 |
| 30 | Nerd | 2 | 0 | 8 | 65 | 7 | 2 | 4 | 1 | 9 | 9 |  | $200 | 1 | 1 | 1 | 1 |
| 31 | Mathlete | 2 | 1 | 3 | 65 | 9 | 4 | 3 | 1 | 9 | 6 |  | $750 | 1 | 1 | 1 | 1 |
| 32 | CIO | 10 | 2 | 1 | 75 | 8 | 3 | 8 | 1 | 6 | 1 |  | $1500 | 1 | 1 | 1 | 1 |
| 33 | Construction Worker | 3 | 0 | 5 | 140 | 3 | 9 | 1 | 2 | 3 | 2 |  | $250 | 1 | 1 | 1 | 1 |
| 34 | Engineer | 4 | 2 | 5 | 140 | 3 | 7 | 2 | 2 | 7 | 2 |  | $500 | 1 | 1 | 1 | 1 |
| 35 | Foreman | 7 | 3 | 3 | 150 | 4 | 8 | 3 | 2 | 6 | 3 |  | $1500 | 1 | 1 | 1 | 1 |
| 36 | Cop | 5 | 0 | 7 | 140 | 6 | 7 | 2 | 3 | 7 | 9 |  | T1 | 1 | 1 | 1 | 1 |
| 37 | Traffic Cop | 10 | 0 | 2 | 140 | 5 | 6 | 3 | 3 | 10 | 10 |  | T1 | 1 | 1 | 1 | 1 |
| 38 | Sergeant | 7 | 2 | 3 | 150 | 5 | 8 | 7 | 3 | 8 | 10 |  | T10 | 1 | 1 | 1 | 1 |
| 39 | Local Hero | 8 | 3 | 1 | 160 | 6 | 7 | 6 | 3 | 8 | 10 |  | T10 | 1 | 1 | 1 | 1 |
| 40 | Boxer | 7 | 1 | 6 | 225 | 7 | 9 | 1 | 6 | 1 | 1 |  | T15 | 1 | 1 | 1 | 1 |
| 41 | Has-been | 15 | 0 | 2 | 150 | 5 | 7 | 2 | 3 | 2 | 1 |  | T1 | 1 | 1 | 1 | 1 |
| 42 | The Champ | 7 | 3 | 1 | 250 | 8 | 10 | 6 | 7 | 2 | 1 |  | T20 | 1 | 1 | 1 | 1 |
| 43 | Football Player | 3 | 1 | 8 | 160 | 7 | 7 | 1 | 9 | 1 | 1 |  | T10 | 1 | 1 | 1 | 1 |
| 44 | Benchwarmer | 15 | 0 | 3 | 130 | 5 | 5 | 1 | 9 | 1 | 1 |  | T1 | 1 | 1 | 1 | 1 |
| 45 | Star Player | 7 | 3 | 2 | 180 | 9 | 8 | 3 | 9 | 5 | 3 |  | T15 | 1 | 1 | 1 | 1 |
| 46 | Clown | 8 | 1 | 5 | 110 | 5 | 5 | 10 | 1 | 7 | 5 |  | T8 | 1 | 1 | 1 | 1 |
| 47 | Stoogey the Clown | 8 | 0 | 1 | 130 | 9 | 5 | 10 | 1 | 1 | 1 |  | T12 | 1 | 1 | 1 | 1 |
| 48 | Fire Fighter | 9 | 0 | 7 | 120 | 6 | 7 | 4 | 6 | 5 | 2 |  | $750 | 1 | 1 | 1 | 1 |
| 49 | Fire Chief | 10 | 3 | 2 | 140 | 5 | 8 | 6 | 8 | 6 | 3 |  | $1800 | 1 | 1 | 1 | 1 |
| 50 | Sumo Wrestler | 8 | 2 | 4 | 400 | 5 | 10 | 1 | 7 | 3 | 10 |  | T30 | 1 | 1 | 1 | 1 |
| 51 | Celebrity | 10 | 2 | 7 | 80 | 7 | 4 | 9 | 8 | 3 | 3 | F | T5 | 1 | 1 | 1 | 1 |
| 52 | Supermodel | 12 | 3 | 2 | 80 | 10 | 4 | 8 | 10 | 3 | 3 | F | T10 | 1 | 1 | 1 | 1 |
| 53 | Movie Star | 12 | 4 | 2 | 100 | 8 | 5 | 10 | 5 | 7 | 5 | F | T15 | 1 | 1 | 1 | 1 |
| 80 | Reality Star | 15 | 1 | 4 | 80 | 6 | 4 | 8 | 8 | 1 | 1 | F | T1 | 1 | 1 | 1 | 1 |
| 81 | Mikazuna | 12 | 3 | 3 | 625 | 6 | 10 | 6 | 7 | 7 | 10 |  | T50 | 1 | 1 | 1 | 1 |
| 82 | Yokozuna | 12 | 3 | 2 | 625 | 6 | 10 | 6 | 7 | 7 | 10 |  | T50 | 1 | 1 | 1 | 1 |
| 83 | Retro-Boxer | 15 | 1 | 6 | 180 | 8 | 8 | 1 | 6 | 1 | 1 |  | T12 | 1 | 1 | 1 | 1 |
| 84 | Middleweight | 15 | 1 | 6 | 180 | 8 | 8 | 1 | 6 | 1 | 1 |  | T12 | 1 | 1 | 1 | 1 |
| 86 | Veteran Cop | 15 | 0 | 7 | 125 | 6 | 7 | 6 | 3 | 7 | 9 |  | T1 | 1 | 1 | 1 | 1 |
| 117 | Private | 0 | 1 | 2 | 100 | 5 | 5 | 2 | 3 | 5 | 7 |  | $600 | 1 | 1 | 1 | 1 |
| 118 | Colonel | 7 | 1 | 3 | 120 | 6 | 6 | 2 | 3 | 5 | 7 |  | $1000 | 1 | 1 | 1 | 1 |
| 119 | Corporal | 9 | 1 | 4 | 150 | 6 | 8 | 2 | 3 | 5 | 7 |  | $2000 | 1 | 1 | 1 | 1 |
| 120 | Old Hippie | 4 | 1 | 2 | 80 | 2 | 4 | 5 | 3 | 2 | 7 |  | $400 | 1 | 1 | 1 | 1 |
| 121 | Young Male Hippie | 6 | 1 | 4 | 100 | 3 | 4 | 5 | 3 | 2 | 7 |  | $800 | 1 | 1 | 1 | 1 |
| 122 | Young Female Hippie | 8 | 1 | 4 | 100 | 3 | 4 | 5 | 3 | 2 | 7 | F | $1500 | 1 | 1 | 1 | 1 |
| 132 | Mummy | 5 | 1 | 2 | 120 | 2 | 4 | 5 | 3 | 2 | 7 | F | $1000 | 1 | 1 | 1 | 1 |
| 133 | Mummy | 6 | 1 | 2 | 120 | 2 | 4 | 5 | 3 | 2 | 7 |  | $1000 | 1 | 1 | 1 | 1 |
| 134 | Witch | 7 | 2 | 5 | 180 | 6 | 8 | 2 | 3 | 5 | 7 | F | T10 | 1 | 1 | 1 | 1 |
| 135 | Werewolf | 8 | 3 | 5 | 250 | 8 | 5 | 10 | 5 | 5 | 5 |  | T20 | 1 | 1 | 1 | 1 |
| 139 | Martian Scientist | 7 | 4 | 7 | 250 | 8 | 5 | 5 | 5 | 10 | 7 |  | $35000 | 1 | 1 | 1 | 1.2 |
| 140 | Martian Soldier | 7 | 3 | 2 | 650 | 8 | 10 | 6 | 5 | 5 | 5 |  | T30 | 1 | 1 | 1 | 1 |
| 141 | Martian Commander | 7 | 3 | 1 | 700 | 7 | 6 | 10 | 5 | 5 | 7 |  | T30 | 2 | 1 | 1 | 1 |
| 142 | Martian Doctor | 8 | 3 | 6 | 250 | 5 | 5 | 7 | 6 | 7 | 10 |  | $30000 | 1 | 1.2 | 1 | 1 |
| 149 | Cowboy | 11 | 2 | 7 | 500 | 7 | 6 | 8 | 5 | 10 | 5 |  | T30 | 1 | 1.1 | 1 | 1 |
| 150 | Steam Punk Professor | 11 | 2 | 7 | 600 | 7 | 6 | 8 | 6 | 9 | 6 |  | T30 | 2 | 1.1 | 1 | 1 |
| 151 | Steam Punk Lord | 11 | 2 | 6 | 500 | 6 | 5 | 6 | 5 | 9 | 8 |  | $97500 | 1 | 1 | 1 | 1.2 |
| 153 | Black Ninja | 15 | 3 | 6 | 250 | 8 | 5 | 5 | 5 | 10 | 7 |  | $50000 | 1 | 1 | 1 | 1.2 |
| 154 | Blue Ninja | 15 | 3 | 3 | 650 | 8 | 10 | 6 | 5 | 5 | 5 |  | T25 | 1 | 1 | 1 | 1 |
| 155 | Brown Ninja | 14 | 3 | 2 | 700 | 7 | 6 | 10 | 5 | 5 | 8 |  | T30 | 2 | 1 | 1 | 1 |
| 156 | Green Ninja | 7 | 3 | 5 | 250 | 5 | 5 | 7 | 6 | 7 | 10 |  | $25000 | 1 | 1.2 | 1 | 1 |
| 157 | Red Ninja | 15 | 3 | 3 | 700 | 7 | 6 | 10 | 5 | 6 | 7 |  | T30 | 2 | 1 | 1 | 1 |
| 159 | East Coast Rap Artist | 7 | 3 | 7 | 250 | 8 | 10 | 6 | 7 | 2 | 1 |  | T20 | 1 | 1 | 1 | 1 |
| 160 | East Coast DJ | 7 | 3 | 5 | 180 | 9 | 8 | 3 | 9 | 5 | 3 |  | T15 | 1 | 1 | 1 | 1 |
| 161 | West Coast DJ | 8 | 2 | 8 | 400 | 5 | 10 | 1 | 7 | 3 | 10 |  | T30 | 1 | 1 | 1 | 1 |
| 162 | West Coast Rap Artist | 7 | 3 | 7 | 250 | 8 | 10 | 6 | 7 | 2 | 1 |  | T20 | 1 | 1 | 1 | 1 |
| 167 | Mafia Goon | 15 | 1 | 8 | 800 | 9 | 10 | 1 | 8 | 1 | 1 |  | T50 | 2 | 1.3 | 1 | 1 |
| 168 | NY Sports Fan | 6 | 1 | 6 | 250 | 7 | 7 | 3 | 6 | 3 | 5 |  | T20 | 2 | 1.2 | 1 | 1 |
| 169 | Godfather | 15 | 4 | 5 | 500 | 5 | 6 | 10 | 5 | 8 | 8 |  | T50 | 3 | 1.2 | 1 | 1 |
| 170 | Ditzy Mafia Girl | 14 | 3 | 6 | 250 | 6 | 5 | 8 | 6 | 5 | 8 | F | T15 | 3 | 1.1 | 1 | 1 |
| 173 | Politician | 16 | 4 | 3 | 800 | 6 | 7 | 4 | 6 | 3 | 4 |  | T50 | 2 | 1.3 | 1 | 1 |
| 174 | Candidate | 16 | 4 | 5 | 250 | 7 | 7 | 3 | 5 | 3 | 5 |  | T50 | 2 | 1.3 | 1 | 1 |
| 175 | Governor | 16 | 2 | 4 | 500 | 5 | 3 | 9 | 4 | 8 | 1 | F | T15 | 3 | 1.2 | 1 | 1 |
| 176 | Ex-Governor | 16 | 3 | 4 | 250 | 4 | 9 | 9 | 7 | 2 | 9 |  | T20 | 3 | 1.5 | 1 | 1 |
| 178 | Skeleton Bride | 5 | 2 | 5 | 700 | 7 | 8 | 4 | 5 | 3 | 3 | F | T40 | 2 | 1.3 | 1 | 1 |
| 179 | Skeleton Groom | 5 | 2 | 5 | 700 | 6 | 9 | 3 | 4 | 3 | 5 |  | T40 | 2 | 1.3 | 1 | 1 |
| 180 | Calavera de Catrina | 5 | 2 | 6 | 200 | 5 | 3 | 9 | 4 | 8 | 1 | F | $10000 | 3 | 1.2 | 1 | 1 |
| 183 | Fish Head Monster | 10 | 3 | 5 | 400 | 7 | 7 | 7 | 5 | 8 | 2 |  | T40 | 3 | 1.2 | 1 | 1 |
| 184 | Dr. Mantis Face | 10 | 3 | 4 | 400 | 5 | 7 | 8 | 3 | 8 | 3 |  | T30 | 2 | 1.1 | 1.15 | 1.15 |
| 185 | Mr. ? | 9 | 3 | 5 | 350 | 6 | 5 | 7 | 5 | 8 | 2 |  | T20 | 2 | 1.2 | 1 | 1 |
| 186 | Pink Retro Robot | 9 | 3 | 4 | 250 | 3 | 8 | 8 | 5 | 5 | 4 |  | $75000 | 1 | 1.2 | 1 | 1 |
| 187 | Blue Retro Robot | 10 | 3 | 6 | 800 | 3 | 10 | 8 | 5 | 5 | 4 |  | T50 | 2 | 1.2 | 1 | 1 |
| 189 | Knight in Armor | 8 | 1 | 6 | 350 | 3 | 7 | 6 | 4 | 5 | 7 |  | $95000 | 1 | 1.3 | 1 | 1 |
| 190 | Executioner | 8 | 1 | 4 | 250 | 4 | 6 | 4 | 6 | 2 | 8 |  | $20000 | 2 | 1.1 | 1 | 1 |
| 191 | Wizard | 8 | 2 | 4 | 400 | 5 | 8 | 3 | 5 | 6 | 3 |  | T30 | 2 | 1.3 | 1 | 1 |
| 192 | Mighty King | 8 | 4 | 7 | 700 | 8 | 7 | 6 | 4 | 2 | 3 |  | T40 | 3 | 1.1 | 1 | 1 |
| 193 | Dragon | 8 | 3 | 6 | 1000 | 7 | 10 | 2 | 2 | 1 | 8 |  | T50 | 1 | 1.3 | 1 | 1 |
| 194 | Evil Queen | 8 | 4 | 7 | 700 | 7 | 9 | 3 | 7 | 2 | 2 | F | T40 | 1 | 1.1 | 1 | 1 |
| 195 | Female Captain | 11 | 3 | 6 | 650 | 8 | 6 | 6 | 7 | 5 | 4 | F | T35 | 3 | 1.1 | 1 | 1 |
| 196 | Marooner | 11 | 1 | 2 | 200 | 3 | 5 | 2 | 3 | 2 | 3 |  | $15000 | 1 | 1.1 | 1 | 1 |
| 197 | Undead Skeleton Pirate | 11 | 3 | 6 | 900 | 8 | 10 | 3 | 5 | 5 | 3 |  | T50 | 1 | 1.3 | 1 | 1 |
| 198 | Shipmate | 11 | 2 | 6 | 350 | 6 | 4 | 3 | 4 | 4 | 4 |  | $45000 | 1 | 1.3 | 1 | 1 |
| 199 | Conquistador | 11 | 3 | 5 | 700 | 8 | 7 | 5 | 6 | 6 | 8 |  | T40 | 2 | 1.2 | 1 | 1 |
| 201 | Vampire Bride | 12 | 3 | 7 | 700 | 9 | 9 | 8 | 5 | 5 | 4 | F | T45 | 2 | 1.3 | 1 | 1 |
| 202 | Nosferatu | 9 | 3 | 5 | 300 | 3 | 7 | 4 | 6 | 5 | 6 |  | $20000 | 1 | 1.3 | 1 | 1 |
| 203 | Pure Blood | 10 | 4 | 6 | 650 | 7 | 7 | 8 | 4 | 4 | 4 |  | T35 | 2 | 1.4 | 1 | 1 |
| 204 | Vampire Hunter | 12 | 3 | 6 | 850 | 10 | 9 | 6 | 7 | 6 | 5 |  | T50 | 1 | 1.1 | 1 | 1 |
| 205 | Vampire Ghoul | 13 | 3 | 6 | 1000 | 9 | 10 | 3 | 4 | 2 | 1 |  | T60 | 1 | 1.3 | 1 | 1 |
| 206 | Goth | 6 | 1 | 7 | 300 | 6 | 5 | 9 | 4 | 8 | 4 | F | T15 | 3 | 1.3 | 1 | 1 |
| 208 | Break-fast | 12 | 3 | 5 | 550 | 10 | 5 | 8 | 10 | 8 | 6 |  | T40 | 2 | 1.2 | 1 | 1.2 |
| 209 | Shadow Skull | 12 | 3 | 6 | 750 | 6 | 9 | 4 | 6 | 9 | 4 |  | T40 | 1 | 1.2 | 1 | 1 |
| 210 | Supper girl | 6 | 2 | 7 | 500 | 9 | 4 | 10 | 9 | 8 | 9 | F | T35 | 3 | 1.2 | 1 | 1.2 |
| 211 | Zombie Man | 14 | 3 | 8 | 1000 | 9 | 9 | 9 | 9 | 9 | 10 |  | T60 | 2 | 1.4 | 1 | 1.1 |
| 212 | Dr. Hoboken | 13 | 3 | 3 | 950 | 9 | 10 | 4 | 6 | 10 | 5 |  | T50 | 1 | 1.3 | 1 | 1 |
| 213 | Galacticus | 13 | 3 | 4 | 975 | 10 | 9 | 6 | 4 | 9 | 4 |  | T50 | 1 | 1.3 | 1 | 1 |
| 214 | Henchman | 10 | 2 | 5 | 450 | 5 | 7 | 3 | 6 | 3 | 2 |  | $100000 | 1 | 1 | 1 | 1 |
| 215 | Surgeon | 9 | 2 | 7 | 180 | 4 | 4 | 3 | 8 | 8 | 7 |  | $8000 | 1 | 1.3 | 1 | 1 |
| 216 | Nurse | 5 | 1 | 7 | 170 | 4 | 4 | 5 | 6 | 6 | 6 | F | $7000 | 2 | 1.3 | 1 | 1 |
| 217 | Undertaker | 6 | 2 | 7 | 275 | 5 | 7 | 1 | 4 | 6 | 5 |  | T20 | 1 | 1.2 | 1 | 1 |
| 218 | Farmer | 5 | 1 | 7 | 160 | 3 | 7 | 3 | 3 | 5 | 5 |  | $10000 | 1 | 1 | 1.11 | 1.11 |
| 219 | Army General | 10 | 4 | 7 | 750 | 7 | 9 | 6 | 6 | 8 | 4 |  | T45 | 1 | 1.1 | 1 | 1 |
| 220 | Party Animal | 5 | 2 | 7 | 250 | 7 | 5 | 8 | 7 | 2 | 2 |  | T20 | 2 | 1.1 | 1 | 1 |
| 221 | Metal Head | 9 | 2 | 7 | 450 | 7 | 6 | 8 | 5 | 2 | 4 |  | T25 | 1 | 1.1 | 1 | 1 |
| 222 | Wrestler | 9 | 3 | 7 | 700 | 8 | 9 | 7 | 8 | 4 | 4 |  | T40 | 1 | 1.2 | 1 | 1 |
| 224 | Gold Retro Robot | 60 | 5 | 3 | 550 | 3 | 8 | 6 | 4 | 3 | 7 |  | $6000000 | 1 | 1.3 | 1 | 1 |
| 225 | Black Knight | 50 | 5 | 3 | 500 | 3 | 7 | 6 | 4 | 3 | 7 |  | $2000000 | 1 | 1.3 | 1 | 1 |
| 226 | Major | 8 | 3 | 7 | 700 | 6 | 9 | 5 | 5 | 8 | 5 |  | T35 | 1 | 1.2 | 1 | 1 |
| 227 | Magician | 13 | 3 | 7 | 400 | 7 | 6 | 8 | 6 | 7 | 3 |  | T30 | 1 | 1.2 | 1 | 1 |
| 228 | Cheerleader | 6 | 1 | 7 | 300 | 7 | 5 | 9 | 7 | 8 | 7 | F | T15 | 1 | 1.2 | 1 | 1 |
| 229 | Boat Captain | 14 | 3 | 7 | 700 | 8 | 8 | 9 | 6 | 6 | 6 |  | T45 | 1 | 1.1 | 1 | 1 |
| 230 | Anubis | 12 | 2 | 7 | 900 | 9 | 9 | 3 | 4 | 5 | 5 |  | T50 | 1 | 1.3 | 1 | 1 |
| 231 | Bastet | 12 | 2 | 7 | 450 | 7 | 5 | 5 | 6 | 3 | 2 | F | $80000 | 1 | 1 | 1 | 1 |
| 232 | Horus | 12 | 3 | 7 | 700 | 9 | 6 | 6 | 7 | 6 | 6 |  | T30 | 1 | 1.1 | 1 | 1 |
| 233 | Cleopatra | 12 | 3 | 7 | 900 | 10 | 10 | 8 | 5 | 5 | 6 | F | T60 | 2 | 1.1 | 1 | 1.2 |
| 234 | The Pharaoh | 12 | 3 | 7 | 700 | 8 | 8 | 7 | 6 | 7 | 8 |  | T40 | 3 | 1.2 | 1 | 1.1 |
| 235 | Al Capone | 15 | 3 | 7 | 900 | 10 | 10 | 4 | 6 | 5 | 3 |  | T60 | 2 | 1.2 | 1 | 1.2 |
| 236 | Eliot Ness | 15 | 3 | 7 | 625 | 8 | 9 | 7 | 4 | 8 | 7 |  | T40 | 3 | 1.2 | 1 | 1.1 |
| 238 | Cyclop | 17 | 3 | 7 | 950 | 8 | 10 | 2 | 5 | 3 | 3 |  | T50 | 1 | 1.2 | 1 | 1 |
| 239 | Helen of Troy | 17 | 4 | 7 | 400 | 8 | 4 | 8 | 5 | 7 | 5 | F | $100000 | 1 | 1.1 | 1 | 1.2 |
| 240 | Medusa | 17 | 4 | 7 | 1000 | 10 | 9 | 4 | 8 | 8 | 4 | F | T60 | 1 | 1.3 | 1 | 1 |
| 241 | Minotaur | 17 | 3 | 7 | 800 | 6 | 9 | 5 | 7 | 8 | 1 |  | T45 | 1 | 1.2 | 1 | 1 |
| 242 | Mr. Nukes | 18 | 3 | 7 | 750 | 8 | 8 | 5 | 8 | 7 | 6 |  | T40 | 1 | 1.2 | 1.3 | 1.3 |
| 243 | Super Templar | 18 | 4 | 7 | 1000 | 10 | 10 | 4 | 6 | 5 | 4 |  | T65 | 1 | 1.3 | 1 | 1 |
| 244 | Magma Man | 18 | 3 | 7 | 450 | 2 | 8 | 3 | 5 | 6 | 5 |  | $150000 | 1 | 1.2 | 1.2 | 1.2 |
| 245 | The Zombot | 18 | 4 | 7 | 950 | 8 | 10 | 6 | 4 | 9 | 7 |  | T50 | 1 | 1.2 | 1.3 | 1.3 |
| 246 | Violet Fox | 18 | 3 | 7 | 900 | 9 | 9 | 7 | 10 | 6 | 4 | F | T50 | 1 | 1.2 | 1 | 1 |
| 248 | Cuttle Girl | 18 | 4 | 7 | 700 | 7 | 8 | 6 | 8 | 5 | 3 | F | T35 | 1 | 1.2 | 1 | 1.3 |
| 249 | Draculette | 13 | 4 | 7 | 1000 | 11 | 8 | 9 | 10 | 7 | 4 | F | T65 | 1 | 1.5 | 1 | 1 |
| 250 | Prince Vlad | 13 | 4 | 7 | 1000 | 8 | 11 | 7 | 6 | 5 | 3 |  | T65 | 1 | 1.5 | 1 | 1 |
| 252 | Alice | 12 | 2 | 7 | 1000 | 10 | 7 | 9 | 4 | 9 | 4 | F | T50 | 1 | 1.2 | 1 | 1 |
| 253 | White Rabbit | 13 | 4 | 7 | 700 | 10 | 4 | 8 | 10 | 5 | 8 |  | T40 | 1 | 1.3 | 1 | 1 |
| 254 | Queen of hearts | 14 | 3 | 7 | 900 | 10 | 10 | 5 | 7 | 6 | 5 | F | T60 | 1 | 1.3 | 1 | 1 |
| 255 | Mad Hatter | 14 | 3 | 7 | 1100 | 8 | 10 | 9 | 5 | 3 | 4 |  | T65 | 1 | 1.6 | 1 | 1 |
| 256 | Red Guard | 14 | 3 | 7 | 650 | 7 | 8 | 3 | 7 | 8 | 6 |  | T30 | 1 | 1.1 | 1 | 1 |
| 257 | Black Guard | 14 | 3 | 7 | 450 | 6 | 7 | 2 | 4 | 7 | 2 |  | $200000 | 1 | 1 | 1 | 1 |
| 258 | Undead Skeleton | 9 | 3 | 7 | 450 | 3 | 8 | 2 | 4 | 8 | 8 |  | $175000 | 1 | 1.1 | 1 | 1.1 |
| 259 | Jack'O | 7 | 3 | 7 | 900 | 9 | 10 | 7 | 7 | 6 | 2 |  | T50 | 1 | 1.3 | 1 | 1.3 |
| 260 | Scarecrow | 6 | 3 | 7 | 700 | 6 | 9 | 5 | 5 | 8 | 5 |  | T35 | 1 | 1.2 | 1 | 1.2 |
| 261 | Slimmer Man | 9 | 4 | 7 | 1000 | 8 | 11 | 9 | 8 | 10 | 8 |  | T60 | 1 | 1.5 | 1 | 1.5 |
| 262 | Headless Horseman | 10 | 5 | 7 | 1200 | 7 | 10 | 3 | 8 | 5 | 3 |  | T65 | 1 | 1 | 1 | 1 |
| 263 | Will o' the Wisp | 8 | 4 | 7 | 800 | 10 | 8 | 5 | 7 | 8 | 4 |  | T45 | 1 | 1.2 | 1 | 1.2 |
| 264 | Blankey | 5 | 4 | 7 | 500 | 8 | 3 | 10 | 3 | 7 | 5 |  | T25 | 1 | 1.2 | 1 | 1.2 |
| 267 | Thor | 12 | 3 | 7 | 1000 | 7 | 12 | 6 | 8 | 7 | 4 |  | T65 | 1 | 1.4 | 1 | 1.1 |
| 268 | Loki | 12 | 4 | 7 | 1000 | 11 | 9 | 10 | 7 | 8 | 8 |  | T60 | 2 | 1.4 | 1 | 1.2 |
| 269 | Valkyrie | 11 | 2 | 7 | 950 | 8 | 10 | 7 | 8 | 5 | 6 | F | T50 | 1 | 1.4 | 1 | 1.2 |
| 270 | Polar Bear | 10 | 3 | 7 | 800 | 5 | 9 | 3 | 6 | 9 | 4 |  | T35 | 1 | 1.4 | 1 | 1 |
| 271 | Viking | 10 | 2 | 7 | 450 | 4 | 8 | 3 | 5 | 6 | 5 |  | $99000 | 1 | 1.2 | 1 | 1 |
| 272 | Gingerbread Man | 10 | 3 | 7 | 400 | 8 | 6 | 7 | 5 | 7 | 3 |  | T30 | 1 | 1 | 1.3 | 1 |
| 273 | Reindeer Man | 10 | 2 | 7 | 200 | 5 | 4 | 3 | 5 | 4 | 4 |  | $10000 | 1 | 1 | 1 | 1 |
| 274 | Elf Archer | 10 | 3 | 7 | 1000 | 11 | 9 | 9 | 8 | 8 | 8 |  | T60 | 1 | 1.3 | 1 | 1.3 |
| 275 | Orc Warrior | 12 | 3 | 7 | 1000 | 10 | 10 | 3 | 4 | 2 | 2 |  | T60 | 1 | 1.3 | 1 | 1.3 |
| 276 | Darklord | 13 | 4 | 7 | 1200 | 9 | 10 | 4 | 7 | 3 | 2 |  | T65 | 1 | 1.5 | 1 | 1.5 |
| 277 | Rogue | 10 | 2 | 7 | 1000 | 9 | 11 | 7 | 9 | 9 | 2 | F | T60 | 1 | 1.3 | 1 | 1.3 |
| 278 | Thunder Woman | 14 | 3 | 7 | 1000 | 12 | 8 | 8 | 7 | 7 | 8 | F | T65 | 1 | 1.3 | 1.2 | 1.2 |
| 279 | Amazing Amazon | 14 | 3 | 7 | 1000 | 8 | 12 | 7 | 10 | 8 | 7 | F | T65 | 1 | 1.5 | 1 | 1 |
| 280 | Iron Steel | 14 | 3 | 7 | 1250 | 9 | 10 | 5 | 4 | 6 | 6 |  | T65 | 1 | 1.4 | 1 | 1 |
| 281 | Biker | 12 | 1 | 7 | 1000 | 8 | 11 | 4 | 8 | 5 | 6 |  | T60 | 1 | 1.1 | 1 | 1 |
| 282 | Impersonator | 10 | 3 | 7 | 700 | 8 | 5 | 9 | 6 | 6 | 7 |  | T30 | 1 | 1.1 | 1 | 1.1 |
| 283 | Greaser | 8 | 1 | 7 | 900 | 9 | 10 | 6 | 8 | 5 | 3 |  | T50 | 1 | 1.1 | 1 | 1 |
| 284 | Starlet | 11 | 3 | 7 | 750 | 10 | 5 | 10 | 7 | 9 | 9 | F | T40 | 3 | 1.1 | 1 | 1.3 |
| 285 | Waitress | 5 | 1 | 7 | 500 | 8 | 3 | 9 | 9 | 8 | 9 | F | T25 | 2 | 1 | 1 | 1.3 |
| 286 | Hansel | 11 | 3 | 7 | 450 | 6 | 6 | 4 | 4 | 4 | 4 |  | $75000 | 1 | 1 | 1 | 1 |
| 287 | Gretel | 12 | 3 | 7 | 750 | 8 | 7 | 7 | 4 | 4 | 4 | F | T35 | 1 | 1.1 | 1 | 1.1 |
| 288 | Huntsman | 13 | 4 | 7 | 1200 | 10 | 10 | 5 | 5 | 6 | 4 |  | T75 | 1 | 1.2 | 1 | 1 |
| 289 | Little Red | 13 | 3 | 7 | 1200 | 11 | 9 | 9 | 8 | 6 | 6 | F | T75 | 2 | 1.2 | 1 | 1.2 |
| 290 | Granny Wolf | 13 | 5 | 7 | 1200 | 9 | 11 | 4 | 8 | 2 | 2 |  | T75 | 1 | 1.3 | 1 | 1 |
| 291 | Victorian Butler | 19 | 3 | 4 | 1250 | 9 | 11 | 6 | 7 | 7 | 7 |  | T80 | 2 | 1.3 | 1 | 1 |
| 292 | Lady of the Manor | 19 | 4 | 4 | 1250 | 10 | 9 | 9 | 8 | 6 | 6 | F | T80 | 2 | 1.3 | 1 | 1 |
| 293 | Sleuth | 19 | 5 | 1 | 1250 | 9 | 10 | 9 | 9 | 8 | 7 |  | T80 | 2 | 1.4 | 1 | 1.2 |
| 294 | Her Royal Highness | 19 | 5 | 2 | 1250 | 10 | 9 | 10 | 7 | 7 | 6 | F | T80 | 2 | 1.3 | 1 | 1 |
| 295 | Street Urchin | 19 | 4 | 4 | 1250 | 11 | 6 | 9 | 9 | 6 | 5 |  | T80 | 2 | 1.3 | 1 | 1 |
| 296 | Victorian Maid | 19 | 3 | 4 | 1250 | 10 | 9 | 9 | 9 | 6 | 6 | F | T80 | 2 | 1.3 | 1 | 1 |
| 297 | Commando | 20 | 5 | 1 | 1250 | 10 | 9 | 10 | 7 | 7 | 6 |  | T80 | 2 | 1.4 | 1 | 1.2 |
| 298 | Colonial Marine | 20 | 5 | 2 | 1250 | 11 | 6 | 9 | 9 | 6 | 5 | F | T80 | 2 | 1.3 | 1 | 1 |
| 299 | Secret Service | 20 | 5 | 3 | 1250 | 11 | 6 | 9 | 9 | 6 | 5 |  | T80 | 2 | 1.3 | 1 | 1 |
| 300 | Archaeologist | 20 | 3 | 4 | 1250 | 11 | 6 | 9 | 9 | 6 | 5 | F | T80 | 2 | 1.3 | 1 | 1 |
| 301 | Riot Girl | 21 | 3 | 4 | 1250 | 9 | 10 | 11 | 10 | 10 | 7 | F | T80 | 2 | 1.3 | 1 | 1 |
| 302 | Rock God | 21 | 5 | 3 | 1250 | 9 | 11 | 10 | 7 | 10 | 10 |  | T80 | 2 | 1.3 | 1 | 1 |
| 303 | Guitar Hero | 21 | 5 | 1 | 1250 | 10 | 10 | 10 | 11 | 9 | 7 |  | T80 | 2 | 1.4 | 1 | 1.2 |
| 304 | Pop Diva | 21 | 5 | 2 | 1250 | 11 | 9 | 10 | 10 | 10 | 7 | F | T80 | 2 | 1.3 | 1 | 1 |
| 305 | Beatnik | 15 | 3 | 7 | 150 | 8 | 5 | 6 | 7 | 8 | 5 | F | $40000 | 1 | 1 | 1 | 1 |
| 306 | Cop | 5 | 3 | 7 | 140 | 6 | 7 | 2 | 3 | 7 | 9 | F | T1 | 1 | 1 | 1 | 1 |
| 307 | Mime | 15 | 4 | 5 | 200 | 8 | 5 | 6 | 10 | 6 | 3 |  | $50000 | 1 | 1 | 1 | 1 |
| 308 | Soccer Player | 5 | 2 | 7 | 300 | 5 | 5 | 11 | 9 | 9 | 9 |  | T20 | 1 | 1.1 | 1 | 1 |
| 309 | Bookie | 5 | 2 | 10 | 180 | 7 | 8 | 4 | 5 | 5 | 5 |  | T2 | 2 | 1 | 1 | 1 |
| 310 | Fantasy Sports Enthusiast | 20 | 2 | 4 | 400 | 5 | 9 | 5 | 4 | 6 | 6 |  | $400000 | 1 | 1 | 1.1 | 1 |
| 313 | Pub Patron | 8 | 5 | 2 | 110 | 8 | 7 | 5 | 2 | 2 | 2 |  | T5 | 1 | 1 | 1 | 1 |
| 314 | Teenager | 25 | 5 | 2 | 200 | 10 | 5 | 2 | 5 | 5 | 5 | F | $500000 | 1 | 1 | 1 | 1 |
| 315 | Bingo Enthusiast | 25 | 5 | 5 | 300 | 2 | 5 | 2 | 5 | 5 | 5 |  | T30 | 3 | 1 | 1.5 | 1.5 |
| 316 | Male Hula Dancer | 6 | 5 | 5 | 350 | 6 | 5 | 9 | 5 | 5 | 5 |  | T20 | 3 | 1 | 1 | 1 |
| 317 | Female Hula Dancer | 6 | 5 | 5 | 800 | 8 | 9 | 7 | 3 | 3 | 3 | F | T45 | 1 | 1.2 | 1 | 1 |
| 318 | Surfer | 6 | 5 | 5 | 200 | 6 | 6 | 9 | 5 | 3 | 3 |  | $100000 | 1 | 1.1 | 1 | 1 |
| 319 | Senator | 16 | 5 | 5 | 1250 | 6 | 11 | 6 | 5 | 10 | 5 | F | T70 | 1 | 1.2 | 1 | 1 |
| 320 | Presidential Candidate | 16 | 5 | 5 | 1000 | 11 | 7 | 5 | 10 | 10 | 5 | F | T50 | 1 | 1 | 1.5 | 1 |
| 321 | House Candidate | 16 | 5 | 5 | 700 | 8 | 5 | 9 | 5 | 5 | 5 |  | T30 | 3 | 1 | 1 | 1 |

### 2.3 Chef avatars, rival chefs, bosses, minions (iOS, 97 rows) [data]

- Rival head chefs (ids 109–116, 127, 138, 188, 200, 207, …) carry boss stats. Their raid HP comes from the per-level curve in doc 10 §2.7, so the Energy shown here is only the base.
- "player avatar" rows can be bought on the chef-select screen (cash or toxin). A zombie avatar defends your café harder when friends raid it [help].

| id | Character (ref only) | Role | Lv | Energy | Spd | Str | Tips | Raid stat | Focus | Patience | Unlock cost | Cook x | Tip x | Regen x | Cook XP x |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 54 | Enemy Chef | rival chef (unused) | - | 100 | 5 | 5 | 5 | 5 | 5 | 5 | - | 1 | 1 | 1 | 1 |
| 55 | Chef | rival waiter | 0 | 90 | 5 | 4 | 3 | 5 | 5 | 5 | - | 1 | 1 | 1 | 1 |
| 56 | Chef | player avatar | 0 | 90 | 5 | 4 | 3 | 5 | 5 | 5 | - | 1 | 1 | 1 | 1 |
| 57 | Chef | rival waiter | 0 | 90 | 5 | 4 | 3 | 5 | 5 | 5 | - | 1 | 1 | 1 | 1 |
| 58 | Chef | rival waiter | 0 | 90 | 5 | 4 | 3 | 5 | 5 | 5 | - | 1 | 1 | 1 | 1 |
| 59 | Chef | rival waiter | 0 | 90 | 5 | 4 | 3 | 5 | 5 | 5 | - | 1 | 1 | 1 | 1 |
| 60 | Chef | rival waiter | 0 | 90 | 5 | 4 | 3 | 5 | 5 | 5 | - | 1 | 1 | 1 | 1 |
| 61 | Chef | rival waiter | 0 | 90 | 5 | 4 | 3 | 5 | 5 | 5 | - | 1 | 1 | 1 | 1 |
| 62 | Chef | rival waiter | 0 | 90 | 5 | 4 | 3 | 5 | 5 | 5 | - | 1 | 1 | 1 | 1 |
| 63 | Chef | rival waiter | 0 | 90 | 5 | 4 | 3 | 5 | 5 | 5 | - | 1 | 1 | 1 | 1 |
| 64 | Enemy Chef | rival chef (unused) | - | 100 | 5 | 5 | 5 | 5 | 5 | 5 | - | 1 | 1 | 1 | 1 |
| 65 | Enemy Chef | rival chef (unused) | - | 100 | 5 | 5 | 5 | 5 | 5 | 5 | - | 1 | 1 | 1 | 1 |
| 66 | Enemy Chef | rival chef (unused) | - | 100 | 5 | 5 | 5 | 5 | 5 | 5 | - | 1 | 1 | 1 | 1 |
| 67 | Enemy Chef | rival chef (unused) | - | 100 | 5 | 5 | 5 | 5 | 5 | 5 | - | 1 | 1 | 1 | 1 |
| 68 | Enemy Chef | rival chef (unused) | - | 100 | 5 | 5 | 5 | 5 | 5 | 5 | - | 1 | 1 | 1 | 1 |
| 69 | Enemy Chef | rival chef (unused) | - | 100 | 5 | 5 | 5 | 5 | 5 | 5 | - | 1 | 1 | 1 | 1 |
| 70 | Enemy Chef | rival chef (unused) | - | 100 | 5 | 5 | 5 | 5 | 5 | 5 | - | 1 | 1 | 1 | 1 |
| 71 | Mad Scientist Chef | rival chef (unused) | - | 100 | 5 | 5 | 5 | 5 | 5 | 5 | - | 1 | 1 | 1 | 1 |
| 72 | Chef | player avatar | 3 | 120 | 5 | 5 | 6 | 5 | 5 | 5 | T5 | 1 | 1 | 1 | 1 |
| 73 | Chef | player avatar | 3 | 120 | 5 | 5 | 6 | 5 | 5 | 5 | T5 | 1 | 1 | 1 | 1 |
| 74 | Chef | player avatar | 3 | 120 | 5 | 5 | 6 | 5 | 5 | 5 | T5 | 1 | 1 | 1 | 1 |
| 75 | Chef | player avatar | 3 | 120 | 5 | 5 | 6 | 5 | 5 | 5 | T5 | 1 | 1 | 1 | 1 |
| 76 | Chef | player avatar | 3 | 120 | 5 | 5 | 6 | 5 | 5 | 5 | T5 | 1 | 1 | 1 | 1 |
| 77 | Chef | player avatar | 3 | 120 | 5 | 5 | 6 | 5 | 5 | 5 | T5 | 1 | 1 | 1 | 1 |
| 78 | Chef | player avatar | 3 | 120 | 5 | 5 | 6 | 5 | 5 | 5 | T5 | 1 | 1 | 1 | 1 |
| 79 | Chef | rival head chef | 3 | 120 | 5 | 5 | 6 | 5 | 5 | 5 | T5 | 1 | 1 | 1 | 1 |
| 85 | Chef | player avatar | 3 | 120 | 5 | 5 | 6 | 5 | 5 | 5 | T5 | 1 | 1 | 1 | 1 |
| 87 | Football Player | player avatar | 3 | 160 | 7 | 7 | 1 | 9 | 1 | 1 | $100 | 1 | 1 | 1 | 1 |
| 88 | Engineer | player avatar | 4 | 140 | 3 | 7 | 2 | 2 | 7 | 2 | $200 | 1 | 1 | 1 | 1 |
| 89 | Retiree | player avatar | 5 | 70 | 1 | 2 | 6 | 3 | 2 | 10 | $500 | 1 | 1 | 1 | 1 |
| 90 | Veteran | player avatar | 6 | 100 | 2 | 6 | 6 | 4 | 4 | 6 | $800 | 1 | 1 | 1 | 1 |
| 91 | The Champ | player avatar | 7 | 250 | 8 | 10 | 6 | 5 | 5 | 5 | $1200 | 1 | 1 | 1 | 1 |
| 92 | Local Hero | player avatar | 8 | 260 | 10 | 7 | 6 | 3 | 8 | 10 | $1400 | 1 | 1 | 1 | 1 |
| 93 | Stoogey the Clown | rival head chef | 9 | 150 | 9 | 5 | 10 | 1 | 1 | 1 | $2400 | 1 | 1 | 1 | 1 |
| 94 | Fire Chief | player avatar | 10 | 160 | 5 | 8 | 6 | 8 | 6 | 3 | $3200 | 1 | 1 | 1 | 1 |
| 95 | Yokozuna | player avatar | 12 | 525 | 6 | 10 | 6 | 7 | 7 | 10 | $5000 | 1 | 1 | 1 | 1 |
| 96 | Movie Star | player avatar | 12 | 100 | 8 | 5 | 10 | 5 | 5 | 5 | $5000 | 1 | 1 | 1 | 1 |
| 97 | Football Player | player avatar | 3 | 320 | 7 | 7 | 1 | 9 | 1 | 1 | T10 | 1 | 1 | 1 | 1 |
| 98 | Engineer | player avatar | 4 | 280 | 3 | 7 | 2 | 2 | 7 | 2 | T10 | 1 | 1 | 1 | 1 |
| 99 | Retiree | player avatar | 5 | 140 | 1 | 2 | 6 | 3 | 2 | 10 | T5 | 1 | 1 | 1 | 1 |
| 100 | Veteran | player avatar | 6 | 200 | 2 | 6 | 6 | 4 | 4 | 6 | T5 | 1 | 1 | 1 | 1 |
| 101 | The Champ | player avatar | 7 | 500 | 8 | 10 | 6 | 5 | 5 | 5 | T20 | 1 | 3 | 1 | 1 |
| 102 | Local Hero | player avatar | 8 | 520 | 10 | 7 | 6 | 3 | 8 | 10 | T10 | 1 | 1 | 1 | 1 |
| 103 | Stoogey the Clown | player avatar | 9 | 300 | 9 | 5 | 10 | 1 | 1 | 1 | T12 | 1 | 2 | 1 | 1 |
| 104 | Fire Chief | player avatar | 10 | 320 | 5 | 8 | 6 | 8 | 6 | 3 | T10 | 1 | 1 | 1 | 1 |
| 105 | Yokozuna | player avatar | 12 | 1050 | 6 | 10 | 6 | 7 | 7 | 10 | T50 | 1 | 1 | 1.1 | 1 |
| 106 | Movie Star | player avatar | 12 | 200 | 8 | 5 | 10 | 5 | 5 | 5 | T15 | 1 | 5 | 1 | 1 |
| 107 | Robo | player avatar | 8 | 500 | 8 | 10 | 10 | 8 | 8 | 8 | T50 | 1.11 | 1 | 1 | 1 |
| 108 | Captain Jack | player avatar | 10 | 500 | 8 | 10 | 10 | 8 | 8 | 8 | T50 | 1 | 1 | 1 | 1.2 |
| 109 | Cafe Chef | rival head chef | - | 500 | 5 | 5 | 5 | 5 | 5 | 5 | T50 | 1 | 2 | 1 | 1 |
| 110 | Diner Chef | rival head chef | - | 500 | 5 | 5 | 5 | 5 | 5 | 5 | T50 | 1 | 2 | 1 | 1 |
| 111 | Italian Chef | rival head chef | - | 500 | 5 | 5 | 5 | 5 | 5 | 5 | T50 | 1 | 2 | 1 | 1 |
| 112 | Asian Chef | rival head chef | - | 500 | 5 | 5 | 5 | 5 | 5 | 5 | T50 | 1 | 2 | 1 | 1 |
| 113 | Tex Mex Chef | rival head chef | - | 500 | 5 | 5 | 5 | 5 | 5 | 5 | T50 | 1 | 2 | 1 | 1 |
| 114 | Pub Chef | rival head chef | - | 500 | 5 | 5 | 5 | 5 | 5 | 5 | T50 | 1 | 2 | 1 | 1 |
| 115 | French Chef | rival head chef | - | 500 | 5 | 5 | 5 | 5 | 5 | 5 | T50 | 1 | 2 | 1 | 1 |
| 116 | Mad Scientist Chef | rival head chef | - | 500 | 5 | 5 | 5 | 5 | 5 | 5 | T50 | 1 | 3 | 1 | 1 |
| 123 | Corporal Chef | player avatar | 9 | 150 | 6 | 8 | 2 | 3 | 5 | 7 | $2000 | 1 | 1 | 1 | 1 |
| 124 | Hippie Chef | player avatar | 4 | 80 | 2 | 4 | 5 | 3 | 2 | 7 | $400 | 1 | 1 | 1 | 1 |
| 125 | Corporal Chef | player avatar | 9 | 500 | 6 | 8 | 2 | 3 | 5 | 7 | T40 | 1 | 1 | 1 | 1 |
| 126 | Hippie Chef | player avatar | 4 | 160 | 2 | 4 | 5 | 3 | 2 | 7 | T5 | 1 | 1 | 1 | 1 |
| 127 | Frankenstein | rival head chef | - | 1200 | 9 | 10 | 7 | 8 | 5 | 7 | T100 | 1 | 5 | 1 | 1 |
| 128 | Mummy Chef | player avatar | 5 | 240 | 2 | 4 | 5 | 3 | 2 | 7 | T5 | 1 | 1 | 1 | 1 |
| 129 | Male Mummy Chef | player avatar | 6 | 240 | 2 | 4 | 5 | 3 | 2 | 7 | T5 | 1 | 1 | 1 | 1 |
| 130 | Witch Chef | player avatar | 7 | 360 | 6 | 8 | 2 | 3 | 5 | 7 | T20 | 1 | 1 | 1 | 1 |
| 131 | Wolfman Chef | player avatar | 8 | 500 | 8 | 5 | 10 | 5 | 5 | 5 | T40 | 1 | 1 | 1 | 1 |
| 136 | Bride of Frankenstein | player avatar | 10 | 1000 | 8 | 9 | 9 | 8 | 6 | 8 | T80 | 1 | 2 | 1 | 1 |
| 137 | Alien | player avatar | 15 | 500 | 9 | 8 | 5 | 10 | 10 | 10 | T50 | 1 | 1 | 1.5 | 1 |
| 138 | Evil Leprechaun | rival head chef | - | 1200 | 9 | 5 | 10 | 8 | 6 | 6 | T75 | 1.11 | 1 | 1 | 1 |
| 143 | Italian Chef (Red) | player avatar | 6 | 500 | 5 | 7 | 7 | 5 | 7 | 5 | T25 | 1 | 2 | 1 | 1 |
| 144 | Italian Chef (Green) | player avatar | 7 | 500 | 7 | 5 | 7 | 7 | 5 | 5 | T25 | 1.11 | 1 | 1 | 1 |
| 145 | Italian Chef (Yellow) | player avatar | 8 | 500 | 5 | 7 | 5 | 7 | 7 | 5 | T25 | 1 | 1 | 1.3 | 1 |
| 146 | Betty Sue | player avatar | 10 | 500 | 7 | 5 | 9 | 8 | 6 | 6 | T25 | 1 | 2 | 1.2 | 1 |
| 147 | Billy Bob | player avatar | 10 | 500 | 6 | 9 | 6 | 7 | 8 | 5 | T25 | 1.11 | 1 | 1 | 1 |
| 148 | Bobby Billy | player avatar | 10 | 500 | 9 | 8 | 5 | 6 | 6 | 7 | T25 | 1 | 1 | 1 | 1.2 |
| 152 | Steam Punk Chef | player avatar | 11 | 500 | 9 | 8 | 5 | 6 | 6 | 7 | T25 | 1 | 1 | 1 | 1.2 |
| 158 | White Ninja | player avatar | 15 | 800 | 7 | 7 | 7 | 6 | 7 | 10 | T30 | 1 | 1 | 1 | 1.2 |
| 163 | Chef Cousin Jimmy | player avatar | 15 | 500 | 5 | 5 | 5 | 5 | 5 | 5 | T50 | 1.2 | 3 | 1.5 | 1.3 |
| 164 | a` Papa Joe | player avatar | 15 | 500 | 5 | 5 | 5 | 5 | 5 | 5 | T50 | 1.15 | 2 | 1.3 | 1.2 |
| 165 | Chef Don Tony | player avatar | 15 | 500 | 5 | 5 | 5 | 5 | 5 | 5 | T50 | 1.1 | 2 | 1.2 | 1.1 |
| 166 | a` Chef Maurizio | player avatar | 15 | 500 | 5 | 5 | 5 | 5 | 5 | 5 | T50 | 1 | 2 | 1.1 | 1 |
| 171 | Chef Elephant | player avatar | 16 | 500 | 5 | 5 | 5 | 5 | 5 | 5 | T50 | 1.15 | 2 | 1.1 | 1.15 |
| 172 | Chef Donkey | player avatar | 16 | 500 | 5 | 5 | 5 | 5 | 5 | 5 | T50 | 1.15 | 2 | 1.1 | 1.15 |
| 177 | Skeletal Bandito Chef | player avatar | 5 | 500 | 5 | 5 | 5 | 5 | 5 | 5 | T50 | 1.15 | 2 | 1.1 | 1.15 |
| 181 | Zombie Claus | rival head chef | 10 | 650 | 5 | 8 | 7 | 3 | 4 | 3 | T25 | 1 | 1 | 1.2 | 1 |
| 182 | Stir Fly Head Chef | player avatar | 10 | 500 | 5 | 7 | 7 | 3 | 4 | 3 | T30 | 1.15 | 2 | 1.1 | 1.15 |
| 188 | Goblin Chef | rival head chef | - | 500 | 5 | 7 | 4 | 4 | 4 | 6 | T50 | 1.2 | 2 | 1.1 | 1.2 |
| 200 | Chef Deadbeard | rival head chef | - | 950 | 8 | 9 | 7 | 4 | 3 | 6 | T70 | 1.2 | 2 | 1.1 | 1.2 |
| 207 | Chef Dracula | rival head chef | - | 1000 | 10 | 9 | 9 | 8 | 5 | 7 | T90 | 1.2 | 3 | 1.4 | 1.2 |
| 223 | The Mad Griller | rival head chef | - | 1100 | 8 | 9 | 8 | 8 | 7 | 6 | T85 | 1.2 | 2 | 1.2 | 1.2 |
| 237 | Osiris | rival head chef | - | 1000 | 9 | 7 | 5 | 8 | 6 | 6 | T70 | 1.2 | 2 | 1.2 | 1.2 |
| 247 | Zeus | rival head chef | - | 1100 | 9 | 9 | 8 | 7 | 6 | 6 | T85 | 1.2 | 2 | 1.2 | 1.3 |
| 251 | Crusta's Chef | rival head chef | - | 1000 | 9 | 9 | 2 | 4 | 5 | 5 | T80 | 1.3 | 1 | 1.4 | 1.3 |
| 265 | Jabberwocky | rival head chef | - | 1200 | 8 | 10 | 6 | 9 | 6 | 6 | T100 | 1.5 | 5 | 1.2 | 1.2 |
| 266 | Grimreaper | rival head chef | - | 1200 | 10 | 10 | 6 | 7 | 5 | 4 | T100 | 1.4 | 5 | 1.1 | 1.4 |
| 311 | Corporal Chef | rival head chef | - | 350 | 5 | 9 | 3 | 5 | 5 | 5 | $5000 | 1 | 2 | 1 | 1 |
| 312 | Bookie Chef | rival head chef | - | 1000 | 10 | 5 | 4 | 5 | 5 | 5 | T20 | 1.11 | 1 | 1 | 1 |

**Android vs iOS** (same id and name; changed spawn weights, levels, energies or costs). In iOS, most themed customers got a little rarer and the cash-priced late customers got cheaper:

| id | Character | Field | Android | iOS |
|---|---|---|---|---|
| 27 | Punk | weight | 2 | 6 |
| 33 | Construction Worker | weight | 6 | 5 |
| 44 | Benchwarmer | weight | 2 | 3 |
| 81 | Mikazuna | weight | 2 | 3 |
| 121 | Young Male Hippie | weight | 3 | 4 |
| 135 | Werewolf | weight | 8 | 5 |
| 139 | Martian Scientist | weight | 8 | 7 |
| 139 | Martian Scientist | cost | 99000 | 35000 |
| 142 | Martian Doctor | weight | 7 | 6 |
| 142 | Martian Doctor | cost | 95000 | 30000 |
| 151 | Steam Punk Lord | weight | 7 | 6 |
| 153 | Black Ninja | weight | 8 | 6 |
| 153 | Black Ninja | cost | 99000 | 50000 |
| 156 | Green Ninja | weight | 7 | 5 |
| 156 | Green Ninja | cost | 85000 | 25000 |
| 157 | Red Ninja | weight | 2 | 3 |
| 168 | NY Sports Fan | weight | 5 | 6 |
| 169 | Godfather | weight | 7 | 5 |
| 170 | Ditzy Mafia Girl | weight | 5 | 6 |
| 173 | Politician | weight | 8 | 3 |
| 175 | Governor | weight | 7 | 4 |
| 176 | Ex-Governor | weight | 5 | 4 |
| 178 | Skeleton Bride | weight | 6 | 5 |
| 179 | Skeleton Groom | weight | 6 | 5 |
| 180 | Calavera de Catrina | weight | 8 | 6 |
| 180 | Calavera de Catrina | cost | 50000 | 10000 |
| 183 | Fish Head Monster | weight | 6 | 5 |
| 184 | Dr. Mantis Face | weight | 6 | 4 |
| 185 | Mr. ? | weight | 6 | 5 |
| 186 | Pink Retro Robot | weight | 6 | 4 |
| 189 | Knight in Armor | weight | 8 | 6 |
| 190 | Executioner | weight | 8 | 4 |
| 190 | Executioner | cost | 75000 | 20000 |
| 191 | Wizard | weight | 7 | 4 |
| 192 | Mighty King | weight | 8 | 7 |
| 194 | Evil Queen | weight | 8 | 7 |
| 196 | Marooner | weight | 5 | 2 |
| 196 | Marooner | cost | 65000 | 15000 |
| 197 | Undead Skeleton Pirate | weight | 7 | 6 |
| 198 | Shipmate | cost | 90000 | 45000 |
| 201 | Vampire Bride | weight | 8 | 7 |
| 202 | Nosferatu | weight | 8 | 5 |
| 202 | Nosferatu | cost | 80000 | 20000 |
| 203 | Pure Blood | weight | 8 | 6 |
| 204 | Vampire Hunter | weight | 8 | 6 |
| 205 | Vampire Ghoul | weight | 8 | 6 |
| 206 | Goth | weight | 8 | 7 |
| 208 | Break-fast | weight | 8 | 5 |
| 209 | Shadow Skull | weight | 8 | 6 |
| 210 | Supper girl | weight | 8 | 7 |
| 212 | Dr. Hoboken | weight | 8 | 3 |
| 213 | Galacticus | weight | 8 | 4 |
| 214 | Henchman | weight | 8 | 5 |

---

## 3. Store items

### 3.1 Fields [code]

These come from the `FurnitureData` constructor (Android) and the aligned iOS `ItemData` rows:

| Field | Meaning |
|---|---|
| Lv | Level gate (255 = not sold) |
| Price | Cost, in cash or toxin. Selling refunds **50 %** (`ITEM_SELLBACK_RATE`) |
| Function | The `FunctionTypeData` id: 0 decor, 1 stove, 2 counter, 3 table, 4 chair, 5 wall, 6 wallDecor, 7 floor, 8 fridge, 9 "pot" (dividers and pots), 10 cash, 11 sink (trash cans count as sinks), 12 expansion, 13 toxinBarrel, 14 tombstone, 15 toxinGenerator, 16 billboard, 17 burnTimeBooster, 18 habitat (pet house) |
| Tab | Store tab [inf from contents]: 1 decor, 2 kitchen, 3 furniture, 4 walls/floors/windows, 5 special (cash, expansions, tombstones, habitats, toxin), 7 not sold (starter "dirty" items, plates, pots) |
| Size | Footprint in tiles. Almost all items are 1×1; a few iOS showpieces are 1×2 or 2×2; expansions store the new café size |
| Rating | Additive popularity contribution (dirty starter items −0.01; best decor +0.20). Furniture rating is capped by `Furniture_MAX_RATING_BONUS` = 0.13 [code; exact use not traced] |
| $/h / cap | Money-makers: cash per hour / maximum stored |
| Stove × | Cooking-speed multiplier (stoves only; 1.0–1.3) |
| XP | One-off XP for buying it |

### 3.2 Expansions [data]

The café starts at **7 × 6** (`Cafe_INITIAL_CAFE_WIDTH/HEIGHT`). Each expansion has a cash version and a toxin version, bought in order:

| Size | Android $ | Android toxin | iOS $ | iOS toxin |
|---|---|---|---|---|
| 8x7 | 3500 | - | 2500 | - |
| 9x8 | 25000 | 10 | 10000 | 10 |
| 10x9 | 75000 | 30 | 25000 | 30 |
| 11x10 | 100000 | 40 | 75000 | 40 |
| 12x11 | 120000 | 50 | 75000 | 40 |
| 13x12 | 150000 | 50 | 90000 | 50 |
| 14x13 | 150000 | 50 | 90000 | 50 |
| 15x14 | 150000 | 50 | 100000 | 50 |
| 16x15 | - | - | 175000 | 60 |
| 17x16 | - | - | 250000 | 80 |

iOS made expansions much cheaper and added two more sizes (16×15, 17×16).

### 3.3 Kitchen: stoves, counters, sinks, fridges (iOS) [data]

| id | Item (ref only) | Lv | Price | Function | Tab | Size | Rating | $/h / cap | Stove x | XP |
|---|---|---|---|---|---|---|---|---|---|---|
| 0 | Dirty Fridge | 0 | $50 | fridge | 7 | 1x1 | -0.01 |  | 1 | 0 |
| 1 | Dirty Stove | 0 | $50 | stove | 7 | 1x1 | -0.01 |  | 1 | 0 |
| 2 | Dirty Sink | 0 | $50 | sink | 7 | 1x1 | -0.01 |  | 1 | 0 |
| 15 | Plain Stove | 1 | $500 | stove | 2 | 1x1 | 0 |  | 1 | 8 |
| 16 | Plain Serving Counter | 1 | $500 | counter | 2 | 1x1 | 0 |  | 1 | 8 |
| 17 | Plain Sink | 1 | $500 | sink | 2 | 1x1 | 0 |  | 1 | 8 |
| 18 | Plain Fridge | 1 | $500 | fridge | 2 | 1x1 | 0 |  | 1 | 8 |
| 74 | Stainless Steel Stove | 5 | $25000 | stove | 2 | 1x1 | 0.02 |  | 1 | 375 |
| 75 | Stainless Steel Serving Counter | 5 | $15000 | counter | 2 | 1x1 | 0.01 |  | 1 | 225 |
| 76 | Stainless Steel Sink | 5 | $25000 | sink | 2 | 1x1 | 0.02 |  | 1 | 375 |
| 77 | Stainless Steel Fridge | 5 | $25000 | fridge | 2 | 1x1 | 0.02 |  | 1 | 375 |
| 149 | Bar Serving Counter | 15 | $2000 | counter | 2 | 1x1 | 0 |  | 1 | 30 |
| 205 | Red Trash Can | 1 | $1500 | sink | 2 | 1x1 | 0 |  | 1 | 23 |
| 210 | Marble Serving Counter | 18 | $50000 | counter | 2 | 1x1 | 0.02 |  | 1 | 750 |
| 218 | Mad Scientist Serving Counter | 10 | $7000 | counter | 2 | 1x1 | 0 |  | 1 | 105 |
| 226 | Pub Serving Counter | 15 | T2 | counter | 2 | 1x1 | 0.01 |  | 1 | 80 |
| 233 | Green Trash Bin | 15 | $3000 | sink | 2 | 1x1 | 0 |  | 1 | 45 |
| 248 | Magic Fridge | 1 | T30 | fridge | 2 | 1x1 | 0.01 |  | 1 | 1200 |
| 249 | Suped-Up Fridge | 7 | $25000 | fridge | 2 | 1x1 | 0.01 |  | 1 | 375 |
| 252 | Suped-Up Stove | 7 | T20 | stove | 2 | 1x1 | 0.01 |  | 1.11 | 800 |
| 254 | BBQ Stove | 8 | T2 | stove | 2 | 1x1 | 0.01 |  | 1 | 80 |
| 272 | Orange Serving Counter | 10 | $6000 | counter | 2 | 1x1 | 0 |  | 1 | 90 |
| 309 | Green Pub Counter | 8 | $1500 | counter | 2 | 1x1 | 0.03 |  | 1 | 20 |
| 321 | Freeze Dried Fridge | 7 | T10 | fridge | 2 | 1x1 | 0.01 |  | 1 | 500 |
| 324 | Laser Oven | 7 | T25 | stove | 2 | 1x1 | 0.02 |  | 1.2 | 1000 |
| 328 | Space Counter | 14 | T3 | counter | 2 | 1x1 | 0.02 |  | 1 | 300 |
| 329 | Space Sink | 7 | $4500 | sink | 2 | 1x1 | 0.04 |  | 1 | 40 |
| 361 | Steam Powered Fridge | 12 | T10 | fridge | 2 | 1x1 | 0.01 |  | 1 | 500 |
| 364 | Steam Powered Stove | 12 | T25 | stove | 2 | 1x1 | 0.02 |  | 1.2 | 1000 |
| 366 | Victorian Counter | 12 | $1500 | counter | 2 | 1x1 | 0.03 |  | 1 | 20 |
| 367 | Victorian Sink | 12 | $4250 | sink | 2 | 1x1 | 0.03 |  | 1 | 40 |
| 380 | Dojo Counter | 15 | $1500 | counter | 2 | 1x1 | 0.03 |  | 1 | 20 |
| 381 | Dojo Sink | 15 | $5500 | sink | 2 | 1x1 | 0.04 |  | 1 | 40 |
| 391 | Standard Pizza Oven | 15 | $5000 | stove | 2 | 1x1 | 0.01 |  | 1 | 800 |
| 392 | Brick Oven Pizza | 15 | $11000 | stove | 2 | 1x1 | 0.02 |  | 1.1 | 1000 |
| 393 | Deep Dish Oven | 15 | T15 | stove | 2 | 1x1 | 0.03 |  | 1.2 | 1200 |
| 394 | Italian Stallion Pizza Oven | 15 | T20 | stove | 2 | 1x1 | 0.04 |  | 1.3 | 1400 |
| 397 | Economic Grill | 16 | $12000 | stove | 2 | 1x1 | 0.02 |  | 1.1 | 1000 |
| 398 | Corporate Grill | 16 | T15 | stove | 2 | 1x1 | 0.03 |  | 1.2 | 1200 |
| 399 | T-8000 Grill | 16 | T20 | stove | 2 | 1x1 | 0.04 |  | 1.3 | 1400 |
| 410 | Traditional Estufa | 5 | $5000 | stove | 2 | 1x1 | 0 |  | 1 | 150 |
| 411 | Chiminea Estufa | 5 | T15 | stove | 2 | 1x1 | 0 |  | 1 | 300 |
| 412 | Estufa Del Jefe | 5 | T20 | stove | 2 | 1x1 | 0 |  | 1 | 350 |
| 430 | Witch potion Stove | 8 | $7000 | stove | 2 | 1x1 | 0 |  | 1.1 | 170 |
| 431 | Lava Stove | 8 | T15 | stove | 2 | 1x1 | 0 |  | 1.2 | 330 |
| 432 | Fiery Dragon Stove | 8 | T20 | stove | 2 | 1x1 | 0 |  | 1.3 | 400 |
| 478 | Super Stove | 14 | $10000 | stove | 2 | 1x1 | 0 |  | 1.1 | 1000 |
| 479 | Spectro-Tastilizer | 14 | T15 | stove | 2 | 1x1 | 0 |  | 1.2 | 1200 |
| 480 | The Flavor Matrix | 14 | T20 | stove | 2 | 1x1 | 0 |  | 1.3 | 1400 |
| 511 | Temple Furnace | 12 | $9000 | stove | 2 | 1x1 | 0.02 |  | 1.1 | 1000 |
| 512 | Anubis Cremator | 12 | T15 | stove | 2 | 1x1 | 0.03 |  | 1.2 | 1200 |
| 513 | Horus Incinerator | 12 | T20 | stove | 2 | 1x1 | 0.04 |  | 1.3 | 1400 |
| 529 | Ionic Stove | 17 | $13000 | stove | 2 | 1x1 | 0.02 |  | 1.1 | 1100 |
| 530 | Doric Stove | 17 | T15 | stove | 2 | 1x1 | 0.03 |  | 1.2 | 1300 |
| 531 | Corinthian Stove | 17 | T20 | stove | 2 | 1x1 | 0.04 |  | 1.3 | 1500 |
| 533 | Greek Counter | 17 | T2 | counter | 2 | 1x1 | 0.03 |  | 1 | 200 |
| 536 | Krypton Worktop | 18 | T3 | counter | 2 | 1x1 | 0.03 |  | 1 | 300 |
| 537 | Krypton Sink | 18 | $6000 | sink | 2 | 1x1 | 0.04 |  | 1 | 45 |
| 539 | Krypton Fridge | 18 | T30 | fridge | 2 | 1x1 | 0.01 |  | 1 | 1200 |
| 542 | Mutant Dish Generator Tier 1 | 18 | $14000 | stove | 2 | 1x1 | 0.02 |  | 1.1 | 1200 |
| 543 | Mutant Dish Generator Tier 2 | 18 | T15 | stove | 2 | 1x1 | 0.03 |  | 1.2 | 1400 |
| 544 | Mutant Dish Generator Tier 3 | 18 | T20 | stove | 2 | 1x1 | 0.04 |  | 1.3 | 1600 |
| 556 | Garden Party Stove | 14 | $10000 | stove | 2 | 1x1 | 0.02 |  | 1.1 | 1000 |
| 557 | Garden Party Wonder Stove | 14 | T15 | stove | 2 | 1x1 | 0.03 |  | 1.2 | 1200 |
| 558 | Garden Party Magic Stove | 14 | T20 | stove | 2 | 1x1 | 0.04 |  | 1.3 | 1400 |
| 580 | Tomb Stove | 9 | $8000 | stove | 2 | 1x1 | 0.02 |  | 1.1 | 900 |
| 581 | Grave Grill | 9 | T15 | stove | 2 | 1x1 | 0.03 |  | 1.2 | 1000 |
| 582 | Death Furnace | 9 | T20 | stove | 2 | 1x1 | 0.04 |  | 1.3 | 1200 |
| 610 | Viking Fire Pit | 10 | $8000 | stove | 2 | 1x1 | 0.02 |  | 1.1 | 950 |
| 611 | Warrior Fire Pit | 10 | T15 | stove | 2 | 1x1 | 0.03 |  | 1.2 | 1100 |
| 612 | Dragon Fire Pit | 10 | T20 | stove | 2 | 1x1 | 0.04 |  | 1.3 | 1300 |
| 631 | Devilish Pit | 13 | $9500 | stove | 2 | 1x1 | 0.02 |  | 1.1 | 1000 |
| 632 | Sorcerer's Stove | 13 | T15 | stove | 2 | 1x1 | 0.03 |  | 1.2 | 1200 |
| 633 | Furnace of Hell | 13 | T20 | stove | 2 | 1x1 | 0.04 |  | 1.3 | 1400 |
| 665 | Junker Grill | 11 | $8500 | stove | 2 | 1x1 | 0.02 |  | 1.1 | 1000 |
| 666 | Clunker Grill | 11 | T15 | stove | 2 | 1x1 | 0.03 |  | 1.2 | 1200 |
| 667 | Hot Rod Grill | 11 | T20 | stove | 2 | 1x1 | 0.04 |  | 1.3 | 1400 |
| 670 | Chocolate Counter | 13 | T2 | counter | 2 | 1x1 | 0.02 |  | 0 | 200 |
| 671 | Gingerbread Choco Sink | 13 | $4500 | sink | 2 | 1x1 | 0.03 |  | 0 | 40 |
| 676 | Chocolate Oven | 13 | T25 | stove | 2 | 1x1 | 0.03 |  | 1.3 | 1500 |
| 681 | Chocolate Bar Fridge | 13 | T25 | fridge | 2 | 1x1 | 0.03 |  | 0 | 1500 |
| 687 | Cast Iron Oven | 19 | $9000 | stove | 2 | 1x1 | 0.03 |  | 1.2 | 1200 |
| 688 | Steel Edged Oven | 19 | T20 | stove | 2 | 1x1 | 0.04 |  | 1.3 | 1400 |
| 689 | Gilt Edged Oven | 19 | T25 | stove | 2 | 1x1 | 0.05 |  | 1.4 | 1600 |
| 690 | Victorian Fridge | 19 | T30 | fridge | 2 | 1x1 | 0.04 |  | 0 | 2000 |
| 691 | Serving Counter | 19 | T3 | counter | 2 | 1x1 | 0.03 |  | 0 | 300 |
| 706 | Home Movie Stove | 20 | $15000 | stove | 2 | 1x1 | 0.02 |  | 1.1 | 1400 |
| 707 | B-movie Stove | 20 | T15 | stove | 2 | 1x1 | 0.03 |  | 1.2 | 1600 |
| 708 | Blockbuster Stove | 20 | T20 | stove | 2 | 1x1 | 0.04 |  | 1.3 | 1800 |
| 715 | L'il Heat | 21 | $15000 | stove | 2 | 1x1 | 0.02 |  | 1.1 | 1400 |
| 716 | Big Burner | 21 | T15 | stove | 2 | 1x1 | 0.03 |  | 1.2 | 1600 |
| 717 | Flaming Hot | 21 | T20 | stove | 2 | 1x1 | 0.04 |  | 1.3 | 1800 |
| 718 | Rock Fridge | 21 | T30 | fridge | 2 | 1x1 | 0.04 |  | 0 | 2100 |
| 719 | Rock Counter | 21 | T5 | counter | 2 | 1x1 | 0.04 |  | 0 | 500 |
| 731 | Green Retro Fridge | 5 | $1200 | fridge | 2 | 1x1 | 0 |  | 0 | 25 |
| 732 | Green Retro Stove | 5 | $1200 | stove | 2 | 1x1 | 0 |  | 1 | 25 |
| 739 | Retro Green Counter | 3 | $1000 | counter | 2 | 1x1 | 0 |  | 0 | 2 |
| 740 | Green Retro Sink | 3 | $1200 | sink | 2 | 1x1 | 0 |  | 0 | 2 |
| 755 | Black Grill | 15 | T20 | stove | 2 | 1x1 | 0.03 |  | 1 | 800 |
| 758 | Blue Tile Counter | 15 | T5 | counter | 2 | 1x1 | 0.02 |  | 1 | 50 |
| 765 | Tile Sink | 15 | T10 | sink | 2 | 1x1 | 0.03 |  | 1 | 1 |
| 769 | Tiki Bar Counter | 6 | $5000 | counter | 2 | 1x1 | 0.03 |  | 1 | 70 |
| 770 | Tiki Bar Sink | 6 | $5000 | sink | 2 | 1x1 | 0.02 |  | 1 | 70 |
| 774 | Fire Pit | 6 | T10 | stove | 2 | 1x1 | 0.03 |  | 1 | 700 |

**Themed stove chains** (Android ids; iOS keeps them):

| Theme | Base → tier 2 → tier 3 (→ 4) | Prices | Stove × |
|---|---|---|---|
| 1 Pizza | 391 → 392 → 393 → 394 | $5000, $11000, 15 T, 20 T | 1.0, 1.1, 1.2, 1.3 |
| 2 Grill | 397 → 398 → 399 | $12000, 15 T, 20 T | 1.1, 1.2, 1.3 |
| 3 Estufa | 410 → 411 → 412 | $6000, 15 T, 20 T | 1.0 ×3 |
| 4 Cauldron | 430 → 431 → 432 | $8000, 15 T, 20 T | 1.1, 1.2, 1.3 |
| 5 Super stove | 478 → 479 → 480 | $10000, 15 T, 20 T | 1.1, 1.2, 1.3 |

Each tier is an *upgrade* of the previous one: the item's `s7` field holds the id it upgrades from.

Other rules:
- The "Magic Fridge" (id 248, 30 T) lets a stored dish be served up to **×5** (`MAGIC_FRIDGE_MAX_MULTIPLIER`) [code name; exact rule not traced].
- Best non-themed stoves: Laser Oven, Grill and Steam Powered Stove, all ×1.2 for 25 T.

### 3.4 Money-makers (iOS, 84 rows with cash output) [data]

| id | Item (ref only) | Lv | Price | Function | Tab | Size | Rating | $/h / cap | Stove x | XP |
|---|---|---|---|---|---|---|---|---|---|---|
| 8 | Vending machine | 1 | $16000 | decor | 5 | 1x1 | 0 | 25/250 | 1 | 240 |
| 9 | Vending machine | 1 | T8 | decor | 5 | 1x1 | 0 | 25/250 | 1 | 320 |
| 12 | Arcade Cabinet | 1 | $50000 | decor | 5 | 1x1 | 0 | 75/1000 | 1 | 750 |
| 13 | Arcade Cabinet 2 | 1 | T25 | decor | 5 | 1x1 | 0 | 100/1200 | 1 | 1000 |
| 14 | ATM | 1 | T60 | decor | 5 | 1x1 | 0 | 200/5000 | 1 | 2400 |
| 81 | Jukebox | 5 | $40000 | decor | 5 | 1x1 | 0 | 55/1500 | 1 | 600 |
| 82 | Jukebox | 5 | T20 | decor | 5 | 1x1 | 0 | 75/1800 | 1 | 800 |
| 138 | Slot Machine | 12 | $100000 | decor | 5 | 1x1 | 0 | 150/1800 | 1 | 1500 |
| 139 | Slot Machine | 11 | T50 | decor | 1 | 1x1 | 0 | 150/1800 | 1 | 2000 |
| 150 | Foosball Table | 15 | $60000 | decor | 5 | 1x1 | 0 | 90/1000 | 1 | 900 |
| 151 | Foosball Table | 15 | T30 | decor | 5 | 1x1 | 0 | 100/1200 | 1 | 1200 |
| 225 | Pool Table | 15 | T40 | decor | 5 | 1x1 | 0 | 125/2000 | 1 | 1600 |
| 260 | Ice Fridge | 7 | T10 | decor | 5 | 1x1 | 0.03 | 30/400 | 1 | 400 |
| 261 | Ice Cream Machine | 7 | T20 | decor | 5 | 1x1 | 0.01 | 75/900 | 1 | 800 |
| 262 | Slushy Machine | 8 | T20 | decor | 5 | 1x1 | 0.01 | 75/900 | 1 | 800 |
| 284 | Cauldron | 22 | T50 | decor | 5 | 1x1 | 0 | 150/5000 | 1 | 3000 |
| 290 | Christmas Tree | 12 | T50 | decor | 5 | 1x1 | 0 | 200/4000 | 1 | 2500 |
| 291 | Christmas Arcade Cabinet | 10 | T30 | decor | 5 | 1x1 | 0 | 150/2000 | 1 | 900 |
| 298 | Smiling Buddha | 22 | T40 | decor | 5 | 1x1 | 0.01 | 150/3000 | 1 | 1000 |
| 311 | Pot Of Gold | 10 | T35 | decor | 5 | 1x1 | 0 | 100/2500 | 1 | 2000 |
| 335 | Space Fighter Arcade Machine | 14 | T45 | decor | 5 | 1x1 | 0 | 300/4500 | 1 | 1200 |
| 337 | Air Hockey Table | 12 | T30 | decor | 5 | 1x1 | 0 | 100/1200 | 1 | 1200 |
| 338 | Deep Fryer | 8 | T20 | decor | 5 | 1x1 | 0.01 | 75/900 | 1 | 800 |
| 339 | Pinball Machine | 13 | T25 | decor | 5 | 1x1 | 0 | 100/1200 | 1 | 1000 |
| 340 | Pizza Display Warmer | 9 | $50000 | decor | 5 | 1x1 | 0.01 | 75/900 | 1 | 800 |
| 341 | Pool Table (Blue) | 17 | T40 | decor | 5 | 1x1 | 0 | 125/2000 | 1 | 1600 |
| 345 | Wood Fire Pizza Oven | 9 | T20 | decor | 5 | 1x1 | 0.03 | 75/900 | 1 | 800 |
| 346 | Zombie Fighter Arcade Machine | 8 | T45 | decor | 5 | 1x1 | 0 | 300/4500 | 1 | 1200 |
| 353 | Meat Smoker | 14 | T15 | decor | 5 | 1x1 | 0.01 | 50/600 | 1 | 500 |
| 356 | Rotisserie | 10 | T20 | decor | 5 | 1x1 | 0.03 | 75/900 | 1 | 800 |
| 358 | Steam Powered Arcade Cabinet | 16 | T45 | decor | 5 | 1x1 | 0 | 300/4500 | 1 | 1200 |
| 363 | Phono-Box | 16 | T20 | decor | 5 | 1x1 | 0 | 75/1800 | 1 | 800 |
| 448 | Salad Bar | 12 | T35 | decor | 5 | 2x1 | 0 | 100/2500 | 0 | 2500 |
| 472 | Comics Spinner Racks | 6 | $18000 | decor | 5 | 1x1 | 0 | 30/300 | 0 | 300 |
| 475 | Phone Booth | 9 | T20 | decor | 5 | 1x1 | 0.01 | 80/1900 | 0 | 800 |
| 477 | Comics Stand | 14 | T40 | decor | 5 | 1x1 | 0 | 130/2800 | 0 | 1500 |
| 486 | High Striker | 11 | T40 | decor | 5 | 1x1 | 0 | 350/4000 | 0 | 1200 |
| 487 | Power Punch | 11 | T50 | decor | 5 | 1x1 | 0.15 | 350/4000 | 0 | 3000 |
| 488 | Zombie Man Arcade Booth | 11 | T70 | decor | 5 | 1x1 | 0.15 | 400/6000 | 0 | 3000 |
| 489 | Galactic War Game | 20 | T50 | decor | 5 | 1x1 | 0 | 300/5000 | 0 | 3000 |
| 490 | Arcade Racer | 11 | T50 | decor | 5 | 1x1 | 0.1 | 400/5500 | 0 | 3500 |
| 491 | Monster Pet Shop Crane Game | 11 | T40 | decor | 5 | 1x1 | 0.1 | 200/3000 | 0 | 2000 |
| 492 | Golden Slot Machine | 11 | T80 | decor | 5 | 1x1 | 0.15 | 350/7000 | 0 | 3500 |
| 493 | Roulette Table | 11 | T50 | decor | 5 | 1x2 | 0.15 | 350/6000 | 0 | 4000 |
| 515 | Sphinx | 12 | T50 | decor | 5 | 2x2 | 0 | 100/5000 | 0 | 2200 |
| 520 | Cracked Safe | 15 | T50 | decor | 5 | 1x1 | 0 | 125/6000 | 0 | 3000 |
| 525 | The Trojan Horse | 17 | T50 | decor | 5 | 1x2 | 0 | 100/5000 | 0 | 2400 |
| 526 | Atlas Sculpture | 17 | T35 | decor | 1 | 1x1 | 0.08 | 0/0 | 0 | 2400 |
| 538 | Power Generator | 18 | T20 | decor | 5 | 1x1 | 0.02 | 100/2000 | 0 | 1000 |
| 551 | Curious Flowers | 14 | T2 | decor | 1 | 1x1 | 0.01 | 0/0 | 0 | 150 |
| 553 | Magic Mushroom Cluster | 14 | T20 | decor | 5 | 2x2 | 0.02 | 80/1000 | 0 | 800 |
| 554 | Rose Tree | 14 | T3 | decor | 1 | 1x1 | 0.01 | 0/0 | 0 | 150 |
| 555 | Tea Party Decoration | 14 | T30 | decor | 1 | 2x2 | 0.06 | 0/0 | 0 | 2500 |
| 571 | Tree of the Dead | 9 | T20 | decor | 5 | 2x2 | 0 | 50/800 | 0 | 750 |
| 572 | Gravestone 1 | 9 | T3 | decor | 1 | 1x1 | 0.03 | 0/0 | 0 | 300 |
| 573 | Gravestone 2 | 9 | T3 | decor | 1 | 1x1 | 0.03 | 0/0 | 0 | 300 |
| 574 | Gravestone 3 | 9 | T2 | decor | 1 | 1x1 | 0.01 | 0/0 | 0 | 150 |
| 575 | Gravestone 4 | 9 | T2 | decor | 1 | 1x1 | 0.01 | 0/0 | 0 | 150 |
| 576 | Gravestone 5 | 9 | T3 | decor | 1 | 1x1 | 0.03 | 0/0 | 0 | 300 |
| 577 | Cypress | 9 | T5 | decor | 1 | 1x1 | 0 | 0/0 | 0 | 300 |
| 597 | Megalith 1 | 10 | T2 | decor | 1 | 1x1 | 0.01 | 0/0 | 0 | 150 |
| 598 | Megalith 2 | 10 | T2 | decor | 1 | 1x1 | 0.01 | 0/0 | 0 | 150 |
| 599 | Megalith 3 | 10 | T2 | decor | 1 | 1x1 | 0.01 | 0/0 | 0 | 150 |
| 603 | Camp Fire | 10 | T20 | decor | 5 | 2x2 | 0 | 50/1000 | 0 | 800 |
| 604 | Wrecked Drakkar | 10 | T10 | decor | 1 | 1x1 | 0.05 | 0/0 | 0 | 600 |
| 605 | Frozen Fish Bar | 10 | T35 | decor | 5 | 1x2 | 0 | 150/3000 | 0 | 2500 |
| 606 | Dragon Skull | 10 | T30 | decor | 1 | 2x2 | 0.07 | 0/0 | 0 | 2500 |
| 607 | Snow Pine | 10 | T3 | decor | 1 | 1x1 | 0.01 | 0/0 | 0 | 300 |
| 609 | Weapon Stand | 10 | T5 | decor | 1 | 1x1 | 0.03 | 0/0 | 0 | 300 |
| 622 | Z-Mas Tree | 12 | T35 | decor | 5 | 2x2 | 0 | 200/4000 | 0 | 3500 |
| 637 | Hatching Egg | 14 | T30 | decor | 5 | 1x1 | 0.01 | 50/5000 | 0 | 3000 |
| 638 | Robot Remains | 14 | T35 | decor | 5 | 2x2 | 0.05 | 200/4000 | 0 | 3500 |
| 639 | Crashed Jet | 14 | T40 | decor | 5 | 2x2 | 0.05 | 300/3000 | 0 | 4000 |
| 645 | Leg Chamber | 12 | T15 | decor | 1 | 1x1 | 0.04 | 0/0 | 0 | 1200 |
| 646 | Head Chamber | 12 | T30 | decor | 1 | 1x1 | 0.07 | 0/0 | 0 | 2800 |
| 647 | Arm Chamber | 12 | T20 | decor | 1 | 1x1 | 0.05 | 0/0 | 0 | 1750 |
| 648 | Transmogrification Table | 12 | T40 | decor | 5 | 2x2 | 0 | 300/3000 | 0 | 4000 |
| 651 | Popcorn Booth | 11 | T30 | decor | 5 | 1x1 | 0 | 300/2500 | 0 | 3000 |
| 652 | 50's Jukebox | 11 | T50 | decor | 5 | 1x1 | 0 | 200/6000 | 0 | 5000 |
| 653 | Motorcycle | 11 | T40 | decor | 1 | 1x2 | 0.1 | 0/0 | 0 | 4000 |
| 677 | Jelly Plant | 13 | T10 | decor | 5 | 1x1 | 0 | 25/500 | 0 | 600 |
| 709 | Roulette Table | 20 | T50 | decor | 5 | 1x2 | 0.12 | 400/5500 | 1 | 3500 |
| 712 | Attack Chopper | 20 | T60 | decor | 5 | 2x2 | 0.12 | 350/6000 | 1 | 4000 |
| 724 | Rock Record Player | 21 | T60 | decor | 5 | 1x1 | 0.12 | 375/6500 | 1 | 4000 |

Rules [help/code]:
- "$" floats over an item when cash is waiting; "!" means the cap is reached and it stops earning.
- Cash items stop while the café is closed.
- `Furniture_MAX_EARNINGS` = 200 and `Store_MAX_EARNING_VALUE` = 10 are display caps for the store's "$" icons [inf].

### 3.5 Toxin and booster items (iOS) [data]

| id | Item (ref only) | Lv | Price | Function | Tab | Size | Rating | $/h / cap | Stove x | XP |
|---|---|---|---|---|---|---|---|---|---|---|
| 7 | Toxic Barrel | 1 | T50 | toxinBarrel | 5 | 1x1 | 0 |  | 1 | 2000 |
| 496 | Toxin Generator | 255 | D40 | toxinGenerator | 5 | 1x1 | 0 | k2:5/5 | 0 | 500 |
| 505 | BillBoard | 255 | D40 | billboard | 7 | 1x1 | 0 |  | 0 | 0 |
| 506 | BillBoard | 255 | D40 | billboard | 7 | 1x1 | 0 |  | 0 | 0 |
| 550 | Hyper Booster | 5 | D15 | burnTimeBooster | 5 | 1x1 | 0 |  | 1 | 0 |
| 636 | Turbo Booster | 5 | D15 | burnTimeBooster | 5 | 1x1 | 0 |  | 1 | 0 |

- Toxic Barrel: zombies regenerate energy **10 % faster per barrel**, and barrels stack.
- Toxin Generator (real-money item): **5 toxin per day for 15 days**.
- Burn boosters: Super doubles burn time and boosts cook XP; Hyper means dishes never burn plus more XP; Turbo adds servings plus XP. Each needs the previous one.
- Android sold toxin packs for cash: 10 T for $20 000, 30 T for $50 000, 175 T for $250 000, 750 T for $1 000 000. That is $1333–2000 per toxin; `CASH_PER_TOXIN` = 2000.

### 3.6 Tombstones (iOS `TombstoneData` + items) [data]

| Item id | Tombstone (ref only) | Price | Lv | Uses per 24 h | Effect |
|---|---|---|---|---|---|
| 285 | Strength | 50 T | 5 | 5 | Raid: all zombies deal **×2 damage for 5 s**, glow red (`tombstone_POWER_STRENGTH` = 2, `POWER_DURATION` = 5000 ms) |
| 286 | Health | 50 T | 5 | 5 | Raid: **+100 energy** to all zombies (`POWER_HEALTH` = 100), glow green |
| 303 / 304 | Strength / Health "Level 2" | 55 T each | 5 | +7 (12 total) | Upgrades the slot count. Android: 7 uses at level 2 |
| 485 | Golden (revive) | 40 T | 10 | 1 | Raid: revives all fallen zombies at 100 energy |
| 565 | Grim Reaper | 50 T | 5 | – | Zombies earn **×2 XP** (one purchase only) |
| 619 | Yeti | 75 T | 10 | 3 | Summons the Yeti in a raid; duration scales with level |
| 654 | Super Server | 50 T | 5 | 1 | Café: **+1 to every server stat for 2 h** (7200 s in the table) |
| 777 / 778 / 779 | Pet tombstone L1 / L2 / L3 | $100 000 / 25 T / 50 T | 8 | – | Pets gain an XP bonus per kill: multiplier 1 / 2 / 3 |

Further rules:
- Recharging a tombstone early costs **2 T** (`TOMBSTONE_RECHARGE_COST`).
- Only one tombstone effect can run at a time [help].
- Tombstones are placed outside the café.
- Decorative tombstones (305–308) only add rating: +0.02, +0.04, +0.06, +0.08.

### 3.7 Pets and habitats (iOS `PetData` + type-18 items) [data]

| id | Pet (ref only) | HP | Stat A | Stat B | Stat C | Stat D | Crit chance | Crit × | Robot | Habitat price & bonus (paraphrased) |
|---|---|---|---|---|---|---|---|---|---|---|
| 0 | Wolf | 950 | 11 | 8 | 9 | 7 | 0.2 | 3.0 | – | 50 T, Lv 8: −2 % recipe cost |
| 1 | Undead Rottweiler | 250 | 5 | 5 | 7 | 5 | 0.1 | 2.0 | – | $25 000, Lv 8: +1 tip on raid recipes |
| 2 | Cheshire Cat | 900 | 9 | 11 | 9 | 6 | 0.2 | 3.0 | – | 50 T, Lv 8: +5 % cook XP on Alice recipes |
| 3 | Sphinx | 1000 | 10 | 9 | 8 | 9 | 0.2 | 2.0 | – | 50 T, Lv 8: +5 % cook XP on Egyptian recipes |
| 4 | Robot A (hound) | 900 | 10 | 9 | 5 | 5 | 0.2 | 3.0 | yes | 40 T, Lv 12: +5 % XP on Super Mutant recipes |
| 5 | Robot B (lion) | 1000 | 10 | 10 | 9 | 7 | 0.2 | 3.0 | yes | 60 T, Lv 12: +1 speed for zombie servers |
| 6 | Robot C (bear) | 500 | 6 | 5 | 6 | 6 | 0.1 | 2.0 | yes | 20 T, Lv 12: −2 % cost on Super Hero recipes |
| 7 | Robot D (bull) | 650 | 9 | 6 | 4 | 3 | 0.1 | 2.0 | yes | 30 T, Lv 12: +1 % zombie regen |
| 8 | Robot E (panther) | 300 | 5 | 6 | 8 | 4 | 0.1 | 2.0 | yes | $50 000, Lv 12: +1 tip on General recipes |

Rules:
- Buying a habitat (pet house) gives you the pet [help].
- Pets fight in raids but do not serve.
- **All 5 robots together** combine into a giant robot during a raid. It has its own clips: appear 107 f, walk 50 f, special attack 39 f (§8).
- Each pet record also holds a per-pet "20" and "1" (likely a revive or energize price of 20 T [inf]), and a trailing short (6, 12, 14 or 255) whose meaning is unknown.
- Pets have dog-style clips including a separate **critical attack** (65 f). This matches the crit chance (0.1–0.2) and crit multiplier (×2–×3).

### 3.8 Rating ("popularity") items [data]

Rating contribution by function (iOS):

| Function | Items | Rating > 0 | Max rating | Median $ price of rated |
|---|---|---|---|---|
| decor | 183 | 99 | 0.2 | 7000 |
| wallDecor | 108 | 67 | 0.15 | 3000 |
| floor | 84 | 1 | 0.01 | 3000 |
| chair | 76 | 27 | 0.15 | 3500 |
| table | 71 | 31 | 0.05 | 6000 |
| wall | 62 | 0 | 0 | - |
| stove | 60 | 48 | 0.05 | 10000 |
| pot/divider | 28 | 0 | 0 | - |
| counter | 19 | 14 | 0.04 | 5000 |
| expansion | 19 | 0 | 0 | - |
| tombstone | 15 | 8 | 0.08 | 100000 |
| sink | 13 | 8 | 0.04 | 5000 |
| fridge | 12 | 9 | 0.04 | 25000 |
| habitat | 9 | 9 | 0.02 | 50000 |
| cash | 4 | 0 | 0 | - |
| toxinGenerator | 2 | 0 | 0 | - |
| billboard | 2 | 0 | 0 | - |
| burnTimeBooster | 2 | 0 | 0 | - |
| toxinBarrel | 1 | 0 | 0 | - |

Top 40 items by rating:

| id | Item (ref only) | Lv | Price | Function | Tab | Size | Rating | $/h / cap | Stove x | XP |
|---|---|---|---|---|---|---|---|---|---|---|
| 494 | Zombie Chef Mascot Statue | 11 | T50 | decor | 1 | 1x1 | 0.2 |  | 0 | 5000 |
| 487 | Power Punch | 11 | T50 | decor | 5 | 1x1 | 0.15 | 350/4000 | 0 | 3000 |
| 488 | Zombie Man Arcade Booth | 11 | T70 | decor | 5 | 1x1 | 0.15 | 400/6000 | 0 | 3000 |
| 492 | Golden Slot Machine | 11 | T80 | decor | 5 | 1x1 | 0.15 | 350/7000 | 0 | 3500 |
| 493 | Roulette Table | 11 | T50 | decor | 5 | 1x2 | 0.15 | 350/6000 | 0 | 4000 |
| 495 | Throne of Bones | 11 | T10 | chair | 3 | 1x1 | 0.15 |  | 0 | 1000 |
| 710 | Ancient Statue | 20 | T55 | decor | 1 | 1x1 | 0.15 |  | 0 | 5000 |
| 721 | Rock Guitar | 21 | $650000 | wallDecor | 1 | 1x1 | 0.15 |  | 1 | 4000 |
| 474 | Super Hero Power Armor | 14 | T55 | decor | 1 | 2x2 | 0.13 |  | 0 | 5000 |
| 176 | Van Gogh's Self Portrait as Zombie | 20 | $610100 | wallDecor | 4 | 1x1 | 0.12 |  | 1 | 3000 |
| 177 | Van Gogh's Self Portrait as Zombie | 20 | T75 | wallDecor | 4 | 1x1 | 0.12 |  | 1 | 6000 |
| 266 | Van Gogh's Starry Night | 21 | T75 | wallDecor | 4 | 1x1 | 0.12 |  | 1 | 3000 |
| 279 | Home Sweet Home Sign | 22 | T50 | wallDecor | 4 | 1x1 | 0.12 |  | 1 | 3000 |
| 294 | Foo Dog | 22 | T35 | decor | 1 | 1x1 | 0.12 |  | 1 | 900 |
| 295 | Dragon Painting | 5 | T80 | wallDecor | 4 | 1x1 | 0.12 |  | 1 | 4000 |
| 466 | Portrait of Vlad | 13 | $666000 | wallDecor | 4 | 1x1 | 0.12 |  | 0 | 3000 |
| 467 | Portrait of Vlad | 13 | T75 | wallDecor | 4 | 1x1 | 0.12 |  | 0 | 6000 |
| 476 | Hero Research Center | 14 | T50 | decor | 1 | 1x1 | 0.12 |  | 0 | 3000 |
| 519 | Classic Mobster Rider | 15 | T50 | decor | 1 | 1x2 | 0.12 |  | 0 | 3000 |
| 702 | Stuffed Head | 19 | T75 | wallDecor | 1 | 1x1 | 0.12 |  | 1 | 6000 |
| 709 | Roulette Table | 20 | T50 | decor | 5 | 1x2 | 0.12 | 400/5500 | 1 | 3500 |
| 711 | Cryostasis Pod | 20 | T85 | decor | 1 | 1x2 | 0.12 |  | 1 | 7000 |
| 712 | Attack Chopper | 20 | T60 | decor | 5 | 2x2 | 0.12 | 350/6000 | 1 | 4000 |
| 720 | Rock Drum Kit | 21 | T85 | decor | 1 | 2x1 | 0.12 |  | 1 | 7000 |
| 723 | Rock Platinum Record | 21 | T75 | wallDecor | 4 | 1x1 | 0.12 |  | 1 | 6000 |
| 724 | Rock Record Player | 21 | T60 | decor | 5 | 1x1 | 0.12 | 375/6500 | 1 | 4000 |
| 722 | Rock Gold Record | 21 | T70 | wallDecor | 4 | 1x1 | 0.11 |  | 1 | 5600 |
| 314 | Coat of Arms | 11 | T40 | wallDecor | 1 | 1x1 | 0.1 |  | 1 | 3000 |
| 490 | Arcade Racer | 11 | T50 | decor | 5 | 1x1 | 0.1 | 400/5500 | 0 | 3500 |
| 491 | Monster Pet Shop Crane Game | 11 | T40 | decor | 5 | 1x1 | 0.1 | 200/3000 | 0 | 2000 |
| 514 | Sarcophagus | 12 | T40 | decor | 1 | 1x1 | 0.1 |  | 0 | 1200 |
| 653 | Motorcycle | 11 | T40 | decor | 1 | 1x2 | 0.1 | 0/0 | 0 | 4000 |
| 308 | Decorative Tombstone 4 | 5 | T20 | tombstone | 1 | 1x1 | 0.08 |  | 1 | 35 |
| 317 | Pub Sign | 12 | T20 | wallDecor | 4 | 1x1 | 0.08 |  | 1 | 1000 |
| 471 | Mad Griller Wanted Poster | 14 | T35 | wallDecor | 4 | 1x1 | 0.08 |  | 0 | 2400 |
| 501 | Skeleton Bear | 15 | T35 | decor | 1 | 1x1 | 0.08 |  | 1 | 2400 |
| 526 | Atlas Sculpture | 17 | T35 | decor | 1 | 1x1 | 0.08 | 0/0 | 0 | 2400 |
| 654 | Super Server Tombstone | 5 | T50 | tombstone | 5 | 1x1 | 0.08 |  | 0 | 3000 |
| 159 | Zombeer Ad | 17 | T30 | wallDecor | 4 | 1x1 | 0.07 |  | 1 | 1200 |
| 606 | Dragon Skull | 10 | T30 | decor | 1 | 2x2 | 0.07 | 0/0 | 0 | 2500 |

The full iOS item list (770 cleanly decoded rows) is in **Appendix A**.

---

## 4. Progression and economy

### 4.1 Level / XP curve, crew cap, recipe unlocks (iOS 100 levels; Android = the first 83 rows, identical) [data]

- XP needed per level grows about ×1.10 per level after level 40.
- The **crew cap** is 1 at level 1, +1 every 2 levels to 10 at level 17, then 11 at level 27, 12 at 36, 13 at 46 and 14 from 56 (`zombieCaps`).
- "Recipe unlock index" is the internal running count of level-unlocked recipes (`recipeUnlocks`).
- "XP scaler" (`XP_SCALER`) is a per-level multiplier whose use was not traced [inf: it scales the XP from cash purchases or orders].

| Lv | Total XP to reach | XP for this level | Crew cap | Recipe unlock index | XP scaler |
|---|---|---|---|---|---|
| 1 | 0 | 0 | 1 | 0 | 1 |
| 2 | 3 | 3 | 2 | 2 | 1 |
| 3 | 12 | 9 | 3 | 4 | 1 |
| 4 | 30 | 18 | 3 | 6 | 1 |
| 5 | 75 | 45 | 4 | 9 | 1 |
| 6 | 150 | 75 | 4 | 12 | 1 |
| 7 | 274 | 124 | 5 | 15 | 1.5 |
| 8 | 465 | 191 | 5 | 18 | 1.5 |
| 9 | 791 | 326 | 6 | 20 | 2 |
| 10 | 1265 | 474 | 6 | 23 | 2 |
| 11 | 2024 | 759 | 7 | 26 | 4 |
| 12 | 3036 | 1012 | 7 | 28 | 7 |
| 13 | 4251 | 1215 | 8 | 30 | 7 |
| 14 | 5526 | 1275 | 8 | 32 | 12 |
| 15 | 7184 | 1658 | 9 | 34 | 16 |
| 16 | 8621 | 1437 | 9 | 36 | 17 |
| 17 | 10345 | 1724 | 10 | 38 | 20 |
| 18 | 12414 | 2069 | 10 | 40 | 20 |
| 19 | 13655 | 1241 | 10 | 42 | 20 |
| 20 | 15021 | 1366 | 10 | 44 | 20 |
| 21 | 16523 | 1502 | 10 | 44 | 22 |
| 22 | 18175 | 1652 | 10 | 44 | 22 |
| 23 | 19992 | 1817 | 10 | 44 | 22 |
| 24 | 21992 | 2000 | 10 | 54 | 22 |
| 25 | 24191 | 2199 | 10 | 56 | 23 |
| 26 | 26610 | 2419 | 10 | 57 | 23 |
| 27 | 29271 | 2661 | 11 | 63 | 23 |
| 28 | 32198 | 2927 | 11 | 64 | 23 |
| 29 | 35418 | 3220 | 11 | 65 | 23 |
| 30 | 42501 | 7083 | 11 | 68 | 24 |
| 31 | 51001 | 8500 | 11 | 69 | 24 |
| 32 | 61202 | 10201 | 11 | 70 | 25 |
| 33 | 73442 | 12240 | 11 | 74 | 26 |
| 34 | 88130 | 14688 | 11 | 75 | 26 |
| 35 | 105757 | 17627 | 11 | 76 | 27 |
| 36 | 116332 | 10575 | 12 | 77 | 28 |
| 37 | 127965 | 11633 | 12 | 78 | 28 |
| 38 | 147160 | 19195 | 12 | 79 | 29 |
| 39 | 161876 | 14716 | 12 | 88 | 30 |
| 40 | 178064 | 16188 | 12 | 89 | 30 |
| 41 | 195870 | 17806 | 12 | 90 | 31 |
| 42 | 215457 | 19587 | 12 | 98 | 31 |
| 43 | 237003 | 21546 | 12 | 99 | 32 |
| 44 | 260703 | 23700 | 12 | 100 | 32 |
| 45 | 286773 | 26070 | 12 | 107 | 33 |
| 46 | 315451 | 28678 | 13 | 108 | 33 |
| 47 | 346996 | 31545 | 13 | 109 | 34 |
| 48 | 381695 | 34699 | 13 | 116 | 34 |
| 49 | 419865 | 38170 | 13 | 117 | 35 |
| 50 | 461851 | 41986 | 13 | 118 | 35 |
| 51 | 508036 | 46185 | 13 | 119 | 36 |
| 52 | 558840 | 50804 | 13 | 120 | 37 |
| 53 | 614724 | 55884 | 13 | 121 | 37 |
| 54 | 676196 | 61472 | 13 | 131 | 38 |
| 55 | 743816 | 67620 | 13 | 132 | 38 |
| 56 | 818198 | 74382 | 14 | 133 | 38 |
| 57 | 900017 | 81819 | 14 | 142 | 39 |
| 58 | 990019 | 90002 | 14 | 143 | 39 |
| 59 | 1089021 | 99002 | 14 | 144 | 39 |
| 60 | 1197923 | 108902 | 14 | 151 | 40 |
| 61 | 1317715 | 119792 | 14 | 152 | 40 |
| 62 | 1449487 | 131772 | 14 | 153 | 40 |
| 63 | 1594435 | 144948 | 14 | 154 | 41 |
| 64 | 1753879 | 159444 | 14 | 155 | 41 |
| 65 | 1929267 | 175388 | 14 | 156 | 41 |
| 66 | 2122194 | 192927 | 14 | 163 | 42 |
| 67 | 2334413 | 212219 | 14 | 164 | 42 |
| 68 | 2567854 | 233441 | 14 | 165 | 42 |
| 69 | 2824639 | 256785 | 14 | 166 | 43 |
| 70 | 3107103 | 282464 | 14 | 167 | 43 |
| 71 | 3417813 | 310710 | 14 | 168 | 43 |
| 72 | 3759594 | 341781 | 14 | 178 | 44 |
| 73 | 4135553 | 375959 | 14 | 179 | 44 |
| 74 | 4549108 | 413555 | 14 | 180 | 44 |
| 75 | 5004019 | 454911 | 14 | 189 | 45 |
| 76 | 5504421 | 500402 | 14 | 190 | 45 |
| 77 | 6054863 | 550442 | 14 | 191 | 45 |
| 78 | 6660349 | 605486 | 14 | 198 | 46 |
| 79 | 7326384 | 666035 | 14 | 199 | 46 |
| 80 | 8059022 | 732638 | 14 | 200 | 46 |
| 81 | 8864924 | 805902 | 14 | 209 | 47 |
| 82 | 9751416 | 886492 | 14 | 210 | 47 |
| 83 | 10726558 | 975142 | 14 | 211 | 47 |
| 84 | 11799214 | 1072656 | 14 | 214 | 48 |
| 85 | 12979135 | 1179921 | 14 | 215 | 48 |
| 86 | 14277049 | 1297914 | 14 | 216 | 48 |
| 87 | 15704754 | 1427705 | 14 | 219 | 49 |
| 88 | 17275229 | 1570475 | 14 | 220 | 49 |
| 89 | 19002752 | 1727523 | 14 | 221 | 49 |
| 90 | 20903027 | 1900275 | 14 | 222 | 50 |
| 91 | 22993329 | 2090302 | 14 | 223 | 50 |
| 92 | 25292662 | 2299333 | 14 | 224 | 50 |
| 93 | 27821928 | 2529266 | 14 | 231 | 51 |
| 94 | 30604121 | 2782193 | 14 | 232 | 51 |
| 95 | 33664533 | 3060412 | 14 | 233 | 51 |
| 96 | 37030987 | 3366454 | 14 | 238 | 52 |
| 97 | 40734086 | 3703099 | 14 | 239 | 52 |
| 98 | 44807495 | 4073409 | 14 | 240 | 52 |
| 99 | 49288245 | 4480750 | 14 | 247 | 53 |
| 100 | 54217070 | 4928825 | 14 | 248 | 53 |

### 4.2 Zombie (staff) levels [data]

- 35 levels (`MAX_CHARACTER_LEVEL`).
- XP comes from serving: `SERVING_EXPERIENCE` = 1 per serve, plus raids.
- Each level multiplies max energy by **1.03** (`ZOMBIE_LEVEL_ENERGY_MULTIPLIER`). The Help says "+energy"; doc 08's "+5 %" was the wiki's figure.

| Zombie Lv | XP needed | Energy multiplier (1.03^n) |
|---|---|---|
| 1 | 100 | 1.03 |
| 2 | 300 | 1.06 |
| 3 | 600 | 1.09 |
| 4 | 1200 | 1.13 |
| 5 | 2400 | 1.16 |
| 6 | 3125 | 1.19 |
| 7 | 3906 | 1.23 |
| 8 | 4297 | 1.27 |
| 9 | 4941 | 1.30 |
| 10 | 5682 | 1.34 |
| 11 | 6534 | 1.38 |
| 12 | 7514 | 1.43 |
| 13 | 8641 | 1.47 |
| 14 | 9505 | 1.51 |
| 15 | 10455 | 1.56 |
| 16 | 11500 | 1.60 |
| 17 | 12651 | 1.65 |
| 18 | 13916 | 1.70 |
| 19 | 15307 | 1.75 |
| 20 | 16838 | 1.81 |
| 21 | 18521 | 1.86 |
| 22 | 20374 | 1.92 |
| 23 | 22411 | 1.97 |
| 24 | 24652 | 2.03 |
| 25 | 27117 | 2.09 |
| 26 | 29829 | 2.16 |
| 27 | 32812 | 2.22 |
| 28 | 36093 | 2.29 |
| 29 | 39702 | 2.36 |
| 30 | 43672 | 2.43 |
| 31 | 48039 | 2.50 |
| 32 | 52844 | 2.58 |
| 33 | 58128 | 2.65 |
| 34 | 63940 | 2.73 |
| 35 | 70334 | 2.81 |

### 4.3 Recipe-collection XP bonus [data]

The bonus is paid once when the number of unlocked recipes reaches each threshold. iOS has 40 thresholds; Android stops at 550.

| Unlock # | Recipes unlocked (count) | XP bonus |
|---|---|---|
| 5 | 5 | 5 |
| 10 | 10 | 10 |
| 15 | 15 | 25 |
| 20 | 20 | 50 |
| 25 | 25 | 75 |
| 30 | 30 | 100 |
| 35 | 35 | 125 |
| 40 | 40 | 150 |
| 45 | 45 | 200 |
| 50 | 50 | 250 |
| 60 | 60 | 300 |
| 70 | 70 | 400 |
| 80 | 80 | 500 |
| 90 | 90 | 750 |
| 100 | 100 | 1000 |
| 125 | 125 | 1250 |
| 150 | 150 | 1500 |
| 175 | 175 | 1750 |
| 200 | 200 | 2000 |
| 225 | 225 | 2250 |
| 250 | 250 | 2500 |
| 275 | 275 | 2500 |
| 300 | 300 | 2500 |
| 325 | 325 | 2500 |
| 350 | 350 | 2500 |
| 375 | 375 | 7500 |
| 400 | 400 | 7500 |
| 425 | 425 | 7500 |
| 450 | 450 | 7500 |
| 475 | 475 | 7500 |
| 500 | 500 | 7500 |
| 525 | 525 | 7500 |
| 550 | 550 | 7500 |
| 575 | 575 | 7500 |
| 600 | 600 | 7500 |
| 625 | 625 | 7500 |
| 650 | 650 | 7500 |
| 675 | 675 | 7500 |
| 700 | 700 | 7500 |
| 725 | 725 | 7500 |

### 4.4 Economy and rating constants (Android `constants.bin.mid`; iOS stream matches where checked) [code]

| Constant | Value |
|---|---|
| Starting cash / toxin / popularity | $5000 / 5 T / 0.185 |
| Cash per toxin | 2000 |
| Item sell-back | 50 % |
| XP for spending | 100 XP per toxin spent; 0.025 XP per $ spent (`TOXIN/CASH_PURCHASE_XP_MULTIPLIER`) |
| Rating step | +0.005 per good event, −0.006 per bad event; one rise is capped at +0.4 |
| Zombie attacks a customer | −0.1 rating |
| Neglected rival nearby | −0.1 rating (`ENEMY_RATING_MODIFIER`); a "competitor is stealing your customers" alert after 24 h (`ENEMY_NOTIFIER_DURATION`) |
| Café closed | rating −1.852 × 10⁻⁸ per ms (= −0.067 per hour, in raw popularity units) |
| Diminishing-returns slopes | counters, tables and sinks 0.65; stoves 0.58; fridges 0.62 (`Furniture_*_SLOPE`) [inf: each extra item of a type counts for less] |
| Customers in café | about 2 at low popularity up to about 12 at high (`Cafe_AVERAGE_CUSTOMERS_*`), ±1 |
| Reopen a beaten rival early | 2 T (`CAFE_REOPEN_COST`) |
| Toxin from friends | 1 T at 1, 3 and 10 friends; 3 T per 3 referred friends; at most 100 awarded toxin per month |
| Clock-cheat penalty | grace 24 h; punishment 24–336 h; time × 10 (`EXPLOIT_*`) |
| Reanimation | Android: 8 h (28 800 000 ms). The iOS stream also contains a 3 600 000 (1 h) value, which matches the patch notes in doc 08 [inf] |

### 4.5 Objective system (purple stars) [code + help]

- 10 objectives × 4 tasks each.
- Task type ids and goals per task: `OBJECTIVE_TASK_TYPES` = 1, 2, 4, 7 / 0, 2, 5, 7 / 1, 3, 8, 9 / … and `OBJECTIVE_TASK_GOALS` = 2, 2, 2, 100 / 4, 2, 2, 100 / …. The full arrays are in the appendix dump.
- Each completed objective gives **+0.2 rating** (`RATING_PER_COMPLETION`). The purple star lasts 48 h (first), adds 36 h (second) and adds 24 h (third). The time bank is capped at 7 days.
- Bribing the reviewer costs **2 T per task**.
- Objective tasks scale with level: spend $100 × level; serve 10 × level customers; the longest recipe allowed in an objective is 12 h.
- The system unlocks at **Lv 6**.

### 4.6 Daily "Frequent Fryer" rewards [code]

| Day | Reward |
|---|---|
| 1 | $25 |
| 2 | $50 |
| 3 | 5 free dishes (recipe ids 2, 6, 14, 11, 4) |
| 4 | 4 dishes (8, 21, 32, 23) |
| 5 | 1 T |
| 6 | $250 |
| 7 | $350 |
| 8 | 3 dishes (17, 19, 25) |
| 9 | 3 dishes (34, 28, 9) |
| 10 | 3 T |
| 11+ | repeats from day 3 [inf from `REWARD11_DAY` = 3] |

Each day also has a 5 % chance of the rare recipe id 53.

### 4.7 Meat Locker [code]

- It stores spare zombies on hooks, outside the crew cap.
- **Each expansion costs 5 T and adds 5 hooks** (`GameStateMeetLocker::buyConfirmed` spends 5 toxin and adds 5; `expand` draws 5 hooks).
- The starting hook count was not traced (the wiki says 5).
- A zombie can be put back into the café or fired from the locker.

---

## 5. Raids (additions to doc 10 §2)

Doc 10 has the 83-level Android curves. Differences in iOS:
- **The per-level raid arrays run to level 100.**
  - Customers and servers stay at 9.
  - Chef HP stays at 770.
  - Cash = 10 × level (up to $1000).
  - XP = 2 × level, but drops back at levels 94–100 (170–180).
  - The toxin chance keeps rising to 0.09.
- `BOSS_APPEARANCE_PROBABILITY` by player level:
  - 0 % for levels 1–4;
  - 25, 40, 45, 50, 60, 70, 76, 79, 82, 84, 86, 88, 90, 92, 94, 96, 97, 98 % for levels 5–22;
  - **100 % from level 23**.
- The **boss multiplier** is 1.0 at level 5 and rises by 0.1 per level (8.7 at level 83).
- Boss cooldown is 4 h. Rivals reopen after 4 / 8 / 12 / 18 h.
- Eating a diner gives $20 + 2 XP + 5 HP.
- The iOS rival roster grows to **26 cafés**: 12 of them bosses, plus 4 promo cafés with "never" as their level gate.

| id | Rival (ref only) | Boss | Theme | Head chef id | Staff ids | Layout | Min player lv |
|---|---|---|---|---|---|---|---|
| 0 | Cafe |  | 0 | 109 | 55,56,57,58,59,60,61,62,63 | random 0/1 | 1 |
| 1 | Diner |  | 1 | 110 | 55,56,57,58,59,60,61,62,63 | random 0/1 | 1 |
| 2 | Italian Eatery |  | 2 | 111 | 55,56,57,58,59,60,61,62,63 | random 0/1 | 6 |
| 3 | Asian Restaurant |  | 3 | 112 | 55,56,57,58,59,60,61,62,63 | random 0/1 | 9 |
| 4 | Tex Mex |  | 4 | 113 | 55,56,57,58,59,60,61,62,63 | random 0/1 | 12 |
| 5 | Pub |  | 5 | 114 | 55,56,57,58,59,60,61,62,63 | random 0/1 | 15 |
| 6 | Chez |  | 6 | 115 | 55,56,57,58,59,60,61,62,63 | random 0/1 | 18 |
| 7 | Lab |  | 7 | 116 | 55,56,57,58,59,60,61,62,63 | random 0/1 | 10 |
| 8 | Frankenstein's Restaurant | yes | 9 | 127 | 128,129,130,131 | 2 | 5 |
| 9 | Leprechaun's Clover Field |  | 10 | 138 | 55,56,57,58,59,60,61,62,63 | random 0/1 | 8 |
| 10 | Gourmet Goblin |  | 11 | 188 | 189,190,191,192,193,194 | random 0/1 | 11 |
| 11 | Deadbeard's X'Spot |  | 12 | 200 | 195,196,197,198,199 | random 0/1 | 12 |
| 12 | Drac's Snack Shack | yes | 13 | 207 | 201,202,203,204,205,206 | 3 | 10 |
| 13 | The Grillin Villain | yes | 14 | 223 | 214 | 4 | 14 |
| 14 | The Pyramix | yes | 15 | 237 | 230,231,232,233,234 | 4 | 13 |
| 15 | Alpha  & Omega | yes | 16 | 247 | 238,239,240,241 | 4 | 17 |
| 16 | The Astro Gate | yes | 17 | 251 | 242,243,244,245,246,248 | 4 | 18 |
| 17 | The Rabbit Hole | yes | 18 | 265 | 252,253,254,255,256,257 | 4 | 18 |
| 18 | The Crypt | yes | 19 | 266 | 258,259,260,261,262,263,264 | 4 | 9 |
| 19 | Christmas Cafe | yes | 20 | 181 | 272,273 | 4 | 9 |
| 20 | Beeline Cafe |  | 21 | 79 | 55,56,57,58,59,60,61,62,63 | 1 | never (promo) |
| 21 | Beeline Cafe |  | 22 | 79 | 55,56,57,58,59,60,61,62,63 | 1 | never (promo) |
| 22 | Beeline Cafe |  | 23 | 93 | 55,56,57,58,59,60,61,62,63 | 2 | never (promo) |
| 23 | Beeline Cafe |  | 24 | 93 | 55,56,57,58,59,60,61,62,63 | 2 | never (promo) |
| 24 | Jane Wayne's Mess Hall |  | 26 | 311 | 117,118,119 | 4 | 7 |
| 25 | The End Zone |  | 25 | 312 | 43,45,168,309,308 | random 0/1 | 30 |

---

## 6. Help topics (iOS `help.html`, paraphrased)

| Topic | Rules it states |
|---|---|
| Café menu | Left-side buttons: logo → main menu; bag → store; map → raids and friends; clipboard → orders and raid tallies; book → recipe book (left/right = recipes, up/down = rare variants; picking a recipe puts it on a free stove, but you still assign a worker); zombie icon → staff bios, fire, count/limit. A bouncing "!" marks news. |
| Awning | Star rating = popularity; it rises with consistent service and with items. Level + XP bar (cooking and raiding give XP; each level unlocks recipes, rivals, zombies and items). Cash and toxin totals; buy toxin. **Tap the door to close; the rating slowly drops while closed.** |
| Chef avatar | Pick an avatar from the chef menu. Zombie avatars give more energy and defence when friends raid you. Beating special rival cafés unlocks avatars. |
| Cooking | Tap a stove to pick a recipe; the chef or any zombie can cook. Tap the stove to see the time left or the time before it spoils. Carry the finished dish to the counter (tap worker, then stove). **The worker must stay at the stove the whole cook.** Cooking drains zombie energy and is the best XP source. |
| Recipes | Four book groups: General (by level), Raid (from raids, friends or toxin), Themed (by buying stoves or with cash), Favourites (star button). |
| Variants | Spicy/Very Spicy = more XP; Fancy/Very Fancy = cost more, earn more; Bulk = more servings; Fresh = burns later; Frozen = cheaper but slower; Quick/Very Quick = faster. Rare versions come from stealing food in raids and from friend orders; studying unlocked dishes (UNLOCK in the fridge) is better than serving them and earns collection XP. |
| Serving | Assign a worker to a counter or table and they serve and clear plates automatically. **They need a clear path to every table, counter and sink; unreachable tables get no service.** More servers = less work and energy each. |
| Customers | Happy customers pay and raise the rating. No clean table or too long a wait → they leave unhappy and the rating drops. INFECT turns a customer into staff if there's room (or use the Meat Locker). The customer type decides worker quality; see the Zombiepedia. |
| Zombies | REST to recover energy; ENERGIZE spends 1 T. The MEATLOCKER button stores them. Tapping a work target reassigns. Zombies gain XP by serving and raiding, and a level-up raises max energy. They daydream or fall asleep. **Tired zombies make mistakes and may attack customers.** Stats differ: energy, strength, speed, tips, focus. |
| Tombstones | Placed outside. In a raid, tap one for a 5 s all-zombie bonus with a coloured glow; one bonus at a time. Strength and Health have 5 uses (12 when upgraded) and refill the next day. |
| Store | Buy by placing; long-press to move; "$" to sell. Some items are level-locked. Cash items fill up ("$", "!" = full). Star items raise the rating faster and let it fall slower. Toxin barrels speed energy regeneration and stack. Expansions add room. Special stoves unlock cookbooks (2 recipes each, more per upgrade). Pets: each house gives a café bonus, and pets join raids; the 5 robo-pets combine. |
| Storage | The box icon opens stored items; place them back from there. |
| Map | Friends to the left, rivals to the right. Franchise fees; one food order per friend per day; orders are cooked and delivered through the fridge and an order board (Pending / In-Progress / Deliver). A green-tinted café = under clock-cheat investigation. |
| Raids | Tap a zombie, then ATTACK (rampage) or a target (a person, or food to steal). White flag = retreat. A beaten rival closes and a new one opens later. **A rival left alone steals your customers.** Raids give rare recipes and sometimes toxin. |
| Boss fights | After level 5 an extra boss café sometimes appears, giving a rare recipe and an avatar. It gets likelier each level; at levels 24–26 it appears as a regular rival. |
| Raiding friends | Once a day; the friend loses nothing; you see the results on your clipboard. |
| Leaderboard | Ranked by dishes delivered to friends over a rolling 7 days. |
| Objectives | Unlock at level 6. A 4-task to-do list. A purple star lasts 48 h / +36 h / +24 h, with the bank capped at 168 h. Bribe = 2 T per task. Four task kinds: cooking, social, café, raiding. |
| FAQ | The café earns while the app is closed (slower). Dishes stack on one counter without overwriting. Burn multipliers 5× / 4× / 3× by cook length (see §1.1). Closing drops the rating more slowly than running out of food. A screaming customer or idle zombie = a blocked path. |

The Android `help_google.html` is the older text. Its differences: burn = cook time (Mystery Meat 5 min); tombstones 5 uses then 24 h; no pets, Meat Locker or avatars.

---

## 7. Sounds and music

### 7.1 Sound effects

The iOS `SoundData` has 227 ids → `.caf`. The Android `res/raw` has 204 `.ogg` files with the same names in lower case. Trigger events were read from the Android call sites of `ZombieCafe::playEffect(id)`; they use the same id order.

| Sound id(s) | Plays when [code] |
|---|---|
| 8 Cash1 | infect bought, store purchase, item sold in edit mode |
| 9 Cash2 | toxin pack bought, item bought, a customer pays after eating, offline earnings collected |
| 183 Cash2Tip | a customer leaves a tip |
| 14 Frying | cooking-task loop (every cook, whatever the station) |
| 191 EggTimer1 | a stove finishes, or is finished instantly |
| 193 Dish5 / 195 Dish7 | server hands a dish over / dish carried to the counter or delivered from the fridge |
| 65 DoorOpen1 | café door opened or closed |
| 96 ZombieEating4 | a zombie feasting on a customer |
| 198 / 199 DaydreamMale/Female | a daydream starts, or the zombie rests |
| 113 Grunt19 | the union-rep message box pops up |
| 64 PutDownItem1, 90/91/189 ObjectPlacement | moving or placing furniture |
| 185 BuyError1 | can't afford |
| 184 BookClose1, 35 PageFlip4 | recipe book closes / page turns |
| 33 PageFlip2 | HUD button press |
| 36 Click1, 40 Click5, 56 Click21 | dialog buttons, confirm, store/HUD buttons |
| 197 Camera | photo / screenshot |
| 200 Pop4 | notice dialog |
| 201 HauntedHouseTransformationPoof | the map turns into the boss café, and back |
| 97 Fly, 99 NeonSign | main-menu ambience |
| base + random | groans and group screams (`CharacterInstance::groan` / `groupScream`), plate cleanup, infect, serve. A random pick from the matching voice group (male, female, zombie) |

All 227 ids by group:

| Group | Count | Sound ids : file stems (iOS SoundData order) |
|---|---|---|
| Kitchen / cooking | 7 | 0:BlenderShort, 1:Blender, 11:Chopping1, 13:DrinkPour, 14:Frying, 57:LongCook, 191:EggTimer1 |
| Zombie voice (brains, groans, grunts) | 39 | 2:Brains1, 3:Brains2, 4:Brains3, 5:Brains4, 6:Brains5, 7:Brains6, 15:Groan1, 16:Groan2, 17:Groan3, 18:Groan4, 19:Groan5, 20:Groan6, 21:Grunt1, 22:Grunt2, 23:Grunt3, 24:Grunt4, 25:Grunt5, 26:Grunt6, 27:Grunt7, 28:Grunt8, 29:Grunt9, 30:Grunt10, 31:Grunt11, 86:Groan7, 87:Groan8, 88:Groan9, 89:Groan10, 107:Grunt12, 108:Grunt13, 109:Grunt14, 110:Grunt15, 111:Grunt16, 112:Grunt17, 113:Grunt18, 114:Grunt19, 115:Grunt20, 116:Grunt21, 117:Grunt22, 118:Grunt23 |
| Money | 4 | 8:Cash1, 9:Cash2, 10:Cash3, 183:Cash2Tip |
| Ambience / props | 5 | 12:DinnerAmbientLoop, 65:DoorOpen1, 97:Fly, 98:SignFlicker, 99:NeonSign |
| UI clicks / buttons | 37 | 32:PageFlip1, 33:PageFlip2, 34:PageFlip3, 35:PageFlip4, 36:Click1, 37:Click2, 38:Click3, 39:Click4, 40:Click5, 41:Click6, 42:Click7, 43:Click8, 44:Click9, 45:Click10, 46:Click11, 47:Click12, 48:Click13, 49:Click14, 50:Click15, 51:Click16, 52:Click17, 53:Click18, 54:Click19, 55:Click20, 56:Click21, 58:TextboxPop1, 177:Select1, 178:Select2, 179:Select3, 180:Select4, 181:Select5, 182:Select6, 184:BookClose1, 185:BuyError1, 190:UnlockDialog1, 197:Camera, 200:Pop4 |
| Dishes / serving | 8 | 59:Dish1, 60:Dish2, 61:Dish3, 192:Dish4, 193:Dish5, 194:Dish6, 195:Dish7, 196:Dish8 |
| Human voices: scream / grunt / die / "selected" | 70 | 62:ManScream1, 66:GroupScream1, 72:SelectingHuman1, 73:SelectingHuman2, 74:SelectingHuman3, 75:SelectingHuman4, 76:SelectingHuman5, 77:SelectingHuman6, 78:SelectingHuman7, 79:SelectingHuman8, 80:SelectingHuman9, 81:SelectingHuman10, 82:SelectingHuman11, 83:SelectingHuman12, 84:SelectingHuman13, 85:SelectingHuman14, 119:Scream1, 120:Scream2, 121:Scream3, 122:Scream4, 123:Scream5, 124:Scream6, 125:Scream7, 126:FemaleScream1, 127:FemaleScream2, 128:FemaleScream3, 129:FemaleScream4, 130:FemaleScream6, 131:FemaleScream7, 132:FemaleScream9, 133:FemaleScream10, 134:FemaleGroupScream1, 135:FemaleGroupScream2, 136:FemaleGroupScream3, 137:GroupScream2, 138:GroupScream3, 139:GroupScream4, 140:GroupScream5, 141:MaleGroupScream1, 142:MaleGroupScream2, 143:MaleGroupScream3, 144:MaleGrunt1, 145:MaleGrunt4, 146:MaleGrunt8, 147:MaleGrunt9, 148:MaleGrunt10, 149:MaleGrunt11, 150:MaleGrunt12, 151:MaleGrunt13, 152:MaleDying1, 153:MaleDying2, 154:MaleDying3, 155:MaleDying4, 156:MaleDying6, 157:MaleDying7, 158:MaleDying8, 159:FemaleGrunt1, 160:FemaleGrunt2, 161:FemaleGrunt3, 162:FemaleGrunt4, 163:FemaleGrunt5, 164:FemaleGrunt6, 165:FemaleGrunt7, 166:FemaleGrunt8, 167:FemaleGrunt9, 168:FemaleDying1Edit, 169:FemaleDying2, 170:FemaleDying6, 171:FemaleDying7Edit, 172:FemaleDying8 |
| Edit mode (furniture) | 8 | 63:PickUpItem1, 64:PutDownItem1, 90:ObjectPlacement1, 91:ObjectPlacement2, 186:Rotate1, 187:Rotate2, 188:Rotate3, 189:ObjectPlacement13 |
| Fight impacts | 12 | 67:Hit1, 68:Hit2, 69:Hit3, 70:Hit4, 71:Hit5, 100:Impact2, 101:Impact7, 102:Impact8, 103:Impact9, 104:Impact10, 105:Impact11, 106:Impact12 |
| Zombie eat / die / rest | 11 | 92:ZombieDying, 93:ZombieDying2, 94:ZombieDyingFemale, 95:ZombieDyingFemale2, 96:ZombieEating4, 173:ZombieRefreshMale1, 174:ZombieRefreshMale2, 175:ZombieRefreshFemale1, 176:ZombieRefreshFemale2, 198:DaydreamMale, 199:DaydreamFemale |
| Summons / boss transforms | 11 | 201:HauntedHouseTransformationPoof, 212:Tornado, 213:YetiPunch, 214:YetiSmash, 220:VoltronDetransform, 221:VoltronSpecialAttack, 222:VoltronTransform, 223:VoltronWalk, 224:BigBadWolf_attack, 225:BigBadWolf_detransform, 226:BigBadWolf_transform |
| Pets (animal + robot) | 15 | 202:AnimalDying, 203:AnimalDying2, 204:AnimalEating, 205:AnimalEating2, 206:AnimalGroan, 207:AnimalGroan2, 208:AnimalGrunt, 209:AnimalGrunt2, 210:AnimalRefresh, 211:AnimalRefresh2, 215:PetRobotAttack, 216:PetRobotEat, 217:PetRobotGroan, 218:PetRobotDead, 219:PetRobotRevive |

Café ambience is `DinnerAmbientLoop` (id 12). There is **no per-station cooking loop**: every station uses Frying (14), plus Blender, Chopping and LongCook as variety [inf].

### 7.2 Music (`MusicData`, 20 tracks, same order in the Android `.so`) [code]

| id | Track | Used by |
|---|---|---|
| 0 | Jazz | café background (picked at run time) [inf] |
| 1–6 | Stings 1–6 | raid events: start, win, lose and similar (`GameStateRaid::tick` and friend-raid attack mode use 1, 2 and 6) |
| 3 | Sting 3 | café event (level-up or objective) [inf] |
| 7 | Mini Cue 1 | raid |
| 10–13 | Themes V3, V4, V5, V1 | menu / café themes |
| 14 | Short stinger | — |
| 15 | Mini Cue 1 v2 | **map screen** |
| 16–18 | Transition grooves | screen transitions [inf] |
| 19 | Haunted House | **boss-café raid** |

---

## 8. Animation clips (iOS `.anim` vs doc 10)

- The iOS clips are a **re-authored set**. The header is little-endian: version, 41, frames, flags.
- Several character clips are shorter than doc 10's Android ones: celebrate 51 vs 93, attack2 21 vs 29, rise 8 vs 15, hit 15/15, death 15/15.
- **New in iOS: pets** (dog set: idle, walk, sit, sleep, attack1–3, critical attack, dead, appear, disappear), robot-pet appear/disappear, the **combined robot**, the **Yeti** summon (97-frame attack), the **wolf boss** (appear, idle, walk, attack, disappear) with transform/detransform (89 / 49 f), a **tornado** effect (8 f) and a human **kick** attack.

| Clip | iOS frames SW / NW | Seconds @24 fps | Doc 10 (Android) SW / NW | Note |
|---|---|---|---|---|
| attack2 | 21 / 21 | 0.88 | 29 / 29 | frame count differs |
| attack | 29 / 29 | 1.21 | 29 / 29 |  |
| attack_kick | 16 / 15 | 0.67 | - | NEW (not in doc 10) |
| bigBadWolf_appear | 89 / - | 3.71 | - | NEW (not in doc 10) |
| bigBadWolf_attack | 17 / 17 | 0.71 | - | NEW (not in doc 10) |
| bigBadWolf_disappear | 49 / - | 2.04 | - | NEW (not in doc 10) |
| bigBadWolf_idle | 54 / 54 | 2.25 | - | NEW (not in doc 10) |
| bigBadWolf_walk | 18 / 18 | 0.75 | - | NEW (not in doc 10) |
| bump | 15 / 15 | 0.62 | 15 / 15 |  |
| carry | 39 / 39 | 1.62 | 39 / 39 |  |
| celebrate | 51 / 51 | 2.12 | 93 / 93 | frame count differs |
| crouch | 20 / 20 | 0.83 | 20 / 20 |  |
| death | 15 / 15 | 0.62 | 15 / 18 | frame count differs |
| detransform | 49 / - | 2.04 | - | NEW (not in doc 10) |
| dog_appear | 13 / - | 0.54 | - | NEW (not in doc 10) |
| dog_attack1 | 45 / 45 | 1.88 | - | NEW (not in doc 10) |
| dog_attack2 | 22 / 22 | 0.92 | - | NEW (not in doc 10) |
| dog_attack3 | 27 / 27 | 1.12 | - | NEW (not in doc 10) |
| dog_critical_attack | 65 / 65 | 2.71 | - | NEW (not in doc 10) |
| dog_dead | 21 / 21 | 0.88 | - | NEW (not in doc 10) |
| dog_disappear | 8 / - | 0.33 | - | NEW (not in doc 10) |
| dog_idle | 65 / 65 | 2.71 | - | NEW (not in doc 10) |
| dog_sit | 1 / 1 | 0.04 | - | NEW (not in doc 10) |
| dog_sleep | 66 / 66 | 2.75 | - | NEW (not in doc 10) |
| dog_walk | 19 / 19 | 0.79 | - | NEW (not in doc 10) |
| eat | 58 / 58 | 2.42 | 58 / 58 |  |
| feast | 20 / 20 | 0.83 | 20 / 20 |  |
| hit | 15 / 15 | 0.62 | 18 / 16 | frame count differs |
| hung | 29 / - | 1.21 | 29 / 29 |  |
| hung2 | 8 / - | 0.33 | 8 / 8 |  |
| hungry | 60 / 60 | 2.50 | - | NEW (not in doc 10) |
| idle3 | 82 / 82 | 3.42 | 82 / 68 | frame count differs |
| idle5 | 39 / 39 | 1.62 | 39 / 39 |  |
| idle | 39 / 39 | 1.62 | 39 / 39 |  |
| mouthwipe | 26 / 26 | 1.08 | 26 / 26 |  |
| operate | 50 / 50 | 2.08 | 50 / 50 |  |
| rise | 8 / 8 | 0.33 | 15 / 15 | frame count differs |
| robotPetAppear | 13 / 13 | 0.54 | - | NEW (not in doc 10) |
| robotPetDisappear | 13 / 13 | 0.54 | - | NEW (not in doc 10) |
| robotdog_appear | 13 / 13 | 0.54 | - | NEW (not in doc 10) |
| robotdog_disappear | 13 / 13 | 0.54 | - | NEW (not in doc 10) |
| run | 16 / 17 | 0.67 | 16 / 15 | frame count differs |
| serve | 16 / 16 | 0.67 | 16 / 17 | frame count differs |
| sit | 1 / 1 | 0.04 | 1 / 1 |  |
| tornado | 8 / 8 | 0.33 | - | NEW (not in doc 10) |
| transform | 89 / - | 3.71 | - | NEW (not in doc 10) |
| voltron_appear | 107 / - | 4.46 | - | NEW (not in doc 10) |
| voltron_attackReg | 38 / 38 | 1.58 | - | NEW (not in doc 10) |
| voltron_attackSpe | 39 / 39 | 1.62 | - | NEW (not in doc 10) |
| voltron_disappear | 49 / - | 2.04 | - | NEW (not in doc 10) |
| voltron_idle | 46 / 46 | 1.92 | - | NEW (not in doc 10) |
| voltron_walk | 50 / 50 | 2.08 | - | NEW (not in doc 10) |
| walk2 | 39 / 39 | 1.62 | 39 / 39 |  |
| walk3 | 39 / 39 | 1.62 | 39 / 39 |  |
| walk4 | 39 / 39 | 1.62 | 39 / 39 |  |
| walk | 39 / 39 | 1.62 | 39 / 39 |  |
| yeti_attack | 97 / 97 | 4.04 | - | NEW (not in doc 10) |

Doc 10 clips with no iOS file: attackHuman, idle4, startled, hungry1, hungry2.

---

## Appendix A — Full iOS item table (770 rows)

The 8 rows marked BAD in the decoder (a donation box, campaign posters, Grill id 351, Super Booster), a misaligned duplicate Toxin Generator (id 484; the real one is id 496) and 13 trailing records have an extra block and are omitted. The Android equivalents of most of them are in `furnitureData`.

| id | Item (ref only) | Lv | Price | Function | Tab | Size | Rating | $/h / cap | Stove x | XP |
|---|---|---|---|---|---|---|---|---|---|---|
| 0 | Dirty Fridge | 0 | $50 | fridge | 7 | 1x1 | -0.01 |  | 1 | 0 |
| 1 | Dirty Stove | 0 | $50 | stove | 7 | 1x1 | -0.01 |  | 1 | 0 |
| 2 | Dirty Sink | 0 | $50 | sink | 7 | 1x1 | -0.01 |  | 1 | 0 |
| 3 | Plain Table | 0 | $150 | table | 3 | 1x1 | 0 |  | 1 | 2 |
| 4 | Plain Chair | 0 | $75 | chair | 3 | 1x1 | 0 |  | 1 | 1 |
| 5 | Boarded Window | 1 | $50 | wallDecor | 4 | 1x1 | 0 |  | 1 | 1 |
| 6 | Dead Plant | 0 | $5 | decor | 7 | 1x1 | -0.01 |  | 1 | 0 |
| 7 | Toxic Barrel | 1 | T50 | toxinBarrel | 5 | 1x1 | 0 |  | 1 | 2000 |
| 8 | Vending machine | 1 | $16000 | decor | 5 | 1x1 | 0 | 25/250 | 1 | 240 |
| 9 | Vending machine | 1 | T8 | decor | 5 | 1x1 | 0 | 25/250 | 1 | 320 |
| 10 | Flat Screen TV | 1 | $16000 | decor | 1 | 1x1 | 0.02 |  | 1 | 240 |
| 11 | Flat Screen TV | 1 | T8 | decor | 1 | 1x1 | 0.02 |  | 1 | 320 |
| 12 | Arcade Cabinet | 1 | $50000 | decor | 5 | 1x1 | 0 | 75/1000 | 1 | 750 |
| 13 | Arcade Cabinet 2 | 1 | T25 | decor | 5 | 1x1 | 0 | 100/1200 | 1 | 1000 |
| 14 | ATM | 1 | T60 | decor | 5 | 1x1 | 0 | 200/5000 | 1 | 2400 |
| 15 | Plain Stove | 1 | $500 | stove | 2 | 1x1 | 0 |  | 1 | 8 |
| 16 | Plain Serving Counter | 1 | $500 | counter | 2 | 1x1 | 0 |  | 1 | 8 |
| 17 | Plain Sink | 1 | $500 | sink | 2 | 1x1 | 0 |  | 1 | 8 |
| 18 | Plain Fridge | 1 | $500 | fridge | 2 | 1x1 | 0 |  | 1 | 8 |
| 19 | Yellow Plain Table | 1 | $200 | table | 3 | 1x1 | 0 |  | 1 | 3 |
| 20 | Green Plain Table | 1 | $200 | table | 3 | 1x1 | 0 |  | 1 | 3 |
| 21 | Blue Plain Table | 1 | $200 | table | 3 | 1x1 | 0 |  | 1 | 3 |
| 22 | Red Plain Table | 1 | $200 | table | 3 | 1x1 | 0 |  | 1 | 3 |
| 23 | Yellow Plain Chair | 1 | $100 | chair | 3 | 1x1 | 0 |  | 1 | 2 |
| 24 | Green Plain Chair | 1 | $100 | chair | 3 | 1x1 | 0 |  | 1 | 2 |
| 25 | Blue Plain Chair | 1 | $100 | chair | 3 | 1x1 | 0 |  | 1 | 2 |
| 26 | Red Plain Chair | 1 | $100 | chair | 3 | 1x1 | 0 |  | 1 | 2 |
| 27 | White Plain Wall | 1 | $30 | wall | 4 | 1x1 | 0 |  | 1 | 0 |
| 28 | Yellow Plain Wall | 1 | $20 | wall | 4 | 1x1 | 0 |  | 1 | 0 |
| 29 | Green Plain Wall | 1 | $40 | wall | 4 | 1x1 | 0 |  | 1 | 0 |
| 30 | Blue Plain Wall | 1 | $40 | wall | 4 | 1x1 | 0 |  | 1 | 0 |
| 31 | Red Plain Wall | 1 | $40 | wall | 4 | 1x1 | 0 |  | 1 | 0 |
| 32 | Black Plain Wall | 1 | $75 | wall | 4 | 1x1 | 0 |  | 1 | 1 |
| 33 | Small Window | 1 | $200 | wallDecor | 4 | 1x1 | 0 |  | 1 | 3 |
| 34 | White Plain Tiled Floor | 1 | $5 | floor | 4 | 1x1 | 0 |  | 1 | 0 |
| 35 | Yellow Plain Tiled Floor | 1 | $15 | floor | 4 | 1x1 | 0 |  | 1 | 0 |
| 36 | Green Plain Tiled Floor | 1 | $15 | floor | 4 | 1x1 | 0 |  | 1 | 0 |
| 37 | Blue Plain Tiled Floor | 1 | $15 | floor | 4 | 1x1 | 0 |  | 1 | 0 |
| 38 | Red Plain Tiled Floor | 1 | $15 | floor | 4 | 1x1 | 0 |  | 1 | 0 |
| 39 | Black Plain Tiled Floor | 1 | $25 | floor | 4 | 1x1 | 0 |  | 1 | 0 |
| 40 | Small Potted Plant | 1 | $100 | decor | 1 | 1x1 | 0 |  | 1 | 2 |
| 41 | Black Plain Table | 1 | T1 | table | 3 | 1x1 | 0.01 |  | 1 | 40 |
| 42 | Black Plain Chair | 1 | T1 | chair | 3 | 1x1 | 0.01 |  | 1 | 40 |
| 43 | Yellow Round Table | 2 | $225 | table | 3 | 1x1 | 0 |  | 1 | 3 |
| 44 | Green Round table | 2 | $225 | table | 3 | 1x1 | 0 |  | 1 | 3 |
| 45 | Blue Round table | 2 | $225 | table | 3 | 1x1 | 0 |  | 1 | 3 |
| 46 | Red Round table | 2 | $225 | table | 3 | 1x1 | 0 |  | 1 | 3 |
| 47 | Black Round table | 3 | T1 | table | 3 | 1x1 | 0.01 |  | 1 | 40 |
| 48 | Small Window Curtains | 2 | $200 | wallDecor | 4 | 1x1 | 0 |  | 1 | 3 |
| 49 | Small Potted Plant 2 | 2 | $100 | decor | 1 | 1x1 | 0 |  | 1 | 2 |
| 50 | Blue Standing Lamp | 2 | $300 | decor | 1 | 1x1 | 0 |  | 1 | 5 |
| 51 | Red Standing Lamp | 3 | $350 | decor | 1 | 1x1 | 0 |  | 1 | 5 |
| 52 | Yellow Standing Lamp | 4 | $350 | decor | 1 | 1x1 | 0 |  | 1 | 5 |
| 53 | White Standing Lamp | 5 | T1 | decor | 1 | 1x1 | 0.01 |  | 1 | 40 |
| 54 | Diner Chair | 3 | $150 | chair | 3 | 1x1 | 0 |  | 1 | 2 |
| 55 | Diner Stool | 3 | $130 | chair | 3 | 1x1 | 0 |  | 1 | 2 |
| 56 | Diner Table | 3 | $350 | table | 3 | 1x1 | 0 |  | 1 | 5 |
| 57 | Large Potted Plant | 4 | $500 | decor | 1 | 1x1 | 0 |  | 1 | 8 |
| 58 | White Plain Divider | 4 | $200 | decor | 1 | 1x1 | 0 |  | 1 | 3 |
| 59 | Yellow Plain Divider | 5 | $250 | decor | 1 | 1x1 | 0 |  | 1 | 4 |
| 60 | Green Plain Divider | 5 | $250 | decor | 1 | 1x1 | 0 |  | 1 | 4 |
| 61 | Blue Plain Divider | 5 | $250 | decor | 1 | 1x1 | 0 |  | 1 | 4 |
| 62 | Red Plain Divider | 5 | $250 | decor | 1 | 1x1 | 0 |  | 1 | 4 |
| 63 | Black Plain Divider | 6 | T1 | decor | 1 | 1x1 | 0.01 |  | 1 | 40 |
| 64 | Turquoise Diner Chair | 4 | $200 | chair | 3 | 1x1 | 0 |  | 1 | 3 |
| 65 | Turquoise Diner Stool | 4 | $175 | chair | 3 | 1x1 | 0 |  | 1 | 3 |
| 66 | Turquoise Diner Table | 4 | $400 | table | 3 | 1x1 | 0 |  | 1 | 6 |
| 67 | Steel Window | 4 | $750 | wallDecor | 4 | 1x1 | 0 |  | 1 | 11 |
| 68 | Coat Rack | 4 | $200 | decor | 1 | 1x1 | 0 |  | 1 | 3 |
| 69 | White Checkered Tile | 4 | $40 | floor | 4 | 1x1 | 0 |  | 1 | 0 |
| 70 | Yellow Checkered Tile | 5 | $50 | floor | 4 | 1x1 | 0 |  | 1 | 0 |
| 71 | Green Checkered Tile | 5 | $50 | floor | 4 | 1x1 | 0 |  | 1 | 0 |
| 72 | Blue Checkered Tile | 6 | $50 | floor | 4 | 1x1 | 0 |  | 1 | 0 |
| 73 | Red Checkered Tile | 6 | $50 | floor | 4 | 1x1 | 0 |  | 1 | 0 |
| 74 | Stainless Steel Stove | 5 | $25000 | stove | 2 | 1x1 | 0.02 |  | 1 | 375 |
| 75 | Stainless Steel Serving Counter | 5 | $15000 | counter | 2 | 1x1 | 0.01 |  | 1 | 225 |
| 76 | Stainless Steel Sink | 5 | $25000 | sink | 2 | 1x1 | 0.02 |  | 1 | 375 |
| 77 | Stainless Steel Fridge | 5 | $25000 | fridge | 2 | 1x1 | 0.02 |  | 1 | 375 |
| 78 | Neon Sign | 5 | $20000 | wallDecor | 4 | 1x1 | 0.02 |  | 1 | 300 |
| 79 | Neon Sign | 5 | T10 | wallDecor | 4 | 1x1 | 0.02 |  | 1 | 400 |
| 80 | Diner Wall Lamp | 5 | $250 | wallDecor | 4 | 1x1 | 0 |  | 1 | 4 |
| 81 | Jukebox | 5 | $40000 | decor | 5 | 1x1 | 0 | 55/1500 | 1 | 600 |
| 82 | Jukebox | 5 | T20 | decor | 5 | 1x1 | 0 | 75/1800 | 1 | 800 |
| 83 | Checkered Tile | 5 | $60 | floor | 4 | 1x1 | 0 |  | 1 | 1 |
| 84 | Large Window Curtains | 6 | $1000 | wallDecor | 4 | 1x1 | 0 |  | 1 | 15 |
| 85 | Large Window Blinds | 6 | $1100 | wallDecor | 4 | 1x1 | 0 |  | 1 | 17 |
| 86 | Classic Wooden Chair | 6 | $500 | chair | 3 | 1x1 | 0 |  | 1 | 8 |
| 87 | Red Checkered Table | 6 | $1000 | table | 3 | 1x1 | 0 |  | 1 | 15 |
| 88 | Trellis Divider | 6 | $1500 | decor | 1 | 1x1 | 0 |  | 1 | 23 |
| 89 | Wine Rack | 6 | $2500 | wallDecor | 1 | 1x1 | 0.01 |  | 1 | 38 |
| 90 | Wall Lamp | 6 | $500 | wallDecor | 4 | 1x1 | 0 |  | 1 | 8 |
| 91 | Yellow Hardwood Floor | 6 | $125 | floor | 4 | 1x1 | 0 |  | 1 | 2 |
| 92 | Brown Hardwood Floor | 7 | $150 | floor | 4 | 1x1 | 0 |  | 1 | 2 |
| 93 | White Hardwood Floor | 7 | $150 | floor | 4 | 1x1 | 0 |  | 1 | 2 |
| 94 | Large Potted Plant | 7 | $500 | decor | 1 | 1x1 | 0 |  | 1 | 8 |
| 95 | White Wooden Chair | 7 | $600 | chair | 3 | 1x1 | 0 |  | 1 | 9 |
| 96 | Yellow Wooden Chair | 8 | $600 | chair | 3 | 1x1 | 0 |  | 1 | 9 |
| 97 | Green Wooden Chair | 8 | $600 | chair | 3 | 1x1 | 0 |  | 1 | 9 |
| 98 | Blue Wooden Chair | 8 | $600 | chair | 3 | 1x1 | 0 |  | 1 | 9 |
| 99 | Red Wooden Chair | 8 | $600 | chair | 3 | 1x1 | 0 |  | 1 | 9 |
| 100 | Black Wooden Chair | 9 | T1 | chair | 3 | 1x1 | 0.01 |  | 1 | 40 |
| 101 | Brick wall | 7 | $250 | wall | 4 | 1x1 | 0 |  | 1 | 4 |
| 102 | Brick wall | 7 | $300 | wall | 4 | 1x1 | 0 |  | 1 | 5 |
| 103 | Brick wall | 7 | $300 | wall | 4 | 1x1 | 0 |  | 1 | 5 |
| 104 | Brick wall | 8 | $300 | wall | 4 | 1x1 | 0 |  | 1 | 5 |
| 105 | Brick wall | 8 | $300 | wall | 4 | 1x1 | 0 |  | 1 | 5 |
| 106 | Brick-lined Window | 7 | $1500 | wallDecor | 4 | 1x1 | 0 |  | 1 | 23 |
| 107 | Hardwood Floor | 7 | $175 | floor | 4 | 1x1 | 0 |  | 1 | 3 |
| 108 | Brick Wall | 9 | $500 | wall | 4 | 1x1 | 0 |  | 1 | 8 |
| 109 | Sleek Table | 9 | $1200 | table | 3 | 1x1 | 0 |  | 1 | 18 |
| 110 | Sleek Table | 9 | $1400 | table | 3 | 1x1 | 0 |  | 1 | 21 |
| 111 | Sleek Table | 9 | $1400 | table | 3 | 1x1 | 0 |  | 1 | 21 |
| 112 | Sleek Table | 9 | $1400 | table | 3 | 1x1 | 0 |  | 1 | 21 |
| 113 | Sleek Table | 9 | $1400 | table | 3 | 1x1 | 0 |  | 1 | 21 |
| 114 | Sleek Chair | 9 | $1000 | chair | 3 | 1x1 | 0 |  | 1 | 15 |
| 115 | Sleek Chair | 9 | $1200 | chair | 3 | 1x1 | 0 |  | 1 | 18 |
| 116 | Sleek Chair | 9 | $1200 | chair | 3 | 1x1 | 0 |  | 1 | 18 |
| 117 | Sleek Chair | 9 | $1200 | chair | 3 | 1x1 | 0 |  | 1 | 18 |
| 118 | Sleek Chair | 9 | $1200 | chair | 3 | 1x1 | 0 |  | 1 | 18 |
| 119 | Paper Lamp | 9 | $750 | wallDecor | 4 | 1x1 | 0 |  | 1 | 11 |
| 120 | Fish Tank | 9 | $8000 | decor | 1 | 1x1 | 0.01 |  | 1 | 120 |
| 121 | Sleek Table | 9 | T2 | table | 3 | 1x1 | 0.01 |  | 1 | 80 |
| 122 | Sleek Chair | 9 | T2 | chair | 3 | 1x1 | 0.01 |  | 1 | 80 |
| 123 | Potted Bamboo | 10 | $1000 | decor | 1 | 1x1 | 0 |  | 1 | 15 |
| 124 | Exotic Fish Tank | 10 | T15 | decor | 1 | 1x1 | 0.05 |  | 1 | 600 |
| 125 | Chopstick Poster | 10 | $30000 | wallDecor | 4 | 1x1 | 0.04 |  | 1 | 450 |
| 126 | Chopstick Poster | 9 | T15 | wallDecor | 4 | 1x1 | 0.04 |  | 1 | 600 |
| 127 | Bonsai Tree | 10 | $1500 | decor | 1 | 1x1 | 0 |  | 1 | 23 |
| 128 | Yellow Country Table | 12 | $1500 | table | 3 | 1x1 | 0 |  | 1 | 23 |
| 129 | Green Country Table | 13 | $1800 | table | 3 | 1x1 | 0 |  | 1 | 27 |
| 130 | White Country Table | 13 | $1800 | table | 3 | 1x1 | 0 |  | 1 | 27 |
| 131 | Red Country Table | 13 | $1800 | table | 3 | 1x1 | 0 |  | 1 | 27 |
| 132 | Yellow Country Chair | 12 | $1200 | chair | 3 | 1x1 | 0 |  | 1 | 18 |
| 133 | Light Yellow Country Chair | 13 | $1500 | chair | 3 | 1x1 | 0 |  | 1 | 23 |
| 134 | Green Country Chair | 13 | $1500 | chair | 3 | 1x1 | 0 |  | 1 | 23 |
| 135 | White Country Chair | 13 | $1500 | chair | 3 | 1x1 | 0 |  | 1 | 23 |
| 136 | Red Country Chair | 13 | $1500 | chair | 3 | 1x1 | 0 |  | 1 | 23 |
| 137 | Wood Panel Wall | 12 | $500 | wall | 4 | 1x1 | 0 |  | 1 | 8 |
| 138 | Slot Machine | 12 | $100000 | decor | 5 | 1x1 | 0 | 150/1800 | 1 | 1500 |
| 139 | Slot Machine | 11 | T50 | decor | 1 | 1x1 | 0 | 150/1800 | 1 | 2000 |
| 140 | Black Country Table | 13 | T2 | table | 3 | 1x1 | 0.01 |  | 1 | 80 |
| 141 | Black Country Chair | 13 | T2 | chair | 3 | 1x1 | 0.01 |  | 1 | 80 |
| 142 | Wagon Wheel | 13 | $1000 | wallDecor | 1 | 1x1 | 0 |  | 1 | 15 |
| 143 | Italian Window | 13 | $2000 | wallDecor | 4 | 1x1 | 0 |  | 1 | 30 |
| 144 | Potted Cactus | 13 | $2500 | decor | 1 | 1x1 | 0 |  | 1 | 38 |
| 145 | Brown Tile | 13 | $200 | floor | 4 | 1x1 | 0 |  | 1 | 3 |
| 146 | Wood Panel Wall | 14 | $600 | wall | 4 | 1x1 | 0 |  | 1 | 9 |
| 147 | Steer Skull | 14 | $1500 | wallDecor | 1 | 1x1 | 0 |  | 1 | 23 |
| 148 | Dartboard | 15 | $2000 | wallDecor | 1 | 1x1 | 0 |  | 1 | 30 |
| 149 | Bar Serving Counter | 15 | $2000 | counter | 2 | 1x1 | 0 |  | 1 | 30 |
| 150 | Foosball Table | 15 | $60000 | decor | 5 | 1x1 | 0 | 90/1000 | 1 | 900 |
| 151 | Foosball Table | 15 | T30 | decor | 5 | 1x1 | 0 | 100/1200 | 1 | 1200 |
| 152 | Grey Carpet | 15 | $500 | floor | 4 | 1x1 | 0 |  | 1 | 8 |
| 153 | Yellow Carpet | 16 | $600 | floor | 4 | 1x1 | 0 |  | 1 | 9 |
| 154 | Green Carpet | 16 | $600 | floor | 4 | 1x1 | 0 |  | 1 | 9 |
| 155 | Blue Carpet | 16 | $600 | floor | 4 | 1x1 | 0 |  | 1 | 9 |
| 156 | Red Carpet | 16 | $600 | floor | 4 | 1x1 | 0 |  | 1 | 9 |
| 157 | Large Wine Rack | 16 | $12000 | decor | 1 | 1x1 | 0.01 |  | 1 | 180 |
| 158 | Black Carpet | 16 | $800 | floor | 4 | 1x1 | 0 |  | 1 | 12 |
| 159 | Zombeer Ad | 17 | T30 | wallDecor | 4 | 1x1 | 0.07 |  | 1 | 1200 |
| 160 | White Tablecloth | 18 | $3000 | table | 3 | 1x1 | 0 |  | 1 | 45 |
| 161 | Maitre'd Stand | 18 | $12000 | decor | 1 | 1x1 | 0 |  | 1 | 180 |
| 162 | White Marble Tile | 18 | $700 | floor | 4 | 1x1 | 0 |  | 1 | 11 |
| 163 | Yellow Marble Tile | 18 | $850 | floor | 4 | 1x1 | 0 |  | 1 | 13 |
| 164 | Green Marble Tile | 19 | $850 | floor | 4 | 1x1 | 0 |  | 1 | 13 |
| 165 | Blue Marble Tile | 19 | $850 | floor | 4 | 1x1 | 0 |  | 1 | 13 |
| 166 | Red Marble Tile | 19 | $850 | floor | 4 | 1x1 | 0 |  | 1 | 13 |
| 167 | Grey Wallpaper | 19 | $1000 | wall | 4 | 1x1 | 0 |  | 1 | 15 |
| 168 | Yellow Wallpaper | 20 | $1200 | wall | 4 | 1x1 | 0 |  | 1 | 18 |
| 169 | Green Wallpaper | 20 | $1200 | wall | 4 | 1x1 | 0 |  | 1 | 18 |
| 170 | Blue Wallpaper | 20 | $1200 | wall | 4 | 1x1 | 0 |  | 1 | 18 |
| 171 | Red Wallpaper | 20 | $1200 | wall | 4 | 1x1 | 0 |  | 1 | 18 |
| 172 | Black Wallpaper | 20 | $1200 | wall | 4 | 1x1 | 0 |  | 1 | 18 |
| 173 | Candelabra | 19 | $3000 | wallDecor | 4 | 1x1 | 0 |  | 1 | 45 |
| 174 | Fountain | 19 | $50000 | decor | 1 | 1x1 | 0.03 |  | 1 | 750 |
| 175 | Velvet Rope Divider | 19 | $3000 | decor | 1 | 1x1 | 0 |  | 1 | 45 |
| 176 | Van Gogh's Self Portrait as Zombie | 20 | $610100 | wallDecor | 4 | 1x1 | 0.12 |  | 1 | 3000 |
| 177 | Van Gogh's Self Portrait as Zombie | 20 | T75 | wallDecor | 4 | 1x1 | 0.12 |  | 1 | 6000 |
| 178 | Black Marble Tile | 20 | $1000 | floor | 4 | 1x1 | 0 |  | 1 | 15 |
| 180 | Floor stain | 255 | $5 | floor | 7 | 1x1 | -0.01 |  | 1 | 0 |
| 181 | Loose tile | 255 | $5 | floor | 7 | 1x1 | -0.01 |  | 1 | 0 |
| 182 | $10000 Cash | 0 | T10 | cash | 5 | 1x1 | 0 |  | 1 | 0 |
| 183 | $50000 Cash | 0 | T25 | cash | 5 | 1x1 | 0 |  | 1 | 0 |
| 184 | $250000 Cash | 0 | T100 | cash | 5 | 1x1 | 0 |  | 1 | 0 |
| 185 | $1000000 Cash | 0 | T350 | cash | 5 | 1x1 | 0 |  | 1 | 0 |
| 186 | Pot | 255 | $0 | pot/divider | 7 | 1x1 | 0 |  | 1 | 0 |
| 187 | Plate | 255 | $0 | decor | 7 | 1x1 | 0 |  | 1 | 0 |
| 188 | Grass tile 1 | 255 | $0 | floor | 7 | 1x1 | 0 |  | 1 | 0 |
| 189 | Grass tile 2 | 255 | $0 | floor | 7 | 1x1 | 0 |  | 1 | 0 |
| 190 | Sidewalk tile | 255 | $0 | floor | 7 | 1x1 | 0 |  | 1 | 0 |
| 191 | Road tile | 255 | $0 | floor | 7 | 1x1 | 0 |  | 1 | 0 |
| 192 | Road stripe tile | 255 | $0 | floor | 7 | 1x1 | 0 |  | 1 | 0 |
| 193 | Dirty plate | 255 | $0 | decor | 7 | 1x1 | 0 |  | 1 | 0 |
| 194 | Tile cover | 255 | $0 | decor | 7 | 1x1 | 0 |  | 1 | 0 |
| 195 | Closed Door | 255 | $0 | decor | 7 | 1x1 | 0 |  | 1 | 0 |
| 196 | Open Door | 255 | $0 | decor | 7 | 1x1 | 0 |  | 1 | 0 |
| 197 | Burnt Pot | 255 | $0 | pot/divider | 7 | 1x1 | 0 |  | 1 | 0 |
| 198 | Expand to 8x7 | 0 | $2500 | expansion | 5 | 8x7 | 0 |  | 1 | 0 |
| 199 | Expand to 9x8 | 0 | $10000 | expansion | 5 | 9x8 | 0 |  | 1 | 0 |
| 200 | Expand to 9x8 | 0 | T10 | expansion | 5 | 9x8 | 0 |  | 1 | 0 |
| 201 | Expand to 10x9 | 0 | $25000 | expansion | 5 | 10x9 | 0 |  | 1 | 0 |
| 202 | Expand to 10x9 | 0 | T30 | expansion | 5 | 10x9 | 0 |  | 1 | 0 |
| 203 | Expand to 11x10 | 0 | $75000 | expansion | 5 | 11x10 | 0 |  | 1 | 0 |
| 204 | Expand to 11x10 | 0 | T40 | expansion | 5 | 11x10 | 0 |  | 1 | 0 |
| 205 | Red Trash Can | 1 | $1500 | sink | 2 | 1x1 | 0 |  | 1 | 23 |
| 206 | Diner Clock | 5 | $1500 | wallDecor | 1 | 1x1 | 0 |  | 1 | 23 |
| 207 | Specials Board | 6 | $12000 | wallDecor | 4 | 1x1 | 0.01 |  | 1 | 180 |
| 208 | Specials Board | 6 | T6 | wallDecor | 4 | 1x1 | 0.01 |  | 1 | 240 |
| 209 | Diner Wall | 6 | $250 | wall | 4 | 1x1 | 0 |  | 1 | 4 |
| 210 | Marble Serving Counter | 18 | $50000 | counter | 2 | 1x1 | 0.02 |  | 1 | 750 |
| 211 | Mad Scientist Control Panel 1 | 10 | $1000 | wallDecor | 1 | 1x1 | 0 |  | 1 | 15 |
| 212 | Mad Scientist Control Panel 3 | 10 | $1000 | wallDecor | 1 | 1x1 | 0 |  | 1 | 15 |
| 213 | Mad Scientist Control Panel 2 | 10 | T5 | wallDecor | 1 | 1x1 | 0.01 |  | 1 | 200 |
| 214 | Mad Scientist Floor | 10 | $185 | floor | 4 | 1x1 | 0 |  | 1 | 3 |
| 215 | Mad Scientist Cabinet 1 | 11 | $4500 | decor | 1 | 1x1 | 0.01 |  | 1 | 68 |
| 216 | Mad Scientist Cabinet 2 | 11 | $4500 | decor | 1 | 1x1 | 0.01 |  | 1 | 68 |
| 217 | Mad Scientist Chair | 10 | $1000 | chair | 3 | 1x1 | 0 |  | 1 | 15 |
| 218 | Mad Scientist Serving Counter | 10 | $7000 | counter | 2 | 1x1 | 0 |  | 1 | 105 |
| 219 | Mad Scientist Table | 10 | $1700 | table | 3 | 1x1 | 0 |  | 1 | 26 |
| 220 | Mad Scientist Wall | 10 | $600 | wall | 4 | 1x1 | 0 |  | 1 | 9 |
| 221 | Spindle Chair | 15 | $2000 | chair | 3 | 1x1 | 0 |  | 1 | 30 |
| 222 | Booth | 15 | $5000 | chair | 3 | 1x1 | 0.01 |  | 1 | 80 |
| 223 | Bookshelf | 15 | $3000 | wallDecor | 1 | 1x1 | 0 |  | 1 | 45 |
| 224 | Wood Pub Floor | 15 | $500 | floor | 4 | 1x1 | 0 |  | 1 | 8 |
| 225 | Pool Table | 15 | T40 | decor | 5 | 1x1 | 0 | 125/2000 | 1 | 1600 |
| 226 | Pub Serving Counter | 15 | T2 | counter | 2 | 1x1 | 0.01 |  | 1 | 80 |
| 227 | Pub Table | 15 | $3000 | table | 3 | 1x1 | 0 |  | 1 | 45 |
| 228 | Pub Window | 15 | $5000 | wallDecor | 4 | 1x1 | 0 |  | 1 | 75 |
| 229 | Stone Window | 15 | $4000 | wallDecor | 4 | 1x1 | 0 |  | 1 | 60 |
| 230 | Tiffany Lamp 1 | 15 | $10000 | decor | 1 | 1x1 | 0 |  | 1 | 150 |
| 231 | Tiffany Lamp 2 | 15 | $10000 | decor | 1 | 1x1 | 0 |  | 1 | 150 |
| 232 | Tiffany Lamp 3 | 15 | $10000 | decor | 1 | 1x1 | 0 |  | 1 | 150 |
| 233 | Green Trash Bin | 15 | $3000 | sink | 2 | 1x1 | 0 |  | 1 | 45 |
| 234 | Pub Wall | 15 | $600 | wall | 4 | 1x1 | 0 |  | 1 | 9 |
| 235 | Stone Wall | 15 | $600 | wall | 4 | 1x1 | 0 |  | 1 | 9 |
| 236 | Expand to 12x11 | 0 | $75000 | expansion | 5 | 12x11 | 0 |  | 1 | 0 |
| 237 | Expand to 12x11 | 0 | T40 | expansion | 5 | 12x11 | 0 |  | 1 | 0 |
| 238 | Hippie Poster 1 | 6 | $500 | wallDecor | 4 | 1x1 | 0 |  | 1 | 8 |
| 239 | Hippie Poster 2 | 8 | $1000 | wallDecor | 4 | 1x1 | 0 |  | 1 | 15 |
| 240 | Guitar | 6 | $1200 | decor | 1 | 1x1 | 0 |  | 1 | 18 |
| 241 | Hanging Plant | 6 | $500 | wallDecor | 1 | 1x1 | 0 |  | 1 | 8 |
| 242 | Planter | 6 | $500 | decor | 1 | 1x1 | 0 |  | 1 | 8 |
| 243 | Barbed Wire | 6 | $250 | decor | 1 | 1x1 | 0 |  | 1 | 4 |
| 244 | Sand Bags 1 | 6 | $250 | decor | 1 | 1x1 | 0 |  | 1 | 4 |
| 245 | Sand Bags 2 | 6 | $250 | decor | 1 | 1x1 | 0 |  | 1 | 4 |
| 246 | Wall Sconce | 6 | $500 | wallDecor | 4 | 1x1 | 0 |  | 1 | 8 |
| 247 | Fancy Window | 6 | $1000 | wallDecor | 4 | 1x1 | 0 |  | 1 | 15 |
| 248 | Magic Fridge | 1 | T30 | fridge | 2 | 1x1 | 0.01 |  | 1 | 1200 |
| 249 | Suped-Up Fridge | 7 | $25000 | fridge | 2 | 1x1 | 0.01 |  | 1 | 375 |
| 250 | Hippie Table | 6 | $1000 | table | 3 | 1x1 | 0.01 |  | 1 | 15 |
| 251 | Fancy Table | 6 | T2 | table | 3 | 1x1 | 0.01 |  | 1 | 80 |
| 252 | Suped-Up Stove | 7 | T20 | stove | 2 | 1x1 | 0.01 |  | 1.11 | 800 |
| 253 | Fancy Chair | 6 | T2 | chair | 3 | 1x1 | 0.01 |  | 1 | 80 |
| 254 | BBQ Stove | 8 | T2 | stove | 2 | 1x1 | 0.01 |  | 1 | 80 |
| 255 | Beach Ball | 7 | $500 | decor | 1 | 1x1 | 0 |  | 1 | 8 |
| 256 | Beach Blanket | 7 | $500 | floor | 4 | 1x1 | 0 |  | 1 | 8 |
| 257 | Folding Chair | 7 | $600 | chair | 3 | 1x1 | 0 |  | 1 | 9 |
| 258 | Folding Table | 7 | $1400 | table | 3 | 1x1 | 0 |  | 1 | 21 |
| 259 | Surfboard | 8 | $1400 | wallDecor | 1 | 1x1 | 0 |  | 1 | 21 |
| 260 | Ice Fridge | 7 | T10 | decor | 5 | 1x1 | 0.03 | 30/400 | 1 | 400 |
| 261 | Ice Cream Machine | 7 | T20 | decor | 5 | 1x1 | 0.01 | 75/900 | 1 | 800 |
| 262 | Slushy Machine | 8 | T20 | decor | 5 | 1x1 | 0.01 | 75/900 | 1 | 800 |
| 263 | Expand to 13x12 | 0 | $90000 | expansion | 5 | 13x12 | 0 |  | 1 | 0 |
| 264 | Persistence of Brains | 21 | $10000 | wallDecor | 4 | 1x1 | 0 |  | 1 | 150 |
| 265 | Ghoul with the Pearl Earring | 21 | T5 | wallDecor | 4 | 1x1 | 0 |  | 1 | 200 |
| 266 | Van Gogh's Starry Night | 21 | T75 | wallDecor | 4 | 1x1 | 0.12 |  | 1 | 3000 |
| 267 | Jack-o-Lantern | 10 | T5 | decor | 1 | 1x1 | 0.01 |  | 1 | 200 |
| 268 | Orange and Black Tile | 1 | $30 | floor | 4 | 1x1 | 0 |  | 1 | 0 |
| 269 | Spider Web Wall | 10 | $2500 | wallDecor | 4 | 1x1 | 0 |  | 1 | 38 |
| 270 | Orange Table | 10 | $2000 | table | 3 | 1x1 | 0 |  | 1 | 30 |
| 271 | Orange Chair | 10 | $1000 | chair | 3 | 1x1 | 0 |  | 1 | 15 |
| 272 | Orange Serving Counter | 10 | $6000 | counter | 2 | 1x1 | 0 |  | 1 | 90 |
| 273 | Festive Autumn Table | 9 | $2500 | table | 3 | 1x1 | 0 |  | 1 | 38 |
| 274 | Thanksgiving Wreath | 10 | $4000 | wallDecor | 1 | 1x1 | 0 |  | 1 | 60 |
| 275 | Big Pumpkin | 10 | $1500 | decor | 1 | 1x1 | 0 |  | 1 | 23 |
| 276 | Small Pumpkin | 10 | $1500 | decor | 1 | 1x1 | 0 |  | 1 | 23 |
| 277 | Leaves Tile | 5 | $40 | floor | 4 | 1x1 | 0 |  | 1 | 0 |
| 278 | Small Wagon | 11 | T5 | decor | 1 | 1x1 | 0.01 |  | 1 | 300 |
| 279 | Home Sweet Home Sign | 22 | T50 | wallDecor | 4 | 1x1 | 0.12 |  | 1 | 3000 |
| 280 | Wall Candle | 12 | $700 | wallDecor | 4 | 1x1 | 0 |  | 1 | 11 |
| 281 | Expand to 13x12 | 0 | T50 | expansion | 5 | 13x12 | 0 |  | 1 | 0 |
| 282 | Expand to 14x13 | 0 | $90000 | expansion | 5 | 14x13 | 0 |  | 1 | 0 |
| 283 | Expand to 14x13 | 0 | T50 | expansion | 5 | 14x13 | 0 |  | 1 | 0 |
| 284 | Cauldron | 22 | T50 | decor | 5 | 1x1 | 0 | 150/5000 | 1 | 3000 |
| 285 | Strength Tombstone | 5 | T50 | tombstone | 5 | 1x1 | 0 |  | 1 | 3000 |
| 286 | Health Tombstone | 5 | T50 | tombstone | 5 | 1x1 | 0 |  | 1 | 3000 |
| 287 | Christmas Wreath | 12 | T50 | wallDecor | 1 | 1x1 | 0.05 |  | 1 | 3000 |
| 288 | Christmas Table | 11 | $2500 | table | 3 | 1x1 | 0 |  | 1 | 40 |
| 289 | Christmas Chair | 11 | $1500 | chair | 3 | 1x1 | 0 |  | 1 | 20 |
| 290 | Christmas Tree | 12 | T50 | decor | 5 | 1x1 | 0 | 200/4000 | 1 | 2500 |
| 291 | Christmas Arcade Cabinet | 10 | T30 | decor | 5 | 1x1 | 0 | 150/2000 | 1 | 900 |
| 292 | Lanterns | 13 | $888 | wallDecor | 4 | 1x1 | 0.02 |  | 1 | 15 |
| 293 | Fire Crackers | 13 | T10 | wallDecor | 1 | 1x1 | 0.02 |  | 1 | 500 |
| 294 | Foo Dog | 22 | T35 | decor | 1 | 1x1 | 0.12 |  | 1 | 900 |
| 295 | Dragon Painting | 5 | T80 | wallDecor | 4 | 1x1 | 0.12 |  | 1 | 4000 |
| 296 | Eastern Table | 15 | $2450 | table | 3 | 1x1 | 0 |  | 1 | 40 |
| 297 | Eastern Chair | 15 | $1450 | chair | 3 | 1x1 | 0 |  | 1 | 20 |
| 298 | Smiling Buddha | 22 | T40 | decor | 5 | 1x1 | 0.01 | 150/3000 | 1 | 1000 |
| 299 | Heart Table | 8 | T5 | table | 3 | 1x1 | 0.01 |  | 1 | 80 |
| 300 | Heart Chair | 8 | T2 | chair | 3 | 1x1 | 0.01 |  | 1 | 80 |
| 301 | Heart Wall Hangars | 10 | $3000 | wallDecor | 1 | 1x1 | 0.01 |  | 1 | 55 |
| 302 | Heart Shaped Lights | 10 | $800 | wallDecor | 4 | 1x1 | 0.02 |  | 1 | 13 |
| 303 | Strength Tombstone - Level 2 | 5 | T55 | tombstone | 5 | 1x1 | 0 |  | 1 | 5000 |
| 304 | Health Tombstone - Level 2 | 5 | T55 | tombstone | 5 | 1x1 | 0 |  | 1 | 5000 |
| 305 | Decorative Tombstone 1 | 5 | $1500 | tombstone | 1 | 1x1 | 0.02 |  | 1 | 20 |
| 306 | Decorative Tombstone 2 | 5 | T10 | tombstone | 1 | 1x1 | 0.04 |  | 1 | 25 |
| 307 | Decorative Tombstone 3 | 5 | T15 | tombstone | 1 | 1x1 | 0.06 |  | 1 | 30 |
| 308 | Decorative Tombstone 4 | 5 | T20 | tombstone | 1 | 1x1 | 0.08 |  | 1 | 35 |
| 309 | Green Pub Counter | 8 | $1500 | counter | 2 | 1x1 | 0.03 |  | 1 | 20 |
| 310 | Green Pub Stool | 8 | $1000 | chair | 3 | 1x1 | 0.03 |  | 1 | 20 |
| 311 | Pot Of Gold | 10 | T35 | decor | 5 | 1x1 | 0 | 100/2500 | 1 | 2000 |
| 312 | Green Pub Divider | 10 | $3000 | decor | 1 | 1x1 | 0.03 |  | 1 | 30 |
| 313 | Green Pub Table | 8 | $2000 | table | 3 | 1x1 | 0.03 |  | 1 | 25 |
| 314 | Coat of Arms | 11 | T40 | wallDecor | 1 | 1x1 | 0.1 |  | 1 | 3000 |
| 315 | Horse Shoe | 11 | T10 | wallDecor | 1 | 1x1 | 0.05 |  | 1 | 800 |
| 316 | Pub Poster | 12 | T15 | wallDecor | 4 | 1x1 | 0.05 |  | 1 | 900 |
| 317 | Pub Sign | 12 | T20 | wallDecor | 4 | 1x1 | 0.08 |  | 1 | 1000 |
| 318 | Pub Bar Cabinet | 8 | $6000 | decor | 1 | 1x1 | 0.04 |  | 1 | 30 |
| 319 | Grey Futuristic Divider | 7 | $4000 | decor | 1 | 1x1 | 0.02 |  | 1 | 50 |
| 320 | White Futuristic Divider | 8 | $4500 | decor | 1 | 1x1 | 0.02 |  | 1 | 60 |
| 321 | Freeze Dried Fridge | 7 | T10 | fridge | 2 | 1x1 | 0.01 |  | 1 | 500 |
| 322 | Holographic Table | 14 | T3 | table | 3 | 1x1 | 0.02 |  | 1 | 300 |
| 323 | Round Holographic Table | 8 | $6000 | table | 3 | 1x1 | 0.05 |  | 1 | 70 |
| 324 | Laser Oven | 7 | T25 | stove | 2 | 1x1 | 0.02 |  | 1.2 | 1000 |
| 325 | Nebula Painting | 7 | T10 | wallDecor | 4 | 1x1 | 0.05 |  | 1 | 80 |
| 326 | Port Window 1 | 7 | $2500 | wallDecor | 4 | 1x1 | 0.01 |  | 1 | 1 |
| 327 | Port Window 2 | 8 | $2500 | wallDecor | 4 | 1x1 | 0.01 |  | 1 | 20 |
| 328 | Space Counter | 14 | T3 | counter | 2 | 1x1 | 0.02 |  | 1 | 300 |
| 329 | Space Sink | 7 | $4500 | sink | 2 | 1x1 | 0.04 |  | 1 | 40 |
| 330 | LED Light | 7 | $1000 | wallDecor | 4 | 1x1 | 0.01 |  | 1 | 30 |
| 331 | LED Lights | 8 | $2000 | wallDecor | 4 | 1x1 | 0.01 |  | 1 | 15 |
| 332 | Black & White Glass Tile | 7 | $500 | floor | 4 | 1x1 | 0 |  | 1 | 5 |
| 333 | Metal Glass Tile | 8 | $600 | floor | 4 | 1x1 | 0 |  | 1 | 8 |
| 334 | White Glass Tile | 8 | $700 | floor | 4 | 1x1 | 0 |  | 1 | 10 |
| 335 | Space Fighter Arcade Machine | 14 | T45 | decor | 5 | 1x1 | 0 | 300/4500 | 1 | 1200 |
| 336 | Captain's Chair | 7 | T3 | chair | 3 | 1x1 | 0.02 |  | 1 | 100 |
| 337 | Air Hockey Table | 12 | T30 | decor | 5 | 1x1 | 0 | 100/1200 | 1 | 1200 |
| 338 | Deep Fryer | 8 | T20 | decor | 5 | 1x1 | 0.01 | 75/900 | 1 | 800 |
| 339 | Pinball Machine | 13 | T25 | decor | 5 | 1x1 | 0 | 100/1200 | 1 | 1000 |
| 340 | Pizza Display Warmer | 9 | $50000 | decor | 5 | 1x1 | 0.01 | 75/900 | 1 | 800 |
| 341 | Pool Table (Blue) | 17 | T40 | decor | 5 | 1x1 | 0 | 125/2000 | 1 | 1600 |
| 342 | Wall Menu | 8 | $12000 | wallDecor | 4 | 1x1 | 0.01 |  | 1 | 200 |
| 343 | Graffiti Poster | 9 | $25000 | wallDecor | 4 | 1x1 | 0.03 |  | 1 | 400 |
| 344 | Zombie Arcade Sign | 9 | T10 | wallDecor | 4 | 1x1 | 0.03 |  | 1 | 400 |
| 345 | Wood Fire Pizza Oven | 9 | T20 | decor | 5 | 1x1 | 0.03 | 75/900 | 1 | 800 |
| 346 | Zombie Fighter Arcade Machine | 8 | T45 | decor | 5 | 1x1 | 0 | 300/4500 | 1 | 1200 |
| 348 | Apache Blanket | 10 | $11000 | wallDecor | 1 | 1x1 | 0.01 |  | 1 | 200 |
| 349 | Banjo | 11 | $7000 | decor | 1 | 1x1 | 0.01 |  | 1 | 100 |
| 350 | Gas Lamp | 10 | $1000 | wallDecor | 4 | 1x1 | 0.02 |  | 1 | 30 |
| 352 | Gun Rack | 14 | T10 | wallDecor | 1 | 1x1 | 0.03 |  | 1 | 400 |
| 353 | Meat Smoker | 14 | T15 | decor | 5 | 1x1 | 0.01 | 50/600 | 1 | 500 |
| 354 | Moonshine Shelf | 10 | $12000 | wallDecor | 1 | 1x1 | 0.05 |  | 1 | 200 |
| 355 | Road Worn Guitar | 10 | $5000 | decor | 1 | 1x1 | 0 |  | 1 | 70 |
| 356 | Rotisserie | 10 | T20 | decor | 5 | 1x1 | 0.03 | 75/900 | 1 | 800 |
| 357 | Zombie Cowboy Painting | 14 | T20 | wallDecor | 4 | 1x1 | 0.05 |  | 1 | 800 |
| 358 | Steam Powered Arcade Cabinet | 16 | T45 | decor | 5 | 1x1 | 0 | 300/4500 | 1 | 1200 |
| 359 | Steam Powered Chair | 12 | $1000 | chair | 3 | 1x1 | 0.03 |  | 1 | 20 |
| 360 | Cthulhu Painting | 16 | T20 | wallDecor | 4 | 1x1 | 0.05 |  | 1 | 800 |
| 361 | Steam Powered Fridge | 12 | T10 | fridge | 2 | 1x1 | 0.01 |  | 1 | 500 |
| 362 | Clock Work Table | 12 | $8000 | table | 3 | 1x1 | 0.05 |  | 1 | 70 |
| 363 | Phono-Box | 16 | T20 | decor | 5 | 1x1 | 0 | 75/1800 | 1 | 800 |
| 364 | Steam Powered Stove | 12 | T25 | stove | 2 | 1x1 | 0.02 |  | 1.2 | 1000 |
| 365 | Tesla TV | 12 | $16000 | decor | 1 | 1x1 | 0.02 |  | 1 | 240 |
| 366 | Victorian Counter | 12 | $1500 | counter | 2 | 1x1 | 0.03 |  | 1 | 20 |
| 367 | Victorian Sink | 12 | $4250 | sink | 2 | 1x1 | 0.03 |  | 1 | 40 |
| 368 | Victorian Window | 12 | $2500 | wallDecor | 4 | 1x1 | 0.03 |  | 1 | 20 |
| 369 | Zen Wall | 15 | $1200 | wall | 4 | 1x1 | 0 |  | 1 | 20 |
| 370 | Zen Wall | 15 | $1200 | wall | 4 | 1x1 | 0 |  | 1 | 20 |
| 371 | Zen Wall | 15 | $1200 | wall | 4 | 1x1 | 0 |  | 1 | 20 |
| 372 | Zen Wall | 15 | $1200 | wall | 4 | 1x1 | 0 |  | 1 | 20 |
| 373 | Zen Wall | 15 | $1200 | wall | 4 | 1x1 | 0 |  | 1 | 20 |
| 374 | Zen Wall | 15 | $1200 | wall | 4 | 1x1 | 0 |  | 1 | 20 |
| 375 | Bamboo Floor | 15 | $150 | floor | 4 | 1x1 | 0 |  | 1 | 2 |
| 376 | Bamboo Floor | 15 | $150 | floor | 4 | 1x1 | 0 |  | 1 | 2 |
| 377 | Bamboo Floor | 15 | $150 | floor | 4 | 1x1 | 0 |  | 1 | 2 |
| 378 | Eastern Chair 2 | 15 | $1450 | chair | 3 | 1x1 | 0 |  | 1 | 20 |
| 379 | Eastern Chair 3 | 9 | T5 | chair | 3 | 1x1 | 0 |  | 1 | 300 |
| 380 | Dojo Counter | 15 | $1500 | counter | 2 | 1x1 | 0.03 |  | 1 | 20 |
| 381 | Dojo Sink | 15 | $5500 | sink | 2 | 1x1 | 0.04 |  | 1 | 40 |
| 382 | Cherry Blossom Lantern | 18 | T10 | wallDecor | 4 | 1x1 | 0.02 |  | 1 | 800 |
| 383 | Blue Lantern | 15 | $888 | wallDecor | 4 | 1x1 | 0.02 |  | 1 | 15 |
| 384 | Eastern Table 2 | 15 | $2450 | table | 3 | 1x1 | 0 |  | 1 | 40 |
| 385 | Eastern Table 3 | 9 | T5 | table | 3 | 1x1 | 0 |  | 1 | 300 |
| 386 | Wall Fan | 15 | T10 | wallDecor | 1 | 1x1 | 0.05 |  | 1 | 800 |
| 387 | Ninja Scroll | 15 | T15 | wallDecor | 1 | 1x1 | 0.03 |  | 1 | 1000 |
| 388 | Ninja Weapons | 18 | T25 | wallDecor | 1 | 1x1 | 0.05 |  | 1 | 1500 |
| 389 | Bling Table | 15 | $10000 | table | 3 | 1x1 | 0.05 |  | 1 | 70 |
| 390 | Bling Chair | 15 | $6000 | chair | 3 | 1x1 | 0.03 |  | 1 | 60 |
| 391 | Standard Pizza Oven | 15 | $5000 | stove | 2 | 1x1 | 0.01 |  | 1 | 800 |
| 392 | Brick Oven Pizza | 15 | $11000 | stove | 2 | 1x1 | 0.02 |  | 1.1 | 1000 |
| 393 | Deep Dish Oven | 15 | T15 | stove | 2 | 1x1 | 0.03 |  | 1.2 | 1200 |
| 394 | Italian Stallion Pizza Oven | 15 | T20 | stove | 2 | 1x1 | 0.04 |  | 1.3 | 1400 |
| 395 | Pizza | 255 | $0 | pot/divider | 7 | 1x1 | 0 |  | 1 | 0 |
| 396 | Burnt Pizza | 255 | $0 | pot/divider | 7 | 1x1 | 0 |  | 1 | 0 |
| 397 | Economic Grill | 16 | $12000 | stove | 2 | 1x1 | 0.02 |  | 1.1 | 1000 |
| 398 | Corporate Grill | 16 | T15 | stove | 2 | 1x1 | 0.03 |  | 1.2 | 1200 |
| 399 | T-8000 Grill | 16 | T20 | stove | 2 | 1x1 | 0.04 |  | 1.3 | 1400 |
| 400 | BBQ | 255 | $0 | pot/divider | 7 | 1x1 | 0 |  | 1 | 0 |
| 401 | Burnt BBQ | 255 | $0 | pot/divider | 7 | 1x1 | 0 |  | 1 | 0 |
| 404 | Elephant Wall Poster | 16 | $3000 | wallDecor | 4 | 1x1 | 0 |  | 1 | 600 |
| 405 | Donkey Wall Poster | 16 | $3000 | wallDecor | 4 | 1x1 | 0 |  | 1 | 600 |
| 410 | Traditional Estufa | 5 | $5000 | stove | 2 | 1x1 | 0 |  | 1 | 150 |
| 411 | Chiminea Estufa | 5 | T15 | stove | 2 | 1x1 | 0 |  | 1 | 300 |
| 412 | Estufa Del Jefe | 5 | T20 | stove | 2 | 1x1 | 0 |  | 1 | 350 |
| 413 | Mexican Food | 255 | $0 | pot/divider | 7 | 1x1 | 0 |  | 1 | 0 |
| 414 | Burnt Mexican Food | 255 | $0 | pot/divider | 7 | 1x1 | 0 |  | 1 | 0 |
| 415 | Aztec Calendar | 5 | $2400 | wallDecor | 4 | 1x1 | 0 |  | 1 | 175 |
| 416 | Pinata | 5 | T15 | decor | 1 | 1x1 | 0.05 |  | 1 | 150 |
| 417 | Skeleton Chair | 5 | T2 | chair | 3 | 1x1 | 0.01 |  | 1 | 175 |
| 418 | Skeleton Table | 5 | $2400 | table | 3 | 1x1 | 0 |  | 1 | 75 |
| 419 | Aztec Stone Wall | 5 | $2400 | wall | 4 | 1x1 | 0 |  | 1 | 30 |
| 420 | Day of the Dead Altar | 5 | T20 | decor | 1 | 1x1 | 0.05 |  | 1 | 300 |
| 421 | Wall Mounted Candles | 5 | $1000 | wallDecor | 4 | 1x1 | 0 |  | 1 | 15 |
| 422 | Skull-ptural Lamp | 5 | T15 | decor | 1 | 1x1 | 0.05 |  | 1 | 120 |
| 423 | Monster Movie Poster | 12 | T20 | wallDecor | 4 | 1x1 | 0.05 |  | 1 | 800 |
| 424 | Star Walk Tiles | 10 | $400 | floor | 4 | 1x1 | 0 |  | 1 | 5 |
| 425 | Zombie Golden Award | 12 | T30 | decor | 1 | 1x1 | 0.05 |  | 1 | 1200 |
| 426 | Director Chair | 11 | T2 | chair | 3 | 1x1 | 0.01 |  | 1 | 80 |
| 427 | Clapper Table | 11 | $2500 | table | 3 | 1x1 | 0 |  | 1 | 38 |
| 428 | Film Reel | 11 | T2 | table | 3 | 1x1 | 0.01 |  | 1 | 80 |
| 429 | Film Set Light | 10 | T5 | decor | 1 | 1x1 | 0.01 |  | 1 | 150 |
| 430 | Witch potion Stove | 8 | $7000 | stove | 2 | 1x1 | 0 |  | 1.1 | 170 |
| 431 | Lava Stove | 8 | T15 | stove | 2 | 1x1 | 0 |  | 1.2 | 330 |
| 432 | Fiery Dragon Stove | 8 | T20 | stove | 2 | 1x1 | 0 |  | 1.3 | 400 |
| 433 | Legendary Sword | 9 | T20 | decor | 1 | 1x1 | 0.05 |  | 1 | 800 |
| 434 | King's Table | 9 | T5 | table | 3 | 1x1 | 0.01 |  | 1 | 150 |
| 435 | King's Throne | 9 | T5 | chair | 3 | 1x1 | 0.01 |  | 1 | 150 |
| 436 | Tavern Table | 8 | $1200 | table | 3 | 1x1 | 0 |  | 1 | 18 |
| 437 | Tavern Chair | 8 | $1200 | chair | 3 | 1x1 | 0 |  | 1 | 18 |
| 438 | Big Stones Wallpaper | 8 | $300 | wall | 4 | 1x1 | 0 |  | 1 | 3 |
| 439 | Stained Glass Window | 9 | T3 | wallDecor | 4 | 1x1 | 0.01 |  | 1 | 100 |
| 440 | Sword & Shield | 8 | T2 | wallDecor | 1 | 1x1 | 0.01 |  | 1 | 80 |
| 441 | The Zombie Book | 8 | T15 | decor | 1 | 1x1 | 0.04 |  | 1 | 950 |
| 442 | Medieval Tile | 8 | $600 | floor | 4 | 1x1 | 0 |  | 0 | 8 |
| 443 | Medieval Pod | 255 | $0 | pot/divider | 7 | 1x1 | 0 |  | 1 | 0 |
| 444 | Burnt Medieval Pod | 255 | $0 | pot/divider | 7 | 1x1 | 0 |  | 1 | 0 |
| 445 | Expand to 15x14 | 0 | $100000 | expansion | 5 | 15x14 | 0 |  | 1 | 0 |
| 446 | Expand to 15x14 | 0 | T50 | expansion | 5 | 15x14 | 0 |  | 1 | 0 |
| 447 | Ship Steering Wheel | 12 | $5000 | decor | 1 | 1x1 | 0 |  | 0 | 100 |
| 448 | Salad Bar | 12 | T35 | decor | 5 | 2x1 | 0 | 100/2500 | 0 | 2500 |
| 449 | Book Shelf | 12 | $2000 | decor | 1 | 1x1 | 0 |  | 0 | 30 |
| 450 | Parrot on Stand | 12 | T5 | decor | 1 | 1x1 | 0.01 |  | 0 | 150 |
| 451 | Standard Cannon | 12 | $20000 | decor | 1 | 1x1 | 0.01 |  | 0 | 400 |
| 452 | Gold Cannon | 12 | T30 | decor | 1 | 1x1 | 0.05 |  | 0 | 1200 |
| 453 | Treasure Map | 12 | T20 | wallDecor | 1 | 1x1 | 0.02 |  | 0 | 1200 |
| 454 | Antique Wall Lamp | 12 | $1500 | wallDecor | 4 | 1x1 | 0 |  | 0 | 23 |
| 455 | Ship Window | 12 | $2500 | wallDecor | 4 | 1x1 | 0 |  | 0 | 38 |
| 456 | Treasure Chest | 12 | T30 | decor | 1 | 1x1 | 0.06 |  | 0 | 1300 |
| 457 | Pirate Table | 12 | T5 | table | 3 | 1x1 | 0.01 |  | 0 | 200 |
| 458 | Pirate Chair | 12 | $1750 | chair | 3 | 1x1 | 0 |  | 0 | 27 |
| 459 | Holy Water Fountain | 13 | T10 | decor | 1 | 1x1 | 0.03 |  | 0 | 300 |
| 460 | Garlic Wreath | 13 | T3 | wallDecor | 1 | 1x1 | 0.01 |  | 0 | 350 |
| 461 | Classic Coffin | 13 | T25 | decor | 1 | 1x1 | 0.05 |  | 0 | 2000 |
| 462 | Gothic Column | 13 | $4000 | decor | 1 | 1x1 | 0 |  | 0 | 40 |
| 463 | Stone Wall | 13 | $2000 | wall | 4 | 1x1 | 0 |  | 0 | 20 |
| 464 | Gothic Arched Window | 13 | $3000 | wallDecor | 4 | 1x1 | 0 |  | 0 | 30 |
| 465 | Spooky Pipe Organ | 13 | T30 | decor | 1 | 1x2 | 0.06 |  | 0 | 2500 |
| 466 | Portrait of Vlad | 13 | $666000 | wallDecor | 4 | 1x1 | 0.12 |  | 0 | 3000 |
| 467 | Portrait of Vlad | 13 | T75 | wallDecor | 4 | 1x1 | 0.12 |  | 0 | 6000 |
| 468 | Gargoyle | 13 | T15 | decor | 1 | 1x1 | 0.05 |  | 0 | 900 |
| 469 | Zombie Man Poster | 14 | T30 | wallDecor | 4 | 1x1 | 0.06 |  | 0 | 1400 |
| 470 | Supper Girl Poster | 6 | T10 | wallDecor | 4 | 1x1 | 0.03 |  | 0 | 500 |
| 471 | Mad Griller Wanted Poster | 14 | T35 | wallDecor | 4 | 1x1 | 0.08 |  | 0 | 2400 |
| 472 | Comics Spinner Racks | 6 | $18000 | decor | 5 | 1x1 | 0 | 30/300 | 0 | 300 |
| 473 | Meteorite | 7 | T25 | decor | 1 | 1x1 | 0.05 |  | 0 | 1000 |
| 474 | Super Hero Power Armor | 14 | T55 | decor | 1 | 2x2 | 0.13 |  | 0 | 5000 |
| 475 | Phone Booth | 9 | T20 | decor | 5 | 1x1 | 0.01 | 80/1900 | 0 | 800 |
| 476 | Hero Research Center | 14 | T50 | decor | 1 | 1x1 | 0.12 |  | 0 | 3000 |
| 477 | Comics Stand | 14 | T40 | decor | 5 | 1x1 | 0 | 130/2800 | 0 | 1500 |
| 478 | Super Stove | 14 | $10000 | stove | 2 | 1x1 | 0 |  | 1.1 | 1000 |
| 479 | Spectro-Tastilizer | 14 | T15 | stove | 2 | 1x1 | 0 |  | 1.2 | 1200 |
| 480 | The Flavor Matrix | 14 | T20 | stove | 2 | 1x1 | 0 |  | 1.3 | 1400 |
| 481 | Superhero Pod | 255 | T0 | pot/divider | 7 | 1x1 | 0 |  | 1 | 0 |
| 482 | Burnt SuperHero Pod | 255 | T0 | pot/divider | 7 | 1x1 | 0 |  | 1 | 0 |
| 483 | Mint Condition Comic | 14 | $200000 | wallDecor | 1 | 1x1 | 0.05 |  | 0 | 2000 |
| 485 | Golden Tombstone | 10 | T40 | tombstone | 5 | 1x1 | 0 |  | 0 | 1500 |
| 486 | High Striker | 11 | T40 | decor | 5 | 1x1 | 0 | 350/4000 | 0 | 1200 |
| 487 | Power Punch | 11 | T50 | decor | 5 | 1x1 | 0.15 | 350/4000 | 0 | 3000 |
| 488 | Zombie Man Arcade Booth | 11 | T70 | decor | 5 | 1x1 | 0.15 | 400/6000 | 0 | 3000 |
| 489 | Galactic War Game | 20 | T50 | decor | 5 | 1x1 | 0 | 300/5000 | 0 | 3000 |
| 490 | Arcade Racer | 11 | T50 | decor | 5 | 1x1 | 0.1 | 400/5500 | 0 | 3500 |
| 491 | Monster Pet Shop Crane Game | 11 | T40 | decor | 5 | 1x1 | 0.1 | 200/3000 | 0 | 2000 |
| 492 | Golden Slot Machine | 11 | T80 | decor | 5 | 1x1 | 0.15 | 350/7000 | 0 | 3500 |
| 493 | Roulette Table | 11 | T50 | decor | 5 | 1x2 | 0.15 | 350/6000 | 0 | 4000 |
| 494 | Zombie Chef Mascot Statue | 11 | T50 | decor | 1 | 1x1 | 0.2 |  | 0 | 5000 |
| 495 | Throne of Bones | 11 | T10 | chair | 3 | 1x1 | 0.15 |  | 0 | 1000 |
| 496 | Toxin Generator | 255 | D40 | toxinGenerator | 5 | 1x1 | 0 | k2:5/5 | 0 | 500 |
| 497 | Zero Gravity Chair | 13 | T3 | chair | 3 | 1x1 | 0.02 |  | 0 | 100 |
| 498 | Zero Gravity Table | 13 | T3 | table | 3 | 1x1 | 0.02 |  | 0 | 300 |
| 499 | Crystal Chair | 8 | $3000 | chair | 3 | 1x1 | 0 |  | 0 | 45 |
| 500 | Crystal Table | 8 | $6000 | table | 3 | 1x1 | 0.03 |  | 0 | 75 |
| 501 | Skeleton Bear | 15 | T35 | decor | 1 | 1x1 | 0.08 |  | 1 | 2400 |
| 502 | Stitched Polar Bear | 13 | T25 | decor | 1 | 1x1 | 0.06 |  | 1 | 1000 |
| 503 | Tortured Grizzly | 11 | T15 | decor | 1 | 1x1 | 0.04 |  | 1 | 800 |
| 504 | Patched Bear | 9 | $3000 | decor | 1 | 1x1 | 0 |  | 1 | 45 |
| 505 | BillBoard | 255 | D40 | billboard | 7 | 1x1 | 0 |  | 0 | 0 |
| 506 | BillBoard | 255 | D40 | billboard | 7 | 1x1 | 0 |  | 0 | 0 |
| 507 | Sand Tile | 12 | $600 | floor | 4 | 1x1 | 0 |  | 0 | 8 |
| 508 | Hieroglyphic Wall | 12 | $1800 | wall | 4 | 1x1 | 0 |  | 0 | 18 |
| 509 | Egyptian Pot | 255 | T0 | pot/divider | 7 | 1x1 | 0 |  | 1 | 0 |
| 510 | Burnt Egyptian Pod | 255 | T0 | pot/divider | 7 | 1x1 | 0 |  | 1 | 0 |
| 511 | Temple Furnace | 12 | $9000 | stove | 2 | 1x1 | 0.02 |  | 1.1 | 1000 |
| 512 | Anubis Cremator | 12 | T15 | stove | 2 | 1x1 | 0.03 |  | 1.2 | 1200 |
| 513 | Horus Incinerator | 12 | T20 | stove | 2 | 1x1 | 0.04 |  | 1.3 | 1400 |
| 514 | Sarcophagus | 12 | T40 | decor | 1 | 1x1 | 0.1 |  | 0 | 1200 |
| 515 | Sphinx | 12 | T50 | decor | 5 | 2x2 | 0 | 100/5000 | 0 | 2200 |
| 516 | Egyptian Column | 12 | $3500 | decor | 1 | 1x1 | 0 |  | 0 | 35 |
| 517 | Egyptian Stool | 12 | $1500 | chair | 3 | 1x1 | 0 |  | 0 | 20 |
| 518 | Egyptian Table | 12 | T5 | table | 3 | 1x1 | 0.01 |  | 0 | 200 |
| 519 | Classic Mobster Rider | 15 | T50 | decor | 1 | 1x2 | 0.12 |  | 0 | 3000 |
| 520 | Cracked Safe | 15 | T50 | decor | 5 | 1x1 | 0 | 125/6000 | 0 | 3000 |
| 521 | Greek Stool | 17 | $2000 | chair | 3 | 1x1 | 0 |  | 0 | 30 |
| 522 | Greek Table | 17 | T3 | table | 3 | 1x1 | 0.02 |  | 0 | 300 |
| 523 | Greek Tile | 17 | $800 | floor | 4 | 1x1 | 0 |  | 0 | 12 |
| 524 | Greek Wall | 17 | $3000 | wall | 4 | 1x1 | 0 |  | 0 | 30 |
| 525 | The Trojan Horse | 17 | T50 | decor | 5 | 1x2 | 0 | 100/5000 | 0 | 2400 |
| 526 | Atlas Sculpture | 17 | T35 | decor | 1 | 1x1 | 0.08 | 0/0 | 0 | 2400 |
| 527 | Greek pot | 255 | T0 | pot/divider | 7 | 1x1 | 0 |  | 1 | 0 |
| 528 | Greek pot burn | 255 | T0 | pot/divider | 7 | 1x1 | 0 |  | 1 | 0 |
| 529 | Ionic Stove | 17 | $13000 | stove | 2 | 1x1 | 0.02 |  | 1.1 | 1100 |
| 530 | Doric Stove | 17 | T15 | stove | 2 | 1x1 | 0.03 |  | 1.2 | 1300 |
| 531 | Corinthian Stove | 17 | T20 | stove | 2 | 1x1 | 0.04 |  | 1.3 | 1500 |
| 532 | Greek Column | 17 | $4000 | decor | 1 | 1x1 | 0 |  | 0 | 40 |
| 533 | Greek Counter | 17 | T2 | counter | 2 | 1x1 | 0.03 |  | 1 | 200 |
| 534 | Krypton Chair | 18 | $2400 | chair | 3 | 1x1 | 0 |  | 0 | 35 |
| 535 | Krypton Table | 18 | T2 | table | 3 | 1x1 | 0.01 |  | 0 | 80 |
| 536 | Krypton Worktop | 18 | T3 | counter | 2 | 1x1 | 0.03 |  | 1 | 300 |
| 537 | Krypton Sink | 18 | $6000 | sink | 2 | 1x1 | 0.04 |  | 1 | 45 |
| 538 | Power Generator | 18 | T20 | decor | 5 | 1x1 | 0.02 | 100/2000 | 0 | 1000 |
| 539 | Krypton Fridge | 18 | T30 | fridge | 2 | 1x1 | 0.01 |  | 1 | 1200 |
| 540 | Krypton Floor Tile | 18 | $1000 | floor | 4 | 1x1 | 0 |  | 0 | 15 |
| 541 | Krypton Wall | 18 | $3500 | wall | 4 | 1x1 | 0 |  | 0 | 35 |
| 542 | Mutant Dish Generator Tier 1 | 18 | $14000 | stove | 2 | 1x1 | 0.02 |  | 1.1 | 1200 |
| 543 | Mutant Dish Generator Tier 2 | 18 | T15 | stove | 2 | 1x1 | 0.03 |  | 1.2 | 1400 |
| 544 | Mutant Dish Generator Tier 3 | 18 | T20 | stove | 2 | 1x1 | 0.04 |  | 1.3 | 1600 |
| 545 | Mutant pot | 255 | T0 | pot/divider | 7 | 1x1 | 0 |  | 1 | 0 |
| 546 | Mutant pot burn | 255 | T0 | pot/divider | 7 | 1x1 | 0 |  | 1 | 0 |
| 547 | Vampire Chair | 13 | T3 | chair | 3 | 1x1 | 0.02 |  | 0 | 100 |
| 548 | Vampire Table | 13 | T3 | table | 3 | 1x1 | 0.02 |  | 0 | 300 |
| 550 | Hyper Booster | 5 | D15 | burnTimeBooster | 5 | 1x1 | 0 |  | 1 | 0 |
| 551 | Curious Flowers | 14 | T2 | decor | 1 | 1x1 | 0.01 | 0/0 | 0 | 150 |
| 552 | Short White Fence | 14 | T1 | decor | 1 | 1x1 | 0.01 |  | 0 | 70 |
| 553 | Magic Mushroom Cluster | 14 | T20 | decor | 5 | 2x2 | 0.02 | 80/1000 | 0 | 800 |
| 554 | Rose Tree | 14 | T3 | decor | 1 | 1x1 | 0.01 | 0/0 | 0 | 150 |
| 555 | Tea Party Decoration | 14 | T30 | decor | 1 | 2x2 | 0.06 | 0/0 | 0 | 2500 |
| 556 | Garden Party Stove | 14 | $10000 | stove | 2 | 1x1 | 0.02 |  | 1.1 | 1000 |
| 557 | Garden Party Wonder Stove | 14 | T15 | stove | 2 | 1x1 | 0.03 |  | 1.2 | 1200 |
| 558 | Garden Party Magic Stove | 14 | T20 | stove | 2 | 1x1 | 0.04 |  | 1.3 | 1400 |
| 559 | Garden Chair | 14 | T2 | chair | 3 | 1x1 | 0.01 |  | 0 | 80 |
| 560 | Garden Table | 14 | T2 | table | 3 | 1x1 | 0.01 |  | 0 | 80 |
| 561 | Grass Tile | 14 | $700 | floor | 4 | 1x1 | 0 |  | 0 | 10 |
| 562 | Alice Pot | 255 | T0 | pot/divider | 7 | 1x1 | 0 |  | 1 | 0 |
| 563 | Alice Pot Burnt | 255 | T0 | pot/divider | 7 | 1x1 | 0 |  | 1 | 0 |
| 564 | White Wooden Fence | 14 | $2200 | wall | 4 | 1x1 | 0 |  | 0 | 22 |
| 565 | Grim Reaper Tombstone | 5 | T50 | tombstone | 5 | 1x1 | 0 |  | 0 | 3000 |
| 566 | Graveyard Grass Tile | 9 | $500 | floor | 4 | 1x1 | 0 |  | 0 | 7 |
| 567 | Graveyard Bone Tile | 9 | $1000 | floor | 4 | 1x1 | 0 |  | 0 | 12 |
| 568 | Graveyard Skull Tile | 9 | $1300 | floor | 4 | 1x1 | 0 |  | 0 | 15 |
| 569 | Graveyard Paved Tile | 9 | $800 | floor | 4 | 1x1 | 0 |  | 0 | 10 |
| 570 | Graveyard Wall | 9 | $3000 | wall | 4 | 1x1 | 0 |  | 0 | 30 |
| 571 | Tree of the Dead | 9 | T20 | decor | 5 | 2x2 | 0 | 50/800 | 0 | 750 |
| 572 | Gravestone 1 | 9 | T3 | decor | 1 | 1x1 | 0.03 | 0/0 | 0 | 300 |
| 573 | Gravestone 2 | 9 | T3 | decor | 1 | 1x1 | 0.03 | 0/0 | 0 | 300 |
| 574 | Gravestone 3 | 9 | T2 | decor | 1 | 1x1 | 0.01 | 0/0 | 0 | 150 |
| 575 | Gravestone 4 | 9 | T2 | decor | 1 | 1x1 | 0.01 | 0/0 | 0 | 150 |
| 576 | Gravestone 5 | 9 | T3 | decor | 1 | 1x1 | 0.03 | 0/0 | 0 | 300 |
| 577 | Cypress | 9 | T5 | decor | 1 | 1x1 | 0 | 0/0 | 0 | 300 |
| 578 | Graveyard Table | 9 | T2 | table | 3 | 1x1 | 0.01 |  | 0 | 80 |
| 579 | Graveyard Stool | 9 | T2 | chair | 3 | 1x1 | 0.01 |  | 0 | 80 |
| 580 | Tomb Stove | 9 | $8000 | stove | 2 | 1x1 | 0.02 |  | 1.1 | 900 |
| 581 | Grave Grill | 9 | T15 | stove | 2 | 1x1 | 0.03 |  | 1.2 | 1000 |
| 582 | Death Furnace | 9 | T20 | stove | 2 | 1x1 | 0.04 |  | 1.3 | 1200 |
| 583 | Graveyard pot | 255 | T0 | pot/divider | 7 | 1x1 | 0 |  | 1 | 0 |
| 584 | Graveyard pot burn | 255 | T0 | pot/divider | 7 | 1x1 | 0 |  | 1 | 0 |
| 585 | Dirty Tile | 0 | $0 | wall | 4 | 1x1 | 0 |  | 0 | 0 |
| 586 | Dirty Tile | 0 | $0 | wall | 4 | 1x1 | 0 |  | 0 | 0 |
| 587 | Dirty Tile | 0 | $0 | wall | 4 | 1x1 | 0 |  | 0 | 0 |
| 588 | Dirty Tile | 0 | $0 | wall | 4 | 1x1 | 0 |  | 0 | 0 |
| 589 | Dirty Tile | 0 | $0 | wall | 4 | 1x1 | 0 |  | 0 | 0 |
| 590 | Dirty Tile | 0 | $0 | wall | 4 | 1x1 | 0 |  | 0 | 0 |
| 591 | Dirty Tile | 0 | $0 | wall | 4 | 1x1 | 0 |  | 0 | 0 |
| 592 | Door Close | 0 | $0 | wall | 4 | 1x1 | 0 |  | 0 | 0 |
| 593 | Door Open | 0 | $0 | wall | 4 | 1x1 | 0 |  | 0 | 0 |
| 594 | Viking Shield 1 | 10 | T3 | wallDecor | 1 | 1x1 | 0.03 |  | 0 | 200 |
| 595 | Viking Shield 2 | 10 | T3 | wallDecor | 1 | 1x1 | 0.03 |  | 0 | 200 |
| 596 | Viking Shield 3 | 10 | T3 | wallDecor | 1 | 1x1 | 0.03 |  | 0 | 200 |
| 597 | Megalith 1 | 10 | T2 | decor | 1 | 1x1 | 0.01 | 0/0 | 0 | 150 |
| 598 | Megalith 2 | 10 | T2 | decor | 1 | 1x1 | 0.01 | 0/0 | 0 | 150 |
| 599 | Megalith 3 | 10 | T2 | decor | 1 | 1x1 | 0.01 | 0/0 | 0 | 150 |
| 600 | Table Trunk | 10 | $1500 | table | 3 | 1x1 | 0 |  | 0 | 23 |
| 601 | Horned Stool | 10 | T2 | chair | 3 | 1x1 | 0.01 |  | 0 | 80 |
| 602 | Campsite Fence | 10 | $1500 | wall | 4 | 1x1 | 0 |  | 0 | 15 |
| 603 | Camp Fire | 10 | T20 | decor | 5 | 2x2 | 0 | 50/1000 | 0 | 800 |
| 604 | Wrecked Drakkar | 10 | T10 | decor | 1 | 1x1 | 0.05 | 0/0 | 0 | 600 |
| 605 | Frozen Fish Bar | 10 | T35 | decor | 5 | 1x2 | 0 | 150/3000 | 0 | 2500 |
| 606 | Dragon Skull | 10 | T30 | decor | 1 | 2x2 | 0.07 | 0/0 | 0 | 2500 |
| 607 | Snow Pine | 10 | T3 | decor | 1 | 1x1 | 0.01 | 0/0 | 0 | 300 |
| 608 | Snow Tile | 10 | $1000 | floor | 4 | 1x1 | 0 |  | 0 | 12 |
| 609 | Weapon Stand | 10 | T5 | decor | 1 | 1x1 | 0.03 | 0/0 | 0 | 300 |
| 610 | Viking Fire Pit | 10 | $8000 | stove | 2 | 1x1 | 0.02 |  | 1.1 | 950 |
| 611 | Warrior Fire Pit | 10 | T15 | stove | 2 | 1x1 | 0.03 |  | 1.2 | 1100 |
| 612 | Dragon Fire Pit | 10 | T20 | stove | 2 | 1x1 | 0.04 |  | 1.3 | 1300 |
| 613 | Noose Pot | 255 | T0 | pot/divider | 7 | 1x1 | 0 |  | 1 | 0 |
| 614 | Burnt Noose Pot | 255 | T0 | pot/divider | 7 | 1x1 | 0 |  | 1 | 0 |
| 615 | Undead Rottweiler | 8 | $25000 | habitat | 5 | 1x1 | 0.02 |  | 1 | 20 |
| 616 | Cheshire Cat | 8 | T50 | habitat | 5 | 1x1 | 0.02 |  | 1 | 20 |
| 617 | Great Sphinx of Giza | 8 | T50 | habitat | 5 | 1x1 | 0.02 |  | 1 | 20 |
| 618 | Wolf of the Steppes | 8 | T50 | habitat | 5 | 1x1 | 0.02 |  | 1 | 20 |
| 619 | Yeti Tombstone | 10 | T75 | tombstone | 5 | 1x1 | 0 |  | 0 | 3000 |
| 620 | Evil Snowman | 12 | T30 | decor | 1 | 2x2 | 0.07 |  | 0 | 2500 |
| 621 | Lava Pit | 13 | T20 | decor | 1 | 2x2 | 0.05 |  | 0 | 800 |
| 622 | Z-Mas Tree | 12 | T35 | decor | 5 | 2x2 | 0 | 200/4000 | 0 | 3500 |
| 623 | Volcanic Tile 1 | 13 | $1300 | floor | 4 | 1x1 | 0 |  | 0 | 15 |
| 624 | Volcanic Tile 2 | 13 | $1300 | floor | 4 | 1x1 | 0 |  | 0 | 15 |
| 625 | Volcanic Tile 3 | 13 | $1300 | floor | 4 | 1x1 | 0 |  | 0 | 15 |
| 626 | Volcanic Tile 4 | 13 | $1300 | floor | 4 | 1x1 | 0 |  | 0 | 15 |
| 627 | Obsidian Wall | 13 | $3500 | wall | 4 | 1x1 | 0 |  | 0 | 35 |
| 628 | Obsidian Chair 1 | 13 | T2 | chair | 3 | 1x1 | 0.01 |  | 0 | 80 |
| 629 | Obsidian Chair 2 | 13 | T2 | chair | 3 | 1x1 | 0.01 |  | 0 | 80 |
| 630 | Obsidian Table | 13 | T2 | table | 3 | 1x1 | 0.01 |  | 0 | 80 |
| 631 | Devilish Pit | 13 | $9500 | stove | 2 | 1x1 | 0.02 |  | 1.1 | 1000 |
| 632 | Sorcerer's Stove | 13 | T15 | stove | 2 | 1x1 | 0.03 |  | 1.2 | 1200 |
| 633 | Furnace of Hell | 13 | T20 | stove | 2 | 1x1 | 0.04 |  | 1.3 | 1400 |
| 634 | Hobbit Pot | 255 | T0 | pot/divider | 7 | 1x1 | 0 |  | 1 | 0 |
| 635 | Burnt Hobbit Pot | 255 | T0 | pot/divider | 7 | 1x1 | 0 |  | 1 | 0 |
| 636 | Turbo Booster | 5 | D15 | burnTimeBooster | 5 | 1x1 | 0 |  | 1 | 0 |
| 637 | Hatching Egg | 14 | T30 | decor | 5 | 1x1 | 0.01 | 50/5000 | 0 | 3000 |
| 638 | Robot Remains | 14 | T35 | decor | 5 | 2x2 | 0.05 | 200/4000 | 0 | 3500 |
| 639 | Crashed Jet | 14 | T40 | decor | 5 | 2x2 | 0.05 | 300/3000 | 0 | 4000 |
| 640 | Fiery Hound | 12 | T40 | habitat | 5 | 1x1 | 0.02 |  | 1 | 150 |
| 641 | Golden Lion | 12 | T60 | habitat | 5 | 1x1 | 0.02 |  | 1 | 300 |
| 642 | Royal Bear | 12 | T20 | habitat | 5 | 1x1 | 0.02 |  | 1 | 50 |
| 643 | Rage Bull | 12 | T30 | habitat | 5 | 1x1 | 0.01 |  | 1 | 100 |
| 644 | Midnight Panther | 12 | $50000 | habitat | 5 | 1x1 | 0.01 |  | 1 | 20 |
| 645 | Leg Chamber | 12 | T15 | decor | 1 | 1x1 | 0.04 | 0/0 | 0 | 1200 |
| 646 | Head Chamber | 12 | T30 | decor | 1 | 1x1 | 0.07 | 0/0 | 0 | 2800 |
| 647 | Arm Chamber | 12 | T20 | decor | 1 | 1x1 | 0.05 | 0/0 | 0 | 1750 |
| 648 | Transmogrification Table | 12 | T40 | decor | 5 | 2x2 | 0 | 300/3000 | 0 | 4000 |
| 649 | Space Panel | 12 | $3200 | wall | 4 | 1x1 | 0 |  | 0 | 32 |
| 650 | Space Tile | 12 | $1250 | floor | 4 | 1x1 | 0 |  | 0 | 13 |
| 651 | Popcorn Booth | 11 | T30 | decor | 5 | 1x1 | 0 | 300/2500 | 0 | 3000 |
| 652 | 50's Jukebox | 11 | T50 | decor | 5 | 1x1 | 0 | 200/6000 | 0 | 5000 |
| 653 | Motorcycle | 11 | T40 | decor | 1 | 1x2 | 0.1 | 0/0 | 0 | 4000 |
| 654 | Super Server Tombstone | 5 | T50 | tombstone | 5 | 1x1 | 0.08 |  | 0 | 3000 |
| 655 | 50's Yellow Wall | 11 | $2200 | wall | 4 | 1x1 | 0 |  | 0 | 22 |
| 656 | 50's Green Wall | 11 | $2200 | wall | 4 | 1x1 | 0 |  | 0 | 22 |
| 657 | 50's Blue Wall | 11 | $3000 | wall | 4 | 1x1 | 0 |  | 0 | 30 |
| 658 | 50's Pink Wall | 11 | $3000 | wall | 4 | 1x1 | 0 |  | 0 | 30 |
| 659 | 50's Yellow Floor Tile | 11 | $1000 | floor | 4 | 1x1 | 0 |  | 0 | 12 |
| 660 | 50's Green Floor Tile | 11 | $1000 | floor | 4 | 1x1 | 0 |  | 0 | 12 |
| 661 | 50's Blue Floor Tile | 11 | $1200 | floor | 4 | 1x1 | 0 |  | 0 | 15 |
| 662 | 50's Pink Floor Tile | 11 | $1200 | floor | 4 | 1x1 | 0 |  | 0 | 15 |
| 663 | Hot Rod Chair | 11 | T3 | chair | 3 | 1x1 | 0.02 |  | 0 | 150 |
| 664 | Hot Rod Table | 11 | T2 | table | 3 | 1x1 | 0.01 |  | 0 | 80 |
| 665 | Junker Grill | 11 | $8500 | stove | 2 | 1x1 | 0.02 |  | 1.1 | 1000 |
| 666 | Clunker Grill | 11 | T15 | stove | 2 | 1x1 | 0.03 |  | 1.2 | 1200 |
| 667 | Hot Rod Grill | 11 | T20 | stove | 2 | 1x1 | 0.04 |  | 1.3 | 1400 |
| 668 | Diner Pot | 255 | T0 | pot/divider | 7 | 1x1 | 0 |  | 1 | 0 |
| 669 | Burnt Diner Pot | 255 | T0 | pot/divider | 7 | 1x1 | 0 |  | 1 | 0 |
| 670 | Chocolate Counter | 13 | T2 | counter | 2 | 1x1 | 0.02 |  | 0 | 200 |
| 671 | Gingerbread Choco Sink | 13 | $4500 | sink | 2 | 1x1 | 0.03 |  | 0 | 40 |
| 672 | Bitten Choco Table | 13 | T2 | table | 3 | 1x1 | 0.01 |  | 0 | 80 |
| 673 | Chocolate Table | 13 | T2 | table | 3 | 1x1 | 0.01 |  | 0 | 80 |
| 674 | Bitten Choco Stool | 13 | T3 | chair | 3 | 1x1 | 0.02 |  | 0 | 150 |
| 675 | Chocolate Stool | 13 | T3 | chair | 3 | 1x1 | 0.02 |  | 0 | 150 |
| 676 | Chocolate Oven | 13 | T25 | stove | 2 | 1x1 | 0.03 |  | 1.3 | 1500 |
| 677 | Jelly Plant | 13 | T10 | decor | 5 | 1x1 | 0 | 25/500 | 0 | 600 |
| 678 | Melted Ice Cream Scoops | 13 | T5 | decor | 1 | 1x1 | 0.03 |  | 0 | 350 |
| 679 | Lolly Tree | 13 | T3 | decor | 1 | 1x1 | 0.02 |  | 0 | 250 |
| 680 | Choco Ice Cream Bar | 13 | T10 | decor | 1 | 1x1 | 0.04 |  | 0 | 800 |
| 681 | Chocolate Bar Fridge | 13 | T25 | fridge | 2 | 1x1 | 0.03 |  | 0 | 1500 |
| 682 | Chocolate Wall | 13 | $4000 | wall | 4 | 1x1 | 0 |  | 0 | 40 |
| 683 | Choco Candy Tile | 13 | $3000 | floor | 4 | 1x1 | 0.01 |  | 0 | 35 |
| 684 | Dark Chocolate Tile | 13 | $1500 | floor | 4 | 1x1 | 0 |  | 0 | 18 |
| 685 | Milk Chocolate Tile | 13 | $1500 | floor | 4 | 1x1 | 0 |  | 0 | 18 |
| 686 | White Chocolate Tile | 13 | $1500 | floor | 4 | 1x1 | 0 |  | 0 | 18 |
| 687 | Cast Iron Oven | 19 | $9000 | stove | 2 | 1x1 | 0.03 |  | 1.2 | 1200 |
| 688 | Steel Edged Oven | 19 | T20 | stove | 2 | 1x1 | 0.04 |  | 1.3 | 1400 |
| 689 | Gilt Edged Oven | 19 | T25 | stove | 2 | 1x1 | 0.05 |  | 1.4 | 1600 |
| 690 | Victorian Fridge | 19 | T30 | fridge | 2 | 1x1 | 0.04 |  | 0 | 2000 |
| 691 | Serving Counter | 19 | T3 | counter | 2 | 1x1 | 0.03 |  | 0 | 300 |
| 692 | Victorian Table | 19 | T4 | table | 3 | 1x1 | 0.03 |  | 0 | 400 |
| 693 | Victorian Chair | 19 | $2500 | chair | 3 | 1x1 | 0 |  | 0 | 50 |
| 694 | Victorian Carpet | 19 | $950 | floor | 4 | 1x1 | 0 |  | 1 | 20 |
| 695 | Victorian Floor Tile | 19 | $900 | floor | 4 | 1x1 | 0 |  | 1 | 20 |
| 696 | Victorian Floor Tile | 19 | $900 | floor | 4 | 1x1 | 0 |  | 1 | 20 |
| 697 | Victorian Floor Tile | 19 | $900 | floor | 4 | 1x1 | 0 |  | 1 | 20 |
| 698 | Victorian Floor Tile | 19 | $900 | floor | 4 | 1x1 | 0 |  | 1 | 20 |
| 699 | Victorian Floor Tile | 19 | $900 | floor | 4 | 1x1 | 0 |  | 1 | 20 |
| 700 | Victorian Floor Tile | 19 | $900 | floor | 4 | 1x1 | 0 |  | 1 | 20 |
| 701 | Victorian Wall Panel | 19 | $4000 | wall | 4 | 1x1 | 0 |  | 0 | 45 |
| 702 | Stuffed Head | 19 | T75 | wallDecor | 1 | 1x1 | 0.12 |  | 1 | 6000 |
| 703 | Victorian wall lamp 2 | 19 | $3000 | wallDecor | 4 | 1x1 | 0 |  | 1 | 45 |
| 704 | Victorian wall lamp 1 | 19 | T30 | wallDecor | 4 | 1x1 | 0.07 |  | 1 | 1200 |
| 705 | Victorian wall lamp 3 | 19 | T10 | wallDecor | 4 | 1x1 | 0.02 |  | 1 | 800 |
| 706 | Home Movie Stove | 20 | $15000 | stove | 2 | 1x1 | 0.02 |  | 1.1 | 1400 |
| 707 | B-movie Stove | 20 | T15 | stove | 2 | 1x1 | 0.03 |  | 1.2 | 1600 |
| 708 | Blockbuster Stove | 20 | T20 | stove | 2 | 1x1 | 0.04 |  | 1.3 | 1800 |
| 709 | Roulette Table | 20 | T50 | decor | 5 | 1x2 | 0.12 | 400/5500 | 1 | 3500 |
| 710 | Ancient Statue | 20 | T55 | decor | 1 | 1x1 | 0.15 |  | 0 | 5000 |
| 711 | Cryostasis Pod | 20 | T85 | decor | 1 | 1x2 | 0.12 |  | 1 | 7000 |
| 712 | Attack Chopper | 20 | T60 | decor | 5 | 2x2 | 0.12 | 350/6000 | 1 | 4000 |
| 713 | Expand to 16x15 | 0 | $175000 | expansion | 5 | 16x15 | 0 |  | 1 | 0 |
| 714 | Expand to 16x15 | 0 | T60 | expansion | 5 | 16x15 | 0 |  | 1 | 0 |
| 715 | L'il Heat | 21 | $15000 | stove | 2 | 1x1 | 0.02 |  | 1.1 | 1400 |
| 716 | Big Burner | 21 | T15 | stove | 2 | 1x1 | 0.03 |  | 1.2 | 1600 |
| 717 | Flaming Hot | 21 | T20 | stove | 2 | 1x1 | 0.04 |  | 1.3 | 1800 |
| 718 | Rock Fridge | 21 | T30 | fridge | 2 | 1x1 | 0.04 |  | 0 | 2100 |
| 719 | Rock Counter | 21 | T5 | counter | 2 | 1x1 | 0.04 |  | 0 | 500 |
| 720 | Rock Drum Kit | 21 | T85 | decor | 1 | 2x1 | 0.12 |  | 1 | 7000 |
| 721 | Rock Guitar | 21 | $650000 | wallDecor | 1 | 1x1 | 0.15 |  | 1 | 4000 |
| 722 | Rock Gold Record | 21 | T70 | wallDecor | 4 | 1x1 | 0.11 |  | 1 | 5600 |
| 723 | Rock Platinum Record | 21 | T75 | wallDecor | 4 | 1x1 | 0.12 |  | 1 | 6000 |
| 724 | Rock Record Player | 21 | T60 | decor | 5 | 1x1 | 0.12 | 375/6500 | 1 | 4000 |
| 725 | Expand to 17x16 | 0 | $250000 | expansion | 5 | 17x16 | 0 |  | 1 | 0 |
| 726 | Expand to 17x16 | 0 | T80 | expansion | 5 | 17x16 | 0 |  | 1 | 0 |
| 727 | Rock Table | 21 | T4 | table | 3 | 1x1 | 0.03 |  | 0 | 400 |
| 728 | Rock Chair | 21 | $2500 | chair | 3 | 1x1 | 0 |  | 0 | 75 |
| 729 | Marble Floor Tile | 21 | $900 | floor | 4 | 1x1 | 0 |  | 1 | 20 |
| 730 | Piano Floor Tile | 21 | $900 | floor | 4 | 1x1 | 0 |  | 1 | 25 |
| 731 | Green Retro Fridge | 5 | $1200 | fridge | 2 | 1x1 | 0 |  | 0 | 25 |
| 732 | Green Retro Stove | 5 | $1200 | stove | 2 | 1x1 | 0 |  | 1 | 25 |
| 733 | Blue Retro Chair | 5 | $200 | chair | 3 | 1x1 | 0 |  | 0 | 4 |
| 734 | Blue Retro Table | 5 | $200 | table | 3 | 1x1 | 0 |  | 0 | 4 |
| 735 | Green Diner Stool | 3 | $130 | chair | 3 | 1x1 | 0 |  | 0 | 2 |
| 736 | Green Diner Table | 3 | $350 | table | 3 | 1x1 | 0 |  | 0 | 5 |
| 737 | Green Tile Floor | 3 | $50 | floor | 4 | 1x1 | 0 |  | 0 | 0 |
| 738 | Blue Tile Floor | 3 | $50 | floor | 4 | 1x1 | 0 |  | 0 | 0 |
| 739 | Retro Green Counter | 3 | $1000 | counter | 2 | 1x1 | 0 |  | 0 | 2 |
| 740 | Green Retro Sink | 3 | $1200 | sink | 2 | 1x1 | 0 |  | 0 | 2 |
| 741 | Green Diner Wall | 3 | $80 | wall | 4 | 1x1 | 0 |  | 0 | 2 |
| 742 | Stucco Wall | 5 | $200 | wall | 4 | 1x1 | 0 |  | 0 | 4 |
| 743 | Pub Window | 15 | $2500 | wallDecor | 4 | 1x1 | 0 |  | 0 | 75 |
| 744 | Green Pub Carpet | 15 | $500 | floor | 4 | 1x1 | 0 |  | 0 | 9 |
| 745 | Red Pub Carpet | 15 | $500 | floor | 4 | 1x1 | 0 |  | 0 | 9 |
| 746 | Green Wall Panel | 15 | $1000 | wall | 4 | 1x1 | 0 |  | 0 | 9 |
| 747 | Red Wall Panel | 15 | $1000 | wall | 4 | 1x1 | 0 |  | 0 | 9 |
| 748 | Mounted Jersey | 30 | T10 | wallDecor | 1 | 1x1 | 0.03 |  | 0 | 2000 |
| 749 | Green Booth Seat | 30 | $2000 | chair | 3 | 1x1 | 0 |  | 0 | 1500 |
| 750 | Basketball Hoop | 30 | $2500 | wallDecor | 1 | 1x1 | 0.01 |  | 0 | 1500 |
| 751 | Scoreboard | 30 | T15 | wallDecor | 1 | 1x1 | 0.03 |  | 0 | 2000 |
| 752 | Penalty Box Wall | 30 | $4000 | decor | 1 | 1x1 | 0.01 |  | 0 | 80 |
| 753 | Basketball Table | 30 | T1 | table | 3 | 1x1 | 0.01 |  | 0 | 1000 |
| 754 | Blue Round Table | 15 | $1500 | table | 3 | 1x1 | 0 |  | 0 | 40 |
| 755 | Black Grill | 15 | T20 | stove | 2 | 1x1 | 0.03 |  | 1 | 800 |
| 756 | Nautical Wall | 15 | $2000 | wall | 4 | 1x1 | 0 |  | 0 | 9 |
| 757 | Timeout Bench | 30 | T1 | chair | 3 | 1x1 | 0 |  | 0 | 1000 |
| 758 | Blue Tile Counter | 15 | T5 | counter | 2 | 1x1 | 0.02 |  | 1 | 50 |
| 759 | Cafe Table | 35 | T10 | table | 3 | 1x1 | 0.05 |  | 1 | 3500 |
| 760 | Country Table | 15 | $2000 | table | 3 | 1x1 | 0 |  | 1 | 50 |
| 761 | Comfy Seat | 35 | $5000 | chair | 3 | 1x1 | 0 |  | 1 | 2500 |
| 762 | Retro Chair | 15 | $1500 | chair | 3 | 1x1 | 0 |  | 1 | 1500 |
| 763 | Comfy Seat (Red) | 35 | $5000 | chair | 3 | 1x1 | 0 |  | 1 | 2500 |
| 764 | Cafe Chair | 35 | $3500 | chair | 3 | 1x1 | 0.03 |  | 1 | 3500 |
| 765 | Tile Sink | 15 | T10 | sink | 2 | 1x1 | 0.03 |  | 1 | 1 |
| 766 | Amptron Bundle Pack | 12 | T130 | decor | 5 | 1x1 | 0 |  | 1 | 620 |
| 767 | Country Chair | 15 | $500 | chair | 3 | 1x1 | 0 |  | 1 | 50 |
| 768 | Tiki Torch | 6 | $1000 | decor | 1 | 1x1 | 0.03 |  | 1 | 15 |
| 769 | Tiki Bar Counter | 6 | $5000 | counter | 2 | 1x1 | 0.03 |  | 1 | 70 |
| 770 | Tiki Bar Sink | 6 | $5000 | sink | 2 | 1x1 | 0.02 |  | 1 | 70 |
| 771 | Tiki Wall | 6 | $600 | wall | 4 | 1x1 | 0 |  | 1 | 9 |
| 772 | Tiki Stool | 6 | $2000 | chair | 3 | 1x1 | 0.02 |  | 1 | 30 |
| 773 | Tiki Mask | 6 | T5 | wallDecor | 4 | 1x1 | 0.02 |  | 1 | 100 |
| 774 | Fire Pit | 6 | T10 | stove | 2 | 1x1 | 0.03 |  | 1 | 700 |
| 775 | Tiki Table | 6 | $4000 | table | 3 | 1x1 | 0 |  | 1 | 60 |
| 776 | Large Ominous Tiki Head | 6 | T20 | decor | 1 | 1x1 | 0.05 |  | 1 | 1400 |
| 777 | Pet Tombstone | 8 | $100000 | tombstone | 5 | 1x1 | 0.02 |  | 0 | 500 |
| 778 | Pet Tombstone Level 2 | 8 | T25 | tombstone | 7 | 1x1 | 0.02 |  | 0 | 0 |
| 779 | Pet Tombstone Level 3 | 8 | T50 | tombstone | 7 | 1x1 | 0.02 |  | 0 | 0 |

---

## Appendix B — How each table was decoded (re-runnable)

All files are **big-endian streams**: ints and shorts BE, strings = 2-byte length + bytes. The exceptions: **floats are raw little-endian** (`DataInputStream::readFloat` copies 4 bytes as-is, while `readInt` is BE).

Scripts (scratchpad, not in the repo): `C:\Users\zhang\AppData\Local\Temp\claude\C--WINDOWS-system32\53df90b6-6d55-406b-975e-49e1bf6ae113\scratchpad\scripts\`. They are `rd.py` (reader), `food.py`, `cook.py`, `chars.py`, `furn.py`, `emu_consts.py`, `ios_recipe2.py`, `ios_cook.py`, `ios_chars.py`, `ios_items2.py`, `ios_enemy.py`, `pets.py`, `gen_tables.py` and `gen_tables2.py`. Run each with `python -I script.py <file> <out.json>`. capstone, pyelftools and unicorn are installed under `scratchpad\pylib`.

**Android (field names from `libZombieCafeAndroid.so` symbols, Thumb code):**
- `foodData.bin.mid`: u8 count (216), then per record:
  - UTF name;
  - i16 cost;
  - u8 level;
  - i16 cook min, i16 servings, i16 price, i16 XP, i16 image;
  - u8 theme, u8 source, u8 sheet, u8 stove theme;
  - i16 stove id;
  - u8 cookbook.

  This is the order of `Recipe::deserialize` (struct offsets 8/16/a/c/e/10/14/17/18/19/1a/1c/1f). The variant formulas are in `Recipe::getCookTimeSeconds/getCost/getSellPrice/getXp/getServings/getBurnTimeSeconds/getFinishToxinCost`.
- `cookbookData.bin.mid`: u8 count, then {UTF, i16 cash, i16 toxin, i16, i16, UTF desc, i16 stove theme, UTF, i16 level} (`CookBook::deserialize`).
- `characterData.bin.mid`: u8 count (219), then per record:
  - u8 level, u8 weight, u8 stars×51;
  - UTF name, UTF body art, UTF head art;
  - u8 pack;
  - i16 energy;
  - 6 × u8 stats;
  - bool female;
  - i32 cost;
  - u8 isToxin, u8 isChef;
  - f32 cook ×, i32 tip ×, f32 regen ×, f32 cook-XP ×;
  - bool;
  - i16 stove id;
  - u8 theme;
  - UTF human bio, UTF zombie bio.

  This is the read order in `ZombieCafe::initData`. The stat meanings come from which functions read `CharacterData + 0xab4…0xaba` (see §2.1).
- `furnitureData.bin.mid`: i32 count (484), then per record:
  - u8 level, UTF name;
  - i32 cost, bool toxin;
  - u8 w, u8 h;
  - 4 × i16 image per rotation;
  - u8 function, u8 tab;
  - i32 tint;
  - i16 $/h, i16 cap;
  - f32 rating;
  - i32 toxin amount;
  - u8;
  - f32 stove ×;
  - UTF desc;
  - f32 purchase XP;
  - bool listed;
  - u8 stove theme, bool upgradable;
  - i16 upgrade-from id.

  This is the `FurnitureData` constructor.
- `constants.bin.mid`: no names in the file. We emulated `Constants::load(DataInputStream*)` in unicorn:
  - map the `.so` and apply `R_ARM_RELATIVE/GLOB_DAT/JUMP_SLOT/ABS32`;
  - hook the `DataInputStream::read*` entry points to read our stream;
  - give `_Znaj` a bump heap;
  - turn all other imports into stubs;
  - afterwards, dump every `_ZN9Constants*` data symbol, and every heap block pointed to by one (element size from the write sizes).

  All 9789 bytes are consumed (2612 reads, 585 named constants).
- `help_*.html`: tags stripped.
- Sound triggers: `ZombieCafe::playEffect(int id)` call sites with an immediate `r1`. Music: `loadAndPlayMusic(channel, id)`.

**iOS (`.bin` with `.meta`/`.meta64` schemas; the field names are hashed, so fields were aligned against the Android rows instead):**
- `RecipeData.bin`: u16 count (320), then per record:
  - u16 id, UTF name, UTF image;
  - u8 (1), i32 study toxin, u8 special;
  - 7 × i32: cost, level, cook, servings, price, XP, image;
  - u16 (1), u8 theme, u8 source;
  - u16 sheet;
  - u8 stove theme;
  - u16 stove id;
  - u8 cookbook;
  - u16, i32.

  When special = 1 a variable block follows (rows 318–319).
- `CookBookData.bin`: u16 count (22), then {u8 id, UTF name, i32 cash, i32 toxin, u8, u16 id, u8 id, UTF desc, u16 stove theme, u16 level}.
- `CharacterData.bin`: u16 count (322), then per record:
  - u16 id;
  - u16 level, u16 weight;
  - i32 min stars, i32 art index;
  - UTF name, UTF art;
  - u8 pack;
  - i32 energy;
  - 6 × u16 stats;
  - u8 female;
  - UTF bio, UTF zombie bio;
  - i32 cost;
  - u8 isToxin, u8 isChef;
  - 4 × f32 (cook ×, tip ×, regen ×, cook-XP ×);
  - i16 stove id;
  - u8 theme, u8 flag.

  All 0 bytes left over.
- `ItemData.bin`: u16 count (793), u16, then per record:
  - u16 id, u16 id, u16 set;
  - UTF name, UTF image;
  - u16;
  - UTF tag;
  - i32 cost, i32 currency;
  - i32 w, i32 h;
  - u8, u8 function, u8, u8, u8 tab;
  - i32, i32 tint;
  - {u8 cash kind, u16 $/h, i32 cap};
  - f32 rating;
  - i32 toxin amount;
  - u8, u8;
  - f32 stove ×;
  - UTF desc;
  - i32 XP;
  - u8;
  - a variable image-offset block (`00 02` + int pairs, repeated).

  Records were re-synchronised by locating each name/`shared_` image pair.
- `PetData.bin`: u16 count, u16, then per record {u8 id, UTF name, UTF art, u8, i32 20, i32 1, UTF desc, i32 HP, 4 × i32 stats, f32 crit chance, f32 crit ×, u8 robot, u16}.
- `TombstoneData.bin`: u16 count (11), then 11 × 31-byte rows {u8 id, u16 item id, u16, u8 effect, u8, u16 uses, i32 duration s (or −1), f32 multiplier, …}.
- `EnemyCafeData.bin`: u16 count (26), then per record {u8 id, UTF owner, UTF name, u8 boss, i16 theme, i16 chef, u16 n + n × i16 staff, i16 icon, i16 forced layout, i16 min level}.
- `SoundData.bin` / `MusicData.bin`: u16 count, then {u8 id, UTF file}. `FunctionTypeData`: u16 count, then {u8, UTF}. `StoveTypeData`: u16 count (18), then {u8 theme, u16 item, u16 item}.
- `Constants.bin` (iOS): an 8-byte prefix (UTF version tag + 2 bytes), then the Android-style stream. The order diverges early (some arrays have 6 device entries, max level 100), so the Android emulator does not fit it. Instead, key arrays were found by searching for their Android value prefixes; each is preceded by a u8 count.
- `.anim`: header = 4 × u16 LE {version, 41, frames, flags}; the frame data was not decoded (doc 10's decoder covers the Android format).

---

## Unknown / could not decode

- **iOS `.meta` schemas**: the field names are 32-bit hashes. Their order is sorted by hash, not by stream order, so they weren't usable for naming. All iOS fields were named by aligning them with Android rows.
- **iOS Constants**: no full named dump. The order differs from Android, and the iOS Mach-O was not emulated. Only the arrays in §4/§5 and a few scalars were confirmed. **iOS-only constants are unknown**: Meat Locker starting hooks, pet energy rules, toxin-drop economy, the exact reanimation time.
- **Recipe source codes 3, 4, 7, 12** and the **extra block** of recipes 318–319.
- **iOS items**: 8 rows with an extra block plus 13 trailing records (BAD/omitted); the item fields `u16` after the image, the `u8`s around the function byte, and the variable image-offset block. The meaning of currency 2 ("Toxin Drops") pricing.
- **Character "Raid stat"** (4th stat byte) and the exact meaning of **Patience**; whether stars and weights also filter by owning the theme stove.
- **Pet record fields**: the 20 / 1 ints, the trailing u16, and stat labels A–D. The combine (giant-robot) rules and the Yeti summon timing.
- **Tombstone rows**: the trailing ints (0/1, 2/1/5) and u8 flags.
- **`XP_SCALER`**, `Furniture_MAX_RATING_BONUS` and the `*_SLOPE` constants: values known, exact use not traced.
- **Strings_EN.bin (iOS)**: the first 93 strings parse as UTF records, then the format changes; it was not needed.
- **Sound triggers** were mapped only for call sites with a constant id. Voice picks use `base + random` with the base in a register, so which group plays for which event is from the names only.
- **Store tab names** (1–7) are inferred from contents, not from strings.
