/**
 * Shared painting kit for the raid cast (src/art/raidchars.ts): rig descriptions, generic
 * limbs, cartoon faces with expressions, and the bosses' signature weapons.
 *
 * Same cel-shaded style as chars.ts (flat base + shadow tone, #2B1B17 outline, mitt hands).
 * Heads are authored in a LOCAL frame (origin = head center, a "unit" head is 16.5 x 15.5) and
 * placed with translate(hc) scale(hk); stroke widths inside are divided by hk so line weight
 * stays the same on bigger heads.
 */
import type { CharArt, CharPart, FaceName } from './types';
import { Doc, OUT, OW, P, S, G, capsule, ell, f, hl, headD, poly, rrect } from './svg';
import type { Pt, Tone } from './svg';

// ------------------------------------------------------------------ palette
export const ZSK: Tone = ['#8DC63F', '#5E9A2A'];
export const ZHI = '#B8E26B';
export const ZDEEP = '#4C8222';
export const PATCH = '#74B134';
export const GOO = '#B8F07A';
export const SCLERA = '#FFE14D';
export const MOUTH = '#5A1E22';
export const TOOTH = '#FFF6D8';
export const TONGUE = '#E06A86';
export const BLUSH = '#F06A7A';
export const WHITE: Tone = ['#FBF7EE', '#DCD3C0'];
export const STEEL: Tone = ['#D5DCE4', '#9AA6B4'];
export const WOOD: Tone = ['#A8693A', '#7A4524'];
export const GOLD: Tone = ['#FFC83D', '#D9971A'];
export const MUSTARD: Tone = ['#FFD21F', '#E0A400'];
export const SWEAT = '#8FD3FF';

export type Box = [x0: number, y0: number, x1: number, y1: number];
export type Expr = 'normal' | 'scream' | 'shock' | 'happy' | 'dazed' | 'chomp' | 'sleep';

// ------------------------------------------------------------------ geometry helpers
export function union(...b: Box[]): Box {
  return [
    Math.min(...b.map((x) => x[0])),
    Math.min(...b.map((x) => x[1])),
    Math.max(...b.map((x) => x[2])),
    Math.max(...b.map((x) => x[3])),
  ];
}

/** World box of a local box rotated by `deg` around the origin then moved to `at`. */
export function rotBox(at: Pt, deg: number, lb: Box): Box {
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  const pts: Pt[] = [
    [lb[0], lb[1]],
    [lb[2], lb[1]],
    [lb[2], lb[3]],
    [lb[0], lb[3]],
  ].map(([x, y]) => [at[0] + x * c - y * s, at[1] + x * s + y * c] as Pt);
  return [
    Math.min(...pts.map((p) => p[0])),
    Math.min(...pts.map((p) => p[1])),
    Math.max(...pts.map((p) => p[0])),
    Math.max(...pts.map((p) => p[1])),
  ];
}

/** Local head box → world box. */
export function headBox(hc: Pt, hk: number, lb: Box): Box {
  return [hc[0] + lb[0] * hk, hc[1] + lb[1] * hk, hc[0] + lb[2] * hk, hc[1] + lb[3] * hk];
}

/** Round a box outward to whole units so part sizes stay tidy. */
function roundBox(b: Box): Box {
  return [Math.floor(b[0]), Math.floor(b[1]), Math.ceil(b[2]), Math.ceil(b[3])];
}

export function part(key: string, box: Box, pivot: Pt, body: (d: Doc) => string): CharPart {
  const d = new Doc(key);
  const inner = body(d);
  const [x0, y0, x1, y1] = roundBox(box);
  const w = x1 - x0;
  const h = y1 - y0;
  return {
    key,
    svg: d.build(w, h, inner, -x0, -y0),
    w,
    h,
    px: pivot[0] - x0,
    py: pivot[1] - y0,
    x: pivot[0],
    y: pivot[1],
  };
}

export function darker(hex: string, k = 0.82): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * k);
  const g = Math.round(((n >> 8) & 255) * k);
  const b = Math.round((n & 255) * k);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

/** Stroke with an outline: a thick dark stroke under a coloured one (curls, ties, laces). */
export function OS(d: string, w: number, col: string, ow = 1.1): string {
  return S(d, w + ow * 2, OUT) + S(d, w, col);
}

// ------------------------------------------------------------------ small painters (from chars.ts)
export function rip(d: Doc, x: number, y: number, s = 1, tone: Tone = ZSK): string {
  const pts: Pt[] = [
    [-2.6, -0.8], [-1.2, -2], [-0.3, -0.9], [1.1, -2.1], [1.9, -0.6], [2.9, 0], [1.4, 0.8], [0.8, 1.9], [-0.8, 1], [-1.9, 1.7],
  ];
  return d.tone(poly(pts.map(([a, b]) => [x + a * s, y + b * s] as Pt)), tone, 1.1, [-0.4, -0.4]);
}

export function stain(x: number, y: number, s: number, col: string, op = 0.85): string {
  const d =
    `M${f(x - 2.4 * s)},${f(y)}C${f(x - 2.6 * s)},${f(y - 2 * s)} ${f(x - 0.4 * s)},${f(y - 2.6 * s)} ${f(x + 1 * s)},${f(y - 1.6 * s)}` +
    `C${f(x + 2.8 * s)},${f(y - 2 * s)} ${f(x + 3 * s)},${f(y + 0.4 * s)} ${f(x + 1.8 * s)},${f(y + 1.2 * s)}` +
    `C${f(x + 1.6 * s)},${f(y + 2.6 * s)} ${f(x - 0.6 * s)},${f(y + 2.2 * s)} ${f(x - 1 * s)},${f(y + 1.4 * s)}` +
    `C${f(x - 2 * s)},${f(y + 1.8 * s)} ${f(x - 2.8 * s)},${f(y + 1 * s)} ${f(x - 2.4 * s)},${f(y)}Z`;
  return P(d, col, 0, OUT, `opacity="${op}"`);
}

export function drool(x: number, y: number, L = 4.4, w = 1.7, sw = 0.9, col = GOO): string {
  const d =
    `M${f(x - w * 0.45)},${f(y)}C${f(x - w * 0.5)},${f(y + L * 0.5)} ${f(x - w)},${f(y + L * 0.7)} ${f(x - w * 0.8)},${f(y + L)}` +
    `C${f(x - w * 0.5)},${f(y + L * 1.25)} ${f(x + w * 0.5)},${f(y + L * 1.25)} ${f(x + w * 0.8)},${f(y + L)}` +
    `C${f(x + w)},${f(y + L * 0.7)} ${f(x + w * 0.5)},${f(y + L * 0.5)} ${f(x + w * 0.45)},${f(y)}Z`;
  return P(d, col, sw) + hl(x - w * 0.3, y + L * 0.95, w * 0.22, w * 0.3, 0, 0.9);
}

export function stitches(x1: number, y1: number, x2: number, y2: number, k = 2, cl = 1.3, sw = 0.9): string {
  let s = S(`M${f(x1)},${f(y1)}L${f(x2)},${f(y2)}`, sw);
  const L = Math.hypot(x2 - x1, y2 - y1);
  const nx = -(y2 - y1) / L;
  const ny = (x2 - x1) / L;
  for (let i = 0; i < k; i++) {
    const t = (i + 1) / (k + 1);
    const px = x1 + (x2 - x1) * t;
    const py = y1 + (y2 - y1) * t;
    s += S(`M${f(px - nx * cl)},${f(py - ny * cl)}L${f(px + nx * cl)},${f(py + ny * cl)}`, sw);
  }
  return s;
}

export function tooth(x: number, y: number, w = 2, h = 2, down = true, sw = 0.8, col = TOOTH): string {
  const d = down
    ? `M${f(x)},${f(y)}L${f(x + w)},${f(y)}L${f(x + w - 0.3)},${f(y + h)}Q${f(x + w / 2)},${f(y + h + 0.6)} ${f(x + 0.3)},${f(y + h)}Z`
    : `M${f(x)},${f(y)}L${f(x + w)},${f(y)}L${f(x + w - 0.4)},${f(y - h)}Q${f(x + w / 2)},${f(y - h - 0.6)} ${f(x + 0.4)},${f(y - h)}Z`;
  return P(d, col, sw);
}

/** Cute human eye: dark glossy oval with glints. */
export function heye(cx: number, cy: number, rx: number, ry: number): string {
  return (
    `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="${OUT}"/>` +
    `<circle cx="${f(cx - rx * 0.28)}" cy="${f(cy - ry * 0.36)}" r="${f(rx * 0.42)}" fill="#FFFFFF"/>` +
    `<circle cx="${f(cx + rx * 0.35)}" cy="${f(cy + ry * 0.4)}" r="${f(rx * 0.2)}" fill="#FFFFFF"/>`
  );
}

