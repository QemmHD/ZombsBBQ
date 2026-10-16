/**
 * Shared rig constants, the `Look` description of a character, and reusable outfit painters
 * (front and back views). See chars.ts for the rig contract.
 */
import type { FaceName } from './types';
import { Doc, OUT, OW, S, P, G, capsule, ell, f, hl, rrect } from './svg';
import type { Pt, Tone } from './svg';
import { cel, fold, lighter, darker, rip, stain, zz, ZSK, WHITE } from './charkit';

// ------------------------------------------------------------------ rig layout (authoring frame)
export const HIP_Y = -19.5;
export const LEG_X = 4.6;
export const SH_X = 11;
export const SH_Y = -40.6;
export const NECK: Pt = [0.5, -44];
export const TORSO_PIV: Pt = [0, -16];
export const HCX = 1;
export const HCY = -58.5;
export const HRX = 16.5;
export const HRY = 15.5;

export type Box = [x0: number, y0: number, x1: number, y1: number];

export interface Rig {
  /** shoulder x (±) */
  shX: number;
  /** hip x (±) */
  legX: number;
  /** thigh width */
  legW: number;
  /** neck + shoulders raised by this much (taller torso) */
  lift: number;
  /** uniform scale about the root (grandma 0.9) */
  scale: number;
  /** arm thickness multiplier */
  armW: number;
}
export const DEF_RIG: Rig = { shX: SH_X, legX: LEG_X, legW: 6.8, lift: 0, scale: 1, armW: 1 };

export type Mood =
  | 'smile' | 'grin' | 'smug' | 'stern' | 'bored' | 'calm' | 'nervous' | 'grumpy'
  | 'snooty' | 'sweet' | 'excited' | 'tough' | 'pout' | 'cocky' | 'glam' | 'whistle';
export type ZFace =
  | 'droopy' | 'lazy' | 'bigeye' | 'smile' | 'underbite' | 'stitched' | 'worm' | 'derp'
  | 'wink' | 'oneye' | 'gap' | 'toothless' | 'grumpy' | 'shades';
export type Sleeve = 'long' | 'short' | 'none' | 'puff' | 'bulk';
export type Expr = FaceName | undefined;

/** Painter for something held in a hand. `hand` is the hand centre in the arm's frame. */
export type HandItem = (d: Doc, z: boolean, back: boolean, hand: Pt) => string;

export interface Look {
  skin: Tone;
  /** hair colour (brows, stray hairs) */
  hair: Tone;
  rig?: Partial<Rig>;
  height: number;
  // legs
  pants: Tone;
  shoe: Tone;
  shoeTrim?: string;
  boots?: boolean;
  heels?: boolean;
  barefoot?: boolean;
  leg?: 'pants' | 'stockings' | 'leggings' | 'shorts' | 'bare';
  legStripe?: string;
  sock?: Tone;
  kneepad?: string;
  // arms
  sleeve: Sleeve;
  sleeveCol: Tone;
  cuff?: string;
  wristband?: string;
  watch?: boolean;
  bandage?: boolean;
  /** hand covering colour (traffic cop gloves) */
  glove?: Tone;
  /** boxing gloves instead of hands */
  boxing?: Tone;
  /** opera gloves up to the elbow */
  longGlove?: Tone;
  /** muscle definition on bare arms */
  muscles?: boolean;
  /** items held in the near (L) / far (R) hand, drawn over the hand */
  itemL?: HandItem;
  itemR?: HandItem;
  /** drawn under the hand (shafts that pass behind the fist) */
  underL?: HandItem;
  underR?: HandItem;
  /** custom arm image boxes (authoring frame) when an item sticks out */
  boxL?: Box;
  boxR?: Box;
  /** near (L) arm bent at the elbow, hand held at the chest (humans only) */
  bentL?: boolean;
  // torso
  torso: (d: Doc, z: boolean) => string;
  torsoBack: (d: Doc, z: boolean) => string;
  torsoBox?: Box;
  // head
  /** front view: behind the head shape (ponytail, bun) */
  back?: (d: Doc, z: boolean) => string;
  /** front view: hair / hat over the head */
  hairFront: (d: Doc, z: boolean, e: Expr) => string;
  /** back view: hair / hat over the back of the head */
  hairBack: (d: Doc, z: boolean) => string;
  /** back view: drawn behind the head shape */
  backBehind?: (d: Doc, z: boolean) => string;
  headBox?: Box;
  face: Mood;
  zface: ZFace;
  brow?: string;
  lashes?: boolean;
  lips?: string;
  glasses?: 'square' | 'round';
  earbuds?: boolean;
  mustache?: Tone;
  beard?: Tone;
  pale?: boolean;
  noBlush?: boolean;
  /** face decorations under the eyes/mouth (face paint, black eye) */
  faceUnder?: (d: Doc, z: boolean, e: Expr) => string;
  /** face decorations on top (whistle, shades, beauty mark) */
  faceOver?: (d: Doc, z: boolean, e: Expr) => string;
}

