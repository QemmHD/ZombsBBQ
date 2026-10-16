/**
 * Static sprites: floor tiles, walls, furniture, dishes and in-world FX icons.
 *
 * ANCHOR CONVENTIONS (ox, oy are fractions of w/h; the anchor is the point you position):
 *
 * - Floor tiles ('floor_a', 'floor_b', 'grass', 'sidewalk', 'road', 'road_line'): exactly TILE_W x TILE_H
 *   diamonds, anchor (0.5, 0.5) = tile center.
 *
 * - 1x1 floor objects (table, benches, counter, grill, smoker, fridge, plant, barrel_keg, tombstone,
 *   neon_post, tree): anchor = the tile center. The object's footprint diamond (TILE_W x TILE_H) is
 *   centred on the anchor, i.e. place the sprite at the tile's screen center. Every such sprite is
 *   w = TILE_W + 8 (4 units of outline margin each side) except 'tree' and 'neon_post' which are wider.
 *   Depth-sort them by the tile's (i + j).
 *
 * - Walls ('wall_l*', 'wall_r*'): SVG is exactly (TILE_W/2) x (WALL_H + TILE_H/2) = 48 x 144, anchor (0.5, 1),
 *   i.e. the bottom-center of the image box.
 *     wall_l = wall on the LEFT back edge of the room (the tile's upper-left edge, from the tile's
 *       left corner up to its top corner). Its face is the parallelogram
 *         (0,24) (48,0) (48,120) (0,144)        [image pixels; top-right is higher]
 *       Bottom edge (0,144)->(48,120) lies on the floor. Place it at
 *         (tileCenterX - TILE_W/4, tileCenterY)  with origin (0.5, 1)
 *       for a tile on the room's left back row: then (0,144) hits the tile's left corner and
 *       (48,120) hits its top corner.
 *     wall_r = wall on the RIGHT back edge (the tile's upper-right edge, from its top corner to its
 *       right corner). Face parallelogram (0,0) (48,24) (48,144) (0,120). Place it at
 *         (tileCenterX + TILE_W/4, tileCenterY)  with origin (0.5, 1).
 *     (Tile center = midpoint of the tile diamond; TILE_W/4 = 24.) Walls draw before (behind) anything
 *     standing on those tiles. Variants: wall_l_window, wall_l_sign, wall_r_door, wall_r_menu.
 *
 * - Dishes ('dish_*'): 32 x 24, anchor = the plate center (0.5, 0.625). Put it on a table top at
 *   (tileCenter.y - PROP_META.tableTopZ).
 *
 * - FX icons ('fx_*'): ~24 x 24, anchor (0.5, 1) = bottom-center (float them above a head).
 *   'grill_fire' is also (0.5, 1): put it on the grill top (y - PROP_META.grillTopZ).
 *
 * The table's long side runs along the j axis (screen down-left/up-right). 'bench_l' sits on the tile
 * up-left of the table (i - 1), 'bench_r' on the tile down-right of it (i + 1). Each bench is shifted
 * a quarter tile toward the table; the seat center is at tile center + PROP_META.bench_l/r (dx, dy),
 * seat top at height PROP_META.seatZ above the floor.
 *
 * MODULES: shared helpers live in propkit.ts (Iso, WallF wall frame, floorProp, dish, frontI/onFace face
 * painters). The rest of the catalog is split by theme/category and merged by buildProps():
 *   propthemes.ts    floor_<t>_a/_b, wall_l_<t>, wall_r_<t>, wall_r_door_<t> for roadhouse / diner / graveyard
 *                    (same geometry and anchors as the shack keys above).
 *   propfurniture.ts table_diner / table_barrel / table_coffin (seat on all 4 sides), chair_<diner|wood|bone>_<dir>,
 *                    fryer, fryer_bubbles, counter_chrome, keep_warm.
 *   propdecor.ts     cactus, hay_bale, lamp_post, gnome_zombie, flamingo_zombie, skeleton_statue, pumpkin_pile,
 *                    coffin_upright, slime_fountain, barrel_stack (1x1 floor objects).
 *   propwall.ts      wall hangings <key>_l / <key>_r: 48x144, anchor (0.5, 1), placed exactly like a wall segment
 *                    and drawn after it; transparent except the hanging itself.
 *   propspecial.ts   atm, vending, jukebox, arcade, pethouse_pug, pethouse_kennel (fronts face +i, like the fridge).
 *   propdishes.ts    dish_rings … dish_foie (32x24 plates), fx_cashbag, fx_goo_splat, fx_heart, fx_lock (anchor .5/1).
 *
 * CHAIRS + 4-SIDED TABLES: `chair_<f>_<dir>` faces `dir` (se = +i, sw = +j, ne = -j, nw = -i). For a table on
 * tile (i, j): chair_se on (i-1, j), chair_nw on (i+1, j), chair_sw on (i, j-1), chair_ne on (i, j+1). Each chair
 * is shifted a quarter tile toward its table; seat center = chair tile center + PROP_META.seat[dir], seat top at
 * PROP_META.chairSeatZ[family] (= seatZ). Dishes go at table tile center - PROP_META.tableTop[tableKey]. For
 * _ne/_nw chairs the backrest is nearer the camera: draw the sitter under (before) the chair sprite.
 *
 * OVERLAYS: 'fryer_bubbles' (0.5, 1) at (tileCenterX, tileCenterY - fryerTopZ); 'keep_warm' (0.5, 1) on a grill at
 * (tileCenterX, tileCenterY - keepWarmZ).
 */
import type { ArtAsset } from './types';
import { TILE_H, TILE_W, WALL_H } from './types';
import { Doc, OUT, PW, S, P, G, capsule, ell, f, hl, hull, poly, rrect } from './svg';
import type { Pt, Tone } from './svg';
import {
  COUNTER_Z, DIAMOND, FRYER_Z, GRILL_Z, HH, HW, Iso, SEAT_Z, TABLE_BARREL_Z, TABLE_COFFIN_Z, TABLE_DINER_Z, TABLE_Z,
  WOOD, WOOD_D, WOOD_DD, WOOD_M, asset, blobs, fly, floorProp, rivet, rnd, speckles, tile, T, dish,
} from './propkit';
import { themeProps } from './propthemes';
import { furnitureProps } from './propfurniture';
import { decorProps } from './propdecor';
import { wallHangingProps } from './propwall';
import { specialProps } from './propspecial';
import { extraDishes, extraFx } from './propdishes';

const Q = TILE_W / 8; // quarter-tile screen offset: 12
const QY = TILE_H / 8; // 6

/** Useful numbers for placing things on/at the props (world units). */
export const PROP_META = {
  /** Height of the bench / chair seat top above the floor (every seat family uses the same height). */
  seatZ: SEAT_Z,
  /** Seat center offset from the bench tile's center. */
  bench_l: { dx: Q, dy: QY },
  bench_r: { dx: -Q, dy: -QY },
  /**
   * Chair seat center offset from the chair tile's center, by the direction the sitter FACES
   * (`chair_<family>_<dir>`): a quarter tile toward the table it faces.
   */
  seat: {
    se: { dx: Q, dy: QY },
    sw: { dx: -Q, dy: QY },
    ne: { dx: Q, dy: -QY },
    nw: { dx: -Q, dy: -QY },
  },
  /** Seat top height per chair family (all equal to seatZ so the sitting pose code is shared). */
  chairSeatZ: { chair_diner: SEAT_Z, chair_wood: SEAT_Z, chair_bone: SEAT_Z },
  /** Table top height above the floor for the original picnic table (put dishes at tileCenterY - tableTopZ). */
  tableTopZ: TABLE_Z,
  /** Table top height per table key. */
  tableTop: { table: TABLE_Z, table_diner: TABLE_DINER_Z, table_barrel: TABLE_BARREL_Z, table_coffin: TABLE_COFFIN_Z },
  counterTopZ: COUNTER_Z,
  /** Counter top height per counter key. */
  counterTop: { counter: COUNTER_Z, counter_chrome: COUNTER_Z },
  grillTopZ: GRILL_Z,
  /** Oil surface height of the fryer: put 'fryer_bubbles' (anchor .5/1) at (tileCenterX, tileCenterY - fryerTopZ). */
  fryerTopZ: FRYER_Z,
  /** 'keep_warm' (anchor .5/1) goes on a stove/grill at (tileCenterX, tileCenterY - keepWarmZ). */
  keepWarmZ: GRILL_Z,
} as const;

