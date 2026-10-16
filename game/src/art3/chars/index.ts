/**
 * C1 — joint characters (art v3, rig v2). Cut-out puppets built like the original game: a huge 3/4
 * head on a small bullet torso with stubby two-segment limbs.
 *
 * Parts (CharArt contract, plus lower limb segments):
 *   armL/armR    upper arm, pivot = shoulder       armL2/armR2  forearm + hand, pivot = elbow
 *   legL/legR    thigh,     pivot = hip            legL2/legR2  shin + shoe,    pivot = knee
 *   torso        pivot = bottom centre             head         pivot = neck
 *   Each part's (x, y) is its pivot relative to the root in the straight rest pose, so a lower
 *   segment chains onto its upper one by rotating its pivot about the upper pivot.
 *   front `parts` (back→front): armR, armR2, legR, legR2, legL, legL2, torso, head, armL, armL2
 *         (L = screen-left = near side)
 *   `backParts`  (back→front): armL, armL2, legL, legL2, legR, legR2, torso, armR, armR2, head
 *         (R is the near side; same names and pivots as `parts`). The scene mirrors both views.
 *   faces  expression heads with exactly the head's frame (w, h, px, py, x, y):
 *          humans + you: scream, happy, shock, angry, eat · zombies + gus: chomp, sleep, dazed
 *   keys   char_<id>_<part>, char_<id>_back_<part>, char_<id>_face_<name>
 * Joint caps are round and centred on each pivot: knees bend 90° (sit), elbows 100° (carry, eat, claw).
 */
import type { CharArt, CharPart, FaceName } from '../../art/types';
import { CUSTOMER_IDS } from '../../art/manifest';
import type { Ctx, Expr, Look } from './rig';
import { NECK_STD, part, elbowAt, kneeAt } from './rig';
import { skullFront, skullBack, earFront, earBack, face } from './head';
import { LOOKS } from './cast';
import { handAt, PROP_S } from './body';
import { ZSKINS } from './paint';

export const CHAR3_BASE_IDS = [...CUSTOMER_IDS, 'joe', 'jane', 'senior', 'hipster'] as const;
export const CHAR3_IDS: string[] = [...CHAR3_BASE_IDS, ...CHAR3_BASE_IDS.map((b) => `${b}_z`), 'you', 'gus'];

export type Part3Name = 'armL' | 'armL2' | 'armR' | 'armR2' | 'legL' | 'legL2' | 'legR' | 'legR2' | 'torso' | 'head';
export const PART_ORDER3: Part3Name[] = ['armR', 'armR2', 'legR', 'legR2', 'legL', 'legL2', 'torso', 'head', 'armL', 'armL2'];
export const BACK_PART_ORDER3: Part3Name[] = ['armL', 'armL2', 'legL', 'legL2', 'legR', 'legR2', 'torso', 'armR', 'armR2', 'head'];
export const HUMAN_FACES3: FaceName[] = ['scream', 'happy', 'shock', 'angry', 'eat'];
export const ZOMBIE_FACES3: FaceName[] = ['chomp', 'sleep', 'dazed'];

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0) % 9973;
}

function headFront(c: Ctx, e: Expr): string {
  const L = c.L;
  let s = L.hairBehind ? L.hairBehind(c) : '';
  s += skullFront(c, L.face.shape, e);
  if (L.faceUnder) s += L.faceUnder(c, e);
  s += face(c, e);
  if (L.facialHair) s += L.facialHair(c, e);
  if (L.hairFront) s += L.hairFront(c, e);
  if (!L.earHidden) s += earFront(c);
  if (L.faceOver) s += L.faceOver(c, e);
  return s;
}

function headBack(c: Ctx): string {
  const L = c.L;
  let s = L.hairBackBehind ? L.hairBackBehind(c) : '';
  s += skullBack(c, L.face.shape);
  if (L.hairBack) s += L.hairBack(c);
  if (!L.earHidden) s += earBack(c);
  if (L.headBackOver) s += L.headBackOver(c);
  return s;
}

