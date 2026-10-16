/**
 * Cutout-puppet characters (front 3/4 view, facing down-right; the game mirrors for the other side).
 *
 * Root (0,0) is the point between the feet; y is negative upward. Total height is ~78-84 world units
 * (2.5-head chibi, head ~32 tall). Every part is its own SVG with a pivot:
 *   legL / legR  pivot at the hip         (±4.6, -19.5)
 *   torso        pivot at bottom-center   (0, -16)      (torso includes the outfit, neck and waist)
 *   armL / armR  pivot at the shoulder    (±10.2, -40.6)
 *   head         pivot at the neck        (0.5, -44)    (head includes hair, hat and face)
 * "L" = screen-left = the NEAR side for a character facing down-right; "R" = screen-right = far side.
 * Draw order (back to front): armR, legR, legL, torso, head, armL.
 * Joints are round caps centred on each pivot, tucked under the neighbouring part, so rotating
 * a limb ±25° never opens a gap. Sitting = hide both legs (the torso hem reads as a seated lap).
 */
import type { CharArt, CharPart, PartName } from './types';
import { Doc, OUT, OW, S, P, G, capsule, ell, f, headD, hl, poly, rrect, tornCapsule, zigzag } from './svg';
import type { Pt, Tone } from './svg';

export const HUMAN_IDS = ['accountant', 'yoga', 'teen', 'politician', 'construction', 'nurse', 'cop', 'ceo'] as const;
export type HumanId = (typeof HUMAN_IDS)[number];
export type ZombieId = `${HumanId}_z`;
export type CharId = HumanId | ZombieId | 'you' | 'gus';

export const CHAR_IDS: CharId[] = [
  ...HUMAN_IDS,
  ...HUMAN_IDS.map((h) => `${h}_z` as ZombieId),
  'you',
  'gus',
];

// ------------------------------------------------------------------ palette
const ZSK: Tone = ['#8DC63F', '#5E9A2A'];
const ZHI = '#B8E26B';
const ZDEEP = '#4C8222';
const PATCH = '#74B134';
const GOO = '#B8F07A';
const SCLERA = '#FFE14D';
const MOUTH = '#5A1E22';
const TOOTH = '#FFF6D8';
const TONGUE = '#E06A86';
const BLUSH = '#F06A7A';
const WHITE: Tone = ['#FBF7EE', '#DCD3C0'];

// ------------------------------------------------------------------ rig layout
const HIP_Y = -19.5;
const LEG_X = 4.6;
const SH_X = 10.2;
const SH_Y = -40.6;
const NECK: Pt = [0.5, -44];
const TORSO_PIV: Pt = [0, -16];
const HCX = 1;
const HCY = -58.5;
const HRX = 16.5;
const HRY = 15.5;

type Mood = 'smile' | 'grin' | 'smug' | 'stern' | 'bored' | 'calm' | 'nervous' | 'grumpy';
type Sleeve = 'long' | 'short' | 'none' | 'puff';

interface Look {
  skin: Tone;
  pants: Tone;
  shoe: Tone;
  shoeTrim?: string;
  boots?: boolean;
  leg?: 'pants' | 'stockings' | 'leggings';
  legStripe?: string;
  sleeve: Sleeve;
  sleeveCol: Tone;
  cuff?: string;
  wristband?: string;
  watch?: boolean;
  bandage?: boolean;
  torso: (d: Doc, z: boolean) => string;
  /** Drawn behind the head shape (ponytail, bun...). */
  back?: (d: Doc, z: boolean) => string;
  /** Hair / hat drawn over the head. */
  hair: (d: Doc, z: boolean) => string;
  face: Mood;
  zface?: 'derp' | 'grumpy';
  brow?: string;
  glasses?: boolean;
  earbuds?: boolean;
  mustache?: Tone;
  beard?: string;
  pale?: boolean;
  noBlush?: boolean;
  headBoxTop?: number;
}

// ------------------------------------------------------------------ small painters
function rip(d: Doc, x: number, y: number, s = 1): string {
  const pts: Pt[] = [
    [-2.6, -0.8], [-1.2, -2], [-0.3, -0.9], [1.1, -2.1], [1.9, -0.6], [2.9, 0], [1.4, 0.8], [0.8, 1.9], [-0.8, 1], [-1.9, 1.7],
  ];
  return d.tone(poly(pts.map(([a, b]) => [x + a * s, y + b * s] as Pt)), ZSK, 1.1, [-0.4, -0.4]);
}

function stain(x: number, y: number, s: number, col: string, op = 0.85): string {
  const d =
    `M${f(x - 2.4 * s)},${f(y)}C${f(x - 2.6 * s)},${f(y - 2 * s)} ${f(x - 0.4 * s)},${f(y - 2.6 * s)} ${f(x + 1 * s)},${f(y - 1.6 * s)}` +
    `C${f(x + 2.8 * s)},${f(y - 2 * s)} ${f(x + 3 * s)},${f(y + 0.4 * s)} ${f(x + 1.8 * s)},${f(y + 1.2 * s)}` +
    `C${f(x + 1.6 * s)},${f(y + 2.6 * s)} ${f(x - 0.6 * s)},${f(y + 2.2 * s)} ${f(x - 1 * s)},${f(y + 1.4 * s)}` +
    `C${f(x - 2 * s)},${f(y + 1.8 * s)} ${f(x - 2.8 * s)},${f(y + 1 * s)} ${f(x - 2.4 * s)},${f(y)}Z`;
  return P(d, col, 0, OUT, `opacity="${op}"`);
}

function drool(x: number, y: number, L = 4.4, w = 1.7): string {
  const d =
    `M${f(x - w * 0.45)},${f(y)}C${f(x - w * 0.5)},${f(y + L * 0.5)} ${f(x - w)},${f(y + L * 0.7)} ${f(x - w * 0.8)},${f(y + L)}` +
    `C${f(x - w * 0.5)},${f(y + L * 1.25)} ${f(x + w * 0.5)},${f(y + L * 1.25)} ${f(x + w * 0.8)},${f(y + L)}` +
    `C${f(x + w)},${f(y + L * 0.7)} ${f(x + w * 0.5)},${f(y + L * 0.5)} ${f(x + w * 0.45)},${f(y)}Z`;
  return P(d, GOO, 0.9) + hl(x - w * 0.3, y + L * 0.95, w * 0.22, w * 0.3, 0, 0.9);
}

function stitches(x1: number, y1: number, x2: number, y2: number, k = 2, cl = 1.3, sw = 0.9): string {
  let s = S(`M${f(x1)},${f(y1)}L${f(x2)},${f(y2)}`, sw);
  const L = Math.hypot(x2 - x1, y2 - y1);
  const nx = -(y2 - y1) / L;
  const ny = (x2 - x1) / L;
  for (let i = 0; i < k; i++) {
    const t = (i + 1) / (k + 1);
    const px = x1 + (x2 - x1) * t;
    const py = y1 + (y2 - y1) * t;
    s += S(`M${f(px - nx * cl)},${f(py - ny * cl)}L${f(px + nx * cl)},${f(py + ny * cl)}`, sw);
  }
  return s;
}

