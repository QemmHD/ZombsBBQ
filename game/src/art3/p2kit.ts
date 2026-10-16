/**
 * Shared helpers for the P2 art modules (decor, wall items, money-makers, outdoor). Builds on kit.ts:
 * face frames (draw flat art onto an iso face with one affine matrix), boxes and cylinders with two-tone
 * cel shading, a hand-drawn stroke font (neon tubes, chalk, stencils — renders the same everywhere, no
 * system fonts), glows, bite masks, flies and other grime.
 */
import type { ArtAsset } from '../art/types';
import { Doc, ell, f, poly } from '../art/svg';
import type { Pt } from '../art/svg';
import { F, INK, Iso, L, LW, WALL_IMG_H, blob, dot, mirrored, objAsset, rnd } from './kit';

/** HH / HW: the iso slope. */
export const K = 0.625;

// ---------------------------------------------------------------- colour helpers
function hex(c: string): [number, number, number] {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
/** Linear mix of two #rrggbb colours. */
export function mix(a: string, b: string, t: number): string {
  const A = hex(a);
  const B = hex(b);
  const c = A.map((v, i) => Math.round(v + (B[i] - v) * t));
  return '#' + c.map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('').toUpperCase();
}
export const dk = (c: string, t = 0.25) => mix(c, '#000000', t);
export const lt = (c: string, t = 0.25) => mix(c, '#FFFFFF', t);

// ---------------------------------------------------------------- transforms / frames
export function mtx(a: number, b: number, c: number, d: number, e: number, g: number): string {
  return `matrix(${[a, b, c, d, e, g].map(f).join(' ')})`;
}
export function grp(inner: string, transform: string, extra = ''): string {
  return `<g transform="${transform}"${extra ? ' ' + extra : ''}>${inner}</g>`;
}
export function opq(inner: string, o: number): string {
  return `<g opacity="${f(o)}">${inner}</g>`;
}
/** Frame on a +j (sw-facing) face: origin p(i0, j, z); local x = screen px to the right along the face, y down (y = -height). */
export function swFace(t: Iso, i0: number, j: number, z: number): string {
  const [x, y] = t.p(i0, j, z);
  return mtx(1, K, 0, 1, x, y);
}
/** Frame on a +i (se-facing) face: origin p(i, j1, z) (its left edge); local x to the right, y down. */
export function seFace(t: Iso, i: number, j1: number, z: number): string {
  const [x, y] = t.p(i, j1, z);
  return mtx(1, -K, 0, 1, x, y);
}
/** Frame on a horizontal face: origin p(i0, j0, z); local x along +i, y along +j, 48 px per tile. */
export function topFace(t: Iso, i0: number, j0: number, z: number): string {
  const [x, y] = t.p(i0, j0, z);
  return mtx(1, K, -1, K, x, y);
}

/**
 * General planar frame: origin o = (i, j, z); local x moves by ux = (di, dj, dz) per unit, local y by uy.
 * E.g. a slanted screen: ux = (1/48, 0, 0) (1 px along i), uy = (0, dj, -dz) per px down the slant.
 */
export function fr(t: Iso, o: [number, number, number], ux: [number, number, number], uy: [number, number, number]): string {
  const [x, y] = t.p(o[0], o[1], o[2]);
  const sd = (v: [number, number, number]): [number, number] => [(v[0] - v[1]) * 48, (v[0] + v[1]) * 30 - v[2]];
  const a = sd(ux);
  const b = sd(uy);
  return mtx(a[0], a[1], b[0], b[1], x, y);
}

/** Text that must read correctly after the whole asset is mirrored: flip it about its own centre x. */
export function unflip(inner: string, mir: boolean, cx: number): string {
  return mir ? grp(inner, `translate(${f(2 * cx)} 0) scale(-1 1)`) : inner;
}

// ---------------------------------------------------------------- WALL frame (author on side 'l'; mirror for 'r')
export const WH = WALL_IMG_H;
/** Wall-l point: x px along the wall (0..48, screen left→right), z height, n px out from the wall toward the room. */
export function wp3(x: number, z: number, n = 0): Pt {
  return [1 + x + n, WH - K * x + K * n - z];
}
/** Flat frame on the wall plane pushed n px out: local (x, y) with y = -z. */
export function wallM(n = 0): string {
  return mtx(1, -K, 0, 1, 1 + n, WH + K * n);
}
export function wq(x0: number, x1: number, z0: number, z1: number, n = 0): string {
  return poly([wp3(x0, z0, n), wp3(x1, z0, n), wp3(x1, z1, n), wp3(x0, z1, n)]);
}
/**
 * A flat slab hung on the wall (frame, board, plaque): front face at depth n, visible left end and top.
 * Returns fills + outline and the front face path for clipping.
 */
export function slab(d: Doc, x0: number, x1: number, z0: number, z1: number, n: number, front: string, side: string, top: string, sw = LW, shadow = true): { s: string; face: string } {
  const face = wq(x0, x1, z0, z1, n);
  const left = poly([wp3(x0, z0, 0), wp3(x0, z0, n), wp3(x0, z1, n), wp3(x0, z1, 0)]);
  const tp = poly([wp3(x0, z1, 0), wp3(x1, z1, 0), wp3(x1, z1, n), wp3(x0, z1, n)]);
  let s = '';
  if (shadow) s += wallShadow(d, wq(x0, x1, z0, z1, 0), n);
  s += F(left, side, 0.8) + F(tp, top, 0.8) + F(face, front, 0);
  s += L(face, sw);
  return { s, face };
}
/** Soft shadow of a hung object on the wall (light from upper left → shadow falls right and down). */
export function wallShadow(d: Doc, shape: string, n: number): string {
  const k = Math.max(1.2, n * 0.6);
  return `<g filter="${d.blur(1.4)}" opacity="0.38" transform="translate(${f(k * 0.9)} ${f(k * 1.3)})">${F(shape, '#1A140C')}</g>`;
}

// ---------------------------------------------------------------- boxes and cylinders
export interface Box {
  fills: string;
  lines: string;
  left: string;
  right: string;
  top: string;
  sil: string;
}
/** Axis-aligned iso box. left = the +j (sw) face, right = the +i (se) face. */
export function box(t: Iso, i0: number, i1: number, j0: number, j1: number, z0: number, z1: number, top: string, left: string, right: string, sw = LW): Box {
  const lf = poly([t.p(i0, j1, z0), t.p(i1, j1, z0), t.p(i1, j1, z1), t.p(i0, j1, z1)]);
  const rf = poly([t.p(i1, j1, z0), t.p(i1, j0, z0), t.p(i1, j0, z1), t.p(i1, j1, z1)]);
  const tf = t.qd(i0, i1, j0, j1, z1);
  const sil = poly([t.p(i0, j1, z0), t.p(i1, j1, z0), t.p(i1, j0, z0), t.p(i1, j0, z1), t.p(i0, j0, z1), t.p(i0, j1, z1)]);
  const a = t.p(i1, j1, z0);
  const b = t.p(i1, j1, z1);
  const c = t.p(i0, j1, z1);
  const e = t.p(i1, j0, z1);
  const inner = `M${f(a[0])},${f(a[1])}L${f(b[0])},${f(b[1])}M${f(c[0])},${f(c[1])}L${f(b[0])},${f(b[1])}L${f(e[0])},${f(e[1])}`;
  return { fills: F(lf, left) + F(rf, right) + F(tf, top), lines: L(inner, 0.7) + L(sil, sw), left: lf, right: rf, top: tf, sil };
}
/** Box faces get a vertical grime gradient (darker toward the floor) + a lit top edge. */
export function boxShade(d: Doc, t: Iso, b: Box, i0: number, i1: number, j1: number, z0: number, z1: number, strength = 0.35): string {
  const [, yb] = t.p(i0, j1, z0);
  const [, yt] = t.p(i0, j1, z1);
  const g = d.linear(0, yt, 0, yb + 30, [[0, '#FFFFFF', 0.06], [0.6, '#000000', 0], [1, '#000000', strength]]);
  void i1;
  return F(b.left, g) + F(b.right, g);
}

/** Path of a vertical (optionally tapered) cylinder body seen in iso, ground centre (X, Y), radii in screen px. */
export function cylBody(X: number, Y: number, rb: number, rt: number, z0: number, z1: number): string {
  const yb = Y - z0;
  const yt = Y - z1;
  return `M${f(X - rt)},${f(yt)}L${f(X - rb)},${f(yb)}A${f(rb)},${f(rb * K)} 0 0 0 ${f(X + rb)},${f(yb)}L${f(X + rt)},${f(yt)}A${f(rt)},${f(rt * K)} 0 0 1 ${f(X - rt)},${f(yt)}Z`;
}
/** Flat ellipse (cylinder cap) at height z. */
export function cap(X: number, Y: number, r: number, z: number): string {
  return ell(X, Y - z, r, r * K);
}
/** Horizontal cel gradient: lit left, a soft-edged shadow band on the right. */
export function celH(d: Doc, x0: number, x1: number, base: string, shade: string, split = 0.58): string {
  return d.linear(x0, 0, x1, 0, [[0, lt(base, 0.12)], [0.18, base], [split - 0.04, base], [split + 0.06, shade], [1, dk(shade, 0.18)]]);
}
/** A finished vertical cylinder: body + cap, cel-shaded, outlined. */
export function cyl(d: Doc, X: number, Y: number, rb: number, rt: number, z0: number, z1: number, base: string, shade: string, capCol: string, sw = LW): { s: string; body: string; top: string } {
  const body = cylBody(X, Y, rb, rt, z0, z1);
  const top = cap(X, Y, rt, z1);
  const r = Math.max(rb, rt);
  const s = F(body, celH(d, X - r, X + r, base, shade)) + L(body, sw) + F(top, capCol, sw);
  return { s, body, top };
}

/**
 * Extrude a flat shape drawn in a +j face frame back along -j by th tiles: an ink silhouette pass, then the
 * side fill swept in sub-pixel steps (no staircase), then the front face fill (caller adds detail + outline).
 */
export function extrudeStack(t: Iso, shape: string, i0: number, jf: number, z: number, th: number, face: string, side: string): string {
  const steps = Math.max(4, Math.ceil((th * 48) / 0.6));
  let ink = '';
  let fill = '';
  for (let k = steps; k >= 0; k--) ink += grp(F(shape, INK, LW * 2), swFace(t, i0, jf - (th * k) / steps, z));
  for (let k = steps; k >= 1; k--) fill += grp(F(shape, k === steps ? dk(side, 0.12) : side), swFace(t, i0, jf - (th * k) / steps, z));
  return ink + fill + grp(F(shape, face), swFace(t, i0, jf, z));
}

/** Soft contact shadow on the floor. */
export function shadow(d: Doc, t: Iso, i: number, j: number, ri: number, rj = ri, o = 0.32): string {
  return `<g filter="${d.blur(1.6)}" opacity="${f(o)}">${F(t.ell(i, j, ri, rj), '#140F08')}</g>`;
}

/** Blurred duplicate behind the given strokes/shapes: neon, embers, toxic slime. */
export function glow(d: Doc, inner: string, std: number, o = 0.8): string {
  return `<g filter="${d.blur(std)}" opacity="${f(o)}">${inner}</g>`;
}

/** Neon tube along path p: wide blurred halo, coloured tube, hot pale core. */
export function neon(d: Doc, p: string, col: string, core: string, w = 1.6, on = true): string {
  if (!on) return L(p, w + 0.9, INK) + L(p, w, mix(col, '#55534A', 0.62)) + L(p, w * 0.35, mix(col, '#8A887E', 0.5), 'opacity="0.8"');
  return glow(d, L(p, w * 3.4, col), 2.2, 0.75) + L(p, w + 0.9, dk(col, 0.6)) + L(p, w, col) + L(p, w * 0.38, core);
}

/** Radial grime vignette / hot-spot fill for a shape. */
export function radialFill(d: Doc, cx: number, cy: number, r: number, inner: string, outer: string, oi = 1, oo = 1): string {
  return d.radial(cx, cy, r, [[0, inner, oi], [1, outer, oo]]);
}

// ---------------------------------------------------------------- textures
/** Light diagonal sheen streaks (metal, glass, enamel), clipped to a shape. */
export function sheen(d: Doc, clipD: string, x0: number, y0: number, w: number, h: number, n = 3, o = 0.25, seed = 1): string {
  const r = rnd(seed);
  let s = '';
  for (let k = 0; k < n; k++) {
    const x = x0 + (k + 0.3 + r() * 0.4) * (w / n);
    const ww = 1 + r() * 3;
    s += F(poly([[x, y0 - 2], [x + ww, y0 - 2], [x + ww - h * 0.45, y0 + h + 2], [x - h * 0.45, y0 + h + 2]]), '#FFFFFF', 0, `opacity="${f(o * (0.5 + r() * 0.5))}"`);
  }
  return d.clip(clipD, s);
}
/** Rust: orange-brown blooms with dark pits, clipped to a shape. */
export function rust(d: Doc, clipD: string, pts: [number, number, number][], seed: number): string {
  const r = rnd(seed);
  let s = '';
  pts.forEach(([x, y, rr], k) => {
    s += F(blob(x, y, rr * 1.3, rr, seed * 7 + k), '#8A4A22', 0, 'opacity="0.55"');
    s += F(blob(x + 0.5, y + 0.4, rr * 0.7, rr * 0.55, seed * 7 + k + 50), '#6A3214', 0, 'opacity="0.6"');
    for (let q = 0; q < 5; q++) s += dot(x + (r() - 0.5) * rr * 2.4, y + (r() - 0.5) * rr * 2, 0.3 + r() * 0.5, q % 2 ? '#4A2210' : '#B0682E', 0.8);
  });
  return d.clip(clipD, s);
}
/** Rust streak running down from (x, y). */
export function rustDrip(x: number, y: number, len: number, w = 1.6): string {
  return F(`M${f(x - w / 2)},${f(y)}Q${f(x - w / 3)},${f(y + len * 0.6)} ${f(x)},${f(y + len)}Q${f(x + w / 3)},${f(y + len * 0.6)} ${f(x + w / 2)},${f(y)}Z`, '#7A4020', 0, 'opacity="0.55"');
}
/** Random short scratches inside a box (clipped). */
export function scratches(d: Doc, clipD: string, box: [number, number, number, number], n: number, col: string, seed: number, o = 0.5): string {
  const r = rnd(seed);
  let s = '';
  for (let k = 0; k < n; k++) {
    const x = box[0] + r() * box[2];
    const y = box[1] + r() * box[3];
    const a = (r() - 0.5) * 1.4;
    const l = 2 + r() * 5;
    s += L(`M${f(x)},${f(y)}l${f(Math.cos(a) * l)},${f(Math.sin(a) * l)}`, 0.35, col, `opacity="${f(o)}"`);
  }
  return d.clip(clipD, s);
}
/** Wood grain lines inside a box (clipped). horizontal=true runs along x. */
export function grain(d: Doc, clipD: string, box: [number, number, number, number], n: number, seed: number, dark = '#4E321A', light = '#B08452', vertical = false): string {
  const r = rnd(seed);
  let s = '';
  for (let k = 0; k < n; k++) {
    const a = box[0] + r() * box[2];
    const b = box[1] + r() * box[3];
    const l = (vertical ? box[3] : box[2]) * (0.2 + r() * 0.35);
    const wob = (r() - 0.5) * 1.6;
    const p = vertical ? `M${f(a)},${f(b)}q${f(wob)},${f(l / 2)} 0,${f(l)}` : `M${f(a)},${f(b)}q${f(l / 2)},${f(wob)} ${f(l)},0`;
    s += L(p, 0.4, k % 3 ? dark : light, 'opacity="0.6"');
  }
  return d.clip(clipD, s);
}

/** A housefly: dark body, two pale wings, a couple of buzz ticks. */
export function fly(x: number, y: number, s = 1, buzz = true): string {
  let o = `<ellipse cx="${f(x - 0.9 * s)}" cy="${f(y - 0.9 * s)}" rx="${f(1.3 * s)}" ry="${f(0.7 * s)}" fill="#D8DDE0" opacity="0.7" transform="rotate(-30 ${f(x - 0.9 * s)} ${f(y - 0.9 * s)})"/>`;
  o += `<ellipse cx="${f(x + 0.9 * s)}" cy="${f(y - 0.9 * s)}" rx="${f(1.3 * s)}" ry="${f(0.7 * s)}" fill="#D8DDE0" opacity="0.7" transform="rotate(30 ${f(x + 0.9 * s)} ${f(y - 0.9 * s)})"/>`;
  o += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(0.9 * s)}" ry="${f(1.2 * s)}" fill="#1E1C18"/>`;
  if (buzz) o += L(`M${f(x - 3 * s)},${f(y - 2.6 * s)}l${f(-1.2 * s)},${f(-0.6 * s)}M${f(x + 3 * s)},${f(y - 2.4 * s)}l${f(1.2 * s)},${f(-0.8 * s)}`, 0.35, INK, 'opacity="0.6"');
  return o;
}

