/**
 * The joint cast: one `Look` per base character (each also used for its `_z` zombie form), the
 * Patient-Zero player (`you`) and Gus the zombie union rep.
 */
import type { Body, BodyKind, Ctx, Expr, FaceSpec, Look, Paint } from './rig';
import { BODIES } from './rig';
import { shirtTorso, jacketTorso, armPaint, legPaint, torsoD } from './body';
import * as H from './hair';
import type { HairSet } from './hair';
import * as W from './wear';
import { tankTop } from './wear';
import * as PR from './props';
import {
  INK, f, ellD, fill, line, outl, circ, inside, shade, hatch, stain, tone,
  SKIN, SKIN_TAN, SKIN_DARK, SKIN_PALE, ZSKINS, BLOOD, C, fly,
} from './paint';
import type { Tone, Pt } from './paint';

interface Def {
  body: BodyKind;
  bodyMod?: Partial<Body>;
  height: number;
  skin?: Tone;
  z?: number;
  face: FaceSpec;
  hair: Tone;
  set: HairSet;
  earHidden?: boolean;
  torso: Paint;
  torsoBox?: [number, number, number, number];
  arm: Paint;
  armBox?: (side: -1 | 1) => [number, number, number, number];
  leg: Paint;
  legBox?: [number, number, number, number];
  headBox?: [number, number, number, number];
  faceUnder?: (c: Ctx, e: Expr) => string;
  facialHair?: (c: Ctx, e: Expr) => string;
  faceOver?: (c: Ctx, e: Expr) => string;
  headBackOver?: Paint;
}

function mk(o: Def): Look {
  return {
    body: { ...BODIES[o.body], ...(o.bodyMod ?? {}) },
    height: o.height,
    skin: o.skin ?? SKIN,
    zskin: o.z === undefined ? undefined : ZSKINS[o.z],
    face: o.face,
    hair: o.hair,
    ...o.set,
    earHidden: o.earHidden,
    torso: o.torso,
    torsoBox: o.torsoBox,
    arm: o.arm,
    armBox: o.armBox,
    leg: o.leg,
    legBox: o.legBox,
    headBox: o.headBox,
    faceUnder: o.faceUnder,
    facialHair: o.facialHair,
    faceOver: o.faceOver,
    headBackOver: o.headBackOver,
  };
}

/** Run several painters in order. */
function seq(...ps: (Paint | undefined)[]): Paint {
  return (c) => ps.map((p) => (p ? p(c) : '')).join('');
}
function seqE(...ps: (((c: Ctx, e: Expr) => string) | undefined)[]): (c: Ctx, e: Expr) => string {
  return (c, e) => ps.map((p) => (p ? p(c, e) : '')).join('');
}

// ---------------------------------------------------------------- hair tones
const HAIR = {
  brown: tone('#5A4430', '#3E2E1E'),
  dark: tone('#3A2E24', '#261E16'),
  black: tone('#2A2622', '#1A1714'),
  grey: tone('#8E8A80', '#6A665C'),
  white: tone('#B8B4A6', '#908C7E'),
  blond: tone('#B89E5E', '#8E763E'),
  bleach: tone('#C8BC8A', '#A09464'),
  ginger: tone('#9A5A2E', '#74401E'),
  mouse: tone('#6E6048', '#504432'),
  perm: tone('#A6A2AA', '#86828C'),
};

// ---------------------------------------------------------------- special bits
/** The suspicious bite on Patient Zero's forearm: a ring of tooth marks, a sick green bruise, veins. */
function biteMark(c: Ctx, w: Pt): string {
  if (c.side > 0) return '';
  const x = w[0] - 0.3;
  const y = w[1] - 7;
  let s = fill(ellD(x, y, 3.4, 3.4), '#6A7A4A', 'opacity="0.6"') + fill(ellD(x, y, 2.4, 2.2), '#7A3A3A', 'opacity="0.6"');
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    s += `<path d="M${f(x + Math.cos(a) * 2.2)},${f(y + Math.sin(a) * 2)}l${f(Math.cos(a) * 0.7)},${f(Math.sin(a) * 0.6)}" stroke="#3A120E" stroke-width="0.7" stroke-linecap="round"/>`;
  }
  s += line(`M${f(x - 1.6)},${f(y - 2.6)}q-0.6,-2 0.4,-3.6M${f(x + 1.2)},${f(y + 2.8)}q0.6,2 -0.2,3.4M${f(x + 2.6)},${f(y - 1)}q1.4,-1 1.6,-2.6`, 0.45, '#4E6A34', 'opacity="0.9"');
  s += circ(x + 0.4, y + 0.6, 0.5, '#9AB04A', 0.9);
  return s;
}

const EYE_N: Pt = [3.4, -76.2];

