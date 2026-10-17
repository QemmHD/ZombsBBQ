/**
 * Hair styles and hats, front (3/4 facing screen-right) and back views, in the standard head frame.
 * Zombie versions recede and fall out in patches, showing green scalp.
 */
import type { Ctx, Expr, Look } from './rig';
import { clumps, hairMass, balding } from './head';
import {
  INK, f, ellD, fill, line, outl, circ, inside, shade, speck, hatch, grime, stain, rnd, mix, dk, lt, jag, smooth, stitch, fly, fold, rip,
  BLOOD, SLIME, SLIME_L, C, tone, spot, fadeV, blob as blobP,
} from './paint';
import type { Tone, Pt } from './paint';

export type HairSet = Pick<Look, 'hairBehind' | 'hairFront' | 'hairBackBehind' | 'hairBack'>;

// ---------------------------------------------------------------- shared cap builders
interface CapO {
  /** outward volume over the skull */
  vol?: number;
  /** fringe edge: temple point → forehead point */
  temple?: Pt;
  fore?: Pt;
  fringeN?: number;
  fringeD?: number;
  /** spiky top clumps (0 = smooth) */
  topN?: number;
  topD?: number;
  nape?: number;
  /** sideburn bottom */
  side?: number;
}

/**
 * Clumpy elliptical arc (hair silhouettes): from angle a0 to a1 (degrees, SVG orientation: -90 = top),
 * n clumps whose tips bulge outward by `dep`. Returns path segments starting with L.
 */
export function arcClumps(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, n: number, dep: number, seed: number): string {
  const r = rnd(seed);
  const P = (a: number, k: number): Pt => [cx + Math.cos((a * Math.PI) / 180) * rx * k, cy + Math.sin((a * Math.PI) / 180) * ry * k];
  const p0 = P(a0, 1);
  let dd = `L${f(p0[0])},${f(p0[1])}`;
  for (let i = 0; i < n; i++) {
    const t0 = a0 + ((a1 - a0) * i) / n;
    const t1 = a0 + ((a1 - a0) * (i + 1)) / n;
    // tips lean toward a1 (hair flows from the face to the back) and are pointed
    const tm = t0 + (t1 - t0) * (0.78 + (r() - 0.5) * 0.2);
    const k = 1 + (dep / Math.max(rx, ry)) * (0.5 + r() * 0.8);
    const tip = P(tm, k);
    const e = P(t1, 1);
    const c1 = P(t0 + (t1 - t0) * 0.55, 1 + (k - 1) * 0.55);
    const c2 = P(tm + (t1 - tm) * 0.6, 1 + (k - 1) * 0.15);
    dd += `Q${f(c1[0])},${f(c1[1])} ${f(tip[0])},${f(tip[1])}Q${f(c2[0])},${f(c2[1])} ${f(e[0])},${f(e[1])}`;
  }
  return dd;
}

function capFront(o: CapO, seed: number): string {
  const v = o.vol ?? 2.4;
  const tp = o.temple ?? [-4.6, -85.4];
  const fr = o.fore ?? [21.2, -88];
  const side = o.side ?? -68.6;
  const nape = o.nape ?? -63;
  let dd = `M-6.6,${f(side)}C-5.8,${f(side - 5)} ${f(tp[0] - 0.8)},${f(tp[1] + 4)} ${f(tp[0])},${f(tp[1])}`;
  dd += (o.fringeN ?? 0) > 0 ? clumps(tp, fr, o.fringeN!, -(o.fringeD ?? 3), seed) : `Q${f((tp[0] + fr[0]) / 2)},${f(Math.min(tp[1], fr[1]) - 2.4)} ${f(fr[0])},${f(fr[1])}`;
  // outer silhouette: clumpy arc from the front-top over the crown to the back
  const n = o.topN ?? 0;
  const rx = 20.4 + v;
  const ry = 21 + v;
  dd += `Q${f(fr[0] + 1.6)},${f(fr[1] - 1.6)} ${f(1 + Math.cos(-0.6) * rx)},${f(-77 + Math.sin(-0.6) * ry)}`;
  dd += n > 0 ? arcClumps(1, -77, rx, ry, -34, -205, n + 3, o.topD ?? 2.6, seed + 3) : arcClumps(1, -77, rx, ry, -34, -205, 8, 2.2, seed + 3);
  dd += `C-21.4,-69 -20.6,${f(nape - 2)} -17.6,${f(nape)}`;
  dd += `C-14,${f(nape - 1.4)} -10,${f(side + 1.6)} -6.6,${f(side)}Z`;
  return dd;
}

function capBack(o: { vol?: number; nape?: number; napeN?: number; topN?: number; topD?: number }, seed: number): string {
  const v = o.vol ?? 2.4;
  const nape = o.nape ?? -57.6;
  const rx = 20.8 + v;
  const ry = 21.6 + v;
  const n = o.topN ?? 0;
  let dd = `M-16.8,${f(nape)}`;
  dd += clumps([-16.8, nape], [12, nape - 2.4], o.napeN ?? 7, -2.4, seed);
  dd += 'C12.6,-66 12.8,-73 13.8,-79';
  dd += arcClumps(0.6, -78, rx, ry, -17, -198, n > 0 ? n + 3 : 9, n > 0 ? o.topD ?? 2.4 : 2.4, seed + 2);
  dd += `C${f(0.6 - rx - 0.2)},-68 -20.4,${f(nape - 4)} -16.8,${f(nape)}Z`;
  return dd;
}

/** Dark tapered clump shadows rising from an edge (hair texture). Negative len points down. */
export function wedges(pts: [number, number, number][], col: string, w = 1.6, dir = -1, lean = 0.3): string {
  let dd = '';
  for (const [x, y, len] of pts) dd += `M${f(x - w / 2)},${f(y)}Q${f(x + lean * len * 0.3)},${f(y + dir * len * 0.6)} ${f(x + lean * len)},${f(y + dir * len)}Q${f(x + lean * len * 0.5)},${f(y + dir * len * 0.5)} ${f(x + w / 2)},${f(y)}Z`;
  return fill(dd, col, 'opacity="0.75"');
}

/** Back-view fringe band around the back of the head at ear level (bald tops, hair under hats). */
function horseshoeBack(top: number, seed: number, nape = -57.8, wisp = 1.6): string {
  return (
    `M12,${f(nape - 2.4)}C12.4,-66 12.6,-73 13.4,-78.6C14,${f(top + 4)} 14.8,${f(top + 2)} 15.8,${f(top + 1)}` +
    (wisp > 0
      ? clumps([15.8, top + 1], [4, top + 3.6], 2, -wisp, seed) + clumps([4, top + 3.6], [-9, top + 3.4], 2, -wisp * 0.7, seed + 1) + clumps([-9, top + 3.4], [-19.4, top + 2], 2, -wisp, seed + 2)
      : `Q-2,${f(top + 6.4)} -19.4,${f(top + 2)}`) +
    `C-21,${f(top + 10)} -20.6,${f(nape - 5)} -16.8,${f(nape)}` + clumps([-16.8, nape], [12, nape - 2.4], 7, -2.2, seed + 3) + 'Z'
  );
}

const NAPE_W: [number, number, number][] = [[-15, -57.4, 7], [-9, -57, 9], [-3, -57.4, 7], [3, -58, 9], [8.6, -59, 6], [-19, -70, 6]];

const STRANDS_F =
  'M8,-100Q2,-94 -1.6,-86.6M12,-99Q10,-93 7,-86.6M16,-97Q16,-92 14,-87.4M2,-101Q-6,-96 -10,-86M-6,-100Q-14,-94 -17,-82M-12,-97Q-19,-88 -19.4,-74';