// ------------------------------------------------------------------ torso shapes
export function torsoD(torn: boolean, ws = 10.6, wh = 11.4, top = -44, bot = -16): string {
  const head =
    `M${f(-ws)},${f(top + 3.2)}C${f(-ws)},${f(top + 0.4)} ${f(-ws + 2.6)},${f(top - 0.8)} ${f(-ws + 5.5)},${f(top - 0.8)}` +
    `L${f(ws - 5.5)},${f(top - 0.8)}C${f(ws - 2.6)},${f(top - 0.8)} ${f(ws)},${f(top + 0.4)} ${f(ws)},${f(top + 3.2)}` +
    `L${f(wh)},${f(bot - 3)}`;
  if (!torn) {
    return (
      head +
      `C${f(wh)},${f(bot - 0.8)} ${f(wh - 1.6)},${f(bot)} ${f(wh - 4)},${f(bot)}L${f(-wh + 4)},${f(bot)}` +
      `C${f(-wh + 1.6)},${f(bot)} ${f(-wh)},${f(bot - 0.8)} ${f(-wh)},${f(bot - 3)}Z`
    );
  }
  return head + zz([wh, bot], [-wh, bot], 5, -1.9) + `L${f(-wh)},${f(bot - 3)}Z`;
}

export function neck(d: Doc, skin: Tone, lift = 0): string {
  return d.tone(rrect(-3.4, -48.5 - lift, 7.8, 8 + lift, 2.5), [skin[1], skin[1]], OW * 0.8);
}

/** Pants waistband visible under a tucked shirt (clipped to the torso). */
export function waist(d: Doc, td: string, pants: Tone, belt?: string, buckle?: string, wh = 11.4): string {
  let s = d.clip(td, P(`M-20,-20.2H20V-12H-20Z`, pants[0]) + P(`M2,-20.2H20V-12H2Z`, pants[1]));
  s += S(`M${f(-wh)},-20.2H${f(wh)}`, 1.1);
  if (belt) {
    s += d.clip(td, P('M-20,-21.6H20V-18.8H-20Z', belt) + S('M-20,-21.6H20M-20,-18.8H20', 0.9));
    if (buckle) s += P(rrect(-0.9, -22, 3, 3.6, 0.6), buckle, 0.9) + P(rrect(0, -21, 1.2, 1.6, 0.3), darker(buckle), 0);
  }
  return s;
}

/** Generic shirt folds: armpit creases and a tuck crease. */
export function shirtFolds(col: string, ws = 10.6): string {
  return fold(`M${f(-ws + 1.2)},-36.4q2,1.2 3.4,0.6M${f(ws - 1.2)},-36q-2,1.4 -3.6,0.6M${f(-ws + 3)},-24.6q2.4,-1.4 4.4,-0.4M${f(ws - 3.2)},-26.6q-1.6,1.6 -4,1.2`, col, 0.8);
}

