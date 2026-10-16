# 09 — Art v3: Style Guide and Contract

v3 replaces the bright, thick-outlined v2 art with the original's grimy adult-cartoon look ([08 — Deep Dive](08-original-deep-dive.md) §1). All code lives in `game/src/art3/`.

**Everything is drawn from scratch.** You may *look at* reference images of the original to calibrate tone. They are:
- `/tmp/claude-0/-home-user-ZombsBBQ/d76bd4d3-6b27-51fb-957e-0cadf5ff5195/scratchpad/zc/cafe_close.png`, `chars_a.png`, `furniture_sheet.png`, `real_cafe.jpg`;
- the original sprites under `/home/user/airyzz/zombie-cafe-revival/src/assets/images`.

Never trace them, copy shapes, or reuse names or text from them.

## 1. Style rules

**Palette.** Muted and dirty; mid-value with low saturation (mean about 0.3).
- Strong colour only in small accents: the neon-green toxin and logo, yellow stars, red alerts.
- Palette constants: `PAL` in `src/art3/kit.ts`.
- Human skin is khaki-grey, not pink: base `#B3B294`, shadow `#968E6F`, deep `#655534`.
- Zombie skin is mixed greens: base `#88BB44`, alt `#55AA66`, shadow `#427E40`, deep `#254424`.
- Zombie eyes are yellow `#DECC54` **with no pupils**.
- Clothes are muted: charcoal `#3A3833`, olive drab `#55553F`, khaki `#A89C74`, dirty white `#DAD6C8`, oxblood `#691122`, slate blue `#2C6985`.

**Line.** Warm near-black `INK` (`#16120C`).
- Props use `LW` = 1.25 world units.
- Characters use about 1.1–1.4.
- Interior detail lines are 0.5–0.9.
- Never use v2's 2.4–4 unit outlines.

**Shading and texture.**
- Two-tone cel shading: base, plus a shadow tone on the right and lower faces (light comes from the upper left).
- Add soft gradients for volume.
- Every surface needs texture: wood grain, metal sheen streaks, speckle, scratches, grime.
- Use `blob`, `speckle` and `crack` from the kit. Things look *used*.

**Humour.** Gross, deadpan and adult (stains, flies, bite marks, duct tape, mismatched parts), never cute or round. Faces are ugly and sardonic.

## 2. Geometry (from `kit.ts`)
- **Tile:** `TILE_W` 96 × `TILE_H` 60 (1.6 : 1). `HW` 48, `HH` 30.
- **Projection:** `screen = ((gx − gy)·48, (gx + gy)·30)`.
- **Wall height:** `WALL_H` 176.
- **Character height:** `CHAR_H` about 100. Characters are about 2.2 heads tall.
- **Sizing guide:**
  - Stove and counter tops sit at z ≈ 34–38.
  - Table tops are at z ≈ 30.
  - Chair seats are at z ≈ 18 and chair backs top out at ≈ 46.
  - Fridges are ≈ 84 tall.
  - Arcade cabinets are ≈ 90 tall.

**Frames.**
- **1×1 floor objects:** use `objAsset(key, h, (d, t) => …)`.
  - Width is `OBJ_W` (104). The anchor is the tile centre.
  - `t` is the tile-local `Iso`: i and j run −0.5…0.5, and z goes up.
- **Facing.** Draw every directional item **facing `sw`** (its front toward the screen lower-left). The scene mirrors it for `se`.
  - **Chairs** also need a `ne` drawing (front away from the camera, backrest toward it). The scene mirrors that for `nw`.
  - Each `ne` chair needs a separate **`_back` overlay** holding only the backrest and its uprights. The scene draws it *over* the sitter.
- **Wall items:** use `wallAsset(key, d => …)` with `wallPt` / `wallQuad`. Provide `_l` and `_r` keys; `mirrored()` turns one into the other when the art is symmetric.
- **Dish plates:** `dish_<id>` is 36 × 26, anchor (0.5, 0.62), the plate centre.

## 3. Ownership and keys

Each module exports `build…(): ArtAsset[]` plus any META, and has a test `tests/art3-<module>.test.ts` checking:
- every listed key exists;
- keys are unique;
- SVGs are well-formed;
- the viewBox matches w/h;
- ids are unique.

### P1 — kitchen + furniture (`kitchen.ts`, `furniture.ts`)