function tooth(x: number, y: number, w = 2, h = 2, down = true): string {
  const d = down
    ? `M${f(x)},${f(y)}L${f(x + w)},${f(y)}L${f(x + w - 0.3)},${f(y + h)}Q${f(x + w / 2)},${f(y + h + 0.6)} ${f(x + 0.3)},${f(y + h)}Z`
    : `M${f(x)},${f(y)}L${f(x + w)},${f(y)}L${f(x + w - 0.4)},${f(y - h)}Q${f(x + w / 2)},${f(y - h - 0.6)} ${f(x + 0.4)},${f(y - h)}Z`;
  return P(d, TOOTH, 0.8);
}

/** Cute human eye: dark glossy oval with glints. */
function heye(cx: number, cy: number, rx: number, ry: number): string {
  return (
    `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="${OUT}"/>` +
    `<circle cx="${f(cx - rx * 0.28)}" cy="${f(cy - ry * 0.36)}" r="${f(rx * 0.42)}" fill="#FFFFFF"/>` +
    `<circle cx="${f(cx + rx * 0.35)}" cy="${f(cy + ry * 0.4)}" r="${f(rx * 0.2)}" fill="#FFFFFF"/>`
  );
}

/** Human eye with an upper lid (bored / smug). */
function heyeLid(d: Doc, cx: number, cy: number, rx: number, ry: number, lid: string, amt = 0.45): string {
  const e = ell(cx, cy, rx + 0.3, ry + 0.3);
  const y0 = cy - ry + 2 * ry * amt;
  return (
    heye(cx, cy, rx, ry) +
    d.clip(e, P(`M${f(cx - rx - 1)},${f(cy - ry - 1)}H${f(cx + rx + 1)}V${f(y0 - 0.4)}L${f(cx - rx - 1)},${f(y0 + 0.4)}Z`, lid)) +
    S(`M${f(cx - rx - 0.4)},${f(y0 + 0.5)}L${f(cx + rx + 0.4)},${f(y0 - 0.5)}`, 1)
  );
}

/** Zombie eye: yellow sclera, tiny pupil, droopy lid clipped to the eye. */
function zeye(d: Doc, cx: number, cy: number, r: number, lid: number, tilt: number, pdx = 0, pdy = 0.6, lidcol = ZSK[1]): string {
  const e = ell(cx, cy, r);
  const y0 = cy - r + 2 * r * lid;
  const pr = r * 0.3;
  return (
    P(e, SCLERA) +
    `<circle cx="${f(cx + pdx)}" cy="${f(cy + pdy)}" r="${f(pr)}" fill="${OUT}"/>` +
    `<circle cx="${f(cx + pdx - pr * 0.4)}" cy="${f(cy + pdy - pr * 0.45)}" r="${f(Math.max(0.4, pr * 0.32))}" fill="#FFFFFF"/>` +
    d.clip(e, P(`M${f(cx - r - 1)},${f(cy - r - 1)}H${f(cx + r + 1)}V${f(y0 - tilt)}L${f(cx - r - 1)},${f(y0 + tilt)}Z`, lidcol, 1.1)) +
    S(e, 1.2)
  );
}

// ------------------------------------------------------------------ torso shapes
function torsoD(torn: boolean, ws = 9.8, wh = 10.6, top = -44, bot = -16): string {
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
  const z = zigzag([wh, bot], [-wh, bot], 5, -1.9);
  return head + z.map(([x, y]) => `L${f(x)},${f(y)}`).join('') + `L${f(-wh)},${f(bot - 3)}Z`;
}

function neck(d: Doc, skin: Tone): string {
  return d.tone(rrect(-3.4, -48.5, 7.8, 8, 2.5), [skin[1], skin[1]], OW * 0.8);
}

/** Pants waistband visible under a tucked shirt (clipped to the torso). */
function waist(d: Doc, td: string, pants: Tone, belt?: string, buckle?: string): string {
  let s = d.clip(td, P(`M-14,-20.2H14V-12H-14Z`, pants[0]) + P(`M2,-20.2H14V-12H2Z`, pants[1]));
  s += S('M-10.6,-20.2H10.6', 1.1);
  if (belt) {
    s += d.clip(td, P('M-14,-21.6H14V-18.8H-14Z', belt) + S('M-14,-21.6H14M-14,-18.8H14', 0.9));
    if (buckle) s += P(rrect(-0.9, -22, 3, 3.6, 0.6), buckle, 0.9);
  }
  return s;
}

/** White apron (bib + skirt) used by the player and Gus. */
function apron(d: Doc, torn: boolean, stains: boolean): string {
  const bot = -13.6;
  let path =
    'M-5.2,-42.2L6.2,-42.2L6.8,-33.6C9,-32.8 10,-31 10.2,-28.6L10.9,-15.6';
  if (torn) {
    path += zigzag([10.9, bot], [-9.9, bot], 4, -1.6).map(([x, y]) => `L${f(x)},${f(y)}`).join('');
  } else {
    path += `C11,${f(bot)} 10.4,${f(bot)} 9.6,${f(bot)}L-8.6,${f(bot)}C-9.6,${f(bot)} -10,${f(bot)} -9.9,-15.6`;
  }
  path += 'L-9.4,-28.6C-9.2,-31 -8.2,-32.8 -5.8,-33.6Z';
  let s = S('M-4.6,-42L-2.4,-46.4M5.6,-42L3.6,-46.4', 1.2);
  s += d.tone(path, WHITE, OW * 0.75, [-1, -1]);
  s += S('M-9.6,-30.6C-3,-31.6 4,-31.6 10.4,-30.6', 1);
  s += P(rrect(1.6, -27.6, 6.2, 4.6, 1), 'none', 0.9, '#B9AF9C');
  if (stains) {
    s += stain(-4.6, -24, 1.1, '#A8432A');
    s += stain(4.6, -18.6, 0.7, '#A8432A', 0.75);
    s += stain(-1, -37.2, 0.6, '#8A5A2A', 0.6);
    s += stain(6.6, -35, 0.7, '#7CC24A', 0.85);
  }
  return s;
}

function suitV(d: Doc, jacket: Tone, tie: Tone, torn: boolean): string {
  const td = torsoD(torn);
  let s = d.tone(td, jacket);
  // shirt V + tie
  s += P('M-4.2,-44.6L0.5,-30.6L5.2,-44.6Z', '#FFFFFF', 1.1);
  const knot = 'M-0.9,-42.4L2,-42.4L1.6,-40L-0.5,-40Z';
  const blade = 'M-0.5,-40L1.6,-40L2.4,-32.4L0.5,-30.4L-1.4,-32.4Z';
  s += torn ? G(P(knot, tie[0], 1) + P(blade, tie[0], 1), 'rotate(14 0.5 -42)') : P(knot, tie[0], 1) + P(blade, tie[0], 1);
  // lapels
  s += d.clip(td, P('M-4.6,-45L0.5,-30.4L-1.2,-30L-7.2,-38.6L-4.4,-40.2L-7.4,-42.6Z', jacket[1], 1.1));
  s += d.clip(td, P('M5.6,-45L0.5,-30.4L2.2,-30L8.2,-38.6L5.4,-40.2L8.4,-42.6Z', jacket[1], 1.1));
  s += `<circle cx="0.5" cy="-27" r="0.75" fill="${OUT}"/><circle cx="0.5" cy="-22.6" r="0.75" fill="${OUT}"/>`;
  if (!torn) s += S('M0.5,-20V-16.4', 0.9);
  return s;
}

