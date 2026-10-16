/**
 * Dishes v3 — every recipe served on a chipped, grimy diner plate seen at the café's 1.6 : 1 iso angle.
 * BBQ-joint food made gross-funny: eyeball garnishes, floating fingers, toes in tacos, a brain patty.
 *
 * FRAME: `dish_<id>` is DISH_W x DISH_H (36 x 26), anchor (0.5, 0.62) = the plate centre. The plate is an
 * ellipse PRX x PRY (1.6 : 1) with a bold rim so it reads at the ~36 px it is shown on tables and counters.
 * `plate_dirty` uses the same frame. `plate_stack` (a pile of dirty plates being carried) is 36 x 34 with
 * the anchor (0.5, 0.71) at the centre of the bottom plate.
 */
import type { ArtAsset } from '../art/types';
import type { Doc, Pt } from '../art/svg';
import { capsule, f, poly } from '../art/svg';
import { F, INK, L, asset, blob, crack, dot, rnd, speckle } from './kit';

export const DISH3_IDS = [
  // basic (stove)
  'sliders', 'hobodog', 'gumbo', 'tacos', 'lasagut', 'broth', 'meatloaf', 'goulash',
  // grill
  'burger', 'wings', 'kebab', 'smash', 'chili', 'salad',
  // smoker
  'pork', 'ribs', 'brisket', 'foie',
  // fryer
  'rings', 'nuggets', 'fries', 'chicken',
] as const;
export type Dish3Id = (typeof DISH3_IDS)[number];

export const DISH_W = 36;
export const DISH_H = 26;
const OY = 0.62;
const CX = DISH_W / 2;
const CY = DISH_H * OY; // 16.12
const PRX = 13.3;
const PRY = 8.3;
const RIM_W = 1.2;

// ---------------------------------------------------------------- shared colours
type Tone = [string, string];
const SKIN: Tone = ['#B3B294', '#968E6F'];
const ZSKIN: Tone = ['#88BB44', '#427E40'];
const BONE: Tone = ['#DDD3B4', '#AA9E78'];
const BUN: Tone = ['#C08A44', '#8E5E2A'];
const PATTY: Tone = ['#5E3822', '#3A2214'];
const FRIED: Tone = ['#C89A4C', '#94672C'];
const BRAIN: Tone = ['#C48C88', '#94605E'];
const BLOOD = '#7E2418';
const SLIME: Tone = ['#86AC34', '#4F7020'];
const LETTUCE: Tone = ['#7E9C38', '#526C24'];
const CHEESE = '#D6AC3C';

// ---------------------------------------------------------------- small helpers

/** Rotated ellipse as a polygon path (so it can be clipped / cel-shaded like any path). */
export function rell(cx: number, cy: number, rx: number, ry: number, rot = 0, n = 22): string {
  const a0 = (rot * Math.PI) / 180;
  const ca = Math.cos(a0);
  const sa = Math.sin(a0);
  const pts: Pt[] = [];
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2;
    const x = Math.cos(a) * rx;
    const y = Math.sin(a) * ry;
    pts.push([cx + x * ca - y * sa, cy + x * sa + y * ca]);
  }
  return poly(pts);
}

/** Two-tone cel fill in the v3 ink: shadow everywhere, base shifted up-left, then the outline. */
export function cel(d: Doc, path: string, base: string, shade: string, sw = 0.6, off: Pt = [-0.6, -0.6]): string {
  const id = d.clipId(path);
  return (
    F(path, shade) +
    `<g clip-path="url(#${id})"><path d="${path}" fill="${base}" transform="translate(${f(off[0])} ${f(off[1])})"/></g>` +
    (sw > 0 ? L(path, sw) : '')
  );
}

/** Small white glint. */
export function gloss(x: number, y: number, rx: number, ry: number, rot = -25, o = 0.55): string {
  return F(rell(x, y, rx, ry, rot, 12), '#FFFDF0', 0, `opacity="${f(o)}"`);
}

/** Tiny housefly. */
export function fly(x: number, y: number, s = 1): string {
  return (
    F(rell(x - 0.7 * s, y - 0.7 * s, 0.9 * s, 0.5 * s, -35, 10), '#E8EEF0', 0.25, 'opacity="0.8"') +
    F(rell(x + 0.7 * s, y - 0.7 * s, 0.9 * s, 0.5 * s, 35, 10), '#E8EEF0', 0.25, 'opacity="0.8"') +
    F(rell(x, y, 0.75 * s, 0.55 * s, 0, 10), '#1E1A14') +
    dot(x + 0.5 * s, y - 0.1 * s, 0.3 * s, '#7A2A22')
  );
}

/** A staring eyeball (sclera, veins, iris, glint). look: [-1..1, -1..1]. */
export function eyeball(d: Doc, x: number, y: number, r: number, look: Pt = [0.3, 0.2], iris = '#5E7A3A', seed = 1): string {
  const rr = rnd(seed);
  const disc = rell(x, y, r, r, 0, 18);
  let s = F(disc, d.radial(x - r * 0.35, y - r * 0.4, r * 1.5, [[0, '#F2EEDC'], [0.6, '#D8D0B4'], [1, '#A89A78']]));
  let v = '';
  for (let k = 0; k < 3; k++) {
    const a = rr() * Math.PI * 2;
    const x0 = x + Math.cos(a) * r;
    const y0 = y + Math.sin(a) * r;
    const mx = x + Math.cos(a + 0.4) * r * 0.6;
    const my = y + Math.sin(a + 0.4) * r * 0.6;
    v += L(`M${f(x0)},${f(y0)}Q${f(mx)},${f(my)} ${f(x + Math.cos(a - 0.3) * r * 0.45)},${f(y + Math.sin(a - 0.3) * r * 0.45)}`, Math.max(0.22, r * 0.1), '#9A2E24', 'opacity="0.8"');
  }
  s += d.clip(disc, v);
  const ix = x + look[0] * r * 0.38;
  const iy = y + look[1] * r * 0.38;
  s += F(rell(ix, iy, r * 0.5, r * 0.5, 0, 14), iris, Math.max(0.2, r * 0.1));
  s += dot(ix, iy, r * 0.24, INK);
  s += dot(ix - r * 0.2, iy - r * 0.22, Math.max(0.25, r * 0.13), '#FFFFFF', 0.9);
  s += L(disc, Math.max(0.4, r * 0.22));
  return s;
}

/** A finger from a (severed stump) to b (nail tip). */
export function finger(d: Doc, a: Pt, b: Pt, w: number, tone: Tone = SKIN, nail = true, stump = true): string {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const ux = (b[0] - a[0]) / len;
  const uy = (b[1] - a[1]) / len;
  const nx = -uy;
  const ny = ux;
  const ang = (Math.atan2(uy, ux) * 180) / Math.PI;
  const path = capsule(a, b, w, w * 0.88);
  let s = cel(d, path, tone[0], tone[1], 0.5, [-0.3 * w, -0.3 * w]);
  for (const t of [0.38, 0.64]) {
    const cx = a[0] + ux * len * t;
    const cy = a[1] + uy * len * t;
    s += L(`M${f(cx + nx * w * 0.32)},${f(cy + ny * w * 0.32)}L${f(cx - nx * w * 0.1)},${f(cy - ny * w * 0.1)}`, 0.28, '#4E4630', 'opacity="0.8"');
  }
  if (nail) {
    const tx = b[0] - ux * w * 0.42;
    const ty = b[1] - uy * w * 0.42;
    s += F(rell(tx, ty, w * 0.4, w * 0.3, ang, 12), '#DCD2B4', 0.28);
    s += F(rell(tx + ux * w * 0.2, ty + uy * w * 0.2, w * 0.18, w * 0.22, ang, 8), '#5A4A30', 0, 'opacity="0.55"');
  }
  if (stump) {
    s += F(rell(a[0], a[1], w * 0.3, w * 0.48, ang, 12), BLOOD, 0.3);
    s += dot(a[0], a[1], w * 0.15, BONE[0]);
  }
  return s;
}

/** Clip `inner` to the union of several paths. */
function clipMany(d: Doc, paths: string[], inner: string): string {
  const id = d.id('c');
  d.def(`<clipPath id="${id}">${paths.map((p) => `<path d="${p}"/>`).join('')}</clipPath>`);
  return `<g clip-path="url(#${id})">${inner}</g>`;
}

/** A bone with knobbly ends. */
export function bone(d: Doc, a: Pt, b: Pt, w: number, tone: Tone = BONE, sw = 0.45): string {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const nx = -(b[1] - a[1]) / len;
  const ny = (b[0] - a[0]) / len;
  const k = w * 0.55;
  const knobs = (p: Pt) => [rell(p[0] + nx * k, p[1] + ny * k, w * 0.72, w * 0.72, 0, 12), rell(p[0] - nx * k, p[1] - ny * k, w * 0.72, w * 0.72, 0, 12)];
  const parts = [capsule(a, b, w, w), ...knobs(a), ...knobs(b)];
  let s = parts.map((p) => L(p, sw * 2)).join('');
  s += parts.map((p) => F(p, tone[1])).join('');
  s += clipMany(d, parts, `<g transform="translate(${f(-w * 0.28)} ${f(-w * 0.34)})">${parts.map((p) => F(p, tone[0])).join('')}</g>`);
  s += L(`M${f(a[0] - nx * w * 0.2)},${f(a[1] - ny * w * 0.2)}L${f(b[0] - nx * w * 0.2)},${f(b[1] - ny * w * 0.2)}`, Math.min(0.35, w * 0.25), tone[1], 'opacity="0.7"');
  return s;
}

