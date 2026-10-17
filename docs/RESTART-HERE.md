# RESTART HERE (saved 2026-10-17, usage-limit pause)

The owner's direction, in their words: the game "is not in a terrible place but it's far from
what it should be". **Movement, infection (the zombie must chase the customer), attacks, raids,
animations, cooking and the store setup are wrong** compared with the original Zombie Café.
Feature checklists come second; the core loop has to feel like the original first.
"Look at how the real game actually plays" — study it, then adjust ours.

Permissions given this session: Higgsfield (image/video/audio/3D generation) may be used for
sounds ("make sounds close to original"), textures, models or anything else needed. Capcom code
and art are **not** copied into the repo (it is public); facts, numbers, timings and behaviour
are taken from the original and reimplemented in our own code.

## Where everything is

| Worktree (D:\ClaudeResourcesProjects\Projects-working-on\) | Branch | State |
|---|---|---|
| `ZombsBBQ` | `claude/zombs-bbq-game-plan` | The original main branch, untouched. REA findings get written here as `docs/16-rea-findings.md` (copy it over when it exists). |
| `ZombsBBQ-work` | `feat/fix-and-features` | **Integration branch.** `wip/tech-ios` + `wip/visual-fixes` merged and green (814 tests, typecheck, build, audit clean). Windows build fixes. Docs 17, 18, this file. |
| `ZombsBBQ-anim` | `feat/anim` | Art style pass (doc 18 §3 recipe: ink weight, hard cel, eyes, greens, peach skin, torso, UI materials). Check its last commit and the "What changed / Remaining" section in doc 18. |
| `ZombsBBQ-audio` | `feat/audio` | Sound pipeline done and wired (sample-first, synth fallback, ambience + cooking loops, 827 tests green). Only 4 of 67 sounds generated: the Higgsfield account hit its daily cap (`grace_daily_limit_reached`) after 7 jobs. **When the quota resets:** follow `docs/20-audio.md` (`gen.py generate --max-per 1`, `pick`, copy to public/audio, `node tools/audio-manifest.mjs`, test, commit). |
| `ZombsBBQ-ui`, `ZombsBBQ-sim` | `feat/ui`, `feat/sim` | Empty, created for the build stage; removed or reusable. |