// ------------------------------------------------------------------ hair & hats
const HAIR_CAP =
  'M-16.6,-55C-17.8,-71 -7,-77 2,-76.6C12,-76.4 19,-70.4 18.4,-60C16.2,-63.6 12.8,-65.6 8.6,-65.6' +
  'C4,-65.8 -1.4,-64.4 -5.4,-66.6C-8,-63 -11.6,-60.2 -13.4,-55.6Z';

function strays(col: string): string {
  return S('M-1,-76Q-1.6,-80.6 1.4,-80.2M3.6,-76.2Q5.6,-80.6 7.8,-78.4M-6,-74.6Q-9.2,-77.8 -7.6,-79.4', 1.1, col);
}

function hardHat(d: Doc, col: Tone, z: boolean): string {
  const dome = 'M-14.6,-63.6C-14.8,-77 -6,-81.6 2,-81.6C10,-81.6 18.8,-77 18.6,-63.6Z';
  let s = d.tone(dome, col, OW, [-1.5, -1.2]);
  s += S('M2,-81.2L2,-65', 1.2) + S('M5.6,-79.6Q9.8,-77 11,-69.6', 1.2, '#FFE7A3');
  s += d.tone(rrect(-17.6, -66.4, 39.2, 4.4, 2.2), [col[1], col[1]], OW * 0.9);
  if (z) s += S('M9,-80L11,-76.6L9.4,-74.6L11.8,-71', 0.9) + P(ell(-8, -71, 1.6, 1.1), '#7CC24A', 0.7);
  return s;
}

