/**
 * C1 character paint kit: brush-weight warm-black ink (heavier on the shadow side), hard two-tone cel
 * shading (no gradients on characters: doc 18 §2), cloth and skin texture, grime, stains, rips,
 * stitches and flies. Built on the shared SVG kit (art/svg.ts) and the v3 kit (art3/kit.ts); nothing
 * here edits those modules.
 */
import { Doc, f, ell } from '../../art/svg';
import type { Pt } from '../../art/svg';
import { INK, rnd, blob } from '../kit';

export { INK, f, ell, rnd, blob };
export type { Pt };

/** Main character outline (world units): ~1.5 % of a 100-unit character, like the original's 2 px on 190. */
export const LW = 1.5;
/** Extra ink on the shadow side of a silhouette (see `shade`): width and offset of the weighted stroke. */
export const LW_SHADOW = 2.0;
export const LW_SHADOW_OFF = 0.55;
/** Interior detail line. */
export const LI = 0.55;
/** Fine detail line (wrinkles, strands). */
export const LF = 0.5;

/** A painted material: base, shadow, deep shadow. */
export interface Tone {
  b: string;
  s: string;
  d: string;
}

// ---------------------------------------------------------------- colour maths
function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function hex(r: number, g: number, b: number): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return '#' + ((1 << 24) | (c(r) << 16) | (c(g) << 8) | c(b)).toString(16).slice(1).toUpperCase();
}
export function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = rgb(a);
  const [r2, g2, b2] = rgb(b);
  return hex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}
export function dk(c: string, k = 0.8): string {
  const [r, g, b] = rgb(c);
  return hex(r * k, g * k, b * k);
}
export function lt(c: string, t = 0.25): string {
  return mix(c, '#F2EEDC', t);
}
/** Build a tone from one base colour. */
export function tone(b: string, s?: string, d?: string): Tone {
  const sh = s ?? mix(dk(b, 0.78), '#3A3020', 0.12);
  return { b, s: sh, d: d ?? dk(sh, 0.72) };
}

// ---------------------------------------------------------------- palette
/**
 * Human skins (doc 18 §1.1). Peach is the original's default for most bodies; khaki is the one "generic
 * man" skin that docs 08/09 overgeneralised. About half the cast is peach, the rest khaki / tan / dark / pale.
 */
export const SKIN_PEACH: Tone = { b: '#FFDDAA', s: '#BBAA77', d: '#7A6A44' };
export const SKIN: Tone = { b: '#B3B294', s: '#968E6F', d: '#655534' };
export const SKIN_TAN: Tone = { b: '#CCBB88', s: '#BB9966', d: '#6E5636' };
export const SKIN_DARK: Tone = { b: '#7E6E52', s: '#62533B', d: '#3F3424' };
export const SKIN_PALE: Tone = { b: '#BCBDA6', s: '#9C9C84', d: '#66654C' };
/** Zombie skin shades: blue-green, sage, yellow-green, leaf (cooler and more varied than one lime). */
export const ZSKINS: Tone[] = [
  { b: '#55AA66', s: '#337733', d: '#254424' },
  { b: '#88AA66', s: '#556644', d: '#254424' },
  { b: '#99CC55', s: '#668822', d: '#254424' },
  { b: '#77AA55', s: '#557733', d: '#254424' },
];
/** Zombie eye: a solid yellow disc with a darker ring, no pupil. */
export const ZEYE = '#CCCC44';
export const ZEYE_D = '#999922';
/** Human sclera: near pure white so the eyes pop against the skin. */
export const SCLERA = '#FAF8F0';
export const TEETH = '#D9CFA4';
export const TEETH_D = '#A89A6A';
export const GUM = '#7A3A34';
export const MOUTH = '#3A1A14';
export const TONGUE = '#9A4A48';
export const BLOOD = '#7A2A22';
export const BLOOD_D = '#4E1812';
export const SLIME = '#6E9A2A';
export const SLIME_L = '#9ABF4A';
export const GREASE = '#7A6236';
export const SWEAT = '#A9C4C4';

