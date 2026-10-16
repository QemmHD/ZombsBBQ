# 10 — The Original's Animation Rig and Rival Café Layouts (decoded)

What this is: hard numbers on how Zombie Café (2011) animated its characters and built its rival ("enemy") cafés, so Zombs BBQ can move and look the same way. Everything here was decoded by us from the fan revival's checkout (`/home/user/airyzz/zombie-cafe-revival`). That checkout has no licence, so **nothing from it is copied into this repo**: no code, images or data files. This doc only states facts in our own words and numbers. Rival and character names are listed **for reference only**; we will not use them.

Related docs: [01 — Research](01-research.md), [03 — Art & Animation](03-art-and-animation.md), [08 — Deep Dive](08-original-deep-dive.md), [09 — Art v3 contract](09-art-v3-contract.md).

**How it was decoded.** The revival's Go tools can read only the animation *index*, not the per-animation files. So we reverse-engineered the per-animation format from the game's own loader and renderer in `libZombieCafeAndroid.so`, using its exported symbols: `CCToon::Load`, `CCToon::UpdateAnimation`, `ToonAnimation::draw` and `CImage::draw`. A throwaway Go decoder then read all 60 files with zero leftover bytes. We also rendered every animation back through the decoded rig to check the result by eye. For `constants.bin.mid` (562 tuning values) we ran the game's own `Constants::load` in an ARM emulator (unicorn) with a fake input stream, and recorded which named global each value landed in. The raid file formats come from `EnemyLayouts::load`, `EnemyItems::load` and `GameStateRaid::chooseFurniture` / `init`.

Raw dumps (scratchpad only, not in the repo):
- per-animation JSON: `/tmp/claude-0/-home-user-ZombsBBQ/d76bd4d3-6b27-51fb-957e-0cadf5ff5195/scratchpad/anim/json/*.json`
- per-animation stats: `/tmp/claude-0/-home-user-ZombsBBQ/d76bd4d3-6b27-51fb-957e-0cadf5ff5195/scratchpad/anim/analysis.json`
- contact-sheet renders: `/tmp/claude-0/-home-user-ZombsBBQ/d76bd4d3-6b27-51fb-957e-0cadf5ff5195/scratchpad/anim/render/`
- decoded constants: `/tmp/claude-0/-home-user-ZombsBBQ/d76bd4d3-6b27-51fb-957e-0cadf5ff5195/scratchpad/consts/constants.txt`
- raid layouts, items and cafés: `/tmp/claude-0/-home-user-ZombsBBQ/d76bd4d3-6b27-51fb-957e-0cadf5ff5195/scratchpad/raid/`

Units used below:
- **su** = skeleton units, the space the keyframes are authored in.
- **px** = the game's logical pixels at zoom 1.
- The engine draws characters at `Character_GLOBAL_SCALE = 0.365`, so **1 su = 0.365 px**.
- An iso floor tile is 164×104 px; with the −4 px overlap it repeats every 160×100 px.
- Frames are at 24 fps unless stated otherwise.
- Rotation is in screen space (y down), so **positive degrees = clockwise**.

---

## 1. Character animation

### 1.1 How the engine plays an animation

| Fact | Value |
|---|---|
| Technique | Flash-style cut-out puppet ("CCToon"). Every body part is a separate bitmap with a full **2×3 affine matrix per frame** (a, b, c, d, tx, ty), relative to its parent. |
| Keys | **Baked, one key per frame. There is no tweening at runtime.** If a part has fewer keys than the clip has frames, its last key is held. A part with 1 key is static. |
| Frame rate | Every file says **24 fps**. The engine computes ms/frame = 1000 / 24 / speedMultiplier. |
| Speed scaling | For walk (type 0), walk2 (19), run (9), carry (4) and attack (3), the clip plays at the character's **speed multiplier** (2.2–4.0, see §3.1). That gives an effective 53–96 fps, so a 39-frame walk cycle takes 0.41–0.74 s. A "hurry" move (MoveTask flag) plays at **2× that** multiplier. All other clips play at 24 fps. |
| Loop rule | Clips loop forever by default. **Play-once** clips are serve, death, hit, idle3, idle4, idle5, startled, crouch and mouthwipe; these stop and hold their last frame. Gameplay code switches clips when a task ends. |
| Hierarchy | Each part has a parent index. World matrix = parent world × local. Part 0 is an invisible **root** at the feet (ground contact point). |
| Draw order | Each file holds one or more draw-order lists (a permutation of the parts). Extra lists carry a start time, but the times are stored ×1666.67 (for example 16666.7 means frame 10). The engine compares them against the raw frame number, so **in the shipped game only the first draw order is ever used**. |
| Hide / swap | A per-frame flag bit hides a part. A per-frame image index lets a part **swap its bitmap** mid-clip: death flips the legs to their back-view images as the body falls, and mouthwipe/feast use it to make the hand appear and disappear. |
| Sprite anchor | Each part's bitmap is drawn **centred on the part's origin** (only a sub-pixel trim correction is added). It is scaled ×(1/0.365) in skeleton space, then the whole puppet is scaled ×0.365, so bitmaps end up at native size. |
| Directions | Only **SW** (front 3/4, facing screen-left/down) and **NW** (back 3/4, facing screen-left/up) exist. SE and NE are the same clips **mirrored horizontally** (the engine flips the x scale). |
| Held items | carry and serve have an extra empty part parented to the forearm. The game swaps the dish bitmap into it with `replaceInAnimation`. |

### 1.2 The part set (27 bitmaps per character, same order for every character)

| Bitmap | What it is | Parent in standing clips |
|---|---|---|
| `torso1` / `back_torso1` | shirt torso, front / back | root |
| `head1` / `back_head1` | whole head incl. hair and ears | torso |
| `leftarm2`, `rightarm2` | **upper arm (sleeve)** | torso |
| `leftarm1`, `rightarm1` | **forearm + hand** | upper arm |
| `1x1_front` / `1x1` | **hips / shorts block** (despite the name, it has art) | torso |
| `leftleg2`, `rightleg2` | **thigh** | hips |
| `leftleg1`, `rightleg1` | **shin + shoe** | thigh |
| `pelvis1` | empty 1×1 placeholder, moves with the hips | torso |
| `0-spacer` | empty; the dish-attach point in carry/serve | forearm |
| `chairback_1/2` | used only in sitNW/eatNW, but **blank for every one of the 113 characters** | root |

"Left" here is the character's own left. In SW that is screen-right, the near side, and the left arm is drawn *over* the head and torso. In SW the order is far forearm, far leg, hips, far upper arm, near leg, torso, head, near forearm, near upper arm. In NW the head is drawn **last**, over everything.

Some clips change the tree:
- sit, eat, operate and run hang **every part straight off the root** (torso, head and arms are siblings), so the head can bob independently of the torso.
- feast, hit, crouch, startled, serve, rise, hungry1/2, idle3, mouthwipe and death hide the first torso (flag) and add a **second, visible torso parented to root**. The hidden torso is still the parent of head and arms, so the visible torso can lean (crouch −20°, death −112°) while the head and arms follow by baked offsets rather than by inheritance.

A character is built from two art sets: a body set plus an optional head-override set (the oldlady folder is head-only, used on several female bodies).

### 1.3 Proportions (standing idleSW, frame 0)

| Character | Total height (sole→crown) | Head (w×h) | Head share of height | Torso (w×h) | Head ÷ torso height |
|---|---|---|---|---|---|
| generic-human | 520 su = **190 px** | 259×259 su (95 px) | **50 %** | 124×172 su | 1.51 |
| generic-zombie | 520 su | 259×259 su | 50 % | 124×172 su | 1.51 |
| teen-zombie | 536 su | 270×281 su | 52 % | 124×168 su | 1.67 |
| officer-human | 530 su | 278×278 su (hat) | 52 % | 128×179 su | 1.55 |
| oldlady head on genericfemale body | 518 su | 267×263 su | 51 % | 117×161 su | 1.64 |
| boxer-human | 506 su | 248×241 su | 48 % | 124×172 su | 1.40 |
| sumo-human | 514 su | 270×252 su | 49 % | 128×172 su | 1.47 |

Landmarks for the standard body (root at the feet, y up as negative):

| Landmark | su above the feet | Share of feet→crown (496 su) |
|---|---|---|
| crown | 496 | 100 % |
| head centre | 366 | 74 % |
| chin / bottom of head | 236 | 48 % |
| shoulders (top of upper arms) | 236–252 | ~49 % |
| torso top / bottom | 276 / 105 | 56 % / 21 % |
| hip block centre | 114 | 23 % |
| knees | 40–48 | ~9 % |
| soles | −24 (just below the root) | — |

The chin overlaps the collar by ~40 su. The body is **2 heads tall**: the head is half the height and about twice as wide as the torso (259 vs 124 su). The feet stand ~55 su apart (11 % of height). The upper arms hang 9° (near) and −16° (far) off vertical at rest, and the far forearm is bent +40°, so the far hand points forward/outward. Character height is ~1.2 tile widths, or ~1.9 tile heights on screen.

### 1.4 Joint pivots (solved from the keyframes)

The rotation pivots are baked into the per-frame translations. We solved for each limb's fixed point (where its local transform keeps a point still across the clip). The pivot is given as a fraction of the bitmap's half-size from its centre (−1 = top/left edge, +1 = bottom/right edge):

| Part | Pivot (x, y) | Meaning |
|---|---|---|
| thigh | (≈0, −0.6 … −0.85) | hip joint, top-centre of the shorts leg |
| shin | (≈0, −0.5 … −0.8) | knee, near the top of the shin |
| upper arm | (−0.3 … +0.3, −0.6 … −0.9) | shoulder, top of the sleeve |
| forearm | (+0.2 … +0.5, −0.7 … −0.8) | elbow, top of the forearm |
| head | (≈0, +0.7 … +0.8) | **neck, at the bottom of the head bitmap**: head tilts swing the crown, not the chin |
| leaning torso (2nd copy) | (≈0, +0.7) | waist: the torso bends from the hips |

Fits are good (rms 0–5 su) for limbs that swing. Where a clip also moves the whole limb (the arm pick-up in idle3, death, serve), the fit is meaningless and is left out of the tables below.

### 1.5 Animation catalogue

Type ids are the game's own; the index has 30 types × {SW=1, NW=2}.

