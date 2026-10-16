/**
 * Bodies: the gumdrop torso (front 3/4 + back 3/4), neck, generic shirt / jacket / pants painters,
 * arms with articulated hands (and fists holding props), legs and shoes. Zombie mode tears hems,
 * opens rips onto green skin and adds stains.
 */
import type { Body, Ctx, Paint } from './rig';
import {
  INK, LW, LI, LF, f, ellD, fill, line, outl, circ, inside, shade, speck, hatch, grime, fold, stain, rip, drip,
  limb, tube, jag, rnd, mix, dk, lt, fadeV, smooth, stitch, tone,
  BLOOD, BLOOD_D, SLIME, SLIME_L, GREASE, C,
} from './paint';
import type { Tone, Pt } from './paint';

// ---------------------------------------------------------------- torso shape
export interface TorsoO {
  /** extra width at the bottom (coats, dresses) */
  flare?: number;
  /** move the bottom edge (positive = lower, e.g. a skirt hem) */
  drop?: number;
  /** zigzag the hem (zombies) */
  torn?: boolean;
  /** shrink the dome (tank tops, bare shoulders) */
  dome?: number;
}

export function torsoD(b: Body, o: TorsoO = {}, seed = 1): string {
  const wT = b.wTop - (o.dome ?? 0);
  const wB = b.wBot + (o.flare ?? 0);
  const bot = b.tBot + (o.drop ?? 0);
  const top = b.tTop;
  const sh = b.shY;
  const bel = b.belly;
  let dd =
    `M${f(-wB + 2.6)},${f(bot)}` +
    `C${f(-wB + 0.6)},${f(bot)} ${f(-wB)},${f(bot - 1.2)} ${f(-wB)},${f(bot - 3.2)}` +
    `C${f(-wB - 0.2)},${f(bot - 11)} ${f(-wT - 0.6)},${f(sh + 8)} ${f(-wT)},${f(sh + 1.4)}` +
    `C${f(-wT)},${f(top + 1.8)} ${f(-wT * 0.55)},${f(top)} 0.5,${f(top)}` +
    `C${f(wT * 0.6)},${f(top)} ${f(wT + 0.2)},${f(top + 1.8)} ${f(wT + 0.2)},${f(sh + 1.6)}` +
    `C${f(wT + 0.6 + bel * 0.4)},${f(sh + 9)} ${f(wB + bel)},${f(bot - 13 + bel)} ${f(wB)},${f(bot - 3.2)}` +
    `C${f(wB)},${f(bot - 1.2)} ${f(wB - 0.6)},${f(bot)} ${f(wB - 2.6)},${f(bot)}`;
  if (o.torn) {
    const r = rnd(seed);
    const n = 7;
    for (let k = 1; k < n; k++) {
      const x = wB - 2.6 - ((wB * 2 - 5.2) * k) / n;
      dd += `L${f(x + (r() - 0.5))},${f(bot + (k % 2 ? 1.6 + r() * 1.4 : -0.4))}`;
    }
    dd += 'Z';
  } else dd += `Q0.5,${f(bot + 1.4)} ${f(-wB + 2.6)},${f(bot)}Z`;
  return dd;
}

/** x of the torso's left/right edge at height y (approximate, for placing details). */
export function edgeX(b: Body, y: number, side: -1 | 1): number {
  const t = Math.max(0, Math.min(1, (y - b.shY) / (b.tBot - b.shY)));
  const w = b.wTop + (b.wBot - b.wTop) * t + (side > 0 ? b.belly * Math.sin(t * Math.PI) * 0.8 : 0);
  return side * w + (side > 0 ? 0.2 : 0);
}

/** Neck stub under the head (inside the torso part). */
export function neck(c: Ctx): string {
  const { d, sk, b } = c;
  const top = b.neckY - 5;
  const p = `M${f(-3.6 + b.hunch)},${f(top)}H${f(5.2 + b.hunch)}V${f(b.tTop + 4)}H${f(-3.6 + b.hunch)}Z`;
  return shade(d, p, sk, { lw: 1, off: [-1, 0], inner: fill(`M-6,${f(top)}H10V${f(top + 3.4)}H-6Z`, sk.d, 'opacity="0.45"') });
}

// ---------------------------------------------------------------- zombie damage on a torso
export function zDamage(c: Ctx, clip: string, spots: Pt[], stains = 2): string {
  if (!c.z) return '';
  const { d, seed } = c;
  const r = rnd(seed + 41);
  let s = '';
  for (let i = 0; i < stains; i++) {
    const x = -6 + r() * 14;
    const y = c.b.shY + 6 + r() * (c.b.tBot - c.b.shY - 10);
    s += stain(x, y, 1.6 + r() * 1.6, i % 2 ? BLOOD : SLIME, seed + i * 13, 0.55);
    if (i === 0) s += drip(x + 0.4, y + 1.4, 3 + r() * 3, 1, BLOOD_D, 0.55);
  }
  spots.forEach(([x, y], i) => {
    s += rip(x, y, 2.2 + r() * 1.2, 1.6 + r(), c.sk, seed + i * 5);
  });
  s += grime([-14, c.b.tTop, 16, c.b.tBot], 5, '#4A4028', seed + 8, 3, 0.2);
  return inside(d, clip, s);
}

// ---------------------------------------------------------------- generic shirt torso
export type Collar = 'tee' | 'shirt' | 'polo' | 'v' | 'turtle' | 'tank' | 'none' | 'scoop' | 'hood';

export interface ShirtSpec {
  top: Tone;
  collar: Collar;
  /** trouser seat band visible at the bottom (tucked shirts) */
  pants?: Tone;
  belt?: string;
  buckle?: string;
  /** shirt hem visible over the pants (untucked) */
  untucked?: boolean;
  buttons?: boolean;
  pocket?: boolean;
  tie?: Tone;
  stripes?: string;
  /** extra paint (front / back) inside the torso clip */
  extra?: (c: Ctx) => string;
  /** extra paint over everything (badges, straps…) */
  over?: (c: Ctx) => string;
  /** zombie rip positions */
  rips?: Pt[];
  o?: TorsoO;
  /** crop top: bare belly band this tall above the waistband */
  crop?: number;
}

function waistband(c: Ctx, spec: ShirtSpec, y: number): string {
  const p = spec.pants!;
  let s = fill(`M-30,${f(y)}H30V10H-30Z`, p.b) + fill(`M6,${f(y)}H30V10H6Z`, p.s, 'opacity="0.6"');
  s += line(`M-30,${f(y)}H30`, 1);
  // seat seam and fly
  if (!c.back) s += line(`M3.6,${f(y + 1.6)}Q4.2,${f(y + 4)} 2.4,${f(y + 6.4)}`, 0.55, p.d);
  else s += line(`M-1.6,${f(y + 1.6)}V${f(y + 8)}`, 0.55, p.d) + line(`M-8.4,${f(y + 2.2)}h4.2v3h-4.2ZM2.4,${f(y + 2.2)}h4.4v3h-4.4Z`, 0.5, p.d);
  if (spec.belt) {
    s += fill(`M-30,${f(y - 1.4)}H30V${f(y + 1.6)}H-30Z`, spec.belt) + line(`M-30,${f(y - 1.4)}H30M-30,${f(y + 1.6)}H30`, 0.7);
    s += line(`M-6,${f(y - 1.4)}V${f(y + 1.6)}M9,${f(y - 1.4)}V${f(y + 1.6)}`, 0.5, dk(spec.belt, 0.6));
    if (spec.buckle && !c.back) s += outl(`M1.6,${f(y - 1.9)}h3.6v4h-3.6Z`, spec.buckle, 0.6) + fill(`M2.4,${f(y - 1)}h2v2.2h-2Z`, dk(spec.buckle, 0.6));
  }
  return s;
}

