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
  // the late game (levels 10-40) and the new stations' secret recipes
  'chowder', 'corndog', 'eyesoup', 'stew', 'links', 'tbone', 'donuts', 'pizza', 'calzone', 'jerky', 'knots', 'meatballs', 'brats', 'swamp',
  'hog', 'deepdish', 'fishchips', 'turducken', 'burntends', 'fondue', 'coffinribs', 'beans', 'stromboli', 'mammoth', 'tomahawk', 'mummywrap',
  'potpie', 'tempura', 'hash', 'elixir', 'kraken', 'pizzaface', 'damned', 'apocalypse', 'toadstew', 'ratpizza', 'luau', 'tenders',
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

// ---------------------------------------------------------------- late-game dishes (levels 10-40, new stations)

/** A deep bowl at the plate angle. Returns its art and the soup surface path (clip contents to it). */
function bowl(d: Doc, soup: [string, string, string], o: { x?: number; y?: number; rx?: number; ry?: number; col?: [string, string]; speck?: boolean; seed?: number } = {}): { s: string; soup: string; x: number; y: number; rx: number; ry: number } {
  const x = o.x ?? 18;
  const y = o.y ?? 13.4;
  const rx = o.rx ?? 9.6;
  const ry = o.ry ?? 5.6;
  const col = o.col ?? ['#8A7A5A', '#5A4A32'];
  const body = `M${f(x - rx)},${f(y)}C${f(x - rx + 0.4)},${f(y + 8.2)} ${f(x + rx - 0.4)},${f(y + 8.2)} ${f(x + rx)},${f(y)}Z`;
  let s = cel(d, body, col[0], col[1], 0.6, [-1.2, -0.5]);
  if (o.speck) s += speckle(d, body, [x - rx, y, rx * 2, 7], 16, ['#D8DCD4', '#A8B4B4'], o.seed ?? 7, 0.2, 0.4, 0.9);
  s += F(rell(x, y, rx, ry, 0, 30), lt(col[0], 0.35), 0.6) + L(rell(x, y, rx, ry, 0, 30), 0.5);
  const surf = rell(x, y + 0.4, rx - 1.1, ry - 0.9, 0, 30);
  s += F(surf, d.radial(x - 2, y - 1, rx, [[0, soup[0]], [0.7, soup[1]], [1, soup[2]]]));
  return { s, soup: surf, x, y, rx, ry };
}
function lt(c: string, t: number): string {
  const n = parseInt(c.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v + (255 - v) * t));
  return '#' + ch.map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();
}

/** Seared meat: cel fill, a crust gradient and grill marks, clipped. */
function seared(d: Doc, path: string, box: [number, number, number, number], seed: number, raw = '#8A3A2A', crust: [string, string] = ['#6A3A22', '#3E2012'], marks = true): string {
  let s = cel(d, path, crust[0], crust[1], 0.55, [-0.7, -0.8]);
  let tex = F(path, d.linear(box[0], box[1], box[0] + box[2], box[1] + box[3], [[0, '#FFFFFF', 0.08], [1, '#000000', 0.15]]));
  const r = rnd(seed);
  if (marks) for (let k = 0; k < 4; k++) tex += L(`M${f(box[0] + 2 + k * (box[2] / 4))},${f(box[1])}l${f(box[2] * 0.22)},${f(box[3])}`, 0.9, '#22120A', 'opacity="0.75"');
  for (let k = 0; k < 6; k++) tex += dot(box[0] + r() * box[2], box[1] + r() * box[3], 0.3 + r() * 0.3, k % 2 ? '#C88A5A' : '#2A160C', 0.7);
  s += d.clip(path, tex);
  void raw;
  return s;
}

/** A pizza (round, rim + sauce + cheese) with toppings drawn by `top` inside the cheese clip. */
function pizzaDisc(d: Doc, cx: number, cy: number, rx: number, ry: number, seed: number, top: (clip: string) => string, missing = false): string {
  const outer = rell(cx, cy, rx, ry, 0, 36);
  let shape = outer;
  if (missing) shape = `M${f(cx)},${f(cy)}L${f(cx + rx * Math.cos(-0.35))},${f(cy + ry * Math.sin(-0.35))}A${f(rx)},${f(ry)} 0 1 1 ${f(cx + rx * Math.cos(-1.35))},${f(cy + ry * Math.sin(-1.35))}Z`;
  let s = F(shape, '#140E08', 0, 'opacity="0.25" transform="translate(0.6 0.9)"');
  s += cel(d, shape, BUN[0], BUN[1], 0.6, [-0.5, -0.6]);
  const inner = rell(cx, cy, rx * 0.84, ry * 0.8, 0, 36);
  const sauceD = missing ? `M${f(cx)},${f(cy)}L${f(cx + rx * 0.84 * Math.cos(-0.35))},${f(cy + ry * 0.8 * Math.sin(-0.35))}A${f(rx * 0.84)},${f(ry * 0.8)} 0 1 1 ${f(cx + rx * 0.84 * Math.cos(-1.35))},${f(cy + ry * 0.8 * Math.sin(-1.35))}Z` : inner;
  s += F(sauceD, '#8E2A1A');
  const r = rnd(seed);
  let ch = '';
  for (let k = 0; k < 9; k++) ch += F(blob(cx + (r() - 0.5) * rx * 1.4, cy + (r() - 0.5) * ry * 1.3, 2.4 + r() * 1.6, 1.4 + r(), seed * 3 + k, 7, 0.5), k % 3 ? '#D8B85A' : '#E6CC7A', 0);
  ch += top(sauceD);
  s += d.clip(sauceD, ch);
  s += L(sauceD, 0.35, '#5E1A10');
  // burnt bubbles on the crust
  for (let k = 0; k < 5; k++) {
    const a = r() * Math.PI * 2;
    s += dot(cx + Math.cos(a) * rx * 0.93, cy + Math.sin(a) * ry * 0.92, 0.45, '#4A2A10', 0.8);
  }
  return s;
}
function pepperoni(x: number, y: number, r = 1.5): string {
  return F(rell(x, y, r, r * 0.66, 0, 14), '#9A3A22', 0.3) + dot(x - r * 0.3, y - r * 0.15, r * 0.22, '#C86A4A', 0.9) + dot(x + r * 0.35, y + r * 0.15, r * 0.16, '#6A1A10', 0.8);
}

/** Small cel-shaded crumbed/fried nugget shape. */
function fried(d: Doc, path: string, x: number, y: number, rx: number, ry: number, seed: number, tone: [string, string] = FRIED): string {
  const r = rnd(seed);
  let t = '';
  for (let k = 0; k < 9; k++) t += dot(x + (r() - 0.5) * rx * 1.8, y + (r() - 0.5) * ry * 1.6, 0.3 + r() * 0.3, k % 2 ? '#E4C070' : '#8A5E24', 0.85);
  return cel(d, path, tone[0], tone[1], 0.5, [-0.6, -0.7]) + d.clip(path, t);
}

