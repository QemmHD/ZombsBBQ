/**
 * Shared wearables and face extras: glasses, facial hair, aprons, chef whites, vests, belts, makeup.
 * Front views are 3/4 facing screen-right (the chest's centre line sits at x ≈ +3); back views have
 * the spine at x ≈ -1.6.
 */
import type { Ctx, Expr, Paint } from './rig';
import { torsoD, zDamage, edgeX } from './body';
import { EYE_N, EYE_F, EAR_B } from './head';
import {
  INK, f, ellD, fill, line, outl, circ, inside, shade, speck, hatch, grime, fold, stain, drip, rnd, mix, dk, lt, jag, tone, smooth,
  BLOOD, BLOOD_D, SLIME, SLIME_L, GREASE, C,
} from './paint';
import type { Tone, Pt } from './paint';

// ---------------------------------------------------------------- glasses
export function glasses(kind: 'square' | 'round' | 'shades' | 'cat', frame: string, lens = '#C8D4CC'): (c: Ctx, e: Expr) => string {
  return (c, e) => {
    const lift = e === 'scream' || e === 'shock' ? -1.6 : e === 'happy' ? -0.6 : 0;
    const [nx, ny] = EYE_N;
    const [fx, fy] = EYE_F;
    const shade_ = kind === 'shades';
    const lo = shade_ ? 'opacity="0.92"' : 'opacity="0.22"';
    const lc = shade_ ? '#2A2A26' : lens;
    let nL: string;
    let fL: string;
    if (kind === 'round') {
      nL = ellD(nx, ny + lift, 5.4, 5.4);
      fL = ellD(fx + 0.2, fy + lift, 4, 5.2);
    } else if (kind === 'cat') {
      nL = `M${f(nx - 5.6)},${f(ny - 4 + lift)}L${f(nx + 5.4)},${f(ny - 3.6 + lift)}L${f(nx + 4.6)},${f(ny + 3.6 + lift)}Q${f(nx)},${f(ny + 5.4 + lift)} ${f(nx - 4.4)},${f(ny + 3 + lift)}Z`;
      fL = `M${f(fx - 3.4)},${f(fy - 3.6 + lift)}L${f(fx + 5.4)},${f(fy - 4.4 + lift)}L${f(fx + 3.4)},${f(fy + 3.4 + lift)}Q${f(fx)},${f(fy + 4.8 + lift)} ${f(fx - 3)},${f(fy + 3 + lift)}Z`;
    } else {
      const h = shade_ ? 7.4 : 8.6;
      nL = `M${f(nx - 5.4)},${f(ny - h / 2 + lift)}H${f(nx + 5)}Q${f(nx + 5.4)},${f(ny + h / 2 + lift)} ${f(nx + 4)},${f(ny + h / 2 + lift)}H${f(nx - 4.2)}Q${f(nx - 5.6)},${f(ny + h / 2 + lift)} ${f(nx - 5.4)},${f(ny - h / 2 + lift)}Z`;
      fL = `M${f(fx - 3.4)},${f(fy - h / 2 + lift)}H${f(fx + 4.4)}Q${f(fx + 4.6)},${f(fy + h / 2 + lift)} ${f(fx + 3.4)},${f(fy + h / 2 + lift)}H${f(fx - 2.6)}Q${f(fx - 3.6)},${f(fy + h / 2 + lift)} ${f(fx - 3.4)},${f(fy - h / 2 + lift)}Z`;
    }
    const w = kind === 'square' || kind === 'cat' ? 1.5 : 1.1;
    let s = line(`M${f(nx - 5.4)},${f(ny - 1.6 + lift)}L-15.4,${f(-73 + lift * 0.5)}`, w, INK) + line(`M${f(nx - 5.4)},${f(ny - 1.6 + lift)}L-15.4,${f(-73 + lift * 0.5)}`, w * 0.5, frame);
    s += fill(nL, lc, lo) + fill(fL, lc, lo);
    if (!shade_) s += line(`M${f(nx - 3)},${f(ny - 2.6 + lift)}l2.4,-1.2M${f(fx - 1.4)},${f(fy - 2.6 + lift)}l1.8,-1`, 0.6, '#F0F0E6', 'opacity="0.7"');
    else s += line(`M${f(nx - 3.6)},${f(ny - 1.6 + lift)}l3.6,-1.6M${f(fx - 1.6)},${f(fy - 1.6 + lift)}l2.6,-1.2`, 0.7, '#8A8A84', 'opacity="0.8"');
    s += line(nL, w + 0.6) + line(nL, w * 0.6, frame) + line(fL, w + 0.6) + line(fL, w * 0.6, frame);
    s += line(`M${f(nx + 5)},${f(ny - 1.2 + lift)}Q${f(9)},${f(ny - 2.8 + lift)} ${f(fx - 3.4)},${f(fy - 1.2 + lift)}`, w + 0.4) + line(`M${f(nx + 5)},${f(ny - 1.2 + lift)}Q${f(9)},${f(ny - 2.8 + lift)} ${f(fx - 3.4)},${f(fy - 1.2 + lift)}`, w * 0.5, frame);
    if (c.z) s += line(`M${f(nx - 3)},${f(ny - 3 + lift)}l2.4,2.6l-1.4,1.4l2.6,2M${f(nx - 0.6)},${f(ny - 0.4 + lift)}l2.6,-1.4`, 0.45, '#E8E8DC');
    return s;
  };
}

export function glassesBack(frame: string): Paint {
  return () => {
    const [x, y] = EAR_B;
    return line(`M${f(x - 1.4)},${f(y - 2.6)}L${f(x + 9)},${f(y - 4.4)}`, 1.4) + line(`M${f(x - 1.4)},${f(y - 2.6)}L${f(x + 9)},${f(y - 4.4)}`, 0.7, frame);
  };
}

// ---------------------------------------------------------------- facial hair
function mouthLift(e: Expr): number {
  return e === 'scream' || e === 'chomp' ? -2 : e === 'happy' || e === 'shock' ? -1 : 0;
}

