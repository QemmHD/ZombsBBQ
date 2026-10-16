/**
 * Raid art: the rival restaurants your zombies raid (floors, walls, signs), the fortifications
 * (fence, gate, bug zapper), raid FX icons and, via raidmap.ts, the road-trip map.
 *
 * ANCHOR / PLACEMENT CONVENTIONS (same world units and grid as props.ts; tile = 96 x 48, HW = 48, HH = 24):
 *
 * - raid_floor_<r>_a/_b: exactly 96 x 48 diamonds, anchor (0.5, 0.5) = tile center. Alternate a/b by (i + j) % 2.
 *
 * - raid_wall_l_<r> / raid_wall_r_<r>: identical geometry to props.ts wall_l / wall_r: 48 x 144, anchor (0.5, 1).
 *     wall_l (left back edge, the tile's i = -0.5 edge):  place at (tileCenter.x - 24, tileCenter.y)
 *     wall_r (right back edge, the tile's j = -0.5 edge): place at (tileCenter.x + 24, tileCenter.y)
 *
 * - fence_l / fence_r / gate_r: 48 x 90, anchor (0.5, 1). They stand on the FRONT edges of a tile:
 *     fence_l = front-left edge (the tile's j = +0.5 edge, from its LEFT corner (cx-48, cy) down to its
 *       BOTTOM corner (cx, cy+24)). Ground line in the image: (0, 66) -> (48, 90).
 *       Place at  (tileCenter.x - 24, tileCenter.y + 24)  with origin (0.5, 1).
 *     fence_r / gate_r = front-right edge (the tile's i = +0.5 edge, from its BOTTOM corner (cx, cy+24) up to
 *       its RIGHT corner (cx+48, cy)). Ground line in the image: (0, 90) -> (48, 66).
 *       Place at  (tileCenter.x + 24, tileCenter.y + 24)  with origin (0.5, 1).
 *     I.e. exactly like the back walls (x = cx ∓ 24) but with y = cy + TILE_H/2, because a front edge's lowest
 *     point is the tile's bottom corner. For a room of N x N tiles, fence_l goes on tiles (i, N-1) for every i and
 *     fence_r / gate_r on tiles (N-1, j) for every j. Fences are in FRONT of everything on their tile:
 *     depth-sort them at the tile's (i + j) + 0.9. Adjacent segments join seamlessly (rails run edge to edge).
 *
 * - raid_sign_<r>: 124 wide frontal billboard, a 1x1 floor object. Anchor = the tile center (its two posts stand
 *     on the tile's left/right halves at the tile center's screen y). Put it on an outdoor tile in front of / beside
 *     the joint, e.g. the tile just outside the front-left fence near the gate. Depth (i + j) like any floor object.
 *
 * - bug_zapper, chuck_wagon: 1x1 floor objects, anchor = tile center (chuck_wagon overhangs ~1.5 tiles).
 *     The zapper's glowing coil is RAID_META.zapperCoilZ above the floor: start a zapper_bolt there.
 *
 * - zapper_bolt: 16 x 90, anchor (0.5, 1). Put the anchor on the target and rotate/scale it so the top (y = 0)
 *     reaches the zapper coil (scaleY = distance / 90).
 *
 * - FX: fx_hit (36x36) and fx_ko (32x14) anchor (0.5, 0.5) = impact point / top of a head. The others
 *     (fx_heal, fx_flag, fx_recipe, fx_grave_green, fx_grave_red, fx_headstone, fx_summon) anchor (0.5, 1)
 *     = bottom-center, like the props.ts fx icons; they also work as raid HUD item icons.
 */
import type { ArtAsset } from './types';
import { RIVAL_IDS } from './manifest';
import type { RivalId } from './manifest';
import { TILE_H, TILE_W, WALL_H } from './types';
import { Doc, OUT, P, PW, S, ell, f, hl, poly, rrect } from './svg';
import type { Pt } from './svg';
import { HH, HW, Iso, asset, blobs, burstPts, rnd, starPts, txt } from './raidkit';
import { buildMapArt } from './raidmap';

export { MAP_LAYOUT } from './raidmap';

/** Heights useful for gameplay placement (world units above the floor). */
export const RAID_META = {
  /** Center of the bug zapper's glowing coil (where bolts start). */
  zapperCoilZ: 92,
  /** Fence stake height (approx.), so health bars can float above it. */
  fenceZ: 56,
  /** Sign board top above the floor. */
  signTopZ: 118,
} as const;

const M = 4;
const DIAMOND = `M${HW},0L${TILE_W},${HH}L${HW},${TILE_H}L0,${HH}Z`;

function tile(key: string, body: (d: Doc, t: Iso) => string): ArtAsset {
  const d = new Doc(key);
  const t = new Iso(HW, HH);
  return { key, svg: d.build(TILE_W, TILE_H, d.clip(DIAMOND, body(d, t))), w: TILE_W, h: TILE_H, ox: 0.5, oy: 0.5 };
}

function floorProp(key: string, above: number, body: (d: Doc, iso: Iso) => string, w = TILE_W + 2 * M, below = HH + M): ArtAsset {
  const h = Math.ceil(above + below);
  const d = new Doc(key);
  const iso = new Iso(w / 2, above);
  return { key, svg: d.build(w, h, body(d, iso)), w, h, ox: 0.5, oy: above / h };
}

function speck(t: Iso, seed: number, n: number, cols: string[], r = 0.8, spread = 1): string {
  const R = rnd(seed);
  let s = '';
  for (let k = 0; k < n; k++) {
    const [x, y] = t.p((R() - 0.5) * spread, (R() - 0.5) * spread);
    s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r * (0.6 + R() * 0.8))}" fill="${cols[k % cols.length]}"/>`;
  }
  return s;
}

/** Planks running along the i axis (screen down-right), `rows` boards across j. */
function planks(t: Iso, tones: string[], seam: string, rows = 4, seed = 3, hiCol?: string): string {
  const R = rnd(seed);
  let s = '';
  for (let r = 0; r < rows; r++) {
    const j0 = -0.5 + r / rows;
    const j1 = j0 + 1 / rows;
    s += P(poly([t.p(-0.5, j0), t.p(0.5, j0), t.p(0.5, j1), t.p(-0.5, j1)]), tones[r % tones.length]);
    s += t.line([-0.5, j1, 0], [0.5, j1, 0], 1.1, seam);
    const sm = (R() - 0.5) * 0.8;
    s += t.line([sm, j0, 0], [sm, j1, 0], 1, seam);
    if (hiCol) s += t.line([-0.42, j0 + 0.07, 0], [-0.08, j0 + 0.07, 0], 0.6, hiCol);
    // nail heads
    for (const ni of [sm - 0.06, sm + 0.06]) {
      const [x, y] = t.p(ni, (j0 + j1) / 2);
      s += `<circle cx="${f(x)}" cy="${f(y)}" r="0.7" fill="${seam}"/>`;
    }
  }
  return s;
}