export function shirtTorso(spec: ShirtSpec): Paint {
  return (c) => {
    const { d, b, back, z, seed } = c;
    const td = torsoD(b, { ...spec.o, torn: z && spec.untucked }, seed);
    const T = spec.top;
    const wy = b.tBot - 6.4;
    let inner = '';
    if (spec.stripes) {
      for (let x = -16; x < 18; x += 2.6) inner += line(`M${f(x)},${f(b.tTop)}V${f(b.tBot + 4)}`, 0.5, spec.stripes, 'opacity="0.55"');
    }
    inner += speck([-16, b.tTop, 18, b.tBot + 2], 26, [T.d, lt(T.b, 0.2)], seed + 3, 0.2, 0.45, 0.35);
    inner += grime([-14, b.shY, 16, b.tBot], 3, '#4A4028', seed + 5, 2.6, 0.14);
    // armpit and side folds
    inner += fold(`M${f(-b.wTop + 1)},${f(b.shY + 7)}q2.4,1.6 4,1M${f(b.wTop - 0.6)},${f(b.shY + 6)}q-2.2,1.8 -4,1.2`, T.s, 0.6);
    inner += fold(`M${f(-b.wBot + 2.4)},${f(b.tBot - 9)}q3,-1.4 6,-0.6M${f(b.wBot - 2)},${f(b.tBot - 11)}q-2.6,1.4 -5.6,0.8`, T.s, 0.6);
    if (spec.pants && !spec.untucked) inner += waistband(c, spec, wy);
    if (spec.pants && spec.untucked) {
      inner += fill(`M-30,${f(b.tBot - 2.2)}H30V10H-30Z`, spec.pants.b) + line(`M-30,${f(b.tBot - 2.2)}H30`, 0.9);
    }
    if (spec.crop) {
      const cy = wy - spec.crop;
      inner += fill(`M-30,${f(cy)}H30V${f(wy)}H-30Z`, c.sk.b) + fill(`M6,${f(cy)}H30V${f(wy)}H6Z`, c.sk.s, 'opacity="0.6"') + fill(`M-30,${f(cy)}H30V${f(cy + 1.6)}H-30Z`, c.sk.d, 'opacity="0.35"');
      inner += line(`M-30,${f(cy)}H30`, 0.9) + (back ? '' : line(`M${f(4.6 + b.hunch)},${f(wy - spec.crop * 0.45)}q0.7,0.8 0,1.6`, 0.6, c.sk.d));
    }
    if (!back) {
      if (spec.buttons || spec.collar === 'shirt' || spec.collar === 'polo') {
        const by = spec.collar === 'polo' ? b.tTop + 9 : (spec.pants && !spec.untucked ? wy - 1.6 : b.tBot - 2);
        inner += line(`M3.2,${f(b.tTop + 3)}C3.4,${f(b.tTop + 12)} 3.6,${f(by - 6)} 3.4,${f(by)}`, 0.6, T.d);
        for (let y = b.tTop + 7; y < by - 1; y += 5.4) inner += circ(4.4, y, 0.55, lt(T.b, 0.35)) + line(ellD(4.4, y, 0.55, 0.55), 0.3);
      }
      if (spec.pocket) inner += line(`M-6.6,${f(b.shY + 4.6)}h4.6v4.6q-2.3,1 -4.6,0Z`, 0.55, T.d) + line(`M-6.6,${f(b.shY + 4.6)}h4.6`, 0.8, T.d);
    } else {
      inner += fold(`M-1.6,${f(b.tTop + 3)}V${f(b.tBot - 6)}`, T.s, 0.5, 0.6);
      inner += fold(`M${f(-b.wTop + 2)},${f(b.shY + 3)}q3,2.6 2.6,6M${f(b.wTop - 2)},${f(b.shY + 3)}q-3,2.6 -2.6,6`, T.s, 0.6);
    }
    if (spec.extra) inner += spec.extra(c);
    let s = neck(c);
    s += shade(d, td, T, { inner });
    if (!back) s += collarFront(c, spec.collar, T, spec.tie);
    else s += collarBack(c, spec.collar, T);
    if (spec.untucked && !z) s += line(`M${f(-b.wBot + 2.6)},${f(b.tBot - 0.6)}Q0.5,${f(b.tBot + 0.8)} ${f(b.wBot - 2.6)},${f(b.tBot - 0.6)}`, 0.5, T.d);
    s += zDamage(c, td, spec.rips ?? [[-4, b.shY + 12], [6, b.tBot - 10]]);
    if (spec.over) s += spec.over(c);
    return s;
  };
}

