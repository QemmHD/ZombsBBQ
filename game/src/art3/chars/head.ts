/**
 * Heads: skull shapes (3/4 front facing screen-right, and back 3/4), ears, eyes, brows, noses,
 * mouths, wrinkles, stubble, every expression, and zombie skin (mottling, sores, stitches,
 * yellow pupil-less eyes). All in the standard head frame (neck pivot (0.5, -54)).
 */
import type { Ctx, Expr, HeadShape, NoseKind, MouthKind, ZMouthKind } from './rig';
import {
  INK, LW, LI, LF, f, ellD, fill, line, outl, circ, op, inside, shade, speck, hatch, grime, fold, stain, stitch, drip,
  toothP, sweatDrop, smooth, fly, blob, rnd, mix, dk, lt, spot, fadeV,
  SCLERA, ZEYE, ZEYE_D, TEETH, TEETH_D, GUM, MOUTH, TONGUE, BLOOD, SLIME, SLIME_L,
} from './paint';
import type { Tone, Pt } from './paint';

// ---------------------------------------------------------------- skull geometry
interface Geo {
  top: number;
  back: number;
  fore: number;
  cheek: number;
  jawX: number;
  jawY: number;
  chinX: number;
  chinY: number;
}

const GEO: Record<HeadShape, Geo> = {
  std: { top: -97, back: -19, fore: 19.4, cheek: 21.3, jawX: 19.4, jawY: -61.5, chinX: 10.6, chinY: -53.6 },
  square: { top: -96.5, back: -19, fore: 19.8, cheek: 22.4, jawX: 22.4, jawY: -58.8, chinX: 13.4, chinY: -52 },
  long: { top: -100, back: -17.6, fore: 19, cheek: 20.2, jawX: 18, jawY: -59.6, chinX: 11.4, chinY: -50.4 },
  round: { top: -96.5, back: -20.6, fore: 20.4, cheek: 23.4, jawX: 22.4, jawY: -60.4, chinX: 10, chinY: -53 },
  egg: { top: -101, back: -20.4, fore: 20.2, cheek: 20.4, jawX: 17.6, jawY: -61.6, chinX: 10.6, chinY: -54.6 },
  heart: { top: -97, back: -18.6, fore: 19.4, cheek: 20.8, jawX: 17.8, jawY: -62, chinX: 11.6, chinY: -53.8 },
  jowl: { top: -96.5, back: -19.6, fore: 19.8, cheek: 22.4, jawX: 22.6, jawY: -58.8, chinX: 10.4, chinY: -51.6 },
  small: { top: -95.5, back: -18.4, fore: 19, cheek: 20.8, jawX: 18.8, jawY: -61.8, chinX: 10.4, chinY: -54 },
};

/** Jaw drop for open-mouth expressions. */
export function jawDrop(e: Expr): number {
  return e === 'scream' ? 4.6 : e === 'chomp' ? 5.2 : e === 'shock' ? 2.6 : e === 'dazed' ? 1.6 : e === 'sleep' ? 1.2 : 0;
}

export function geo(shape: HeadShape, e: Expr = undefined): Geo {
  const g = { ...GEO[shape] };
  const j = jawDrop(e);
  g.chinY += j;
  g.jawY += j * 0.6;
  return g;
}

export function skullD(g: Geo, eat = false): string {
  const n0y = g.chinY - 4.1 - (g.chinY - GEO.std.chinY) * 0.7;
  const fo = g.fore;
  const cheek = eat ? g.cheek + 2.2 : g.cheek;
  const jawX = eat ? g.jawX + 1.6 : g.jawX;
  return (
    `M-8,${f(n0y)}` +
    `C-13.5,${f(n0y - 2.5)} ${f(g.back)},-66 ${f(g.back)},-76` +
    `C${f(g.back)},-88 -9,${f(g.top)} 1.5,${f(g.top)}` +
    `C11,${f(g.top)} ${f(fo - 1.5)},-92 ${f(fo)},-85` +
    `C${f(fo + 0.9)},-83 ${f(fo + 1.6)},-81.6 ${f(fo + 1.5)},-79.5` +
    `C${f(fo + 1.2)},-78 ${f(fo + 0.7)},-77.4 ${f(fo + 0.8)},-76` +
    `C${f(fo + 0.9)},-74.4 ${f(cheek)},-72.6 ${f(cheek)},-70.5` +
    `C${f(cheek + (eat ? 1 : 0))},-67 ${f(jawX + 0.4)},${f(g.jawY - 2.5)} ${f(jawX)},${f(g.jawY)}` +
    `C${f(jawX - 1.6)},${f(g.jawY + 4.2)} ${f(g.chinX + 4)},${f(g.chinY)} ${f(g.chinX)},${f(g.chinY)}` +
    `C${f(g.chinX - 3.5)},${f(g.chinY)} ${f(g.chinX - 6.5)},${f(g.chinY - 0.8)} 1,${f(g.chinY - 1.6)}` +
    `C-2,${f(g.chinY - 2.2)} -5,${f(n0y + 0.9)} -8,${f(n0y)}Z`
  );
}

/** Back 3/4 skull: smooth face side on the right. */
export function skullBackD(g: Geo): string {
  const n0y = g.chinY - 4.1;
  return (
    `M-6,${f(n0y + 1)}` +
    `C-12,${f(n0y - 1)} ${f(g.back - 0.4)},-65 ${f(g.back - 0.4)},-76` +
    `C${f(g.back - 0.4)},-88 -9,${f(g.top)} 1,${f(g.top)}` +
    `C11.5,${f(g.top)} ${f(g.fore + 0.4)},-90 ${f(g.fore + 0.6)},-80` +
    `C${f(g.fore + 0.8)},-74 ${f(g.cheek - 0.4)},-70 ${f(g.jawX - 0.6)},${f(g.jawY)}` +
    `C${f(g.jawX - 2.4)},${f(g.jawY + 4)} ${f(g.chinX + 1)},${f(g.chinY + 0.4)} ${f(g.chinX - 3)},${f(g.chinY)}` +
    `C${f(g.chinX - 8)},${f(g.chinY - 0.4)} -1,${f(n0y + 2)} -6,${f(n0y + 1)}Z`
  );
}

// ---------------------------------------------------------------- skin
function skinTexture(c: Ctx, box: [number, number, number, number], n: number): string {
  const { sk, seed, z } = c;
  let s = speck(box, n, [sk.d, lt(sk.b, 0.3), sk.s], seed + 5, 0.2, 0.5, z ? 0.3 : 0.22);
  if (z) {
    s += fill(`M${box[0]},${box[1]}H${box[2]}V${box[3]}H${box[0]}Z`, '#5E5A30', 'opacity="0.14"');
    s += grime(box, 9, sk.s, seed + 9, 3.4, 0.4);
    s += grime(box, 4, '#6A6A2E', seed + 29, 2.6, 0.3);
    s += grime(box, 3, lt(sk.b, 0.2), seed + 19, 2.4, 0.25);
  }
  return s;
}

/** Zombie skin: veins, a sore, a bruise, a stitched gash. Front view. */
function zombieSkin(c: Ctx, g: Geo): string {
  const { sk, seed } = c;
  const r = rnd(seed + 77);
  let s = '';
  // dark sunken mottling around the temple and jaw
  s += fill(ellD(-3, -66, 7, 5), sk.d, 'opacity="0.12"');
  // veins on the temple
  s += line(`M-12,-82q2,2 1.2,4.4q-0.6,1.8 0.8,3.6M-11.2,-78.2l-2,1.4`, 0.4, sk.d, 'opacity="0.6"');
  // a sore on the cheek
  const sx = 16.5 + r() * 2;
  const sy = -66 + r() * 2;
  s += fill(ellD(sx, sy, 2.1, 1.6), '#7A5A2E', 'opacity="0.75"') + fill(ellD(sx + 0.3, sy + 0.2, 1, 0.7), '#4A2A1A') + circ(sx - 0.6, sy - 0.5, 0.35, '#C8B060', 0.8);
  // stitched gash across the forehead
  s += line('M-6,-89.6C-2,-91 2,-91.2 6,-90', 0.8, '#3A1A12') + stitch(-6, -89.6, 6, -90, 5, 1.1, 0.45);
  void g;
  return s;
}

function zombieSkinBack(c: Ctx): string {
  const { sk } = c;
  let s = fill(ellD(-4, -64, 7, 5), sk.d, 'opacity="0.14"');
  s += line('M4,-60.6C7,-61.6 10,-61.8 12.4,-61', 0.8, '#3A1A12') + stitch(4, -60.6, 12.4, -61, 4, 1, 0.45);
  s += fill(ellD(-10, -70, 2, 1.5), '#7A5A2E', 'opacity="0.7"') + fill(ellD(-9.8, -69.8, 0.9, 0.6), '#4A2A1A');
  return s;
}