/** A bite: a mask that removes a scalloped chunk, plus the matching tooth-mark ink (returned separately). */
export function bite(d: Doc, cx: number, cy: number, r: number, ang: number, w: number, h: number): { mask: string; ink: (clipD: string) => string } {
  const id = d.id('m');
  const circles: [number, number, number][] = [];
  const n = 6;
  for (let k = 0; k < n; k++) {
    const a = ang - 1.15 + (k / (n - 1)) * 2.3;
    circles.push([cx + Math.cos(a) * r * 0.62, cy + Math.sin(a) * r * 0.62, r * 0.36]);
  }
  circles.push([cx + Math.cos(ang) * r * 0.25, cy + Math.sin(ang) * r * 0.25, r * 0.62]);
  const holes = circles.map(([x, y, rr]) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(rr)}" fill="#000"/>`).join('');
  // generous region: the mask may be used inside translated / rotated local frames
  void w;
  void h;
  d.def(`<mask id="${id}" maskUnits="userSpaceOnUse" x="-600" y="-600" width="1200" height="1200"><rect x="-600" y="-600" width="1200" height="1200" fill="#fff"/>${holes}</mask>`);
  const mask = `mask="url(#${id})"`;
  return {
    mask,
    ink: (clipD: string) => {
      const rings = circles.map(([x, y, rr]) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(rr)}" fill="none" stroke="${INK}" stroke-width="1.5"/>`).join('');
      return d.clip(clipD, `<g ${mask}>${rings}</g>`);
    },
  };
}
export function masked(inner: string, mask: string): string {
  return `<g ${mask}>${inner}</g>`;
}