export function walrus(t: Tone): (c: Ctx, e: Expr) => string {
  return (c, e) => {
    const y = mouthLift(e);
    const p = `M10.6,${f(-66.6 + y)}C13.4,${f(-67.6 + y)} 17.6,${f(-67 + y)} 19.6,${f(-64.4 + y)}C21,${f(-62.2 + y)} 20.6,${f(-59.4 + y)} 19.6,${f(-58.6 + y)}C18,${f(-60.6 + y)} 15,${f(-61.4 + y)} 12,${f(-61.4 + y)}C9,${f(-61.4 + y)} 5.6,${f(-60.6 + y)} 3,${f(-59.2 + y)}C2.6,${f(-61.4 + y)} 3.8,${f(-64.6 + y)} 6.4,${f(-65.8 + y)}C8,${f(-66.6 + y)} 9.6,${f(-66.6 + y)} 10.6,${f(-66.6 + y)}Z`;
    return shade(c.d, p, t, { lw: 1, inner: line(`M6,${f(-64 + y)}l-1.4,3.6M9,${f(-64.6 + y)}l-1,3.6M12,${f(-64.8 + y)}l0,3.4M15,${f(-64.6 + y)}l1,3.4M18,${f(-63.4 + y)}l1,3`, 0.45, t.d) });
  };
}

export function pencilStache(t: Tone): (c: Ctx, e: Expr) => string {
  return (_c, e) => {
    const y = mouthLift(e);
    return line(`M5.6,${f(-63.6 + y)}Q11,${f(-65.6 + y)} 16.8,${f(-64.2 + y)}`, 1.4, INK) + line(`M5.6,${f(-63.6 + y)}Q11,${f(-65.6 + y)} 16.8,${f(-64.2 + y)}`, 0.8, t.b);
  };
}

export function horseshoe(t: Tone): (c: Ctx, e: Expr) => string {
  return (c, e) => {
    const y = mouthLift(e);
    const p = `M4,${f(-63 + y)}C7,${f(-66.6 + y)} 14,${f(-67 + y)} 18.4,${f(-64 + y)}C19.6,${f(-60 + y)} 19.6,-56 19,-52.6L17.2,-52.6C17,-56 16.6,-59.6 15.4,${f(-62.4 + y)}C12,${f(-63.4 + y)} 8,${f(-62.6 + y)} 6.2,${f(-61.4 + y)}C5.6,-58 5.6,-55 5.8,-52.4L4,-52.4C3.2,-56 3,-60 4,${f(-63 + y)}Z`;
    return shade(c.d, p, t, { lw: 1, inner: line(`M5,${f(-60 + y)}V-54M18,${f(-60 + y)}V-54M9,${f(-64.6 + y)}l-0.6,1.6M13,${f(-65 + y)}v1.6`, 0.45, t.d) });
  };
}

/** Full bushy beard (drawn under the mouth). */
export function fullBeard(t: Tone, big = 1): (c: Ctx, e: Expr) => string {
  return (c) => {
    const b = big;
    const p = `M-6.6,-71C-6.4,-63 -3,${f(-55 + b * 2)} 2,${f(-50 + b * 3)}C6,${f(-45 + b * 4)} 14,${f(-45 + b * 4)} 18,${f(-50 + b * 3)}C21.4,${f(-54 + b * 2)} 22.8,-60 22.4,-66C22.2,-69 21.8,-71 21.6,-72.6C20,-69 18.4,-66.4 16,-66C13,-65.4 9.4,-66 6,-66.4C2.6,-66.8 -1,-67.6 -3,-69.6C-4.4,-70.4 -5.6,-71 -6.6,-71Z`;
    const edge = p;
    let inner = hatch([-8, -72, 24, -40], 160, t.d, c.seed + 3, 1.6, 1.5, 0.4, 0.8) + hatch([-8, -72, 24, -40], 80, lt(t.b, 0.25), c.seed + 7, 1.4, 1.7, 0.35, 0.6);
    inner += fill(`M4,-48C8,-44 14,-44 18,-48L18,-40H4Z`, t.d, 'opacity="0.5"');
    let s = shade(c.d, edge, t, { lw: 1.15, inner, off: [-1.2, -1.2] });
    s += line(`M2,${f(-50 + b * 3)}l-1,2.6M7,${f(-46 + b * 4)}l-0.4,3M12,${f(-45.4 + b * 4)}l0.4,3M17,${f(-48 + b * 3)}l1,2.6`, 0.8, t.b) + line(`M2,${f(-50 + b * 3)}l-1,2.6M7,${f(-46 + b * 4)}l-0.4,3M12,${f(-45.4 + b * 4)}l0.4,3M17,${f(-48 + b * 3)}l1,2.6`, 0.35, INK);
    if (c.z) s += circ(9, -50, 1.2, SLIME_L, 0.85) + circ(14, -53, 0.8, '#7A6A3A', 0.8);
    return s;
  };
}

export function goatee(t: Tone): (c: Ctx, e: Expr) => string {
  return (c, e) => {
    const y = mouthLift(e);
    let s = shade(c.d, `M8,-58.4C9.4,-59 12.6,-59 14,-58.4C14.6,-55.6 13.4,-52 11,-51.2C8.6,-52 7.6,-55.6 8,-58.4Z`, t, { lw: 0.9, inner: hatch([7, -59, 15, -51], 20, t.d, c.seed, 1.2, 1.5, 0.35, 0.8) });
    s += shade(c.d, `M4.4,${f(-63.4 + y)}C7,${f(-66 + y)} 14,${f(-66.6 + y)} 18,${f(-64.4 + y)}C17,${f(-62.4 + y)} 13,${f(-63.2 + y)} 11,${f(-63 + y)}C8.6,${f(-63 + y)} 6,${f(-62.4 + y)} 4.4,${f(-63.4 + y)}Z`, t, { lw: 0.9 });
    return s;
  };
}

