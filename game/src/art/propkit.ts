/**
 * Prop authoring kit: iso helpers, wall frames and small drawing utilities shared by props.ts and the
 * prop*.ts modules (themes, furniture, decor, wall hangings, specials, dishes). Everything is in world
 * units (see types.ts). svg.ts stays the low-level kit; this file only builds on it.
 */
import type { ArtAsset } from './types';
import { TILE_H, TILE_W, WALL_H } from './types';
import { Doc, OUT, PW, P, S, ell, f, poly } from './svg';
import type { Pt, Tone } from './svg';

export const HW = TILE_W / 2; // 48
export const HH = TILE_H / 2; // 24
/** Outline margin around 1x1 floor objects. */
export const M = 4;
export const SQ2 = Math.SQRT2;

// ---- shared heights (world units above the floor); PROP_META in props.ts re-exports these
export const SEAT_Z = 15.5;
export const TABLE_Z = 26;
export const TABLE_DINER_Z = 27;
export const TABLE_BARREL_Z = 28;
export const TABLE_COFFIN_Z = 27;
export const COUNTER_Z = 34;
export const GRILL_Z = 26;
export const FRYER_Z = 27;

// ---- palette
export const WOOD = '#C98B55';
export const WOOD_M = '#A8693A';
export const WOOD_D = '#7A4524';
export const WOOD_DD = '#5C3A22';
export const CHROME: Tone = ['#D5DAE0', '#9AA2AC'];
export const CHROME_HI = '#F7F9FB';
export const CHROME_D = '#6E757E';
export const ZSKIN: Tone = ['#8DC63F', '#5E9A2A'];
export const ZSKIN_HI = '#B8E26B';
export const GOO = '#39E07A';
export const GOO_D = '#0F8F4A';
export const BONE: Tone = ['#F2EBD7', '#C9BC9A'];
export const GOLD: Tone = ['#FFC83D', '#D9971A'];
export const RED: Tone = ['#E2343B', '#B3263A'];

export const FONT = 'font-family="Arial, Helvetica, sans-serif" font-weight="bold"';
export const FONT_SERIF = 'font-family="Georgia, \'Times New Roman\', serif" font-weight="bold"';
export const FONT_CHALK = 'font-family="\'Comic Sans MS\', \'Chalkboard SE\', \'Marker Felt\', Arial, sans-serif" font-weight="bold"';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Centered bold text. */
export function T(x: number, y: number, size: number, fill: string, str: string, extra = '', font = FONT, anchor = 'middle'): string {
  return `<text x="${f(x)}" y="${f(y)}" text-anchor="${anchor}" ${font} font-size="${f(size)}" fill="${fill}"${extra ? ' ' + extra : ''}>${esc(str)}</text>`;
}

/** Text with a dark outline behind it (paint-order stroke). */
export function TO(x: number, y: number, size: number, fill: string, str: string, sw = 1.2, stroke = OUT, font = FONT): string {
  return T(x, y, size, fill, str, `stroke="${stroke}" stroke-width="${f(sw)}" paint-order="stroke" stroke-linejoin="round"`, font);
}

export function circle(x: number, y: number, r: number, fill: string, extra = ''): string {
  return `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${fill}"${extra ? ' ' + extra : ''}/>`;
}