/** The skull with cel shading, gradient and texture. */
export function skullFront(c: Ctx, shape: HeadShape, e: Expr): string {
  const { d, sk } = c;
  const g = geo(shape, e);
  const sd = skullD(g, e === 'eat');
  let inner = '';
  // cheek / jaw shading on the face side, under-jaw shadow
  inner += fill(`M${f(g.cheek - 3.6)},-74C${f(g.cheek - 2)},-68 ${f(g.jawX - 3)},${f(g.jawY + 2)} ${f(g.chinX + 1)},${f(g.chinY - 2)}L${f(g.chinX + 8)},${f(g.chinY + 3)}L${f(g.cheek + 3)},-76Z`, sk.s, 'opacity="0.55"');
  inner += fill(`M-12,${f(g.chinY - 3)}C-6,${f(g.chinY - 7)} 4,${f(g.chinY - 5)} ${f(g.chinX + 2)},${f(g.chinY - 1.4)}L${f(g.chinX + 3)},${f(g.chinY + 3)}L-14,${f(g.chinY + 3)}Z`, sk.s, 'opacity="0.6"');
  // temple / back-of-head shadow behind the ear
  inner += fill(`M${f(g.back - 2)},-80C-15,-72 -12,-64 -6,-58L-14,-56L${f(g.back - 3)},-60Z`, sk.s, 'opacity="0.45"');
  // soft light on the forehead and near cheek
  inner += fill(ellD(-1, -88, 11, 6), spot(d, lt(sk.b, 0.4), 0.45));
  inner += fill(ellD(-1, -69, 6, 4.5), spot(d, lt(sk.b, 0.3), 0.35));
  inner += skinTexture(c, [-20, -98, 23, -52], c.z ? 46 : 34);
  let s = shade(d, sd, sk, { off: [-2.4, -2], inner });
  if (c.z) s += inside(d, sd, zombieSkin(c, g));
  if (shape === 'jowl' || shape === 'round') {
    // double chin and sagging jowl
    s += line(`M${f(g.chinX - 7)},${f(g.chinY - 2.6)}Q${f(g.chinX)},${f(g.chinY - 0.4)} ${f(g.chinX + 6.4)},${f(g.chinY - 3.4)}`, 0.6, sk.d, 'opacity="0.8"');
    s += line(`M${f(g.jawX - 1.6)},${f(g.jawY - 4)}q1.4,2.6 0.4,5`, 0.55, sk.d, 'opacity="0.7"');
  }
  return s;
}

export function skullBack(c: Ctx, shape: HeadShape): string {
  const { d, sk } = c;
  const g = geo(shape);
  const sd = skullBackD(g);
  let inner = fill(`M-14,${f(g.chinY - 6)}C-4,${f(g.chinY - 9)} 8,${f(g.chinY - 6)} ${f(g.jawX)},${f(g.jawY - 3)}L${f(g.jawX + 4)},${f(g.chinY + 4)}L-14,${f(g.chinY + 4)}Z`, sk.s, 'opacity="0.55"');
  inner += skinTexture(c, [-20, -98, 23, -52], c.z ? 40 : 26);
  let s = shade(d, sd, sk, { off: [-2.4, -2], inner });
  if (c.z) s += inside(d, sd, zombieSkinBack(c));
  return s;
}

// ---------------------------------------------------------------- ears
export const EAR_F: Pt = [-18.2, -70.6];
export const EAR_B: Pt = [14.4, -72];

export function earFront(c: Ctx, x = EAR_F[0], y = EAR_F[1], s = 1.18): string {
  const { d, sk, z } = c;
  const o =
    `M${f(x + 2.4 * s)},${f(y - 4.6 * s)}C${f(x - 1.8 * s)},${f(y - 6.4 * s)} ${f(x - 4.6 * s)},${f(y - 3 * s)} ${f(x - 4 * s)},${f(y + 0.6 * s)}` +
    `C${f(x - 3.6 * s)},${f(y + 3.6 * s)} ${f(x - 1.4 * s)},${f(y + 5.6 * s)} ${f(x + 1.6 * s)},${f(y + 5 * s)}` +
    `C${f(x + 3.2 * s)},${f(y + 4.4 * s)} ${f(x + 2.6 * s)},${f(y + 1 * s)} ${f(x + 2.8 * s)},${f(y - 1 * s)}Z`;
  let st = shade(d, o, sk, { off: [-0.8, -0.8], lw: 1.05 });
  st += line(`M${f(x + 1.2 * s)},${f(y - 3 * s)}C${f(x - 1.6 * s)},${f(y - 3.6 * s)} ${f(x - 2.6 * s)},${f(y - 0.4 * s)} ${f(x - 1.6 * s)},${f(y + 1.8 * s)}C${f(x - 0.8 * s)},${f(y + 3 * s)} ${f(x + 0.4 * s)},${f(y + 2.4 * s)} ${f(x + 0.2 * s)},${f(y + 1 * s)}`, 0.6, sk.d);
  st += fill(ellD(x - 0.1 * s, y + 0.2 * s, 1.1 * s, 1.5 * s), sk.d, 'opacity="0.5"');
  if (z) {
    // a bite taken out of the ear
    st += fill(`M${f(x - 4.4 * s)},${f(y - 1 * s)}l1.4,0.6l-0.4,1.3l1.2,0.5l-1.6,1.4Z`, sk.d) + line(`M${f(x - 4.4 * s)},${f(y - 1 * s)}l1.4,0.6l-0.4,1.3l1.2,0.5l-1.6,1.4`, 0.6);
  }
  return st;
}

export function earBack(c: Ctx, x = EAR_B[0], y = EAR_B[1]): string {
  const { d, sk } = c;
  const o = `M${f(x - 2)},${f(y - 4.6)}C${f(x + 2.4)},${f(y - 6.6)} ${f(x + 5)},${f(y - 2.6)} ${f(x + 4.2)},${f(y + 1)}C${f(x + 3.6)},${f(y + 4)} ${f(x + 1)},${f(y + 5.8)} ${f(x - 1.6)},${f(y + 4.8)}C${f(x - 2.6)},${f(y + 2)} ${f(x - 2.8)},${f(y - 2)} ${f(x - 2)},${f(y - 4.6)}Z`;
  let s = shade(d, o, sk, { off: [-0.8, -0.8], lw: 1.05 });
  s += line(`M${f(x - 0.6)},${f(y - 3.4)}C${f(x + 2)},${f(y - 3.6)} ${f(x + 3)},${f(y - 0.6)} ${f(x + 2)},${f(y + 1.8)}`, 0.6, sk.d);
  return s;
}

// ---------------------------------------------------------------- eyes
export const EYE_N: Pt = [3.2, -75.6];
export const EYE_F: Pt = [14.2, -76];

interface EyeO {
  lid: number;
  low?: number;
  tilt?: number;
  look?: Pt;
  pr?: number;
  bags?: number;
  lash?: boolean;
  shadow?: string;
  wide?: boolean;
}

function lidLine(cx: number, cy: number, rx: number, ry: number, lid: number, tilt: number): [string, number] {
  const y0 = cy - ry + 2 * ry * lid;
  return [`M${f(cx - rx - 0.6)},${f(y0 + tilt)}Q${f(cx)},${f(y0 - 0.5)} ${f(cx + rx + 0.6)},${f(y0 - tilt)}`, y0];
}

