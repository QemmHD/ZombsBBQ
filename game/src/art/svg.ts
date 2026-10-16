/**
 * Tiny SVG authoring kit shared by the character and prop generators.
 * Everything is in world units (see types.ts). Shapes are built as path `d` strings and then
 * painted with flat cel shading: one base tone, one shadow tone (falls bottom-right) and an
 * optional small highlight, with a thick dark outline (#2B1B17, never pure black).
 */

export const OUT = '#2B1B17';
/** Main outline width for characters (world units; rasterized at 2-3x). */
export const OW = 2.4;
/** Outline for props / furniture. */
export const PW = 2.2;

export type Pt = [number, number];
export type Tone = [base: string, shadow: string];

/** Compact number formatting (2 decimals, no -0). */
export function f(v: number): string {
  const r = Math.round(v * 100) / 100;
  return Object.is(r, -0) || r === 0 ? '0' : String(r);
}

export function ell(cx: number, cy: number, rx: number, ry: number = rx): string {
  return (
    `M${f(cx - rx)},${f(cy)}a${f(rx)},${f(ry)} 0 1,0 ${f(2 * rx)},0` +
    `a${f(rx)},${f(ry)} 0 1,0 ${f(-2 * rx)},0Z`
  );
}

export function rrect(x: number, y: number, w: number, h: number, r: number): string {
  r = Math.min(r, w / 2, h / 2);
  return (
    `M${f(x + r)},${f(y)}H${f(x + w - r)}A${f(r)},${f(r)} 0 0 1 ${f(x + w)},${f(y + r)}` +
    `V${f(y + h - r)}A${f(r)},${f(r)} 0 0 1 ${f(x + w - r)},${f(y + h)}H${f(x + r)}` +
    `A${f(r)},${f(r)} 0 0 1 ${f(x)},${f(y + h - r)}V${f(y + r)}A${f(r)},${f(r)} 0 0 1 ${f(x + r)},${f(y)}Z`
  );
}

/** Closed polygon path. */
export function poly(pts: Pt[]): string {
  return 'M' + pts.map(([x, y]) => `${f(x)},${f(y)}`).join('L') + 'Z';
}

/** Open polyline path. */
export function pline(pts: Pt[]): string {
  return 'M' + pts.map(([x, y]) => `${f(x)},${f(y)}`).join('L');
}

/** Tapered limb with round ends from p1 (width w1) to p2 (width w2). */
export function capsule(p1: Pt, p2: Pt, w1: number, w2: number = w1): string {
  const [x1, y1] = p1;
  const [x2, y2] = p2;
  const L = Math.hypot(x2 - x1, y2 - y1) || 1;
  const ux = (x2 - x1) / L;
  const uy = (y2 - y1) / L;
  const nx = -uy;
  const ny = ux;
  const r1 = w1 / 2;
  const r2 = w2 / 2;
  const a: Pt = [x1 + nx * r1, y1 + ny * r1];
  const b: Pt = [x2 + nx * r2, y2 + ny * r2];
  const c: Pt = [x2 - nx * r2, y2 - ny * r2];
  const d: Pt = [x1 - nx * r1, y1 - ny * r1];
  return (
    `M${f(a[0])},${f(a[1])}L${f(b[0])},${f(b[1])}A${f(r2)},${f(r2)} 0 0 0 ${f(c[0])},${f(c[1])}` +
    `L${f(d[0])},${f(d[1])}A${f(r1)},${f(r1)} 0 0 0 ${f(a[0])},${f(a[1])}Z`
  );
}

