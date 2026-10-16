# 07 — Build Log

Each step is built small, tested, checked on an iPhone-landscape screenshot, then committed.

## Prototype 0.1 (Oct 2026) — the core loop is playable
Play link (private to the owner until shared): https://claude.ai/artifact/2P1H2yXZt5oxNg1FbHGt5f

**What works**
- Isometric BBQ joint (8×8) with walls, door, counter, grill, locked smoker, picnic tables, lawn, sidewalk and road.
- Cutout-puppet characters: walk / zombie shamble with arms forward / cook / eat / sit / nap lying on the lawn.
- Tutorial narrated by Gus the Zombie Union Rep, in the original's order: YOU cook → plate to counter → customers eat and pay → infect your first customer (free) → your zombie cooks → Energy lesson → rest.
- Cooking: tap a cook, then a stove, pick a dish; timers keep running while away; dishes burn if left too long.
- Customers: arrive by star rating (≈ 1 + half-stars), sit, wait, eat, pay with tips, leave with happy/angry faces; full house = they turn away angry.
- Zombie crew with the original's six stats; Patience-based HANGRY bites ("CHOMP!"), daydreaming (tap to snap out), resting, Brain Sauce refills.
- Level/XP, crew cap, smoker unlock at level 4, autosave, offline earnings (8 h cap) with a "Welcome back" report.

**Tests**: 83 unit tests (rules + art contract) and an iPhone smoke test that plays the full tutorial with real taps.

## Next steps
1. Playtest feedback from the owner on a real iPhone → tuning pass (timers, prices, energy drain).
2. Store + edit mode: buy/place/move/rotate furniture, decor raises rating, expansions.
3. More customers and zombies from the roster (nurse, cop, CEO … up to the level-15 rares).
4. Raids v1: map, Chuck Wagon's Chow Hall, line-up + Send All, tap-to-target, Head Chef boss, steal dishes to the Fridge.
5. Sound effects + music, haptics, Home Screen icon/manifest.
6. Capacitor iOS wrapper + TestFlight (needs a Mac + Apple Developer account).