/** White earbuds with wires (teen). */
const earbuds: Paint = (_c) => outl(ellD(-8.6, -70.6, 1.3, 1.3), '#D8D4C8', 0.6) + line('M-8.4,-69.4Q-8,-62 -4,-56', 0.9) + line('M-8.4,-69.4Q-8,-62 -4,-56', 0.45, '#D8D4C8');
/** Shiner around the near eye (boxer). */
const blackEye = (c: Ctx) => (c.z ? '' : fill(ellD(EYE_N[0] + 0.2, EYE_N[1] + 0.4, 6.4, 6.4), '#4A3A5A', 'opacity="0.45"') + fill(ellD(EYE_N[0] + 0.4, EYE_N[1] + 2.6, 5, 3), '#5A3A4A', 'opacity="0.35"'));
const bandaid = (c: Ctx) => outl('M11.4,-75.6L17.4,-73.2L16.6,-71.2L10.6,-73.6Z', '#B89A78', 0.6) + line('M13.4,-74.4l0.2,0.2M14.6,-73.8l0.2,0.2', 0.6, '#7A5A3A') + (c.z ? stain(14, -73, 1, BLOOD, c.seed, 0.8, 0) : '');
/** Team face paint stripes (benchwarmer). */
const facePaint = (a: string, b2: string) => (c: Ctx) =>
  fill('M-4,-68.6L4,-70.2L4.4,-68.4L-3.6,-66.8Z', a, 'opacity="0.85"') + fill('M-3.4,-66L4.6,-67.6L5,-65.8L-3,-64.2Z', b2, 'opacity="0.85"') +
  fill('M17.6,-70.4L21,-71L21.2,-69.4L17.8,-68.8Z', a, 'opacity="0.8"') + (c.z ? '' : '');
/** Cigar at the far mouth corner with a curl of smoke (ceo). */
const cigar = (_c: Ctx, e: Expr) =>
  e && e !== 'angry'
    ? ''
    : outl('M15.6,-62.4L22.6,-59.6L22,-58.2L15,-61Z', '#6A4628', 0.6) + fill('M21.6,-59.8L22.6,-59.6L22,-58.2L21,-58.6Z', '#D8C8A8') + circ(22.6, -59, 0.5, '#B85A2A') +
      line('M23,-60.6q1.6,-2 0,-4q-1.6,-2 0.4,-4.4', 0.6, '#B8B4A8', 'opacity="0.7"');
/** Silver whistle in the mouth (traffic cop). */
const whistle = (_c: Ctx, e: Expr) =>
  e && e !== 'angry'
    ? line('M-6,-62Q2,-56 8,-56', 0.6, '#2A2A2A')
    : outl('M11.6,-62.6L18,-61.2L18.6,-59L12.4,-60Z', '#A8ACA8', 0.6) + outl(ellD(18.6, -59.4, 1.8, 1.6), '#A8ACA8', 0.6) + line('M11.6,-61.6Q4,-58 -2,-56', 0.6, '#2A2A2A');
const hearingAid = (_c: Ctx) => outl('M-12.8,-74.6q-1.6,2 -0.6,4.4l1.2,-0.4q-0.6,-2 0.4,-3.6Z', '#B89A7A', 0.5) + line('M-9.8,-70.2l-0.4,1.6M-9,-70.6l0.2,1.4', 0.4, '#E0E0D8');
const chinWhiskers = (_c: Ctx) => line('M9,-55.4l-0.4,1.6M10.6,-55.4l0.2,1.6M12.4,-55.8l0.6,1.4', 0.4, '#3A3430');

// ---------------------------------------------------------------- the cast
const joe = mk({
  body: 'std',
  bodyMod: { belly: 2 },
  height: 101,
  face: { shape: 'std', lid: 0.45, bags: 1, brow: 'thick', nose: 'big', mouth: 'smirk', stubble: true, wrinkles: 1, zMouth: 'slack' },
  hair: HAIR.brown,
  set: H.messy(HAIR.brown, { vol: 1.8 }),
  torso: shirtTorso({
    top: tone('#7E7C70'),
    collar: 'tee',
    untucked: true,
    pants: C.denim,
    extra: (c) => (c.back ? '' : stain(-3, c.b.shY + 10, 1.6, '#7A3A1E', c.seed + 1, 0.7) + stain(6, c.b.tBot - 7, 1.1, '#5A4A2A', c.seed + 2, 0.6)),
  }),
  arm: armPaint({ sleeve: 'short', col: tone('#7E7C70') }),
  leg: legPaint({ kind: 'pants', col: C.denim, shoe: 'sneaker', shoeCol: tone('#A8A290'), zBareSide: 1 }),
});

const jane = mk({
  body: 'slim',
  height: 101,
  face: { shape: 'heart', lid: 0.55, bags: 2, brow: 'thin', nose: 'small', mouth: 'frown', lips: '#7A4A4A', lash: true, wrinkles: 1, zMouth: 'slack' },
  hair: HAIR.mouse,
  set: H.bob(HAIR.mouse),
  earHidden: true,
  torso: jacketTorso({ top: tone('#C8BC9C'), collar: 'scoop', pants: C.grey, untucked: false }, { col: tone('#6A6A44'), open: 6, buttons: 3 }),
  arm: armPaint({ sleeve: 'long', col: tone('#6A6A44'), band: true, itemL: PR.purse(tone('#5A3A2A')) }),
  leg: legPaint({ kind: 'pants', col: C.grey, shoe: 'flat', shoeCol: C.black }),
});