function tiles(): ArtAsset[] {
  const out: ArtAsset[] = [];
  out.push(
    tile('floor_a', (_d, t) => {
      // warm wood planks running along the i axis (screen down-right)
      const tones = ['#D69A5E', '#CC8F52', '#D9A066', '#C88A4E'];
      let s = '';
      const rows = 4;
      for (let r = 0; r < rows; r++) {
        const j0 = -0.5 + r / rows;
        const j1 = j0 + 1 / rows;
        s += P(poly([t.p(-0.5, j0), t.p(0.5, j0), t.p(0.5, j1), t.p(-0.5, j1)]), tones[r]);
        s += t.line([-0.5, j1, 0], [0.5, j1, 0], 1.1, '#A86E3A');
        const seam = [0.18, -0.22, 0.32, -0.05][r];
        s += t.line([seam, j0, 0], [seam, j1, 0], 1, '#A86E3A');
        s += t.line([-0.4, j0 + 0.08, 0], [-0.1, j0 + 0.08, 0], 0.6, '#E2AE78');
      }
      return s + S(DIAMOND, 1.8, '#9A622F');
    }),
  );
  out.push(
    tile('floor_b', (_d, t) => {
      let s = P(DIAMOND, '#F3DDB5');
      s += P(poly(t.quad(-0.42, 0.42, -0.42, 0.42)), '#FAEACB');
      s += S(poly(t.quad(-0.42, 0.42, -0.42, 0.42)), 0.8, '#E8CF9F');
      s += P(poly([t.p(-0.42, -0.42), t.p(0.42, -0.42), t.p(0.3, -0.3), t.p(-0.3, -0.3)]), '#FFF6E2', 0, OUT, 'opacity="0.8"');
      return s + S(DIAMOND, 1.8, '#D9BC88');
    }),
  );
  out.push(
    tile('grass', (_d, t) => {
      let s = P(DIAMOND, '#7CC24A');
      s += speckles(t, 7, 10, ['#8FD15A', '#6DB33E'], 1.4);
      const R = rnd(31);
      for (let k = 0; k < 6; k++) {
        const [x, y] = t.p((R() - 0.5) * 0.8, (R() - 0.5) * 0.8);
        s += S(`M${f(x - 2.4)},${f(y - 2.4)}L${f(x - 1)},${f(y)}L${f(x)},${f(y - 3.2)}L${f(x + 1)},${f(y)}L${f(x + 2.4)},${f(y - 2.2)}`, 1, '#4E9230');
      }
      return s;
    }),
  );
  out.push(
    tile('sidewalk', (_d, t) => {
      let s = P(DIAMOND, '#D3CFC6');
      s += P(poly([t.p(-0.5, -0.5), t.p(0.5, -0.5), t.p(0.42, -0.42), t.p(-0.42, -0.42)]), '#E4E1DA');
      s += speckles(t, 3, 14, ['#BDB8AE', '#E8E5DF'], 0.7);
      s += t.line([0.12, -0.2, 0], [0.22, 0.02, 0], 0.7, '#B3AEA4');
      return s + S(DIAMOND, 2, '#A39E94');
    }),
  );
  const road = (t: Iso) => P(DIAMOND, '#4A4A52') + speckles(t, 11, 22, ['#5A5A63', '#3E3E45', '#55555E'], 0.8);
  out.push(tile('road', (_d, t) => road(t)));
  out.push(
    tile('road_line', (_d, t) => {
      // yellow dash along the tile's i axis (screen down-right); flipX the sprite for the j axis
      return road(t) + P(poly([t.p(-0.3, -0.055), t.p(0.3, -0.055), t.p(0.3, 0.055), t.p(-0.3, 0.055)]), '#FFD23D', 0.8, '#D9A51A');
    }),
  );
  return out;
}

// ------------------------------------------------------------------ walls
/**
 * Walls are authored in a local unskewed frame (u across 0..48, v down 0..WALL_H) and sheared onto the
 * wall plane: wall_l y = v + 24 - u/2 ; wall_r y = v + u/2.
 */
function wall(key: string, side: 'l' | 'r', deco: (d: Doc) => string): ArtAsset {
  const w = HW;
  const h = WALL_H + HH;
  const d = new Doc(key);
  const m = side === 'l' ? `matrix(1 -0.5 0 1 0 ${HH})` : 'matrix(1 0.5 0 1 0 0)';
  const face = `M0,0H${w}V${WALL_H}H0Z`;
  let s = P(face, WOOD_M);
  // planks
  const pr = 10;
  for (let k = 0; k * pr + 10 < WALL_H - 10; k++) {
    const v0 = 10 + k * pr;
    s += P(`M0,${v0}H${w}V${v0 + pr}H0Z`, k % 2 ? '#B07040' : '#A3653A');
    s += S(`M0,${v0 + pr}H${w}`, 1, WOOD_D);
    const sx = k % 2 ? 14 : 36;
    s += S(`M${sx},${v0 + 1}V${v0 + pr - 1}`, 1, WOOD_D);
    s += S(`M${(sx + 20) % 48},${v0 + 3.5}h6`, 0.6, '#C2834E');
    // nail heads either side of the butt joint + a bit of grain
    s += rivet(sx - 2, v0 + pr / 2, 0.6, '#5A3418', '#D9A066') + rivet(sx + 2, v0 + pr / 2, 0.6, '#5A3418', '#D9A066');
    const gx = (sx + 8 + k * 7) % 38;
    s += S(`M${gx},${v0 + 6.6}q4,-1.4 8,0`, 0.5, WOOD_D, 'opacity="0.55"');
    if (k === 4) s += P(ell(((sx + 30) % 40) + 4, v0 + 5, 1.6, 1.1), WOOD_D) + S(ell(((sx + 30) % 40) + 4, v0 + 5, 2.8, 2), 0.5, WOOD_D, 'opacity="0.6"');
  }
  // top cap and baseboard
  s += P(`M0,0H${w}V9H0Z`, WOOD_DD) + P(`M0,0H${w}V2.4H0Z`, '#7A5034') + S(`M0,9H${w}`, 1.4);
  s += P(`M0,${WALL_H - 10}H${w}V${WALL_H}H0Z`, WOOD_DD) + S(`M0,${WALL_H - 10}H${w}`, 1.4) + S(`M0,${WALL_H - 7.6}H${w}`, 0.6, '#7A5034');
  s += deco(d);
  // side shading: the left wall faces down-right (away from the key light)
  if (side === 'l') s += P(face, OUT, 0, OUT, 'opacity="0.1"');
  s += S(`M0,0H${w}`, PW * 1.4) + S(`M0,${WALL_H}H${w}`, PW);
  const svg = d.build(w, h, `<g transform="${m}">${s}</g>`);
  return { key, svg, w, h, ox: 0.5, oy: 1 };
}