/** Like capsule() but the p2 end is torn into a zigzag instead of rounded. */
export function tornCapsule(p1: Pt, p2: Pt, w1: number, w2: number = w1, teeth = 3, depth = 1.6): string {
  const [x1, y1] = p1;
  const [x2, y2] = p2;
  const L = Math.hypot(x2 - x1, y2 - y1) || 1;
  const ux = (x2 - x1) / L;
  const uy = (y2 - y1) / L;
  const nx = -uy;
  const ny = ux;
  const r1 = w1 / 2;
  const r2 = w2 / 2;
  const a: Pt = [x1 + nx * r1, y1 + ny * r1];
  const b: Pt = [x2 + nx * r2, y2 + ny * r2];
  const c: Pt = [x2 - nx * r2, y2 - ny * r2];
  const d: Pt = [x1 - nx * r1, y1 - ny * r1];
  const zig: Pt[] = [];
  const steps = teeth * 2;
  for (let k = 1; k < steps; k++) {
    const t = k / steps;
    const px = b[0] + (c[0] - b[0]) * t;
    const py = b[1] + (c[1] - b[1]) * t;
    const out = k % 2 === 1 ? depth : 0;
    zig.push([px + ux * out, py + uy * out]);
  }
  return (
    `M${f(a[0])},${f(a[1])}L${f(b[0])},${f(b[1])}` +
    zig.map(([x, y]) => `L${f(x)},${f(y)}`).join('') +
    `L${f(c[0])},${f(c[1])}L${f(d[0])},${f(d[1])}A${f(r1)},${f(r1)} 0 0 0 ${f(a[0])},${f(a[1])}Z`
  );
}

/** Chibi head: rounded with a slightly heavier jaw. */
export function headD(cx: number, cy: number, rx: number, ry: number, jaw = 1, k = 0.56): string {
  return (
    `M${f(cx - rx)},${f(cy)}` +
    `C${f(cx - rx)},${f(cy - k * ry)} ${f(cx - k * rx)},${f(cy - ry)} ${f(cx)},${f(cy - ry)}` +
    `C${f(cx + k * rx)},${f(cy - ry)} ${f(cx + rx)},${f(cy - k * ry)} ${f(cx + rx)},${f(cy)}` +
    `C${f(cx + rx)},${f(cy + k * ry * jaw)} ${f(cx + k * rx * jaw)},${f(cy + ry)} ${f(cx)},${f(cy + ry)}` +
    `C${f(cx - k * rx * jaw)},${f(cy + ry)} ${f(cx - rx)},${f(cy + k * ry * jaw)} ${f(cx - rx)},${f(cy)}Z`
  );
}

/** Plain painted path. sw>0 adds an outline. */
export function P(d: string, fill = 'none', sw = 0, stroke = OUT, extra = ''): string {
  let s = `<path d="${d}" fill="${fill}"`;
  if (sw > 0) s += ` stroke="${stroke}" stroke-width="${f(sw)}"`;
  return s + (extra ? ' ' + extra : '') + '/>';
}

/** Stroke-only path. */
export function S(d: string, sw: number, col = OUT, extra = ''): string {
  return `<path d="${d}" fill="none" stroke="${col}" stroke-width="${f(sw)}"${extra ? ' ' + extra : ''}/>`;
}

/** Soft white highlight blob. */
export function hl(cx: number, cy: number, rx: number, ry: number, rot = -30, op = 0.7, col = '#FFFFFF'): string {
  return (
    `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="${col}" opacity="${op}"` +
    ` transform="rotate(${f(rot)} ${f(cx)} ${f(cy)})"/>`
  );
}

export function G(inner: string, transform: string, extra = ''): string {
  return `<g transform="${transform}"${extra ? ' ' + extra : ''}>${inner}</g>`;
}

/** One SVG document under construction: owns its <defs> and unique ids. */
export class Doc {
  private defs: string[] = [];
  private n = 0;
  private readonly prefix: string;

  constructor(key: string) {
    this.prefix = key.replace(/[^a-zA-Z0-9]/g, '') + '-';
  }

  id(p = 'i'): string {
    this.n++;
    return `${this.prefix}${p}${this.n}`;
  }

  def(s: string): void {
    this.defs.push(s);
  }

  clipId(d: string): string {
    const id = this.id('c');
    this.defs.push(`<clipPath id="${id}"><path d="${d}"/></clipPath>`);
    return id;
  }