export function collarFront(c: Ctx, kind: Collar, T: Tone, tie?: Tone): string {
  const { b, d } = c;
  const top = b.tTop;
  const x0 = b.hunch;
  let s = '';
  switch (kind) {
    case 'tee':
    case 'scoop': {
      const dp = kind === 'scoop' ? 5 : 2.6;
      s += fill(`M${f(-4.4 + x0)},${f(top + 0.6)}Q${f(1 + x0)},${f(top + dp + 1.4)} ${f(6.2 + x0)},${f(top + 0.6)}L${f(5.6 + x0)},${f(top - 0.6)}L${f(-3.8 + x0)},${f(top - 0.6)}Z`, c.sk.s);
      s += line(`M${f(-4.6 + x0)},${f(top + 0.4)}Q${f(1 + x0)},${f(top + dp + 1.6)} ${f(6.4 + x0)},${f(top + 0.4)}`, 1.6, T.s) + line(`M${f(-4.6 + x0)},${f(top + 0.4)}Q${f(1 + x0)},${f(top + dp + 1.6)} ${f(6.4 + x0)},${f(top + 0.4)}`, 0.6);
      break;
    }
    case 'v':
      s += fill(`M${f(-4 + x0)},${f(top)}L${f(2 + x0)},${f(top + 7)}L${f(6.4 + x0)},${f(top)}Z`, c.sk.b) + fill(`M${f(-1 + x0)},${f(top + 3)}L${f(2 + x0)},${f(top + 7)}L${f(4 + x0)},${f(top + 3)}Z`, c.sk.s, 'opacity="0.5"');
      s += line(`M${f(-4.4 + x0)},${f(top)}L${f(2 + x0)},${f(top + 7.4)}L${f(6.8 + x0)},${f(top)}`, 1.4, T.s) + line(`M${f(-4.4 + x0)},${f(top)}L${f(2 + x0)},${f(top + 7.4)}L${f(6.8 + x0)},${f(top)}`, 0.6);
      break;
    case 'shirt':
    case 'polo': {
      if (tie) {
        const knot = `M${f(1.6 + x0)},${f(top + 0.6)}L${f(5.4 + x0)},${f(top + 0.6)}L${f(4.8 + x0)},${f(top + 3.4)}L${f(2.2 + x0)},${f(top + 3.4)}Z`;
        const blade = `M${f(2.2 + x0)},${f(top + 3.4)}L${f(4.8 + x0)},${f(top + 3.4)}L${f(5.8 + x0)},${f(top + 16)}L${f(3.8 + x0)},${f(top + 18.4)}L${f(1.8 + x0)},${f(top + 16)}Z`;
        s += shade(d, blade, tie, { lw: 0.9, off: [-0.6, -0.4] }) + shade(d, knot, tie, { lw: 0.9, off: [-0.4, -0.4] });
        s += line(`M${f(2.6 + x0)},${f(top + 7)}l2.6,1.6M${f(2.4 + x0)},${f(top + 11)}l3,1.8`, 0.5, tie.s);
      }
      const cl = `M${f(-4.4 + x0)},${f(top - 0.4)}L${f(2.8 + x0)},${f(top + 1)}L${f(0.4 + x0)},${f(top + 5)}L${f(-4.8 + x0)},${f(top + 2.6)}Z`;
      const cr = `M${f(7.4 + x0)},${f(top - 0.2)}L${f(3.4 + x0)},${f(top + 1)}L${f(5.6 + x0)},${f(top + 4.6)}L${f(8.4 + x0)},${f(top + 2.4)}Z`;
      s += shade(d, cl, kind === 'polo' ? T : C.white, { lw: 0.8, off: [-0.4, -0.4], k: 0.4 }) + shade(d, cr, kind === 'polo' ? T : C.white, { lw: 0.8, off: [-0.4, -0.4], k: 0.4 });
      break;
    }
    case 'turtle':
      s += shade(d, `M${f(-4.6 + x0)},${f(top + 1.6)}L${f(-4.2 + x0)},${f(top - 4)}Q${f(1 + x0)},${f(top - 5)} ${f(6.4 + x0)},${f(top - 4)}L${f(6.8 + x0)},${f(top + 1.6)}Q${f(1 + x0)},${f(top + 3)} ${f(-4.6 + x0)},${f(top + 1.6)}Z`, T, { lw: 0.9 });
      s += line(`M${f(-4.2 + x0)},${f(top - 1.6)}Q${f(1 + x0)},${f(top - 0.4)} ${f(6.6 + x0)},${f(top - 1.6)}M${f(-4.2 + x0)},${f(top + 0.2)}Q${f(1 + x0)},${f(top + 1.6)} ${f(6.6 + x0)},${f(top + 0.2)}`, 0.45, T.d);
      break;
    case 'tank':
      s += fill(`M${f(-3.6 + x0)},${f(top)}Q${f(1 + x0)},${f(top + 6)} ${f(5.8 + x0)},${f(top)}Z`, c.sk.b) + line(`M${f(-3.8 + x0)},${f(top)}Q${f(1 + x0)},${f(top + 6.4)} ${f(6 + x0)},${f(top)}`, 0.7);
      break;
    case 'hood':
      s += shade(d, `M${f(-9 + x0)},${f(top + 3)}C${f(-9 + x0)},${f(top - 3)} ${f(-3 + x0)},${f(top - 2)} ${f(1 + x0)},${f(top + 1)}C${f(5 + x0)},${f(top - 2)} ${f(10 + x0)},${f(top - 2)} ${f(10 + x0)},${f(top + 3)}C${f(8 + x0)},${f(top + 6)} ${f(4 + x0)},${f(top + 6)} ${f(1 + x0)},${f(top + 4)}C${f(-3 + x0)},${f(top + 6)} ${f(-8 + x0)},${f(top + 6)} ${f(-9 + x0)},${f(top + 3)}Z`, T, { lw: 1 });
      s += line(`M${f(-2 + x0)},${f(top + 4.6)}q-0.4,4 0.4,8M${f(4 + x0)},${f(top + 4.6)}q0.6,4 -0.2,7.6`, 0.6, lt(T.b, 0.4)) + circ(-1.6 + x0, top + 12.8, 0.6, lt(T.b, 0.4)) + circ(3.8 + x0, top + 12.4, 0.6, lt(T.b, 0.4));
      break;
    default:
      break;
  }
  return s;
}

export function collarBack(c: Ctx, kind: Collar, T: Tone): string {
  const { b, d } = c;
  const top = b.tTop;
  const x0 = b.hunch;
  switch (kind) {
    case 'shirt':
    case 'polo':
      return shade(d, `M${f(-6 + x0)},${f(top + 0.8)}Q${f(0 + x0)},${f(top - 1.4)} ${f(7 + x0)},${f(top + 0.8)}L${f(6.4 + x0)},${f(top + 3.4)}Q${f(0 + x0)},${f(top + 1.6)} ${f(-5.4 + x0)},${f(top + 3.4)}Z`, kind === 'polo' ? T : C.white, { lw: 0.8, k: 0.3 });
    case 'turtle':
      return shade(d, `M${f(-5.2 + x0)},${f(top + 2)}L${f(-4.6 + x0)},${f(top - 4)}Q${f(1 + x0)},${f(top - 5)} ${f(6.4 + x0)},${f(top - 4)}L${f(6.8 + x0)},${f(top + 2)}Q${f(1 + x0)},${f(top + 3.4)} ${f(-5.2 + x0)},${f(top + 2)}Z`, T, { lw: 0.9 });
    case 'hood':
      return shade(d, `M${f(-9.6 + x0)},${f(top + 2)}C${f(-10 + x0)},${f(top - 4)} ${f(10 + x0)},${f(top - 4)} ${f(10.6 + x0)},${f(top + 2)}C${f(10 + x0)},${f(top + 10)} ${f(5 + x0)},${f(top + 14)} ${f(0.5 + x0)},${f(top + 14)}C${f(-4 + x0)},${f(top + 14)} ${f(-9 + x0)},${f(top + 10)} ${f(-9.6 + x0)},${f(top + 2)}Z`, T, { lw: 1, inner: fold(`M${f(-5 + x0)},${f(top + 3)}q5,5 11,0M${f(-3 + x0)},${f(top + 8)}q4,3 8,0`, T.d, 0.6) });
    default:
      return line(`M${f(-4.2 + x0)},${f(top + 0.4)}Q${f(1 + x0)},${f(top - 0.8)} ${f(6.2 + x0)},${f(top + 0.4)}`, 1.2, T.s) + line(`M${f(-4.2 + x0)},${f(top + 0.4)}Q${f(1 + x0)},${f(top - 0.8)} ${f(6.2 + x0)},${f(top + 0.4)}`, 0.5);
  }
}

// ---------------------------------------------------------------- jackets (painted over a shirt torso)
export interface JacketSpec {
  col: Tone;
  /** lapels (suit) or plain open front (cardigan / work jacket) */
  lapels?: boolean;
  /** opening width at the chest */
  open?: number;
  buttons?: number;
  pockets?: boolean;
  pin?: string;
  pinstripe?: string;
  /** visible length below the torso hem */
  long?: number;
  tweed?: boolean;
}

