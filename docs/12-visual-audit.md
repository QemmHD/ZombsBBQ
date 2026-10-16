# 12 — Visual audit (v3)

Read-only review of every screenshot (playthrough, gallery, device sizes), set against the original's look. Items already in doc 11 are left out. Screenshot coordinates are in the 2000×924 display frame. Sizes: S/M/L.

**Overall:** the art itself (furniture, dishes, raid props, map, characters) is mostly on-style. The biggest wins are framing, text and HUD readability, and screen chrome (P0 1–8).

## P0: visible on almost every screen

1. **Camera framing.** The back corner of the café sits under the awning: the fridge top, the window, "dish done" bursts and "+XP" pops draw behind it.
   - Fix: centre the camera lower (`JointScene.ts` `cam.centerOn(c.x, c.y - WALL_H*0.32)`) and clamp scrolling so the back-wall top stays below the awning. (S)
2. **Gus's tip pad.** The red margin rule runs through the text.
   - Fix: `.hint .bubble` padding-left to about 9% of the pad width, or move the rule left in `tex_paper`. (S)
3. **Stat chips are invisible on cream rows.** `.chip` uses white text on cream in the crew list and squad cards.
   - Fix: add a paper variant (ink text, dark translucent fill). (S)
4. **Raid floating text piles up.** SCRATCH!/CHOMP!/-2/AAAH!/ZOMBIES! stack on one spot, and "$" sprites cover the letters.
   - Fix:
     - throttle to 1 label per unit per 0.6 s;
     - combine damage into one ticking number;
     - make SCRATCH a hit-spark sprite instead of text;
     - minimum 16 px;
     - give each unit its own stacking slots. (M)
5. **The raid camera is too far out.** Characters are about 1/10 of screen height; the joint and the original use about 1/6.
   - Fix: raise `baseZoom` to match the joint scale, and make the action cam zoom at least 1.4×. (S)
6. **The left HUD block is too big.** A 2×3 icon grid with label slabs covers about 22% of the width (28% on the SE).
   - Fix: switch to the original's layout:
     - one row of 4 icons (Shop, Goals, Map, Cookbook);
     - the crew head and count, plus the storage crate, below that row;
     - icons about 52 pt, without label slabs;
     - Decor moves into the shop. (M)
7. **Floating text is blurry and in the wrong font.** Arial Black is scaled from 0.4 and not rendered at DPR × zoom.
   - Fix:
     - use the HUD font;
     - render at TEX_S × zoom × DPR;
     - 2 px stroke;
     - stack labels upwards while they're still alive. (S)
8. **No fonts are bundled.** Arial Black and Trebuchet aren't on iOS.
   - Fix:
     - inline OFL fonts in the single-file build: a chunky display face (Lilita One / Luckiest Guy) and a body face (Nunito);
     - optionally a chalk face;
     - use them in both CSS and Phaser. (M)

## P1: assets, layering, screens

9. **Grass** repeats in polka-dot blotches and the tile seams show.
   - Fix: smaller, low-contrast noise seeded from world coordinates, more variants, flips. (S)
10. **Sidewalk slabs** all have the same check-mark crack.
    - Fix: crack about 1 slab in 4, random angle and length, more variants. (S)
11. **Floor tiles** repeat identical tick marks and are the brightest surface on screen.
    - Fix:
      - world-seeded chips;
      - darken the dirty tile 6–8% toward warm grey;
      - more grime decals (smears, rat, bug). (S)
12. **The raid ground ends in an olive void** at the corners.
    - Fix: tile the ground past the camera view, or clamp the camera. (S)
13. **A scenery sign is cut off at the right screen edge** under the HUD column.
    - Fix: move it one tile out, and keep scenery out of the HUD gutters. (S)
14. **The same "ZOMBS BBQ 2 BLOCKS" billboard and street props appear at home and at every rival.**
    - Fix: a different ad at home, and themed street props per rival. (S)
15. **All rival cafés share one layout** apart from finishes.
    - Fix:
      - per-theme layouts and 2–3 signature decor pieces each;
      - Snob: booths and a piano;
      - Chuck: a bar and hay;
      - Crunch: a fryer row and a bucket sign;
      - Vera: planters and a salad bar. (L)
16. **Rival signs are clipped mid-word** ("CHU/WAG", "SN…").
    - Fix: fit the text to the sign, or use a 2-unit sign. (S)
17. **The Le Snob checkerboard is pure black and white.**
    - Fix: bone #D8D2BE with charcoal #3A3833, plus grime. (S)
18. **Back-facing heads read as hair mops** (YOU and the cooks at the stove).
    - Fix: end the hair at about 70% of the head height; show the nape, neck skin and one ear. (M)
19. **The zombie scalp patch looks like a leaf** (it has a midrib).
    - Fix: irregular bare-skin holes with a few wisps of hair. (S)
20. **Selection tints the whole sprite yellow.**
    - Fix: no tint; a pulsing ground ellipse and an outline, plus a footprint diamond for furniture. (M)
21. **The raid hit flash** paints the whole puppet salmon.
    - Fix:
      - a 60 ms white additive flash, a squash and a 2 px knockback;
      - make sure hats stay on during the hit. (S)
22. **The resting zombie lies indoors under a table** while the card says it's on the sidewalk.
    - Fix: walk out first, and never draw a lying body on a furniture tile. (S)
