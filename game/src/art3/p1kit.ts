/**
 * P1 helpers (kitchen + furniture): solid primitives on the tile-local Iso (boxes, tapered boxes,
 * extruded polygons, vertical and horizontal cylinders), face-local drawing frames, colour mixing and the
 * grime / metal / wood textures shared by kitchen.ts and furniture.ts.
 *
 * Conventions (see kit.ts): i, j are tile units around the tile centre, z is up in world (screen) units.
 * The camera looks toward -i -j, so the visible side faces of a box are the FRONT face (j = j1, screen
 * lower-left, lit) and the SIDE face (i = i1, screen lower-right, in shadow). Light comes from the upper left.
 */
import type { Doc, Pt } from '../art/svg';
import { capsule, ell, f, hull, poly } from '../art/svg';
import { F, HH, HW, INK, Iso, L, LW, PAL, blob, dot, rnd } from './kit';

export type Box = [i0: number, i1: number, j0: number, j1: number, z0: number, z1: number];
export type Rect4 = [i0: number, i1: number, j0: number, j1: number];
export interface Tone {
  top: string;
  front: string;
  side: string;
}

// ---------------------------------------------------------------- colour
function rgb(h: string): [number, number, number] {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function hex(c: number[]): string {
  return '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('').toUpperCase();
}
export function mix(a: string, b: string, t: number): string {
  const A = rgb(a);
  const B = rgb(b);
  return hex(A.map((v, k) => v + (B[k] - v) * t));
}
/** Warm deep tone everything darkens toward (never pure black). */
export const DEEP = '#2A2016';
export function dk(c: string, t: number): string {
  return mix(c, DEEP, t);
}
export function lt(c: string, t: number): string {
  return mix(c, '#FFFBEA', t);
}
/** Top / front / side tones from one base colour (light from the upper left). */
export function tone(base: string, top = 0.12, side = 0.3, front = 0.06): Tone {
  return { top: lt(base, top), front: dk(base, front), side: dk(base, side) };
}

// ---------------------------------------------------------------- shared materials
export const ENAMEL = '#F4F4F0'; // white enamel: the original's fridges and stoves are #FFFFFF / #EEEEEE / #DDDDDD
export const CAST = '#2E2B26';
export const CAST_HI = '#5A564C';
export const CHROME = '#BFC3C1';
export const CHROME_D = '#7F8584';
export const CHROME_HI = '#F2F2EC';
export const STEEL: Tone = { top: '#BDBFB8', front: '#A2A59E', side: '#7A7D77' };
export const RUST = '#8A4A22';
export const RUST_D = '#5E2E14';
export const RUST_HI = '#B0703A';
export const BONE = '#D6CDAE';
export const BONE_D = '#A89C78';
export const TOXIC = '#9BD62E';
export const TOXIC_D = '#5E8F1C';

// ---------------------------------------------------------------- geometry
/** Image height for a 1x1 object whose highest point is z, reaching back to i + j = -2 * far. */
export function hFor(z: number, far = 0.5): number {
  return Math.ceil(HH + 4 + far * 2 * HH + z + 4);
}

export function pts(t: Iso, list: [number, number, number][]): Pt[] {
  return list.map(([i, j, z]) => t.p(i, j, z));
}

/** Screen-space ellipse for a horizontal circle of radius r (tile units) at (i, j, z). */
export function disc(t: Iso, i: number, j: number, z: number, r: number): { cx: number; cy: number; rx: number; ry: number; d: string } {
  const [cx, cy] = t.p(i, j, z);
  const rx = r * Math.SQRT2 * HW;
  const ry = r * Math.SQRT2 * HH;
  return { cx, cy, rx, ry, d: ell(cx, cy, rx, ry) };
}

/** Faces of a (possibly tapered) box: lo = footprint at z0, hi = footprint at z1. */
export function faces(t: Iso, lo: Rect4, hi: Rect4, z0: number, z1: number) {
  const [a0, a1, b0, b1] = lo;
  const [c0, c1, e0, e1] = hi;
  const top = t.qd(c0, c1, e0, e1, z1);
  const front = poly([t.p(a0, b1, z0), t.p(a1, b1, z0), t.p(c1, e1, z1), t.p(c0, e1, z1)]);
  const side = poly([t.p(a1, b1, z0), t.p(a1, b0, z0), t.p(c1, e0, z1), t.p(c1, e1, z1)]);
  const all: Pt[] = [t.p(a0, b0, z0), t.p(a1, b0, z0), t.p(a1, b1, z0), t.p(a0, b1, z0), t.p(c0, e0, z1), t.p(c1, e0, z1), t.p(c1, e1, z1), t.p(c0, e1, z1)];
  return { top, front, side, sil: poly(hull(all)) };
}

export interface BoxOpt {
  sw?: number;
  inner?: number;
  top?: boolean;
  grad?: number;
  hi?: boolean;
}

/** A tapered box (lo footprint at z0, hi footprint at z1). Filled faces, thin inner edges, outer silhouette. */
export function tbox(d: Doc, t: Iso, lo: Rect4, hi: Rect4, z0: number, z1: number, tn: Tone, o: BoxOpt = {}): string {
  const fc = faces(t, lo, hi, z0, z1);
  const sw = o.sw ?? LW;
  const inner = o.inner ?? Math.min(0.7, sw * 0.6);
  let s = F(fc.front, tn.front) + F(fc.side, tn.side);
  const grad = o.grad ?? 0.22;
  if (grad > 0 && z1 - z0 > 5) {
    const a = t.p(hi[1], hi[3], z0);
    const b = t.p(hi[1], hi[3], z1);
    const g = d.linear(a[0], a[1], b[0], b[1], [
      [0, DEEP, grad],
      [0.45, DEEP, grad * 0.25],
      [1, '#FFFFFF', 0.05],
    ]);
    s += F(fc.front, g) + F(fc.side, g);
  }
  if (o.top !== false) s += F(fc.top, tn.top);
  const [c0, c1, e0, e1] = hi;
  // inner edges + a light bevel on the top-front edge
  s += L(`M${pp(t.p(lo[1], lo[3], z0))}L${pp(t.p(c1, e1, z1))}`, inner, INK);
  if (o.top !== false) {
    s += L(`M${pp(t.p(c0, e1, z1))}L${pp(t.p(c1, e1, z1))}L${pp(t.p(c1, e0, z1))}`, inner, INK);
    if (o.hi !== false && z1 - z0 > 2) s += L(`M${pp(t.p(c0 + 0.02, e1, z1 - 0.7))}L${pp(t.p(c1 - 0.01, e1, z1 - 0.7))}`, 0.5, '#FFFFFF', 'opacity="0.35"');
  }
  s += F(fc.sil, 'none', sw);
  return s;
}

export function box(d: Doc, t: Iso, b: Box, tn: Tone, o: BoxOpt = {}): string {
  const r: Rect4 = [b[0], b[1], b[2], b[3]];
  return tbox(d, t, r, r, b[4], b[5], tn, o);
}

/** Thin vertical post (leg) as a box without a top, cheap outline. */
export function post(d: Doc, t: Iso, i: number, j: number, w: number, z0: number, z1: number, tn: Tone, sw = 0.9): string {
  return box(d, t, [i - w / 2, i + w / 2, j - w / 2, j + w / 2, z0, z1], tn, { sw, inner: 0.45, grad: 0.15, hi: false });
}

export function pp(p: Pt): string {
  return `${f(p[0])},${f(p[1])}`;
}
export function seg(t: Iso, a: [number, number, number], b: [number, number, number]): string {
  return `M${pp(t.p(a[0], a[1], a[2]))}L${pp(t.p(b[0], b[1], b[2]))}`;
}

/** Extruded polygon (pts in i, j order, any winding), visible side faces shaded by their normal. */
export function prism(d: Doc, t: Iso, poly2: [number, number][], z0: number, z1: number, tn: Tone, sw = LW): { svg: string; top: string } {
  const n = poly2.length;
  let area = 0;
  for (let k = 0; k < n; k++) {
    const [a, b] = poly2[k];
    const [c, e] = poly2[(k + 1) % n];
    area += a * e - c * b;
  }
  const sgn = area > 0 ? 1 : -1;
  const sides: { depth: number; s: string }[] = [];
  for (let k = 0; k < n; k++) {
    const [a, b] = poly2[k];
    const [c, e] = poly2[(k + 1) % n];
    // outward normal for a CCW polygon (in i/j axes) is (de, -di)
    let ni = (e - b) * sgn;
    let nj = -(c - a) * sgn;
    const ln = Math.hypot(ni, nj) || 1;
    ni /= ln;
    nj /= ln;
    if (ni + nj <= 0.02) continue;
    const k01 = Math.max(0, Math.min(1, (ni - nj + 1) / 2));
    const col = mix(tn.front, tn.side, k01);
    const face = poly([t.p(a, b, z0), t.p(c, e, z0), t.p(c, e, z1), t.p(a, b, z1)]);
    sides.push({ depth: a + b + c + e, s: F(face, col, 0.55) });
  }
  sides.sort((x, y) => x.depth - y.depth);
  const top = poly(poly2.map(([a, b]) => t.p(a, b, z1)));
  const all: Pt[] = [];
  for (const [a, b] of poly2) all.push(t.p(a, b, z0), t.p(a, b, z1));
  let s = sides.map((x) => x.s).join('');
  const a0 = t.p(0, 0, z0);
  const a1 = t.p(0, 0, z1);
  if (z1 - z0 > 5) {
    const g = d.linear(a0[0], a0[1], a1[0], a1[1], [
      [0, DEEP, 0.2],
      [1, DEEP, 0],
    ]);
    s += d.clip(poly(hull(all)), F(poly(hull(all)), g));
  }
  s += F(top, tn.top, 0.6) + F(poly(hull(all)), 'none', sw);
  return { svg: s, top };
}

/** Vertical cylinder; returns the svg and the top ellipse. Body gets a left-lit horizontal gradient. */
export function cyl(d: Doc, t: Iso, i: number, j: number, r: number, z0: number, z1: number, tn: Tone, sw = LW): { svg: string; top: ReturnType<typeof disc>; body: string } {
  const bot = disc(t, i, j, z0, r);
  const top = disc(t, i, j, z1, r);
  const { cx, rx, ry } = bot;
  const body = `M${f(cx - rx)},${f(top.cy)}L${f(cx - rx)},${f(bot.cy)}A${f(rx)},${f(ry)} 0 0 0 ${f(cx + rx)},${f(bot.cy)}L${f(cx + rx)},${f(top.cy)}A${f(rx)},${f(ry)} 0 0 0 ${f(cx - rx)},${f(top.cy)}Z`;
  const g = d.linear(cx - rx, 0, cx + rx, 0, [
    [0, tn.front],
    [0.3, lt(tn.front, 0.12)],
    [0.62, tn.front],
    [1, tn.side],
  ]);
  let s = F(body, g);
  if (z1 - z0 > 5) {
    const g2 = d.linear(0, bot.cy + ry, 0, top.cy, [
      [0, DEEP, 0.25],
      [0.5, DEEP, 0.05],
      [1, DEEP, 0],
    ]);
    s += F(body, g2);
  }
  s += F(body, 'none', sw) + F(top.d, tn.top, sw);
  return { svg: s, top, body };
}

/** Ring of points of a horizontal cylinder lying along i (cross-section in the j-z plane). */
export function ringI(t: Iso, i: number, cj: number, cz: number, rj: number, rz: number, n = 28): Pt[] {
  const out: Pt[] = [];
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2;
    out.push(t.p(i, cj + Math.cos(a) * rj, cz + Math.sin(a) * rz));
  }
  return out;
}