const senior = mk({
  body: 'old',
  height: 99,
  face: { shape: 'long', lid: 0.55, bags: 2, brow: 'bushy', browCol: '#C8C4B8', nose: 'bulb', mouth: 'frown', wrinkles: 3, stubble: true, zMouth: 'toothless' },
  hair: HAIR.white,
  set: H.baldFringe(HAIR.white),
  faceOver: seqE(W.glasses('round', '#5A4A3A'), hearingAid),
  headBackOver: W.glassesBack('#5A4A3A'),
  torso: jacketTorso({ top: tone('#BCB49A'), collar: 'shirt', pants: tone('#6A6458'), belt: '#3A2A1E' }, { col: tone('#6A5A44'), open: 4, buttons: 3 }),
  arm: armPaint({ sleeve: 'long', col: tone('#6A5A44'), band: true, itemL: PR.newspaper() }),
  leg: legPaint({ kind: 'pants', col: tone('#6A6458'), shoe: 'slipper', shoeCol: tone('#5A4A3A'), cuffs: true, zBareSide: 1 }),
});

const hipster = mk({
  body: 'slim',
  bodyMod: { hipX: 4.4, legW: 6 },
  height: 105,
  face: { shape: 'long', lid: 0.55, bags: 1, brow: 'thick', nose: 'hook', mouth: 'smirk', wrinkles: 1, zMouth: 'crooked' },
  hair: HAIR.dark,
  set: H.manbun(HAIR.dark),
  faceUnder: W.fullBeard(HAIR.dark, 0.3),
  faceOver: W.glasses('round', '#3A2A1E'),
  headBackOver: W.glassesBack('#3A2A1E'),
  torso: jacketTorso({ top: C.charcoal, collar: 'tee', untucked: true, pants: tone('#3E4A5A'), extra: (c) => (c.back ? '' : outl(`M-1,${f(c.b.shY + 8)}l6,0l-1,5l-5,0Z`, '#8A8270', 0.4) + line(`M0.4,${f(c.b.shY + 10)}h3.6`, 0.5, '#3A3833')) }, { col: tone('#5A6A7E'), open: 6, buttons: 0, pockets: true }),
  arm: armPaint({ sleeve: 'rolled', col: tone('#5A6A7E'), itemL: PR.coffeeCup() }),
  leg: legPaint({ kind: 'pants', col: tone('#3E4A5A'), shoe: 'boot', shoeCol: tone('#6A4A2E'), cuffs: true }),
});

const accountant = mk({
  body: 'std',
  bodyMod: { wTop: 9, shX: 9, belly: 1.4 },
  height: 100,
  face: { shape: 'egg', lid: 0.5, bags: 2, brow: 'thin', nose: 'pointy', mouth: 'flat', wrinkles: 2, zMouth: 'crooked', look: [0.6, 0.6] },
  hair: HAIR.mouse,
  set: H.combover(HAIR.mouse),
  faceOver: W.glasses('square', '#2A2420'),
  headBackOver: W.glassesBack('#2A2420'),
  torso: shirtTorso({
    top: C.white,
    collar: 'shirt',
    tie: tone('#6A4A30'),
    pants: C.khaki,
    belt: '#4A3424',
    buckle: '#9A8A5A',
    pocket: true,
    extra: (c) =>
      c.back
        ? ''
        : outl(`M-6.4,${f(c.b.shY + 4)}h4.2v3.4h-4.2Z`, '#C8CCC4', 0.4) + line(`M-5.6,${f(c.b.shY + 4)}v-2.4M-4.4,${f(c.b.shY + 4)}v-2.8M-3.2,${f(c.b.shY + 4)}v-2.2`, 0.9) +
          line(`M-5.6,${f(c.b.shY + 4)}v-2.4`, 0.5, '#2A3A6A') + line(`M-4.4,${f(c.b.shY + 4)}v-2.8`, 0.5, '#7A2A22') + stain(-4.4, c.b.shY + 8.6, 0.9, '#2A3A6A', c.seed, 0.5, 0) + fill(ellD(8, c.b.shY + 6, 3, 4), '#B8AE8A', 'opacity="0.45"'),
  }),
  arm: armPaint({ sleeve: 'short', col: C.white, watch: '#8A7A4A', itemL: PR.calculator() }),
  leg: legPaint({ kind: 'pants', col: C.khaki, shoe: 'dress', shoeCol: tone('#4A3424'), cuffs: true, zBareSide: -1 }),
});

const yoga = mk({
  body: 'slim',
  height: 107,
  skin: SKIN_TAN,
  face: { shape: 'heart', lid: 0.58, bags: 0, brow: 'arched', browCol: '#4A3A2A', nose: 'small', mouth: 'lips', lips: '#7A4A4E', lash: true, shadow: '#6A5A70', wrinkles: 0, zMouth: 'snarl' },
  hair: tone('#A88E58'),
  set: H.withHat(H.bun(tone('#A88E58')), H.headband(C.teal)),
  torso: tankTop(tone('#5E7E74'), { scoop: 6, pants: C.charcoal }),
  arm: armPaint({ sleeve: 'none', col: C.teal, itemR: PR.yogaMat(tone('#6E5A72')), itemL: PR.coffeeCup() }),
  leg: legPaint({ kind: 'tights', col: C.charcoal, shoe: 'sneaker', shoeCol: tone('#9A8C8C'), stripe: '#5E7E74' }),
});