/** Human eye: a big pure-white oval, a tiny ink pupil, a heavy upper lid cutting it, bags. */
export function eyeH(c: Ctx, cx: number, cy: number, rx: number, ry: number, o: EyeO): string {
  const { d, sk } = c;
  const e = ellD(cx, cy, rx, ry);
  let s = '';
  // faint socket
  s += fill(ellD(cx + 0.2, cy - 0.4, rx + 1.9, ry + 1.6), spot(d, sk.d, 0.22));
  if (o.shadow) s += fill(ellD(cx + 0.3, cy - ry * 0.55, rx + 0.9, ry * 0.7), o.shadow, 'opacity="0.32"');
  let inner = fill(e, SCLERA);
  inner += fill(ellD(cx, cy - ry, rx * 1.3, ry * 0.7), '#A8A28C', 'opacity="0.3"');
  const lk = o.look ?? [0.9, 0.3];
  const pr = o.pr ?? 0.95;
  inner += circ(cx + lk[0], cy + lk[1], pr * 1.3, '#4A4434') + circ(cx + lk[0], cy + lk[1], pr, INK);
  if (o.wide) inner += circ(cx + lk[0] - pr * 0.4, cy + lk[1] - pr * 0.5, pr * 0.32, '#E8E4D2', 0.9);
  const tilt = o.tilt ?? 0;
  const [ld, y0] = lidLine(cx, cy, rx, ry, o.lid, tilt);
  if (o.lid > 0.02) {
    inner += fill(`M${f(cx - rx - 2)},${f(cy - ry - 2)}H${f(cx + rx + 2)}V${f(y0 - tilt)}L${f(cx - rx - 2)},${f(y0 + tilt)}Z`, o.shadow ? mix(sk.b, o.shadow, 0.45) : sk.b);
    inner += fill(`M${f(cx - rx - 2)},${f(y0 + tilt - 1.4)}H${f(cx + rx + 2)}V${f(y0 - tilt)}L${f(cx - rx - 2)},${f(y0 + tilt)}Z`, sk.s, 'opacity="0.6"');
  }
  if (o.low) {
    const y1 = cy + ry - 2 * ry * o.low;
    inner += fill(`M${f(cx - rx - 2)},${f(cy + ry + 2)}H${f(cx + rx + 2)}V${f(y1)}Q${f(cx)},${f(y1 - 0.8)} ${f(cx - rx - 2)},${f(y1)}Z`, sk.b);
  }
  s += inside(d, e, inner);
  s += line(e, 0.8);
  // the upper lid is the heaviest line on the face
  if (o.lid > 0.02) s += line(ld, 1.4);
  else s += line(`M${f(cx - rx)},${f(cy - ry * 0.2)}Q${f(cx - rx * 0.6)},${f(cy - ry * 1.05)} ${f(cx + rx * 0.2)},${f(cy - ry)}`, 1.3);
  // crease above
  s += line(`M${f(cx - rx * 0.9)},${f(cy - ry - 0.7)}Q${f(cx)},${f(cy - ry - 2.1)} ${f(cx + rx * 0.95)},${f(cy - ry - 0.9)}`, 0.5, sk.d, 'opacity="0.85"');
  const bags = o.bags ?? 1;
  if (bags > 0) s += line(`M${f(cx - rx * 0.85)},${f(cy + ry * 0.72)}Q${f(cx + 0.2)},${f(cy + ry * 1.45)} ${f(cx + rx * 0.9)},${f(cy + ry * 0.62)}`, 0.55, sk.d, 'opacity="0.85"');
  if (bags > 1) s += line(`M${f(cx - rx * 0.6)},${f(cy + ry * 1.2)}Q${f(cx + 0.4)},${f(cy + ry * 1.7)} ${f(cx + rx * 0.8)},${f(cy + ry * 1.1)}`, 0.45, sk.d, 'opacity="0.6"');
  if (o.lash) s += line(`M${f(cx + rx * 0.7)},${f(y0 - tilt - 0.2)}l1.4,-1.1M${f(cx + rx * 0.35)},${f(y0 - tilt - 0.4)}l0.8,-1.3`, 0.6);
  return s;
}

/** Zombie eye: a solid yellow disc with a darker ring and NO pupil, dark socket, heavy lid, bloodshot rim. */
export function eyeZ(c: Ctx, cx: number, cy: number, rx: number, ry: number, o: EyeO): string {
  const { d, sk } = c;
  const e = ellD(cx, cy, rx, ry);
  let s = fill(ellD(cx + 0.3, cy - 0.2, rx + 2.4, ry + 2.1), spot(d, sk.d, 0.55));
  s += fill(ellD(cx + 0.4, cy + ry * 0.9, rx * 1.1, ry * 0.45), sk.d, 'opacity="0.35"');
  let inner = fill(e, ZEYE);
  inner += fill(ellD(cx + rx * 0.3, cy + ry * 0.5, rx * 1.05, ry * 0.7), ZEYE_D, 'opacity="0.45"');
  inner += line(ellD(cx, cy, rx * 0.72, ry * 0.72), 0.9, ZEYE_D, 'opacity="0.95"');
  inner += fill(ellD(cx - rx * 0.35, cy - ry * 0.25, rx * 0.3, ry * 0.2), '#EFE39A', 'opacity="0.6"');
  // veins
  inner += line(`M${f(cx + rx)},${f(cy + 0.6)}l${f(-rx * 0.45)},-0.4l-0.6,0.6M${f(cx - rx)},${f(cy + 0.4)}l${f(rx * 0.4)},0.5`, 0.3, '#A0522E', 'opacity="0.8"');
  const tilt = o.tilt ?? 0;
  const [ld, y0] = lidLine(cx, cy, rx, ry, o.lid, tilt);
  if (o.lid > 0.02) {
    inner += fill(`M${f(cx - rx - 2)},${f(cy - ry - 2)}H${f(cx + rx + 2)}V${f(y0 - tilt)}L${f(cx - rx - 2)},${f(y0 + tilt)}Z`, sk.s);
    inner += fill(`M${f(cx - rx - 2)},${f(y0 + tilt - 1.2)}H${f(cx + rx + 2)}V${f(y0 - tilt)}L${f(cx - rx - 2)},${f(y0 + tilt)}Z`, sk.d, 'opacity="0.5"');
  }
  if (o.low) {
    const y1 = cy + ry - 2 * ry * o.low;
    inner += fill(`M${f(cx - rx - 2)},${f(cy + ry + 2)}H${f(cx + rx + 2)}V${f(y1)}Q${f(cx)},${f(y1 - 0.8)} ${f(cx - rx - 2)},${f(y1)}Z`, sk.s);
  }
  s += inside(d, e, inner);
  s += line(`M${f(cx - rx * 0.8)},${f(cy + ry * 0.7)}Q${f(cx)},${f(cy + ry * 1.12)} ${f(cx + rx * 0.85)},${f(cy + ry * 0.6)}`, 0.5, '#9A4A2E', 'opacity="0.9"');
  s += line(e, 0.85);
  if (o.lid > 0.02) s += line(ld, 1.4);
  s += line(`M${f(cx - rx * 0.9)},${f(cy + ry * 1.25)}Q${f(cx)},${f(cy + ry * 1.75)} ${f(cx + rx * 0.9)},${f(cy + ry * 1.1)}`, 0.5, sk.d, 'opacity="0.9"');
  return s;
}

/** Closed eye (sleep / bliss). */
export function eyeShut(c: Ctx, cx: number, cy: number, rx: number, up = false): string {
  const { sk } = c;
  let s = fill(ellD(cx + 0.2, cy - 0.4, rx + 1.8, rx + 1.2), sk.d, 'opacity="0.18"');
  s += up
    ? line(`M${f(cx - rx)},${f(cy + 0.8)}Q${f(cx)},${f(cy - 2.2)} ${f(cx + rx)},${f(cy + 0.6)}`, 1.15)
    : line(`M${f(cx - rx)},${f(cy - 0.6)}Q${f(cx)},${f(cy + 1.8)} ${f(cx + rx)},${f(cy - 0.8)}`, 1.15);
  if (!up) s += line(`M${f(cx - rx * 0.4)},${f(cy + 0.7)}l-0.4,1.1M${f(cx + rx * 0.3)},${f(cy + 0.75)}l0.3,1.1`, 0.5);
  s += line(`M${f(cx - rx * 0.8)},${f(cy + 2.6)}Q${f(cx)},${f(cy + 3.6)} ${f(cx + rx * 0.8)},${f(cy + 2.4)}`, 0.5, sk.d, 'opacity="0.8"');
  return s;
}

/** Dazed spiral (pupil-less) eye for zombies. */
export function eyeSpiral(c: Ctx, cx: number, cy: number, r: number): string {
  let dd = `M${f(cx)},${f(cy)}`;
  for (let i = 1; i <= 26; i++) {
    const t = i / 26;
    const a = t * 2.3 * Math.PI * 2;
    dd += `L${f(cx + Math.cos(a) * t * (r - 0.7))},${f(cy + Math.sin(a) * t * (r - 0.7))}`;
  }
  return fill(ellD(cx + 0.3, cy, r + 2, r + 1.8), spot(c.d, c.sk.d, 0.6)) + outl(ellD(cx, cy, r, r * 1.08), ZEYE, 0.8) + line(dd, 0.6, '#7A6A20');
}

// ---------------------------------------------------------------- brows
function browPath(x1: number, y1: number, x2: number, y2: number, t1: number, t2: number, arch: number): string {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2 - arch;
  return `M${f(x1)},${f(y1)}Q${f(mx)},${f(my - (t1 + t2) / 4)} ${f(x2)},${f(y2)}L${f(x2 + 0.2)},${f(y2 + t2)}Q${f(mx)},${f(my + (t1 + t2) / 2.6)} ${f(x1 - 0.2)},${f(y1 + t1)}Z`;
}

export type BrowPose = 'rest' | 'up' | 'down' | 'worry' | 'skeptic';