/** Sideburn strips in front of the ear. */
export function sideburns(t: Tone, len = 6): (c: Ctx) => string {
  return (c) => shade(c.d, `M-6.8,-74L-3.6,-74L-3.8,${f(-68 + len - 6)}L-6.4,${f(-67 + len - 6)}Z`, t, { lw: 0.8, k: 0 });
}

// ---------------------------------------------------------------- makeup / face paint
export function makeup(o: { blush?: string; mole?: Pt; freckles?: boolean; acne?: boolean }): (c: Ctx, e: Expr) => string {
  return (c) => {
    let s = '';
    if (o.blush && !c.z) s += fill(ellD(0, -66.6, 4, 2.4), o.blush, 'opacity="0.3"') + fill(ellD(19.6, -67, 1.8, 2), o.blush, 'opacity="0.25"');
    if (o.mole) s += circ(o.mole[0], o.mole[1], 0.75, '#3A2A1E') + line(`M${f(o.mole[0])},${f(o.mole[1])}l0.6,-1.4`, 0.3);
    if (o.freckles) s += speck([-4, -73, 20, -66], 14, ['#7A5A3A'], c.seed + 2, 0.25, 0.4, 0.6);
    if (o.acne) {
      const r = rnd(c.seed + 9);
      for (let k = 0; k < 7; k++) {
        const x = -3 + r() * 24;
        const y = -72 + r() * 14;
        s += circ(x, y, 0.55 + r() * 0.3, c.z ? '#9A8A30' : '#9A5A50', 0.85) + circ(x - 0.15, y - 0.15, 0.2, '#E0D0B0', 0.8);
      }
    }
    return s;
  };
}

// ---------------------------------------------------------------- aprons
/** Long bib apron over the torso (and hanging over the thighs). Front + back (straps and bow). */
export function apron(col: Tone, o: { len?: number; stains?: number; pocket?: boolean } = {}): Paint {
  return (c) => {
    const { d, b, back, z, seed } = c;
    const top = b.shY + 3.4;
    const bot = b.tBot + (o.len ?? 9);
    const x0 = b.hunch;
    if (back) {
      // neck strap + waist ties and a bow on the back
      const wy = b.tBot - 7;
      let s = line(`M${f(-4.6 + x0)},${f(b.tTop + 1.2)}Q${f(1 + x0)},${f(b.tTop - 1.6)} ${f(6.6 + x0)},${f(b.tTop + 1.2)}`, 2.2) + line(`M${f(-4.6 + x0)},${f(b.tTop + 1.2)}Q${f(1 + x0)},${f(b.tTop - 1.6)} ${f(6.6 + x0)},${f(b.tTop + 1.2)}`, 1.2, col.b);
      s += inside(d, torsoD(b), fill(`M-30,${f(wy - 1.3)}H30V${f(wy + 1.3)}H-30Z`, col.b) + line(`M-30,${f(wy - 1.3)}H30M-30,${f(wy + 1.3)}H30`, 0.6));
      // the apron's side edges peeking past the hips
      s += shade(d, `M${f(edgeX(b, bot - 6, 1) - 1)},${f(wy + 1)}L${f(b.wBot + 2)},${f(bot)}L${f(b.wBot - 1)},${f(bot)}Z`, col, { lw: 0.9 });
      const bx = -1.6 + x0;
      s += shade(d, `M${f(bx)},${f(wy)}C${f(bx - 2.6)},${f(wy - 3.4)} ${f(bx - 6)},${f(wy - 2.6)} ${f(bx - 5.4)},${f(wy + 0.2)}C${f(bx - 5)},${f(wy + 2.4)} ${f(bx - 2.4)},${f(wy + 1.6)} ${f(bx)},${f(wy)}Z`, col, { lw: 0.8 });
      s += shade(d, `M${f(bx)},${f(wy)}C${f(bx + 2.6)},${f(wy - 3.4)} ${f(bx + 6)},${f(wy - 2.6)} ${f(bx + 5.4)},${f(wy + 0.2)}C${f(bx + 5)},${f(wy + 2.4)} ${f(bx + 2.4)},${f(wy + 1.6)} ${f(bx)},${f(wy)}Z`, col, { lw: 0.8 });
      s += shade(d, `M${f(bx - 0.6)},${f(wy + 0.6)}L${f(bx - 3)},${f(wy + 8 + (z ? 1 : 0))}L${f(bx - 1.2)},${f(wy + 7.4)}L${f(bx + 0.6)},${f(wy + 0.6)}ZM${f(bx + 0.4)},${f(wy + 0.6)}L${f(bx + 2.6)},${f(wy + 7.8)}L${f(bx + 1)},${f(wy + 7)}Z`, col, { lw: 0.7, k: 0 });
      s += outl(ellD(bx, wy, 1.2, 1.1), col.s, 0.7);
      return s;
    }
    const wL = edgeX(b, bot - 6, -1) - 1.6;
    const wR = edgeX(b, bot - 6, 1) + 1;
    let p =
      `M${f(-3.6 + x0)},${f(top)}L${f(6.8 + x0)},${f(top)}L${f(7.4 + x0)},${f(top + 7)}` +
      `C${f(wR - 1)},${f(top + 8)} ${f(wR)},${f(top + 10)} ${f(wR + 0.6)},${f(top + 13)}L${f(wR + 1.6)},${f(bot)}`;
    if (z) {
      const r = rnd(seed + 5);
      for (let k = 1; k < 8; k++) p += `L${f(wR + 1.6 - ((wR - wL + 3) * k) / 8)},${f(bot + (k % 2 ? 1.6 + r() * 1.8 : -0.6))}`;
      p += `L${f(wL - 1)},${f(bot)}`;
    } else p += `Q${f((wL + wR) / 2)},${f(bot + 1.6)} ${f(wL - 1)},${f(bot)}`;
    p += `L${f(wL)},${f(top + 13)}C${f(wL + 0.6)},${f(top + 10)} ${f(wL + 1.6)},${f(top + 8)} ${f(-4.4 + x0)},${f(top + 7)}Z`;
    let inner = speck([wL - 2, top, wR + 2, bot + 2], 30, [col.d, lt(col.b, 0.2)], seed + 3, 0.2, 0.5, 0.4);
    inner += fold(`M${f(wL + 4)},${f(top + 16)}q0.6,${f(bot - top - 18)} -0.6,${f(bot - top - 14)}M${f(wR - 3)},${f(top + 15)}q-0.4,${f(bot - top - 18)} 0.6,${f(bot - top - 14)}M${f(2 + x0)},${f(top + 18)}q0.4,6 -0.4,${f(bot - top - 18)}`, col.s, 0.7);
    inner += fill(`M-30,${f(bot - 6)}H30V${f(bot + 4)}H-30Z`, fadeLike(col), 'opacity="0.5"');
    const r = rnd(seed + 17);
    const n = o.stains ?? 3;
    for (let k = 0; k < n; k++) {
      const sx = wL + 3 + r() * (wR - wL - 6);
      const sy = top + 6 + r() * (bot - top - 10);
      const col2 = [BLOOD, GREASE, '#7A3A1E', SLIME][k % (z ? 4 : 3)];
      inner += stain(sx, sy, 1.2 + r() * 1.6, col2, seed + k * 9, 0.6 + r() * 0.25);
      if (k === 0) inner += drip(sx + 0.5, sy + 1, 2.6 + r() * 3, 0.9, col2, 0.6);
    }
    inner += line(`M${f(wL + 1)},${f(top + 15.2)}h${f(wR - wL - 2)}`, 0.5, col.d, 'opacity="0.6"');
    if (o.pocket !== false) inner += line(`M${f(-1 + x0)},${f(top + 17)}h7.6v5.4h-7.6Z`, 0.55, col.d) + line(`M${f(-1 + x0)},${f(top + 17)}h7.6`, 0.9, col.d);
    let s = line(`M${f(-3.4 + x0)},${f(top)}L${f(-2.6 + x0)},${f(b.tTop - 1)}M${f(6.6 + x0)},${f(top)}L${f(5.8 + x0)},${f(b.tTop - 1)}`, 1.6) + line(`M${f(-3.4 + x0)},${f(top)}L${f(-2.6 + x0)},${f(b.tTop - 1)}M${f(6.6 + x0)},${f(top)}L${f(5.8 + x0)},${f(b.tTop - 1)}`, 0.8, col.b);
    s += shade(d, p, col, { inner, lw: 1.1 });
    // waist ties disappearing round the sides
    s += line(`M${f(wL)},${f(top + 14)}l-1.6,0.4M${f(wR + 0.6)},${f(top + 14)}l1.6,0.2`, 1.3, col.s);
    return s;
  };
}
function fadeLike(t: Tone): string {
  return t.s;
}

