/**
 * Ground tiles for the corner lot: the café sits on the corner of a crossroads. Along BOTH back walls
 * (north-west and north-east) runs a concrete sidewalk, then a two-lane asphalt road with a dashed
 * yellow centre line, then a far sidewalk; olive grass fills everything else (front lawn included).
 *
 * All ground tiles are (TILE_W + 2) x (TILE_H + 2) with anchor (0.5, 0.5) = tile centre. The diamond is
 * drawn 1 unit oversize so neighbouring tiles overlap and no hairline seams show.
 *
 * Keys: grass_1..grass_6, sidewalk_1..sidewalk_4, road_1..road_3,
 *   overlays (same size/anchor, transparent elsewhere): kerb_ne / kerb_nw / kerb_se / kerb_sw (raised kerb
 *   along that tile edge), lane_ne / lane_nw (dashed yellow centre line along that edge), manhole, drain_ne,
 *   drain_nw, oil_1, oil_2, crack_road, puddle.
 * Edge names: ne = the tile's upper-right edge (toward -gy), nw = upper-left (toward -gx),
 *   se = lower-right (toward +gx), sw = lower-left (toward +gy).
 */
import type { ArtAsset } from '../art/types';
import type { Doc } from '../art/svg';
import { f, poly } from '../art/svg';
import { F, HH, HW, INK, Iso, L, PAL, TILE_H, TILE_W, asset, blob, crack, dot, op, rnd, speckle } from './kit';

const W = TILE_W + 2;
const H = TILE_H + 2;
const CX = W / 2;
const CY = H / 2;
const t = new Iso(CX, CY);
/** Oversized diamond (half-unit bleed) for seamless tiling. */
const BLEED = 0.012;
const DIA = t.qd(-0.5 - BLEED, 0.5 + BLEED, -0.5 - BLEED, 0.5 + BLEED);
const BOX: [number, number, number, number] = [0, 0, W, H];

function tileAsset(key: string, body: (d: Doc) => string): ArtAsset {
  return asset(key, W, H, 0.5, 0.5, body);
}

// ---------------------------------------------------------------- grass
function grass(seed: number) {
  return (d: Doc) => {
    const r = rnd(seed);
    let s = F(DIA, PAL.grass[0]);
    // fine, low-contrast mottling (big bold blotches tiled into polka dots): lots of small soft
    // patches, a couple of broader faint ones, so neighbouring tiles blend into one lawn
    let patches = '';
    for (let k = 0; k < 2; k++) patches += F(blob(10 + r() * (W - 20), 8 + r() * (H - 16), 14 + r() * 10, 7 + r() * 5, seed * 37 + k), k ? PAL.grass[3] : PAL.grass[1], 0, `opacity="${f(0.1 + r() * 0.08)}"`);
    for (let k = 0; k < 6; k++) {
      const x = 4 + r() * (W - 8);
      const y = 3 + r() * (H - 6);
      const col = [PAL.grass[1], PAL.grass[3], PAL.grass[2], PAL.grass[4]][k % 4];
      patches += F(blob(x, y, 2.5 + r() * 5, 1.5 + r() * 3, seed * 31 + k), col, 0, `opacity="${f(0.08 + r() * 0.1)}"`);
    }
    s += d.clip(DIA, patches);
    // grass tufts: little V and W strokes, dark below, light tips
    let tufts = '';
    for (let k = 0; k < 28; k++) {
      const x = 4 + r() * (W - 8);
      const y = 4 + r() * (H - 8);
      const h = 1.6 + r() * 2.4;
      const lean = (r() - 0.5) * 1.6;
      const dark = r() > 0.35;
      const col = dark ? PAL.grass[1] : PAL.grass[3];
      tufts += L(`M${f(x - 1.2)},${f(y)}L${f(x - 1.6 + lean)},${f(y - h)}M${f(x)},${f(y)}L${f(x + lean)},${f(y - h - 0.8)}M${f(x + 1.2)},${f(y)}L${f(x + 1.8 + lean)},${f(y - h * 0.8)}`, 0.55, col, `opacity="${dark ? 0.8 : 0.65}"`);
    }
    // the odd weed flower / pebble
    for (let k = 0; k < 3; k++) {
      const x = 10 + r() * (W - 20);
      const y = 8 + r() * (H - 16);
      tufts += r() > 0.5 ? dot(x, y, 0.8, '#B9A85A', 0.9) : dot(x, y, 0.9, '#8C8A7C', 0.9);
    }
    s += d.clip(DIA, tufts);
    return s;
  };
}

