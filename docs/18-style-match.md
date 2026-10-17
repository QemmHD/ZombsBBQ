# 18 — Style match: measured look of the original vs ours

What this is: numbers measured from **correctly decoded** textures of the original (iOS build), set against a fresh gallery render of Zombs BBQ, plus a ranked list of generator changes. The goal is to match the *look* (palette, line, shading, proportions, UI materials) with our own drawings. Nothing here is traced; no original image is in this repo.

Related: [03 — Art bible](03-art-and-animation.md), [08 — Deep dive](08-original-deep-dive.md) §1, [09 — Art v3 contract](09-art-v3-contract.md), [10 — Rig](10-original-animation-and-layouts.md) §1, [12 — Visual audit](12-visual-audit.md).

## 0. Source and pixel format (why earlier references looked wrong)

- The old PNGs in `C:\Downloads\zombiecafe-assets\sprites\atlases\` are channel-scrambled (cyan, magenta, green tints, alpha bleed). **Don't use them.**
- `.cct` layout (iOS build, 1 536 files). The 28-byte little-endian header is `"CCTX"`, `fmt`, `width`, `height`, `0`, `0`, `zlib_size`, followed by one zlib stream.
  - `fmt 2` (1 516 files: characters, furniture, floors, most UI) is **RGBA4444**. Each pixel is one little-endian `u16`: R = bits 15–12, G = 11–8, B = 7–4, A = 3–0. Alpha is straight, not premultiplied. In byte order that is `[B|A] [R|G]`, so a decoder that reads the bytes as R,G,B,A nibbles in file order scrambles every channel. That is the bug in the old PNGs.
  - `fmt 1` (20 large UI atlases) is **RGBA8888**: bytes R, G, B, A, straight alpha.
- The `.bin` sidecar is big-endian: `u8 type`, then `u16 count`, then one entry per sprite. Each entry is `u16 len` + the sprite name (type 2 only), `i16 x, y, w, h`, then `i16 xoff, yoff, xoffFlip, yoffFlip` (type 2 only).
- Correct-colour references live **outside the repo**:
  - `C:\Downloads\zombiecafe-reference\`, with folders `characters/` (sliced parts), `furniture/`, `world/` and `ui/`;
  - side-by-side sheets in `_compare/`;
  - the decoder and sampler in `_tools/`.
- Atlases are at the game's native logical px. A character head is ~95 px wide, a standing character ~190 px tall and a floor tile 164×104 px.

All hex values below were sampled from those PNGs. RGBA4444 means every channel is a multiple of 17 (`#…11`, `#…22`, …), so the values are exact.

## 1. The original's measured palette

### 1.1 Characters

| Material | Base | Shadow | Highlight / other | Notes |
|---|---|---|---|---|
| Human skin, **peach** (most bodies and heads) | `#FFDDAA` | `#BBAA77` | `#FFEEBB` | Senior, woman, accountant, cashier. The warmest, lightest skin. |
| Human skin, **khaki** (the generic "man" body) | `#AAAA88` | `#888866` | `#BBAA88` | Only this one skin is the khaki-grey that docs 08/09 generalised to everyone. |
| Human skin, **tan** | `#CCBB88` | `#BB9966` | `#DDBB88` | Hipster. |
| Zombie skin A (blue-green) | `#55AA66` | `#337733` | `#66AA66` | The "man" zombie. Cooler than our lime. |
| Zombie skin B (sage) | `#88AA66` | `#556644` / `#555544` | `#88AA77` | Accountant, woman, cashier. Desaturated, almost grey-green. |
| Zombie skin C (yellow-green) | `#99CC55` | `#668822` | `#AACC55` | Senior. |
| Zombie skin D | `#77AA55` | `#557733` | `#77BB55` | Hipster. |
| Zombie eye | `#CCCC44` | darker rim | — | Solid yellow disc with a darker yellow ring, no pupil. Big, about the size of a human sclera. |
| Human sclera | `#FFFFFF` | — | — | Pure white, large ovals, with tiny pure-black pupils. |
| Outline and ink | `#000000` | `#443322` (shading lines inside brown hair) | `#334444` (glasses) | True black: 11–12 % of every head's pixels. |
| Hair (brown) | `#665533` | `#443322` | — | Chunky dark clumps on top of the base, not fine strands. |
| Hair (ginger) | `#BB7733` | `#774411` | — | |
| Hair (blonde) | `#DDCC77` | `#AA9933` | `#EEDD77` | |
| Clothes | `#444433` (olive-black jacket), `#112244` (navy trousers), `#2222BB` (royal-blue suit), `#CCAACC` / `#886688` (lilac top), `#336688` / `#113344` (teal jeans), `#EEEEEE` / `#CCCCCC` (chef whites) | | | Clothes are **more saturated than ours**: real blues, lilac and red do appear. |