const STRANDS_B =
  'M-3,-90Q-10,-84 -14,-66M-3,-90Q-2,-80 -4,-64M-3,-90Q6,-82 6,-66M-3,-90Q-14,-94 -19,-84M-3,-90Q4,-98 14,-94';

function whorl(t: Tone): string {
  return line('M-4.6,-89q1.6,-3 4.4,-1.6M-2,-91.6q2.6,0.4 2.4,3', 0.55, t.d, 'opacity="0.8"');
}

// ---------------------------------------------------------------- styles
/** Messy clumped short hair (joe, you, teen). */
export function messy(t: Tone, o: { fringeLong?: boolean; vol?: number } = {}): HairSet {
  return {
    hairFront: (c) => {
      const cap = capFront({ vol: o.vol ?? 2.6, fringeN: 5, fringeD: o.fringeLong ? 5.6 : 3.4, topN: 5, topD: 2.8, fore: o.fringeLong ? [21.6, -86] : [21.2, -88] }, c.seed);
      let s = hairMass(c, cap, t, STRANDS_F, 'M-12,-96Q2,-101 14,-97Q2,-98.4 -12,-94Z');
      if (o.fringeLong) s += line('M2,-88Q6,-83 8,-80.6M10,-88.4Q13,-84 14.6,-81.6', 0.5, t.d);
      s += balding(c, cap, [[3, -96, 6.4, 3.6], [-11, -88, 3.6, 4.4], [12, -91, 3, 2.4]]);
      return s;
    },
    hairBack: (c) => {
      const cap = capBack({ vol: o.vol ?? 2.6, topN: 4, topD: 2.8 }, c.seed);
      return hairMass(c, cap, t, STRANDS_B, 'M-14,-92Q0,-99 12,-95Q0,-96 -14,-89Z') + inside(c.d, cap, wedges(NAPE_W, t.d, 1.8)) + whorl(t) + balding(c, cap, [[-3, -92, 7, 5], [9, -80, 3, 3.4]]);
    },
  };
}

/** Comb-over across a bald dome (accountant). */
export function combover(t: Tone): HairSet {
  return {
    hairFront: (c) => {
      const band = `M-6.6,-68.6C-6,-74 -6.4,-80 -7.6,-85C-11,-88.6 -17,-89.4 -20.6,-85C-22.6,-79 -21.6,-69 -17.6,-63` + clumps([-17.6, -63], [-6.6, -68.6], 2, -1.4, c.seed) + 'Z';
      let s = hairMass(c, band, t, 'M-9,-84Q-14,-80 -15,-70M-13,-86Q-18,-80 -19,-72', undefined);
      // bald dome sheen
      s += fill(ellD(2, -93, 9, 3.2), lt(c.sk.b, 0.5), 'opacity="0.45"');
      // a few greasy strands combed across
      const strands = c.z ? [[-15, -88, 4, -95, 13, -93]] : [[-16, -87, 2, -97.6, 16, -95], [-16.6, -85, 1, -95.4, 18, -92.4], [-15.4, -89, 4, -99, 14, -97.4], [-17, -83, -2, -92, 19, -89.4]];
      for (const [x1, y1, cx, cy, x2, y2] of strands) {
        s += line(`M${f(x1)},${f(y1)}Q${f(cx)},${f(cy)} ${f(x2)},${f(y2)}`, 1.5, INK) + line(`M${f(x1)},${f(y1)}Q${f(cx)},${f(cy)} ${f(x2)},${f(y2)}`, 0.9, t.b);
      }
      s += balding(c, band, [[-15, -80, 3, 3.4]]);
      return s;
    },
    hairBack: (c) => {
      const band = horseshoeBack(-84, c.seed, -57.8, 0);
      let s = hairMass(c, band, t, 'M-19,-80Q-18,-70 -15,-63M-12,-80Q-11,-70 -8,-62M-4,-80Q-3,-70 -1,-62M4,-81Q5,-72 6,-63', 'M-20,-74Q-6,-71 9,-74Q-6,-73 -20,-72Z') + inside(c.d, band, wedges([[-15, -57.4, 7], [-9, -57, 8], [-3, -57.4, 7], [3, -58, 8], [8.6, -59, 6], [-18, -82, -5], [-8, -80, -6], [2, -80.6, -5], [12, -82, -5]], t.d, 1.8));
      s += fill(ellD(-2, -94, 9, 3), lt(c.sk.b, 0.45), 'opacity="0.4"');
      for (const [x1, y1, x2, y2] of [[-18, -85, 18, -88], [-19, -88, 16, -93]]) s += line(`M${f(x1)},${f(y1)}Q0,${f(y2 - 6)} ${f(x2)},${f(y2)}`, 1.4) + line(`M${f(x1)},${f(y1)}Q0,${f(y2 - 6)} ${f(x2)},${f(y2)}`, 0.8, t.b);
      s += balding(c, band, [[-6, -70, 4, 3.4]]);
      return s;
    },
  };
}

/** Helmet hair swept back, optional receding widow's peak (politician, ceo, critic). */
export function slick(t: Tone, o: { recede?: number; pomp?: number; grey?: string } = {}): HairSet {
  const rc = o.recede ?? 0;
  const pp = o.pomp ?? 0;
  return {
    hairFront: (c) => {
      const cap =
        `M-6.6,-69C-5.8,-75 ${f(-4.8 - rc * 0.4)},${f(-82 - rc)} ${f(-1.6 - rc * 0.4)},${f(-87.6 - rc)}` +
        `C${f(3 + rc)},${f(-90.6 - rc * 0.4)} ${f(7)},${f(-92 + rc * 0.6)} ${f(9.6)},${f(-90 - rc * 1.4)}` +
        `C${f(13)},${f(-91.6 - rc)} 18,${f(-91.4 - rc * 0.5)} 21.4,${f(-89 - rc * 0.4)}` +
        `C${f(22.8 + pp)},${f(-91.6 - pp)} ${f(21.6 + pp * 0.8)},${f(-99 - pp)} 14,${f(-102 - pp)}` +
        `C4,${f(-105.4 - pp)} -12,-103 -18.4,-94C-22.6,-88 -22.4,-72 -17.8,-63.6C-13.6,-65.2 -10,-66.8 -6.6,-69Z`;
      let s = hairMass(c, cap, t, `M20,-92Q6,-98 -12,-96M18,-96Q4,-101 -14,-92M10,-101Q-4,-103 -18,-88M14,-90Q2,-94 -16,-84M4,-89Q-6,-90 -18,-78`, `M-8,-99Q6,-103 18,-96Q6,-99.6 -8,-97Z`);
      if (o.grey) s += inside(c.d, cap, fill(ellD(-14, -72, 9, 14), spot(c.d, o.grey, 0.85)) + hatch([-20, -84, -8, -64], 16, lt(o.grey, 0.4), c.seed, 1.6, 1.4, 0.35, 0.7));
      s += balding(c, cap, [[4, -98, 7, 3.6], [-12, -84, 3.4, 4]]);
      return s;
    },
    hairBack: (c) => {
      const cap = capBack({ vol: 2.2 + pp * 0.4, napeN: 4 }, c.seed);
      let s = hairMass(c, cap, t, 'M16,-94Q0,-96 -20,-84M14,-88Q-2,-90 -21,-76M10,-80Q-6,-80 -20,-68M8,-72Q-6,-70 -16,-62', 'M-14,-94Q0,-100 12,-96Q0,-97 -14,-91Z');
      if (o.grey) s += inside(c.d, cap, fill('M-30,-84H30V-56H-30Z', fadeV(c.d, o.grey, 0, 0.75)));
      s += balding(c, cap, [[-2, -94, 8, 5]]);
      return s;
    },
  };
}