/** Simple duct-tape strip between two points. */
export function tape(a: Pt, b: Pt, w = 3.2, col = '#9C9A90'): string {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l = Math.hypot(dx, dy) || 1;
  const nx = (-dy / l) * (w / 2);
  const ny = (dx / l) * (w / 2);
  const p = poly([
    [a[0] + nx, a[1] + ny],
    [b[0] + nx, b[1] + ny],
    [b[0] - nx * 0.6, b[1] - ny * 0.6],
    [b[0] - nx, b[1] - ny],
    [a[0] - nx, a[1] - ny],
    [a[0] - nx * 0.4, a[1] - ny * 0.4],
  ]);
  return F(p, col, 0.6) + L(`M${f(a[0] + nx * 0.3)},${f(a[1] + ny * 0.3)}L${f(b[0] + nx * 0.3)},${f(b[1] + ny * 0.3)}`, 0.4, '#C9C7BD', 'opacity="0.8"');
}

/** A severed finger (khaki skin, grimy nail, bloody stump) from base (x, y) pointing along angle a. */
export function finger(x: number, y: number, a: number, len = 7, w = 2.6, skin = '#B3B294', zombie = false): string {
  const ca = Math.cos(a);
  const sa = Math.sin(a);
  const nx = -sa * (w / 2);
  const ny = ca * (w / 2);
  const tx = x + ca * len;
  const ty = y + sa * len;
  const body = `M${f(x + nx)},${f(y + ny)}L${f(tx + nx * 0.9)},${f(ty + ny * 0.9)}Q${f(tx + ca * w * 0.8)},${f(ty + sa * w * 0.8)} ${f(tx - nx * 0.9)},${f(ty - ny * 0.9)}L${f(x - nx)},${f(y - ny)}Z`;
  const sk = zombie ? '#88BB44' : skin;
  let s = F(body, sk, 0.8);
  s += L(`M${f(x + ca * len * 0.5 + nx * 0.7)},${f(y + sa * len * 0.5 + ny * 0.7)}l${f(-nx * 0.9)},${f(-ny * 0.9)}`, 0.4, INK, 'opacity="0.6"'); // knuckle crease
  s += F(ell(tx - ca * 1.1, ty - sa * 1.1, w * 0.3, w * 0.3), zombie ? '#C9C48A' : '#D9D2B8', 0.4);
  s += F(ell(x, y, w * 0.48, w * 0.48), '#7A2A22', 0.5) + dot(x, y, w * 0.18, '#E8DCC0');
  return s;
}