/** Build one joint character rig, or null for an unknown id. */
export function buildChar3(id: string): CharArt | null {
  if (!CHAR3_IDS.includes(id)) return null;
  const isZ = id.endsWith('_z') || id === 'gus';
  const base = id.endsWith('_z') ? id.slice(0, -2) : id;
  const L: Look | undefined = LOOKS[base];
  if (!L) return null;
  const b = L.body;
  const seed = hash(base);
  const sk = isZ ? L.zskin ?? ZSKINS[seed % ZSKINS.length] : L.skin;
  const k_ = (p: string) => `char_${id}_${p}`;
  const ctx = (d: Ctx['d'], back: boolean, side: -1 | 1, near: boolean): Ctx => ({ d, z: isZ, back, b, L, sk, seed, side, near });

  const S = b.s;
  const near = (back: boolean, side: -1 | 1) => (back ? side > 0 : side < 0);
  const hip = (side: -1 | 1): [number, number] => [side * b.hipX, b.hipY];
  const sh = (side: -1 | 1): [number, number] => [side * b.shX, b.shY];
  const leg = (key: string, side: -1 | 1, back: boolean) => {
    const box: [number, number, number, number] = [-b.legW * 0.6 - 1.5, -b.legW * 0.6 - 1.5, b.legW * 0.6 + 1.5, b.thighL + b.legW * 0.6 + 1.5];
    const o = hip(side);
    return part(key, box, [0, 0], S, [S * o[0], S * o[1]], (d) => L.leg.up(ctx(d, back, side, near(back, side))));
  };
  const leg2 = (key: string, side: -1 | 1, back: boolean) => {
    const Ls = -b.hipY - b.thighL;
    const box: [number, number, number, number] = L.legBox ?? [-b.legW * 0.6 - 7, -b.legW * 0.6 - 1.5, b.legW * 0.6 + 14, Ls + 4];
    const o = hip(side);
    const k = kneeAt(b, side);
    return part(key, box, [0, 0], S, [S * (o[0] + k[0]), S * (o[1] + k[1])], (d) => L.leg.lo(ctx(d, back, side, near(back, side))));
  };
  const arm = (key: string, side: -1 | 1, back: boolean) => {
    const A = b.armW * 1.1;
    const box: [number, number, number, number] = [-A * 0.6 - 5, -A * 0.6 - 2, A * 0.6 + 5, b.upL + A * 0.6 + 3];
    const o = sh(side);
    return part(key, box, [0, 0], S, [S * o[0], S * o[1]], (d) => L.arm.up(ctx(d, back, side, near(back, side))));
  };
  const arm2 = (key: string, side: -1 | 1, back: boolean) => {
    const A = b.armW * 1.1;
    let box: [number, number, number, number] = [-A * 0.6 - 7, -A * 0.6 - 2, A * 0.6 + 7, b.foreL + 9 * 1.45 + 5];
    const ib = L.arm.items?.[side < 0 ? 'L' : 'R']?.box;
    if (ib) {
      const h = handAt(b, side);
      box = [Math.min(box[0], h[0] + ib[0] * PROP_S - 1), Math.min(box[1], h[1] + ib[1] * PROP_S - 1), Math.max(box[2], h[0] + ib[2] * PROP_S + 1), Math.max(box[3], h[1] + ib[3] * PROP_S + 1)];
    }
    const o = sh(side);
    const e = elbowAt(b, side);
    return part(key, box, [0, 0], S, [S * (o[0] + e[0]), S * (o[1] + e[1])], (d) => L.arm.lo(ctx(d, back, side, near(back, side))));
  };
  const torso = (key: string, back: boolean) => {
    const box = L.torsoBox ?? [-b.wBot - 6, b.tTop - 6, b.wBot + b.belly + 6, b.tBot + 4];
    return part(key, box, [0, b.hipY + 2], S, [0, 0], (d) => L.torso(ctx(d, back, 1, true)));
  };
  const hbox = L.headBox ?? ([-32, -118, 36, -37] as [number, number, number, number]);
  const k = S * b.headS;
  const ho: [number, number] = [S * (b.neckX + b.hunch) - k * NECK_STD[0], S * b.neckY - k * NECK_STD[1]];
  const head = (key: string, e: Expr) => part(key, hbox, NECK_STD, k, ho, (d) => headFront(ctx(d, false, 1, true), e));
  const headB = (key: string) => part(key, hbox, NECK_STD, k, ho, (d) => headBack(ctx(d, true, 1, true)));

  const parts: CharPart[] = [
    arm(k_('armR'), 1, false), arm2(k_('armR2'), 1, false), leg(k_('legR'), 1, false), leg2(k_('legR2'), 1, false),
    leg(k_('legL'), -1, false), leg2(k_('legL2'), -1, false), torso(k_('torso'), false), head(k_('head'), undefined),
    arm(k_('armL'), -1, false), arm2(k_('armL2'), -1, false),
  ];
  const backParts: CharPart[] = [
    arm(k_('back_armL'), -1, true), arm2(k_('back_armL2'), -1, true), leg(k_('back_legL'), -1, true), leg2(k_('back_legL2'), -1, true),
    leg(k_('back_legR'), 1, true), leg2(k_('back_legR2'), 1, true), torso(k_('back_torso'), true),
    arm(k_('back_armR'), 1, true), arm2(k_('back_armR2'), 1, true), headB(k_('back_head')),
  ];
  const faces: Partial<Record<FaceName, CharPart>> = {};
  for (const fn of isZ ? ZOMBIE_FACES3 : HUMAN_FACES3) faces[fn] = head(k_(`face_${fn}`), fn as Expr);
  return { id, rig: 'biped', parts, backParts, faces, height: Math.round(S * (-b.neckY + b.headS * (L.height - 54))) };
}