const teen = mk({
  body: 'teen',
  height: 101,
  face: { shape: 'small', lid: 0.62, bags: 2, brow: 'sparse', nose: 'pug', mouth: 'chew', wrinkles: 0, zMouth: 'gape', look: [0.4, 1] },
  hair: HAIR.black,
  set: H.messy(HAIR.black, { fringeLong: true, vol: 2 }),
  faceUnder: W.makeup({ acne: true }),
  faceOver: earbuds,
  torso: shirtTorso({ top: tone('#6E2A2E'), collar: 'hood', untucked: true, pants: C.denim, extra: W.hoodieBits(tone('#6E2A2E')) }),
  arm: armPaint({ sleeve: 'long', col: tone('#6E2A2E'), band: true, itemL: PR.phone() }),
  leg: legPaint({ kind: 'pants', col: C.denim, shoe: 'sneaker', shoeCol: tone('#B0AA98'), sole: '#8A8478', zBareSide: -1 }),
});

const politician = mk({
  body: 'stocky',
  bodyMod: { belly: 2.6 },
  height: 104,
  face: { shape: 'jowl', lid: 0.4, bags: 2, brow: 'thick', browCol: '#5A5650', nose: 'bulb', mouth: 'fake', wrinkles: 2, zMouth: 'jaw' },
  hair: tone('#4A4036', '#342C24'),
  set: H.slick(tone('#4A4036', '#342C24'), { pomp: 1.6, grey: '#9A968C' }),
  torso: jacketTorso({ top: C.white, collar: 'shirt', tie: C.oxblood, pants: C.navy }, { col: C.navy, lapels: true, buttons: 2, pin: '#A88A3A', pockets: true }),
  arm: armPaint({ sleeve: 'long', col: C.navy, cuff: '#D8D4C6' }),
  leg: legPaint({ kind: 'pants', col: C.navy, shoe: 'dress', shoeCol: C.black }),
});

const construction = mk({
  body: 'stocky',
  bodyMod: { belly: 2.6 },
  height: 109,
  skin: SKIN_TAN,
  face: { shape: 'square', lid: 0.45, bags: 1, brow: 'bushy', nose: 'big', mouth: 'frown', stubble: true, wrinkles: 2, zMouth: 'snarl' },
  hair: HAIR.brown,
  set: H.withHat(H.underHat(HAIR.brown), H.hardHat(tone('#B89A3A'))),
  facialHair: W.walrus(HAIR.brown),
  torso: seq(
    shirtTorso({ top: tone('#6E7266'), collar: 'tee', pants: C.denim, belt: '#4A3424' }),
    W.vest(tone('#B0642E'), '#C8C4A8'),
    W.toolBelt(),
    W.buttCrack(),
  ),
  arm: armPaint({ sleeve: 'short', col: tone('#6E7266'), itemR: PR.hammer() }),
  leg: legPaint({ kind: 'pants', col: C.denim, shoe: 'boot', shoeCol: tone('#8A6A3A'), zBareSide: 1 }),
});

const nurse = mk({
  body: 'slim',
  height: 105,
  skin: SKIN_DARK,
  face: { shape: 'heart', lid: 0.55, bags: 2, brow: 'arched', browCol: '#2A2018', nose: 'small', mouth: 'lips', lips: '#4A2226', lash: true, wrinkles: 1, zMouth: 'crooked' },
  hair: HAIR.black,
  set: H.withHat(H.bun(HAIR.black, { low: true }), H.nurseCap('#8A2A26')),
  torso: seq(
    shirtTorso({ top: tone('#4E7A78'), collar: 'v', untucked: true, pocket: true, pants: tone('#4E7A78'), extra: (c) => (c.back ? '' : line(`M-5.4,${f(c.b.shY + 4.4)}v-2.6M-4,${f(c.b.shY + 4.4)}v-2.2`, 0.9) + line(`M-5.4,${f(c.b.shY + 4.4)}v-2.6`, 0.5, '#2A3A6A')) }),
    W.stethoscope(),
  ),
  arm: armPaint({ sleeve: 'short', col: tone('#4E7A78'), itemR: PR.syringe() }),
  leg: legPaint({ kind: 'pants', col: tone('#4E7A78'), shoe: 'clog', shoeCol: tone('#C8C4B8'), zBareSide: 1 }),
});

const cop = mk({
  body: 'stocky',
  bodyMod: { belly: 3.4 },
  height: 107,
  skin: SKIN_TAN,
  face: { shape: 'square', lid: 0.5, bags: 2, brow: 'thick', nose: 'bulb', mouth: 'frown', stubble: true, wrinkles: 2, zMouth: 'gape' },
  hair: HAIR.dark,
  set: H.withHat(H.underHat(HAIR.dark), H.peakCap(tone('#34405A'), C.black, '#A88A3A')),
  facialHair: W.walrus(HAIR.dark),
  torso: shirtTorso({ top: tone('#3E4A62'), collar: 'shirt', tie: C.black, pants: tone('#2E364A'), belt: '#1E1C1A', buckle: '#A8ACA8', extra: W.uniformBits('#A88A3A') }),
  arm: armPaint({ sleeve: 'short', col: tone('#3E4A62'), itemL: PR.donut() }),
  leg: legPaint({ kind: 'pants', col: tone('#2E364A'), shoe: 'dress', shoeCol: C.black, stripe: '#1E2432' }),
});