// ---------------------------------------------------------------- vests, belts, straps
/** Hi-vis / work vest over a shirt: two front panels with reflective stripes. */
export function vest(col: Tone, stripe: string): Paint {
  return (c) => {
    const { d, b, back, seed } = c;
    const td = torsoD(b, { flare: 0.4 });
    const x0 = b.hunch;
    let inner = speck([-16, b.tTop, 18, b.tBot], 30, [col.d, lt(col.b, 0.2)], seed + 51, 0.2, 0.5, 0.45) + grime([-14, b.tTop, 16, b.tBot], 5, '#4A4028', seed + 52, 2.6, 0.3);
    inner += fill(`M-30,${f(b.tBot - 14)}H30V${f(b.tBot - 11.6)}H-30Z`, stripe) + fill(`M-30,${f(b.tBot - 8)}H30V${f(b.tBot - 5.6)}H-30Z`, stripe);
    inner += line(`M-30,${f(b.tBot - 14)}H30M-30,${f(b.tBot - 11.6)}H30M-30,${f(b.tBot - 8)}H30M-30,${f(b.tBot - 5.6)}H30`, 0.4, dk(stripe, 0.7));
    if (back) {
      inner += fill(`M-30,${f(b.shY + 4)}H30V${f(b.shY + 6.4)}H-30Z`, stripe);
      return shade(d, td, col, { inner, lw: 1.1 }) + zDamage(c, td, [[5, b.shY + 12]], 1);
    }
    const hole = `M${f(-3.4 + x0)},${f(b.tTop - 4)}L${f(2.6 + x0)},${f(b.tBot + 4)}L${f(4.4 + x0)},${f(b.tBot + 4)}L${f(8 + x0)},${f(b.tTop - 4)}Z`;
    const id = d.id('m');
    d.def(`<clipPath id="${id}"><path clip-rule="evenodd" d="M-40,-130H40V20H-40Z${hole}"/></clipPath>`);
    let s = `<g clip-path="url(#${id})">${shade(d, td, col, { inner, lw: 1.1 })}</g>`;
    s += line(`M${f(-2.8 + x0)},${f(b.tTop - 0.4)}L${f(2.6 + x0)},${f(b.tBot)}M${f(7.6 + x0)},${f(b.tTop - 0.4)}L${f(4.4 + x0)},${f(b.tBot)}`, 1);
    s += zDamage(c, td, [[-7, b.shY + 14]], 1);
    return s;
  };
}

/** Suspenders straps (front Y / back X). */
export function suspenders(col: string): Paint {
  return (c) => {
    const { b, back } = c;
    const x0 = b.hunch;
    const dd = back
      ? `M-6,${f(b.tTop + 2)}L4,${f(b.tBot - 6)}M5,${f(b.tTop + 2)}L-6,${f(b.tBot - 6)}`
      : `M${f(-5 + x0)},${f(b.tTop + 1.6)}L${f(-4 + x0)},${f(b.tBot - 6)}M${f(8 + x0)},${f(b.tTop + 1.6)}L${f(9 + x0)},${f(b.tBot - 6.4)}`;
    let s = line(dd, 2.4) + line(dd, 1.4, col);
    if (!back) s += outl(`M${f(-5.4 + x0)},${f(b.tBot - 7.6)}h2.4v2.4h-2.4Z`, '#9A9890', 0.4) + outl(`M${f(7.8 + x0)},${f(b.tBot - 8)}h2.4v2.4h-2.4Z`, '#9A9890', 0.4);
    return s;
  };
}