// ------------------------------------------------------------------ floors
function floors(): ArtAsset[] {
  const out: ArtAsset[] = [];
  // CHUCK: dusty barn planks; b has scattered hay
  const chuckPl = (t: Iso, seed: number) => planks(t, ['#C9935A', '#BC864F', '#CF9C63', '#B98450'], '#8A5A30', 4, seed, '#DDB07C');
  out.push(tile('raid_floor_chuck_a', (_d, t) => chuckPl(t, 5) + speck(t, 9, 8, ['#A87A48', '#D8B080'], 0.7) + S(DIAMOND, 1.8, '#8A5A30')));
  out.push(
    tile('raid_floor_chuck_b', (_d, t) => {
      let s = chuckPl(t, 17);
      const R = rnd(44);
      for (let k = 0; k < 16; k++) {
        const [x, y] = t.p((R() - 0.5) * 0.9, (R() - 0.5) * 0.9);
        const a = R() * Math.PI;
        const L = 4 + R() * 5;
        s += S(`M${f(x)},${f(y)}l${f(Math.cos(a) * L)},${f(Math.sin(a) * L * 0.5)}`, 1.1, k % 3 ? '#F2CF5B' : '#D9A92E');
      }
      return s + S(DIAMOND, 1.8, '#8A5A30');
    }),
  );
  // HANK: red & cream diner checker (2x2 per tile; b is inverted so the pattern continues)
  const checker = (t: Iso, inv: boolean) => {
    let s = '';
    for (let a = 0; a < 2; a++)
      for (let b = 0; b < 2; b++) {
        const red = ((a + b) % 2 === 0) !== inv;
        const q = t.quad(-0.5 + a / 2, a / 2, -0.5 + b / 2, b / 2);
        s += P(poly(q), red ? '#D8343F' : '#FFF4DC');
        const qi = t.quad(-0.5 + a / 2 + 0.05, a / 2 - 0.05, -0.5 + b / 2 + 0.05, -0.5 + b / 2 + 0.1);
        s += P(poly(qi), '#FFFFFF', 0, OUT, `opacity="${red ? 0.18 : 0.6}"`);
      }
    s += t.line([0, -0.5, 0], [0, 0.5, 0], 0.8, '#B9A88C') + t.line([-0.5, 0, 0], [0.5, 0, 0], 0.8, '#B9A88C');
    return s + S(DIAMOND, 1.8, '#9E2630');
  };
  out.push(tile('raid_floor_hank_a', (_d, t) => checker(t, false)));
  out.push(tile('raid_floor_hank_b', (_d, t) => checker(t, true)));
  // VERA: terracotta garden pavers (a) and clover with sprouts (b)
  out.push(
    tile('raid_floor_vera_a', (_d, t) => {
      let s = P(DIAMOND, '#6FAE45');
      const tones = ['#E08A5C', '#D67C50', '#E59767', '#DA8355'];
      let k = 0;
      for (let a = 0; a < 2; a++)
        for (let b = 0; b < 2; b++) {
          const q = t.quad(-0.5 + a / 2 + 0.035, a / 2 - 0.035, -0.5 + b / 2 + 0.035, b / 2 - 0.035);
          s += P(poly(q), tones[k++], 0.9, '#9C4F2E');
          const qh = t.quad(-0.5 + a / 2 + 0.07, a / 2 - 0.12, -0.5 + b / 2 + 0.07, -0.5 + b / 2 + 0.12);
          s += P(poly(qh), '#FFD0A8', 0, OUT, 'opacity="0.5"');
        }
      s += speck(t, 21, 6, ['#B86A42'], 0.6, 0.9);
      return s + S(DIAMOND, 1.8, '#4E8A2E');
    }),
  );
  out.push(
    tile('raid_floor_vera_b', (_d, t) => {
      let s = P(DIAMOND, '#7CC24A') + speck(t, 5, 14, ['#8FD15A', '#6DB33E'], 1.4);
      // clover blobs
      const R = rnd(77);
      for (let k = 0; k < 5; k++) {
        const [x, y] = t.p((R() - 0.5) * 0.8, (R() - 0.5) * 0.8);
        for (let q = 0; q < 3; q++) {
          const a = (q / 3) * Math.PI * 2 - Math.PI / 2;
          s += P(ell(x + Math.cos(a) * 1.6, y + Math.sin(a) * 0.9, 1.5, 1), '#5FA83A');
        }
      }
      // sprouts
      for (const [i, j] of [[-0.2, 0.15], [0.22, -0.18], [0.05, 0.3]] as Pt[]) {
        const [x, y] = t.p(i, j);
        s += S(`M${f(x)},${f(y)}v-4`, 1.2, '#3F7A26');
        s += P(`M${f(x)},${f(y - 3.6)}c-1,-3 -5,-3 -5,-1c1,2 4,2 5,1z`, '#9BE05A', 0.7, '#3F7A26');
        s += P(`M${f(x)},${f(y - 3.6)}c1,-3 5,-3 5,-1c-1,2 -4,2 -5,1z`, '#9BE05A', 0.7, '#3F7A26');
      }
      return s + S(DIAMOND, 1.8, '#4E8A2E');
    }),
  );
  // CRUNCH: straw-yellow coop boards; b has a straw pile + feathers + seed
  const crunchPl = (t: Iso, seed: number) => planks(t, ['#E3B34A', '#D9A63E', '#E8BC55', '#D29E3A'], '#9C6B1E', 4, seed, '#F5D57E');
  out.push(tile('raid_floor_crunch_a', (_d, t) => crunchPl(t, 8) + speck(t, 2, 10, ['#B98A2E', '#FFF0B0'], 0.6) + S(DIAMOND, 1.8, '#9C6B1E')));
  out.push(
    tile('raid_floor_crunch_b', (_d, t) => {
      let s = crunchPl(t, 13);
      const R = rnd(91);
      for (let k = 0; k < 22; k++) {
        const [x, y] = t.p((R() - 0.5) * 0.8, (R() - 0.5) * 0.8);
        const a = R() * Math.PI;
        const L = 3 + R() * 5;
        s += S(`M${f(x)},${f(y)}l${f(Math.cos(a) * L)},${f(Math.sin(a) * L * 0.5)}`, 1, k % 2 ? '#FFE17A' : '#C99A2E');
      }
      // feathers
      for (const [i, j, rot] of [[-0.25, 0.1, -20], [0.2, 0.2, 30]] as [number, number, number][]) {
        const [x, y] = t.p(i, j);
        s += `<g transform="rotate(${rot} ${f(x)} ${f(y)})">` + P(`M${f(x - 6)},${f(y)}q6,-4.4 12,0q-6,3 -12,0z`, '#FFFFFF', 0.8) + S(`M${f(x - 6)},${f(y)}h12`, 0.6, '#C9C2B5') + '</g>';
      }
      s += speck(t, 6, 8, ['#7A5A2A'], 0.7, 0.7);
      return s + S(DIAMOND, 1.8, '#9C6B1E');
    }),
  );
  // SNOB: white and navy marble with a gold inlay
  const marble = (d: Doc, t: Iso, base: string, vein: string, hi: string, seed: number) => {
    let s = P(DIAMOND, base);
    const R = rnd(seed);
    for (let k = 0; k < 3; k++) {
      const pts: Pt[] = [];
      let i = -0.5 + R() * 0.3;
      let j = -0.5 + R();
      for (let q = 0; q < 6; q++) {
        pts.push(t.p(i, j));
        i += 0.18 + R() * 0.06;
        j += (R() - 0.5) * 0.35;
      }
      s += S('M' + pts.map((p) => `${f(p[0])},${f(p[1])}`).join('L'), 0.7 + R() * 0.5, vein, 'opacity="0.7"');
    }
    s += P(poly([t.p(-0.5, -0.5), t.p(0.5, -0.5), t.p(0.38, -0.38), t.p(-0.38, -0.38)]), hi, 0, OUT, 'opacity="0.35"');
    const inlay = poly(t.quad(-0.44, 0.44, -0.44, 0.44));
    s += S(inlay, 1.1, '#D9A72E') + S(inlay, 0.4, '#FFF0A8');
    void d;
    return s;
  };
  out.push(tile('raid_floor_snob_a', (d, t) => marble(d, t, '#F2EEE8', '#B9B4C4', '#FFFFFF', 12) + S(DIAMOND, 1.8, '#A9A2B5')));
  out.push(tile('raid_floor_snob_b', (d, t) => marble(d, t, '#2F4C8F', '#5C7BC0', '#7E9BDA', 29) + S(DIAMOND, 1.8, '#1C2F5E')));
  return out;
}

// ------------------------------------------------------------------ walls
/**
 * Walls authored in a local unskewed frame (u across 0..48, v down 0..WALL_H) and sheared onto the
 * wall plane exactly like props.ts: wall_l y = v + 24 - u/2 ; wall_r y = v + u/2.
 */
function wall(key: string, side: 'l' | 'r', face: (d: Doc, side: 'l' | 'r') => string): ArtAsset {
  const w = HW;
  const h = WALL_H + HH;
  const d = new Doc(key);
  const m = side === 'l' ? `matrix(1 -0.5 0 1 0 ${HH})` : 'matrix(1 0.5 0 1 0 0)';
  const box = `M0,0H${w}V${WALL_H}H0Z`;
  let s = d.clip(box, face(d, side));
  if (side === 'l') s += P(box, OUT, 0, OUT, 'opacity="0.1"');
  s += S(`M0,0H${w}`, PW * 1.4) + S(`M0,${WALL_H}H${w}`, PW);
  return { key, svg: d.build(w, h, `<g transform="${m}">${s}</g>`), w, h, ox: 0.5, oy: 1 };
}

const W = HW; // 48: wall segment width in the local frame

function horseshoe(x: number, y: number, s = 1): string {
  const d = `M${f(x - 5 * s)},${f(y - 3 * s)}C${f(x - 6 * s)},${f(y + 7 * s)} ${f(x + 6 * s)},${f(y + 7 * s)} ${f(x + 5 * s)},${f(y - 3 * s)}`;
  return S(d, 4.6 * s, OUT) + S(d, 2.6 * s, '#B8BEC6') + S(d, 0.8 * s, '#E8ECF0') + `<circle cx="${f(x)}" cy="${f(y - 5 * s)}" r="${f(1 * s)}" fill="${OUT}"/>`;
}