| id | Clip | Frames SW/NW | Duration @24 fps | Loops | Gist (front view) |
|---|---|---|---|---|---|
| 0 | walk | 39/39 | 1.625 s (speed-scaled) | yes | Two steps per cycle. Thighs swing ±24° in anti-phase, knee folds to −55° on the swinging leg, arms swing ±17° opposite the legs, body rises on the passing position |
| 1 | idle | 39/39 | 1.625 s | yes | **Only the head moves**: it sways down 9 su and toward the face side 7 su and back, one smooth cycle; the body is frozen |
| 2 | sit | 1/1 | still | — | Seated pose (see §1.7) |
| 3 | attack | 29/29 | 1.21 s (speed-scaled) | yes | Both arms flail forward 0→95°/68° and back, in step; the head jerks toward the target |
| 4 | carry | 39/39 | 1.625 s (speed-scaled) | yes | Walk legs; both arms locked forward-bent (upper arms 17°/7°, forearms 44°/55°) holding the dish slot; head bob reduced to 6 su |
| 5 | serve | 16/17 | 0.67 s | once | Lean forward 23° from the waist at f8 and back, arms push the dish out and down |
| 6 | death | 15/18 | 0.63 s | once | Falls flat on the back: visible torso rotates to −112° by f12, hips to −104°, legs flip to their back-view bitmaps, the body sinks ~285 su to floor level |
| 7 | eat | 58/58 | 2.42 s | yes | Seated. The near arm lifts 0→44° and hand-to-mouth (forearm 80→98°) in the first 34 frames, then holds still; the far arm and head chew/nod (head −11…+17°, rocks 34 su) |
| 8 | operate (cook) | 50/50 | 2.08 s | yes | Standing at the stove, both forearms stir/chop up to ~100° with a slight foreshortening (scale 0.89–0.91) |
| 9 | run | 16/15 | 0.67 s (speed-scaled) | yes | **Human panic run**: hands clamped to the head (upper arm 106–120°), thighs ±40°/−27…+53°, small bob 2–5 su |
| 10 | bump | 15/15 | 0.63 s | yes | Stumbles back: torso tips +20° at f5, arms fling up 60°/34°, legs splay |
| 11 | celebrate | 93/93 | 3.9 s | yes | Both arms go up overhead (near arm to ~190°, far arm to 113°) and pump for ~3 s, then drop |
| 12 | hit | 18/16 | 0.75 s | once | Head snaps back +44° at f6, torso +9°, recovers by f13 with a small overshoot (−11°) |
| 13 | attack2 | 29/29 | 1.21 s | yes | Big overhead claw: near arm windmills to 210°, far arm to 136°, peak at f15–16 |
| 14 | attackHuman | 29/29 | 1.21 s | yes | A human punching: near arm cocks back −42° (f7) then jabs to +98° (f14) |
| 15 | idle3 | 82/68 | 3.4 s | once | **Zombie gag**: the forearm falls off onto the floor, the zombie bends 42° to pick it up and screws it back on |
| 16 | idle4 | 39/39 | 1.63 s | once | Lifts the near arm to ~130° (scratch/wave) and back |
| 17 | idle5 | 39/39 | 1.63 s | once | Big near-arm circle to ~190° (scratches head), head tilts 6° |
| 18 | startled | 25/25 | 1.04 s | once | Flinch: arms jerk out 44°, head pops 13° and recoils |
| 19 | walk2 | 39/39 | 1.625 s (speed-scaled) | yes | **Zombie shamble**: walk legs, both arms held straight out front (near 72–89°, far 41–70°) |
| 20 | walk3 | 39/39 | 1.625 s (not scaled) | yes | **Limp**: near leg dragged with the shin flipped −167° and almost still; far leg does the work (thigh −14…+70°) |
| 21 | walk4 | 39/39 | 1.625 s (not scaled) | yes | Limp + arms out (walk3 legs, walk2-style arms) |
| 22 | crouch | 20/20 | 0.83 s | once | Bends forward to −20.5° over 20 frames and holds (ducking / reaching low) |
| 23 | feast | 20/20 | 0.83 s | yes | Leaning −20° over a corpse, head dips −14° twice per loop, hand to mouth at f5 |
| 24 | mouthwipe | 26/26 | 1.08 s | once | Near arm sweeps up to 135° across the mouth and back; the hand bitmap is hidden in one frame |
| 25 | hungry1 | 68/68 | 2.83 s | yes | Slow slump: torso leans −10° over 19 frames then holds, head droops |
| 26 | hungry2 | 10/10 | 0.42 s | yes | Quick re-straighten from −10° to 0 |
| 27 | rise | 15/15 | 0.63 s | yes* | Straightens from a −20° lean to upright (the reverse of crouch); *looped by default, but gameplay swaps it out |
| 28 | hung | 29/29 | 1.21 s | yes | **Held up by the player's finger**: whole body tilted −10°, head lolls −30…−35°, limbs dangle and sway ±3° |
| 29 | hung2 | 8/8 | 0.33 s | yes | Dangling and kicking: thighs ±24° in anti-phase, arms ±25°, fast |

Notes:
- The chef-select screen randomly cycles types 0–4, 6–9, 11, 13–21 and 24.
- NW clips have the same frame counts except death (18), hit (16), idle3 (68), run (15) and serve (17).

Per-clip detail (SW, the front view). The columns are:
- **local rot**: min..max of the part's rotation relative to its parent, with the frames where they happen;
- **rot at f…**: the rotation at 0 %, 25 %, 50 %, 75 % and 100 % of the clip;
- **offset drift**: how far the part's anchor slides (su) relative to frame 0.

Parts not listed are static.

#### walk  (39 f SW / 39 f NW, 1.625 s, loops)

| part | local rot ° | rot at f0/9/19/29/38 | offset drift (su) |
|---|---|---|---|
| head | -1.6 .. 0.2 (min f1, max f15) | 0 / -0 / 0.1 / 0 / 0 | x -2.8..+0.3, y -9.7..+0 |
| L.upperarm | -19.2 .. 16.6 (min f19, max f0) | 16.6 / -2.3 / -19.2 / -3.1 / 16.5 | x -0..+19.8, y -16.9..+0 |
| L.forearm | -2.7 .. 25.1 (min f31, max f14) | -0.2 / 21.8 / 22 / -1.5 / -0.3 | x -20.9..+2.6, y -9.8..+5.1 |
| hips | 0.1 .. 0.1 (min f0, max f0) | 0.1 / 0.1 / 0.1 / 0.1 / 0.1 | x -1.7..+0, y -6.7..+0 |
| L.thigh | -23.6 .. 24.6 (min f0, max f19) | -23.6 / -1.5 / 24.6 / -0.4 / -23.6 | x -25.6..+0, y -0..+1.9 |
| L.shin | -55 .. 5.2 (min f10, max f21) | 0 / -54.7 / 1.9 / -3.7 / -0 | x -2.7..+24.4, y -14.3..+4 |
| R.thigh | -12.5 .. 26.4 (min f19, max f0) | 26.4 / 7.5 / -12.5 / 11.9 / 26.3 | x +0..+11.8, y -9.5..+0.7 |
| R.shin | -55.4 .. -0.5 (min f28, max f0) | -0.5 / -15.5 / -28.6 / -54.5 / -0.7 | x +0..+27.2, y -13.6..+2.6 |
| R.upperarm | -15.6 .. 17.9 (min f0, max f19) | -15.6 / -0.1 / 17.9 / 0.7 / -15.5 | x -20.2..+0, y -5..+0 |
| R.forearm | 24 .. 74.6 (min f19, max f0) | 74.6 / 35.1 / 24 / 33.8 / 74.5 | x -16..+0, y -10.4..+0 |

Held still: torso 0°.

#### walk2  (39 f SW / 39 f NW, 1.625 s, loops)

| part | local rot ° | rot at f0/9/19/29/38 | offset drift (su) |
|---|---|---|---|
| head | -1.6 .. 0.2 (min f1, max f15) | 0 / -0 / 0.1 / 0 / 0 | x -2.8..+0.3, y -2.8..+0 |
| L.upperarm | 72.2 .. 89.3 (min f19, max f0) | 89.3 / 81.6 / 72.2 / 81 / 89.3 | x +0..+6.5, y +0..+8.6 |
| hips | 0.1 .. 0.1 (min f0, max f0) | 0.1 / 0.1 / 0.1 / 0.1 / 0.1 | x +0..+0.5, y -4.5..+0 |
| L.thigh | -23.6 .. 24.6 (min f0, max f19) | -23.6 / -1.5 / 24.6 / -0.4 / -23.6 | x -18.8..+0, y -0..+1.8 |
| L.shin | -55 .. 5.2 (min f10, max f21) | 0 / -54.7 / 1.9 / -3.7 / -0 | x -2.7..+24.4, y -14.3..+4 |
| R.thigh | -12.5 .. 26.4 (min f19, max f0) | 26.4 / 7.5 / -12.5 / 11.9 / 26.3 | x +0..+13.3, y -15.8..+0 |
| R.shin | -55.4 .. -0.5 (min f28, max f0) | -0.5 / -15.5 / -28.6 / -54.5 / -0.7 | x +0..+30.4, y -10..+2.4 |
| R.upperarm | 41.2 .. 69.6 (min f0, max f19) | 41.2 / 54.1 / 69.6 / 55 / 41.3 | x -6.5..+0, y -16.4..+0 |

Held still: torso 0°, L.forearm -0.2°, R.forearm 18°.

#### walk3  (39 f SW / 39 f NW, 1.625 s, loops)

| part | local rot ° | rot at f0/9/19/29/38 | offset drift (su) |
|---|---|---|---|
| head | -1.6 .. 0.2 (min f1, max f15) | 0 / -0 / 0.1 / 0 / 0 | x -2.4..+11.4, y -7.3..+0 |
| L.upperarm | -19.2 .. 16.6 (min f19, max f0) | 16.6 / -2.3 / -19.2 / -3.1 / 16.5 | x +0..+19.8, y -8.7..+0 |
| L.forearm | -2.7 .. 25.1 (min f31, max f14) | -0.2 / 21.8 / 22 / -1.5 / -0.3 | x -21..+0.4, y -9.3..+2.2 |
| hips | 0.1 .. 0.1 (min f0, max f0) | 0.1 / 0.1 / 0.1 / 0.1 / 0.1 | x +0..+0.6, y -4.4..+0 |
| L.thigh | -23.6 .. -16.4 (min f0, max f19) | -23.6 / -20.4 / -16.4 / -20.2 / -23.6 | x -2.7..+0, y +0..+1.7 |
| R.thigh | -14.4 .. 70.3 (min f18, max f34) | 26.4 / 7.5 / -13 / 48.8 / 27.3 | x -4.8..+15.7, y -20..+0 |
| R.shin | -41.4 .. -0.5 (min f31, max f0) | -0.5 / -15.5 / -28.8 / -40.9 / -1.2 | x +0..+19.9, y -9.5..+0 |
| R.upperarm | -15.6 .. 17.9 (min f0, max f19) | -15.6 / -0.1 / 17.9 / 0.7 / -15.5 | x -20.2..+0, y -5..+0 |
| R.forearm | 24 .. 74.6 (min f19, max f0) | 74.6 / 35.1 / 24 / 33.8 / 74.5 | x -16..+0, y -10.4..+0 |

Held still: torso 0°, L.shin -167.4°.

#### walk4  (39 f SW / 39 f NW, 1.625 s, loops)

| part | local rot ° | rot at f0/9/19/29/38 | offset drift (su) |
|---|---|---|---|
| head | -1.6 .. 0.2 (min f1, max f15) | 0 / -0 / 0.1 / 0 / 0 | x -2.4..+11.4, y -11.9..+0 |
| L.upperarm | 74.2 .. 87.2 (min f19, max f0) | 87.2 / 81.3 / 74.2 / 80.9 / 87.2 | x +0..+2.7, y +0..+8.9 |
| hips | 0.1 .. 0.1 (min f0, max f0) | 0.1 / 0.1 / 0.1 / 0.1 / 0.1 | x -1.7..+0, y -4.4..+0 |
| L.thigh | -23.6 .. -16.4 (min f0, max f19) | -23.6 / -20.4 / -16.4 / -20.2 / -23.6 | x -2.7..+0, y +0..+1.7 |
| R.thigh | -14.4 .. 70.3 (min f18, max f34) | 26.4 / 7.5 / -13 / 48.8 / 27.3 | x -2.6..+13.2, y -20.2..+0 |
| R.shin | -41.4 .. -0.5 (min f31, max f0) | -0.5 / -15.5 / -28.8 / -40.9 / -1.2 | x +0..+23.8, y -6.2..+0.1 |
| R.upperarm | 38.5 .. 58.6 (min f0, max f19) | 38.5 / 47.6 / 58.6 / 48.3 / 38.7 | x -3.9..+4.5, y -8.8..+0 |
| R.forearm | 30.1 .. 30.1 (min f0, max f0) | 30.1 / 30.1 / 30.1 / 30.1 / 30.1 | x -5.2..+0, y +0..+0.7 |

Held still: torso 0°, L.forearm -0.2°, L.shin -167.4°.

#### run  (16 f SW / 15 f NW, 0.667 s, loops)

| part | local rot ° | rot at f0/4/8/12/15 | offset drift (su) |
|---|---|---|---|
| hips | 0 .. 0 (min f0, max f0) | 0 / 0 / 0 / 0 / 0 | x +0..+0, y -2.2..+0 |
| L.thigh | -41.6 .. 39.4 (min f0, max f8) | -41.6 / 1.9 / 39.4 / -7.8 / -40 | x -42.2..+0, y -2.2..+6.5 |
| L.shin | -45.9 .. 3.7 (min f4, max f10) | 0 / -45.9 / 0.4 / 2.2 / 0.1 | x -0.1..+14.8, y -10.5..+7.4 |
| R.thigh | -26.6 .. 53.4 (min f8, max f0) | 53.4 / 10.7 / -26.6 / 14.2 / 52.6 | x +0..+25.6, y -1.6..+8.7 |
| R.shin | -58.4 .. 11.9 (min f11, max f0) | 11.9 / -11.7 / -45.5 / -47.7 / 8.8 | x +0..+34.1, y -15.5..+0.2 |
| L.upperarm | -7.1 .. -1.2 (min f8, max f0) | -1.2 / -4.4 / -7.1 / -2.9 / -1.3 | x -4.4..+0, y -1.2..+0 |
| R.upperarm | 106 .. 120.5 (min f8, max f0) | 120.5 / 112.7 / 106 / 116.2 / 120.3 | x -6.2..+0, y +0..+6.2 |
| head | 4.2 .. 5.6 (min f0, max f4) | 4.2 / 5.6 / 4.2 / 5.5 / 4.3 | x +0..+0, y -4.8..+0 |