export const C = {
  charcoal: tone('#3A3833'),
  olive: tone('#55553F'),
  khaki: tone('#A89C74'),
  white: tone('#DAD6C8', '#B4AF9E'),
  oxblood: tone('#691122'),
  slate: tone('#2C6985'),
  denim: tone('#3A6288', '#1F3B55'),
  navy: tone('#112244'),
  brown: tone('#6A4A30'),
  tan: tone('#9A7A50'),
  mustard: tone('#B09038'),
  grey: tone('#7C7A72'),
  ltgrey: tone('#A8A69C'),
  maroon: tone('#6D1727'),
  rose: tone('#9E6A6E'),
  teal: tone('#336688', '#113344'),
  plum: tone('#5A4560'),
  rust: tone('#A0582E'),
  hivis: tone('#B8B444'),
  orange: tone('#B8682C'),
  black: tone('#2A2724', '#1C1A17'),
  cream: tone('#CFC4A0'),
  sage: tone('#7F8C68'),
  pink: tone('#B07C84'),
  gold: tone('#B8963E'),
  chrome: tone('#A8ACA8', '#7C807C'),
  // the original's few saturated garments (royal-blue suit, lilac top): one accent piece per character
  royal: tone('#2222BB'),
  lilac: tone('#CCAACC', '#886688'),
};

// ---------------------------------------------------------------- primitive painters
export function fill(d: string, col: string, extra = ''): string {
  return `<path d="${d}" fill="${col}"${extra ? ' ' + extra : ''}/>`;
}
export function line(d: string, w = LI, col = INK, extra = ''): string {
  return `<path d="${d}" fill="none" stroke="${col}" stroke-width="${f(w)}"${extra ? ' ' + extra : ''}/>`;
}
export function outl(d: string, col: string, w = LW, extra = ''): string {
  return `<path d="${d}" fill="${col}" stroke="${INK}" stroke-width="${f(w)}"${extra ? ' ' + extra : ''}/>`;
}
export function op(inner: string, o: number): string {
  return `<g opacity="${f(o)}">${inner}</g>`;
}
export function grp(inner: string, tr: string): string {
  return tr ? `<g transform="${tr}">${inner}</g>` : inner;
}
export function circ(x: number, y: number, r: number, col: string, o = 1): string {
  return `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${col}"${o < 1 ? ` opacity="${f(o)}"` : ''}/>`;
}

// ---------------------------------------------------------------- gradients (per-doc cache)
const gcache = new WeakMap<Doc, Map<string, string>>();
function cached(d: Doc, key: string, make: (id: string) => string): string {
  let m = gcache.get(d);
  if (!m) {
    m = new Map();
    gcache.set(d, m);
  }
  let u = m.get(key);
  if (!u) {
    const id = d.id('g');
    d.def(make(id));
    u = `url(#${id})`;
    m.set(key, u);
  }
  return u;
}

/** Vertical fade gradient (grime at hems, dyed hair tips; never for volume on a character). */
export function fadeV(d: Doc, col: string, o0: number, o1: number): string {
  return cached(d, `f${col}${o0}${o1}`, (id) =>
    `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${col}" stop-opacity="${f(o0)}"/>` +
      `<stop offset="1" stop-color="${col}" stop-opacity="${f(o1)}"/></linearGradient>`,
  );
}
/** Radial soft spot. */
export function spot(d: Doc, col: string, o: number): string {
  return cached(d, `r${col}${o}`, (id) =>
    `<radialGradient id="${id}" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${col}" stop-opacity="${f(o)}"/>` +
      `<stop offset="1" stop-color="${col}" stop-opacity="0"/></radialGradient>`,
  );
}

export interface ShadeOpts {
  lw?: number;
  /** offset of the lit shape: the shadow crescent falls bottom-right. */
  off?: Pt;
  /** extra content painted inside the shape (texture, folds) before the outline. */
  inner?: string;
  /** outline this path instead of the fill's own edge (open joint caps: see `seg`). */
  stroke?: string;
  /** skip the weighted shadow-side ink (tiny parts, strokes that must stay even). */
  even?: boolean;
}

/**
 * Hard two-tone cel shading + optional inner texture + a brush-weight ink outline: one flat shadow
 * tone, the flat base shape shifted up-left so a clean shadow band stays along the right and lower
 * edges, then the outline. The outline is a plain stroke plus a wider stroke offset down-right and
 * painted *under* the fill, so the ink only shows past the silhouette on the shadow side (the
 * original's brush line: thin top-left, thick bottom-right and under the chin).
 */