// ------------------------------------------------------------------ the looks
const LOOKS: Record<HumanId | 'you' | 'gus', Look> = {
  accountant: {
    skin: ['#F2C29B', '#D9996B'],
    pants: ['#5E6573', '#454B57'],
    shoe: ['#6B3F22', '#4A2A14'],
    sleeve: 'short',
    sleeveCol: ['#DCE9F7', '#AFC4DC'],
    torso: (d, z) => {
      const td = torsoD(z);
      let s = d.tone(td, ['#DCE9F7', '#AFC4DC']);
      if (!z) s += waist(d, td, ['#5E6573', '#454B57'], '#3A2A22', '#D9A520');
      s += P('M-4.6,-44.8L0.4,-41.2L-0.8,-38.6L-5.4,-41.8Z', '#FFFFFF', 1) + P('M5.6,-44.8L0.6,-41.2L1.8,-38.6L6.4,-41.8Z', '#FFFFFF', 1);
      const tie = P('M-0.9,-41.8L2,-41.8L1.6,-39.4L-0.5,-39.4Z', '#8E1B2E', 1) + P('M-0.5,-39.4L1.6,-39.4L2.6,-25.6L0.5,-23.2L-1.6,-25.6Z', '#8E1B2E', 1);
      s += z ? G(tie, 'rotate(16 0.5 -41)') : tie;
      s += S('M-0.2,-36L1.2,-36.6M-0.4,-31L1.4,-31.6', 0.7, '#C9506A');
      // pocket protector + pens
      s += P(rrect(-7.6, -37.6, 1, 3, 0.4), '#D7262E', 0.7) + (z ? '' : P(rrect(-6.1, -37.2, 1, 2.6, 0.4), '#2F6FD6', 0.7));
      s += P(rrect(-8.4, -35.4, 4.4, 4.4, 0.6), '#FFFFFF', 0.9);
      if (z) s += rip(d, 6, -27, 1) + rip(d, -6, -21, 0.8) + stain(4.6, -36, 0.8, '#7CC24A');
      return s;
    },
    hair: (d, z) => {
      const cap =
        'M-16.6,-55C-17.6,-71 -7,-77 2,-76.6C12,-76.4 18.8,-70.6 18.2,-60.6C16,-63.2 13,-64.8 9,-65.2' +
        'C4,-65.6 -2,-64.6 -5.4,-67.2C-8.2,-63.6 -11.8,-60.2 -13.4,-55.6Z';
      let s = d.tone(cap, ['#6B4428', '#4A2E1A'], OW, [-1, -1]);
      s += S('M-5.4,-67.2Q-4,-71.6 -2.4,-75', 1, '#4A2E1A') + hl(4, -72.4, 4, 1.2, -8, 0.35);
      if (z) s += strays('#4A2E1A');
      return s;
    },
    face: 'nervous',
    brow: '#4A2E1A',
    glasses: true,
  },
  yoga: {
    skin: ['#E0A878', '#BF8455'],
    pants: ['#7B4FC4', '#5A3698'],
    shoe: ['#FF7FB0', '#D9578A'],
    shoeTrim: '#FFFFFF',
    leg: 'leggings',
    legStripe: '#FF7FB0',
    sleeve: 'none',
    sleeveCol: ['#E0A878', '#BF8455'],
    wristband: '#FF5FA2',
    torso: (d, z) => {
      const sk = z ? ZSK : (['#E0A878', '#BF8455'] as Tone);
      const td = torsoD(false);
      let s = d.tone(td, sk);
      let tank =
        'M-9.4,-43.4L-6.2,-43.6C-5.2,-38.2 6.2,-38.2 7.2,-43.6L10,-43.4C10.4,-36 10.6,-28 10.6,-21.4';
      if (z) tank += zigzag([10.6, -21.4], [-10.6, -21.4], 4, -1.6).map(([x, y]) => `L${f(x)},${f(y)}`).join('');
      else tank += 'L-10.6,-21.4';
      tank += 'C-10.6,-28 -10.2,-36 -9.4,-43.4Z';
      s += d.clip(td, d.tone(tank, ['#2EC4B6', '#1E978C'], OW * 0.8));
      s += S('M-8.6,-31.6Q0.5,-29.6 9.8,-31.6', 0.9, '#1E978C');
      // leggings waistband
      s += d.clip(td, P('M-14,-21H14V-12H-14Z', '#7B4FC4') + P('M3,-21H14V-12H3Z', '#5A3698') + S('M-14,-18.6H14', 1.2, '#FF7FB0'));
      s += S('M-10.6,-21H10.6', 1.1) + S(td, OW);
      if (z) s += rip(d, 4.4, -35.6, 0.8) + stain(-5, -26, 0.7, '#5E9A2A', 0.6);
      return s;
    },
    back: (d, z) => {
      const pony = z
        ? 'M-8,-72C-16,-80 -27,-74 -27,-64L-29.4,-58.6L-25.6,-59.6L-26.4,-53.6L-23,-56.4L-20,-50.4C-22,-56 -21.4,-62 -16,-66Z'
        : 'M-8,-72C-16,-80 -27,-74 -27,-64C-27,-58 -24,-53 -20,-50.4C-22,-56 -21.4,-62 -16,-66Z';
      return d.tone(pony, ['#E8B84A', '#C08E2A'], OW, [-1, -1]) + S('M-23,-66Q-21,-60 -20.6,-55', 0.9, '#C08E2A');
    },
    hair: (d, z) => {
      let s = d.tone(HAIR_CAP, ['#E8B84A', '#C08E2A'], OW, [-1, -1]);
      s += S('M-10,-73Q-4,-75.6 2,-75.4', 0.9, '#C08E2A');
      // headband
      s += d.tone('M-16.4,-61.4C-9,-69 10,-70.2 18.2,-64C18.4,-62.6 18.6,-61.4 18.6,-60C10,-66 -8,-65 -16.2,-57.6Z', ['#FF5FA2', '#D93C82'], 1.3, [-0.6, -0.6]);
      s += P(ell(-15.6, -61, 2.2, 2.6), '#FF5FA2', 1.2);
      if (z) s += strays('#C08E2A');
      return s;
    },
    face: 'calm',
    brow: '#A8772A',
  },
  teen: {
    skin: ['#9C6440', '#7A4A2C'],
    pants: ['#3D5F9E', '#2B4675'],
    shoe: ['#F4F4F4', '#C9CED6'],
    shoeTrim: '#E2453C',
    sleeve: 'long',
    sleeveCol: ['#E2453C', '#B32E28'],
    cuff: '#B32E28',
    torso: (d, z) => {
      const td = torsoD(z, 10.2, 11.2);
      let s = d.tone('M-8.8,-41.6C-10.6,-48.8 -4,-50.8 0.5,-50.8C5,-50.8 11.6,-48.8 9.8,-41.6Z', ['#C93A31', '#9E2822'], OW);
      s += d.tone(td, ['#E2453C', '#B32E28']);
      if (!z) s += d.clip(td, P('M-14,-19.6H14V-12H-14Z', '#B32E28') + S('M-14,-19.6H14', 1) + S('M-8,-19.4V-16M-4,-19.4V-16M0,-19.4V-16M4,-19.4V-16M8,-19.4V-16', 0.6, '#8E1F1A'));
      s += d.tone('M-6.6,-28.4L7.6,-28.4L9.2,-20.6L-8.2,-20.6Z', ['#E2453C', '#C2342C'], 1.1, [-0.5, -0.5]);
      s += S('M-4,-27.8V-21M5,-27.8V-21', 0.7, '#9E2822');
      s += S('M-2.4,-43.4L-3,-35.4M3.4,-43.4L4,-36.2', 0.9, '#FFFFFF') + P(ell(-3, -35, 0.9), '#FFFFFF', 0.6) + P(ell(4, -35.8, 0.9), '#FFFFFF', 0.6);
      // tiny logo
      s += P('M5.6,-35.4L7.8,-38.6L7.4,-36.6L9,-36.8L6.8,-33.4L7.2,-35.4Z', '#FFD23D', 0.7);
      if (z) s += rip(d, -5.8, -36, 0.9) + rip(d, 6.6, -24.6, 0.7) + stain(-2, -24.4, 0.6, '#5E9A2A', 0.7);
      return s;
    },
    hair: (d, z) => {
      const mop =
        'M-16.8,-54.6C-19.4,-64 -16,-72 -10,-74.8L-11.4,-79L-5.4,-76.4L-4.4,-81.4L0.8,-77.2L4.8,-81.2L7.2,-76.6' +
        'L12.6,-78.4L12.6,-74C17.6,-71.6 20,-66 19,-60.6C17,-62.8 14.6,-63.6 12.4,-63.2C11,-60.6 7.6,-59.4 4.6,-60.4' +
        'C5.6,-62 5.6,-63.6 5,-64.6C0.6,-63.6 -4,-63.6 -7.6,-65.2C-9.6,-61.6 -12.2,-58.6 -13.6,-55.2Z';
      let s = d.tone(mop, ['#2E2420', '#1A1412'], OW, [-1, -1]);
      s += hl(3, -72, 3.8, 1, -12, 0.25);
      if (z) s += S('M-6,-80Q-8,-84 -6,-85.6', 1.1, '#1A1412');
      return s;
    },
    face: 'bored',
    brow: '#1A1412',
    earbuds: true,
    noBlush: true,
  },
  politician: {
    skin: ['#F5CDB0', '#DDA88A'],
    pants: ['#26355E', '#1A2546'],
    shoe: ['#2A2A32', '#14141A'],
    sleeve: 'long',
    sleeveCol: ['#26355E', '#1A2546'],
    cuff: '#FFFFFF',
    torso: (d, z) => {
      let s = suitV(d, ['#26355E', '#1A2546'], ['#D7262E', '#A51B22'], z);
      // flag pin
      const pin =
        P(rrect(-7.2, -39.6, 3.4, 2.4, 0.3), '#FFFFFF', 0.6) +
        P('M-7.2,-38.8H-3.8M-7.2,-37.9H-3.8', 'none', 0.5, '#D7262E') +
        P(rrect(-7.2, -39.6, 1.4, 1.2, 0.2), '#2F4C8F');
      s += z ? G(pin, 'rotate(28 -5.5 -38.4)') : pin;
      if (z) s += rip(d, 6.4, -24.6, 0.9) + rip(d, -6.4, -27.6, 0.7);
      return s;
    },
    hair: (d, z) => {
      const swoop =
        'M-16.8,-55.4C-18.8,-70 -10,-79.4 1.4,-79.6C12,-80 21.4,-75 19.6,-64C17.6,-67.8 12.6,-69.6 6.6,-68.4' +
        'C1.6,-67.4 -4,-67.8 -7.4,-65.4C-10.8,-63 -12.6,-58.4 -13.6,-55.6Z';
      let s = d.tone(swoop, ['#D9A441', '#A8772A'], OW, [-1, -1]);
      s += S('M-10,-72Q-2,-78 10,-75.6M-12,-66.6Q-4,-74.4 8,-71.6', 0.9, '#A8772A');
      s += hl(6, -76.4, 5, 1.3, -6, 0.75) + hl(-6, -73.6, 2.4, 0.8, -30, 0.6);
      if (z) s += strays('#A8772A');
      return s;
    },
    face: 'grin',
    brow: '#A8772A',
  },
  construction: {
    skin: ['#7A4A2E', '#5A3420'],
    pants: ['#4E6E9E', '#3A5480'],
    shoe: ['#A8693A', '#7A4524'],
    boots: true,
    sleeve: 'short',
    sleeveCol: ['#3D7DD8', '#2B5DA8'],
    torso: (d, z) => {
      const td = torsoD(z, 10, 11);
      let s = d.tone(td, ['#FF7A1A', '#D9561A']);
      s += d.clip(td, P('M-3.8,-45L0.5,-33.6L4.8,-45Z', '#3D7DD8', 1.1));
      s += S('M0.5,-33.6V-16', 1.1);
      const refl = '#F4F7A0';
      s += d.clip(td, P('M-14,-28.4H-0.6V-25.4H-14Z', refl, 0.9) + P('M1.6,-28.4H14V-25.4H1.6Z', refl, 0.9));
      s += d.clip(td, P('M-7.4,-45L-5.2,-45L-5.2,-28.4L-7.4,-28.4Z', refl, 0.9) + P('M6.2,-45L8.4,-45L8.4,-28.4L6.2,-28.4Z', refl, 0.9));
      s += P(rrect(-8.6, -22.6, 4, 3.4, 0.6), '#D9561A', 0.9);
      s += S(td, OW);
      if (z) s += rip(d, 4, -21, 0.9) + rip(d, -4.6, -34, 0.7) + stain(5, -38, 0.6, '#5E9A2A', 0.7);
      return s;
    },
    hair: (d, z) => {
      let s = d.tone('M-16.4,-55.4C-17,-60 -15.8,-63 -13.4,-64.6L-10.6,-63.4C-12.2,-61 -12.8,-58 -12.8,-55.6Z', ['#2B211C', '#1A1412'], 1.4, [-0.5, -0.5]);
      s += hardHat(d, ['#FFC23D', '#E09A10'], z);
      return s;
    },
    face: 'smile',
    brow: '#1A1412',
    beard: '#2B211C',
    noBlush: true,
  },
  nurse: {
    skin: ['#F7D9B8', '#DDB08A'],
    pants: ['#FFFFFF', '#D5D8DC'],
    shoe: ['#FFFFFF', '#CDD3DA'],
    leg: 'stockings',
    sleeve: 'puff',
    sleeveCol: ['#F7A8C0', '#D97A98'],
    torso: (d, z) => {
      const bot = -11.6;
      let dress =
        'M-9.8,-40.8C-9.8,-43.6 -7.2,-44.8 -4.3,-44.8L5.3,-44.8C8.2,-44.8 10.8,-43.6 10.8,-40.8L10.8,-33' +
        `L13.2,${f(bot + 2)}`;
      if (z) dress += zigzag([13.2, bot], [-12.2, bot], 6, -2).map(([x, y]) => `L${f(x)},${f(y)}`).join('');
      else dress += `C13.2,${f(bot)} 12.4,${f(bot)} 11.4,${f(bot)}L-10.4,${f(bot)}C-11.4,${f(bot)} -12.2,${f(bot)} -12.2,${f(bot + 2)}`;
      dress += 'L-9.8,-33Z';
      let s = d.tone(dress, ['#F7A8C0', '#D97A98']);
      s += S('M-9.8,-33.2C-4,-34.6 5,-34.6 10.8,-33.2', 1.2);
      s += d.tone('M-6,-32.8C-3,-33.6 4,-33.6 7,-32.8L8.6,-14C3,-12.8 -2,-12.8 -7.6,-14Z', ['#FFFFFF', '#E1E4E8'], 1.1, [-0.6, -0.6]);
      s += P(rrect(-0.2, -27, 1.6, 6, 0.3), '#E2343B') + P(rrect(-2.4, -24.8, 6, 1.6, 0.3), '#E2343B');
      s += P('M-3.6,-44.8L0.5,-41.6L5,-44.8L3,-45.6L0.5,-43.8L-2,-45.6Z', '#FFFFFF', 1);
      s += P(ell(-5.6, -39, 0.75), '#FFFFFF', 0.6) + P(ell(-5.6, -36.4, 0.75), '#FFFFFF', 0.6);
      if (z) s += rip(d, 7.6, -38, 0.8) + rip(d, -8.6, -17, 0.8) + stain(3.4, -18, 0.8, '#7CC24A');
      return s;
    },
    back: (d) => d.tone(ell(-12.6, -70.6, 5.4, 4.8), ['#C0562B', '#8F3B1C'], OW, [-0.8, -0.8]),
    hair: (d, z) => {
      const cap =
        'M-16.6,-55C-17.8,-71 -7,-77 2,-76.6C12,-76.4 19,-70.4 18.4,-59.4C16,-62.4 13.4,-63.4 11.2,-63.4' +
        'C9,-66.6 4,-67.4 0.4,-66.6C-4,-65.6 -8,-62.4 -10.6,-58.6C-11.8,-56.8 -12.6,-55.8 -13.4,-55.2Z';
      let s = d.tone(cap, ['#C0562B', '#8F3B1C'], OW, [-1, -1]);
      s += S('M-8,-72Q0,-75.6 8,-73', 0.9, '#8F3B1C') + hl(6, -73.4, 3.4, 1, -10, 0.35);
      const nc = 'M-11.4,-69.6L-9.2,-79.6L13,-79.6L15.2,-69.6Q2,-72.6 -11.4,-69.6Z';
      const capG = d.tone(nc, ['#FFFFFF', '#DDE2E8'], OW, [-0.8, -0.8]) +
        P(rrect(1.1, -78.4, 1.8, 6, 0.3), '#E2343B') + P(rrect(-0.9, -76.4, 5.8, 1.8, 0.3), '#E2343B');
      s += z ? G(capG, 'rotate(-10 2 -72)') : capG;
      if (z) s += strays('#8F3B1C');
      return s;
    },
    face: 'smile',
    brow: '#8F3B1C',
  },
  cop: {
    skin: ['#B97A4E', '#935A33'],
    pants: ['#22335F', '#17244A'],
    shoe: ['#2A2A32', '#14141A'],
    sleeve: 'long',
    sleeveCol: ['#2F4C8F', '#23396B'],
    cuff: '#23396B',
    torso: (d, z) => {
      const td = torsoD(z);
      let s = d.tone(td, ['#2F4C8F', '#23396B']);
      s += waist(d, td, ['#22335F', '#17244A'], '#1C1919', '#FFC83D');
      s += P('M-4.6,-44.8L0.4,-41.2L-0.8,-38.6L-5.4,-41.8Z', '#3D5FA8', 1) + P('M5.6,-44.8L0.6,-41.2L1.8,-38.6L6.4,-41.8Z', '#3D5FA8', 1);
      s += P('M-0.8,-41.4L1.8,-41.4L2.2,-33L0.5,-31.4L-1.2,-33Z', '#1C2A4D', 1);
      s += S('M0.5,-31V-22', 0.8, '#1C2A4D');
      // pocket flaps
      s += P('M3,-37.4H8.4V-35.2L5.7,-34.4L3,-35.2Z', '#3D5FA8', 0.9);
      const badge = P('M-8.4,-38.6L-5.8,-39.8L-3.2,-38.6L-3.6,-35.2L-5.8,-33.2L-8,-35.2Z', '#FFC83D', 1) + P(ell(-5.8, -36.6, 0.9), '#D9971A');
      s += z ? G(badge, 'rotate(24 -5.8 -36.6) translate(0.4 1.2)') : badge;
      s += P(rrect(6.4, -22.6, 3.8, 4.6, 0.8), '#3A2A22', 0.9);
      if (z) s += rip(d, 5.6, -28.6, 0.9) + rip(d, -6.6, -25.6, 0.7);
      return s;
    },
    hair: (d, z) => {
      let s = d.tone('M-16.4,-55.4C-17,-60 -15.8,-63 -13.4,-64.6L-10.6,-63.4C-12.2,-61 -12.8,-58 -12.8,-55.6Z', ['#2B211C', '#1A1412'], 1.4, [-0.5, -0.5]);
      const crown = 'M-14.4,-64.4L-17.2,-74.6Q2,-82.6 21,-74L18.6,-64Z';
      let cap = d.tone(crown, ['#2F4C8F', '#23396B'], OW, [-1.2, -1]);
      cap += S('M-14.6,-66.2Q2,-69.4 18.8,-65.8', 1.1, '#1C2A4D');
      cap += P('M-15.2,-64.6Q3,-67.6 21,-62.6L19.8,-59.8Q3,-64.4 -14.8,-61.8Z', '#1C1919', 1.2);
      cap += P('M3,-77.2L5.2,-76L5,-72.6L3,-71.2L1,-72.6L0.8,-76Z', '#FFC83D', 1);
      s += z ? G(cap, 'rotate(-8 2 -66)') : cap;
      return s;
    },
    face: 'stern',
    brow: '#1A1412',
    mustache: ['#3A2A20', '#24180F'],
    noBlush: true,
  },
  ceo: {
    skin: ['#EAC09A', '#CC9A70'],
    pants: ['#3B3E46', '#26282E'],
    shoe: ['#1E1E24', '#0C0C10'],
    sleeve: 'long',
    sleeveCol: ['#3B3E46', '#26282E'],
    cuff: '#FFFFFF',
    watch: true,
    torso: (d, z) => {
      let s = suitV(d, ['#3B3E46', '#26282E'], ['#E3A72F', '#B8821A'], z);
      s += S('M3.8,-35H8.6', 1) + P('M4.4,-35L5,-37.4L5.8,-36.2L6.6,-37.8L7.4,-36.2L8,-37.4L8.2,-35Z', z ? '#D9D2C4' : '#FFFFFF', 0.8);
      if (z) s += rip(d, -6.4, -24.4, 0.9) + rip(d, 6, -29, 0.7) + stain(-6, -37, 0.6, '#7CC24A', 0.8);
      return s;
    },
    hair: (d, z) => {
      const slick =
        'M-16.8,-55.4C-18.4,-70 -10,-78 1.6,-78C12,-78.2 20.2,-73 18.8,-63C16.6,-65.6 12,-67 7,-66.6' +
        'C2,-66.2 -3.2,-66.6 -7.4,-64.4C-10.4,-62.6 -12.4,-58.6 -13.4,-55.6Z';
      let s = d.tone(slick, ['#B8BDC6', '#8B919C'], OW, [-1, -1]);
      s += S('M16,-68Q4,-72 -10,-70.6M17.4,-71.8Q6,-76 -6,-74.6M12,-66.8Q2,-69 -9,-66.6', 0.9, '#8B919C');
      s += hl(5, -75.4, 4.6, 1.1, -4, 0.7);
      if (z) s += strays('#8B919C');
      return s;
    },
    face: 'smug',
    brow: '#8B919C',
    noBlush: true,
  },
  you: {
    skin: ['#F4DED0', '#D6B6A4'],
    pants: ['#2F4C8F', '#22396B'],
    shoe: ['#3A2A22', '#22180F'],
    sleeve: 'short',
    sleeveCol: ['#3D7DD8', '#2B5DA8'],
    bandage: true,
    pale: true,
    torso: (d) => {
      const td = torsoD(false);
      let s = d.tone(td, ['#3D7DD8', '#2B5DA8']);
      s += apron(d, false, false);
      return s;
    },
    hair: (d, z) => {
      let s = d.tone('M-16.6,-55C-17.4,-60.4 -16,-63.4 -13.6,-64.6L-11.2,-63.2L-10.8,-60.2L-12.6,-58.6L-12.8,-55.4Z', ['#5A3420', '#3E2214'], 1.4, [-0.5, -0.5]);
      s += hardHat(d, ['#FFD23D', '#E0A21A'], z);
      return s;
    },
    face: 'smile',
    brow: '#3E2214',
  },
  gus: {
    skin: ZSK,
    pants: ['#6B4A2F', '#4E3520'],
    shoe: ['#3A2A22', '#22180F'],
    sleeve: 'short',
    sleeveCol: ['#4A4F57', '#34383E'],
    torso: (d) => {
      const td = torsoD(true, 10.4, 11.2);
      let s = d.tone(td, ['#4A4F57', '#34383E']);
      s += apron(d, true, true);
      s += rip(d, -8, -38.4, 0.7);
      return s;
    },
    hair: (d) => {
      const hat =
        'M-11.6,-67.4L-12.4,-76.4C-21.6,-77.4 -19.4,-92 -8,-88.4C-5,-97.4 10.6,-97.4 12,-88.8C22,-91.6 24.4,-77.6 14.8,-76.4' +
        'L14.2,-67.4Q1.4,-70.8 -11.6,-67.4Z';
      let s = d.tone(hat, ['#FFFFFF', '#D9DDE3'], OW, [-1.4, -1.2]);
      s += S('M-12.2,-73.6Q1.4,-77 14.6,-73.6', 1.1);
      s += S('M-3,-80Q-2,-85 0.4,-88M6,-80Q7.4,-84 6.6,-88', 0.9, '#B9BFC8');
      s += stain(7.6, -71.2, 0.5, '#A8432A', 0.7);
      return s;
    },
    face: 'grumpy',
    zface: 'grumpy',
    brow: OUT,
    headBoxTop: -104,
  },
};