/** Close crop / buzz (stipple over the skull). */
export function buzz(t: Tone): HairSet {
  return {
    hairFront: (c) => {
      const cap = `M-6.6,-69C-5.6,-75 -5,-82 -2.6,-87.6C4,-89.6 14,-90 20.6,-88C21.4,-94 18,-98.4 10,-98.6C0,-99.4 -14,-97 -18.6,-88C-20.4,-80 -19.6,-70 -16.4,-64C-12.6,-65.4 -9.6,-67 -6.6,-69Z`;
      let s = inside(c.d, cap, fill(cap, t.b, 'opacity="0.75"') + speck([-22, -100, 22, -60], 160, [t.d, t.s], c.seed + 2, 0.18, 0.35, 0.9));
      s += line(`M-6.6,-69C-5.6,-75 -5,-82 -2.6,-87.6C4,-89.6 14,-90 20.6,-88`, 0.45, t.d, 'opacity="0.8"');
      s += balding(c, cap, [[2, -95, 6, 3], [-12, -84, 3, 3]]);
      return s;
    },
    hairBack: (c) => {
      const cap = `M-17,-62C-8,-63.6 4,-64 10.6,-63C10.8,-70 11,-76 13.6,-79.4C17,-82 19.6,-84 20.4,-88C17,-97 8,-98.6 1,-98.6C-10,-98 -19,-92 -19.8,-80C-20.2,-72 -19,-66 -17,-62Z`;
      return inside(c.d, cap, fill(cap, t.b, 'opacity="0.75"') + speck([-22, -100, 22, -60], 150, [t.d, t.s], c.seed + 2, 0.18, 0.35, 0.9)) + balding(c, cap, [[-4, -90, 6, 4]]);
    },
  };
}

/** Bald on top with tufts over the ears and a back fringe (senior). */
export function baldFringe(t: Tone): HairSet {
  return {
    hairFront: (c) => {
      const band = `M-6.4,-69C-5.6,-73 -6,-77 -7,-80` + clumps([-7, -80], [-12, -85], 2, 2.6, c.seed) + clumps([-12, -85], [-21.6, -82], 2, -2.6, c.seed + 2) + `C-23,-76 -22,-68 -17.6,-63C-13.6,-64.6 -10,-66.6 -6.4,-69Z`;
      let s = hairMass(c, band, t, 'M-9,-82Q-13,-76 -14,-68M-15,-84Q-19,-78 -19,-70');
      s += fill(ellD(2, -92, 10, 3.6), lt(c.sk.b, 0.5), 'opacity="0.45"');
      s += line('M2,-97q-2,-3 0.8,-5.2M5,-97q1,-3.4 3.4,-3.6M-1,-96.6q-3,-2 -2.2,-4.6', 0.5, t.d);
      s += speck([-16, -98, 18, -86], 14, [c.sk.d], c.seed + 4, 0.4, 0.9, 0.25);
      return s;
    },
    hairBack: (c) => {
      const band = horseshoeBack(-79, c.seed, -58, 0);
      let s = fill(ellD(-2, -93, 9, 3), lt(c.sk.b, 0.45), 'opacity="0.4"') + line('M-15,-76.6q-1.4,-2.6 0.4,-4.6M-7,-75.4q-0.6,-3 1.2,-4.4M3,-75.6q0.4,-3 2.6,-4M10.6,-77q1,-2.4 3,-3', 0.55, t.s);
      s += hairMass(c, band, t, 'M-19,-78Q-18,-70 -15,-63M-12,-78Q-11,-70 -8,-62M-4,-77Q-3,-70 -1,-62M4,-78Q5,-72 6,-63') + inside(c.d, band, wedges([[-15, -57.4, 6], [-9, -57, 7], [-3, -57.4, 6], [3, -58, 7], [8.6, -59, 5]], t.d, 1.8));
      return s;
    },
  };
}

/** Pulled-back hair with a messy bun (yoga top bun, nurse low bun). */
export function bun(t: Tone, o: { low?: boolean } = {}): HairSet {
  const B: Pt = o.low ? [-17.6, -80] : [-6, -101.6];
  const R = o.low ? 5.4 : 5.8;
  const bunP = (c: Ctx) => {
    const p = jag(B[0], B[1], R, R * 0.9, c.seed + 9, 12, 0.08);
    let s = hairMass(c, smooth([[B[0] - R, B[1]], [B[0] - R * 0.6, B[1] - R * 0.85], [B[0] + R * 0.3, B[1] - R], [B[0] + R, B[1] - R * 0.2], [B[0] + R * 0.7, B[1] + R * 0.8], [B[0] - R * 0.5, B[1] + R * 0.9]]), t, `M${f(B[0] - R * 0.7)},${f(B[1] - 1)}Q${f(B[0])},${f(B[1] - R * 1.1)} ${f(B[0] + R * 0.8)},${f(B[1] - 0.4)}M${f(B[0] - R * 0.6)},${f(B[1] + 2)}Q${f(B[0])},${f(B[1] - 2)} ${f(B[0] + R * 0.7)},${f(B[1] + 2.2)}`);
    s += line(`M${f(B[0] + R * 0.7)},${f(B[1] - R * 0.5)}q1.6,-0.8 2.2,-2.6M${f(B[0] - R * 0.9)},${f(B[1] - R * 0.2)}q-1.4,-0.6 -1.8,-2.2`, 0.45, t.d);
    void p;
    return s;
  };
  return {
    hairBehind: o.low ? (c) => bunP(c) : undefined,
    hairFront: (c) => {
      const cap = `M-6.6,-69C-5.6,-76 -4.6,-82 -2,-87C4,-89.6 14,-90.6 21,-88.6C23.4,-94 20,-99.6 12,-100.8C2,-102.6 -12,-101 -18,-92C-21.6,-86 -21.6,-72 -17.6,-64C-13.6,-65.6 -10,-67 -6.6,-69Z`;
      let s = hairMass(c, cap, t, 'M20,-89Q6,-96 -10,-99M14,-89.6Q2,-94 -14,-95M6,-89Q-6,-90 -18,-86M-2,-87Q-12,-84 -18,-74', 'M-12,-96Q2,-100 14,-97Q2,-98.4 -12,-94Z');
      s += line('M20,-88q2,3 1,6M-3,-87q-1.6,3.6 -0.6,7', 0.45, t.s);
      if (!o.low) s += bunP(c);
      s += balding(c, cap, [[5, -95, 6, 3.4], [-13, -86, 3, 3.6]]);
      return s;
    },
    hairBack: (c) => {
      const cap = capBack({ vol: 1.8, napeN: 4 }, c.seed);
      let s = hairMass(c, cap, t, o.low ? 'M14,-92Q0,-90 -14,-82M12,-84Q0,-82 -14,-80M8,-70Q-2,-76 -14,-78M-6,-62Q-10,-72 -16,-78' : 'M-6,-62Q-8,-80 -8,-98M6,-64Q0,-82 -6,-98M-16,-68Q-12,-86 -10,-98M14,-82Q4,-90 -6,-99');
      s += o.low ? bunP({ ...c, seed: c.seed + 1 }) : bunP(c);
      s += balding(c, cap, [[-2, -86, 6, 5]]);
      return s;
    },
  };
}