/** Folded brain mass (patties, nuggets, daydreams). */
export function brain(d: Doc, cx: number, cy: number, rx: number, ry: number, seed: number, sw = 0.55): string {
  const r = rnd(seed);
  const shape = blob(cx, cy, rx, ry, seed, 11, 0.2);
  let s = cel(d, shape, BRAIN[0], BRAIN[1], 0, [-rx * 0.12, -ry * 0.16]);
  let g = '';
  // central fissure
  g += L(`M${f(cx - rx * 0.1)},${f(cy - ry)}Q${f(cx + rx * 0.08)},${f(cy - ry * 0.2)} ${f(cx - rx * 0.05)},${f(cy + ry * 0.4)}`, Math.max(0.35, rx * 0.06), '#6E3A3C');
  // gyri squiggles
  const n = Math.round(5 + rx * 1.1);
  for (let k = 0; k < n; k++) {
    const x = cx + (r() - 0.5) * rx * 1.7;
    const y = cy + (r() - 0.5) * ry * 1.6;
    const l = rx * (0.25 + r() * 0.25);
    const a = r() * Math.PI;
    const x1 = x + Math.cos(a) * l;
    const y1 = y + Math.sin(a) * l * 0.6;
    g += L(`M${f(x)},${f(y)}q${f((x1 - x) / 2 + (r() - 0.5) * l)},${f((y1 - y) / 2 - l * 0.5)} ${f(x1 - x)},${f(y1 - y)}`, Math.max(0.32, rx * 0.05), '#6E383C', 'opacity="0.9"');
  }
  s += d.clip(shape, g);
  s += gloss(cx - rx * 0.4, cy - ry * 0.45, rx * 0.22, ry * 0.14, -20, 0.45);
  if (sw > 0) s += L(shape, sw);
  return s;
}

/** Glossy slime dollop / drip. */
function slimeBlob(d: Doc, x: number, y: number, rx: number, ry: number, seed: number): string {
  const b = blob(x, y, rx, ry, seed, 6, 0.4);
  return cel(d, b, SLIME[0], SLIME[1], 0.45, [-rx * 0.2, -ry * 0.25]) + gloss(x - rx * 0.35, y - ry * 0.35, rx * 0.25, ry * 0.18, -20, 0.6);
}

function tooth(x: number, y: number, w: number, h: number, rot = 0, col = '#E4DCC0'): string {
  const p = `M${f(-w / 2)},0L${f(-w * 0.42)},${f(h * 0.7)}Q0,${f(h * 1.15)} ${f(w * 0.42)},${f(h * 0.7)}L${f(w / 2)},0Z`;
  return `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)})">${F(p, col, 0.3)}</g>`;
}

/** Sauce smear / drizzle blob, lightly transparent. */
function smear(x: number, y: number, rx: number, ry: number, seed: number, col: string, o = 0.5): string {
  return F(blob(x, y, rx, ry, seed, 7, 0.5), col, 0, `opacity="${f(o)}"`);
}

// ---------------------------------------------------------------- the plate

/** Plate outline points with a couple of chips bitten out of the rim. */
function plateShape(cx: number, cy: number, rx: number, ry: number, seed: number, chips: number): { d: string; chips: Pt[][] } {
  const r = rnd(seed);
  const cs: { a: number; w: number; dp: number }[] = [];
  for (let k = 0; k < chips; k++) cs.push({ a: Math.PI * (0.05 + r() * 0.95) + (k % 2 ? Math.PI : 0) * 0.8, w: 0.12 + r() * 0.06, dp: 0.11 + r() * 0.05 });
  const n = 64;
  const pts: Pt[] = [];
  const chipPts: Pt[][] = cs.map(() => []);
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2;
    let m = 1;
    cs.forEach((c, ci) => {
      let da = Math.abs(a - c.a);
      da = Math.min(da, Math.PI * 2 - da);
      if (da < c.w) {
        // jagged triangular notch
        const t = 1 - da / c.w;
        m -= c.dp * (t > 0.5 ? 1 : t * 2) * (k % 2 ? 1 : 0.8);
        chipPts[ci].push([cx + Math.cos(a) * rx * m, cy + Math.sin(a) * ry * m]);
      }
    });
    pts.push([cx + Math.cos(a) * rx * m, cy + Math.sin(a) * ry * m]);
  }
  return { d: poly(pts), chips: chipPts };
}

interface PlateOpt {
  cx?: number;
  cy?: number;
  chips?: number;
  grime?: number;
  shadow?: boolean;
  /** body colour override for variety (stacks) */
  tint?: [string, string, string];
}

/** The chipped diner plate. Returns the plate art; food goes on top. */
function plate(d: Doc, seed: number, o: PlateOpt = {}): string {
  const cx = o.cx ?? CX;
  const cy = o.cy ?? CY;
  const [cHi, cMid, cLo] = o.tint ?? ['#E8E4D6', '#D2CDBE', '#A9A493'];
  const r = rnd(seed * 7 + 3);
  const top = plateShape(cx, cy, PRX, PRY, seed, o.chips ?? 2);
  let s = '';
  if (o.shadow !== false) s += F(rell(cx + 1.3, cy + 1.25, PRX + 0.3, PRY + 0.2, 0, 24), '#140E08', 0, 'opacity="0.3"');
  // thickness / underside lip
  const under = plateShape(cx, cy + 1.3, PRX, PRY, seed, o.chips ?? 2).d;
  s += F(under, '#8E8A78', 0.6);
  // top surface with a soft light-from-upper-left gradient
  s += F(top.d, d.linear(cx - PRX, cy - PRY, cx + PRX * 0.8, cy + PRY, [[0, cHi], [0.5, cMid], [1, cLo]]));
  // the well: concave, so its upper-left wall is in shade and lower-right wall catches light
  const wrx = PRX * 0.66;
  const wry = PRY * 0.64;
  const well = rell(cx + 0.15, cy + 0.45, wrx, wry, 0, 28);
  s += F(well, d.linear(cx - wrx, cy - wry, cx + wrx, cy + wry, [[0, '#ABA695'], [0.35, cMid], [1, cHi]]));
  s += L(`M${f(cx - wrx + 0.15)},${f(cy + 0.6)}A${f(wrx)},${f(wry)} 0 0 1 ${f(cx + wrx + 0.15)},${f(cy + 0.45)}`, 0.55, '#6E6A5C', 'opacity="0.75"');
  s += L(`M${f(cx + wrx * 0.2)},${f(cy + wry + 0.45)}A${f(wrx)},${f(wry)} 0 0 0 ${f(cx + wrx + 0.1)},${f(cy + 0.6)}`, 0.5, '#FFFFF4', 'opacity="0.55"');
  // a blue diner band just inside the rim, mostly worn off
  s += L(rell(cx, cy + 0.1, PRX * 0.86, PRY * 0.84, 0, 40), 0.5, '#5E7480', 'opacity="0.45" stroke-dasharray="5 1.2 2 2.5 7 1.5"');
  // grime: smears on the rim, crumbs, a hairline crack
  let g = '';
  const gr = o.grime ?? 1;
  for (let k = 0; k < Math.round(2 + gr * 2); k++) {
    const a = r() * Math.PI * 2;
    g += smear(cx + Math.cos(a) * PRX * 0.82, cy + Math.sin(a) * PRY * 0.82, 1.6 + r() * 2.2, 0.8 + r() * 0.9, seed * 13 + k, k % 2 ? '#7A5A30' : '#6E6A3A', 0.18 + 0.12 * gr);
  }
  g += crack(cx + Math.cos(0.4 + r()) * PRX, cy + Math.sin(0.4 + r()) * PRY, -2.3, 4.5, seed * 5, 0.35, '#5E5A4C', 0);
  s += d.clip(top.d, g);
  s += speckle(d, top.d, [cx - PRX, cy - PRY, PRX * 2, PRY * 2], 14, ['#6E5A3A', '#8A7A5A', '#4E4A3A'], seed * 3, 0.18, 0.4, 0.7);
  // rim glint along the upper-left
  s += L(`M${f(cx - PRX * 0.86)},${f(cy - PRY * 0.12)}A${f(PRX * 0.93)},${f(PRY * 0.93)} 0 0 1 ${f(cx - PRX * 0.1)},${f(cy - PRY * 0.93)}`, 0.7, '#FFFFF6', 'opacity="0.7"');
  // chips: exposed unglazed body along the notch
  let chipArt = '';
  for (const c of top.chips) if (c.length > 1) chipArt += L('M' + c.map((p) => `${f(p[0])},${f(p[1])}`).join('L'), 1.6, '#A8987A', 'transform="translate(0.2 0.5)"');
  if (chipArt) s += clipMany(d, [top.d, under], chipArt);
  s += L(top.d, RIM_W);
  return s;
}

// ---------------------------------------------------------------- dish bodies
type Body = (d: Doc, r: () => number) => string;

/** Mini bun-and-patty. */
function slider(d: Doc, x: number, y: number, s: number, seed: number): string {
  const r = rnd(seed);
  let o = '';
  o += F(rell(x, y + 1.6 * s, 3.6 * s, 1.5 * s, 0, 16), BUN[1], 0.5);
  o += cel(d, blob(x, y + 0.6 * s, 4.1 * s, 1.6 * s, seed, 8, 0.2), PATTY[0], PATTY[1], 0.5, [-0.3, -0.4]);
  // lettuce peeking out the front
  o += F(`M${f(x - 3.2 * s)},${f(y + 0.6 * s)}l1,1l1,-0.6l1,0.9l1.1,-0.7l1,0.9l1,-0.6l0.6,0.3`, LETTUCE[0], 0.35);
  const dome = `M${f(x - 3.8 * s)},${f(y + 0.2 * s)}C${f(x - 3.9 * s)},${f(y - 3.6 * s)} ${f(x + 3.9 * s)},${f(y - 3.6 * s)} ${f(x + 3.8 * s)},${f(y + 0.2 * s)}Q${f(x)},${f(y + 1.3 * s)} ${f(x - 3.8 * s)},${f(y + 0.2 * s)}Z`;
  o += cel(d, dome, BUN[0], BUN[1], 0.55, [-0.7 * s, -0.6 * s]);
  o += gloss(x - 1.3 * s, y - 1.7 * s, 1.2 * s, 0.55 * s, -15, 0.35);
  for (let k = 0; k < 4; k++) o += F(rell(x + (r() - 0.5) * 4.5 * s, y - 1.2 * s - r() * 1.2 * s, 0.35, 0.2, r() * 90, 8), '#E6D6A8');
  return o;
}