function walls(): ArtAsset[] {
  const out: ArtAsset[] = [];
  out.push(wall('wall_l', 'l', () => ''));
  out.push(wall('wall_r', 'r', () => ''));
  out.push(
    wall('wall_l_window', 'l', (d) => {
      let s = P(rrect(8, 26, 32, 44, 2), WOOD, PW);
      const glass = 'M12,30H36V66H12Z';
      s += P(glass, d.linear(0, 30, 0, 66, [[0, '#7FD3FF'], [1, '#D8F4FF']]), 1.4);
      s += d.clip(glass, P('M14,62L30,30H36L20,62Z', '#FFFFFF', 0, OUT, 'opacity="0.45"') + P('M26,66L36,46V52L29,66Z', '#FFFFFF', 0, OUT, 'opacity="0.35"'));
      s += S('M24,30V66M12,48H36', 2.4, WOOD) + S('M24,30V66M12,48H36', 0.8, WOOD_D);
      s += P(rrect(5, 68, 38, 5, 1.4), WOOD_M, PW);
      return s;
    }),
  );
  out.push(
    wall('wall_l_sign', 'l', (d) => {
      const glow = d.radial(24, 46, 30, [[0, '#39E07A', 0.45], [1, '#39E07A', 0]]);
      let s = P('M0,14H48V104H0Z', glow);
      s += S('M14,24L18,18M34,24L30,18', 0.9, '#3A2620');
      s += P(rrect(4, 24, 40, 42, 4), '#2B1B17', PW);
      s += P(rrect(6.5, 26.5, 35, 37, 3), '#3A2620');
      const blur = d.blur(1.6);
      const text = (fill: string, extra: string) =>
        `<text x="24" y="42" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="bold" font-size="10" ${extra} fill="${fill}">ZOMBS</text>` +
        `<text x="24" y="58" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="bold" font-size="12.5" ${extra} fill="${fill}">BBQ</text>`;
      s += `<g filter="${blur}">${text('#39E07A', 'stroke="#39E07A" stroke-width="2.4"')}</g>`;
      s += text('#D8FFE6', 'stroke="#39E07A" stroke-width="0.9" paint-order="stroke"');
      s += S('M10,47H38', 1.2, '#FF8A1F') + `<path d="M10,47H38" stroke="#FF8A1F" stroke-width="2.4" opacity="0.4" filter="${blur}" fill="none"/>`;
      return s;
    }),
  );
  out.push(
    wall('wall_r_door', 'r', (d) => {
      let s = P('M6,24H42V110H6Z', WOOD, PW);
      const hole = 'M10,28H38V120H10Z';
      s += P(hole, d.linear(0, 28, 0, 120, [[0, '#1A100D'], [1, '#3A2620']]));
      // the door leaf, swung open into the dark
      s += P('M31,30L38,28V120L31,114Z', '#6A1222', 1.2);
      s += S('M33.2,72v6', 1.4, '#FFC83D');
      s += P(`M10,${WALL_H - 3}H38V${WALL_H}H10Z`, '#2B1B17', 0, OUT, 'opacity="0.6"');
      s += S(hole, PW) + S('M6,24H42', PW) + S('M6,24V120M42,24V120', PW);
      return s;
    }),
  );
  out.push(
    wall('wall_r_menu', 'r', (d) => {
      let s = P(rrect(6, 20, 36, 54, 2.4), WOOD, PW);
      s += P('M9.5,23.5H38.5V70.5H9.5Z', '#2F4A3A', 1.2);
      s += d.clip('M9.5,23.5H38.5V70.5H9.5Z', P('M9.5,23.5H24L10,70.5H9.5Z', '#FFFFFF', 0, OUT, 'opacity="0.05"'));
      s += `<text x="24" y="32.5" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="bold" font-size="7" fill="#F4F1E6">MENU</text>`;
      const chalk = '#F4F1E6';
      for (let k = 0; k < 4; k++) {
        const y = 39 + k * 7.4;
        s += S(`M12.5,${y}h${10 + (k % 2) * 4}`, 1.1, chalk, 'opacity="0.85"');
        s += S(`M${27 + (k % 2) * 2},${y}h2`, 1, chalk, 'stroke-dasharray="0.5 1.6" opacity="0.6"');
        s += `<text x="36" y="${f(y + 1.6)}" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-weight="bold" font-size="4.6" fill="#FFD23D">$${[5, 8, 12, 15][k]}</text>`;
      }
      s += S('M12,67q4,-3 8,0t8,0', 0.8, '#7CC24A');
      s += P(rrect(5, 72, 38, 3, 1), WOOD_M, 1.2);
      s += S('M14,75v2M33,75v2', 1.2) + S('M12,77H36', 1.4, '#F4F1E6');
      return s;
    }),
  );
  return out;
}