Mean saturation of a whole character sheet is 0.2–0.5 and mean value 0.25–0.6. Value is pulled down by the black ink and dark trousers.

### 1.2 World

| Surface | Colours | Notes |
|---|---|---|
| Floor tile (starter / dirty) | `#CCCCCC` 64–75 %, grout and chips `#888888` / `#666666`, light `#DDDDDD` | Neutral grey, no warmth. Our `PAL.tile #CFCFCB` already matches. |
| Floor stains | olive `#445544` / `#556644`, maroon, grease | Separate overlay tiles. |
| Grass | `#557722` 74 %, `#445511`, `#446611`, `#668822` | Almost flat colour with small dark tufts. |
| Road | `#888888` / `#999999`; stripe `#EECC22` | Pure neutral grey. |
| Sidewalk | `#CCCCCC`, `#BBBBBB`, cracks `#777777` / `#666666` | |
| Walls | **greyscale source**: generic `#FFFFFF` with ink `#333333`; brick `#CCCCCC` / `#888888` / `#666666`; wood `#FFFFFF` / `#EEEEEE` / `#DDDDDD` | Tinted at runtime by the six stock colours (doc 08 §1.2). Plain tables and chairs are greyscale too (saturation 0.00). |
| Furniture with a fixed colour | diner chair `#DD3322` / `#771111`; diner table top `#CC1111`; counter and sink top `#6688AA` / `#7799AA`; white fridge and stove `#FFFFFF` / `#EEEEEE` / `#DDDDDD`; boarded window `#775533` / `#665533` | Accents are **clean and saturated** (red diner furniture has saturation 0.5–0.9). Grime is a soft, airbrushed overlay on top of a clean base colour. |

### 1.3 UI

| Element | Colours |
|---|---|
| Awning stripes | `#691122` and `#7A414C` (with `#6A1223` / `#7B424D` variation), olive stain blobs, scalloped hem |
| Olive sticker button | base `#486D0D`, top band `#6D8A3D`, rim highlight `#8BB647`, white caps text, black outline |
| Red sticker button | base `#DF1E00`, band `#E54B33`, shadow `#5E1308`. A **bright, saturated** red, not maroon. |
| PLAY / burgundy button | `#6A1223` with a `#863F4C` band |
| Chalkboard | slate `#1D1D1D` – `#222222` with faint scratches, wood frame `#563F27` |
| Legal pad and yellow paper | `#FFEC80` (very bright), red pushpins, blue rules |
| White and torn paper | `#ECEBE9` – `#F4F4F4` |
| Recipe-book page | `#FBF7F0`, ring binding |
| Store backdrop | black chalk `#111111` / `#222222` with cream `#FFEEDD` / `#EEDDBB` torn paper |
| Bookshelf wood | `#65472C`, `#46311E`, `#3C2918` |
| Menu backdrop | spot-lit bricks `#846C56` (value 0.65) |
| Thought bubble | white `#FFFFFF` with a **blue** outline `#7799CD` |
| Mood faces | happy `#FEDE58`, annoyed `#48C2F9`, both with black ink |

Original UI materials are **clean and bright**: paper is near-white or bright legal-yellow. Ours are greyed down (`#DAD6C8`, `#E3D58A`).

## 2. Line, shading, proportions, faces

**Outline weight.** Measured as the run of ink pixels from the transparent edge inward, at native size.

| Thing | Original | Ours now |
|---|---|---|
| Character silhouette | median **2 px**, p75 3–5 px, on a 190 px character: **1.05 % of height (median), up to ~2 % on shadow sides** | ~5 px on a 521 px screenshot character: ~1.0 %, almost uniform (`paint.ts` `LW` 1.25 on `CHAR_H` 100) |
| Character interior lines (face, folds) | ~1 px (~0.5 %), tapered | `LI` 0.7 / `LF` 0.5, uniform |
| Furniture silhouette | median **3–4 px**, p75 5–6 px, on a 164 px tile: **~2–2.4 % of tile width** | `kit.ts` `LW` 1.25 on a 96-unit tile: **1.3 %** |
| Ink colour | `#000000` | `#16120C` (fine; reads the same) |

The original ink is a **brush line**. It is thicker on the bottom and right (shadow) side of each shape and under the chin and jaw, and thins to ~1 px at the top and left. Our strokes are uniform-width SVG strokes.