// ------------------------------------------------------------------ face
function face(d: Doc, look: Look, z: boolean): string {
  const sk = z ? ZSK : look.skin;
  let s = '';
  const brow = look.brow ?? OUT;
  if (z) {
    s += P(ell(-9.6, -50.6, 2.4, 1.6), PATCH);
    if (look.zface === 'grumpy') {
      s += zeye(d, -3.8, -57.2, 4.2, 0.48, -1.4, 0.6, 0.8);
      s += zeye(d, 7, -56.6, 3.4, 0.42, 1.2, 0.4, 0.6);
      s += S('M-9.4,-63.2L-0.6,-60.6M3.6,-60.6L11,-62.8', 1.9, brow);
      s += P('M-0.8,-47.2C1.8,-50.2 6.8,-50.4 9.2,-47.4C6.6,-46.6 1.8,-46.4 -0.8,-47.2Z', MOUTH, 1.1);
      s += tooth(1.6, -47, 1.8, 1.8, false) + tooth(5.6, -47, 1.7, 1.6, false);
      for (const [x, y] of [[-1.4, -44.6], [1.6, -44], [4.6, -44.2], [7.6, -45], [-3.6, -46]] as Pt[]) {
        s += `<circle cx="${f(x)}" cy="${f(y)}" r="0.45" fill="${ZDEEP}"/>`;
      }
      s += drool(-0.2, -47.2, 4.6, 1.7);
    } else {
      s += zeye(d, -3.8, -57.4, 4.4, 0.42, -0.7, 0.6, 0.8);
      s += zeye(d, 7, -56.8, 3.5, 0.3, 0.8, 0.4, 0.6);
      s += S('M-8.4,-63.4Q-4,-64.8 -0.4,-62.6M4.4,-61.8Q7.6,-63.4 10.6,-61.4', 1.4, brow);
      const m = 'M-1.6,-50.4C1.6,-51.2 6.4,-51.2 9,-52.2C8.4,-47.6 4.6,-45.6 2,-46.2C0,-46.8 -1.2,-48.4 -1.6,-50.4Z';
      s += P(m, MOUTH, 1.1) + d.clip(m, P(ell(4.6, -45.8, 3, 1.6), TONGUE));
      s += tooth(0.6, -50.8, 2, 2.2) + tooth(5.4, -51.4, 1.8, 2);
      s += drool(0, -48, 4.6, 1.7);
    }
    s += S('M2.4,-55Q4.6,-54.4 3.4,-52.4', 1, ZDEEP);
    s += stitches(-11.6, -63.4, -6.2, -66.8, 2);
    s += P(ell(12.4, -65, 2, 1.4), PATCH);
    return s;
  }
  const lid = sk[1];
  // eyes
  switch (look.face) {
    case 'calm':
      s += S('M-5.8,-57.2Q-3.6,-59.6 -1.4,-57.2M5,-56.8Q7,-59 9,-56.8', 1.3);
      break;
    case 'bored':
      s += heyeLid(d, -3.6, -57.2, 1.9, 2.6, lid, 0.5) + heyeLid(d, 6.8, -56.8, 1.7, 2.4, lid, 0.5);
      break;
    case 'smug':
      s += heyeLid(d, -3.6, -57.2, 1.9, 2.6, lid, 0.42) + heyeLid(d, 6.8, -56.8, 1.7, 2.4, lid, 0.3);
      break;
    default:
      s += heye(-3.6, -57.2, 1.9, 2.6) + heye(6.8, -56.8, 1.7, 2.4);
  }
  // brows
  if (look.face === 'stern') s += S('M-6.6,-61.6L-1.2,-60.4M4.6,-60.2L9.4,-61.2', 1.5, brow);
  else if (look.face === 'smug') s += S('M-6.6,-61.2Q-4,-62.2 -1.2,-61.2M4.4,-62.4Q7,-64 9.4,-62.2', 1.3, brow);
  else if (look.face === 'nervous') s += S('M-6.4,-62.4Q-4,-63.4 -1.4,-61.4M4.6,-61.4Q7,-63.4 9.2,-62.6', 1.2, brow);
  else s += S('M-6.4,-62Q-4,-63.6 -1.4,-62.2M4.6,-61.6Q7,-63 9.2,-61.6', 1.2, brow);
  // nose
  s += S('M2.6,-55.2Q5.2,-54.4 3.4,-52.2', 1.1, darker(sk[1]));
  // beard / stubble (under the mouth)
  if (look.beard) {
    s += P('M-12.6,-52C-11,-45 -5,-42.4 2,-42.6C9,-42.6 15.6,-46 17,-53C14,-50 11.4,-49.4 9,-50.4C6,-47.6 -1,-47.4 -3.4,-50.4C-6.4,-49.4 -10,-49.8 -12.6,-52Z', look.beard, 1.2);
  }
  // mouth
  switch (look.face) {
    case 'grin': {
      const m = 'M-2.4,-50.8C1.6,-49.8 7.8,-49.8 10.6,-51.8C9.8,-45.6 0.4,-44.8 -2.4,-50.8Z';
      s += P(m, MOUTH, 1.2) + d.clip(m, P('M-3,-51.6H11V-48.8H-3Z', '#FFFFFF') + P(ell(4, -45.4, 3, 1.5), TONGUE));
      s += S('M1.4,-50.2V-48.8M4,-50V-48.8M6.8,-50.2V-48.8', 0.6, '#C9C2B4');
      break;
    }
    case 'smug':
      s += S('M0,-48.8Q3.6,-47.6 7.8,-50.4', 1.3) + S('M7.2,-51.2Q8.4,-50.6 8.4,-49.4', 1);
      break;
    case 'stern':
      s += S('M0.8,-47.4Q4,-48.2 7.2,-47.4', 1.3);
      break;
    case 'bored':
      s += S('M1.6,-48.2Q4,-48.8 6.4,-48', 1.2);
      break;
    case 'nervous':
      s += P('M1,-49.6C2.4,-49 5,-49 6.6,-49.8C6,-46.8 2,-46.6 1,-49.6Z', MOUTH, 1.1);
      break;
    default: {
      const m = 'M-0.8,-50C1.6,-49.4 5.4,-49.4 7.8,-50.6C7.2,-46.2 1.2,-45.6 -0.8,-50Z';
      s += P(m, MOUTH, 1.2) + d.clip(m, P(ell(3.6, -45.8, 2.8, 1.5), TONGUE));
    }
  }
  if (look.mustache) {
    s += d.tone('M-2.2,-50.6C-0.6,-53.6 2.6,-53.2 3.8,-51.4C5.2,-53.2 8.8,-53.6 10,-50.6C7.4,-49.4 5,-49.6 3.8,-50.4C2.4,-49.4 0,-49.4 -2.2,-50.6Z', look.mustache, 1.1, [-0.4, -0.4]);
  }
  if (!look.noBlush) {
    s += P(ell(-9.4, -51.4, 2.6, 1.5), BLUSH, 0, OUT, 'opacity="0.35"') + P(ell(12.6, -51, 1.8, 1.2), BLUSH, 0, OUT, 'opacity="0.35"');
  }
  if (look.pale) {
    // tired under-eye bags: Patient Zero is not feeling great
    s += S('M-6,-53.8Q-3.6,-52.6 -1.4,-53.8M5,-53.6Q6.8,-52.6 8.6,-53.6', 0.8, '#B49AC0');
  }
  return s;
}

