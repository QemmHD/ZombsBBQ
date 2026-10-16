# 03 — Art & Animation Bible

Goal: **keep the exact feel of Zombie Café** (chunky isometric rooms, thick outlines, big-headed chibi characters, a maroon awning HUD) but make it **crisp, smooth and modern**. That means Retina-sharp art, 60 fps skeletal animation, lighting and "juice".

Concept art lives in [`../art/concepts/`](../art/concepts/):

| File | What it shows |
|---|---|
| `logo.svg` | Zombs BBQ wordmark |
| `app-icon.svg` | iOS app icon |
| `characters-zombies.svg` | The starter zombie crew lineup |
| `characters-customers.svg` | Human customers → their zombie forms |
| `mockup-joint.svg` | Main gameplay screen with HUD (iPhone landscape) |
| `mockup-raid.svg` | Raid screen |
| `palette.svg` | Color palette & style rules |

> The mockups are early concepts. The final HUD button set (Goals, Pets, Zombiepedia, Deliveries…) is in [06 — Menus](06-menus-unlocks-customers.md#1-main-joint-screen-landscape), and the raid screen's END RAID button becomes the original-style **white truce flag** in the top-left.

---

## 1. Visual rules

| Rule | Spec |
|---|---|
| **Outlines** | Dark brown-black `#2B1B17`, never pure black. 4–6 px on characters at 1× (scaled with the camera), 3 px on props. Round joins. |
| **Shading** | Flat cel: 1 base + 1 shadow tone (shadow falls bottom-right) + 1 small highlight. No gradients on characters. Soft gradients are OK on UI and lighting only. |
| **Proportions** | About 2 heads tall. Head ≈ 50% of height and about 2× the torso's width (measured from the original; see [10](10-original-animation-and-layouts.md) §1). Hands are simple mitts, no fingers except for gestures. |
| **Silhouette test** | Every character must be recognizable as a solid black silhouette (hat, hair, prop). |
| **Zombie read** | Green skin `#8DC63F`, yellow eyes `#FFE14D` with tiny pupils, one droopy lid, stitches/patches, a drool drop. Clothes stay in the human's original colors but torn. |
| **Gore policy** | Goo, not gore. Green slime, bandages and missing teeth are fine. No blood, no exposed organs. (This keeps the 12+ rating.) |
| **Isometric** | 2:1 dimetric. Tile = 128×64 px at 1×. All furniture is authored on this grid with the pivot at the footprint center. |
| **Camera** | Default zoom shows ~10×10 tiles on iPhone landscape; pinch 0.6×–1.8×. |
| **Lighting** | A day/night cycle tint (real clock), plus additive light sprites for string lights, neon, grill fire. The night joint glows. This is the "modern" upgrade the original lacked. |

## 2. Palette (see `palette.svg`)

| Group | Base | Shadow | Highlight |
|---|---|---|---|
| Zombie skin | `#8DC63F` | `#5E9A2A` | `#B8E26B` |
| Brain Sauce | `#39E07A` | `#0F8F4A` | — |
| Awning / UI red | `#B3263A` | `#8E1B2E` | `#5C0F1D` (deep) |
| Fire / BBQ | `#FF8A1F` | `#D9461B` | `#FFC23D` |
| Wood | `#A8693A` | `#7A4524` | `#C98B55` |
| UI cream | `#FFF4DC` | — | — |
| Gold (stars, coins) | `#FFC83D` | `#D9971A` | `#FFF0A8` |
| Outline | `#2B1B17` | | |

## 3. UI style

- **Top awning bar** (homage to the original): scalloped maroon cloth, with name + stars on the left, level badge, XP bar, cash, Brain Sauce, settings.
- **Side buttons:** rounded squares (corner radius 22%) with an icon, a thick outline, a glossy top highlight and a 4 px drop shadow. They press down 4 px with squash on tap.
- **Fonts:** a chunky rounded display font for numbers/titles (e.g. *Lilita One* or *Luckiest Guy*, both free under the OFL), with a clean rounded body font (*Nunito*). Numbers get a dark stroke outline.
- **Popups:** cream paper cards with a torn edge, slapped in with an overshoot scale (0.8 → 1.08 → 1.0, 220 ms).
- **iPhone safe areas:** all buttons at least 44×44 pt, kept out of the Dynamic Island side and the home-indicator strip. Test on iPhone SE (small) and Pro Max (big).

## 4. Animation (the "same feel, but smooth" plan)

The original used Flash-style **cutout puppet animation** (separate body parts moved around). We keep that look but build it with **skeletal 2D animation** (Spine), which gives:
- 60 fps smooth motion with tiny memory use
- One rig shared by every humanoid, so new characters only need new "skins" (body-part art)
- Easy mixing: walk + carry plate + drool all at once

### 4.1 Shared humanoid rig
Bones: root, hip, torso, head, jaw, eyeL/eyeR (lid slots), armL/R (upper, lower, mitt), legL/R (thigh, shin, foot), prop slot (hand), hat slot, back slot. Two facing directions (front-3/4 and back-3/4), mirrored for the other two isometric directions.

### 4.2 Animation list per character
| Anim | Frames-feel | Notes |
|---|---|---|
| idle | 2 s loop | Breathing squash 3%, blink. Zombies sway and head-tilt. |
| walk | 0.8 s loop | Humans bounce; zombies **shamble**: one dragging foot, arms forward. |
| walk_carry | 0.8 s loop | Plate held up; the plate wobbles with secondary motion. |
| sit / eat | loop | Chomp with jaw bone, crumbs particle. |
| happy / pay | 0.6 s | Hop + coin burst. |
| angry / leave | 0.8 s | Steam from head, stomp out. |
| infect (customer) | 1.6 s | Shiver → skin tint lerp to green → eyes pop → little "thriller" dance. |
| tired | loop | Low Energy: drool drip, slouch, red Energy bar flashing. |
| daydream | loop | Stares into space, thought bubble (brain/steak), sways. |
| rest | loop | Flops face-down on a table or sprawls on the lawn, "Zzz" bubbles. |
| attack (zombie) | 1.0 s | Anticipation crouch → leap with stretch → customer flees with a cartoon dust cloud. |
| attack / hit / KO (raids) | short | KO = dizzy stars, then they sink into the ground and get picked up later. |
| cheer | 1.0 s | Victory pose for raid win screen. |

### 4.3 Juice checklist (what makes it *not boring*)
- **Squash & stretch** on every tap, placement, dish pop and coin.
- **Particles:** smoke puffs from smokers, sizzle sparks, coin arcs flying to the HUD counter (counter ticks up and bounces), green goo splats, XP stars.
- **Number popups:** "+$24", "+12 XP", "PERFECT!", "COMBO ×3", using overshoot and fade.
- **Screen shake** (small) on raid hits and big payouts; off in reduced-motion mode.
- **Secondary motion:** awning cloth sways, string lights swing, plants bob when a zombie walks by.
- **Ambient life:** birds and crows on the roof, a tumbleweed, cars rolling on the road, zombies groaning on the sidewalk waiting to be hired.
- **Easing everywhere:** nothing moves linearly except conveyor-type loops.

## 5. Asset production pipeline

1. **Concept** (vector, Affinity Designer / Illustrator / Procreate): silhouette sheet → color pass → turnaround (front-3/4 + back-3/4).
2. **Cut into parts** (PSD/layers named by bone), export at **3× resolution** for iPhone Retina.
3. **Rig & animate in Spine** using the shared rig and skins; export `.skel` + atlas.
4. **Props/furniture:** draw on the 128×64 iso grid template; export each rotation as a sprite; pack into atlases (max 2048² per atlas for older devices).
5. **Naming:** `char_zombie_nurse_front.png`, `deco_tiki_table_1x2_r0.png`, `ui_btn_shop.png`.
6. **Budget:** keep the initial download under 200 MB; ship themes and events as **on-demand downloadable bundles**.

### Option: AI-assisted concepting
AI image tools are fine for **mood boards and exploration only**. All final assets should be drawn or vectorized by an artist so the line weight and palette stay consistent, rigs are clean, and you fully own the art.

## 6. Characters to draw for the vertical slice

| Humans (with zombie form) | Zombies (starter crew) | Defenders |
|---|---|---|
| Lumberjack, Construction Worker, Nurse, Cop, Grandma, Food Critic | Gus (pitmaster), Nurse Nell, Officer Rot, Hardhat Hal, Influencer Iris, Big Brisket | Human chef with spatula, guard dog |