export function brows(c: Ctx, pose: BrowPose): string {
  const fc = c.L.face;
  const col = fc.browCol ?? c.L.hair.s;
  const kind = fc.brow;
  const th = kind === 'thick' ? 1.9 : kind === 'bushy' ? 2.6 : kind === 'thin' || kind === 'arched' ? 1 : kind === 'sparse' ? 1.1 : 1.6;
  // [x1,y1,x2,y2,arch] for near / far brow
  let n: [number, number, number, number, number] = [-1.2, -82.4, 7.8, -83.4, 1.2];
  let fr: [number, number, number, number, number] = [11.6, -83.4, 18.6, -82, 1];
  if (kind === 'arched' || kind === 'raised') {
    n = [-1, -83, 7.8, -84.4, 2.2];
    fr = [11.8, -84.6, 18.6, -82.4, 1.8];
  }
  if (pose === 'up') {
    n = [n[0], n[1] - 2.6, n[2], n[3] - 3.2, n[4] + 1.6];
    fr = [fr[0], fr[1] - 3.2, fr[2], fr[3] - 2.4, fr[4] + 1.4];
  } else if (pose === 'down') {
    n = [-1, -84.6, 8.4, -80.6, -0.4];
    fr = [11.2, -80.8, 18.8, -84, -0.4];
  } else if (pose === 'worry') {
    n = [-1, -81.6, 7.8, -85, 0.4];
    fr = [11.4, -85, 18.6, -81.4, 0.4];
  } else if (pose === 'skeptic') {
    fr = [11.6, -86.2, 18.6, -84, 2.4];
  }
  // brows sit right over the (big) eyes
  n = [n[0] - 0.4, n[1] - 2.4, n[2], n[3] - 2.4, n[4]];
  fr = [fr[0], fr[1] - 2.4, fr[2] + 0.4, fr[3] - 2.4, fr[4]];
  let s = '';
  for (const [x1, y1, x2, y2, a] of [n, fr]) {
    const p = browPath(x1, y1, x2, y2, th, th * 0.7, a);
    s += fill(p, col) + line(p, 0.45, INK, 'opacity="0.9"');
    if (kind === 'bushy') s += hatch([x1, Math.min(y1, y2) - 1.6, x2, Math.max(y1, y2) + 1.2], 14, dk(col, 0.6), c.seed + x1, 1, -0.4, 0.35, 0.8);
    if (kind === 'uni' && x1 < 5) s += fill(browPath(x2 - 0.6, y2, 11.8, fr[1], th * 0.6, th * 0.6, -0.6), col);
  }
  return s;
}

// ---------------------------------------------------------------- noses
const NOSES: Record<NoseKind, { d: string; o: string; nostril: string; shadow: string }> = {
  big: {
    d: 'M9.4,-79C10.6,-75 13.6,-72.6 18,-70.8C21.6,-69.4 21.6,-65.4 18.4,-65C16.8,-64.8 16.2,-65.8 15.2,-65.4C13.2,-64.6 10.8,-65.2 10.6,-67.2C10.4,-68.6 11.4,-69.6 12.6,-69.4L9,-74Z',
    o: 'M9.4,-79C10.6,-75 13.6,-72.6 18,-70.8C21.6,-69.4 21.6,-65.4 18.4,-65C16.8,-64.8 16.2,-65.8 15.2,-65.4C13.2,-64.6 10.8,-65.2 10.6,-67.2C10.4,-68.6 11.4,-69.6 12.6,-69.4',
    nostril: 'M15.6,-66.4Q16.8,-67.2 17.6,-66.2',
    shadow: 'M10.8,-66.4C12,-63.6 16,-63.4 19.4,-64.4L19.6,-62.4C15.6,-61.6 11.4,-62 10.2,-64.6Z',
  },
  bulb: {
    d: 'M9.6,-79C10.6,-76 12.4,-74.4 15,-73.4C18,-74.4 22.4,-72 22.2,-68C22,-64.4 18.8,-63.6 16.8,-64.6C15.4,-63.8 12.6,-64 11.6,-65.8C10.6,-67.6 11.6,-69.2 13,-69.4L9.2,-74Z',
    o: 'M9.6,-79C10.6,-76 12.4,-74.4 15,-73.4C18,-74.4 22.4,-72 22.2,-68C22,-64.4 18.8,-63.6 16.8,-64.6C15.4,-63.8 12.6,-64 11.6,-65.8C10.6,-67.6 11.6,-69.2 13,-69.4',
    nostril: 'M16,-65.6Q17.2,-66.6 18.2,-65.4',
    shadow: 'M11.4,-65.4C13,-62.6 17.6,-62.2 21,-63.6L21,-61.6C16.6,-60.6 12,-61.2 10.8,-63.8Z',
  },
  hook: {
    d: 'M9.4,-79.4C12,-78.6 14.2,-77 16.8,-73.4C19.6,-69.6 20.6,-66.4 18.8,-64.4C17.6,-63.4 16.4,-64.8 15.4,-64.8C13.4,-64.4 11,-65 10.8,-67C10.6,-68.4 11.6,-69.4 12.8,-69.2L9,-74Z',
    o: 'M9.4,-79.4C12,-78.6 14.2,-77 16.8,-73.4C19.6,-69.6 20.6,-66.4 18.8,-64.4C17.6,-63.4 16.4,-64.8 15.4,-64.8C13.4,-64.4 11,-65 10.8,-67C10.6,-68.4 11.6,-69.4 12.8,-69.2',
    nostril: 'M15.4,-65.8Q16.6,-66.6 17.4,-65.4',
    shadow: 'M10.8,-66.2C12,-63.4 15.6,-63 18.6,-63.6L19,-61.8C15.4,-61 11.4,-61.6 10.2,-64.4Z',
  },
  pointy: {
    d: 'M9.4,-79C11,-75.4 15,-71.6 22.4,-68.4C23.4,-67.8 22.8,-66.8 21.6,-66.8C19.4,-66.8 17.6,-66.4 16,-65.8C13.6,-65 11,-65.4 10.8,-67.2C10.6,-68.6 11.6,-69.6 12.8,-69.4L9,-74Z',
    o: 'M9.4,-79C11,-75.4 15,-71.6 22.4,-68.4C23.4,-67.8 22.8,-66.8 21.6,-66.8C19.4,-66.8 17.6,-66.4 16,-65.8C13.6,-65 11,-65.4 10.8,-67.2C10.6,-68.6 11.6,-69.6 12.8,-69.4',
    nostril: 'M15.8,-66.6Q17,-67.2 17.8,-66.4',
    shadow: 'M10.8,-66.4C12,-63.8 16.4,-63.6 20.4,-65.2L20.2,-63.2C16,-62 11.4,-62.2 10.2,-64.6Z',
  },
  long: {
    d: 'M9.4,-79.2C11.4,-75.6 15.6,-71.8 21.6,-67.4C23.4,-66 22.8,-63.8 20.6,-63.6C19,-63.4 17.4,-64.6 16,-64.4C13.6,-64 11,-64.8 10.8,-66.8C10.6,-68.2 11.6,-69.2 12.8,-69L9,-74Z',
    o: 'M9.4,-79.2C11.4,-75.6 15.6,-71.8 21.6,-67.4C23.4,-66 22.8,-63.8 20.6,-63.6C19,-63.4 17.4,-64.6 16,-64.4C13.6,-64 11,-64.8 10.8,-66.8C10.6,-68.2 11.6,-69.2 12.8,-69',
    nostril: 'M16.2,-65.4Q17.4,-66.2 18.4,-65.2',
    shadow: 'M10.8,-65.8C12.4,-62.8 17,-62.4 21,-63L21,-61.2C16.4,-60.4 11.6,-61 10.2,-64Z',
  },
  pug: {
    d: 'M10,-77C11,-74 12.6,-72.4 15.4,-71.2C18.6,-70.2 19.6,-67.4 18,-66C16.8,-65 15.6,-66 14.6,-65.8C12.8,-65.2 11,-65.8 11,-67.4C11,-68.6 11.8,-69.4 12.8,-69.2L9.6,-73Z',
    o: 'M10,-77C11,-74 12.6,-72.4 15.4,-71.2C18.6,-70.2 19.6,-67.4 18,-66C16.8,-65 15.6,-66 14.6,-65.8C12.8,-65.2 11,-65.8 11,-67.4C11,-68.6 11.8,-69.4 12.8,-69.2',
    nostril: 'M14.8,-67Q15.8,-67.8 16.8,-67',
    shadow: 'M11,-66.6C12.4,-64.2 15.6,-64 18.4,-65L18.6,-63.2C15.2,-62.4 11.8,-62.8 10.6,-65Z',
  },
  small: {
    d: 'M9.8,-78C10.8,-74.6 13,-72.4 16.4,-70.8C19,-69.6 19,-66.6 16.8,-66.2C15.6,-66 15,-66.8 14.2,-66.6C12.6,-66 11,-66.6 11,-68C11,-69 11.8,-69.8 12.8,-69.6L9.4,-74Z',
    o: 'M9.8,-78C10.8,-74.6 13,-72.4 16.4,-70.8C19,-69.6 19,-66.6 16.8,-66.2C15.6,-66 15,-66.8 14.2,-66.6C12.6,-66 11,-66.6 11,-68',
    nostril: 'M14.6,-67.4Q15.6,-68 16.4,-67.2',
    shadow: 'M11,-67.2C12.2,-65 15.4,-64.8 17.8,-65.6L18,-64C14.8,-63.2 11.8,-63.6 10.6,-65.6Z',
  },
  broken: {
    d: 'M9.4,-79C10.4,-76.6 12.8,-75.8 13.6,-73.6C15.6,-73.4 20.4,-71.4 20.8,-68.2C21.2,-65.2 18.6,-64.6 17,-65.2C15.6,-64.6 12.6,-64.4 11.4,-66C10.4,-67.6 11.4,-69 12.6,-69.2L9,-74Z',
    o: 'M9.4,-79C10.4,-76.6 12.8,-75.8 13.6,-73.6C15.6,-73.4 20.4,-71.4 20.8,-68.2C21.2,-65.2 18.6,-64.6 17,-65.2C15.6,-64.6 12.6,-64.4 11.4,-66C10.4,-67.6 11.4,-69 12.6,-69.2',
    nostril: 'M15.8,-66Q17,-66.8 18,-65.8',
    shadow: 'M11.2,-65.6C12.6,-62.8 16.8,-62.6 20.4,-63.8L20.4,-62C16.2,-61 11.8,-61.4 10.6,-64Z',
  },
};