/** An eyeball (bloodshot white, coloured iris) at (x, y), looking along (lx, ly). */
export function eyeball(x: number, y: number, r: number, iris = '#4F6A3A', lx = 0.3, ly = 0.1): string {
  let s = F(ell(x, y, r, r), '#E8E2CC', 0.6);
  s += L(`M${f(x - r * 0.9)},${f(y + r * 0.1)}q${f(r * 0.3)},${f(-r * 0.1)} ${f(r * 0.5)},${f(r * 0.05)}M${f(x + r * 0.2)},${f(y + r * 0.85)}q${f(0)},${f(-r * 0.3)} ${f(r * 0.3)},${f(-r * 0.45)}`, 0.3, '#9A2A22');
  s += dot(x + lx * r, y + ly * r, r * 0.45, iris) + dot(x + lx * r, y + ly * r, r * 0.2, '#16120C');
  s += dot(x - r * 0.35, y - r * 0.4, r * 0.18, '#FFFFFF', 0.9);
  return s;
}

// ---------------------------------------------------------------- stroke font (hand-made, 4 x 6 grid)
const GLYPHS: Record<string, string> = {
  A: '0,6 0,2 2,0 4,2 4,6|0,3.6 4,3.6',
  B: '0,3 3,3 4,4 4,5 3,6 0,6 0,0 2.8,0 3.8,0.8 3.8,2.2 3,3',
  C: '4,1 3,0 1,0 0,1 0,5 1,6 3,6 4,5',
  D: '0,0 0,6 2.4,6 4,4.4 4,1.6 2.4,0 0,0',
  E: '4,0 0,0 0,6 4,6|0,3 3,3',
  F: '4,0 0,0 0,6|0,3 3,3',
  G: '4,1 3,0 1,0 0,1 0,5 1,6 3,6 4,5 4,3.4 2.4,3.4',
  H: '0,0 0,6|4,0 4,6|0,3 4,3',
  I: '1,0 3,0|2,0 2,6|1,6 3,6',
  J: '1,0 4,0|3,0 3,5 2,6 1,6 0,5',
  K: '0,0 0,6|4,0 0,3.6|1.4,2.7 4,6',
  L: '0,0 0,6 4,6',
  M: '0,6 0,0 2,3 4,0 4,6',
  N: '0,6 0,0 4,6 4,0',
  O: '1,0 3,0 4,1 4,5 3,6 1,6 0,5 0,1 1,0',
  P: '0,6 0,0 3,0 4,1 4,2 3,3 0,3',
  Q: '1,0 3,0 4,1 4,5 3,6 1,6 0,5 0,1 1,0|2.4,4.4 4.2,6.4',
  R: '0,6 0,0 3,0 4,1 4,2 3,3 0,3|1.8,3 4,6',
  S: '4,1 3,0 1,0 0,1 0,2 1,3 3,3 4,4 4,5 3,6 1,6 0,5',
  T: '0,0 4,0|2,0 2,6',
  U: '0,0 0,5 1,6 3,6 4,5 4,0',
  V: '0,0 2,6 4,0',
  W: '0,0 1,6 2,2.6 3,6 4,0',
  X: '0,0 4,6|4,0 0,6',
  Y: '0,0 2,3 4,0|2,3 2,6',
  Z: '0,0 4,0 0,6 4,6',
  '0': '1,0 3,0 4,1 4,5 3,6 1,6 0,5 0,1 1,0|3.4,1.2 0.6,4.8',
  '1': '0.8,1.2 2,0 2,6|0.8,6 3.2,6',
  '2': '0,1 1,0 3,0 4,1 4,2 0,6 4,6',
  '3': '0,1 1,0 3,0 4,1 4,2 3,3 1.4,3|3,3 4,4 4,5 3,6 1,6 0,5',
  '4': '3,6 3,0 0,4.2 4,4.2',
  '5': '4,0 0,0 0,3 3,3 4,4 4,5 3,6 0,6',
  '6': '4,1 3,0 1,0 0,1 0,5 1,6 3,6 4,5 4,4 3,3 0,3',
  '7': '0,0 4,0 1.4,6',
  '8': '1,3 0,2 0,1 1,0 3,0 4,1 4,2 3,3 1,3 0,4 0,5 1,6 3,6 4,5 4,4 3,3',
  '9': '4,3 1,3 0,2 0,1 1,0 3,0 4,1 4,5 3,6 0,6',
  $: '4,1 3,0 1,0 0,1 0,2 1,3 3,3 4,4 4,5 3,6 1,6 0,5|2,-0.9 2,6.9',
  '!': '2,0 2,4.2|2,5.7 2,6',
  '?': '0,1 1,0 3,0 4,1 4,2 2,3.4 2,4.3|2,5.7 2,6',
  '.': '2,5.7 2,6',
  ',': '2,5.4 1.6,6.8',
  '-': '1,3 3,3',
  "'": '2,0 2,1.6',
  ':': '2,1.4 2,1.7|2,4.4 2,4.7',
  '/': '4,0 0,6',
  '+': '2,1.5 2,4.5|0.5,3 3.5,3',
  '#': '1.3,0.5 0.7,5.5|3.3,0.5 2.7,5.5|0,2 4,2|0,4 4,4',
  '*': '2,1 2,5|0.4,2 3.6,4|3.6,2 0.4,4',
};