/** Human eye with a straight upper lid; tilt > 0 drops the inner (nose-side) corner = angry. */
export function lidEye(d: Doc, cx: number, cy: number, rx: number, ry: number, lid: string, amt: number, tilt = 0, inner: 1 | -1 = 1, u = 1): string {
  const e = ell(cx, cy, rx + 0.3, ry + 0.3);
  const y0 = cy - ry + 2 * ry * amt;
  const yl = y0 - tilt * inner;
  const yr = y0 + tilt * inner;
  return (
    heye(cx, cy, rx, ry) +
    d.clip(e, P(`M${f(cx - rx - 1)},${f(cy - ry - 2)}H${f(cx + rx + 1)}V${f(yr)}L${f(cx - rx - 1)},${f(yl)}Z`, lid)) +
    S(`M${f(cx - rx - 0.5)},${f(yl)}L${f(cx + rx + 0.5)},${f(yr)}`, 1.1 * u)
  );
}

/** Zombie eye: yellow sclera, tiny pupil, droopy lid clipped to the eye. */
export function zeye(d: Doc, cx: number, cy: number, r: number, lid: number, tilt: number, pdx = 0, pdy = 0.6, lidcol = ZSK[1], u = 1): string {
  const e = ell(cx, cy, r);
  const y0 = cy - r + 2 * r * lid;
  const pr = r * 0.3;
  return (
    P(e, SCLERA) +
    `<circle cx="${f(cx + pdx)}" cy="${f(cy + pdy)}" r="${f(pr)}" fill="${OUT}"/>` +
    `<circle cx="${f(cx + pdx - pr * 0.4)}" cy="${f(cy + pdy - pr * 0.45)}" r="${f(Math.max(0.4, pr * 0.32))}" fill="#FFFFFF"/>` +
    d.clip(e, P(`M${f(cx - r - 1)},${f(cy - r - 1)}H${f(cx + r + 1)}V${f(y0 - tilt)}L${f(cx - r - 1)},${f(y0 + tilt)}Z`, lidcol, 1.1 * u)) +
    S(e, 1.2 * u)
  );
}

/** Cartoon dizzy spiral. */
export function spiral(cx: number, cy: number, r: number, sw: number, turns = 2.2, col = OUT): string {
  const pts: Pt[] = [];
  const n = Math.round(turns * 18);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = t * turns * Math.PI * 2;
    const rr = r * t;
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  return S('M' + pts.map(([x, y]) => `${f(x)},${f(y)}`).join('L'), sw, col);
}

/** X-shaped KO eye. */
export function xeye(cx: number, cy: number, r: number, sw: number): string {
  return S(`M${f(cx - r)},${f(cy - r)}L${f(cx + r)},${f(cy + r)}M${f(cx + r)},${f(cy - r)}L${f(cx - r)},${f(cy + r)}`, sw);
}

/** Blue sweat drop (comedic panic). */
export function sweatDrop(x: number, y: number, s: number, sw: number): string {
  const d = `M${f(x)},${f(y - 3 * s)}C${f(x + 1.6 * s)},${f(y - 0.8 * s)} ${f(x + 2 * s)},${f(y + 1.6 * s)} ${f(x)},${f(y + 1.8 * s)}C${f(x - 2 * s)},${f(y + 1.6 * s)} ${f(x - 1.6 * s)},${f(y - 0.8 * s)} ${f(x)},${f(y - 3 * s)}Z`;
  return P(d, SWEAT, sw) + hl(x - 0.5 * s, y + 0.2 * s, 0.4 * s, 0.7 * s, 0, 0.9);
}

