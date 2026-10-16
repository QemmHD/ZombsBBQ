/**
 * C1 rig: body presets, the `Look` description of a character and the part builder.
 *
 * Authoring frame (world units, y up is negative): root (0,0) = between the feet. Standard adult:
 *   hips   (±5, -21)      legs hang from here to the soles at y = 0
 *   torso  pivot (0, -19) gumdrop body from the hips up to the shoulders (top ≈ -57)
 *   arms   (±9.4, -50)    shoulder pivots
 *   head   (0.5, -54)     neck pivot; the skull reaches ≈ -97, hair / hats above
 * The head is always authored in this standard frame and shifted to the body's neck; arms are
 * authored with the shoulder at the origin, legs with the hip at the origin.
 */
import { Doc, f } from '../../art/svg';
import type { CharPart } from '../../art/types';
import type { Tone, Pt } from './paint';

export const NECK_STD: Pt = [0.5, -54];

export interface Body {
  /** uniform scale about the root (grandma, teen). */
  s: number;
  hipX: number;
  hipY: number;
  legW: number;
  shX: number;
  shY: number;
  /** upper-arm width */
  armW: number;
  /** shoulder → wrist length */
  armLen: number;
  neckY: number;
  /** torso top (shoulder dome) and bottom (seat) */
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

export const BODIES = {
  std: { s: 1, hipX: 5, hipY: -21, legW: 7.4, shX: 9.4, shY: -50, armW: 5, armLen: 25, neckY: -54, tTop: -57.5, tBot: -17, wTop: 9.6, wBot: 12.2, belly: 0, hunch: 0 },
  slim: { s: 1, hipX: 4.6, hipY: -22, legW: 6.4, shX: 8.6, shY: -50.5, armW: 4.3, armLen: 25, neckY: -54.5, tTop: -58, tBot: -18, wTop: 8.4, wBot: 10.6, belly: 0, hunch: 0 },
  stocky: { s: 1, hipX: 5.6, hipY: -21, legW: 8.2, shX: 10.8, shY: -50, armW: 5.8, armLen: 25, neckY: -54, tTop: -57.5, tBot: -16.5, wTop: 11, wBot: 13.6, belly: 1.6, hunch: 0 },
  fat: { s: 1, hipX: 5.8, hipY: -20, legW: 8.6, shX: 10.6, shY: -50, armW: 5.8, armLen: 24.5, neckY: -54, tTop: -57.5, tBot: -15.5, wTop: 10.6, wBot: 15, belly: 4, hunch: 0 },
  muscle: { s: 1.04, hipX: 5.4, hipY: -22, legW: 8.2, shX: 12.6, shY: -51, armW: 7.6, armLen: 25, neckY: -55, tTop: -59, tBot: -18, wTop: 13.8, wBot: 11, belly: 0, hunch: 0 },
  sumo: { s: 1.06, hipX: 7.2, hipY: -19, legW: 10.4, shX: 13.4, shY: -50, armW: 7.8, armLen: 23, neckY: -55, tTop: -58, tBot: -13, wTop: 13.6, wBot: 19, belly: 5.5, hunch: 0 },
  teen: { s: 0.93, hipX: 4.6, hipY: -22, legW: 6.6, shX: 8.8, shY: -50.5, armW: 4.4, armLen: 25.5, neckY: -54.5, tTop: -58, tBot: -17.5, wTop: 8.8, wBot: 11.4, belly: 0, hunch: 0 },
  granny: { s: 0.87, hipX: 4.8, hipY: -20, legW: 6.6, shX: 9.2, shY: -49, armW: 4.6, armLen: 24, neckY: -52.5, tTop: -56, tBot: -16, wTop: 9.8, wBot: 13.4, belly: 1.2, hunch: 2 },
  old: { s: 0.95, hipX: 4.8, hipY: -21, legW: 7, shX: 9.2, shY: -49.5, armW: 4.6, armLen: 25, neckY: -53, tTop: -56.5, tBot: -17, wTop: 9.4, wBot: 12, belly: 1.6, hunch: 2.2 },
} satisfies Record<string, Body>;
export type BodyKind = keyof typeof BODIES;

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
  /** arm painter (shoulder at origin, arm hangs down +y; `side` from ctx); `items` carry prop boxes */
  arm: Paint & { items?: { L?: { box?: [number, number, number, number] }; R?: { box?: [number, number, number, number] } } };
  armBox?: (side: -1 | 1) => [number, number, number, number];
  leg: Paint;
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
 * rig frame by p_rig = s * (p_local + t).
 */
export function part(key: string, box: [number, number, number, number], pivot: Pt, s: number, t: Pt, body: (d: Doc) => string): CharPart {
  const d = new Doc(key);
  const inner = body(d);
  const X0 = Math.floor(s * (box[0] + t[0]) * 2) / 2;
  const Y0 = Math.floor(s * (box[1] + t[1]) * 2) / 2;
  const X1 = Math.ceil(s * (box[2] + t[0]) * 2) / 2;
  const Y1 = Math.ceil(s * (box[3] + t[1]) * 2) / 2;
  const w = X1 - X0;
  const h = Y1 - Y0;
  const pvx = s * (pivot[0] + t[0]);
  const pvy = s * (pivot[1] + t[1]);
  const tr = s !== 1 || t[0] !== 0 || t[1] !== 0 ? `<g transform="scale(${f(s)}) translate(${f(t[0])} ${f(t[1])})">${inner}</g>` : inner;
  return { key, svg: d.build(w, h, tr, -X0, -Y0), w, h, px: r3(pvx - X0), py: r3(pvy - Y0), x: r3(pvx), y: r3(pvy) };
}