function wallFaces(r: RivalId): (d: Doc, side: 'l' | 'r') => string {
  switch (r) {
    case 'chuck':
      return (_d, side) => {
        let s = '';
        // vertical red barn boards
        for (let k = 0; k < 6; k++) {
          s += P(`M${k * 8},0h8V${WALL_H}h-8Z`, k % 2 ? '#B8322F' : '#A82B2A');
          s += S(`M${k * 8},0V${WALL_H}`, 1, '#6E1A1A');
          s += S(`M${k * 8 + 2},14v${30 + (k % 3) * 8}`, 0.6, '#C9504A');
        }
        // white trim: top, middle rail, base and an X brace in the lower panel
        const trim = (dd: string) => S(dd, 5.6, OUT) + S(dd, 3.6, '#F4EEE0');
        s += P(`M0,0H${W}V10H0Z`, '#F4EEE0') + S(`M0,10H${W}`, 1.6);
        s += trim(`M0,58H${W}`);
        s += trim(`M3,62L45,104M45,62L3,104`);
        s += trim(`M2.8,58V108M45.2,58V108`);
        s += P(`M0,106H${W}V${WALL_H}H0Z`, '#F4EEE0') + S(`M0,106H${W}`, 1.6);
        s += horseshoe(side === 'l' ? 30 : 18, 30, 1.3);
        // hay tuft along the base
        let hay = '';
        const R = rnd(side === 'l' ? 3 : 4);
        for (let k = 0; k < 14; k++) {
          const x = R() * W;
          hay += S(`M${f(x)},${WALL_H}l${f((R() - 0.5) * 6)},${f(-5 - R() * 6)}`, 1.3, k % 2 ? '#F2CF5B' : '#D9A92E');
        }
        return s + hay;
      };
    case 'hank':
      return (_d, side) => {
        let s = P(`M0,0H${W}V${WALL_H}H0Z`, '#FFF8EC');
        // white clapboard
        for (let k = 0; k < 5; k++) s += S(`M0,${14 + k * 9}H${W}`, 0.9, '#D8CDB8');
        // red racing stripe + chrome
        s += P(`M0,22H${W}V30H0Z`, '#D8343F') + S(`M0,22H${W}M0,30H${W}`, 1.2);
        s += P(`M0,58H${W}V64H0Z`, '#C9D2DC') + P(`M0,58H${W}V59.6H0Z`, '#FFFFFF') + S(`M0,58H${W}M0,64H${W}`, 1.2);
        // red wainscot with white battens
        s += P(`M0,64H${W}V${WALL_H}H0Z`, '#C42B37');
        for (let k = 0; k < 4; k++) s += S(`M${6 + k * 12},64V110`, 2.6, OUT) + S(`M${6 + k * 12},64V110`, 1.4, '#FFF4DC');
        // round porthole with a burger peeking out
        const cx = side === 'l' ? 26 : 22;
        s += P(ell(cx, 44, 9.5), '#C9D2DC', 1.8) + P(ell(cx, 44, 7), '#7FD3FF', 1.2);
        s += P(`M${cx - 4.6},45.4h9.2c0,2.4 -9.2,2.4 -9.2,0z`, '#C77A3A', 0.8) + P(`M${cx - 4.8},44.4h9.6v1.2h-9.6z`, '#5A2E1A') + P(`M${cx - 4.6},43.6c0,-4.2 9.2,-4.2 9.2,0z`, '#E8A24E', 0.8);
        s += P(`M${cx - 6},40l3,-3`, 'none') + S(`M${cx - 4.6},40l2.6,-2.6`, 1.2, '#FFFFFF', 'opacity="0.8"');
        s += P(`M0,0H${W}V10H0Z`, '#D8343F') + S(`M0,10H${W}`, 1.6) + S(`M0,3.4H${W}`, 1, '#FF6670');
        s += P(`M0,110H${W}V${WALL_H}H0Z`, '#2B1B17') + S(`M0,113H${W}`, 0.8, '#C9D2DC');
        return s;
      };
    case 'vera':
      return (d, side) => {
        let s = P(`M0,0H${W}V${WALL_H}H0Z`, '#4E9A3C');
        // white garden lattice (diagonal)
        let lat = '';
        for (let k = -6; k < 10; k++) lat += `M${k * 10},14l${W + 60},${W + 60}M${k * 10 + W},14l${-(W + 60)},${W + 60}`;
        s += d.clip(`M0,14H${W}V92H0Z`, P(`M0,14H${W}V92H0Z`, '#3E7F30') + S(lat, 3.6, '#2B5A22') + S(lat, 2.2, '#F2F6E8'));
        s += S(`M0,14H${W}M0,92H${W}`, 1.4);
        // climbing vine
        const vx = side === 'l' ? 12 : 34;
        const vine = `M${vx},96C${vx - 8},80 ${vx + 8},66 ${vx},52C${vx - 6},40 ${vx + 4},30 ${vx + 2},20`;
        s += S(vine, 3.4, OUT) + S(vine, 1.8, '#3F7A26');
        const leaves: Pt[] = [[vx - 4, 84], [vx + 4, 70], [vx - 3, 56], [vx + 3, 42], [vx - 2, 30], [vx + 3, 22]];
        leaves.forEach(([x, y], k) => {
          const dir = k % 2 ? 1 : -1;
          s += P(`M${f(x)},${f(y)}c${f(dir * 3)},-5 ${f(dir * 9)},-4 ${f(dir * 9)},-1c${f(-dir * 2)},4 ${f(-dir * 6)},4 ${f(-dir * 9)},1z`, '#8FD15A', 1, OUT);
        });
        // tomato on the vine
        s += P(ell(vx + (side === 'l' ? 7 : -7), 62, 3.4), '#E2343B', 1.1) + hl(vx + (side === 'l' ? 6 : -8), 61, 1, 0.6, -30, 0.8);
        // crenellated top band (fortress)
        s += P(`M0,0H${W}V14H0Z`, '#8C9A88') + S(`M0,14H${W}`, 1.6);
        for (let k = 0; k < 3; k++) s += P(`M${4 + k * 16},0h8v6h-8z`, '#5E6B5C') + S(`M${4 + k * 16},6h8`, 0.8);
        s += S(`M0,10H${W}`, 0.6, '#6C7A68');
        // veggie crate baseboard
        s += P(`M0,92H${W}V${WALL_H}H0Z`, '#C9935A') + S(`M0,92H${W}`, 1.6) + S(`M0,101H${W}M0,110H${W}`, 1, '#8A5A30');
        s += S(`M2,92V${WALL_H}M24,92V${WALL_H}M46,92V${WALL_H}`, 1.4, '#8A5A30');
        // carrot tops poking out
        for (const x of [8, 16, 32, 40]) s += P(`M${x},92c-2,-5 -1,-8 0,-9c1,1 2,4 0,9z`, '#7CC24A', 0.8);
        s += txt(W / 2 + (side === 'l' ? 0 : 0), 108, 'FRESH', 6, '#FFF4DC', { sw: 1.2, ls: 0.3 });
        return s;
      };
    case 'crunch':
      return (d, side) => {
        let s = '';
        // yellow coop clapboard
        for (let k = 0; k < 12; k++) {
          const y = k * 10;
          s += P(`M0,${y}H${W}V${y + 10}H0Z`, k % 2 ? '#F2C230' : '#ECB828');
          s += P(`M0,${y + 7.6}H${W}V${y + 10}H0Z`, '#C9921A');
          s += S(`M0,${y + 10}H${W}`, 0.9, '#8A5E12');
        }
        // chicken-wire window
        const win = `M8,26H40V64H8Z`;
        s += P(win, '#5A3A1E');
        let mesh = '';
        for (let y = 26; y < 66; y += 5)
          for (let x = 8; x < 42; x += 6) {
            const o = ((y - 26) / 5) % 2 ? 3 : 0;
            mesh += `M${x + o},${y}l3,2.5l-3,2.5l-3,-2.5z`;
          }
        s += d.clip(win, S(mesh, 0.7, '#C9D2DC'));
        s += S(win, 4.4, OUT) + S(win, 2.6, '#B4561E');
        // feathers stuck to the wall
        const fx = side === 'l' ? 34 : 14;
        s += `<g transform="rotate(${side === 'l' ? 30 : -30} ${fx} 84)">` + P(`M${fx - 6},84q6,-4.4 12,0q-6,3 -12,0z`, '#FFFFFF', 0.9) + S(`M${fx - 6},84h12`, 0.6, '#C9C2B5') + '</g>';
        s += `<g transform="rotate(${side === 'l' ? -15 : 15} ${fx - 10} 96)">` + P(`M${fx - 15},96q5,-3.6 10,0q-5,2.6 -10,0z`, '#FFF4DC', 0.8) + '</g>';
        // orange trim
        s += P(`M0,0H${W}V8H0Z`, '#D9461B') + S(`M0,8H${W}`, 1.6);
        s += P(`M0,110H${W}V${WALL_H}H0Z`, '#D9461B') + S(`M0,110H${W}`, 1.6);
        return s;
      };
    case 'snob':
      return (_d, side) => {
        let s = P(`M0,0H${W}V${WALL_H}H0Z`, '#DCE6F5');
        // fine pinstripe wallpaper
        for (let x = 3; x < W; x += 6) s += S(`M${x},26V66`, 0.7, '#B9C9E4');
        // gold-trimmed moulding frame
        s += P(rrect(6, 30, 36, 30, 2), 'none', 3.2, OUT) + P(rrect(6, 30, 36, 30, 2), 'none', 1.8, '#E3B23C');
        // little gilt portrait of a snooty mustache
        s += P(`M${side === 'l' ? 17 : 17},48c3,-4 6,-4 7,-1c1,-3 4,-3 7,1c-3,-1 -5,0 -7,2c-2,-2 -4,-3 -7,-2z`, '#3A2620');
        s += P(ell(24, 41, 3.2), '#F1C6A6', 0.9) + S('M22,40.4h1.2M25,40.4h1.2', 0.8);
        // blue wainscot panel with gold inset
        s += P(`M0,66H${W}V${WALL_H}H0Z`, '#2F4C8F') + S(`M0,66H${W}`, 1.6) + S(`M0,68.4H${W}`, 1.6, '#E3B23C');
        s += P(rrect(6, 74, 36, 28, 1.6), '#284180', 1, '#E3B23C');
        s += P(`M0,110H${W}V${WALL_H}H0Z`, '#1C2F5E') + S(`M0,110H${W}`, 1.4, '#E3B23C');
        // striped awning valance along the top (blue / cream with scallops)
        for (let k = 0; k < 4; k++) {
          const x = k * 12;
          s += P(`M${x},0h12v18a6,4 0 0 1 -12,0z`, k % 2 ? '#FFF4DC' : '#2F5FB8', 1.2);
        }
        s += P(`M0,0H${W}V5H0Z`, '#1C2F5E') + S(`M0,5H${W}`, 1.2) + S(`M0,2H${W}`, 0.8, '#E3B23C');
        return s;
      };
  }
}