/** High ponytail (cheerleader) with a bow / scrunchie colour. */
export function pony(t: Tone, tie: Tone): HairSet {
  const tail = (c: Ctx, back: boolean) => {
    const d = back
      ? 'M-6,-98C-10,-92 -12,-80 -8,-68C-6,-62 -2,-60 -0.6,-62C-2,-66 -0.6,-74 0,-82C0.6,-90 -1,-96 -2,-99Z'
      : 'M-14,-99C-20,-100 -26,-94 -27,-86C-28,-78 -25.6,-70 -22,-66C-23.2,-72 -22,-78 -19.6,-82C-17.6,-86 -15,-92 -12,-96Z';
    return hairMass(c, d, t, back ? 'M-4,-94Q-7,-82 -5,-66M-2,-92Q-3,-80 -2,-66' : 'M-16,-98Q-24,-92 -24,-76M-14,-96Q-20,-90 -22,-78');
  };
  const bow = (x: number, y: number, c: Ctx) =>
    shade(c.d, `M${f(x)},${f(y)}l-4.4,-3l0.4,6.4Z`, tie, { lw: 0.8 }) + shade(c.d, `M${f(x)},${f(y)}l4.2,-3.4l0.2,6.6Z`, tie, { lw: 0.8 }) + outl(ellD(x, y, 1.4, 1.4), tie.s, 0.7);
  return {
    hairBehind: (c) => tail(c, false),
    hairFront: (c) => {
      const cap = `M-6.6,-69C-5.6,-76 -4.6,-82 -2,-87C4,-89.6 14,-90.6 21,-88.6C23.4,-94 20,-99.6 12,-100.8C2,-102.6 -12,-101 -18,-92C-21.6,-86 -21.6,-72 -17.6,-64C-13.6,-65.6 -10,-67 -6.6,-69Z`;
      let s = hairMass(c, cap, t, 'M20,-89Q6,-96 -12,-98M14,-89.6Q2,-94 -14,-96M6,-89Q-6,-90 -17,-90M-2,-87Q-12,-84 -18,-74', 'M-12,-96Q2,-100 14,-97Q2,-98.4 -12,-94Z');
      s += bow(-13.6, -98.6, c);
      s += balding(c, cap, [[5, -95, 6, 3.4], [-12, -86, 3, 3.6]]);
      return s;
    },
    hairBack: (c) => {
      const cap = capBack({ vol: 1.6, napeN: 4 }, c.seed);
      return hairMass(c, cap, t, 'M-4,-62Q-4,-80 -4,-98M8,-64Q4,-82 -2,-98M-16,-68Q-10,-86 -6,-98') + tail(c, true) + bow(-3, -99, c) + balding(c, cap, [[8, -86, 4, 4]]);
    },
  };
}

/** Shoulder-length bob with bangs (jane). */
export function bob(t: Tone): HairSet {
  return {
    hairBehind: (c) => hairMass(c, 'M-18,-84C-22,-76 -23,-64 -21,-56C-14,-53.6 -8,-54 -4,-56L-6,-70Z', t, 'M-19,-76Q-20,-66 -18,-57M-14,-72Q-14,-64 -12,-56'),
    hairFront: (c) => {
      const cap =
        `M-2.6,-56.6C-6,-60 -6.6,-66 -6,-72C-5.4,-78 -4.6,-82 -3.6,-85.2` + clumps([-3.6, -85.2], [20.6, -86.8], 4, -3, c.seed) +
        `C23.6,-90 23,-99 14,-102C4,-105 -12,-103 -18.6,-94C-23,-86 -22.4,-70 -21,-58C-15,-55 -8,-54.8 -2.6,-56.6Z`;
      let s = hairMass(c, cap, t, 'M16,-100Q8,-94 4,-87M8,-101Q0,-94 -1,-86M0,-101Q-8,-90 -9,-70M-8,-100Q-16,-88 -16,-60M-14,-98Q-20,-86 -19,-62', 'M-12,-97Q2,-102 15,-98Q2,-99.6 -12,-95Z');
      s += balding(c, cap, [[5, -97, 6, 3.4]]);
      return s;
    },
    hairBack: (c) => {
      const cap = `M-21,-56` + clumps([-21, -56], [10.6, -57], 6, -1.4, c.seed) + `C11.4,-64 11,-72 13.4,-79C17,-82 21,-83 21.6,-87` + arcClumps(0, -84, 22, 19, -8, -187, 7, 2.6, c.seed + 5) + `C-23.4,-74 -23,-64 -21,-56Z`;
      return hairMass(c, cap, t, 'M-3,-96Q-10,-84 -14,-58M-3,-96Q-3,-80 -4,-58M-3,-96Q6,-80 6,-58M-3,-96Q-16,-92 -20,-60', 'M-14,-95Q0,-101 12,-97Q0,-98 -14,-92Z') + balding(c, cap, [[-2, -92, 7, 5]]);
    },
  };
}

/** Curly cloud (grandma's perm). */
export function perm(t: Tone): HairSet {
  const curls = (c: Ctx, pts: [number, number, number][]) => {
    const { d } = c;
    let u = '';
    for (const [x, y, r] of pts) u += ellD(x, y, r, r * 0.9);
    // outline the union (stroke under, fill over), then shade each curl and add curl hints
    let s = pts.map(([x, y, r]) => `<path d="${ellD(x, y, r, r * 0.9)}" fill="none" stroke="${INK}" stroke-width="2.3"/>`).join('');
    s += pts.map(([x, y, r]) => fill(ellD(x, y, r, r * 0.9), t.b)).join('');
    let inner = pts.map(([x, y, r]) => fill(ellD(x + r * 0.35, y + r * 0.35, r * 0.7, r * 0.55), t.s, 'opacity="0.75"')).join('');
    inner += pts.map(([x, y, r]) => line(`M${f(x - r * 0.5)},${f(y + r * 0.2)}q${f(r * 0.3)},${f(-r * 0.7)} ${f(r * 0.8)},${f(-r * 0.2)}`, 0.45, t.d, 'opacity="0.8"')).join('');
    inner += speck([-26, -106, 26, -56], 40, [t.d, lt(t.b, 0.3)], c.seed + 7, 0.2, 0.45, 0.5);
    s += `<g clip-path="url(#${d.clipId(u)})">${inner}</g>`;
    if (c.z) s += pts.filter((_, i) => i % 7 === 3).map(([x, y, r]) => fill(blobP(x, y, r * 0.8, r * 0.7, c.seed + x), c.sk.b) + line(blobP(x, y, r * 0.8, r * 0.7, c.seed + x), 0.45, INK, 'opacity="0.6"') + circ(x, y, 0.45, c.sk.d)).join('');
    return s;
  };
  const front: [number, number, number][] = [];
  const back: [number, number, number][] = [];
  const r = rnd(41);
  // a dense cap of small curls
  for (let a = -200; a <= -20; a += 14) {
    const rad = (a * Math.PI) / 180;
    front.push([1 + Math.cos(rad) * 20.6, -78 + Math.sin(rad) * 20.4, 3 + r() * 0.8]);
  }
  for (let a = -185; a <= -40; a += 18) {
    const rad = (a * Math.PI) / 180;
    front.push([0 + Math.cos(rad) * 14, -80 + Math.sin(rad) * 13, 3.2 + r() * 0.6]);
  }
  front.push([-17, -66, 3], [-14, -70, 3.2], [-6, -86, 3.2], [3, -87, 3], [12, -87.6, 3], [-12, -80, 3.4], [-17, -74, 3.4]);
  for (let a = -200; a <= 20; a += 13) {
    const rad = (a * Math.PI) / 180;
    back.push([0.6 + Math.cos(rad) * 20.6, -78 + Math.sin(rad) * 21, 3.1 + r() * 0.8]);
  }
  for (let y = -94; y <= -62; y += 6) for (let x = -16; x <= 10; x += 6.4) back.push([x + ((y / 6) % 2) * 2.2, y, 3.4 + r() * 0.6]);
  return { hairFront: (c) => curls(c, front), hairBack: (c) => curls(c, back) };
}

