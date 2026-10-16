/**
 * Small helpers shared by the raid props, the raid map and the UI icons (raidprops.ts, raidmap.ts, ui.ts).
 * Copied/adapted from props.ts (which is owned by another module) so the two can evolve independently.
 */
import type { ArtAsset } from './types';
import { Doc, OUT, P, PW, S, ell, f, poly } from './svg';
import type { Pt } from './svg';

export const HW = 24 * 2; // TILE_W / 2
export const HH = 24; // TILE_H / 2

/** Isometric point helper around an origin. i, j in tile units, z in world units (up). */
export class Iso {
  constructor(
    readonly cx: number,
    readonly cy: number,
    readonly hw = HW,
    readonly hh = HH,
  ) {}
  p(i: number, j: number, z = 0): Pt {
    return [this.cx + (i - j) * this.hw, this.cy + (i + j) * this.hh - z];
  }
  quad(i0: number, i1: number, j0: number, j1: number, z = 0): Pt[] {
    return [this.p(i0, j0, z), this.p(i1, j0, z), this.p(i1, j1, z), this.p(i0, j1, z)];
  }
  /** Box with visible top, +j face (screen lower-left) and +i face (screen lower-right). */
  box(i0: number, i1: number, j0: number, j1: number, z0: number, z1: number, top: string, left: string, right: string, sw = PW): string {
    const p = this.p.bind(this);
    return (
      P(poly([p(i0, j1, z0), p(i1, j1, z0), p(i1, j1, z1), p(i0, j1, z1)]), left, sw) +
      P(poly([p(i1, j0, z0), p(i1, j1, z0), p(i1, j1, z1), p(i1, j0, z1)]), right, sw) +
      P(poly(this.quad(i0, i1, j0, j1, z1)), top, sw)
    );
  }
  shadow(i0: number, i1: number, j0: number, j1: number, op = 0.18): string {
    return P(poly(this.quad(i0, i1, j0, j1, 0)), OUT, 0, OUT, `opacity="${op}"`);
  }
  line(a: [number, number, number], b: [number, number, number], sw: number, col = OUT): string {
    const pa = this.p(...a);
    const pb = this.p(...b);
    return S(`M${f(pa[0])},${f(pa[1])}L${f(pb[0])},${f(pb[1])}`, sw, col);
  }
  post(a: [number, number, number], b: [number, number, number], w: number, col: string): string {
    return this.line(a, b, w + PW * 1.6) + this.line(a, b, w, col);
  }
  /** Ellipse lying in the plane j = const (a wheel seen from the +j side): centre (i, j, z), radius r (tile units in i, world units in z). */
  wheelJ(i: number, j: number, z: number, ri: number, rz: number, n = 28): Pt[] {
    const out: Pt[] = [];
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2;
      out.push(this.p(i + Math.cos(a) * ri, j, z + Math.sin(a) * rz));
    }
    return out;
  }
}