/** Neckerchief knotted at the throat (gus). */
export function neckerchief(col: Tone): Paint {
  return (c) => {
    const { d, b, back } = c;
    const top = b.tTop;
    const x0 = b.hunch;
    if (back) return shade(d, `M${f(-6 + x0)},${f(top + 0.6)}Q${f(1 + x0)},${f(top - 2)} ${f(8 + x0)},${f(top + 0.6)}L${f(7 + x0)},${f(top + 3)}Q${f(1 + x0)},${f(top + 0.6)} ${f(-5 + x0)},${f(top + 3)}Z`, col, { lw: 0.9 }) + shade(d, `M${f(-1 + x0)},${f(top + 1.6)}L${f(-3.6 + x0)},${f(top + 8)}L${f(1.6 + x0)},${f(top + 6.4)}Z`, col, { lw: 0.8 });
    let s = shade(d, `M${f(-5.6 + x0)},${f(top - 0.6)}Q${f(1 + x0)},${f(top + 2.6)} ${f(8 + x0)},${f(top - 0.6)}L${f(8.4 + x0)},${f(top + 2)}Q${f(1 + x0)},${f(top + 5)} ${f(-5.8 + x0)},${f(top + 1.8)}Z`, col, { lw: 0.9 });
    s += shade(d, `M${f(1 + x0)},${f(top + 2.6)}L${f(-1.6 + x0)},${f(top + 10)}L${f(2.4 + x0)},${f(top + 8.6)}L${f(4.6 + x0)},${f(top + 10.6)}L${f(5 + x0)},${f(top + 3)}Z`, col, { lw: 0.9, inner: line(`M${f(1.6 + x0)},${f(top + 4)}l-1,4`, 0.4, col.d) });
    s += outl(ellD(2.6 + x0, top + 2.8, 1.8, 1.4), col.s, 0.8);
    if (c.z) s += stain(3 + x0, top + 7, 1, BLOOD, c.seed + 4, 0.8);
    return s;
  };
}

/** Double-breasted chef jacket (gus). */
export function chefJacket(col: Tone): Paint {
  return (c) => {
    const { d, b, back, seed } = c;
    const td = torsoD(b, { flare: 0.8, drop: 3, torn: c.z }, seed);
    const x0 = b.hunch;
    let inner = speck([-18, b.tTop, 20, b.tBot + 4], 30, [col.d, lt(col.b, 0.2)], seed + 3, 0.2, 0.5, 0.4);
    inner += grime([-16, b.tTop, 18, b.tBot + 4], 7, '#7A6236', seed + 4, 3.4, 0.28);
    inner += fold(`M${f(-b.wTop + 1)},${f(b.shY + 7)}q2.4,1.6 4,1M${f(-b.wBot + 2)},${f(b.tBot - 6)}q3,-1.6 6,-0.4M${f(b.wBot - 3)},${f(b.tBot - 9)}q-3,1.4 -6,0.6`, col.s, 0.7);
    if (!back) {
      inner += line(`M${f(-5 + x0)},${f(b.tTop + 1)}C${f(1 + x0)},${f(b.shY + 4)} ${f(8 + x0)},${f(b.shY + 12)} ${f(9 + x0)},${f(b.tBot + 3)}`, 0.7, col.d);
      for (let i = 0; i < 4; i++) {
        const y = b.shY + 4 + i * 6.4;
        inner += circ(1.4 + x0 + i * 0.4, y, 0.9, '#E8E4D8') + line(ellD(1.4 + x0 + i * 0.4, y, 0.9, 0.9), 0.4);
        inner += circ(11 + x0 + i * 0.2, y + 1, 0.8, '#C8C4B8') + line(ellD(11 + x0 + i * 0.2, y + 1, 0.8, 0.8), 0.4);
      }
    } else inner += fold(`M-1.6,${f(b.tTop + 3)}V${f(b.tBot)}`, col.s, 0.6);
    const r = rnd(seed + 8);
    for (let k = 0; k < 4; k++) inner += stain(-8 + r() * 18, b.shY + 6 + r() * 22, 1.2 + r() * 1.6, [BLOOD, GREASE, SLIME, '#7A3A1E'][k], seed + k * 3, 0.6);
    let s = shade(d, td, col, { inner });
    s += zDamage(c, td, [[-6, b.shY + 16]], 1);
    return s;
  };
}

/** A waistband + belt painted across the torso bottom (for outfits not using shirtTorso). */
export function beltBand(c: Ctx, pants: Tone, belt?: string, buckle?: string): string {
  const { b, back, d } = c;
  const y = b.tBot - 6.4;
  let s = fill(`M-30,${f(y)}H30V10H-30Z`, pants.b) + fill(`M6,${f(y)}H30V10H6Z`, pants.s, 'opacity="0.6"') + line(`M-30,${f(y)}H30`, 1);
  if (belt) {
    s += fill(`M-30,${f(y - 1.4)}H30V${f(y + 1.6)}H-30Z`, belt) + line(`M-30,${f(y - 1.4)}H30M-30,${f(y + 1.6)}H30`, 0.7);
    if (buckle && !back) s += outl(`M1.6,${f(y - 1.9)}h3.6v4h-3.6Z`, buckle, 0.6);
  }
  return inside(d, torsoD(b), s);
}