const ceo = mk({
  body: 'std',
  height: 102,
  face: { shape: 'long', lid: 0.5, bags: 1, brow: 'raised', browCol: '#7A766C', nose: 'hook', mouth: 'sneer', wrinkles: 3, zMouth: 'stitched' },
  hair: HAIR.grey,
  set: H.slick(HAIR.grey, { recede: 4 }),
  faceOver: cigar,
  torso: jacketTorso({ top: C.white, collar: 'shirt', tie: C.mustard, pants: C.charcoal }, { col: C.charcoal, lapels: true, buttons: 2, pinstripe: '#6A6860', pockets: true }),
  arm: armPaint({ sleeve: 'long', col: C.charcoal, cuff: '#D8D4C6', watch: '#B8963E', itemL: PR.briefcase() }),
  leg: legPaint({ kind: 'pants', col: C.charcoal, shoe: 'dress', shoeCol: C.black, zBareSide: -1 }),
});

const trafficcop = mk({
  body: 'std',
  height: 107,
  skin: SKIN_DARK,
  face: { shape: 'std', lid: 0.42, bags: 1, brow: 'thick', browCol: '#1E1814', nose: 'big', mouth: 'whistle', stubble: true, wrinkles: 1, zMouth: 'toothless' },
  hair: HAIR.black,
  set: H.withHat(H.underHat(HAIR.black), H.peakCap(tone('#D0CCBC', '#A8A494'), C.black, '#A88A3A')),
  faceOver: whistle,
  torso: seq(shirtTorso({ top: C.navy, collar: 'shirt', pants: C.navy, belt: '#C8C4B4' }), W.vest(tone('#A8A848'), '#D0D0C0')),
  arm: armPaint({ sleeve: 'long', col: C.navy, glove: tone('#D4D0C2', '#A8A496'), itemR: PR.stopSign() }),
  leg: legPaint({ kind: 'pants', col: C.navy, shoe: 'dress', shoeCol: C.black }),
});

const benchwarmer = mk({
  body: 'fat',
  height: 106,
  face: { shape: 'round', lid: 0.55, bags: 1, brow: 'thick', nose: 'pug', mouth: 'gap', stubble: true, wrinkles: 1, zMouth: 'slack' },
  hair: HAIR.ginger,
  set: H.withHat(H.underHat(HAIR.ginger), H.backCap(C.plum, '#B09038')),
  faceUnder: facePaint('#B09038', '#5A4560'),
  torso: shirtTorso({
    top: C.plum,
    collar: 'v',
    untucked: true,
    pants: C.khaki,
    extra: (c) => `<text x="${f(c.back ? -1.6 : 4.6)}" y="${f(c.b.shY + (c.back ? 20 : 18))}" font-size="${c.back ? 12 : 9}" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-weight="900" fill="#B09038" stroke="${INK}" stroke-width="0.5" transform="${c.back ? '' : `skewY(-6)`}">00</text>`,
  }),
  arm: armPaint({ sleeve: 'short', col: C.plum, stripes: '#B09038', itemL: PR.foamFinger(C.mustard) }),
  leg: legPaint({ kind: 'shorts', col: C.khaki, shoe: 'sneaker', shoeCol: tone('#A8A290'), sock: tone('#C8C4B4'), stripe: '#5A4560' }),
});

const lumberjack = mk({
  body: 'stocky',
  bodyMod: { s: 1.03 },
  height: 109,
  skin: SKIN_TAN,
  face: { shape: 'square', lid: 0.45, bags: 1, brow: 'bushy', nose: 'big', mouth: 'flat', wrinkles: 1, zMouth: 'jaw' },
  hair: HAIR.ginger,
  set: H.withHat(H.underHat(HAIR.ginger, { shaggy: true }), H.beanie(tone('#4A4A40'))),
  faceUnder: W.fullBeard(HAIR.ginger, 1),
  torso: seq(
    shirtTorso({ top: C.oxblood, collar: 'shirt', buttons: true, pocket: true, pants: C.denim, belt: '#3A2A1E', extra: (c) => W.plaid([-20, c.b.tTop - 2, 26, c.b.tBot - 6.6], '#2A0A10', '#C8A08A', 4.2) }),
    W.suspenders('#3A2A1E'),
  ),
  arm: armPaint({ sleeve: 'rolled', col: C.oxblood, itemR: PR.axe() }),
  leg: legPaint({ kind: 'pants', col: C.denim, shoe: 'boot', shoeCol: tone('#6A4A2E'), cuffs: true }),
});