/** Big glamorous waves, side part (moviestar). */
export function waves(t: Tone): HairSet {
  return {
    hairBehind: (c) => hairMass(c, 'M-16,-90C-26,-84 -28,-70 -25,-60C-23,-54 -18,-50 -12,-52C-16,-56 -15,-60 -12,-62C-8,-60 -4,-60 -2,-62L-6,-80Z', t, 'M-22,-80Q-26,-68 -20,-56M-16,-76Q-18,-66 -14,-58', 'M-24,-76Q-26,-68 -22,-62Q-24,-70 -22,-76Z'),
    hairFront: (c) => {
      const cap =
        `M-3,-60C-7,-64 -6.6,-70 -5.4,-76C-4.4,-81 -2,-85 2,-88C8,-91 14,-90 18.6,-87.6C22.6,-85.6 24.6,-82 24,-78C26.6,-84 26,-92 22,-98` +
        `C16,-105 4,-106 -6,-104C-16,-102 -22,-96 -23,-86C-24,-78 -23,-66 -18,-58C-14,-55 -8,-57 -3,-60Z`;
      let s = hairMass(c, cap, t, 'M22,-96Q10,-96 4,-88M18,-100Q4,-100 -2,-88M8,-103Q-6,-98 -9,-80M-2,-104Q-14,-96 -16,-74M-10,-102Q-20,-92 -20,-66', 'M-10,-100Q4,-104 18,-98Q6,-100 -10,-97ZM-18,-84Q-20,-74 -16,-64Q-18,-74 -16,-84Z');
      s += line('M18.6,-87.6C21,-86 23,-84 24,-78', 0.7, t.d);
      s += balding(c, cap, [[6, -99, 6, 3.4], [-14, -80, 3, 4]]);
      return s;
    },
    hairBack: (c) => {
      const cap = `M-24,-56C-20,-52 -12,-51 -6,-53C0,-51 8,-53 11,-58C11.4,-66 11,-74 13.4,-79C17,-82 22,-83 22.6,-88` + arcClumps(-0.5, -85, 24, 20.5, -8, -187, 7, 2.8, c.seed + 5) + `C-26,-74 -26,-62 -24,-56Z`;
      return hairMass(c, cap, t, 'M-3,-98Q-14,-86 -18,-56M-3,-98Q-4,-80 -8,-54M-3,-98Q6,-80 4,-54M-3,-98Q-20,-94 -23,-62', 'M-16,-96Q0,-102 14,-97Q0,-99 -16,-92Z') + balding(c, cap, [[0, -92, 8, 5]]);
    },
  };
}

/** Mullet: short on top, long at the back (champ). */
export function mullet(t: Tone): HairSet {
  return {
    hairBehind: (c) => hairMass(c, 'M-14,-76C-22,-74 -24,-62 -22,-52C-18,-48 -12,-48 -8,-50C-10,-56 -8,-62 -6,-66Z', t, 'M-20,-68Q-21,-58 -18,-50M-14,-68Q-15,-58 -12,-50'),
    hairFront: (c) => {
      const cap = capFront({ vol: 2, fringeN: 4, fringeD: 2.6, topN: 4, topD: 2.2, nape: -54, side: -66 }, c.seed);
      return hairMass(c, cap, t, STRANDS_F + 'M-16,-74Q-18,-64 -16,-56', 'M-12,-96Q2,-101 14,-97Q2,-98.4 -12,-94Z') + balding(c, cap, [[3, -96, 6, 3.4]]);
    },
    hairBack: (c) => {
      const cap = capBack({ vol: 2, nape: -50, napeN: 6 }, c.seed);
      return hairMass(c, cap, t, STRANDS_B + 'M-10,-70Q-11,-60 -10,-52M2,-70Q2,-60 1,-52', 'M-14,-92Q0,-99 12,-95Q0,-96 -14,-89Z') + balding(c, cap, [[-3, -92, 7, 5]]);
    },
  };
}

/** Sumo topknot: slicked black hair, chonmage folded forward on top. */
export function topknot(t: Tone): HairSet {
  const knot = (c: Ctx, back: boolean) => {
    const k = back ? 'M-6,-99C-6,-104 0,-108 6,-106C9,-105 9,-102 6,-101C3,-100 0,-100 -1,-98Z' : 'M-6,-99C-5,-105 2,-108.6 9,-106.6C12,-105.6 12,-102.6 9.4,-101.6C6,-100.6 2,-100.6 0,-98Z';
    return hairMass(c, k, t, back ? 'M-3,-101Q2,-105 7,-104' : 'M-3,-101Q3,-106 9,-104') + line(back ? 'M-4.6,-101l2.4,-2' : 'M-4,-100.6l2.4,-2.2', 1.4, '#C8C0A8');
  };
  return {
    hairFront: (c) => {
      const cap = `M-6.6,-69C-5.8,-76 -4.6,-82 -2.6,-87.6C4,-90 14,-90.6 20.8,-88.4C21.8,-95 17,-100.4 9,-100.6C-2,-101 -14,-99 -18.6,-90C-20.6,-82 -20,-70 -16.6,-63.6C-12.8,-65.2 -9.8,-67 -6.6,-69Z`;
      return hairMass(c, cap, t, 'M20,-89Q6,-96 -6,-99M12,-89.6Q0,-94 -12,-96M2,-88Q-8,-88 -17,-84', 'M-10,-97Q2,-100 14,-97Q2,-98.4 -10,-95Z') + knot(c, false) + balding(c, cap, [[-10, -86, 3.6, 4]]);
    },
    hairBack: (c) => {
      const cap = capBack({ vol: 1.2, napeN: 4 }, c.seed);
      return hairMass(c, cap, t, 'M-4,-62Q-4,-80 -2,-98M8,-64Q4,-82 0,-98M-16,-68Q-10,-86 -4,-98', 'M-14,-92Q0,-99 12,-95Q0,-96 -14,-89Z') + knot(c, true) + balding(c, cap, [[8, -80, 4, 4]]);
    },
  };
}

/** Undercut sides with a man-bun (hipster). */
export function manbun(t: Tone): HairSet {
  const bunAt = (c: Ctx, x: number, y: number) =>
    hairMass(c, smooth([[x - 5, y], [x - 3, y - 4.6], [x + 2, y - 5], [x + 5, y - 1], [x + 3.4, y + 3.6], [x - 2.6, y + 3.6]]), t, `M${f(x - 3.6)},${f(y - 1)}Q${f(x)},${f(y - 5)} ${f(x + 4)},${f(y - 0.6)}M${f(x - 3)},${f(y + 2)}Q${f(x)},${f(y - 1.4)} ${f(x + 3.6)},${f(y + 2)}`) +
    line(`M${f(x - 4)},${f(y + 2.6)}Q${f(x)},${f(y + 4.4)} ${f(x + 3.8)},${f(y + 2.4)}`, 1.2, '#3A3428');
  return {
    hairFront: (c) => {
      const sides = `M-6.6,-69C-5.6,-75 -5,-82 -4,-86L-17,-90C-20.4,-82 -19.6,-70 -16.4,-64C-12.6,-65.4 -9.6,-67 -6.6,-69Z`;
      let s = inside(c.d, sides, fill(sides, t.s, 'opacity="0.7"') + speck([-22, -92, 0, -60], 70, [t.d], c.seed, 0.18, 0.32, 0.9));
      const top = `M-4,-86C2,-90 12,-91.6 21,-89C23,-95 19,-101 10,-102C0,-103 -10,-102 -15,-98L-17,-90Z`;
      s += hairMass(c, top, t, 'M20,-90Q6,-97 -10,-100M14,-90Q0,-96 -12,-98M6,-89Q-4,-92 -14,-94', 'M-8,-99Q4,-102 15,-98Q4,-99.6 -8,-97Z');
      s += bunAt(c, -13, -101);
      s += balding(c, top, [[5, -96, 5, 3]]);
      return s;
    },
    hairBack: (c) => {
      const cap = `M-17,-62C-8,-63.6 4,-64 10.6,-63C10.8,-70 11,-76 13.6,-79.4C17,-82 19.6,-84 20.4,-88C17,-97 8,-98.6 1,-98.6C-10,-98 -19,-92 -19.8,-80C-20.2,-72 -19,-66 -17,-62Z`;
      let s = inside(c.d, cap, fill(cap, t.s, 'opacity="0.7"') + speck([-22, -100, 22, -60], 120, [t.d], c.seed, 0.18, 0.32, 0.9));
      const top = `M-18,-86C-8,-90 10,-90 20,-86C19,-97 10,-103 0,-103C-10,-103 -17,-97 -18,-86Z`;
      s += hairMass(c, top, t, 'M18,-88Q6,-96 -4,-100M-16,-88Q-8,-96 -4,-100M2,-88Q0,-96 -4,-100');
      s += bunAt(c, -4, -102);
      return s;
    },
  };
}