23. **Lying bodies cut through walls** (the nap spot at the wall end, KO'd units in the doorway).
    - Fix: choose a tile whose whole 2-tile lying footprint is free and on one side of the wall. (S)
24. **The stove progress ring** reads as a black ball.
    - Fix: a cream track with a gold arc and an ink outline; hide it while the card is open. (S)
25. **Every meal leaves an emoji smiley, a "$" and "+$N" stacked up**, and the smiley is the most kiddy element.
    - Fix: a muted sardonic smirk, or drop it; merge the "+$N" into the "$"; one popup per customer. (S)
26. **The counter shows one tiny plate whatever the count**, and the ×N badge is tiny.
    - Fix: 1–4 stacked plates by count; a cream pill badge at 11 pt or more; an empty plate when there's nothing. (M)
27. **The wall slime drip looks like a comb.**
    - Fix: irregular runnels with a blob where they start. (S)
28. **Splatter is bright red** (it reads as blood; doc 03 says "goo, not gore").
    - Fix: maroon-brown #5C2A22 at 60%, mixed with olive; green goo for the skeleton puddle. (S)
29. **Empty and earned stars are ambiguous** (white looks earned).
    - Fix: gold = earned, dark outline = empty, purple = bonus; the same in the HUD and the modal. (S)
30. **XP text** can't be read over the pale fill.
    - Fix: an ink stroke on the text and a darker fill (#3E6F86). (S)
31. **OPEN/CLOSED appears twice** (the hanging sign plus the slab under it).
    - Fix: drop the slab and enlarge the sign. (S)
32. **The awning** has empty stripes on the right and a low-contrast gear.
    - Fix: a ZB monogram badge that doubles as the settings button. (S)
33. **Every panel is the same chalkboard.**
    - Fix: varied materials:
      - a legal pad for Goals, tips and level-up;
      - a ring-bound book for the Cookbook and Zombiepedia;
      - an enamel interior with shelves for the Fridge;
      - torn paper for results. (M)
34. **Buttons are lime and rectangular.** Use the olive and red slanted stickers (`btn_olive`/`btn_red`, −4° skew, caps), and the same for the edit-bar tiles. (M)
35. **The close button** looks like a desktop window control.
    - Fix: a red sticker with a cream X. (S)
36. **Infect card:**
    - the close button overlaps the zombie preview;
    - the portrait sits on bright lime;
    - the stat chips wrap.
    - Fix all three. (S)
37. **Level-up and victory sunbursts are clipped to a rectangle**, and the level-up uses a sepia scrim.
    - Fix: radial-mask the rays and slowly rotate them; use the standard scrim; add an "Unlocked:" header. (S)
38. **Raid results are plain bars.**
    - Fix: icon tiles with count-ups, a caption explaining the stars, and the squad heads cheering. (M)
39. **Shop cards:** small thumbnails, and prices that don't line up when names wrap.
    - Fix: thumbnails at about 85% of the art box, a fixed 2-line name block, the price pinned to the bottom. (S)
40. **Wallpaper swatches are slivers**, and the tab strip overflows on the SE.
    - Fix: an iso-corner thumbnail; icon-only tabs or a scroll hint. (S)
41. **Decorating feedback:** no footprint diamond, a faint selection, no grid, and the wall ghost can be off-screen.
    - Fix: a green or red diamond, pulsing selection, a faint grid in edit mode, and pan to the wall ghost. (M)
42. **Crew list:** tall rows, small heads, and bars without numbers.
    - Fix: 96 px rows, 88 px heads, "72/100" on the bar, status and level chips. (S)
43. **Zombiepedia:** small heads, a generic locked blob, and names that don't line up.
    - Fix: heads 120 px or larger (human and zombie), real-character ink silhouettes with a "?" stamp, a fixed header. (S)
44. **Cookbook and dish picker:** price pills of different widths, 60 px dish art, and locked rows dimmed so much they can't be read.
    - Fix: fixed-width pills, 96 px art, a lock stamp, and text at 0.7 alpha. (S)
45. **Rival card and squad picker:** stark white cards, HP bars misaligned by two-line names, and unclear "Summon ×0" copy.
    - Fix: cream paper cards, an olive "selected" stamp, a fixed name block, clearer copy. (S)
46. **Raid HUD:** white tombstone and revive buttons, a squad column that overflows with 6+ zombies, and a hint that wraps badly.
    - Fix: sticker tiles; 2 columns or a scroll fade; reword the hint. (S)

## P2: polish

47. **Goals:**
    - completed rows are off-palette mint;
    - the copy says "0 goals done" while 2 are ready to claim.
48. **Fridge:**
    - show the 4×3 slot capacity;
    - make Study the secondary button.
49. **The counter card says "1 spots".** Pluralise it.
50. **The storage tab's empty state** needs an illustration and a "Go decorate" button.
51. **Zombie card:** the Fire button sits alone on its own row.
    - Fix: a small red icon next to the name.
52. **Gus's portrait floats** with no frame.
    - Fix: a round badge or Polaroid, with a slight bob.
53. **Map:**
    - lock pills overlap the rival bases;
    - the legend text is about 7 px;
    - locked rivals are in full colour.
    - Fix: compact pills, 11 pt text, dim locked bases.
54. **Rival title banner:** stains run under the letters.
    - Fix: a clean plate behind the text.
55. **Claw gouges** look like pen strokes.
    - Fix: tapered gouges with an edge highlight.
56. **Health bars** float detached above heads.
    - Fix: an ink frame and track, about 6 px above the head; in raids, show them only when hurt or targeted.
57. **Verify:** a card stuck at about 10% opacity in one device shot. Check the fade-in.
58. **Steam** is a 3-frame swap at 5 fps.
    - Fix: tweened drifting puffs.