**Shading.**
- Characters use flat cel shading: one base plus one hard-edged shadow shape, and sometimes a small highlight. The shadow is a band on the right and lower side (light from the upper left), about 25–35 % darker and slightly warmer or greyer than the base. There are **no gradients** on characters.
- Hair is drawn as a few big dark clumps over the base.
- Furniture is cleaner and more painterly: white or saturated bases, soft airbrushed grime, metal with a gradient sheen.
- Ours adds a soft volume gradient on every part (`paint.ts` `vgrad` / `xgrad`, the `k` option in `shade`). That plus the lit-shape offset gives a smooth "vector" look the original doesn't have.

**Proportions (native px, standing).**
- The head is 91–105 px wide and 82–114 px tall on a ~190 px character, so it is **50 %** of the height.
- The front torso is 42–47 px wide × 59–63 px tall, so the **head is about 2.1× the torso width**.
- The forearm is ~16–23 px wide (about 20 % of head width).
- Shins and shoes are 22–24 px wide.
- Legs are short: knees at ~9 % of the height.
- Ours is close on head share (~49 %). Our torso plus sleeves reads wider: the head is only about 1.5× the torso with arms in the screenshot. `rig.ts` `STD.wBot` 12.4 and `armW` 10 widen the bullet torso.

**Eyes and mouth.**
- Humans have **large pure-white sclera ovals** with tiny black pupils, a heavy black upper-lid line cutting the eye about halfway (a bored or sardonic look) and bags drawn as one thin line.
- The mouth is a single thin smirk line, or a small open shape with a few blocky teeth.
- Zombie eyes are big solid yellow discs with a ring and no pupil; often one eye is half-lidded. Zombie mouths hang open, with buck teeth and drool.
- Our faces have the right attitude, but our sclera is off-white `#E2DECB` and smaller. With the gradient skin, the eyes don't pop.

**UI panel style.** Every panel is a *real material*: chalkboard in a wood frame, legal pad pinned to the chalkboard, torn white paper, a ring-bound recipe book, a fridge interior. Buttons are slanted olive or red stickers with white caps and a black outline. Icons are fully inked, like the characters.

## 3. Ranked changes to our generators (stay original, no tracing)

1. **Zombie greens: cooler and more varied.**
   - In `game/src/art3/chars/paint.ts` `ZSKINS`, replace the lime `#88BB44` entry and shift the others to:
     - `{b:'#55AA66', s:'#337733'}`
     - `{b:'#88AA66', s:'#556644'}`
     - `{b:'#99CC55', s:'#668822'}`
     - `{b:'#77AA55', s:'#557733'}`
   - Deep shadow `#254424` stays.
   - Also align `ui/theme3.css` `--zgreen` to `#88AA66` and `--zgreen-deep` to `#556644`.