// ---------------------------------------------------------------- sidewalk
function sidewalk(seed: number) {
  return (d: Doc) => {
    const r = rnd(seed);
    let s = F(DIA, PAL.concreteGap);
    // one slab inset from the tile edges: the dark gap shows round it
    const g = 0.035;
    const slab = t.qd(-0.5 + g, 0.5 - g, -0.5 + g, 0.5 - g);
    s += F(slab, PAL.concrete);
    // slight bevel: lit upper-left edges, shaded lower-right edges
    s += L(poly([t.p(-0.5 + g, 0.5 - g), t.p(-0.5 + g, -0.5 + g), t.p(0.5 - g, -0.5 + g)]).replace('Z', ''), 0.9, PAL.concreteHi, 'opacity="0.9"');
    s += L(poly([t.p(0.5 - g, -0.5 + g), t.p(0.5 - g, 0.5 - g), t.p(-0.5 + g, 0.5 - g)]).replace('Z', ''), 0.9, PAL.concreteD, 'opacity="0.9"');
    // concrete speckle + darker weathering
    s += speckle(d, slab, BOX, 70, ['#A9AAA4', '#B5B6B0', '#E2E3DE', '#9C9D97'], seed * 13, 0.3, 0.7, 0.85);
    s += d.clip(slab, F(blob(CX + (r() - 0.5) * 30, CY + (r() - 0.5) * 16, 14 + r() * 10, 6 + r() * 5, seed + 3), PAL.concreteD, 0, 'opacity="0.25"'));
    // only one slab in four is cracked (each at its own angle and length); the rest get a gum spot
    // or nothing, so the walk doesn't repeat the same check-mark crack every tile
    if (seed === 4) s += d.clip(slab, crack(CX - 22 + r() * 16, CY - 6 + r() * 10, -0.6 + r() * 1.4, 16 + r() * 18, seed * 3, 0.5, '#6F6F6A', 1));
    else if (seed === 2) s += dot(CX + (r() - 0.5) * 40, CY + (r() - 0.5) * 20, 1.1, '#8F8F88', 0.8);
    else if (seed === 3) s += d.clip(slab, F(blob(CX + (r() - 0.5) * 30, CY + (r() - 0.5) * 12, 6, 3, seed + 9), '#8F8F88', 0, 'opacity="0.22"'));
    return s;
  };
}

// ---------------------------------------------------------------- road
function road(seed: number) {
  return (d: Doc) => {
    const r = rnd(seed);
    let s = F(DIA, PAL.asphalt);
    let tex = '';
    for (let k = 0; k < 6; k++) tex += F(blob(4 + r() * (W - 8), 4 + r() * (H - 8), 10 + r() * 16, 5 + r() * 8, seed * 17 + k), k % 2 ? PAL.asphaltD : PAL.asphaltHi, 0, `opacity="${f(0.18 + r() * 0.18)}"`);
    s += d.clip(DIA, tex);
    s += speckle(d, DIA, BOX, 110, ['#6A6964', '#A3A29C', '#5C5B56', '#B4B3AD'], seed * 7, 0.25, 0.6, 0.8);
    if (seed === 3) s += d.clip(DIA, crack(CX - 20, CY + 4, -0.2, 34, seed, 0.6, '#4E4D49', 1));
    return s;
  };
}

// ---------------------------------------------------------------- overlays
/** Edge endpoints for a tile edge (in tile-local i, j). */
const EDGE: Record<'ne' | 'nw' | 'se' | 'sw', [[number, number], [number, number], [number, number]]> = {
  // [start, end, inward normal (i, j)]
  ne: [[-0.5, -0.5], [0.5, -0.5], [0, 1]],
  nw: [[-0.5, -0.5], [-0.5, 0.5], [1, 0]],
  se: [[0.5, -0.5], [0.5, 0.5], [-1, 0]],
  sw: [[-0.5, 0.5], [0.5, 0.5], [0, -1]],
};

function kerb(edge: keyof typeof EDGE) {
  return (d: Doc) => {
    const [a, b, n] = EDGE[edge];
    const w = 0.09; // kerb width (tile units)
    const pts = (k: number) => [t.p(a[0] + n[0] * k, a[1] + n[1] * k), t.p(b[0] + n[0] * k, b[1] + n[1] * k)];
    const [o1, o2] = pts(0);
    const [i1, i2] = pts(w);
    const z = 2.2; // raised lip
    const top = poly([
      [o1[0], o1[1] - z],
      [o2[0], o2[1] - z],
      [i2[0], i2[1] - z],
      [i1[0], i1[1] - z],
    ]);
    // the kerb face toward the road + its lit top
    let s = F(poly([o1, o2, [o2[0], o2[1] - z], [o1[0], o1[1] - z]]), '#9C9C96', 0);
    s += F(top, '#D3D4CE', 0);
    s += L(`M${f(o1[0])},${f(o1[1] - z)}L${f(o2[0])},${f(o2[1] - z)}`, 0.6, '#EDEDE8', 'opacity="0.9"');
    s += L(`M${f(o1[0])},${f(o1[1])}L${f(o2[0])},${f(o2[1])}`, 0.7, '#5E5E59', 'opacity="0.7"');
    return d.clip(DIA, s);
  };
}