// ---------------------------------------------------------------- face-local frames
/**
 * Draw `inner` in a frame glued to a FRONT face (the plane j = j1): x runs right along the face in screen
 * units starting at i = i0, y runs DOWN from height z.
 */
export function onFront(t: Iso, i0: number, j1: number, z: number, inner: string): string {
  const [x, y] = t.p(i0, j1, z);
  return `<g transform="matrix(1 ${f(HH / HW)} 0 1 ${f(x)} ${f(y)})">${inner}</g>`;
}
/** Same for a SIDE face (the plane i = i1): x runs right along the face starting at j = j1 (its left edge). */
export function onSide(t: Iso, i1: number, j1: number, z: number, inner: string): string {
  const [x, y] = t.p(i1, j1, z);
  return `<g transform="matrix(1 ${f(-HH / HW)} 0 1 ${f(x)} ${f(y)})">${inner}</g>`;
}
/** Screen width of a face spanning `u` tile units. */
export const FU = HW;

// ---------------------------------------------------------------- textures
/** Soft contact shadow under a footprint. */
export function shadow(d: Doc, t: Iso, i0: number, i1: number, j0: number, j1: number, o = 0.3): string {
  return F(t.qd(i0, i1, j0, j1), '#1E1A10', 0, `opacity="${f(o)}" filter="${d.blur(1.4)}"`);
}
export function shadowDisc(d: Doc, t: Iso, i: number, j: number, r: number, o = 0.3): string {
  return F(disc(t, i, j, 0, r).d, '#1E1A10', 0, `opacity="${f(o)}" filter="${d.blur(1.4)}"`);
}