function rivalWalls(): ArtAsset[] {
  const out: ArtAsset[] = [];
  for (const r of RIVAL_IDS) {
    out.push(wall(`raid_wall_l_${r}`, 'l', wallFaces(r)));
    out.push(wall(`raid_wall_r_${r}`, 'r', wallFaces(r)));
  }
  return out;
}

// ------------------------------------------------------------------ signs
const SIGN_W = 124;

/** Frontal billboard sign on the tile. Body draws in a frame where (0,0) = tile center on the floor, y up is negative. */
function sign(key: string, above: number, body: (d: Doc) => string): ArtAsset {
  const w = SIGN_W;
  const below = HH * 0.6 + M;
  const h = Math.ceil(above + below);
  const d = new Doc(key);
  const sh = P(ell(0, 2, 46, 9), OUT, 0, OUT, 'opacity="0.16"');
  const svg = d.build(w, h, `<g transform="translate(${w / 2} ${above})">${sh}${body(d)}</g>`);
  return { key, svg, w, h, ox: 0.5, oy: above / h };
}

function logPost(x: number, y0: number, y1: number, wd = 7, col = '#8A5A30', dk = '#6A4122'): string {
  return P(rrect(x - wd / 2, y1, wd, y0 - y1, 2), col, PW) + P(`M${f(x + wd / 2 - 2.2)},${f(y1 + 2)}V${f(y0 - 1)}`, 'none') + S(`M${f(x + wd / 2 - 2)},${f(y1 + 3)}V${f(y0 - 2)}`, 1.6, dk) + S(`M${f(x - 1)},${f(y1 + 8)}v6M${f(x)},${f(y1 + 24)}v4`, 0.8, dk);
}