const DISHES: Record<Dish3Id, Body> = {
  // ---- basic
  sliders: (d) => {
    let s = slider(d, 12.4, 14.4, 0.95, 11) + slider(d, 23.6, 14.4, 0.95, 12) + slider(d, 18, 18.4, 1.05, 13);
    // toothpick through the front slider with a skewered eyeball "olive"
    s += L('M18.3,17.2L19.3,8.4', 0.9, INK) + L('M18.3,17.2L19.3,8.4', 0.5, '#D9C08A');
    s += eyeball(d, 19.4, 8.6, 2.5, [-0.5, 0.4], '#4E6A86', 5);
    s += L('M19.4,7.6L19.7,5.2', 0.9, INK) + L('M19.4,7.6L19.7,5.2', 0.5, '#D9C08A');
    return s;
  },
  hobodog: (d) => {
    let s = '';
    const g = (inner: string) => `<g transform="rotate(-11 18 15.4) translate(18 15.4)">${inner}</g>`;
    // back half of the bun
    let b = cel(d, 'M-10.6,-0.5C-11,-3.6 -8.5,-4 -6,-3.8L6.5,-3.9C9.5,-4 11.2,-3 10.6,-0.4Z', BUN[1], '#704616', 0.55);
    // sausage, sticking out both ends
    const saus = capsule([-13, -1.2], [13.2, -1.4], 3.6, 3.4);
    b += cel(d, saus, '#9A4A2C', '#6A2C18', 0.55, [-0.4, -0.7]);
    for (const x of [-9, -5, 3, 7.5]) b += L(`M${x},-2.6l1.2,2.2`, 0.5, '#3A1A10', 'opacity="0.7"');
    b += gloss(-4, -2.4, 3, 0.4, 0, 0.35);
    // mustard zigzag
    b += L('M-8,-1.8l1.6,-1l1.6,1l1.6,-1l1.6,1l1.6,-1l1.6,1l1.6,-1l1.6,1', 0.75, '#C9A43A');
    // front half: stale bun with mould
    const front = 'M-11,-0.8C-11.4,2.6 -9,3.4 -6,3.4L7,3.4C10,3.4 11.6,2.4 10.9,-0.8Q0,0.6 -11,-0.8Z';
    b += cel(d, front, BUN[0], BUN[1], 0.55, [-0.5, -0.8]);
    let m = '';
    m += F(blob(-6.5, 1.8, 1.8, 0.9, 41, 6, 0.6), '#7E8A5A', 0, 'opacity="0.8"');
    m += F(blob(5.5, 2.2, 1.3, 0.7, 42, 6, 0.6), '#6E7A4A', 0, 'opacity="0.75"');
    m += dot(-5.5, 1.4, 0.35, '#E0E4C8', 0.8) + dot(-7.6, 2.1, 0.3, '#4A5232') + dot(6, 1.8, 0.3, '#4A5232');
    b += d.clip(front, m);
    // band-aid stuck on the bun
    b += `<g transform="translate(1.2 1.2) rotate(-14)">${F('M-3,-0.9H3Q3.6,-0.9 3.6,0V0Q3.6,0.9 3,0.9H-3Q-3.6,0.9 -3.6,0V0Q-3.6,-0.9 -3,-0.9Z', '#C9A27A', 0.4)}${F('M-1,-0.9H1V0.9H-1Z', '#E6D6B4', 0)}${dot(-2.3, -0.3, 0.17, '#8A6A4A')}${dot(-2.3, 0.35, 0.17, '#8A6A4A')}${dot(2.3, -0.3, 0.17, '#8A6A4A')}${dot(2.3, 0.35, 0.17, '#8A6A4A')}${dot(0, 0, 0.35, BLOOD, 0.6)}</g>`;
    s += g(b);
    s += fly(27, 7.6, 1.1);
    return s;
  },
  gumbo: (d) => {
    // speckled blue enamel camp bowl
    const bx = 18;
    const by = 13.4;
    const brx = 9.6;
    const bry = 5.6;
    let s = '';
    const body = `M${f(bx - brx)},${f(by)}C${f(bx - brx + 0.4)},${f(by + 8.2)} ${f(bx + brx - 0.4)},${f(by + 8.2)} ${f(bx + brx)},${f(by)}Z`;
    s += cel(d, body, '#4E6A7A', '#2E4250', 0.6, [-1.2, -0.5]);
    s += speckle(d, body, [bx - brx, by, brx * 2, 7], 16, ['#D8DCD4', '#A8B4B4'], 7, 0.2, 0.4, 0.9);
    s += F(blob(bx + 4, by + 4.2, 1.2, 0.7, 77, 6, 0.6), '#16120C', 0, 'opacity="0.8"'); // enamel chip
    s += F(rell(bx, by, brx, bry, 0, 30), '#D6D2C2', 0.6);
    s += L(rell(bx, by, brx, bry, 0, 30), 0.9, '#2E4250');
    s += L(rell(bx, by, brx, bry, 0, 30), 0.5);
    const soup = rell(bx, by + 0.4, brx - 1.1, bry - 0.9, 0, 30);
    s += F(soup, d.radial(bx - 2, by - 1, brx, [[0, '#A8682C'], [0.7, '#86501E'], [1, '#5E3612']]));
    let fl = '';
    fl += dot(bx - 4, by + 1.4, 0.7, '#C88A3A', 0.7) + dot(bx + 1, by - 2.1, 0.5, '#C88A3A', 0.7) + dot(bx + 5.5, by + 1, 0.55, '#C88A3A', 0.6);
    // okra slices
    for (const [x, y] of [[-4.8, -1.3], [2.8, 2], [-1.2, 2.4]] as Pt[]) fl += F(rell(bx + x, by + y, 1.2, 0.75, 0, 10), '#6E8A3A', 0.35) + dot(bx + x, by + y, 0.3, '#D6D2A8');
    // rice island
    fl += F(blob(bx - 2.2, by + 0.2, 2.1, 1.1, 31, 7, 0.4), '#DCD6C0', 0.35) + dot(bx - 2.5, by, 0.2, '#A89C80') + dot(bx - 1.6, by + 0.4, 0.2, '#A89C80');
    s += d.clip(soup, fl);
    // the floating finger, pointing up out of the stew with a ring of ripples
    s += L(rell(bx + 3.5, by + 0.4, 2.3, 1.1, 0, 18), 0.4, '#C88A3A', 'opacity="0.8"');
    s += finger(d, [bx + 3.4, by + 0.4], [bx + 5.6, by - 7.2], 2.4, ZSKIN, true, false);
    s += F(rell(bx + 3.4, by + 0.5, 1.35, 0.6, 0, 12), '#86501E');
    s += dot(bx + 4.4, by - 4.1, 0.55, '#C9A43A') + L(rell(bx + 4.2, by - 4, 1.35, 0.5, -15, 12), 0.6, '#B8922E'); // wedding ring
    s += dot(bx - 5.6, by - 0.6, 0.6, '#B07A3A', 0.9) + L(rell(bx - 5.6, by - 0.6, 0.6, 0.6, 0, 8), 0.25, '#5E3612');
    return s;
  },
  tacos: (d) => {
    let s = '';
    const taco = (x: number, y: number, rot: number, seed: number, toes: number) => {
      const r = rnd(seed);
      let t = '';
      // back shell edge
      t += F('M-6.8,-0.5C-6,-4.6 6,-4.6 6.8,-0.5Z', '#B08638', 0.5);
      // filling: meat, lettuce, cheese, tomato
      t += cel(d, blob(0, -1.6, 6.2, 2.4, seed, 9, 0.35), '#6E3A22', '#4A2414', 0.45);
      t += F('M-6,-1.4l1.2,-1.6l1,1.1l1.2,-1.7l1,1.2l1.3,-1.6l1,1.3l1.2,-1.5l1.1,1.2l1.2,-1.4l1,1.2l0.8,-0.8l0.2,1.6Z', LETTUCE[0], 0.4);
      for (let k = 0; k < 5; k++) t += F(rell(-4 + r() * 8, -2.4 - r() * 1.2, 0.7, 0.3, r() * 60, 8), CHEESE, 0.2);
      t += F(rell(-2.6, -2.5, 0.8, 0.6, 0, 10), '#A23A2A', 0.3) + F(rell(3.4, -2.2, 0.7, 0.55, 0, 10), '#A23A2A', 0.3);
      // toes poking out of the filling
      for (let k = 0; k < toes; k++) {
        const tx = -1.4 + k * 2.6;
        t += finger(d, [tx, -1.2], [tx + 0.5 + k * 0.4, -4.2], 2.3, SKIN, true, false);
      }
      // front shell: half moon, blistered
      const shell = 'M-7,-0.8A7,5.2 0 0 0 7,-0.8Q0,0.4 -7,-0.8Z';
      t += cel(d, shell, '#D4AC4C', '#A07A2A', 0.6, [-0.6, -0.9]);
      let bl = '';
      for (let k = 0; k < 9; k++) bl += F(rell(-5 + r() * 10, 0.8 + r() * 2.8, 0.5 + r() * 0.4, 0.3, 0, 8), k % 2 ? '#B48A34' : '#E2C26A', 0, 'opacity="0.8"');
      t += d.clip(shell, bl);
      return `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)})">${t}</g>`;
    };
    s += taco(12.6, 16.2, -8, 21, 1);
    s += taco(23.6, 17.6, 7, 22, 2);
    s += smear(17.5, 21.5, 2.2, 0.8, 23, '#8C2A1E', 0.7);
    return s;
  },
  lasagut: (d) => {
    // a thick slab of lasagne, layers showing on the two front faces, intestine coiled on top
    const x0 = 18;
    const y0 = 19.6;
    const P = (i: number, j: number, z: number): Pt => [x0 + (i - j) * 48, y0 + (i + j) * 30 - z];
    const pp = (pts: Pt[]) => poly(pts);
    const I0 = -0.1;
    const I1 = 0.1;
    const J0 = -0.07;
    const J1 = 0.07;
    const Z = 6.5;
    let s = '';
    // left-front face (j = J1) lit, right-front face (i = I1) in shade
    const bands: [number, number, string, string][] = [
      [0, 1.4, '#D2B66A', '#A88E48'],
      [1.4, 2.6, '#8C2E1E', '#6A1E12'],
      [2.6, 3.6, '#DCD4BC', '#B0A890'],
      [3.6, 4.9, '#D2B66A', '#A88E48'],
      [4.9, 6.5, '#7E2A1A', '#5E1C10'],
    ];
    for (const [z0, z1, lit, dk] of bands) {
      s += F(pp([P(I0, J1, z0), P(I1, J1, z0), P(I1, J1, z1), P(I0, J1, z1)]), lit);
      s += F(pp([P(I1, J1, z0), P(I1, J0, z0), P(I1, J0, z1), P(I1, J1, z1)]), dk);
    }
    // meat crumbs in the sauce layers
    for (let k = 0; k < 6; k++) {
      const t = (k + 0.5) / 6;
      const pL = P(I0 + (I1 - I0) * t, J1, 2 + (k % 2) * 3.4);
      s += dot(pL[0], pL[1], 0.45, '#4A1A10', 0.8);
    }
    const sides = pp([P(I0, J1, 0), P(I1, J1, 0), P(I1, J0, 0), P(I1, J0, Z), P(I1, J1, Z), P(I0, J1, Z)]);
    s += L(sides, 0.6);
    s += L(pp([P(I1, J1, 0), P(I1, J1, Z)]), 0.4);
    // top: sauce + bubbly melted cheese
    const topQ = pp([P(I0, J0, Z), P(I1, J0, Z), P(I1, J1, Z), P(I0, J1, Z)]);
    s += F(topQ, '#9A3622', 0.6);
    let ch = '';
    ch += F(blob(...P(-0.02, 0, Z), 6.5, 3, 51, 8, 0.45), '#D8B04A', 0, 'opacity="0.9"');
    ch += dot(...P(-0.06, -0.02, Z), 0.6, '#A8762A', 0.8);
    ch += dot(...P(0.05, 0.03, Z), 0.5, '#A8762A', 0.8);
    s += d.clip(topQ, ch);
    // cheese drip over the front edge
    const e = P(-0.04, J1, Z);
    s += F(`M${f(e[0] - 1.6)},${f(e[1] - 0.4)}q0.4,2.6 1,3.2q0.6,0.4 0.7,-1.2q0.3,-1.4 1.2,-2.2Z`, '#D8B04A', 0.35);
    // coiled intestine on top
    const c = P(0.01, -0.01, Z);
    const coil = `M${f(c[0] - 4.6)},${f(c[1] + 0.4)}C${f(c[0] - 5)},${f(c[1] - 3)} ${f(c[0] + 4.4)},${f(c[1] - 3.4)} ${f(c[0] + 4)},${f(c[1] - 0.4)}C${f(c[0] + 3.6)},${f(c[1] + 1.8)} ${f(c[0] - 2.8)},${f(c[1] + 1.4)} ${f(c[0] - 2.6)},${f(c[1] - 0.8)}C${f(c[0] - 2.4)},${f(c[1] - 2.2)} ${f(c[0] + 2)},${f(c[1] - 2)} ${f(c[0] + 1.6)},${f(c[1] - 0.6)}`;
    s += L(coil, 2.7, INK) + L(coil, 1.9, '#B0706A') + L(coil, 0.55, '#D8A8A0', 'transform="translate(-0.3 -0.45)" opacity="0.8"');
    s += L(`M${f(c[0] + 1.6)},${f(c[1] - 0.6)}l-0.6,1.4`, 0.6, '#B0706A');
    s += fly(27.5, 8.5, 1);
    return s;
  },
  broth: (d) => {
    // galvanised bucket of bone broth with a femur in it
    const bx = 18;
    const ty = 10.2;
    const trx = 7.6;
    const try_ = 3.4;
    const by = 20.2;
    const brx = 6.2;
    let s = '';
    const body = `M${f(bx - trx)},${f(ty)}L${f(bx - brx)},${f(by)}A${f(brx)},${f(try_ * 0.82)} 0 0 0 ${f(bx + brx)},${f(by)}L${f(bx + trx)},${f(ty)}Z`;
    s += F(body, d.linear(bx - trx, 0, bx + trx, 0, [[0, '#7E827C'], [0.25, '#BCC0B8'], [0.45, '#959A92'], [0.8, '#6A6E68'], [1, '#4E524C']]));
    let tx = '';
    for (const v of [0.35, 0.72]) {
      const yy = ty + (by - ty) * v;
      const rx = trx + (brx - trx) * v;
      tx += L(`M${f(bx - rx)},${f(yy)}A${f(rx)},${f(try_ * 0.9)} 0 0 0 ${f(bx + rx)},${f(yy)}`, 0.9, '#5A5E58', 'opacity="0.8"');
      tx += L(`M${f(bx - rx)},${f(yy - 0.5)}A${f(rx)},${f(try_ * 0.9)} 0 0 0 ${f(bx + rx)},${f(yy - 0.5)}`, 0.4, '#D4D8D0', 'opacity="0.7"');
    }
    tx += F(blob(bx + 3.4, by - 1.4, 1.6, 1, 61, 6, 0.6), '#8A5A2A', 0, 'opacity="0.6"');
    tx += F(blob(bx - 4.4, ty + 3.2, 0.9, 0.7, 62, 6, 0.6), '#8A5A2A', 0, 'opacity="0.5"');
    tx += F(`M${f(bx - 1.5)},${f(ty + 1)}q0.5,2.6 0.2,4.2q0.6,0.4 0.9,-0.2q-0.1,-2.2 0.4,-4Z`, '#A08A4A', 0, 'opacity="0.85"'); // drip
    s += d.clip(body, tx);
    s += L(body, 0.65);
    // rim + broth
    s += F(rell(bx, ty, trx, try_, 0, 28), '#A8ACA4', 0.6);
    const soup = rell(bx, ty + 0.3, trx - 0.9, try_ - 0.7, 0, 28);
    s += F(soup, d.radial(bx - 1.5, ty - 0.6, trx, [[0, '#B09A54'], [1, '#7A6630']]));
    s += d.clip(soup, dot(bx - 3, ty + 0.8, 0.55, '#D8C478', 0.8) + dot(bx + 0.5, ty + 1.4, 0.4, '#D8C478', 0.8) + dot(bx - 1.6, ty - 0.8, 0.35, '#D8C478', 0.8));
    // femur sticking out
    s += bone(d, [bx + 1, ty + 0.6], [bx + 7.4, ty - 8.2], 2.1);
    s += F(rell(bx + 1, ty + 0.6, 1.8, 0.7, 0, 12), '#8E7A3E');
    // wire handle
    s += L(`M${f(bx - trx + 0.2)},${f(ty + 0.3)}C${f(bx - trx)},${f(ty - 9.5)} ${f(bx + trx)},${f(ty - 9.5)} ${f(bx + trx - 0.2)},${f(ty + 0.3)}`, 1.1, INK) + L(`M${f(bx - trx + 0.2)},${f(ty + 0.3)}C${f(bx - trx)},${f(ty - 9.5)} ${f(bx + trx)},${f(ty - 9.5)} ${f(bx + trx - 0.2)},${f(ty + 0.3)}`, 0.45, '#9EA29A');
    return s;
  },
  meatloaf: (d) => {
    // a meatloaf grave mound with a zombie hand clawing out of it
    let s = '';
    const loaf = 'M8.2,18.2C7.6,13.6 10.4,10.8 15,10.6L22,10.2C26.4,10.2 28.6,12.6 28.4,16.4C28.2,19.6 25.6,20.6 22.4,20.6L12.6,20.8C10,20.8 8.4,20 8.2,18.2Z';
    s += cel(d, loaf, '#7A4A2C', '#4E2C18', 0.6, [-1.1, -1.4]);
    let tx = '';
    for (let k = 0; k < 14; k++) {
      const r = rnd(k + 70);
      tx += dot(9 + r() * 19, 11 + r() * 9.5, 0.35 + r() * 0.35, k % 2 ? '#5A3420' : '#9A6440', 0.85);
    }
    // ketchup glaze over the top with drips
    tx += F('M8.6,15.4C8.6,11.6 11.4,10.6 15,10.4L22,10C26.2,10 28.4,12 28.2,14.8C27.4,15.6 26.8,14.8 26.4,15.8C26,17.4 25.2,17.4 24.8,15.6C24.4,15 23,15.6 21,15.2C19.6,15 19.2,17.2 18.4,17C17.8,16.8 18.2,15.2 16.4,15.2C14,15.2 12,15.8 11.2,15.4C10.6,17.2 9.8,17.4 9.6,15.8Z', '#8C2A1A', 0, 'opacity="0.95"');
    tx += gloss(13, 11.8, 2.4, 0.5, -6, 0.4) + gloss(23.6, 11.4, 1.6, 0.4, 0, 0.35);
    s += d.clip(loaf, tx);
    // broken crust where the hand comes through
    s += F(blob(19.4, 12.2, 3, 1.3, 81, 8, 0.6), '#3A2214', 0.4);
    // forearm + clawing hand
    const arm = capsule([19.4, 12.6], [20.4, 6.2], 2.9, 2.5);
    s += cel(d, arm, ZSKIN[0], ZSKIN[1], 0.55, [-0.6, -0.3]);
    s += F('M17.9,11.4l1,-1.2l1,1l1,-1.3l0.8,1.5l-0.5,1.4Z', '#55553F', 0.4); // torn sleeve
    const palm = blob(20.6, 5.4, 2.2, 1.6, 82, 7, 0.25);
    s += cel(d, palm, ZSKIN[0], ZSKIN[1], 0.55, [-0.4, -0.4]);
    for (const [ax, ay, bx, by] of [[19, 4.6, 17.2, 1.8], [20, 4.2, 19.4, 0.9], [21.2, 4.2, 21.8, 1], [22.2, 4.8, 23.8, 2.4]]) {
      s += L(`M${ax},${ay}Q${f((ax + bx) / 2 - 0.4)},${f((ay + by) / 2 - 0.6)} ${bx},${by}`, 1.6, INK) + L(`M${ax},${ay}Q${f((ax + bx) / 2 - 0.4)},${f((ay + by) / 2 - 0.6)} ${bx},${by}`, 0.85, ZSKIN[0]);
      s += dot(bx, by, 0.4, '#2E2A1E');
    }
    s += L('M19.2,8.6l1.6,0.3M19.4,9.6l1.4,0.2', 0.3, '#254424'); // stitches
    // parsley + crumbs of "dirt"
    s += F(blob(11.4, 19.4, 1.4, 0.8, 83, 7, 0.6), '#4E7A2C', 0.35) + dot(15.6, 21.6, 0.5, '#4E2C18') + dot(24.2, 21.4, 0.4, '#4E2C18');
    return s;
  },
  goulash: (d) => {
    // ghoul-ash in a cast-iron pot, a floating ear and a sour-cream dollop
    const bx = 18;
    const by = 12.8;
    const brx = 9.2;
    const bry = 5.2;
    let s = '';
    // little side handles
    s += F(rell(bx - brx - 0.6, by + 1.6, 1.4, 0.9, -20, 12), '#2E2C2A', 0.5) + F(rell(bx + brx + 0.6, by + 1.6, 1.4, 0.9, 20, 12), '#2E2C2A', 0.5);
    const body = `M${f(bx - brx)},${f(by)}C${f(bx - brx)},${f(by + 8.8)} ${f(bx + brx)},${f(by + 8.8)} ${f(bx + brx)},${f(by)}Z`;
    s += F(body, d.linear(bx - brx, 0, bx + brx, 0, [[0, '#5E5A54'], [0.3, '#46433E'], [1, '#22201E']]));
    s += d.clip(body, L(`M${f(bx - brx + 1.4)},${f(by + 1)}Q${f(bx - brx + 1.8)},${f(by + 4.6)} ${f(bx - 3)},${f(by + 6.2)}`, 0.7, '#8E8A82', 'opacity="0.7"') + F(blob(bx + 3, by + 3.4, 2, 1, 91, 6, 0.6), '#7A4A22', 0, 'opacity="0.55"'));
    s += L(body, 0.6);
    s += F(rell(bx, by, brx, bry, 0, 30), '#55524C', 0.6);
    const stew = rell(bx, by + 0.3, brx - 1.1, bry - 0.9, 0, 30);
    s += F(stew, d.radial(bx - 2, by - 1, brx, [[0, '#A8402A'], [0.75, '#86301C'], [1, '#5E1E10']]));
    let ch = '';
    for (let k = 0; k < 6; k++) {
      const r = rnd(k + 95);
      ch += F(blob(bx - 6 + r() * 12, by - 2.4 + r() * 5, 1, 0.7, 96 + k, 5, 0.5), k % 2 ? '#5A2214' : '#C08A40', 0.3);
    }
    ch += dot(bx + 2.4, by - 2.2, 0.45, '#E0A060', 0.6) + dot(bx - 4.6, by + 1.6, 0.4, '#E0A060', 0.6);
    s += d.clip(stew, ch);
    // floating ear
    const ear = 'M14.2,11.6C13.6,9 15.6,7.6 17.4,8.4C19.2,9.2 18.8,11.4 17.6,12.2C17,12.6 17.2,13.6 16.2,13.8C15,14 14.4,13 14.2,11.6Z';
    s += cel(d, ear, SKIN[0], SKIN[1], 0.5, [-0.4, -0.4]);
    s += L('M15.2,11.4C15,10 16,9.2 16.8,9.6C17.6,10 17.4,11 16.8,11.4', 0.45, '#655534');
    s += F(rell(16.2, 13.6, 1.6, 0.5, 0, 10), '#86301C');
    // sour cream with paprika
    s += cel(d, blob(21.6, 12, 2.4, 1.4, 97, 7, 0.3), '#E6E0CE', '#B8B09A', 0.45) + dot(21.2, 11.6, 0.3, '#A8402A') + dot(22.3, 12.1, 0.25, '#A8402A');
    // rim highlight
    s += L(`M${f(bx - brx + 0.6)},${f(by - 1.4)}A${f(brx)},${f(bry)} 0 0 1 ${f(bx - 1)},${f(by - bry + 0.2)}`, 0.6, '#A8A49C', 'opacity="0.8"');
    return s;
  },

  // ---- grill
  burger: (d) => {
    const x = 18;
    let s = '';
    s += cel(d, 'M11.2,18.4C11,21.2 25,21.2 24.8,18.4L24.6,17.2Q18,15.8 11.4,17.2Z', BUN[1], '#704616', 0.55);
    s += cel(d, blob(x, 16.6, 7.6, 2.3, 101, 10, 0.18), PATTY[0], PATTY[1], 0.55, [-0.5, -0.6]);
    // cheese drips
    s += F('M10.8,15.6L25.4,15.2L24.6,16.4L23.4,16.2L23,18.4L22.2,16.6L16.6,16.8L16,18.8L15.2,16.8L12.4,16.6L11.6,17.8Z', CHEESE, 0.45);
    // brain patty bulging out
    s += brain(d, x, 13.2, 8.4, 3.7, 102, 0.6);
    // lettuce frill
    s += F('M10.6,12.6l1.2,-1.1l1,0.9l1.2,-1l1,0.8l1.2,-1l1,0.9l1.2,-1l1,0.8l1.2,-1l1,0.9l1.2,-1l1,0.9l1.1,-0.7l0.6,1.4l-15,0.4Z', LETTUCE[0], 0.4);
    const dome = 'M10.8,11.6C10.4,4 25.6,4 25.2,11.6Q18,13.2 10.8,11.6Z';
    s += cel(d, dome, BUN[0], BUN[1], 0.6, [-1.2, -1]);
    s += gloss(15, 7.2, 2.6, 1, -12, 0.35);
    const r = rnd(103);
    for (let k = 0; k < 7; k++) s += F(rell(12.6 + r() * 10.5, 6.6 + r() * 3.6, 0.5, 0.26, r() * 120, 8), '#E8DAB0', 0.12);
    // slime drip and a toothpick flag
    s += F('M24.6,14.6q0.9,1.6 0.4,3.4q-0.5,0.9 -1,0q-0.2,-1.6 -0.2,-3Z', SLIME[0], 0.35);
    return s;
  },
  wings: (d) => {
    let s = '';
    s += cel(d, capsule([9.6, 19.4], [16, 22], 1.6, 1.4), '#A4AE68', '#7A864A', 0.45) + L('M10.4,19.4L15.6,21.6', 0.3, '#5E6A34');
    const r = rnd(111);
    const drum = (a: Pt, b: Pt, w: number, seed: number) => {
      let o = cel(d, capsule(a, b, w, w * 0.55), '#94401E', '#5E2410', 0.5, [-0.5, -0.6]);
      o += d.clip(capsule(a, b, w, w * 0.55), dot(a[0] + 0.6, a[1] - 0.6, 0.4, '#2E120A', 0.7) + dot((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 0.35, '#2E120A', 0.7));
      o += gloss(a[0] + (b[0] - a[0]) * 0.3 - 0.4, a[1] + (b[1] - a[1]) * 0.3 - 0.8, w * 0.35, w * 0.14, (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI, 0.5);
      o += F(rell(b[0], b[1], w * 0.32, w * 0.3, 0, 10), BONE[0], 0.4);
      void seed;
      return o;
    };
    s += drum([12.2, 12.8], [7.8, 15.2], 4, 1);
    s += drum([22.4, 11.8], [27.6, 13.6], 4, 2);
    s += drum([17.6, 12.6], [17.2, 9.6], 3.8, 3);
    s += drum([14.2, 17.4], [9.8, 18.6], 4.2, 4);
    s += drum([22.6, 17.4], [27, 18.6], 4, 5);
    // the finger, lying right on top, only half sauced
    s += finger(d, [14.6, 15.6], [23.4, 13.6], 3, SKIN, true, true);
    s += d.clip(capsule([14.6, 15.6], [23.4, 13.6], 3, 2.64), F(blob(15.6, 15.4, 3.2, 2.4, 113, 6, 0.5), '#94401E', 0, 'opacity="0.85"'));
    s += F('M17.6,16.4q0.4,1.6 0,2.4q-0.6,0.2 -0.6,-0.6q0,-1 0.6,-1.8Z', '#7A2E14', 0.3);
    s += smear(18, 19.8, 2, 0.6, 112, '#6E2416', 0.5);
    s += dot(15.6 + r(), 13.8, 0.3, '#E8DCC0') + dot(21, 13.2, 0.3, '#E8DCC0');
    return s;
  },
  kebab: (d) => {
    let s = '';
    const A: Pt = [7.6, 20.4];
    const B: Pt = [29.4, 8.6];
    // the skewer is a long thin bone
    s += bone(d, [A[0] - 0.6, A[1] + 0.3], [B[0] + 0.4, B[1] - 0.2], 0.9);
    const at = (t: number): Pt => [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t];
    const meat = (t: number, seed: number) => {
      const [x, y] = at(t);
      const b = blob(x, y, 2.6, 2.3, seed, 6, 0.3);
      return cel(d, b, '#7A3E22', '#4A2214', 0.5, [-0.6, -0.6]) + d.clip(b, L(`M${f(x - 2)},${f(y + 1.2)}l3.2,-2.8M${f(x - 1)},${f(y + 2)}l3,-2.6`, 0.5, '#24100A', 'opacity="0.8"'));
    };
    const onion = (t: number) => {
      const [x, y] = at(t);
      return cel(d, rell(x, y, 1.5, 2.3, 30, 14), '#C8B8B4', '#8E7A80', 0.45) + L(`M${f(x - 0.4)},${f(y - 1.5)}Q${f(x + 0.6)},${f(y)} ${f(x - 0.2)},${f(y + 1.6)}`, 0.3, '#7A5A6A');
    };
    const goo = (t: number, seed: number) => {
      const [x, y] = at(t);
      let o = slimeBlob(d, x, y, 2.5, 2.4, seed);
      o += dot(x + 0.6, y + 0.5, 0.45, '#C4DA7A', 0.7) + dot(x - 0.7, y + 0.9, 0.3, '#C4DA7A', 0.7);
      o += F(`M${f(x + 0.5)},${f(y + 1.8)}q0.3,1.6 -0.1,2.4q-0.6,0.2 -0.5,-0.8Z`, SLIME[0], 0.3);
      return o;
    };
    const pepper = (t: number) => {
      const [x, y] = at(t);
      return cel(d, `M${f(x - 1.8)},${f(y - 1.6)}L${f(x + 1.6)},${f(y - 2)}L${f(x + 2)},${f(y + 1.6)}L${f(x - 1.4)},${f(y + 2)}Z`, '#5E8A32', '#3A5E1E', 0.45);
    };
    s += meat(0.12, 121) + onion(0.27) + goo(0.4, 122) + meat(0.55, 123) + pepper(0.68);
    const [ex, ey] = at(0.83);
    s += eyeball(d, ex, ey, 2.4, [-0.4, 0.5], '#7A5A2A', 124);
    s += smear(14, 20.6, 2.4, 0.8, 125, SLIME[1], 0.55);
    return s;
  },
  smash: (d) => {
    let s = '';
    // lacy, crispy, very flat patty overhanging everything
    const pat = blob(18, 16.4, 11, 5, 131, 14, 0.22);
    s += cel(d, pat, '#5A321E', '#36200F', 0.55, [-0.6, -0.7]);
    s += d.clip(pat, L(blob(18, 16.4, 10.2, 4.4, 131, 14, 0.22), 1, '#2A160A', 'opacity="0.7"'));
    // cheese melting over the edge
    s += F('M10.4,15C12,12.8 23.8,12.6 25.8,14.8L26.2,16.6L25,16L24.6,18.2L23.8,16.4L19,17L18.4,19.4L17.6,17L12.6,16.8L12,18L11.4,16.4Z', CHEESE, 0.45);
    // pickles sliding out
    s += F(rell(8.6, 18.6, 1.6, 1, 10, 12), '#7A8A3A', 0.4) + dot(8.4, 18.5, 0.35, '#A8B868');
    s += F(rell(27.6, 17.8, 1.5, 0.9, -10, 12), '#7A8A3A', 0.4) + dot(27.7, 17.7, 0.3, '#A8B868');
    // squashed top bun with a big fist dent
    const bun = 'M11.2,14C11,10.2 25,10 24.8,13.8Q18,15.8 11.2,14Z';
    s += cel(d, bun, BUN[0], BUN[1], 0.55, [-0.8, -0.7]);
    let dn = '';
    for (let k = 0; k < 4; k++) dn += F(rell(15.2 + k * 2, 11.6 + Math.abs(k - 1.5) * 0.25, 1, 0.6, 0, 10), '#8E5E2A', 0, 'opacity="0.9"') + L(`M${f(14.4 + k * 2)},${f(11.3 + Math.abs(k - 1.5) * 0.25)}a1,0.6 0 0 1 1.6,0`, 0.35, '#5A3814');
    dn += F('M14.2,12.8Q18,13.8 21.8,12.8Q18,14.2 14.2,12.8Z', '#7A4E22', 0, 'opacity="0.8"');
    s += d.clip(bun, dn);
    s += crack(12.6, 12.2, -0.4, 2.6, 132, 0.35, '#5A3814', 0);
    // grease
    s += smear(24, 21, 2.2, 0.7, 133, '#B89A4A', 0.45);
    return s;
  },
  chili: (d) => {
    // terracotta crock of chili, beans, cheese, a jalapeño, knuckle bones and a spoon
    const bx = 18;
    const by = 13.2;
    const brx = 9.4;
    const bry = 5.4;
    let s = '';
    const body = `M${f(bx - brx)},${f(by)}L${f(bx - brx + 0.8)},${f(by + 5.6)}C${f(bx - brx + 1.4)},${f(by + 7.6)} ${f(bx + brx - 1.4)},${f(by + 7.6)} ${f(bx + brx - 0.8)},${f(by + 5.6)}L${f(bx + brx)},${f(by)}Z`;
    s += cel(d, body, '#9A5634', '#6A3620', 0.6, [-1.4, -0.4]);
    s += d.clip(body, L(`M${f(bx - brx)},${f(by + 2.8)}A${f(brx)},${f(bry)} 0 0 0 ${f(bx + brx)},${f(by + 2.8)}`, 0.8, '#D8B47A', 'opacity="0.55"') + crack(bx + 4, by + 2.6, 1.2, 4, 141, 0.4, '#3A1E10', 0));
    s += F(rell(bx, by, brx, bry, 0, 30), '#B06C44', 0.6);
    const ch = rell(bx, by + 0.3, brx - 1, bry - 0.9, 0, 30);
    s += F(ch, d.radial(bx - 2, by - 1, brx, [[0, '#8C3A1E'], [0.8, '#6E2A16'], [1, '#4A1A0C']]));
    let t = '';
    const r = rnd(142);
    for (let k = 0; k < 9; k++) {
      const x = bx - 6.6 + r() * 13;
      const y = by - 3.4 + r() * 6.4;
      t += F(rell(x, y, 0.9, 0.55, r() * 180, 10), '#4A1810', 0.25) + dot(x - 0.3, y - 0.2, 0.2, '#C08A70', 0.7);
    }
    for (let k = 0; k < 8; k++) {
      const x = bx - 4 + r() * 8;
      const y = by - 2 + r() * 3.6;
      t += L(`M${f(x)},${f(y)}l${f(1 + r())},${f(-0.4 + r() * 0.8)}`, 0.55, CHEESE);
    }
    s += d.clip(ch, t);
    // jalapeño ring
    s += F(rell(bx + 3.6, by + 0.6, 1.4, 0.95, 0, 12), '#4E7A2C', 0.4) + F(rell(bx + 3.6, by + 0.6, 0.7, 0.42, 0, 10), '#B8C47A') + dot(bx + 3.6, by + 0.6, 0.2, '#E2E2B8');
    // knuckle bones
    s += bone(d, [bx - 4.6, by + 0.4], [bx - 2.2, by - 1.2], 0.9);
    // spoon handle
    s += L(`M${f(bx + 2)},${f(by - 1.2)}L${f(bx + 9.6)},${f(by - 8.6)}`, 2, INK) + L(`M${f(bx + 2)},${f(by - 1.2)}L${f(bx + 9.6)},${f(by - 8.6)}`, 1.1, '#A8ACA4') + L(`M${f(bx + 3)},${f(by - 2.4)}L${f(bx + 9)},${f(by - 8.2)}`, 0.35, '#E4E6E0');
    s += F(rell(bx + 2, by - 0.9, 1.5, 0.6, -30, 10), '#6E2A16');
    return s;
  },
  salad: (d) => {
    let s = '';
    const r = rnd(151);
    const leaf = (x: number, y: number, rx: number, ry: number, seed: number, light: boolean) => {
      const b = blob(x, y, rx, ry, seed, 13, 0.42);
      return cel(d, b, light ? '#5E8A3A' : '#3E6A2C', light ? '#3E5E26' : '#2A4A1E', 0.45, [-0.5, -0.6]) + d.clip(b, L(`M${f(x - rx * 0.8)},${f(y + ry * 0.2)}Q${f(x)},${f(y - ry * 0.4)} ${f(x + rx * 0.8)},${f(y)}`, 0.35, '#A8C47A', 'opacity="0.7"'));
    };
    s += leaf(13, 13.6, 4.6, 3, 152, false) + leaf(22.8, 13, 4.8, 3.2, 153, false) + leaf(18, 11.4, 4.4, 3, 154, true);
    s += leaf(11.6, 17.8, 3.8, 2.6, 155, true) + leaf(24.4, 17.6, 4, 2.6, 156, true) + leaf(18, 17.4, 5, 3, 157, false);
    // croutons
    for (const [x, y] of [[14.6, 15.4], [21.4, 15.8], [16.6, 19.6]] as Pt[]) s += cel(d, `M${f(x - 1)},${f(y - 0.8)}l2,-0.2l0.2,1.6l-2,0.3Z`, '#C89A54', '#94682C', 0.35);
    // cherry tomatoes, and one eyeball pretending to be a cherry tomato
    for (const [x, y] of [[20.4, 12.6], [13.6, 18.6]] as Pt[]) s += cel(d, rell(x, y, 1.6, 1.5, 0, 14), '#A8382A', '#6E1E14', 0.45, [-0.4, -0.4]) + gloss(x - 0.5, y - 0.6, 0.5, 0.3, -20, 0.6);
    s += eyeball(d, 16.6, 14.2, 1.9, [0.5, 0.4], '#3E6E8A', 158);
    // worm wriggling out
    const w = 'M23,15.6C24.4,14.2 25.2,16.4 26.6,15C27.6,14 28.4,14.8 28.6,13.6';
    s += L(w, 1.6, INK) + L(w, 0.95, '#C48A80') + dot(28.6, 13.6, 0.3, '#5E2A28');
    // dressing drizzle
    s += L('M12,16.4q2,-1.2 3.4,0.2t3.6,-0.2t3.4,0.4', 0.5, '#E6E0C8', 'opacity="0.85"');
    void r;
    return s;
  },

  // ---- smoker
  pork: (d) => {
    let s = '';
    const heap = 'M8.6,18.6C7.6,14.6 10.6,10.6 15,9.8C18.6,8.6 23.6,9.4 26.2,12.4C28.4,14.8 28,18.4 25.6,19.6C21,21.6 13,21.6 8.6,18.6Z';
    s += cel(d, heap, '#8E5434', '#5E3220', 0.6, [-1.2, -1.4]);
    let sh = '';
    const r = rnd(161);
    for (let k = 0; k < 34; k++) {
      const x = 9 + r() * 18;
      const y = 10 + r() * 10.5;
      const a = -0.6 + r() * 1.2 + (k % 3 === 0 ? 1.4 : 0);
      const l = 1.6 + r() * 2.2;
      sh += L(`M${f(x)},${f(y)}q${f(Math.cos(a) * l * 0.5)},${f(Math.sin(a) * l * 0.5 - 0.5)} ${f(Math.cos(a) * l)},${f(Math.sin(a) * l)}`, 0.4 + r() * 0.3, ['#5A2E1A', '#B07A52', '#7A3E22', '#C89064'][k % 4], 'opacity="0.9"');
    }
    sh += F(blob(15, 12.6, 3, 1.1, 162, 6, 0.6), '#6E2416', 0, 'opacity="0.7"') + gloss(14.2, 12.2, 1.4, 0.35, -10, 0.4);
    s += d.clip(heap, sh);
    // the "-ish": a human nose poking out of the pile
    // the "-ish": somebody's dentures, lost in the pile
    s += F(blob(21.6, 14.4, 4.2, 1.4, 164, 6, 0.4), '#3A1E10', 0, 'opacity="0.55"');
    const gum = 'M17.6,12.4C18.2,9.6 25.2,9.4 25.8,12.2L25.4,14C24.6,12.2 18.8,12.4 18,14.2Z';
    s += cel(d, gum, '#C8787A', '#8E4A50', 0.5, [-0.4, -0.4]);
    for (let k = 0; k < 7; k++) {
      const t = k / 6;
      const x = 18.6 + t * 6.6;
      const y = 12.4 + Math.pow(Math.abs(t - 0.5) * 2, 2) * 0.9 - 0.2;
      s += F(`M${f(x - 0.55)},${f(y - 0.2)}L${f(x + 0.55)},${f(y - 0.2)}L${f(x + 0.45)},${f(y + 1.5)}Q${f(x)},${f(y + 1.9)} ${f(x - 0.45)},${f(y + 1.5)}Z`, k === 4 ? '#C8A84A' : '#E6DEC2', 0.3);
    }
    s += gloss(19.6, 10.8, 1.2, 0.4, -10, 0.5);
    // coleslaw dollop
    s += cel(d, blob(10.4, 19.2, 3, 1.6, 163, 8, 0.4), '#D8D4B0', '#A8A47A', 0.45);
    s += d.clip(blob(10.4, 19.2, 3, 1.6, 163, 8, 0.4), L('M8.6,19l1,-0.4M10.4,19.8l1.2,-0.2M11,18.4l0.8,0.4', 0.4, '#C47A3A') + L('M9.4,18.6l0.6,0.4M11.6,19.6l0.6,-0.4', 0.4, '#8EA05A'));
    s += fly(26.4, 7, 1.05);
    return s;
  },
  ribs: (d) => {
    let s = '';
    // rack lying across the plate; bones jut out of the front edge; a bite taken out of one end
    const rack = 'M7.6,15.4C7.4,12.8 9.6,11.2 12.2,10.8L24.6,9.6C27.8,9.4 29.6,11 29.2,13.4C29.4,14.8 28.2,15.4 27.6,15.2C27.2,16 26.4,16.4 25.6,15.8C25,16.6 24.2,16.6 23.6,16L23.6,17L12,18.6C9.6,18.8 7.8,17.6 7.6,15.4Z';
    // bones under the meat
    for (let k = 0; k < 6; k++) {
      const x = 9.6 + k * 2.9;
      const y = 18.6 - k * 0.35;
      s += bone(d, [x + 0.3, y - 3.6], [x - 0.6, y + 1.4], 1.05);
    }
    s += cel(d, rack, '#7A2E18', '#4A1A0C', 0.6, [-0.9, -1.2]);
    let tx = '';
    for (let k = 0; k < 6; k++) tx += L(`M${f(10.6 + k * 3)},${f(11.2 - k * 0.2)}l-1.6,6.6`, 0.5, '#3A1208', 'opacity="0.5"');
    tx += L('M9,13.4L28,11.6M9.6,15.6L27.4,13.8', 0.9, '#24100A', 'opacity="0.75"');
    tx += F(blob(12, 11.8, 4, 0.7, 171, 6, 0.4), '#2A1208', 0, 'opacity="0.65"');
    tx += gloss(17, 11.6, 3.6, 0.45, -5, 0.4) + gloss(22.8, 12.6, 1.6, 0.35, -5, 0.35);
    tx += speckle(d, rack, [7, 9, 23, 10], 18, ['#2A1208', '#C08A50'], 172, 0.2, 0.45, 0.8);
    s += d.clip(rack, tx);
    // bite marks in the gnawed end
    for (const [x, y] of [[27.8, 15], [26.2, 15.7], [24.4, 16.2]] as Pt[]) s += dot(x, y - 0.3, 0.35, '#E4C8A8', 0.8);
    s += bone(d, [27.8, 11.2], [31.6, 9.8], 1.2);
    s += fly(13, 7.6, 1.05);
    return s;
  },
  brisket: (d) => {
    let s = '';
    // four fanned slices: black bark, pink smoke ring, grey-brown middle, fat cap
    const slice = (x: number, y: number, rot: number) => {
      const sh = 'M-4.6,-2.6C-2,-3.6 2.6,-3.6 4.8,-2.4L5.2,2C2.6,3.2 -2.6,3.2 -5,2Z';
      let o = F(sh, '#7E5440', 0.5);
      o += F('M-4.8,1.2C-2.6,2.2 2.6,2.2 5.1,1.2L5.2,2C2.6,3.2 -2.6,3.2 -5,2Z', '#C86A5A', 0);
      o += F('M-4.6,-2.6C-2,-3.6 2.6,-3.6 4.8,-2.4L4.85,-1.6C2.6,-2.6 -2,-2.6 -4.65,-1.7Z', '#24140C', 0);
      o += F('M-4.65,-1.7C-2,-2.6 2.6,-2.6 4.85,-1.6L4.88,-1C2.6,-2 -2,-2 -4.68,-1.1Z', '#B85A4A', 0, 'opacity="0.85"');
      o += L('M-3.4,-0.2C-1,0.4 1,-0.4 3.6,0.2', 0.35, '#5E3A2A', 'opacity="0.8"') + L('M-3,0.8C-0.6,1.2 1.4,0.6 3.2,1', 0.3, '#5E3A2A', 'opacity="0.6"');
      o += F('M-0.6,-0.6q1.6,-0.4 2.6,0.2q-1.2,0.4 -2.6,-0.2Z', '#D8C8A0', 0, 'opacity="0.8"');
      o += gloss(-1.6, -1.2, 1.6, 0.35, -5, 0.3);
      o += L(sh, 0.5);
      return `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)})">${o}</g>`;
    };
    s += slice(12.4, 12.6, -18) + slice(16.4, 13.8, -8) + slice(20.4, 15.2, 4) + slice(24, 16.8, 14);
    // pickle spears and a sad slice of white bread
    s += cel(d, 'M7,18.6C7.4,16.4 9.6,16 11.4,16.6L12.6,20.6C10.6,21.6 7.8,21.2 7,18.6Z', '#D8D0B0', '#B0A684', 0.45);
    s += L('M7.2,18.6C7.6,16.6 9.6,16.2 11.4,16.8', 0.7, '#A8783A');
    s += cel(d, capsule([13.6, 20.4], [18.8, 21.4], 1.7, 1.5), '#7A8A3A', '#52602A', 0.45) + dot(15, 20.6, 0.22, '#C4CC8A') + dot(16.8, 21, 0.22, '#C4CC8A');
    s += fly(28, 10.2, 1);
    return s;
  },
  foie: (d) => {
    let s = '';
    // pretentious swoosh of sauce across the plate
    s += F('M8.4,19.4C11,15 19.6,13.6 28,15.6C22,15.4 14,16.2 8.4,19.4Z', '#5A1A2A', 0.35);
    // dots of slime coulis
    for (const [x, y, rr] of [[9.4, 15.4, 0.9], [11.2, 14.2, 0.65], [12.8, 13.4, 0.45], [26.6, 18.4, 0.8], [24.8, 19.4, 0.55]] as [number, number, number][]) s += F(rell(x, y, rr, rr * 0.7, 0, 10), SLIME[0], 0.3) + dot(x - rr * 0.3, y - rr * 0.3, rr * 0.3, '#D4E6A0', 0.8);
    // toast point
    s += cel(d, 'M11.8,18.4L23.8,16.2L25.2,18L12.8,20.6Z', '#C8964C', '#8E6028', 0.45);
    // a thick seared slab of fatty liver: pale pink sides, a crusty top, a bruise-purple underbelly
    const side = 'M12.8,14.6L13.2,17.2C15.6,19 21.4,18.6 24.2,16.4L24,13.6Z';
    s += F(side, d.linear(0, 13.6, 0, 18.6, [[0, '#D8A898'], [0.7, '#B87A74'], [1, '#6A3038']]), 0.5);
    s += L('M14.4,16.4C17,17.6 20.6,17.4 22.8,15.8', 0.4, '#8A4A4E', 'opacity="0.7"');
    const top = 'M12.8,14.6C12.2,11.6 15.4,9.6 18.8,9.8C22.6,10 25.2,11.6 24,13.6C22.6,15.8 15.6,16.8 12.8,14.6Z';
    s += cel(d, top, '#A8683A', '#7A4422', 0.55, [-0.8, -0.8]);
    s += d.clip(top, L('M14.6,11.6l5,4M17.4,10.4l5,4M20.4,10l3.4,2.8M14,13.6l3.4,-3M17,14.8l5,-4.4M20.4,15.2l3.4,-3', 0.5, '#4A2410', 'opacity="0.55"'));
    s += gloss(16, 11.4, 2.2, 0.6, -14, 0.55);
    // bile-green drizzle
    s += L('M14.2,12.8q2,-1.6 3.6,-0.2t3.6,-0.4t2,0.2', 0.6, '#86AC34');
    // garnish sprig + a fleck of gold leaf
    s += L('M19,10.4L20.4,6.6', 0.5, '#3E5E26') + F(rell(19.6, 8.4, 1, 0.5, -60, 8), '#5E8A3A', 0.3) + F(rell(20.6, 7.6, 1, 0.5, 30, 8), '#5E8A3A', 0.3) + F(rell(19.4, 6.8, 0.9, 0.45, -40, 8), '#5E8A3A', 0.3);
    s += F('M22.4,11.2l0.9,-0.4l0.4,0.7l-0.8,0.4Z', '#E0C050', 0.15);
    s += fly(26.6, 9, 1);
    return s;
  },

  // ---- fryer
  rings: (d) => {
    let s = '';
    const ring = (x: number, y: number, rx: number, ry: number, rot: number, seed: number) => {
      const r = rnd(seed);
      const outer = rell(0, 0, rx, ry, 0, 24);
      const inner = rell(0.15, 0.1, rx * 0.5, ry * 0.46, 0, 18);
      let o = `<path d="${outer}${inner}" fill-rule="evenodd" fill="${FRIED[1]}"/>`;
      const cid = d.id('c');
      d.def(`<clipPath id="${cid}"><path d="${outer}${inner}" clip-rule="evenodd"/></clipPath>`);
      let tex = F(outer, FRIED[0], 0, `transform="translate(${f(-rx * 0.1)} ${f(-ry * 0.14)})"`);
      for (let k = 0; k < 16; k++) {
        const a = r() * Math.PI * 2;
        const m = 0.6 + r() * 0.4;
        tex += dot(Math.cos(a) * rx * m, Math.sin(a) * ry * m, 0.3 + r() * 0.35, k % 2 ? '#E2BC6A' : '#7A5222', 0.85);
      }
      o += `<g clip-path="url(#${cid})">${tex}</g>`;
      // gums + teeth around the hole, like a little mouth
      o += L(inner, 0.7, '#7A2A26');
      for (let k = 0; k < 9; k++) {
        const a = (k / 9) * Math.PI * 2 + 0.2;
        const ex = 0.15 + Math.cos(a) * rx * 0.5;
        const ey = 0.1 + Math.sin(a) * ry * 0.46;
        const ang = (Math.atan2(-Math.sin(a) * ry, -Math.cos(a) * rx) * 180) / Math.PI - 90;
        o += tooth(ex, ey, rx * 0.17, rx * 0.17, ang);
      }
      o += L(outer, 0.55) + L(inner, 0.4);
      return `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)})">${o}</g>`;
    };
    s += ring(12.6, 17.2, 5.4, 3.4, -6, 191);
    s += ring(23.4, 17.6, 5.4, 3.4, 8, 192);
    // one standing on its edge leaning against the others, its mouth facing you
    s += ring(18.2, 11.6, 4.4, 5.6, -10, 193);
    s += smear(18.2, 21.6, 2, 0.7, 194, '#8C2A1E', 0.7);
    return s;
  },
  nuggets: (d) => {
    let s = '';
    // dip pot of slime
    s += F(rell(25.2, 18.2, 3.2, 1.9, 0, 18), '#B8B2A0', 0.5) + F('M22,18.2L22.4,20.4Q25.2,21.8 28,20.4L28.4,18.2Z', '#A8A290', 0.5);
    s += F(rell(25.2, 18.2, 3.2, 1.9, 0, 18), '#C8C2B0', 0.5) + F(rell(25.2, 18.3, 2.5, 1.35, 0, 16), SLIME[0], 0.3) + gloss(24.4, 17.8, 0.9, 0.3, 0, 0.6);
    const nug = (x: number, y: number, rx: number, ry: number, seed: number) => {
      const b = blob(x, y, rx, ry, seed, 7, 0.4);
      const r = rnd(seed);
      let t = '';
      for (let k = 0; k < 7; k++) t += dot(x + (r() - 0.5) * rx * 1.8, y + (r() - 0.5) * ry * 1.6, 0.3 + r() * 0.3, k % 2 ? '#E4C070' : '#8A5E24', 0.85);
      return cel(d, b, FRIED[0], FRIED[1], 0.5, [-0.6, -0.7]) + d.clip(b, t);
    };
    s += nug(11.4, 13.8, 3.2, 2.3, 201) + nug(17.6, 12, 3.3, 2.3, 202) + nug(22.8, 13.2, 3, 2.1, 203);
    s += nug(9.6, 17.6, 3.1, 2.2, 204) + nug(20.8, 16.4, 3.2, 2.2, 206);
    // one bitten open: brain inside
    const x = 15;
    const y = 17.2;
    const b = blob(x, y, 3.6, 2.5, 205, 7, 0.35);
    s += cel(d, b, FRIED[0], FRIED[1], 0.5, [-0.6, -0.7]);
    s += brain(d, x + 0.4, y - 0.3, 2.4, 1.6, 207, 0.4);
    for (const [tx, ty] of [[x + 2.4, y - 1.8], [x + 2.9, y - 0.6], [x + 2.9, y + 0.6]] as Pt[]) s += dot(tx, ty, 0.5, '#E6D8B0');
    s += fly(27.8, 10.6, 1);
    return s;
  },
  fries: (d) => {
    let s = '';
    // a heap of golden finger fries (some still have their nails) and a dollop of "ketchup"
    const fry = (a: Pt, b: Pt, nail: boolean) => finger(d, a, b, 1.8, ['#D2A44E', '#9A6C26'], nail, false);
    s += F(blob(25.4, 18.8, 3.2, 1.8, 211, 7, 0.4), BLOOD, 0.45) + gloss(24.6, 18.2, 1, 0.35, -10, 0.45);
    s += fry([9.6, 16.2], [17.2, 13.2], true);
    s += fry([12, 12.4], [19, 15.6], false);
    s += fry([17.6, 11], [25.4, 12.6], true);
    s += fry([20.4, 16.2], [14.2, 9.8], false);
    s += fry([10.4, 19.2], [17.6, 18.4], true);
    s += fry([15.2, 15.8], [23.2, 17.6], false);
    s += fry([22.2, 10.4], [27.8, 14.8], true);
    s += fry([13.4, 20.2], [21.6, 19.8], false);
    s += fry([18.6, 18.4], [24, 15], true);
    // salt
    const r = rnd(212);
    for (let k = 0; k < 10; k++) s += dot(11 + r() * 15, 10 + r() * 10, 0.22, '#F4F0E4', 0.9);
    return s;
  },
  chicken: (d) => {
    let s = '';
    // the scaly foot, still attached, claws out
    const sc = '#C8B46A';
    const scD = '#8E7A3A';
    s += cel(d, capsule([22.4, 12.4], [27.4, 8.8], 3, 2.4), sc, scD, 0.5);
    s += L('M23.6,11.4l0.8,0.8M24.8,10.6l0.8,0.8M26,9.8l0.7,0.7', 0.35, '#6E5A2A');
    for (const [bx, by] of [[30.6, 5], [31.4, 8.8], [28.2, 4.2]] as Pt[]) {
      const toe = capsule([27.4, 8.8], [bx, by], 1.8, 1.3);
      s += cel(d, toe, sc, scD, 0.5);
      const ang = Math.atan2(by - 8.8, bx - 27.4);
      s += F(`M${f(bx + Math.cos(ang + 1.4) * 0.5)},${f(by + Math.sin(ang + 1.4) * 0.5)}L${f(bx + Math.cos(ang) * 2.4 + Math.cos(ang + 1.6) * 0.6)},${f(by + Math.sin(ang) * 2.4 + Math.sin(ang + 1.6) * 0.6)}L${f(bx + Math.cos(ang - 1.4) * 0.5)},${f(by + Math.sin(ang - 1.4) * 0.5)}Z`, '#2E2A22', 0.3);
    }
    // the big crumbed drumstick
    const leg = 'M7.8,17C7.2,12.6 10.4,9.6 14.4,9.6C18.2,9.6 20.6,10.6 22.4,11.2C23.4,11.6 24,12.6 23.2,13.6C22,15 20.6,15.4 19.4,16.6C17.2,19.6 14,21 11.4,20.6C9.4,20.2 8,18.8 7.8,17Z';
    s += cel(d, leg, '#B88038', '#7A4E1C', 0.6, [-1.3, -1.4]);
    let cr = '';
    const r = rnd(221);
    for (let k = 0; k < 40; k++) cr += dot(8 + r() * 16, 9.6 + r() * 11, 0.3 + r() * 0.5, ['#D8A85A', '#8A561E', '#E8C47A', '#6A3E14'][k % 4], 0.85);
    cr += gloss(12, 12, 2.6, 0.9, -20, 0.35);
    s += d.clip(leg, cr);
    // crumbly bumps along the outline
    for (const [x, y] of [[9.2, 12.4], [12.6, 9.8], [16.6, 9.8], [8, 16.4], [11, 20.4], [15.6, 19.8]] as Pt[]) s += F(rell(x, y, 1, 0.8, 0, 10), '#B88038', 0.45);
    // grease puddle
    s += smear(14, 22.2, 4, 0.7, 222, '#B89A4A', 0.5);
    return s;
  },
};

// ---------------------------------------------------------------- assets

function dishAsset(id: Dish3Id, seed: number): ArtAsset {
  return asset(`dish_${id}`, DISH_W, DISH_H, 0.5, OY, (d) => {
    const r = rnd(seed);
    return plate(d, seed, { chips: 1 + (seed % 2), grime: 0.8 + r() * 0.6 }) + DISHES[id](d, r);
  });
}

function plateDirty(): ArtAsset {
  return asset('plate_dirty', DISH_W, DISH_H, 0.5, OY, (d) => {
    let s = plate(d, 301, { chips: 2, grime: 2 });
    s += smear(16, 16.4, 6, 2.4, 302, '#6E2416', 0.55);
    s += smear(21, 14.2, 3, 1.4, 303, '#8A6A2A', 0.5);
    s += L('M11.4,17.4q3,-2.4 6.6,-1.2t5.4,-0.4', 0.6, '#5E1E12', 'opacity="0.6"');
    s += bone(d, [12.6, 13.6], [21.4, 18.2], 1.4);
    s += F(blob(17, 15.9, 1.6, 0.9, 304, 6, 0.6), '#7A3A22', 0.3); // gristle
    const r = rnd(305);
    for (let k = 0; k < 9; k++) s += dot(11 + r() * 14, 12 + r() * 8, 0.3 + r() * 0.3, k % 2 ? '#C89A54' : '#5A3420', 0.9);
    s += fly(24.6, 12.8, 1.1);
    return s;
  });
}

function plateStack(): ArtAsset {
  const H2 = 34;
  const oy = 0.71;
  return asset('plate_stack', DISH_W, H2, 0.5, oy, (d) => {
    const by = H2 * oy;
    let s = '';
    const n = 5;
    const step = 2.3;
    s += F(rell(CX + 1.3, by + 1.25, PRX + 0.3, PRY + 0.2, 0, 24), '#140E08', 0, 'opacity="0.3"');
    // lower plates: only their front edges show, each a little askew and grubby
    for (let k = 0; k < n - 1; k++) {
      const off = [0, 0.8, -0.5, 0.6][k];
      const cy = by - k * step;
      const sh = plateShape(CX + off, cy + 1.3, PRX, PRY, 311 + k, 1).d;
      s += F(sh, '#97927F', 0.7);
      const tp = plateShape(CX + off, cy, PRX, PRY, 311 + k, 1).d;
      s += F(tp, d.linear(CX - PRX, 0, CX + PRX, 0, [[0, '#DCD8CA'], [0.6, '#C8C3B2'], [1, '#A29D8C']]), 0.8);
      s += F(blob(CX + off - 6 + k * 3, cy + PRY - 0.2, 1.6, 0.6, 330 + k, 6, 0.5), k % 2 ? '#6E2416' : '#6E6A3A', 0, 'opacity="0.45"');
    }
    const ty = by - (n - 1) * step;
    s += plate(d, 315, { cx: CX - 0.3, cy: ty, chips: 2, grime: 1.5, shadow: false });
    s += smear(CX - 1, ty + 0.4, 5, 2, 320, '#6E2416', 0.5);
    s += bone(d, [CX - 4.6, ty - 0.4], [CX + 3.6, ty + 2.2], 1.2);
    s += F(blob(CX + 4.4, ty - 0.6, 1.8, 1, 321, 6, 0.6), '#86AC34', 0.35, 'opacity="0.9"');
    // drips of sauce down the side of the stack
    s += F(`M${f(CX - 9)},${f(by - 5.2)}q0.6,2.6 0.2,4q0.6,0.4 0.9,-0.4q0,-2 -0.4,-3.6Z`, '#6E2416', 0.3, 'opacity="0.9"');
    s += fly(CX + 8, ty - 4.6, 1.1);
    return s;
  });
}

export function buildDishes(): ArtAsset[] {
  const out: ArtAsset[] = DISH3_IDS.map((id, i) => dishAsset(id, 17 + i * 3));
  out.push(plateDirty(), plateStack());
  return out;
}