**Stoves** (1×1, facing sw, the cook stands on the sw tile):
- `stove_dirty`: white enamel, rust, grime smears, a dented pot, one burner flickering.
- `stove_plain`
- `stove_steel`
- `stove_super`: a souped-up hot-rod stove with chrome pipes.
- `grill`: BBQ kettle/cart grill.
- `smoker`: barrel smoker with a chimney.
- `fryer`: deep fryer with two baskets.
- Overlays (anchor (0.5, 1), drawn at the stove top): `fx_steam_1..3` (steam puffs), `grill_flames` (flames over the grate), `fryer_bubbles`, `pot_burnt` (a charred pot with smoke).

**Counters:** `counter_plain` (scuffed laminate), `counter_steel`, `counter_bar` (dark wood bar top).

**Sinks / trash:**
- `sink_dirty`: a stained basin with a dripping tap and dirty plates piled in it.
- `sink_plain`, `sink_steel`
- `trash_red`, `trash_green`: wheelie-bin style with a lid.

**Fridges:** `fridge_dirty` (rust, a "DON'T EAT STAFF" note, a slime handprint), `fridge_plain`, `fridge_steel`. All face sw.

**Keg:** `keg_toxic`: a leaky green toxic barrel with a biohazard mark and a puddle.

**Tables** (1×1, one seat, symmetric so no facing):
- `table_plain_<tint>` for each tint in white, cream, sage, slate, oxblood, charcoal. Simple square tables in the tint, with a scratched top.
- `table_diner`: chrome-edged, red speckled top.
- `table_wood`: a rustic plank table.
- `table_barrel`: a barrel table.
- `table_coffin`: a coffin on trestles.

**Chairs** (four facings via two drawings plus mirrors):
- `chair_plain_<tint>_sw`, `chair_plain_<tint>_ne`, `chair_plain_<tint>_ne_back`
- `chair_diner_sw/_ne/_ne_back`: red vinyl, chrome legs.
- `chair_wood_sw/_ne/_ne_back`: ladder-back.
- `chair_barrel_sw/_ne/_ne_back`: barrel stool with a low back.
- `chair_bone_sw/_ne/_ne_back`: a bone throne.

**Dividers** (1×1 low partition about 64 tall, running along the j axis through the tile centre; mirrored for the other axis): `divider_plain` (painted panel), `divider_brick`, `divider_wood`.

**Export `KITCHEN_META` / `FURN_META`:**
- `stoveTopZ[key]`, `counterTopZ[key]`, `sinkTopZ[key]`
- `tableTopZ[key]`
- `seatZ[family]`, the seat height
- `seatOffset`: where a sitter's feet/root go relative to the chair tile centre for the `sw` and `ne` drawings, in screen units, `{ dx, dy }`
- `plateOffset[key]`: where the plate sits relative to the table tile centre, `{ dx, dy }`, toward the chair side is fine; one value per table.

### P2 — decor, wall items, money-makers, outdoor (`decor.ts`, `wallitems.ts`, `special.ts`, `outdoor.ts`)

**Floor decor** (1×1, facing sw where relevant):
- `plant_dead`: wilted, in a cracked red pot.
- `plant_potted`, `plant_tree`: a big potted tree.
- `cactus`
- `tombstone_deco_1`, `tombstone_deco_2`, `tombstone_deco_3`
- `gnome_zombie`, `flamingo_zombie`, `skeleton_statue`
- `barrel_stack`, `hay_bale`, `pumpkin_pile`, `coffin_upright`, `slime_fountain`
- `lamp_floor`
- `aquarium`: murky water with a zombie fish.
- `cauldron`: bubbling green.

**Wall items** (`_l` and `_r` each):
- `sign_neon`: a "ZOMBS BBQ" neon tube sign.
- `clock`: cracked, with a bone hand.
- `bottle_shelf`, `license_plates`, `antlers`, `dartboard`, `wall_guitar`
- `poster_bmovie`
- `poster_wanted`: "WANTED: BRAINS".
- `neon_pig`
- `skull_longhorn`
- `menu_board`: a chalkboard with scrawled specials.
- `tv_wall`: an old CRT on a bracket showing static.
- `painting_zombie`: a framed portrait of a zombie aristocrat.