function darker(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * 0.82);
  const g = Math.round(((n >> 8) & 255) * 0.82);
  const b = Math.round((n & 255) * 0.82);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

function glasses(z: boolean): string {
  let s =
    P(rrect(-7.6, -60.4, 8, 6.4, 2.2), '#CFEFFF', 1.2, OUT, 'fill-opacity="0.35"') +
    P(rrect(3.6, -59.8, 6.8, 6, 2), '#CFEFFF', 1.2, OUT, 'fill-opacity="0.35"') +
    S('M0.4,-57.6Q2,-58.8 3.6,-57.6', 1.1) +
    S('M-7.6,-58.2L-14.2,-58.8', 1.1) +
    hl(-5.4, -59, 1.4, 0.5, -30, 0.8) +
    hl(5.4, -58.4, 1.2, 0.5, -30, 0.8);
  if (z) s += S('M-6.6,-59.6L-4.4,-57.4L-5.6,-56L-3.4,-54.6M-4.4,-57.4L-2.2,-58.2', 0.6, '#FFFFFF');
  return z ? G(s, 'rotate(5 1 -57)') : s;
}

// ------------------------------------------------------------------ parts
type Box = [x0: number, y0: number, x1: number, y1: number];

function part(key: string, box: Box, pivot: Pt, body: (d: Doc) => string): CharPart {
  const d = new Doc(key);
  const inner = body(d);
  const [x0, y0, x1, y1] = box;
  const w = x1 - x0;
  const h = y1 - y0;
  return {
    key,
    svg: d.build(w, h, inner, -x0, -y0),
    w,
    h,
    px: pivot[0] - x0,
    py: pivot[1] - y0,
    x: pivot[0],
    y: pivot[1],
  };
}

