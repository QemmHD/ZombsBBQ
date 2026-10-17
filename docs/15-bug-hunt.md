# 15 — Bug hunt (v3)

Fuzzing and code reading over about 145,000 simulated minutes, using three player styles (chaos, steady, neglect):
- 63k customers served;
- 3,861 raids;
- 673 reloads after random absences;
- 1,268 save/load round-trips, all exact.

The repro tests live in the session scratchpad (`bughunt/`).

**Status:**
- **Café builder:** 1–5, 7–12, plus the café part of 13.
- **Raid builder:** 6, the raid part of 12, the RaidScene race and the squad text.

## Bugs, by severity

1. **Softlock: killing the app mid-raid leaves the squad stuck "raiding" forever.**
   - Cause: `beginRaid` saves after `startRaid` has already set them to `raiding`.
   - If YOU went too, the joint can't cook. This is the original's "brain-dead zombie" bug.
2. **Data loss: any load error starts a fresh game, and the autosave then overwrites the save.**
   - For example, a dish id that's been removed but is still on a stove.
   - This breaks lesson 1 from doc 08: a save must never die.
3. **Two quick infects go over the crew cap.** Customers mid-infection aren't counted.
4. **Expanding swallows lawn items into the café.**
   - Also, `layoutProblem` and the sim disagree about outdoor items.
5. **Boxed-in workers act at a distance.**
   - There's no check for enclosed pockets.
   - A failed path is treated as "arrived", so cooks teleport and a hunting zombie bites instantly.
6. **Instant retreats farm XP:** about 980 XP in 10 minutes.
7. **The Zombie Pug earns about $1,900 an hour,** even while the joint is closed or you're offline.
8. **Closing for the night costs about 3 stars.**
9. **Offline timers are inconsistent.**
   - Timers that run on game time are capped at 8 hours.
   - Purple stars age differently on a cold start than on resume.
10. **Storing and re-placing a tombstone refills its uses.**
11. **YOU never regains energy after a raid.**
12. **Smaller rule bugs.**
    - **Cancelling while a stove is reserved** refunds only 50%.
    - **A raid with no zombies** still gets 3 stars.
    - **Cooks never get hangry.**
    - **A bite restores a flat 20 energy** instead of about 20%.
    - **The crew cap tops out at 11,** not 13.
    - **Moving any furniture cancels every carry** in progress.
13. **Hygiene.**
    - **Events never handled:** `panic`, `zombieLevel`, `plated`, `cleared`, the raid `arrive`.
    - **Events never emitted:** `goal`, `toast`.
    - **Dead code:** `refreshDaily`, `today()`, `graves`, `inventory.headstone`.
    - **RaidScene asset-load race.**
    - **A failed character load is cached forever.**
    - **`catchUp` drops events,** including offline level-ups.
    - **The squad picker's text about cooks is wrong.**

## Invariants that held everywhere

- **Numbers:** no NaN or Infinity anywhere. The rating stays in [0, 1]. Cash, Brain Sauce and servings never go negative.
- **Money:** cash changes only through valid events.
- **Failed actions:** leave the state unchanged.
- **Workers and stoves:** no worker or stove gets stuck. Knocked-out zombies always come back.
- **Customers:** every customer leaves, and seats are never double-booked.
- **Layout:** stays valid, apart from the expansion bug above.
- **Raids:** always end.
- **Saves and offline time:** save → load is exact. Offline catch-up gives the same result as playing the time through.
- **Purple stars, variants and the to-do list:** stay consistent.
