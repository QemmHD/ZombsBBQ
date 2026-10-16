# 14 — Technical audit (v3)

Read-only audit with measurements: headless Chromium at dpr 3 plus Node probes. Timings were taken on a loaded host, so treat the absolute numbers as ranges.

Baseline: tsc clean (15.9 s), 1052 tests pass, `npm audit` reports 0 vulnerabilities.

**Status:**
- Handed to the café builder: 1, 2, 5, plus the catch-up parts of 9.
- Handed to the raid builder: 4.
- Everything else is queued for the next wave.

## P0: data loss, crashes, memory kills

1. **Killing the app mid-raid strands the crew in "raiding" forever.**
   - Cause: `beginRaid` saves after `startRaid` has already set the workers to `raiding`, and nothing ever resets that state.
   - Reproduced. Fix: repair the state in `serialize`/`migrate`. (S)
2. **A corrupt save, or a throw during catch-up, silently starts a fresh game, and the autosave then overwrites the real save.**
   - Fixes:
     - keep the corrupt save under a `.corrupt` key;
     - block autosave until the player chooses recover or start fresh;
     - validate the save in `migrate`;
     - if catch-up fails, load without catching up;
     - warn the player when storage can't be written. (S–M)
3. **Textures are never freed, and each one also keeps its parsed SVG `Image`.**
   - Measured: GPU memory 38.8 MB at boot → 71 MB after one raid → 101.7 MB during the third raid. DOM nodes grew from 23.7k to 76.8k.
   - The full catalogue at TEX_S 3 is about 145 MB of props plus 181 MB of characters.
   - Fixes:
     - remove raid-only textures when a raid ends;
     - evict characters that haven't been seen recently (LRU);
     - clear the `charLoads`/`charsReady`/`pending` caches when textures go;
     - use atlas canvases and drop the `Image`s once uploaded. (M)
4. **RaidScene's resize listener outlives the scene** (`scene.remove` only emits DESTROY), so a resize in the second or a later raid throws a TypeError. (S)

## P1: boot, robustness, iOS feel

5. **One exception in a frame freezes the loop for good.**
   - Fixes: try/catch around the update, a global error handler, hidden sourcemaps. (S)
6. **`initArt()` builds every asset synchronously at module load.**
   - Cost: 529 ms. That includes 161 ms of dead v2 builders and 132 ms for the raid map.
   - Fix: build lazily. (S–M)
7. **The eager set rasterizes every wall, floor and door finish** (101 textures, 22.7 MB) and every dish icon.
   - Fix: derive the set from the current layout and known recipes. (S)
8. **TEX_S 3 on 3× iPhones.**
   - Fix: TEX_S 2 for ground, walls and floors (eager set drops from 22.7 to 10.1 MB). Consider 2.5 for characters, and add a quality option. (S)
9. **Offline catch-up blocks the main thread** (728 ms for 8 h with 10 workers) and drops the level-up events earned while away.
   - Fix: a coarser step, or spread the work over frames. (M)
10. **SVG filters.** 144 of 288 props use blur/turbulence filters. The CSS textures re-rasterize on every resize, and `map_bg` is encoded to JPEG on the main thread.
    - Fixes:
      - cache rasters in Cache Storage/IndexedDB, keyed by build + key + TEX_S;
      - replace blurs with pre-softened gradients;
      - use `toBlob`. (M–L)
11. **No haptics on iOS** (`navigator.vibrate` is unsupported there).
    - Fix: a `haptic()` wrapper backed by `@capacitor/haptics`. (S)
12. **iOS gesture leaks:** no `-webkit-touch-callout: none`, no `gesturestart` preventDefault, and the scroll areas have no `touch-action`. (S)
13. **No PWA packaging:**
    - no manifest, apple-touch-icon, splash or service worker;
    - the embed build drops `#boot`/`#rotate`;
    - the debug global `window.zbbq` and the Phaser banner ship in production. (S–M)
14. **Storage persistence:** iOS can purge the save.
    - Fixes: Capacitor Preferences/Filesystem, or `navigator.storage.persist()` on the web; surface write failures to the player. (S)

## P2: frame cost, batching, bundle

15. **The ground is 727 separate Images**, all submitted every frame with no culling, and `rebuild()` recreates them on every paint tap.
    - Fix: bake the ground into DynamicTexture chunks. (M)