function signs(): ArtAsset[] {
  const out: ArtAsset[] = [];

  // CHUCK: rustic plank sign, longhorn skull, horseshoes
  out.push(
    sign('raid_sign_chuck', 140, (d) => {
      let s = logPost(-40, 0, -100) + logPost(40, 0, -100);
      const boardD = 'M-58,-106L56,-110L59,-62L-56,-58Z';
      s += d.shaded(boardD, '#C98B55', '#A8693A', PW, [-1.4, -1.4]);
      s += d.clip(boardD, S('M-60,-91L60,-95M-60,-76L60,-79', 1.2, '#7A4524') + S('M-40,-100l10,0M20,-70l14,0M-30,-66l10,0', 0.8, '#E0AE78'));
      s += S(boardD, PW);
      // rope lashings
      for (const x of [-40, 40]) s += S(`M${x - 5},-100l10,5M${x - 5},-95l10,5M${x - 5},-70l10,5M${x - 5},-65l10,5`, 1.6, '#E8D2A0') ;
      s += txt(0, -93, "CHUCK WAGON'S", 11.5, '#FFF4DC', { sw: 3, extra: 'textLength="96" lengthAdjust="spacingAndGlyphs" transform="rotate(-2)"' });
      s += txt(0, -68, 'CHOW HALL', 20, '#FFC83D', { sw: 3.6, stroke: '#5C1A10', extra: 'textLength="104" lengthAdjust="spacingAndGlyphs" transform="rotate(-2)"' });
      s += horseshoe(-40, -40, 0.9) + horseshoe(40, -40, 0.9);
      // longhorn skull on top
      s += `<g transform="translate(0 -114)">`;
      s += P('M-6,-4C-16,-4 -24,-8 -30,-16C-24,-11 -14,-10 -6,-10Z', '#FFF4DC', 1.6) + P('M6,-4C16,-4 24,-8 30,-16C24,-11 14,-10 6,-10Z', '#FFF4DC', 1.6);
      s += d.shaded('M-8,-12C-8,-18 8,-18 8,-12L6,2C5,8 -5,8 -6,2Z', '#FFF4DC', '#D9CBB0', 1.6, [-0.8, -0.8]);
      s += P(ell(-3.4, -8, 2, 2.4), OUT) + P(ell(3.4, -8, 2, 2.4), OUT) + P(ell(-1.4, 2.6, 0.8, 1.2), OUT) + P(ell(1.4, 2.6, 0.8, 1.2), OUT);
      s += '</g>';
      // little hanging sub-plank
      s += S('M-20,-60v6M20,-62v6', 1, OUT) + P('M-26,-56L26,-58L26,-47L-26,-45Z', '#A8693A', 1.6);
      s += txt(0, -48.5, 'NO ZOMBIES', 6.4, '#FFF4DC', { sw: 1.4, extra: 'textLength="44" lengthAdjust="spacingAndGlyphs" transform="rotate(-2)"' });
      return s;
    }),
  );

  // HANK: marquee with light bulbs and a giant burger on top
  out.push(
    sign('raid_sign_hank', 156, (d) => {
      let s = P(rrect(-4, -66, 8, 66, 2), '#C9D2DC', PW);
      for (let y = -60; y < 0; y += 12) s += P(`M-4,${y}h8v6h-8z`, '#D8343F');
      s += S('M-4,-66v66M4,-66v66', PW);
      const board = rrect(-58, -104, 116, 42, 8);
      s += d.shaded(board, '#D8343F', '#A8222E', PW, [-1.6, -1.6]);
      s += P(rrect(-53, -99, 106, 32, 5), '#FFF4DC', 1.4);
      for (let k = 0; k < 16; k++) {
        const x = -54 + k * 7.2;
        s += `<circle cx="${f(x)}" cy="-101.6" r="1.6" fill="#FFE14D" stroke="${OUT}" stroke-width="0.6"/>` + `<circle cx="${f(x)}" cy="-64.4" r="1.6" fill="#FFE14D" stroke="${OUT}" stroke-width="0.6"/>`;
      }
      s += txt(0, -87.5, "BIG HANK'S", 11, '#D8343F', { sw: 0, extra: 'textLength="70" lengthAdjust="spacingAndGlyphs"' });
      s += txt(0, -71, 'BURGER BARN', 15, '#2B1B17', { extra: 'textLength="96" lengthAdjust="spacingAndGlyphs"' });
      // giant burger with a bite missing
      s += `<g transform="translate(0 -110)">`;
      const bun = 'M-40,-14C-40,-44 40,-44 40,-14Z';
      // bun with a bite taken out of the top-right (even-odd clip)
      const bite = d.id('bite');
      d.def(`<clipPath id="${bite}"><path clip-rule="evenodd" d="M-60,-60H60V0H-60Z${ell(37, -29, 9)}"/></clipPath>`);
      s += `<g clip-path="url(#${bite})">${d.shaded(bun, '#F0A64B', '#C77A2A', PW, [-2, -2])}</g>` + d.clip(bun, S(ell(37, -29, 9), PW));
      s += S('M30,-33l1.6,1.6M33,-23l1.6,-0.6', 1.2);
      for (const [x, y] of [[-20, -30], [-6, -36], [10, -32], [-12, -24], [18, -24]] as Pt[]) s += P(ell(x, y, 2, 1.1), '#FFF4DC', 0.6);
      s += P('M-42,-14C-36,-8 -30,-16 -24,-10C-18,-16 -12,-8 -6,-12C0,-8 6,-16 12,-10C18,-16 24,-8 30,-12C36,-8 40,-14 42,-14Z', '#7CC24A', 1.6);
      s += P(rrect(-41, -12, 82, 8, 4), '#6B3A22', 1.8);
      s += P('M-38,-4L-30,2L-24,-4H24L30,2L36,-4Z', '#FFC83D', 1.4);
      s += P(rrect(-38, -4, 76, 8, 3), '#F0A64B', 1.8);
      // googly face on the bun
      s += P(ell(-10, -26, 4.4, 5), '#FFFFFF', 1.2) + P(ell(8, -26, 4.4, 5), '#FFFFFF', 1.2) + P(ell(-9, -25, 1.8), OUT) + P(ell(9, -24.6, 1.8), OUT);
      s += hl(-28, -30, 5, 2, -30, 0.6);
      s += '</g>';
      return s;
    }),
  );

  // VERA: castle-crenellated green board wrapped in vines, carrot flagpole
  out.push(
    sign('raid_sign_vera', 162, (d) => {
      let s = logPost(-40, 0, -64, 7, '#7FA36A', '#5A7E48') + logPost(40, 0, -64, 7, '#7FA36A', '#5A7E48');
      const board = 'M-58,-62V-104H-48V-112H-36V-104H-24V-112H-12V-104H0V-112H12V-104H24V-112H36V-104H48V-112H58V-62Z';
      s += d.shaded(board, '#A9B4A4', '#86917F', PW, [-1.4, -1.4]);
      s += d.clip(board, S('M-60,-90H60M-60,-76H60M-30,-104V-90M10,-104V-90M30,-104V-90M-40,-90V-76M-6,-90V-76M44,-90V-76M-20,-76V-62M20,-76V-62', 0.9, '#6C7A68'));
      s += P(rrect(-50, -102, 100, 36, 5), '#4E9A3C', 1.8);
      s += txt(0, -91, "VEGAN VERA'S", 9.5, '#FFF4DC', { sw: 2.2, extra: 'textLength="70" lengthAdjust="spacingAndGlyphs"' });
      s += txt(0, -72, 'SALAD FORTRESS', 13, '#D7F57A', { sw: 3, stroke: '#1F4A16', extra: 'textLength="92" lengthAdjust="spacingAndGlyphs"' });
      // vines + leaves wrapping the board
      const v = 'M-58,-64C-48,-70 -44,-58 -32,-63C-20,-68 -16,-58 -4,-62';
      s += S(v, 3.2, OUT) + S(v, 1.8, '#3F7A26');
      for (const [x, y, dr] of [[-52, -67, -1], [-38, -60, 1], [-24, -66, -1], [-10, -59, 1]] as [number, number, number][])
        s += P(`M${x},${y}c${3 * dr},-5 ${9 * dr},-4 ${9 * dr},-1c${-2 * dr},4 ${-6 * dr},4 ${-9 * dr},1z`, '#8FD15A', 1);
      // carrot flagpole with a pea-pod pennant
      s += `<g transform="translate(36 -112)">`;
      s += P('M-3,0L3,0L0,-34Z', '#FF8A1F', 1.6) + S('M-1.6,-8h2M-1,-16h2M-0.6,-24h1.4', 0.8, '#D9461B');
      s += P('M0,-34c-3,-6 -1,-10 0,-10c1,0 3,4 0,10z', '#7CC24A', 1) + P('M0,-34c-6,-4 -7,-8 -6,-9c2,0 5,3 6,9z', '#8FD15A', 1);
      s += P('M1,-28L22,-23L1,-17Z', '#FFF4DC', 1.4) + P(ell(7, -23, 2), '#7CC24A', 0.7) + P(ell(12, -22.6, 1.8), '#7CC24A', 0.7);
      s += '</g>';
      // tomato bodyguard on the other merlon
      s += `<g transform="translate(-40 -118)">` + blobs(d, [[0, 0, 8]], '#E2343B', '#B3263A', 1.6, [-1.4, -1.4]) + P('M-4,-7l4,2l4,-2l-1,3h-6z', '#7CC24A', 1) + S('M-4,-1l2.4,1M4,-1l-2.4,1', 1.2) + S('M-3,3.4q3,-2 6,0', 1.2) + '</g>';
      return s;
    }),
  );

  // CRUNCH: coop-shaped yellow board with the original rooster mascot "Colonel Crunch" popping out on top
  out.push(
    sign('raid_sign_crunch', 176, (d) => {
      let s = logPost(-40, 0, -60, 7, '#B4561E', '#8A3E14') + logPost(40, 0, -60, 7, '#B4561E', '#8A3E14');
      // rooster behind the roof
      s += `<g transform="translate(0 -98) scale(1.35)">`;
      // comb
      s += P('M-10,-34C-14,-44 -6,-48 -4,-40C-2,-50 8,-50 6,-40C10,-48 18,-42 12,-32Z', '#E2343B', 1.8);
      // head
      s += d.shaded('M-16,-18C-18,-34 14,-38 16,-20C18,-6 -14,-4 -16,-18Z', '#FFFFFF', '#E1D9CC', 1.8, [-1.4, -1.4]);
      // army officer cap (the "Colonel")
      s += P('M-14,-28C-12,-40 12,-42 14,-30Z', '#6E7A3A', 1.6) + P('M-18,-28H16L10,-24H-14Z', '#4A5426', 1.4);
      s += P(poly(starPts(0, -34, 3.4, 1.4)), '#FFC83D', 0.8);
      // eyes (one squinting with a bushy brow)
      s += P(ell(-6, -18, 3.4, 4), '#FFFFFF', 1.2) + P(ell(-5.4, -17.4, 1.5), OUT) + S('M-10,-24l7,1', 1.8);
      s += S('M3,-18q3,-2 6,0', 1.6) + S('M2,-23l8,-1', 1.8);
      // beak + wattle
      s += P('M-2,-13L14,-10L-1,-6Z', '#FFA51F', 1.4) + S('M-1,-9.6L10,-9.8', 0.8);
      s += P('M0,-6C-2,0 4,2 4,-4Z', '#E2343B', 1.2);
      // toothpick
      s += S('M10,-9L19,-12', 1.2, '#D9A66A');
      // wing giving a thumbs up
      s += P('M16,-12C24,-16 28,-6 22,-2C20,0 16,-2 16,-6Z', '#FFFFFF', 1.4) + P('M22,-12c0,-4 4,-4 4,0z', '#FFFFFF', 1.2);
      s += '</g>';
      // coop-shaped board
      const board = 'M-58,-60V-94L0,-112L58,-94V-60Z';
      s += d.shaded(board, '#F2C230', '#D9A21E', PW, [-1.6, -1.6]);
      s += d.clip(board, S('M-60,-84H60M-60,-72H60', 1, '#B4851A'));
      s += S(board, PW);
      s += P('M-62,-93L0,-114L62,-93', 'none') + S('M-62,-93L0,-114L62,-93', 6, OUT) + S('M-62,-93L0,-114L62,-93', 3.6, '#D9461B');
      s += txt(0, -88, "COLONEL CRUNCH'S", 9.2, '#FFF4DC', { sw: 2.4, stroke: '#8A3E14', extra: 'textLength="84" lengthAdjust="spacingAndGlyphs"' });
      s += txt(0, -67, 'CHICKEN SHACK', 15, '#D9461B', { sw: 3.2, stroke: '#FFF4DC', extra: 'textLength="104" lengthAdjust="spacingAndGlyphs"' });
      s += txt(0, -67, 'CHICKEN SHACK', 15, '#D9461B', { extra: 'textLength="104" lengthAdjust="spacingAndGlyphs" stroke="#2B1B17" stroke-width="0.6"' });
      // feathers drifting
      s += `<g transform="rotate(-25 -52 -56)">` + P('M-58,-56q6,-4 12,0q-6,3 -12,0z', '#FFFFFF', 0.9) + '</g>';
      return s;
    }),
  );

  // SNOB: gilded oval cartouche on a wrought-iron post, wearing a beret, with a waxed mustache
  out.push(
    sign('raid_sign_snob', 150, (d) => {
      let s = P(rrect(-3, -64, 6, 64, 2), '#2B2F3A', PW);
      s += S('M0,-20c-10,-2 -14,-12 -6,-14c4,0 4,5 1,6M0,-20c10,-2 14,-12 6,-14c-4,0 -4,5 -1,6', 3.6, OUT) + S('M0,-20c-10,-2 -14,-12 -6,-14c4,0 4,5 1,6M0,-20c10,-2 14,-12 6,-14c-4,0 -4,5 -1,6', 1.8, '#4A5060');
      s += P(rrect(-14, -4, 28, 6, 2), '#2B2F3A', 1.6);
      // gold frame + blue oval
      s += d.shaded(ell(0, -92, 58, 32), '#FFC83D', '#D9971A', PW, [-1.4, -1.4]);
      s += P(ell(0, -92, 52, 26.5), '#2F4C8F', 1.6);
      s += P(ell(0, -92, 48, 22.5), 'none', 0.8, '#E3B23C');
      for (const a of [0, 1, 2, 3]) {
        const x = [-58, 58, 0, 0][a];
        const y = [-92, -92, -124, -60][a];
        s += P(ell(x, y, 3.6), '#FFE14D', 1.2);
      }
      s += `<text x="0" y="-92" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-style="italic" font-weight="bold" font-size="24" textLength="74" lengthAdjust="spacingAndGlyphs" stroke="${OUT}" stroke-width="3" paint-order="stroke" fill="#FFE14D">Le Snob</text>`;
      // waxed mustache under the name
      const mu = 'M0,-84C-6,-90 -14,-86 -18,-80C-21,-77 -26,-79 -24,-83C-24,-78 -18,-78 -14,-82C-9,-86 -4,-84 0,-81C4,-84 9,-86 14,-82C18,-78 24,-78 24,-83C26,-79 21,-77 18,-80C14,-86 6,-90 0,-84Z';
      s += P(mu, '#3A2620', 1);
      s += txt(0, -70, 'B I S T R O', 7.2, '#FFF4DC', { extra: 'textLength="46" lengthAdjust="spacingAndGlyphs"' });
      // jaunty beret
      s += `<g transform="rotate(-12 -16 -124)">` + P('M-40,-124C-40,-138 8,-140 10,-126C6,-120 -36,-118 -40,-124Z', '#B3263A', PW) + S('M-16,-136v-5', 2.4) + hl(-26, -131, 6, 1.6, -5, 0.4) + '</g>';
      return s;
    }),
  );
  return out;
}