Held still: torso 0°, L.forearm -7.1°, R.forearm 18.2°.

#### idle  (39 f SW / 39 f NW, 1.625 s, loops)

| part | local rot ° | rot at f0/9/19/29/38 | offset drift (su) |
|---|---|---|---|
| head | 0 .. 0 (min f0, max f0) | 0 / 0 / 0 / 0 / 0 | x -6.8..+0, y +0..+9.1 |

Held still: torso 0°, L.upperarm 9.4°, L.forearm -0.5°, hips 0.1°, L.thigh 0°, L.shin 0°, R.thigh 0.4°, R.shin 0°, R.upperarm -15.6°, R.forearm 39.9°.

#### idle3  (82 f SW / 68 f NW, 3.417 s, plays once)

| part | local rot ° | rot at f0/20/41/61/81 | offset drift (su) |
|---|---|---|---|
| head | -27.5 .. 2.9 (min f20, max f10) | 0 / -27.5 / -0.5 / -0 / -0 | x -122.2..+10.2, y -3.4..+70.8 |
| L.upperarm | -1.1 .. 24.1 (min f10, max f22) | -0.2 / 12.2 / 2.1 / -0.1 / -0.1 | x -87.5..+5.5, y -2.5..+58.7 |
| L.forearm | -15.3 .. 61.5 (min f61, max f53) | -0.2 / -4.7 / -2.8 / -15.3 / -0.3 | x -41.1..+11.8, y -33.2..+5.4 |
| hips | -13.1 .. 1.1 (min f26, max f10) | 0.1 / -7 / -0.5 / 0.1 / 0.1 | x -4.5..+0.4, y -6.8..+0.6 |
| L.thigh | -0.6 .. 7.6 (min f10, max f26) | -0 / 4.1 / 0.3 / -0 / -0 | x -5.8..+0.5, y -1.1..+12.9 |
| R.thigh | -0.8 .. 15.2 (min f10, max f26) | 0.4 / 8.3 / 1.6 / 0.5 / 0.5 | x -0.9..+0.1, y -0.5..+5.4 |
| R.shin | -0.4 .. -0.4 (min f0, max f0) | -0.4 / -0.4 / -0.4 / -0.4 / -0.4 | x -1.3..+0, y +0..+0.4 |
| R.forearm | 39.9 .. 90.6 (min f0, max f41) | 39.9 / 83 / 90.6 / 40.7 / 40.7 | x -126.5..+20.3, y -0.7..+101.8 |
| lean torso | -42.5 .. 2.4 (min f24, max f10) | -0 / -25.5 / 0.1 / 0.1 / 0.1 | x -45.5..+2.5, y -1.5..+20.5 |

Held still: torso 0°, L.shin 0°, R.upperarm -15.6°.

#### idle4  (39 f SW / 39 f NW, 1.625 s, plays once)

| part | local rot ° | rot at f0/9/19/29/38 | offset drift (su) |
|---|---|---|---|
| head | 0 .. 0 (min f0, max f0) | 0 / 0 / 0 / 0 / 0 | x -2.2..+0.3, y +0..+24.9 |
| L.upperarm | 9.4 .. 134.2 (min f0, max f12) | 9.4 / 126.8 / 124.8 / 123.3 / 9.5 | x -38.2..+0, y -32.5..+4.1 |
| L.forearm | -37 .. 2.9 (min f16, max f34) | -0.2 / -32.9 / -36.3 / -10.4 / -0.1 | x -8.6..+27.4, y -6.2..+0.3 |

Held still: torso 0°, hips 0.1°, L.thigh 0°, L.shin 0°, R.thigh 0.4°, R.shin 0°, R.upperarm -15.6°, R.forearm 39.9°.

#### idle5  (39 f SW / 39 f NW, 1.625 s, plays once)

| part | local rot ° | rot at f0/9/19/29/38 | offset drift (su) |
|---|---|---|---|
| head | 0 .. 5.9 (min f0, max f19) | 0 / 3.2 / 5.9 / 3.4 / 0 | x +0..+10.2, y +0..+7.4 |
| L.upperarm | 0 .. 192.6 (min f0, max f23) | 0 / 96.4 / 181.5 / 126.8 / 0.4 | x -45.9..+0, y -56..+6.3 |
| L.forearm | -17.8 .. 41.8 (min f4, max f14) | -0.2 / 25.1 / 33.1 / 32.9 / -0.1 | x -32.9..+10.7, y -18.8..+0 |

Held still: torso 0°, hips 0.1°, L.thigh 0°, L.shin 0°, R.thigh 0.4°, R.shin 0°, R.upperarm -0°, R.forearm 3.1°.

#### sit  (1 f SW / 1 f NW, 0.042 s, loops)


Held still: torso 0°, hips 0°, L.thigh 63.8°, L.shin -63.6°, R.thigh 83.9°, R.shin -78.4°, L.upperarm 0°, L.forearm 79.5°, R.upperarm -7.2°, R.forearm 94.6°, head -0°.

#### eat  (58 f SW / 58 f NW, 2.417 s, loops)

| part | local rot ° | rot at f0/14/29/43/57 | offset drift (su) |
|---|---|---|---|
| L.upperarm | 0 .. 44 (min f0, max f9) | 0 / 34.5 / 16.6 / 0.4 / 0.4 | x -25.4..+0, y +0..+9.3 |
| L.forearm | 79.5 .. 98.1 (min f0, max f8) | 79.5 / 89.1 / 91 / 79.8 / 79.8 | x +0..+2.8, y -15.6..+0 |
| R.upperarm | -13.7 .. 52 (min f26, max f49) | -7.2 / -10.9 / -13.3 / 23.6 / -5.8 | x -24.5..+3.9, y -21.9..+0.2 |
| head | -11.3 .. 17 (min f8, max f53) | -0 / -4.8 / -5.2 / -0.2 / -0.1 | x -10.4..+33.5, y -0.2..+6.3 |

Held still: torso 0°, hips 0°, L.thigh 63.8°, L.shin -63.6°, R.thigh 83.9°, R.shin -78.4°, R.forearm 94.6°.

#### feast  (20 f SW / 20 f NW, 0.833 s, loops)

| part | local rot ° | rot at f0/5/10/15/19 | offset drift (su) |
|---|---|---|---|
| head | -14.3 .. 0 (min f5, max f0) | 0 / -14.3 / -3.9 / -13.8 / -3.8 | x -24.5..+0, y -2..+1.8 |
| L.upperarm | 9.4 .. 21.5 (min f0, max f5) | 9.4 / 21.5 / 9.6 / 21 / 9.5 | x -7.5..+0, y +0..+1.7 |
| L.forearm | -5.3 .. 69 (min f11, max f5) | -0.2 / 69 / -2.7 / -0.2 / -0.2 | x -40.2..+3.6, y -51.1..+0 |
| R.upperarm | -28.7 .. -15.6 (min f5, max f0) | -15.6 / -28.7 / -15.8 / -28.2 / -15.6 | x +0..+8.1, y -1.3..+0.5 |
| R.forearm | 35.5 .. 39.9 (min f18, max f0) | 39.9 / 39.9 / 39.9 / 39.4 / 38.7 | x +0..+2.4, y +0..+2.7 |

Held still: torso 0°, hips 0.1°, L.thigh 0°, L.shin 0°, R.thigh 0.4°, R.shin 0°, lean torso -20.5°.

#### mouthwipe  (26 f SW / 26 f NW, 1.083 s, plays once)

| part | local rot ° | rot at f0/6/13/19/25 | offset drift (su) |
|---|---|---|---|
| L.upperarm | 7.4 .. 134.6 (min f25, max f11) | 9.4 / 85.5 / 126.9 / 133.1 / 7.4 | x -48.2..+0, y -49.3..+2.5 |
| L.forearm (hand hidden at f0) | -45.3 .. 2.2 (min f13, max f23) | -0.2 / -4.2 / -45.3 / -8.4 / -0.2 | x -1.6..+33.6, y -14.6..+0 |

Held still: torso 0°, head 0°, hips 0.1°, L.thigh 0°, L.shin 0°, R.thigh 0.4°, R.shin 0°, R.upperarm -15.6°, R.forearm 39.9°, lean torso 0°.

#### carry  (39 f SW / 39 f NW, 1.625 s, loops)

| part | local rot ° | rot at f0/9/19/29/38 | offset drift (su) |
|---|---|---|---|
| head | 0 .. 0 (min f0, max f0) | 0 / 0 / 0 / 0 / 0 | x +0..+0, y -6.2..+0 |
| L.upperarm | 16.6 .. 16.6 (min f0, max f0) | 16.6 / 16.6 / 16.6 / 16.6 / 16.6 | x -0..+0, y -6.2..+0 |
| hips | 0.1 .. 0.1 (min f0, max f0) | 0.1 / 0.1 / 0.1 / 0.1 / 0.1 | x -1.7..+0, y -2.6..+0 |
| L.thigh | -23.6 .. 24.6 (min f0, max f19) | -23.6 / -1.5 / 24.6 / -0.4 / -23.6 | x -19.4..+0, y -4.8..+0 |
| L.shin | -55 .. 5.2 (min f10, max f21) | 0 / -54.7 / 1.9 / -3.7 / -0 | x -2.7..+24.4, y -14.3..+4 |
| R.thigh | -12.5 .. 26.4 (min f19, max f0) | 26.4 / 7.5 / -12.5 / 11.9 / 26.3 | x +0..+11.2, y -12.7..+0.9 |
| R.shin | -55.4 .. -0.5 (min f28, max f0) | -0.5 / -15.5 / -28.6 / -54.5 / -0.7 | x -0.8..+27.8, y -11.9..+2.8 |
| R.upperarm | 7.3 .. 7.3 (min f0, max f0) | 7.3 / 7.3 / 7.3 / 7.3 / 7.3 | x +0..+0, y -6.7..+0 |

Held still: torso 0°, L.forearm 43.7°, R.forearm 54.8°, dish slot 0°.

#### serve  (16 f SW / 17 f NW, 0.667 s, plays once)

| part | local rot ° | rot at f0/4/8/12/15 | offset drift (su) |
|---|---|---|---|
| head | 0.1 .. 4.1 (min f0, max f8) | 0.1 / 2.2 / 4.1 / 1.7 / 0.1 | x -64.5..+0, y +0..+41.8 |
| L.upperarm | 16.6 .. 29.1 (min f0, max f8) | 16.6 / 23.3 / 29.1 / 21.7 / 16.6 | x -46.1..+0, y +0..+25.7 |
| L.forearm | 19.9 .. 43.7 (min f8, max f0) | 43.7 / 31 / 19.9 / 33.9 / 43.5 | x +0..+16.4, y +0..+13.7 |
| R.upperarm | 7.3 .. 16.6 (min f0, max f8) | 7.3 / 12.3 / 16.6 / 11.1 / 7.3 | x -43.5..+0, y +0..+12.5 |
| R.forearm | 38.3 .. 54.8 (min f8, max f0) | 54.8 / 46 / 38.3 / 48.1 / 54.7 | x -1..+0, y +0..+7.4 |
| lean torso | -22.8 .. -0.8 (min f8, max f0) | -0.8 / -12.5 / -22.8 / -9.8 / -0.9 | x -18.3..+0, y +0..+18.3 |

Held still: torso 0°, hips 0.1°, L.thigh -0.4°, L.shin 0°, R.thigh 8.9°, R.shin -8.7°, dish slot 0°.

#### operate  (50 f SW / 50 f NW, 2.083 s, loops)

| part | local rot ° | rot at f0/12/25/37/49 | offset drift (su) |
|---|---|---|---|
| L.upperarm | 0 .. 43 (min f0, max f39) | 0 / 41.5 / 14.8 / 39.2 / 1.8 | x -29.1..+0, y +0..+5 |
| L.forearm | 0.2 .. 98.8 (min f0, max f25) | 0.2 / 39.6 / 98.8 / 42.5 / 1 | x -31.9..+0, y -65.4..+0 |
| R.upperarm | -13 .. 26 (min f34, max f20) | -7.2 / -5.2 / 13.5 / -13 / -13 | x -16.8..+3.5, y -10.2..+0.7 |
| R.forearm | 20.6 .. 101.5 (min f0, max f34) | 20.6 / 90 / 74.6 / 87.9 / 35.3 | x -27.1..+0, y -49.5..+0 |
| head | -7.9 .. 1.1 (min f21, max f30) | -0 / 1 / -4.1 / -7.2 / -0.2 | x -28.4..+0, y +0..+9.6 |

