/**
 * Art kit v3 — the "grimy diner" look that matches the original's tone: muted olive / grey / dirty-cream
 * palette, thin warm-black outlines, two-tone cel shading plus soft gradients, and lots of surface texture
 * (speckle, grime, cracks, wood grain). Everything is drawn from scratch; nothing is traced or copied.
 *
 * GRID: one floor tile is a TILE_W x TILE_H diamond with a 1.6 : 1 ratio (steeper than 2:1, like the
 * original's camera). Iso projection: screenX = (gx - gy) * HW, screenY = (gx + gy) * HH.
 */
import { Doc, P, S, f, poly } from '../art/svg';
import type { Pt } from '../art/svg';

export const TILE_W = 96;
export const TILE_H = 60;
export const HW = TILE_W / 2; // 48
export const HH = TILE_H / 2; // 30
/** Back walls are tall: about 3 tile heights, roughly twice a character's height. */
export const WALL_H = 176;
/** Characters stand about this tall (world units). */
export const CHAR_H = 100;

// ---------------------------------------------------------------- palette (muted, dirty, mid-value)
export const INK = '#16120C'; // outlines: warm near-black
export const LW = 1.25; // prop outline width (world units)
export const LW_THIN = 0.8; // interior detail lines
export const PAL = {
  grass: ['#577922', '#4A6615', '#3A4F0F', '#6B8A2C', '#7E9A3A'],
  concrete: '#C6C7C2',
  concreteHi: '#D8D9D4',
  concreteD: '#A6A7A0',
  concreteGap: '#7B7B76',
  asphalt: '#86857F',
  asphaltD: '#6F6E69',
  asphaltHi: '#9A9993',
  lane: '#C9A83A',
  plaster: '#E9DE86', // dirty cream-yellow
  plasterD: '#CDBF62',
  plasterHi: '#F5ECA4',
  grime: '#8A7A50',
  grimeD: '#5E5232',
  blood: '#7A2A22',
  slime: '#6E9A2A',
  slimeD: '#45661A',
  tile: '#CFCFCB',
  tileB: '#DCDCD7',
  grout: '#86867F',
  wood: '#8E6436',
  woodD: '#6A4524',
  woodHi: '#A97A48',
  brick: '#9A4A2A',
  brickD: '#73351D',
  mortar: '#B9AE97',
};

/** Deterministic PRNG for texture scatter. */
export function rnd(seed: number): () => number {
  let s = (seed * 9301 + 49297) % 233280 || 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Tile-local iso helper. (i, j) in tile units around the tile centre, z up in world units. */
export class Iso {
  constructor(
    readonly cx: number,
    readonly cy: number,
  ) {}
  p(i: number, j: number, z = 0): Pt {
    return [this.cx + (i - j) * HW, this.cy + (i + j) * HH - z];
  }
  quad(i0: number, i1: number, j0: number, j1: number, z = 0): Pt[] {
    return [this.p(i0, j0, z), this.p(i1, j0, z), this.p(i1, j1, z), this.p(i0, j1, z)];
  }
  /** Path for a quad. */
  qd(i0: number, i1: number, j0: number, j1: number, z = 0): string {
    return poly(this.quad(i0, i1, j0, j1, z));
  }
  line(a: [number, number, number?], b: [number, number, number?], sw: number, col = INK, extra = ''): string {
    const pa = this.p(a[0], a[1], a[2] ?? 0);
    const pb = this.p(b[0], b[1], b[2] ?? 0);
    return S(`M${f(pa[0])},${f(pa[1])}L${f(pb[0])},${f(pb[1])}`, sw, col, extra);
  }
  /** Ellipse lying flat on the floor (radius in tile units). */
  ell(i: number, j: number, ri: number, rj = ri, z = 0): string {
    const n = 18;
    const pts: Pt[] = [];
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2;
      pts.push(this.p(i + Math.cos(a) * ri, j + Math.sin(a) * rj, z));
    }
    return poly(pts);
  }
}

/** A filled, optionally outlined path in the v3 ink. */
export function F(d: string, fill: string, sw = 0, extra = ''): string {
  return P(d, fill, sw, INK, extra);
}

/** Stroke in the v3 ink (or a colour). */
export function L(d: string, sw: number, col = INK, extra = ''): string {
  return S(d, sw, col, extra);
}

export function dot(x: number, y: number, r: number, fill: string, op = 1): string {
  return `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${fill}"${op < 1 ? ` opacity="${f(op)}"` : ''}/>`;
}

export function op(inner: string, o: number): string {
  return `<g opacity="${f(o)}">${inner}</g>`;
}

/** Irregular blob path (grime, puddles, stains) around (cx, cy) with radii rx, ry. */
export function blob(cx: number, cy: number, rx: number, ry: number, seed: number, lumps = 7, wob = 0.35): string {
  const r = rnd(seed);
  const pts: Pt[] = [];
  for (let k = 0; k < lumps; k++) {
    const a = (k / lumps) * Math.PI * 2;
    const m = 1 - wob / 2 + r() * wob;
    pts.push([cx + Math.cos(a) * rx * m, cy + Math.sin(a) * ry * m]);
  }
  // smooth closed curve through the points (Catmull-Rom -> cubic)
  let d = `M${f(pts[0][0])},${f(pts[0][1])}`;
  for (let k = 0; k < lumps; k++) {
    const p0 = pts[(k - 1 + lumps) % lumps];
    const p1 = pts[k];
    const p2 = pts[(k + 1) % lumps];
    const p3 = pts[(k + 2) % lumps];
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${f(c1[0])},${f(c1[1])} ${f(c2[0])},${f(c2[1])} ${f(p2[0])},${f(p2[1])}`;
  }
  return d + 'Z';
}

/** Speckle: n tiny dots of the given colours scattered inside a clip path. */
export function speckle(doc: Doc, clipD: string, box: [number, number, number, number], n: number, cols: string[], seed: number, rMin = 0.35, rMax = 0.8, opac = 0.8): string {
  const r = rnd(seed);
  let s = '';
  for (let k = 0; k < n; k++) {
    const x = box[0] + r() * box[2];
    const y = box[1] + r() * box[3];
    s += dot(x, y, rMin + r() * (rMax - rMin), cols[k % cols.length], opac * (0.5 + r() * 0.5));
  }
  return doc.clip(clipD, s);
}

/** A jagged crack polyline starting at (x, y) heading roughly along angle a (radians). */
export function crack(x: number, y: number, a: number, len: number, seed: number, sw = 0.7, col = INK, branches = 1): string {
  const r = rnd(seed);
  let d = `M${f(x)},${f(y)}`;
  let cx = x;
  let cy = y;
  const steps = 5 + Math.floor(r() * 3);
  let out = '';
  for (let k = 0; k < steps; k++) {
    const aa = a + (r() - 0.5) * 1.1;
    const l = len / steps;
    cx += Math.cos(aa) * l;
    cy += Math.sin(aa) * l;
    d += `L${f(cx)},${f(cy)}`;
    if (branches > 0 && k === 2) out += crack(cx, cy, a + (r() > 0.5 ? 0.9 : -0.9), len * 0.4, seed + 7, sw * 0.7, col, 0);
  }
  return L(d, sw, col) + out;
}

/** Build a finished v3 asset: Doc + body, anchored at (ox, oy) fractions. */
export function asset(key: string, w: number, h: number, ox: number, oy: number, body: (d: Doc) => string) {
  const d = new Doc(key);
  const inner = body(d);
  return { key, svg: d.build(w, h, inner), w, h, ox, oy };
}
