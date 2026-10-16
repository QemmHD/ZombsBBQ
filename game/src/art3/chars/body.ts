/**
 * Bodies: the gumdrop torso (front 3/4 + back 3/4), neck, generic shirt / jacket / pants painters,
 * arms with articulated hands (and fists holding props), legs and shoes. Zombie mode tears hems,
 * opens rips onto green skin and adds stains.
 */
import type { Body, Ctx, Paint } from './rig';
import { elbowAt, kneeAt } from './rig';
import {
  INK, LW, LI, LF, f, ellD, fill, line, outl, circ, inside, shade, speck, hatch, grime, fold, stain, rip, drip,
  limb, tube, seg, band, jag, rnd, mix, dk, lt, fadeV, smooth, stitch, tone,
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
    // side seam, drag lines from the near armpit across the chest, a crease over the belly
    const sx0 = edgeX(b, b.shY + 3, back ? -1 : 1) - (back ? -1.6 : 1.6);
    const sx1 = edgeX(b, b.tBot - 3, back ? -1 : 1) - (back ? -1.8 : 1.8);
    inner += line(`M${f(sx0)},${f(b.shY + 3)}Q${f((sx0 + sx1) / 2 + (back ? -0.6 : 0.6))},${f((b.shY + b.tBot) / 2)} ${f(sx1)},${f(b.tBot - 3)}`, 0.4, T.d, 'opacity="0.55"');
    if (!back) {
      inner += fold(`M${f(-b.wTop + 2.2)},${f(b.shY + 4)}q2.6,0.4 4.6,2.6M${f(-b.wTop + 2.6)},${f(b.shY + 6.6)}q1.8,0.2 3.2,1.8`, T.s, 0.5, 0.7);
      inner += fold(`M${f(-2 + b.belly * 0.3)},${f(b.tBot - 13 + b.belly)}q3,1.2 ${f(6 + b.belly * 0.5)},0.2`, T.s, 0.5, 0.65);
    }
    if (spec.pants && !spec.untucked) {
      // the shirt blouses over the waistband in little sags
      inner += fold(`M${f(-b.wBot + 3)},${f(wy - 1.6)}q2,1.4 4,0.2q2,1.2 4.2,0q2,1.4 4.4,0.2q1.8,1.2 3.6,0`, T.s, 0.5, 0.8);
      inner += waistband(c, spec, wy);
    }
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
    if (spec.untucked && !z) s += line(`M${f(-b.wBot + 2.6)},${f(b.tBot - 0.6)}Q0.5,${f(b.tBot + 0.8)} ${f(b.wBot - 2.6)},${f(b.tBot - 0.6)}`, 0.5, T.d) + line(`M${f(-b.wBot + 2.2)},${f(b.tBot - 1.8)}Q0.5,${f(b.tBot - 0.4)} ${f(b.wBot - 2.2)},${f(b.tBot - 1.8)}`, 0.35, T.d, 'stroke-dasharray="0.8 0.6" opacity="0.75"');
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
    if (j.pockets) {
      const flap = (x: number, y: number, w: number) => outl(`M${f(x)},${f(y)}h${f(w)}l-0.3,2.2q${f(-w / 2 + 0.3)},0.8 ${f(-w + 0.6)},0Z`, T.s, 0.6);
      s += flap(-9.8, b.tBot - 7.6 + (j.long ?? 0) * 0.5, 6) + flap(7, b.tBot - 8.6 + (j.long ?? 0) * 0.5, 5.6) + line(`M${f(-8.4)},${f(b.shY + 5)}h4.4`, 0.8, T.d);
    }
    s += inside(d, td, line(`M${f(edgeX(b, b.shY + 3, 1) - 1.6)},${f(b.shY + 3)}L${f(edgeX(b, b.tBot - 2, 1) - 1.8)},${f(b.tBot + (j.long ?? 0))}`, 0.45, T.d, 'opacity="0.6"') +
      line(`M${f(-b.wBot - 2)},${f(b.tBot + (j.long ?? 0) - 1.4)}Q0.5,${f(b.tBot + (j.long ?? 0))} ${f(b.wBot + 2)},${f(b.tBot + (j.long ?? 0) - 1.4)}`, 0.35, T.d, 'stroke-dasharray="0.8 0.6" opacity="0.7"'));
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
/**
 * Open relaxed hand hanging from the wrist (0,0), fingers down, thumb toward +x (forward): a chunky
 * cartoon mitt (three fat fingers side by side, a palm pad, a separate thumb). The wrist edge is not
 * inked over bare skin, so the hand grows out of the forearm instead of sitting on it.
 */
export function hand(c: Ctx, w: Pt, glove?: Tone, s = 1): string {
  const { d, back, z } = c;
  const sk = glove ?? c.sk;
  const [x, y] = w;
  const P = (px: number, py: number) => `${f(x + px * s)},${f(y + py * s)}`;
  const Q = (px: number, py: number): Pt => [x + px * s, y + py * s];
  const palm = `M${P(-2.6, -0.8)}C${P(-3.7, 1.2)} ${P(-3.9, 3.8)} ${P(-3.4, 5.9)}L${P(2.9, 5.7)}C${P(3.3, 3.6)} ${P(3, 1.2)} ${P(2.3, -0.8)}Z`;
  const fingers = [
    limb(Q(-2.25, 4.4), Q(-2.4, 7.4), 2.7 * s, 2.4 * s),
    limb(Q(-0.55, 4.8), Q(-0.5, 8.3), 2.8 * s, 2.5 * s),
    limb(Q(1.25, 4.6), Q(1.2, 7.9), 2.7 * s, 2.4 * s),
  ];
  const th = seg(Q(1.6, 1.2), Q(3.9, 5), 2.9 * s, 2.3 * s, 'round', 0, 1, 0.9);
  const thumb = () => shade(d, th.fill, sk, { lw: 0.9, off: [-0.5, -0.5], k: 0, stroke: th.edge, inner: line(`M${P(3.3, 4.6)}q0.5,0.1 0.8,-0.3`, 0.35, sk.d, 'opacity="0.8"') });
  let out = '';
  if (back) out += thumb();
  // one mitt silhouette: ink every piece at double width first, then the fills over it, so only the
  // outer edge is inked; thin split lines then separate the fingers
  const lw = 0.95;
  out += line(fingers.join('') + `M${P(-3.4, 5.9)}C${P(-3.9, 3.8)} ${P(-3.7, 1.2)} ${P(-2.6, -0.8)}M${P(2.3, -0.8)}C${P(3, 1.2)} ${P(3.3, 3.6)} ${P(2.9, 5.7)}`, lw * 2, INK);
  for (const fg of fingers) out += shade(d, fg, sk, { lw: 0, off: [-0.5, -0.6], k: 0 });
  // palm pad over the finger roots: knuckle dimples, a crease, cel shadow on the far edge
  const pin = fill(`M${P(1.4, -1)}C${P(2.6, 1.4)} ${P(2.8, 3.6)} ${P(2.2, 6)}L${P(4, 6)}L${P(4, -1)}Z`, sk.s, 'opacity="0.55"') +
    (back
      ? line(`M${P(-1.8, 3.8)}Q${P(0, 4.6)} ${P(1.8, 3.8)}`, 0.45, sk.d) + circ(x - 1.4 * s, y + 4.6 * s, 0.35 * s, sk.d, 0.6) + circ(x + 0.4 * s, y + 5 * s, 0.35 * s, sk.d, 0.6)
      : line(`M${P(-0.6, 1.6)}q0.9,1.4 0.5,3`, 0.45, sk.d) + line(`M${P(-2.6, 2.4)}q0.4,1.2 0.2,2.2`, 0.4, sk.s));
  out += shade(d, palm, sk, { lw: 0, off: [-0.8, -0.6], inner: pin });
  if (glove) out += line(`M${P(-2.6, -0.8)}L${P(2.3, -0.8)}`, lw);
  out += line(`M${P(-1.4, 5.6)}C${P(-1.5, 6.6)} ${P(-1.45, 7.4)} ${P(-1.3, 8.2)}M${P(0.4, 5.8)}C${P(0.4, 6.8)} ${P(0.35, 7.6)} ${P(0.3, 8.4)}`, 0.6, INK);
  if (!back) out += thumb();
  if (z && !glove) {
    // dark rotten nails and a knuckle sore
    out += circ(x - 2.4 * s, y + 8.2 * s, 0.6 * s, '#3A3018') + circ(x - 0.5 * s, y + 9.1 * s, 0.6 * s, '#3A3018') + circ(x + 1.2 * s, y + 8.7 * s, 0.6 * s, '#3A3018');
    out += fill(ellD(x - 0.6 * s, y + 2 * s, 1 * s, 0.7 * s), '#5A4A22', 'opacity="0.7"');
  } else if (!glove) out += line(`M${P(-2.9, 7.9)}q0.5,0.5 1,0.1M${P(-1.1, 8.8)}q0.6,0.5 1.1,0.1M${P(0.7, 8.4)}q0.5,0.5 1,0.1`, 0.35, sk.d, 'opacity="0.55"');
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

/** Hands and hand props are drawn this much bigger than authored (chunky cartoon mitts). */
export const HAND_S = 1.45;
/** Hand props are drawn this much bigger than authored. */
export const PROP_S = 1.18;

export interface HandItem {
  /** paint under the fist (shafts passing behind the hand) */
  under?: (c: Ctx, h: Pt) => string;
  /** paint over the fist */
  over?: (c: Ctx, h: Pt) => string;
  /** hand pose */
  fist?: boolean;
  /** extent relative to the fist centre, before HAND_S (for the part's image box) */
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
  /** forearm covering (long gloves) */
  forearm?: Tone;
  watch?: string;
  wristband?: string;
  /** width multiplier */
  bulk?: number;
  /** items per side: L (screen-left, near in the front view) / R */
  itemL?: HandItem;
  itemR?: HandItem;
  /** extra paint on the forearm (bite marks…), lower-arm frame, w = wrist */
  extra?: (c: Ctx, w: Pt) => string;
  stripes?: string;
}

/** Wrist in the lower-arm frame (elbow at the origin). */
export function wristAt(b: Body, side: -1 | 1): Pt {
  return [side * 1.2, b.foreL];
}
/** Fist centre in the lower-arm frame. */
export function handAt(b: Body, side: -1 | 1): Pt {
  const w = wristAt(b, side);
  return [w[0] + 0.3, w[1] + 3.8 * HAND_S];
}

function dim(c: Ctx, sil: string[]): string {
  return c.near ? '' : `<g opacity="0.16">${sil.map((p) => fill(p, INK)).join('')}</g>`;
}

export interface ArmSet {
  up: Paint;
  lo: Paint;
  items: { L?: HandItem; R?: HandItem };
}

/** Upper-arm / forearm widths at the shoulder, elbow and wrist (bare skin), as multiples of the arm width. */
const ARM_SH = 0.94;
const ARM_EL = 0.9;
const ARM_WR = 0.76;

export function armPaint(spec: ArmSpec): ArmSet {
  const A_ = (c: Ctx) => c.b.armW * (spec.bulk ?? 1);
  const up: Paint = (c) => {
    const { d, z, side, seed } = c;
    const A = A_(c);
    const E = elbowAt(c.b, side);
    const T = spec.col;
    const sk = c.sk;
    const sil: string[] = [];
    let s = '';
    const skin = () => {
      const p = limb([0, 0], E, A * ARM_SH, A * ARM_EL);
      sil.push(p);
      let inner = '';
      // biceps bulge and the inner elbow crease
      inner += line(`M${f(E[0] * 0.55 + A * 0.12)},${f(E[1] * 0.42)}q${f(A * 0.22)},${f(E[1] * 0.16)} ${f(A * 0.06)},${f(E[1] * 0.34)}`, 0.55, sk.s, 'opacity="0.9"');
      inner += line(`M${f(E[0] + A * 0.1)},${f(E[1] - 1.6)}q${f(A * 0.16)},0.8 ${f(A * 0.3)},0.2`, 0.5, sk.d, 'opacity="0.7"');
      if ((spec.bulk ?? 1) > 1.1 || c.b.armW > 12) inner += line(`M${f(-A * 0.2)},${f(E[1] * 0.25)}q${f(A * 0.3)},${f(E[1] * 0.3)} 0,${f(E[1] * 0.55)}`, 0.6, sk.d, 'opacity="0.8"');
      if (z) inner += fill(ellD(A * 0.15, E[1] * 0.6, A * 0.22, E[1] * 0.2), sk.d, 'opacity="0.3"');
      return shade(d, p, sk, { off: [-1, -1], across: [E[0] - A * ARM_EL / 2, E[0] + A * ARM_EL / 2], inner });
    };
    const torn = z ? 1.8 : 0;
    if (spec.sleeve === 'long') {
      const p = limb([0, 0], E, A, A * 0.92);
      let inner = speck([-A, -A, A, E[1] + A], 12, [T.d, lt(T.b, 0.2)], seed + 7 + side, 0.25, 0.5, 0.35);
      // shoulder seam, sleeve drape and the bunching above the elbow
      inner += fold(`M${f(-A * 0.5)},${f(1.4)}q${f(A * 0.5)},1.2 ${f(A)},0.2`, T.d, 0.5, 0.6);
      inner += fold(`M${f(-A * 0.3)},${f(E[1] * 0.35)}q${f(A * 0.25)},${f(E[1] * 0.25)} ${f(A * 0.05)},${f(E[1] * 0.5)}`, T.s, 0.7);
      inner += fold(`M${f(E[0] - A * 0.42)},${f(E[1] - 3.4)}q${f(A * 0.4)},1.4 ${f(A * 0.75)},-0.2M${f(E[0] + A * 0.05)},${f(E[1] - 1.4)}q${f(A * 0.2)},0.6 ${f(A * 0.38)},-0.4`, T.s, 0.65);
      if (spec.stripes) inner += line(`M${f(side * A * 0.3)},0L${f(E[0] + side * A * 0.28)},${f(E[1])}`, 1.2, spec.stripes);
      if (z) inner += rip(-A * 0.1, E[1] * 0.55, 1.8, 2.2, sk, seed + 3 + side);
      s += shade(d, p, T, { off: [-1, -1], across: [E[0] - A * 0.46, E[0] + A * 0.46], inner });
      sil.push(p);
    } else {
      s += skin();
      if (spec.sleeve !== 'none') {
        // a rolled sleeve stops above the elbow cap so the forearm never paints over the roll
        const endY = spec.sleeve === 'rolled' ? E[1] - A * ARM_EL * 0.5 - 2.2 : spec.sleeve === 'cap' ? E[1] * 0.38 : E[1] * 0.62;
        const sl = tube([0, 0], [E[0] * (endY / E[1]), endY], A + 0.4, A + 0.8, torn, seed + side + 3);
        let inner = speck([-A, -A, A, endY], 10, [T.d, lt(T.b, 0.2)], seed + 9 + side, 0.25, 0.5, 0.35);
        inner += fold(`M${f(-A * 0.4)},${f(endY - 2.6)}q${f(A * 0.5)},1.2 ${f(A)},0`, T.s, 0.7);
        // shoulder seam + hem stitching
        inner += fold(`M${f(-A * 0.5)},${f(1.2)}q${f(A * 0.5)},1.2 ${f(A)},0.2`, T.d, 0.5, 0.6);
        if (!z) inner += line(`M${f(-A * 0.5)},${f(endY - 1)}q${f(A * 0.5)},0.7 ${f(A + 0.4)},0`, 0.35, T.d, 'stroke-dasharray="0.8 0.6" opacity="0.8"');
        if (spec.stripes) inner += line(`M${f(-A)},${f(endY - 1.8)}H${f(A)}`, 1.2, spec.stripes);
        s += shade(d, sl, T, { inner });
        if (spec.sleeve === 'rolled') {
          const ex = E[0] * (endY / E[1]);
          s += shade(d, limb([ex - A * 0.52, endY - 0.4], [ex + A * 0.52, endY + 0.2], 3.4, 3.4), T, { lw: 1.1, off: [-0.5, -0.6], inner: line(`M${f(ex - A * 0.5)},${f(endY - 0.1)}h${f(A)}`, 0.5, T.d) + line(`M${f(ex - A * 0.2)},${f(endY - 1.4)}l0.6,2.6M${f(ex + A * 0.25)},${f(endY - 1.2)}l-0.4,2.6`, 0.4, T.d, 'opacity="0.8"') });
        }
        sil.push(sl);
      }
    }
    return s + dim(c, sil);
  };
  const lo: Paint = (c) => {
    const { d, z, side, seed, back } = c;
    const A = A_(c);
    const W = wristAt(c.b, side);
    const h = handAt(c.b, side);
    const T = spec.col;
    const sk = c.sk;
    const item = side < 0 ? spec.itemL : spec.itemR;
    const sil: string[] = [];
    let s = '';
    const skin = (fromTop: boolean) => {
      const sg = seg([0, 0], W, A * ARM_EL, A * ARM_WR, 'round');
      const p = fromTop ? sg.fill : limb([0, 0], W, A * ARM_EL, A * ARM_WR);
      sil.push(p);
      let inner = '';
      // elbow point, forearm muscle and the wrist bones
      inner += line(`M${f(-A * 0.36)},${f(2.2)}q${f(-A * 0.06)},1.4 ${f(A * 0.02)},2.6`, 0.5, sk.s, 'opacity="0.9"');
      inner += line(`M${f(A * 0.12)},${f(W[1] * 0.18)}q${f(A * 0.2)},${f(W[1] * 0.3)} ${f(A * 0.02 + W[0] * 0.5)},${f(W[1] * 0.62)}`, 0.5, sk.s, 'opacity="0.85"');
      inner += fill(ellD(W[0] + A * 0.18, W[1] - 1, A * 0.12, 0.8), sk.s, 'opacity="0.6"');
      if (z) inner += fill(ellD(W[0] - 0.4, W[1] * 0.6, A * 0.18, W[1] * 0.25), sk.d, 'opacity="0.35"') + line(`M0.6,${f(W[1] * 0.3)}q1,2.4 -0.4,4.6`, 0.4, sk.d, 'opacity="0.7"');
      return shade(d, p, sk, { off: [-1, -1], across: [-A * ARM_EL / 2, A * ARM_EL / 2], inner, stroke: sg.edge });
    };
    if (spec.sleeve === 'long') {
      const tornHere = z && side > 0;
      const end: Pt = tornHere ? [W[0] * 0.5, W[1] * 0.5] : [W[0], W[1] - 0.2];
      if (tornHere) {
        const p = limb([W[0] * 0.3, W[1] * 0.3], W, A * 0.8, A * ARM_WR);
        sil.push(p);
        s += shade(d, p, sk, { off: [-1, -1], across: [-A * 0.42, A * 0.42] });
      }
      const sg = seg([0, 0], end, A * 0.92, A * 0.86, 'flat', tornHere ? 1.8 : 0, seed + side);
      const p = sg.fill;
      let inner = speck([-A, -A, A, W[1]], 8, [T.d, lt(T.b, 0.2)], seed + 11 + side, 0.25, 0.5, 0.35);
      // elbow bunching just below the joint, then a long drape fold to the cuff
      inner += fold(`M${f(-A * 0.3)},${f(1.8)}q${f(A * 0.3)},1.1 ${f(A * 0.62)},0.1M${f(-A * 0.1)},${f(3.6)}q${f(A * 0.2)},0.7 ${f(A * 0.45)},0`, T.s, 0.6);
      inner += fold(`M${f(-A * 0.35)},${f(W[1] * 0.5)}q${f(A * 0.3)},1.2 ${f(A * 0.7)},0`, T.s, 0.7);
      inner += fold(`M${f(A * 0.22)},${f(W[1] * 0.25)}q${f(-A * 0.1)},${f(W[1] * 0.25)} ${f(A * 0.06)},${f(W[1] * 0.5)}`, T.s, 0.5, 0.6);
      if (spec.stripes) inner += line(`M${f(side * A * 0.28)},0L${f(end[0] + side * A * 0.25)},${f(end[1])}`, 1.2, spec.stripes);
      if (spec.band && !tornHere) inner += fill(`M-12,${f(W[1] - 3)}H12V${f(W[1] + 3)}H-12Z`, T.s, 'opacity="0.7"') + line(`M-12,${f(W[1] - 3)}H12`, 0.6, T.d) + line(`M-1.6,${f(W[1] - 2.8)}V${f(W[1])}M0.8,${f(W[1] - 2.8)}V${f(W[1])}M3.2,${f(W[1] - 2.8)}V${f(W[1])}`, 0.35, T.d, 'opacity="0.8"');
      s += shade(d, p, T, { off: [-1, -1], across: [-A * 0.46, A * 0.46], inner, stroke: sg.edge });
      if (spec.cuff && !tornHere) s += shade(d, band(W[0], W[1] - 2.4, W[1] + 0.4, A * 0.88, A * 0.84), { b: spec.cuff, s: dk(spec.cuff, 0.82), d: dk(spec.cuff, 0.6) }, { lw: 1, k: 0, inner: circ(W[0] + A * 0.2, W[1] - 0.9, 0.45, dk(spec.cuff, 0.6)) });
      sil.push(p);
    } else {
      s += skin(true);
      if (spec.forearm) {
        const sg = seg([0, 0.4], W, A * 0.82, A * 0.66);
        s += shade(d, sg.fill, spec.forearm, { off: [-0.6, -0.6], stroke: sg.edge, across: [-A * 0.42, A * 0.42] }) + line(`M${f(-A * 0.4)},1.6h${f(A * 0.8)}`, 0.6, spec.forearm.d);
      }
    }
    if (spec.extra) s += spec.extra(c, W);
    if (spec.wristband) s += shade(d, band(W[0], W[1] - 3.4, W[1] + 0.4, A * 0.82, A * 0.8), { b: spec.wristband, s: dk(spec.wristband), d: dk(spec.wristband, 0.6) }, { lw: 1, k: 0 });
    if (spec.watch && side < 0 && !back) s += outl(`M${f(W[0] - A * 0.38)},${f(W[1] - 2.8)}h${f(A * 0.76)}v2.6h${f(-A * 0.76)}Z`, spec.watch, 0.7) + circ(W[0] + A * 0.05, W[1] - 1.5, 0.7, '#D8D4C0') + line(ellD(W[0] + A * 0.05, W[1] - 1.5, 0.7, 0.7), 0.3);
    // the hand (and its prop) at HAND_S
    let hs = '';
    const hh: Pt = [W[0] + 0.3 / HAND_S, W[1] + 3.8];
    const prop = (p: string) => `<g transform="translate(${f(hh[0])} ${f(hh[1])}) scale(${f(PROP_S / HAND_S)}) translate(${f(-hh[0])} ${f(-hh[1])})">${p}</g>`;
    if (item?.under) hs += prop(item.under(c, hh));
    if (spec.boxing) hs += boxingGlove(c, hh, spec.boxing);
    else if (item?.fist) hs += fist(c, hh, spec.glove);
    else hs += hand(c, [W[0], W[1]], spec.glove);
    if (item?.over) hs += prop(item.over(c, hh));
    s += `<g transform="translate(${f(W[0])} ${f(W[1])}) scale(${HAND_S}) translate(${f(-W[0])} ${f(-W[1])})">${hs}</g>`;
    sil.push(ellD(h[0], h[1] - 0.4, 3 * HAND_S, 4.4 * HAND_S));
    return s + dim(c, sil);
  };
  return { up, lo, items: { L: spec.itemL, R: spec.itemR } };
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

/** Shoe geometry per kind (authored units, before SHOE_S): collar height, toe x, toe-box height, sole thickness. */
const SHOE_G: Record<Exclude<Shoe, 'bare' | 'heel'>, { h: number; toe: number; toeH: number; sole: number }> = {
  sneaker: { h: 6.8, toe: 8.2, toeH: 4.2, sole: 2 },
  boot: { h: 9.4, toe: 8.4, toeH: 4.2, sole: 2.1 },
  dress: { h: 5.8, toe: 9, toeH: 3.5, sole: 1.3 },
  flat: { h: 5, toe: 7.8, toeH: 3.1, sole: 1.1 },
  clog: { h: 5.8, toe: 8.2, toeH: 4.2, sole: 2.4 },
  slipper: { h: 4.6, toe: 7.8, toeH: 3.2, sole: 1.3 },
};
/** Height of the shoe's collar above the sole (authored units), where the trouser hem meets it. */
function shoeTop(kind: Shoe): number {
  return kind === 'bare' ? 4.6 : kind === 'heel' ? 4.6 : SHOE_G[kind].h;
}

function soleCol(spec: LegSpec, kind: Shoe): string {
  const T = spec.shoeCol;
  return spec.sole ?? (kind === 'sneaker' ? '#C8C2AE' : kind === 'boot' ? '#2A221A' : kind === 'clog' ? dk(T.b, 0.86) : kind === 'slipper' ? '#8A7E68' : '#2E2620');
}

function shoeFront(c: Ctx, spec: LegSpec, x: number, y: number, kind: Shoe): string {
  const { d } = c;
  const T = spec.shoeCol;
  const P = (px: number, py: number) => `${f(x + px)},${f(y + py)}`;
  let s = '';
  switch (kind) {
    case 'bare': {
      const sk = c.sk;
      const foot = `M${P(-3.6, 0.3)}L${P(6.6, 0.3)}C${P(8.4, 0.3)} ${P(8.6, -2)} ${P(6.8, -2.8)}C${P(4.6, -3.6)} ${P(2.6, -4)} ${P(0.8, -4.8)}L${P(-2.8, -4.8)}C${P(-4.2, -3.6)} ${P(-4.4, -1.2)} ${P(-3.6, 0.3)}Z`;
      const inner = fill(`M${P(-5, -0.9)}H${f(x + 10)}V${f(y + 2)}H${f(x - 5)}Z`, sk.s, 'opacity="0.7"') + line(`M${P(-1.6, -3.6)}q1.6,0.6 3.2,0`, 0.4, sk.s) + circ(x - 2.6, y - 2, 0.9, sk.s, 0.6);
      s += shade(d, foot, sk, { lw: 1.05, off: [-0.6, -0.6], inner });
      s += line(`M${P(5.6, -2.6)}v2.4M${P(4, -3)}v2.8M${P(2.4, -3.4)}v2.6`, 0.45, sk.d);
      s += circ(x + 7.2, y - 1.3, 0.55, c.z ? '#3A3018' : sk.d, 0.8);
      return s;
    }
    case 'heel': {
      const sh = `M${P(-3.2, -0.4)}L${P(-2.8, -4.6)}C${P(0, -5.2)} ${P(3.2, -3.8)} ${P(7, -1)}C${P(7.9, 0.3)} ${P(6.6, 0.7)} ${P(4.4, 0.5)}L${P(-0.4, -0.6)}L${P(-1.4, 1.2)}L${P(-2.9, 1.2)}Z`;
      const inner = line(`M${P(-0.4, -0.9)}L${P(4.6, 0.1)}`, 0.5, T.d) + fill(`M${P(-3.5, -1)}L${P(-0.5, -1)}L${P(-1.3, 1.4)}L${P(-3.5, 1.4)}Z`, T.d, 'opacity="0.7"');
      s += shade(d, sh, T, { lw: 1, off: [-0.5, -0.5], inner }) + fill(ellD(x + 3.4, y - 2.4, 1.4, 0.4), lt(T.b, 0.5), 'opacity="0.6" transform="rotate(25 ' + f(x + 3.4) + ' ' + f(y - 2.4) + ')"');
      s += line(`M${P(-2.8, -4.6)}C${P(-0.4, -3.6)} ${P(1.6, -3)} ${P(3.4, -3.1)}`, 0.5, T.d);
      return s;
    }
    default:
      break;
  }
  const G = SHOE_G[kind];
  const { h, toe, toeH } = G;
  const so = G.sole;
  const sc = soleCol(spec, kind);
  const ST: Tone = { b: sc, s: dk(sc, 0.78), d: dk(sc, 0.6) };
  // the sole: a chunky slab with a little toe spring; dress shoes get a separate heel block and an arch
  const heelB = kind === 'dress' || kind === 'boot' ? 1 : 0;
  const soleP = heelB
    ? `M${P(-4.5, -so)}L${P(toe + 0.4, -so)}C${P(toe + 1.9, -so)} ${P(toe + 2.1, -0.8)} ${P(toe + 1.2, -0.1)}C${P(toe - 1, 0.3)} ${P(3, 0.3)} ${P(2.4, 0.3)}L${P(0.6, -0.5)}L${P(-1, -0.5)}L${P(-1.2, 0.3)}L${P(-4.2, 0.3)}C${P(-4.7, 0.3)} ${P(-4.8, -so * 0.5)} ${P(-4.5, -so)}Z`
    : `M${P(-4.5, -so)}L${P(toe + 0.4, -so)}C${P(toe + 2, -so)} ${P(toe + 2.2, -0.6)} ${P(toe + 1, 0.1)}C${P(toe - 0.4, 0.4)} ${P(toe - 2, 0.3)} ${P(toe - 3, 0.3)}L${P(-3.9, 0.3)}C${P(-4.7, 0.3)} ${P(-4.8, -so * 0.5)} ${P(-4.5, -so)}Z`;
  let si = '';
  if (kind === 'sneaker' || kind === 'boot' || kind === 'clog') {
    // tread notches and a foxing stripe
    let tr = '';
    for (let tx = -3.6; tx < toe - 1; tx += 1.5) tr += `M${P(tx, 0.4)}v-0.7`;
    si += line(tr, 0.4, ST.d) + line(`M${P(-4.4, -so * 0.5)}H${f(x + toe + 1)}`, 0.35, ST.d, 'opacity="0.7"');
  }
  si += fill(`M${P(-5, -so - 1)}H${f(x + toe + 3)}V${f(y - so + 0.5)}H${f(x - 5)}Z`, lt(sc, 0.25), 'opacity="0.6"');
  // the upper: heel counter, collar, instep slope down to a round toe box
  const up =
    `M${P(-4.3, -so + 0.3)}C${P(-4.8, -so - 2)} ${P(-4.4, -h + 1.2)} ${P(-3.4, -h)}L${P(kind === 'boot' ? 3.2 : 1.6, -h + 0.3)}` +
    `C${P(kind === 'boot' ? 3.8 : 2.8, -h + 0.6)} ${P(3.4, -toeH - 0.9)} ${P(5, -toeH)}` +
    `C${P(toe - 0.4, -toeH - 0.3)} ${P(toe + 1.6, -toeH + 1.4)} ${P(toe + 1.3, -so + 0.3)}Z`;
  let ui = '';
  // under-side shadow along the sole and a soft highlight on the toe box
  ui += fill(`M${P(-5, -so - 1.1)}H${f(x + toe + 3)}V${f(y)}H${f(x - 5)}Z`, T.s, 'opacity="0.75"');
  ui += fill(ellD(x + toe - 1.6, y - toeH + 1, 1.8, 0.7), lt(T.b, 0.45), `opacity="${kind === 'dress' ? 0.75 : 0.45}" transform="rotate(14 ${f(x + toe - 1.6)} ${f(y - toeH + 1)})"`);
  // toe cap seam and the flex creases over the ball of the foot
  const cap = `M${P(toe - 2.6, -so - 0.1)}C${P(toe - 3.2, -toeH * 0.55)} ${P(toe - 2.6, -toeH + 0.1)} ${P(toe - 1.2, -toeH + 0.2)}`;
  if (kind !== 'slipper') ui += line(cap, 0.5, T.d);
  ui += line(`M${P(3.6, -toeH + 0.3)}q0.6,1 0.4,2M${P(4.8, -toeH + 0.1)}q0.4,0.8 0.2,1.6`, 0.4, T.d, 'opacity="0.75"');
  // heel counter seam
  ui += line(`M${P(-2.6, -so - 0.1)}C${P(-2.2, -h * 0.5)} ${P(-2.6, -h + 1.2)} ${P(-2.2, -h + 0.4)}`, 0.4, T.d, 'opacity="0.7"');
  if (kind === 'sneaker') {
    // side panel stripe, laces on the instep, tongue
    ui += line(`M${P(-1.4, -so - 0.4)}C${P(0.6, -so - 2.2)} ${P(2.6, -so - 2.6)} ${P(4.6, -so - 1.2)}`, 0.9, lt(T.b, 0.3), 'opacity="0.8"') + line(`M${P(-1.4, -so - 0.4)}C${P(0.6, -so - 2.2)} ${P(2.6, -so - 2.6)} ${P(4.6, -so - 1.2)}`, 0.35, T.d, 'opacity="0.7"');
    ui += line(`M${P(1.4, -h + 0.6)}l1.6,0.9M${P(2.2, -h + 1.8)}l1.6,0.9M${P(3.1, -toeH - 0.4)}l1.5,0.8`, 0.6, lt(T.b, 0.5)) + line(`M${P(1.4, -h + 0.6)}l1.6,0.9M${P(2.2, -h + 1.8)}l1.6,0.9M${P(3.1, -toeH - 0.4)}l1.5,0.8`, 0.25, T.d);
    ui += grime([x - 4, y - h, x + toe, y], 3, '#5A4A2A', c.seed + 61, 1.6, 0.3);
  } else if (kind === 'boot') {
    // shaft top band, speed hooks + laces, a pull tab and scuffs
    ui += line(`M${P(-4.6, -h + 1.6)}H${f(x + 3.6)}`, 0.6, T.d) + fill(`M${P(-5, -h - 1)}H${f(x + 4)}V${f(y - h + 1.6)}H${f(x - 5)}Z`, lt(T.b, 0.12), 'opacity="0.6"');
    ui += line(`M${P(2.6, -h + 2.6)}l1.6,0.5M${P(3, -h + 4)}l1.6,0.6M${P(3.6, -h + 5.4)}l1.5,0.6`, 0.55, '#C8B890') + line(`M${P(2.6, -h + 2.6)}l1.6,0.5M${P(3, -h + 4)}l1.6,0.6M${P(3.6, -h + 5.4)}l1.5,0.6`, 0.2, INK);
    ui += circ(x + 2.5, y - h + 2.6, 0.35, '#B8A878') + circ(x + 2.9, y - h + 4, 0.35, '#B8A878') + circ(x + 3.5, y - h + 5.4, 0.35, '#B8A878');
    ui += line(`M${P(-1.6, -h * 0.55)}q1.2,0.6 2.4,0.2M${P(-0.6, -h * 0.4)}q0.8,0.4 1.6,0.1`, 0.4, T.d, 'opacity="0.7"');
    ui += grime([x - 4, y - h, x + toe, y], 3, '#3A3020', c.seed + 63, 1.4, 0.28);
  } else if (kind === 'dress') {
    // welt stitching above the sole, a short lace panel, broguing dots on the cap
    ui += line(`M${P(-4.2, -so - 0.5)}H${f(x + toe + 0.4)}`, 0.3, lt(T.b, 0.35), 'stroke-dasharray="0.5 0.5" opacity="0.8"');
    ui += line(`M${P(1.2, -h + 0.6)}l2,1M${P(1.8, -h + 1.6)}l1.8,0.9`, 0.45, T.d);
    let dots = '';
    for (let k = 0; k < 4; k++) dots += circ(x + toe - 2.5 + k * 0.35, y - so - 0.9 - k * 0.6, 0.18, T.d);
    ui += dots;
  } else if (kind === 'clog') {
    // vent holes and a heel strap
    for (let k = 0; k < 3; k++) ui += circ(x + 3.4 + k * 1.5, y - toeH + 0.9 + k * 0.3, 0.38, T.d) + circ(x + 4.1 + k * 1.5, y - toeH + 2.1 + k * 0.2, 0.38, T.d);
    ui += line(`M${P(-3.8, -h + 2.4)}C${P(-2, -h + 1.4)} ${P(0, -h + 1.8)} ${P(1.4, -toeH - 0.4)}`, 1, T.d, 'opacity="0.6"') + circ(x + 1.3, y - toeH - 0.4, 0.5, T.d);
  } else if (kind === 'slipper') {
    // fuzzy collar
    ui += fill(`M${P(1, -h)}C${P(4, -h - 1)} ${P(toe, -3.6)} ${P(toe, -1.4)}L${P(1, -1.4)}Z`, lt(T.b, 0.15), 'opacity="0.6"');
    ui += hatch([x - 4, y - h - 0.6, x + 3, y - h + 1], 10, lt(T.b, 0.35), c.seed + 65, 0.8, -1.4, 0.4, 0.8);
  } else if (kind === 'flat') {
    ui += line(`M${P(-3.2, -h + 0.9)}C${P(0, -h + 1.4)} ${P(3, -toeH - 0.2)} ${P(5.2, -toeH + 0.5)}`, 0.35, lt(T.b, 0.3), 'stroke-dasharray="0.5 0.5"');
  }
  s += shade(d, soleP, ST, { lw: 1.05, off: [-0.4, -0.6], k: 0, inner: si });
  s += shade(d, up, T, { lw: 1.05, off: [-0.8, -0.7], inner: ui });
  return s;
}

function shoeBack(c: Ctx, spec: LegSpec, x: number, y: number, kind: Shoe): string {
  const { d } = c;
  const T = spec.shoeCol;
  const P = (px: number, py: number) => `${f(x + px)},${f(y + py)}`;
  if (kind === 'bare') {
    const heel = `M${P(-3.4, 0.3)}L${P(4.4, 0.3)}C${P(5.4, -1)} ${P(4.8, -3.8)} ${P(3.4, -4.6)}L${P(-2.6, -4.8)}C${P(-3.8, -3.6)} ${P(-4.2, -1.4)} ${P(-3.4, 0.3)}Z`;
    return shade(d, heel, c.sk, { lw: 1, off: [-0.5, -0.5], inner: fill(ellD(x + 0.4, y - 0.4, 3.2, 1.2), c.sk.s, 'opacity="0.7"') + line(`M${P(-0.6, -4.6)}q0.4,2 0,3`, 0.4, c.sk.s) });
  }
  if (kind === 'heel') {
    return shade(d, `M${P(-3, -0.6)}L${P(-3, -4.2)}C${P(-1, -5)} ${P(2, -4.6)} ${P(3.6, -3.4)}L${P(3.2, -0.6)}L${P(0.8, -0.6)}L${P(0.6, 1.2)}L${P(-1, 1.2)}L${P(-1.2, -0.6)}Z`, T, { lw: 1, off: [-0.5, -0.5], inner: fill(`M${P(-2, -0.9)}H${f(x + 2)}V${f(y + 2)}H${f(x - 2)}Z`, T.d, 'opacity="0.6"') });
  }
  const G = SHOE_G[kind];
  const h = G.h - 0.2;
  const so = G.sole;
  const sc = soleCol(spec, kind);
  const ST: Tone = { b: sc, s: dk(sc, 0.78), d: dk(sc, 0.6) };
  const soleP = `M${P(-4.6, -so)}L${P(4.8, -so)}C${P(5.5, -so)} ${P(5.6, 0.3)} ${P(4.6, 0.3)}L${P(-4.2, 0.3)}C${P(-5, 0.3)} ${P(-5.1, -so)} ${P(-4.6, -so)}Z`;
  const up = `M${P(-4.2, -so + 0.3)}C${P(-4.8, -so - 2)} ${P(-4.3, -h + 1)} ${P(-3, -h)}L${P(3.2, -h)}C${P(4.4, -h + 1)} ${P(5, -so - 2)} ${P(4.4, -so + 0.3)}Z`;
  let ui = fill(`M${P(-6, -so - 1)}H${f(x + 6)}V${f(y)}H${f(x - 6)}Z`, T.s, 'opacity="0.7"');
  // heel counter seam and pull tab
  ui += line(`M${P(0.2, -h + 0.4)}V${f(y - so - 0.2)}`, 0.45, T.d) + line(`M${P(-2.8, -so - 0.2)}Q${P(0.2, -h * 0.55)} ${P(3.2, -so - 0.2)}`, 0.45, T.d, 'opacity="0.7"');
  if (kind === 'boot') ui += line(`M${P(-4.4, -h + 1.6)}H${f(x + 4.6)}`, 0.6, T.d) + fill(`M${P(-0.8, -h - 0.6)}h2v2.4h-2Z`, T.d, 'opacity="0.8"');
  if (kind === 'sneaker') ui += fill(`M${P(-0.8, -h - 0.2)}h2v2.6h-2Z`, lt(T.b, 0.3), 'opacity="0.8"') + grime([x - 4, y - h, x + 4, y], 2, '#5A4A2A', c.seed + 62, 1.4, 0.3);
  let s = shade(d, soleP, ST, { lw: 1.05, off: [-0.4, -0.6], k: 0, inner: line(`M${P(-4.4, -so * 0.5)}H${f(x + 5)}`, 0.35, ST.d, 'opacity="0.7"') });
  s += shade(d, up, T, { lw: 1.05, off: [-0.7, -0.6], inner: ui });
  return s;
}

export interface LegSet {
  up: Paint;
  lo: Paint;
}

/** Shoes are drawn this much bigger than authored. */
const SHOE_S = 1.32;

export function legPaint(spec: LegSpec): LegSet {
  const up: Paint = (c) => {
    const { d, z, side, seed, b, back } = c;
    const K = kneeAt(b, side);
    const W = b.legW;
    const T = spec.col;
    const sil: string[] = [];
    let s = '';
    const across = (w: number): [number, number] => [K[0] - w / 2, K[0] + w / 2];
    const skin = (w1: number, w2: number) => {
      const p = limb([0, 0], K, w1, w2);
      sil.push(p);
      let inner = line(`M${f(K[0] + w2 * 0.15)},${f(K[1] - 3)}q${f(w2 * 0.2)},1.2 ${f(w2 * 0.05)},2.4`, 0.5, c.sk.s, 'opacity="0.8"');
      if (z) inner += fill(ellD(1, K[1] * 0.6, w1 * 0.2, K[1] * 0.25), c.sk.d, 'opacity="0.35"');
      return shade(d, p, c.sk, { off: [-1, -1], across: across(w2), inner });
    };
    switch (spec.kind) {
      case 'pants': {
        const p = limb([0, 0], K, W, W * 0.94);
        let inner = speck([-W, -W, W, K[1] + W], 14, [T.d, lt(T.b, 0.2)], seed + 3 + side, 0.25, 0.5, 0.4);
        // outseam, a drape fold down the thigh and the cloth bunching over the knee
        inner += line(`M${f(-W * 0.3)},${f(-W * 0.3)}L${f(K[0] - W * 0.3)},${f(K[1])}`, 0.4, T.d, 'opacity="0.55"');
        inner += fold(`M${f(side * 1)},1V${f(K[1] * 0.45)}`, T.s, 0.7);
        inner += fold(`M${f(K[0] - W * 0.36)},${f(K[1] - 3.2)}q${f(W * 0.35)},1.3 ${f(W * 0.72)},-0.3M${f(K[0] - W * 0.05)},${f(K[1] - 1.4)}q${f(W * 0.25)},0.7 ${f(W * 0.46)},-0.2`, T.s, 0.65);
        if (!back) inner += fold(`M${f(W * 0.12)},${f(1.2)}q${f(W * 0.2)},1.8 ${f(W * 0.36)},2.4`, T.d, 0.45, 0.6);
        if (spec.stripe) inner += line(`M${f(side * W * 0.32)},${f(-W)}V${f(K[1] + W)}`, 1.3, spec.stripe, 'opacity="0.9"');
        if (z) inner += rip(-side * 1, K[1] * 0.5, 2, 2, c.sk, seed + side * 3);
        s += shade(d, p, T, { off: [-1, -1], across: across(W * 0.94), inner });
        sil.push(p);
        break;
      }
      case 'shorts': {
        s += skin(W * 0.82, W * 0.74);
        const p = tube([0, 0], [K[0] * 0.8, K[1] * 0.8], W + 1.2, W + 1.8, z ? 1.6 : 0, seed + side);
        let inner = speck([-W, -W, W, K[1]], 8, [T.d, lt(T.b, 0.2)], seed + 6, 0.25, 0.5, 0.4) + fold(`M${f(-W * 0.4)},${f(K[1] * 0.45)}q${f(W * 0.4)},1 ${f(W * 0.8)},0`, T.s, 0.7);
        inner += line(`M${f(-W * 0.3)},${f(-W * 0.3)}L${f(-W * 0.32)},${f(K[1] * 0.8)}`, 0.4, T.d, 'opacity="0.55"');
        if (!z) inner += line(`M${f(-W * 0.7)},${f(K[1] * 0.8 - 1.1)}l${f(W * 1.5)},0.5`, 0.35, T.d, 'stroke-dasharray="0.8 0.6" opacity="0.8"');
        if (spec.stripe) inner += line(`M${f(side * W * 0.45)},${f(-W)}V${f(K[1] + 2)}`, 1.4, spec.stripe);
        s += shade(d, p, T, { inner });
        sil.push(p);
        break;
      }
      case 'tights': {
        const p = limb([0, 0], K, W * 0.86, W * 0.78);
        let inner = fold(`M${f(-W * 0.3)},${f(K[1] * 0.5)}q${f(W * 0.3)},0.8 ${f(W * 0.6)},0`, T.s, 0.6);
        inner += fold(`M${f(K[0] - W * 0.2)},${f(K[1] - 2)}q${f(W * 0.2)},0.8 ${f(W * 0.42)},0`, T.s, 0.5);
        if (spec.stripe) inner += line(`M${f(side * W * 0.3)},${f(-W)}V${f(K[1] + W)}`, 1.1, spec.stripe);
        if (z) inner += rip(0, K[1] * 0.5, 1.8, 2, c.sk, seed + side * 7);
        s += shade(d, p, T, { off: [-1, -1], across: across(W * 0.78), inner });
        sil.push(p);
        break;
      }
      default:
        s += skin(W * 0.82, W * 0.74);
    }
    if (spec.kneepad) s += shade(d, limb([-W * 0.36, K[1] - 0.6], [W * 0.36, K[1] - 0.6], 4.6, 4.6), { b: spec.kneepad, s: dk(spec.kneepad), d: dk(spec.kneepad, 0.6) }, { lw: 1, k: 0 });
    return s + dim(c, sil);
  };
  const lo: Paint = (c) => {
    const { d, z, side, seed, back, b } = c;
    const L = -b.hipY - b.thighL;
    const W = b.legW;
    const bareFoot = z && spec.zBareSide === side;
    const shoe: Shoe = bareFoot ? 'bare' : spec.shoe;
    const shoeH = shoeTop(shoe) * SHOE_S;
    const T = spec.col;
    const sil: string[] = [];
    let s = '';
    const skin = (w1: number, w2: number) => {
      const sg = seg([0, 0], [0, L - 2], w1, w2, 'round');
      sil.push(sg.fill);
      // kneecap and calf
      let inner = line(`M${f(w1 * 0.05)},${f(1.2)}q${f(w1 * 0.3)},1.4 ${f(w1 * 0.05)},3`, 0.5, c.sk.s, 'opacity="0.9"');
      inner += line(`M${f(-w1 * 0.36)},${f(L * 0.22)}q${f(-w1 * 0.1)},${f(L * 0.2)} ${f(w1 * 0.06)},${f(L * 0.42)}`, 0.5, c.sk.s, 'opacity="0.8"');
      if (z) inner += fill(ellD(0.8, L * 0.5, w1 * 0.2, L * 0.2), c.sk.d, 'opacity="0.35"') + circ(-1, L * 0.35, 0.6, '#5A4A22');
      return shade(d, sg.fill, c.sk, { off: [-1, -1], across: [-w1 / 2, w1 / 2], inner, stroke: sg.edge });
    };
    switch (spec.kind) {
      case 'pants': {
        const hemY = L - shoeH + 1.3 * SHOE_S;
        if (z) {
          const p = limb([0, hemY * 0.5], [0, L - 2], W * 0.6, W * 0.56);
          sil.push(p);
          s += shade(d, p, c.sk, { off: [-1, -1], across: [-W * 0.3, W * 0.3] });
        }
        const sg = seg([0, 0], [0, hemY - (z ? 1.6 : 0)], W * 0.94, W * 0.9, 'flat', z ? 1.8 : 0, seed + side * 5);
        const p = sg.fill;
        let inner = speck([-W, -W, W, L], 10, [T.d, lt(T.b, 0.2)], seed + 13 + side, 0.25, 0.5, 0.4);
        // outseam, folds bunching under the knee, and the break where the hem rests on the shoe
        inner += line(`M${f(-W * 0.3)},0V${f(hemY)}`, 0.4, T.d, 'opacity="0.55"');
        inner += fold(`M${f(-W * 0.32)},${f(2)}q${f(W * 0.32)},1.3 ${f(W * 0.66)},0.1M${f(-W * 0.05)},${f(3.9)}q${f(W * 0.2)},0.7 ${f(W * 0.42)},0`, T.s, 0.65);
        inner += fold(`M${f(W * 0.2)},${f(hemY * 0.3)}q${f(-W * 0.12)},${f(hemY * 0.2)} ${f(W * 0.04)},${f(hemY * 0.38)}`, T.s, 0.5, 0.6);
        inner += fold(`M${f(-W * 0.3)},${f(hemY - 2.8)}q${f(W * 0.3)},1 ${f(W * 0.6)},0M${f(W * 0.05)},${f(hemY - 4.6)}l${f(W * 0.3)},1.6`, T.s, 0.65);
        if (spec.stripe) inner += line(`M${f(side * W * 0.32)},${f(-W)}V${f(L)}`, 1.3, spec.stripe, 'opacity="0.9"');
        if (z) inner += grime([-W, hemY - 6, W, hemY], 3, '#4A4028', seed + 4, 1.8, 0.35);
        else inner += grime([-W, hemY - 3, W, hemY], 2, '#4A4028', seed + 4, 1.4, 0.18);
        s += shade(d, p, T, { off: [-1, -1], across: [-W * 0.47, W * 0.47], inner, stroke: sg.edge });
        if (spec.cuffs && !z) s += shade(d, band(0, hemY - 2.4, hemY + 0.2, W * 0.98, W * 0.98), T, { lw: 1, k: 0, inner: line(`M${f(-W * 0.5)},${f(hemY - 1.1)}H${f(W * 0.5)}`, 0.35, T.d, 'opacity="0.7"') });
        sil.push(p);
        break;
      }
      case 'shorts': {
        s += skin(W * 0.74, W * 0.6);
        if (spec.sock) s += shade(d, band(0, L - shoeH - 3.6, L - shoeH + 3, W * 0.78, W * 0.7), spec.sock, { lw: 1, k: 0, inner: line(`M-9,${f(L - shoeH - 2.4)}H9M-9,${f(L - shoeH - 1.2)}H9`, 0.6, spec.stripe ?? spec.sock.d) });
        break;
      }
      case 'tights': {
        const sg = seg([0, 0], [0, L - 2], W * 0.78, W * 0.64, 'round');
        let inner = spec.stripe ? line(`M${f(side * W * 0.3)},${f(-W)}V${f(L)}`, 1.1, spec.stripe) : '';
        inner += fold(`M${f(-W * 0.2)},${f(1.8)}q${f(W * 0.2)},0.8 ${f(W * 0.42)},0`, T.s, 0.5) + fill(ellD(-W * 0.12, L * 0.35, W * 0.1, L * 0.18), lt(T.b, 0.2), 'opacity="0.35"');
        if (z) inner += rip(0, L * 0.4, 1.6, 1.8, c.sk, seed + side * 9);
        s += shade(d, sg.fill, T, { off: [-1, -1], across: [-W * 0.39, W * 0.39], inner, stroke: sg.edge });
        sil.push(sg.fill);
        break;
      }
      default:
        s += skin(W * 0.74, W * 0.6);
        if (spec.sock) s += shade(d, band(0, L - shoeH - 2.6, L - shoeH + 3, W * 0.78, W * 0.7), spec.sock, { lw: 1, k: 0, inner: line(`M-9,${f(L - shoeH - 1.4)}H9`, 0.5, spec.sock.d, 'opacity="0.7"') });
    }
    const x = back ? -side * 0.2 : 0.6;
    const sh = back ? shoeBack(c, spec, 0, 0, shoe) : shoeFront(c, spec, 0, 0, shoe);
    s += `<g transform="translate(${f(x)} ${f(L)}) scale(${SHOE_S})">${sh}</g>`;
    return s + dim(c, sil);
  };
  return { up, lo };
}

export { stitch, smooth, jag, mix, lt, dk, fadeV, LW, LI, LF, BLOOD, SLIME, SLIME_L, GREASE };