/** Five-point star path. */
export function star(cx: number, cy: number, r: number, ri = r * 0.45, rot = -90): string {
  const pts: Pt[] = [];
  for (let i = 0; i < 10; i++) {
    const a = ((rot + i * 36) * Math.PI) / 180;
    const rr = i % 2 ? ri : r;
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  return poly(pts);
}

// ------------------------------------------------------------------ rig
export interface Rig {
  /** Near (screen-left) hip; the far hip mirrors x. */
  hip: Pt;
  ankleY: number;
  legW: number;
  /** Near shoulder; far mirrors x. */
  sh: Pt;
  /** Near hand center at rest. */
  hand: Pt;
  armW: number;
  handR: number;
  neck: Pt;
  torso: Pt;
  /** Head center & scale (1 = the 16.5 x 15.5 joint-character head). */
  hc: Pt;
  hk: number;
}

/** 78-tall rig, identical to chars.ts. */
export const RIG_STD: Rig = {
  hip: [-4.6, -19.5],
  ankleY: -4.4,
  legW: 6.8,
  sh: [-11, -40.6],
  hand: [-13.6, -25.2],
  armW: 7.4,
  handR: 3.8,
  neck: [0.5, -44],
  torso: [0, -16],
  hc: [1, -58.5],
  hk: 1,
};

// ------------------------------------------------------------------ limbs
export interface LegLook {
  pants: Tone;
  shoe: Tone;
  /** Shoe shape: plain sneaker/shoe, cowboy boot, pointy dress shoe, clog, sandal, chicken foot. */
  shoeKind?: 'shoe' | 'boot' | 'pointy' | 'clog' | 'sandal' | 'claw';
  shoeTrim?: string;
  /** Leg skin when the shoe shows feet (sandals) or shorts. */
  skin?: Tone;
  /** Shorts end at this y (world); bare skin below. */
  shortsY?: number;
  /** Flared bell-bottoms. */
  bell?: boolean;
  /** Pattern drawn over the pants (clipped to the leg). */
  pattern?: (d: Doc, legD: string, side: -1 | 1) => string;
  spur?: boolean;
  socks?: string;
}

export function legArt(d: Doc, rig: Rig, side: -1 | 1, L: LegLook, back: boolean, k = 1): string {
  const lx = side * -rig.hip[0];
  const hip: Pt = [lx, rig.hip[1]];
  const ank: Pt = [lx + side * 0.2 * k, rig.ankleY];
  let s = '';
  const w = rig.legW;
  let legD: string;
  if (L.bell) {
    const b = rig.ankleY + 1;
    legD =
      `M${f(lx - w / 2)},${f(hip[1])}L${f(lx - w / 2 - 0.4)},${f(b - 5)}L${f(lx - w / 2 - 2.6)},${f(b)}` +
      `L${f(lx + w / 2 + 2.8)},${f(b)}L${f(lx + w / 2 + 0.4)},${f(b - 5)}L${f(lx + w / 2)},${f(hip[1])}` +
      `A${f(w / 2)},${f(w / 2)} 0 0 0 ${f(lx - w / 2)},${f(hip[1])}Z`;
  } else if (L.shortsY !== undefined) {
    s += d.tone(capsule([lx, L.shortsY - 2], ank, w * 0.74, w * 0.68), L.skin ?? ZSK, OW * 0.9);
    legD = capsule(hip, [lx, L.shortsY], w * 1.08, w * 1.12);
  } else {
    legD = capsule(hip, ank, w, w * 0.92);
  }
  s += d.tone(legD, L.pants, OW);
  if (L.pattern) s += d.clip(legD, L.pattern(d, legD, side)) + S(legD, OW);
  if (L.socks) s += P(rrect(lx - w * 0.42, rig.ankleY - 3.4 * k, w * 0.84, 3.4 * k, 1), L.socks, OW * 0.6);
  s += shoeArt(d, lx + 0.8 * k, L, back, k);
  return s;
}

function shoeArt(d: Doc, x0: number, L: LegLook, back: boolean, k: number): string {
  const kind = L.shoeKind ?? 'shoe';
  let s = '';
  if (kind === 'claw') {
    // three-toed chicken foot boots (Colonel Crunch)
    const toes = back
      ? [`M${f(x0 - 2)},-3L${f(x0 - 6.4 * k)},0.6L${f(x0 - 1.6)},0.6Z`, `M${f(x0)},-3L${f(x0 + 4 * k)},0.6L${f(x0 + 0.6)},0.8Z`]
      : [
          `M${f(x0 - 1)},-3.4L${f(x0 - 6 * k)},0.6L${f(x0 - 1.4)},0.8Z`,
          `M${f(x0 + 0.6)},-3.4L${f(x0 + 4.6 * k)},0.8L${f(x0 + 0.4)},0.9Z`,
          `M${f(x0 + 1.4)},-3.6L${f(x0 + 8.4 * k)},0.4L${f(x0 + 3.6)},0.9Z`,
        ];
    for (const t of toes) s += d.tone(t, L.shoe, OW * 0.8, [-0.4, -0.4]);
    s += d.tone(ell(x0 + 0.4, -4.4 * k, 4.2 * k, 3.4 * k), L.shoe, OW * 0.9, [-0.6, -0.6]);
    s += S(`M${f(x0 - 2.6)},${f(-5.4 * k)}h4.6M${f(x0 - 2.4)},${f(-3.6 * k)}h4.4`, 0.8, darker(L.shoe[1]));
    return s;
  }
  const h = (kind === 'boot' ? 7.2 : kind === 'clog' ? 5.6 : 4.8) * k;
  const toe = (kind === 'pointy' ? 9.6 : kind === 'boot' ? 7.4 : 6) * k;
  const heel = 4.8 * k;
  if (back) {
    // heel view: the toe points away (up-right) so we mostly see a rounded heel and the sole
    const shoe =
      `M${f(x0 - heel)},0.4L${f(x0 + toe * 0.6)},0.4C${f(x0 + toe * 0.7)},${f(-h * 0.5)} ${f(x0 + 2.6 * k)},${f(-h)} ${f(x0)},${f(-h)}` +
      `C${f(x0 - 2.8 * k)},${f(-h)} ${f(x0 - heel - 0.4)},${f(-h * 0.6)} ${f(x0 - heel)},0.4Z`;
    s += d.tone(shoe, L.shoe, OW, [0.6, -0.8]);
    s += d.clip(shoe, P(`M${f(x0 - 8 * k)},${f(-1.8 * k)}H${f(x0 + 8 * k)}V2H${f(x0 - 8 * k)}Z`, darker(L.shoe[1], 0.75)));
    s += S(shoe, OW);
    if (kind === 'boot') s += P(rrect(x0 - 2.4 * k, -3.4 * k, 4.8 * k, 2.6 * k, 0.6), darker(L.shoe[1], 0.7), 0.8);
    if (L.spur) s += spur(x0 - 0.4, -2.6 * k, k);
    if (kind === 'sandal') s += S(`M${f(x0 - 3.6 * k)},${f(-h * 0.6)}H${f(x0 + 3.6 * k)}`, 1.2, OUT);
    return s;
  }
  const shoe =
    kind === 'pointy'
      ? `M${f(x0 - heel)},0.4L${f(x0 + toe)},0.4C${f(x0 + toe - 1)},${f(-1.4 * k)} ${f(x0 + 3 * k)},${f(-h)} ${f(x0 + 0.4)},${f(-h)}` +
        `C${f(x0 - 2.8 * k)},${f(-h)} ${f(x0 - heel - 0.4)},${f(-h * 0.6)} ${f(x0 - heel)},0.4Z`
      : `M${f(x0 - heel)},0.4L${f(x0 + toe)},0.4C${f(x0 + toe + 0.4)},${f(-h * 0.55)} ${f(x0 + toe - 2.6 * k)},${f(-h)} ${f(x0 + 0.4)},${f(-h)}` +
        `C${f(x0 - 2.8 * k)},${f(-h)} ${f(x0 - heel - 0.4)},${f(-h * 0.6)} ${f(x0 - heel)},0.4Z`;
  if (kind === 'sandal') {
    const foot = `M${f(x0 - heel)},0.4L${f(x0 + toe)},0.4C${f(x0 + toe + 0.4)},${f(-h * 0.7)} ${f(x0 + toe - 2.6 * k)},${f(-h)} ${f(x0 + 0.4)},${f(-h)}C${f(x0 - 2.8 * k)},${f(-h)} ${f(x0 - heel - 0.4)},${f(-h * 0.6)} ${f(x0 - heel)},0.4Z`;
    s += d.tone(foot, L.skin ?? ['#E0A878', '#BF8455'], OW, [-0.6, -0.6]);
    s += P(rrect(x0 - heel - 0.6, -0.6, heel + toe + 1.4, 2, 0.8), L.shoe[1], OW * 0.6);
    s += S(`M${f(x0 + 1.4 * k)},${f(-h + 0.6)}L${f(x0 + 3.6 * k)},-0.4`, 1.4, L.shoe[0]);
    s += S(`M${f(x0 + toe - 2.4 * k)},${f(-h * 0.45)}v1.4M${f(x0 + toe - 0.8 * k)},${f(-h * 0.35)}v1.2`, 0.7, OUT);
    return s;
  }
  s += d.tone(shoe, L.shoe, OW, [-0.8, -0.8]);
  if (kind === 'boot') {
    s += S(`M${f(x0 - heel + 0.4)},${f(-h + 2)}L${f(x0 + 2.4 * k)},${f(-h + 2)}`, 0.9);
    s += S(`M${f(x0 - 1.2)},${f(-h + 3.6)}Q${f(x0 + 1.4 * k)},${f(-h + 2.6)} ${f(x0 + 4 * k)},${f(-1.4)}`, 0.8, darker(L.shoe[1], 0.7));
    s += P(rrect(x0 - heel - 0.2, -1.6 * k, 3.4 * k, 2, 0.4), darker(L.shoe[1], 0.7), 0.7);
  }
  if (kind === 'clog') s += S(`M${f(x0 - heel + 0.6)},-1.2H${f(x0 + toe - 0.4)}`, 1, '#FFFFFF');
  if (L.shoeTrim) s += S(`M${f(x0 - heel + 0.6)},-1.2L${f(x0 + toe - 0.4)},-1.2`, 1, L.shoeTrim);
  if (L.spur) s += spur(x0 - heel + 0.4, -3.2 * k, k);
  s += hl(x0 + toe * 0.4, -h + 1.2, 1.4 * k, 0.6, -10, 0.45);
  return s;
}

function spur(x: number, y: number, k: number): string {
  return S(`M${f(x + 1.6)},${f(y)}L${f(x - 1.2)},${f(y)}`, 1.1) + P(star(x - 2.2 * k, y, 2.2 * k, 1 * k), GOLD[0], 0.8);
}

export interface ArmLook {
  skin: Tone;
  sleeve: Tone;
  kind: 'long' | 'short' | 'none' | 'rolled';
  cuff?: string;
  /** Extra art on the arm (tattoo, patch, wristband) drawn before the hand. */
  extra?: (d: Doc, side: -1 | 1, back: boolean) => string;
  /** Clawed / furry hands. */
  claws?: string;
  /** Fur tufts on the sleeve edge (monsters). */
  furEdge?: boolean;
}

export interface Weapon {
  /** Local box of the art when pointing along +x with the grip at the origin. */
  box: Box;
  /** Rest angle in degrees (positive = tip tilts down). */
  angle: number;
  draw: (d: Doc) => string;
}

export function armArt(d: Doc, rig: Rig, side: -1 | 1, A: ArmLook, back: boolean, far: boolean, weapon?: Weapon): string {
  const sx = side * -rig.sh[0];
  const sh: Pt = [sx, rig.sh[1]];
  const hand: Pt = [side * -rig.hand[0], rig.hand[1]];
  const R = rig.handR;
  const wrist: Pt = [hand[0] - side * 0.3, hand[1] - R * 0.75];
  const w = rig.armW;
  const shapes: string[] = [];
  let s = '';
  if (A.kind === 'long') {
    const sl = capsule(sh, wrist, w, w * 0.86);
    s += d.tone(sl, A.sleeve);
    shapes.push(sl);
    if (A.cuff) s += d.clip(sl, P(`M${f(wrist[0] - 8)},${f(wrist[1] - 2)}H${f(wrist[0] + 8)}V${f(wrist[1] + 8)}H${f(wrist[0] - 8)}Z`, A.cuff)) + S(sl, OW);
  } else {
    const fa = capsule(sh, wrist, w * 0.72, w * 0.66);
    s += d.tone(fa, A.skin);
    shapes.push(fa);
    if (A.kind !== 'none') {
      const t = A.kind === 'rolled' ? 0.62 : 0.42;
      const el: Pt = [sh[0] + (wrist[0] - sh[0]) * t, sh[1] + (wrist[1] - sh[1]) * t];
      const sl = capsule(sh, el, w * 1.06, w * 0.98);
      s += d.tone(sl, A.sleeve);
      shapes.push(sl);
      if (A.kind === 'rolled') s += P(rrect(el[0] - w * 0.55, el[1] - 1.6, w * 1.1, 3.2, 1.4), A.sleeve[1], OW * 0.7);
      if (A.furEdge) {
        for (let i = -1; i <= 1; i++) s += P(`M${f(el[0] + i * 2.6 - 1.4)},${f(el[1] - 0.6)}L${f(el[0] + i * 2.6)},${f(el[1] + 2.6)}L${f(el[0] + i * 2.6 + 1.4)},${f(el[1] - 0.6)}Z`, A.sleeve[1], 0.8);
      }
    }
  }
  if (A.extra) s += A.extra(d, side, back);
  const handD = ell(hand[0], hand[1], R * 1.03, R * 0.98);
  if (weapon) {
    s += G(weapon.draw(d), `translate(${f(hand[0])} ${f(hand[1])}) rotate(${f(weapon.angle)})`);
    // fist wrapped around the handle: knuckle creases + thumb over the top
    s += d.tone(handD, A.skin, OW, [-0.7, -0.7]);
    const kc = darker(A.skin[1]);
    s += S(`M${f(hand[0] + R * 0.2)},${f(hand[1] - R * 0.7)}q${f(R * 0.5)},${f(R * 0.3)} ${f(R * 0.5)},${f(R * 0.75)}M${f(hand[0] + R * 0.05)},${f(hand[1] - R * 0.05)}q${f(R * 0.55)},${f(R * 0.25)} ${f(R * 0.55)},${f(R * 0.7)}`, 0.8, kc);
    s += d.tone(ell(hand[0] - R * 0.35, hand[1] - R * 0.55, R * 0.48, R * 0.36), A.skin, OW * 0.7, [-0.3, -0.3]);
    if (A.claws) s += clawTips(hand, R, side, A.claws);
    shapes.push(handD);
  } else {
    const thumb = ell(hand[0] - side * R * 0.68, hand[1] - R * 0.4, R * 0.42, R * 0.37);
    s += d.tone(thumb, A.skin, OW * 0.75, [-0.4, -0.4]);
    s += d.tone(handD, A.skin, OW, [-0.7, -0.7]);
    s += S(`M${f(hand[0] - 0.6)},${f(hand[1] + 0.8)}l0.3,${f(R * 0.47)}M${f(hand[0] + 1)},${f(hand[1] + 0.6)}l0.4,${f(R * 0.47)}`, 0.8, darker(A.skin[1]));
    if (A.claws) s += clawTips(hand, R, side, A.claws);
    shapes.push(handD, thumb);
  }
  if (far) s += shapes.map((p) => P(p, OUT, 0, OUT, 'opacity="0.13"')).join('');
  return s;
}

function clawTips(hand: Pt, R: number, side: -1 | 1, col: string): string {
  let s = '';
  for (let i = -1; i <= 1; i++) {
    const x = hand[0] + i * R * 0.5 + side * 0.4;
    const y = hand[1] + R * 0.85;
    s += P(`M${f(x - 0.9)},${f(y - 0.4)}L${f(x + 0.2)},${f(y + 2.4)}L${f(x + 0.9)},${f(y - 0.2)}Z`, col, 0.8);
  }
  return s;
}

/** Arm part box (world) incl. the weapon. */
export function armBox(rig: Rig, side: -1 | 1, weapon?: Weapon, pad = 2.5): Box {
  const sx = side * -rig.sh[0];
  const hx = side * -rig.hand[0];
  const r = rig.armW / 2 + pad + 1;
  let b: Box = [Math.min(sx, hx) - r - rig.handR, rig.sh[1] - r - 1, Math.max(sx, hx) + r + rig.handR, rig.hand[1] + rig.handR + pad + 2];
  if (weapon) b = union(b, rotBox([hx, rig.hand[1]], weapon.angle, weapon.box));
  return b;
}

// ------------------------------------------------------------------ torso helpers
/** Torso silhouette: shoulders `ws` wide at `top`, belly `wb` wide, flat hem at `bot`. */
export function bodyD(ws: number, wb: number, top: number, bot: number, belly = 0): string {
  const mid = (top + bot) / 2 + 2;
  return (
    `M${f(-ws)},${f(top + 3.4)}C${f(-ws)},${f(top + 0.4)} ${f(-ws + 2.8)},${f(top - 0.8)} ${f(-ws + 6)},${f(top - 0.8)}` +
    `L${f(ws - 6)},${f(top - 0.8)}C${f(ws - 2.8)},${f(top - 0.8)} ${f(ws)},${f(top + 0.4)} ${f(ws)},${f(top + 3.4)}` +
    `C${f(ws + 0.4 + belly * 0.4)},${f(mid - 6)} ${f(wb + belly)},${f(mid)} ${f(wb + belly * 0.6)},${f(bot - 4)}` +
    `C${f(wb)},${f(bot - 0.6)} ${f(wb - 2)},${f(bot)} ${f(wb - 4.4)},${f(bot)}L${f(-wb + 4.4)},${f(bot)}` +
    `C${f(-wb + 2)},${f(bot)} ${f(-wb)},${f(bot - 0.6)} ${f(-wb - belly * 0.4)},${f(bot - 4)}` +
    `C${f(-wb - belly * 0.6)},${f(mid)} ${f(-ws - 0.4 - belly * 0.3)},${f(mid - 6)} ${f(-ws)},${f(top + 3.4)}Z`
  );
}

export function neckArt(d: Doc, rig: Rig, skin: Tone, w = 8, h = 8.4): string {
  return d.tone(rrect(rig.neck[0] - w / 2, rig.neck[1] - h * 0.55, w, h, 2.6), [skin[1], skin[1]], OW * 0.8);
}

/** Small diagonal checker / gingham overlay (clipped by caller). */
export function gingham(x0: number, y0: number, x1: number, y1: number, step: number, col: string, op = 0.35): string {
  let s = '';
  for (let x = x0; x < x1; x += step * 2) s += `<rect x="${f(x)}" y="${f(y0)}" width="${f(step)}" height="${f(y1 - y0)}" fill="${col}" opacity="${op}"/>`;
  for (let y = y0; y < y1; y += step * 2) s += `<rect x="${f(x0)}" y="${f(y)}" width="${f(x1 - x0)}" height="${f(step)}" fill="${col}" opacity="${op}"/>`;
  return s;
}

export function stripes(x0: number, y0: number, x1: number, y1: number, step: number, col: string, vertical = false): string {
  let s = '';
  if (vertical) for (let x = x0; x < x1; x += step * 2) s += `<rect x="${f(x)}" y="${f(y0)}" width="${f(step)}" height="${f(y1 - y0)}" fill="${col}"/>`;
  else for (let y = y0; y < y1; y += step * 2) s += `<rect x="${f(x0)}" y="${f(y)}" width="${f(x1 - x0)}" height="${f(step)}" fill="${col}"/>`;
  return s;
}

// ------------------------------------------------------------------ heads & faces (LOCAL frame)
export const EYE1: Pt = [-4.6, 1.3];
export const EYE2: Pt = [5.8, 1.7];

/** Head base: near ear + skull (front 3/4) or ear on the right (back 3/4). */
export function skull(d: Doc, u: number, skin: Tone, back: boolean, jaw = 1.12, rx = 16.5, ry = 15.5, ear = true): string {
  let s = '';
  const ex = back ? rx - 0.6 : -rx + 0.3;
  if (ear) s += d.tone(ell(ex, 2.3, 3.2, 4), skin, OW * 0.9 * u, [-0.6, -0.6]) + S(`M${f(ex + (back ? -0.6 : 0.6))},0.3q${back ? 1.6 : -1.6},1.4 0,3`, 0.9 * u, darker(skin[1]));
  s += d.shaded(headD(0, 0, rx, ry, jaw), skin[0], skin[1], OW * u, [-2, -1.8]);
  if (!back) s += hl(-8.4, -10.1, 2.8, 1.4, -35, 0.55);
  return s;
}

export interface FaceStyle {
  skin: Tone;
  brow: string;
  browW?: number;
  mood: 'smile' | 'grin' | 'scowl' | 'fierce' | 'smug' | 'haughty' | 'stern' | 'bored' | 'nervous' | 'goofy';
  nose?: 'button' | 'bulb' | 'pointy' | 'wide' | 'hook';
  noseCol?: Tone;
  blush?: boolean;
  unibrow?: boolean;
  dazed?: 'spiral' | 'x';
  teeth?: 'buck' | 'braces' | 'gold';
  freckles?: boolean;
  /** Mouth is hidden under a big mustache: move mouths down a touch. */
  mouthDy?: number;
}

/** A human face in the local head frame, for every human expression. */
export function humanFace(d: Doc, u: number, expr: Expr, st: FaceStyle): string {
  const [e1x, e1y] = EYE1;
  const [e2x, e2y] = EYE2;
  const brow = st.brow;
  const bw = (st.browW ?? 1.3) * u;
  const lid = st.skin[1];
  const my = st.mouthDy ?? 0;
  let s = '';
  if (st.freckles) {
    for (const [x, y] of [[-10, 5.4], [-8.2, 6.6], [-11.4, 6.8], [10.6, 5.6], [12.2, 6.8]] as Pt[]) s += `<circle cx="${f(x)}" cy="${f(y)}" r="0.55" fill="${darker(st.skin[1], 0.8)}"/>`;
  }
  const blush = (op: number) =>
    P(ell(-10.4, 7.1, 2.6, 1.5), BLUSH, 0, OUT, `opacity="${op}"`) + P(ell(11.6, 7.5, 1.8, 1.2), BLUSH, 0, OUT, `opacity="${op}"`);
  // ---- eyes + brows
  if (expr === 'scream') {
    s += S(`M${f(e1x - 2.6)},${f(e1y - 2.2)}L${f(e1x + 1.6)},${f(e1y)}L${f(e1x - 2.6)},${f(e1y + 2.2)}`, 1.5 * u);
    s += S(`M${f(e2x + 2.4)},${f(e2y - 2)}L${f(e2x - 1.4)},${f(e2y)}L${f(e2x + 2.4)},${f(e2y + 2)}`, 1.5 * u);
    s += S(`M${f(e1x - 3.6)},${f(e1y - 4.2)}L${f(e1x + 2)},${f(e1y - 6.6)}M${f(e2x - 1.8)},${f(e2y - 6.6)}L${f(e2x + 3.4)},${f(e2y - 4.6)}`, bw * 1.2, brow);
    s += S(`M-12,-4.6l-2.4,-1.6M-11.6,-1.2l-2.8,-0.4M13.8,-3.6l2.2,-1.6`, 1 * u);
  } else if (expr === 'shock') {
    s += P(ell(e1x, e1y - 0.4, 3.2, 3.8), '#FFFFFF', 1.2 * u) + `<circle cx="${f(e1x + 0.3)}" cy="${f(e1y - 0.2)}" r="0.95" fill="${OUT}"/>`;
    s += P(ell(e2x, e2y - 0.2, 2.8, 3.4), '#FFFFFF', 1.2 * u) + `<circle cx="${f(e2x + 0.2)}" cy="${f(e2y)}" r="0.85" fill="${OUT}"/>`;
    s += S(`M${f(e1x - 3.2)},${f(e1y - 6.2)}Q${f(e1x)},${f(e1y - 8.6)} ${f(e1x + 3)},${f(e1y - 6.6)}M${f(e2x - 2.6)},${f(e2y - 6.8)}Q${f(e2x)},${f(e2y - 8.8)} ${f(e2x + 3)},${f(e2y - 6.4)}`, bw, brow);
    s += sweatDrop(13.6, -6.6, 1, 0.9 * u);
  } else if (expr === 'happy') {
    // taunting wink
    s += S(`M${f(e1x - 2.4)},${f(e1y + 0.4)}Q${f(e1x)},${f(e1y - 2.4)} ${f(e1x + 2.4)},${f(e1y + 0.4)}`, 1.5 * u);
    s += heye(e2x, e2y, 1.8, 2.5);
    s += S(`M${f(e1x - 3)},${f(e1y - 3.6)}Q${f(e1x)},${f(e1y - 4.4)} ${f(e1x + 2.6)},${f(e1y - 3)}M${f(e2x - 2.4)},${f(e2y - 5.8)}Q${f(e2x + 0.4)},${f(e2y - 7.2)} ${f(e2x + 3)},${f(e2y - 5.4)}`, bw, brow);
  } else if (expr === 'dazed') {
    if (st.dazed === 'x') {
      s += xeye(e1x, e1y, 1.9, 1.5 * u) + xeye(e2x, e2y, 1.7, 1.5 * u);
    } else {
      s += P(ell(e1x, e1y, 3, 3.2), '#FFFFFF', 1.1 * u) + spiral(e1x, e1y, 2.5, 0.9 * u, 2.2);
      s += P(ell(e2x, e2y, 2.6, 2.9), '#FFFFFF', 1.1 * u) + spiral(e2x, e2y, 2.2, 0.9 * u, 2);
    }
    s += S(`M${f(e1x - 3)},${f(e1y - 4.4)}Q${f(e1x)},${f(e1y - 5.6)} ${f(e1x + 2.6)},${f(e1y - 4)}M${f(e2x - 2.4)},${f(e2y - 3.6)}L${f(e2x + 2.8)},${f(e2y - 5.2)}`, bw, brow);
  } else {
    switch (st.mood) {
      case 'scowl':
        s += heye(e1x, e1y + 0.3, 1.7, 2.2) + heye(e2x, e2y + 0.3, 1.5, 2);
        break;
      case 'fierce':
        s += lidEye(d, e1x, e1y, 1.9, 2.6, lid, 0.36, 0.9, 1, u) + lidEye(d, e2x, e2y, 1.7, 2.4, lid, 0.36, -0.9, 1, u);
        break;
      case 'smug':
        s += lidEye(d, e1x, e1y, 1.9, 2.6, lid, 0.45, 0, 1, u) + lidEye(d, e2x, e2y, 1.7, 2.4, lid, 0.32, 0, 1, u);
        break;
      case 'bored':
        s += lidEye(d, e1x, e1y, 1.9, 2.6, lid, 0.5, 0, 1, u) + lidEye(d, e2x, e2y, 1.7, 2.4, lid, 0.5, 0, 1, u);
        break;
      case 'haughty':
        s += S(`M${f(e1x - 2.6)},${f(e1y)}Q${f(e1x)},${f(e1y + 1.8)} ${f(e1x + 2.6)},${f(e1y - 0.2)}`, 1.4 * u);
        s += S(`M${f(e1x - 2.2)},${f(e1y + 0.6)}l-1.2,1.1M${f(e1x - 0.6)},${f(e1y + 1.2)}l-0.6,1.3`, 0.8 * u);
        s += S(`M${f(e2x - 2.2)},${f(e2y + 0.2)}Q${f(e2x)},${f(e2y + 1.8)} ${f(e2x + 2.4)},${f(e2y)}`, 1.4 * u);
        s += S(`M${f(e2x + 2)},${f(e2y + 0.6)}l1,1.1`, 0.8 * u);
        break;
      case 'goofy':
        s += heye(e1x, e1y, 2.2, 2.9) + heye(e2x, e2y, 1.6, 2.2);
        break;
      default:
        s += heye(e1x, e1y, 1.9, 2.6) + heye(e2x, e2y, 1.7, 2.4);
    }
    // brows
    if (st.unibrow) {
      const ub = st.mood === 'scowl' || st.mood === 'fierce'
        ? 'M-9,-5.2C-6,-5.2 -3,-3.4 0.6,-1.8C2.2,-2.4 4,-3.2 10.6,-4.8L10.4,-2.6C5,-1.6 3,-0.4 0.8,0.4C-2.8,-1.2 -6,-2.6 -9,-2.8Z'
        : 'M-9,-4.6C-5,-6.4 -1,-5.4 0.8,-4.2C3,-5.4 7,-6 10.6,-4.2L10.2,-2.4C7,-3.6 3.4,-3.2 0.8,-2.2C-1.4,-3.4 -5,-3.6 -8.8,-2.6Z';
      s += P(ub, brow, 1 * u);
    } else if (st.mood === 'scowl' || st.mood === 'fierce') {
      s += S(`M${f(e1x - 3.4)},${f(e1y - 6)}L${f(e1x + 2.6)},${f(e1y - 3.2)}M${f(e2x - 2)},${f(e2y - 3.6)}L${f(e2x + 3.4)},${f(e2y - 6)}`, bw * 1.3, brow);
    } else if (st.mood === 'smug' || st.mood === 'haughty') {
      s += S(`M${f(e1x - 3)},${f(e1y - 4.4)}Q${f(e1x)},${f(e1y - 5.2)} ${f(e1x + 2.6)},${f(e1y - 4.2)}M${f(e2x - 2.2)},${f(e2y - 6.4)}Q${f(e2x + 0.6)},${f(e2y - 9)} ${f(e2x + 3)},${f(e2y - 6.2)}`, bw, brow);
    } else if (st.mood === 'stern') {
      s += S(`M${f(e1x - 3)},${f(e1y - 4.6)}L${f(e1x + 2.4)},${f(e1y - 3.6)}M${f(e2x - 1.8)},${f(e2y - 3.8)}L${f(e2x + 3)},${f(e2y - 4.8)}`, bw * 1.15, brow);
    } else if (st.mood === 'nervous') {
      s += S(`M${f(e1x - 2.8)},${f(e1y - 3.8)}Q${f(e1x)},${f(e1y - 5)} ${f(e1x + 2.4)},${f(e1y - 5.8)}M${f(e2x - 2)},${f(e2y - 5.6)}Q${f(e2x + 0.4)},${f(e2y - 5.2)} ${f(e2x + 2.6)},${f(e2y - 4)}`, bw, brow);
    } else {
      s += S(`M${f(e1x - 2.8)},${f(e1y - 4.6)}Q${f(e1x)},${f(e1y - 6.2)} ${f(e1x + 2.6)},${f(e1y - 4.8)}M${f(e2x - 2)},${f(e2y - 5)}Q${f(e2x + 0.4)},${f(e2y - 6.4)} ${f(e2x + 2.6)},${f(e2y - 5)}`, bw, brow);
    }
  }
  // ---- nose
  const nk = st.nose ?? 'button';
  const nc = st.noseCol ?? st.skin;
  if (nk === 'bulb') {
    s += d.tone(ell(3.8, 4.8, 3.1, 2.6), nc, 1.2 * u, [-0.6, -0.6]) + hl(3, 3.8, 0.9, 0.6, -20, 0.7);
  } else if (nk === 'wide') {
    s += d.tone('M0.2,5.6C0.2,3 2,1.4 3.8,1.6C5.6,1.4 7.6,3 7.4,5.6C6.4,6.8 1.2,6.8 0.2,5.6Z', nc, 1.1 * u, [-0.5, -0.5]);
    s += `<circle cx="2.4" cy="5.2" r="0.6" fill="${darker(nc[1], 0.7)}"/><circle cx="5.4" cy="5.2" r="0.6" fill="${darker(nc[1], 0.7)}"/>`;
  } else if (nk === 'pointy') {
    s += d.tone('M1.2,3.6C3.4,4.6 8.6,6.2 12.4,6.6C10,8.4 5,8.8 1.8,7.8C0.8,6.8 0.4,4.6 1.2,3.6Z', nc, 1.1 * u, [-0.4, -0.4]);
  } else if (nk === 'hook') {
    s += d.tone('M2,0C4.6,0.6 8.2,3 8.4,5.6C8.6,7.6 6.4,8 5.4,6.6C4.6,7 3,6.8 2.4,6Z', nc, 1.1 * u, [-0.4, -0.4]);
  } else {
    s += S('M1.6,3.3Q4.2,4.1 2.4,6.3', 1.1 * u, darker(st.skin[1]));
  }
  // ---- mouth
  const mt = (x: number, y: number) => `translate(${f(x)} ${f(y + my)})`;
  let m = '';
  if (expr === 'scream') {
    const md = 'M-2.6,8.2C0,6.6 7.4,6.4 9.8,8C11,12 9,17.2 3.8,17.4C-1.2,17.4 -3.6,12.4 -2.6,8.2Z';
    m += P(md, MOUTH, 1.3 * u) + d.clip(md, P('M-4,5H12V9.6H-4Z', '#FFFFFF') + S('M-4,9.6H12', 0.6 * u, '#C9C2B4') + P(ell(4, 17.2, 4.4, 2.6), TONGUE));
    m += `<ellipse cx="4.2" cy="10.6" rx="0.9" ry="1.3" fill="${TONGUE}"/>`;
  } else if (expr === 'shock') {
    m += P(ell(3.6, 11.4, 2.2, 2.8), MOUTH, 1.2 * u) + P(ell(3.6, 12.8, 1.3, 0.9), TONGUE);
  } else if (expr === 'happy') {
    const md = 'M-3.2,7.6C0.8,8.8 7.2,8.6 10,6.6C9.4,12.8 -0.6,13.8 -3.2,7.6Z';
    m += P(md, MOUTH, 1.2 * u) + d.clip(md, P('M-4,6H12V9.4H-4Z', '#FFFFFF'));
    m += d.tone('M4.4,10.4C4.2,14.4 6.2,16.6 8,15.8C9.6,15.2 9.4,12.4 8.6,9.8Z', [TONGUE, '#C24E6C'], 1 * u, [-0.3, -0.3]) + S('M6.6,11.4L7,14.4', 0.6 * u, '#B23C5A');
  } else if (expr === 'dazed') {
    m += S('M-1.8,10.6q1.4,-1.6 2.8,0t2.8,0t2.8,0t2.6,-0.4', 1.3 * u);
    m += d.tone('M3,10.8C2.4,14.2 3.4,16.4 5,16.4C6.6,16.4 7,14.4 6.4,10.6Z', [TONGUE, '#C24E6C'], 1 * u, [-0.3, -0.3]);
  } else {
    switch (st.mood) {
      case 'grin': {
        const md = 'M-3.4,7.7C0.6,8.7 6.8,8.7 9.6,6.7C8.8,12.9 -0.6,13.7 -3.4,7.7Z';
        m += P(md, MOUTH, 1.2 * u) + d.clip(md, P('M-4,6.4H11V9.8H-4Z', '#FFFFFF') + P(ell(3, 13.1, 3, 1.5), TONGUE));
        m += S('M0.4,8.4V9.8M3,8.6V9.9M5.8,8.3V9.7', 0.6 * u, '#C9C2B4');
        break;
      }
      case 'scowl':
      case 'fierce': {
        const md = 'M-2,10.6C-1.6,8.4 0.4,8.2 3.4,8.2C6.4,8.2 8.6,8.2 9,10.4C9,12.6 6.6,12.4 3.4,12.4C0.2,12.4 -2,12.8 -2,10.6Z';
        m += P(md, '#FFFFFF', 1.2 * u) + d.clip(md, S('M-3,10.4H10M1,7V14M3.6,7V14M6.2,7V14', 0.7 * u, '#B9AF9C'));
        m += S(md, 1.2 * u);
        break;
      }
      case 'smug':
        m += S('M-1,9.7Q2.6,10.9 6.8,8.1', 1.3 * u) + S('M6.2,7.3Q7.4,7.9 7.4,9.1', 1 * u);
        break;
      case 'haughty':
        m += P('M1.6,10.6C2.6,9.2 5.4,9.2 6.4,10.4C5.4,11.4 2.8,11.6 1.6,10.6Z', '#C8706A', 1.1 * u);
        break;
      case 'stern':
        m += S('M-0.2,11.1Q3,10.3 6.2,11.1', 1.3 * u);
        break;
      case 'bored':
        m += S('M0.6,10.3Q3,9.7 5.4,10.5', 1.2 * u);
        break;
      case 'nervous':
        m += P('M0,8.9C1.4,9.5 4,9.5 5.6,8.7C5,11.7 1,11.9 0,8.9Z', MOUTH, 1.1 * u);
        break;
      default: {
        const md = 'M-1.8,8.5C0.6,9.1 4.4,9.1 6.8,7.9C6.2,12.3 0.2,12.9 -1.8,8.5Z';
        m += P(md, MOUTH, 1.2 * u) + d.clip(md, P(ell(2.6, 12.7, 2.8, 1.5), TONGUE));
      }
    }
    if (st.teeth === 'buck' && (st.mood === 'smile' || st.mood === 'goofy' || st.mood === 'grin')) {
      m += P(rrect(0.6, 8.2, 1.9, 2.6, 0.4), '#FFFFFF', 0.8 * u) + P(rrect(2.5, 8.2, 1.9, 2.6, 0.4), '#FFFFFF', 0.8 * u);
    }
    if (st.teeth === 'braces') m += S('M-1.6,8.9H7.2', 0.7 * u, '#9AA6B4') + `<rect x="0.6" y="8.3" width="1" height="1.2" fill="#9AA6B4"/><rect x="3.4" y="8.3" width="1" height="1.2" fill="#9AA6B4"/>`;
    if (st.teeth === 'gold') m += P(rrect(4.4, 8.2, 1.9, 2.2, 0.4), GOLD[0], 0.7 * u);
  }
  s += G(m, mt(0, 0));
  if (st.blush || expr === 'happy') s += blush(expr === 'happy' ? 0.5 : 0.35);
  return s;
}

/** Zombie face kit (local frame) used by the monster summons: chomp / sleep / dazed / normal. */
export function zombieEyes(d: Doc, u: number, expr: Expr, lidcol: string, e1: Pt = EYE1, e2: Pt = EYE2, r1 = 4.2, r2 = 3.5): string {
  if (expr === 'sleep') {
    return (
      S(`M${f(e1[0] - r1)},${f(e1[1])}Q${f(e1[0])},${f(e1[1] + r1 * 0.7)} ${f(e1[0] + r1)},${f(e1[1])}`, 1.5 * u) +
      S(`M${f(e2[0] - r2)},${f(e2[1])}Q${f(e2[0])},${f(e2[1] + r2 * 0.7)} ${f(e2[0] + r2)},${f(e2[1])}`, 1.5 * u)
    );
  }
  if (expr === 'dazed') {
    return P(ell(e1[0], e1[1], r1, r1), SCLERA, 1.2 * u) + spiral(e1[0], e1[1], r1 * 0.8, 0.9 * u, 2.2) +
      P(ell(e2[0], e2[1], r2, r2), SCLERA, 1.2 * u) + spiral(e2[0], e2[1], r2 * 0.8, 0.9 * u, 2);
  }
  if (expr === 'chomp') {
    return zeye(d, e1[0], e1[1], r1 * 1.08, 0.12, -0.8, 0.8, -0.2, lidcol, u) + zeye(d, e2[0], e2[1], r2 * 1.08, 0.1, 0.8, 0.4, -0.2, lidcol, u);
  }
  return zeye(d, e1[0], e1[1], r1, 0.42, -0.7, 0.6, 0.8, lidcol, u) + zeye(d, e2[0], e2[1], r2, 0.3, 0.8, 0.4, 0.6, lidcol, u);
}

// ------------------------------------------------------------------ signature weapons (+x = forward, grip at origin)
export function wpnSpatula(): Weapon {
  return {
    box: [-9, -11.5, 40, 11.5],
    angle: 22,
    draw: (d) => {
      let s = d.tone(capsule([-6, 0], [17, 0], 3.6, 3.2), WOOD, OW * 0.9);
      s += S('M-3,-0.8H6M8,0.6H14', 0.6, '#7A4524');
      s += P(ell(-4.4, 0, 0.7), OUT);
      s += d.tone('M16,-1.4L22,-2.4L22,2.4L16,1.4Z', STEEL, OW * 0.8, [-0.3, -0.3]);
      const blade = rrect(21.4, -10.4, 17.4, 20.8, 3.2);
      s += d.tone(blade, STEEL, OW, [-0.9, -0.9]);
      s += P(rrect(25, -7, 2, 14, 1), '#6B7787', 0.7) + P(rrect(29, -7, 2, 14, 1), '#6B7787', 0.7) + P(rrect(33, -7, 2, 14, 1), '#6B7787', 0.7);
      // a fried egg stuck to it
      s += d.clip(blade, P('M30,-11C34,-11 40.6,-10 39,-4.6C40,-1 36,1.6 33.4,0.4C30,2 26.6,-0.4 27.6,-3.6C25.4,-6 27,-11 30,-11Z', '#FFFFFF', 1));
      s += P(ell(33.4, -4.6, 2.6, 2.4), '#FFB81F', 1) + hl(32.6, -5.4, 0.8, 0.6, -20, 0.9);
      s += hl(23.6, 4, 0.8, 4.6, 0, 0.6);
      return s;
    },
  };
}

export function wpnMallet(): Weapon {
  return {
    box: [-10, -10.5, 38, 10.5],
    angle: 18,
    draw: (d) => {
      let s = d.tone(capsule([-7, 0], [27, 0], 3.8, 3.4), WOOD, OW * 0.9);
      s += P(rrect(-7.6, -2.4, 4.6, 4.8, 1.2), '#2B2B30', 0.9);
      s += S('M0,-0.8H8M12,0.6H20', 0.6, '#7A4524');
      const head = rrect(24, -9.2, 12.4, 18.4, 2);
      s += d.tone(head, STEEL, OW, [-0.8, -0.8]);
      // pyramid teeth on the striking face (front side)
      for (let i = 0; i < 4; i++) {
        const y = -8.4 + i * 4.4;
        s += P(`M36.2,${f(y)}L38.4,${f(y + 2.2)}L36.2,${f(y + 4.4)}Z`, STEEL[1], 0.8);
      }
      s += S('M26,-9V9', 1.1, '#7C8898');
      s += hl(29.4, -6.6, 2.6, 0.8, 0, 0.7);
      return s;
    },
  };
}

export function wpnCarrot(): Weapon {
  return {
    box: [-14, -9, 40, 8],
    angle: 26,
    draw: (d) => {
      let s = '';
      // leafy top sticks out behind the fist
      const leaf = (a: number, L: number) => G(d.tone(`M0,0C${f(-L * 0.4)},-3.2 ${f(-L * 0.8)},-3 ${f(-L)},0C${f(-L * 0.8)},3 ${f(-L * 0.4)},3.2 0,0Z`, ['#4FB848', '#2F8A2E'], OW * 0.75, [-0.3, -0.3]) + S(`M0,0L${f(-L * 0.9)},0`, 0.6, '#2F8A2E'), `translate(-3 0) rotate(${a})`);
      s += leaf(-28, 10) + leaf(4, 11.5) + leaf(32, 9);
      const body = 'M-4,-6.2C6,-7.6 26,-4.6 38.6,-0.2C39.4,0.4 39.2,1.2 38.4,1.4C26,5 6,7.4 -4,6.2C-6.6,4 -6.6,-4 -4,-6.2Z';
      s += d.tone(body, ['#FF8A1F', '#D9561A'], OW, [-0.8, -1]);
      s += S('M6,-5.4q1.2,2.4 0,4M13,-4.4q1,2 0,3.4M21,-3.2q0.8,1.6 0,2.6M8,2.4q1,1.6 0.2,3M17,2q0.8,1.4 0,2.4M28,1.2q0.6,1 0,1.6', 0.9, '#B8461A');
      s += hl(8, -3.8, 5, 0.8, 4, 0.55);
      return s;
    },
  };
}

export function wpnDrumstick(): Weapon {
  return {
    box: [-9, -14, 42, 13],
    angle: 22,
    draw: (d) => {
      let s = '';
      // bone handle with a knobby end
      s += d.tone(ell(-5.4, -1.8, 2.6, 2.4), ['#FFF6D8', '#E3D2A8'], OW * 0.8, [-0.4, -0.4]);
      s += d.tone(ell(-5.4, 1.8, 2.6, 2.4), ['#FFF6D8', '#E3D2A8'], OW * 0.8, [-0.4, -0.4]);
      s += d.tone(capsule([-4.6, 0], [14, 0], 3.6, 4), ['#FFF6D8', '#E3D2A8'], OW * 0.9);
      // crispy fried meat end (lumpy)
      // crispy fried meat: teardrop with a bumpy crust edge
      const meat =
        'M12,-2.6C14,-6 18,-8.6 22,-10.4C23,-12 25.4,-12.4 26.6,-11.2C28.6,-12.6 31.4,-12 32.2,-10.2C35,-10.4 37.6,-8 37.4,-5.4C39.6,-4 40,-0.6 38.4,1.2C39.6,3.6 38,6.8 35.4,7.2C34.6,9.6 31.6,10.8 29.4,9.8C27.6,11.6 24.4,11.4 23.2,9.6C19.6,9 15.4,6.4 12,3Z';
      s += d.tone(meat, ['#E09A3A', '#B0661E'], OW, [-1.2, -1.2]);
      s += d.clip(meat, [[18, -5, 20], [24.4, -7.4, -10], [30.6, -6, 30], [35, -1.4, 70], [21, 1.6, -30], [27, 2.4, 10], [32, 5, -20], [24.6, 6.6, 40]].map(([x, y, r]) =>
        G(P('M-1.6,0C-1,-0.9 0.6,-1 1.6,-0.2C0.8,0.8 -0.8,0.9 -1.6,0Z', '#8A4A14', 0, OUT, 'opacity="0.75"'), `translate(${x} ${y}) rotate(${r})`)).join(''));
      s += P('M12.4,-2.2C9.8,-3.4 9.6,3.2 12.4,2.6Z', '#FFF6D8', 0.9);
      s += hl(24, -7.6, 5, 1.3, -10, 0.55) + hl(33.6, -6.4, 1.6, 0.8, 30, 0.5);
      return s;
    },
  };
}

export function wpnBaguette(): Weapon {
  return {
    box: [-8, -8, 44, 8],
    angle: 28,
    draw: (d) => {
      let s = '';
      // wine-cork pommel + grip
      s += d.tone(rrect(-7.4, -2.6, 4.6, 5.2, 1.4), ['#C99A62', '#9E7040'], OW * 0.8, [-0.3, -0.3]);
      s += d.tone(rrect(-3.4, -2, 8, 4, 1.2), ['#7A2A3A', '#561A28'], OW * 0.8, [-0.3, -0.3]);
      // fork crossguard
      s += d.tone(rrect(4.4, -7, 2.6, 14, 1.2), STEEL, OW * 0.8, [-0.3, -0.3]);
      s += S('M7,-7l2.4,-0.6M7,7l2.4,0.6', 1.1, OUT);
      // the baguette blade
      const b = 'M6.8,-3.6C16,-4.8 32,-4.4 40.6,-2.6C43.6,-2 43.6,2 40.6,2.6C32,4.4 16,4.8 6.8,3.6Z';
      s += d.tone(b, ['#E8B060', '#C08038'], OW, [-0.6, -0.8]);
      for (let i = 0; i < 5; i++) {
        const x = 12 + i * 6;
        s += P(`M${f(x)},-2.4C${f(x + 2)},-3.2 ${f(x + 4)},-2.6 ${f(x + 4.6)},-1.6C${f(x + 3)},-0.8 ${f(x + 1)},-1 ${f(x)},-2.4Z`, '#F6D79A', 0.8);
      }
      s += hl(20, -2.6, 8, 0.6, 0, 0.5);
      return s;
    },
  };
}

export function wpnRollingPin(): Weapon {
  return {
    box: [-10, -6, 32, 6],
    angle: 32,
    draw: (d) => {
      let s = d.tone(capsule([-8, 0], [-1, 0], 3, 3), WOOD, OW * 0.85);
      s += d.tone(capsule([22, 0], [29.4, 0], 3, 3), WOOD, OW * 0.85);
      const roll = rrect(1, -4.4, 21.6, 8.8, 3.4);
      s += d.tone(roll, ['#D9A066', '#B07440'], OW, [-0.6, -0.8]);
      s += S('M5,-2.4H18', 0.8, '#E8BC88') + S('M8,1.8H17', 0.6, '#9A6232');
      s += P(ell(14, 1.4, 2.2, 1), '#FFFFFF', 0, OUT, 'opacity="0.55"');
      return s;
    },
  };
}

/** A round serving tray gripped by its rim, carried like a shield (rim toward the camera). */
export function wpnTray(top: Tone, rim: Tone, load: 'soda' | 'cloche' | 'nuggets' | 'none' = 'none'): Weapon {
  return {
    box: [-4, -17, 29, 9],
    angle: 14,
    draw: (d) => {
      let s = '';
      const plate = ell(13, 0, 13.4, 5.2);
      if (load === 'soda') {
        s += d.tone('M10,-1L11.4,-12.4L17.4,-12.4L18.8,-1Z', ['#E2453C', '#B32E28'], OW * 0.85, [-0.4, -0.4]);
        s += P(rrect(10.6, -14.6, 7.6, 2.4, 1), '#FFFFFF', 0.9) + S('M15.4,-14.4L18.6,-16.6', 1.2, '#FFE14D');
        s += P(ell(14.4, -7, 1.6, 1.6), '#FFFFFF', 0.7);
      } else if (load === 'cloche') {
        s += d.tone('M3.4,-1.4C3.6,-9 8,-13 14,-13C20,-13 24.4,-9 24.6,-1.4Z', STEEL, OW * 0.9, [-0.8, -0.8]);
        s += P(ell(14, -14.2, 1.8, 1.4), STEEL[1], 0.9) + hl(9.6, -8.6, 2.2, 1, -40, 0.85);
      } else if (load === 'nuggets') {
        s += d.tone('M5,-1L6.4,-7.6L21.4,-7.6L22.8,-1Z', ['#E2453C', '#B32E28'], OW * 0.85, [-0.4, -0.4]);
        s += S('M7.8,-7L20,-7', 1.1, '#FFFFFF');
        for (const [x, y] of [[9, -9], [13.4, -10], [17.8, -9.2], [11.4, -11.6], [15.8, -12]] as Pt[]) s += d.tone(ell(x, y, 2.4, 1.9), ['#E8A04A', '#B8742A'], 0.9, [-0.3, -0.3]);
      }
      s += d.tone(plate, rim, OW, [-0.6, -0.6]);
      s += d.tone(ell(13, -0.6, 10.6, 3.6), top, OW * 0.6, [-0.4, -0.4]);
      s += hl(7.4, -1.6, 2.6, 0.7, -8, 0.7);
      return s;
    },
  };
}

// ------------------------------------------------------------------ biped assembly
export interface Biped {
  rig: Rig;
  height: number;
  leg: LegLook;
  /** Shoe scale (1 = joint characters). */
  legK?: number;
  arm: ArmLook;
  /** Far arm, when it differs (towel over the arm...). */
  armR?: ArmLook;
  /** Signature weapon / tray held in armL. */
  weapon?: Weapon;
  torso: (d: Doc, back: boolean) => string;
  torsoBox: Box;
  /** Head art in the LOCAL head frame (see top of file). */
  head: (d: Doc, u: number, back: boolean, e: Expr) => string;
  /** Local head-frame box. */
  headBox: Box;
  faces: FaceName[];
  legBox?: (side: -1 | 1) => Box;
  /** Custom leg painter (monsters); defaults to legArt with `leg`. */
  legPaint?: (d: Doc, side: -1 | 1, back: boolean) => string;
}

function defaultLegBox(rig: Rig, side: -1 | 1, k: number): Box {
  const lx = side * -rig.hip[0];
  return [lx - rig.legW / 2 - 7.4 * k, rig.hip[1] - rig.legW / 2 - 3, lx + 13 * k, 3];
}

/**
 * Builds a biped CharArt: front parts (armR, legR, legL, torso, head, armL), back parts
 * (armL, legL, legR, torso, head, armR: seen from behind, facing up-right, so the screen-right
 * side is now the near side) and expression heads.
 */
export function buildBiped(id: string, B: Biped): CharArt {
  const rig = B.rig;
  const k = B.legK ?? 1;
  const u = 1 / rig.hk;
  const hb = headBox(rig.hc, rig.hk, B.headBox);
  const headG = (d: Doc, back: boolean, e: Expr) =>
    G(B.head(d, u, back, e), `translate(${f(rig.hc[0])} ${f(rig.hc[1])}) scale(${f(rig.hk)})`);
  const lb = (side: -1 | 1) => (B.legBox ? B.legBox(side) : defaultLegBox(rig, side, k));
  const legP = (d: Doc, side: -1 | 1, back: boolean) => (B.legPaint ? B.legPaint(d, side, back) : legArt(d, rig, side, B.leg, back, k));
  const views = (back: boolean): Record<string, CharPart> => {
    const key = (p: string) => (back ? `char_${id}_back_${p}` : `char_${id}_${p}`);
    const legPiv = (side: -1 | 1): Pt => [side * -rig.hip[0], rig.hip[1]];
    const shPiv = (side: -1 | 1): Pt => [side * -rig.sh[0], rig.sh[1]];
    const armR = B.armR ?? B.arm;
    return {
      legL: part(key('legL'), lb(-1), legPiv(-1), (d) => legP(d, -1, back)),
      legR: part(key('legR'), lb(1), legPiv(1), (d) => legP(d, 1, back)),
      torso: part(key('torso'), B.torsoBox, rig.torso, (d) => B.torso(d, back)),
      head: part(key('head'), hb, rig.neck, (d) => headG(d, back, 'normal')),
      // front: armL is the near arm; back: armL is the far arm (shaded)
      armL: part(key('armL'), armBox(rig, -1, B.weapon), shPiv(-1), (d) => armArt(d, rig, -1, B.arm, back, back, B.weapon)),
      armR: part(key('armR'), armBox(rig, 1), shPiv(1), (d) => armArt(d, rig, 1, armR, back, !back)),
    };
  };
  const fr = views(false);
  const bk = views(true);
  const faces: Partial<Record<FaceName, CharPart>> = {};
  for (const n of B.faces) faces[n] = part(`char_${id}_face_${n}`, hb, rig.neck, (d) => headG(d, false, n));
  return {
    id,
    rig: 'biped',
    parts: [fr.armR, fr.legR, fr.legL, fr.torso, fr.head, fr.armL],
    backParts: [bk.armL, bk.legL, bk.legR, bk.torso, bk.head, bk.armR],
    faces,
    height: B.height,
  };
}