export function jacket(c: Ctx, j: JacketSpec): string {
  const { d, b, back, seed } = c;
  const td = torsoD(b, { flare: 0.6, drop: j.long ?? 0, torn: c.z }, seed + 2);
  const T = j.col;
  const x0 = b.hunch;
  const top = b.tTop;
  let inner = speck([-18, top, 20, b.tBot + 8], 34, [T.d, lt(T.b, 0.18)], seed + 17, 0.2, 0.45, 0.35);
  if (j.pinstripe) for (let x = -16; x < 20; x += 2.2) inner += line(`M${f(x)},${f(top)}V${f(b.tBot + 10)}`, 0.3, j.pinstripe, 'opacity="0.45"');
  if (j.tweed) inner += hatch([-16, top, 18, b.tBot + 6], 120, T.d, seed + 23, 0.8, 0.8, 0.3, 0.5) + hatch([-16, top, 18, b.tBot + 6], 80, lt(T.b, 0.25), seed + 29, 0.8, -0.8, 0.3, 0.4);
  inner += fold(`M${f(-b.wTop + 1.4)},${f(b.shY + 7)}q2.4,1.6 4,1M${f(b.wTop - 0.6)},${f(b.shY + 6)}q-2.2,1.8 -4,1.2`, T.s, 0.65);
  if (!back) {
    const op = j.open ?? 5;
    // the opening shows the shirt beneath: cut a V from the collar down to the button point
    const vy = j.lapels ? b.shY + 12 : b.tBot - 1;
    const hole = `M${f(-op + 1.4 + x0)},${f(top - 1)}L${f(3 + x0)},${f(vy)}L${f(3.6 + x0)},${f(vy)}L${f(op + 3.4 + x0)},${f(top - 1)}Z`;
    let s = shade(d, td, T, { inner });
    void hole;
    // lapels
    if (j.lapels) {
      const lapL = `M${f(-3.8 + x0)},${f(top - 0.6)}L${f(3 + x0)},${f(vy + 0.4)}L${f(0.6 + x0)},${f(vy - 2)}L${f(-5.4 + x0)},${f(top + 6)}L${f(-3 + x0)},${f(top + 6.4)}L${f(-6.2 + x0)},${f(top + 2.4)}Z`;
      const lapR = `M${f(6.6 + x0)},${f(top - 0.4)}L${f(3.4 + x0)},${f(vy + 0.4)}L${f(5.4 + x0)},${f(vy - 2.4)}L${f(8.4 + x0)},${f(top + 6.2)}L${f(6.6 + x0)},${f(top + 6.4)}L${f(9 + x0)},${f(top + 2.2)}Z`;
      s += shade(d, lapR, { b: T.s, s: T.d, d: T.d }, { lw: 0.9, k: 0.4 }) + shade(d, lapL, T, { lw: 0.9, k: 0.4 });
    } else {
      s += line(`M${f(-op + 1.4 + x0)},${f(top + 0.4)}L${f(2.8 + x0)},${f(vy)}`, 0.8) + line(`M${f(op + 3.4 + x0)},${f(top + 0.4)}L${f(3.8 + x0)},${f(vy)}`, 0.8);
    }
    const nb = j.buttons ?? 2;
    for (let i = 0; i < nb; i++) {
      const by = j.lapels ? vy + 2.2 + i * 4.2 : b.shY + 6 + i * 6;
      const bx = j.lapels ? 4.6 + x0 : (j.open ?? 5) + 4 + x0 - (by - b.tTop) * 0.05;
      s += circ(bx, by, 0.7, T.d) + line(ellD(bx, by, 0.7, 0.7), 0.35);
    }
    if (j.pockets) s += line(`M${f(-9.6)},${f(b.tBot - 7)}h6M${f(7)},${f(b.tBot - 8)}h6`, 0.9, T.d) + line(`M${f(-8.4)},${f(b.shY + 5)}h4.4`, 0.8, T.d);
    if (j.pin) s += circ(-4.6 + x0, b.shY + 5.4, 0.9, j.pin) + line(ellD(-4.6 + x0, b.shY + 5.4, 0.9, 0.9), 0.4);
    s += zDamage(c, td, [[-6, b.shY + 12], [8, b.tBot - 6]], 2);
    return s;
  }
  let s = shade(d, td, T, { inner: inner + fold(`M-1.6,${f(top + 4)}V${f(b.tBot + (j.long ?? 0) - 1)}`, T.d, 0.7) + fold(`M${f(-b.wTop + 2)},${f(b.shY + 3)}q3,2.6 2.6,6M${f(b.wTop - 2)},${f(b.shY + 3)}q-3,2.6 -2.6,6`, T.s, 0.6) });
  s += shade(d, `M${f(-5.4 + x0)},${f(top + 1)}Q${f(0.5 + x0)},${f(top - 1.6)} ${f(6.6 + x0)},${f(top + 1)}L${f(6 + x0)},${f(top + 3.6)}Q${f(0.5 + x0)},${f(top + 1.4)} ${f(-4.8 + x0)},${f(top + 3.6)}Z`, { b: T.s, s: T.d, d: T.d }, { lw: 0.8, k: 0.3 });
  s += zDamage(c, td, [[4, b.shY + 10], [-7, b.tBot - 6]], 2);
  return s;
}

/**
 * A jacket with an open front: paints the shirt first (spec), then the jacket with a V cut out by
 * clipping it to the torso minus the opening.
 */
export function jacketTorso(shirt: ShirtSpec, j: JacketSpec): Paint {
  const under = shirtTorso({ ...shirt, rips: [] });
  return (c) => {
    if (c.back) return neck(c) + jacket(c, j);
    const { d, b } = c;
    const x0 = b.hunch;
    const op = j.open ?? 5;
    const vy = j.lapels ? b.shY + 12 : b.tBot + (j.long ?? 0) + 4;
    const big = `M-40,-130H40V20H-40Z`;
    const hole = `M${f(-op + 1.4 + x0)},${f(b.tTop - 6)}L${f(3 + x0)},${f(vy)}L${f(3.6 + x0)},${f(vy)}L${f(op + 3.4 + x0)},${f(b.tTop - 6)}Z`;
    const id = d.id('m');
    d.def(`<clipPath id="${id}"><path clip-rule="evenodd" d="${big}${hole}"/></clipPath>`);
    let s = under(c);
    s += `<g clip-path="url(#${id})">${jacket(c, j)}</g>`;
    const ey = Math.min(vy, b.tBot + (j.long ?? 0) + 0.6);
    const tx = (x1: number, x2: number) => x1 + (x2 - x1) * ((ey - b.tTop - 0.4) / (vy - b.tTop - 0.4));
    s += line(`M${f(-op + 1.4 + x0)},${f(b.tTop + 0.4)}L${f(tx(-op + 1.4 + x0, 3 + x0))},${f(ey)}`, 0.9) + line(`M${f(op + 3.4 + x0)},${f(b.tTop + 0.4)}L${f(tx(op + 3.4 + x0, 3.6 + x0))},${f(ey)}`, 0.9);
    return s;
  };
}