  /** Render `inner` clipped to shape d. */
  clip(d: string, inner: string): string {
    return `<g clip-path="url(#${this.clipId(d)})">${inner}</g>`;
  }

  /**
   * Flat cel shading: the whole shape in the shadow tone, the base tone shifted up-left and
   * clipped to the shape (leaving a shadow crescent bottom-right), then the outline on top.
   */
  shaded(d: string, base: string, shadow: string, sw: number = OW, off: Pt = [-1.2, -1.2]): string {
    const cid = this.clipId(d);
    return (
      `<path d="${d}" fill="${shadow}"/>` +
      `<g clip-path="url(#${cid})"><path d="${d}" fill="${base}" transform="translate(${f(off[0])} ${f(off[1])})"/></g>` +
      (sw > 0 ? `<path d="${d}" fill="none" stroke="${OUT}" stroke-width="${f(sw)}"/>` : '')
    );
  }

  tone(d: string, t: Tone, sw: number = OW, off: Pt = [-1.2, -1.2]): string {
    return this.shaded(d, t[0], t[1], sw, off);
  }

  /** Linear gradient helper; returns `url(#id)`. stops: [offset 0..1, color, opacity?] */
  linear(x1: number, y1: number, x2: number, y2: number, stops: [number, string, number?][]): string {
    const id = this.id('g');
    this.defs.push(
      `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}">` +
        stops
          .map(([o, c, a]) => `<stop offset="${f(o)}" stop-color="${c}"${a !== undefined ? ` stop-opacity="${f(a)}"` : ''}/>`)
          .join('') +
        `</linearGradient>`,
    );
    return `url(#${id})`;
  }

  radial(cx: number, cy: number, r: number, stops: [number, string, number?][]): string {
    const id = this.id('r');
    this.defs.push(
      `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}">` +
        stops
          .map(([o, c, a]) => `<stop offset="${f(o)}" stop-color="${c}"${a !== undefined ? ` stop-opacity="${f(a)}"` : ''}/>`)
          .join('') +
        `</radialGradient>`,
    );
    return `url(#${id})`;
  }

  /** Gaussian blur filter; returns `url(#id)`. */
  blur(std: number): string {
    const id = this.id('f');
    this.defs.push(
      `<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${f(std)}"/></filter>`,
    );
    return `url(#${id})`;
  }

  /**
   * Final SVG string. Content authored in a local coordinate system is shifted by (tx, ty)
   * so that it lands inside the 0..w, 0..h viewBox.
   */
  build(w: number, h: number, body: string, tx = 0, ty = 0): string {
    const defs = this.defs.length ? `<defs>${this.defs.join('')}</defs>` : '';
    const tr = tx || ty ? ` transform="translate(${f(tx)} ${f(ty)})"` : '';
    return (
      `<svg xmlns="http://www.w3.org/2000/svg" width="${f(w)}" height="${f(h)}" viewBox="0 0 ${f(w)} ${f(h)}">` +
      defs +
      `<g${tr} stroke-linejoin="round" stroke-linecap="round">${body}</g></svg>`
    );
  }
}

/** Zigzag points from a to b (used for torn hems). */
export function zigzag(a: Pt, b: Pt, teeth: number, depth: number): Pt[] {
  const out: Pt[] = [];
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L;
  const ny = dx / L;
  const steps = teeth * 2;
  for (let k = 0; k <= steps; k++) {
    const t = k / steps;
    const o = k % 2 === 1 ? depth : 0;
    out.push([a[0] + dx * t + nx * o, a[1] + dy * t + ny * o]);
  }
  return out;
}

/** Monotone-chain convex hull. */
export function hull(pts: Pt[]): Pt[] {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const cross = (o: Pt, a: Pt, b: Pt) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: Pt[] = [];
  for (const q of p) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop();
    lower.push(q);
  }
  const upper: Pt[] = [];
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop();
    upper.push(q);
  }
  upper.pop();
  lower.pop();
  return lower.concat(upper);
}