// ------------------------------------------------------------------ fence + gate
const FENCE_H = 90;

/** Stakes authored in a local frame (u 0..48 along the edge, v = -z) and sheared onto the front edge plane. */
function fence(key: string, side: 'l' | 'r', gate: boolean): ArtAsset {
  const w = HW;
  const h = FENCE_H;
  const d = new Doc(key);
  // front-left edge rises to the left: y = (H-24) + u/2 + v ;  front-right edge: y = H - u/2 + v
  const m = side === 'l' ? `matrix(1 0.5 0 1 0 ${h - HH})` : `matrix(1 -0.5 0 1 0 ${h})`;
  const R = rnd(side === 'l' ? 11 : 23);
  let s = '';
  const stake = (cx: number, top: number, wd: number, base: string, dark: string) => {
    const x0 = cx - wd / 2;
    const x1 = cx + wd / 2;
    const tip = top - 9;
    const dd = `M${f(x0)},2V${f(top)}L${f(cx + (R() - 0.5) * 1.6)},${f(tip)}L${f(x1)},${f(top)}V2Z`;
    let t = d.shaded(dd, base, dark, PW, [-1.6, 0]);
    t += S(`M${f(cx - 1)},${f(top + 6)}v${f(6 + R() * 8)}`, 0.7, dark);
    t += P(ell(cx + 0.6, top + 18 + R() * 20, 1, 1.6), dark);
    return t;
  };
  // back rail (behind stakes)
  if (!gate) {
    const tops = [-50, -55, -47, -53, -49, -56];
    tops.forEach((top, k) => (s += stake(4 + k * 8, top, 7.4, k % 2 ? '#9C6E45' : '#A97A4E', '#6E4A2C')));
    for (const v of [-14, -36]) {
      const rail = `M-1,${v - 2.6}H49V${v + 2.6}H-1Z`;
      s += P(rail, '#7A4F2E', 1.6);
      s += S(`M0,${v - 1}H48`, 0.7, '#9C6E45');
    }
    // rope lashings at each crossing
    for (let k = 0; k < 6; k++) for (const v of [-14, -36]) s += S(`M${2 + k * 8},${v - 3.4}l4,6.8M${6 + k * 8},${v - 3.4}l-4,6.8`, 1.1, '#E8D2A0');
    // one stake carries a warning
    // a rusty nail and a scrap of torn cloth snagged on one stake (subtle, so repeats don't read as a pattern)
    s += P(side === 'l' ? 'M27,-30l5,1l-1,5l-3,-2z' : 'M19,-34l-4,2l2,5l3,-3z', side === 'l' ? '#B3263A' : '#5E9A2A', 0.9);
  } else {
    // two heavy posts with iron caps
    for (const cx of [3.5, 44.5]) {
      s += d.shaded(`M${cx - 4.5},2V-57H${cx + 4.5}V2Z`, '#8A5A30', '#5C3A22', PW, [-1.6, 0]);
      s += P(`M${cx - 5.5},-57L${cx},-63L${cx + 5.5},-57Z`, '#6B727C', 1.6);
    }
    // two gate leaves of short pointed planks with Z braces
    for (const [a, b] of [
      [8.5, 24],
      [24, 39.5],
    ] as Pt[]) {
      const n = 3;
      const pw = (b - a) / n;
      for (let k = 0; k < n; k++) {
        const cx = a + pw * (k + 0.5);
        const top = -44 - (k === (a < 20 ? n - 1 : 0) ? 4 : 0);
        s += d.shaded(`M${f(cx - pw / 2)},-4V${top}L${f(cx)},${top - 7}L${f(cx + pw / 2)},${top}V-4Z`, '#B88452', '#7A4F2E', 1.6, [-1.2, 0]);
      }
      s += P(`M${a},-14H${b}V-9H${a}Z`, '#7A4F2E', 1.4) + P(`M${a},-38H${b}V-33H${a}Z`, '#7A4F2E', 1.4);
      s += P(`M${a + 1},-13L${b - 1},-34L${b - 1},-38L${a + 1},-17Z`, '#7A4F2E', 1.2);
      // iron hinge straps
      s += S(`M${a},-12H${a + 6}M${a},-36H${a + 6}`, 1.6, '#4A4A52');
    }
    // "no zombies" roundel on the left leaf
    s += P(ell(16, -28, 5.4), '#FFF4DC', 1.2) + P('M13.6,-25.6c0,-3 1,-5 2.4,-5c1.4,0 2.4,2 2.4,5z', '#8DC63F', 0.7) + S(ell(16, -28, 5.4), 1.3, '#E2343B') + S('M12.2,-31.8L19.8,-24.2', 1.3, '#E2343B');
    // chain across the split
    s += S('M19,-26q5,4 10,0', 1.6, '#8A8F98') + S('M19,-26q5,4 10,0', 0.6, '#D8DDE3', 'stroke-dasharray="1.4 1.4"');
  }
  let body = `<g transform="${m}">${s}</g>`;
  if (gate) {
    // padlock drawn unsheared so it reads as an object, hanging from the chain at u = 24
    const u = 24;
    const px = u;
    const py = (side === 'l' ? h - HH + u / 2 : h - u / 2) - 22;
    body += `<g transform="translate(${f(px)} ${f(py)})">` + S('M-3.4,0V-3.6a3.4,3.4 0 0 1 6.8,0V0', 3.4, OUT) + S('M-3.4,0V-3.6a3.4,3.4 0 0 1 6.8,0V0', 1.6, '#B8BEC6') + d.shaded(rrect(-5.6, -0.6, 11.2, 9.2, 2), '#FFC83D', '#D9971A', 1.6, [-0.8, -0.8]) + P(ell(0, 3, 1.3), OUT) + P('M-0.6,3.6h1.2l0.4,3h-2z', OUT) + '</g>';
  }
  return { key, svg: d.build(w, h, body), w, h, ox: 0.5, oy: 1 };
}