// ---------------------------------------------------------------- skin-baring tops
/** Bare torso (sumo, boxer): pecs, belly, navel, body hair; zombies get a gash with ribs. */
export function bareTorso(o: { pecs?: boolean; abs?: boolean; hair?: string; navel?: boolean; ribsGash?: boolean } = {}): Paint {
  return (c) => {
    const { d, b, back, seed, sk } = c;
    const td = torsoD(b);
    const x0 = b.hunch;
    let inner = speck([-20, b.tTop, 24, b.tBot], 24, [sk.d, lt(sk.b, 0.3)], seed + 71, 0.2, 0.5, 0.3);
    if (!back) {
      if (o.pecs) inner += line(`M${f(-7 + x0)},${f(b.shY + 7)}Q${f(-2 + x0)},${f(b.shY + 10.6)} ${f(3 + x0)},${f(b.shY + 8)}Q${f(8 + x0)},${f(b.shY + 10.6)} ${f(12 + x0)},${f(b.shY + 7.4)}`, 0.7, sk.d);
      if (o.abs) inner += line(`M${f(3 + x0)},${f(b.shY + 10)}V${f(b.tBot - 6)}M${f(-2 + x0)},${f(b.shY + 15)}h9M${f(-1.6 + x0)},${f(b.shY + 20)}h9`, 0.55, sk.d, 'opacity="0.8"');
      if (b.belly > 2) inner += line(`M${f(-8 + x0)},${f(b.tBot - 13)}C${f(-2 + x0)},${f(b.tBot - 9)} ${f(10 + x0)},${f(b.tBot - 9)} ${f(b.wBot + b.belly - 3)},${f(b.tBot - 15)}`, 0.7, sk.d) + fill(`M-30,${f(b.tBot - 12)}C${f(-2 + x0)},${f(b.tBot - 8)} ${f(10 + x0)},${f(b.tBot - 8)} 30,${f(b.tBot - 16)}V20H-30Z`, sk.s, 'opacity="0.45"');
      if (o.navel !== false) inner += line(`M${f(4 + x0)},${f(b.tBot - 13)}q0.8,1 0,2`, 0.7, sk.d);
      if (o.hair) inner += hatch([-6 + x0, b.shY + 6, 12 + x0, b.shY + 14], 30, o.hair, seed + 3, 1, 1.3, 0.35, 0.8) + hatch([2 + x0, b.shY + 14, 6 + x0, b.tBot - 10], 14, o.hair, seed + 4, 1, 1.5, 0.35, 0.7);
      inner += fill(ellD(-3 + x0, b.shY + 8, 5, 3), lt(sk.b, 0.3), 'opacity="0.35"');
    } else {
      inner += line(`M-1.6,${f(b.tTop + 4)}V${f(b.tBot - 8)}`, 0.6, sk.d) + line(`M-8,${f(b.shY + 4)}q3,4 2,8M5,${f(b.shY + 4)}q-3,4 -2,8`, 0.55, sk.d);
    }
    let s = shade(d, td, sk, { inner });
    if (c.z && o.ribsGash !== false) {
      const gx = back ? -5 : 8 + x0;
      const gy = b.shY + 13;
      const g = jag(gx, gy, 4.4, 3.2, seed + 13, 7, 0.25);
      let gi = fill(g, '#3A1210');
      for (let k = 0; k < 3; k++) gi += line(`M${f(gx - 3.6)},${f(gy - 1.6 + k * 1.6)}Q${f(gx)},${f(gy - 2.6 + k * 1.6)} ${f(gx + 3.6)},${f(gy - 1.4 + k * 1.6)}`, 1, '#D8CCA8');
      s += inside(d, g, gi) + line(g, 0.8) + drip(gx - 1, gy + 2.6, 4, 1, BLOOD, 0.7);
      s += zDamage(c, td, [], 2);
    }
    return s;
  };
}

/** Tank top / sleeveless top over the skin torso. */
export function tankTop(col: Tone, o: { scoop?: number; extra?: Paint; pants?: Tone; belt?: string; crop?: number } = {}): Paint {
  return (c) => {
    const { d, b, back, seed } = c;
    const x0 = b.hunch;
    const td = torsoD(b);
    let s = shade(d, td, c.sk, { inner: speck([-20, b.tTop, 24, b.tBot], 14, [c.sk.d], seed, 0.2, 0.5, 0.3) });
    const sc = o.scoop ?? 5;
    const bot = o.crop ? b.tBot - o.crop : 20;
    const mask = back
      ? `M-30,${f(b.shY + 5)}L${f(-6.4 + x0)},${f(b.shY + 3)}L${f(-5.4 + x0)},${f(b.tTop - 2)}L${f(-2 + x0)},${f(b.tTop - 2)}Q${f(0.5 + x0)},${f(b.tTop + 3)} ${f(4 + x0)},${f(b.tTop - 2)}L${f(7.4 + x0)},${f(b.tTop - 2)}L${f(9 + x0)},${f(b.shY + 3)}L30,${f(b.shY + 5)}L30,${f(bot)}L-30,${f(bot)}Z`
      : `M-30,${f(b.shY + 6)}L${f(-7 + x0)},${f(b.shY + 4)}L${f(-5.6 + x0)},${f(b.tTop - 2)}L${f(-3 + x0)},${f(b.tTop - 2)}Q${f(1 + x0)},${f(b.tTop + sc + 2)} ${f(5.8 + x0)},${f(b.tTop - 2)}L${f(8.6 + x0)},${f(b.tTop - 2)}L${f(10.4 + x0)},${f(b.shY + 5)}L30,${f(b.shY + 6)}L30,${f(bot)}L-30,${f(bot)}Z`;
    let inner = speck([-20, b.tTop, 24, b.tBot], 24, [col.d, lt(col.b, 0.2)], seed + 3, 0.2, 0.45, 0.4);
    inner += fold(`M${f(-b.wBot + 2.4)},${f(b.tBot - 9)}q3,-1.4 6,-0.6M${f(b.wBot - 2)},${f(b.tBot - 11)}q-2.6,1.4 -5.6,0.8`, col.s, 0.6);
    if (o.pants) inner += fill(`M-30,${f(b.tBot - 5.4)}H30V20H-30Z`, o.pants.b) + fill(`M6,${f(b.tBot - 5.4)}H30V20H6Z`, o.pants.s, 'opacity="0.6"') + line(`M-30,${f(b.tBot - 5.4)}H30`, 0.9);
    if (o.belt) inner += fill(`M-30,${f(b.tBot - 6.6)}H30V${f(b.tBot - 4.2)}H-30Z`, o.belt) + line(`M-30,${f(b.tBot - 6.6)}H30M-30,${f(b.tBot - 4.2)}H30`, 0.6);
    if (o.extra) inner += o.extra(c);
    const id = d.id('m');
    d.def(`<clipPath id="${id}"><path d="${mask}"/></clipPath>`);
    s += `<g clip-path="url(#${id})">${shade(d, td, col, { inner })}</g>`;
    if (!back) s += line(`M${f(-5.6 + x0)},${f(b.tTop - 1)}L${f(-7 + x0)},${f(b.shY + 4)}M${f(8.6 + x0)},${f(b.tTop - 1)}L${f(10.4 + x0)},${f(b.shY + 5)}`, 0.8);
    if (o.crop) s += line(`M${f(-b.wBot)},${f(bot)}Q0.5,${f(bot + 1)} ${f(b.wBot + b.belly)},${f(bot - 0.4)}`, 0.9);
    s += zDamage(c, td, [[6, b.tBot - 12]], 2);
    return s;
  };
}