/** Long straight hair, centre part, dyed tips (influencer). */
export function longHair(t: Tone, tip: string): HairSet {
  const tips = (c: Ctx, p: string) => inside(c.d, p, fill('M-40,-76H40V0H-40Z', fadeV(c.d, tip, 0, 0.85)));
  return {
    hairBehind: (c) => {
      const p = 'M-16,-92C-26,-84 -27,-66 -25,-46C-20,-43 -10,-44 -4,-46C-4,-56 -4,-70 -6,-80Z';
      return hairMass(c, p, t, 'M-22,-80Q-24,-62 -22,-46M-16,-80Q-17,-62 -14,-46') + tips(c, p) + line(p, 1.1);
    },
    hairFront: (c) => {
      const cap = `M-4,-50C-6,-58 -6.6,-68 -5.6,-76C-4.6,-82 -1,-87 3,-89.4C10,-91 17,-89.6 21.2,-87.6C24,-92 22,-100 14,-102.6C4,-105 -12,-103 -18.6,-94C-23,-86 -22.6,-68 -21,-50C-15,-47 -9,-47 -4,-50Z`;
      let s = hairMass(c, cap, t, 'M3,-89Q-4,-80 -8,-52M3,-89Q12,-92 20,-88M0,-100Q-10,-90 -14,-50M-8,-101Q-18,-88 -18,-52', 'M-12,-97Q2,-102 15,-98Q2,-99.6 -12,-95Z');
      s += tips(c, cap) + line(cap, 1.2);
      s += balding(c, cap, [[8, -98, 6, 3.4]]);
      return s;
    },
    hairBack: (c) => {
      const cap = `M-24,-46C-16,-43 2,-43 10,-46C11,-58 11,-72 13.4,-79C17,-82 21,-83 21.6,-87` + arcClumps(0, -84, 22.4, 19, -8, -187, 7, 2.6, c.seed + 5) + `C-24.6,-72 -25,-56 -24,-46Z`;
      return hairMass(c, cap, t, 'M-3,-102V-46M-3,-100Q-12,-80 -16,-46M-3,-100Q4,-80 4,-46M-3,-100Q-20,-92 -22,-48') + tips(c, cap) + line(cap, 1.2) + balding(c, cap, [[-3, -92, 7, 5]]);
    },
  };
}

/** Big bleached spikes (celebrity). */
export function spiky(t: Tone, root: Tone): HairSet {
  return {
    hairFront: (c) => {
      const cap = capFront({ vol: 3.6, fringeN: 3, fringeD: 2.6, topN: 7, topD: 6.4 }, c.seed + 2);
      let s = hairMass(c, cap, t, STRANDS_F, 'M-12,-96Q2,-101 14,-97Q2,-98.4 -12,-94Z');
      s += inside(c.d, cap, fill('M-30,-96H30V-62H-30Z', fadeV(c.d, root.b, 0, 0.9))) + line(cap, 1.2);
      s += balding(c, cap, [[3, -98, 6, 3.6], [-12, -88, 3.4, 4]]);
      return s;
    },
    hairBack: (c) => {
      const cap = capBack({ vol: 3.6, topN: 6, topD: 6 }, c.seed + 2);
      return hairMass(c, cap, t, STRANDS_B) + inside(c.d, cap, fill('M-30,-92H30V-58H-30Z', fadeV(c.d, root.b, 0, 0.9))) + line(cap, 1.2) + balding(c, cap, [[-3, -94, 7, 5]]);
    },
  };
}

/** Hair peeking out under a hat: sideburns, a back band (and optional shaggy ends). */
export function underHat(t: Tone, o: { shaggy?: boolean; nape?: number } = {}): HairSet {
  const nape = o.nape ?? -63;
  return {
    hairFront: (c) => {
      const p = `M-6.6,-69C-6,-74 -5.6,-80 -5,-86L-20,-88C-22.6,-80 -21.6,-70 -17.6,${f(nape)}` + clumps([-17.6, nape], [-6.6, -69], o.shaggy ? 3 : 2, o.shaggy ? -3 : -1.4, c.seed) + 'Z';
      return hairMass(c, p, t, 'M-9,-84Q-12,-76 -12,-68M-15,-86Q-19,-78 -18,-68') + balding(c, p, [[-14, -78, 3, 3]]);
    },
    hairBack: (c) => {
      const p = horseshoeBack(-93, c.seed, nape + 5, 0);
      return hairMass(c, p, t, 'M-18,-84Q-19,-70 -15,-60M-10,-84Q-11,-70 -8,-59M-2,-84Q-3,-70 -1,-59M6,-84Q5,-72 6,-60') + inside(c.d, p, wedges([[-15, nape + 5.4, 7], [-9, nape + 5.8, 8], [-3, nape + 5.4, 7], [3, nape + 4.8, 8], [8.6, nape + 3.8, 6]], t.d, 1.8)) + balding(c, p, [[-4, -74, 4, 4]]);
    },
  };
}

// ---------------------------------------------------------------- hats (front / back painters)
export type HatPaint = { front: (c: Ctx, e: Expr) => string; back: (c: Ctx) => string };

export function hardHat(col: Tone): HatPaint {
  const dome = (back: boolean) => (back ? 'M-21.4,-84.6C-22,-99 -12,-108 1,-108C14,-108 22.6,-99 22,-85Z' : 'M-20.6,-84.6C-21,-99 -11,-108.4 2,-108.4C15,-108.4 23.6,-99 23,-85Z');
  return {
    front: (c) => {
      let inner = fill('M-30,-110H30V-60H-30Z', 'none') + line('M2.6,-108V-86', 2.2, col.s) + line('M2.6,-108V-86', 0.6) + line('M-8,-106Q-12,-98 -12.6,-87M13,-106Q17,-98 17.4,-87', 0.6, col.s);
      inner += grime([-18, -106, 22, -86], 5, '#5A4A22', c.seed + 3, 2.4, 0.3) + speck([-20, -108, 23, -84], 30, [col.d, '#6A5A30'], c.seed, 0.2, 0.5, 0.5);
      inner += outl('M-12,-98h7.4v5h-7.4Z', '#C8C2AE', 0.5) + line('M-11,-96.6h5M-11,-95h4', 0.4, '#6A3A2A');
      let s = shade(c.d, dome(false), col, { inner });
      const brim = 'M-24,-85.6C-24,-87.6 -20,-88 -14,-87.6L22,-87.6C26,-87.8 29.6,-87 29.4,-85.2C29.2,-83.4 26,-83 22,-83.2L-20,-83.2C-23,-83.2 -24,-84 -24,-85.6Z';
      s += shade(c.d, brim, { b: col.s, s: col.d, d: col.d }, { lw: 1.1 });
      if (c.z) s += line('M10,-107l2,4l-1.6,2l2.4,4', 0.7) + stain(-6, -92, 1.6, BLOOD, c.seed + 2, 0.6);
      return s;
    },
    back: (c) => {
      let s = shade(c.d, dome(true), col, { inner: line('M1,-108V-86', 2.2, col.s) + line('M1,-108V-86', 0.6) + grime([-18, -106, 22, -86], 5, '#5A4A22', c.seed + 3, 2.4, 0.3) });
      s += shade(c.d, 'M-26,-85.6C-26,-87.6 -22,-88 -16,-87.6L20,-87.6C24,-87.8 26,-87 26,-85.2C26,-83.4 23,-83 19,-83.2L-22,-83.2C-25,-83.2 -26,-84 -26,-85.6Z', { b: col.s, s: col.d, d: col.d }, { lw: 1.1 });
      s += line('M-14,-82Q0,-78 14,-82', 0.9, '#2A2420');
      return s;
    },
  };
}