const cheerleader = mk({
  body: 'slim',
  height: 106,
  face: { shape: 'heart', lid: 0.5, bags: 1, brow: 'arched', browCol: '#6A5030', nose: 'small', mouth: 'lips', lips: '#7A3440', lash: true, shadow: '#6A5A6A', wrinkles: 0, zMouth: 'crooked' },
  hair: HAIR.blond,
  set: H.pony(HAIR.blond, C.maroon),
  faceUnder: W.makeup({ freckles: true }),
  torso: seq(
    W.skirt(tone('#CFC4A0', '#A89C78'), { pleats: 8, hem: 7, flare: 3.4 }),
    tankTop(C.maroon, {
      scoop: 5,
      extra: (c) =>
        line(`M-30,${f(c.b.tBot - 8)}H30`, 1.1, '#CFC4A0') + (c.back ? '' : `<text x="${f(4 + c.b.hunch)}" y="${f(c.b.shY + 15)}" font-size="8" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-weight="900" fill="#CFC4A0" stroke="${INK}" stroke-width="0.45">Z</text>`),
    }),
  ),
  torsoBox: [-20, -67, 22, -2],
  arm: armPaint({ sleeve: 'none', col: C.maroon, itemL: PR.pompom(tone('#8A2A36')), itemR: PR.pompom(tone('#CFC4A0')) }),
  leg: legPaint({ kind: 'skirtleg', col: C.cream, shoe: 'sneaker', shoeCol: tone('#C8C2B0'), sock: tone('#D0CCC0') }),
});

const critic = mk({
  body: 'slim',
  bodyMod: { hipX: 4.4 },
  height: 106,
  face: { shape: 'long', lid: 0.62, bags: 2, brow: 'raised', browCol: '#2A221A', nose: 'long', mouth: 'sneer', wrinkles: 2, zMouth: 'stitched', look: [1.2, -0.2] },
  hair: HAIR.dark,
  set: H.withHat(H.underHat(HAIR.dark), H.beret(tone('#2E2C2A'))),
  facialHair: W.pencilStache(HAIR.dark),
  torso: jacketTorso({ top: C.charcoal, collar: 'turtle', pants: C.charcoal }, { col: tone('#7A6A4E'), lapels: true, buttons: 1, tweed: true, pockets: true }),
  arm: armPaint({ sleeve: 'long', col: tone('#7A6A4E'), itemL: PR.notepad(), itemR: PR.pencil() }),
  leg: legPaint({ kind: 'pants', col: C.charcoal, shoe: 'dress', shoeCol: tone('#5A3A24') }),
});

const boxer = mk({
  body: 'muscle',
  bodyMod: { s: 1 },
  height: 100,
  skin: SKIN_DARK,
  face: { shape: 'square', lid: 0.45, bags: 2, brow: 'thick', browCol: '#1E1814', nose: 'broken', mouth: 'grim', stubble: true, wrinkles: 1, zMouth: 'snarl' },
  hair: HAIR.black,
  set: H.buzz(HAIR.black),
  faceUnder: blackEye,
  faceOver: bandaid,
  torso: seq(W.bareTorso({ pecs: true, abs: true }), (c) => W.beltBand(c, C.oxblood, '#C8C2AE')),
  arm: armPaint({ sleeve: 'none', col: C.oxblood, bulk: 1.05, boxing: tone('#7A1E26') }),
  armBox: (_side) => [-10, -6, 12, 36],
  leg: legPaint({ kind: 'shorts', col: C.oxblood, stripe: '#C8C2AE', shoe: 'boot', shoeCol: C.black, sock: tone('#2A2724') }),
});

const grandma = mk({
  body: 'granny',
  height: 100,
  face: { shape: 'jowl', lid: 0.5, bags: 2, brow: 'sparse', browCol: '#8A8680', nose: 'hook', mouth: 'lips', lips: '#7A3A44', wrinkles: 3, zMouth: 'toothless' },
  hair: HAIR.perm,
  set: H.perm(HAIR.perm),
  faceUnder: seqE(W.makeup({ mole: [17.6, -60.4], blush: '#9A5A5A' }), chinWhiskers),
  faceOver: W.glasses('cat', '#5A3A4A'),
  headBackOver: W.glassesBack('#5A3A4A'),
  torso: seq(
    W.skirt(tone('#7A6E8A'), { hem: 9, flare: 2.4, pattern: (c) => W.florals(c, [-18, c.b.tBot - 7, 20, c.b.tBot + 10], '#B8A0A8', '#C8B470', 18) }),
    jacketTorso({ top: tone('#7A6E8A'), collar: 'scoop', untucked: true, extra: (c) => W.florals(c, [-14, c.b.tTop, 16, c.b.tBot], '#B8A0A8', '#C8B470', 10) }, { col: C.rose, open: 7, buttons: 3 }),
  ),
  torsoBox: [-22, -62, 24, 0],
  arm: armPaint({ sleeve: 'long', col: C.rose, band: true, itemL: PR.cane(), itemR: PR.purse(tone('#5A2A30')) }),
  leg: legPaint({ kind: 'tights', col: tone('#A89A7A'), shoe: 'flat', shoeCol: tone('#4A3A2E') }),
});

