/**
 * Character painting kit (used by chars.ts). Builds on svg.ts without modifying it.
 * Everything is in world units, authored in the shared biped frame documented in chars.ts.
 */
import { Doc, OUT, OW, S, P, G, ell, f, hl, poly } from './svg';
import type { Pt, Tone } from './svg';

// ------------------------------------------------------------------ palette
export const ZSK: Tone = ['#8DC63F', '#5E9A2A'];
export const ZHI = '#B8E26B';
export const ZDEEP = '#4C8222';
export const PATCH = '#74B134';
export const GOO = '#B8F07A';
export const GOO_D = '#6FCB3A';
export const SCLERA = '#FFE14D';
export const MOUTH = '#5A1E22';
export const TOOTH = '#FFF6D8';
export const TONGUE = '#E06A86';
export const BLUSH = '#F06A7A';
export const SWEAT = '#8FD3FF';
export const WHITE: Tone = ['#FBF7EE', '#DCD3C0'];
export const GOLD: Tone = ['#FFC83D', '#D9971A'];
export const FONT = `font-family="Arial Black, Arial, Helvetica, sans-serif" font-weight="900"`;

// ------------------------------------------------------------------ colour maths
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
export function darker(c: string, k = 0.82): string {
  const [r, g, b] = rgb(c);
  return hex(r * k, g * k, b * k);
}
export function lighter(c: string, t = 0.38): string {
  return mix(c, '#FFFFFF', t);
}

// ------------------------------------------------------------------ cel shading
export interface CelOpts {
  sw?: number;
  /** offset of the lit base (shadow crescent falls bottom-right). */
  off?: Pt;
  /** width of the top-left highlight rim; 0 disables it. */
  hi?: number;
  hiCol?: string;
}

/**
 * Two-tone cel shading plus a thin highlight rim on the lit (top-left) edge:
 * shadow everywhere, lit base shifted up-left, a light crescent along the top-left edge, outline.
 */
export function cel(d: Doc, path: string, t: Tone, o: CelOpts = {}): string {
  const sw = o.sw ?? OW;
  const off = o.off ?? [-1.2, -1.2];
  const h = o.hi ?? 0.9;
  const cid = d.clipId(path);
  let s = `<path d="${path}" fill="${t[1]}"/><g clip-path="url(#${cid})">`;
  if (h > 0) {
    const inner = d.id('c');
    d.def(`<clipPath id="${inner}"><path d="${path}" transform="translate(${f(h)} ${f(h)})"/></clipPath>`);
    const light = o.hiCol ?? lighter(t[0], 0.42);
    s += `<path d="${path}" fill="${light}" transform="translate(${f(off[0])} ${f(off[1])})"/>`;
    s += `<g clip-path="url(#${inner})"><path d="${path}" fill="${t[0]}" transform="translate(${f(off[0])} ${f(off[1])})"/></g>`;
  } else {
    s += `<path d="${path}" fill="${t[0]}" transform="translate(${f(off[0])} ${f(off[1])})"/>`;
  }
  s += '</g>';
  if (sw > 0) s += `<path d="${path}" fill="none" stroke="${OUT}" stroke-width="${f(sw)}"/>`;
  return s;
}

/** Shadow-tinted fold / crease line. */
export function fold(dd: string, col: string, sw = 0.9, op = 0.9): string {
  return S(dd, sw, col, `opacity="${f(op)}"`);
}

// ------------------------------------------------------------------ small painters
export function rip(d: Doc, x: number, y: number, s = 1): string {
  const pts: Pt[] = [
    [-2.6, -0.8], [-1.2, -2], [-0.3, -0.9], [1.1, -2.1], [1.9, -0.6], [2.9, 0], [1.4, 0.8], [0.8, 1.9], [-0.8, 1], [-1.9, 1.7],
  ];
  return d.tone(poly(pts.map(([a, b]) => [x + a * s, y + b * s] as Pt)), ZSK, 1.1, [-0.4, -0.4]);
}