Held still: torso 0°, hips 0°, L.thigh 0°, L.shin 0°, R.thigh 0°, R.shin 0°.

#### bump  (15 f SW / 15 f NW, 0.625 s, loops)

| part | local rot ° | rot at f0/3/7/11/14 | offset drift (su) |
|---|---|---|---|
| torso | 0 .. 19.9 (min f0, max f5) | 0 / 13.6 / 11.2 / 0.9 / 0.9 | x +0..+34.5, y -4.4..+0.3 |
| head | -6.9 .. 2.6 (min f10, max f4) | 0 / 2.2 / -2.1 / -3.9 / -0.6 | x -14..+2.6, y -0..+3.5 |
| L.upperarm | 6.2 .. 60.5 (min f14, max f3) | 16.6 / 60.5 / 43.4 / 17 / 6.2 | x -30.8..+6.3, y -2.8..+1.7 |
| hips | -19.9 .. 0.1 (min f5, max f0) | 0.1 / -13.6 / -11.1 / -0.6 / -0.6 | x +0..+3.2, y -15.7..+0 |
| L.thigh | -23.6 .. -1.1 (min f0, max f8) | -23.6 / -17.3 / -2.9 / -1.1 / -1.1 | x -9.1..+0, y +0..+16.4 |
| R.thigh | 3.9 .. 57.7 (min f8, max f4) | 26.4 / 50.4 / 21.5 / 3.9 / 3.9 | x -15.2..+14.7, y -13..+0 |
| R.shin | -32.4 .. -0.5 (min f5, max f0) | -0.5 / -22.5 / -12.8 / -2.5 / -2.5 | x -0.3..+17.1, y -0.3..+1.2 |
| R.upperarm | 0.8 .. 33.6 (min f14, max f3) | 4.6 / 33.6 / 23.6 / 7.4 / 0.8 | x -15.4..+2.3, y -9.6..+0.6 |
| R.forearm | 12.1 .. 20 (min f1, max f3) | 14.2 / 20 / 18.1 / 15.3 / 14.3 | x -6.1..+0, y -0.5..+3.7 |

Held still: L.forearm -0.2°, L.shin 0°.

#### celebrate  (93 f SW / 93 f NW, 3.875 s, loops)

| part | local rot ° | rot at f0/23/46/69/92 | offset drift (su) |
|---|---|---|---|
| head | -6.1 .. 11.9 (min f20, max f65) | -0.4 / -5.8 / -4.6 / 10.3 / -0.2 | x -11.8..+18.9, y -1.9..+7.9 |
| L.upperarm | 6 .. 195.8 (min f0, max f71) | 6 / 192.3 / 189.9 / 189.9 / 6.5 | x -43.6..+0, y -60..+3.7 |
| L.forearm | -5.6 .. 52.1 (min f15, max f34) | -0.2 / -0.3 / 2.5 / 15.1 / -0.1 | x -40.4..+4.7, y -27.4..+0 |
| R.upperarm | -15.6 .. 113.4 (min f0, max f24) | -15.6 / 111.4 / 101.3 / 104.8 / -15.3 | x -37.8..+0, y -57.5..+0 |
| R.forearm | 31.1 .. 83.7 (min f89, max f34) | 39.9 / 39.8 / 53.6 / 61.9 / 40.6 | x -11.1..+5.1, y -33.9..+5.2 |

Held still: torso 0°, hips 0.1°, L.thigh 0°, L.shin 0°, R.thigh 0.4°, R.shin 0°.

#### hit  (18 f SW / 16 f NW, 0.75 s, plays once)

| part | local rot ° | rot at f0/4/9/13/17 | offset drift (su) |
|---|---|---|---|
| head | -11.2 .. 43.5 (min f13, max f6) | -0 / 34.8 / 21.1 / -11.2 / -0.6 | x -21.2..+70.6, y -2.9..+27.1 |
| L.upperarm | 0.3 .. 46.8 (min f2, max f6) | 9.4 / 28.5 / 25.2 / 10.3 / 10.3 | x -7.6..+9.7, y -1.6..+3.6 |
| L.forearm | -14 .. 1.6 (min f14, max f8) | -0.2 / 0.7 / 1.4 / -12.9 / -0.5 | x -3.2..+8, y -0.1..+1.1 |
| R.upperarm | -20.2 .. 21.7 (min f2, max f6) | -15.6 / 5.7 / -0.1 / -14.7 / -14.7 | x +0..+3.3, y -13.1..+0.1 |
| R.forearm | 34.4 .. 40.6 (min f14, max f8) | 39.9 / 40.2 / 40.5 / 34.7 / 40.1 | x -0.4..+3.1, y -0.5..+3.3 |
| lean torso | 0 .. 9.4 (min f0, max f6) | 0 / 7.2 / 3.5 / 0.2 / 0.2 | x -2..+8.9, y -2.5..+0 |

Held still: torso 0°, hips 0.1°, L.thigh 0°, L.shin 0°, R.thigh 0.4°, R.shin 0°.

#### attack  (29 f SW / 29 f NW, 1.208 s, loops)

| part | local rot ° | rot at f0/7/14/21/28 | offset drift (su) |
|---|---|---|---|
| head | 0 .. 0 (min f0, max f0) | 0 / 0 / 0 / 0 / 0 | x -21.1..+0, y +0..+15.5 |
| L.upperarm | 0.3 .. 95.1 (min f0, max f19) | 0.3 / 84.2 / 73.7 / 89.2 / 4 | x -40.5..+0, y -8.2..+9.7 |
| R.upperarm | -12.2 .. 67.6 (min f28, max f14) | -2.8 / 35.5 / 67.6 / 33.5 / -12.2 | x -29.3..+5.9, y -29.6..+0.6 |
| R.forearm | 2.9 .. 24.3 (min f0, max f4) | 2.9 / 24.3 / 24.3 / 24.3 / 24.3 | x -16.2..+0, y -7.2..+0 |

Held still: torso 0°, L.forearm -0.2°, hips 0.1°, L.thigh 0°, L.shin 0°, R.thigh 0.4°, R.shin 0°.

#### attack2  (29 f SW / 29 f NW, 1.208 s, loops)

| part | local rot ° | rot at f0/7/14/21/28 | offset drift (su) |
|---|---|---|---|
| head | 0.2 .. 10.1 (min f0, max f14) | 0.2 / 4.9 / 10.1 / 5.7 / 0.2 | x +0..+17.4, y -2.2..+0 |
| L.upperarm | -5.3 .. 210.1 (min f26, max f16) | 0.1 / 35.7 / 180.6 / 93.4 / -1 | x -43.5..+8.9, y -60.7..+11.3 |
| L.forearm | -14 .. 29.3 (min f20, max f9) | -0.2 / 24.9 / 11.7 / -11 / -0.2 | x -21.9..+9.7, y -6.8..+0 |
| R.upperarm | -24.8 .. 135.7 (min f26, max f16) | -8.9 / 28 / 121 / 44.3 / -17 | x -33.3..+10, y -66.9..+0 |

Held still: torso 0°, hips 0.1°, L.thigh 0°, L.shin 0°, R.thigh 0.4°, R.shin 0°, R.forearm 29.4°.

#### attackHuman  (29 f SW / 29 f NW, 1.208 s, loops)

| part | local rot ° | rot at f0/7/14/21/28 | offset drift (su) |
|---|---|---|---|
| head | 0 .. 0 (min f0, max f0) | 0 / 0 / 0 / 0 / 0 | x -25.9..+0, y +0..+11.2 |
| L.upperarm | -42.4 .. 97.9 (min f7, max f14) | 0.2 / -42.4 / 97.9 / 43.7 / 1.9 | x -59.9..+10.4, y -30.6..+1.3 |
| L.forearm | -18.1 .. 37.5 (min f15, max f7) | -0.2 / 37.5 / -17.5 / -5.8 / -0.1 | x -27.1..+16.7, y -18.3..+0.1 |
| R.upperarm | -9.5 .. 10 (min f0, max f6) | -9.5 / 8.9 / -5.5 / -8.6 / -9.5 | x -11.9..+0, y -2.8..+0 |
| R.forearm | 25.8 .. 28.9 (min f22, max f28) | 28.5 / 26.1 / 26 / 25.8 / 28.9 | x -0.3..+1.8, y -0.2..+1.4 |

Held still: torso 0°, hips 0.2°, L.thigh 0°, L.shin 0°, R.thigh 0.4°, R.shin 0°.

#### startled  (25 f SW / 25 f NW, 1.042 s, plays once)

| part | local rot ° | rot at f0/6/12/18/24 | offset drift (su) |
|---|---|---|---|
| head | -5.7 .. 12.8 (min f3, max f10) | 0 / 0.5 / 11 / 0.4 / 0.4 | x -32.1..+29.5, y +0..+14.1 |
| L.upperarm | 0 .. 44.1 (min f20, max f7) | 0.7 / 42.8 / 3.5 / 0.8 / 0.7 | x -29..+7.8, y -4.7..+6.3 |
| L.forearm | -14.2 .. 20.2 (min f17, max f10) | -0.2 / -11.3 / 11.1 / -13.1 / -0.2 | x -19.2..+12.7, y -4.5..+5.1 |
| R.upperarm | -23.1 .. 5.2 (min f15, max f7) | -15.6 / 5 / -21.3 / -20.4 / -11.3 | x -12.9..+4.7, y -1.7..+0 |
| lean torso | -4.6 .. 2.4 (min f4, max f11) | 0 / -2.9 / 2.3 / 0 / 0 | x -2.2..+4.5, y -4.6..+0 |

Held still: torso 0°, hips 0.1°, L.thigh 0°, L.shin 0°, R.thigh 0.4°, R.shin 0°, R.forearm 39.9°.

#### crouch  (20 f SW / 20 f NW, 0.833 s, plays once)

| part | local rot ° | rot at f0/5/10/15/19 | offset drift (su) |
|---|---|---|---|
| head | 0 .. 0 (min f0, max f0) | 0 / 0 / 0 / 0 / 0 | x -72.7..+0, y +0..+34.1 |
| L.upperarm | -0.5 .. 9.2 (min f0, max f19) | -0.5 / 0.2 / 2.3 / 5.6 / 9.2 | x -43.9..+0, y +0..+25.1 |
| R.upperarm | -15.6 .. -14.3 (min f0, max f13) | -15.6 / -15.2 / -14.5 / -14.4 / -15.5 | x -42.9..+0, y +0..+22.6 |
| lean torso | -20.5 .. 0 (min f19, max f0) | 0 / -3.4 / -10.9 / -18 / -20.5 | x -20.4..+0, y -0.1..+4.6 |

Held still: torso 0°, L.forearm -0.2°, hips 0.1°, L.thigh 0°, L.shin 0°, R.thigh 0.4°, R.shin 0°, R.forearm 39.9°.

#### death  (15 f SW / 18 f NW, 0.625 s, plays once)

| part | local rot ° | rot at f0/3/7/11/14 | offset drift (su) |
|---|---|---|---|
| head | -14.1 .. 1.8 (min f3, max f14) | 0 / -14.1 / -8 / -5.5 / 1.8 | x -275.5..+0, y +0..+285 |
| L.upperarm | -113.9 .. 11.3 (min f10, max f0) | 11.3 / -73.8 / -95.4 / -109.6 / -63.1 | x -212.8..+0, y -38.1..+217.1 |
| hips | -103.9 .. 0.1 (min f11, max f0) | 0.1 / -46.3 / -79.9 / -103.9 / -103.9 | x -117.8..+12.4, y -22.9..+78.9 |
| L.thigh | 0 .. 0 (min f0, max f0) | 0 / 0 / 0 / 0 / 0 | x +0..+2.5, y +0..+0 |
| L.shin | 0 .. 0 (min f0, max f0) | 0 / 0 / 0 / 0 / 0 | x -7..+1.5, y -9..+0.2 |
| R.thigh | 0.4 .. 0.4 (min f0, max f0) | 0.4 / 0.4 / 0.4 / 0.4 / 0.4 | x -2.5..+7.9, y -4.3..+16 |
| R.shin | 0 .. 0 (min f0, max f0) | 0 / 0 / 0 / 0 / 0 | x -3.4..+2.4, y +0..+12.3 |
| R.upperarm | -15.6 .. 67.9 (min f0, max f12) | -15.6 / 29.8 / 52.7 / 67.4 / 66.8 | x -296.8..+0, y +0..+199.1 |
| R.forearm | 16.9 .. 52.2 (min f14, max f10) | 39.9 / 39.7 / 34.7 / 50.1 / 16.9 | x -5.7..+14.8, y -8.6..+11.9 |
| lean torso | -112.5 .. 0 (min f12, max f0) | 0 / -46.7 / -68 / -112.4 / -107.2 | x -179.2..+0, y -6..+172.4 |

