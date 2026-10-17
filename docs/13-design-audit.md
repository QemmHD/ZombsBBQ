# 13 — Design audit: fun, pacing, balance and UX (v3)

This audit is backed by economy-bot runs. Four strategies were tested: baseline, cautious, decor-heavy and raid-heavy. Each was played two ways: 24 hours of non-stop play, and 14 days of four 10-minute check-ins a day. It also uses a raid matrix (21 squads × 6 rivals × management generations 0, 3 and 10, 12 seeds each), a minute-by-minute log of a first session, and an offline "welcome back" probe.

The harnesses are in the session scratchpad (`design/`). Items already in docs 11 and 12 are not repeated here.

**Status:** items 1–8, 9–11, 13–14 and parts of 19–23 have been handed to the four builders. The rest are queued for the next wave.

## P0

1. **Leaving the app wrecks your rating.** Every check-in starts at 0 stars: customers keep arriving to an empty counter and leave angry, and being closed drains 2.9 stars over 8 hours.
   - **Sold out:** with no food on the counter, at most one customer peeks in every 5 minutes, and the door says "SOLD OUT (of food, not brains)".
   - **Being closed:** drain only 0.4 stars over 8 hours.
   - **While away:** lose at most 1 star per hour.
   - **Decor:** acts as a rating floor (see 13).
2. **The offline loop is broken.**
   - Nobody puts finished dishes on the counter while you're away, so offline cash is capped by what's already there.
   - Cooking timers stop after 8 hours, so 12–24 hour dishes can't finish overnight.
   - **Stoves:** keep running on real time for up to 24 hours.
   - **Expediter's Pass-Thru:** a level-4 item for $2,500. Idle staff put finished dishes on the counter.
3. **Zombies bite customers non-stop while you're away:** 569 of 578 bites in check-in play.
   - **Union break:** tired zombies go out to nap while the app is in the background.
   - Add a "Rest all tired" button.
4. **The Zombie Pug makes more money than the whole joint:** about $2,000 an hour, even when closed or offline.
   - Make it $5–15 per find, about one find every 6 minutes.
   - No finds while closed, and at most $600 a day.
5. **Level 40 is out of reach:** it needs 1.68M XP, and a check-in player earns about 480 XP a day.
   - **New curve:** `xpToNext = 950·1.10^(L-10)`.
   - **Early levels:** cut levels 3–5 to 50/80/120 XP.
   - **Dish XP:** scales with the dish's unlock level, `×(1+0.15·L)`.
6. **The first dish is the best dish forever:** Mystery Sliders has both the top profit per hour and the top XP per hour.
   - Retune so profit per stove-hour grows about 12% for each later dish.
   - **Variety:** +10% tips with 3 or more different dishes on the counter.
   - **Dish picker:** show profit per serving.
7. **The "simmer" rule.** Cooks lose energy only during the first 10 minutes of a dish. Without this, long dishes can never finish once tired cooks leave the stove (doc 11 #1).
8. **Brain Sauce barely comes in:** 3–6 a day for a non-stop player, 2–4 over 12 days for a check-in player.
   - **New sources:**
     - +1 per level-up, and +3 every 5 levels;
     - +1 per purple star;
     - raid drop chance at least 0.5;
     - +1 for the first raid win each day;
     - +1 a day just for opening the game.
   - **Cheaper items:**
     - Toxic Barrel 15;
     - ATM 30;
     - Souped-Up Stove 10;
     - Champ 60.

## P1

9. **Raids are decided before they start, and numbers beat quality:** 7 free Joes beat Crunch every time, while 3 Boxers win 42%.
   - **Threat meter:** show Easy / Even / Deadly on the rival card.
   - **Gus tip:** "clear the waiters first" (this tactic lifts some fights from 25% to 63–100%).
   - **Type abilities:**
     - Sumo: knocks down a crowd;
     - Boxer: double hit;
     - Cop: stun;
     - Cheerleader: damage aura;
     - Champ: taunt.
10. **Tombstones are an I-win button.** Allow one use per stone per raid; keep heal at about +30 and strength at ×1.5. Do not apply doc 11 #11's ×2 / +100.
11. **Rivals get tougher forever and close the raid road.**
    - Cap toughness at `1+0.15·min(gen,5)`.
    - Cash reward of at least 2 hours of your income.
12. **Servers grab the nearest dish instead of the best one.** Serve the highest-priced dish first.
13. **Decor is invisible and mislabelled.** The shop shows "+2★" for what is really +16% rating speed.
    - Relabel the shop text.
    - Use decor as a rating floor: `floor(bonus×10)` half-stars.
14. **Money-makers take about 28 days to pay back.**
    - Aim for 3–5 days: Snack $2,500, Comic Rack $3,000, Jukebox $6,000, Arcade $8,000, Foosball $10,000, Bandit $18,000.
    - Each should hold about 10 hours of earnings.
    - Collect with one tap.
15. **Cash piles up mid-game** with nothing to buy.
    - **Stove upgrades:** 5 tiers ($2k–$70k), each +10% speed and +15% burn window.
    - **Expansions:** gate them by level (3, 6, 10, 14, 18, 22, 26, 30).
16. **Minutes 14–90 of a first session have nothing new.**
    - Faster early levels (item 5).
    - A second stove as the "cook1" goal reward.
    - Move "win your first raid" up to goal 5.
17. **Burn timing doesn't fit real breaks.**
    - Picker shows "Ready 3:40 pm · burns 5:40 pm" with a "fits your break" tag.
    - Heat lamp: +100%.
    - Dishes of 15 minutes or longer wait at least an hour before burning.
18. **"Finish now" is priced out of reach.** Charge 1 Brain Sauce per started 30 minutes, capped at 6.

## P2

19. **Taps per action.**
    - **Infecting with a full crew:** about 5 taps, while chasing a moving customer. Add a "Swap for…" picker.
    - **Resting a cook:** blocked, even while the card warns it's about to bite.
    - **Buying a seat:** about 10 taps. Add a "Table set" that places the pair.
    - **Collecting a money-maker:** 2 taps; make it 1.
    - **Raids:** add "Raid again" and "Next joint" buttons.
20. **Feedback.**
    - **Raid results:** show 3 star slots, not 5.
    - **Raid loot:** stop handing out "→ Fridge" dishes you already know.
    - **Rival card:** stale rival level, and recipes marked "(known)".
    - **Level-up:** don't list every colour separately.
    - **Cash and Brain Sauce counters:** tapping them should explain how to earn more.
    - **Rating panel:** say why the stars fell.
    - **YOU's energy bar:** decorative only; YOU never tires.
    - **Tutorial step 5:** a one-stove deadlock.
21. **Choice depth.** Add role tags on customer cards (Raider, Server, Tipper) and a comparison against your current crew.
22. **Tone.**
    - Show dish blurbs; they're written but never displayed.
    - Gus lines after the tutorial ends.
    - A defeat line and a win line for each rival chef.
    - Varied raid result text.
    - Funnier welcome-back text and achievement names.
23. **Modern player expectations.**
    - "Close up for the night" in one tap.
    - Batch actions.
    - Undo for sell and fire.
    - Export/import of a save code.
    - A records page.
    - A text-size setting.
    - A daily Brain Sauce stipend.

**Testing:** add a check-in scenario to `tests/economy.test.ts`. After an 8-hour absence it should assert:
- at least 2 stars on return;
- no more than 2 bites while away;
- no more than 10% of dishes burnt;
- Brain Sauce income of at least 3 a day.
