/**
 * C1 rig v2 — the original game's construction: a huge 3/4 head (~55% of the height, about twice
 * the torso's width) on a small bullet-shaped torso, with stubby two-segment limbs.
 *
 * Authoring frame (world units, y up is negative): root (0,0) = between the feet. Standard adult:
 *   hips      (±6.2, -21)   thigh down to the knee   (±6.2, -11)   shin + shoe down to the sole (0)
 *   torso     pivot (0, -19)  bullet from y -50.5 (just under the chin) to -17
 *   shoulders (±11, -44)    upper arm to the elbow   (±11.6, -32)  forearm + hand to ≈ -15
 *   head      neck (1, -47) head drawn in the head frame (neck (0.5,-54)) scaled ×1.27; top ≈ -104
 * Arms are authored with the shoulder (upper) or elbow (lower) at the origin, legs with the hip
 * (upper) or knee (lower) at the origin; every segment hangs straight down (+y) in the rest pose.
 */
import { Doc } from '../../art/svg';
import type { CharPart } from '../../art/types';
import type { Tone, Pt } from './paint';

export const NECK_STD: Pt = [0.5, -54];

export interface Body {
  /** uniform scale about the root (grandma, teen). */
  s: number;
  hipX: number;
  hipY: number;
  legW: number;
  /** hip → knee */
  thighL: number;
  shX: number;
  shY: number;
  /** upper-arm (sleeve) width */
  armW: number;
  /** shoulder → elbow */
  upL: number;
  /** elbow → wrist */
  foreL: number;
  /** neck pivot */
  neckX: number;
  neckY: number;
  /** head scale over the standard head frame */
  headS: number;
  /** torso top (just under the chin) and bottom (seat) */
  tTop: number;
  tBot: number;
  /** torso half-widths at the shoulders / hips */
  wTop: number;
  wBot: number;
  /** belly bulge to the front (+x) */
  belly: number;
  /** head forward shift (old folks) */
  hunch: number;
}

const STD: Body = { s: 1, hipX: 5.8, hipY: -32, legW: 11.4, thighL: 15, shX: 11, shY: -56, armW: 10, upL: 15, foreL: 11.5, neckX: 1, neckY: -59, headS: 1.27, tTop: -62.5, tBot: -27, wTop: 9.4, wBot: 12.4, belly: 0, hunch: 0 };
const B = (o: Partial<Body>): Body => ({ ...STD, ...o });

export const BODIES = {
  std: STD,
  slim: B({ hipX: 5.2, legW: 10, shX: 10.2, armW: 9, wTop: 8.4, wBot: 11, tBot: -27.6 }),
  stocky: B({ hipX: 6.4, legW: 12.6, shX: 12.2, armW: 10.6, wTop: 10.8, wBot: 14, belly: 1.6 }),
  fat: B({ hipX: 6.8, legW: 13, hipY: -31, thighL: 14, shX: 12.6, armW: 11.4, wTop: 11.2, wBot: 15.8, belly: 4, tBot: -26 }),
  muscle: B({ s: 1.04, hipX: 6.4, legW: 12.6, shX: 14, armW: 13.6, wTop: 14.2, wBot: 12.6, upL: 15.5 }),
  sumo: B({ s: 1.05, hipX: 8.4, hipY: -30.6, thighL: 13.8, legW: 15.4, shX: 14.6, armW: 13.6, wTop: 14.4, wBot: 20, belly: 6, tBot: -24 }),
  teen: B({ s: 0.93, hipX: 5.2, legW: 10.2, shX: 10.2, armW: 8.6, wTop: 8.8, wBot: 11.4 }),
  granny: B({ s: 0.87, hipX: 5.6, legW: 10.2, hipY: -31, thighL: 14, shX: 10.8, armW: 10, wTop: 10.6, wBot: 14.4, belly: 1.4, hunch: 2, neckY: -58, tTop: -61.5 }),
  old: B({ s: 0.95, hipX: 5.6, legW: 10.8, shX: 10.8, armW: 9.2, wTop: 9.6, wBot: 12.6, belly: 1.8, hunch: 2.2, neckY: -58.4, tTop: -62 }),
} satisfies Record<string, Body>;
export type BodyKind = keyof typeof BODIES;

/** Elbow / knee positions relative to the shoulder / hip (rest pose). */
export function elbowAt(b: Body, side: -1 | 1): Pt {
  return [side * 2.2, b.upL];
}
export function kneeAt(b: Body, side: -1 | 1): Pt {
  return [side * 0.2, b.thighL];
}

export type Expr = 'scream' | 'happy' | 'shock' | 'angry' | 'eat' | 'chomp' | 'sleep' | 'dazed' | undefined;