export function op(inner: string, o: number): string {
  return `<g opacity="${f(o)}">${inner}</g>`;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpPt(a: Pt, b: Pt, t: number): Pt {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
}

export function rnd(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** A tiny rivet / nail head. */
export function rivet(x: number, y: number, r = 0.9, col = '#5A5454', hi = '#B9C0C8'): string {
  return circle(x, y, r, col) + circle(x - r * 0.35, y - r * 0.35, r * 0.4, hi);
}

/** Cartoon fly: two wings + body (a gag sticker for greasy things). */
export function fly(x: number, y: number, s = 1): string {
  return (
    `<g transform="translate(${f(x)} ${f(y)}) scale(${f(s)})">` +
    P(ell(-1.4, -1.6, 1.6, 1), '#FFFFFF', 0.5, OUT, 'opacity="0.85" transform="rotate(-30 -1.4 -1.6)"') +
    P(ell(1.4, -1.6, 1.6, 1), '#FFFFFF', 0.5, OUT, 'opacity="0.85" transform="rotate(30 1.4 -1.6)"') +
    P(ell(0, 0, 1.3, 1.6), '#2B2B33', 0.5) +
    circle(-0.5, -0.9, 0.45, '#D7262E') +
    circle(0.5, -0.9, 0.45, '#D7262E') +
    S('M-2.6,2.6l-1,0.6M2.6,2.6l1,0.6M-3,-3.4q-1,-1 -0.2,-2M3,-3.4q1,-1 0.2,-2', 0.4, OUT, 'opacity="0.6"') +
    `</g>`
  );
}

/** Union of circles with one outline and cel shading (canopies, clouds, smoke, hay). */
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

// ------------------------------------------------------------------ iso helpers
export type V3 = [number, number, number];

export class Iso {
  constructor(
    readonly cx: number,
    readonly cy: number,
  ) {}
  /** i, j in tile units relative to the tile center; z in world units (up). */
  p(i: number, j: number, z = 0): Pt {
    return [this.cx + (i - j) * HW, this.cy + (i + j) * HH - z];
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
  /** +j face quad (screen lower-left) of a box, for decorating. */
  faceJ(i0: number, i1: number, j: number, z0: number, z1: number): Pt[] {
    return [this.p(i0, j, z0), this.p(i1, j, z0), this.p(i1, j, z1), this.p(i0, j, z1)];
  }
  /** +i face quad (screen lower-right) of a box. */
  faceI(i: number, j0: number, j1: number, z0: number, z1: number): Pt[] {
    return [this.p(i, j0, z0), this.p(i, j1, z0), this.p(i, j1, z1), this.p(i, j0, z1)];
  }
  /** Diamond floor shadow. */
  shadow(i0: number, i1: number, j0: number, j1: number, opac = 0.18): string {
    return P(poly(this.quad(i0, i1, j0, j1, 0)), OUT, 0, OUT, `opacity="${opac}"`);
  }
  /** Round floor shadow of radius r tiles. */
  rshadow(r: number, opac = 0.18, i = 0, j = 0): string {
    return P(this.circ(i, j, 0, r), OUT, 0, OUT, `opacity="${opac}"`);
  }
  line(a: V3, b: V3, sw: number, col = OUT, extra = ''): string {
    const pa = this.p(...a);
    const pb = this.p(...b);
    return S(`M${f(pa[0])},${f(pa[1])}L${f(pb[0])},${f(pb[1])}`, sw, col, extra);
  }
  /** A post drawn as an outlined thick line. */
  post(a: V3, b: V3, w: number, col: string): string {
    return this.line(a, b, w + PW * 1.6) + this.line(a, b, w, col);
  }
  /** Post with a lit edge (cheap roundness). */
  post2(a: V3, b: V3, w: number, col: string, hi: string): string {
    const pa = this.p(...a);
    const pb = this.p(...b);
    const o = w * 0.22;
    return this.post(a, b, w, col) + S(`M${f(pa[0] - o)},${f(pa[1])}L${f(pb[0] - o)},${f(pb[1])}`, w * 0.3, hi);
  }
  rx(r: number): number {
    return r * HW * SQ2;
  }
  ry(r: number): number {
    return r * HH * SQ2;
  }
  /** Iso circle (screen ellipse) of radius r tiles at (i, j, z). */
  circ(i: number, j: number, z: number, r: number): string {
    const [x, y] = this.p(i, j, z);
    return ell(x, y, this.rx(r), this.ry(r));
  }
  /** Side silhouette of a vertical cylinder (includes the top ellipse's far half). bulge in px. */
  cylBody(i: number, j: number, r: number, z0: number, z1: number, bulge = 0): string {
    const [x, y0] = this.p(i, j, z0);
    const y1 = y0 - (z1 - z0);
    const rx = this.rx(r);
    const ry = this.ry(r);
    const ym = (y0 + y1) / 2;
    return (
      `M${f(x - rx)},${f(y1)}Q${f(x - rx - bulge * 2)},${f(ym)} ${f(x - rx)},${f(y0)}` +
      `A${f(rx)},${f(ry)} 0 0 0 ${f(x + rx)},${f(y0)}` +
      `Q${f(x + rx + bulge * 2)},${f(ym)} ${f(x + rx)},${f(y1)}` +
      `A${f(rx)},${f(ry)} 0 0 0 ${f(x - rx)},${f(y1)}Z`
    );
  }
  /** Vertical cylinder: cel-shaded side + flat top (top=null skips it). */
  cyl(d: Doc, i: number, j: number, r: number, z0: number, z1: number, side: Tone, top: string | null, sw = PW, bulge = 0): string {
    let s = d.shaded(this.cylBody(i, j, r, z0, z1, bulge), side[0], side[1], sw, [-this.rx(r) * 0.28, 0]);
    if (top) s += P(this.circ(i, j, z1, r), top, sw);
    return s;
  }
  /** Horizontal band around a cylinder at height z (front half only), e.g. barrel hoops. */
  band(i: number, j: number, r: number, z: number, sw: number, col: string, extra = ''): string {
    const [x, y] = this.p(i, j, z);
    const rx = this.rx(r);
    const ry = this.ry(r);
    return S(`M${f(x - rx)},${f(y)}A${f(rx)},${f(ry)} 0 0 0 ${f(x + rx)},${f(y)}`, sw, col, extra);
  }
  /**
   * Extruded convex polygon (pts in (i, j)) from z0 to z1: draws the camera-facing side walls (far ones first)
   * then the top. Side colors: faces turned mostly toward +j use `left`, toward +i use `right`.
   */
  prism(pts: [number, number][], z0: number, z1: number, top: string, left: string, right: string, sw = PW): string {
    const n = pts.length;
    const ci = pts.reduce((a, q) => a + q[0], 0) / n;
    const cj = pts.reduce((a, q) => a + q[1], 0) / n;
    const faces: { depth: number; s: string }[] = [];
    for (let k = 0; k < n; k++) {
      const a = pts[k];
      const b = pts[(k + 1) % n];
      let ni = b[1] - a[1];
      let nj = -(b[0] - a[0]);
      const mi = (a[0] + b[0]) / 2 - ci;
      const mj = (a[1] + b[1]) / 2 - cj;
      if (ni * mi + nj * mj < 0) {
        ni = -ni;
        nj = -nj;
      }
      if (ni + nj <= 0.0001) continue;
      const col = ni >= nj ? right : left;
      faces.push({
        depth: a[0] + a[1] + b[0] + b[1],
        s: P(poly([this.p(a[0], a[1], z0), this.p(b[0], b[1], z0), this.p(b[0], b[1], z1), this.p(a[0], a[1], z1)]), col, sw),
      });
    }
    faces.sort((x, y) => x.depth - y.depth);
    return faces.map((q) => q.s).join('') + P(poly(pts.map(([i, j]) => this.p(i, j, z1))), top, sw);
  }
  /** Polygon on a horizontal plane z. */
  flat(pts: [number, number][], z: number): string {
    return poly(pts.map(([i, j]) => this.p(i, j, z)));
  }
}

/** Points of a vertical quad on a face, parametrised (s along 0..1, z). Useful to decorate faces. */
export function faceMap(a: Pt, b: Pt, z0: number) {
  return (s: number, z: number): Pt => [lerp(a[0], b[0], s), lerp(a[1], b[1], s) - (z - z0)];
}

/** 1x1 floor object: `above` = how far the art reaches above the tile center. */
export function floorProp(key: string, above: number, body: (d: Doc, iso: Iso) => string, w = TILE_W + 2 * M): ArtAsset {
  const h = Math.ceil(above + HH + M);
  const d = new Doc(key);
  const iso = new Iso(w / 2, above);
  const svg = d.build(w, h, body(d, iso));
  return { key, svg, w, h, ox: 0.5, oy: above / h };
}

export function asset(key: string, w: number, h: number, ox: number, oy: number, body: (d: Doc) => string): ArtAsset {
  const d = new Doc(key);
  return { key, svg: d.build(w, h, body(d)), w, h, ox, oy };
}

// ------------------------------------------------------------------ floor tiles
export const DIAMOND = `M${HW},0L${TILE_W},${HH}L${HW},${TILE_H}L0,${HH}Z`;

export function tile(key: string, body: (d: Doc, t: Iso) => string): ArtAsset {
  const d = new Doc(key);
  const t = new Iso(HW, HH);
  return { key, svg: d.build(TILE_W, TILE_H, d.clip(DIAMOND, body(d, t))), w: TILE_W, h: TILE_H, ox: 0.5, oy: 0.5 };
}

export function speckles(t: Iso, seed: number, n: number, cols: string[], r = 0.8): string {
  const R = rnd(seed);
  let s = '';
  for (let k = 0; k < n; k++) {
    const [x, y] = t.p(R() - 0.5, R() - 0.5);
    s += circle(x, y, r * (0.6 + R() * 0.8), cols[k % cols.length]);
  }
  return s;
}

// ------------------------------------------------------------------ walls
export type Side = 'l' | 'r';
export const WALL_W = HW;
export const WALL_IMG_H = WALL_H + HH;

/**
 * A wall-plane frame. Local coords: u across the segment (0..48, screen left → right), v down the wall
 * (0 = top of the wall, WALL_H = floor), n = distance out of the wall toward the room (screen units).
 *   wall_l: x = u + n, y = v + 24 - u/2 + n/2     (the room is down-right of the wall)
 *   wall_r: x = u - n, y = v + u/2 + n/2          (the room is down-left of the wall)
 */
export class WallF {
  constructor(readonly side: Side) {}
  p(u: number, v: number, n = 0): Pt {
    return this.side === 'l' ? [u + n, v + HH - u / 2 + n / 2] : [u - n, v + u / 2 + n / 2];
  }
  /** SVG transform mapping local (u, v) on the plane n onto the image. */
  m(n = 0): string {
    return this.side === 'l' ? `matrix(1 -0.5 0 1 ${f(n)} ${f(HH + n / 2)})` : `matrix(1 0.5 0 1 ${f(-n)} ${f(n / 2)})`;
  }
  /** Draw `inner` (authored in local u, v) flat on the wall at depth n. */
  flat(inner: string, n = 0): string {
    return `<g transform="${this.m(n)}">${inner}</g>`;
  }
  /** Path through local points. */
  path(pts: [number, number, number?][], close = true): string {
    return (
      'M' +
      pts
        .map(([u, v, n]) => {
          const [x, y] = this.p(u, v, n ?? 0);
          return `${f(x)},${f(y)}`;
        })
        .join('L') +
      (close ? 'Z' : '')
    );
  }
  /** A box sticking out of the wall: draws the visible end, top and front faces. */
  box(u0: number, u1: number, v0: number, v1: number, n0: number, n1: number, front: string, top: string, end: string, sw = PW): string {
    const ue = this.side === 'l' ? u0 : u1;
    return (
      P(this.path([[ue, v0, n0], [ue, v0, n1], [ue, v1, n1], [ue, v1, n0]]), end, sw) +
      P(this.path([[u0, v0, n0], [u1, v0, n0], [u1, v0, n1], [u0, v0, n1]]), top, sw) +
      P(this.path([[u0, v0, n1], [u1, v0, n1], [u1, v1, n1], [u0, v1, n1]]), front, sw)
    );
  }
  /** Soft drop shadow of a hanging on the wall (offset down a little). */
  shadow(inner: string, o = 0.22): string {
    return `<g transform="${this.m(0)}"><g transform="translate(1.6 2.6)" opacity="${f(o)}">${inner}</g></g>`;
  }
}

/** Any 48x144 wall-aligned asset (wall segments and wall hangings), anchor (0.5, 1). */
export function wallAsset(key: string, side: Side, body: (d: Doc, W: WallF) => string): ArtAsset {
  const d = new Doc(key);
  const W = new WallF(side);
  return { key, svg: d.build(WALL_W, WALL_IMG_H, body(d, W)), w: WALL_W, h: WALL_IMG_H, ox: 0.5, oy: 1 };
}

/** Rectangle path in local wall coords. */
export function R(u: number, v: number, w: number, h: number): string {
  return `M${f(u)},${f(v)}H${f(u + w)}V${f(v + h)}H${f(u)}Z`;
}

// ------------------------------------------------------------------ dishes
export const DW = 32;
export const DH = 24;
export const PX = 16;
export const PY = 15;

/** 32x24 plate, anchor at the plate center (0.5, 0.625); `food` draws on top. */
export function dish(key: string, food: (d: Doc) => string): ArtAsset {
  return asset(key, DW, DH, PX / DW, PY / DH, (d) => {
    let s = P(ell(PX + 0.6, PY + 1.6, 13, 5.6), OUT, 0, OUT, 'opacity="0.18"');
    s += P(ell(PX, PY, 13.4, 6), '#FFFFFF', 1.3);
    s += P(ell(PX, PY + 0.4, 9.6, 4), '#F1ECE2') + S(ell(PX, PY + 0.4, 9.6, 4), 0.6, '#D9D2C4');
    return s + food(d);
  });
}

/**
 * Affine transform mapping a local w x h box onto the parallelogram p0 (local 0,0), px (local w,0),
 * py (local 0,h). Lets flat art (screens, labels, text) be painted onto any iso face.
 */
export function affine(p0: Pt, px: Pt, py: Pt, w: number, h: number): string {
  const a = (px[0] - p0[0]) / w;
  const b = (px[1] - p0[1]) / w;
  const c = (py[0] - p0[0]) / h;
  const d = (py[1] - p0[1]) / h;
  return `matrix(${f(a)} ${f(b)} ${f(c)} ${f(d)} ${f(p0[0])} ${f(p0[1])})`;
}

/** Paint `inner` (authored in a local w x h box, y down) onto the iso face whose top-left is p0. */
export function onFace(p0: Pt, px: Pt, py: Pt, w: number, h: number, inner: string): string {
  return `<g transform="${affine(p0, px, py, w, h)}">${inner}</g>`;
}

/**
 * The +i face (screen lower-right, the "front" of machines) of a box at i, spanning j0..j1 and z0..z1, as a
 * local w x h painting box: local x runs left→right on screen (j1 → j0), local y runs top→bottom (z1 → z0).
 */
export function frontI(t: Iso, i: number, j0: number, j1: number, z0: number, z1: number, inner: (w: number, h: number) => string, w = Math.abs(j1 - j0) * HW, h = z1 - z0): string {
  return onFace(t.p(i, j1, z1), t.p(i, j0, z1), t.p(i, j1, z0), w, h, inner(w, h));
}

/** The +j face (screen lower-left) of a box at j, spanning i0..i1 and z0..z1 (local x runs i0 → i1). */
export function frontJ(t: Iso, j: number, i0: number, i1: number, z0: number, z1: number, inner: (w: number, h: number) => string, w = Math.abs(i1 - i0) * HW, h = z1 - z0): string {
  return onFace(t.p(i0, j, z1), t.p(i1, j, z1), t.p(i0, j, z0), w, h, inner(w, h));
}