export function shade(d: Doc, path: string, t: Tone, o: ShadeOpts = {}): string {
  const lw = o.lw ?? LW;
  const off = o.off ?? [-2.2, -2];
  const cid = d.clipId(path);
  const edge = o.stroke ?? path;
  const join = o.stroke ? ' stroke-linejoin="round"' : '';
  let s = '';
  if (lw > 0 && !o.even && lw >= LW * 0.7) {
    const w = LW_SHADOW * (lw / LW);
    const k = LW_SHADOW_OFF * (lw / LW);
    s += `<path d="${edge}" fill="none" stroke="${INK}" stroke-width="${f(w)}"${join} transform="translate(${f(k)} ${f(k)})"/>`;
  }
  s += `<path d="${path}" fill="${t.s}"/>`;
  s += `<g clip-path="url(#${cid})"><path d="${path}" fill="${t.b}" transform="translate(${f(off[0])} ${f(off[1])})"/>`;
  if (o.inner) s += o.inner;
  s += '</g>';
  if (lw > 0) s += `<path d="${edge}" fill="none" stroke="${INK}" stroke-width="${f(lw)}"${join}/>`;
  return s;
}

/** Clip `inner` to `path`. */
export function inside(d: Doc, path: string, inner: string): string {
  return inner ? d.clip(path, inner) : '';
}

// ---------------------------------------------------------------- texture
/** Fabric / skin speckle: tiny dots of light and dark scattered in a box. */
export function speck(box: [number, number, number, number], n: number, cols: string[], seed: number, r0 = 0.25, r1 = 0.6, o = 0.35): string {
  const r = rnd(seed);
  let s = '';
  for (let k = 0; k < n; k++) {
    const x = box[0] + r() * (box[2] - box[0]);
    const y = box[1] + r() * (box[3] - box[1]);
    s += circ(x, y, r0 + r() * (r1 - r0), cols[k % cols.length], o * (0.5 + r() * 0.5));
  }
  return s;
}

/** Short hatch strokes (weave / stubble / hair grain). */
export function hatch(box: [number, number, number, number], n: number, col: string, seed: number, len = 0.9, ang = 1.2, w = 0.3, o = 0.5): string {
  const r = rnd(seed);
  let dd = '';
  for (let k = 0; k < n; k++) {
    const x = box[0] + r() * (box[2] - box[0]);
    const y = box[1] + r() * (box[3] - box[1]);
    const a = ang + (r() - 0.5) * 0.6;
    dd += `M${f(x)},${f(y)}l${f(Math.cos(a) * len)},${f(Math.sin(a) * len)}`;
  }
  return line(dd, w, col, `opacity="${f(o)}"`);
}

/** Dirty smudges (low-opacity blobs). */
export function grime(box: [number, number, number, number], n: number, col: string, seed: number, size = 2.2, o = 0.22): string {
  const r = rnd(seed);
  let s = '';
  for (let k = 0; k < n; k++) {
    const x = box[0] + r() * (box[2] - box[0]);
    const y = box[1] + r() * (box[3] - box[1]);
    const rx = size * (0.6 + r() * 0.8);
    s += fill(blob(x, y, rx, rx * (0.5 + r() * 0.4), Math.floor(r() * 1000) + seed, 7, 0.5), col, `opacity="${f(o * (0.6 + r() * 0.6))}"`);
  }
  return s;
}

/** Fold / crease line in a shadow colour. */
export function fold(dd: string, col: string, w = LI, o = 0.85): string {
  return line(dd, w, col, `opacity="${f(o)}"`);
}

/** A stain: irregular blob with a darker rim and a few spatter dots. */
export function stain(x: number, y: number, r: number, col: string, seed: number, o = 0.8, drops = 2): string {
  const rr = rnd(seed);
  let s = fill(blob(x, y, r, r * 0.8, seed, 8, 0.55), col, `opacity="${f(o)}"`);
  s += line(blob(x, y, r * 0.98, r * 0.78, seed, 8, 0.55), 0.35, dk(col, 0.7), `opacity="${f(o * 0.7)}"`);
  for (let k = 0; k < drops; k++) {
    const a = rr() * Math.PI * 2;
    const dd = r * (1.3 + rr() * 0.8);
    s += circ(x + Math.cos(a) * dd, y + Math.sin(a) * dd, 0.25 + rr() * 0.35 * r, col, o);
  }
  return s;
}