/** A sausage/finger-shaped link from a to b. */
function link(d: Doc, a: Pt, b: Pt, w: number, col: [string, string] = ['#9A4A2C', '#6A2C18']): string {
  const p = capsule(a, b, w, w * 0.92);
  let s = cel(d, p, col[0], col[1], 0.5, [-0.3, -0.5]);
  const mx = (a[0] + b[0]) / 2;
  const my = (a[1] + b[1]) / 2;
  s += gloss(mx - 0.8, my - w * 0.25, w * 0.9, w * 0.18, (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI, 0.35);
  return s;
}



const LATE: Partial<Record<Dish3Id, Body>> = {
  chowder: (d) => {
    const b = bowl(d, ['#E6DCC0', '#CFC2A0', '#A89A78'], { col: ['#7A8A9A', '#4E5E6E'], speck: true, seed: 401 });
    let c = '';
    for (const [x, y] of [[-4, -1], [3, 1.6], [5.6, -1.4], [-1, 2]] as Pt[]) c += F(rell(b.x + x, b.y + y, 0.7, 0.5, 0, 8), '#D8B040', 0.25);
    // clam shells, open
    for (const [x, y, a] of [[-4.6, 1.4, -20], [1.4, -1.6, 15]] as [number, number, number][]) c += `<g transform="translate(${f(b.x + x)} ${f(b.y + y)}) rotate(${a})">${F('M-2.4,0C-2.4,-2.4 2.4,-2.4 2.4,0Z', '#B8AC98', 0.35)}${L('M-1.4,-0.2L-0.8,-1.6M0,-0.2V-1.8M1.4,-0.2L0.8,-1.6', 0.25, '#7A6E5A')}${F('M-1,0.1h2l-1,0.8Z', '#C88A8A', 0.2)}</g>`;
    c += d.clip(b.soup, F(blob(b.x - 2, b.y - 1.6, 3, 1, 402), '#FFFFFF', 0, 'opacity="0.4"'));
    let s = b.s + d.clip(b.soup, c);
    // the sock, toe up, dangling over the rim
    s += cel(d, 'M23.4,13.2C23.6,9.6 24.8,7.2 27.4,6.4C29.4,5.8 30.4,7.4 29.4,8.8C28.2,10.4 26.6,11.2 26.2,14Z', '#C8C0AE', '#9A9280', 0.5);
    s += L('M23.6,12.2L26.4,12.8M23.8,11L26.6,11.6', 0.7, '#7A2A22') + F(blob(28.4, 7.4, 1.2, 0.8, 403), '#8A7A4A', 0, 'opacity="0.6"');
    s += fly(9.4, 7.6, 1);
    return s;
  },
  corndog: (d) => {
    let s = '';
    const dog = (x: number, y: number, rot: number, finger_: boolean) => {
      let o = L('M5,0L13,0', 1.4, INK) + L('M5,0L13,0', 0.8, '#D9C08A');
      o += cel(d, 'M-7,-2.8C-9.6,-2.8 -9.6,2.8 -7,2.8L4,2.6C6.6,2.6 6.6,-2.6 4,-2.6Z', '#C8963E', '#8E5E22', 0.55, [-0.4, -0.6]);
      const r = rnd(410 + x);
      for (let k = 0; k < 8; k++) o += dot(-7 + r() * 11, -2 + r() * 4, 0.35, k % 2 ? '#E6C070' : '#8A5A20', 0.85);
      o += L('M-6,-1.2l1.4,-0.8l1.4,0.8l1.4,-0.8l1.4,0.8l1.4,-0.8l1.4,0.8l1.4,-0.8', 0.6, '#B89A2A');
      if (finger_) o += finger(d, [-6, 0], [-11.6, -0.6], 2.6, SKIN, true, false);
      else o += F('M-8.6,-1.6C-11,-1.6 -11,1.6 -8.6,1.6Z', '#9A4A2C', 0.4);
      return `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)})">${o}</g>`;
    };
    s += dog(17.6, 12.6, -8, false) + dog(18.6, 18, 6, true);
    s += smear(26.6, 17.6, 2.2, 1, 411, '#B8962A', 0.8);
    return s;
  },
  eyesoup: (d) => {
    const b = bowl(d, ['#8A9A4A', '#6A7A32', '#3E4A1A'], { col: ['#5A5E62', '#34383C'] });
    let s = b.s;
    s += d.clip(b.soup, F(blob(b.x + 3, b.y + 1, 3, 1, 420), '#B0B86A', 0, 'opacity="0.5"') + L(rell(b.x - 4, b.y + 0.4, 2.6, 1.2, 0, 16), 0.35, '#B0B86A'));
    s += eyeball(d, b.x - 4, b.y + 0.2, 2.2, [0.6, 0.4], '#4E6A86', 421) + eyeball(d, b.x + 2.4, b.y - 1.2, 1.9, [-0.4, 0.5], '#6A4A2A', 422) + eyeball(d, b.x + 5.6, b.y + 1.4, 1.6, [-0.8, -0.2], '#4F6A3A', 423);
    s += L('M24.8,12.6L31,4.8', 1.6, INK) + L('M24.8,12.6L31,4.8', 0.9, '#A8A8A0') + F(rell(24.6, 12.8, 1.8, 1, -50, 10), '#A8A8A0', 0.4);
    return s;
  },
  stew: (d) => {
    const b = bowl(d, ['#7A5A30', '#5E3E1E', '#3A2410'], { col: ['#3E3B36', '#22201C'] });
    let s = b.s;
    let c = '';
    for (const [x, y, rr] of [[-4, 0.6, 1.6], [2, -1.4, 1.3], [4.6, 1.4, 1.5], [-1, 2, 1.1]] as [number, number, number][]) c += cel(d, blob(b.x + x, b.y + y, rr, rr * 0.7, 430 + x, 6, 0.4), '#8A5A3A', '#5A3A22', 0.35);
    c += F(rell(b.x + 0.6, b.y + 0.2, 1.4, 0.8, 0, 10), '#C8A040', 0.3);
    s += d.clip(b.soup, c);
    // a frog leg kicking out and a bone
    s += cel(d, 'M20.4,13.4C21.6,10.6 23.4,8.4 25.6,7.6L26.2,8.8C24.6,9.8 23.2,11.6 22.2,14Z', '#7E9A4A', '#526C2A', 0.45);
    s += F('M25.6,7.6l1.6,-1.6l0.4,1.2l1.4,-0.8l-0.2,1.4l1.4,0.2l-2,1.2Z', '#7E9A4A', 0.4);
    s += bone(d, [10.4, 13.6], [13.6, 7.6], 1.1);
    s += glossSteam(d, 18, 6);
    return s;
  },
  links: (d) => {
    let s = '';
    const pts: Pt[] = [[8.6, 17.4], [13.4, 13.4], [18.6, 15.8], [23.6, 12.6], [28, 15.6]];
    for (let k = 0; k < pts.length - 1; k++) {
      s += link(d, pts[k], pts[k + 1], 3, ['#8A4A2E', '#5E2C18']);
      const [a, b] = [pts[k], pts[k + 1]];
      // knuckle creases
      const mx = (a[0] + b[0]) / 2;
      const my = (a[1] + b[1]) / 2;
      s += L(`M${f(mx - 0.6)},${f(my - 1.2)}q0.6,0.8 0,1.8M${f(mx + 0.5)},${f(my - 1.1)}q0.6,0.8 0,1.8`, 0.3, '#3A1A0E');
    }
    for (const p of pts.slice(1, -1)) s += F(rell(p[0], p[1], 1, 0.8, 0, 10), '#E6D6B0', 0.3); // twisted casing knots
    s += F(rell(28, 15.6, 1.2, 0.9, 30, 10), '#DCD2B4', 0.3) + F(rell(8.4, 17.4, 1.2, 0.9, -30, 10), '#DCD2B4', 0.3); // nails at the ends
    s += smear(14, 20.4, 3.4, 1, 440, '#B8962A', 0.7);
    return s;
  },
  tbone: (d) => {
    const steak = 'M8.6,15.6C7.4,10.6 12,8.2 17,8.6C22.4,9 27.4,10.6 27.6,14.4C27.8,18 22.6,20.6 16.8,20.2C12.2,19.8 9.4,18.4 8.6,15.6Z';
    let s = seared(d, steak, [8, 8, 20, 12], 450);
    // the bone: a little headstone on top
    s += F('M15.6,10.4V18.6H18.2V10.4Z', BONE[0], 0.45) + F('M11.4,13.6H22.2V15.4H11.4Z', BONE[0], 0.45);
    s += F('M17.2,7.4C17.2,4.6 21.4,4.6 21.4,7.4V10.6H17.2Z', '#A8A69C', 0.5) + L('M18.2,8.2h2.2M19.3,7.2v3', 0.45, '#5E5C54');
    s += F(blob(24.2, 13.4, 1.8, 1, 451), '#7A2A22', 0, 'opacity="0.7"');
    s += L('M10,19.6q3,1.4 6,0.6', 0.5, BLOOD, 'opacity="0.8"');
    return s;
  },
  donuts: (d) => {
    let s = '';
    const nut = (x: number, y: number, seed: number, glaze: string, look: Pt) => {
      const o = rell(x, y, 5, 3.2, 0, 22);
      let t = cel(d, o, '#B8864A', '#7E5222', 0.5) + F(blob(x - 0.2, y - 0.4, 4.4, 2.6, seed, 9, 0.25), glaze, 0.3);
      const r = rnd(seed);
      for (let k = 0; k < 7; k++) t += L(`M${f(x - 3.6 + r() * 7)},${f(y - 2 + r() * 3.4)}l0.8,0.3`, 0.4, ['#B84A4A', '#5E8AA8', '#D8C84A', '#E6E0D0'][k % 4]);
      t += eyeball(d, x + 0.1, y - 0.1, 1.3, look, '#7A4A2A', seed + 1);
      return t;
    };
    s += nut(12.6, 13.4, 460, '#C88A9A', [0.5, 0.3]) + nut(23.4, 13, 462, '#E6DCC0', [-0.6, 0.2]) + nut(18, 18.2, 464, '#5A3A28', [0, 0.6]);
    return s;
  },
  pizza: (d) => pizzaDisc(d, 18, 15.4, 11, 6.6, 470, () => pepperoni(13, 15) + pepperoni(19.6, 17.6) + pepperoni(22, 13.4) + eyeball(d, 15.6, 18.4, 1.3, [0.3, 0.4], '#4E6A86', 471) + eyeball(d, 18.4, 12.6, 1.2, [-0.4, 0.4], '#4F6A3A', 472) + F(rell(25, 16.6, 1.6, 0.6, 20, 8), LETTUCE[0], 0.2), true) + fly(28.6, 8, 1),
  calzone: (d) => {
    const c = 'M7.6,17.6C7.4,10.8 14,7 20.6,8C26.4,8.8 29.4,13 28.4,17.6C24.6,19.8 12.4,20.4 7.6,17.6Z';
    let s = cel(d, c, BUN[0], BUN[1], 0.6, [-1, -1]);
    const r = rnd(480);
    for (let k = 0; k < 8; k++) s += dot(10 + r() * 16, 10 + r() * 6, 0.4, '#5A3410', 0.7);
    s += gloss(14, 10.6, 3, 0.8, -15, 0.3);
    // crimped seam with a hand reaching out, and sauce oozing
    s += L('M8.4,17.4Q18,20.6 27.8,17.2', 0.9, BUN[1]);
    for (let k = 0; k < 9; k++) s += L(`M${f(9.4 + k * 2.1)},${f(18 + Math.sin(k) * 0.3)}l0.4,1`, 0.4, '#704616');
    s += smear(14, 19.6, 3, 1.1, 481, '#8E2A1A', 0.85) + smear(22, 19.6, 2.2, 0.9, 482, '#8E2A1A', 0.85);
    for (const [a, b] of [[[19, 18.6], [21.6, 13]], [[20.4, 18.6], [23.6, 13.8]], [[21.8, 18.4], [25.4, 15]]] as [Pt, Pt][]) s += finger(d, a, b, 1.6, ZSKIN, true, false);
    return s;
  },
  jerky: (d) => {
    let s = '';
    const strip = (pts: string, seed: number) => {
      let o = cel(d, pts, '#5E2E1A', '#3A180C', 0.5, [-0.5, -0.5]);
      const r = rnd(seed);
      let t = '';
      for (let k = 0; k < 6; k++) t += L(`M${f(8 + r() * 20)},${f(9 + r() * 11)}l${f(2 + r() * 2)},${f(-0.6 + r() * 1.2)}`, 0.35, '#8A4A2A', 'opacity="0.7"');
      o += d.clip(pts, t);
      return o;
    };
    s += strip('M8,12.4L22,9.6L23,11.8L9,14.8Z', 490) + strip('M11,17.4L26.6,13.4L27.4,15.8L11.8,19.8Z', 491);
    // one strip is an ear
    const ear = 'M23.6,17C25.6,14.8 29.6,15.6 29.4,19C29.2,21.4 26.6,22 25.6,20.6C27,20 27.2,18.2 25.6,18Z';
    s += cel(d, ear, '#6A361E', '#3E1C0E', 0.5) + L('M25,16.6q2.4,0.2 2.6,2.6', 0.4, '#2A100A') + dot(24.6, 17.2, 0.6, '#B8963E');
    s += smear(10, 20, 2, 0.7, 492, '#2A1A10', 0.5);
    return s;
  },
  knots: () => {
    let s = '';
    const knot = (x: number, y: number, seed: number) => {
      const loop = `M${f(x - 4)},${f(y + 1)}C${f(x - 5)},${f(y - 3)} ${f(x + 1)},${f(y - 4)} ${f(x + 1.6)},${f(y - 0.6)}C${f(x + 2)},${f(y + 2.4)} ${f(x - 2)},${f(y + 2.6)} ${f(x - 1)},${f(y)}C${f(x)},${f(y - 2.4)} ${f(x + 4.6)},${f(y - 2)} ${f(x + 4.2)},${f(y + 1.6)}`;
      let o = L(loop, 3.6, INK) + L(loop, 2.6, '#B07E3E') + L(loop, 1, '#D8A860', 'transform="translate(-0.3 -0.5)"');
      const r = rnd(seed);
      for (let k = 0; k < 6; k++) o += dot(x - 4 + r() * 8, y - 3 + r() * 4, 0.35, k % 2 ? '#E8E2C8' : '#6E8A3A', 0.95);
      return o;
    };
    s += knot(12.4, 14.2, 500) + knot(22.4, 13.6, 501) + knot(17.2, 19, 502);
    // one knot is clearly a loop of gut
    s += L('M24,18.4q2.6,-2.4 4.6,0q1.6,2.4 -1.2,3.2', 2.4, INK) + L('M24,18.4q2.6,-2.4 4.6,0q1.6,2.4 -1.2,3.2', 1.6, '#C48C88');
    s += fly(9, 8, 1);
    return s;
  },
  meatballs: (d) => {
    let s = smear(18, 16, 9, 4, 510, '#8E2A1A', 0.85);
    // spaghetti
    for (let k = 0; k < 6; k++) s += L(`M${f(9 + k * 1.6)},${f(18 - k * 0.6)}q4,-3 8,0t8,-1`, 0.7, '#D8C07A');
    const ball = (x: number, y: number, rr: number, seed: number) => {
      const p = blob(x, y, rr, rr * 0.82, seed, 9, 0.2);
      const r = rnd(seed);
      let t = '';
      for (let k = 0; k < 7; k++) t += dot(x + (r() - 0.5) * rr * 1.6, y + (r() - 0.5) * rr * 1.4, 0.3, k % 2 ? '#3A1A0E' : '#9A5A3A', 0.8);
      return cel(d, p, '#7A4028', '#4E2414', 0.5, [-0.6, -0.7]) + d.clip(p, t) + gloss(x - rr * 0.35, y - rr * 0.4, rr * 0.3, rr * 0.15, -20, 0.45);
    };
    s += ball(13, 15.4, 3.2, 511) + ball(22.6, 15, 3, 512) + ball(17.6, 11.6, 3, 513) + ball(18, 18.2, 3.2, 514);
    s += eyeball(d, 17.8, 18.2, 1.3, [0.2, 0.5], '#4E6A86', 515);
    s += F(rell(16.4, 9.4, 1.2, 0.5, 0, 8), '#E6E0C8', 0.2) + F(rell(19, 9.6, 1, 0.4, 20, 8), '#E6E0C8', 0.2);
    return s;
  },
  brats: (d) => {
    let s = '';
    for (const [a, b, seed] of [[[8.6, 13.6], [26.6, 11.2], 520], [[9.4, 18.2], [27.4, 16.8], 521]] as [Pt, Pt, number][]) {
      s += link(d, a, b, 4, ['#9A5A36', '#6A3418']);
      for (let k = 1; k < 5; k++) {
        const u = k / 5;
        const x = a[0] + (b[0] - a[0]) * u;
        const y = a[1] + (b[1] - a[1]) * u;
        s += L(`M${f(x - 0.6)},${f(y - 1.8)}l1.4,3.4`, 0.7, '#2A120A', 'opacity="0.8"');
      }
      // split casing, brain bulging out
      const mx = (a[0] + b[0]) / 2 + 2;
      const my = (a[1] + b[1]) / 2 - 0.8;
      s += brain(d, mx, my, 2.6, 1.3, seed + 5, 0.35);
    }
    s += L('M10,15.8l1.6,-1l1.6,1l1.6,-1l1.6,1l1.6,-1l1.6,1l1.6,-1l1.6,1', 0.6, '#C9A43A');
    return s;
  },
  swamp: (d) => {
    const b = bowl(d, ['#6A7A3A', '#4A5A26', '#2A3414'], { col: ['#6A5A42', '#42382A'] });
    let s = b.s;
    let c = F(rell(b.x - 3.4, b.y + 0.6, 3, 1.6, 10, 16), '#5E8A3A', 0.35) + L(`M${f(b.x - 3.4)},${f(b.y + 0.6)}l2.4,-0.8`, 0.4, '#3E5A26');
    c += dot(b.x + 3, b.y + 1.6, 0.6, '#A8B86A', 0.9) + dot(b.x + 5, b.y - 0.6, 0.4, '#A8B86A', 0.9);
    s += d.clip(b.soup, c);
    // a fish skeleton poking out
    s += L(`M${f(b.x + 1)},${f(b.y)}L${f(b.x + 8)},${f(b.y - 5)}`, 0.7, BONE[0]);
    for (let k = 0; k < 4; k++) s += L(`M${f(b.x + 2.4 + k * 1.6)},${f(b.y - 1 - k * 1.1)}l-0.6,-1.4M${f(b.x + 2.4 + k * 1.6)},${f(b.y - 1 - k * 1.1)}l1.2,0.8`, 0.4, BONE[0]);
    s += F(`M${f(b.x + 8)},${f(b.y - 5)}l2,-1.8l0.6,2.6Z`, BONE[0], 0.35) + dot(b.x + 9.2, b.y - 5.6, 0.35, INK);
    s += eyeball(d, b.x - 3.6, b.y - 0.6, 1.1, [0.3, -0.2], '#B8A23A', 531);
    s += fly(10, 6, 1) + fly(25.4, 4.8, 0.9);
    return s;
  },
  hog: (d) => {
    let s = '';
    const body = 'M6.8,16.4C6.4,11.6 11,8.2 17.6,8.4C24,8.6 29.2,11 29,15.6C28.8,19.4 23.6,21 17.6,20.8C11.6,20.6 7.2,19.6 6.8,16.4Z';
    s += cel(d, body, '#B0663A', '#7A3A1C', 0.6, [-1.2, -1.2]);
    s += d.clip(body, L('M10,12q8,-3 16,0M9,15.6q9,-3 19,0M10,18.6q8,-2 16,0', 0.5, '#5A2A12', 'opacity="0.6"') + gloss(14, 10.4, 4, 0.9, -8, 0.45));
    // the head end (left) with the apple and X eyes, curly tail (right)
    s += cel(d, 'M6.8,16.4C5,15.4 4.4,12.6 6.6,11.4C8,10.6 9.8,11.6 10,13.2Z', '#B0663A', '#7A3A1C', 0.5);
    s += F(rell(4.6, 15.6, 2.2, 2, 0, 14), '#8A2A22', 0.5) + L('M4.6,13.8q0.4,-1.2 1.2,-1.6', 0.5, '#4A3A1E') + gloss(4, 15, 0.8, 0.4, -20, 0.6);
    s += L('M7.6,12.4l1,1M8.6,12.4l-1,1', 0.45, INK);
    s += F('M9,10.8l1.4,-2.4l1,2.6Z', '#9A5430', 0.4);
    s += L('M28.6,13.4q2,-1 1.4,-2.4q-1,-0.8 -1.4,0.6', 0.7, '#7A3A1C');
    // legs tied up
    for (const x of [11.6, 23.4]) s += cel(d, capsule([x, 19.6], [x + 1.4, 22.4], 1.6, 1.3), '#A85E36', '#7A3A1C', 0.4);
    s += L('M10.6,17.6q7,3 15,0', 0.5, '#C9B080');
    return s;
  },
  deepdish: (d) => {
    // a deep wedge, cut face toward us: layers of crust, cheese, sauce and graveyard dirt
    let s = F('M7.6,18.6L18,9.4L28.8,13.4L21.6,21Z', '#140E08', 0, 'opacity="0.25" transform="translate(0.6 0.9)"');
    s += cel(d, 'M7.6,14.6L18,6.6L28.8,10.4L28.8,13.6L21.6,21L7.6,18.4Z', BUN[0], BUN[1], 0.55);
    const face = 'M7.6,14.6L21.6,17.2L21.6,21L7.6,18.4Z';
    s += F(face, '#C8963E', 0.5);
    s += d.clip(face, F('M7,15.6L22,18.2V19.4L7,16.8Z', '#E6CC7A') + F('M7,16.6L22,19.2V20.2L7,17.6Z', '#8E2A1A') + dot(12, 17.4, 0.5, '#5A4430') + dot(16, 18.4, 0.4, '#5A4430'));
    const top = 'M7.6,14.6L18,7.4L28.8,10.6L21.6,17.2Z';
    s += F(top, '#8E2A1A', 0.5);
    s += d.clip(top, F(blob(17.4, 12, 5, 2.4, 541), '#D8B85A', 0) + pepperoni(14, 13.6, 1.3) + pepperoni(21.4, 12.4, 1.3));
    // a worm wriggling out of the dirt layer
    s += L('M14,18.2q-1.6,1.4 -0.4,2.4t-0.6,2', 1.2, INK) + L('M14,18.2q-1.6,1.4 -0.4,2.4t-0.6,2', 0.7, '#C48C88');
    s += finger(d, [19, 12.6], [20.6, 7.4], 1.7, ZSKIN, true, false);
    return s;
  },
  fishchips: (d) => {
    let s = '';
    const fish = 'M7.6,13.6C9,9.6 17,8.6 22,10.4L25.4,8.6L24.6,12.2L25.6,15.6L22,14C17,16 9.4,16.6 7.6,13.6Z';
    s += fried(d, fish, 15, 12.4, 8, 3, 550);
    s += eyeball(d, 9.8, 12.2, 1, [-0.6, 0], '#C8B04A', 551);
    // chips with a pair of chipped teeth mixed in
    for (const [a, b] of [[[14, 19.4], [22, 17.6]], [[16.6, 21], [25, 19]], [[21, 16.2], [28, 17.4]], [[12.6, 17.8], [19.4, 20.6]]] as [Pt, Pt][]) s += cel(d, capsule(a, b, 1.8, 1.8), '#D8B05A', '#A07A2A', 0.4);
    s += tooth(26.6, 13.6, 2.2, 2.6, 160) + tooth(28.6, 14.2, 2, 2.4, 175, '#D8CCA0');
    s += F(rell(10.4, 19.6, 2.6, 1.4, 0, 14), '#B8B2A0', 0.4) + F(rell(10.4, 19.4, 2, 1, 0, 12), '#B8C060', 0.2);
    return s;
  },
  turducken: (d) => {
    let s = '';
    const bird = 'M8,16.6C7,11.4 11.6,7.6 18,7.8C24.6,8 29,11.6 28.4,16C27.8,19.8 22.6,21.2 17.6,21C12.6,20.8 8.6,19.6 8,16.6Z';
    s += cel(d, bird, '#C08A44', '#8A5A22', 0.6, [-1.2, -1.2]);
    s += gloss(14, 10.4, 4, 1, -10, 0.4);
    // Frankenstein stitches across the middle, neck bolts
    s += L('M10,14.4Q18,11 27.4,13.4', 0.7, '#3A2410');
    for (let k = 0; k < 8; k++) s += L(`M${f(11 + k * 2.2)},${f(13.4 - Math.sin((k / 7) * Math.PI) * 1.6)}l0.4,1.6`, 0.5, INK);
    for (const x of [8.6, 27.8]) s += F(`M${f(x - 1)},${f(15)}h2v2h-2Z`, '#8A8C86', 0.4) + L(`M${f(x - 1.6)},${f(16)}h3.2`, 0.5, '#5A5C56');
    // three drumsticks of three birds
    for (const [a, b] of [[[11, 19.4], [8, 22.4]], [[24.6, 19.2], [28, 22]], [[18, 20.4], [18.4, 23.6]]] as [Pt, Pt][]) s += bone(d, a, b, 0.8);
    s += F('M14.6,8.6l1,-2.6l1.4,2.2Z', '#B83A2A', 0.35);
    return s;
  },
  burntends: (d) => {
    let s = '';
    const r = rnd(560);
    const cubes: Pt[] = [[11, 16], [16, 18.4], [21.4, 16.8], [25.4, 14.6], [14.4, 12.4], [19.6, 11.8], [24, 18.6], [9.6, 12.8]];
    for (const [x, y] of cubes.sort((a, b) => a[1] - b[1])) {
      const k = 2.4 + r() * 0.6;
      const top = `M${f(x - k)},${f(y - k * 0.4)}L${f(x)},${f(y - k)}L${f(x + k)},${f(y - k * 0.4)}L${f(x)},${f(y + k * 0.2)}Z`;
      const lf = `M${f(x - k)},${f(y - k * 0.4)}L${f(x)},${f(y + k * 0.2)}L${f(x)},${f(y + k * 0.9)}L${f(x - k)},${f(y + k * 0.3)}Z`;
      const rt = `M${f(x)},${f(y + k * 0.2)}L${f(x + k)},${f(y - k * 0.4)}L${f(x + k)},${f(y + k * 0.3)}L${f(x)},${f(y + k * 0.9)}Z`;
      s += F(lf, '#3A1C0E', 0.4) + F(rt, '#24100A', 0.4) + F(top, '#5A2A16', 0.4) + dot(x - k * 0.3, y - k * 0.6, 0.35, '#C86A3A', 0.8) + dot(x + k * 0.4, y - k * 0.3, 0.3, '#1A0A04');
    }
    s += F(blob(17, 6, 4, 2, 561), '#7A766E', 0, `opacity="0.5" filter="${d.blur(0.8)}"`);
    s += smear(13.6, 21, 3, 0.8, 562, '#6A2416', 0.7);
    return s;
  },
  fondue: (d) => {
    const b = bowl(d, ['#F0D070', '#D8B040', '#A8822A'], { rx: 7.6, ry: 4.4, y: 14.4, col: ['#6E2A22', '#4A1A14'] });
    let s = b.s + d.clip(b.soup, F(blob(b.x - 1, b.y - 0.6, 3, 1.2, 570), '#FFF0B0', 0, 'opacity="0.6"'));
    // forks dunked in, each with a finger skewered
    for (const [x, y, ax, ay, seed] of [[15.6, 14, 8.4, 4.6, 571], [20.6, 14, 28, 4.4, 572]] as number[][]) {
      s += L(`M${f(x)},${f(y)}L${f(ax)},${f(ay)}`, 1.2, INK) + L(`M${f(x)},${f(y)}L${f(ax)},${f(ay)}`, 0.6, '#A8A8A0');
      const mx = (x + ax) / 2;
      const my = (y + ay) / 2;
      s += finger(d, [mx - (ax - x) * 0.12, my + 1.6], [mx + (ax - x) * 0.12, my - 1.8], 2, SKIN, true, false);
      s += F(blob(mx, my + 1.4, 1.4, 0.8, seed), '#E6C050', 0.2);
    }
    // the burner under it
    s += F('M12,21.4h12l-1,1.6h-10Z', '#3A3833', 0.5) + F(rell(18, 20.8, 3, 1, 0, 10), '#4E7FA6', 0, 'opacity="0.7"');
    return s;
  },
  coffinribs: (d) => {
    // an open pine coffin full of ribs
    const box = 'M10.4,10.4L16,7.8L28.4,11.6L26.6,16.6L19.6,21.2L9.6,17.6Z';
    let s = cel(d, box, '#8E6436', '#6A4524', 0.6);
    s += d.clip(box, L('M10,13l17,4M12,9.6l15,4.6', 0.4, '#4E321A', 'opacity="0.6"'));
    const inner = 'M11.6,11.2L16.2,9.2L27,12.4L25.6,15.8L19.6,19.6L11,16.8Z';
    s += F(inner, '#3A2410', 0.5);
    let ribs = '';
    for (let k = 0; k < 5; k++) {
      const x = 13 + k * 2.6;
      ribs += cel(d, capsule([x, 11 + k * 0.5], [x + 1.6, 17 + k * 0.4], 2, 1.8), '#7A3A22', '#4E2010', 0.4) + L(`M${f(x)},${f(10.4 + k * 0.5)}l0.4,-1.4`, 1.2, BONE[0]);
    }
    s += d.clip(inner, ribs + F(inner, d.linear(11, 10, 27, 19, [[0, '#000', 0.25], [1, '#000', 0]])));
    s += smear(19, 14, 4, 1.2, 580, '#8E2A1A', 0.6);
    // the lid propped beside it
    s += F('M4.8,16.4L8.6,7.2L12.4,6.6L10.8,15.6Z', '#A07040', 0.55) + L('M7.6,10.2l3,-0.4M7,12.4l3,-0.4', 0.5, '#4E321A');
    return s;
  },
  beans: (d) => {
    // a battered tin can, lid peeled back, beans spilling
    let s = '';
    const can = 'M11,9.6V18.4C11,21 21,21 21,18.4V9.6Z';
    s += cel(d, can, '#A8ACA8', '#6E726E', 0.6, [-1.4, 0]);
    s += d.clip(can, F('M10,12.6H22V17H10Z', '#7A3A2A') + L('M11,12.6H21M11,17H21', 0.4, INK) + F(rell(16, 14.8, 2.4, 1.4, 0, 16), '#D8C890', 0.3) + dot(15.4, 14.6, 0.35, INK) + dot(16.6, 14.6, 0.35, INK) + L('M15.2,15.4h1.6', 0.3, INK));
    s += F(rell(16, 9.6, 5, 2, 0, 20), '#C0C4C0', 0.6) + F(rell(16, 9.8, 4.2, 1.5, 0, 18), '#8E3A1E', 0.3);
    for (let k = 0; k < 7; k++) s += F(rell(13.6 + (k % 4) * 1.6, 9.2 + Math.floor(k / 4) * 0.9, 0.7, 0.45, 20, 8), '#A84A26', 0.2);
    s += F('M20,8.4C22.6,5.6 26.4,5.4 27,7.2L21.4,9.8Z', '#B8BCB8', 0.5);
    // the spill
    s += F(blob(25.4, 17.4, 4, 2, 590), '#8E3A1E', 0.4);
    for (let k = 0; k < 6; k++) s += F(rell(23.4 + (k % 3) * 1.7, 16.8 + Math.floor(k / 3) * 1.1, 0.7, 0.45, 15, 8), '#B0522A', 0.2);
    s += L('M22.4,18.4q1.2,1.6 3,0.6', 1, INK) + L('M22.4,18.4q1.2,1.6 3,0.6', 0.6, '#C48C88');
    return s;
  },
  stromboli: (d) => {
    let s = '';
    const roll = 'M7.6,13C7.6,9.6 11,8.4 13,8.6L26,10.6C28.2,11 29,13.4 28.6,15.4C28.2,17.8 26,18.6 24,18.4L11.4,17.4C9,17.2 7.6,15.6 7.6,13Z';
    s += cel(d, roll, BUN[0], BUN[1], 0.6, [-1, -1]);
    s += d.clip(roll, L('M14,8.6l-1,9M18.4,9.2l-1,8.6M22.8,9.8l-1,8.4', 0.7, '#8E5E2A') + gloss(16, 10, 4, 0.7, 5, 0.3));
    // the cut end: a spiral of meat and gut
    s += F(rell(26.6, 14.4, 2.6, 3.8, 10, 20), '#E6CC8A', 0.5);
    s += L('M26.6,14.4m-0.4,0a0.6,0.8 0 1 1 1,0.6a1.4,1.8 0 1 1 -2.2,-1.4a2,2.8 0 1 1 3.4,2.2', 0.7, '#8E2A1A');
    s += smear(17, 19.6, 4, 1, 600, '#8E2A1A', 0.75);
    s += fly(10, 6, 1);
    return s;
  },
  mammoth: (d) => {
    let s = '';
    const meat = 'M6.6,15.4C5.6,10.2 10,6.6 15.4,7.2C19.6,7.6 22,9.6 22.6,12.6C23,15.2 21.4,18.8 16.8,19.8C11.6,20.8 7.4,19.4 6.6,15.4Z';
    s += bone(d, [20, 14.6], [30, 17.6], 2.6);
    s += cel(d, meat, '#8A4A2A', '#5A2A14', 0.6, [-1.2, -1.2]);
    s += d.clip(meat, L('M9,10q4,-2 9,0M7.6,13.6q6,-2.4 12,0M8.6,17q5,-1.6 10,0', 0.6, '#4A200E', 'opacity="0.7"') + gloss(11, 9.4, 3, 0.9, -15, 0.45));
    // tufts of shaggy fur still on it
    for (const [x, y] of [[8, 9.6], [12.6, 7.2], [6.6, 13.8]] as Pt[]) s += L(`M${f(x)},${f(y)}l-1.2,-1.4M${f(x + 0.8)},${f(y - 0.2)}l-0.4,-1.8M${f(x + 1.6)},${f(y)}l0.4,-1.6`, 0.5, '#6A4A2A');
    s += F('M15,11.6l1.6,-0.4l0.6,1.4l-1.6,0.6Z', '#C8D8E0', 0.3); // a chip of glacier ice
    return s;
  },
  tomahawk: (d) => {
    let s = bone(d, [17.6, 13.4], [31, 5.4], 1.6);
    const steak = 'M6.4,16.2C5.8,12.2 10,9.6 14.6,10.2C19,10.8 21.4,13.2 21,16.4C20.6,19.6 16.6,21.2 12.4,20.8C8.8,20.4 6.8,18.8 6.4,16.2Z';
    s += seared(d, steak, [6, 10, 15, 11], 620);
    s += F(blob(15.6, 15.6, 2.4, 1.4, 621), '#E6D6B0', 0, 'opacity="0.55"'); // fat cap
    s += L('M8,19.4q2.4,1.4 5,1', 0.6, BLOOD);
    // the grudge: a little bandage on the bone
    s += `<g transform="translate(25.2 9.2) rotate(-32)">${F('M-2,-1H2V1H-2Z', '#C9A27A', 0.35)}${dot(0, 0, 0.4, BLOOD, 0.7)}</g>`;
    return s;
  },
  mummywrap: (d) => {
    let s = '';
    const wrap = (x: number, y: number, rot: number, seed: number) => {
      const p = 'M-6,-2.8C-7,-2.8 -7,2.8 -6,2.8H6C7,2.8 7,-2.8 6,-2.8Z';
      let o = cel(d, p, '#D8CCA8', '#A89A74', 0.55);
      const r = rnd(seed);
      let t = '';
      for (let k = 0; k < 5; k++) t += L(`M${f(-6 + k * 3 + r())},-3l${f(-1.6 + r())},6`, 0.5, '#8A7A5A', 'opacity="0.8"');
      t += F(blob(2, 1, 2, 1, seed + 1), '#8A6A3A', 0, 'opacity="0.35"');
      o += d.clip(p, t);
      return `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)})">${o}</g>`;
    };
    s += wrap(16, 12.4, -8, 630) + wrap(19.4, 17.6, 5, 632);
    // an eye peeking out between the bandages, a loose end trailing
    s += F(rell(17.6, 12, 2, 1, -8, 12), '#1A1410') + eyeball(d, 17.6, 12, 1, [0.4, 0.2], '#B8A23A', 633);
    s += L('M25.4,18.6q2.4,0.6 3,3', 1.4, INK) + L('M25.4,18.6q2.4,0.6 3,3', 0.8, '#D8CCA8');
    s += smear(10.4, 19, 2.4, 0.8, 634, '#8E6A2A', 0.7);
    return s;
  },
  potpie: (d) => {
    let s = cel(d, 'M7.8,13.4C7.8,19.6 28.2,19.6 28.2,13.4L27,18.2C24,21.6 12,21.6 9,18.2Z', '#9A9C96', '#6A6C66', 0.55);
    const crust = rell(18, 13.4, 10.2, 5.4, 0, 30);
    s += cel(d, crust, '#C89650', '#9A6A2A', 0.6, [-0.8, -0.8]);
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * Math.PI * 2;
      s += F(rell(18 + Math.cos(a) * 9.6, 13.4 + Math.sin(a) * 5, 1.1, 0.7, (a * 180) / Math.PI, 8), '#B8843E', 0.3);
    }
    s += L('M15,11.6l2,1.2M19,11l2,1.4', 0.6, '#6A4416');
    // something punching up through the crust
    s += F('M17,14.6L15.4,12.4L17.6,12.8L18.6,11.2L19.6,13.2L21.4,12.6L20.2,14.8Z', '#4A2A10', 0.4);
    s += fistUp(d, 18.4, 13.4);
    s += F(blob(22.4, 15, 1.6, 0.8, 640), '#8E2A1A', 0.3);
    return s;
  },
  tempura: (d) => {
    let s = F(rell(25.8, 17.8, 3.2, 1.9, 0, 18), '#B8B2A0', 0.5) + F(rell(25.8, 17.7, 2.5, 1.35, 0, 16), '#5A3010', 0.3);
    const toe = (x: number, y: number, rot: number, seed: number, big: boolean) => {
      const w = big ? 3.6 : 2.6;
      const p = blob(0, 0, w, w * 0.7, seed, 9, 0.5);
      let o = fried(d, p, 0, 0, w, w * 0.7, seed, ['#E0C07A', '#B08A40']);
      o += F(rell(-w * 0.6, -0.2, w * 0.35, w * 0.28, 0, 10), '#DCD2B4', 0.3);
      return `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)})">${o}</g>`;
    };
    s += toe(11.4, 14.2, -20, 650, true) + toe(17, 12.4, 10, 651, false) + toe(13, 18.4, 5, 652, false) + toe(19.4, 17.4, -10, 653, false) + toe(22.6, 12.8, 25, 654, false);
    s += F('M7,9.6l3,1l-0.4,1l-3,-1Z', '#3A6A3A', 0.3);
    return s;
  },
  hash: (d) => {
    let s = '';
    // a slab of fried hash cut into a headstone, crumbs all round
    const stone = 'M10.6,18.6V11.6C10.6,6.4 21.4,6.4 21.4,11.6V18.6Z';
    s += fried(d, stone, 16, 13, 6, 6, 660, ['#B8843E', '#7E5420']);
    s += F('M21.4,11.6l2.2,1v6.4l-2.2,-0.4Z', '#7E5420', 0.5);
    // a skull branded into it
    s += F('M14.2,13C14.2,10.4 17.8,10.4 17.8,13L17,14.4H15Z', '#5A3410') + dot(15.3, 12.6, 0.5, '#B8843E') + dot(16.7, 12.6, 0.5, '#B8843E');
    const r = rnd(661);
    for (let k = 0; k < 12; k++) s += F(rell(8 + r() * 20, 18 + r() * 4, 0.8, 0.6, r() * 90, 8), k % 3 ? '#B8843E' : '#6A2A1A', 0.25);
    s += F(rell(24.8, 16.6, 2.4, 1.6, 0, 14), '#F0E8C0', 0.4) + F(rell(25, 16.4, 1.2, 0.8, 0, 10), '#E0A030', 0.2); // fried egg
    return s;
  },
  elixir: (d) => {
    const b = bowl(d, ['#C8F070', '#86C030', '#4A7A1A'], { col: ['#4A3E5A', '#2E2438'] });
    let s = F(rell(b.x, b.y, b.rx + 2, b.ry + 2, 0, 24), '#9BD62E', 0, `opacity="0.35" filter="${d.blur(1.2)}"`) + b.s;
    // a beating heart floating in it, bubbles
    s += cel(d, `M${f(b.x - 1)},${f(b.y + 1.6)}C${f(b.x - 4)},${f(b.y - 0.6)} ${f(b.x - 2.6)},${f(b.y - 3)} ${f(b.x - 0.6)},${f(b.y - 1.4)}C${f(b.x + 0.6)},${f(b.y - 3.4)} ${f(b.x + 3)},${f(b.y - 1.6)} ${f(b.x - 1)},${f(b.y + 1.6)}Z`, '#A84A4A', '#7A2A2A', 0.45);
    s += L(`M${f(b.x - 0.4)},${f(b.y - 2.2)}q0.4,-1.4 1.6,-1.6`, 0.6, '#5E7A9A');
    for (const [x, y, rr] of [[4, 0.6, 0.9], [-5, 1, 0.7], [5.6, -1.6, 0.5]] as [number, number, number][]) s += L(rell(b.x + x, b.y + y, rr, rr * 0.7, 0, 10), 0.4, '#E6FA9A');
    s += F('M26,8.6h2.4v2.6l1.6,3.4h-5.6l1.6,-3.4Z', '#86A8A0', 0.5) + F('M25.8,13l3.8,0l0.4,1.6h-4.6Z', '#9BD62E', 0) + F('M26,7.4h2.4v1.2h-2.4Z', '#8E6A3E', 0.4);
    return s;
  },
  kraken: () => {
    let s = L('M5,15.4L31,11.4', 1.6, INK) + L('M5,15.4L31,11.4', 0.9, '#8E6A40');
    const t1 = 'M8,16C8,11 12,8.6 16,9.4C20.4,10.2 22,14 20,16.4C18.6,18 16,17.6 16,15.8C16,14.2 18,14 18,15';
    s += L(t1, 4.4, INK) + L(t1, 3.4, '#9A4A5A') + L(t1, 1.4, '#C07A88', 'transform="translate(-0.3 -0.5)"');
    for (const [x, y] of [[9.4, 13], [11.6, 10.4], [14.6, 9.4], [18.4, 10.4], [20.6, 13.4]] as Pt[]) s += F(rell(x, y + 1.6, 0.8, 0.55, 0, 10), '#E6C4C8', 0.3) + dot(x, y + 1.6, 0.3, '#7A3A44');
    // a second tentacle curling up off the plate, waving
    const t2 = 'M22,15C24.6,15 26,12 25.4,9C25,7 26.4,5.4 28,6.2';
    s += L(t2, 3.4, INK) + L(t2, 2.4, '#9A4A5A') + L(t2, 0.8, '#C07A88', 'transform="translate(-0.3 -0.4)"');
    for (let k = 0; k < 4; k++) s += L(`M${f(12 + k * 2.4)},${f(18.6)}l0.8,-1.6`, 0.8, '#2A120A', 'opacity="0.7"'); // grill marks
    s += F(rell(10, 20, 1.6, 0.8, 0, 10), '#D8C04A', 0.3); // lemon
    return s;
  },
  pizzaface: (d) =>
    pizzaDisc(d, 18, 15.4, 11, 6.6, 680, () => {
      let o = pepperoni(13.6, 14, 1.9) + pepperoni(22.4, 13.6, 1.9);
      o += dot(13.8, 14.2, 0.6, INK) + dot(22.2, 13.8, 0.6, INK);
      o += L('M11.6,11.6l3.6,1.2M24.4,11.4l-3.6,1.2', 0.9, '#3E5A26'); // pepper eyebrows, furious
      o += L('M13.4,19q4.6,-2.6 9.2,0', 1.2, '#3E5A26'); // frowning pepper mouth
      o += F(rell(18, 16.2, 1.2, 0.8, 0, 10), '#7A4A2A', 0.3); // mushroom nose
      return o;
    }) + fly(28, 8, 1),
  damned: (d) => {
    let s = '';
    const slab = 'M6.6,14.6L19,8.6L29.4,12.4L17.2,19.4Z';
    const side = 'M6.6,14.6L17.2,19.4L17.2,21.6L6.6,16.8Z';
    const side2 = 'M17.2,19.4L29.4,12.4L29.4,14.6L17.2,21.6Z';
    s += F(side, '#7A3020', 0.5) + F(side2, '#5A2014', 0.5);
    s += d.clip(side, L('M6.6,15.2L17.2,20M6.6,15.8L17.2,20.6', 0.5, '#C04A3A')) + d.clip(side2, L('M17.2,20L29.4,13M17.2,20.6L29.4,13.6', 0.5, '#A03A2A')); // smoke ring
    s += seared(d, slab, [6, 8, 24, 12], 690, '#8A3A2A', ['#3A2014', '#1E0E08'], false);
    const r = rnd(691);
    for (let k = 0; k < 10; k++) s += dot(9 + r() * 18, 10 + r() * 8, 0.4, '#0E0804', 0.9);
    // a tiny devil's pitchfork stuck in it
    s += L('M20,12.4L23.6,3.6', 0.9, INK) + L('M20,12.4L23.6,3.6', 0.5, '#B83A2A');
    s += L('M22,3.4L23.6,3.6L25.2,4.4M22.4,2.4l-0.4,1M23.8,2.4L23.6,3.6M25.4,3.2l-0.2,1.2', 0.6, '#B83A2A');
    s += F(blob(15, 6, 3, 1.6, 692), '#5A5650', 0, `opacity="0.4" filter="${d.blur(0.8)}"`);
    return s;
  },
  apocalypse: (d) => {
    let s = '';
    // everything at once: ribs, a drumstick, a slider, eyeballs, a finger, a brain
    for (let k = 0; k < 4; k++) s += cel(d, capsule([8 + k * 2.2, 11.6 + k * 0.3], [9.6 + k * 2.2, 17 + k * 0.4], 1.9, 1.7), '#7A3A22', '#4E2010', 0.4) + L(`M${f(8 + k * 2.2)},${f(11 + k * 0.3)}l0.3,-1.2`, 1.1, BONE[0]);
    s += brain(d, 22.6, 10.6, 4, 2.6, 701, 0.5);
    s += bone(d, [24, 19], [29.6, 21.4], 1.1) + cel(d, blob(21.6, 17.6, 4, 2.8, 702, 8, 0.25), '#B88038', '#7A4E1C', 0.5);
    s += slider(d, 15.6, 18.6, 0.75, 703);
    s += eyeball(d, 27, 13.4, 1.4, [-0.5, 0.3], '#4E6A86', 704) + eyeball(d, 11.6, 19.6, 1.2, [0.4, -0.3], '#4F6A3A', 705);
    s += finger(d, [16.6, 12], [19.6, 6.6], 1.8, ZSKIN, true, true);
    s += F('M6,9l1.6,-3.4l1.2,3.6Z', '#B83A2A', 0.3) + fly(29, 7, 1) + fly(6.4, 20.6, 0.9);
    return s;
  },
  toadstew: (d) => {
    const b = bowl(d, ['#8A7A3A', '#6A5A26', '#3E3414'], { col: ['#4E6A7A', '#2E4250'], speck: true, seed: 710 });
    let s = b.s;
    // a whole toad floating belly-up, legs in the air
    const belly = rell(b.x, b.y + 0.2, 4.4, 2.4, -5, 20);
    s += cel(d, belly, '#C8C08A', '#9A9060', 0.5);
    s += d.clip(belly, F(blob(b.x + 1, b.y + 0.6, 2, 1, 711), '#A8A070', 0, 'opacity="0.6"'));
    for (const [x0, y0, x1, y1] of [[-3.4, -0.8, -6, -5.6], [3, -1, 5.6, -6], [-2, 1.6, -4.6, 3.4], [2.6, 1.4, 5, 3]] as number[][]) s += L(`M${f(b.x + x0)},${f(b.y + y0)}L${f(b.x + x1)},${f(b.y + y1)}`, 1.8, INK) + L(`M${f(b.x + x0)},${f(b.y + y0)}L${f(b.x + x1)},${f(b.y + y1)}`, 1.1, '#7E9A4A');
    s += L(`M${f(b.x - 1.6)},${f(b.y - 1.4)}l0.8,0.8M${f(b.x - 0.8)},${f(b.y - 1.4)}l-0.8,0.8`, 0.4, INK);
    return s;
  },
  ratpizza: (d) =>
    pizzaDisc(d, 18, 15.4, 11, 6.6, 720, () => pepperoni(12.6, 16.4) + pepperoni(23.4, 17) + F(rell(14, 12.4, 1.2, 0.6, 30, 8), '#3E5A26', 0.2)) +
    // the rat: curled up on top, tail draped over the crust
    cel(d, 'M14.4,15C14,11.6 18.4,10.4 21.4,11.4C24,12.2 24.4,15 22.4,16.2C20.4,17.2 15,17 14.4,15Z', '#6E6660', '#4A4440', 0.5) +
    cel(d, 'M21.4,11.4C22.4,9.8 25,9.6 25.8,11C26.4,12 25.4,13 24,13Z', '#7A726C', '#4A4440', 0.45) +
    dot(24.8, 10.8, 0.4, INK) + F(rell(22.8, 10.2, 0.9, 0.7, 0, 8), '#B08A86', 0.3) + L('M14.6,15.4C11,17 9.4,19.6 6.6,19.2', 0.7, '#B08A86') + fly(9, 8, 1),
  luau: (d) => {
    let s = F('M5,17.4C8,10 26,8.6 31,13.6C26,19.4 10,21.6 5,17.4Z', '#4E7A2A', 0.6) + L('M6,17L30,13.6', 0.4, '#2E4A16');
    for (let k = 0; k < 6; k++) s += L(`M${f(8 + k * 4)},${f(16.6 - k * 0.55)}l-1.2,2.4M${f(8 + k * 4)},${f(16.6 - k * 0.55)}l0.8,-2.6`, 0.35, '#2E4A16');
    // the roast lizard
    const body = 'M9,15C11,11.6 19,10.6 24,12C26,12.6 26.4,14.6 24.4,15.4C19,17.4 11.6,17.6 9,15Z';
    s += cel(d, body, '#A8742E', '#6E4A1A', 0.55);
    s += d.clip(body, L('M12,13.6l1,2.6M15,12.8l1,3M18,12.4l1,3M21,12.6l0.8,2.8', 0.5, '#5A3410', 'opacity="0.6"'));
    s += cel(d, 'M24,12C26,10.6 29.4,11 29.4,12.8C29.4,14.2 26.8,14.6 24.6,14.2Z', '#A8742E', '#6E4A1A', 0.5) + dot(27.6, 12, 0.45, INK) + L('M28.4,13.6l1.6,0.4', 0.5, '#B84A4A');
    s += L('M9,15C6.6,15.4 5,17.6 6.4,19', 1.4, INK) + L('M9,15C6.6,15.4 5,17.6 6.4,19', 0.8, '#A8742E');
    for (const [x, y] of [[13, 16.6], [20.6, 16.2], [14, 11.8], [21, 11.6]] as Pt[]) s += L(`M${f(x)},${f(y)}l-1,${y > 14 ? 2 : -2}`, 1, '#6E4A1A');
    // tiny grass skirt + a hibiscus
    for (let k = 0; k < 6; k++) s += L(`M${f(15.6 + k * 0.9)},${f(13.4)}l-0.2,3`, 0.5, '#C8B060');
    s += F(rell(20, 10.6, 1.2, 0.9, 0, 10), '#C84A5A', 0.3) + dot(20, 10.6, 0.35, '#E8D040');
    return s;
  },
  tenders: (d) => {
    let s = F(rell(25.6, 18, 3, 1.8, 0, 18), '#B8B2A0', 0.5) + F(rell(25.6, 17.9, 2.3, 1.25, 0, 16), '#86AC34', 0.3);
    // golden tenders cut into little headstones
    const ts = (x: number, y: number, rot: number, seed: number) => {
      const p = 'M-2.6,3V-1C-2.6,-4.2 2.6,-4.2 2.6,-1V3Z';
      return `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)})">${fried(d, p, 0, 0, 2.6, 3.4, seed)}${L('M-1,-0.6h2M0,-1.6v2.6', 0.4, '#7A5222')}</g>`;
    };
    s += ts(10.6, 15.4, -12, 730) + ts(15.4, 13.4, 4, 731) + ts(20.4, 13, 14, 732) + ts(14.4, 19.2, -4, 733) + ts(19.6, 18.6, 8, 734);
    s += finger(d, [7.6, 19.4], [9.4, 22.2], 1.4, BONE, false, false);
    return s;
  },
};