// ------------------------------------------------------------------ defenses + decor
function bugZapper(): ArtAsset {
  return floorProp('bug_zapper', 132, (d, t) => {
    const [cx, cy] = t.p(0, 0);
    const cz = RAID_META.zapperCoilZ;
    let s = '';
    const glow = d.radial(cx, cy - cz, 46, [[0, '#C77DFF', 0.55], [0.5, '#9B4DFF', 0.22], [1, '#9B4DFF', 0]]);
    s += P(ell(cx, cy - cz, 46), glow);
    s += P(ell(cx, cy + 2, 30, 13), '#9B4DFF', 0, OUT, 'opacity="0.18"');
    s += t.shadow(-0.24, 0.24, -0.24, 0.24, 0.2);
    // concrete base with a hazard stripe
    s += t.box(-0.22, 0.22, -0.22, 0.22, 0, 12, '#B5BBC4', '#9AA1AB', '#7D838C');
    s += P(poly([t.p(-0.22, 0.22, 4), t.p(0.22, 0.22, 4), t.p(0.22, 0.22, 8), t.p(-0.22, 0.22, 8)]), '#FFC83D', 0.8);
    // power cable snaking off the base
    s += S(`M${f(cx + 8)},${f(cy + 6)}c8,4 14,-2 22,4s10,6 16,2`, 3.2, OUT) + S(`M${f(cx + 8)},${f(cy + 6)}c8,4 14,-2 22,4s10,6 16,2`, 1.6, '#3A3A44');
    // pole
    s += P(rrect(cx - 3.4, cy - 72, 6.8, 64, 2), '#6B727C', PW) + S(`M${f(cx + 1.2)},${f(cy - 70)}V${f(cy - 10)}`, 1.4, '#4A4F58');
    // lantern: bottom tray, glowing tubes, cage, roof
    const top = cy - cz - 20;
    const bot = cy - cz + 18;
    s += P(`M${f(cx - 17)},${f(bot)}h34l-5,7h-24z`, '#3A3A44', PW);
    s += P(rrect(cx - 15, top, 30, bot - top, 3), '#2A1240', PW);
    const tube = d.linear(cx - 15, 0, cx + 15, 0, [[0, '#E6C2FF'], [0.5, '#FFFFFF'], [1, '#C77DFF']]);
    for (const x of [-9, 0, 9]) s += P(rrect(cx + x - 2.6, top + 3, 5.2, bot - top - 6, 2.6), tube, 0.8, '#7A2FCC');
    s += S(`M${f(cx - 14)},${f(top + 12)}h28M${f(cx - 14)},${f(top + 24)}h28`, 0.8, '#E6C2FF', 'opacity="0.7"');
    const blurF = d.blur(2.4);
    s += `<g filter="${blurF}" opacity="0.8">` + P(rrect(cx - 12, top + 3, 24, bot - top - 6, 3), '#D9A8FF') + '</g>';
    for (const x of [-15, -7.5, 0, 7.5, 15]) s += S(`M${f(cx + x)},${f(top)}V${f(bot)}`, 1.4, '#4A4F58');
    s += S(rrect(cx - 15, top, 30, bot - top, 3), PW);
    s += P(`M${f(cx - 20)},${f(top + 1)}L${f(cx)},${f(top - 12)}L${f(cx + 20)},${f(top + 1)}Z`, '#4A4F58', PW) + P(`M${f(cx - 14)},${f(top - 2)}L${f(cx)},${f(top - 10)}`, 'none') + S(`M${f(cx - 14)},${f(top - 2)}L${f(cx - 2)},${f(top - 10)}`, 1.2, '#8A909A');
    s += S(`M${f(cx)},${f(top - 12)}v-6`, 1.6) + P(ell(cx, top - 21, 3.2), 'none', 1.6);
    // crackling sparks
    s += S(`M${f(cx - 20)},${f(top + 8)}l-5,-3l3,-2l-6,-4M${f(cx + 19)},${f(top + 22)}l6,-1l-3,-3l6,-3`, 1.2, '#F2D9FF');
    // a zapped fly falling, X eyes (comedic)
    const fx = cx + 26;
    const fy = cy - 46;
    s += P(ell(fx, fy, 3.4, 2.6), '#3A3A44', 1) + P(ell(fx - 2, fy - 3, 2.4, 1.4), '#DDE2E8', 0.7, OUT, 'opacity="0.9"') + S(`M${f(fx + 0.6)},${f(fy - 0.8)}l1.6,1.6m0,-1.6l-1.6,1.6`, 0.6, '#FFFFFF');
    s += S(`M${f(fx - 1)},${f(fy - 10)}c2,2 -2,3 0,5`, 0.8, '#9AA1AB');
    return s;
  });
}

function zapperBolt(): ArtAsset {
  return asset('zapper_bolt', 16, 90, 0.5, 1, (d) => {
    const R = rnd(5);
    const pts: Pt[] = [[8, 1]];
    for (let y = 9; y < 88; y += 8) pts.push([8 + (pts.length % 2 ? 1 : -1) * (2.6 + R() * 2.4), y]);
    pts.push([8, 89]);
    const line = 'M' + pts.map((p) => `${f(p[0])},${f(p[1])}`).join('L');
    const blurF = d.blur(1.8);
    return (
      `<path d="${line}" fill="none" stroke="#B45CFF" stroke-width="7" opacity="0.7" filter="${blurF}"/>` +
      S(line, 4, '#9B4DFF') +
      S(line, 1.6, '#FFFFFF') +
      S(`M${f(pts[3][0])},${f(pts[3][1])}l-4,6M${f(pts[7][0])},${f(pts[7][1])}l5,5`, 1.2, '#E6C2FF')
    );
  });
}

function chuckWagon(): ArtAsset {
  return floorProp(
    'chuck_wagon',
    86,
    (d, t) => {
      let s = t.shadow(-0.75, 0.8, -0.42, 0.42, 0.18);
      const wheel = (i: number, j: number, front: boolean) => {
        const rim = t.wheelJ(i, j, 17, 0.3, 17);
        const hub = t.p(i, j, 17);
        let w = P(poly(rim), front ? '#8A5A30' : '#6A4122', PW);
        const inner = t.wheelJ(i, j, 17, 0.24, 13.6);
        w += P(poly(inner), front ? '#3A2620' : '#2B1B17', 1);
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * Math.PI * 2;
          const q = t.p(i + Math.cos(a) * 0.24, j, 17 + Math.sin(a) * 13.6);
          w += S(`M${f(hub[0])},${f(hub[1])}L${f(q[0])},${f(q[1])}`, 2, front ? '#C98B55' : '#8A5A30');
        }
        w += P(ell(hub[0], hub[1], 3.4), '#6B727C', 1.2);
        return w;
      };
      // back wheels
      s += wheel(-0.42, -0.34, false) + wheel(0.42, -0.34, false);
      // tongue (wagon shaft) and yoke on the ground toward +i
      s += t.post([0.6, -0.08, 12], [1.05, -0.08, 2], 3, '#8A5A30') + t.post([0.6, 0.08, 12], [1.05, 0.08, 2], 3, '#8A5A30');
      s += t.post([1.02, -0.2, 3], [1.02, 0.2, 3], 3.4, '#6A4122');
      // wagon bed
      s += t.box(-0.62, 0.62, -0.3, 0.3, 14, 32, '#C98B55', '#A8693A', '#8A5A30');
      for (const z of [20, 26]) s += t.line([-0.62, 0.3, z], [0.62, 0.3, z], 0.9, '#7A4524');
      // canvas bonnet: silhouette = hull of the rear and front hoops
      const hoop = (i: number, a0 = 0, a1 = Math.PI, n = 18): Pt[] => {
        const out: Pt[] = [];
        for (let k = 0; k <= n; k++) {
          const a = a0 + ((a1 - a0) * k) / n;
          out.push(t.p(i, Math.cos(a) * 0.32, 32 + Math.sin(a) * 30));
        }
        return out;
      };
      const rear = hoop(-0.56);
      const front = hoop(0.5);
      const bonnet = poly([...rear, ...[...front].reverse()]);
      s += d.shaded(bonnet, '#FFF4DC', '#E2D3B4', PW, [2, -2]);
      // patches + ribs
      s += d.clip(bonnet, [-0.25, 0.05, 0.3].map((i) => S('M' + hoop(i, 0, Math.PI * 0.62, 10).map((p) => `${f(p[0])},${f(p[1])}`).join('L'), 1.6, '#C9B48E')).join(''));
      const pc = t.p(-0.42, 0.27, 40);
      s += P(rrect(pc[0] - 6, pc[1] - 5, 12, 10, 1), '#E2343B', 1, OUT, `transform="rotate(20 ${f(pc[0])} ${f(pc[1])})"`) + S(`M${f(pc[0] - 4)},${f(pc[1] - 2)}h8M${f(pc[0] - 4)},${f(pc[1] + 2)}h8`, 0.6, '#FFF4DC', `transform="rotate(20 ${f(pc[0])} ${f(pc[1])})"`);
      // front opening: a small dark puckered hole in the drawn-together canvas
      const hc = t.p(0.5, 0, 46);
      s += P(ell(hc[0], hc[1], 7, 9), '#3A2620', PW);
      for (let k = 0; k < 7; k++) {
        const a = (k / 7) * Math.PI * 2;
        s += S(`M${f(hc[0] + Math.cos(a) * 8)},${f(hc[1] + Math.sin(a) * 10)}l${f(Math.cos(a) * 7)},${f(Math.sin(a) * 9)}`, 1, '#C9B48E');
      }
      // painted name on the canvas side
      const [nx, ny] = t.p(-0.3, 0.3, 44);
      s += `<g transform="matrix(1 0.5 0 1 ${f(nx)} ${f(ny)})">` + txt(20, 0, 'CHUCK', 9, '#B3263A', { extra: 'textLength="34" lengthAdjust="spacingAndGlyphs"' }) + '</g>';
      // a zombie-proof sign: lantern + hanging pot
      const lp = t.p(0.58, 0.32, 40);
      s += S(`M${f(lp[0])},${f(lp[1] - 6)}v6`, 1) + P(rrect(lp[0] - 3, lp[1], 6, 8, 1.4), '#FFC83D', 1.2) + P(rrect(lp[0] - 1.4, lp[1] + 2, 2.8, 4, 1), '#FFF0A8');
      const pp = t.p(-0.2, 0.33, 22);
      s += S(`M${f(pp[0])},${f(pp[1] - 5)}v5`, 1) + P(`M${f(pp[0] - 5)},${f(pp[1])}h10l-1.4,6a4,2 0 0 1 -7.2,0z`, '#4A4A52', 1.2);
      // front wheels
      s += wheel(-0.42, 0.34, true) + wheel(0.42, 0.34, true);
      return s;
    },
    150,
  );
}