Held still: torso 0°, L.forearm -0.2°.

#### rise  (15 f SW / 15 f NW, 0.625 s, loops)

| part | local rot ° | rot at f0/3/7/11/14 | offset drift (su) |
|---|---|---|---|
| head | 0 .. 0 (min f0, max f0) | 0 / 0 / 0 / 0 / 0 | x +0..+72.9, y -32..+0 |
| L.upperarm | 6.4 .. 9.4 (min f14, max f0) | 9.4 / 9.1 / 8 / 6.8 / 6.4 | x +0..+36.1, y -7.7..+0 |
| R.upperarm | -15.6 .. -15.6 (min f0, max f0) | -15.6 / -15.6 / -15.6 / -15.6 / -15.6 | x +0..+43.3, y -20.6..+0 |
| lean torso | -20.5 .. -0 (min f0, max f14) | -20.5 / -18.2 / -10.7 / -2.9 / -0 | x +0..+20.5, y -4.5..+0 |

Held still: torso 0°, L.forearm -0.2°, hips 0.1°, L.thigh 0°, L.shin 0°, R.thigh 0.4°, R.shin 0°, R.forearm 39.9°.

#### hungry1  (68 f SW / 68 f NW, 2.833 s, loops)

| part | local rot ° | rot at f0/17/34/51/67 | offset drift (su) |
|---|---|---|---|
| head | 0 .. 0 (min f0, max f0) | 0 / 0 / 0 / 0 / 0 | x -45.4..+0, y +0..+22.8 |
| L.upperarm | 9.4 .. 9.4 (min f0, max f0) | 9.4 / 9.4 / 9.4 / 9.4 / 9.4 | x -13.7..+0, y +0..+6.8 |
| R.upperarm | -15.6 .. -15.6 (min f0, max f0) | -15.6 / -15.6 / -15.6 / -15.6 / -15.6 | x -18.2..+0, y +0..+13.7 |
| lean torso | -10.1 .. 0 (min f19, max f0) | 0 / -9.7 / -10.1 / -10.1 / -10.1 | x -6.8..+0, y -4.6..+0 |

Held still: torso 0°, L.forearm -0.2°, hips 0.1°, L.thigh 0°, L.shin 0°, R.thigh 0.4°, R.shin 0°, R.forearm 39.9°.

#### hungry2  (10 f SW / 10 f NW, 0.417 s, loops)

| part | local rot ° | rot at f0/2/5/7/9 | offset drift (su) |
|---|---|---|---|
| head | 0 .. 0 (min f0, max f0) | 0 / 0 / 0 / 0 / 0 | x +0..+36.8, y -13.9..+0 |
| L.upperarm | 9.4 .. 9.4 (min f0, max f0) | 9.4 / 9.4 / 9.4 / 9.4 / 9.4 | x +0..+9.9, y -7..+0 |
| R.upperarm | -15.6 .. -15.6 (min f0, max f0) | -15.6 / -15.6 / -15.6 / -15.6 / -15.6 | x +0..+18.5, y -13.9..+0 |
| lean torso | -10.1 .. -0.1 (min f0, max f9) | -10.1 / -8.7 / -4.5 / -1.7 / -0.1 | x +0..+6.9, y +0..+4.6 |

Held still: torso 0°, L.forearm -0.2°, hips 0.1°, L.thigh 0°, L.shin 0°, R.thigh 0.4°, R.shin 0°, R.forearm 39.9°.

#### hung  (29 f SW / 29 f NW, 1.208 s, loops)

| part | local rot ° | rot at f0/7/14/21/28 | offset drift (su) |
|---|---|---|---|
| torso | -11 .. -8.2 (min f0, max f14) | -11 / -9.6 / -8.2 / -9.4 / -10.9 | x -3..+0, y +0..+0 |
| head | -35 .. -30 (min f14, max f0) | -30 / -32.4 / -35 / -32.8 / -30 | x -7.3..+0, y +0..+7.2 |
| L.upperarm | 8.6 .. 11.6 (min f0, max f14) | 8.6 / 10.1 / 11.6 / 10.3 / 8.6 | x -1.8..+0, y +0..+2.5 |
| L.thigh | 8.9 .. 12.8 (min f0, max f14) | 8.9 / 10.8 / 12.8 / 11.1 / 9 | x -1.3..+0, y -0.4..+0 |
| R.thigh | 15.2 .. 21.1 (min f0, max f14) | 15.2 / 18 / 21.1 / 18.5 / 15.2 | x -2.1..+0, y -0.3..+0 |
| R.upperarm | -16.4 .. -11.7 (min f0, max f14) | -16.4 / -14.1 / -11.7 / -13.7 / -16.3 | x -2.9..+0, y +0..+2.9 |

Held still: L.forearm 10°, hips 0.1°, L.shin 0°, R.shin -20°, R.forearm 40°.

#### hung2  (8 f SW / 8 f NW, 0.333 s, loops)

| part | local rot ° | rot at f0/2/4/6/7 | offset drift (su) |
|---|---|---|---|
| torso | -19.7 .. -11 (min f4, max f0) | -11 / -15.7 / -19.7 / -14.6 / -11.7 | x +0..+9.5, y -1..+0 |
| L.upperarm | -15 .. 34.1 (min f0, max f4) | -15 / 12.7 / 34.1 / 3.3 / -12.5 | x -28.7..+0, y +0..+9.8 |
| L.forearm | -11.3 .. 28.9 (min f0, max f4) | -11.3 / 11.3 / 28.9 / 3.8 / -9.1 | x -34..+0, y -10.4..+0.1 |
| hips | 0.1 .. 6 (min f0, max f4) | 0.1 / 3.2 / 6 / 2.5 / 0.6 |  |
| L.thigh | -18.8 .. 28.5 (min f4, max f0) | 28.5 / 2.1 / -18.8 / 10.6 / 25.8 | x +0..+16, y +0..+3.3 |
| L.shin | -18.8 .. 10.5 (min f4, max f0) | 10.5 / -6.3 / -18.8 / -0.2 / 9.2 | x +0..+13.8, y -1..+0.5 |
| R.thigh | -4.1 .. 38.2 (min f0, max f4) | -4.1 / 19.9 / 38.2 / 11.6 / -1.9 | x -14.6..+0, y -1.9..+0.6 |
| R.shin | -26.2 .. 0.5 (min f0, max f4) | -26.2 / -10.7 / 0.5 / -16.7 / -25.2 | x -10.1..+0, y +0..+2.3 |
| R.upperarm | -27.7 .. 6.9 (min f4, max f0) | 6.9 / -12.3 / -27.7 / -6.5 / 4.7 | x +0..+21.5, y +0..+2.1 |
| R.forearm | 23.7 .. 40 (min f4, max f0) | 40 / 30.3 / 23.7 / 34.5 / 39.6 | x +0..+10, y +0..+9.1 |

Held still: head -30°.

**Walk timing in detail (walk SW).**
- Contact poses are at f0 and f19: thighs at ∓24°, far forearm swinging 75°↔24°.
- Passing poses are at f9–10 and f28–29. There the swinging shin folds to −55° and the head and hips are **highest**: head −9.7 su, hips −6.7 su, with a smooth sine between.
- The torso itself never moves relative to the root. The bob is done by lifting the hips/legs and the head, and the torso stays put.
- Arms are anti-phase with the same-side leg: near arm peaks at f0 and near thigh at f19.
- The legs lead. Each shin lags its thigh by about 10 frames (a quarter cycle), which gives the loose, floppy knee.

### 1.6 SW vs NW

- NW uses the `back_*` bitmaps: the back of the head (all hair), the back of the shirt, and the hip block with no fly.
- The head sits **14 su higher** in NW (centre 380 vs 366 su), so you see the top of the head.
- The arms swap screen sides: near arm at x −31, far at +33, versus +26/−28 in SW.
- In the draw order the head comes **last**, over the torso and both arms.
- Same timing and frame count (with the few exceptions in §1.5). The swings are similar, but the NW walk bends the knees harder (shins to −66…−83° vs −55°) and swings the thighs on a shifted range (−15…+40° and −28…+25°), because the leg is seen from behind.
- SE and NE simply mirror these two. No clip is drawn for them.

### 1.7 Sitting (sit / eat)

- **Seat height**: the sit clip moves the root up **136 su (≈50 px)** and **15 su toward the face** (SW). NW uses 133 su and 8 su. The game places the character at the chair tile and the clip lifts them onto the seat.
- **Hips**: the hip block centre ends at 87 su above the chair tile's ground point (114 su when standing). The torso centre is at 166 su (190 standing), so the whole upper body drops ~24 su.
- **Legs** (SW): the thighs swing forward to near-horizontal (near +64°, far +84°). The shins fold back by −64° and −78°, which leaves them **vertical**, with the feet on the floor just in front of the seat (near foot bottom at +28 su, i.e. on the ground line). The legs hang off the front edge of the seat.
- **Arms**: forearms forward at 80° (near) and 95° (far), resting on the table edge.
- **Head**: a separate child of the root, at the same height relative to the torso as standing.
- **Chair back (NW only)**: two chair-back slots exist. `chairback_1` sits at (+36, +49) su from the root and is drawn **last, over the character's back**. `chairback_2` sits at (−1, +128) su, near the floor, and is drawn early. Both bitmaps are blank for every character, so in practice the chair furniture sprite does the occluding. When you see a diner from behind, the chair back has to hide their lower back.
- **eat** keeps this pose (same root offset and leg angles) and animates only the arms and head (see the table).

### 1.8 What Zombs BBQ should do (animation)

1. **Copy the timing model.** Author at 24 fps. Scale walk, walk-shamble, run, carry and attack playback by the character's speed multiplier (`2 + 0.2 × speed`). Keep idle, eat and other "acting" clips at 1×. Interpolate (we render at 60 fps) instead of baking, but keep the same key times.
2. **Keep the rig shape.** Use the same part list: two-segment limbs, a separate hip block, and the head pivoting at its **bottom** (neck). Add a second "lean torso" layer for crouch, feast, serve and hit, so the torso can bend from the waist without carrying the head.
3. **Retune proportions.** The original head is **50 %** of height (2 heads tall) and 2.1× the torso width. Our `art3/chars/rig.ts` says ~55 %, which is close. Doc 03's "head ≈ 40 %" is too small and should be updated. Target standing height ≈ 1.9 tile heights.
4. **Walk = hip-and-head bob, rigid torso.** Thighs ±24°, knees to −55° a quarter-cycle behind, arms ±17° opposite, head up 10 su (~3.5 px) on each passing pose. Zombies get the arms-out shamble (walk2) and the drag-leg limp (walk3/4) as **per-character walk styles** chosen once at hire.
5. **Idle is only a slow head sway** (1.6 s cycle). The occasional idle3/4/5 gags play once and return. The arm-falls-off gag is a signature beat worth an original equivalent.
6. **Play-once set**: serve, death, hit, idle gags, startled, crouch, mouthwipe. Everything else loops until the task changes.
7. **Draw only two facings** (front-3/4 and back-3/4) and mirror for the other two. Draw the head last in the back view, and put the near arm over the head in the front view.
8. **Seated characters**: lift the root ~27 % of standing height onto the seat, thighs ~75° forward, shins vertical, forearms flat at ~85–95°. From behind, let the chair sprite's back cover the lower back.
9. **Implement the "intended" draw-order swaps** (we know their frames) only if they look better. The shipped game never used them.
10. **The dangling clips (hung/hung2)** are how the original sells "pick up and move a worker". Our drag-to-reassign should use a dangle loop.

---

## 2. Rival ("enemy") café layouts

### 2.1 File formats (all big-endian; strings are 2-byte length + bytes)