/** A vertical drip run (blood / slime) from (x, y). */
export function drip(x: number, y: number, len: number, w: number, col: string, o = 0.9): string {
  const dd =
    `M${f(x - w / 2)},${f(y)}C${f(x - w / 2)},${f(y + len * 0.5)} ${f(x - w * 0.3)},${f(y + len * 0.8)} ${f(x - w * 0.55)},${f(y + len)}` +
    `C${f(x - w * 0.55)},${f(y + len + w * 0.9)} ${f(x + w * 0.55)},${f(y + len + w * 0.9)} ${f(x + w * 0.55)},${f(y + len)}` +
    `C${f(x + w * 0.35)},${f(y + len * 0.7)} ${f(x + w / 2)},${f(y + len * 0.4)} ${f(x + w / 2)},${f(y)}Z`;
  return fill(dd, col, `opacity="${f(o)}"`);
}

/** Jagged polygon (rip holes, torn edges). */
export function jag(cx: number, cy: number, rx: number, ry: number, seed: number, n = 9, j = 0.45): string {
  const r = rnd(seed);
  const pts: string[] = [];
  for (let k = 0; k < n * 2; k++) {
    const a = (k / (n * 2)) * Math.PI * 2;
    const m = k % 2 ? 1 - j * (0.5 + r() * 0.5) : 1 - r() * 0.15;
    pts.push(`${f(cx + Math.cos(a) * rx * m)},${f(cy + Math.sin(a) * ry * m)}`);
  }
  return 'M' + pts.join('L') + 'Z';
}

/** A rip in cloth showing what is underneath (green skin for zombies). */
export function rip(x: number, y: number, rx: number, ry: number, under: Tone, seed: number): string {
  const h = jag(x, y, rx * 0.8, ry * 0.8, seed, 6, 0.32);
  const hi = jag(x + rx * 0.15, y + ry * 0.2, rx * 0.55, ry * 0.5, seed + 3, 5, 0.25);
  let s = fill(h, under.d) + fill(hi, under.s) + fill(ell(x + rx * 0.25, y + ry * 0.3, rx * 0.3, ry * 0.22), under.b, 'opacity="0.7"');
  s += line(h, 0.6, INK);
  // loose threads
  const r = rnd(seed + 11);
  s += line(`M${f(x - rx * 0.8)},${f(y + ry * 0.4)}l${f(-0.6 - r())},${f(0.9 + r())}M${f(x + rx * 0.6)},${f(y + ry * 0.7)}l${f(0.4 + r() * 0.6)},${f(1 + r())}`, 0.35, INK, 'opacity="0.8"');
  return s;
}

/** Stitches along a line, with cross ticks. */
export function stitch(x1: number, y1: number, x2: number, y2: number, n = 3, len = 1.2, w = 0.55, col = INK): string {
  let dd = `M${f(x1)},${f(y1)}L${f(x2)},${f(y2)}`;
  const L = Math.hypot(x2 - x1, y2 - y1) || 1;
  const nx = -(y2 - y1) / L;
  const ny = (x2 - x1) / L;
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const px = x1 + (x2 - x1) * t;
    const py = y1 + (y2 - y1) * t;
    dd += `M${f(px - nx * len)},${f(py - ny * len)}L${f(px + nx * len)},${f(py + ny * len)}`;
  }
  return line(dd, w, col);
}

/** A buzzing fly with motion squiggle. */
export function fly(x: number, y: number, s = 1, seed = 1): string {
  const r = rnd(seed);
  const a = r() * 40 - 20;
  let out = `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(a)}) scale(${f(s)})">`;
  out += `<ellipse cx="-0.4" cy="-0.9" rx="1" ry="0.6" fill="#D8DCD0" opacity="0.55" stroke="${INK}" stroke-width="0.2"/>`;
  out += `<ellipse cx="0.5" cy="-0.95" rx="0.9" ry="0.55" fill="#D8DCD0" opacity="0.55" stroke="${INK}" stroke-width="0.2"/>`;
  out += `<ellipse cx="0" cy="0" rx="1.05" ry="0.75" fill="${INK}"/><circle cx="0.95" cy="-0.1" r="0.5" fill="#3A2018"/>`;
  out += '</g>';
  out += line(`M${f(x - 1.6 * s)},${f(y + 0.6 * s)}q-1,-1.4 -2,0q-1,1.4 -2,0`, 0.25, INK, 'opacity="0.55"');
  return out;
}