export function nose(c: Ctx, kind: NoseKind, flare = false): string {
  const { d, sk } = c;
  const n = NOSES[kind];
  let s = fill(n.shadow, sk.s, 'opacity="0.7"');
  const inner = fill('M8,-80L24,-80L24,-60L8,-60Z', sk.s, 'opacity="0"') +
    fill(`M14,-71C17,-70 21,-69 21,-66C20,-64.6 17,-64.6 15,-65Z`, sk.s, 'opacity="0.55"') +
    fill(ellD(13.6, -72.6, 2.2, 1.4), lt(sk.b, 0.35), 'opacity="0.5"');
  s += shade(d, n.d, sk, { lw: 0, off: [-0.6, -0.6], inner });
  if (kind === 'bulb' && !c.z) s += fill(ellD(18.4, -68.4, 3.2, 2.6), '#9A6A5A', 'opacity="0.35"');
  s += line(n.o, 1.05);
  s += line(n.nostril, flare ? 1.1 : 0.8);
  if (flare) s += line('M11.6,-69.8q-1.4,0.6 -1.2,2.4', 0.7);
  return s;
}

// ---------------------------------------------------------------- mouths (human)
/** Upper-lip / chin dents shared by most closed mouths. */
function chinCrease(c: Ctx, g: Geo, y = 0): string {
  return line(`M${f(g.chinX - 2)},${f(g.chinY - 3.2 + y)}Q${f(g.chinX + 0.6)},${f(g.chinY - 4.2 + y)} ${f(g.chinX + 3)},${f(g.chinY - 3.4 + y)}`, 0.55, c.sk.d, 'opacity="0.7"');
}

function teethRow(x0: number, x1: number, y: number, h: number, n: number, gap = -1, down = true, col = TEETH): string {
  let s = '';
  const w = (x1 - x0) / n;
  for (let i = 0; i < n; i++) {
    if (i === gap) continue;
    const jit = ((i * 37) % 5) / 10;
    s += toothP(x0 + i * w, y, w, h * (0.85 + jit * 0.4), down, i % 3 === 1 ? mix(col, TEETH_D, 0.35) : col);
  }
  return s;
}

/** Open mouth painter: the cavity, teeth, tongue, lips. */
function openMouth(c: Ctx, path: string, o: { top?: [number, number, number, number, number]; bot?: [number, number, number, number, number]; tongue?: Pt; lip?: string; gums?: boolean }): string {
  const { d } = c;
  let inner = fill(path, MOUTH);
  if (o.tongue) inner += fill(ellD(o.tongue[0], o.tongue[1], 4.2, 2.6), TONGUE) + line(`M${f(o.tongue[0] - 0.4)},${f(o.tongue[1] - 1.8)}v2`, 0.5, dk(TONGUE, 0.7));
  if (o.gums && o.top) inner += fill(`M${f(o.top[0] - 2)},${f(o.top[2] - 4)}H${f(o.top[1] + 2)}V${f(o.top[2] + 0.6)}H${f(o.top[0] - 2)}Z`, GUM);
  if (o.top) inner += teethRow(o.top[0], o.top[1], o.top[2], o.top[3], o.top[4], 2, true);
  if (o.bot) inner += teethRow(o.bot[0], o.bot[1], o.bot[2], o.bot[3], o.bot[4], -1, false);
  let s = inside(d, path, inner);
  s += line(path, 1.05);
  if (o.lip) s += line(path, 0.7, o.lip, 'opacity="0.8"');
  return s;
}

export function mouthH(c: Ctx, kind: MouthKind, g: Geo): string {
  const { sk } = c;
  const lip = c.L.face.lips;
  const lipLine = (dd: string) => (lip ? line(dd, 1.4, lip, 'opacity="0.85"') : '');
  let s = '';
  switch (kind) {
    case 'smirk':
      s += lipLine('M6,-61.4C9,-60.6 12,-60.8 15,-62.4');
      s += line('M4.8,-61.6C7.6,-60.6 11.4,-60.8 14.8,-62.4C15.8,-62.9 16.6,-63.8 17.2,-64.6', 1.05);
      s += line('M17.2,-64.6q0.6,0.2 0.7,1', 0.6) + line('M4.8,-61.6q-0.6,-0.4 -0.9,-1.2', 0.6);
      s += line('M8.4,-59Q11,-58 13.6,-59.2', 0.6, sk.d, 'opacity="0.8"');
      break;
    case 'frown':
      s += lipLine('M6,-61C9,-62.2 12,-62.4 15.4,-61.2');
      s += line('M4.6,-60.2C7.2,-62.2 12.2,-62.6 16.6,-60.4', 1.05) + line('M4.6,-60.2q-0.8,0.6 -0.9,1.6M16.6,-60.4q0.8,0.6 0.9,1.6', 0.6);
      s += line('M8.6,-58.6Q11,-57.8 13.4,-58.6', 0.6, sk.d, 'opacity="0.8"');
      break;
    case 'flat':
      s += line('M6,-61.4C9,-61.8 12.6,-61.8 15.6,-61.6', 1.05) + line('M6,-61.4l-0.4,-0.9M6.6,-60.8l-0.9,0.2M15.6,-61.6l0.6,-0.8', 0.5);
      s += line('M8.8,-59.2Q11,-58.6 13.2,-59.2', 0.55, sk.d, 'opacity="0.75"');
      s += line('M10.6,-63.8q0.4,-0.6 0.2,-1.4', 0.5, sk.d, 'opacity="0.7"');
      break;
    case 'grim':
      s += openMouth(c, 'M5,-62.4C8.4,-63.4 13,-63.4 16.6,-62.4C16.4,-60 13.4,-59.2 10.6,-59.2C7.8,-59.2 5.2,-60 5,-62.4Z', { top: [5, 16.6, -63.4, 2.2, 6], bot: [5.4, 16, -59.2, 2, 5] });
      break;
    case 'grin':
    case 'fake':
      s += openMouth(c, 'M3.6,-63.4C8,-61.6 14.4,-62 19,-65C19.4,-60.6 16,-57.6 11.6,-57.6C7.6,-57.6 4.6,-59.6 3.6,-63.4Z', { top: [3.6, 19, -64.4, 3, 8], tongue: [11.4, -57.6], lip });
      s += line('M3.6,-63.4q-1,-0.4 -1.4,-1.4M19,-65q0.9,-0.6 1,-1.6', 0.7);
      break;
    case 'sneer':
      s += openMouth(c, 'M5,-61.6C7,-63.4 10,-63.6 12.6,-62.6C14.6,-62.8 16.4,-63 17.2,-63.6C16.4,-61.2 13,-60.2 10,-60.4C7.8,-60.6 5.8,-60.8 5,-61.6Z', { top: [5, 13, -63.6, 1.8, 3], lip });
      s += line('M9,-58.8Q11.4,-58 13.6,-58.8', 0.55, sk.d, 'opacity="0.8"');
      break;
    case 'gap':
      s += openMouth(c, 'M4.4,-62C8,-60.8 13.6,-61.2 17.6,-63.6C17.2,-60.4 14,-58.6 10.8,-58.6C7.4,-58.6 5,-59.6 4.4,-62Z', { top: [4.6, 17.6, -63.2, 2.2, 6], tongue: [11, -58.2], lip });
      break;
    case 'pout': {
      const lc = lip ?? '#8A4A50';
      const up = 'M5.4,-62C7,-64.2 9.6,-64 11,-62.8C12.4,-64.2 15.4,-64.2 16.6,-62.2C14,-61.4 8,-61.2 5.4,-62Z';
      const lo = 'M5.4,-62C8,-61.2 14,-61.4 16.6,-62.2C16.2,-58.4 13,-57.6 11,-57.8C8.4,-58 5.6,-59.4 5.4,-62Z';
      s += outl(up, lc, 0.9) + outl(lo, mix(lc, '#E0C0B0', 0.12), 0.9) + fill(ellD(11, -59.6, 2.2, 0.7), '#E8D8C8', 'opacity="0.45"');
      break;
    }
    case 'lips': {
      const lc = lip ?? '#7A3A3E';
      const up = 'M5.4,-61.8C7.6,-63.4 9.6,-63.2 11,-62.6C12.6,-63.4 15,-63.4 16.6,-62C13.6,-61.2 8.6,-61 5.4,-61.8Z';
      const lo = 'M5.4,-61.8C8.6,-61 13.6,-61.2 16.6,-62C15.6,-59.4 13,-58.8 11,-58.8C8.6,-58.8 6.4,-59.8 5.4,-61.8Z';
      s += outl(up, lc, 0.8) + outl(lo, mix(lc, '#C0A090', 0.15), 0.8) + line('M5.4,-61.8C8.6,-61 13.6,-61.2 16.6,-62', 0.9);
      s += fill(ellD(11.6, -60.2, 1.8, 0.5), '#E0D0C0', 'opacity="0.4"');
      break;
    }
    case 'chew':
      s += line('M6,-61.6C8.6,-62 11,-61 13.4,-61.6C14.6,-62 15.6,-62.6 16.4,-62.4', 1.05);
      s += fill(ellD(15.8, -61.6, 1.6, 1.2), '#B07C84', 'opacity="0.9"') + line(ellD(15.8, -61.6, 1.6, 1.2), 0.5);
      s += line('M8.6,-59.2Q11,-58.4 13.4,-59.2', 0.55, sk.d, 'opacity="0.8"');
      break;
    case 'open':
      s += openMouth(c, 'M6,-62C9,-62.6 13,-62.8 15.6,-62.2C15.4,-59 13,-57.4 10.6,-57.4C8.2,-57.4 6.2,-59 6,-62Z', { top: [6, 15.6, -62.8, 1.6, 4], tongue: [10.8, -57.4], lip });
      break;
    case 'whistle':
      s += fill(ellD(12.4, -61.4, 2, 1.6), MOUTH) + line(ellD(12.4, -61.4, 2, 1.6), 0.9);
      break;
  }
  if (kind !== 'grin' && kind !== 'fake') s += chinCrease(c, g);
  // nasolabial folds (age)
  s += line('M10.2,-66.6C8.4,-65 7.6,-63.4 7.4,-61.8', 0.55, sk.d, 'opacity="0.75"');
  if (kind === 'fake' || kind === 'grin') s += line('M19.6,-66.2C20.4,-65.4 20.6,-64.6 20.4,-63.6', 0.55, sk.d);
  return s;
}