export interface TextOpts {
  /** horizontal alignment about x */
  anchor?: 'start' | 'middle' | 'end';
  /** letter spacing as a fraction of the glyph width */
  gap?: number;
  /** wobble for chalk / handwriting (0 = clean) */
  jitter?: number;
  seed?: number;
  /** horizontal squash (1 = 4:6 glyphs) */
  wide?: number;
  /** italic slant (x shift per unit height up) */
  slant?: number;
}
/** Width of a string set at cap height h. */
export function textW(str: string, h: number, o: TextOpts = {}): number {
  const s = h / 6;
  const gw = 4 * s * (o.wide ?? 1);
  const gap = gw * (o.gap ?? 0.38);
  return str.length * gw + Math.max(0, str.length - 1) * gap;
}
/** Path data for str with its baseline at y, cap height h. Stroke it with L(). */
export function textD(str: string, x: number, y: number, h: number, o: TextOpts = {}): string {
  const s = h / 6;
  const wide = o.wide ?? 1;
  const gw = 4 * s * wide;
  const gap = gw * (o.gap ?? 0.38);
  const w = textW(str, h, o);
  let cx = o.anchor === 'middle' ? x - w / 2 : o.anchor === 'end' ? x - w : x;
  const r = rnd(o.seed ?? 3);
  const jit = o.jitter ?? 0;
  const sl = o.slant ?? 0;
  let d = '';
  for (const ch of str.toUpperCase()) {
    const g = GLYPHS[ch];
    if (g) {
      const dy = jit ? (r() - 0.5) * jit * h * 0.5 : 0;
      for (const stroke of g.split('|')) {
        const pts = stroke.split(' ').map((p) => p.split(',').map(Number));
        d +=
          'M' +
          pts
            .map(([gx, gy]) => {
              const yy = y - h + gy * s + dy + (jit ? (r() - 0.5) * jit * s : 0);
              const xx = cx + gx * s * wide + (jit ? (r() - 0.5) * jit * s : 0) + sl * (y - yy);
              return `${f(xx)},${f(yy)}`;
            })
            .join('L');
      }
    }
    cx += gw + gap;
  }
  return d;
}
/** Outlined lettering: ink casing under a coloured stroke. */
export function lettering(str: string, x: number, y: number, h: number, col: string, sw: number, o: TextOpts = {}, casing = 0.9, caseCol = INK): string {
  const d = textD(str, x, y, h, o);
  return (casing > 0 ? L(d, sw + casing * 2, caseCol) : '') + L(d, sw, col);
}

// ---------------------------------------------------------------- asset wrappers
/** Floor item facing sw that carries lettering: returns the sw key plus a `<key>_se` copy whose text still reads. */
export function objPair(key: string, h: number, body: (d: Doc, t: Iso, mir: boolean) => string): ArtAsset[] {
  const a = objAsset(key, h, (d, t) => body(d, t, false));
  const b = mirrored(objAsset(key + '_se', h, (d, t) => body(d, t, true)), key + '_se');
  return [a, b];
}

export { INK, LW };