// ---------------------------------------------------------------- hands
/** Open relaxed hand hanging from the wrist (0,0), fingers down, thumb toward +x (forward). */
export function hand(c: Ctx, w: Pt, glove?: Tone, s = 1): string {
  const { d, back, z } = c;
  const sk = glove ?? c.sk;
  const [x, y] = w;
  const P = (px: number, py: number) => `${f(x + px * s)},${f(y + py * s)}`;
  const palm = `M${P(-2.3, -0.6)}C${P(-3.2, 1.2)} ${P(-3.4, 3.6)} ${P(-2.8, 5.4)}L${P(2.6, 5.2)}C${P(3.2, 3.4)} ${P(2.8, 1)} ${P(2, -0.6)}Z`;
  const fingers = [
    limb([x - 2.1 * s, y + 4.4 * s], [x - 2.2 * s, y + 7.4 * s], 1.7 * s, 1.5 * s),
    limb([x - 0.6 * s, y + 4.8 * s], [x - 0.5 * s, y + 8.3 * s], 1.8 * s, 1.6 * s),
    limb([x + 1 * s, y + 4.8 * s], [x + 1.1 * s, y + 7.9 * s], 1.8 * s, 1.6 * s),
  ];
  const thumb = limb([x + 1.6 * s, y + 1.2 * s], [x + 3.6 * s, y + 4.6 * s], 2 * s, 1.7 * s);
  let out = '';
  if (back) out += shade(d, thumb, sk, { lw: 0.9, off: [-0.4, -0.4], k: 0 });
  for (const fg of fingers) out += shade(d, fg, sk, { lw: 0.9, off: [-0.4, -0.5], k: 0 });
  out += shade(d, palm, sk, { lw: 1, off: [-0.8, -0.6] });
  if (!back) out += shade(d, thumb, sk, { lw: 0.9, off: [-0.4, -0.4], k: 0 });
  if (back) out += line(`M${P(-1.8, 3.6)}Q${P(0, 4.4)} ${P(1.8, 3.6)}`, 0.45, sk.d);
  else out += line(`M${P(-0.4, 1.8)}q0.8,1.2 0.4,2.6`, 0.45, sk.d);
  if (z && !glove) {
    // dark rotten nails and a knuckle sore
    out += circ(x - 2.2 * s, y + 7.6 * s, 0.55 * s, '#3A3018') + circ(x - 0.5 * s, y + 8.5 * s, 0.55 * s, '#3A3018') + circ(x + 1.1 * s, y + 8.1 * s, 0.55 * s, '#3A3018');
    out += fill(ellD(x - 0.6 * s, y + 2 * s, 1 * s, 0.7 * s), '#5A4A22', 'opacity="0.7"');
  }
  return out;
}

/** Fist around a horizontal-ish grip centred at h; fingers wrap from the front. */
export function fist(c: Ctx, h: Pt, glove?: Tone, s = 1): string {
  const { d, back } = c;
  const sk = glove ?? c.sk;
  const [x, y] = h;
  const P = (px: number, py: number) => `${f(x + px * s)},${f(y + py * s)}`;
  const body = `M${P(-2.8, -2.8)}C${P(-3.8, -1)} ${P(-3.8, 2.4)} ${P(-2.4, 3.4)}C${P(-0.6, 4.4)} ${P(2.4, 4)} ${P(3.2, 2.4)}C${P(3.8, 0.6)} ${P(3.4, -2.2)} ${P(2.2, -3.2)}C${P(0.6, -4)} ${P(-1.8, -3.8)} ${P(-2.8, -2.8)}Z`;
  let out = shade(d, body, sk, { lw: 1, off: [-0.7, -0.7] });
  if (!back) {
    out += line(`M${P(-2.6, -0.6)}Q${P(0, 0.2)} ${P(2.8, -0.4)}M${P(-2.6, 1.4)}Q${P(0, 2.2)} ${P(2.8, 1.6)}`, 0.5, sk.d);
    out += shade(d, limb([x + 1.2 * s, y - 2.4 * s], [x + 3.4 * s, y - 0.4 * s], 1.9 * s, 1.6 * s), sk, { lw: 0.85, off: [-0.3, -0.3], k: 0 });
  } else out += line(`M${P(-2.2, -1.6)}Q${P(0, -2.4)} ${P(2.2, -1.6)}`, 0.5, sk.d);
  if (c.z && !glove) out += circ(x + 2.6 * s, y + 2.6 * s, 0.5, '#3A3018') + circ(x + 2.8 * s, y + 0.6 * s, 0.5, '#3A3018');
  return out;
}

/** Big laced boxing mitt at the hand position. */
export function boxingGlove(c: Ctx, h: Pt, col: Tone): string {
  const { d, back } = c;
  const [x, y] = h;
  let s = shade(d, `M${f(x - 3.2)},${f(y - 6.4)}L${f(x + 3.4)},${f(y - 6.4)}L${f(x + 3.6)},${f(y - 2.6)}L${f(x - 3.4)},${f(y - 2.6)}Z`, tone('#C8C2AE'), { lw: 0.9, k: 0 });
  const g = `M${f(x - 4.8)},${f(y - 3)}C${f(x - 6.4)},${f(y + 2)} ${f(x - 4)},${f(y + 7.4)} ${f(x + 0.6)},${f(y + 7.4)}C${f(x + 5.4)},${f(y + 7.4)} ${f(x + 6.8)},${f(y + 3)} ${f(x + 6)},${f(y - 1)}C${f(x + 5.4)},${f(y - 4)} ${f(x - 4)},${f(y - 5)} ${f(x - 4.8)},${f(y - 3)}Z`;
  s += shade(d, g, col, { lw: 1.1, off: [-1.1, -1.1], inner: fill(ellD(x - 1.6, y - 0.4, 2, 1.2), lt(col.b, 0.35), 'opacity="0.6"') + speck([x - 6, y - 4, x + 7, y + 8], 8, [col.d], c.seed, 0.3, 0.6, 0.5) });
  if (!back) s += shade(d, `M${f(x + 3)},${f(y - 2)}C${f(x + 7)},${f(y - 2)} ${f(x + 7.4)},${f(y + 3)} ${f(x + 4.6)},${f(y + 3.6)}C${f(x + 3.6)},${f(y + 2)} ${f(x + 3)},${f(y)} ${f(x + 3)},${f(y - 2)}Z`, col, { lw: 0.9, k: 0 });
  s += line(`M${f(x - 1)},${f(y - 6)}l1.6,1.2M${f(x + 0.8)},${f(y - 6)}l-1.6,1.2`, 0.5, '#6A6A60');
  if (c.z) s += fill(ellD(x + 2, y + 4.6, 1.8, 1.2), SLIME_L, 'opacity="0.85"') + line(`M${f(x - 3)},${f(y + 1)}l1.6,1.6l1.2,-1`, 0.6);
  return s;
}

// ---------------------------------------------------------------- arms
export type Sleeve = 'long' | 'short' | 'none' | 'rolled' | 'cap';

export interface HandItem {
  /** paint under the fist (shafts passing behind the hand) */
  under?: (c: Ctx, h: Pt) => string;
  /** paint over the fist */
  over?: (c: Ctx, h: Pt) => string;
  /** hand pose */
  fist?: boolean;
  /** extent relative to the fist centre (for the part's image box) */
  box?: [number, number, number, number];
}