function legPart(key: string, look: Look, z: boolean, side: -1 | 1): CharPart {
  const lx = side * LEG_X;
  const hip: Pt = [lx, HIP_Y];
  const ankle: Pt = [lx + side * 0.2, -4.4];
  return part(key, [lx - 8, -26, lx + 10, 3], hip, (d) => {
    const sk = z ? ZSK : look.skin;
    let s = '';
    const legT: Tone = look.leg === 'stockings' ? (['#FFFFFF', '#D5D8DC'] as Tone) : look.pants;
    if (z && (look.leg ?? 'pants') === 'pants') {
      s += d.tone(capsule([lx, -10], [ankle[0], -3], 4.6, 4.4), sk, OW * 0.85);
      s += d.tone(tornCapsule(hip, [lx + side * 0.1, -7.6], 6.8, 6.6, 3, 1.6), legT, OW);
    } else {
      s += d.tone(capsule(hip, ankle, 6.8, 6.2), legT, OW);
      if (look.leg === 'leggings' && look.legStripe) s += S(`M${f(lx + 2.2)},${f(-20)}L${f(lx + 2.2)},${f(-6)}`, 1.1, look.legStripe);
      if (z) s += rip(d, lx - 0.4, -11.6, 0.75);
    }
    // shoe (toe points right: the character faces down-right)
    const x0 = lx + 0.8;
    const h = look.boots ? 6.2 : 4.8;
    const shoe =
      `M${f(x0 - 4.6)},0.4L${f(x0 + 5.8)},0.4C${f(x0 + 6.2)},${f(-h * 0.55)} ${f(x0 + 3.2)},${f(-h)} ${f(x0 + 0.4)},${f(-h)}` +
      `C${f(x0 - 2.8)},${f(-h)} ${f(x0 - 5)},${f(-h * 0.6)} ${f(x0 - 4.6)},0.4Z`;
    s += d.tone(shoe, look.shoe, OW, [-0.8, -0.8]);
    if (look.shoeTrim) s += S(`M${f(x0 - 4)},-1.2L${f(x0 + 5.4)},-1.2`, 1, look.shoeTrim);
    if (look.boots) s += S(`M${f(x0 - 4.4)},${f(-h + 1.6)}L${f(x0 + 2.4)},${f(-h + 1.6)}`, 0.9);
    s += hl(x0 + 2.2, -h + 1.2, 1.4, 0.6, -10, 0.45);
    return s;
  });
}