/** Seeded pseudo random generator (deterministic art). */
export function rnd(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function asset(key: string, w: number, h: number, ox: number, oy: number, body: (d: Doc) => string): ArtAsset {
  const d = new Doc(key);
  return { key, svg: d.build(w, h, body(d)), w, h, ox, oy };
}

/** Union of circles with one outline and cel shading (canopies, clouds, smoke, bushes). */
export function blobs(d: Doc, circles: [number, number, number][], base: string, shadow: string, sw = PW, off: Pt = [-2, -2]): string {
  const all = circles.map(([x, y, r]) => ell(x, y, r)).join('');
  const cid = d.id('u');
  d.def(`<clipPath id="${cid}">${circles.map(([x, y, r]) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}"/>`).join('')}</clipPath>`);
  return (
    (sw > 0 ? P(all, OUT, sw * 2, OUT) : '') +
    P(all, shadow) +
    `<g clip-path="url(#${cid})"><path d="${all}" fill="${base}" transform="translate(${f(off[0])} ${f(off[1])})"/></g>`
  );
}

export const FONT = `font-family="'Arial Black', 'Arial Rounded MT Bold', Arial, Helvetica, sans-serif" font-weight="900"`;

/** Chunky outlined text. */
export function txt(
  x: number,
  y: number,
  s: string,
  size: number,
  fill: string,
  o: { stroke?: string; sw?: number; anchor?: 'start' | 'middle' | 'end'; ls?: number; extra?: string; italic?: boolean } = {},
): string {
  const st = o.sw ? ` stroke="${o.stroke ?? OUT}" stroke-width="${f(o.sw)}" paint-order="stroke" stroke-linejoin="round"` : '';
  const ls = o.ls ? ` letter-spacing="${f(o.ls)}"` : '';
  const it = o.italic ? ' font-style="italic"' : '';
  return `<text x="${f(x)}" y="${f(y)}" text-anchor="${o.anchor ?? 'middle'}" ${FONT} font-size="${f(size)}"${ls}${it}${st} fill="${fill}"${o.extra ? ' ' + o.extra : ''}>${s}</text>`;
}

/** Star polygon points. */
export function starPts(cx: number, cy: number, r1: number, r2: number, n = 5, rot = -Math.PI / 2): Pt[] {
  const pts: Pt[] = [];
  for (let k = 0; k < n * 2; k++) {
    const a = rot + (k / (n * 2)) * Math.PI * 2;
    const r = k % 2 ? r2 : r1;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return pts;
}

/** Jagged burst polygon (POW bubbles). */
export function burstPts(cx: number, cy: number, rx: number, ry: number, n: number, inner: number, seed = 1): Pt[] {
  const R = rnd(seed);
  const pts: Pt[] = [];
  for (let k = 0; k < n * 2; k++) {
    const a = -Math.PI / 2 + (k / (n * 2)) * Math.PI * 2;
    const r = k % 2 ? inner : 0.88 + R() * 0.12;
    pts.push([cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r]);
  }
  return pts;
}

/** Smooth closed path through points (Catmull-Rom → cubic Bézier). */
export function smoothClosed(pts: Pt[], t = 0.5): string {
  const n = pts.length;
  let d = `M${f(pts[0][0])},${f(pts[0][1])}`;
  for (let k = 0; k < n; k++) {
    const p0 = pts[(k - 1 + n) % n];
    const p1 = pts[k];
    const p2 = pts[(k + 1) % n];
    const p3 = pts[(k + 2) % n];
    const c1: Pt = [p1[0] + ((p2[0] - p0[0]) * t) / 3, p1[1] + ((p2[1] - p0[1]) * t) / 3];
    const c2: Pt = [p2[0] - ((p3[0] - p1[0]) * t) / 3, p2[1] - ((p3[1] - p1[1]) * t) / 3];
    d += `C${f(c1[0])},${f(c1[1])} ${f(c2[0])},${f(c2[1])} ${f(p2[0])},${f(p2[1])}`;
  }
  return d + 'Z';
}

/** Smooth open path through points. */
export function smoothOpen(pts: Pt[], t = 1): string {
  const n = pts.length;
  let d = `M${f(pts[0][0])},${f(pts[0][1])}`;
  for (let k = 0; k < n - 1; k++) {
    const p0 = pts[Math.max(0, k - 1)];
    const p1 = pts[k];
    const p2 = pts[k + 1];
    const p3 = pts[Math.min(n - 1, k + 2)];
    const c1: Pt = [p1[0] + ((p2[0] - p0[0]) * t) / 6, p1[1] + ((p2[1] - p0[1]) * t) / 6];
    const c2: Pt = [p2[0] - ((p3[0] - p1[0]) * t) / 6, p2[1] - ((p3[1] - p1[1]) * t) / 6];
    d += `C${f(c1[0])},${f(c1[1])} ${f(c2[0])},${f(c2[1])} ${f(p2[0])},${f(p2[1])}`;
  }
  return d;
}

/** Sample a smooth open Catmull-Rom curve (same parametrisation as smoothOpen) into a polyline. */
export function sampleOpen(pts: Pt[], per = 24): Pt[] {
  const out: Pt[] = [];
  const n = pts.length;
  for (let k = 0; k < n - 1; k++) {
    const p0 = pts[Math.max(0, k - 1)];
    const p1 = pts[k];
    const p2 = pts[k + 1];
    const p3 = pts[Math.min(n - 1, k + 2)];
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    for (let s = 0; s < per; s++) {
      const t = s / per;
      const u = 1 - t;
      out.push([
        u * u * u * p1[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p2[0],
        u * u * u * p1[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p2[1],
      ]);
    }
  }
  out.push(pts[n - 1]);
  return out;
}

/** Wobbly blob outline around (cx, cy) for organic map zones. */
export function wobble(cx: number, cy: number, rx: number, ry: number, n: number, amp: number, seed: number): Pt[] {
  const R = rnd(seed);
  const pts: Pt[] = [];
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2;
    const r = 1 + (R() - 0.5) * amp;
    pts.push([cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r]);
  }
  return pts;
}

/** Translate a fragment. */
export function at(x: number, y: number, inner: string, scale = 1): string {
  return `<g transform="translate(${f(x)} ${f(y)})${scale !== 1 ? ` scale(${f(scale)})` : ''}">${inner}</g>`;
}