// ------------------------------------------------------------------ furniture
function furniture(): ArtAsset[] {
  const out: ArtAsset[] = [];
  const TOP = PROP_META.tableTopZ;

  out.push(
    floorProp('table', TOP + 24, (_d, t) => {
      let s = t.shadow(-0.34, 0.34, -0.46, 0.46, 0.16);
      // A-frame legs at each end (far end first)
      for (const j of [-0.34, 0.34]) {
        s += t.post([-0.28, j, 0], [-0.1, j, TOP - 4], 3.2, WOOD_M) + t.post([0.28, j, 0], [0.1, j, TOP - 4], 3.2, WOOD_D);
        s += t.post([-0.2, j, 9], [0.2, j, 9], 2.4, WOOD_D);
      }
      s += t.post([0, -0.34, 12], [0, 0.34, 12], 2.4, WOOD_D);
      s += t.box(-0.32, 0.32, -0.46, 0.46, TOP - 4, TOP, WOOD, WOOD_M, WOOD_D);
      for (const i of [-0.16, 0, 0.16]) s += t.line([i, -0.46, TOP], [i, 0.46, TOP], 0.9, WOOD_M);
      s += t.line([-0.28, -0.4, TOP], [-0.28, 0.2, TOP], 0.8, '#E2AE78');
      // grain streaks, nail heads at the cleats, and someone's carved initials
      for (const [i, j0, j1] of [[-0.24, -0.1, 0.3], [-0.08, -0.42, -0.1], [0.07, 0.05, 0.4], [0.23, -0.3, 0.02]] as [number, number, number][]) {
        s += t.line([i, j0, TOP], [i, j1, TOP], 0.5, '#9A5A2E', 'opacity="0.7"');
      }
      for (const j of [-0.4, 0.4]) for (const i of [-0.24, -0.08, 0.08, 0.24]) s += rivet(...t.p(i, j, TOP), 0.55, '#5A3418', '#E2AE78');
      const [cx, cy] = t.p(0.16, 0.22, TOP);
      s += `<g transform="matrix(1 0.5 -1 0.5 ${f(cx)} ${f(cy)})">${S('M-2.4,-1.2c-1,-1.4 -3,0 -1.6,1.6l1.6,1.6l1.6,-1.6c1.4,-1.6 -0.6,-3 -1.6,-1.6z', 0.5, '#7A4524')}</g>`;
      return s;
    }),
  );

  const bench = (key: string, c: number) =>
    floorProp(key, 40, (_d, t) => {
      const Z = PROP_META.seatZ;
      let s = t.shadow(c - 0.16, c + 0.16, -0.46, 0.46, 0.15);
      for (const j of [-0.34, 0.34]) {
        s += t.post([c - 0.08, j, 0], [c - 0.04, j, Z - 3], 2.8, WOOD_M) + t.post([c + 0.08, j, 0], [c + 0.04, j, Z - 3], 2.8, WOOD_D);
      }
      s += t.box(c - 0.13, c + 0.13, -0.44, 0.44, Z - 3.5, Z, WOOD, WOOD_M, WOOD_D);
      s += t.line([c, -0.44, Z], [c, 0.44, Z], 0.9, WOOD_M);
      s += t.line([c - 0.07, -0.3, Z], [c - 0.07, 0.1, Z], 0.5, '#9A5A2E', 'opacity="0.7"') + t.line([c + 0.06, 0.05, Z], [c + 0.06, 0.38, Z], 0.5, '#9A5A2E', 'opacity="0.7"');
      for (const j of [-0.38, 0.38]) s += rivet(...t.p(c - 0.06, j, Z), 0.5, '#5A3418', '#E2AE78') + rivet(...t.p(c + 0.06, j, Z), 0.5, '#5A3418', '#E2AE78');
      return s;
    });
  out.push(bench('bench_l', 0.25));
  out.push(bench('bench_r', -0.25));

  out.push(
    floorProp('counter', PROP_META.counterTopZ + 26, (_d, t) => {
      const Z = PROP_META.counterTopZ;
      let s = t.shadow(-0.5, 0.5, -0.5, 0.5, 0.15);
      s += t.box(-0.44, 0.44, -0.44, 0.44, 0, Z - 4, '#8E1B2E', '#B3263A', '#8E1B2E');
      // panels
      for (const k of [-0.22, 0.22]) {
        s += P(poly([t.p(k - 0.16, 0.44, 7), t.p(k + 0.16, 0.44, 7), t.p(k + 0.16, 0.44, Z - 10), t.p(k - 0.16, 0.44, Z - 10)]), '#9E1F33', 1.1);
        s += P(poly([t.p(0.44, k - 0.16, 7), t.p(0.44, k + 0.16, 7), t.p(0.44, k + 0.16, Z - 10), t.p(0.44, k - 0.16, Z - 10)]), '#7A1628', 1.1);
      }
      s += P(poly([t.p(-0.44, 0.44, 0), t.p(0.44, 0.44, 0), t.p(0.44, 0.44, 3.5), t.p(-0.44, 0.44, 3.5)]), '#4A1018', 1.2);
      s += P(poly([t.p(0.44, -0.44, 0), t.p(0.44, 0.44, 0), t.p(0.44, 0.44, 3.5), t.p(0.44, -0.44, 3.5)]), '#3A0C14', 1.2);
      s += t.line([-0.44, 0.44, Z - 6.5], [0.44, 0.44, Z - 6.5], 1.2, '#FFC83D') + t.line([0.44, 0.44, Z - 6.5], [0.44, -0.44, Z - 6.5], 1.2, '#D9971A');
      s += t.box(-0.48, 0.48, -0.48, 0.48, Z - 4, Z, '#FFF4DC', '#E8D5B0', '#CDB68E');
      s += t.line([-0.4, -0.3, Z], [-0.4, 0.3, Z], 0.9, '#FFFFFF');
      return s;
    }),
  );

  out.push(
    floorProp('grill', PROP_META.grillTopZ + 26, (d, t) => {
      const Z = PROP_META.grillTopZ;
      let s = t.shadow(-0.42, 0.42, -0.42, 0.42, 0.18);
      for (const [i, j] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]] as Pt[]) s += t.post([i, j, 0], [i, j, Z - 10], 2.6, '#3A3535');
      s += t.post([-0.3, 0.3, 4], [0.3, 0.3, 4], 1.8, '#3A3535') + t.post([0.3, -0.3, 4], [0.3, 0.3, 4], 1.8, '#2A2626');
      s += t.box(-0.4, 0.4, -0.4, 0.4, Z - 12, Z, '#C62F2F', '#3A3535', '#221E1E');
      const top = poly(t.quad(-0.4, 0.4, -0.4, 0.4, Z));
      const [gx, gy] = t.p(0, 0, Z);
      s += P(top, d.radial(gx, gy, 34, [[0, '#FFB23D'], [0.45, '#FF5A1F'], [1, '#B3262A']]));
      for (let k = -3; k <= 3; k++) s += t.line([k * 0.1, -0.36, Z], [k * 0.1, 0.36, Z], 1.2, '#5A1010');
      s += S(top, PW);
      // knobs on the front-left face
      for (const i of [-0.22, 0, 0.22]) {
        const [kx, ky] = t.p(i, 0.4, Z - 6);
        s += P(ell(kx, ky, 1.8, 1.6), '#C9CED6', 1);
      }
      s += t.line([0.4, -0.3, Z - 3], [0.4, 0.3, Z - 3], 0.8, '#5A5050');
      // grease drip, a hanging spatula, rivets, and a fly that thinks it's fine
      const [ddx, ddy] = t.p(-0.1, 0.4, Z - 12);
      s += P(`M${f(ddx)},${f(ddy)}q-1.2,3.4 0,4.4q1.2,-1 0,-4.4z`, '#3A2010', 0.6);
      for (const i of [-0.36, 0.36]) s += rivet(...t.p(i, 0.4, Z - 2), 0.6, '#7A1A1A', '#FF8A8A');
      const [hx, hy] = t.p(0.4, 0.14, Z - 4);
      s += S(`M${f(hx)},${f(hy)}l2.4,10`, 2.6) + S(`M${f(hx)},${f(hy)}l2.4,10`, 1.2, WOOD_M);
      s += P(`M${f(hx + 1)},${f(hy + 9)}l4,0.6l1.4,7l-5,0.8z`, '#C9CED6', 0.9) + S(`M${f(hx + 2.4)},${f(hy + 11)}l0.8,4.4M${f(hx + 4)},${f(hy + 11)}l0.8,4.4`, 0.5, '#8E959E');
      s += fly(...t.p(0.1, 0.4, Z - 7), 0.9);
      return s;
    }),
  );

  out.push(
    asset('grill_fire', 22, 28, 0.5, 1, () => {
      let s = P('M11,27C3,27 1.4,20 4.4,14.6C5.6,17.4 7,18 8,17.6C6.6,12 9,6 13.6,1.6C13,6.4 15,9.4 17.2,10.6C17.6,9 18,8 19,7C21.6,12.4 21.4,18 19.2,22C17.6,25.4 14.6,27 11,27Z', '#FF8A1F', 1.6);
      s += P('M11,25C7,25 5.6,21.4 7.2,18.4C8.4,19.8 9.6,20 10.4,19.4C10,16 11.4,12.6 14,10.6C14,13.6 15.6,15.6 16.6,16.4C17.6,19.8 16.2,25 11,25Z', '#FFC23D');
      s += P('M11,24.4C9.2,24.4 8.4,22.8 9.2,21.2C9.8,22 10.6,21.8 11,21.2C11.2,19.6 12,18.4 13,17.8C13.6,20.6 14.4,24.4 11,24.4Z', '#FFF3B0');
      return s;
    }),
  );

  out.push(
    floorProp('smoker', 88, (d, t) => {
      let s = t.shadow(-0.42, 0.42, -0.3, 0.3, 0.18);
      const zc = 31;
      const rj = 0.26;
      const rz = 14;
      const N = 36;
      const ring = (i: number): Pt[] => Array.from({ length: N }, (_, k) => {
        const a = (k / N) * Math.PI * 2;
        return t.p(i, rj * Math.cos(a), zc + rz * Math.sin(a));
      });
      for (const [i, j] of [[-0.24, -0.16], [0.24, -0.16], [-0.24, 0.16], [0.24, 0.16]] as Pt[]) s += t.post([i, j, 0], [i, j, zc - 6], 2.6, '#3A3535');
      // firebox at the back end
      s += t.box(-0.46, -0.3, -0.22, 0.22, 4, 26, '#3A3535', '#2E2A2A', '#1E1A1A');
      const i0 = -0.34;
      const i1 = 0.36;
      const body = poly(hull([...ring(i0), ...ring(i1)]));
      s += d.shaded(body, '#3A3535', '#1E1A1A', PW, [-2.2, -3]);
      // top highlight band + lid seam
      s += t.line([i0 + 0.04, -0.1, zc + rz - 1.4], [i1 - 0.06, -0.1, zc + rz - 1.4], 2, '#5A5454');
      s += S(pline3(t, i0 + 0.02, i1 - 0.02, rj * Math.cos(-0.5), zc + rz * Math.sin(-0.5)), 1.1, '#120F0F');
      // front cap
      s += P(poly(ring(i1)), '#2E2A2A', PW);
      const [cx, cy] = t.p(i1, 0, zc);
      s += P(ell(cx - 2, cy - 3, 3.4, 3.4), '#F4F1E6', 1.2) + S(`M${f(cx - 2)},${f(cy - 3)}l1.6,-1.6`, 0.9, '#D7262E');
      s += P(ell(cx + 1.2, cy + 6, 4, 1.8), '#FF5A1F', 1.1) + S(`M${f(cx - 1.6)},${f(cy + 6)}h5.6`, 0.6, '#FFC23D');
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2 + 0.2;
        s += rivet(...t.p(i1, rj * 0.82 * Math.cos(a), zc + rz * 0.82 * Math.sin(a)), 0.6, '#120F0F', '#8E8888');
      }
      for (const i of [-0.2, 0, 0.2]) s += rivet(...t.p(i, rj * 0.97, zc - 2), 0.6, '#120F0F', '#8E8888');
      // handle on the lid
      s += t.post([-0.12, 0.2, zc + rz - 3], [0.18, 0.2, zc + rz - 3], 2, WOOD_M);
      // chimney
      const [hx, hy] = t.p(-0.3, -0.02, zc + rz - 3);
      s += d.shaded(`M${f(hx - 3.2)},${f(hy)}V${f(hy - 30)}H${f(hx + 3.2)}V${f(hy)}Z`, '#3A3535', '#1E1A1A', PW, [-1, 0]);
      s += P(rrect(hx - 4.8, hy - 33, 9.6, 4, 1), '#2E2A2A', PW);
      s += S(`M${f(hx - 1.4)},${f(hy - 28)}V${f(hy - 4)}`, 1, '#5A5454');
      return s;
    }),
  );

  out.push(
    floorProp('fridge', 104, (_d, t) => {
      const Z = 84;
      let s = t.shadow(-0.42, 0.42, -0.42, 0.42, 0.18);
      s += t.box(-0.36, 0.36, -0.36, 0.36, 0, Z, '#FFFFFF', '#ECE8DF', '#CFC9BC');
      // doors on the +i face
      s += t.line([0.36, -0.36, 56], [0.36, 0.36, 56], 1.4);
      s += t.post([0.37, -0.26, 60], [0.37, -0.26, 74], 1.6, '#8E959E') + t.post([0.37, -0.26, 26], [0.37, -0.26, 50], 1.6, '#8E959E');
      // dents, scuffs, a gooey handprint, magnets
      const [dx, dy] = t.p(0.36, 0.1, 36);
      s += S(`M${f(dx - 3)},${f(dy)}q3,2.4 6,0.4`, 1, '#A8A196');
      const [ex, ey] = t.p(0.36, -0.06, 66);
      s += S(`M${f(ex)},${f(ey)}l2.4,1.6l-1,2l3,1.4`, 0.8, '#A8A196');
      const [gx, gy] = t.p(0.36, 0.18, 20);
      s += P(ell(gx, gy, 3.2, 3.6), '#8DC63F', 0, OUT, 'opacity="0.75"') +
        S(`M${f(gx - 2.4)},${f(gy - 2.6)}v-3.4M${f(gx - 0.6)},${f(gy - 3.4)}v-3.6M${f(gx + 1.2)},${f(gy - 3)}v-3.2M${f(gx + 2.8)},${f(gy - 1.8)}l1.6,-2.4`, 1.4, '#8DC63F', 'opacity="0.75"');
      const [mx, my] = t.p(0.36, 0.05, 66);
      s += P(ell(mx, my, 1.8), '#D7262E', 0.9) + P(ell(mx + 6, my + 1.4, 1.6), '#FFC83D', 0.9);
      const [nx, ny] = t.p(0.36, 0.31, 77);
      s += `<g transform="matrix(1 -0.5 0 1 ${f(nx)} ${f(ny)}) rotate(-6 7 5)">` +
        P('M0,0H14V9.4L12,11.4H0Z', '#FFE66A', 0.8) + P('M12,11.4L12.4,9.8L14,9.4Z', '#E0C040', 0.5) +
        T(7, 4.2, 2.6, '#B3263A', "DON'T EAT") + T(7, 7.8, 3.2, '#2B1B17', 'STAFF') + S('M3,8.8h8', 0.5, '#B3263A') + '</g>';
      const [sx, sy] = t.p(0.36, -0.1, 56);
      s += P(`M${f(sx - 1.4)},${f(sy)}q0,4 1.4,5q1.6,-1 1.2,-5z`, '#B8F07A', 0.8);
      s += t.line([-0.3, 0.36, Z - 6], [-0.3, 0.36, 10], 1.6, '#FFFFFF');
      return s;
    }),
  );

  out.push(
    floorProp('plant', 66, (d, t) => {
      let s = t.shadow(-0.24, 0.24, -0.24, 0.24, 0.18);
      const [cx, cy] = t.p(0, 0, 0);
      const rt = 13;
      const top = cy - 20;
      const pot = `M${f(cx - rt)},${f(top)}L${f(cx - 10)},${f(cy - 2)}Q${f(cx)},${f(cy + 3)} ${f(cx + 10)},${f(cy - 2)}L${f(cx + rt)},${f(top)}Z`;
      s += d.shaded(pot, '#D9733F', '#B0532A', PW, [-2.4, 0]);
      s += P(ell(cx, top, rt + 1.6, 5.4), '#E08A52', PW) + P(ell(cx, top + 0.4, rt - 1.2, 3.6), '#4A2E1C');
      // leaves
      const leaf = (x: number, y: number, len: number, ang: number, col: Tone) => {
        const tip: Pt = [x + Math.cos(ang) * len, y + Math.sin(ang) * len];
        const nx = -Math.sin(ang) * len * 0.32;
        const ny = Math.cos(ang) * len * 0.32;
        const mx = (x + tip[0]) / 2;
        const my = (y + tip[1]) / 2;
        const p = `M${f(x)},${f(y)}Q${f(mx + nx)},${f(my + ny)} ${f(tip[0])},${f(tip[1])}Q${f(mx - nx)},${f(my - ny)} ${f(x)},${f(y)}Z`;
        return d.shaded(p, col[0], col[1], 1.8, [-0.8, -1]) + S(`M${f(x)},${f(y)}Q${f(mx + nx * 0.2)},${f(my + ny * 0.2)} ${f(tip[0])},${f(tip[1])}`, 0.8, col[1]);
      };
      const g1: Tone = ['#4FAF4A', '#3A8A3A'];
      const g2: Tone = ['#63C25A', '#3F9440'];
      const by = top - 1;
      s += leaf(cx - 2, by, 26, -2.3, g1) + leaf(cx + 2, by, 26, -0.8, g1) + leaf(cx, by, 30, -1.75, g2);
      s += leaf(cx - 1, by, 22, -2.8, g2) + leaf(cx + 1, by, 22, -0.3, g2) + leaf(cx, by, 24, -1.3, g1) + leaf(cx, by, 22, -2.0, g1);
      return s;
    }),
  );

  out.push(
    floorProp('barrel_keg', 66, (d, t) => {
      let s = t.shadow(-0.3, 0.3, -0.3, 0.3, 0.2);
      const [cx, cy] = t.p(0, 0, 0);
      const r = 16;
      const H = 40;
      const topY = cy - H;
      s += P(ell(cx, topY - 4, 26, 18), d.radial(cx, topY - 4, 26, [[0, '#39E07A', 0.55], [1, '#39E07A', 0]]));
      const body =
        `M${f(cx - r)},${f(topY)}C${f(cx - r - 4)},${f(topY + H * 0.35)} ${f(cx - r - 4)},${f(topY + H * 0.65)} ${f(cx - r)},${f(cy)}` +
        `A${r},${r / 2} 0 0 0 ${f(cx + r)},${f(cy)}C${f(cx + r + 4)},${f(topY + H * 0.65)} ${f(cx + r + 4)},${f(topY + H * 0.35)} ${f(cx + r)},${f(topY)}Z`;
      s += d.shaded(body, '#B07040', '#7A4524', PW, [-3, 0]);
      s += d.clip(body, S(`M${f(cx - 8)},${f(topY)}V${f(cy + 8)}M${f(cx)},${f(topY)}V${f(cy + 9)}M${f(cx + 8)},${f(topY)}V${f(cy + 8)}`, 0.9, WOOD_D));
      for (const k of [0.18, 0.78]) {
        const y = topY + H * k;
        s += d.clip(body, S(`M${f(cx - r - 6)},${f(y)}A${r + 4},${(r + 4) / 2} 0 0 0 ${f(cx + r + 6)},${f(y)}`, 3, '#5A5A63') + S(`M${f(cx - r - 6)},${f(y - 1.6)}A${r + 4},${(r + 4) / 2} 0 0 0 ${f(cx + r + 6)},${f(y - 1.6)}`, 0.7, '#8E959E'));
      }
      // goo top + drips
      s += P(ell(cx, topY, r, r / 2), '#39E07A', PW);
      s += P(ell(cx - 1, topY - 0.6, r - 4, r / 2 - 2.4), '#7CF0A8');
      s += P(`M${f(cx - 10)},${f(topY + 5)}q-1,6 1,8q2,0 1.6,-7zM${f(cx + 4)},${f(topY + 7)}q-1,9 1,11q2,0 1.4,-10z`, '#39E07A', 1.1);
      s += hl(cx - 5, topY - 2, 3, 1, -10, 0.8);
      // label + spigot
      s += P(rrect(cx - 10, topY + 13, 20, 9, 1.6), '#FFF4DC', 1.2);
      s += `<text x="${f(cx)}" y="${f(topY + 17)}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="bold" font-size="3.4" fill="#0F8F4A">BRAIN</text>`;
      s += `<text x="${f(cx)}" y="${f(topY + 20.6)}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="bold" font-size="3.4" fill="#0F8F4A">SAUCE</text>`;
      s += P(rrect(cx + 2, topY + 27, 7, 3, 1), '#D9A520', 1.1) + P(rrect(cx + 6.4, topY + 28.4, 2.4, 4, 0.8), '#D9A520', 1);
      s += P(`M${f(cx + 7.6)},${f(topY + 33)}q-1.4,2.6 0,3.4q1.4,-0.8 0,-3.4z`, '#39E07A', 0.8);
      return s;
    }),
  );

  out.push(
    floorProp('tombstone', 40, (d, t) => {
      const [cx, cy] = t.p(0, 0, 0);
      let s = P(ell(cx, cy + 1, 20, 7), '#7A4F2E', PW) + P(ell(cx - 2, cy, 15, 4.4), '#94633A');
      const face = `M${f(cx - 11)},${f(cy)}V${f(cy - 24)}A11,11 0 0 1 ${f(cx + 11)},${f(cy - 24)}V${f(cy)}Z`;
      const side = `M${f(cx + 11)},${f(cy)}V${f(cy - 24)}A11,11 0 0 0 ${f(cx + 9)},${f(cy - 31)}L${f(cx + 14)},${f(cy - 28)}A11,11 0 0 1 ${f(cx + 15)},${f(cy - 22)}V${f(cy - 2)}Z`;
      s += P(side, '#7D838C', PW);
      s += d.shaded(face, '#B5BBC4', '#9AA1AB', PW, [-1.6, -1.6]);
      s += `<text x="${f(cx)}" y="${f(cy - 15)}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="bold" font-size="7.5" fill="#6B727C">RIP</text>`;
      s += S(`M${f(cx + 4)},${f(cy - 32)}l-2,4l2,2l-2,4`, 0.9, '#6B727C');
      s += S(`M${f(cx - 7)},${f(cy - 8)}h14`, 0.9, '#8C939C');
      s += S(`M${f(cx - 14)},${f(cy + 1)}l1.4,-4l1.2,4l1.2,-3.4l1,3.4M${f(cx + 10)},${f(cy + 2)}l1,-3.6l1.2,3.6l1.2,-3`, 1, '#4E9230');
      return s;
    }),
  );

  out.push(
    floorProp(
      'neon_post',
      166,
      (d, t) => {
        const [cx, cy] = t.p(0, 0, 0);
        let s = P(ell(cx, cy, 8, 4), OUT, 0, OUT, 'opacity="0.2"');
        s += d.shaded(`M${f(cx - 3)},${f(cy)}V${f(cy - 104)}H${f(cx + 3)}V${f(cy)}Z`, '#8E959E', '#5A5F68', PW, [-1.2, 0]);
        s += P(rrect(cx - 5, cy - 4, 10, 4, 1), '#5A5F68', PW);
        // sign board on the i axis (faces screen down-left)
        const by = cy - 118;
        const board = (inner: string) => `<g transform="matrix(1 0.5 0 1 ${f(cx)} ${f(by)})">${inner}</g>`;
        const glow = d.blur(2);
        const txt = (fill: string, extra: string) =>
          `<text x="0" y="-4" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="bold" font-size="17" ${extra} fill="${fill}">ZOMBS</text>` +
          `<text x="0" y="14" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="bold" font-size="15" ${extra} fill="${fill}">BBQ</text>`;
        s += board(
          P('M-34,-24H38V22H-34Z', '#5C0F1D', PW) +
            P('M-38,-20H34V26H-38Z', '#B3263A', PW) +
            P('M-34.5,-16.5H30.5V22.5H-34.5Z', '#2B1B17') +
            `<g filter="${glow}">${txt('#39E07A', 'stroke="#39E07A" stroke-width="3"')}</g>` +
            txt('#E2FFEC', 'stroke="#39E07A" stroke-width="1.2" paint-order="stroke"') +
            S('M-30,4H26', 1.4, '#FF8A1F'),
        );
        const blink: Pt[] = [[-36, -18], [-24, -18], [-12, -18], [0, -18], [12, -18], [24, -18]];
        s += board(blink.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.3" fill="#FFE14D"/>`).join(''));
        return s;
      },
      112,
    ),
  );

  out.push(
    floorProp(
      'tree',
      150,
      (d, t) => {
        const [cx, cy] = t.p(0, 0, 0);
        let s = P(ell(cx + 4, cy, 30, 13), OUT, 0, OUT, 'opacity="0.18"');
        const trunk = `M${f(cx - 6)},${f(cy + 1)}C${f(cx - 4)},${f(cy - 20)} ${f(cx - 5)},${f(cy - 40)} ${f(cx - 4)},${f(cy - 64)}H${f(cx + 5)}C${f(cx + 5)},${f(cy - 40)} ${f(cx + 4)},${f(cy - 20)} ${f(cx + 7)},${f(cy + 1)}Q${f(cx)},${f(cy + 4)} ${f(cx - 6)},${f(cy + 1)}Z`;
        s += d.shaded(trunk, '#8A5130', '#5E3418', PW, [-2, 0]);
        s += S(`M${f(cx + 1)},${f(cy - 50)}l6,-10M${f(cx - 1)},${f(cy - 44)}l-7,-8`, 3.4, '#5E3418');
        const C: [number, number, number][] = [
          [cx - 22, cy - 82, 22],
          [cx + 22, cy - 84, 22],
          [cx - 4, cy - 104, 26],
          [cx + 4, cy - 72, 24],
          [cx - 26, cy - 108, 14],
          [cx + 24, cy - 110, 15],
        ];
        s += blobs(d, C, '#5DB548', '#3E8A35', PW, [-4, -4]);
        s += hl(cx - 14, cy - 116, 8, 4, -25, 0.25) + hl(cx + 18, cy - 102, 5, 2.6, -25, 0.2);
        for (const [x, y] of [[cx - 16, cy - 88], [cx + 14, cy - 96], [cx - 2, cy - 78], [cx + 24, cy - 80], [cx - 8, cy - 112]] as Pt[]) {
          s += S(`M${f(x - 3)},${f(y)}q3,-3 6,0`, 1.2, '#3E8A35');
        }
        return s;
      },
      112,
    ),
  );
  return out;
}