/** Peaked uniform cap (cop / traffic cop / gus-less). */
export function peakCap(crown: Tone, band: Tone, badge: string): HatPaint {
  return {
    front: (c) => {
      const cr = 'M-19,-88C-22,-96 -16,-104 -2,-105.6C12,-107 24,-104 25,-98C25.6,-94 22,-90 18,-88.4Z';
      let s = shade(c.d, cr, crown, { inner: fold('M-10,-100Q2,-104 18,-100M-14,-92Q0,-96 16,-93', crown.s, 0.6) + speck([-20, -106, 26, -86], 20, [crown.d], c.seed, 0.2, 0.45, 0.4) });
      s += shade(c.d, 'M-19.4,-88.4C-18,-91 18,-91.6 19.6,-88.6L19.8,-84.6C18,-82.6 -18,-82.4 -19.6,-84.4Z', band, { lw: 1.1 });
      s += outl('M2.6,-93.4l2.4,-2.6l2.4,2.6l-0.6,3.2h-3.6Z', badge, 0.6) + circ(5, -92.2, 0.6, dk(badge, 0.6));
      s += shade(c.d, 'M8,-84.6C14,-86 24,-86 29.4,-83.6C30.4,-82.4 29,-80.4 26,-80.2C20,-80 12,-81 8,-82.6Z', C.black, { lw: 1.1 }) + fill(ellD(22, -82.8, 4, 0.8), '#8A8A86', 'opacity="0.5"');
      if (c.z) s += stain(-8, -96, 1.6, BLOOD, c.seed + 6, 0.6) + line('M14,-104l-2,3l1.4,1.6', 0.6);
      return s;
    },
    back: (c) => {
      let s = shade(c.d, 'M-22,-88C-24,-96 -16,-105 0,-106C14,-107 23,-103 23,-97C23,-93 20,-90 18,-88.4Z', crown, { inner: fold('M-14,-100Q0,-104 16,-100', crown.s, 0.6) });
      s += shade(c.d, 'M-22,-88.4C-20,-91 18,-91.6 19.6,-88.6L19.8,-84.6C18,-82.6 -20,-82.4 -22,-84.4Z', band, { lw: 1.1 });
      return s;
    },
  };
}

export function beanie(col: Tone, pom = false): HatPaint {
  const ribs = (_c: Ctx, y0: number, y1: number) => {
    let dd = '';
    for (let x = -22; x < 26; x += 1.8) dd += `M${f(x)},${f(y0)}V${f(y1)}`;
    return line(dd, 0.45, col.s, 'opacity="0.9"');
  };
  return {
    front: (c) => {
      const dome = 'M-20.6,-86C-22,-98 -12,-107.4 2,-107.4C14,-107.4 23,-99 22.6,-87Z';
      let s = shade(c.d, dome, col, { inner: ribs(c, -108, -86) + speck([-22, -108, 24, -84], 30, [col.d, lt(col.b, 0.2)], c.seed, 0.2, 0.5, 0.5) });
      const band = 'M-21.6,-88.6C-20,-91.2 20,-92 23.4,-89C24.4,-86 24,-83.4 22.6,-82.6C12,-81.4 -12,-81.4 -21.4,-82.6C-22.6,-84.6 -22.6,-87 -21.6,-88.6Z';
      s += shade(c.d, band, col, { lw: 1.1, inner: ribs(c, -92, -81) });
      if (pom) s += shade(c.d, jag(1, -108.6, 4.6, 3.8, c.seed + 2, 10, 0.25), col, { lw: 0.9 });
      if (c.z) s += rip(-8, -98, 2.4, 1.8, c.sk, c.seed + 4);
      return s;
    },
    back: (c) => {
      const dome = 'M-22,-86C-23,-98 -13,-107.4 1,-107.4C14,-107.4 22.6,-99 22,-87Z';
      let s = shade(c.d, dome, col, { inner: ribs(c, -108, -86) });
      s += shade(c.d, 'M-23,-88.6C-21,-91.2 20,-92 22.6,-89C23.6,-86 23,-83.4 21.6,-82.6C12,-81.4 -12,-81.4 -22.4,-82.6C-23.6,-84.6 -23.6,-87 -23,-88.6Z', col, { lw: 1.1, inner: ribs(c, -92, -81) });
      if (pom) s += shade(c.d, jag(0, -108.6, 4.6, 3.8, c.seed + 2, 10, 0.25), col, { lw: 0.9 });
      return s;
    },
  };
}

export function beret(col: Tone): HatPaint {
  const shape = 'M-20,-93C-22,-99 -12,-104.6 2,-104.6C16,-104.6 26,-100 25,-95C24,-91 18,-90.4 10,-91C2,-91.6 -6,-90 -12,-89.4C-17,-89 -19.6,-90.6 -20,-93Z';
  return {
    front: (c) => {
      let s = shade(c.d, shape, col, { inner: fold('M-14,-94Q2,-99 20,-96', col.s, 0.6) + speck([-22, -106, 26, -88], 24, [col.d], c.seed, 0.2, 0.5, 0.5) });
      s += line('M2,-104.6l0.6,-2.4', 1.4) + line('M2,-104.6l0.6,-2.4', 0.6, col.b);
      if (c.z) s += stain(10, -98, 1.4, SLIME, c.seed + 3, 0.6);
      return s;
    },
    back: (c) => shade(c.d, 'M-23,-93C-25,-99 -14,-104.6 0,-104.6C14,-104.6 23,-100 22,-95C21,-91 15,-90.4 8,-91C0,-91.6 -8,-90 -14,-89.4C-19,-89 -22.6,-90.6 -23,-93Z', col, { inner: fold('M-16,-94Q0,-99 18,-96', col.s, 0.6) }) + line('M0,-104.6l0.6,-2.4', 1.4),
  };
}

export function nurseCap(cross: string): HatPaint {
  const W = C.white;
  return {
    front: (c) => {
      const cap = 'M-12,-96C-8,-103 10,-104 18,-100L20,-94C12,-97.6 -2,-97 -10,-92Z';
      let s = shade(c.d, cap, W, { inner: fold('M-6,-98Q4,-101 16,-99', W.s, 0.5) });
      s += fill('M3.2,-101h2.4v1.6h1.6v2.4h-1.6v1.6h-2.4v-1.6h-1.6v-2.4h1.6Z', cross) + line('M3.2,-101h2.4v1.6h1.6v2.4h-1.6v1.6h-2.4v-1.6h-1.6v-2.4h1.6Z', 0.35);
      if (c.z) s += stain(12, -98, 1.2, BLOOD, c.seed + 2, 0.7);
      return s;
    },
    back: (c) => shade(c.d, 'M-16,-94C-12,-102 8,-104 16,-100L17,-94C8,-97.6 -6,-97 -14,-90Z', W, { inner: fold('M-10,-97Q2,-100 14,-98', W.s, 0.5) }),
  };
}