/** Brushed-metal streaks inside clip `clipD`, mostly vertical (dx = horizontal lean per line). */
export function streaks(d: Doc, clipD: string, x0: number, y0: number, w: number, h: number, n: number, seed: number, lean = 0, o = 0.35): string {
  const r = rnd(seed);
  let s = '';
  for (let k = 0; k < n; k++) {
    const x = x0 + r() * w;
    const y = y0 + r() * h * 0.6;
    const len = h * (0.25 + r() * 0.6);
    const light = r() > 0.45;
    s += L(`M${f(x)},${f(y)}L${f(x + lean * len)},${f(y + len)}`, 0.35 + r() * 0.6, light ? '#FFFFFF' : '#3A3A34', `opacity="${f(o * (light ? 0.9 : 0.6) * (0.4 + r() * 0.6))}"`);
  }
  return d.clip(clipD, s);
}

/** Rust bloom around (x, y). */
export function rust(x: number, y: number, s: number, seed: number): string {
  const r = rnd(seed);
  let o = F(blob(x, y, s * 1.2, s * 0.8, seed, 8, 0.6), RUST, 0, 'opacity="0.75"');
  o += F(blob(x + s * 0.2, y + s * 0.1, s * 0.6, s * 0.45, seed + 1, 7, 0.6), RUST_D, 0, 'opacity="0.8"');
  for (let k = 0; k < 7; k++) o += dot(x + (r() - 0.5) * s * 3, y + (r() - 0.5) * s * 2, 0.3 + r() * 0.5, k % 2 ? RUST_HI : RUST_D, 0.8);
  return o;
}