const moviestar = mk({
  body: 'slim',
  height: 106,
  face: { shape: 'heart', lid: 0.6, bags: 0, brow: 'arched', browCol: '#6A5A3A', nose: 'small', mouth: 'lips', lips: '#6D1727', lash: true, shadow: '#5A4A60', wrinkles: 0, zMouth: 'crooked' },
  hair: tone('#C8BC92', '#A09468'),
  set: H.waves(tone('#C8BC92', '#A09468')),
  earHidden: true,
  faceUnder: W.makeup({ mole: [17.4, -63.6], blush: '#9A5050' }),
  torso: seq(
    W.skirt(C.oxblood, { hem: 13, flare: 3, waist: 8 }),
    tankTop(C.oxblood, { scoop: 8 }),
    (c) => {
      // fur stole draped over the shoulders
      const { d, b, back } = c;
      const st = back
        ? `M${f(-b.wTop - 3)},${f(b.shY + 4)}C${f(-b.wTop - 2)},${f(b.tTop - 3)} ${f(b.wTop + 2)},${f(b.tTop - 3)} ${f(b.wTop + 3)},${f(b.shY + 4)}C${f(b.wTop)},${f(b.shY + 9)} ${f(-b.wTop)},${f(b.shY + 9)} ${f(-b.wTop - 3)},${f(b.shY + 4)}Z`
        : `M${f(-b.wTop - 3)},${f(b.shY + 6)}C${f(-b.wTop - 3)},${f(b.tTop - 2)} ${f(-4)},${f(b.tTop - 3)} ${f(-3)},${f(b.tTop + 3)}C${f(-3)},${f(b.shY + 6)} ${f(-5)},${f(b.shY + 10)} ${f(-b.wTop - 3)},${f(b.shY + 6)}ZM${f(b.wTop + 3)},${f(b.shY + 6)}C${f(b.wTop + 3)},${f(b.tTop - 2)} ${f(8)},${f(b.tTop - 3)} ${f(7)},${f(b.tTop + 3)}C${f(7)},${f(b.shY + 6)} ${f(9)},${f(b.shY + 10)} ${f(b.wTop + 3)},${f(b.shY + 6)}Z`;
      return shade(d, st, tone('#CCC4B0', '#A49C88'), { lw: 1, inner: hatch([-16, b.tTop - 4, 18, b.shY + 12], 60, '#8A8270', c.seed + 5, 1, 1.4, 0.35, 0.7) });
    },
  ),
  torsoBox: [-22, -67, 22, 3],
  arm: armPaint({ sleeve: 'none', col: C.oxblood, forearm: tone('#2A2724', '#1A1816'), itemL: PR.cocktail() }),
  leg: legPaint({ kind: 'skirtleg', col: C.cream, shoe: 'heel', shoeCol: C.oxblood }),
});

const sumo = mk({
  body: 'sumo',
  height: 106,
  skin: SKIN_TAN,
  face: { shape: 'round', lid: 0.5, bags: 1, brow: 'thick', browCol: '#1E1814', nose: 'pug', mouth: 'grim', wrinkles: 1, zMouth: 'gape' },
  hair: HAIR.black,
  set: H.topknot(HAIR.black),
  torso: seq(W.bareTorso({ pecs: true }), (c) => {
    const { d, b, back } = c;
    const y = b.tBot - 7.4;
    let s = inside(d, torsoD(b), fill(`M-40,${f(y)}H40V20H-40Z`, '#3A4A5A') + fill(`M8,${f(y)}H40V20H8Z`, '#2A3646', 'opacity="0.7"') + line(`M-40,${f(y)}H40`, 1) + line(`M-40,${f(y + 3)}H40`, 0.5, '#1A2430'));
    if (!back) s += shade(d, `M${f(1 + b.hunch)},${f(y + 2)}h6l1,12h-8Z`, tone('#3A4A5A'), { lw: 0.9 });
    else s += shade(d, `M-4,${f(y + 1)}h5l-0.4,10h-4.2Z`, tone('#3A4A5A'), { lw: 0.9 });
    return s;
  }),
  torsoBox: [-26, -66, 30, 2],
  arm: armPaint({ sleeve: 'none', col: C.slate, bulk: 1 }),
  leg: legPaint({ kind: 'bare', col: C.slate, shoe: 'bare', shoeCol: C.slate }),
  legBox: [-10, -7, 14, 23],
});

const influencer = mk({
  body: 'slim',
  height: 102,
  face: { shape: 'heart', lid: 0.4, bags: 0, brow: 'arched', browCol: '#3A2A20', nose: 'small', mouth: 'pout', lips: '#8A4A5A', lash: true, shadow: '#5A6A80', wrinkles: 0, zMouth: 'snarl', look: [1.4, 0] },
  hair: tone('#4A3424', '#30200E'),
  set: H.longHair(tone('#4A3424', '#30200E'), '#9E6A7A'),
  earHidden: true,
  torso: shirtTorso({ top: tone('#A07A84'), collar: 'hood', crop: 5, pants: C.charcoal }),
  arm: armPaint({ sleeve: 'long', col: tone('#A07A84'), band: true, itemR: PR.selfieStick() }),
  leg: legPaint({ kind: 'tights', col: C.charcoal, shoe: 'sneaker', shoeCol: tone('#C0BAA8'), sole: '#9A9484' }),
});