/** Baseball cap worn backwards (benchwarmer). */
export function backCap(col: Tone, logo?: string): HatPaint {
  return {
    front: (c) => {
      const cr = 'M-20,-87C-21,-98 -12,-106 2,-106C14,-106 22,-99 22,-88.6C14,-91 -10,-90.6 -20,-87Z';
      let s = shade(c.d, cr, col, { inner: line('M2,-106Q4,-98 4,-89.6', 0.55, col.d) + line('M-9,-104Q-8,-96 -8,-89', 0.5, col.d) + speck([-22, -106, 24, -86], 20, [col.d], c.seed, 0.2, 0.5, 0.5) + grime([-20, -104, 22, -88], 3, '#4A4028', c.seed + 2, 3, 0.25) });
      // strap opening at the front with a tuft of hair
      s += fill('M12,-90.6C14,-93.4 18,-93.6 20.4,-90.4Z', '#2A2420') + line('M12,-90.6C14,-93.4 18,-93.6 20.4,-90.4', 0.7);
      // bill pointing back-left
      s += shade(c.d, 'M-18,-90C-22,-92 -28,-91 -31,-88C-32,-86 -29,-85 -25,-85.6C-22,-86 -19.6,-86.8 -18.6,-87.6Z', { b: col.s, s: col.d, d: col.d }, { lw: 1.1 });
      s += circ(2, -106.2, 1, col.s) + line(ellD(2, -106.2, 1, 1), 0.4);
      void logo;
      return s;
    },
    back: (c) => {
      const cr = 'M-21,-87C-22,-98 -13,-106 1,-106C13,-106 21,-99 21,-88.6C12,-91 -11,-90.6 -21,-87Z';
      let s = shade(c.d, cr, col, { inner: line('M1,-106Q0,-98 0,-89.6', 0.55, col.d) });
      // bill toward the camera (down-left)
      s += shade(c.d, 'M-20,-88.4C-22,-86 -24,-82 -21,-80C-14,-78 -2,-79 4,-82C6,-84 4,-87 0,-88.4Z', { b: col.s, s: col.d, d: col.d }, { lw: 1.1 });
      if (logo) s += fill(ellD(-1, -96, 3.6, 3), logo, 'opacity="0.9"') + line(ellD(-1, -96, 3.6, 3), 0.5);
      return s;
    },
  };
}

/** Sweatband / bandana across the forehead with tails at the back. */
export function headband(col: Tone, tails = false): HatPaint {
  return {
    front: (c) => {
      let s = '';
      if (tails) s += shade(c.d, 'M-19,-90C-24,-90 -28,-86 -30,-82L-27,-81C-26,-84 -23,-86 -19,-86ZM-19,-88C-24,-85 -26,-80 -26,-76L-23,-76C-23,-80 -21,-84 -18,-86Z', col, { lw: 0.9 });
      const band = 'M-19.6,-90.4C-12,-94 10,-95 22.6,-91.4L22.8,-86.4C10,-90 -12,-89.4 -19.8,-85.6Z';
      s += shade(c.d, band, col, { lw: 1.05, inner: line('M-18,-88Q2,-92.6 22,-89', 0.45, col.s) + speck([-20, -96, 24, -84], 20, [col.d, lt(col.b, 0.2)], c.seed, 0.2, 0.45, 0.6) });
      if (c.z) s += stain(6, -91, 1.2, BLOOD, c.seed + 7, 0.7);
      return s;
    },
    back: (c) => {
      let s = shade(c.d, 'M-22,-88C-12,-92.6 10,-93 21.6,-89.6L21.6,-84.6C10,-88 -12,-87.6 -22,-83.4Z', col, { lw: 1.05 });
      s += shade(c.d, 'M-6,-88C-8,-86 -10,-84 -9,-82L-3,-84ZM-4,-87C-6,-82 -6,-76 -4,-72L-1,-73C-2,-78 -2,-82 -1,-86Z', col, { lw: 0.9 });
      if (!tails) return shade(c.d, 'M-22,-88C-12,-92.6 10,-93 21.6,-89.6L21.6,-84.6C10,-88 -12,-87.6 -22,-83.4Z', col, { lw: 1.05 });
      return s;
    },
  };
}

/** Tall pleated chef toque, stained (gus). */
export function toque(): HatPaint {
  const W = tone('#D6D0BC', '#ACA48C');
  const top = (back: boolean) =>
    back
      ? 'M-18,-92C-24,-96 -24,-108 -16,-112C-14,-120 -2,-124 4,-118C10,-123 22,-120 22,-110C26,-104 24,-96 19,-92Z'
      : 'M-17,-92C-23,-96 -23,-108 -15,-112C-13,-120 -1,-124 5,-118C11,-123 23,-120 23,-110C27,-104 25,-96 20,-92Z';
  return {
    front: (c) => {
      let inner = fold('M-10,-112Q-8,-102 -9,-93M-1,-116Q0,-104 -1,-93M8,-116Q10,-104 9,-93M16,-112Q16,-102 15,-93', W.s, 0.6);
      inner += grime([-20, -122, 24, -90], 6, '#7A6236', c.seed + 2, 3, 0.3) + stain(10, -108, 2, BLOOD, c.seed + 4, 0.55) + stain(-8, -100, 1.6, SLIME, c.seed + 6, 0.55) + stain(14, -97, 1.2, '#5A3A1A', c.seed + 8, 0.6);
      let s = shade(c.d, top(false), W, { inner });
      s += shade(c.d, 'M-18,-93C-10,-96 12,-96.6 21,-93.6L21.4,-86.6C12,-89.6 -10,-89.2 -18.4,-85.6Z', W, { lw: 1.1, inner: line('M-18,-89.6Q2,-93 21,-90', 0.45, W.s) + grime([-18, -96, 22, -86], 3, '#7A6236', c.seed + 9, 2, 0.35) });
      // flies buzzing around the hat
      s += fly(-22, -110, 0.95, c.seed + 1) + fly(27, -116, 0.9, c.seed + 2) + fly(-4, -127, 0.85, c.seed + 3);
      return s;
    },
    back: (c) => {
      let s = shade(c.d, top(true), W, { inner: fold('M-10,-112Q-8,-102 -9,-93M0,-116Q1,-104 0,-93M10,-115Q11,-104 10,-93', W.s, 0.6) + grime([-20, -122, 24, -90], 5, '#7A6236', c.seed + 2, 3, 0.3) + stain(-6, -106, 1.8, BLOOD, c.seed + 5, 0.55) });
      s += shade(c.d, 'M-20,-93C-12,-96 10,-96.6 20,-93.6L20.4,-86.6C10,-89.6 -12,-89.2 -20.4,-85.6Z', W, { lw: 1.1 });
      s += fly(-24, -112, 0.95, c.seed + 1) + fly(24, -118, 0.9, c.seed + 2);
      return s;
    },
  };
}

/** Combine a hair set with a hat (hat drawn over the hair). */
export function withHat(h: HairSet, hat: HatPaint): HairSet {
  return {
    hairBehind: h.hairBehind,
    hairBackBehind: h.hairBackBehind,
    hairFront: (c, e) => (h.hairFront ? h.hairFront(c, e) : '') + hat.front(c, e),
    hairBack: (c) => (h.hairBack ? h.hairBack(c) : '') + hat.back(c),
  };
}

export { rnd, mix, dk, lt, SLIME_L, stitch, circ, line, fill, outl, ellD, f, INK };