function armPart(key: string, look: Look, z: boolean, side: -1 | 1): CharPart {
  const near = side === -1;
  const sx = side * SH_X;
  const sh: Pt = [sx, SH_Y];
  const wrist: Pt = [sx + side * 2.3, -28];
  const hand: Pt = [sx + side * 2.6, -25.4];
  return part(key, [sx - 9, -48, sx + 9, -17], sh, (d) => {
    const sk = z ? ZSK : look.skin;
    const shapes: string[] = [];
    let s = '';
    const sc = look.sleeveCol;
    if (look.sleeve === 'long') {
      const d0 = z ? tornCapsule(sh, [wrist[0], wrist[1] + 0.6], 7.4, 6.4, 3, 1.4) : capsule(sh, wrist, 7.4, 6.4);
      if (z) {
        const fa = capsule([sx + side * 1.8, -32], wrist, 4.8, 4.6);
        s += d.tone(fa, sk);
        shapes.push(fa);
      }
      s += d.tone(d0, sc);
      shapes.push(d0);
      if (look.cuff && !z) s += d.clip(d0, P(`M${f(sx - 6)},${f(wrist[1] - 1.6)}H${f(sx + 6)}V${f(wrist[1] + 6)}H${f(sx - 6)}Z`, look.cuff)) + S(d0, OW);
    } else if (look.sleeve === 'short' || look.sleeve === 'puff') {
      const fa = capsule(sh, wrist, 5.2, 4.8);
      s += d.tone(fa, sk);
      shapes.push(fa);
      const elbow: Pt = [sx + side * 1.1, -34.2];
      const sl =
        look.sleeve === 'puff'
          ? ell(sx + side * 0.4, SH_Y + 1.6, 4.6, 4.4)
          : z
            ? tornCapsule(sh, elbow, 7.8, 7.2, 3, 1.3)
            : capsule(sh, elbow, 7.8, 7.2);
      s += d.tone(sl, sc);
      shapes.push(sl);
      if (look.bandage && near) {
        const bd = G(
          P(rrect(-2.9, -2.4, 5.8, 4.8, 1.2), '#FFFFFF', 1.1) + S('M-1,-2.4V2.4M1,-2.4V2.4', 0.6, '#C9C2B4') +
            P(ell(1.6, -0.2, 0.7), '#E06A6A', 0, OUT, 'opacity="0.55"'),
          `translate(${f(sx + side * 1.9)} -30.6) rotate(${f(-side * 8)})`,
        );
        s += bd;
      }
    } else {
      const ar = capsule(sh, wrist, 5.4, 4.8);
      s += d.tone(ar, sk);
      shapes.push(ar);
    }
    if (look.wristband) s += P(rrect(wrist[0] - 2.8, wrist[1] - 1, 5.6, 2.4, 0.8), look.wristband, 0.9);
    if (look.watch && near) s += P(rrect(wrist[0] - 2.8, wrist[1] - 0.6, 5.6, 2.2, 0.6), '#FFC83D', 0.9);
    // mitt hand with a thumb nub
    const hd = ell(hand[0], hand[1], 3.6, 3.4);
    const thumb = ell(hand[0] + 2.4, hand[1] - 1.4, 1.5, 1.3);
    s += d.tone(thumb, sk, OW * 0.75, [-0.4, -0.4]);
    s += d.tone(hd, sk, OW, [-0.7, -0.7]);
    s += S(`M${f(hand[0] - 0.6)},${f(hand[1] + 0.8)}l0.3,1.8M${f(hand[0] + 1)},${f(hand[1] + 0.6)}l0.4,1.8`, 0.8, darker(sk[1]));
    shapes.push(hd, thumb);
    if (!near) {
      // the far arm sits a touch in shadow
      s += shapes.map((p) => P(p, OUT, 0, OUT, 'opacity="0.13"')).join('');
    }
    return s;
  });
}

function torsoPart(key: string, look: Look, z: boolean): CharPart {
  return part(key, [-17, -53, 17, -8], TORSO_PIV, (d) => neck(d, z ? ZSK : look.skin) + look.torso(d, z));
}

function headPart(key: string, look: Look, z: boolean): CharPart {
  const top = look.headBoxTop ?? -94;
  return part(key, [-30, top, 28, -36], NECK, (d) => {
    const sk = z ? ZSK : look.skin;
    let s = look.back ? look.back(d, z) : '';
    // near ear (screen-left)
    s += d.tone(ell(-15.2, -56.2, 3.2, 4), sk, OW * 0.9, [-0.6, -0.6]) + S('M-14.6,-58.2q-1.6,1.4 0,3', 0.9, darker(sk[1]));
    s += d.shaded(headD(HCX, HCY, HRX, HRY, 1.12), sk[0], sk[1], OW, [-2, -1.8]);
    s += hl(-7.4, -68.6, 2.8, 1.4, -35, z ? 0.5 : 0.55, z ? ZHI : '#FFFFFF');
    if (look.pale) s += P(headD(HCX, HCY, HRX - 1.2, HRY - 1.2, 1.12), '#C9D6E0', 0, OUT, 'opacity="0.12"');
    s += face(d, look, z);
    if (look.glasses) s += glasses(z);
    s += look.hair(d, z);
    if (look.earbuds) {
      s += P(ell(-15.4, -55.4, 1.5, 1.5), '#FFFFFF', 0.9) + P(rrect(-16.2, -54.6, 1.4, 3.2, 0.6), '#FFFFFF', 0.8);
    }
    // zombies hunch: the head drops forward a little
    return z ? G(s, `translate(0.8 1.6) rotate(6 ${f(NECK[0])} ${f(NECK[1])})`) : s;
  });
}

// ------------------------------------------------------------------ public API
export function buildChar(id: CharId): CharArt {
  let base: HumanId | 'you' | 'gus';
  let z: boolean;
  if (id === 'you' || id === 'gus') {
    base = id;
    z = id === 'gus';
  } else if (id.endsWith('_z')) {
    base = id.slice(0, -2) as HumanId;
    z = true;
  } else {
    base = id as HumanId;
    z = false;
  }
  const look = LOOKS[base];
  if (!look) throw new Error(`Unknown character id: ${id}`);
  const k = (p: PartName) => `char_${id}_${p}`;
  const parts: CharPart[] = [
    armPart(k('armR'), look, z, 1),
    legPart(k('legR'), look, z, 1),
    legPart(k('legL'), look, z, -1),
    torsoPart(k('torso'), look, z),
    headPart(k('head'), look, z),
    armPart(k('armL'), look, z, -1),
  ];
  const hat = id === 'gus' ? 96 : base === 'construction' || base === 'you' || base === 'nurse' || base === 'cop' ? 82 : 78;
  return { id, parts, height: hat };
}

/** Part names in the order buildChar() returns them (back to front). */
export const PART_ORDER: PartName[] = ['armR', 'legR', 'legL', 'torso', 'head', 'armL'];