/** Everything a painter needs. */
export interface Ctx {
  d: Doc;
  z: boolean;
  back: boolean;
  b: Body;
  L: Look;
  /** current skin (human or zombie). */
  sk: Tone;
  /** per-character seed for texture scatter. */
  seed: number;
  /** -1 = screen-left (L), 1 = screen-right (R); limbs only. */
  side: -1 | 1;
  /** near limb (on top of the body) vs far limb (behind it). */
  near: boolean;
}

export type Paint = (c: Ctx) => string;
export interface LimbSet {
  up: Paint;
  lo: Paint;
}

export type HeadShape = 'std' | 'square' | 'long' | 'round' | 'egg' | 'heart' | 'jowl' | 'small';
export type NoseKind = 'big' | 'hook' | 'bulb' | 'pointy' | 'pug' | 'broken' | 'small' | 'long';
export type MouthKind =
  | 'smirk' | 'frown' | 'flat' | 'grin' | 'sneer' | 'gap' | 'pout' | 'lips' | 'whistle' | 'chew' | 'open' | 'grim' | 'fake';
export type ZMouthKind = 'slack' | 'snarl' | 'gape' | 'crooked' | 'toothless' | 'stitched' | 'jaw';

export interface FaceSpec {
  shape: HeadShape;
  /** eye lid amount 0..0.7 (heavy lids) */
  lid: number;
  /** eye bags 0..2 */
  bags: number;
  /** pupil direction */
  look?: Pt;
  eyeS?: number;
  lash?: boolean;
  /** muted eyeshadow colour */
  shadow?: string;
  brow: 'thick' | 'thin' | 'bushy' | 'arched' | 'uni' | 'sparse' | 'raised';
  browCol?: string;
  nose: NoseKind;
  mouth: MouthKind;
  lips?: string;
  stubble?: boolean;
  wrinkles?: number;
  zMouth?: ZMouthKind;
}

export interface Look {
  body: Body;
  height: number;
  skin: Tone;
  /** zombie skin tone (default: one of the mixed greens, picked per character) */
  zskin?: Tone;
  face: FaceSpec;
  /** hair colour */
  hair: Tone;
  /** front view: behind the skull (bun, ponytail, long hair) */
  hairBehind?: Paint;
  /** front view: over the skull */
  hairFront?: (c: Ctx, e: Expr) => string;
  /** back view: behind / over the back of the skull */
  hairBackBehind?: Paint;
  hairBack?: Paint;
  /** front-view face decorations: under facial hair / over everything */
  faceUnder?: (c: Ctx, e: Expr) => string;
  facialHair?: (c: Ctx, e: Expr) => string;
  faceOver?: (c: Ctx, e: Expr) => string;
  /** back-view head decorations (over the hair) */
  headBackOver?: Paint;
  torso: Paint;
  torsoBox?: [number, number, number, number];
  /** arm painters: upper (shoulder at origin) and lower (elbow at origin); `items` carry prop boxes */
  arm: LimbSet & { items?: { L?: { box?: [number, number, number, number] }; R?: { box?: [number, number, number, number] } } };
  /** leg painters: upper (hip at origin) and lower (knee at origin, shoe at the bottom) */
  leg: LimbSet;
  legBox?: [number, number, number, number];
  headBox?: [number, number, number, number];
  /** long hair covers the ears */
  earHidden?: boolean;
}

// ---------------------------------------------------------------- part builder
function r3(v: number): number {
  return Math.round(v * 1000) / 1000;
}

/**
 * Build one part. `box` and `pivot` are in the local authoring frame; the local frame maps to the
 * rig frame by p_rig = k * p_local + o.
 */
export function part(key: string, box: [number, number, number, number], pivot: Pt, k: number, o: Pt, body: (d: Doc) => string): CharPart {
  const d = new Doc(key);
  const inner = body(d);
  const X0 = Math.floor((k * box[0] + o[0]) * 2) / 2;
  const Y0 = Math.floor((k * box[1] + o[1]) * 2) / 2;
  const X1 = Math.ceil((k * box[2] + o[0]) * 2) / 2;
  const Y1 = Math.ceil((k * box[3] + o[1]) * 2) / 2;
  const w = X1 - X0;
  const h = Y1 - Y0;
  const pvx = k * pivot[0] + o[0];
  const pvy = k * pivot[1] + o[1];
  const tr = k !== 1 || o[0] !== 0 || o[1] !== 0 ? `<g transform="translate(${+o[0].toFixed(4)} ${+o[1].toFixed(4)}) scale(${+k.toFixed(5)})">${inner}</g>` : inner;
  return { key, svg: d.build(w, h, tr, -X0, -Y0), w, h, px: r3(pvx - X0), py: r3(pvy - Y0), x: r3(pvx), y: r3(pvy) };
}