// ---------------------------------------------------------------- zombie mouths
export function mouthZ(c: Ctx, kind: ZMouthKind, g: Geo): string {
  const { sk } = c;
  let s = '';
  const drool = (x: number, y: number, len: number) => drip(x, y, len, 1.3, SLIME_L, 0.85) + line(`M${f(x - 0.6)},${f(y)}v${f(len * 0.8)}`, 0.3, SLIME, 'opacity="0.8"');
  switch (kind) {
    case 'slack':
      s += openMouth(c, 'M4.6,-61.8C8,-63.4 13.4,-63.4 17,-62C16.8,-58.6 14,-56.4 10.8,-56.4C7.6,-56.6 5,-58.6 4.6,-61.8Z', { top: [5, 16.4, -63.2, 2.2, 6], bot: [7, 14, -56.8, 1.8, 3], tongue: [10.6, -56.6], gums: true });
      s += drool(8, -57, 3.6);
      break;
    case 'snarl':
      s += openMouth(c, 'M4.4,-61C6.4,-64.2 11,-64.4 13.4,-63.4C15.2,-64.4 17.4,-64 18,-62.6C16.6,-60.2 12.4,-59.4 9.4,-59.6C7,-59.8 5,-60 4.4,-61Z', { top: [4.6, 18, -64.4, 2.6, 7], gums: true });
      s += drool(15.4, -60.4, 3.2);
      break;
    case 'gape':
      s += openMouth(c, 'M5.2,-62.4C8,-63.6 13.4,-63.6 16.2,-62.6C16.8,-58 14.2,-54.8 10.8,-54.8C7.6,-54.8 4.8,-57.6 5.2,-62.4Z', { top: [6.6, 14.8, -63.6, 2, 4], tongue: [10.8, -55.2] });
      s += drool(6.8, -57.4, 4.4);
      break;
    case 'crooked':
      s += openMouth(c, 'M5,-60.6C8,-62.2 12.6,-63.8 17.4,-64.6C17.4,-60.8 14,-58.4 10.6,-58.6C7.8,-58.8 5.6,-59.4 5,-60.6Z', { top: [7, 17, -64.2, 2.4, 5], bot: [8, 14, -58.6, 1.8, 3] });
      s += drool(7, -59.2, 3.8);
      break;
    case 'toothless':
      s += openMouth(c, 'M5.6,-61.4C8.6,-62.6 13,-62.6 15.8,-61.6C15.4,-58.4 13,-57 10.6,-57C8,-57 5.8,-58.6 5.6,-61.4Z', { tongue: [10.8, -57.4] });
      s += toothP(11.2, -62.6, 1.8, 2.6, true) + drool(6.6, -58.6, 3.4);
      break;
    case 'stitched':
      s += line('M4.6,-61.4C8,-60.8 12.4,-61 17,-62.6', 1.1) + stitch(4.6, -61.4, 17, -62.6, 6, 1.4, 0.5);
      s += openMouth(c, 'M13,-62C14.4,-63 16.4,-63.2 17.4,-62.6C17,-60.8 15.4,-60.2 14,-60.6C13.4,-60.8 13,-61.4 13,-62Z', { top: [13.2, 17.4, -63.2, 1.6, 2] });
      s += drool(15.6, -60.6, 3);
      break;
    case 'jaw':
      // lower lip rotted away: gums and teeth on show
      s += openMouth(c, 'M4.6,-62.4C8,-63.4 13.4,-63.6 17,-62.6C17.2,-60.2 15.6,-58 12.6,-57.8C11,-57.6 10,-58.6 8.4,-58.2C6.4,-58.2 4.8,-59.8 4.6,-62.4Z', { top: [4.6, 17, -63.4, 2.2, 7], bot: [5.4, 16.6, -57.8, 2.6, 6], gums: true });
      s += fill('M6,-57.6C8,-56 13,-55.8 16,-57.6L15.8,-56C13,-54.4 8,-54.6 6,-56Z', GUM, 'opacity="0.85"');
      break;
  }
  s += chinCrease(c, g, 1);
  s += line('M10.2,-66.6C8.4,-65 7.6,-63.4 7.4,-61.8', 0.6, sk.d, 'opacity="0.8"');
  return s;
}

// ---------------------------------------------------------------- wrinkles & stubble
export function wrinkles(c: Ctx, n: number, e: Expr): string {
  const { sk } = c;
  let s = '';
  const lift = e === 'scream' || e === 'shock' ? -1.2 : 0;
  if (n >= 1) s += line(`M-1,${f(-88 + lift)}Q7,${f(-90 + lift)} 16,${f(-88.4 + lift)}`, 0.5, sk.d, 'opacity="0.7"');
  // the nose-to-mouth fold on the near cheek (tired, lived-in faces)
  if (n >= 1 && e !== 'scream' && e !== 'shock' && e !== 'chomp' && e !== 'eat') s += line(`M8.4,-68.6Q5.2,-66.4 ${e === 'happy' ? '3.2,-62.4' : '3.8,-62.8'}`, 0.5, sk.d, 'opacity="0.55"');
  if (n >= 2) s += line(`M1,${f(-90.8 + lift)}Q8,${f(-92.6 + lift)} 14.6,${f(-91.2 + lift)}`, 0.5, sk.d, 'opacity="0.6"');
  if (n >= 2) s += line('M-2.6,-74.4l-1.6,0.6M-2.4,-72.8l-1.4,1.2M19.6,-74.4l1,0.6', 0.45, sk.d, 'opacity="0.7"');
  if (n >= 3) s += line('M4,-55.8Q9,-54.4 14,-56M-4,-71q1,-3 4,-3.4', 0.45, sk.d, 'opacity="0.6"');
  if (e === 'scream' || e === 'shock' || e === 'angry') s += line(`M2,${f(-91 + lift)}Q8,${f(-92.6 + lift)} 14,${f(-91 + lift)}M3,${f(-88.6 + lift)}Q8,${f(-90 + lift)} 13,${f(-88.6 + lift)}`, 0.5, sk.d, 'opacity="0.8"');
  return s;
}

export function stubble(c: Ctx, g: Geo): string {
  const { d, sk, seed } = c;
  const col = mix(c.L.hair.s, sk.s, 0.35);
  const area = `M-6,-66C-2,-64 4,-66.6 8,-66C10,-64 14,-64.6 20,-66.4L${f(g.jawX + 1)},${f(g.jawY)}C${f(g.jawX - 1.6)},${f(g.jawY + 4.2)} ${f(g.chinX + 4)},${f(g.chinY)} ${f(g.chinX)},${f(g.chinY)}C${f(g.chinX - 6)},${f(g.chinY)} -4,${f(g.chinY - 3)} -7,-60Z`;
  return inside(d, area, fill(area, col, 'opacity="0.28"') + speck([-8, -68, 24, -50], 70, [col, dk(col, 0.8)], seed + 31, 0.18, 0.32, 0.8));
}

// ---------------------------------------------------------------- expression assembly
export interface FaceOut {
  s: string;
  g: Geo;
}