/** Tiny tooth (down = hanging from the upper gum). */
export function toothP(x: number, y: number, w: number, h: number, down = true, col = TEETH): string {
  const dd = down
    ? `M${f(x)},${f(y)}L${f(x + w)},${f(y)}L${f(x + w * 0.9)},${f(y + h * 0.8)}Q${f(x + w / 2)},${f(y + h * 1.1)} ${f(x + w * 0.1)},${f(y + h * 0.8)}Z`
    : `M${f(x)},${f(y)}L${f(x + w)},${f(y)}L${f(x + w * 0.9)},${f(y - h * 0.8)}Q${f(x + w / 2)},${f(y - h * 1.1)} ${f(x + w * 0.1)},${f(y - h * 0.8)}Z`;
  return `<path d="${dd}" fill="${col}" stroke="${INK}" stroke-width="0.45"/>`;
}

/** Sweat drop. */
export function sweatDrop(x: number, y: number, s = 1, rot = 0): string {
  const dd = `M0,-2.4C0.6,-1.2 1.5,-0.3 1.5,0.7C1.5,1.6 0.8,2.2 0,2.2C-0.8,2.2 -1.5,1.6 -1.5,0.7C-1.5,-0.3 -0.6,-1.2 0,-2.4Z`;
  return `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)}) scale(${f(s)})"><path d="${dd}" fill="${SWEAT}" stroke="${INK}" stroke-width="0.5"/>` +
    `<ellipse cx="-0.5" cy="0.6" rx="0.35" ry="0.6" fill="#EEF2E8" opacity="0.8"/></g>`;
}

/** Path helpers ------------------------------------------------------------- */
export function poly(pts: Pt[]): string {
  return 'M' + pts.map(([x, y]) => `${f(x)},${f(y)}`).join('L') + 'Z';
}
export function pl(pts: Pt[]): string {
  return 'M' + pts.map(([x, y]) => `${f(x)},${f(y)}`).join('L');
}
/** Smooth closed curve through points (Catmull-Rom). */
export function smooth(pts: Pt[], closed = true): string {
  const n = pts.length;
  let dd = `M${f(pts[0][0])},${f(pts[0][1])}`;
  const last = closed ? n : n - 1;
  for (let k = 0; k < last; k++) {
    const p0 = pts[closed ? (k - 1 + n) % n : Math.max(0, k - 1)];
    const p1 = pts[k];
    const p2 = pts[closed ? (k + 1) % n : k + 1];
    const p3 = pts[closed ? (k + 2) % n : Math.min(n - 1, k + 2)];
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    dd += `C${f(c1[0])},${f(c1[1])} ${f(c2[0])},${f(c2[1])} ${f(p2[0])},${f(p2[1])}`;
  }
  return closed ? dd + 'Z' : dd;
}
/** Tapered limb with round ends (p1 width w1 → p2 width w2). */
export function limb(p1: Pt, p2: Pt, w1: number, w2 = w1): string {
  const [x1, y1] = p1;
  const [x2, y2] = p2;
  const L = Math.hypot(x2 - x1, y2 - y1) || 1;
  const nx = -(y2 - y1) / L;
  const ny = (x2 - x1) / L;
  const r1 = w1 / 2;
  const r2 = w2 / 2;
  return (
    `M${f(x1 + nx * r1)},${f(y1 + ny * r1)}L${f(x2 + nx * r2)},${f(y2 + ny * r2)}A${f(r2)},${f(r2)} 0 0 0 ${f(x2 - nx * r2)},${f(y2 - ny * r2)}` +
    `L${f(x1 - nx * r1)},${f(y1 - ny * r1)}A${f(r1)},${f(r1)} 0 0 0 ${f(x1 + nx * r1)},${f(y1 + ny * r1)}Z`
  );
}
/** Limb with the p2 end cut flat (sleeve / trouser hem); `torn` turns the cut into a zigzag. */
export function tube(p1: Pt, p2: Pt, w1: number, w2 = w1, torn = 0, seed = 1): string {
  const [x1, y1] = p1;
  const [x2, y2] = p2;
  const L = Math.hypot(x2 - x1, y2 - y1) || 1;
  const ux = (x2 - x1) / L;
  const uy = (y2 - y1) / L;
  const nx = -uy;
  const ny = ux;
  const r1 = w1 / 2;
  const r2 = w2 / 2;
  const b: Pt = [x2 + nx * r2, y2 + ny * r2];
  const c: Pt = [x2 - nx * r2, y2 - ny * r2];
  let hem = '';
  if (torn > 0) {
    const r = rnd(seed);
    const steps = 6;
    for (let k = 1; k < steps; k++) {
      const t = k / steps;
      const o = k % 2 ? torn * (0.5 + r() * 0.8) : -torn * 0.2 * r();
      hem += `L${f(b[0] + (c[0] - b[0]) * t + ux * o)},${f(b[1] + (c[1] - b[1]) * t + uy * o)}`;
    }
  } else {
    // a slight curve on the hem (the opening is an ellipse seen from the side)
    hem = `Q${f((b[0] + c[0]) / 2 + ux * 0.8)},${f((b[1] + c[1]) / 2 + uy * 0.8)} ${f(c[0])},${f(c[1])}`;
  }
  return (
    `M${f(x1 + nx * r1)},${f(y1 + ny * r1)}L${f(b[0])},${f(b[1])}` + hem + (torn > 0 ? `L${f(c[0])},${f(c[1])}` : '') +
    `L${f(x1 - nx * r1)},${f(y1 - ny * r1)}A${f(r1)},${f(r1)} 0 0 0 ${f(x1 + nx * r1)},${f(y1 + ny * r1)}Z`
  );
}
/**
 * Lower limb segment hanging from a joint pivot p1 (elbow / knee) to p2. Returns the fill path and
 * an open outline that skips the joint cap: the cap is filled (radius inset by half the outline so
 * the upper segment's own cap outline shows through as the elbow / knee silhouette) but not inked,
 * so the joint reads as one continuous limb at any bend instead of a ring. `end`: 'round' (wrist
 * under a hand), 'flat' (hem) or a torn zigzag hem when `torn` > 0.
 */