export interface ArmSpec {
  sleeve: Sleeve;
  col: Tone;
  /** shirt cuff colour peeking out of a jacket sleeve */
  cuff?: string;
  /** cuff band in the sleeve colour (sweaters, hoodies) */
  band?: boolean;
  glove?: Tone;
  /** boxing gloves instead of hands */
  boxing?: Tone;
  /** forearm covering (long gloves, sleeves of an undershirt) */
  forearm?: Tone;
  watch?: string;
  wristband?: string;
  /** width multiplier */
  bulk?: number;
  /** items per side: L (screen-left, near in the front view) / R */
  itemL?: HandItem;
  itemR?: HandItem;
  /** extra paint on the arm (bite marks, tattoos…), arm frame */
  extra?: (c: Ctx, w: Pt) => string;
  /** zombie: which side keeps its sleeve intact */
  stripes?: string;
}

export function armGeo(c: Ctx): { e: Pt; w: Pt; h: Pt; aw: number } {
  const s = c.side;
  const L = c.b.armLen;
  const e: Pt = [s * 1.4 + 0.2, L * 0.5];
  const w: Pt = [s * 2.2 + 0.7, L - 1.4];
  return { e, w, h: [w[0] + 0.2, w[1] + 3.8], aw: c.b.armW };
}

export type ArmPaint = Paint & { items?: { L?: HandItem; R?: HandItem } };

/** Hand (fist) centre in the arm frame. */
export function handAt(armLen: number, side: -1 | 1): Pt {
  return [side * 2.2 + 0.9, armLen + 2.4];
}

export function armPaint(spec: ArmSpec): ArmPaint {
  const fn: ArmPaint = (c) => {
    const { d, z, side, seed, back } = c;
    const { e, w, h, aw } = armGeo(c);
    const bulk = spec.bulk ?? 1;
    const A = aw * bulk;
    const sk = c.sk;
    const item = side < 0 ? spec.itemL : spec.itemR;
    const sil: string[] = [];
    let s = '';
    // bare skin arm
    const up = limb([0, 0], e, A, A * 0.86);
    const fo = limb(e, w, A * 0.86, A * 0.7);
    const skinArm = () => {
      let t = shade(d, fo, sk, { lw: 1.05, off: [-0.8, -0.8] }) + shade(d, up, sk, { lw: 1.05, off: [-0.9, -0.9] });
      t += line(`M${f(e[0] - A * 0.3)},${f(e[1] - 0.4)}q${f(A * 0.3)},0.8 ${f(A * 0.6)},0`, 0.45, sk.d);
      if (bulk > 1.2) t += line(`M${f(-A * 0.25)},${f(e[1] * 0.45)}q${f(A * 0.3)},${f(e[1] * 0.25)} ${f(A * 0.05)},${f(e[1] * 0.5)}`, 0.5, sk.d, 'opacity="0.8"');
      if (z) t += inside(d, fo, fill(ellD(w[0] - 0.4, w[1] - 4, 1.4, 2.2), sk.d, 'opacity="0.35"') + line(`M${f(e[0])},${f(e[1] + 2)}q1,3 -0.4,6`, 0.35, sk.d, 'opacity="0.7"'));
      sil.push(up, fo);
      return t;
    };
    const T = spec.col;
    const torn = z ? 1.6 : 0;
    switch (spec.sleeve) {
      case 'long': {
        const sl = tube([0, 0], [w[0], w[1] - (z && side > 0 ? 7 : 0.4)], A + 1.6, A + 0.4, torn, seed + side);
        if (z && side > 0) s += skinArm();
        if (spec.forearm) s += shade(d, fo, spec.forearm, { lw: 1 });
        let inner = speck([-6, -3, 6, w[1]], 10, [T.d, lt(T.b, 0.2)], seed + 7 + side, 0.2, 0.4, 0.35);
        inner += fold(`M${f(e[0] - A * 0.5)},${f(e[1] - 1.6)}q${f(A * 0.5)},1.4 ${f(A)},0.2M${f(e[0] - A * 0.4)},${f(e[1] + 1.2)}q${f(A * 0.4)},1 ${f(A * 0.8)},0`, T.s, 0.6);
        inner += fold(`M${f(-A * 0.3)},3q${f(A * 0.2)},3 ${f(A * 0.1)},6`, T.s, 0.5, 0.6);
        if (spec.stripes) inner += line(`M${f(side * A * 0.3)},0L${f(w[0] + side * A * 0.25)},${f(w[1])}`, 1, spec.stripes, 'opacity="0.9"');
        if (spec.band && !z) inner += fill(`M-10,${f(w[1] - 3.4)}H10V${f(w[1] + 2)}H-10Z`, T.s, 'opacity="0.7"') + line(`M-10,${f(w[1] - 3.4)}H10`, 0.5, T.d);
        if (z) inner += rip(e[0] - side * 0.2, e[1] + 1, 1.4, 1.8, sk, seed + 3 + side);
        s += shade(d, sl, T, { lw: 1.1, inner });
        if (spec.cuff && !(z && side > 0)) s += shade(d, tube([w[0] - 0.1, w[1] - 1.8], [w[0], w[1] + 0.2], A + 0.2, A + 0.1), { b: spec.cuff, s: dk(spec.cuff, 0.82), d: dk(spec.cuff, 0.6) }, { lw: 0.8, k: 0 });
        sil.push(sl);
        break;
      }
      case 'short':
      case 'cap':
      case 'rolled': {
        s += skinArm();
        const end: Pt = spec.sleeve === 'rolled' ? [e[0], e[1] + 0.6] : spec.sleeve === 'cap' ? [side * 0.6, 5] : [side * 0.9, 8.6];
        const sl = tube([0, 0], end, A + 2, A + 1.8, torn, seed + side + 3);
        let inner = speck([-6, -3, 6, end[1]], 8, [T.d, lt(T.b, 0.2)], seed + 9 + side, 0.2, 0.4, 0.35) + fold(`M${f(-A * 0.4)},${f(end[1] - 2.6)}q${f(A * 0.5)},1 ${f(A)},0`, T.s, 0.6);
        if (spec.stripes) inner += line(`M${f(-A)},${f(end[1] - 1.6)}H${f(A)}`, 0.9, spec.stripes);
        s += shade(d, sl, T, { lw: 1.1, inner });
        if (spec.sleeve === 'rolled') s += shade(d, limb([end[0] - A * 0.62, end[1] - 0.6], [end[0] + A * 0.62, end[1] - 0.2], 2.6, 2.6), T, { lw: 0.9, k: 0 }) + line(`M${f(end[0] - A * 0.5)},${f(end[1] - 0.4)}h${f(A)}`, 0.4, T.d);
        sil.push(sl);
        break;
      }
      case 'none':
        s += skinArm();
        if (spec.forearm) s += shade(d, tube([e[0] + side * 0.1, e[1] - 2.4], w, A * 0.95, A * 0.78), spec.forearm, { lw: 1, off: [-0.6, -0.6] }) + line(`M${f(e[0] - A * 0.45)},${f(e[1] - 1.6)}h${f(A * 0.9)}`, 0.5, spec.forearm.d);
        break;
    }
    if (spec.extra) s += spec.extra(c, w);
    if (spec.wristband) s += shade(d, tube([w[0], w[1] - 2.8], [w[0], w[1] + 0.4], A * 0.8, A * 0.78), { b: spec.wristband, s: dk(spec.wristband), d: dk(spec.wristband, 0.6) }, { lw: 0.8, k: 0 });
    if (spec.watch && side < 0 && !back) s += outl(`M${f(w[0] - A * 0.45)},${f(w[1] - 2.4)}h${f(A * 0.9)}v2.2h${f(-A * 0.9)}Z`, spec.watch, 0.6);
    if (item?.under) s += item.under(c, h);
    if (spec.boxing) s += boxingGlove(c, h, spec.boxing);
    else if (item?.fist) s += fist(c, h, spec.glove);
    else s += hand(c, w, spec.glove);
    sil.push(ellD(w[0], w[1] + 3.6, 3, 4.6));
    if (item?.over) s += item.over(c, h);
    if (!c.near) s += `<g opacity="0.16">${sil.map((p) => fill(p, INK)).join('')}</g>`;
    return s;
  };
  fn.items = { L: spec.itemL, R: spec.itemR };
  return fn;
}