/** A fist punching up out of a pie crust. */
function fistUp(d: Doc, x: number, y: number): string {
  let s = cel(d, capsule([x, y], [x + 0.6, y - 5], 2.4, 2.2), ZSKIN[0], ZSKIN[1], 0.5);
  s += cel(d, rell(x + 0.7, y - 6.4, 2.4, 2, 0, 16), ZSKIN[0], ZSKIN[1], 0.5);
  s += L(`M${f(x - 0.8)},${f(y - 7.2)}v1.6M${f(x + 0.6)},${f(y - 7.6)}v1.8M${f(x + 2)},${f(y - 7.2)}v1.6`, 0.35, '#2E4E26');
  return s;
}
/** Two little steam curls rising from (x, y). */
function glossSteam(d: Doc, x: number, y: number): string {
  return `<g filter="${d.blur(0.5)}" opacity="0.6">${L(`M${f(x - 3)},${f(y)}q-1.2,-1.6 0,-3t0,-3M${f(x + 2)},${f(y - 0.4)}q-1.2,-1.6 0,-3t0,-3`, 0.7, '#E8E4D8')}</g>`;
}

const BASE_DISHES: Partial<Record<Dish3Id, Body>> = {
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

const DISHES = { ...BASE_DISHES, ...LATE } as Record<Dish3Id, Body>;

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

