# 11 — Gap audit (v3, after the bodies, bones and bonus-star work)

This audit compares what the original did against what our code does, item by item. Evidence on the original comes from docs 01, 06, 08 and 10, the decoded constants, and facts (not code or assets) read from the fan revival. Paths are relative to `game/src/`. Sizes: S = small, M = medium, L = large.

The biggest finding is that **energy has no teeth**.

## P0: these change the feel most

1. **Energy should matter for cooks, and a zombie at 0 energy should stop working.** (M)
   - **Original:** Help says zombies "slowly use up their energy… fall asleep". Tired zombies eat customers.
   - **Ours:** a cooking zombie drains forever and never bites (`sim/sim.ts` cooking state). Only idle zombies check for hangry. A zombie at 0 energy keeps working.
   - **Fix:**
     - Run the hangry check while cooking too: the cook leaves the stove and the dish pauses.
     - At 0 energy, the zombie falls asleep face-down (a new `asleep` state) until tapped or recovered.

2. **A hangry zombie needs a warning, a cooldown, and a manual "Eat" command.** (M)
   - **Original:** `ZOMBIE_ATTACK_INTERVAL 60000`, `ZOMBIE_ATTACK_WARNING 5000`, the hungry1/hungry2 slump clips, and an Attack button on the zombie command bar.
   - **Fix:**
     - A `hungry` state that lasts 5 s, with a slump pose and a pulsing "!". Tapping Rest cancels it.
     - At most one bite per 60 s per zombie.
     - An "Eat!" button: tap it, then tap a customer, for +20 energy (the original's trap-a-customer trick).

3. **The late game runs out of content.** (L)
   - **Ours:** the last level dish unlocks at level 9, the last new customer type at 15, the rival road ends at level 10, and the shop has only about 85 items (almost none past level 15–20).
   - **Original:** recipes unlock at every level up to 60, 14 rival themes, rival stat curves to level 83, and 444 items.
   - **Fix:**
     - At least one new dish per level up to 40, with new stations from doc 06 §3.
     - More customer types for levels 16–40.
     - Rival levels that scale with the player (doc 10 §2.7 curves), plus new rival themes.
     - New shop items every few levels.

4. **Onboarding.** (M)
   - **Original:** a bouncing tutorial arrow (`TutorialArrow_ARROW_BOUNCE_TIME`), and contextual Gus tips for: out of food, about to burn, an attack, a daydreamer, no seat, a free crew slot, an idle stove, "buy another stove", "you can expand", the map intro, and "time to open".
   - **Original:** a guided first table-and-chair purchase, and a 10 s meal for the first customer (`TUTORIAL_CUSTOMER_EAT_TIME`).
   - **Fix:** add the arrow, a one-shot hint table (stored in the save), the guided purchase and the short first meal.

5. **Check-in alerts.** (M)
   - **Fix:**
     - Events and toasts for "out of food" and "about to burn".
     - An empty-plate bubble when the counter is empty (today the bubble shows sliders).
     - Local notifications when the app is hidden: dish done, about to burn, zombie revived, rival reopened.
     - A notifications toggle in Settings.

6. **Sound bed.** (M)
   - **Missing:**
     - a diner ambience loop;
     - per-station cooking loops;
     - door, group scream, chewing, tip "cha-ching" and page-flip sounds;
     - random zombie mutters;
     - the energize "refresh" sound.
   - **Also:** the `panic` event is currently unhandled.

## P1: systems and bugs

7. **Bug: time away beyond 8 h doesn't count for timers.** `catchUp` caps the simulation at 8 h, so rival reopen timers, reanimation, the tombstone recharge, the boss schedule and the purple-star timers lose the rest of a long absence. **Fix:** shift absolute timers by the time not simulated. (S)
8. **Bug: the fridge silently deletes loot past 12 items.** **Fix:** warn when it's full and add a "Bin it" button. (S)
9. **Saves can die.** **Fix:** keep 3 rotating save slots, verify each write, and offer "Load backup" when a save won't load. (S)
10. **Raid loot is thin.** (M)
    - A won raid should take the rival's counter food.
    - Knocked-out staff should be edible for cash.
    - Each eaten diner should give +2 XP.
    - The counter should be rolled from the player's own dishes at their level −3 to +1, with the variant odds and a quarter-size stack (`RAID_FOOD_COUNT_MULTIPLIER 0.25`).
11. **Tombstones.** (M)
    - Strength should be ×2 (ours is ×1.6), and the heal +100 HP (ours is about 30).
    - Add a "Recharge 2 sauce" option, a level-2 upgrade (7 uses) and a revive tombstone.
    - Wire up or remove `inventory.headstone`.
12. **Neglected rivals.** (S)
    - A "competitor is stealing your customers" modal with a Raid Now button, a map badge, and a rating penalty (`ENEMY_RATING_MODIFIER 0.1`).
    - "Reopen now · 2 sauce" for a café that's boarded up.
13. **Zombie levels are invisible.** **Fix:** a level chip and XP bar on the card and in the crew list, plus "LEVEL UP!" floating text. (S)
14. **Zombie perks.** **Fix:** per-type cook speed, tip multiplier, regen and cook-XP bonuses, shown on the card and in the Zombiepedia. Also show the Recharge stat. (M)
15. **Cook from the stove or the cookbook.** **Fix:** tap an empty stove → dish picker → the nearest free cook goes. Cookbook rows get "Cook" buttons. (S)
16. **Economy constants have drifted.** (S)
    - Toxic barrel: +10% regen each (ours is +60%).
    - Tips: about 20% at Tips 10 (ours is 40%).
    - Crew cap table: 1, 2, 3, 3, 4, 4, 5, 5, 6, 6…
    - New zombies start at 20 energy.
    - Refill only allowed below 80% energy.
17. **Purple stars.** **Fix:** cap at 168 h, add a Skip option and a review card, use the original's task targets (serve 10 × level), and add a "spend" task. (S)
18. **Welcome back.** **Fix:** show served / angry / bitten / burnt counts and the rating change; blink the stars green or red. (S)
19. **Acting clips.** **Fix:** (M)
    - add the idle3 arm-falls-off gag, idle4 and idle5, mouthwipe, startled, celebrate, the death fall, rise on reanimation, and the hung dangle;
    - play the idle gags at random.
20. **HUD "new" badges.** **Fix:** a bouncing "!" for new shop items, new recipes, a free crew slot, a new Zombiepedia entry, the boss being here, or a rival stealing customers. (S)
21. **Customer names.** **Fix:** a seeded first name per customer, carried into the zombie ("Zombie Gary (ex-Accountant)"). (S)
22. **No "can't reach" feedback.** **Fix:** a bubble and a Gus hint when a worker can't find a path. (S)
23. **Rare customer arrivals.** **Fix:** a sparkle trail and a sting sound. (S)

## P2: depth and offline stand-ins

24. **Frequent Fryer:** a daily cooking streak with rewards ($25, $50, meals, sauce…). (M)
25. **Magic Fridge:** costs 30 sauce and gives one free dish a day. (S)
26. **Recipe-collection milestones:** chef-rank titles and XP bonuses. (S)
27. **Very Spicy, Very Fancy and Very Quick variant tiers.** (S)
28. **Meat Locker:** zombie storage outside the crew cap. (M)
29. **Chef avatars:** beaten rival chefs unlock as avatars. (M)
30. **Pets:** a pets panel, pet KO and reanimation, and more pets. (M)
31. **No raid clock:** the original has none (or allow a generous 5 min); a longer pause on the results screen. (S)
32. **Raid squads:** the original raids with non-chef characters only. YOU (the chef) should stay home. (S)
33. **Customer pacing:** customers walk at their own speed, pause about 1 s at the door, and wait a 2 s "holding food" beat. (S)
34. **Closing up:** when the café closes, the whole crew naps on the sidewalk. (S)
35. **Help page and photo mode.** (S)
36. **Decorating:** drag-to-paint, long-press to pick up furniture, and inertial camera pan. (S)
37. **Small niggles:** (S)
    - resting a cook should pause their dish;
    - a fired zombie should lurch off instead of vanishing;
    - the Zombiepedia should show full stats.
38. **Dead code:** `graves`, `refreshDaily`, `inventory.headstone`. (S)

**Juice:**
- Separate tip text with a second "cha-ching".
- A tap ripple, and a bounce when something is selected.
- "Zzz" puffs every 20 s.
- Coins that fly to the cash counter.
- A startled reaction to a bite nearby.
- A group scream and a camera pulse on panic.
- A reviewer card when a purple star is earned.
- Settings toggles for haptics and reduced motion.
- Tap the awning to rename the joint.