/** White apron (bib + skirt) used by the player and Gus. */
export function apron(d: Doc, torn: boolean, stains: boolean): string {
  const bot = -13.6;
  let path = 'M-5.2,-42.2L6.2,-42.2L6.8,-33.6C9,-32.8 10,-31 10.2,-28.6L10.9,-15.6';
  if (torn) path += zz([10.9, bot], [-9.9, bot], 4, -1.6);
  else path += `C11,${f(bot)} 10.4,${f(bot)} 9.6,${f(bot)}L-8.6,${f(bot)}C-9.6,${f(bot)} -10,${f(bot)} -9.9,-15.6`;
  path += 'L-9.4,-28.6C-9.2,-31 -8.2,-32.8 -5.8,-33.6Z';
  let s = S('M-4.6,-42L-2.4,-46.4M5.6,-42L3.6,-46.4', 1.2);
  s += cel(d, path, WHITE, { sw: OW * 0.75, off: [-1, -1] });
  s += S('M-9.6,-30.6C-3,-31.6 4,-31.6 10.4,-30.6', 1);
  s += P(rrect(1.6, -27.6, 6.2, 4.6, 1), 'none', 0.9, '#B9AF9C') + S('M1.6,-26.4H7.8', 0.6, '#B9AF9C');
  s += fold('M-6,-22q0.6,3 -0.4,6M4,-21q0.8,3 0.2,5.6', '#CFC5B0', 0.8);
  if (stains) {
    s += stain(-4.6, -24, 1.1, '#A8432A');
    s += stain(4.6, -18.6, 0.7, '#A8432A', 0.75);
    s += stain(-1, -37.2, 0.6, '#8A5A2A', 0.6);
    s += stain(6.6, -35, 0.7, '#7CC24A', 0.85);
  }
  return s;
}

/** Back of an apron: neck strap and a big bow at the waist. */
export function apronBack(d: Doc, torn: boolean): string {
  let s = S('M-4,-45.2Q0.5,-47.4 5,-45.2', 1.6, '#FBF7EE') + S('M-4,-45.2Q0.5,-47.4 5,-45.2', 0.5, '#B9AF9C');
  s += d.clip(torsoD(torn, 11.2, 12), P('M-20,-27.2H20V-24.6H-20Z', '#FBF7EE') + S('M-20,-27.2H20M-20,-24.6H20', 0.8));
  const loopL = 'M0.4,-25.8C-2.6,-29.4 -6.4,-29 -6,-26C-5.8,-23.4 -2.4,-24 0.4,-25.8Z';
  const loopR = 'M0.6,-25.8C3.6,-29.4 7.4,-29 7,-26C6.8,-23.4 3.4,-24 0.6,-25.8Z';
  const tails = torn
    ? 'M-0.4,-25.2L-3.6,-17.4L-1.6,-18.4L-0.8,-16.6L0.6,-24.8ZM1.4,-25.2L4.8,-18L2.6,-18.6L2,-16.8L0.6,-24.8Z'
    : 'M-0.4,-25.2L-3.4,-17.6L-1,-18.2L0.6,-24.8ZM1.4,-25.2L4.6,-18L2.2,-18.4L0.6,-24.8Z';
  s += d.tone(tails, WHITE, 1, [-0.4, -0.4]) + d.tone(loopL, WHITE, 1, [-0.4, -0.4]) + d.tone(loopR, WHITE, 1, [-0.4, -0.4]);
  s += P(ell(0.5, -25.8, 1.5, 1.4), '#EDE6D6', 1);
  return s;
}

export function suitV(d: Doc, jacket: Tone, tie: Tone, torn: boolean): string {
  const td = torsoD(torn);
  let s = cel(d, td, jacket);
  s += P('M-4.2,-44.6L0.5,-30.6L5.2,-44.6Z', '#FFFFFF', 1.1);
  s += S('M-2.6,-43.6L-0.6,-40.6M3.6,-43.6L1.6,-40.6', 0.6, '#C9CED6');
  const knot = 'M-0.9,-42.4L2,-42.4L1.6,-40L-0.5,-40Z';
  const blade = 'M-0.5,-40L1.6,-40L2.4,-32.4L0.5,-30.4L-1.4,-32.4Z';
  const tieG = P(knot, tie[0], 1) + P(blade, tie[0], 1) + S('M0.1,-38.6L1.6,-37.4M-0.2,-36L1.9,-34.4', 0.6, tie[1]);
  s += torn ? G(tieG, 'rotate(14 0.5 -42)') : tieG;
  s += d.clip(td, P('M-4.6,-45L0.5,-30.4L-1.2,-30L-7.2,-38.6L-4.4,-40.2L-7.4,-42.6Z', jacket[1], 1.1));
  s += d.clip(td, P('M5.6,-45L0.5,-30.4L2.2,-30L8.2,-38.6L5.4,-40.2L8.4,-42.6Z', jacket[1], 1.1));
  s += `<circle cx="0.5" cy="-27" r="0.8" fill="${OUT}"/><circle cx="0.5" cy="-22.6" r="0.8" fill="${OUT}"/>`;
  s += S('M-8.6,-24H-4.2M5,-24H9.4', 0.9, jacket[1]);
  s += fold('M-9,-34.6q2,0.8 3,0M9.6,-33.6q-2,1 -3.2,0.2', jacket[1], 0.9);
  if (!torn) s += S('M0.5,-20V-16.4', 0.9);
  return s;
}