Original-game reference material (outside the repo, never commit):
- Correct-colour decoded sprites and UI of the original: `C:\Downloads\zombiecafe-reference\` (decoder: scratchpad `art\cct_decode.py`; `.cct` = 28-byte "CCTX" header + zlib; fmt 2 = RGBA4444 little-endian u16, fmt 1 = RGBA8888).
- The original running in BlueStacks: package `com.capcom.zombiecafeandroid`, instance `emulator-5554`, 1920×1080. Backend: `server.exe` from the `QemmHD/zombie-cafe-revival` v2.0.0 release (`gh release download v2.0.0 -R QemmHD/zombie-cafe-revival`), run it from any folder; it listens on :8080 and the APK talks to 10.0.2.2:8080. Taps need a short press: `adb shell input swipe X Y X+1 Y+1 120` (plain `input tap` is ignored). Use `"C:\Program Files\BlueStacks_nxt\HD-Adb.exe" -s emulator-5554`.
- Screenshots and recordings from the play-through: scratchpad `zc-release\shots\` (session-specific temp dir; copy anything worth keeping to `C:\Downloads\zombiecafe-reference\play\`).

## Docs written this session

| Doc | What it is | Status |
|---|---|---|
| 16 — REA findings | Decompiled logic of the original: infection chase, joint attacks, raid combat, movement, cooking, Meat Locker, pets, rating | Written by the binary agent into the `ZombsBBQ` tree; check its Status line |
| 17 — Original data tables | 320 recipes, 322 characters, 770 store items, XP/crew cap to level 100, rivals, tombstones, pets, Meat Locker, 227 sounds→triggers, help topics | Complete (committed) |
| 18 — Style match | Measured palette, ink weight, shading, proportions vs ours; ranked constant recipe; Blender verdict (no) | Complete; "What changed" appended by the art agent |
| 19 — Original play notes | How the real game plays, from BlueStacks: tutorial, cook/serve flow, customers, infection chase, command strip, hungry attack, store, HUD, raid | Written by the play agent; check "not reached" items |
| 20 — Audio | Sound targets, matched originals, prompts, similarity scores, sizes | Written by the audio agent |

Earlier docs still valid: 10 (decoded animation rig and rival layouts), 11/13 (audits), 15 (bug hunt).

## Facts already known to be wrong in ours (fix in the rebuild)

- Start cash is $5,000 in the original (ours $300). Start room 7×6: one stove, fridge, counter, one table, one chair; the chef starts at a glass front door on the right wall, closed sign, bouncing red arrow.
- Camera: close in, the room fills the screen; HUD is an awning bar (name, stars, level, XP bar, $ and toxin) plus one round button; tutorial is Gus on a chalkboard bar along the bottom.
- Chefs have Tip Rating, Attack Speed, Attack Strength and Energy (chef picker with 9 avatars, changeable any time).
- Character commands are a strip of green sticker buttons (Serve, Infect, Rest, Energize, Info, Upgrade, Destroy, Recipes, Photo, Attack, Revive, Discard, Salvage, Transform, Meat Locker, Work, Finish; Cook/Order on the stove), not a large card. Our card also hides the grimy stove in the tutorial (smoke test currently fails there; see below).
- Store tabs: Featured, Furniture, Decor, Walls/Floors, Utility, Cash, Special, Storage.
- Zombie max energy ×1.03 per level (not +5%); rating +0.005/−0.006 per event, −0.1 per attack, single rise capped +0.4, best decor +0.20; Meat Locker expansion 5 toxin → +5 hooks; tombstones ×2 damage or +100 energy for 5 s, 5 uses/day (12 upgraded); variant formulas in doc 17 §1.
- How ours works today (five systems, with file:line) is summarised in the session transcript's "five systems" report; the key points are repeated in doc 19's side-by-side column.

## Key findings from the binary (doc 16) that change the plan

- **Infection (doc 19 capture + doc 16):** INFECT on the customer card → the customer immediately RUNS for the door arms-up and the NEAREST crew member (chef or idle zombie) chases arms-forward at about the same speed; catch ~5.5 s across the room, <0.5 s if adjacent. No bite/transform clip (`INSTANT_INFECT=1`): the sprite swaps to the zombie form within 1–2 frames, keeps clothes/hair/name, stands idle, then wanders and auto-serves. No cost at level 1 ("$0"), no confirm. Build exactly this.
- Cooking/serving (doc 19): COOK charges cash and starts the timer at once, the cook walks over and stands behind the stove; done = green-check bubble; food reaches the counter only by select cook → touch stove (one plate carried, XP on counter); the server stands beside the table for the whole meal; no dish-order bubble; smiley + "$N" float at the end, dirty plate left. Store tabs seen: FEATURED, DECOR, UTILITY, FURNITURE, WALLS/FLOORS, SPECIAL; placement = ghost on green tiles + rotate + PURCHASE with TOTAL COST/XP. Tutorial freezes the sim and auto-pans the camera per step. Play captures (238 files, r2–r11.mp4 + 10 fps frames): `C:\Downloads\zombiecafe-reference\play\`. Game left at level 2, $4762, 4 toxin, crew 2/2, map icon just unlocked — raids, command strip, hungry attack, expansion not yet observed (doc 19 §9 has the resume notes).
- Bites: one check per zombie per 60 s below an energy threshold `max × (0.05 + 0.2 × (11 − self-control)/10)`; damage = Attack stat, swing every `1000/(2 + 0.2·Speed)` ms, each hit knocks back one tile; first hit → everyone panics, group scream, rating −0.1; feast +2 energy per chunk; bones 10 s + 3 s fade.
- Movement: speed multiplier `2 + 0.2·Speed`; zombies 1.2× slower; run for panic/flee/fired.
- Cooking: progress only while the cook stands at the stove; burn = only unattended time counts, normal `max(2×cook, cook+10 min)`, Fresh `max(3×cook, cook+10 min)`, 120 s grace with a cook attached; FINISH = `max(1, (xp×10 + price×servings)/500 × remaining/total)` toxin; tip = `price × 0.2 × tips/10` × avatar multiplier.
- Raids: live when the first zombie enters; servers attack the nearest zombie inside; the chef fights only once every server is down; customer kill +20 cash +2 XP; strength stone ×2 for 5 s, health +100 over 5 s; KO 8 h.
- Rating: +0.005 serve / −0.006 unhappy; arrivals 18 s → 4.5 s; away = 0.25× speed, ±0.4 cap per catch-up, closed drain ≈0.08 stars/h.
- Meat Locker: 5 hooks, +5 per 5 toxin, max 50, needs a free crew slot to take one back out. 14 rival-chef avatars with cook-speed / tip / regen / cook-XP perks. 9 pets (HP 250–1000, crits).
- Idle gags (idle3/4/5), celebrate, rise, hungry1/2 have no café call site in this build: adding them is our design, not copying.

Art pass: `feat/anim` HEAD 4719c74 (10 commits) — doc 18 §3 items 1–10, 12–14 done, tests green; remaining: tapered interior lines, airbrushed grime, runtime wall tinting, more accent garments.

## Open problems

- **Smoke test** (`npm run smoke`) fails at the tutorial's stove step on the merged branch: with the new HUD the YOU card covers the grimy stove and the room can't be panned enough (camera bounds + card width). A bounds slack was added in `JointScene.setBounds` but the test still reports the tap covered; the real fix is the original's compact bottom command strip. Everything after that step passes once the first dish is started. `tests/smoke.mjs` now pans before world taps and handles the Frequent Fryer popup at the Rest step.
- The doc 11/13 audit found many sim features never wired to the screen (hints, badges, alerts, Eat!/Rest-all/union break, zombie level + perks, Skip/reviewer card, Bin, welcome-back counts, load-backup screen, rename). Still true; do after the core loop.

## Next steps, in order

1. Read docs 19, 16, 17 (§1–4), then write the **gameplay rebuild plan** as side-by-side specs per system: movement → infection chase → cooking/serving flow → joint attacks → raids → store/HUD/command strip. Match the original's numbers; improve only where doc 13's bot evidence says the original was unfun.
2. Implement in `src/sim` (tested, deterministic) with the scene/HUD changes, one system per branch off `feat/fix-and-features`; verify each with unit tests + a smoke run + screenshots next to the BlueStacks captures.
3. Merge `feat/anim` (art constants) and `feat/audio` (sounds) once reviewed; then the Higgsfield asset batch: UI material textures, floor/wall tiles, splash, Gus portrait, chef avatars, dish-icon experiment.
4. Wire the dormant sim features (list above), then re-run the full smoke, gallery and device checks, update README.

## Commands

```bash
cd game && npm install --no-audit --no-fund --loglevel=error
npm test && npm run typecheck && npm run build
CHROME="$LOCALAPPDATA/ms-playwright/chromium-1234/chrome-win64/chrome.exe" node tests/smoke.mjs   # Windows: needs CHROME
```
Use Git Bash for file edits (PowerShell 5.1 `Set-Content` writes a BOM). Files are CRLF.