2. **Human skins: peach as the default, khaki as one option.**
   - In `paint.ts`, add `SKIN_PEACH = {b:'#FFDDAA', s:'#BBAA77', d:'#7A6A44'}` (highlight `#FFEEBB`) and use it for about half of `cast.ts` / `raidcast.ts`.
   - Keep `SKIN` `#B3B294` (≈ the original's `#AAAA88`) as the khaki variant.
   - Move `SKIN_TAN` to `{b:'#CCBB88', s:'#BB9966'}`.
   - Docs 08 §1.3 and 09 §1 overgeneralised khaki to all humans.
3. **Drop gradients on characters (hard cel only).**
   - In `paint.ts` `shade()`, default `k` to 0 for character parts and stop passing `across` (`xgrad`) from `body.ts`.
   - Keep the lit-shape offset that makes the shadow crescent, but enlarge it to about `[-2.2, -2]` so the shadow band is a clear shape.
   - Keep `fadeV` only for grime.
4. **Brush-weight outlines.**
   - Raise character silhouette `LW` (paint.ts) from 1.25 to about 1.5.
   - Add a "weighted" second stroke on the shadow side: the same path, offset `+0.5,+0.5`, clipped outside the shape, width ~1. Or draw the silhouette as a filled ink shape slightly larger toward the bottom-right.
   - Thin interior lines: `LI` 0.7 → 0.55.
   - Net result: ~1.3 % median, ~2 % on shadow sides, as measured.
5. **Thicker prop outlines.** In `game/src/art3/kit.ts`, set `LW` 1.25 → **1.8** and `LW_THIN` 0.8 → 1.0. This touches every furniture, kitchen, decor and outdoor drawing, and gives the original's ~2 % of tile width.
6. **Eyes that pop.**
   - In `paint.ts`, change `SCLERA` `#E2DECB` → `#FAF8F0`.
   - In `chars/head.ts` (the sclera fill near line 217), enlarge human eye ovals ~15 % and keep pupils tiny and pure ink.
   - Make the upper-lid line the heaviest interior line (~1.0).
   - Zombie eye: `ZEYE` `#DECC54` → `#CCCC44`, with a `ZEYE_D` ring `#999922`, and keep it pupil-less.
7. **Hair as clumps.** In `chars/hair.ts`, replace the fine strand hatching (`STRANDS_F` / `STRANDS_B`) with 3–5 large dark clump shapes in the hair's shadow tone. For brown hair use `#665533` with `#443322`. Add jagged tips at the silhouette. This also fixes doc 12 #18 (helmet-like back heads).
8. **Slimmer torso, thinner arms.** In `chars/rig.ts` `STD`, set `wTop` 9.4 → 8.6, `wBot` 12.4 → 11.2 and `armW` 10 → 8.8, so the head reads ~2× the torso. `slim` and `stocky` scale down by the same ratio.
9. **Brighter, cleaner UI materials.**
   - In `game/src/art3/ui3.ts` `U`:
     - `paper` `#DAD6C8` → `#F0EFEC` (`paperD` `#D2D0CA`);
     - `legal` `#E3D58A` → `#FFEC80` (`legalD` `#E6CF5E`);
     - chalk slate → `#1E1E1E` with a `#563F27` frame;
     - `button('btn_red', …)` → base `#DF1E00`, band `#E54B33`, shadow `#5E1308`;
     - `btn_olive` → base `#486D0D`, band `#6D8A3D`, rim `#8BB647`.
   - In `ui/theme3.css`, set `--paper` → `#FFEC80`, `--cream` → `#F0EBDD` and `--red` → `#DF1E00`, and add `--chalk-slate: #1E1E1E` and `--frame-wood: #563F27`.
   - Awning `--maroon` `#6d1727` → `#691122`, and `--maroon-light` → `#7A414C`.
10. **Furniture: clean bases, saturated accents, airbrushed grime.** In `game/src/art3/furniture.ts`, `kitchen.ts` and `decor.ts`:
    - push white enamel to `#FFFFFF` / `#EEEEEE` / `#DDDDDD`;
    - diner reds to `#DD3322` / `#CC1111` (shadow `#771111`);
    - counter and sink tops to blue `#6688AA`;
    - replace some `speckle` scatter with 2–3 large low-opacity soft grime blobs (`blob` at 0.15–0.25) so the dirt reads painted, not noisy.
11. **Walls: author neutral, tint at runtime.** In `game/src/art3/room.ts`, draw wall art in greys (`#FFFFFF` / `#EEEEEE` with `#333333` detail) and multiply by the six stock tints (cream-yellow ≈ our `PAL.plaster #E9DE86`). Wallpaper variants then come for free, as in the original.
12. **Grass flatter.** In `game/src/art3/ground.ts`, set `PAL.grass` (kit.ts) to base `#557722` covering ~75 %, with tufts `#445511` / `#668822`. Fewer blotches (also doc 12 #9).
13. **FX colours.** In `game/src/art3/fx.ts`:
    - `bubble_think`: white fill with a blue `#7799CD` outline;
    - `face_happy`: yellow `#FEDE58`;
    - `face_angry`: cyan-blue `#48C2F9`.
    These are original-faithful and read instantly at a small size.
14. **Clothes allowed more chroma.** In `paint.ts` `C`, add a few saturated options and use them for one accent garment per character: `royal: tone('#2222BB')`, `lilac: tone('#CCAACC','#886688')`, `teal: tone('#336688','#113344')` and `navy: tone('#112244')`.

Items 1–6 give most of the visible gain. They are palette and line constants plus one `shade()` default.

## 4. Would pre-rendering in Blender help?

**Not for the shipping art. Keep the SVG-from-TypeScript pipeline.**

Why:
- **The target is 2D hand-inked cut-out art.** The original is brush-inked, flat-cel bitmaps, puppeted as 27 parts per character (doc 10). Blender toon shading plus Freestyle or Line Art gives uniform, geometric lines, 3D-correct (not stylised) shadows and a "rendered" look. That moves us *away* from the reference. Grease Pencil could do 2D, but then it is hand drawing again, outside our code pipeline.
- **The rig contract is 2D.** Our puppet (`rig.ts`, rig v2) rotates flat parts at pivots exactly like the original. 3D pre-renders would need per-angle frames (SW and NW, every pose) or a 3D runtime, which costs far more memory and download.
- **The code pipeline wins on iteration and size.** Palette swaps, tints (walls, tables), zombie variants, deterministic seeds and resolution independence (Retina, `TEX_S × DPR`) are one constant change away. A Blender bake is an external, binary, non-diffable step that needs Blender in CI or committed PNGs.
- **The gap to the original is style constants, not technique.** Hue, line weight, cel hardness, eye size and torso width (§3) are all cheap to fix in SVG.

**Where Blender *can* help (reference only, never shipped):**
- Block out complex iso props (car wreck, jukebox, stove-super, sign pole) with an orthographic camera matching our 1.6 : 1 tile, to check perspective and footprint height (the z-values in doc 09 §2).
- Then draw them in SVG.

The same goes for a quick 3D layout of rival cafés, to check camera framing.

## 5. What changed (2026-10-17, branch `feat/anim`)

§3 items 1–10 and 12–14 are in, one commit per step (item 11, runtime wall tinting, is not: it is a `room.ts` rewrite, not a constant). Screenshots live in `game/test-results-style/` (git-ignored); `before/` is the state before this pass, `stepN/` after step N. Pose sheets come from `tools/poses.html?c=<id>&k=2&rows=idle,walk,sit`, the joint and raid shots from `tests/gallery.mjs`.

| Step | Item | Files | Before → after |
|---|---|---|---|
| 1 | 1–4: cooler greens, peach skins, hard cel, brush-weight ink | `chars/paint.ts`, `cast.ts`, `raidcast.ts`, `theme3.css` | `before/poses-joe.png` → `step1/poses-joe.png`; `before/poses-jane.png` → `step1/poses-jane.png` |
| 2 | 5: prop outlines 1.8 / 1.0 | `kit.ts` | `before/joint-zoom.png` → `step2/joint-zoom.png` |
| 3 | 6: big white eyes, pin pupils, heavy lid, zombie eye ring | `chars/head.ts` | `step1/poses-senior.png` → `step3/poses-senior.png` |
| 4 | 7: hair clumps, jagged crowns, measured hair tones | `chars/head.ts` (`strandClumps`), `hair.ts`, `cast.ts` | `step3/poses-joe.png` → `step4/poses-joe.png` (back view), `step4/poses-jane.png` |
| 5 | 8: torso 8.6 / 11.2, arms 8.8 | `chars/rig.ts` | `step4/poses-joe.png` → `step5/poses-joe.png`, `step5/poses-construction.png` |
| 6 | 9: bright paper / legal pad / slate + wood / olive and red stickers / awning | `ui3.ts`, `theme3.css` | `step2/joint.png` → `step6/joint.png`; cards in `step6-smoke/02-dish-picker.png`, `06-infect-card.png` |
| 7 | 10, 12, 13, 14: white enamel, diner reds, blue tops, soft grime blobs, flat grass, FX colours, saturated clothes accents | `p1kit.ts`, `kitchen.ts`, `furniture.ts`, `decor.ts`, `ground.ts`, `kit.ts`, `fx.ts`, `chars/paint.ts`, `cast.ts` | `step6/joint.png` → `step7/joint.png`, `step7/joint-zoom.png`, `step7/poses-jane.png` |

How the measured numbers were met:
- **Ink.** `shade()` now paints a second, wider stroke (`LW_SHADOW` 2.0) offset `+0.55,+0.55` *under* the fill, so only its bottom-right half shows past the silhouette: ~1.5 % of a character's height on the lit side, ~2.3 % on the shadow side (measured 1.05 % median, up to ~2 %). `vgrad` / `xgrad` and the `k` / `across` options are gone; every character part is one flat shadow tone plus the base shape shifted `[-2.2, -2]`.
- **Hair.** `strandClumps()` turns each authored strand curve into a tapered wedge 5.2 units wide at the root, filled in the hair's shadow tone, so the fifty-odd hand-placed strand paths across the styles became clumps without redrawing any style.
- **Skins.** 16 of 33 joint humans and 14 of 30 raid humans are `SKIN_PEACH`; khaki stays for joe, critic, benchwarmer, biker and the raid defaults.
- **Clothes.** `C.denim`, `C.navy` and `C.teal` were re-toned (16 + 8 + 2 uses), so most characters pick up one saturated garment through their jeans or trousers; `C.royal` and `C.lilac` are new (accountant's tie, jane's top).

Still off against the reference after this pass: the original's interior face lines taper (ours are uniform), its furniture grime is airbrushed (ours is flat low-opacity blobs), and the walls are still authored in cream rather than tinted at runtime (item 11).