/** A rust drip running down from (x, y). */
export function rustDrip(x: number, y: number, len: number, w = 1.2): string {
  return F(`M${f(x - w)},${f(y)}Q${f(x - w * 0.6)},${f(y + len * 0.7)} ${f(x)},${f(y + len)}Q${f(x + w * 0.6)},${f(y + len * 0.7)} ${f(x + w)},${f(y)}Z`, RUST, 0, 'opacity="0.6"');
}

/** Grime smear (blob) — call inside a clip. */
export function smear(x: number, y: number, rx: number, ry: number, seed: number, col: string = PAL.grimeD, o = 0.35): string {
  return F(blob(x, y, rx, ry, seed, 8, 0.5), col, 0, `opacity="${f(o)}"`);
}

/** Short scratches inside a box (screen space). */
export function scratches(x0: number, y0: number, w: number, h: number, n: number, seed: number, col = '#FFFFFF', o = 0.45, len = 4): string {
  const r = rnd(seed);
  let s = '';
  for (let k = 0; k < n; k++) {
    const x = x0 + r() * w;
    const y = y0 + r() * h;
    const a = -0.6 + r() * 1.2;
    const l = len * (0.5 + r());
    s += L(`M${f(x)},${f(y)}l${f(Math.cos(a) * l)},${f(Math.sin(a) * l * 0.6)}`, 0.35, col, `opacity="${f(o * (0.5 + r() * 0.5))}"`);
  }
  return s;
}

/** A housefly. */
export function fly(x: number, y: number, s = 1): string {
  return (
    F(`M${f(x - 2.4 * s)},${f(y - 1.4 * s)}q${f(1.6 * s)},${f(-1.8 * s)} ${f(2.2 * s)},${f(1 * s)}z`, '#E8F0F2', 0.35, 'opacity="0.85"') +
    F(`M${f(x + 2.4 * s)},${f(y - 1.4 * s)}q${f(-1.6 * s)},${f(-1.8 * s)} ${f(-2.2 * s)},${f(1 * s)}z`, '#E8F0F2', 0.35, 'opacity="0.85"') +
    dot(x, y, 1.05 * s, '#1E1E1A') +
    dot(x - 0.4 * s, y - 0.3 * s, 0.35 * s, '#7A2A22')
  );
}