// ---------------------------------------------------------------- legs & shoes
export type Shoe = 'sneaker' | 'dress' | 'boot' | 'heel' | 'flat' | 'slipper' | 'bare' | 'clog';
export type LegKind = 'pants' | 'shorts' | 'bare' | 'tights' | 'skirtleg';

export interface LegSpec {
  kind: LegKind;
  col: Tone;
  shoe: Shoe;
  shoeCol: Tone;
  sole?: string;
  sock?: Tone;
  stripe?: string;
  /** zombie: this side loses its shoe */
  zBareSide?: -1 | 1;
  cuffs?: boolean;
  kneepad?: string;
}

function shoeFront(c: Ctx, spec: LegSpec, x: number, y: number, kind: Shoe): string {
  const { d } = c;
  const T = spec.shoeCol;
  const P = (px: number, py: number) => `${f(x + px)},${f(y + py)}`;
  let s = '';
  switch (kind) {
    case 'bare': {
      const sk = c.sk;
      const foot = `M${P(-3.4, 0.2)}L${P(6.4, 0.2)}C${P(8, 0.2)} ${P(8.2, -1.8)} ${P(6.6, -2.6)}C${P(4.4, -3.4)} ${P(2.4, -3.8)} ${P(0.6, -4.6)}L${P(-2.8, -4.6)}C${P(-4, -3.4)} ${P(-4.2, -1.2)} ${P(-3.4, 0.2)}Z`;
      s += shade(d, foot, sk, { lw: 1.05, off: [-0.6, -0.6] });
      s += line(`M${P(5.4, -2.4)}v2.2M${P(3.8, -2.8)}v2.6M${P(2.2, -3.2)}v2.6`, 0.45, sk.d);
      s += circ(x + 7, y - 1.2, 0.5, c.z ? '#3A3018' : sk.d, 0.8);
      return s;
    }
    case 'heel': {
      const sh = `M${P(-3, -0.4)}L${P(-2.6, -4.4)}C${P(0, -5)} ${P(3, -3.6)} ${P(6.8, -0.8)}C${P(7.6, 0.4)} ${P(6.4, 0.6)} ${P(4.4, 0.4)}L${P(-0.6, -0.6)}L${P(-1.6, 1)}L${P(-2.8, 1)}Z`;
      s += shade(d, sh, T, { lw: 1, off: [-0.5, -0.5] }) + fill(ellD(x + 3.4, y - 2.4, 1.4, 0.4), lt(T.b, 0.5), 'opacity="0.6" transform="rotate(25 ' + f(x + 3.4) + ' ' + f(y - 2.4) + ')"');
      return s;
    }
    default:
      break;
  }
  const h = kind === 'boot' ? 7.2 : kind === 'slipper' ? 3.8 : kind === 'dress' || kind === 'flat' ? 4.4 : 5;
  const toe = kind === 'dress' ? 8.6 : kind === 'boot' ? 8.2 : kind === 'slipper' ? 7.4 : 7.8;
  const sh =
    `M${P(-3.9, 0.3)}L${P(toe - 0.6, 0.3)}C${P(toe + 1, 0.2)} ${P(toe + 1.2, -1.8)} ${P(toe - 0.2, -2.8)}` +
    `C${P(toe - 1.8, -h * 0.75)} ${P(3.6, -h * 0.85)} ${P(2.4, -h)}L${P(-3.2, -h - 0.2)}C${P(-4.4, -h + 1.6)} ${P(-4.6, -1.6)} ${P(-3.9, 0.3)}Z`;
  let inner = '';
  const sole = spec.sole ?? (kind === 'sneaker' ? '#C8C2AE' : kind === 'boot' ? '#2A221A' : dk(T.s, 0.7));
  inner += fill(`M${P(-6, -1.4)}H${f(x + 12)}V${f(y + 2)}H${f(x - 6)}Z`, sole) + line(`M${P(-6, -1.4)}H${f(x + 12)}`, 0.5);
  if (kind === 'sneaker') {
    inner += line(`M${P(toe - 4.4, -3.4)}q1.4,0.8 2.6,2`, 0.5, T.d) + line(`M${P(0.6, -h + 0.6)}l2.4,0.9M${P(1.2, -h + 1.8)}l2.4,0.9`, 0.55, T.d);
    inner += grime([x - 4, y - h, x + 9, y], 3, '#5A4A2A', c.seed + 61, 1.6, 0.3);
  } else if (kind === 'boot') {
    inner += line(`M${P(-3.6, -h + 1.6)}H${f(x + 2.6)}`, 0.7) + line(`M${P(0.4, -h + 2.8)}l2,0.6M${P(0.8, -h + 4.2)}l2,0.6`, 0.55, T.d);
    inner += line(`M${P(toe - 3.6, -3.4)}q1.4,0.6 2.4,2.2`, 0.5, T.d);
  } else if (kind === 'dress') {
    inner += fill(ellD(x + toe - 2.6, y - 2.4, 1.6, 0.6), lt(T.b, 0.5), 'opacity="0.6"') + line(`M${P(0.6, -h + 0.8)}l2.2,1`, 0.5, T.d);
  } else if (kind === 'slipper') {
    inner += fill(`M${P(1, -h)}C${P(4, -h - 1)} ${P(toe, -3.6)} ${P(toe, -1.4)}L${P(1, -1.4)}Z`, lt(T.b, 0.15), 'opacity="0.6"');
  }
  s += shade(d, sh, T, { lw: 1.05, off: [-0.7, -0.7], inner });
  return s;
}

