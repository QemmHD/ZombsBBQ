# 05 — Roadmap: Step by Step from Zero to the App Store

Timeline assumes a **small team** (1 programmer, 1 artist/animator, part-time design/audio) of about **12 months**. A solo developer should roughly double it, or cut scope to the "MVP" markers (★).

Each phase ends with a **gate**: don't move on until it's true.

---

## Phase 0: Setup (Week 1–2)
1. ★ Get a Mac + Xcode, enroll in the Apple Developer Program ($99/yr).
2. ★ Install Unity 6 LTS (with the iOS Build Support module) and Spine.
3. ★ Create the Unity project in `unity/ZombsBBQ`; set up Git LFS for `*.png, *.psd, *.spine, *.wav`.
4. ★ Build an empty scene to your iPhone via Xcode, so you prove the pipeline on day 1.
5. Make the balance spreadsheet (`data/balance.xlsx`) with tabs for Dishes, Customers, Zombies, Levels, Decor.

**Gate:** a "Hello Zombie" scene runs on your iPhone.

## Phase 1: Paper & grey-box prototype (Week 3–8)
6. ★ Isometric grid: camera pan/pinch-zoom, tile picking, place/move/rotate boxes.
7. ★ Pathfinding on the grid; grey-box "customers" walk in, sit, leave.
8. ★ One station + one dish: cook timer → counter with servings.
9. ★ Zombie server AI: fetch dish → deliver → customer pays (coins pop).
10. ★ Energy + Patience + attack-a-customer + Rest (face-plant / lawn nap) + daydreaming.
10b. ★ YOU (Patient Zero) as a cook; tap-cook-then-stove assignment; dish burning at 2× cook time.
11. ★ Infect a customer → becomes a zombie.
12. Grey-box raid: 1 lane, 3 zombie types, 2 defenses, a 90 s timer.
13. Save/load to local JSON; offline progress catch-up.
14. **Playtest with 5 people.** Is serving + feeding + infecting fun for 10 minutes with grey boxes? Iterate until yes.

**Gate:** the core loop is fun with placeholder art.

## Phase 2: Art pipeline & vertical slice (Week 9–18)
15. ★ Lock the art style using the concept art in `art/concepts/` (refine, get feedback).
16. ★ Build the **shared humanoid Spine rig**; animate idle/walk/walk_carry/sit/eat/infect/tired/attack/rest-faceplant/daydream.
17. ★ Final art for 6 customers + their zombie forms, the starter crew (Gus, Nell…), and the Burnt Shack + Texas Roadhouse themes (~40 decor items).
18. ★ HUD and menus per the mockup: awning bar, side buttons, shop, recipe book, crew screen.
19. ★ The juice pass: particles, coin fly-to-HUD, popups, squash & stretch, haptics, SFX.
20. Perfect Bark timing tap, customer requests, Rush Hour.
21. Raid Map Chapter 1 (5 stages + Big Hank boss) with final art.
22. FTUE (first-time user experience) tutorial script (see GDD §5).
23. **Playtest with 15–20 people** (TestFlight internal). Measure: tutorial completion, session length, "would you play tomorrow?"

**Gate:** a 30-minute slice that looks and feels like the final game.

## Phase 3: Production (Week 19–36)
24. Content: 16 customer types/zombies, 40 recipes, 6 stations, ~220 decor items, 6 themes, 7 defenses, 9 raid chapters, 6 pets.
25. Backend: Sign in with Apple, cloud save, server-side raid validation, PvP matchmaking, leaderboards, crews.
26. Economy tuning in the spreadsheet → remote config. Simulate 30 days of play with a script and check against the pacing table.
27. Monetization: Grill Pass, starter pack, remove ads, rewarded ads (opt-in only).
28. Settings & accessibility: reduced motion, auto-timing, text size, VoiceOver, colorblind icons.
29. Local notifications, Game Center achievements.
30. Localization-ready text tables.

**Gate:** content complete. Every system is in, with no placeholder art.

## Phase 4: Beta & soft launch (Week 37–46)
31. **External TestFlight beta** (up to 10,000 testers). Recruit from Zombie Café nostalgia communities (Reddit, Discord).
32. Bug bash, performance pass on older iPhones (XR, SE 2), memory and battery checks.
33. **Soft launch** on the App Store in 1–2 smaller English-speaking countries (e.g. Canada, New Zealand, Philippines).
34. Watch the metrics; targets: **D1 retention ≥ 40%, D7 ≥ 15%, D30 ≥ 6%**, tutorial completion ≥ 85%, crash-free ≥ 99.5%.
35. Iterate on the FTUE, economy and raid difficulty until the targets are hit.

**Gate:** soft-launch KPIs hit.

## Phase 5: Global launch (Week 47–52)
36. App Store page: icon (`art/concepts/app-icon.svg` as the base), 6.9" & 6.5" screenshots, a 30 s app preview video (raid + infection + decorating), and keywords (zombie, restaurant, cafe, bbq, cooking, tycoon).
37. Press kit, TikTok/Shorts clips (lunge fails and infection dances are naturally shareable), and outreach to creators who covered Zombie Café.
38. Launch with the **Halloween Graveyard Grill** event ready (time the launch for October if you can).

## Phase 6: Live ops (ongoing)
39. A new event every ~4 weeks, a new Grill Pass season every ~6 weeks.
40. Quarterly content drops: a new theme, a raid chapter, 2–3 zombies, the level cap +5.
41. Android port (Unity makes this mostly a build target plus Google Play Billing).
42. Community: Discord, a joint-of-the-week showcase from Photo Mode shares.

---

## Rough budget (indie, contractor rates vary a lot)

| Item | Estimate |
|---|---|
| Apple Developer | $99 / year |
| Unity (Personal is free under the revenue threshold) | $0 to start |
| Spine Essential / Professional | ~$69 / ~$369 one-time |
| Fonts (Lilita One, Nunito) | Free (OFL) |
| Freelance 2D artist + animator | the biggest cost; scope with the character/decor counts in GDD §6 |
| Music & SFX | royalty-free libraries or a freelancer |
| Backend (UGS / Firebase free tiers) | ~$0 until real traffic |

## Your very next 5 steps
1. Confirm the name **Zombs BBQ** and the BBQ theme (or swap in a café/diner theme; the design works either way).
2. Pick the engine (Unity recommended; Godot if you want free/open source).
3. Get the Mac + Apple Developer account sorted.
4. Ask me to **scaffold the Unity project** in this repo (grid, camera, save system, data tables) and start Phase 1.
5. Share the concept art with an artist and use `03-art-and-animation.md` as their brief.