/** Cockroach seen from above, heading angle a (degrees, 0 = screen right). */
export function roach(x: number, y: number, a: number, s = 1): string {
  const body = F(`M-3,0C-3,-1.7 -1,-2.3 1,-2C2.8,-1.6 3.6,-0.8 3.6,0C3.6,0.8 2.8,1.6 1,2C-1,2.3 -3,1.7 -3,0Z`, '#4A2A16', 0.45);
  const legs = L('M-1,-1.8L-2.6,-3.4M0.8,-1.9L0.4,-3.8M2.2,-1.4L3.4,-3M-1,1.8L-2.6,3.4M0.8,1.9L0.4,3.8M2.2,1.4L3.4,3M3.4,-0.5L5.6,-2.2M3.4,0.5L5.6,2.2', 0.3, INK);
  const shine = L('M-1.6,-0.6L1.8,-0.9', 0.4, '#9A6A44', 'opacity="0.8"') + L('M0.6,-1.8L0.6,1.8', 0.3, '#24140A');
  return `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(a)}) scale(${f(s)} ${f(s * 0.75)})">${legs}${body}${shine}</g>`;
}

/** Bone between two screen points (capsule shaft with knobbly ends). */
export function bone(a: Pt, b: Pt, w: number, col = BONE, colD = BONE_D, sw = 0.8): string {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const ln = Math.hypot(dx, dy) || 1;
  const nx = (-dy / ln) * w * 0.55;
  const ny = (dx / ln) * w * 0.55;
  const ux = (dx / ln) * w * 0.2;
  const uy = (dy / ln) * w * 0.2;
  let s = '';
  // knobs (outlined first so the shaft overlaps them cleanly)
  for (const [p, u] of [
    [a, -1],
    [b, 1],
  ] as [Pt, number][]) {
    s += F(ell(p[0] + nx + ux * u, p[1] + ny + uy * u, w * 0.55), col, sw) + F(ell(p[0] - nx + ux * u, p[1] - ny + uy * u, w * 0.55), colD, sw);
  }
  s += F(capsule(a, b, w * 0.8, w * 0.7), col, sw);
  s += L(`M${f(a[0] - nx * 0.4)},${f(a[1] - ny * 0.4)}L${f(b[0] - nx * 0.4)},${f(b[1] - ny * 0.4)}`, w * 0.25, colD, 'opacity="0.7"');
  s += L(`M${f(a[0] + nx * 0.3 + ux * 2)},${f(a[1] + ny * 0.3 + uy * 2)}L${f(a[0] + nx * 0.3 + dx * 0.5)},${f(a[1] + ny * 0.3 + dy * 0.5)}`, 0.4, '#FFFFFF', 'opacity="0.5"');
  return s;
}

/** Biohazard-ish trefoil warning mark (original drawing), centred at 0,0, radius ~r. */
export function hazard(r: number, col: string, bg: string): string {
  let s = F(ell(0, 0, r * 1.15), bg, 0.6);
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2 - Math.PI / 2;
    const cx = Math.cos(a) * r * 0.42;
    const cy = Math.sin(a) * r * 0.42;
    s += F(ell(cx, cy, r * 0.42), col);
    s += F(ell(cx + Math.cos(a) * r * 0.16, cy + Math.sin(a) * r * 0.16, r * 0.27), bg);
  }
  s += F(ell(0, 0, r * 0.22), bg) + F(ell(0, 0, r * 0.14), col);
  return s;
}

/** A slimy green hand print (palm at x, y), screen space. */
export function handprint(x: number, y: number, s = 1, col = PAL.slime): string {
  let o = F(blob(x, y, 3.2 * s, 3.6 * s, 41), col, 0, 'opacity="0.8"');
  const fingers: [number, number, number][] = [
    [-2.6, -3.5, -0.5],
    [-1, -5.2, -0.15],
    [0.8, -5.4, 0.1],
    [2.4, -4.6, 0.35],
    [3.8, -0.8, 1.1],
  ];
  for (const [dx, dy, a] of fingers) {
    const p1: Pt = [x + dx * s * 0.55, y + dy * s * 0.45];
    const p2: Pt = [x + (dx + Math.sin(a) * 3) * s, y + (dy - Math.cos(a) * 3) * s];
    o += F(capsule(p1, p2, 1.5 * s, 1.3 * s), col, 0, 'opacity="0.8"');
  }
  o += L(`M${f(x - 1)},${f(y + 3 * s)}q0.3,3 0,${f(6 * s)}`, 1 * s, col, 'opacity="0.7"');
  return o;
}