// ---------------------------------------------------------------- skirts and dresses
export function skirt(col: Tone, o: { waist?: number; hem?: number; flare?: number; pleats?: number; pattern?: (c: Ctx) => string } = {}): Paint {
  return (c) => {
    const { d, b, seed, back } = c;
    const wy = b.tBot - (o.waist ?? 6);
    const hy = b.tBot + (o.hem ?? 8);
    const fl = o.flare ?? 3;
    const wl = b.wBot - 0.8;
    let p = `M${f(-wl)},${f(wy)}L${f(wl + b.belly * 0.6)},${f(wy)}L${f(wl + fl + b.belly * 0.4)},${f(hy)}`;
    if (c.z) {
      const r = rnd(seed + 31);
      const n = 8;
      for (let k = 1; k < n; k++) p += `L${f(wl + fl - ((2 * wl + 2 * fl) * k) / n)},${f(hy + (k % 2 ? 1.8 + r() * 2 : -0.6))}`;
      p += `L${f(-wl - fl)},${f(hy)}Z`;
    } else p += `Q0.5,${f(hy + 1.6)} ${f(-wl - fl)},${f(hy)}Z`;
    let inner = speck([-20, wy, 22, hy + 2], 16, [col.d, lt(col.b, 0.2)], seed + 9, 0.2, 0.45, 0.4);
    const np = o.pleats ?? 0;
    for (let k = 1; k < np; k++) {
      const t = k / np;
      const x1 = -wl + 2 * wl * t;
      const x2 = -wl - fl + (2 * wl + 2 * fl) * t;
      inner += line(`M${f(x1)},${f(wy + 1)}L${f(x2)},${f(hy + 1)}`, 0.55, col.d, 'opacity="0.8"');
    }
    if (!np) inner += fold(`M${f(-wl + 3)},${f(wy + 3)}q-1,4 -2,${f(hy - wy - 3)}M${f(wl - 2)},${f(wy + 3)}q1.4,4 2,${f(hy - wy - 3)}M2,${f(wy + 4)}q0.6,3 -0.4,${f(hy - wy - 4)}`, col.s, 0.6);
    if (o.pattern) inner += o.pattern(c);
    let s = shade(d, p, col, { inner });
    s += line(`M${f(-wl)},${f(wy)}L${f(wl + b.belly * 0.6)},${f(wy)}`, 1);
    if (c.z) s += inside(d, p, stain(-3, hy - 3, 1.6, BLOOD, seed + 3, 0.55)) + inside(d, p, `<path d="${jag(4, (wy + hy) / 2, 2, 1.6, seed + 5, 6, 0.3)}" fill="${c.sk.d}" stroke="${INK}" stroke-width="0.5"/>`);
    void back;
    return s;
  };
}

/** Floral print dots (grandma). */
export function florals(c: Ctx, box: [number, number, number, number], col: string, mid: string, n = 16): string {
  const r = rnd(c.seed + 91);
  let s = '';
  for (let k = 0; k < n; k++) {
    const x = box[0] + r() * (box[2] - box[0]);
    const y = box[1] + r() * (box[3] - box[1]);
    for (let i = 0; i < 5; i++) {
      const a = (i * 72 * Math.PI) / 180 + k;
      s += circ(x + Math.cos(a) * 0.8, y + Math.sin(a) * 0.8, 0.55, col, 0.9);
    }
    s += circ(x, y, 0.4, mid);
  }
  return s;
}

/** Plaid weave inside a box (flannel). */
export function plaid(box: [number, number, number, number], dark: string, light: string, step = 4): string {
  let s = '';
  for (let x = box[0]; x <= box[2]; x += step) s += fill(`M${f(x)},${f(box[1])}h${f(step * 0.42)}V${f(box[3])}h${f(-step * 0.42)}Z`, dark, 'opacity="0.42"');
  for (let y = box[1]; y <= box[3]; y += step) s += fill(`M${f(box[0])},${f(y)}H${f(box[2])}v${f(step * 0.42)}H${f(box[0])}Z`, dark, 'opacity="0.42"');
  for (let x = box[0] + step * 0.72; x <= box[2]; x += step) s += line(`M${f(x)},${f(box[1])}V${f(box[3])}`, 0.3, light, 'opacity="0.6"');
  for (let y = box[1] + step * 0.72; y <= box[3]; y += step) s += line(`M${f(box[0])},${f(y)}H${f(box[2])}`, 0.3, light, 'opacity="0.6"');
  return s;
}

/** Hoodie extras: kangaroo pocket and ribbed hem. */
export function hoodieBits(col: Tone): (c: Ctx) => string {
  return (c) => {
    const { b, back } = c;
    let s = fill(`M-30,${f(b.tBot - 3.4)}H30V20H-30Z`, col.s, 'opacity="0.7"') + line(`M-30,${f(b.tBot - 3.4)}H30`, 0.6, col.d);
    if (!back) s += line(`M${f(-6 + b.hunch)},${f(b.tBot - 4)}L${f(-4.6 + b.hunch)},${f(b.tBot - 12)}H${f(10 + b.hunch)}L${f(11.4 + b.hunch)},${f(b.tBot - 4)}`, 0.7, col.d);
    return s;
  };
}