**Money-makers** (1×1, facing sw):
- `vending`: a snack machine with a severed hand stuck in the flap.
- `atm`
- `jukebox`
- `arcade`: "ZOMBIE PANIC".
- `slot_machine`, `pinball`, `phonebooth`, `comic_rack`, `foosball`

**Outdoor** (1×1 unless noted, sits on grass or sidewalk):
- `tombstone_str`: red-tinted, glowing cracks, with a fist emblem.
- `tombstone_hp`: green-tinted, with a heart emblem.
- `pethouse_pug`, `pethouse_kennel`
- Street scenery: `street_lamp` (tall, about 190; anchor at the base), `hydrant`, `mailbox`, `bus_bench`, `newsbox`, `street_trash`, `dead_tree`, `bush_1`, `bush_2`, `traffic_cone`.
- `car_wreck`: 2×1, lying along i. Anchor at the centre of its first tile, with the footprint covering (0,0) and (1,0). Rusted, flat tyres, a windshield smashed from the inside.
- `sign_pole`: a tall roadside "ZOMBS BBQ" pole sign about 210 tall, rusty, with a few bulbs out.

### P3 — dishes and in-world FX (`dishes.ts`, `fx.ts`)

**Dishes:** `dish_<id>` for ids:
- basic: `sliders`, `hobodog`, `gumbo`, `tacos`, `lasagut`, `broth`, `meatloaf`, `goulash`
- grill: `burger`, `wings`, `kebab`, `smash`, `chili`, `salad`
- smoker: `pork`, `ribs`, `brisket`, `foie`
- fryer: `rings`, `nuggets`, `fries`, `chicken`

Each is a chipped plate seen at the iso angle with appetising-but-gross food: eyeballs, fingers, slime garnish.

**Plates:** `plate_dirty` (a smeared empty plate with a bone and crumbs) and `plate_stack` (a stack of dirty plates being carried).

**FX** (anchor (0.5, 1), about 26 × 26, floated over heads or items):
- `fx_cash`: a green "$" with a dark outline.
- `fx_full`: a yellow "!" in a burst.
- `bubble_think`: a thought cloud, about 34 × 30; the scene puts a dish inside.
- `face_happy`: a yellow face, grinning.
- `face_angry`: a blue face, frowning.
- `face_sleep`: "Zzz".
- `fx_skull`, `fx_sweat`, `fx_heart`, `fx_hit`: a "POW" burst, muted.
- `fx_lock`, `fx_star`
- `fx_stink`: green stink lines.
- `fx_daydream`: a cloud with a brain in it.

### C1 — joint characters (`chars/*.ts`, exporting `buildChar3(id)` and `CHAR3_IDS`)

Same rig contract as `src/art/types.ts` `CharArt`: biped `parts`, `backParts`, and `faces`.
- Faces now include **`angry`** (an unhappy customer) and **`eat`** (mid-chew, cheeks full) for humans, alongside scream, happy and shock.
- Zombies have chomp, sleep and dazed.

Ids are the existing 20 customer types plus four common walk-ins: `joe`, `jane`, `senior`, `hipster`. Each has a `<id>_z` zombie form. Add `you` (the Patient-Zero owner in a stained apron, who looks human) and `gus` (the zombie union rep in a chef's toque).

Look:
- big heads (about 45% of height), about 100 tall;
- adult, ugly, sardonic faces with eye bags, stubble and missing teeth;
- khaki skin.

Zombies keep the outfit, but it is torn and stained, with green skin, yellow pupil-less eyes, receding hair showing green scalp, and stitches.

### U1 — UI (`ui3.ts`)

- **HUD icons**, 64 × 64, muted and detailed: the same key list as v2 `ui_*`, plus `ui_open` and `ui_closed`.
- **Panel and texture art** for CSS backgrounds:
  - `tex_awning`: about 512 × 64 maroon `#6D1727` / dusty rose `#7E454E` stripes with olive stains and a torn scalloped edge.
  - `tex_chalk`: chalkboard with a wood frame, about 256 × 160, nine-slice friendly.
  - `tex_paper`: yellow legal pad with a red pushpin.
  - `tex_parchment`: torn, stained paper.
  - `btn_olive` and `btn_red`: slanted sticker buttons, about 160 × 48.
  - `tex_brick`: a spot-lit menu backdrop.