export function stain(x: number, y: number, s: number, col: string, op = 0.85): string {
  const dd =
    `M${f(x - 2.4 * s)},${f(y)}C${f(x - 2.6 * s)},${f(y - 2 * s)} ${f(x - 0.4 * s)},${f(y - 2.6 * s)} ${f(x + 1 * s)},${f(y - 1.6 * s)}` +
    `C${f(x + 2.8 * s)},${f(y - 2 * s)} ${f(x + 3 * s)},${f(y + 0.4 * s)} ${f(x + 1.8 * s)},${f(y + 1.2 * s)}` +
    `C${f(x + 1.6 * s)},${f(y + 2.6 * s)} ${f(x - 0.6 * s)},${f(y + 2.2 * s)} ${f(x - 1 * s)},${f(y + 1.4 * s)}` +
    `C${f(x - 2 * s)},${f(y + 1.8 * s)} ${f(x - 2.8 * s)},${f(y + 1 * s)} ${f(x - 2.4 * s)},${f(y)}Z`;
  return P(dd, col, 0, OUT, `opacity="${op}"`);
}

/** A goo drip hanging from (x, y). */
export function drool(x: number, y: number, L = 4.4, w = 1.7): string {
  const dd =
    `M${f(x - w * 0.45)},${f(y)}C${f(x - w * 0.5)},${f(y + L * 0.5)} ${f(x - w)},${f(y + L * 0.7)} ${f(x - w * 0.8)},${f(y + L)}` +
    `C${f(x - w * 0.5)},${f(y + L * 1.25)} ${f(x + w * 0.5)},${f(y + L * 1.25)} ${f(x + w * 0.8)},${f(y + L)}` +
    `C${f(x + w)},${f(y + L * 0.7)} ${f(x + w * 0.5)},${f(y + L * 0.5)} ${f(x + w * 0.45)},${f(y)}Z`;
  return P(dd, GOO, 0.9) + hl(x - w * 0.3, y + L * 0.95, w * 0.22, w * 0.3, 0, 0.9);
}

/** Long thin drool string ending in a drop. */
export function droolString(x: number, y: number, L: number, sway = 1.2): string {
  const dd = `M${f(x - 0.5)},${f(y)}Q${f(x - sway)},${f(y + L * 0.6)} ${f(x - 0.35)},${f(y + L)}L${f(x + 0.35)},${f(y + L)}Q${f(x - sway + 1)},${f(y + L * 0.6)} ${f(x + 0.5)},${f(y)}Z`;
  return P(dd, GOO, 0.7) + P(ell(x, y + L + 1.1, 1.3, 1.5), GOO, 0.8) + hl(x - 0.4, y + L + 0.7, 0.35, 0.5, 0, 0.9);
}

/** Goo puddle blob sitting on a surface (wet sheen). */
export function gooBlob(x: number, y: number, s = 1): string {
  const dd =
    `M${f(x - 3 * s)},${f(y)}C${f(x - 3 * s)},${f(y - 1.6 * s)} ${f(x - 1 * s)},${f(y - 2.2 * s)} ${f(x)},${f(y - 1.4 * s)}` +
    `C${f(x + 1.6 * s)},${f(y - 2.4 * s)} ${f(x + 3.2 * s)},${f(y - 1 * s)} ${f(x + 2.8 * s)},${f(y + 0.4 * s)}` +
    `C${f(x + 2 * s)},${f(y + 1.4 * s)} ${f(x - 2.4 * s)},${f(y + 1.4 * s)} ${f(x - 3 * s)},${f(y)}Z`;
  return P(dd, GOO, 0.8) + hl(x - 0.8 * s, y - 0.8 * s, 0.8 * s, 0.4 * s, -10, 0.8);
}

export function stitches(x1: number, y1: number, x2: number, y2: number, k = 2, cl = 1.3, sw = 0.9, col = OUT): string {
  let s = S(`M${f(x1)},${f(y1)}L${f(x2)},${f(y2)}`, sw, col);
  const L = Math.hypot(x2 - x1, y2 - y1);
  const nx = -(y2 - y1) / L;
  const ny = (x2 - x1) / L;
  for (let i = 0; i < k; i++) {
    const t = (i + 1) / (k + 1);
    const px = x1 + (x2 - x1) * t;
    const py = y1 + (y2 - y1) * t;
    s += S(`M${f(px - nx * cl)},${f(py - ny * cl)}L${f(px + nx * cl)},${f(py + ny * cl)}`, sw, col);
  }
  return s;
}