function pline3(t: Iso, i0: number, i1: number, j: number, z: number): string {
  const a = t.p(i0, j, z);
  const b = t.p(i1, j, z);
  return `M${f(a[0])},${f(a[1])}L${f(b[0])},${f(b[1])}`;
}

// ------------------------------------------------------------------ dishes
function dishes(): ArtAsset[] {
  const out: ArtAsset[] = [];
  out.push(
    dish('dish_hotdog', (d) =>
      d.shaded(capsule([7, 13.6], [25, 12.4], 6.6), '#E8A64A', '#C2802A', 1.2, [-0.6, -0.8]) +
      d.shaded(capsule([5.4, 11.4], [26.6, 10], 3.8), '#C2502E', '#923518', 1.2, [-0.5, -0.6]) +
      S('M8,10.6l2,-1.4l2,1.4l2,-1.4l2,1.4l2,-1.4l2,1.4l2,-1.4l2,1.2', 0.9, '#FFD23D') +
      hl(10, 9.8, 2, 0.5, -4, 0.6),
    ),
  );
  out.push(
    dish('dish_burger', (d) =>
      P('M7,14.4Q7,17.4 16,17.4Q25,17.4 25,14.4Z', '#E09A3D', 1.1) +
      P(rrect(6.6, 11.8, 18.8, 3, 1.4), '#5A2E14', 1.1) +
      P('M6.2,11.6L25.8,11.6L23.6,13.6L21.4,12L19,13.8L16.6,12L14,13.8L11.6,12L9,13.6Z', '#FFC23D', 0.9) +
      P('M6,11.4Q8,10 10,11.2Q12,10 14,11.2Q16,10 18,11.2Q20,10 22,11.2Q24,10 26,11.4L25.4,12.6H6.6Z', '#6BC24A', 0.9) +
      d.shaded('M6.4,11Q6.4,3 16,3Q25.6,3 25.6,11Z', '#E8A64A', '#C2802A', 1.2, [-0.8, -0.8]) +
      S('M11,6.4h1.2M15.4,5.2h1.2M19.6,6.6h1.2M13.4,8.4h1.2', 0.9, '#FFF4DC') +
      hl(12, 5.2, 2.6, 0.9, -12, 0.45),
    ),
  );
  out.push(
    dish('dish_wings', (d) => {
      let s = '';
      for (const [x, y, a] of [[9.6, 13.2, -24], [15.6, 10.4, 6], [20.6, 13.8, 34]] as [number, number, number][]) {
        s += G(
          P(rrect(4.4, -1.1, 4.2, 2.2, 1), '#FFF4DC', 0.9) + P(ell(9, -1.8, 1.4), '#FFF4DC', 0.9) + P(ell(9, 0.6, 1.4), '#FFF4DC', 0.9) +
            d.shaded(ell(0, 0, 5.4, 3.6), '#D9682A', '#A8431A', 1.1, [-0.6, -0.6]) + hl(-1.4, -1.4, 1.6, 0.6, -10, 0.55),
          `translate(${x} ${y}) rotate(${a})`,
        );
      }
      return s;
    }),
  );
  out.push(
    dish('dish_ribs', (d) =>
      d.shaded('M4.6,13C4.4,8.6 8,6.4 12,6.6L22,7.2C26,7.6 27.6,9.8 27.2,12.6L26.6,14.4C20,16.2 12,16.4 7,15.4C5.6,15 4.8,14.2 4.6,13Z', '#8A3B12', '#5A230A', 1.3, [-0.6, -0.8]) +
      S('M7.6,9.6Q15,7.6 25,9.6', 1.4, '#C4581F') +
      S('M10.4,7.4L9.6,15.2M14.6,7.2L14.2,15.6M18.8,7.4L18.8,15.6M23,7.8L23.2,15', 0.9, '#4A1C08') +
      P(rrect(8.4, 14.4, 2.2, 3.2, 1), '#FFF4DC', 0.8) + P(rrect(12.8, 14.8, 2.2, 3.2, 1), '#FFF4DC', 0.8) +
      P(rrect(17.4, 14.8, 2.2, 3.2, 1), '#FFF4DC', 0.8) + P(rrect(21.8, 14.4, 2.2, 3.2, 1), '#FFF4DC', 0.8),
    ),
  );
  out.push(
    dish('dish_pork', (d) =>
      d.shaded('M6,14C5,10 8,6.6 12,6.4C14,4.4 19,4.4 21,6.6C25,6.8 27.4,10 26,14C20,16.4 12,16.4 6,14Z', '#C98B55', '#A0603A', 1.2, [-0.6, -0.8]) +
      S('M9,10.6q3,-2 6,0.4M13.6,8.4q3,-1.6 6,0.6M17,12q3,-1.8 6,0M8.6,13.2q2.6,-1 5,0.2M20,9.6q2,-1 3.6,0.6', 0.9, '#7A4524') +
      S('M11.6,12q2,-1.4 4,0M16.4,7.6q2,-0.8 3.2,0.4', 0.8, '#E9B27A') +
      P(ell(24.4, 14.4, 2.6, 1.6), '#7CC24A', 0.9) + S('M23,14.4h2.8', 0.5, '#4E9230'),
    ),
  );
  out.push(
    dish('dish_brisket', (d) => {
      let s = '';
      for (const [x, y, a] of [[10.6, 11.8, -14], [16, 10.6, 0], [21.4, 11.8, 14]] as [number, number, number][]) {
        s += G(
          d.shaded(rrect(-3.2, -4, 6.4, 7.4, 1.2), '#3B2216', '#24140C', 1.1, [-0.4, -0.4]) +
            P(rrect(-2.2, -3, 4.4, 5.4, 0.8), '#E07A5F') +
            P(rrect(-1.4, -2.2, 2.8, 3.8, 0.6), '#B5523A') +
            S('M-1.6,-1.2h3.2M-1.6,0.6h3.2', 0.4, '#8A3A26'),
          `translate(${x} ${y}) rotate(${a})`,
        );
      }
      return s + S('M24.6,15.6q2,-1.2 3.2,0.6', 1.2, '#3E8E3A');
    }),
  );
  out.push(
    dish('dish_snack', (d) =>
      S('M9,17.4L20,6', 2.6) + S('M9,17.4L20,6', 1.2, '#E9C28E') +
      d.shaded('M12.6,8.6C11.6,5 14.6,2.2 17.4,3C18.8,0.8 23,1 24,3.6C26.8,4 27.4,7.6 25.6,9.2C26.4,11.8 23.6,13.6 21.4,12.6C19.8,14.4 16,14 15.4,12C13,12.2 11.6,10.4 12.6,8.6Z', '#F7A8C0', '#D97A98', 1.2, [-0.8, -0.8]) +
      S('M14.6,7.8q2,-1.4 3.4,0t3,-0.4M15.2,10.6q2,0.8 3.6,-0.8t3.2,0.2M18.6,3.6q-0.6,1.8 0.8,2.8M22.4,5q-1.4,1.2 -0.4,2.6', 0.7, '#B8566F') +
      P('M20,13.6q-0.8,2 0.4,2.8q1,-0.8 0.2,-2.8z', '#B8F07A', 0.6),
    ),
  );
  out.push(
    dish('dish_burnt', (d) =>
      P('M14,4.6q-2,-2 0,-3.6q1.6,1.6 0,3.6zM19,5q-1.4,-2.2 1,-3.4q1,2 -1,3.4z', '#A9A9B0', 0.7, OUT, 'opacity="0.8"') +
      d.shaded('M7,14C6,10 9,6.6 13,6.8C15,5 20,5 22,7.2C25.6,7.6 27,11 25.6,14C19.6,16.2 12,16.2 7,14Z', '#3A3232', '#1C1818', 1.3, [-0.6, -0.8]) +
      P(ell(12.6, 11.2, 1.1, 0.6), '#FF5A1F') + P(ell(19.6, 9.6, 1, 0.5), '#FF8A1F') + P(ell(21.4, 13, 0.9, 0.5), '#FF5A1F') +
      S('M10,10.6l2,-1.6M16.4,8.2l1.6,1.4M15,13l2.4,-1', 0.7, '#5A5050'),
    ),
  );
  return out;
}

