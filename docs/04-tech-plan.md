# 04 — Tech Plan (getting it on your iPhone)

## 0. Decision (Oct 2026 research update): build web-first, wrap for the App Store

After more research, we're **building Zombs BBQ as a TypeScript + Phaser 4 game** that runs in iPhone Safari right away and gets wrapped into a real App Store app with **Capacitor**. Why this beats starting in Unity:

| | Web-first (Phaser 4 + Capacitor) | Unity |
|---|---|---|
| Play on your iPhone | **Today**, via a link (and "Add to Home Screen") | Needs a Mac + Xcode build for every test |
| App Store path | Capacitor wraps the same code into a native iOS app (Phaser's own documented route). A Mac is only needed at that final step. | Native export (Mac needed) |
| Engine maturity | Phaser 4.0 shipped Apr 2026 with a rebuilt WebGL renderer and mobile speed/memory gains. We use 4.2.1. | Very mature |
| Cost | Free, MIT licensed | Free tier, with license rules |
| Fits this game | 2D isometric sim with tweened "cutout" animation, which is exactly Phaser's sweet spot | Overkill for 2D |

**Known iOS web limits and how we handle them:**
- Storage can be cleared for sites you don't visit. Home Screen web apps are exempt, and we add cloud saves later. The Capacitor app is unaffected.
- There's no background sync on iOS web. That's fine, because the game computes offline progress from timestamps when you come back.
- Push notifications need the Home Screen app (iOS 16.4+) or the Capacitor app. They'll be used for "your ribs are ready!" alerts.

**Code layout:**
```
game/
  src/sim/      pure TypeScript game rules (no graphics): unit-tested, deterministic, runs offline catch-up
  src/art/      vector (SVG) sprite generators in the Zombs BBQ style, turned into textures at boot
  src/scenes/   Phaser scenes: Boot → Joint (isometric world) + HUD (UI overlay)
  tests/        Vitest unit tests for the sim + a Playwright smoke test that screenshots an iPhone viewport
```

The original Unity plan below stays as the alternative if we ever outgrow the web stack.

Sources: [Phaser 3 vs Phaser 4](https://phaser.io/news/2026/05/phaser-3-vs-phaser-4), [Migrating from Phaser 3 to 4](https://phaser.io/news/2026/04/migrating-from-phaser-3-to-phaser-4-what-you-need-to-know), [Phaser 4.0.0 changelog](https://raw.githubusercontent.com/phaserjs/phaser/HEAD/changelog/v4/4.0/CHANGELOG-v4.0.0.md), [Bring your Phaser game to iOS and Android with Capacitor](https://phaser.io/tutorials/bring-your-phaser-game-to-ios-and-android-with-capacitor), [PWA iOS limitations](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide), [PWAs on iOS](https://monterail.com/blog/pwa-for-apple-ios)

---

## 1. Recommended stack

| Layer | Choice | Why |
|---|---|---|
| **Engine** | **Unity 6 (2D, URP)** | Industry standard for mobile 2D/isometric, a huge tutorial base, great iOS export, 2D lights for the night glow, and Spine runtime support. |
| **Animation** | **Spine 4.2** (Essential/Professional) + spine-unity runtime | The smooth "cutout puppet" look of the original, 60 fps, small memory footprint. |
| **Language** | C# | |
| **Backend** | **Unity Gaming Services** (Cloud Save, Authentication with Sign in with Apple, Cloud Code, Leaderboards, Economy), or **Firebase**, or **PlayFab** | Async raids need a server copy of each joint's defense layout. All three have free tiers that cover development and soft launch. |
| **Purchases** | Unity IAP (StoreKit 2 under the hood) | |
| **Analytics** | Unity Analytics or Firebase Analytics | Funnel/retention tuning. |
| **Ads (optional)** | AppLovin MAX / Unity LevelPlay (rewarded only) | |
| **Version control** | Git + Git LFS (this repo) | Art files go in LFS. |
| **Builds** | Xcode on a Mac → TestFlight; later Unity Build Automation or GitHub Actions on macOS runners | |

**Alternatives:**
- **Godot 4** (free, open source, great 2D; Spine runtime available; iOS export works) is the best choice if you want zero engine fees and a lighter editor.
- **SpriteKit/Swift** (Apple-native) is the smallest and fastest on iPhone, but it's iOS-only and has no built-in editor for isometric scenes.

## 2. What you need to ship on iPhone

1. A **Mac** with the latest **Xcode** (required to build iOS apps; a cloud Mac or CI runner works if you don't own one).
2. An **Apple Developer Program** membership ($99/year) for TestFlight and the App Store.
3. An iPhone for testing (plus the Xcode simulator for other sizes).
4. App Store Connect setup: bundle ID `com.<you>.zombsbbq`, privacy "nutrition label", age rating questionnaire (cartoon horror → 12+), in-app purchase products.

## 3. Architecture

```
Game (Unity)
├── Core
│   ├── GameClock          real-time timers, offline catch-up sim
│   ├── SaveSystem         local JSON (encrypted) + Cloud Save sync
│   ├── EventBus           decoupled game events (DishServed, ZombieHungry…)
│   └── Config (ScriptableObjects / remote JSON)  dishes, customers, zombies, levels
├── Joint (restaurant sim)
│   ├── IsoGrid            tile occupancy, footprints, placement validation
│   ├── Pathfinding        A* on the tile grid (custom; grids are small)
│   ├── Stations/Dishes    cook timers, servings, Keep-Warm, Perfect Bark
│   ├── CustomerSpawner    rating-driven arrival, seating, patience
│   ├── ZombieAI           state machine: Idle → Cook/Fetch → Deliver → Daydream → Tired → Rest | Attack
│   └── RatingSystem       decor/menu/service/incidents → stars
├── Raids
│   ├── RaidSim            deterministic lane battle (fixed timestep, seedable)
│   ├── DefenseLayout      serialize/deserialize a joint's defenses
│   └── Matchmaking (server)
├── UI  (UI Toolkit or uGUI + DOTween for juice)
└── Services  IAP, Ads, Analytics, Notifications, GameCenter
```

**Key technical decisions**
- **Data-driven content:** every dish, customer, zombie, decor item and level is a data row. Designers tune from a spreadsheet → JSON → remote config, with no app update needed for balance.
- **Deterministic raid simulation:** the server can re-run a raid from (attacker squad, defense layout, inputs, seed) to validate loot and stop cheating.
- **Offline progress:** on resume, fast-forward the joint sim in coarse steps (serve rate × elapsed time, capped), not a frame-by-frame replay.
- **Server-authoritative currencies** for Brain Sauce and purchases; cash is client-side with server checks on sync.
- **Performance targets:** 60 fps on iPhone 12 and newer, 30 fps minimum on iPhone XR/SE 2; under 300 MB RAM; at most ~80 animated characters on screen (use Spine LOD for distant ones).
- **Push notifications** (local): "Your Rib Rack is ready!", "Gus is HANGRY 🧟". Opt-in, max 3/day.

## 4. Repo layout (to be created in Phase 0)

```
ZombsBBQ/
├── docs/              design, art bible, tech plan, roadmap
├── art/
│   ├── concepts/      concept art & mockups (SVG)
│   ├── source/        layered source files (LFS)
│   └── export/        game-ready PNG/atlases (LFS)
├── unity/ZombsBBQ/    Unity project
├── data/              balance spreadsheets + generated JSON
└── server/            Cloud Code / backend scripts
```