/** Back of a suit jacket: collar band, centre seam with a vent, shoulder seams. */
export function suitBack(d: Doc, jacket: Tone, torn: boolean, collar = '#FFFFFF'): string {
  const td = torsoD(torn);
  let s = cel(d, td, jacket);
  s += P('M-5,-45.2Q0.5,-46.6 6,-45.2L5.4,-42.8Q0.5,-44 -4.4,-42.8Z', collar, 1);
  s += d.clip(td, P('M-6,-43.4Q0.5,-44.6 7,-43.4L6.4,-41Q0.5,-42.2 -5.4,-41Z', jacket[1], 1));
  s += S('M0.5,-41V-21', 0.9, jacket[1]) + S('M0.5,-21L0.5,-16.4', 1);
  s += fold('M-8,-40.6q1.6,4 1,8M9,-40.6q-1.6,4 -1,8', jacket[1], 0.8);
  s += fold('M-6,-30q2,1 4,0.4M5,-28q2,0.8 4,0', jacket[1], 0.8);
  if (torn) s += rip(d, -5, -26, 0.9) + rip(d, 6, -34, 0.7);
  return s;
}

/** Generic back of a shirt / top. */
export function shirtBack(
  d: Doc,
  z: boolean,
  t: Tone,
  o: { ws?: number; wh?: number; top?: number; bot?: number; collar?: string; waist?: Tone; belt?: string; yoke?: boolean } = {},
): string {
  const ws = o.ws ?? 10.6;
  const wh = o.wh ?? 11.4;
  const td = torsoD(z, ws, wh, o.top ?? -44, o.bot ?? -16);
  let s = cel(d, td, t);
  if (o.waist) {
    s += d.clip(td, P(`M-20,-20.2H20V-10H-20Z`, o.waist[0]) + P(`M2,-20.2H20V-10H2Z`, o.waist[1])) + S(`M${f(-wh)},-20.2H${f(wh)}`, 1.1);
    if (o.belt) s += d.clip(td, P('M-20,-21.6H20V-18.8H-20Z', o.belt) + S('M-20,-21.6H20M-20,-18.8H20', 0.9) + S('M-6,-21.6V-18.8M7,-21.6V-18.8', 0.8));
  }
  if (o.yoke) s += d.clip(td, S('M-12,-38.6Q0.5,-36.6 13,-38.6', 0.9, t[1]));
  if (o.collar) s += P('M-4.6,-45.2Q0.5,-46.8 5.6,-45.2L5.2,-43Q0.5,-44.2 -4.2,-43Z', o.collar, 1);
  s += fold(`M0.5,-40V-${o.waist ? 22 : 18}`, t[1], 0.7, 0.6);
  s += fold(`M${f(-ws + 1.4)},-30q3,1.2 5.4,0.4M${f(ws - 1.4)},-27q-3,1.2 -5,0.2`, t[1], 0.8);
  if (z) s += rip(d, -5, -30, 0.9) + rip(d, 5.6, -36, 0.7) + stain(4, -24, 0.7, '#5E9A2A', 0.7);
  return s;
}

// ------------------------------------------------------------------ hair & hats
export const HAIR_CAP =
  'M-16.6,-55C-17.8,-71 -7,-77 2,-76.6C12,-76.4 19,-70.4 18.4,-60C16.2,-63.6 12.8,-65.6 8.6,-65.6' +
  'C4,-65.8 -1.4,-64.4 -5.4,-66.6C-8,-63 -11.6,-60.2 -13.4,-55.6Z';

export function strays(col: string): string {
  return S('M-1,-76Q-1.6,-80.6 1.4,-80.2M3.6,-76.2Q5.6,-80.6 7.8,-78.4M-6,-74.6Q-9.2,-77.8 -7.6,-79.4', 1.1, col);
}