/** The complete front face (no hair, no ears) for a human or zombie and an expression. */
export function face(c: Ctx, e: Expr): string {
  const fc = c.L.face;
  const g = geo(fc.shape, e);
  // big sclera ovals (~15 % larger than the first v3 pass: the original's are the size of a zombie eye)
  const es = (fc.eyeS ?? 1) * 1.33;
  const [nx, ny] = EYE_N;
  const [fx, fy] = EYE_F;
  const rxN = 4.3 * es;
  const ryN = 4.9 * es;
  const rxF = 3.3 * es;
  const ryF = 4.6 * es;
  let s = '';
  if (!c.z) {
    const base = { lid: fc.lid * 0.78, bags: fc.bags, look: fc.look, lash: fc.lash, shadow: fc.shadow };
    let eyes = '';
    let bpose: BrowPose = fc.brow === 'raised' ? 'skeptic' : 'rest';
    let mouth = '';
    let extra = '';
    switch (e) {
      case 'scream':
        eyes = eyeH(c, nx, ny - 0.6, rxN + 0.5, ryN + 0.8, { lid: 0, bags: 2, look: [0.2, -0.2], pr: 0.8, wide: true }) +
          eyeH(c, fx, fy - 0.6, rxF + 0.4, ryF + 0.7, { lid: 0, bags: 1, look: [0.1, -0.2], pr: 0.7, wide: true });
        bpose = 'worry';
        mouth = openMouth(c, `M3.4,-64.4C7.4,-66 15,-66.4 18.6,-64.8C19.6,-58 16,${f(g.chinY - 2.6)} 10.6,${f(g.chinY - 2.4)}C5.6,${f(g.chinY - 2.6)} 2.2,-58 3.4,-64.4Z`, { top: [3.6, 18.6, -66, 2.4, 7], bot: [6, 16, g.chinY - 2.4, 1.8, 4], tongue: [10.8, g.chinY - 3.6], lip: fc.lips });
        mouth += line('M9.8,-67.4C7,-66.8 4.6,-65.6 2.8,-63.4M19.8,-66.6q0.8,1.2 0.6,2.6', 0.6, c.sk.d);
        extra = sweatDrop(-14, -86, 1, -20) + sweatDrop(23, -80, 0.85, 25) + sweatDrop(-17, -76, 0.7, -35);
        break;
      case 'happy':
        eyes = eyeH(c, nx, ny, rxN, ryN, { lid: Math.max(0.35, fc.lid), low: 0.38, bags: 2, look: [1, 0], lash: fc.lash, shadow: fc.shadow }) +
          eyeH(c, fx, fy, rxF, ryF, { lid: Math.max(0.35, fc.lid), low: 0.38, bags: 1, look: [0.8, 0], lash: fc.lash, shadow: fc.shadow });
        bpose = 'up';
        mouth = openMouth(c, 'M3.2,-64.4C7.6,-62.4 14.6,-62.6 19.4,-66.2C19.6,-60.4 16,-57 11.4,-57C7,-57 3.8,-59.6 3.2,-64.4Z', { top: [3.4, 19.4, -65.6, 3, 8], bot: [6.6, 15.4, -57.2, 1.6, 4], tongue: [11.2, -57.4], lip: fc.lips });
        mouth += line('M3.2,-64.4q-1.2,-0.6 -1.6,-1.8M19.4,-66.2q0.6,-1 0.4,-2', 0.75);
        mouth += line('M10.4,-67C8,-65.4 6.4,-64.6 4.6,-64.6', 0.6, c.sk.d) + line('M-1.8,-73.6l-1.8,-0.6M-1.6,-71.6l-1.8,0.6', 0.5, c.sk.d);
        mouth += fill(ellD(-1, -66.4, 3, 1.8), '#8A4A3A', 'opacity="0.18"');
        break;
      case 'shock':
        eyes = eyeH(c, nx, ny - 0.8, rxN + 0.6, ryN + 1, { lid: 0, bags: 2, look: [0, 0], pr: 0.65, wide: true }) +
          eyeH(c, fx, fy - 0.8, rxF + 0.5, ryF + 0.9, { lid: 0, bags: 1, look: [0, 0], pr: 0.6, wide: true });
        bpose = 'up';
        mouth = openMouth(c, `M7.6,-62.6C9.6,-63.8 13,-63.8 14.2,-62.4C15,-59 13.6,${f(g.chinY - 2.8)} 11,${f(g.chinY - 2.8)}C8.4,${f(g.chinY - 2.8)} 6.8,-59 7.6,-62.6Z`, { top: [8.2, 14, -63.8, 1.4, 3], tongue: [11, g.chinY - 3.6], lip: fc.lips });
        extra = sweatDrop(22, -84, 0.9, 25) + line('M-16,-92l-1.8,-2.4M-11,-96l-0.8,-2.6M24,-88l2,-1.6', 0.8);
        break;
      case 'angry':
        eyes = eyeH(c, nx, ny + 0.4, rxN, ryN, { lid: 0.42, tilt: -1.1, low: 0.12, bags: 2, look: [0.6, 0.4], pr: 1.15 }) +
          eyeH(c, fx, fy + 0.4, rxF, ryF, { lid: 0.42, tilt: 1, low: 0.12, bags: 1, look: [0.4, 0.4], pr: 1.05 });
        bpose = 'down';
        mouth = openMouth(c, 'M4.6,-61C7.6,-63.6 13.6,-63.8 17.4,-61.8C16.8,-58.8 13.6,-58 10.8,-58.2C7.8,-58.4 5,-58.6 4.6,-61Z', { top: [4.8, 17.4, -63.6, 2.4, 7], bot: [5.4, 16.8, -58.2, 2, 6], lip: fc.lips });
        mouth += line('M4.6,-61q-1,0.4 -1.4,1.6M17.4,-61.8q1,0.2 1.4,1.4', 0.6) + chinCrease(c, g, 0.4);
        extra = fill(ellD(6, -80, 14, 6), '#8A3A2A', 'opacity="0.16"') +
          line('M-10.4,-90q1.6,-1.6 0.6,-3.6M-9.8,-91.2l1.8,-0.4', 0.7, '#6A3A2A') + line('M9.8,-82.4l0.6,1.6', 0.6, c.sk.d);
        break;
      case 'eat':
        eyes = eyeH(c, nx, ny + 0.4, rxN, ryN, { lid: 0.55, low: 0.15, bags: 2, look: [1, 0.6], lash: fc.lash, shadow: fc.shadow }) +
          eyeH(c, fx, fy + 0.4, rxF, ryF, { lid: 0.55, low: 0.15, bags: 1, look: [0.8, 0.6], lash: fc.lash, shadow: fc.shadow });
        bpose = 'skeptic';
        // cheeks stuffed: puffed shading, lips pressed, sauce smear and crumbs
        {
          // chipmunk cheek bulging past the jaw line, the near cheek puffed
          const bulge = 'M19.4,-70C24.4,-70 26.6,-65 25.6,-61.6C24.6,-58 21,-57.2 18.4,-58.6Z';
          mouth = shade(c.d, bulge, c.sk, { lw: 1.15, off: [-1, -1], inner: fill(ellD(22.4, -66.6, 1.8, 1.2), lt(c.sk.b, 0.35), 'opacity="0.7"') });
          mouth += fill(ellD(1.4, -65, 4.6, 3.6), lt(c.sk.b, 0.3), 'opacity="0.5"') + line('M-3,-67.6C-3.6,-64.6 -2,-61.6 1.4,-60.8', 0.6, c.sk.d, 'opacity="0.8"');
          // a rib bone poking out of the mouth corner
          mouth += outl('M14.2,-62.6L19.8,-59.6L19.2,-58.4L13.6,-61.2Z', '#D8CCA8', 0.7) + outl(ellD(20.2, -58.6, 1.3, 1.1), '#D8CCA8', 0.7) + outl(ellD(19.4, -59.8, 1.1, 1), '#D8CCA8', 0.6);
          mouth += fill('M13.6,-62.8C15.4,-63.6 17,-62.4 16.6,-60.6C15,-60 13.4,-60.6 13.6,-62.8Z', '#6A2A1A');
        }
        mouth += fc.lips ? outl('M6,-61.4C8.4,-62.6 12.6,-62.8 15.2,-61.6C12.6,-59.6 8.4,-59.8 6,-61.4Z', fc.lips, 0.8) : '';
        mouth += line('M5.4,-61.4C8,-62.2 9.8,-61.4 11.4,-61.8C13,-62.2 14.6,-62.2 16,-61.2', 1.15);
        mouth += line('M7,-59.6Q11,-57.4 14.8,-59.4', 0.6, c.sk.d);
        mouth += stain(15.6, -59.6, 1.3, '#7A3A1E', c.seed + 3, 0.85, 1) + circ(6.2, -58.6, 0.45, '#A88A5A') + circ(8, -57.2, 0.35, '#A88A5A') + circ(17.6, -57.6, 0.4, '#A88A5A');
        mouth += chinCrease(c, g);
        break;
      default:
        eyes = eyeH(c, nx, ny, rxN, ryN, base) + eyeH(c, fx, fy, rxF, ryF, { ...base, bags: Math.min(1, fc.bags), look: fc.look ? [fc.look[0] * 0.8, fc.look[1]] : undefined });
        mouth = mouthH(c, fc.mouth, g);
    }
    s += eyes + brows(c, bpose) + nose(c, fc.nose, e === 'angry') + mouth + wrinkles(c, fc.wrinkles ?? 1, e) + extra;
    if (fc.stubble) s = stubble(c, g) + s;
  } else {
    let eyes = '';
    let mouth = '';
    let bpose: BrowPose = 'rest';
    let extra = '';
    switch (e) {
      case 'chomp':
        eyes = eyeZ(c, nx, ny - 0.5, rxN + 0.4, ryN + 0.4, { lid: 0.12, tilt: -0.6 }) + eyeZ(c, fx, fy - 0.5, rxF + 0.3, ryF + 0.3, { lid: 0.12, tilt: 0.6 });
        bpose = 'down';
        {
          const by = g.chinY - 2.6;
          const mp = `M2.6,-65.4C7,-67.6 15,-68 19.6,-65.6C20.8,-58 17,${f(by)} 11,${f(by)}C5,${f(by)} 1.4,-58 2.6,-65.4Z`;
          let teeth = '';
          for (let i = 0; i < 7; i++) {
            const x = 3.4 + i * 2.3;
            teeth += `<path d="M${f(x)},-67.4L${f(x + 2.2)},-67.4L${f(x + 1.1)},${f(-62.6 + (i % 2) * 0.9)}Z" fill="${i % 3 ? TEETH : mix(TEETH, TEETH_D, 0.5)}" stroke="${INK}" stroke-width="0.45"/>`;
            if (i < 6) teeth += `<path d="M${f(x + 1)},${f(by + 0.6)}L${f(x + 3.2)},${f(by + 0.6)}L${f(x + 2.1)},${f(by - 4.2 - (i % 2) * 0.9)}Z" fill="${TEETH}" stroke="${INK}" stroke-width="0.45"/>`;
          }
          mouth = inside(c.d, mp, fill(mp, MOUTH) + fill(ellD(11, by - 1.2, 5, 2.4), TONGUE) + fill(ellD(11, -61.4, 4.2, 2.6), '#1E0C08') + teeth) + line(mp, 1.15);
          mouth += drip(3.4, -60, 5, 1.5, SLIME_L) + drip(18.8, -61, 3.4, 1.2, SLIME_L) + circ(-0.6, -57.2, 0.6, SLIME_L) + circ(22.4, -58, 0.5, SLIME_L);
          mouth += line('M10.4,-68.8C7.4,-68 4.6,-67 2.4,-65.6', 0.6, c.sk.d);
        }
        break;
      case 'sleep':
        eyes = eyeShut(c, nx, ny, rxN) + eyeShut(c, fx, fy, rxF);
        bpose = 'worry';
        mouth = openMouth(c, 'M6.6,-62.2C9,-63 12.6,-63 14.4,-62.2C14.4,-59.4 12.8,-57.8 10.6,-57.8C8.4,-57.8 6.6,-59.2 6.6,-62.2Z', { top: [7.6, 13.6, -63, 1.6, 3], tongue: [10.6, -58] });
        mouth += `<path d="M8,-58.6Q7,-52 8.6,-46.6L9.4,-46.6Q8.4,-52 9.2,-58.6Z" fill="${SLIME_L}" stroke="${INK}" stroke-width="0.35" opacity="0.9"/>` + circ(9, -45.6, 1.2, SLIME_L) + line(ellD(9, -45.6, 1.2, 1.2), 0.35);
        extra = `<g transform="translate(18 -71) rotate(-30)">${fly(0, 0, 1.1, c.seed + 4).replace(/<path[^>]*opacity="0.55"\/>$/, '')}</g>`;
        break;
      case 'dazed':
        eyes = eyeSpiral(c, nx, ny, rxN + 0.2) + eyeZ(c, fx, fy + 0.6, rxF, ryF - 0.4, { lid: 0.62, tilt: 0.8, low: 0.1 });
        bpose = 'skeptic';
        mouth = openMouth(c, 'M5,-61C8,-61.8 12.8,-62.6 16.6,-63.4C16.6,-60.4 13.6,-58.6 10.6,-58.6C7.6,-58.6 5.4,-59.4 5,-61Z', { top: [8, 16.4, -63, 1.8, 4] });
        mouth += `<path d="M11.6,-59.6C11.4,-56 12.4,-52.4 15.2,-52.4C17.8,-52.4 18,-55.4 16.6,-59.6Z" fill="${TONGUE}" stroke="${INK}" stroke-width="0.8"/>` + line('M14.2,-58.6v4.2', 0.5, dk(TONGUE, 0.7));
        extra = line('M-12,-94q2,-2.6 4,0q2,2.6 4,0', 0.7, ZEYE_D) + line('M15,-97q2,-2.6 4,0', 0.7, ZEYE_D);
        break;
      default: {
        // every zombie gets its own lopsided stare
        const r = rnd(c.seed + 404);
        const kN = 0.95 + r() * 0.28;
        const kF = 0.9 + r() * 0.2;
        const lN = 0.18 + r() * 0.4;
        const lF = 0.3 + r() * 0.4;
        eyes = eyeZ(c, nx, ny - (kN - 1) * 2, rxN * kN, ryN * kN, { lid: lN, tilt: 0.3 + r() * 0.8 }) + eyeZ(c, fx, fy + 0.3, rxF * kF, ryF * kF, { lid: lF, tilt: -0.3 - r() * 0.8 });
        mouth = mouthZ(c, fc.zMouth ?? 'slack', g);
      }
    }
    s += eyes + brows(c, bpose) + nose(c, fc.nose) + mouth + wrinkles(c, fc.wrinkles ?? 1, e) + extra;
  }
  return s;
}