// ------------------------------------------------------------------ fx
function fxIcons(): ArtAsset[] {
  const out: ArtAsset[] = [];
  out.push(
    asset('fx_hit', 36, 36, 0.5, 0.5, (d) =>
      d.shaded(poly(burstPts(18, 18, 17, 16, 11, 0.62, 3)), '#E2343B', '#B3263A', 1.8, [-1, -1]) +
      d.shaded(poly(burstPts(18, 18, 12.4, 11.4, 9, 0.7, 7)), '#FFE14D', '#FFB21F', 1.4, [-0.8, -0.8]) +
      txt(18, 21.6, 'POW!', 9.6, '#FFFFFF', { sw: 2.4, extra: 'textLength="24" lengthAdjust="spacingAndGlyphs" transform="rotate(-8 18 18)"' }),
    ),
  );
  out.push(
    asset('fx_ko', 32, 14, 0.5, 0.5, (d) => {
      let s = S(ell(16, 7.6, 13.4, 4.2), 0.9, '#FFFFFF', 'opacity="0.7" stroke-dasharray="2 2"');
      const stars: [number, number, number][] = [[4, 7, 2.6], [11, 4, 2.2], [21, 4.2, 2.2], [28, 7.4, 2.6], [16, 11, 3.2]];
      for (const [x, y, r] of stars) s += d.shaded(poly(starPts(x, y, r, r * 0.45)), '#FFE14D', '#F2A900', 0.9, [-0.4, -0.4]);
      return s;
    }),
  );
  out.push(
    asset('fx_heal', 20, 20, 0.5, 1, (d) => {
      const plus = 'M7,1.6H13V7H18.4V13H13V18.4H7V13H1.6V7H7Z';
      return d.shaded(plus, '#5BE08A', '#21A85A', 1.6, [-1, -1]) + hl(8.6, 4.6, 1, 2, 0, 0.8);
    }),
  );
  out.push(
    asset('fx_flag', 28, 28, 0.5, 1, (d) => {
      let s = P(rrect(4.6, 2, 2.8, 25, 1.2), '#A8693A', 1.4) + P(ell(6, 2.2, 2), '#FFC83D', 1.2);
      const flag = 'M7.4,4C12,1.4 15,6.6 19.6,4.4C22,3.4 24,3.4 26,4.6C24.6,8 25.2,12 26.4,15C22,13 19.6,17.4 14.6,16C11.6,15.2 9.6,15.6 7.4,16.8Z';
      s += d.shaded(flag, '#FFFFFF', '#D8DEE6', 1.6, [-0.8, -0.8]);
      s += S('M11,8c3,1.4 6,-1 9,0.6M11,12c3,1.4 5,-1 8,0.4', 0.7, '#B9C2CC');
      return s;
    }),
  );
  out.push(
    asset('fx_recipe', 30, 30, 0.5, 1, (d) => {
      let s = `<g transform="rotate(-8 15 15)">`;
      s += d.shaded(rrect(5, 3, 20, 25, 2), '#FFF4DC', '#E8D5AE', 1.6, [-0.8, -0.8]);
      s += P(rrect(5, 3, 20, 7, 2), '#B3263A', 1.4) + txt(15, 8.6, 'RECIPE', 4.4, '#FFFFFF', { extra: 'textLength="15" lengthAdjust="spacingAndGlyphs"' });
      for (let k = 0; k < 4; k++) s += S(`M8.4,${14 + k * 3.4}h${k % 2 ? 9 : 12}`, 1, '#B9A88C');
      s += '</g>';
      // fork
      s += `<g transform="rotate(28 22 20)">` + P(rrect(20.8, 14, 2.4, 14, 1.2), '#C9D2DC', 1.1) + P('M18.4,6V12C18.4,15 25.6,15 25.6,12V6', '#C9D2DC', 1.1) + S('M20.8,6v5.6M23.2,6v5.6', 1, OUT) + '</g>';
      s += P(poly(starPts(6, 25, 3.6, 1.6)), '#FFE14D', 0.9);
      return s;
    }),
  );
  const grave = (key: string, glow: string, glowD: string, icon: string) =>
    asset(key, 28, 30, 0.5, 1, (d) => {
      const g = d.radial(14, 15, 14, [[0, glow, 0.75], [1, glow, 0]]);
      let s = P(ell(14, 15, 14), g);
      s += P(ell(14, 27, 10, 2.6), '#5C3A22', 1.2);
      const obel = 'M8,27V9L14,2.6L20,9V27Z';
      s += d.shaded(obel, glow, glowD, 1.6, [-1, -1]);
      s += S('M14,2.6V27', 0.7, glowD, 'opacity="0.6"');
      s += icon;
      s += hl(10.6, 11, 0.8, 2.6, 10, 0.75);
      return s;
    });
  out.push(grave('fx_grave_green', '#5BE08A', '#21A85A', P('M14,22.6c-6,-3.6 -5,-9 -2,-9c1.2,0 2,1 2,1.8c0,-0.8 0.8,-1.8 2,-1.8c3,0 4,5.4 -2,9z', '#FFFFFF', 1.1)));
  out.push(grave('fx_grave_red', '#FF5A5F', '#C42B37', S('M10.4,13.4l2.4,8M13.8,12.6l1.6,8.8M17.4,13.4l-0.6,8', 1.8, '#FFFFFF') + S('M10.4,13.4l2.4,8M13.8,12.6l1.6,8.8M17.4,13.4l-0.6,8', 0.6, OUT, 'opacity="0.4"')));
  out.push(
    asset('fx_headstone', 30, 30, 0.5, 1, (d) => {
      const g = d.radial(15, 14, 15, [[0, '#5BE08A', 0.55], [1, '#5BE08A', 0]]);
      let s = P(ell(15, 14, 15), g);
      s += P(ell(15, 27.4, 12, 2.6), '#5C3A22', 1.2) + S('M5,27c1,-3 2,-3 3,0M21,27c1,-3 2,-3 3,0', 1, '#7CC24A');
      const stone = 'M6,27V12A9,9 0 0 1 24,12V27Z';
      s += d.shaded(stone, '#B5BBC4', '#8A909A', 1.6, [-1, -1]);
      s += S('M9,13.6a6,6 0 0 1 12,0', 0.8, '#8A909A');
      s += P('M12.6,13.4h4.8v3.4h3.4v4.8h-3.4V25h-4.8v-3.4H9.2v-4.8h3.4Z', '#5BE08A', 1.1, '#0F8F4A');
      s += P(poly(starPts(24.6, 6, 2.8, 1.1)), '#FFFFFF', 0.6) + P(poly(starPts(5, 8, 2, 0.8)), '#FFFFFF', 0.6);
      return s;
    }),
  );
  out.push(
    asset('fx_summon', 30, 30, 0.5, 1, (d) => {
      const g = d.radial(15, 15, 15, [[0, '#FF8A1F', 0.55], [1, '#FF8A1F', 0]]);
      let s = P(ell(15, 15, 15), g);
      s += P(ell(15, 27.2, 12, 2.6), '#5C3A22', 1.2);
      const stone = 'M7,27L5.6,10C5.6,5 10,2.4 15,2.4C21,2.4 24.4,5.6 24,11L23,27Z';
      s += d.shaded(stone, '#8C8FA0', '#666A7A', 1.6, [-1, -1]);
      s += S('M8,8l3,2M21,20l-2,3', 0.8, '#5A5D6B');
      // glowing hot-dog rune
      const blurF = d.blur(1.1);
      // hot-dog rune: bun (two lips), sausage poking out both ends, mustard zigzag
      const rune = 'M9.4,15.6C11,22 19,22 20.6,15.6M9.4,15.6C11,18.2 19,18.2 20.6,15.6M7.4,14.6C7.4,11.6 22.6,11.6 22.6,14.6C22.6,17 7.4,17 7.4,14.6Z';
      s += `<path d="${rune}" fill="none" stroke="#FF8A1F" stroke-width="3" filter="${blurF}"/>`;
      s += P('M7.4,14.6C7.4,11.6 22.6,11.6 22.6,14.6C22.6,17 7.4,17 7.4,14.6Z', '#7A3A1A', 1.1, '#FFE14D');
      s += P('M9.4,15.6C11,22 19,22 20.6,15.6C19,18.2 11,18.2 9.4,15.6Z', '#E8A24E', 1.1, '#FFE14D');
      s += S('M10,13.8l1.6,1.2l1.6,-1.2l1.6,1.2l1.6,-1.2l1.6,1.2l1.6,-1.2', 0.9, '#FFE14D');
      s += S('M12,7l1.4,2.4M18,7l-1.4,2.4M15,5.4v3', 1, '#FFE14D');
      return s;
    }),
  );
  return out;
}

export function buildRaidProps(): ArtAsset[] {
  return [
    ...floors(),
    ...rivalWalls(),
    ...signs(),
    fence('fence_l', 'l', false),
    fence('fence_r', 'r', false),
    fence('gate_r', 'r', true),
    bugZapper(),
    zapperBolt(),
    chuckWagon(),
    ...fxIcons(),
    ...buildMapArt(),
  ];
}