/** Short-hair back-of-head cap (back view). `low` lowers the nape line. */
export function backHairD(low = 0, top = -76.4): string {
  return (
    `M-16.4,${f(-52 + low)}C-18,-64 -11,${f(top)} 1.4,${f(top)}C12,${f(top)} 18.8,-70 18.2,-61` +
    `L16.2,-60.6C14,-60 12.6,-57.4 12.4,${f(-54.8 + low * 0.5)}` +
    `C10.4,${f(-50.6 + low)} 6,${f(-48.6 + low)} 1.2,${f(-48.6 + low)}C-5,${f(-48.6 + low)} -11,${f(-49.4 + low)} -16.4,${f(-52 + low)}Z`
  );
}

/** Back-view short hair with strand marks and a crown whorl. */
export function backHair(d: Doc, t: Tone, low = 0, top = -76.4): string {
  let s = cel(d, backHairD(low, top), t, { off: [-1, -1] });
  s += S('M2,-68.4q1.8,-1.4 0.4,-3q-2.4,-1 -3,1.6q0,3.4 4.6,3', 0.9, t[1]);
  s += S('M-10,-56Q-8,-62 -3,-65M8,-54Q10,-60 6,-64.6M-1,-52Q0,-58 -1,-62', 0.8, t[1]);
  s += hl(-5, -71, 4, 1.3, -20, 0.3);
  return s;
}

export function hardHat(d: Doc, col: Tone, z: boolean, logo = true): string {
  const dome = 'M-14.6,-63.6C-14.8,-77 -6,-81.6 2,-81.6C10,-81.6 18.8,-77 18.6,-63.6Z';
  let s = cel(d, dome, col, { off: [-1.5, -1.2] });
  s += S('M2,-81.2L2,-65', 1.2) + S('M-4.6,-80Q-8,-75.8 -8.4,-66M8.6,-80Q12,-75.8 12.4,-66', 0.8, col[1]);
  s += S('M5.6,-79.6Q9.8,-77 11,-69.6', 1.2, '#FFF3C4');
  if (logo) s += P(ell(-3.2, -72, 2.4, 2.2), '#FFFFFF', 0.8) + S('M-4.4,-73.2H-2L-4.2,-70.8H-1.8', 0.7, '#3A8A3A');
  s += cel(d, rrect(-17.6, -66.4, 39.2, 4.4, 2.2), [col[1], darker(col[1])], { sw: OW * 0.9, hi: 0.6 });
  if (z) s += S('M9,-80L11,-76.6L9.4,-74.6L11.8,-71', 0.9) + P(ell(-8, -71, 1.6, 1.1), '#7CC24A', 0.7);
  return s;
}

export function hardHatBack(d: Doc, col: Tone, z: boolean): string {
  const dome = 'M-15.6,-63.6C-15.8,-77 -7,-81.6 1,-81.6C9,-81.6 17.8,-77 17.6,-63.6Z';
  let s = cel(d, dome, col, { off: [-1.5, -1.2] });
  s += S('M1,-81.2L1,-65', 1.2) + S('M-6,-80Q-9,-75.8 -9.4,-66M7.6,-80Q11,-75.8 11.4,-66', 0.8, col[1]);
  s += cel(d, rrect(-18.6, -66.4, 38.4, 4.4, 2.2), [col[1], darker(col[1])], { sw: OW * 0.9, hi: 0.6 });
  s += S('M-12,-62.6Q1,-58.4 14,-62.6', 1, '#3A2A22');
  if (z) s += S('M-6,-79L-8,-75.6L-6.4,-73.6L-8.8,-70', 0.9) + P(ell(6, -71, 1.6, 1.1), '#7CC24A', 0.7);
  return s;
}

/** Back-view ear on the screen-right side. */
export function backEar(d: Doc, sk: Tone): string {
  return d.tone(ell(17.4, -55.6, 3, 3.9), sk, OW * 0.9, [-0.6, -0.6]) + S('M17.6,-57.6q1.6,1.4 0,3', 0.9, darker(sk[1]));
}

/** Simple sleeve/leg cloth tone pick helper for zombies. */
export function zt(z: boolean, sk: Tone): Tone {
  return z ? ZSK : sk;
}

export { cel, lighter, capsule };