const celebrity = mk({
  body: 'std',
  height: 108,
  skin: SKIN_TAN,
  face: { shape: 'long', lid: 0.55, bags: 1, brow: 'thin', nose: 'pointy', mouth: 'smirk', wrinkles: 1, zMouth: 'jaw' },
  hair: HAIR.bleach,
  set: H.spiky(HAIR.bleach, HAIR.dark),
  facialHair: W.goatee(HAIR.dark),
  faceOver: W.glasses('shades', '#2A2420'),
  headBackOver: W.glassesBack('#2A2420'),
  torso: jacketTorso(
    {
      top: tone('#9A8448'),
      collar: 'v',
      untucked: true,
      pants: C.black,
      over: (c) => (c.back ? '' : line(`M${f(-3 + c.b.hunch)},${f(c.b.tTop + 1)}Q${f(2 + c.b.hunch)},${f(c.b.shY + 12)} ${f(7 + c.b.hunch)},${f(c.b.tTop + 1)}`, 1.6, INK) + line(`M${f(-3 + c.b.hunch)},${f(c.b.tTop + 1)}Q${f(2 + c.b.hunch)},${f(c.b.shY + 12)} ${f(7 + c.b.hunch)},${f(c.b.tTop + 1)}`, 0.9, '#B8963E') + outl(ellD(2.2 + c.b.hunch, c.b.shY + 9.6, 2, 2), '#B8963E', 0.6) + `<text x="${f(2.2 + c.b.hunch)}" y="${f(c.b.shY + 10.8)}" font-size="3" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-weight="900" fill="#5A4418">$</text>`),
    },
    { col: tone('#6A5A4A'), open: 7, buttons: 0, long: 6 },
  ),
  torsoBox: [-22, -66, 24, -6],
  arm: armPaint({ sleeve: 'long', col: tone('#6A5A4A'), watch: '#B8963E', itemL: PR.microphone() }),
  leg: legPaint({ kind: 'pants', col: C.black, shoe: 'boot', shoeCol: C.black }),
});

const champ = mk({
  body: 'muscle',
  height: 106,
  skin: SKIN_TAN,
  face: { shape: 'square', lid: 0.42, bags: 1, brow: 'thick', browCol: '#6A5030', nose: 'broken', mouth: 'grin', wrinkles: 2, zMouth: 'snarl' },
  hair: HAIR.blond,
  set: H.withHat(H.mullet(HAIR.blond), H.headband(C.oxblood, true)),
  facialHair: W.horseshoe(HAIR.blond),
  torso: seq(tankTop(C.oxblood, { scoop: 5, pants: C.mustard, extra: (c) => (c.back ? '' : `<path d="M${f(4 + c.b.hunch)},${f(c.b.shY + 6)}l1.4,3l3.2,0.2l-2.4,2l0.8,3.2l-3,-1.8l-3,1.8l0.8,-3.2l-2.4,-2l3.2,-0.2Z" fill="#B8963E" stroke="${INK}" stroke-width="0.5"/>`) }), W.champBelt()),
  arm: armPaint({ sleeve: 'none', col: C.oxblood, bulk: 1, wristband: '#C8C2AE' }),
  leg: legPaint({ kind: 'shorts', col: C.mustard, stripe: '#6D1727', shoe: 'boot', shoeCol: tone('#6D1727'), kneepad: '#3A3833' }),
});

const you = mk({
  body: 'std',
  height: 103,
  skin: SKIN_PALE,
  face: { shape: 'std', lid: 0.5, bags: 2, brow: 'thick', nose: 'big', mouth: 'smirk', stubble: true, wrinkles: 1 },
  hair: HAIR.dark,
  set: H.messy(HAIR.dark, { vol: 2.4 }),
  faceUnder: (_c) => fill(ellD(3.4, -71.4, 4.6, 2), '#6A7A56', 'opacity="0.35"') + fill(ellD(14.8, -71.6, 3.4, 1.8), '#6A7A56', 'opacity="0.3"'),
  torso: seq(
    shirtTorso({ top: tone('#6E7266'), collar: 'tee', untucked: true, pants: C.denim }),
    W.apron(tone('#CFC8B0', '#A8A088'), { len: 6, stains: 4 }),
  ),
  torsoBox: [-20, -66, 22, -4],
  arm: armPaint({ sleeve: 'short', col: tone('#6E7266'), itemR: PR.spatula(), extra: biteMark }),
  leg: legPaint({ kind: 'pants', col: C.denim, shoe: 'sneaker', shoeCol: tone('#8A8A80') }),
});

const gus = mk({
  body: 'fat',
  height: 124,
  z: 1,
  face: { shape: 'round', lid: 0.5, bags: 2, brow: 'bushy', nose: 'bulb', mouth: 'frown', wrinkles: 2, zMouth: 'crooked' },
  hair: HAIR.grey,
  set: H.withHat(H.underHat(HAIR.grey), H.toque()),
  facialHair: W.walrus(HAIR.grey),
  headBox: [-32, -134, 36, -40],
  torso: seq(W.chefJacket(tone('#D2CCB6', '#A8A08A')), W.neckerchief(C.maroon), (c) => (c.back ? fly(8, c.b.tBot - 10, 0.9, 77) : fly(-12, c.b.shY + 16, 0.9, 77))),
  torsoBox: [-22, -66, 24, -6],
  arm: armPaint({ sleeve: 'rolled', col: tone('#D2CCB6', '#A8A08A'), itemL: PR.clipboard() }),
  leg: legPaint({ kind: 'pants', col: tone('#4A4844'), shoe: 'clog', shoeCol: C.black }),
});

export const LOOKS: Record<string, Look> = {
  accountant, yoga, teen, politician, construction, nurse, cop, ceo, trafficcop, benchwarmer, lumberjack, cheerleader, critic, boxer, grandma, moviestar, sumo, influencer, celebrity, champ,
  joe, jane, senior, hipster, you, gus,
};
export { HAIR, seq, seqE };