/** Stethoscope around the neck (nurse). */
export function stethoscope(): Paint {
  return (c) => {
    const { b, back } = c;
    const x0 = b.hunch;
    if (back) return line(`M${f(-6 + x0)},${f(b.tTop + 1)}Q${f(1 + x0)},${f(b.tTop - 2)} ${f(8 + x0)},${f(b.tTop + 1)}`, 1.6) + line(`M${f(-6 + x0)},${f(b.tTop + 1)}Q${f(1 + x0)},${f(b.tTop - 2)} ${f(8 + x0)},${f(b.tTop + 1)}`, 0.8, '#3A3A3A');
    const dd = `M${f(-5 + x0)},${f(b.tTop + 0.4)}C${f(-7 + x0)},${f(b.shY + 8)} ${f(-3 + x0)},${f(b.shY + 13)} ${f(0 + x0)},${f(b.shY + 14)}M${f(8 + x0)},${f(b.tTop + 0.4)}C${f(9 + x0)},${f(b.shY + 6)} ${f(7 + x0)},${f(b.shY + 10)} ${f(6 + x0)},${f(b.shY + 12)}`;
    let s = line(dd, 1.7) + line(dd, 0.9, '#3A3A3A');
    s += outl(ellD(0.4 + x0, b.shY + 15.2, 1.8, 1.8), '#A8ACA8', 0.7) + circ(0 + x0, b.shY + 14.8, 0.6, '#E0E0D8');
    return s;
  };
}

/** Championship belt (champ). */
export function champBelt(): Paint {
  return (c) => {
    const { d, b, back } = c;
    const y = b.tBot - 6;
    let s = inside(d, torsoD(b), fill(`M-30,${f(y - 2.2)}H30V${f(y + 2.2)}H-30Z`, '#3A2A1A') + line(`M-30,${f(y - 2.2)}H30M-30,${f(y + 2.2)}H30`, 0.6));
    if (back) return s;
    const pl = `M${f(-3 + b.hunch)},${f(y - 4.6)}L${f(9 + b.hunch)},${f(y - 4.6)}L${f(10.4 + b.hunch)},${f(y)}L${f(9 + b.hunch)},${f(y + 4.6)}L${f(-3 + b.hunch)},${f(y + 4.6)}L${f(-4.4 + b.hunch)},${f(y)}Z`;
    s += shade(d, pl, C.gold, { lw: 1, inner: fill(ellD(3 + b.hunch, y, 3, 2.6), '#8A6A2A') + speck([-4, y - 5, 11, y + 5], 10, ['#E0C878'], c.seed, 0.3, 0.6, 0.8) });
    s += `<path d="M${f(3 + b.hunch)},${f(y - 2.2)}l0.7,1.5l1.6,0.1l-1.2,1l0.4,1.6l-1.5,-0.9l-1.5,0.9l0.4,-1.6l-1.2,-1l1.6,-0.1Z" fill="#D8C070" stroke="${INK}" stroke-width="0.35"/>`;
    return s;
  };
}

/** Tool belt with a hammer loop and pouches (construction). */
export function toolBelt(): Paint {
  return (c) => {
    const { d, b, back } = c;
    const y = b.tBot - 6.6;
    let s = inside(d, torsoD(b), fill(`M-30,${f(y - 1.6)}H30V${f(y + 1.8)}H-30Z`, '#5A3A22') + line(`M-30,${f(y - 1.6)}H30M-30,${f(y + 1.8)}H30`, 0.6));
    const pouch = (x: number) => shade(d, `M${f(x - 3)},${f(y)}h6.4l-0.6,7.4h-5.2Z`, tone('#7A5432'), { lw: 0.9, inner: line(`M${f(x - 3)},${f(y + 2)}h6.4`, 0.5, '#4A2E18') });
    s += back ? pouch(-10) + pouch(9) : pouch(-9) + pouch(11);
    if (!back) s += line(`M${f(-9.6)},${f(y)}l-0.6,-3.6M${f(-8)},${f(y)}l0.4,-4`, 1.1, '#6A6A68');
    return s;
  };
}

/** Builder's butt crack peeking over the waistband (back view). */
export function buttCrack(): Paint {
  return (c) => {
    if (!c.back) return '';
    const { b, sk } = c;
    const y = b.tBot - 7.4;
    return fill(`M-6,${f(y + 0.4)}Q-1.6,${f(y - 2.6)} 3,${f(y + 0.4)}Z`, sk.b) + line(`M-6,${f(y + 0.4)}Q-1.6,${f(y - 2.6)} 3,${f(y + 0.4)}`, 0.7) + line(`M-1.6,${f(y - 1.6)}v2`, 0.8);
  };
}

/** Police / uniform details: badge, pocket flaps, shoulder patch, radio (cop). */
export function uniformBits(badge: string): (c: Ctx) => string {
  return (c) => {
    const { b, back } = c;
    const x0 = b.hunch;
    if (back) return line(`M${f(-b.wTop + 2)},${f(b.shY + 4)}h${f(b.wTop * 2 - 4)}`, 0.5, '#1A2230');
    let s = line(`M${f(-8 + x0)},${f(b.shY + 4)}h5.4v4.6q-2.7,1.4 -5.4,0Z`, 0.55, '#1A2230') + line(`M${f(7 + x0)},${f(b.shY + 4.4)}h4.6v4q-2.3,1.2 -4.6,0Z`, 0.55, '#1A2230');
    s += `<path d="M${f(-6.4 + x0)},${f(b.shY + 1)}l1.4,-1l1.4,1l-0.2,2.4l-1.2,1l-1.2,-1Z" fill="${badge}" stroke="${INK}" stroke-width="0.4"/>`;
    return s;
  };
}

export { torsoD, zDamage, edgeX, tone, smooth, jag, mix, dk, lt, C, BLOOD, BLOOD_D, SLIME, SLIME_L, GREASE, rnd, hatch, grime, speck, stain, drip, fold, circ, ellD, fill, line, outl, inside, shade, f, INK };