| File | Format | Contents |
|---|---|---|
| `enemyLayouts.bin.mid` | int16 count, then `count` × {string code, int32 a, int32 b, int32 c} | 190 records = **5 layouts**. A record with an empty code is a header {entries, width, height}; the others are {letter, rotation, x, y} |
| `enemyItems.bin.mid` | int16 count, then `count` × 17 strings | 14 themes: name, then 16 `_`-separated lists of furniture ids, one per slot (see 2.2) |
| `enemyCafeData.bin.mid` | uint8 count, then 14 × {int16 id, str owner, str name, int16 isBoss, int16 mapTheme, int16 chefCharacter, str staffCharacterIds, int16 iconId, int16 forcedLayout, int16 minPlayerLevel} | The roster (2.6). Its filename is **not referenced by the Android binary**, which uses constants instead. It is probably a newer/iOS table, but its numbers agree with the binary's constants |
| `enemyItemData.bin.mid` | uint8 rows (20), then 20 × 16 bytes | Per-enemy-level furniture **tier bounds** for each of the 16 slots. `GameStateRaid::getRandomFurnitureIndex` uses it to pick random furniture of the right function and tier when it is not using a theme list |

### 2.2 Letter codes (from the `chooseFurniture` jump table)

| Code | Theme list slot | Furniture type | Placed on |
|---|---|---|---|
| **H** | 1 | chair | floor |
| **T** | 2 | table | floor |
| **S** | 3 | stove | floor (kitchen) |
| **C** | 4 | serving counter | floor |
| **F** | 5 | fridge | floor (kitchen) |
| **G** | 6 | sink | floor (kitchen) |
| — | 7 | wall finish | all wall sections (`chooseWall`) |
| — | 8 | floor finish | every floor tile (`chooseFloor`) |
| **W** | 9 | window | wall |
| **L** | 10 | wall lamp / sconce | wall |
| **A** | 11 | wall art: posters, clocks, wine racks, specials boards | wall |
| **P** | 12 | potted plant | floor |
| **B** | 13 | "box": ATM, vending machine, arcade, jukebox, trash can, cabinets | floor |
| **D** | 14 | divider (grape trellis, velvet rope) | floor |
| **I** | 15 | standing floor lamp | floor |
| **E** | 16 | showpiece: fish tank, fountain, maître-d' podium | floor |

How the slots are filled:
- Each record draws **one random id from its theme's list, independently**, so two chairs in one café can differ.
- If the theme's list for that letter is empty, nothing is placed (for example the basic café has no wall lamps or dividers).
- **Rotation = facing**: 0 faces +y (down-right in iso), 1 faces −x, 2 faces −y, 3 faces +x. Wall items on the y=0 wall use rotation 0, and on the x=8 wall rotation 1.

### 2.3 Room, walls, floor, door, line-up