16. **Batching:** about 24 textures per character, 74–168 texture binds per frame, and `maxTextures` 16 runs the compare chain on every fragment.
    - Fixes:
      - atlas each character and the props;
      - lower `maxTextures` to about 8;
      - make the Vite shader patch fail the build if it doesn't apply. (M–L)
17. **A new Phaser Text object for every floating label** (a texture churns per hit).
    - Fix: pooled text or BitmapText. (S–M)
18. **Allocations every frame:**
    - `sig()` joins the whole layout into a string;
    - the door check spreads arrays and builds a Set;
    - `Object.keys` runs per puppet;
    - the HUD re-parses card HTML containing 15–54 KB data URLs every 200 ms.
    - Fix: a layout version counter, plus cached `blob:` URLs. (S)
19. **Bundle:** 2,529 KB minified / 768 KB gzip. Phaser is about 1,378 KB, and a custom build without physics would save an estimated 400–550 KB.
    - **v2 art still ships:** 31% of the app source. About 389 KB of source can go now; only 3 icons and the 2 pets are still used.
    - **Raid code** could become a lazy chunk. (M–L)

## P3: accessibility, code health, tooling

20. **Reduced motion is ignored by Phaser:** camera shake, flashes and bobbing all still play. (S)
21. **Accessibility:**
    - tap targets under 44 pt (gear 32, close 30, tiny buttons 30, cash badges 36);
    - 20 text rules at 11 px or less;
    - badge contrast 3.2:1;
    - no `role="dialog"` or `aria-live`;
    - fixed-px fonts;
    - fonts not bundled. (S–M)
22. **Code health:**
    - v2 dead code;
    - duplication between JointScene and RaidScene;
    - two CSS layers (55 selectors redefined);
    - large files;
    - the unchecked cast in `migrate`;
    - `as never` on `setFace`. (M)
23. **Test gaps:**
    - the Controller (save timing, raid save, catch-up on visibility);
    - corrupt saves;
    - `catchUp` itself;
    - wall operations;
    - rival helpers;
    - `updateProgress`/`refreshDaily`/`goalComplete`/`payoutReady`;
    - purple-star ageing. (M)
24. **Tooling:**
    - no CI;
    - no ESLint;
    - Prettier isn't installed;
    - `legacy-peer-deps`;
    - tsc isn't incremental;
    - the smoke test takes 15–20 min (fixed waits, 3× screenshots, two reboots).
    - Fixes: `waitForFunction`, dpr 1 for logic steps, parallel pages. (S–M)
25. **Small items:**
    - the music scheduler wakes every 25 ms;
    - time away during a raid isn't caught up;
    - a resize re-centres the camera and throws away the player's pan;
    - `measureCrops` could run at build time. (S each)

## iOS / Capacitor plan

- **`capacitor.config.ts`:**
  - use the split build in `dist`, not the single-file build;
  - `contentInset: 'never'`, `scrollEnabled: false`, `allowsLinkPreview: false`;
  - no `server.url` in the release build (App Store guideline 2.5.2). The bundle has no `eval` or remote code.
- **Plugins:**
  - `@capacitor/app` (pause/resume → save and catch up);
  - `preferences` (save);
  - `haptics`;
  - `splash-screen` (hide on `joint-ready`);
  - `status-bar` (hidden);
  - `local-notifications`.
- **Info.plist:**
  - landscape left and right only;
  - `UIRequiresFullScreen`;
  - status bar hidden;
  - `ITSAppUsesNonExemptEncryption = NO`.
- **Native:** a `CAPBridgeViewController` subclass that auto-hides the home indicator and defers edge gestures.
- **Privacy:** a `PrivacyInfo.xcprivacy` with no tracking, no data collected, and UserDefaults reason CA92.1. A privacy-policy URL is still required.
- **Age rating:** cartoon/fantasy violence (eaten customers, bone piles) plus mild horror, so 12+ as planned. 9+ may be possible.
- **Also:** a CSP meta allowing `self`, `data:` and `blob:`, and a test for WebGL context loss.

## Suggested order

1. P0 1–4 and item 5.
2. Items 6–8: cheap boot and memory wins.
3. Texture eviction (3), atlasing (16) and ground baking (15).
4. Removing v2 art and the Phaser custom build (19).
5. Capacitor packaging (11–14).