// ------------------------------------------------------------------ fx icons
function fx(): ArtAsset[] {
  const out: ArtAsset[] = [];
  const F = 'font-family="Arial, Helvetica, sans-serif" font-weight="bold"';
  out.push(
    asset('fx_coin', 24, 24, 0.5, 1, (d) =>
      d.shaded(ell(12, 12, 10), '#FFC83D', '#D9971A', 1.8, [-1.2, -1.2]) +
      S(ell(12, 12, 7.2), 1, '#D9971A') +
      `<text x="12" y="16.2" text-anchor="middle" ${F} font-size="11.5" fill="#9A6A00">$</text>` +
      hl(8, 7.4, 2.6, 1, -35, 0.85, '#FFF0A8'),
    ),
  );
  const faceBase = (d: Doc, t: Tone) => d.shaded(ell(12, 12.4, 10.2), t[0], t[1], 1.8, [-1.2, -1.2]) + hl(8, 7.4, 2.6, 1, -35, 0.6);
  out.push(
    asset('fx_happy', 24, 24, 0.5, 1, (d) =>
      faceBase(d, ['#FFD23D', '#E0A21A']) +
      P(ell(8.6, 10.6, 1.4, 2), OUT) + P(ell(15.4, 10.6, 1.4, 2), OUT) +
      P('M6.6,14Q12,20.4 17.4,14Q12,16 6.6,14Z', '#5A1E22', 1.2),
    ),
  );
  out.push(
    asset('fx_angry', 24, 24, 0.5, 1, (d) =>
      faceBase(d, ['#5FA8F0', '#3A7FC8']) +
      S('M6.4,7.6L10.6,9.6M17.6,7.6L13.4,9.6', 1.6) +
      P(ell(8.8, 11.6, 1.3, 1.7), OUT) + P(ell(15.2, 11.6, 1.3, 1.7), OUT) +
      S('M7.8,18Q12,14 16.2,18', 1.6),
    ),
  );
  const bubble = (d: Doc) =>
    d.shaded('M4,2.6H20Q23,2.6 23,5.6V14.4Q23,17.4 20,17.4H11L6.4,22L7.2,17.4H4Q1,17.4 1,14.4V5.6Q1,2.6 4,2.6Z', '#FFFFFF', '#DDE2E8', 1.6, [-1, -1]);
  out.push(
    asset('fx_zzz', 24, 24, 0.5, 1, (d) =>
      bubble(d) +
      `<text x="8.4" y="14.6" text-anchor="middle" ${F} font-size="10" fill="#3A7FC8">Z</text>` +
      `<text x="14.6" y="12" text-anchor="middle" ${F} font-size="7" fill="#3A7FC8">z</text>` +
      `<text x="19" y="9.4" text-anchor="middle" ${F} font-size="5" fill="#3A7FC8">z</text>`,
    ),
  );
  out.push(
    asset('fx_alert', 24, 24, 0.5, 1, (d) =>
      bubble(d) + P(rrect(10.4, 4.6, 3.2, 7.6, 1.4), '#E2343B', 0.9) + P(ell(12, 14.6, 1.7), '#E2343B', 0.9),
    ),
  );
  out.push(
    asset('fx_brain_thought', 28, 26, 0.5, 1, (d) =>
      P(ell(4.6, 23.6, 1.6), '#FFFFFF', 1.2) + P(ell(8, 20.4, 2.4), '#FFFFFF', 1.3) +
      blobs(d, [[8.4, 11, 6], [14.6, 8, 7], [20.6, 10.6, 6.2], [17, 14.6, 5.4], [10.4, 15, 5]], '#FFFFFF', '#DDE2E8', 1.4, [-1, -1]) +
      d.shaded('M9.8,11.4C9,8.6 11.4,6.4 13.6,7C14.6,5.2 18,5.4 18.8,7.4C21,7.6 21.6,10.4 20.2,11.8C20.8,13.8 18.6,15.2 16.8,14.4C15.6,15.8 12.6,15.4 12.2,13.8C10.4,14 9.2,12.6 9.8,11.4Z', '#F7A8C0', '#D97A98', 1, [-0.6, -0.6]) +
      S('M11.6,10.8q1.6,-1 2.8,0t2.4,-0.4M12.2,12.8q1.6,0.6 2.8,-0.6t2.6,0.2M15,7.4q-0.4,1.4 0.6,2.2', 0.6, '#B8566F'),
    ),
  );
  out.push(
    asset('fx_sweat', 24, 24, 0.5, 1, (d) =>
      d.shaded('M12,2.6C14.4,7.4 18.4,11.4 18.4,15.6C18.4,19.6 15.4,22.4 12,22.4C8.6,22.4 5.6,19.6 5.6,15.6C5.6,11.4 9.6,7.4 12,2.6Z', '#7FC8FF', '#3A9AE0', 1.6, [-1, -1]) +
      hl(9.4, 15, 1.2, 2.6, 10, 0.85),
    ),
  );
  out.push(
    asset('fx_drool', 24, 24, 0.5, 1, (d) =>
      d.shaded('M12,2.6C14.4,7.4 18.4,11.4 18.4,15.6C18.4,19.6 15.4,22.4 12,22.4C8.6,22.4 5.6,19.6 5.6,15.6C5.6,11.4 9.6,7.4 12,2.6Z', '#B8F07A', '#6FB536', 1.6, [-1, -1]) +
      hl(9.4, 15, 1.2, 2.6, 10, 0.85),
    ),
  );
  out.push(
    asset('fx_hangry', 48, 30, 0.5, 1, (d) => {
      const pts: Pt[] = [];
      const N = 18;
      for (let k = 0; k < N; k++) {
        const a = (k / N) * Math.PI * 2;
        const r = k % 2 ? 1 : 0.72;
        pts.push([24 + Math.cos(a) * 23 * r, 14.6 + Math.sin(a) * 13.6 * r]);
      }
      return (
        d.shaded(poly(pts), '#E2343B', '#B3263A', 1.6, [-1, -1]) +
        `<text x="24" y="17.8" text-anchor="middle" ${F} font-size="8.6" fill="#FFFFFF" stroke="${OUT}" stroke-width="1.8" paint-order="stroke" stroke-linejoin="round">HANGRY!</text>`
      );
    }),
  );
  out.push(
    asset('fx_smoke', 24, 24, 0.5, 1, (d) =>
      `<g opacity="0.9">${blobs(d, [[7.4, 15.4, 5.4], [12.6, 10.6, 6.6], [17.4, 15, 5.2], [12, 17.6, 5]], '#F2F2F4', '#C9CBD2', 1, [-1.2, -1.2])}</g>`,
    ),
  );
  out.push(
    asset('fx_spark', 24, 24, 0.5, 1, (d) => {
      const pts: Pt[] = [];
      for (let k = 0; k < 10; k++) {
        const a = -Math.PI / 2 + (k / 10) * Math.PI * 2;
        const r = k % 2 ? 4 : 10;
        pts.push([12 + Math.cos(a) * r, 13 + Math.sin(a) * r]);
      }
      return d.shaded(poly(pts), '#FFE14D', '#F2A900', 1.4, [-0.8, -0.8]) + hl(10.4, 10.4, 1.4, 0.7, -30, 0.9);
    }),
  );
  return out;
}

export function buildProps(): ArtAsset[] {
  return [
    ...tiles(),
    ...walls(),
    ...themeProps(),
    ...furniture(),
    ...furnitureProps(),
    ...decorProps(),
    ...wallHangingProps(),
    ...specialProps(),
    ...dishes(),
    ...extraDishes(),
    ...fx(),
    ...extraFx(),
  ];
}