// ---------------------------------------------------------------- hair helpers
/** Jagged clump edge from a to b with n pointed clumps bulging to the left of a→b by `depth`. */
export function clumps(a: Pt, b: Pt, n: number, depth: number, seed = 1): string {
  const r = rnd(seed);
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const L = Math.hypot(dx, dy) || 1;
  const nx = dy / L;
  const ny = -dx / L;
  let dd = '';
  for (let k = 0; k < n; k++) {
    const t0 = k / n;
    const t1 = (k + 1) / n;
    const tm = (t0 + t1) / 2 + (r() - 0.5) * 0.15 / n;
    const dep = depth * (0.6 + r() * 0.7);
    const p1: Pt = [a[0] + dx * t1, a[1] + dy * t1];
    const pm: Pt = [a[0] + dx * tm + nx * dep, a[1] + dy * tm + ny * dep];
    dd += `Q${f(pm[0] - nx * dep * 0.1)},${f(pm[1] - ny * dep * 0.1)} ${f(pm[0])},${f(pm[1])}Q${f((pm[0] + p1[0]) / 2 + nx * dep * 0.15)},${f((pm[1] + p1[1]) / 2 + ny * dep * 0.15)} ${f(p1[0])},${f(p1[1])}`;
  }
  return dd;
}

/** Paint a hair mass: cel shade, strand lines, a dull sheen band. */
export function hairMass(c: Ctx, path: string, t: Tone, strands: string, sheen?: string): string {
  const { d, seed } = c;
  let inner = line(strands, 0.5, t.d, 'opacity="0.85"');
  // a dull sheen on the front views only (from behind it read as a pale wedge)
  if (sheen && !c.back) inner += fill(sheen, lt(t.b, 0.22), 'opacity="0.45"');
  inner += speck([-26, -110, 30, -40], 40, [t.d, lt(t.b, 0.2)], seed + 13, 0.2, 0.45, 0.4);
  return shade(d, path, t, { off: [-1.6, -1.6], inner });
}

/** Zombie bald patches: green scalp showing through thinning hair (clipped to the hair shape). */
export function balding(c: Ctx, hairPath: string, spots: [number, number, number, number][]): string {
  if (!c.z) return '';
  const { d, sk, seed } = c;
  let s = '';
  spots.forEach(([x, y, rx, ry], i) => {
    const p = blob(x, y, rx, ry, seed + i * 7, 9, 0.45);
    s += fill(p, sk.b) + fill(blob(x + rx * 0.25, y + ry * 0.3, rx * 0.7, ry * 0.55, seed + i, 7, 0.4), sk.s, 'opacity="0.5"');
    s += circ(x - rx * 0.3, y - ry * 0.1, 0.55, sk.d, 0.6) + circ(x + rx * 0.25, y + ry * 0.35, 0.4, sk.d, 0.5);
    s += line(p, 0.45, INK, 'opacity="0.55"');
    // a few surviving hairs across the patch
    const t = c.L.hair;
    s += line(`M${f(x - rx * 1.1)},${f(y + ry * 0.3)}Q${f(x - rx * 0.2)},${f(y - ry * 0.9)} ${f(x + rx * 0.6)},${f(y - ry * 0.2)}M${f(x - rx * 0.4)},${f(y + ry * 0.9)}q${f(rx * 0.5)},${f(-ry * 0.9)} ${f(rx * 1.3)},${f(-ry * 0.6)}`, 0.4, t.s);
  });
  return inside(d, hairPath, s);
}

export { op, fold, grime, hatch, smooth, fadeV, LW, LI, LF, BLOOD };