function shoeBack(c: Ctx, spec: LegSpec, x: number, y: number, kind: Shoe): string {
  const { d } = c;
  const T = spec.shoeCol;
  const P = (px: number, py: number) => `${f(x + px)},${f(y + py)}`;
  if (kind === 'bare') {
    const heel = `M${P(-3.4, 0.2)}L${P(4.4, 0.2)}C${P(5.4, -1)} ${P(4.8, -3.8)} ${P(3.4, -4.4)}L${P(-2.6, -4.6)}C${P(-3.8, -3.6)} ${P(-4.2, -1.4)} ${P(-3.4, 0.2)}Z`;
    return shade(d, heel, c.sk, { lw: 1, off: [-0.5, -0.5] }) + fill(ellD(x, y - 0.8, 2.6, 0.8), c.sk.d, 'opacity="0.4"');
  }
  if (kind === 'heel') {
    return shade(d, `M${P(-3, -0.6)}L${P(-3, -4.2)}C${P(-1, -5)} ${P(2, -4.6)} ${P(3.6, -3.4)}L${P(3.2, -0.6)}L${P(0.8, -0.6)}L${P(0.6, 1.2)}L${P(-1, 1.2)}L${P(-1.2, -0.6)}Z`, T, { lw: 1, off: [-0.5, -0.5] });
  }
  const h = kind === 'boot' ? 7 : kind === 'slipper' ? 3.6 : 4.8;
  const sh = `M${P(-3.8, 0.3)}L${P(4.8, 0.3)}C${P(5.6, -1)} ${P(5.2, -h * 0.8)} ${P(3.4, -h)}L${P(-2.6, -h)}C${P(-4.2, -h + 1)} ${P(-4.6, -1.4)} ${P(-3.8, 0.3)}Z`;
  const sole = spec.sole ?? (kind === 'sneaker' ? '#C8C2AE' : kind === 'boot' ? '#2A221A' : dk(T.s, 0.7));
  const inner = fill(`M${P(-6, -1.4)}H${f(x + 8)}V${f(y + 2)}H${f(x - 6)}Z`, sole) + line(`M${P(-6, -1.4)}H${f(x + 8)}`, 0.5) + line(`M${P(-0.6, -h + 0.6)}Q${P(-0.8, -3)} ${P(-0.2, -1.6)}`, 0.6, T.d);
  return shade(d, sh, T, { lw: 1.05, off: [-0.6, -0.6], inner });
}

export function legPaint(spec: LegSpec): Paint {
  return (c) => {
    const { d, z, side, seed, back, b } = c;
    const L = -b.hipY;
    const W = b.legW;
    const ank: Pt = [side * 0.3, L - 4.2];
    const sil: string[] = [];
    let s = '';
    const bareFoot = z && spec.zBareSide === side;
    const shoe: Shoe = bareFoot ? 'bare' : spec.shoe;
    const skinLeg = (w1: number, w2: number, to: Pt = [ank[0], L - 1.6]) => {
      const p = limb([0, 0], to, w1, w2);
      sil.push(p);
      let t = shade(d, p, c.sk, { lw: 1.05, off: [-0.8, -0.8] });
      t += line(`M${f(-w1 * 0.25)},${f(L * 0.52)}q${f(w1 * 0.3)},0.8 ${f(w1 * 0.5)},0`, 0.45, c.sk.d);
      if (z) t += inside(d, p, fill(ellD(0.6, L * 0.62, 1.6, 2.4), c.sk.d, 'opacity="0.35"') + circ(-0.8, L * 0.4, 0.5, '#5A4A22'));
      return t;
    };
    const T = spec.col;
    switch (spec.kind) {
      case 'pants': {
        const hemY = L - (shoe === 'boot' ? 5.6 : 3.4);
        const p = tube([0, 0], [ank[0], hemY - (z ? 1.4 : 0)], W, W - 0.6, z ? 1.6 : 0, seed + side * 5);
        if (z) s += skinLeg(W - 2.4, W - 2.8, [ank[0], L - 2]);
        let inner = speck([-6, 0, 6, L], 14, [T.d, lt(T.b, 0.2)], seed + 3 + side, 0.2, 0.45, 0.4);
        inner += fold(`M${f(-W * 0.35)},${f(L * 0.45)}q${f(W * 0.35)},1 ${f(W * 0.7)},-0.2M${f(-W * 0.3)},${f(hemY - 3)}q${f(W * 0.3)},0.9 ${f(W * 0.6)},0`, T.s, 0.6);
        inner += fold(`M${f(side * 0.6)},2V${f(L * 0.4)}`, T.s, 0.5, 0.6);
        if (spec.stripe) inner += line(`M${f(side * W * 0.32)},0V${f(L)}`, 1, spec.stripe, 'opacity="0.9"');
        if (spec.kneepad) inner += outl(`M${f(-W * 0.5)},${f(L * 0.45)}h${f(W)}v4.4h${f(-W)}Z`, spec.kneepad, 0.6);
        if (z) inner += rip(side * 0.4, L * 0.5, 1.6, 1.8, c.sk, seed + side * 3) + grime([-6, L * 0.6, 6, L], 3, '#4A4028', seed + 4, 1.6, 0.35);
        s += shade(d, p, T, { lw: 1.1, inner });
        if (spec.cuffs && !z) s += shade(d, tube([ank[0], hemY - 1.8], [ank[0], hemY + 0.2], W - 0.4, W - 0.4), T, { lw: 0.8, k: 0 });
        sil.push(p);
        break;
      }
      case 'shorts': {
        s += skinLeg(W - 1.6, W - 2.8);
        if (spec.sock) s += shade(d, tube([ank[0], L - 9], [ank[0], L - 2.4], W - 2.4, W - 2.6), spec.sock, { lw: 0.9, k: 0, inner: line(`M-6,${f(L - 7.8)}H6M-6,${f(L - 6.8)}H6`, 0.5, spec.stripe ?? spec.sock.d) });
        const p = tube([0, 0], [side * 0.6, L * 0.42], W + 1.2, W + 1.6, z ? 1.4 : 0, seed + side);
        let inner = speck([-7, 0, 7, L * 0.5], 8, [T.d, lt(T.b, 0.2)], seed + 6, 0.2, 0.4, 0.4) + fold(`M${f(-W * 0.4)},${f(L * 0.3)}q${f(W * 0.4)},1 ${f(W * 0.8)},0`, T.s, 0.6);
        if (spec.stripe) inner += line(`M${f(side * W * 0.45)},0V${f(L)}`, 1.1, spec.stripe);
        s += shade(d, p, T, { lw: 1.1, inner });
        sil.push(p);
        break;
      }
      case 'tights':
      case 'skirtleg': {
        const p = limb([0, 0], [ank[0], L - 1.6], W - 1, W - 2.6);
        let inner = spec.kind === 'tights' ? fold(`M${f(-W * 0.3)},${f(L * 0.5)}q${f(W * 0.3)},0.8 ${f(W * 0.6)},0`, T.s, 0.5) : '';
        if (spec.stripe) inner += line(`M${f(side * W * 0.3)},0V${f(L)}`, 0.9, spec.stripe);
        if (z) inner += rip(0, L * 0.45, 1.6, 2, c.sk, seed + side * 7);
        s += shade(d, p, spec.kind === 'tights' ? T : c.sk, { lw: 1.05, off: [-0.8, -0.8], inner });
        sil.push(p);
        break;
      }
      case 'bare':
        s += skinLeg(W - 0.6, W - 2);
        break;
    }
    s += back ? shoeBack(c, spec, ank[0] - side * 0.2, L, shoe) : shoeFront(c, spec, ank[0] + 0.6, L, shoe);
    if (!c.near) s += `<g opacity="0.12">${sil.map((p) => fill(p, INK)).join('')}</g>`;
    return s;
  };
}

export { stitch, smooth, jag, mix, lt, dk, fadeV, LW, LI, LF, BLOOD, SLIME, SLIME_L, GREASE };