export function tooth(x: number, y: number, w = 2, h = 2, down = true): string {
  const dd = down
    ? `M${f(x)},${f(y)}L${f(x + w)},${f(y)}L${f(x + w - 0.3)},${f(y + h)}Q${f(x + w / 2)},${f(y + h + 0.6)} ${f(x + 0.3)},${f(y + h)}Z`
    : `M${f(x)},${f(y)}L${f(x + w)},${f(y)}L${f(x + w - 0.4)},${f(y - h)}Q${f(x + w / 2)},${f(y - h - 0.6)} ${f(x + 0.4)},${f(y - h)}Z`;
  return P(dd, TOOTH, 0.8);
}

/** Cute human eye: dark glossy oval with glints. */
export function heye(cx: number, cy: number, rx: number, ry: number): string {
  return (
    `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="${OUT}"/>` +
    `<circle cx="${f(cx - rx * 0.28)}" cy="${f(cy - ry * 0.36)}" r="${f(rx * 0.42)}" fill="#FFFFFF"/>` +
    `<circle cx="${f(cx + rx * 0.35)}" cy="${f(cy + ry * 0.4)}" r="${f(rx * 0.2)}" fill="#FFFFFF"/>`
  );
}

/** Human eye with an upper lid (bored / smug). */
export function heyeLid(d: Doc, cx: number, cy: number, rx: number, ry: number, lid: string, amt = 0.45, tilt = 0.5): string {
  const e = ell(cx, cy, rx + 0.3, ry + 0.3);
  const y0 = cy - ry + 2 * ry * amt;
  return (
    heye(cx, cy, rx, ry) +
    d.clip(e, P(`M${f(cx - rx - 1)},${f(cy - ry - 1)}H${f(cx + rx + 1)}V${f(y0 - tilt)}L${f(cx - rx - 1)},${f(y0 + tilt)}Z`, lid)) +
    S(`M${f(cx - rx - 0.4)},${f(y0 + tilt)}L${f(cx + rx + 0.4)},${f(y0 - tilt)}`, 1)
  );
}

/** Wide, popped "white" eye with a tiny pupil (scream / shock). */
export function popEye(cx: number, cy: number, rx: number, ry: number, pdx = 0, pdy = 0, pr = 0.9): string {
  return (
    P(ell(cx, cy, rx, ry), '#FFFFFF', 1.1) +
    `<circle cx="${f(cx + pdx)}" cy="${f(cy + pdy)}" r="${f(pr)}" fill="${OUT}"/>` +
    `<circle cx="${f(cx + pdx - pr * 0.35)}" cy="${f(cy + pdy - pr * 0.4)}" r="${f(pr * 0.3)}" fill="#FFFFFF"/>`
  );
}

/** Zombie eye: yellow sclera, tiny pupil, droopy lid clipped to the eye. */
export function zeye(d: Doc, cx: number, cy: number, r: number, lid: number, tilt: number, pdx = 0, pdy = 0.6, lidcol = ZSK[1], ry = r): string {
  const e = ell(cx, cy, r, ry);
  const y0 = cy - ry + 2 * ry * lid;
  const pr = Math.min(r, ry) * 0.3;
  let s = P(e, SCLERA);
  // red-ish veins for texture
  s += d.clip(e, S(`M${f(cx + r)},${f(cy + 0.4)}l${f(-r * 0.4)},${f(-0.3)}l${f(-0.5)},0.5`, 0.4, '#E0A040'));
  s += `<circle cx="${f(cx + pdx)}" cy="${f(cy + pdy)}" r="${f(pr)}" fill="${OUT}"/>`;
  s += `<circle cx="${f(cx + pdx - pr * 0.4)}" cy="${f(cy + pdy - pr * 0.45)}" r="${f(Math.max(0.4, pr * 0.32))}" fill="#FFFFFF"/>`;
  if (lid > 0) s += d.clip(e, P(`M${f(cx - r - 1)},${f(cy - ry - 1)}H${f(cx + r + 1)}V${f(y0 - tilt)}L${f(cx - r - 1)},${f(y0 + tilt)}Z`, lidcol, 1.1));
  s += S(e, 1.2);
  return s;
}