function lane(edge: 'ne' | 'nw') {
  return (d: Doc) => {
    const [a, b] = EDGE[edge];
    // a single dash centred on the edge, slightly worn
    const t0 = 0.22;
    const t1 = 0.78;
    const lerp = (u: number): [number, number] => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
    const w = 0.035;
    const n = edge === 'ne' ? [0, 1] : [1, 0];
    const q = [lerp(t0), lerp(t1)];
    const quad = poly([
      t.p(q[0][0] - n[0] * w, q[0][1] - n[1] * w),
      t.p(q[1][0] - n[0] * w, q[1][1] - n[1] * w),
      t.p(q[1][0] + n[0] * w, q[1][1] + n[1] * w),
      t.p(q[0][0] + n[0] * w, q[0][1] + n[1] * w),
    ]);
    let s = F(quad, PAL.lane);
    s += speckle(d, quad, BOX, 14, [PAL.asphalt, '#A88A2E'], edge === 'ne' ? 5 : 9, 0.3, 0.7, 0.9);
    return s;
  };
}

function manhole(d: Doc) {
  const c = t.ell(0, 0, 0.2);
  let s = F(c, '#55544F', LW_T);
  s += F(t.ell(0, 0, 0.165), '#64635D');
  for (let k = -2; k <= 2; k++) s += t.line([-0.13, k * 0.05], [0.13, k * 0.05], 0.6, '#45443F');
  s += F(t.ell(0.05, -0.03, 0.025), '#3A3935');
  return op(s, 0.95) + d.clip(c, F(blob(CX + 4, CY - 2, 6, 3, 2), '#7F5A2A', 0, 'opacity="0.25"'));
}
const LW_T = 0.8;

function drain(edge: 'ne' | 'nw') {
  return () => {
    const [a, b, n] = EDGE[edge];
    const m: [number, number] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const along = [b[0] - a[0], b[1] - a[1]];
    const p = (u: number, v: number) => t.p(m[0] + along[0] * u + n[0] * v, m[1] + along[1] * u + n[1] * v);
    const grate = poly([p(-0.14, 0.02), p(0.14, 0.02), p(0.14, 0.12), p(-0.14, 0.12)]);
    let s = F(grate, '#3F3E3A', 0.6);
    for (let k = -3; k <= 3; k++) {
      const [x1, y1] = p(k * 0.035, 0.03);
      const [x2, y2] = p(k * 0.035, 0.11);
      s += L(`M${f(x1)},${f(y1)}L${f(x2)},${f(y2)}`, 0.7, '#77766F');
    }
    return s;
  };
}

function oil(seed: number) {
  return (d: Doc) => d.clip(DIA, F(blob(CX + (seed - 1.5) * 8, CY, 13, 6, seed * 5), '#3E3D39', 0, 'opacity="0.35"') + F(blob(CX + (seed - 1.5) * 8 + 3, CY - 1, 5, 2.2, seed * 5 + 1), '#5A4C7A', 0, 'opacity="0.18"'));
}

function puddle(d: Doc) {
  const p = blob(CX, CY + 2, 16, 6, 44);
  return d.clip(DIA, F(p, '#5E6A70', 0, 'opacity="0.55"') + L(p, 0.6, '#9FB0B6', 'opacity="0.5"') + F(blob(CX - 5, CY, 5, 1.4, 45), '#C9D6DA', 0, 'opacity="0.45"'));
}

export function buildGround(): ArtAsset[] {
  const out: ArtAsset[] = [];
  [1, 2, 3, 4, 5, 6].forEach((n) => out.push(tileAsset(`grass_${n}`, grass(n))));
  [1, 2, 3, 4].forEach((n) => out.push(tileAsset(`sidewalk_${n}`, sidewalk(n))));
  [1, 2, 3].forEach((n) => out.push(tileAsset(`road_${n}`, road(n))));
  (['ne', 'nw', 'se', 'sw'] as const).forEach((e) => out.push(tileAsset(`kerb_${e}`, kerb(e))));
  (['ne', 'nw'] as const).forEach((e) => out.push(tileAsset(`lane_${e}`, lane(e))));
  (['ne', 'nw'] as const).forEach((e) => out.push(tileAsset(`drain_${e}`, drain(e))));
  out.push(tileAsset('manhole', manhole));
  out.push(tileAsset('oil_1', oil(1)));
  out.push(tileAsset('oil_2', oil(2)));
  out.push(tileAsset('puddle', puddle));
  out.push(tileAsset('crack_road', (d) => d.clip(DIA, crack(CX - 22, CY - 2, 0.15, 40, 21, 0.7, '#4A4945', 1))));
  return out;
}

export { HW, HH, INK };