export function seg(p1: Pt, p2: Pt, w1: number, w2: number, end: 'round' | 'flat' = 'flat', torn = 0, seed = 1, lw = LW): { fill: string; edge: string } {
  const [x1, y1] = p1;
  const [x2, y2] = p2;
  const L = Math.hypot(x2 - x1, y2 - y1) || 1;
  const ux = (x2 - x1) / L;
  const uy = (y2 - y1) / L;
  const nx = -uy;
  const ny = ux;
  const r1 = w1 / 2;
  const r2 = w2 / 2;
  const rc = Math.max(0.5, r1 - lw / 2);
  const a: Pt = [x1 + nx * r1, y1 + ny * r1];
  const b: Pt = [x2 + nx * r2, y2 + ny * r2];
  const c: Pt = [x2 - nx * r2, y2 - ny * r2];
  const e: Pt = [x1 - nx * r1, y1 - ny * r1];
  let hem: string;
  if (end === 'round') hem = `A${f(r2)},${f(r2)} 0 0 0 ${f(c[0])},${f(c[1])}`;
  else if (torn > 0) {
    const r = rnd(seed);
    hem = '';
    const steps = 6;
    for (let k = 1; k < steps; k++) {
      const t = k / steps;
      const o = k % 2 ? torn * (0.5 + r() * 0.8) : -torn * 0.2 * r();
      hem += `L${f(b[0] + (c[0] - b[0]) * t + ux * o)},${f(b[1] + (c[1] - b[1]) * t + uy * o)}`;
    }
    hem += `L${f(c[0])},${f(c[1])}`;
  } else hem = `Q${f((b[0] + c[0]) / 2 + ux * 0.8)},${f((b[1] + c[1]) / 2 + uy * 0.8)} ${f(c[0])},${f(c[1])}`;
  const side = `M${f(a[0])},${f(a[1])}L${f(b[0])},${f(b[1])}${hem}L${f(e[0])},${f(e[1])}`;
  const fillP = side + `L${f(x1 - nx * rc)},${f(y1 - ny * rc)}A${f(rc)},${f(rc)} 0 0 0 ${f(x1 + nx * rc)},${f(y1 + ny * rc)}Z`;
  return { fill: fillP, edge: side };
}
/** A cylindrical band (cuff, sock top, wristband) from y0 to y1 around x: flat-topped, gently curved edges. */
export function band(x: number, y0: number, y1: number, w0: number, w1 = w0): string {
  const a = w0 / 2;
  const b = w1 / 2;
  return `M${f(x - a)},${f(y0)}Q${f(x)},${f(y0 + 0.9)} ${f(x + a)},${f(y0)}L${f(x + b)},${f(y1)}Q${f(x)},${f(y1 + 0.9)} ${f(x - b)},${f(y1)}Z`;
}
export { ell as ellD };