/** Spiral (dazed) eye on a yellow sclera. */
export function spiralEye(cx: number, cy: number, r: number, col = SCLERA): string {
  let dd = `M${f(cx)},${f(cy)}`;
  const turns = 2.4;
  const n = 28;
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const a = t * turns * Math.PI * 2;
    const rr = t * (r - 0.6);
    dd += `L${f(cx + Math.cos(a) * rr)},${f(cy + Math.sin(a) * rr)}`;
  }
  return P(ell(cx, cy, r), col, 1.2) + S(dd, 0.85);
}

/** X eye (KO). */
export function xEye(cx: number, cy: number, r: number): string {
  return S(`M${f(cx - r)},${f(cy - r)}L${f(cx + r)},${f(cy + r)}M${f(cx + r)},${f(cy - r)}L${f(cx - r)},${f(cy + r)}`, 1.5);
}

/** Closed happy eye ^ */
export function happyEye(cx: number, cy: number, w: number, h = 2.2, sw = 1.5): string {
  return S(`M${f(cx - w)},${f(cy + h * 0.4)}Q${f(cx)},${f(cy - h * 1.4)} ${f(cx + w)},${f(cy + h * 0.4)}`, sw);
}

/** Closed sleepy eye: downward arc with lashes. */
export function sleepEye(cx: number, cy: number, w: number, lashes = true, sw = 1.3): string {
  let s = S(`M${f(cx - w)},${f(cy - 0.4)}Q${f(cx)},${f(cy + 2)} ${f(cx + w)},${f(cy - 0.4)}`, sw);
  if (lashes) s += S(`M${f(cx - w * 0.5)},${f(cy + 0.9)}l-0.5,1.1M${f(cx + w * 0.3)},${f(cy + 1)}l0.3,1.1`, 0.7);
  return s;
}

/** Sweat drop. */
export function sweat(x: number, y: number, s = 1, rot = 0): string {
  const dd = `M${f(x)},${f(y - 2.6 * s)}C${f(x + 0.6 * s)},${f(y - 1.4 * s)} ${f(x + 1.7 * s)},${f(y - 0.4 * s)} ${f(x + 1.7 * s)},${f(y + 0.7 * s)}` +
    `C${f(x + 1.7 * s)},${f(y + 1.8 * s)} ${f(x + 0.8 * s)},${f(y + 2.3 * s)} ${f(x)},${f(y + 2.3 * s)}` +
    `C${f(x - 0.8 * s)},${f(y + 2.3 * s)} ${f(x - 1.7 * s)},${f(y + 1.8 * s)} ${f(x - 1.7 * s)},${f(y + 0.7 * s)}` +
    `C${f(x - 1.7 * s)},${f(y - 0.4 * s)} ${f(x - 0.6 * s)},${f(y - 1.4 * s)} ${f(x)},${f(y - 2.6 * s)}Z`;
  const body = P(dd, SWEAT, 0.9) + hl(x - 0.6 * s, y + 0.4 * s, 0.4 * s, 0.7 * s, 0, 0.9);
  return rot ? G(body, `rotate(${f(rot)} ${f(x)} ${f(y)})`) : body;
}

/** Crumbs stuck around a mouth. */
export function crumbs(pts: Pt[], col = '#C98B55'): string {
  return pts.map(([x, y], i) => P(poly([[x - 0.7, y - 0.3], [x + 0.1, y - 0.8], [x + 0.8, y - 0.1], [x + 0.2, y + 0.7], [x - 0.6, y + 0.5]]), i % 2 ? darker(col) : col, 0.5)).join('');
}

/** Snot / goo bubble. */
export function bubble(x: number, y: number, r: number, col = '#BFF5A8'): string {
  return P(ell(x, y, r), col, 0.9, OUT, 'fill-opacity="0.75"') + hl(x - r * 0.35, y - r * 0.35, r * 0.28, r * 0.18, -35, 0.9) +
    `<circle cx="${f(x + r * 0.4)}" cy="${f(y + r * 0.35)}" r="${f(r * 0.1)}" fill="#FFFFFF" opacity="0.8"/>`;
}