- **Size**: every layout is **9 × 8 tiles** (x 0–8, y 0–7). The room is built by `Cafe::createForNewRaid(9, 8)` on the 35 × 55 map, anchored at `Cafe_RAID_SIDEWALK = (9, 17)`. (The player's café starts at 7 × 6.)
- **Visible walls**: the **y = 0 edge** and the **x = 8 edge** are the two back walls. Wall items hang there, and kitchens sit against the x = 8 wall.
- **Wall and floor finish**: one random pick from the theme's slot 7 / slot 8 list, applied to all walls / all floor tiles.
- **Door**: on the **y = 0 wall at x = 5**, i.e. `Cafe_DOOR_Y = 3` tiles in from the x = 8 corner (the code uses width − DOOR_Y − 1).
  - Every layout leaves (5, 0) free on that wall.
  - Layout 1 flanks it with two plants at (4, 0) and (6, 0).
- **Zombie line-up**: before the attack, the player's raid party (all non-chef characters) is spawned **outside**, standing in **idle**.
  - They form one row at map diamond (`SIDEWALK_X − 4 − i`, `SIDEWALK_Y − 5`): the first zombie lines up with the door column, and each next one is one tile further along, parallel to the door wall, about 6 tiles out.
  - The ATTACK button sits at screen (750, 680).

### 2.4 Which layout is used

From `GameStateRaid::init`:
- **Normal rival**: layout 0 or 1, 50/50 (`rand() % (NUM_LAYOUTS − 1)`, with `NUM_LAYOUTS = 3`).
- **Boss café** (the boss flag, i.e. the monster restaurant): **layout 2**.
- **Theme 13** (the super-villain grill): **layout 4**.
- Layout 3 is a near-copy of layout 2. The roster's `forcedLayout` field gives it to the vampire boss café; the Android binary never selects it.

### 2.5 The five layouts

Legend:
- Floor items are drawn as letter + facing arrow: `v` +y, `<` −x, `^` −y, `>` +x.
- Wall items are lower case: on the top line for the y = 0 wall, and after the `|` for the x = 8 wall.
- `.` is empty floor.
- The door is at (5, 0) on the top wall.

Layout 0: 9x8, 33 entries
```
       0  1  2  3  4  5  6  7  8
wall     w  a  w  l     l  w       <- back wall (y=0 edge)
y=0    .  .  .  .  .  . C<  . S< |   
y=1   Hv  . Hv  . Hv  . C<  . C< |   
y=2   Tv  . Tv  . Tv  . C<  . G< |   
y=3    .  .  .  .  .  .  .  . F< |   
y=4   Hv  . Hv  . Hv  . C<  .  . |   
y=5   Tv  . Tv  . Tv  . C<  .  . | a
y=6    .  .  .  .  .  . C< Cv Cv |   
y=7   Pv  .  .  .  .  .  .  . B< |   
```
Layout 1: 9x8, 34 entries
```
       0  1  2  3  4  5  6  7  8
wall                       a       <- back wall (y=0 edge)
y=0   Sv Gv C< Bv Pv  . Pv  . Bv |   
y=1    .  . C<  .  .  .  .  .  . |   
y=2   Cv  . C<  . H> Tv Tv H<  . | w
y=3    .  . C<  . H> Tv Tv H<  . |   
y=4    .  . C<  .  .  .  .  .  . | a
y=5    .  . C<  . H> Tv Tv H<  . |   
y=6    .  . C<  . H> Tv Tv H<  . | w
y=7    .  .  .  .  .  .  .  .  . |   
```
Layout 2: 9x8, 39 entries
```
       0  1  2  3  4  5  6  7  8
wall  l     w           l  w       <- back wall (y=0 edge)
y=0    . Cv Dv Ev  .  .  .  . Ev |   
y=1    . S< Dv  .  .  .  .  .  . |   
y=2    . G< Dv  . H> Tv Tv H<  . | l
y=3    . F< Dv  . H> Tv Tv H<  . | w
y=4    .  .  .  .  .  .  .  .  . | l
y=5    .  . Dv  . H> Tv Tv H<  . |   
y=6    .  . Dv  . H> Tv Tv H<  . |   
y=7   Ev Iv Dv  .  .  .  .  . Pv |   
```
Layout 3: 9x8, 39 entries
```
       0  1  2  3  4  5  6  7  8
wall  a     w           l  w       <- back wall (y=0 edge)
y=0    . Cv Dv Bv  .  .  .  . Ev |   
y=1    . S< Dv  .  .  .  .  .  . |   
y=2    . G< Dv  . H> Tv Tv H<  . | l
y=3    . F< Dv  . H> Tv Tv H<  . | w
y=4    .  .  .  .  .  .  .  .  . | l
y=5    .  . Dv  . H> Tv Tv H<  . |   
y=6    .  . Dv  . H> Tv Tv H<  . |   
y=7   Ev Iv Dv  .  .  .  .  . Pv |   
```
Layout 4: 9x8, 40 entries
```
       0  1  2  3  4  5  6  7  8
wall  a        l  w     w  l       <- back wall (y=0 edge)
y=0    . Cv D< Ev  .  .  .  . Ev |   
y=1    . S< D<  .  .  .  .  .  . |   
y=2    . G< D<  . H> Tv Tv H<  . | w
y=3    . F< D<  . H> Tv Tv H<  . | l
y=4    .  .  .  .  .  .  .  .  . | w
y=5    .  . D<  . H> Tv Tv H<  . |   
y=6    .  . D<  . H> Tv Tv H<  . |   
y=7   Bv Iv D<  .  .  .  .  . Pv |   
```

What each one is:
- **Layout 0, "counter island"** (normal, 33 items):
  - Dining: 6 four-tops in 2 rows of 3. Each is a chair north of a table, at x = 0/2/4 and y = 1–2 and 4–5, with a 1-tile aisle between columns.
  - Counters: an L of 8 counters along x = 6 (y 0–2 and 4–6) and across y = 6, with a gap at (6, 3) as the staff pass-through.
  - Kitchen: tucked behind in x = 7–8, y = 0–5. Stove (8, 0), counter (8, 1), sink (8, 2), fridge (8, 3).
  - Extras: plant (0, 7), box (8, 7).
  - Wall: windows ×3, lamps ×2, art ×1 on the door wall; art ×1 on the side wall.
- **Layout 1, "kitchen in the corner"** (normal, 34 items):
  - Kitchen: across the top-left. Stove (0, 0), sink (1, 0), counter (0, 2).
  - Counters: a wall of 7 counters down x = 2 (y 0–6), facing −x.
  - Dining: 8 two-tops facing each other across pairs of tables, chair–table–table–chair at x 4–7, rows y = 2, 3, 5, 6.
  - Extras: plants either side of the door, boxes at (3, 0) and (8, 0).
  - Wall: windows and art on the x = 8 wall.
- **Layout 2, "boss restaurant"** (39 items):
  - Kitchen: a strip at x = 1 (counter, stove, sink, fridge, y 0–3).
  - Divider: a line of 7 dividers down x = 2 (gap at y = 4) separating the kitchen.
  - Dining: the same 8 two-tops as layout 1.
  - Extras: showpieces in three corners, a floor lamp, a plant.
  - Wall: lamp/window mix on both walls.
- **Layout 3**: layout 2 with art instead of a lamp at the top-left wall slot and a box instead of a showpiece at (3, 0).
- **Layout 4, "villain grill"** (40 items): layout 2 with the dividers turned to face −x, more wall items and a box at (0, 7).

Notes common to all layouts:
- Every chair faces its table: rotation 0 sits north of a table, rotation 3 to its west, rotation 1 to its east.
- There are **no explicit staff, chef, customer or dish positions** in the layout data (see 2.7).

### 2.6 Theme furniture lists (counts and names, reference only)

The number after each code is how many furniture ids the theme can draw from (duplicates are colour variants).

- **Cafe** — **H** 6: Plain chair; **T** 9: Plain table, Plain round table; **S** 1: Plain stove; **C** 2: Plain serving counter, Stainless steel serving counter; **F** 1: Plain fridge; **G** 2: Plain sink, Stainless steel sink; **wall** 6: Plain wall; **floor** 6: Plain tiled floor; **W** 2: Small window, Small window w/plain curtains; **L** 0: —; **A** 0: —; **P** 2: Small potted plant, Small potted plant 2; **B** 2: ATM, Red trash can; **D** 0: —; **I** 4: Standing lamp; **E** 0: —
- **Diner** — **H** 4: Diner chair, Diner stool, Diner chair 2, Diner stool 2; **T** 2: Diner table, Diner table 2; **S** 1: Plain stove; **C** 2: Plain serving counter, Stainless steel serving counter; **F** 1: Plain fridge; **G** 2: Plain sink, Stainless steel sink; **wall** 1: Diner wall; **floor** 6: checkered tile; **W** 1: Large window w/blinds; **L** 1: Diner wall lamp; **A** 3: Zombeer ad/poster, Diner clock, Specials Board; **P** 3: Small potted plant, Small potted plant 2, Large potted plant/tree; **B** 7: Vending machine, Arcade cabnet, Arcade cabnet 2, ATM, Jukebox, Jukebox 2, Red trash can; **D** 0: —; **I** 0: —; **E** 0: —
- **Italian** — **H** 9: Diner chair, Diner stool, Classic wooden chair; **T** 10: Table (red checked table cloth), Plain table, Plain round table; **S** 1: Plain stove; **C** 2: Plain serving counter, Stainless steel serving counter; **F** 1: Plain fridge; **G** 2: Plain sink, Stainless steel sink; **wall** 10: Plain wall, Brick wall; **floor** 2: Hardwood floor; **W** 1: Large window w/plain curtains; **L** 1: Wall lamp; **A** 2: Wine rack, Specials Board; **P** 3: Small potted plant, Small potted plant 2, Large potted plant/tree; **B** 1: ATM; **D** 1: Grape divider; **I** 4: Standing lamp; **E** 0: —
- **Asian** — **H** 6: Sleek chair; **T** 6: Sleek table; **S** 1: Stainless steel stove; **C** 1: Stainless steel serving counter; **F** 1: Stainless steel fridge; **G** 1: Stainless steel sink; **wall** 6: Plain wall; **floor** 6: carpet; **W** 2: Small window, Rounded-corner/steel window; **L** 1: Paper lamp; **A** 2: Chopstick poster, Diner clock; **P** 2: Potted bamboo, Banzai tree (on stand); **B** 3: Arcade cabnet, Arcade cabnet 2, ATM; **D** 0: —; **I** 0: —; **E** 2: Fish tank, Exotic fish tank
- **TexMex** — **H** 6: Chair (generic/classic/country); **T** 5: Table (generic/classic/country); **S** 1: Plain stove; **C** 2: Plain serving counter, Stainless steel serving counter; **F** 1: Plain fridge; **G** 2: Plain sink, Stainless steel sink; **wall** 2: Wood panel wall; **floor** 5: Hardwood floor, Two-tone brown tile; **W** 1: Large window with red/green/white curtains; **L** 1: Wall lamp; **A** 3: Wagon wheel, Steer skull, dartboard; **P** 2: Large potted plant/tree, Potted cactus; **B** 4: ATM, Jukebox, Jukebox 2, Slot machine; **D** 0: —; **I** 0: —; **E** 0: —
- **Pub** — **H** 13: Classic wooden chair, Chair (generic/classic/country); **T** 5: Table (generic/classic/country); **S** 1: Plain stove; **C** 1: Bar serving counter; **F** 1: Plain fridge; **G** 2: Plain sink, Stainless steel sink; **wall** 7: Brick wall, Wood panel wall; **floor** 7: Hardwood floor, carpet; **W** 0: —; **L** 1: Wall lamp; **A** 4: Wine rack, dartboard, Zombeer ad/poster, Specials Board; **P** 2: Small potted plant, Small potted plant 2; **B** 7: Vending machine, Arcade cabnet, Arcade cabnet 2, ATM, Jukebox, Jukebox 2, Slot machine; **D** 0: —; **I** 0: —; **E** 0: —
- **Fancy** — **H** 2: Classic wooden chair, Sleek chair; **T** 1: White tablecloth; **S** 1: Stainless steel stove; **C** 2: Stainless steel serving counter, Marble Serving Counter; **F** 1: Stainless steel fridge; **G** 1: Stainless steel sink; **wall** 8: Plain wall, Wallpaper wall; **floor** 12: carpet, Marble tile; **W** 2: Large window w/plain curtains, Brick-lined window; **L** 2: Wall lamp, Candelabra; **A** 2: Wine rack, Van Gogh's self portrait as zombie; **P** 2: Large potted plant/tree; **B** 1: ATM; **D** 1: Velvet rope divider; **I** 4: Standing lamp; **E** 4: Fish tank, Exotic fish tank, Maitre'd stand/podium, Fountain
- **MadScientist** — **H** 1: Mad Scientist Chair; **T** 1: Mad Scientist Table; **S** 1: Stainless steel stove; **C** 1: Mad Scientist Serving Counter; **F** 1: Stainless steel fridge; **G** 1: Stainless steel sink; **wall** 1: Mad Scientist Wall; **floor** 1: Mad Scientist Floor; **W** 0: —; **L** 1: Candelabra; **A** 3: Mad Scientist Control Panel 1, Mad Scientist Control Panel 3, Mad Scientist Control Panel 2; **P** 0: —; **B** 2: Mad Scientist Cabinet 1, Mad Scientist Cabinet 2; **D** 0: —; **I** 0: —; **E** 0: —
- **Frankenstein** — **H** 1: Orange Chair; **T** 1: Orange Table; **S** 1: BBQ Stove; **C** 1: Orange Serving Counter; **F** 1: Suped Up Fridge; **G** 1: Stainless steel sink; **wall** 1: Stone Wall; **floor** 1: Orange and Black Tile; **W** 1: Wall Sconce; **L** 1: Spider Web Wall; **A** 0: —; **P** 0: —; **B** 0: —; **D** 1: Velvet rope divider; **I** 1: Tiffany Lamp 3; **E** 1: Jack-o-Lantern
- **Evil Leprechaun** — **H** 1: Green Pub Stool; **T** 1: Green Pub Table; **S** 1: Stainless steel stove; **C** 1: Green Pub Counter; **F** 1: Stainless steel fridge; **G** 2: Plain sink, Stainless steel sink; **wall** 1: Pub Wall; **floor** 1: Wood Pub Floor; **W** 1: Pub Window; **L** 2: Wall lamp, Wall Sconce; **A** 5: Coat of Arms, Horse Shoe, Pub Poster, Pub Sign, dartboard; **P** 0: —; **B** 4: Jukebox 2, Slot machine, Pool Table, Pot Of Gold; **D** 1: Green Pub Divider; **I** 3: Tiffany Lamp 1, Tiffany Lamp 2, Tiffany Lamp 3; **E** 1: Pub Bar Cabinet
- **Medieval** — **H** 1: King's Throne; **T** 1: King's Table; **S** 3: Witch potion Stove, Lava Stove, Fiery Dragon Stove; **C** 1: Green Pub Counter; **F** 1: Suped Up Fridge; **G** 1: Stainless steel sink; **wall** 1: Big Stones Wallpaper; **floor** 1: Medieval Tile; **W** 1: Stained Glass Window; **L** 1: Candelabra; **A** 2: Coat of Arms, Sword & Shield; **P** 0: —; **B** 2: Legendary Sword, The Zombie Book; **D** 0: —; **I** 3: Tiffany Lamp 1, Tiffany Lamp 2, Tiffany Lamp 3; **E** 0: —
- **Pirate** — **H** 1: Pirate chair; **T** 1: Pirate table; **S** 1: Steam Powered Stove; **C** 1: Bar serving counter; **F** 1: Steam Powered Fridge; **G** 1: Victorian Sink; **wall** 1: Wood panel wall; **floor** 1: Wood Pub Floor; **W** 1: Ship window; **L** 1: Antique wall lamp; **A** 1: Treasure Map; **P** 1: Parrot on Stand; **B** 2: Gold Cannon, Treasure Chest; **D** 0: —; **I** 1: Parrot on Stand; **E** 2: Gold Cannon, Treasure Chest
- **Vampire** — **H** 1: Fancy Chair; **T** 1: Fancy Table; **S** 1: Suped Up Stove; **C** 1: Stainless steel serving counter; **F** 1: Suped Up Fridge; **G** 1: Stainless steel sink; **wall** 1: Stone Wall; **floor** 1: Mad Scientist Floor; **W** 1: Gothic Arched Window; **L** 1: Candelabra; **A** 1: Portrait of Vlad; **P** 0: —; **B** 1: Holy water fountain; **D** 1: Velvet rope divider; **I** 1: Classic Coffin; **E** 1: Gargoyle
- **SuperHero** — **H** 1: Captain's Chair; **T** 1: Round Holographic Table; **S** 1: Laser Oven; **C** 1: Space Counter; **F** 1: Freeze Dried Fridge; **G** 1: Space Sink; **wall** 1: Wallpaper wall; **floor** 1: Glass Tile (White); **W** 1: Port Window 2; **L** 1: LED Lights; **A** 1: Mad Griller Wanted Poster; **P** 0: —; **B** 1: Super Hero Power Armor; **D** 1: Space Divider _ Grey; **I** 0: —; **E** 2: Meteorite, Hero Research Center

Roster (`enemyCafeData`, reference only):

| id | Name (owner / café) | Boss | Chef character | Staff pool | Icon | Forced layout | Min player level |
|---|---|---|---|---|---|---|---|
| 0 | Cafe | – | Cafe Chef (#109) | 9 generic "Chef" bodies (#55–63) | 2 | – | 1 |
| 1 | Diner | – | Diner Chef (#110) | same | 8 | – | 1 |
| 2 | Italian Eatery | – | Italian Chef (#111) | same | 10 | – | 6 |
| 3 | Asian Restaurant | – | Asian Chef (#112) | same | 12 | – | 9 |
| 4 | Tex Mex | – | Tex Mex Chef (#113) | same | 13 | – | 12 |
| 5 | Pub | – | Pub Chef (#114) | same | 9 | – | 15 |
| 6 | Chez | – | French Chef (#115) | same | 11 | – | 18 |
| 7 | Lab | – | Mad Scientist Chef (#116) | same | 17 | – | 10 |
| 8 | Frankenstein's Restaurant | **yes** | Frankenstein (#127, 1200 HP base) | 4 monster minions (#128–131) | 21 | 2 | 5 |
| 9 | Leprechaun's Clover Field | – | Evil Leprechaun (#138) | generic | 32 | – | 8 |
| 10 | Gourmet Goblin | – | Goblin Chef (#188) | 6 medieval characters (#189–194) | 33 | – | 11 |
| 11 | Deadbeard's X'Spot | – | Chef Deadbeard (#200) | 5 pirates (#195–199) | 34 | – | 12 |
| 12 | Drac's Snack Shack | **yes** | Chef Dracula (#207) | 6 vampire characters (#201–206) | 35 | 3 | 10 |
| 13 | The Grillin Villain | **yes** | #223 (newer than our character table) | Henchman (#214) | 36 | 4 | 14 |

The constants agree with this table:
- `ZombieCafe_RAID_CHEF_INDEX = [109…116, 127, 138, 188, 200, 207, 215]`
- `ZombieCafe_MIN_LEVEL_THEME_AVAILABLE = [1, 1, 6, 9, 12, 15, 18, 10, 99, 8, 11, 12, 10, 10]`
- `BOSS_THEME = 8`
- `BOSS_MINIONS = [128–131]`

### 2.7 Staff, chef, customers, dishes, stats

**Where people go:**
- The layouts hold furniture only.
- At raid start the code:
  - creates the **enemy chef** (who works the stove; the log says "About to init enemy stove");
  - creates `NUM_SERVERS[level]` **servers** from the theme's staff pool;
  - seats `NUM_CUSTOMERS[level]` **diners** on chairs (`Cafe::populateWithCustomers(GameStateRaid*)`);
  - for the boss café, adds the 4 **minions** with the chef's stats × `BOSS_MULTIPLIER`.
- More customers keep arriving during the raid. The interval is 5–20 s (±1 s), with a 33–50 % visit chance per roll (`GameStateRaid_MIN/MAX_CUSTOMER_INTERVAL`, `…VISIT_CHANCE_FP8` 85–128/256). Each walks in after a 1 s ± 0.8 s pause at the door.
- Panicking customers loop the run clip `CUSTOMER_PANIC_LOOPS = 10` times.

**Dishes on the counters:**
- These are not in the layout. Each counter gets `Cafe::getNewRandomFoodStack`: a random unlocked recipe, with the stack size scaled by `RAID_FOOD_COUNT_MULTIPLIER = 0.25`.
- Recipe level is rolled against cumulative chances [15, 35, 65, 95, 100] → player-level −3, −2, −1, ±0, +1.
- Variant is rolled against cumulative [60, 68, 72, 77, 79, 84, 86, 91, 96, 100] over 10 variants: 60 % plain.
- A rare recipe (#55) appears with 2 % chance.
- Zombies steal a dish in 2 s (`StealFoodTask_STEAL_TIME`). Eating a diner gives +5 HP (`KILL_HEALTH_BOOST`), 20 cash and 2 XP.

**Per-level stats.** "Level" is the rival's level. The arrays have 83 entries and plateau after ~30. "Server str/spd" use the same 1–10 scale as character stats. The chef's columns are named `BOSS_*` in the code.

| level | customers | servers | server str | server spd | chef HP | chef str | chef spd | cash | XP | toxin | toxin chance |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 2 | 1 | 1 | 3 | 80 | 1 | 3 | 20 | 2 | 1 | 0.1 |
| 2 | 2 | 1 | 1 | 3 | 100 | 2 | 3 | 25 | 4 | 1 | 0.1 |
| 3 | 3 | 2 | 2 | 3 | 130 | 2 | 4 | 30 | 6 | 1 | 0.1 |
| 4 | 3 | 2 | 2 | 3 | 160 | 3 | 4 | 40 | 8 | 1 | 0.1 |
| 5 | 3 | 2 | 2 | 4 | 190 | 4 | 4 | 50 | 10 | 1 | 0.1 |
| 6 | 4 | 3 | 3 | 4 | 210 | 3 | 5 | 60 | 12 | 1 | 0.09 |
| 7 | 4 | 3 | 3 | 4 | 250 | 4 | 5 | 70 | 14 | 1 | 0.08 |
| 8 | 4 | 3 | 3 | 4 | 270 | 5 | 5 | 80 | 16 | 1 | 0.06 |
| 9 | 4 | 3 | 3 | 4 | 300 | 3 | 7 | 90 | 18 | 1 | 0.05 |
| 10 | 4 | 3 | 3 | 5 | 330 | 3 | 8 | 100 | 20 | 1 | 0.05 |
| 11 | 4 | 3 | 3 | 5 | 360 | 3 | 9 | 110 | 22 | 1 | 0.05 |
| 12 | 5 | 4 | 4 | 5 | 390 | 5 | 5 | 120 | 24 | 1 | 0.05 |
| 13 | 5 | 4 | 4 | 5 | 410 | 6 | 5 | 130 | 26 | 1 | 0.05 |
| 14 | 5 | 4 | 4 | 5 | 440 | 6 | 6 | 140 | 28 | 1 | 0.05 |
| 15 | 5 | 4 | 4 | 6 | 470 | 7 | 1 | 150 | 30 | 2 | 0.03 |
| 16 | 5 | 4 | 4 | 6 | 500 | 8 | 1 | 160 | 32 | 2 | 0.03 |
| 17 | 5 | 4 | 4 | 6 | 520 | 9 | 1 | 170 | 34 | 2 | 0.03 |
| 18 | 6 | 5 | 5 | 6 | 540 | 5 | 7 | 180 | 36 | 2 | 0.03 |
| 19 | 6 | 5 | 5 | 7 | 560 | 6 | 7 | 190 | 38 | 2 | 0.03 |
| 20 | 6 | 5 | 5 | 7 | 580 | 7 | 7 | 200 | 40 | 2 | 0.03 |
| 21 | 6 | 5 | 5 | 7 | 600 | 7 | 7 | 210 | 42 | 2 | 0.03 |
| 22 | 6 | 5 | 5 | 7 | 630 | 7 | 7 | 220 | 44 | 2 | 0.03 |
| 23 | 6 | 5 | 5 | 7 | 660 | 7 | 7 | 230 | 46 | 2 | 0.03 |
| 24 | 7 | 6 | 6 | 7 | 690 | 7 | 7 | 240 | 48 | 2 | 0.03 |
| 25 | 7 | 6 | 6 | 7 | 720 | 7 | 7 | 250 | 50 | 2 | 0.03 |
| 26 | 7 | 7 | 7 | 8 | 750 | 8 | 8 | 260 | 52 | 3 | 0.03 |
| 27 | 7 | 7 | 7 | 8 | 750 | 8 | 8 | 270 | 54 | 3 | 0.03 |
| 28 | 7 | 7 | 7 | 8 | 750 | 8 | 8 | 280 | 56 | 3 | 0.03 |
| 29 | 7 | 7 | 7 | 8 | 750 | 8 | 8 | 290 | 58 | 3 | 0.03 |
| 30 | 7 | 7 | 7 | 8 | 750 | 8 | 8 | 300 | 60 | 3 | 0.03 |
| 35 | 8 | 8 | 7 | 8 | 755 | 8 | 8 | 350 | 70 | 4 | 0.04 |
| 40 | 8 | 8 | 7 | 8 | 755 | 8 | 8 | 400 | 80 | 4 | 0.04 |
| 50 | 9 | 9 | 7 | 8 | 755 | 8 | 8 | 500 | 100 | 5 | 0.05 |
| 60 | 9 | 9 | 7 | 8 | 760 | 8 | 8 | 600 | 120 | 6 | 0.07 |
| 70 | 9 | 9 | 7 | 8 | 760 | 8 | 8 | 700 | 140 | 6 | 0.08 |
| 83 | 9 | 9 | 7 | 8 | 770 | 8 | 8 | 830 | 166 | 6 | 0.09 |

**Rewards for beating the chef:**
- Cash and XP grow linearly (level × 10 cash, level × 2 XP).
- The toxin reward is the "toxin" column, granted with the given chance.
- The reward screen appears after `REWARD_DELAY_DURATION = 5 s`.

**Rival timing:**
- Reopen timers after a win are 4 / 8 / 12 / 18 h (`enemyReopenDurations`).
- The boss café cooldown is 4 h.
- Boss appearance chance by player level: 0 % up to level 4, then 25, 40, 45, 50, 60, 70 … reaching 100 % at level 23.
- The boss multiplier is 1.0 at level 5, rising +0.1 per level.
- The map shows 3 enemies at a time (`GameStateMap_NUM_ENEMIES`).
- An unattended rival lowers your rating by 0.1 (`ENEMY_RATING_MODIFIER`).

### 2.8 What Zombs BBQ should do (rival joints)

1. **One fixed room size (9×8)** for rivals, with **hand-authored furniture layouts filled by theme lists**. Write our own 3–5 layouts in the same spirit:
   - a dining block of 6–8 small tables;
   - a counter line with **one pass-through gap**;
   - a 4-tile kitchen (stove, prep counter, sink, fridge) **behind** the counters against a back wall;
   - wall items spaced along both back walls, the door slot kept free, plants/boxes in corners.
2. **Store layouts as letter + facing + x,y records**, and themes as per-letter id lists. Pick a random member per record, so the same layout looks different every visit.
3. **Two layouts for normal rivals (50/50)** and a dedicated layout for each boss joint.
4. **Door on the back-left wall, 3 tiles in from the right corner.** Line the player's raid crew up outside in a single row ~6 tiles out, idling, before the attack.
5. **Don't bake staff or diners into the layout.** Spawn the chef at the stove, servers by count-per-level, and diners on chairs, then trickle new diners in every 5–20 s.
6. Use the **per-level stat curves** above as the starting tuning for rival chefs and servers, scaled to our own HP/damage units. Note the plateau after level ~26.
7. **Roll dishes on rival counters** from the player's unlocked menu, mostly at or one level below the player's level, at a quarter of normal stack size.

---

## 3. Other behaviour numbers (from `constants.bin.mid` and code)

### 3.1 Movement

| Fact | Value |
|---|---|
| Speed multiplier | `2.0 + 2.0 × speed / 10` (speed stat 1–10 → 2.2…4.0) |
| ms per path-cost unit | `5.8 / 0.365 / multiplier`, × **1.2 for zombies** (`ZOMBIE_SLOWDOWN_MULTIPLIER`) |
| Path cost | Euclidean distance in px between neighbouring tile centres; ≈ 94 px per tile step (80×50 px offsets) |
| Hurry factor | Running or "hurry" moves take **0.6×** the time per cost unit |

That gives these walking speeds:

| Speed stat | Human (tiles/s) | Zombie (tiles/s) | Walk cycle |
|---|---|---|---|
| 1 | 1.47 | 1.22 | 0.74 s |
| 4 (typical customer) | 1.87 | 1.56 | 0.58 s |
| 5 (chefs) | 2.00 | 1.67 | 0.54 s |
| 7 | 2.27 | 1.89 | 0.48 s |
| 10 | 2.67 | 2.22 | 0.41 s |

Running adds ×1.67 on top of these. One walk cycle (two steps) covers ~1.1 tiles, which matches the foot sweep of ~120 su (44 px) per step.

### 3.2 Café flow

| Constant | Value |
|---|---|
| Customer arrival interval | 4.5–18 s (MIN/MAX, presumably scaled by popularity), ±1 s; visit chance 211–238/256 (82–93 %) |
| Door pause | 1 s ± 0.8 s |
| Waiting for food before leaving | **60 s** (`EatTask_WAIT_FOR_FOOD_TIME`) |
| Pause holding food | 2 s |
| **Eating time** | **30 s** (10 s during the tutorial) |
| Serve hand-off | 0.35 s (`ServeTask_SERVE_TIME`) |
| Average serving time used for rating | 30 s |
| Rating | increment 0.005 and decrement 0.006 per rating event; −0.1 when a zombie attacks a customer; one increase is capped at +0.4 (exact triggers not traced) |
| Table/server modifier | 0.12 |
| Popularity | Starts at 0.185 |

### 3.3 Staff and zombies

| Constant | Value |
|---|---|
| Energy drain | 5e-5 per ms (3 energy per minute of work) |
| Zombie energy after infecting | 20 |
| Feast | `FeastTask_MAX_FEAST_TIME` = 500 (ms per bite, likely); `FLESH_ENERGY_BONUS` = 2 |
| Zombie snack attack on customers | `ZOMBIE_ATTACK_INTERVAL` 60 s with a 5 s warning; `ATTACK_PROBABILITY_PER_MINUTE` 0.019; `ZOMBIE_IDLE_TIME` 60 s |
| Daydream | 10 s, roughly every 120 s ± 30 s |
| Scream interval (panicking human) | 2 s |
| Rest "Zzz" bubble | Every 20 s |
| Hit interval in a fight | 0.9 s; an attack task runs at most 1 s per swing |
| **Reanimation** | **8 h** (`Character_REANIMATION_DURATION` = 28,800,000 ms) |
| Bone pile | Stays 10 s, then fades over 3 s |
| Tombstone power-up | 5 s, ×2 strength or +100 HP; 5 uses (7 at tombstone level 2); recharge costs 2 toxin |
| Staff levels | Cap 35, XP thresholds 100, 300, 600, 1200, 2400, … 70,334; zombie energy ×1.03 per level |

### 3.4 Economy and camera (incidental)

- Starting cash 5000, toxin 5. One toxin = 2000 cash. Items sell back at 50 %.
- Café zoom: 0.4–1.4, initial 0.9. Raid zoom: 0.18–1.5, initial 1.0.
- Rival raid rating ×0.0067, food ×2 and defenders ×0.1 when raiding a *friend's* café (`GameStateFriendCafe_RAID_*`).
- The revival's server serves a **random other player's save** as a "friend" café to raid.
- Player zombie cap by level: 1, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, then 10 from level 17, 11 from 27, 12 from 36, 13 from 46, 14 from 56 (max).

### 3.5 What Zombs BBQ should do (behaviour)

1. Use the **speed formula** as-is for feel: ~1.9 tiles/s for an average human, zombies 20 % slower, running 1.67× faster. Couple walk-cycle playback to it so feet don't skate.
2. Keep the **30 s eat / 60 s patience** pair and the 4.5–18 s arrival window as the default pacing; compress them only for the tutorial (10 s eat).
3. Keep **reanimation at hours, not minutes**: the original's 8 h. Our faster pacing can shorten it, but it should still be a "come back later" timer.
4. Rival raids: 5–20 s customer trickle, 0.35 s serve, 2 s steal, +5 HP per kill.

---

## 4. What could not be decoded, and caveats

- **Raid staff/chef start tiles**: positions are computed in the 8.5 KB `GameStateRaid::init`. We confirmed the counts, stats and the zombie line-up but did not fully trace where each server first stands; the code suggests the chef starts at the stove.
- **Door placement**: derived from `createForNewRaid` (width − DOOR_Y − 1 = 5) plus the fact that every layout leaves (5, 0) free. The diamond↔map mapping was not traced end to end.
- **`enemyItemData` tiers**: the 20 × 16 table format is clear, but the tier field it is compared against (a furniture byte at runtime offset 0x28) was not matched to a named JSON field.
- **`enemyCafeData`**: the schema is inferred and fits all 775 bytes exactly. The "icon" field's meaning is a guess, and the file is not loaded by this Android build.
- **Draw-order times**: decoded, but the engine never applies them (see §1.1).
- **A few 1-byte constants** were not captured by the emulator trace: `Cafe_AVERAGE_CUSTOMERS_LOW_POPULARITY`, `ZombieCafe_MAX_ENEMY_CAFES`, `ZombieCafe_ENEMY_BOSS_CHARACTER`.
- **Path-cost-per-tile (94 px)** assumes nodes at tile centres 80×50 px apart. The engine computes it from tile geometry at runtime; we did not run that.
- The revival README's article (`airyz.xyz`) could not be fetched (DNS failure from this environment).