/** Five-point star path. */
export function star(cx: number, cy: number, r: number, inner = 0.45, rot = -90): string {
  const pts: Pt[] = [];
  for (let i = 0; i < 10; i++) {
    const a = ((rot + i * 36) * Math.PI) / 180;
    const rr = i % 2 ? r * inner : r;
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  return poly(pts);
}

/** Bold label text. */
export function txt(x: number, y: number, size: number, str: string, fill: string, anchor: 'start' | 'middle' | 'end' = 'middle', extra = ''): string {
  return `<text x="${f(x)}" y="${f(y)}" font-size="${f(size)}" text-anchor="${anchor}" fill="${fill}" ${FONT}${extra ? ' ' + extra : ''}>${str}</text>`;
}

/** Small worm wriggling out of a hole. */
export function worm(x: number, y: number, s = 1, flip = 1): string {
  const k = s * flip;
  const hole = P(ell(x, y, 2 * s, 1.2 * s), '#3A2418', 0.9);
  const body = `M${f(x - 0.8 * k)},${f(y)}C${f(x - 1.2 * k)},${f(y - 3 * s)} ${f(x + 2.6 * k)},${f(y - 3.4 * s)} ${f(x + 2.6 * k)},${f(y - 5.6 * s)}` +
    `C${f(x + 2.6 * k)},${f(y - 7.2 * s)} ${f(x + 4.6 * k)},${f(y - 7.4 * s)} ${f(x + 4.8 * k)},${f(y - 6 * s)}` +
    `C${f(x + 5 * k)},${f(y - 4 * s)} ${f(x + 1 * k)},${f(y - 3 * s)} ${f(x + 0.9 * k)},${f(y)}Z`;
  return hole + P(body, '#F29AAE', 1) + S(`M${f(x + 0.2 * k)},${f(y - 1.6 * s)}l${f(1.1 * k)},${f(-0.3 * s)}M${f(x + 1.6 * k)},${f(y - 3.6 * s)}l${f(1 * k)},${f(0.2 * s)}`, 0.5, '#C9667E') +
    `<circle cx="${f(x + 4 * k)}" cy="${f(y - 6.2 * s)}" r="${f(0.42 * s)}" fill="${OUT}"/>`;
}

/** Plaid overlay lines inside a clip (lumberjack flannel). */
export function plaid(d: Doc, clipPath: string, x0: number, y0: number, x1: number, y1: number, dark: string, light: string, step = 4.4): string {
  let s = '';
  for (let x = x0; x <= x1; x += step) s += P(`M${f(x)},${f(y0)}h${f(step * 0.42)}V${f(y1)}h${f(-step * 0.42)}Z`, dark, 0, OUT, 'opacity="0.42"');
  for (let y = y0; y <= y1; y += step) s += P(`M${f(x0)},${f(y)}H${f(x1)}v${f(step * 0.42)}H${f(x0)}Z`, dark, 0, OUT, 'opacity="0.42"');
  for (let x = x0 + step * 0.72; x <= x1; x += step) s += S(`M${f(x)},${f(y0)}V${f(y1)}`, 0.35, light, 'opacity="0.7"');
  for (let y = y0 + step * 0.72; y <= y1; y += step) s += S(`M${f(x0)},${f(y)}H${f(x1)}`, 0.35, light, 'opacity="0.7"');
  return d.clip(clipPath, s);
}

/** Polka/flower dots inside a clip (grandma's dress). */
export function flowers(d: Doc, clipPath: string, pts: Pt[], col: string, mid: string): string {
  let s = '';
  for (const [x, y] of pts) {
    for (let i = 0; i < 5; i++) {
      const a = (i * 72 * Math.PI) / 180;
      s += `<circle cx="${f(x + Math.cos(a) * 0.9)}" cy="${f(y + Math.sin(a) * 0.9)}" r="0.6" fill="${col}"/>`;
    }
    s += `<circle cx="${f(x)}" cy="${f(y)}" r="0.45" fill="${mid}"/>`;
  }
  return d.clip(clipPath, s);
}

/** Zigzag path segment string from a to b (used for torn hems), starting with L. */
export function zz(a: Pt, b: Pt, teeth: number, depth: number): string {
  const out: string[] = [];
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L;
  const ny = dx / L;
  const steps = teeth * 2;
  for (let k = 0; k <= steps; k++) {
    const t = k / steps;
    const o = k % 2 === 1 ? depth : 0;
    out.push(`L${f(a[0] + dx * t + nx * o)},${f(a[1] + dy * t + ny * o)}`);
  }
  return out.join('');
}

export { OUT, OW, S, P, G, ell, f, hl, poly };
